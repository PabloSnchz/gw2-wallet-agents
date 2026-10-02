/**
 * armeria-filtros-cola-card.test.js — los 2 cambios del catalogo (2026-10-02).
 *
 * QUÉ MIDE
 *   A. Los botones "Tengo" / "Me faltan" del catalogo: que recorten con la
 *      MISMA señal que ya usa la card (verde = la tengo / PENDING = no la tengo),
 *      que sean excluyentes entre si, que se combinen con tipo/gen/exp, y que
 *      los numeros que imprimen sean ciertos.
 *   B. El boton de encolar en la card: que exista, que refleje el estado de la
 *      cola sin abrir nada, y — lo importante — que GANE al click de la card.
 *
 * POR QUÉ SE EVALÚA Y NO SE LEE
 * El punto B es el unico de los dos donde un cambio chico rompe algo invisible:
 * la card abre el arbol y el boton encola. Si el boton pierde, un solo click
 * hace las dos cosas y el usuario no lo ve porque las dos funcionan. Leer el
 * HTML y decir "el boto esta dentro de la card" no dice si el click va a parar.
 *
 * POR QUÉ `data-ftype="ownership"` Y NO `data-scope`
 * El switch "Desbloqueadas / Solo faltantes" SE CAYO a proposito y su arnes
 * (`hb126-cola-crafteo.test.js`, COLA-11 y COLA-12) sigue afirmando que no
 * existen `data-scope=` ni `setScope`. Este filtro no lo resucita: mismo
 * mecanismo generico `data-ftype`, otro nombre, otros textos. La exclusividad
 * sale del toggle generico de `wireFilterBar` y no de codigo nuevo.
 *
 * CONTROLES NEGATIVOS
 *   - `owned[id] === 0` tiene que contar como NO la tengo. El predicado real es
 *     `> 0` (`renderItemCard`:229), asi que un `>= 0` seria un filtro que
 *     muestra como propias las legendarias que no tenes.
 *   - ownership nulo tiene que dejar pasar TODO. Un filtro sin off seria una
 *     trampa: el usuario no vuelve al catalogo completo.
 *   - "Armas + Tengo" tiene que ser la interseccion, no la union ni el ultimo
 *     que se aplico.
 *   - el conteo tiene que sumar al total del subconjunto filtrado.
 *   - `renderProgress()` llama `renderItemCard` con 3 argumentos: la 4ta
 *     variable (la cola) no puede romperla.
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

function cuerpo(nombre, archivo) {
  const src = fs.readFileSync(path.join(ROOT, archivo), 'utf8');
  const i = src.indexOf('function ' + nombre + '(');
  if (i === -1) { fail++; failures.push(`no existe ${nombre}() en ${archivo}`); return null; }
  let d = 0, ini = src.indexOf('{', i), j = ini;
  for (; j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (d === 0) break; }
  }
  return src.slice(i, j + 1);
}

// =======================================================================
// A. EL FILTRO — comportamiento del predicado, no su texto
// =======================================================================

const CAT = [
  { id: 101, type: 'weapon', generation: 3, expansion: 'EoD', name: 'Frostfang' },
  { id: 102, type: 'weapon', generation: 3, expansion: 'EoD', name: 'Borealis' },
  { id: 103, type: 'weapon', generation: 2, expansion: 'PoF', name: 'Duskheart' },
  { id: 104, type: 'armor', generation: 3, expansion: 'EoD', name: 'Aurora' }
];
// 102 esta en el mapa con conteo 0: la card lo muestra PENDING (verde = >0),
// asi que el filtro tambien tiene que verlo como "no lo tengo".
const OWNED = { 101: 3, 102: 0, 104: 1 };

const pfSrc = cuerpo('passesFilters', 'js/legendary-tracker.js');
if (pfSrc) {
  const sb = {};
  vm.createContext(sb);
  vm.runInContext('var filters = {};' + pfSrc + '\nthis.passesFilters = passesFilters;', sb);
  sb.filters = { type: null, generation: null, expansion: null, ownership: null };
  sb.owned = OWNED;

  // `passesFilters` lee el `filters` del modulo, no un parametro: el objeto de
  // filtros se SETEA en el contexto antes de cada llamada. Pasarlo como
  // argumento (que es lo intuitivo) lo mandaria al slot de `owned` y el filtro
  // no recortaria nunca — un arnes que corre en verde sobre un filtro roto.
  const lista = (f) => {
    sb.filters = f;
    return CAT.filter(function (it) { return sb.passesFilters(it, OWNED); });
  };
  // `ids` devuelve un STRING y no un array a proposito: `CAT.filter(...)` se
  // ejecuta dentro del contexto `vm`, asi que el array que devuelve es del otro
  // realm y `===` entre dos arrays de realms distintos da false SIEMPRE. Un
  // aserto que no puede distinguir "mal" de "distinto realm" no mide nada: hay
  // que comparar primitivos.
  const ids = (arr) => arr.map(function (x) { return x.id; })
    .sort(function (a, b) { return a - b; }).join(',');

  eq(ids(lista({ type: null, generation: null, expansion: null, ownership: null })),
    '101,102,103,104',
    'sin filtros pasa todo (incluido ownership nulo: el filtro tiene off)');

  eq(ids(lista({ type: null, generation: null, expansion: null, ownership: 'tengo' })),
    '101,104',
    'ownership=tengo deja solo las que tengo');
  eq(ids(lista({ type: null, generation: null, expansion: null, ownership: 'tengo' }))
    .split(',').indexOf('102'), -1,
    'CONTROL NEGATIVO: owned[id]=0 NO cuenta como "la tengo" (la card la marca PENDING)');

  eq(ids(lista({ type: null, generation: null, expansion: null, ownership: 'faltan' })),
    '102,103',
    'ownership=faltan deja las que no tengo');

  eq(ids(lista({ type: 'weapon', generation: null, expansion: null, ownership: 'tengo' })),
    '101',
    '"Armas" + "Tengo" es la INTerseccion (falla si es union o si pisa el otro filtro)');
  eq(ids(lista({ type: null, generation: 3, expansion: null, ownership: 'faltan' })),
    '102',
    '"Gen 3" + "Me faltan" tambien se combina');

  // CONTROL: ownership desconocido tiene que dejar pasar, no vaciar la grilla.
  eq(ids(lista({ type: null, generation: null, expansion: null, ownership: 'inventado' })),
    '101,102,103,104',
    'CONTROL: un valor de ownership desconocido no vacia el catalogo');
}

// El off del filtro: sin `ownership` en el estado inicial no hay boton que la
//_apague_, y `filters.ownership` seria `undefined` — que es falsy y por lo
// tanto pasa el filtro, pero es un off accidental, no un off declarado.
const trSrc = fs.readFileSync(path.join(ROOT, 'js/legendary-tracker.js'), 'utf8');
ok(/var filters = \{[^}]*ownership/.test(trSrc),
  '`filters` declara `ownership` desde el inicio (off explicito, no `undefined`)');
ok(/filters\.ownership\s*=\s*null/.test(
    (cuerpo('wireFilterBar', 'js/legendary-tracker.js') || '')),
  '"Limpiar" tambien limpia `ownership` (si no, el filtro sobrevive a su propio off)');

// Los conteos que los botones imprimen tienen que ser ciertos. Se evaluan, no
// se leen: un "(12)" sobre un subconjunto que tiene 9 es una mentira visible.
const ocSrc = cuerpo('ownershipCounts', 'js/legendary-tracker.js');
if (ocSrc) {
  const sb = { LegendaryCatalog: { items: CAT }, owned: OWNED };
  vm.createContext(sb);
  vm.runInContext(
    'var filters = { type: null, generation: null, expansion: null, ownership: null };\n' +
    'var root = { LegendaryCatalog: LegendaryCatalog };\n' +
    (pfSrc || 'function passesFilters(){return true;}') + '\n' +
    ocSrc + '\nthis.ownershipCounts = ownershipCounts;', sb);
  sb.filters.type = 'weapon';
  const c = sb.ownershipCounts(OWNED);
  eq(c.tengo, 1, 'ownershipCounts: con Tipo=Armas hay 1 que tengo');
  eq(c.faltan, 2, 'ownershipCounts: con Tipo=Armas hay 2 que me faltan');
  eq(c.tengo + c.faltan, 3, 'CONTROL: tengo + faltan = el total del subconjunto filtrado');
  eq(c.total, 3, 'el total cuenta la interseccion con los otros filtros, no el catalogo entero');
}

// =======================================================================
// A2. LA BARRA — los botones tienen que ser los dos, del mismo eje
// =======================================================================

const fbSrc = cuerpo('renderFilterBar', 'js/render-catologo.js');
if (fbSrc) {
  const sb = {};
  vm.createContext(sb);
  sb.root = { LegendaryTracker: { getOwnershipCounts: function () { return sb.CUENTOS; } } };
  sb.CUENTOS = { tengo: 2, faltan: 2, total: 4 };
  vm.runInContext(
    'var root = this.root;' +
    'var esc = function (s) { return String(s); };' +
    'var TYPE_LABELS = { weapon: "Armas", armor: "Armaduras", trinket: "Trinketes", back: "Backs", upgradecomponent: "Componentes", relic: "Reliquias" };' +
    'var GEN_LABELS = { 3: "Gen 3", 2: "Gen 2", 1: "Gen 1" };' +
    'var EXPANSION_LABELS = { EoD: "EoD", PoF: "PoF", HoT: "HoT", Core: "Core" };' +
    'var EXPANSION_COLORS = { EoD: "#974EFF" };' +
    'var typeColor = function () { return "#974EFF"; };' +
    'var getFilterOptions = function () { return { types: {}, gens: {}, exps: {} }; };' +
    fbSrc + '\nthis.renderFilterBar = renderFilterBar;', sb);

  // La firma es el contrato de renderers (`alert84.t3t4-registro` la mide): se
  // llama con 2 argumentos, como siempre. Los conteos llegan por consulta.
  const off = sb.renderFilterBar({ type: null, generation: null, expansion: null, ownership: null }, CAT);
  const on = sb.renderFilterBar({ type: null, generation: null, expansion: null, ownership: 'tengo' }, CAT);

  ok(off.indexOf('data-ftype="ownership"') !== -1,
    'la barra trae el filtro de posesion');
  ok(off.indexOf('data-fvalue="tengo"') !== -1, 'el boton es "Tengo"');
  ok(off.indexOf('data-fvalue="faltan"') !== -1, 'el boton es "Me faltan"');

  // La exclusividad sale de que los DOS sean el mismo `data-ftype`: el toggle de
  // `wireFilterBar` escribe `filters[ft]`, y con dos ejes distintos los dos
  // botonesPodrian quedar apretados a la vez.
  const ejes = off.match(/data-ftype="ownership"/g) || [];
  eq(ejes.length, 2, 'los DOS botones comparten `data-ftype="ownership"` (asi son excluyentes)');

  ok(off.indexOf('data-scope=') === -1 && off.indexOf('Solo faltantes') === -1,
    'no resucita el switch caido que afirma COLA-11 (data-scope= / "Solo faltantes")');
  ok(/class="lt-filter-btn[^"]*active/.test(on),
    'el boton de posesion se marca activo con el filtro puesto');
  eq((off.match(/class="lt-filter-btn[^"]*active/g) || []).length, 0,
    'con el filtro apagado ningun boton de posesion queda marcado activo');

  // Los numeros: el render PINTA los que le da el tracker, y no puede inventar.
  sb.CUENTOS = { tengo: 9, faltan: 7, total: 16 };
  const conN = sb.renderFilterBar({ type: 'weapon', generation: null, expansion: null, ownership: null }, CAT);
  ok(conN.indexOf('Tengo (9)') !== -1 && conN.indexOf('Me faltan (7)') !== -1,
    'el render pinta textualmente los conteos que le da el tracker');

  // Sin tracker (o sin el metodo) tiene que mostrar 0, no un numero inventado.
  sb.CUENTOS = { tengo: 0, faltan: 0 };
  const sinN = sb.renderFilterBar({ type: null, generation: null, expansion: null, ownership: null }, CAT);
  ok(sinN.indexOf('Tengo (0)') !== -1 && sinN.indexOf('Me faltan (0)') !== -1,
    'sin conteos el render muestra 0, no inventa numeros');
  sb.CUENTOS = { tengo: 2, faltan: 2, total: 4 };
}

// =======================================================================
// B. EL BOTON DE ENCOLAR EN LA CARD
// =======================================================================

const cardSrc = cuerpo('renderItemCard', 'js/render-catologo.js');
if (cardSrc) {
  const mk = () => {
    const sb = {};
    vm.createContext(sb);
    vm.runInContext(
      'var esc = function (s) { return String(s); };' +
      'var TYPE_LABELS = { weapon: "Armas" };' +
      'var typeColor = function () { return "#974EFF"; };' +
      'var expansionColor = function () { return "#974EFF"; };' +
      'var genLabel = function () { return "Gen 3"; };' +
      'var typeLabel = function (i) { return TYPE_LABELS[i.type] || i.type; };' +
      'var expansionLabel = function (i) { return i.expansion; };' +
      'var tpCoinHTML = function (n) { return String(n); };' +
      cardSrc + '\nthis.renderItemCard = renderItemCard;', sb);
    return sb;
  };
  const item = { id: 101, type: 'weapon', generation: 3, expansion: 'EoD', name: 'Frostfang', icon: '', tpTradeable: false, tpSell: 0 };

  // La vista de progreso llama con 3 argumentos: la 4ta variable no puede romperla.
  const sinCola = mk();
  const h3 = sinCola.renderItemCard(item, OWNED, 0);
  ok(typeof h3 === 'string' && h3.indexOf('data-card-queue=') !== -1,
    'renderItemCard con 3 argumentos (la vista de progreso) sigue funcionando');

  const fuera = mk();
  const h0 = fuera.renderItemCard(item, OWNED, 0, []);
  ok(h0.indexOf('Agregar a la cola') !== -1,
    'con la cola vacia el boton ofrece agregar');
  ok(h0.indexOf('Quitar de la cola') === -1,
    'con la cola vacia NO dice "Quitar de la cola"');

  const dentro = mk();
  const h1 = dentro.renderItemCard(item, OWNED, 0, [101]);
  ok(h1.indexOf('Quitar de la cola') !== -1,
    'con el item encolado el boton dice "Quitar de la cola" sin abrir el modal');
  ok(h1.indexOf('Agregar a la cola') === -1,
    'encolado, el boton no ofrece volver a agregar');
  ok(h1.indexOf('data-card-queue="101"') !== -1,
    'el boton lleva el id del item de SU card (no el de otra)');

  const otro = mk();
  ok(otro.renderItemCard(item, OWNED, 0, [999]).indexOf('Quitar de la cola') === -1,
    'CONTROL: encolar OTRO item no cambia el estado de este boton');

  // El boton tiene que estar DENTRO de la card: si quedara afuera, el
  // `stopPropagation` no tendria nada que parar.
  const iCard = h1.indexOf('class="card lt-item-card"');
  const iBtn = h1.indexOf('data-card-queue=');
  ok(iCard !== -1 && iBtn > iCard, 'el boton cuelga de la card (stopPropagation tiene algo que parar)');
  const cierre = h1.lastIndexOf('</div>');
  ok(iBtn < cierre, 'el boton se pinta antes del cierre de la card');
}

// =======================================================================
// B2. EL CLICK — que el boton gane de verdad
// =======================================================================
// Un arbol de nodos falso con la misma forma que usa `wireItemCards`: el
// listener sube con `parentNode` buscando `.lt-item-card`. Se comprueba que el
// click en el boton NO llega a `onCardTapped`, y el click en el fondo SI.

const wcSrc = cuerpo('wireItemCards', 'js/legendary-tracker.js');
const eaSrc = cuerpo('encolarConAviso', 'js/legendary-tracker.js');
let corridas = [];
if (wcSrc && eaSrc) {
  const avisos = [];
  let RES = { ok: true, added: true, reason: null };

  // `encolarConAviso` se evalua de VERDAD, con `toggleQueue` y `toast` inyectados:
  // si va mockeado, el arnés no comprueba que el boton de la card avise lo mismo
  // que el del modal, que es justo lo que se le pidio.
  function corrida(esBoton) {
    corridas = [];
    avisos.length = 0;
    const content = {
      _ltCardsWired: false,
      addEventListener: function (t, f) { this._h = f; }
    };
    const card = {
      getAttribute: function (k) { return k === 'data-id' ? '101' : null; },
      classList: { contains: function (c) { return c === 'lt-item-card'; } },
      parentNode: content
    };
    // Un click "en el boton" y un click "en la card" llegan al mismo listener;
    // lo que cambia es de que nodo sale el evento, que es justo lo que
    // `wireItemCards` recorre con `parentNode`.
    const target = {
      getAttribute: function (k) { return k === 'data-card-queue' ? '101' : null; },
      classList: { contains: function () { return false; } },
      parentNode: card
    };
    const $ = function () { return content; };
    const sb = {
      content: content, $: $, card: card, target: target,
      onCardTapped: function (id) { corridas.push('card:' + id); },
      toggleQueue: function (id) { corridas.push('cola:' + id); return RES; },
      toast: function (msg) { corridas.push('toast'); avisos.push(String(msg)); },
      renderCurrentMode: function () { corridas.push('render'); },
      state: { queue: [101, 102] }, QUEUE_MAX: 5
    };
    vm.createContext(sb);
    const DEPS = ['content', '$', 'card', 'target', 'onCardTapped',
      'toggleQueue', 'toast', 'renderCurrentMode', 'state', 'QUEUE_MAX']
      .map(function (n) { return 'var ' + n + ' = this.' + n + ';'; }).join('');
    vm.runInContext(DEPS + eaSrc + '\n' + wcSrc + '\nwireItemCards();', sb);

    content._h({
      target: esBoton ? target : card,
      stopPropagation: function () { corridas.push('stop'); },
      preventDefault: function () { corridas.push('prevent'); }
    });
    return corridas.slice();
  }

  // `esBoton` es un booleano y no un string: `corrida('card')` es TRUTHY, asi que
  // los dos clicks terminaban saliendo del nodo del boton y el test "el click en
  // el fondo abre el arbol" pasaba sin probar nunca el click en el fondo.
  RES = { ok: true, added: true, reason: null };
  corridas = corrida(false);
  eq(corridas.filter(function (x) { return x.indexOf('card:') === 0; }).length, 1,
    'el click en el FONDO de la card abre el arbol');
  eq(corridas.filter(function (x) { return x.indexOf('cola:') === 0; }).length, 0,
    'el click en el fondo no encola');

  corridas = corrida(true);
  eq(corridas.filter(function (x) { return x.indexOf('card:') === 0; }).length, 0,
    'el click en el BOTON NO abre el arbol (gana el boton a la card)');
  eq(corridas.filter(function (x) { return x.indexOf('cola:') === 0; }).length, 1,
    'el click en el boton encola (misma accion que el modal)');
  eq(corridas.filter(function (x) { return x === 'stop'; }).length, 1,
    'el boton para la propagacion del click (pedido explicito: si no, encola y abre a la vez)');

  // Y el repintado: encolar desde la card tiene que volver a pintar, o el boton
  // sigue diciendo "Agregar a la cola" sobre un item que ya esta encolado.
  eq(corridas.filter(function (x) { return x === 'render'; }).length, 1,
    'encolar desde la card repinta la grilla (el boton refleja el estado nuevo)');
  eq(avisos.length, 1, 'encolar desde la card avisa, igual que el boton del modal');

  // Y el rechazo: si la cola esta llena, avisa y NO repinta.
  RES = { ok: false, added: false, reason: 'llena' };
  corridas = corrida(true);
  eq(corridas.filter(function (x) { return x === 'toast'; }).length, 1,
    'cola llena: el boton de la card avisa, igual que el del modal');
  eq(avisos.join(' ').indexOf('(5)') !== -1, true,
    'el aviso de cola llena menciona el tope real (QUEUE_MAX), no uno escrito a mano');
  eq(corridas.filter(function (x) { return x === 'render'; }).length, 0,
    'CONTROL: si no se agrego, no se repinta (no se inventa un estado nuevo)');
  eq(corridas.filter(function (x) { return x.indexOf('card:') === 0; }).length, 0,
    'CONTROL: cola llena tampoco abre el arbol');
  RES = { ok: true, added: true, reason: null };
}

// =======================================================================

console.log('armeria-filtros-cola-card: ' + pass + ' pass / ' + fail + ' FAIL');
failures.forEach(function (m) { console.log('  FAIL: ' + m); });
process.exit(fail === 0 ? 0 : 1);