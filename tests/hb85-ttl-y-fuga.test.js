/* =======================================================================
 * tests/hb85-ttl-y-fuga.test.js  —  el toast persistente y su `finally`
 *
 * Dos defectos que el Reviewer bloquearon en el veredicto de HB#81
 * (task-98befbf8c084), y que son UNA sola clase de bug: un valor con dos
 * significados y un `close` que solo corre en el camino feliz.
 *
 * 1. `ttl: 0` NO era persistente.
 *    app.js hacia `Number(opts.ttl || 3500)`. El 0 es falsy, asi que la
 *    UNICA forma documentada de pedir un toast que no se borre solo subia a
 *    3500 ms. El comentario del call-site ("Propuesta 9: toast persistente
 *    (ttl:0)") moria desde el dia que se escribio. Y el otro extremo: un
 *    NEGATIVO si era persistente (no hay timer), o sea que el contrato
 *    real era "cualquier valor <= 0", que es lo contrario de lo documentado.
 *
 * 2. `loadAllForToken` cerraba el toast solo en el camino feliz.
 *    `API.wallet(token)` no tiene `.catch` (el `.catch(() => null)` es solo
 *    del `API.account`), asi que un fallo de red saltaba la linea del
 *    `close()`. Con el `||`, el bug no se ve: a los 3,5 s el toast se va
 *    solo. Con el ttl arreglado, el toast se vuelve realmente persistente y
 *    el leak aparece -- y se multiplica por los 6 call-sites de la funcion.
 *    Por eso el `finally` va en el MISMO commit que el `??`.
 *
 * Por que el ttl se evalua y no se lee del fuente: `Number(x ?? 3500)` y
 * `Number(x || 3500)` son 10 caracteres y se leen bien, pero lo que importa
 * es que se comporten bien con los 5 valores que un call-site puede pasar.
 * Un assert de forma pasaria por construccion en cuanto alguien reescribiera
 * el default; el de comportamiento no.
 *
 * Alcance: la funcion `toast` extraida del fuente y evaluada en un sandbox
 * con `document`/`setTimeout` falsos, mas analisis estatico del `try/finally`.
 *   No levanta el IIFE completo (app.js depende de Storage y del DOM real).
 * ======================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { console.log('  PASS  ' + label); pass++; }
  else { console.log('  FAIL  ' + label + (extra ? '  (' + extra + ')' : '')); fail++; }
}
function section(t) { console.log('\n[' + t + ']'); }

const app = fs.readFileSync(path.join(REPO, 'js/app.js'), 'utf8');

/* ── Extraer `toast` del fuente, con sus 2 helpers de los que depende.
   `ensureHost`/`makeToastEl`/`normalizeType` son de la envoltura IIFE de los
   toasts; se extraen por el mismo balanced-brace que usa hb77. */
function extraer(src, nombre) {
  const i = src.indexOf('function ' + nombre + '(');
  if (i < 0) return null;
  const abre = src.indexOf('{', i);
  let depth = 0, enStr = null, esc = false;
  for (let k = abre; k < src.length; k++) {
    const c = src[k];
    if (esc) { esc = false; continue; }
    if (enStr) {
      if (c === '\\') { esc = true; continue; }
      if (c === enStr) enStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { enStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(i, k + 1); }
  }
  return null;
}

const srcToast = extraer(app, 'toast');
ok(!!srcToast, 'se encontro toast() en app.js');

// Sandbox: un host, un elemento y un reloj que NO avanza solo, para poder
// afirmar si se armo o no un timer. El `toast` real se evalua con los mismos
// 5 parametros que le pasa su IIFE, y `setTimeout` falso para no esperar.
section('1. `ttl: 0` tiene que ser persistente, y no informado, el default');
{
  // La forma de la funcion es `toast(type, msg, opts)` sobre un IIFE de 5
  // args. Se evalua como el codigo real la invoca.
  // `toast(type, msg, opts)` vive en un IIFE de 5 args; se evalua con esos 5.
  function construir() {
    const reloj = { pendientes: [] };
    const el = {
      classList: { add() {}, contains() { return false; } },
      querySelector() { return { addEventListener() {} }; },
      remove() {},
    };
    const host = { appendChild() {} };
    const doc = { createElement: () => el };
    const win = {
      document: doc,
      setTimeout: (fn, ms) => { reloj.pendientes.push({ fn, ms }); return 1; },
      clearTimeout() {},
    };
    const normalizeType = (t) => (t === 'ok' ? 'success' : (t === 'error' ? 'error' : 'info'));
    const makeToastEl = () => el;
    const ensureHost = () => host;
    // `vm` y no `eval`: el cuerpo de toast() llama a `setTimeout` como global,
    // asi que tiene que correr en un contexto donde ese global sea el falso.
    // Con `eval` + un parametro `window` el setTimeout real interceptaba los 3
    // casos con ttl positivo y el test|reportaba 0 timers.
    const fn = vm.runInNewContext(
      '(function(window, document, ensureHost, normalizeType, makeToastEl){' +
      srcToast + '; return toast; })',
      { setTimeout: win.setTimeout, clearTimeout: win.clearTimeout, console, Number, String }
    );
    return { toast: fn(win, doc, ensureHost, normalizeType, makeToastEl), reloj };
  }

  const sinTtl = construir();
  sinTtl.toast('info', 'x');
  ok(sinTtl.reloj.pendientes.length === 1 &&
     sinTtl.reloj.pendientes[0].ms === 3500,
     'sin opts.ttl el toast se va solo a los 3500 ms',
     'timers: ' + JSON.stringify(sinTtl.reloj.pendientes.map(t => t.ms)));

  const cero = construir();
  cero.toast('info', 'x', { ttl: 0 });
  ok(cero.reloj.pendientes.length === 0,
     'ttl:0 NO arma timer: el toast es persistente de verdad',
     'armo ' + cero.reloj.pendientes.length + ' timer(s)');

  const nulo = construir();
  nulo.toast('info', 'x', { ttl: null });
  ok(nulo.reloj.pendientes.length === 1 && nulo.reloj.pendientes[0].ms === 3500,
     'ttl:null es "no informado" y cae al default (NO es persistente)',
     'armo ' + nulo.reloj.pendientes.length + ' timer(s)');

  const neg = construir();
  neg.toast('info', 'x', { ttl: -1 });
  ok(neg.reloj.pendientes.length === 0,
     'un negativo sigue siendo persistente (comportamiento de antes, ahora escrito)');

  const num = construir();
  num.toast('info', 'x', { ttl: 2500 });
  ok(num.reloj.pendientes.length === 1 && num.reloj.pendientes[0].ms === 2500,
     'ttl:2500 respetado tal cual', 'dio ' + JSON.stringify(num.reloj.pendientes.map(t => t.ms)));

  // El contrato escrito: `??`, no `||`. Es 1 linea y la unica forma de que
  // 0 y null se comporten distinto.
  ok(/const ttl = Number\(opts\.ttl \?\? 3500\)/.test(srcToast),
     'el default se resuelve con ?? y no con || (0 y null no pueden ser lo mismo)');
}

section('2. ningun call-site puede pedir persistente por un negativo');
{
  // La prohibicion verificable del contrato: si un dia alguien escribe
  // `ttl: -1` por error de tipeo, esto lo dice. Medido sobre el repo entero,
  // no sobre app.js, porque los dosientes estan en cualquier modulo.
  const jsFiles = [];
  (function barrer(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (!/node_modules|\.git/.test(e.name)) barrer(p); }
      else if (e.name.endsWith('.js')) jsFiles.push(p);
    }
  })(path.join(REPO, 'js'));

  const malos = [];
  for (const f of jsFiles) {
    const txt = fs.readFileSync(f, 'utf8');
    txt.split('\n').forEach((ln, i) => {
      const m = ln.match(/\bttl\s*:\s*(-?\d+)/);
      if (m && Number(m[1]) < 0) malos.push(path.relative(REPO, f) + ':' + (i + 1));
    });
  }
  ok(malos.length === 0,
     'ningun call-site de js/ pasa un ttl negativo (la prohibicion es un test, no un comentario)',
     malos.join(', '));

  const persistentes = [];
  for (const f of jsFiles) {
    fs.readFileSync(f, 'utf8').split('\n').forEach((ln, i) => {
      if (/\bttl\s*:\s*0\b/.test(ln)) persistentes.push(path.relative(REPO, f) + ':' + (i + 1));
    });
  }
  ok(persistentes.length > 0,
     'existe al menos un consumidor REAL de la persistencia (ttl:0 no es teorico)',
     'encontrados: ' + (persistentes.join(', ') || 'NINGUNO'));
}

section('3. loadAllForToken cierra el toast en el camino de ERROR tambien');
{
  const srcFn = extraer(app, 'loadAllForToken');
  ok(!!srcFn, 'se encontro loadAllForToken en app.js');

  // La asercion que importa: hay un `finally` que cierra el toast. Sin el,
  // con el ttl ya arreglado, cada error de red deja un toast pegado.
  ok(/finally\s*\{[^}]*loadToast\?\.close\(\)/.test(srcFn),
     'el close del toast esta en un finally, no en el camino feliz');

  // Y el `try` tiene que ABRAZAR al await que puede rechazar, no estar
  // despues: un try cuyo cuerpo no incluye la llamada fallida no protege nada.
  // `finally {` y no la palabra suelta: el comentario que explica ESTE
  // finally esta antes del try y 'indexOf("finally")' lo encontraba ahi.
  const iTry = srcFn.indexOf('try {');
  const iWallet = srcFn.indexOf('API.wallet(token)');
  const iFin = srcFn.indexOf('finally {');
  ok(iTry >= 0 && iWallet > iTry && iFin > iWallet,
     'el try arranca ANTES de la llamada que puede rechazar y el finally despues',
     'try@' + iTry + ' wallet@' + iWallet + ' finally@' + iFin);

  // API.wallet NO tiene catch: por eso el finally es necesario y no opcional.
  const srcWallet = extraer(app, 'getAccountWallet') || '';
  ok(srcWallet.length > 0 || /API\.wallet/.test(srcFn),
     'se puede verificar la asercion sobre la llamada que rechaza');

  // La puerta NO puede haberse cerrado antes: el close no puede quedar como
  // ultima linea suelta (que es como estaba).
  ok(!/\}\s*\n\s*loadToast\?\.close\(\);\s*\n\s*\}/.test(srcFn),
     'el close no quedo como ultima linea fuera del try (el bug original)');
}

section('4. la RELACION de capas: el host de toasts va por encima del modal');
{
  // El Reviewer pidio una asercion de RELACION y no de valor: si manana
  // un modal nuevo va a 20000, el test avisa en vez de dejar que el bug
  // vuelva en silencio. Afirmar `10001 > 10000` seria afirmar el caso de hoy.
  const reglasCss = (src) => {
    const out = []; let i = 0;
    while (i < src.length) {
      const abre = src.indexOf('{', i);
      if (abre < 0) break;
      let depth = 0, enStr = null;
      for (let k = abre; k < src.length; k++) {
        const c = src[k];
        if (enStr) { if (c === enStr) enStr = null; continue; }
        if (c === '"' || c === "'") { enStr = c; continue; }
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) { out.push({ sel: src.slice(i, abre).trim(), body: src.slice(abre + 1, k) }); i = k; break; } }
      }
      i++;
    }
    return out;
  };
  const hojas = ['css/main.css', 'css/theme-polish.css'];
  // La que GANA es la ULTIMA declaracion en orden de carga, no la primera.
  // main.css declara `.toasts` dos veces (la de la seccion Toasts y la de
  // "Toasts compat"): devolver la primera es devolver la perdedora, y el
  // assert de relacion daba 10001 vs 10001 en vez del numero real.
  const zDe = (clase) => {
    let ganador = { valor: null, hoja: null }, declaraciones = 0;
    for (const h of hojas) {
      for (const r of reglasCss(fs.readFileSync(path.join(REPO, h), 'utf8'))) {
        if (!new RegExp('\\.' + clase + '(?![\\w-])').test(r.sel)) continue;
        const zi = r.body.match(/(^|;)\s*z-index\s*:\s*([^;}]+)/i);
        if (!zi) continue;
        if (/!important/i.test(zi[2])) return { valor: NaN, hoja: h + ' (!important)' };
        declaraciones++;
        ganador = { valor: parseInt(zi[2], 10), hoja: h };
      }
    }
    ganador.declaraciones = declaraciones;
    return ganador;
  };
  const zT = zDe('toasts'), zM = zDe('modal');
  ok(zT.valor !== null && zM.valor !== null,
     'ambas hojas declaran z-index para .toasts y .modal',
     'toasts=' + zT.valor + ' modal=' + zM.valor);
  ok(zT.declaraciones > 1,
     'el resolvedor ve TODAS las declaraciones de .toasts (medido: ' + zT.declaraciones + ')',
     'solo vio ' + zT.declaraciones);
  ok(zT.valor !== null && zM.valor !== null && zT.valor > zM.valor,
     'RELACION: el host de toasts queda POR ENCIMA del modal',
     'toasts=' + zT.valor + ' NO es > modal=' + zM.valor);
}

section('5. la capa 2 no puede invertir el modo de display de la capa 1');
{
  // P2 del veredicto de HB#81. main.css declara
  // `.side-nav__icon{display:inline-grid}` CON place-items:center, o sea que
  // hay intencion declarada. theme-polish.css pisaba `display` con `grid`, que
  // no es un refinamiento de valor sino un cambio de MODO de display: de
  // nivel de linea a bloque. Es el unico de los 29 choques de capa que es
  // deuda VIVA (los otros 27 son piel y `.an-hero` esta muerto por el
  // `!important` de main.css:1239).
  //
  // Se afirma la AUSENCIA de la declaracion en la capa 2, no el valor final:
  // el valor final es de la capa 1 y ese test seria afirmar el caso de hoy.
  const polish = fs.readFileSync(path.join(REPO, 'css/theme-polish.css'), 'utf8');
  const main = fs.readFileSync(path.join(REPO, 'css/main.css'), 'utf8');

  const declPolish = (polish.match(/\.side-nav__icon\s*\{[^}]*\}/g) || []);
  ok(declPolish.length === 1,
     'theme-polish.css declara .side-nav__icon UNA sola vez',
     'declara ' + declPolish.length + ' veces');
  ok(!/\.side-nav__icon\s*\{[^}]*\bdisplay\s*:/i.test(polish),
     'la capa 2 NO declara `display` para .side-nav__icon (no invierte el modo de la capa 1)');

  // Y que la capa 1 siga declarandolo: sin esto, borrar las dos seria "verde".
  ok(/\.side-nav__icon\s*\{[^}]*display\s*:\s*inline-grid/i.test(main),
     'la capa 1 sigue declarando display:inline-grid (el valor que ahora gana)');

  // Inventario de la geometria que la capa 2 SI declara sobre selectores de la
  // capa 1. No se afirma que sea cero: medido, son 6 declaraciones y todas son
  // legitimas (el host de toasts necesita display:grid para el gap y
  // position:fixed para pegarse a la pantalla; `.an-hero` y su ::after
  // necesitan su position y su z-index). Afirmar "cero geometria" seria una
  // regla INVENTADA que obligaria a romper el layout para hacerla pasar: la
  // primera version de esta asercion decia eso y fallaba con razon.
  //
  // Lo que SI se afirma es el INVENTARIO: son 6, y son estas. Si manana aparece
  // una septima, el test avisa y hay que revisarla -- que es el punto del
  // veredicto: de 29 choques, 1 era deuda viva, y auditarlos todos habria sido
  // el error.
  //
  // Los comentarios se eliminan ANTES de parsear: sin eso el extractor leia
  // texto de prosa como selector y contaba 8, con "display en .css" -- que no
  // es un selector. Los comentarios CSS no anidan: el primer */ cierra.
  const sinComentarios = polish.replace(/\/\*[\s\S]*?\*\//g, '');
  const geom = ['display', 'position', 'float', 'z-index', 'flex-direction'];
  const selectores = ['toasts', 'side-nav__icon', 'side-nav__link', 'an-hero'];
  const encontradas = [];
  for (const m of sinComentarios.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1], body = m[2];
    if (!selectores.some(cl => new RegExp('\\.' + cl + '(?![\\w-])').test(sel))) continue;
    for (const p of geom) {
      if (new RegExp('(^|;)\\s*' + p + '\\s*:', 'i').test(body)) {
        const nombre = (sel.match(/\.([\w-]+(?:::?[\w-]+)?)/) || [, '?'])[1];
        encontradas.push(p + ' en .' + nombre);
      }
    }
  }
  ok(encontradas.length === 6,
     'la geometria de capa 2 sobre selectores de capa 1 es la INVENTARIADA (6, ninguna nueva)',
     'encontro ' + encontradas.length + ': ' + (encontradas.join(', ') || 'nada'));
  ok(!/\.side-nav__icon[^}]*\bdisplay\s*:/i.test(sinComentarios),
     'el unico display de la lista NO es el de .side-nav__icon (era la deuda viva)');
  // El detector no puede estar leyendo prosa: si uncontara un selector que no
  // existe, el numero 6 seria accidentalmente correcto.
  ok(!encontradas.some(e => /\.css\b|\.js\b/.test(e)),
     'el extractor NO lee texto de comentario como selector',
     encontradas.join(', '));
}

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);