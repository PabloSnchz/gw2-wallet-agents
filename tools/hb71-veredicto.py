# -*- coding: utf-8 -*-
"""HB#71 (cierre): veredicto del Reviewer sobre T3/T4 de la ronda 17."""
import io, os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'C:\Mis Archivos\GW2 online\gw2-dev'


def rd(p):
    return io.open(os.path.join(ROOT, p), encoding='utf-8', newline='').read().replace('\r\n', '\n')


def wr(p, t):
    io.open(os.path.join(ROOT, p), 'w', encoding='utf-8', newline='').write(t)


def rep(p, old, new):
    t = rd(p)
    assert t.count(old) == 1, '%s: %d ocurrencias' % (p, t.count(old))
    wr(p, t.replace(old, new))
    print('replace ->', p)


def app(p, s):
    t = rd(p)
    io.open(p and os.path.join(ROOT, p), 'w', encoding='utf-8', newline='').write(t + s)
    print('append ->', p)


# ------------------------------------------------- COMMS_LOG: la 076 pasa a Respondido
rep('COMMS_LOG.md',
    '| 076 | default | Code-Reviewer | **ALERT-84 ronda 17 (T3+T4): el contrato `registerRender`/`getState` entre dos archivos que hoy no se hablan** | **Esperando** | 1 |',
    '| 076 | default | Code-Reviewer | **ALERT-84 ronda 17 (T3+T4): el contrato `registerRender`/`getState` entre dos archivos que hoy no se hablan** | **Respondido** | 1 |')

rep('COMMS_LOG.md',
    'No propuse promover a `origin`. |',
    'No propuse promover a `origin`. **VEREDICTO: (a), reducido a su minimo.** El criterio que le '
    'importaba era cual de las dos deja escribible una asercion que distinga "el catalogo cargado" '
    'de "el registro listo" sin clickear el menu, y (a) es la **unica que crea un segundo punto de '
    'observabilidad**: "catalogo cargado" se aserta hoy contra `root.LegendaryCatalog.items.length '
    '=== 206` (sandbox propio, sin `activate()` ni router), y "registro listo" contra el flag del '
    'tracker. **Dos asserts que pueden ser verdaderos o falsos de forma INDEPENDIENTE**, que es '
    'literalmente lo que se pedia. **(b) no puede, y no por un detalle de implementacion: no hay '
    'evento al cual engancharse.** `gn:tokenchange` se ESCUCHA, no se despacha, y colgar el render '
    'de ahi lo ata a un cambio de cuenta y no a "el modulo esta listo": el primer arranque no '
    'registraria nada. Sin estado observable, (b) solo se comprueba mirando el DOM pintado, que '
    'obliga al click. **LO BLOQUEANTE UNICO: hacer (a) sin fijar las FIRMAS.** Hay una segunda mitad '
    'del contrato que nadie mira: `renderCatalogGrid(items, owned)`, `renderFilterBar(filters, '
    'catalog)` y `renderProgress(state, stats)`, que ademas lee `state.owned`. Guardar 4 funciones '
    'sin fijar esas firmas es un contrato que se rompe igual, mas tarde y mas dificil de ver. '
    '**Alcance reducido que pide: NO implementar `getState()` entero.** **Y me corrijo una cifra que '
    'repeti sin medir:** `getState` tiene **0 invocaciones**, no 1: esta en la cabecera ('
    '`render-catologo.js:11`) dentro del bloque de comentario `Consume:`. `registerRender` son 5 '
    'menciones y **4 en codigo** (2 bloques identicos: camino feliz :362 y retry :374), no "5 '
    'lugares mas". El `console.warn` de la rama `else` es **un** intento, **un** `setTimeout(..., '
    '50)` **sin segundo reintento** — ese si es un bug real cuando el contrato falte. **Mi conclusion '
    'del orden la comparte, con una precision que me reduce una restriccion:** '
    '`legendary-data.js` **no necesita ir antes** de `render-catologo.js` (los 3 usos de '
    '`LegendaryCatalog` son dentro de `renderProgress`, en tiempo de render, no en el registro); con '
    '`defer` cualquiera de los dos ordenes sirve. **El orden que importa es tracker -> '
    'render-catologo**, que es el que rompe al invertirse. **Y corrigio una cosa mia:** "mismo '
    'resultado visible (nada)" no es exacto — `legendary-data.js` **se autoexpone igual**, 206 items '
    'en memoria sin que nadie los consuma: el resultado *visible* es nada, el costo no es cero. '
    '**La infra del assert ya existe:** el §6 de `tests/alert84.leyenda-estado-honesto.test.js:'
    '223-226` ya arma el sandbox con `document` falso; asertar el registro son **3 lineas mas** en '
    'ese mismo sandbox. No hay que construir arnes. Ninguno de sus 3 puntos bloquea; lo unico '
    'bloqueante son las firmas. No propone promover a `origin`. |')

# ------------------------------------------------- BACKLOG: el item pasa a tener diseno
rep('BACKLOG.md',
    '**Enviado al Reviewer** (`task-509ffb6eb907`). 2-4 h cada uno. T1 ya esta commiteado (`d64e688`).',
    '**VEREDICTO DEL REVIEWER (`task-509ffb6eb907`): (a), reducido a su minimo.** Implementar '
    '`registerRender(fn)` + un booleano observable de registro + **las 3 firmas** '
    '(`renderCatalogGrid(items, owned)`, `renderFilterBar(filters, catalog)`, `renderProgress(state, '
    'stats)`, que ademas lee `state.owned`). **NO implementar `getState()` entero: tiene 0 '
    'invocaciones, no 1** (esta en un bloque de comentario, `render-catologo.js:11`). **LO UNICO '
    'BLOQUEANTE: hacer (a) sin fijar las firmas.** Se descarto (b) porque `gn:tokenchange` se escucha '
    'y no se despacha, asi que colgar el render de ahi lo ata a un cambio de cuenta y no a "el '
    'modulo esta listo". El assert sale en el sandbox que ya existe (`alert84...test.js:223-226`), '
    '3 lineas mas. **Orden: tracker -> render-catologo** es el que rompe al invertirse; '
    '`legendary-data.js` puede ir en cualquier posicion. **Sin implementar: es el item mas grande '
    'que queda y merece su propia rama y su propio ciclo.**')

# ------------------------------------------------- TEAM_STATUS
rep('TEAM_STATUS.md',
    '| ALERT-84 T3+T4 | **ENVIADO AL REVIEWER** `task-509ffb6eb907`, una sola pregunta |',
    '| ALERT-84 T3+T4 | **VEREDICTO RECIBIDO: (a), reducido al minimo.** Sin implementar; le toca al proximo ciclo, en rama propia |')

app('TEAM_STATUS.md', """

### Addendum: el veredicto de T3+T4 llego antes de cerrar el ciclo

`task-509ffb6eb907` volvio **`finished`**. **(a), reducido al minimo**, y la razon es
estructural: es la **unica** de las dos que crea un **segundo punto de observabilidad** — "el
catalogo esta cargado" se aserta hoy contra `root.LegendaryCatalog.items.length === 206` sin
`activate()` ni router, y "el registro esta listo" contra el flag del tracker. **Dos asserts que
pueden fallar de forma independiente**, que es literalmente el criterio que mande.

**(b) se descarto por una razon que no es de implementacion: no hay evento al cual engancharse.**
`gn:tokenchange` se **escucha**, no se despacha, y colgar el render de ahi lo ata a un cambio de
cuenta y no a "el modulo esta listo": el primer arranque no registraria nada.

**Lo unico bloqueante: hacer (a) sin fijar las 3 firmas** (`renderCatalogGrid(items, owned)`,
`renderFilterBar(filters, catalog)`, `renderProgress(state, stats)`, que ademas lee `state.owned`).
Guardar 4 funciones sin eso es un contrato que se rompe igual, mas tarde y mas dificil de ver.
**Y NO implementar `getState()` entero.**

> **Me corrigio una cifra que yo repeti sin medir.** Dije `getState` con "1 uso" porque lo pedi asi
> en la pregunta, tomada del texto del PO. **Son 0 invocaciones**: esta en la cabecera
> (`render-catologo.js:11`), dentro del bloque de comentario `Consume:`. `registerRender` son 5
> menciones y **4 en codigo**, no "5 lugares mas". **REGLA: un conteo que viene de otro agente y
> entra en mi pregunta como si lo hubiera medido es el mismo modo de falla que el `634` del
> Reviewer (ALERT-78) y que el `count-suite-totals.py` fantasma (ALERT-90). Verificar el numero
> ANTES de escribir la pregunta, no despues de recibir la respuesta.**

Ademas: el `console.warn` de la rama `else` es **un** intento, **un** `setTimeout(..., 50)` **sin
segundo reintento** — ese si es un bug real cuando el contrato falte. Y mi "mismo resultado visible
(nada)" era inexacto: `legendary-data.js` **se autoexpone igual** (206 items en memoria sin que
nadie los consuma). El resultado visible es nada; el costo no es cero.

**El aserto no necesita arnés nuevo:** el §6 de `tests/alert84.leyenda-estado-honesto.test.js:223-226`
ya arma el sandbox con `document` falso. Asertar el registro son **3 lineas mas** ahi.
""")
print('OK cierre')
