// El control positivo de CJK del check anterior estaba MAL SUPUESTO: asumi que
// el archivo tiene CJK. Lo correcto es comparar el resultado CONTRA el lado del
// PO: si ninguno tiene CJK, entonces mi asercion era falsa y no el archivo.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const cjkCount = (s) => (s.match(/[\u4E00-\u9FFF]/g) || []).length;

const res = readFileSync('DASHBOARD_PO_IDEAS.md').toString('utf8');
const main = execSync('git show origin/main:DASHBOARD_PO_IDEAS.md', { maxBuffer: 1e8 }).toString('utf8');
const po = execSync('git show origin/po/hb110-dashboard:DASHBOARD_PO_IDEAS.md', { maxBuffer: 1e8 }).toString('utf8');

console.log('CJK resultado:', cjkCount(res));
console.log('CJK main     :', cjkCount(main));
console.log('CJK po/hb110 :', cjkCount(po));
console.log('main tiene CJK:', cjkCount(main) > 0);

// CONTROL POSITIVO real: los acentos y emoji que SI existen en el original
// tienen que estar intactos en el resultado (mismos conteos).
const sig = (s) => ({
  emdash: (s.match(/\u2014/g) || []).length,
  quotes: (s.match(/[\u201C\u201D]/g) || []).length,
  arrow: (s.match(/\u2192/g) || []).length,
  check: (s.match(/\u2705/g) || []).length,
  emoji: (s.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length,
});
const a = sig(main), b = sig(res);
for (const k of Object.keys(a)) {
  const ok = b[k] >= a[k];
  console.log(`${k}: main=${a[k]} resultado=${b[k]} ${ok ? 'ok' : 'MAL'}`);
  if (!ok) throw new Error('se perdio ' + k);
}
console.log('OK: la resolucion no perdio puntuacion tipografica');
