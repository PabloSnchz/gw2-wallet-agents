// Verificacion INDEPENDIENTE del archivo escrito: no reutiliza el script que
// lo escribio. Comprueba contra CADA rama que nada se perdio.
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
const norm = (h) => h.replace(/\s+/g, ' ').trim().toLowerCase()
  .replace(/[-—]/g, '-').replace(/[?]/g, '');

const final = secs(readFileSync('DASHBOARD_PO_IDEAS.md', 'utf8'));
const fm = new Map(final.map((s) => [norm(s.h), s]));

const fuentes = ['origin/main', 'origin/po/hb114-dashboard', 'origin/po/hb110-dashboard',
  'origin/po/hb104-dashboard', 'origin/po/hb99-dashboard', 'origin/po/hb97-wv-view',
  'origin/po/hb87-dashboard', 'origin/po/hb77-dashboard', 'origin/po/hb69-dashboard'];

let peorPerdida = 0, peorCuerpo = 0;
for (const src of fuentes) {
  let perdidas = 0, difCuerpo = 0, total = 0;
  for (const s of secs(raw(src + ':DASHBOARD_PO_IDEAS.md'))) {
    total++;
    const k = norm(s.h);
    const m = fm.get(k);
    if (!m) { perdidas++; continue; }
    const a = m.b.join('\n').replace(/\s+/g, ' ').trim();
    const b = s.b.join('\n').replace(/\s+/g, ' ').trim();
    if (b.length > 0 && a.length !== b.length) difCuerpo++;
  }
  peorPerdida = Math.max(peorPerdida, perdidas);
  peorCuerpo = Math.max(peorCuerpo, difCuerpo);
  console.log(`${src.padEnd(30)} secciones=${String(total).padStart(3)}  perdidas=${perdidas}  cuerpo-distinto=${difCuerpo}`);
}

console.log('\nsecciones en el resultado:', final.length);
const fechas = final.map((s) => (s.h.match(/(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2}))?/) ? `${s.h.match(/(\d{4}-\d{2}-\d{2})/)[1]}T${s.h.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/)?.[2] || '00'}:${s.h.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/)?.[3] || '00'}` : null)).filter(Boolean);
let roto = 0;
for (let i = 1; i < fechas.length; i++) if (fechas[i - 1] < fechas[i]) roto++;
console.log('orden no-creciente, rotos:', roto, '(debe ser 0)');
console.log('CONTROL negativo (seccion inventada presente?):', [...fm.keys()].some((k) => /ronda-999/.test(k)) ? 'MAL' : 'ok, 0');

// CONTROL POSITIVO: las 4 rondas de la union de hoy tienen que estar y ser las PRIMERAS
const primeras = final.slice(0, 4).map((s) => (s.h.match(/ronda (\d+)/) || [])[1]);
console.log('primeras 4 rondas del archivo:', primeras.join(','), '(debe ser 36,35,34,33)');

if (peorPerdida > 0) throw new Error('se perdieron ' + peorPerdida + ' encabezados');
console.log('OK: ninguna seccion perdida de ninguna rama');
