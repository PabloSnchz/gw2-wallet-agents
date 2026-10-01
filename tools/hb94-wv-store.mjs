// hb94-wv-store.mjs - ejecuta storage.js REAL y demuestra la congelacion de
// gn:wv:shop:view cuando un modulo escribe la legacy a pelo.
// Control: gn:account:selected, que SI esta en MIRROR_MAP, con el mismo escritor crudo.
import { readFileSync } from 'node:fs';

const RAIZ = process.argv[2] || '.';
const src = readFileSync(RAIZ + '/js/storage.js', 'utf8');

// localStorage minimo, en memoria
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: (k) => { mem.delete(k); },
  clear: () => mem.clear(),
};
globalThis.window = globalThis;
// stub minimo de DOM: storage.js se auto-inicializa en document.readyState
globalThis.document = { readyState: 'complete', addEventListener: () => {} };

// ejecutar el IIFE de storage.js y exponer Storage
const mod = new Function(src + '\nreturn Storage;');
const Storage = mod();
globalThis.Storage = Storage;

// El arranque que hace la app: init/migrate + resync
Storage.init();

const caso = (label, gnKey, legacyKey) => {
  mem.clear();

  // --- ciclo real de Pablo ---
  // arranque 1: existe una legacy con la PRIMERA eleccion -> la migracion crea
  // la gn: con esa foto. (Si no hay legacy, la gn: no nace y el caso no
  // reproduce nada: por eso el arranque 1 tiene que escribir una legacy.)
  localStorage.setItem(legacyKey, 'cards');
  Storage.init();
  const a1 = Storage.get(gnKey);

  // Pablo cambia el selector -> el modulo escribe la LEGACY a pelo (wv-shop-ui.js:222)
  localStorage.setItem(legacyKey, 'table');

  // arranque 2: la gn: YA existe -> hasRaw -> la migracion no la vuelve a tocar.
  Storage._resyncMirrors();
  Storage.init();
  const a2 = Storage.get(gnKey);

  console.log(`\n${label}`);
  console.log(`  arranque 1: gn: = ${a1}   (creada por migracion desde legacy='cards')`);
  console.log(`  Pablo elige 'table' -> se escribe la legacy a pelo`);
  console.log(`  arranque 2: gn: = ${a2}   ${a2 === 'table' ? 'OK (respeta)' : '<-- CONGELADA en la foto del arranque 1'}`);
  console.log(`  localStorage: gn: = ${localStorage.getItem(gnKey)}, legacy = ${localStorage.getItem(legacyKey)}`);
  return a2 === 'table';
};

console.log('=== CASO REAL: gn:wv:shop:view (lo que ve Pablo en la tienda del WV) ===');
const wv = caso('gn:wv:shop:view', 'gn:wv:shop:view', 'gw2_wv_view_v1');

console.log('\n=== CONTROL: gn:account:selected (SI esta en MIRROR_MAP, mismo escritor crudo) ===');
const ctl = caso('gn:account:selected', 'gn:account:selected', 'gw2_selected_key_v1');

console.log('\n=== VEREDICTO ===');
console.log('  el caso real respeta la eleccion del usuario : ' + (wv ? 'SI' : 'NO  <-- bug'));
console.log('  el control respeta la eleccion del usuario  : ' + (ctl ? 'SI' : 'NO'));
console.log('  el arnes discrimina                         : ' + (wv !== ctl ? 'SI' : 'NO (no sirve)'));
process.exit(wv || !ctl ? 0 : 1);
