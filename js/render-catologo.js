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
  // Badge de precio TP.
  //
  // QUE CAMBIA (punto 1.1, 2026-10-02): antes era `formatCoinShort()`, que
  // devolvia texto plano ("1.889g") envuelto en un div con borde. Ahora usa
  // el MISMO componente que la Cartera (`app.js:162` `badgesHTMLFromCopper`):
  // las clases `.coin` / `.coin--g` de `main.css:224-232`.
  //
  // POR QUE NO SE INVENTA CSS NUEVO: `.coin` ya existe y ya se ve bien en la
  // Cartera. Lo que faltaba no era el estilo, era que la Armeria no lo
  // usara. Agregar un `.lt-coin` propio seria el camino corto y el que
  // diverge: dos clases para el mismo componente, y un cambio de tema futuro
  // toca una y no la otra.
  //
  // POR QUE SE DESCARTA `formatCoinShort` Y NO SE REAPROVECHA: las dos
  // funciones hacen lo mismo con salidas distintas. `badgesHTMLFromCopper`
  // emite una pastilla por unidad (oro, plata, cobre) y omite las que valen
  // cero; `formatCoinShort` colapsa a la unidad mayor. Para un badge chico
  // en una grilla de 206 cards, la version de una sola pastilla ocupa menos
  // y no muestra "0 s" al lado de "1 g". Se conservan las dos porque la
  // columna de stock del modal de materiales (2.3) si va a querer el
  // desglose completo, y no tiene por que reinventarlo.
  function tpCoinHTML(copper) {
    var g = Math.floor((copper || 0) / 10000);
    var s = Math.floor(((copper || 0) % 10000) / 100);
    var c = (copper || 0) % 100;
    var parts = [];
    if (g > 0) parts.push('<span class="coin coin--g">' + g.toLocaleString('es-AR') + '</span>');
    if (s > 0) parts.push('<span class="coin coin--s">' + s + '</span>');
    if (c > 0) parts.push('<span class="coin coin--c">' + c + '</span>');
    return parts.length ? parts.join('') : '<span class="coin coin--c">0</span>';
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
  function renderCatalogGrid(items, owned, queue) {
    if (!items || items.length === 0) {
      return '<div class="lt-empty-state" style="text-align:center;padding:32px;color:var(--tx-3);">' +
        '<div style="font-size:0.8rem;">No se encontraron legendarias con los filtros aplicados.</div>' +
        '<div style="font-size:0.7rem;margin-top:4px;">Intentá limpiar los filtros.</div>' +
        '</div>';
    }

    var cards = items.map(function (item, idx) {
      return renderItemCard(item, owned, idx, queue);
    });

    return '<div class="lt-catalog-grid" style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;">' +
      cards.join('') +
    '</div>';
  }

  function renderItemCard(item, owned, idx, queue) {
    var isOwned = !!(owned[item.id] && owned[item.id] > 0);
    var tColor = typeColor(item);
    var eColor = expansionColor(item);
    var gLabel = genLabel(item);
    var owns = isOwned ? (owned[item.id] || 1) : 0;

    // Cola de crafteo (2.3). `queue` llega como COPIA y puede no venir: un
    // consumidor viejo que llame a `catalogGrid(items, owned)` con dos
    // argumentos ve el catalogo sin el boton, no un error. `indexOf` sobre
    // undefined es un TypeError, y por eso el default va explicito.
    var q = queue || [];
    var qPos = q.indexOf(item.id);
    var inQueue = qPos !== -1;
    // Las 3 primeras con mas peso visual (plan de noche). Se distinguen por
    // el grosor del borde izquierdo, que es la unica señal que la card ya
    // usa para su tipo: agregar una categoria de color seria una 4ta.
    var isTop3 = inQueue && qPos < 3;

    // El boton va en la fila de badges y NO absoluto sobre la card. Con
    // `padding:10px` un boton pegado a `bottom:6px` se monta sobre el nombre,
    // y resolverlo agrandando el padding cambia la altura de las 206 cards del
    // catalogo por un control de una sola vista. Ademas un control dentro de
    // la card dispara su click: por eso el `data-action` se resuelve ANTES que
    // la card en el listener, no por `stopPropagation` en el boton.
    var queueBtn = '<button data-action="queue-toggle" data-id="' + item.id + '" ' +
      'class="lt-queue-btn" title="' + (inQueue ? 'Quitar de la cola de crafteo' : 'Agregar a la cola de crafteo') + '" ' +
      'style="padding:1px 6px;border-radius:999px;font-size:0.6rem;font-weight:700;cursor:pointer;' +
      'border:' + (inQueue ? '1px solid #974EFF' : '1px solid var(--bd-1)') + ';' +
      'background:' + (inQueue ? 'rgba(151,78,255,0.22)' : 'rgba(255,255,255,0.06)') + ';' +
      'color:' + (inQueue ? '#974EFF' : 'var(--tx-3)') + ';">' +
      (inQueue ? (qPos + 1) + 'º' : '+ Cola') + '</button>';

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
    //
    // El wrapper `lt-tp-badge` conservaba su fondo/borde/padding INLINE, y
    // al meter adentro una pastilla `.coin` (que ya trae fondo, borde y
    // padding de main.css) quedaban dos cajas anidadas: un borde dentro de
    // otro borde, con el doble de padding. Por eso el wrapper solo aporta
    // `gap` entre unidades y el `font-size` chico de la grilla; el resto lo
    // pone `.coin`. Es el mismo criterio que usa la Cartera.
    var tpBadge = '';
    if (item.tpTradeable && item.tpSell > 0) {
      tpBadge = '<div class="lt-tp-badge" title="Precio TP (venta directa)" ' +
        'style="display:inline-flex;align-items:center;gap:4px;font-size:0.62rem;">' +
        tpCoinHTML(item.tpSell) + '</div>';
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

    badges += queueBtn + '</div>';

    // Nombre display (español si existe)
    var displayName = item.nameEs || item.name;

    return '<div class="card lt-item-card" data-id="' + item.id + '" data-type="' + esc(item.type) + '" ' +
      'data-in-queue="' + (inQueue ? '1' : '0') + '" ' +
      'style="position:relative;cursor:pointer;padding:10px;border-radius:12px;' +
      'border-left:' + (isTop3 ? '5px' : '3px') + ' solid #974EFF;' +
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
    // QUE CAMBIA (punto 2.3, 2026-10-02): "Mi progreso" deja de ser un
    // subconjunto IMPLICITO de las 206 y pasa a ser la COLA de crafteo, que es
    // una eleccion explicita del usuario. Tres cosas se van con eso:
    //
    //   1. el alcance (2.2): no hay mas "Desbloqueadas / Solo faltantes"
    //   2. el ORDEN alfabetico. Este es el cambio de comportamiento mas
    //      importante y el mas facil de no notar: la cola va en el orden que
    //      el usuario puso, y ordenar por nombre tira abajo lo unico que la
    //      cola afirmo, que es cual va primero.
    //   3. el resumen "Completado X / 206", que respondia por el progreso
    //      global de la coleccion. Ahora responde por la cola, que es lo que
    //      el usuario esta por fabricar.
    //
    // Se conservan `state.owned` y las firmas registradas. `state.owned` sigue
    // llegando porque las cards lo usan para el badge ✓ y no porque el recorte
    // dependa de el: la cola ya no se deriva de lo que el usuario posee.
    var items = Array.isArray(state.items) ? state.items.slice() : [];
    var queue = Array.isArray(state.queue) ? state.queue : [];
    var queueMax = Number(state.queueMax) > 0 ? Number(state.queueMax) : items.length;

    // `stats` es lo que calcula el tracker sobre la cola, pero el texto del
    // resumen se arma ACA y usa `items.length` a proposito: si el tracker
    //_FILTER un id que no esta en el catalogo, el resumen tiene que decir
    // las que se VEN, no las que se guardaron. Un contador que cuenta cosas
    // invisibles es un contador que no se puede verificar mirando la pantalla.
    var n = items.length;

    if (items.length === 0) {
      // Empty state honesto, y el unico caso que hay: la cola vacia. Las tres
      // ramas viejas (filtro activo / solo faltantes / ninguna poseida) ya no
      // existen como estados alcanzables, y un empty state con ramas para
      // estados imposibles es codigo que dice cosas que no puede pasar.
      return '<div class="lt-progress-empty" style="text-align:center;padding:40px;color:var(--tx-3);">' +
        '<div style="font-size:0.85rem;margin-bottom:8px;">Tu cola de crafteo está vacía.</div>' +
        '<div style="font-size:0.75rem;">Elegí hasta ' + fmtInt(queueMax) +
        ' legendarias en la vista <strong>Catálogo</strong> con el botón <strong>+ Cola</strong>, ' +
        'y acá vas a ver qué te falta de cada una.</div>' +
        '</div>';
    }

    var cards = items.map(function (item, idx) {
      return renderItemCard(item, state.owned, idx, queue);
    });

    var pct = queueMax ? Math.round((n / queueMax) * 100) : 0;

    return '<div class="lt-progress-summary" style="margin-bottom:16px;">' +
      '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
          '<span style="font-size:0.75rem;color:var(--tx-3);">Cola de crafteo:</span>' +
          '<strong style="font-size:1rem;color:#974EFF;">' + fmtInt(n) + ' / ' + fmtInt(queueMax) + '</strong>' +
        '</div>' +
        '<div style="width:120px;height:8px;background:var(--bg-1);border-radius:4px;overflow:hidden;">' +
          '<div style="width:' + pct + '%;height:100%;background:#974EFF;border-radius:4px;"></div>' +
        '</div>' +
        '<span style="font-size:0.7rem;color:var(--tx-3);">' +
          (n >= queueMax ? 'completa' : 'las 3 primeras tienen prioridad') + '</span>' +
      '</div>' +
      '</div>' +
      '<div class="lt-progress-grid" style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;">' +
        cards.join('') +
      '</div>';
  }

  // =======================================================================
  // RENDER: SKELETON (LOADING)
  // =======================================================================
  // =======================================================================
  // RENDER: MODAL DE MATERIALES (ARME 1.2)
  // =======================================================================
  //
  // Recibe lo que calcula `computeMaterials` y lo pinta. El corte es el mismo
  // que los otros cuatro renders: aqui no se consulta la API ni se decide
  // nada de negocio, solo se dibuja.
  //
  // Los cuatro status se dibujan DISTINTOS a proposito. Un modal que para
  // 'no_recipe', 'placeholder' y 'unknown' dijera lo mismo seria un filtro
  // invisible: el dia que GW2 renombre el item 95093, el filtro dejaria de
  // matchear y nadie lo veria.
  function renderItemModal(datos, item) {
    if (!datos) {
      return '<div style="padding:18px;color:var(--tx-3);font-size:0.78rem;">Sin datos.</div>';
    }

    // Los tres status "sin fila" muestran el motivo, y el motivo es lo que
    // dice el contrato (o el tracker si el contrato no esta). No se inventa
    // texto aca: duplicar el motivo es la forma de que los dos se desincronicen.
    if (datos.status !== 'recipe') {
      var icon = datos.status === 'unknown' ? '?' : '!';
      return '<div style="padding:16px 4px;">' +
        '<div style="display:flex;gap:10px;align-items:flex-start;">' +
          '<div style="flex:0 0 22px;height:22px;border-radius:50%;border:1px solid rgba(255,196,84,0.5);' +
            'color:#ffc454;font-size:0.7rem;font-weight:700;display:flex;align-items:center;' +
            'justify-content:center;">' + icon + '</div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:0.7rem;font-weight:700;color:#ffc454;letter-spacing:0.04em;' +
              'text-transform:uppercase;">' + esc(datos.status) + '</div>' +
            '<div style="font-size:0.78rem;color:var(--tx-2);margin-top:5px;line-height:1.5;">' +
              esc(datos.note || '') + '</div>' +
            (datos.craftType
              ? '<div style="font-size:0.7rem;color:var(--tx-3);margin-top:6px;">craftType: <code>' +
                esc(datos.craftType) + '</code></div>'
              : '') +
          '</div>' +
        '</div>' +
      '</div>';
    }

    var COL = {
      ok: { l: '#68ff9f', t: 'TENGO' },
      partial: { l: '#ffc454', t: 'FALTA' },
      missing: { l: '#ff7a7a', t: 'FALTA' }
    };

    var filas = datos.rows.map(function (r) {
      var c = COL[r.state] || COL.missing;
      return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;' +
          'border-bottom:1px solid var(--bd-1);">' +
        '<div style="flex:1;min-width:0;font-size:0.78rem;color:var(--tx-1);' +
          'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + esc(r.name) + '">' +
          esc(r.name) + '</div>' +
        '<div style="font-size:0.72rem;color:var(--tx-3);white-space:nowrap;">' +
          '<span style="color:' + c.l + ';font-weight:700;">' + esc(c.t) + '</span> ' +
          fmtInt(r.have) + '/' + fmtInt(r.need) + '</div>' +
      '</div>';
    });

    var resumen = datos.allHave
      ? '<span style="color:#68ff9f;">Tenes todos los materiales.</span>'
      : '<span style="color:#ffc454;">Te faltan ' + fmtInt(datos.totals.missing) +
        ' de ' + fmtInt(datos.totals.need) + ' unidades.</span>';

    return '<div style="padding:4px 2px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;' +
        'padding-bottom:9px;margin-bottom:5px;border-bottom:1px solid var(--bd-1);">' +
        '<span style="font-size:0.72rem;color:var(--tx-2);">' + resumen + '</span>' +
        '<span style="font-size:0.65rem;color:var(--tx-3);text-transform:uppercase;' +
          'letter-spacing:0.04em;">' + esc(datos.craftType || '—') +
          (datos.disciplines && datos.disciplines.length
            ? ' · ' + esc(datos.disciplines.join(', ')) : '') +
        '</span>' +
      '</div>' +
      (filas.length ? filas.join('') :
        '<div style="padding:14px 0;font-size:0.76rem;color:var(--tx-3);">La receta no lista ingredientes.</div>') +
      (item && item.tpTradeable && item.tpSell
        ? '<div style="margin-top:10px;font-size:0.68rem;color:var(--tx-3);">' +
          'En trading post: ' + tpCoinHTML(item.tpSell) + '</div>'
        : '') +
    '</div>';
  }

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
    // El modal de materiales (ARME 1.2) se registra por su PUERTA PROPIA, no
    // como quinta clave del registro de arriba: ese registro rechaza lo
    // incompleto a proposito, y meterlo ahi haria que el modulo dejara de
    // pintar el catalogo entero si este render no llegara.
    if (typeof root.LegendaryTracker.registerItemModal === 'function') {
      root.LegendaryTracker.registerItemModal(renderItemModal);
    }
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
        if (typeof root.LegendaryTracker.registerItemModal === 'function') {
          root.LegendaryTracker.registerItemModal(renderItemModal);
        }
        console.info(LOG, 'render functions registered (retry)');
      } else {
        console.warn(LOG, 'LegendaryTracker no disponible, render functions no registradas');
      }
    }, 50);
  }

})(typeof window !== 'undefined' ? window : this);
