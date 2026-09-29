/*!
 * js/homestead-tracker.js — Seguimiento de Homestead
 * Proyecto: Bóveda del Gato Negro (GW2 Wallet Ligero)
 * Versión: 1.0.0 (2026-09-29)
 *
 * Módulo que muestra el progreso de decoraciones y glifos del Homestead
 * (introducido en Janthir Wilds). Organiza decorations por categoría con
 * barras de progreso, muestra glifos coleccionables con su item de upgrade,
 * y un modal de detalle para cada decoration.
 *
 * Dependencias:
 *  - GW2Api.getHomesteadDecorationDetails() — /v2/homestead/decorations (static)
 *  - GW2Api.getHomesteadDecorationCategories() — /v2/homestead/decorations/categories (static)
 *  - GW2Api.getHomesteadGlyphs() — /v2/homestead/glyphs (static)
 *  - GW2Api.getAccountHomesteadDecorations(token) — /v2/account/homestead/decorations (account)
 *  - GW2Api.getAccountHomesteadGlyphs(token) — /v2/account/homestead/glyphs (account)
 *  - GW2Api.getItemsMany() — resolución de íconos de items
 *
 * Invariantes:
 *  - Abort + last win en fetches (AbortController + _fetchId)
 *  - Único canal gn:tokenchange
 *  - Prefijo gn: para claves localStorage
 *  - Pattern idéntico a activities.js / raid-tracker.js / strike-tracker.js
 */

(function (root) {
  'use strict';

  var LOG = '[HomesteadTracker]';

  // =======================================================================
  // 1. CONFIGURACIÓN
  // =======================================================================
  var CONFIG = {
    CACHE_KEY_DECORATIONS: 'gn:homestead:decorations',
    CACHE_KEY_CATEGORIES: 'gn:homestead:categories',
    CACHE_KEY_GLYPHS: 'gn:homestead:glyphs',
    CACHE_TTL: 6 * 60 * 60 * 1000,  // 6 horas (datos estáticos)
    // La API /v2/homestead/glyphs devuelve un array de STRINGS ("herbalist_mining"),
    // NO objetos con {id, name, icon}. Estos mapas son solo de presentación.
    // (El antiguo CONFIG.GLYPH_UPGRADES era dead code: leía glyph.upgrade_item,
    //  campo que la API nunca devuelve, y sus upgradeItem no existen.)
    GLYPH_PROFESSIONS: {
      alchemy: 'Alquimia',
      crucible: 'Crisol',
      forester: 'Corredor',
      herbalist: 'Herboristero',
      leatherworker: 'Marroquinería',
      prospector: 'Prospector',
      scavenger: 'Carroñero',
      tailor: 'Sastrería',
      unbound: 'Independiente',
      virtue: 'Virtud',
      volatility: 'Volatilidad',
      watchknight: 'Centinela'
    },
    GLYPH_SLOTS: {
      harvesting: 'Cosecha',
      logging: 'Tala',
      mining: 'Minería'
    }
  };

  // =======================================================================
  // 1b. NORMALIZACIÓN DE GLYPHS
  // =======================================================================
  // /v2/homestead/glyphs -> ["alchemy_harvesting", "herbalist_mining", ...] (36 entradas)
  // /v2/account/homestead/glyphs -> mismo shape, solo los desbloqueados.
  // Normalizamos a {id, profession, slot, name, icon} para que el render sea uniforme.
  // Si la API pasa a devolver objetos, se respetan tal cual (forward-compatible).
  function normalizeGlyphs(raw) {
    if (!Array.isArray(raw)) return [];
    var out = [];
    raw.forEach(function (g) {
      if (typeof g === 'string') {
        var parts = g.split('_');
        var slot = parts.length > 1 ? parts.pop() : '';
        var prof = parts.join('_');
        out.push({
          id: g,
          profession: prof,
          slot: slot,
          name: (CONFIG.GLYPH_PROFESSIONS[prof] || prof) + ' · ' +
                (CONFIG.GLYPH_SLOTS[slot] || slot),
          icon: ''
        });
      } else if (g && g.id != null) {
        out.push(g);
      }
    });
    return out;
  }

  // El endpoint de cuenta devuelve strings; si en el futuro devuelve objetos,
  // extraemos el id para que el Set de poseídos sea comparable.
  function normalizeGlyphIds(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(function (g) {
      return (typeof g === 'string') ? g : (g && g.id);
    }).filter(function (g) { return g != null; });
  }

  // =======================================================================
  // 2. ESTADO GLOBAL
  // =======================================================================
  var state = {
    inited: false,
    active: false,
    token: null,
    loading: false,
    error: null,
    decorations: [],         // static decoration details from API
    categories: [],         // static category list from API
    glyphs: [],             // static glyph details from API
    accountDecorations: {}, // { decoration_id: count }
    accountGlyphs: [],      // array of glyph IDs owned
    _fetchId: 0,
    _abortCtrl: null
  };

  // =======================================================================
  // 3. UTILIDADES
  // =======================================================================
  function getSelectedToken() {
    var sel = root.document.getElementById('keySelectGlobal');
    return sel ? (sel.value || '').trim() : null;
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function abortLastFetch() {
    if (state._abortCtrl) {
      try { state._abortCtrl.abort(); } catch (_) {}
    }
    state._abortCtrl = null;
  }

  function computeProgress() {
    var accountDecos = state.accountDecorations || {};
    var ownedCount = 0;
    var totalCount = state.decorations.length;
    var ownedIds = Object.keys(accountDecos);
    ownedCount = ownedIds.length;

    var categoryProgress = {};
    (state.categories || []).forEach(function (cat) {
      var catDecos = (state.decorations || []).filter(function (d) {
        return (d.categories || []).some(function (c) {
          return c.id === cat.id || c === cat.id;
        });
      });
      var ownedInCat = 0;
      catDecos.forEach(function (d) {
        if (accountDecos[d.id] != null) ownedInCat++;
      });
      categoryProgress[cat.id] = {
        name: cat.name || cat.nameEs || ('Category ' + cat.id),
        total: catDecos.length,
        owned: ownedInCat,
        percent: catDecos.length > 0 ? Math.round((ownedInCat / catDecos.length) * 100) : 0
      };
    });

    var totalPercent = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

    return {
      totalDecorations: totalCount,
      ownedDecorations: ownedCount,
      totalPercent: totalPercent,
      categoryProgress: categoryProgress
    };
  }

  // =======================================================================
  // 4. FETCH DE DATOS
  // =======================================================================
  async function loadHomesteadData(forceNoCache) {
    state._fetchId++;
    var currentFetchId = state._fetchId;
    abortLastFetch();

    state.loading = true;
    state.error = null;
    renderLoading();

    var token = getSelectedToken();
    if (!token) {
      state.loading = false;
      state.error = 'No hay token seleccionado';
      renderError(state.error);
      return;
    }

    state.token = token;

    state._abortCtrl = new root.AbortController();
    var signal = state._abortCtrl.signal;

    try {
      // Fetch static data (decorations, categories, glyphs) + account data in parallel
      var promises = [
        root.GW2Api.getHomesteadDecorationDetails({ nocache: forceNoCache }),
        root.GW2Api.getHomesteadDecorationCategories({ nocache: forceNoCache }),
        root.GW2Api.getHomesteadGlyphs({ nocache: forceNoCache }),
        root.GW2Api.getAccountHomesteadDecorations(token, { nocache: forceNoCache, signal: signal }),
        root.GW2Api.getAccountHomesteadGlyphs(token, { nocache: forceNoCache, signal: signal })
      ];

      var results = await Promise.all(promises);

      // Abort check (last win)
      if (currentFetchId !== state._fetchId) {
        console.debug(LOG, 'fetch cancelado (last win), ignore results');
        return;
      }
      if (signal && signal.aborted) return;

      // Persist static data
      try {
        localStorage.setItem(CONFIG.CACHE_KEY_DECORATIONS, JSON.stringify({
          ts: Date.now(),
          data: results[0]
        }));
        localStorage.setItem(CONFIG.CACHE_KEY_CATEGORIES, JSON.stringify({
          ts: Date.now(),
          data: results[1]
        }));
        localStorage.setItem(CONFIG.CACHE_KEY_GLYPHS, JSON.stringify({
          ts: Date.now(),
          data: results[2]
        }));
      } catch (_) {}

      state.decorations = results[0] || [];
      state.categories = results[1] || [];
      state.glyphs = normalizeGlyphs(results[2]);
      state.accountDecorations = {};
      if (Array.isArray(results[3])) {
        results[3].forEach(function (entry) {
          if (entry && entry.id != null) state.accountDecorations[entry.id] = entry.count || 1;
        });
      }
      state.accountGlyphs = normalizeGlyphIds(results[4]);

      // Fallback: load from localStorage if API returned empty
      if (state.decorations.length === 0) {
        try {
          var cached = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY_DECORATIONS) || '{}');
          if (cached.ts && (Date.now() - cached.ts) < CONFIG.CACHE_TTL) {
            state.decorations = cached.data || [];
          }
          var cachedCats = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY_CATEGORIES) || '{}');
          if (cachedCats.ts && (Date.now() - cachedCats.ts) < CONFIG.CACHE_TTL) {
            state.categories = cachedCats.data || [];
          }
          var cachedGlyphs = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY_GLYPHS) || '{}');
          if (cachedGlyphs.ts && (Date.now() - cachedGlyphs.ts) < CONFIG.CACHE_TTL) {
            state.glyphs = normalizeGlyphs(cachedGlyphs.data);
          }
        } catch (_) {}
      }

      state.loading = false;
      if (currentFetchId !== state._fetchId) return;
      renderHomestead();
    } catch (err) {
      if (currentFetchId !== state._fetchId) return;
      if (signal && signal.aborted) {
        console.debug(LOG, 'fetch abortado (last win)');
        return;
      }
      console.warn(LOG, 'Error loading homestead data:', err);
      state.loading = false;
      state.error = err.message || String(err);

      // Try localStorage fallback
      try {
        var decCached = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY_DECORATIONS) || '{}');
        if (decCached.ts && (Date.now() - decCached.ts) < CONFIG.CACHE_TTL) {
          state.decorations = decCached.data || [];
        }
        var catCached = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY_CATEGORIES) || '{}');
        if (catCached.ts && (Date.now() - catCached.ts) < CONFIG.CACHE_TTL) {
          state.categories = catCached.data || [];
        }
        var glyCached = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY_GLYPHS) || '{}');
        if (glyCached.ts && (Date.now() - glyCached.ts) < CONFIG.CACHE_TTL) {
          state.glyphs = normalizeGlyphs(glyCached.data);
        }
        if (state.decorations.length > 0) {
          renderHomestead();
          return;
        }
      } catch (_) {}

      renderError(state.error);
    } finally {
      state._abortCtrl = null;
    }
  }

  // =======================================================================
  // 5. RENDER
  // =======================================================================
  function renderLoading() {
    var body = root.document.getElementById('homesteadTrackerBody');
    if (!body) return;
    body.innerHTML = '<div class="muted" style="text-align: center; padding: 40px;">⏳ Cargando Homestead...</div>';
  }

  function renderError(msg) {
    var body = root.document.getElementById('homesteadTrackerBody');
    if (!body) return;
    body.innerHTML =
      '<div class="muted" style="text-align: center; padding: 40px;">' +
        '❌ Error al cargar Homestead.<br><small>' + esc(msg) + '</small>' +
      '</div>';
  }

  function renderHomestead() {
    var body = root.document.getElementById('homesteadTrackerBody');
    if (!body) return;

    var progress = computeProgress();
    var ownedGlyphs = state.accountGlyphs.length;
    var totalGlyphs = state.glyphs.length;

    var html = '';
    html += '<div class="homestead-summary" style="display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px;">';
    html += kpCard('Decoraciones', progress.ownedDecorations + ' / ' + progress.totalDecorations, progress.totalPercent, '#b71c1c');
    html += kpCard('Glifos', ownedGlyphs + ' / ' + totalGlyphs, totalGlyphs > 0 ? Math.round((ownedGlyphs / totalGlyphs) * 100) : 0, '#4a148c');
    html += '</div>';

    // Category grid
    html += '<div class="homestead-categories">';
    html += '<h3 style="font-size: 1rem; margin: 0 0 12px 0; color: var(--tx-1);">Categorías de decoraciones</h3>';
    html += '<div class="grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px;">';

    var catProgress = progress.categoryProgress;
    Object.keys(catProgress).forEach(function (catId) {
      var cp = catProgress[catId];
      html += categoryCard(cp.name, cp.owned, cp.total, cp.percent);
    });

    // Show uncategorized decorations
    var uncategorized = state.decorations.filter(function (d) {
      return !(d.categories || []).some(function (c) {
        return c.id != null;
      });
    });
    if (uncategorized.length > 0) {
      var ownedUncat = uncategorized.filter(function (d) {
        return state.accountDecorations[d.id] != null;
      }).length;
      html += categoryCard('Sin categoría', ownedUncat, uncategorized.length,
        Math.round((ownedUncat / uncategorized.length) * 100));
    }

    html += '</div></div>';

    // Glyphs section
    html += '<div class="homestead-glyphs" style="margin-top: 24px;">';
    html += '<h3 style="font-size: 1rem; margin: 0 0 12px 0; color: var(--tx-1);">Glifos del Homestead</h3>';
    html += '<div class="glyph-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;">';

    var ownedSet = new Set(state.accountGlyphs);
    state.glyphs.forEach(function (glyph) {
      var owned = ownedSet.has(glyph.id);
      html += '<div class="glyph-card card" style="padding: 8px; text-align: center; ' +
        (owned ? 'borderLeft: 3px solid rgba(105,180,255,0.5);' : 'opacity: 0.5;') + '">' +
        (glyph.icon
          ? '<img src="' + esc(glyph.icon) + '" width="32" height="32" alt="' + esc(glyph.name) + '" style="display:block;margin:0 auto 4px;">'
          : '<div style="height:32px;margin:0 auto 4px;"></div>') +
        '<small>' + esc(glyph.name || ('Glyph ' + glyph.id)) + '</small>' +
        (owned ? '<div style="color:var(--color-green);font-size:0.75rem;">✓</div>' : '<div style="color:var(--tx-2);font-size:0.75rem;">✗</div>') +
        '</div>';
    });

    html += '</div></div>';

    body.innerHTML = html;
  }

  function kpCard(label, sub, percent, color) {
    return '<div class="kp-card card" style="flex:1;min-width:160px;padding:12px;borderLeft:3px solid rgba(' + hexRgb(color) + ',0.5);">' +
      '<div style="font-size:0.7rem;text-transform:uppercase;color:var(--tx-2);letter-spacing:0.5px;">' + esc(label) + '</div>' +
      '<div style="font-size:1.4rem;font-weight:700;color:var(--tx-1);">' + esc(sub) + '</div>' +
      '<div class="progress" style="height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;margin-top:6px;">' +
        '<div style="height:100%;width:' + percent + '%;background:' + color + ';border-radius:2px;"></div>' +
      '</div>' +
      '<small style="color:var(--tx-2);font-size:0.7rem;">' + percent + '%</small>' +
      '</div>';
  }

  function categoryCard(name, owned, total, percent) {
    var color = percent >= 100 ? '#4caf50' : (percent >= 50 ? '#ff9800' : '#f44336');
    return '<div class="category-card card" style="padding:12px;borderLeft:3px solid rgba(' + hexRgb(color) + ',0.5);">' +
      '<div style="font-size:0.7rem;text-transform:uppercase;color:var(--tx-2);letter-spacing:0.5px;">' + esc(name) + '</div>' +
      '<div style="font-size:1.1rem;font-weight:600;margin:4px 0;">' + owned + ' / ' + total + '</div>' +
      '<div class="progress" style="height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">' +
        '<div style="height:100%;width:' + percent + '%;background:' + color + ';border-radius:2px;"></div>' +
      '</div>' +
      '</div>';
  }

  function hexRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    return r + ',' + g + ',' + b;
  }

  // =======================================================================
  // 6. EVENTOS
  // =======================================================================
  function wireGlobalEvents() {
    document.addEventListener('gn:tokenchange', function () {
      if (!state.active) return;
      console.log(LOG, 'tokenchange detected, reloading...');
      loadHomesteadData(true);
    });
  }

  // =======================================================================
  // 7. LIFECYCLE
  // =======================================================================
  function activate() {
    if (state.active) return;
    state.active = true;
    console.log(LOG, 'activate()');
    var token = getSelectedToken();
    if (token) {
      state.token = token;
      loadHomesteadData(false);
    } else {
      renderError('Seleccioná una cuenta para ver tu Homestead');
    }
  }

  function deactivate() {
    if (!state.active) return;
    state.active = false;
    console.log(LOG, 'deactivate()');
    abortLastFetch();
  }

  async function prefetch(ctx) {
    if (ctx && ctx.signal && ctx.signal.aborted) return;
    var token = getSelectedToken();
    if (!token) return;
    try {
      await root.GW2Api.getAccountHomesteadDecorations(token, { nocache: false });
      await root.GW2Api.getAccountHomesteadGlyphs(token, { nocache: false });
    } catch (e) {
      console.debug(LOG, 'prefetch error (ignored)', e);
    }
  }

  var _refreshInFlight = null;
  function refresh(forceNoCache) {
    if (_refreshInFlight) return _refreshInFlight;
    try {
      _refreshInFlight = loadHomesteadData(!!forceNoCache);
    } finally {
      _refreshInFlight = null;
    }
  }

  function initOnce() {
    if (state.inited) return;
    wireGlobalEvents();
    state.inited = true;
    console.log(LOG, 'ready v1.0.0');
  }

  // =======================================================================
  // 8. API PÚBLICA
  // =======================================================================
  var HomesteadTracker = {
    initOnce: initOnce,
    activate: activate,
    deactivate: deactivate,
    prefetch: prefetch,
    refresh: refresh,
    _debug: function () {
      return {
        version: '1.0.0',
        inited: state.inited,
        active: state.active,
        token: state.token ? (state.token.slice(0, 8) + '...') : null,
        loading: state.loading,
        error: state.error,
        decorationsLoaded: state.decorations.length,
        categoriesLoaded: state.categories.length,
        glyphsLoaded: state.glyphs.length,
        accountDecorationsOwned: Object.keys(state.accountDecorations).length,
        accountGlyphsOwned: state.accountGlyphs.length
      };
    },
    Route: {
      path: 'account/homestead',
      mount: activate,
      unmount: deactivate,
      prefetch: prefetch
    }
  };

  root.HomesteadTracker = HomesteadTracker;

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', initOnce);
  } else {
    initOnce();
  }

  console.info(LOG, 'Módulo cargado v1.0.0');

})(typeof window !== 'undefined' ? window : this);
