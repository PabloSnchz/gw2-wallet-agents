/*!
 * tests/idea49.tramoc-sharding.test.js
 *
 * Tramo C de la Idea 49: la quota de localStorage no entra con 27 cuentas.
 *
 * El plan original del PO era comprimir 'ach_acc' (79 B -> ~6 B por id). La
 * medicion del HB#46 dio otra cosa: el problema no es el tamano del registro,
 * es la DUPLICACION. La key era
 *
 *     ach_meta_v2:<lang>:<ids>
 *
 * con el id-set ENTERO dentro del nombre. Cada cuenta tiene un subconjunto
 * distinto de logros, asi que cada una genera su propia key, y como la
 * metadata no depende del token (se cachea con null), 27 cuentas guardan 27
 * veces la misma tabla, parcialmente solapada. Simulado con ids reales de la
 * API: 20.22 MB en 216 claves, contra una cuota real de 4.98 MB.
 *
 * Con sharding por id//200: 1.71 MB en 18 claves.
 *
 * Este test NO copia el codigo: monta un localStorage real en un sandbox,
 * carga el archivo real y MIDE el volumen que se escribe para 27 cuentas con
 * subconjuntos solapados, comparando el patron viejo contra el nuevo.
 *
 * Ejecutar: node tests/idea49.tramoc-sharding.test.js
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

// ---------------------------------------------------------------------------
// Sandbox: localStorage que mide, y un fetch que devuelve metadata realista.
// ---------------------------------------------------------------------------
function mount() {
  const store = new Map();
  let bytes = 0;
  const urls = [];

  const rec = (id) => ({
    id: id,
    name: 'Logro ' + id,
    description: 'Descripcion de ejemplo del logro ' + id + ', de largo similar al real.',
    icon: 'https://api.guildwars2.com/images/icons/123456789/987654321.png',
    flags: ['Borderline'],
    type: 'Achievement',
    tiers: [{ type: 'Total', quantity: 5 }],
    rewards: [{ type: 'Item', id: 12345, quantity: 1 }],
    // Campos pesados que la medicion del HB#46 midio como no leidos por nadie:
    bits: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    requirement: { type: 'Complete', id: 999 },
    locked_text: 'Texto bloqueado de ejemplo',
    prerequisites: [1, 2, 3],
    point_cap: 100
  });

  const localStorage = {
    get length() { return store.size; },
    key(i) { return Array.from(store.keys())[i]; },
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) {
      const s = String(v);
      const prev = store.get(k);
      bytes += s.length - (prev ? prev.length : 0);
      store.set(k, s);
    },
    removeItem(k) {
      const prev = store.get(k);
      if (prev) bytes -= prev.length;
      store.delete(k);
    }
  };

  // Proxy sobre el console real en vez de un objeto literal: api-gw2.js llama
  // console.info al cargar y un stub con solo log/warn/error revienta. Mismo
  // cuidado que en quotavisible.test.js (ALERT-44): nunca poner dos veces el
  // mismo nombre en el literal de globals, el ultimo gana en silencio.
  const realConsole = console;
  const quietConsole = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'warn' || prop === 'error' || prop === 'info' || prop === 'log') return () => {};
      const v = realConsole[prop];
      return typeof v === 'function' ? v.bind(realConsole) : v;
    }
  });

  const sandbox = {
    console: quietConsole,
    localStorage,
    fetch(url) {
      urls.push(url);
      const ids = String(url).match(/[?&]ids=([^&]+)/);
      const list = ids ? decodeURIComponent(ids[1]).split(',').map(Number) : [];
      return Promise.resolve({
        ok: true, status: 200, headers: { get() { return null; } },
        text() { return Promise.resolve(JSON.stringify(list.map(rec))); }
      });
    },
    URL, Promise, Map, Date, JSON, Object, Array, String, Number, Math, isFinite
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf8'),
                  sandbox, { filename: 'api-gw2.js' });

  return { api: sandbox.GW2Api, store, bytes: () => bytes, urls };
}

// 27 cuentas con ~1500 logros cada una, subconjuntos SOLAPADOS: es lo real en
// una cuenta multicuenta (los logros comunes se repiten entre cuentas).
// Se barre el rango de ids que devuelve la API.
const N_CUENTAS = 27;
const POR_CUENTA = 1500;
const IDS = [];
for (let i = 0; i < 4000; i++) IDS.push(i * 2);   // ~4000 ids reales

function cuentaIds(n) {
  const out = [];
  for (let i = 0; i < POR_CUENTA; i++) out.push(IDS[(i * 7 + n * 13) % IDS.length]);
  return Array.from(new Set(out));
}

// ---------------------------------------------------------------------------
// [1] Volumen: el patron viejo contra el sharding, sobre el archivo REAL.
// ---------------------------------------------------------------------------
console.log('\n[1] Volumen de la cache de metadata con ' + N_CUENTAS + ' cuentas');

const m = mount();

// Reproduce el patron viejo (key por id-set) para tener el numero con el que
// comparar. Se escribe a mano porque es lo que el codigo YA NO hace.
const legacyBytes = (() => {
  let b = 0;
  for (let n = 0; n < N_CUENTAS; n++) {
    const ids = cuentaIds(n);
    for (let i = 0; i < ids.length; i += 200) {
      const slice = ids.slice(i, i + 200);
      const payload = slice.map((id) => ({
        id, name: 'Logro ' + id,
        description: 'Descripcion de ejemplo del logro ' + id + ', de largo similar al real.',
        icon: 'https://api.guildwars2.com/images/icons/123456789/987654321.png',
        flags: ['Borderline'], type: 'Achievement', tiers: [{ type: 'Total', quantity: 5 }],
        rewards: [{ type: 'Item', id: 12345, quantity: 1 }],
        bits: [1,2,3,4,5,6,7,8,9,10], requirement: { type: 'Complete', id: 999 },
        locked_text: 'Texto bloqueado de ejemplo', prerequisites: [1,2,3], point_cap: 100
      }));
      b += ('ach_meta_v2:es:' + slice.join(',')).length + JSON.stringify({ ts: Date.now(), data: payload }).length;
    }
  }
  return b;
})();

(async function main() {
  // Primer ciclo en frio: cada cuenta pide su subconjunto.
  for (let n = 0; n < N_CUENTAS; n++) {
    await m.api.getAchievementsMeta(cuentaIds(n), {});
  }
  const sharded = m.bytes();
  const cuentas = m.store.size;

  const MB = (x) => (x / 1024 / 1024).toFixed(2);
  console.log('      viejo (key por id-set): ' + MB(legacyBytes) + ' MB');
  console.log('      sharding (id//200):     ' + MB(sharded) + ' MB en ' + cuentas + ' claves');

  ok(sharded > 0, 'el sharding escribe algo (sandbox bien montado)');
  ok(sharded < legacyBytes,
     'el sharding ocupa menos que el patron viejo (' + MB(sharded) + ' < ' + MB(legacyBytes) + ' MB)');
  ok(sharded < legacyBytes * 0.25,
     'la reduccion es de al menos el 75% (medido: ' +
     (100 - Math.round(sharded / legacyBytes * 100)) + '%)');
  ok(cuentas <= 40,
     'las claves quedan acotadas por shard, no por cuenta (obtenido: ' + cuentas + ')');
  ok(sharded < 4.98 * 1024 * 1024,
     'el volumen ENTRA en la cuota real de 4.98 MB (obtenido: ' + MB(sharded) + ' MB)');

  // -------------------------------------------------------------------------
  // [2] Las claves viejas se borran. Sin esto NO se libera nada: la cuota ya
  //     esta llena, asi que las keys nuevas no entran.
  // -------------------------------------------------------------------------
  console.log('\n[2] Migracion: las keys viejas se purgan');

  const m2 = mount();
  m2.store.set('ach_meta_v2:es:1,2,3,4', JSON.stringify({ ts: Date.now(), data: [] }));
  m2.store.set('ach_meta_v2:en:5,6,7', JSON.stringify({ ts: Date.now(), data: [] }));
  m2.store.set('ach_acc:abcd…wxyz', JSON.stringify({ ts: Date.now(), data: [] }));
  m2.store.set('items_cache_v1:es', JSON.stringify({ ts: Date.now(), data: {} }));

  await m2.api.getAchievementsMeta([1, 2, 3], {});

  const left = Array.from(m2.store.keys());
  ok(!left.some(k => k.indexOf('ach_meta_v2:') === 0),
     'no queda ninguna key ach_meta_v2:* (purgadas: es y en)');
  ok(left.some(k => k.indexOf('ach_acc:') === 0),
     'ach_acc:* NO se toca (es otra cache, TTL 2 min)');
  ok(left.some(k => k.indexOf('items_cache_v1') === 0),
     'items_cache_v1:* NO se toca');
  ok(left.some(k => k.indexOf('ach_meta_v3:') === 0),
     'la key nueva es ach_meta_v3:* (namespace nuevo, no colisiona con el viejo)');

  // -------------------------------------------------------------------------
  // [3] No se sobrepiden shards. Es la objecion real al sharding: si el codigo
  //     pidiera el shard entero (200 ids) aunque la cuenta tenga 3 en rango,
  //     el ahorro de cuota se pagaria con peticiones.
  // -------------------------------------------------------------------------
  console.log('\n[3] Se pide solo lo que falta del shard');

  const m3 = mount();
  // Una cuenta con 3 ids, todos en el shard 0 (0..199).
  await m3.api.getAchievementsMeta([0, 1, 2], {});
  eq(m3.urls.length, 1, 'una sola peticion para 3 ids');
  const asked = decodeURIComponent(String(m3.urls[0]).match(/[?&]ids=([^&]+)/)[1]).split(',');
  eq(asked.length, 3, 'la peticion pide 3 ids, NO los 200 del shard (obtenido: ' + asked.length + ')');

  // Ahora otra cuenta con 2 ids ya cacheados y 1 nuevo en el MISMO shard.
  const m3b = mount();
  m3.store = m3b.store;
  await m3b.api.getAchievementsMeta([0, 1, 2], {});
  const n1 = m3b.urls.length;
  await m3b.api.getAchievementsMeta([0, 1, 2, 3], {});
  eq(m3b.urls.length, n1 + 1, 'la 2a cuenta hace 1 peticion mas');
  const asked2 = decodeURIComponent(String(m3b.urls[n1]).match(/[?&]ids=([^&]+)/)[1]).split(',');
  eq(asked2.length, 1, 'solo pide el id que falta (obtenido: ' + asked2.join(',') + ')');

  // Una cuenta que pide SOLO lo ya cacheado no hace ninguna peticion.
  const before = m3b.urls.length;
  const out = await m3b.api.getAchievementsMeta([0, 1, 2], {});
  eq(m3b.urls.length, before, 'una cuenta que pide solo cacheado hace 0 peticiones');
  eq(out.length, 3, 'y aun asi devuelve los 3 registros desde la cache');
  ok(out[0] && out[0].id === 0, 'el registro devuelto es el del id pedido, no otro del shard');

  // -------------------------------------------------------------------------
  // [4] Contrato con el unico call site (achievements.js:1067).
  // -------------------------------------------------------------------------
  console.log('\n[4] El contrato que espera el consumidor no cambia');

  const m4 = mount();
  const r = await m4.api.getAchievementsMeta([7, 3, 7, 11], {});
  eq(r.length, 3, 'deduplica ids repetidos en la entrada');
  eq(r.map(x => x.id).join(','), '7,3,11', 'devuelve en el orden pedido, no en el de los shards');

  const vacio = await m4.api.getAchievementsMeta([], {});
  ok(Array.isArray(vacio) && vacio.length === 0, 'lista vacia devuelve [] sin tocar la red');

  const noArray = await m4.api.getAchievementsMeta(null, {});
  ok(Array.isArray(noArray) && noArray.length === 0, 'entrada no-array devuelve [] (no explota)');

  const meta = r[0];
  ok(meta && typeof meta.name === 'string' && typeof meta.description === 'string' &&
     meta.icon && Array.isArray(meta.flags) && Array.isArray(meta.tiers) &&
     Array.isArray(meta.rewards) && meta.type,
     'conserva los 8 campos que achievements.js SI lee (tiers/flags/rewards/description/name/icon/type/id)');

  // -------------------------------------------------------------------------
  // [4b] Los campos que NADIE lee no se guardan. El ahorro tiene que estar en
  //      disco: podarlos al leer no libera un byte de la cuota.
  // -------------------------------------------------------------------------
  console.log('\n[4b] Los 5 campos que nadie lee se podan al GUARDAR');
  const m4b = mount();
  await m4b.api.getAchievementsMeta([7], {});
  const guardado = JSON.parse(m4b.store.get('ach_meta_v3:es:0')).data['7'];
  ['bits', 'requirement', 'locked_text', 'prerequisites', 'point_cap'].forEach(function (k) {
    ok(!(k in guardado), 'no guarda el campo "' + k + '"');
  });
  ok('type' in guardado, 'pero SI guarda "type" (achievements.js:527 lo lee)');
  ['id', 'name', 'icon', 'description', 'flags', 'tiers', 'rewards', 'type'].forEach(function (k) {
    ok(k in guardado, 'sigue guardando "' + k + '"');
  });
  const conDrop = m4b.bytes();
  ok(conDrop < 400, 'el registro cacheado pesa menos de 400 B sin los campos muertos (obtenido: ' + conDrop + ' B)');

  // Id invalido: no debe romper el shard entero.
  console.log('\n[5] Un id que no existe no rompe el shard');
  const m5 = mount();
  const r5 = await m5.api.getAchievementsMeta([5, 999999], {});
  ok(r5.some(x => x.id === 5), 'devuelve el id valido');

  console.log('\n──────────────────────────────────────────');
  console.log('  ' + pass + ' pass / ' + fail + ' FAIL');
  console.log('──────────────────────────────────────────');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.log('\nEXCEPCION NO CAPTURADA: ' + (e && e.stack || e));
  console.log('  ' + pass + ' pass / ' + (fail + 1) + ' FAIL');
  process.exit(1);
});
