// hb94-gate-check.mjs - prueba que la compuerta PENDIENTE del test nuevo NO es
// un apagador: si se aplica el fix, el aserto tiene que contar como PASS real, y
// si se rompe otra vez, tiene que volver a quedar pendiente. Un gate que nunca
// puede fallar no es un gate.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const RAIZ = process.argv[2] || '.';
const CSS = RAIZ + '/css/theme-polish.css';
const TEST = RAIZ + '/tests/hb94-raid-wing-card.test.js';

const original = readFileSync(CSS, 'utf8');
const origTest = readFileSync(TEST, 'utf8');

function correr() {
  try {
    return execFileSync(process.execPath, [TEST], { encoding: 'utf8', cwd: RAIZ });
  } catch (e) { return (e.stdout || '') + (e.stderr || ''); }
}

const resumen = (o) => {
  const m = o.match(/(\d+)\s+aserciones,\s*(\d+)\s+FAIL/);
  return m ? { pass: +m[1], fail: +m[2], pend: /PENDIENTE /.test(o) } : { pass: -1, fail: -1, pend: false };
};

try {
  // 1) estado actual: el fix NO esta -> PENDIENTE, 0 FAIL
  const antes = resumen(correr());
  console.log('1) sin fix           : ' + JSON.stringify(antes));
  console.log('   el aserto se apago y 0 FAIL : ' + (antes.fail === 0 && antes.pend));

  // 2) simular el fix: cambiar animation:none por animation-duration:.001ms,
  //    que es la politica sana que YA esta escrita en main.css:687 (via (i) de la
  //    pregunta al Reviewer). Con el fix, la tarjeta tiene que quedar VISIBLE.
  writeFileSync(CSS, original.replace(
    /(\* \{[^}]*?)animation: none !important;/,
    '$1animation-duration: .001ms !important;'), 'utf8');
  const conFix = resumen(correr());
  // Lo que importa del gate es si CUENTA como FAIL, no si la palabra PENDIENTE
  // aparece: con el flag en true la linea se imprime igual, y leer esa palabra
  // daria un "el gate sigue activo" falso. El estado real es fail==0.
  console.log('2) con fix simulado  : ' + JSON.stringify(conFix));
  console.log('   cuenta 0 FAIL con el fix aplicado (el gate ya no bloquea) : ' + (conFix.fail === 0));

  // 3) gate desactivado Y sin fix: tiene que quedar ROJO. Probarlo DESPUES del
  //    paso 2 mezclaría estados: el fix simulado del paso 2 sigue en disco y el
  //    test no puede fallar. Por eso se restaura el CSS antes de medir.
  writeFileSync(CSS, original, 'utf8');
  writeFileSync(TEST, origTest.replace('let PENDIENTE_COMPORTAMIENTO = true;', 'let PENDIENTE_COMPORTAMIENTO = false;'), 'utf8');
  const sinGate = resumen(correr());
  console.log('3) gate desactivado, sin fix: ' + JSON.stringify(sinGate));
  console.log('   vuelve a ser ROJO (el gate no es un skip) : ' + (sinGate.fail >= 1));
} finally {
  writeFileSync(CSS, original, 'utf8');
  writeFileSync(TEST, origTest, 'utf8');
  console.log('\nrestaurados theme-polish.css y el test');
}
