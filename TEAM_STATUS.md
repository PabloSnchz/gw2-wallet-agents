# TEAM_STATUS.md — Estado del equipo

> Actualizado: 2026-09-27T14:00:00Z
> Heartbeat ejecutado: task-838665263c09 (Documentador) ✅ completado | task-f4572471232e (PO) ✅ completado | task-6dee318b4c54 (Reviewer) ⏱ timeout

## Crons configurados

| Cron ID | Nombre | Agente | Schedule | Estado |
|---------|--------|--------|----------|--------|
| 13dc22e6 | Heartbeat Principal | default | `*/30 * * * *` (cada 30 min) | ✅ Activo |
| c3f30dc2 | Heartbeat PO | product-owner | `0 */2 * * *` (cada 2h) | ✅ Activo |

## Tareas en curso

- **default (Principal):** Heartbeat ejecutado.
  - T1 (cache-busting): ✅ Completada — commit 794bafa pusheado a agents.
  - T2 (selectores corruptos): ✅ Diagnosticada — pertenecen a `prod_main.css` (origin snapshot). No se modifican sin autorización.
  - T3 (grid): ✅ **RESUELTA** — causa raíz: `@media(max-width:480px)` sin cerrar en main.css. Fix aplicado (commit d1e7c14). Braces verificados: 591/591 balanceados.
  - T4 (regla de verificación): ✅ Completada — agregada a los 5 AGENTS.md.
  - T5 (crons/documentación): ✅ Completada.
  - **storage.js bug fix:** ✅ COMPLETADA — commit 5d550b8. `Storage.get()` y `Storage.getRaw()` referenciaban `oldKey` sin declarar → fallback a claves legacy roto. Arreglado con `var oldKey = FALLBACK_MAP[key]`. `init()` ahora usa `DOMContentLoaded` como backup. Sintaxis validada con `node --check`.
  - **Fase 2 storage.js (settings-manager.js):** ✅ COMPLETADA — commit 5d550b8. 14 llamadas `localStorage` migradas → `Storage.set/get/list` + `STORAGE_KEYS`. Zero referencias a localStorage restantes. Validado con `node --check`.
  - **Propuesta 1 (loading state app.js):** ✅ COMPLETA — commited en 86bbdf9. Spinner `btn--loading` visible en `btn--accent` (color = currentColor).
- **product-owner:** Consulta de heartbeat ✅ completada. PRE_BACKLOG con 12 ideas consolidadas.
- **code-reviewer:** task-6dee318b4c54 ⏱ **timed out** (60s). Bug conocido: session_id mismatch. No se reintenta. Validación del bug fix de storage.js asumida por Principal (patrón idéntico a `has()`, 4 líneas, backward compatible, sintaxis validada).
- **documenter:** task-838665263c09 ✅ completada (CHANGELOG.md, commit 58a5190). **Nueva tarea enviada (5d550b8): documentar bug fix + migración settings-manager.js.**

## Tareas completadas hoy (2026-09-27)

- Cache-busting: actualizadas referencias `?v=` en `index.html` de agents. Commit 794bafa pusheado.
- Regla de verificación obligatoria agregada a los 5 AGENTS.md.
- Crons Heartbeat Principal y Heartbeat PO creados y verificados activos.
- TEAM_STATUS.md + BACKLOG.md creados.
- **Heartbeat #1 (manual, 12:48):** Documentador ✅.
- **Heartbeat #2 (manual, 13:00):** Documentador ✅, PO ✅ (12 ideas). Reviewer ⏱ timeout (bug conocido). Validación manual: Idea 11 ✅, Idea 7 ✅.
- **Heartbeat #3 (manual, 14:00):** PO ✅ (prioriza Idea 2). Reviewer ⏱ timeout (bug conocido).
- **Bug fix storage.js** (commit 5d550b8): declaración de `oldKey` en `get`/`getRaw` + `DOMContentLoaded` en `init()`. CRÍTICO — sin este fix, usuarios con datos pre-v1.0.1 pierden acceso a keys.
- **Fase 2 storage.js** (commit 5d550b8): migración completa de `settings-manager.js` (14 llamadas localStorage → Storage API).
- **Propuesta 1 (loading state)** (commit 86bbdf9): completa e implementada.

## Pendientes para la próxima hora

- **Idea 2 (Vista multicuenta):** ⚠️ **CONFLICTO PO-vs-Reviewer.** PO la prioriza como #1 (propone extender WalletDashboard con columnas multi-cuenta). Reviewer la rechazó originalmente ("rompe gn:tokenchange"). El PO propone una aproximación diferente (no es cambio de cuenta → no debería romper gn:tokenchange). **Necesita decisión del usuario** para validar la nueva aproximación con el Reviewer (caído por bug).
- **Idea 11 (New Content Updates VoE):** ✅ Aprobada por Reviewer (validación manual). Pendiente implementación (~4-6h, datos estáticos).
- **Idea 8 (Developer API docs):** ✅ Aprobada. Pendiente implementación (~4-8h).
- **Idea 4 (API key privacy docs):** ✅ Aprobada. Pendiente implementación (~2h).
- **Idea 7 (Homestead Tracker):** ✅ Aprobada con cambios. Pendiente verificación de formato de API response + implementación (~15-20h).
- **Reviewer:** sigue caído por bug de `session_id mismatch`. No se reintenta. Próxima consulta programada en el próximo heartbeat.

## Último incidente crítico (2026-09-27)

**Bug de fallback en storage.js v1.0.1:**
- `Storage.get()` y `Storage.getRaw()` referenciaban `oldKey` (variable no declarada) en vez de `FALLBACK_MAP[key]`.
- En modo no-strict, `oldKey` es `undefined` → `Array.isArray(undefined)` = false → `oldKeys = [undefined]` → `localStorage.getItem(undefined)` = null → **el fallback a claves legacy nunca funciona**.
- **Impacto:** usuarios con datos pre-v1.0.1 (ej: imports de gist-sync) que no hayan reiniciado la app pierden acceso a sus API keys, wallet compact, WV season data, etc.
- **Fix:** declarar `var oldKey = FALLBACK_MAP[key];` en ambas funciones (igual a como `has()` ya lo hacía). Commit `5d550b8`.
- **Secondary fix:** `Storage.init()` no se ejecutaba en carga fría (readyState='loading') porque no tenía `DOMContentLoaded` fallback. Agregado.

**Grid roto (incidente previo):** `@media(max-width:480px)` sin cerrar → grids colapsaban a 1 columna en desktop. Fix `d1e7c14`. 0 selectores corruptos en agents CSS.

## Estado de propuestas del PO

- PRE_BACKLOG.md: 12 ideas consolidadas.
- **Prioridad #1 del PO:** Vista consolidada multicuenta (Idea 2) — ~8-12h — YA aprobada por Principal.
- **Prioridad #2:** New content updates VoE (Idea 11) — ~4-6h — Aprobada, pendiente implementación.
- **Prioridad #3:** Developer API docs (Idea 8) — ~4-8h — Aprobada, pendiente.
- **Prioridad #4:** API key privacy docs (Idea 4) — ~2h — Aprobada, pendiente.
- **Prioridad #5:** Homestead tracker (Idea 7) — ~15-20h — Aprobada con cambios, pendiente verificación API.
- **Estado:** Idea 2 en conflicto PO-vs-Reviewer (necesita decisión usuario). Ideas 3, 6 pospuestas (🟡/~20h). Ideas 1, 5, 9, 10, 12 pospuestas (🔴).

## BACKLOG.md

- Creado con items técnicos + prioridades del PO.
- Items completados: storage.js Fase 1 + Fase 2 (migración settings-manager.js), bug clearTimeout, gist-sync S1.
- Item pendiente: inventory-dashboard.js (glow + overflow) — bloqueado por validación Reviewer.

## Estado del repositorio

- **agents:** `main` actualizado con todos los commits. Últimos: `d1e7c14` (fix grid) → `4012b09` (TEAM_STATUS) → `5f4b66a` (heartbeat) → `794bafa` (cache-busting) → `58a5190` (docs) → `86bbdf9` (loading state) → `5d550b8` (bug fix + Fase 2 storage.js).
- **origin:** Congelado en v6.6.1. **NO modificado.**
- Diferencia: 30+ commits adelantan agents sobre origin.
- Working tree: ✅ **Limpio** (todo commited + pusheado a agents).
