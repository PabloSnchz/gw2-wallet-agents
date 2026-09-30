/*!
 * tools/run-suite.js — corre TODOS los tests de tests/ y totaliza.
 *
 * Los tests del repo usan CUATRO formatos de salida distintos, asi que el total
 * se saca de la linea de resumen de cada archivo con 4 regex, y no de un grep
 * comun. Los 4:
 *   1. "N aserciones / M FAIL"      (mayoria)
 *   2. "N pass / M FAIL"            y su variante "OK / FAIL"
 *   3. "TOTAL: N pass, M FAIL"
 *   4. "pass: N | FAIL: M"          <-- el que faltaba (ALERT-78/P4)
 *
 * El 4º formato lo usan 7 de los 27 archivos. Sin el, el total SALIA BIEN pero
 * CONTABA 20 ARCHIVOS: el numero de la linea de resumen era el de los 20, y el
 * "(27 archivos)" decia una verdad y el total otra. Dos fuentes de verdad para
 * el mismo numero es la deuda; por eso el 4º regex se agrego ACÁ y no se
 * resolvio con un segundo script que cuenta aparte.
 *
 * Ejecutar: node tools/run-suite.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const dir = path.join(ROOT, 'tests');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.test.js')).sort();

const RE = [
  /(\d+)\s+aserciones?,\s*(\d+)\s+FAIL/i,
  /(\d+)\s+(?:pass|PASS|OK)\s*[/,]\s*(\d+)\s+(?:FAIL|fail)/,
  /(\d+)\s+(?:pass|PASS|OK)\s*,\s*(\d+)\s+(?:FAIL|fail)/i,
  // 4º formato: "pass: 13 | FAIL: 0"
  /pass:\s*(\d+)\s*\|\s*FAIL:\s*(\d+)/i
];

let totalPass = 0, totalFail = 0, bad = [], parsed = 0;
for (const f of files) {
  let out = '';
  try {
    out = execFileSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8', cwd: ROOT });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
  }
  let p = null, q = null;
  for (const re of RE) {
    const m = out.match(re);
    if (m) { p = +m[1]; q = +m[2]; break; }
  }
  if (p === null) { bad.push(f); console.log('?????  ' + f + '  (sin linea de resumen reconocible)'); continue; }
  parsed++;
  totalPass += p; totalFail += q;
  console.log((q ? 'FAIL  ' : 'ok    ') + f.padEnd(48) + p + ' / ' + q);
}
console.log('─'.repeat(60));
// El alcance va en la linea: un total sin alcance declarado no es un dato
// (ALERT-78). Los 2 numeros son del MISMO conjunto, asi que no pueden divergir.
console.log('  TOTAL: ' + totalPass + ' aserciones / ' + totalFail + ' FAIL  (' +
  parsed + ' de ' + files.length + ' archivos, alcance completo)');
if (bad.length) console.log('  sin resumen: ' + bad.join(', '));
process.exit(totalFail || bad.length ? 1 : 0);
