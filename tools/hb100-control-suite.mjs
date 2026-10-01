// HB#100 - CONTROL del runner de suite. Un detector que no se sabe fallar
// no mide nada: se le inyectan 3 archivos con fallos conocidos y se exige
// que los marque a TODOS. Salida 1 si el runner se los deja pasar.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const DIR = 'tests/_control';
fs.mkdirSync(DIR, { recursive: true });

const casos = [
  ['ctl1.test.js', 'console.log("3 FAIL: lo que sea");\n', 'FAIL numerico'],
  ['ctl2.test.js', 'console.log("SUITE FAIL");\n', 'FAIL sin numero'],
  ['ctl3.test.js', 'console.log("AssertionError: no");\nprocess.exit(1);\n', 'FALLA por exit code'],
  ['ctl4.test.js', 'console.log("ok 10 pass");\n', 'CONTROL POSITIVO: debe pasar'],
];
for (const [f, body] of casos) fs.writeFileSync(DIR + '/' + f, body);

// Reproducir la deteccion del runner real (tools/hb100-suite.mjs), no una copia
// aproximada: si el runner cambia, el control cambia con el.
const src = fs.readFileSync('tools/hb100-suite.mjs', 'utf8')
  .replace("const dir = 'tests';", `const dir = '${DIR}';`)
  .replace(/process\.exit\(tf \? 1 : 0\);/, 'process.exit(0);');
fs.writeFileSync(DIR + '/_runner.mjs', src);
const out = execFileSync(process.execPath, [DIR + '/_runner.mjs'], { encoding: 'utf8' });
process.stdout.write(out);

// El control REAL: ademas de "no FALLA", el runner tiene que notar la senal
// aunque el archivo no imprima ningun numero (ctl2/ctl3 son los dangerousos:
// un runner que solo mira "N FAIL" los reporta 0/0 = limpio = FALSO).
const marcaFallo = (nombre) => new RegExp('XX\\s+' + nombre).test(out);
const todo = fs.readdirSync(DIR).filter((f) => f.endsWith('.test.js')).sort();
const perdidos = todo.filter((f) => f.startsWith('ctl') && !marcaFallo(f) && f !== 'ctl4.test.js');

fs.rmSync(DIR, { recursive: true, force: true });
if (perdidos.length) {
  process.stdout.write(`\nCONTROL FALLIDO: el runner dio "limpio" a: ${perdidos.join(', ')}\n`);
  process.exit(1);
}
process.stdout.write('\nCONTROL OK: el runner marca los 3 fallos conocidos y no toca el control positivo\n');
