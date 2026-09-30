/**
 * HB#39 — Idea 47, Commit 2: los 7 wrappers propagan en vez de degradar.
 *
 * El commit 1 (idea47-commit1.allsettled.test.js) preparo los call sites para
 * tolerar un rechazo. Este commit hace que el rechazo exista. Sin los dos, el
 * banner de lectura incompleta nunca se muestra y el fix no hace nada.
 *
 * Sobre el rigor de la seccion [3]: es analisis ESTATICO por heuristica, no una
 * prueba de ejecucion. No puede seguir un `await` a su bloque try/catch. Lo que
 * si verifica, y es lo que importa, es que no aparezca un call site NUEVO de
 * estos 7 wrappers en un archivo que no los unprotected. La auditoria real de
 * los 10 call sites que existian esta en SESSION_LOG.md (HB#39) y fue manual.
 */
const fs = require('fs');
const path = require('path');

const JS = path.join(__dirname, '..', 'js');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  OK   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  ->  ' + extra : '')); }
}

const SRC = {};
for (const f of fs.readdirSync(JS)) {
  if (f.endsWith('.js')) SRC[f] = fs.readFileSync(path.join(JS, f), 'utf-8');
}

// Los 7 que deben propagar. getCommerceListings NO va: ahi [] es estado normal.
const PROPAGATE = [
  'getCharacterCount',
  'getAccountRaids',
  'getCommerceTransactionsBuys',
  'getCommerceTransactionsSells',
  'getAccountBank',
  'getAccountMaterials',
  'getAccountLegendaryArmory'
];

// Extrae el cuerpo de una function nombrada por conteo de llaves, INCLUDING
// el JSDoc que la precede (va arriba, asi que sin esto el contrato @throws que
// documenta el rechazo queda fuera del cuerpo y el test lo daria por ausente).
function bodyOf(src, fnName) {
  const start = src.indexOf('function ' + fnName + '(');
  if (start < 0) return null;
  // JSDoc: el ultimo '/**' antes de la firma, cerrado antes de la firma, y sin
  // otra 'function' en el medio (si la hay, ese bloque pertenece a otra cosa).
  let from = src.lastIndexOf('\n', start) + 1;
  const open = src.lastIndexOf('/**', start);
  if (open >= 0) {
    const close = src.indexOf('*/', open);
    if (close > 0 && close < start && !/\bfunction\b/.test(src.slice(close, start))) {
      from = src.lastIndexOf('\n', open) + 1;
    }
  }
  const bodyStart = src.indexOf('{', start);
  let depth = 0, end = -1;
  for (let i = bodyStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  return end < 0 ? null : src.slice(from, end);
}

console.log('\n[1] Los 7 wrappers: el catch propaga en vez de devolver un valor falso');
{
  let degradan = [];
  let faltan = [];
  for (const fn of PROPAGATE) {
    const body = bodyOf(SRC['api-gw2.js'], fn);
    if (!body) { faltan.push(fn); continue; }
    // El catch debe hacer `throw error`, no `return []` / `return 0`.
    const catches = body.match(/\.catch\(function \(error\) \{[\s\S]*?\n {6}\}\)/g) || [];
    if (!catches.length) { faltan.push(fn + ' (sin catch)'); continue; }
    for (const c of catches) {
      if (!/throw error/.test(c)) degradan.push(fn);
    }
    // Y el contrato tiene que estar escrito, no solo implementado.
    if (!/@throws/.test(body)) faltan.push(fn + ' (JSDoc sin @throws)');
  }
  ok('los 7 existen con catch que hace throw', faltan.length === 0, faltan.join(', '));
  ok('ninguno degrada a [] / 0', degradan.length === 0, degradan.join(', '));
}

console.log('\n[2] getCommerceListings queda fuera (ahi [] es estado normal)');
{
  const body = bodyOf(SRC['api-gw2.js'], 'getCommerceListings');
  ok('existe', !!body);
  if (body) {
    ok('sigue devolviendo [] (no se toco)', /return \[\];/.test(body));
    ok('no se le agrego @throws', !/@throws/.test(body));
  }
}

console.log('\n[3] Todo call site de los 7 vive en un archivo que los unprotected');
{
  // Un archivo que llama a uno de estos 7 tiene que usar Promise.allSettled o
  // tener un catch. Heuristica, no prueba de que el await este protegido.
  const exempt = new Set(['api-gw2.js']); // definicion + export
  const needProtect = new Set(['Promise.allSettled', '.catch(', 'try {']);
  constjskipped = [];
  for (const [file, src] of Object.entries(SRC)) {
    if (exempt.has(file)) continue;
    const calls = PROPAGATE.filter(fn =>
      new RegExp('GW2Api\\.' + fn + '\\s*\\(').test(src) ||
      new RegExp('\\b' + fn + '\\s*\\(').test(src.replace(/GW2Api\./g, '')));
    if (!calls.length) continue;
    const has = [...needProtect].some(tok => src.includes(tok));
    ok(file + ' (' + calls.length + ' wrappers) esta protegido', has, calls.join(','));
  }
}

console.log('\n[4] wallet-dashboard: los _errors de characters y raids son alcanzables');
{
  const src = SRC['wallet-dashboard.js'];
  // Este es el bug de capa que reporto el PO: el catch estaba escrito, era
  // correcto, y nunca corria porque el wrapper resolvia 0 / [].
  ok('captura el fallo de getCharacterCount', /catch\(e\) \{ summary\.characters = 0; summary\._errors\.characters/.test(src));
  ok('captura el fallo de getAccountRaids', /catch\(e\) \{ summary\.raids = 0; summary\._errors\.raids/.test(src));
  ok('el catch de characters esta en un try', /try \{ summary\.characters = await charP; \}/.test(src));
  ok('el catch de raids esta en un try', /try \{\s*\n\s*var raidsArr = await raidsP;/.test(src));
}

console.log('\n[5] Contrato de getCommerceDelivery intacto (ya propagaba)');
{
  const body = bodyOf(SRC['api-gw2.js'], 'getCommerceDelivery');
  ok('sigue propagando', !!body && /throw error/.test(body));
  ok('y lo dice en el JSDoc', !!body && /@throws/.test(body));
}

console.log('\n[6] Sintaxis de todo lo tocado');
{
  const vm = require('vm');
  for (const f of ['api-gw2.js', 'inventory-hub.js', 'inventory-dashboard.js',
                   'raid-tracker.js', 'wallet-dashboard.js', 'converter-modal.js']) {
    let good = true, msg = '';
    try { new vm.Script(SRC[f]); } catch (e) { good = false; msg = e.message; }
    ok(f + ' parsea', good, msg);
  }
}

console.log('\n[7] Cache-busting: index.html apunta a la version nueva');
{
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
  // api-gw2.js: la invariante es que el ?v= coincida con el header del
  // archivo, no que valga un numero concreto. El Idea 48 subio esa version
  // despues de este commit y el literal se rompio solo. Compara contra el
  // header real para que el test siga diciendo lo que pretende decir.
  const apiSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'api-gw2.js'), 'utf-8');
  const apiVer = (apiSrc.match(/Versi\u00f3n:\s*([\d.]+)/) || [])[1];
  ok('api-gw2.js?v= alineado con su header (' + apiVer + ')',
     !!apiVer && new RegExp('js/api-gw2\\.js\\?v=' + apiVer.replace(/\./g, '\\.')).test(html));
  ok('inventory-hub.js?v=1.4.0', /js\/inventory-hub\.js\?v=1\.4\.0/.test(html));
  ok('no queda api-gw2 en 2.17.x', !/api-gw2\.js\?v=2\.17/.test(html));
}

console.log('\n[8] wallet-dashboard: los 3 launches tardios tienen .catch no-op');
{
  // Sin esto, un rechazo de apP/raidsP/luckP durante el await de charP dispara
  // "unhandledrejection": los 4 se lanzan en un bloque sincrono y cada handler
  // se adjunta recien en su propio await.
  const src = SRC['wallet-dashboard.js'];
  const block = src.match(/if \(apP\)[\s\S]*?if \(luckP\) luckP\.catch\(function \(\) \{\}\);/);
  ok('apP tiene catch no-op', !!block && /if \(apP\) apP\.catch\(function \(\) \{\}\);/.test(block[0]));
  ok('raidsP tiene catch no-op', !!block && /if \(raidsP\) raidsP\.catch\(function \(\) \{\}\);/.test(block[0]));
  ok('luckP tiene catch no-op', !!block && /if \(luckP\) luckP\.catch\(function \(\) \{\}\);/.test(block[0]));
  // charP es el primero que se espera: su handler se adjunta en la primera
  // suspension, sin ventana muerta. Si alguien lo agrega, es inofensivo.
  ok('el bloque va antes de los try/catch de columna',
     src.indexOf('if (apP) apP.catch') < src.indexOf('summary.characters = await charP'));
}

console.log('\n--- ' + pass + ' OK / ' + fail + ' FAIL ---');
process.exit(fail ? 1 : 0);
