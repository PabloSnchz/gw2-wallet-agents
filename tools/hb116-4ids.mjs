// 4 ids de hb69 no estan en el resultado: alert-84, alert-48, feat-idea50-boton-cache, t5.
// Hay que ver el CONTEXTO en hb69 y decidir si main los borro a proposito
// (porque se resolvieron) o si mi union los perderia.
import { execSync } from 'node:child_process';

const raw = (r) => execSync('git show ' + r, { maxBuffer: 1e8 }).toString('utf8');
const T = (l) => l.replace(/\r$/, '');

const secHB69 = raw('origin/po/hb69-dashboard:DASHBOARD_PO_IDEAS.md');
const secMain = raw('origin/main:DASHBOARD_PO_IDEAS.md');

for (const id of ['ALERT-84', 'ALERT-48', 'feat-idea50-boton-cache', 'T5']) {
  console.log('\n############ ' + id);
  const en = (txt, n) => txt.split('\n').map(T)
    .map((l, i) => [i + 1, l])
    .filter(([, l]) => l.toLowerCase().includes(n.toLowerCase()));
  console.log('-- hb69 (' + en(secHB69, id).length + ' lineas):');
  en(secHB69, id).slice(0, 3).forEach(([i, l]) => console.log('   ' + i + ': ' + l.slice(0, 155)));
  console.log('-- main (' + en(secMain, id).length + ' lineas):');
  en(secMain, id).slice(0, 3).forEach(([i, l]) => console.log('   ' + i + ': ' + l.slice(0, 155)));
}

// CONTROL NEGATIVO: un id que no existe debe dar 0 en ambos.
for (const id of ['ALERT-9999', 'IDEA 7777']) {
  const a = secHB69.toLowerCase().includes(id.toLowerCase());
  const b = secMain.toLowerCase().includes(id.toLowerCase());
  console.log('\nCONTROL negativo ' + id + ': hb69=' + a + ' main=' + b + ' (deben ser false false)');
}
