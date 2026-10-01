/**
 * append94.mjs - append a los logs del repo por node, con la regla de no
 * mezclar LF/CRLF y sin truncar. Los heartbeats anteriores crecer con
 * `append`; `write_file` los trunca (HB#90: borro 2566 lineas de TEAM_STATUS).
 * Sale 1 si el archivo quedaria mixto.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [archivo, cuerpoPath] = process.argv.slice(2);
const cuerpo = readFileSync(cuerpoPath, 'utf8');
const antes = readFileSync(archivo, 'utf8');

const crlf = (s) => (s.match(/\r\n/g) || []).length;
const lf = (s) => (s.match(/(?<!\r)\n/g) || []).length;
const soloCRLF = crlf(antes) > 0 && lf(antes) === 0;
const soloLF = lf(antes) > 0 && crlf(antes) === 0;

if (!soloCRLF && !soloLF) {
  console.error('ABORTO: ' + archivo + ' ya es mixto (crlf=' + crlf(antes) + ' lf=' + lf(antes) + '). No lo toco.');
  process.exit(1);
}

const nl = soloCRLF ? '\r\n' : '\n';
const bloque = cuerpo.replace(/\r\n/g, '\n').replace(/\n/g, nl);

// Si el archivo no termina en salto, el append convierte la ultima linea en
// "modificada" (un -1 en el diff). Es el formato, no una perdida.
const sep = antes.endsWith('\n') || antes.endsWith('\r') ? '' : nl;
const despues = antes + sep + bloque;

writeFileSync(archivo, despues, 'utf8');
const c = crlf(despues), l = lf(despues);
if ((soloCRLF && l > 0) || (soloLF && c > 0)) {
  console.error('ABORTO post-escritura: ' + archivo + ' quedo mixto (crlf=' + c + ' lf=' + l + ')');
  process.exit(1);
}
console.log(archivo + ': ' + antes.length + ' -> ' + despues.length + ' bytes (' + (soloCRLF ? 'CRLF' : 'LF') + ')');
