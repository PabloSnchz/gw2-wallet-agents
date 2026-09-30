import json, urllib.request, random

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "boveda-medicion/1.0"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read()

# Muestra representativa: ids dispersos, no 1..200 (que mezcla logros viejos y raros)
random.seed(42)
ids = sorted(random.sample(range(1, 3000), 200))  # la API limita a 200 ids por request

for lang in ("es", "en"):
    raw = get("https://api.guildwars2.com/v2/achievements?v=latest&ids=" + ",".join(map(str, ids)) + "&lang=" + lang)
    data = json.loads(raw)
    n = len(data)
    total = len(raw)
    print(f"[{lang}] registros={n}  bytes={total}  B/registro={total/n:.0f}  -> 6991 logros = {total/n*6991/1048576:.2f} MB")

# Desglose en espanol, muestra dispersa
raw = get("https://api.guildwars2.com/v2/achievements?v=latest&ids=" + ",".join(map(str, ids)) + "&lang=es")
data = json.loads(raw)
total = len(raw)
print("\n--- desglose por campo, muestra dispersa, es ---")
campos = {}
for obj in data:
    for k, v in obj.items():
        campos[k] = campos.get(k, 0) + len(json.dumps(v, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
for k, v in sorted(campos.items(), key=lambda x: -x[1]):
    print(f"{k:20s} {v:8d} B {100*v/total:5.1f}%")

# Los campos que la app podria necesitar
print("\n--- reduccion por subconjunto de campos ---")
base = len(json.dumps(data, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
print("base (es):", base, "B -> 6991 =", round(base/len(data)*6991/1048576, 2), "MB")
for nombre, keep in [
    ("todo", None),
    ("sin description", ("id","name","type","icon","bits","flags","requirements","locked_text","point_cap","tiers","rewards","prerequisites")),
    ("id+name+type+icon", ("id","name","type","icon")),
    ("id+name+icon", ("id","name","icon")),
    ("id+name", ("id","name")),
    ("solo id", ("id",)),
]:
    if keep is None:
        sub = data
    else:
        sub = [{k: v for k, v in o.items() if k in keep} for o in data]
    b = len(json.dumps(sub, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    print(f"{nombre:22s} {b:7d} B  -{100*(1-b/base):5.1f}%   6991 -> {b/len(data)*6991/1048576:6.2f} MB")
