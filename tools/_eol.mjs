// Cuenta EOL de un archivo y SE NIEGA a reportar si el archivo es mixto
// sin avisar. Uso: node tools/_eol.mjs <archivo>
// Proposito: HB#86 y HB#77 dejaron LF pelados en .md CRLF por usar un
// one-liner en vez de un script. Este es el instrumento para no repetirlo.
import fs from 'node:fs';
const f = process.argv[2];
if (!f) { console.error('uso: node tools/_eol.mjs <archivo>'); process.exit(2); }
const t = fs.readFileSync(f, 'utf8');
const crlf = (t.match(/\r\n/g) || []).length;
const lf = (t.match(/(?<!\r)\n/g) || []).length;
const total = crlf + lf;
const mayoria = crlf >= lf ? 'CRLF' : 'LF';
console.log(f + ': crlf=' + crlf + ' lf=' + lf + ' total=' + total +
  ' mayoria=' + mayoria + (lf && crlf ? ' MIXTO' : ''));
if (lf && crlf) { console.log('  AVISO: EOL mixto. No se corrige a ciegas.'); process.exit(1); }
process.exit(0);