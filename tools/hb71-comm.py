# -*- coding: utf-8 -*-
"""HB#71: cerrar la comm vencida de la Idea 50 y abrir la de la ronda 17 (T3/T4).
Escribe el JSON a mano y lo VERIFICA releyendolo: 'to' y 'body' identicos.
"""
import io, json, os, sys, glob
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = r'C:\Users\psanc\.qwenpaw\_comms'
TS = '20260930T233000Z'
TAG = 'r17-t34'

question = """Ronda 17 del PO (ALERT-84). El T1 ya esta mergeado (d64e688), asi que lo que
pregunto es solo por T3+T4, que son las 2 piezas que quedan y estan acopladas.

## Lo que medi (no lo que suppose)

- `legendary-tracker.js:190-195` `loadLegendaryData()` es un stub: resuelve `[]`.
- `render-catologo.js:361` llama `registerRender({filterBar, catalogGrid, skeleton, progress})`
  y en 5 lugares mas, y llama `getState()`.
- La API publica real de `legendary-tracker.js:308-339` es
  `initOnce, activate, deactivate, refresh, prefetch, _debug, Route`.
  NO expone `registerRender` ni `getState`. `render-catologo.js` se escribio
  contra una version del tracker que nunca existio (Phase 3 Commit 1 de un plan
  sin Phase 3).
- `js/legendary-data.js` (85.813 B, 206 legendarias) y `js/render-catologo.js`
  (17.950 B) estan commiteados y NO cargados por `index.html`.
  `legendary-data.js` ya se autoexpone como `root.LegendaryCatalog`.

## Mi conclusion, que es la que quiero que revisen

El orden correcto es: `loadLegendaryData()` primero, `registerRender` despues, y
recien ahi agregar los dos `<script>`. Agregar los scripts primero es la solucion
obvia y es incorrecta: da el mismo resultado visible (nada) mas dos warnings,
porque el guard `typeof ... === 'function'` cae al `else`, reintenta a 50 ms,
falla y hace `console.warn`.

## UNA SOLA PREGUNTA

`registerRender` + `getState` son un CONTRATO entre dos archivos que hoy no se
hablan. Hay dos formas de cerrarlo y quiero la tuya, con el motivo:

  (a) `legendary-tracker.js` implementa `registerRender(fn)` y `getState()` como
      una cara publica mas, y `render-catologo.js` se queda como esta.
  (b) Al reves: `render-catologo.js` deja de esperar un registro y se engancha a
      un evento / callback que ya existe en el tracker.

El criterio que me importa no es cual es mas linda: es que el arnés de tests de
este repo tiene que poder distinguir "el catalogo esta cargado" de "el registro
esta listo" sin clickear el menu. Dime cual de las dos deja esa asercion
escribible hoy, y si ninguna, cual es la tercera via que estas usando.

No revises T1 (ya esta), no revises T2 (`vloxx` esta medido y es decision de
producto, con test), y no propongas promover a `origin`."""

inbox_dir = os.path.join(ROOT, 'code-reviewer', 'inbox')
sent_dir = os.path.join(ROOT, 'default', 'sent')
os.makedirs(inbox_dir, exist_ok=True)
os.makedirs(sent_dir, exist_ok=True)

base = 'default__Code-Reviewer__' + TAG
msg = {
    'ts': TS,
    'from': 'default',
    'to': 'Code-Reviewer',
    'subject': 'ALERT-84 ronda 17: el contrato registerRender/getState entre dos archivos que no se hablan',
    'body': question,
    'state': 'asked',
    'replied_utc': None,
    'wait_required': False,
    'deadline_utc': None,
}
blob = json.dumps(msg, ensure_ascii=False, indent=2)
fn = TS + '__' + base + '.json'

for d in (inbox_dir, sent_dir):
    p = os.path.join(d, fn)
    io.open(p, 'w', encoding='utf-8', newline='\n').write(blob)

# Verificacion de entrega: releer y comparar. Escribe != entregado.
chk = json.load(io.open(os.path.join(inbox_dir, fn), encoding='utf-8'))
print('to     =', chk['to'])
print('body   =', 'IDENTICO' if chk['body'] == question else 'DIFIERE')
print('chars  =', len(chk['body']))
print('archivo=', fn)
print('--- respuestas del Reviewer en su inbox (pendientes): ---')
for p in sorted(glob.glob(os.path.join(ROOT, 'code-reviewer', 'inbox', '*.json'))):
    d = json.load(io.open(p, encoding='utf-8'))
    print(' ', os.path.basename(p), '| state=', d.get('state'), '|', d.get('subject', '')[:60])
