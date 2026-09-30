/*!
 * tests/idea49.partial-206.retry404.test.js
 *
 * EL MOCK DEL TEST ANTERIOR MENTIA EN EL PUNTO EXACTO DONDE LA API DIFIERE.
 *
 * Medido contra la API en vivo (2026-09-30, sin token):
 *   /v2/items?ids=1,2,3        -> 404 "all ids provided are invalid"
 *   /v2/items?ids=1,2,3,4,5    -> 206 con SOLO los 2 validos (4 y 5)
 *
 * Es decir: 206 = "queda AL MENOS UNO valido". Si NO queda ninguno, el
 * status es 404, no 206. El mock de idea49.partial-206.test.js calculaba
 * `status = (got.length === list.length) ? 200 : 206`, asi que para el
 * reintento `?ids=1,2,3` (got=[], list=[1,2,3]) devolvia 206 con `[]`.
 * La API real devuelve 404. O sea: el test simulaba un endpoint que se
 * comporta distinto del real justo en la ruta que el fix agrega.
 *
 * EL BUG (regresion que el fix del 206 introdujo, v2.23.0):
 *
 *   1. Lote [1,4,2,5,3] -> 206 con [4,5].  left = [1,2,3].
 *   2. Reintento ?ids=1,2,3 -> 404.
 *   3. jfetch tira (!res.ok), fetchWithRetry no reintenta (404 no es
 *      retriable), el .then interno NUNCA corre.
 *   4. `arr` — los 2 items validos que YA TENIAMOS — se descarta con el
 *      rejection.
 *
 * El bug que el fix pretendia matar era "un id invalido deja ESE item sin
 * icono". El fix lo empeoro: un id invalido deja los 200 del lote sin
 * icono, y sin cachear, asi que el proximo render repite.
 *
 * Peor en getAchievementsMeta: NO tiene catch, asi que el rejection sube
 * por la cadena y el consumidor marca la carga como fallida. No es "logros
 * sin tiers": es la vista de logros completa que no carga. Y la 2a llamada
 * tampoco se sana, porque no se cacheo nada.
 *
 * REGLA: un reintento es una MEJORA, no un requisito. Si falla, se devuelve
 * el resultado original. Y: un test que simula una API externa y cuya
 * logica nueva depende de como FALLA la API tiene que copiar los dos
 * caminos de fallo (parcial y total), no solo el exito parcial.
 *
 * Ejecutar: node tests/idea49.partial-206.retry404.test.js
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

// 10 ids validos, 5 que no existen. Escala realista: el shard de logros
// claea cuando UNO de sus ids no esta, y con 27 cuentas hay muchos.
const VALID = new Set([1, 2, 3, 4, 6, 7, 8, 9, 10]);
const INVALID = [11, 12, 13, 14, 15];
const REAL = Array.from(VALID);

function rec(id) {
  return { id, name: 'Item ' + id, type: 'Weapon', icon: 'https://x/' + id + '.png' };
}

function achRec(id) {
  return { id, name: 'Logro ' + id, type: 'Achievement', icon: 'https://x/' + id + '.png',
           tiers: [{ type: 'Recollect', goal: 1, value: 1 }] };
}

// API FIDEL: replica las 3 reglas medidas en vivo, incluido el 404.
function mount(kind) {
  const store = new Map();
  const urls = [];
  const localStorage = {
    get length() { return store.size; },
    key(i) { return Array.from(store.keys())[i]; },
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); }
  };
  const sandbox = {
    console: { warn() {}, error() {}, info() {}, log() {} },
    localStorage,
    fetch(url) {
      urls.push(String(url));
      const m = String(url).match(/[?&]ids=([^&]+)/);
      const list = m ? decodeURIComponent(m[1]).split(',').map(Number) : [];
      const got = list.filter(id => VALID.has(id));
      const mk = kind === 'ach' ? achRec : rec;
      let status, body;
      if (got.length === 0 && list.length > 0) {
        // REGLA REAL: si no queda NINGUN id valido, NO es 206: es 404.
        status = 404;
        body = JSON.stringify({ text: 'all ids provided are invalid' });
      } else if (got.length === list.length) {
        status = 200;
        body = JSON.stringify(got.map(mk));
      } else {
        status = 206;
        body = JSON.stringify(got.map(mk));
      }
      return Promise.resolve({
        ok: status >= 200 && status < 300, status,
        headers: { get() { return null; } },
        text() { return Promise.resolve(body); }
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
  return { api: sandbox.GW2Api, store, urls };
}

(async function main() {
  // 10 validos con 1 invalido intercalado al principio: es el caso que el
  // fix del 206 pretendia arreglar.
  const asked = [11, 2, 3, 4, 6, 7, 8, 9, 10, 1];

  console.log('[1] BUG CRITICO — el 404 del reintento NO puede tirar los ids validos');
  const m1 = mount('items');
  let r1 = null, err1 = null;
  try { r1 = await m1.api.getItemsMany(asked); }
  catch (e) { err1 = e; }
  ok(err1 === null, 'getItemsMany NO rechaza (error: ' + (err1 && err1.message) + ')');
  eq(r1 === null ? null : r1.length, REAL.length,
     'los ' + REAL.length + ' ids validos llegan TODOS pese al invalido intercalado');
  ok(m1.urls.length === 2, 'hizo el reintento (requests: ' + m1.urls.length + ')');

  console.log('\n[2] el resultado valido queda cacheado (el proximo render no repite)');
  const m2 = mount('items');
  await m2.api.getItemsMany(asked);
  const r2 = await m2.api.getItemsMany(asked);
  eq(r2.length, REAL.length, 'la 2a llamada devuelve lo mismo desde la cache');
  // El id INVALIDO no se cachea (no existe), asi que la 2a llamada vuelve a
  // pedir SOLO ese. Lo que no puede pasar es re-preguntar los 9 validos.
  const lastUrls = m2.urls.slice(2);
  ok(lastUrls.length <= 1, 'la 2a llamada no re-pregunta los validos (requests extra: ' + lastUrls.length + ')');
  ok(lastUrls.every(u => !u.includes('2,3')), 'los ids validos no se vuelven a pedir');

  console.log('\n[3] el reintento NO degrada el resultado cuando no aporta nada');
  const m3 = mount('items');
  const r3 = await m3.api.getItemsMany(asked);
  eq(r3.length, REAL.length, 'los validos siguen llegando');
  ok(m3.urls.length <= 2, 'no insiste mas de un reintento (requests: ' + m3.urls.length + ')');

  console.log('\n[4] getAchievementsMeta NO puede rechazar (no tiene catch: tumba la vista)');
  const m4 = mount('ach');
  let err4 = null, r4 = null;
  // OJO: getAchievementsMeta(ids) toma ids ESCALARES, no objetos. Pasarle
  // objetos produce `ids=[object Object],...` en la URL, que el mock (y la
  // API real) no tienen. El primer intento de este testfallo por eso y
  // casi se atribuyo al codigo.
  try { r4 = await m4.api.getAchievementsMeta(REAL); }
  catch (e) { err4 = e; }
  ok(err4 === null, 'getAchievementsMeta NO rechaza (error: ' + (err4 && err4.message) + ')');
  ok(r4 && typeof r4 === 'object', 'devuelve el bag');

  console.log('\n[5] PARIDAD CON PRE-FIX: un shard con 5 invalidos no puede devolver 0 de 10');
  const m5 = mount('items');
  const r5 = await m5.api.getItemsMany(REAL.concat(INVALID));
  eq(r5.length, REAL.length, '10 pedidos, 5 inexistentes -> llegan los 10 validos, no 0');

  console.log('\n[6] caso 404 total (TODOS los ids invalidos) sigue degradando bien');
  const m6 = mount('items');
  const r6 = await m6.api.getItemsMany(INVALID);
  eq(r6.length, 0, 'si no hay ni un id valido, [] es la respuesta correcta');
  ok(m6.urls.length <= 2, 'sin loop de reintentos (requests: ' + m6.urls.length + ')');

  console.log('\n' + '='.repeat(62));
  console.log('pass: ' + pass + ' | FAIL: ' + fail);
  console.log('='.repeat(62));
  if (fail > 0) process.exit(1);
})().catch(e => { console.error('ERROR FATAL: ' + e.stack); process.exit(2); });
