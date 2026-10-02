# TEAM_STATUS — Heartbeat Principal

> **Actualizado:** 2026-10-02 13:0x UTC (HB#134) por el Principal.
> **Origen de verdad de la reunion:** `gw2-dev` → `origin/main` = `965bae5`
> (verificado con `ls-remote` al arrancar). **Este log va 1 heartbeat atrasado**
> respecto del codigo: HB#133 mergeo el fix de T12-b (`45a5446`) pero no
> actualizo este archivo. Detalle en ALERT-201.
> **Corte de la noche:** eran las 12:00 UTC, ya paso. No se arranco nada que no
> cerrara hoy.

## Que hay que saber primero

| | |
|---|---|
| **Cuentas** | 27 |
| **Cuentas selectas** | 2 (`-1-`) |
| **Salas** | 2 |
| **ovus / chat | 
| **UPs** | 0 |
| **Deudas** | 0 |
| **Wiki auricular** | https://es.guildwars2.com/wiki/Ar(listener%2C%20shield%2C%20Herald%2C%20Warhorn%2C%20WvW) |

## Estado por modulo

| Modulo | Estado | Nota |
|---|---|---|
| Cartera (Wallet) | Estable | |
| Meta & Eventos | Estable | |
| Logros | Estable | |
| Camara del Brujo (WV) | Estable | |
| Actividades | Estable | |
| Inventario y Personajes | Buscador unificado | |
| Personajes | Subvista del InventoryHub | |
| Conversor (Modal) | 3 tabs funcionales | |
| Dashboard Cartera | Estable | |
| Dashboard Inventario | 3 sets, tiers, carga 2 fases | |
| Raid Tracker | 8 alas, 33 encuentros | |
| Strike Tracker | 15 strikes | **ALERT-41: bloqueado, ids no resolvibles** |
| Panel de Cuentas | Estable | |
| Bienvenida | Estable | |
| Purchase Detail | KPI cards compactas | |
| WV Objectives Dashboard | Tabla comparativa multi-cuenta | |
| storage.js | v1.0.1 — migracion automatica | |

## Pendiente que requiere a Pablo

- **ALERT-41** — Strike Tracker: sus 15 ids no existen en la API. Condicion
  unica de cierre: el body crudo de `/v2/account/raids` con token real
  (permiso `progression`). Si el endpoint trae ids utilizables, se arregla; si
  no, **se borra el modulo** — decision de Pablo.
- **`tools/` sigue ignorado** (`.gitignore` = `*`). Es la red que encuentra los
  bugs de cada heartbeat y no se versiona. Decidir si deja de estarlo.
- **657 worktrees** acumulados y ramas remotas `po/*` que ya aportan 0
  secciones. Decision de Pablo.
- **`feat-idea49g-ach-acc-compacta`**: 620 lineas esperando veredicto desde el
  HB#102.
- **Que verdad manda**, la URL o la pref (destraba T14-T18).

## Tareas en curso

| | |
|---|---|
| **Idea 57 — 4 wrappers que degradan** | **Medido y confirmado, NO tocado.** El fix toca la capa de datos (ALERT-48) y espera veredicto del Reviewer. `getCommercePrices` es el caso dificil: sus call sites no usan `allSettled`. |
| **`importFromData` / `applyImportData`** (ALERT-179) | Esperando veredicto del Reviewer desde el HB#121. |
| **7 del patron B** (HB#118) | 7 modulos leen el `<select>` sin fallback a la capa. |
| **`getCommerceListings`** | Degrada a proposito, declarado. **No es deuda.** |

## Completado en este ciclo (HB#134)

- **`tools/hb116-union-po.mjs`**: las refs del PO se **leen** de `ls-remote` en
  vez de la lista a mano. 9 refs escritas contra 15 reales. La union pasa de
  36 a **40 secciones** y el conteo de 8 CUENTA se mantiene. Test
  `tests/hb134-cuento-po-refs.test.js`, 9 aserciones, **4 FAIL** en fase roja,
  9/0 con el fix. **ALERT-199**.
- **Paso 3 re-verificado contra `origin/main`**: las 8 propuestas que cuentan
  estan todas aplicadas o son la misma seccion duplicada. **0 nuevas para el
  Reviewer.** No se abrio ronda de consulta.
- **Idea 57 medida por cuerpo de funcion**: la fila es exacta (4 pendientes),
  el quinto que degrada es a proposito.
- **IDEA 64 del PO**: medida y **cerrada** — el fix (`15d6d75`) esta en
  `main` y el test (`tests/idea64-dos-pestanas.test.js`) da 30/0. La premisa
  del PO (que no habia test cross-tab) era cierta **en su momento** y quedo
  desactualizada por el merge. **ALERT-200** (el detector, no el codigo).
- **Suite completa: 72 archivos, 0 FAIL** (por exit code, no por texto —
  ALERT-172/176), corrida sobre worktree limpio de `origin/main`.

## Alertas del ciclo

| | |
|---|---|
| **ALERT-199** | El conteo del paso 3 corria sobre 9 de 15 refs del PO. El numero cambio 3 veces sin que el PO escribiera nada. Verificado dos veces antes y no arreglado. **ABIERTA, corregida este ciclo.** |
| **ALERT-200** | Un extractor que matchea el comentario antes que el codigo produce "0" donde deberia decir "NO ENCONTRADO". Cuarta manifestacion de la clase. **ABIERTA.** |
| **ALERT-201** | `TEAM_STATUS.md` quedo 1 heartbeat atrasado: HB#133 mergeo `45a5446` sin tocar este archivo. ABIERTA. |

## Estado de las propuestas al Reviewer

| Ronda | Props | Estado |
|---|---|---|
| 16 | IDEA 63 (3, "v3 skeleton") | MERGEADA (`eb69fb3`) |
| 18 | ALERT-84 (T3) | Mergeado/ubicado. STANDBY |
| 19 | IDEA 64 (2) | Mergeado en `main` (`15d6d75`), test 30/0. **Cerrada** |
| 33 | T12 (`leerComposite` memo + barra STRIKES) | **MERGEADA** (`9c93300`) |
| 34 | T13 (latch en click de pestana) | **MERGEADA** (`1e5aedb`) |
| 35 | T13-b (ALERT-195 `.md` truncado a 0 bytes) | **RESUELTA** |
| 36 | T19-c (4 lecturas crudas → capa) | **MERGEADA** (`d32e054`) |
| 37 | T19 (mecanismo de mutex) | **MERGEADA** — ALERT-118 cerrado |
| 38 | T19-a | **REFUTADA con razon** (ALERT-178): el router ya recarga. |
| 39 | T20-a (confirm de Gist) | **MERGEADA** (`2c53b32`) |
| 40 | T20-b / T20-c | **NO tocado.** T20-c es el que *evita* la perdida. |
| 41 | T16 (ATAQUE) | **NO APLICADA.** Sin metricas propias no se toca. |
| 42 | 11-13 | **NO APLICADAS.** En revision. |

**Total: 0 propuestas nuevas para el Reviewer en este ciclo.** No se abrio ronda
de consulta porque el conteo, una vez corregido el conjunto, no dio items
vivos: las 8 que cuentan estan aplicadas o duplicadas.

## Pendientes de plataforma

- **Code-Reviewer**: operative pero con cron apagado por diseno (bajo demanda).
  2-15 min por revision real. No declarar muerto antes de 20 min.
- **PO**: 20 comunicaciones vencidas en el canal de archivos; la mas reciente es
  del HB#132. El PO esta en MODO PODA.
- **Documentador**: heartbeat cada 4h. Mantiene CHANGELOG/README/ONBOARDING.

## Advertencia sobre collaboration

> En QwenPaw la colaboracion multi-agente puede colgarse si la tarea es muy
> larga. Usar **siempre** modo background. Si una sesion se cuelga: NO
> reintentar la misma consulta; identificar con `qwenpaw chats list --agent-id`,
> eliminar con `qwenpaw chats delete`, y reiniciar.
>
> **Reglas de esta casa:** (a) el canal de **archivos** (`_comms/cli.py`) es la
> via primaria, no `submit_to_agent`; (b) un detector tiene que discriminate
> — un numero que no puede dar el resultado contrario no esta midiendo; (c) un
> **CERO** y un **"NO ENCONTRADO"** no son el mismo resultado.
