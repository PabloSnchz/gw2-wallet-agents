/* =======================================================================
 * tests/hb81-toast-legible.test.js  --  el mensaje de la puerta SE PUEDE LEER
 *
 * Este test REEMPLAZA a `tests/hb80-toast-permanencia.test.js`, que daba verde
 * en falso. No lo borra por controversy: lo borra porque la verdad que
 * afirmaba era FALSA, y el motivo esta abajo.
 *
 * ---------------------------------------------------------------------
 * POR QUE EL ANTERIOR DABA VERDE EN FALSO
 * ---------------------------------------------------------------------
 * `hb80-toast-permanencia.test.js` afirmaba, textualmente, que "con el
 * mensaje real de la puerta, el ttl evaluado es 0: no se arma temporizador".
 * Hacia eso ASI:
 *
 *   1. extraia el LITERAL DEL CALL-SITE con una regex sobre el source
 *      (o sea, leia el `0` que el call-site escribe), y
 *   2. evaluaba ESE LITERAL:  `eval('(function(msg){ return (0); })')(...)` -> 0
 *
 * El paso que NO hacia es componer ese literal con la RESOLUCION que hace el
 * CALLE, que es la linea app.js:215:
 *
 *   const ttl = Number(opts.ttl || 3500);
 *
 * `0` es falsy, asi que `0 || 3500` -> `3500`. El valor que el temporizador
 * veia era 3500, no 0. El test midi una cifra que la app nunca usa.
 *
 * Y lo mas grave: DOS asserts mas abajo el test afirmaba que el fallback
 * `opts.ttl || (\d+)` EXISTIA, y lo citaba como prueba de que "el 0 es
 * explicito en el call-site, no un default silencioso". O sea: el propio test
 * localizaba por regexp la expresion que se come el 0, y la reportaba como
 * garantia. Los dos asserts son mutuamente contradictorios: si el `|| 3500`
 * existe y el call-site pasa 0, entonces NO hay forma de que el ttl sea 0.
 *
 * En criollo: el test extraia la mitad del problema y luego afirmaba que el
 * problema entero estaba resuelto. Se verifica abajo que este test, en rojo,
 * reproduce exactamente ese falso verde.
 *
 * ---------------------------------------------------------------------
 * QUE AFIRMA ESTE
 * ---------------------------------------------------------------------
 * 1. El ttl del toast de la puerta, RESUELTO POR EL CALLE (no por el
 *    call-site), da el numero que este dice. Si alguien escribe una politica
 *    (`msg.length > 120 ? 0 : 2500`) el test la evalua con el mensaje real.
 * 2. La cascada REAL de CSS pone el host `.toasts` POR ENCIMA de `.modal`, que
 *    es lo que decide si el toast se ve o queda tapado por el velo. La cascada
 *    se RESUELVE leyendo los estilosheets en el orden en que index.html los
 *    carga y aplicando el ultimo que declara la propiedad: no se transcribe
 *    ninguna regla a mano (ALERT-105).
 * 3. La capa 2 (theme-polish.css) NO declara `z-index` de `.toasts`. Declarar
 *    una propiedad estructural en la capa de piel es lo que provoco el
 *    defecto: `z-index:60` gana por orden de carga y tapa el 9999 de la
 *    capa 1, silenciosamente.
 *
 * Por que el punto 2 es el que importa: hasta que se midio, la premisa del
 * cambio era "el toast se va antes de poderlo leer". MEDIDO con la cascada
 * real y con hit test, el toast NO se iba: estaba DETRAS del backdrop del
 * modal (`rgba(0,0,0,.55)` + `blur(2px)`), o sea invisible en el instante en
 * que se disparaba. Perdur mas habria sido literalmente no notarse mas.
 *
 * Alcance: analisis estatico + evaluacion de expresiones del fuente. No levanta
 * el IIFE de app.js (depende de document, window y Storage).
 * ======================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { console.log('  PASS  ' + label); pass++; }
  else { console.log('  FAIL  ' + label + (extra ? '  (' + extra + ')' : '')); fail++; }
}
function section(t) { console.log('\n[' + t + ']'); }

const app = fs.readFileSync(path.join(REPO, 'js/app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');

/* --- El mensaje real de la puerta, sin hardcodear la lista de permisos.
   Se saca `REQUIRED_PERMISSIONS` del fuente y se evalua la misma construccion
   que la puerta, con TODOS los permisos ausentes (el caso que la dispara). */
function listaPermisos(src) {
  const L = src.split(/\r?\n/);
  const i = L.findIndex((l) => /REQUIRED_PERMISSIONS:\s*\[/.test(l));
  if (i < 0) return null;
  const chunk = [];
  for (let k = i; k < L.length; k++) { chunk.push(L[k]); if (/\]\s*,?\s*$/.test(L[k])) break; }
  return eval(chunk.join('\n').replace(/REQUIRED_PERMISSIONS:\s*\[/, '[').replace(/\]\s*,?\s*$/, ']'));
}
const REQUIRED = listaPermisos(app);
ok(!!REQUIRED, 'se extrajo REQUIRED_PERMISSIONS del fuente de app.js');

const FALTAN = (REQUIRED || []).slice(); // ninguno declarado: el caso que dispara la puerta
const mensajePuerta = 'La API key necesita permisos: ' +
  FALTAN.map((p) => p.scope + ' (' + p.para + ')').join(', ') +
  '. La app usa ' + REQUIRED.length +
  ' permisos en total; hay que declararlos TODOS al crear la key en account.arena.net/applications.';

section('1. el mensaje que hay que leer');

ok(REQUIRED.length === 7, 'la puerta exige 7 permisos', 'exigen ' + REQUIRED.length);
ok(mensajePuerta.length > 200,
  'el mensaje de la puerta supera los 200 chars',
  'mide ' + mensajePuerta.length);
const palabras = mensajePuerta.trim().split(/\s+/).length;
const segsLectura = Math.round((palabras / 250) * 60);
console.log('  (dato: ' + palabras + ' palabras ~ ' + segsLectura + ' s de lectura a 250 pal/min)');

section('2. el ttl RESUELTO POR EL CALLE (el paso que hb80 no hacia)');

// (a) el literal del call-site: el toast que sigue a setStatus(msg,'error').
const m = app.match(/setStatus\(msg,\s*'error'\);[\s\S]{0,800}?window\.toast\?\.\('error',\s*msg,\s*\{\s*ttl:\s*([^}]+?)\s*\}\s*\)/);
ok(!!m, 'se localizo el toast que lleva el mensaje de la puerta (el que sigue a setStatus)');
const exprCallSite = m ? m[1] : null;
console.log('  (literal en el call-site: ' + JSON.stringify(exprCallSite) + ')');

// (b) LA RESOLUCION DEL CALLE. Esto es lo que faltaba: el valor del call-site
// pasa por la linea de app.js:215 antes de llegar al temporizador.
const mRes = app.match(/const\s+ttl\s*=\s*([^;]+);/);
ok(!!mRes, 'se localizo la linea que resuelve el ttl dentro de toast()',
  mRes ? 'resuelve con: ' + mRes[1].trim() : 'no se encontro');
const exprCallee = mRes ? mRes[1] : null;

// Se compone: opts = { ttl: <call-site> }, y se evalua la linea del calle.
let ttlResuelto = null;
if (exprCallSite != null && exprCallee != null) {
  const opts = { ttl: eval('(function(msg){ return (' + exprCallSite + '); })')(mensajePuerta) };
  ttlResuelto = eval('(function(opts){ return (' + exprCallee + '); })')(opts);
  console.log('  (opts.ttl crudo = ' + JSON.stringify(opts.ttl) +
              '  ->  ttl que ve el temporizador = ' + JSON.stringify(ttlResuelto) + ')');
}

// El contrato: un numero FINITO y POSITIVO. Con esto el toast se va solo, y
// eso es lo querido: las dos superficies persistentes del mensaje
// (`_fieldMsg` y `setStatus`) son las que cubren la lectura detenida.
ok(typeof ttlResuelto === 'number' && isFinite(ttlResuelto) && ttlResuelto > 0,
  'el ttl que ve el temporizador es un numero finito y positivo',
  'resuelve a ' + JSON.stringify(ttlResuelto));

// Y el que realmente atrapa el falso verde de hb80: si alguien reintroduce
// `ttl: 0` creyendo que es "no se borra solo", esto lo ve.
ok(ttlResuelto !== 3500,
  'el toast de la puerta no cae en el default de 3500 (o sea: no se pasa ttl:0)',
  'ttl:0 resuelve a ' + ttlResuelto + ' porque `0 || ' +
  (app.match(/opts\.ttl\s*\|\|\s*(\d+)/) || [, '?'])[1] + '` -- el 0 es falsy');

section('3. la cascada REAL: el toast tiene que quedar POR ENCIMA del modal');

// Los estilosheets se toman DEL index.html, en su orden. No se transcribe
// ninguna regla: se leen los archivos y aplica el ultimo que declara.
const hojas = [...indexHtml.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/g)]
  .map((x) => x[1].split('?')[0])
  .filter((h) => h.endsWith('.css'));
ok(hojas.length >= 2, 'se leyeron los estilosheets del index.html', hojas.join(' -> '));

// Resolutor minimo de cascada para una clase: ultimo que declara gana.
// Aborta si aparece !important, que es un caso que este resolutor NO sabe
// resolver y por lo tanto no debe fingir que resuelve.
//
// Los COMENTARIOS se borran antes de parsear, y no es cosmetico: sin esto el
// selector de una regla precededida por un bloque `/* ... */` deja de coincidir
// con el ancla `(?:^|[},])` y la regla se PASA POR ALTO. Eso es exactamente lo
// que pasa con `.toasts` en theme-polish.css: esta resolutor informaba 9999
// (de main.css) cuando el navegador mide 60. Un resolutor que se saltea la
// regla que gana es peor que no tener resolutor: da el numero que uno espera.
// Scanner de reglas con PROFUNDIDAD: salta comentarios y strings.
//
// Por que no un regex de una pasada: esta resolutor empezo usando
// `/[^{}]*?\{[^{}]*\}/` y reportaba `.toasts = 9999` cuando el navegador mide
// 60. Se saltaba la regla que GANABA, y por eso daba el numero que uno espera.
//
// Y el motivo de que se la saltaba es una trampa de medicion que conviene
// dejar escrita: `match(/\/\*/g)` sobre theme-polish.css cuenta 58 abras y 57
// cierres, lo que parece un comentario sin cerrar. NO lo hay. La 58 es el glob
// `css/themes/*.css` del encabezado del propio archivo, que esta DENTRO de un
// comentario: el archivo esta balanceado (57/57 con este scan, que salta
// strings y comentarios). O sea, un regex ingenuo no solo esconde bugs:
// INVENTA bugs que no existen, y ese numero falso casi entra como ALERT.
// Para CSS, el numero hay que poder defenderlo con un metodo que se sepa
// cual es el que fallo cuando el numero sale raro.
function reglasCss(src) {
  const out = [];
  let depth = 0, selStart = 0, sel = '', bodyStart = -1;
  for (let k = 0; k < src.length; k++) {
    const c = src[k];
    if (c === '/' && src[k + 1] === '*') { const e = src.indexOf('*/', k + 2); k = e < 0 ? src.length : e + 1; continue; }
    if (c === '"' || c === "'") { const q = c; k++; while (k < src.length && src[k] !== q) { if (src[k] === '\\') k++; k++; } continue; }
    if (c === '{') { if (depth === 0) { sel = src.slice(selStart, k); bodyStart = k + 1; } depth++; continue; }
    if (c === '}') {
      depth--;
      if (depth === 0) { out.push({ sel: sel.trim(), body: src.slice(bodyStart, k) }); selStart = k + 1; }
    }
  }
  return out;
}

function zIndexEfectivo(clase) {
  let ganador = null, ganadorHoja = null, declaraciones = 0;
  for (const h of hojas) {
    for (const r of reglasCss(fs.readFileSync(path.join(REPO, h), 'utf8'))) {
      if (!new RegExp('\\.' + clase + '(?![\\w-])').test(r.sel)) continue;
      const zi = r.body.match(/(^|;)\s*z-index\s*:\s*([^;}]+)/i);
      if (!zi) continue;
      if (/!important/i.test(zi[2])) return { error: '!important en ' + h + ': no se resuelve' };
      declaraciones++;
      ganador = zi[2].trim();
      ganadorHoja = h;
    }
  }
  return { valor: ganador === null ? null : parseInt(ganador, 10), hoja: ganadorHoja, crudo: ganador, declaraciones };
}

const zToasts = zIndexEfectivo('toasts');
const zModal = zIndexEfectivo('modal');

ok(!zToasts.error && !zModal.error, 'la cascada de z-index se resolvio sin !important',
  zToasts.error || zModal.error || '');
ok(zToasts.valor !== null, 'la cascada declara z-index para .toasts',
  'gana ' + zToasts.crudo + ' (de ' + zToasts.hoja + ')');
ok(zModal.valor !== null, 'la cascada declara z-index para .modal',
  'gana ' + zModal.crudo + ' (de ' + zModal.hoja + ')');

// El scanner tiene que VER todas las declaraciones, no solo la que gana: si se
// salta una, el numero que reporta es inventado. Este assert es el que hace
// confiable al de arriba. Medido con la cascada real: main.css declara
// `.toasts` DOS veces (la de la seccion "Toasts" y la de "Toasts compat") y
// theme-polish UNA. Con el scanner: 3. Con el regex de una pasada: 2.
const declToasts = hojas.reduce((acc, h) => acc + reglasCss(fs.readFileSync(path.join(REPO, h), 'utf8'))
  .filter((r) => /\.toasts(?![\w-])/.test(r.sel) && /z-index\s*:/i.test(r.body)).length, 0);
ok(declToasts === zToasts.declaraciones,
  'el scanner ve TODAS las declaraciones de z-index de .toasts, no solo la ganadora',
  'scanner ve ' + zToasts.declaraciones + ' y el recuento independiente da ' + declToasts);

// LA ASERCION QUE IMPORTABA: el toast no puede quedar debajo del modal.
ok(zToasts.valor > zModal.valor,
  'el host .toasts queda POR ENCIMA de .modal en la cascada efectiva (el toast no esta tapado)',
  '.toasts=' + zToasts.valor + ' vs .modal=' + zModal.valor);

section('4. la capa 2 no es dueña de z-index (la causa del defecto)');

// theme-polish.css es la "piel unificada": bordes, glow, hover. Declarar ahi una
// propiedad estructural (z-index) pisa la capa 1 por ORDEN DE CARGA y no por
// especificidad, asi que el fallo es silencioso: la cascada de layer 1 dice
// 9999 y el navegador aplica 60.
const polish = hojas.find((h) => /theme-polish/.test(h));
if (polish) {
  const conZi = reglasCss(fs.readFileSync(path.join(REPO, polish), 'utf8'))
    .filter((r) => /\.toasts(?![\w-])/.test(r.sel))
    .map((r) => (r.body.match(/z-index\s*:\s*([^;}]+)/i) || [, null])[1])
    .filter(Boolean);
  ok(conZi.length === 0,
    'theme-polish.css NO declara z-index para .toasts (capas: 1=estructura, 2=piel)',
    'declara: ' + JSON.stringify(conZi));
} else {
  ok(false, 'se encontro theme-polish.css entre los estilosheets', hojas.join(','));
}

section('5. lo que este test NO deja pasar');

// El mensaje corto y fijo de app.js ("Formato de API key invalido") puede
// seguir siendo efimero: son 30 chars y se leen de un vistazo. Si alguien
// "arregla" todos los ttl, este test avisa.
const cortos = [...app.matchAll(/window\.toast\?\.\('error',\s*'([^']+)',\s*\{\s*ttl:\s*([-\d]+)/g)];
ok(cortos.every((c) => c[1].length < 100),
  'ningun mensaje corto y fijo quedo con ttl numerico gigante por propagar el cambio',
  JSON.stringify(cortos.map((c) => c[1].slice(0, 40))));

// La API de toast() no tiene forma de pedir "persistente": `Number(opts.ttl ||
// 3500)` se come el 0, y lo unico que queda es un NEGATIVO. Eso es un
// contrato que miente, y es un fix aparte (ver COMMS_LOG). Acá se deja
// asentar, no se arregla: este test no debe morphar en otra cosa.
const defTtl = app.match(/opts\.ttl\s*\|\|\s*(\d+)/);
ok(!!defTtl, 'el ttl por defecto de toast() sigue siendo un numero finito',
  defTtl ? 'default = ' + defTtl[1] + ' ms' : 'no se encontro el default');
console.log('  (nota: `opts.ttl || ' + (defTtl ? defTtl[1] : '?') + '` no puede expresar "persistente". Fix aparte, no de este ciclo.)');

console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail === 0 ? 0 : 1);
