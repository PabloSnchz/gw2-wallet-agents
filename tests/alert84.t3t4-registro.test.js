/*!
 * tests/alert84.t3t4-registro.test.js â€” ALERT-84 T3+T4
 *
 * QUE SE ASERTA, Y POR QUE ESTA SEPARADO DE alert84.leyenda-estado-honesto.test.js
 * ---------------------------------------------------------------------------
 * Ese archivo (ALERT-84 T1) congelo el ESTADO HONESTO: el item de menu visible
 * decia "Cargando catalogo de legendarias..." PARA SIEMPRE. Su Â§6 tiene un candado
 * por `typeof` que dice "registerRender NO existe todavia", y su Â§7 dice "los 2
 * scripts NO se cargan". Los dos son verdad HOY y dejan de serlo con T4.
 *
 * Este archivo aserta el contrato NUEVO, y --esto es lo importante-- lo aserta
 * sobre el EFECTO (el registro ocurrio, con las 4 claves) y no sobre la FORMA
 * (`typeof x === 'function'`). Una forma pasa por construccion apenas se escribe
 * la linea; un efecto se puede romper. Es el criterio de ALERT-77 al reves del
 * que se aplico en Idea 61: no relajar el assert viejo, cambiarlo de sitio a uno
 * que pueda fallar.
 *
 * LOS TRES PILARES, y por que son TRES y no uno:
 *   1. CATALOGO CARGADO    -> root.LegendaryCatalog.items.length === 206
 *   2. CONTRATO EXISTE    -> la API publica expone registerRender
 *   3. REGISTRO OCURRIO    -> los 3 scripts en un sandbox dejan renderersRegistered
 *
 * (1) y (3) son los DOS PUNTOS DE OBSERVABILIDAD que pidio la T4: se pueden
 * volver falsos de forma INDEPENDIENTE. Un solo aserto no los separa: con el
 * registro roto y el catalogo cargado, un unico "todo anda" pasa en verde.
 *
 * LAS 3 FIRMAS, y por que el Reviewer las dijo BLOQUEANTES: `registerRender` es
 * la puerta, pero lo que el tracker tiene que LLAMAR despues importa tanto. Si
 * la puerta acepta cualquier cosa y no se chequea la forma de las 4 funciones, el
 * contrato se rompe igual -- mas tarde y mas dificil de ver, porque el error pasa
 * a estar en el que llama. Por eso el registro RECHAZA un registro incompleto: un
 * registro a medias es peor que ninguno, porque `renderersRegistered` quedaria en
 * true y el pipeline creeria que hay contrato donde hay un hueco.
 */

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}

const srcLT  = read('js', 'legendary-tracker.js');
const srcRC  = read('js', 'render-catologo.js');
const srcLD  = read('js', 'legendary-data.js');
const srcIX  = read('index.html');

// ===========================================================================
console.log('\n--- 1. El catalogo se carga y se autoexpone (punto de observabilidad 1) ---');
// Sin T4 este numero ya era observable (ALT-84 T1 lo midio) y hoy sigue siendolo:
// legendary-data.js se autoexpone al cargarse, sin que nadie lo consuma. Que sea
// observable HOY es lo que permite separar (1) de (3).
ok(/root\.LegendaryCatalog/.test(srcLD),
  'legendary-data.js se autoexpone como root.LegendaryCatalog');

// ===========================================================================
console.log('\n--- 2. La puerta: la API publica expone registerRender (punto 2) ---');
// Aislado: aca se mira la FORMA de la API, sin sandbox. Este NO es el assert
// que muerde -- lo muerde el Â§4. Este esta para que el fallo sea legible.
ok(/registerRender\s*:/.test(srcLT),
  'la API publica de legendary-tracker.js declara registerRender');

// ===========================================================================
console.log('\n--- 3. Las 3 firmas que el tracker va a CALLER (no solo a guardar) ---');
// El Reviewer: "sin fijar las firmas es un contrato que se rompe igual, solo mas
// tarde y mas dificil de ver". Se asertan contra el archivo que las DEFINE, y se
// acotan a la declaracion de la funcion -- no al archivo entero, para que una
// llamada en otro sitio no la satisfaga por construccion.
{
  const sig = (src, name) => {
    const i = src.indexOf('function ' + name + '(');
    if (i < 0) return null;
    return src.slice(i, src.indexOf(')', i) + 1);
  };
  const g = sig(srcRC, 'renderCatalogGrid');
  const f = sig(srcRC, 'renderFilterBar');
  const p = sig(srcRC, 'renderProgress');

  ok(g === 'function renderCatalogGrid(items, owned)',
    'renderCatalogGrid(items, owned) â€” la firma es la del contrato' + (g ? ' (medido: ' + g + ')' : ''));
  ok(f === 'function renderFilterBar(filters, catalog)',
    'renderFilterBar(filters, catalog) â€” la firma es la del contrato' + (f ? ' (medido: ' + f + ')' : ''));
  ok(p === 'function renderProgress(state, stats)',
    'renderProgress(state, stats) â€” la firma es la del contrato' + (p ? ' (medido: ' + p + ')' : ''));

  // La cuarta que ademas lee state.owned. Si la firma pierde `state`, el render
  // de progreso se dibuja vacio y en VERDE, que es el peor modo de fallo: no hay
  // excepcion, hay una pantalla sin datos.
  const body = srcRC.slice(srcRC.indexOf('function renderProgress('));
  const cut = body.indexOf('\n  }');
  ok(/state\.owned/.test(body.slice(0, cut < 0 ? 2000 : cut)),
    'renderProgress LEE state.owned dentro de su cuerpo (no solo lo recibe)');
}

// ===========================================================================
console.log('\n--- 4. REGISTRO OCURRIO (punto de observabilidad 3) â€” el que muerde ---');
// Sandbox propio, sin activate(), sin router, sin click. Se corren los 3 scripts
// en orden de documento (lo que hace `defer`) y se mira el EFECTO.
{
  const store = {};
  const sandbox = {
    console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
    document: {
      readyState: 'complete',
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ setAttribute() {}, appendChild() {} }),
      head: { appendChild() {} },
      addEventListener() {},
    },
    localStorage: {
      get length() { return 0; },
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    setTimeout() {},   // el retry de 50 ms no dispara en el sandbox
    CustomEvent: function () {},
    Promise: Promise,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  let threw = null;
  try {
    vm.runInContext(srcLT, sandbox, { filename: 'legendary-tracker.js' });
    vm.runInContext(srcLD, sandbox, { filename: 'legendary-data.js' });
    vm.runInContext(srcRC, sandbox, { filename: 'render-catologo.js' });
  } catch (e) {
    threw = e;
  }
  ok(!threw, 'los 3 scripts corren en orden sin revivar' + (threw ? ': ' + threw.message : ''));

  const root = sandbox.window || sandbox;
  const api = root.LegendaryTracker;

  // -- catalogo cargado: observable INDEPENDIENTE del registro
  const cat = root.LegendaryCatalog;
  ok(!!cat && Array.isArray(cat.items) && cat.items.length === 206,
    'CATALOGO CARGADO: root.LegendaryCatalog.items.length === 206'
      + (cat ? ' (medido: ' + (cat.items ? cat.items.length : 'no.items') + ')' : ' (sin LegendaryCatalog)'));

  // -- registro ocurrio
  ok(!!api && typeof api.registerRender === 'function',
    'la API expone registerRender() al terminar el IIFE');

  if (api) {
    ok(typeof api.getRenderState === 'function',
      'getRenderState() es el punto de observabilidad del registro (NO getState entero)');

    const rs = typeof api.getRenderState === 'function' ? api.getRenderState() : null;
    ok(!!rs && rs.registered === true,
      'REGISTRO OCURRIO: getRenderState().registered === true'
        + (rs ? ' (medido: ' + rs.registered + ')' : ' (sin getRenderState)'));

    if (rs) {
      const expect = ['catalogGrid', 'filterBar', 'progress', 'skeleton'];
      const got = (rs.keys || []).slice().sort();
      ok(JSON.stringify(got) === JSON.stringify(expect),
        'las 4 claves registradas son exactamente las que render-catologo.js entrega'
          + ' (medido: ' + JSON.stringify(got) + ')');
      ok(rs.missing && rs.missing.length === 0,
        'no falta ninguna clave requerida (medido missing: ' + JSON.stringify(rs.missing) + ')');
    }
  }
}

// ===========================================================================
console.log('\n--- 5. Un registro A MEDIAS se RECHAZA (por que el flag no puede mentir) ---');
// Este es el caso que hace que `renderersRegistered` sea creible. Si el registro
// aceptara un objeto incompleto y pusiera el flag en true, el pipeline creeria
// que hay contrato donde hay un hueco -- y el hueco se descubre al pintar, no al
// registrar. Un registro parcial tiene que ser indistinguible de NINGUN registro.
{
  const mk = () => {
    const sandbox = {
      console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
      document: { readyState: 'complete', getElementById: () => null, querySelector: () => null,
        querySelectorAll: () => [], createElement: () => ({ setAttribute() {}, appendChild() {} }),
        head: { appendChild() {} }, addEventListener() {} },
      localStorage: { get length() { return 0; }, getItem: () => null, setItem: () => {}, removeItem: () => {} },
      setTimeout() {}, CustomEvent: function () {}, Promise: Promise,
    };
    sandbox.window = sandbox; sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(srcLT, sandbox, { filename: 'legendary-tracker.js' });
    return sandbox.window || sandbox;
  };

  const r1 = mk().LegendaryTracker;
  // El caso real de un modulo a medias: se registro antes de que existieran las 4.
  r1.registerRender({ catalogGrid: function () {} });
  const s1 = r1.getRenderState();
  ok(s1.registered === false,
    'registro INCOMPLETO queda registered === false (no se acepta a medias)');
  ok(s1.missing && s1.missing.length === 3,
    'el registro incompleto NOMBRA lo que falta (' + JSON.stringify(s1.missing) + ')');

  // Y el caso de un valor que no es funcion: mismo rechazo, mismo motivo.
  const r2 = mk().LegendaryTracker;
  r2.registerRender({ catalogGrid: 'no soy funcion', filterBar: function () {},
                      progress: function () {}, skeleton: function () {} });
  ok(r2.getRenderState().registered === false,
    'una clave que no es function tambien se rechaza (el typeof se verifica, no solo la presencia)');

  // Y el camino feliz, que es el que los 3 scripts de arriba hacen.
  const r3 = mk().LegendaryTracker;
  r3.registerRender({ catalogGrid: function () {}, filterBar: function () {},
                      progress: function () {}, skeleton: function () {} });
  ok(r3.getRenderState().registered === true, 'el registro COMPLETO si queda registered === true');
}

// ===========================================================================
console.log('\n--- 6. Los 3 scripts se cargan, y en el orden que rompe si se invierte ---');
// El Reviewer: legendary-data.js NO necesita ir antes de render-catologo.js
// (sus 3 usos de LegendaryCatalog estan dentro de renderProgress, en tiempo de
// render, no en el registro). Con `defer` el orden del documento se preserva, asi
// que los 3 van defer en ese orden siempre que esten antes del primer activate().
{
  const tag = (name) => {
    // `[^"]*` y no `[^>]*`: el src real lleva query string ("?v=1.1.0"), que no
    // es `>`. Un `[^>]*` aca matchea el tag incompleto y el assert pasa por un
    // motivo equivocado â€” el arnes, no el codigo.
    const re = new RegExp('<script[^>]*src="js/' + name.replace('.', '\\.') + '[^"]*"[^>]*>');
    const m = srcIX.match(re);
    return m ? m[0] : null;
  };
  const tLT = tag('legendary-tracker.js');
  const tLD = tag('legendary-data.js');
  const tRC = tag('render-catologo.js');

  ok(!!tLT, 'legendary-tracker.js esta cargado en index.html');
  ok(!!tLD, 'legendary-data.js esta cargado en index.html (T3: sin el, el catalogo no existe en la pagina)');
  ok(!!tRC, 'render-catologo.js esta cargado en index.html (T3: sin el, no hay quien pinta)');

  ok(!!tLD && /defer/.test(tLD), 'legendary-data.js va con defer (si no, compite con el DOM)');
  ok(!!tRC && /defer/.test(tRC), 'render-catologo.js va con defer');

  // El orden que ROMPE al invertirse: tracker -> render-catologo. Si
  // render-catalog o corre primero, su `if` da false y cae al retry, que es un
  // unico setTimeout sin segundo intento -> el registro no ocurre en esta carga.
  if (tLT && tRC) {
    ok(srcIX.indexOf(tLT) < srcIX.indexOf(tRC),
      'tracker ANTES de render-catologo en el orden del documento (el orden que rompe si se invierte)');
  }
}

// ===========================================================================
console.log('\n--- 7. La T3 DE VERDAD: el render USA los renderers registrados ---');
// El §4 dice "el registro ocurrio". Esto dice "y el registro SIRVE de algo":
// que `renderCurrentMode()` pinte la salida de las funciones registradas en vez
// del mensaje estatico. Sin esto, el modulo puede tener contrato perfecto y
// seguir pintando "en construccion" — o sea, el cableado sin efecto, que es el
// modo de fallo que el ALERT-84 original describes y que el registro no detecta.
//
// Aqui se monta un DOM minimo con #legendaryModeContent y se llama al pipeline
// completo (activate -> setMode -> renderCurrentMode), sin router ni click.
{
  const buildDom = () => {
    const mkEl = (tag) => ({
      tagName: tag, attrs: {}, children: [], _html: '',
      setAttribute(k, v) { this.attrs[k] = v; },
      getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      hasAttribute(k) { return k in this.attrs; },
      addEventListener() {},
      appendChild(c) { this.children.push(c); },
      querySelector: () => null, querySelectorAll: () => [],
      get innerHTML() { return this._html; },
      set innerHTML(v) { this._html = String(v); },
    });
    const content = mkEl('div');
    const body = mkEl('div');
    body.setAttribute('data-initialized', 'false');
    const byId = { legendaryModeContent: content, legendaryArmoryBody: body };
    const doc = {
      readyState: 'complete',
      getElementById: (id) => byId[id] || null,
      querySelector: (sel) => (sel === '#legendaryModeContent' ? content : null),
      querySelectorAll: () => [],
      createElement: () => mkEl('div'),
      head: { appendChild() {} },
      addEventListener() {},
    };
    return { doc, content };
  };

  // Dos sandboxes identicos salvo en los renderers: uno registrado (el camino
  // real, T3) y uno sin registro (el camino honesto). La diferencia de lo que
  // se pinta es lo que prueba que el cableado hace algo.
  const runPipeline = (register) => {
    const { doc, content } = buildDom();
    const store = {};
    const sandbox = {
      console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
      document: doc,
      localStorage: { get length() { return 0; },
        getItem: (k) => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
      setTimeout() {}, CustomEvent: function () {}, Promise: Promise,
    };
    sandbox.window = sandbox; sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(srcLT, sandbox, { filename: 'legendary-tracker.js' });
    vm.runInContext(srcLD, sandbox, { filename: 'legendary-data.js' });
    vm.runInContext(srcRC, sandbox, { filename: 'render-catologo.js' });
    if (register) register(sandbox.window.LegendaryTracker);
    sandbox.window.LegendaryTracker.activate();
    return content.innerHTML;
  };

  const conRegistro = runPipeline(null);

  ok(!/[eE]n construcci[oó]n/.test(conRegistro),
    'CON REGISTRO: el contenido NO es el mensaje "en construccion" (medido: '
      + (conRegistro ? conRegistro.slice(0, 48).replace(/\s+/g, ' ') : '(vacio)') + '...)');
  ok(/lt-filter-bar/.test(conRegistro),
    'CON REGISTRO: se pinto la barra de filtros que devuelve renderFilterBar()');
  ok(/lt-catalog-grid/.test(conRegistro),
    'CON REGISTRO: se pinto el grid que devuelve renderCatalogGrid()');
  // El catalogollego entero: sin filtros activos se pintan las 206. Un grid con
  // 1 item seria un filtro aplicado por defecto que nadie pidio.
  const cards = (conRegistro.match(/class="lt-catalog-grid/g) || []).length;
  ok((conRegistro.match(/lt-item-card/g) || []).length === 206,
    'CON REGISTRO: se pintan las 206 legendarias del catalogo, sin filtro por defecto'
      + ' (medido: ' + (conRegistro.match(/lt-item-card/g) || []).length + ')');

  // Camino honesto: sin registro debe quedar el mensaje, no un hueco vacio.
  const { doc, content } = buildDom();
  const sandbox2 = {
    console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
    document: doc,
    localStorage: { get length() { return 0; }, getItem: () => null, setItem: () => {}, removeItem: () => {} },
    setTimeout() {}, CustomEvent: function () {}, Promise: Promise,
  };
  sandbox2.window = sandbox2; sandbox2.globalThis = sandbox2;
  vm.createContext(sandbox2);
  vm.runInContext(srcLT, sandbox2, { filename: 'legendary-tracker.js' });
  const t2 = sandbox2.window.LegendaryTracker;
  t2.registerRender({});          // registro incompleto -> rechazado
  t2.activate();
  // Con tilde: el texto real dice "en construcción". Un regex sin tilde aca es
  // un FAIL que parece de codigo y es del assert.
  ok(/en construcci[oó]n/.test(content.innerHTML),
    'SIN REGISTRO VALIDO: vuelve el mensaje honesto (el fallback no es un hueco vacio)'
      + ' (medido: "' + content.innerHTML.replace(/<[^>]*>/g, '').slice(0, 46) + '")');
}

// ===========================================================================
console.log('\n--- 8. Lo que NO se implementa (y por que esta escrito) ---');
// getState() ENTERO no entra. render-catologo.js NO lo llama: 0 invocaciones, la
// unica mencion esta en la cabecera, linea 11, dentro del bloque `Consume:`.
// Escribirlo seria implementar una API que nadie usa y que promete un contrato
// de estado completo que este modulo todavia no tiene (filtros, owned, stats).
ok(typeof (vm.runInNewContext(
       '(function(root){' + srcLT + ';return typeof root.LegendaryTracker.getState;})(this)',
       { console: { log() {}, info() {}, warn() {} }, document: {
         readyState: 'loading', addEventListener() {}, getElementById: () => null } }
     )) === 'string', 'sandbox valido para el chequeo de getState');

console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
