// "Top prioridades": main tiene 11281ch y hb69 tiene 12572ch. main es mas
// NUEVO pero mas CORTO. Eso puede ser perdida real de items del PO. Comparar
// los identificadores de item, no los caracteres.
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
const norm = (h) => h.replace(/\s+/g, ' ').trim().toLowerCase().replace(/[-—]/g, '-');
const get = (src, name) => {
  const s = secs(raw(src + ':DASHBOARD_PO_IDEAS.md')).find((x) => norm(x.h).includes(name));
  return s ? s.b.join('\n') : '';
};

// Identificadores de item: "IDEA 49", "T12", "ALERT-84", "ronda 33", rutas.
const ids = (t) => {
  const set = new Set();
  for (const m of t.matchAll(/\b(IDEA\s?\d+[A-Za-z]?|T\d{1,2}[-a-z]?|ALERT-\d+|P3[-a-z]?|ronda\s\d+|feat-[a-z0-9-]+|hb\d+)\b/gi)) {
    set.add(m[1].toLowerCase().replace(/\s+/g, ''));
  }
  return set;
};

const A = get('origin/main', 'top prioridades');
const B = get('origin/po/hb69-dashboard', 'top prioridades');
const R = secs(readFileSync('DASHBOARD_PO_IDEAS.md', 'utf8')).find((x) => norm(x.h).includes('top prioridades')).b.join('\n');

const ia = ids(A), ib = ids(B), ir = ids(R);
const faltan = [...ib].filter((x) => !ir.has(x));
console.log('ids en main:', ia.size, '| ids en hb69:', ib.size, '| ids en resultado:', ir.size);
console.log('ids de hb69 AUSENTES del resultado:', faltan.length);
faltan.forEach((x) => console.log('   ' + x));
console.log('meta-datos / cuentas-panel ausentes (mismo criterio):', [...ib].filter((x) => /cuenta|settings|import|render|app\.js|loadlegendary/.test(x)).length);
