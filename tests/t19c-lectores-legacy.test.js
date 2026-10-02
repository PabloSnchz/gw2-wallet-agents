#!/usr/bin/env node
/**
 * T19-c — los 4 lectores a pelo de `gw2_selected_key_v1`.
 *
 * QUE FIJA (y por que cada aserto existe):
 *  - Los 4 modulos leen la cuenta seleccionada por `Storage.get(ACCOUNT_SELECTED)`
 *    y ya no por `localStorage.getItem('gw2_selected_key_v1')` a pelo.
 *  - El fallback del `<select>` global SE CONSERVA. No es residuo de un copiado:
 *    es lo que hoy gana, y el Reviewer lo declaro como tal (R1 del HB#118).
 *  - `tests/idea61-claves-congeladas.test.js` se reduce POR PAR: en
 *    `wv-purchase-detail.js` queda `gw2_keys` (otro raw legitimo, `:858`) y se
 *    saca `gw2_selected_key_v1`. Borrar la linea entera perderia ese control (R3).
 *  - El estado "solo la gn:" (legacy ausente, gn: presente) devuelve el mismo
 *    valor que antes. Es divergencia REAL entre crudo y `Storage.get` (R2 del
 *    Reviewer): el crudo da `null`, la capa da el GUID. No se prueba que hoy
 *    sea alcanzable -- el Reviewer no encontro camino vivo -- se fija el
 *    COMPORTAMIENTO para que el fix no lo cambie en silencio.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const REPO = process.env.GW2_REPO || path.join(__dirname, '..');
const readRel = (p) => fs.readFileSync(path.join(REPO, p), 'utf8');

let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg, detail) {
  if (cond) { pass++; console.log('  PASS ' + msg); }
  else { fail++; failures.push(msg); console.log('  FAIL ' + msg + (detail ? '\n        ' + detail : '')); }
}

const MODULOS = [
  'js/inventory-hub.js',
  'js/raid-tracker.js',
  'js/strike-tracker.js',
  'js/wv-purchase-detail.js',
];

// ─────────────────────────────────────────────────────────────
// 1. Los 4 leen por la CAPA, no a pelo
// ─────────────────────────────────────────────────────────────
console.log('\n1. Los 4 modulos leen la seleccion por Storage.get(ACCOUNT_SELECTED)');
for (const m of MODULOS) {
  const src = readRel(m);
  // El cuerpo de getSelectedToken: desde la funcion hasta su cierre.
  const i = src.indexOf('function getSelectedToken');
  ok(i >= 0, `${m}: existe getSelectedToken`);
  if (i < 0) continue;
  const cuerpo = src.slice(i, i + 700);
  ok(/Storage\.get\(\s*Storage\.STORAGE_KEYS\.ACCOUNT_SELECTED\s*\)/.test(cuerpo),
     `${m}: lee por Storage.get(STORAGE_KEYS.ACCOUNT_SELECTED)`);
  ok(!/localStorage\.getItem\(\s*['"]gw2_selected_key_v1['"]/.test(cuerpo),
     `${m}: ya NO lee 'gw2_selected_key_v1' a pelo`);
}

// ─────────────────────────────────────────────────────────────
// 2. R1: el fallback del DOM se CONSERVA y queda DECLARADO
// ─────────────────────────────────────────────────────────────
console.log("\n2. R1 - el fallback del <select> se conserva y queda declarado como tal");
for (const m of MODULOS) {
  const src = readRel(m);
  const i = src.indexOf('function getSelectedToken');
  const cuerpo = src.slice(i, i + 700);
  ok(/getElementById\(\s*['"]keySelectGlobal['"]\s*\)/.test(cuerpo),
     `${m}: sigue leyendo el <select> global`);
  ok(/keySelectGlobal|FALLBACK|fallback/.test(cuerpo.slice(0, 400)) &&
     /DOM|select|fallback/i.test(cuerpo),
     `${m}: el fallback del DOM queda declarado (no es residuo)`);
}

// ─────────────────────────────────────────────────────────────
// 3. R3: idea61 se reduce POR PAR
// ─────────────────────────────────────────────────────────────
console.log('\n3. R3 - el guard de idea61 se reduce por par, no se borra la fila');
const t61 = readRel('tests/idea61-claves-congeladas.test.js');
const m61 = t61.match(/const LECTORES_LEGACY_ESPERADOS = new Set\(\[([\s\S]*?)\]\);/);
ok(!!m61, 'idea61: se encuentra LECTORES_LEGACY_ESPERADOS');
if (m61) {
  const bloque = m61[1];
  const entradas = [...bloque.matchAll(/'([^']+)'/g)].map((x) => x[1]);
  const base = (e) => e.replace(/\[[^\]]*\]$/, '');
  const porPar = (e) => { const m = e.match(/\[(.*)\]$/); return m ? m[1].split(', ').sort() : []; };
  const idx = (f) => entradas.findIndex((e) => base(e) === f);

  // CORRECCION PROPIA: la instruction "reducir por par" del Reviewer aplica SOLO a
  // `wv-purchase-detail.js`, que tiene 2 raws (:858 gw2_keys y :1842 la legacy).
  // Los otros 3 tenian UN solo raw, o sea que su entrada SALE de la lista: reducirla
  // a `[gw2_keys]` inventaria un control sobre una lectura que no existe.
  const CON_SEGUNDO_RAW = { 'wv-purchase-detail.js': 'gw2_keys' };

  for (const m of MODULOS) {
    const f = path.basename(m);
    const i = idx(f);
    const segundo = CON_SEGUNDO_RAW[f];
    if (segundo) {
      ok(i >= 0, `idea61: ${f} sigue en la lista, REDUCIDA (no borrada)`);
      if (i < 0) continue;
      const pares = porPar(entradas[i]);
      ok(!pares.includes('gw2_selected_key_v1'),
         `idea61: ${f} ya NO vigila gw2_selected_key_v1`, `queda: ${entradas[i]}`);
      ok(pares.includes(segundo),
         `idea61: ${f} SIGUE vigilando ${segundo} (el otro raw legitimo)`,
         `queda: ${entradas[i]}`);
    } else {
      ok(i < 0,
         `idea61: ${f} SALE de la lista (su unico raw era la legacy que este fix elimina)`,
         `queda en la lista: ${entradas[i]}`);
    }
  }
  // CONTROL: el filtro de "queda vigilando" puede dar positivo y negativo.
  ok(entradas.some((e) => porPar(e).includes('gw2_keys')),
     'CONTROL: el filtro de pares puede dar POSITIVO (hay entradas con gw2_keys)');
  ok(entradas.some((e) => porPar(e).includes('gn_activities_toggles')),
     'CONTROL: y puede dar positivo con otra legacy (el filtro no es literal a gw2_keys)');
}

// ─────────────────────────────────────────────────────────────
// 4. R2: el estado "solo la gn:" se FIJA (no se afirma que hoy sea alcanzable)
// ─────────────────────────────────────────────────────────────
console.log('\n4. R2 - Storage.get con SOLO la gn: presente devuelve el valor (no null)');
function_storage();
function function_storage() {
  const src = readRel('js/storage.js');
  const store = {};
  const localStorage = {
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i],
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const ctx = { window: {}, document: { readyState: 'loading', addEventListener() {} }, localStorage, console };
  ctx.window.localStorage = localStorage;
  vm.createContext(ctx);
  try { vm.runInContext(src, ctx, { filename: 'storage.js' }); }
  catch (e) { ok(false, 'storage.js corre en el sandbox', e.message); return; }
  const S = ctx.window.Storage;
  ok(!!S, 'Storage se expone en window');
  if (!S) return;
  const K = S.STORAGE_KEYS.ACCOUNT_SELECTED;

  // Los 4 casos donde crudo y Storage.get coinciden, fijados por igual.
  store['gw2_selected_key_v1'] = 'GUID-A'; store[K] = 'GUID-A';
  ok(S.get(K) === 'GUID-A', 'ambas iguales -> GUID-A');
  store['gw2_selected_key_v1'] = 'GUID-B'; store[K] = 'GUID-A';
  ok(S.get(K) === 'GUID-B', 'congeladas/distintas -> gana la LEGACY (fuente de verdad)');
  store[K] = 'GUID-A'; delete store['gw2_selected_key_v1'];
  ok(S.get(K) === 'GUID-B' || S.get(K) === 'GUID-A',
     'el estado "solo la gn:" NO devuelve null (el crudo si lo haria)');
  delete store[K];
  ok(S.get(K) === null, 'ninguna presente -> null');

  // Y el que el fix NO puede romper: el espejo se escribe en la MISMA llamada.
  delete store['gw2_selected_key_v1'];
  S.set(K, 'GUID-C');
  ok(store[K] === 'GUID-C' && store['gw2_selected_key_v1'] === 'GUID-C',
     'Storage.set escribe la gn: Y la legacy (el espejo, no _resyncMirrors)');
  // CONTROL NEGATIVO: sin la gn:, get no inventa un valor.
  ok(S.get('gn:__no_existe__:x') === null,
     'CONTROL: una clave desconocida devuelve null (el filtro no devuelve siempre algo)');
}

// ─────────────────────────────────────────────────────────────
console.log(`\nTOTAL: ${pass} pass / ${fail} FAIL`);
if (fail) { console.log('\nFALLAS:\n - ' + failures.join('\n - ')); process.exit(1); }
