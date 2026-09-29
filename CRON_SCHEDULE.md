# CRON_SCHEDULE.md — Programación de crons y tareas del equipo

> Actualizado: 2026-09-29T08:31:00Z
> Próxima actualización esperada: 2026-09-29T09:00:00Z
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
| PO | Homestead decoration collection tracker | 2026-09-28 | ~15-20h | ⏳ PRÓXIMA #1 (API confirmada, Reviewer down, proceeding by merit) |
| PO | VoE content integration verification | 2026-09-28 | ~2h | ⏳ PRÓXIMA #2 (post-promotion) |
| PO | WvW Borderlands beta tracker | 2026-09-28 | ~6-8h | ⏳ Post-Homestead (Nov 10 deadline) |

---

## Tareas bloqueadas

| Tarea | Bloqueada por | Quién desbloquea | Notas |
|-------|---------------|------------------|-------|
| Legendary Armory Phase 3 (componentes de recetas) | La API GW2 no expone recipes con ingredients | PO | 110020 (Wages of Stars) ya en legendary-data.js. Componentes hardcodeados no son viables. |
| Ampliación MCP del Arquitecto (rw access repo producción) | Decisión de Pablo — read-only vs read/write | Pablo | Sin ETA |
| Code Reviewer (session_id mismatch) | Bug de plataforma QwenPaw | Plataforma | Validation manual por Principal. 10th timeout reportado. |
| Documentador (timeout) | Bug de plataforma QwenPaw | Plataforma | 6th consecutive timeout. Logs mantenidos por Principal per no-fallback rule. |

---

## Últimos resultados de crons

| Cron | Último disparo | Resultado | Commit |
|------|---------------|-----------|--------|
| Heartbeat Principal | 2026-09-29T08:31:00Z | ✅ Success | Heartbeat #21 — workspace files synced to agents repo, pending commit + push |
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
