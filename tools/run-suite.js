/*!
 * tools/run-suite.js — corre TODOS los tests de tests/ y totaliza.
 *
 * Los tests del repo usan tres formatos de salida distintos ("PASS/FAIL",
 * "OK/FAIL", "aserciones, N FAIL"), asi que el total se saca de la linea de
 * resumen de cada archivo con 3 regex, y no de un grep comun.
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
  /(\d+)\s+(?:pass|PASS|OK)\s*,\s*(\d+)\s+(?:FAIL|fail)/i
];

let totalPass = 0, totalFail = 0, bad = [];
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
  totalPass += p; totalFail += q;
  console.log((q ? 'FAIL  ' : 'ok    ') + f.padEnd(48) + p + ' / ' + q);
}
console.log('─'.repeat(60));
console.log('  TOTAL: ' + totalPass + ' aserciones / ' + totalFail + ' FAIL  (' + files.length + ' archivos)');
if (bad.length) console.log('  sin resumen: ' + bad.join(', '));
process.exit(totalFail || bad.length ? 1 : 0);
