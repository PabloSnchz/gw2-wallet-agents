/*!
 * js/legendary-tracker-theme.js — Tema visual del Armería Legendaria
 * Proyecto: Bóveda del Gato Negro (GW2 Wallet Ligero)
 * v1.0.0 (Phase 3 Commit 3)
 *
 * Capa 3 — Color semántico:
 *   SOLO aplica `borderLeft: 3px solid rgba(151, 78, 255, 0.5)` (púrpura legendario)
 *   y la clase `.card` (que provee hover/glow/transition desde theme-polish.css capa 2).
 *
 * NO sobrescribe: border (excepto borderLeft), boxShadow, borderRadius, transition.
 * NO usa !important.
 *
 * Patrón: singleton con MutationObserver (like wv-theme.js).
 */

(function (root) {
  'use strict';

  var LOG = '[LegendaryTheme]';
  var LEGENDARY_COLOR = 'rgba(151, 78, 255, 0.5)'; // #974EFF @ 50%

  // =======================================================================
  // APLICAR TEMA A UNA CARD
  // =======================================================================
  function applyCardTheme(card) {
    if (!card || card.__ltThemed) return;
    card.__ltThemed = true;

    try {
      // Capa 3: SOLO borderLeft (color semántico púrpura legendario)
      card.style.borderLeft = '3px solid ' + LEGENDARY_COLOR;
      // Capa 2: clase .card provee border neutro (excepto borderLeft),
      //         glow base, hover unificado, transition
      card.classList.add('card');
    } catch (_) {}
  }

  // =======================================================================
  // APLICAR A TODAS LAS CARDS EXISTENTES
  // =======================================================================
  function themeAllNow(panel) {
    var host = panel || document;
    var cards = host.querySelectorAll('.lt-item-card');
    cards.forEach(function (card) {
      applyCardTheme(card);
    });
  }

  // =======================================================================
  // OBSERVER PARA NUEVAS CARDS
  // =======================================================================
  function observePanel() {
    var panel = document.getElementById('legendaryTrackerPanel');
    if (!panel || panel.__ltThemeObs) return;
    panel.__ltThemeObs = true;

    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        if (!m.addedNodes) return;
        m.addedNodes.forEach(function (n) {
          if (!(n instanceof HTMLElement)) return;
          if (n.matches && n.matches('.lt-item-card')) {
            applyCardTheme(n);
          } else if (n.querySelectorAll) {
            var cards = n.querySelectorAll('.lt-item-card');
            if (cards.length) {
              cards.forEach(applyCardTheme);
            }
          }
        });
      });
    });

    mo.observe(panel, { childList: true, subtree: true });
  }

  // =======================================================================
  // INICIALIZACIÓN
  // =======================================================================
  function init() {
    observePanel();

    // Tema inmediato si el panel ya está visible
    var panel = document.getElementById('legendaryTrackerPanel');
    if (panel && !panel.hasAttribute('hidden')) {
      themeAllNow(panel);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // =======================================================================
  // API PÚBLICA
  // =======================================================================
  root.LegendaryTrackerTheme = {
    applyCardTheme: applyCardTheme,
    themeAllNow: themeAllNow,
    observePanel: observePanel
  };

  console.info(LOG, 'ready v1.0.0 — color:', LEGENDARY_COLOR);

})(typeof window !== 'undefined' ? window : this);
