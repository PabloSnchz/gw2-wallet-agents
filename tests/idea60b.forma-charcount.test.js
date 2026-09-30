/*!
 * tests/idea60b.forma-charcount.test.js
 *
 * F2 del Code-Reviewer sobre la Idea 56 (task-b20623f46caa, veredicto
 * APROBADO con 3 follow-ups): `getCharacterCount` tiene EXACTAMENTE el mismo
 * bug que `getAccountRaids`, una funcion arriba.
 *
 * El codigo (api-gw2.js:544 antes del fix):
 *
 *     var count = Array.isArray(data) ? data.length : 0;
 *
 * Y el JSDoc de esa misma funcion (api-gw2.js:528) dice literal:
 *
 *     @throws {Error} si la API no se pudo leer (propaga, no degrada a 0)
 *
 * El catch de RED cumplia el contrato; el camino de FORMA no.
 *
 * POR QUE NO ES TEORICO (hallazgo del Reviewer, verificado):
 *
 *     api-gw2.js:408   var o = raw ? JSON.parse(raw) : null;
 *
 * `jfetch` devuelve `null` ante un 200 con body VACIO. O sea que el caso
 * `null` del guard es alcanzable en produccion sin ningun token roto, sin
 * ningun permiso roto y sin ninguna caida: la API responde 200 sin cuerpo
 * y la columna "Personajes" del Wallet Dashboard muestra 0, que se lee
 * exactamente como "esta cuenta no tiene personajes".
 *
 * Y por que el Reviewer loBrowseryo de "media" y no de "baja": el mismo
 * bucle hostil de ALERT-32. Un 0 que no es 0 manda a Pablo a borrar y
 * re-agregar la API key, que es justo lo que la UI sugiere hacer.
 *
 * Tambien corrige el relato: el commit de la Idea 56 decia "sexto wrapper
 * que degrada". Con este son SIETE. El "cinco propagados" de la Idea 47 no
 * incluia a este.
 *
 * REGLA: un contrato escrito en el JSDoc que el codigo no cumple es un bug
 * aunque nadie lo haya reportado, y "no se vio nunca" no es "esta bien".
 *
 * Ejecutar: node tests/idea60b.forma-charcount.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;

function ok(cond, msg) {
  if (cond) { console.log('  PASS  ' + msg); pass++; }
  else { console.log('  FAIL  ' + msg); fail++; }
}
function eq(a, b, msg) {
  ok(a === b, msg + '  (obtenido: ' + JSON.stringify(a) + ', esperado: ' + JSON.stringify(b) + ')');
}

function mount(body, status) {
  const store = new Map();
  const warns = [];
  const urls = [];
  const localStorage = {
    get length() { return store.size; },
    key(i) { return Array.from(store.keys())[i]; },
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); }
  };
  const sandbox = {
    console: { warn(...a) { warns.push(a.map(String).join(' ')); },
               error() {}, info() {}, log() {} },
    localStorage,
    fetch(url) {
      urls.push(String(url));
      const text = typeof body === 'string' ? body : JSON.stringify(body);
      return Promise.resolve({
        ok: status >= 200 && status < 300, status,
        headers: { get() { return null; } },
        text() { return Promise.resolve(text); }
      });
    },
    URL, Promise, Map, Date, JSON, Object, Array, String, Number, Math, isFinite, Set,
    setTimeout
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf8'),
                  sandbox, { filename: 'api-gw2.js' });
  return { api: sandbox.GW2Api, warns, urls, store };
}

(async function main() {
  const HEROES = [
    { name: 'Heroe 1' }, { name: 'Heroe 2' }, { name: 'Heroe 3' }
  ];

  console.log('[1] ARRAY de personajes: el camino normal no se toca');
  {
    const m = mount(HEROES, 200);
    let err = null, r = null;
    try { r = await m.api.getCharacterCount('T'); }
    catch (e) { err = e; }
    ok(err === null, 'no rechaza (error: ' + (err && err.message) + ')');
    eq(r, 3, 'devuelve la cantidad');
    eq(m.warns.length, 0, 'sin warning (warnings: ' + m.warns.length + ')');
  }

  console.log('\n[2] ARRAY VACIO = "esta cuenta no tiene personajes": respuesta VALIDA');
  {
    const m = mount([], 200);
    let err = null, r = null;
    try { r = await m.api.getCharacterCount('T'); }
    catch (e) { err = e; }
    ok(err === null, 'NO rechaza: 0 personajes es una cuenta valida');
    eq(r, 0, 'devuelve 0');
  }

  console.log('\n[3] EL CASO REAL: 200 con body vacio -> jfetch devuelve null');
  {
    // Es exactamente lo que pasa en produccion: raw = '' -> `raw ? ... : null`.
    // Body vacio = texto vacio. El mock lo pasa tal cual.
    const m = mount('', 200);
    let err = null, r = null;
    try { r = await m.api.getCharacterCount('T'); }
    catch (e) { err = e; }
    ok(err !== null, 'RECHAZA en vez de devolver 0 (r=' + JSON.stringify(r) + ')');
    ok(err && /forma/i.test(err.message),
       'el mensaje nombra la CAUSA (msg: ' + (err && err.message) + ')');
    ok(err && /characters/.test(err.message), 'el mensaje dice que endpoint es');
  }

  console.log('\n[4] otras formas no soportadas');
  for (const [label, body] of [['texto de error', '{"text":"requires scope characters"}'], ['numero', 7]]) {
    const m = mount(body, 200);
    let err = null, r = null;
    try { r = await m.api.getCharacterCount('T'); }
    catch (e) { err = e; }
    ok(err !== null, label + ': rechaza');
    eq(r, null, label + ': no devuelve 0 mentiroso');
  }

  console.log('\n[5] NO cachea la forma no soportada');
  {
    const m = mount({ characters: [] }, 200);
    try { await m.api.getCharacterCount('T'); } catch (e) { /* esperado */ }
    let err2 = null;
    try { await m.api.getCharacterCount('T'); }
    catch (e) { err2 = e; }
    ok(err2 !== null, 'la 2a llamada vuelve a fallar en vez de leer un 0 de la cache');
    ok(m.store.size === 0, 'ninguna clave escrita (entradas: ' + m.store.size + ')');
  }

  console.log('\n[6] el fallo de RED sigue igual');
  {
    const m = mount({ text: 'no' }, 401);
    let err = null;
    try { await m.api.getCharacterCount('T'); }
    catch (e) { err = e; }
    ok(err !== null, 'un 401 sigue rechazando');
  }

  console.log('\n[7] el cache de un conteo VALIDO se sigue usando');
  {
    const m = mount(HEROES, 200);
    const a = await m.api.getCharacterCount('T');
    const b = await m.api.getCharacterCount('T');
    eq(b, 3, 'la 2a lee de la cache');
    eq(m.urls.length, 1, 'sin request extra (requests: ' + m.urls.length + ')');
    eq(typeof a, 'number', 'el 1er valor es un numero');
  }

  console.log('\n[8] CONSISTENCIA: los dos guards de FORMA se comportan igual');
  {
    // La Idea 56 y esta son el mismo contrato en dos funciones. Si un dia
    // divergen, el "quinto/septimo wrapper que degrada" deja de ser cierto
    // y el diagnostico vuelve a mentir.
    const a = mount({ progress: [] }, 200);   // forma mala para raids
    const b = mount({ progress: [] }, 200);   // misma forma mala para chars
    let ea = null, eb = null;
    try { await a.api.getAccountRaids('T'); } catch (e) { ea = e; }
    try { await b.api.getCharacterCount('T'); } catch (e) { eb = e; }
    ok(ea !== null && eb !== null, 'ambos rechazan la misma forma mala');
    ok(ea && eb && /forma no soportada/.test(ea.message) && /forma no soportada/.test(eb.message),
       'ambos mensajes usan el mismo texto');
    ok(ea && eb && ea.name === 'Error' && eb.name === 'Error',
       'ambos lanzan Error plano, sin envolver (name, no constructor: el sandbox ' +
       'corre en otro realm y `instanceof` no cruza)');
  }

  console.log('\n' + '='.repeat(62));
  console.log('pass: ' + pass + ' | FAIL: ' + fail);
  console.log('='.repeat(62));
  if (fail > 0) process.exit(1);
})().catch(e => { console.error('ERROR FATAL: ' + e.stack); process.exit(2); });
