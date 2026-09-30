import io, sys

SEC = r'C:\Users\psanc\AppData\Local\Temp\idea50-section.md'
DST = r'C:\Mis Archivos\GW2 online\gw2-dev\DASHBOARD_PO_IDEAS.md'
ANCHOR = '## \U0001f534 Heartbeat PO 2026-09-30 04:00 UTC'

sec = io.open(SEC, encoding='utf-8').read()
dst = io.open(DST, encoding='utf-8').read()

if 'Heartbeat PO 2026-09-30 06:00' in dst:
    print('SKIP: la seccion 06:00 ya esta en el archivo')
    sys.exit(0)

i = dst.index(ANCHOR)
out = dst[:i] + sec + dst[i:]
io.open(DST, 'w', encoding='utf-8', newline='\n').write(out)
print('OK: insertadas %d chars antes de la seccion 04:00' % len(sec))
