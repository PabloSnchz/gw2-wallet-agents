/*!
 * tests/arma-2-3-cola-contrato.test.js - ARME 2.3: el contrato de la cola
 *
 * POR QUE EXISTE ESTE ARCHIVO Y NO UN TERCER
 * ------------------------------------------
 * Hay dos arneses de cola en el repo y los dos miran cosas distintas:
 *
 *   - `armeria-cola.test.js`     : la cola como DATO (el que uno escribe a mano)
 *   - `hb126-cola-crafteo.test.js`: la cola como API (agregar, quitar, tope,
 *                                  orden, persistencia, la vista)
 *
 * Lo que ninguno de los dos mira, y que es lo que este archivo mide:
 *
 *   1. LAS ESCRITURAS. Que la cola escriba cuando tiene que y NO escriba cuando
 *      no. Un rechazo por "llena" que escribe es ruido que no se ve; un QUITAR
 *      que no escribe es perder la cola entera al recargar. Los dos son
 *      silenciosos y los dos son de la misma causa: `saveQueue()` en el lugar
 *      equivocado del `if`.
 *
 *   2. LA CARGA DEFENSIVA. `sanitizeQueue` es la unica barrera contra un
 *      `localStorage` editado a mano, y sus reglas (deduplicar, truncar al
 *      tope, aceptar strings numericos) son las que evitan que un array raro
 *      reviente el modulo al arrancar.
 *
 *   3. QUE UN ITEM ENCOLADO NO LO ESCONDA EL FILTRO. Los tres filtros viven
 *      en la misma barra que la cola, asi que "filtrar" y "mi cola" se rozan.
 *      Si la cola llegara a filtrarse, un item que el usuario puso ahi
 *      desapareceria sin aviso, y el sintoma seria "no me acuerdo de la cola".
 *
 *   4. EL PESO VISUAL DE LAS TRES PRIMERAS. Es una decision de diseno que el
 *      producto ya tiene (tracker.js, `pos < 3`) y que ningun arnes congela.
 *
 *   5. LA DIFERENCIA ENCOLADO / NO ENCOLADO. El producto la tiene y es real:
 *      el boton del modal dice "Quitar de la cola" en vez de "Agregar".
 *
 * QUE NO AFIRMA
 * -------------
 * No afirma el tope, ni el orden, ni la persistencia: eso es `hb126`, y
 * duplicarlo seria el transversal #4 (codigo duplicado) con dos tests que se
 * cubren el uno al otro y divergen a los seis meses sin que nadie sepa cual
 * miente.
 *
 * Y no afirma que el Catalogo marque los items encolados: NO LO HACE, y es un
 * hueco de producto, no de test. Ver `ALERT-208` en SESSION_LOG.md. Afirmar el
 * hueco como si fuera lo correcto lo convertiria en una regla.
 *
 * LAS MUTACIONES
 * --------------
 * Cada grupo tiene una mutacion que lo tiene que volver ROJO, y se mide desde
 * afuera con `--mutar=<nombre>`. Un assert que nunca se vio fallar no es un
 * assert: es una linea que ejecuta y produce `true`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ALERT-205: la raiz se resuelve desde `__dirname`. Escribirla a mano ata el
// arnes a la carpeta donde se escribio y tira ENOENT en el proximo worktree,
// antes de la primera asercion.
const ROOT = path.join(__dirname, '..');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

let pass = 0, fail = 0;

// La firma es (txt, cond, detalle) y el texto se VALIDA. Un `ok(cond)` que
// pasa un string como condicion es siempre truthy: verde sin haber medido.
const ok = (txt, cond, detalle) => {
  if (typeof txt !== 'string' || txt.length === 0) {
    console.log('  FAIL - ASSERT SIN TEXTO (la firma es ok(txt, cond, detalle))');
    fail++;
    return;
  }
  if (cond) { pass++; console.log('  pass - ' + txt + (detalle ? '  [' + detalle + ']' : '')); }
  else { fail++; console.log('  FAIL - ' + txt + (detalle ? '  [' + detalle + ']' : '')); }
};

// --- Instrumentos leidos del codigo, no escritos a mano -------------------
// Un id de item o un prefijo escritos a mano hacen que el arnes pase probando
// algo que el producto no tiene.
const SRC = read('js', 'legendary-tracker.js');

const STORAGE_PREFIX = (function () {
  const m = SRC.match(/STORAGE_PREFIX\s*=\s*'([^']+)'/);
  return m ? m[1] : '';
})();
const QUEUE_MAX = (function () {
  const m = SRC.match(/QUEUE_MAX\s*=\s*(\d+)/);
  return m ? parseInt(m[1], 10) : -1;
})();
const QUEUE_KEY = (function () {
  const m = SRC.match(/QUEUE_KEY\s*=\s*'([^']+)'/);
  return m ? m[1] : '';
})();
const LS_QUEUE = STORAGE_PREFIX + QUEUE_KEY;

const CAT_IDS = (function () {
  const m = read('js', 'legendary-data.js').match(/"id":\s*(\d+)/g) || [];
  return m.map(s => parseInt(s.replace(/\D/g, ''), 10));
})();

const CARGA = [
  'js/legendary-data.js',
  'js/legendary-recipes.js',
  'js/legendary-precursors.js',
  'js/legendary-tree.js',
  'js/legendary-tree-ui.js',
  'js/legendary-tracker.js',
  'js/render-catologo.js',
];

// --- Mutaciones ----------------------------------------------------------
// Cada una rompe UNA propiedad. Se aplican sobre el texto ANTES de correrlo
// en la VM, asi que el arnes no cambia: lo que cambia es el producto.
//
// El texto se normaliza a LF antes de mutar. Los archivos del repo estan en
// CRLF, y un patron escrito con `\n` pegado a una llave (`renderQueuePanel()
// {`) no matchea un `{` seguido de `\r`: la mutacion queda sin aplicar, el
// arnes sigue en verde, y el "no morio" se lee como un assert debil cuando en
// realidad es una mutacion que no existio.
const MUTACIONES = {
  'escribe-al-rechazar': (s) => s.replace(
    "if (state.queue.length >= QUEUE_MAX) {",
    "saveQueue();\n    if (state.queue.length >= QUEUE_MAX) {"),
  'no-escribe-al-quitar': (s) => s.replace(
    /(var at = state\.queue\.indexOf\(id\);[\s\S]*?state\.queue\.splice\(at, 1\);\s*\n\s*)saveQueue\(\);/,
    '$1/* mutado: quitar no guarda */'),
  'no-deduplica': (s) => s.replace(
    'function sanitizeQueue(raw) {',
    'function sanitizeQueue(raw) {\n  return Array.isArray(raw) ? raw : [];'),
  'no-trunca': (s) => s.replace('out.length < QUEUE_MAX;', 'true;'),
  'filtra-la-cola': (s) => s.replace(
    'function renderQueuePanel() {\n    var items = queueItems();',
    'function renderQueuePanel() {\n    var items = queueItems().slice(3);'),
  // La que prueba lo que ALERT-211 pedia: si alguien implementa la salida de
  // "la cola SE filtra", 3.1 tiene que CAER. Antes no se podia comprobar,
  // porque el escenario de 3.1 no ponia ningun filtro.
  'filtra-por-el-filtro': (s) => s.replace(
    'function renderQueuePanel() {\n    var items = queueItems();',
    'function renderQueuePanel() {\n    var items = queueItems().filter(function (it) { return passesFilters(it, ownedMap()); });'),
  'sin-peso-visual': (s) => s.replace('var top3 = pos < 3;', 'var top3 = false;'),
  'etiqueta-fija': (s) => s.replace(
    "(enCola ? 'Quitar de la cola' : 'Agregar a la cola')",
    "'Agregar a la cola'"),
};

// --- Sandbox -------------------------------------------------------------
function makeDom() {
  const nodes = {};
  const mk = (id) => ({
    id, _h: '', textContent: '', value: null, style: {}, children: [],
    get innerHTML() { return this._h; }, set innerHTML(v) { this._h = v; },
    getAttribute: () => null, setAttribute: () => {}, removeAttribute: () => {},
    // `hasAttribute` faltaba y `_debug()` del tracker lo usa
    // (`legendary-tracker.js:1287`, `panelVisible`). Sin el, la API de debug que
    // AGENTS.md documenta era INEJECUTABLE desde este arnes.
    hasAttribute: () => false,
    addEventListener: () => {}, appendChild: () => {}, insertAdjacentHTML: () => {},
    querySelector: () => mk(id + '|q'), querySelectorAll: () => [],
    classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
    dataset: {}
  });
  const el = (id) => nodes[id] || (nodes[id] = mk(id));
  return {
    nodes, el,
    document: {
      getElementById: el,
      querySelector: (s) => (s && s[0] === '#' ? el(s.slice(1)) : null),
      querySelectorAll: () => [], createElement: () => mk('new'),
      addEventListener: () => {}, dispatchEvent: () => {},
      documentElement: mk('html'), body: mk('body'), head: mk('head')
    }
  };
}

function boot(mutacion) {
  const d = makeDom();
  d.writes = [];
  d.aplicadas = [];
  const ctx = {
    console: { log: () => {}, warn: () => {}, error: () => {}, info: () => {}, debug: () => {} },
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    document: d.document,
    localStorage: {
      getItem: (k) => (k in d.store ? d.store[k] : null),
      // CONTADOR DE ESCRITURAS: el grupo 1 mide esto, no el valor guardado.
      setItem: (k, v) => { d.writes.push(k + '=' + String(v)); d.store[k] = String(v); },
      removeItem: (k) => { delete d.store[k]; }
    },
    CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; },
    Array, Object, Number, String, Math, JSON, Date, Promise, isNaN, parseInt, parseFloat
  };
  d.store = {};
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  ctx.GW2Api = {
    getAccountLegendaryArmory: () => Promise.resolve([]),
    getAccountBank: () => Promise.resolve([]),
    getAccountMaterials: () => Promise.resolve([])
  };
  vm.createContext(ctx);
  for (const f of CARGA) {
    let src = read(f).replace(/\r\n/g, '\n');
    if (mutacion) {
      const antes = src;
      src = mutacion(src, f);
      if (src !== antes) d.aplicadas.push(f);
    }
    try { vm.runInContext(src, ctx, { filename: f }); }
    catch (e) { console.log('  ERROR AL CARGAR ' + f + ': ' + e.message); }
  }
  return { ctx, d };
}

const T = (t) => t.ctx.LegendaryTracker;

// En la fase roja `toggleQueue` puede no existir. Un stub con la misma FORMA
// hace que cada assert falle con su numero, en vez de que el primero reviente
// con un TypeError y los otros queden sin medir.
const AUSENTE = { ok: false, reason: 'ausente', queue: [], added: false };
function colaDe(t) {
  const tr = T(t) || {};
  return {
    toggle: typeof tr.toggleQueue === 'function' ? tr.toggleQueue : function () { return AUSENTE; },
    get: typeof tr.getQueue === 'function' ? tr.getQueue : function () { return []; }
  };
}

const writesOf = (t) => t.d.writes.filter(w => w.indexOf(LS_QUEUE + '=') === 0);
const htmlCola = (t) => {
  const tr = T(t);
  if (tr && typeof tr.setMode === 'function') tr.setMode('progress');
  return t.d.el('legendaryModeContent').innerHTML;
};
// El tipo de cada item del catalogo, leido del MISMO archivo del que salen
// CAT_IDS. No se hardcodea: si el catalogo reordena o cambia de generacion, el
// filtro que este bloque elige tiene que seguir excluyendo a las encoladas.
const TIPO_DE = (function () {
  const m = read('js', 'legendary-data.js').match(/"id":\s*(\d+)(?:(?!\n  \{).){0,600}?"type":\s*"([a-z]+)"/gs) || [];
  const mapa = {};
  m.forEach((s) => { const p = s.match(/"id":\s*(\d+)/); const q = s.match(/"type":\s*"([a-z]+)"/); if (p && q) mapa[p[1]] = q[1]; });
  return mapa;
})();
// Cada fila de la cola, en orden de pintura.
const filas = (html) => {
  const out = [];
  const re = /<div class="lt-queue-row" data-queue-id="(\d+)" style="([^"]*)"/g;
  let m;
  while ((m = re.exec(html)) !== null) out.push({ id: m[1], estilo: m[2] });
  return out;
};
// El estilo se escribe como `border-left:3px solid #974EFF` y
// `background:rgba(...)`. Se busca la PROPIEDAD, no un color literal: el color
// es una decision que puede cambiar y el arnes no tiene por que saberla.
const deFila = (f, prop) => {
  const m = new RegExp('(?:^|;)\\s*' + prop + ':([^;]+)').exec(f.estilo);
  return m ? m[1] : null;
};

const run = async () => {
  const arg = process.argv.find(a => a.indexOf('--mutar=') === 0);
  const nombreMut = arg ? arg.slice('--mutar='.length) : null;
  const mut = nombreMut ? MUTACIONES[nombreMut] : null;
  if (nombreMut && !mut) {
    console.log('  ERROR: mutacion desconocida: ' + nombreMut);
    console.log('  disponibles: ' + Object.keys(MUTACIONES).join(', '));
    process.exit(1);
  }
  console.log('CONTRATO DE LA COLA (2.3)' + (nombreMut ? '  [MUTACION: ' + nombreMut + ']' : ''));

  // --- CONTROLES DEL INSTRUMENTO, antes de mirar un solo dato ------------
  if (nombreMut) {
    // Una mutacion que no cambio el texto no es una mutacion: la corrida
    // sigue en verde y se lee como "el assert es debil" cuando en realidad
    // nadie rompio nada. Sin este control, la tabla de mutaciones miente.
    const t0 = boot(mut);
    ok('CONTROL la mutacion se APLICO al menos a un archivo',
      t0.d.aplicadas.length > 0,
      'aplicadas=' + JSON.stringify(t0.d.aplicadas) +
      (t0.d.aplicadas.length ? '' : '  <-- la mutacion no existe: el resultado de abajo no mide nada'));
  }

  // Un criterio imposible tiene que dar 0. Un criterio de conteo que nunca
  // puede dar "menos de 3" no esta midiendo.
  ok('CONTROL el criterio imposible da 0 y no "todo pasa"',
    [1, 2, 3].filter(x => x > 99).length === 0,
    'control negativo');
  ok('CONTROL el criterio posible da lo que dice y no 0',
    CAT_IDS.length > 100 && QUEUE_MAX === 5 && LS_QUEUE !== 'queue=',
    'ids=' + CAT_IDS.length + ' QUEUE_MAX=' + QUEUE_MAX + ' clave=' + LS_QUEUE);

  // --- 1. LAS ESCRITURAS -------------------------------------------------
  {
    const t = boot(mut);
    const C = colaDe(t);
    const w0 = writesOf(t).length;
    C.toggle(CAT_IDS[0]);
    ok('1.1 agregar ESCRIBE exactamente una vez',
      writesOf(t).length === w0 + 1, 'writes=' + (writesOf(t).length - w0));

    const w1 = writesOf(t).length;
    C.toggle(CAT_IDS[0]);
    ok('1.2 quitar TAMBIÉN escribe (una cola que solo guarda al agregar pierde el ultimo)',
      writesOf(t).length === w1 + 1, 'writes=' + (writesOf(t).length - w1));

    // El rechazo por tope: con la cola en 5, un id nuevo no puede entrar.
    const t2 = boot(mut);
    const C2 = colaDe(t2);
    for (let i = 0; i < 5; i++) C2.toggle(CAT_IDS[i]);
    const wFull = writesOf(t2).length;
    C2.toggle(CAT_IDS[9]);
    ok('1.3 un RECHAZO por cola llena NO escribe (guardar el mismo estado es ruido)',
      writesOf(t2).length === wFull, 'writes=' + (writesOf(t2).length - wFull));

    const t3 = boot(mut);
    const C3 = colaDe(t3);
    const wBad = writesOf(t3).length;
    C3.toggle('no-es-un-id');
    ok('1.4 un RECHAZO por id invalido TAMPOCO escribe',
      writesOf(t3).length === wBad, 'writes=' + (writesOf(t3).length - wBad));
  }

  // --- 2. LA CARGA DEFENSIVA ---------------------------------------------
  // `loadQueue()` corre DENTRO de `activate()`, no al cargar el IIFE (leer
  // localStorage antes de tiempo es lo que hace el resto del repo). Injectar la
  // clave despues de boot, sin activar, mide el estado recien creado y no el
  // leido del disco: el arnes pasa con `[]` y no esta probando nada.
  {
    const tick = async (n) => { for (let i = 0; i < (n || 8); i++) await Promise.resolve(); };
    const carga = async (crudo) => {
      const t = boot(mut);
      if (crudo !== undefined) t.d.store[LS_QUEUE] = crudo;
      const tr = T(t);
      if (tr && typeof tr.activate === 'function') { await tr.activate(); await tick(); }
      return JSON.stringify(colaDe(t).get());
    };
    const c0 = await carga(undefined);
    ok('2.0 la carga pasa por activate() y no por getQueue() recien creado',
      c0 === '[]', 'sin guardar=' + c0);
    const c1 = await carga(JSON.stringify('nada'));
    const c2 = await carga(JSON.stringify({ a: 1 }));
    ok('2.2 algo que no es un array da cola vacia, no una excepcion',
      c1 === '[]' && c2 === '[]', 'string=' + c1 + ' objeto=' + c2);
    const sucio = JSON.stringify([CAT_IDS[0], 'x', -3, 0, 2.5, null, CAT_IDS[1], CAT_IDS[0]]);
    const c3 = await carga(sucio);
    ok('2.3 la basura se depura y el orden de los buenos se respeta',
      c3 === JSON.stringify([CAT_IDS[0], CAT_IDS[1]]), 'leido=' + c3);
    const largo = JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8]);
    const c4 = await carga(largo);
    ok('2.4 una cola guardada mas larga que el tope se TRUNCA al cargar',
      c4 === '[1,2,3,4,5]', 'leido=' + c4);
  }

  // --- 3. EL FILTRO NO ESCONDE LO QUE EL USUARIO ENCOLO -----------------
  // El sintoma de este bug seria "no me acuerdo de la cola", no un error.
  // Con la cola llena y cualquier combinacion de filtros, los cinco tienen que
  // seguir en el HTML.
  //
  // ALERT-211: la cabecera decia "cualquier combinacion de filtros" y el codigo
  // NO aplicaba NINGUNO: `htmlCola()` solo hacia `setMode('progress')` y leia
  // el innerHTML. El escenario que el bloque nombra no existia, asi que el
  // aserto daba verde CON y SIN filtrado — y por eso las DOS mitades del
  // contrato pasaban a la vez: esta (el filtro NO borra la cola) y COLA-13 (los
  // filtros eligen QUE ENTRA A LA cola). Con las dos verdes no se puede elegir
  // cual es la buena. Ahora el filtro se pone de verdad, con un tipo que
  // excluye a las cinco encoladas, y hay controles que lo verifican.
  {
    const t = boot(mut);
    const C = colaDe(t);
    // `setFilter()` solo repinta si el tracker esta `active` (y en la app lo
    // esta, porque `activate()` corre al cargar). El sandbox no lo activaba, y
    // sin esto el filtro cambiaba el estado SIN llegar a la pantalla — que es
    // exactamente el falso verde que este bloque vino a tapar.
    if (T(t) && typeof T(t).activate === 'function') T(t).activate();
    for (let i = 0; i < 5; i++) C.toggle(CAT_IDS[i]);
    // Un tipo que NO sea el de las encoladas: si se filtrase, las 5 caerian.
    const tipoDeLas5 = TIPO_DE[String(CAT_IDS[0])];
    const excluyente = Object.keys(TIPO_DE)
      .map((k) => TIPO_DE[k])
      .filter((v, i, a) => a.indexOf(v) === i && v !== tipoDeLas5)[0];

    const tr = T(t);
    ok('CONTROL el tracker expone setFilter (sin el, 3.1 no mide nada)',
      typeof tr.setFilter === 'function');
    // El filtro se pone DESPUES de entrar en la cola: es el orden que hace el
    // usuario, y es el unico que no dispara el render del catalogo.
    htmlCola(t);
    const puesto = !!(tr && tr.setFilter && tr.setFilter('type', excluyente));
    const dbg = (tr && typeof tr._debug === 'function') ? tr._debug() : null;
    ok('CONTROL el filtro quedo PUESTO de verdad (si no se aplico, 3.1 vuelve a ser verde por nada)',
      puesto && dbg && dbg.filters && dbg.filters.type === excluyente,
      'puesto=' + puesto + ' filtro=' + JSON.stringify(dbg && dbg.filters));

    // ESTE es el control que de verdad importa, y es el que faltaba: que el
    // filtro LLEGARA A LA VISTA. Mirar `_debug().filters` verifica el SETTER, y
    // el setter puede cambiar sin que nada se repinte — o sea, decir "el filtro
    // esta puesto" mientras la pantalla muestra la de antes. Lo que mira el
    // usuario es el boton marcado activo.
    const htmlTrasFiltro = t.d.el('legendaryModeContent').innerHTML;
    const activo = htmlTrasFiltro.indexOf('class="lt-filter-btn active') !== -1 &&
      htmlTrasFiltro.indexOf('data-fvalue="' + excluyente + '"') !== -1;
    ok('CONTROL el filtro LLEGO A LA VISTA (el boton quedo activo); sin esto, 3.1 mira una pantalla vieja',
      activo,
      'activoEnHtml=' + activo + ' tipo=' + excluyente);
    ok('CONTROL el filtro elegido EXCLUYE a las cinco encoladas (si las dejaria pasar, 3.1 no distinguiria nada)',
      tipoDeLas5 !== excluyente,
      'tipo5=' + tipoDeLas5 + ' excluyente=' + excluyente);

    const html = htmlTrasFiltro;
    const faltan = CAT_IDS.slice(0, 5).filter(id => html.indexOf('data-queue-id="' + id + '"') === -1);
    ok('3.1 con la cola llena y un filtro PUESTO, los 5 encolados estan pintados (el filtro no borra la cola)',
      faltan.length === 0, 'faltan=' + JSON.stringify(faltan) + ' filtro=' + excluyente);

    const barra = /data-ftype=|data-fgen=|data-fexp=/.test(html);
    ok('3.2 la barra de filtros y la cola conviven en la misma vista',
      barra && html.indexOf('Cola de crafteo') !== -1,
      'filtros=' + barra);
  }

  // --- 4. EL PESO VISUAL DE LAS TRES PRIMERAS ----------------------------
  // Se mide la PROPIEDIED (las tres primeras se distinguen de las otras dos), no
  // un color literal: el color es una decision que puede cambiar y el
  // arnes no tiene por que saberla.
  {
    const t = boot(mut);
    const C = colaDe(t);
    // `setFilter()` solo repinta si el tracker esta `active` (y en la app lo
    // esta, porque `activate()` corre al cargar). El sandbox no lo activaba, y
    // sin esto el filtro cambiaba el estado SIN llegar a la pantalla — que es
    // exactamente el falso verde que este bloque vino a tapar.
    if (T(t) && typeof T(t).activate === 'function') T(t).activate();
    for (let i = 0; i < 5; i++) C.toggle(CAT_IDS[i]);
    const fs = filas(htmlCola(t));
    ok('4.1 la cola pinta las 5 filas encoladas',
      fs.length === 5, 'filas=' + fs.length);

    const f3 = fs.slice(0, 3).map(deFilaBorde);
    const f2 = fs.slice(3).map(deFilaBorde);
    ok('4.2 las 3 primeras filas se distinguen de las otras 2 (borde distinto)',
      f3.length === 3 && f2.length === 2 && f3.every(b => b && b !== f2[0]),
      'tres=' + JSON.stringify(f3) + ' otras=' + JSON.stringify(f2));
  }

  // --- 5. ENCOLADO / NO ENCOLADO SE DISTINGUEN ----------------------------
  {
    const t = boot(mut);
    const tr = T(t);
    // PROBES. El arnes dice SI FUE EL PRODUCTO o SI FUE EL SANDBOX. Sin esto,
    // un FAIL aqui es ambiguo: el mismo sintoma lo dan "el boton no cambia" y
    // "el sandbox no pudo pintar el modal".
    const probes = {
      'LegendaryCatalog.items': (t.ctx.LegendaryCatalog && t.ctx.LegendaryCatalog.items || []).length,
      // El modal despacha a `root.LegendaryTree` (el motor), no al tracker.
      // Sin el, `pintarModalLegendaria` hace `return` ANTES de tocar el
      // header, y el boton queda vacio sin que nada falle: el sintoma de un
      // sandbox incompleto es identico al de un producto roto.
      'LegendaryTree': typeof t.ctx.LegendaryTree,
      'LegendaryTreeUI': typeof t.ctx.LegendaryTreeUI,
      'LegendaryPrecursors': typeof t.ctx.LegendaryPrecursors,
      'openItemModal': typeof tr.openItemModal
    };
    let htmlNo = '', htmlSi = '', err = null;
    try {
      const id = CAT_IDS[0];
      const items = (t.ctx.LegendaryCatalog && t.ctx.LegendaryCatalog.items) || [];
      probes['id existe en el catalogo'] = items.filter(x => x.id === id).length;
      tr.openItemModal(id);
      htmlNo = t.d.el('ltItemModalActions').innerHTML;
      colaDe(t).toggle(id);
      tr.openItemModal(id);
      htmlSi = t.d.el('ltItemModalActions').innerHTML;
    } catch (e) { err = e.message; }
    console.log('    probes: ' + JSON.stringify(probes) + (err ? ' throw=' + err : ''));
    ok('5.1 un item SIN encolar ofrece "Agregar a la cola"',
      htmlNo.indexOf('Agregar a la cola') !== -1, 'n=' + htmlNo.length);
    ok('5.2 un item ENCOLADO ofrece "Quitar de la cola" (el boton cambia de sentido)',
      htmlSi.indexOf('Quitar de la cola') !== -1, 'n=' + htmlSi.length);
    ok('5.3 el boton del modal apunta al item con el que se encolo',
      htmlSi.indexOf('data-lt-queue="' + CAT_IDS[0] + '"') !== -1,
      'id=' + CAT_IDS[0]);
  }

  console.log('\n  CONTRATO DE LA COLA: ' + pass + ' pass / ' + fail + ' fail');
  if (fail) process.exit(1);
};

function deFilaBorde(f) { return deFila(f, 'border-left'); }

run().catch(e => { console.log('  ERROR: ' + e.message); process.exit(1); });
