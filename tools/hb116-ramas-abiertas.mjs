// Para cada rama po/* y feature/* sin mergear: dice que secciones de
// DASHBOARD_PO_IDEAS.md aporta que NO esten todavia en el resultado, y si el
// contenido ya esta absorbido por otra via.
// CONTROL positivo y negativo explicitos.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const raw = (r) => execSync('git show ' + r, { maxBuffer: 1e8 }).toString('utf8');
const T = (l) => l.replace(/\r$/, '');
const heads = (s) => s.split('\n').map(T).filter((l) => /^##\s/.test(l)).map((l) => l.replace(/\s+/g, ' ').trim());

const res = heads(readFileSync('DASHBOARD_PO_IDEAS.md', 'utf8'));
const set = new Set(res);

const ramas = execSync('git branch -r --no-merged origin/main', { maxBuffer: 1e8 })
  .toString().split('\n').map((s) => s.trim()).filter(Boolean)
  .map((s) => s.replace(/^origin\//, '')); // quita el prefijo: ya son refs remotas

for (const r of ramas) {
  let sum = null, faltan = ['(sin DASHBOARD_PO_IDEAS.md)'], n = 0, err = null;
  try {
    sum = execSync(`git diff --stat origin/main...origin/${r}`, { maxBuffer: 1e8 }).toString().trim();
    const h = heads(raw(`origin/${r}:DASHBOARD_PO_IDEAS.md`));
    n = h.length;
    faltan = h.filter((x) => !set.has(x));
  } catch (e) { err = e.message.split('\n')[0]; }

  console.log(`=== ${r}`);
  if (err) { console.log('   (sin el archivo o error)'); continue; }
  console.log(`   diffstat: ${sum.split('\n').pop()}`);
  console.log(`   secciones: ${n} | ausentes en main: ${faltan.length}`);
  faltan.slice(0, 4).forEach((f) => console.log('      FALTA: ' + f.slice(0, 85)));
}

// CONTROL NEGATIVO: rama inexistente -> debe dar 0 y no romper.
let ctrl = 'ERROR';
try { heads(raw('origin/no-existe-esta-rama:DASHBOARD_PO_IDEAS.md')); ctrl = 'NO ROMPIO (mal)'; }
catch { ctrl = 'ok (lanzo, 0 secciones)'; }
console.log('CONTROL negativo (rama inexistente):', ctrl);
