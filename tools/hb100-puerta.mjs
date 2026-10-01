// HB#100 - medir si existe UN punto de persistencia de ACCOUNT_KEYS
// (criterio del Reviewer en HB#96: "mover la puerta al punto donde la lista
//  se PERSISTE, no agregar ramas"). Salida 1 si el criterio NO es aplicable.
import fs from 'node:fs';

const R = (p) => fs.readFileSync(p, 'utf8').split(/\r?\n/);
const out = (s) => process.stdout.write(s + '\n');

const ranges = [
  ['js/app.js', 780, 800, 'escritor #2'],
  ['js/accounts-panel.js', 188, 202, 'escritor #3'],
  ['js/app.js', 862, 884, 'la puerta actual (addOrUpdate)'],
  ['js/gist-sync.js', 440, 458, 'el sync que entra por la puerta de atras'],
];
for (const [f, a, b, why] of ranges) {
  const L = R(f);
  out(`\n--- ${f}:${a}-${b}  (${why}) ---`);
  for (let i = a; i <= b && i <= L.length; i++) out(`${i}: ${L[i - 1]}`);
}

// Control: los 3 escritores declarados, contados por la FORMA del efecto.
out('\n=== CONTROL: todos los que escriben la lista ===');
const files = fs.readdirSync('js').filter((f) => f.endsWith('.js'));
let n = 0;
for (const f of files) {
  const L = R('js/' + f);
  L.forEach((ln, i) => {
    if (/set\(\s*Storage\.STORAGE_KEYS\.ACCOUNT_KEYS/.test(ln) ||
        /set\(\s*STORAGE_KEYS\.ACCOUNT_KEYS/.test(ln)) {
      n++; out(`  js/${f}:${i + 1}: ${ln.trim()}`);
    }
  });
}
out(`  TOTAL escritores de la lista = ${n}`);

// El criterio del Reviewer exige que TODOS pasen por el mismo lugar.
out(`\nVEREDICTO: ${n > 1 ? 'NO hay punto unico de persistencia -> "mover la puerta" no es una mudanza, es N puertas' : 'si hay punto unico'}`);
process.exit(n > 1 ? 1 : 0);
