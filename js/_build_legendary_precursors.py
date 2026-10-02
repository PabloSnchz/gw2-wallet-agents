#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera js/legendary-precursors.js: los precursores del arbol de fabricacion.

POR QUE ESTE ARCHIVO ESTA SEPARADO DE legendary-recipes.js
  legendary-recipes.js   los 206 del catalogo. Se carga siempre. 107 KB.
  legendary-precursors.js los 907 que aparecen bajando el arbol. Bajo demanda.

Pablo decidio el corte (2026-10-02) y el motivo concreto: la mayoria de
quien abre la app nunca abre un arbol de crafteo, y pagar el peso de los
precursores en cada carga por algo que casi nadie mira es caro. Ademas, si
el fetch del archivo falla, la app sigue entera y el control se ve igual con
el mensaje "receta no disponible para este item".

LO QUE ESTE ARCHIVO RESPONDE Y LO QUE NO
  Responde: de que se hace cada PIEZA de una legendaria, con cantidades.
  No responde: si la tengo o me falta. Eso es del inventario, en runtime.

MEDIDAS (2026-10-02, sobre tools/cl_recipes.json con 634 recetas)
  Recorrido transitivo desde las 206 del catalogo:
    206 catalogo  = 142 con receta + 64 sin receta publicada
    907 fuera del catalogo = 471 con receta + 436 sin receta (materiales base)

  Pablo medio 903 y 500. La diferencia esta localizada y no es un error de
  ninguno: sus 903 excluyen las 4 recetas tipo `vendor` ("Output de NPC"),
  que no son crafteables. Sus 500 hojas = 436 materiales base + 64 items del
  catalogo sin receta, que son hojas por no tener receta pero NO son
  materiales: son legendarias. Aqui no entran, porque viven en el contrato
  del catalogo.

  O sea: 907 = 903 + 4 vendor. Las 4 se emiten igual, con dataStatus
  'vendor', porque si un item del arbol las referencia y no estan en el
  archivo, el consumidor se encuentra con una arista a un id desconocido.

  LAS 64 SIN NOMBRE, RESUELTAS
  Pablo pidio medir si eran legendarias del catalogo o items de otro tipo,
  porque de eso dependia si habia que ir a la API. Medido: las 64 son
  exactamente los items del catalogo sin receta publicada, y estan 64 de 64
  en js/legendary-data.js con name y nameEs. Van por ahi. CERO llamadas a
  la API, y no se anotan en el reporte de precios porque no se compra nada.

LO QUE LA FUENTE NO TIENE, Y QUE NO SE INVENTA
  1) ICONOS. 0 de 634 recetas traen icono en los ingredientes. No hay de
     donde sacarlos en build, y no se escribe una URL inventada: por eso
     este archivo NO lleva campo icon. El consumidor resuelve el icono en
      runtime, contra la API, desde `js/item-icons.js`, que ademas es
     lo correcto: la URL del icono de GW2 tiene el hash del asset adentro,
     y no se puede adivinar.
  2) NOMBRES EN ESPANOL. La fuente trae el nombre en ingles y nada mas.
     El contrato del catalogo si tiene nameEs, porque legendary-data.js lo
     trae. Aqui no hay equivalente. El nombre sale en ingles y esta escrito
     en el archivo para que nadie lo lea como un olvido.

Si alguna vez la API pasa a traer datos de item en español o icono en el
mismo lote que se pide para otra cosa, se agrega aca. No antes.
"""

import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FUENTE = os.path.join(ROOT, "tools", "cl_recipes.json")
CATALOGO = os.path.join(ROOT, "js", "legendary-data.js")
SALIDA = os.path.join(ROOT, "js", "legendary-precursors.js")


def js_str(s):
    if s is None:
        s = ""
    return '"' + str(s).replace("\\", "\\\\").replace('"', '\\"') + '"'


def read_source():
    with open(FUENTE, "r", encoding="utf-8") as f:
        recetas = json.load(f).get("recipes", [])
    if not recetas:
        raise SystemExit("La fuente no tiene recetas.")
    por_salida = {}
    for r in recetas:
        iid = int(r["output_id"])
        if iid in por_salida:
            raise SystemExit("La fuente repite la salida %d." % iid)
        por_salida[iid] = r
    return por_salida


def read_catalog():
    with open(CATALOGO, "r", encoding="utf-8") as f:
        src = f.read()
    m = re.search(r"var LEGENDARY_CATALOG = \[(.*?)\n\];", src, re.S)
    if not m:
        raise SystemExit("No se encontro LEGENDARY_CATALOG en " + CATALOGO)
    items = json.loads("[" + m.group(1) + "]")
    cat = {}
    for it in items:
        cat[int(it["id"])] = it
    return cat


def recorrer(raices, por_salida):
    """Alcanzable desde las raices, transitivo. Devuelve (vistos, hojas)."""
    vistos = set(raices)
    hojas = set()
    cola = list(raices)
    while cola:
        r = por_salida.get(cola.pop())
        if r is None:
            continue
        for ing in r.get("ingredients", []):
            c = int(ing["item_id"])
            if c in vistos:
                continue
            vistos.add(c)
            if c in por_salida:
                cola.append(c)
            else:
                hojas.add(c)
    return vistos, hojas


def build(por_salida, catalogo):
    raices = [i for i in catalogo if i in por_salida]
    vistos, hojas = recorrer(raices, por_salida)

    # Nombre que la fuente le da a cada item como ingrediente.
    nombre_ing = {}
    for r in por_salida.values():
        for ing in r.get("ingredients", []):
            c = int(ing["item_id"])
            if ing.get("name") and c not in nombre_ing:
                nombre_ing[c] = ing["name"]

    entradas = {}
    conteo = {"recipe": 0, "material": 0, "vendor": 0}
    por_tipo = {}

    fuera = sorted(i for i in vistos if i not in catalogo)
    for iid in fuera:
        r = por_salida.get(iid)
        if r is None:
            entradas[iid] = {
                "name": nombre_ing.get(iid, ""),
                "dataStatus": "material",
                "craftType": "none",
                "outputCount": 1,
                "disciplines": [],
                "isMaterial": True,
                "ingredients": [],
            }
            conteo["material"] += 1
            continue

        tipo = r.get("type", "")
        por_tipo[tipo] = por_tipo.get(tipo, 0) + 1
        es_vendor = tipo == "vendor"

        ings = []
        for ing in r.get("ingredients", []):
            ings.append({
                "itemId": int(ing["item_id"]),
                "count": int(ing.get("count", 1)),
                "name": ing.get("name", ""),
            })
        entradas[iid] = {
            "name": r.get("name") or nombre_ing.get(iid, ""),
            "dataStatus": "vendor" if es_vendor else "recipe",
            "craftType": tipo,
            "outputCount": int(r.get("output_count", 1)),
            "disciplines": r.get("disciplines", []),
            "isMaterial": True,
            "ingredients": ings,
        }
        conteo["vendor" if es_vendor else "recipe"] += 1

    return entradas, conteo, por_tipo, len(raices), hojas


def verify(entradas):
    sin_nombre = [i for i, e in entradas.items() if not (e.get("name") or "").strip()]
    if sin_nombre:
        raise SystemExit(
            "%d entradas sin nombre: %s. Un nombre vacio es un dato perdido en "
            "silencio, asi que esto para el build en vez de avisar."
            % (len(sin_nombre), ", ".join(str(x) for x in sin_nombre[:10]))
        )

    # ARISTAS SIN ID RESOLUBLE.
    # La fuente tiene 2 recetas cuyo ingrediente trae item_id 0. Medido:
    #   101540 (mystic_forge) -> "Relic (any)", que es un comodin real: la
    #            receta pide CUALQUIER reloc y la fuente no tiene ids de relocs.
    #   109686 (vendor)       -> "Testimony of Castoran Heroics", que si existe
    #            pero la fuente no trae su id.
    # O sea que el 0 NO es un item ni un wildcard uniforme: es un hueco de
    # datos, en dos lugares con dos significados distintos.
    #
    # No se inventa un id y no se borra la arista: el nombre esta, y sin el
    # nombre el usuario ve un numero. Se conserva con itemId 0 y la arista
    # queda marcada para que el consumidor sepa que no puede contarla contra
    # el inventario. Cortar el build aca seria tapar el dato, no resolverlo.
    sin_id = []
    huerfanos = set()
    for iid, e in entradas.items():
        for ing in e["ingredients"]:
            ref = ing["itemId"]
            if ref == 0:
                sin_id.append((iid, ref, ing["name"], ing["count"]))
            elif ref not in entradas and ref not in read_catalog_ids_cache:
                huerfanos.add(ref)
    if huerfanos:
        raise SystemExit(
            "Aristas a ids que no estan ni en este archivo ni en el catalogo: "
            "%s. El consumidor bajaria el arbol y se encontraria un id "
            "desconocido sin avisar." % sorted(huerfanos)[:20]
        )
    return sin_id, huerfanos, sin_nombre


read_catalog_ids_cache = set()


def build_js(entradas, conteo, por_tipo, total_hojas, sin_id):
    L = []
    a = L.append
    a("// GENERADO POR js/_build_legendary_precursors.py -- NO EDITAR A MANO.")
    a("// Fuente: tools/cl_recipes.json. Correr el generador para cambiarlo.")
    a("//")
    a("// Precursores del arbol de fabricacion. Se carga BAJO DEMANDA: solo cuando")
    a("// se abre un arbol. Ver la cabecera del generador para por que esta")
    a("// separado de legendary-recipes.js.")
    a("//")
    a("// MEDIDAS")
    a("//   entradas totales : %d" % len(entradas))
    a("//   con receta       : %d" % conteo["recipe"])
    a("//   materiales base  : %d" % conteo["material"])
    a("//   vendor (NPC)     : %d   <- no crafteable, sale de la fuente" % conteo["vendor"])
    a("//   hojas totales    : %d" % total_hojas)
    a("//")
    a("// LO QUE NO TIENE, Y POR QUE")
    a("//   No hay campo `icon`: la fuente no trae icono (0 de 634 recetas).")
    a("//   El icono NO se resuelve aca: no hay forma de hacerlo sin red, y")
    a("//   una URL inventada seria peor que ninguna. Lo resuelve")
    a("//   `js/item-icons.js`, que orquesta GW2Api.getItemsMany y devuelve")
    a("//   icono y color por id.")
    a("//   No hay `nameEs`: la fuente solo trae el nombre en ingles.")
    a("//")
    a("// ARISTAS SIN ID (%d). itemId 0 no es un item." % len(sin_id))
    a("//   La fuente tiene 2 recetas cuyo ingrediente viene con item_id 0, y las")
    a("//   dos son alcanzables desde el catalogo:")
    for padre, _, nombre, cant in sin_id:
        a("//     %s  %d x %s" % (padre, cant, nombre))
    a("//   No es un wildcard uniforme: en 101540 es 'Relic (any)' (la receta pide")
    a("//   cualquier reloc y la fuente no tiene ids de relocs) y en 109686 es")
    a("//   'Testimony of Castoran Heroics' (que si existe, pero sin id en la")
    a("//   fuente). La arista se conserva con su nombre y con itemId 0 para que el")
    a("//   consumidor sepa que NO puede contarla contra el inventario. Inventar un")
    a("//   id seria peor: daria un total de materiales que no existe.")
    a("//")
    a("// CONVENCION DE NIVELES")
    a("//   level = raiz es 1. depth = el nivel de la hoja mas profunda de ese")
    a("//   item, contando la hoja. Solo informativo: el arbol lo construye el")
    a("//   cliente y NO hay que usar depth para recorrer nada.")
    a("//")
    a("var LegendaryPrecursors = (function(){")
    a("  'use strict';")
    a("  var BY = {")
    for iid in sorted(entradas):
        e = entradas[iid]
        ings = ",".join(
            '{ "itemId": %d, "count": %d, "name": %s }'
            % (i["itemId"], i["count"], js_str(i["name"]))
            for i in e["ingredients"]
        )
        disc = ",".join(json.dumps(d) for d in e["disciplines"])
        a('    "%d": { "name": %s, "dataStatus": "%s", "craftType": "%s", '
          '"outputCount": %d, "disciplines": [%s], "isMaterial": %s, '
          '"ingredients": [%s] },'
          % (iid, js_str(e["name"]), e["dataStatus"], e["craftType"],
             e["outputCount"], disc, "true" if e["isMaterial"] else "false", ings))
    a("  };")
    a("  return {")
    a("    byItem: BY,")
    a("    counts: %s," % json.dumps(conteo))
    a("    totalItems: %d," % len(entradas))
    a("    get: function(id){ return BY[String(id)] || null; },")
    a("    has: function(id){ return Object.prototype.hasOwnProperty.call(BY, String(id)); }")
    a("  };")
    a("})();")
    a("if (typeof module !== 'undefined' && module.exports) module.exports = LegendaryPrecursors;")
    a("if (typeof window !== 'undefined') window.LegendaryPrecursors = LegendaryPrecursors;")
    return "\n".join(L) + "\n"


def main():
    global read_catalog_ids_cache
    por_salida = read_source()
    catalogo = read_catalog()
    read_catalog_ids_cache = set(catalogo.keys())

    entradas, conteo, por_tipo, n_raices, hojas = build(por_salida, catalogo)
    sin_id, huerfanos, sin_nombre = verify(entradas)

    js = build_js(entradas, conteo, por_tipo, len(hojas), sin_id)
    with open(SALIDA, "w", encoding="utf-8", newline="\n") as f:
        f.write(js)

    kb = os.path.getsize(SALIDA) / 1024.0
    print("Precursores generados: %s" % SALIDA)
    print("   entradas            : %d" % len(entradas))
    print("   con receta          : %d" % conteo["recipe"])
    print("   materiales base     : %d" % conteo["material"])
    print("   vendor (NPC)        : %d" % conteo["vendor"])
    print("   peso                : %.0f KB  (el catalogo sigue en 107 KB)" % kb)
    print("   reparto por tipo    : %s" % json.dumps(por_tipo, sort_keys=True))
    print("   sin nombre          : %d" % len(sin_nombre))
    print("   aristas sin id (0)  : %d   <- ver la nota del banner" % len(sin_id))
    for padre, _, nombre, cant in sin_id:
        print("      %s -> %d x %s" % (padre, cant, nombre))
    print("   aristas huerfanas   : %d" % len(huerfanos))
    print("   hojas (materiales)  : %d" % len(hojas))
    print()
    print("   CONTRASTE con Pablo: 903 = %d - %d vendor" % (len(entradas), conteo["vendor"]))
    print("   Sus 500 hojas = %d materiales base + 64 del catalogo sin receta."
          % len(hojas))
    if huerfanos:
        print("\nARISTAS A IDS QUE NO ESTAN EN ESTE ARCHIVO NI EN EL CATALOGO: %s"
              % sorted(huerfanos)[:20])
    print("\n   Contrato del catalogo (206, siempre cargado): %s" %
          os.path.join(ROOT, "js", "legendary-recipes.js"))
    print("   Este archivo: se carga solo al abrir un arbol.")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    main()