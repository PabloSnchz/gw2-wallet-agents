/* tests/idea78-puntos-logros-nan.test.js
 *
 * BUG — "Puntos de logros" de la vista de Personajes muestra `NaN`.
 *
 * ── La forma del bug, que no necesita ningun modulo para entenderse ──────────
 *
 *   characters.js:450
 *     (achData || []).forEach(function(a){ if (a.done) total += a.current; });
 *
 *   El unico campo que se suma es `current`, y se suma SOLO para los logros
 *   `done`. O sea: el codigo exige un campo y filtra por el otro.
 *
 *   Y la GW2 API no manda `current` para un logro completado SIN tiers.
 *   Ejemplo literal de la wiki oficial de /account/achievements:
 *
 *     { "id": 202, "done": true }
 *
 *   `0 + undefined` = NaN. Y el NaN se propaga: una vez que el acumulador es
 *   NaN, TODOS los logros que se sumen despues dan NaN tambien. No se ve "un
 *   numero feo": se ve `NaN` explicito en la fila de la cuenta, en produccion.
 *
 * ── Por que NO lo arregla el fix de la 49G (`ach_acc` compacta) ─────────────
 *
 * Este punto se verifico a proposito, porque la hipotesis mas obvia es
 * "arreglando la cache se arregla esto". Es FALSA, y por una razon que importa:
 *
 *   - El bug esta en la FORMA, no en la RED ni en la cache.
 *   - En el camino RED (primera carga de la sesion, o `nocache`), la API
 *     devuelve `{id, done}` sin `current` y el NaN aparece igual.
 *   - Codificar `cur`/`max` en la entrada compacta SOLO cambia lo que devuelve
 *     la CACHE. El camino RED seguiria dando NaN.
 *
 * O sea: son dos arreglos distintos, en dos archivos distintos, y el segundo no
 * depende del primero. Por eso este bug se abre PROPIO y no como parte de la
 * 49G, para que no se pierda por estar pegado a otra cosa.
 *
 * ── POR QUE ESTE TEST EXTRAE LA SUMA DEL ARCHIVO Y NO LA COPIA ─────────────
 *
 * Una version anterior de este test traia la suma escrita a mano en una funcion
 * `suma()`. Con esa forma, el test daba 5 FAIL contra el archivo SIN el fix
 * (bien) pero seguia dando 5 FAIL DESPUES de aplicar el fix (mal): el helper
 * era una COPIA del bug, no el codigo, y arreglar el archivo no lo tocaba. Un
 * test que no puede pasar nunca no es una red, es un ruido con pretensiones.
 *
 * Ahora la linea real de characters.js se lee del archivo y se evalua. Si
 * alguien reintroduce `+= a.current` a pelo, el FAIL vuelve a aparecer, y si
 * el arreglo se revierte, tambien.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function chk(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  ->  ' + extra : '')); }
}

// ── 1. Extraer la suma REAL del archivo ────────────────────────────────────
const chars = fs.readFileSync(path.join(ROOT, 'js', 'characters.js'), 'utf8');
const lines = chars.split('\n');
const idx = lines.findIndex(l => /if\s*\(\s*a\.done\s*\)\s*total\s*\+=/.test(l));
chk('characters.js declara la suma del total de logros', idx >= 0);
if (idx < 0) { console.log('\nTOTAL: ' + pass + ' pass, ' + fail + ' FAIL'); process.exit(1); }

const lineaReal = lines[idx];
console.log('  (linea evaluada) ' + lineaReal.trim());

// Evaluar la linea real contra un acumulador y una lista reales. Se envuelve en
// una funcion para que `var total` sea local y el `forEach` sea el del archivo.
const fn = new Function(
  'achData',
  'var total = 0;\n' + lineaReal + '\nreturn total;'
);
const suma = (logros) => fn(logros || []);

// ── 2. El CONTRATO: un `current` ausente cuenta 0, nunca rompe el total ─────
chk('la suma convierte el valor (Number(...) o guarda deDefined)',
  /Number\s*\(\s*a\.current\s*\)/.test(lineaReal), lineaReal.trim());

// Forma 1: completado SIN tiers (el caso literal de la wiki oficial).
const r1 = suma([
  { id: 202, done: true },
  { id: 1002, current: 3, max: 10, done: false },
]);
chk('un completado sin `current` NO produce NaN', !Number.isNaN(r1), 'total = ' + r1);
chk('el completado sin `current` cuenta como 0', r1 === 0, 'total = ' + r1);

// Forma 2: uno CON tiers y otro sin, mezclados (el NaN no debe propagarse).
const r2 = suma([
  { id: 1595, done: true, current: 42, max: 42 },
  { id: 202, done: true },
]);
chk('el NaN no se propaga a los logros siguientes', !Number.isNaN(r2), 'total = ' + r2);
chk('con `current` presente el total es el real', r2 === 42, 'total = ' + r2 + ' (esperado 42)');

// Forma 3: la API sin `done` en ninguno.
chk('sin `done` el total es 0', suma([{ id: 1, current: 5, max: 10 }]) === 0);

// Forma 4: la lista vacia (una cuenta sin logros es un caso real).
chk('la lista vacia da 0, no NaN', suma([]) === 0, 'total = ' + suma([]));

// ── 3. La fila que se MUESTRA nunca puede ser NaN ──────────────────────────
const formas = [
  [{ id: 202, done: true }],
  [{ id: 1595, done: true, current: 42, max: 42 }, { id: 202, done: true }],
  [{ id: 1, current: 5, max: 10 }],
  [],
  [{ id: 7, done: true, current: 0, max: 0 }],
];
chk('ninguna forma de la API produce NaN en la fila',
  formas.every(f => !Number.isNaN(suma(f))),
  'alguna forma dio NaN');

// ── 4. El valor real no se altera: el fix no "arregla" summing de mas ───────
chk('un completado repetible (con tiers) sigue sumando su current',
  suma([{ id: 1, done: true, current: 7, max: 7 }]) === 7);
chk('varios completados con tiers suman todos',
  suma([{ id: 1, done: true, current: 7, max: 7 }, { id: 2, done: true, current: 3, max: 3 }]) === 10);
chk('current = 0 en un completado cuenta 0 (no se confunde con ausente)',
  suma([{ id: 1, done: true, current: 0, max: 5 }]) === 0);

console.log('\nTOTAL: ' + pass + ' pass, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
