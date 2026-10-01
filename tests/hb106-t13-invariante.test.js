#!/usr/bin/env node
/*!
 * tests/hb106-t13-invariante.test.js — T13-a: el ciclo de vida de los 5 modulos
 * con latch, EVALUADO sobre la secuencia completa de Pablo.
 *
 * Que NO es esto: un censo. El censo esta en tests/hb106-censo-latch.test.js y
 * mantiene la lista de modulos que el router tiene que desactivar. Esto evalua
 * que la lista SIRVA.
 *
 * Metodo: showPanel() y las ramas de ruta se extraen VERBATIM de router.js;
 * activate/deactivate/startTimers/stopTimers/wireGlobalEvents se extraen
 * VERBATIM de cada tracker; se corre en un vm con deps inyectadas. Un CONTEXTO
 * POR MODULO, porque con los dos en el mismo contexto `var state` del segundo
 * pisa el del primero y RaidTracker.activate() lee el state de StrikeTracker
 * (medido: "RaidTracker.active === false" justo despues de abrir Raids, un
 * numero imposible que delato el arnes, no el producto).
 *
 * Los controles van PRIMERO y con criterio imposible. Un arnes sin control que
 * no discrimina devuelve un numero con forma de dato (ALERT-92/96/121).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

let pass = 0, fail = 0;
const F = [];
function chk(name, cond) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; F.push(name); console.log('  FAIL ' + name); }
}

// ── extractor de llaves (contador, no regex) ────────────────────────────────
function extractFn(code, re) {
  const i = code.search(re);
  if (i < 0) return null;
  const j = code.indexOf('{', i);
  if (j < 0) return null;
  let d = 0;
  for (let k = j; k < code.length; k++) {
    if (code[k] === '{') d++;
    else if (code[k] === '}') { d--; if (d === 0) return code.slice(i, k + 1); }
  }
  return null;
}
function must(x, w) { if (!x) { console.error('EXTRACCION FALLO: ' + w); process.exit(2); } return x; }

const routerSrc = rd('js/router.js');
const raidSrc = rd('js/raid-tracker.js');
const strikeSrc = rd('js/strike-tracker.js');

// ═══════════════════════════════════════════════════════════════════════════
// SECCION 0: CONTROLES DEL ARNES
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n0. CONTROLES DEL ARNES (criterio imposible -> no matchea)');
chk('extractor: criterio imposible -> null',
  extractFn(routerSrc, /function NO_EXISTE_3A11\(/) === null);
chk('extractor: showPanel() VERBATIM localizado',
  !!extractFn(routerSrc, /function showPanel\(/));
// OJO: /setInterval/ NO cuenta timers: "setInterval" es SUBCADENA de
// "clearInterval". El conteo real es `= setInterval(`.
chk('CONTROL del conteo: /setInterval/g NO da 3 en raid-tracker (da 11)',
  (raidSrc.match(/setInterval/g) || []).length !== 3);
chk('los 3 timers de startTimers de Raids, contados con `= setInterval(`',
  (raidSrc.match(/=\s*setInterval\(/g) || []).length === 3);
chk('los 3 timers de startTimers de Strikes',
  (strikeSrc.match(/=\s*setInterval\(/g) || []).length === 3);

// ═══════════════════════════════════════════════════════════════════════════
// el arnes
// ═══════════════════════════════════════════════════════════════════════════
const PANEL_DE = { RaidTracker: 'raidTrackerPanel', StrikeTracker: 'strikeTrackerPanel' };
const PANELES = ['metaPanel', 'raidTrackerPanel', 'strikeTrackerPanel', 'walletPanel',
  'achievementsPanel', 'wvPanel', 'activitiesPanel', 'inventoryPanel', 'charactersPanel'];

function mkEl() {
  return {
    hidden: false, attrs: {}, style: {}, innerHTML: '',
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute(a) { this.attrs[a] = 1; if (a === 'hidden') this.hidden = true; },
    removeAttribute(a) { delete this.attrs[a]; if (a === 'hidden') this.hidden = false; },
    appendChild() {}, addEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; }
  };
}

const DEPS = [
  'var updateUtcTime=function(){},updateLocalTime=function(){},updateResetCounters=function(){},updateLiDisplay=function(){},syncLiFromRaidTracker=function(){};',
  'var ensurePanelContent=function(){return true;},showSkeleton=function(){},wireViewToggle=function(){},wireStrikeViewToggle=function(){},ensureModal=function(){},closeModal=function(){},renderError=function(){},render=function(){},getSelectedToken=function(){return "T";},prefetch=function(){};',
  'var loadRaidData=function(){return Promise.resolve({});},loadStrikeData=function(){return Promise.resolve({});};'
].join('\n');

function construir(t13a, t13b) {
  const timers = new Map(); let id = 1;
  const listeners = {}; const calls = [];
  const panels = {}; PANELES.forEach(p => { panels[p] = mkEl(); panels[p].hidden = true; });
  const win = {};

  function modulo(src, nombre) {
    const box = {
      console: { log() {}, info() {}, warn() {}, debug() {}, error() {} }, LOG: '[RT]', window: null,
      setInterval(f, ms) { const i = id++; timers.set(i, { f, ms }); return i; },
      clearInterval(i) { timers.delete(i); },
      document: {
        addEventListener(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
        getElementById(x) { return panels[x] || null; },
        createElement() { return mkEl(); },
        querySelector() { return null; }, querySelectorAll() { return []; }
      },
      __calls: calls, __timers: timers, __panels: panels
    };
    vm.createContext(box);
    const i = src.indexOf('var state = {');
    const j = src.indexOf('};', i);
    // T13-b textual: stopTimers() antes del return del guard. El guard completo
    // de 1 linea es lo que se matchea, no `^\s*` (ALERT-121: en flag m `\s`
    // incluye `\n` y se come la linea de arriba).
    let activateSrc = must(extractFn(src, /function activate\(\)/), 'activate ' + nombre);
    if (t13b) {
      const patched = activateSrc.replace(/(\{\s*\r?\n)(\s*)(if\s*\(\s*state\.active\s*\)\s*return;)/, '$1$2stopTimers();\n$2$3');
      if (patched === activateSrc) { console.error('PATCH T13-b NO MATCHEO en ' + nombre); process.exit(2); }
      activateSrc = patched;
    }
    vm.runInContext([
      src.slice(i, j + 2),
      DEPS,
      'var refresh=function(f){__calls.push(' + JSON.stringify(nombre + ':refresh:') + '+f);};',
      must(extractFn(src, /function startTimers\(\)/), 'startTimers ' + nombre),
      must(extractFn(src, /function stopTimers\(\)/), 'stopTimers ' + nombre),
      activateSrc,
      must(extractFn(src, /function deactivate\(\)/), 'deactivate ' + nombre),
      must(extractFn(src, /function wireGlobalEvents\(\)/), 'wire ' + nombre),
      'this.__api={activate:activate,deactivate:deactivate,wire:wireGlobalEvents,state:state};'
    ].join('\n'), box);
    return box.__api;
  }

  win.RaidTracker = modulo(raidSrc, 'RaidTracker', t13b);
  win.StrikeTracker = modulo(strikeSrc, 'StrikeTracker', t13b);
  win.RaidTracker.wire(); win.StrikeTracker.wire();

  // showPanel VERBATIM
  const sb = { __panels: panels, console: { log() {} } };
  vm.createContext(sb);
  vm.runInContext([
    'function el(x){return __panels[x]||null;}',
    'function $$(s,r){return [];}',
    must(extractFn(routerSrc, /function showPanel\(/), 'showPanel'),
    'this.showPanel=showPanel;'
  ].join('\n'), sb);

  // router: el bloque deactivate REAL (router.js:1490-1496) + T13-a opcional
  const L = routerSrc.split(/\r?\n/);
  const di = L.findIndex(l => /h !== '#\/account\/wizards-vault' && WV && typeof WV\.deactivate/.test(l));
  let deact = L.slice(di, di + 7).join('\n');
  if (t13a) {
    deact += '\n' + [
      '        var MODULOS_CON_LATCH = [',
      "          { hash: '#/account/raids', mod: 'RaidTracker' },",
      "          { hash: '#/account/strikes', mod: 'StrikeTracker' }",
      '        ];',
      '        for (var _i = 0; _i < MODULOS_CON_LATCH.length; _i++) {',
      '          var _e = MODULOS_CON_LATCH[_i];',
      '          if (h === _e.hash) continue;',
      '          var _m = window[_e.mod];',
      "          if (_m && typeof _m.deactivate === 'function') { try { _m.deactivate(); } catch (_) {} }",
      '        }'
    ].join('\n');
  }
  const body = [
    deact,
    "  if (h === '#/account/raids') { showPanel('raidTrackerPanel'); if (window.RaidTracker && typeof window.RaidTracker.activate === 'function') window.RaidTracker.activate(); return; }",
    "  if (h === '#/account/strikes') { showPanel('strikeTrackerPanel'); if (window.StrikeTracker && typeof window.StrikeTracker.activate === 'function') window.StrikeTracker.activate(); return; }",
    "  showPanel('metaPanel');"
  ].join('\n');
  const route = new Function('window', 'WV', '_actAbort', 'h', 'showPanel', body);

  return {
    irA: h => route(win, { deactivate() {} }, null, h, sb.showPanel),
    tokenchange() { for (const f of listeners['gn:tokenchange'] || []) f(); },
    visibles: () => PANELES.filter(p => !panels[p].hidden),
    activos: () => ({ RaidTracker: win.RaidTracker.state.active, StrikeTracker: win.StrikeTracker.state.active }),
    timers, calls
  };
}

// la SECUENCIA de Pablo: 7 pantallas
function secuencia(t13a, t13b) {
  const A = construir(t13a, t13b);
  const pasos = [];
  const reg = nombre => {
    const vis = A.visibles(); const act = A.activos();
    const huerf = vis.filter(p => { const m = Object.keys(PANEL_DE).find(k => PANEL_DE[k] === p); return m && act[m] === false; });
    pasos.push({ nombre, vis, act, timers: A.timers.size, huerf });
  };
  reg('F5 en Meta');
  A.irA('#/account/raids'); reg('abre Raids');
  A.irA('#/meta'); reg('se va a Meta');
  A.irA('#/account/raids'); reg('vuelve a Raids');
  A.irA('#/account/strikes'); reg('va a Strikes');
  A.irA('#/account/raids'); reg('vuelve a Raids');
  A.irA('#/meta'); reg('se va a Meta');
  return pasos;
}

function linea(p) {
  console.log('      ' + p.nombre + ' | visibles: ' + JSON.stringify(p.vis) +
    ' | active: ' + JSON.stringify(p.act) + ' | timers: ' + p.timers);
  if (p.huerf.length) console.log('      *** PANEL VISIBLE SIN MODULO ACTIVO: ' + JSON.stringify(p.huerf));
}

const hoy = secuencia(false, false);
console.log('\n1. HOY (origin/main) — el defecto de T13');
hoy.forEach(linea);
const soloB = secuencia(false, true);
console.log('\n2. CON T13-b SOLO (stopTimers antes del guard)');
soloB.forEach(linea);
const conA = secuencia(true, false);
console.log('\n3. CON T13-a SOLO (el router desactiva los 2 de esta pantalla)');
conA.forEach(linea);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n4. LO QUE PAGA HOY (la fila que el PO medico, verificada)');
chk('HOY: abrir Raids deja 3 timers y RaidTracker activo',
  hoy[1].timers === 3 && hoy[1].act.RaidTracker === true);
chk('HOY: stepping por Strikes deja 6 timers (3+3, los 2 trackers) — el "6 timers" del PO',
  hoy[4].timers === 6);
chk('HOY: en Meta quedan 6 timers vivos con 1 solo panel visible',
  hoy[6].timers === 6 && hoy[6].vis.length === 1);
chk('HOY: en Meta los 2 modulos siguen active: el latch NUNCA baja',
  hoy[6].act.RaidTracker === true && hoy[6].act.StrikeTracker === true);
chk('HOY: volver a Raids no reinicia los timers (el guard corta antes de startTimers)',
  hoy[5].timers === 6);

console.log('\n5. LO QUE PROMETE T13-b, Y LO QUE NO CUMPLE');
chk('T13-b NO baja el latch (sigue active en Meta)', soloB[6].act.RaidTracker === true);
chk('T13-b NO corta los timers con el panel oculto (siguen 3 en Meta)', soloB[6].timers === 3);
chk('T13-b deja el panel de Raids VISIBLE con 0 timers en la 2a visita (REGRESION)',
  soloB[3].timers === 0 && soloB[3].vis.includes('raidTrackerPanel'));
chk('O sea: T13-b por si solo congela los clocks del panel que Pablo esta mirando',
  soloB[3].timers === 0);

console.log('\n6. LO QUE PROMETE T13-a');
chk('CONTROL: el arnes discrimina (HOY y T13-a dan numeros distintos en Meta)',
  hoy[6].timers !== conA[6].timers);
chk('T13-a: en Meta quedan 0 timers', conA[6].timers === 0);
chk('T13-a: en Meta los 2 modulos quedan inactive (el latch baja)', conA[6].act.RaidTracker === false && conA[6].act.StrikeTracker === false);
chk('T13-a: volver a Raids deja 3 timers y RaidTracker active', conA[3].timers === 3 && conA[3].act.RaidTracker === true);
chk('T13-a: ir a Strikes deja 3 timers y StrikeTracker active, RaidTracker inactive',
  conA[4].timers === 3 && conA[4].act.StrikeTracker === true && conA[4].act.RaidTracker === false);
chk('T13-a: los timers nunca pasan de 3 (no hay doble start)', conA.every(p => p.timers <= 3));

console.log('\n7. EL INVARIANTE: ningun panel visible con su modulo apagado');
const hHoy = hoy.flatMap(p => p.huerf), hA = conA.flatMap(p => p.huerf);
console.log('      (informativo) huerfanos HOY: ' + JSON.stringify(hHoy) + ' | T13-a: ' + JSON.stringify(hA));
chk('HOY no tiene huerfanos (el defecto de T13 es timers y refresh, no un panel huerfano)', hHoy.length === 0);
chk('T13-a NO introduce huerfanos en ninguna de las 7 pantallas', hA.length === 0);

console.log('\n' + '='.repeat(62));
console.log('hb106-t13-invariante: ' + pass + ' pass / ' + fail + ' FAIL');
if (fail) { console.log('\nFALLAS:'); F.forEach(f => console.log('  - ' + f)); }
process.exit(fail ? 1 : 0);