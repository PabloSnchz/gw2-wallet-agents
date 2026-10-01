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
    """Infer generation and expansion from item ID, name, type, and details."""
    name = (name_en or "").lower()
    gen = None
    exp = None

    # Gen 1 weapons (Core, IDs 30684-30704)
    if 30684 <= item_id <= 30704:
        gen, exp = 1, "Core"

    # Perfected Envoy armor (Gen 1, HoT fractals)
    elif "perfected envoy" in name:
        gen, exp = 1, "HoT"

    # The Ascension back (Gen 1, PoF WvW)
    elif item_id == 77474:
        gen, exp = 1, "PoF"

    # Gen 3 weapons (Aurene's set, EoD)
    elif name.startswith("aurene's "):
        gen, exp = 3, "EoD"

    # Gen 3 armor (Obsidian, Eikasia, Selachimorpha, Khan-Ur)
    elif any(x in name for x in ["obsidian", "eikasia", "selachimorpha", "khan-ur"]):
        gen, exp = 3, "EoD"

    # Gen 2 weapons (IDs 71383+, HoT/PoF/IBS — non-armor)
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

    # Gen 2 back: Ad Infinitum (HoT fractal)
    elif item_id == 74155:
        gen, exp = 2, "HoT"

    # Trinkets
    elif item_type == "Trinket":
        if any(x in name for x in ["mistforged", "triumphant", "glorious"]):
            gen, exp = 1, "HoT"
        elif "prismatic" in name:
            gen, exp = 1, "PoF"
        else:
            gen, exp = 2, "PoF"

    # Other Back items
    elif item_type == "Back":
        if "ad infinitum" in name:
            gen, exp = 2, "HoT"
        else:
            gen, exp = 1, "Core"

    return gen, exp


def map_type(item_type):
    mapping = {"Weapon": "weapon", "Armor": "armor",
               "Trinket": "trinket", "Back": "back"}
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
    lines.append("  };")
    lines.append("")
    lines.append(f"  console.info('[LegendaryCatalog]', 'Catalogo cargado: {total} items, v1.0.0');")
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
    type_order = {"weapon": 0, "armor": 1, "trinket": 2, "back": 3}
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

    print(f"\u2705 Phase complete: {out_path}")
    print(f"   Items: {len(items)}")
    print(f"   Phase: {phase_label}")
    print(f"   Types: {dict(type_counts)}")
    print(f"   With prices: {with_prices}")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    main()