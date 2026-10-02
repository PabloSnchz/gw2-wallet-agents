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

  // Cuantas de la cola llevan mas peso visual. Copia del `QUEUE_TOP_W` del
  // tracker, y NO se lee de el a proposito: `render-catologo.js` se registra
  // en `registerRender`, que no pasa configuracion, y meter una lectura del
  // tracker aca seria el primer punto donde el render depende de un valor
  // interno del modulo. Si los dos numeros se desincronizan, el arnes de la
  // cola lo ve: es exactamente el caso que un assert de igualdad de ambos
  // numeros atrapa, y por eso este valor tiene aserto y no es "copiado y ya".
  var QUEUE_TOP_W = 3;

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
  // QUE CAMBIA (punto 5 del plan de noche): se agrega el TERCER argumento,
  // `opts.queued` (array de ids). Antes la card no tenia forma de saber si su
  // item estaba en la cola de crafteo, asi que el Catalogo y la Cola
  // mostraban cards visualmente identicas para un item elegidoy otro no.
  //
  // Es un argumento nuevo y NO un campo obligatorio: si no viene (un consumidor
  // viejo, o el test del 1.2), se dibuja la card como antes. Agregar el quinto
  // dato al contrato de `renderProgress` habria roto a esos; agregar un
  // argumento opcional no los rompe.
  function renderCatalogGrid(items, owned, opts) {
    if (!items || items.length === 0) {
      return '<div class="lt-empty-state" style="text-align:center;padding:32px;color:var(--tx-3);">' +
        '<div style="font-size:0.8rem;">No se encontraron legendarias con los filtros aplicados.</div>' +
        '<div style="font-size:0.7rem;margin-top:4px;">Intentá limpiar los filtros.</div>' +
        '</div>';
    }

    var queued = (opts && Array.isArray(opts.queued)) ? opts.queued : [];
    var cards = items.map(function (item, idx) {
      return renderItemCard(item, owned, idx, queued.indexOf(item.id) !== -1);
    });

    return '<div class="lt-catalog-grid" style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;">' +
      cards.join('') +
    '</div>';
  }

  function renderItemCard(item, owned, idx, inQueue, heavy) {
    var isOwned = !!(owned[item.id] && owned[item.id] > 0);
    var tColor = typeColor(item);
    var eColor = expansionColor(item);
    var gLabel = genLabel(item);
    var owns = isOwned ? (owned[item.id] || 1) : 0;

    // Peso visual de las primeras de la cola. Se expresa con `flex` y no con
    // `grid-column: span 2`: en el grid de 5 columnas, ensanchar el primer
    // elemento lo empuja a una fila nueva y deja un hueco al lado.
    // `flex-grow` lo ensancha dentro de su celda y no mueve nada.
    var grow = heavy ? 'flex:1.55;' : 'flex:1;';
    var pIcon = heavy
      ? '<span title="Primera de tu cola" style="font-size:0.58rem;color:#c9a0ff;font-weight:700;margin-right:5px;">1ª</span>'
      : '';

    // Overlay de estado
    var statusOverlay;
    // El badge de "en la cola" va ANTES del de poseido y en otro lado: los dos
    // son estado, pero contestan preguntas distintas ("la puedo fabricar?" y
    // "ya la tengo?"). Encima del mismo, el segundo tapa al primero y el
    // usuario ve un check verde en algo que eligio fabricar y todavia no
    // tiene.
    if (inQueue) {
      statusOverlay = '<div class="lt-queue-badge" data-queue-toggle="' + item.id + '" ' +
        'title="En la cola de crafteo. Click para quitar." ' +
        'style="position:absolute;top:6px;left:6px;cursor:pointer;' +
        'background:rgba(151,78,255,0.16);border:1px solid rgba(151,78,255,0.5);' +
        'border-radius:999px;padding:2px 8px;font-size:0.58rem;color:#c9a0ff;font-weight:700;">EN COLA</div>' +
        '<div class="lt-status-badge" style="position:absolute;top:6px;right:6px;' +
        'background:rgba(104,255,163,0.12);border:1px solid rgba(104,255,163,0.4);' +
        'border-radius:999px;padding:2px 8px;font-size:0.58rem;color:#68ff9f;font-weight:700;">✓</div>';
    } else if (isOwned) {
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

    badges += '</div>';

    // Nombre display (español si existe)
    var displayName = item.nameEs || item.name;

    return '<div class="card lt-item-card" data-id="' + item.id + '" data-type="' + esc(item.type) + '" ' +
      'style="position:relative;cursor:pointer;padding:10px;border-radius:12px;' +
      grow +
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
          'text-overflow:ellipsis;white-space:nowrap;" title="' + esc(displayName) + '">' +
            (pIcon ? pIcon : '') + esc(displayName) + '</div>' +
          badges +
        '</div>' +
      '</div>' +
      (tpBadge ? '<div style="margin-top:6px;">' + tpBadge + '</div>' : '') +
      (inQueue ? '<div style="margin-top:6px;text-align:right;">' +
        '<span data-queue-remove="' + item.id + '" title="Quitar de la cola" ' +
        'style="cursor:pointer;font-size:0.6rem;color:#c9a0ff;border:1px solid rgba(151,78,255,0.4);' +
        'border-radius:999px;padding:1px 8px;">Quitar</span></div>' : '') +
      '</div>';
  }

  // =======================================================================
  // RENDER: PROGRESS VIEW
  // =======================================================================
  // QUE CAMBIA (punto 5 del plan de noche): "Mi progreso" deja de ser el
    // catalogo de desbloqueadas contra el catalogo completo y pasa a ser LA
    // COLA DE CRAFTEO. Se retiran el switch de alcance (ya no lo dibuja el
    // tracker), la barra "Completado: X / 206" y el porcentaje global.
    //
    // Las dos cosas que quedan y las dos que se van responden a preguntas
    // distintas, y esa es la razon del cambio:
    //   - "Completado: 3 / 206" responde "de TODAS las legendarias, cuantas
    //     tengo". Es un dato que no cambia mientras no compres una, y no dice
    //     que hacer en el proximo minuto.
    //   - "2 de las 5 de tu cola las podes fabricar ya" responde "por donde
    //     empiezo", que es para lo que se abre la pantalla.
    function renderProgress(state, stats) {
    var catalog = (root.LegendaryCatalog && root.LegendaryCatalog.items) || [];

    // Fallback a `owned` SOLO si `state.items` no viene. Con la cola, el
    // fallback es "las que poseo", que es el comportamiento viejo: un
    // consumidor que llame con la firma anterior sigue viendo algo, en vez
    // de una grilla vacia sin explicacion.
    var items;
    if (Array.isArray(state.items)) {
      // NO se reordena. La cola tiene un orden -- el orden en que el usuario
      // la fue armando -- y ordenar por nombre lo destruye: la primera
      // legendaria que eligio deja de ser la primera. Este es el cambio que
      // mas se nota y el mas facil de arruinar por "dejarlo prolijo".
      items = state.items.slice();
    } else {
      items = catalog.filter(function (item) {
        return state.owned[item.id] && state.owned[item.id] > 0;
      }).sort(function (a, b) {
        return (a.nameEs || a.name).localeCompare(b.nameEs || b.name, 'es');
      });
    }

    if (items.length === 0) {
      // El mensaje viejo ("Aun no posees ninguna legendaria") era FALSO con la
      // cola: se entra a Mi progreso para ver que falta fabricar, y la
      // respuesta cuando no hay nada encolado no es "no tenes ninguna", es
      // "no elegiste ninguna". Son frases distintas y la segunda es la que
      // dice que hacer.
      //
      // Y no hay rama por filtro A PROPOSITO: la cola no se filtra (los
      // filtros eligen que entra, no que se ve -- ver `progressItems()`), asi
      // que un filtro activo no puede ser la causa de esta pantalla vacia.
      // Dejar la rama seria escribir una causa posible que no existe.
      return '<div class="lt-progress-empty" style="text-align:center;padding:40px;color:var(--tx-3);">' +
        '<div style="font-size:0.85rem;margin-bottom:8px;">Tu cola de crafteo esta vacia.</div>' +
        '<div style="font-size:0.75rem;">En el <strong>Catálogo</strong>, click en la legendaria que quieras ' +
        'fabricar y queda encolada. Se agrega de a una.</div>' +
        '</div>';
    }

    // Las TRES primeras con mas peso visual. No es estetica: el motivo esta
    // escrito en el tracker (`QUEUE_TOP_W`) y es que con 5 en una grilla de 5
    // columnas, las 2 ultimas caen fuera del ancho util en pantallas
    // commonplace. El orden de la cola se conserva; lo que cambia es el peso.
    var cards = items.map(function (item, idx) {
      return renderItemCard(item, state.owned, idx, true, idx < QUEUE_TOP_W);
    });

    var resumen = '';
    if (stats && typeof stats.total === 'number') {
      var ready = stats.ready || 0;
      resumen = '<div class="lt-progress-summary" style="margin-bottom:16px;display:flex;gap:12px;' +
        'align-items:center;flex-wrap:wrap;font-size:0.75rem;color:var(--tx-3);">' +
        '<span>En la cola: <strong style="color:var(--tx-1);">' + fmtInt(stats.total) + '</strong>' +
          (stats.max ? ' de ' + fmtInt(stats.max) : '') + '</span>' +
        '<span>Podés fabricar ya: <strong style="color:#68ff9f;">' + fmtInt(ready) + '</strong></span>' +
        '</div>';
    }

    return resumen +
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
