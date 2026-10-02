# TEAM_STATUS — Bóveda del Gato Negro

# Heartbeat Principal #60 — 2026-09-30 17:00–17:20 UTC

> **Dos cosas esperando veredicto del Reviewer, las dos SIN mergear (ALERT-48).**
> `85140bf` (Idea 61 Tramos 1-2) y `c04496e` (Idea 50 Tramo F).

## Lo que se hizo en este ciclo

### 1. La 49D NO se implementa — y el aviso lo dio el PO

El PO detectó que **su propia** recomendación de la 49D (barrido de huerfanas
al arrancar) estaba mal: tal como estaba escrita **borra `gw2_keys`**, o sea la
lista de las 27 cuentas de Pablo. LoSelf-auditó y lo retiró.

**Verifiqué su diagnóstico contra el repo y los 3 puntos dan exactamente lo que
midió.** No es un error de dato: es que respondió desde la lista de su Heartbeat
09 en vez de mirar su propio `DASHBOARD_PO_IDEAS.md`.

**La 49D queda BLOQUEADA hasta que exista la Idea 61 Tramo 3** — ese test es el
que dice que la clave nueva quedó escrita antes de borrar la vieja. Sin él, el
borrado es una apuesta.

### 2. Idea 50 Tramo F: `cacheClear()` ahora borra de verdad

`api-gw2.js:1632` era `try { __mem.clear(); __inflight.clear(); }`: limpiaba la
cache de la **sesión** y no la de **disco**. La cuota (~4.98 MB medidos) seguía
llena, así que "limpiar cache" no liberaba nada. Y tiene **0 callers**: no hay
botón, no hay escape.

Rama `fix-idea50f-cacheclear-real`, commit `c04496e`, `api-gw2.js` v2.29.0.
**Sin mergear** (ALERT-48). Suite completa **587/0** (antes 538).

**La decisión de diseño que hay que tener presente: allowlist EXACTA de las 18
claves, no borrado por prefijos.** La propuesta del PO era por familias
(`ach_*`, `commerce_*`, `items_cache_*`) y **medida es falsa**: las 18 claves no
comparten ningún prefijo. `wallet` y `luck` son nombres pelados — no arrancan por
`ach_` ni por `commerce_` — así que un barrido por familias dejaba vivas
justo `wallet`, que es de las que más cuota gasta.

`kept` no es un extra: es la garantía. No se borran `gn:account:keys` ni
`gw2_keys` (las 27 cuentas), ni pines, tema ni caches de otros módulos.

**NO cambia lo que Pablo ve** (sigue con 0 callers). El botón es el Tramo
siguiente, y va con veredicto propio.

### 3. Corrección recíproca entre PO y Principal

Los dos Featured casi cometemos el mismo error, en direcciones opuestas:

- **El PO** respondió desde el estado de la ronda anterior y casi me manda una
  idea que borra la lista de cuentas.
- **Yo** armé el inventario grepeando `var key = ...`, me dio 17 claves y
  concluí que `getItemsMany` no cacheaba. **Falso:** cachea en
  `items_cache_v1:<lang>`, `api-gw2.js:1511` lo lee y **`:1581` lo escribe con
  `lsSet` directo, sin pasar por `putCache()`**. Y lo escribí como afirmación en
  el test, así que el error habría viaja al repo.

**Regla que sale:** un inventario incompleto no se disculpa como "no existe": se
paga como una afirmación falsa. Y en un allowlist destructivo, esa afirmación
es la que decide qué se borra.

## Tareas en curso

| # | Qué | Estado | Bloqueante |
|---|---|---|---|
| 059 | Idea 61 Tramos 1-2 (`gn:` congelada) | Rama `85140bf`, **sin mergear** | Veredicto del Reviewer |
| 060 | Idea 50 Tramo F (`cacheClear` real) | Rama `c04496e`, **sin mergear** | Veredicto del Reviewer |
| — | Idea 50 Tramo E (`getCache` borra vencida) | No hecho, **a propósito** | Ciclo siguiente |
| — | Botón "limpiar cache" | No hecho | Depende del veredicto de la 060 |
| — | Idea 48 badge CM / 49 pt.2 | **Bloqueadas** | Body crudo de `/v2/account/raids` con token |

## Propuestas con el Reviewer

| id | Asunto | Enviado | Estado |
|---|---|---|---|
| `4b2624` | Idea 61 T1-2: la `gn:` congelada | 16:41:48Z | ⏳ esperando |
| `982658` | Idea 50 Tramo F: allowlist de 18 y la garantía | 17:09:48Z | ⏳ esperando |

Ambas entregadas por `cli.py ask` y **verificadas archivo por archivo en la
bandeja del Reviewer con su `to` correcto**.

## Alertas

- **ALERT-48** — sin veredicto, nada de capa de datos se mergea. **Aplicada las
  dos veces este ciclo.**
- **ALERT-63** — asks que se escriben a sí mismos. **Cerradas las 4** de la
  Idea 49 que seguían figurando como vencidas.
- **ALERT-67 (nueva)** — `cli.py close` archiva pero **`overdue` sigue reportando
  los mismos archivos**. Un heartbeat que se guíe por `overdue` para decidir
  "qué contesto" va a trabajar tareas ya resueltas. No bloqueante; el CLI debe
  unificar el criterio.

## Una norma que sale del ciclo

**Un mensaje está entregado cuando está en la bandeja del otro y su `to` dice el
otro.** El directorio del que salió (`sent/`) y el nombre del archivo **no**
cuentan. Escribí dos mensajes a `default/sent/` creyendo que entregaba; ninguno
llegó. El modo de fallo es el peor porque uno cree que avisó.

## Lo que se le pide a Pablo

Nada urgente. La 50F y la 61 T1-2 están esperando veredicto del Reviewer, y
ambas están en rama: **nada de esto está en producción** (y no se promovdrá sin
que lo pidas por nombre).

Lo único que sigue bloqueado y **no puedo resolver sin vos** es el **body crudo
de una llamada a `/v2/account/raids` con token**. Sin eso, la Idea 48 y el punto
2 de la Idea 49 no cierran — y no es falta de análisis: el dato todavía no
existe en el repo. El PO ya escaneó las 8.349 entradas del catálogo y el
negativo está medido; falta el positivo de la API.

---


> **Dos cosas esperando veredicto del Reviewer, las dos SIN mergear (ALERT-48).**
> `85140bf` (Idea 61 Tramos 1-2) y `c04496e` (Idea 50 Tramo F).

## Lo que se hizo en este ciclo

### 1. La 49D NO se implementa — y el aviso lo dio el PO

El PO detectó que **su propia** recomendación de la 49D (barrido de huerfanas
al arrancar) estaba mal: tal como estaba escrita **borra `gw2_keys`**, o sea la
lista de las 27 cuentas de Pablo. Lo editó, Self-auditó y lo retiró.

**Verifiqué su diagnóstico contra el repo y los 3 puntos dan exactamente lo que
midió.** No es un error de dato: es que respondió desde la lista de su Heartbeat
09 en vez de mirar su propio `DASHBOARD_PO_IDEAS.md`.

**La 49D queda BLOQUEADA hasta que exista la Idea 61 Tramo 3** — ese test es el
que dice que la clave nueva quedó escrita antes de borrar la vieja. Sin él, el
borrado es una apuesta.

### 2. Idea 50 Tramo F: `cacheClear()` ahora borra de verdad

`api-gw2.js:1632` era `try { __mem.clear(); __inflight.clear(); }`: limpiaba la
cache de la **sesión** y no la de **disco**. La cuota (~4.98 MB medidos) seguía
llena, así que "limpiar cache" no liberaba nada. Y tiene **0 callers**: no hay
botón, no hay escape.

Rama `fix-idea50f-cacheclear-real`, commit `c04496e`, `api-gw2.js` v2.29.0.
**Sin mergear** (ALERT-48). Suite completa **587/0** (antes 538).

**La decisión de diseño que hay que tener presente: allowlist EXACTA de las 18
claves, no borrado por prefijos.** La propuesta del PO era por familias
(`ach_*`, `commerce_*`, `items_cache_*`) y **medida es falsa**: las 18 claves no
comparten ningún prefijo. `wallet` y `luck` son nombres pelados — no arrancan por
`ach_` ni por `commerce_` — así que un barrido por familias dejaba vivas
justo `wallet`, que es de las que más cuota gasta.

`kept` no es un extra: es la garantía. No se borran `gn:account:keys` ni
`gw2_keys` (las 27 cuentas), ni pines, tema ni caches de otros módulos.

**NO cambia lo que Pablo ve** (sigue con 0 callers). El botón es el Tramo
siguiente, y va con veredicto propio.

### 3. Corrección recíproca entre PO y Principal

Los dos Featured casi cometemos el mismo error, en direcciones opuestas:

- **El PO** respondió desde el estado de la ronda anterior y casi me manda una
  idea que borra la lista de cuentas.
- **Yo** armé el inventario grepeando `var key = ...`, me dio 17 claves y
  concluí que `getItemsMany` no cacheaba. **Falso:** cachea en
  `items_cache_v1:<lang>`, `api-gw2.js:1511` lo lee y **`:1581` lo escribe con
  `lsSet` directo, sin pasar por `putCache()`**. Y lo escribí como afirmación en
  el test, así que el error habría viaja al repo.

**Regla que sale:** un inventario incompleto no se disculpa como "no existe": se
paga como una afirmación falsa. Y en un allowlist destructivo, esa afirmación
es la que decide qué se borra.

## Tareas en curso

| # | Qué | Estado | Bloqueante |
|---|---|---|---|
| 059 | Idea 61 Tramos 1-2 (`gn:` congelada) | Rama `85140bf`, **sin mergear** | Veredicto del Reviewer |
| 060 | Idea 50 Tramo F (`cacheClear` real) | Rama `c04496e`, **sin mergear** | Veredicto del Reviewer |
| — | Idea 50 Tramo E (`getCache` borra vencida) | No hecho, **a propósito** | Ciclo siguiente |
| — | Botón "limpiar cache" | No hecho | Depende del veredicto de la 060 |
| — | Idea 48 badge CM / 49 pt.2 | **Bloqueadas** | Body crudo de `/v2/account/raids` con token |

## Propuestas con el Reviewer

| id | Asunto | Enviado | Estado |
|---|---|---|---|
| `4b2624` | Idea 61 T1-2: la `gn:` congelada | 16:41:48Z | ⏳ esperando |
| `982658` | Idea 50 Tramo F: allowlist de 18 y la garantía | 17:09:48Z | ⏳ esperando |

Ambas entregadas por `cli.py ask` y **verificadas archivo por archivo en la
bandeja del Reviewer con su `to` correcto**.

## Alertas

- **ALERT-48** — sin veredicto, nada de capa de datos se mergea. **Aplicada las
  dos veces este ciclo.**
- **ALERT-63** — asks que se escriben a sí mismos. **Cerradas las 4** de la
  Idea 49 que seguían figurando como vencidas.
- **ALERT-67 (nueva)** — `cli.py close` archiva pero **`overdue` sigue reportando
  los mismos archivos**. Un heartbeat que se guíe por `overdue` para decidir
  "qué contesto" va a trabajar tareas ya resueltas. No bloqueante; el CLI debe
  unificar el criterio.

## Una norma que sale del ciclo

**Un mensaje está entregado cuando está en la bandeja del otro y su `to` dice el
otro.** El directorio del que salió (`sent/`) y el nombre del archivo **no**
cuentan. Escribí dos mensajes a `default/sent/` creyendo que entregaba; ninguno
llegó. El modo de fallo es el peor porque uno cree que avisó.

## Lo que se le pide a Pablo

Nada urgente. La 50F y la 61 T1-2 están esperando veredicto del Reviewer, y
ambas están en rama: **nada de esto está en producción** (y no se promovdrá sin
que lo pidas por nombre).

Lo único que sigue bloqueado y **no puedo resolver sin vos** es el **body crudo
de una llamada a `/v2/account/raids` con token**. Sin eso, la Idea 48 y el punto
2 de la Idea 49 no cierran — y no es falta de análisis: el dato todavía no
existe en el repo. El PO ya escaneó las 8.349 entradas del catálogo y el
negativo está medido; falta el positivo de la API.

---

# Lo que se encontró

La lista de cuentas de Pablo vivía en **dos claves**, y solo una estaba viva:

| | clave | quién escribe | quién lee |
|---|---|---|---|
| **viva** | `gw2_keys` (legacy) | `app.js:622`, `accounts-panel.js:181` a pelo | 6 módulos a pelo |
| **congelada** | `gn:account:keys` | solo `settings-manager.js:242` (import del Gist) | `router.js`, **`settings-manager.js` (el Gist)** |

Y `storage.js` hacía lo contrario de lo que se espera: `MIGRATION_MODE='copy'` no
borra la legacy, `_migrateOne` arranca con `if (Storage.hasRaw(newKey)) return`, y
`migrate()` corre en **cada** arranque.

> **La `gn:` no está desactualizada: está CONGELADA.** Y no hay forma de notarlo,
> porque `Storage.get` devuelve un array **bien formado** con la lista vieja. Un
> array vacío se ve; 27 cuentas que ya no son las tuyas, no.

**Dos bugs, una sola causa:**

- **Bug A — el backup sube una lista vieja.** `gist-sync.js:406` sube
  `exportApiKeys()` → `Storage.get(gn:account:keys)`. Como la `gn:` existe, el
  fallback a `gw2_keys` no se activa. Toast *"Configuración subida correctamente"*,
  y es verdad: no es tu configuración.
- **Bug B — importar en un navegador nuevo deja la app SIN cuentas.** El import
  escribe la `gn:`; en un navegador limpio no existe `gw2_keys`, así que `app.js`
  hacía `JSON.parse(null) || []`. Panel vacío, toast *"sincronizada
  correctamente"*, reload. **No es hipotético: es exactamente el escenario para el
  que existe el botón de Gist.**

## Y era una clase, no una clave

`tools/audit-61-congeladas.mjs` (nuevo) recorre los pares que el **propio**
`storage.js` declara y los cruza contra los módulos reales. Encuentra **4**
congeladas, no 1: `gn:account:keys`, `gn:account:selected`,
`gn:activities:home:nodes`, `gn:activities:toggles`. Las cuatro suben al Gist por
el mismo camino. La que reportó el PO es una de cuatro.

## El fix

`MIRROR_MAP` **declara** que para esas 4 claves la legacy sigue siendo la fuente
de verdad. No es heurística: es una lista, con el motivo escrito al lado. Una clave
que no está ahí conserva el comportamiento anterior, que es el correcto para las que
ya no tienen escritor crudo.

1. `Storage.get`/`getRaw` leen la legacy **primero**.
2. `Storage.set`/`remove` escriben/borran **las dos**.
3. `_resyncMirrors()` refresca la `gn:` desde la legacy en cada arranque, y **solo
   si la legacy existe**. *"Solo si existe"* y no *"si difieren"*: una `gn:` sola
   puede ser legítima (navegador nuevo) y borrarla sería perder el dato.
4. Los escritores crudos pasan por `Storage`: `app.js`, `accounts-panel.js:181`,
   `activities.js`, `activities-theme.js`. `LS_KEYS` y `LS_SELECTED_KEY` se borran
   de `app.js`: sin escritores, `Storage` mantiene la legacy al día para los 6
   lectores, y no cambian de comportamiento.

**Lo que NO se tocó, a propósito:** los 6 lectores a pelo. No se migra ningún módulo
al prefijo `gn:`. La única capa que cambia es `storage.js` + 4 call sites de
escritura.

## Verificación

| Qué | Resultado |
|---|---|
| `node --check` en los 5 archivos | limpio |
| `tests/idea61-claves-congeladas.test.js` | **15 pass / 0 FAIL** |
| el mismo contra los 5 archivos **sin** el fix (`git stash push`+`pop`) | **7 pass / 8 FAIL** — tiene dientes |
| suite completa `tests/_run-all.js` | **563 aserciones, 0 FAIL**, 24 archivos |

Las secciones 1-4 del test eran la **especificación** (fallaban contra el código sin
el fix, patrón del Tramo 1 de la Idea 57). La sección 5 afirma un **invariante que
el fix no cambia** —`gw2_keys` no es una huérfana, es la lista de cuentas— pero
cuya **forma** sí cambió, porque el escritor de la legacy pasó de `app.js` a
`storage.js`. Se actualizó para que mida el invariante y no el mecanismo. **Es
justo la clase de cambio que el Reviewer marque en P4**, así que se lo pedí
auditado explícitamente en vez de darlo por bueno yo.

## Idea 49D (barrido de huérfanas): BLOQUEADA, y ahora por una razón escrita

Tal como está escrita **borra `gw2_keys`**, que no es una huérfana: es la lista de
27 cuentas. La sección 5 del test lo deja dicho y contable. Sigue sin implementarse.

## Estado del ciclo

| | |
|---|---|
| **Reviewer** | OPERATIVO. Recibido `20260930T164148Z-4b2624` (verificado en su inbox). **NO mergeado hasta el veredicto.** |
| **PO** |-operative HB#13 (Idea 61 + bloqueo 49D). Pregunta abierta del HB#58 (dónde va el badge del LM, Raid o Strike Tracker) **sin responder**. |
| **Documentador** | heartbeat 4h, `HEARTBEAT.md` vacío. Sin acción este ciclo. |
| **Idea 57** | T1-T4 mergeados. `957cc2c` (T2) es el único sin veredicto, con la excepción anotada. |
| **Idea 61** | T1-T2 en rama, esperando veredicto. T3 es el test, ya escrito. |

## ALERT-66 (nueva, y es mía)

Escribí a mano el JSON del pedido al Reviewer en `default/sent/`. El archivo existe,
está bien formado, dice `to: Code-Reviewer`, y `sent/` es justo donde el emisor mira
para creer que envió. **No fue entregado**: `agentlink.ask()` hace *dos* cosas
—escribe en `<to>/inbox/` **y** un recibo en `<from>/sent/`— y yo hice solo la
segunda.

Es ALERT-62/63/65 por cuarta vez, y la cometí en el mismo heartbeat en que reporté
las tres anteriores. Lo que la delató fue la verificación que ya era costumbre:
leer el inbox del otro.

> **Regla: el recibo es la CONSECUENCIA de la entrega, no la entrega.** `sent/` no
> prueba nada. Después de escribir un pedido a mano, la única verificación que vale
> es abrir `<to>/inbox/` y confirmar el archivo.

## Lo que viene

1. **Veredicto del Reviewer** sobre la 61 (5 puntos, P4 es el importante: si
   `MIRROR_MAP` es una tercera lista de la misma verdad que `FALLBACK_MAP`, se
   resuelve antes de mergear).
2. **PO**: contesta dónde va el badge del LM del 13-oct (Raid o Strike Tracker).
3. **Idea 49G** (`ach_acc` compacta) sigue siendo la de mayor impacto medido: el
   punto de quiebre de la cuota está en ~2.700 logros por cuenta y Pablo tiene 27
   cuentas.
