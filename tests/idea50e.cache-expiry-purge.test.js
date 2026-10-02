/*!
 * tests/idea50e.cache-expiry-purge.test.js
 *
 * Idea 50 Tramo E: `getCache()` devuelve `null` al vencer pero NO borra.
 *
 * ANTES (medido en `api-gw2.js:683-694`, `origin/main` @ 2c8c374):
 *   `getCache()` devuelve `null` cuando `isFresh()` da false, y deja la entrada
 *   en `__mem` y en localStorage. El TTL deja de LEER y no LIBERA.
 *   Y `lsDel()` existe (`:541`) con **0 callers** en el archivo: la capacidad
 *   de borrar estaba escrita y sin usar.
 *
 * POR QUE NO ES "SOLO UN DELETE" — esta es la parte que hay que MEDIR antes de
 * escribir el fix, y es direccional:
 *
 *   isFresh(entry, ttl) = (age <= ttl)
 *
 *   - TTL CORTO dice vencida  =>  TTL LARGO tambien la dice vencida (mas viejo
 *     no se arregla con mas tolerancia). Borrar aca es inofensivo.
 *   - TTL CORTO dice vencida  =>  TTL LARGO dice FRESCA. **ESTE es el peligro**:
 *     el wrapper corto se lleva la entrada que el largo todavia iba a leer.
 *
 * O sea: el fallo real no es "borro de mas" en abstracto, es "borro la entrada
 * de otro". Por eso la seccion 3 existe y congela el invariante.
 *
 * MEDIDO en `origin/main` @ 2c8c374: 17 `baseKey` distintas y **una sola** con
 * mas de un sitio de lectura — `ach_meta_v3:` (`:1561` y `:1605`) — y **las dos
 * usan `TTL.ACH_META`**. Hoy el borrado no le quita nada a nadie.
 *
 * QUE NO SE TOCA, y cada uno es una asercion:
 *   - `nocache` NO borra: significa "ignorar la cache para esta lectura", no
 *     "la entrada es invalida". Si borrara, un refresco forzado de un wrapper
 *     se llevaria la entrada de otro.
 *   - El `catch` de RED que mete una entrada sin `ts` NO se purga: no es una
 *     entrada vencida, es una entrada malformada, y tratarla igual seria
 *     mezclar dos cosas.
 *   - `expiredDrops` cuenta HECHOS, no intenciones: `Map.delete()` devuelve
 *     booleano, y del lado de localStorage se mide con `lsHas()` ANTES de
 *     borrar. Misma leccion que P4 del Tramo F con `removed`.
 *
 * QUE NO USA ESTE TEST: ganchos de prueba en `GW2Api`. Todo entra por la API
 * PUBLICA con el reloj del sandbox adelantado. Agregar `__testGetCache` para
 * poder observar una rama interna es cambiar la superficie del modulo por un
 * test, y una rama interna se puede observar igual desde afuera.
 *
 * Ejecutar: node tests/idea50e.cache-expiry-purge.test.js
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
function eq(a, b, msg) { ok(a === b, msg + '  (obtenido: ' + JSON.stringify(a) + ')'.replace('undefined', 'undefined')); }

// Monta la capa con localStorage falso y reloj controlable. El reloj es la
// pieza que hace el test posible: `now()` de la capa usa `Date.now()`, asi que
// envejecer una entrada es avanzar `clock.t`, no esperar.
function mount(body) {
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
  const clock = { t: 1700000000000 };
  const FakeDate = class {
    constructor(v) { this._d = (v === undefined ? clock.t : v); }
    getTime() { return this._d; }
    static now() { return clock.t; }
  };
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
        text() { return Promise.resolve(body === undefined ? '[]' : body) }
      });
    },
    Date: FakeDate,
    URL, Promise, Map, Set, JSON, Object, Array, String, Number, Math, Boolean,
    isFinite, isNaN, parseInt, parseFloat, Error, RegExp
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf8'),
    sandbox, { filename: 'api-gw2.js' });
  return { sandbox, store, clock, warns, api: sandbox.GW2Api };
}

// Llaves de una capa, tal como las computa `kLS`/`kMem` (api-gw2.js:547-548).
function fp(t) { t = String(t); return t ? (t.slice(0, 4) + '…' + t.slice(-4)) : 'anon'; }
const lkey = (b, t) => (t ? b + ':' + fp(t) : b);

// Un wrapper con TTL corto y una clave con token: `getCommerceTransactionsBuys`
// usa `var ttl = 60 * 1000` (api-gw2.js:901). Se eligio ese y no otro porque su
// TTL esta escrito a mano y no depende de la constante TTL del bloque.
const WRAP = 'getCommerceTransactionsBuys';
const WRAP_KEY = 'commerce_transactions_buys';
const WRAP_TTL = 60 * 1000;
const TOK = 'tok-abcdefgh-1234567890';

async function main() {

// ── 1. El sintoma: la entrada vencida sobrevive ────────────────────────────
console.log('\n[1] una entrada vencida se purga de las DOS capas');
{
  const m = mount();
  const k = lkey(WRAP_KEY, TOK);

  await m.api[WRAP](TOK, {});
  ok(m.store.has(k), 'la escritura cacheo en localStorage (' + k + ')');
  eq(m.api.__cacheStats().expiredDrops, 0, 'arranca en 0 purgas');

  // Segunda llamada dentro del TTL: sirve de memoria, no reescribe.
  await m.api[WRAP](TOK, {});
  eq(m.api.__cacheStats().expiredDrops, 0, 'leer una entrada fresca NO purga: leer no es liberar');

  // Envejece. El TTL del wrapper son 60 s.
  m.clock.t += WRAP_TTL + 1;
  await m.api[WRAP](TOK, {});

  eq(m.api.__cacheStats().expiredDrops, 2,
    'vencer cuenta 2 purgas: __mem Y localStorage (Map.delete devuelve booleano)');
  ok(m.api.__cacheStats().expiredDrops > 0,
    'la entrada vencida no queda viva sin que nada lo diga: si no se purga, se cuenta');

  // Y lo que se verifica NO es "no hay nada": es que la lectura sigue
  // devolviendo el dato correcto y no se rompió la ruta de refresco.
  const m2 = mount('[{"id":1,"quantity":2}]');
  await m2.api[WRAP](TOK, {});
  m2.clock.t += WRAP_TTL + 1;
  const tras = await m2.api[WRAP](TOK, {});
  eq(JSON.stringify(tras), '[{"id":1,"quantity":2}]',
    'vencida y purgada, la llamada sigue trayendo el dato: el borrado no rompe el refresco');
  ok(m2.store.has(lkey(WRAP_KEY, TOK)),
    'y la escritura nueva volvio a dejar su entrada: purgar es limpiar, no impedir cachear');
}

// ── 2. Lo que NO se puede romper ───────────────────────────────────────────
console.log('\n[2] lo que el borrado NO puede tocar');

  // (a) Una entrada fresca jamas se borra, por muchas lecturas que la hagan.
  {
    const m = mount();
    const k = lkey(WRAP_KEY, TOK);
    await m.api[WRAP](TOK, {});
    for (let i = 0; i < 5; i++) { m.clock.t += 1000; await m.api[WRAP](TOK, {}); }
    ok(m.store.has(k), '5 lecturas dentro del TTL: la entrada sigue en localStorage');
    eq(m.api.__cacheStats().expiredDrops, 0, '0 purgas sobre una entrada viva');
  }

  // (b) `nocache` NO borra: ignora, no invalida. Si esto se rompe, un refresco
  //     forzado de un wrapper se lleva la entrada de otro.
  {
    const m2 = mount();
    const k2 = lkey(WRAP_KEY, TOK);
    await m2.api[WRAP](TOK, {});
    await m2.api[WRAP](TOK, { nocache: true });
    eq(m2.api.__cacheStats().expiredDrops, 0, 'nocache NO purga: es "no leer", no "es invalida"');
    ok(m2.store.has(k2), 'y la entrada que acababa de escribir sigue ahi');
  }

  // (c) Vencer una cuenta NO borra la entrada de otra. `kMem`/`kLS` llevan el
  //     fpToken, asi que las 27 cuentas de Pablo no se pisan entre si.
  {
    const m3 = mount();
    const TOKA = 'tok-aaaaaaaa-1111111111';
    const TOKB = 'tok-bbbbbbbb-2222222222';
    await m3.api[WRAP](TOKA, {});
    await m3.api[WRAP](TOKB, {});
    m3.clock.t += WRAP_TTL + 1;
    await m3.api[WRAP](TOKA, {});          // solo A vence y se purga
    ok(m3.store.has(lkey(WRAP_KEY, TOKB)),
      'vencer la cuenta A NO borra la entrada de la cuenta B: las claves llevan token');
    const s3 = m3.api.__cacheStats().expiredDrops;
    ok(s3 >= 2, 'y la purga se contaron (' + s3 + '), no se perdieron en silencio');
  }

// ── 3. EL INVARIANTE que hace seguro el borrado ────────────────────────────
// Congela el numero que evita el fallo DIRECCIONAL de la cabecera. Recorre el
// archivo real, resuelve cada `key` a su literal, junta los TTL con que se lee
// cada baseKey, y falla si alguna tiene mas de uno. No falla hoy; falla manana,
// que es cuando sirve.
//
// POR QUE HAY QUE RESOLVER LA VARIABLE: los 18 sitios de lectura escriben
// `getCache(key, ...)` con `key` siendo una `var key = '...'` de arriba. La
// version anterior de esta seccion solo aceptaba literales, dio 18
// "dinamicas", y por lo tanto `byKey` quedo VACIO: la asercion siguiente dio
// "0 colisiones" y "0 baseKey con mas de un sitio de lectura", o sea **las dos
//approved — habian pasado sin comprobar nada**. Un censo que no encuentra sus
// propios objetos no censa.
console.log('\n[3] el invariante: ninguna baseKey se lee con dos TTL distintos');
{
  const src = fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf8').split('\n');

  // Resolucion: para cada linea de llamada, se sube hasta el `function` que la
  // contiene y se busca el `var key = '...'` de su cuerpo. Se acota al cuerpo
  // de la función para no tomar la clave de la funcion vecina, que es el mismo
  // modo de fallo que el `assert` que media la DISTANCIA en el Tramo F.
  const keyOf = {};
  let fnActual = null, keyActual = null;
  src.forEach((line, i) => {
    const f = line.match(/^\s*function\s+(\w+)\(/);
    if (f) { fnActual = f[1]; keyActual = null; }
    const k = line.match(/var (?:l?key)\s*=\s*'([^']+)'/);
    if (k) keyActual = k[1];
    if (fnActual) keyOf[i + 1] = { fn: fnActual, key: keyActual };
  });

  const calls = [];
  src.forEach((line, i) => {
    if (/function getCache\(/.test(line)) return;                 // la definicion
    const m = line.match(/getCache\(\s*([^,]+?)\s*,\s*([^,)]+?)\s*,/);
    if (m) calls.push({ line: i + 1, keyExpr: m[1].trim(), ttlExpr: m[2].trim() });
  });
  ok(calls.length >= 15, 'el recorrido encontro los sitios de lectura (' + calls.length + ')');

  const byKey = {}, sinResolver = [];
  calls.forEach(c => {
    const lit = c.keyExpr.match(/^'([^']+)'$/);            // literal en la llamada
    const viaVar = (!lit && c.keyExpr === 'key') ? (keyOf[c.line] || {}).key : null;
    const valor = lit ? lit[1] : viaVar;
    if (!valor) { sinResolver.push(c.line + ' (' + c.keyExpr + ')'); return; }
    // OJO: la linea se guarda APARTE. La version anterior de esta seccion
    // armaba una sola string `"TTL.X @1561"` y la deduplicaba con `new Set`, con
    // lo cual dos sitios de la MISMA baseKey con el MISMO TTL jamas colapsaban
    // (las lineas son distintas por definicion) y la asercion "ninguna baseKey
    // se lee con dos TTL" **era incapaz de pasar**: daba 1 colision siempre. Un
    // detector que no puede dar el resultado que dice medir no mide; es el
    // mismo 0-y-1-falso de un regex que no matchea, con forma de bug logico.
    (byKey[valor] = byKey[valor] || { ttls: [], lines: [] });
    if (byKey[valor].ttls.indexOf(c.ttlExpr) === -1) byKey[valor].ttls.push(c.ttlExpr);
    byKey[valor].lines.push(c.line);
  });

  eq(sinResolver.length, 0,
    'todo sitio de lectura resuelve su baseKey (sin resolver: ' + JSON.stringify(sinResolver) + ')');
  // CONTROL NEGATIVO del resolver: si `byKey` quedara vacio por un fallo de
  // emparejado, las dos aserciones de abajo darian 0 y pasarian. Este afirma
  // que el censo REALmente tiene objetos, que es lo que las hace informativas.
  ok(Object.keys(byKey).length >= 15,
    'el censo tiene ' + Object.keys(byKey).length + ' baseKey, no 0: un censo vacio aprueba todo');

  // Y el control del AGRUPAMIENTO: si el resolver volviera a fallar en
  // silencio, cada sitio seria su propia baseKey. Recontar los sitios dice si
  // el agrupamiento perdio alguno.
  const sitiosTotales = Object.keys(byKey).reduce((a, k) => a + byKey[k].lines.length, 0);
  eq(sitiosTotales, calls.length,
    'el agrupamiento conserva los ' + calls.length + ' sitios: recontados ' + sitiosTotales);

  const colision = Object.keys(byKey).filter(k => byKey[k].ttls.length > 1);
  eq(colision.length, 0,
    'ninguna baseKey se lee con dos TTL distintos (colisiones: ' + JSON.stringify(
      colision.map(k => k + '=' + byKey[k].ttls.join('/'))) + ')');

  const multiLectura = Object.keys(byKey).filter(k => byKey[k].lines.length > 1);
  eq(multiLectura.length, 1, 'hay exactamente 1 baseKey con mas de un sitio de lectura');
  eq(multiLectura[0], 'ach_meta_v3:', 'y es ach_meta_v3: (los 2 shards de getAchievementsMeta)');
  ok(multiLectura.length === 1 && byKey['ach_meta_v3:'].lines.length === 2
      && byKey['ach_meta_v3:'].ttls.length === 1
      && /TTL\.ACH_META/.test(byKey['ach_meta_v3:'].ttls[0]),
    'los dos usan el MISMO TTL: lineas ' + JSON.stringify(byKey['ach_meta_v3:'].lines) +
    ' con ' + JSON.stringify(byKey['ach_meta_v3:'].ttls) +
    ' — es lo que hace el borrado seguro');

  // Las 4 de TTL escrito a mano: si alguien las unifica con la constante TTL,
  // este numero baja y el test avisa.
  ok(byKey[WRAP_KEY] && byKey[WRAP_KEY].ttls.length === 1 && /ttl/.test(byKey[WRAP_KEY].ttls[0]),
    WRAP_KEY + ' se lee con su `var ttl` propio (' + JSON.stringify(byKey[WRAP_KEY].ttls) + ')');
}

// ── 4. EL CONTADOR cuenta hechos ───────────────────────────────────────────
// P4 del Tramo F ya dio esta leccion con `removed`: un numero que no se puede
// desmentir es una intencion. De ahi que la mitad de `__mem` use el booleano
// de `Map.delete()` y la de localStorage mida con `lsHas()` antes de borrar.
console.log('\n[4] expiredDrops cuenta hechos, no intenciones');
{
  const m = mount();
  const kA = lkey(WRAP_KEY, TOK);

  await m.api[WRAP](TOK, {});
  await m.api.getCommerceTransactionsSells(TOK, {});
  eq(m.api.__cacheStats().expiredDrops, 0, 'arranca en 0');

  m.clock.t += WRAP_TTL + 1;
  await m.api[WRAP](TOK, {});
  eq(m.api.__cacheStats().expiredDrops, 2, 'la primera clave vencida cuenta 2');

  // CORRECCION DE UNA PREMISA MIA (la asercion decia 4 y el codigo dio 2, y el
  // que estaba equivocado era el test): tras purgar, la lectura escribe de
  // nuevo con `ts = now()`, o sea que la llamada INMEDIATA siguiente ya es
  // fresca y no purga. "Purgar" y "volver a cachear" ocurren en el mismo
  // wrapper, en la misma llamada; por eso la segunda lectura no ve nada
  // vencido. Contar 4 habria sido afirmar que se purgo dos veces lo que solo
  // se purgo una -- que es exactamente el fallo que la seccion 4 prohibe.
  await m.api[WRAP](TOK, {});
  eq(m.api.__cacheStats().expiredDrops, 2,
    'la lectura siguiente ya es fresca (la escritura repuso el ts): NO purga de nuevo');
  ok(m.store.has(kA),
    'y la entrada esta viva: purgar es limpiar la vencida, no impedir cachear');

  // Y para que no sea "el contador se quedo quieto": pasando el TTL otra vez,
  // purga otra vez. Si esto no sube, el contador esta decorativo.
  m.clock.t += WRAP_TTL + 1;
  await m.api[WRAP](TOK, {});
  eq(m.api.__cacheStats().expiredDrops, 4,
    'vencida otra vez purga otra vez: el contador sigue al hecho, no se congela');

  // La lectura de un key que NUNCA existio: 0 purgas. Si contara, seria
  // fiction, y una purga contada sin purgar es peor que no medir.
  const antesFantasma = m.api.__cacheStats().expiredDrops;
  await m.api.getCommerceTransactionsSells('tok-inexistente-999', {});
  await m.api.getCommerceTransactionsSells('tok-inexistente-999', {});
  await m.api.getCommerceTransactionsSells('tok-inexistente-999', {});
  eq(m.api.__cacheStats().expiredDrops > antesFantasma, false,
    'tres lecturas del primer cacheo de un token nuevo no inventan purgas');

  // Y la segunda clave, independiente: el contador es por purga, no por clave.
  m.clock.t += WRAP_TTL + 1;
  await m.api.getCommerceTransactionsSells(TOK, {});
  ok(m.api.__cacheStats().expiredDrops > antesFantasma,
    'la segunda clave suma SUS purgas (' + m.api.__cacheStats().expiredDrops + ')');
  ok(m.store.has(kA), 'y la de buys no se toco al purgar sells: son claves distintas');
}

// ── 5. El cuerpo del fix, acotado ─────────────────────────────────────────
// Las aserciones de esta seccion no miden comportamiento (eso lo hacen 1-4)
// sino que la implementacion este en el lugar y en el ORDEN correctos.
console.log('\n[5] el fix esta en getCache y en el orden correcto');
{
  const src = fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf8');
  const body = (src.match(/function getCache\([^)]*\)\s*\{[\s\S]*?\n  \}/) || [''])[0];
  ok(body !== '', 'getCache existe y su cuerpo se pudo acotar');
  ok(/__mem\.delete\(/.test(body), 'getCache borra la entrada vencida de __mem');
  ok(/lsDel\(/.test(body), 'y usa lsDel, que hasta ahora tenia 0 callers');
  ok(/lsHas\(/.test(body),
    'y pregunta antes con lsHas: el contador de purgas de localStorage no se inventa');
  // EL ORDEN: si __mem se borra ANTES de mirar localStorage, se pierde la
  // promocion "la memoria vencio pero el disco esta fresco" que hoy existe, y
  // ese caso es el de una recarga con la cuota llena.
  ok(body.indexOf('__mem.delete') > body.indexOf('isFresh(lval'),
    'la purga de __mem va DESPUES de intentar promover desde localStorage');
  ok(body.indexOf('__mem.delete') > body.indexOf('isFresh(mval'),
    'y despues de comprobar que la de memoria estaba vencida');
  ok(/nocache\) return null/.test(body),
    'la rama de nocache sigue cortando antes: ignora, no invalida');
  ok(body.indexOf('lsDel(') > body.indexOf('isFresh(lval'),
    'la purga de localStorage tambien va al final, despues de descartar la fresca');

  // Y que el contador se haya agregado al lugar donde ya se miran estos numeros.
  const stats = (src.match(/function cacheStats\(\)\s*\{[\s\S]*?\n  \}/) || [''])[0];
  ok(/expiredDrops/.test(stats),
    'expiredDrops se expone en __cacheStats(), al lado de quotaFails');
}

// ── 6. Sintaxis del archivo vigilado ──────────────────────────────────────
console.log('\n[6] sintaxis');
{
  const r = require('child_process').spawnSync(process.execPath,
    ['--check', path.join(ROOT, 'js', 'api-gw2.js')], { encoding: 'utf8' });
  eq(r.status, 0, 'js/api-gw2.js: node --check' + (r.status ? ' -> ' + r.stderr : ''));
}

}

main().then(function () {
  console.log('\n' + (fail === 0 ? 'TODO OK' : 'HAY FALLOS') + ' — ' + pass + ' pass / ' + fail + ' FAIL');
  process.exit(fail === 0 ? 0 : 1);
}, function (e) {
  console.error('ERROR no capturado: ' + (e && e.stack || e));
  console.log('\n' + pass + ' pass / ' + fail + ' FAIL (el harness se corto)');
  process.exit(1);
});
