/*!
 * js/legendary-tracker.js — Seguimiento del Armería Legendaria
 * Proyecto: Bóveda del Gato Negro (GW2 Wallet Ligero)
 * v1.0.0 (Phase 3 — Skeleton + Render)
 *
 * Responsabilidades:
 *  - Estado: modo (Catálogo / Mi progreso), filtros, items owned
 *  - Lifecycle: activate() / deactivate() / refresh()
 *  - Delegar renderizado a render-catologo.js y detail-modal.js
 *  - Badge de progreso en el panel header
 *
 * Consume:
 *  - window.LegendaryCatalog (js/legendary-data.js) — 206 legendarias
 *  - window.GW2Api.getAccountLegendaryArmory() — items owned (Phase 3 commit 4)
 *  - window.__GN__.getSelectedToken() — token activo
 *
 * Route: #/account/legendary-armory
 * Panel: <section id="legendaryTrackerPanel">
 */

(function (root) {
  'use strict';

  var LOG = '[LegendaryTracker]';
  var L = null; // AbortController de la carga actual

  // =======================================================================
  // UTILIDADES (locales, mismas que otros módulos)
  // =======================================================================
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]);
    });
  }
  function fmtInt(n) { n = Number(n || 0); return n.toLocaleString('es-AR'); }
  function getSelectedToken() {
    try { return root.__GN__?.getSelectedToken?.() || null; } catch (_) { return null; }
  }
  function formatCoinShort(copper) {
    if (!copper || copper <= 0) return '—';
    var g = Math.floor(copper / 10000);
    if (g > 0) return g.toLocaleString('es-AR') + 'g';
    var s = Math.floor((copper % 10000) / 100);
    if (s > 0) return s + 's';
    return (copper % 100) + 'c';
  }

  // =======================================================================
  // ESTADO
  // =======================================================================
  var state = {
    active: false,
    mode: 'catalogo',       // 'catalogo' | 'progreso'
    filters: { type: '', generation: '', expansion: '' },
    owned: {},              // {itemId (string): count (number)} — populated en refresh()
    ownable: {},            // {itemId: true} — items que la cuenta puede poseer (del armory API)
    loading: false,
    lastToken: null,
    lastRender: 0
  };

  // Render functions delegadas (registrarse vía registerRender)
  var render = {
    filterBar: null,
    catalogGrid: null,
    skeleton: null,
    progress: null
  };

  // =======================================================================
  // UTILIDADES DE DATOS
  // =======================================================================
  function getCatalogItems() {
    return (root.LegendaryCatalog && root.LegendaryCatalog.items) || [];
  }

  function getFilteredItems() {
    var items = getCatalogItems();
    var f = state.filters;
    return items.filter(function (item) {
      if (!item) return false;
      if (f.type && item.type !== f.type) return false;
      if (f.generation && String(item.generation) !== String(f.generation)) return false;
      if (f.expansion && item.expansion !== f.expansion) return false;
      return true;
    });
  }

  function computeStats() {
    var catalog = getCatalogItems();
    var ownedCount = 0;
    catalog.forEach(function (item) {
      if (state.owned[item.id] && state.owned[item.id] > 0) ownedCount++;
    });
    return {
      owned: ownedCount,
      total: catalog.length,
      pct: catalog.length > 0 ? Math.round((ownedCount / catalog.length) * 100) : 0
    };
  }

  // =======================================================================
  // RENDER PRINCIPAL
  // =======================================================================
  function renderPanel() {
    var body = $('#ltPanelBody');
    if (!body) return;

    // Actualizar badge del header
    var stats = computeStats();
    var badgeOwned = $('#ltBadgeOwned');
    if (badgeOwned) badgeOwned.textContent = fmtInt(stats.owned) + ' / ' + fmtInt(stats.total);

    if (state.loading) {
      body.innerHTML = (render.skeleton ? render.skeleton() : renderSkeletonFallback());
      return;
    }

    var html = renderHeader();

    if (state.mode === 'catalogo') {
      html += (render.filterBar ? render.filterBar(state.filters, getCatalogItems()) : '');
      html += (render.catalogGrid ? render.catalogGrid(getFilteredItems(), state.owned) : renderCatalogFallback(getFilteredItems(), state.owned));
    } else {
      html += (render.progress ? render.progress(state, stats) : renderProgressFallback(stats));
    }

    body.innerHTML = html;
    wireEvents(body);
  }

  function renderHeader() {
    return '<div class="lt-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<img src="assets/icons/Cuentas/157085.png" alt="" width="28" height="28" style="filter:brightness(0.9);">' +
        '<h2 style="margin:0;font-size:1.1rem;font-weight:700;color:var(--tx-1);">Armería Legendaria</h2>' +
      '</div>' +
      '<div class="lt-mode-toggle" style="display:flex;gap:4px;background:var(--bg-1);border:1px solid var(--bd-1);border-radius:8px;padding:2px;">' +
        '<button class="lt-mode-btn ' + (state.mode === 'catalogo' ? 'active' : '') + '" data-mode="catalogo" style="padding:4px 14px;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer;border:none;background:transparent;color:var(--tx-2);transition:all 0.15s ease;">Catálogo</button>' +
        '<button class="lt-mode-btn ' + (state.mode === 'progreso' ? 'active' : '') + '" data-mode="progreso" style="padding:4px 14px;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer;border:none;background:transparent;color:var(--tx-2);transition:all 0.15s ease;">Mi progreso</button>' +
      '</div>' +
    '</div>';
  }

  // Fallbacks (usados si render-catologo.js no cargó aún)
  function renderSkeletonFallback() {
    return '<div class="lt-skeleton" style="text-align:center;padding:40px;color:var(--tx-3);">Cargando catálogo…</div>';
  }
  function renderCatalogFallback(items, owned) {
    if (!items || items.length === 0) return '<div style="padding:24px;text-align:center;color:var(--tx-3);">No se encontraron legendarias.</div>';
    var cards = items.map(function (item) {
      var isOwned = !!owned[item.id];
      return '<div class="card lt-item-card" data-id="' + item.id + '" style="padding:12px;cursor:pointer;border-left:3px solid #974EFF;">' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<img src="' + esc(item.icon || '') + '" width="36" height="36" alt="" style="border-radius:4px;object-fit:contain;" loading="lazy">' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-weight:600;font-size:0.8rem;color:var(--tx-1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(item.nameEs || item.name) + '</div>' +
            '<div style="font-size:0.65rem;color:var(--tx-3);">' + esc(item.type) + ' · ' + (item.generation ? 'Gen ' + item.generation : '—') + '</div>' +
          '</div>' +
        '</div>' +
        (isOwned ? '<div style="margin-top:4px;font-size:0.65rem;color:#974EFF;font-weight:600;">✓ Adquirida</div>' : '') +
      '</div>';
    });
    return '<div class="lt-catalog-grid" style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;">' + cards.join('') + '</div>';
  }
  function renderProgressFallback(stats) {
    return '<div style="padding:24px;text-align:center;">' +
      '<h3 style="margin:0 0 8px;font-size:1rem;color:var(--tx-1);">Progreso del Armería</h3>' +
      '<p style="font-size:2rem;font-weight:700;color:#974EFF;margin:8px 0;">' + fmtInt(stats.owned) + ' / ' + fmtInt(stats.total) + '</p>' +
      '<div style="width:100%;max-width:300px;height:8px;background:var(--bg-1);border-radius:4px;margin:8px auto;overflow:hidden;">' +
        '<div style="width:' + stats.pct + '%;height:100%;background:#974EFF;border-radius:4px;"></div>' +
      '</div>' +
      '<p style="font-size:0.75rem;color:var(--tx-3);">' + stats.pct + '% completado</p>' +
    '</div>';
  }

  // =======================================================================
  // EVENTOS
  // =======================================================================
  function wireEvents(container) {
    // Mode toggle
    container.querySelectorAll('.lt-mode-btn').forEach(function (btn) {
      if (btn.__ltWired) return;
      btn.__ltWired = true;
      btn.addEventListener('click', function () {
        state.mode = btn.getAttribute('data-mode');
        renderPanel();
      });
    });

    // Filter buttons
    container.querySelectorAll('.lt-filter-btn').forEach(function (btn) {
      if (btn.__ltWired) return;
      btn.__ltWired = true;
      btn.addEventListener('click', function () {
        var ft = btn.getAttribute('data-ftype');
        var fv = btn.getAttribute('data-fvalue');
        state.filters[ft] = (state.filters[ft] === fv) ? '' : fv;
        renderPanel();
      });
    });

    // Item cards → abrir detalle
    container.querySelectorAll('.lt-item-card').forEach(function (card) {
      if (card.__ltWired) return;
      card.__ltWired = true;
      card.addEventListener('click', function () {
        var itemId = parseInt(card.getAttribute('data-id'));
        openDetail(itemId);
      });
    });
  }

  function openDetail(itemId) {
    if (root.LegendaryDetailModal && typeof root.LegendaryDetailModal.open === 'function') {
      root.LegendaryDetailModal.open(itemId);
    }
  }

  // =======================================================================
  // PANEL + LIFECYCLE
  // =======================================================================
  function ensurePanel() {
    var panel = document.getElementById('legendaryTrackerPanel');
    if (panel) panel.removeAttribute('hidden');
  }

  function wireGlobalEvents() {
    document.addEventListener('gn:tokenchange', function () {
      if (!state.active) return;
      console.log(LOG, 'tokenchange detected, refreshing...');
      refresh(true);
    });
  }

  function activate() {
    if (!state.inited) {
      state.inited = true;
      wireGlobalEvents();
    }
    state.active = true;
    state.mode = 'catalogo';
    state.filters = { type: '', generation: '', expansion: '' };

    ensurePanel();
    renderPanel();

    // Cargar owned items (Phase 3 commit 4 conectará a getAccountLegendaryArmory)
    loadOwnedItems();
  }

  async function loadOwnedItems() {
    var token = getSelectedToken();
    state.lastToken = token;

    if (!token) {
      state.owned = {};
      state.lastRender = Date.now();
      return;
    }

    // Phase 3 commit 4: conectar GW2Api.getAccountLegendaryArmory
    // Placeholder: owned está vacío hasta que se conecte el API
    state.owned = {};
  }

  function deactivate() {
    state.active = false;
    if (L) { try { L.abort(); } catch (_) {} L = null; }
    var panel = document.getElementById('legendaryTrackerPanel');
    if (panel) panel.setAttribute('hidden', 'hidden');
  }

  function refresh(force) {
    if (!state.active) return;
    // Phase 3 commit 4: implementar carga con abort + last-win
    renderPanel();
  }

  // =======================================================================
  // REGISTRO DE RENDER FUNCTIONS
  // =======================================================================
  function registerRender(fns) {
    Object.keys(fns).forEach(function (k) { render[k] = fns[k]; });
    // Re-render si ya está activo
    if (state.active) renderPanel();
  }

  // =======================================================================
  // API PÚBLICA
  // =======================================================================
  var LegendaryTracker = {
    activate: activate,
    deactivate: deactivate,
    refresh: refresh,
    registerRender: registerRender,
    getState: function () { return state; },
    getCatalogItems: getCatalogItems,
    getFilteredItems: getFilteredItems,
    computeStats: computeStats,
    openDetail: openDetail,
    _debug: function () {
      return {
        active: state.active,
        mode: state.mode,
        filters: state.filters,
        ownedCount: Object.keys(state.owned).length,
        totalItems: getCatalogItems().length,
        catalogVersion: (root.LegendaryCatalog && root.LegendaryCatalog.version) || 'none'
      };
    }
  };

  root.LegendaryTracker = LegendaryTracker;
  console.info(LOG, 'ready v1.0.0');

})(typeof window !== 'undefined' ? window : this);
