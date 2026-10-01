// Imprime las N ultimas lineas de un archivo recortadas, sin depender de la
// codificacion de la consola de PowerShell (que parte los argumentos en coma).
// Uso: node tools/tail.mjs <archivo> [n]
import fs from 'node:fs';
const [, , f, n] = process.argv;
const lineas = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n').split('\n');
const desde = Math.max(0, lineas.length - Number(n || 5));
for (let i = desde; i < lineas.length; i++) {
  const t = lineas[i];
  console.log((i + 1) + ': ' + (t.length > 95 ? t.slice(0, 95) + '…' : t));
}
console.log('(lineas totales: ' + lineas.length + ')');