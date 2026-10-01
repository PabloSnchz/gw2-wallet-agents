// hb94-gate2.mjs - con el fix SIMULADO, muestra que aserto queda en rojo y por que.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const CSS = 'css/theme-polish.css';
const original = readFileSync(CSS, 'utf8');
try {
  writeFileSync(CSS, original.replace(
    /(\* \{[^}]*?)animation: none !important;/,
    '$1animation-duration: .001ms !important;'), 'utf8');
  let out = '';
  try { out = execFileSync(process.execPath, ['tests/hb94-raid-wing-card.test.js'], { encoding: 'utf8' }); }
  catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  console.log(out.split(/\r?\n/).filter(l => /FAIL|PENDIENTE|TOTAL|^\[/.test(l)).join('\n'));
} finally {
  writeFileSync(CSS, original, 'utf8');
  console.log('--- theme-polish.css restaurado ---');
}
