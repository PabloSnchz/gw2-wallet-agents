/**
 * HB#40 — Idea 47, Commit 4: el call site de commerce deja de degradar.
 *
 * Contexto. El commit 2 (9860a2e) hizo que getCommerceTransactionsBuys y
 * getCommerceTransactionsSells PROPAGEN el error. Pero su unico call site
 * seguia haciendo:
 *
 *     var buys = results[0].status === 'fulfilled' ? results[0].value : [];
 *
 * o sea, convertia el rechazo de vuelta en []. El contrato nuevo no llegaba
 * a ninguna parte: un API key caido se seguia viendo como "No tenes ordenes
 * activas en el TP". Eso es el P1 de la revision del Code Reviewer
 * (task-ec29dfb1ec3f), que llego DESPUES de que el commit 2 estuviera en main.
 *
 * Este test es la red que faltaba para que ese defecto no vuelva.
 *
 * Seccion [1]: ESTATICA sobre el archivo real del disco. Pasar significa que
 *   el archivo commiteado tiene la forma correcta.
 * Seccion [2]: EJECUCION real de renderTransErrorBanner() con un estado
 *   falso, extraida del archivo. No copia el codigo.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONV = fs.readFileSync(path.join(ROOT, 'js', 'converter-modal.js'), 'utf-8');
const API = fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf-8');
const INDEX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  OK   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  ->  ' + extra : '')); }
}
function section(t) { console.log('\n' + t); }

/** Cuerpo de una function nombrada, por conteo de llaves. */
function bodyOf(src, fnName) {
  const start = src.indexOf('function ' + fnName + '(');
  if (start < 0) return null;
  let i = src.indexOf('{', start), depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  return null;
}

section('[1] ESTATICA — el call site ya no degrada a []');

// Este es EL defecto. Si alguien "simplifica" el if/else de vuelta a un
// ternario que degrade, el test tiene que catchearlo.
const convBody = bodyOf(CONV, 'loadTransacciones');
ok('loadTransacciones existe', convBody !== null);
ok('ya NO degrada el rechazo a [] con un ternario',
  !/status === 'fulfilled'\s*\?\s*results\[\d\]\.value\s*:\s*\[\]/.test(convBody),
  'volvio el ternario que deshace el contrato de api-gw2.js');
ok('el rechazo de compras se registra como error',
  /buysStatus = 'error'/.test(convBody));
ok('el rechazo de ventas se registra como error',
  /sellsStatus = 'error'/.test(convBody));
ok('el camino feliz marca "ok" en ambos lados',
  /buysStatus = 'ok'/.test(convBody) && /sellsStatus = 'ok'/.test(convBody));
ok('el estado se resetea a unknown antes de leer (evita un error viejo pegado)',
  /st\.buysStatus = 'unknown';[\s\S]*st\.sellsStatus = 'unknown';\s*\n\s*var results/.test(convBody));
// El plural cambia la 4a letra, no la 5ta en adelante: "pudo leer" (singular,
// la caja) vs "pudieron leer" (compras y ventas). Un regex con `pudo\w*` NO
// matchea el plural, porque "pudieron" no contiene la subcadena "pudo" — es
// p-u-d-i, no p-u-d-o. Hay que cortar en `pud`.
ok('cada fallo se avisa por consola (no se traga en silencio)',
  (convBody.match(/console\.warn\(LOG, 'No se pud\w+ leer/g) || []).length >= 3,
  'se esperaba 3 warns: compras, ventas y caja');

// El banner tiene que existir Y estar en los DOS caminos de render. El del
// estado vacio es el que antes decia "No tenes ordenes" con un fallo debajo.
ok('renderTransErrorBanner existe', bodyOf(CONV, 'renderTransErrorBanner') !== null);
const renderBody = bodyOf(CONV, 'renderTransacciones');
ok('se dibuja en el estado vacio (si no, el fallo era invisible)',
  /renderTransErrorBanner\(\) \+ renderDeliveryBanner\(\)/.test(renderBody));
ok('se dibuja cuando HAY ordenes', /renderTransErrorBanner\(\) \+/.test(renderBody));

// El id del boton: cvTransaccionesRetry ya lo escuchaba wireTransaccionesEvents
// y ningun markup lo dibujaba. Si vuelve a cvTransaccionesRefresh, el estado
// vacio renderiza DOS nodos con el mismo id (banner + boton Refrescar).
ok('el boton usa el id que el wiring ya escuchaba',
  /id="cvTransaccionesRetry"/.test(CONV));
ok('el banner NO usa el id del boton Refrescar',
  !/cvTransaccionesRefresh/.test(bodyOf(CONV, 'renderTransErrorBanner')));
// Los dos usos restantes de cvTransaccionesRefresh estan en ramas excluyentes
// del mismo render (estado vacio vs. con ordenes), asi que nunca coexisten.
const refreshIds = (CONV.match(/id="cvTransaccionesRefresh"/g) || []).length;
ok('cvTransaccionesRefresh queda en 2 ramas mutuamente excluyentes', refreshIds === 2,
  'aparecen ' + refreshIds + ' veces; mas de 2 seria un id duplicado en vivo');

// Esc en contenido dinamico. Los textos son literales internos hoy, pero si
// alguno pasa a llevar dato de API, ya tiene que estar escapado.
const bannerBody = bodyOf(CONV, 'renderTransErrorBanner');
ok('el texto dinamico va con esc()', /esc\(failed\)/.test(bannerBody) && /esc\(ok\)/.test(bannerBody));
ok('el texto fijo NO va con esc() (esc de literal no aporta y ensucia)',
  !/esc\('La caja del Trading Post'\)/.test(bannerBody));

section('[2] ESTATICA — contrato y arquitectura intactos');

// P5 del Reviewer: la exclusion de getCommerceListings tiene que estar escrita.
ok('getCommerceListings documenta por que NO propaga',
  /NOTA DE CONTRATO/.test(API) && /getCommerceListings/.test(API));
ok('el JSDoc explica que [] es estado normal, no un fallo',
  /estado NORMAL/.test(API));
ok('getCommerceListings sigue resolviendo [] (no la rompimos al documentar)',
  /var ids = Array\.isArray\(data\) \? data : \[\];/.test(API));

// CSS en 3 capas: este commit no puede haber tocado CSS. Reutiliza .cv-delivery.
ok('el banner reutiliza .cv-delivery (cero CSS nuevo)',
  /class="cv-delivery"/.test(bannerBody) && /data-cv-color="error"/.test(bannerBody));
ok('no hay style= inline en el banner nuevo', !/style="/.test(bannerBody));
const CSS = ['main.css', 'theme-polish.css'].map(f =>
  fs.readFileSync(path.join(ROOT, 'css', f), 'utf-8')).join('\n');
ok('ningun CSS agregado por este commit', !/cv-trans-read|cv-read-error/.test(CSS));
ok('sin !important', !/!important/.test(bannerBody) && !/!important/.test(API.split('getCommerceListings')[1] || ''));

// Cache-busting: el header del archivo y el ?v= de index.html tienen que
// coincidir (regla del commit 02254a7).
ok('converter-modal.js?v= alineado con el header (1.2.0)',
  /converter-modal\.js\?v=1\.2\.0/.test(INDEX) && /Versión: 1\.2\.0/.test(CONV));
// El ?v= de api-gw2.js tiene que COINCIDIR con su propio header, no valgar un
// numero fijo: este commit no lo toco, pero el Idea 48 si subio la version del
// archivo. La invariante es la alineacion (regla del commit 02254a7); el
// literal era una foto del momento y se rompio sola albumpear la version.
const API_VER = (CONV === null ? '' : (fs.readFileSync(path.join(ROOT,'js','api-gw2.js'),'utf8')
  .match(/Versi\u00f3n:\s*([\d.]+)/) || [])[1]);
ok('api-gw2.js?v= alineado con el header del archivo',
  new RegExp('api-gw2\\.js\\?v=' + (API_VER||'x')).test(INDEX),
  `header=${API_VER}`);

section('[3] EJECUCION — renderTransErrorBanner() con estados falsos');

// Se ejecuta la funcion REAL del archivo, no una copia.
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const state = { transacciones: {} };
const fn = new Function('state', 'esc', bodyOf(CONV, 'renderTransErrorBanner') + '\nreturn renderTransErrorBanner;')(state, esc);

function withStatus(buys, sells) {
  state.transacciones = { buysStatus: buys, sellsStatus: sells, deliveryStatus: 'empty' };
  return fn();
}

ok('sin errores no dibuja nada', withStatus('ok', 'ok') === '');
ok('unknown no dibuja nada (todavia no se consulto)',
  withStatus('unknown', 'unknown') === '');

const ambos = withStatus('error', 'error');
ok('si fallan ambos, el banner nombra ambos', ambos !== '' && /no se pudo leer/i.test(ambos));
ok('si fallan ambos, aclara que la caja del TP SI se leyo',
  /La caja del Trading Post/.test(ambos.replace(/<[^>]+>/g, '')));
ok('si fallan ambos, NO afirma que compras o ventas se leyeron',
  !/las compras y la caja/.test(ambos) && !/las ventas y la caja/.test(ambos));

const soloBuys = withStatus('error', 'ok');
ok('si solo fallan las compras, las nombra', /compras/.test(soloBuys));
ok('si solo fallan las compras, dice que las ventas SÍ se leyeron',
  /ventas/.test(soloBuys));
ok('si solo fallan las compras, el texto NO atribuye el fallo a las ventas',
  !/no se pudo leer[^<]*ventas/i.test(soloBuys));

const soloSells = withStatus('ok', 'error');
ok('si solo fallan las ventas, las nombra', /ventas/.test(soloSells));
ok('si solo fallan las ventas, dice que las compras SÍ se leyeron',
  /compras/.test(soloSells));

ok('el banner de error lleva el atributo de color que la capa 3 ya conoce',
  /data-cv-color="error"/.test(ambos));
ok('el banner de error es announced a lectores de pantalla',
  /role="status"/.test(ambos));
ok('el banner ofrece reintentar', /id="cvTransaccionesRetry"/.test(ambos));

console.log('\n' + (fail === 0 ? 'TODO OK' : 'FALLOS PRESENTES') + ': ' + pass + ' OK / ' + fail + ' FAIL');
process.exit(fail === 0 ? 0 : 1);
