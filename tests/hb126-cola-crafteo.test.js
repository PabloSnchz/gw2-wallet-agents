// tests/hb126-cola-crafteo.test.js — COLA-01..12
// QUE PRUEBA: la cola de crafteo del paso 5 del plan de noche.
//
// "Mi progreso" deja de ser la grilla de las 206 divididas por estado de
// posesion y pasa a ser la COLA: maximo 5 legendarias, elegidas de a una desde
// el catalogo, en orden de agregado, con las 3 primeras con mas peso visual.
// SE CAE el switch "Desbloqueadas / Solo faltantes" y con el `setScope()`.
//
// FASE ROJA: contra el archivo SIN la cola, COLA-01..08 dan FAIL (no existe
// `toggleQueue`), y COLA-09..12 dan FAIL por el contrato viejo.
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
    getAccountLegendaryArmory: () => Promise.resolve(opts.armory || []),
    getAccountBank: () => Promise.resolve(opts.bank || []),
    getAccountMaterials: () => Promise.resolve(opts.materials || [])
  };
  vm.createContext(ctx);
  for (const f of ['js/legendary-data.js', 'js/legendary-recipes.js', 'js/legendary-tracker.js', 'js/render-catologo.js']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); }
    catch (e) { console.log('  ERROR AL CARGAR ' + f + ': ' + e.message); }
  }
  return { ctx, d, timers };
}

const tick = async (n) => { for (let i = 0; i < (n || 8); i++) await Promise.resolve(); };
const T = (t) => t.ctx.LegendaryTracker;

// En la fase roja `toggleQueue` NO EXISTE, y llamarlo directo revienta con un
// TypeError que mata la corrida entera: los 13 asserts que siguen no se
// medirian, y un test que deja de medir es peor que uno que falla. Con este
// stub, `toggleQueue` responde `{ok:false,reason:'ausente'}` y CADA assert
// falla de verdad, con el numero completo al final.
const AUSENTE = { ok: false, reason: 'ausente', queue: [], added: false };
function colaDe(t) {
  const tr = T(t);
  return {
    toggle: typeof tr.toggleQueue === 'function' ? tr.toggleQueue : function () { return AUSENTE; },
    get: typeof tr.getQueue === 'function' ? tr.getQueue : function () { return []; }
  };
}

// Clave real: el modulo antepone `gn:legendary:` (legendary-tracker.js:35).
// Escribirla a mano en el test y no leerla del modulo es como se cuela una
// prueba que pasa porque no esta mirando nada.
const LS_PREFIX = (function () {
  const src = fs.readFileSync(path.join(ROOT, 'js/legendary-tracker.js'), 'utf8');
  const m = src.match(/STORAGE_PREFIX\s*=\s*'([^']+)'/);
  return m ? m[1] : '';
})();

// Ids reales del catalogo, leidos del archivo que se esta probando. No se
// escriben a mano: un id inventado pasa el assert de "la cola tiene algo" y
// rompe el de "la cola nombra la legendaria".
const CAT_IDS = (function () {
  const src = fs.readFileSync(path.join(ROOT, 'js/legendary-data.js'), 'utf8');
  const m = src.match(/"id":\s*(\d+)/g) || [];
  return m.map(s => parseInt(s.replace(/\D/g, ''), 10));
})();

const run = async () => {
  console.log('COLA: la cola de crafteo del paso 5');

  // --- COLA-01: la API publica expone la cola ---
  ok('COLA-01 LegendaryTracker expone toggleQueue, getQueue y QUEUE_MAX',
    !!T(boot()) && typeof T(boot()).toggleQueue === 'function' &&
    typeof T(boot()).getQueue === 'function' && T(boot()).QUEUE_MAX === 5,
    'una funcion y un consumidor externo no pueden tener reglas distintas de las 5');

  // --- COLA-02: agregar y quitar ---
  {
    const t = boot();
    const C = colaDe(t);
    const r1 = C.toggle(CAT_IDS[0]);
    ok('COLA-02 agregar devuelve ok y suma', r1.ok === true && r1.added === true &&
      C.get().length === 1, JSON.stringify(r1));
    const r2 = C.toggle(CAT_IDS[0]);
    ok('COLA-03 tocar el mismo id lo quita (toggle, no agregar)',
      r2.ok === true && r2.added === false && C.get().length === 0,
      JSON.stringify(r2));
  }

  // --- COLA-04: el maximo es 5 y se AVISA, no se pisa en silencio ---
  {
    const t = boot();
    const C = colaDe(t);
    for (let i = 0; i < 5; i++) C.toggle(CAT_IDS[i]);
    const r = C.toggle(CAT_IDS[5]);
    ok('COLA-04 la 6ta se rechaza con reason=llena y la cola sigue en 5',
      r.ok === false && r.reason === 'llena' && C.get().length === 5,
      'reason=' + r.reason + ' n=' + C.get().length);
  }

  // --- COLA-05: el ORDEN es de agregado, no alfabetico ---
  {
    const t = boot();
    const C = colaDe(t);
    // Se agregan en orden DECRECIENTE de id: ordenados al reves seria un
    // fallo, porque el plan dice que el peso visual va a las 3 PRIMERAS.
    C.toggle(CAT_IDS[7]);
    C.toggle(CAT_IDS[2]);
    C.toggle(CAT_IDS[5]);
    const q = C.get();
    ok('COLA-05 la cola conserva el orden de agregado',
      q.length === 3 && q[0] === CAT_IDS[7] && q[1] === CAT_IDS[2] && q[2] === CAT_IDS[5],
      'q=' + JSON.stringify(q) + ' esperada=' + JSON.stringify([CAT_IDS[7], CAT_IDS[2], CAT_IDS[5]]));
  }

  // --- COLA-06: quitar y volver a agregar devuelve al FINAL ---
  {
    const t = boot();
    const C = colaDe(t);
    C.toggle(CAT_IDS[0]);
    C.toggle(CAT_IDS[1]);
    C.toggle(CAT_IDS[0]);   // fuera
    C.toggle(CAT_IDS[0]);   // vuelve
    const q = C.get();
    ok('COLA-06 quitar y volver a agregar deja la legendaria al final',
      q.length === 2 && q[0] === CAT_IDS[1] && q[1] === CAT_IDS[0],
      'q=' + JSON.stringify(q));
  }

  // --- COLA-07: id invalido se rechaza, no entra basura ---
  {
    const t = boot();
    const C = colaDe(t);
    const casos = [0, -1, 1.5, NaN, 'abc', null, undefined];
    let todosOk = true;
    for (const c of casos) {
      const r = C.toggle(c);
      if (r.ok !== false || r.reason !== 'id-invalido') todosOk = false;
    }
    ok('COLA-07 un id invalido no entra a la cola', todosOk && C.get().length === 0,
      'q=' + JSON.stringify(C.get()));
  }

  // --- COLA-08: la cola PERSISTE y se rehidrata ---
  {
    const t = boot();
    const C = colaDe(t);
    C.toggle(CAT_IDS[3]);
    C.toggle(CAT_IDS[4]);
    const persistido = t.d.store[LS_PREFIX + 'queue'];
    ok('COLA-08 la cola se persiste bajo la clave real del modulo',
      !!persistido && JSON.parse(persistido).length === 2,
      'clave=' + (LS_PREFIX + 'queue') + ' valor=' + persistido);
    // Re-hidrata desde el mismo localStorage: una cola que se pierde al
    // recargar es una cola que no existe. La rehidratacion pasa por
    // `activate()` -> `loadQueue()`, asi que hay que activarlo: llamar solo
    // `getQueue()` mide el estado recien creado, no el leido del disco.
    const t2 = boot();
    const C2 = colaDe(t2);
    for (const k of Object.keys(t.d.store)) t2.d.store[k] = t.d.store[k];
    await t2.ctx.LegendaryTracker.activate(); await tick();
    const q = C2.get();
    ok('COLA-08b la cola se rehidrata del disco al activar',
      q.length === 2 && q[0] === CAT_IDS[3] && q[1] === CAT_IDS[4],
      'q=' + JSON.stringify(q));
  }

  // --- COLA-09: una cola persistida con basura se corrige sola ---
  {
    const t = boot();
    const C = colaDe(t);
    t.d.store[LS_PREFIX + 'queue'] = JSON.stringify([CAT_IDS[1], 'x', -3, 0, 2.5, null, CAT_IDS[1], CAT_IDS[2]]);
    await t.ctx.LegendaryTracker.activate(); await tick();
    if (typeof t.ctx.LegendaryTracker.setMode === 'function') t.ctx.LegendaryTracker.setMode('progress');
    const q = C.get();
    ok('COLA-09 la basura se descarta y los duplicados se colapsan',
      q.length === 2 && q[0] === CAT_IDS[1] && q[1] === CAT_IDS[2],
      'q=' + JSON.stringify(q));
  }

  // --- COLA-10: "Mi progreso" pinta la COLA, no la grilla de las 206 ---
  {
    const t = boot();
    const C = colaDe(t);
    C.toggle(CAT_IDS[11]);
    if (typeof t.ctx.LegendaryTracker.setMode === 'function') t.ctx.LegendaryTracker.setMode('progress');
    const html = t.d.el('legendaryModeContent').innerHTML;
    ok('COLA-10 "Mi progreso" nombra la cola y la legendaria que tiene',
      html.indexOf('Cola de crafteo') !== -1 && html.indexOf(String(CAT_IDS[11])) !== -1,
      'html=' + html.slice(0, 240));
  }

  // --- COLA-11: el switch de alcance SE CAE, con setScope y sin el ---
  {
    const t = boot();
    const C = colaDe(t);
    const tr = T(t);
    let html = '';
    if (typeof tr.setMode === 'function') { tr.setMode('progress'); html = t.d.el('legendaryModeContent').innerHTML; }
    ok('COLA-11 el switch Desbloqueadas/Solo faltantes ya no esta',
      html.indexOf('data-scope=') === -1 && html.indexOf('Solo faltantes') === -1,
      'el plan dice que se cae; dejarlo es el punto 2.2 vivo');
    // El contrato publico tambien: `setScope` no debe quedar colgando.
    ok('COLA-12 setScope ya no se expone en la API publica',
      typeof tr.setScope !== 'function',
      'setScope=' + typeof tr.setScope);
  }

  // --- COLA-13: los filtros se MANTIENEN en la vista cola ---
  {
    const t = boot();
    const C = colaDe(t);
    if (typeof t.ctx.LegendaryTracker.setMode === 'function') t.ctx.LegendaryTracker.setMode('progress');
    const html = t.d.el('legendaryModeContent').innerHTML;
    ok('COLA-13 los filtros por categoria siguen en "Mi progreso"',
      html.indexOf('data-ftype=') !== -1,
      'el plan mantiene los 3 filtros: ahora eligen que entra a la cola');
  }

  // --- COLA-14: un id de la cola que no esta en el catalogo se SALTA ---
  {
    const t = boot();
    const C = colaDe(t);
    C.toggle(999999999);
    C.toggle(CAT_IDS[13]);
    if (typeof t.ctx.LegendaryTracker.setMode === 'function') t.ctx.LegendaryTracker.setMode('progress');
    const html = t.d.el('legendaryModeContent').innerHTML;
    ok('COLA-14 un id que no esta en el catalogo no rompe la vista',
      html.indexOf('999999999') === -1 && html.indexOf(String(CAT_IDS[13])) !== -1,
      'el catalogo puede cambiar entre versiones y la cola es del usuario');
  }

  console.log('\n  COLA: ' + pass + ' pass / ' + fail + ' fail');
  if (fail) process.exit(1);
};

run().catch(e => { console.log('  ERROR: ' + e.message); process.exit(1); });