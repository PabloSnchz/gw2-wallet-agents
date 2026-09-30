# TEAM_STATUS — Bóveda del Gato Negro

> Actualizado: 2026-09-30T10:10:00Z (Heartbeat #54)
> Mantenedor: Principal (default)

## Titular del ciclo

**La Idea 56 del PO esta implementada y NO mergeada, a proposito.** `getAccountRaids` convertia una
respuesta con una forma no soportada en `[]`, y `[]` es indistinguible de "no completaste nada": en el
Strike Tracker es "0 de 15 completados". Es capa de datos, y ALERT-48 (que abrio el Reviewer en el HB#48)
dice que eso no va "por merito": va con veredicto. Rama `feat-idea56-forma-raids`, commit `6178a8f`,
consultado al Reviewer como `task-b20623f46caa`.

## En curso

| Que | Donde | Estado |
|---|---|---|
| **Idea 56 — guard de FORMA en `getAccountRaids`** | rama `feat-idea56-forma-raids` (`6178a8f`) | **PROVISIONAL.** Test 20 aserciones, **12 FAIL contra el archivo sin modificar**, suite completa **352/0**. Verificado contra los 5 call sites antes de tocar nada. **NO mergeado: esperando `task-b20623f46caa`.** |
| Revision del guard | Code-Reviewer, `task-b20623f46caa` | En vuelo, timeout 1800s. Pregunta acotada: (1) el `throw` desde dentro del `.then` cae en el `.catch` de red, ¿confunde la clasificacion del error? (2) ¿algun call site degrada a `[]` hoy **a proposito**? (3) el `console.warn` que pidio el PO, ¿se pierde con el catch que ya existia? |
| **Idea 53 — Strike Tracker por logros (14/15)** | sin empezar | Proxima. Es la mas valiosa de la cola: hace que el modulo funcione y hoy muestra 0 de 15. Mismo criterio que la 56: badge que se dibuja, quiere veredicto antes. |
| CM de Convergencia por logros (9394/9435/9422) | sin empezar | 3 lineas, reusa `activities.js:870`. Detras de la 53. |

## Completado en este ciclo

- **Idea 56, primera parte** (`6178a8f`, sin mergear): el guard, el test, y la verificacion de los 5 call
  sites. `api-gw2.js` v2.24.0 + buster en `index.html:940`.
- **Correccion del PO sobre el 206, ACEPTADA y escrita.** El PO mostro que no hay perdida hoy: las 3 rutas
  con `fetch` crudo piden listas limpias, y los ids que "faltan" en un rango dan 404 probados de a uno.
  El ALERT-57 baja de "bug abierto" a "trampa real corregida", y lo que queda es **deuda** (esas 3 rutas
  no tienen `fetchBatchWithRepair`). Ver BACKLOG.
- **Rescate del contenido del PO sin mergear su rama.** `po/hb56-forma-raids` **borra 382 lineas** si se
  mergea: 2 alertas de ALERTS_LOG, 4 lineas de BACKLOG y el directorio `tests/` entero (`_run-all.js` y 8
  tests). Es porque branched antes de que el HB#51-53 llegara a `main`, no porque quiera borrar nada. Se
  rescue **solo** su bloque de `DASHBOARD_PO_IDEAS.md` con `git apply`. **La rama no se mergea.**

## Pendiente que requiere a Pablo (sin cambios respecto del HB#49)

- **Body crudo de `/v2/account/raids` con una API key** (permiso `progression`). Bloquea ALERT-41 y el CM
  real de strikes. Sin eso, la Idea 53 es el unico camino que no depende de un dato que no tengo. **Con el
  guard de la 56, el modo de fallo paso a ser visible**: si la API responde con otra forma, la consola lo
  dice en vez de fingir "0 de 15".
- **Decision de producto sobre `vloxx` / Nexus of Eternity:** el ala no esta en `/v2/raids`. ¿Se saca el
  ala 9 del grid, o queda como espera?
- **Decision de producto sobre los 5 encounters no cableados:** 30 -> 35 cambia el KPI que Pablo ve.
- **Promocion a produccion:** la mantiene `PROMOTIONS.md`. **El equipo no propone promover.**

## Alertas

| # | Severidad | Estado |
|---|---|---|
| **ALERT-60** (nueva) | Baja, Data | 🔶 **PROVISIONAL.** Un `catch` que devuelve un valor por defecto borra la diferencia entre "no lo pude leer" y "no hay nada". Commit `6178a8f`, **sin mergear**. |
| ALERT-59 | Alta, Repo | ABIERTA. El clon tiene dos escritores. Se le pidio al PO por el canal de archivos no commitear en este clon mientras el Principal este en `main`. **Este ciclo ocurrio de nuevo**: rescate su rama con `git apply` en vez de merge. |
| ALERT-58 / ALERT-57 | Alta, Data | ✅ RESUELTAS (HB#52 / HB#53). |
| ALERT-56 | Media, Test | ABIERTA como regla. **Volvio a pegar en este ciclo**: un FAIL del test de la 56 era del mock (el texto `[]` parsea a un array valido y tiene que pasar el guard), no del codigo. |
| ALERT-54 | Media, Producto | ABIERTA. `vloxx` tiene `li: 1` y `/v2/raids` no lo expone: el 100% de Legendaria Imbuida es inalcanzable por diseno. Decision de Pablo. |
| ALERT-52 | Media, Platform | ABIERTA. Trampa para la Idea 53: los ids de encuentro no se resuelven uno a uno contra `/v2/raids`. |
| ALERT-53 | Baja, Datos | ABIERTA, no bloqueante. Huecos menores de `raid-tracker`. No tocados para no ampliar el diff. |
| ALERT-41 | Alta, Datos | ABIERTA. Bloqueada por el token de Pablo. |
| ALERT-48 | Proceso | Vigente. Un cambio de capa de datos sin veredicto es PROVISIONAL, y su `task_id` se sigue hasta el final del ciclo, no hasta el siguiente. |

## Propuestas y veredictos

| Propuesta | De | Veredicto |
|---|---|---|
| **Idea 56** (guard de forma) | PO | En revision (`task-b20623f46caa`). Implementada pero **no mergeada**. |
| **Idea 53** (Strike Tracker por logros, 14/15) | PO | Aceptada en principio, **sube de prioridad**: es la que hace que el modulo funcione. Propia, encolada. |
| **CM de Convergencia** (9394/9435/9422) | PO | Aceptada, despues de la 53 y con veredicto del Reviewer (es codigo de baldia que se dibuja). |
| **CM real de strikes** | PO | **BLOQUEADO** por el token. Con el guard de la 56 ya no es riesgoso esperar. |
| Autocorreccion del alcance del 206 | PO | **ACEPTADA.** El fix es correcto pero mas defensivo de lo necesario; no hay perdida hoy. |
| Idea 49 Tramo C | PO | ✅ Mergeada y validada (HB#48, `f09eb7c`). |
| Idea 52 | PO | ✅ Mergeada (HB#49, `ab39823`). |
| Idea 48 Tramos A y B | PO | ✅ Cerrada (HB#43). |
| Idea 55 Tramo 3a | PO | ✅ Mergeada (HB#52, `605b822`). |
| Idea 47 | PO | ✅ Cerrada (HB#41, `110b049`). |

## Verificacion de este ciclo

```
node --check js/api-gw2.js                    -> limpio
node tests/idea56.forma-raids.test.js          -> 8 pass / 12 FAIL  (archivo SIN modificar)
node tests/idea56.forma-raids.test.js          -> 20 pass / 0 FAIL  (con el fix)
node tests/_run-all.js                         -> 352 aserciones, 0 archivos fallados
git diff --stat index.html                     -> 1 linea (Set-Content habia metido BOM y
                                                   habia inflado el diff a 133 lineas; corregido
                                                   con Python binario)
```

**Rama `feat-idea56-forma-raids` SIN pushear a proposito:** no se pushea un cambio de capa de datos sin
el veredicto. Se pushea al `main` en cuanto el Reviewer responda, mergeado en el mismo ciclo.
