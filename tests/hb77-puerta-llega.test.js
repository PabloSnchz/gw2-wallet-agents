/* =======================================================================
 * tests/hb77-puerta-llega.test.js  —  el mensaje de la puerta LLEGA a Pablo
 *
 * El bug que este test persigue, y por que el test anterior no lovio:
 *   `tests/hb75-permisos.test.js` afirma que la puerta NOMBRA el permiso que
 *   falta y el motivo de cada uno. Eso es cierto — y sigue siendo cierto — pero
 *   es una afirmacion sobre la CONSTRUCCION del mensaje, no sobre lo que Pablo
 *   lee. Los dos son distintos, y entre la construccion y la pantalla hay un
 *   clasificador que reemplaza el texto:
 *
 *     app.js  parseKeyError()   if (/permisos/i.test(m))
 *                                return { msg: 'Faltan permisos: account + wallet' }
 *
 *   La puerta tira `new Error('La API key necesita permisos: ...')`, el catch del
 *   modal (app.js ~1154) lo pasa por parseKeyError, el regex matchea "permisos",
 *   y el mensaje detallado se reemplaza por "Faltan permisos: account + wallet"
 *   — los DOS permisos de antes de T1. O sea: la app le dice a Pablo que le
 *   faltan 2 permisos cuando de verdad le exigen 7, y le dice CUALES son los 2
 *   EquivOCOS. El modulo no tiene forma de avisar: el mensaje que describes el
 *   error nunca se muestra.
 *
 *   Mismo patron que el bug de `app.js:683` ("glifos") que reporta el PO en la
 *   ronda 22: el codigo es honesto y el texto que lo acompaña no. Ahi el texto
 *   nombra una funcionalidad muerta; aca nombra un permiso que ya no se exige.
 *
 * Por que la asercion se hace sobre el COMPORTAMIENTO y no sobre el fuente:
 *   Se extrae `parseKeyError` del fuente y se evalua como funcion pura con el
 *   mensaje que la puerta REALmente tira. Un assert de forma ("no aparece la
 *   cadena 'account + wallet'") pasaria por construccion en cuanto alguien
 *   reescribiera el clasificador, y no detectaria el defecto real (que el
 *   mensaje se pierda). El test evaluado falla si el mensaje vuelve cambiado.
 *
 * Alcance: analisis estatico + evaluacion de una funcion pura del fuente.
 *   No levanta DOM ni el IIFE completo (app.js depende de document y Storage).
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

/* --- Extraer `parseKeyError` del fuente y evaluarla como funcion pura.
   Se recorta por el balanced-brace de la funcion: el cuerpo puede contener
   regex con llaves, asi que contar llaves a pelo no alcanza; se cuentan
   ignorando lo que esta dentro de literales de cadena. */
function extraerFuncion(src, nombre) {
  const i = src.indexOf('function ' + nombre + '(');
  if (i < 0) return null;
  const abre = src.indexOf('{', i);
  let depth = 0, enStr = null, esc = false;
  for (let k = abre; k < src.length; k++) {
    const c = src[k];
    if (esc) { esc = false; continue; }
    if (enStr) {
      if (c === '\\') { esc = true; continue; }
      if (c === enStr) enStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { enStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(i, k + 1); }
  }
  return null;
}

const srcParse = extraerFuncion(app, 'parseKeyError');
ok(!!srcParse, 'se encontro parseKeyError en app.js');
// eslint-disable-next-line no-new-func
const parseKeyError = srcParse ? eval('(' + srcParse + ')') : () => ({});

section('1. el mensaje de la puerta tiene que LLEGAR, no ser reescrito');

/* El mensaje que la puerta REALmente tira. Se arma con la misma forma que
   app.js:829-833, con los 7 permisos de REQUIRED_PERMISSIONS. Si la lista de
   permisos cambia, este fixture se desactualiza — y por eso el test 2 falla
   en vez de dejar pasar un mensaje viejo. */
const REQUIRED = ['account', 'wallet', 'progression', 'unlocks',
                  'inventories', 'tradingpost', 'characters'];
const FALTAN = REQUIRED.slice(0, 5); // una key con solo account+wallet
const mensajePuerta = 'La API key necesita permisos: ' +
  FALTAN.join(', ') +
  '. La app usa ' + REQUIRED.length +
  ' permisos en total; hay que declararlos TODOS al crear la key en account.arena.net/application';

const r = parseKeyError({ message: mensajePuerta });
ok(r.msg === mensajePuerta,
   'el mensaje de la puerta llega INTACTO a la pantalla',
   'llego: ' + JSON.stringify(r.msg).slice(0, 120));

section('2. el mensaje no puede prometer 2 permisos cuando la puerta exige 7');
ok(!/\baccount\s*\+\s*wallet\b/.test(r.msg || ''),
   'el mensaje visible no dice "account + wallet" (los 2 de antes de T1)',
   'visible: ' + JSON.stringify(r.msg).slice(0, 120));
ok(!/\b2 permisos\b/.test(r.msg || ''),
   'el mensaje visible no dice "2 permisos"');
for (const s of FALTAN) {
  ok((r.msg || '').includes(s), 'el mensaje visible NOMBRA el permiso que falta: ' + s);
}

section('3. el clasificador NO puede pisar un mensaje que ya es especifico');
// Esta es la asercion de DIRECCION (ALERT-91): no afirmamos que el mensaje
// "no se parece a account + wallet" — afirmamos que lo que el codigo hace es
// conservarlo. Si manana la puerta se reescribe y tira otro mensaje, el test
// 1 vuelve a evaluarlo contra el fixture y avisa.
ok(r.msg === mensajePuerta && r.kind === 'perms',
   'el mensaje vuelve IDENTICO y con el mismo kind que antes de pasar por aca',
   'kind=' + r.kind);

/* Un mensaje de la API que NO es de la puerta: el clasificador tiene que
   seguir clasificando, no quedarse mudo. Esto es lo que impide que el fix
   sea "dejar de clasificar" en vez de "clasificar sin pisar". */
const otros = [
  ['Invalid access token (HTTP 401)', 'invalid'],
  ['HTTP 403 forbidden', 'forbidden'],
  ['HTTP 429 rate limit', 'rate'],
  ['fetch failed: error de conexion', 'network'],
];
for (const [msg, kindEsperado] of otros) {
  const rr = parseKeyError({ message: msg });
  ok(rr.kind === kindEsperado,
     'sigue clasificando "' + msg.slice(0, 34) + '" como ' + kindEsperado,
     'dio kind=' + rr.kind);
}

section('4. el caso 403 de la API (subtoken con allowlist) no es el de la puerta');
// La wiki de /v2/tokeninfo dice que un subtoken restringido puede devolver 403
// en algunos endpoints aunque pase la puerta. Ese 403 tiene que seguir siendo
// "forbidden", NO "permisos", porque el diagnostico es otro: la key esta bien,
// lo que falla es que el subtoken no llega a ese endpoint.
const r403 = parseKeyError({ message: 'HTTP 403' });
ok(r403.kind === 'forbidden', 'un 403 crudo sigue siendo forbidden, no perms',
   'kind=' + r403.kind);
ok(!/account\s*\+\s*wallet/.test(r403.msg || ''),
   'el 403 crudo no arrastra el mensaje de la puerta');

section('5. el texto de app.js:683 no puede prometer glifos (codigo muerto)');
// homestead-tracker.js es el UNICO consumidor de /v2/account/homestead/glyphs
// (medido: la unica otra mencion de "glifo" en js/ es esta misma linea) y no
// esta cargado en NINGUN .html, o sea que esa parte de la lista describe una
// funcionalidad que no se puede ver. El permiso `unlocks` SIGUE siendo
// necesario (lo piden /v2/account/luck y /v2/account/home/nodes, que si
// corren) — lo que no corresponde es prometer glifos.
ok(!/glifos/.test(app.match(/REQUIRED_PERMISSIONS:\s*\[[\s\S]*?\n\s*\],/)?.[0] || ''),
   'la lista de la puerta no nombra "glifos"');
ok(/nodo de home/.test(app.match(/REQUIRED_PERMISSIONS:\s*\[[\s\S]*?\n\s*\],/)?.[0] || ''),
   'la lista sigue nombrando "nodo de home" (si, se usa)');
ok(/Legendaria Imbuida/.test(app.match(/REQUIRED_PERMISSIONS:\s*\[[\s\S]*?\n\s*\],/)?.[0] || ''),
   'la lista sigue nombrando "Legendaria Imbuida" (si, se usa)');

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
