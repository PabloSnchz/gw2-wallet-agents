/* tests/hb134-cuento-po-refs.test.js
 *
 * El conteo de propuestas del PO (paso 3 del heartbeat) se hace sobre la UNION
 * de las ramas `po/*`. Esas ramas son lo unico del PO que se puede leer sin
 * pedirle nada, y son append-only por construccion: es la unica fuente fiable.
 *
 * EL BUG: `tools/hb116-union-po.mjs` tiene la lista de refs ESCRITA A MANO
 * (9 entradas). `git ls-remote --heads origin "refs/heads/po/*"` devuelve 15.
 * Faltan 6, y entre las que faltan estan TODAS las de poda, que son las rondas
 * mas nuevas. O sea: el conteo corria sobre un subconjunto y el numero que
 * salia era una propiedad de la lista escrita a mano, no del PO.
 *
 * Ya se habia avisado dos veces. ALERT-170 (HB#131) lo dijo textual: "leer las
 * refs del PO con ls-remote, nunca la lista a mano". El HB#132 lo ilumino otra
 * vez contando 4 sobre el mismo archivo. Y el numero cambio entre ciclos sin
 * que cambiara el PO -- la rama seguia en el mismo commit. Esta es la misma
 * clase de las "5 premisas falsas" del HB#131: un numero medido contra un
 * conjunto elegido por el que mide.
 *
 * QUE MIDE ESTE TEST, y que NO mide:
 *   - Mide: que el script NO tenga una lista literal de refs, y que las derive
 *     de `git ls-remote`.
 *   - NO mide: cuantos items tiene el backlog del PO. Ese numero cambia con
 *     cada ronda y por eso no puede ser una asercion.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function eq(a, b, msg) { ok(a === b, msg + (a === b ? '' : '  (obtenido ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b) + ')')); }

const RUTA = path.join(__dirname, '..', 'tools', 'hb116-union-po.mjs');
const txt = fs.readFileSync(RUTA, 'utf8');

console.log('\n[1] el script de conteo del PO no puede tener las refs escritas a mano');

// Una ref literal es un string que empieza por 'origin/po/' o 'po/' dentro de
// comillas. Se buscan SOLO en el array `fuentes`, que es donde vive la lista.
const iFuentes = txt.indexOf('const fuentes');
ok(iFuentes >= 0, 'el script declara `const fuentes`');
const bloqueFuentes = iFuentes >= 0 ? txt.slice(iFuentes, txt.indexOf(']', iFuentes) + 1) : '';
const literales = (bloqueFuentes.match(/['"](?:origin\/)?po\/[a-z0-9-]+['"]/g) || []);
eq(literales.length, 0, 'el array `fuentes` no contiene NINGUNA ref literal (hoy tiene ' + literales.length + ')');

console.log('\n[2] y en su lugar las deriva de ls-remote');
ok(/ls-remote/.test(txt), 'el script invoca `git ls-remote`');
ok(/refs\/heads\/po\/\*/.test(txt), 'el glob que pide es `refs/heads/po/*` (las ramas del PO, no una lista)');
ok(!/po\/hb\d+/.test(txt), 'el archivo no menciona ninguna rama por nombre (po/hbNN+)');

console.log('\n[3] CONTROL NEGATIVO: el detector de refs literales discrimina');
// Positivo: una lista a mano tiene que ser detectada.
const falso = "const fuentes = ['origin/main', 'origin/po/hb99-dashboard', 'origin/po/hb87-dashboard'];";
const iF = falso.indexOf('const fuentes');
const blkF = falso.slice(iF, falso.indexOf(']', iF) + 1);
const litF = (blkF.match(/['"](?:origin\/)?po\/[a-z0-9-]+['"]/g) || []);
ok(litF.length === 2, 'una lista a mano de 2 refs SÍ se detecta (control positivo)');
ok(!/ls-remote/.test(falso), 'un guion sin ls-remote da negativo (control negativo)');

console.log('\n[4] la verdad de fondo: cuantas refs hay HOY');
let refs = [];
try {
  const out = execSync('git ls-remote --heads origin "refs/heads/po/*"', { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  refs = out.split('\n').filter((l) => l.trim());
} catch (e) {
  console.log('  (sin red: se omite la comprobacion de la verdad de fondo)');
}
if (refs.length) {
  ok(refs.length > 9, 'hay MAS de 9 refs po/* (' + refs.length + '): la lista a mano de 9 era incompleta de origen');
  const pods = refs.filter((l) => /poda/.test(l));
  ok(pods.length > 0, 'entre ellas hay ramas de poda (' + pods.length + '), que son las rondas mas nuevas y NO estaban en la lista');
}

console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
