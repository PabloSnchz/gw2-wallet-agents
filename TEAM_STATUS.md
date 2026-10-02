# TEAM_STATUS — Heartbeat Principal

> **Actualizado:** 2026-10-02 18:3x UTC (HB#135) por el Principal.
> **Origen de verdad:** `gw2-dev` -> `origin/main` = `ef49964` (verificado con
> `ls-remote`). **ALERT-201 CERRADA**: este log ya no va atrasado.
> **El clon de trabajo ESTABA atrasado** 4 commits (`067754f`) y con 2
> archivos revertidos en disco. Corregido este ciclo. Ver ALERT-202.

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
| **Arnes de la "escena 2"** (solo Strikes) | **Pedido por el Reviewer** en T12-b. Es la
|  | precondicion de T14/T15: hoy esa escena ANDA, y el test que la fija es lo |
|  | que distingue (3a) de (3b). Falta medir si ya tiene cobertura. |

## Completado en este ciclo (HB#135)

- **RESCATE: el working tree del clon principal tenia 130 lineas YA MERGEADAS
  revertidas.** `js/api-gw2.js` y `tests/idea57.forma-contracts.test.js`
  estaban en un estado del ~30/09: sin los 3 guards de FORMA, sin `lsHas`, sin
  `__expiredDrops`, y con la cabecera que HB#125 ya habia corregido. El INDEX
  era identico a `origin/main`: solo el disco estaba atras.
  `git restore --worktree` + `git merge --ff-only origin/main`. Copia del estado
  viejo en `%TEMP%\hb135-rescate\`. **ALERT-202.**
- **MEDIDO por que nadie lo vio: el censo mira al reves.** `main` degrada en
  **7** sitios, el revertido en **10**, y el aserto 4 de
  `idea57.forma-contracts.test.js` es `>= 7` con la nota "si es a proposito,
  actualiza este numero": **subir el recuento lo deja en verde.**
- **PERO la suite SI lo ve**, y esto corrige mi propio diagnostico:
  `idea57-t2-forma-propaga.test.js` da **8 FAIL** contra el revert y 21/0
  contra `main`. **Mi afirmacion de que el Tramo 2 se aplico sin test de
  comportamiento era FALSA.** Escribi un test redundante (61 asserts, 36 FAIL
  en rojo) y lo **borre**: duplicar un arnes es el transversal #4.
  **El defecto real no es del codigo ni del arnes: el clon de trabajo divergio
  de `main` y nadie lo nota porque nadie corre la suite contra el clon.**
  Detector barato para el proximo ciclo: `git diff origin/main --stat` sobre
  los archivos trackeados del clon.
- **3 veredictos del Reviewer recogidos** (paso 1, todos `finished`): T13
  (fila 125), T14+T15 (fila 121) y T12-b (fila 120). **Los tres YA estaban
  anotados** en `COMMS_LOG.md` desde ciclos anteriores: me los lei tarde.
  Tercera vez del mismo modo de fallo (ALERT-127).
- **Correccion del Reviewer a una premisa mia**: el guard "todo o nada" de
  `wireViewToggle` **no** deja hoy los dos strips mudos -- es **riesgo futuro**
  del plan, y la escena "solo Strikes" **funciona hoy**.
- **Paso 3: 0 propuestas nuevas.** `po/hb99-dashboard` sigue en `4fe6162`,
  identico al HB#132. `ls-remote` = 15 refs (confirmado). Controles del
  `hb116-union-po.mjs` en 0 (orden roto 0, negativo 0), 40 secciones.
  **No se abrio ronda** porque la rama no se movio: el conteo no puede
  cambiar sin que el PO escriba.
- **Suite completa: 72 archivos, 1872 aserciones, 0 FAIL**, por exit code,
  sobre worktree limpio de `origin/main`.

## Alertas del ciclo

| | |
|---|---|
| **ALERT-199** | El conteo del paso 3 corria sobre 9 de 15 refs del PO. El numero cambio 3 veces sin que el PO escribiera nada. Verificado dos veces antes y no arreglado. **ABIERTA, corregida este ciclo.** |
| **ALERT-200** | Un extractor que matchea el comentario antes que el codigo produce "0" donde deberia decir "NO ENCONTRADO". Cuarta manifestacion de la clase. **ABIERTA.** |
| **ALERT-202** | El working tree del clon principal divergio de `main` (130 lineas revertidas, sin commit) y no habia detector. El censo `idea57.forma-contracts.test.js` es ciego en esa direccion: cuenta degradaciones y solo falla si el numero BAJA, asi que reabrir 3 bugs lo deja en verde (7 -> 10, `>= 7`). La suite completa si lo ve. CERRADA el rescate; **abierta la de proceso**: `git diff origin/main` sobre el clon. |
| **ALERT-201** | `TEAM_STATUS.md` 1 heartbeat atrasado. **CERRADA** en el HB#135. |

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
