# -*- coding: utf-8 -*-
"""HB#71: adenda a ALERT-79. El escaneo CJK sirve; un REGEX QUE REEMPLAZA todo
CJK en un .md no, porque borra la evidencia de los escapes ya documentados."""
import io, os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'C:\Mis Archivos\GW2 online\gw2-dev'

viejo = ('Antes de commitear, releer el diff de los `.js` buscando texto que no sea del idioma '
         'del proyecto. Es barato y es la unica defensa: ninguna herramienta lo agarra. |')

nuevo = (viejo[:-2].rstrip() +
         ' *(HB#71: **el escaneo sirve, un regex que REEMPLAZA todo el CJK de un `.md` no.** '
         'Corri uno sobre `TEAM_STATUS.md` para quitarme de encima un escape mio y **borre la '
         'evidencia de un escape ya documentado**: la fila de ALERT-79 cita literalmente los dos '
         'caracteres que se me colaron en el mensaje al Reviewer, y el regex los sustituyo por '
         '`<dos ideogramas CJK>`. Tuve que restituirla a mano. **REGLA: en un `.md` de este repo '
         'el CJK preexistente es EVIDENCIA, no un error: son los escapes que las alertas citan.** '
         'La forma correcta es comparar **contra HEAD archivo por archivo** y actuar solo sobre lo '
         'que es nuevo, no normalizar el archivo entero. Y `tools/scan-cjk.py` **no cubre los '
         '`.md`**: da 0 sobre ellos, asi que el escaneo tiene que correr sobre el `.py`/`.js` que '
         'genera el texto, que es donde esta el error antes de que llegue al `.md`.* |')

f = os.path.join(ROOT, 'ALERTS_LOG.md')
t = io.open(f, encoding='utf-8', newline='').read()
assert t.count(viejo) == 1, t.count(viejo)
io.open(f, 'w', encoding='utf-8', newline='').write(t.replace(viejo, nuevo))
print('adenda a ALERT-79 agregada')
