// La diferencia de CJK (main=2, resultado=0) NO es de mi resolucion: hay que
// ver de que lado viene. Si hb110 ya traia la version normalizada, entonces mi
// merge llevo la version CORRECTA y el 2 de main era basura en el propio main.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const raw = (r) => execSync('git show ' + r, { maxBuffer: 1e8 }).toString('utf8');
const T = (l) => l.replace(/\r$/, '');
const linea = (s) => s.split('\n').map(T).find((l) => /los 55 wrappers/.test(l)) || '(no encontrado)';

for (const r of ['origin/main:DASHBOARD_PO_IDEAS.md',
                 'origin/po/hb110-dashboard:DASHBOARD_PO_IDEAS.md',
                 'origin/po/hb114-dashboard:DASHBOARD_PO_IDEAS.md']) {
  const s = raw(r);
  const l = linea(s);
  console.log('--- ' + r);
  console.log('   ' + l.slice(0, 90));
  console.log('   CJK:', (l.match(/[\u4E00-\u9FFF]/g) || []).length);
}
const res = readFileSync('DASHBOARD_PO_IDEAS.md', 'utf8');
console.log('--- resultado');
console.log('   ' + linea(res).slice(0, 90));
console.log('   CJK:', (linea(res).match(/[\u4E00-\u9FFF]/g) || []).length);

// CONTROL: la linea del resultado tiene que ser IDENTICA a la del lado que la
// aporto (hb110), no una tercera version.
console.log('resultado === hb110:', linea(res) === linea(raw('origin/po/hb110-dashboard:DASHBOARD_PO_IDEAS.md')));
console.log('resultado === main :', linea(res) === linea(raw('origin/main:DASHBOARD_PO_IDEAS.md')));
