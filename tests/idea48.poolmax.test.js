// Test del pool global de requests (Idea 48, Tramo A).
//
// NO copia el pool: carga js/api-gw2.js REAL en un sandbox con un `fetch`
// falso de latencia conocida, y mide. La pregunta del test no es "la
// constante dice 6" sino "subirla hace lo que el PO medio y no rompe nada".
//
// Que se verifica:
//   1. El pico de concurrencia NUNCA excede POOL_MAX (es un estrangulador, no
//      una sugerencia). Esto vale para el valor viejo y el nuevo.
//   2. Subir 3 -> 6About-paga la latencia: 18 requests a 40 ms tardan
//      ~7x40ms con 6 slots y ~18x40ms con 3. Si no se acelera, el pool no
//      esta estrangulando nada y el cambio es cosmetico.
//   3. NO se filtran slots: tras N requests, poolStats().active vuelve a 0.
//      Un slot colgado aqui es el bug que casi cuelga la app entera (HB#37).
//   4. Un throw SINCRONO dentro del task no filtra slots (regresion del
//      fix de poolPump, que envolvio en Promise.resolve().then).
//   5. El orden de salida se preserva y la cola se drena entera.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'js/api-gw2.js'), 'utf8');

const LAT_MS = 40;          // latencia por request
const N = 18;               // requests por corrida
const N_REQ = 6;            // longitud de una tanda

let pass = 0, fail = 0;
function check(name, ok, detail) {
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? '  — ' + detail : ''}`);
  ok ? pass++ : fail++;
}

// --- sandbox: ejecuta el archivo real con un fetch falso ---------------
function loadApi(latencyMs, opts) {
  opts = opts || {};
  let inflight = 0, peak = 0, calls = 0;
  const done = [];
  const sandbox = {
    console: { log(){}, info(){}, warn(){}, error(){} },
    localStorage: {
      _d: {},
      getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
      setItem(k, v) { this._d[k] = String(v); },
      removeItem(k) { delete this._d[k]; }
    },
    URL: URL,
    Date: Date,
    Map: Map,
    Set: Set,
    Promise: Promise,
    JSON: JSON,
    Object: Object,
    Array: Array,
    Number: Number,
    String: String,
    isFinite: isFinite,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    fetch: function () {
      // Modo syncThrow: fetch LANZA en vez de devolver promesa. Es el caso
      // que casi cuelga la app entera (HB#37): sin el Promise.resolve().then
      // de poolPump, __poolActive queda incrementado para siempre.
      if (opts.syncThrow) throw new Error('sync boom');
      calls++;
      inflight++;
      if (inflight > peak) peak = inflight;
      return new Promise(function (res) {
        setTimeout(function () {
          inflight--;
          done.push(calls);
          res({ ok: true, status: 200, text: function () { return Promise.resolve('[]'); } });
        }, latencyMs);
      });
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  // El archivo es una IIFE que se engancha a `window`/`globalThis`.
  new Function('window', 'globalThis', 'console', 'localStorage', 'fetch',
               'URL', 'Date', 'setTimeout', 'clearTimeout', SRC)(
    sandbox, sandbox, sandbox.console, sandbox.localStorage, sandbox.fetch,
    URL, Date, setTimeout, clearTimeout);
  return { api: sandbox.GW2Api, stats: function () { return { peak: peak, calls: calls, done: done.length }; } };
}

// Dispara n requests por el pool sin cache (nocache) y cronometra.
function corrida(api, n) {
  const t0 = Date.now();
  const ps = [];
  for (let i = 0; i < n; i++) {
    ps.push(api.getAccountWallet('tok-' + i, { nocache: true }).catch(function () { return null; }));
  }
  return Promise.all(ps).then(function () { return Date.now() - t0; });
}

console.log('\nIdea 48 Tramo A — POOL_MAX y el pool global\n');

(async function () {
  // --- 1/2/3: comparar 3 vs 6 sobre el archivo real ------------------
  const a = loadApi(LAT_MS);
  const API_BASE = a.api.__cfg.API_BASE;

  a.api.__cfg.setPoolMax(3);
  const max3 = a.api.__cfg.poolStats().max;
  const ms3 = await corrida(a.api, N);
  const s3 = a.stats();
  const after3 = a.api.__cfg.poolStats();

  check('el estrangulador se autoexplica: setPoolMax(3) queda en 3', max3 === 3, `max=${max3}`);
  check('con POOL_MAX=3 el pico no excede 3', s3.peak <= 3 && s3.peak > 0, `pico=${s3.peak}`);
  check('con POOL_MAX=3 los 18 requests salen', s3.calls === N && s3.done === N, `${s3.done}/${N}`);
  check('con POOL_MAX=3 no quedan slots colgados', after3.active === 0, `active=${after3.active}`);
  check('con POOL_MAX=3 hubo cola (si no, no esta estrangulando)', after3.queued === 0 && after3.waited > 0, `waited=${after3.waited}`);

  const b = loadApi(LAT_MS);
  b.api.__cfg.setPoolMax(6);
  const max6 = b.api.__cfg.poolStats().max;
  const ms6 = await corrida(b.api, N);
  const s6 = b.stats();
  const after6 = b.api.__cfg.poolStats();

  check('setPoolMax(6) queda en 6', max6 === 6, `max=${max6}`);
  check('con POOL_MAX=6 el pico no excede 6', s6.peak <= 6 && s6.peak > 0, `pico=${s6.peak}`);
  check('con POOL_MAX=6 el pico LLEGA a 6 (sino el cambio no hace nada)',
        s6.peak === 6, `pico=${s6.peak}`);
  check('con POOL_MAX=6 los 18 requests salen', s6.calls === N && s6.done === N, `${s6.done}/${N}`);
  check('con POOL_MAX=6 no quedan slots colgados', after6.active === 0, `active=${after6.active}`);

  // Con 18 requests y 40 ms: 6 slots -> 3 tandas (~120ms), 3 slots -> 6 tandas (~240ms).
  // Se exige una mejora clara pero no exacta: el reloj de Windows mete ruido.
  check('subir 3->6 reduce el tiempo total de la tanda',
        ms6 < ms3 * 0.75,
        `3 slots=${ms3}ms, 6 slots=${ms6}ms (techo ideal ${Math.ceil(N / 6) * LAT_MS}ms)`);

  // --- 4: throw SINCRONO dentro del pool no filtra slots ------------
  // El sandbox con fetch que LANZA sincrono. Con POOL_MAX=6, seis de estos
  // colgarian los 6 slots para siempre: el pool quedaria muerto sin error.
  const c = loadApi(LAT_MS, { syncThrow: true });
  c.api.__cfg.setPoolMax(6);
  const sync = [];
  for (let i = 0; i < 12; i++) {   // mas que POOL_MAX a proposito
    sync.push(c.api.getAccountWallet('t' + i, { nocache: true })
      .then(function () { return 'resolved'; })
      .catch(function () { return 'rejected'; }));
  }
  const syncRes = await Promise.all(sync);
  const afterSync = c.api.__cfg.poolStats();
  check('un throw sincrono de fetch rechaza en vez de colgar',
        syncRes.length === 12 && syncRes.every(r => r === 'rejected'),
        `${syncRes.filter(r => r === 'rejected').length}/12 rechazados`);
  check('un throw sincrono NO filtra slots (active vuelve a 0)',
        afterSync.active === 0, `active=${afterSync.active} queued=${afterSync.queued}`);

  // --- y el pool SIGUE sirviendo normal despues ----------------------
  const e = loadApi(LAT_MS);
  e.api.__cfg.setPoolMax(6);
  const msAfter = await corrida(e.api, N_REQ);
  const finE = e.api.__cfg.poolStats();
  check('otro pool, ya sin throws, corre normal (6 requests, sin slots colgados)',
        finE.active === 0 && msAfter < 6 * LAT_MS * 3,
        `${msAfter}ms, active=${finE.active}`);

  // --- 5: la cola se drena y el orden de salida se preserva ----------
  const d = loadApi(LAT_MS);
  d.api.__cfg.setPoolMax(6);
  const ord = [];
  const ps2 = [];
  for (let i = 0; i < 24; i++) {
    ps2.push(d.api.getAccountWallet('t' + i, { nocache: true }).then(function () { ord.push(1); }));
  }
  await Promise.all(ps2);
  const fin = d.api.__cfg.poolStats();
  check('la cola se drena entera (queued=0, active=0, 24 salidas)',
        fin.queued === 0 && fin.active === 0 && ord.length === 24,
        `queued=${fin.queued} active=${fin.active} salidas=${ord.length}`);

  // --- la constante del archivo es la que el PO pidio ---------------
  const m = SRC.match(/POOL_MAX:\s*(\d+)/);
  check('la constante del archivo es 6', m && m[1] === '6', `POOL_MAX: ${m ? m[1] : 'NO ENCONTRADO'}`);

  // --- el header declara la version nueva ---------------------------
  const ver = SRC.match(/Versi\u00f3n:\s*([\d.]+)/) || SRC.match(/Versión:\s*([\d.]+)/);
  check('el header declara una version mayor a 2.18.0',
        ver && parseFloat(ver[1]) > 2.18, `version=${ver ? ver[1] : 'NO ENCONTRADO'}`);

  console.log(`\n${pass} OK / ${fail} FAIL`);
  process.exit(fail === 0 ? 0 : 1);
})();
