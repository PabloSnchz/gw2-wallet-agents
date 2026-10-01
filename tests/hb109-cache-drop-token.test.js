/*!
 * tests/hb109-cache-drop-token.test.js — IDEA 50-D (a''): barrido en el BORRADO.
 *
 * EL DEFECTO (medido por el Code-Reviewer, fila 119):
 *   `KeyManager.remove(value)` saca la Key de la lista y NO toca la cache. Las
 *   claves de esa cuenta quedan huerfanas PARA SIEMPRE: nunca se leen (el token
 *   ya no existe) y nunca se borran. Con 27 cuentas y ~4.98 MB medidos, la cuota
 *   se llena con datos de cuentas que Pablo ya elimino, y cada `setItem`
 *   posterior falla por cuota.
 *
 * LO QUE SE APLICA (variante (a'') del veredicto):
 *   `GW2Api.__cacheDropToken(value)` — recorre el store UNA vez y borra SOLO las
 *   claves de cache cuyo sufijo sea `fpToken(value)`. Se llama desde
 *   `KeyManager.remove()`. Sin prefijo `gn:` nuevo, sin contador de cuentas, sin
 *   coste de arranque, y con el boton de cacheClear existente como RED.
 *
 * POR QUE NO UN CONTADOR (lo quepidio el PO):
 *   Un numero guardado mete un prefijo `gn:` nuevo y una desync posible (si
 *   alguien edita localStorage a mano, "el numero cambio" dispara un barrido que
 *   no corresponde). El hecho del que se dispone es el TOKEN, y esta a mano en
 *   el call site.
 *
 * POR QUE NO AL ARRANQUE (variante (b), la que el Reviewer descarto):
 *   Si la lectura de la lista de cuentas falla, o corre antes de la migracion
 *   `gn:`/legacy, el conjunto de tokens validos sale VACIO y el barrido se come
 *   TODA la cache. Con (a'') no hay ninguna lectura que pueda fallar.
 *
 * LA FORMA (por que el sufijo basta y no hay que parsear el token):
 *   `fpToken` = `t.slice(0,4) + '…' + t.slice(-4)`  (api-gw2.js:535)  -> 9 chars
 *   `kLS`     = `base + ':' + fpToken(token)`      (api-gw2.js:538)
 *   O sea que la huerfana se reconoce por SUFIJO, sin parsear nada.
 *
 * RIESGO ESCRITO (el Reviewer lo exigio, y es real):
 *   Dos tokens que coincidan en los primeros 4 y los ultimos 4 caracteres
 *   COMPARTEN clave de cache, porque `fpToken` no mira nada mas. Con tokens de
 *   ArenaNet (GUID aleatorios) es despreciable; si pasara, borrar una cuenta
 *   borra la cache de la otra: se refleta, no se corrompe. NO se rediseña
 *   `fpToken` en este tramo.
 *
 * PREDICCION FALSABLE (la del Reviewer, y el test la verifica):
 *   Tras el barrido, el `dryRun` de `__cacheClear` tiene que contar 13 claves
 *   MENOS y `kept` tiene que ser IGUAL. Si `kept` baja, el barrido se comio la
 *   lista de cuentas: es el modo de fallo que `cacheClear` ya evita con
 *   `CACHE_PRESERVE_PREFIX`.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf8');

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label); }
}

// ── localStorage que respeta la cuota y el orden, como el browser ──────────
function makeLS(quotaBytes) {
  const map = new Map();
  return {
    _map: map,
    get length() { return map.size; },
    key(i) { return Array.from(map.keys())[i] ?? null; },
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) {
      const next = new Map(map);
      next.set(k, String(v));
      let used = 0; for (const val of next.values()) used += val.length;
      if (used > quotaBytes) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
      map.clear(); for (const [kk, vv] of next) map.set(kk, vv);
    },
    removeItem(k) { map.delete(k); },
    clear() { map.clear(); }
  };
}

// Los DOS tokens que SOLAPAN de verdad en `fpToken`: mismos 4 primeros y
// mismos 4 ULTIMOS. Es el riesgo que el commit escribe, asi que el test tiene
// que sembrar la colision REAL, no dos tokens parecidos: la primera version de
// este test uso `...SECRET-A` y `...SECRET-B`, que dan `fpToken` distinto
// (`ET-A` vs `ET-B`) y no colisionan — el test pasaba por un motivo equivocado.
const TOKEN_A = 'AAAAAAAAAAAAAAAA-1111-AAAA-1111-XXXX';
const TOKEN_A2 = 'AAAAAAAAAAAAAAAA-9999-AAAA-9999-XXXX';
const TOKEN_B = 'BBBBBBBBBBBBBBBB-2222-BBBB-2222-YYYY';

const fp = t => t.slice(0, 4) + '…' + t.slice(-4);
const key = (base, tok) => base + ':' + fp(tok);

function boot(seed) {
  const ls = makeLS(50 * 1024 * 1024);
  for (const [k, v] of Object.entries(seed)) ls.setItem(k, v);
  const sandbox = {
    console, setTimeout, clearTimeout, Promise, Date, JSON, Math,
    localStorage: ls,
    window: null, globalThis: null, fetch: () => Promise.reject(new Error('sin red en el test')),
    addEventListener() {}, removeEventListener() {}, CustomEvent: function () {}
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: 'api-gw2.js' });
  return { ls, api: sandbox.GW2Api };
}

function seedStore() {
  const s = {};
  // Las 13 bases keyed por token que el Reviewer declara en el registro.
  const tokenBases = ['tokeninfo', 'account_info', 'char_count', 'account_raids',
    'commerce_transactions_buys', 'commerce_transactions_sells', 'commerce_delivery',
    'account_bank', 'account_materials', 'account_armory', 'wallet', 'luck', 'ach_acc'];
  for (const b of tokenBases) s[key(b, TOKEN_A)] = JSON.stringify({ ts: 1, data: 'A' });
  for (const b of tokenBases) s[key(b, TOKEN_B)] = JSON.stringify({ ts: 1, data: 'B' });
  // El mismo nombre de base, dos tokens que SOLAPAN en fpToken: 1 clave, no 2.
  s[key('wallet', TOKEN_A2)] = JSON.stringify({ ts: 1, data: 'A2' });
  // Las SIN token (no tienen la forma, no se tocan).
  s['currencies_all'] = JSON.stringify({ ts: 1, data: 'global' });
  s['ach_meta_v3:1'] = JSON.stringify({ ts: 1, data: 'meta' });
  s['items_cache_v1'] = JSON.stringify({ ts: 1, data: 'items' });
  s['commerce_prices'] = JSON.stringify({ ts: 1, data: 'prices' });
  s['commerce_listings'] = JSON.stringify({ ts: 1, data: 'listings' });
  // Lo que NO es cache y jamas debe tocarse.
  s['gn:account:keys'] = JSON.stringify([{ label: 'a', value: TOKEN_A }, { label: 'b', value: TOKEN_B }]);
  s['gw2_keys'] = JSON.stringify([{ label: 'a', value: TOKEN_A }, { label: 'b', value: TOKEN_B }]);
  s['wv:season:index'] = JSON.stringify({ seq: 3 });
  s['gn:theme'] = '"dark"';
  // Una cache de otro modulo, registrada por su proveedor: se conserva.
  s['psna:schedule'] = JSON.stringify({ ts: 1 });
  return s;
}

console.log('IDEA 50-D (a\'\'): el borrado de una cuenta se lleva su cache');

// ── 1. CONTROL NEGATIVO PRIMERO: sin la funcion, el barrido no existe ───────
//
// NUMERO DE FAIL ESPERADO SIN EL FIX: 1 (este bloque) + 27 (las aserciones de
// las secciones 2-7) = 28. MEDIDO, no contado a mano: la primera version de
// esta nota decia 27 y el control dio 28 (ALERT-121). Anotado antes de mutar,
// corregido con el numero que dio la medicion.
const ASERCIONES_DEL_FIX = 27;
{
  const seed = seedStore();
  const before = Object.keys(seed).length;
  const { api } = boot(seed);
  const existe = typeof api.__cacheDropToken === 'function';
  ok(existe, 'CONTROL NEGATIVO: sin el fix, __cacheDropToken NO existe (da FAIL)');
  ok(before === Object.keys(seed).length, 'CONTROL NEGATIVO: el store no se toco sin llamarla');
  if (!existe) {
    // Sin la funcion NO se crashea: se cuentan los FAIL que el fix habilita.
    // Un test que tira una excepcion no tiene numero de FAIL, y un numero de
    // FAIL que no existe no se puede comparar con el esperado.
    for (let i = 0; i < ASERCIONES_DEL_FIX; i++) { pass = pass; fail++; }
    console.log('  (sin el fix: ' + ASERCIONES_DEL_FIX + ' aserciones del fix no se pueden cumplir)');
    console.log('hb109-cache-drop-token: ' + pass + ' pass / ' + fail + ' FAIL');
    process.exit(1);
  }
}

// ── 2. El barrido borra la cuenta borrada y NO las demas ──────────────────
{
  const { ls, api } = boot(seedStore());
  const r = api.__cacheDropToken(TOKEN_A);
  ok(r.removed === 13, 'borra las 13 claves de la cuenta A (medido: ' + r.removed + ')');
  ok(ls.getItem(key('wallet', TOKEN_A)) === null, 'la cache de A desaparecio de disco');
  ok(ls.getItem(key('ach_acc', TOKEN_A)) === null, 'ach_acc de A desaparecio');
  ok(ls.getItem(key('wallet', TOKEN_B)) !== null, 'la cache de B SIGUE legible');
  ok(ls.getItem(key('ach_acc', TOKEN_B)) !== null, 'ach_acc de B SIGUE legible');
  ok(ls.getItem('currencies_all') !== null, 'currencies_all (sin token) NO se toco');
  ok(ls.getItem('ach_meta_v3:1') !== null, 'ach_meta_v3 (prefijo, sin token) NO se toco');
  ok(ls.getItem('items_cache_v1') !== null, 'items_cache_v1 NO se toco');
  ok(ls.getItem('psna:schedule') !== null, 'la cache de otro modulo NO se toco');
}

// ── 3. LA PREDICCION DEL REVIEWER: kept IGUAL, removed 13 MENOS ────────────
{
  const seed = seedStore();
  const antes = boot(seed);
  const dry_antes = antes.api.__cacheClear({ dryRun: true });
  const despues = boot(seed);
  const dry_despues = despues.api.__cacheDropToken(TOKEN_A) && despues.api.__cacheClear({ dryRun: true });
  ok(dry_antes.removed - dry_despues.removed === 13,
     'PREDICCION: el dryRun cuenta 13 claves menos (' +
     dry_antes.removed + ' -> ' + dry_despues.removed + ')');
  ok(dry_antes.kept === dry_despues.kept,
     'PREDICCION: kept es IGUAL — el barrido no toco la lista de cuentas (' +
     dry_antes.kept + ' vs ' + dry_despues.kept + ')');
  ok(dry_despues.kept === dry_antes.kept && dry_antes.kept > 0,
     'kept es > 0 en los dos casos (si fuera 0, el control no midiria nada)');
}

// ── 4. La lista de cuentas y lo preservado siguen enteros ──────────────────
{
  const { ls, api } = boot(seedStore());
  const keysAntes = JSON.parse(ls.getItem('gn:account:keys'));
  api.__cacheDropToken(TOKEN_A);
  ok(ls.getItem('gn:account:keys') !== null, 'gn:account:keys NO se borro');
  ok(ls.getItem('gw2_keys') !== null, 'gw2_keys (legacy) NO se borro');
  ok(JSON.parse(ls.getItem('gn:account:keys')).length === keysAntes.length,
     'la lista de cuentas sigue con las mismas cuentas');
  ok(ls.getItem('wv:season:index') !== null, 'wv:season:index (CACHE_PRESERVE) NO se borro');
  ok(ls.getItem('gn:theme') !== null, 'gn:theme NO se borro');
}

// ── 5. El solapamiento de fpToken, con el riesgo escrito ───────────────────
{
  const { ls, api } = boot(seedStore());
  // El precondicional, para que el FAIL de abajo sea sobre el riesgo y no
  // sobre una premisa mia que resultara falsa (ALERT-133).
  ok(fp(TOKEN_A) === fp(TOKEN_A2),
     'precondicional: los 2 tokens de la seccion 5 SI comparten fpToken (' + fp(TOKEN_A) + ')');
  ok(fp(TOKEN_A) !== fp(TOKEN_B), 'precondicional: B tiene otra fpToken');
  api.__cacheDropToken(TOKEN_A);
  ok(ls.getItem(key('wallet', TOKEN_A2)) === null,
     'RIESGO DOCUMENTADO: un token que comparte fpToken pierde la clave compartida (se refleta)');
}

// ── 6. Casos borde: no explota, no borra de mas ────────────────────────────
{
  const { ls, api } = boot(seedStore());
  ok(api.__cacheDropToken(null).removed === 0, 'token null: 0 borradas, sin excepcion');
  ok(api.__cacheDropToken('').removed === 0, 'token vacio: 0 borradas');
  const r = api.__cacheDropToken('ZZZZ-not-a-real-token');
  ok(r.removed === 0, 'token que no estaba: 0 borradas');
  ok(ls.getItem(key('wallet', TOKEN_A)) !== null, 'el token inexistente no borro la cuenta real');
  // Idempotente: el segundo barrido no encuentra nada.
  api.__cacheDropToken(TOKEN_A);
  ok(api.__cacheDropToken(TOKEN_A).removed === 0, 'el barrido es idempotente');
  ok(ls.getItem(key('wallet', TOKEN_B)) !== null, 'tras 3 barridos, B sigue legible');
}

// ── 7. El call site: KeyManager.remove() llama al barrido ──────────────────
{
  const app = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
  const i = app.indexOf('remove(value)');
  ok(i > 0, 'existe KeyManager.remove(value)');
  // El CUERPO por balance de llaves, no una ventana de N caracteres: la
  // primera version de esta seccion leia 900 chars y la llamada quedo 23
  // lineas mas alla, o sea que el arnes affirmaba sobre una region que no
  // contenia lo que media (ALERT-135: un FAIL con lineas nombradas hay que
  // leerlas antes de culpar al producto).
  let depth = 0, ini = app.indexOf('{', i), fin = -1;
  for (let p = ini; p < app.length; p++) {
    if (app[p] === '{') depth++;
    else if (app[p] === '}') { depth--; if (depth === 0) { fin = p; break; } }
  }
  ok(fin > ini, 'el cuerpo de remove() se pudo extraer por balance de llaves');
  const cuerpo = app.slice(ini, fin);
  ok(/__cacheDropToken/.test(cuerpo),
     'remove() llama a __cacheDropToken');
  ok(/__cacheDropToken\?\.\(\s*value\s*\)/.test(cuerpo),
     'el argumento es el token de la cuenta que Pablo borro, no otro');
  // Y el orden: la cache se va DESPUES de que la Key salga de la lista, para que
  // un `save()` que no-op no pueda dejar la cache de una cuenta viva.
  ok(cuerpo.indexOf('this.save(') < cuerpo.indexOf('__cacheDropToken'),
     'el barrido va DESPUES de save(), no antes');
}

console.log('hb109-cache-drop-token: ' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
