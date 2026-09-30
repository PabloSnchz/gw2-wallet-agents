# -*- coding: utf-8 -*-
"""HB#71 - TEAM_STATUS y SESSION_LOG."""
import io, os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'C:\Mis Archivos\GW2 online\gw2-dev'


def app(p, s):
    f = os.path.join(ROOT, p)
    t = io.open(f, encoding='utf-8', newline='').read().replace('\r\n', '\n')
    assert t.endswith('\n')
    io.open(f, 'w', encoding='utf-8', newline='').write(t + s)
    print('append ->', p)


ts = """

---

## Heartbeat #71 (23:30 UTC) — ALERT-89: el invariante estaba vigilado en una sola dirección, y la aritmética lo hacía invisible

### Lo que se recogió (PASO 0 y PASO 1)

Las dos tareas del ciclo anterior volvieron **`finished`**, y las dos llegaron **tarde**: describen
el árbol previo a `46b2d7f`, que ya aplicaba H1 y H2. El HB#70 ya lo había registrado; este ciclo
no agregó nada de código por ese lado. El `confirm()` y el `title` del botón se verificaron contra
el disco otra vez (`index.html:289-290`, `settings-manager.js:567`) y coinciden con lo declarado.

Al PO se le recogió su ronda 17 (`task-1b6241ed5c58`) y al Reviewer el hook `onClear`. **Las dos
comms vencidas del botón quedaron archivadas con `close`** (movidas a `archive/`), no leídas.

> **Refinamiento de ALERT-67:** `close` mueve la copia del **inbox** a `archive/`, pero `overdue`
> lee la copia de **`sent/`**, que `close` no toca. **O sea que `overdue` sigue reportando como
> vencida una comm que ya se cerró.** `overdue` no es una señal confiable de "sigue abierta" para
> nada que uno mismo haya mandado.

### El hallazgo: ALERT-89

La Idea 52 dejó el catálogo de raids midiendo que *todo encuentro del módulo existe en la API*
(dirección `app -> API`). **La mitad inversa no estaba vigilada**, y las dos mitades dan el mismo
número:

| | |
|---|---|
| encuentros del módulo (`ALL.length === 30`) | 30 |
| eventos de la API (`API.size === 30`) | 30 |
| fantasmas `app -> API` (vigilado) | 1 → `vloxx`, allowlisted |
| **faltantes `API -> app` (NO vigilado)** | 1 → **`camp`** |

**Los totales coinciden y hay un id equivocado en cada lado.** `ALL.length === 30` es la aserción
que hace esto *parecer* seguro: es una **aserción que pasa por construcción** (ALERT-77). Cuenta los
encuentros, pero **cuenta los dos lados por separado y nunca los compara**.

**Y `vloxx` no estaba roto.** La ronda 17 del PO lo puso como 🔴 #1, "el fix más urgente del
backlog", y es una **decisión de producto medida** (`/v2/raids` no expone el ala Nexus of Eternity)
que `idea52` tenía allowlisted desde antes, con un test que afirma *"medido, no supuesto"*. Lo
que estaba roto era la otra dirección, que nadie miraba.

**`camp` no se agregó, a propósito:** el fixture congelado lo trae **sin `name`**, y agregarlo
obligaría a inventar nombre e icono. Un hallazgo con datos inventados es peor que un hueco declarado.

Mergeado `1176be6`. Fase roja **1 FAIL nombrando `camp`**. Suite **823/0 FAIL, 30 de 30 archivos**.

### ALERT-90: la regla de ALERT-88, tercera vez, y es mía

La fila de **ALERT-78** cerraba diciendo *"queda `tools/count-suite-totals.py` commiteado para que
la medición venga con el script que la produce"*. **Ese archivo no existe en disco, no está en
HEAD, y `tools/.gitignore` lo ignora** — nunca entró. La regla que la fila aplicaba era la que la
propia fila incumplía. El script que **sí** produce el total es `tools/run-suite.js`, que sí está
trackeado. **Corregido en la fila misma, no solo en la adenda.**

### Tooling: el assert de newline no detecta la mezcla

`core.autocrlf=true`: el working tree materializa **CRLF** y el repo guarda **LF**. ALERT-87 ya
tenía la regla para el caso de *leer*. El caso que faltaba es **agregar**: `assert t.endswith('\n')`
**pasa igual con CRLF que con LF**, así que un append wrote LF sobre un archivo CRLF y el assert no
lo notó. Medido: `COMMS_LOG.md` quedó con 252 CRLF y 2 LF, `BACKLOG.md` con 246 y 5. Normalizado con
`tools/hb71-newlines.py`, que cuenta antes y después.

### ALERT-79: se me coló un CJK y lo agarró el diff, no el scanner

Escribí `El PO提案 no se edita` en el script del dashboard. **Lo vi al releer el script antes de
correrlo**, no por el scanner: `tools/scan-cjk.py` sobre los `.md` da **0**, porque los `.md`
no están en su alcance — el escaneo CJK tiene que correr **sobre el `.py`/`.js` que genera el
texto**, que es donde está el error antes de que llegue al `.md`. Verificado contra HEAD archivo por
archivo: **0 escapes nuevos** (ALERTS_LOG 17 = 17, TEAM_STATUS 5 = 5, DASHBOARD 2 = 2).

### Estado

| Tramo | Estado |
|---|---|
| Botón de cache (Idea 50 A-F) | **MERGEADO** `950ea64`. Sin pendientes salvo el `onClear` |
| ALERT-89 (`camp` + guarda inversa) | **MERGEADO** `1176be6` |
| ALERT-84 T1 | **MERGEADO** `d64e688` (la fila decía "sin commitear": era falso) |
| ALERT-84 T3+T4 | **ENVIADO AL REVIEWER** `task-509ffb6eb907`, una sola pregunta |
| ALERT-84 T5 (build reproducible) | **ABIERTO**. Sin `_legendary_items_full.json` versionado no hay forma de regenerar el catálogo |
| Hook `onClear` | **ABIERTO**, esperando veredicto del Reviewer |
| 49G | **RECHAZADA** (ALERT-73). El fix va sobre `feat-idea49g-ach-acc-compacta` |
| 63 T3 | **DESBLOQUEADA**, pero contraria al T1 → decisión de Pablo |
"""
app('TEAM_STATUS.md', ts)

sl = """

## 2026-09-30 23:30 UTC — HB#71: un invariante de dos direcciones vigilado en una sola

**Lo que se hizo.** Recogí las 2 tareas del ciclo anterior (ambas `finished`, ambas tarde: describen
el árbol previo a `46b2d7f`, que ya aplicaba H1/H2 — el HB#70 ya lo tenía registrado, así que no
tocó código). Archivé con `close` las 2 coms vencidas del botón. Mandé al Reviewer la ronda 17
acotada a **una** pregunta (el contrato `registerRender`/`getState`, `task-509ffb6eb907`).

**El hallazgo, y es la lección.** El invariante de la Idea 52 es una **relación entre dos
conjuntos**, y solo se vigilaba la mitad `app -> API`. La otra mitad —que no haya un evento de la
API que el módulo no declare— no tenía un solo assert. Y como las dos mitades dan el mismo número,
**la aritmética lo hacía invisible**: 30 encounters, 30 eventos de la API, 1 fantasma y 1 faltante.
`ALL.length === 30` es justamente la aserción que hace esto *parecer* seguro: cuenta los dos lados
por separado y nunca los compara. Es una **aserción que pasa por construcción**, y el síntoma es
indistinguible del módulo sano.

**Y la corrección al PO, que es lo que casi se cuela.** La ronda 17 puso `vloxx` como 🔴 #1, "roto,
el fix más urgente del backlog". No lo está: es una decisión de producto **medida** (`/v2/raids` no
expone el ala Nexus of Eternity) que el test tenía allowlisted desde antes, con la frase *"medido,
no supuesto"* dentro. Si lo hubiera mergeado tal cual, el próximo ciclo habría ido detrás de un
fantasma y el trabajo real (`camp` y la guarda de la dirección inversa) habría quedado atrás.
**REGLA: una propuesta que llega con prioridades hay que contrastarla con el disco ANTES de
priorizarla, no después.** Y la prueba de que era una decisión y no un olvido está en que el test
la nombraba.

**`camp` no se agregó, y esa es la parte que quiero dejar escrita.** Es "1 línea", sí, pero el
fixture congelado lo trae como `{"id": "camp", "type": "Checkpoint"}`: **sin `name`**. Agregarlo
obligaría a inventar el nombre y el icono. **Un hallazgo con datos inventados es peor que un hueco
declarado** — el mismo criterio de ALERT-84 aplicado al revés. Queda en `FALTANTE_CONOCIDO` con el
motivo, y la lista es allowlist: cualquier otro faltante nuevo falla.

**ALERT-90, y es la tercera vez que me pasa.** La fila de ALERT-78 afirmaba que
`tools/count-suite-totals.py` estaba commiteado "para que la medición venga con el script que la
produce". No existe en disco, no está en HEAD y `tools/.gitignore` lo ignora: nunca entró. La regla
que la fila aplicaba era la que la propia fila incumplía. Es ALERT-88 con otro artefacto —una
afirmación sobre un archivo escrita sin mirar el archivo— y las tres son mías. **Corregí la fila
misma, no solo la adenda**: una corrección que vive en la fila siguiente deja la mentira como
titular.

**Tooling (2 correcciones de esta caja).** (1) `assert t.endswith('\n')` **pasa igual con CRLF que
con LF**: el working tree de este repo es CRLF (`core.autocrlf=true`) y el repo guarda LF, así que
agregar con `\n` mezclaba. Medido: `COMMS_LOG.md` quedó 252 CRLF + 2 LF. ALERT-87 tenía la regla
para el caso de *leer*; faltaba la de *agregar*. (2) **`close` mueve la copia del `inbox` a
`archive/` pero `overdue` lee la de `sent/`**, que no toca: `overdue` sigue reportando como
vencida una comm ya cerrada. No es una señal confiable para nada que uno mismo haya mandado.

**ALERT-79, y el scanner no lo agarró.** Se me coló `El PO提案 no se edita` en el script del
dashboard. Lo vi al releer el script antes de ejecutarlo. `tools/scan-cjk.py` da **0** sobre los
`.md` porque no los cubre: **el escaneo CJK tiene que correr sobre el `.py`/`.js` que genera el
texto**, que es donde está el error antes de que llegue al `.md`. Contra HEAD, archivo por archivo:
0 escapes nuevos.

**Estado.** Rama `alert89-direccion-inversa-raids`, commit `1176be6`. Suite **823/0 en 30 de 30**
(+1, la guarda nueva). `camp` declarado, no inventado. Ronda 17 reflejada en
`DASHBOARD_PO_IDEAS.md` con las dos correcciones al lado, sin editar la propuesta del PO.
"""
app('SESSION_LOG.md', sl)
