/* =======================================================================
 * js/api-gw2.js  —  Capa API con fallbacks + caché persistente (mejorada)
 * Proyecto: Bóveda del Gato Negro (GW2 Wallet Ligero)
 * Versión: 2.18.0 (2026-09-30) — 7 wrappers propagan el error en vez de degradar (Idea 47 c2)
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
    POOL_MAX: 3
  };

  var __mem = new Map();
  var __inflight = new Map();

  // ---- Pool global de requests (Idea 46, t1) ------------------------------
  // El limite MAX=3 vivia duplicado dentro de cada dashboard, o sea que era
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
        // queda incrementado para siempre. Con POOL_MAX=3, tres de esos cuelgan la
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
  function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {} }
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
        var count = Array.isArray(data) ? data.length : 0;
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
        var raids = Array.isArray(data) ? data : [];
        putCache(key, raids, token, ttl);
        return raids;
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
   * @throws {Error} si la API no se pudo leer (propaga, no degrada a [])
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
   * @throws {Error} si la API no se pudo leer (propaga, no degrada a [])
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
   * @param {string} token - API Key con permiso tradingpost
   * @param {Object} opts - Opciones (nocache, etc.)
   * @returns {Promise<Array>} - Array de entradas pendientes de recoger
   * @throws {Error} si la API no se pudo leer (propaga, no degrada a [])
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
            return fetchWithRetry(url, opts).then(function (data) {
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
   * @throws {Error} si la API no se pudo leer (propaga, no degrada a [])
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
   * @throws {Error} si la API no se pudo leer (propaga, no degrada a [])
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
   * @throws {Error} si la API no se pudo leer (propaga, no degrada a [])
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

  function getAchievementsMeta(ids, opts) {
    opts = opts || {};
    ids = Array.isArray(ids) ? Array.from(new Set(ids)) : [];
    if (!ids.length) return Promise.resolve([]);

    var out = [];
    var chunk = 200;

    var chain = Promise.resolve();
    for (var i=0; i<ids.length; i+=chunk) {
      (function (slice) {
        chain = chain.then(function () {
          var key = 'ach_meta_v2:' + CFG.LANG + ':' + slice.join(',');
          var cached = getCache(key, TTL.ACH_META, null, opts.nocache);
          if (cached) { out = out.concat(cached || []); return; }

          var url = withParams(CFG.API_BASE + '/v2/achievements?v=latest', { ids: slice.join(','), lang: CFG.LANG });
          var ikey = 'if:' + key;

          return inflightOnce(ikey, function () {
            return fetchWithRetry(url, opts).then(function (data) {
              data = data || [];
              putCache(key, data, null, TTL.ACH_META);
              out = out.concat(data);
            });
          });
        });
      })(ids.slice(i, i+chunk));
    }
    return chain.then(function () { return out; });
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
            return fetchWithRetry(url, opts).then(function (arr) {
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
      // Cap de 500 entradas: eliminar los 100 más viejos si se excede
      var keys = Object.keys(per);
      if (keys.length > 500) {
        var sorted = keys.sort(function(a, b) {
          return (per[a]?.ts || 0) - (per[b]?.ts || 0);
        });
        sorted.slice(0, keys.length - 400).forEach(function(k) { delete per[k]; });
      }
      lsSet(lkey, { ts: now(), data: per });
      return out;
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
    __indexArrayByKey: indexArrayByKey
  };

  root.GW2Api = API;
  console.info(LOGP, 'listo — métodos:', Object.keys(API).join(', '), 'lang=' + CFG.LANG, 'retries=' + CFG.RETRIES);

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));