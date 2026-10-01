/* =======================================================================
 * tests/hb105-perms-persistidos.test.js  —  commit 1 de la puerta: los
 * permisos quedan PERSISTIDOS con la key.
 *
 * Que resuelve y por que NO alcanza con la puerta de `addOrUpdate`:
 *   La puerta vive en `addOrUpdate` (app.js:872-878) y exige los 7
 *   permisos que la app USA. Pero la lista de cuentas la escriben 3 sitios
 *   mas, y los 2 de `settings-manager.js` (importApiKeys, :247-260) la
 *   escriben SIN pasar por la puerta: un backup con una key de 2 permisos se
 *   guarda sin error y sin mensaje. Medido: la puerta esta en `addOrUpdate`
 *   y en ningun otro lugar.
 *
 *   Por eso la puerta no se puede resolver "en el predicado": la predicado
 *   necesita `info.permissions`, que solo existe DESPUES de una llamada de
 *   red, y el punto de escritura no la tiene. Lo que hace falta para que la
 *   comprobacion de un backup restaurado sea OFFLINE y determinista es que
 *   la key guardada lleve consigo lo que se verifico. Eso es este commit, y
 *   es solo el primero de dos: el segundo mueve `importApiKeys` a `save()`.
 *
 *   Regla de compatibilidad que este commit respeta: `perms` AUSENTE =
 *   desconocido, NO malo. Las keys ya guardadas y los backups viejos no
 *   tienen el campo y tienen que seguir funcionando.
 *
 * Alcance de los asserts: se extrae el cuerpo del `this.save(fresh => ...)`
 * TAL COMO ESTA ESCRITO en el fuente y se EVALUA contra una lista falsa.
 * No se reimplementa la logica: si el fuente cambia de forma, el test mide
 * la forma nueva. No levanta DOM ni el IIFE de app.js.
 *
 * CONTROL NEGATIVO DENTRO DEL TEST: la ultima seccion mete el bug de vuelta
 * en una COPIA del texto y exige que las aserciones fallen. Un control que
 * no falla es un control que no mide, y es la unica forma de saber que el
 * "0 FAIL" de arriba es informacion y no un arnes roto.
 * ======================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const appPath = path.join(REPO, 'js/app.js');

/* ── extraccion ──────────────────────────────────────────────────────────
 * Devuelve el cuerpo del callback `fresh => { ... }` del `this.save(...)`
 * que hay DENTRO de `addOrUpdate`, balanceando llaves. Si no lo encuentra
 * devuelve null y el test falla con un mensaje que lo dice, en vez de
 * seguir con un cuerpo vacio que "pasa" de mentira. */
function extractSaveBody(src) {
  const a = src.indexOf('async addOrUpdate(');
  if (a < 0) return { err: 'no se encontro `async addOrUpdate(' };
  const b = src.indexOf('this.save(fresh => {', a);
  if (b < 0) return { err: 'addOrUpdate no llama a `this.save(fresh => ...)`' };
  const open = src.indexOf('{', b + 'this.save(fresh => '.length);
  let depth = 0, i = open;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  if (depth !== 0) return { err: 'llaves sin cerrar en el callback de save()' };
  return { body: src.slice(open + 1, i) };
}

const REQUIRED = ['account', 'wallet', 'characters', 'progression', 'inventories', 'unlocks', 'tradingpost'];

/* ── las comprobaciones, como funcion del TEXTO ─────────────────────────
 * Se parametriza por el fuente para que el control negativo pueda correr
 * exactamente el mismo codigo sobre una copia mutada. */
function check(src) {
  const R = [];
  const ok = (c, label, extra) => R.push({ pass: !!c, label, extra });

  const ex = extractSaveBody(src);
  if (ex.err) { ok(false, 'extraccion del callback de save()', ex.err); return R; }

  let body = ex.body;
  let fn = null;
  try {
    // El cuerpo real usa `label`, `value` y `permsReales` del scope de
    // `addOrUpdate`. Se los pasamos como parametros, que es exactamente lo
    // que el codigo real tiene en alcance.
    fn = new Function('fresh', 'label', 'value', 'permsReales', body);
  } catch (e) {
    ok(false, 'el cuerpo de save() se puede evaluar', e.message);
    return R;
  }

  // Lo que devuelve /v2/tokeninfo para una key bien formada: los 7 que la
  // app usa, mas 2 que la API concede y la app no necesita. Los 2 extras
  // son los que distinguen "el set REAL" de "el recorte".
  const tokenInfo = { permissions: REQUIRED.concat(['wallet.read', 'pve']).slice() };
  const permsReales = tokenInfo.permissions.slice();

  /* caso 1: key NUEVA */
  let fresh = [];
  try {
    fn(fresh, 'Principal', 'KEY-A', permsReales);
  } catch (e) {
    ok(false, 'agregar una key nueva no lanza', e.message);
    return R;
  }
  const nueva = fresh.find(k => k.value === 'KEY-A');
  ok(!!nueva, 'la key nueva quedo en la lista');
  ok(nueva && Array.isArray(nueva.perms),
    'la key nueva PERSISTE `perms` (sin esto el backup no puede validarse offline)',
    nueva ? 'perms=' + JSON.stringify(nueva.perms) : 'no esta');
  ok(nueva && nueva.perms && nueva.perms.length === tokenInfo.permissions.length,
    'persiste el set REAL de tokenInfo, no el recorte contra REQUIRED_PERMISSIONS',
    nueva && nueva.perms ? 'n=' + nueva.perms.length + ' vs ' + tokenInfo.permissions.length : 'sin perms');
  ok(nueva && nueva.perms && nueva.perms.indexOf('wallet.read') >= 0,
    'un permiso que la app NO requiere tambien queda persistido');
  ok(nueva && nueva.label === 'Principal', 'el label no se rompió al agregar perms');

  /* caso 2: key YA EXISTENTE, con permisos viejos -> se ACTUALIZAN */
  fresh = [{ label: 'Viejo', value: 'KEY-A', perms: ['account'] }];
  try {
    fn(fresh, 'Renombrada', 'KEY-A', permsReales);
  } catch (e) {
    ok(false, 'actualizar una key existente no lanza', e.message);
    return R;
  }
  const upd = fresh.find(k => k.value === 'KEY-A');
  ok(upd && upd.label === 'Renombrada', 'el label se actualiza (T1 sigue andando)');
  ok(upd && upd.perms && upd.perms.length === REQUIRED.length + 2,
    'actualizar una key REESCRIBE `perms` (no solo al agregar)',
    upd && upd.perms ? 'n=' + upd.perms.length : 'sin perms');

  /* caso 3: key ya guardada SIN `perms` (compatibilidad) */
  fresh = [{ label: 'Legacy', value: 'KEY-B' }];
  try {
    fn(fresh, 'Legacy', 'KEY-B', permsReales);
  } catch (e) {
    ok(false, 'una key legacy sin `perms` no lanza (perms ausente = desconocido)', e.message);
    return R;
  }
  const leg = fresh.find(k => k.value === 'KEY-B');
  ok(!!leg && leg.label === 'Legacy', 'la key legacy sigue en la lista con su label');

  /* caso 4: `info.permissions` ausente -> perms vacio, no undefined */
  fresh = [];
  fn(fresh, 'Sin perms', 'KEY-C', []);
  const sinP = fresh.find(k => k.value === 'KEY-C');
  ok(sinP && Array.isArray(sinP.perms) && sinP.perms.length === 0,
    'si tokenInfo no trae permisos, `perms` es [] y no undefined');

  /* caso 5: el guardado no toca las keys que NO son la editada */
  fresh = [{ label: 'Otra', value: 'KEY-Z' }];
  fn(fresh, 'Nueva', 'KEY-A', permsReales);
  const otra = fresh.find(k => k.value === 'KEY-Z');
  ok(!!otra && otra.label === 'Otra' && !otra.perms,
    'una key que no se edita no recibe `perms` (no se infiere nada del resto)');

  return R;
}

/* ── corrida real ─────────────────────────────────────────────────────── */
const src = fs.readFileSync(appPath, 'utf8');
console.log('=== 1. el fuente real ===');
const res = check(src);
let pass = 0, fail = 0;
res.forEach(r => {
  if (r.pass) { console.log('  PASS  ' + r.label); pass++; }
  else { console.log('  FAIL  ' + r.label + (r.extra ? '  (' + r.extra + ')' : '')); fail++; }
});

/* ── CONTROL NEGATIVO: el bug de vuelta tiene que romper las aserciones ── */
console.log('\n=== 2. CONTROL NEGATIVO (bug inyectado en una COPIA del texto) ===');
const mutado = src
  .replace(/\s*fresh\[i\]\.perms = permsReales;/, '')
  .replace(/, perms: permsReales/g, '');
const cambio = mutado !== src;
console.log('  mutacion aplicada al fuente:', cambio ? 'SI' : 'NO — el control no probaria nada');
const resMut = check(mutado);
const failMut = resMut.filter(r => !r.pass).length;
console.log('  con el bug: ' + failMut + ' FAIL de ' + resMut.length + ' aserciones');
const controlOk = cambio && failMut > 0;
console.log('  ' + (controlOk
  ? 'PASS  el arnes detecta la ausencia de `perms` -> el 0 FAIL de arriba es informacion'
  : 'FAIL  el arnes NO detecta el bug -> sus PASS no valen nada'));
if (!controlOk) fail++; else pass++;
if (failMut === 0) console.log('  (detalle: ' + failMut + ' fallos, se esperaba > 0)');

console.log('\n' + (fail === 0 ? 'SUITE OK' : 'SUITE FAIL') + '  ' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail === 0 ? 0 : 1);
