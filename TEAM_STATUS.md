# TEAM_STATUS — Bóveda del Gato Negro

> Actualizado: 2026-09-30T10:10:00Z (Heartbeat #55)
> Mantenedor: Principal (default)

## Titular del ciclo

**La Idea 56 del PO está APROBADA, mergeada y con sus 3 follow-ups cerrados.** El Reviewer respondió
`task-b20623f46caa` con veredicto **APROBADO** (sin bloqueantes), verificado de forma independiente: corrió
los tests él mismo (20/0 post-fix, 8/12 contra `HEAD~1`, suite 352/0) y revisó los 5 call sites uno por
uno. Confirmó que el caso `null` **no es teórico** — es lo que produce un `200` con body vacío, y antes
daba "0 encuentros completados" en los 3 módulos.

Este heartbeat cerró los 3 follow-ups que dejó:

| Follow-up | Qué era | Estado |
|---|---|---|
| **F1** (media) | La pista "verificá que la API key tenga permiso `progression`" se imprimía **incondicionalmente**. Con el guard de FORMA el permiso puede estar perfecto: era el bucle hostil de ALERT-32. | ✅ **`4c95774` / merge `72cc8af`** |
| **F2** (media) | `getCharacterCount` (`api-gw2.js:536`) tenía **el mismo bug, una función arriba**. BACKLOG/ALERT-31 lo listaban como "propagado" por Idea 47 y no lo estaba. | ✅ **`979bfa6` / merge `23b1565`** (v2.24.1) |
| **F3** (baja) | `docs/ONBOARDING.md` no documentaba el contrato de **dos capas** (RED + FORMA). Era lo que el Reviewer pidió para que el próximo no lo "normalice" y lo degrade de vuelta. | ✅ En el mismo commit que F1 |

**Corrección de recuento que sale de F2:** son **siete** los wrappers que degradaban por forma, no seis.
El "cinco propagados" de la Idea 47 no incluía a `getCharacterCount`. El relato de la v2.24.0 queda
corregido en el header del propio archivo.

## En curso

| Qué | Dónde | Estado |
|---|---|---|
| **Idea 53 — Strike Tracker por logros (14/15)** | sin empezar | Próxima. La más valiosa de la cola: hace que el módulo funcione y hoy muestra 0 de 15. Mismo criterio que la 56: quiere veredicto antes de mergear. |
| CM de Convergencia por logros (9394/9435/9422) | sin empezar | 3 líneas, reusa `activities.js:870`. Detrás de la 53. |
| **ALERT-55** — 6 ramas sin mergear en `origin` | `origin/*` | **ABIERTA.** 2 se pueden borrar ya (absorbidas, `git cherry` da `-`). 3 tienen trabajo real y están 110–201 commits atrás: el rescate correcto es `cherry-pick` sobre rama nueva desde `main`, **no `merge`**. No se toca en este ciclo. |

## Completado en este ciclo

- **F2 — `getCharacterCount` deja de degradar a `0`.** Commit `979bfa6`, merge `23b1565`, `api-gw2.js`
  v2.24.1 + buster en `index.html:940`. Su JSDoc (`:528`) ya decía "no degrada a 0": el catch de RED
  cumplía el contrato y el camino de FORMA no. Test `tests/idea60b.forma-charcount.test.js`,
  **21 aserciones, 12 FAIL contra el archivo sin el fix** (verificado con `git stash push` + `pop`).
- **F1 — la pista de permiso deja de ser incondicional.** Commit `4c95774`, merge `72cc8af`, en
  `raid-tracker.js` y `strike-tracker.js`. El mensaje real **no se pierde** (ya viaja en
  `error.message`); lo que se quita es la pista enganosa, y solo en la rama de FORMA. El otro texto de
  permiso ("Seleccioná una API Key…") queda intacto: es un caso distinto y legítimo, no hubo request.
  Test `tests/idea56.f1-hint-permiso.test.js`, **23 aserciones, 5 FAIL sin el fix**.
- **F3 — `ONBOARDING.md` documenta el contrato de dos capas.** Tabla de cómo distinguir RED de FORMA en
  el consumidor, y la advertencia de no reintroducir el `Array.isArray(x) ? x : []` por costumbre.
- **037 cerrada.** `task-b20623f46caa` → `completed`, veredicto APROBADO. Era la regla del PASO 1 del
  ciclo: sin recogerla, el Reviewer figuraba caído mientras estaba trabajando.

## Pendiente que requiere a Pablo

- **Promoción de `agents/main` a producción** (rama `po/hb56-forma-raids` y el resto del trabajo de
  Ideas 47/49/52/56): `gw2-wallet-ligero` está CONGELADA. Solo entra con pedido literal tuyo que nombre
  el feature. Nada se propone desde el equipo.
- **ALERT-41 / ALERT-54**: hacen falta tu token real para el body crudo de `/v2/account/raids`, y una
  decisión de producto sobre el ala 9 (`vloxx` tiene `li: 1` y la API no lo expone: el 100% de Legendaria
  Imbuida es inalcanzable por diseño).
- **ALERT-53**: agregar los 5 eventos no cableados sube el KPI de 30 a 35. Cambia lo que vos ves: es tuyo.

## Alertas

| Alerta | Estado |
|---|---|
| **ALERT-60** | ✅ **CERRADA.** Era el `Array.isArray(data) ? data : []` de `getAccountRaids` que degradaba una forma no soportada a `[]`. Mergeada y aprobada. **Corolario ya incorporado:** con F2 son **siete** los wrappers, y el recuento de "cinco propagados" que estaba en BACKLOG/ALERT-31 era falso. |
| ALERT-59 | ABIERTA. El clon tiene dos escritores. Se le pidió al PO por el canal de archivos que no commitee en este clon mientras el Principal esté en `main`. **Este ciclo pasó de nuevo**: su rama se rescató con `git apply`, no con merge. |
| ALERT-58 / ALERT-57 | ✅ RESUELTAS (HB#52 / HB#53). |
| ALERT-56 | ABIERTA como regla. **Volvió a pegar dos veces este ciclo**: 4 FAIL míos en el test de F1 eran mis propias regex mal construidas, y un FAIL del de la 56 era del mock (el texto `[]` parsea a un array válido y tiene que pasar el guard). **Un FAIL se diagnostica antes de tocarse.** |
| ALERT-55 | ABIERTA. 6 ramas sin mergear; 3 con trabajo real. Rescate por `cherry-pick`, no por `merge`. |
| ALERT-54 / ALERT-52 / ALERT-53 / ALERT-41 | ABIERTAS, no bloqueantes. Decisiones de producto o bloqueadas por tu token. |
| ALERT-48 | Vigente. Un cambio de capa de datos sin veredicto es PROVISIONAL y su `task_id` se sigue **hasta el final del ciclo**, no hasta el siguiente. Esta vez se cumplió: la 037 se recogió y cerró. |

## Propuestas y veredictos

| Propuesta | De | Veredicto |
|---|---|---|
| **Idea 56** (guard de FORMA) | PO | ✅ **APROBADO** (`task-b20623f46caa`). Mergeado con sus 3 follow-ups. **Cerrada.** |
| **Idea 60B** (mismo guard en `getCharacterCount`) | follow-up del Reviewer | ✅ Mergeado, v2.24.1. |
| **Idea 53** (Strike Tracker por logros, 14/15) | PO | Aceptada en principio, **sube de prioridad**: es la que hace que el módulo funcione. Próxima. |
| **CM de Convergencia** (9394/9435/9422) | PO | Aceptada, después de la 53 y con veredicto del Reviewer. |
| **CM real de strikes** | PO | 🔴 **BLOQUEADO** por el token. Con el guard de la 56 ya no es riesgoso esperar. |
| Autocorrección del alcance del 206 | PO | ✅ **ACEPTADA.** El fix es correcto pero más defensivo de lo necesario; no hay pérdida hoy. Lo que queda es deuda en 3 rutas con `fetch` crudo. |
| Idea 49 Tramo C / Idea 52 / Idea 55 Tramo 3a / Idea 48 / Idea 47 | PO | ✅ Mergeadas y validadas (HB#48 / HB#49 / HB#52 / HB#43 / HB#41). |

## Verificación de este ciclo

```
tests/idea60b.forma-charcount.test.js   -> 21 pass / 0 FAIL   (con el fix)
  mismo test, git stash sobre api-gw2   ->  9 pass / 12 FAIL  (SIN el fix)
tests/idea56.f1-hint-permiso.test.js    -> 23 pass / 0 FAIL   (con el fix)
  mismo test, git stash sobre los 2 js  -> 10 pass /  5 FAIL  (SIN el fix)
suite completa (18 archivos)            -> 473 aserciones, 0 FAIL
node --check raid-tracker.js strike-tracker.js -> limpio
git push origin HEAD:main               -> origin/main = 72cc8af
```

Las 4 ramas del fix se borraron después del merge, en el mismo ciclo.
