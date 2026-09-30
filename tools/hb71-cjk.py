# -*- coding: utf-8 -*-
"""HB#71: escaneo CJK sobre los .md que toque, comparado contra HEAD, para
separar los escapes preexistentes de los mios (regla de ALERT-79)."""
import io, os, re, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'C:\Mis Archivos\GW2 online\gw2-dev'
CJK = re.compile(r'[\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]')
FILES = ['ALERTS_LOG.md', 'COMMS_LOG.md', 'BACKLOG.md', 'DASHBOARD_PO_IDEAS.md',
         'TEAM_STATUS.md', 'SESSION_LOG.md', 'tests/idea52.raid-encounter-ids.test.js']


def esc(txt):
    return sorted(set(CJK.findall(txt)))


print('%-34s %8s %8s' % ('archivo', 'HEAD', 'ahora'))
for p in FILES:
    ahora = io.open(os.path.join(ROOT, p), encoding='utf-8', newline='').read()
    try:
        raw = subprocess.run(['git', 'show', 'HEAD:' + p], cwd=ROOT,
                             capture_output=True, timeout=60).stdout
        head = raw.decode('utf-8', 'replace')
    except Exception as e:
        head = ''
    a, h = esc(ahora), esc(head)
    marca = '' if set(a) <= set(h) else '  <-- NUEVO, revisar'
    print('%-34s %8d %8d%s' % (p, len(h), len(a), marca))
    for c in a:
        if c not in h:
            i = ahora.find(c)
            print('      NUEVO %r en %s: ...%s...' % (c, p, ahora[max(0, i - 60):i + 60].replace('\n', ' ')))
print()
print('(los %d escapes de HEAD son preexistentes y NO son mios)' % 0)
