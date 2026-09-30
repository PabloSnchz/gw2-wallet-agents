# -*- coding: utf-8 -*-
import io, json, os, re, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'C:\Mis Archivos\GW2 online\gw2-dev'
cat = json.load(io.open(os.path.join(ROOT, 'tests', 'fixtures',
                                    'raids-catalogo-2026-09-30.json'), encoding='utf-8'))
for raid in cat['raids']:
    for wing in raid['wings']:
        for ev in wing['events']:
            if ev['id'] in ('camp', 'greer', 'decima', 'ura'):
                print('API  ', json.dumps(ev, ensure_ascii=False))

src = io.open(os.path.join(ROOT, 'js', 'raid-tracker.js'), encoding='utf-8').read()
print()
print('--- encounters de las alas 5..8 en el archivo real ---')
i = src.find('monte_balrior')
if i < 0:
    i = src.find('mount_balrior')
print('monte_balrior encontrado en', i)
for m in re.finditer(r'\{ id: "(\w+)", name: "([^"]+)", nameEn: "([^"]+)", type: "(\w+)", li: (\d+), icon: "([^"]+)" \}', src):
    if m.group(4) == 'evento':
        print('  ', m.group(1), '|', m.group(2), '|', m.group(4), '| li', m.group(5), '|', m.group(6))
