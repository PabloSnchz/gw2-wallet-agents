/*!
 * js/detail-modal.js — Modal de detalle de legendaria
 * Proyecto: Bóveda del Gato Negro (GW2 Wallet Ligero)
 * v1.0.0 (Phase 3 Commit 2)
 *
 * Patrón: singleton modal (como theme-selector.js). Se abre al hacer click
 * en una card del catálogo. Muestra icono, nombre, type/subtype, gen/exp,
 * precios TP y estado de posesión.
 *
 * Consume:
 *  - window.LegendaryCatalog.items (js/legendary-data.js)
 *  - window.LegendaryTracker.getState() — owned map
 *
 * NOTA Phase 2C: los componentes/recipes están deferidos. Se muestra
 * "Pendiente (Phase 2C)" hasta que el PO resuelva fuentes alternativas.
 */

(function (root) {
  'use strict';

  var LOG = '[LegendaryDetailModal]';

  // =======================================================================
  // UTILIDADES
  // =======================================================================
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]);
    });
  }
  function formatCoinFull(copper) {
    if (!copper || copper <= 0) return '—';
    var g = Math.floor(copper / 10000);
    var s = Math.floor((copper % 10000) / 100);
    var c = copper % 100;
    var parts = [];
    if (g > 0) parts.push(g + ' ₤');
    if (s > 0 || g > 0) parts.push(s + ' ●');
    parts.push(c + ' ◊');
    return parts.join(' ');
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
  // MAPAS DE TRADUCCIÓN
  // =======================================================================
  var TYPE_LABELS = {
    'weapon': 'Arma',
    'armor': 'Armadura',
    'trinket': 'Joya',
    'back': 'Capa',
    'upgradecomponent': 'Componente de mejora',
    'relic': 'Reliquia'
  };

  var EXPANSION_LABELS = {
    'Core': 'Tyria (Clásico)',
    'HoT': 'Heart of Thorns',
    'PoF': 'Path of Fire',
    'EoD': 'End of Dragons'
  };

  var EXPANSION_COLORS = {
    'Core': '#974EFF',
    'HoT': '#63B37A',
    'PoF': '#D5A021',
    'EoD': '#4DA6FF'
  };

  var GEN_LABELS = { 1: 'Generación 1', 2: 'Generación 2', 3: 'Generación 3' };

  // Subtype labels (partial map for weapons)
  var WEAPON_SUBTYPE_LABELS = {
    'axe': 'Hacha',
    'dagger': 'Daga',
    'sword': 'Espada',
    'greatsword': 'Espada grande',
    'hammer': 'Martillo',
    'longbow': 'Arco largo',
    'shortbow': 'Arco corto',
    'rifle': 'Fusil',
    'shotgun': 'Escopeta',
    'pistol': 'Pistola',
    'scepter': 'Cetro',
    'focus': 'Enfoque',
    'staff': 'Bastón',
    'trident': 'Tridente',
    'greatsword': 'Espada grande',
    'shield': 'Escudo',
    'torch': 'Antorcha',
    'banner': 'Estandarte'
  };

  var ARMOR_SUBTYPE_LABELS = {
    'light': 'Ligera', 'medium': 'Media', 'heavy': 'Pesada',
    'boots': 'Botas', 'coat': 'Tunica', 'gloves': 'Guantes',
    'helm': 'Yelmo', 'leggings': 'Pantalones', 'shoulders': 'Hombreras'
  };

  function getSubtypeLabel(item) {
    if (!item.subtype) return '—';
    if (item.type === 'weapon') return WEAPON_SUBTYPE_LABELS[item.subtype] || item.subtype;
    if (item.type === 'armor') {
      // subtype is like "heavy boots", "light coat", etc.
      var parts = item.subtype.split(' ');
      if (parts.length === 2) {
        var weight = ARMOR_SUBTYPE_LABELS[parts[0]] || parts[0];
        var slot = ARMOR_SUBTYPE_LABELS[parts[1]] || parts[1];
        return weight + ' ' + slot;
      }
      return item.subtype;
    }
    return item.subtype;
  }

  // =======================================================================
  // SINGLETON MODAL
  // =======================================================================
  var state = {
    modalOpen: false,
    currentItem: null
  };

  function createModal() {
    var existing = document.getElementById('ltDetailModal');
    if (existing) return existing;

    var modal = document.createElement('div');
    modal.id = 'ltDetailModal';
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'ltModalTitle');
    modal.hidden = true;

    modal.innerHTML = [
      '<div class="modal__backdrop" data-close="1"></div>',
      '<div class="modal__dialog" role="document" style="max-width: 560px;">',
      '  <header class="modal__header">',
      '    <h3 id="ltModalTitle" style="display:flex;align-items:center;gap:10px;font-weight:600;color:var(--tx-1);">',
      '      <span id="ltModalIconWrap" style="width:28px;height:28px;border-radius:6px;background:var(--bg-1);display:flex;align-items:center;justify-content:center;overflow:hidden;">',
      '        <img id="ltModalIcon" width="24" height="24" alt="" style="object-fit:contain;" loading="lazy" referrerpolicy="no-referrer">',
      '      </span>',
      '      <span id="ltModalName"></span>',
      '    </h3>',
      '    <button type="button" class="modal__close" aria-label="Cerrar" data-close="1">✕</button>',
      '  </header>',
      '  <div class="modal__body" id="ltModalBody"></div>',
      '</div>',
    ].join('');

    document.body.appendChild(modal);

    // Click en backdrop / close button
    modal.addEventListener('click', function (e) {
      if (e.target.getAttribute('data-close') === '1') {
        closeModal();
      }
    });

    // ESC para cerrar
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

    return modal;
  }

  function closeModal() {
    var modal = document.getElementById('ltDetailModal');
    if (modal) modal.hidden = true;
    state.modalOpen = false;
    state.currentItem = null;
  }

  // =======================================================================
  // RENDER DEL MODAL
  // =======================================================================
  function open(itemId) {
    // Buscar el item en el catálogo
    var catalog = (root.LegendaryCatalog && root.LegendaryCatalog.items) || [];
    var item = catalog.find(function (i) { return i && i.id === itemId; });

    if (!item) {
      console.warn(LOG, 'Item no encontrado en catálogo:', itemId);
      return;
    }

    var modal = createModal();
    state.currentItem = item;
    state.modalOpen = true;

    // Populate header
    var titleEl = document.getElementById('ltModalTitle');
    if (titleEl) {
      var titleSpan = titleEl.querySelector('#ltModalName');
      if (titleSpan) titleSpan.textContent = item.nameEs || item.name;
      var iconImg = titleEl.querySelector('#ltModalIcon');
      if (iconImg) iconImg.src = item.icon || '';
    }

    // Populate body
    var body = document.getElementById('ltModalBody');
    if (body) {
      body.innerHTML = renderModalBody(item);
    }

    // Mostrar
    modal.hidden = false;

    // Focus
    var dialog = modal.querySelector('.modal__dialog');
    if (dialog) dialog.focus();
  }

  function renderModalBody(item) {
    // Estado de posesión
    var tracker = root.LegendaryTracker;
    var owned = 0;
    var isOwned = false;
    if (tracker && typeof tracker.getState === 'function') {
      var st = tracker.getState();
      if (st && st.owned) {
        owned = st.owned[item.id] || 0;
        isOwned = owned > 0;
      }
    }

    // Badges de tipo/gen/exp
    var tColor = '#974EFF';
    var badges = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">' +
      '<span style="font-size:0.7rem;font-weight:600;background:' + tColor + '20;border:1px solid ' + tColor + '40;border-radius:6px;padding:2px 8px;color:' + tColor + ';">' +
        esc(TYPE_LABELS[item.type] || item.type) + '</span>' +
      '<span style="font-size:0.7rem;font-weight:500;background:var(--bg-1);border:1px solid var(--bd-1);border-radius:6px;padding:2px 8px;color:var(--tx-2);">' +
        esc(getSubtypeLabel(item)) + '</span>' +
      '<span style="font-size:0.7rem;font-weight:600;background:' + EXPANSION_COLORS[item.expansion] + '20;border:1px solid ' + EXPANSION_COLORS[item.expansion] + '40;border-radius:6px;padding:2px 8px;color:' + EXPANSION_COLORS[item.expansion] + ';">' +
        esc(EXPANSION_LABELS[item.expansion] || item.expansion) + '</span>';

    if (item.generation) {
      badges += '<span style="font-size:0.7rem;font-weight:500;background:var(--bg-1);border:1px solid var(--bd-1);border-radius:6px;padding:2px 8px;color:var(--tx-2);">' +
        esc(GEN_LABELS[item.generation] || ('Gen ' + item.generation)) + '</span>';
    }
    badges += '</div>';

    // Estado de posesión
    var ownedHtml = isOwned
      ? '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding:8px;border-radius:8px;background:rgba(104,255,163,0.1);border:1px solid rgba(104,255,163,0.3);">' +
        '<span style="font-size:0.9rem;font-weight:600;color:#68ff9f;">✓ ADQUIRIDA</span>' +
        (owned > 1 ? '<span style="font-size:0.75rem;color:var(--tx-3);">x' + owned + '</span>' : '') +
        '</div>'
      : '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding:8px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid var(--bd-1);">' +
        '<span style="font-size:0.9rem;font-weight:600;color:var(--tx-3);">PENDING — No poseída</span>' +
        '</div>';

    // Precios TP
    var tpHtml = '';
    if (item.tpTradeable) {
      tpHtml = '<div style="margin-bottom:12px;">' +
        '<h4 style="margin:0 0 6px;font-size:0.75rem;text-transform:uppercase;color:var(--tx-3);letter-spacing:0.5px;">Precios en Trading Post</h4>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          '<div style="background:var(--bg-1);border:1px solid var(--bd-1);border-radius:8px;padding:8px;">' +
            '<div style="font-size:0.65rem;color:var(--tx-3);">Venta directa (comprar)</div>' +
            '<div style="font-size:0.9rem;font-weight:600;color:var(--tx-1);margin-top:2px;">' + esc(formatCoinFull(item.tpSell)) + '</div>' +
          '</div>' +
          '<div style="background:var(--bg-1);border:1px solid var(--bd-1);border-radius:8px;padding:8px;">' +
            '<div style="font-size:0.65rem;color:var(--tx-3);">Pedido de compra</div>' +
            '<div style="font-size:0.9rem;font-weight:600;color:var(--tx-1);margin-top:2px;">' + esc(formatCoinFull(item.tpBuy)) + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:0.6rem;color:var(--tx-3);margin-top:6px;">' +
          esc(formatCoinShort(item.tpSell)) + ' ≈ ' + fmtIntPrice(item.tpSell) + ' monedas de oro</div>' +
      '</div>';
    } else {
      tpHtml = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;padding:8px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid var(--bd-1);">' +
        '<span style="font-size:0.75rem;color:var(--tx-3);">💎 No comerciable (account-bound)</span>' +
      '</div>';
    }

    // Componentes (Phase 2C deferido)
    var compHtml = '';
    if (item.components && item.components.length > 0) {
      var compItems = item.components.map(function (c) {
        return '<span style="font-size:0.75rem;color:var(--tx-2);">' + esc(c.itemId || '?') + ' × ' + (c.quantity || 1) + '</span>';
      }).join('</div><div style="margin-top:2px;">');
      compHtml = '<div style="margin-bottom:12px;">' +
        '<h4 style="margin:0 0 6px;font-size:0.75rem;text-transform:uppercase;color:var(--tx-3);letter-spacing:0.5px;">Componentes</h4>' +
        '<div style="display:flex;flex-direction:column;gap:4px;">' + compItems + '</div></div>';
    } else {
      // Phase 2C pendiente
      compHtml = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;padding:8px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid var(--bd-1);">' +
        '<span style="font-size:0.75rem;color:var(--tx-3);">Componentes pendientes (Phase 2C)</span>' +
        '</div>';
    }

    // Precursor
    var precHtml = '';
    if (item.precursorId && item.precursorId > 0) {
      var precItem = null;
      try {
        precItem = (root.LegendaryCatalog && root.LegendaryCatalog.items || []).find(function (i) {
          return i && i.id === item.precursorId;
        });
      } catch (_) {}
      precHtml = '<div style="margin-bottom:12px;">' +
        '<h4 style="margin:0 0 6px;font-size:0.75rem;text-transform:uppercase;color:var(--tx-3);letter-spacing:0.5px;">Precursor</h4>' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<img src="' + esc((precItem && precItem.icon) || '') + '" width="32" height="32" alt="" style="border-radius:4px;background:var(--bg-1);object-fit:contain;" loading="lazy" referrerpolicy="no-referrer">' +
          '<span style="font-size:0.8rem;color:var(--tx-2);">' + esc((precItem && (precItem.nameEs || precItem.name)) || ('ID: ' + item.precursorId)) + '</span>' +
        '</div></div>';
    }

    return badges + ownedHtml + tpHtml + precHtml + compHtml;
  }

  function fmtIntPrice(copper) {
    if (!copper || copper <= 0) return '0';
    var g = Math.floor(copper / 10000);
    return g.toLocaleString('es-AR');
  }

  // =======================================================================
  // API PÚBLICA
  // =======================================================================
  root.LegendaryDetailModal = {
    open: open,
    close: closeModal,
    isOpen: function () { return state.modalOpen; },
    getCurrentItem: function () { return state.currentItem; }
  };

  console.info(LOG, 'ready v1.0.0');

})(typeof window !== 'undefined' ? window : this);
