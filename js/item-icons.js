/**
 * item-icons.js — icono y color de rareza de un item, resueltos desde la API.
 *
 * QUE ES Y QUE NO ES
 * Este archivo NO es un cliente de items. El cliente ya existe y esta probado:
 * `GW2Api.getItemsMany(ids, opts)` (api-gw2.js:1779) corta en lotes de 200,
 * cachea por id en `items_cache_v1:<lang>`, deduplica la entrada, reintenta el
 * 206 parcial y degrada lote por lote cuando la red falla. Escribir un segundo
 * cliente aca seria el defecto exacto que la arquitectura prohibe: dos caminos
 * para pedir lo mismo, y el que se rompe es el que nadie prueba.
 *
 * Lo UNICO que hace este archivo es:
 *   1) juntar los ids de un arbol entero en UNA llamada a `getItemsMany`
 *   2) guardar el resultado en un mapa id -> {icon, rarity, color}
 *   3) derivar el color con el mapa de rareza que ya usa el resto de la app
 *
 * DE DONDE SALE EL COLOR, Y POR QUE NO SE AGRUPA POR rarity_color
 * El color sale de `RARITY_COLORS[rarity]`. La API tambien trae `rarity_color`,
 * pero ese NO se usa: los coleccionables tienen un color propio que no es el de
 * su rareza, y usarlo solo aca dejaria la Armeria pintando de una forma y los
 * otros cuatro modulos de otra. Es la regla del transversal #6 al reves.
 *
 * La rareza llega YA TRADUCIDA. `CFG.LANG` es 'es' (api-gw2.js:457), y con
 * lang=es el endpoint devuelve "Ascendido", "Legendario", "Exotico". Por eso
 * `RARITY_COLORS[rarity]` funciona sin mapa de traduccion: es lo que ya hacen
 * los otros consumidores (converter-modal.js:620). Si alguna vez `rarity`
 * llegara en ingles, el acceso directo daria undefined y TODA la app saldria
 * en blanco, no solo este modulo.
 *
 * LA QUINTA COPIA DEL MAPA
 * RARITY_COLORS ya esta copiado en inventory-hub.js:26, router.js:44,
 * wv-shop-ui.js:42 y converter-modal.js:411. Este es el quinto, y se declara
 * como deuda en vez de esconderse. La salida correcta es exponer uno solo y
 * apuntar los cinco a el; es un cambio de cuatro archivos que no se hizo aca
 * porque ninguno de los cuatro estaba en el alcance de este trabajo.
 * Si `window.RARITY_COLORS` aparece algun dia, esta copia se apaga sola.
 *
 * SIN CACHE PROPIO, A PROPOSITO
 * El cache persistente ya lo tiene `getItemsMany`. Este mapa vive en memoria de
 * la sesion y se arma con UNA llamada por tanda de ids: el batch de 200, el cache
 * por id y la deduplicacion son de `getItemsMany`, no de aca. Un segundo cache
 * seria una segunda fuente de verdad sobre los mismos ids.
 *
 * CUANDO FALLA LA RED
 * `getItemsMany` ya degrada: cada lote va con su propio `.catch`, asi que un
 * fallo devuelve lo que se pudo traer y no lanza. Este modulo no re-inventa el
 * camino degradado: resuelve igual, deja los ids sin datos, y la vista los
 * dibuja sin icono y sin color. Un arbol con el nombre sin pintar es mil veces
 * mejor que un arbol que no se dibuja.
 */
(function (root) {
  'use strict';

  var LOG = '[ItemIcons]';

  // Quinta copia, documentada arriba. Mismo orden y mismos valores que
  // inventory-hub.js:26-30.
  var RARITY_COLORS = {
    'Chatarra': '#AAAAAA',
    'Básico': '#FFFFFF',
    'Bueno': '#62A4DA',
    'Obra maestra': '#1A9306',
    'Raro': '#FCD00B',
    'Exótico': '#FFA405',
    'Ascendido': '#FB3E8D',
    'Legendario': '#974EFF'
  };

  // "id" -> { icon, rarity, color }
  var _datos = {};
  // La tanda en vuelo. Dos cargas seguidas sobre el mismo arbol no pueden
  // disparar dos peticiones del mismo set de ids: se pegarian y la segunda
  // recibiria un array vacio de la primera.
  // receberia un array vacio del primero.
  var _vuelo = null;

  function _mapaDeColores() {
    return (root.RARITY_COLORS && typeof root.RARITY_COLORS === 'object')
      ? root.RARITY_COLORS
      : RARITY_COLORS;
  }

  function _colorDe(rarity) {
    if (!rarity) return null;
    return _mapaDeColores()[rarity] || null;
  }

  function _api() {
    var api = root.GW2Api;
    return (api && typeof api.getItemsMany === 'function') ? api : null;
  }

  // Id 0 y null se van antes de pedir. `getItemsMany` solo filtra `!= null`
  // (api-gw2.js:1781), asi que el 0 PASARIA y la API lo rechaza con 404. Las
  // dos aristas con itemId 0 del contrato de precursores (Relic any en 101540,
  // Testimony of Castoran Heroics en 109686) no son items: filtrarlas aca es lo
  // que hace que un id 0 no pueda romper el render.
  function _idsUtiles(ids) {
    var vistos = {};
    var out = [];
    if (!ids || !ids.length) return out;
    for (var i = 0; i < ids.length; i++) {
      var id = Number(ids[i]);
      if (!id || !isFinite(id) || id < 0) continue;
      var k = String(id);
      if (vistos[k]) continue;
      vistos[k] = 1;
      out.push(id);
    }
    return out;
  }

  /**
   * Pide los datos de N ids. Resuelve siempre; nunca rechaza.
   * @param {number[]} ids
   * @returns {Promise<Object>} el mapa id -> {icon, rarity, color}
   */
  function cargar(ids) {
    var faltan = _idsUtiles(ids).filter(function (id) { return !_datos[String(id)]; });

    if (!faltan.length) return Promise.resolve(_datos);

    var api = _api();
    // Sin API todavia no es un error: el arbol se dibuja sin icono y sin color.
    if (!api) return Promise.resolve(_datos);

    if (_vuelo) return _vuelo.then(function () { return cargar(ids); });

    _vuelo = api.getItemsMany(faltan, { nocache: false })
      .then(function (items) {
        (items || []).forEach(function (it) {
          if (!it || it.id == null) return;
          var id = Number(it.id);
          if (!id || !isFinite(id)) return;
          _datos[String(id)] = {
            icon: it.icon || null,
            rarity: it.rarity || null,
            color: _colorDe(it.rarity)
          };
        });
      })
      .catch(function (e) {
        // `getItemsMany` degrada lote por lote, asi que llegar aca significa que
        // fallo algo mas serio que una llamada. Se avisa y se sigue: el arbol
        // tiene que verse igual.
        if (root.console && root.console.warn) root.console.warn(LOG, 'cargar', e);
      })
      .then(function () {
        _vuelo = null;
        return _datos;
      });

    return _vuelo;
  }

  /** Lo que se sabe de un id. SIEMPRE un objeto, nunca undefined. */
  function de(id) {
    return _datos[String(id)] || { icon: null, rarity: null, color: null };
  }

  function iconDe(id) { return de(id).icon; }
  function colorDe(id) { return de(id).color; }

  /** Para los tests: olvidar lo aprendido sin tocar la API. */
  function _reset() {
    _datos = {};
    _vuelo = null;
  }

  var ItemIcons = {
    cargar: cargar,
    de: de,
    iconDe: iconDe,
    colorDe: colorDe,
    RARITY_COLORS: RARITY_COLORS,
    _reset: _reset
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ItemIcons;
  if (typeof root !== 'undefined' && root) root.ItemIcons = ItemIcons;

})((typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this)));