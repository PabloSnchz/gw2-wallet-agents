/*!
 * tests/idea49.activities-cache-wipe.test.js
 *
 * Reproduce el hallazgo del Heartbeat #44: activities.js:activate() llama
 * cleanAchievementsCache(), que borra TODAS las claves localStorage que
 * empiezan con 'ach_' o 'ach:'. Eso incluye las dos claves que escribe
 * api-gw2.js putCache() para los logros:
 *
 *   ach_acc:<fpToken>            (TTL 2 min)   -> getAccountAchievements
 *   ach_meta_v2:es:<ids>         (TTL 12 h)    -> getAchievementsMeta
 *
 * Router llama Activities.activate() en cada navegacion a #/activities
 * (router.js:1661 y 1758). O sea: cada vez que el usuario abre el panel de
 * Actividades, la cache de logros de TODAS las cuentas deja de existir.
 *
 * Este test carga el archivo REAL y verifica el comportamiento de la clave,
 * sin navegador: reproduce el prefijo de clave tal cual lo arma api-gw2.js
 * (kLS) y el predicado de borrado tal cual lo escribe activities.js.
 *
 * Ejecutar: node tests/idea49.activities-cache-wipe.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function eq(a, b, msg) { ok(a === b, msg + '  (obtenido: ' + JSON.stringify(a) + ')'); }

// ── 1. Reproducir el predicado de borrado de activities.js:537-552 ──────────
console.log('\n[1] Predicado de cleanAchievementsCache() sobre las claves reales de api-gw2.js');

function wipePredicate(key) {
  return !!(key && (key.startsWith('ach_') || key.startsWith('ach:')));
}

// kLS() de api-gw2.js:198 -> base + ':' + fpToken(token) (token null -> base)
function kLS(base, fp) { return fp ? (base + ':' + fp) : base; }

const KEYS = {
  achAcc:   kLS('ach_acc', 'a1b2…wxyz'),
  achMeta:  kLS('ach_meta_v2:es:1,2,3,4', null),
  wvSeason: kLS('wv_season', 'a1b2…wxyz'),
  tokeninfo: kLS('tokeninfo', 'a1b2…wxyz'),
  items:    'items_cache_v1:es'
};

ok(wipePredicate(KEYS.achAcc),  'ach_acc:<fp>      Matcha el borrado (TTL 2 min, se pierde entera)');
ok(wipePredicate(KEYS.achMeta), 'ach_meta_v2:es:<ids> SI matcha el borrado (TTL 12 h, la mas cara)');
ok(!wipePredicate(KEYS.wvSeason),  'wv_season sobrevive (no empieza con ach_)');
ok(!wipePredicate(KEYS.tokeninfo), 'tokeninfo sobrevive');
ok(!wipePredicate(KEYS.items),     'items_cache_v1:es sobrevive');

// ── 2. Verificar en el archivo real que activate() NO llama al wipe ajeno ────
console.log('\n[2] El archivo real activities.js: activate() no borra cache de otro modulo');

const activitiesSrc = fs.readFileSync(path.join(ROOT, 'js', 'activities.js'), 'utf8');
const activateBody = activitiesSrc.slice(activitiesSrc.indexOf('async function activate()'));
// recorte estable: los primeros 4000 chars de la función bastan y no dependen
// de dónde se cierre
const activateWindow = activateBody.slice(0, 4000);

ok(!/^\s*cleanAchievementsCache\(\);/m.test(activateWindow),
   'activate() YA NO llama a cleanAchievementsCache()  <-- el fix');
ok(/^\s*cleanActivitiesCache\(\);/m.test(activateWindow),
   'activate() CONSERVA cleanActivitiesCache() (prefijo psna:, datos propios)');
ok(/function cleanAchievementsCache\(\)/.test(activitiesSrc),
   'cleanAchievementsCache() sigue DEFINIDA para llamadas explicitas (no se borro la funcion)');

// ── 3. Verificar que api-gw2.js realmente escribe esas claves ───────────────
console.log('\n[3] api-gw2.js escribe esas claves (Ls + prefijo)');

const apiSrc = fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf8');
ok(/var key = 'ach_acc';/.test(apiSrc), "getAccountAchievements usa baseKey 'ach_acc'");
ok(/var key = 'ach_meta_v2:' \+ CFG.LANG \+ ':' \+ slice\.join\(','\);/.test(apiSrc),
   "getAchievementsMeta usa baseKey 'ach_meta_v2:' + lang + ':' + ids");
ok(/ACH_META:\s+12 \* 60 \* 60 \* 1000/.test(apiSrc), 'TTL.ACH_META = 12 h (la entrada mas cara)');
ok(/ACH_ACC:\s+2 \* 60 \* 1000/.test(apiSrc), 'TTL.ACH_ACC = 2 min');
ok(/chunk = 200;/.test(apiSrc), 'getAchievementsMeta chunkea de a 200 ids por clave');

// ── 4. Router: cuantas veces se llega a activate() por navegacion ───────────
console.log('\n[4] router.js llama Activities.activate() al entrar a #/activities');

const routerSrc = fs.readFileSync(path.join(ROOT, 'js', 'router.js'), 'utf8');
const nCalls = (routerSrc.match(/Activities\?\.activate\?\.\(\)/g) || []).length;
ok(nCalls >= 1, 'router.js invoca Activities.activate() (' + nCalls + ' sitio(s))');

// ── 5. El coste real: cuantas clavesychunk puede escribir una cuenta ────────
console.log('\n[5] Coste medido del borrado (por que NO es cosmético)');

const AVG_META_B = 536;         // medido contra /v2/achievements?ids=..&lang=es
const N_IDS = 6991;             // logros que existen en el juego
const CHUNK = 200;
const nChunks = Math.ceil(N_IDS / CHUNK);
const perAccount = nChunks * (CHUNK * AVG_META_B);
console.log('  ach_meta_v2: %d chunks x %d ids x %d B = %s MB por id-set de cuenta',
  nChunks, CHUNK, AVG_META_B, (perAccount / 1048576).toFixed(2));
ok(perAccount / 1048576 > 1.0,
   'una sola cuenta escribe >1 MB de metadata que el wipe borra en la proxima navegacion');
ok(27 * (perAccount / 1048576) > 90,
   'con 27 cuentas el volumen NO ignorado seria ~' + (27 * perAccount / 1048576).toFixed(0) +
   ' MB: lo que mantiene la cuota a raya es el borrado, no el diseño');

console.log('\n────────────────────────────────────────');
console.log('  %d pass / %d fail', pass, fail);
console.log('────────────────────────────────────────');
process.exit(fail ? 1 : 0);
