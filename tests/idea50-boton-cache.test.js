/*!
 * tests/idea50-boton-cache.test.js
 *
 * Idea 50, Tramo siguiente a F y P3: EL BOTON.
 *
 * Contexto (medido, no supuesto):
 *   - `GW2Api.__cacheClear({dryRun})` ya existe y borra de verdad, y esta
 *     probado en `tests/idea50f.cacheclear-real.test.js` (secciones 1-7).
 *   - `__cacheClear` tenia **0 callers** en el repo: no habia ningun boton, o
 *     sea que la quota (~4.98 MB medidos) no tenia como liberarse a mano.
 *
 * QUE MIDE ESTE TEST Y POR QUE NO ES "UNAS ASERCIONES MAS":
 * El borrado ya estaba probado. Lo que NO estaba probado es el **flujo del
 * boton**, y ahi hay tres formas de mentir que ninguna se ven mirando
 * `cacheClear`:
 *
 *   (a) CONFIRMAR UNA CIFRA Y EJECUTAR OTRA. Si el `confirm()` anuncia N
 *       claves y el borrado real saca M, el boton es exactamente la clase de
 *       control que el usuario no puede verificar. Por eso (d) compara el
 *       numero del mensaje con el numero REALmente borrado.
 *   (b) CANCELAR Y BORRAR IGUAL. Si el `dryRun` se corre despues del
 *       `confirm` (o si alguien "optimiza" y saca el `dryRun`), cancelar deja
 *       de ser cancelar. (c) lo mide.
 *   (c) PREGUNTAR CUANDO NO HAY NADA QUE HACER. Un `confirm()` que anuncia
 *       "0 claves" es una mentira, y el peor caso de un boton destructivo es
 *       el que pide permiso para no hacer nada. (e) lo mide.
 *
 * El handler se EJERCI de verdad: se montan el `api-gw2.js` y el
 * `settings-manager.js` REALES en un sandbox y se dispara el listener que el
 * propio modulo engancha. Un test que rescriba el flujo a mano probaria el
 * test, no el codigo.
 *
 * Ejecutar: node tests/idea50-boton-cache.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function eq(a, b, msg) { ok(a === b, msg + '  (obtenido: ' + JSON.stringify(a) + ')'); }

// ── Montaje: los DOS modulos reales, no un doble ─────────────────────────
function mount(opts) {
  opts = opts || {};
  const store = new Map();
  const confirmMsgs = [];
  const toasts = [];
  const buttons = {};            // id -> elemento falso con su listener
  const realConsole = console;
  const fakeConsole = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'warn') return () => {};
      const v = realConsole[prop];
      return typeof v === 'function' ? v.bind(realConsole) : v;
    }
  });
  function fakeBtn(id) {
    return {
      id: id,
      _listeners: [],
      addEventListener(ev, fn) { if (ev === 'click') this._listeners.push(fn); },
      click() { this._listeners.forEach(fn => fn({ preventDefault() {} })); },
      _wired() { return this._listeners.length; }
    };
  }
  const document = {
    // 'loading' para que el modulo se registre en DOMContentLoaded y NO se
    // auto-inicialice: asi el test decide cuando corre `init()`.
    readyState: 'loading',
    addEventListener() {},
    removeEventListener() {},
    getElementById(id) {
      if (id === 'clearCacheBtn') { buttons[id] = buttons[id] || fakeBtn(id); return buttons[id]; }
      return null;   // export/import no existen en este sandbox
    },
    createElement() { return { style: {}, addEventListener() {} }; },
    body: {}
  };
  const sandbox = {
    console: fakeConsole,
    document: document,
    localStorage: {
      get length() { return store.size; },
      key(i) { return Array.from(store.keys())[i]; },
      getItem(k) { return store.has(k) ? store.get(k) : null; },
      setItem(k, v) { store.set(k, String(v)); },
      removeItem(k) { store.delete(k); }
    },
    confirm(msg) { confirmMsgs.push(String(msg)); return !!opts.accept; },
    fetch() {
      return Promise.resolve({
        ok: true, status: 200, headers: { get() { return null; } },
        text() { return Promise.resolve('[]'); }
      });
    },
    URL, Promise, Map, Date, JSON, Object, Array, String, Number, Math, isFinite
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  if (opts.withApi !== false) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf8'),
      sandbox, { filename: 'api-gw2.js' });
  }
  // `Storage` no se usa en este camino, pero el modulo lo referencia en otras
  // funciones: se da un stub minimo para que cargar el archivo no rompa.
  sandbox.Storage = { get() { return null; }, list() { return []; }, STORAGE_KEYS: {} };
  sandbox.toast = function (kind, msg) { toasts.push({ kind: kind, msg: String(msg) }); };
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'settings-manager.js'), 'utf8'),
    sandbox, { filename: 'settings-manager.js' });
  sandbox.SettingsManager.init();
  return { sandbox: sandbox, store: store, confirmMsgs: confirmMsgs, toasts: toasts, buttons: buttons };
}

// El estado que el boton tiene que encontrar: cache de la capa + lo que NO
// puede tocar. Mismos nombres que usa `idea50f.cacheclear-real.test.js`.
function seed(m) {
  m.store.set('wallet', 'w'.repeat(1000));
  m.store.set('luck', 'l'.repeat(500));
  m.store.set('ach_acc', 'a'.repeat(2000));
  m.store.set('gn:account:keys', 'KEEP');   // la lista de 27 cuentas
  m.store.set('gn:theme', 'KEEP');
}

// Un clic al boton, DEGRADADO: si el boton no existe o no tiene listener, la
// seccion se reporta como FAIL y el archivo sigue corriendo. Sin esto el test
// ABORTA con TypeError contra la version sin el fix, y se pierden los reportes
// de las secciones siguientes: el fallo dice "se rompio" en vez de decir QUE
// falta. Mismo criterio que la seccion 4 de `idea50f.cacheclear-real.test.js`.
function press(m, etiqueta) {
  var b = m.buttons.clearCacheBtn;
  if (!b || b._wired() === 0) {
    ok(false, etiqueta + ': no hay listener de click en clearCacheBtn (el boton no esta enganchado)');
    return false;
  }
  b.click();
  return true;
}

// ── 1. El boton existe en el DOM y NO agrega CSS ──────────────────────────
console.log('\n[1] el boton esta declarado y no introduce CSS nuevo');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const btnHtml = (html.match(/<button[^>]*id="clearCacheBtn"[\s\S]*?<\/button>/) || [''])[0];
ok(btnHtml !== '', 'index.html declara el boton con id="clearCacheBtn"');
ok(/class="an-util-link an-util-link--btn"/.test(btnHtml),
  'reutiliza las clases que ya existen (an-util-link + an-util-link--btn)');
ok(!/\sstyle=/.test(btnHtml),
  'sin style inline: los 3 botones de al lado si lo llevan, y esta clase ya lo reemplaza');
ok(/aria-label=/.test(btnHtml), 'tiene aria-label: el texto visible no alcanza solo');
ok(html.indexOf('settings-manager.js?v=1.0.3') !== -1,
  'el <script> sube a v=1.0.3: sin bump, el navegador sirve el .js viejo desde su cache');

const css = fs.readFileSync(path.join(ROOT, 'css', 'main.css'), 'utf8');
ok(/\.an-util-link--btn\s*\{/.test(css),
  'la clase an-util-link--btn YA existe en main.css: el boton no depende de CSS nuevo');
ok(css.indexOf('clearCache') === -1,
  'y main.css no nombra al boton: nada se agrego a la capa de layout');
ok(!/!important/.test(btnHtml), 'sin !important en el boton');

// ── 2. El handler se engancha, con el MISMO guard que los otros 3 ────────
console.log('\n[2] el modulo engancha el boton con su guard de doble binding');
const w = mount({ accept: false });
ok(!!w.buttons.clearCacheBtn, 'el sandbox entrego el elemento del boton');
eq(w.buttons.clearCacheBtn ? w.buttons.clearCacheBtn._wired() : 0, 1, 'el modulo registro 1 listener de click');
const src = fs.readFileSync(path.join(ROOT, 'js', 'settings-manager.js'), 'utf8');
const bindBody = (src.match(/function bindButtons\(\)\s*\{[\s\S]*?\n    \}/) || [''])[0];
ok(/clearCacheBtn && !clearCacheBtn\.__settingsWired/.test(bindBody),
  'usa el guard __settingsWired igual que export/import: sin el, el MutationObserver lo bindea N veces');

// ── 3. CANCELAR NO BORRA NADA ─────────────────────────────────────────────
// El `dryRun` es lo que hace que esto sea cierto. Si alguien saca el dryRun
// "porque el confirm ya pregunta", esta seccion es la que lo agarra.
console.log('\n[3] cancelar no borra nada (el dryRun ocurre ANTES del confirm)');
const c = mount({ accept: false });
seed(c);
press(c, 'cancelar');
eq(c.store.size, 5, 'las 5 claves siguen en la store tras cancelar');
ok(c.store.has('wallet') && c.store.has('luck') && c.store.has('ach_acc'),
  'la cache sigue ahi: cancelar es cancelar');
eq(c.confirmMsgs.length, 1, 'se pregunto una vez');
ok(!c.toasts.some(t => t.kind === 'success'), 'y NO se anuncie una liberacion que no ocurrio');

// ── 4. ACEPTAR BORRA, Y LA CIFRA DEL CONFIRM ES LA QUE SE EJECUTA ────────
// Esta es la asercion mas importante del archivo: el `confirm()` promete una
// cifra y el borrado tiene que cumplir ESA. Si el mensaje dice 3 y borra 4 (o
// al reves), el control es Fondation sobre un numero que el usuario no puede
// verificar, y el unico lugar donde se ve es aqui.
console.log('\n[4] aceptar borra, y la cifra del confirm es la que se ejecuta');
const a = mount({ accept: true });
seed(a);
const antes = a.store.size;
press(a, 'aceptar');
const reales = ['wallet', 'luck', 'ach_acc'].filter(k => !a.store.has(k)).length;
eq(reales, 3, 'se borraron las 3 claves de cache');
ok(a.store.has('gn:account:keys'), 'la lista de cuentas SIGUE ahi');
ok(a.store.has('gn:theme'), 'el tema SIGUE ahi');
eq(a.store.size, antes - 3, 'solo desaparecio la cache: 5 -> ' + a.store.size);

const msg = a.confirmMsgs[0] || '';
ok(msg.indexOf('3 claves') !== -1,
  'el confirm anuncia las 3 claves que despues se borran (' + JSON.stringify(msg.split('\n')[2] || '') + ')');
ok(/3\.4 KB/.test(msg),
  'y anuncia los bytes medidos por el dryRun: 1000+500+2000 = 3500 B; 3500/1024 = 3.418 -> 3.4 KB');
ok(msg.indexOf('Se conservan 2 claves') !== -1,
  'y dice cuantas conserva: el `kept` es la garantia, y tiene que ser visible');
ok(/¿Liberar la caché de la API\?/.test(msg), 'la pregunta es una pregunta de cache, no generica');

// ── 4b. EL COPY NO PROMETE MAS DE LO QUE PASA ────────────────────────────
// El Reviewer senalo (nota al pie de la fila 073) que `cacheClear` solo vacia
// la `__mem` de UNA capa, y que `wizards-vault.js:40-41` tiene SU PROPIA
// `__mem`/`__inflight` que el borrado NO alcanza. O sea que despues de este
// boton el WV sigue sirviendo desde memoria.
//
// La primera version de este boton decia "la proxima carga volvera a descargar
// los datos", y para el WV eso era FALSO. No es un detalle de redaccion: es
// exactamente el modo de falla de un dato sin alcance declarado (ALERT-68 y
// ALERT-78), aplicado al unico texto que el usuario lee antes de confirmar una
// operacion destructiva. Por eso el limite esta escrito Y asertado.
console.log('\n[4b] el copy declara el alcance real: la `__mem` del WV no se toca');
const srcSM = fs.readFileSync(path.join(ROOT, 'js', 'settings-manager.js'), 'utf8');
const clearApiBody = (srcSM.match(/function clearApiCache\(\)\s*\{[\s\S]*?\n  \}/) || [''])[0];
const wvSrc = fs.readFileSync(path.join(ROOT, 'js', 'wizards-vault.js'), 'utf8');
ok(/var __mem = new Map\(\)/.test(wvSrc) && /var __inflight = new Map\(\)/.test(wvSrc),
  'el WV tiene su propia cache de sesion (wizards-vault.js:40-41): la limitacion es REAL, no teorica');
ok(clearApiBody.indexOf('WizardsVault') === -1,
  'y el boton no la alcanza todavia: no hay hook, es el tramo siguiente');
ok(/en memoria/.test(msg), 'el confirm lo dice: el copy no promete una recarga global');
ok(msg.indexOf('La API volverá a descargar') !== -1,
  'lo que promete es "la API volvera a descargar los datos", que es lo unico que pasa de verdad');
ok(/hasta que recargues la página/.test(msg),
  'y dice HASTA CUANDO: el alcance del dato esta escrito, no es una promesa abierta');
const okT = a.toasts.filter(t => t.kind === 'success');
eq(okT.length, 1, 'un unico toast de exito');
ok(okT.length === 1 && okT[0].msg.indexOf('3 claves') !== -1,
  'el toast repite la cifra real (' + (okT[0] ? okT[0].msg : '-') + ')');

// La confirmacion y el borrado tienen que ser el MISMOHecho, no dos hechos
// parecidos: si el `confirm` leyera un registro distinto del que usa el
// borrado, los dos numerosarian legitimos y distintos.
const a2 = mount({ accept: true });
a2.store.set('wallet', 'w'.repeat(1));
a2.store.set('ach_acc', 'a'.repeat(1));
a2.store.set('gn:account:keys', 'KEEP');
press(a2, 'cifra chica');
ok(/\b2 B\b/.test(a2.confirmMsgs[0] || ''),
  'con 2 bytes, el confirm dice "2 B": la cifra viene del dryRun y no de una constante, y no se infla a KB');
eq(a2.store.size, 1, 'y se borraron esas 2, no otras');

// ── 5. SIN NADA QUE LIMPIAR NO SE PREGUNTA ────────────────────────────────
console.log('\n[5] no hay cache: no se pregunta y no se promete nada');
const e = mount({ accept: true });
e.store.set('gn:account:keys', 'KEEP');
e.store.set('gn:theme', 'KEEP');
press(e, 'sin cache');
eq(e.confirmMsgs.length, 0,
  'confirm NO se dispara: pedir permiso para no hacer nada es el peor caso de un boton destructivo');
eq(e.toasts.length, 1, 'un aviso, y es el aviso');
ok(e.toasts[0] && e.toasts[0].kind === 'warning',
  'de tipo warning, no success: no se vendio una liberacion que no ocurrio');
ok(e.store.size === 2, 'y la store quedo como estaba');

// ── 6. Sin la capa de API no rompe la pagina ─────────────────────────────
console.log('\n[6] si GW2Api no esta, avisa y no rompe');
const n = mount({ accept: true, withApi: false });
n.store.set('wallet', 'x');
press(n, 'sin GW2Api');
eq(n.confirmMsgs.length, 0, 'no pregunta nada sin la capa que borra');
eq(n.toasts.length, 1, 'avisa una vez');
ok(n.toasts[0] && n.toasts[0].kind === 'error', 'con error, que es lo que es');
eq(n.store.size, 1, 'y no toco la store');

// ── 7. El boton no recarga la pagina (decision abierta, no olvidad) ───────
// No hace `location.reload()`: `__cacheClear` tambien vacia `__mem`, asi que la
// siguiente lectura sale de la red sola, y recargar tiraria el estado de la
// vista. Se aserta para que la decision quede ESCRITA: si manana se cambia,
// esto tiene que fallar y obligar a razonar, no a notar el cambio.
console.log('\n[7] el boton no recarga la pagina, y eso esta dicho');
ok(clearApiBody !== '', 'clearApiCache() existe');
ok(clearApiBody.indexOf('location.reload') === -1,
  'no recarga: vaciar __mem ya alcanza para que la proxima lectura salga de la red');
ok(clearApiBody.indexOf('__cacheClear({ dryRun: true })') !== -1 ||
   /__cacheClear\(\{\s*dryRun:\s*true\s*\}\)/.test(clearApiBody),
  'el primer llamado es SIEMPRE en dryRun: es lo que hace que cancelar no borre');
ok(clearApiBody.indexOf('confirm(') !== -1, 'pide confirmacion antes de borrar de verdad');
const iDry = clearApiBody.indexOf('dryRun: true');
const iConf = clearApiBody.indexOf('confirm(');
const iReal = clearApiBody.lastIndexOf('__cacheClear()');
ok(iDry < iConf && iConf < iReal,
  'el orden es dryRun -> confirm -> borrado real (posiciones ' + [iDry, iConf, iReal].join(' < ') + ')');

console.log('\n' + (fail === 0 ? 'TODO OK' : 'HAY FALLOS') + ' — ' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail === 0 ? 0 : 1);
