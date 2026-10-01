// Los 8 "cuerpo-distinto" tienen que ser SOLO casos donde main gana por ser la
// fuente mas reciente. Si alguno fuera al reves (una rama vieja[…]), seria un
// problema: el archivo estaria pisando contenido nuevo con viejo.
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
const norm = (h) => h.replace(/\s+/g, ' ').trim().toLowerCase().replace(/[-—]/g, '-').replace(/\?/g, '');
const squash = (s) => s.replace(/\s+/g, ' ').trim();

const final = new Map(secs(readFileSync('DASHBOARD_PO_IDEAS.md', 'utf8')).map((s) => [norm(s.h), s]));
const fuentes = ['origin/main', 'origin/po/hb114-dashboard', 'origin/po/hb110-dashboard',
  'origin/po/hb104-dashboard', 'origin/po/hb99-dashboard', 'origin/po/hb97-wv-view',
  'origin/po/hb87-dashboard', 'origin/po/hb77-dashboard', 'origin/po/hb69-dashboard'];

for (const src of fuentes.slice(1)) { // main es el referencial
  for (const s of secs(raw(src + ':DASHBOARD_PO_IDEAS.md'))) {
    const k = norm(s.h);
    const m = final.get(k);
    if (!m) continue;
    const a = squash(m.b.join('\n')), b = squash(s.b.join('\n'));
    if (!b.length || a.length === b.length) continue;
    const esMain = squash(raw('origin/main:DASHBOARD_PO_IDEAS.md').split('\n') && '') ;
    console.log(`\n[${src}] ${s.h.slice(0, 62)}`);
    console.log(`   resultado=${a.length}ch  rama=${b.length}ch`);
    // el resultado tiene que ser el de main SI la seccion esta en main
    const enMain = secs(raw('origin/main:DASHBOARD_PO_IDEAS.md')).find((x) => norm(x.h) === k);
    if (enMain) {
      const ma = squash(enMain.b.join('\n'));
      console.log(`   main=${ma.length}ch -> resultado es el de main: ${a === ma}`);
      if (a !== ma) { console.log('   *** NO es el de main ***'); }
      // contenido propio de la rama que se perdio?
      const perdido = [...new Set(b.split(' '))].filter((w) => w.length > 12 && !a.includes(w));
      console.log(`   palabras largas de la rama ausentes del resultado: ${perdido.length}`);
      perdido.slice(0, 6).forEach((w) => console.log('      ' + w));
    } else {
      console.log('   la seccion NO esta en main (es antigua): no hay conflicto con main');
      const perdido = [...new Set(b.split(' '))].filter((w) => w.length > 12 && !a.includes(w));
      console.log(`   palabras largas de la rama ausentes: ${perdido.length}`);
      perdido.slice(0, 8).forEach((w) => console.log('      ' + w));
    }
  }
}
