/* =======================================================================
 * tests/idea56.f1-hint-permiso.test.js  —  F1 del Code-Reviewer
 * (task-b20623f46caa, follow-up 1 de la revisión de la Idea 56)
 *
 * Que NO cambiamos, y por que el problema es real:
 *   Desde la v2.24.0 `getAccountRaids` puede rechazar por FORMA, no solo por
 *   RED. En ese caso el permiso `progression` esta PERFECTO, asi que el texto
 *   "Verificá que la API key tenga permiso progression" manda a Pablo a
 *   borrar y re-agregar la key. Eso es el bucle hostil de ALERT-32.
 *   El mensaje de forma ya viaja en error.message (el guard lo lanza), asi que
 *   la informacion no se pierde: lo que hay que evitar es la PISTA enganosa.
 *
 * Estos tests son de analisis estatico sobre el fuente: no levantan DOM ni
 * el modulo completo. Es lo que corresponde para una condicion que se
 * evalua en el catch de un async que ya fue ejercitado por
 * tests/idea56.forma-raids.test.js (20 aserciones, capa de datos).
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

const CONSUMERS = [
  { file: 'js/raid-tracker.js',   verb: 'raids'   },
  { file: 'js/strike-tracker.js', verb: 'strikes' }
];

// El texto de la pista que el Reviewer marco como enganosa.
const PISTA_PERMISO = 'tenga permiso';

const src = {};
for (const c of CONSUMERS) {
  src[c.file] = fs.readFileSync(path.join(REPO, c.file), 'utf8');
}

// ------------------------------------------------------------------
section('1. la pista de permiso NO es incondicional en ningun consumidor');

for (const c of CONSUMERS) {
  const s = src[c.file];

  // La condicion tiene que existir
  ok(/forma no soportada/.test(s),
     c.file + ': filtra por "forma no soportada" antes de decidir la pista');

  // Y la pista tiene que quedar en la rama que NO es forma.
  // Extraemos el bloque del hint y exigimos que la rama de forma sea ''.
  const m = s.match(/var hint = \/forma no soportada\/[^;]*;/);
  ok(!!m, c.file + ': el hint es una expresion condicional (no un literal fijo)');

  if (m) {
    const expr = m[0];
    // La expresion es multilinea. El ternario real es:
    //   var hint = <cond> \n  ? '' \n  : '<br><small>...permiso...</small>';
    // Se separa por el "? ''" que abre la rama de FORMA.
    const sep = expr.indexOf("? ''");
    ok(sep !== -1, c.file + ': la rama de FORMA es el literal vacio');

    if (sep !== -1) {
      const formaBranch = expr.slice(sep + 2, expr.indexOf(':', sep)).trim();
      const elseBranch = expr.slice(expr.indexOf(':', sep) + 1);

      ok(formaBranch.replace(/'/g, '').trim() === '',
         c.file + ': la rama de FORMA devuelve hint vacio (no engana con la key)',
         'rama forma = ' + JSON.stringify(formaBranch));
      ok(elseBranch.indexOf(PISTA_PERMISO) !== -1,
         c.file + ': la rama de NO-forma conserva la pista de permiso real');
      ok(elseBranch.indexOf('<br>') !== -1,
         c.file + ': el <br> va DENTRO de la pista, no queda colgando en la de forma');
    }
  }
}

// ------------------------------------------------------------------
section('2. el mensaje real de la forma sigue llegando (no se perdio info)');

for (const c of CONSUMERS) {
  const s = src[c.file];
  // El catch debe seguir interpolando error.message en el HTML.
  ok(new RegExp('Error al cargar datos de ' + c.verb + ': \\$\\{esc\\(error\\.message\\)\\}').test(s),
     c.file + ': el mensaje de error (con la causa) sigue en la primera linea');
}

// ------------------------------------------------------------------
section('3. el filtro matchea el texto que EMITE el guard de la v2.24.0');

const apiSrc = fs.readFileSync(path.join(REPO, 'js/api-gw2.js'), 'utf8');
const guardRaids = apiSrc.indexOf("'account/raids: forma no soportada ('");
const guardCharc = apiSrc.indexOf("'characters: forma no soportada ('");
ok(guardRaids !== -1, 'api-gw2.js: el guard de getAccountRaids emite "account/raids: forma no soportada ("');
ok(guardCharc !== -1, 'api-gw2.js: el guard de getCharacterCount emite "characters: forma no soportada ("');

// El consumidor de raids debe matchear el prefijo del guard de raids.
ok(/forma no soportada/.test(src['js/raid-tracker.js']) && guardRaids !== -1,
   'el filtro del consumidor de raids matchea el texto real de su guard');

// ------------------------------------------------------------------
section('4. NO se toco el otro texto de permiso (seleccion de key), que SI es correcto');

// Las lineas de "Selecciona una API Key ... Requiere permiso progression"
// son un caso DISTINTO (no hay key, no hubo request) y no deben cambiar.
for (const c of CONSUMERS) {
  const s = src[c.file];
  ok(/Requiere permiso "progression"/.test(s),
     c.file + ': intacto el aviso de "sin API key seleccionada" (caso legitimo)');
  ok(!/Seleccioná una API Key[^\n]*hint/.test(s),
     c.file + ': el aviso de key sin seleccionar no recibio el filtro');
}

// ------------------------------------------------------------------
section('5. sintaxis: los dos archivos siguen parseando');

const { execFileSync } = require('child_process');
for (const c of CONSUMERS) {
  let okc = true, why = '';
  try {
    execFileSync(process.execPath, ['--check', path.join(REPO, c.file)],
                 { stdio: 'pipe' });
  } catch (e) { okc = false; why = String(e.stderr || e.message).slice(0, 200); }
  ok(okc, c.file + ': node --check', why);
}

// ------------------------------------------------------------------
section('6. sintaxis de los template literals (verificada arriba en [5])');

// ------------------------------------------------------------------
console.log('\n' + '='.repeat(62));
console.log('pass: ' + pass + ' | FAIL: ' + fail);
console.log('='.repeat(62));
process.exit(fail > 0 ? 1 : 0);
