// HB#111 - mide T14 y T15 de la ronda 35 del PO, sobre el codigo REAL de
// origin/main, no sobre fixtures.
//
// T14: wireStrikeViewToggle() se llama desde activate() SIN guarda
//       __viewToggleWired, y activate() ahora corre mas de una vez porque T13
//       (1e5aedb) bajo el latch. -> N listeners sobre los mismos botones.
// T15: el toggle de Strikes mueve el DOM y NO escribe la pref. -> lo que Pablo
//       eligio en el panel de Strikes no sobrevive al F5.
//
// REGLA: se ejecuta el CUERPO VERBATIM de las dos funciones contra un DOM
// minimo que cuenta listeners. Un arnes que modela el DOM en vez de correr el
// codigo no mide el codigo (ALERT-136).
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const ROOT = path.resolve(process.argv[2] || '.');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const rt = rd('js/raid-tracker.js');
const st = rd('js/strike-tracker.js');

let fails = 0, pass = 0;
const chk = (name, cond, extra) => {
  if (cond) pass++; else fails++;
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (extra ? '  -> ' + extra : ''));
};

// ---- extractor: devuelve la funcion completa por balance de llaves ----------
function extraer(src, re, que) {
  const i = src.search(re);
  if (i < 0) return null;
  let d = 0;
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); }
  }
  console.error('EXTRACCION SIN CIERRE: ' + que);
  process.exit(2);
}

// ---- DOM minimo que CUENTA listeners ---------------------------------------
function mkEl(id) {
  const cls = new Set();
  return {
    id,
    _h: [],                       // handlers: uno por addEventListener
    _attrs: {},
    listeners() { return this._h.length; },
    click() { return this._h.map(h => h()); },
    addEventListener(t, h) { this._h.push(h); },
    removeEventListener() {},
    setAttribute(k, v) { this._attrs[k] = v; },
    removeAttribute(k) { delete this._attrs[k]; },
    getAttribute(k) { return this._attrs[k]; },
    classList: { add: c => cls.add(c), remove: c => cls.delete(c), has: c => cls.has(c) },
    _cls: cls,
  };
}

// ---- pref falsa, observable -----------------------------------------------
function mkCtx(cuerpo, els, pref, extra) {
  const document = { getElementById: id => els[id] || null };
  const win = Object.assign({ document }, extra || {});
  const ctx = vm.createContext(Object.assign({
    window: win, document, console: { log() {}, debug() {}, info() {} },
    prefGet: (k, l) => (pref[k] !== undefined ? pref[k] : pref[l]),
    prefSet: (k, l, v) => { pref[k] = v; pref[l] = v; },
    STORAGE_KEYS_RT: { RAIDS_STRIKE_VIEW: 'gn:raids:strike:view' },
  }, extra || {}));
  ctx.globalThis = ctx;
  vm.runInContext('var ' + cuerpo + '\n;__f = ' + cuerpo.replace(/^function \w+\(\)/, function () { return '__f'; }) + ';', ctx);
  return ctx;
}

// Corre un cuerpo de funcion y devuelve la funcion evaluada.
function correr(cuerpo, els, pref, extra) {
  const ctx = vm.createContext(Object.assign({
    window: Object.assign({}, extra && extra.window),
    document: { getElementById: id => els[id] || null },
    console: { log() {}, debug() {}, info() {} },
    prefGet: (k, l) => (pref[k] !== undefined ? pref[k] : pref[l]),
    prefSet: (k, l, v) => { pref[k] = v; pref[l] = v; },
    STORAGE_KEYS_RT: { RAIDS_STRIKE_VIEW: 'gn:raids:strike:view' },
  }, extra || {}));
  ctx.window = ctx.window || {};
  ctx.window.document = ctx.document;
  ctx.window.RaidTracker = (extra && extra.window && extra.window.RaidTracker) || {};
  ctx.window.StrikeTracker = (extra && extra.window && extra.window.StrikeTracker) || {};
  // define la funcion sin llamarla, y expone un puntero
  const nombre = cuerpo.match(/function (\w+)\(\)/)[1];
  vm.runInContext(cuerpo + '\n;__fn = ' + nombre + ';', ctx);
  return ctx.__fn;
}

const wRaidSrc = extraer(rt, /function wireViewToggle\(\)/, 'wireViewToggle');
const wStrikeSrc = extraer(st, /function wireStrikeViewToggle\(\)/, 'wireStrikeViewToggle');

// =============================================================================
console.log('=== 0. CONTROLES DEL ARNES (un criterio imposible da 0) ===');
chk('el extractor NO encuentra una funcion inexistente (control negativo)',
    extraer(rt, /function NO_EXISTE_9F3A\(\)/, 'x') === null);
chk('el extractor SI balancea hasta el cierre (control positivo)',
    !!wRaidSrc && wRaidSrc.endsWith('}') && /addEventListener/.test(wRaidSrc));
chk('wStrikeSrc TIENE listeners (si no, T14 daria 0 por falta de cableado)',
    (wStrikeSrc.match(/addEventListener/g) || []).length >= 2);
chk('las 4 personas de la ronda 35 existen en el codigo real',
    /function wireViewToggle\(\)/.test(rt) && /function wireStrikeViewToggle\(\)/.test(st));

// =============================================================================
console.log('\n=== 1. T14: wireStrikeViewToggle() sin guarda -> N listeners ===');
function elsStrikes() {
  return {
    strikeViewRaidsBtn: mkEl('strikeViewRaidsBtn'),
    strikeViewStrikesBtn: mkEl('strikeViewStrikesBtn'),
    raidTrackerPanel: mkEl('raidTrackerPanel'),
    strikeTrackerPanel: mkEl('strikeTrackerPanel'),
  };
}
const pref14 = {};
const f14 = correr(wStrikeSrc, elsStrikes(), pref14, {});
const e14 = elsStrikes();
const f14b = correr(wStrikeSrc, e14, pref14, {});
for (const n of [1, 2, 3]) {
  const els = elsStrikes();
  const f = correr(wStrikeSrc, els, pref14, {});
  for (let i = 0; i < n; i++) f();
  const lR = els.strikeViewRaidsBtn.listeners();
  const lS = els.strikeViewStrikesBtn.listeners();
  console.log('    ' + n + ' activate() -> ' + lR + '/' + lS + ' listeners');
  if (n === 1) chk('T14: con 1 llamada hay exactamente 1 listener (base del conteo)', lR === 1 && lS === 1, lR + '/' + lS);
  if (n === 3) chk('T14 HOY: con 3 llamadas hay 3 listeners (el bug)', lR === 3 && lS === 3, lR + '/' + lS);
}
// CONTROL: el mismo arnes contra la version CON guarda, inyectada en el cuerpo.
const conGuarda = wStrikeSrc.replace(
  /(var\s+strikesBtn\s*=\s*document\.getElementById\('strikeViewStrikesBtn'\);)/,
  "$1\n    if (raidsBtn.__viewToggleWired) { return; }\n    raidsBtn.__viewToggleWired = true;"
);
chk('CONTROL: la inyeccion de la guarda SI ocurrio (si no, el control no mide)',
    /__viewToggleWired/.test(conGuarda));
{
  const els = elsStrikes();
  const f = correr(conGuarda, els, pref14, {});
  for (let i = 0; i < 5; i++) f();
  chk('CONTROL: con la guarda, 5 llamadas siguen dando 1 listener',
      els.strikeViewRaidsBtn.listeners() === 1 && els.strikeViewStrikesBtn.listeners() === 1,
      els.strikeViewRaidsBtn.listeners() + '/' + els.strikeViewStrikesBtn.listeners());
}
// El guard de raid existe y es el patron (T14 propone copiarlo).
chk('el guard de raid __viewToggleWired EXISTE en origin/main (T14 no lo inventa)',
    /if \(raidsBtn\.__viewToggleWired\)/.test(rt));
chk('y wireStrikeViewToggle NO lo tiene (T14 es real)', !/__viewToggleWired/.test(wStrikeSrc));

// =============================================================================
console.log('\n=== 2. T15: el toggle de Strikes no persiste, y el F5 lo traiciona ===');
const prefT15 = { 'gn:raids:strike:view': 'raids' };
// CONTROLO: lo que el PO afirma que el estado inicial produce.
{
  const els = {
    strikeViewRaidsBtn: mkEl('strikeViewRaidsBtn'),
    strikeViewStrikesBtn: mkEl('strikeViewStrikesBtn'),
    raidTrackerPanel: mkEl('raidTrackerPanel'),
    strikeTrackerPanel: mkEl('strikeTrackerPanel'),
  };
  const f = correr(wStrikeSrc, els, prefT15, {});
  f();
  chk('CONTROL: el estado inicial es consistente (pref=raids, raids visible)',
      prefT15['gn:raids:strike:view'] === 'raids' && els.raidTrackerPanel.getAttribute('hidden') === undefined);
}
// CASO REAL: Pablo estaba en RAIDS, hace 2 clicks en el strip de Strikes.
const elsReal = {
  strikeViewRaidsBtn: mkEl('strikeViewRaidsBtn'),
  strikeViewStrikesBtn: mkEl('strikeViewStrikesBtn'),
  raidTrackerPanel: mkEl('raidTrackerPanel'),
  strikeTrackerPanel: mkEl('strikeTrackerPanel'),
};
const refreshes = [];
const fReal = correr(wStrikeSrc, elsReal, prefT15, {
  window: {
    RaidTracker: { refresh: () => refreshes.push('raid') },
    StrikeTracker: { refresh: () => refreshes.push('strike') },
  },
});
fReal();
elsReal.strikeViewStrikesBtn.click();   // Pablo elige Strikes
chk('CASO REAL: la pantalla visible es Strikes',
    elsReal.raidTrackerPanel.getAttribute('hidden') !== undefined &&
    elsReal.strikeTrackerPanel.getAttribute('hidden') === undefined);
chk('T15 HOY: la pref SIGUE en raids (no se persistio la eleccion)', prefT15['gn:raids:strike:view'] === 'raids',
    'pref=' + prefT15['gn:raids:strike:view']);
chk('el click SI refresco el modulo (no es un boton muerto)', refreshes.length === 1, JSON.stringify(refreshes));

// EL F5: recarga la pagina -> wireViewToggle() corre de nuevo con la pref.
const elsF5 = {
  viewRaidsBtn: mkEl('viewRaidsBtn'),
  viewStrikesBtn: mkEl('viewStrikesBtn'),
  raidTrackerPanel: elsReal.raidTrackerPanel,
  strikeTrackerPanel: elsReal.strikeTrackerPanel,
};
const f5 = correr(wRaidSrc, elsF5, prefT15, {
  window: {
    RaidTracker: { refresh: () => {} },
    StrikeTracker: { activate: () => {} },
  },
});
f5();
chk('CONSECUENCIA: tras el F5 se abre RAIDS aunque Pablo estaba viendo STRIKES',
    elsF5.raidsPanel_visible === true || elsF5.raidTrackerPanel.getAttribute('hidden') === undefined,
    'raidTrackerPanel hidden=' + elsF5.raidTrackerPanel.getAttribute('hidden'));
chk('y el boton de Raids queda marcado (Pablo ve un estado coherente consigo mismo)',
    elsF5.viewRaidsBtn._cls.has('btn--accent'));

// CONTROL POSITIVO del F5: si la pref dice strikes, wireViewToggle abre Strikes.
{
  const prefB = { 'gn:raids:strike:view': 'strikes' };
  const elsB = {
    viewRaidsBtn: mkEl('viewRaidsBtn'), viewStrikesBtn: mkEl('viewStrikesBtn'),
    raidTrackerPanel: mkEl('raidTrackerPanel'), strikeTrackerPanel: mkEl('strikeTrackerPanel'),
  };
  const fb = correr(wRaidSrc, elsB, prefB, { window: { RaidTracker: { refresh() {} }, StrikeTracker: { activate() {} } } });
  fb();
  chk('CONTROL: con pref=strikes el F5 SI abre Strikes (el F5 honra la pref)',
      elsB.strikeTrackerPanel.getAttribute('hidden') === undefined &&
      elsB.viewStrikesBtn._cls.has('btn--accent'));
}
// Y si la pref se escribiera, el caso real daria consistente.
{
  const prefC = { 'gn:raids:strike:view': 'raids' };
  const elsC = {
    strikeViewRaidsBtn: mkEl('strikeViewRaidsBtn'), strikeViewStrikesBtn: mkEl('strikeViewStrikesBtn'),
    raidTrackerPanel: mkEl('raidTrackerPanel'), strikeTrackerPanel: mkEl('strikeTrackerPanel'),
  };
  const fc = correr(wStrikeSrc, elsC, prefC, { window: { StrikeTracker: { refresh() {} } } });
  fc();
  elsC.strikeViewStrikesBtn.click();
  prefC['gn:raids:strike:view'] = 'strikes';   // lo que T15-a haria
  const elsD = {
    viewRaidsBtn: mkEl('viewRaidsBtn'), viewStrikesBtn: mkEl('viewStrikesBtn'),
    raidTrackerPanel: mkEl('raidTrackerPanel'), strikeTrackerPanel: mkEl('strikeTrackerPanel'),
  };
  const fd = correr(wRaidSrc, elsD, prefC, { window: { RaidTracker: { refresh() {} }, StrikeTracker: { activate() {} } } });
  fd();
  chk('CONTROL: con T15-a aplicado, el F5 abre Strikes (el arreglo cierra el caso)',
      elsD.strikeTrackerPanel.getAttribute('hidden') === undefined);
}

console.log('\n=== 3. LO QUE EL PO NO AFIRMA (no se mide, se anota) ===');
chk('la pref solo se escribe en raid-tracker.js (0 escrituras en strike-tracker.js)',
    !/prefSet\s*\(/.test(st));
chk('strike-tracker.js no tiene acceso a la pref (prefGet/prefSet/STORAGE_KEYS = 0)',
    !/prefGet|prefSet|STORAGE_KEYS/.test(st));

console.log('\nRESULTADO: ' + pass + ' pass, ' + fails + ' FAIL');
process.exit(fails ? 1 : 0);
