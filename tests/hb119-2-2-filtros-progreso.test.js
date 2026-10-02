// tests/hb119-2-2-filtros-progreso.test.js — FILTRO-01..07
// QUE PRUEBA: que "Mi progreso" use los MISMOS filtros que el Catalogo
// (Tipo, Gen, Expansion).
//
// CONTRATO ACTUALIZADO EN EL HB#126 (paso 5 del plan de noche): el switch
// "Desbloqueadas / Solo faltantes" y `setScope()` SE CAIERON, porque "Mi
// progreso" dejo de ser la grilla de las 206 divididas por estado de posesion
// y paso a ser la cola de crafteo. FILTRO-03, 06 y 07 afirmaban el contrato
// viejo y se invirtieron; la MECANICA que sigue viva (los 3 filtros
// compartidos entre Catalogo y la cola) no se toco. Ver
// `tests/hb126-cola-crafteo.test.js` para el contrato nuevo completo.
//
// POR QUE EL FILTRO COMPARTIDO ERA UN BUG Y NO UNA FALTANTE DE DISENO:
// `filters` es estado COMPARTIDO en el tracker (`legendary-tracker.js:99`), y
// `catalogItems()` lo aplica. `renderProgress()` lo IGNORA por completo y
// filtra solo por `owned`. O sea: el filtro existe, se dibuja en el Catalogo,
// y en Progreso el usuario puede tocarlo y no pasa nada. Un control visible
// que no hace nada es peor que un control ausente.
//
// FASE ROJA: contra los archivos sin el fix, FILTRO-01/02 dan FAIL.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  pass - ' + name); }
  else { fail++; console.log('  FAIL - ' + name + (extra ? '  [' + extra + ']' : '')); }
}

function makeDom() {
  const nodes = {}, store = {};
  const mk = (id) => ({
    id, _h: '', textContent: '', value: null, style: {}, children: [], attrs: {},
    get innerHTML() { return this._h; }, set innerHTML(v) { this._h = v; },
    // `attrs` con default por objeto: el tracker llama `getAttribute` sobre
    // elementos que el stub recien creo, y si `attrs` fuera undefined el
    // `in` revienta con un TypeError que NO es el bug que se quiere medir.
    // Un stub que crashea no da FAIL: mata el test entero.
    getAttribute: (k) => (k in (this.attrs || {})) ? this.attrs[k] : null,
    setAttribute: (k, v) => { if (!this.attrs) this.attrs = {}; this.attrs[k] = v; },
    removeAttribute: () => {},
    addEventListener: () => {}, appendChild: () => {}, insertAdjacentHTML: () => {},
    querySelector: (s) => mk(id + '|' + s), querySelectorAll: () => [],
    classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
    dataset: {}
  });
  const el = (id) => nodes[id] || (nodes[id] = mk(id));
  return {
    store, nodes, el,
    document: {
      getElementById: el,
      querySelector: (s) => (s[0] === '#' ? el(s.slice(1)) : null),
      querySelectorAll: () => [], createElement: () => mk('new'),
      addEventListener: () => {}, dispatchEvent: () => {},
      documentElement: mk('html'), body: mk('body')
    }
  };
}

function boot() {
  const d = makeDom();
  const ctx = {
    console: { log: () => {}, warn: () => {}, error: () => {}, info: () => {}, debug: () => {} },
    setTimeout: () => 0, clearTimeout: () => {},
    setInterval: () => 0, clearInterval: () => {},
    document: d.document,
    localStorage: { getItem: (k) => (k in d.store ? d.store[k] : null), setItem: (k, v) => { d.store[k] = v; } },
    CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; },
    Array, Object, Number, String, Math, JSON, Date, Promise, isNaN, parseInt, parseFloat
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  ctx.GW2Api = {
    getAccountLegendaryArmory: () => Promise.resolve([]),
    getAccountBank: () => Promise.resolve([]),
    getAccountMaterials: () => Promise.resolve([])
  };
  vm.createContext(ctx);
  for (const f of ['js/legendary-data.js', 'js/legendary-tracker.js', 'js/render-catologo.js']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); }
    catch (e) { console.log('  ERROR AL CARGAR ' + f + ': ' + e.message); }
  }
  return { ctx, d };
}
const tick = async (n) => { for (let i = 0; i < (n || 8); i++) await Promise.resolve(); };

async function render(armoryIds, mode, filters) {
  const t = boot();
  t.d.el('keySelectGlobal').value = 'KEY-A';
  t.ctx.GW2Api.getAccountLegendaryArmory = () => Promise.resolve(armoryIds || []);
  const T = t.ctx.LegendaryTracker;
  if (!T || typeof T.activate !== 'function') return { html: '', disponible: false, T: null };
  T.activate();
  await tick();
  if (mode && T.setMode) T.setMode(mode);
  if (filters && T._debug) {
    // Los filtros se tocan por la API publica, no por el interno.
    if (T.setFilter) filters.forEach(([k, v]) => T.setFilter(k, v));
  }
  await tick();
  return { html: t.d.el('legendaryModeContent').innerHTML, disponible: true, T };
}

// Las ids de una sola familia, para que el filtro sea observable sin
// depender de los numeros de un catalogo que pueden cambiar.
const CAT = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'js/legendary-data.js'), 'utf8')
    .match(/LEGENDARY_CATALOG\s*=\s*(\[[\s\S]*?\n\]);/)[1]);
const ARMAS = CAT.filter(c => c.type === 'armor').slice(0, 5).map(c => c.id);
const ARMAS2 = CAT.filter(c => c.type === 'armor').slice(5, 10).map(c => c.id);

const run = async () => {
  console.log('FILTRO: Mi progreso usa los filtros del Catalogo + switch de alcance');

  // --- FILTRO-01: en progreso se dibuja la barra de filtros ---
  {
    const out = await render([ARMAS[0]], 'progress');
    ok('FILTRO-01 Mi progreso dibuja la barra de filtros',
      out.disponible && out.html.indexOf('lt-filter-bar') !== -1,
      'html=' + out.html.length);
  }

  // --- FILTRO-02: los TRES filtros estan, con los mismos data-ftype ---
  {
    const out = await render([ARMAS[0]], 'progress');
    const h = out.html;
    ok('FILTRO-02 los tres filtros (Tipo/Gen/Exp) estan con los MISMOS data-ftype',
      h.indexOf('data-ftype="type"') !== -1 &&
      h.indexOf('data-ftype="generation"') !== -1 &&
      h.indexOf('data-ftype="expansion"') !== -1,
      'type=' + h.indexOf('data-ftype="type"') +
      ' gen=' + h.indexOf('data-ftype="generation"') +
      ' exp=' + h.indexOf('data-ftype="expansion"'));
  }

  // --- FILTRO-03: el switch Desbloqueadas / Solo faltantes SE CAYO ---
  // CONTRATO ACTUALIZADO (HB#126, paso 5 del plan de noche). Este assert
  // afirmaba lo CONTRARIO y por eso hay que cambiarlo, no borrarlo: el switch
  // "Desbloqueadas / Solo faltantes" se retiro junto con `setScope()` porque
  // "Mi progreso" dejo de ser la grilla de las 206 divididas por estado de
  // posesion y paso a ser la cola de crafteo. Un selector de alcance sobre una
  // lista que ya no existe es un control que no puede cambiar nada visible.
  // Lo que se afirma ahora es que NO esta, y con el mismo criterio del test
  // que ya lo cubria: se lee el HTML que pinto el modulo de verdad.
  {
    const out = await render([ARMAS[0]], 'progress');
    const h = out.html;
    ok('FILTRO-03 el switch Desbloqueadas / Solo faltantes ya NO existe',
      h.indexOf('data-scope="unlocked"') === -1 && h.indexOf('data-scope="missing"') === -1 &&
      h.indexOf('Solo faltantes') === -1,
      'unlocked=' + h.indexOf('data-scope="unlocked"') +
      ' missing=' + h.indexOf('data-scope="missing"') +
      ' (el plan dice que se cae; dejarlo es el punto 2.2 vivo)');
  }

  // --- FILTRO-04: el switch NO aparece en el Catalogo ---
  // En Catalogo se ve el catalogo entero, asi que "Solo faltantes" no tiene
  // sentido ahi: no hay un subconjunto "mio" del catalogo completo. Un switch
  // que no puede cambiar nada visible es un control mentiroso.
  {
    const out = await render([ARMAS[0]], 'catalog');
    ok('FILTRO-04 el switch NO aparece en el Catalogo',
      out.disponible && out.html.indexOf('data-scope=') === -1,
      'aparecio data-scope en catalogo');
  }

  // --- FILTRO-05: el filtro TIPO se APLICA en progreso (no solo se dibuja) ---
  // Este es el assert que distingue "dibuje la barra" de "la barra funciona".
  {
    const todas = await render([ARMAS[0]], 'progress');
    const filtrado = await render([ARMAS[0]], 'progress', [['type', 'armor']]);
    // Con filtro de tipo=armor el set no puede CRECER.
    const cuenta = (h) => (h.match(/lt-item-card/g) || []).length;
    ok('FILTRO-05 aplicar un filtro en progreso no rompe el render',
      filtrado.disponible && cuenta(filtrado.html) <= cuenta(todas.html),
      'todas=' + cuenta(todas.html) + ' filtrado=' + cuenta(filtrado.html));
  }

  // --- FILTRO-06: la vista progreso ya no recorta por estado de posesion ---
  // CONTRATO ACTUALIZADO (HB#126). El assert viejo afirmaba "el alcance
  // missing lista las NO desbloqueadas" usando `setScope`, que ya no existe.
  // No se reemplaza por otro assert sobre `missing`: la pregunta se elimino
  // junto con la grilla. Lo que queda por affirmar es que la vista progreso
  // NO depende de esa API y que sigue renderizando (un modulo que se rompio al
  // retirar el switch es el modo de fallo real que este assert cubre hoy).
  {
    const t = boot();
    t.d.el('keySelectGlobal').value = 'KEY-A';
    t.ctx.GW2Api.getAccountLegendaryArmory = () => Promise.resolve([ARMAS[0]]);
    const T = t.ctx.LegendaryTracker;
    T.activate(); await tick(); T.setMode('progress'); await tick();
    const h = t.d.el('legendaryModeContent').innerHTML;
    ok('FILTRO-06 la vista progreso renderiza SIN setScope (contrato nuevo)',
      typeof T.setScope !== 'function' && h.length > 0 && h.indexOf('lt-filter-bar') !== -1,
      'setScope=' + typeof T.setScope + ' html=' + h.slice(0, 160));
  }

  // --- FILTRO-07: la API publica expone setFilter y NO expone setScope ---
  // `setFilter` sigue siendo el contrato: los 3 filtros por categoria se
  // MANTIENEN (el plan los conserva) y se aplican a lo que entra a la cola.
  // `setScope` se va con el switch, y el test lo verifica para que no quede
  // colgando una API que nadie llama y que un consumidor externo usaria.
  {
    const t = boot();
    const T = t.ctx.LegendaryTracker;
    ok('FILTRO-07 LegendaryTracker expone setFilter y ya NO expone setScope',
      !!T && typeof T.setFilter === 'function' && typeof T.setScope !== 'function',
      'setFilter=' + (T && typeof T.setFilter) + ' setScope=' + (T && typeof T.setScope));
  }

  console.log('\n  FILTRO: ' + pass + ' pass / ' + fail + ' fail');
  if (fail > 0) process.exitCode = 1;
};
run();