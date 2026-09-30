# -*- coding: utf-8 -*-
"""HB#71 - parte 3: espejo de la ronda 17 en DASHBOARD_PO_IDEAS.md con las
correcciones medidas, y cierre en TEAM_STATUS + SESSION_LOG."""
import io, os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'C:\Mis Archivos\GW2 online\gw2-dev'


def rd(p):
    return io.open(os.path.join(ROOT, p), encoding='utf-8', newline='').read()


def wr(p, t):
    io.open(os.path.join(ROOT, p), 'w', encoding='utf-8', newline='').write(t)


DASH = 'DASHBOARD_PO_IDEAS.md'
t = rd(DASH)

# --- 1. el header declara el estado REAL, no el que pidio el PO
old_hdr = '> Actualizado: 2026-09-30T20:00:00Z (Heartbeat PO ronda 16'
i = t.index(old_hdr)
j = t.index('\n', i)
hdr_viejo = t[i:j]
nuevo_hdr = ('> Actualizado: 2026-09-30T23:30:00Z (Heartbeat PO ronda 17 — 🔴 ALERT-84: '
              '"Armería Legendaria" es un item de menú **visible** que decía "Cargando catálogo de '
              'legendarias…" **para siempre**; `loadLegendaryData()` es un stub. Los 101 KB del '
              'catálogo y del render están escritos y NO se cargan. **T1 ya commiteado** '
              '(`d64e688`). T3/T4 enviados al Reviewer. Y el hallazgo que la ronda no vio: el '
              'invariante de encounters estaba vigilado en **una sola dirección** (ALERT-89) — '
              'entra también la ronda 16 (IDEA 63), mergeada en `eb69fb3`)')
t = t[:i] + nuevo_hdr + t[j:]

# --- 2. la seccion de la ronda 17, arriba de todo, con lo medido al lado
seccion = """
## ACTUALIZACION 2026-09-30 23:30 UTC — Heartbeat PO ronda 17 — 🔴 ALERT-84: un item de menú que no puede funcionar, y el trabajo que lo haría funcionar ya está escrito

> **Esta sección es el espejo de la ronda 17 del PO, con las correcciones que salieron al
> verificar contra el código. La propuesta del PO no se edita: donde discrepa del disco, se muestran las
> dos columnas y el disk gana** (ALERT-75: un resumen no puede pisar al artefacto que resume).

### Lo que encontró el PO (sostenido por el disco)

Un item de menú **visible** (`index.html:761`), con ruta registrada (`router.js:125/1562`),
panel (`index.html:539`) y script (`index.html:999`), llega a
`loadLegendaryData()` — **stub**, resuelve `[]` — y después a `renderCatalogSkeleton()`,
que escribe "Cargando". **Sin timeout, sin error, sin reintento: para siempre.**

Los 101 KB ya escritos y **no cargados por `index.html`**: `js/legendary-data.js`
(85.813 B, 206 legendarias, verificadas contra la API) y `js/render-catologo.js` (17.950 B).

Y si se cargaran, **no funcionarían**: `render-catologo.js:361` llama `registerRender()` (5 usos)
y `getState()` (1 uso), y la API pública real del tracker (`:308-339`) no expone ninguna de las
dos. **Se escribió contra una versión de `legendary-tracker.js` que nunca existió.**

> **La regla que sale de acá es la mejor de la ronda y queda como criterio del equipo:**
> *un esqueleto que llega hasta el menú deja de ser un esqueleto.* "Base primero, Phase 2 después"
> es correcto **hasta que `index.html` carga el esqueleto y el router publica la ruta**; ahí pasó a
> ser una promesa, y la app no puede retractarla porque no existe el estado "todavía no".
> **Corolario:** si el backlog tiene un "Phase 3 Commit 1", la pregunta no es "¿está el código
> escrito?" sino **"¿está cableado, y contra qué?"**

### 🔴 Corrección 1 — `vloxx` NO estaba roto (y era el #1 de la tabla de prioridades)

La ronda lo marco como **"sigue roto… quinto caso de la Idea 52… el fix más urgente del
backlog"**, 🔴 #1. Contra el disco:

- `raid-tracker.js:145` declara `vloxx` en el ala 9, y `idea52` lo tiene **allowlisted desde
  antes** (`FANTASMA_CONOCIDO`, `:110`).
- `idea52:145-147` afirma, textual: **"`vloxx` NO esta en el catalogo de la API (medido, no
  supuesto)"**, "vloxx sigue en WINGS: el ala del CM de Sept 29 se deja intacta a proposito", y
  "no tiene claves de datos: no hay huerfanas que limpiar".
- El motivo esta escrito: **`/v2/raids` no expone el ala Nexus of Eternity.** No es un rename mal
  corregido; es una decisión de producto con test que falla si la lista de fantasmas **crece**.

**No había un quinto caso de la Idea 52. Había un caso nuevo en la dirección contraria.**

### 🔴 Corrección 2 — el hallazgo real: el invariante estaba vigilado en UNA sola dirección

La Idea 52 midió que *todo encuentro del módulo existe en la API*. **La mitad inversa —que no
haya un evento de la API que el módulo no declare— no estaba vigilada.** Y la aritmética la
hacía invisible:

| | |
|---|---|
| encuentros que declara el módulo (`ALL.length === 30`) | 30 |
| eventos del catálogo de la API (`API.size === 30`) | 30 |
| **fantasmas** `app -> API` (vigilado) | 1 → `vloxx`, allowlisted |
| **faltantes** `API -> app` (**NO vigilado**) | 1 → **`camp`** |

**Los dos totales coinciden y hay un id equivocado en cada lado.** `ALL.length === 30` es la
asercion que hace esto *parecer* seguro: es una **asercion que pasa por construcción** (ALERT-77).
Cuenta los encuentros, pero **cuenta los dos lados por separado y nunca los compara**.

**`camp` — el "1 línea" de la ronda — es real, y NO se agregó a propósito.** El fixture congelado
(`tests/fixtures/raids-catalogo-2026-09-30.json`) lo trae como `{"id": "camp", "type":
"Checkpoint"}`: **sin `name`**. Agregarlo obligaría a inventar el nombre y el icono, y **un
hallazgo con datos inventados es peor que un hueco declarado**. Queda en `FALTANTE_CONOCIDO` con
el motivo escrito, y **la lista es la allowlist**: cualquier *otro* faltante nuevo falla igual
que un fantasma nuevo. Mergeado `1176be6`; fase roja 1 FAIL nombrando `camp`; suite **823/0**.

### Prioridades, con lo verificado

| # | Ítem | Estado real |
|---|---|---|
| 🔴 1 | ~~`vloxx` roto~~ | **DESCARTADO**: decisión de producto medida, con test. No hay fix que hacer |
| 🔴 2 | **ALERT-89**: `camp` + la guarda de la dirección inversa | **MERGEADO** (`1176be6`). El encuentro en sí espera el nombre oficial |
| 🟢 3 | ALERT-84 **T1** ("Coming soon") | **YA COMMITEADO** (`d64e688`) — la ronda lo listaba como pendiente de 10 min |
| 🔴 4 | ALERT-84 **T3+T4** (`loadLegendaryData` real + el contrato `registerRender`/`getState`) | **ENVIADO AL REVIEWER** (`task-509ffb6eb907`), como **una sola pregunta** |
| 🟡 5 | **T5**: build reproducible del catálogo (`_legendary_items_full.json` no está versionado y el script que lo consume no puede correr) | **ABIERTO**. La observación del PO es correcta y es la que mas duerde: el refresh depende de que el PO "se acuerde" |
| 🟡 6 | 49G (`ach_acc` compacto) | sin cambio — sigue cerrando la cuota |
| 🟡 7 | 63 T3 (persistir filtros por cuenta) | **DESBLOQUEADA** (T1+T2 en `eb69fb3`), pero **contraria** al T1. Preferencia de uso → Pablo |
| 🔴 8 | 49D | bloqueada por la Idea 61 (no implementarla) |

### Lo que este espejo NO hace

**No propone promover a `origin`.** La ronda tampoco lo propone, y queda dicho explícito en los
dos lados.

---

"""
k = t.index('\n---\n')
t = t[:k + 1] + seccion + t[k + 1:]
wr(DASH, t)
print('dashboard ->', len(seccion), 'chars de seccion')
