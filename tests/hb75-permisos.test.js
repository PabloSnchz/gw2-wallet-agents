/* =======================================================================
 * tests/hb75-permisos.test.js  —  la puerta de permisos y el formato de key
 *
 * Que NO cambiamos, y por que el problema es real:
 *   `KeyManager.addOrUpdate` (js/app.js) validaba la key contra SOLO
 *   `account` + `wallet`, y el modal de index.html le decia a Pablo que
 *   declarara esos 2. Pero la app llama endpoints con scope que la wiki
 *   declara en otros permisos: /v2/account/achievements pide
 *   `progression`, /v2/characters pide `characters`, /v2/account/bank pide
 *   `inventories`, /v2/commerce/delivery pide `tradingpost`, y asi.
 *   Medido: 1 de los endpoints con scope funciona con account+wallet.
 *   Con una key de 2 permisos, la API responde 403 y la capa degrada a
 *   []/0, o sea que la cuenta parece VACIA en lugar de mal configurada
 *   (Idea 47 / Idea 57). La app autorizaba una key que no puede usar.
 *
 *   El texto era la parte que producia el bug: la instruccion, no el codigo.
 *
 * Formato de key: la API responde 401 "Invalid access token" a TODO lo que se
 *   le mande (medido con 5 formatos distintos), o sea que no da ninguna señal.
 *   La evidencia del formato viene de la documentacion: /v2/tokeninfo dice
 *   que su campo `id` es "the first HALF of the API key" y su ejemplo oficial
 *   son 36 chars (8-4-4-4-12 en hex), de modo que la key completa son dos GUID
 *   unidos por un guion. Un regex de 48 chars rechaza keys reales; el de 36
 *   acepta el `id` que devuelve /v2/tokeninfo. Por eso el 2do bloque es
 *   opcional y el 1ro obligatorio.
 *
 * Alcance de los asserts: analisis estatico sobre el fuente mas evaluacion
 *   del regex como funcion pura. No levantan DOM ni el modulo completo
 *   (app.js es un IIFE que depende de document y Storage).
 *
 * La lista de permisos NO esta escrita a mano en el test: se deriva de la
 *   MISMA tabla de endpoints con su scope medido, y se comprueba que la
 *   puerta cubra la union completa. Si manana aparece un endpoint que pide
 *   un scope nuevo, este test avisa en vez de dejar la puerta a medio camino.
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
const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');

/* --- 1. Los endpoints con scope que la app llama, y el scope MEDIDO de cada
   uno. NO es memoria: cada valor salio del campo `scope=` del infobox
   `{{API endpoint infobox}}` de la pagina API:2/<ruta> de la wiki oficial,
   leida con ?action=raw (tools/hb75-scopes.js y hb75-scopes2.js). */
const ENDPOINTS_CON_SCOPE = {
  '/v2/account/wallet':                 'account, wallet',
  '/v2/account/achievements':           'account, progression',
  '/v2/account/luck':                   'account, progression, unlocks',
  '/v2/account/raids':                  'account, progression',
  '/v2/account/legendaryarmory':        'account, unlocks, inventories',
  '/v2/account/home/nodes':             'account, progression, unlocks',
  '/v2/account/homestead/decorations':  'account, unlocks',
  '/v2/account/homestead/glyphs':       'account, unlocks',
  '/v2/account/bank':                   'account, inventories',
  '/v2/account/materials':              'account, inventories',
  '/v2/account/dailycrafting':          'account, progression',
  '/v2/account/mapchests':              'account, progression',
  '/v2/account/worldbosses':            'account, progression',
  '/v2/commerce/delivery':              'account, tradingpost',
  '/v2/commerce/transactions':          'account, tradingpost',
  '/v2/characters':                     'account, characters',
  '/v2/characters/:id/inventory':       'account, characters, inventories',
  '/v2/tokeninfo':                      'account',
};

section('1. cobertura: la puerta exige la UNION de los scopes medidos');

const unionScopes = new Set();
for (const ruta of Object.keys(ENDPOINTS_CON_SCOPE)) {
  ENDPOINTS_CON_SCOPE[ruta].split(',').forEach(s => unionScopes.add(s.trim()));
}
const required = [...unionScopes].sort();

// Extraer del fuente la lista que declara la puerta, leyendo los `scope:` del
// array REQUIRED_PERMISSIONS. Se toma del CODIGO, no de la prosa: el bloque
// esta delimitado por los marcadores, y un `scope` que aparece solo en un
// comentario no cuenta.
// El bloque se busca como PROPIEDAD del literal (`REQUIRED_PERMISSIONS: [`),
  // no como `const` suelta: la lista vive dentro de `const KeyManager = {`
  // porque `tests/idea64-dos-pestanas.test.js` monta ese literal en un sandbox
  // `vm` extrayendolo por equilibrio de llaves, y una const declarada fuera del
  // rango no existia en el sandbox (ReferenceError). El regex sigue leyendo el
  // CODIGO, que es lo que importa: un `scope` que solo aparece en un comentario
  // no cuenta.
  const bloque = app.match(/REQUIRED_PERMISSIONS:\s*\[([\s\S]*?)\n\s*\],/);
ok(!!bloque, 'existe el bloque REQUIRED_PERMISSIONS en app.js');
const enCodigo = bloque
  ? [...bloque[1].matchAll(/scope:\s*'([a-z]+)'/g)].map(m => m[1])
  : [];
const enCodigoUnicos = [...new Set(enCodigo)].sort();

ok(enCodigoUnicos.length === required.length,
   'la puerta declara tantos permisos como la union de los scopes medidos',
   'puerta=' + enCodigoUnicos.length + ' union=' + required.length);
for (const s of required) {
  ok(enCodigoUnicos.includes(s), 'la puerta exige ' + s);
}
for (const s of enCodigoUnicos) {
  ok(unionScopes.has(s), 'el permiso ' + s + ' lo pide de verdad algun endpoint (no sobra)');
}

section('2. la puerta NO debe volver a la lista parcial de 2');
// El bug original: `!perms.has('account') || !perms.has('wallet')`. Si vuelve a
// aparecer esa forma, la puerta autorizo una key que la app no puede usar.
ok(!/!\s*perms\.has\(\s*'account'\s*\)\s*\|\|/.test(app),
   'no existe el chequeo parcial "falta account || falta wallet"');
ok(/FALTAN\s*=\s*KeyManager\.REQUIRED_PERMISSIONS\.filter/.test(app),
   'la puerta deriva de la lista completa, no de un condicional a mano');
ok(/FALTAN\.map\(\s*p\s*=>\s*p\.scope/.test(app),
   'el mensaje NOMBRA el permiso que falta (no dice "permisos invalidos")');
ok(/p\.para/.test(app),
   'el mensaje dice para que modulo sirve cada permiso (accionable)');

section('3. T1b: el regex de formato acepta las keys reales y rechaza la basura');
// El regex tal como esta en el fuente, extraido para no duplicar la constante.
const m = app.match(/function isValidKeyFormat\(v\)\s*\{\s*return\s*(\/.*\/)\.test\(v\)/);
ok(!!m, 'isValidKeyFormat devuelve una regex');
const re = m ? eval(m[1]) : /$/;

const KEY_73 = '1A2B3C4D-5E6F-7A8B-9C0D-1E2F3A4B5C6D-7E8F9A0B-1C2D-3E4F-5A6B-7C8D9E0F1A2B';
const ID_36 = 'ABCDE02B-8888-FEBA-1234-DE98765C7DEF';

ok(re.test(KEY_73), 'acepta la key real (dos GUID, 73 chars)');
ok(re.test(ID_36), 'acepta el id de /v2/tokeninfo (un GUID, 36 chars)');
ok(!re.test('ABCDE02B-8888-FEBA-1234-DE98-765C7DEF-1122-3344'),
   'rechaza el formato de 9 bloques de 4 (48 chars): NO es el de GW2');
ok(!re.test('estaesunaclaveinventada1234567890'), 'rechaza basura alfanumerica');
ok(!re.test('AAAAAAAAAAAAAAAAAAAA'), 'rechaza 20 caracteres de basura');
ok(!re.test('mi-clave-principal-de-la-app'), 'rechaza el nombre de una cuenta');
ok(!re.test('1A2B3C4D-5E6F-7A8B-9C0D-1E2F3A4B5C6D-7E8F9AOB-1C2D-3E4F-5A6B-7C8D9E0F1A2B'),
   'rechaza una O en vez de un 0 (no es hexadecimal)');
ok(!re.test('1A2B3C4D--5E6F-7A8B-9C0D-1E2F3A4B5C6D-7E8F9A0B-1C2D-3E4F-5A6B-7C8D9E0F1A2B'),
   'rechaza un guion de mas');
ok(!re.test('1A2B3C4D-5E6F-7A8B-9C0D-1E2F3A4B5C6D7E8F9A0B-1C2D-3E4F-5A6B-7C8D9E0F1A2B'),
   'rechaza un guion de menos');
ok(!re.test('1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B'),
   'rechaza una key sin guiones');
ok(!re.test(''), 'rechaza cadena vacia');
ok(!re.test('  ' + KEY_73 + '  '), 'rechaza espacios alrededor (la UI hace trim antes)');

// La guarda anterior: 20+ alfanumericos. Se conserva el dato de que fallaba,
// no su codigo. Debe fallar TODOS los casos que no son key.
const LAXO = /^[A-Za-z0-9_-]{20,}$/;
const noKeys = ['ABCDE02B-8888-FEBA-1234-DE98-765C7DEF-1122-3344', 'estaesunaclaveinventada1234567890',
  'AAAAAAAAAAAAAAAAAAAA', 'mi-clave-principal-de-la-app',
  '1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B'];
ok(noKeys.every(k => LAXO.test(k)),
   'el regex laxo anterior pasaba los ' + noKeys.length + ' casos que no son key (por eso hay guarda)');
ok(!noKeys.some(k => re.test(k)), 'el regex nuevo no pasa ninguno de esos ' + noKeys.length);

section('4. T3: el modal de index.html dice los 7, no 2');
ok(!/Requiere permisos <code>account<\/code> y <code>wallet<\/code>/.test(html),
   'el texto viejo ("account y wallet") no esta mas');
for (const s of required) {
  ok(html.includes('<code>' + s + '</code>'),
     'el modal menciona el permiso ' + s);
}
ok(/account\.arena\.net\/applications/.test(html),
   'el modal dice DONDE se declaran los permisos');

section('5. el mensaje de formato no promete algo que el regex no cumple');
ok(!/20 caracteres alfanumericos/.test(app), 'nada promete "20 caracteres alfanumericos"');
ok(/8-4-4-4-12/.test(app), 'el mensaje nombra el formato que el regex realmente exige');

// ---------------------------------------------------------------------------
// Seccion 6 (HB#91): la puerta por COMPORTAMIENTO, no por forma.
//
// Las secciones 1 y 2 affirmaron que la puerta exige la lista completa
// leyendo el TEXTO: que `FALTAN` derive de `REQUIRED_PERMISSIONS` y que no
// exista el condicional parcial de 2. Eso es analisis estatico, y alcanza
// para decir que el codigo esta escrito asi -- no que la puerta RECHACE una
// key de 2 permisos.
//
// La diferencia no es academica: el PO (rondas 21, 22 y la 27) afirmo tres
// veces que la puerta acepta account+wallet, y lo medico extrayendo y
// evaluando una condicion. La condicion que extrajo ya no existe, y la puerta
// hoy la rechaza. El hallazgo era real como descripcion y no esta en el
// codigo. Lo que faltaba era el assert que lo hubiera mostrado al primer
// heartbeat en lugar de al cuarto.
//
// Se evalua la condicion REAL extraida del fuente (no una copia), con un
// caso que DEBE pasar y otro que DEBE fallar: si los dos dieran el mismo
// veredicto, el arnes estaria roto y el assert no valdría nada.
// ---------------------------------------------------------------------------
section('6. HB#91: la puerta RECHAZA por comportamiento una key de 2 permisos');

const tablaM = app.match(/REQUIRED_PERMISSIONS:\s*\[([\s\S]*?)\]/);
ok(!!tablaM, 'se puede leer REQUIRED_PERMISSIONS del fuente');
const TABLA = tablaM ? eval('[' + tablaM[1] + ']') : [];

// La linea de la puerta, tal cual esta escrita. Sin reescribirla.
const lineaM = app.match(/const FALTAN = (KeyManager\.REQUIRED_PERMISSIONS\.filter\([^;]+;)/);
ok(!!lineaM, 'se puede leer la linea FALTAN del fuente');
// `perms` y `REQUIRED_PERMISSIONS` entran como parametros: la condicion se
// evalua dentro de un scope propio, sin tocar el texto.
const FALTAN = lineaM
  ? new Function('perms', 'REQUIRED_PERMISSIONS',
      'const KeyManager = { REQUIRED_PERMISSIONS };\nreturn ' +
      lineaM[1].replace(/;$/, '') + ';')
  : null;

if (FALTAN) {
  const scopes = TABLA.map(p => p.scope);

  // El caso del PO: account + wallet, los 2 que el modal viejo decia.
  const dos = FALTAN(new Set(['account', 'wallet']), TABLA);
  ok(dos.length > 0,
     'una key con SOLO account+wallet es RECHAZADA (no es lo que el PO midio)');
  ok(dos.length === TABLA.length - 2,
     'faltan exactamente los ' + (TABLA.length - 2) + ' permisos de los ' + TABLA.length +
     ' que la app usa (no sobra ni falta ninguno)');

  // CONTROL: sin esto, "rechaza" podria ser un `return false` constante.
  const todos = FALTAN(new Set(scopes), TABLA);
  ok(todos.length === 0,
     'una key con los ' + TABLA.length + ' permisos de la app PASA (control: la puerta discrimina)');

  // La puerta debe tolerar permisos de mas: /v2/tokeninfo devuelve la lista
  // completa de la key, que puede traer scopes que la app no usa.
  const extras = FALTAN(new Set([...scopes, 'inventories.read']), TABLA);
  ok(extras.length === 0, 'tolera permisos que la app no usa (no es lista exacta)');

  // Y la vacia, que es el otro extremo.
  ok(FALTAN(new Set([]), TABLA).length === TABLA.length,
     'una key sin NINGUN permiso es rechazada por los ' + TABLA.length);

  // El mensaje de la puerta tiene que nombrar el permiso que falta: si
  // alguien deja de usar `p.scope`, Pablo ve un mensaje inaccionable.
  ok(dos.some(p => p.scope === 'characters') && dos.some(p => p.scope === 'progression'),
     'la lista de faltantes nombra los permisos concretos, no un texto generico');
}

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
