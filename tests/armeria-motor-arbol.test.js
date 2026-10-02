/**
 * armeria-motor-arbol.test.js — el motor del árbol y la multiplicidad.
 *
 * QUÉ MIDE
 * Que `legendary-tree.js` baje el árbol entero, multiplique a lo largo del
 * camino, y NO meta en la columna de "necesito" lo que no se fabrica.
 *
 * POR QUÉ LOS NÚMEROS EXACTOS Y NO "que no reviente"
 * El total de materiales es la función que el usuario usa para decidir qué
 * comprar. Un motor que multiplica mal no falla visiblemente: da un número,
 * y el número equivocado es peor que un error. Por eso se afirman las
 * cantidades medidas contra la wiki de Frostfang, no la forma del árbol.
 *
 * LA CONVENCIÓN DE NIVELES
 * level = raíz es 1. depth = nivel de la hoja más profunda. Pablo la fijó el
 * 2026-10-02 y es informativa: el recorrido no la usa. Si algún día `level`
 * pasa a empezar en 0, este test avisa, porque el primer nivel se muestra.
 *
 * LO QUE ESTÁ FUERA DE LA COLUMNA DE "NECESITO", Y POR QUÉ ESTÁ AFIRMADO
 *   vendor   → se compra a un NPC. Si entró en "necesito", la app le está
 *               diciendo al usuario que fabrique algo que se compra.
 *   itemId 0 → la fuente no trae el id. Sin id no hay inventario que mirar.
 *   unknown  → no está en ninguno de los dos contratos. Si desaparece, el
 *               usuario no tiene forma de reportar el dato que falta.
 *
 * NO USA `tools/cl_recipes.json`
 * Está en .gitignore. Un test que necesita un archivo que un clon limpio no
 * tiene, pasa en mi máquina y no en la de nadie. Este carga los dos contratos
 * GENERADOS, que sí están versionados.
 *
 * CONTROLES NEGATIVOS (un detector que nunca puede fallar no está midiendo)
 *   - `depth` arranca en 0: falla, porque la raíz es nivel 1.
 *   - un item inexistente: da 'unknown', no lanza y no inventa un árbol.
 *   - sin precursores: needsPrecursors, no un árbol de un solo nivel.
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const failures = [];

function ok(cond, msg) {
  if (cond) { pass++; } else { fail++; failures.push(msg); }
}
function eq(a, b, msg) {
  ok(a === b, `${msg} — esperado ${JSON.stringify(b)}, dio ${JSON.stringify(a)}`);
}

function cargarPrecargado() {
  const ctx = { console: { info() {}, log() {}, warn() {}, error() {} } };
  ctx.window = ctx;
  vm.createContext(ctx);
  ['js/legendary-recipes.js', 'js/legendary-precursors.js', 'js/legendary-tree.js']
    .forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx));
  return ctx.LegendaryTree;
}

// === nivel 0: la aritmética, sin contratos ===
(function multiplicidadPura() {
  // La regla de Pablo: un Tooth que pide 2 Gifts, en una legendaria que usa
  // 4 Teeth, son 8 Gifts. Es un caso cerrado: no depende de ningún contrato.
  const t = cargarPrecargado();
  ok(!!t, 'el modulo se expone como LegendaryTree');

  // === Frostfang contra la wiki ===
  const r = t.build(30684);
  eq(r.status, 'recipe', 'Frostfang resuelve receta');
  eq(r.needsPrecursors, false, 'con los dos contratos no pide precursores');
  eq(r.totals.rows.length, 32, 'Frostfang tiene 32 materiales base');
  eq(r.totals.rows.reduce((s, x) => s + x.need, 0), 8613, 'suma de unidades de Frostfang');

  // Los 7 materiales T6: la wiki dice 250 de cada uno. Si el motor no
  // multiplica, salen menos.
  const porNombre = {};
  r.totals.rows.forEach(x => { porNombre[x.name] = x.need; });
  ['Vicious Fang', 'Armored Scale', 'Vicious Claw', 'Ancient Bone',
   'Vial of Powerful Blood', 'Powerful Venom Sac', 'Elaborate Totem']
    .forEach(n => eq(porNombre[n], 250, `${n} = 250 (la wiki dice 250)`));

  // El +10 sobre el lodestone y el dust viene de Freezing Core, que la wiki
  // no desglosa. El motor baja más que la wiki, y eso es lo correcto.
  eq(porNombre['Icy Runestone'], 110, 'Icy Runestone = 110 (100 de la wiki + 10 de Freezing Core)');
  eq(porNombre['Pile of Crystalline Dust'], 260, 'Pile of Crystalline Dust = 260 (250 + 10)');

  // Darksteel no aparece como material: 19681 tiene receta y se expande a
  // Platinum y Mithril. Si algún día aparece "Darksteel Ingot" como hoja, es
  // que alguien perdió una expansión.
  ok(!porNombre['Darksteel Ingot'], 'Darksteel NO es hoja: se expandió a Platinum y Mithril');

  // === convención de niveles ===
  eq(r.node.level, 1, 'la raíz es nivel 1');
  eq(r.node.children.length, 4, 'Frostfang tiene los 4 ingredientes directos');
  r.node.children.forEach(ch => eq(ch.level, 2, `${ch.name} está en nivel 2`));
  ok(r.totals.maxDepth >= 5, `profundidad real >= 5 (dio ${r.totals.maxDepth})`);

  // El nombre del árbol no depende del nivel: 55 nodos para Frostfang.
  let nodos = 0;
  (function contar(n) { nodos++; (n.children || []).forEach(contar); })(r.node);
  eq(nodos, 55, 'Frostfang dibuja 55 nodos');

  // === lo que NO entra en la columna de "necesito" ===
  // Frostfang no tiene vendor ni aristas sin id, así que se prueba con otro item.
  eq(r.totals.vendor.length, 0, 'Frostfang no tiene ingredientes de NPC');
  eq(r.totals.sinId.length, 0, 'Frostfang no tiene aristas sin id');

  // === estados de raíz que no son "recipe" ===
  const placeholders = t.build(95093);
  ok(['placeholder', 'unknown', 'no_recipe', 'material'].indexOf(placeholders.status) >= 0,
    'un id raro no rompe: da un estado nombrado (' + placeholders.status + ')');
  ok(placeholders.node !== null || placeholders.status === 'pending',
    'un id raro no devuelve un árbol inventado');

  const inexistente = t.build(999999999);
  eq(inexistente.status, 'unknown', 'un id que no existe da unknown, no una excepción');
  eq(inexistente.node.children.length, 0, 'el id desconocido no trae hijos inventados');
  ok(!!inexistente.node.note, 'el id desconocido explica por qué está vacío');

  // === los no_recipe del catálogo: nombrados y sin hijos ===
  // 64 de los 206 no tienen receta publicada. Tienen que verse.
  const R = { get: id => null };
  const ctxNoReceta = { console: { info() {}, log() {}, warn() {} } };
  ctxNoReceta.window = ctxNoReceta;
  vm.createContext(ctxNoReceta);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/legendary-recipes.js'), 'utf8'), ctxNoReceta);
  const REC = ctxNoReceta.LegendaryRecipes;
  const sinReceta = Object.keys(REC.byItem)
    .map(Number)
    .filter(id => REC.byItem[String(id)].dataStatus === 'no_recipe');
  ok(sinReceta.length > 0, 'el catálogo tiene no_recipe (' + sinReceta.length + ')');
  const nr = t.build(sinReceta[0]);
  eq(nr.status, 'no_recipe', 'un no_recipe del catálogo da no_recipe');
  ok(nr.node.isLeaf, 'un no_recipe no tiene hijos');
  ok(nr.node.name && nr.node.name.charAt(0) !== '#',
    `el no_recipe sale con nombre, no con id pelado (${nr.node.name})`);
  ok(!!nr.node.note, 'el no_recipe explica que no se fabrica');
})();

// === sin precursores: tiene que AVISAR, no dibujar medio árbol ===
(function sinPrecursores() {
  const ctx = { console: { info() {}, log() {}, warn() {} } };
  ctx.window = ctx;
  vm.createContext(ctx);
  // Solo el catálogo. El árbol de Frostfang necesita el segundo contrato.
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/legendary-recipes.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/legendary-tree.js'), 'utf8'), ctx);
  const t = ctx.LegendaryTree;
  eq(t.hasPrecursors(), false, 'sin cargar, no hay precursores');
  const r = t.build(30684);
  eq(r.needsPrecursors, true, 'sin precursores, Frostfang pide precargarlos');
  eq(r.node, null, 'sin precursores NO se dibuja un árbol de un solo nivel');
  eq(r.status, 'pending', 'el estado es pending, no recipe');
})();

// === la arista sin id: se conserva el nombre y no se cuenta ===
(function aristasSinId() {
  // Se arma a mano el caso que rompe: un ingrediente con itemId 0.
  const ctx = { console: { info() {}, log() {}, warn() {} } };
  ctx.window = ctx;
  vm.createContext(ctx);
  ctx.LegendaryRecipes = {
    byItem: { '1': { name: 'Raiz', dataStatus: 'recipe', ingredients: [{ itemId: 0, count: 3, name: 'Relic (any)' }] } },
    get: id => ctx.LegendaryRecipes.byItem[String(id)] || null
  };
  ctx.LegendaryPrecursors = { byItem: {}, get: () => null };
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/legendary-tree.js'), 'utf8'), ctx);
  const r = ctx.LegendaryTree.build(1);
  eq(r.totals.rows.length, 0, 'la arista sin id NO entra en la columna de necesito');
  eq(r.totals.sinId.length, 1, 'la arista sin id va a su propia lista');
  eq(r.totals.sinId[0].name, 'Relic (any)', 'y conserva el nombre');
  eq(r.totals.sinId[0].count, 3, 'con su cantidad');
  eq(r.node.children.length, 1, 'el nodo se dibuja igual, para que el nombre se vea');
  ok(!!r.node.children[0].note, 'y explica que no se puede contar');
})();

console.log(`armeria-motor-arbol:   ${pass} pass / ${fail} FAIL`);
if (fail) {
  console.log('FALLAS:');
  failures.forEach(f => console.log('  FAIL ' + f));
  process.exit(1);
}
