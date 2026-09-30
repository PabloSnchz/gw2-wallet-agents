import json, io, re, sys
sys.stdout.reconfigure(encoding='utf-8')

d = json.load(io.open(r'C:\Users\psanc\AppData\Local\Temp\raids2.json', encoding='utf-8'))
live = {}
for r in d:
    for w in r.get('wings', []):
        for e in w.get('events', []):
            live[e['id']] = (r['id'], w['id'], e.get('type'))
print('eventos en la API:', len(live))

src = io.open(r'js/raid-tracker.js', encoding='utf-8').read()
start = src.index('encounters: [')
end = src.index('];', start)
block = src[start:end]
ids = re.findall(r'\{ id: "([a-z0-9_]+)", name:', block)
print('encuentros en WINGS:', len(ids))

bad = [x for x in ids if x not in live]
print('NO EXISTEN EN LA API (%d):' % len(bad))
for b in bad:
    print('   ', b)

miss = sorted(k for k in live if k not in ids)
print('EN LA API SIN CABLEAR (%d):' % len(miss))
for m in miss:
    print('   %-28s %s / %s (%s)' % (m, live[m][0], live[m][1], live[m][2]))
