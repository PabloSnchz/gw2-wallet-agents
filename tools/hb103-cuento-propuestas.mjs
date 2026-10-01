// HB#103 - conteo de propuestas del PO con SU criterio (ronda 34 del PO).
// Regla que el PO declaro:
//   fuente = DASHBOARD_PO_IDEAS.md en la rama po/hb99-dashboard
//   cuenta una propuesta si su seccion trae `### Tramos`
//   y NINGUNA de sus lineas dice 'aplicada' / 'cerrada'
//   (case-insensitive)
import fs from 'fs';

const path = process.argv[2];
const src = fs.readFileSync(path, 'utf8');
const lines = src.split(/\r?\n/);

// secciones: "## ACTUALIZACION ... ronda N" hasta la proxima "## "
const heads = [];
lines.forEach((l, i) => {
  if (/^##\s/.test(l)) heads.push({ i, title: l.trim() });
});

const secs = [];
for (let k = 0; k < heads.length; k++) {
  const from = heads[k].i + 1;
  const to = k + 1 < heads.length ? heads[k + 1].i : lines.length;
  secs.push({ title: heads[k].title, from, to, body: lines.slice(from, to) });
}

const RE_RONDA = /ronda\s+(\d+)/i;
const out = [];
for (const s of secs) {
  const m = RE_RONDA.exec(s.title);
  if (!m) continue;
  const ronda = parseInt(m[1], 10);
  const tieneTramos = s.body.some((l) => /^###\s+Tramos/i.test(l.trim()));
  const cerrada = s.body.some((l) => /\b(aplicada|cerrada)\b/i.test(l));
  out.push({ ronda, title: s.title, tieneTramos, cerrada });
}

out.sort((a, b) => b.ronda - a.ronda);
console.log('=== secciones con "ronda N" en el titulo ===');
for (const r of out) {
  const estado = !r.tieneTramos ? 'sin Tramos   ' : (r.cerrada ? 'CERRADA      ' : 'CUENTA       ');
  console.log(`ronda ${String(r.ronda).padStart(2)} | ${estado} | ${r.title.slice(0, 60)}`);
}

const vivas = out.filter((r) => r.tieneTramos && !r.cerrada);
const cerradas = out.filter((r) => r.tieneTramos && r.cerrada);
console.log('\nCUENTAN (Tramos y no cerrada):', vivas.length, vivas.map((r) => r.ronda).join(','));
console.log('CERRADAS:', cerradas.length, cerradas.map((r) => r.ronda).join(','));

// control negativo: mutar el criterio debe dar 0
const control = out.filter((r) => r.tieneTramos && /zzz_no_existe/i.test(r.title));
console.log('CONTROL (criterio imposible):', control.length, control.length === 0 ? 'OK' : 'FALLA');