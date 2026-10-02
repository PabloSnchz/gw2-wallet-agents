// tests/hb119-1-1-precio-oro.test.js — PRECIO-01..05
// QUE PRUEBA: que el precio TP de la card del Catalogo use el componente
// visual de oro de la Cartera (`.coin` / `.coin--g`) y no texto plano.
//
// POR QUE UN TEST Y NO "se ve bien": la diferencia entre `1.889g` y un badge
// de oro es un cambio de CLASE, y un cambio de clase no se ve en un diff de
// JS si el render lo produce por concatenacion. Lo unico que lo distingue es
// el HTML resultante, asi que se asserta el HTML.
//
// FASE ROJA: contra el archivo sin el fix, PRECIO-01/02/03 dan FAIL (3).
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

// Renderiza el catalogo por el CAMINO REAL: `render-catologo.js` no se expone
// solo, se registra en el tracker con `registerRender()` y el tracker lo
// invoca. Un test que lo llamara directo probaria una API que no existe y
// pasaria sin ejercitar el registro, que es justo donde puede romperse.
async function renderCatalogo(armoryIds, mode) {
  const t = boot();
  t.d.el('keySelectGlobal').value = 'KEY-A';
  t.ctx.GW2Api.getAccountLegendaryArmory = () => Promise.resolve(armoryIds || []);
  const T = t.ctx.LegendaryTracker;
  if (!T || typeof T.activate !== 'function') return { html: '', disponible: false };
  T.activate();
  await tick();
  if (mode && typeof T.setMode === 'function') T.setMode(mode);
  return { html: t.d.el('legendaryModeContent').innerHTML, disponible: true };
}

const run = async () => {
  console.log('PRECIO: el precio TP usa el componente de oro de la Cartera');

  // --- PRECIO-01: la card emite la clase .coin ---
  {
    const out = await renderCatalogo([]);
    ok('PRECIO-01 el catalogo se renderiza y usa el componente de oro',
      out.disponible && out.html.indexOf('class="coin') !== -1,
      'disponible=' + out.disponible + ' longitud=' + out.html.length);
  }

  // --- PRECIO-02: NO queda el texto plano "1.889g" suelto ---
  {
    const out = await renderCatalogo([]);
    // El texto plano era `formatCoinShort()`: un numero pegado a la letra de
    // la unidad ("1.889g"). La regex tiene que ser ESPECIFICA de esa forma.
    //
    // La primera version uso `[^>"]\d[\d.,]*[gsc]`, que tambien matchea
    // "0.15s" de un `transition:all 0.15s ease` inline y "57" de "Arma (57)".
    // Un assert cuyo regex matchea CSS inline no mide el precio: mide el
    // HTML entero y por eso no podria pasar. Se acota a la forma real.
    const plano = /(?:>|\s)\d{1,3}[.,]\d{3,}[gsc]\b/.test(out.html) ||
      />\d{1,6}[gsc]</.test(out.html);
    ok('PRECIO-02 no queda ningun precio como texto plano',
      out.disponible && !plano,
      'match=' + (out.html.match(/(?:>|\s)\d{1,3}[.,]\d{3,}[gsc]\b|>\d{1,6}[gsc]</) || ['(nada)'])[0]);
  }

  // --- PRECIO-03: el render usa la clase .coin (no un estilo inline nuevo) ---
  {
    const src = fs.readFileSync(path.join(ROOT, 'js/render-catologo.js'), 'utf8');
    ok('PRECIO-03 el render usa la clase .coin (no un estilo inline nuevo)',
      /class="coin\s*coin--/.test(src) || /coin--g|coin--s|coin--c/.test(src),
      'no se encontro la clase coin en el render');
  }

  // --- PRECIO-04: el CSS del componente ya existe, no se invento otro ---
  {
    const css = fs.readFileSync(path.join(ROOT, 'css/main.css'), 'utf8');
    ok('PRECIO-04 css/main.css define .coin y sus tres variantes',
      /\.coin\{/.test(css) && /\.coin--g::after/.test(css) &&
      /\.coin--s::after/.test(css) && /\.coin--c::after/.test(css));
  }

  // --- PRECIO-05: la regla de las 3 capas (el render no define el color) ---
  {
    const src = fs.readFileSync(path.join(ROOT, 'js/render-catologo.js'), 'utf8');
    // El color de la unidad lo pone el ::after de main.css. Si el render
    // definiera tambien el color, habria dos fuentes de verdad para el mismo
    // pixel y un cambio de tema no llegaria a las cards de la Armeria.
    const defineColorDeUnidad = /\.coin--[gsc][^'"]*color\s*:/i.test(src);
    ok('PRECIO-05 el render NO define el color de la unidad (lo pone main.css)',
      !defineColorDeUnidad);
  }

  console.log('\n  PRECIO: ' + pass + ' pass / ' + fail + ' fail');
  if (fail > 0) process.exitCode = 1;
};
run();
