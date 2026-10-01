#!/usr/bin/env python3
"""
_fetch_legendary_items.py — Phase 0: baja el snapshot crudo del catalogo.

Produce `_legendary_items_full.json`, el input de `_build_legendary_data.py`
(Phase 2A) y `_fetch_thematic_prices.py` (Phase 2B).

POR QUE EXISTE, y por que el snapshot NO se versiona:
`_build_legendary_data.py` esta en el repo desde el 28-sep y produce
`legendary-data.js` correctamente, pero su input no esta en ninguna rama
(NUNCA estuvo, medido con `git log --all`). O sea que el ARTEFACTO es
reproducible y el PROCESO no: hasta ahora la unica forma de regenerar los 206
items era acordarse de la forma del JSON y escribirlo a mano.

Un artefacto cuyo unico regenerador depende de un input que no esta en el repo
no es un artefacto reproducible: es un artefacto con memoria. Este script es
la orden que falta. El snapshot sigue SIN versionarse a proposito -- si se
versionara, dentro de 6 meses el build "funcionaria" y produciria el catalogo
viejo, que es peor que no tener proceso: un proceso que funciona mintiendo.

ENDPOINTS (publicos, sin token, sin cuota):
  /v2/legendaryarmory         -> lista de ids            (206 hoy)
  /v2/items?ids=...           -> datos EN               (paginado, max 200)
  /v2/items?ids=...&lang=es   -> datos ES               (37/40 nombres difieren)

CACHE-FIRST, igual que `_fetch_thematic_prices.py` (que es el molde): las
respuestas crudas se guardan en `_legendary_raw_cache/`. Sin red, el build se
repite igual. Eso es lo que lo hace testeable offline.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BASE_DIR, "_legendary_items_full.json")
CACHE_DIR = os.path.join(BASE_DIR, "_legendary_raw_cache")
API_BASE = "https://api.guildwars2.com/v2"
UA = "gw2-legendary-data-builder/1.0"

# Permite el test apuntar a un cache-dir de fixture. Sin esto el test lee el
# cache REAL (206 items) en vez del suyo (3), y "3 items" pasa por 206.
CACHE_DIR_OVERRIDE = None

# GW2 API: max 200 ids por request. MEDIDO: 206 ids en una sola URL -> HTTP 400.
BATCH_SIZE = 200
RATE_SLEEP = 0.2  # cortesia, igual que el molde


class FetchError(RuntimeError):
    """Fallo de red o forma inesperada. Distinto de 'no hay datos'."""


def _get(url, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _cached(name, url, refresh):
    """Cache-first: si el crudo esta en disco y no se pide refresh, no hay red."""
    cache_dir = CACHE_DIR_OVERRIDE or CACHE_DIR
    path = os.path.join(cache_dir, name)
    if not refresh and os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    data = _get(url)
    os.makedirs(cache_dir, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    return data


def fetch_armory(refresh=False):
    """Ids del catalogo. Sin paginacion: /v2/legendaryarmory devuelve la lista."""
    return [int(i) for i in _cached("armory.json", f"{API_BASE}/legendaryarmory", refresh)]


def fetch_items(ids, lang, refresh=False):
    """Datos de /v2/items para `ids`, paginados. Indexado por id.

    El 206 parcial (la API responde 200 con solo los ids validos) se reporta:
    un id pedido y no recibido es un FALLO de este script, no una baja de
    catalogo. Si GW2 saca una legendaria, el endpoint la deja de listar y el id
    ni llega a pedirse.
    """
    tag = lang if lang == "en" else "es"
    out = {}
    for i in range(0, len(ids), BATCH_SIZE):
        batch = ids[i:i + BATCH_SIZE]
        q = ",".join(str(i_) for i_ in batch)
        suffix = "" if lang == "en" else f"&lang={lang}"
        name = f"items-{tag}-{i // BATCH_SIZE + 1}.json"
        data = _cached(name, f"{API_BASE}/items?ids={q}{suffix}", refresh)
        if not isinstance(data, list):
            raise FetchError(f"/v2/items?lang={lang} lote {i // BATCH_SIZE + 1}: "
                             f"se esperaba una lista, vino {type(data).__name__}")
        for entry in data:
            if isinstance(entry, dict) and "id" in entry:
                out[int(entry["id"])] = entry
        time.sleep(RATE_SLEEP)
    faltan = [i for i in ids if i not in out]
    if faltan:
        raise FetchError(f"lang={lang}: {len(faltan)} de {len(ids)} ids pedidos "
                         f"no volvieron. Primeros: {faltan[:10]}")
    return out


def build_snapshot(ids, en, es):
    """La forma EXACTA que consume `_build_legendary_data.py`:
    dict {id_str: {id, name_en, name_es, icon, type, details}}."""
    snap = {}
    for i in ids:
        e = en[i]
        s = es.get(i, {})
        snap[str(i)] = {
            "id": i,
            "name_en": e.get("name", ""),
            "name_es": s.get("name", ""),
            "icon": e.get("icon", ""),
            "type": e.get("type", ""),
            "details": e.get("details") or {},
        }
    return snap


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    refresh = "--refresh" in sys.argv
    out_path = OUTPUT_FILE
    if "--out" in sys.argv:
        out_path = sys.argv[sys.argv.index("--out") + 1]
    if "--cache-dir" in sys.argv:
        globals()["CACHE_DIR_OVERRIDE"] = sys.argv[sys.argv.index("--cache-dir") + 1]

    ids = fetch_armory(refresh)
    print(f"Legendary Armory: {len(ids)} ids")

    en = fetch_items(ids, "en", refresh)
    es = fetch_items(ids, "es", refresh)
    print(f"  items EN: {len(en)}   items ES: {len(es)}")

    snap = build_snapshot(ids, en, es)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(snap, f, indent=2, ensure_ascii=False)

    sin_es = sum(1 for v in snap.values() if not v["name_es"])
    print(f"\nSnapshot: {len(snap)} items -> {out_path}")
    if sin_es:
        print(f"  AVISO: {sin_es} sin nombre ES (el builder cae a name_en)")
    print("  Siguiente: python _build_legendary_data.py --with-prices")


if __name__ == "__main__":
    try:
        main()
    except FetchError as exc:
        # El nombre de la clase va en el mensaje a proposito: un fallo
        # CONTROLADO se distingue de un crash por esto, y no por el exit code
        # (los dos son != 0). Sin el, "fallo" no significa nada.
        print(f"FetchError: {exc}", file=sys.stderr)
        sys.exit(1)
    except (urllib.error.URLError, urllib.error.HTTPError) as exc:
        print(f"NetworkError: {exc}", file=sys.stderr)
        sys.exit(1)