// hb94-alcance.mjs - busca el patron "estado inicial invisible que depende de una animacion"
// en las 3 capas del proyecto. Salida: VEREDICTO (0 = solo lo que ya se conocia).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.argv[2] || '.';
const CAPAS = ['css', 'js', 'themes'];

function* archivos(dir) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.git' || e === 'tools') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* archivos(p);
    else if (/\.(css|js)$/.test(e)) yield p;
  }
}

// Una regla es sospechosa si declara opacity:0 / visibility:hidden / transform / scale
// Y una animacion en la misma regla (declaracion o bloque).
const INICIAL = /opacity\s*:\s*0(?!\.)|visibility\s*:\s*hidden|translateY\(|scale\(/;
const ANIM = /animation\s*:|animation-name\s*:/;

const hallazgos = [];
for (const capa of CAPAS) {
  let d;
  try { d = join(RAIZ, capa); } catch { continue; }
  let existe = true;
  try { statSync(d); } catch { existe = false; }
  if (!existe) continue;

  for (const f of archivos(d)) {
    const txt = readFileSync(f, 'utf8');
    const lines = txt.split(/\r?\n/);
    // CSS: reglas { ... }
    if (f.endsWith('.css')) {
      for (let i = 0; i < lines.length; i++) {
        if (!ANIM.test(lines[i])) continue;
        // buscar el bloque que cierra
        let bloque = '';
        let j = i;
        while (j < lines.length && j < i + 12) { bloque += lines[j] + '\n'; if (lines[j].includes('}')) break; j++; }
        if (INICIAL.test(bloque)) {
          hallazgos.push({ f, i: i + 1, tipo: 'css', sel: (bloque.split('{')[0] || '').trim().slice(0, 60) });
        }
      }
    } else {
      // JS: templates inline. Una linea con la clase y el estado inicial.
      for (let i = 0; i < lines.length; i++) {
        if (!/raid-wing-card|class="[^"]*"/.test(lines[i])) continue;
        if (INICIAL.test(lines[i]) && /animation\s*:/.test(lines[i])) {
          const m = lines[i].match(/class="([^"]+)"/);
          hallazgos.push({ f, i: i + 1, tipo: 'inline', sel: m ? m[1] : '(sin class)' });
        }
      }
    }
  }
}

console.log('=== estado inicial invisible que depende de una animacion ===');
for (const h of hallazgos) {
  console.log(`  [${h.tipo.padEnd(6)}] ${h.f}:${h.i}  -> ${h.sel}`);
}
console.log('total apariciones = ' + hallazgos.length);
console.log('clases distintas  = ' + new Set(hallazgos.map(h => h.sel)).size);
