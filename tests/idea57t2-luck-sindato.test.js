/* =======================================================================
 * tests/idea57t2-luck-sindato.test.js  --  Tramo 2 de la Idea 57 (PO)
 *
 * QUE RESUELVE
 *   `getAccountLuck` era el septimo de los once wrappers que degradaban la
 *   capa de FORMA a un valor INdistinguible de uno legitimo. En los otros diez
 *   el valor degradado es `[]` o `0`, y `[]` es obviamente falso para cualquiera
 *   que haya estado ahi. Aca el valor degradado es `0`, y 0 ES VERDADERAMENTE
 *   POSIBLE: la API devuelve `[]` si la cuenta nunca consumio esencia, y ahi 0
 *   es la respuesta correcta. Un "0%" en la columna "Suerte (MF)" se cree en
 *   buena fe y es falso. Es el peor de los once.
 *
 * QUE SE VERIFICA (comportamiento, no texto)
 *   1. FORMA: la API responde 200 con cuerpo vacio -> `jfetch` devuelve null ->
 *      la promesa RECHAZA. Antes devolvia 0 y no dejaba ni rastro en consola.
 *   2. [] legitimo -> resuelve 0. NO es un fallo y no puede rechazarse.
 *   3. entrada luck real -> resuelve el valor.
 *   4. la distincion (1) vs (2) es la que hace TODO el fix: es facil pasar
 *      el caso 2 y romper el 1, y al reves.
 *   5. NO se toco wallet-dashboard.js: la UI ya tenia las dos puertas.
 *   6. nada de esto puede cachear un fallo como si fuera un valor.
 *
 * QUE NO ES
 *   - No es analisis estatico como los Tramos 1 y 3: este levanta el archivo
 *     real con un `fetch` falso y promesa real, porque el bug era de
 *     comportamiento y un test de texto no lo habria atrapado.
 *   - No es una lista de casos: los casos se generan desde una tabla.
 * ======================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.join(__dirname, '..');
const API = path.join(REPO, 'js', 'api-gw2.js');
const DASH = path.join(REPO, 'js', 'wallet-dashboard.js');

let pass = 0, fail = 0;
function section(t) { console.log('\n[' + t + ']'); }
function ok(c, msg, why) {
  if (c) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); if (why) console.log('          ' + why); }
}

/* -------------------------------------------------------------------------
 * Carga el archivo real con un fetch falso. Lo que sale de `fetch` es lo que
 * el modulo veria: cuerpo vacio con 200 tiene que terminar siendo `null`, que
 * es justamente el caso que antes se comia el guard.
 * ------------------------------------------------------------------------ */
function nuevoLocalStorage() {
  return {
    _d: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
    get length() { return Object.keys(this._d).length; },
    key() { return null; }
  };
}

function cargarApi(respuesta, storage) {
  const src = fs.readFileSync(API, 'utf8');
  const sandbox = {
    console: { warn() {}, error() {}, log() {}, info() {}, debug() {} },
    // P4.2 del Code-Reviewer (HB#58): el `localStorage` es INYECTABLE. Antes
    // cada llamada a cargarApi() creaba el suyo, y la seccion 4 usaba dos
    // sandboxes distintos: la cache nunca se compartia entre ellos, y
    // `v2 === 999` pasaba con o sin el fix porque no estaba probando nada.
    localStorage: storage || nuevoLocalStorage(),
    setTimeout, clearTimeout,
    fetch: function (url) {
      const r = respuesta(url);
      return Promise.resolve({
        ok: r.status >= 200 && r.status < 300,
        status: r.status,
        headers: {
          get(n) { return String(r.headers && r.headers[n] != null ? r.headers[n] : '').toLowerCase(); },
          has(n) { return !!(r.headers && r.headers[n]); }
        },
        text() { return Promise.resolve(r.body); },
        json() { return Promise.resolve(JSON.parse(r.body)); }
      });
    },
    JSON, Math, Date, Number, Object, Array, String, Boolean, Error, Promise, isFinite, parseInt, parseFloat,
    URL, URLSearchParams, Intl, RegExp, Map, Set, Symbol
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'api-gw2.js' });
  return sandbox;
}

const TOKEN = '11111111-2222-3333-4444-555555555555-11111111-2222-3333-4444-555555555555';

/* Cada caso: lo que contesta la API y lo que la promesa tiene que hacer. */
const CASOS = [
  {
    nombre: 'FORMA: 200 con cuerpo vacio -> RECHAZA (no 0 silencioso)',
    status: 200, body: '',
    espera: 'rechaza',
    esForma: true,
    porQue: 'jfetch devuelve null ante un 200 sin cuerpo. Antes el guard lo ' +
            'convertia en 0 y la UI pintaba "0%" sin error: un dato falso ' +
            'que se cree en buena fe.'
  },
  {
    // NO es un caso de FORMA. El nombre lo decia "FORMA:" desde antes, y era
    // falso: con un cuerpo que no es JSON, `jfetch` tira al parsear, ANTES de
    // que el guard `Array.isArray` llegue a ejecutarse. El rechazo lo produce
    // el parser, no el guard de forma, asi que este caso NUNCA estuvo probando
    // el fix. Se renombra para que el nombre no prometa una cobertura que no
    // hay, y no se le exige el idioma de forma (su motivo es correcto: dice
    // que el JSON no era valido).
    nombre: 'JSON no parseable (200) -> RECHAZA en jfetch, antes del guard de FORMA',
    status: 200, body: '<html>error del CDN</html>',
    espera: 'rechaza',
    porQue: 'el parser falla primero. El guard de FORMA no llega a correr: por ' +
            'eso este caso no cubre el fix, y el nombre viejo ("FORMA:") ' +
            'prometia una cobertura que no existia.'
  },
  {
    nombre: '[] legitimo -> RESUELVE 0 (no es un fallo)',
    status: 200, body: '[]',
    espera: 'resuelve:0',
    porQue: 'la cuenta nunca consumio esencia. 0 es la respuesta CORRECTA. ' +
            'Si esto se rechazara, una cuenta legitima perderia su dato.'
  },
  {
    nombre: 'entrada luck real -> RESUELVE el valor',
    status: 200, body: JSON.stringify([{ id: 'luck', value: 123456 }]),
    espera: 'resuelve:123456',
    porQue: 'el camino feliz, que es el unico que suelen cubrir los tests.'
  },
  {
    nombre: 'otra entrada sin luck -> RESUELVE 0 (no es un fallo)',
    status: 200, body: JSON.stringify([{ id: 'otro', value: 5 }]),
    espera: 'resuelve:0',
    porQue: 'array bien formado sin la entrada que buscamos: 0 correcto.'
  },
  {
    nombre: 'RED: 500 -> RECHAZA (ya propagaba, no debe regresionar)',
    status: 500, body: 'error de servidor',
    espera: 'rechaza',
    porQue: 'la capa de RED nunca degrado. Este caso esta para que alguien ' +
            'no "arregle" el FORMA rompiendo RED.'
  },
  {
    nombre: 'RED: 401 sin scope -> RECHAZA',
    status: 401, body: 'requires scope account/luck.read',
    espera: 'rechaza',
    porQue: 'idem. Un token sin permisos tiene que leerse como error.'
  }
];

async function correrCaso(c) {
  const box = crearBox(c);
  const api = cargarApi(box.respuesta);
  let resultado;
  try {
    const v = await api.GW2Api.getAccountLuck(TOKEN, { nocache: true });
    resultado = { tipo: 'resuelve', valor: v };
  } catch (e) {
    resultado = { tipo: 'rechaza', motivo: (e && e.message) || String(e) };
  }
  return { resultado, box };
}

function crearBox(c) {
  const box = { guardados: {}, warned: 0, respuesta: null };
  box.respuesta = function (url) {
    return { status: c.status, body: c.body, headers: {} };
  };
  return box;
}

(async function main() {
  /* ===================================================================== */
  section('1. los tres casos que antes colapsaban a 0 (comportamiento real)');
  /* ===================================================================== */
  for (const c of CASOS) {
    const r = await correrCaso(c);
    if (c.espera === 'rechaza') {
      ok(r.resultado.tipo === 'rechaza',
         c.nombre,
         c.porQue + ' -> en cambio RESUELVIÓ con ' + JSON.stringify(r.resultado.valor) +
         '. Volvió el bug: un dato que se cree verdadero y es falso.');
      if (r.resultado.tipo === 'rechaza') {
        ok(!!r.resultado.motivo && r.resultado.motivo.length > 0,
           '   ...y el motivo nombra la causa, no dice "error desconocido"',
           'un rechazo sin motivo es indistinguible de un 401 para el usuario');
        // P4.1 del Code-Reviewer (HB#58): `length > 0` es la asercion que dejo
        // pasar P3. El bug era que el mensaje no contenia la cadena que los
        // consumidores filtran, asi que "no vacio" no dice nada del contrato.
        // docs/ONBOARDING.md:243 lo documenta: `message` empieza con
        // "<endpoint>: forma no soportada (". Si esto falla, el motivo no es
        // parseable por raid-tracker.js:1749 ni strike-tracker.js:1121.
        //
        // SOLO para los casos de FORMA. Un fallo de RED tiene que propagar SU
        // motivo ("error de servidor", "requires scope ..."), y exigirle el
        // idioma de forma seria un test que obliga a mentir sobre la causa.
        if (c.esForma) {
          ok(/^account\/luck: forma no soportada \(/.test(r.resultado.motivo || ''),
             '   ...y el motivo habla el idioma del contrato ("<endpoint>: forma no soportada (")',
             'motivo="' + (r.resultado.motivo || '') + '" -- los consumidores filtran por esa ' +
             'cadena, asi que con otro texto raid-tracker/strike-tracker muestran la pista ' +
             'de permiso donde no corresponde');
        }
      }
    } else {
      const esperado = Number(c.espera.split(':')[1]);
      ok(r.resultado.tipo === 'resuelve' && r.resultado.valor === esperado,
         c.nombre,
         c.porQue + ' -> en cambio ' + r.resultado.tipo +
         (r.resultado.tipo === 'rechaza' ? ' (' + r.resultado.motivo + ')' :
          ' con ' + JSON.stringify(r.resultado.valor)) +
         '. Si el 0 legitimo se rechaza, se borra un dato REAL de una cuenta real.');
    }
  }

  /* ===================================================================== */
  section('2. la distincion que hace el fix (1 FORMA vs 2 legitimo)');
  /* ===================================================================== */
  {
    // El caso que mas se confunde: los DOS son "no hay luck". Uno es fallo y
    // el otro es un 0 legitimo. Si el fix no los separa, uno de los dos falla.
    const forma = await correrCaso(CASOS[0]);
    const legit = await correrCasaSeguro(CASOS[2]);
    ok(forma.resultado.tipo === 'rechaza',
       'la FORMA (cuerpo vacio) se distingue del [] legitimo',
       'volvieron a ser lo mismo: o los dos rechazan o los dos resuelven 0');
    ok(legit.resultado.tipo === 'resuelve' && legit.resultado.valor === 0,
       'el [] legitimo NO se confunde con la FORMA',
       'un 0 legitimo rechazado = dato real borrado');
  }

  /* ===================================================================== */
  section('3. lo que NO se toco: la UI ya sabia distinguir');
  /* ===================================================================== */
  {
    const dash = fs.readFileSync(DASH, 'utf8');

    ok(/function\s+unreadableCell\s*\(/.test(dash),
       'wallet-dashboard.js sigue teniendo unreadableCell()',
       'la columna de "no se pudo leer" desaparecio');

    ok(/function\s+renderLuckCell\s*\(/.test(dash) &&
       /typeof\s+s\.luck\s*!==\s*'number'/.test(dash),
       'renderLuckCell sigue teniendo su puerta para valor no numerico',
       'la segunda puerta de "sin dato" desaparecio');

    ok(/fieldErr\s*\?\s*unreadableCell\(/.test(dash),
       'la columna se elige por fieldErr, o sea POR COLUMNA',
       'esto es lo que garantiza que un rechazo NO borre la fila entera. ' +
       'Si la celda se elige antes de resolver la promesa, un rechazo ' +
       'sacaria la cuenta de Pablo de la tabla y con 27 cuentas perderia ' +
       'la vista de las otras 26.');

    ok(dash.includes('summary._errors.luck'),
       'el catch de la columna sigue traduciendo el rechazo a _errors.luck',
       'sin esto, el rechazo no llega a la UI: se pierde en el camino');
  }

  /* ===================================================================== */
  section('4. un fallo no puede quedar cacheado como si fuera un valor');
  /* ===================================================================== */
  {
    // MISMO sandbox (mismo localStorage) en las dos llamadas: sin eso no se
    // esta probando la cache, se estan probando dos modulos que no se conocen.
    const storage = nuevoLocalStorage();

    // Un fetch que responde distinto segun cuantas veces lo llamaron: primero
    // el cuerpo vacio que hace fallar, despues el valor bueno.
    let llamadas = 0;
    const fetch = function (url) {
      const r = (llamadas++ === 0)
        ? { status: 200, body: '', headers: {} }                                  // 1a: FORMA
        : { status: 200, body: JSON.stringify([{ id: 'luck', value: 999 }]), headers: {} }; // 2a: real
      return crearBox(r).respuesta(url);
    };

    const api = cargarApi(fetch, storage);
    let v1 = null;
    try { v1 = await api.GW2Api.getAccountLuck(TOKEN); } catch (e) { v1 = 'rechaza'; }
    ok(v1 === 'rechaza',
       'la primera llamada (cuerpo vacio) rechaza',
       'resolvio ' + JSON.stringify(v1) + ' en vez de rechazar');

    // La segunda llamada, SIN nocache, en el MISMO modulo: si el fallo se
    // cacheo, esta devolveria el valor cacheado del fallo en vez de 999.
    let v2 = null;
    try { v2 = await api.GW2Api.getAccountLuck(TOKEN); } catch (e) { v2 = 'rechaza:' + e.message; }
    ok(v2 === 999,
       'un FORMA fallido no deja un valor cacheado que el siguiente reading herede',
       'el fallo quedo cacheado y el proximo loadAccountSummary lee ' +
       JSON.stringify(v2) + ' creyendo que es un dato real');
  }

  /* ===================================================================== */
  section('5. sintaxis');
  /* ===================================================================== */
  {
    const { execFileSync } = require('child_process');
    ok(execFileSync('node', ['--check', API], { encoding: 'utf8' }) === '',
       'js/api-gw2.js: node --check');
  }

  console.log('\n==============================================================');
  console.log('pass: ' + pass + ' | FAIL: ' + fail);
  console.log('==============================================================');
  process.exit(fail ? 1 : 0);
})();

/* Alias con nombre propio: para que un FAIL se lea como el caso que fallo
 * y no como un numero. El error tipico de los equipos es reportar "el test de
 * luck falla" cuando lo que fallo fue UN caso de siete. */
async function correrCasaSeguro(c) { return correrCaso(c); }