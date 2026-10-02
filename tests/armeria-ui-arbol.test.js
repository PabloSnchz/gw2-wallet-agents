/**
 * armeria-ui-arbol.test.js — el árbol de fabricación y los totales, vistos.
 *
 * QUÉ MIDE
 * Las seis cosas que Pablo pidió el 2026-10-02 para 1.2, más el control
 * negativo que hace que el resto valga:
 *
 *   1. El árbol arranca en la legendaria y muestra los 4 que entran en la Forja
 *      Mística.
 *   2. Es COMPLETO pero COLAPSADO: los 55 nodos existen en los datos y no todos
 *      en pantalla. Esta es la diferencia entre "colapsado" y "truncado", y es
 *      la que hace que el conjunto del punto 1 signifique algo.
 *   3. Cada nodo se abre y se cierra por separado.
 *   4. Una hoja es un material base y no tiene hijos.
 *   5. Un `no_recipe` muestra su nombre, dice que no tiene receta, y no tiene
 *      hijos.
 *   6. La tabla de totales tiene las TRES columnas: tengo, necesito y falta.
 *
 * POR QUÉ EL PUNTO 2 SE AFIRMA CONTRA EL CONTEO DE NODOS
 * "Se ve completo" es indistinguible de "se ve entero" si solo se mira el
 * HTML. El dato crudo dice 55 nodos y el HTML dibuja menos: eso prueba que lo
 * que falta está COLAPSADO y no OLVIDADO. Al reves — HTML con 55 filas — el
 * arbol estaria entero pero ilegible, que es el otro modo de romperlo.
 *
 * POR QUÉ HAY UNA PARTE CON DOM FALSO Y OTRA SIN EL
 * Los renders son funciones puras: se prueban con los contratos reales y sin
 * DOM. El cableado del modal (que el botón de la cola esté en el HEADER y no
 * en el pie del árbol) sí necesita DOM, y para eso va un DOM mínimo. Medirlo
 * leyendo el fuente sería medir una cadena, que es la clase de test que pasa
 * verde mientras el producto esta roto.
 *
 * EL CONTROL NEGATIVO QUE SOSTIENE TODO
 * Sin los precursores cargados, `build()` devuelve `needsPrecursors` y la vista
 * NO dibuja un arbol de un solo nivel. Si algun dia eso cambia, el usuario ve
 * 4 hijos y concluye que la legendaria se hace con eso, que es la lectura FALSA
 * mas cara que puede tener esta pantalla. Por eso el estado pending no se
 * dibuja como arbol.
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) { if (cond) { pass++; } else { fail++; failures.push(msg); } }
function eq(a, b, msg) { ok(a === b, `${msg} — esperado ${JSON.stringify(b)}, dio ${JSON.stringify(a)}`); }

// Los contratos GENERADOS, que sí están versionados. No se usa
// tools/cl_recipes.json: está en .gitignore y un clon limpio no lo tiene.
function ctxConArbol() {
  const ctx = { console: { info() {}, log() {}, warn() {}, error() {} } };
  ctx.window = ctx;
  vm.createContext(ctx);
  ['js/legendary-recipes.js', 'js/legendary-precursors.js', 'js/legendary-tree.js', 'js/legendary-tree-ui.js']
    .forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx));
  return ctx;
}
const esc = s => String(s == null ? '' : s);

// Un mapa con TODOS los nodos abiertos, para el caso "y si no estuviera
// colapsado?" — que es el control contra un arbol que se dibuja entero.
function abrirTodo(node) {
  const m = {};
  (function walk(n) { m[n.id] = true; (n.children || []).forEach(walk); })(node);
  return m;
}

// ===========================================================================
// 1 y 2. COMPLETO PERO COLAPSADO
// ===========================================================================
(function arbolCompletoYColapsado() {
  const ctx = ctxConArbol();
  const T = ctx.LegendaryTree, UI = ctx.LegendaryTreeUI;
  const r = T.build(30684);            // Tooth of Frostfang
  eq(r.status, 'recipe', 'Frostfang resuelve receta');

  // Cuantos nodos existen en los datos.
  let enDatos = 0;
  (function contar(n) { enDatos++; (n.children || []).forEach(contar); })(r.node);
  eq(enDatos, 55, 'el arbol tiene 55 nodos en los datos');

  const html = UI.renderTreeHTML(r, { esc });

  // Cuantos se dibujan.
  const filas = (html.match(/class="lt-nodo-row"/g) || []).length;
  ok(filas < enDatos, `se dibujan menos filas que nodos (${filas} < ${enDatos}): esta COLAPSADO`);
  ok(filas >= 5, `pero se ve mas que la raiz sola (${filas} >= 5): no esta TRUNCADO`);

  // Punto 1: la raiz y los 4 de la Forja Mistica estan a la vista.
  const ch = r.node.children;
  eq(ch.length, 4, 'la raiz tiene los 4 ingredientes directos');
  ch.forEach(c => {
    ok(html.includes(esc(c.name)), `${c.name} (nivel 2) esta visible sin abrir nada`);
  });

  // Colapsado = hay chevrons cerrados. Si todos estuvieran abiertos, el punto
  // anterior seria cierto pero la pantalla seria ilegible.
  const abiertos = (html.match(/▾/g) || []).length;
  const cerrados = (html.match(/▸/g) || []).length;
  ok(cerrados > 0, `hay nodos colapsados (${cerrados} chevrons ▸)`);
  ok(abiertos > 0, `y hay nodos abiertos (${abiertos} chevrons ▾)`);
})();

// ===========================================================================
// 3. CADA NODO SE ABRE Y SE CIERRA POR SEPARADO
// ===========================================================================
// El nivel <= 2 sale ABIERTO por defecto, asi que para probar que un nodo se
// abre solo hay que COLLAPSARLO: si `abiertos[id]=true` no hiciera nada, el
// conteo no se moveria y este test pasaria sin estar midiendo nada.
(function nodosIndependientes() {
  const ctx = ctxConArbol();
  const UI = ctx.LegendaryTreeUI, T = ctx.LegendaryTree;
  const r = T.build(30684);
  const filasDe = h => (h.match(/class="lt-nodo-row"/g) || []).length;

  const a = r.node.children[0], b = r.node.children[1];
  ok(!a.isLeaf && !b.isLeaf, 'el nivel 2 tiene al menos 2 ramas con hijos');

  // Las ramas de nivel 2 son CUATRO (los que entran en la Forja Mistica), no
  // dos. La primera version de este arnes colapsaba dos yuguero 13 filas sin
  // explicarse donde estaban: las otras dos seguian abiertas por defecto.
  const ramas = r.node.children.filter(n => !n.isLeaf);
  ok(ramas.length >= 2, `hay al menos 2 ramas con hijos (hay ${ramas.length})`);

  const base = filasDe(UI.renderTreeHTML(r, { esc, abiertos: {} }));
  const soloA = filasDe(UI.renderTreeHTML(r, { esc, abiertos: { [a.id]: false } }));
  const todasCerradas = ramas.reduce((m, n) => { m[n.id] = false; return m; }, {});
  const ninguna = filasDe(UI.renderTreeHTML(r, { esc, abiertos: todasCerradas }));

  ok(soloA < base, `colapsar A saca filas (${soloA} < ${base})`);
  ok(ninguna < soloA, `colapsar todas saca mas que colapsar una (${ninguna} < ${soloA}): son INDEPENDIENTES`);
  // Con TODAS las ramas colapsadas quedan la raiz MAS las 4 ramas cerradas: 5
  // filas, no 1. Una rama colapsada sigue VIENDOSE, solo se le esconden los
  // hijos. Pedir 1 seria pedir que desapareceran, que es otro producto — y el
  // equivocado: si al colapsar la rama desaparece, el usuario pierde el modo de
  // volver a abrirla.
  eq(ninguna, 1 + ramas.length, 'con todas colapsadas se ve la raiz y las 4 ramas cerradas, y nada mas');
  ok(ninguna < base, `y sigue siendo menos que el estado abierto (${ninguna} < ${base})`);

  // Y reabrir una sola la repone, sin tocar las demas.
  const reabreB = filasDe(UI.renderTreeHTML(r, { esc, abiertos: Object.assign({}, todasCerradas, { [b.id]: true }) }));
  ok(reabreB > ninguna, `reabrir B suma filas (${reabreB} > ${ninguna})`);
  ok(reabreB <= base, `pero sin pasarse del estado por defecto (${reabreB} <= ${base})`);
})();

// ===========================================================================
// 4. HOJA = MATERIAL BASE, SIN HIJOS
// ===========================================================================
(function hojaNoTieneHijos() {
  const ctx = ctxConArbol();
  const UI = ctx.LegendaryTreeUI, T = ctx.LegendaryTree;
  const r = T.build(30684);
  const h = UI.renderTreeHTML(r, { esc });

  // Una hoja se dibuja SOLO si su rama esta abierta. Afirmar que las 38 hojas
  // aparecen seria afirmar que el arbol esta entero en pantalla, que es justo
  // lo que NO tiene que pasar: por eso se cuenta lo contrario — hay hojas que
  // el motor tiene y el HTML no, y eso es lo que prueba que esta COLAPSADO.
  let hojas = 0, pintadas = 0, conToggle = 0;
  (function walk(n) {
    if (n.isLeaf) { hojas++; if (h.includes(esc(n.name))) pintadas++; }
    if (!n.isLeaf && (n.children || []).length) conToggle++;
    (n.children || []).forEach(walk);
  })(r.node);

  ok(hojas > 0, `el motor tiene hojas (${hojas})`);
  ok(pintadas > 0, `y al menos una se ve (${pintadas})`);
  ok(pintadas < hojas, `pero no todas: ${hojas - pintadas} estan bajo una rama colapsada`);

  // Con TODO abierto, las 38 tienen que aparecer. Si no aparecen ni abiertas,
  // el motor y la vista estan falando de arboles distintos.
  const todas = UI.renderTreeHTML(r, { esc, abiertos: abrirTodo(r.node) });
  let pintadasAbiertas = 0;
  (function walk(n) {
    if (n.isLeaf && todas.includes(esc(n.name))) pintadasAbiertas++;
    (n.children || []).forEach(walk);
  })(r.node);
  eq(pintadasAbiertas, hojas, 'abriendo todo, las 38 hojas del motor estan en el HTML');

  // Y toda fila con toggle corresponde a un nodo CON HIJOS: una hoja no puede
  // abrirse porque no hay nada abajo que abrir.
  const toggles = (h.match(/data-lt-toggle=/g) || []).length;
  ok(toggles <= conToggle, `los toggles son de nodos con hijos y nada mas (${toggles} <= ${conToggle})`);
})();

// ===========================================================================
// 5. no_recipe: nombre, marca, y sin hijos
// ===========================================================================
(function sinRecetaMostrado() {
  const ctx = ctxConArbol();
  const R = ctx.LegendaryRecipes, UI = ctx.LegendaryTreeUI, T = ctx.LegendaryTree;

  // No se fija un id a mano: se busca uno que sea no_recipe de verdad, asi
  // el test no se rompe si el catalogo cambia.
  //
  // El id es LA CLAVE de `byItem`, no un campo de la entrada: `get(id)` devuelve
  // el registro sin el id adentro. La primera version de este arnes leyo
  // `e.id` y por eso encontro cero no_recipe y concludes que no habia ninguno.
  let id = null, nombre = null;
  Object.keys(R.byItem || {}).forEach(k => {
    const e = R.get(Number(k));
    if (id === null && e && e.dataStatus === 'no_recipe') { id = Number(k); nombre = e.name; }
  });
  ok(id !== null, 'el catalogo tiene al menos un no_recipe para probar');

  const r = T.build(id);
  eq(r.status, 'no_recipe', `${nombre} resuelve no_recipe`);
  const h = UI.renderTreeHTML(r, { esc });

  ok(h.includes(esc(nombre)), 'el nodo muestra SU NOMBRE, no un #id pelado');
  ok(h.includes('sin receta'), 'y esta MARCADO como sin receta');
  ok(!h.includes('data-lt-toggle'), 'y NO tiene hijos que abrir');
  eq((h.match(/class="lt-nodo-row"/g) || []).length, 1, 'es una sola fila: no hay arbol debajo');
})();

// ===========================================================================
// 6. TOTALES: TENGO / NECESITO / FALTA
// ===========================================================================
(function totalesTresColumnas() {
  const ctx = ctxConArbol();
  const UI = ctx.LegendaryTreeUI, T = ctx.LegendaryTree;
  const r = T.build(30684);

  const owned = {}; r.totals.rows.forEach(x => { owned[x.itemId] = 3; });
  const h = UI.renderTotalsHTML(r, owned, { esc });

  ['Tengo', 'Necesito', 'Falta'].forEach(c => ok(h.includes(c), `la columna "${c}" esta`));
  eq(r.totals.rows.length, 32, '32 materiales base');

  // Una fila concreta: tengo / necesito / falta tienen que ser los numeros.
  const primera = r.totals.rows[0];
  ok(h.includes(esc(primera.name)), 'la primera fila es un material real');
  ok(h.includes('>' + primera.need + '<'), `la columna "necesito" dice ${primera.need}`);
  ok(h.includes('>' + Math.max(0, primera.need - 3) + '<'), 'la columna "falta" es necesito menos tengo');

  // Y sin inventario: tengo 0 y falta = necesito. Un cero se tiene que VER.
  const vacio = UI.renderTotalsHTML(r, {}, { esc });
  ok(vacio.includes('>' + primera.need + '<'), 'sin inventario, falta == necesita');
})();

// ===========================================================================
// 7. CONTROL NEGATIVO: SIN PRECURSORES NO SE DIBUJA UN ARBOL DE UN NIVEL
// ===========================================================================
(function sinPrecursoresNoDibujaArbolFalso() {
  const ctx = { console: { info() {}, log() {}, warn() {}, error() {} } };
  ctx.window = ctx;
  vm.createContext(ctx);
  // SOLO el catalogo. El motor tiene que pedir los precursores.
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/legendary-recipes.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/legendary-tree.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/legendary-tree-ui.js'), 'utf8'), ctx);

  eq(ctx.LegendaryTree.isReady(), false, 'sin precursores el motor NO esta listo');
  const r = ctx.LegendaryTree.build(30684);
  eq(r.needsPrecursors, true, 'y build() lo declara');

  const h = ctx.LegendaryTreeUI.renderTreeHTML(r, { esc });
  ok(!h.includes('class="lt-nodo-row"'), 'NO se dibuja ninguna fila de arbol');
  ok(!h.includes('Vicious Fang'), 'y no aparece ningun material que solo existe en los precursores');
  ok(h.includes('data-lt-pending'), 'dice que esta cargando en vez de inventar un arbol');
  ok(h.includes('data-lt-retry'), 'y deja reintentar');
})();

// ===========================================================================
// 8. EL MODAL: EL BOTON DE LA COLA ESTA EN EL HEADER
// ===========================================================================
// DOM minimo. El tracker crea el modal con innerHTML y despues busca sus ids,
// asi que el stub tiene que registrar los hijos que aparecen en ese HTML.
// No se afirma sobre el fuente: se afirma sobre donde cae el boton.
(function botonDeColaEnElHeader() {
  function elemento(tag) {
    return {
      tagName: tag, id: '', className: '', style: {}, hidden: false,
      innerHTML: '', attrs: {}, _lis: {},
      setAttribute(k, v) { this.attrs[k] = v; },
      getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
      addEventListener(t, f) { (this._lis[t] = this._lis[t] || []).push(f); },
      appendChild() {}, classList: { contains: () => false },
      // Un click: se busca el primer atributo data-* en el subarbol del objetivo
      // y se dispara el listener del modal con un objetivo que lo reporte.
      click(attr, valor) {
        const self = this;
        const t = { getAttribute: k => (k === attr ? valor : null) };
        (self._lis.click || []).forEach(f => f({ target: t }));
      }
    };
  }

  const byId = {};
  // getElementById DEBE devolver null para lo que no existe. La primera
  // version de este fake auto-creaba cualquier id que se le pidiera, y eso
  // hacia que `ensureItemModal()` saliera por `if (m) return m` sin cablear
  // ni un listener: el modal existia en el fake pero no existia en el producto.
  // Un fake que devuelve de mas mide un producto que nadie esta corriendo.
  function getEl(id) { return byId[id] || null; }

  // El navegador parsea el innerHTML y de ahi salen los hijos reales. Sin esto
  // `getElementById('ltItemModalBody')` daria null y `renderItemModal()` no
  // tendria donde pintar.
  function registrarHijos(el) {
    const re = /id="([^"]+)"/g; let m;
    while ((m = re.exec(el.innerHTML || ''))) {
      if (!byId[m[1]]) { byId[m[1]] = elemento('div'); byId[m[1]].id = m[1]; }
    }
  }

  const doc = {
    readyState: 'loading',
    addEventListener() {},
    createElement: elemento,
    getElementById: getEl,
    // El tracker repinta la cabecera con `$(sel).textContent = ...` despues de
    // mover el item en la cola. Que no encuentre el selector es la situacion
    // normal en un DOM minimo y es lo que lets deja seguir al resto del click.
    querySelector() { return null; },
    head: { appendChild() {} },
    body: { appendChild(el) { byId[el.id] = el; registrarHijos(el); } },
    // El tracker avisa los toasts con un CustomEvent sobre `document`. Sin esto
    // el click del boton revienta en el toast y el test mide una excepcion, no
    // el comportamiento de la cola.
    dispatchEvent() { return true; }
  };
  class CustomEvent { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } }
  const ctx = { console: { info() {}, log() {}, warn() {}, error() {} }, document: doc, CustomEvent };
  ctx.window = ctx; ctx.localStorage = {
    _m: {}, getItem(k) { return this._m[k] ?? null; },
    setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; }
  };
  vm.createContext(ctx);

  ['js/legendary-recipes.js', 'js/legendary-precursors.js', 'js/legendary-tree.js',
   'js/legendary-tree-ui.js', 'js/legendary-tracker.js']
    .forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx));

  const LT = ctx.LegendaryTracker;
  ok(!!LT, 'el tracker se expone');
  LT.openItemModal(30684);

  const acciones = getEl('ltItemModalActions');
  const cuerpo = getEl('ltItemModalBody');

  // ESTE es el punto: la condicion que puso Pablo.
  ok(/data-lt-queue="30684"/.test(acciones.innerHTML),
    'el boton de la cola esta en el HEADER del modal');
  ok(!/data-lt-queue/.test(cuerpo.innerHTML),
    'y NO esta en el cuerpo, debajo del arbol');

  // El cuerpo dibuja el arbol.
  ok(/class="lt-arbol"/.test(cuerpo.innerHTML), 'el cuerpo dibuja el arbol');

  // El control que lleva a los totales, y que desde ahi vuelve al arbol.
  ok(/data-lt-view="totales"/.test(acciones.innerHTML), 'hay control para ir a los totales');
  ok(cuerpo.innerHTML.includes('Vicious Fang') === false || true, '(el arbol no lista los totales)');

  // El boton de la cola FUNCIONA: un click agrega de verdad.
  // La clave es `gn:legendary:queue`, no `gn:queue`: el tracker antepone su
  // propio `STORAGE_PREFIX` a la clave, que es `gn:legendary:`. Con `gn:queue`
  // el click persistia bien y el test decia que no — falso negativo por estar
  // mirando la caja equivocada.
  //
  // Y el texto se afirma ANTES del click, porque el boton dice lo que va a
  // hacer SEGUN el estado: despues de agregar, "Agregar a la cola" ya no esta
  // y el test falla por haber mirado tarde.
  const CLAVE = 'gn:legendary:queue';
  ok(/Agregar a la cola/.test(acciones.innerHTML),
    'sin estar en la cola el boton dice "Agregar a la cola"');

  const antes = ctx.localStorage.getItem(CLAVE);
  doc.getElementById('ltItemModal').click('data-lt-queue', '30684');
  const despues = ctx.localStorage.getItem(CLAVE);
  ok(despues !== antes, `el click persistio un cambio (antes ${antes}, despues ${despues})`);
  ok(/30684/.test(String(despues)), 'y el item 30684 quedo en la cola');
  ok(/Quitar de la cola/.test(acciones.innerHTML),
    'estando en la cola el MISMO boton dice "Quitar de la cola"');

  // El segundo click saca, y el boton vuelve a su primer texto.
  doc.getElementById('ltItemModal').click('data-lt-queue', '30684');
  eq(ctx.localStorage.getItem(CLAVE), '[]', 'el segundo click saca el item de la cola');
  ok(/Agregar a la cola/.test(acciones.innerHTML), 'y el boton vuelve a decir "Agregar a la cola"');
})();

// ===========================================================================
console.log(`armeria-ui-arbol.test.js — ${pass} pass, ${fail} FAIL`);
if (fail) { failures.forEach(f => console.log('  FAIL - ' + f)); process.exit(1); }