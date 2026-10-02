/* tests/hb125-t12b-escritor-comun.test.js
 *
 * HB#125 — T12-b: el strip de Strikes tiene su propio escritor de la preferencia.
 *
 * ── El defecto, medido ──────────────────────────────────────────────────────
 *
 *   raid-tracker.js:1055     wireViewToggle()        cablea viewRaidsBtn/viewStrikesBtn
 *                               lee la gn: y la escribe en cada click
 *   strike-tracker.js:1213   wireStrikeViewToggle()  cablea strikeViewRaidsBtn/strikeViewStrikesBtn
 *                               NO lee ni escribe la preferencia: solo mueve paneles
 *
 * Los dos strips mueven los MISMOS dos paneles (#raidTrackerPanel /
 * #strikeTrackerPanel, index.html:426 y :442) con cuatro ids que no se
 * comparten. O sea: el que Pablo tiene delante puede mostrar Raids, y el otro
 * Strikes, sin que ninguno este equivocado — son dos verdades sobre la misma
 * preferencia, y solo una se persiste.
 *
 * ── Por que este archivo tiene CONTROL NEGATIVO y no solo asertos ───────────
 *
 * ALERT-189: un arnés al que nunca se le hizo una mutación no es un arnés.
 * Este tiene dos controles que tienen que fallar si el bug vuelve:
 *   (C1) el CONTROL: con el par de Raids cableado y la pref en 'strikes', el
 *        panel de Strikes tiene que quedar visible. Si el control falla, este
 *        archivo no sabe ver un caso sano y su veredicto no vale nada.
 *   (C2) el NEGATIVO: si `wireViewToggle` volviera a ignorar sus argumentos y
 *        cableara siempre el par de Raids, el par de Strikes quedaría con el
 *        MISMO numero de listeners que antes (0 propios) y el test tiene que
 *        dar FAIL. Sin esto, un fix que no fixea pasa.
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

/**
 * Mini-DOM. Los 2 paneles tienen body PROPIO: si compartieran body, la
 * inyeccion de Strikes marcaria el body como ya inyectado y la de Raids no
 * ocurriria nunca (el bug (b) del hb101).
 */
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

function escenario({ prefStrikes = false } = {}) {
  const raidPanel = el('raidTrackerPanel');
  const strikePanel = el('strikeTrackerPanel');
  raidPanel.classList.add('panel');
  strikePanel.classList.add('panel');

  // Los 2 strips, con sus 4 ids. Los botones se inyectan de a uno, con un body
  // por panel, para que el guard "inyectar una sola vez" se respete.
  function panelCon(id, html, marcador) {
    const p = el(id);
    const body = el(id + '-body');
    let inyectado = false;
    body.querySelector = (sel) => (inyectado && sel === '#' + marcador ? body : null);
    p.appendChild = (c) => { if (c === body) p.body = c; };
    p.querySelector = (sel) => (sel === '.panel__body' ? body : null);
    p.setHTML = () => { inyectado = true; body.innerHTML = html; };
    return p;
  }

  const raidHTML = '<button id="viewRaidsBtn"></button><button id="viewStrikesBtn"></button>';
  const strikeHTML = '<button id="strikeViewRaidsBtn"></button><button id="strikeViewStrikesBtn"></button>';

  const byId = {};
  function registrar(e) { byId[e.id] = e; return e; }
  registrar(raidPanel); registrar(strikePanel);

  const doc = {
    readyState: 'complete',
    getElementById: (id) => byId[id] || null,
    createElement: (t) => el('nuevo-' + t),
    addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; },
  };

  const raid = panelCon('raidTrackerPanel', raidHTML, 'raidUtcTime');
  const strike = panelCon('strikeTrackerPanel', strikeHTML, 'strikeUtcTime');
  byId['raidTrackerPanel'] = raid; byId['strikeTrackerPanel'] = strike;
  raid.setHTML(); strike.setHTML();
  for (const [nid, cls] of [['viewRaidsBtn', 'btn--accent'], ['viewStrikesBtn', 'btn--ghost'],
    ['strikeViewRaidsBtn', 'btn--ghost'], ['strikeViewStrikesBtn', 'btn--accent']]) {
    const b = registrar(el(nid));
    b.classList.add('btn'); b.classList.add(cls);
  }

  const ls = nuevoLS();
  if (prefStrikes) ls.setItem('gn:raids:strike:view', 'strikes');

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

  return { sandbox, byId, ls, raid, strike };
}

// ─────────────────────────────────────────────────────────────────────────────
section('T12-b · el escritor comun esta parametrizado por pareja');

const raidSrc = src('raid-tracker.js');
const wire = cuerpo(raidSrc, 'function wireViewToggle');

ok(/function wireViewToggle\s*\(\s*raidsBtnId/.test(wire),
  'wireViewToggle acepta los ids de la pareja como parametros');
ok(/raidsBtnId\s*\|\|\s*'viewRaidsBtn'/.test(wire),
  'sin parametros sigue cableando el par de Raids (compatibilidad de los 2 call sites)');
ok(/strikesBtnId\s*\|\|\s*'viewStrikesBtn'/.test(wire),
  'el par de Strikes es el valor por defecto del 2do parametro');
ok(/__GN__\.wireViewTogglePair/.test(raidSrc),
  'el escritor se expone por __GN__.wireViewTogglePair (una funcion de intencion, no el modulo)');
ok(!/window\.__GN__\s*=/.test(raidSrc) || /root\.__GN__\s*=\s*root\.__GN__\s*\|\|/.test(raidSrc),
  'no pisa un __GN__ que ya existia');

section('T12-b · el segundo escritor quedo BORRADO');
const strikeSrc = src('strike-tracker.js');
ok(!/function wireStrikeViewToggle/.test(strikeSrc),
  'wireStrikeViewToggle ya no existe: no puede quedar un segundo escritor de la preferencia');
ok(!/^\s*wireStrikeViewToggle\(\);/m.test(strikeSrc),
  'y activate() ya no lo invoca');
ok(/wireViewTogglePair\('strikeViewRaidsBtn',\s*'strikeViewStrikesBtn'\)/.test(strikeSrc),
  'el call site (3a) esta en strike-tracker y pasa los ids de SU pareja');
const ensure = cuerpo(strikeSrc, 'function ensurePanelContent');
ok(/wireViewTogglePair/.test(ensure),
  'el call site esta en ensurePanelContent(), que es donde NACEN los botones');

section('T12-b · el par de Strikes cablea al NACER (camino de llegada)');
{
  const e = escenario({ prefStrikes: true });
  const gn = { wireViewTogglePair: null };
  // Se inyecta el escritor comun real, tomado VERBATIM del producto.
  const fn = vm.runInContext('(' + wire + ')', e.sandbox);
  gn.wireViewTogglePair = function (a, b) { return fn(a, b); };
  e.sandbox.window.__GN__ = gn;
  e.sandbox.StrikeTracker = { refresh() {}, activate() {} };
  e.sandbox.RaidTracker = { refresh() {} };
  // El escritor real usa prefGet/prefSet y STORAGE_KEYS_RT. SeBoundan a los
  // stubs de Storage de la escena; seeves el contrato REAL (gn: primero,
  // legacy como fallback) y no una version inventada en el test.
  e.sandbox.STORAGE_KEYS_RT = { RAIDS_STRIKE_VIEW: 'gn:raids:strike:view' };
  e.sandbox.prefGet = (k, legacy) => {
    const v = e.ls.getItem(k);
    return v === null ? e.ls.getItem(legacy) : v;
  };
  e.sandbox.prefSet = (k, legacy, v) => {
    e.ls.setItem(k, v);
    if (legacy) e.ls.setItem(legacy, v);
  };

  // El panel de Strikes se construye (nace la pareja) y se cablea.
  e.strike.querySelector('.panel__body').querySelector = () => null; // fuerza re-inyeccion
  const cuerpoEnsure = cuerpo(strikeSrc, 'function ensurePanelContent');
  vm.runInContext('(' + cuerpoEnsure + ')()', e.sandbox);

  // CONTROL (C1): con la pref en 'strikes', el panel de Strikes queda visible.
  ok(!e.byId['strikeTrackerPanel'].hasAttribute('hidden'),
    'CONTROL: el par de Strikes respeta la preferencia y abre Strikes',
    'el par de Strikes no se cableo al nacer');
  ok(e.byId['strikeViewStrikesBtn'].classList.contains('btn--accent'),
    'CONTROL: el resaltado del par de Strikes sigue a la preferencia');
  ok(!e.byId['strikeViewRaidsBtn'].classList.contains('btn--accent'),
    'CONTROL: y el boton de Raids de ese par queda como alterno');

  ok(e.byId['strikeViewRaidsBtn'].nListeners('click') === 1,
    'el boton de Raids del par de Strikes tiene EXACTAMENTE 1 listener (idempotencia por pareja)',
    'tiene ' + e.byId['strikeViewRaidsBtn'].nListeners('click'));
  ok(e.byId['strikeViewStrikesBtn'].nListeners('click') === 1,
    'el de Strikes tambien tiene 1');

  // El flag de idempotencia es POR ELEMENTO: el par de Raids no se marco.
  ok(!e.byId['viewRaidsBtn'].__viewToggleWired,
    'el par de Strikes NO marco el boton del par de Raids (por eso (3a) es viable)');

  // Escribir la preferencia al hacer click: ESTA es la parte que el escritor
  // viejo no hacia.
  e.byId['strikeViewRaidsBtn'].click();
  ok(e.ls.getItem('gn:raids:strike:view') === 'raids',
    'el click en el par de Strikes ESCRIBE la preferencia (el escritor viejo no lo hacia)',
    'quedo: ' + e.ls.getItem('gn:raids:strike:view'));
  ok(!e.byId['raidTrackerPanel'].hasAttribute('hidden'),
    'y muestra el panel de Raids');
  ok(e.byId['strikeTrackerPanel'].hasAttribute('hidden'),
    'y oculta el de Strikes');

  // CONTROL NEGATIVO (C2): si el escritor ignorara sus argumentos, el par de
  // Striques NO tendria listeners propios y este aserto tiene que dar FAIL.
  ok(e.byId['strikeViewRaidsBtn'].__viewToggleWired === true,
    'NEGATIVO: el par de Strikes marco SU propio boton, no el de Raids');

  // Re-cablear la misma pareja no duplica listeners.
  fn('strikeViewRaidsBtn', 'strikeViewStrikesBtn');
  ok(e.byId['strikeViewRaidsBtn'].nListeners('click') === 1,
    're-cablear la MISMA pareja no agrega un 2do listener');
  ok(e.byId['strikeViewStrikesBtn'].nListeners('click') === 1,
    'ni al otro boton de la pareja');
}

section('T12-b · las dos parejas coexisten sin pisarse');
{
  const e = escenario({ prefStrikes: false });
  const fn = vm.runInContext('(' + wire + ')', e.sandbox);
  e.sandbox.STORAGE_KEYS_RT = { RAIDS_STRIKE_VIEW: 'gn:raids:strike:view' };
  e.sandbox.prefGet = (k, legacy) => {
    const v = e.ls.getItem(k);
    return v === null ? e.ls.getItem(legacy) : v;
  };
  e.sandbox.prefSet = (k, legacy, v) => {
    e.ls.setItem(k, v);
    if (legacy) e.ls.setItem(legacy, v);
  };
  e.sandbox.RaidTracker = { refresh() {} };
  e.sandbox.StrikeTracker = { refresh() {}, activate() {} };

  fn();                                            // par de Raids
  fn('strikeViewRaidsBtn', 'strikeViewStrikesBtn'); // par de Strikes

  ok(e.byId['viewRaidsBtn'].__viewToggleWired === true, 'el par de Raids quedo cableado');
  ok(e.byId['strikeViewRaidsBtn'].__viewToggleWired === true, 'y el de Strikes tambien');
  ok(e.byId['viewRaidsBtn'].nListeners('click') === 1, 'el de Raids tiene 1 listener');
  ok(e.byId['strikeViewRaidsBtn'].nListeners('click') === 1, 'el de Strikes tiene 1 listener');

  e.byId['strikeViewRaidsBtn'].click();
  ok(e.ls.getItem('gn:raids:strike:view') === 'raids', 'el click del par de Strikes escribe la pref');
  ok(!e.byId['raidTrackerPanel'].hasAttribute('hidden'), 'y muestra Raids');

  e.byId['viewStrikesBtn'].click();
  ok(e.ls.getItem('gn:raids:strike:view') === 'strikes', 'el click del par de Raids escribe la pref');
  ok(!e.byId['strikeTrackerPanel'].hasAttribute('hidden'), 'y muestra Strikes');
}

console.log('\n' + (fail === 0 ? 'TODO OK' : 'HAY FALLOS') + ' — ' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail === 0 ? 0 : 1);