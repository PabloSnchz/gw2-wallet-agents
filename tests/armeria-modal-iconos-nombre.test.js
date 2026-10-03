/**
 * armeria-modal-iconos-nombre.test.js — lo que Pablo ve en el modal.
 *
 * QUE MIDE, Y POR QUE NO ES "EL COLOR ES #974EFF"
 * Pablo reporto tres sintomas: en el modal de receta los nombres estan en
 * ingles y sin color de rareza, el titulo deberia ser morado con icono, y en
 * Materiales Totales faltan icono, color y nombre. Un test que afirmara el
 * literal del color pasaria aunque el color llegue de cualquier lado, y el dia
 * que la rareza se|tradujera pasaria sin avisar. Este test afirma el EFECTO:
 * que para los ids que el modal PINTA, `ItemIcons.de()` devuelve icono y
 * nombre. Si el dato no llega, el color no puede salir de ahi y el modal no
 * funciona; si el dato llega, el color sale solo.
 *
 * LA MEDICION PREVIA (HB#157), QUE ES LA QUE DICE DONDE ESTA EL BUG
 * Con 206 legendarias del catalogo, y los contratos reales cargados:
 *   - `byItem` (contrato de precursores) tiene 907 entradas: `ensurePrecursors`
 *     funciona, el bug NO ahi.
 *   - Los ids que se pintan en "Materiales Totales" estan 100% DENTRO de
 *     `byItem` (0 de 7258 filas quedan afuera). O sea que el icono ya estaba
 *     disponible: la tabla no lo PEDIA, solo leia el color.
 *   - Los ids que se pintan en el ARBOL son 13252, de los cuales 206 quedan
 *     FUERA de `byItem`: son las RAICES, o sea las legendarias, que viven en
 *     `legendary-recipes.js` y no en el contrato de precursores.
 * O sea: dos ausencias distintas con una sola causa visible — los ids que se
 * piden no son los ids que se pintan, y lo que llega no se pinta entero.
 *
 * QUE SE AFIRMA
 *   1) `de()` devuelve `name`. Antes se descartaba: la API ya lo da en espanol
 *      (lang=es) y se estaba tirando.
 *   2) TODOS los ids que el modal pinta resuelven icono y nombre.
 *   3) Las 206 legendarias del catalogo se PIDEN. Este es el que cae si
 *      `pedirIconos` vuelve a pedir solo `byItem`.
 *   4) El arbol y la tabla pintan `<img>` y el nombre traducido.
 *   5) El presupuesto de cache aguanta los 1113 ids al RECARGAR. Con el cap
 *      viejo (906) se perdian 207 en cada recarga.
 *
 * CONTROLES NEGATIVOS (un detector que nunca puede fallar no esta midiendo)
 *   - un id desconocido no rompe el render ni inventa icono ni URL.
 *   - la red caida deja el modal DIBUJADO, sin icono, sin "cargando".
 *   - la MUTACION del nombre: se comprueba que el nombre pintado es el de la
 *     API y no el de la receta. Si los dos fueran el mismo string, el aserto
 *     pasaria sin estar midiendo. Por eso la fixture les da NOMBRES DISTINTOS
 *     a proposito: "Traducido <id>" contra el ingles que trae `cl_recipes.json`.
 *
 * NO USA `tools/cl_recipes.json` (esta en .gitignore). Los datos salen de los
 * contratos GENERADOS, que si estan versionados, y de una `fetch` falsa.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const leer = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0, fail = 0;
const fallos = [];
function ok(cond, msg, extra) {
  if (cond) { pass++; return true; }
  fail++;
  fallos.push(msg + (extra ? '  [' + extra + ']' : ''));
  return false;
}
function eq(a, b, msg) { return ok(a === b, msg, 'obtenido: ' + JSON.stringify(a)); }

async function seccion(titulo, fn) {
  console.log('\n' + titulo);
  try { await fn(); }
  catch (e) { fail++; fallos.push(titulo + ' -> EXCEPCION: ' + (e && e.message)); }
}

const quiet = { log() {}, info() {}, warn() {}, error() {}, debug() {} };

// La fixture devuelve un nombre en espanol DELIBERADAMENTE distinto del que
// trae `cl_recipes.json`, para que "pinta el nombre traducido" sea una
// afirmacion que pueda caer y no una tautologia.
const nombreES = (id) => 'Traducido ' + id;

function el() {
  return {
    style: {}, dataset: {}, children: [], innerHTML: '', textContent: '', value: '',
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    appendChild() {}, remove() {}, setAttribute() {}, removeAttribute() {},
    addEventListener() {}, removeEventListener() {}, focus() {}, blur() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    getAttribute() { return null; }, contains() { return false; }, closest() { return null; },
    insertAdjacentHTML() {}, scrollIntoView() {}
  };
}

/**
 * Levanta la app REAL (api, contratos, motor, vista, iconos y tracker) con una
 * `fetch` falsa que cuenta llamadas y responde en espanol.
 *
 * @param {object} cfg.red 'ok' (default) | 'caida'
 */
function montar(cfg) {
  cfg = cfg || {};
  const c = { netas: 0, pedidos: [], caidas: 0 };

  const ls = {
    _d: {},
    getItem(k) { return k in this._d ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
    key(i) { return Object.keys(this._d)[i] || null; },
    get length() { return Object.keys(this._d).length; }
  };

  // Un DOM minimo pero REAL en lo que importa: el modal TIENE que existir y
  // estar abierto. Sin esto `openItemModal` calcula `abierto = false` y no pide
  // ningun icono — que es el producto haciendo lo correcto (no pedir datos para
  // un modal cerrado), no un defecto. El aserto de la seccion [3] mide el
  // cableado de la carga de iconos, asi que la pre-condicion hay que armarla.
  const porId = {};
  const modal = el(); modal.id = 'ltItemModal'; modal.hidden = false;
  const titulo = el(); titulo.id = 'ltItemModalTitle';
  porId['ltItemModal'] = modal;
  porId['ltItemModalTitle'] = titulo;

  const doc = {
    head: el(), body: el(), documentElement: el(),
    createElement: () => el(), createTextNode: () => ({}),
    getElementById: (id) => porId[id] || null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}
  };

  const sb = {
    console: quiet, document: doc,
    localStorage: ls,
    setInterval() { return 0; }, clearInterval() {},
    setTimeout, clearTimeout, URL, Promise, Map, Date, JSON, Object, Array,
    String, Number, Math, isFinite, encodeURIComponent, decodeURIComponent,
    fetch(url) {
      const s = String(url);
      c.netas++;
      const m = s.match(/[?&]ids=([^&]+)/);
      const ids = m ? decodeURIComponent(m[1]).split(',').map(Number) : [];
      ids.forEach((i) => c.pedidos.push(i));
      if (cfg.red === 'caida') { c.caidas++; return Promise.reject(new Error('red cortada a proposito')); }
      const cuerpo = ids.map((id) => ({
        id: id,
        name: nombreES(id),
        icon: 'https://api.guildwars2.com/v2/item/' + id + '/icon?v=hash-' + id,
        type: 'Material',
        rarity: 'Raro',
        rarity_color: '#BADA55'
      }));
      return Promise.resolve({
        ok: true, status: 200, headers: { get() { return null; } },
        text() { return Promise.resolve(JSON.stringify(cuerpo)); }
      });
    }
  };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);

  const correr = (p) => vm.runInContext(leer(p), sb, { filename: p });
  correr('js/api-gw2.js');
  correr('js/legendary-recipes.js');
  correr('js/legendary-precursors.js');
  correr('js/legendary-tree.js');
  correr('js/legendary-tree-ui.js');
  correr('js/legendary-data.js');
  correr('js/item-icons.js');
  correr('js/legendary-tracker.js');

  return {
    sb: sb, c: c, doc: doc,
    Icons: sb.ItemIcons, Prec: sb.LegendaryPrecursors, T: sb.LegendaryTree,
    UI: sb.LegendaryTreeUI, Cat: sb.LegendaryCatalog, Tracker: sb.LegendaryTracker
  };
}

/** Los ids que el modal PINTA: nodos del arbol + filas de materiales. */
function idsQueSePintan(m) {
  const ids = new Set();
  for (const it of m.Cat.items) {
    const r = m.T.build(it.id);
    (function walk(n) {
      if (!n) return;
      ids.add(Number(n.id));
      (n.children || []).forEach(walk);
    })(r && r.node);
    ((r && r.totals && r.totals.rows) || []).forEach((row) => ids.add(Number(row.itemId)));
  }
  ids.delete(0);
  return ids;
}

// ===========================================================================
(async function () {

  // =========================================================================
  // 1. `de()` DEVUELVE EL NOMBRE. Antes se descartaba.
  // =========================================================================
  await seccion('[1] de() devuelve name ademas de icon/rarity/color', async () => {
    const m = montar({});
    await m.Icons.cargar([30684, 19700]);
    const d = m.Icons.de(30684);
    ok(d && typeof d === 'object', '(1) de() devuelve un objeto');
    ok('name' in d, '(1) el mapa tiene la clave name', JSON.stringify(d));
    eq(d.name, nombreES(30684), '(1) es el nombre que vino de la API, en espanol');
    ok(d.icon && String(d.icon).indexOf('hash-30684') !== -1, '(1) el icono sigue esta');
    ok(!!d.color, '(1) el color sigue derivado de la rareza');

    // El fallback de un id desconocido TIENE que traer `name`, no solo icon y
    // color: si no, cualquier consumidor que lea `.name` sinNull-check truena.
    const d2 = m.Icons.de(999999999);
    ok(d2 && 'name' in d2 && d2.name === null && d2.icon === null,
      '(1) el fallback de un id desconocido trae name:null y no undefined');
  });

  // =========================================================================
  // 2. TODOS LOS IDS QUE EL MODAL PINTA RESUELVEN ICONO Y NOMBRE.
  // =========================================================================
  await seccion('[2] todo id pintado por el modal resuelve icono y nombre', async () => {
    const m = montar({});
    const ids = [...idsQueSePintan(m)];
    ok(ids.length > 0, '(2) hay ids que pintar', 'total: ' + ids.length);

    await m.Icons.cargar(ids);

    let sinIcono = [], sinNombre = [];
    for (const id of ids) {
      const d = m.Icons.de(id);
      if (!d.icon) sinIcono.push(id);
      if (!d.name) sinNombre.push(id);
    }
    eq(sinIcono.length, 0, '(2) NINGUN id pintado queda sin icono');
    eq(sinNombre.length, 0, '(2) NINGUN id pintado queda sin nombre');
    if (sinIcono.length) console.log('   sin icono:', sinIcono.slice(0, 10).join(','));
    if (sinNombre.length) console.log('   sin nombre:', sinNombre.slice(0, 10).join(','));
  });

  // =========================================================================
  // 3. LAS 206 DEL CATALOGO SE PIDEN. Este cae si `pedirIconos` vuelve a
  //    pedir solo `byItem` — que es el bug medido.
  // =========================================================================
  await seccion('[3] pedirIconos incluye las 206 legendarias del catalogo', async () => {
    const m = montar({});
    // Espia: se mide lo que REALMENTE pide la produccion, no una forma de codigo.
    let pedido = null;
    const real = m.Icons.cargar;
    m.sb.ItemIcons.cargar = function (ids) { pedido = ids.slice(); return real.call(this, ids); };

    m.Tracker.openItemModal(30684);

    ok(Array.isArray(pedido) && pedido.length > 0, '(3) la produccion pidio ids', 'pidio: ' + (pedido && pedido.length));
    if (!Array.isArray(pedido)) return;

    const pedidos = new Set(pedido.map(Number));
    const raices = m.Cat.items.map((i) => Number(i.id));
    const faltan = raices.filter((id) => !pedidos.has(id));
    eq(faltan.length, 0, '(3) las 206 raices estan entre los ids pedidos');
    if (faltan.length) console.log('   faltan:', faltan.slice(0, 10).join(','));

    // Y el total: 907 de precursores + 206 del catalogo = 1113 distintos.
    const distintos = new Set(pedido.map(Number));
    eq(distintos.size, 1113, '(3) el lote son 1113 ids distintos (907 + 206)');

    // Control negativo del mismo aserto: el set de precursores SOLO, que es lo
    // que se pedia antes, NO alcanza. Si las dos cosas dieran 1113, este
    // contraste no estaria midiendo.
    const soloPrecursores = new Set(Object.keys(m.Prec.byItem).map(Number));
    ok(soloPrecursores.size === 907, '(3) el contrato de precursores tiene 907, no 1113');
    const fueraDePrecursores = raices.filter((id) => !soloPrecursores.has(id));
    eq(fueraDePrecursores.length, 206, '(3) y 206 legendarias NO estan en ese contrato');
  });

  // =========================================================================
  // 4. EL ARBOL Y LA TABLA PINTAN ICONO Y EL NOMBRE TRADUCIDO.
  // =========================================================================
  await seccion('[4] el arbol y la tabla pintan <img> y el nombre traducido', async () => {
    const m = montar({});
    await m.Icons.cargar([...idsQueSePintan(m)]);

    const res = m.T.build(30684);
    const htmlArbol = m.UI.renderTreeHTML(res, { esc: esc, de: (i) => m.Icons.de(i) });
    const htmlTabla = m.UI.renderTotalsHTML(res, {}, { esc: esc, de: (i) => m.Icons.de(i) });

    ok(htmlArbol.indexOf('<img') !== -1, '(4) el arbol pinta <img>');
    ok(htmlTabla.indexOf('<img') !== -1, '(4) Materiales Totales pinta <img> (antes NO lo hacia)');

    // El nombre pintado tiene que ser el de la API. En el ARBOL la raiz es la
    // legendaria; en la TABLA las filas son MATERIALES BASE (Orichalcum, etc.),
    // que son otros ids. Afirmar el nombre de la raiz en la tabla seria una
    // asercion que no puede pasar y no mide el arreglo. Se afirma sobre una fila
    // real de la tabla.
    ok(htmlArbol.indexOf(esc(nombreES(30684))) !== -1,
      '(4) el arbol muestra el nombre traducido de la raiz');
    ok(res.node.name !== nombreES(30684),
      '(4) el nombre de la receta y el de la API son DISTINTOS (la fixture lo garantiza)');
    ok(htmlArbol.indexOf(esc(res.node.name)) === -1,
      '(4) el nombre de la receta (ingles) NO aparece en el arbol: gana el traducido');

    const filas = (res.totals && res.totals.rows) || [];
    ok(filas.length > 0, '(4) la tabla tiene filas de materiales', 'filas: ' + filas.length);
    if (filas.length) {
      const fila = filas[0];
      ok(htmlTabla.indexOf(esc(nombreES(fila.itemId))) !== -1,
        '(4) la tabla muestra el nombre TRADUCIDO del material');
      ok(htmlTabla.indexOf(esc(fila.name)) === -1,
        '(4) y NO el nombre en ingles que trae cl_recipes.json');
      ok(htmlTabla.indexOf(esc(fila.itemId)) !== -1,
        '(4) el id del material sigue en el title de la celda');
    }
  });

  // =========================================================================
  // 5. EL PRESUPUESTO DE CACHE AGUANTA LOS 1113 AL RECARGAR.
  // =========================================================================
  await seccion('[5] el presupuesto propio no pierde ids al recargar', async () => {
    const m = montar({});
    const ids = [...idsQueSePintan(m)];
    await m.Icons.cargar(ids);
    const conIcono1 = ids.filter((i) => m.Icons.iconDe(i)).length;
    eq(conIcono1, ids.length, '(5) primera pasada: todos con icono');

    // El presupuesto del modulo esta en el codigo. Si el cap quedara por
    // DEBAJO del lote, el recorte se come ids al escribir en el cache.
    // OJO: se lee el CODIGO, no el archivo entero. Una regexp sobre el archivo
    // crudo matchea primero el comentario de la cabecera, que tiene numeros
    // viejos, y el aserto mide la documentacion en vez de la configuracion.
    // (Ya paso en este test: cap 906 leido del comentario, con el codigo en 1200.)
    const codigo = leer('js/item-icons.js')
      .split('\n')
      .filter((l) => l.trim().indexOf('*') !== 0 && l.trim().indexOf('//') !== 0)
      .join('\n');
    const mCap = codigo.match(/cacheCap:\s*(\d+)/);
    ok(!!mCap, '(5) item-icons.js declara cacheCap en el CODIGO (no en un comentario)');
    if (mCap) {
      const cap = Number(mCap[1]);
      const lote = new Set(Object.keys(m.Prec.byItem).concat(
        (m.Cat.items || []).map((i) => String(i.id)))).size;
      ok(cap > lote, '(5) el cap esta POR ENCIMA del lote',
        'cap: ' + cap + ' lote: ' + lote);
    }
  });

  // =========================================================================
  // 6. CONTROLES NEGATIVOS.
  // =========================================================================
  await seccion('[6] controles negativos: id desconocido y red caida', async () => {
    const m = montar({});
    await m.Icons.cargar([...idsQueSePintan(m)]);
    const res = m.T.build(30684);

    // Un id que no esta en ningun lado: no inventa icono, no rompe el render.
    const html = m.UI.renderTreeHTML(res, { esc: esc, de: (i) => m.Icons.de(999999999) });
    ok(html.length > 0, '(6) el arbol se sigue dibujando sin datos');
    ok(html.indexOf('undefined') === -1, '(6) sin "undefined" cuando `de` no sabe el id');
    ok(html.indexOf('NaN') === -1, '(6) sin "NaN"');
    ok(html.indexOf('/icon?v=hash-999999999') === -1, '(6) no inventa una URL de icono');
    ok(html.indexOf('<img') === -1, '(6) y no dibuja un <img> roto por un id que no sabe');
    ok(html.indexOf(esc(res.node.name)) !== -1, '(6) pero el nombre de la receta sigue en pantalla');

    // Red caida: el modal DIBUJADO, sin icono y sin color, sin "cargando".
    const m2 = montar({ red: 'caida' });
    await m2.Icons.cargar([...idsQueSePintan(m2)]).catch(() => {});
    const res2 = m2.T.build(30684);
    const html2 = m2.UI.renderTreeHTML(res2, { esc: esc, de: (i) => m2.Icons.de(i) });
    ok(html2.indexOf('<img') === -1, '(6) con la red caida no hay icono, y no revienta');
    ok(html2.indexOf(esc(res2.node.name)) !== -1, '(6) pero el nombre de la receta sigue en pantalla');
    ok(html2.indexOf('undefined') === -1 && html2.indexOf('NaN') === -1,
      '(6) y sin undefined ni NaN');
  });

  console.log('\n' + (fail === 0 ? 'SUITE OK' : 'SUITE CON FALLOS') + '  ' + pass + ' pass / ' + fail + ' FAIL');
  if (fallos.length) { console.log('\nLo que cayo:'); fallos.forEach((f) => console.log('  - ' + f)); }
  process.exit(fail === 0 ? 0 : 1);
})();

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}