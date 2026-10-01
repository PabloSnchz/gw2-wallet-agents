// HB#114 - volcar los Tramos de las secciones que CUENTAN, para leer que propone
// cada una (un conteo sin leer el tramo no manda nada al Reviewer).
import { readFileSync } from 'node:fs';
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
  let start = 0; for (const h of heads) if (h.line <= idx) start = h.line;
  let end = lines.length; for (const h of heads) if (h.line > idx) { end = h.line; break; }
  return lines.slice(start, end);
}
const seen = new Set();
for (const h of heads) {
  const body = sec(h.line).join('\n');
  const tramos = /###\s*Tramos/i.test(body);
  const cerrada = /^.*\b(aplicada|cerrada)\b.*$/im.test(body);
  if (!tramos || cerrada) continue;
  const k = h.ronda + '@' + h.line;
  if (seen.has(k)) continue; seen.add(k);
  console.log(`\n########## ronda ${h.ronda}  (offset ${h.line}) ##########`);
  const ti = body.search(/###\s*Tramos/i);
  console.log(body.slice(ti, ti + 1800));
}