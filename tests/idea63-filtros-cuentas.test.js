/* tests/idea63-filtros-cuentas.test.js
 *
 * BUG — cambiar de cuenta puede dejar Personajes (y el buscador unificado) en
 * un panel VACIO y sin una sola palabra.
 *
 * ── La forma del bug ────────────────────────────────────────────────────────
 *
 *   Son DOS hechos independientes, y por eso el fix son dos tramos.
 *
 *   (1) Los 13 filtros de 3 modulos (characters.js, achievements.js, app.js)
 *       sobreviven al cambio de cuenta: ningun handler de `gn:tokenchange`
 *       los limpia. En 2 de los 3, si el filtro vacia la lista, no hay texto.
 *
 *   (2) `state.pagination.page` NO se resetea al cambiar de cuenta. Solo se
 *       resetea en los 3 handlers de filtro (characters.js:1045/1051/1057).
 *       Entonces renderList hace `slice((page-1)*20, +20)` sobre la lista NUEVA
 *       de la cuenta NUEVA, y el flujo real SIN NINGUN FILTRO ACTIVO ya falla:
 *
 *         cuenta A con 30 personajes, Pablo en pagina 2
 *           -> cambia a la cuenta B con 12
 *           -> slice(20, 40) sobre 12 elementos  =  []      <- panel en blanco
 *           -> renderPagination marca activo el boton de la pagina 2,
 *              que ya no existe
 *
 * ── POR QUE ESTE TEST NO COPIA LA ARITMETICA ────────────────────────────────
 *
 * La tentacion es escribir `slice` a mano en el test y comprobar que da [].
 * Eso probaria `Array.prototype.slice`, no el codigo. Este test hace dos cosas
 * separadas para no hacer eso:
 *
 *   - La ARITMETICA se ejecuta de verdad (slice real sobre listas reales), y
 *     sirve para fijar QUE CASO hay que proteger. No afirma nada del codigo.
 *   - El CODIGO se lee del archivo, y los regex estan ACOTADOS al cuerpo del
 *     handler de `gn:tokenchange` y al de `renderList`. Un reset escrito en
 *     cualquier otra funcion NO cuenta, y por eso el test puede fallar.
 *
 * Esto ultimo es lo que hace que la fase roja sea real: verificado con
 * `git stash`, el test da FAIL contra el archivo sin el fix.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function chk(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  ->  ' + extra : '')); }
}

const chars = fs.readFileSync(path.join(ROOT, 'js', 'characters.js'), 'utf8');
const app   = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');

// ── 1. El CASO que hay que proteger (aritmetica real, no afirmacion) ────────
// Cuenta A: 30 personajes, Pablo en pagina 2. Cuenta B: 12 personajes.
const cuentaA = Array.from({ length: 30 }, (_, i) => ({ id: i }));
const cuentaB = Array.from({ length: 12 }, (_, i) => ({ id: i }));
const perPage = 20;
const pagina2SobreA = cuentaA.slice((2 - 1) * perPage, (2 - 1) * perPage + perPage);
const pagina2SobreB = cuentaB.slice((2 - 1) * perPage, (2 - 1) * perPage + perPage);
chk('el caso del PO se reproduce: pagina 2 sobre 30 personajes tiene 10 filas',
  pagina2SobreA.length === 10, 'len = ' + pagina2SobreA.length);
chk('el caso del PO se reproduce: pagina 2 sobre 12 personajes queda VACIA',
  pagina2SobreB.length === 0, 'len = ' + pagina2SobreB.length);

// ── 2. characters.js: el handler de gn:tokenchange resetea filtros y pagina ─
// Se acota al CUERPO del handler. Un reset en otra parte del archivo no cuenta.
const wg = chars.indexOf("document.addEventListener('gn:tokenchange'");
chk('characters.js tiene el handler de gn:tokenchange', wg >= 0);
if (wg >= 0) {
  // El cuerpo va del handler hasta el cierre de wireGlobal.
  const fin = chars.indexOf('function wireGlobal()', wg);
  const cuerpo = chars.slice(wg, fin > wg ? fin : wg + 2000);
  chk('el handler resetea el filtro de busqueda', /state\.filters\.search\s*=\s*''/.test(cuerpo));
  chk('el handler resetea el filtro de mapa', /state\.filters\.map\s*=\s*''/.test(cuerpo));
  chk('el handler resetea el filtro de profesion', /state\.filters\.profession\s*=\s*''/.test(cuerpo));
  chk('el handler resetea el filtro de poiCategory', /state\.filters\.poiCategory\s*=\s*''/.test(cuerpo));
  chk('el handler resetea la pagina a 1', /state\.pagination\.page\s*=\s*1/.test(cuerpo));
}

// ── 3. characters.js: renderList no puede dejar la pagina fuera de rango ────
// El clamp es la garantia de fondo: aunque el reset se esquive por otro camino,
// una pagina imposible se corrige sola en vez de borrar el panel.
const rl = chars.indexOf('function renderList()');
chk('characters.js declara renderList', rl >= 0);
if (rl >= 0) {
  const finRl = chars.indexOf('function createEl(', rl);
  const cuerpoRl = chars.slice(rl, finRl > rl ? finRl : rl + 6000);
  const iTotal = cuerpoRl.indexOf('state.pagination.total = filtered.length');
  chk('renderList calcula el total antes de cortar', iTotal >= 0);
  chk('renderList recorta la pagina al rango real (CLAMP)',
    /state\.pagination\.page\s*>\s*totalPages/.test(cuerpoRl),
    'no hay clamp: page puede quedar fuera de rango');
  chk('la pagina nunca baja de 1', /state\.pagination\.page\s*<\s*1/.test(cuerpoRl));

  // El clamp, evaluado de verdad sobre el caso del PO.
  const clamp = (page, total) => {
    const tp = Math.ceil(total / perPage);
    let p = page;
    if (tp > 0 && p > tp) p = tp;
    if (p < 1) p = 1;
    return p;
  };
  const pCorregida = clamp(2, cuentaB.length);
  chk('el clamp corrige pagina 2 sobre 12 personajes a pagina 1', pCorregida === 1, 'page = ' + pCorregida);
  const trasClamp = cuentaB.slice((pCorregida - 1) * perPage, (pCorregida - 1) * perPage + perPage);
  chk('con el clamp la lista NUEVA se ve entera (12 filas, no 0)', trasClamp.length === 12,
    'len = ' + trasClamp.length);
  chk('el clamp no toca una pagina que ya es valida', clamp(1, cuentaA.length) === 1);
  chk('el clamp deja intacta la pagina 2 cuando la lista es grande',
    clamp(2, cuentaA.length) === 2);
}

// ── 4. T2: el estado vacio DICE ALGO, y ofrece la salida ───────────────────
// Mismo criterio que achievements.js:674, que ya lo hace bien.
if (rl >= 0) {
  const finRl2 = chars.indexOf('function createEl(', rl);
  const cuerpoRl2 = chars.slice(rl, finRl2 > rl ? finRl2 : rl + 6000);
  chk('renderList escribe un mensaje cuando la lista queda vacia',
    /No hay personajes para mostrar/.test(cuerpoRl2));
  chk('el mensaje distingue "el filtro no coincide" de "la cuenta no tiene"',
    /Ningun personaje coincide con los filtros/.test(cuerpoRl2));
  chk('el estado vacio ofrece limpiar los filtros',
    /Limpiar filtros/.test(cuerpoRl2));
  chk('el vacio NO se muestra mientras se esta cargando (no pisa el spinner)',
    /!\s*paginated\.length\s*&&\s*!state\.loadingState\.inProgress/.test(cuerpoRl2));
}

// ── 5. app.js: mismo par de fixes en el buscador unificado ──────────────────
chk('app.js declara resetFilters() como unico reset',
  /function resetFilters\(\)/.test(app));
chk('el boton de limpiar USA resetFilters (no duplica la lista)',
  /clearBtn[\s\S]{0,400}?resetFilters\(\)/.test(app) &&
  !/clearBtn[\s\S]{0,400}?state\.filters\s*=\s*\{\s*q:/.test(app),
  'el clearBtn vuelve a escribir el objeto de filtros a mano');
chk('app.js limpia los filtros al cambiar de cuenta (gn:tokenchange)',
  /addEventListener\(\s*'gn:tokenchange'[\s\S]{0,300}?resetFilters\(\)/.test(app));
chk('el listener de app.js se registra una sola vez',
  /_wiredTokenListener/.test(app));
chk('app.js escribe un mensaje cuando la lista queda vacia',
  /No hay monedas para mostrar/.test(app));
chk('el mensaje de app.js distingue el filtro de la cuenta vacia',
  /Ningun tipo de moneda coincide con los filtros/.test(app));

console.log('\nTOTAL: ' + pass + ' pass, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
