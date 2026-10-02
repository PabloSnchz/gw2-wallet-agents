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

LO QUE ESTE CONTRATO NO HACE (medido 2026-10-02, no deducido):

  No alcanza para armar el arbol de fabricacion completo. Las entradas son
  los 206 items DEL CATALOGO, y los ingredientes de la Forja Mistica no son
  del catalogo: los 236 ingredientes distintos de las 142 con receta estan
  236 de 236 fuera de este contrato. De esos 236, 169 tienen receta en la
  fuente.

  Recorriendo con este contrato, el arbol no baja de 2 niveles: todo
  ingrediente cae como hoja y el resultado es la lectura plana "4 piezas,
  y no se sabe de que". El arbol de verdad (hasta 9 niveles, 55 nodos en
  Frostfang) sale de leer la fuente completa.

  Decidir si los precursores entran al contrato o se resuelven en runtime
  contra otra fuente es decision de Pablo. Este archivo no la toma por
  defecto; solo deja constancia de que hace falta tomarla.

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
    return sorted(read_catalog().keys())


def read_catalog():
    """Catalogo completo: id -> {name, nameEs, icon, ...}.

    Antes esto devolvia solo los ids y las entradas `no_recipe` salian con el
    nombre vacio. Medido 2026-10-02: las 64 entradas sin receta tienen SI el
    nombre en legendary-data.js (name, nameEs, icon), y NO en la fuente
    (0 de 64), que es justamente por lo que no tienen receta: GW2 no publica
    la receta de las legendarias. O sea, el nombre ya estaba a mano todo este
    tiempo, en el archivo que el generador ya leia, y no hacia falta ninguna
    llamada a la API.

    Sin nombre, esas 64 filas son un numero a secas y no se pueden buscar ni
    mostrar en Mi progreso.
    """
    with open(CATALOG, "r", encoding="utf-8") as f:
        src = f.read()
    m = re.search(r"var LEGENDARY_CATALOG = \[(.*?)\n\];", src, re.S)
    if not m:
        raise SystemExit("No se encontro 'var LEGENDARY_CATALOG = [...]' en " + CATALOG)
    cuerpo = "[" + m.group(1) + "]"
    try:
        items = json.loads(cuerpo)
    except ValueError as e:
        raise SystemExit(
            "El catalogo no es JSON parseable (%s). No se sigue: si no se puede"
            " leer el nombre, las %s entradas no_recipe saldrian sin nombre y eso"
            " es peor que un build que falla." % (e, len(items) if items else "?")
        )
    if not items:
        raise SystemExit("El catalogo esta vacio o mal formado")
    cat = {}
    for it in items:
        iid = int(it["id"])
        if iid in cat:
            raise SystemExit("El catalogo repite el id %d. La clave seria ambigua." % iid)
        cat[iid] = it
    return cat


def build_entries(catalog_ids, recipes, catalog):
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
        meta = catalog.get(item_id, {})
        r = by_output.get(item_id)
        if r is None:
            # `isMaterial: false` en el placeholder no es decoracion: Mi
            # progreso lo usa para NO ofrecer "Legendary Equipment Unlocked!"
            # como material faltante. Ese id es el objeto que GW2 crea al
            # desbloquear una legendaria; no se puede tener, no se compra, no
            # se craftea. Offercerlo como faltante seria mostrarle a Pablo una
            # tarea imposible con un numero al lado.
            if item_id == PLACEHOLDER_ID:
                entries[item_id] = {
                    "craftType": "none",
                    "dataStatus": "placeholder",
                    "name": meta.get("name", PLACEHOLDER_NAME),
                    "nameEs": meta.get("nameEs", ""),
                    "icon": meta.get("icon", ""),
                    "isMaterial": False,
                    "ingredients": [],
                }
                status["placeholder"] += 1
            else:
                entries[item_id] = {
                    "craftType": "none",
                    "dataStatus": "no_recipe",
                    "name": meta.get("name", ""),
                    "nameEs": meta.get("nameEs", ""),
                    "icon": meta.get("icon", ""),
                    "isMaterial": False,
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
            "name": meta.get("name", ""),
            "nameEs": meta.get("nameEs", ""),
            "icon": meta.get("icon", ""),
            # Con receta, la pieza SI es un material: hay que poder obtenerla.
            # El placeholder NO lo es (ver PLACEHOLDER_NOTE). Esta bandera es
            # la que le permite a Mi progreso no ofrecer lo imposible.
            "isMaterial": True,
            "ingredients": ings,
        }
        counts[craft_type] += 1
        status["recipe"] += 1

    return entries, counts, status


def verify_names(entries):
    """Ninguna entrada puede salir sin nombre.

    Motivo: el nombre de las %d entradas `no_recipe` salia vacio durante
    ciclos. No hacia falta ninguna llamada a la API para arreglarlo -- estaba
    en legendary-data.js, que el build ya leia para los ids. Pero si eso se
    rompe (alguien renombra el campo, cambia el formato del catalogo) y nadie
    mira, las %d filas vuelven a ser numeros a secas y el arbol se dibuja
    como un arbol de ids: inbuscable e ilegible.

    Por eso es un fallo de build y no un aviso. Un nombre vacio es un dato
    que se perdio en silencio; un build que falla se ve.
    """
    sin_nombre = [i for i, e in entries.items() if not (e.get("name") or "").strip()]
    if sin_nombre:
        raise SystemExit(
            "%d entradas del contrato salieron SIN nombre: %s%s\n"
            "El catalogo tiene el nombre de los 206 items; si estas entradas no, "
            "el problema es que legendary-data.js cambio de forma y read_catalog "
            "no esta leyendo los campos que cree."
            % (len(sin_nombre), ", ".join(str(x) for x in sin_nombre[:10]),
               " ..." if len(sin_nombre) > 10 else "")
        )
    sin_icon = [i for i, e in entries.items() if not (e.get("icon") or "").strip()]
    # El icon es deseable pero no bloqueante: el nombre es lo que hace
    # buscable una fila, el icon es lo que la hace linda.
    return len(sin_nombre), len(sin_icon)


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
    a(" *")
    a(" * PROFUNDIDAD DEL ARBOL -- SE CUENTA INCLUYENDO LA HOJA")
    a(" *")
    a(" * `depth` es el numero de niveles desde la legendaria hasta un material")
    a(" * base, Y LA HOJA CUENTA COMO UN NIVEL. Medido 2026-10-02 contra la")
    a(" * FUENTE (contra este contrato NO se puede; ver la limitacion de abajo)")
    a(" * sobre las %d con receta:" % status["recipe"])
    a(" *   nivel 2 ->   1     nivel 6 ->  5     nivel 9 ->  1")
    a(" *   nivel 5 ->  57     nivel 7 -> 50     nivel 8 -> 28")
    a(" *   minimo 2, maximo 9, 0 ciclos")
    a(" *")
    a(" * Esto NO es cosmetico. Dos personas midieron el mismo dato y obtuvieron")
    a(" * 'maximo 8, minimo 1, 57 en nivel 4' y 'maximo 9, minimo 2, 57 en nivel 5'")
    a(" * sobre el MISMO dato, y las dos tenian razon: una contaba la hoja como")
    a(" * nivel y la otra no. El contrato fija una sola lectura para que la UI y")
    a(" * los tests hablen el mismo idioma. Si algun dia se cambia esta regla,")
    a(" * hay que cambiarla aca y no en el consumidor.")
    a(" *")
    a(" * Lo mismo con el conteo de NODOS: un nodo es un item del arbol")
    a(" * (receta o hoja). Medido desde la raiz 30684 (Frostfang): 55 nodos =")
    a(" * 17 con receta + 38 hojas. Decir '17 nodos' y '55 nodos' son las dos")
    a(" * medias, y la segunda es la que corresponde a 'cosas que tenes que")
    a(" * conseguir'.")
    a(" *")
    a(" *")
    a(" * LIMITACION CONOCIDA -- ESTE CONTRATO NO ALCANZA PARA EL ARBOL COMPLETO")
    a(" *")
    a(" * Las entradas de este archivo son los %d items DEL CATALOGO. Los" % total)
    a(" * ingredientes de la Forja Mistica NO son del catalogo, asi que no tienen")
    a(" * entrada aca. Medido: los 236 ingredientes distintos de las %d con" % status["recipe"])
    a(" * receta estan 236 de 236 FUERA de este contrato, y de esos 236, 169 tienen")
    a(" * receta en la fuente.")
    a(" *")
    a(" * Consecuencia: recorrido con ESTE contrato, el arbol no baja de 2")
    a(" * niveles, porque todo ingrediente cae como hoja. El arbol de 9 niveles")
    a(" * y 55 nodos sale de leer tools/cl_recipes.json entero, que es lo que")
    a(" * hace el verificador y lo que habra que hacer en el arbol real.")
    a(" *")
    a(" * O sea, este archivo responde 'de que se craftea una legendaria del")
    a(" * catalogo', NO 'de que se hace cada parte'. Para lo segundo hay que")
    a(" * decidir si los precursores entran al contrato o se resuelven en")
    a(" * runtime contra otra fuente. Pendiente de Pablo, no resuelto por")
    a(" * defecto.")
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
              '"outputCount": %s, "disciplines": [%s], "name": %s, "nameEs": %s, '
              '"icon": %s, "isMaterial": true, "ingredients": [%s] },' %
              (item_id, e["craftType"], e["recipeId"],
               json.dumps(e["outputCount"]), disc, js_str(e["name"]),
               js_str(e["nameEs"]), js_str(e["icon"]), ings))
        else:
            # Las entradas sin receta llevan nombre. Antes salian como
            # '"30684": { "craftType": "none", "dataStatus": "no_recipe", "ingredients": [] }'
            # y eran un numero a secas: no se podian buscar ni pintar. El
            # nombre sale del catalogo, no de la API -- la fuente tiene 0 de
            # 64, que es justo por lo que no hay receta.
            a('    "%d": { "craftType": "none", "dataStatus": "%s", "name": %s, '
              '"nameEs": %s, "icon": %s, "isMaterial": false, "ingredients": [] },' %
              (item_id, e["dataStatus"], js_str(e["name"]),
               js_str(e["nameEs"]), js_str(e["icon"])))
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

    entries, counts, status = build_entries(catalog_ids, recipes, read_catalog())
    sin_nombre, sin_icon = verify_names(entries)
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
    print("   Entradas con nombre: %d/%d  (sin nombre: %d)" %
          (len(catalog_ids) - sin_nombre, len(catalog_ids), sin_nombre))
    print("   Entradas con icon:  %d/%d  (sin icon: %d)" %
          (len(catalog_ids) - sin_icon, len(catalog_ids), sin_icon))
    mats = sum(1 for e in entries.values() if e.get("isMaterial"))
    print("   isMaterial=true: %d | isMaterial=false: %d  (el 95093 va en false a "
          "proposito: es el marcador de cuenta, no se puede tener)" %
          (mats, len(entries) - mats))


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    main()
