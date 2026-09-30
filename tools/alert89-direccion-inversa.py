# -*- coding: utf-8 -*-
"""ALERT-89: el test de la Idea 52 vigila UNA sola direccion.
Calcula, contra el fixture congelado de la API, que eventos de la API no
estan en WINGS. Si sale >0, el suite puede estar en verde con encounters de mas.
"""
import io, json, os, re, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = r'C:\Mis Archivos\GW2 online\gw2-dev'
FIX = os.path.join(ROOT, 'tests', 'fixtures', 'raids-catalogo-2026-09-30.json')
SRC = os.path.join(ROOT, 'js', 'raid-tracker.js')

cat = json.load(io.open(FIX, encoding='utf-8'))
api = {}
for raid in cat['raids']:
    for wing in raid['wings']:
        for ev in wing['events']:
            api[ev['id']] = (ev.get('type'), raid['id'], wing['id'])

src = io.open(SRC, encoding='utf-8').read()
# ids declarados como encuentros: { id: "...", name:
wblock = re.search(r'encounters:\s*\[(.*?)\n\s*\]', src, re.S)
ids = set(re.findall(r'\{\s*id:\s*"([^"]+)"', src))

print('eventos en el catalogo de la API :', len(api))
print('ids de encuentro en raid-tracker :', len(ids))
print()
fantasmas = sorted(i for i in ids if i not in api)
print('DIRECCION 1  app -> API  (fantasmas, la que el test vigila):', len(fantasmas), fantasmas)
faltan = sorted(i for i in api if i not in ids)
print('DIRECCION 2  API -> app  (faltantes, la que el test NO vigila):', len(faltan))
for i in faltan:
    print('    ', i, api[i])

# ¿El texto del test menciona la direccion 2 en algun punto?
t = io.open(os.path.join(ROOT, 'tests', 'idea52.raid-encounter-ids.test.js'),
            encoding='utf-8').read()
print()
print('el test menciona "camp":', 'camp' in t)
print('el test filtra API contra ALL (direccion 2):', bool(re.search(r'API\.(keys|values)\(\)[^\n]*\n?[^\n]*!ALL', t)))
print('ocurrencias de ALL en el test:', t.count('ALL'))
