#!/usr/bin/env python3
"""
Medicion de la cuota de localStorage causada por la metadata de logros
(Idea 49, Tramo C). NO es un test: no pasa ni falla. Mide volumen real
contra la API en vivo y sirve para decidir el diseno del arreglo.

Por que existe (HB#46): el Tramo C del PO consistia en comprimir `ach_acc`
de ~79 B a ~6 B por id (13x menos). Antes de implementarlo se midio que se
guarda realmente y quien lo lee, y el problema resulto ser OTRO: la key
`ach_meta_v2:<lang>:<ids>` lleva el id-set entero dentro del nombre, asi que
27 cuentas guardan 27 veces la misma tabla, parcialmente solapada.

Salida esperada (2026-09-30, red GW2 API):
    ids reales de logros (1..4000): 3459
    bytes por registro (es, minificado): 519
    HOY: una key por id-set (slice de 200 ids)     20.22 MB
    SHARDING: una key por shard fijo (id//200)      1.71 MB  (18 shards)
    reduccion: -91.5%

Como reproducir:  python scripts/medir-cache-logros.py
Tarda ~2 min (barre 20 franjas de 200 ids contra la API, con pausa de 350 ms).

Notas de metodo (importan, para que la medicion no se lea mal despues):
  - `?ids=all` devuelve HTTP 400 en /v2/achievements, y `page` solo devuelve
    los 50 logros "explorer". Por eso el catalogo se barre por franjas de 200.
  - El tamano de registro se mide con `ensure_ascii=False`: el codigo real
    guarda JSON, y los textos en espanol ocupan mas bytes que con escapes.
  - La simulacion de 27 cuentas usa subconjuntos ALEATORIOS de 1500 logros.
    En la realidad los subconjuntos se parecen MAS entre si (todas hacen el
    CM, el PvP, etc.), asi que el sharding rinde mas, no menos: la cifra es
    conservadora.
  - El volumen se cuenta como key + JSON guardado, porque localStorage cobra
    por el nombre de la clave tambien, y con el id-set adentro la key pesa.
"""

import json, urllib.request, random, time

CUENTAS = 27
LOGROS_POR_CUENTA = 1500
CHUNK = 200
SHARD = 200


def get(url, tries=4):
    """GET con reintentos. La API responde 400 a rangos sin logros: eso no es
    un fallo transitorio y lo maneja el que llama, no esta funcion."""
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "boveda-medicion/1.0"})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read())
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))


def barrer_catalogo(hasta=4000):
    """Ids reales de logros. No hay paginacion del catalogo completo, asi que
    se barren las franjas de a 200, que es el maximo que acepta la API."""
    ids = []
    franja = 1
    while franja <= hasta:
        try:
            d = get("https://api.guildwars2.com/v2/achievements?v=latest&ids="
                    + ",".join(map(str, range(franja, franja + 200))))
            ids.extend(o["id"] for o in d)
        except Exception:
            pass  # franja sin logros: la API responde 400 y se sigue
        franja += 200
        time.sleep(0.35)
    return sorted(set(ids))


def main():
    ids = barrer_catalogo()
    print(f"ids reales de logros (1..4000): {len(ids)}")

    random.seed(7)
    muestra = sorted(random.sample(ids, 200))
    d = get("https://api.guildwars2.com/v2/achievements?v=latest&ids="
            + ",".join(map(str, muestra)) + "&lang=es")
    b_por_reg = len(json.dumps(d, separators=(",", ":"), ensure_ascii=False).encode("utf-8")) / len(d)
    print(f"bytes por registro (es, minificado): {b_por_reg:.0f}")

    random.seed(1)
    subconjuntos = [random.sample(ids, LOGROS_POR_CUENTA) for _ in range(CUENTAS)]

    print(f"\n--- {CUENTAS} cuentas x {LOGROS_POR_CUENTA} logros, cuota 4.98 MB ---")

    hoy = 0
    claves_hoy = 0
    for sub in subconjuntos:
        s = sorted(set(sub))
        for i in range(0, len(s), CHUNK):
            slice_ = s[i:i + CHUNK]
            hoy += len(("ach_meta_v2:es:" + ",".join(map(str, slice_))).encode("utf-8"))
            hoy += int(b_por_reg * len(slice_))
            claves_hoy += 1
    print(f"{'HOY: una key por id-set (slice de 200 ids)':52s} {hoy/1048576:8.2f} MB")

    tocados = set()
    for sub in subconjuntos:
        s = sorted(set(sub))
        for i in range(0, len(s), CHUNK):
            tocados.update(s[i:i + CHUNK])

    shards = set()
    for i in range(0, len(ids), SHARD):
        if set(ids[i:i + SHARD]) & tocados:
            shards.add(i // SHARD)

    con_shard = 0
    for sh in sorted(shards):
        contenido = [x for x in ids[sh * SHARD:(sh + 1) * SHARD] if x in tocados]
        con_shard += len(("ach_meta_sh:es:" + str(sh)).encode("utf-8"))
        con_shard += int(b_por_reg * len(contenido))
    print(f"{'SHARDING: una key por shard fijo (id//200)':52s} {con_shard/1048576:8.2f} MB  ({len(shards)} shards)")

    print(f"\nreduccion: -{100*(1-con_shard/hoy):.1f}%")
    print(f"claves hoy: {claves_hoy}   claves con sharding: {len(shards)}")


if __name__ == "__main__":
    main()
