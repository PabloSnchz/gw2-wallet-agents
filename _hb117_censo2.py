import os, re, sys, collections
root = sys.argv[1]
pat = re.compile(r"'gn:[a-z0-9_:.\-]+'")
c = collections.Counter()
where = collections.defaultdict(set)
for dp, dn, fns in os.walk(os.path.join(root, 'js')):
    for fn in fns:
        if not fn.endswith('.js'):
            continue
        txt = open(os.path.join(dp, fn), encoding='utf-8').read()
        for i, line in enumerate(txt.split('\n'), 1):
            for m in pat.finditer(line):
                k = m.group(0)[1:-1]
                c[k] += 1
                where[k].add(fn)
print('literales gn: distintos =', len(c))
for k, n in sorted(c.items()):
    print('  %-38s %3d  %s' % (k, n, ','.join(sorted(where[k]))))