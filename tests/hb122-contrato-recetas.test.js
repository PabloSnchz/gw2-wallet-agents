// tests/hb122-contrato-recetas.test.js — CONTRATO-01..16
// QUE PRUEBA: el contrato de fabricacion de js/legendary-recipes.js.
//
// El contrato es lo que la cola de crafteo necesita para distinguir tres cosas
// que se ven IGUALES y significan distinto: "se hace en la forja", "se craftea
// con una disciplina" y "esta pieza no tiene receta publicada". Con un
// `hasRecipe: boolean` las tres colapsan a false y la cola miente.
//
// FASE ROJA: contra origin/main (sin el archivo) da FAIL en todos los bloques
// que leen el contrato. El control de que la fase roja lee el archivo QUE SE
// CREE leer va primero y se imprime: un detector que no puede fallar no es un
// detector (ALERT-180, ALERT-172, ALERT-176: la red rota del lado de la red,
// tres veces en dos ciclos).
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0, skip = 0;
const FALLOS = [], SKIPS = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  pass - ' + name); }
  else { fail++; FALLOS.push(name); console.log('  FAIL - ' + name + (extra ? '  [' + extra + ']' : '')); }
}
// Un aserto que NO se pudo correr no es un aserto que paso. Contarlo como pass
// seria un verde falso; contarlo como FAIL seria un rojo que nadie puede
// arreglar sin un archivo que el repo ignora a proposito. Va en su propia
// categoria, con el motivo impreso SIEMPRE.
function omitido(name, motivo) {
  skip++; SKIPS.push(name);
  console.log('  skip - ' + name + (motivo ? '  [' + motivo + ']' : ''));
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROL DE RUTA. Tiene que FALLAR cuando el archivo no esta (o cuando el
// harness esta apuntando a otro lado). Si esto pasa en verde contra un
// archivo ausente, el resto de los verdes no miden nada.
// ─────────────────────────────────────────────────────────────────────────────
const CONTRATO_PATH = path.join(ROOT, 'js', 'legendary-recipes.js');
const existe = fs.existsSync(CONTRATO_PATH);
console.log('  control - leyendo: ' + CONTRATO_PATH);
console.log('  control - existe: ' + existe);
ok('CONTROL: el harness apunta al archivo del repo, no a otro worktree',
  existe,
  'falta js/legendary-recipes.js en ' + ROOT);

function cargar() {
  if (!existe) return null;
  const ctx = { console: { log() {}, warn() {}, error() {}, info() {}, debug() {} } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(CONTRATO_PATH, 'utf8'), ctx, { filename: 'legendary-recipes.js' });
  return ctx.LegendaryRecipes;
}

function cargarCatalogo() {
  const ctx = { console: { log() {}, warn() {}, error() {}, info() {}, debug() {} } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'legendary-data.js'), 'utf8'), ctx,
    { filename: 'legendary-data.js' });
  return ctx.LegendaryCatalog;
}

const R = cargar();
const CAT = cargarCatalogo();

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[CONTRATO-01] el modulo existe y expone el contrato');
ok('CONTRATO-01a: LegendaryRecipes esta expuesto', !!R);
if (R) {
  ok('CONTRATO-01b: expone craftType con los 3 valores del contrato',
    R.craftType.MYSTIC_FORGE === 'mystic_forge' &&
    R.craftType.CRAFTING === 'crafting' &&
    R.craftType.NONE === 'none',
    JSON.stringify(R.craftType));
  ok('CONTRATO-01c: expone dataStatus con los 3 estados',
    R.dataStatus.RECIPE === 'recipe' &&
    R.dataStatus.NO_RECIPE === 'no_recipe' &&
    R.dataStatus.PLACEHOLDER === 'placeholder',
    JSON.stringify(R.dataStatus));
  ok('CONTRATO-01d: expone get() y describe()',
    typeof R.get === 'function' && typeof R.describe === 'function');
}

// El bloque de "esta montado" va ANTES de la salida temprana de abajo, a
// proposito: en la fase roja el modulo no existe y todo lo demas no se puede
// evaluar, pero el montaje en index.html SI se puede, y tiene que dar FAIL
// tambien. Si viviera despues, la fase roja mediria 2 asserts y el montaje
// quedaria sin cubrir justo cuando es lo unico que se puede medir.
console.log('\n[CONTRATO-12] el modulo esta montado en index.html');
const html = fs.existsSync(path.join(ROOT, 'index.html'))
  ? fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') : '';
const tag = html.match(/<script[^>]*src="js\/legendary-recipes\.js([^"]*)"/);
ok('CONTRATO-12a: index.html carga js/legendary-recipes.js', !!tag,
  'no hay <script src="js/legendary-recipes.js"> en index.html');
ok('CONTRATO-12b: el src apunta a un archivo que EXISTE de verdad',
  !!tag && fs.existsSync(path.join(ROOT, 'js', 'legendary-recipes.js')));
// El ?v= es lo que hace que el navegador no sirva el archivo viejo desde cache
// en la Pages de prueba. Sin el, Pablo prueba el contrato anterior y dice que
// el fix no esta.
ok('CONTRATO-12c: el script lleva ?v= (sin el, el cache sirve la version vieja)',
  !!tag && /\?v=/.test(tag[1]), tag ? 'src="js/legendary-recipes.js' + tag[1] + '"' : 'sin tag');
ok('CONTRATO-12d: la etiqueta va junto a la del catalogo, no suelta al final',
  !!tag && /legendary-data\.js/.test(html.slice(Math.max(0, tag.index - 400), tag.index + 400)));

if (!R) {
  // Sin el modulo no hay nada mas que medir. Se dice y se sale con codigo 1,
  // nunca en verde: un archivo que no se cargo tiene que verse en el codigo de
  // salida, no solo en la cuenta de asserts.
  console.log('\n  (sin contrato: los bloques siguientes no corren)');
  console.log('RESULTADO: ' + pass + ' pass / ' + fail + ' FAIL');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[CONTRATO-02] los 206 ids del catalogo tienen entrada');
const cat = (CAT && CAT.items) || [];
ok('CONTRATO-02a: el catalogo tiene 206 items', cat.length === 206, String(cat.length));
const sinEntrada = cat.filter(c => R.get(c.id) === null);
ok('CONTRATO-02b: NINGUN item del catalogo queda sin entrada',
  sinEntrada.length === 0,
  sinEntrada.length + ' sin entrada: ' + sinEntrada.slice(0, 5).map(c => c.id).join(','));
ok('CONTRATO-02c: el contrato declara el mismo total que el catalogo',
  R.totalItems === cat.length, R.totalItems + ' vs ' + cat.length);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[CONTRATO-03] craftType: la particion es exacta y suma 206');
const conteo = { mystic_forge: 0, crafting: 0, none: 0 };
cat.forEach(c => { const e = R.get(c.id); conteo[e.craftType]++; });
ok('CONTRATO-03a: los 206 caen en una de las 3 categorías',
  conteo.mystic_forge + conteo.crafting + conteo.none === cat.length,
  JSON.stringify(conteo));
ok('CONTRATO-03b: el reparto medido es 124 / 18 / 64',
  conteo.mystic_forge === 124 && conteo.crafting === 18 && conteo.none === 64,
  JSON.stringify(conteo));
ok('CONTRATO-03c: counts del modulo coincide con el conteo real del catalogo',
  R.counts.craftType.mystic_forge === conteo.mystic_forge &&
  R.counts.craftType.crafting === conteo.crafting &&
  R.counts.craftType.none === conteo.none,
  JSON.stringify(R.counts.craftType) + ' vs ' + JSON.stringify(conteo));

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[CONTRATO-04] "crafting" es de primera clase, no un caso raro');
// Medido sobre el catalogo: las 18 piezas Obsidian (6 por peso) son `crafting`
// con disciplina y NO tienen receta de Forja Mistica. Si `crafting` colapsara
// en `none` o si un hasRecipe:boolean las perdiera, este bloque falla.
const obsidian = cat.filter(c => /Obsidian/.test(c.name));
ok('CONTRATO-04a: hay 18 piezas Obsidian en el catalogo', obsidian.length === 18,
  String(obsidian.length));
ok('CONTRATO-04b: LAS 18 son crafting (y ninguna mystic_forge ni none)',
  obsidian.every(c => R.get(c.id).craftType === 'crafting'),
  obsidian.filter(c => R.get(c.id).craftType !== 'crafting')
    .map(c => c.id + ':' + R.get(c.id).craftType).join(','));
ok('CONTRATO-04c: las 18 traen disciplina Y lista de ingredientes',
  obsidian.every(c => {
    const e = R.get(c.id);
    return Array.isArray(e.disciplines) && e.disciplines.length > 0 &&
      Array.isArray(e.ingredients) && e.ingredients.length > 0;
  }));
// Medido: los 18 se reparten 6 / 6 / 6 entre Armorsmith, Tailor y
// Leatherworker. La fuente declara UNA disciplina por receta, no tres: las 6
// piezas de un mismo peso se reparten entre los tres oficios, y la que te
// muestra el arbol es la de la pieza que estas mirando. Por eso la
// asercion mide el REPARTO entre las 18 y no "3 disciplinas por item".
const porDisciplina = {};
obsidian.forEach(c => {
  const d = R.get(c.id).disciplines.join('/');
  porDisciplina[d] = (porDisciplina[d] || 0) + 1;
});
ok('CONTRATO-04d: las 18 se reparten 6/6/6 entre los 3 oficios de armadura',
  Object.keys(porDisciplina).length === 3 &&
  Object.keys(porDisciplina).every(k => porDisciplina[k] === 6) &&
  Object.keys(porDisciplina).sort().join(',') === 'Armorsmith,Leatherworker,Tailor',
  JSON.stringify(porDisciplina));
ok('CONTRATO-04e: cada pieza Obsidian nombra UNA sola disciplina (no un array de 3)',
  obsidian.every(c => R.get(c.id).disciplines.length === 1),
  'largo distinto del array: ' +
  Array.from(new Set(obsidian.map(c => R.get(c.id).disciplines.length))).join('/'));

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[CONTRATO-05] "sin receta" NO es "sin datos"');
const conReceta = cat.filter(c => R.get(c.id).dataStatus === 'recipe');
const sinReceta = cat.filter(c => R.get(c.id).dataStatus === 'no_recipe');
const placeholder = cat.filter(c => R.get(c.id).dataStatus === 'placeholder');
ok('CONTRATO-05a: 142 con receta, 63 sin receta, 1 placeholder',
  conReceta.length === 142 && sinReceta.length === 63 && placeholder.length === 1,
  conReceta.length + '/' + sinReceta.length + '/' + placeholder.length);
ok('CONTRATO-05b: todo item con receta tiene ingredientes no vacios',
  conReceta.every(c => R.get(c.id).ingredients.length > 0));
ok('CONTRATO-05c: NINGUN item sin receta trae ingredientes (no es un hueco de datos)',
  sinReceta.every(c => R.get(c.id).ingredients.length === 0));
ok('CONTRATO-05d: sin receta implica craftType none',
  sinReceta.every(c => R.get(c.id).craftType === 'none'));
ok('CONTRATO-05e: el texto de "sin receta" esta declarado UNA vez, no por item',
  typeof R.noRecipeNote === 'string' && R.noRecipeNote.length > 40);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[CONTRATO-06] el placeholder 95093 va explicito y visible');
ok('CONTRATO-06a: el placeholder es 95093', R.placeholder.id === 95093, String(R.placeholder && R.placeholder.id));
ok('CONTRATO-06b: el nombre declarado es el que GW2 usa hoy',
  R.placeholder.name === 'Legendary Equipment Unlocked!', R.placeholder && R.placeholder.name);
ok('CONTRATO-06c: el placeholder esta en el catalogo con ese id',
  placeholder.length === 1 && placeholder[0].id === 95093);
ok('CONTRATO-06d: NO se descarto en silencio (sigue en BY_ITEM, no en una lista de descartados)',
  R.get(95093) !== null && R.get(95093).dataStatus === 'placeholder');
ok('CONTRATO-06e: tiene nota que explica que es y que hacer si GW2 lo renombra',
  typeof R.placeholder.note === 'string' && R.placeholder.note.length > 60);
ok('CONTRATO-06f: el nombre declarado aparece en el catalogo (si no, se aviso al construir)',
  fs.readFileSync(path.join(ROOT, 'js', 'legendary-data.js'), 'utf8').indexOf(R.placeholder.name) >= 0);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[CONTRATO-07] los ingredientes estan bien formados');
let ingsTotales = 0, idsNoNum = 0, countMalo = 0, nameVacio = 0, idNoPositivo = 0;
conReceta.forEach(c => {
  R.get(c.id).ingredients.forEach(i => {
    ingsTotales++;
    if (typeof i.itemId !== 'number' || !Number.isInteger(i.itemId) || i.itemId <= 0) idsNoNum++;
    if (!Number.isInteger(i.count) || i.count <= 0) countMalo++;
    if (!i.name) nameVacio++;
  });
});
// 567 = lo que usan las 142 recetas DEL CATALOGO. Las 634 recetas de la fuente
// suman 2340 ingredientes; el resto (492 outputs) son componentes de segundo
// nivel, que son del arbol de fabricacion y no de este contrato.
ok('CONTRATO-07a: los 142 items con receta usan 567 ingredientes en total',
  ingsTotales === 567, String(ingsTotales));
ok('CONTRATO-07b: itemId es SIEMPRE un entero positivo (la fuente los tiene como string)',
  idsNoNum === 0, String(idsNoNum));
ok('CONTRATO-07c: count es SIEMPRE un entero positivo', countMalo === 0, String(countMalo));
ok('CONTRATO-07d: ningun ingrediente sin nombre', nameVacio === 0, String(nameVacio));

// itemId 0 no puede colarse: es el "Relic (any)" de una receta de vendor que
// no es del catalogo. Si aparece, el filtro de recipes se mezclo con el de
// catalogo.
const conCero = conReceta.filter(c => R.get(c.id).ingredients.some(i => i.itemId === 0));
ok('CONTRATO-07e: ningun ingrediente del catalogo es itemId 0', conCero.length === 0,
  conCero.map(c => c.id).join(','));

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[CONTRATO-08] get() normaliza el id (string vs number)');
// La fuente tiene los ids como string y el catalogo como number. Como clave de
// objeto los dos funcionan; en un Set o un === no. get() normaliza para que el
// consumidor no tenga que saber de eso.
ok('CONTRATO-08a: get("30684") y get(30684) devuelven lo mismo',
  R.get('30684') === R.get(30684));
ok('CONTRATO-08b: get() de un id desconocido devuelve null, no undefined',
  R.get(999999) === null, String(R.get(999999)));
ok('CONTRATO-08c: get() de un id desconocido NO inventa una entrada "none"',
  !(999999 in R.byItem));

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[CONTRATO-09] describe() da una frase distinta por estado');
const ejForge = conReceta.find(c => R.get(c.id).craftType === 'mystic_forge');
const ejCraft = obsidian[0];
const ejNone = sinReceta[0];
const ejPh = placeholder[0];
ok('CONTRATO-09a: la de Forja Mistica no es la de disciplina',
  R.describe(ejForge.id) !== R.describe(ejCraft.id),
  R.describe(ejForge.id) + ' | ' + R.describe(ejCraft.id));
ok('CONTRATO-09b: la de disciplina nombra el oficio',
  /Armorsmith|Leatherworker|Tailor/.test(R.describe(ejCraft.id)), R.describe(ejCraft.id));
ok('CONTRATO-09c: la de "sin receta" es distinta de las otras dos',
  R.describe(ejNone.id) !== R.describe(ejForge.id) &&
  R.describe(ejNone.id) !== R.describe(ejCraft.id));
ok('CONTRATO-09d: la del placeholder es distinta de las otras tres',
  R.describe(ejPh.id) !== R.describe(ejForge.id) &&
  R.describe(ejPh.id) !== R.describe(ejCraft.id) &&
  R.describe(ejPh.id) !== R.describe(ejNone.id));
ok('CONTRATO-09e: describe() de un id desconocido devuelve null', R.describe(999999) === null);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[CONTRATO-10] el generador es reproducible');
// Probar el artefacto es probar que el archivo de hoy esta bien. El build se
// puede volver a romper manana sin que nadie se entere, asi que el test
// regenera y compara lo que puede compararse: la particion y el contenido
// item por item. El timestamp y el path de salida si cambian, y por eso no se
// comparan.
const { execFileSync } = require('child_process');
const tmp = path.join(require('os').tmpdir(), 'hb122-contrato-' + process.pid + '.js');

// MEDIDO en el HB#125: la fuente del generador es tools/cl_recipes.json, y
// tools/.gitignore es "*" A PROPOSITO (dump crudo de la API, no es codigo).
// Desde un clon limpio el generador NO puede abrirla, y este bloque reportaba
// eso como "el generador esta roto": 1 FAIL en origin/main desde ed9a126, que
// nadie vio porque el runner por texto leia "49 pass / 1 FAIL" como verde.
//
// Son TRES casos y el codigo los trataba como uno:
//   1) el dump esta y el generador corre -> control de reproducibilidad REAL
//   2) el dump NO esta                   -> NO EJECUTADO, con el motivo escrito
//   3) el dump esta y el generador falla -> FAIL real, del generador
// Fusionar 2 con 3 da un rojo que nadie puede arreglar, y da el otro extremo:
// si 2 se acepta como verde, 3 pasa desapercibido. Van separados.
const DUMP = path.join(ROOT, 'tools', 'cl_recipes.json');
const hayDump = fs.existsSync(DUMP);
let buildOk = false, buildErr = '';
if (hayDump) {
  try {
    const py = process.env.HB122_PY || 'python';
    execFileSync(py, [path.join(ROOT, 'js', '_build_legendary_recipes.py'), '--out', tmp],
      { stdio: 'pipe', encoding: 'utf8' });
    buildOk = true;
  } catch (e) { buildErr = (e.stderr || e.message || '').slice(0, 300); }
}

if (!hayDump) {
  omitido('CONTRATO-10a: el generador corre sin error',
    'sin tools/cl_recipes.json, que tools/.gitignore excluye a proposito. Para reproducirlo: ' +
    'volver a bajar el dump de /v2/recipes?ids=<los 206 del catalogo> y correr el generador.');
} else {
  ok('CONTRATO-10a: el generador corre sin error', buildOk, buildErr);
}

if (buildOk) {
  const ctx2 = { console: { log() {}, warn() {}, error() {}, info() {}, debug() {} } };
  ctx2.window = ctx2;
  vm.createContext(ctx2);
  vm.runInContext(fs.readFileSync(tmp, 'utf8'), ctx2, { filename: 'regenerado.js' });
  const R2 = ctx2.LegendaryRecipes;
  let iguales = 0, distintos = [];
  cat.forEach(c => {
    const a = JSON.stringify(R.get(c.id)), b = JSON.stringify(R2.get(c.id));
    if (a === b) iguales++; else if (distintos.length < 5) distintos.push(c.id);
  });
  ok('CONTRATO-10b: regenerar da el MISMO contrato item por item (206/206)',
    iguales === cat.length, iguales + '/' + cat.length + ' distintos: ' + distintos.join(','));
  try { fs.unlinkSync(tmp); } catch (e) { /* el tmp se limpia solo */ }
}

// 10c, 10d y 10e leen el TEXTO del generador, no su salida. Estaban dentro del
// if (buildOk) de una version anterior, asi que con el dump ausente no se
// corrian NUNCA: tres invariantes que el test declara vigilar y que en un clon
// limpio no vigilan nada. Sacarlos del if no los hace mas debiles.
const GEN = fs.readFileSync(path.join(ROOT, 'js', '_build_legendary_recipes.py'), 'utf8');
ok('CONTRATO-10c: el generador aborta si un craftType de la fuente no esta mapeado',
  GEN.indexOf('SOURCE_TYPE_TO_CRAFT.get(src_type)') >= 0 &&
  GEN.indexOf('no esta en el mapa del') >= 0);
ok('CONTRATO-10d: el generador AVISA si el placeholder desaparece del catalogo',
  GEN.indexOf('AVISO: el catalogo ya no tiene el placeholder') >= 0);
// La limitacion de arriba queda escrita donde se lee, para que el proximo que
// se pregunte por que 10a no corra no tenga que abrir el .gitignore para
// descubrirlo.
ok('CONTRATO-10e: el generador declara su fuente con el path exacto',
  GEN.indexOf('"tools", "cl_recipes.json"') >= 0 || GEN.indexOf("'tools', 'cl_recipes.json'") >= 0,
  'no se encontro tools/cl_recipes.json declarado como SOURCE en _build_legendary_recipes.py');

// ─────────────────────────────────────────────────────────────────────────────
// CONTROL NEGATIVO (2026-10-02, ALERT-180). La fase roja de este test da 2 FAIL
// y no 44, y el motivo hay que decirlo: el artefacto es NUEVO, asi que contra
// `origin/main` no existe un estado previo en el que 44 aserciones puedan
// evaluarse. Un "rojo de 2" asi, sin mas, no prueba que las otras 42 midan
// algo: probaria que el archivo falta.
//
// Por eso los DOS invariantes que mas peso tienen se vuelven FUNCIONES y se
// prueban contra entradas rotas a proposito. Si no detectan un contrato
// partido, esto falla aunque el contrato real este bien: una invarianta que no
// puede fallar no es una invarianta.
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[CONTRATO-11] control negativo: los invariantes detectan datos rotos');

function reparte(items, get) {
  const c = { mystic_forge: 0, crafting: 0, none: 0 };
  let otros = 0;
  items.forEach(it => {
    const e = get(it.id);
    if (!e) { otros++; return; }
    if (c[e.craftType] === undefined) { otros++; return; }
    c[e.craftType]++;
  });
  return { c, otros, suma: c.mystic_forge + c.crafting + c.none };
}
function esHuecoDeDatos(entradas) {
  // Un "hueco de datos" es una entrada que se archivo como recipe y no trajo
  // ingredientes. Un "sin receta" es una entrada none con la lista vacia.
  return entradas.filter(e => e.dataStatus === 'recipe' && e.ingredients.length === 0).length;
}

const real = reparte(cat, (id) => R.get(id));
ok('CONTRATO-11a: el reparto real no tiene items fuera de las 3 categorias',
  real.otros === 0 && real.suma === cat.length, JSON.stringify(real));

// Mutacion 1: craftType inventado. Es lo que pasaria si alguien mapeara un
// tipo de la fuente sin verlo en el mapa. El build lo aborta, pero el
// CONSUMIDOR no puede confiar solo en eso.
const roto1 = reparte(cat, (id) => {
  const e = R.get(id);
  if (!e) return null;
  return {
    craftType: e.craftType === 'none' ? 'hasRecipe' : e.craftType,
    ingredients: e.ingredients, dataStatus: e.dataStatus
  };
});
ok('CONTRATO-11b: un craftType fuera del contrato hace FALLAR el reparto',
  roto1.otros === 64 && roto1.suma !== cat.length, JSON.stringify(roto1));

// Mutacion 2: un item marcado "recipe" sin ingredientes. Es el bug que el
// contrato existe para que no exista: la cola diria "se hace en la forja" y no
// habria nada que fabricar.
const mutados = cat.map((c) => R.get(c.id));
mutados[0] = Object.assign({}, mutados[0], { ingredients: [] });
ok('CONTRATO-11c: un "recipe" sin ingredientes se detecta como hueco de datos',
  esHuecoDeDatos(mutados) === 1, String(esHuecoDeDatos(mutados)));
ok('CONTRATO-11d: el contrato real NO tiene ni un hueco de datos',
  esHuecoDeDatos(cat.map((c) => R.get(c.id))) === 0,
  String(esHuecoDeDatos(cat.map((c) => R.get(c.id)))));

// Mutacion 3: la que la planificacion de la noche daba por buena. Si el
// contrato fuera un hasRecipe:boolean, las 18 Obsidian serian indistinguibles
// de las de la forja.
const comoBoolean = (id) => {
  const e = R.get(id);
  return {
    craftType: e.dataStatus === 'recipe' ? 'mystic_forge' : 'none',
    ingredients: e.ingredients, dataStatus: e.dataStatus
  };
};
ok('CONTRATO-11e: un hasRecipe:boolean hace FALLAR el reparto de Obsidian',
  obsidian.filter(c => comoBoolean(c.id).craftType !== 'crafting').length === 18,
  'crafting sobrevive: ' + obsidian.filter(c => comoBoolean(c.id).craftType === 'crafting').length);

// ─────────────────────────────────────────────────────────────────────────────
// (El bloque CONTRATO-12, "el modulo esta montado en index.html", se evalua
// ARRIBA, antes de la salida temprana. En la fase roja el modulo no existe y
// todo lo demas no se puede evaluar, pero el montaje SI se puede, y tiene que
// dar FAIL tambien: si viviera al final, la fase roja mediria 2 asserts y el
// montaje quedaria sin cubrir justo cuando es lo unico medible.)

console.log('\nRESULTADO: ' + pass + ' pass / ' + fail + ' FAIL');
if (skip) {
  console.log('OMITIDOS (no se pudieron correr, con el motivo): ' + skip);
  SKIPS.forEach(n => console.log('  - ' + n));
}
if (fail) { console.log('FALLARON: ' + FALLOS.join(' | ')); process.exit(1); }
process.exit(0);
