/*!
 * tests/idea55.characters-ach-layer.test.js
 *
 * Idea 55 Tramo 1 (PO, HB 08:15 UTC): de los 40 `fetch` crudos a
 * api.guildwars2.com, 9 son account-scoped y ninguno pasa por la capa
 * GW2Api. El que mas duele es characters.js:410.
 *
 *   /v2/account/achievements crudo en cada cambio de cuenta
 *     (wireGlobal -> gn:tokenchange, characters.js)
 *
 * ese mismo payload YA lo pide por la capa achievements.js:1058 y
 * activities.js:902. O sea: la app baja dos veces el objeto mas caro del
 * codebase, una cacheada (TTL 2 min, pool, retry) y otra sin nada de eso.
 *
 * Este test carga el archivo REAL de characters.js y verifica tres cosas:
 *   1. que loadAccountData() NO hace fetch crudo de /v2/account/achievements
 *   2. que usa root.GW2Api.getAccountAchievements (el wrapper que ya existe)
 *   3. que el fallo de ese endpoint NO aborta el resto de la funcion
 *      (el `if (achRes.ok)` de antes era un skip; el rechazo del wrapper es
 *      una excepcion, y sin catch propio se comeria el try de loadAccountData
 *      y dejaria PvP y WvW sin leer -> las 3 filas del header en '—')
 *
 * Ejecutar: node tests/idea55.characters-ach-layer.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
const src = fs.readFileSync(path.join(ROOT, 'js', 'characters.js'), 'utf8');

// ── 1. El fetch crudo tiene que estar OUT, en todo el archivo ──────────────
console.log('\n[1] characters.js no baja /v2/account/achievements con fetch crudo');

const rawAchFetches = (src.match(/fetch\(\s*['"`]https:\/\/api\.guildwars2\.com\/v2\/account\/achievements/g) || []).length;
ok(rawAchFetches === 0,
   '0 fetch crudo(s) de /v2/account/achievements en characters.js  <-- el fix (encontrados: ' + rawAchFetches + ')');

// La URL con access_token pegado a mano era la firma del bug. Si vuelve a
// aparecer en cualquier forma, el modulo se evadio de la capa otra vez.
ok(!/api\.guildwars2\.com\/v2\/account\/achievements\?access_token=/.test(src),
   'la URL del endpoint ya no se construye a mano en characters.js');

// ── 2. Se usa el wrapper, y el wrapper existe ─────────────────────────────
console.log('\n[2] loadAccountData() usa GW2Api.getAccountAchievements');

const iLoad = src.indexOf('async function loadAccountData(token)');
ok(iLoad !== -1, 'loadAccountData(token) sigue existiendo');
// La ventana llega hasta el separador de la seccion siguiente, para que el
// test cubra la funcion COMPLETA y no dependa de un ancho arbitrario.
const iNext = src.indexOf('// 8. GREMIOS', iLoad);
const body = iLoad === -1 ? '' : src.slice(iLoad, iNext === -1 ? iLoad + 6000 : iNext);

ok(/root\.GW2Api\.getAccountAchievements\(token\)/.test(body),
   'loadAccountData() llama a root.GW2Api.getAccountAchievements(token)');
// La INTENCION de esta asercion es que la suma no haya cambiado de SEMANTICA:
// sigue filtrando por `a.done` y sigue leyendo `a.current`. Lo que no debe
// permitirse es que alguien la cambie por, por ejemplo, sumar todos los logros.
//
// Por eso antes era un regex contra el texto EXACTO (`+= a.current;`), y por eso
// fallaba con el fix del NaN (Idea 78) que envuelve el valor en Number(...)||0.
// Un test que exige la forma literal no puede distinguir "cambio la semantica"
// de "arregle el mismo calculo", asi que ataba el fix sin proteger el motivo.
//
// Ahora se exigen las DOS mitades por separado: el filtro por `done` y la
// lectura de `current`. Y ademas la conversion, que es el contrato NUEVO:
// la GW2 API omite `current` en un completado sin tiers y sin convertir, la
// fila muestra NaN. Ver tests/idea78-puntos-logros-nan.test.js, que es el
// archivo que cubre ese bug con su propio round-trip.
ok(/if \(a\.done\)/.test(body) && /total \+= \(?Number\(a\.current\)/.test(body),
   'la suma de AP filtra por a.done y convierte a.current (mismo calculo, sin NaN)');

// El wrapper tiene que existir y tener el mismo contrato: mismo endpoint.
const apiSrc = fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf8');
ok(/function getAccountAchievements\(token, opts\)/.test(apiSrc),
   'el wrapper getAccountAchievements existe en api-gw2.js');
ok(/getAccountAchievements: getAccountAchievements/.test(apiSrc),
   'el wrapper esta exportado en la API publica de GW2Api');
ok(/var url = withToken\(CFG\.API_BASE \+ '\/v2\/account\/achievements', token\);/.test(apiSrc),
   'el wrapper pega al MISMO endpoint (/v2/account/achievements)');

// characters.js se carga con defer y api-gw2.js sin defer, asi que la capa
// esta cargada antes. Esto no lo prueba el archivo, lo comprueba index.html.
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const iApi = html.indexOf('js/api-gw2.js');
const iChar = html.indexOf('js/characters.js');
ok(iApi !== -1 && iChar !== -1 && iApi < iChar,
   'index.html carga api-gw2.js ANTES que characters.js (root.GW2Api existe al evaluar)');

// ── 3. El contrato de error: un fallo NO puede abortar loadAccountData ─────
console.log('\n[3] El fallo de logros no se come el resto de loadAccountData()');

// Antes: `if (achRes.ok) { ... }` -> un 401/500 solo saltaba ese bloque y la
// funcion seguia con PvP stats y account info. Con el wrapper, un fallo es un
// rechazo de Promise: sin catch propio, el `catch` del try EXTERNO lo aborta
// y las 3 filas del header quedan en '—'. Por eso el catch tiene que ser local.
const iCatch = body.indexOf('catch (achErr)');
ok(iCatch !== -1, 'hay un catch LOCAL para el fallo de logros  <-- el contrato');
ok(iCatch > -1 && iCatch < body.indexOf("Solicitando PvP stats"),
   'el catch local esta ANTES de la carga de PvP (no puede tragarsela)');

// Y el resto de la funcion tiene que seguir ahi, en orden.
ok(/pvp\/stats\?access_token=/.test(body), 'la carga de PvP stats sigue despues');
ok(/wvw\/ranks\?ids=all/.test(body), 'la resolucion de rango WvW sigue despues');
// SUPERSEDIDO por el Tramo 3a (HB#51): esta asercion exigia que /v2/account
// SIGUERA crudo en characters.js, y el Tramo 3a lo migro a GW2Api.getAccountInfo.
// Mantener la asercion vieja habria fijado el bug como invariante. Ahora lo que
// se exige es que la carga siga existiendo Y que pase por la capa; el detalle
// del contrato de error vive en tests/idea55.account-layer.test.js.
// Antes: ok(/\/v2\/account\?access_token=/.test(body), 'la carga de account info sigue despues');
ok(/getAccountInfo\(token\)/.test(body),
   'la carga de account info sigue despues y ahora pasa por la capa (Tramo 3a)');

// El `catch` del try externo tiene que seguir existiendo: sigue cubriendo
// PvP/account, que NO se migraron en este tramo.
ok(/catch \(e\) \{\s*console\.warn\(LOG, 'Error loading account data', e\);/.test(body),
   'el catch externo de loadAccountData sigue (cubre PvP y WvW, sin migrar)');

// ── 4. El bugter de index.html subio con el fix (ALERT-24 / REGLA 2) ───────
console.log('\n[4] El buster subio en el MISMO commit (ALERT-24, REGLA 2)');

const mChar = html.match(/js\/characters\.js\?v=([\d.]+)/);
ok(!!mChar, 'index.html sigue cargando characters.js con buster de version');
ok(mChar && mChar[1] === '2.4.1',
   'el buster es 2.4.1, la version vigente  (encontrado: ' + (mChar ? mChar[1] : '?') + ')');
ok(/js\/characters\.js — Panel de Personajes y Localización\s*\n \* v2\.4\.1/.test(src),
   'la cabecera del archivo declara v2.4.1');
ok(/CAMBIOS v2\.4\.0 \(Idea 55 Tramo 1\)/.test(src),
   'la cabecera documenta el Tramo 1 y su motivo');
ok(/CAMBIOS v2\.4\.1 \(Idea 55 Tramo 3a\)/.test(src),
   'la cabecera documenta el Tramo 3a y su motivo');

// ── 5. Lo que el tramo NO toca (para que un merge a ciegas no lo revierta) ─
console.log('\n[5] Lo que el Tramo 1 deja intacto a proposito');

ok(!/nocache/.test(body), 'no se pasa nocache: el TTL de 2 min es el comportamiento correcto aqui');
const otherRaw = (src.match(/api\.guildwars2\.com\/v2\/account\??(?!achievements)/g) || []).length
               + (src.match(/api\.guildwars2\.com\/v2\/pvp\/stats/g) || []).length;
ok(otherRaw > 0,
   'los OTROS endpoints account-scoped crudos siguen fuera de la capa (son el Tramo 3) — hallados: ' + otherRaw);

// ── resumen ───────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────');
console.log('  ' + pass + ' pass / ' + fail + ' FAIL');
console.log('─────────────────────────────────────────');
process.exit(fail ? 1 : 0);
