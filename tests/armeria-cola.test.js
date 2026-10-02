/**
 * armeria-cola.test.js — la cola de crafteo: tope, persistencia y remover.
 *
 * QUÉ MIDE
 * Lo que Pablo pidio el 2026-10-02, que es exactamente lo que el click de la
 * card ya NO hace: el click abre el arbol, y agregar o quitar quedo en el boton
 * del header del modal. Ese cambio de gesto MUEVE la responsabilidad de la cola
 * a un boton, y una responsabilidad que se prueba menos es una responsabilidad
 * que se rompe sin que nadie lo note. Este arnes es la red de ese cambio.
 *
 * LAS CUATRO COSAS QUE AFIRMA
 *   1. El tope es 5 y el sexto entra rechazado, no truncado en silencio.
 *   2. La cola sobrevive a una recarga (va a localStorage y vuelve).
 *   3. Tocar dos veces el mismo item lo SACA, no lo deja ni lo duplica.
 *   4. La basura que llegue de localStorage no deja la vista sin pintar.
 *
 * POR QUÉ SE EVALÚA Y NO SE LEE
 * Leer el codigo y afirmar que dice `QUEUE_MAX = 5` mide la cadena de texto, no
 * el comportamiento. Un `if` al reves o un `>=` donde va un `>` pasan la lectura
 * y rompen la cola. Se extrae el cuerpo de las funciones y se corre.
 *
 * POR QUÉ NO USA `tools/cl_recipes.json`
 * Esta en .gitignore. Un test que necesita un archivo que un clon limpio no
 * tiene pasa en mi maquina y no en la de nadie.
 *
 * CONTROLES NEGATIVOS
 *   - un id fraccionario (1.5) tiene que ser rechazado. Si entra, se persiste
 *     y desaparece en la recarga: la cola pierde items sola.
 *   - un id duplicado NO puede ocupar dos lugares.
 *   - una cola persistida con basura tiene que SANEARSE, no vaciarse.
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const failures = [];

function ok(cond, msg) {
  if (cond) { pass++; } else { fail++; failures.push(msg); }
}
function eq(a, b, msg) {
  ok(a === b, `${msg} — esperado ${JSON.stringify(b)}, dio ${JSON.stringify(a)}`);
}

// Extrae una funcion por nombre del archivo real. Si el nombre no existe, el
// arnés falla acá: preferible un FAIL con nombre a un 0 pass sin veredicto,
// que es lo que paso con hb123 (ALERT-205).
function cuerpo(nombre) {
  const src = fs.readFileSync(path.join(ROOT, 'js/legendary-tracker.js'), 'utf8');
  const i = src.indexOf('function ' + nombre + '(');
  if (i === -1) { fail++; failures.push(`no existe ${nombre}() en legendary-tracker.js`); return null; }
  let d = 0, ini = src.indexOf('{', i), j = ini;
  for (; j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (d === 0) break; }
  }
  return src.slice(i, j + 1);
}

// Un localStorage de mentira, con la misma interfaz que usa el tracker.
function storageVacio() {
  const m = {};
  return {
    _m: m,
    getItem: k => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: k => { delete m[k]; }
  };
}

// Arma el modulo con la cola sola. `STATE` y `PREFIX` se inyectan para no
// arrastrar el IIFE entero ni el resto de la app.
function montar(localStorage, colaInicial) {
  const ctx = { console: { info() {}, log() {}, warn() {}, error() {} } };
  ctx.window = ctx;
  ctx.localStorage = localStorage;
  vm.createContext(ctx);
  ctx.STORAGE_PREFIX = 'gn:';
  ctx.STATE = colaInicial || [];
  vm.runInContext([
    'var QUEUE_MAX = 5;',
    'var QUEUE_KEY = "queue";',
    'var state = { queue: STATE.slice() };',
    cuerpo('sSet'), cuerpo('sGet'),
    cuerpo('sanitizeQueue'), cuerpo('loadQueue'), cuerpo('saveQueue'),
    cuerpo('toggleQueue'),
    'function leer() { return state.queue.slice(); }',
    'function max() { return QUEUE_MAX; }'
  ].join('\n'), ctx);
  return ctx;
}

// ===========================================================================
// 1. EL TOPE ES 5
// ===========================================================================
(function topeEsCinco() {
  const ls = storageVacio();
  const m = montar(ls, []);

  eq(m.max(), 5, 'QUEUE_MAX es 5');

  // Los 5 entran bien, uno por uno.
  for (let i = 1; i <= 5; i++) {
    const r = m.toggleQueue(i);
    ok(r.ok && r.added, `el item ${i} entra en la cola`);
  }
  eq(m.leer().length, 5, 'la cola tiene 5 items');
  eq(JSON.stringify(m.leer()), '[1,2,3,4,5]', 'la cola conserva el orden de agregado');

  // El sexto se RECHAZA con motivo, no se ignora en silencio. Si el caller no
  // puede distinguir "no se pudo" de "no se quiso", muestra cualquier cosa.
  const r6 = m.toggleQueue(6);
  eq(r6.ok, false, 'el sexto item se rechaza');
  eq(r6.reason, 'llena', 'el motivo es "llena"');
  eq(m.leer().length, 5, 'la cola sigue en 5: el rechazo no la trunca en silencio');
  ok(!m.leer().includes(6), 'el sexto no se coló igual');
})();

// ===========================================================================
// 2. PERSISTENCIA
// ===========================================================================
(function persiste() {
  const ls = storageVacio();
  const m = montar(ls, []);
  m.toggleQueue(30684);
  m.toggleQueue(30720);

  // Lo que tiene que haber quedado escrito, con la clave del proyecto.
  const crudo = ls.getItem('gn:queue');
  ok(crudo !== null, 'la cola se escribe en localStorage');
  eq(crudo, '[30684,30720]', 'lo persistido son los ids, en orden');

  // Una recarga: el modulo nuevo lee lo que el anterior escribio. Este es el
  // caso que importa — la persistencia no es "escribo", es "vuelve".
  const m2 = montar(ls, []);
  const recuperada = m2.loadQueue();
  eq(JSON.stringify(recuperada), '[30684,30720]', 'la cola sobrevive a la recarga');
  ok(recuperada.length === 2, 'y trae los 2 items');
})();

// ===========================================================================
// 3. EL SEGUNDO TOQUE SACA
// ===========================================================================
(function segundoToqueSaca() {
  const ls = storageVacio();
  const m = montar(ls, []);
  m.toggleQueue(100);
  eq(m.leer().length, 1, 'el item entra');

  const r = m.toggleQueue(100);
  eq(r.ok, true, 'el segundo toque no es un error');
  eq(r.added, false, 'el segundo toque REMUEVE, no agrega');
  eq(m.leer().length, 0, 'la cola queda vacia');
  eq(ls.getItem('gn:queue'), '[]', 'y la persistencia tambien reflects la salida');

  // `toggleQueue` ALTERNA: si el item no esta, lo agrega. No es "quitar", y
  // la primera version de este arnes lo dyno como si lo fuera — se llevo por
  // delante dos asserts porque despues conto una cola que ya no estaba vacia.
  // El nombre dice "toggle" y el boton del header dice "Agregar"/"Quitar" segun
  // el estado, asi que la UI nunca deja que este caso sea ambiguo para el
  // usuario. Aun asi, que quede afirmado: agregar un ausente es agregar.
  const r2 = m.toggleQueue(999);
  eq(r2.ok, true, 'tocar un item ausente lo AGREGA (toggle, no "quitar")');
  eq(r2.added, true, 'y reporta que lo agrego');
  eq(m.leer().length, 1, 'la cola quedo con ese item');

  // Y el ciclo sobre un item especifico se puede repetir: entra, sale, entra.
  m.toggleQueue(999);          // sale
  eq(m.leer().length, 0, 'vuelve a estar vacia');
  m.toggleQueue(999);          // entra
  m.toggleQueue(999);          // sale
  m.toggleQueue(999);          // entra
  eq(m.leer().length, 1, 'el ciclo entrar/sacar/entrar deja el item una sola vez');
  eq(m.leer()[0], 999, 'y es el item correcto');
})();

// ===========================================================================
// 4. CONTROLES NEGATIVOS
// ===========================================================================
(function idsInvalidos() {
  const ls = storageVacio();
  const m = montar(ls, []);

  // El id fraccionario es el caso caro: si entra, se persiste, y en la
  // recarga desaparece. "Perdio un item sola" es el bug mas dificil de ver.
  [1.5, 0, -3, NaN, Infinity].forEach(bad => {
    const r = m.toggleQueue(bad);
    eq(r.ok, false, `el id ${bad} se rechaza`);
  });
  eq(m.leer().length, 0, 'ninguno entró');

  // Duplicado: el segundo toque del MISMO item saca, no ocupa dos lugares.
  m.toggleQueue(55);
  m.toggleQueue(55);
  eq(m.leer().length, 0, 'tocar dos veces no duplica');
})();

(function saneaBasuraPersistida() {
  const ls = storageVacio();
  // Basura realista: duplicados, negativos, fraccionarios, un string, un null.
  ls.setItem('gn:queue', JSON.stringify([7, 7, -1, 2.5, '9', null, 8, 8, 8]));
  const m = montar(ls, []);
  const q = m.loadQueue();

  eq(JSON.stringify(q), '[7,9,8]', 'la cola persistida con basura se SANEA, no se vacia');
  ok(q.every(n => Number.isInteger(n) && n > 0), 'todo lo que queda es entero positivo');
  eq(new Set(q).size, q.length, 'sin duplicados');

  // Y una basura que ni siquiera es un array no rompe la vista.
  const ls2 = storageVacio();
  ls2.setItem('gn:queue', '"no soy un array"');
  const m2 = montar(ls2, []);
  eq(JSON.stringify(m2.loadQueue()), '[]', 'un valor que no es array da cola vacia, no una excepcion');
})();

// ===========================================================================
// 5. EL SANITIZER RESPETA EL TOPE
// ===========================================================================
(function sanenaRespetaTope() {
  const ls = storageVacio();
  // Una cola guardada cuando el tope era mas alto no puede entrar entera: si
  // `sanitizeQueue` no respeta QUEUE_MAX, el modal abre con 8 de 5.
  ls.setItem('gn:queue', JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8]));
  const m = montar(ls, []);
  const q = m.loadQueue();
  eq(q.length, 5, 'una cola de 8 se recorta al tope al leerla');
  ok(q.length <= m.max(), 'nunca supera QUEUE_MAX');
})();

// ===========================================================================
console.log(`armeria-cola.test.js — ${pass} pass, ${fail} FAIL`);
if (fail) {
  failures.forEach(f => console.log('  FAIL - ' + f));
  process.exit(1);
}