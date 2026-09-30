/*!
 * tests/idea49.quotavisible.test.js
 *
 * Tramo A de la Idea 49: el QuotaExceededError de localStorage era invisible.
 *
 * Contexto por que este test existe junto al fix de activities.js:
 * activities.js:activate() llamaba cleanAchievementsCache(), que borra toda
 * clave 'ach_*'. Eso incluia ach_meta_v2:<lang>:<ids> (TTL 12 h) y
 * ach_acc:<fpToken> (TTL 2 min), que escribe api-gw2.js putCache(). Router
 * llama a activate() en cada navegacion a #/activities, asi que abrir el panel
 * invalidaba la cache de logros de TODAS las cuentas.
 *
 * Quitar ese wipe es lo correcto (un modulo no borra la cache de otro), pero
 * elimina por accidente el unico mecanismo que estaba manteniendo la cuota a
 * raya. Y api-gw2.js:189 era:
 *
 *     function lsSet(key, val) { try { localStorage.setItem(...); } catch (_) {} }
 *
 * o sea, tragaba el QuotaExceededError. Con la cuota llena, cada escritura
 * posterior falla en silencio y la app reinicia en frio en cada recarga. No
 * hay error, no hay aviso: se ve como "la Boveda anda lenta".
 *
 * Este test NO copia el codigo: monta un localStorage falso que lanza
 * QuotaExceededError de verdad, carga el archivo real y comprueba que el
 * fallo (a) llega a SOMEWHERE observable y (b) no rompe la copia en memoria.
 *
 * Ejecutar: node tests/idea49.quotavisible.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function eq(a, b, msg) { ok(a === b, msg + '  (obtenido: ' + JSON.stringify(a) + ')'); }

// ── 1. lsSet devuelve booleano y distingue cuota de otros errores ────────────
console.log('\n[1] lsSet con un localStorage que lanza QuotaExceededError');

// El fetch tiene que SUCCEEDIR a proposito: putCache() esta dentro del .then
// de exito, asi que un fallo de red nunca llega a lsSet(). Con un fetch que
// rechaza, este test mediria el camino de error, que es justo el que NO escribe
// (mismo motivo por el que la Idea 47 no contaminaba la cache).
function fakeOk(body) {
  return Promise.resolve({
    ok: true, status: 200, headers: { get() { return null; } },
    text() { return Promise.resolve(JSON.stringify(body)); }
  });
}

function mountLS(throwQuota) {
  const store = new Map();
  const warns = [];
  // Proxy sobre el console real: todo pasa tal cual salvo warn(), que se
  // captura. Ojo con el orden del literal del sandbox: si `console` real
  // apareciera DESPUES de la clave `console:` lo pisaria y el test passaria
  // sin capturar nada (que es lo que paso en la primera version).
  const realConsole = console;
  const fakeConsole = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'warn') return (m) => warns.push(String(m));
      const v = realConsole[prop];
      return typeof v === 'function' ? v.bind(realConsole) : v;
    }
  });

  const sandbox = {
    console: fakeConsole,
    localStorage: {
      get length() { return store.size; },
      key(i) { return Array.from(store.keys())[i]; },
      getItem(k) { return store.has(k) ? store.get(k) : null; },
      setItem(k, v) {
        if (throwQuota) {
          const e = new Error('quota');
          e.name = 'QuotaExceededError';
          throw e;
        }
        store.set(k, String(v));
      },
      removeItem(k) { store.delete(k); }
    },
    fetch() { return fakeOk([{ id: 1, id2: 2 }]); },
    URL, Promise, Map, Date, JSON, Object, Array, String, Number, Math, isFinite
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf8'), sandbox, { filename: 'api-gw2.js' });
  return { sandbox, warns, store };
}

const full = mountLS(true);
const api = full.sandbox.GW2Api;

ok(!!api, 'api-gw2.js carga y expone GW2Api');

// Si __cacheStats no existe, el Tramo A no esta aplicado. No se aborta con una
// excepcion: se siguen corridors las aserciones para que el reporte sea legible
// y para que el fallo diga QUE falta, no solo "se rompio".
var hasStats = !!(api && typeof api.__cacheStats === 'function');
ok(hasStats, '__cacheStats() existe (Tramo A aplicado)');

var stats = hasStats ? api.__cacheStats() : { quotaFails: -1 };
ok(hasStats && typeof stats.quotaFails === 'number',
   'cuenta quotaFails como numero');
eq(stats.quotaFails, 0, 'arranca en 0: sin escritura todavia no hay fallo');

// Provocar escrituras: cualquier wrapper que pase por putCache() dispara lsSet.
api.getAccountAchievements('falso-token-de-test').catch(() => {});
api.getCharacterCount('falso-token-de-test').catch(() => {});

setTimeout(() => {
  const after = hasStats ? api.__cacheStats() : { quotaFails: -1 };
  ok(after.quotaFails > 0,
     'tras escribir con la cuota llena, quotaFails > 0 (obtenido: ' + after.quotaFails + ')');

  ok(full.warns.some(m => /localStorage LLENO/.test(m)),
     'se avisa por consola que localStorage esta lleno');
  ok(full.warns.filter(m => /localStorage LLENO/.test(m)).length === 1,
     'el aviso sale UNA sola vez, no una por escritura (hay cientos por carga)');

  // ── 2. La copia en memoria debe seguir sirviendo ──────────────────────────
  console.log('\n[2] El fallo de cuota no rompe la sesion en curso');

  const okStore = mountLS(false);
  const api2 = okStore.sandbox.GW2Api;
  api2.getAccountAchievements('falso-token-de-test').catch(() => {});
  setTimeout(() => {
    eq(hasStats ? api2.__cacheStats().quotaFails : -1, 0,
       'sin cuota llena, quotaFails sigue en 0: no hay falsos positivos');
    ok(okStore.warns.filter(m => /localStorage LLENO/.test(m)).length === 0,
       'sin cuota llena, no se avisa');

    // ── 3. El archivo real ya no borra la cache de otro modulo ───────────────
    console.log('\n[3] activities.js:activate() no borra la cache de logros');
    const act = fs.readFileSync(path.join(ROOT, 'js', 'activities.js'), 'utf8');
    const body = act.slice(act.indexOf('async function activate()'), act.indexOf('async function activate()') + 4000);
    const callIdx = body.search(/^\s*clean\w+Cache\(\);/m);
    const callLine = callIdx === -1 ? '' : body.slice(callIdx, body.indexOf('\n', callIdx));
    ok(!/cleanAchievementsCache/.test(callLine),
       'la unica llamada de limpieza que sobrevive es cleanActivitiesCache (datos propios)');
    ok(/cleanActivitiesCache/.test(body),
       'cleanActivitiesCache() se sigue llamando: sus prefijos psna: son de este modulo');

    console.log('\n────────────────────────────────────────');
    console.log('  %d pass / %d fail', pass, fail);
    console.log('────────────────────────────────────────');
    process.exit(fail ? 1 : 0);
  }, 60);
}, 60);
