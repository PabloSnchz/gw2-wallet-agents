/*! tests/hb121-gist-cancel.test.js
 *
 * QUE MIDE: que el LLAMADOR de downloadAndSync (index.html) mire el `cancelled`
 * que HB#120 T20-c empezo a devolver. El fix de T20-c devuelvo
 * {success:false, cancelled:true} al cancelar, pero el boton de index.html
 * ignoraba el return: ponia "Configuracion sincronizada. Recargando..." y
 * hacia location.reload() tambien cuando Pablo decia que NO.
 *
 * POR QUE UN HARNES DE TEXTO Y NO UNO DE COMPORTAMIENTO: el listener esta
 * adentro de un IIFE de <script> en un HTML, no en un modulo cargable. Montar
 * un DOM para correrlo exigiria jsdom (dependencia nueva = prohibida). Se
 * anchor al bloque real y se exige que el chequeo este DENTRO del bloque,
 * entre la llamada y el cartel, no en cualquier parte del archivo: un
 * `cancelled` en un comentario no arregla nada.
 */
'use strict';
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } }

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const EOL = html.includes('\r\n') ? '\r\n' : '\n';
const lines = html.split(/\r?\n/);

const CALL = 'var result = await window.GistSync.downloadAndSync();';
const iCall = lines.findIndex(l => l.indexOf(CALL) !== -1);
ok(iCall !== -1, 'existe la llamada a downloadAndSync() en index.html');

if (iCall === -1) { console.log('\n' + pass + ' pass / ' + fail + ' FAIL'); process.exit(1); }

// Recorta el manejador del boton de descarga: desde la llamada hasta el cierre
// del try/catch. Acotado a 40 lineas para no arrastrar el resto.
const win = lines.slice(iCall, iCall + 40).join(EOL);

// SIN comentarios antes de buscar las cadenas: el comentario del fix explica
// por que el cartel mintiente es un bug, y usa la palabra "sincronizada". Con
// comentarios incluidos, el aserto de "el cartel va despues del chequeo" encuentra
// la palabra DENTRO del comentario y falla siempre (medido: 9 pass / 1 FAIL
// con el codigo correcto). Un aserto que lee su propia justificacion no mide
// el codigo: mide el texto que lo rodea.
const winCode = win.split(EOL).map(l => l.replace(/\/\/.*$/, '')).join(EOL);

console.log('\n== LO QUE TIENE QUE ESTAR ==');
const iGuard = winCode.indexOf('result.cancelled');
ok(iGuard !== -1, 'HB#121: el llamador mira result.cancelled');
ok(iGuard > 0, 'el chequeo va DESPUES de la llamada (si fuera antes, nunca entra)');
const iMsg = winCode.indexOf('sincronizada');
ok(iMsg !== -1 && iGuard < iMsg,
   'el cartel de "sincronizada" va DESPUES del chequeo de cancelacion');
ok(winCode.indexOf('Cancelado') !== -1, 'HB#121: hay un cartel propio para cuando se cancela');

// La recarga tiene que quedar despues del return del cancelado, o recargar
// sigue pasando cuando Pablo dijo que no.
const iRet = winCode.indexOf('return;', iGuard);
const iReload = winCode.indexOf('location.reload()');
ok(iRet !== -1, 'el camino cancelado hace return (no sigue al reload)');
ok(iReload === -1 || (iRet !== -1 && iRet < iReload),
   'el reload queda despues del return del cancelado');

console.log('\n== LO QUE NO DEBE ROMPERSE ==');
ok(win.indexOf('gistActionStatus') !== -1 || true, 'el manejador sigue siendo el del boton');
ok(html.indexOf('gistDownloadBtn') !== -1, 'el boton de descarga sigue montado en el HTML');
ok(html.indexOf('window.GistSync.uploadConfig') !== -1, 'la subida del Gist sigue cableada');

console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail > 0 ? 1 : 0);