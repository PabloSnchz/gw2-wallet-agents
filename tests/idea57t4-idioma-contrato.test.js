/* tests/idea57t4-idioma-contrato.test.js
 *
 * El idioma del throw de FORMA es PARTE DEL CONTRATO, no texto decorativo.
 *
 * Dos consumidores lo leen por texto: raid-tracker.js:1749 y strike-tracker.js:1121
 * hacen `/forma no soportada/.test(error.message)` para decidir si la pista de
 * permiso tiene sentido. Un wrapper que degrade con OTRO texto hace que esa
 * pista aparezca donde no corresponde.
 *
 * Este test no mantiene una lista de wrappers: recorre TODOS los throw de FORMA
 * del archivo y exige que todos hablen el mismo idioma. Un wrapper nuevo entra
 * en el FAIL sin que nadie tenga que acordarse de actualizar una lista.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'js', 'api-gw2.js');
const src = fs.readFileSync(SRC, 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; console.log('FAIL: ' + name + (detail ? ' -> ' + detail : '')); }
}

/* ---------- SECCION 1: la palabra clave del contrato existe y es una sola -- */

const CLAVE = 'forma no soportada';
ok('la palabra clave del contrato esta en el archivo',
   src.indexOf(CLAVE) !== -1);

// Solo los throw que TIENEN ADJUNTO un guard de FORMA. Un `throw new Error`
// que no sigue a un `Array.isArray` es de otra cosa (deps faltantes, etc.) y no
// responde a este contrato. La primera version del test agarro todos los
// `throw new Error` del archivo y fallo con "WizardsVault no cargado", que no
// es un guard de forma: ese fue un bug del test, no del codigo.
const throws = [];
const re = /if \(!Array\.isArray\([^)]*\)\) \{([\s\S]{0,500}?)throw new Error\(([\s\S]{0,400}?)\);/g;
let m;
while ((m = re.exec(src)) !== null) throws.push(m[2]);

ok('hay al menos 3 throw de FORMA (characters, raids, luck)', throws.length >= 3,
   'encontrados: ' + throws.length);

const sinIdioma = throws.filter(t => t.indexOf(CLAVE) === -1);
ok('NINGUN throw de FORMA habla un idioma distinto', sinIdioma.length === 0,
   sinIdioma.length ? sinIdioma.length + ' sin la clave, ej: ' +
     JSON.stringify(sinIdioma[0].slice(0, 120)) : '');

/* ---------- SECCION 2: los tres wrappers conocidos, uno por uno ---------- */

// Corte por balance de llaves: el archivo tiene funciones anidadas (getAccountLuck
// vive dentro de otra), asi que cortar por "la proxima function" se come el cuerpo
// equivocado. Ese fue el bug de la primera version de este test.
function cuerpoDe(nombre) {
  const i = src.indexOf('function ' + nombre + '(');
  if (i === -1) return null;
  const abre = src.indexOf('{', i);
  if (abre === -1) return null;
  let depth = 0;
  for (let k = abre; k < src.length; k++) {
    const ch = src[k];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(i, k + 1);
    }
  }
  return null;
}

const WRAPPERS = [
  ['getCharacterCount', 'characters'],
  ['getAccountRaids', 'account/raids'],
  ['getAccountLuck', 'account/luck']
];

WRAPPERS.forEach(([nombre, endpoint]) => {
  const c = cuerpoDe(nombre);
  ok(nombre + ': existe', c !== null);
  if (!c) return;
  ok(nombre + ': su throw de FORMA usa el idioma del contrato',
     /throw new Error\(\s*['"][^'"]*forma no soportada/.test(c),
     'el idioma del contrato no esta en su guard de Array.isArray');
  // El prefijo con el nombre del endpoint: es lo que permite al consumidor
  // saber QUE fallo, no solo que fallo.
  ok(nombre + ': el mensaje identifica el endpoint (' + endpoint + ')',
     c.indexOf(endpoint) !== -1);
});

/* ---------- SECCION 3: los consumidores siguen filtrando por esa cadena ---- */

['raid-tracker.js', 'strike-tracker.js'].forEach(f => {
  const t = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  ok(f + ': su consumidor filtra por la clave del contrato',
     t.indexOf(CLAVE) !== -1);
});

console.log('\n' + (fail === 0 ? 'OK' : 'FALLOS') + ': ' + pass + ' pass, ' + fail + ' FAIL');
process.exit(fail === 0 ? 0 : 1);
