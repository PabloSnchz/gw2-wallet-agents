/**
 * Test del fix de fuga de AbortController en inventory-dashboard.js.
 *
 * Contexto: loadActiveCharacterInventory() creaba dos AbortController (c1, c2)
 * con un setTimeout que los abortaba, pero el `finally` solo hacia clearTimeout.
 * Eso cancelaba el unico mecanismo de abort: los fetch quedaban vivos hasta que
 * la API respondiera, y en un cambio de clave el pipeline viejo podia pintar
 * sobre el nuevo.
 *
 * Estos asserts cargan el archivo REAL y leen el codigo fuente. Corren en rojo
 * contra la version previa al fix (ver commit del fix).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'inventory-dashboard.js'),
  'utf8'
);

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ok  ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + ' -> ' + e.message); }
}

console.log('inventory-dashboard: fuga de AbortController');

t('loadActiveCharacterInventory existe', function() {
  assert.ok(SRC.indexOf('async function loadActiveCharacterInventory') !== -1,
    'no se encontro loadActiveCharacterInventory');
});

t('el finally de c2 llama clearTimeout Y c2.abort()', function() {
  // El bloque finally que cierra la segunda fase (inventario del personaje).
  const idx = SRC.indexOf('clearTimeout(t2);');
  assert.ok(idx !== -1, 'no se encontro clearTimeout(t2)');
  const after = SRC.slice(idx, idx + 80);
  assert.ok(after.indexOf('c2.abort()') !== -1,
    'clearTimeout(t2) no va seguido de c2.abort(): el controller sobrevive al clearTimeout');
});

t('el finally de c1 llama clearTimeout Y c1.abort()', function() {
  const idx = SRC.indexOf('clearTimeout(t1);');
  assert.ok(idx !== -1, 'no se encontro clearTimeout(t1)');
  const after = SRC.slice(idx, idx + 80);
  assert.ok(after.indexOf('c1.abort()') !== -1,
    'clearTimeout(t1) no va seguido de c1.abort(): el controller sobrevive al clearTimeout');
});

t('el abort explicito esta DENTRO del finally, no antes', function() {
  // Si alguien "arregla" poniendo c1.abort() antes del return, el try ya
  // devuelve datos y el abort llega tarde o nunca.tiene que ir en el finally.
  const idx = SRC.indexOf('clearTimeout(t1);');
  const before = SRC.slice(Math.max(0, idx - 400), idx);
  assert.ok(before.indexOf('c1.abort();') === -1,
    'c1.abort() aparece antes del clearTimeout: el fetch se cancela antes de consumir la respuesta');
});

t('c2 tambien se aborta (el de 15s, no solo el de 4s)', function() {
  const aborts = SRC.match(/\bc[12]\.abort\(\);/g) || [];
  assert.ok(aborts.length >= 2,
    'se esperaban al menos 2 abort() explicitos, hay ' + aborts.length);
});

console.log('\n' + (pass + fail) + ' aserciones, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
