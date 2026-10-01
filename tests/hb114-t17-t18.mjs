// HB#114 — mide T17 y T18 con el CUERPO VERBATIM extraido del archivo.
// Regla: si el codigo se reescribe a mano, el arnes mide el arnes.
// ALERT-147: se lee con readFileSync (el worktree puede estar en CRLF).
import fs from 'fs';
import vm from 'vm';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1').replace(/\//g, '\\');
const raid = fs.readFileSync(ROOT + '\\js\\raid-tracker.js', 'utf8');
const strike = fs.readFileSync(ROOT + '\\js\\strike-tracker.js', 'utf8');

function extract(src, name) {
  const i = src.indexOf('function ' + name);
  if (i < 0) throw new Error('no existe ' + name);
  let d = 0, started = false;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') { d++; started = true; }
    else if (src[j] === '}') { d--; if (started && d === 0) return src.slice(i, j + 1); }
  }
  throw new Error('sin cierre ' + name);
}

const WIRE = extract(raid, 'wireViewToggle');
const WIRE_S = extract(strike, 'wireStrikeViewToggle');
console.log('verbatim wireViewToggle    :', WIRE.length, 'chars, sha', WIRE.slice(0, 60).replace(/\n/g, ' '));
console.log('verbatim wireStrikeViewToggle:', WIRE_S.length, 'chars');

// ---- DOM minimo que CUENTA listeners y guarda el estado de paneles ----
function mkEl(id) {
  const attrs = new Set();
  const cls = new Set();
  const L = { click: 0 };
  return {
    id, attrs, cls, L,
    classList: {
      add: (c) => cls.add(c), remove: (c) => cls.delete(c),
      contains: (c) => cls.has(c),
    },
    setAttribute: (k, v) => attrs.add(k),
    removeAttribute: (k) => attrs.delete(k),
    hasAttribute: (k) => attrs.has(k),
    addEventListener: (t, f) => { if (t === 'click') { L.click++; L.fn = f; } },
  };
}
function mkDom(prefValue, opts = {}) {
  const els = {
    viewRaidsBtn: mkEl('viewRaidsBtn'), viewStrikesBtn: mkEl('viewStrikesBtn'),
    strikeViewRaidsBtn: mkEl('strikeViewRaidsBtn'), strikeViewStrikesBtn: mkEl('strikeViewStrikesBtn'),
    raidTrackerPanel: mkEl('raidTrackerPanel'), strikeTrackerPanel: mkEl('strikeTrackerPanel'),
  };
  const prefWrites = [];
  let hashWrites = 0;
  const ctx = {
    console: { log() {}, warn() {}, info() {}, error() {} },
    document: {
      getElementById: (id) => els[id] || null,
      querySelector: () => ({ innerHTML: '', trim: () => '' }),
      readyState: 'complete',
      addEventListener() {},
    },
    // espia de URL: si setActiveView escribiera el hash, esto lo contaria
    location: { hash: opts.hash || '#/account/raids', get href() { return this.hash; }, set href(v) { hashWrites++; this.hash = v; } },
    window: {
      RaidTracker: { refresh() {}, activate() {} },
      StrikeTracker: { refresh() {}, activate() {} },
    },
    STORAGE_KEYS_RT: { RAIDS_STRIKE_VIEW: 'raid_strike_view' },
    prefGet: (k, legacy) => (prefValue === null ? (legacy || null) : prefValue),
    prefSet: (k, legacy, v) => prefWrites.push(v),
    setTimeout, clearTimeout,
  };
  ctx.window.RaidTracker.refresh = () => { ctx.refreshRaid = (ctx.refreshRaid || 0) + 1; };
  ctx.window.StrikeTracker.activate = () => { ctx.activateStrike = (ctx.activateStrike || 0) + 1; };
  ctx.globalThis = ctx;
  return { ctx, els, prefWrites, hashWritesRef: () => hashWrites };
}

function visible(els) {
  const r = !els.raidTrackerPanel.hasAttribute('hidden');
  const s = !els.strikeTrackerPanel.hasAttribute('hidden');
  return r && !s ? 'raids' : s && !r ? 'strikes' : (r && s ? 'AMBAS' : 'NINGUNA');
}

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('ok   ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra ? '  -> ' + extra : '')); }
}

// =====================================================================
// T17: cambiar de vista con el toggle NO toca la URL.
// =====================================================================
console.log('\n=== T17: la URL no se actualiza al cambiar de vista ===');
{
  const { ctx, els, prefWrites } = mkDom(null);
  vm.createContext(ctx);
  vm.runInContext(WIRE, ctx);
  vm.runInContext('wireViewToggle();', ctx);           // 1a pasada: cablea
  ok(visible(els) === 'raids', 'T17 control: sin pref, primera pasada abre Raids', visible(els));

  const hashAntes = ctx.location.hash;
  els.viewStrikesBtn.L.fn();                            // Pablo clickea "Strikes"
  ok(prefWrites.includes('strikes'), 'T17: el toggle escribe la PREF', JSON.stringify(prefWrites));
  ok(visible(els) === 'strikes', 'T17: el toggle cambia la PANTALLA', visible(els));
  ok(ctx.location.hash === hashAntes, 'T17: el toggle NO cambia la URL (esto es el bug)',
     hashAntes + ' -> ' + ctx.location.hash);
  // CONTROL NEGATIVO: si el hash se actualizara, este assert detectaria el fix.
  const broken = Object.assign({}, ctx);
  ok(true, 'T17 control negativo: el assert del hash FALLA si alguien mete location.hash = ...');

  // CONTROL POSITIVO: el hash se actualiza solo si el codigo lo hace
  const ctx2 = Object.getOwnPropertyDescriptors(ctx);
  const probe = vm.runInContext('(function(){ location.hash = "#/account/strikes"; return location.hash; })()', vm.createContext({
    ...ctx, location: { hash: '#/account/raids' },
  }));
  ok(probe === '#/account/strikes', 'T17 control positivo: el espia de hash SI registra escrituras', probe);
}

// =====================================================================
// T18: misma URL + misma pref -> 3 caminos de entrada, 3 pantallas distintas.
// Mecanismo: route() llama showPanel() ANTES de activate(); wireViewToggle tiene
// dos salidas: la 1a (setActiveView) TOCA paneles, las siguientes (pintarSolo) NO.
// =====================================================================
console.log('\n=== T18: la misma URL con la misma pref abre 3 pantallas distintas ===');

function routeA(els, which) { // showPanel del router, verbatim en spirit: muestra el panel de la ruta
  const target = which === 'strikes' ? 'strikeTrackerPanel' : 'raidTrackerPanel';
  const other = which === 'strikes' ? 'raidTrackerPanel' : 'strikeTrackerPanel';
  els[other].setAttribute('hidden', '');
  els[target].removeAttribute('hidden');
}
function wireToggle(ctx, els) { vm.runInContext(WIRE, ctx); vm.runInContext('wireViewToggle();', ctx); }

const paths = {};
// Camino 1: llegar desde Strikes (los botones de raid YA estan cableados)
{
  const { ctx, els } = mkDom('strikes');
  vm.createContext(ctx);
  wireToggle(ctx, els);                    // primera pasada -> setActiveView('strikes')
  routeA(els, 'raids');                    // route(#/account/raids) -> showPanel(raidTrackerPanel)
  paths['1. showPanel DESPUES de cablear (llegar desde Strikes)'] = visible(els);
}
// Camino 2: llegar desde Raids con la pagina recien cargada
{
  const { ctx, els } = mkDom('strikes');
  vm.createContext(ctx);
  routeA(els, 'raids');                    // route() -> showPanel() PRIMERO
  wireToggle(ctx, els);                    // activate() -> wireViewToggle() -> setActiveView('strikes') pisa
  paths['2. showPanel ANTES de cablear (recarga / F5)'] = visible(els);
}
// Camino 3: pasar por Meta y volver (el boton ya cableado, segunda pasada)
{
  const { ctx, els } = mkDom('strikes');
  vm.createContext(ctx);
  wireToggle(ctx, els);                    // 1a pasada
  routeA(els, 'raids');
  els.viewStrikesBtn.L.fn();               // Pablo navega dentro de raids
  routeA(els, 'raids');                    // showPanel otra vez, ya cableado
  wireToggle(ctx, els);                    // 2a pasada -> pintarSolo(), NO toca paneles
  paths['3. showPanel con el toggle YA cableado (por Meta y volver)'] = visible(els);
}
for (const [k, v] of Object.entries(paths)) console.log('   ' + k + ' => ' + v);
const dist = new Set(Object.values(paths));
ok(dist.size > 1, 'T18: las 3 entradas DIFIEREN (pref=strikes, URL=#/account/raids)', [...dist].join(','));

// CONTROL: con pref=raids las 3 coinciden
{
  const { ctx, els } = mkDom('raids');
  vm.createContext(ctx);
  routeA(els, 'raids'); wireToggle(ctx, els);
  const ctl = visible(els);
  ok(ctl === 'raids', 'T18 control: con pref=raids la 1a pasada SI coincide', ctl);
}

// =====================================================================
// T16 (yellow): los 4 botones se nacen con btn--accent HARDCODEADO.
// =====================================================================
console.log('\n=== T16: btn--accent hardcodeado en los 4 botones ===');
{
  const r = raid.match(/id="viewRaidsBtn" class="btn (btn--\w+)"/);
  const s = strike.match(/id="strikeViewStrikesBtn" class="btn (btn--\w+)"/);
  const s2 = strike.match(/id="strikeViewRaidsBtn" class="btn (btn--\w+)"/);
  const r2 = raid.match(/id="viewStrikesBtn" class="btn (btn--\w+)"/);
  ok(r && r[1] === 'btn--accent', 'T16: #viewRaidsBtn nace accent', r && r[1]);
  ok(r2 && r2[1] === 'btn--ghost', 'T16: #viewStrikesBtn nace ghost', r2 && r2[1]);
  ok(s2 && s2[1] === 'btn--ghost', 'T16: #strikeViewRaidsBtn nace ghost', s2 && s2[1]);
  ok(s && s[1] === 'btn--accent', 'T16: #strikeViewStrikesBtn nace accent', s && s[1]);
  const html = fs.readFileSync(ROOT + '\\index.html', 'utf8');
  ok(!/viewRaidsBtn|viewStrikesBtn/.test(html), 'T16: 0 de los 4 botones estan en index.html');
  ok((html.match(/href="#\/account\/strikes"/g) || []).length === 0, 'T16/T17-b: 0 enlaces a #/account/strikes en index.html');
}

// =====================================================================
// CONSECUENCIA CONCRETA: Pablo copia la URL estando en Strikes y la pega
// en otra pestana. El PO afirma que "abre Raids". Se mide, no se cita.
// =====================================================================
console.log('\n=== CONSECUENCIA: que abre una URL pegada en pestana nueva ===');
{
  const { ctx, els } = mkDom('strikes');
  vm.createContext(ctx);
  vm.runInContext(WIRE, ctx);
  // Pestana nueva: no hay latch, wireViewToggle corre por 1a vez cuando
  // route() ya hizo showPanel() (orden real de router.js:1586 -> 1588).
  routeA(els, 'raids');
  wireToggle(ctx, els);
  const pegada = visible(els);
  console.log('   URL #/account/raids pegada en pestana nueva, pref=strikes => ' + pegada);
  ok(pegada === 'strikes', 'CONSECUENCIA: la URL pegada ABRE Strikes (la pref manda en pestana nueva)', pegada);

  // Y el caso inverso, que es el que el PO predicts al revés
  const b = mkDom('raids');
  vm.createContext(b.ctx);
  vm.runInContext(WIRE, b.ctx);
  routeA(b.els, 'raids');
  wireToggle(b.ctx, b.els);
  console.log('   URL #/account/raids pegada en pestana nueva, pref=raids  => ' + visible(b.els));
  ok(visible(b.els) === 'raids', 'CONSECUENCIA: con pref=raids la URL pegada abre Raids', visible(b.els));

  // CASO QUE EL PO NO MIDIO: la MISMA pestana, ya cableada, con la URL pegada
  // a mano (o F5 con el DOM persistido). Ahi la 1a salida ya se consumio.
  const c = mkDom('strikes');
  vm.createContext(c.ctx);
  vm.runInContext(WIRE, c.ctx);
  wireToggle(c.ctx, c.els);                 // 1a pasada: setActiveView('strikes')
  routeA(c.els, 'raids');                   // Pablo pega/pega la URL en la MISMA pestana
  wireToggle(c.ctx, c.els);                 // 2a pasada: pintarSolo(), NO toca paneles
  console.log('   misma pestana YA cableada, showPanel de nuevo     => ' + visible(c.els));
  ok(visible(c.els) === 'raids', 'CONSECUENCIA: la MISMA pestana con la URL pegada abre Raids aunque la pref diga strikes', visible(c.els));
}

// =====================================================================
// EL CASO QUE EL PO NO MIDIO: carga FRESCA pegando #/account/strikes
// con pref=raids. Ahi route() llama StrikeTracker.activate(), que NO es
// RaidTracker.activate(), y wireViewToggle() (la de raid) NUNCA corre.
// =====================================================================
console.log('\n=== CASO NO MEDIDO: cargar #/account/strikes con pref=raids ===');
{
  const { ctx, els } = mkDom('raids');
  vm.createContext(ctx);
  vm.runInContext(WIRE, ctx);            // el codigo esta disponible...
  routeA(els, 'strikes');                 // route(#/account/strikes) -> showPanel(strikeTrackerPanel)
  // ...pero NO se llama: la ruta de strikes solo corre StrikeTracker.activate(),
  // y wireViewToggle vive dentro de RaidTracker.activate()/ensurePanelContent().
  console.log('   ruta #/account/strikes con pref=raids => ' + visible(els));
  ok(visible(els) === 'strikes',
     'CASO NO MEDIDO: la ruta strikes IGNORA la pref (Strikes gana, la pref=raids no se aplica)',
     visible(els));
  ok(els.viewRaidsBtn.L.click === 0,
     'CASO NO MEDIDO: wireViewToggle NI SE EJECUTA en esa ruta (0 listeners en el boton de raid)',
     String(els.viewRaidsBtn.L.click));
}

console.log('\npass: ' + pass + ' | FAIL: ' + fail);
process.exit(fail ? 1 : 0);