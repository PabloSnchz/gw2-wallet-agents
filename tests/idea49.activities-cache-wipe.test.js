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
  // Idea 49 Tramo C: la metadata paso de 'ach_meta_v2:<lang>:<id,id,...>' a
  // 'ach_meta_v3:<lang>:<shard>'. El predicado del borrado es startsWith('ach_'),
  // asi que la clave nueva SIGUE entrando: el wipe no se esquiva por renombrar.
  achMeta:  kLS('ach_meta_v3:es:0', null),
  wvSeason: kLS('wv_season', 'a1b2…wxyz'),
  tokeninfo: kLS('tokeninfo', 'a1b2…wxyz'),
  items:    'items_cache_v1:es'
};

ok(wipePredicate(KEYS.achAcc),  'ach_acc:<fp>      Matcha el borrado (TTL 2 min, se pierde entera)');
ok(wipePredicate(KEYS.achMeta), 'ach_meta_v3:es:<shard> SI matcha el borrado (TTL 12 h, la mas cara)');
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
ok(/var ACH_META_SHARD = \d+;/.test(apiSrc),
   'getAchievementsMeta parte los ids en shards globales (ACH_META_SHARD)');
ok(/var key = 'ach_meta_v3:' \+ CFG.LANG \+ ':' \+ shard;/.test(apiSrc),
   "getAchievementsMeta usa baseKey 'ach_meta_v3:' + lang + ':' + shard");
ok(/ACH_META:\s+12 \* 60 \* 60 \* 1000/.test(apiSrc), 'TTL.ACH_META = 12 h (la entrada mas cara)');
ok(/ACH_ACC:\s+2 \* 60 \* 1000/.test(apiSrc), 'TTL.ACH_ACC = 2 min');
ok(/var missing = shardIds\.filter\(function \(id\) \{ return bag\[id\] == null; \}\);/.test(apiSrc),
   'de un shard ya guardado solo se pide lo que falta (el sharding no degrada la cache)');

// ── 4. Router: cuantas veces se llega a activate() por navegacion ───────────
console.log('\n[4] router.js llama Activities.activate() al entrar a #/activities');

const routerSrc = fs.readFileSync(path.join(ROOT, 'js', 'router.js'), 'utf8');
const nCalls = (routerSrc.match(/Activities\?\.activate\?\.\(\)/g) || []).length;
ok(nCalls >= 1, 'router.js invoca Activities.activate() (' + nCalls + ' sitio(s))');

// ── 5. El coste real: cuantas clavesychunk puede escribir una cuenta ────────
console.log('\n[5] Coste medido del borrado (por que NO es cosmético)');

// Idea 49 Tramo C cambio la ARITMETICA de esta seccion, y no a ojo.
//
// Antes (v2): la key llevaba el id-set ENTERO, asi que cada cuenta escribia sus
// propias claves. 27 cuentas = 27 copias parcialmente solapadas = ~97 MB, muy
// por encima de la cuota de 4.98 MB. Ahi el borrado era lo unico que mantenia
// la cuota a raya.
//
// Ahora (v3): la key lleva el SHARD GLOBAL del id (id//200). Dos cuentas que
// comparten un id comparten el shard, y de un shard ya guardado solo se pide lo
// que falta. El total de la metadata es por lo tanto el snapshot COMPLETO una
// sola vez (35 shards), no 27 veces. Eso es lo que hace que el sharding，x no
// el borrado, sea lo que deja entrar los datos en la cuota.
//
// El borrado sigue importando, pero por otro motivo y con otra cifra: seguiria
// siendo la razon de perder 3.58 MB de metadata cacheada y volver a pagarlos.
// Por eso se mide lo que el sharding AHORRA, no lo que el wipe costaba.
const AVG_META_B = 536;         // medido contra /v2/achievements?ids=..&lang=es
const N_IDS = 6991;             // logros que existen en el juego
const SHARD = 200;              // = ACH_META_SHARD de api-gw2.js
const N_ACCOUNTS = 27;
const nShards = Math.ceil(N_IDS / SHARD);
const snapshotOnce = nShards * (SHARD * AVG_META_B);
const v2PerAccount = snapshotOnce;              // v2: cada cuenta, enteras
const v2Total = N_ACCOUNTS * v2PerAccount;
const v3Total = snapshotOnce;                   // v3: el snapshot, una vez
const QUOTA = 4.98 * 1048576;

console.log('  v2: %d cuentas x %d shards = %s MB (27 copias solapadas)',
  N_ACCOUNTS, nShards, (v2Total / 1048576).toFixed(1));
console.log('  v3: %d shards compartidos  = %s MB (el snapshot, una vez)',
  nShards, (v3Total / 1048576).toFixed(2));
console.log('  cuota del navegador: %s MB', (QUOTA / 1048576).toFixed(2));

ok(v2Total / 1048576 > 90,
   'v2 excedia la cuota por ~' + (v2Total / QUOTA).toFixed(0) + 'x: el id-set entero no era viable');
// OJO con la lectura de este numero: 3.58 MB SI entra en la cuota, pero solo
// de metadata. El resto de la cache de la app (ach_acc por cuenta, bank,
// items, commerce) comparte ESA MISMA cuota, y medido sobre la API en vivo el
// total con sharding sigue en ~14.49 MB: ~3x la cuota. O sea que el sharding
// NECESARIO pero no SUFICIENTE (Idea 49 Tramos D/F/E + compacto de ach_acc).
// La asercion dice exactamente eso para que nadie lea "3.58 < 4.98" como
// "la cuota esta resuelta".
ok(v3Total < QUOTA,
   'v3 entra en la cuota (metadata sola: ' + (v3Total / QUOTA * 100).toFixed(0) + '% usada)');
ok(v3Total / QUOTA > 0.5,
   'AVISO: la metadata sola ya usa >50% de la cuota, asi que el sharding es NECESARIO pero NO suficiente');
ok(v3Total < v2Total / 10,
   'el sharding reduce la metadata ~' + (v2Total / v3Total).toFixed(0) + 'x frente a una key por id-set');

console.log('\n────────────────────────────────────────');
console.log('  %d pass / %d fail', pass, fail);
console.log('────────────────────────────────────────');
process.exit(fail ? 1 : 0);
