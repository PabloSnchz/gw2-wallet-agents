// Verifica encoding del archivo resuelto: sin BOM, sin U+FFFD (sustitucion),
// y con CJK/emoji legible. Control positivo: el archivo debe contener la
// cadena CJK real que existe en el lado del PO.
import { readFileSync } from 'node:fs';

const b = readFileSync('DASHBOARD_PO_IDEAS.md');
const s = b.toString('utf8');

const bom = b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf;
const fffd = (s.match(/\uFFFD/g) || []).length;
const cirilico = (s.match(/[\u0400-\u04FF]/g) || []).length;

// CONTROL POSITIVO: texto CJK real del encabezado de la ronda 36.
const cjk = (s.match(/[\u4E00-\u9FFF]/g) || []).length;
// CONTROL NEGATIVO: una cadena CJK inventada debe dar 0.
const fantasma = s.includes('\u4E00\u4E00\u4E00imposible');

console.log('BOM:', bom, '(debe ser false)');
console.log('U+FFFD (reemplazo):', fffd, '(debe ser 0)');
console.log('cirilico:', cirilico, '(debe ser 0)');
console.log('CJK real presente:', cjk, '(debe ser >0)');
console.log('CONTROL negativo CJK fantasma:', fantasma ? 'MAL' : 'ok (0)');
console.log('bytes:', b.length);

const muestra = s.split('\n').find((l) => l.startsWith('## ACTUALIZACION 2026-10-01 22:40'));
console.log('encabezado ronda 36:', muestra);
if (bom || fffd > 0 || cirilico > 0 || cjk === 0 || fantasma) {
  throw new Error('encoding sospechoso');
}
console.log('OK encoding');
