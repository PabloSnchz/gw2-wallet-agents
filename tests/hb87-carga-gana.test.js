/* =======================================================================
 * tests/hb87-carga-gana.test.js  -  la carga vieja gana la carrera
 *
 * HALLAZGO PROPIO (HB#87), propuesto por el PO en su ronda 27 (T8) y
 * MEDIDO aqui antes de tocar una linea de app.js.
 *
 * EL DEFECTO
 *   `loadAllForToken` escribe `state.accountName`, `state.wallet` y el
 *   `ownerLabel` sin ninguna guarda. Dos llamadas concurrentes -- que es
 *   exactamente lo que produce el desplegable global, que dispara una por
 *   cambio y no tiene debounce ni abort -- se pisan, y gana la que
 *   TERMINA ULTIMA, no la que se pidio ultima.
 *
 * POR QUE LO QUE PABLO VE ES PEOR QUE "el wallet esta viejo"
 *   En `app.js:1260` el handler hace, en este orden:
 *       KeyManager.setSelected(token, {silent:true});   // el desplegable = B
 *       if (token) await loadAllForToken(token);
 *   O sea que el desplegable ya dice B cuando la carga arranca. Si la carga
 *   vieja de A responde despues, `state.accountName` pasa a ser A y el
 *   `ownerLabel` (que recibe el mismo valor) TAMBIEN dice A. O sea: el
 *   desplegable dice B y la etiqueta de dueño y el wallet son de A. Los tres
 *   juntos mienten, y el unico que Pablo tendria que contrastar para
 *   sospechar es el desplegable.
 *
 * QUE NO AFIRMA ESTE TEST
 *   No afirma que la carrera se produzca siempre. Afirma que, CUANDO se
 *   produce, el resultado es el equivocado. El modo de fallo depende del
 *   orden de resolucion de la red, que no es determinista, asi que el caso
 *   se monta con el ORDEN controlado por el test. Por eso el caso de
 *   CONTROL va primero y tiene que dar bien SIN la guarda: si el control
 *   tambien falla, el test no esta probando la carrera sino el arnes.
 *
 * POR QUE 1029 aserciones existentes no lo ven
 *   Ninguna puede montar dos cargas concurrentes: verifican que la funcion
 *   hace lo correcto con UNA carga. El defecto vive ENTRE dos. Misma clase
 *   que el lost update de la Idea 64.
 *
 * Alcance: la funcion `loadAllForToken` extraida del fuente y evaluada en
 *   un sandbox con las 6 deps inyectadas, una red controlable (promesas que
 *   el test resuelve en el orden que elige) y un `render`/`setStatus`/
 *   `toast` falsos. No levanta el IIFE completo.
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

/* --- Extraccion por balanced-brace, el mismo metodo que hb77/hb85 --------- */
function extraerFn(src, firma) {
  const i = src.indexOf(firma);
  if (i < 0) return null;
  const abre = src.indexOf('{', i);
  let depth = 0, enStr = null, esc = false, enCom = false;
  for (let k = abre; k < src.length; k++) {
    const c = src[k];
    if (enCom) { if (c === '\n') enCom = false; continue; }
    if (esc) { esc = false; continue; }
    if (enStr) { if (c === '\\') esc = true; else if (c === enStr) enStr = null; continue; }
    if (c === '/' && src[k + 1] === '/') { enCom = true; continue; }
    if (c === '/' && src[k + 1] === '*') { enCom = true; k++; continue; }
    if (c === '"' || c === "'" || c === '`') { enStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(i, k + 1); }
  }
  return null;
}

const fnSrc = extraerFn(app, 'async function loadAllForToken(');
ok(!!fnSrc, 'loadAllForToken se pudo extraer del fuente');

/* El contador de secuencia vive FUERA de la funcion (es module scope), asi
   que el balanced-brace no lo trae. Se extrae con el mismo criterio: sin esta
   linea el sandbox tira ReferenceError en la PRIMERA asercion util y el test
   muere antes de contar nada -- que es como murio idea64 con `cur`/`max`. */
const seqSrc = /^[ \t]*let\s+loadSeq\s*=\s*0\s*;?[ \t]*$/m.test(app)
  ? (app.match(/^[ \t]*let\s+loadSeq\s*=\s*0\s*;?[ \t]*$/m) || [null])[0]
  : null;
ok(!!seqSrc, 'el contador de secuencia `loadSeq` esta declarado en module scope',
   'sin el, el sandbox no puede resolver la guarda');
const tieneGuarda = /if\s*\(\s*mine\s*!==\s*loadSeq\s*\)\s*return\s*;/.test(fnSrc || '');
ok(tieneGuarda, 'la guarda `if (mine !== loadSeq) return;` esta en el cuerpo');

/* --- Sandbox: la red es lo UNICO que el test ordena -------------------
   `resolverEn` recibe los indices de las cargas en el ORDEN en que el test
   quiere que la red responda. Sin ese control el test seria una loteria. */
function montar() {
  const log = { status: [], renders: 0, ownerLabelText: '', toasts: [], cerrados: 0 };
  const state = { accountName: null, wallet: null };
  const red = new Map();   // token -> { cuenta, wallet, resAcct, resWallet }
  const pedido = [];       // tokens en el orden en que se PIDIERON

  for (const t of ['A', 'B']) red.set(t, { cuenta: null, wallet: null });

  const API = {
    account(tok) {
      const e = red.get(tok);
      return new Promise((res) => { e.resAcct = res; });
    },
    wallet(tok) {
      const e = red.get(tok);
      return new Promise((res) => { e.resWallet = res; });
    },
  };

  const ctx = {
    state,
    el: { ownerLabel: { textContent: '' } },
    // El texto del toast pide el label de la cuenta, asi que la dep se
    // inyecta. Con `KeyManager` ausente el fix degrada al texto viejo, que es
    // lo que tiene que pasar: no inventar un nombre.
    KeyManager: { list: [{ value: 'A', label: 'ALFA' }, { value: 'B', label: 'BETA' }] },
    setStatus: (m, k) => log.status.push(m + (k ? ' [' + k + ']' : '')),
    render: () => { log.renders++; },
    ensureCurrencies: async () => {},
    migrateFavsToPinsIfNeeded: () => {},
    API,
    console,
    Promise, setTimeout,
  };
  ctx.globalThis = ctx;
  ctx.module = { exports: null };
  ctx.window = {
    toast(type, msg, opts) {
      const t = { type, msg, opts, closed: false, close() { this.closed = true; log.cerrados++; } };
      log.toasts.push(t);
      return t;
    },
  };

  vm.createContext(ctx);
  // El sandbox se arma con el contador DECLARADO FUERA de la funcion, igual
  // que en el fuente. Si no se inyecta, el ReferenceError tapa todo.
  vm.runInContext((seqSrc || 'let loadSeq = 0;') + '\n' + fnSrc +
    '\n;module.exports = loadAllForToken;', ctx);
  return { cargar: ctx.module.exports, state, log, red, pedido, el: ctx.el };
}

const flush = () => new Promise(r => setTimeout(r, 0));

/** Pablo elige B; el test decide en que orden responde la red. */
async function escenario(ordenRespuesta) {
  const h = montar();
  const pa = h.cargar('A'); h.pedido.push('A');
  const pb = h.cargar('B'); h.pedido.push('B');
  await flush();                       // las 2 llegan al await de la red
  for (const i of ordenRespuesta) {
    const tok = h.pedido[i];
    const e = h.red.get(tok);
    e.resAcct({ name: 'CUENTA-' + tok });
    e.resWallet([{ id: 1, value: tok === 'A' ? 10 : 20 }]);
    await flush();
  }
  await Promise.all([pa, pb]);
  return h;
}

(async function main() {
  section('CONTROL: la red responde en orden natural (la de B, ultima)');
  {
    const h = await escenario([0, 1]);
    ok(h.state.accountName === 'CUENTA-B', 'sin la carrera, gana la ultima en pedir',
       'accountName=' + h.state.accountName);
    ok(h.state.wallet && h.state.wallet[0].value === 20, 'el wallet es el de B',
       JSON.stringify(h.state.wallet));
    ok(h.log.toasts.every(t => t.closed), 'los 2 toasts se cerraron (el finally de HB#85 sigue vivo)');
  }

  section('EL DEFECTO: la red responde al reves, la carga vieja de A despues');
  {
    const h = await escenario([1, 0]);
    ok(h.state.accountName === 'CUENTA-B', 'el nombre es de B, la que Pablo eligio',
       'accountName=' + h.state.accountName + '  <-- si dice CUENTA-A, la carga vieja gano');
    ok(h.state.wallet && h.state.wallet[0].value === 20, 'el wallet es el de B',
       JSON.stringify(h.state.wallet));
  }

  section('LA ETIQUETA DE DUENO MIENTE CON EL MISMO VALOR VIEJO');
  {
    const h = await escenario([1, 0]);
    ok(h.el.ownerLabel.textContent === 'CUENTA-B',
       'ownerLabel dice B (o esta vacio si la carga vieja no llego a escribir)',
       'ownerLabel="' + h.el.ownerLabel.textContent + '"  <-- si dice CUENTA-A, el rotulo tambien miente');
  }

  section('EL TOAST NO DICE DE QUE CUENTA ES');
  {
    const h = await escenario([1, 0]);
    const textos = h.log.toasts.map(t => t.msg);
    ok(textos.length === 2, 'hay 2 toasts (una por carga)', JSON.stringify(textos));
    ok(!textos.every(t => t === textos[0]),
       'los 2 toasts NO son identicos: Pablo puede distinguir cual es de cual',
       JSON.stringify(textos));
  }

  section('LA CARGA VIEJA NO DEJA UN TOAST COLGADO NI UN STATUS ROTO');
  {
    const h = await escenario([1, 0]);
    ok(h.log.toasts.every(t => t.closed),
       'los 2 toasts se cerraron tambien en el camino perdedor',
       JSON.stringify(h.log.toasts.map(t => t.closed)));
  }

  console.log('\n' + (fail === 0 ? 'OK' : 'FALLOS') + ' — ' + pass + ' pass, ' + fail + ' FAIL');
  process.exit(fail === 0 ? 0 : 1);
})();
