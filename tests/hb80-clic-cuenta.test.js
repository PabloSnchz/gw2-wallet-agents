/* =======================================================================
 * tests/hb80-clic-cuenta.test.js  --  hacer clic en el nombre de una cuenta
 *                                  no puede cambiarte la vista del panel
 *
 * El defecto (medido, no supuesto):
 *   `accounts-panel.js:452-453` cableaba `[data-toggle-expand-name]` a un
 *   handler que solo hacia una cosa: `state.view = 'cards' ? 'table' : 'cards'`.
 *   El atributo estaba en DOS sitios -- `:343`, el `<article>` ENTERO de la vista
 *   compacta, y `:370`, el div del nombre. Con `cursor:pointer` en los dos. Y el
 *   control honesto de la vista, `accountsToggleView` (`:571`), hace
 *   EXACTAMENTE la misma mutacion, 118 lineas mas abajo. O sea: dos controles
 *   con la misma accion, uno de ellos invisible, sin etiqueta y con la
 *   superficie de una tarjeta entera.
 *
 *   Consecuencia medida: Pablo hace clic para ver el detalle de una cuenta y
 *   pierde la vista de tarjetas. Y como el clic se revierte al recargar (hoy
 *   `state.view` no se persiste), el efecto seuba y se va solo: la friccion no
 *   se puede deducir de la pantalla, ni reproducir, ni reportar.
 *
 * Que NO cubre este test (y por que no lo cubre):
 *   No levanta el IIFE de accounts-panel.js: el render depende de `CONFIG`,
 *   `state` y de los derivados de cada cuenta (`displayIcon`, `bLeft`, `iGlow`,
 *   `expIcons`...), y montar todo eso para verificar un atributo seria un
 *   armazon de 200 lineas que se pudriria con el proximo refactor. Lo que se
 *   afirma aca es el CONTRATO, sobre el fuente, y el contrato tiene dos
 *   mitades que hay que poder romper:
 *     (1) la superficie: el HTML de las dos ramas no ofrece el atributo ni
 *         promete que sea clickeable con el cursor;
 *     (2) la accion: el control honesto sigue existiendo y sigue cambiando la
 *         vista. Sin (2), (1) seria "borrar una funcionalidad", no "corregir
 *         una accion duplicada".
 *
 *   La prueba de que estas aserciones MUERDEN cuando el defecto vuelve esta en
 *   la mutacion del ciclo (volver el atributo y el handler), no aca adentro.
 * ======================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { console.log('  PASS  ' + label); pass++; }
  else { console.log('  FAIL  ' + label + (extra ? '  (' + extra + ')' : '')); fail++; }
}
function section(t) { console.log('\n[' + t + ']'); }

const src = fs.readFileSync(path.join(REPO, 'js/accounts-panel.js'), 'utf8');
const lineas = src.split(/\r?\n/);
const veces = (p) => src.split(p).length - 1;
const nLinea = (p) => { const i = src.indexOf(p); return i < 0 ? -1 : src.slice(0, i).split('\n').length; };

section('1. la superficie: el atributo que miente ya no esta en ninguna rama');

ok(veces('data-toggle-expand-name') === 0,
  'no queda ningun data-toggle-expand-name en el archivo',
  'quedan ' + veces('data-toggle-expand-name'));

// El portador del atributo era el article de la vista compacta Y el div del
// nombre. Se afirma sobre las DOS plantillas, no sobre el archivo entero: un
// grep de "0 en el archivo" pasaria igual si alguien escribiera el atributo con
// otro nombre, y el defecto volveria por la puerta de al lado.
const article = lineas.find((l) => /<article class="card account-card"/.test(l));
ok(!!article, 'existe la plantilla del article de la tarjeta');
ok(!!article && !/data-account-id/.test(article),
  'el article de la vista compacta no lleva data-account-id',
  article ? 'lo tiene' : 'no se encontro la plantilla');
ok(!!article && !/cursor:pointer/.test(article),
  'el article de la vista compacta no promete que sea clickeable (cursor:pointer fuera)',
  article ? 'lo tiene' : 'no se encontro la plantilla');
ok(!!article && /bLeft/.test(article),
  'el article conserva su borde semantico (bLeft): el fix no toco el color');

const nombre = lineas.find((l) => /font-weight:700;font-size:1\.05rem/.test(l));
ok(!!nombre, 'existe la plantilla del div del nombre de la cuenta');
ok(!!nombre && !/data-toggle-expand-name/.test(nombre),
  'el div del nombre no lleva data-toggle-expand-name');
ok(!!nombre && !/data-account-id/.test(nombre),
  'el div del nombre no lleva data-account-id');
ok(!!nombre && !/cursor:pointer/.test(nombre),
  'el div del nombre no promete que sea clickeable (cursor:pointer fuera)');
ok(!!nombre && /esc\(acc\.name/.test(nombre),
  'el div del nombre sigue mostrando el nombre escapado');

section('2. el cableado muerto se fue con el atributo');

ok(veces('__wiredName') === 0, 'no queda el flag __wiredName', 'quedan ' + veces('__wiredName'));
ok(!/getAttribute\('data-account-id'\)/.test(src),
  'no queda el getAttribute del atributo que se leia y se descartaba');

// El handler que hay que eliminar: mutaba state.view desde un clic sin etiqueta.
// La asercion NO puede ser "ningun click muta state.view": el boton honesto
// (:573) y el de "cambiar archivo" (:852, que resetea el panel) lo hacen y
// deben hacerlo. Lo que no puede existir es un click sobre una SUPERFICIE
// (algo encontrado con querySelectorAll por atributo) que mute la vista.
const clickedQueMutan = lineas
  .map((l, i) => ({ l, i }))
  .filter((x) => /addEventListener\('click'/.test(x.l) && /state\.view\s*=/.test(x.l));
ok(clickedQueMutan.length === 2,
  'quedan exactamente 2 clics que mueven state.view (el boton de vista y el de cambiar archivo)',
  'quedan ' + clickedQueMutan.length);
ok(clickedQueMutan.every((x) => /getElementById\(/.test(x.l)),
  'los 2 se cablean por ID de control, ninguno por atributo sobre una superficie',
  clickedQueMutan.filter((x) => !/getElementById\(/.test(x.l)).map((x) => ':' + (x.i + 1)).join(' '));
ok(clickedQueMutan.some((x) => /accountsToggleView/.test(x.l)),
  'uno de los 2 es el control honesto accountsToggleView');
ok(!/querySelectorAll\([^)]{0,80}\)[^;]{0,200}state\.view\s*=/.test(src),
  'ningun querySelectorAll cablea algo que mute state.view');

section('3. la ACCION no se perdio: el control honesto sigue ahi');

// Sin esto, el fix de arriba seria borrar una funcionalidad. Con esto, es
// deduplicar: queda un control por accion.
ok(veces('accountsToggleView') === 2,
  'el boton accountsToggleView sigue en el markup y en su wire (2 ocurrencias)',
  'quedan ' + veces('accountsToggleView'));
const lineaBoton = lineas.find((l) => /id="accountsToggleView"/.test(l));
ok(!!lineaBoton && /state\.view==='cards'/.test(lineaBoton),
  'el boton declara en su texto que cambia de vista (etiqueta honesta)');
const lineaWire = lineas.find((l) => /getElementById\('accountsToggleView'\)/.test(l));
ok(!!lineaWire && /state\.view=state\.view==='cards'/.test(lineaWire),
  'el boton sigue cambiando state.view entre cards y table');

// Los otros dos controles de la zona, para el contraste: densidad y secciones.
ok(veces('accountsToggleCompact') === 2, 'el boton de densidad (compact) sigue intacto');
ok(veces('data-toggle-section') >= 2, 'el control de secciones por cuenta sigue intacto');
ok(/expandedAccounts/.test(src), 'el estado expandedAccounts sigue siendo el de las secciones');

section('4. la severidad que se atribuyo al defecto, medida');

// El Reviewer (fila 086) bajo la severidad: hoy `state.view` no se persiste, asi
// que el clic accidental se revierte al recargar. Eso no lo vuelve inofensivo:
// significa que el fix hay que hacerlo ANTES de que viewPref aterrice, no
// despues. El test afirma la precondicion para que, cuando viewPref llegue,
// alguien mire esta fila.
const persisteView = /(localStorage|Storage\.(get|set))\([^)]*view/i.test(src) ||
                     /view[^\n]{0,40}(localStorage|Storage\.(get|set))/i.test(src);
ok(!persisteView,
  'state.view NO se persiste todavia: el clic accidental es reversible (y por eso el fix es urgente, no opcional)',
  'ALGO lo persiste ya: entro viewPref, y este test hay que revisarlo');

console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail === 0 ? 0 : 1);
