// Antepone un bloque al principio de un archivo .md preservando su EOL, y
// SE NIEGA a escribir si el archivo ya es mixto.
// Uso: node tools/prepend-block.mjs <archivo.md> <bloque.md>
import fs from 'node:fs';
const [, , target, bloquePath] = process.argv;
const antes = fs.readFileSync(target, 'utf8');
const crlf = (antes.match(/\r\n/g) || []).length;
const lf = (antes.match(/(?<!\r)\n/g) || []).length;
if (crlf && lf) {
  console.error('CANCELADO: ' + target + ' ya es mixto (crlf=' + crlf + ' lf=' + lf + ').');
  process.exit(1);
}
const nl = crlf ? '\r\n' : '\n';
let bloque = fs.readFileSync(bloquePath, 'utf8').replace(/\r?\n/g, nl);
if (!bloque.endsWith(nl)) bloque += nl;
fs.writeFileSync(target, bloque + nl + antes, 'utf8');
const d = fs.readFileSync(target, 'utf8');
console.log(target + ': crlf=' + (d.match(/\r\n/g) || []).length +
  ' lf=' + (d.match(/(?<!\r)\n/g) || []).length +
  ' lineas=' + (d.match(/\r?\n/g) || []).length);