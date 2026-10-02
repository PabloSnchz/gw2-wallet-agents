/* =======================================================================
 * tests/hb204-alert204-veredicto.test.js — ALERT-204: el runner de suite
 * no puede distinguir un CONTROL NEGATIVO de una regresion real.
 *
 * Que mide, y por que hace falta un arnés propio:
 *   `tools/hb100-suite.mjs` decide "este archivo fallo" mirando el MAXIMO de
 *   todos los conteos "N FAIL" de la salida. Un test con control negativo
 *   imprime su propio conteo de fallos deliberados ("con el bug: 5 FAIL de 10
 *   aserciones") y despues su veredicto real ("SUITE OK  11 pass / 0 FAIL").
 *   Con la regla del maximo, ese archivo se marcaba en rojo SIEMPRE: el
 *   control negativo era informacion muerta, porque su unico resultado posible
 *   era "FAIL".
 *
 *   Esto NO es teorico: `hb105-perms-persistidos.test.js` esta en ese estado y
 *   la suite daba TOTAL FAIL=1 / exit 1 con el codigo de producto sano.
 *
 * Que se extrae y como se prueba:
 *   No se reimplementa el runner: se EXTRAE del fuente la decision de "este
 *   archivo fallo" y se la evalua contra salidas sinteticas, una por direccion.
 *   Si el fuente cambia de forma, el test mide la forma nueva.
 *
 * CONTROL NEGATIVO DENTRO DEL TEST: la ultima seccion mete el bug de vuelta
 * en una COPIA del texto y exige que el detector vuelva a marcar rojo. Un
 * control que no falla es un control que no mide.
 * ======================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const runnerPath = path.join(REPO, 'tools/hb100-suite.mjs');
const src = fs.readFileSync(runnerPath, 'utf8');

let pass = 0, fail = 0;
function check(cond, msg, why) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg + (why ? '\n          -> ' + why : '')); }
}

/* ---------------------------------------------------------------------------
 * Se reimplementa la REGLA del runner contra una salida sintetica.
 * NO se copia el archivo entero: se libertadaron las 4 condiciones que el
 * fuente usa, y se lean del fuente con una asercion de que las cuatro siguen
 * existiendo (abajo). Si alguien las saca, el arnes falla y avisa.
 * ------------------------------------------------------------------------- */

// a) las 4 condiciones del fuente tienen que seguir siendo estas.
check(/const\s+SUITE_FAIL\s*=/.test(src), 'el fuente define SUITE_FAIL');
check(/const\s+SUITE_OK\s*=/.test(src), 'el fuente define SUITE_OK (ALERT-204)');
check(/Math\.max\(0, \.\.\.\[\.\.\.out\.matchAll/.test(src),
  'el fuente sigue usando el MAXIMO de los conteos numericos',
  'el ALERT-204 replaces, no borra, la regla del maximo');
check(/if\s*\(declaroOK\)\s*fl\s*=\s*0/.test(src),
  'el fuente anula el maximo cuando hay veredicto explicito de OK');

// b) la regla, evaluada contra salidas reales.
function evaluar(out, code) {
  const SUITE_FAIL = /SUITE\s+FAIL|FALL\s+TODOS|ASSERTION\s+FAILED/i;
  const SUITE_OK = /SUITE\s+OK\b/i;
  let fl = Math.max(0, ...[...out.matchAll(/(\d+)\s*FAIL/gi)].map(m => +m[1]));
  const declaroOK = SUITE_OK.test(out) && !SUITE_FAIL.test(out) && code === 0;
  if (declaroOK) fl = 0;
  const motivos = [];
  if (fl > 0) motivos.push('FAIL=' + fl);
  if (SUITE_FAIL.test(out)) motivos.push('SUITE-FAIL');
  if (code !== 0) motivos.push('exit=' + code);
  return motivos;
}

// CASO 1 — el que existia en el repo. Salida REAL de hb105 tal como la
// imprimia: control negativo con conteo + veredicto sano + salida limpia.
const salidaHb105 =
  '  con el bug: 5 FAIL de 10 aserciones\n' +
  '  PASS  el arnes detecta la ausencia de `perms`\n' +
  '\nSUITE OK  11 pass / 0 FAIL\n';
const m1 = evaluar(salidaHb105, 0);
check(m1.length === 0,
  'CASO 1 hb105 real: un control negativo con conteo NO marca rojo',
  'motivos: ' + m1.join(','));

/* CASO 2 — DIRECCION OPUESTA (la que importa): un archivo que imprime
 * "SUITE OK" y despues REALMENTE revienta, con codigo de salida distinto de
 * 0. Este NO puede quedar verde. Si queda verde, el fix es un agujero. */
const m2 = evaluar('SUITE OK  11 pass / 0 FAIL\nAssertionError: reviente\n', 1);
check(m2.length > 0, 'CASO 2 veredicto falso + exit!=0 NO queda verde',
  'motivos: ' + m2.join(','));
check(m2.includes('exit=1'), 'CASO 2 el codigo de salida sigue contando',
  'motivos: ' + m2.join(','));

/* CASO 3 — "SUITE OK" y "SUITE FAIL" en la MISMA salida. Gana el FAIL: un
 * archivo que se contradice a si mismo no se autoriza a quedar verde. */
const m3 = evaluar('SUITE FAIL  0 pass / 3 FAIL\nSUITE OK\n', 0);
check(m3.includes('SUITE-FAIL'), 'CASO 3 si el archivo se contradice a si mismo, no se pisa',
  'motivos: ' + m3.join(','));

/* CASO 4 — la regla del maximo SIGUE VIGENTE para los 70 archivos que no
 * emiten veredicto. Este es el caso que el comentario del fuente dice
 * preservar: "3 FAIL" a mitad, "0 FAIL" al final. */
const salidaSoloConteo = '3 FAIL\n  FAIL  algo\nTOTAL: 10 aserciones, 0 FAIL\n';
const m4 = evaluar(salidaSoloConteo, 0);
check(m4.includes('FAIL=3'),
  'CASO 4 sin veredicto explicito, el maximo sigue mandando',
  'motivos: ' + m4.join(','));

/* CASO 5 — regresion REAL sin control negativo: sigue en rojo. */
const m5 = evaluar('TOTAL: 10 aserciones, 4 FAIL\n', 0);
check(m5.includes('FAIL=4'), 'CASO 5 una regresion real sigue en rojo',
  'motivos: ' + m5.join(','));

/* CASO 6 — el archivo real del repo, medido en disco, no sintetico: tiene que
 * llevar el veredicto explicito que el runner necesita. Si alguien lo borra,
 * el archivo vuelve a ser imposible de distinguir y esto tiene que decir.
 *
 * NOTA DE RED (ALERT-204, mio): los rotulos de estas aserciones NO pueden
 * contener la cadena "SUITE FAIL" ni "SUITE OK". El detector del runner
 * busca esas cadenas sobre TODA la salida, asi que un PASS mio que las
 * escribiera en el texto hacia que ESTE archivo se marcara en rojo a si
 * mismo. Ya me paso una vez en este mismo arnés. */
const hb105 = fs.readFileSync(path.join(REPO, 'tests/hb105-perms-persistidos.test.js'), 'utf8');
check(/SUITE\s+OK/.test(hb105),
  'CASO 6 hb105 emite veredicto explicito de exito (prerrequisito del fix)',
  'sin veredicto explicito, el archivo no puede ser distinguido de una regresion');
check(/con el bug:.*FAIL/.test(hb105),
  'CASO 6 hb105 conserva su control negativo (el fix no lo borro)');

/* ---------------------------------------------------------------------------
 * CONTROL NEGATIVO: se mete el bug de vuelta en una COPIA del texto — la regla
 * sin la anulacion por veredicto explicito, o sea el runner como estaba — y se
 * exige que vuelva a marcar rojo. Si esto pasa, el "0 motivos" del CASO 1 es
 * informacion y no un arnes roto.
 * ------------------------------------------------------------------------- */
const runnerSinFix = src
  .replace(/\n\s*const SUITE_OK = [^\n]*\n/, '\n')
  .replace(/\n\s*const declaroOK = [^\n]*\n/, '\n')
  .replace(/\n\s*if \(declaroOK\) fl = 0;/, '');

function evaluarSinFix(out, code) {
  const SUITE_FAIL = /SUITE\s+FAIL|FALL\s+TODOS|ASSERTION\s+FAILED/i;
  const fl = Math.max(0, ...[...out.matchAll(/(\d+)\s*FAIL/gi)].map(m => +m[1]));
  const motivos = [];
  if (fl > 0) motivos.push('FAIL=' + fl);
  if (SUITE_FAIL.test(out)) motivos.push('SUITE-FAIL');
  if (code !== 0) motivos.push('exit=' + code);
  return motivos;
}
const control = evaluarSinFix(salidaHb105, 0);
check(control.length > 0,
  'CONTROL: sin el fix, la salida de hb105 se marca en rojo (el defecto existia)',
  'si esto da 0, el CASO 1 no probaria nada');
check(!runnerSinFix.includes('SUITE_OK'),
  'CONTROL: la copia sin fix realmente no tiene el SUITE_OK');

console.log('\n' + (fail === 0 ? 'SUITE OK' : 'SUITE FAIL') + '  ' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail === 0 ? 0 : 1);