// Anexa un bloque a ALERTS_LOG.md sin dejar LF pelados en un archivo CRLF.
// Uso: node tools/append-alert.mjs <archivo> <bloque.md>
// Por que existe: HB#77 y HB#86 dejaron LF sueltos en .md CRLF porque el
// anexo se hacia con un one-liner de cmd. Este script mide antes y despues,
// y SE NIEGA a escribir si el archivo no esta homogeneo.
import fs from 'node:fs';

const [, , target, bloquePath] = process.argv;
if (!target || !bloquePath) {
  console.error('uso: node tools/append-alert.mjs <archivo.md> <bloque.md>');
  process.exit(2);
}

function eol(t) {
  return {
    crlf: (t.match(/\r\n/g) || []).length,
    lf: (t.match(/(?<!\r)\n/g) || []).length,
  };
}

const antes = fs.readFileSync(target, 'utf8');
const e0 = eol(antes);
if (e0.crlf && e0.lf) {
  console.error('CANCELADO: ' + target + ' ya es mixto (crlf=' + e0.crlf +
    ' lf=' + e0.lf + '). Normalizar a mano antes de anexar.');
  process.exit(1);
}
const nl = e0.crlf ? '\r\n' : '\n';

const bloque = fs.readFileSync(bloquePath, 'utf8').replace(/\r?\n/g, nl);
const base = antes.length && !antes.endsWith('\n') ? antes + nl : antes;
fs.writeFileSync(target, base + bloque, 'utf8');

const despues = eol(fs.readFileSync(target, 'utf8'));
console.log(target + ': antes crlf=' + e0.crlf + ' lf=' + e0.lf +
  ' -> despues crlf=' + despues.crlf + ' lf=' + despues.lf);
if (despues.lf && despues.crlf) {
  console.error('ERROR: el anexo dejo el archivo mixto. Revisar.');
  process.exit(1);
}
process.exit(0);