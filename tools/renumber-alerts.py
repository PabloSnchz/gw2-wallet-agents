# -*- coding: utf-8 -*-
"""Reconcilia la numeracion de ALERTS_LOG.md.

Un heartbeat paralelo escribio 2 secciones narrativas (## ALERT-48, ## ALERT-49)
mientras yo escribia 2 filas de la tabla (ALERT-49, ALERT-50). Como la tabla ya
tenia ALERT-48 ocupada (SESSION_LOG sobrescrito), los numeros quedaron duplicados.
La tabla es el indice canonico: se renumeran las secciones para que coincidan.
"""
import io, os, sys
sys.stdout.reconfigure(encoding='utf-8')

p = r'C:\Mis Archivos\GW2 online\gw2-dev\ALERTS_LOG.md'
s = io.open(p, encoding='utf-8').read()

# De atras hacia adelante, para no volver a pisar el 49 recien renumerado a 50.
s = s.replace('## ALERT-49 \u2014 colision de ramas en el worktree compartido',
              '## ALERT-50 \u2014 colision de ramas en el worktree compartido', 1)
s = s.replace('## ALERT-48 \u2014 2 bugs de correctitud mergeados sin revision del Code Reviewer',
              '## ALERT-49 \u2014 2 bugs de correctitud mergeados sin revision del Code Reviewer', 1)

# La seccion de la colision de ramas ahora duplica la fila 50 de la tabla. Se
# marca como seccion, no como entrada nueva.
s = s.replace('> **Abierta (HB#48). Severidad: media. Estado: abierta, mitigada por procedimiento.**',
              '> **Abierta (HB#48). Severidad: media. Estado: abierta, mitigada por procedimiento.**\n'
              '> (Seccion de detalle de la fila **ALERT-50** de la tabla. La numeracion quedo duplicada durante el\n'
              '> HB#48 porque dos procesos escribieron el log a la vez; se renumero para que la tabla mande.)', 1)

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('OK ALERTS_LOG.md renumerado')

for i, l in enumerate(io.open(p, encoding='utf-8'), 1):
    if l.startswith('## ALERT-') or l.startswith('| **ALERT-'):
        print('  %4d  %s' % (i, l[:70].rstrip()))
