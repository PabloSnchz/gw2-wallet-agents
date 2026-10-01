/* tests/hb101-t12-camino.test.js
 *
 * HB#101 — T12 (ronda 33 del PO): el toggle "Raids | Strikes" esta escrito DOS
 * VECES con 4 ids que no se comparten, y en un sentido el boton que Pablo tiene
 * delante NO TIENE LISTENER.
 *
 * ── El defecto, medido ──────────────────────────────────────────────────────
 *
 *   raid-tracker.js:1200-1201   inyecta  viewRaidsBtn / viewStrikesBtn
 *   raid-tracker.js:1034        cablea    wireViewToggle()  <-- los esos
 *   raid-tracker.js:1847        llama     wireViewToggle() DESDE activate()
 *   raid-tracker.js:1828        guard     if (state.active) return;  (una vez)
 *
 *   strike-tracker.js:563-564   inyecta  strikeViewRaidsBtn / strikeViewStrikesBtn
 *   strike-tracker.js:1202      cablea    wireStrikeViewToggle()  <-- los otros
 *   strike-tracker.js:1216      al pedir Raids llama RaidTracker.refresh(false)
 *
 *   git grep de los 4 ids juntos: CERO ids en comun.
 *
 * El camino Raids -> Strikes usa refresh() (que NO cablea) o activate() (que si).
 * El camino Strikes -> Raids usa refresh() -> loadRaidData() -> ensurePanelContent(),
 * que INYECTA los botones pero NO cablea. O sea: se llega al panel de Raids con
 * el panel delante y sus dos botones sin listener. Un F5 sobre la ruta de Raids
 * lo arregla; un F5 sobre la ruta de Strikes NO (medido en la seccion F5).
 *
 * ── Por que 1400+ aserciones no lo ven ─────────────────────────────────────
 *
 * tests/hb78-preferencia-pestana.test.js:161 monta el sandbox con los 2 botones
 * YA inyectados y el documento resuelto, y llama wireViewToggle() directo. O
 * sea: prueba el cableado en el MEJOR caso y nunca el camino de LLEGADA.
 * `git grep strikeViewRaidsBtn tests/` = 0 matches: el otro strip no se prueba.
 *
 * REGLA que este archivo existe para dejar escrita: un test de un control tiene
 * que probar el camino de LLEGADA al control, no el control ya armado. Misma
 * clase que el lost update de la Idea 64: hay que controlar el ORDEN de las
 * llamadas, no un valor.
 *
 * ── POR QUE ESTE ARCHIVO TIENE UN CONTROL ADEMAS DEL CASO ──────────────────
 *
 * Escribi este arnes dos veces y las dos veces dio "boton muerto" con el
 * producto SANO, por dos bugs PROPIOS del mini-DOM:
 *   (a) querySelector('#raidUtcTime') devolvia null siempre, asi que se perdia
 *       el guard "inyectar una sola vez" de ensurePanelContent(): cada llamada
 *       re-inyectaba, destruia los botones ya cableados y el listener quedaba
 *       en un elemento descartado. -> el CONTROL fallo.
 *   (b) los DOS paneles compartian el mismo body, asi que la inyeccion de
 *       Strikes marcaba al body como ya inyectado y la de Raids no ocurria
 *       nunca. -> falso "el boton no existe".
 * Sin el CONTROL, las dos veces habria "confirmado" un bug inexistente y se
 * habria mandado a arreglar algo que funciona (ALERT-96, la segunda vez).
 * El control esta primero y tiene que pasar; si el CONTROL falla, este archivo
 * no sabe ver un caso sano y su veredicto sobre el caso real no vale nada.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const JS = path.join(ROOT, 'js');

let pass = 0, fail = 0;
function ok(cond, msg, why) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg + (why ? '\n          -> ' + why : '')); }
}
function section(t) { console.log('\n[' + t + ']'); }

/** De `function f(` hasta la llave que cierra a su nivel. */
function cuerpo(src, ancla) {
  const ini = src.indexOf(ancla);
  if (ini < 0) throw new Error('no encontre ' + ancla);
  const abre = src.indexOf('{', ini);
  let depth = 0;
  for (let i = abre; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(ini, i + 1); }
  }
  return src.slice(ini);
}

function nuevoLS() {
  return {
    _d: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
    get length() { return Object.keys(this._d).length; },
    key(i) { return Object.keys(this._d)[i] || null; },
  };
}

/**
 * Mini-DOM con los DOS detalles que hacen falta y que en el primer borrador
 * faltaban (ver el bloque de los dos bugs propios, arriba):
 *   - un body POR PANEL;
 *   - el guard "!body.querySelector('#raidUtcTime')" RESPETA el "inyectar una
 *     sola vez", que es lo que impide que ensurePanelContent() destruya los
 *     botones que wireViewToggle() acaba de cablear.
 */
function nuevoDoc() {
  const byId = new Map();
  const nuevoEl = (id) => {
    const e = {
      id, _l: [], _cls: new Set(), _attrs: {}, _html: '', _inyectado: false,
      get classList() {
        const c = e._cls;
        return { add: (x) => c.add(x), remove: (x) => c.delete(x), contains: (x) => c.has(x) };
      },
      setAttribute(k, v) { e._attrs[k] = v; },
      removeAttribute(k) { delete e._attrs[k]; },
      getAttribute(k) { return k in e._attrs ? e._attrs[k] : null; },
      hasAttribute(k) { return k in e._attrs; },
      addEventListener(t, f) { e._l.push({ t, f }); },
      dispatch(t) { e._l.filter((l) => l.t === t).forEach((l) => l.f({ type: t })); },
      nListeners() { return e._l.length; },
      tieneListener(t) { return e._l.some((l) => l.t === t); },
      oculto() { return 'hidden' in e._attrs; },
      querySelector() { return null; },
      appendChild() {},
      textContent: '',
    };
    return e;
  };

  const mk = (id) => { const e = nuevoEl(id); byId.set(id, e); return e; };

  const IDS_RAIDS = ['viewRaidsBtn', 'viewStrikesBtn'];
  const IDS_STRIKES = ['strikeViewRaidsBtn', 'strikeViewStrikesBtn'];

  const vista = (body, ids) => ({
    set innerHTML(v) {
      body._html = v;
      ids.forEach((i) => byId.delete(i));
      for (const id of ids) if (v.includes(`id="${id}"`)) mk(id);
      body._inyectado = true;
    },
    get innerHTML() { return body._html || ''; },
    querySelector(sel) {
      if (sel === '.panel__body') return body;
      // el guard real de ensurePanelContent
      if (sel === '#raidUtcTime' || sel === '#strikeUtcTime') {
        return body._inyectado ? nuevoEl('utc') : null;
      }
      return null;
    },
  });

  const bodyRaids = nuevoEl('bodyRaids');
  const bodyStrikes = nuevoEl('bodyStrikes');
  const panelRaids = nuevoEl('raidTrackerPanel');
  const panelStrikes = nuevoEl('strikeTrackerPanel');
  panelRaids.querySelector = (s) => (s === '.panel__body' ? vista(bodyRaids, IDS_RAIDS) : null);
  panelStrikes.querySelector = (s) => (s === '.panel__body' ? vista(bodyStrikes, IDS_STRIKES) : null);
  byId.set('raidTrackerPanel', panelRaids);
  byId.set('strikeTrackerPanel', panelStrikes);

  return { document: { getElementById: (i) => byId.get(i) || null, createElement: (t) => nuevoEl('') }, byId };
}

function montar() {
  const raid = fs.readFileSync(path.join(JS, 'raid-tracker.js'), 'utf8');
  const strike = fs.readFileSync(path.join(JS, 'strike-tracker.js'), 'utf8');
  const { document, byId } = nuevoDoc();
  const ls = nuevoLS();
  const llamadas = [];

  const sandbox = {
    localStorage: ls, document, LOG: '[hb101]',
    console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  };
  sandbox.window = sandbox;
  sandbox.__llamadas = llamadas;
  vm.createContext(sandbox);

  // El Storage REAL: STORAGE_KEYS_RT sale de Storage.STORAGE_KEYS
  // (raid-tracker.js:893). Un stub daria un veredicto sobre una preferencia
  // que el producto no tiene.
  vm.runInContext(fs.readFileSync(path.join(JS, 'storage.js'), 'utf8'), sandbox, { filename: 'storage.js' });

  const iIni = raid.indexOf('var STORAGE_KEYS_RT');
  const iFin = raid.indexOf('function getSelectedToken');
  vm.runInContext(raid.slice(iIni, iFin), sandbox, { filename: 'raid-tracker.js#prefs' });
  // Los DOS cables, verbatim del fuente. No hace falta arrastrar nada mas:
  // el flag de "ya cableado" va EN EL BOTON (raid-tracker.js), no en el scope
  // del modulo, justamente para que este corte no dependa de como se extraiga.
  vm.runInContext(cuerpo(raid, 'function wireViewToggle('), sandbox, { filename: 'raid-tracker.js#wireViewToggle' });
  vm.runInContext(cuerpo(strike, 'function wireStrikeViewToggle('), sandbox, { filename: 'strike-tracker.js#wireStrikeViewToggle' });
  vm.runInContext('window.__ensureRaids   = ' + cuerpo(raid, 'function ensurePanelContent('), sandbox);
  vm.runInContext('window.__ensureStrikes = ' + cuerpo(strike, 'function ensurePanelContent('), sandbox);

  // Lo que hacen el router y el otro modulo. refresh() NO cablea: llama a
  // ensurePanelContent(), que inyecta. activate() ademas cablea.
  // __reinyectar() simula el unico caso en que ensurePanelContent() vuelve a
  // escribir el innerHTML: que el body se haya quedado SIN el reloj, o sea un
  // panel recien construido o reconstruido. Es el caso que hace que los
  // botones sean objetos NUEVOS.
  vm.runInContext(`
    window.RaidTracker = {
      refresh:  function(){ __llamadas.push('RaidTracker.refresh');  window.__ensureRaids(); },
      activate: function(){ __llamadas.push('RaidTracker.activate'); window.__ensureRaids(); wireViewToggle(); },
      __reinyectar: function(){
        var p = document.getElementById('raidTrackerPanel');
        var b = p.querySelector('.panel__body');
        b._inyectado = false;          // el panel se rehago desde cero
        window.__ensureRaids();
      }
    };
    window.StrikeTracker = {
      refresh:  function(){ __llamadas.push('StrikeTracker.refresh');  window.__ensureStrikes(); },
      activate: function(){ __llamadas.push('StrikeTracker.activate'); window.__ensureStrikes(); wireStrikeViewToggle(); }
    };
  `, sandbox, { filename: 'harness#modulos' });

  return { sandbox, doc: { getElementById: (i) => byId.get(i) || null }, llamadas };
}

console.log('\n══ T12: el camino de LLEGADA al toggle, no el toggle ya armado ══');

/* ═════════════════════════════════════════════════════════════════════════
   0. EL CONTROL. Tiene que pasar. Si no, el arnes no sabe ver un caso sano.
   ═════════════════════════════════════════════════════════════════════════ */
section('CONTROL: entrar por Raids -> activate() cablea');
{
  const { sandbox, doc } = montar();
  sandbox.RaidTracker.activate();
  const rb = doc.getElementById('viewRaidsBtn');
  const sb = doc.getElementById('viewStrikesBtn');
  ok(!!rb && !!sb, 'los 2 botones existen tras ensurePanelContent');
  ok(!!rb && rb.tieneListener('click'), 'viewRaidsBtn TIENE listener de click');
  const panelStrikes = doc.getElementById('strikeTrackerPanel');
  const antes = panelStrikes.oculto();
  sb.dispatch('click');
  ok(panelStrikes.oculto() !== antes, 'click en "Strikes" cambia el panel',
     'el panel no cambio: el control no prueba lo que dice probar');
  ok(!!rb && rb._cls.has('btn--ghost'), 'el resaltado del boton destino cambia');
}

/* ═════════════════════════════════════════════════════════════════════════
   1. EL DEFECTO. El camino que usa Pablo cuando llega desde Strikes.
   ═════════════════════════════════════════════════════════════════════════ */
section('CASO REAL: entrar por Strikes -> click en "Raids" del strip de Strikes');
{
  const { sandbox, doc, llamadas } = montar();
  sandbox.StrikeTracker.activate();
  const srb = doc.getElementById('strikeViewRaidsBtn');
  ok(!!srb, 'el strip de Strikes tiene su boton "Raids"');
  srb.dispatch('click');
  ok(!doc.getElementById('raidTrackerPanel').oculto(), 'el panel RAIDS queda delante (la navegacion funciono)');
  const rb = doc.getElementById('viewRaidsBtn');
  ok(!!rb, 'el panel Raids tiene sus botones inyectados');
  ok(llamadas.includes('RaidTracker.refresh') && !llamadas.includes('RaidTracker.activate'),
     'el puente es refresh(), no activate() (por eso no cablea)');
  ok(!!rb && rb.tieneListener('click'),
     'viewRaidsBtn TIENE listener de click',
     'EL BOTON ESTA MUERTO: ensurePanelContent() lo creo y wireViewToggle() nunca corrio, porque solo corre desde activate()');
}

/* ═════════════════════════════════════════════════════════════════════════
   2. EL CONTRASTE: el defecto es el CAMINO, no los ids.
   ═════════════════════════════════════════════════════════════════════════ */
section('CONTRASTE: el mismo boton, pero entrando antes por Raids');
{
  const { sandbox, doc } = montar();
  sandbox.RaidTracker.activate();
  sandbox.StrikeTracker.activate();
  doc.getElementById('strikeViewRaidsBtn').dispatch('click');
  const rb = doc.getElementById('viewRaidsBtn');
  ok(!!rb && rb.tieneListener('click'),
     'el MISMO boton SI queda cableado si antes se entro por Raids',
     'el boton no existe ni siquiera: entonces el defecto serian los ids');
}

/* ═════════════════════════════════════════════════════════════════════════
   3. LA AFIRMACION "EL F5 LO ARREGLA", medida, CORREGIDA y ahora cerrada.
      Antes del fix: recargar sobre Strikes dejaba el boton MUERTO igual, porque
      activate() de Raids nunca corria. O sea que el F5 no era un workaround
      fiable sino uno que dependia de la ruta. Con el fix, las dos rutas
      cablean, asi que esto ya no depende de donde caiga la recarga.
   ═════════════════════════════════════════════════════════════════════════ */
section('F5: las DOS rutas de recarga dejan el boton cableado');
{
  const a = montar();
  a.sandbox.StrikeTracker.activate();                       // router: #/account/strikes
  a.doc.getElementById('strikeViewRaidsBtn').dispatch('click');
  const rbA = a.doc.getElementById('viewRaidsBtn');
  ok(!!rbA && rbA.tieneListener('click'),
     'F5 sobre la ruta de Strikes: el boton queda cableado (ya no depende de la ruta)');

  const b = montar();
  b.sandbox.RaidTracker.activate();                         // router: #/account/raids
  const rbB = b.doc.getElementById('viewRaidsBtn');
  ok(!!rbB && rbB.tieneListener('click'), 'F5 sobre la ruta de Raids: el boton queda cableado');
}

/* ═════════════════════════════════════════════════════════════════════════
   3b. LA IDEMPOTENCIA. El fix mueve el cableado a ensurePanelContent(), que
       corre en CADA loadRaidData(). Sin el flag, cada recarga pegaria un par
       de listeners y un click dispararia N veces. Esto es lo que hace
       '_viewToggleWired' y no se deduce del caso real: hay que forzarlo.
   ═════════════════════════════════════════════════════════════════════════ */
section('IDEMPOTENCIA: recargar 5 veces no multiplica los listeners');
{
  const { sandbox, doc } = montar();
  for (let i = 0; i < 5; i++) {
    sandbox.RaidTracker.refresh();    // lo que corre en cada loadRaidData()
    sandbox.RaidTracker.activate();
  }
  const rb = doc.getElementById('viewRaidsBtn');
  const sb = doc.getElementById('viewStrikesBtn');
  ok(!!rb && rb.nListeners() === 1, 'viewRaidsBtn tiene EXACTAMENTE 1 listener tras 5 recargas',
     'tiene ' + (rb ? rb.nListeners() : '?') + ': un click dispararia N veces');
  ok(!!sb && sb.nListeners() === 1, 'viewStrikesBtn tiene EXACTAMENTE 1 listener tras 5 recargas',
     'tiene ' + (sb ? sb.nListeners() : '?') + ': un click dispararia N veces');
}

/* ═════════════════════════════════════════════════════════════════════════
   3c. EL BUG DENTRO DEL FIX, encontrado porque hb78 se rompio al aplicar la
       primera version. Con un flag de SCOPE DE MODULO ("ya cableado"), si
       ensurePanelContent() re-inyecta el panel aparecen botones NUEVOS que
       heredan un "ya cableado" falso y quedan MUERTOS: el bug original
       regresaba, y solo en el caso de reconstruir el panel, que es el mas
       dificil de ver. El flag tiene que vivir en el ELEMENTO.
   ═════════════════════════════════════════════════════════════════════════ */
section('RECONSTRUCCION: si el panel se rehaga, los botones nuevos se cablean');
{
  const { sandbox, doc } = montar();
  sandbox.RaidTracker.activate();
  ok(doc.getElementById('viewRaidsBtn').tieneListener('click'), 'el primer boton quedo cableado');

  // el panel se rehaga: ensurePanelContent() vuelve a inyectar y los botones
  // son OTROS objetos, sin la marca del anterior.
  sandbox.RaidTracker.__reinyectar();
  const nuevo = doc.getElementById('viewRaidsBtn');
  ok(nuevo !== null, 'tras la re-inyeccion existe un boton nuevo');
  ok(nuevo && nuevo.tieneListener('click'),
     'el boton NUEVO queda cableado (el flag va en el elemento, no en el modulo)',
     'heredo un "ya cableado" falso y quedo muerto: es el bug T12 de vuelta');
  ok(nuevo && nuevo.nListeners() === 1, 'y con 1 solo listener, no 2');
}

/* ═════════════════════════════════════════════════════════════════════════
   4. LA FORMA. Los 2 cables y el resaltado estan duplicados, y el segundo par
      no escribe la preferencia ni cambia las clases. No es un bug: es la deuda
      que T12-b borra. Se deja MEDIDO, no corregido aqui.
   ═════════════════════════════════════════════════════════════════════════ */
section('FORMA: los 2 strips son copias con 4 ids distintos');
{
  const raid = fs.readFileSync(path.join(JS, 'raid-tracker.js'), 'utf8');
  const strike = fs.readFileSync(path.join(JS, 'strike-tracker.js'), 'utf8');
  const cableA = cuerpo(raid, 'function wireViewToggle(');
  const cableB = cuerpo(strike, 'function wireStrikeViewToggle(');
  ok(!/viewRaidsBtn/.test(cableB) || !/strikeViewRaidsBtn/.test(cableA),
     'los 2 cables no comparten ningun id (4 ids, 0 en comun)');
  ok(!/prefSet|prefGet/.test(cableB),
     'wireStrikeViewToggle NO lee ni escribe la preferencia (medido: T12-b lo borra)');
  ok(!/classList/.test(cableB),
     'wireStrikeViewToggle NO cambia las clases: el resaltado no se mueve en ese strip (T12-c)');
}

console.log(`\nTOTAL: ${pass + fail} aserciones, ${fail} FAIL`);
console.log(fail === 0 ? 'SUITE OK' : 'SUITE FAIL');
process.exit(fail === 0 ? 0 : 1);
