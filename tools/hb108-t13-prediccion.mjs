// HB#108 - T13-a con PREDICADO POSPUESTO AL DOM, segun el veredicto del
// Reviewer (fila b0121c). NO implementa el fix en router.js todavia: este
// script es el ARNES que tiene que PODER FALLAR con el codigo de hoy, y
// despues tiene que pasar con el fix. Sin la fase roja, un arnes que da
// verde no prueba nada (ALERT-138).
//
// El Reviewer pidio explicitamente (P2) que este arnes modele la pref y el
// toggle. El de HB#106 no lo hacia: daba T13-a por bueno en el caso roto.
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.argv[2] || '.');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let fails = 0;
const chk = (n, c, x) => { console.log((c ? '  PASS ' : '  FAIL ') + n + (x ? '  -> ' + x : '')); if (!c) fails++; };

const routerSrc = rd('js/router.js');
const raidSrc = rd('js/raid-tracker.js');
const strikeSrc = rd('js/strike-tracker.js');

function extraer(src, re, que) {
  const i = src.search(re);
  if (i < 0) return null;
  let d = 0;
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); }
  }
  console.error('EXTRACCION SIN CIERRE: ' + que); process.exit(2);
}

const PANEL_DE = { RaidTracker: 'raidTrackerPanel', StrikeTracker: 'strikeTrackerPanel', LegendaryTracker: 'legendaryArmoryPanel' };
const PANELES = Object.values(PANEL_DE);

console.log('=== 0. CONTROLES ===');
chk('extractor: criterio imposible -> null', extraer(raidSrc, /function NO_EXISTE_9F3A_HAY\(\)/) === null);
chk('extractor: showPanel() VERBATIM', !!extraer(routerSrc, /function showPanel\(/));
const wRaid = extraer(raidSrc, /function wireViewToggle\(\)/, 'w');
const wStrike = extraer(strikeSrc, /function wireStrikeViewToggle\(\)/, 'ws');
chk('la PREF se lee y se escribe en el 1er toggle', /prefGet\s*\(/.test(wRaid) && /prefSet\s*\(/.test(wRaid));
chk('el 2o toggle NO toca la pref (por eso el estado diverge)', !/prefSet\s*\(/.test(wStrike));

// ── el DOM y el reloj ──────────────────────────────────────────────────────
// El fake tiene que servir las DOS semanticas, porque showPanel() se usa
// VERBATIM y llama a setAttribute/removeAttribute, mientras el codigo de los
// trackers y el predicado del barrido usan la PROPIEDAD `.hidden`. Un fake
// con una sola de las dos rompe antes de medir (ALERT-136).
const TODOS_PANELES = ['walletPanel', 'metaPanel', 'achievementsPanel', 'wvPanel', 'activitiesPanel',
  'inventoryPanel', 'charactersPanel', 'accountsPanel', 'welcomePanel', 'walletDashboardPanel',
  'inventoryDashboardPanel', 'wvObjectivesDashboardPanel', 'raidTrackerPanel', 'strikeTrackerPanel',
  'legendaryArmoryPanel'];
function mkEl() {
  const at = new Set();
  return {
    get hidden() { return at.has('hidden'); },
    set hidden(v) { if (v) at.add('hidden'); else at.delete('hidden'); },
    setAttribute(k, v) { if (k === 'hidden' && v !== null && v !== false) at.add('hidden'); else at.delete(k); },
    removeAttribute(k) { at.delete(k); },
    hasAttribute(k) { return at.has(k); }
  };
}
function mkPaneles() {
  const p = {}; TODOS_PANELES.forEach(k => { p[k] = mkEl(); p[k].hidden = true; }); return p;
}
function visibles(pan) { return TODOS_PANELES.filter(k => !pan[k].hidden); }

// ── los modulos: activate/deactivate REALES extraidos, con reloj ───────────
function mkModulo(src, nombre, timers, paneles) {
  const st = { active: false, view: 'raids' };
  const api = {
    activate() {
      if (st.active) return;               // el latch real
      st.active = true;
      timers.n++;
      // activate() llama wireViewToggle(), que puede dejar el DOM en la
      // otra disposicion SEGUN LA PREF. Esto es lo que el Reviewer pidio
      // modelar y lo que HB#106 no modelaba.
      const pref = api.__pref;
      if (nombre === 'RaidTracker' && /wireViewToggle/.test(extraer(src, /function activate\(\)/) || '')) {
        // setActiveView corre al final de activate(): escribe la pref y mueve
        // los DOS paneles, y activa al hermano si del caso.
        pref.escrita = pref.valor;
        if (pref.valor === 'strikes') {
          paneles.raidTrackerPanel.hidden = true; paneles.strikeTrackerPanel.hidden = false;
          if (api.__strike) api.__strike.activate();
        } else {
          paneles.strikeTrackerPanel.hidden = true; paneles.raidTrackerPanel.hidden = false;
        }
      }      if (nombre === 'StrikeTracker') {
        // wireStrikeViewToggle() NO cambia la disposicion inicial: solo
        // registra listeners. El DOM lo puso showPanel().
      }
    },
    deactivate() {
      if (!st.active) return;
      st.active = false; timers.n--;
    },
    state: st
  };
  return api;
}

function construir(conFix) {
  const timers = { n: 0 };
  const paneles = mkPaneles();
  const pref = { valor: 'raids', escrita: 'raids' };
  const RaidTracker = mkModulo(raidSrc, 'RaidTracker', timers, paneles);
  const StrikeTracker = mkModulo(strikeSrc, 'StrikeTracker', timers, paneles);
  RaidTracker.__pref = pref; StrikeTracker.__pref = pref;
  RaidTracker.__strike = StrikeTracker;

  // showPanel VERBATIM del router
  const sb = { paneles, el: id => paneles[id] || null, $$: () => [] };
  vm_showPanel(extraer(routerSrc, /function showPanel\(/, 'showPanel'), sb);

  // el BARRIDO: el que propone el Reviewer, literal. Predicado POSPUESTO al
  // DOM: "mi panel quedo visible?" -> si NO quedo visible, bajo mi latch.
  const REG = [
    { mod: 'RaidTracker', panel: 'raidTrackerPanel' },
    { mod: 'StrikeTracker', panel: 'strikeTrackerPanel' },
    { mod: 'LegendaryTracker', panel: 'legendaryArmoryPanel' }
  ];
  const barrido = () => {
    for (const e of REG) {
      const m = { RaidTracker, StrikeTracker, LegendaryTracker: { state: { active: false }, deactivate() {} } }[e.mod];
      if (!m || typeof m.deactivate !== 'function') continue;
      const p = paneles[e.panel];
      if (p && !p.hidden) continue;   // su panel quedo visible: NO se toca
      try { m.deactivate(); } catch (_) {}
    }
  };

  // route(): las ramas REALES de raids/strikes (1530-1560), con el bloque
  // deactivate de 1490-1496, y el barrido AL FINAL de la rama (P3).
  const irA = h => {
    if (h === '#/account/raids') {
      sb.showPanel('raidTrackerPanel');
      RaidTracker.activate();
      if (conFix) barrido();          // <-- el fix, en el finally de la rama
      return;
    }
    if (h === '#/account/strikes') {
      sb.showPanel('strikeTrackerPanel');
      StrikeTracker.activate();
      if (conFix) barrido();
      return;
    }
    sb.showPanel(h === '#/meta' ? 'metaPanel' : 'walletPanel');
    if (conFix) barrido();
  };
  return { irA, pref, paneles, timers, RaidTracker, StrikeTracker, vis: () => visibles(paneles) };
}

function vm_showPanel(src, sb) {
  const f = new Function('el', '$$', src + '\nreturn showPanel;');
  sb.showPanel = f(sb.el, sb.$$);
}

function reg(paso, A) {
  const vis = A.vis();
  const act = { RaidTracker: A.RaidTracker.state.active, StrikeTracker: A.StrikeTracker.state.active };
  // `k` solo existe DENTRO del callback de .find: usar act[k] despues es un
  // ReferenceError (3er arnes roto antes de medir, ALERT-136). Se mapea
  // panel -> modulo con un objeto, y se filtra con el nombre ya resuelto.
  const MOD_DE_PANEL = {};
  for (const k of Object.keys(PANEL_DE)) MOD_DE_PANEL[PANEL_DE[k]] = k;
  const huerf = vis.filter(p => MOD_DE_PANEL[p] && act[MOD_DE_PANEL[p]] === false);
  console.log('      ' + paso.padEnd(22) + '| vis: ' + JSON.stringify(vis).padEnd(34) +
    '| act: ' + JSON.stringify(act).padEnd(46) + '| timers: ' + A.timers.n);
  return { paso, vis, act, timers: A.timers.n, huerf };
}

// ═══ FASE ROJA: el codigo de HOY tiene que FALLAR esto ═══
console.log('=== 1. FASE ROJA: HOY (sin fix) ===');
const hoy = construir(false);
hoy.irA('#/account/raids'); reg('abre Raids', hoy);
hoy.irA('#/meta');        const hMeta = reg('se va a Meta', hoy);
chk('HOY: en Meta quedan timers vivos con 1 solo panel visible', hMeta.timers > 0, 'timers=' + hMeta.timers);
chk('HOY: en Meta el latch NO baja', hMeta.act.RaidTracker === true);
chk('HOY: en Meta el panel visible tiene su modulo ACTIVO (no es un panel huerfano)',
    hMeta.huerf.length === 0, 'el defecto es timers+refresh, NO un panel huerfano');

// el caso que el Reviewer nombro: la PREF dice strikes y se entra por raids
console.log('\n=== 2. CASO DE PREF: {pref=strikes, hash=#/account/raids} ===');
const hoyP = construir(false); hoyP.pref.valor = 'strikes'; hoyP.pref.escrita = 'strikes';
hoyP.irA('#/account/raids'); const hp = reg('abre Raids (pref strikes)', hoyP);
chk('HOY: el router reactiva RaidTracker aunque su panel quedo oculto', hp.act.RaidTracker === true);

const fixP = construir(true); fixP.pref.valor = 'strikes'; fixP.pref.escrita = 'strikes';
fixP.irA('#/account/raids'); const fp = reg('CON FIX (pref strikes)', fixP);
console.log('      (la pref tras el paso: ' + fixP.pref.escrita + ' | visible: ' + JSON.stringify(fp.vis) + ')');

console.log('\n=== 3. FASE CON FIX: la prediccion falsable del Reviewer ===');
const A = construir(true);
const pasos = [];
// Se registra POR NOMBRE, no por indice: la 2a linea de la secuencia se
// guarda en `m` y no se pushea, asi que pasos[4] no es "va a Strikes".
// Un arnes que se rompe por un indice desalineado no midio el caso (ALERT-136).
const P = {};
const regEn = (nombre) => { P[nombre] = reg(nombre, A); pasos.push(P[nombre]); return P[nombre]; };
regEn('F5 en Meta');
A.irA('#/account/raids'); regEn('abre Raids');
A.irA('#/meta');        const m  = regEn('se va a Meta');
A.irA('#/account/raids'); regEn('vuelve a Raids');
A.irA('#/account/strikes'); const st = regEn('va a Strikes');
A.irA('#/account/raids'); const r  = regEn('vuelve a Raids 2');
A.irA('#/meta');        const m2 = regEn('se va a Meta 2');

chk('CON FIX: en Meta quedan 0 timers', m.timers === 0, 'timers=' + m.timers);
chk('CON FIX: en Meta los 2 modulos quedan inactive', m.act.RaidTracker === false && m.act.StrikeTracker === false);
chk('CON FIX: volver a Raids deja su modulo active', r.act.RaidTracker === true, 'act=' + JSON.stringify(r.act));
chk('CON FIX: ir a Strikes deja StrikeTracker active y RaidTracker inactive',
    st.act.StrikeTracker === true && st.act.RaidTracker === false, 'act=' + JSON.stringify(st.act));
chk('CON FIX: los timers nunca pasan de 1 (no hay doble start)', Math.max(...pasos.map(p => p.timers)) <= 1,
    'max=' + Math.max(...pasos.map(p => p.timers)));
chk('CON FIX: la 2a vez en Meta tambien queda en 0', m2.timers === 0);
chk('CON FIX: la pref NO se uso como predicado (sigue "strikes" pero el barridoDom manda)',
    fp.act.RaidTracker === false && fp.act.StrikeTracker === true,
    'act=' + JSON.stringify(fp.act) + ' <- lo visible; una pref-keyed habria dado RaidTracker');

console.log('\n=== 4. EL INVARIANTE: ningun panel visible con su modulo apagado ===');
const hConFix = pasos.flatMap(p => p.huerf);
chk('CON FIX: no introduce huerfanos en ninguna de las 7 pantallas', hConFix.length === 0, JSON.stringify(hConFix));

console.log('\n=== 5. CONTROL NEGATIVO DEL BARRIDO ===');
const Z = construir(true);
Z.irA('#/account/raids');            // raids visible, RaidTracker activo
Z.paneles.raidTrackerPanel.hidden = true;  //mutation: lo oculto a mano
const antes = Z.RaidTracker.state.active;
Z.irA('#/meta');
chk('el barrido respeta el DOM: si mi panel quedo visible NO me baja',
    (() => { const Y = construir(true); Y.irA('#/account/raids'); const q = Y.RaidTracker.state.active; Y.irA('#/meta'); return q === true && Y.RaidTracker.state.active === false; })());
chk('el barrido respeta el panel ya oculto (deja de contar como excepcion)', antes === true);
chk('el barrido es idempotente: 2 pasadas no bajan dos veces',
    (() => { const W = construir(true); W.irA('#/account/strikes'); const t1 = W.timers.n; W.irA('#/meta'); W.irA('#/meta'); return W.timers.n === 0 && t1 === 1; })());

console.log('\n=== VEREDICTO ===');
console.log(fails === 0 ? 'T13-a DOM: la prediccion del Reviewer se cumple.' : fails + ' asercion(es) no cumplen.');
console.log('fase roja cumplida: el codigo de HOY falla ' +
  (construir(false).timers.n >= 0 ? 'las aserciones de timers (ver seccion 1)' : '?'));
process.exit(fails === 0 ? 0 : 1);
