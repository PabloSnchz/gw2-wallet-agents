/* =======================================================================
 * tests/idea57t3-jsdoc-honesto.test.js  --  Tramo 3 de la Idea 57 (PO)
 *
 * Que resuelve, y por que es el mas barato de los tres tramos:
 *   El Tramo 1 puso la REGLA de FORMA (cada sitio que degrada declara su
 *   contrato). El Tramo 2 es el fix de comportamiento, y va al Reviewer
 *   porque es capa de datos (ALERT-48).
 *
 *   Este es el Tramo 3 y NO cambia comportamiento: corrige documentacion.
 *   Antes de el, seis wrappers tenian un `@throws` que decia "propaga, no
 *   degrada a []" mientras el codigo tres lineas mas abajo hacia
 *   `Array.isArray(data) ? data : []`. El comentario FORMA que explicaba la
 *   contradiccion estaba a ~40 lineas del `@throws`, o sea que leer el
 *   contrato de la funcion (lo que hace cualquier consumidor, y lo que hizo
 *   el Code Reviewer al encontrar el bug de getCharacterCount) daba la
 *   respuesta OPUESTA a la real.
 *
 *   Ese es el mecanismo por el que nace el wrapper siguiente: no es que
 *   nadie mire, es que el que mira lee un contrato falso.
 *
 * Que NO es:
 *   - No verifica comportamiento. No levanta fetch ni DOM. Es analisis
 *     estatico del fuente, igual que el Tramo 1.
 *   - No es una lista de wrappers. El test recorre el archivo.
 *
 * Como leer un FAIL:
 *   Un `@throws` (o `@returns`) que promete "no degrada" en una funcion que
 *   despues hace `Array.isArray(x) ? x : []`. El arreglo NO es cambiar el
 *   `@throws` para que mienta menos: es hacer que describa LAS DOS capas,
 *   como hacen los seis ya corregidos.
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

// Se buscan las funciones cuyo JSDoc (el bloque que precede a
// `function X(`) promete que NO degrada.
const PROMESA = /no\s+degrada\s+a\s+(\[\]|0)/i;

// El patron que degrada, el mismo del Tramo 1.
const DEGRADA = /Array\.isArray\(\s*(\w+)\s*\)\s*\?\s*\1\s*:\s*(\[\]|0)/g;

// --------------------------------------------------------------------------
section('1. ningun JSDoc promete "no degrada" en una funcion que degrada');

const funciones = [];
for (let i = 0; i < lines.length; i++) {
  const decl = lines[i].match(/^\s*function\s+([A-Za-z0-9_$]+)\s*\(/);
  if (decl) funciones.push({ fn: decl[1], declLine: i });
}

// El JSDoc es el bloque `/** ... */` mas cercano por encima de la
// declaracion. Dos trampas, y las dos seelvieron primero:
//
//  1) Ventana fija: getCommerceDelivery tiene un JSDoc de ~35 lineas (la
//     justificacion de por que el error tiene que propagar). Una ventana de
//     40 cortaba justo antes de la apertura y lo declaraba "sin JSDoc", o sea
//     invisible para el test. Por eso no hay ventana.
//
//  2) Ventana SIN tope es peor: al buscar hacia arriba sin parar, la busqueda
//     se sale de la funcion y agarra el JSDoc de la ANTERIOR. Asi que
//     getAccountLuck (que no tiene JSDoc) aparecia como si tuviera el de
//     getAccountWallet. Por eso el tope es el borde de la funcion: se corta
//     en la linea que cierra el cuerpo anterior (`}` a sangria de funcion) o
//     en otra declaracion de funcion.
const CIERRE_FN = /^\s{0,2}\}\s*$/;
const DECL_FN = /^\s{0,4}function\s+[A-Za-z0-9_$]+\s*\(/;

function jsdocDe(f) {
  for (let i = f.declLine - 1; i >= 0; i--) {
    const t = lines[i];
    if (CIERRE_FN.test(t) || DECL_FN.test(t)) return '';   // se acabo la funcion
    if (t.trim().indexOf('/**') !== -1) return lines.slice(i, f.declLine).join('\n');
  }
  return '';
}

function cuerpoDe(f) {
  for (let i = f.declLine + 1; i < lines.length; i++) {
    const d = lines[i].match(/^\s*function\s+([A-Za-z0-9_$]+)\s*\(/);
    if (d && d[1] !== f.fn) return lines.slice(f.declLine, i).join('\n');
  }
  return lines.slice(f.declLine).join('\n');
}

const enContradiccion = [];
for (const f of funciones) {
  const doc = jsdocDe(f);
  if (!PROMESA.test(doc)) continue;             // no promete nada: no hay contradiccion
  DEGRADA.lastIndex = 0;
  const degrada = DEGRADA.test(cuerpoDe(f));
  DEGRADA.lastIndex = 0;
  if (degrada) enContradiccion.push(f.fn + ' (' + API + ':' + (f.declLine + 1) + ')');
}

ok(enContradiccion.length === 0,
   'ningun @throws promete lo que el codigo no cumple',
   'prometen no-degrada pero degradan: ' + enContradiccion.join(', '));
if (enContradiccion.length) {
  console.log('          el arreglo NO es borrar la promesa: es describir las DOS');
  console.log('          capas (RED propaga / FORMA degrada) como los ya corregidos.');
}

// --------------------------------------------------------------------------
section('2. los seis JSDoc corregidos dicen las dos capas, no solo la promesa');

// Si un @throws se "arregla" borrando la promesa, el FAIL de arriba pasa y
// el contrato vuelve a no estar escrito en ningun lado. Se exige que el
// texto nuevo mencione las dos capas explicitamente.
const CAPAS = /capa de RED|capa de FORMA|RED propaga|FORMA degrada/;
const CORREGIDOS = [
  'getCommerceTransactionsBuys',
  'getCommerceTransactionsSells',
  'getCommerceDelivery',
  'getAccountBank',
  'getAccountMaterials',
  'getAccountLegendaryArmory',
];
for (const fn of CORREGIDOS) {
  const f = funciones.find(x => x.fn === fn);
  if (!f) { ok(false, fn + ': existe en ' + API); continue; }
  ok(CAPAS.test(jsdocDe(f)), fn + ': su @throws describe RED y FORMA por separado',
     'un @throws que solo dice "no degrada" deja el contrato otra vez en un comentario');
}

// --------------------------------------------------------------------------
section('3. la regla no se cumple a si misma por accidente');

// Si el test no encontrara ninguna funcion con JSDoc, pasaria sin comprobar
// nada. Se exige que el archivo siga teniendo varias.
ok(funciones.length >= 10,
   'el archivo sigue teniendo funciones que verificar (>= 10 declaradas)',
   'quedan ' + funciones.length + ': si es a proposito, revisar el alcance de este test');

// Y que queden las seis marcas del Tramo 3 aplicadas, para que una reversion
// silenciosa del JSDoc caiga en FAIL y no pase desapercibida.
const marcas = (src.match(/capa de RED/gi) || []).length;
ok(marcas >= 6, 'los seis @throws corregidos siguen declarando "capa de RED"',
   'quedan ' + marcas + ': si es a proposito, actualizar el porque en el header');

// getAccountLuck queda fuera de los seis a proposito: no tiene JSDoc, y su
// problema no es documental sino de representacion (0 vs "sin dato"), que
// decide el Tramo 2 con el Reviewer. Se comprueba que siga sin JSDoc, para
// que nadie lo "complete" con una promesa nueva sin veredicto.
{
  const f = funciones.find(x => x.fn === 'getAccountLuck');
  ok(!!f && jsdocDe(f).trim() === '',
     'getAccountLuck sigue SIN JSDoc (su problema es 0 vs "sin dato", no textual)',
     'agregar un @throws que prometa no-degrada sin el veredicto del Reviewer ' +
     'reintroduce el bug de documentacion que este test evita');
}

// --------------------------------------------------------------------------
section('4. sintaxis del archivo vigilado');
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
