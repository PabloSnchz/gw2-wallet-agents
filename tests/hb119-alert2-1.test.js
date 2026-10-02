// tests/hb119-alert2-1.test.js — ARMF-01/02/03/04
// QUE PRUEBA: que loadLegendaryData() lea la API de verdad, que la armeria
// llegue a `owned`, y que "faltante" signifique exactamente lo que Pablo
// definio (no esta en /v2/account/legendaryarmory = nunca lo crafteo).
//
// FASE ROJA: contra el archivo SIN este fix, ARMF-01/02/03 dan FAIL.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  pass - ' + name); }
  else { fail++; console.log('  FAIL - ' + name + (extra ? '  [' + extra + ']' : '')); }
}

// --- DOM minimo ---------------------------------------------------------
function makeDom() {
  const nodes = {}, store = {};
  const mk = (id) => ({
    id, _h: '', textContent: '', value: null, style: {}, children: [],
    get innerHTML() { return this._h; }, set innerHTML(v) { this._h = v; },
    getAttribute: () => null, setAttribute: () => {}, removeAttribute: () => {},
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

function boot(opts) {
  opts = opts || {};
  const d = makeDom();
  const calls = [];
  const timers = [];
  const ctx = {
    console: { log: () => {}, warn: () => {}, error: () => {}, info: () => {}, debug: () => {} },
    setTimeout: (f) => { timers.push(f); return 0; }, clearTimeout: () => {},
    setInterval: () => 0, clearInterval: () => {},
    document: d.document,
    localStorage: {
      getItem: (k) => (k in d.store ? d.store[k] : null),
      setItem: (k, v) => { d.store[k] = v; }
    },
    CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; },
    Array, Object, Number, String, Math, JSON, Date, Promise, isNaN, parseInt, parseFloat
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  ctx.GW2Api = {
    calls,
    getAccountLegendaryArmory: (token, o) => {
      calls.push(['armory', token, o]);
      if (opts.armoryReject) return Promise.reject(new Error('armory 403'));
      return Promise.resolve(opts.armory || []);
    },
    getAccountBank: (token, o) => {
      calls.push(['bank', token, o]);
      if (opts.bankReject) return Promise.reject(new Error('bank 403'));
      return Promise.resolve(opts.bank || []);
    },
    getAccountMaterials: (token, o) => {
      calls.push(['materials', token, o]);
      if (opts.matReject) return Promise.reject(new Error('materials 403'));
      return Promise.resolve(opts.materials || []);
    }
  };
  vm.createContext(ctx);
  for (const f of ['js/legendary-data.js', 'js/legendary-recipes.js', 'js/legendary-tracker.js', 'js/render-catologo.js']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); }
    catch (e) { console.log('  ERROR AL CARGAR ' + f + ': ' + e.message); }
  }
  return { ctx, d, calls, timers };
}

// `activate()` dispara `refresh()` sin awaiter (por diseño: no tiene que
// bloquear el click en el item de menú). Un `await activate()` solo garantiza
// que se LANZO la carga, no que terminó. Sin este flush los asserts leen el
// estado de antes del fetch y todos fallan juntos, que es indistinguible de
// "el fix no funciona".
const tick = async (n) => { for (let i = 0; i < (n || 8); i++) await Promise.resolve(); };

// `getState()` no existe en el archivo SIN el fix. Si el test lo llamara
// directo, el TypeError mataria la corrida y los 6 asserts que siguen no se
// medirian nunca — un test que deja de medir es peor que uno que falla. Con
// este fallback cada assert FALLA (que es la fase roja real) y la corrida
// termina, con el numero completo de asserts.
const stateOf = (t) => {
  const T = t.ctx.LegendaryTracker;
  if (T && typeof T.getState === 'function') return T.getState();
  return { owned: {}, armoryCount: 0, readErrors: [], bank: [], materials: [] };
};

const run = async () => {
  console.log('ARMF: la armería de la key llega al modulo (bug 2.1)');

  // --- ARMF-01: la API se consulta ---
  {
    const t = boot({ armory: [{ id: 30684 }, { id: 30698 }] });
    t.d.el('keySelectGlobal').value = 'KEY-A';
    await t.ctx.LegendaryTracker.activate(); await tick();
    const armoryCalls = t.calls.filter(c => c[0] === 'armory');
    ok('ARMF-01 llama a getAccountLegendaryArmory con la key seleccionada',
      armoryCalls.length === 1 && armoryCalls[0][1] === 'KEY-A',
      'llamadas=' + armoryCalls.length);
  }

  // --- ARMF-02: owned se arma desde la respuesta ---
  {
    const t = boot({ armory: [{ id: 30684 }, { id: 30698 }] });
    t.d.el('keySelectGlobal').value = 'KEY-A';
    await t.ctx.LegendaryTracker.activate(); await tick();
    const owned = stateOf(t).owned;
    ok('ARMF-02 owned tiene las 2 legendarias de la key',
      owned && owned[30684] > 0 && owned[30698] > 0,
      'owned=' + JSON.stringify(owned));
  }

  // --- ARMF-03: Mi progreso NO queda vacio si la key tiene legendarias ---
  {
    const t = boot({ armory: [{ id: 30684 }, { id: 30698 }] });
    t.d.el('keySelectGlobal').value = 'KEY-A';
    await t.ctx.LegendaryTracker.activate(); await tick();
    // `setMode` tampoco existe en el archivo sin el fix (el modo se cambiaba
    // clickeando el boton, y el boton no existe en el DOM de este test).
    //
    // OJO con lo que se midio al arreglar esto: sin `setMode`, el HTML que hay
    // que leer es el del CATALOGO, y el assert de ARMF-03 ("el progreso no dice
    // 'aun no posees'") PASABA en la fase roja — porque el catálogo tampoco dice
    // esa frase. Un assert que no puede fallar no mide nada. Por eso la
    // ausencia de `setMode` se reporta como FAIL del assert, no como un skip
    // silencioso que deja el numero verde.
    const tieneSetMode = typeof t.ctx.LegendaryTracker.setMode === 'function';
    if (tieneSetMode) t.ctx.LegendaryTracker.setMode('progress');
    const html = t.d.el('legendaryModeContent').innerHTML;
    ok('ARMF-03 el modo progreso lista las legendarias (ya no el estado vacio)',
      tieneSetMode && html.indexOf('Aun no posees') === -1 && html.indexOf('Aún no posees') === -1 && html.length > 0,
      'setMode=' + tieneSetMode + ' largo=' + html.length);
    // Mismo motivo que ARMF-03: en la fase roja el HTML es el del CATALOGO, y
    // el catálogo SI menciona 30684 (esta en el catalogo, no en la key). Por
    // eso el assert se gatea con `tieneSetMode`: lo que se afirma es "el
    // PROGRESO nombra a la legendaria de la key", y sin setMode no hay
    // progreso que afirmar y el assert tiene que caer.
    ok('ARMF-03b el progreso nombra a la legendaria de la key',
      tieneSetMode && (html.indexOf('30684') !== -1 || html.indexOf('Frostfang') !== -1 || html.indexOf('Colmilloescarcha') !== -1),
      'setMode=' + tieneSetMode + ' html=' + html.slice(0, 200));
  }

  // --- ARMF-04: "faltante" = NO esta en legendaryarmory ---
  {
    const t = boot({ armory: [{ id: 30684 }] });
    t.d.el('keySelectGlobal').value = 'KEY-A';
    await t.ctx.LegendaryTracker.activate(); await tick();
    const st = stateOf(t);
    const cat = t.ctx.LegendaryCatalog.items;
    const desbloqueadas = cat.filter(i => st.owned[i.id] > 0).map(i => i.id);
    const faltantes = cat.filter(i => !(st.owned[i.id] > 0)).map(i => i.id);
    ok('ARMF-04 solo 30684 queda como desbloqueada', desbloqueadas.length === 1 && desbloqueadas[0] === 30684,
      'desbloqueadas=' + JSON.stringify(desbloqueadas));
    ok('ARMF-04b las otras 205 quedan como faltantes', faltantes.length === 205,
      'faltantes=' + faltantes.length);
  }

  // --- ARMF-05: un fallo de la API NO se ve como "no tenes ninguna" ---
  {
    const t = boot({ armoryReject: true });
    t.d.el('keySelectGlobal').value = 'KEY-A';
    await t.ctx.LegendaryTracker.activate(); await tick();
    const st = stateOf(t);
    ok('ARMF-05 un 403 se marca como readError, no como cuenta vacia',
      Array.isArray(st.readErrors) && st.readErrors.length === 1,
      'readErrors=' + JSON.stringify(st.readErrors));
  }

  // --- ARMF-06: armory([]) real (key sin legendarias) es estado NORMAL ---
  {
    const t = boot({ armory: [] });
    t.d.el('keySelectGlobal').value = 'KEY-A';
    await t.ctx.LegendaryTracker.activate(); await tick();
    const st = stateOf(t);
    ok('ARMF-06 armeria vacia de verdad NO es error',
      st.readErrors.length === 0 && Object.keys(st.owned).length === 0,
      'readErrors=' + JSON.stringify(st.readErrors));
  }

  // --- ARMF-07: un fallo de bank NO oculta la armeria (allSettled) ---
  {
    const t = boot({ armory: [{ id: 30684 }], bankReject: true });
    t.d.el('keySelectGlobal').value = 'KEY-A';
    await t.ctx.LegendaryTracker.activate(); await tick();
    const st = stateOf(t);
    ok('ARMF-07 si falla el banco, la armeria igual se lee (allSettled)',
      st.owned && st.owned[30684] > 0,
      'owned=' + JSON.stringify(st.owned));
  }

  console.log('\n  ARMF: ' + pass + ' pass / ' + fail + ' fail');
  if (fail > 0) process.exitCode = 1;
};
run();
