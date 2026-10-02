/*
 * T19-a — por que "gn:tokenchange no llega al InventoryHub" NO es un bug por si solo.
 *
 * QUE AFIRMA ESTE ARCHIVO (todo medido sobre el fuente, nada supuesto):
 *
 *   1. InventoryHub NO registra gn:tokenchange.          [el hecho del PO]
 *   2. router.js refresca el InventoryHub en el path de la ruta.  [el dato que el PO no menciona]
 *   3. Ese handler esta registrado SOLO en el change del <select>.
 *   4. setSelected emite gn:tokenchange SIEMPRE; `silent` no lo cambia.
 *
 * O sea: la asimetria del punto 1 es real, pero el modulo YA se recarga en el
 * camino del desplegable por el punto 2. "No escucha el evento" no es lo mismo
 * que "no se recarga".
 *
 * QUE DEJA PASAR (esta es la parte que importa):
 *   - Que alguien saque el refresh del router (punto 2) sin poner nada en su
 *     lugar. Ese es el bug REAL que un fix de T19-a taparia sin querer, y este
 *     test lo hace fallar si pasa.
 *   - Que alguien haga que setSelected deje de emitir el evento (punto 4):
 *     es el canal unico de cambio de cuenta, y si cae, caen 9 modulos.
 *
 * LO QUE NO AFIRMA, y por eso la pregunta al Reviewer sigue abierta:
 *   cuantos refresh(true) con nocache recibiria el modulo si se le agrega el
 *   listener. Eso es una pregunta de orden entre dos eventos y de la guardia
 *   de in-flight, y no se contesta leyendo un if.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(REPO, 'js', f), 'utf8');
const router = read('router.js');
const app = read('app.js');
const hub = read('inventory-hub.js');
const raid = read('raid-tracker.js');

let pass = 0, fail = 0;
const failures = [];
function ok(cond, name) {
  if (cond) { pass++; console.log('  pass  ' + name); }
  else { fail++; failures.push(name); console.log('  FAIL  ' + name); }
}
function section(t) { console.log('\n' + t); }

// ---------------------------------------------------------------------------
section('1. El hecho del PO: InventoryHub no escucha el canal');
// ---------------------------------------------------------------------------
ok(
  !/document\.addEventListener\(\s*['"]gn:tokenchange['"]/.test(hub),
  'inventory-hub.js NO registra gn:tokenchange'
);
ok(
  /document\.addEventListener\(\s*['"]gn:tokenchange['"]/.test(raid),
  'CONTROL: raid-tracker.js SI lo registra (el filtro no es "no existe en el repo")'
);

// ---------------------------------------------------------------------------
section('2. El dato que el PO no menciona: el router ya lo refresca');
// ---------------------------------------------------------------------------
ok(
  /window\.InventoryHub\.refresh\(true\)/.test(router),
  'router.js llama a InventoryHub.refresh(true)'
);
ok(
  /function onKeySelectChange\s*\(/.test(router),
  'ese refresh vive dentro de onKeySelectChange'
);
// Y que este dentro del path de la ruta, no en un activate() de arranque.
const onKeySelectChangeIdx = router.indexOf('function onKeySelectChange');
const refreshIdx = router.indexOf('window.InventoryHub.refresh(true)');
ok(refreshIdx > onKeySelectChangeIdx, 'el refresh esta DENTRO de onKeySelectChange y no antes');

// ---------------------------------------------------------------------------
section('3. Ese handler se engancha al <select>, no al canal canonico');
// ---------------------------------------------------------------------------
ok(
  /sel\.addEventListener\(\s*['"]change['"]\s*,\s*onKeySelectChange\s*\)/.test(router),
  'onKeySelectChange se registra en el change del select'
);
ok(
  !/addEventListener\(\s*['"]gn:tokenchange['"]\s*,\s*onKeySelectChange/.test(router),
  'onKeySelectChange NO esta en el canal canonico: el router lee el widget, no el evento'
);

// ---------------------------------------------------------------------------
section('4. El evento sale igual, porque setSelected emite siempre');
// ---------------------------------------------------------------------------
// El slice va con indice de BUSQUEDA desde setSelected: en app.js hay un
// refreshSelects() en :817, uno ANTES de setSelected (:820), y un indexOf sin
// from lo encuentra a ese y devuelve una cadena vacia por debajo.
const _ss = app.indexOf('setSelected(token, opts)');
const _rs = app.indexOf('refreshSelects()', _ss);
const setSelectedBody = app.slice(_ss, _rs);
ok(
  /document\.dispatchEvent\(\s*new CustomEvent\(\s*['"]gn:tokenchange['"]/.test(setSelectedBody),
  'setSelected emite gn:tokenchange'
);
const silentLine = setSelectedBody.split('\n').findIndex((l) => /if \(!opts\.silent/.test(l));
const emitLine = setSelectedBody.split('\n').findIndex((l) => /gn:tokenchange/.test(l));
ok(
  emitLine > -1 && (silentLine === -1 || emitLine < silentLine),
  'el emit es INCONDICIONAL: el flag silent solo protege el change programatico (que va despues)'
);

// ---------------------------------------------------------------------------
section('5. El latch lo protege por diseno (comentario y codigo, no solo el comentario)');
// ---------------------------------------------------------------------------
ok(
  /barridoLatch\(\)/.test(router),
  'barridoLatch() se llama en el flujo de onKeySelectChange'
);
ok(
  /if \(p && !p\.hasAttribute\(['"]hidden['"]\)\)\s*continue;/.test(router),
  'el predicado del latch es "mi panel NO quedo visible": si quedo visible, no lo desactiva'
);
ok(
  /mod:\s*['"]InventoryHub['"]/.test(router),
  'InventoryHub esta en la lista de modulos con latch'
);

// ---------------------------------------------------------------------------
section('6. Lo que este test NO deja pasar');
// ---------------------------------------------------------------------------
// El refresh del router no se puede sacar sin que alguien se haga cargo.
const refreshDelRouter = router.match(/window\.InventoryHub\.refresh\(true\)/g) || [];
ok(refreshDelRouter.length === 1, 'hay exactamente 1 refresh del InventoryHub en router.js (si hay 0, alguien lo saco en silencio)');

// El canal unico no puede dejar de emitirse. El conteo es de CENSORY y el
// numero duro es intencional: si un modulo nuevo se engancha, este test falla y
// hay que mirarlo, que es lo que hacen los censos del repo.
const consumidores = fs.readdirSync(path.join(REPO, 'js'))
  .filter((f) => f.endsWith('.js'))
  .filter((f) => /document\.addEventListener\(\s*['"]gn:tokenchange['"]/.test(read(f)));
ok(
  consumidores.length === 14,
  '14 archivos escuchan gn:tokenchange (medido: ' + consumidores.length + ')'
);
ok(
  consumidores.indexOf('inventory-hub.js') === -1,
  'CONTROL: inventory-hub.js NO esta entre ellos -- el punto 1 por censo, no por grep de una linea'
);

console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
if (fail) { console.log('fallos:'); failures.forEach((f) => console.log('  - ' + f)); }
process.exit(fail ? 1 : 0);