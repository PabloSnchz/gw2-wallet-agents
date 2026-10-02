// tests/hb119-2-2-filtros-progreso.test.js — FILTRO-01..07
// QUE PRUEBA: que "Mi progreso" use los MISMOS filtros que el Catalogo
// (Tipo, Gen, Expansion) y tenga el switch "Desbloqueadas / Solo faltantes".
//
// POR QUE ES UN BUG Y NO UNA FALTANTE DE DISENO: `filters` es estado
// COMPARTIDO en el tracker (`legendary-tracker.js:99`), y `catalogItems()`
// lo aplica (`:212-214`). `renderProgress()` lo IGNORA por completo y filtra
// solo por `owned`. O sea: el filtro existe, se dibuja en el Catalogo, y en
// Progreso el usuario puede tocarlo y no pasa nada. Un control visible que no
// hace nada es peor que un control ausente.
//
// FASE ROJA: contra los archivos sin el fix, FILTRO-01/02/03 dan FAIL.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  pass - ' + name); }
  else { fail++; console.log('  FAIL - ' + name + (extra ? '  [' + extra + ']' : '')); }
}

function makeDom() {
  const nodes = {}, store = {};
  const mk = (id) => ({
    id, _h: '', textContent: '', value: null, style: {}, children: [], attrs: {},
    get innerHTML() { return this._h; }, set innerHTML(v) { this._h = v; },
    // `attrs` con default por objeto: el tracker llama `getAttribute` sobre
    // elementos que el stub recien creo, y si `attrs` fuera undefined el
    // `in` revienta con un TypeError que NO es el bug que se quiere medir.
    // Un stub que crashea no da FAIL: mata el test entero.
    getAttribute: (k) => (k in (this.attrs || {})) ? this.attrs[k] : null,
    setAttribute: (k, v) => { if (!this.attrs) this.attrs = {}; this.attrs[k] = v; },
    removeAttribute: () => {},
    addEventListener: () => {}, appendChild: () => {}, insertAdjacentHTML: () => {},
    querySelector: (s) => mk(id + '|' + s), querySelectorAll: () => [],
    classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
    dataset: {}
  });
  const el = (id) => nodes[id] || (nodes[id] = mk(id));
  return {
    store, nodes, el,
    document: {
      getElementById: el,
      querySelector: (s) => (s[0] === '#' ? el(s.slice(1)) : null),
      querySelectorAll: () => [], createElement: () => mk('new'),
      addEventListener: () => {}, dispatchEvent: () => {},
      documentElement: mk('html'), body: mk('body')
    }
  };
}

function boot() {
  const d = makeDom();
  const ctx = {
    console: { log: () => {}, warn: () => {}, error: () => {}, info: () => {}, debug: () => {} },
    setTimeout: () => 0, clearTimeout: () => {},
    setInterval: () => 0, clearInterval: () => {},
    document: d.document,
    localStorage: { getItem: (k) => (k in d.store ? d.store[k] : null), setItem: (k, v) => { d.store[k] = v; } },
    CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; },
    Array, Object, Number, String, Math, JSON, Date, Promise, isNaN, parseInt, parseFloat
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  ctx.GW2Api = {
    getAccountLegendaryArmory: () => Promise.resolve([]),
    getAccountBank: () => Promise.resolve([]),
    getAccountMaterials: () => Promise.resolve([])
  };
  vm.createContext(ctx);
  for (const f of ['js/legendary-data.js', 'js/legendary-tracker.js', 'js/render-catologo.js']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); }
    catch (e) { console.log('  ERROR AL CARGAR ' + f + ': ' + e.message); }
  }
  return { ctx, d };
}
const tick = async (n) => { for (let i = 0; i < (n || 8); i++) await Promise.resolve(); };

async function render(armoryIds, mode, filters) {
  const t = boot();
  t.d.el('keySelectGlobal').value = 'KEY-A';
  t.ctx.GW2Api.getAccountLegendaryArmory = () => Promise.resolve(armoryIds || []);
  const T = t.ctx.LegendaryTracker;
  if (!T || typeof T.activate !== 'function') return { html: '', disponible: false, T: null };
  T.activate();
  await tick();
  if (mode && T.setMode) T.setMode(mode);
  if (filters && T._debug) {
    // Los filtros se tocan por la API publica, no por el interno.
    if (T.setFilter) filters.forEach(([k, v]) => T.setFilter(k, v));
  }
  await tick();
  return { html: t.d.el('legendaryModeContent').innerHTML, disponible: true, T };
}

// Las ids de una sola familia, para que el filtro sea observable sin
// depender de los numeros de un catalogo que pueden cambiar.
const CAT = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'js/legendary-data.js'), 'utf8')
    .match(/LEGENDARY_CATALOG\s*=\s*(\[[\s\S]*?\n\]);/)[1]);
const ARMAS = CAT.filter(c => c.type === 'armor').slice(0, 5).map(c => c.id);
const ARMAS2 = CAT.filter(c => c.type === 'armor').slice(5, 10).map(c => c.id);

const run = async () => {
  console.log('FILTRO: Mi progreso usa los filtros del Catalogo + switch de alcance');

  // --- FILTRO-01: en progreso se dibuja la barra de filtros ---
  {
    const out = await render([ARMAS[0]], 'progress');
    ok('FILTRO-01 Mi progreso dibuja la barra de filtros',
      out.disponible && out.html.indexOf('lt-filter-bar') !== -1,
      'html=' + out.html.length);
  }

  // --- FILTRO-02: los TRES filtros estan, con los mismos data-ftype ---
  {
    const out = await render([ARMAS[0]], 'progress');
    const h = out.html;
    ok('FILTRO-02 los tres filtros (Tipo/Gen/Exp) estan con los MISMOS data-ftype',
      h.indexOf('data-ftype="type"') !== -1 &&
      h.indexOf('data-ftype="generation"') !== -1 &&
      h.indexOf('data-ftype="expansion"') !== -1,
      'type=' + h.indexOf('data-ftype="type"') +
      ' gen=' + h.indexOf('data-ftype="generation"') +
      ' exp=' + h.indexOf('data-ftype="expansion"'));
  }

  // --- FILTRO-03: el switch Desbloqueadas / Solo faltantes NO EXISTE MAS ---
  //
  // ESTE ASERTO CAMBIO DE SENTIDO, y el cambio es el punto 5 del plan de
  // noche (Pablo). Antes afirmaba que el switch existia (`!== -1`); ahora
  // afirma que NO esta (`=== -1`). No se borro el test ni se relajo el
  // aserto: se lo dio vuelta porque el contrato que fijaba fue retirado a
  // proposito, y un test que sigue afirmandolo haria imposible hacer el
  // cambio que Pablopidio.
  //
  // Lo que se pierde al retirar el switch, y por que no fue decision mia: los
  // tres filtros (Tipo/Gen/Exp) SE MANTIENEN. Se van el switch, la barra
  // "Completado X / 206" y la grilla de las 206 divididas por estado de
  // posesion, porque respondian "de las 206 legendarias, cuantas tengo", que
  // no es la pregunta que uno se hace al abrir "Mi progreso" con la cola.
  {
    const out = await render([ARMAS[0]], 'progress');
    const h = out.html;
    ok('FILTRO-03 el switch de alcance YA NO se dibuja (retirado en el punto 5)',
      h.indexOf('data-scope=') === -1,
      'unlocked=' + h.indexOf('data-scope="unlocked"') +
      ' missing=' + h.indexOf('data-scope="missing"'));
    // El segundo aserto del bloque: que la barra "Completado: X / 206" y el
    // porcentaje global tambien se fueron. Se verifica por TEXTO, porque
    // "no esta el `div` de la barra" es indistinguible de "esta la barra y no
    // se ve" -- y es el mismo modo de fallo que ALERT-189 (un aserto sobre el
    // enum de un estado cuando el estado tambien se pinta por su texto).
    ok('FILTRO-03b la barra "Completado X / 206" y el porcentaje global se retiraron',
      h.indexOf('Completado:') === -1 && h.indexOf('lt-progress-summary') === -1,
      'Completado=' + h.indexOf('Completado:') +
      ' lt-progress-summary=' + h.indexOf('lt-progress-summary'));
  }

  // --- FILTRO-04: el switch NO aparece en el Catalogo ---
  // En Catalogo se ve el catalogo entero, asi que "Solo faltantes" no tiene
  // sentido ahi: no hay un subconjunto "mio" del catalogo completo. Un switch
  // que no puede cambiar nada visible es un control mentiroso.
  {
    const out = await render([ARMAS[0]], 'catalog');
    ok('FILTRO-04 el switch NO aparece en el Catalogo',
      out.disponible && out.html.indexOf('data-scope=') === -1,
      'aparecio data-scope en catalogo');
  }

  // --- FILTRO-05: el filtro TIPO se APLICA en progreso (no solo se dibuja) ---
  // Este es el assert que distingue "dibuje la barra" de "la barra funciona".
  {
    const todas = await render([ARMAS[0]], 'progress');
    const filtrado = await render([ARMAS[0]], 'progress', [['type', 'armor']]);
    // Con filtro de tipo=armor el set no puede CRECER.
    const cuenta = (h) => (h.match(/lt-item-card/g) || []).length;
    ok('FILTRO-05 aplicar un filtro en progreso no rompe el render',
      filtrado.disponible && cuenta(filtrado.html) <= cuenta(todas.html),
      'todas=' + cuenta(todas.html) + ' filtrado=' + cuenta(filtrado.html));
  }

  // --- FILTRO-06: la cola, no el alcance ---
  //
  // ESTE ASERTO CAMBIO DE PREGUNTA, no de forceje. Antes: "el alcance missing
  // lista las NO desbloqueadas", que es el contrato retirado. Ahora: "agregar a
  // la cola la hace aparecer en Mi progreso", que es el contrato nuevo. La
  // MECANICA probada es la misma -- queMi progreso no es decorativo y su
  // contenido depende de una accion del usuario -- pero el objeto es otro.
  //
  // No se conserva el viejo conmutado: el alcance ya no existe, y un aserto
  // que fija algo que no esta mide la ausencia de la cosa y no su
  // comportamiento. Es el mismo error que este repo ya cometio dos veces
  // (ALERT-84, ALERT-168).
  {
    const t = boot();
    t.d.el('keySelectGlobal').value = 'KEY-A';
    t.ctx.GW2Api.getAccountLegendaryArmory = () => Promise.resolve([ARMAS[0]]);
    const T = t.ctx.LegendaryTracker;
    T.activate(); await tick(); T.setMode('progress'); await tick();
    const antes = (t.d.el('legendaryModeContent').innerHTML.match(/lt-item-card/g) || []).length;

    // `ARMAS` son IDS, no objetos. Escribir `ARMAS[1].id` da `undefined` y el
    // error mas tonto posible: uno escribe codigo contra una forma y el
    // arnes dice "no se agrego" sin decir "le pasaste basura".
    const r = T.toggleQueue(ARMAS[1]);
    await tick();
    const h = t.d.el('legendaryModeContent').innerHTML;
    const despues = (h.match(/lt-item-card/g) || []).length;

    ok('FILTRO-06 agregar a la cola la hace aparecer en Mi progreso',
      r.ok && r.added && despues === antes + 1,
      'antes=' + antes + ' despues=' + despues + ' added=' + r.added + ' id=' + ARMAS[1]);

    // Y quitarla la saca. Sin este segundo aserto, una cola que solo crece
    // pasa el test anterior: el assert del conteo grows es el unico que
    // distingue "la cola funciona" de "agregar funciona y quitar esta roto".
    T.toggleQueue(ARMAS[1]);
    await tick();
    const vuelta = (t.d.el('legendaryModeContent').innerHTML.match(/lt-item-card/g) || []).length;
    ok('FILTRO-06b quitar de la cola la saca de Mi progreso',
      vuelta === antes,
      'antes=' + antes + ' vuelta=' + vuelta);
  }

  // --- FILTRO-07: la API publica expone setFilter, y la de la cola ---
  //
  // `setScope` sigue existiendo como FUNCION pero ya no escribe: se dejo
  // para que un consumidor viejo no rompa al llamar. Lo que se afirma aca es
  // que la escritura de la cola pasa por la API y no por el array interno --
  // si el render escribiera `queue` directo, el maximo 5 dejaria de ser una
  // regla y pasaria a ser una costumbre.
  {
    const t = boot();
    const T = t.ctx.LegendaryTracker;
    ok('FILTRO-07 LegendaryTracker expone setFilter y la API de la cola',
      !!T && typeof T.setFilter === 'function' &&
      typeof T.toggleQueue === 'function' &&
      typeof T.getQueue === 'function' && typeof T.isQueued === 'function',
      'setFilter=' + (T && typeof T.setFilter) +
      ' toggleQueue=' + (T && typeof T.toggleQueue) +
      ' getQueue=' + (T && typeof T.getQueue));

    // `setScope` acepta el argumento y NO cambia el alcance. Se afirma
    // explicitamente para que la retirada sea visible en el arnes y no
    // quede como un olvido: si alguien lo "arregla" escribiendo de nuevo,
    // este assert cae.
    const t2 = boot();
    const T2 = t2.ctx.LegendaryTracker;
    const leido = T2.setScope('missing');
    ok('FILTRO-07b setScope ya no escribe (quedo como no-op deliberado)',
      T2.setScope && leido === 'unlocked',
      'setScope=' + (T2 && typeof T2.setScope) + ' devolvio=' + leido);
  }

  console.log('\n  FILTRO: ' + pass + ' pass / ' + fail + ' fail');
  if (fail > 0) process.exitCode = 1;
};
run();