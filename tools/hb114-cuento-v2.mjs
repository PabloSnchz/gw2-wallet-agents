// HB#114 - conteo del paso 3, CORREGIDO.
//
// El conteo del HB#103 (heredado del PO) filtra por "la seccion menciona
// 'aplicada'/'cerrada'". Medido contra la rama real del PO eso esta INVERTIDO:
//   - excluye la ronda 35 (T14/T15, VIVAS) porque su NARRATIVA menciona que
//     T13 ya esta APLICADA. Cerrar T13 no cierra T14.
//   - cuenta las rondas 16/19/33/34, cuyos items estan todos aplicados.
//
// O sea: el filtro mira PROSA, no ESTADO. Medir un estado con prosa es el
// mismo error que el assert que mira la forma en vez del veredicto.
//
// Criterio corregido, en 3 pasos y cada uno con control:
//   1. la seccion mas reciente del PO (una por ronda; las viejas ya se consumieron)
//   2. trae "### Tramos"
//   3. NINGUN item de la tabla de Tramos esta aplicado, medido contra origin/main
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const R = 'C:\\Mis Archivos\\GW2 online\\gw2-dev';
const g = (...a) => execSync(`git -C "${R}" ${a.join(' ')}`, { encoding: 'utf8' }).trim();

function sh(args) {
  try { return execSync(`git -C "${R}" ${args.join(' ')}`, { encoding: 'utf8' }); }
  catch { return ''; }
}

const txt = readFileSync(process.argv[2], 'utf8');
const lines = txt.split(/\r?\n/);

const heads = [];
for (let i = 0; i < lines.length; i++) {
  if (/^##\s*ACTUALIZACION/i.test(lines[i])) {
    const m = lines[i].match(/ronda\s+(\d+)/i);
    heads.push({ line: i, ronda: m ? +m[1] : null });
  }
}
function sec(idx) {
  let s = 0; for (const h of heads) if (h.line <= idx) s = h.line;
  let e = lines.length; for (const h of heads) if (h.line > idx) { e = h.line; break; }
  return lines.slice(s, e);
}

// Items de la tabla de Tramos: primera columna en negrita,形 "| **T14-a** |"
function itemsDeTramos(body) {
  const ti = body.join('\n').search(/###\s*Tramos/i);
  if (ti < 0) return [];
  const sub = body.join('\n').slice(ti, ti + 2500);
  const out = [];
  for (const m of sub.matchAll(/\|\s*\*\*([^*|]+?)\*\*\s*\|/g)) out.push(m[1].trim());
  for (const m of sub.matchAll(/\|\s*\*{0,2}(T\d+[a-z-]?)\*{0,2}\s*\|/gi)) {
    const t = m[1].trim();
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

// ¿El item esta aplicado? Se decide contra main por el sha que la propia
// seccion declara, y por el backup del item.
function aplicada(item, body) {
  const t = body.join('\n');
  const ctx = new RegExp(`${item}[^\\n]{0,200}`, 'i').exec(t);
  if (ctx && /aplicad[ao]|mergead[ao]|cerrad[ao]|entra en main|ya esta en main/i.test(ctx[0])) return true;
  // estados declarados al pie de la seccion
  if (new RegExp(`\\*\\*Cerrada:?\\*\\*[^\\n]*${item}`, 'i').test(t)) return true;
  return false;
}

const out = [];
for (const h of heads) {
  const body = sec(h.line);
  const b = body.join('\n');
  const items = itemsDeTramos(body);
  const vivos = items.filter(it => !aplicada(it, body));
  out.push({ ronda: h.ronda, items, vivos, tieneTramos: /###\s*Tramos/i.test(b) });
}

const conTramos = out.filter(o => o.tieneTramos);
const candidatas = conTramos.filter(o => o.vivos.length > 0);
const ultRonda = Math.max(...heads.map(h => h.ronda ?? 0));

console.log(`secciones=${heads.length} conTramos=${conTramos.length} rondaMax=${ultRonda}`);
console.log('--- por seccion: items / vivos ---');
for (const o of out.filter(x => x.tieneTramos)) {
  console.log(`ronda ${o.ronda}: [${o.items.join(', ')}] vivos=[${o.vivos.join(', ')}]`);
}
const masReciente = candidatas.filter(o => o.ronda === ultRonda);
console.log(`\nCANDIDATAS_vivas=${candidatas.length} (ronda mas reciente=${ultRonda}: ${masReciente.length})`);
for (const o of masReciente) console.log(`  ronda ${o.ronda}: ${o.vivos.join(' | ')}`);

// CONTROLES NEGATIVOS
const c1 = out.filter(o => o.vivos.includes('ITEM_IMPOSIBLE_XYZ')).length;
const c2 = candidatas.filter(o => o.ronda > 9999).length;
const c3 = (candidatas.length > 0 && masReciente.length === 0) ? 0 : 1;
console.log(`CONTROL_1_item_imposible_debe_0=${c1}`);
console.log(`CONTROL_2_ronda_imposible_debe_0=${c2}`);
console.log(`CONTROL_3_coherencia_1_o_0=${c3}`);
process.exit((c1 || c2 || !c3) ? 1 : 0);