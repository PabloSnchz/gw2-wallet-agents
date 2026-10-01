import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const main = execSync('git show origin/main:DASHBOARD_PO_IDEAS.md', { maxBuffer: 1e8 }).toString('utf8');
const res = readFileSync('DASHBOARD_PO_IDEAS.md', 'utf8');
const T = (l) => l.replace(/\r$/, '');

const ml = main.split('\n').map(T);
const idxLine = ml.findIndex((l) => /[\u4E00-\u9FFF]/.test(l));
console.log('linea (0-based):', idxLine);

let sec = '(preambulo)';
let secIdx = -1;
for (let i = 0; i < idxLine; i++) {
  if (/^##\s/.test(ml[i])) { sec = ml[i]; secIdx = i; }
}
console.log('seccion:', sec.slice(0, 110));

const rl = res.split('\n').map(T);
const key = sec.replace(/\s+/g, ' ').trim().slice(0, 50);
const ri = rl.findIndex((l) => l.replace(/\s+/g, ' ').trim().startsWith(key.slice(0, 30)));
console.log('encontrada en resultado (linea):', ri);

if (ri >= 0) {
  let end = rl.length;
  for (let i = ri + 1; i < rl.length; i++) if (/^##\s/.test(rl[i])) { end = i; break; }
  const cuerpo = rl.slice(ri, end).join('\n');
  console.log('CJK en esa seccion del resultado:', (cuerpo.match(/[\u4E00-\u9FFF]/g) || []).length);
  console.log('longitud seccion main:', ml.slice(secIdx).length, 'resultado:', end - ri);
  const cjkMain = (ml.slice(secIdx).join('\n').match(/[\u4E00-\u9FFF]/g) || []).length;
  console.log('CJK seccion main:', cjkMain);
  console.log('--- resultado primeras 6 lineas ---');
  rl.slice(ri, ri + 6).forEach((l) => console.log('  ' + l.slice(0, 150)));
}
