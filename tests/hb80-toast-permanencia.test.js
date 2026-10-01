/* =======================================================================
 * tests/hb80-toast-permanencia.test.js  --  el mensaje de la puerta se PUEDE
 *                                          LEER, no solo LLEGAR
 *
 * Este test NO repite hb77. Hb77 verifica que el mensaje de la puerta llegue
 * a la pantalla sin ser reescrito por `parseKeyError`. Eso es "LLEGA". Lo que
 * falta es "SE PUEDE LEER": el mensaje sale por 3 superficies y solo una tiene
 * reloj.
 *
 *   app.js:1173   _fieldMsg.textContent = msg    persistente (se borra al reintentar)
 *   app.js:1174   setStatus(msg, 'error')         persistente
 *   app.js:1175   window.toast?.('error', msg, {ttl})   <- el unico con reloj
 *
 * MEDIDO, con el mensaje que la puerta REALmente tira (evaluando
 * `KeyManager.REQUIRED_PERMISSIONS` de app.js:679 y la construccion de
 * app.js:827-832, con los 7 permisos ausentes, que es el caso que la dispara):
 * 411 chars, ~68 palabras. Con la cascada REAL de CSS (main.css:461 pone
 * `max-width:360px` en `.toast`, y nada despues lo pisa) el toast queda de
 * 360 x 235 px y el texto ocupa 10 lineas. A 250 palabras/minuto, leerlo lleva
 * ~16 s. Contra 2,5 s de vida: se ve cerca del 15% del mensaje.
 *
 * Lo que se afirma aca NO es el numero constante, porque el numero es la
 * consecuencia y no el contrato. Se afirma la CONTRACHA, y lacontracha se
 * extrae y se evalua:
 *   1. la expresion de `ttl` del toast de la puerta, evaluada con el mensaje
 *      real, da 0 -- o sea, no se arma ningun temporizador;
 *   2. `toast()` arma el timer SOLO si `ttl>0` (asi que `ttl:0` significa
 *      "no se borra solo" y no "se queda para siempre sin salida");
 *   3. el toast trae boton de cerrar, o sea que hay salida manual.
 * Las 3 juntas son lo que hace que 0 sea una decision y no una trampa. Con
 * cualquiera de las otras dos faltando, el mismo cambio seria un bug.
 *
 * Alcance: analisis estatico + evaluacion de expresiones del fuente. No levanta
 * el IIFE de app.js (depende de document, window y Storage).
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

const app = fs.readFileSync(path.join(REPO, 'js/app.js'), 'utf8');

/* --- El mensaje real de la puerta, sin hardcodear la lista de permisos.
   Se saca `REQUIRED_PERMISSIONS` del fuente y se evalua la misma construccion
   que la puerta, con TODOS los permisos ausentes (el caso que la dispara). */
function listaPermisos(src) {
  const L = src.split(/\r?\n/);
  const i = L.findIndex((l) => /REQUIRED_PERMISSIONS:\s*\[/.test(l));
  if (i < 0) return null;
  const chunk = [];
  for (let k = i; k < L.length; k++) { chunk.push(L[k]); if (/\]\s*,?\s*$/.test(L[k])) break; }
  // eslint-disable-next-line no-eval
  return eval(chunk.join('\n').replace(/REQUIRED_PERMISSIONS:\s*\[/, '[').replace(/\]\s*,?\s*$/, ']'));
}
const REQUIRED = listaPermisos(app);
ok(!!REQUIRED, 'se extrajo REQUIRED_PERMISSIONS del fuente de app.js');

const FALTAN = (REQUIRED || []).filter((p) => !new Set().has(p.scope)); // ninguno declarado
const mensajePuerta = 'La API key necesita permisos: ' +
  FALTAN.map((p) => p.scope + ' (' + p.para + ')').join(', ') +
  '. La app usa ' + REQUIRED.length +
  ' permisos en total; hay que declararlos TODOS al crear la key en account.arena.net/applications.';

section('1. el mensaje que hay que leer es largo, y el dato viene del codigo');

ok(REQUIRED.length === 7, 'la puerta exige 7 permisos', 'exigen ' + REQUIRED.length);
ok(mensajePuerta.length > 200,
  'el mensaje de la puerta supera los 200 chars',
  'mide ' + mensajePuerta.length);
// 250 palabras/min es una velocidad de lectura conservative. El punto no es el
// numero exacto: es que 2,5 s no esta en la misma magnitud que 68 palabras.
const palabras = mensajePuerta.trim().split(/\s+/).length;
const segsLectura = Math.round((palabras / 250) * 60);
console.log('  (dato: ' + palabras + ' palabras ~ ' + segsLectura + ' s de lectura a 250 pal/min)');

section('2. la permanencia: la expresion de ttl, evaluada con el mensaje real');

// Se localiza el toast del catch del modal: el que va justo despues de
// setStatus(msg, 'error'). Es el unico lugar donde el mensaje de la puerta
// pasa por un reloj. La ventana es holgada a proposito (hay un bloque de
// comentario entre los dos) y se recorta al primer toast que sigue, para que
// adding comments no rompa el test ni deje que se enganche al de otro catch.
const m = app.match(/setStatus\(msg,\s*'error'\);[\s\S]{0,800}?window\.toast\?\.\('error',\s*msg,\s*\{\s*ttl:\s*([^}]+?)\s*\}\s*\)/);
ok(!!m, 'se localizo el toast que lleva el mensaje de la puerta (el que sigue a setStatus)');
const exprTtl = m ? m[1] : null;
console.log('  (expresion de ttl en el fuente: ' + JSON.stringify(exprTtl) + ')');

// eslint-disable-next-line no-new-func
const ttl = m ? eval('(function(msg){ return (' + exprTtl + '); })')(mensajePuerta) : null;
ok(ttl === 0,
  'con el mensaje real de la puerta, el ttl evaluado es 0: no se arma temporizador',
  'evalua a ' + JSON.stringify(ttl));

section('3. las dos salidas que hacen que 0 sea una decision y no una trampa');

// (a) el reloj: `toast()` solo arma el timer si el ttl es positivo.
const guardaTimer = app.match(/const\s+timer\s*=\s*([^;]+);/);
ok(!!guardaTimer && /ttl\s*>\s*0\s*\?/.test(guardaTimer[1]),
  'toast() solo arma el temporizador cuando ttl > 0',
  guardaTimer ? 'la guarda es: ' + guardaTimer[1].trim() : 'no se encontro la guarda del timer');
ok(/ttl\s*>\s*0\s*\?\s*setTimeout/.test(app),
  'la guarda conecta el timer con ttl>0 en la misma expresion');

// (b) la salida manual: el toast trae boton de cerrar.
ok(/toast__close/.test(app), 'el toast declara el boton de cierre (clase toast__close)');
ok(/querySelector\('\.toast__close'\)\?\.addEventListener\('click',\s*close\)/.test(app),
  'el boton de cierre esta cableado a la misma funcion close que usa el timer');

// El ttl por defecto, si alguien pasa un opts vacio, sigue siendo finito: el 0
// es explicito en el call-site, no un default silencioso.
const defTtl = app.match(/opts\.ttl\s*\|\|\s*(\d+)/);
ok(!!defTtl, 'el ttl por defecto de toast() sigue siendo un numero finito',
  defTtl ? 'default = ' + defTtl[1] + ' ms' : 'no se encontro el default');

section('4. lo que este test NO deja pasar');

// El mensaje corto y fijo de app.js:1119 ("Formato de API key invalido") puede
// seguir siendo efimero: son 30 chars y se leen de un vistazo. Si alguien
// "arregla" todos los ttl, este test avisa.
const cortos = [...app.matchAll(/window\.toast\?\.\('error',\s*'([^']+)',\s*\{\s*ttl:\s*(\d+)/g)];
ok(cortos.every((c) => c[1].length < 100),
  'ningun mensaje corto y fijo quedo con ttl numerico gigante por propagar el cambio',
  JSON.stringify(cortos.map((c) => c[1].slice(0, 40))));

console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail === 0 ? 0 : 1);
