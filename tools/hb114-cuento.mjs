// HB#114 - conteo del paso 3 (criterio del PO, delegated en HB#102 fila 113)
// Fuente: rama MAS RECIENTE del PO (append-only), no main.
// Control obligatorio: un criterio imposible debe dar 0.
import { readFileSync } from 'node:fs';

const txt = readFileSync(process.argv[2], 'utf8');
const lines = txt.split(/\r?\n/);

// Secciones "## ACTUALIZACION ... ronda N"
const heads = [];
for (let i = 0; i < lines.length; i++) {
  if (/^##\s*ACTUALIZACION/i.test(lines[i])) {
    const m = lines[i].match(/ronda\s+(\d+)/i);
    heads.push({ line: i, ronda: m ? +m[1] : null, head: lines[i] });
  }
}

function seccionDe(idx) {
  let start = 0;
  for (const h of heads) if (h.line <= idx) start = h.line;
  let end = txt.length;
  for (const h of heads) if (h.line > idx) { end = h.line; break; }
  return lines.slice(start, end).join('\n');
}

const out = [];
for (const h of heads) {
  const sec = seccionDe(h.line);
  const tramos = /^#{1,4}\s*.*Tramos/im.test(sec) || /###\s*Tramos/i.test(sec);
  const cerrada = /^.*\b(aplicada|cerrada)\b.*$/im.test(sec);
  // Titulos de idea dentro de la seccion
  const ideas = [...sec.matchAll(/^#{3,4}\s+(.+)$/gm)].map(m => m[1].trim()).slice(1);
  out.push({ ronda: h.ronda, tramos, cerrada, cuenta: tramos && !cerrada, ideas });
}

const cuenta = out.filter(o => o.cuenta);
const cerradas = out.filter(o => o.cerrada && o.tramos);

console.log(`lineas=${lines.length} secciones_ronda=${heads.length} tramos=${out.filter(o=>o.tramos).length}`);
console.log(`CUENTA=${cuenta.length} CERRADAS=${cerradas.length}`);
console.log('--- CUENTAN ---');
for (const o of cuenta) console.log(`ronda ${o.ronda}: ${o.ideas.join(' | ').slice(0, 200)}`);
console.log('--- NO CUENTAN ---');
for (const o of out.filter(x => !x.cuenta)) console.log(`ronda ${o.ronda}: tramos=${o.tramos} cerrada=${o.cerrada}`);

// CONTROL NEGATIVO: el mismo criterio sobre un texto que NO debe contar nada
const ctl = '## ACTUALIZACION ronda 99\n\nsin tramos, sin nada\n';
const ctlCuentas = /###\s*Tramos/i.test(ctl) && !/^.*\b(aplicada|cerrada)\b.*$/im.test(ctl);
console.log(`CONTROL_NEGATIVO_debe_ser_0=${ctlCuentas ? 1 : 0}`);

// CONTROL NEGATIVO 2: un criterio imposible (exigir "### TramosImposibles")
const impos = out.filter(o => /###\s*TramosImposibles/i.test(seccionDe(o.line))).length;
console.log(`CONTROL_NEGATIVO_2_debe_ser_0=${impos}`);

process.exit(cuenta.length === 0 || ctlCuentas !== 0 || impos !== 0 ? 1 : 0);