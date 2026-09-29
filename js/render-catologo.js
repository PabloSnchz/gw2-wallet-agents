/*!
 * js/render-catologo.js — Render del catálogo y filtros
 * Proyecto: Bóveda del Gato Negro (GW2 Wallet Ligero)
 * v1.0.0 (Phase 3 Commit 1)
 *
 * Funciones de render para el grid del catálogo de legendarias y la barra
 * de filtros. Registra funciones en window.LegendaryTracker.registerRender().
 *
 * Consume:
 *  - window.LegendaryCatalog.items (js/legendary-data.js)
 *  - window.LegendaryTracker.getState() — filtros, owned
 */

(function (root) {
  'use strict';

  var LOG = '[LegendaryCatalogUI]';

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]);
    });
  }

  function fmtInt(n) { n = Number(n || 0); return n.toLocaleString('es-AR'); }

  // =======================================================================
  // MAPAS DE TRADUCCIÓN + COLORES
  // =======================================================================
  var TYPE_LABELS = {
    'weapon':           'Arma',
    'armor':            'Armadura',
    'trinket':          'Joya',
    'back':             'Capa',
    'upgradecomponent': 'Componente',
    'relic':            'Reliquia'
  };

  var TYPE_COLORS = {
    'weapon':           '#974EFF',
    'armor':            '#4DA6FF',
    'trinket':          '#FFD700',
    'back':             '#9370DB',
    'upgradecomponent': '#FB3E8D',
    'relic':            '#63B37A'
  };

  var EXPANSION_LABELS = {
    'Core': 'Clásico',
    'HoT':  'Heart of Thorns',
    'PoF':  'Path of Fire',
    'EoD':  'End of Dragons'
  };

  var EXPANSION_COLORS = {
    'Core': '#974EFF',
    'HoT':  '#63B37A',
    'PoF':  '#D5A021',
    'EoD':  '#4DA6FF'
  };

  var GEN_LABELS = { 1: 'Gen 1', 2: 'Gen 2', 3: 'Gen 3' };

  function typeLabel(item) {
    return TYPE_LABELS[item.type] || item.type;
  }
  function typeColor(item) {
    return TYPE_COLORS[item.type] || 'var(--tx-3)';
  }
  function expansionLabel(item) {
    return EXPANSION_LABELS[item.expansion] || item.expansion || '—';
  }
  function expansionColor(item) {
    return EXPANSION_COLORS[item.expansion] || 'var(--tx-3)';
  }
  function genLabel(item) {
    if (!item.generation) return '—';
    return GEN_LABELS[item.generation] || ('Gen ' + item.generation);
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
  // COLLECTION DE OPCIÓN DE FILTROS (derivado del catálogo)
  // =======================================================================
  function getFilterOptions(catalog) {
    var types = {};
    var gens = {};
    var exps = {};
    catalog.forEach(function (item) {
      if (!item) return;
      if (item.type) types[item.type] = (types[item.type] || 0) + 1;
      if (item.generation) gens[item.generation] = (gens[item.generation] || 0) + 1;
      if (item.expansion) exps[item.expansion] = (exps[item.expansion] || 0) + 1;
    });
    return { types: types, gens: gens, exps: exps };
  }

  // =======================================================================
  // RENDER: BARRA DE FILTROS
  // =======================================================================
  function renderFilterBar(filters, catalog) {
    var opts = getFilterOptions(catalog || []);

    // Type buttons (orden: weapon, armor, trinket, back, upgradecomponent, relic)
    var typeOrder = ['weapon', 'armor', 'trinket', 'back', 'upgradecomponent', 'relic'];
    var typeBtns = typeOrder.map(function (t) {
      var label = TYPE_LABELS[t] || t;
      var count = opts.types[t] || 0;
      var active = filters.type === t;
      return '<button class="lt-filter-btn ' + (active ? 'active' : '') + '" ' +
        'data-ftype="type" data-fvalue="' + t + '" ' +
        'style="padding:4px 10px;border-radius:20px;font-size:0.7rem;font-weight:600;cursor:pointer;' +
        'border:' + (active ? '1px solid ' + typeColor({type:t}) : '1px solid var(--bd-1)') + ';' +
        'background:' + (active ? typeColor({type:t}) + '20' : 'var(--bg-1)') + ';' +
        'color:' + (active ? typeColor({type:t}) : 'var(--tx-2)') + ';' +
        'transition:all 0.15s ease;">' +
        esc(label) + ' (' + count + ')</button>';
    });

    // Generation buttons (order: 3, 2, 1)
    var genOrder = [3, 2, 1];
    var genBtns = genOrder.map(function (g) {
      var label = GEN_LABELS[g] || ('Gen ' + g);
      var count = opts.gens[g] || 0;
      var active = String(filters.generation) === String(g);
      return '<button class="lt-filter-btn ' + (active ? 'active' : '') + '" ' +
        'data-ftype="generation" data-fvalue="' + g + '" ' +
        'style="padding:4px 10px;border-radius:20px;font-size:0.7rem;font-weight:600;cursor:pointer;' +
        'border:' + (active ? '1px solid #974EFF' : '1px solid var(--bd-1)') + ';' +
        'background:' + (active ? 'rgba(151,78,255,0.2)' : 'var(--bg-1)') + ';' +
        'color:' + (active ? '#974EFF' : 'var(--tx-2)') + ';' +
        'transition:all 0.15s ease;">' +
        esc(label) + ' (' + count + ')</button>';
    });

    // Expansion buttons (order: EoD, PoF, HoT, Core)
    var expOrder = ['EoD', 'PoF', 'HoT', 'Core'];
    var expBtns = expOrder.map(function (e) {
      var label = EXPANSION_LABELS[e] || e;
      var count = opts.exps[e] || 0;
      var active = filters.expansion === e;
      var color = EXPANSION_COLORS[e] || '#974EFF';
      return '<button class="lt-filter-btn ' + (active ? 'active' : '') + '" ' +
        'data-ftype="expansion" data-fvalue="' + e + '" ' +
        'style="padding:4px 10px;border-radius:20px;font-size:0.7rem;font-weight:600;cursor:pointer;' +
        'border:' + (active ? '1px solid ' + color : '1px solid var(--bd-1)') + ';' +
        'background:' + (active ? color + '20' : 'var(--bg-1)') + ';' +
        'color:' + (active ? color : 'var(--tx-2)') + ';' +
        'transition:all 0.15s ease;">' +
        esc(label) + ' (' + count + ')</button>';
    });

    // Clear button (solo si hay filtros activos)
    var hasActive = filters.type || filters.generation || filters.expansion;
    var clearBtn = hasActive ?
      '<button class="lt-filter-clear" data-action="clear-filters" ' +
      'style="padding:4px 12px;border-radius:20px;font-size:0.7rem;font-weight:600;cursor:pointer;' +
      'border:1px solid var(--bd-1);background:var(--bg-1);color:var(--tx-2);margin-left:auto;">✕ Limpiar</button>' :
      '';

    return '<div class="lt-filter-bar" style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;align-items:center;">' +
      '<div style="display:flex;gap:4px;flex-wrap:wrap;">' +
        '<span style="font-size:0.65rem;color:var(--tx-3);padding:4px 8px;">Tipo:</span>' +
        typeBtns.join('') +
      '</div>' +
      '<div style="display:flex;gap:4px;flex-wrap:wrap;">' +
        '<span style="font-size:0.65rem;color:var(--tx-3);padding:4px 8px;">Gen:</span>' +
        genBtns.join('') +
      '</div>' +
      '<div style="display:flex;gap:4px;flex-wrap:wrap;">' +
        '<span style="font-size:0.65rem;color:var(--tx-3);padding:4px 8px;">Exp:</span>' +
        expBtns.join('') +
      '</div>' +
      clearBtn +
    '</div>';
  }

  // =======================================================================
  // RENDER: GRID DEL CATÁLOGO (5 COLUMNAS)
  // =======================================================================
  function renderCatalogGrid(items, owned) {
    if (!items || items.length === 0) {
      return '<div class="lt-empty-state" style="text-align:center;padding:32px;color:var(--tx-3);">' +
        '<div style="font-size:0.8rem;">No se encontraron legendarias con los filtros aplicados.</div>' +
        '<div style="font-size:0.7rem;margin-top:4px;">Intentá limpiar los filtros.</div>' +
        '</div>';
    }

    var cards = items.map(function (item, idx) {
      return renderItemCard(item, owned, idx);
    });

    return '<div class="lt-catalog-grid" style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;">' +
      cards.join('') +
    '</div>';
  }

  function renderItemCard(item, owned, idx) {
    var isOwned = !!(owned[item.id] && owned[item.id] > 0);
    var tColor = typeColor(item);
    var eColor = expansionColor(item);
    var gLabel = genLabel(item);
    var owns = isOwned ? (owned[item.id] || 1) : 0;

    // Overlay de estado
    var statusOverlay;
    if (isOwned) {
      statusOverlay = '<div class="lt-status-badge" style="position:absolute;top:6px;right:6px;' +
        'background:rgba(104,255,163,0.12);border:1px solid rgba(104,255,163,0.4);' +
        'border-radius:999px;padding:2px 8px;font-size:0.58rem;color:#68ff9f;font-weight:700;">✓</div>';
    } else {
      statusOverlay = '<div class="lt-status-badge" style="position:absolute;top:6px;right:6px;' +
        'background:rgba(255,255,255,0.06);border:1px solid var(--bd-1);' +
        'border-radius:999px;padding:2px 8px;font-size:0.58rem;color:var(--tx-3);">PENDING</div>';
    }

    // Badge TP (solo si tradeable)
    var tpBadge = '';
    if (item.tpTradeable && item.tpSell > 0) {
      tpBadge = '<div class="lt-tp-badge" title="Precio TP (venta directa)" ' +
        'style="display:inline-flex;align-items:center;background:var(--bg-1);' +
        'border:1px solid var(--bd-1);border-radius:6px;padding:2px 6px;font-size:0.62rem;color:var(--tx-2);">' +
        formatCoinShort(item.tpSell) + '</div>';
    }

    // Badges de tipo, gen, exp
    var badges = '<div style="display:flex;align-items:center;gap:4px;margin-top:2px;flex-wrap:wrap;">' +
      '<span style="font-size:0.62rem;font-weight:600;background:' + tColor + '20;border:1px solid ' + tColor + '40;' +
      'border-radius:4px;padding:1px 6px;color:' + tColor + ';">' + esc(typeLabel(item)) + '</span>';

    if (gLabel !== '—') {
      badges += '<span style="font-size:0.6rem;color:var(--tx-3);font-weight:500;">' + esc(gLabel) + '</span>';
    }

    badges += '<span style="font-size:0.62rem;font-weight:600;background:' + eColor + '20;border:1px solid ' + eColor + '40;' +
      'border-radius:4px;padding:1px 6px;color:' + eColor + ';">' + esc(expansionLabel(item)) + '</span>';

    if (item.tpTradeable) {
      badges += '<span title="Tradeable en TP" style="font-size:0.6rem;opacity:0.6;">💎</span>';
    }

    badges += '</div>';

    // Nombre display (español si existe)
    var displayName = item.nameEs || item.name;

    return '<div class="card lt-item-card" data-id="' + item.id + '" data-type="' + esc(item.type) + '" ' +
      'style="position:relative;cursor:pointer;padding:10px;border-radius:12px;' +
      'border-left:3px solid #974EFF;' +
      'animation-delay:' + (idx * 0.02) + 's">' +
      statusOverlay +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<div style="width:40px;height:40px;border-radius:6px;background:var(--bg-1);display:flex;' +
        'align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">' +
          '<img src="' + esc(item.icon || '') + '" width="36" height="36" alt="' + esc(displayName) + '" ' +
          'style="border-radius:4px;object-fit:contain;" loading="lazy" referrerpolicy="no-referrer">' +
        '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-weight:600;font-size:0.8rem;color:var(--tx-1);overflow:hidden;' +
          'text-overflow:ellipsis;white-space:nowrap;" title="' + esc(displayName) + '">' + esc(displayName) + '</div>' +
          badges +
        '</div>' +
      '</div>' +
      (tpBadge ? '<div style="margin-top:6px;">' + tpBadge + '</div>' : '') +
      '</div>';
  }

  // =======================================================================
  // RENDER: PROGRESS VIEW
  // =======================================================================
  function renderProgress(state, stats) {
    var catalog = (root.LegendaryCatalog && root.LegendaryCatalog.items) || [];
    var items = catalog.filter(function (item) {
      return state.owned[item.id] && state.owned[item.id] > 0;
    });

    // Ordenar por rareza de progreso (no owned primero en catálogo, owned primero en progreso)
    items.sort(function (a, b) {
      return (a.nameEs || a.name).localeCompare(b.nameEs || b.name, 'es');
    });

    if (items.length === 0) {
      return '<div class="lt-progress-empty" style="text-align:center;padding:40px;color:var(--tx-3);">' +
        '<div style="font-size:0.85rem;margin-bottom:8px;">Aún no poseés ninguna legendaria.</div>' +
        '<div style="font-size:0.75rem;">Cambiá a la vista <strong>Catálogo</strong> para explorar todas las legendarias.</div>' +
        '</div>';
    }

    var cards = items.map(function (item, idx) {
      return renderItemCard(item, state.owned, idx);
    });

    return '<div class="lt-progress-summary" style="margin-bottom:16px;">' +
      '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
          '<span style="font-size:0.75rem;color:var(--tx-3);">Completado:</span>' +
          '<strong style="font-size:1rem;color:#974EFF;">' + fmtInt(stats.owned) + ' / ' + fmtInt(stats.total) + '</strong>' +
        '</div>' +
        '<div style="width:120px;height:8px;background:var(--bg-1);border-radius:4px;overflow:hidden;">' +
          '<div style="width:' + stats.pct + '%;height:100%;background:#974EFF;border-radius:4px;"></div>' +
        '</div>' +
        '<span style="font-size:0.7rem;color:var(--tx-3);">' + stats.pct + '%</span>' +
      '</div>' +
      '</div>' +
      '<div class="lt-progress-grid" style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;">' +
        cards.join('') +
      '</div>';
  }

  // =======================================================================
  // RENDER: SKELETON (LOADING)
  // =======================================================================
  function renderSkeleton() {
    var skelCard = function () {
      return '<div class="lt-skeleton-card card" style="padding:10px;border-radius:12px;">' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<div style="width:40px;height:40px;border-radius:6px;background:linear-gradient(90deg,var(--bg-1) 25%,var(--bg-2) 50%,var(--bg-1) 75%);background-size:200% 100%;animation:ltShimmer 1.5s infinite;"></div>' +
          '<div style="flex:1;">' +
            '<div style="height:12px;background:var(--bg-1);border-radius:4px;margin-bottom:4px;width:70%;animation:ltShimmer 1.5s infinite;"></div>' +
            '<div style="height:10px;background:var(--bg-2);border-radius:4px;width:40%;"></div>' +
          '</div>' +
        '</div>' +
        '<div style="height:10px;background:var(--bg-1);border-radius:4px;margin-top:6px;width:30%;"></div>' +
      '</div>';
    };

    var buttons = Array(10).fill(0).map(function () {
      return '<div style="width:70px;height:26px;background:var(--bg-1);border-radius:20px;"></div>';
    }).join('');

    return '<div class="lt-filter-bar" style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;align-items:center;">' +
      '<div style="display:flex;gap:4px;flex-wrap:wrap;"><span style="font-size:0.65rem;color:var(--tx-3);padding:4px 8px;">Tipo:</span>' + buttons.substring(0, buttons.length / 2) + '</div>' +
    '</div>' +
    '<div class="lt-catalog-grid" style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;">' +
      Array(15).fill(0).map(skelCard).join('') +
    '</div>';
  }

  // =======================================================================
  // INYECTAR ESTILOS DINÁMICOS (skeleton animation)
  // =======================================================================
  function injectSkeletonStyles() {
    if (document.getElementById('lt-skeleton-styles')) return;
    var css = '@keyframes ltShimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}';
    var s = document.createElement('style');
    s.id = 'lt-skeleton-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // =======================================================================
  // REGISTRO
  // =======================================================================
  if (root.LegendaryTracker && typeof root.LegendaryTracker.registerRender === 'function') {
    root.LegendaryTracker.registerRender({
      filterBar: renderFilterBar,
      catalogGrid: renderCatalogGrid,
      skeleton: renderSkeleton,
      progress: renderProgress
    });
    injectSkeletonStyles();
    console.info(LOG, 'render functions registered');
  } else {
    // Retry en próximo tick (el módulo principal puede no estar listo)
    setTimeout(function () {
      if (root.LegendaryTracker && typeof root.LegendaryTracker.registerRender === 'function') {
        root.LegendaryTracker.registerRender({
          filterBar: renderFilterBar,
          catalogGrid: renderCatalogGrid,
          skeleton: renderSkeleton,
          progress: renderProgress
        });
        injectSkeletonStyles();
        console.info(LOG, 'render functions registered (retry)');
      } else {
        console.warn(LOG, 'LegendaryTracker no disponible, render functions no registradas');
      }
    }, 50);
  }

})(typeof window !== 'undefined' ? window : this);
