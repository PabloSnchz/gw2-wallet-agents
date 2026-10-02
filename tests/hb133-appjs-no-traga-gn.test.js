/* tests/hb133-appjs-no-traga-gn.test.js
 *
 * HB#133 — ALERT-197: `app.js` reemplaza `window.__GN__` entero y se come al
 * escritor de T12-b. La regresion esta VIVA en `origin/main` @ 6e5a60c.
 *
 * ── El defecto, medido ──────────────────────────────────────────────────────
 *
 *   index.html:993   raid-tracker.js    defer
 *   index.html:996   strike-tracker.js  defer
 *   index.html:1034  app.js             defer
 *
 *   `defer` conserva el orden del documento, asi que al terminar de cargar:
 *     1. raid-tracker.js:2034  root.__GN__ = root.__GN__ || {}   (defensivo)
 *        raid-tracker.js:2035  root.__GN__.wireViewTogglePair = function
 *     2. strike-tracker.js se carga; NO lee todavia (solo lo hace en runtime)
 *     3. app.js:1432           window.__GN__ = { render, runIconChecks,
 *                                                getSelectedToken }
 *
 *   El paso 3 es una REASIGNACION de objeto entero: no hay guard, no hay merge.
 *   Tira `wireViewTogglePair` con el resto.
 *
 *   Y la lectura de strike-tracker.js:622 es de RUNTIME (dentro de
 *   `ensurePanelContent()`), o sea ocurre mucho despues de que app.js escribio.
 *   Para cuando corre, `__GN__.wireViewTogglePair` es `undefined` -> entra al
 *   `else`, loguea `'escritor comun no disponible; toggle sin cablear'` y sigue.
 *
 *   El `console.debug` es la trampa: no es un error, es un debug. En consola se
 *   ve y parece atendido. El par de Strikes queda con 0 listeners, o sea el
 *   T12-b queda muerto en el arranque, y el `wireStrikeViewToggle` viejo que
 *   este commit borro era el que atendia el click.
 *
 * ── Por que este archivo NO puede fabricar el namespace ──────────────────────
 *
 * ALERT-197, y es la misma costura que ALERT-189 pero un nivel mas arriba:
 * `tests/hb125-t12b-escritor-comun.test.js:188-192` inyecta
 * `window.__GN__ = gn` a mano y NO ejecuta `app.js`. El `__GN__` del test es el
 * que el autor quiere; el `__GN__` del producto es el que queda despues de
 * `app.js:1432`. Por eso ese archivo da 29/0 con el bug vivo, y por eso su
 * fase roja (12/17) fallo por otra razon: en `origin/main` sin el fix, el
 * escritor ni existe, asi que falla de otra cosa.
 *
 *   REGLA: un arnes que fabrica el namespace no puede detectar que OTRO
 *   archivo lo destruye. Si el orden importa, el orden se EJECUTA.
 *
 * ── Como se ejecuta el orden sin hardcodearlo ───────────────────────────────
 *
 * El orden se DERIVA de `index.html` (posicion de cada `<script defer>`), no
 * de una lista escrita a mano. Si alguien reordena los scripts, este test
 * cambia de resultado solo. Es el mismo motivo por el que el conteo del PO se
 * lee con `ls-remote` y no de una lista (ALERT-170).
 *
 * ── CONTROLES ───────────────────────────────────────────────────────────────
 *
 *   (C1) NEGATIVO de orden: correr los hooks al REVES tiene que dar el
 *        resultado sano. Si el test solo pasara en el orden bueno, probaria
 *        el orden y no la propiedad.
 *   (C2) los 3 hooks que app.js publica (`render`, `runIconChecks`,
 *        `getSelectedToken`) tienen que SEGUIR ahi despues del fix. El arreglo
 *        no puede ser "borrar app.js:1432".
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const JS = path.join(ROOT, 'js');
const src = (p) => fs.readFileSync(path.join(JS, p), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m, why) => { if (c) { pass++; console.log('  PASS  ' + m); } else { fail++; console.log('  FAIL  ' + m + (why ? '\n          -> ' + why : '')); } };

// ── 1. Orden de documento, DERIVADO de index.html ───────────────────────────
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scriptLines = [];
{
  const re = /<script[^>]*\bsrc=["']([^"']+\.js)[^>]*>/g;
  let m;
  while ((m = re.exec(html))) {
    scriptLines.push({ file: m[1], line: html.slice(0, m.index).split('\n').length, defer: /\bdefer\b/.test(m[0]) });
  }
}
const lineOf = (f) => { const e = scriptLines.filter(s => s.file.indexOf(f) !== -1)[0]; return e ? e.line : null; };

const lnRaid = lineOf('raid-tracker.js');
const lnStrike = lineOf('strike-tracker.js');
const lnApp = lineOf('app.js');

ok(lnRaid !== null, 'index.html carga raid-tracker.js');
ok(lnStrike !== null, 'index.html carga strike-tracker.js');
ok(lnApp !== null, 'index.html carga app.js');
ok(lnRaid !== null && lnApp !== null && lnRaid < lnApp,
   'raid-tracker.js se declara ANTES que app.js (el escritor se escribe primero)',
   'si app.js se declarara antes, el orden de carga ya no explicaria el defecto y este test midio otra cosa');
ok(lnApp !== null && lnStrike !== null && lnStrike < lnApp,
   'strike-tracker.js se declara ANTES que app.js', null);

// ── 2. Los hooks, VERBATIM, extraidos del producto ─────────────────────────
// Nada de reescribir la asignacion a mano: si se copia, el test puede pasar
// mientras el producto escribe otra cosa.
// Quita comentarios RESPETANDO comillas. Sin esto, el extractor de abajo puede
// encontrar `window.__GN__` dentro de un comentario que explica el bug — que es
// exactamente lo que paso con el comentario de ALERT-197 en app.js. Un extractor
// que lee comentarios no esta midiendo el producto.
function stripComments(s) {
  let out = '', i = 0, q = null;
  while (i < s.length) {
    const c = s[i], n = s[i + 1];
    if (q) { out += c; if (c === '\\') { out += n; i += 2; continue; } if (c === q) q = null; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; out += c; i++; continue; }
    if (c === '/' && n === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++; i += 2; continue; }
    out += c; i++;
  }
  return out;
}

// Extrae la sentencia COMPLETA de app.js que escribe `window.__GN__`, sea de
// la forma que sea: `= {` o `= Object.assign(...)`. Se toma hasta el `;` de
// profundidad 0, asi que el test no esta amarrado a una sintaxis: si el fix
// cambia la forma, el test sigue midiendo el producto.
function extractAppAssignment() {
  const s = stripComments(src('app.js'));
  const i = s.search(/window\.__GN__\s*=[^=]/);
  if (i === -1) return null;
  let depth = 0;
  for (let k = i; k < s.length; k++) {
    const ch = s[k];
    if (ch === '{' || ch === '(' || ch === '[') depth++;
    else if (ch === '}' || ch === ')' || ch === ']') depth--;
    else if (ch === ';' && depth === 0) return s.slice(i, k + 1);
  }
  return null;
}
function extractRaidWiring() {
  const s = src('raid-tracker.js');
  const i = s.indexOf('root.__GN__.wireViewTogglePair =');
  if (i === -1) return null;
  let depth = 0, started = false;
  for (let k = s.indexOf('{', i); k < s.length; k++) {
    const ch = s[k];
    if (ch === '{') { depth++; started = true; }
    else if (ch === '}') { depth--; if (started && depth === 0) return s.slice(i, k + 1); }
  }
  return null;
}
const appAssign = extractAppAssignment();
const raidWiring = extractRaidWiring();

ok(appAssign !== null, 'app.js tiene una asignacion de window.__GN__ extraible');
ok(raidWiring !== null, 'raid-tracker.js publica __GN__.wireViewTogglePair');

// ── 3. Ejecutar los hooks en el orden de documento ─────────────────────────
function runInOrder(order) {
  const sandbox = { window: {}, document: { addEventListener() {}, readyState: 'complete' }, console: { log() {}, debug() {}, info() {} } };
  sandbox.window.window = sandbox.window;
  // En el producto, `root` es el parametro del IIFE de raid-tracker.js:
  // `})(typeof window !== 'undefined' ? window : this)`. O sea `root` ES
  // `window`. Sin este alias el verbatim no es el verbatim.
  sandbox.root = sandbox.window;
  vm.createContext(sandbox);
  for (const which of order) {
    if (which === 'raid') {
      vm.runInContext('window.__GN__ = window.__GN__ || {};\n' + raidWiring, sandbox);
    } else if (which === 'app') {
      // El producto real: `window.__GN__ = { ... }`. Se envuelve en funcion
      // para que `render` / `runIconChecks` puedan ser simbolos sin definir.
      const fn = vm.runInContext('(function(render, runIconChecks){ ' + appAssign + ' })', sandbox);
      fn(function render() {}, function runIconChecks() {});
    }
  }
  return sandbox.window.__GN__;
}

const gnDocOrder = runInOrder(['raid', 'app']);
ok(gnDocOrder !== undefined, 'tras app.js existe window.__GN__');

ok(typeof gnDocOrder.render === 'function',
   'C2: app.js sigue publicando render', '__GN__ = ' + Object.keys(gnDocOrder || {}).join(','));
ok(typeof gnDocOrder.runIconChecks === 'function',
   'C2: app.js sigue publicando runIconChecks');
ok(typeof gnDocOrder.getSelectedToken === 'function',
   'C2: app.js sigue publicando getSelectedToken');

// EL ASERTO CENTRAL
ok(typeof gnDocOrder.wireViewTogglePair === 'function',
   'ALERT-197: __GN__.wireViewTogglePair SOBREVIVE a app.js en el orden real del documento',
   'app.js reescribe window.__GN__ entero y se come el escritor de T12-b; ' +
   'strike-tracker.js:622 cae al else y el par de Strikes queda con 0 listeners');

// ── 4. (C1) CONTROL NEGATIVO DE ORDEN ──────────────────────────────────────
// Al reves, app.js escribe primero y raid-tracker repara despues: sano.
// Si este control NO discriminate, el aserto central de arriba no probaria el
// defecto sino el orden, y seria tan tautologico como el conteo del HB#132.
const gnRevOrder = runInOrder(['app', 'raid']);
ok(typeof gnRevOrder.wireViewTogglePair === 'function',
   'C1 (control de orden, al reves): el escritor tambien queda disponible',
   'si el orden inverso NO queda sano, el test de arriba esta midiendo el orden de los scripts, no la propiedad');
ok(typeof gnRevOrder.getSelectedToken === 'function',
   'C1: getSelectedToken sobrevive tambien en el orden inverso');

// ── 5. Conteo de escritores del namespace (por que el fix es de una linea) ─
{
  const writers = [];
  fs.readdirSync(JS).filter(f => f.endsWith('.js')).forEach(f => {
    const s = src(f).split('\n');
    s.forEach((l, i) => {
      if (/^\s*(\/\/|\*)/.test(l)) return;
      if (/(__GN__\s*=[^=])|(__GN__\.[A-Za-z_$][\w$]*\s*=[^=])/.test(l)) writers.push(f + ':' + (i + 1));
    });
  });
  const destructivos = writers.filter(w => { const s = src(w.split(':')[0]).split('\n'); const l = s[+w.split(':')[1] - 1]; return /window\.__GN__\s*=\s*\{/.test(l); });
  const archivos = [...new Set(writers.map(w => w.split(':')[0]))];
  ok(archivos.length === 2,
     'hay 2 ARCHIVOS que escriben __GN__ (raid-tracker lo publica, app.js lo reemplaza)',
     'escritores: ' + writers.join(' '));
  ok(writers.length === 3,
     'son 3 lineas: 1 reemplazo en app.js + el guard defensivo y la publicacion en raid-tracker',
     'escritores: ' + writers.join(' '));
  ok(destructivos.length === 0,
     'NINGUN escritor de __GN__ reemplaza el objeto entero (el que lo hacia era app.js)',
     'reemplazos enteros: ' + destructivos.join(' ') + '  <- un `= {` sin merge se come lo que otro escribio antes');
}

console.log('\n  ' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail === 0 ? 0 : 1);
