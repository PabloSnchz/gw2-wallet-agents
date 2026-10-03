/**
 * armeria-item-icons.test.js — el icono y el color de rareza del arbol.
 *
 * QUE PRUEBA, Y POR QUE MOCKEA LA RED
 * Monta `api-gw2.js` REAL y `item-icons.js` REAL en un sandbox con un `fetch`
 * falso que cuenta llamadas. No se pega a la API: no hay key en el repo (la vive
 * Pablo en el navegador) y un test contra la red es lento y fragil.
 *
 * Lo que se afirma NO es que `item-icons.js` pida bien — eso lo hace
 * `getItemsMany`, que ya esta probado — sino que el modulo NO pide por su cuenta.
 * El numero de llamadas sale de `getItemsMany` de verdad, asi que si este
 * modulo alguna vez metiera un cliente propio, el conteo se va de 5 y cae.
 *
 * LAS CUATRO AFIRMACIONES
 *   1) 907 ids -> 5 llamadas de red, no 907.
 *   2) un itemId 0 no rompe el render ni llega a la red.
 *   3) un fetch rejeitado deja el arbol DIBUJADO, sin icono y sin color, sin
 *      "cargando" y sin URL inventada.
 *   4) el color sale de RARITY_COLORS[rarity], con la rareza de la respuesta, y
 *      NO de rarity_color.
 *
 * Y UNA AFIRMACION QUE NO ES LO QUE SE PIDIO, MEDIDA Y EXPLICADA ABAJO
 *   El tope de 400 del cache de `getItemsMany` (api-gw2.js:1843-1849) impide
 *   que 906 ids vuelvan todos. Ver la seccion [5].
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const leer = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0, fail = 0;
const fallos = [];
function ok(cond, msg, extra) {
  if (cond) { pass++; return true; }
  fail++;
  fallos.push(msg + (extra ? '  [' + extra + ']' : ''));
  return false;
}
function eq(a, b, msg) { return ok(a === b, msg, 'obtenido: ' + JSON.stringify(a)); }
// Un array creado dentro del sandbox de `vm` NUNCA es === a uno de aca: son
// de otro realm. Compararlos por contenido o el aserto falla siempre.
function eqLista(a, b, msg) {
  return eq(Array.from(a).join(','), b.join(','), msg);
}

// Una excepcion sin capturar MATABA el proceso y se comia los fallos que ya
// estaban registrados: el suite moria en el primer assert que explosionaba y
// el resto no se veia. Por eso cada seccion va envuelta.
async function seccion(titulo, fn) {
  console.log('\n' + titulo);
  try {
    await fn();
  } catch (e) {
    fail++;
    fallos.push(titulo + ' -> EXCEPCION: ' + (e && e.message));
  }
}

const quiet = { log() {}, info() {}, warn() {}, error() {}, debug() {} };

// --------------------------------------------------------------------------
// 0. MONTAJE
// --------------------------------------------------------------------------

/**
 * Levanta api-gw2.js REAL + el contrato de precursores REAL + el motor REAL +
 * la vista REAL + item-icons.js REAL. Devuelve las referencias y el contador.
 *
 * @param {object} cfg.red    'ok' (default) devuelve items, 'caida' rechaza
 * @param {function} cfg.rareza  id -> rareza en espanol, como lang=es
 */
function montar(cfg) {
  cfg = cfg || {};
  const c = { netas: 0, pedidos: [], caidas: 0 };

  const ls = {
    _d: {},
    getItem(k) { return k in this._d ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
    key(i) { return Object.keys(this._d)[i] || null; },
    get length() { return Object.keys(this._d).length; }
  };

  const sandbox = {
    console: quiet,
    localStorage: ls,
    setInterval() { return 0; }, clearInterval() {},
    URL, Promise, Map, Date, JSON, Object, Array, String, Number, Math, isFinite,

    fetch(url) {
      const s = String(url);
      c.netas++;
      const m = s.match(/[?&]ids=([^&]+)/);
      const ids = m ? decodeURIComponent(m[1]).split(',').map(Number) : [];
      ids.forEach((i) => c.pedidos.push(i));

      if (cfg.red === 'caida') {
        c.caidas++;
        return Promise.reject(new Error('red cortada a proposito'));
      }
      const cuerpo = ids.map((id) => ({
        id: id,
        name: 'Item ' + id,
        // El icono trae el hash del asset adentro. Un id sin hash es un icono
        // roto, y por eso el modulo no puede inventar la URL.
        icon: 'https://api.guildwars2.com/v2/item/' + id + '/icon?v=hash-' + id,
        type: 'Material',
        rarity: (cfg.rareza || function () { return 'Raro'; })(id),
        // Deliberadamente DISTINTO del color del mapa: si el modulo agrupara
        // por rarity_color, el test cae. Es el control negativo del punto 4.
        rarity_color: '#BADA55'
      }));
      return Promise.resolve({
        ok: true, status: 200, headers: { get() { return null; } },
        text() { return Promise.resolve(JSON.stringify(cuerpo)); }
      });
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const correr = (p) => vm.runInContext(leer(p), sandbox, { filename: p });
  correr('js/api-gw2.js');
  correr('js/legendary-recipes.js');
  correr('js/legendary-precursors.js');
  correr('js/legendary-tree.js');
  correr('js/legendary-tree-ui.js');
  correr('js/item-icons.js');

  return {
    sb: sandbox, c: c,
    Icons: sandbox.ItemIcons,
    Prec: sandbox.LegendaryPrecursors,
    T: sandbox.LegendaryTree,
    UI: sandbox.LegendaryTreeUI
  };
}

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FROSTFANG = 30684;

// ==========================================================================
(async function () {

  await seccion('[1] El batching lo decide getItemsMany, no el modulo nuevo', async () => {
    const m = montar({});
    const ids = Object.keys(m.Prec.byItem).map(Number);

    eq(ids.length, 907, 'el contrato de precursores tiene 907 entradas');
    eq(m.Prec.totalItems, 907, 'y totalItems lo declara, no se infiere de la cuenta');

    // MEDIDO, y no es un caso inventado: la PRIMERA entrada del contrato tiene
    // itemId 0. Por eso `ids[0]` NO sirve para probar nada de iconos, y por eso
    // los ids que viajan son 906 y no 907.
    const conCero = ids.filter((i) => i === 0);
    eq(conCero.length, 1, 'el contrato tiene exactamente 1 entrada con itemId 0');
    eq(ids[0], 0, 'y es la primera: Object.keys()[0] da 0');

    const validos = ids.filter((i) => i > 0);
    eq(validos.length, 906, 'quedan 906 ids reales');
    eq(Math.ceil(validos.length / 200), 5, '906 ids son 5 lotes de 200');
    eq(Math.ceil(ids.length / 200), 5, 'y 907 tambien darian 5: el 0 no cambia el numero de lotes');

    await m.Icons.cargar(ids);

    eq(m.c.netas, 5, '907 ids salen en 5 llamadas de red');
    // EL control negativo del punto. Si el modulo metiera su propio cliente,
    // esto daria 907 y el aserto de arriba daria el mismo fallo: por eso van
    // los dos, no uno.
    ok(m.c.netas !== ids.length,
      'control negativo: las llamadas NO son una por id',
      'netas: ' + m.c.netas + ' ids: ' + ids.length);
    eq(m.c.pedidos.length, 906, 'los 906 ids validos viajan');
    eq(new Set(m.c.pedidos).size, 906, 'y ninguno se pide dos veces');
    ok(m.c.pedidos.indexOf(0) === -1, 'el 0 no viaja');

    // NO se pregunta por un id suelto: el cap de 400 (seccion 5) se come una
    // parte cualquiera del contrato, asi que un id al azar puede volver sin
    // icono y el aserto mediria el cap, no el modulo. La pregunta es por la
    // PROPIEDAD: de los ids que la API devolvio, TODOS tienen icono y color.
    // Sandbox limpio y POCOS ids, por dos razones medidas:
    //   a) `_datos` es memoria DEL MODULO, no el cache de la capa. Pedirle a
    //      `getItemsMany` directo no llena el modulo, y el aserto mediria el
    //      sandbox equivocado.
    //   b) con 300 el cap de 400 no muerde (seccion 5), asi que aca se mide
    //      "el camino del icono funciona" y no "que id sobrevivio al recorte".
    const s = montar({});
    await s.Icons.cargar([19678, 19679, 19680]);
    eq(s.c.netas, 1, '3 ids salen en 1 llamada');
    eq(s.Icons.iconDe(19678) !== null, true, 'TODO id que volvio tiene icono');
    eq(s.Icons.colorDe(19678) !== null, true, 'TODO id que volvio tiene color');
    eq(s.Icons.colorDe(19678), '#FCD00B', 'Raro -> el color del mapa, no rarity_color');
    ok(String(s.Icons.iconDe(19678)).indexOf('/icon?v=hash-') > 0,
      'el icono es el de la respuesta', 'obtenido: ' + s.Icons.iconDe(19678));
  });

  await seccion('[2] Un itemId 0 no rompe nada', async () => {
    const m = montar({});

    let tiro = false, de0 = null;
    try { de0 = m.Icons.de(0); } catch (e) { tiro = true; }
    ok(!tiro, 'de(0) no lanza');
    eq(de0 && de0.icon, null, 'de(0).icon es null, no undefined');
    eq(de0 && de0.color, null, 'de(0).color es null');
    eq(de0 && de0.rarity, null, 'de(0).rarity es null');

    await m.Icons.cargar([0, 0, null, undefined, 'x', -5, 19678]);
    eq(m.c.netas, 1, 'de los 7 ids, solo el valido se pide (una llamada)');
    eqLista(m.c.pedidos, [19678], 'solo pidio el id bueno: ni 0, ni null, ni negativos');

    // Y que la entrada con id 0 del contrato se puede construir y pintar.
    const html = m.UI.renderTreeHTML(m.T.build(101540),
      { esc: esc, de: function (i) { return m.Icons.de(i); } });
    ok(typeof html === 'string' && html.length > 0, 'el arbol del item con id 0 se dibuja');
    ok(html.indexOf('undefined') === -1, 'y no deja "undefined" en pantalla');
  });

  await seccion('[3] fetch rejeitado: el arbol se dibuja igual, sin icono ni color', async () => {
    const m = montar({ red: 'caida' });
    const ids = Object.keys(m.Prec.byItem).map(Number);

    let rechazo = false;
    await m.Icons.cargar(ids).catch(function () { rechazo = true; });
    ok(!rechazo, 'cargar() NO rechaza cuando la red se cae');
    ok(m.c.caidas > 0, 'la red se corto de verdad (si no, este control no midio nada)');

    const uno = ids.filter((i) => i > 0)[0];
    eq(m.Icons.de(uno).icon, null, 'sin icono');
    eq(m.Icons.de(uno).color, null, 'sin color');

    const res = m.T.build(FROSTFANG);
    ok(!!res.node, 'el motor construye el arbol sin la API');
    const html = m.UI.renderTreeHTML(res,
      { esc: esc, de: function (i) { return m.Icons.de(i); } });

    ok(html.indexOf(res.node.name) !== -1, 'el nombre de la raiz esta en pantalla');
    ok(html.indexOf('<img') === -1, 'ningun <img>: no se invento ninguna URL de icono');
    ok(html.indexOf('Cargando') === -1, 'no dice "Cargando" cuando ya no hay nada que cargar');
    ok(html.indexOf('undefined') === -1 && html.indexOf('NaN') === -1,
      'ni undefined ni NaN en el HTML');
    ok(html.indexOf('color:var(--tx-1)') !== -1,
      'los nombres quedan en el color por defecto de siempre');

    const tabla = m.UI.renderTotalsHTML(res, {},
      { esc: esc, de: function (i) { return m.Icons.de(i); } });
    ok(tabla.indexOf('<table') !== -1, 'la tabla de materiales se dibuja igual');
    ok(tabla.indexOf('undefined') === -1, 'sin undefined en la tabla');

    // CONTROL NEGATIVO del punto 3: con la red sana, el MISMO render tiene
    // iconos. Sin esto, el "<img ausente" de arriba no distinguiria "degradado"
    // de "el modulo nunca pinto nada" y pasaria verde con el producto roto.
    // Pocos ids a proposito: con 300 la capa NO recorta (el cap es 400/500), y
    // asi el control negativo mide "el camino del icono funciona" y no
    // "quedaron ids en el rango que el cap borro".
    const s = montar({});
    await s.Icons.cargar(ids.slice(0, 300));
    const html2 = s.UI.renderTreeHTML(s.T.build(FROSTFANG),
      { esc: esc, de: function (i) { return s.Icons.de(i); } });
    ok(html2.indexOf('<img') !== -1, 'control negativo: con red sana el arbol SI tiene <img');
    ok(html2.indexOf('#FCD00B') !== -1, 'y SI lleva el color de rareza');
  });

  await seccion('[4] El color viene del mapa local, no del rarity_color de la API', async () => {
    // Tal cual inventory-hub.js:26-30 (el mapa canonico del proyecto).
    const ESPERADO = {
      'Chatarra': '#AAAAAA', 'Básico': '#FFFFFF', 'Bueno': '#62A4DA',
      'Obra maestra': '#1A9306', 'Raro': '#FCD00B', 'Exótico': '#FFA405',
      'Ascendido': '#FB3E8D', 'Legendario': '#974EFF'
    };
    for (const rareza of ['Chatarra', 'Básico', 'Bueno', 'Raro', 'Exótico', 'Ascendido', 'Legendario']) {
      const m = montar({ rareza: function () { return rareza; } });
      await m.Icons.cargar([19678]);
      eq(m.Icons.colorDe(19678), ESPERADO[rareza],
        'rareza ' + rareza + ' -> ' + ESPERADO[rareza]);
      eq(m.Icons.de(19678).rarity, rareza, 'la rareza guardada es la de la respuesta');
    }

    // EL CONTROL NEGATIVO DEL PUNTO. El mock devuelve SIEMPRE rarity_color
    // '#BADA55' (ver `montar`). Si el modulo usara ese campo, las 7 aserciones
    // de arriba darian '#BADA55'.
    const m2 = montar({ rareza: function () { return 'Ascendido'; } });
    await m2.Icons.cargar([19678]);
    eq(m2.Icons.colorDe(19678), '#FB3E8D', 'el color NO es el rarity_color de la respuesta');
    ok(m2.Icons.colorDe(19678) !== '#BADA55', 'control negativo: rarity_color queda afuera');

    // El mapa del modulo es el MISMO que el de inventory-hub.js.
    const hub = leer('js/inventory-hub.js');
    const bloque = hub.match(/RARITY_COLORS:\s*\{([\s\S]*?)\}/);
    ok(!!bloque, 'se encontro RARITY_COLORS en inventory-hub.js');
    if (bloque) {
      const orig = {};
      bloque[1].replace(/'([^']+)'\s*:\s*'(#[0-9A-Fa-f]{6})'/g,
        function (_, k, v) { orig[k] = v; });
      eq(Object.keys(orig).length, 8, 'el mapa canonico tiene 8 claves');
      const mio = m2.Icons.RARITY_COLORS;
      const disto = Object.keys(orig).filter((k) => mio[k] !== orig[k]);
      eq(disto.length, 0, 'el modulo tiene los MISMOS valores que inventory-hub', disto.join(','));
    }

    // Una rareza desconocida NO inventa color: null, no el de otra rareza.
    const m3 = montar({ rareza: function () { return 'Rarisimo'; } });
    await m3.Icons.cargar([19678]);
    eq(m3.Icons.colorDe(19678), null, 'una rareza desconocida da null, no un color inventado');
    eq(m3.Icons.de(19678).rarity, 'Rarisimo', 'pero la rareza cruda se conserva');
  });

  // ==========================================================================
  // 5. EL PRESUPUESTO PROPIO: 906 CON PINTAR, Y 400 SIN
  // ==========================================================================
  // ACA SE AFIRMAN LAS DOS COSAS, Y LAS DOS IMPORTAN.
  //
  // (a) CON presupuesto propio el modulo trae 906 de 906. Es el numero que
  //     todavia no existia: `cargar` pasa `cacheKey:'items_cache_armory_v1'` y un
  //     presupuesto propio, y el recorte ya no se come la mitad del arbol al
  //     recargar. Sigue siendo UN cliente (`getItemsMany`) y siguen siendo 5
  //     llamadas: no se agrego ninguna.
  //
  //     OJO con el numero del presupuesto: HB#157 subio `cacheTrim:1300` /
  //     `cacheCap:1200` porque la Armeria paso a pedir 1113 ids (907 del
  //     contrato de precursores + las 206 legendarias del catalogo, que son las
  //     RAICES del arbol y no estan en ese contrato). Esta seccion sigue
  //     midiendo 906 porque llama a `cargar` con los ids de precursores a
  //     proposito: es el caso mas chico y por eso no depende del presupuesto
  //     grande. El caso de 1113 con su cap esta en
  //     `armeria-modal-iconos-nombre.test.js`, seccion [5].
  //
  // (b) SIN opciones el cap sigue siendo 400. Esto NO es una prueba de que
  //     "el tope no existe": es EL CANDADO de los 9 call sites que usan
  //     `getItemsMany` sin pasar nada. Si alguien mueve uno de los defaults,
  //     este assert cae y el cambio se ve. Si el cap se hubiera tocado en
  //     `api-gw2.js` en vez de parametrizarse, los 9 modulos habrian cambiado
  //     de comportamiento sin haberlo pedido, y este es el que lo detecta.
  //
  // (c) CONTRASTE. El MISMO `cargar(906)` tiene que dar numeros distintos segun
  //     le lleguen o no las tres opciones: 906 contra 400. Si los dos dieran
  //     lo mismo, el `cacheKey` no estaria llegando a la capa y el test pasaria
  //     por casualidad en vez de por merito.
  await seccion('[5] Presupuesto propio: 906 con opciones, 400 sin ellas', async () => {
    const m = montar({});
    const ids = Object.keys(m.Prec.byItem).map(Number);
    const validos = ids.filter((i) => i > 0);

    // La premisa, fijada: si el contrato de precursores cambia, este numero
    // avisa en vez de dejar que las aserciones de abajo midan otra cosa.
    eq(validos.length, 906, 'la premisa: 906 ids validos en el contrato de precursores');

    // ---------------------------------------------------------------------
    // (a) CON LAS TRES OPCIONES
    // ---------------------------------------------------------------------
    // Sandbox NUEVO solo para el `cargar`: mezclar mediciones en el mismo
    // sandbox daria numeros que no miden nada, porque la segunda llamada
    // encontraria en el cache lo que escribio la primera.
    const ma = montar({});
    await ma.Icons.cargar(ids);
    const conIcono = validos.filter((i) => ma.Icons.iconDe(i)).length;
    eq(conIcono, 906, '(a) con presupuesto propio: 906 de 906 con icono');
    eq(ma.c.netas, 5, '(a) y siguen siendo 5 llamadas: no se agrego ninguna');

    // El presupuesto propio esta SEPARADO del de los 9 call sites: las dos
    // claves conviven y ninguna pisa a la otra.
    const conPropio = ma.sb.localStorage.getItem('items_cache_armory_v1:es');
    ok(conPropio, '(a) se escribio items_cache_armory_v1:es, que no es la clave por defecto');
    ok(!ma.sb.localStorage.getItem('items_cache_v1:es'),
      '(a) y la clave por defecto NO se toco: son dos presupuestos, no uno movido');

    // ---------------------------------------------------------------------
    // (b) SIN OPCIONES — EL CANDADO DE LOS 9 CALL SITES
    // ---------------------------------------------------------------------
    // Directo a la capa, sin item-icons de por medio: el recorte es de ella.
    const mb = montar({});
    const directo = await mb.sb.GW2Api.getItemsMany(validos, { nocache: false });
    eq(mb.c.netas, 5, '(b) sin opciones: 5 llamadas para 906 ids');
    eq(directo.length, 400, '(b) y devuelve 400: el cap por defecto sigue siendo 400');
    ok(!mb.sb.localStorage.getItem('items_cache_armory_v1:es'),
      '(b) sin opciones no se toca la clave de la Armeria');

    // ---------------------------------------------------------------------
    // (c) CONTRASTE: EL MISMO `cargar`, CON Y SIN EL PRESUPUESTO
    // ---------------------------------------------------------------------
    // Se envuelve `getItemsMany` para que se trague las tres opciones. No es un
    // modulo nuevo ni una copia del cliente: es la misma llamada con el
    // plumbing caido, que es exactamente lo que este test tiene que separar
    // del azar.
    const mc = montar({});
    const real = mc.sb.GW2Api.getItemsMany.bind(mc.sb.GW2Api);
    mc.sb.GW2Api.getItemsMany = function (ids2, opts) {
      return real(ids2, { nocache: false });
    };
    await mc.Icons.cargar(ids);
    const sinIcono = validos.filter((i) => mc.Icons.iconDe(i)).length;
    eq(sinIcono, 400, '(c) contraste: el MISMO cargar sin las opciones da 400');
    ok(conIcono !== sinIcono,
      '(c) y los dos numeros son distintos: el cacheKey si esta llegando a la capa',
      'con presupuesto: ' + conIcono + ' / sin presupuesto: ' + sinIcono);

    // ---------------------------------------------------------------------
    // (d) SIN `cacheKey`, `cacheTrim` Y `cacheCap` SE IGNORAN
    // ---------------------------------------------------------------------
    // Este es el aserto que mas protege, y protege a los 9 MODULOS, no al
    // arbol. Honrar trim/cap sin cambiar de clave moveria el presupuesto
    // COMPARTIDO de `items_cache_v1` y expulsaria a los 9 call sites. Y el
    // conteo de iconos NO lo detectaria: los 906 volverian con icono igual, y
    // el (a) seguiria en verde mientras el cache compartido cambia de
    // presupuesto por debajo. Con las tres como bloque, sin `cacheKey` los
    // otros dos no se mueven.
    const md = montar({});
    const sinClave = await md.sb.GW2Api.getItemsMany(validos, {
      nocache: false, cacheTrim: 1000, cacheCap: 906
    });
    eq(sinClave.length, 400,
      '(d) trim y cap SIN cacheKey: sigue el cap compartido de 400, no 906');
    ok(!md.sb.localStorage.getItem('items_cache_armory_v1:es'),
      '(d) y no se crea la clave de la Armeria: no hubo presupuesto propio');

    // Y el caso al reves, que es el que se usa hoy: con las tres, se mueven.
    const md2 = montar({});
    const conTres = await md2.sb.GW2Api.getItemsMany(validos, {
      nocache: false, cacheKey: 'items_cache_armory_v1', cacheTrim: 1000, cacheCap: 906
    });
    eq(conTres.length, 906, '(d) con las tres si: 906, que es el presupuesto propio');

    // ---------------------------------------------------------------------
    // (e) `cap` MAYOR QUE LAS ENTRADAS: no se pierde nada
    // ---------------------------------------------------------------------
    // `slice(0, keys.length - cap)` con cap > keys.length se vuelve NEGATIVO y
    // `slice(0, -n)` corta del otro extremo: no deja `cap` entradas, deja
    // `cap - keys.length`.
    //
    // EL NUMERO EXACTO IMPORTA, y por eso este caso usa 1000 y no un numero
    // "mas grande". La ventana en la que el defecto muerde es
    // `keys.length < cap < 2 * keys.length`. Con cap >= 2 * keys.length el
    // negativo tiene un modulo mayor que el largo del array, `slice` recorta a
    // `[]` y NO borra nada: el caso pasa con el fix y sin el, y no mide. Con
    // cap 1000 sobre 906 entradas el negativo es -94, `slice(0,-94)` devuelve
    // 812 elementos y se COME 812: quedan 94 de 906. Medido.
    //
    // Ojo al leer el fallo: `sorted` esta en orden ASCENDENTE por ts, y
    // `slice(0, n)` se come los PRIMEROS n, o sea los MAS VIEJOS. Sin el fix
    // sobreviven 94 de 906 y son las 94 mas recientes.
    const me = montar({});
    const largo = await me.sb.GW2Api.getItemsMany(validos, {
      nocache: false, cacheKey: 'items_cache_armory_v1', cacheTrim: 500, cacheCap: 1000
    });
    eq(largo.length, 906, '(e) cap 1000 sobre 906 entradas: no se pierde ninguna');

    // El otro borde de la ventana, que el fix NO debe romper: cap >= 2x el
    // largo. Ahi el negativo excede el largo del array y `slice` recorta a
    // `[]`, asi que este caso da 906 CON el fix y tambien SIN el. No es un
    // control del defecto (no cae), es un limite: el `Math.max(0, ...)` no
    // puede empezar a recortar cuando antes no recortaba.
    //
    // LA REGLA GENERAL, y va mas alla de este cache (Pablo, HB#154). La
    // ventana `length < n < 2 * length` NO es una propiedad de la Armeria ni
    // de `getItemsMany`: es la ventana de `slice(0, length - n)` sobre
    // CUALQUIER array. En el rango medio `slice` recorta del extremo
    // equivocado y se come `length - n` entradas; fuera de el, o recorta a
    // `[]` (n >= 2*length) o no recorta (n <= length), y en los dos bordes
    // "no se pierde nada" es verdad SIN el fix tambien. O sea: un test de
    // este defecto QUE ESTE ABAJO, colocado en el borde equivocado, da verde
    // con el bug vivo, que es justo lo que un control tiene que evitar.
    //
    // Para CUALQUIER recorte por presupuesto que se escriba en el futuro: el
    // caso que mide tiene que caer DENTRO de la ventana, y hace falta un
    // negativo que caiga FUERA (donde el bug es invisible) para demostrar
    // que el caso de adentro cae y el de afuera no.
    const me2 = montar({});
    const largo2 = await me2.sb.GW2Api.getItemsMany(validos, {
      nocache: false, cacheKey: 'items_cache_armory_v1', cacheTrim: 500, cacheCap: 2000
    });
    eq(largo2.length, 906, '(e) cap 2000 (>= 2x el largo): tampoco se pierde ninguna');

    // Lo que NO puede pasar: que el recorte haga algo peor que dejar sin pintar.
    const res5 = mc.T.build(FROSTFANG);
    const html = mc.UI.renderTreeHTML(res5,
      { esc: esc, de: function (i) { return mc.Icons.de(i); } });
    ok(html.length > 0, 'el arbol se dibuja igual con 400 de 906');
    ok(html.indexOf('undefined') === -1 && html.indexOf('NaN') === -1,
      'sin undefined ni NaN: las filas sin icono no rompen el render');
    ok(html.indexOf(res5.node.name) !== -1, 'y el nombre de cada nodo sigue en pantalla');
  });

  console.log('\n' + (fail === 0 ? 'SUITE OK' : 'SUITE CON FALLOS') + '  ' + pass + ' pass / ' + fail + ' FAIL');
  if (fallos.length) { console.log('\nLo que cayo:'); fallos.forEach((f) => console.log('  - ' + f)); }
  process.exit(fail === 0 ? 0 : 1);
})();