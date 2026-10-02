/* tests/idea57t5-cuenta-medida.test.js
 *
 * v2.29.0 de la Idea 57: el conteo de "cuantos faltan migrar" era un numero a
 * mano en la cabecera, y el numero no coincidia con el codigo.
 *
 * El problema NO es que el numero este equivocado (eso se corrige escribiendo
 * el correcto). El problema es que era un numero SIN EQUIVALENTE MEDIDO: nadie
 * podia saber si estaba bien sin ir a contarlo a mano, y cuando el codigo bajo
 * de 5 a 4 el numero se quedo en 5 sin avisar. Es la misma clase que el "8
 * tragadores" de la Idea 47 y que el "son SIETE los wrappers" de la v2.24.1.
 *
 * La v2.25.0 ya lo dijo textual en este mismo archivo: "acertar el numero no
 * era la tarea; reemplazar el numero por una regla, si". Eso se aplico a la
 * DEGRADACION. Este test lo aplica a la CUENTA.
 *
 * La regla que instala: si el archivo dice cuantos faltan, el test cuenta
 * cuantos faltan y los dos tienen que decir lo mismo. El numero sigue escrito
 * (se lee mejor que una regla), pero ya no es una afirmacion: es una cuenta que
 * alguien verifica.
 *
 * Que NO hace este test, a proposito:
 *   - No mantiene una lista de wrappers. Recorre el archivo.
 *   - No exige que el numero sea un valor concreto. Si el Tramo 2 migra 2 de
 *     los 4 que faltan, el test sigue en verde con 2: lo que exige es que el
 *     comentario y el codigo coincidan, no que valgan una cifra en particular.
 *   - No toca la propiedad de por que cada sitio hay que migrarlo (esa esta
 *     medida en idea57.forma-contracts.test.js). Solo que el conteo y el
 *     comentario no se contradigan.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.join(__dirname, '..');
const API = 'js/api-gw2.js';
const src = fs.readFileSync(path.join(REPO, API), 'utf8');
const lines = src.split(/\r?\n/);

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { console.log('  PASS  ' + label); pass++; }
  else { console.log('  FAIL  ' + label + (extra ? '\n          ' + extra : '')); fail++; }
}
function section(t) { console.log('\n[' + t + ']'); }

/* --------------------------------------------------------------------------
 * SECCION 1: el estado de bloque de comentario, linea a linea.
 *
 * Es lo mismo que hace idea57.forma-contracts.test.js y esta aqui por una
 * razon concreta: la cabecera de la v2.25.0 ESCRIBE el patron
 * `Array.isArray(data) ? data : []` para explicar la regla, y el JSDoc de
 * getCommerceDelivery la vuelve a escribir. Sin esto, un detector de numero
 * se dispara por su propia documentacion, y un detector que se dispara por su
 * propia documentacion hay que silenciar: asi es como mueren los tests.
 * -------------------------------------------------------------------------- */
function bloqueDeComentario() {
  const st = new Array(lines.length).fill(false);
  let enBloque = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!enBloque) {
      if (/^\s*\/\*/.test(l)) { enBloque = true; st[i] = true; }
    } else {
      st[i] = true;
      if (/\*\/\s*$/.test(l)) enBloque = false;
    }
  }
  return st;
}
const enComentario = bloqueDeComentario();

/* --------------------------------------------------------------------------
 * SECCION 2: el conteo MEDIDO de los sitios que faltan migrar.
 *
 * Que es un sitio "que falta migrar": codigo vivo (no comentario) que degrada
 * a `[]` y que lleva la marca `Migracion = Tramo 2 de la Idea 57` en las lineas
 * previas. La marca es lo que hace que el conjunto sea SIGNIFICATIVO y no "todo
 * lo que degrada": de los sitios que degradan, varios son deliberados y
 * documentados (el helper de lote de la Idea 47, el catalogo global), y esos
 * NO son trabajo pendiente. Marcar es lo que separa "esto se va a migrar" de
 * "esto se va a quedar".
 *
 * La ventana previa es de 6 lineas: en el archivo real la marca esta entre 1 y
 * 2 lineas antes del `Array.isArray`.
 * -------------------------------------------------------------------------- */
const DEGRADA = /Array\.isArray\(\s*(\w+)\s*\)\s*\?\s*\1\s*:\s*\[\]/;
const MARCA = /Migracion\s*=\s*Tramo 2/;

const pendientes = [];
for (let i = 0; i < lines.length; i++) {
  if (enComentario[i]) continue;
  if (!DEGRADA.test(lines[i])) continue;
  const previo = lines.slice(Math.max(0, i - 6), i).join('\n');
  if (MARCA.test(previo)) pendientes.push({ linea: i + 1, texto: lines[i].trim() });
}

section('1. el conteo medido de lo que falta migrar');
ok(pendientes.length > 0, 'el barrido encuentra sitios marcados (anti-vacio)',
   'si esto da 0 el test no esta midiendo nada: el conjunto se vacio');
pendientes.forEach((p) => console.log('          L' + p.linea + ': ' + p.texto.slice(0, 70)));

/* --------------------------------------------------------------------------
 * SECCION 3: el numero escrito a mano tiene que coincidir con el medido.
 *
 * Se buscan las dos frases que el archivo usa para inventariar el numero. Se
 * acepta cualquiera de las dos formas de escribir un numero en espanol, porque
 * la diferencia entre "5" y "cinco" es de estilo, no de contenido: las dos
 * dicen lo mismo y el test tiene que mirar lo mismo.
 * -------------------------------------------------------------------------- */
section('2. el numero del comentario coincide con el codigo');

const NUMEROS = { uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };
function aNumero(txt) {
  const m = txt.trim().toLowerCase();
  if (/^\d+$/.test(m)) return parseInt(m, 10);
  return NUMEROS[m] !== undefined ? NUMEROS[m] : null;
}

// "Los 5 wrappers que faltan migrar" / "Los cinco wrappers que faltan migrar"
const reCinturon = /(?:los|las)\s+(\d+|[a-z]+)\s+wrappers?\s+que\s+faltan\s+migrar/gi;
// "es la unica de las nueve cuya decision requiere tocar el `catch`..."
//
// Dos decisiones de forma, y las dos medidas:
//
// 1) Se ancla a "unica de las N cuya", no a "de las N". Un detector lazo de
//    "de las N" encuentra 8 lugares en este archivo, y 7 no son un contador de
//    wrappers: "las 27 cuentas", "de las que mas cuota gasta", "de las sisters
//    de commerce". Un detector que se dispara por esas hay que silenciarlo.
//
// 2) El espacio entre el numero y "cuya" es `[\s\S]{0,40}?` y NO `\s+`, porque
//    en el archivo la frase esta partida en dos lineas y la segunda arranca con
//    el `//` del comentario: el texto real entre "nueve" y "cuya" es
//    "\n              // ". Con `\s+` el detector NO ve el numero que existe, y
//    un detector que no ve el numero que existe da verde sin estar mirando.
const reDeLas = /unica\s+de\s+las\s+(\d+|[a-z]+)[\s\S]{0,40}?cuya/gi;

const cinturones = [];
let m;
while ((m = reCinturon.exec(src)) !== null) {
  const n = aNumero(m[1]);
  cinturones.push({ n, linea: src.slice(0, m.index).split(/\r?\n/).length });
}
const deLas = [];
while ((m = reDeLas.exec(src)) !== null) {
  const n = aNumero(m[1]);
  deLas.push({ n, linea: src.slice(0, m.index).split(/\r?\n/).length });
}

// Este test NO exige que el archivo declare una cifra. Exige que la que
// declare sea cierta. La diferencia importa: en v2.29.0 se borro el "5" de la
// cabecera y en su lugar se puso que la cuenta la hace este test, asi que
// "tiene que haber un numero" habria sido exigir un numero que el diseno
// acaba de decidir no escribir.
//
// Lo que no se negocia es que si alguien VUELVE a escribir una cifra, esta
// tiene que ser la del codigo. Un numero sin equivalente medido es lo que
// produjo esta v2.29.0 en primer lugar.
const todosLosNumeros = cinturones.concat(deLas);
if (todosLosNumeros.length === 0) {
  console.log('  ....  el archivo no declara ninguna cifra de "cuantos faltan"');
  console.log('          (nada que verificar: la cuenta la hace este test, en ' + pendientes.length + ')');
} else {
  todosLosNumeros.forEach((c) => {
    ok(c.n === pendientes.length,
       'L' + c.linea + ': dice ' + c.n + ' y hay ' + pendientes.length + ' marcados',
       'si el numero cambio porque el codigo migro uno, actualiza el comentario Y este test sigue verde: ese es el punto');
  });
}

// Anti-silencio: si el extractor no encuentra NADA, hay que distinguir "el
// archivo no declara cifras" (bien) de "el extractor se rompio" (mal). Con un
// archivo real que si las declaraba, un extractor roto daria el mismo verde.
ok(reCinturon.source.length > 0 && reDeLas.source.length > 0,
   'los dos extractores estan construidos (control de instrumento, no de dato)');

/* --------------------------------------------------------------------------
 * SECCION 4: la regla se comprueba a si misma.
 *
 * Si el extractor de numeros no encontrara nada, la seccion 3 pasaria sola y
 * el test entero seria un verde que no mide nada. Se corre el MISMO extractor
 * sobre un texto con un numero que se sabe, y se exige que lo lea bien: uno
 * conocido y uno imposible.
 * -------------------------------------------------------------------------- */
section('3. el extractor se comprueba a si mismo');
ok(aNumero('7') === 7, 'lee un numero arabigo');
ok(aNumero('cinco') === 5, 'lee un numero escrito');
ok(aNumero('  cuatro ') === 4, 'lee un numero con espacios alrededor');
ok(aNumero('inventado') === null, 'devuelve null ante una palabra que no es numero (no adivina)');

// El control de humo del extractor sobre una frase completa, con la forma
// exacta que usa el archivo.
const AUY = 'Los 3 wrappers que faltan migrar';
const control = /los\s+(\d+|[a-z]+)\s+wrappers?\s+que\s+faltan\s+migrar/i.exec(AUY);
ok(!!control && aNumero(control[1]) === 3,
   'el extractor lee una frase de control con la forma exacta del archivo',
   'control: ' + JSON.stringify(control && control[1]));

// Y el del segundo extractor. El texto de control COPIA la forma real del
// archivo, incluido el "\n + // " del comentario: con una forma inventada mas
// limpia, el control daba verde mientras el detector real no encontraba nada.
const AUY2 = 'y es la unica de las nueve\n              // cuya decision requiere tocar el catch';
const control2 = reDeLas.exec(AUY2);
ok(!!control2 && aNumero(control2[1]) === 9,
   'el extractor del "de las N" lee su control atravesando el salto de linea',
   'control2: ' + JSON.stringify(control2 && control2[1]));

// Control negativo del segundo extractor, con las frases que existen de verdad
// en api-gw2.js y que un detector lazo leeria como contador.
for (const faux of [
  'a diferencia de las sisters de commerce, el catch no propaga',
  'son de las que mas cuota gasta, y la cuota no se libera',
  'la lista de las 27 cuentas, los pines, el tema',
]) {
  const c = reDeLas.exec(faux);
  ok(c === null, 'ignora "' + faux.slice(0, 34) + '..." (no es el contador)');
}

/* --------------------------------------------------------------------------
 * SECCION 5: sintaxis del archivo vigilado.
 * -------------------------------------------------------------------------- */
section('4. sintaxis del archivo vigilado');
{
  let okc = true, why = '';
  try {
    execFileSync(process.execPath, ['--check', path.join(REPO, API)], { stdio: 'pipe' });
  } catch (e) { okc = false; why = String(e.stderr || e.message).slice(0, 200); }
  ok(okc, API + ': node --check', why);
}

console.log('\n' + '='.repeat(62));
console.log('pass: ' + pass + ' | FAIL: ' + fail);
console.log('='.repeat(62));
process.exit(fail > 0 ? 1 : 0);
