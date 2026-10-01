/**
 * hb98-wv-shop-view.test.js — las 2 escrituras a pelo de wv-shop-ui.js congelaban
 * las claves gn: de la Tienda del Wizard's Vault.
 *
 * Que se mide: el ciclo REAL de Pablo con el storage.js REAL y los handlers REALES
 * de wv-shop-ui.js (se extraen del archivo y se ejecutan, no se modelan).
 *
 * Por que no alcanza con grep: que el codigo diga `Storage.set` no garantiza que
 * la gn: se lea de vuelta al arrancar. El defecto era de CICLO DE VIDA: la gn:
 * nace de la legacy en el arranque 1, la migracion no la vuelve a tocar, y por eso
 * una escritura a la legacy se pierde al reiniciar. Un grep daria "OK" con el bug
 * puesto.
 *
 * Alcance MEDIDO (no supuesto): son 2 claves, no 1. El PO reporto solo
 * gn:wv:shop:view; gn:wv:shop:legacy_filter tiene la misma forma exacta
 * (wv-shop-ui.js escribe 'gw2_wv_legacy_filter_v1' a pelo, y router.js:262 lo
 * lee con Storage.get sobre la gn:).
 *
 * Que NO hace: no toca el producto. Solo ejecuta lo que ya esta escrito.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

let pass = 0, fail = 0;
const t = (nombre, cond, detalle) => {
  if (cond) { pass++; console.log('  ok   ' + nombre); }
  else { fail++; console.log('  FAIL ' + nombre + (detalle ? '  -> ' + detalle : '')); }
};

// ---------- Entorno minimo: localStorage en memoria + Storage REAL ----------
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: (k) => { mem.delete(k); },
  clear: () => mem.clear(),
};
globalThis.window = globalThis;
globalThis.document = { readyState: 'complete', addEventListener: () => {} };

const Storage = new Function(leer('js/storage.js') + '\nreturn Storage;')();
globalThis.Storage = Storage;

const shopSrc = leer('js/wv-shop-ui.js');

function mkEl() {
  const L = {};
  return {
    value: '', textContent: '', __wired: false,
    addEventListener(ev, fn) { (L[ev] = L[ev] || []).push(fn); },
    click() { (L.click || []).forEach(f => f()); },
    change() { (L.change || []).forEach(f => f()); },
  };
}
function sacarHandler(re, que) {
  const m = shopSrc.match(re);
  if (!m) throw new Error('no se encontro el handler de ' + que);
  return m[0];
}

console.log('\n== [1] No quedan escrituras a pelo de las claves de la Tienda WV ==');
// La forma del bug: el modulo escribe la LEGACY cuando el resto de la app
// escribe la gn:. Se busca el sintoma, no el nombre de la constante.
const aPelo = shopSrc.match(/localStorage\.setItem\(\s*'gw2_wv_[a-z_]+_v1'/g) || [];
t('wv-shop-ui.js no escribe ninguna legacy de la Tienda a pelo', aPelo.length === 0,
  aPelo.length ? 'quedan: ' + aPelo.join(', ') : '');

console.log('\n== [2] Ciclo real de gn:wv:shop:view (boton "Vista") ==');
{
  mem.clear();
  Storage.init();
  localStorage.setItem('gw2_wv_view_v1', 'cards');
  Storage.init();
  t('la gn: nace desde la legacy en el arranque 1', Storage.get('gn:wv:shop:view') === 'cards',
    'vale ' + Storage.get('gn:wv:shop:view'));

  const st = { view: 'cards', legacyFilter: 'show' };
  const v = mkEl();
  const cuerpo = sacarHandler(/if \(v\) v\.addEventListener\('click', function \(\) \{[\s\S]*?\n    \}\);/, 'wvShopToggleView');
  new Function('v', 'st', 'WVShopUI', 'localStorage', 'Storage', cuerpo + '; v.click();')(
    v, st, { render() {} }, localStorage, Storage);

  t('el estado en sesion cambia', st.view === 'table', 'vale ' + st.view);

  Storage._resyncMirrors();
  Storage.init();
  t('ARRANQUE 2 respeta la eleccion (el bug la dejaba congelada en cards)',
    Storage.get('gn:wv:shop:view') === 'table', 'vale ' + Storage.get('gn:wv:shop:view'));
}

console.log('\n== [3] Ciclo real de gn:wv:shop:legacy_filter (select "Recompensas Legado") ==');
{
  mem.clear();
  Storage.init();
  localStorage.setItem('gw2_wv_legacy_filter_v1', 'show');
  Storage.init();
  t('la gn: nace desde la legacy en el arranque 1', Storage.get('gn:wv:shop:legacy_filter') === 'show',
    'vale ' + Storage.get('gn:wv:shop:legacy_filter'));

  const st = { view: 'cards', legacyFilter: 'show' };
  const lf = mkEl();
  lf.value = 'hide';
  const cuerpo = sacarHandler(/if \(lf\) lf\.addEventListener\('change', function \(\) \{[\s\S]*?\n    \}\);/, 'wvLegacyFilter');
  new Function('lf', 'st', 'WVShopUI', 'localStorage', 'Storage', cuerpo + '; lf.change();')(
    lf, st, { render() {} }, localStorage, Storage);

  t('el estado en sesion cambia', st.legacyFilter === 'hide', 'vale ' + st.legacyFilter);

  Storage._resyncMirrors();
  Storage.init();
  t('ARRANQUE 2 respeta la eleccion (el bug la dejaba congelada en show)',
    Storage.get('gn:wv:shop:legacy_filter') === 'hide', 'vale ' + Storage.get('gn:wv:shop:legacy_filter'));
}

console.log('\n== [4] CONTROL: el escritor correcto tiene que pasar ==');
{
  mem.clear();
  Storage.init();
  Storage.set('gn:wv:shop:view', 'cards');
  Storage.set('gn:wv:shop:view', 'table');
  t('Storage.set escribe la gn: y sobrevive al arranque',
    Storage.get('gn:wv:shop:view') === 'table', 'vale ' + Storage.get('gn:wv:shop:view'));
}
console.log('  (sin este control, un arnes que dijera "CONGELADA" siempre passes igual)');

console.log('\n== [5] La copia de router.js sigue siendo alcanzable o no ==');
// No se afirma que sea codigo muerto: se afirma lo medido, que saveView y
// saveLegacyFilter tienen UN solo caller cada una, los dos dentro del bloque
// que renderShopArea/ensureLoadTab cortan cuando WVShopUI existe.
const routerSrc = leer('js/router.js');
const callers = (re) => (routerSrc.match(re) || []).length;
t('saveView tiene 1 solo caller', callers(/saveView\(/g) === 2, // definicion + 1 uso
  'cuenta ' + callers(/saveView\(/g));
t('saveLegacyFilter tiene 1 solo caller', callers(/saveLegacyFilter\(/g) === 2,
  'cuenta ' + callers(/saveLegacyFilter\(/g));
t('las 2 escrituras pasan por Storage.set, no por localStorage crudo',
  /Storage\.set\(Storage\.STORAGE_KEYS\.WV_SHOP_VIEW/.test(shopSrc)
  && /Storage\.set\(Storage\.STORAGE_KEYS\.WV_SHOP_LEGACY_FILTER/.test(shopSrc));

console.log('\n' + pass + ' pass, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
