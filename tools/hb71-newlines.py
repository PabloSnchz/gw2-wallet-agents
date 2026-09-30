# -*- coding: utf-8 -*-
"""HB#71 - normalizador: este repo tiene core.autocrlf=true, el working tree
materializa CRLF y el repo guarda LF. Escribir mezclando los dos produce el
diff inflado de ALERT-87. Normalizo a LF y lo verifico contando."""
import io, os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'C:\Mis Archivos\GW2 online\gw2-dev'
FILES = ['ALERTS_LOG.md', 'COMMS_LOG.md', 'BACKLOG.md', 'DASHBOARD_PO_IDEAS.md',
         'TEAM_STATUS.md', 'SESSION_LOG.md']
for p in FILES:
    f = os.path.join(ROOT, p)
    b = io.open(f, 'rb').read()
    crlf = b.count(b'\r\n')
    lf = b.count(b'\n') - crlf
    if crlf:
        io.open(f, 'wb').write(b.replace(b'\r\n', b'\n'))
    b2 = io.open(f, 'rb').read()
    print('%-26s CRLF=%-6d LF-solo=%-6d -> ahora CRLF=%d' % (
        p, crlf, lf, b2.count(b'\r\n')))
