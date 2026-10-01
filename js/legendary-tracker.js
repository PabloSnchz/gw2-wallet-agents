/*!
 * js/legendary-tracker.js — Armería Legendaria
 * Proyecto: Bóveda del Gato Negro (GW2 Wallet Ligero)
 * Versión: 1.1.0 (2026-09-30) — T3+T4 (ALERT-84): contrato de registro + render real
 *
 * Módulo que reemplaza al filtro Legendario dentro de Logros (achievements.js).
 * Proporciona un catálogo completo de armas/armaduras/trinketes legendarios
 * y un "Mi progreso" con seguimiento de componentes y precios TP.
 *
 * Ruta: #/account/legendary-armory
 * Persistencia: prefijo gn:legendary:
 *
 * Dependencias:
 *  - GW2Api.getAccountLegendaryArmory() — legendarias desbloqueadas
 *  - GW2Api.getItemsMany()              — detalles de ítems (nombre, icono, tipo)
 *  - GW2Api.getCommercePrices()          — precios TP (buy/sell)
 *  - GW2Api.getAccountBank()             — inventario del banco
 *  - GW2Api.getAccountMaterials()        — almacen de materiales
 *  - legendary-data.js                   — catálogo estático de legendarias (Phase 2)
 */

(function (root) {
  'use strict';

  var LOG = '[LegendaryTracker]';
  // 1.1.0 (ALERT-84 T3+T4): la puerta de registro existe y el render usa las
  // funciones registradas. NO es la T3 completa del PO (sigue sin datos de API:
  // loadLegendaryData() es un stub) — es el CONTRATO y el cableado.
  var VER = '1.1.0';

  // ========================================================================
  // 1. CONFIGURACIÓN / ESTADO
  // ========================================================================

  var STORAGE_PREFIX = 'gn:legendary:';

  // Contrato T4 (ALERT-84). Son las 4 claves que `render-catologo.js` entrega en
  // su `registerRender`, y el orden importa solo para el informe: no se ordena.
  //
  // POR QUE ESTA LISTA Y NO "lo que venga": `registerRender` sin lista aceptaria
  // un objeto con 1 clave y pondria el flag en true. El pipeline creeria que hay
  // contrato donde hay un hueco, y el hueco se descubre al PINTAR — que es tarde
  // y en la pantalla del usuario. Un registro parcial tiene que ser
  // indistinguible de NINGUN registro, y eso se consigue rechazandolo.
  var REQUIRED_RENDERERS = ['filterBar', 'catalogGrid', 'skeleton', 'progress'];

  // Límites de posesión por tipo (según spec)
  var POSSESSION_LIMITS = {
    weapon: 3,
    armor: 6,
    accessory: 5,
    back: 2
  };

  // Modos de vista
  var MODES = {
    CATALOG: 'catalog',      // Grid 5 columnas estilo InventoryHub
    PROGRESS: 'progress'     // Filas colapsables estilo Raid/Strike Tracker
  };

  // Estado interno
  var state = {
    inited: false,
    active: false,
    mode: MODES.CATALOG,       // modo activo
    token: null,
    armory: [],               // legendarias desbloqueadas (del API)
    items: {},                // cache de items (id -> detalle)
    prices: {},               // cache de precios TP (itemId -> price)
    materials: {},            // material storage {itemId: count}
    bank: {},                 // bank items {itemId: count}
    characterItems: {},       // items en personajes {itemId: count}
    loading: false,
    error: null,
    // T4: las funciones de render registradas por `render-catologo.js`. Null
    // hasta que ese script se carga y registra. Es un punto de observabilidad
    // DISTINTO del del catálogo (`root.LegendaryCatalog`, que se autoexpone al
    // cargarse): los dos pueden volverse falsos por separado, y por eso son
    // dos asserts y no uno.
    renderers: null,
    // Lo que le faltó al ÚLTIMO registro rechazado. Sin esto, `missing` tendría
    // que mentir: después de un intento parcial no hay contrato, y la pregunta
    // útil es "que le faltaba", no "que le falta a un contrato que nunca existió".
    _renderMissing: REQUIRED_RENDERERS.slice(),
    _refreshInFlight: null
  };

  // Filtros activos de la vista catálogo (ALERT-84 T3). Los consume
  // `renderFilterBar(filters, catalog)`; los aplica `applyFilters()`.
  var filters = { type: null, generation: null, expansion: null };

  // ========================================================================
  // 2. UTILIDADES
  // ========================================================================

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var esc = function (s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  function getSelectedToken() {
    var s = el('keySelectGlobal');
    return s ? (s.value || '').trim() : null;
  }
  function el(id) { return document.getElementById(id); }

  function sSet(key, val) {
    try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val)); } catch (_) {}
  }
  function sGet(key) {
    try { var j = localStorage.getItem(STORAGE_PREFIX + key); return j ? JSON.parse(j) : null; } catch (_) { return null; }
  }

  function toast(msg, type) {
    var t = type || 'info';
    var detail = {
      message: msg,
      duration: t === 'success' ? 4000 : 3500,
      type: t
    };
    document.dispatchEvent(new CustomEvent('gn:toast', { detail: detail }));
  }

  // ========================================================================
  // 3. SKELETON DOM — estructura vacía con toggle
  // ========================================================================

  function ensurePanelContent() {
    var body = $('#legendaryArmoryBody');
    if (!body) return;

    // Si ya fue inicializado, no volver a inyectar
    if (body.getAttribute('data-initialized') === 'true') return;

    body.innerHTML = ''
      + '<div class="legendary-view-toggle" style="display:flex;gap:8px;margin-bottom:16px;align-items:center;">'
      +   '<span class="legendary-mode-label" style="font-size:0.77rem;color:var(--text-secondary);">Modo:</span>'
      +   '<button id="legendaryModeCatalog" class="btn btn--ghost btn--small" data-mode="catalog">'
      +     '<span class="btn__label">Catálogo</span>'
      +   '</button>'
      +   '<button id="legendaryModeProgress" class="btn btn--ghost btn--small" data-mode="progress">'
      +     '<span class="btn__label">Mi progreso</span>'
      +   '</button>'
      + '</div>'
      + '<div id="legendaryModeContent" class="legendary-mode-content">'
      +   '<!-- Contenido dinámico según modo -->'
      +   '<p class="status muted" style="padding:16px;">Seleccioná un modo para comenzar.</p>'
      + '</div>';

    body.setAttribute('data-initialized', 'true');

    wireViewToggle();
  }

  function wireViewToggle() {
    var btns = $$('#legendaryModeCatalog, #legendaryModeProgress');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-mode');
        setMode(mode);
      });
    });
  }

  function setMode(mode) {
    if (mode !== MODES.CATALOG && mode !== MODES.PROGRESS) return;

    state.mode = mode;

    // Persistir modo
    sSet('mode', mode);

    console.log(LOG, 'mode changed to:', mode);

    renderCurrentMode();
  }

  // ========================================================================
  // 3b. RENDER — usa lo que `render-catologo.js` registró (ALERT-84 T3)
  // ========================================================================
  //
  // La cadena anterior era:
  //
  //     doRefresh() -> loadLegendaryData()   // stub, resuelve [] en microsegundos
  //                 -> renderCatalogSkeleton()   // "modulo en construccion"
  //
  // El stub resuelve, no rechaza, y no hay timeout ni reintento: el ciclo
  // termina y lo que queda pintado es un mensaje que nunca se va. Un error se
  // investiga; un mensaje estatico coopera con el lector y lo hace creer que
  // hay algo que esperar.
  //
  // Ahora: si hay renderers registrados, se pintan ellos. Si NO los hay (el
  // script no se cargo, o registro a medias y fue rechazado), se vuelve al
  // mensaje honesto — y `state.renderersRegistered` queda en false, que es lo
  // que permite distinguir "el modulo todavia no esta" de "el modulo se rompio".
  function catalogItems() {
    var cat = (root.LegendaryCatalog && root.LegendaryCatalog.items) || [];
    return cat.filter(function (item) {
      if (!item) return false;
      if (filters.type && item.type !== filters.type) return false;
      if (filters.generation && String(item.generation) !== String(filters.generation)) return false;
      if (filters.expansion && item.expansion !== filters.expansion) return false;
      return true;
    });
  }

  // `owned` es {id: count}. El stub de API no trae nada, asi que hoy es {} y la
  // vista de progreso pinta su estado vacio honesto ("aun no posees ninguna").
  function ownedMap() {
    var m = {};
    (state.armory || []).forEach(function (it) {
      var id = typeof it === 'object' ? (it.id || it.item_id) : it;
      if (id) m[id] = (m[id] || 0) + 1;
    });
    return m;
  }

  function catalogStats(items, owned) {
    var total = items.length;
    var n = 0;
    items.forEach(function (item) { if (owned[item.id] > 0) n++; });
    return { owned: n, total: total, pct: total ? Math.round((n / total) * 100) : 0 };
  }

  function renderCurrentMode() {
    var content = $('#legendaryModeContent');
    if (!content) return;

    var r = state.renderers;

    // Sin contrato: mensaje honesto. Es el MISMO texto que pintaba el
    // skeleton, y ahora es verdad en vez de promesa.
    if (!r) {
      if (state.mode === MODES.CATALOG) {
        renderCatalogSkeleton();
      } else {
        renderProgressSkeleton();
      }
      return;
    }

    var all = (root.LegendaryCatalog && root.LegendaryCatalog.items) || [];
    var owned = ownedMap();

    if (state.mode === MODES.CATALOG) {
      var items = catalogItems();
      content.innerHTML = r.filterBar(filters, all) + r.catalogGrid(items, owned);
      wireFilterBar();
    } else {
      content.innerHTML = r.progress({ owned: owned, mode: state.mode }, catalogStats(all, owned));
    }
  }

  // Delegación de eventos: los botones de filtro los genera `render-catologo.js`
  // y no tienen id, solo `data-ftype`/`data-fvalue`. Un listener por cada
  // re-render seria una fuga; uno por contenedor, no.
  function wireFilterBar() {
    var bar = $('#legendaryModeContent .lt-filter-bar');
    if (!bar || bar.getAttribute('data-wired') === 'true') return;
    bar.setAttribute('data-wired', 'true');
    bar.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;

      var ft = t.getAttribute('data-ftype');
      if (ft) {
        var v = t.getAttribute('data-fvalue');
        var cur = filters[ft];
        filters[ft] = (String(cur) === String(v)) ? null : v;
        renderCurrentMode();
        return;
      }
      if (t.getAttribute('data-action') === 'clear-filters') {
        filters.type = null;
        filters.generation = null;
        filters.expansion = null;
        renderCurrentMode();
      }
    });
  }

  // ALERT-84 (PO, ronda 17). Estas dos funciones se llamaban "skeleton" y decian
  // "Cargando catalogo de legendarias..." PARA SIEMPRE. La cadena era:
  //
  //     doRefresh() -> loadLegendaryData()  // stub, resuelve [] en microsegundos
  //                 -> renderCatalogSkeleton()
  //
  // El stub resuelve, no rechaza, y no hay timeout ni reintento: el ciclo
  // termina y lo que queda painted es la palabra "Cargando". Un error se
  // investiga; un "Cargando" infinito se espera.
  //
  // Lo que cambia aqui NO es la funcionalidad (T3/T4 la implementan) sino el
  // ESTADO que la app dice de si misma. El item de menu es visible
  // (`index.html:761` de ESTE arbol; en `main@d328969` es 750, 11 menos: el boton
  // de cache suma 11 lineas antes), la ruta esta registrada (`router.js:125`) y
  // el panel existe (`index.html:539`): desde el momento en que eso es cierto, el
  // esqueleto dejo de ser una etapa interna y paso a ser una PROMESA, y no hay
  // forma de retractarla porque no existe el estado "todavia no".
  //
  // Se conservan los `id` (`legendaryCatalogGrid`, `legendaryProgressList`) y el
  // grid de 5 columnas: son el contrato que `render-catologo.js` (Phase 3
  // Commit 1, todavia no cableado) va a usar cuando T3/T4 lo enganchen. Lo que
  // no se conserva es la palabra "Cargando".
  function renderCatalogSkeleton() {
    var content = $('#legendaryModeContent');
    if (!content) return;

    content.innerHTML = ''
      + '<div class="legendary-catalog" id="legendaryCatalogGrid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;">'
      +   '<p class="status muted">Armería legendaria: módulo en construcción. El catálogo todavía no está implementado.</p>'
      + '</div>';
  }

  function renderProgressSkeleton() {
    var content = $('#legendaryModeContent');
    if (!content) return;

    content.innerHTML = ''
      + '<div class="legendary-progress" id="legendaryProgressList">'
      +   '<p class="status muted">Armería legendaria: módulo en construcción. El seguimiento de progreso todavía no está implementado.</p>'
      + '</div>';
  }

  // ========================================================================
  // 4. API — stubs para Phase 2
  // ========================================================================

  async function loadLegendaryData(nocache) {
    // Phase 2: cargar datos de /v2/account/legendaryarmory + /v2/items + /v2/commerce/prices
    // Phase 2: cargar datos estáticos de legendary-data.js
    console.log(LOG, 'loadLegendaryData() — not implemented (Phase 2)');
    return Promise.resolve([]);
  }

  async function refresh(forceNoCache) {
    if (state._refreshInFlight) return state._refreshInFlight;
    try {
      state._refreshInFlight = doRefresh(!!forceNoCache);
      await state._refreshInFlight;
    } finally {
      state._refreshInFlight = null;
    }
  }

  async function doRefresh(nocache) {
    state.loading = true;
    state.error = null;

    var token = getSelectedToken();
    if (!token) {
      state.loading = false;
      return;
    }

    try {
      await loadLegendaryData(nocache);
      // T3: re-render con lo registrado. Sin renderers cae al mensaje honesto.
      renderCurrentMode();
    } catch (e) {
      state.error = e;
      console.warn(LOG, 'doRefresh error:', e);
    } finally {
      state.loading = false;
    }
  }

  // ========================================================================
  // 5. CICLO DE VIDA DEL MÓDULO
  // ========================================================================

  function activate() {
    if (state.active) return;
    state.active = true;

    console.log(LOG, 'activate()');

    var panel = el('legendaryArmoryPanel');
    if (panel) panel.removeAttribute('hidden');

    // Cargar modo persistido (o default)
    var savedMode = sGet('mode');
    state.mode = (savedMode === MODES.PROGRESS) ? MODES.PROGRESS : MODES.CATALOG;

    ensurePanelContent();

    // Activar botón del modo actual
    setMode(state.mode);

    // Cargar datos
    var token = getSelectedToken();
    state.token = token;
    if (token) {
      refresh(false).catch(function (e) {
        console.warn(LOG, 'activate refresh error:', e);
      });
    }
  }

  function deactivate() {
    if (!state.active) return;
    state.active = false;

    console.log(LOG, 'deactivate()');

    var panel = el('legendaryArmoryPanel');
    if (panel) panel.setAttribute('hidden', 'hidden');
  }

  function prefetch(ctx) {
    if (ctx && ctx.signal && ctx.signal.aborted) return;
    var token = getSelectedToken();
    if (!token) return;
    return loadLegendaryData(false).catch(function (e) {
      console.debug(LOG, 'prefetch error (ignored)', e);
    });
  }

  function wireGlobalEvents() {
    // Escuchar cambios de cuenta (único canal: gn:tokenchange)
    document.addEventListener('gn:tokenchange', function () {
      if (!state.active) return;
      console.log(LOG, 'gn:tokenchange detected, reloading...');
      var token = getSelectedToken();
      state.token = token;
      refresh(true).catch(function (e) {
        console.warn(LOG, 'onTokenChanged refresh error:', e);
      });
    });
  }

  function initOnce() {
    if (state.inited) return;
    wireGlobalEvents();
    state.inited = true;
    console.log(LOG, 'ready v' + VER);
  }

  // ========================================================================
  // 6. API PÚBLICA
  // ========================================================================

  // ALERT-84 T4. La puerta que `render-catologo.js` pide en su bloque de
  // REGISTRO. Acepta SOLO un registro completo: las 4 claves de
  // REQUIRED_RENDERERS, y ademas cada una tiene que ser `function`.
  //
  // Por que se rechaza lo incompleto en vez de aceptarlo "para despues": un
  // registro a medias deja `registered` en true y el resto del modulo cree que
  // hay contrato. El error aparece al pintar — sin excepcion, en la pantalla,
  // como un modulo vacio — que es el modo de fallo mas dificil de leer. Aca se
  // puede rechazar en el momento en que pasa, nombrando lo que falta.
  function registerRender(map) {
    var missing = [];
    REQUIRED_RENDERERS.forEach(function (key) {
      if (!map || typeof map[key] !== 'function') missing.push(key);
    });

    if (missing.length > 0) {
      state.renderers = null;
      state._renderMissing = missing;
      console.warn(LOG, 'registro incompleto, rechazado. Faltan: ' + missing.join(', '));
      return false;
    }

    state.renderers = {
      filterBar: map.filterBar,
      catalogGrid: map.catalogGrid,
      skeleton: map.skeleton,
      progress: map.progress
    };
    state._renderMissing = [];
    console.info(LOG, 'renderers registrados (' + REQUIRED_RENDERERS.length + ')');

    // Si el panel ya esta montado, pintar ahora: el registro puede ocurrir
    // DESPUES del primer activate() (los <script> van con defer y el orden
    // solo garantiza tracker -> render-catologo). Sin esto, entrar a la ruta
    // antes del registro dejaria el mensaje honesto pegado.
    if (state.active) {
      try { renderCurrentMode(); } catch (e) { console.warn(LOG, 'render tras registro fallo:', e); }
    }
    return true;
  }

  // Punto de observabilidad del REGISTRO. Distinto del del catálogo
  // (`root.LegendaryCatalog.items.length`), y esa distincion es el motivo de
  // existir: los dos pueden fallar por separado y un solo assert no los separa.
  function getRenderState() {
    var r = state.renderers;
    return {
      registered: !!r,
      keys: r ? Object.keys(r) : [],
      missing: r ? [] : state._renderMissing.slice(),
      catalogItems: ((root.LegendaryCatalog && root.LegendaryCatalog.items) || []).length
    };
  }

  var LegendaryTracker = {
    initOnce: initOnce,
    activate: activate,
    deactivate: deactivate,
    refresh: refresh,
    prefetch: prefetch,
    registerRender: registerRender,
    getRenderState: getRenderState,
    _debug: function () {
      return {
        version: VER,
        inited: state.inited,
        active: state.active,
        mode: state.mode,
        token: state.token ? (state.token.slice(0, 8) + '...') : null,
        armoryCount: state.armory.length,
        loading: state.loading,
        error: state.error ? String(state.error.message || state.error) : null,
        render: getRenderState(),
        filters: { type: filters.type, generation: filters.generation, expansion: filters.expansion },
        dom: {
          panel: !!el('legendaryArmoryPanel'),
          panelVisible: el('legendaryArmoryPanel') ? !el('legendaryArmoryPanel').hasAttribute('hidden') : false,
          body: !!el('legendaryArmoryBody'),
          catalogBtn: !!el('legendaryModeCatalog'),
          progressBtn: !!el('legendaryModeProgress')
        }
      };
    },
    Route: {
      path: 'account/legendary-armory',
      mount: activate,
      unmount: deactivate,
      prefetch: prefetch
    }
  };

  // ========================================================================
  // 7. BOOT
  // ========================================================================

  root.LegendaryTracker = LegendaryTracker;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnce);
  } else {
    initOnce();
  }

  console.info(LOG, 'Módulo cargado v' + VER);

})(typeof window !== 'undefined' ? window : this);
