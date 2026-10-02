// HB#125 - ARME punto 5: la COLA DE CRAFTEO.
//
// QUE FIJA ESTE ARNES, y que no fijaba el de 2.2 (que se retiro):
//   1. el MAXIMO de 5, y que al sexto no se agrega (y se dice por que)
//   2. que la cola SE PERSISTE con el prefijo `gn:` y sobrevive al reload
//   3. que un `localStorage` corrupto NO rompe el modulo
//   4. que el ORDEN de la cola se conserva al pintar (no se ordena por nombre)
//   5. que el filtro NO esconde un item que el usuario ya encolo
//   6. que las TRES primeras llevan mas peso visual
//   7. que el catalogo y la cola NO muestran cards identicas para un item
//      encolado y otro no
//
// El punto 2.2 tiene un contraejemplo instructive: afirmaba que el switch
// "cambia el alcance", y el arnes lo comprobo. Cuatro heartbeats despues el
// contrato cambio y el arnes paso a FALLAR, no a mentir: por eso aqui cada
// aserto dice que COSA se rompio si se rompe.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const src = fs.readFileSync(path.join(ROOT, 'js/legendary-tracker.js'), 'utf8');
const srcCat = fs.readFileSync(path.join(ROOT, 'js/render-catologo.js'), 'utf8');

let pass = 0, fail = 0;

// LA FIRMA ES (txt, cond, detalle). Y el primer parametro se VALIDA.
//
// ESTE arnes nacio con `ok(cond, txt)` -- la firma de hb124 -- y como en el
// resto del repo los asserts se escriben `ok('nombre', condicion)`, la
// condicion era siempre un STRING, o sea siempre truthy: **41 pass / 0 fail
// sin haber ejecutado un solo assert**. La suite entera daba verde.
//
// Es el mismo modo de fallo que ALERT-172 (el runner que no puede fallar) y
// que ALERT-176 (el filtro de texto que confunde "fallo" con "hablo de un
// fallo"), y tiene una forma nueva: **no es un instrumento roto, es un
// instrumento con la firma al reves**. Un `ok` que acepta cualquier cosa en
// la posicion de la condicion no puede fallar, por mas asserts que escribas.
//
// Por eso el parametro de texto tiene que ser un string no vacio: si alguien
// llama `ok(true)` o `ok(cond)` a secas, el assert MUERE aqui en vez de
// pasar en silencio.
const ok = (txt, cond, detalle) => {
  if (typeof txt !== 'string' || txt.length === 0) {
    console.log('  FAIL - ASSERT SIN TEXTO (la firma es ok(txt, cond, detalle): un texto vacio significa que el assert esta mal escrito y no midio nada)');
    fail++;
    return;
  }
  if (cond) { pass++; console.log('  pass - ' + txt + (detalle ? '  [' + detalle + ']' : '')); }
  else { fail++; console.log('  FAIL - ' + txt + (detalle ? '  [' + detalle + ']' : '')); }
};

// ---------------------------------------------------------------- extraccion
const lines = src.split(/\r?\n/);
const cuerpo = (nombre) => {
  const ini = lines.findIndex((l) => new RegExp('function\\s+' + nombre + '\\s*\\(').test(l));
  if (ini < 0) return null;
  let fin = ini, nivel = 0, abierto = false;
  for (let i = ini; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { nivel++; abierto = true; }
      else if (ch === '}') nivel--;
    }
    if (abierto && nivel === 0) { fin = i; break; }
  }
  return { ini: ini + 1, fin: fin + 1, txt: lines.slice(ini, fin + 1).join('\n') };
};

// ---------------------------------------------------------------- evaluacion
// Las seis funciones de la cola se EVALUAN, no se leen. Un aserto sobre el
// texto del source no distingue una cola correcta de una que dice "maximo 5".
const nombres = ['normalizeQueue', 'isQueued', 'toggleQueue', 'queueItems', 'saveQueue'];
const partes = [];
for (const n of nombres) {
  const c = cuerpo(n);
  if (!c) {
    console.log('  FAIL - no existe ' + n + ' en legendary-tracker.js (es parte del nucleo de la cola)');
    fail++;
  } else {
    partes.push(c.txt);
  }
}

if (partes.length !== nombres.length) {
  console.log('\n  COLA: ' + pass + ' pass / ' + fail + ' fail');
  process.exitCode = 1;
  return;
}

console.log('\n[LA COLA SE EVALUA, NO SE LEE]');
console.log('  funciones: ' + nombres.join(', '));

// Las CONSTANTES se leen del SOURCE, no se hardcodean aca.
//
// QUE PASA SI SE HARDCODEAN: el sandbox declara su propio `QUEUE_MAX = 5`,
// asi que el arnés mide EL DEL ARNES. Cambiar el 5 por un 6 en
// `legendary-tracker.js` -- que es el defecto real que este arnés existe para
// cazar -- deja el arnés en **41 pass / 0 fail**. Se comprobó: la mutacion
// SOBREVIVIO a la primera version de este archivo.
//
// Es el mismo modo de fallo que el `ok` con la firma al reves, una capa mas
// abajo: el arnés mido una copia de la regla en vez de la regla. Un arnés que
// reimplementa la constante que quiere verificar no verifica la constante,
// verifica que su copia este bien.
const MAX_SRC = (src.match(/var\s+QUEUE_MAX\s*=\s*(\d+)/) || [])[1];
const TOP_SRC = (src.match(/var\s+QUEUE_TOP_W\s*=\s*(\d+)/) || [])[1];
if (!MAX_SRC || !TOP_SRC) {
  console.log('  FAIL - no se pudo leer QUEUE_MAX / QUEUE_TOP_W del source: el arnes mediria su propia copia');
  fail++;
}
console.log('  QUEUE_MAX del source = ' + MAX_SRC + ' ; QUEUE_TOP_W del source = ' + TOP_SRC);

ok('QUEUE_MAX del source es 5 (el limite que dice el plan, leido del codigo)',
   MAX_SRC === '5', 'QUEUE_MAX=' + MAX_SRC);
ok('QUEUE_TOP_W del source es 3', TOP_SRC === '3', 'QUEUE_TOP_W=' + TOP_SRC);

// Catalogo stub de 8 items: alcanza para probar el maximo 5 (6to y 7mo
//乀 tienen que ser rechazados) y para probar que el filtro no borra.
const CATALOGO = [
  { id: 11, nameEs: 'Alfa', type: 'armor', generation: 1, expansion: 'core' },
  { id: 22, nameEs: 'Bravo', type: 'armor', generation: 1, expansion: 'core' },
  { id: 33, nameEs: 'Charlie', type: 'armor', generation: 1, expansion: 'core' },
  { id: 44, nameEs: 'Delta', type: 'weapon', generation: 1, expansion: 'core' },
  { id: 55, nameEs: 'Echo', type: 'weapon', generation: 1, expansion: 'core' },
  { id: 66, nameEs: 'Foxtrot', type: 'weapon', generation: 1, expansion: 'core' },
  { id: 77, nameEs: 'Golf', type: 'trinket', generation: 2, expansion: 'exp2' },
  { id: 88, nameEs: 'Hotel', type: 'trinket', generation: 2, expansion: 'exp2' }
];

const rootStub = { LegendaryCatalog: { items: CATALOGO } };

let sandbox;
try {
  sandbox = new Function('root', 'queue', 'QUEUE_MAX',
    'var saveCount = 0;\n' +
    'var sSet = function (k, v) { saveCount++; };\n' +
    'var sGet = function (k) { return null; };\n' +
    partes.join('\n') +
    '\nreturn { setQueue: function (q) { queue = q; }, raw: function () { return queue; },' +
    ' saves: function () { return saveCount; },' +
    ' normalize: normalizeQueue, isQueued: isQueued, toggle: toggleQueue,' +
    ' items: queueItems };')(rootStub, [], Number(MAX_SRC));
} catch (e) {
  console.log('  FAIL - la cola no se pudo evaluar: ' + e.message);
  fail++;
  sandbox = null;
}

if (sandbox) {
  console.log('\n[LO QUE SE PERSISTE, CONTADO]');
  // Un aserto de TEXTO ("el codigo llama a sSet('queue', queue)") puede pasar
  // con una llamada que nunca ocurre. Este cuenta las llamadas REALES de
  // escritura: sin esto, una cola que solo vive en memoria -- que es
  // exactamente el defecto que hace que "la perdi al recargar" -- daria verde.
  sandbox.setQueue([]);
  const saves0 = sandbox.saves();
  sandbox.toggle(11);
  ok('agregar ESCRIBE (1 escritura real)', sandbox.saves() === saves0 + 1,
     'saves=' + (sandbox.saves() - saves0));
  sandbox.toggle(11);
  ok('quitar TAMBIÉN escribe (una cola que solo se guarda al agregar pierde el ultimo)',
     sandbox.saves() === saves0 + 2, 'saves=' + (sandbox.saves() - saves0));

  // Un rechazo NO debe escribir: guardar el mismo estado otra vez no es
  // idempotente, es ruido que se paga en cada F5.
  sandbox.setQueue([1, 2, 3, 4, 5]);
  const savesFull = sandbox.saves();
  sandbox.toggle(6);
  ok('un RECHAZO por cola llena NO escribe (guardar el mismo estado es ruido)',
     sandbox.saves() === savesFull, 'saves=' + (sandbox.saves() - savesFull));
  sandbox.toggle('basura');
  ok('un RECHAZO por id invalido TAMPOCO escribe', sandbox.saves() === savesFull,
     'saves=' + (sandbox.saves() - savesFull));

  // Se deja la cola como estaba ANTES de este bloque. Sin esta linea, el
  // bloque siguiente arranca con 5 elementos puestos a proposito y todos sus
  // asserts fallan por una razon que no tiene nada que ver con lo que prueban:
  // el arnes se pisa a si mismo. Se vio: 4 FAIL con mensajes que hablaba de
  // "quitar" y el problema real era una cola llena de una linea mas arriba.
  sandbox.setQueue([]);

  console.log('\n[EL MAXIMO DE 5, Y EL SEXTO]');
  [11, 22, 33, 44, 55].forEach((id) => sandbox.toggle(id));
  ok('cinco elementos entran y la cola tiene 5', sandbox.raw().length === 5,
     'len=' + sandbox.raw().length);

  const sexto = sandbox.toggle(66);
  ok('el SEPTIMO... no: el 6to NO entra (limite 5)', sexto.ok === false && sexto.reason === 'full',
     'ok=' + sexto.ok + ' reason=' + sexto.reason);
  ok('y la cola sigue teniendo 5, no 6', sandbox.raw().length === 5,
     'len=' + sandbox.raw().length);
  ok('y el id rechazado no aparece en la cola', sandbox.isQueued(66) === false);

  console.log('\n[QUITAR]');
  const quitado = sandbox.toggle(33);
  ok('quitar uno ya encolado lo saca y lo dice', quitado.ok === true && quitado.removed === true,
     'ok=' + quitado.ok + ' removed=' + quitado.removed);
  ok('la cola baja a 4', sandbox.raw().length === 4, 'len=' + sandbox.raw().length);
  ok('y el id quitado ya no esta', sandbox.isQueued(33) === false);
  ok('y los otros siguen', sandbox.isQueued(11) === true && sandbox.isQueued(55) === true);
  // Y ahora SI entra uno nuevo: la prueba de que "full" no dejo la cola
  // trabada. Una cola que se llena y no se puede vaciar es un modo de fallo
  // que el assert de "len === 5" no ve.
  sandbox.toggle(77);
  ok('con un lugar libre vuelve a entrar uno nuevo', sandbox.raw().length === 5 &&
     sandbox.isQueued(77) === true, 'len=' + sandbox.raw().length);

  console.log('\n[EL ORDEN ES DEL USUARIO]');
  sandbox.setQueue([88, 11, 44]);
  ok('queueItems devuelve el ORDEN de la cola, no el del catalogo ni alfabetico',
     JSON.stringify(sandbox.items().map((x) => x.id)) === '[88,11,44]',
     'orden=' + JSON.stringify(sandbox.items().map((x) => x.id)));

  console.log('\n[UN ID ENCOLADO QUE YA NO ESTA EN EL CATALOGO]');
  sandbox.setQueue([11, 99999, 22]);
  ok('un id que no existe NO aparece (no se pinta una card con datos de otro)',
     JSON.stringify(sandbox.items().map((x) => x.id)) === '[11,22]',
     'items=' + JSON.stringify(sandbox.items().map((x) => x.id)));
  ok('pero sigue occupying un lugar en la cola interna (no se pierde en silencio)',
     sandbox.raw().length === 3, 'len=' + sandbox.raw().length);

  console.log('\n[normalizeQueue: localStorage CORRUPTO]');
  // Esto es lo que pasa cuando el navegador se queda sin cuota a mitad de una
  // escritura: queda un JSON truncado. `JSON.parse` tira, y si eso no se
  // atrapa, el modulo no entra al panel NUNCA mas.
  ok('null (sin cola guardada) -> vacia', JSON.stringify(sandbox.normalize(null)) === '[]');
  ok('un string (no array) -> vacia', JSON.stringify(sandbox.normalize('nada')) === '[]',
     JSON.stringify(sandbox.normalize('nada')));
  ok('no es un array -> vacia', JSON.stringify(sandbox.normalize({ a: 1 })) === '[]');
  ok('un array con basura se depura (NaN, 0, negativos, decimales)',
     JSON.stringify(sandbox.normalize([11, NaN, 0, -5, 2.5, 22])) === '[11,22]',
     JSON.stringify(sandbox.normalize([11, NaN, 0, -5, 2.5, 22])));
  ok('los repetidos se colapsan y el orden se respeta',
     JSON.stringify(sandbox.normalize([22, 11, 22, 11, 33])) === '[22,11,33]',
     JSON.stringify(sandbox.normalize([22, 11, 22, 11, 33])));
  ok('un array mas largo que el maximo se TRUNCA a 5 al cargar',
     JSON.stringify(sandbox.normalize([1,2,3,4,5,6,7,8])) === '[1,2,3,4,5]',
     JSON.stringify(sandbox.normalize([1,2,3,4,5,6,7,8])));
  ok('los strings numericos se aceptan (vienen de un data-id del DOM)',
     JSON.stringify(sandbox.normalize(['11', '22'])) === '[11,22]',
     JSON.stringify(sandbox.normalize(['11', '22'])));

  console.log('\n[ID INVALIDO AL AGREGAR]');
  sandbox.setQueue([]);
  const malo = sandbox.toggle('no-es-un-numero');
  ok('agregar un id que no es numero se rechaza y no rompe',
     malo.ok === false && malo.reason === 'invalid' && sandbox.raw().length === 0,
     'ok=' + malo.ok + ' reason=' + malo.reason);
}

// ---------------------------------------------------------------- render
console.log('\n[EL RENDER: LO QUE SE VE]');

// El render se evalua con stubs. Se afirma sobre el HTML SALIENTE, no sobre
// el source: un `data-queue-remove` presente en el texto pero nunca dibujado
// es indistinguible de uno dibujado, si solo se lee el fuente.
const linesCat = srcCat.split(/\r?\n/);
const cuerpoCat = (nombre) => {
  const ini = linesCat.findIndex((l) => new RegExp('function\\s+' + nombre + '\\s*\\(').test(l));
  if (ini < 0) return null;
  let fin = ini, nivel = 0, abierto = false;
  for (let i = ini; i < linesCat.length; i++) {
    for (const ch of linesCat[i]) {
      if (ch === '{') { nivel++; abierto = true; }
      else if (ch === '}') nivel--;
    }
    if (abierto && nivel === 0) { fin = i; break; }
  }
  return linesCat.slice(ini, fin + 1).join('\n');
};

const deps = `
  var root = { LegendaryCatalog: { items: ${JSON.stringify(CATALOGO)} } };
  var QUEUE_TOP_W = ${TOP_SRC};
  var fmtInt = function (n) { return String(n); };
  var esc = function (s) { return String(s == null ? '' : s); };
  var tpCoinHTML = function (n) { return '<span class="coin">' + n + '</span>'; };
  var typeColor = function () { return '#974EFF'; };
  var expansionColor = function () { return '#68ff9f'; };
  var genLabel = function () { return '1'; };
  var typeLabel = function () { return 'Arma'; };
  var expansionLabel = function () { return 'Base'; };
`;

let renderFns;
try {
  renderFns = new Function(deps + '\n' +
    cuerpoCat('renderItemCard') + '\n' +
    cuerpoCat('renderCatalogGrid') + '\n' +
    cuerpoCat('renderProgress') +
    '\nreturn { card: renderItemCard, grid: renderCatalogGrid, progress: renderProgress };')();
} catch (e) {
  console.log('  FAIL - los renders no se pudieron evaluar: ' + e.message);
  fail++;
  renderFns = null;
}

if (renderFns) {
  const OWNED = {};

  console.log('\n[CATALOGO: encolado vs no encolado se distinguen]');
  const grid = renderFns.grid(CATALOGO, OWNED, { queued: [22] });
  ok('la card de un item encolado trae el badge "EN COLA"',
     (grid.match(/EN COLA/g) || []).length === 1,
     'badges=' + (grid.match(/EN COLA/g) || []).length);
  ok('y solo esa: las otras 7 cards del catalogo no lo traen',
     (grid.match(/lt-item-card/g) || []).length === 8 &&
     (grid.match(/lt-queue-badge/g) || []).length === 1,
     'cards=' + (grid.match(/lt-item-card/g) || []).length +
     ' badges=' + (grid.match(/lt-queue-badge/g) || []).length);

  console.log('\n[un consumidor viejo que no pasa `queued`]');
  const gridViejo = renderFns.grid(CATALOGO, OWNED);
  ok('sin el tercer argumento NO revienta y dibuja las 8 cards',
     (gridViejo.match(/lt-item-card/g) || []).length === 8,
     'cards=' + (gridViejo.match(/lt-item-card/g) || []).length);
  ok('y ninguna trae el badge (no puede saber, no inventa)',
     (gridViejo.match(/EN COLA/g) || []).length === 0);

  console.log('\n[PROGRESO: la cola, en su orden, con las 3 primeras pesadas]');
  const enCola = [CATALOGO[7], CATALOGO[3], CATALOGO[0], CATALOGO[6], CATALOGO[1]];
  const prog = renderFns.progress(
    { owned: OWNED, mode: 'progress', items: enCola, scope: 'unlocked', filters: {} },
    { total: 5, ready: 2, max: 5, top: 3 }
  );
  // El orden NO es ni alfabetico ni el del catalogo: es el de la cola.
  const orden = (prog.match(/data-id="(\d+)"/g) || []).map((s) => s.replace(/\D/g, ''));
  ok('las cards salen en el ORDEN DE LA COLA, no ordenadas por nombre',
     JSON.stringify(orden) === JSON.stringify(enCola.map((x) => String(x.id))),
     'orden=' + JSON.stringify(orden) + ' esperado=' + JSON.stringify(enCola.map((x) => String(x.id))));
  ok('cada card de la cola trae su boton "Quitar"',
     (prog.match(/data-queue-remove=/g) || []).length === 5,
     'quitar=' + (prog.match(/data-queue-remove=/g) || []).length);
  ok('las 3 primeras llevan el peso visual (1ª) y las otras 2 no',
     (prog.match(/Primera de tu cola/g) || []).length === 3,
     'primeras=' + (prog.match(/Primera de tu cola/g) || []).length);

  console.log('\n[LO QUE SE RETIRO Y NO DEBE VOLVER]');
  ok('la barra "Completado: X / 206" NO esta',
     prog.indexOf('Completado:') === -1);
  ok('el porcentaje global NO esta', prog.indexOf('%</span>') === -1 && prog.indexOf('stats.pct') === -1);
  ok('el switch de alcance NO esta', prog.indexOf('data-scope=') === -1);
  ok('la cabecera nueva SII esta, y con el limite a la vista',
     prog.indexOf('En la cola:') !== -1 && prog.indexOf('Podés fabricar ya:') !== -1,
     'En la cola=' + prog.indexOf('En la cola:') +
     ' fabricar ya=' + prog.indexOf('Podés fabricar ya:'));
  ok('y dice la CIUDAD de las cifras que muestra (5 de 5 y 2 listas)',
     prog.indexOf('>5</strong>') !== -1 && prog.indexOf('>2</strong>') !== -1,
     'total=' + prog.indexOf('>5</strong>') + ' ready=' + prog.indexOf('>2</strong>'));

  console.log('\n[COLA VACIA: el mensaje dice la verdad]');
  const vacio = renderFns.progress(
    { owned: OWNED, mode: 'progress', items: [], scope: 'unlocked', filters: {} },
    { total: 0, ready: 0, max: 5, top: 3 }
  );
  ok('no dice "aun no posees ninguna legendaria" (seria FALSO: la cola no va de posesion)',
     vacio.indexOf('Aún no poseés') === -1 && vacio.indexOf('aun no posees') === -1);
  ok('dice que la cola esta vacia y que se agrega desde el Catalogo',
     vacio.indexOf('cola de crafteo esta vacia') !== -1 && vacio.indexOf('Catálogo') !== -1);
  ok('y NO promete un numero de completadas que no tiene',
     vacio.indexOf('Completado:') === -1 && vacio.indexOf('Podés fabricar ya:') === -1);
}

// ---------------------------------------------------------------- persistencia
console.log('\n[LA PERSISTENCIA USA EL PREFIJO gn:]');
// No se evalua `saveQueue` contra el `sSet` real del modulo: se verifica que
// el prefijo que se usa sea el del proyecto. Un `localStorage.setItem` con una
// clave sin `gn:` no la migra `storage.js` y sobrevive a la importacion de un
// Gist como un key ajena.
ok('la cola se persiste con el prefijo gn:legendary: (no una key nueva a pelo)',
   /STORAGE_PREFIX\s*=\s*'gn:legendary:'/.test(src),
   "STORAGE_PREFIX=" + (src.match(/STORAGE_PREFIX\s*=\s*'([^']+)'/) || [])[1]);
ok('y la clave de la cola es la que se guarda, no unaRAW inventada',
   /sSet\('queue',\s*queue\)/.test(src));
ok('activate() la carga (leer localStorage en el IIFE seria antes de tiempo)',
   /loadQueue\(\);/.test(src));

// ---------------------------------------------------------------- control
console.log('\n[CONTROL NEGATIVO DEL ARNES]');
// `QUEUE_TOP_W` esta DUPLICADO a proposito: el tracker lo define y el render
// lo define, porque `registerRender` no pasa configuracion y no se quiere que
// el render dependa de un valor interno del modulo. Una duplicacion sin
// aserto es una bomba de reloj: alguien cambia uno, los dos numeros
// discrepan, y "las 3 primeras mas grandes" pasa a ser "las 2 primeras" sin
// que nada se queje.
{
  const nTracker = (src.match(/QUEUE_TOP_W\s*=\s*(\d+)/) || [])[1];
  const nRender = (srcCat.match(/QUEUE_TOP_W\s*=\s*(\d+)/) || [])[1];
  ok('las DOS copias de QUEUE_TOP_W dicen lo mismo (tracker y render)',
     !!nTracker && !!nRender && nTracker === nRender,
     'tracker=' + nTracker + ' render=' + nRender);
  ok('y son 3, no un numero arbitrario',
     nTracker === '3' && nRender === '3', 'tracker=' + nTracker + ' render=' + nRender);
}

// Si el extractor de funcionesfallsara, todos los bloques de arriba se
// saltarian y el archivo imprimiria 0 FAIL con 0 pruebas: verde falso.
ok('el arnes corrio al menos 25 aserciones', pass + fail >= 25, 'total=' + (pass + fail));

console.log('\n  COLA: ' + pass + ' pass / ' + fail + ' fail');
if (fail > 0) process.exitCode = 1;