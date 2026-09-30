# -*- coding: utf-8 -*-
"""HB#71: restitucion de la fila de ALERT-79 que el regex de CJK altero por
accidente. Es EVIDENCIA documentada de un escape, no un error mio de hoy: los
caracteres tenia que quedarse. La regla es al reves de la que me，还在 aplico:
no todo CJK en un .md es un escape mio."""
import io, os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'C:\Mis Archivos\GW2 online\gw2-dev'

CASO = '我们是'   # el primer escape de ALERT-79
CASO2 = '采纳'   # el segundo

f = os.path.join(ROOT, 'TEAM_STATUS.md')
t = io.open(f, encoding='utf-8', newline='').read()
viejo = 'Se me colaron `<dos ideogramas CJK>` y `<dos ideogramas CJK>` **en el cuerpo del mensaje del P3 al Reviewer**.'
nuevo = 'Se me colaron `%s` y `%s` **en el cuerpo del mensaje del P3 al Reviewer**.' % (CASO, CASO2)
assert t.count(viejo) == 1, t.count(viejo)
io.open(f, 'w', encoding='utf-8', newline='').write(t.replace(viejo, nuevo))
print('restituida la evidencia de ALERT-79 en TEAM_STATUS.md')
