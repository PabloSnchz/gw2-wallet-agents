import io, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')

src = io.open(r'js/raid-tracker.js', encoding='utf-8').read()
start = src.index('encounters: [')
end = src.index('];', start)
block = src[start:end]

refs = re.findall(r'icon: "(assets/icons/raids/bosses/[^"]+)"', block)
print('iconos referenciados por WINGS: %d' % len(refs))
missing = [r for r in refs if not os.path.exists(r)]
print('ICONOS ROTOS (%d):' % len(missing))
for m in missing:
    print('   ', m)

d = os.path.join('assets', 'icons', 'raids', 'bosses')
have = sorted(os.listdir(d))
used = set(os.path.basename(r) for r in refs)
orphan = [h for h in have if h not in used]
print('\nARCHIVOS SIN USAR (%d):' % len(orphan))
for o in orphan:
    print('   ', o)
