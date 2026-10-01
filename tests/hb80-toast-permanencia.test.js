/* =======================================================================
 * tests/hb80-toast-permanencia.test.js  --  LAS DOS SALIDAS del toast
 *
 * HISTORIAL, porque es instructivo. Este archivo se llamaba "toast-permanencia"
 * y afirmaba que el toast de la puerta de permisos era persistente. NO lo era,
 * y el test daba VERDE en falso. La version previa:
 *
 *   1. extraia con una regex el LITERAL DEL CALL-SITE (el `0` que escribia el
 *      call-site) y evaluaba ESE literal: `eval('(function(msg){ return (0); })')`
 *      -> 0. Ese 0 era un numero que la app NUNCA usaba.
 *   2. NO componia ese literal con la RESOLUCION DEL CALLE, que es la linea
 *      `const ttl = Number(opts.ttl || 3500);` (app.js:215). Como 0 es falsy,
 *      `0 || 3500` -> 3500. El temporizador veia 3500.
 *   3. dos asserts mas abajo afirmaba que el fallback `opts.ttl || (\d+)`
 *      EXISTIA, y lo citaba como prueba de que "el 0 es explicito en el
 *      call-site, no un default silencioso". O sea: el test localizaba por
 *      regexp la expresion que se come el 0 y la reportaba como garantia. Los
 *      dos asserts eran mutuamente contradictorios.
 *
 * O sea: el test extraia la mitad del problema y despues afirmaba que el
 * problema entero estaba resuelto. El defecto real era otro y no lo nombraba
 * ni (a) ni (b): el toast se dibujaba DETRAS del backdrop del modal
 * (`rgba(0,0,0,.55)` + `blur(2px)`), o sea invisible en el instante en que se
 * disparaba. Medido con hit test en navegador.
 *
 * Que quedo de este archivo y que NO se pierde: la mitad que el otro test no
 * cubre. `tests/hb81-toast-legible.test.js` es el duenno del ttl RESUELTO por
 * el calle y de la cascada de z-index. Este queda con las DOS SALIDAS (el reloj
 * y el boton de cerrar) y con la guarda de los mensajes cortos. Los dos tests
 * se complementan; ninguno repite al otro.
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

section('1. la salida por reloj: toast() solo arma el temporizador si ttl > 0');

const guardaTimer = app.match(/const\s+timer\s*=\s*([^;]+);/);
ok(!!guardaTimer && /ttl\s*>\s*0\s*\?/.test(guardaTimer[1]),
  'toast() solo arma el temporizador cuando ttl > 0',
  guardaTimer ? 'la guarda es: ' + guardaTimer[1].trim() : 'no se encontro la guarda del timer');
ok(/ttl\s*>\s*0\s*\?\s*setTimeout/.test(app),
  'la guarda conecta el timer con ttl>0 en la misma expresion');

section('2. la salida manual: el toast trae boton de cerrar');

// Esto es lo que hace que un toast CON reloj sea un aviso y no una trampa:
// si el mensaje no se lee, el usuario lo saca. Sin esto, subir el ttl seria
// dejar un cartel pegado sin salida.
ok(/toast__close/.test(app), 'el toast declara el boton de cierre (clase toast__close)');
ok(/querySelector\('\.toast__close'\)\?\.addEventListener\('click',\s*close\)/.test(app),
  'el boton de cierre esta cableado a la misma funcion close que usa el timer');

section('3. lo que este test NO deja pasar');

// El mensaje corto y fijo de app.js ("Formato de API key invalido") puede
// seguir siendo efimero: son 30 chars y se leen de un vistazo. Si alguien
// "arregla" todos los ttl, este test avisa.
const cortos = [...app.matchAll(/window\.toast\?\.\('error',\s*'([^']+)',\s*\{\s*ttl:\s*([-\d]+)/g)];
ok(cortos.every((c) => c[1].length < 100),
  'ningun mensaje corto y fijo quedo con ttl numerico gigante por propagar el cambio',
  JSON.stringify(cortos.map((c) => c[1].slice(0, 40))));

// Y el default sigue siendo un numero finito: si alguien saca el default y
// deja `Number(opts.ttl)`, un call-site sin ttl daria NaN y el toast no se
// borraria nunca.
//
// El assert se mide sobre el fuente SIN COMENTARIOS, y no sobre el fuente
// entero. Medido: el regex `/opts.ttl\s*\|\|\s*(\d+)/` matcheaba la PROSA
// del comentario que HB#85 escribio al lado (`// opts.ttl || 3500 se tragaba
// el 0...`) y daba verde con el codigo real en `??`. O sea: el test defendia
// el defecto Y su comentario, y una vez arreglado el defecto el test seguia
// verde por el comentario. Es la misma clase que ALERT-61 (el guard de la Idea
// 61 leia prosa y contaba un sitio muerto): un assert que lee texto no puede
// afirmar sobre codigo.
//
// Acepta `||` o `??`: lo que el assert quiere decir es "hay un default
// numerico finito", no "el operador es este". Fijar el operador seria repetir
// el error en espejo.
const codigo = app.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const defTtl = codigo.match(/opts\.ttl\s*(?:\|\||\?\?)\s*(\d+)/);
ok(!!defTtl, 'el ttl por defecto de toast() sigue siendo un numero finito',
  defTtl ? 'default = ' + defTtl[1] + ' ms' : 'no se encontro el default en el CODIGO');
if (defTtl) {
  ok(defTtl[1] === '3500', 'el default es 3500 ms',
    'encontro ' + defTtl[1]);
}

// Y el que de verdad importa, que el assert anterior no podia decir porque
// su propia regex exigia el `||`: con el codigo real, `ttl: 0` es persistente.
// Se afirma sobre el texto del default para que la afirmacion y el codigo no
// puedan separarse otra vez.
ok(/opts\.ttl\s*\?\?\s*3500/.test(codigo),
  'el default se resuelve con `??`, asi que `ttl: 0` es persistente de verdad',
  'el codigo no usa `??` para el ttl');

console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail === 0 ? 0 : 1);
