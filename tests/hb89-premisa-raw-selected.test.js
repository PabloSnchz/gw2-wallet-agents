/* HB#89 - medicion de la premisa de la fila 079.
 *
 * La fila 079 del COMMS_LOG dice que el raw `localStorage.getItem('gw2_selected_key_v1')`
 * de `raid-tracker.js:921` (y el de 3 modulos mas) "rompe en escenario Gist-nuevo",
 * y por eso quedo pendiente. Este test NO arregla nada: mide si el escenario puede
 * ocurrir, porque varias premisas de este equipo resultaron falsas y la regla del
 * proyecto es medir antes de tocar la capa de datos (ALERT-48).
 *
 * HALLAZGO: la premisa es FALSA por el motivo que el propio storage.js declara.
 *
 * La UNICA forma de que el raw difiera de `Storage.getRaw` es este estado:
 *     gn:account:selected  POBLADA
 *     gw2_selected_key_v1  AUSENTE
 * porque `getRaw` lee el espejo primero y, si no esta, cae a la gn:.
 *
 * Y ese estado NO lo produce el codigo, por TRES razones medidas aca:
 *   1. `Storage.set` escribe la gn: Y la legacy (espejo).
 *   2. `Storage.remove` borra la gn: Y la legacy.
 *   3. `MIGRATION_MODE = 'copy'`: `_migrateOne` NO borra la legacy al migrar.
 *      En 'move' SI la borraria, y ahi el estado peligroso pasaria a ser el
 *      NORMAL de toda clave migrada. Por eso el modo esta medido y no supuesto.
 *
 * El escenario "Gist-nuevo" que nombra la 079 no separa el par: el import real
 * (`settings-manager.js:258`) entra por `Storage.set`, que escribe las dos.
 *
 * O sea: el raw de los 4 modulos es un RIESGO LATENTE, no un bug. Este test
 * queda como la guardia que dice que sigue siendo cierto: si alguien sube
 * MIGRATION_MODE a 'move', o escribe una gn: a pelo, la seccion 4 y la 7 dan FAIL.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..');
const DIR_JS = path.join(RAIZ, 'js');
let ok = 0, fail = 0;
function ok_(cond, msg, extra) {
  if (cond) { ok++; console.log('  ok  ' + msg); }
  else { fail++; console.log('  FAIL ' + msg + (extra ? '  <<' + extra + '>>' : '')); }
}

function cargarStorage(store) {
  const src = fs.readFileSync(path.join(DIR_JS, 'storage.js'), 'utf8');
  const ctx = {
    localStorage: store,
    console: { log(){}, warn(){}, error(){}, info(){}, debug(){} },
    document: { readyState: 'loading', addEventListener(){} },
    JSON, Object, Array, Math, Date, Number, String, Boolean, RegExp, isFinite, parseInt, parseFloat,
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: 'storage.js' });
  return ctx;
}

function mkStore(seed) {
  const m = Object.assign({}, seed || {});
  return {
    _m: m,
    get length() { return Object.keys(this._m).length; },
    key(i) { return Object.keys(this._m)[i] || null; },
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; },
    setItem(k, v) { this._m[k] = String(v); },
    removeItem(k) { delete this._m[k]; },
    clear() { for (const k of Object.keys(this._m)) delete this._m[k]; },
  };
}

const SRC = fs.readFileSync(path.join(DIR_JS, 'storage.js'), 'utf8');
const GN = 'gn:account:selected';
const LEG = 'gw2_selected_key_v1';
const separados = (st) => st.getItem(GN) !== null && st.getItem(LEG) === null;

console.log('\n=== 1. MIRROR_MAP: la gn: ES una clave espejo (medido) ===');
{
  const m = SRC.match(/MIRROR_MAP\s*=\s*\{([^}]*)\}/);
  ok_(!!m, 'MIRROR_MAP es legible por regex');
  ok_(m && m[1].indexOf("'" + GN + "'") !== -1,
       'gn:account:selected esta en MIRROR_MAP: el par se escribe y se borra junto');
}

console.log('\n=== 2. Los caminos de escritura y borrado de la capa mantienen el par ===');
{
  const set = (ctx, v) => ctx.Storage.set(ctx.Storage.STORAGE_KEYS.ACCOUNT_SELECTED, v);
  const rm  = (ctx)    => ctx.Storage.remove(ctx.Storage.STORAGE_KEYS.ACCOUNT_SELECTED);

  let st = mkStore(); let ctx = cargarStorage(st); set(ctx, 'X');
  ok_(!separados(st), 'set() no separa el par', 'gn=' + st.getItem(GN) + ' leg=' + st.getItem(LEG));

  st = mkStore(); ctx = cargarStorage(st); set(ctx, 'X'); rm(ctx);
  ok_(!separados(st), 'remove() no separa el par', 'gn=' + st.getItem(GN) + ' leg=' + st.getItem(LEG));
}

console.log('\n=== 3. MIGRATION_MODE: en `copy` la legacy NO se borra ===');
{
  const m = SRC.match(/MIGRATION_MODE\s*=\s*'([a-z]+)'/);
  ok_(!!m, 'MIGRATION_MODE es legible (medido, no supuesto): ' + (m && m[1]));
  ok_(m && m[1] === 'copy',
       'el modo es `copy`: migrar NO borra la legacy, o sea el par no se separa nunca');
  // Y el codigo del borrado esta wirklich behind esa condicion:
  ok_(/MIGRATION_MODE\s*===\s*'move'[\s\S]{0,200}removeItem\(oldKey\)/.test(SRC),
       'el unico removeItem(oldKey) de la migracion esta condicionado a `move`');

  // Comportamiento: sembrar solo la legacy, correr migrate(), y ver las dos.
  const st = mkStore({ [LEG]: 'VIEJA-INSTALACION' });
  const ctx = cargarStorage(st);
  try { ctx.Storage.migrate(); } catch (e) { ok_(false, 'migrate() no tira', e.message); }
  ok_(st.getItem(LEG) === 'VIEJA-INSTALACION',
       'tras migrate() la legacy SIGUE (no fue movida)');
  ok_(st.getItem(GN) === 'VIEJA-INSTALACION',
       'y la gn: se creo con el mismo valor: el par quedo UNIDO');
  ok_(!separados(st), 'migrate() no produce el estado peligroso');
}

console.log('\n=== 4. El escenario "Gist-nuevo" que la fila 079 nombra ===');
{
  // El import real: settings-manager.js:258 -> Storage.set, que escribe las dos.
  const st = mkStore();
  const ctx = cargarStorage(st);
  ctx.Storage.set(ctx.Storage.STORAGE_KEYS.ACCOUNT_SELECTED, 'KEY-IMPORTADA');
  ok_(st.getItem(GN) === 'KEY-IMPORTADA', 'el import escribe la gn:');
  ok_(st.getItem(LEG) === 'KEY-IMPORTADA',
       'y TAMBIEN la legacy: Gist-nuevo NO deja la gn: huerfana (esta es la premisa de la 079)');
  ok_(st.getItem(LEG) !== null, 'por lo tanto ahi el raw NO puede devolver null');
}

console.log('\n=== 5. `_resyncMirrors` NO sana una gn: sola, y es POR DISENO ===');
{
  // Este caso NO es un FAIL del codigo: el propio storage.js lo declara legitimo
  // ("Una gn: sola puede ser legitima... borrarla seria perder el dato").
  // Lo que se afirma aca es el RIESGO, sostenido a mano, para que quede escrito.
  const st = mkStore({ [GN]: 'HUERFANA' });
  const ctx = cargarStorage(st);
  ctx.Storage._resyncMirrors();
  ok_(separados(st),
       'una gn: sola SOBREVIVE al resync (por diseno): ese es el estado en que divergen',
       'gn=' + st.getItem(GN) + ' leg=' + st.getItem(LEG));

  const crudo = st.getItem(LEG);
  const porCapa = ctx.Storage.getRaw(ctx.Storage.STORAGE_KEYS.ACCOUNT_SELECTED, null);
  ok_(crudo === null && porCapa === 'HUERFANA',
       'SI ese estado existiera: el raw devuelve null y la capa el valor. Ahi si divergen',
       'crudo=' + crudo + ' capa=' + porCapa);
}

console.log('\n=== 6. Cuando el par esta sano, raw y capa coinciden ===');
{
  const st = mkStore();
  const ctx = cargarStorage(st);
  ctx.Storage.set(ctx.Storage.STORAGE_KEYS.ACCOUNT_SELECTED, 'SELECCIONADA');
  const crudo = st.getItem(LEG);
  const porCapa = ctx.Storage.getRaw(ctx.Storage.STORAGE_KEYS.ACCOUNT_SELECTED, null);
  ok_(crudo === porCapa,
       'los 3 getSelectedToken() y la capa devuelven lo mismo: hoy no hay bug',
       'crudo=' + crudo + ' capa=' + porCapa);
}

console.log('\n=== 7. La guardia: nada puede SEPARAR el par por la vuelta de atras ===');
{
  // (a) Nadie escribe una gn: a pelo.
  const files = fs.readdirSync(DIR_JS).filter(f => f.endsWith('.js'));
  const EEPROM = [];
  for (const f of files) {
    const t = fs.readFileSync(path.join(DIR_JS, f), 'utf8');
    if (/localStorage\.setItem\(\s*['"]gn:/.test(t)) EEPROM.push(f);
  }
  ok_(EEPROM.length === 0,
       'ningun modulo de produccion escribe una gn: a pelo',
       'culpables: ' + (EEPROM.join(', ') || '(ninguno)') + '  (barridos ' + files.length + ')');

  // (b) Nadie borra la LEGACY a pelo. Este es el camino inverso, y es el que
  //     separaria el par dejando la gn: poblada: exactamente el caso 5.
  const BORRADOR = [];
  for (const f of files) {
    const t = fs.readFileSync(path.join(DIR_JS, f), 'utf8');
    const limpio = t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/localStorage\.removeItem\(\s*['"]gw2_selected_key_v1/.test(limpio)) BORRADOR.push(f);
  }
  ok_(BORRADOR.length === 0,
       'ningun modulo borra la legacy a pelo: ese seria el unico camino que separa el par',
       'borradores: ' + (BORRADOR.join(', ') || '(ninguno)'));
}

// La linea de resumen tiene que llevar una de las 4 FORMAS que el runner
// parsea (tools/run-suite.js:28-35), no una quinta. `ok` en vez de `pass` y la
// barra sin la palabra `FAIL` hacen que el archivo cuente como exit 0 pero el
// total de la suite lo reporte como "sin resumen", y el alcance queda parcial.
// Mismo modo de falla que ALERT-109: el test pasa y no suma.
console.log('\n' + (fail === 0 ? 'OK   ' : 'FALLOS ') + ok + ' pass / ' + fail + ' FAIL');
process.exit(fail === 0 ? 0 : 1);
