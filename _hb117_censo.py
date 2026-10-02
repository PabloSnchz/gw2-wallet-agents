import io, os, re, sys, json

root = sys.argv[1]
MIRROR = {'gn:account:keys', 'gn:account:selected', 'gn:activities:home:nodes', 'gn:activities:toggles'}

# Llaves que escriben "lo que Pablo esta mirando" (estado de vista / seleccion)
set_gn = {}      # key -> [archivo:linea]
raw_ls = {}      # escribe localStorage crudo
for dirpath, dirnames, filenames in os.walk(os.path.join(root, 'js')):
    for fn in filenames:
        if not fn.endswith('.js'):
            continue
        p = os.path.join(dirpath, fn)
        for i, line in enumerate(io.open(p, encoding='utf-8').read().split('\n'), 1):
            for m in re.finditer(r"""(?:Storage|StorageManager)\.set\(\s*(?:Storage\.)?(?:STORAGE_KEYS\.)?['"]([a-z0-9_:.\-]+)['"]""", line):
                set_gn.setdefault(m.group(1), []).append('%s:%d' % (fn, i))
            for m in re.finditer(r"""localStorage\.setItem\(\s*['"]([a-z0-9_:\-]+)['"]""", line):
                raw_ls.setdefault(m.group(1), []).append('%s:%d' % (fn, i))

print('== Escritores de ESTADO DE VISTA via Storage.set ==')
for k in sorted(set_gn):
    print('  %-34s %s' % (k, ', '.join(set_gn[k][:3])))
print('  TOTAL:', len(set_gn))

print()
print('== los mismos, distinguiendo los que el listener de multi-pestana cubre ==')
print('  cubiertos por app.js:798 (e.key === gn:account:keys):')
print('    gn:account:keys  -> SI')
cub = {'gn:account:keys'}
print('  NO cubiertos:')
for k in sorted(set_gn):
    if k not in cub:
        print('    %-34s %s' % (k, ', '.join(set_gn[k][:3])))

print()
print('== localStorage crudo (fuera de la capa) ==')
for k in sorted(raw_ls):
    print('  %-36s %s' % (k, ', '.join(raw_ls[k][:3])))
print('  TOTAL:', len(raw_ls))

print()
print('== MIRROR_MAP: cada entrada duplica el evento en la otra pestana ==')
for k in sorted(MIRROR):
    print('  %-30s x2 eventos' % k)