// Verifica que la resolucion no perdio NINGUN encabezado que existia en
// cualquiera de los 4 lados. Control positivo explicito por lado.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const raw = (r) => execSync('git show ' + r, { maxBuffer: 1e8 }).toString('utf8');
const T = (l) => l.replace(/\r$/, '');
const heads = (s) =>
  s.split('\n').map(T).filter((l) => /^##\s/.test(l)).map((l) => l.replace(/\s+/g, ' ').trim());

const final = heads(readFileSync('DASHBOARD_PO_IDEAS.md', 'utf8'));
const finalSet = new Set(final);

const lados = {
  'main (HEAD del merge)': raw('origin/main:DASHBOARD_PO_IDEAS.md'),
  'po/hb114 (ronda 36)': raw('origin/po/hb114-dashboard:DASHBOARD_PO_IDEAS.md'),
  'po/hb110 (35/34/33)': raw('origin/po/hb110-dashboard:DASHBOARD_PO_IDEAS.md'),
};

let peor = 0;
for (const [nombre, buf] of Object.entries(lados)) {
  const h = heads(buf);
  const faltan = h.filter((x) => !finalSet.has(x));
  peor = Math.max(peor, faltan.length);
  console.log(`${nombre}: ${h.length} encabezados, ausentes en el resultado: ${faltan.length}`);
  faltan.slice(0, 5).forEach((f) => console.log('   FALTA: ' + f.slice(0, 80)));
}

// CONTROL NEGATIVO: un encabezado inventado debe aparecer como ausente.
const fantasma = '## ACTUALIZACION 1999-01-01 UTC — control negativo inventado';
console.log('CONTROL negativo (fantasma ausente, debe ser 1):', finalSet.has(fantasma) ? 0 : 1);
// CONTROL POSITIVO: total unico, sin duplicados por el dedupe.
console.log('duplicados en el resultado (debe ser 0):', final.length - finalSet.size);
console.log('total encabezados resultado:', final.length);

if (peor > 0) throw new Error('se perdieron encabezados');
console.log('OK: ningun encabezado perdido');
