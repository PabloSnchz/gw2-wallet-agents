// Census de CJK. Compara el ARBOL DE TRABAJO contra origin/main.
//
// Por que node y no powershell: los dos intentos anteriores dieron 0 en
// origin/main con 162 reales en el worktree, que es imposible que sea verdad.
// La razon es el camino, no los datos: `git show ... > archivo` (shell) y
// `(git show ...)` (PowerShell) ambos recodifican la salida, y el resultado
// es un conteo de 0 que parece una respuesta y no lo es. Un control que
// devuelve "todo limpio" cuando hay 162 cosas sucias es peor que no
// correrlo: hace creer que el archivo esta bien.
//
// REGLA: un censo que se ejecuta por un canal que puede recodificar NO es un
// censo. O se lee el archivo, o se lee el blob con bytes crudos.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ARCHIVOS = ['TEAM_STATUS.md', 'ALERTS_LOG.md', 'SESSION_LOG.md', 'COMMS_LOG.md'];

function esCJK(cp) { return cp > 0x2E00 && cp < 0xFFEF; }

function contarCjk(s) {
  let n = 0, muestras = new Set();
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (esCJK(cp)) { n++; if (muestras.size < 4) muestras.add('U+' + cp.toString(16).toUpperCase()); }
  }
  return { n, muestras };
}

let fail = 0;
const filas = [];

for (const f of ARCHIVOS) {
  const wt = readFileSync(f, 'utf8');
  const blob = execFileSync('git', ['show', 'origin/main:' + f], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  const a = contarCjk(blob), b = contarCjk(wt);
  const introducidos = b.n - a.n;
  filas.push({ f, main: a.n, wt: b.n, dif: introducidos });
  console.log(`  ${f.padEnd(20)} origin/main=${String(a.n).padStart(4)}  worktree=${String(b.n).padStart(4)}  delta=${introducidos >= 0 ? '+' : ''}${introducidos}`);
  if (introducidos > 0) {
    fail++;
    console.log(`     -> INTRODUJE ${introducidos} CJK. Muestras en el worktree: ${[...b.muestras].join(' ') || '(ninguna, revisar el rango)'}`);
  }
}

// CONTROL NEGATIVO (ALERT-154): el metodo tiene que poder dar un numero que
// NO sea 0. Si rastreo un archivo que se que esta sucio y el metodo dice 0,
// el metodo esta roto y todo lo de arriba no midio nada.
const control = execFileSync('git', ['show', 'origin/main:ALERTS_LOG.md'], { encoding: 'utf8' });
const controlN = contarCjk(control).n;
console.log('');
console.log(`  CONTROL: ALERTS_LOG.md de origin/main leido como bytes crudos -> ${controlN}`);
if (controlN === 0) {
  console.log('  -> CONTROL FALLIDO: el metodo no puede ver CJK. Todo lo de arriba es ruido.');
  fail++;
} else {
  console.log('  -> el metodo SI ve CJK, asi que los ceros de arriba son ceros reales.');
}

console.log('');
console.log(fail ? `${fail} PROBLEMA(S)` : 'OK: 0 CJK introducidos por mi');
process.exit(fail ? 1 : 0);