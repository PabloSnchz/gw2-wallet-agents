/*!
 * tests/idea57-t2-forma-propaga.test.js
 *
 * Idea 57, Tramo 2: los 3 wrappers que YA PROPAGAN el error de RED pero NO el
 * de FORMA. `getAccountBank`, `getAccountMaterials` y `getAccountLegendaryArmory`
 * tienen el patron de la Idea 47 a medio migrar:
 *
 *     .then(function (data) {
 *       var bank = Array.isArray(data) ? data : [];   <-- degrada en SILENCIO
 *       putCache(key, bank, token, TTL.BANK);
 *       return bank;
 *     }).catch(function (error) {
 *       throw error;                                  <-- la red SI sube
 *     })
 *
 * Que esta roto, y por que NO es cosmetica: `/v2/account/bank` es un array. Si
 * un dia devuelve otra cosa (un 403 con cuerpo de error que el parseo no
 * rechaza, un cambio de forma, un proxy que devuelve `{}`), el call site ve `[]`.
 * Y `[]` en el panel de Inventario es EXACTAMENTE lo que ve una cuenta vacia:
 * mismo 0 slots, misma tipografia. El error de RED ya se surfacea
 * (`inventory-hub.js:229-231` arma `state.readErrors`, `inventory-dashboard.js:344`
 * arma `unread`), asi que el de FORMA es el unico que se pierde en silencio. El
 * JSDoc de las 3 funciones ya promete "propaga, no degrada a []": el archivo
 * CONTRADICE su propio contrato, y el comentario de la Idea 47 en la cabecera
 * (`api-gw2.js:322-327`) cuenta como aplicados 3 wrappers que no lo estan.
 *
 * QUE MIDE, Y POR QUE NO ES "UNAS ASERCIONES MAS": corre el CUERPO VERBATIM de
 * las 3 funciones en un `vm` contra una `fetch` que devuelve la forma nueva. No
 * mira el codigo: mira que PROMESA produce la funcion. Un test que hace
 * `indexOf` sobre el archivo pasa igual el dia que el fix este puesto, o sea
 * que no mide el fix.
 *
 * CONTROL NEGATIVO (secciones 3 y 6, no al principio): la seccion 6 exige que el
 * arnes distinga las dos direcciones - que rechaza con forma rota Y que NO
 * rechaza con forma buena. Un fix que "arreglara" de mas (rechazando el `[]`
 * legitimo) pasaria 3 de 4 y caeria en 3b. Control de no-regresion, que es lo
 * que un guard de forma puede romper sin querer.
 *
 * Ejecutar: node tests/idea57-t2-forma-propaga.test.js
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
 * Un sandbox = una identidad de `fetch`: no se puede cambiar la `fetch` de uno ya
 * montado (el closure de `jfetch` agarra la global en el momento de la llamada,
 * pero la forma limpia de probar un corte de red es un sandbox propio).
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
const TRES = [
  ['getAccountBank', 'banco'],
  ['getAccountMaterials', 'materiales'],
  ['getAccountLegendaryArmory', 'armeria']
];

const main = async function () {
  /* ═══ 1. LAS TRES FUNCIONES EXISTEN Y EXPONEN SU SUPERFICIE ═══ */
  console.log('\n[1] Las 3 funciones existen y estan exportadas');
  {
    const { api } = montar('[]');
    ok(typeof api.getAccountBank === 'function', 'getAccountBank es funcion');
    ok(typeof api.getAccountMaterials === 'function', 'getAccountMaterials es funcion');
    ok(typeof api.getAccountLegendaryArmory === 'function', 'getAccountLegendaryArmory es funcion');
  }

  /* ═══ 2. LA FORMA VALIDA SIGUE SIENDO UN ARRAY: NO SE ROMPE NADA ═══ */
  console.log('\n[2] Con la forma que la API devuelve HOY, el resultado sigue siendo el array');
  {
    const { api } = montar(JSON.stringify([{ id: 1, count: 5 }, { id: 2, count: 3 }]));
    const bank = await api.getAccountBank(TOKEN);
    ok(Array.isArray(bank), 'getAccountBank con array devuelve array',
      'obtenido: ' + JSON.stringify(bank));
    ok(bank && bank.length === 2, 'y con los 2 items intactos',
      'obtenido length: ' + (bank && bank.length));
    ok(Array.isArray(await api.getAccountMaterials(TOKEN)), 'getAccountMaterials con array devuelve array');
    ok(Array.isArray(await api.getAccountLegendaryArmory(TOKEN)), 'getAccountLegendaryArmory con array devuelve array');
  }

  /* ═══ 3. LA FORMA NUEVA (objeto, no array) TIENE QUE RECHAZAR, NO DEVOLVER [] ═══ */
  console.log('\n[3] Si la respuesta deja de ser un array, la promesa RECHAZA (no resuelve [])');
  for (const [fn] of TRES) {
    const { api } = montar(JSON.stringify({ error: { text: 'la forma cambio' } }));
    let valor = null, rechazo = null;
    try { valor = await api[fn](TOKEN); } catch (e) { rechazo = e; }
    ok(rechazo !== null, fn + ': rechaza cuando la respuesta no es un array',
      'reolvio con: ' + JSON.stringify(valor));
    ok(!(Array.isArray(valor) && valor.length === 0), fn + ': NO degrada en silencio a []');
  }

  /* ═══ 3b. UN ARRAY VACIO DE VERDAD SIGUE SIENDO UN ARRAY: no se confunde con el error ═══ */
  console.log('\n[3b] Un array VACIO de verdad se sigue aceptando: "no tenes nada" no es "no pude leer"');
  for (const [fn] of TRES) {
    const { api } = montar('[]');
    let bien = false, err = null;
    try { bien = Array.isArray(await api[fn](TOKEN)); } catch (e) { err = e; }
    ok(bien && err === null, fn + ': un [] real resuelve como [] (no es un error de forma)',
      'error: ' + (err && err.message));
  }

  /* ═══ 4. LA CACHE NO SE CONTAMINA CON UNA FORMA ROTA ═══ */
  console.log('\n[4] Una forma rota NO queda cacheada como si fuera el dato');
  {
    const { api, ls } = montar(JSON.stringify({ error: { text: 'la forma cambio' } }));
    try { await api.getAccountBank(TOKEN); } catch (e) { /* esperado */ }
    let conArrayVacio = 0, claves = [];
    for (const k of Object.keys(ls._d)) {
      if (!/bank/i.test(k)) continue;
      claves.push(k);
      try {
        const v = JSON.parse(ls._d[k]);
        if (Array.isArray(v.data) && v.data.length === 0) conArrayVacio++;
      } catch (_) { /* no parseable: no cuenta */ }
    }
    ok(conArrayVacio === 0,
      'ninguna clave de banco quedo con un [] representing una forma rota',
      'claves con []: ' + conArrayVacio + ' de ' + claves.length);
  }

  /* ═══ 5. EL CATCH DE RED SIGUE PROPAGANDO (no-regresion) ═══ */
  console.log('\n[5] Un fallo de RED sigue rechazando: el fix de forma no toco ese camino');
  {
    const api = montarRedCaida();
    let rechazo = null;
    try { await api.getAccountBank(TOKEN); } catch (e) { rechazo = e; }
    ok(rechazo !== null, 'un rechazo de RED sigue saliendo de getAccountBank');
    ok(rechazo && /red cortada/.test(rechazo.message),
      'y es el error de red, no uno de forma', 'mensaje: ' + (rechazo && rechazo.message));
  }

  /* ═══ 6. CONTROLES NEGATIVOS: el arnes tiene que distinguir las DOS direcciones ═══ */
  console.log('\n[6] CONTROLES: el arnes distingue forma rota de forma buena, en los dos sentidos');
  {
    const roto = montar(JSON.stringify({ nope: true }));
    let r1 = null;
    try { await roto.api.getAccountBank(TOKEN); } catch (e) { r1 = e; }
    ok(r1 !== null, 'direccion 1 (forma rota): el arnes la ve como rechazo');

    const bueno = montar(JSON.stringify([{ id: 9 }]));
    let r2 = null;
    try { await bueno.api.getAccountBank(TOKEN); } catch (e) { r2 = e; }
    ok(r2 === null, 'direccion 2 (forma buena): el arnes NO ve un rechazo (no fix de mas)',
      'rechazo espurio: ' + (r2 && r2.message));
  }

  console.log('\n' + '='.repeat(60));
  console.log('idea57-t2-forma-propaga: ' + pass + ' pass, ' + fail + ' FAIL');
  console.log('='.repeat(60));
  process.exit(fail ? 1 : 0);
};

main().catch(function (e) {
  console.error('ERROR DE ARNES:', e && e.stack ? e.stack : e);
  process.exit(2);
});