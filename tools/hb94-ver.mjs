// hb94-ver.mjs - imprime rangos de lineas de archivos del repo, sin PowerShell.
import { readFileSync } from 'node:fs';

const [file, a, b] = process.argv.slice(2);
const from = parseInt(a, 10), to = parseInt(b, 10);
const lines = readFileSync(file, 'utf8').split(/\r?\n/);
for (let i = from; i <= to && i <= lines.length; i++) {
  console.log(String(i).padStart(5) + ': ' + lines[i - 1]);
}
