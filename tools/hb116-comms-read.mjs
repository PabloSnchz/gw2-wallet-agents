// Lee COMMS_LOG.md y reporta las ultimas filas de la tabla, contando columnas
// sin usar pipes de contenido (el error del HB#115 fue un bloque con |).
import { readFileSync } from 'node:fs';
const s = readFileSync('COMMS_LOG.md', 'utf8').replace(/\r\n/g, '\n');
const filas = s.split('\n').filter((x) => x.trim().startsWith('|'));
console.log('filas de tabla:', filas.length);
for (const f of filas.slice(-6)) {
  console.log('  cols=' + f.split('|').length + ' :: ' + f.slice(0, 120));
}
console.log('lineas totales:', s.split('\n').length);
const sep = filas.filter((x) => /^\|[\s-]*\|/.test(x));
console.log('separadores:', sep.length, sep.map((x) => x.split('|').length).join(','));
