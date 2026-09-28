/*!
 * js/legendary-tracker.js — Armería Legendaria
 * Proyecto: Bóveda del Gato Negro (GW2 Wallet Ligero)
 * Versión: 1.0.0 (2026-09-28) — Skeleton Phase 1
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
  var VER = '1.0.0';

  // ========================================================================
  // 1. CONFIGURACIÓN / ESTADO
  // ========================================================================

  var STORAGE_PREFIX = 'gn:legendary:';

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
    _refreshInFlight: null
  };

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

    var content = $('#legendaryModeContent');
    if (!content) return;

    if (mode === MODES.CATALOG) {
      renderCatalogSkeleton();
    } else {
      renderProgressSkeleton();
    }

    // Toggle active en botones
    $$('#legendaryModeCatalog, #legendaryModeProgress').forEach(function (b) {
      b.classList.toggle('btn--active', b.getAttribute('data-mode') === mode);
    });

    // Persistir modo
    sSet('mode', mode);

    console.log(LOG, 'mode changed to:', mode);
  }

  function renderCatalogSkeleton() {
    var content = $('#legendaryModeContent');
    if (!content) return;

    content.innerHTML = ''
      + '<div class="legendary-catalog" id="legendaryCatalogGrid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;">'
      +   '<p class="status muted">Cargando catálogo de legendarias…</p>'
      + '</div>';
  }

  function renderProgressSkeleton() {
    var content = $('#legendaryModeContent');
    if (!content) return;

    content.innerHTML = ''
      + '<div class="legendary-progress" id="legendaryProgressList">'
      +   '<p class="status muted">Cargando tu progreso de legendarias…</p>'
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
      // Re-render según modo actual
      if (state.mode === MODES.CATALOG) {
        renderCatalogSkeleton();
      } else {
        renderProgressSkeleton();
      }
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

  var LegendaryTracker = {
    initOnce: initOnce,
    activate: activate,
    deactivate: deactivate,
    refresh: refresh,
    prefetch: prefetch,
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
