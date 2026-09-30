/*!
 * tests/idea49.shard-concurrency.test.js
 *
 * Los 2 defectos que el Code Reviewer encontro en el Tramo C (f98da49) del
 * Heartbeat #48. Ambos estan en el camino de escritura de getAchievementsMeta.
 *
 * BUG 1 (severidad media-alta): dos llamadas CONCURRENTES al primer llenado
 * del mismo shard. Cada llamada construye su PROPIO bag = {} local. Las dos
 * entran al mismo inflightOnce (misma ikey), asi que el producer solo muta el
 * bag del PRIMER llamador. El bag del segundo nunca se llena y la resolucion
 * final lo lee vacio -> la segunda cuenta recibe [] y achievements.js:1069
 * construye metaById incompleto: logros sin nombre, sin icono y sin tiers, con
 * earnedAP = 0 en silencio (achievements.js:218). Es alcanzable: gn:tokenchange
 * (achievements.js:1096) dispara loadAll() sin serializar el getAchievementsMeta
 * de la carga anterior.
 *
 * BUG 2 (severidad media-baja): opts.nocache hace que getCache devuelva null
 * (api-gw2.js:325) -> bag = {} -> putCache graba SOLO los ids pedidos. Una
 * cuenta chica que refresca (boton de refresh achievements.js:829, o
 * gn:tokenchange :1096) encoge un shard del que dependen otras cuentas.
 *
 * Ejecutar: node tests/idea49.shard-concurrency.test.js
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

const rec = (id) => ({
  id: id, name: 'Logro ' + id,
  description: 'Descripcion del logro ' + id,
  icon: 'https://api.guildwars2.com/images/icons/1/2.png',
  flags: ['Borderline'], type: 'Achievement',
  tiers: [{ type: 'Total', quantity: 5 }],
  rewards: [{ type: 'Item', id: 12345, quantity: 1 }]
});

// Sandbox con un fetch que se puede hacer lento a voluntad: la concurrencia
// solo se reproduce si el producer tarda mas de un microtask.
function mount(opts) {
  opts = opts || {};
  const store = new Map();
  const urls = [];
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
      if (['warn', 'error', 'info', 'log'].includes(prop)) return () => {};
      const v = realConsole[prop];
      return typeof v === 'function' ? v.bind(realConsole) : v;
    }
  });
  const sandbox = {
    console: quietConsole, localStorage,
    fetch(url) {
      urls.push(url);
      const ids = String(url).match(/[?&]ids=([^&]+)/);
      const list = ids ? decodeURIComponent(ids[1]).split(',').map(Number) : [];
      const body = JSON.stringify(list.map(rec));
      return new Promise((resolve) => {
        setTimeout(() => resolve({
          ok: true, status: 200, headers: { get() { return null; } },
          text() { return Promise.resolve(body); }
        }), opts.delayMs || 5);
      });
    },
    URL, Promise, Map, Date, JSON, Object, Array, String, Number, Math, isFinite,
    setTimeout
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf8'),
                  sandbox, { filename: 'api-gw2.js' });
  return { api: sandbox.GW2Api, store, urls };
}

(async function main() {
  // -------------------------------------------------------------------------
  console.log('[1] BUG 1 — dos cargas concurrentes del mismo shard en frio');
  // -------------------------------------------------------------------------
  const m1 = mount({ delayMs: 5 });
  // Se disparan JUNTAS: es lo que pasa con gn:tokenchange + hashchange, o con
  // dos cuentas que entran a Logros a la vez.
  const [a, b] = await Promise.all([
    m1.api.getAchievementsMeta([0, 1, 2], {}),
    m1.api.getAchievementsMeta([0, 1, 2], {})
  ]);
  eq(a.length, 3, 'la llamada A recibe sus 3 ids');
  eq(b.length, 3, 'la llamada B recibe sus 3 ids (no [])');
  eq(m1.urls.length, 1, 'el dedupe de inflight hace 1 sola peticion de red (obtenido: ' + m1.urls.length + ')');

  // Con ids distintos del mismo shard: cada cuenta pide lo suyo.
  const m1b = mount({ delayMs: 5 });
  const [c, d] = await Promise.all([
    m1b.api.getAchievementsMeta([0, 1, 2], {}),
    m1b.api.getAchievementsMeta([3, 4], {})
  ]);
  eq(c.length, 3, 'cuenta X recibe sus 3 ids');
  eq(d.length, 2, 'cuenta Y recibe sus 2 ids del MISMO shard');
  ok(d.every(x => [3, 4].includes(x.id)), 'la cuenta Y recibe los SUYOS, no los de X');

  // Y concurrencia con shards distintos tampoco debe perder datos.
  const m1c = mount({ delayMs: 5 });
  const [e, f] = await Promise.all([
    m1c.api.getAchievementsMeta([10, 11], {}),
    m1c.api.getAchievementsMeta([500, 501], {})
  ]);
  eq(e.length, 2, 'con shards distintos, la primera carga esta completa');
  eq(f.length, 2, 'con shards distintos, la segunda carga esta completa');

  // -------------------------------------------------------------------------
  console.log('\n[2] BUG 2 — nocache no puede encoger un shard compartido');
  // -------------------------------------------------------------------------
  const m2 = mount();
  await m2.api.getAchievementsMeta([0, 1, 2, 3, 4], {});
  const antes = m2.store.get('ach_meta_v3:es:0');
  const antesN = antes ? Object.keys(JSON.parse(antes).data).length : 0;
  eq(antesN, 5, 'el shard 0 tiene 5 ids cacheados');

  // Una cuenta chica (2 ids del shard) refresca con nocache. Es el caso real:
  // el boton de refresh de achievements.js:829 y el gn:tokenchange :1096.
  await m2.api.getAchievementsMeta([0, 1], { nocache: true });
  const despues = m2.store.get('ach_meta_v3:es:0');
  const despuesN = despues ? Object.keys(JSON.parse(despues).data).length : 0;
  eq(despuesN, 5, 'nocache NO destruye los ids ya cacheados del shard (obtenido: ' + despuesN + ')');

  // Y un nocache de un shard nuevo debe seguir trayendo lo suyo.
  const m2b = mount();
  await m2b.api.getAchievementsMeta([900, 901], { nocache: true });
  const r = await m2b.api.getAchievementsMeta([900, 901], {});
  eq(r.length, 2, 'un nocache seguido de lectura normal devuelve los 2 ids');

  console.log('\n[3] El fix no rompe el camino normal (control)');
  const m3 = mount();
  const r3 = await m3.api.getAchievementsMeta([0, 1, 2], {});
  eq(r3.length, 3, 'una sola llamada sigue devolviendo sus ids');
  eq(r3.map(x => x.id).join(','), '0,1,2', 'y en el orden pedido');
  ok(r3[0] && r3[0].name && Array.isArray(r3[0].tiers) &&
     r3[0].icon && r3[0].description && Array.isArray(r3[0].flags) &&
     Array.isArray(r3[0].rewards) && r3[0].type,
     'conserva los 8 campos que achievements.js SI lee');

  console.log('\n──────────────────────────────────────────');
  console.log('  ' + pass + ' pass / ' + fail + ' FAIL');
  console.log('──────────────────────────────────────────');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.log('\nEXCEPCION NO CAPTURADA: ' + (e && e.stack || e));
  console.log('  ' + pass + ' pass / ' + (fail + 1) + ' FAIL');
  process.exit(1);
});