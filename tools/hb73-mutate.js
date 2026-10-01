// hb73 mutation harness: prove the two guards can FAIL, then restore byte-exact.
// NEVER uses git checkout (that pulls from the index and ate the hb72 fix).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const AP = path.join(ROOT, 'js/accounts-panel.js');
const T = path.join(ROOT, 'tests/idea64-dos-pestanas.test.js');

const ORIGINAL = fs.readFileSync(AP, 'utf8');
function restore() {
  fs.writeFileSync(AP, ORIGINAL, 'utf8');
  const ahora = fs.readFileSync(AP, 'utf8');
  if (ahora !== ORIGINAL) {
    console.log('ABORT: restore is not byte-identical');
    process.exit(2);
  }
}
function run() {
  try {
    return execFileSync(process.execPath, [T], { encoding: 'utf8', cwd: ROOT });
  } catch (e) { return (e.stdout || '') + (e.stderr || ''); }
}
function guardState(out) {
  return {
    guard1: /FAIL {2}la region vigilada/.test(out),
    guard2: /FAIL {2}cuerpoDeMetodo no esta contando/.test(out),
    negativo: /FAIL {2}syncAccountTagsToKeys\(\) NO lee la legacy/.test(out),
    positivo: /FAIL {2}syncAccountTagsToKeys\(\) ESCRIBE por Storage/.test(out),
  };
}
const ancla = "      var keys = Storage.get(Storage.STORAGE_KEYS.ACCOUNT_KEYS) || [];";
if (ORIGINAL.split(ancla).length - 1 !== 1) {
  console.log('ABORT: anchor is not unique');
  process.exit(2);
}

console.log('=== BASE (fix puesto) ===');
let s = guardState(run());
console.log('  guard1 FAIL=' + s.guard1 + '  guard2 FAIL=' + s.guard2 +
            '  negativo FAIL=' + s.negativo + '  positivo FAIL=' + s.positivo);

// ── M1: el bug CRUDO escondido detras de un `//` de una literal ────────────
// Esta es la direccion del fallo que la ALERT-91 declaraba imposible.
const m1 = "      var u = 'https://x' + a; var keys = localStorage.getItem('gw2_keys');";
fs.writeFileSync(AP, ORIGINAL.replace(ancla, m1), 'utf8');
console.log('');
console.log('=== M1: LECTOR CRUDO en una linea con `//` dentro de una literal ===');
s = guardState(run());
console.log('  guard1 FAIL=' + s.guard1 + '   <-- luz roja: la guarda atrapa lo que el stripper oculta');
console.log('  negativo FAIL=' + s.negativo + '   <-- SIN la guarda, el assert negativo PASARIA con el bug');
console.log('  positivo FAIL=' + s.positivo);
restore();

// ── M2: una llave dentro de la prosa ──────────────────────────────────────
const m2 = ancla + "\n      // ejemplo en prosa: { esto abre una llave y el extractor la cuenta";
fs.writeFileSync(AP, ORIGINAL.replace(ancla, m2), 'utf8');
console.log('');
console.log('=== M2: llave desbalanceada DENTRO de un comentario ===');
s = guardState(run());
console.log('  guard2 FAIL=' + s.guard2);
console.log('  guard1 FAIL=' + s.guard1);
restore();

// ── M3: la guarda tautologica que el Reviewer propondia ───────────────────
// llavesBalancean(cuerpoRAW) === 0 SIEMPRE, con y sin bug. Se demuestra.
function netBraces(c) {
  let d = 0; for (const ch of c) { if (ch === '{') d++; else if (ch === '}') d--; }
  return d;
}
const iSync = ORIGINAL.indexOf('function syncAccountTagsToKeys');
let depth = 0, visto = false, corte = ORIGINAL.length;
for (let i = iSync; i < ORIGINAL.length; i++) {
  const c = ORIGINAL[i];
  if (c === '{') { depth++; visto = true; }
  else if (c === '}') { depth--; if (visto && depth === 0) { corte = i + 1; break; } }
}
console.log('');
console.log('=== M3: la guarda TAUTOLOGICA propuesta (llavesBalancean del crudo) ===');
console.log('  net braces of RAW (fix puesto): ' + netBraces(ORIGINAL.slice(iSync, corte)) + '  -> PASS');
console.log('  (no se puede construir un caso que la haga fallar: corte = ' + corte + ', iSync = ' + iSync + ')');

restore();
console.log('');
console.log('=== RESTAURADO, byte a byte ===');
console.log('  ' + (fs.readFileSync(AP, 'utf8') === ORIGINAL));
const final = run();
console.log('  suite final: ' + (final.match(/(\d+) pass \/ (\d+) FAIL/) || []).slice(1).join(' / '));