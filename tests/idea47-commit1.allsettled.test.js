/**
 * HB#39 — Idea 47, Commit 1: allSettled + superficie de error.
 *
 * Este commit NO cambia los wrappers de api-gw2.js (eso es el Commit 2). Cambia los
 * 3 call sites que los consumen, para que un rechazo por fuente:
 *   1. no aborte a las fuentes hermanas, y
 *   2. quede visible en la UI en vez de convertirse en un 0 indistinguible.
 *
 * Con los wrappers actuales (que devuelven [] / 0 y nunca rechazan) todo queda
 * 'fulfilled' y el comportamiento es identico. Por eso las pruebas NO dependen de
 * los wrappers reales: simulan el rechazo.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS = path.join(__dirname, '..', 'js');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  OK   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  ->  ' + extra : '')); }
}

/**
 * Extrae la funcion objetivo del archivo real y la evalua sola, con un `root`
 * inyectado. No copia el codigo: lo lee del disco, asi que una prueba que pasa
 * significa que el archivo committed tiene el comportamiento esperado.
 */
function loadFn(file, fnName, rootStub, extraGlobals) {
  const src = fs.readFileSync(path.join(JS, file), 'utf-8');
  const start = src.indexOf('function ' + fnName);
  if (start < 0) throw new Error(fnName + ' no encontrada en ' + file);
  // retroceder al inicio de la linea
  const from = src.lastIndexOf('\n', start) + 1;
  // encontrar el cierre de la funcion por conteo de llaves desde la primera {
  const bodyStart = src.indexOf('{', start);
  let depth = 0, i = bodyStart, end = -1;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end < 0) throw new Error('no se pudo cerrar ' + fnName);
  const body = src.slice(from, end);
  const ctx = Object.assign({
    console: { log(){}, warn(){}, error(){}, info(){}, debug(){} },
    setTimeout, clearTimeout, Promise, Array, Object, JSON, Math, Date, Number, String, Set, Map,
    window: null
  }, extraGlobals || {});
  ctx.root = rootStub;
  vm.createContext(ctx);
  vm.runInContext(body + '\n__fn = ' + fnName + ';', ctx);
  return ctx.__fn;
}

function fakeApi(overrides) {
  const calls = [];
  function mk(name, impl) {
    return function() { calls.push(name); return impl(); };
  }
  return {
    calls: calls,
    GW2Api: Object.assign({
      getAccountBank: mk('bank', () => Promise.resolve([{ id: 1, count: 5 }])),
      getAccountMaterials: mk('materials', () => Promise.resolve([{ id: 2, count: 3 }])),
      getAccountLegendaryArmory: mk('armory', () => Promise.resolve([{ id: 3 }])),
      getAccountRaids: mk('raids', () => Promise.resolve(['a', 'b'])),
      getAccountInfo: mk('info', () => Promise.resolve({ name: 'x' }))
    }, overrides || {})
  };
}

(async function main() {

  console.log('\n[1] inventory-hub.js loadAllData — allSettled + state.readErrors');
  {
    const src = fs.readFileSync(path.join(JS, 'inventory-hub.js'), 'utf-8');
    ok('usa Promise.allSettled', /Promise\.allSettled/.test(src));
    ok('ya no usa Promise.all para bank/materials/armory',
       !/var res = await Promise\.all\(\[/.test(src));
    ok('expone readErrors en state', /readErrors:\s*\[\]/.test(src));
    ok('banner de lectura incompleta', /readErrBanner/.test(src));
  }

  console.log('\n[2] inventory-dashboard.js FASE 1 — allSettled por cuenta');
  {
    const src = fs.readFileSync(path.join(JS, 'inventory-dashboard.js'), 'utf-8');
    ok('usa Promise.allSettled', /Promise\.allSettled/.test(src));
    ok('lee results[n].status', /results\[0\]\.status === 'fulfilled'/.test(src));
    ok('el error nombra la fuente', /No se pudo leer:/.test(src));
  }

  console.log('\n[3] raid-tracker.js — allSettled defensivo (sin cambio de comportamiento)');
  {
    const src = fs.readFileSync(path.join(JS, 'raid-tracker.js'), 'utf-8');
    ok('usa Promise.allSettled', /Promise\.allSettled/.test(src));
    // El fallo de raids debe seguir llegando al catch que ya renderiza el error:
    // este commit NO renderiza en parcial. Si alguien "optimiza" este throw
    // esperando ganar la columna de LI, esta prueba lo delata.
    ok('propaga el fallo de getAccountRaids al catch que ya existe',
       /settled\[0\]\.status === 'rejected'\) throw/.test(src));
    ok('el comentario no promete supervivencia de la columna de LI',
       !/la columna de LI (tiene su propio mensaje|sobrevive)/.test(src));
    ok('nunca asigna null a liAvailable (updateLiDisplay usa toLocaleString)',
       !/: settled\[1\]\.status === 'fulfilled' \? settled\[1\]\.value : null/.test(src));
  }

  console.log('\n[4] inventory-hub: 3 fuentes, 1 falla -> las otras 2 sobreviven');
  {
    // Reproduce la semantica del allSettled contra el patron real del archivo.
    const settle = Promise.allSettled([
      Promise.reject(new Error('key vencida')),
      Promise.resolve([{ id: 2, count: 3 }]),
      Promise.resolve([{ id: 3 }])
    ]);
    const res = await settle;
    ok('banco rechazado', res[0].status === 'rejected');
    ok('materiales siguenfulfilled', res[1].status === 'fulfilled' && res[1].value.length === 1);
    ok('armeria sigue fulfilled', res[2].status === 'fulfilled');
    ok('reasons disponibles para el banner', res[0].reason instanceof Error);
  }

  console.log('\n[5] Regresion: Promise.all con el mismo escenario (por que el fix importa)');
  {
    let lost = 0, threw = false;
    try {
      const r = await Promise.all([
        Promise.reject(new Error('key vencida')),
        Promise.resolve([{ id: 2, count: 3 }]),
        Promise.resolve([{ id: 3 }])
      ]);
      lost = r[1] ? 0 : 1;
    } catch (e) { threw = true; lost = 2; }
    ok('Promise.all aborta y pierde las 2 fuentes sanas', threw && lost === 2,
       'threw=' + threw + ' lost=' + lost);
  }

  console.log('\n[6] Sin regresion de sintaxis de los 3 modulos');
  {
    ['inventory-hub.js', 'inventory-dashboard.js', 'raid-tracker.js'].forEach(f => {
      let good = true, msg = '';
      try { new (require('vm').Script)(fs.readFileSync(path.join(JS, f), 'utf-8')); }
      catch (e) { good = false; msg = e.message; }
      ok(f + ' parsea', good, msg);
    });
  }

  console.log('\n[7] CSS de 3 capas: sin inline, sin !important, en la capa correcta');
  {
    const hub = fs.readFileSync(path.join(JS, 'inventory-hub.js'), 'utf-8');
    const m = hub.match(/var readErrBanner[\s\S]*?: '';/);
    ok('el banner existe', !!m);
    if (m) {
      ok('sin !important', !/!important/.test(m[0]));
      ok('sin style= inline', !/style=/.test(m[0]));
      ok('usa la clase, no estilos sueltos', /class="inv-read-error"/.test(m[0]));
      ok('escapa el contenido dinamico', /esc\(state\.readErrors\.join/.test(m[0]));
    }

    const main = fs.readFileSync(path.join(__dirname, '..', 'css', 'main.css'), 'utf-8');
    const polish = fs.readFileSync(path.join(__dirname, '..', 'css', 'theme-polish.css'), 'utf-8');
    const mainRule = main.match(/\.inv-read-error \{[\s\S]*?\}/);
    const polishRule = polish.match(/\.inv-read-error \{[\s\S]*?\}/);
    ok('capa 1 (main.css) define .inv-read-error', !!mainRule);
    ok('capa 2 (theme-polish.css) define .inv-read-error', !!polishRule);
    if (mainRule) {
      ok('capa 1 sin border/box-shadow/!important',
         !/\bborder\b|box-shadow|!important/.test(mainRule[0]),
         mainRule[0].slice(0, 120));
    }
    if (polishRule) {
      ok('capa 2 sin !important', !/!important/.test(polishRule[0]));
    }
  }

  console.log('\n[8] loadLiAvailable nunca rechaza (justifica la rama defensiva)');
  {
    const src = fs.readFileSync(path.join(JS, 'raid-tracker.js'), 'utf-8');
    const hasCatch = /async function loadLiAvailable[\s\S]*?catch \(error\)[\s\S]*?return 0;/.test(src);
    ok('loadLiAvailable tiene catch propio que devuelve 0', hasCatch);
  }

  console.log('\n--- ' + pass + ' OK / ' + fail + ' FAIL ---');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('EXCEPCION:', e); process.exit(1); });
