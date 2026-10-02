#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
js/_build_legendary_recipes.py -> js/legendary-recipes.js

CONTRATO de fabricacion de las 206 legendarias del catalogo.

Por que este archivo existe y no se lee tools/cl_recipes.json en el navegador:

  1. tools/cl_recipes.json NO se versiona (tools/.gitignore es `*`). Si el
     tracker lo leyera en runtime, un clon limpio tendria la Armeria sin
     recetas y sin ningun aviso: es el mismo modo de fallo que
     js/_legendary_items_full.json, que ya motivo una regla en el build del
     catalogo.
  2. El archivo tiene 634 recetas y 2340 ingredientes. Mandarlo entero por la
     red para pintar 5 cards es gasto sin necesidad.

  El contrato por lo tanto NO es la receta: es lo que la cola de crafteo necesita
  para distinguir tres cosas que se ven iguales y significan distinto:

    craftType   'mystic_forge' | 'crafting' | 'none'
    dataStatus  'recipe' | 'no_recipe' | 'placeholder'

  'crafting' es de primera clase, no un caso raro: las 18 piezas Obsidian
  (6 por peso) son `crafting` con disciplina y NO tienen receta de Forja
  Mistica. Por eso el campo no puede ser un `hasRecipe: boolean`: eso pierde
  la informacion que separa "se craftea con un hacha" de "se mete en la
  forja".

  Y por que el archivo lista los 206 y no solo los 142 que tienen receta:
  una clave ausente tiene que ser indistinguible de un BUG de build, no de
  "esta legendaria no se fabrica". Si los 206 estan, `get(82098)` devuelve
  craftType 'none' y el consumidor nunca tiene que preguntarse si le
  falto informacion o si la pieza no tiene receta.

Metodo de verificacion (ARME_TRABAJO_NOCHE.md seccion 4), corrido y medido el
2026-10-02 con tools/hb122-verificar-items.cjs:

  - 1135 de 1136 ids existen en /v2/items. El unico que no existe es
    item_id 0 ("Relic (any)"), que aparece en UNA receta de vendor (109686,
    Dugan) que no es del catalogo. Los 206 del catalogo y los 930 materiales
    que usan las 142 recetas del catalogo existen TODOS.
  - 0 cantidades no enteras positivas sobre 2340 ingredientes.
  - 0 nombres vacios.
  - 0 nombres que difieren de /v2/items. Muestra manual del 5% (49 de 930):
    los 49 coinciden con la API y a ojo son los nombres correctos del juego.

NO se usa /v2/recipes/search?output= como oraculo: devuelve [] incluso para
outputs conocidos como 30684, y un [] es indistinguible de "sin receta".

Uso:
    python js/_build_legendary_recipes.py
    python js/_build_legendary_recipes.py --out <ruta>    # comparar sin pisar
"""

import json
import os
import re
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "tools", "cl_recipes.json")
CATALOG = os.path.join(ROOT, "js", "legendary-data.js")
OUTPUT_FILE = os.path.join(ROOT, "js", "legendary-recipes.js")

# El marcador de cuenta que GW2 crea al desbloquear una legendaria. No es una
# legendaria: es el objeto que registra el desbloqueo. Va DECLARADO en el
# contrato y no filtrado en silencio, para que el dia que GW2 le cambie el
# nombre el filtro deje de matchear y eso se vea, en vez de que el item
# desaparezca del filtro y nadie sepa por que.
PLACEHOLDER_ID = 95093
PLACEHOLDER_NAME = "Legendary Equipment Unlocked!"

NO_RECIPE_NOTE = (
    "La fuente (tools/cl_recipes.json) no publica receta para esta pieza. "
    "No es lo mismo que 'sin datos': el id se verifico contra /v2/items y "
    "existe, y el resto de la fuente se pudo leer. Lo que no hay es la receta."
)

PLACEHOLDER_NOTE = (
    "Marcador de cuenta, no una legendaria. GW2 lo crea al desbloquear una "
    "legendaria y por eso aparece en el catalogo con un nombre propio. Si GW2 "
    "le cambia el nombre, el filtro tiene que dejar de matchear y eso tiene que "
    "verse; por eso esta declarado aca y no descartado en silencio."
)

# craftType -> lo que la API de la fuente llamo "type". 'vendor' no llega:
# las 4 recetas de vendor de la fuente son de items que no son del catalogo
# (Dugan y Miyani), y si alguna llegara el build tiene que fallar en vez de
# inventarle un craftType.
SOURCE_TYPE_TO_CRAFT = {
    "mystic_forge": "mystic_forge",
    "crafting": "crafting",
}


def read_catalog_ids():
    """Ids del catalogo, leidos del artefacto generado.

    Se lee el .js y no el script que lo genero a proposito: el contrato tiene
    que quedar atado al CATALOGO QUE SE SIRVE, que es el unico del que la cola
    puede recibir un id. Si los dos se separan, el error tiene que estar en el
    contrato, que es el que se lee de las dos formas.
    """
    with open(CATALOG, "r", encoding="utf-8") as f:
        src = f.read()
    m = re.search(r"var LEGENDARY_CATALOG = \[(.*?)\n\];", src, re.S)
    if not m:
        raise SystemExit("No se encontro 'var LEGENDARY_CATALOG = [...]' en " + CATALOG)
    ids = [int(x) for x in re.findall(r'"id":\s*(\d+)', m.group(1))]
    if not ids:
        raise SystemExit("El catalogo no tiene ids: el artefacto esta vacio o mal formado")
    return ids


def build_entries(catalog_ids, recipes):
    by_output = {}
    for r in recipes:
        out = int(r["output_id"])
        if out in by_output:
            # Dos recetas para el mismo output harian ambigua la eleccion de
            # craftType. Medido: 0 de 634. Si aparece una, el build para.
            raise SystemExit(
                "Dos recetas para el output %d. El contrato no sabe cual elegir; "
                "hace falta una regla explicita, no un 'el que aparezca primero'." % out
            )
        by_output[out] = r

    entries = {}
    counts = {"mystic_forge": 0, "crafting": 0, "none": 0}
    status = {"recipe": 0, "no_recipe": 0, "placeholder": 0}

    for item_id in catalog_ids:
        r = by_output.get(item_id)
        if r is None:
            if item_id == PLACEHOLDER_ID:
                entries[item_id] = {
                    "craftType": "none",
                    "dataStatus": "placeholder",
                    "ingredients": [],
                }
                status["placeholder"] += 1
            else:
                entries[item_id] = {
                    "craftType": "none",
                    "dataStatus": "no_recipe",
                    "ingredients": [],
                }
                status["no_recipe"] += 1
            counts["none"] += 1
            continue

        src_type = r.get("type")
        craft_type = SOURCE_TYPE_TO_CRAFT.get(src_type)
        if craft_type is None:
            raise SystemExit(
                "El output %d tiene type=%r, que no esta en el mapa del "
                "contrato. Agregar el tipo al contrato o excluirlo del "
                "catalogo a proposito: improvisar el craftType desde el origen "
                "produce una pieza que se ve crafteable y no lo es." % (item_id, src_type)
            )

        ings = []
        for ing in r.get("ingredients", []):
            ings.append({
                # El item_id de la fuente es STRING y el id del catalogo es
                # NUMBER. Como clave de objeto los dos funcionan (JS convierte
                # la clave), pero en un Set, en un indexOf o en un === no. Por
                # eso se convierte aca, una vez, en el borde.
                "itemId": int(ing["item_id"]),
                "count": ing["count"],
                "name": ing["name"],
            })

        entries[item_id] = {
            "craftType": craft_type,
            "dataStatus": "recipe",
            "recipeId": int(r["output_id"]),
            "outputCount": r.get("output_count", 1),
            "disciplines": r.get("disciplines", []),
            "ingredients": ings,
        }
        counts[craft_type] += 1
        status["recipe"] += 1

    return entries, counts, status


def js_str(s):
    return json.dumps(s, ensure_ascii=False)


def build_js(entries, counts, status, catalog_ids, source_counts):
    lines = []
    a = lines.append

    total = len(entries)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    a("/*!")
    a(" * js/legendary-recipes.js - CONTRATO de fabricacion de las %d legendarias" % total)
    a(" * Proyecto: Boveda del Gato Negro (GW2 Wallet Ligero)")
    a(" * Version: 1.0.0")
    a(" * Generado: %s" % now)
    a(" *")
    a(" * Generado por js/_build_legendary_recipes.py desde tools/cl_recipes.json.")
    a(" * NO modificar manualmente. El encabezado de ese script explica por que el")
    a(" * contrato existe y por que lista los %d items y no solo los que tienen" % total)
    a(" * receta.")
    a(" *")
    a(" * CONTRATO")
    a(" *   craftType  'mystic_forge' | 'crafting' | 'none'")
    a(" *   dataStatus 'recipe' | 'no_recipe' | 'placeholder'")
    a(" *")
    a(" * 'crafting' es de primera clase: las 18 piezas Obsidian (6 por peso) son")
    a(" * 'crafting' con disciplina y NO tienen receta de Forja Mistica. Un")
    a(" * hasRecipe:boolean laseria igual a las de la forja y perderia eso.")
    a(" *")
    a(" * Reparto medido sobre los %d items:" % total)
    a(" *   craftType   mystic_forge=%d  crafting=%d  none=%d" %
      (counts["mystic_forge"], counts["crafting"], counts["none"]))
    a(" *   dataStatus  recipe=%d  no_recipe=%d  placeholder=%d" %
      (status["recipe"], status["no_recipe"], status["placeholder"]))
    a(" * Fuente: %d recetas (%s)" % (
        source_counts["total"],
        ", ".join("%s=%d" % (k, v) for k, v in sorted(source_counts["por_tipo"].items()))))
    a(" *")
    a(" * Verificacion de datos (2026-10-02, tools/hb122-verificar-items.cjs):")
    a(" *   1135/1136 ids existen en /v2/items. El unico que no es item_id 0")
    a(" *   ('Relic (any)'), de UNA receta de vendor que no es del catalogo.")
    a(" *   0 cantidades no enteras positivas, 0 nombres vacios, 0 nombres que")
    a(" *   difieren de la API. Muestra manual del 5%: 49 de 930, los 49.")
    a(" */")
    a("")
    a("(function (root) {")
    a("  'use strict';")
    a("")
    a("  var CRAFT_TYPE = {")
    a("    MYSTIC_FORGE: 'mystic_forge',")
    a("    CRAFTING: 'crafting',")
    a("    NONE: 'none'")
    a("  };")
    a("")
    a("  var DATA_STATUS = {")
    a("    RECIPE: 'recipe',")
    a("    NO_RECIPE: 'no_recipe',")
    a("    PLACEHOLDER: 'placeholder'")
    a("  };")
    a("")
    a("  // El texto de 'no hay receta' y el del placeholder viven ACA y no en las")
    a("  // %d entradas, por dos razones: son la misma frase %d veces (y %d KB de" %
      (status["no_recipe"], status["no_recipe"], status["no_recipe"]))
    a("  // datos que pueden quedar viejos en un solo lugar), y el placeholder tiene")
    a("  // que ser una UNICA constante: es el patron contra el que se chequea que")
    a("  // GW2 no le cambio el nombre.")
    a("  var NO_RECIPE_NOTE = " + js_str(NO_RECIPE_NOTE) + ";")
    a("  var PLACEHOLDER_NOTE = " + js_str(PLACEHOLDER_NOTE) + ";")
    a("")
    a("  var PLACEHOLDER = {")
    a("    id: %d," % PLACEHOLDER_ID)
    a("    name: " + js_str(PLACEHOLDER_NAME) + ",")
    a("    note: PLACEHOLDER_NOTE")
    a("  };")
    a("")
    a("  // Las claves son el id del catalogo (NUMBER en legendary-data.js). La")
    a("  // fuente los tiene como STRING; se comparan igual como clave de objeto")
    a("  // porque JS convierte la clave, pero en un Set o un === no. Por eso")
    a("  // `get()` normaliza con Number() en vez de confiar en el que llama.")
    a("  var BY_ITEM = {")

    for item_id in catalog_ids:
        e = entries[item_id]
        if e["dataStatus"] == "recipe":
            ings = ", ".join(
                '{ "itemId": %d, "count": %s, "name": %s }' %
                (i["itemId"], json.dumps(i["count"]), js_str(i["name"]))
                for i in e["ingredients"]
            )
            disc = ", ".join(js_str(d) for d in e["disciplines"])
            a('    "%d": { "craftType": "%s", "dataStatus": "recipe", "recipeId": %d, '
              '"outputCount": %s, "disciplines": [%s], "ingredients": [%s] },' %
              (item_id, e["craftType"], e["recipeId"],
               json.dumps(e["outputCount"]), disc, ings))
        else:
            a('    "%d": { "craftType": "none", "dataStatus": "%s", "ingredients": [] },'
              % (item_id, e["dataStatus"]))
    a("  };")
    a("")
    a("  // Devuelve la entrada de un id del catalogo, o null si el id no es del")
    a("  // catalogo. NO devuelve una entrada para 'no tengo datos': los %d ids" % total)
    a("  // estan TODOS en BY_ITEM, asi que una ausencia es un id desconocido y no")
    a("  // un hueco de datos. Un consumidor que distinga esos dos casos tiene que")
    a("  // mirar `dataStatus`, no la presencia de la clave.")
    a("  function get(itemId) {")
    a("    var e = BY_ITEM[Number(itemId)];")
    a("    return e === undefined ? null : e;")
    a("  }")
    a("")
    a("  // Lo que la cola necesita para pintar 'de que se hace', sin que cada")
    a("  // consumidor vuelva a decidir que frase corresponde a que estado.")
    a("  function describe(itemId) {")
    a("    var e = get(itemId);")
    a("    if (!e) return null;")
    a("    if (e.dataStatus === 'placeholder') return PLACEHOLDER_NOTE;")
    a("    if (e.dataStatus === 'no_recipe') return NO_RECIPE_NOTE;")
    a("    if (e.craftType === 'crafting') {")
    a("      var d = e.disciplines && e.disciplines.length")
    a("        ? e.disciplines.join(', ')")
    a("        : 'disciplina';")
    a("      return 'Se craftea con ' + d + '.';")
    a("    }")
    a("    return 'Se hace en la Forja Mystica.';")
    a("  }")
    a("")
    a("  root.LegendaryRecipes = {")
    a("    version: '1.0.0',")
    a("    generated: %s," % js_str(now))
    a("    totalItems: %d," % total)
    a("    craftType: CRAFT_TYPE,")
    a("    dataStatus: DATA_STATUS,")
    a("    placeholder: PLACEHOLDER,")
    a("    noRecipeNote: NO_RECIPE_NOTE,")
    a("    counts: {")
    a("      craftType: { mystic_forge: %d, crafting: %d, none: %d }," %
      (counts["mystic_forge"], counts["crafting"], counts["none"]))
    a("      dataStatus: { recipe: %d, no_recipe: %d, placeholder: %d }" %
      (status["recipe"], status["no_recipe"], status["placeholder"]))
    a("    },")
    a("    byItem: BY_ITEM,")
    a("    get: get,")
    a("    describe: describe")
    a("  };")
    a("")
    a("  console.info('[LegendaryRecipes]', 'Contrato cargado: %d items, ' +" % total)
    a("    'mystic_forge=%d crafting=%d none=%d');" %
      (counts["mystic_forge"], counts["crafting"], counts["none"]))
    a("})(typeof window !== 'undefined' ? window : this);")
    a("")

    return "\n".join(lines)


def main():
    out_path = OUTPUT_FILE
    if "--out" in sys.argv:
        out_path = sys.argv[sys.argv.index("--out") + 1]

    with open(SOURCE, "r", encoding="utf-8") as f:
        recipes = json.load(f)["recipes"]

    catalog_ids = read_catalog_ids()

    por_tipo = {}
    for r in recipes:
        por_tipo[r.get("type")] = por_tipo.get(r.get("type"), 0) + 1
    source_counts = {"total": len(recipes), "por_tipo": por_tipo}

    # El placeholder se busca por ID y por NOMBRE, y se avisa si falta. Perderlo
    # en silencio es exactamente el fallo futuro que el contrato quiere evitar:
    # el item deja de aparecer en el filtro y nadie sabe por que.
    if PLACEHOLDER_ID not in catalog_ids:
        print("AVISO: el catalogo ya no tiene el placeholder %d (%r)." % (PLACEHOLDER_ID, PLACEHOLDER_NAME))
        print("       Si GW2 lo renombro, el filtro tiene que dejar de matchear a proposito.")
        print("       Si no, el build del catalogo lo perdio y hay que arreglar ESO.")
    with open(CATALOG, "r", encoding="utf-8") as f:
        cat_src = f.read()
    if PLACEHOLDER_NAME not in cat_src:
        print("AVISO: el nombre %r no esta en legendary-data.js." % PLACEHOLDER_NAME)
        print("       El contrato declara ese nombre; si GW2 lo cambio, hay que")
        print("       actualizar PLACEHOLDER_NAME y lo que lo consume, no el filtro.")

    entries, counts, status = build_entries(catalog_ids, recipes)
    js = build_js(entries, counts, status, catalog_ids, source_counts)

    with open(out_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(js)

    print("Contrato generado: %s" % out_path)
    print("   Items del catalogo: %d" % len(catalog_ids))
    print("   craftType:   mystic_forge=%d  crafting=%d  none=%d"
          % (counts["mystic_forge"], counts["crafting"], counts["none"]))
    print("   dataStatus:  recipe=%d  no_recipe=%d  placeholder=%d"
          % (status["recipe"], status["no_recipe"], status["placeholder"]))
    print("   Fuente: %d recetas (%s)"
          % (source_counts["total"],
             ", ".join("%s=%d" % (k, v) for k, v in sorted(por_tipo.items()))))
    suma = counts["mystic_forge"] + counts["crafting"] + counts["none"]
    print("   Suma craftType == items: %s (%d)" % (suma == len(catalog_ids), suma))
    if suma != len(catalog_ids):
        raise SystemExit("La suma de craftType no cierra con el catalogo.")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    main()
