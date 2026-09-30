/*!
 * tests/idea55.account-layer.test.js
 *
 * Idea 55 Tramo 3a (PO, HB 08:15 UTC): 9 sitios con el token se evadian de la
 * capa GW2Api. Los Tramos 1 y 2 ya migraron 2 de ellos. Este test cubre los 3
 * que bajan `/v2/account` con `fetch` CRUDO:
 *
 *   characters.js    loadAccountData()   -> necesita wvw_rank
 *   achievements.js  fetchAccountAP()     -> necesita daily_ap / monthly_ap
 *   accounts-panel.js enrichWithGW2API()  -> necesita name, slots, AP...
 *
 * El mismo payload ya lo piden por la capa wallet-dashboard.js:445,
 * wv-purchase-detail.js:1025/1118 e inventory-dashboard.js:333. O sea: la app
 * lo bajaba 3 veces SIN cache y 5 veces CON cache, del mismo endpoint, en la
 * misma sesion. Ningun fetch crudo tiene TTL, retry, pool ni dedupe de
 * inflight, y no pasa por el estrangulador global (jfetch).
 *
 * Y el punto que NO es obvious: `getAccountInfo` YA EXISTIA (api-gw2.js:393,
 * exportada en :1156). No hace falta ningun wrapper nuevo. Este test falla si
 * alguien la quita del export, que es el modo de rotura real.
 *
 * Tambien fija el CONTRACTO DE ERROR de cada sitio, que es lo que se rompe
 * al migrar: el `fetch` crudo degradaba en silencio (`if (accountRes.ok)`,
 * `catch(e){}`), y el wrapper RECHAZA. Un rechazo sin catch se come el try
 * externo y deja el resto de la carga sin pintar.
 *
 * Ejecutar: node tests/idea55.account-layer.test.js
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
function read(f) { return fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'); }

const chars = read('characters.js');
const achs  = read('achievements.js');
const panel = read('accounts-panel.js');
const api   = read('api-gw2.js');

// --- 1. Ningun fetch crudo de /v2/account sobrevive ------------------------
console.log('\n[1] /v2/account ya no se baja con fetch crudo en los 3 modulos');

// El endpoint pelado, con o sin query string. `?v=latest` es la variante de la
// capa y SI es legitima; lo que no puede aparecer es la URL de la API armada
// a mano con access_token pegado.
const RAW = /api\.guildwars2\.com\/v2\/account\?access_token=/g;

for (const [name, src] of [['characters.js', chars], ['achievements.js', achs], ['accounts-panel.js', panel]]) {
  const hits = (src.match(RAW) || []).length;
  ok(hits === 0, name + ': 0 fetch crudo(s) de /v2/account  <-- el fix (encontrados: ' + hits + ')');
}

// characters.js y achievements.js no deben construir NINGUNA URL de
// api.guildwars2.com/v2/account a mano. accounts-panel.js queda exceptuado
// porque /v2/account/home/nodes (otro endpoint, sin wrapper) sigue crudo a
// proposito, y su regex tiene que distinguir uno del otro.
ok(!/api\.guildwars2\.com\/v2\/account\?/.test(chars),
   'characters.js: ya no arma ninguna URL de /v2/account a mano');
ok(!/api\.guildwars2\.com\/v2\/account\?/.test(achs),
   'achievements.js: ya no arma ninguna URL de /v2/account a mano');
ok(!/api\.guildwars2\.com\/v2\/account\?access_token=/.test(panel),
   'accounts-panel.js: /v2/account ya no se pide crudo (home/nodes queda crudo a proposito)');

// --- 2. Los 3 usan el wrapper ---------------------------------------------
console.log('\n[2] los 3 sitios usan root.GW2Api.getAccountInfo');

ok(/root\.GW2Api\.getAccountInfo\(token\)/.test(chars),
   'characters.js: loadAccountData() usa getAccountInfo(token)');
ok(/root\.GW2Api\.getAccountInfo\(token,\s*\{\s*nocache:\s*true\s*\}\)/.test(achs),
   'achievements.js: fetchAccountAP() usa getAccountInfo con nocache:true');
ok(/root\.GW2Api\.getAccountInfo\(apiKey\)/.test(panel),
   'accounts-panel.js: enrichWithGW2API() usa getAccountInfo(apiKey)');

// El `nocache:true` de achievements NO es opcional: antes el fetch crudo
// llevaba `cache:'no-store'`, o sea que el AP se releia SIEMPRE. Migrar sin
// nocache meteria un TTL de 30 s (TTL.ACCOUNT) donde no habia ninguno, y el
// usuario veria el AP congelado.
// IMPORTANTE: se busca la opcion REAL, no la palabra en un comentario. Este
// test fallo en su primera corrida por matchear su propia documentacion.
const achBody = achs.split('\n').filter(function(l){ return !/^\s*(\/\/|\*|\/\*)/.test(l); }).join('\n');
ok(!/cache:\s*'no-store'/.test(achBody),
   'achievements.js: el `cache:no-store` manual desaparecio del CODIGO (lo reemplaza nocache:true)');

// --- 3. El wrapper sigue existiendo y exportado ---------------------------
console.log('\n[3] el wrapper que se usa existe y esta exportado  <-- el modo de rotura real');

ok(/function getAccountInfo\(token,\s*opts\)/.test(api),
   'api-gw2.js: la funcion getAccountInfo sigue definida');
ok(/getAccountInfo:\s*getAccountInfo/.test(api),
   'api-gw2.js: getAccountInfo sigue en el objeto exportado');

// Si alguien la saca del export, los 3 call sites TYLEAN en runtime y el
// fallo aparece como "no es una funcion", no como un 404. Sin esta asercion
// el test pasaria con el codigo roto.
const exported = /getAccountInfo:\s*getAccountInfo/.test(api);
ok(exported, 'si se cae esta asercion, los 3 call sites rompen en runtime (TypeError)');

// El wrapper tiene que usar la MISMA key de cache y la misma inflight key que
// el resto de la capa, o no deduplica contra los otros 5 call sites y la
// migracion no ahorra NADA.
ok(/getCache\(key,\s*TTL\.ACCOUNT,\s*token,\s*opts\.nocache\)/.test(api),
   'getAccountInfo cachea con TTL.ACCOUNT y respeta nocache');
ok(/'if:account_info:'\s*\+\s*fpToken\(token\)/.test(api),
   'getAccountInfo usa la inflight key por fingerprint (dedupe de concurrencia)');

// --- 4. Contrato de error: la migracion no puede romper la carga ----------
console.log('\n[4] contrato de error preservado en los 3 sitios');

// characters.js: antes `if (accountRes.ok)` era un SKIP (seguia al resto).
// El wrapper RECHAZA. Sin catch propio, el error se come el try de
// loadAccountData y PvP/WvW quedan sin leer -> las 3 filas del header en '-'.
const cStart = chars.indexOf('Solicitando account info');
ok(cStart !== -1, 'characters.js: el log "Solicitando account info" sigue ahi (ancla del bloque)');
const cBlock = cStart === -1 ? '' : chars.slice(cStart, cStart + 900);
ok(/try\s*\{/.test(cBlock), 'characters.js: getAccountInfo va dentro de un try propio');
ok(/catch\s*\(/.test(cBlock), 'characters.js: ese try tiene catch (el rechazo no se propaga)');
ok(/getAccountInfo\(token\)/.test(cBlock), 'characters.js: la llamada esta dentro del bloque try');
ok(/if\s*\(accountInfo\)/.test(cBlock),
   'characters.js: el guard de exito paso de `if (accountRes.ok)` a `if (accountInfo)`');

// El `res.ok` no puede quedar colgando: si alguien migra la llamada pero deja
// el `if (accountRes.ok)` de arriba, accountRes ya no existe -> ReferenceError.
// Igual que arriba: fuera los comentarios, o el test matchea su propia nota.
const charsCode = chars.split('\n').filter(function(l){ return !/^\s*(\/\/|\*|\/\*)/.test(l); }).join('\n');
ok(!/accountRes/.test(charsCode),
   'characters.js: no queda ninguna referencia a accountRes en el CODIGO (variable del fetch crudo)');

// achievements.js: fetchAccountAP se usa DENTRO de un Promise.all en loadAll.
// Antes tiraba `if (!r.ok) throw`, o sea que PROPAGABA. El wrapper tambien
// propaga: contrato identico, no hace falta catch.
const aStart = achs.indexOf('async function fetchAccountAP');
ok(aStart !== -1, 'achievements.js: fetchAccountAP sigue existiendo');
const aBlock = aStart === -1 ? '' : achs.slice(aStart, aStart + 700);
ok(/root\.GW2Api\.getAccountInfo/.test(aBlock), 'achievements.js: la llamada esta dentro de fetchAccountAP');
ok(/dailyHist/.test(aBlock), 'achievements.js: sigue devolviendo dailyHist');
ok(/daily_ap/.test(aBlock) && /monthly_ap/.test(aBlock),
   'achievements.js: sigue leyendo daily_ap y monthly_ap del mismo payload');
ok(/throw new Error\('account HTTP/.test(achs) === false,
   'achievements.js: el throw manual de `account HTTP` ya no hace falta (el wrapper rechaza)');

// accounts-panel.js: el try/catch por cuenta ya existia y es lo que preserva
// el "una cuenta rota no corta el enriquecimiento de las otras".
const pStart = panel.indexOf('async function enrichWithGW2API');
ok(pStart !== -1, 'accounts-panel.js: enrichWithGW2API sigue existiendo');
const pBlock = pStart === -1 ? '' : panel.slice(pStart, pStart + 2200);
ok(/try\s*\{[\s\S]*getAccountInfo\(apiKey\)[\s\S]*catch\s*\(e\)\s*\{\s*\}/.test(pBlock),
   'accounts-panel.js: la llamada sigue dentro del try/catch por cuenta');

// Los 7 campos que el panel lee tienen que seguir leyendose igual: si el
// wrapper devolviera otra forma, el panel guardaria `undefined` en el .json
// que se descarga y nadie lo veria hasta abrir el archivo.
for (const f of ['info.name', 'info.created', 'info.achievement_points', 'info.slots',
                 'info.bag_slots', 'info.bank_slots', 'info.material_storage']) {
  ok(pBlock.indexOf(f) !== -1, 'accounts-panel.js: sigue leyendo ' + f);
}

// --- 5. Lo que este commit NO toca, fijado --------------------------------
console.log('\n[5] regresiones que el test impide');

// /v2/account/home/nodes NO tiene wrapper en la capa. Migrarlo seria inventar
// un endpoint nuevo; queda crudo y anotado.
ok(/v2\/account\/home\/nodes\?access_token=/.test(panel),
   'accounts-panel.js: home/nodes sigue crudo (no tiene wrapper; decision de alcance)');

// characters.js mantiene su propio contrato para /v2/pvp/stats y /v2/account
// NO: el account ya no debe aparecer crudo. PvP sigue siendo del Tramo 3b.
ok(/v2\/pvp\/stats\?access_token=/.test(chars),
   'characters.js: /v2/pvp/stats sigue crudo (Tramo 3b, no en este commit)');

// Un modulo no debe meter su propio estrangulador. El defecto de la Idea 46
// fue un MAX local de 3 DENTRO del pool global = 9 requests reales.
ok(!/Promise\.all\(\s*state\.accounts\.map/.test(panel),
   'accounts-panel.js: no se metio un pool local sobre el pool global');

// --- 6. Evaluacion real: el wrapper deduplica de verdad -------------------
console.log('\n[6] el wrapper evaluado deduplica 2 llamadas concurrentes (no solo el texto)');

// Esto NO es un grep: se ejecuta la funcion real de api-gw2.js en un sandbox
// con un fetch falso, y se mide quantas veces salio el request. Un test que
// solo lee el texto pasaria aunque el cache este roto.
const sandboxFetchCalls = [];
const fakeAccount = { name: 'Test Account', created: '2012-01-01', achievement_points: 12345,
                      slots: 20, bag_slots: 20, bank_slots: 80, material_storage: 250,
                      daily_ap: 50, monthly_ap: 10, wvw_rank: 45, last_modified: '2026-09-30T00:00:00Z' };

// Extraemos la funcion del archivo real y la corremos con un entorno minimo
// que reproduce el contrato de la capa (getCache/inflightOnce/fetchWithRetry).
const fnSrc = api.slice(api.indexOf('function getAccountInfo(token, opts)'));
const balanced = (function(s){ let d=0, i=0; for(; i<s.length; i++){ if(s[i]==='{')d++; else if(s[i]==='}'){d--; if(d===0) return s.slice(0,i+1);} } return s; })(fnSrc);

const store = new Map();
const ctx = {
  console: { warn: function(){}, log: function(){}, info: function(){}, error: function(){} },
  Date: Date, Math: Math, JSON: JSON, Promise: Promise, isNaN: isNaN,
  API_BASE: 'https://api.guildwars2.com',
  // TTL.ACCOUNT es la constante REAL del archivo (30 s), replicada en el
  // sandbox. Sin esto el `getCache(key, TTL.ACCOUNT, ...)` de la funcion
  // evaluada tira ReferenceError y el test no mide nada.
  TTL: { ACCOUNT: 30 * 1000 },
  // La funcion usa `CFG.API_BASE`, no la constante suelta. Sin esto el sandbox
  // tira ReferenceError y la asercion de dedupe nunca llega a correr: un test
  // que falla por su propio harness no mide el codigo que dice medir.
  CFG: { API_BASE: 'https://api.guildwars2.com' },
  getCache: function(k, ttl, tok){ return store.has(k) ? store.get(k) : null; },
  putCache: function(k, v){ store.set(k, v); },
  fpToken: function(t){ return 'fp'; },
  // inflightOnce tiene que DEDUPLICAR de verdad, igual que el de api-gw2.js.
  // La primera version de este stub era `return fn()`: con eso, 2 llamadas
  // concurrentes salian como 2 requests y la asercion de dedupe fallaba por
  // el harness, no por el codigo. El cache no alcanza para el caso
  // concurrente (las dos llegan antes de que la primera resuelva), y la
  // dedupe de concurrencia la hace justamente inflightOnce.
  inflightOnce: (function () {
    const inflight = new Map();
    return function (ikey, fn) {
      if (inflight.has(ikey)) return inflight.get(ikey);
      const p = fn();
      inflight.set(ikey, p);
      return p;
    };
  })(),
  withToken: function(u, t){ return u + '?access_token=' + t; },
  fetchWithRetry: function(){ sandboxFetchCalls.push(1); return Promise.resolve(fakeAccount); },
  setTimeout: setTimeout
};
ctx.globalThis = ctx;
try {
  const out = vm.runInNewContext('(function(){' + balanced + '\nreturn getAccountInfo;})()', ctx);
  const p1 = out('TOK');
  const p2 = out('TOK');
  Promise.all([p1, p2]).then(function(res){
    ok(res[0] && res[1], 'el wrapper resuelve con el payload de la API');
    ok(res[0].name === 'Test Account', 'el payload llega intacto (name)');
    ok(res[0].daily_ap === 50 && res[0].monthly_ap === 10,
       'el payload trae daily_ap/monthly_ap (lo que achievements.js necesita)');
    ok(res[0].wvw_rank === 45, 'el payload trae wvw_rank (lo que characters.js necesita)');
    ok(sandboxFetchCalls.length === 1,
       '2 llamadas concurrentes al MISMO token salen como 1 request (dedupe)  <--_FOUND: ' + sandboxFetchCalls.length);
    ok(store.has('account_info'), 'el resultado quedo cacheado bajo la key de la capa');
    finish();
  }).catch(function(e){ fail++; console.log('  FAIL  el sandbox lanzo: ' + e.message); finish(); });
} catch (e) {
  fail++; console.log('  FAIL  no se pudo extraer/evaluar getAccountInfo: ' + e.message); finish();
}

function finish() {
  console.log('\n' + (pass + fail) + ' aserciones, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
}
