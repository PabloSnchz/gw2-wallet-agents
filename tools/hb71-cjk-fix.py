# -*- coding: utf-8 -*-
"""HB#71: sacar el CJK del ejemplo citado. Regex sobre la secuencia, sin
depender del texto circundante (el acento de 'Escribio' lo hacia fragil)."""
import io, os, re, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'C:\Mis Archivos\GW2 online\gw2-dev'
CJKRUN = re.compile(r'[\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]+')

for p in ['TEAM_STATUS.md', 'SESSION_LOG.md']:
    f = os.path.join(ROOT, p)
    t = io.open(f, encoding='utf-8', newline='').read()
    n = len(CJKRUN.findall(t))
    t2 = CJKRUN.sub('<dos ideogramas CJK>', t)
    io.open(f, 'w', encoding='utf-8', newline='').write(t2)
    print('%s: %d secuencia(s) reemplazada(s)' % (p, n))
