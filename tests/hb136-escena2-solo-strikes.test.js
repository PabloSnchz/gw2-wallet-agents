/* tests/hb136-escena2-solo-strikes.test.js
 *
 * HB#136 — la "escena 2": en la ruta `#/account/strikes` solo NACE el par de
 * Strikes. Es la precondicion que pidio el Reviewer antes de tocar T14/T15.
 *
 * ── Por que esta escena y no otra ──────────────────────────────────────────
 *
 * El Reviewer (veredicto T13, fila 125) pidio asertar, ANTES de tocar nada,
 * que la escena "solo Strikes" funciona HOY. Mi lectura de ese pedido fue
 * erronea durante 2 ciclos: afirmé sin parar que el guard "todo o nada" de
 * `wireViewToggle` dejaba hoy los dos strips mudos. Es un RIESGO FUTURO del
 * plan, no un defecto actual.
 *
 * Y `tests/hb125-t12b-escritor-comun.test.js`, que es el arnés de T12-b, NO
 * cubre esta escena: su `escenario()` registra SIEMPRE los 4 botones
 * (hb125:130-137). Con los 4 presentes, un guard "todo o nada" y el guard
 * "por pareja" se comportan IGUAL. O sea: elhb125 no puede distinguir el fix
 * de su ausencia. Este archivo mide lo que el no midio.
 *
 * ── La escena, medida en el codigo real (no inferida) ───────────────────────
 *
 *   index.html         0 matches de los 4 ids: los botones se INYECTAN.
 *   raid-tracker.js:1244   ensurePanelContent()  -> nace el par de Raids
 *   strike-tracker.js:558  ensurePanelContent()  -> nace el par de Strikes
 *   router.js:1600    '#/account/strikes' -> showPanel + StrikeTracker.activate()
 *                      y NO toca RaidTracker.activate()
 *
 * O sea: entrando por la ruta de Strikes, el par de Raids no llega a existir.
 * Un guard "todo o nada" sobre los 4 elementos no cablearia NINGUNO de los
 * dos, y los 4 botones se verian sin listener: el usuario hace click y no
 * pasa nada. Eso es el defecto que el guard "por pareja" evita hoy.
 *
 * ── Este arnes tiene CONTROL NEGATIVO REAL (ALERT-189) ──────────────────────
 *
 * No alcanza con asertar que la escena funciona: hay que probar que el
 * arnes SABRIA fallar si dejara de funcionar. Se corre el MISMO escritor
 * con el guard mutado a "todo o nada" y se exige que quede mudo. Si la
 * mutacion no lo deja mudo, este archivo no esta midiendo lo que dice medir
 * y su verde no vale nada.
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
const section = (t) => console.log('\n[' + t + ']');

/** De `function f(` hasta la llave que cierra a su nivel. */
function cuerpo(source, ancla) {
  const ini = source.indexOf(ancla);
  if (ini < 0) throw new Error('no encontre ' + ancla);
  const abre = source.indexOf('{', ini);
  let depth = 0;
  for (let i = abre; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) return source.slice(ini, i + 1); }
  }
  return source.slice(ini);
}

function nuevoLS() {
  return {
    _d: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
    get length() { return Object.keys(this._d).length; },
    key(i) { return Object.keys(this._d)[i] || null; },
  };
}

function el(id) {
  const listeners = {};
  return {
    id,
    attrs: {},
    _listeners: listeners,
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); },
    nListeners(t) { return (listeners[t] || []).length; },
    click() { (listeners['click'] || []).forEach((f) => f({ preventDefault() {} })); },
    setAttribute(k, v) { this.attrs[k] = v; },
    removeAttribute(k) { delete this.attrs[k]; },
    getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; },
    hasAttribute(k) { return this.attrs[k] !== undefined; },
    appendChild() {},
    querySelector() { return null; },
    innerHTML: '',
  };
}

/**
 * ESCENA 2: los 2 paneles existen (viven en index.html) pero SOLO nace el par
 * de Strikes. `conParRaids: true` agrega el par de Raids, que es lo que hace
 * el arnés del HB#125 y lo que IMPIDE distinguir los dos guards.
 */
function escena2({ prefStrikes = false, conParRaids = false } = {}) {
  const byId = {};
  function registrar(e) { byId[e.id] = e; return e; }

  const raidPanel = el('raidTrackerPanel');
  const strikePanel = el('strikeTrackerPanel');
  raidPanel.classList.add('panel');
  strikePanel.classList.add('panel');
  registrar(raidPanel); registrar(strikePanel);

  if (conParRaids) {
    registrar(el('viewRaidsBtn')).classList.add('btn', 'btn--accent');
    registrar(el('viewStrikesBtn')).classList.add('btn', 'btn--ghost');
  }
  registrar(el('strikeViewRaidsBtn')).classList.add('btn', 'btn--ghost');
  registrar(el('strikeViewStrikesBtn')).classList.add('btn', 'btn--accent');

  const ls = nuevoLS();
  if (prefStrikes) ls.setItem('gn:raids:strike:view', 'strikes');

  const doc = {
    readyState: 'complete',
    getElementById: (id) => byId[id] || null,
    createElement: () => el('nuevo'),
    addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; },
  };

  const sandbox = {
    document: doc,
    localStorage: ls,
    LOG: '[Test]',
    console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
    setTimeout() {}, clearTimeout() {}, clearInterval() {}, setInterval() {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  // Contrato REAL de preferences: la gn: manda y la legacy queda de fallback.
  sandbox.STORAGE_KEYS_RT = { RAIDS_STRIKE_VIEW: 'gn:raids:strike:view' };
  sandbox.prefGet = (k, legacy) => {
    const v = ls.getItem(k);
    return v === null ? ls.getItem(legacy) : v;
  };
  sandbox.prefSet = (k, legacy, v) => {
    ls.setItem(k, v);
    if (legacy) ls.setItem(legacy, v);
  };
  sandbox.RaidTracker = { refresh() {} };
  sandbox.StrikeTracker = { refresh() {}, activate() {} };

  return { sandbox, byId, ls, raidPanel, strikePanel };
}

/** El escritor comun, tomado VERBATIM del producto. */
const raidSrc = src('raid-tracker.js');
const wireReal = cuerpo(raidSrc, 'function wireViewToggle');

function cablear(e, cuerpoFn) {
  const fn = vm.runInContext('(' + cuerpoFn + ')', e.sandbox);
  fn('strikeViewRaidsBtn', 'strikeViewStrikesBtn');
  return fn;
}

// ═══════════════════════════════════════════════════════════════════════════
section('PREMISA: la escena 2 es alcanzable (si no, este archivo no mide nada)');

ok(!/id="viewRaidsBtn"/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')),
  'index.html NO contiene el par de Raids: los botones se inyectan (0 matches medido)');
ok(/ensurePanelContent/.test(src('strike-tracker.js')) &&
  /wireViewTogglePair\('strikeViewRaidsBtn',\s*'strikeViewStrikesBtn'\)/.test(src('strike-tracker.js')),
  'el par de Strikes nace en el ensurePanelContent() de strike-tracker (medido)');
ok(/h === '#\/account\/strikes'/.test(src('router.js')),
  'la ruta #/account/strikes existe en el router (medido)');
ok(/function wireStrikeViewToggle/.test(src('strike-tracker.js')) === false,
  'y no hay un segundo escritor: wireStrikeViewToggle sigue borrado (T12-b)');

// ═══════════════════════════════════════════════════════════════════════════
section('ESCENA 2 · con la pref en "strikes", el par de Strikes NO queda mudo');

{
  const e = escena2({ prefStrikes: true });
  cablear(e, wireReal);

  ok(e.byId['strikeViewRaidsBtn'].nListeners('click') === 1,
    'el boton de Raids del par de Strikes tiene EXACTAMENTE 1 listener',
    'tiene ' + e.byId['strikeViewRaidsBtn'].nListeners('click'));
  ok(e.byId['strikeViewStrikesBtn'].nListeners('click') === 1,
    'el de Strikes tambien tiene 1',
    'tiene ' + e.byId['strikeViewStrikesBtn'].nListeners('click'));

  ok(!e.strikePanel.hasAttribute('hidden'),
    'el panel de Strikes queda VISIBLE (la pref manda)');
  ok(e.byId['strikeViewStrikesBtn'].classList.contains('btn--accent'),
    'el resaltado sigue a la preferencia');
  ok(!e.byId['strikeViewRaidsBtn'].classList.contains('btn--accent'),
    'y el alterno queda como ghost');
}

section('ESCENA 2 · el par de Strikes responde al click (no es decorativo)');
{
  const e = escena2({ prefStrikes: true });
  cablear(e, wireReal);

  e.byId['strikeViewRaidsBtn'].click();
  ok(e.ls.getItem('gn:raids:strike:view') === 'raids',
    'el click ESCRIBE la preferencia',
    'quedo: ' + e.ls.getItem('gn:raids:strike:view'));
  ok(!e.raidPanel.hasAttribute('hidden'), 'y muestra el panel de Raids');
  ok(e.strikePanel.hasAttribute('hidden'), 'y oculta el de Strikes');

  e.byId['strikeViewStrikesBtn'].click();
  ok(e.ls.getItem('gn:raids:strike:view') === 'strikes', 'el click inverso tambien escribe');
  ok(!e.strikePanel.hasAttribute('hidden'), 'y vuelve a mostrar Strikes');
}

section('ESCENA 2 · sin pref, el default es Raids (politica, no azar)');
{
  const e = escena2({ prefStrikes: false });
  cablear(e, wireReal);
  ok(!e.raidPanel.hasAttribute('hidden'),
    'sin preferencia guardada, el par de Strikes abre Raids');
  ok(e.byId['strikeViewRaidsBtn'].classList.contains('btn--accent'),
    'con el boton de Raids resaltado');
}

// ═══════════════════════════════════════════════════════════════════════════
section('CONTROL NEGATIVO (N1) · guard "todo o nada" deja la escena 2 MUDa');

{
  // Mutacion sobre el escritor real: se exige que los 4 botones existan antes
  // de cablear. Es el guard que el HB#125 menciona y que hoy NO esta.
  const ancla = 'if (!raidsBtn || !strikesBtn || !raidsPanel || !strikesPanel) return;';
  ok(wireReal.includes(ancla),
    'el ancla del guard por pareja existe (si no, la mutacion no se puede aplicar)');
  const mutado = wireReal.replace(ancla,
    ancla + "\n    if (!document.getElementById('viewRaidsBtn') || !document.getElementById('viewStrikesBtn')) return;");

  const e = escena2({ prefStrikes: true });
  cablear(e, mutado);

  ok(e.byId['strikeViewRaidsBtn'].nListeners('click') === 0,
    'N1: con el guard "todo o nada" los botones de Strikes quedan SIN listener',
    'quedaron ' + e.byId['strikeViewRaidsBtn'].nListeners('click') + ' — la mutacion no sirve como control');
  ok(e.byId['strikeViewStrikesBtn'].nListeners('click') === 0,
    'N1: los dos, no solo uno');
  ok(e.strikePanel.hasAttribute('hidden') || !e.byId['strikeViewStrikesBtn'].classList.contains('btn--accent'),
    'N1: y el panel NO se resuelve a la preferencia — la escena 2 esta rota');

  // El control tiene que distinguir: el guard real, en la MISMA escena, cablea.
  const e2 = escena2({ prefStrikes: true });
  cablear(e2, wireReal);
  ok(e2.byId['strikeViewRaidsBtn'].nListeners('click') === 1 &&
     e2.byId['strikeViewStrikesBtn'].nListeners('click') === 1,
    'N1: y el guard REAL en la misma escena cablea — la diferencia es el guard, no la escena');
}

section('CONTROL NEGATIVO (N2) · con los 4 botones, ambos guards coinciden');
{
  // Este es el hallazgo que hace NECESARIO este archivo: con los 4 botones
  // presentes (lo que hace el arnes del HB#125), el guard mutado NO se
  // distingue del real. Por eso el HB#125 no podia ver la escena 2.
  const ancla = 'if (!raidsBtn || !strikesBtn || !raidsPanel || !strikesPanel) return;';
  const mutado = wireReal.replace(ancla,
    ancla + "\n    if (!document.getElementById('viewRaidsBtn') || !document.getElementById('viewStrikesBtn')) return;");

  const e = escena2({ prefStrikes: true, conParRaids: true });
  cablear(e, mutado);
  ok(e.byId['strikeViewStrikesBtn'].nListeners('click') === 1,
    'N2: con los 4 botones, el guard mutado tambien cablea — indistinguible del real');
  ok(!!e.byId['viewRaidsBtn'] && !!e.byId['viewStrikesBtn'],
    'N2: el par de Raids SI existe en este escenario — y por eso hb125 no puede ver la escena 2');
}

console.log('\n' + (fail === 0 ? 'TODO OK' : 'HAY FALLOS') + ' — ' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail === 0 ? 0 : 1);
