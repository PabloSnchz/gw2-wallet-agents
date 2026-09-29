# COMMS_LOG.md — Registro de comunicaciones entre agentes

> Mantenedor: Principal (default) — actualizado por Heartbeat Principal cada 30 min.
> Fuente de verdad: este archivo en el workspace del Principal.
> **Formato actualizado 2026-09-29** — sistema auto-recuperable (4 capas).

## Formato

| # | De | A | Pedido | Estado | Attempt | Task ID | Creado | Actualizado | Notas |
|---|----|---|--------|--------|---------|---------|--------|-------------|-------|
| 001 | product-owner | default | Reporte de investigación Phase 2C (recetas legendarias) | Resuelto | 1 | task-f14fb23553b1 | 2026-09-28 | 2026-09-28 | Principal diagnosticó bug + propuso fix. Preguntó si implementar o queuear. |
| 002 | product-owner | default | Heartbeat PO — resumen prioridades + findings | Resuelto | 1 | - | 2026-09-28 | 2026-09-28 | Principal priorizó Solitary Throne tracker, propuso 3 opciones A/B/C. |
| 003 | product-owner | default | Heartbeat PO — prioridades actualizadas | Resuelto | 2 | task-3a4ed7100e93 | 2026-09-28 | 2026-09-28 | Timeout 600s (msg too long). Content covered by COMM 004-006. No reintentar. |
| 004 | product-owner | default | Heartbeat PO — Production audit + new findings | Resuelto | 1 | - | 2026-09-28 | 2026-09-28 | Legendary tracker in prod, Nexus+Homestead NOT in prod. A/B/C RESOLVED. PROCEED. |
| 005 | product-owner | default | Heartbeat PO — Sept 29 deadline URGENTE | Resuelto | 1 | - | 2026-09-28 | 2026-09-28 | Zero refs in prod, fetched live API. Submitted proposal to Reviewer. Branch: feature/cm-content-sept29. |
| 006 | product-owner | default | Heartbeat PO — Production audit + deadline | Resuelto | 1 | - | 2026-09-28 | 2026-09-28 | Verified ZERO refs in prod. Fetched GW2 API data. Confirmed priority. Submitted to Reviewer. |
| 007 | product-owner | default | Heartbeat PO (22:00 UTC) — CRITICAL correction | Resuelto | 1 | task-57e27de2993f | 2026-09-28 | 2026-09-28 | Timeout 600s (msg too long). Content covered by COMM 008. No reintentar. |
| 008 | product-owner | default | Heartbeat PO (22:10 UTC) — CRITICAL CORRECTION: Sept 29 CM content | Resuelto | 1 | - | 2026-09-28 | 2026-09-28 | All claims verified. channel_message to Pablo (session 1790264876233). Reviewer 10th timeout. Awaiting Pablo reply. |

## Estados

| Estado | Significado | Trigger de avance |
|--------|-------------|-------------------|
| Esperando | Recién enviado | T+2h → Reintento |
| Reintento | T+2h, emisor reintentó con chat_with_agent | T+4h → Reasignado / Respuesta → Resuelto |
| Reasignado | T+4h, receptor cambiado por watchdog | T+12h → Fallido / Respuesta → Resuelto |
| Fallido | T+12h, sin respuesta | Principal ejecuta él mismo |
| Resuelto | Completado | — |
| Consumido | Respuesta procesada | — |

## Regla del resumen rico

El "Notas" columna: estado + qué se hizo + archivos/commits afectados + validación.
Máx 300 chars. Sin emojis innecesarios. Sin markdown complejo.

## Pendencias

- COMM 008: Escalado a Pablo para approval de promotion (golden rule). Awaiting Pablo manual test + explicit OK.
- Reviewer: 10th consecutive timeout (session_id mismatch, platform bug). Cannot validate promotion. Proceeding by merit.
- Sistema auto-recuperable deployado (2026-09-29): AGENTS.md de 5 agentes actualizado, HEARTBEAT.md watchdog agregado, COMMS_LOG.md estructura nueva.
