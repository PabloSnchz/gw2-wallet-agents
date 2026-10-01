// Auditoria de referencias cruzadas de ALERTS_LOG.md.
//
// Por que existe: entre HB#81 y HB#83, 7 referencias a ALERT-108..112 quedaron
// apuntando a entradas que NUNCA se escribieron en ALERTS_LOG.md, en dos
// archivos committed. Ningun test ni script lo detectaba: los .md no se
// validan. Este script convierte "las referencias apuntan a algo" en un dato.
//
// Uso: node tools/audit-alert-refs.mjs [--alerts=<otra ruta>]
//   sale 1 si hay referencias huerfanas, 2 si el extractor de definiciones fallo
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const argAlerts = process.argv.find(a => a.startsWith('--alerts='));
const ALERTS = argAlerts ? argAlerts.slice('--alerts='.length) : path.join(ROOT, 'ALERTS_LOG.md');
const docsRoot = (process.argv.find(a => a.startsWith('--docs=')) || '--docs=').slice('--docs='.length);
const DOCS_DIR = docsRoot || ROOT;
console.log('ALERTS_LOG usado: ' + (path.relative(ROOT, ALERTS) || ALERTS) + ' | .md escaneados en: ' +
  (path.relative(ROOT, DOCS_DIR) || '.'));

const alertasTxt = fs.readFileSync(ALERTS, 'utf8');
// Un ALERT se "define" de 2 formas en este archivo, y con la primera version
// del script solo se veia una: reporto 343 huerfanas que eranDefinitiones.
//   a) titulo:  "## ALERT-108 - ..."   (a veces dentro de un blockquote)
//   b) fila de tabla: "| **ALERT-10** | Alta | ... |"  <- la mayoria
const definidos = new Set();
for (const m of alertasTxt.matchAll(/^\s*\|[^|]*?\b(?:\*\*)?ALERT-(\d+)(?:\*\*)?\s*\|/gm)) definidos.add(m[1]);
for (const m of alertasTxt.matchAll(/^\s*>?\s*#{2,4}\s*(?:\*\*)?ALERT-(\d+)\b/gm)) definidos.add(m[1]);

const docs = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));
const huerfanas = [];
let totalRefs = 0;

for (const doc of docs) {
  const txt = fs.readFileSync(path.join(DOCS_DIR, doc), 'utf8');
  txt.split(/\r?\n/).forEach((linea, i) => {
    for (const m of linea.matchAll(/ALERT-(\d+)/g)) {
      totalRefs++;
      if (!definidos.has(m[1])) {
        huerfanas.push({ doc, linea: i + 1, ref: 'ALERT-' + m[1], texto: linea.trim().slice(0, 70) });
      }
    }
  });
}

console.log('ALERTS definidos: ' + definidos.size);
console.log('referencias en ' + docs.length + ' .md de la raiz: ' + totalRefs);
console.log('HUERFANAS: ' + huerfanas.length + ' referencias a ' +
  new Set(huerfanas.map(h => h.ref)).size + ' ids distintos');
console.log('  ids: ' + [...new Set(huerfanas.map(h => h.ref))].sort().join(', '));
for (const h of huerfanas) {
  console.log('  ' + h.doc + ':' + h.linea + ' -> ' + h.ref + '   ' + h.texto);
}

// AVISO que hay que tener presente al leer el numero: la auditoria cuenta SUS
// PROPIAS referencias. Describir las ALERTs huerfanas las vuelve a citar y sube
// el contador. Por eso la cifra de cabeza es la de ids DISTINTOS, que no crece
// por escribir el informe.
if (huerfanas.some(h => h.doc === 'ALERTS_LOG.md' && /esta (ALERT|auditoria)|quedan \(\`ALERT/.test(h.texto))) {
  console.log('  (nota: parte de este total son las referencias del propio informe)');
}

// CONTROL: que el script diga "0 huerfanas" no vale nada si el extractor de
// "definidos" esta roto y por eso no encuentra ninguna referencia huerfana.
// Si el set de definidos se hunde, el control falla.
if (definidos.size < 100) {
  console.log('CONTROL FALLADO: se esperaban >=100 ALERT definidos, hay ' + definidos.size);
  process.exit(2);
}
console.log('CONTROL ok: ' + definidos.size + ' ALERT definidos (>=100)');
process.exit(huerfanas.length ? 1 : 0);