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

// ── 6. P4 del Reviewer: `dryRun` y `bytes` ───────────────────────────────
// Por que esta seccion y no es "una asercion mas": el boton del Tramo
// siguiente necesita responder "¿cuanto se libera?" ANTES de un confirm().
// Con la firma vieja `cacheClear()` no habia forma de preguntarlo sin borrar,
// y `kept` no sirve: `kept` es una garantia de que NO se toco, no una medida
// de si vale la pena tocar. La funcion sigue con 0 callers, asi que la
// unica forma de que esto se rompa en silencio es que alguien la llame antes
// de que exista el boton.
console.log('\n[6] P4: cacheClear({dryRun}) responde sin borrar');
const d = mount();
const dapi = d.sandbox.GW2Api;
// Se puebla con contenido de tamano CONOCIDO para que `bytes` sea un hecho
// y no un "> 0" que pasaria siempre.
d.store.set('wallet', 'x'.repeat(100));
d.store.set('luck', 'y'.repeat(50));
d.store.set('ach_acc', 'z'.repeat(25));
d.store.set('gn:account:keys', 'KEEP');   // no es de esta capa: no se cuenta
const bytesEsperados = 100 + 50 + 25;

const dry = dapi.__cacheClear({ dryRun: true });
eq(d.store.has('wallet'), true, 'dryRun NO borra `wallet`');
eq(d.store.has('luck'), true, 'dryRun NO borra `luck`');
eq(d.store.has('ach_acc'), true, 'dryRun NO borra `ach_acc`');
eq(dry.removed, 3, 'dryRun dice cuantas borraria (3)');
eq(dry.bytes, bytesEsperados, 'dryRun mide los bytes exactos (' + bytesEsperados + ')');
eq(dry.dryRun, true, 'el resultado dice que fue dryRun');
eq(dry.kept, 1, 'la clave de cuentas se cuenta como kept, no como cache');

// Y el `dryRun` tiene que ser indistinguible del borrado real en lo que
// informa, salvo por `dryRun`. Si difirieran, el boton confirmaria una cifra
// y ejecutaria otra.
const wet = dapi.__cacheClear();
eq(wet.removed, 3, 'el borrado real borra las 3');
eq(wet.bytes, bytesEsperados, 'el borrado real informa los mismos bytes que el dryRun');
eq(wet.dryRun, false, 'el resultado dice que fue real');
eq(d.store.has('wallet'), false, 'el borrado real SI borra `wallet`');
eq(d.store.has('gn:account:keys'), true, 'el borrado real NO toca `gn:account:keys`');

// `removed` tiene que ser un HECHO. Con la firma vieja contaba llamadas a
// `lsDel`, y `lsDel` se traga la excepcion: un numero que no se puede
// desmentir es una intencion. Se comprueba que coincida con lo que la store
// perdio de verdad.
const f = mount();
f.store.set('wallet', 'a');
f.store.set('luck', 'b');
f.store.set('gn:theme', 'c');
const antes = f.store.size;
const resReal = f.sandbox.GW2Api.__cacheClear();
eq(resReal.removed, antes - f.store.size, 'removed es la diferencia real de localStorage.length, no la cuenta de llamadas');
eq(f.store.size, 1, 'solo sobrevive la clave que no es de esta capa');

// ── 7. P3 del Reviewer: el REGISTRO ESTATICO de lo que escriben otros modulos
//
// Por que esta seccion existe y no es "una asercion mas": el Reviewer rechazo
// la primera propuesta (registrar en `putCache`) por un motivo que esta seccion
// mide. Registrar en la ESCRITURA es un hecho de SESION aplicado a un hecho de
// DISCO: en una sesion nueva donde Pablo no abrio la pestana de WV, el registro
// esta vacio, el boton no toca las `wv_*` que hay en disco desde la semana
// pasada, y el `dryRun` del `confirm()` cuenta 0 bytes y promete una liberacion
// que no ocurre. O sea: el bug que la 50F Tramo vino a arreglar, por la puerta
// de atras. El `wv_obj_meta:es:...` de abajo es el caso caro: son MB.
console.log('\n[7] P3: registro estatico de las bases de los otros modulos');

// (a) SIN el modulo que declara sus bases, su cache NO se toca. Esta es la
// version sin el fix: para el borrado, el WV no existe.
const p1 = mount();
const WV_KEYS = [
  'wv_season', 'wv_account_v2:abcd.1234', 'wv_listings_all', 'wv_acc_listings:abcd.1234',
  'wv_obj_daily:es', 'wv_obj_catalog:es', 'wv_obj_meta:es:0,500,1000'
];
WV_KEYS.forEach(k => p1.store.set(k, '{}'));
const r1 = p1.sandbox.GW2Api.__cacheClear();
eq(r1.removed, 0, 'sin el modulo que declara sus bases, la cache del WV NO se borra');
eq(p1.store.size, WV_KEYS.length, 'las ' + WV_KEYS.length + ' claves del WV siguen ahi');

// (b) DECLARADO DESPUES de cargar la capa, si se borra. Esta es la asercion
// que hace que el registro se lea AL PULSAR y no al cargar: si se leyera al
// cargar, `p2` se comportaria como `p1` y esto daria 0.
const p2 = mount();
p2.store.set('wv_season', '{}');
p2.store.set('wv_account_v2:abcd.1234', '{}');
p2.store.set('wv_obj_meta:es:0,500', '{}');
p2.sandbox.WizardsVault = { __cacheBases: { exact: ['wv_season', 'wv_account_v2'], prefix: ['wv_obj_'] } };
const r2b = p2.sandbox.GW2Api.__cacheClear();
eq(r2b.removed, 3, 'declaradas DESPUES de cargar la capa, las 3 se borran: el registro se lee al pulsar');
eq(p2.store.size, 0, 'no queda ninguna de las declaradas');

// (c) El ARCHIVO REAL, no un doble. Se carga `wizards-vault.js` de verdad y se
// usa el `__cacheBases` que el expone. Un doble probaria el mecanismo pero no
// que el modulo declara lo que dice declarar.
//
// Se carga DESPUES de la capa a proposito, que es el orden que importa: es el
// caso donde un registro leido al cargar el modulo fallaria, asi que si esto
// pasa, el registro se lee al pulsar y el orden de `index.html` es irrelevante.
function mountWV() {
  const mm = mount();
  // `wizards-vault.js` es un modulo de UI: al cargarse inyecta un boton y
  // registra listeners. `readyState: 'loading'` lo deja en la rama que solo
  // REGISTRA el listener, sin DOM ni timers: lo que se prueba aca es
  // `__cacheBases`, y no interesa arrastrar el DOM del boton de recarga.
  mm.sandbox.document = {
    readyState: 'loading',
    addEventListener: function () {},
    removeEventListener: function () {},
    getElementById: function () { return null; },
    createElement: function () { return { style: {}, addEventListener: function () {} }; }
  };
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'wizards-vault.js'), 'utf8'),
    mm.sandbox, { filename: 'wizards-vault.js' });
  return mm;
}
const p3 = mountWV();
WV_KEYS.forEach(k => p3.store.set(k, '{}'));
p3.store.set('gn:account:keys', 'KEEP');
const r3 = p3.sandbox.GW2Api.__cacheClear();
ok(!!p3.sandbox.WizardsVault && !!p3.sandbox.WizardsVault.__cacheBases,
  'el wizards-vault.js REAL expone WizardsVault.__cacheBases');
eq(r3.removed, WV_KEYS.length, 'el archivo real declara sus bases y el borrado las alcanza (' + WV_KEYS.length + ')');
eq(p3.store.size, 1, 'solo sobrevive la lista de cuentas');
ok(p3.store.has('gn:account:keys'), 'y la lista de cuentas sigue intacta');

// (d) El registro NO puede envejecer: se recorre lo que el modulo REAL escribe
// y cada clave tiene que estar cubierta por lo que declara. Mismo criterio que
// la seccion 5, y por el mismo motivo: un inventario a mano se da cuenta de
// nada cuando el codigo escribe una clave nueva.
const srcWV = fs.readFileSync(path.join(ROOT, 'js', 'wizards-vault.js'), 'utf8');
const wvLits = [];
const reWV = /var (?:l?key) = '([^']+)/g;
let mWV;
while ((mWV = reWV.exec(srcWV)) !== null) wvLits.push(mWV[1]);
const wvUniq = Array.from(new Set(wvLits));
const wvBases = (p3.sandbox.WizardsVault && p3.sandbox.WizardsVault.__cacheBases) || { exact: [], prefix: [] };
ok(wvUniq.length >= 5, 'el recorrido encontro las escrituras del WV (' + wvUniq.length + ')');
const wvMissing = wvUniq.filter(l =>
  wvBases.exact.indexOf(l) === -1 && !wvBases.prefix.some(p => l.lastIndexOf(p, 0) === 0)
);
eq(wvMissing.length, 0, 'toda clave que escribe el WV esta cubierta por su declaracion (faltan: ' + JSON.stringify(wvMissing) + ')');
ok(wvBases.prefix.indexOf('wv_obj_') !== -1,
  'el prefijo wv_obj_ esta declarado: cubre wv_obj_<kind>, wv_obj_catalog: y wv_obj_meta:<slices>');
ok(wvBases.exact.indexOf('wv_account_v2') !== -1 && wvBases.exact.indexOf('wv_acc_listings') !== -1,
  'las 2 con sufijo de token estan declaradas como exactas (kLS las sufija con :<fpToken>)');

// (e) El conteo, DECLARADO. 18 de esta capa (14 exactas + 4 prefijos) + 5 del
// WV (4 exactas + 1 prefijo) = 23. El Reviewer escribio "22" y "6
// declaraciones": son 23 y 5. Un total sin alcance declarado no es un dato.
// Sin `__cacheBases` la seccion se degrada en vez de abortar: si el archivo
// vuelve a la version sin el fix, el reporte tiene que decir QUE falta y no
// solo "se rompio" (mismo criterio que la seccion 4).
const bases = (typeof p3.sandbox.GW2Api.__cacheBases === 'function')
  ? p3.sandbox.GW2Api.__cacheBases()
  : { exact: [], prefix: [] };
eq(bases.exact.length, 18, 'el registro tiene 18 exactas (14 de la capa + 4 del WV)');
eq(bases.prefix.length, 5, 'el registro tiene 5 prefijos (4 de la capa + 1 del WV)');
eq(bases.exact.length + bases.prefix.length, 23, 'el alcance total son 23 bases, no 22');
ok(bases.prefix.indexOf('items_cache_v1:') !== -1,
  'items_cache_v1: sigue en el registro: getItemsMany escribe con lsSet directo y no pasa por putCache');

// (f) LA RED: la persistencia de temporada no es cache. Hoy ningun prefijo la
// alcanza, asi que esta seccion verifica el ORIGEN del peligro y no un
// resultado: si alguien agrega el prefijo corto `wv`, `wv:season:index` y
// `wv:season:current` se comen los pines y los marks del usuario. Por eso van
// en `CACHE_PRESERVE` y por eso la excepcion se evalua ANTES que los prefijos.
const wvPreserve = ['wv:season:index', 'wv:season:current'];
const p4 = mount();
wvPreserve.forEach(k => p4.store.set(k, '{"season_info":1,"keys":{}}'));
p4.sandbox.WizardsVault = { __cacheBases: { exact: [], prefix: ['wv'] } };  // el prefijo peligroso
const r4 = p4.sandbox.GW2Api.__cacheClear();
eq(r4.removed, 0, 'con el prefijo corto `wv`, PRESERVE gana y la persistencia no se borra');
wvPreserve.forEach(k => ok(p4.store.has(k), 'sigue presente pese al prefijo que la alcanzaba: ' + k));

console.log('\n' + (fail === 0 ? 'TODO OK' : 'HAY FALLOS') + ' — ' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail === 0 ? 0 : 1);
