/*!
 * tests/idea50f.cacheclear-real.test.js
 *
 * Idea 50 Tramo F: `cacheClear()` limpa `__mem` y NO toca localStorage.
 *
 * Contexto (medido, no supuesto):
 *   - `api-gw2.js:1632` — `function cacheClear() { try { __mem.clear();
 *     __inflight.clear(); } catch (_){} }`. La cuota de localStorage (~4.98 MB
 *     medidos) NO se toca. Y `cacheClear` tiene **0 callers** en el repo: no
 *     hay ningun boton que la invoque, o sea que hoy no hay escape.
 *   - La cuota la llena `putCache()` via `lsSet()`. Con la cuota llena, cada
 *     escritura posterior falla y la app reinicia en frio en cada recarga
 *     (Tramo A ya lo hace visible con `__cacheStats().quotaFails`).
 *
 * EL PUNTO DE DISENO DEL TRAMO (y por que este test existe):
 * La propuesta del PO era borrar por lista de prefijos (`ach_*`,
 * `commerce_*`, `items_cache_*`). **Medido: la mitad es falsa, y la parte
 * falsa es la importante.** Las 18 claves que escribe esta capa en
 * localStorage NO comparten ningun prefijo:
 *
 *   tokeninfo, account_info, char_count, account_raids,
 *   commerce_transactions_buys, commerce_transactions_sells,
 *   commerce_delivery, commerce_listings, commerce_prices:<slice>,
 *   account_bank, account_materials, account_armory, wallet, luck,
 *   currencies_all:<lang>, ach_acc, ach_meta_v3:<lang>:<shard>,
 *   items_cache_v1:<lang>
 *
 * `wallet` y `luck` son nombres pelados: no arrancan por `ach_` ni por
 * `commerce_`, asi que un borrado por familias dejaria vivas justamente
 * `wallet`, que es de las que mas cuota gasta. Por eso el borrado es por
 * **allowlist exacta** de las 18.
 *
 * Y `items_cache_v1:` SI existe (api-gw2.js:1511 lo lee, :1581 lo escribe con
 * `lsSet` directo) - pero NO pasa por `putCache()`. Un inventario hecho solo
 * sobre `var key = ...` no la ve: a mi me dio 17 claves y conclui que
 * `getItemsMany` no cacheaba. Era falso, y por el mismo motivo que el PO
 * documento en el HB#58: responder desde el estado anterior en vez de leer el
 * repo. La seccion 5 recorre las DOS vias de escritura por eso.
 *
 * Y eso obliga a una garantia que es lo que este test mide de verdad: **no
 * puede tocar las claves de cuentas.** `gw2_keys` y `gn:account:keys` son la
 * lista de las 27 cuentas de Pablo. Un barrido de "lo que parece cache" que
 * se coma `gn:account:keys` borra la lista de cuentas: es el modo de fallo
 * del que el PO aviso en el HB#60.
 *
 * Ejecutar: node tests/idea50f.cacheclear-real.test.js
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

// Las 18 claves que esta capa escribe en localStorage, medidas sobre las DOS
// vias de escritura: `putCache()` (-> lsSet) y el `lsSet(lkey, ...)` directo de
// `getItemsMany`.
//
// MEDIDO, y corrige una lectura mia anterior: `getItemsMany` **si** cachea, en
// `items_cache_v1:<lang>` (api-gw2.js:1511 lo lee, :1581 lo escribe). No pasa
// por `putCache()`, asi que un inventario hecho solo sobre `var key = ...` la
// pierde. Por eso la lista se verifica contra las dos vias (seccion 5).
//
// Las 14 exactas no comparten ningun prefijo con nada: `wallet` y `luck` son
// nombres pelados. Por eso el borrado NO puede ser por familia tipo `ach_*`:
// dejaria vivas `wallet` y `luck`, que es justo lo que hay que liberar.
const EXACT = [
  'tokeninfo', 'account_info', 'char_count', 'account_raids',
  'commerce_transactions_buys', 'commerce_transactions_sells',
  'commerce_delivery', 'commerce_listings', 'account_bank',
  'account_materials', 'account_armory', 'wallet', 'luck', 'ach_acc'
];
// Las 4 con sufijo proprio. El sufijo incluye ':', asi que `commerce_prices:`
// no puede pisar `commerce_pricesfoo`.
const PREFIX = ['commerce_prices:', 'currencies_all:', 'ach_meta_v3:', 'items_cache_v1:'];

// Claves que NO son de esta capa y que un borrado descuidado se comeria.
const PRESERVE = [
  'gn:account:keys',            // la lista de cuentas (MIRROR_MAP)
  'gw2_keys',                   // la legacy de la lista de cuentas
  'gn:account:selected',
  'gn:wallet:pins',             // los pines, que NO son cache
  'gn:legendary:armory',        // otro modulo, prefijo propio
  'gw2_currencies_cache_v1',    // app.js:46, no pasa por putCache
  'gn:theme',
  'ach_meta_v2:es:1,2,3'        // legacy, la maneja purgeLegacyAchMeta
];

function mount() {
  const store = new Map();
  const warns = [];
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
      setItem(k, v) { store.set(k, String(v)); },
      removeItem(k) { store.delete(k); }
    },
    fetch() {
      return Promise.resolve({
        ok: true, status: 200, headers: { get() { return null; } },
        text() { return Promise.resolve('[]'); }
      });
    },
    URL, Promise, Map, Date, JSON, Object, Array, String, Number, Math, isFinite
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf8'), sandbox, { filename: 'api-gw2.js' });
  return { sandbox, store, warns };
}

// ── 1. La API expone el borrado y devuelve un conteo ──────────────────────
console.log('\n[1] cacheClear existe y es observable');
const m = mount();
const api = m.sandbox.GW2Api;
ok(!!api, 'api-gw2.js carga y expone GW2Api');
ok(typeof api.__cacheClear === 'function', '__cacheClear() sigue expuesto');

// ── 2. Borra de verdad las 18 claves, y devuelve cuantas ──────────────────
console.log('\n[2] borra las claves de cache de localStorage');
EXACT.forEach(k => m.store.set(k + ':tok', JSON.stringify({ ts: Date.now(), data: [] })));
EXACT.forEach(k => m.store.set(k, JSON.stringify({ ts: Date.now(), data: [] })));  // variantes sin token
PREFIX.forEach(p => m.store.set(p + 'es:0', JSON.stringify({ ts: Date.now(), data: {} })));
PRESERVE.forEach(k => m.store.set(k, '[]'));

const before = m.store.size;
const res = api.__cacheClear();
const after = m.store.size;

const cacheLeft = Array.from(m.store.keys()).filter(
  k => EXACT.indexOf(k.split(':')[0]) !== -1 || PREFIX.some(p => k.indexOf(p) === 0)
);
eq(cacheLeft.length, 0, 'no queda ninguna clave de cache de las 18 (quedaron: ' + JSON.stringify(cacheLeft) + ')');
ok(before > after, 'la cache persistente desaparecio de localStorage (' + before + ' -> ' + after + ')');
ok(res && typeof res.removed === 'number', 'devuelve un conteo {removed}');
ok(res && typeof res.kept === 'number', 'devuelve tambien {kept}: lo que NO toco, que es la garantia');
if (res) eq(res.removed, before - after, 'removed coincide con las claves efectivamente borradas');

// ── 3. LA GARANTIA: no toca las claves de cuentas ni las de otros modulos ──
console.log('\n[3] NO toca claves de cuentas, pines ni otros modulos');
eq(res ? res.kept : -1, PRESERVE.length, 'kept cuenta exactamente las ' + PRESERVE.length + ' claves ajenas');
PRESERVE.forEach(k => ok(m.store.has(k), 'sigue presente: ' + k));

// El caso caro, aislado: SOLO la lista de cuentas en la store.
console.log('\n[4] caso isolé: la store tiene solo las claves de cuentas');
const m2 = mount();
PRESERVE.forEach(k => m2.store.set(k, '[]'));
var r2 = m2.sandbox.GW2Api.__cacheClear();
// Sin esto el test ABORTA con TypeError en la version sin el fix, y se pierde
// el reporte de las secciones siguientes. Mismo criterio que
// idea49.quotavisible.test.js: se sigue corriendo para que el fallo diga QUE
// falta y no solo "se rompio".
if (!r2 || typeof r2.removed !== 'number') {
  ok(false, '__cacheClear() todavia no devuelve {removed, kept} (Tramo F no aplicado)');
  r2 = { removed: -1, kept: -1 };
} else {
  ok(true, '__cacheClear() devuelve {removed, kept}');
}
eq(r2.removed, 0, 'con solo claves ajenas, removed = 0 (no borra nada)');
eq(r2.kept, PRESERVE.length, 'kept = ' + PRESERVE.length + ': las conto y no las toco');
ok(m2.store.has('gn:account:keys') && m2.store.has('gw2_keys'),
  'las 27 cuentas siguen ahi: gn:account:keys y gw2_keys intactas');

// ── 5. La allowlist esta completa: TODA clave que esta capa escribe esta
//        cubierta, por las DOS vias de escritura ────────────────────────────
// Este es el test que evita que la allowlist envejezca en silencio. Si un
// wrapper nuevo cachea con una clave que no esta en la lista, el borrado la
// deja viva y la cuota sigue sin liberarse.
//
// Se recorre `var key = '...'` (la via putCache) Y `var lkey = '...'` (la via
// lsSet directa de getItemsMany). La version anterior de este test solo
// recorria la primera y por eso reporto 17 claves cuando son 18: la lectura
// incompleta seodisculpa como "no existe" y es la forma mas caro de equivocarse
// en un inventario.
console.log('\n[5] la allowlist cubre TODA clave que escribe esta capa');
const src = fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf8');
const literals = [];
const reKey = /var (?:l?key) = '([^']+)/g;
let mm;
while ((mm = reKey.exec(src)) !== null) literals.push(mm[1]);
// Deduplicar: `ach_meta_v3` esta declarado en las dos ramas del shard.
const uniq = Array.from(new Set(literals));
eq(uniq.length, EXACT.length + PREFIX.length,
  'la allowlist declara las ' + (EXACT.length + PREFIX.length) + ' claves que escribe la capa (encontradas: ' + uniq.length + ')');
const missing = uniq.filter(l => EXACT.indexOf(l) === -1 && !PREFIX.some(p => l.indexOf(p) === 0));
eq(missing.length, 0, 'ninguna clave queda fuera de la allowlist (faltan: ' + JSON.stringify(missing) + ')');
ok(uniq.indexOf('items_cache_v1:') !== -1,
  'items_cache_v1: esta en el inventario (getItemsMany cachea por lsSet directo, no por putCache)');

// Y que la allowlist no se haya cerrado por error: si alguien la reduce a las
// familias `ach_*`/`commerce_*` que propuso el PO, wallet y luck quedan vivas.
ok(EXACT.indexOf('wallet') !== -1 && EXACT.indexOf('luck') !== -1,
  'wallet y luck estan en la allowlist: no arrancan porach_ ni por commerce_, y son las que mas cuota gastan');

console.log('\n' + (fail === 0 ? 'TODO OK' : 'HAY FALLOS') + ' — ' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail === 0 ? 0 : 1);
