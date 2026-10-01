// ALERT: "la rama del PO" no es una rama. Las rondas estan repartidas en 5
// ramas que nacieron de puntos distintos. Verificar si las 12 secciones
// "ausentes" son REALES o solo variantes de encabezado del mismo contenido.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

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

const res = secs(readFileSync('DASHBOARD_PO_IDEAS.md', 'utf8'));
const key = (h) => h.replace(/\s+/g, ' ').trim().toLowerCase();
const porRonda = new Map();
for (const s of res) {
  const m = s.h.match(/ronda (\d+)/i);
  if (m) porRonda.set(+m[1], s);
}

const ramas = ['po/hb69-dashboard', 'po/hb77-dashboard', 'po/hb87-dashboard', 'po/hb97-wv-view', 'po/hb99-dashboard'];
for (const r of ramas) {
  for (const s of secs(raw(`origin/${r}:DASHBOARD_PO_IDEAS.md`))) {
    const m = s.h.match(/ronda (\d+)/i);
    if (!m) continue;
    const n = +m[1];
    const mio = porRonda.get(n);
    if (!mio) { console.log(`ronda ${n} [${r}]: AUSENTE de verdad (sin seccion propia)`); continue; }
    if (key(mio.h) === key(s.h)) { console.log(`ronda ${n} [${r}]: encabezado identico, ya esta`); continue; }
    const cuerpo = s.b.join('\n').trim();
    const mioCuerpo = mio.b.join('\n').trim();
    console.log(`ronda ${n} [${r}]: encabezado DISTINTO, cuerpos ${cuerpo.length} vs ${mioCuerpo.length} chars -> ${cuerpo === mioCuerpo ? 'cuerpo igual' : 'CONTENIDO DIFERENTE'}`);
  }
}
// CONTROL NEGATIVO: una ronda que no existe en ninguna parte.
console.log('CONTROL negativo (ronda 41 inexistente):', porRonda.has(41) ? 'MAL' : 'ok, ausente');
