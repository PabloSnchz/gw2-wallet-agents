# -*- coding: utf-8 -*-
import io, os, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT = r'C:\Mis Archivos\GW2 online\gw2-dev'

p = os.path.join(ROOT, 'BACKLOG.md')
s = io.open(p, encoding='utf-8').read()
old = 'ALERT-48: el "por m\u00e9rito" no aplica a capa de datos.'
new = 'ALERT-49: el "por m\u00e9rito" no aplica a capa de datos.'
if old in s:
    s = s.replace(old, new, 1)
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
    print('OK BACKLOG.md: ALERT-48 -> ALERT-49')
else:
    print('SKIP BACKLOG.md')

p2 = os.path.join(ROOT, 'ALERTS_LOG.md')
a = io.open(p2, encoding='utf-8').read()
if 'ALERT-50' not in a:
    if not a.endswith('\n'):
        a += '\n'
    a += (
"| **ALERT-50** | \U0001f7e1 Media | Repo / Proceso | "
"**Un commit de un agente cayo dentro de la rama de otro, en un worktree compartido, y nadie lo noto.** "
"En el HB#48, el commit del PO (`0b9721d`, el dashboard de las 08:00) quedo dentro de "
"`fix/idea49c-shard-races` porque el Principal cambio de rama mientras el PO trabajaba en el mismo clon. "
"Benigno en este caso: era un `.md`, y el contenido era correcto. "
"| **RESUELTA en el acto (HB#48)** | "
"Los dos lo detectaron y lo resolvieron sin drama, que es exactamente por que funciona el canal de archivos. "
"**REGLA: antes de commitear en un clon compartido, `git status -sb` y `git branch --show-current` en la MISMA "
"llamada.** Si la rama no es la que uno cree, el commit va a la rama equivocada y el `git log` de la otra la "
"muestra como si nunca hubiera existido. Corolario barato: `git log --oneline -1` inmediatamente despues de "
"commitear, y verificar que el hash aparece en la rama esperada. Es la generalizacion de ALERT-43: alli el "
"trabajo sin commitear casi se pierde; aqui el commit se guardo en el lugar equivocado. "
"El riesgo real no es este caso, es el proximo en que el commit cruzado sea de codigo. |\n"
    )
    io.open(p2, 'w', encoding='utf-8', newline='\n').write(a)
    print('OK ALERTS_LOG.md: ALERT-50 agregada')
else:
    print('SKIP ALERT-50 ya existe')
