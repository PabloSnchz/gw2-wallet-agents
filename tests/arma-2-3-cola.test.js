/*!
 * tests/arma-2-3-cola.test.js — ARME 2.3: la cola de crafteo (punto 5 del plan)
 *
 * QUE CAMBIA Y QUE TIENE QUE SEGUIR SIENDO CIERTO
 * ---------------------------------------------------------------------------
 * "Mi progreso" deja de ser un subconjunto IMPLICITO de las 206 (las
 * desbloqueadas, o las que faltan, con el switch 2.2) y pasa a ser la COLA: de
 * a UNA legendaria a la vez, hasta 5, en el orden en que el usuario las puso.
 *
 * Lo que este archivo congela son las TRES cosas que un refactor de este tipo
 * rompe sin avisar, y las tres son silenciosas:
 *
 *   1. EL ORDEN. `renderProgress` ordenaba alfabeticamente por nombre. Con la
 *      cola, ordenar tira abajo lo unico que la cola afirmo, que es cual va
 *      primero, y la pantalla sigue viéndose bien: 5 cards, 5 nombres, 0
 *      errores. Este es el fallo caro de este cambio y por eso tiene assert
 *      propio con dos items cuyos nombres estan en orden INVERSO al de la cola.
 *
 *   2. EL TOPE. 5 es foco, no inventario. Si el tope se rompe, la cola "anda"
 *      y nadie lo nota hasta que son 30. El caso que se aserta es el
 *      RECHAZO (`full`), no el agregado: el agregado no distingue "6 en cola"
 *      de "6 en cola donde el usuario quiere las 6".
 *
 *   3. LA PERSISTENCIA con prefijo `gn:`. Un `localStorage` crudo sin prefijo
 *      sobrevive igual: la cola aparece, se pierde al recargar, y el bug se
 *      manifiesta como "no me acuerdo de la cola" en vez de como error.
 *
 * LO QUE ESTE ARCHIVO NO AFIRMA
 * ---------------------------------------------------------------------------
 * No afirma que la cola este bien cargada: solo que el camino que la carga
 * sobrevive a basura. Un `localStorage` editado a mano, o de una version
 * anterior, puede traer cualquier cosa y un `indexOf` sobre un objeto tira.
 *
 * Y un aviso sobre la seccion 8, que SI es un assert de FORMA: el orden de las
 * dos condiciones del listener (`data-action="queue-toggle"` antes de
 * `.lt-item-card`) se lee del cuerpo, no se ejecuta, porque reproducir el click
 * exigiria montar el panel entero. Es forma. Por eso la seccion 9 le hace una
 * MUTACION: mover ese bloque despues del `.lt-item-card` tiene que romperlo.
 * Un assert de forma al que nunca se le hizo una mutacion no es un assert.
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

const srcLT = read('js', 'legendary-tracker.js');
const srcRC = read('js', 'render-catologo.js');

// ===========================================================================
console.log('\n--- 1. Sandbox: el modulo carga y la cola arranca vacia ---');
// Sandbox propio, sin activate(), sin router, sin click: mismo corte que
// alert84.t3t4. Se mira el EFECTO, no la forma.
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
  setTimeout() {},
  CustomEvent: function () {},
  Promise: Promise,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

let threw = null;
try {
  vm.runInContext(srcLT, sandbox, { filename: 'legendary-tracker.js' });
} catch (e) {
  threw = e;
}
ok(!threw, 'legendary-tracker.js carga sin excepcion' + (threw ? ' -> ' + threw.message : ''));

const T = sandbox.LegendaryTracker;
ok(!!T, 'window.LegendaryTracker existe');

if (T) {
  // =========================================================================
  console.log('\n--- 2. La API publica: lo que entra y lo que SE SACA ---');
  // Que el tope viva en la API y no en el render es lo que hace que un
  // consumidor externo (el modal, un test) no pueda tener otro tope.
  ok(T.queueMax === 5, 'la API publica declara queueMax === 5 (medido: ' + T.queueMax + ')');
  ok(typeof T.getQueue === 'function', 'la API publica expone getQueue');
  ok(typeof T.toggleQueue === 'function', 'la API publica expone toggleQueue');

  // El switch 2.2 se CAJO con la cola. Quedar con `setScope` en la API
  // seria un control sin nada que recortar: un consumidor externo lo llama y
  // cree que filtro algo. No se deja como `undefined` (una clave presente con
  // valor undefined es indistinguible de "la dejo y no la se").
  ok(!('setScope' in T), 'la API publica NO expone setScope (se fue con el switch)');
  ok(!/data-scope=/.test(srcLT), 'el tracker ya no dibuja data-scope (el switch se fue entero)');
  ok(!/scopeToggleHTML|wireScopeBar/.test(srcLT.replace(/\/\/.*$/gm, '')),
    'las dos funciones del switch 2.2 no existen fuera de los comentarios');

  // =========================================================================
  console.log('\n--- 3. EL TOPE: 5 es foco, y al sexto se RECHAZA ---');
  ok(JSON.stringify(T.getQueue()) === '[]', 'la cola arranca vacia');

  // El retorno de tres valores es lo que permite distinguir los tres casos en
  // la UI. Un booleano no alcanza: "no se agrego porque estaba llena" y "no se
  // agrego porque no existia" se pintarían igual.
  const r1 = T.toggleQueue(101), r2 = T.toggleQueue(102), r3 = T.toggleQueue(103);
  const r4 = T.toggleQueue(104), r5 = T.toggleQueue(105), r5b = T.toggleQueue(106);
  ok(r1 === 'added', 'agregar la primera devuelve "added"');
  ok(r2 === 'added' && r3 === 'added' && r4 === 'added' && r5 === 'added',
    'agregar hasta la quinta devuelve "added"');
  ok(r5b === 'full', 'agregar la sexta devuelve "full" (medido: ' + r5b + ')');

  // Y lo que hace el tope: NO desplaza. Sacarle el lugar a la primera seria
  // perder en silencio algo que el usuario puso ahi.
  ok(JSON.stringify(T.getQueue()) === '[101,102,103,104,105]',
    'la cola sigue con las 5 primeras, en orden (medido: ' + JSON.stringify(T.getQueue()) + ')');

  // Quitar siempre es libre, incluso llena.
  const r7 = T.toggleQueue(103);
  ok(r7 === 'removed', 'quitar de una cola llena devuelve "removed"');
  ok(JSON.stringify(T.getQueue()) === '[101,102,104,105]', 'quitar deja el hueco, no compacta');

  // El resultado se CAPTURA antes de asertar. Con `ok(T.toggleQueue(106) === 'added')`
  // dentro del aserto, la llamada ocurre al evaluar la condicion y una segunda
  // llamada en el mensaje del assert la BORRA de la cola: el test se mide a si
  // mismo. El sintoma es un "measured: removed" en un assert de agregado.
  const r6 = T.toggleQueue(106);
  ok(r6 === 'added', 'con hueco, la sexta entra (medido: ' + r6 + ')');
  ok(JSON.stringify(T.getQueue()) === '[101,102,104,105,106]', 'la cola quedo con 5 otra vez');

  const r0 = T.toggleQueue(0), rS = T.toggleQueue('abc');
  ok(r0 === 'invalid', 'un id invalido devuelve "invalid" y no se agrega');
  ok(rS === 'invalid', 'un id no numerico devuelve "invalid" y no se agrega');
  ok(JSON.stringify(T.getQueue()) === '[101,102,104,105,106]',
    'los ids invalidos NO entraron a la cola (medido: ' + JSON.stringify(T.getQueue()) + ')');

  // =========================================================================
  console.log('\n--- 4. PERSISTENCIA: prefijo gn: y una sola clave ---');
  ok('gn:legendary:queue' in store,
    'la cola se persiste en gn:legendary:queue (claves: ' + Object.keys(store).join(',') + ')');
  ok(JSON.parse(store['gn:legendary:queue']).length === 5,
    'lo persistido son los 5 ids, no un resumen (medido: ' + store['gn:legendary:queue'] + ')');
  ok(!Object.keys(store).some((k) => k.indexOf('legendary') === -1 || k === 'legendary'),
    'no aparece ninguna clave sin el prefijo del modulo');

  // =========================================================================
  console.log('\n--- 5. QUE SE PUEDA CARGAR UNA COLA CORRUPTA ---');
  // No es teorico: `localStorage` se edita a mano, y una version anterior
  // guardo otra cosa en la misma clave. Sin esto, el modulo no carga.
  const san = T._sanitizeQueue;
  ok(JSON.stringify(san([1, '1', 1])) === '[1]', 'deduplica (medido: ' + JSON.stringify(san([1, '1', 1])) + ')');
  ok(JSON.stringify(san([null, '', undefined, 'abc', {}, [], 0, -1])) === '[]',
    'descarta null, vacio, no numerico, objeto, array, 0 y negativos');
  ok(JSON.stringify(san([3.7])) === '[3]', 'un id decimal se trunca (medido: ' + JSON.stringify(san([3.7])) + ')');
  ok(san([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).length === 5, 'corta a 5 aunque le den 10');
  ok(JSON.stringify(san('no soy un array')) === '[]', 'un string no es una cola');
  ok(JSON.stringify(san(null)) === '[]', 'null no es una cola');
  ok(JSON.stringify(san([0])) === '[]', 'el id 0 no entra (medido: ' + JSON.stringify(san([0])) + ')');
}

// ===========================================================================
console.log('\n--- 6. EL ORDEN (el fallo caro) y el top-3 con peso visual ---');
// Dos items cuyos NOMBRES estan en orden inverso al de la cola. Si el render
// los ordena por nombre, la salida es la de los nombres y este assert falla.
// Es el unico assert de este archivo que un cambio "que se ve bien" rompe.
//
// Se usa el MISMO sandbox de la seccion 1 y no uno aparte: `render-catologo.js`
// se auto-registra llamando a `root.LegendaryTracker.registerRender(...)` al
// terminar su IIFE, asi que interceptando ESA puerta se obtiene la funcion
// real que el tracker va a pintar. Un sandbox aparte con las funciones
// copiadas a mano probaria una copia.
{
  const cat = [
    { id: 101, name: 'Zeta',  nameEs: 'Zeta',  type: 'weapon', generation: 1, expansion: 'exp1', tpTradeable: false, tpSell: 0 },
    { id: 102, name: 'Alfa',  nameEs: 'Alfa',  type: 'armor',  generation: 1, expansion: 'exp1', tpTradeable: false, tpSell: 0 },
    { id: 103, name: 'Omega', nameEs: 'Omega', type: 'weapon', generation: 1, expansion: 'exp1', tpTradeable: false, tpSell: 0 },
    { id: 104, name: 'Beta',  nameEs: 'Beta',  type: 'armor',  generation: 1, expansion: 'exp1', tpTradeable: false, tpSell: 0 },
    { id: 105, name: 'Gamma', nameEs: 'Gamma', type: 'weapon', generation: 1, expansion: 'exp1', tpTradeable: false, tpSell: 0 },
  ];
  const queue = [101, 102, 103, 104, 105];  // Zeta, Alfa, Omega, Beta, Gamma
  const owned = {};

  // El catalogo se expone DESPUES de que el tracker cargo, y a proposito: el
  // tracker lo lee en tiempo de llamada, no al cargar. Asi este bloque cubre
  // tambien el caso real, que es `legendary-data.js` entrando tarde.
  sandbox.LegendaryCatalog = { items: cat };

  let registered = null;
  const realRegister = T.registerRender;
  T.registerRender = function (m) { registered = m; return true; };
  let rcThrew = null;
  try {
    vm.runInContext(srcRC, sandbox, { filename: 'render-catologo.js' });
  } catch (e) {
    rcThrew = e;
  }
  T.registerRender = realRegister;

  ok(!rcThrew, 'render-catologo.js corre contra el tracker real' + (rcThrew ? ' -> ' + rcThrew.message : ''));
  ok(!!registered && typeof registered.progress === 'function',
    'renderProgress queda registrado por la puerta real (registerRender)');

  const progress = registered && registered.progress;
  const catalogGrid = registered && registered.catalogGrid;

  if (progress) {
    const html = progress({ owned: owned, items: cat.slice(), queue: queue, queueMax: 5 }, { owned: 0, total: 5, pct: 0 });
    const posOf = (name) => html.indexOf('>' + name + '<');
    const oZeta = posOf('Zeta'), oAlfa = posOf('Alfa'), oOmega = posOf('Omega');

    ok(oZeta > 0 && oAlfa > 0 && oOmega > 0, 'las 3 primeras de la cola se pintan');
    ok(oZeta < oAlfa && oAlfa < oOmega,
      'la cola respeta el ORDEN, no el alfabetico del nombre (Zeta antes que Alfa antes que Omega; pos ' +
      oZeta + '/' + oAlfa + '/' + oOmega + ')');

    // El resumen es de la COLA, no del progreso de la coleccion.
    ok(/Cola de crafteo/.test(html), 'el resumen dice "Cola de crafteo"');
    ok(!/Completado:/.test(html), 'el resumen NO dice "Completado: X / 206" (era el progreso global)');

    // Las 3 primeras con mas peso visual: el borde izquierdo pasa de 3px a 5px.
    const borders = html.match(/border-left:(\d+)px solid #974EFF/g) || [];
    ok(borders.length >= 5, 'las 5 cards llevan el borde izquierdo de la familia (medido: ' + borders.length + ')');
    const n5 = borders.filter((b) => /:5px/.test(b)).length;
    ok(n5 === 3, 'exactamente 3 cards con el borde reforzado (el top-3) (medido: ' + n5 + ')');

    ok(/data-action="queue-toggle"/.test(html), 'la card de la cola trae el boton con data-action');
    ok(/1º/.test(html), 'el boton de la primera marca su posicion');
    ok(/data-in-queue="1"/.test(html), 'la card en cola se marca con data-in-queue');

    // Empty state honesto. El mensaje viejo ("aun no posees ninguna") era
    // mentira con la cola: no tener nada en la cola es una DECISION, no un
    // estado de la cuenta.
    const vacio = progress({ owned: owned, items: [], queue: [], queueMax: 5 }, { owned: 0, total: 0, pct: 0 });
    ok(/cola de crafteo est[aá] vac/i.test(vacio), 'cola vacia: el empty state lo dice');
    ok(!/pose[eé]s ninguna/i.test(vacio), 'cola vacia: NO dice "aun no posees ninguna" (seria falso)');
    ok(/Cat/.test(vacio) && /Cola/.test(vacio), 'cola vacia: dice COMO agregar (no es un callejon sin salida)');
  }

  // Y el CATALOGO: sin la cola no puede pintar el boton, que es para lo que
  // existe el tercer argumento.
  if (catalogGrid) {
    // Un item FUERA de la cola hace falta: con los 5 dentro, el texto "+ Cola"
    // no aparece en ningun lado y el assert no mide nada.
    const cat6 = cat.concat([
      { id: 106, name: 'Fuera', nameEs: 'Fuera', type: 'weapon', generation: 1, expansion: 'exp1', tpTradeable: false, tpSell: 0 },
    ]);

    const gh = catalogGrid(cat6.slice(), owned, queue);
    ok(/data-action="queue-toggle"/.test(gh), 'el catalogo pinta el boton "+ Cola" cuando recibe la cola');
    ok(/\+ Cola/.test(gh), 'un item FUERA de la cola muestra "+ Cola"');
    ok(/2º/.test(gh), 'un item DENTRO de la cola muestra su posicion (medido: 2º presente)');
    ok(/data-in-queue="0"/.test(gh), 'el item fuera de la cola se marca data-in-queue="0"');
    ok(/1º/.test(gh), 'la primera de la cola se marca 1º');

    // El que NO tiene que mentir: sin cola conocida, NADA se marca como
    // en-cola. Un `data-in-queue="1"` aqui seria una card en la cola que el
    // usuario no puso, que es peor que un boton que no hace nada.
    const ghSin = catalogGrid(cat6.slice(), owned, undefined);
    ok(!/data-in-queue="1"/.test(ghSin),
      'sin tercer argumento NO se marca ninguna card como en-cola (no inventa pertenencias)');
    ok(/data-action="queue-toggle"/.test(ghSin),
      'sin tercer argumento el catalogo NO rompe: se ve el catalogo con todos sus botones');
    ok((ghSin.match(/lt-item-card/g) || []).length === 6,
      'sin tercer argumento se dibujan las 6 cards (medido: ' + (ghSin.match(/lt-item-card/g) || []).length + ')');
  }

  // La separacion que hace `queueItems`: un id guardado que ya no esta en el
  // catalogo NO se muestra, pero TAMPOCO se borra de la cola. Son dos cosas
  // distintas y por eso el filtro va al pintar y no al cargar: al cargar
  // borraria la cola del usuario si el catalogo todavia no esta listo.
  if (T && T.queueItems) {
    T._setQueueForTest([101, 999999]);
    const vis = T.queueItems();
    ok(vis.length === 1 && vis[0].id === 101,
      'un id guardado que no esta en el catalogo no se pinta (medido: ' + JSON.stringify(vis.map((i) => i.id)) + ')');
    ok(JSON.stringify(T.getQueue()).indexOf('999999') !== -1,
      'ese mismo id sigue en la cola guardada (no se borra por no pintar)');
    T._setQueueForTest([]);
  }
}

// ===========================================================================
console.log('\n--- 7. EL CONTRATO DE FIRMAS CAMBIO, y el cambio queda escrito ---');
// `renderCatalogGrid(items, owned)` -> `(items, owned, queue)`. Es un cambio
// de contrato DELIBERADO (sin la cola la card no puede pintar el boton), y por
// eso se aserta la firma nueva: lo que no se aserta es el cambio, y un cambio
// de contrato sin assert es un cambio que nadie va a notar cuando se rompa.
{
  const sig = (name) => {
    const i = srcRC.indexOf('function ' + name + '(');
    if (i < 0) return null;
    return srcRC.slice(i, srcRC.indexOf(')', i) + 1);
  };
  ok(sig('renderCatalogGrid') === 'function renderCatalogGrid(items, owned, queue)',
    'renderCatalogGrid recibe la cola (medido: ' + sig('renderCatalogGrid') + ')');
  ok(sig('renderProgress') === 'function renderProgress(state, stats)',
    'renderProgress(state, stats) — la firma NO cambia (la cola llega dentro de state)');
}

// ===========================================================================
console.log('\n--- 8. EL LISTENER: el boton de la cola no abre el modal ---');
// ASSERT DE FORMA, acotado al cuerpo del listener y no al archivo entero: una
// mencion de `queue-toggle` en un comentario no lo satisface. Se le hace una
// mutacion en la seccion 9 y por eso tiene dientes.
{
  const i = srcLT.indexOf('function wireItemCards(');
  ok(i > 0, 'wireItemCards existe');
  const body = srcLT.slice(i, srcLT.indexOf('\n  }\n', i));
  const iQ = body.indexOf("data-action') === 'queue-toggle");
  const iC = body.indexOf("classList.contains('lt-item-card')");
  ok(iQ > 0, 'el listener reconoce el boton de la cola');
  ok(iC > 0, 'el listener reconoce la card');
  ok(iQ > 0 && iC > 0 && iQ < iC,
    'el boton se resuelve ANTES que la card (si no, agregar a la cola abre el modal)');

  // Y el efecto observable: el tracker le pasa la cola al grid como COPIA.
  ok(/catalogGrid\(items, owned, queue\.slice\(\)\)/.test(srcLT),
    'el tracker le pasa una COPIA de la cola al grid (una copia, no el interno)');

  // Y el modal sabe si el item esta en la cola, sin que el render consulte
  // nada: `computeMaterials` es puro y se lo dice `openItemModal`.
  ok(/datos\.inQueue = queue\.indexOf/.test(srcLT),
    'openItemModal le dice al render si el item esta en la cola');
  ok(!/function computeMaterials[\s\S]{0,4000}inQueue/.test(srcLT),
    'computeMaterials NO se toca: sigue siendo puro (la UI no entra en el calculo)');
}

console.log('\n--- 9. MUTACION: al assert de forma de la 8 se le saca y se vuelve a poner ---');
// Un assert de forma al que nunca se le hizo una mutacion no es un assert: pasa
// igual con la regla escrita o sin ella. Este bloque CAMBIA el codigo bajo
// prueba en memoria y verifica que el detector de la seccion 8 se da vuelta.
//
// La mutacion es la que el bug real seria: resolver `.lt-item-card` antes que
// `data-action="queue-toggle"`. El boton esta DENTRO de la card, asi que el
// `while` del listener llegaria a la card primero y cada click de "+ Cola"
// abriria el modal de la legendaria que el usuario solo queria agregar. Nadie
// lo ve en el codigo: las dos lineas parecen exchangeables.
{
  const i = srcLT.indexOf('function wireItemCards(');
  const end = srcLT.indexOf('\n  }\n', i);
  const original = srcLT.slice(i, end);

  // Se sacan los dos bloques y se reinscriben en el orden EQUIVOCADO.
  const bQ = original.indexOf("if (target.getAttribute && target.getAttribute('data-action') === 'queue-toggle') {");
  const bC = original.indexOf("if (target.classList && target.classList.contains('lt-item-card')) {");
  const bloqueQ = original.slice(bQ, original.indexOf('}\n', original.indexOf('return;', bQ)) + 2);
  const bloqueC = original.slice(bC, original.indexOf('}\n', original.indexOf('return;', bC)) + 2);
  const cuerpo = original.slice(0, bQ) + original.slice(bC + bloqueC.length, original.length - bloqueC.length);
  const mutado = cuerpo.slice(0, bC - bloqueC.length - bQ + bQ) + bloqueC + '\n' + bloqueQ + cuerpo.slice(bC);

  const idx = (src) => {
    const a = src.indexOf('function wireItemCards(');
    const b = src.slice(a, src.indexOf('\n  }\n', a));
    return [b.indexOf("data-action') === 'queue-toggle"), b.indexOf("classList.contains('lt-item-card')")];
  };

  const [oQ, oC] = idx(original);
  const [mQ, mC] = idx(mutado);

  ok(oQ > 0 && oC > 0 && oQ < oC, 'el codigo real tiene el boton ANTES que la card');
  ok(mQ > 0 && mC > 0 && mQ > mC,
    'el codigo MUTADO tiene la card antes que el boton (medido: ' + mQ + ' vs ' + mC + ')');
  ok(!(mQ > 0 && mC > 0 && mQ < mC),
    'el detector de la seccion 8 REACHAZA el codigo mutado (por eso tiene dientes)');
}

console.log('\nCOLA: ' + pass + ' pass / ' + fail + ' fail');
process.exit(fail ? 1 : 0);
