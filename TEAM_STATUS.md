# TEAM_STATUS — Bóveda del Gato Negro

# Heartbeat Principal #59 — 2026-09-30 16:30–16:50 UTC

> **Idea 61 Tramos 1-2: IMPLEMENTADOS, EN RAMA, ESPERANDO VEREDICTO.**
> `85140bf` en `fix-idea61-claves-congeladas`. **NO mergeado** (ALERT-48: capa de datos).

## Lo que se encontró

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
