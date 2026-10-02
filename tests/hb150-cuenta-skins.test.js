/* tests/hb150-cuenta-skins.test.js
 *
 * Idea del PO de las 18:00 UTC, item "Coberturable account-scoped multicuenta"
 * (BACKLOG.md L88), Tramo 1: `getAccountSkins(token, opts)` para
 * `/v2/account/skins`. Es el primero de los 12 endpoints `/v2/account/*` que la
 * fila dice que estan sin tocar, y el que la fila nombra para arrancar.
 *
 * QUE MIDE, Y POR QUE NO SON "UNAS ASERCIONES MAS": corre la FUNCION VERBATIM
 * en un `vm` contra una `fetch` que devuelve cada forma y mira que PROMESA
 * produce. No mira el codigo con `indexOf`. Un test que hace `indexOf` del
 * guard pasa igual el dia que el fix este puesto, o sea que no mide el fix
 * (ALERT-216: el certificado de FILTRO-05 era justamente eso, y por eso no
 * podia fallar).
 *
 * EL PUNTO DE ESTE TEST, y lo que lo separa de `idea57-t2-forma-propaga`:
 * aquellos 3 wrappers devuelven arrays de OBJETOS y su guard es
 * `Array.isArray(data)`. Este endpoint devuelve un array de ESCALARES (ids).
 * Un `Array.isArray(data)` a secas ACIERTA con `[{id:1},{id:2}]`, o sea que el
 * guard de los otros tres, copiado tal cual, habria dado verde con una forma
 * que este endpoint nunca devuelve y que rompe mas abajo, en el `.indexOf` del
 * call site. Por eso la seccion 3 es la que de verdad prueba el fix: la forma
 * "array de objetos" tiene que RECHAZAR.
 *
 * LAS FORMAS, MEDIDAS Y NO SUPUESTAS. La API no deja ver la respuesta sin un
 * token real, asi que la forma NO se saco de un 401:
 *   - `GET /v2/account/skins` con token falso -> 401 (el endpoint EXISTE);
 *     control `GET /v2/account/bogusendpoint123` -> 404 (no existe).
 *   - La forma, contra la documentacion publica de una implementacion de
 *     referencia (GW2Treasures/gw2api, `account()->skins()`): `get():array` con
 *     ejemplo literal `[ 1, 2, 3, 4, … ]`.
 * El 401 demuestra que el endpoint existe; NO demuestra la forma. Son dos
 * hechos distintos y el que importa para el guard es el segundo.
 *
 * CONTROLES NEGATIVOS (secciones 3, 3b y 6): el arnes tiene que distinguir las
 * DOS direcciones, o sea no solo "no romperse con la forma buena" sino tambien
 * "rechazar la forma que el guard de los otros tres dejaria pasar". Un fix que
 * "arreglara de mas" (rechazando el `[]` legitimo) pasaria la mayoria y caeria
 * en 3b.
 *
 * Ejecutar: node tests/hb150-cuenta-skins.test.js
 *
 * ── COMO SE VERIFICA QUE ESTE TEST PUEDE FALLAR (la fase roja, sin la cual
 *    las 17 aserciones de abajo no prueban nada) ──────────────────────────────
 * Un test que nunca se vio rojo no es un test: es una afirmacion. La mutacion
 * que tira este test abajo es BORRAR el segundo guard, el de los elementos, y
 * dejar solo el `Array.isArray` de los otros 3 wrappers:
 *
 *   1) Abrir `js/api-gw2.js` y borrar desde
 *        for (var i = 0; i < data.length; i++) {
 *      hasta justo antes de
 *        putCache(key, data, token, TTL.SKINS);
 *      (OJO: el `putCache` SE CONSERVA. Borrarlo tambien haria caer la seccion 4,
 *      pero seria otro defecto y taparia el que se quiere probar.)
 *   2) `node tests\hb150-cuenta-skins.test.js`  ->  **13 pass / 4 FAIL**
 *   3) Restaurar ese bloque. `node tests\hb150-cuenta-skins.test.js` -> 17/0.
 *
 * Que caigan 4 y no 17 importa: las 4 caidas tienen que ser las secciones 3 y
 * 3c (las que miran la forma de los ELEMENTOS), y las secciones 3b y 6 —las que
 * detectan un arreglo de mas, que rechaza tambien el `[]` legitimo— tienen que
 * SEGUIR EN VERDE. Si al borrar el guard se cae todo, el test no distingue
 * "rechaza la forma mala" de "rechaza todo", y no sirve.
 *
 * ── COMO SE MIDIO EL ENDPOINT (los 3 hechos que sostienen el contrato) ───────
 *   curl -s -o NUL -w "%{http_code}" ".../v2/account/skins?access_token=<falso>"
 *       -> 401   (el endpoint EXISTE)
 *   curl -s -o NUL -w "%{http_code}" ".../v2/account/bogusendpoint123?..."
 *       -> 404   (control: un endpoint que NO existe)
 *   curl -s -o NUL -w "%{http_code}" ".../v2/skins?ids=all"
 *       -> 400   (la trampa de BACKLOG L88: el catalogo hay que paginarlo)
 * El 401 demuestra que EXISTE. NO demuestra la FORMA: la API no deja ver la
 * respuesta sin un token real, y por eso la forma se confirmo aparte, contra la
 * documentacion publica de GW2Treasures/gw2api (`account()->skins()`:
 * `get():array`, ejemplo literal `[ 1, 2, 3, 4, ... ]`). Son dos hechos
 * distintos, y el que decide el guard es el segundo.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg, why) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg + (why ? '\n          -> ' + why : '')); }
}

/* --- Almacenamiento falso: el patron ya existe en idea50b, se copia tal cual --- */
function fakeLS() {
  return {
    _d: {},
    get length() { return Object.keys(this._d).length; },
    key(i) { return Object.keys(this._d)[i]; },
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; }
  };
}
function fakeDoc() {
  return {
    readyState: 'loading', addEventListener() {}, removeEventListener() {},
    getElementById() { return null; },
    createElement() { return { style: {}, addEventListener() {} }; },
    body: {}
  };
}

/**
 * Monta `api-gw2.js` REAL en un sandbox y devuelve su `GW2Api`.
 * `rawText` es lo que devuelve la `fetch`: texto crudo, porque lo parsea `jfetch`.
 */
function montar(rawText) {
  const ls = fakeLS();
  const sb = {
    console: { info() {}, warn() {}, error() {}, log() {}, debug() {} },
    document: fakeDoc(),
    localStorage: ls,
    setInterval() { return 0; }, clearInterval() {},
    URL, Promise, Map, Date, JSON, Object, Array, String, Number, Math, isFinite,
    fetch: function () {
      return Promise.resolve({
        ok: true, status: 200, headers: { get() { return null; } },
        text() { return Promise.resolve(rawText); }
      });
    }
  };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(SRC, sb, { filename: 'api-gw2.js' });
  return { api: sb.GW2Api, ls: ls };
}

function montarRedCaida() {
  const ls = fakeLS();
  const sb = {
    console: { info() {}, warn() {}, error() {}, log() {}, debug() {} },
    document: fakeDoc(),
    localStorage: ls,
    setInterval() { return 0; }, clearInterval() {},
    URL, Promise, Map, Date, JSON, Object, Array, String, Number, Math, isFinite,
    fetch: function () { return Promise.reject(new Error('red cortada a proposito')); }
  };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(SRC, sb, { filename: 'api-gw2.js' });
  return sb.GW2Api;
}

const TOKEN = 'token-de-prueba-abc';
/* La forma real, segun la fuente citada en la cabecera del archivo. */
const IDS = [1, 2, 3, 4];

const main = async function () {
  /* ═══ 1. LA FUNCION EXISTE Y ESTA EXPORTADA ═══ */
  console.log('\n[1] La funcion existe y esta exportada');
  {
    const { api } = montar(JSON.stringify(IDS));
    ok(typeof api.getAccountSkins === 'function', 'getAccountSkins es funcion');
  }

  /* ═══ 2. LA FORMA REAL SIGUE SIENDO UN ARRAY DE NUMEROS: NO SE ROMPE NADA ═══ */
  console.log('\n[2] Con la forma que la API devuelve HOY ([1,2,3,4]), el resultado es ese array');
  {
    const { api } = montar(JSON.stringify(IDS));
    const skins = await api.getAccountSkins(TOKEN);
    ok(Array.isArray(skins), 'getAccountSkins con array de ids devuelve array',
      'obtenido: ' + JSON.stringify(skins));
    ok(skins && skins.length === 4, 'y con los 4 ids intactos',
      'obtenido length: ' + (skins && skins.length));
    ok(skins && skins[2] === 3, 'y en su posicion (no reordenado)',
      'obtenido[2]: ' + JSON.stringify(skins && skins[2]));
  }

  /* ═══ 3. LA FORMA QUE EL GUARD DE LOS OTROS TRES DEJARIA PASAR: TIENE QUE RECHAZAR ═══
   * Esta es la seccion que prueba el fix. `/v2/account/skins` devuelve ids, no
   * objetos. Un array de objetos es un array, asi que el guard de los otros tres
   * lo acepta en silencio; este tiene que rechazarlo. */
  console.log('\n[3] Un array de OBJETOS (la forma que este endpoint NUNCA devuelve) RECHAZA');
  {
    const { api } = montar(JSON.stringify([{ id: 1 }, { id: 2 }]));
    let valor = null, rechazo = null;
    try { valor = await api.getAccountSkins(TOKEN); } catch (e) { rechazo = e; }
    ok(rechazo !== null,
      'array de objetos: rechaza (el guard de los otros 3 lo dejaria pasar)',
      'reolvio con: ' + JSON.stringify(valor));
    ok(!(Array.isArray(valor) && valor.length === 0),
      'y NO degrada en silencio a []');
    ok(rechazo && /no es un id de skin/.test(rechazo.message),
      'y el mensaje dice cual de los 2 guards fallo (no el de "no es un array")',
      'mensaje: ' + (rechazo && rechazo.message));
  }

  /* ═══ 3b. UN ARRAY VACIO DE VERDAD SIGUE SIENDO UN ARRAY ═══ */
  console.log('\n[3b] Un array VACIO de verdad se acepta: "no tenes skins" no es "no pude leer"');
  {
    const { api } = montar('[]');
    let bien = false, err = null;
    try { bien = Array.isArray(await api.getAccountSkins(TOKEN)); } catch (e) { err = e; }
    ok(bien && err === null, 'un [] real resuelve como [] (no es un error de forma)',
      'error: ' + (err && err.message));
  }

  /* ═══ 3c. MEZCLA: un solo elemento que no es numero, en el medio, se alcanza ═══ */
  console.log('\n[3c] Un unico elemento malo EN EL MEDIO tambien se alcanza (no solo el primero)');
  {
    const { api } = montar(JSON.stringify([1, 'dos', 3]));
    let rechazo = null;
    try { await api.getAccountSkins(TOKEN); } catch (e) { rechazo = e; }
    ok(rechazo !== null, 'con [1,"dos",3] rechaza',
      'el elemento 1 es el que esta en la posicion 1, no en la ultima');
    ok(rechazo && /elemento 1/.test(rechazo.message),
      'y el mensaje nombra el indice', 'mensaje: ' + (rechazo && rechazo.message));
  }

  /* ═══ 4. UNA FORMA ROTA NO QUEDA CACHEADA COMO SI FUERA EL DATO ═══ */
  console.log('\n[4] Una forma rota NO queda cacheada como si fuera el dato');
  {
    const { api, ls } = montar(JSON.stringify([{ id: 1 }]));
    try { await api.getAccountSkins(TOKEN); } catch (e) { /* esperado */ }
    let sucias = 0, claves = [];
    for (const k of Object.keys(ls._d)) {
      if (!/skin/i.test(k)) continue;
      claves.push(k);
      try {
        const v = JSON.parse(ls._d[k]);
        if (Array.isArray(v.data) && v.data.length === 0) sucias++;
      } catch (_) { /* no parseable: no cuenta */ }
    }
    ok(sucias === 0,
      'ninguna clave de skins quedo con un [] representando una forma rota',
      'claves sucias: ' + sucias + ' de ' + claves.length);
  }

  /* ═══ 5. EL CATCH DE RED SIGUE PROPAGANDO (no-regresion) ═══ */
  console.log('\n[5] Un fallo de RED sigue rechazando: el fix de forma no toco ese camino');
  {
    const api = montarRedCaida();
    let rechazo = null;
    try { await api.getAccountSkins(TOKEN); } catch (e) { rechazo = e; }
    ok(rechazo !== null, 'un rechazo de RED sigue saliendo de getAccountSkins');
    ok(rechazo && /red cortada/.test(rechazo.message),
      'y es el error de red, no uno de forma', 'mensaje: ' + (rechazo && rechazo.message));
  }

  /* ═══ 6. CONTROL NEGATIVO DEL ARNES: distingue las DOS direcciones ═══ */
  console.log('\n[6] CONTROLES: el arnes distingue forma rota de forma buena, en los dos sentidos');
  {
    const roto = montar(JSON.stringify({ nope: true }));
    let r1 = null;
    try { await roto.api.getAccountSkins(TOKEN); } catch (e) { r1 = e; }
    ok(r1 !== null, 'direccion 1 (forma rota): el arnes la ve como rechazo');

    const bueno = montar(JSON.stringify(IDS));
    let r2 = null;
    try { await bueno.api.getAccountSkins(TOKEN); } catch (e) { r2 = e; }
    ok(r2 === null, 'direccion 2 (forma buena): el arnes NO ve un rechazo (no fix de mas)',
      'rechazo espurio: ' + (r2 && r2.message));
  }

  /* ═══ 7. SIN TOKEN NO SE PIDE NADA ═══ */
  console.log('\n[7] Sin token: rechaza antes de tocar la red');
  {
    const { api } = montar(JSON.stringify(IDS));
    let rechazo = null;
    try { await api.getAccountSkins(''); } catch (e) { rechazo = e; }
    ok(rechazo !== null, 'getAccountSkins("") rechaza');
    ok(rechazo && /Falta access_token/.test(rechazo.message),
      'con el mensaje de falta de token', 'mensaje: ' + (rechazo && rechazo.message));
  }

  console.log('\n' + '='.repeat(60));
  console.log('hb150-cuenta-skins: ' + pass + ' pass, ' + fail + ' FAIL');
  console.log('='.repeat(60));
  process.exit(fail ? 1 : 0);
};

main().catch(function (e) {
  console.error('ERROR DE ARNES:', e && e.stack ? e.stack : e);
  process.exit(2);
});