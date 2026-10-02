#!/usr/bin/env python3
"""
_build_legendary_data.py — Build legendary-data.js from _legendary_items_full.json
Phase 2A (catalog base) + Phase 2B (TP prices, optional via --with-prices).
Transforma `_legendary_items_full.json` en `legendary-data.js`.

NO es un script "one-time": corre tantas veces como haga falta. La cadena
completa es `_fetch_legendary_items.py` -> este script. El input lo produce el
primero y NO se versiona, asi que sin el no hay build; antes de esta cadena el
artefacto era reproducible pero el proceso no.
"""
import json
import os
import sys
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(BASE_DIR, "_legendary_items_full.json")
OUTPUT_FILE = os.path.join(BASE_DIR, "legendary-data.js")
PRICES_CACHE = os.path.join(BASE_DIR, "_legendary_prices_cache.json")


def infer_gex(item_id, name_en, item_type, details):
    """Infer generation and expansion from item ID, name, type, and details.

    ORDEN IMPORTA: es una cadena `elif`, y los tres comentarios de abajo son la
    razon de que el orden sea el que es. Leerlos antes de tocar nada.

    BUG CORREGIDO (2026-10-02, ALERT-ARME-01): los 90 items de armadura de set
    (Glorious Hero's / Triumphant Hero's y sus variantes Mistforged/Ardent/
    Sublime) salian con generation=null porque las reglas de "trinket" y de
    "gen 3 armor" solo miraban el NOMBRE para un tipo de item puntual. El script
    asumio que toda armor sin nombre de set era Gen 3 o no era nada. El
    resultado no era cosmetico: `legendary-tracker.js` usa `generation` para el
    filtro "Gen" del Catalogo, asi que 90 de 206 items caian en un limbo que
    ningun filtro podia alcanzar.
    """
    name = (name_en or "").lower()
    gen = None
    exp = None

    # --- Gen 1 weapons (Core, IDs 30684-30704) ---
    if 30684 <= item_id <= 30704:
        gen, exp = 1, "Core"

    # --- Perfected Envoy armor (Gen 1, HoT fractals) ---
    elif "perfected envoy" in name:
        gen, exp = 1, "HoT"

    # --- The Ascension back (Gen 1, PoF WvW) ---
    elif item_id == 77474:
        gen, exp = 1, "PoF"

    # --- Gen 3 weapons (Aurene's set, EoD) ---
    elif name.startswith("aurene's "):
        gen, exp = 3, "EoD"

    # --- Gen 3 armor (Obsidian, Eikasia, Selachimorpha, Khan-Ur) ---
    # ANTES estaba arriba de la regla de sets. El orden no cambia el resultado
    # (los nombres no se pisan) pero queda asi para que las dos reglas de
    # armadura esten juntas y se lean como las dos que son.
    elif any(x in name for x in ["obsidian", "eikasia", "selachimorpha", "khan-ur"]):
        gen, exp = 3, "EoD"

    # --- Gen 1 armor sets (PoF) — LA REGLA QUE FALTABA ---
    # 93 items: 75 de "Glorious/Triumphant Hero's" y sus variantes
    # Mistforged/Sublime, mas 18 "Ardent Glorious".
    #
    # Un set NO es una Forja Mistica: se craftea por disciplina. Los "Ardent"
    # SI son Forja Mistica, pero de 1 precursor + 3 gifts — verificado contra
    # `tools/cl_recipes.json`: output 82214 (Ardent Glorious Shinplates) =
    # mystic_forge con [Ardent Glorious Shinplates, Gift of Competitive
    # Prosperity, Gift of Competitive Prowess, Gift of Competitive Dedication].
    # Es la misma forma que el punto 1.2 pide, y por eso el Ardent tiene receta
    # mientras el Hero's de base no: el base se craftea por disciplina y
    # `crafty_legend` no lo cubre. La diferencia NO es "legendaria con receta" vs
    # "sin receta", es "como se consigue". Las dos son Gen 1 PoF.
    #
    # El match es por subcadena sobre el nombre en ingles, no por lista de IDs:
    # una lista de 93 IDs seria mas lenta de mantener y daria la falsa impresion
    # de que el set es una excepcion en vez de una familia.
    #
    # "calibrated" entra por completitud de la familia Calibrated (el tercer
    # set PvP de PoF). NO hay items Calibrated en el catalogo de hoy: la regla
    # esta para que el proximo fetch no los meta en el limbo. Se declara
    # explicitamente porque una palabra que no matchea nada parece un error.
    elif item_type == "Armor" and any(
        x in name for x in ["hero's", "ardent", "calibrated"]
    ) and not any(
        x in name for x in ["obsidian", "eikasia", "selachimorpha", "khan-ur"]
    ):
        gen, exp = 1, "PoF"

    # --- Gen 2 weapons (IDs 71383+, HoT/PoF/IBS — non-armor) ---
    elif item_type == "Weapon" and item_id >= 71383:
        gen = 2
        hot = ["nevermore", "hope", "astralaria"]
        pof = ["chuka and champawat", "eureka", "shooshadoo",
               "claws of the fallen", "visions of the risen",
               "the primer", "the weather"]
        ibs = ["embers", "frost", "voice of the fallen",
               "claw of the fallen", "the voice in the mists"]
        if name in hot:
            exp = "HoT"
        elif name in pof:
            exp = "PoF"
        elif name in ibs:
            exp = "IBS"
        else:
            exp = "HoT" if item_id < 76000 else "PoF"

    # --- Gen 2 back: Ad Infinitum (HoT fractal) ---
    elif item_id == 74155:
        gen, exp = 2, "HoT"

    # --- Trinkets ---
    elif item_type == "Trinket":
        if any(x in name for x in ["mistforged", "triumphant", "glorious"]):
            gen, exp = 1, "HoT"
        elif "prismatic" in name:
            gen, exp = 1, "PoF"
        else:
            gen, exp = 2, "PoF"

    # --- Legendary Sigil / Rune / Relic (ALERT-ARME-01) ---
    # Los tres ULTIMOS del catalogo, y los tres con generation=null. Son los
    # componentes de Upgrade Schema (Gen 3, EoD) mas el Relic, que se obtiene
    # de	forja mistica pero no lleva generation porque el script no tenia
    # regla para `relic` ni para `upgradecomponent` — dos tipos que map_type()
    # ni siquiera tiene en su diccionario y que llegaban como string suelta.
    elif item_type == "Relic":
        gen, exp = 3, "EoD"
    elif item_type == "UpgradeComponent":
        gen, exp = 3, "EoD"

    # --- Other Back items ---
    elif item_type == "Back":
        if "ad infinitum" in name:
            gen, exp = 2, "HoT"
        else:
            gen, exp = 1, "Core"

    return gen, exp


def map_type(item_type):
    """Map GW2 item type -> catalog type.

    ALERT-ARME-01: `UpgradeComponent` no estaba en el diccionario. Con el
    fallback `item_type.lower()` salia `upgradecomponent`, que es el valor que el
    catalogo ya tenia y que el tracker ya leia — o sea, el resultado era
    correcto por accidente y el bug era invisible. Se agrega explicito para que
    el acierto sea por diseño y no por el fallback.
    """
    mapping = {"Weapon": "weapon", "Armor": "armor",
               "Trinket": "trinket", "Back": "back",
               "Relic": "relic", "UpgradeComponent": "upgradecomponent"}
    return mapping.get(item_type, item_type.lower() if item_type else "unknown")


def map_subtype(item_type, details):
    if item_type == "Weapon" and details:
        return (details.get("type") or "").lower()
    elif item_type == "Armor" and details:
        a_type = (details.get("type") or "").lower()
        weight = (details.get("weight_class") or "").lower()
        return f"{weight} {a_type}" if weight else a_type
    elif item_type == "Trinket" and details:
        return (details.get("type") or "").lower()
    elif item_type == "Back":
        return "back"
    return ""


def transform_item(item, prices=None, with_prices=False):
    item_id = item.get("id", 0)
    name_en = item.get("name_en", "")
    name_es = item.get("name_es", "") or name_en
    item_type = item.get("type", "")
    details = item.get("details", {})

    gen, exp = infer_gex(item_id, name_en, item_type, details)

    entry = {
        "id": item_id,
        "name": name_en,
        "nameEs": name_es,
        "icon": item.get("icon", ""),
        "type": map_type(item_type),
        "subtype": map_subtype(item_type, details),
        "rarity": "Legendary",
        "generation": gen,
        "expansion": exp
    }

    # Phase 2B: merge TP prices
    if with_prices and prices is not None:
        pid = str(item_id)
        if pid in prices:
            entry["tpSell"] = prices[pid].get("sell", 0)
            entry["tpBuy"] = prices[pid].get("buy", 0)
            entry["tpTradeable"] = True
        else:
            entry["tpSell"] = 0
            entry["tpBuy"] = 0
            entry["tpTradeable"] = False

    return entry


def build_js(items, with_prices):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    total = len(items)
    type_counts = {}
    for i in items:
        t = i["type"]
        type_counts[t] = type_counts.get(t, 0) + 1

    phase_label = "Phase 2A + Phase 2B" if with_prices else "Phase 2A"
    items_json = json.dumps(items, indent=2, ensure_ascii=False)

    # ALERT-ARME-01: el encabezado miente si hay items sin `generation`. Un
    # resumen que no menciona el hueco hace que un consumidor lo lea como "todo
    # clasificado" — que es exactamente el fallo que esta correccion arregla.
    sin_gen = sum(1 for i in items if not i.get("generation"))
    sin_exp = sum(1 for i in items if not i.get("expansion"))

    lines = []
    lines.append("/*!")
    lines.append(f" * js/legendary-data.js - Catalogo estatico de legendarias del Armory")
    lines.append(f" * Proyecto: Boveda del Gato Negro (GW2 Wallet Ligero)")
    lines.append(f" * Version: 1.0.0 ({phase_label})")
    lines.append(f" * Generado: {now}")
    lines.append(f" *")
    lines.append(f" * Catalogo estatico de {total} legendarias. Generado por la cadena:")
    lines.append(f" *   _fetch_legendary_items.py  (baja el snapshot crudo, Phase 0)")
    lines.append(f" *   _fetch_thematic_prices.py  (baja precios TP, Phase 2B, opcional)")
    lines.append(f" *   _build_legendary_data.py   (este script, Phase 2A) -> este archivo.")
    lines.append(f" * Consumido por legendary-tracker.js.")
    lines.append(f" *")
    lines.append(f" * NO modificar manualmente. Para regenerar, correr los scripts de arriba")
    lines.append(f" * en orden (ver _fetch_legendary_items.py). El snapshot crudo NO se versiona")
    lines.append(f" * a proposito: se regenera desde la API.")
    lines.append(f" *")
    type_str = ", ".join(f"{t}={c}" for t, c in sorted(type_counts.items()))
    lines.append(f" * Tipos: {type_str}")
    lines.append(f" * ALERT-ARME-01 (2026-10-02): 93 items salian con generation=null — 90")
    lines.append(f" *   armaduras de set de PoF (Glorious/Triumphant Hero's + Ardent) y 3")
    lines.append(f" *   sin tipo mapeado (Relic, Legendary Sigil, Legendary Rune). Con null no")
    lines.append(f" *   los alcanzaba NINGUN filtro de la vista, y no aparecian en un")
    lines.append(f" *   'Sin generacion' que nadie habia dibujado. Corregido en infer_gex()")
    lines.append(f" *   y map_type(); congelado en tools/armeria-alert-01-clasificacion.test.js.")
    if sin_gen or sin_exp:
        # Se imprime SIEMPRE la linea cuando hay un hueco, aunque sea 0, para
        # que el encabezado sea estable: un consumidor no tiene que adivinar si
        # la ausencia de la linea significa "todo bien" o "el script es viejo".
        lines.append(f" * SIN CLASIFICAR: generation=null {sin_gen}/{total}, "
                     f"expansion=null {sin_exp}/{total}")
        lines.append(f" *   (ver infer_gex() en _build_legendary_data.py antes de agregar una)")
    if with_prices:
        tradeable = sum(1 for i in items if i.get("tpTradeable"))
        lines.append(f" * Precios TP: tpSell (venta directa), tpBuy (pedido compra)")
        lines.append(f" *   {tradeable}/{total} items tradeables en TP (restantes = 0, account-bound)")
    lines.append(f" */")
    lines.append("")
    lines.append(f"(function (root) {{")
    lines.append(f"  'use strict';")
    lines.append("")
    lines.append(f"  var LEGENDARY_CATALOG = {items_json};")
    lines.append("")
    lines.append(f"  root.LegendaryCatalog = {{")
    lines.append(f"    version: \"1.0.0\",")
    lines.append(f"    generated: \"{now}\",")
    lines.append(f"    totalItems: {total},")
    lines.append(f"    items: LEGENDARY_CATALOG")
    lines.append(f"  }};")
    lines.append("")
    lines.append(f"  console.info('[LegendaryCatalog]', 'Catalogo cargado: {total} items, v1.0.0');")
    # OJO con el `f` de adelante (ALERT-ARME-01, editado por el Arquitecto):
    # en un f-string `}}` es la escaped de UNA llave. Sin la `f`, `"}})(` emite
    # DOS llaves de cierre y rompe el balance del IIFE — el artefacto se
    # regeneraba con sintaxis invalida y `node --check` lo detecta. Se deja el
    # comentario porque el `f` es invisible al leer y el error aparece lejos de
    # aca: en el .js de salida, no en este script.
    lines.append(f"}})(" + "typeof window !== 'undefined' ? window : this);")
    lines.append("")

    return "\n".join(lines)


def main():
    with_prices = "--with-prices" in sys.argv
    # --out: escribir a otro archivo. Lo necesita `tests/idea84-leyenda-pipeline.test.js`
    # para regenerar el catalogo SIN pisar el artefacto versionado, que es la unica
    # forma de comparar el regenerador contra su propia salida correcta.
    out_path = OUTPUT_FILE
    if "--out" in sys.argv:
        out_path = sys.argv[sys.argv.index("--out") + 1]
    input_path = INPUT_FILE
    if "--input" in sys.argv:
        input_path = sys.argv[sys.argv.index("--input") + 1]

    with open(input_path, "r", encoding="utf-8") as f:
        items_raw = json.load(f)

    # Load TP prices cache if available (Phase 2B)
    prices = None
    if with_prices and os.path.exists(PRICES_CACHE):
        with open(PRICES_CACHE, "r", encoding="utf-8") as f:
            prices = json.load(f)
        print(f"   Loaded {len(prices)} cached price entries")

    items = []
    for item_id_str, item in items_raw.items():
        if not item.get("name_en"):
            continue
        items.append(transform_item(item, prices, with_prices))

    # Sort by type priority, then generation, then ID
    type_order = {"weapon": 0, "armor": 1, "trinket": 2, "back": 3,
                  "upgradecomponent": 4, "relic": 5}
    items.sort(key=lambda x: (type_order.get(x["type"], 99),
                              x.get("generation") or 99, x["id"]))

    js_content = build_js(items, with_prices)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(js_content)

    phase_label = "Phase 2A + Phase 2B" if with_prices else "Phase 2A"
    type_counts = {}
    for i in items:
        t = i["type"]
        type_counts[t] = type_counts.get(t, 0) + 1

    sin_gen = sum(1 for i in items if not i.get("generation"))
    sin_exp = sum(1 for i in items if not i.get("expansion"))

    print(f"\u2705 Phase complete: {out_path}")
    print(f"   Items: {len(items)}")
    print(f"   Phase: {phase_label}")
    print(f"   Types: {dict(type_counts)}")
    print(f"   With prices: {with_prices}")
    # El resumen de consola dice lo mismo que el encabezado. Si divergen, uno de
    # los dos miente: se imprime el conteo acá justamente para que se pueda
    # comparar a ojo contra la linea SIN CLASIFICAR del .js.
    print(f"   Sin clasificar: generation={sin_gen}, expansion={sin_exp}")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    main()
