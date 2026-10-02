# TEAM_STATUS â€” Heartbeat Principal

> **Actualizado:** 2026-10-02 21:0x UTC (HB#138) por el Principal.
> **Origen de verdad:** `gw2-dev` -> `origin/main` = `7fe7441` (verificado con
> `ls-remote`, 25 refs, `main` unico, sin duplicado `agents/main`).
> **Estado del clon al abrir:** **LIMPIO**. El working tree no tenia ni una
> modificacion y `main` era ancestro limpio de `origin/main`, 3 commits atras
> (`d0824e9` -> `89ed2a0`). `merge --ff-only`, nada que rescatar.
> **OJO, esto es distinto de ALERT-202:** ahi el clon estaba DIVERGIDO con el
> indice igual a `main` y el disco atras. Aca el indice y el disco coincidian y
> lo unico atrasado era el clon. El detector `git diff origin/main --stat` +
> `git status` los separa; correr solo el primero daria un falso positivo.

## ALERT-204 (este ciclo): la suite estaba en ROJO con el producto sano

> **Lo que se ve:** `node tools/hb100-suite.mjs` daba
> `TOTAL pass=3967 FAIL=1` y **exit code 1**, con el unico archivo marcado
> `hb105-perms-persistidos.test.js`. Ese test imprime `SUITE OK  11 pass /
> 0 FAIL`: esta sano.
>
> **Causa:** el runner decide mirando el **MAXIMO** de todos los conteos
> `N FAIL` de la salida (regla de `805eddb`, puesta para no dar falso limpio).
> El maximo esta bien para el caso que su propio comentario describe -- "3
> FAIL" a mitad, "0 FAIL" al final -- pero `hb105` imprime **"con el bug: 5 FAIL
> de 10 aserciones"**, que es su CONTROL NEGATIVO: una cuenta de fallos
> deliberados. `SUITE_FAIL` tampoco servia, porque el archivo nunca dice
> "SUITE FAIL". Resultado: **el unico resultado posible de ese arnes era rojo**,
> o sea su control era informacion muerta.
>
> **Lo primero que intente y FUE (medido):** cambiar el test para que no
> imprimiera "N FAIL". Descartado por regla propia: **arreglar el arnes para que
> el detector no lo vea es tapar el defecto, no corregirlo.** El defecto estaba
> en el detector.
>
> **Fix:** si el archivo emite **veredicto explicito** de exito (`SUITE OK`) y
> sale con **codigo 0**, ese veredicto pisa la heuristica. Solo **2 de 73**
> archivos emiten veredicto, asi que el maximo sigue rigiendo para el resto
> (medido archivo por archivo, no supuesto). **No abre un agujero:** si
> `exit != 0`, o si el mismo archivo dice `SUITE FAIL` en algun lado, el rojo se
> mantiene.
>
> **Arnés propio:** `tests/hb204-alert204-veredicto.test.js`, 14 aserciones.
> Fase roja **en las dos direcciones**: 12 pass / 2 FAIL contra el runner sin el
> fix, 14/0 con el. El CASO 2 es el que importa -- un `SUITE OK` con
> `exit != 0` **NO** puede quedar verde.
>
> **Suite ahora:** **3981 pass / 0 FAIL en 73 archivos, exit 0.**

## Dos errores de medicion propios, de este ciclo

1. **`echo EXITCODE=%ERRORLEVEL%` da 0 SIEMPRE.** En `cmd.exe` el
   `%ERRORLEVEL%` se expande en tiempo de **parseo**, antes de que corra el
   comando de la izquierda con `&`. Lei "suite verde" sobre una suite en rojo.
   Medir con `spawnSync` y leer `r.status`. Es el mismo ALERT-203 (el
   instrumento me devuelve un corte y leo el corte como si fuera el final), con
   otro disfraz.
2. **El harness nuevo se marco en rojo a si mismo.** Mis rotulos de PASS
   contenian la cadena `SUITE FAIL`, que es exactamente lo que el detector
> busca. **Un arnes tiene que cumplir la convencion de formato que el runner
> exige**, no solo la logica. Corregidos los rotulos, no el detector.

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
| **Arnes de la "escena 2"** (solo Strikes) | **CERRADO en el HB#136.** `d12ab8b`, 23/0, fase roja 16/7. Es la precondicion de T14/T15. |
| **T14 / T15** (la unica verdad de la vista) | **Con la precondicion ya escrita, lo que decide es el Reviewer: opcion C** (una sola pareja de botones en `index.html`, con T14 y T15 desapareciendo por construccion). El eje "2 flags o 1" esta descartado por el: **no deberia haber 2 escritores**. Sin su respuesta, T14 y T15 no se tocan, porque tienen **la misma causa raiz** que T13 (dos toggles que no coinciden) y tratarlos por separado hace que el arnes nuevo mida al reves. |

## Completado en este ciclo (HB#136)

- **Arnes de la "escena 2" (solo Strikes): CERRADO.** Era la precondicion que el
  Reviewer pidio dos veces (filas 118 y 125) antes de tocar T14/T15, y **no
  existia**. Primero la MEDI, como era debido: el arnes de T12-b
  (`hb125-t12b-escritor-comun.test.js:130-137`) registra **siempre los 4
  botones**, y con los 4 presentes el guard "por pareja" y el guard "todo o
  nada" se comportan igual -- o sea que **no puede distinguir el fix de su
  ausencia**. Por eso el aserto N2 deja escrita esa indistinguibilidad: es lo
  que impide que alguien lo descarte como redundante.
- **La escena, medida en el codigo real y no inferida:** `index.html` tiene
  **0 matches** de los 4 ids (se inyectan), `raid-tracker.js:1244` y
  `strike-tracker.js:558` los crean en sus `ensurePanelContent()`, y
  `router.js:1600` en `#/account/strikes` llama a `StrikeTracker.activate()`
  **sin tocar** `RaidTracker.activate()`. O sea: el par de Raids no llega a
  existir, y por eso el guard por pareja (y no el de "todo o nada") es el que
  evita 4 botones sin listener.
- **Fase roja sobre el PRODUCTO, no sobre el arnes** (mutando
  `raid-tracker.js` con el guard "todo o nada" y restaurando en `finally`):
  **16 pass / 7 FAIL, exit 1**. Con el producto sano: **23/0, exit 0**. El
  arnes detecta la regresion en las dos direcciones.
- **Correccion a una afirmacion MIA que estuvo instalada 2 ciclos:** afirme
  que el guard "todo o nada" dejaba hoy los dos strips mudos. Es un **riesgo
  futuro** del plan, no un defecto actual: el codigo tiene el guard por pareja
  (`raid-tracker.js:1078`) y la escena funciona. El Reviewer ya me lo habia
  corregido y lolei tarde (ALERT-127, tercera vez del mismo modo de fallo).
- **CORRECCION A UNA CIFRA QUE VENIA ANOTADA: la suite NO da 1872.** Medido
  con el archivo nuevo apartado: base = **1817 aserciones / 71 archivos**, con
  el archivo = **1840 / 72** (+23, exacto). El 1872 de los ciclos anteriores
  venia de un worktree con el clon divergido (ALERT-202). El `FetchError` que
  aparece en la salida es la **salida esperada** que afirma
  `idea84-leyenda-pipeline.test.js:330`, no un fallo.
- **PASO 0 limpio:** `inbox` vacio, `replies` vacio. 20 consultas vencidas en el
  canal de archivos, todas de ciclos anteriores.
- **PASO 1:** los 3 veredictos (120, 121, 125) **ya estaban leidos y anotados**
  desde el HB#135. No hay ninguno nuevo sin recoger. La fila 147/148
  (ALERT-179) sigue "Esperando": el cron del Reviewer esta **apagado por
  diseno** y verificar crons no me corresponde.
- **PASO 3: 0 propuestas, no se abrio ronda.** `po/hb99-dashboard` sigue en
  `4fe6162` (ronda 33), identico al HB#132 y al HB#135. `ls-remote` = 15 refs
  `po/*`. Sin ronda nueva no se manda nada al Reviewer.
- **Estado del clon:** limpio y alineado con `origin/main` = `a5edad6` al abrir
  el ciclo (`git diff origin/main --stat` vacio). Sin rescate este vez.

## Pendiente que requiere a Pablo

- Nada nuevo este ciclo. Sigue en pie lo de ALERT-194 (arbol de fabricacion) y
  la decision de si promover lo que este en `PROMOTIONS.md`.
## Alertas del ciclo

| | |
|---|---|
| **ALERT-199** | El conteo del paso 3 corria sobre 9 de 15 refs del PO. El numero cambio 3 veces sin que el PO escribiera nada. Verificado dos veces antes y no arreglado. **ABIERTA, corregida este ciclo.** |
| **ALERT-200** | Un extractor que matchea el comentario antes que el codigo produce "0" donde deberia decir "NO ENCONTRADO". Cuarta manifestacion de la clase. **ABIERTA.** |
| **ALERT-202** | El working tree del clon principal divergio de `main` (130 lineas revertidas, sin commit) y no habia detector. El censo `idea57.forma-contracts.test.js` es ciego en esa direccion: cuenta degradaciones y solo falla si el numero BAJA, asi que reabrir 3 bugs lo deja en verde (7 -> 10, `>= 7`). La suite completa si lo ve. CERRADA el rescate; **abierta la de proceso**: `git diff origin/main` sobre el clon. |
| **ALERT-201** | `TEAM_STATUS.md` 1 heartbeat atrasado. **CERRADA** en el HB#135. |
| **ALERT-203** | **ABIERTA, nueva este ciclo.** Mi PASO 1 fallo al LEER: el `grep` de `COMMS_LOG.md` salio truncado a 50000 B (109 de ~770 lineas) y trate 2 veredictos ya recogidos como nuevos. El recortepor azar dejo afuera las filas 092 y 097, que son las que ya contenian la correccion que yo iba a volver a aplicar. **Regla: el final de una salida truncada es un dato del instrumento, no del archivo.** Guard concreto: leer el maximo de `^\\| 16N \\|` con `Select-String` y compararlo con lo leido. |

## Completado en este ciclo (HB#137)

- **La premisa FALSA de `MIRROR_MAP` corregida donde se cita, no solo donde se
  respondio.** `COMMS_LOG.md:339-345` afirmaba que `raid_strike_view` esta en
  `MIRROR_MAP`. **FALSO, medido:** `storage.js:214-219` tiene 4 entradas y
  ninguna es de raids; la clave esta solo en `MIGRATION_PREFIXES` (`:127`) y
  `FALLBACK_MAP` (`:185`). Lo mismo para `gn:converter:state`, que esta en
  `FALLBACK_MAP` (`:170`). **La consecuencia cambia alcance:** `raid-tracker.js`
  `:1012/:1016` estan **fuera** del guard de la Idea 61 **por construccion**, y
  solo `:891` cae dentro. El Reviewer ya lo habia dicho dos veces -- en la fila
  097 (01/10) y de nuevo en `task-f191daf882b7`, pidiendo expresamente fixearlo
  "antes de que alguien lo cite como criterio" -- y la premisa seguia escrita
  en el bloque de contexto. **REGLA: la correccion va en el bloque que la
  origina, no solo en la fila del veredicto.** Un log que dice por que se
  pregunto es un log que se cita. **Cero lineas de codigo de producto.**
- **PASO 1, con la correccion de arriba:** los 2 veredictos que "recoggi"
  (`task-1f9ee292b9f3` y `task-f191daf882b7`) **ya estaban recogidos 36 h
  antes** -- filas 092 y 097. El primero es el veredicto BLOQUEADO de T12-b que
  aplico `45a5446`; el segundo es el `viewPref()` que se cerro como "nada que
  aplicar". **Ninguno era nuevo.**
- **PASO 3: 0 propuestas al Reviewer, no se abrio ronda.** Conteo sobre la
  **union de las 15 refs `po/*`**: **40 secciones, 34 con fecha / 6 sin fecha**;
  **8 CUENTA / 3 CERRADAS**; ronda maxima **37**, sin cambios respecto del
  HB#135. Controles del arnes en 0 (orden no-creciente 0, negativo fantasma 0),
  y las 13 rondas perdidas dan >=1 cada una. Se verifico **T19 (ronda 37)**
  contra el codigo real y su premisa es **CIERTA**: el filtro de
  `app.js:805` es de 1 sola clave (`ACCOUNT_KEYS`) y `:827` escribe
  `ACCOUNT_SELECTED`; pero su veredicto ya estaba en la fila 139 ("premisa
  CIERTA, conclusion NO"), asi que **no se manda lo ya respondido**.
- **Suite: 1840 aserciones / 0 FAIL, 72 de 72 archivos.** Coincide exacto con
  la base medida en el HB#136, sobre el clon ya resincronizado.
- **PASO 0 limpio:** `inbox` vacio, `replies` vacio, 19 `overdue` (todos de
  ciclos anteriores).

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
