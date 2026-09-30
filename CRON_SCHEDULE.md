# CRON_SCHEDULE.md — Programación de crons y tareas del equipo

> Actualizado: 2026-09-30T00:50:00Z
> Próxima actualización esperada: 2026-09-30T01:20:00Z
> Mantenedor: Principal (default)

---

## Crons activos

| ID | Nombre | Agente | Schedule | Cada | Timeout | Estado |
|----|--------|--------|----------|------|---------|--------|
| `13dc22e6` | Heartbeat Principal | default | `*/30 * * * *` | 30 min | 900s | ✅ Activo (share_session: false) |
| — | Heartbeat PO | product-owner | agent.json (`heartbeat.every: "2h"`) | 2h | 300s | ✅ Activo |

> **Nota:** El PO no usa un cron job de QwenPaw. Su heartbeat se configura en `agent.json` con `heartbeat: { enabled: true, every: "2h", target: "main", timeout_seconds: 300 }`. El schedule equivalente sería `0 */2 * * *`.

### Descripciones

**Heartbeat Principal**
Revisa el estado del ecosistema, valida tareas de otros agentes, consulta al PO si hay novedades en PRE_BACKLOG, envía propuestas al Reviewer si hay 3+, avanza con BACKLOG si no hay urgencias, actualiza TEAM_STATUS.md, CRON_SCHEDULE.md, COMMS_LOG.md y ALERTS_LOG.md, comitea y pushea a agents.

**Heartbeat PO**
Investiga novedades del juego en Reddit, GW2 Wiki, gw2treasures y gw2.com forums. Actualiza PRE_BACKLOG.md con hallazgos. Publica un resumen filtrado en DASHBOARD_PO_IDEAS.md. Reporta al Principal vía submit_to_agent.

---

## Tareas en curso

| Agente | Tarea | Iniciada | ETA | Estado |
|--------|-------|----------|-----|--------|
| default | **Idea 47 — errores que se muestran como ceros** | 2026-09-30 | ~4-6h | ⏳ **En consulta al Reviewer** (`task-ec29dfb1ec3f`). 8 wrappers verificados + 7 call sites. |
| PO | Idea 44 — Dungeon dailies | 2026-09-29 | ~3-4h | 🟡 Siguiente en la secuencia del PO, detrás de la 47 |
| PO | Idea 46 t2 — UI del pool | 2026-09-30 | ~2h | 🟡 Antes que la 44 |

---

## Tareas bloqueadas

| Tarea | Bloqueada por | Quién desbloquea | Notas |
|-------|---------------|------------------|-------|
| **Idea 42 (coleccionables account-scoped)** | **ALERT-27: el 429 es de tasa, no de concurrencia** | Principal | El pool global amortigua picos pero no excedentes sostenidos. Falta un token bucket. **La Idea 42 no debe entrar sin resolver esto** — 324 requests con 27 cuentas. |
| Legendary Armory Phase 3 (componentes de recetas) | La API GW2 no expone recipes con ingredients | PO | 110020 (Wages of Stars) ya en legendary-data.js. Componentes hardcodeados no son viables. |
| `legendary-tracker.js` interactivo (ALERT-35) | Requiere portar el commit 2 de una rama 144 commits atras, y toca CSS | Reviewer | 3 `style=` inline + cards sin handler. `detail-modal.js` no existe en el repo. |
| Ampliación MCP del Arquitecto (rw access repo producción) | Decisión de Pablo — read-only vs read/write | Pablo | Sin ETA |
| Code Reviewer (intermitente) | Bug de plataforma QwenPaw | Plataforma | **Respondió en el HB#37** (`task-f80666adeb79`, fin de 14 timeouts). Sigue intermitente: reintentar cada heartbeat. |
| Documentador (timeout) | Bug de plataforma QwenPaw | Plataforma | 7th consecutive timeout. Logs mantenidos por Principal per no-fallback rule. |

---

## Últimos resultados de crons

| Cron | Último disparo | Resultado | Commit |
|------|---------------|-----------|--------|
| Heartbeat Principal | 2026-09-29T10:00:33Z | ✅ Success | Heartbeat #24 — Agent task check (all 404), PO consulted (COMM 009 responded, no new proposals), BACKLOG reviewed (Sept 29 CM promotion RESOLVED, next items blocked by Reviewer timeout), management files synced + commit + push a agents. |
| Heartbeat Principal | 2026-09-29T09:06:12Z | ✅ Success | Heartbeat #22 — Sept 29 CM content RESOLVED (in production origin/main @ 392c3b9, achievement 9423 verified after git fetch). PoG 0 new proposals. BACKLOG pospuesto (Reviewer DOWN).
| Heartbeat Principal | 2026-09-29T14:36:00Z | ✅ Success | Heartbeat #27 (manual) — (1) Agent tasks: task-dd859ed5ab5e → FAILED (timeout #11, 11th consecutive). All others 404. No pending. (2) PO: PRE_BACKLOG heartbeat 10:00 UTC (3 ideas consolidadas: Fractal Instability Planner, Convergence Achievement Tracker, Homestead Glyph Upgrade Fix). PO 08:00/10:00/12:00 timeout (platform bug). (3) PO 3+ proposals: already sent #25 → FAILED. Reviewer DOWN, proceeding by merit (non-CSS data prep). (4) BACKLOG: Sept 29 CM RESOLVED. Next items blocked by Reviewer (CSS). (5) Management files sync + commit + push to agents. JS BOM changes reverted (out of scope). |
| Heartbeat Principal | 2026-09-29T11:30:44Z | ✅ Success | Heartbeat #26 — (1) Agent tasks: task-dd859ed5ab5e → FAILED (timeout #11). All others 404. (2) PO: PRE_BACKLOG (07:09 UTC, 3 ideas 35-37). PO 08:00/10:00 timeout (platform bug). COMM 009 respondido. No new proposals. (3) PO 3+ proposals: already sent #25 → FAILED. Reviewer DOWN, proceeding by merit (non-CSS data prep). (4) BACKLOG: Sept 29 CM RESOLVED. Next items blocked by Reviewer (CSS). (5) Sync mgmt files #25+#26 + commit + push to agents. |
| Heartbeat Principal | 2026-09-29T11:00:44Z | ✅ Success | Heartbeat #25 — (1) Agent tasks: all 404. (2) PO: FINAL heartbeat (05:08 UTC), 3 proposals consolidated. (3) Reviewer submission: FAILED timeout #11 (task-dd859ed5ab5e). (4) BACKLOG: Sept 29 CM RESOLVED. Next items blocked by Reviewer (CSS). (5) Sync mgmt files to repo + commit + push to agents. Management files updated for sync + commit + push. |
| Heartbeat Principal | 2026-09-29T08:00:00Z | ✅ Success | Heartbeat #20 (workspace files updated, not synced to git repo) |
| Heartbeat Principal | 2026-09-29T07:37:00Z | ✅ Success | `facca15` chore(heartbeat-19): sync management logs |
| Heartbeat Principal | 2026-09-29T02:30:00Z | ✅ Success | `ac5507f` (agents/main) |
| Heartbeat PO (agent.json) | 2026-09-29T06:00:00Z | ✅ Success (production verification) | — |
| Heartbeat Principal | 2026-09-29T00:41:00Z | ✅ Success | `3f3bd87` (agents/main) |
| Heartbeat PO (agent.json) | 2026-09-28T22:10:00Z | ⏳ Timeout (platform bug) | — |

---

## Reglas de actualización

El Principal actualiza este archivo en cada heartbeat (cada 30 min):

1. Actualizar el timestamp del header.
2. Actualizar "Crons activos" si cambió algo.
3. Agregar/remover filas en "Tareas en curso".
4. Agregar/remover filas en "Tareas bloqueadas".
5. Actualizar "Últimos resultados de crons".
6. Commit + push a agents.
