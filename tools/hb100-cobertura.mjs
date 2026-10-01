// HB#100 - cobertura de la union: TODOS los caminos por los que una key
// nueva entra a la lista persistida. Si alguno existe fuera de addOrUpdate
// (validado) y de importApiKeys (sin validar), la puerta tiene mas de una
// puerta de atras. Salida 1 si aparece un camino sin dono conocido.
import fs from 'node:fs';
const R = (p) => fs.readFileSync(p, 'utf8').split(/\r?\n/);
const out = (s) => process.stdout.write(s + '\n');

const js = fs.readdirSync('js').filter((f) => f.endsWith('.js'));

// (1) Quien MUTA la lista con una llave.
out('=== 1. quien agrega elementos a la lista (push/splice/unshift/assign) ===');
const hits = [];
for (const f of js) {
  const L = R('js/' + f);
  L.forEach((ln, i) => {
    if (/(this\.list|KeyManager\.list|state\.keys)\s*\.\s*(push|unshift|splice)\s*\(/.test(ln) ||
        /(this\.list|KeyManager\.list)\s*=\s*[^=]/.test(ln)) {
      hits.push(`js/${f}:${i + 1}: ${ln.trim()}`);
    }
  });
}
hits.forEach(out);
out(`  (${hits.length} hits)`);

// (2) Quien llama a save( con un mutator que podria meter una key.
out('\n=== 2. llamadas a KeyManager.save( ===');
for (const f of js) {
  const L = R('js/' + f);
  L.forEach((ln, i) => {
    if (/save\s*\(/.test(ln) && /(KeyManager|\.save\()/.test(ln) && !/^\s*(function|\/\/)/.test(ln))
      out(`  js/${f}:${i + 1}: ${ln.trim()}`);
  });
}

// (3) La forma de un item de la lista, para saber que es lo que se valida.
out('\n=== 3. forma de un item de la lista ===');
const app = R('js/app.js');
let n = 0;
app.forEach((ln, i) => { if (ln.includes('value:') && ln.includes('perms')) { if (n++ < 3) out(`  app.js:${i + 1}: ${ln.trim()}`); } });
if (!n) out('  (no se encontro {value, perms} en app.js)');

const sinDeno = hits.filter((h) => !/app\.js/.test(h));
out(`\nVEREDICTO: ${sinDeno.length
  ? 'CAMINOS SIN VALIDADOR -> ' + sinDeno.join(' | ')
  : 'todos los caminos con dono en app.js (el unico con puerta)'}`);
process.exit(sinDeno.length ? 1 : 0);
