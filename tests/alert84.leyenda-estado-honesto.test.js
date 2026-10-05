/*!
 * tests/alert84.leyenda-estado-honesto.test.js
 *
 * ALERT-84 (PO, ronda 17, 2026-09-30): "Armería Legendaria" es un item de menu
 * VISIBLE que decia "Cargando catálogo de legendarias..." PARA SIEMPRE.
 *
 * LA CADENA, medida sin suposiciones. Las lineas de `index.html` son de ESTE
 * arbol. Una cita de linea sin el arbol al que pertenece es una cita SIN UNIDAD
 * (ALERT-84, hallazgo del PO). El desplazamiento contra `main@d328969` NO es
 * uniforme, y por eso va medido por par y no como un numero solo:
 *
 *   - +11 para el menu y el panel (750->761, 528->539): el boton de cache, que
 *     esta ANTES de todo lo demas.
 *   - +24 para el <script> del tracker (988->1012): las +11 de antes, mas las
 *     +5 de la T3 (2026-09-30) y las +8 de comentario del contrato (HB#122).
 *     Los dos inserts que lo movieron estan DESPUES de las lineas de arriba, y
 *     por eso el desplazamiento crece segun donde se mida.
 *   - `legendary-data.js` y `render-catologo.js` NO EXISTEN en `d328969`
 *     (los agrego la T3), asi que para ellos no hay un "antes" que citar: se
 *     citan los de este arbol y se dice cual es el arbol.
 *
 *     index.html:779  item de menu `navLegendaryArmory`, CON ICONO, VISIBLE
 *     router.js:125   ruta registrada;  :1562  la resuelve
 *     index.html:539  el <section id="legendaryArmoryPanel"> existe
 *     index.html:1047  <script legendary-tracker.js> se carga
 *     index.html:1048  <script legendary-data.js> se carga
 *     index.html:1049  <script legendary-recipes.js> se carga   (HB#122)
 *     index.html:1052  <script render-catologo.js> se carga
 *     legendary-tracker.js  loadLegendaryData() es un STUB: resuelve []
 *     legendary-tracker.js  renderCatalogSkeleton() escribe "Cargando ..." y
 *                           NADA lo reemplaza
 *
 *     doRefresh() -> loadLegendaryData()  resuelve [] en microsegundos
 *                 -> renderCatalogSkeleton()  <-- escribe la palabra "Cargando"
 *
 * Sin timeout, sin error, sin reintento. Un error se investiga; un "Cargando"
 * infinito se espera.
 *
 * QUE ASEVERA ESTE ARCHIVO, y por que NO es lo de siempre:
 *
 * NO comprueba que el modulo funcione (no funciona: es la T3 del PO, 2-4 h, con
 * veredicto del Reviewer). Comprueba UNA cosa: que lo que la app PINTA no sea un
 * estado de carga cuando no hay carga. Un modulo a medio hacer que dice la
 * verdad es un modulo honesto; uno que dice "Cargando" para siempre es una
 * promesa que la app no puede retractar, porque no existe el estado "todavia no".
 *
 * LA REGLA QUE ESTE ARCHIVO ENCIERRE:
 *     un esqueleto que llega hasta el menu deja de ser un esqueleto.
 * La idea sana —"base primero, Phase 2 despues"— es correcta hasta que index.html
 * carga el esqueleto y el router publica la ruta. Ahi dejo de ser etapa interna
 * y pasa a ser una PROMESA.
 *
 * Corolatorio para los planes, que es lo que hay queIMARY: si hay un
 * "Phase 3 Commit 1" en el backlog, la pregunta no es "¿esta el codigo escrito?"
 * sino "¿esta cableado, y contra que?".
 *
 * Ejecutar: node tests/alert84.leyenda-estado-honesto.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function eq(a, b, msg) { ok(a === b, msg + '   [obtenido: ' + JSON.stringify(a) + ']'); }

const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const srcLT = read('js', 'legendary-tracker.js');
const srcIX = read('index.html');
const srcRouter = read('js', 'router.js');

// ---------------------------------------------------------------------------
// Cortar el CUERPO de una funcion del archivo real, no el archivo entero.
// Sin esto, un "Cargando" escrito en otra funcion contaria y el test pasaria
// por construccion: es el modo de falla del Tramo 3 de la Idea 61 (ALERT-76).
// ---------------------------------------------------------------------------
function body(name) {
  const at = srcLT.indexOf('function ' + name + '(');
  if (at < 0) return '';
  let i = srcLT.indexOf('{', at);
  let depth = 0;
  for (let j = i; j < srcLT.length; j++) {
    if (srcLT[j] === '{') depth++;
    else if (srcLT[j] === '}') { depth--; if (depth === 0) return srcLT.slice(at, j + 1); }
  }
  return '';
}

// ===========================================================================
console.log('\n--- 1. El modulo esta en el menu (el precondicional del ALERT) ---');
ok(/id="navLegendaryArmory"/.test(srcIX), 'el item de menu existe en index.html');
ok(/href="#\/account\/legendary-armory"/.test(srcIX), 'y apunta a la ruta real');
ok(!/id="navLegendaryArmory"[^>]*hidden/.test(srcIX),
  'y NO esta hidden: por eso el "Cargando" era visible, no interno');
ok(/'#\/account\/legendary-armory'\s*:\s*'legendaryArmory'/.test(srcRouter),
  'la ruta esta registrada en el router');
ok(/<script defer src="js\/legendary-tracker\.js\?v=/.test(srcIX),
  'el <script> se carga con version (cache-busting)');

// ===========================================================================
console.log('\n--- 2. NINGUN renderer pinta un estado de carga que no termina ---');
// Estas son las DOS funciones que `doRefresh()` y `setMode()` llaman. Ninguna
// puede decir "Cargando": no hay nada cargando.
for (const fn of ['renderCatalogSkeleton', 'renderProgressSkeleton']) {
  const b = body(fn);
  ok(b !== '', fn + ' se lee del archivo real');
  if (!b) continue;
  // El criterio es la PALABRA, no la frase exacta: "Cargando", "cargando",
  // "Cargando catalogo", "Cargando tu progreso" — todas son el mismo bug.
  ok(!/Cargando/i.test(b),
    fn + ' NO dice "Cargando": la carga ahora es real y termina sola (bug 2.1, 2026-10-02)');
  ok(!/Cargando/i.test(b) && !/cargando\.\.\./i.test(b),
    fn + ' no promete una carga que no termina (sin elipsis de espera)');
  // Y dice algo que sea un ESTADO, no una accion pendiente.
  ok(/en construcción/i.test(b),
    fn + ' declara un estado ("en construcción"), no una accion pendiente');
}

// El archivo entero, como red de contencion: si alguien agrega un tercer
// renderer con "Cargando", el grep de arriba (acotado a 2 funciones) no lo ve.
//
// Se mide sobre el CODIGO, no sobre el archivo: el comentario de ALERT-84
// NOMBRA la palabra "Cargando" cuatro veces (explica el bug que arregla), y un
// `!/Cargando/.test(srcLT)` sobre la prosa daria un FAIL que obliga a borrar la
// explicacion. Es ALERT-79 aplicado a un test: `node --check` no ve un
// comentario, y un assert sobre prosa tampoco distingue el bug del relato.
const soloCodigo = srcLT
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');
ok(!/Cargando/.test(soloCodigo),
  'el CODIGO del modulo no contiene "Cargando" en ninguna funcion (red amplia)');

// ===========================================================================
console.log('\n--- 3. El copy DICE que no esta hecho, en los DOS modos ---');
{
  const cat = body('renderCatalogSkeleton');
  const pro = body('renderProgressSkeleton');
  ok(/catálogo todavía no está implementado/.test(cat),
    'el modo Catalogo dice que el catalogo no esta implementado');
  ok(/progreso todavía no está implementado/.test(pro),
    'el modo Progreso dice que el progreso no esta implementado');
  // El modo Progreso antes decia "Cargando TU progreso": ahora dice que no
  // esta implementado. Es el mismo bug y por lo tanto el mismo fix.
  ok(!/Cargando tu progreso/.test(pro), 'el modo Progreso ya no dice "Cargando TU progreso"');
}

// ===========================================================================
console.log('\n--- 4. NO se toco el contrato que render-catologo.js va a usar ---');
// `render-catologo.js` (Phase 3 Commit 1, 17.950 B, commiteado y NO cargado)
// fue escrito contra esta capa. T3/T4 lo van a cablear, asi que los `id` y el
// grid de 5 columnas tienen que SOBREVIVIR a este fix. Un fix de copy que
// borra el contrato convierte un bug visible en un bug invisible para el que
// venga a cablear.
{
  const cat = body('renderCatalogSkeleton');
  const pro = body('renderProgressSkeleton');
  ok(/id="legendaryCatalogGrid"/.test(cat), 'se conserva #legendaryCatalogGrid (contrato con render-catologo.js)');
  ok(/id="legendaryProgressList"/.test(pro), 'se conserva #legendaryProgressList (contrato con render-catologo.js)');
  ok(/grid-template-columns:repeat\(5,1fr\)/.test(cat),
    'se conserva el grid de 5 columnas que el modulo ya renderizaba');
  // Y el stub DEJÓ de ser un stub. Este assert se INVIERTE el 2026-10-02
  // (fix del bug 2.1, "ARMF"): `loadLegendaryData()` consultaba NADA y
  // devolvía `[]` en microsegundos, así que el módulo pintaba "aun no posees
  // ninguna legendaria" con el mismo aspecto que una cuenta recién creada.
  // La API ya existía y ya la consumía `inventory-hub.js:218`: el módulo era
  // el que no la llamaba.
  //
  // Que este assert se invierta NO significa que ALERT-84 deja de importar.
  // Lo que se cierra es la premisa de que "T1 es el estado, no la
  // funcionalidad". Lo que sigue vigente es el resto del archivo: los dos
  // skeletons no prometen una carga que no termina, y el menu sigue
  // alcanzable. Si alguien reintrodujera la palabra "Cargando" sin una carga
  // real detras, los asserts de las secciones 2 y 3 lo cazan.
  //
  // El test que verifica que la llamada OCURRE y que la armar�� llega al
  // módulo no es este — es `hb119-alert2-1.test.js`, que mira el efecto
  // (fase roja de 8 FAIL) en vez de la forma del codigo.
  const stub = srcLT.indexOf("not implemented (Phase 2)");
  ok(stub < 0, 'loadLegendaryData() YA NO es un stub: lee /v2/account/legendaryarmory (bug 2.1, 2026-10-02)');
  ok(/getAccountLegendaryArmory/.test(srcLT),
    'loadLegendaryData() consulta la API de armería de verdad');
}

// ===========================================================================
console.log('\n--- 5. El menu sigue siendo alcanzable (no se "arreglo" escondiendo) ---');
// T1 NO oculta el item. Escribo esto porque la tentacion al ver un modulo roto
// es esconderlo, y eso seria una decision de PRODUCTO (Pablo), no un fix de
// bug: el modulo va a existir, y ocultarlo ahora seria volver a romperlo en
// silencio cuando vuelva.
ok(/id="navLegendaryArmory"/.test(srcIX),
  'el item sigue en el menu: ocultarlo es decision de producto, no un fix');
ok(/legendaryArmoryPanel/.test(srcRouter),
  'el router sigue resolviendo la vista: no se toco el ruteo');

// ===========================================================================
console.log('\n--- 6. El modulo sigue funcionando como modulo (carga real en vm) ---');
// El test anterior mira TEXTO. Este carga el archivo de verdad en un sandbox y
// llama a los dos renderers: si el fix dejo el DOM o el IIFE roto, el archivo
// ni siquiera llega a `root.LegendaryTracker`.
{
  const store = {};
  const fakeEl = {
    innerHTML: '',
    getAttribute: () => null,
    setAttribute() {},
    querySelectorAll: () => [],
  };
  const sandbox = {
    window: undefined,
    document: {
      readyState: 'complete',
      getElementById: (id) => (id === 'legendaryModeContent' ? fakeEl : null),
      querySelector: (sel) => (sel === '#legendaryModeContent' ? fakeEl : null),
      querySelectorAll: () => [],
      addEventListener() {},
      dispatchEvent() {},
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
      head: { appendChild() {} },
    },
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    console: { log() {}, info() {}, warn() {}, error() {} },
    setTimeout() {},
    CustomEvent: function () {},
    Promise: Promise,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  try {
    vm.runInContext(srcLT, sandbox, { filename: 'legendary-tracker.js' });
    pass++; console.log('  PASS  el IIFE corre sin error de sintaxis en runtime');
  } catch (e) {
    fail++; console.log('  FAIL  el IIFE revienta al cargarse: ' + e.message);
  }
  const root = sandbox.window || sandbox;
  ok(root.LegendaryTracker && typeof root.LegendaryTracker === 'object',
    'expone root.LegendaryTracker al terminar el IIFE');
  if (root.LegendaryTracker) {
    const api = root.LegendaryTracker;
    // La API publica REAL. Este archivo CONGELO el estado previo a T4, asi que
    // sus 3 asserts de "todavia no" se INVIERTEN el 2026-09-30 (T3+T4
    // mergeadas). El que aserta que el registro OCURRIO y que el render lo USA
    // no es este — es `alert84.t3t4-registro.test.js`, que mira el efecto y no
    // la forma. Este solo congela la frontera: la puerta existe, y `getState`
    // entero NO (a proposito: render-catologo.js tiene 0 invocaciones, la unica
    // mencion esta en la cabecera dentro del bloque `Consume:`).
    ok(typeof api.registerRender === 'function',
      'registerRender existe (T4, 2026-09-30): la puerta que render-catologo.js pide');
    ok(typeof api.getRenderState === 'function',
      'getRenderState() existe: el punto de observabilidad del REGISTRO');
    // `getState` ENTERO se INVIERTE el 2026-10-02 (bug 2.1). Antes se
    //odia que no existiera "a proposito: render-catologo.js tiene 0
    // invocaciones". Ese razonamiento era correcto para su momento y quedo
    // viejo en cuanto el modulo dejo de ser un esqueleto: ahora el modal de
    // materiales (2.3) y el conteo de faltantes necesitan leer `owned`, y la
    // unica forma de que lo lean SIN mutar el interno del modulo es que
    // exista una puerta de lectura.
    //
    // El razonamiento viejo no era tonto: era un congelamiento de la
    // frontera, para que un `getState` a medio hacer no pasara inadvertido.
    // Por eso la version nueva no solo invierte el signo: afirma que la
    // puerta EXISTE y que devuelve COPIAS, que es la condicion que la hacia
    // segura de exponer.
    ok(typeof api.getState === 'function',
      'getState() existe (bug 2.1, 2026-10-02): la puerta de lectura que necesitan los modales');
    if (typeof api.getState === 'function') {
      const st = api.getState();
      ok(st && typeof st.owned === 'object' && st.owned !== null,
        'getState().owned es el mapa {id: count} derivado de la armería');
      ok(Array.isArray(st.readErrors),
        'getState().readErrors existe: "no pude leer" es un hecho, no una cuenta vacía');
    }
    for (const m of ['initOnce', 'activate', 'deactivate', 'refresh', 'prefetch']) {
      ok(typeof api[m] === 'function', 'la API publica expone ' + m + '()');
    }
    ok(!!api.Route && api.Route.path === 'account/legendary-armory',
      'Route.path es el que el router publica');
  }
}

// ===========================================================================
// Este bloque congelaba "los 2 scripts NO se cargan". Con T3+T4 mergeadas se
// INVIERTE: ahora SI se cargan, y el error OBVIO pasa a ser el contrario —
// dejarlos sin cargar, que reproduce el mismo sintoma visible (nada) y por el
// mismo motivo: el contrato no llega al painter. Que el orden de los 3 sea el
// ROMPE al invertirse lo aserta `alert84.t3t4-registro.test.js` §6.
// ===========================================================================
console.log('\n--- 7. Los 2 scripts YA se cargan (T3, 2026-09-30) ---');
ok(/legendary-data\.js/.test(srcIX),
  'legendary-data.js (85 KB, 206 legendarias) se carga: sin el, el catalogo no existe en la pagina');
ok(/render-catologo\.js/.test(srcIX),
  'render-catologo.js (17 KB, grid+filtros) se carga: sin el, no hay quien pinte');
ok(/root\.LegendaryCatalog/.test(read('js', 'legendary-data.js')),
  'legendary-data.js se autoexpone como root.LegendaryCatalog (ya existe, no cableado)');

console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
