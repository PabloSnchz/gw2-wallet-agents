'use strict';
/**
 * tests/hb154-skins-catalogo.test.js — Tramo 2 de "Coberturable account-scoped
 * multicuenta" (BACKLOG.md L88): `getSkinsBatch(ids, opts)`, la capa que
 * convierte los ids de skin del Tramo 1 en FICHAS (nombre, icono, rareza).
 *
 * LO QUE ESTE ARCHIVO NO ES: un snapshot. Cada seccion existe porque hay una
 * forma concreta de romper el producto que SOLO esa seccion distingue. Si
 * una seccion no puede caerse con ninguna mutacion del producto, sobra.
 *
 * LAS MEDICIONES QUE ANCLA EL TEST (HB#154, en vivo, no heredadas):
 *   ?ids=all            -> 400 "unable to use 'all' keyword for this API"
 *   ?ids=<201 ids>      -> 400 "id list too long; ... limited to 200 ids at once"
 *   ?ids=1..200         -> 206 con 188  (NO 200: hay 12 huecos en el catalogo)
 *   ?ids=1,2,3          -> 200 con 3
 *   ?ids=1,2,3,99999997 -> 206 con 3    (3 validos + 1 invalido)
 *
 * De la ultima pareja sale la regla que ordena todo lo demas: EL 206 DEPENDE
 * DEL CONTENIDO, NO DEL TAMANO. Un lote de 3 puede ser 206, o sea que el
 * primer lote real de cualquier cuenta puede serlo.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const CODE = fs.readFileSync(path.join(__dirname, '..', 'js', 'api-gw2.js'), 'utf8');

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const sec = (t) => console.log('\n' + t);

/** Fachada de la API. `script` decide status+body de cada request. */
function montar(script) {
  const urls = [];
  const warns = [];
  const store = {};
  const ls = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
  const ctx = {
    console: {
      log: () => {}, info: () => {}, debug: () => {},
      warn: (...a) => warns.push(a.map(String).join(' ')),
      error: (...a) => warns.push('ERROR ' + a.map(String).join(' ')),
    },
    localStorage: ls,
    fetch: (url) => {
      urls.push(url);
      const r = script(url, urls.length - 1) || { status: 200, body: [] };
      return Promise.resolve({
        ok: r.status >= 200 && r.status < 300,
        status: r.status,
        text: () => Promise.resolve(typeof r.body === 'string' ? r.body : JSON.stringify(r.body)),
      });
    },
    setTimeout, clearTimeout, AbortController, URL, URLSearchParams,
    Promise, JSON, Math, Date, Object, Array, String, Number, Boolean,
    isFinite, isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
  };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename: 'api-gw2.js' });
  return { api: ctx.GW2Api, urls, warns, store };
}

// OJO: `withParams` (api-gw2.js:642) arma la query con `URLSearchParams`, asi
// que las comas salen como `%2C`. MEDIDO contra la API real: `?ids=1%2C2%2C3`
// y `?ids=1,2,3` devuelven las DOS cosas 200 con 3 fichas, asi que el producto
// esta bien y el que tiene que des-codificar este parser es el test.
//
// Y el orden importa, para mal: hay que DECODIFICAR PRIMERO y partir al
// segundo. Al reves, `split(',')` no encuentra ninguna coma literal (todas son
// `%2C`), devuelve un solo elemento, y `+('1%2C2%2C3')` es NaN: el lote entero
// entra por el guard de forma y el fallo se ve como "el producto no trae
// fichas" cuando el producto esta perfecto. Un parser mal hecho no produce un
// error de parser, produce un diagnostico falso tres lineas mas abajo.
const idsDe = (u) => decodeURIComponent((u.match(/[?&]ids=([^&]*)/) || [, ''])[1]).split(',').filter(Boolean);
/** El `ids=` de cada request, en orden. */
const lotesDe = (urls) => urls.map(idsDe);
const fichas = (n, id) => ({ id, name: 'Skin ' + n, icon: 'https://i/' + id + '.png', rarity: 'Legendario' });

(async function () {
  sec('A) El camino trivial: ids -> fichas, en orden, con nombre e icono');
  {
    const h = montar(() => ({ status: 200, body: [fichas('a', 1), fichas('b', 2), fichas('c', 3)] }));
    const r = await h.api.getSkinsBatch([3, 1, 2]);
    ok('devuelve 3 fichas', r.length === 3);
    ok('en el orden pedido (3,1,2), NO en el de la API', r.map((x) => x.id).join(',') === '3,1,2');
    ok('cada ficha trae name e icon', r.every((x) => x.name && x.icon));
    ok('pide UNA vez a la API', h.urls.length === 1);
  }

  sec('B) El 206 con hueco se ACEPTA (la medicion que ordena el diseno)');
  {
    // 206 con 2 de 3 pedidos: falta el 2. La API lo manda asi de verdad.
    const h = montar(() => ({ status: 206, body: [fichas('a', 1), fichas('c', 3)] }));
    let rechazo = null;
    const r = await h.api.getSkinsBatch([1, 2, 3]).catch((e) => { rechazo = e; return null; });
    // Asercion REAL, no un `true` con nombre lindo. La primera version de esta
    // linea era `ok('NO rechaza un 206', true)`: un control que no puede fallar
    // escrito con nombre de control (ALERT-212). Se escribe mirando el valor.
    ok('la promesa RESUELVE, no rechaza', rechazo === null);
    ok('resuelve las 2 que llegaron', r && r.length === 2);
    ok('el id sin ficha NO aparece', !r.some((x) => x.id === 2));
    ok('y no inventa una entrada para el hueco', r.length === 2);
    ok('no re-pregunta los ausentes (el re-pregunto daria 404 siempre)', h.urls.length === 1);
  }

  sec('C) Un lote pedido que vuelve vacio AVISA (no es "no tenes skins")');
  {
    const h = montar(() => ({ status: 200, body: [] }));
    const r = await h.api.getSkinsBatch([4242]);
    ok('resuelve [] sin rechazar', Array.isArray(r) && r.length === 0);
    ok('y deja rastro en el log', h.warns.some((w) => w.indexOf('sin ninguna ficha') !== -1));
  }

  sec('D) El lote parte en 200, que es el limite DURO (201 -> 400 medido)');
  {
    const todos = Array.from({ length: 401 }, (_, i) => i + 1);
    const h = montar((u) => {
      return { status: 200, body: idsDe(u).map((n) => fichas('x', +n)) };
    });
    const r = await h.api.getSkinsBatch(todos);
    const lotes = lotesDe(h.urls);
    ok('401 ids -> 3 requests (200 + 200 + 1)', lotes.length === 3);
    ok('ningun lote pasa de 200', lotes.every((l) => l.length <= 200));
    ok('los primeros dos son de 200 exactos', lotes[0].length === 200 && lotes[1].length === 200);
    ok('el ultimo es el resto', lotes[2].length === 1);
    ok('y salen las 401 fichas', r.length === 401);
    ok('sin repetidas ni perdidas', new Set(r.map((x) => x.id)).size === 401);
  }

  sec('E) NO escribe en localStorage (decision de diseno, no descuido)');
  {
    const h = montar(() => ({ status: 200, body: [fichas('a', 1)] }));
    await h.api.getSkinsBatch([1]);
    const claves = Object.keys(h.store);
    ok('ninguna clave creada', claves.length === 0);
    ok('y ninguna menciona skins', !claves.some((k) => /skin/i.test(k)));
  }

  sec('F) La 2a llamada no vuelve a pedir (memoria con TTL)');
  {
    let n = 0;
    const h = montar(() => { n++; return { status: 200, body: [fichas('a', 1), fichas('b', 2)] }; });
    await h.api.getSkinsBatch([1, 2]);
    ok('la 1a pide', n === 1);
    const r2 = await h.api.getSkinsBatch([1, 2]);
    ok('la 2a NO pide', n === 1);
    ok('y devuelve lo mismo', r2.length === 2);
    const r3 = await h.api.getSkinsBatch([2, 1]);
    ok('incluso en otro orden', r3.length === 2 && n === 1);
    const r4 = await h.api.getSkinsBatch([1, 2], { nocache: true });
    ok('nocache: si vuelve a pedir', n === 2);
    ok('y el resultado no cambia', r4.length === 2);
  }

  sec('G) FORMA: un elemento sin id numerico no se cachea ni se inventa');
  {
    const h = montar(() => ({ status: 200, body: [{ name: 'sin id' }, null, fichas('a', 7)] }));
    const r = await h.api.getSkinsBatch([1, 2, 7]);
    ok('no resuelve la ficha sin id', !r.some((x) => x && x.name === 'sin id'));
    ok('deja 0 fichas de las 3 (el lote entero es ilegible)', r.length === 0);
    ok('y avisa', h.warns.length > 0);
    const r2 = await h.api.getSkinsBatch([7], { nocache: true });
    ok('no quedo cacheado por el intento fallido', r2.length === 0);
  }

  sec('H) FORMA: /v2/skins que no devuelve array PROPAGA, no degrada a []');
  {
    // El helper de items degrada esto a [] con un warn, y el resultado seria
    // indistinguible de "no tenes skins". Aca tiene que quedar dicho.
    const h = montar(() => ({ status: 200, body: { text: 'no soy un array' } }));
    const r = await h.api.getSkinsBatch([1]);
    ok('no resuelve fichas inventadas', r.length === 0);
    ok('avisa que no pudo leer el lote', h.warns.some((w) => w.indexOf('skins batch error') !== -1));
  }

  sec('I) Un lote caido NO se lleva a los demas');
  {
    let n = 0;
    const h = montar((u, i) => {
      n++;
      if (i === 0) return { status: 500, body: 'boom' };   // red caida
      return { status: 200, body: idsDe(u).map((x) => fichas('x', +x)) };
    });
    const r = await h.api.getSkinsBatch(Array.from({ length: 300 }, (_, i) => i + 1));
    ok('el primer lote fallo y el segundo igual llego', r.length === 100);
    ok('y las que llegaron son las del 2do lote', r.every((x) => x.id > 200));
    ok('avisa del fallo', h.warns.some((w) => w.indexOf('skins batch error') !== -1));
  }

  sec('J) Entrada vacia, nula o toda basura: [] SIN tocar la red');
  {
    const h = montar(() => ({ status: 200, body: [fichas('a', 1)] }));
    ok('null  -> []', (await h.api.getSkinsBatch(null)).length === 0);
    ok('[]    -> []', (await h.api.getSkinsBatch([])).length === 0);
    ok('{}    -> []', (await h.api.getSkinsBatch({})).length === 0);
    ok('basura-> []', (await h.api.getSkinsBatch(['x', '', null, NaN])).length === 0);
    ok('CERO requests a la API', h.urls.length === 0);
  }

  sec('K) Duplicados y ids repetidos no se repiten en el resultado');
  {
    const h = montar(() => ({ status: 200, body: [fichas('a', 1), fichas('b', 2)] }));
    const r = await h.api.getSkinsBatch([1, 1, 2, 2, 1]);
    ok('5 pedidos -> 2 fichas', r.length === 2);
    ok('sin repetir', new Set(r.map((x) => x.id)).size === 2);
  }

  sec('L) Dos llamadas concurrentes con la MISMA id-set = 1 request');
  {
    let n = 0;
    const h = montar(() => { n++; return { status: 200, body: [fichas('a', 1)] }; });
    await Promise.all([h.api.getSkinsBatch([1]), h.api.getSkinsBatch([1])]);
    ok('se comparte el vuelo', n === 1);
  }

  sec('M) CONTROLES NEGATIVOS (una guarda que nunca puede fallar no es una guarda)');
  {
    // M1: la API devuelve MAS de lo pedido. Si la implementacion Propantara
    // en vez de acumular, aqui aparece un id que nadie pidio.
    const h1 = montar(() => ({ status: 200, body: [fichas('a', 1), fichas('z', 999)] }));
    const r1 = await h1.api.getSkinsBatch([1]);
    ok('un id no pedido NO aparece en el resultado', !r1.some((x) => x.id === 999));
    ok('el pedido si aparece', r1.some((x) => x.id === 1));

    // M2: la API devuelve el MISMO id dos veces (no deberia, pero).
    const h2 = montar(() => ({ status: 200, body: [fichas('a', 1), fichas('a', 1)] }));
    const r2 = await h2.api.getSkinsBatch([1]);
    ok('id repetido en la respuesta -> 1 sola ficha', r2.length === 1);

    // M3: HTTP 400 explicito (el caso real de 201 ids). No es un 206 parcial,
    // es un rechazo entero: el lote se pierde, pero los demas siguen.
    let n = 0;
    const h3 = montar((u, i) => {
      n++;
      if (i === 0) return { status: 400, body: { text: 'id list too long' } };
      return { status: 200, body: idsDe(u).map((x) => fichas('x', +x)) };
    });
    const r3 = await h3.api.getSkinsBatch(Array.from({ length: 300 }, (_, i) => i + 1));
    ok('un 400 en un lote no tumba el otro', r3.length === 100);
    ok('y el aviso nombra la causa', h3.warns.length > 0);
  }

  console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.log('\nEXPLOSION: ' + (e && e.stack ? e.stack : e));
  console.log(pass + ' pass / ' + (fail + 1) + ' FAIL');
  process.exit(1);
});