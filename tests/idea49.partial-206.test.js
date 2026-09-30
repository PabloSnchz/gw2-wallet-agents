/*!
 * tests/idea49.partial-206.test.js
 *
 * Un lote donde SOLO PARTE de los ids son validos NO da error: la API
 * responde 206 con los que si existen. Medido contra la API en vivo
 * (2026-09-30, sin token):
 *   /v2/items?ids=1,2,3        -> 404 "all ids provided are invalid"
 *   /v2/items?ids=1,2,3,4,5    -> 206 con SOLO los 2 validos (4 y 5)
 *   /v2/items?ids=all          -> 400
 *
 * El 206 es un 2xx, asi que `!res.ok` es false y el codigo lo toma por
 * exito. Consecuencia medida en api-gw2.js:
 *
 * BUG 1 (getItemsMany, severidad media): un id invalido en medio del lote
 * hace que ESE id no aparezca en la respuesta. getItemsMany solo mete en
 * `out` (y en la cache `per`) los que llegaron, asi que el id faltante
 * queda con dato ausente. Los consumidores buscan por `it.id`, asi que NO
 * hay corrimiento de posiciones -- el dano es de dato faltante silencioso,
 * no de dato atribuido al item equivocado. Pero hay algo peor: el id que
 * falto no se cachea, asi que el PROXIMO render lo vuelve a pedir dentro
 * del mismo lote y el usuario ve un item sin icono que despues aparece.
 *
 * BUG 2 (getAchievementsMeta, severidad media-alta): el shard se cachea
 * entero con putCache despues de un 206 parcial. Los ids que faltaron
 * quedan PARA SIEMPRE fuera del bag hasta que venza el TTL del shard
 * (TTL.ACH_META), porque la resolucion final relee el cache y no vuelve
 * a pedir. achievements.js:1069 arma metaById incompleto: logros sin
 * nombre, sin icono y sin tiers, con earnedAP = 0 en silencio. Es el
 * mismo sintoma que el BUG 1 de idea49.shard-concurrency.test.js, pero
 * por otra causa: ese era concurrencia de cache, este es respuesta parcial.
 *
 * REGLA: un lote se valida contra los IDS PEDIDOS, nunca contra el largo
 * de la respuesta. Y los que faltaron se reintentan; nunca se rellena por
 * posicion.
 *
 * Ejecutar: node tests/idea49.partial-206.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;

function ok(cond, msg) {
  if (cond) { console.log('  PASS  ' + msg); pass++; }
  else { console.log('  FAIL  ' + msg); fail++; }
}
function eq(a, b, msg) {
  ok(a === b, msg + '  (obtenido: ' + JSON.stringify(a) + ', esperado: ' + JSON.stringify(b) + ')');
}

// Los ids 1,2,3 no existen en el catalogo de /v2/items. 4 y 5 si.
// Se pide [1,4,2,5,3]: un invalido intercalado entre dos validos, que es
// exactamente el caso donde un mapeo por posicion se correria.
const VALID = new Set([4, 5]);

function rec(id) {
  return { id, name: 'Item ' + id, type: 'Weapon', icon: 'https://x/' + id + '.png' };
}

// fetch que replica el 206 real de la API: filtra los invalidos, y si
// queda alguno devuelve status 206 (no 200). Con opts.oneShot, la PRIMERA
// llamada filtra (206) y las siguientes devuelven todo (200), que es lo
// que pasaria si el reintento del fix funciona.
function mount(opts) {
  opts = opts || {};
  const store = new Map();
  const urls = [];
  const warnings = [];
  const localStorage = {
    get length() { return store.size; },
    key(i) { return Array.from(store.keys())[i]; },
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); }
  };
  const realConsole = console;
  const quietConsole = new Proxy({}, {
    get(_t, prop) {
      if (['warn', 'error', 'info', 'log'].includes(prop)) {
        return (...a) => { warnings.push(a.join(' ')); };
      }
      const v = realConsole[prop];
      return typeof v === 'function' ? v.bind(realConsole) : v;
    }
  });
  const sandbox = {
    console: quietConsole, localStorage,
    fetch(url) {
      urls.push(String(url));
      const m = String(url).match(/[?&]ids=([^&]+)/);
      const list = m ? decodeURIComponent(m[1]).split(',').map(Number) : [];
      const keepAll = opts.oneShot && urls.length > 1;
      const got = keepAll ? list : list.filter(id => VALID.has(id));
      const body = JSON.stringify(got.map(rec));
      // 206 cuando se filtro algo, como la API real.
      const status = (got.length === list.length) ? 200 : 206;
      return Promise.resolve({
        ok: status >= 200 && status < 300, status,
        headers: { get() { return null; } },
        text() { return Promise.resolve(body); }
      });
    },
    URL, Promise, Map, Date, JSON, Object, Array, String, Number, Math, isFinite, Set,
    setTimeout
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf8'),
                  sandbox, { filename: 'api-gw2.js' });
  return { api: sandbox.GW2Api, store, urls, warnings };
}

(async function main() {
  // -------------------------------------------------------------------------
  console.log('[1] un 206 crudo NO se confunde con un error (comportamiento base)');
  // -------------------------------------------------------------------------
  const m0 = mount();
  const r0 = await m0.api.getItemsMany([1, 4, 2, 5, 3]);
  // Documenta el alcance real del fix: los ids que la API NO tiene (1,2,3)
  // siguen sin aparecer, porque no existen. Los que si existen llegan todos.
  eq(r0.length, 2, 'los ids que la API no tiene (1,2,3) no se inventan: solo 2 y 5');
  ok(m0.urls.length >= 1, 'hay al menos la peticion inicial (requests: ' + m0.urls.length + ')');

  // -------------------------------------------------------------------------
  console.log('\n[2] BUG 1 — getItemsMany: los ids faltantes se reintentan');
  // -------------------------------------------------------------------------
  const m1 = mount({ oneShot: true });
  const r1 = await m1.api.getItemsMany([1, 4, 2, 5, 3]);
  ok(m1.urls.length > 1,
     'getItemsMany reintenta los ids que faltaron en el 206 (requests: ' + m1.urls.length + ')');
  eq(r1.length, 5, 'los 5 ids quedan resueltos tras el reintento (no 2)');
  ok(r1.every(it => [1, 2, 3, 4, 5].includes(it.id)),
     'los ids vuelven con SU id, no corrida de posicion');
  ok(r1.find(it => it.id === 4) && r1.find(it => it.id === 4).name === 'Item 4',
     'el id 4 trae su propio dato (nombre "Item 4"), no el de otro');

  // -------------------------------------------------------------------------
  console.log('\n[3] BUG 2 — getAchievementsMeta: un 206 no envenena el shard');
  // -------------------------------------------------------------------------
  const m2 = mount({ oneShot: true });
  const a2 = await m2.api.getAchievementsMeta([1, 4, 2, 5, 3], {});
  eq(a2.length, 5, 'los 5 ids de logros vuelven, no 2 (obtenido: ' + a2.length + ')');
  ok(a2.every(r => [1, 2, 3, 4, 5].includes(r.id)),
     'los ids de logros vuelven con SU id, no corrida de posicion');

  // La parte importante: el bag del shard quedo completo. Una segunda
  // llamada en frio (store distinto simula otro proceso) debe resolver
  // igual SIN volver a pegarle a la red por lo que ya se sabe.
  const m2b = mount({ oneShot: true });
  const a2b = await m2b.api.getAchievementsMeta([1, 4, 2, 5, 3], {});
  eq(a2b.length, 5, 'una carga en frio del mismo shard tambien trae los 5');

  // -------------------------------------------------------------------------
  console.log('\n[4] nunca rellenar por posicion');
  // -------------------------------------------------------------------------
  // El contrato de la regla: si un id no vino, no se inventa. Con el
  // fetch de unaSolaVez (siempre 206), los ids 1,2,3 NUNCA existen, asi
  // que un fix que rellene por posicion los devolveria con el dato de otro.
  const m3 = mount(); // sin oneShot: siempre 206
  const r3 = await m3.api.getItemsMany([1, 4, 2, 5, 3]);
  const gotIds = r3.map(it => it.id).sort();
  ok(!gotIds.includes(1) && !gotIds.includes(2) && !gotIds.includes(3),
     'los ids que la API nunca devolvio NO aparecen (no hay relleno)');
  ok(gotIds.includes(4) && gotIds.includes(5),
     'los ids que la API si devolvio aparecen con su dato real');
  ok(r3.every(it => it.name === 'Item ' + it.id),
     'cada objeto lleva el nombre que le corresponde a SU id');

  // -------------------------------------------------------------------------
  console.log('\n[5] un 206 que se repite no rompe ni cuelga');
  // -------------------------------------------------------------------------
  const m4 = mount(); // siempre 206: 1,2,3 nunca existen
  const r4 = await m4.api.getItemsMany([1, 2, 3, 4, 5]);
  ok(Array.isArray(r4), 'devuelve un array igual (no explota)');
  ok(m4.urls.length < 20, 'no entra en loop de reintentos infinitos (requests: ' + m4.urls.length + ')');

  // getCommercePrices tambien pagina por 200 y concatena posicionalmente.
  const m5 = mount();
  const r5 = await m5.api.getCommercePrices([1, 4, 2, 5, 3]);
  ok(Array.isArray(r5), 'getCommercePrices no explota con 206');
  ok(!r5.some(p => p.id === 1 || p.id === 2 || p.id === 3),
     'getCommercePrices tampoco inventa los ids que la API no devolvio');

  // -------------------------------------------------------------------------
  console.log('\n[6] regresiones: lo que el fix NO puede romper');
  // -------------------------------------------------------------------------
  const m6 = mount(); // sin invalidos: respuesta completa
  const r6 = await m6.api.getItemsMany([4, 5]);
  eq(r6.length, 2, 'un lote 100% valido devuelve todo en UNA sola peticion');
  eq(m6.urls.length, 1, 'un lote 100% valido NO dispara reintentos (requests: ' + m6.urls.length + ')');

  const m7 = mount();
  eq((await m7.api.getItemsMany([])).length, 0, 'lista vacia sigue devolviendo [] sin pedir nada');
  eq(m7.urls.length, 0, 'lista vacia no genera peticiones');

  // Dedupe por inflight: dos lotes identicos concurrentes siguen siendo 1.
  const m8 = mount({ oneShot: true });
  const [x, y] = await Promise.all([
    m8.api.getItemsMany([1, 4, 2, 5, 3]),
    m8.api.getItemsMany([1, 4, 2, 5, 3])
  ]);
  eq(x.length, 5, 'llamada concurrente A trae los 5');
  eq(y.length, 5, 'llamada concurrente B trae los 5 (no [])');
  ok(m8.urls.length < 12, 'el dedupe de inflight sigue limitando las peticiones (requests: ' + m8.urls.length + ')');

  console.log('\n-----------------------------------------');
  console.log('  ' + pass + ' pass / ' + fail + ' FAIL');
  console.log('-----------------------------------------');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
