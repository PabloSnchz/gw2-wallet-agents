/* =======================================================================
 * tests/idea57.forma-contracts.test.js  —  Tramo 1 de la Idea 57 (PO, HB#12)
 *
 * Que NO resuelve, y por que existe igual:
 *   Siete wrappers de js/api-gw2.js (sobre 13 funciones de inventario/comercio
 *   revisadas; las demas ya propagan) convierten una respuesta con una forma
 *   no soportamos en un valor VÁCIDO (o en 0). El patron
 *   `Array.isArray(data) ? data : []` es el mas viejo del archivo y el mas
 *   repetido: la v2.24.0 lo corrigio en getAccountRaids, la v2.24.1 en
 *   getCharacterCount, y las DOS fueron encontradas de rebote (follow-up de
 *   un review, no un test). Es decir: la correccion de cada caso salio de
 *   casualidad, no de una regla. Sin una regla, el decimo wrapper existe.
 *
 *   Este test no arregla ninguno de los diez. Lo que hace es poner la regla:
 *   TODO sitio que degrada por FORMA tiene que DECLARAR su contrato, y el
 *   contrato se declara en el propio sitio. Un sitio sin contrato declarado
 *   es un FAIL, aunque se comporte "correcto" hoy.
 *
 *   Por que NO un helper central (expectArray()):
 *   porque agrega una dependencia nueva a diez funciones de una capa que
 *   hoy tiene dependencia cero entre wrappers, a cambio del mismo resultado
 *   que da un if. Un guard explicito se lee en el sitio donde falla.
 *
 * Que este test NO es:
 *   - No prueba comportamiento. No levanta fetch ni DOM. Es analisis
 *     estatico del fuente, que es la unica forma de preguntar "declaraste
 *     el contrato?" sin depender de que la API devuelva algo raro hoy.
 *   - No es la lista de wrappers. El test no sabe cuantos hay ni cuales:
 *     los descubre recorriendo el archivo. Por eso un wrapper NUEVO cae
 *     en el FAIL sin que nadie tenga que acordarse de actualizar nada.
 *
 * Como leer un FAIL:
 *   El sitio degradado no tiene etiqueta `FORMA:` en su bloque. Opciones:
 *   (a) el valor vacio es legitimo y hay que decirlo -> etiqueta
 *       `FORMA: degrada` + por que el vacio no engaia (o la deuda que si engaia).
 *   (b) el valor vacio engaia -> migrar al guard de la v2.24.0 y etiqueta
 *       `FORMA: propaga`. Eso es el Tramo 2 de la Idea 57 y va con
 *       veredicto del Reviewer: es capa de datos (ALERT-48).
 * ======================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const API = 'js/api-gw2.js';

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { console.log('  PASS  ' + label); pass++; }
  else { console.log('  FAIL  ' + label + (extra ? '\n          ' + extra : '')); fail++; }
}
function section(t) { console.log('\n[' + t + ']'); }

const src = fs.readFileSync(path.join(REPO, API), 'utf8');
const lines = src.split(/\r?\n/);

// --------------------------------------------------------------------------
// El patron que se busca. Se mantiene literal a proposito: cambiarlo cambia
// el alcance de la regla, y eso es una decision, no un refactor.
const DEGRADA = /Array\.isArray\(\s*(\w+)\s*\)\s*\?\s*\1\s*:\s*\[\]/g;

// Un sitio que solo aparece dentro de un comentario es DOCUMENTACION, no
// codigo: la cabecera de la v2.25.0 escribe el patron para explicar la regla,
// y el ejemplo de la Idea 47 lo escribe para explicarse a si mismo. Contarlos
// seria un falso positivo, y un test que se dispara por su propia documentacion
// es un test que hay que silenciar, que es como empiezan los tests muertos.
// La pregunta real es "este patron esta CORRIENDO en alguna parte".
//
// El estado del comentario de bloque se lleva de linea a linea: un `/** ... */`
// abre en una linea y cierra treinta despues, asi que mirar solo la linea del
// match daria siempre "no es comentario" para la linea 17 de la cabecera.
// Se ignoran los `//` dentro de un bloque y los `/*` dentro de una linea, que
// es lo que hacen los analizadores serios y lo que evita que un string con
// "/*" desactive el resto del archivo.
function lineaEnComentarioDeBloque(lineas) {
  const estado = new Array(lineas.length).fill(false);
  let abierto = false;
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    let dentro = abierto;
    for (let j = 0; j < l.length; j++) {
      if (!abierto && l[j] === '/' && l[j + 1] === '/') break;      // resto de la linea, fuera
      if (abierto) {
        if (l[j] === '*' && l[j + 1] === '/') { abierto = false; dentro = false; j++; }
        continue;
      }
      if (l[j] === '/' && l[j + 1] === '*') { abierto = true; dentro = true; j++; }
    }
    estado[i] = dentro;
    // Si la linea CERRO el bloque, lo que vino despues del cierre no cuenta.
    estado[i] = abierto || (estado[i] && !/\*\/\s*$/.test(l) ? true : estado[i]);
  }
  return estado;
}

const EN_COMENTARIO_BLOQUE = lineaEnComentarioDeBloque(lines);
function enComentario(idxLinea0based, texto) {
  if (/^\s*\/\//.test(texto)) return true;
  return EN_COMENTARIO_BLOQUE[idxLinea0based] === true;
}

// Verbos de contrato. `degrada` = el vacio es un estado legitimo y declarado.
// `propaga` = hay guard: el camino de forma lanza, no degrada.
const VERBO = /FORMA:\s*(degrada|propaga)/;

// --------------------------------------------------------------------------
section('1. el patron que la regla vigila sigue siendo el que esta en el codigo');

// Si el patron desapareciera del archivo entero, el test pasaria con 0 sitios
// y nadie lo notaria. Se exige que el archivo siga teniendo al menos un
// sitio, para que "0 hallazgos" nunca pueda confundirse con "0 wrappers".
const todos = [];
const enDocs = [];
let m;
DEGRADA.lastIndex = 0;
while ((m = DEGRADA.exec(src)) !== null) {
  const lineNo = src.slice(0, m.index).split(/\r?\n/).length;
  const texto = lines[lineNo - 1].trim();

  if (enComentario(lineNo - 1, texto)) { enDocs.push({ lineNo, texto }); continue; }

  // Funcion envolvente: la ultima declaracion `function X(` hasta esta linea.
  let fn = '(top-level)';
  for (let i = lineNo - 1; i >= 0; i--) {
    const f = lines[i].match(/^\s*function\s+([A-Za-z0-9_$]+)\s*\(/);
    if (f) { fn = f[1]; break; }
  }
  todos.push({ fn, lineNo, texto: lines[lineNo - 1].trim() });
}

ok(todos.length > 0, 'el patron de degradacion sigue presente en ' + API,
   'si esto falla, el patron cambio de forma: hay que revisar la regla, no el codigo');
console.log('        sitios que degradan por forma: ' + todos.length +
            (enDocs.length ? ' (+' + enDocs.length + ' menciones en comentarios, que no cuentan)' : ''));

// --------------------------------------------------------------------------
section('2. cada sitio que degrada DECLARA su contrato');

for (const s of todos) {
  // Se busca la etiqueta hacia atras desde la declaracion de la funcion, para
  // que valga tanto en el JSDoc como en un comentario sobre la linea.
  let declLine = -1;
  for (let i = s.lineNo - 1; i >= 0; i--) {
    if (new RegExp('^\\s*function\\s+' + s.fn + '\\s*\\(').test(lines[i])) { declLine = i; break; }
  }
  // Ventana del bloque: desde 30 lineas antes de la declaracion (el JSDoc vive
  // ahi) hasta la linea del sitio.
  const desde = Math.max(0, declLine - 30);
  const bloque = lines.slice(desde, s.lineNo).join('\n');
  const m2 = VERBO.exec(bloque);
  // EVITA el estado global de la ultima execucion.
  VERBO.lastIndex = 0;

  ok(!!m2, s.fn + ' (' + API + ':' + s.lineNo + ') declara su contrato de FORMA',
     'sin etiqueta FORMA: degrada | FORMA: propaga. ' +
     'El valor vacio es legitimo? -> declaralo. Engana? -> guard de la v2.24.0 (Tramo 2).');
  if (m2) {
    console.log('          declara: ' + m2[0].replace(/\s+/g, ' '));
  }
}

// --------------------------------------------------------------------------
section('3. los que ya tienen guard de la v2.24.0 no se cuentan dos veces');

// getAccountRaids y getCharacterCount ya PROPAGAN: no pueden tener el patron
// de degradacion. Si aparece, es una regresion silenciosa: alguien devolvio
// la guarda a `? data : []`.
for (const fn of ['getAccountRaids', 'getCharacterCount']) {
  const tiene = todos.some(s => s.fn === fn);
  ok(!tiene, fn + ' ya propaga la forma (no vuelvo a degradar a [])',
     tiene ? 'REGRESION: la guarda fue revertida a degradacion silenciosa' : '');
}

// Y el texto que emitted el guard tiene que seguir siendo el que los
// consumidores filtran (raid-tracker / strike-tracker, F1 de la Idea 56).
ok(src.indexOf("'account/raids: forma no soportada ('") !== -1,
   'el guard de getAccountRaids sigue emitiendo "account/raids: forma no soportada ("');
ok(src.indexOf("'characters: forma no soportada ('") !== -1,
   'el guard de getCharacterCount sigue emitiendo "characters: forma no soportada ("');

// --------------------------------------------------------------------------
section('4. la regla no se cumple a si misma por accidente');

// Si el test se encontrara sin sitios, pasaria sin comprobar nada. Ya se cubre
// arriba, pero se hace explicito el umbral: un barrido que baje de 7 sitios es
// un cambio de alcance y tiene que ser deliberado, no accidental.
//
// 8 -> 7 en el HB#113, DELIBERADO: el Tramo 2 de la Idea 57 aplico el guard de
// FORMA a getAccountBank y getAccountMaterials. Los 2 dejaron de degradar, o
// sea que este numero BAJO porque el codigo mejoro, no porque el barrido se
// achico. Ese es el unico motivo por el que se acepta un numero menor.
ok(todos.length >= 7, 'el alcance de la regla no se achico sin querer (>= 7 sitios)',
   'quedan ' + todos.length + ': si es a proposito, actualiza este numero y el porque en el header');

// --------------------------------------------------------------------------
section('5. sintaxis del archivo vigilado');
{
  const { execFileSync } = require('child_process');
  let okc = true, why = '';
  try {
    execFileSync(process.execPath, ['--check', path.join(REPO, API)], { stdio: 'pipe' });
  } catch (e) { okc = false; why = String(e.stderr || e.message).slice(0, 200); }
  ok(okc, API + ': node --check', why);
}

// --------------------------------------------------------------------------
console.log('\n' + '='.repeat(62));
console.log('pass: ' + pass + ' | FAIL: ' + fail);
console.log('='.repeat(62));
process.exit(fail > 0 ? 1 : 0);
