/**
 * HB#96 - control negativo del fix B (T10).
 *
 * Un arnes de cascada se corrige (ACA ERA EL ROTO: modelaba "gana la capa
 * entera" en vez de "gana por propiedad") y lo unico que prueba de que la
 * correccion es real es que el caso que TIENE que fallar, falla.
 *
 * Con el bug de vuelta (la regla `animation:none` en theme-polish.css), el test
 * tiene que dar 2 FAIL: el de la seccion [1] (la regla prohibida reaparece) y el
 * de la seccion [3] (la tarjeta queda invisible). Los dos son legitimos y los dos
 * tienen que estar, porque el fix se compone de las dos cosas.
 *
 * CORRECCION DE PROPIA EXPECTATIVA: anote 1 FAIL antes de mutar y son 2. Lo
 * measured, no lo razone: hay DOS asserts que dependen del fix, no uno. El numero
 * de FAIL esperado se anota DESPUES de medir la primera vez, y a partir de ahi se
 * exige. (El numero que se anota antes y no se corrige es el que hace que un
 * arnes mal calibrado seuche "bien" -- ALERT-124.)
 *
 * Si al mutar diera 0, el arnes diria "visible" con el bug presente y no
 * mediria nada: es el modo de falla de ALERT-124.
 */
import { readFileSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';

const RAIZ = process.cwd();
const CSS = RAIZ + '/css/theme-polish.css';
const TEST = RAIZ + '/tests/hb94-raid-wing-card.test.js';
const original = readFileSync(CSS, 'utf8');
const BUG = `@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}`;

function correr() {
  try {
    return execFileSync(process.execPath, [TEST], { encoding: 'utf8', cwd: RAIZ });
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

const ESPERADOS = 2; // MEDIDO en la primera corrida (2, no el 1 que suponia)
let fallos = 0;

try {
  // --- SIN BUG (estado del repo ahora) ---
  const limpio = correr();
  const okLimpio = /TOTAL: (\d+) aserciones?, (\d+) FAIL/.exec(limpio);
  const failLimpio = okLimpio ? +okLimpio[2] : -1;
  console.log('sin el bug            -> ' + failLimpio + ' FAIL   (esperado 0)');
  if (failLimpio !== 0) { console.log('  FALLA: el fix no deja el test verde'); fallos++; }

  // --- CON BUG (mutacion) ---
  writeFileSync(CSS, original + '\n' + BUG + '\n', 'utf8');
  const roto = correr();
  const m = /TOTAL: (\d+) aserciones?, (\d+) FAIL/.exec(roto);
  const failRoto = m ? +m[2] : -1;
  console.log('con el bug de vuelta  -> ' + failRoto + ' FAIL   (esperado ' + ESPERADOS + ')');
  console.log('  el que falla        -> ' + (/FAIL ([^\n]+)/.exec(roto) || [, 'NINGUNO: el arnes no ve el bug'])[1].slice(0, 70));
  if (failRoto !== ESPERADOS) {
    console.log('  FALLA: el arnes NO discrimina. Da ' + failRoto + ' y se esperaba ' + ESPERADOS +
      '. Un arnes que no ve el bug que vino a encontrar no mide nada (ALERT-124).');
    fallos++;
  }
} finally {
  writeFileSync(CSS, original, 'utf8');
  const restaurado = correr();
  const m2 = /TOTAL: (\d+) aserciones?, (\d+) FAIL/.exec(restaurado);
  console.log('restaurado            -> ' + (m2 ? m2[2] : '?') + ' FAIL');
  if (m2 && +m2[2] !== 0) { console.log('  FALLA: la restauracion no dejo el repo verde'); fallos++; }
}

console.log('\nVEREDICTO: ' + fallos + ' fallo(s).');
process.exit(fallos ? 1 : 0);
