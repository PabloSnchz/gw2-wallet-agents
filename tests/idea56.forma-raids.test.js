/*!
 * tests/idea56.forma-raids.test.js
 *
 * IDEA 56 (PO, 2026-09-30 10:00 UTC): `getAccountRaids` degrada a `[]`
 * ante una FORMA no soportada, y `[]` es indistinguible de "no completaste
 * nada".
 *
 * El bug, textual (api-gw2.js:566 antes del fix):
 *
 *     var raids = Array.isArray(data) ? data : [];
 *
 * El JSDoc de la misma funcion ya dice "@throws {Error} si la API no se pudo
 * leer (propaga, no degrada a [])". El contrato esta escrito y el codigo no
 * lo cumple: el `.catch` de red propaga, pero el camino de FORMA no.
 *
 * Por que no es teorico. ALERT-41: los 15 ids de `STRIKES_BY_EXPANSION` no
 * estan en `/v2/raids`, asi que hoy `state.completedStrikes` es `[]` SIEMPRE
 * y el Strike Tracker muestra 0 de 15. La rama 2 del PO (body con
 * `progress:[{id,cm,li}]`, documentada en el wiki de 2019) daria un ARRAY,
 * asi que `Array.isArray` pasaria, y el `.filter(function(id){...})` de
 * strike-tracker.js:1106 recibiria objetos: 0 de 15, IGUAL, y en silencio.
 *
 * O sea: el guard de forma NO arregla el modulo (falta el body crudo, ALERT-41
 * sigue bloqueando). Lo que hace es convertir el bloqueo en DIAGNOSTICO: la
 * primera vez que se abra el modulo con un body de otra forma, la consola lo
 * dice en vez de fingir "0 de 15 completados".
 *
 * Y el segundo motivo, que es el que mas importa: es el mismo patron de la
 * Idea 47 (tragarse el error y devolver un valor falso) en el punto mas caro
 * que queda. La Idea 47 propago 5 wrappers; este sexto seguia degradando.
 *
 * REGLA: "no lo pude leer" y "no hay nada" tienen que ser DOS estados
 * distintos. Un `catch` que devuelve `[]` borra la diferencia.
 *
 * Ejecutar: node tests/idea56.forma-raids.test.js
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

// body: lo que la API responde. Se pasa por parametro porque la forma
// es justamente lo que se quiere variar.
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
  console.log('[1] ARRAY de strings (la forma documentada) tiene que seguir funcionando');
  {
    const m = mount(['gorseval', 'sli_iron_magnus'], 200);
    let err = null, r = null;
    try { r = await m.api.getAccountRaids('T'); }
    catch (e) { err = e; }
    ok(err === null, 'no rechaza (error: ' + (err && err.message) + ')');
    eq(r && r.length, 2, 'devuelve los 2 ids tal cual');
    eq(m.warns.length, 0, 'no warning en el camino feliz (warnings: ' + m.warns.length + ')');
  }

  console.log('\n[2] ARRAY VACIO es un estado legitimo: "no completaste nada"');
  {
    const m = mount([], 200);
    let err = null, r = null;
    try { r = await m.api.getAccountRaids('T'); }
    catch (e) { err = e; }
    ok(err === null, 'NO rechaza: vacio es una respuesta valida de la API');
    eq(r && r.length, 0, 'devuelve []');
  }

  console.log('\n[3] FORMA NO SOPORTADA (rama 2 del PO: objeto con progress)');
  {
    // Body del wiki de 2019, que es la forma que nadie ha visto nunca.
    const m = mount({ progress: [{ id: 'gorseval', cm: false, li: 0 }] }, 200);
    let err = null, r = null;
    try { r = await m.api.getAccountRaids('T'); }
    catch (e) { err = e; }
    ok(err !== null, 'RECHAZA en vez de devolver [] (r=' + JSON.stringify(r) + ')');
    ok(err && /forma/i.test(err.message),
       'el error nombra la CAUSA (forma), no dice "fallo de red" (msg: ' +
       (err && err.message) + ')');
    ok(m.warns.length >= 1, 'deja un warning para que quede en la consola');
    ok(m.warns.some(w => /forma/i.test(w)), 'el warning tambien dice "forma"');
  }

  console.log('\n[4] OTRA forma no soportada: null / texto / number');
  // OJO: el caso 'string' es '{"text":"ok"}', NO el texto '[]'. El texto
  // '[]' es un array JSON valido: parsea a [] y el guard lo deja pasar, que
  // es lo correcto. La primera version de esta linea usaba '[]' y el FAIL
  // era del test (ALERT-56), no del codigo.
  for (const [label, body] of [['null', null], ['texto', '{"text":"ok"}'], ['number', 0]]) {
    const m = mount(body, 200);
    let err = null, r = null;
    try { r = await m.api.getAccountRaids('T'); }
    catch (e) { err = e; }
    ok(err !== null, label + ': rechaza en vez de degradar a []');
    eq(r, null, label + ': no devuelve ningun valor (no hay [] mentiroso)');
  }

  console.log('\n[5] NO se cachea una forma no soportada (si se cacheara, el throw nunca se repetiria)');
  {
    const m = mount({ progress: [] }, 200);
    try { await m.api.getAccountRaids('T'); } catch (e) { /* esperado */ }
    let err2 = null;
    try { await m.api.getAccountRaids('T'); }
    catch (e) { err2 = e; }
    ok(err2 !== null, 'la 2a llamada vuelve a fallar en vez de leer un [] de la cache');
    ok(m.store.size === 0, 'no se escribio ninguna clave de localStorage (entradas: ' + m.store.size + ')');
  }

  console.log('\n[6] el fallo de RED sigue propagando igual que antes (no se toco ese camino)');
  {
    const m = mount({ text: 'requires scope progression' }, 403);
    let err = null;
    try { await m.api.getAccountRaids('T'); }
    catch (e) { err = e; }
    ok(err !== null, 'un 403 sigue rechazando');
  }

  console.log('\n[7] el cache sigue sirviendo un array valido en la 2a llamada');
  {
    const m = mount(['gorseval'], 200);
    await m.api.getAccountRaids('T');
    const r2 = await m.api.getAccountRaids('T');
    eq(r2 && r2.length, 1, 'la 2a lee de la cache');
    eq(m.urls.length, 1, 'sin request extra (requests: ' + m.urls.length + ')');
  }

  console.log('\n' + '='.repeat(62));
  console.log('pass: ' + pass + ' | FAIL: ' + fail);
  console.log('='.repeat(62));
  if (fail > 0) process.exit(1);
})().catch(e => { console.error('ERROR FATAL: ' + e.stack); process.exit(2); });
