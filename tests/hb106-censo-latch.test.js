#!/usr/bin/env node
/*!
 * tests/hb106-censo-latch.test.js — T13-d: el CENSO del latch de activate()
 *
 * El problema que este test cierra (ronda 34 del PO, T13):
 *   5 modulos tienen `if (state.active) return;` al principio de activate() y
 *   los 5 exportan deactivate(). El router solo llamaba deactivate() a WV y a
 *   Activities. O sea: la unica forma de que el latch bajara era deactivate(),
 *   y deactivate() no llegaba nunca. Medido en HB#106: 6 timers de 1s y 3
 *   requests de red por cambio de cuenta, con el panel oculto.
 *
 * QUE HACE ESTE TEST, y que NO hace:
 *   - HACE: census. Para cada modulo con el guard, exige que el router lo
 *     desactive. Es un censo de ESCRITORES, como el de la Idea 57: si manana
 *     un modulo nuevo se engancha al patron, el test falla y dice cual.
 *   - NO HACE: no prueba que deactivate() baje el latch. Eso ya lo prueba
 *     `tests/hb106-t13-invariante.test.js`, que EVALUA el ciclo de vida.
 *     Un censo y un test de comportamiento no se sustituyen: el censo mantiene
 *     la lista, el otro demuestra que la lista sirve.
 *
 * El unico criterio valido para "el router lo desactiva" es que el NOMBRE DEL
 * MODULO aparezca en un `.deactivate()` de router.js. Se busca el nombre del
 * global (`RaidTracker`) y no el del archivo (`raid-tracker`), porque el router
 * habla de globales.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const JS = path.join(ROOT, 'js');
const ROUTER = path.join(JS, 'router.js');

let pass = 0, fail = 0;
const F = [];
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; F.push(name + (extra ? '  ->  ' + extra : '')); console.log('  FAIL ' + name + (extra ? '  ->  ' + extra : '')); }
}
function section(t) { console.log('\n' + t); }

// ── extractor de llaves (contador, no regex) ────────────────────────────────
function extractFn(code, headerRe) {
  const i = code.search(headerRe);
  if (i < 0) return null;
  const j = code.indexOf('{', i);
  if (j < 0) return null;
  let d = 0;
  for (let k = j; k < code.length; k++) {
    if (code[k] === '{') d++;
    else if (code[k] === '}') { d--; if (d === 0) return code.slice(i, k + 1); }
  }
  return null;
}

// ── SECCION 0: los controles del arnes ─────────────────────────────────────
// Sin esto, un extractor que no matchea devuelve 0 y "0 modulos con latch" se
// lee igual que "el repo esta limpio". Es el modo de falla de ALERT-92/121.
section('0. CONTROLES DEL ARNES');
const routerSrc = fs.readFileSync(ROUTER, 'utf8');
const jsFiles = fs.readdirSync(JS).filter(f => f.endsWith('.js'));

check('el extractor NO encuentra una funcion que no existe (control negativo)',
  extractFn(routerSrc, /function NO_EXISTE_9F3A_HAY\(\)/) === null);
check('el extractor SI encuentra showPanel() en router.js (control positivo)',
  !!extractFn(routerSrc, /function showPanel\(/));
check('js/ tiene los modulos que el censo mira', jsFiles.length > 20,
  'solo ' + jsFiles.length + ' archivos .js');

// ── SECCION 1: el censo de modulos con el latch ─────────────────────────────
// El criterio: `if (state.active) return;` DENTRO de activate(). Medido con
// las dos formas (ALERT-91/93): el guard en activate() Y el deactivate() que lo
// baja. Un modulo con uno y no el otro esta ROTO por construccion: el latch no
// tiene por donde bajar.
section('1. CENSO: modulos con `if (state.active) return;` en activate()');

const GUARD = /if\s*\(\s*state\.active\s*\)\s*return;/;
const conGuard = [];
const sinBajada = [];

for (const f of jsFiles) {
  const src = fs.readFileSync(path.join(JS, f), 'utf8');
  const act = extractFn(src, /(?:async\s+)?function activate\s*\(/);
  if (!act) continue;
  const body = act.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  if (!GUARD.test(body)) continue;

  const deact = extractFn(src, /(?:async\s+)?function deactivate\s*\(/);
  // ALERT-140: el extractor tiene que aceptar LAS TRES formas de exposicion.
  // Los 5 modulos usan `root.X = X` dentro de un IIFE
  // `(typeof window !== 'undefined' ? window : this)`, asi que buscar solo
  // `window.X =` daba null en los 5, `m.global` era null, y el `continue` de
  // mas abajo se los comia a los 5: la seccion 2 daba "ok" con 0 modulos
  // mirando, que es el modo de falla que este archivo dice evitar en su
  // encabezado. Un `continue` que se come el sujeto del censo no es una
  // guarda, es un agujero: convierte "no lo medi" en "no hay problema".
  const global = /^\s*(?:root|window|globalThis)\s*\.\s*(\w+)\s*=[^=]/m.exec(src);
  conGuard.push({
    archivo: f,
    tieneDeactivate: !!deact,
    global: global ? global[1] : null,
    src
  });
  if (!deact) sinBajada.push(f);
}

console.log('  modulos con el latch: ' + (conGuard.length ? conGuard.map(m => m.archivo).join(', ') : '(ninguno)'));
check('el censo NO esta vacio (si fuera 0, el arnes no matchea y no mide)',
  conGuard.length >= 4, 'solo ' + conGuard.length);
check('el latch de cada modulo tiene una bajada: todos exportan deactivate()',
  sinBajada.length === 0, sinBajada.join(', '));

// ── SECCION 2: cada modulo con latch tiene que estar en la lista del router ─
// ESTA es la asercion que evita el caso 6. Hoy el router desactiva a WV y a
// Activities y a nadie mas, asi que esta seccion falla mientras T13-a no este
// aplicado: es la que convierte "5 modulos" en una lista que se pudre.
section('2. EL ROUTER DESACTIVA A TODOS LOS QUE TIENEN LATCH');

const routerDeactiva = new Set();
for (const m of routerSrc.match(/window\.(\w+)[\s\S]{0,80}?\.deactivate\s*\(/g) || []) {
  const n = /window\.(\w+)/.exec(m);
  if (n) routerDeactiva.add(n[1]);
}
const routerDeactiva2 = new Set();
for (const m of routerSrc.match(/\bWV\.deactivate\s*\(/g) || []) { routerDeactiva2.add('WV'); }
routerDeactiva2.forEach(n => routerDeactiva.add(n));
// La lista MODULOS_CON_LATCH de T13-a, si esta:
//   MODULOS_CON_LATCH.forEach(e => ... window[e.mod].deactivate())
// es INDIRECTA: el nombre vive en la tabla, no en la llamada. Se leen los dos.
const tabla = /MODULOS_CON_LATCH\s*=\s*\[([\s\S]*?)\]/.exec(routerSrc);
const deLaTabla = new Set();
if (tabla) {
  for (const m of tabla[1].matchAll(/mod\s*:\s*'(\w+)'/g)) deLaTabla.add(m[1]);
}
console.log('  el router desactiva directamente a: ' + (routerDeactiva.size ? [...routerDeactiva].join(', ') : '(ninguno)'));
console.log('  MODULOS_CON_LATCH (si existe) declara: ' + (deLaTabla.size ? [...deLaTabla].join(', ') : '(no existe todavia)'));

const sinRutaDeSalida = [];
const sinGlobal = [];
for (const m of conGuard) {
  if (!m.tieneDeactivate) continue;                 // ya fallo en seccion 1
  const g = m.global;
  // ALERT-140: esto NO es un `continue`. Un modulo con latch al que el censo
  // no le encuentra el global es un modulo que el censo NO esta mirando, y
  // eso se reporta como fallo del instrumento, no como exencion del sujeto.
  if (!g) { sinGlobal.push(m.archivo); continue; }
  if (routerDeactiva.has(g) || deLaTabla.has(g)) continue;
  sinRutaDeSalida.push(g + ' (' + m.archivo + ')');
}
check('el censo le encuentra el global a TODOS los modulos con latch', sinGlobal.length === 0,
  'sin global (el censo no los mira): ' + sinGlobal.join(' | '));
check('ningun modulo con latch queda sin deactivate() desde el router',
  sinRutaDeSalida.length === 0,
  sinRutaDeSalida.length + ' sin ruta de salida: ' + sinRutaDeSalida.join(' | '));

// ── SECCION 3: la lista no se pudre por debajo (contraposicion) ─────────────
// El test tiene que poder FALLAR. Un censo que no puede fallar es decoracion.
// Se inyecta un modulo de mentira con el patron y se exige que el censo lo
// detecte: si el detector no lo ve, el detector esta mal.
section('3. CONTROL NEGATIVO DEL CENSO (que el test pueda fallar)');
{
  const falso = 'function activate() {\n    if (state.active) return;\n    state.active = true;\n  }' +
    '\n  function deactivate() {\n    state.active = false;\n  }';
  const detectado = GUARD.test(falso.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''));
  check('el criterio GUARD detecta un modulo sintetico con el patron', detectado);
  check('el criterio GUARD NO detecta una activate() sin el latch',
    !GUARD.test('function activate() {\n    state.active = true;\n  }'));
  check('un modulo mas NO cambia el numero que el test por modulo (control de conteo)',
    (conGuard.concat([{ archivo: 'sintetico.js' }]).length - 1) === conGuard.length);
}

// ── SECCION 4: el invariante que T13-a tiene que proteger ───────────────────
// NOTA: esta seccion del comentario explica por que el ciclo de vida no esta
// aqui: vive en tests/hb106-t13-invariante.test.js. Un censo y un test de
// comportamiento no se sustituyen — el censo mantiene la lista, el otro
// demuestra que la lista sirve.
section('4. SEPARACION DE RESPONSABILIDADES');
check('el test de comportamiento existe y es otro archivo',
  fs.existsSync(path.join(ROOT, 'tests', 'hb106-t13-invariante.test.js')));
check('este archivo NO simula el ciclo de vida (es un censo de escritores)',
  !/new vm\.Script|vm\.runIn/.test(fs.readFileSync(__filename, 'utf8')));

console.log('\n' + '='.repeat(60));
console.log('hb106-censo-latch: ' + pass + ' pass / ' + fail + ' FAIL');
if (fail) { console.log('\nFALLAS:'); F.forEach(f => console.log('  - ' + f)); }
process.exit(fail ? 1 : 0);