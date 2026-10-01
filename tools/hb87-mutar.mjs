/* =======================================================================
 * tools/hb87-mutar.mjs  -  el test de la carrera tiene dientes?
 *
 * Un test verde no prueba nada si el defecto vuelve y sigue verde. Este
 * script aplica MUTACIONES al js/app.js REAL (sobre una copia en memoria),
 * corre el test contra cada una, y exige que cada una rompa el test.
 *
 * Se opera sobre una COPIA: el archivo del disco no se toca. La copia se
 * hace reescribiendo el REPO apuntando a un arbol temporal, asi que el test
 * lee la copia y no el original.
 *
 * Uso: node tools/hb87-mutar.mjs
 * ======================================================================= */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..');
const TEST = path.join(REPO, 'tests/hb87-carga-gana.test.js');
const APP = path.join(REPO, 'js/app.js');
const original = fs.readFileSync(APP, 'utf8');

const MUTACIONES = [
  ['se saca la guarda por completo',
   s => s.replace(/\n\s*if\s*\(mine !== loadSeq\)\s*return;/, '')],
  ['la guarda se pone FUERA del try (el finally deja de cerrar el toast viejo)',
   s => s.replace(/(\n(\s*)try \{[\s\S]*?\n\s*const \[acct, w\][\s\S]*?)\n\s*if\s*\(mine !== loadSeq\)\s*return;/,
                '$1')],
  ['la guarda se aplica solo al accountName, no al wallet',
   s => s.replace('if (mine !== loadSeq) return;',
                  'if (mine !== loadSeq) { state.accountName = acct?.name || \'—\'; return; }')],
  ['el toast vuelve a no decir de que cuenta es',
   s => s.replace(/_label \? `Cargando wallet de \$\{_label\}…` : /, '')],
  ['la guarda compara el token en vez de la secuencia (no detecta la carrera)',
   s => s.replace('if (mine !== loadSeq) return;', 'if (token !== KeyManager.selected) return;')],
];

let malas = 0;
for (const [nombre, fn] of MUTACIONES) {
  const mutado = fn(original);
  if (mutado === original) {
    console.log('  NULO  ' + nombre + '   (la sustitucion no matcheo: la mutacion no probo nada)');
    malas++;
    continue;
  }
  // Arbol temporal: se copia js/ y tests/ y se corre el test ahi.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hb87-'));
  fs.mkdirSync(path.join(tmp, 'js'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'tests'), { recursive: true });
  fs.copyFileSync(TEST, path.join(tmp, 'tests/hb87-carga-gana.test.js'));
  fs.writeFileSync(path.join(tmp, 'js/app.js'), mutado, 'utf8');

  let out = '', code = 0;
  try {
    out = execFileSync(process.execPath, [path.join(tmp, 'tests/hb87-carga-gana.test.js')],
                      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
    code = e.status === undefined ? -1 : e.status;
  }
  const m = out.match(/(\d+) pass, (\d+) FAIL/);
  const nFail = m ? Number(m[2]) : -1;
  const rota = code !== 0 || nFail > 0;
  console.log('  ' + (rota ? 'ROTA ' : 'SIGUE VERDE ') + nombre +
              (nFail >= 0 ? '   (' + nFail + ' FAIL)' : '   (sin resumen, exit ' + code + ')'));
  if (!rota) malas++;
  fs.rmSync(tmp, { recursive: true, force: true });
}

// Control: el archivo SIN mutar tiene que dar verde. Sin esta linea, un test
// que falla con todas las mutaciones por un motivo no relacionado tambien
// "pasa" este script.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hb87-ctl-'));
fs.mkdirSync(path.join(tmp, 'js'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'tests'), { recursive: true });
fs.copyFileSync(TEST, path.join(tmp, 'tests/hb87-carga-gana.test.js'));
fs.writeFileSync(path.join(tmp, 'js/app.js'), original, 'utf8');
let ctl = '';
try { ctl = execFileSync(process.execPath, [path.join(tmp, 'tests/hb87-carga-gana.test.js')],
                         { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
catch (e) { ctl = (e.stdout || '') + (e.stderr || ''); }
const m2 = ctl.match(/(\d+) pass, (\d+) FAIL/);
const verde = m2 && Number(m2[2]) === 0;
console.log('  ' + (verde ? 'CONTROL OK ' : 'CONTROL ROTO ') + 'el archivo sin mutar da ' +
            (m2 ? m2[1] + ' pass, ' + m2[2] + ' FAIL' : 'sin resumen'));
if (!verde) malas++;
fs.rmSync(tmp, { recursive: true, force: true });

console.log('\n' + (malas === 0 ? 'TODAS LAS MUTACIONES ROMPEN EL TEST' : malas + ' PROBLEMA(S)'));
process.exit(malas === 0 ? 0 : 1);
