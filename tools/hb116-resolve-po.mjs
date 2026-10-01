// Resuelve el conflicto de DASHBOARD_PO_IDEAS.md (rondas 33-36) reordenando
// secciones por fecha descendente, sin pasar por PowerShell (ALERT-166:
// PowerShell/git-show recodifican y rompen el texto).
// CONTROL: el orden final debe ser estrictamente no-creciente por fecha, y el
// conteo de secciones debe coincidir con la union de ambos lados sin duplicar.
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'DASHBOARD_PO_IDEAS.md';
const raw = readFileSync(P);
const txt = raw.toString('utf8');

const MARK = /^(<<<<<<< .*|=======|>>>>>>> .*)$/m;
const lines = txt.split('\n');

const T = (l) => l.replace(/\r$/, '');
const iStart = lines.findIndex((l) => T(l).startsWith('<<<<<<< '));
const iMid = lines.findIndex((l) => T(l) === '=======');
const iEnd = lines.findIndex((l) => T(l).startsWith('>>>>>>> '));
if (iStart < 0 || iMid < 0 || iEnd < 0) throw new Error('no hay conflicto');

const head = lines.slice(0, iStart);
const ours = lines.slice(iStart + 1, iMid);
const theirs = lines.slice(iMid + 1, iEnd);
const tail = lines.slice(iEnd + 1);

// Si el ultimo linea del lado de ellos es el encabezado que ya abre `tail`,
// es el corte del merge, no contenido duplicado: se descarta.
let theirsTrim = theirs;
if (theirs.length && tail.length && theirs[theirs.length - 1].trim() === tail[0].trim()) {
  theirsTrim = theirs.slice(0, -1);
}

// Recolectar todas las secciones `## ACTUALIZACION` de ambos lados + tail,
// preservando el cuerpo, y deduplicar por encabezado.
function collect(src) {
  const out = [];
  let cur = null;
  for (const l of src) {
    if (/^##\s/.test(T(l))) {
      if (cur) out.push(cur);
      cur = { head: l, body: [] };
    } else if (cur) cur.body.push(l);
    else out.push({ head: null, body: [l] });
  }
  if (cur) out.push(cur);
  return out;
}

const titleOf = (h) => (h === null ? '' : h.replace(/\s+/g, ' ').trim());
const dateOf = (h) => {
  const m = h && h.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return null;
  return `${m[1]}T${m[2]}:${m[3]}`;
};

const merged = [...collect(head), ...collect(ours), ...collect(theirsTrim), ...collect(tail)];
const seen = new Set();
const uniq = [];
for (const s of merged) {
  const k = titleOf(s.head);
  if (k === '') { uniq.push(s); continue; }
  if (seen.has(k)) continue;
  seen.add(k);
  uniq.push(s);
}

// Ordenar SOLO el bloque de secciones con fecha recognized, dejando intacto el
// preambulo. Es mas simple y seguro reordenar el archivo entero por fecha
// descendente, con las secciones sin fecha al final (en su orden original).
const withDate = uniq.filter((s) => dateOf(s.head) !== null);
const noDate = uniq.filter((s) => dateOf(s.head) === null);
withDate.sort((a, b) => (dateOf(a.head) < dateOf(b.head) ? 1 : -1));

// CONTROL: el orden tiene que ser no-creciente.
for (let i = 1; i < withDate.length; i++) {
  if (dateOf(withDate[i - 1].head) < dateOf(withDate[i].head)) {
    throw new Error('orden roto en ' + withDate[i].head);
  }
}
// CONTROL: ningun encabezado repetido.
if (new Set(withDate.map((s) => titleOf(s.head))).size !== withDate.length) {
  throw new Error('duplicados despues del dedupe');
}

const render = (s) => (s.head === null ? s.body.join('\n') : [s.head, ...s.body].join('\n'));
const out = [...withDate, ...noDate].map(render).join('\n');

writeFileSync(P, Buffer.from(out, 'utf8'));

console.log(`secciones con fecha: ${withDate.length} | sin fecha: ${noDate.length}`);
console.log(`primera: ${titleOf(withDate[0].head).slice(0, 70)}`);
console.log(`cuarta:  ${titleOf(withDate[3].head).slice(0, 70)}`);
console.log(`ultima con fecha: ${titleOf(withDate[withDate.length - 1].head).slice(0, 70)}`);
// CONTROL NEGATIVO: un encabezado imposible no puede haber sobrevivido.
console.log('CONTROL negativo (ronda 99 debe ser 0):',
  withDate.filter((s) => /ronda 99/.test(s.head)).length);
// CONTROL POSITIVO: las 4 rondas que nos importan tienen que estar.
for (const r of [36, 35, 34, 33]) {
  const n = withDate.filter((s) => new RegExp(`ronda ${r}\\b`).test(s.head)).length;
  console.log(`ronda ${r}: ${n} (debe ser 1)`);
}
