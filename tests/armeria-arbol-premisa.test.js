/**
 * armeria-arbol-premisa.test.js — ARME paso 6 (árbol de fabricación)
 *
 * QUE MIDE ESTE TEST, Y POR QUE ES UNA PUERTA Y NO UN FEATURE
 * ------------------------------------------------------------
 * El último paso del plan de noche es un árbol de fabricación RECURSIVO:
 * clicking una legendaria y ver no sólo sus ingredientes, sino la receta de
 * CADA ingrediente. Para eso el contrato tiene que traer la receta de los
 * ingredientes, no sólo la de las legendarias.
 *
 * ESTE TEST AFIRMA QUE HOY NO SE PUEDE. Mide la cobertura del contrato sobre
 * los ingredientes que él mismo declara, y hoy da CERO. Esa es la razón por
 * la que el paso 6 se corta, y por lo que un árbol recursivo construido sobre
 * el contrato actual dibujaría siempre un solo nivel: no le falta la
 * recursión, le faltan los datos.
 *
 * NO SE AFIRMA QUE FALTEN (eso sería una opinión): se afirma EL NÚMERO, y el
 * número viene de abrir los dos artefactos versionados y cruzar sus claves.
 * Si alguien amplía el contrato, el número deja de ser 0 y EL TEST FALLA, que
 * es exactamente lo que tiene que pasar: la puerta se abre sola cuando el
 * trabajo de abrirla está hecho.
 *
 * POR QUÉ NO USA `cl_recipes.json`
 * -------------------------------
 * Porque `tools/` está en `.gitignore` con `*` y ese archivo NO está
 * versionado (ALERT-187 / plan de noche §8: la ampliación del .gitignore es
 * decisión de Pablo). Un test que necesita un archivo ausente en un clon
 * limpio no mide nada: pasa en mi máquina y no en la de nadie. Este test se
 * limita a lo que está en git, y por eso es reproducible.
 *
 * CONTROLES NEGATIVOS (obligatorios: un detector que nunca puede dar "algo"
 * no está midiendo)
 * ------------------------------------------------------------------------
 *  1. Con un contrato VACÍO el conteo tiene que dar 0.
 *  2. Con un contrato que SÍ contiene un ingrediente, tiene que dar 1.
 *     Si (2) no discriminate, (0) no prueba nada.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const JS_DIR = path.join(__dirname, '..', 'js');

let pass = 0;
let fail = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ' -> ' + detail : ''));
}
function eq(name, actual, expected, detail) {
  ok(name, actual === expected,
    (detail ? detail + '; ' : '') +
    `esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(actual)}`);
}

// --- Carga de los dos artefactos versionados ------------------------------
// El IIFE del repo resuelve su root con `typeof window !== 'undefined' ?
// window : this`, así que en Node el destino es el global del sandbox.
function cargarRecipes() {
  const src = fs.readFileSync(path.join(JS_DIR, 'legendary-recipes.js'), 'utf8');
  new Function(src)();
  return global.LegendaryRecipes;
}
function cargarCatalogo() {
  const src = fs.readFileSync(path.join(JS_DIR, 'legendary-data.js'), 'utf8');
  const m = src.match(/var LEGENDARY_CATALOG = (\[[\s\S]*?\]);/);
  if (!m) throw new Error('no se encontro LEGENDARY_CATALOG');
  return JSON.parse(m[1]);
}

// --- La medicion ----------------------------------------------------------
// Se cuenta sobre el mapa de contrato REAL, no sobre una lista de ids escrita
// a mano: el mismo criterio que uso el build. Un id escrito a mano que el
// contrato no tiene produce un 0 idéntico al 0 verdadero.
function ingredientesTotales(R) {
  let total = 0;
  const ids = [];
  Object.keys(R.byItem).forEach(function (id) {
    const e = R.byItem[id];
    if (e.dataStatus !== 'recipe') return;
    (e.ingredients || []).forEach(function (ing) { total++; ids.push(String(ing.itemId)); });
  });
  return { total: total, ids: ids };
}

function cobertura(R) {
  const ing = ingredientesTotales(R);
  let cubiertos = 0;
  const unicos = {};
  ing.ids.forEach(function (id) { unicos[id] = true; });
  Object.keys(unicos).forEach(function (id) { if (R.byItem[id]) cubiertos++; });
  return { ingredientes: ing.total, idsDistintos: Object.keys(unicos).length, cubiertos: cubiertos };
}

const R = cargarRecipes();
const catalogo = cargarCatalogo();

// --- CONTROLES NEGATIVOS (primero: si no discriminan, no se cree el resto) --
{
  const vacio = { byItem: {} };
  eq('CONTROL 1: contrato vacio -> 0 ingredientes', ingredientesTotales(vacio).total, 0);

  // Un contrato con UN ingrediente declarado y ese mismo ingrediente como
  // ingrediente de una receta tiene que dar 1. Si esto no da 1, el detector
  // de abajo no discrimina y sus ceros no significan nada.
  const sintetico = {
    byItem: {
      '1': { dataStatus: 'recipe', ingredients: [{ itemId: 99, count: 1, name: 'X' }] },
      '99': { dataStatus: 'no_recipe', ingredients: [] }
    }
  };
  eq('CONTROL 2: contrato sintetico con 1 match -> 1', cobertura(sintetico).cubiertos, 1);
  eq('CONTROL 2b: el sintetico tiene 1 ingrediente', cobertura(sintetico).ingredientes, 1);
}

// --- LA AFIRMACION --------------------------------------------------------
{
  const c = cobertura(R);

  ok('el contrato tiene entradas', c.ingredientes > 0,
    `ingredientes declarados: ${c.ingredientes}`);

  // ESTA es la puerta. Dice 0 hoy.
  eq('PUERTA: ingredientes del contrato cubiertos por el propio contrato', c.cubiertos, 0);

  // Los numeros que hacen legible la puerta. Si alguno se mueve, la puerta
  // sigue valiendo (o deja de valer) y el que tiene que mirarlo es el que
  // toco el contrato.
  ok('PUERTA: ids de ingredientes distintos es un numero real',
    c.idsDistintos > 100, `ids distintos: ${c.idsDistintos}`);

  // El contrato debe seguir declarando lo que dice declarar. Si esto cae, el
  // problema ya no es el arbol: es que el contrato se rompio.
  eq('el contrato declara 206 items', R.totalItems, 206);
  eq('el catalogo tiene 206 items', catalogo.length, 206);

  const conReceta = Object.keys(R.byItem).filter(function (k) {
    return R.byItem[k].dataStatus === 'recipe';
  }).length;
  ok('hay recetas que declarar', conReceta > 100, `con receta: ${conReceta}`);

  // El placeholder sigue siendo UNO y sigue siendo visible: el contrato lo
  // declara para que un filtro que deje de matchear se vea. Un arbol que
  // lo tratara como un nodo mas habria perdido exactamente eso.
  eq('el placeholder 95093 esta declarado una vez',
    Object.keys(R.byItem).filter(function (k) { return R.byItem[k].dataStatus === 'placeholder'; }).length, 1);
  ok('el placeholder tiene nota visible',
    !!(R.placeholder && R.placeholder.note && R.placeholder.note.length > 20));
}

// --- Salida ---------------------------------------------------------------
console.log('--- armeria-arbol-premisa ---');
console.log(`ingredientes declarados por el contrato: ${cobertura(R).ingredientes}`);
console.log(`ids de ingredientes distintos:         ${cobertura(R).idsDistintos}`);
console.log(`de esos, con receta en el contrato:     ${cobertura(R).cubiertos}`);
console.log('=> un arbol recursivo sobre este contrato dibujaria UN nivel.');
console.log(`${pass} pass / ${fail} FAIL`);
if (fail) {
  console.log('FALLAS:');
  failures.forEach(function (f) { console.log('  FAIL ' + f); });
  process.exit(1);
}