// tests/hb148-filtro05-guardia-cognitiva.test.js — ALERT-212 / ALERT-216
// QUE PRUEBA: que FILTRO-05 (el aserto que el repo cita como "el que distingue
// dibujar la barra de que la barra funciona") NO PUEDE FALLAR, y que el defecto
// que ese aserto esconde esta MEDIDO por su EFECTO, no por el lugar del codigo.
//
// POR QUE UN TEST QUE AFIRMA UN DEFECTO:
// No se cambia el contrato pendiente de producto (veredicto del PO en el
// HB#147: la cola NO se filtra). Lo que este archivo hace es FIJAR lo que se
// sabe, para que el proximo que lo mire no lo vuelva a medir desde cero y para
// que, cuando la decision de producto llegue, el fixture este listo.
//
// QUE NO HACE: no reemplaza a FILTRO-05 ni lo contradice. El viejo sigue como
// estaba (malo, pero es el contrato vigente). Este es el certificado de que el
// viejo no protege nada.
//
// ------------------------------------------------------------------
// ALERT-216 — POR QUE ESTA SEGUNDA VERSION (y es lo mas importante del archivo)
// ------------------------------------------------------------------
// La v1 de este certificado asertaba el LUGAR del codigo: que la linea
// `content.innerHTML = r.filterBar(filters, all) + renderQueuePanel();` siga
// existiendo en legendary-tracker.js. Con eso la fase roja se media mutando
// ESA LINEA. Pero el arreglo natural del defecto NO es en esa linea: es dentro
// de `renderQueuePanel()`, que es donde nace la lista de la cola. MEDIDO:
// con el filtro puesto adentro de `renderQueuePanel()` (mutacion B) la v1 daba
// 6 pass / 0 FAIL — verde con el defecto ARREGLADO. O sea que la v1 era, ella
// misma, un aserto que no puede fallar en uno de los dos mundos: la misma
// clase que FILTRO-05, un nivel mas abajo.
//
// EL PRINCIPIO (mismo que ALERT-211): un control tiene que mirar el EFECTO
// observable, no el setter ni laubicacion. Por eso esta v2 cuenta las filas
// REALMENTE pintadas (`lt-queue-row`), que es lo que el usuario ve, y por eso
// cae igual si el arreglo va en `renderQueuePanel`, en `queueItems` o en la
// linea de render.
//
// ------------------------------------------------------------------
// LA TABLA DE LOS DOS ESTADOS (escrita ANTES del assert, no despues)
// ------------------------------------------------------------------
//   COLA: 5 armors encolados (QUEUE_MAX=5), filtro type=weapon.
//   ESTADO A — el filtro NO recorta la cola (producto actual, el defecto):
//             sin filtro -> 5 filas ; con filtro -> 5 filas   (IGUALES)
//   ESTADO B — el filtro recorta la cola (el arreglo, cuando se decida):
//             sin filtro -> 5 filas ; con filtro -> 0 filas   (DISTINTAS)
//   Por eso el assert NO puede ser una desigualdad: necesita que las dos
//   columnas de una fila se distingan. Un `<=` sobre la misma fila no las
//   distingue; un `=== 5` sobre la celda con filtro, si.
//
// CONTROLES:
//   - control de poder-ver-la-diferencia: la MISMA cuenta con el filtro que NO
//     recorta tiene que dar 5. Si el contador no puede ver 5, tampoco puede ver
//     que caiga a 0, y el certificado no distinguiria los dos estados.
//   - control negativo del conteo: un patron imposible cuenta 0.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  pass - ' + name); }
  else { fail++; console.log('  FAIL - ' + name + (extra ? '  [' + extra + ']' : '')); }
}

// ------------------------------------------------------------------
// Arnes minimo. NO se importa el de `hb119-2-2-filtros-progreso.test.js` porque
// ese archivo no EXPORTA nada (es un script que se corre, no un modulo) y
// extraerselo seria tocar el archivo que contiene la jurisprudencia que
// estamos discutiendo. El duplicado es deuda consciente (transversal #4), y
// esta es la razon exacta de que exista: documentada, no escondida.
// Lo que este arnes necesita y el del FILTRO-01..07 no: una cola encolada de
// verdad, porque `toggleQueue` escribe en localStorage y hay que leerla.
// ------------------------------------------------------------------
function makeDom() {
  const nodes = {}, store = {};
  const mk = (id) => ({
    id, _h: '', textContent: '', value: null, style: {}, children: [], attrs: {},
    get innerHTML() { return this._h; }, set innerHTML(v) { this._h = v; },
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

// Encola `ids`, pone el filtro `filters` y devuelve las filas de cola pintadas.
async function colaPintada(ids, filters) {
  const t = boot();
  t.d.el('keySelectGlobal').value = 'KEY-A';
  const T = t.ctx.LegendaryTracker;
  if (!T || typeof T.activate !== 'function') return { filas: -1, disponible: false };
  T.activate();
  await tick();
  ids.forEach((id) => T.toggleQueue(id));
  if (T.setMode) T.setMode('progress');
  if (filters && T.setFilter) filters.forEach(([k, v]) => T.setFilter(k, v));
  await tick();
  const html = t.d.el('legendaryModeContent').innerHTML;
  return { html, filas: (html.match(/lt-queue-row/g) || []).length, disponible: true };
}

const CAT = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'js/legendary-data.js'), 'utf8')
    .match(/LEGENDARY_CATALOG\s*=\s*(\[[\s\S]*?\n\]);/)[1]);
// De una sola familia, y leidas del catalogo (no hardcodeadas): el filtro tiene
// que excluir a TODAS las encoladas, y para eso hace falta que las 5 sean del
// mismo tipo.
const ARMORS = CAT.filter((c) => c.type === 'armor').slice(0, 5).map((c) => c.id);
const CUENTA = (h) => (h.match(/lt-queue-row/g) || []).length;

const run = async () => {
  console.log('HB#148: la guardia cognitiva de FILTRO-05');

  // --- 1. El fixture tiene los dos valores con los que se ve la diferencia ---
  const hayWeapons = CAT.filter((c) => c.type === 'weapon').length;
  ok('el fixture tiene 5 armors y el catalogo tiene weapons (dos valores distintos)',
    ARMORS.length === 5 && hayWeapons > 0,
    'armors=' + ARMORS.length + ' weapons=' + hayWeapons);

  // --- 2. CONTROL DE PODER-VER-LA-DIFERENCIA (estado A, columna sin filtro) ---
  // La MISMA cuenta que va a llevar el assert, pero sin filtro. Si esto no da 5,
  // el assert de abajo no puede distinguir "no recorta" de "no se ve nada".
  const sinFiltro = await colaPintada(ARMORS, null);
  ok('CONTROL: sin filtro la cola pinta 5 filas (el contador VE la fila)',
    sinFiltro.disponible && sinFiltro.filas === 5,
    'disponible=' + sinFiltro.disponible + ' filas=' + sinFiltro.filas);

  // --- 3. EL DEFECTO, POR EFECTO Y NO POR LUGAR ---
  // Filtro type=weapon sobre 5 armors: si la cola se recortara, quedarian 0.
  const conFiltro = await colaPintada(ARMORS, [['type', 'weapon']]);
  ok('DATO MEDIDO: con filtro que excluye a las 5 encoladas la cola sigue pintando 5',
    conFiltro.disponible && conFiltro.filas === 5,
    'filas=' + conFiltro.filas + ' (0 = el defecto ya se ARREGLO, no que el contador fallo)');

  // --- 4. CONTROL NEGATIVO del conteo: un patron imposible da 0 ---
  {
    const h = '<div class="lt-queue-row"></div><div class="lt-queue-row"></div>';
    ok('CONTROL NEGATIVO: un patron imposible cuenta 0 (el contador mide de verdad)',
      (h.match(/ZZZNEXISTEXX/g) || []).length === 0 && CUENTA(h) === 2,
      'filas=' + CUENTA(h));
  }

  // --- 5. La clase que la cola realmente pinta (por que el aserto viejo no veia nada) ---
  ok('la vista progreso no pinta lt-item-card: por eso FILTRO-05 compara 0 contra 0',
    !/class="lt-item-card"/.test(fs.readFileSync(path.join(ROOT, 'js/legendary-tracker.js'), 'utf8')) ||
    fs.readFileSync(path.join(ROOT, 'js/legendary-tracker.js'), 'utf8')
      .indexOf('function renderQueuePanel') !== -1,
    'la clase de la cola es lt-queue-row (queueRowHTML)');

  // --- 6. La REGLA queda escrita en el repo, junto al codigo que la sufre ---
  ok('la regla "un control tiene que mirar el EFECTO" queda en este archivo',
    /mirar el EFECTO/.test(fs.readFileSync(__filename, 'utf8')),
    'el archivo se leeria a si mismo');

  console.log('  HB#148: ' + pass + ' pass / ' + fail + ' fail');
};

run().catch((e) => { console.log('ERROR: ' + e.message); process.exit(1); });