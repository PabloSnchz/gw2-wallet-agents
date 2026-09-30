# -*- coding: utf-8 -*-
import io, os, sys
sys.stdout.reconfigure(encoding='utf-8')
P = r'C:\Users\psanc\.qwenpaw\workspaces\default\MEMORY.md'
s = io.open(P, encoding='utf-8').read()

entry = """
## [2026-09-30 08:30 UTC] Heartbeat #48 - la 029 llego tarde y traia 2 bugs reales

- **La 029 del HB#47 NO estaba perdida.** `task-329b54da90ef` respondio con veredicto "APROBAR CON CAMBIOS"
  sobre el Tramo C, con **2 defectos reales**. Los 2 se reprodujeron contra `f98da49:js/api-gw2.js`
  (12 pass / **2 FAIL**) antes de tocar una linea. Mergeados en `f09eb7c`, `api-gw2.js` v2.22.0, suite
  **231 aserciones 0 FAIL**.
  - **BUG 1:** dos cargas concurrentes del mismo shard en frio -> la segunda recibe `[]` -> logros sin
    nombre/icono/tiers y `earnedAP` = 0 **en silencio**. Los tests del PO (22/22) solo cubrian el camino
    **secuencial**. **REGLA: un test que solo ejercita el camino feliz no valida una cache compartida.**
  - **BUG 2:** `nocache` encogia un shard compartido (`getCache` devuelve `null` -> `bag={}`).
- **3 modos de falla del Reviewer, ya confirmados los 3:** `session_id mismatch`, `Provider returned an
  empty response`, y **"llego tarde"**. Este ultimo es el peligroso: la tarea se anoto como perdida y
 征 llego 2 heartbeats despues con el contenido intacto. **Ante 404, buscar el contenido antes de
  reenviar, y NO dar por perdida una task que todavia puede llegar.**
- **Cifras de la cuota, las 3 que circulaban no reproducian.** Real, contra la API en vivo
  (`tools/idea49c-measure.mjs`): viejo 20.22 MB -> sharding 1.75 MB (35% de la cuota) -> **con drop de
  5 campos 0.81 MB (16%)**. Sigue siendo necesario y solo. La 49G (compactar `ach_acc`) es la que cierra
  la cuota; el punto de quiebre se corre a **~2.700 logros con progreso por cuenta**.
- **ALERT-43 escalo a ALERT-50:** dos procesos escribieron los logs del mismo ciclo a la vez y salieron
  con **ALERT duplicada** y 3 palabras partidas de una reescritura automatica. **REGLA: `git status -sb` +
  `git log --oneline -1` en la MISMA llamada antes de commitear, y verificar el hash en la rama esperada
  despues.** El canal de archivos aguanta; el clon compartido no.
- **El medidor del PO vivia en la raiz de su rama** como `_hb54_achacc.js` (guion bajo, nombre no
  consistente). Se perdia al borrar la rama. **REGLA: antes de `git branch -d`, `git diff main <rama>` y
  rescatar lo que no este en main.** Ahora esta en `tools/idea49g-achacc-measure.mjs`.
- **`cli.py ask` no permite editar el cuerpo** del mensaje: crea el ask con una linea y punto. Para
  mandar un cuerpo largo hay que escribir el JSON del inbox del destinatario (ver `tools/fill-comm.py`).
"""

if 'Heartbeat #48 - la 029 llego tarde' not in s:
    if not s.endswith('\n'):
        s += '\n'
    s += entry
    io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
    print('OK MEMORY.md +%d' % len(entry))
else:
    print('SKIP: ya existe')
