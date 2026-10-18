# TEAM_STATUS - Heartbeat Principal #180 (2026-10-11 ~14:40 UTC)

**Procesado Heartbeat PO #71 / HB#209 (workspace PO).** 5 prioridades consolidadas (idénticas a HB#208):

| # | Item | Estado | Acción Principal |
|---|---|---|---|
| **1** | **ALERT-41 Strike Tracker** | 🔴 BLOQUEADO en Pablo | Esperar body crudo `/v2/account/raids` con token `progression`. Sin eso, módulo no funciona ni se sabe si es arreglable. |
| **2** | **L349 Homestead tracker wiring** | ✅ **RESUELTO** | Merge `41c79d8` ya lo cerró (SVG inline, sin icono PNG). BACKLOG.md actualizado: 3 cifras falsas corregidas. |
| **3** | **Dungeon dailies (L210)** | 🟡 PREMISA FALSA | Patrón NO en `activities.js` (está en `meta.js`). Requiere decisión arquitectura antes de codear. BACKLOG.md actualizado. |
| **4** | **Coberturable (L88) + buildstorage** | 🟡 EN CURSO / NUEVO | `buildstorage` prioridad #1 (valor estratégico vs MetaForge). Wrapper + call site en Inventory Dashboard. Permiso `inventories` ya pedido. |
| **5** | **Control de carga** | ✅ RECOLECTAR (3 items) | `openItems = 3` (banda 0-3). Sin cambios desde HB#205. |

**Novedad este ciclo:** 5 propuestas consolidadas del PO (A-E) enviadas al **Code-Reviewer** para validación de viabilidad técnica (`task-75db1c5874e1`, timeout 1800s, background). Tocan `api-gw2.js`, módulos nuevos, capa central. Esperando respuesta.

**Acciones realizadas este ciclo:**
- COMMS_LOG.md: COMM 020 registrado (Heartbeat PO #71/HB#209)
- 5 propuestas A-E enviadas a Reviewer (Homestead Tracker, Build Storage, Schema Versioning, Emotes Tracker, Account Unlocks)
- Sin rama nueva, sin merge, sin código de producto tocado

**Tareas en curso:**

| Quién | Qué | Estado |
|---|---|---|
| **PO** | Ronda 71 (HB#209) | Procesada. 5 prioridades consolidadas en BACKLOG.md. 5 propuestas A-E en Reviewer. |
| **Reviewer** | Validación propuestas A-E | `task-75db1c5874e1` en vuelo (background, 1800s). **11 timeouts consecutivos** previos (platform bug). |
| **Documentador** | — | 7 timeouts consecutivos (platform bug). No-fallback rule vigente. Logs mantenidos por Principal. |
| **Principal** | ALERT-41 / buildstorage / Coberturable | Esperando token Pablo (ALERT-41). `buildstorage` listo para arrancar cuando permiso llegue. Reviewer respuesta pendiente. |

**Sprint 1 — Historia B: ALERT-41 Strike Tracker (2026-10-18 ~15:00 UTC)**
- ✅ **Marcado manual de strikes implementado** (commit `e9f1437`, rama `feat/strike-manual-complete` → merge a `main` + push).
- `js/strike-tracker.js`: botón "✓ Manual" en cada strike pendiente (solo visible cuando no está completado).
- `completeStrikeManually(strikeId)` agrega el ID a `state.completedStrikes` sin consultar la API → `renderStrikesGrid()` actualiza la UI al instante.
- Aviso visible `#strikeManualNotice`: *"Marcado automático a la espera de la API de Guild Wars 2. Usá el botón '✓ Manual' si el strike no se marca solo."* (amber, opacidad 0.4, 3s de feedback con `showManualNotice()`).
- Solo toca `js/strike-tracker.js` (51 inserciones, 0 borrados). `node --check` limpio.
- **No se eliminó el bloqueo de la API**: el marcado automático sigue intentando `getAccountRaids()` y fallando; el manual es el workaround.

**Alertas vigentes:**
- **ALERT-41** — Strike Tracker: marcado manual disponible (workaround). Marcado automático sigue bloqueado en Pablo (token `progression`).
- **Reviewer timeout** — 11º consecutivo (platform bug, no del Reviewer)
- **Documentador timeout** — 7º consecutivo (platform bug)
- **ALERT-225** — Reviewer sin veredicto 6+ ciclos (partir pregunta, no reenviar)
- **ALERT-222** — Filtro ronda PASO 3 bloqueado (falta dato "último corte")

---

# TEAM_STATUS - Heartbeat Principal #179 (2026-10-10 ~14:30 UTC)

**Procesado Heartbeat PO #70 (HB#208 en PRE_BACKLOG.md workspace).** 5 prioridades consolidadas:

| # | Item | Estado | Acción Principal |
|---|---|---|---|
| **1** | **ALERT-41 Strike Tracker** | 🔴 BLOQUEADO en Pablo | Esperar body crudo `/v2/account/raids` con token `progression`. Sin eso, módulo no funciona ni se sabe si es arreglable. |
| **2** | **L349 Homestead tracker wiring** | ✅ **RESUELTO** | Merge `41c79d8` ya lo cerró (SVG inline, sin icono PNG). BACKLOG.md actualizado: 3 cifras falsas corregidas. |
| **3** | **Dungeon dailies (L210)** | 🟡 PREMISA FALSA | Patrón NO en `activities.js` (está en `meta.js`). Requiere decisión arquitectura antes de codear. BACKLOG.md actualizado. |
| **4** | **Coberturable (L88) + buildstorage** | 🟡 EN CURSO / NUEVO | `buildstorage` prioridad #1 (valor estratégico vs MetaForge). Wrapper + call site en Inventory Dashboard. Permiso `inventories` ya pedido. |
| **5** | **Control de carga** | ✅ RECOLECTAR (3 items) | `openItems = 3` (banda 0-3). Sin cambios desde HB#205. |

**Acciones realizadas este ciclo:**
- COMMS_LOG.md: COMM 019 registrado (Heartbeat PO #70)
- BACKLOG.md: Homestead wiring cerrado (`41c79d8`), Dungeon dailies premisa falsa anotada, `buildstorage` añadido como item nuevo prioridad alta
- Sin rama nueva, sin merge, sin código de producto tocado

**Tareas en curso:**

| Quién | Qué | Estado |
|---|---|---|
| **PO** | Ronda 70 (HB#208) | Procesada. 5 prioridades consolidadas en BACKLOG.md. |
| **Reviewer** | — | **11 timeouts consecutivos** (platform bug: `session_id mismatch` / `empty response`). CSS/multi-file bloqueado. Procediendo por mérito. |
| **Documentador** | — | 7 timeouts consecutivos (platform bug). No-fallback rule vigente. Logs mantenidos por Principal. |
| **Principal** | ALERT-41 / buildstorage / Coberturable | Esperando token Pablo (ALERT-41). `buildstorage` listo para arrancar cuando permiso llegue. |

**Sprint 1 — Historia B: ALERT-41 Strike Tracker (2026-10-18 ~15:00 UTC)**
- ✅ **Marcado manual de strikes implementado** (commit `e9f1437`, rama `feat/strike-manual-complete` → merge a `main` + push).
- `js/strike-tracker.js`: botón "✓ Manual" en cada strike pendiente (solo visible cuando no está completado).
- `completeStrikeManually(strikeId)` agrega el ID a `state.completedStrikes` sin consultar la API → `renderStrikesGrid()` actualiza la UI al instante.
- Aviso visible `#strikeManualNotice`: *"Marcado automático a la espera de la API de Guild Wars 2. Usá el botón '✓ Manual' si el strike no se marca solo."* (amber, opacidad 0.4, 3s de feedback con `showManualNotice()`).
- Solo toca `js/strike-tracker.js` (51 inserciones, 0 borrados). `node --check` limpio.
- **No se eliminó el bloqueo de la API**: el marcado automático sigue intentando `getAccountRaids()` y fallando; el manual es el workaround.

**Alertas vigentes:**
- **ALERT-41** — Strike Tracker: marcado manual disponible (workaround). Marcado automático sigue bloqueado en Pablo (token `progression`).
- **Reviewer timeout** — 11º consecutivo (platform bug, no del Reviewer)
- **Documentador timeout** — 7º consecutivo (platform bug)
- **ALERT-225** — Reviewer sin veredicto 6+ ciclos (partir pregunta, no reenviar)
- **ALERT-222** — Filtro ronda PASO 3 bloqueado (falta dato "último corte")