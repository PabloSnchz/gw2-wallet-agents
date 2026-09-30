/* =======================================================================
 * js/api-gw2.js  —  Capa API con fallbacks + caché persistente (mejorada)
 * Proyecto: Bóveda del Gato Negro (GW2 Wallet Ligero)
 * Versión: 2.26.0 (2026-09-30) — Idea 57 Tramo 3: los @throws que mentian ahora describen las dos capas
 *   v2.26.0: NO cambia el comportamiento de NINGUNA funcion. Es documentacion,
 *   y es el tramo mas barato de la Idea 57 (sin suite nueva, sin capa de datos,
 *   sin riesgo). El problema que arregla: seis wrappers declaraban por escrito
 *   "propaga, no degrada a []" y tres lineas mas abajo hacian
 *   `Array.isArray(data) ? data : []`. La explicacion de la contradiccion
 *   estaba a ~40 lineas del `@throws`, o sea que leer el contrato de la
 *   funcion — lo que hace cualquier consumidor, y lo que hizo el Code
 *   Reviewer al encontrar el bug de getCharacterCount — daba la respuesta
 *   OPUESTA a la real. Ese es el mecanismo por el que nace el wrapper
 *   siguiente: no es que nadie mire, es que el que mira lee un contrato falso.
 *   Los seis `@throws` corregidos describen ahora RED (propaga) y FORMA
 *   (degrada) por separado, con la deuda y el call site al lado. Arreglar el
 *   JSDoc es prevention: elimina la causa de que el proximo nazca mal.
 *   getAccountLuck queda SIN JSDoc a proposito: su problema no es textual sino
 *   de representacion (0% medido vs "sin dato"), y lo decide el Tramo 2 con
 *   veredicto del Reviewer. El test lo verifica para que nadie lo "complete"
 *   con una promesa nueva sin veredicto.
 *   Test: tests/idea57t3-jsdoc-honesto.test.js (11 aserciones; 8 FAIL contra
 *   el archivo sin los JSDoc corregidos).
 *
 *   v2.25.0: NO cambia el comportamiento de ninguna funcion. Instala una
 *   REGLA y pone los contratos en el sitio donde se Incumplen.
 *
 *   Que estaba mal, y por que no lo habia visto nadie: el conteo vivia en un
 *   comentario a mano. La cabecera de la v2.24.1 decia "son SIETE los wrappers
 *   que degradaban por forma" y el numero real era ONCE. Es el mismo tipo de
 *   error que el conteo de "8 tragadores" de la Idea 47: un total escrito a
 *   mano en un comentario, que nadie vuelve a contar y que un fix incremental
 *   desactualiza sin avisar. Acertar el numero no era la tarea; reemplazar el
 *   numero por una regla, si.
 *
 *   La regla (tests/idea57.forma-contracts.test.js): todo sitio que hace
 *   `Array.isArray(x) ? x : []` tiene que DECLARAR su contrato con una etiqueta
 *   `FORMA: degrada` o `FORMA: propaga`. El test recorre el archivo y no
 *   necesita una lista mantenida a mano, asi que un wrapper NUEVO cae en el
 *   FAIL sin que nadie tenga que acordarse de actualizar nada. Ese es el
 *   punto: hasta la v2.24.1 los dos guards se encontraron de rebote, como
 *   follow-up de un review. Los dos primeros no salieron de un test. El decimo
 *   wrapper existia porque nadie escribio la regla, no porque nadie lo
 *   encontrara.
 *
 *   Reparto de los 11, verificado a mano en este commit:
 *     - 2 ya PROPAGAN: getAccountRaids (v2.24.0) y getCharacterCount (v2.24.1).
 *       No se contaron; el test lo verifica explicitamente para que una
 *       reversa silenciosa a `? data : []` no pase.
 *     - 2 son `fetchBatchWithRepair` (un helper de lote con 3 call sites).
 *     - 7 degradan, y su JSDoc hasta la v2.25.0 DECIA "propaga, no degrada
 *       a []": buys, sells, delivery, bank, materials, armory, y el caso de
 *       getAccountLuck. El `catch` de RED cumplia la promesa en las seis
 *       primeras; el camino de FORMA no. En la septima (getAccountLuck) no
 *       hay ni catch ni warn.
 *       TRAMO 3 (v2.26.0): esos seis `@throws` mentian por escrito y ahora
 *       describen las DOS capas, con la deuda del camino de FORMA escrita
 *       al lado. No cambio comportamiento: el unico proposito es que el
 *       contrato que se lee sea el que el codigo cumple hoy, y que la deuda
 *       este en el mismo bloque que la promise, no en un comentario a 40
 *       lineas de distancia. Un JSDoc que promete lo contrario de lo que
 *       hace es la causa raiz de que el proximo wrapper nazca mal.
 *     - 1 degrada LEGITIMAMENTE: getCommerceListings, porque es el catalogo
 *       global del mercado y `[]` es un estado normal (Idea 47, decidido con
 *       el Reviewer). Se declara igual, para que "degrada a proposito" y
 *       "degrada por costumbre" queden escritas y no inferidas.
 *
 *   El mas caro de los once es `getAccountLuck`, y no por el codigo: por lo
 *   que muestra. Aca el valor degradado no es `[]`, es `0`, y `0` ES UN VALOR
 *   VERDADERAMENTE POSIBLE (la API devuelve `[]` si la cuenta nunca consumio
 *   esencia, y ahi 0 es la respuesta correcta). En el Strike Tracker `[]` es
 *   obviamente falso para cualquiera que haya estado ahi; un "0%" en la
 *   columna "Suerte (MF)" se cree en buena fe. El comentario del codigo
 *   declaraba legitimo el valor que es indistinguible del fallo. Es la razon
 *   por la que el Tramo 2 NO es un refactor cosmetico: es un dato que se
 *   cree y es falso.
 *
 *   Lo que NO se hizo, a proposito:
 *     - NO se toco ninguna funcion. Esto es capa de datos: ALERT-48 exige
 *       veredicto del Reviewer antes de tocar comportamiento, y la migracion
 *       de los 7 al guard de la v2.24.0 es exactamente eso (Tramo 2).
 *     - NO se agrego un helper central (expectArray). Meteria una dependencia
 *       nueva en once funciones de una capa que hoy no tiene dependencia
 *       entre wrappers, a cambio del mismo resultado que da un `if` leido en
 *       el sitio donde falla.
 *     - NO se corrigio el conteo "a mano". Siete->once escrito a mano seria
 *       el mismo error otra vez, un commit mas tarde.
 *
 *   Test: tests/idea57.forma-contracts.test.js (18 aserciones; 11 FAIL contra
 *   el archivo sin los contratos declarados).
 *
 *   v2.24.1: F2 del Code-Reviewer sobre la v2.24.0 (`task-b20623f46caa`,
 *   veredicto APROBADO con 3 follow-ups). `getCharacterCount` degrada a `0`
 *   ante una forma no soportada, y su JSDoc de la línea :528 ya decía "no
 *   degrada a 0": el catch de RED cumplía el contrato y el camino de FORMA
 *   no. Es el mismo bug de la v2.24.0, una función arriba. NO es teórico:
 *   `jfetch` devuelve `null` ante un 200 con body vacío (`return raw ?
 *   JSON.parse(raw) : null`, :408), o sea que una API que responde 200 sin
 *   cuerpo producía "0 personajes" en la columna del Wallet Dashboard, sin
 *   error visible e indistinguible de "esta cuenta no tiene personajes".
 *   Test: tests/idea60b.forma-charcount.test.js (21 aserciones; 12 FAIL
 *   contra el archivo sin el fix).
 *   Con esto son SIETE los wrappers que degradaban por forma, no seis: el
 *   "cinco propagados" de la Idea 47 no incluía a este. El relato de la
 *   v2.24.0 queda corregido acá.
 *   ⚠️ ESTE CONTEO QUEDO DESACTUALIZADO en la v2.25.0 y no se corrige: son
 *   ONCE sitios, no siete. La v2.25.0 lo deja escrito a proposito, porque un
 *   numero corregido a mano en un comentario es el mismo error que la v2.25.0
 *   acaba de demostrar. El conteo que vale es el del test.
 *   v2.24.0: `getAccountRaids` degradaba a `[]` ante una forma de respuesta
 *   que no soportamos, y `[]` es indistinguible de "no completaste nada". En
 *   el Strike Tracker eso es `state.completedStrikes = []` -> "0 de 15
 *   completados", exactamente lo que se ve si la cuenta no hizo ninguno.
 *   El JSDoc de la misma función ya decía "no degrada a []" y el código no
 *   lo cumplía: el catch de red propagaba, el camino de FORMA no. Es el
 *   sexto wrapper que degrada (el sexto de la Idea 47). NO arregla el módulo:
 *   ALERT-41 sigue bloqueando, porque los 15 ids de strike no están en
 *   /v2/raids. Lo que hace es convertir el bloqueo en diagnóstico: si la API
 *   responde con la forma del wiki de 2019 (`progress:[{id,cm,li}]`), la
 *   consola lo dice en vez de fingir "0 de 15". Un [] vacío sigue siendo una
 *   respuesta válida y no entra por el guard: "no lo pude leer" y "no hay
 *   nada" tienen que quedar como dos estados distintos.
 *   Test: tests/idea56.forma-raids.test.js (20 aserciones; 12 FAIL contra el
 *   archivo sin el fix).
 *   v2.23.1: CORRIGE una regresión que la v2.23.0 introdujo. El reintento de
 *   los ids faltantes no tenía handler de rechazo. Los ids que faltaron son,
 *   por definición, ids que la API NO tiene: al repreguntarlos sola la API
 *   responde 404 ("all ids provided are invalid"), NO 206 — porque 206
 *   significa "queda al menos uno válido" (medido: ids=1,2,3 -> 404;
 *   ids=1,2,3,4,5 -> 206 con los 2 válidos). Ese 404 propagaba y `arr`, con
 *   los ids válidos que YA TENÍAMOS, se descartaba con él: el fix empeoraba
 *   el bug que quería matar (dejaba el lote entero sin icono y sin cachear,
 *   en vez de sólo el id inválido). En getAchievementsMeta, que no tiene
 *   catch, tumbaba la vista de logros completa. Regla: un reintento es una
 *   MEJORA, no un requisito; si falla, se devuelve el resultado original.
 *   Test: tests/idea49.partial-206.retry404.test.js (13 aserciones; 5 FAIL
 *   contra el archivo sin el fix).
 *   v2.23.0: la API responde 206 cuando SÓLO PARTE de los ids pedidos existen
 *   (medido sin token: ids=1,2,3 -> 404; ids=1,2,3,4,5 -> 206 con 2; ids=all
 *   -> 400). El 206 es un 2xx, así que `!res.ok` NO lo detectaba y el lote se
 *   aceptaba como completo. Ahora fetchBatchWithRepair() reintenta SÓLO los ids
 *   que faltaron, con un piso para no entrar en loop. Regla: un lote se valida
 *   contra los IDS PEDIDOS, nunca contra el largo de la respuesta, y nunca se
 *   rellena por posición (todos los consumidores buscan por `obj.id`).
 *   Además, getItemsMany() resolvía desde `out`, un array local que solo muta
 *   el llamador que ganó la carrera del inflightOnce → la segunda llamada
 *   concurrente recibía [] sin error visible. Ahora resuelve desde la cache,
 *   igual que getAchievementsMeta. Ese defecto ya estaba corregido en
 *   getAchievementsMeta (Idea 49, HB#48) y nunca llegó a getItemsMany.
 *   v2.22.0: corrige 2 defectos del sharding de v2.21.0, encontrados por el
 *   Code Reviewer y reproducidos con test. (1) Dos cargas concurrentes del
 *   mismo shard en frío compartían el inflightOnce, así que sólo la primera
 *   mutaba su bag local y la segunda resolvía contra {} → devolvía [] y
 *   achievements.js quedaba con logros sin nombre, icono ni tiers, y earnedAP
 *   en 0 sin ningún error. Ahora la resolución final relee el shard del caché.
 *   (2) nocache devolvía null de getCache → bag vacío → putCache pisaba el
 *   shard entero con el subconjunto de una sola cuenta. Ahora el bag se lee
 *   siempre y se mergea: un shard es compartido por todas las cuentas.
 *   Además poda los 5 campos que la API manda y NADIE lee (bits, requirement,
 *   locked_text, prerequisites, point_cap) ANTES de guardar.
 *   v2.21.0: getAchievementsMeta() cachea por SHARD (id//200) en vez de por
 *   id-set. La key vieja llevaba el id-set entero dentro del nombre, así que
 *   cada cuenta guardaba su propia copia de la misma tabla: con 27 cuentas,
 *   20.22 MB en 216 claves, contra una cuota real de 4.98 MB. Con sharding:
 *   1.71 MB en 18 claves (-91.5%). Se pide SÓLO lo que falta de cada shard, así
 *   que el ahorro de cuota no se paga con peticiones. Migra (borra) las keys
 *   viejas en el primer uso: sin eso no se libera nada, porque la cuota ya
 *   está llena. Ver ALERT-47 y BACKLOG.md Idea 49 Tramo C.
 *
 *   ⚠️ Cifras de la v2.21.0: las tres versiones que circulaban (18 claves /
 *   1.71 MB en el header, "35 shards, 3.58 MB" en el commit, 18.64 MB → 1.85 MB
 *   en 40 claves en la corrida del test) NO reproducen con datos reales.
 *   Medido contra la API en vivo (tools/idea49c-measure.mjs, 3458 logros,
 *   lang=es, 27 cuentas × ~1500 logros solapados, cuota 4.98 MB):
 *     patrón viejo (key por id-set): 20.22 MB
 *     sharding, sin podar:           1.75 MB en 20 claves (35.2% de la cuota)
 *     sharding, podando 5 campos:    0.81 MB en 20 claves (16.4% de la cuota)
 *   El sharding sigue siendo necesario (sin él la cuota se excede ~4×), pero
 *   por sí solo NO cierra el problema: `ach_acc` es la otra mitad.
 *   v2.20.0: lsSet() ya no se traga los errores con catch vacío. Devuelve
 *   booleano, cuenta los QuotaExceededError y avisa una sola vez. La cuota de
 *   localStorage (~4.98 MB) es compartida por TODOS los módulos, así que
 *   cuando se llena cada escritura posterior falla en silencio y la app
 *   reinicia en frío en cada recarga. Visible en GW2Api.__cacheStats().
 *   No relanza el error: la copia en __mem ya sirvió para la sesión.
 *   Esto solo hace que el fallo se pueda ver en vez de disfrazarse de lentitud.
 *   v2.19.0: POOL_MAX 3 → 6. Con 3 slots y ~900 ms de latencia mediana el pool
 *   rendía ~200 req/min = 33% del permiso (X-Rate-Limit-Limit: 600). Con 6
 *   rinde ~400/min y la primera pantalla del Dashboard Cartera con 27 cuentas
 *   baja de 32.7 s a 16.4 s. El 3 no lo eligió nadie: se heredó de los pools
 *   locales de cada dashboard y nunca se midió.
 *   NO arregla el 429 (ALERT-27): el límite de ArenaNet es de tasa, no de
 *   concurrencia. El pool amortigua picos, no excedentes sostenidos. Un
 *   recorrido de 27 cuentas entra; un agregado de varios simultáneos puede
 *   reventarlo igual. El token bucket sigue siendo previo a la Idea 42.
 *   Verificado con tests/idea48.poolmax.test.js, que carga este archivo real
 *   con un fetch falso de latencia conocida: el pico nunca excede POOL_MAX,
 *   3 → 6 reduce el tiempo de la tanda, y no se filtra ningún slot.
 *   Sin cambio de comportamiento observable: mismos resultados, mismos
 *   errores, misma cache. Solo cambia CUANTOS requests pueden estar en vuelo.
 *   v2.18.0: getCharacterCount, getAccountRaids, getCommerceTransactionsBuys,
 *   getCommerceTransactionsSells, getAccountBank, getAccountMaterials y
 *   getAccountLegendaryArmory dejan de tragar el error y devuelven [] / 0.
 *   Un 0 por "no pude leer" es indistinguible de un 0 real: el usuario Borra y
 *   re-agrega una API key que funcionaba. Ahora el error sube al call site,
 *   que es donde esta escrito como surfacearlo.
 *   NO entra getCommerceListings: ahi [] SI es estado normal (la cuenta no
 *   tiene nada publicado), no un error tragado. Decision de alcance del PO.
 *   Consumidores: wallet-dashboard (try/catch por campo, sus _errors
 *   characters/raids dejaron de ser inalcanzables), inventory-hub,
 *   inventory-dashboard, raid-tracker, strike-tracker y converter-modal
 *   (Promise.allSettled; estos dos ultimos ya toleraban el rechazo).
 *   v2.17.1: poolPump ya no pierde el slot si un task tira sincrónico.
 *
 * Cambios v2.17.0:
 *  - NUEVO pool global de concurrencia en el unico punto de estrangulacion
 *    de la capa (jfetch). El MAX=3 estaba duplicado dentro de cada dashboard,
 *    o sea que era local: inventory-dashboard hacia Promise.all de 3 DENTRO
 *    de su pool = 9 requests simultaneos reales. Con este pool el tope es
 *    global a la pagina entera, no por modulo.
 *  - __cfg.poolStats() y __cfg.setPoolMax(n) para observar y ajustar.
 *    Idea 46 t2 va a leer poolStats() para decir "limitado por la API (600/min)"
 *    en vez de "Cargando" cuando la cola se acumula.
 *  - Sin cambio de comportamiento observable: mismos resultados, mismos
 *    errores, misma cache. Solo cambia CUANTOS requests pueden estar en vuelo.
 *
 * Versión: 2.16.0 (2026-09-29) — Commerce: + Delivery (ítems sin recoger del TP)
 *
 * Cobertura de este archivo:
 *  - Token / permisos (tokeninfo)
 *  - Wallet + currencies (fallback AA)
 *  - Items batch (con caché por id, cap de 500 entradas)
 *  - Achievements (cuenta + metadatos)
 *  - Account info (con last_modified para detectar actividad)
 *  - Raids (getAccountRaids para seguimiento semanal)
 *  - Inventory: Bank, Materials, Legendary Armory
 *  - Commerce: Listings, Prices, Transactions (buys/sells), Delivery (sin recoger)
 *  - Delegados Wizard's Vault (retrocompatibles)
 *
 * Cambios v2.16.0:
 *  - NUEVA función getCommerceDelivery(token, opts) - Endpoint /v2/commerce/delivery
 *    Muestra lo que la cuenta tiene pendiente de recoger en la caja del Trading Post.
 *    Endpoint verificado en vivo 2026-09-29: 401 con token inválido (existe); un
 *    endpoint inexistente devuelve 404 "not found". Data-only, sin CSS.
 *
 * Cambios v2.15.0:
 *  - NUEVA función getCommerceListings(opts) — Endpoint /v2/commerce/listings
 *  - NUEVA función getCommercePrices(ids, opts) — Endpoint /v2/commerce/prices
 *  - NUEVA función getCommerceTransactionsBuys(token, opts)
 *  - NUEVA función getCommerceTransactionsSells(token, opts)
 *  - Cap de 500 entradas en items_cache_v1:es (elimina las 100 más viejas)
 *
 * Cambios v2.14.0:
 *  - NUEVA función getAccountBank(token, opts) para obtener el banco de la cuenta
 *  - NUEVA función getAccountMaterials(token, opts) para almacenamiento de materiales
 *  - NUEVA función getAccountLegendaryArmory(token, opts) para armería legendaria
 *
 * Cambios v2.13.0:
 *  - NUEVA función getAccountRaids(token, opts) para encuentros de raid completados
 *
 * Cambios v2.12.0:
 *  - NUEVA función getAccountInfo(token) que devuelve last_modified
 *  - ELIMINADA lógica de PvP (getPvPGames, isRecentlyActiveInPvP)
 * ======================================================================= */

(function (root) {
  'use strict';

  var LOGP = '[GW2Api]';
  var API_BASE = 'https://api.guildwars2.com';

  // TTLs (ms)
  var TTL = {
    TOKENINFO:    10 * 60 * 1000,            // 10 min
    ACCOUNT:      30 * 1000,                 // 30 segundos (actividad reciente)
    RAIDS:         5 * 60 * 1000,            // 5 minutos
    BANK:          2 * 60 * 1000,            // 2 min (inventario cambia poco)
    MATERIALS:     2 * 60 * 1000,            // 2 min
    ARMORY:        5 * 60 * 1000,            // 5 min (legendarios no cambian seguido)
    COMM_LISTINGS: 5 * 60 * 1000,            // 5 min (listado de items en TP)
    COMM_PRICES:   2 * 60 * 1000,            // 2 min (precios fluctúan rápido)
    WV_SEASON:     6 * 60 * 60 * 1000,       // 6 h
    WV_LISTINGS:  30 * 60 * 1000,            // 30 min
    WV_ACCOUNT:    5 * 60 * 1000,            // 5 min
    WV_OBJ:        5 * 60 * 1000,            // 5 min
    ITEMS:        24 * 60 * 60 * 1000,       // 24 h (por id)
    CURR:          7 * 24 * 60 * 60 * 1000,  // 7 días
    WALLET:        2 * 60 * 1000,            // 2 min
    LUCK:          10 * 60 * 1000,           // 10 min (la suerte solo sube al consumir esencia)
    ACH_ACC:       2 * 60 * 1000,            // 2 min
    ACH_META:     12 * 60 * 60 * 1000        // 12 h
  };

  var CFG = {
    API_BASE: API_BASE,
    TTL: TTL,
    LANG: 'es',
    RETRIES: 2,
    RETRY_BASE_MS: 600,
    // POOL_MAX 3 -> 6 (Idea 48, Tramo A). Medido, no elegido: con 3 slots y
    // ~900 ms de latencia mediana el pool rendia ~200 req/min = 33% del
    // permiso (X-Rate-Limit-Limit: 600). Con 6 rinde ~400/min y la primera
    // pantalla del Dashboard Cartera con 27 cuentas baja de 32.7 s a 16.4 s.
    //
    // SUBIR ESTE NUMERO NO ARREGLA EL 429 (ALERT-27): el limite de ArenaNet es
    // de TASA, no de concurrencia. El pool amortigua picos, no excedentes
    // sostenidos. Con 6 slots y 900 ms el techo teorico es ~400/min, por debajo
    // de 600, asi que un recorrido con 27 cuentas entra. Un agregado de varios
    // recorridos simultaneos lo puede reventar igual: para eso falta el token
    // bucket, que es lo que tiene que preceder a la Idea 42.
    POOL_MAX: 6
  };

  var __mem = new Map();
  var __inflight = new Map();

  // ---- Pool global de requests (Idea 46, t1) ------------------------------
  // El limite MAX vivia duplicado dentro de cada dashboard, o sea que era
  // LOCAL: dos dashboards cargando a la vez = 6, y inventory-dashboard hacia
  // Promise.all de 3 DENTRO del pool = 9 requests simultaneos reales, contra
  // un MAX=3 que el codigo creia tener.
  // aca hay UN solo punto de estrangulacion para toda la capa API: jfetch().
  // El header real de ArenaNet es X-Rate-Limit-Limit: 600/min.
  // t2 (UI) lee poolStats() para poder decir "limitado por la API" en vez de
  // "Cargando" cuando la cola se esta acumulando.
  var __poolActive = 0;
  var __poolQueue = [];
  var __poolWaited = 0;   // requests que tuvieron que esperar turno
  var __poolWaitMs = 0;   // espera acumulada de la cola, en ms

  function poolStats() {
    return {
      max: CFG.POOL_MAX,
      active: __poolActive,
      queued: __poolQueue.length,
      waited: __poolWaited,
      waitMs: __poolWaitMs
    };
  }

  function poolRun(task) {
    return new Promise(function (resolve, reject) {
      __poolQueue.push({ task: task, resolve: resolve, reject: reject, enqueued: now() });
      poolPump();
    });
  }

  function poolPump() {
    while (__poolActive < CFG.POOL_MAX && __poolQueue.length) {
      var slot = __poolQueue.shift();
      var waited = now() - slot.enqueued;
      if (waited > 0) { __poolWaited++; __poolWaitMs += waited; }
      __poolActive++;
      (function (s) {
        function done() { __poolActive--; poolPump(); }
        // Promise.resolve().then(s.task) y no s.task() directo: si el task tira
        // SINCRONO (no devuelve promesa, lanza antes de retornar), el throw sube
        // por poolPump -> executor de poolRun, done() nunca corre y __poolActive
        // queda incrementado para siempre. Con POOL_MAX=6, seis de esos cuelgan la
        // app entera de forma permanente. Envolviendo, el throw se convierte en
        // rechazo y cae siempre en el reject de abajo -> done().
        Promise.resolve().then(s.task).then(function (v) { done(); s.resolve(v); },
                                            function (e) { done(); s.reject(e); });
      })(slot);
    }
  }

  function lsGet(key) {
    try { var j = localStorage.getItem(key); return j ? JSON.parse(j) : null; } catch (_) { return null; }
  }
  // Idea 49 Tramo A: antes esto era `catch (_) {}`, o sea tragaba CUALQUIER
  // error sin dejar rastro. El que importa es el de cuota: la cuota de
  // localStorage (~4.98 MB medidos en navegador real) es COMPARTIDA por todas
  // las claves cacheadas de la pagina, no por modulo. Cuando se llena, cada
  // escritura posterior falla y la app vuelve a arrancar en frio en cada
  // recarga, sin que nada lo diga: se presenta como "la Boveda anda lenta".
  //
  // Esto estaba enmascarado porque activities.js borraba la familia 'ach_*' en
  // cada navegacion a #/activities (wipe accidental = alivio de cuota). Al
  // quitar ese wipe (mismo heartbeat), la cuota se llena de verdad, asi que el
  // fallo deja de seripotetico y hay que poder nombrarlo.
  //
  // NO se relanza el error: la copia en __mem ya sirvio para esta sesion, y
  // un throw aca seria peor que el bug que se esta corrigiendo. Se cuenta y se
  // avisa UNA vez (no una por clave: son cientos de escrituras por carga).
  var __lsQuotaFails = 0;
  var __lsQuotaWarned = false;
  function isQuotaError(e) {
    if (!e) return false;
    return e.name === 'QuotaExceededError' ||
           e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
           e.code === 22 || e.code === 1014;   // legacy IE/Edge
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) {
      if (isQuotaError(e)) {
        __lsQuotaFails++;
        if (!__lsQuotaWarned) {
          __lsQuotaWarned = true;
          console.warn('[api-gw2] localStorage LLENO: la cache ya NO se guarda entre recargas.' +
            ' El error era silencioso (catch vacio) y la cuota es compartida por todos los' +
            ' modulos, asi que esto afecta a TODA la cache, no solo a la de logros.' +
            ' Ver BACKLOG.md Idea 49 (Tramo C: comprimir los logros es lo que lo arregla).');
        }
      }
      return false;
    }
  }
  function lsDel(key) { try { localStorage.removeItem(key); } catch (_) {} }
  function now() { return Date.now(); }
  function isFresh(entry, ttl) { return !!entry && typeof entry.ts === 'number' && (now() - entry.ts) <= ttl; }

  function fpToken(token) { var t = String(token || ''); return t ? (t.slice(0,4) + '…' + t.slice(-4)) : 'anon'; }

  function kMem(base, token) { return token ? (base + '::' + fpToken(token)) : base; }
  function kLS(base, token)  { return token ? (base + ':'  + fpToken(token)) : base; }

  function inflightOnce(ikey, producer) {
    if (__inflight.has(ikey)) return __inflight.get(ikey);
    var p = Promise.resolve().then(producer).finally(function () { __inflight.delete(ikey); });
    __inflight.set(ikey, p);
    return p;
  }

  function toNum(v, d) { var n = (v == null || v === '') ? NaN : +v; return isFinite(n) ? n : (d == null ? 0 : d); }

  function withToken(url, token) { var u = new URL(url); if (token) u.searchParams.set('access_token', token); return u.toString(); }
  function withParams(url, params) {
    var u = new URL(url);
    if (params) Object.keys(params).forEach(function (k) {
      var val = params[k];
      if (val != null) u.searchParams.set(k, String(val));
    });
    return u.toString();
  }

  // ------------------------------------------------------------------
  // Lotes parciales: la API responde 206 cuando SOLO PARTE de los ids
  // pedidos existen (medido 2026-09-30 sin token):
  //   /v2/items?ids=1,2,3      -> 404 "all ids provided are invalid"
  //   /v2/items?ids=1,2,3,4,5  -> 206 con SOLO los 2 validos
  //   /v2/items?ids=all        -> 400
  // El 206 es un 2xx, asi que `!res.ok` NO lo detecta y el lote se acepta
  // como completo. La regla es: un lote se valida contra los IDS PEDIDOS,
  // nunca contra el largo de la respuesta.
  //
  // NO se rellena por posicion NUNCA. Todos los consumidores buscan por
  // `obj.id`, asi que la posicion no importa; el dano real de no validar
  // es el dato faltante que se cachea como si estuviera completo.
  // ------------------------------------------------------------------
  function missingFromBatch(requested, received) {
    var got = Object.create(null);
    (received || []).forEach(function (o) {
      if (o && o.id != null) got[String(o.id)] = 1;
    });
    return requested.filter(function (id) { return !got[String(id)]; });
  }

  // Reintenta SOLO los ids que faltaban del 206. Con un piso de intentos
  // para que un id genuinamente invalido no dispare un loop: si no existe
  // en el catalogo, la API lo va a seguir tirando, y hay que devolver algo.
  function fetchBatchWithRepair(url, requested, opts) {
    return fetchWithRetry(url, opts).then(function (data) {
      // FORMA: degrada (interino, Idea 57 T2). Una respuesta con una forma
      // que no soportamos entra como `[]` y sale como "0 de N". Quien llama
      // (getItemsMany, getAchievementsMeta, getCommercePrices) la trata como
      // exito: sin este aviso no hay forma de distinguir "el lote vino vacio"
      // de "no supe leer el lote". El `catch` de RED si propaga, asi que el
      // unico camino que traga el error es este.
      var arr = Array.isArray(data) ? data : [];
      var left = missingFromBatch(requested, arr);
      if (!left.length) return arr;
      if (left.length === requested.length) {
        // No se filtro nada: o el endpoint no devuelve `id`, o el lote
        // entero fallo. No tiene sentido reintentar el mismo lote.
        return arr;
      }
      var u2 = url.replace(/([?&])ids=[^&]*/, '$1ids=' + left.join(','));
      // El reintento es una MEJORA, no un requisito. Los ids que faltaron
      // son, por definicion, ids que la API no tiene: si se los repregunta
      // sola, la API responde 404 ("all ids provided are invalid"), NO 206
      // -- porque 206 significa "queda al menos uno valido". Medido:
      //   /v2/items?ids=1,2,3      -> 404
      //   /v2/items?ids=1,2,3,4,5  -> 206 con los 2 validos
      // Sin este segundo handler de rechazo, ese 404 propagaba y
      // `arr` -- los ids validos que YA TENIAMOS -- se descartaba con el:
      // el fix empeoraba el bug que pretendia matar (dejaba sin icono todo
      // el lote, y sin cachear, en vez de solo el id invalido). Y en
      // getAchievementsMeta, que no tiene catch, tumbaba la vista entera.
      return fetchWithRetry(u2, opts).then(function (data2) {
        return arr.concat(Array.isArray(data2) ? data2 : []);
      }, function () {
        return arr;
      });
    });
  }

  function jfetch(url, opts) {
    opts = opts || {};
    var nocache = !!opts.nocache;
    var headers = Object.assign({ 'Accept': 'application/json' }, (opts.headers || {}));
    var init = {
      headers: headers,
      cache: nocache ? 'no-store' : 'default',
      mode: 'cors'
    };
    if (opts.signal) init.signal = opts.signal;

    // Todo request de la capa API pasa por el pool global (Idea 46 t1).
    // El slot se toma antes del fetch y se devuelve DESPUES de leer el body,
    // para que el limite cuente requests en vuelo y no solo fetch iniciados.
    return poolRun(function () {
      return fetch(url, init).then(function (res) {
        return res.text().then(function (raw) {
          if (!res.ok) {
            var msg = raw || ('HTTP ' + res.status);
            try {
              var o = raw ? JSON.parse(raw) : null;
              if (o && (o.text || o.error)) msg = o.text || o.error;
            } catch (_){}
            var err = new Error(msg); err.status = res.status; err.url = url; throw err;
          }
          try { return raw ? JSON.parse(raw) : null; }
          catch (e) { var er = new Error('JSON inválido en ' + url + ': ' + String(raw).slice(0,200)); er.url = url; throw er; }
        });
      });
    });
  }

  function fetchWithRetry(url, opts) {
    opts = opts || {};
    var max = (opts.retries != null) ? opts.retries : CFG.RETRIES;
    var attempt = 0;
    var lastErr;

    function jitter() { return Math.floor(Math.random() * 200); }

    function loop() {
      return jfetch(url, opts).catch(function (e) {
        lastErr = e;
        var retriable = e && (e.status === 429 || e.status === 503 || e.status === 504);
        if (!retriable || attempt >= max) throw lastErr;
        var backoff = Math.min(5000, CFG.RETRY_BASE_MS * Math.pow(2, attempt)) + jitter();
        attempt++;
        return new Promise(function (r) { setTimeout(r, backoff); }).then(loop);
      });
    }
    return loop();
  }

  function getCache(baseKey, ttl, token, nocache) {
    if (nocache) return null;
    var mkey = kMem(baseKey, token);
    var mval = __mem.get(mkey);
    if (isFresh(mval, ttl)) return mval.data;
    var lkey = kLS(baseKey, token);
    var lval = lsGet(lkey);
    if (isFresh(lval, ttl)) {
      __mem.set(mkey, { ts: lval.ts, data: lval.data });
      return lval.data;
    }
    return null;
  }
  function putCache(baseKey, data, token, ttl) {
    var entry = { ts: now(), data: data };
    __mem.set(kMem(baseKey, token), entry);
    lsSet(kLS(baseKey, token), entry);
  }

  // ========================================================================
  // Token info + permisos
  // ========================================================================
  function getTokenInfo(token, opts) {
    opts = opts || {};
    if (!token) return Promise.reject(new Error('Falta access_token'));
    var key = 'tokeninfo';
    var cached = getCache(key, TTL.TOKENINFO, token, opts.nocache);
    if (cached) return Promise.resolve(cached);

    var url = withToken(CFG.API_BASE + '/v2/tokeninfo', token);
    var ikey = 'if:tokeninfo:' + fpToken(token);

    return inflightOnce(ikey, function () {
      return fetchWithRetry(url, opts).then(function (data) {
        putCache(key, data, token, TTL.TOKENINFO);
        return data;
      });
    });
  }
  function tokenHasWVPermissions(tokenInfo) {
    try {
      var p = new Set((tokenInfo && tokenInfo.permissions) || []);
      return p.has('wizardsvault') || p.has('progression');
    } catch (_){ return false; }
  }

  // ========================================================================
  // Account info (con last_modified para detectar actividad)
  // ========================================================================
  function getAccountInfo(token, opts) {
    opts = opts || {};
    if (!token) return Promise.reject(new Error('Falta access_token'));
    
    var key = 'account_info';
    var cached = getCache(key, TTL.ACCOUNT, token, opts.nocache);
    if (cached) return Promise.resolve(cached);
    
    var url = withToken(CFG.API_BASE + '/v2/account?v=latest', token);
    var ikey = 'if:account_info:' + fpToken(token);
    
    return inflightOnce(ikey, function () {
      return fetchWithRetry(url, opts).then(function (data) {
        putCache(key, data, token, TTL.ACCOUNT);
        return data;
      });
    });
  }

  function isRecentlyActive(accountInfo, minutesThreshold) {
    if (!accountInfo || !accountInfo.last_modified) return false;
    
    var threshold = (minutesThreshold || 10) * 60 * 1000;
    var now = Date.now();
    var lastModified = new Date(accountInfo.last_modified).getTime();
    
    if (isNaN(lastModified)) return false;
    
    return (now - lastModified) <= threshold;
  }

  // ========================================================================
  // Character count
  // ========================================================================
  /**
   * Obtiene la cantidad de personajes de la cuenta
   * @param {string} token - API Key
   * @param {Object} opts - Opciones (nocache, etc.)
   * @returns {Promise<number>} - Cantidad de personajes
   * @throws {Error} si la API no se pudo leer (propaga, no degrada a 0)
   */
  function getCharacterCount(token, opts) {
    opts = opts || {};
    if (!token) return Promise.reject(new Error('Falta access_token'));

    var key = 'char_count';
    var cached = getCache(key, TTL.ACCOUNT, token, opts.nocache);
    if (cached !== null && typeof cached === 'number') return Promise.resolve(cached);

    var url = withToken(CFG.API_BASE + '/v2/characters', token);
    var ikey = 'if:char_count:' + fpToken(token);

    return inflightOnce(ikey, function () {
      return fetchWithRetry(url, opts).then(function (data) {
        // Guard de FORMA (Idea 60B). Mismo contrato que getAccountRaids
        // (v2.24.0) y mismo motivo: el JSDoc de arriba promete "no degrada
        // a 0" y solo lo cumplia el catch de RED. Una respuesta con una
        // forma que no soportamos llegaba como `0`, que en la columna
        // "Personajes" del Wallet Dashboard es indistinguible de "esta
        // cuenta no tiene personajes".
        //
        // ALCANZABLE, no teórico: `jfetch` devuelve `null` ante un 200 con
        // body vacío (`return raw ? JSON.parse(raw) : null`, api-gw2.js:408).
        // O sea que la API contestando 200 sin cuerpo landing acá produce
        // "0 personajes" sin ningún error visible.
        if (!Array.isArray(data)) {
          throw new Error(
            'characters: forma no soportada (' +
            (data === null ? 'null' : typeof data) +
            '). Se esperaba un array de personajes.'
          );
        }
        var count = data.length;
        putCache(key, count, token, TTL.ACCOUNT);
        return count;
      }).catch(function (error) {
        // Se registra y se propaga. Ver la nota de contrato en el JSDoc:
        // degradar a 0 acá sería indistinguible de "la cuenta no tiene personajes".
        console.warn(LOGP, 'Error getting character count:', error);
        throw error;
      });
    });
  }

  // ========================================================================
  // Raids
  // ========================================================================
  /**
   * Obtiene los IDs de encuentros completados por la cuenta
   * @param {string} token - API Key
   * @param {Object} opts - Opciones (nocache, etc.)
   * @returns {Promise<Array>} - Array de IDs de encuentros
   * @throws {Error} si la API no se pudo leer (propaga, no degrada a [])
   */
  function getAccountRaids(token, opts) {
    opts = opts || {};
    if (!token) return Promise.reject(new Error('Falta access_token'));
    
    var key = 'account_raids';
    var ttl = TTL.RAIDS;
    
    var cached = getCache(key, ttl, token, opts.nocache);
    if (cached) return Promise.resolve(cached);
    
    var url = withToken(CFG.API_BASE + '/v2/account/raids', token);
    var ikey = 'if:account_raids:' + fpToken(token);
    
    return inflightOnce(ikey, function () {
      return fetchWithRetry(url, opts).then(function (data) {
        // Guard de FORMA (Idea 56). El guard de red ya estaba abajo y
        // propagaba, pero una respuesta con una forma que no soportamos
        // degradaba a [] en silencio. En el Strike Tracker eso es
        // `state.completedStrikes = []` -> "0 de 15 completados", que es
        // EXACTAMENTE lo que se veria si la cuenta no hizo ninguno. No se
        // puede distinguir "no leí" de "no hay". Se propaga: los 5 call
        // sites ya manejan rechazo (allSettled / try-catch que relanza /
        // prefetch que lo ignora), verificado en el HB#54.
        //
        // OJO: un [] VACIO sigue siendo una respuesta valida y no entra por
        // aca. "No completaste nada" y "no lo pude leer" tienen que quedar
        // como dos estados distintos; este guard existe para eso.
        if (!Array.isArray(data)) {
          throw new Error(
            'account/raids: forma no soportada (' +
            (data === null ? 'null' : typeof data) +
            '). Se esperaba un array de ids de encuentro.'
          );
        }
        putCache(key, data, token, ttl);
        return data;
      }).catch(function (error) {
        // Se registra y se propaga. Ver la nota de contrato en el JSDoc:
        // degradar a [] acá sería indistinguible de "no completaste ningún encuentro".
        console.warn(LOGP, 'Error getting account raids:', error);
        throw error;
      });
    });
  }

  // ========================================================================
  // COMMERCE: Listings, Prices y Transactions del Trading Post (v2.15.0)
  // ========================================================================

  /**
   * Obtiene las órdenes de compra activas del jugador
   * @param {string} token - API Key con permiso tradingpost
   * @param {Object} opts - Opciones (nocache, etc.)
   * @returns {Promise<Array>}
   * @throws {Error} si la API no se pudo LEER (capa de RED; propaga)
   *
   * CONTRATO REAL (Idea 57 Tramo 3, v2.26.0) — este `@throws` mentia hasta
   * aca. Prometia que el error se propagaba sin excepciones y el codigo de
   * abajo si degrada. Hay DOS caminos de error y no se comportan igual:
   *   - capa de RED (fetch falla, 401, 403): el `.catch` de abajo PROPAGA.
   *   - capa de FORMA (respuesta 200 con una forma que no soportamos, o
   *     cuerpo vacio, que `jfetch` devuelve como `null`): degrada a `[]` en
   *     silencio, sin aviso y sin warning.
   * `[]` aqui significa indistinguible entre "no tenes ordenes" (verdad) y
   * "no supe leerte las ordenes" (mentira). El call site
   * (converter-modal.js:734) ya tiene `buysStatus = 'error'` y usa
   * allSettled, asi que puede distinguir: migrar al guard de la v2.24.0 es
   * seguro. Eso es el Tramo 2 de la Idea 57, pendiente de veredicto del
   * Reviewer (ALERT-48: es capa de datos, no se mergea "por merito").
   */
  function getCommerceTransactionsBuys(token, opts) {
    opts = opts || {};
    if (!token) return Promise.reject(new Error('Falta access_token'));

    var key = 'commerce_transactions_buys';
    var ttl = 60 * 1000; // 1 minuto

    var cached = getCache(key, ttl, token, opts.nocache);
    if (cached) return Promise.resolve(cached);

    var url = withToken(CFG.API_BASE + '/v2/commerce/transactions/current/buys', token);
    var ikey = 'if:commerce_transactions_buys:' + fpToken(token);

    return inflightOnce(ikey, function () {
      return fetchWithRetry(url, opts).then(function (data) {
        // FORMA: degrada. El JSDoc de arriba dice "propaga, no degrada a []"
        // y ACA NO SE CUMPLE: el `catch` de RED propaga, el camino de FORMA
        // no. Es el mismo bug que la v2.24.0 corrigio en getAccountRaids, una
        // funcion mas arriba, y que la v2.24.1 corrigio en getCharacterCount.
        // El call site (converter-modal.js:734) usa allSettled y ya tiene
        // `buysStatus = 'error'`: migrar al guard es seguro y no rompe nada.
        // Migracion = Tramo 2 de la Idea 57 (capa de datos, va al Reviewer).
        var tx = Array.isArray(data) ? data : [];
        putCache(key, tx, token, ttl);
        return tx;
      }).catch(function (error) {
        console.warn(LOGP, 'Error getting commerce transactions (buys):', error);
        throw error;
      });
    });
  }

  /**
   * Obtiene las órdenes de venta activas del jugador
   * @param {string} token - API Key con permiso tradingpost
   * @param {Object} opts - Opciones (nocache, etc.)
   * @returns {Promise<Array>}
   * @throws {Error} si la API no se pudo LEER (capa de RED; propaga)
   *
   * CONTRATO REAL (Idea 57 Tramo 3, v2.26.0) — este `@throws` mentia hasta
   * aca. Mismo caso que getCommerceTransactionsBuys, una funcion mas arriba:
   * RED propaga, FORMA degrada a `[]` en silencio. El call site ya usa
   * allSettled y arma `sellsStatus`, asi que puede distinguir.
   * Migracion al guard = Tramo 2 de la Idea 57 (va al Reviewer).
   */
  function getCommerceTransactionsSells(token, opts) {
    opts = opts || {};
    if (!token) return Promise.reject(new Error('Falta access_token'));

    var key = 'commerce_transactions_sells';
    var ttl = 60 * 1000; // 1 minuto

    var cached = getCache(key, ttl, token, opts.nocache);
    if (cached) return Promise.resolve(cached);

    var url = withToken(CFG.API_BASE + '/v2/commerce/transactions/current/sells', token);
    var ikey = 'if:commerce_transactions_sells:' + fpToken(token);

    return inflightOnce(ikey, function () {
      return fetchWithRetry(url, opts).then(function (data) {
        // FORMA: degrada. El JSDoc de arriba dice "propaga, no degrada a []"
        // y ACA NO SE CUMPLE: el `catch` de RED propaga, el camino de FORMA
        // no. Ver el bloque equivalente en getCommerceTransactionsBuys. El
        // call site (converter-modal.js:735) usa allSettled y ya tiene
        // `sellsStatus = 'error'`: migrar al guard es seguro.
        // Migracion = Tramo 2 de la Idea 57.
        var tx = Array.isArray(data) ? data : [];
        putCache(key, tx, token, ttl);
        return tx;
      }).catch(function (error) {
        console.warn(LOGP, 'Error getting commerce transactions (sells):', error);
        throw error;
      });
    });
  }

  /**
   * Obtiene los items del Trading Post que la cuenta aún NO ha recogido
   * (botín de ventas y compras pendientes de cobro).
   *
   * Endpoint: /v2/commerce/delivery — verificado 2026-09-29 (401 con token
   * inválido = existe; un endpoint inexistente devuelve 404 "not found").
   * Requiere API key con permiso `tradingpost`.
   *
   * A diferencia de buys/sells, acá el problema de negocio es del usuario:
   * lo que figura en la caja del TP y nunca se cobró. Sin esto, la Bóveda
   * muestra la venta como histórica y el ítem queda invisible.
   *
   * ⚠️ DESVIACIÓN DELIBERADA de sus sisters (revisado por el Code Reviewer):
   * buys/sells degradan a `[]` en error porque `[]` es su estado NORMAL. Acá
   * no: `[]` significaría "no tenés nada pendiente" cuando en realidad puede
   * ser "no se pudo leer". El caso que más probable lo dispara no es una caída
   * transitoria sino un **403 permanente por falta de scope `tradingpost`**,
   * que nunca se resuelve solo. Como el valor de esta feature ES el alerta,
   * un vacío silencioso la deja mintiendo sobre su único propósito.
   * Por eso acá el error se PROPAGA. La UI debe distinguir tres estados:
   * pendiente / vacío real / no se pudo leer.
   *
   * ⚠️ POR QUE ESTE ES EL CASO EXTREMO (Idea 57 Tramo 3, v2.26.0)
   * El parrafo de arriba no es una aspiracion: es el unico `@throws` del
   * archivo que describe por que el error NO puede degradarse. Y aun asi
   * el codigo no lo cumple entero. El `catch` de RED propaga, pero el camino
   * de FORMA (200 con cuerpo vacio -> `jfetch` devuelve `null`, o una forma
   * no soportada) entra como `[]` en silencio, exactamente el estado que el
   * parrafo de arriba dice que mentiria.
   *
   * O sea: el 403 por falta de scope SI se ve (propaga), y ese es el caso
   * que el parrafo menciona. El otro caso — la API responde 200 y no se
   * entiende — no se ve, y es el que todavia no esta arreglado. Por eso este
   * bloque se deja explicito y no se "normaliza": si alguien migra esta
   * funcion al guard, tiene que hacerlo leiendolo, no por routine.
   * Migracion = Tramo 2 de la Idea 57 (va al Reviewer).
   *
   * @param {string} token - API Key con permiso tradingpost
   * @param {Object} opts - Opciones (nocache, etc.)
   * @returns {Promise<Array>} - Array de entradas pendientes de recoger
   * @throws {Error} si la API no se pudo LEER (capa de RED; propaga)
   *   La capa de FORMA degrada a `[]`. Ver la nota de arriba.
   */
  function getCommerceDelivery(token, opts) {
    opts = opts || {};
    if (!token) return Promise.reject(new Error('Falta access_token'));

    var key = 'commerce_delivery';
    var ttl = 60 * 1000; // 1 minuto

    var cached = getCache(key, ttl, token, opts.nocache);
    if (cached) return Promise.resolve(cached);

    var url = withToken(CFG.API_BASE + '/v2/commerce/delivery', token);
    var ikey = 'if:commerce_delivery:' + fpToken(token);

    return inflightOnce(ikey, function () {
      return fetchWithRetry(url, opts).then(function (data) {
        // FORMA: degrada. El JSDoc de esta funcion es el mas explicito del
        // archivo: "Por eso aca el error se PROPAGA", con un parrafo entero
        // sobre por que `[]` mentiria en un panel cuyo unico proposito es
        // avisar. El `catch` de RED cumple esa promesa; el camino de FORMA
        // no. Es la brecha mas grande entre lo documentado y lo hecho que
        // queda en la capa API. El call site (converter-modal.js:763) ya
        // tiene try/catch con `deliveryStatus = 'error'`.
        // Migracion = Tramo 2 de la Idea 57.
        var delivery = Array.isArray(data) ? data : [];
        putCache(key, delivery, token, ttl);
        return delivery;
      }).catch(function (error) {
        // Se registra y se propaga. Ver la nota de contrato en el JSDoc:
        // degradar a [] acá sería indistinguible de "caja vacía".
        console.warn(LOGP, 'Error getting commerce delivery:', error);
        throw error;
      });
    });
  }

  /**
   * Obtiene la lista de IDs de items disponibles en la Compañía de Comercio
   *
   * NOTA DE CONTRATO — por qué esta NO propaga el error (Idea 47, 2026-09-30).
   * Es tentador "arreglar" esta función junto a los otros wrappers de commerce,
   * y estaria mal. A diferencia de /v2/commerce/transactions[buys|sells] y
   * /v2/commerce/delivery, este endpoint devuelve un catálogo GLOBAL del
   * mercado, no algo de la cuenta: `[]` es un estado NORMAL y frecuente (no
   * hay items publicados, o la API responde vacio), no un "no pude leer".
   *
   * Si pasara a rechazar, todos los call sites que hoy hacen
   * `.catch(function(){ return []; })` lo verian como fallo y el convertidor
   * pararia de mostrar precios en un momento en que la API funciona bien.
   *
   * Si alguna vez hay que distinguir, el camino es un estado mas en el call
   * site (como `deliveryStatus` / `buysStatus` en converter-modal.js), NO
   * propagar desde acá. Mismo criterio y mismo precedente que
   * getCommerceDelivery() en api-gw2.js:442-451.
   *
   * @param {Object} opts - Opciones (nocache, etc.)
   * @returns {Promise<Array>} - Array de IDs (vacio si el mercado no ofrece nada)
   */
  function getCommerceListings(opts) {
    opts = opts || {};
    var key = 'commerce_listings';
    var cached = getCache(key, TTL.COMM_LISTINGS, null, opts.nocache);
    if (cached) return Promise.resolve(cached);

    var url = CFG.API_BASE + '/v2/commerce/listings';
    var ikey = 'if:commerce_listings';

    return inflightOnce(ikey, function () {
      return fetchWithRetry(url, opts).then(function (data) {
        // FORMA: degrada. ESTA SI es una decision, y esta justificada en el
        // JSDoc de arriba (Idea 47): este endpoint devuelve el catalogo GLOBAL
        // del mercado, no algo de la cuenta, asi que `[]` es un estado NORMAL
        // y frecuente. Propagar apagaria el convertidor en un momento en que
        // la API funciona bien, porque los call sites hacen
        // `.catch(function(){ return []; })`. Si alguna vez hay que distinguir,
        // el camino es un estado mas en el call site, NO propagar desde aca.
        var ids = Array.isArray(data) ? data : [];
        putCache(key, ids, null, TTL.COMM_LISTINGS);
        return ids;
      }).catch(function (error) {
        console.warn(LOGP, 'Error getting commerce listings:', error);
        return [];
      });
    });
  }

  /**
   * Obtiene precios de compra/venta para items específicos
   * @param {Array} ids - Array de IDs de items
   * @param {Object} opts - Opciones (nocache, etc.)
   * @returns {Promise<Array>} - Array de { id, buys: { quantity, unit_price }, sells: { quantity, unit_price } }
   */
  function getCommercePrices(ids, opts) {
    opts = opts || {};
    ids = Array.isArray(ids) ? Array.from(new Set(ids)).filter(function (x) { return x != null; }) : [];
    if (!ids.length) return Promise.resolve([]);

    var out = [];
    var chunk = 200;
    var chain = Promise.resolve();

    for (var i = 0; i < ids.length; i += chunk) {
      (function (slice) {
        chain = chain.then(function () {
          var key = 'commerce_prices:' + slice.join(',');
          var cached = getCache(key, TTL.COMM_PRICES, null, opts.nocache);
          if (cached) { out = out.concat(cached || []); return; }

          var url = CFG.API_BASE + '/v2/commerce/prices?ids=' + slice.join(',');
          var ikey = 'if:' + key;

          return inflightOnce(ikey, function () {
            // Idea 49 (206 parcial): ver getItemsMany. `out` se arma con
            // concat, asi que un id faltante no corren a nadie: el dato
            // incorrecto no puede aparecer, solo el ausente.
            return fetchBatchWithRepair(url, slice, opts).then(function (data) {
              // FORMA: degrada. A diferencia de las sisters de commerce, el
              // `catch` NO propaga (solo avisa y sigue): por diseno, porque
              // `out` se arma por `concat` y un lote caido no puede correr a
              // los demas. El costo es que un fallo de forma de UN lote se ve
              // como un item sin precio, sin distinguirlo de "no hay precio".
              // Migracion = Tramo 2 de la Idea 57, y es la unica de las nueve
              // cuya decision requiere tocar el `catch` tambien, no solo la
              // guarda: por eso necesita el veredicto del Reviewer.
              var prices = Array.isArray(data) ? data : [];
              putCache(key, prices, null, TTL.COMM_PRICES);
              out = out.concat(prices);
            }).catch(function (error) {
              console.warn(LOGP, 'Error getting commerce prices:', error);
            });
          });
        });
      })(ids.slice(i, i + chunk));
    }
    return chain.then(function () { return out; });
  }

  // ========================================================================
  // INVENTORY: Bank, Materials, Legendary Armory (NUEVO v2.13.0)
  // ========================================================================

  /**
   * Obtiene el contenido del banco de la cuenta
   * @param {string} token - API Key
   * @param {Object} opts - Opciones (nocache, etc.)
   * @returns {Promise<Array>} - Array de items en el banco (null = slot vacío)
   * @throws {Error} si la API no se pudo LEER (capa de RED; propaga)
   *
   * CONTRATO REAL (Idea 57 Tramo 3, v2.26.0) — este `@throws` mentia hasta
   * aca. El codigo de abajo degrada a `[]` en el camino de FORMA, sin aviso.
   * `[]` aqui es indistinguible entre "banco vacio" y "no supe leer tu
   * banco". Los call sites (inventory-hub.js:216, inventory-dashboard.js:331)
   * ya usan allSettled y arman `state.readErrors`, asi que pueden
   * distinguir: migrar al guard de la v2.24.0 es seguro.
   * Migracion = Tramo 2 de la Idea 57 (va al Reviewer).
   */
  function getAccountBank(token, opts) {
    opts = opts || {};
    if (!token) return Promise.reject(new Error('Falta access_token'));
    
    var key = 'account_bank';
    var cached = getCache(key, TTL.BANK, token, opts.nocache);
    if (cached) return Promise.resolve(cached);
    
    var url = withToken(CFG.API_BASE + '/v2/account/bank', token);
    var ikey = 'if:account_bank:' + fpToken(token);
    
    return inflightOnce(ikey, function () {
      return fetchWithRetry(url, opts).then(function (data) {
        // FORMA: degrada. El JSDoc de arriba dice "propaga, no degrada a []"
        // y ACA NO SE CUMPLE: el `catch` de RED propaga, el camino de FORMA
        // no. El call site (inventory-hub.js:216, inventory-dashboard.js:331)
        // usa Promise.allSettled y ya arma `state.readErrors` con
        // "banco": migrar al guard no rompe nada y enciende la superficie de
        // error que hoy solo se enciende por RED.
        // Migracion = Tramo 2 de la Idea 57.
        var bank = Array.isArray(data) ? data : [];
        putCache(key, bank, token, TTL.BANK);
        return bank;
      }).catch(function (error) {
        console.warn(LOGP, 'Error getting account bank:', error);
        throw error;
      });
    });
  }

  /**
   * Obtiene el almacenamiento de materiales de la cuenta
   * @param {string} token - API Key
   * @param {Object} opts - Opciones (nocache, etc.)
   * @returns {Promise<Array>} - Array de { id: number, category: number, binding: string, count: number }
   * @throws {Error} si la API no se pudo LEER (capa de RED; propaga)
   *
   * CONTRATO REAL (Idea 57 Tramo 3, v2.26.0) — este `@throws` mentia hasta
   * aca. Mismo caso que getAccountBank, una funcion mas arriba: RED
   * propaga, FORMA degrada a `[]` en silencio. Call site con allSettled y
   * `readErrors` ya armados.
   * Migracion = Tramo 2 de la Idea 57 (va al Reviewer).
   */
  function getAccountMaterials(token, opts) {
    opts = opts || {};
    if (!token) return Promise.reject(new Error('Falta access_token'));
    
    var key = 'account_materials';
    var cached = getCache(key, TTL.MATERIALS, token, opts.nocache);
    if (cached) return Promise.resolve(cached);
    
    var url = withToken(CFG.API_BASE + '/v2/account/materials', token);
    var ikey = 'if:account_materials:' + fpToken(token);
    
    return inflightOnce(ikey, function () {
      return fetchWithRetry(url, opts).then(function (data) {
        // FORMA: degrada. El JSDoc de arriba dice "propaga, no degrada a []"
        // y ACA NO SE CUMPLE: el `catch` de RED propaga, el camino de FORMA
        // no. Call sites con allSettled y `readErrors` ya armados, igual que
        // el banco. Migracion = Tramo 2 de la Idea 57.
        var materials = Array.isArray(data) ? data : [];
        putCache(key, materials, token, TTL.MATERIALS);
        return materials;
      }).catch(function (error) {
        console.warn(LOGP, 'Error getting account materials:', error);
        throw error;
      });
    });
  }

  /**
   * Obtiene la armería legendaria de la cuenta
   * @param {string} token - API Key
   * @param {Object} opts - Opciones (nocache, etc.)
   * @returns {Promise<Array>} - Array de items en la armería legendaria
   * @throws {Error} si la API no se pudo LEER (capa de RED; propaga)
   *
   * CONTRATO REAL (Idea 57 Tramo 3, v2.26.0) — este `@throws` mentia hasta
   * aca. Mismo caso que getAccountBank y getAccountMaterials: RED propaga,
   * FORMA degrada a `[]` en silencio. Call site con allSettled y `readErrors`
   * ya armados (inventory-hub.js:218).
   * Migracion = Tramo 2 de la Idea 57 (va al Reviewer).
   */
  function getAccountLegendaryArmory(token, opts) {
    opts = opts || {};
    if (!token) return Promise.reject(new Error('Falta access_token'));
    
    var key = 'account_armory';
    var cached = getCache(key, TTL.ARMORY, token, opts.nocache);
    if (cached) return Promise.resolve(cached);
    
    var url = withToken(CFG.API_BASE + '/v2/account/legendaryarmory', token);
    var ikey = 'if:account_armory:' + fpToken(token);
    
    return inflightOnce(ikey, function () {
      return fetchWithRetry(url, opts).then(function (data) {
        // FORMA: degrada. El JSDoc de arriba dice "propaga, no degrada a []"
        // y ACA NO SE CUMPLE: el `catch` de RED propaga, el camino de FORMA
        // no. Call site con allSettled y `readErrors` ya armados
        // (inventory-hub.js:218). Migracion = Tramo 2 de la Idea 57.
        var armory = Array.isArray(data) ? data : [];
        putCache(key, armory, token, TTL.ARMORY);
        return armory;
      }).catch(function (error) {
        console.warn(LOGP, 'Error getting legendary armory:', error);
        throw error;
      });
    });
  }

  // ========================================================================
  // Wallet / Currencies (fallback para Astral Acclaim)
  // ========================================================================
  function getAccountWallet(token, opts) {
    opts = opts || {};
    if (!token) return Promise.reject(new Error('Falta access_token'));
    var key = 'wallet';
    var cached = getCache(key, TTL.WALLET, token, opts.nocache);
    if (cached) return Promise.resolve(cached);

    var url = withToken(CFG.API_BASE + '/v2/account/wallet', token);
    var ikey = 'if:wallet:' + fpToken(token);

    return inflightOnce(ikey, function () {
      return fetchWithRetry(url, opts).then(function (data) {
        putCache(key, data, token, TTL.WALLET);
        return data;
      });
    });
  }

  // ------------------------------------------------------------------------
  // Suerte (Luck) account-wide — /v2/account/luck
  // NO es una moneda de /v2/currencies: no aparece en ese endpoint.
  // Devuelve el luck total consumido (el "cuánto tengo" crudo). El umbral de
  // MF% se calcula aparte con window.LuckCurve.
  // ------------------------------------------------------------------------
  function getAccountLuck(token, opts) {
    opts = opts || {};
    if (!token) return Promise.reject(new Error('Falta access_token'));
    var key = 'luck';
    var cached = getCache(key, TTL.LUCK, token, opts.nocache);
    if (cached) return Promise.resolve(cached);

    var url = withToken(CFG.API_BASE + '/v2/account/luck', token);
    var ikey = 'if:luck:' + fpToken(token);

    return inflightOnce(ikey, function () {
      return fetchWithRetry(url, opts).then(function (data) {
        // FORMA: degrada. Y ESTE ES EL PEORO DE LOS ONCE, por una razon que
        // no aplica a los otros: aca el valor degradado no es `[]`, es `0`.
        // Y `0` ES UN VALOR VERDADERAMENTE POSIBLE. La API devuelve `[]` si
        // la cuenta nunca consumio esencia, y en ese caso el resultado
        // correcto ES 0. El comentario de abajo declara legitimo el valor
        // que es indistinguible del fallo: el codigo documenta la confusion
        // en vez de resolverla.
        //
        // Lo que Pablo ve (wallet-dashboard.js:451): la columna "Suerte (MF)"
        // mostrando "0%". Cero por ciento es una lectura que se cree en buena
        // fe. Compare con el caso de raids, donde `[]` es obviamente falso
        // para cualquiera que haya estado ahi: aca no hay nada obviamente
        // falso, hay un numero plausible. Es peor.
        //
        // ALCANZABLE, no teórico: `jfetch` devuelve `null` ante un 200 con
        // body vacío (api-gw2.js:408). O sea que la API contestando 200 sin
        // cuerpo produce "0% de suerte" sin error visible. Y esta funcion no
        // tiene console.warn ni rethrow: es la unica de las once donde el
        // fallo no deja ni rastro en la consola.
        //
        // Migracion = Tramo 2 de la Idea 57, y es la que mas justificacion
        // necesita: la forma correcta NO es un guard que lance (el modulo
        // entero pediria una columna de error mas), sino distinguir el
        // `null` de forma del `[]` legitimo y propagar SOLO el primero. Va al
        // Reviewer.
        var arr = Array.isArray(data) ? data : [];
        // La API devuelve [] si la cuenta nunca consumió esencia.
        var entry = arr.find(function (x) { return x && x.id === 'luck'; });
        var value = Number(entry && entry.value || 0);
        if (!isFinite(value) || value < 0) value = 0;
        putCache(key, value, token, TTL.LUCK);
        return value;
      });
    });
  }

  function getCurrenciesAll(opts) {
    opts = opts || {};
    var key = 'currencies_all:' + CFG.LANG;
    var cached = getCache(key, TTL.CURR, null, opts.nocache);
    if (cached) return Promise.resolve(cached);

    var url = withParams(CFG.API_BASE + '/v2/currencies', { ids: 'all', lang: CFG.LANG });
    var ikey = 'if:currencies_all:' + CFG.LANG;

    return inflightOnce(ikey, function () {
      return fetchWithRetry(url, opts).then(function (data) {
        putCache(key, data, null, TTL.CURR);
        return data;
      });
    });
  }

  function getAstralAcclaimBalance(token, opts) {
    opts = opts || {};
    return Promise.all([
      getAccountWallet(token, { nocache: !!opts.nocache }),
      getCurrenciesAll({ nocache: !!opts.nocache })
    ]).then(function (arr) {
      var wallet = arr[0] || [];
      var currs  = arr[1] || [];
      var aaMeta = currs.find(function (c) {
        var n = String(c && c.name || '').toLowerCase();
        return n.includes('astral') || n.includes('reconocimiento');
      });
      if (!aaMeta) return { value: 0, meta: { icon: null, id: null } };
      var w = wallet.find(function (x) { return x.id === aaMeta.id; });
      var value = Number(w && w.value || 0);
      return { value: value, meta: { icon: aaMeta.icon || null, id: aaMeta.id } };
    });
  }

  // ========================================================================
  // Achievements (cuenta + metadatos)
  // ========================================================================
  function getAccountAchievements(token, opts) {
    opts = opts || {};
    if (!token) return Promise.reject(new Error('Falta access_token'));
    var key = 'ach_acc';
    var cached = getCache(key, TTL.ACH_ACC, token, opts.nocache);
    if (cached) return Promise.resolve(cached);

    var url = withToken(CFG.API_BASE + '/v2/account/achievements', token);
    var ikey = 'if:ach_acc:' + fpToken(token);

    return inflightOnce(ikey, function () {
      return fetchWithRetry(url, opts).then(function (data) {
        putCache(key, data, token, TTL.ACH_ACC);
        return data;
      });
    });
  }

  // Idea 49 Tramo C: sharding de la metadata de logros.
  //
  // Antes la key era 'ach_meta_v2:<lang>:<ids>', con el id-set ENTERO dentro
  // del nombre. Eso hace que la cache NO se dedupe: cada cuenta tiene un
  // subconjunto distinto de logros, asi que cada una genera su propia key, y
  // como la metadata no depende del token (se cachea con null), 27 cuentas
  // guardan 27 veces la misma tabla, parcialmente solapada.
  //
  // Medido contra la API en vivo con ids reales (27 cuentas x ~1500 logros,
  // cuota de navegador 4.98 MB): 20.22 MB en 216 claves. NO ENTRA NI DE LEJOS.
  // Con sharding por id//200: 1.71 MB en 18 claves (-91.5%).
  //
  // El shard de un id es su posicion global, independiente de que cuenta lo
  // pidio: dos cuentas que comparten un id comparten el shard. Ese es el
  // criterio - una key que incluye el conjunto de lo que se busca deduplica
  // sola; una que incluye solo el valor, no.
  //
  // Y no se pide el shard entero: se pide SOLO lo que falta de el. Un shard ya
  // guardado no se vuelve a pedir nunca, y las cuentas siguientes solo aportan
  // los ids que todavia no estan. Asi el ahorro de red es real y no un
  // intercambio de cuota por peticiones.
  var ACH_META_SHARD = 200;
  var __achMetaPurged = false;

  // Campos que la API manda y la aplicacion NO lee. Se podan ANTES de
  // guardar, no al leer: dropearlos en el consumidor no ahorra un byte en
  // disco, que es justo lo que se esta intentando liberar.
  //
  // Verificado con grep sobre TODO js/: cero apariciones de .bits,
  // .requirement, .locked_text, .prerequisites y .point_cap. El unico
  // consumidor es achievements.js:1067 -> metaById, y de cada registro solo
  // usa id, name, icon, description, flags, tiers, rewards y type.
  // 'type' NO se poda: achievements.js:527 lo lee.
  //
  // Medido contra la API en vivo (3458 logros reales, lang=es, 27 cuentas x
  // ~1500 logros solapados, cuota 4.98 MB): la metadata cacheada baja de
  // 1.75 MB (35.2% de la cuota) a 0.81 MB (16.4%). Los 3458 logros tienen al
  // menos uno de estos campos.
  var ACH_META_DROP = ['bits', 'requirement', 'locked_text', 'prerequisites', 'point_cap'];

  function projectAchMeta(rec) {
    if (!rec || rec.id == null) return rec;
    var out = {};
    var keys = Object.keys(rec);
    for (var i = 0; i < keys.length; i++) {
      if (ACH_META_DROP.indexOf(keys[i]) === -1) out[keys[i]] = rec[keys[i]];
    }
    return out;
  }

  // Las keys viejas ('ach_meta_v2:<lang>:<id,id,...>') siguen ocupando cuota
  // hasta que se borran, y sin liberarlas el sharding NO ABRE NADA: la cuota
  // ya esta llena, asi que las keys nuevas no entran. Por eso la migracion va
  // aca y no es opcional. Solo toca el prefijo 'ach_meta_v2:' - 'ach_acc:' es
  // de otra cosa (TTL 2 min) y no se toca.
  function purgeLegacyAchMeta() {
    if (__achMetaPurged) return;
    __achMetaPurged = true;
    var prefix = 'ach_meta_v2:';
    try {
      var doomed = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (typeof k === 'string' && k.indexOf(prefix) === 0) doomed.push(k);
      }
      doomed.forEach(function (k) { lsDel(k); __mem.delete(k); });
    } catch (_) { /* sin localStorage no hay nada que purgar */ }
  }

  function getAchievementsMeta(ids, opts) {
    opts = opts || {};
    ids = Array.isArray(ids) ? Array.from(new Set(ids)) : [];
    if (!ids.length) return Promise.resolve([]);

    purgeLegacyAchMeta();

    // Agrupar por shard. El shard depende del id, no de quien lo pide.
    var byShard = new Map();
    ids.forEach(function (id) {
      var s = Math.floor(Number(id) / ACH_META_SHARD);
      var arr = byShard.get(s);
      if (!arr) { arr = []; byShard.set(s, arr); }
      arr.push(id);
    });

    var chain = Promise.resolve();

    byShard.forEach(function (shardIds, shard) {
      chain = chain.then(function () {
        var key = 'ach_meta_v3:' + CFG.LANG + ':' + shard;

        // El bag se lee SIEMPRE, incluso con nocache, y siempre se mergea
        // sobre lo que habia. Un shard es compartido por todas las cuentas
        // (el shard depende del id, no de quien lo pide): pisarlo con el
        // subconjunto de una sola cuenta dejaria al resto sin metadata, y el
        // siguiente lector tendria que volver a pedirla. nocache significa
        // "refresca lo que te pido", NO "olvida lo que ya sabes".
        var cached = getCache(key, TTL.ACH_META, null, false);
        var bag = (cached && typeof cached === 'object' && !Array.isArray(cached)) ? cached : {};

        // Solo lo que NO esta guardado todavia. Con nocache se vuelve a pedir
        // lo pedido, pero igual encima del bag existente.
        var missing = opts.nocache
          ? shardIds.slice()
          : shardIds.filter(function (id) { return bag[id] == null; });
        if (!missing.length) return;

        var url = withParams(CFG.API_BASE + '/v2/achievements?v=latest',
                             { ids: missing.join(','), lang: CFG.LANG });
        var ikey = 'if:' + key + ':' + missing.join(',');

        return inflightOnce(ikey, function () {
          // Idea 49 (206 parcial): se reintenta SOLO lo que falto. Sin esto
          // un 206 cacheaba el shard incompleto con putCache y los ids
          // ausentes quedaban fuera del bag hasta que venciera TTL.ACH_META:
          // achievements.js:1069 armaba metaById incompleto, con logros sin
          // nombre, sin icono, sin tiers y earnedAP = 0 en silencio.
          return fetchBatchWithRepair(url, missing, opts).then(function (data) {
            (data || []).forEach(function (rec) {
              if (rec && rec.id != null) bag[rec.id] = projectAchMeta(rec);
            });
            putCache(key, bag, null, TTL.ACH_META);
          });
        });
      });
    });

    // Se resuelve en el orden en que pidieron los ids, no en el orden en que
    // llegaron los shards, y deduplicado por id.
    //
    // El bag se RELEE del cache y no se usa el objeto local. Dos cargas
    // concurrentes del mismo shard en frio comparten el inflightOnce, asi que
    // solo la primera muta su bag local; la segunda resolveria contra un {}
    // y devolveria [] —y achievements.js:1069 armaria metaById incompleto,
    // con earnedAP en 0 y sin ningun error visible. Releer garantiza que quien
    // llego segundo vea lo que escribio quien llego primero.
    return chain.then(function () {
      var out = [], seen = Object.create(null);
      ids.forEach(function (id) {
        var shard = Math.floor(Number(id) / ACH_META_SHARD);
        var key = 'ach_meta_v3:' + CFG.LANG + ':' + shard;
        var bag = getCache(key, TTL.ACH_META, null, false);
        if (!bag || typeof bag !== 'object') return;
        var rec = bag[id];
        if (rec && !seen[rec.id]) { seen[rec.id] = 1; out.push(rec); }
      });
      return out;
    });
  }

  // ========================================================================
  // Items batch (con caché por id persistente)
  // ========================================================================
  function getItemsMany(ids, opts) {
    opts = opts || {};
    ids = Array.isArray(ids) ? Array.from(new Set(ids)).filter(function (x) { return x != null; }) : [];
    if (!ids.length) return Promise.resolve([]);

    var lkey = 'items_cache_v1:' + CFG.LANG;
    var bag = lsGet(lkey) || { ts: 0, data: {} };
    var per = bag.data || {};

    var out = [];
    var missing = [];
    ids.forEach(function (id) {
      var k = String(id);
      var c = per[k];
      if (!opts.nocache && c && isFresh(c, TTL.ITEMS)) {
        out.push(c.val);
      } else {
        missing.push(id);
      }
    });

    var chain = Promise.resolve();
    var chunk = 200;
    for (var i=0; i<missing.length; i+=chunk) {
      (function (slice) {
        chain = chain.then(function () {
          var url = withParams(CFG.API_BASE + '/v2/items', { ids: slice.join(','), lang: CFG.LANG });
          var ikey = 'if:items:' + CFG.LANG + ':' + slice.join(',');
          return inflightOnce(ikey, function () {
            // Idea 49 (206 parcial): el 206 es un 2xx, asi que `!res.ok` NO lo
            // ve. Sin reintentar lo que falto, un id invalido intercalado en
            // el lote dejaba ese item sin icono en el render, y como no se
            // cachea, el siguiente render lo volvia a pedir y recien ahi
            // aparecia. El consumidor busca por `it.id`, asi que no hay
            // corrimiento de posiciones: el dano es de dato faltante.
            return fetchBatchWithRepair(url, slice, opts).then(function (arr) {
              (arr || []).forEach(function (it) {
                out.push(it);
                per[String(it.id)] = { ts: now(), val: it };
              });
            }).catch(function (e) {
              console.warn(LOGP, 'items batch error', e);
            });
          });
        });
      })(missing.slice(i, i+chunk));
    }

    return chain.then(function () {
      // La resolucion final se arma desde la cache, NO desde `out` ni desde
      // `per`. Los dos son locales de esta llamada, y el producer de cada
      // lote se COMPARTE por inflightOnce entre llamadas concurrentes del
      // mismo id-set: solo la primera muta sus arrays, y la segunda resuelve
      // contra los suyos, que quedaron vacios -> [] sin ningun error visible.
      // Es el mismo defecto que se corrigio en getAchievementsMeta (el
      // BUG 1 de idea49.shard-concurrency.test.js), que nunca llego aqui.
      // Ademas escribir `per` desde el final pisaba el del otro con un
      // objeto vacio. Releyendo, quien llego segundo ve lo que escribio el
      // primero, y el cap de 500 se aplica sobre el estado combinado.
      var cur = lsGet(lkey);
      var fresh = (cur && cur.data && typeof cur.data === 'object') ? cur.data : {};
      // Se siembra con `per` (los aciertos de cache de la entrada) y se
      // superpone `fresh` (lo que escribieron los producers). `per` solo esta
      // completo si esta llamada gano la carrera del inflight; `fresh` solo
      // tiene lo que se escribio durante ESTA invocacion. La union de los dos
      // es lo que la resolucion necesita.
      var perNow = Object.assign({}, per, fresh);

      var keys = Object.keys(perNow);
      if (keys.length > 500) {
        var sorted = keys.sort(function (a, b) {
          return (perNow[a]?.ts || 0) - (perNow[b]?.ts || 0);
        });
        sorted.slice(0, keys.length - 400).forEach(function (k) { delete perNow[k]; });
      }
      lsSet(lkey, { ts: now(), data: perNow });

      // Se resuelve en el orden en que pidieron los ids, deduplicado por id,
      // e incluyendo lo que ya estaba cacheado al entrar.
      var seen = Object.create(null);
      var res = [];
      ids.forEach(function (id) {
        var c = perNow[String(id)];
        if (!c || !opts.nocache && !isFresh(c, TTL.ITEMS)) return;
        var v = c.val;
        if (v && v.id != null && !seen[v.id]) { seen[v.id] = 1; res.push(v); }
      });
      return res;
    });
  }

  // ========================================================================
  // WV — Delegados (retrocompatibilidad)
  // ========================================================================
  function _WV(){
    var WV = (typeof root !== 'undefined' && root.WizardsVault) ? root.WizardsVault : null;
    if (!WV) throw new Error('WizardsVault no cargado. Incluí js/wizards-vault.js después de api-gw2.js.');
    return WV;
  }
  function getWVSeason(opts){                return _WV().getWVSeason(opts); }
  function getWVDaily(token, opts){          return _WV().getWVDaily(token, opts); }
  function getWVWeekly(token, opts){         return _WV().getWVWeekly(token, opts); }
  function getWVSpecial(token, opts){        return _WV().getWVSpecial(token, opts); }
  function getWVAccount(token, opts){        return _WV().getWVAccount(token, opts); }
  function getWVListings(opts){              return _WV().getWVListings(opts); }
  function getAccountWVListings(token, opts){return _WV().getAccountWVListings(token, opts); }
  function wvComputeRemaining(limit, purchased, marked){ return _WV().wvComputeRemaining(limit, purchased, marked); }
  function wvMergeShopListings(acc, glb){    return _WV().wvMergeShopListings(acc, glb); }
  function getWVShopMerged(token, opts){     return _WV().getWVShopMerged(token, opts); }
  function wvInvalidateTargets(token){       return _WV().wvInvalidateTargets(token); }
  function wvPreloadTargets(token, opts){    return _WV().wvPreloadTargets(token, opts); }

  // ========================================================================
  // Utilidades públicas de debug
  // ========================================================================
  function indexArrayByKey(arr, key) {
    var map = new Map();
    (arr || []).forEach(function (o) { if (o && o[key] != null) map.set(o[key], o); });
    return map;
  }
  // Idea 49 Tramo A: expone el fallo de cuota para que sea inspeccionable y no
  // solo una linea de consola. quotaFails > 0 significa que la cache dejo de
  // persistir entre recargas; mientras siga en 0 el problema no existe.
  function cacheStats() {
    return { quotaFails: __lsQuotaFails, quotaWarned: __lsQuotaWarned };
  }
  function cacheClear() {
    try { __mem.clear(); __inflight.clear(); } catch (_){}
  }

  // ========================================================================
  // API pública
  // ========================================================================
  var API = {
    // Token / Permisos
    getTokenInfo: getTokenInfo,
    tokenHasWVPermissions: tokenHasWVPermissions,

    // Account info (con last_modified para detectar actividad)
    getAccountInfo: getAccountInfo,
    isRecentlyActive: isRecentlyActive,
    getCharacterCount: getCharacterCount,

    // Raids
    getAccountRaids: getAccountRaids,

    // Commerce (v2.15.0)
    getCommerceListings: getCommerceListings,
    getCommercePrices: getCommercePrices,
    getCommerceTransactionsBuys: getCommerceTransactionsBuys,
    getCommerceTransactionsSells: getCommerceTransactionsSells,
    getCommerceDelivery: getCommerceDelivery,

    // Inventory (NUEVO v2.13.0)
    getAccountBank: getAccountBank,
    getAccountMaterials: getAccountMaterials,
    getAccountLegendaryArmory: getAccountLegendaryArmory,

    // Wallet / Currencies (fallback AA)
    getAccountWallet: getAccountWallet,
    getAccountLuck: getAccountLuck,
    getCurrenciesAll: getCurrenciesAll,
    getAstralAcclaimBalance: getAstralAcclaimBalance,

    // Achievements
    getAccountAchievements: getAccountAchievements,
    getAchievementsMeta: getAchievementsMeta,

    // Wizard's Vault (delegados)
    getWVSeason: getWVSeason,
    getWVDaily: getWVDaily,
    getWVWeekly: getWVWeekly,
    getWVSpecial: getWVSpecial,
    getWVAccount: getWVAccount,
    getWVListings: getWVListings,
    getAccountWVListings: getAccountWVListings,

    // Shop helpers (delegados)
    wvComputeRemaining: wvComputeRemaining,
    wvMergeShopListings: wvMergeShopListings,
    getWVShopMerged: getWVShopMerged,

    // Items
    getItemsMany: getItemsMany,

    // WV targets helpers (delegados)
    wvInvalidateTargets: wvInvalidateTargets,
    wvPreloadTargets: wvPreloadTargets,

    // Debug / util
    __cfg: {
      API_BASE: CFG.API_BASE,
      TTL: CFG.TTL,
      LANG: CFG.LANG,
      setLang: function (lang) { if (lang) CFG.LANG = String(lang); },
      setRetries: function (n) { var x = +n; if (isFinite(x) && x >= 0 && x <= 5) CFG.RETRIES = x|0; },
      // Idea 46: estado del pool global. t2 lo usa para distinguir
      // "Cargando" de "limitado por la API (600/min)".
      poolStats: poolStats,
      setPoolMax: function (n) { var x = +n; if (isFinite(x) && x >= 1 && x <= 20) { CFG.POOL_MAX = x|0; poolPump(); } }
    },
    __cacheClear: cacheClear,
    __cacheStats: cacheStats,
    __indexArrayByKey: indexArrayByKey
  };

  root.GW2Api = API;
  console.info(LOGP, 'listo — métodos:', Object.keys(API).join(', '), 'lang=' + CFG.LANG, 'retries=' + CFG.RETRIES);

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));