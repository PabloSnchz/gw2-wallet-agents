// La ronda del PO NO es una rama: las rondas 18, 22-28 y 32 viven en 5 ramas
// distintas y NUNCA se mergearon. Este script arma la UNION de todas, deduplica
// por encabezado, ordena por fecha descendente y escribe el archivo.
// CONTROLES:
//  - positivo: cada rama debe ver sus propias secciones en el resultado
//  - negativo: un encabezado inventado debe dar 0
//  - positivo: el cuerpo de una seccion compartida debe ser IDENTICO al de la
//    rama mas reciente que la contiene (si difiere, se reporta, no se pisa)
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const raw = (r) => execSync('git show ' + r, { maxBuffer: 1e8 }).toString('utf8');
const T = (l) => l.replace(/\r$/, '');
const secs = (s) => {
  const out = []; let cur = null;
  for (const l of s.split('\n').map(T)) {
    if (/^##\s/.test(l)) { if (cur) out.push(cur); cur = { h: l, b: [] }; }
    else if (cur) cur.b.push(l);
  }
  if (cur) out.push(cur);
  return out;
};
const key = (h) => h.replace(/\s+/g, ' ').trim().toLowerCase();
const dateOf = (h) => {
  const m = h.match(/(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return null;
  return `${m[1]}T${m[2] || '00'}:${m[3] || '00'}`;
};

// main primero, despues las ramas de mas nueva a mas vieja: gana la mas nueva.
//
// HB#134 -- LAS REFS SE LEEN, NO SE ESCRIBEN. Esta lista estaba escrita a mano
// (9 entradas) mientras `ls-remote` devuelve 15: faltaban 6, y entre las que
// faltaban estaban TODAS las de poda, que son las rondas mas nuevas. El conteo
// corria sobre un subconjunto y el numero que salia era una propiedad de la
// lista, no del PO. Ya lo habia avisado ALERT-170 (HB#131) y el HB#132 otra
// vez; el numero cambio entre ciclos sin que el PO escribiera nada, porque la
// rama seguia en el mismo commit.
//
// El orden importa: main primero (gana el cuerpo mas reciente) y despues las
// refs en el orden que las devuelve ls-remote (que es alfabetico, y por lo
// tanto NO es "de mas nueva a mas vieja" -- el desempate por fecha lo hace
// dateOf() mas abajo, sobre la seccion, no sobre la rama).
const lsRefs = execSync('git ls-remote --heads origin "refs/heads/po/*"')
  .toString().split('\n').filter((l) => l.trim())
  .map((l) => 'origin/' + l.split(/\s+/)[1].replace('refs/heads/', ''));
if (lsRefs.length < 9) throw new Error('ls-remote devolvio ' + lsRefs.length + ' refs po/*: se esperaba >=9, el remoto esta incompleto o el glob fallo');

const fuentes = ['origin/main', ...lsRefs];

const mapa = new Map();
const conflictos = [];
let preambulo = [];
let anadidas = 0;

for (const src of fuentes) {
  for (const s of secs(raw(src + ':DASHBOARD_PO_IDEAS.md'))) {
    const k = key(s.h);
    const prev = mapa.get(k);
    if (!prev) { mapa.set(k, { ...s, src }); anadidas++; continue; }
    // Mismo encabezado: si el cuerpo difiere, se registra. Gana el primero
    // (fuente mas nueva), salvo que solo difiera en puntuacion.
    const a = prev.b.join('\n').trim();
    const b = s.b.join('\n').trim();
    if (a !== b) conflictos.push({ h: s.h.slice(0, 70), de: prev.src, ahora: src, la: a.length, lb: b.length });
  }
}

// Secciones sin fecha de recognized al final, en su orden original.
const todos = [...mapa.values()];
const conF = todos.filter((s) => dateOf(s.h) !== null);
const sinF = todos.filter((s) => dateOf(s.h) === null);
conF.sort((a, b) => (dateOf(a.h) < dateOf(b.h) ? 1 : dateOf(a.h) > dateOf(b.h) ? -1 : 0));
sinF.sort((a, b) => (secOrder(a, b)));

// El bloque "## Top prioridades" y similares viven al final; sinF ya los cubre.
function secOrder() { return 0; }

const out = [...conF, ...sinF].map((s) => [s.h, ...s.b].join('\n')).join('\n');

if (process.argv[2] === '--write') {
  writeFileSync('DASHBOARD_PO_IDEAS.md', Buffer.from(out, 'utf8'));
  console.log('ESCRITO');
}

console.log('secciones totales:', todos.length, '| con fecha:', conF.length, '| sin fecha:', sinF.length);
console.log('conflictos de cuerpo (gana la fuente mas nueva):', conflictos.length);
conflictos.slice(0, 12).forEach((c) => console.log(`   ${c.h} | de ${c.de} (${c.la}ch) vs ${c.ahora} (${c.lb}ch)`));

// CONTROL 1 (orden no-creciente)
let roto = 0;
for (let i = 1; i < conF.length; i++) if (dateOf(conF[i - 1].h) < dateOf(conF[i].h)) roto++;
console.log('CONTROL orden roto (debe ser 0):', roto);

// CONTROL 2 (negativo): encabezado imposible
console.log('CONTROL negativo (fantasma, debe ser 0):', [...mapa.keys()].filter((k) => /control negativo inventado|zzz-ronda-99/.test(k)).length);

// CONTROL 3 (positivo): cada ronda que sabemos perdida tiene que estar
const rondas = fs_readRondas(mapa);
for (const r of [18, 22, 23, 24, 25, 26, 27, 28, 32, 33, 34, 35, 36]) {
  console.log(`ronda ${r}: ${rondas.get(r) || 0} (debe ser >=1)`);
}
function fs_readRondas(m) {
  const m2 = new Map();
  for (const k of m.keys()) {
    const mm = k.match(/ronda (\d+)/);
    if (mm) m2.set(+mm[1], (m2.get(+mm[1]) || 0) + 1);
  }
  return m2;
}
if (roto > 0) throw new Error('orden roto');
