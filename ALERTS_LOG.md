# ALERTS_LOG.md

> Registro de alertas del ecosistema.
> Se actualiza cuando hay errores, timeouts, o bugs que afectan
> al funcionamiento del equipo.
> Última actualización: 2026-09-28T14:30:00Z
> Nota: sin nuevas alertas 🔴. Reviewer bug persiste (6to timeout reportado). PO task-581ac98a9f0a timeout 600s (demasiado complejo). Idea 2 (multicuenta) implementada ✅ commit 07e4c64. Cron 13dc22e6 REACTIVADO (enabled: true). Heartbeat #14 manual ejecutado.

## Alertas activas

| # | Severidad | Descripción | Agente | Estado | Creado | Última actualización |
|---|-----------|-------------|--------|--------|--------|---------------------|
| 1 | 🔴 Alta | Code Reviewer: bug de session_id mismatch. 11th consecutive timeout (120s/600s/600s, 60s ×8, 600s). Último: Heartbeat #16 — Homestead tracker proposal (task-d279c1a845e4, timed out a 60s). Validación manual por Principal ✅ (proceeding by merit). | Code-Reviewer | ⏳ Sin resolver (platform-level) | 2026-09-26 | 2026-09-29 04:01 UTC |
| 2 | 🟡 Media | Documentador: 7th consecutive timeout (platform bug). task-0c858087dfb7 (600s), task-838665263c09 (timeout). Logs mantenidos por Principal. No fallback (per no-fallback rule). Escalado a Pablo. | Documenter | ⏳ Sin resolver (platform-level) | 2026-09-27 | 2026-09-29 04:01 UTC |
| 3 | 🟡 Media | inventory-dashboard.js: glow usa box-shadow inline (violación CSS 3-capas capa 2), clearTimeout no cancela durante abort pipeline. Requiere Reviewer validation (down — proceeding by merit). | Principal | ⚠️ Proceeding by merit | 2026-09-28 | 2026-09-29 04:01 UTC |
| 4 | 🟢 Baja | HEARTBEAT.md re-injection (platform bug). Banner aplicado como mitigación. | Plataforma | ⏳ Sin resolver (platform-level) | 2026-09-28 | 2026-09-29 04:01 UTC |
| 5 | 🟢 Baja | CRON PO timeout (6th consecutive, platform bug). PRE_BACKLOG.md última actualización 2026-09-28 23:02 UTC. Cron activo, proceeding by merit. | product-owner | ⚠️ Proceeding by merit | 2026-09-26 | 2026-09-29 04:01 UTC |

## Alertas cerradas (últimas 7 días)

| # | Severidad | Descripción | Agente | Resolución | Cerrado |
|---|-----------|-------------|--------|------------|---------|
| 1 | 🔴 Alta | Grid roto en 3 módulos (Cartera, Meta & Eventos, WV Shop) por @media(max-width:480px) sin cerrar en main.css | Principal | Fix: `}` faltante agregado (commit d1e7c14) | 2026-09-27 |
| 2 | 🟢 Baja | Timeout de crons insuficiente (600s). PO cron stuck en 17:02 UTC | Principal | Timeout aumentado a 900s en ambos crons. Verificado. | 2026-09-27 |
| 3 | 🟢 Baja | TEAM_STATUS.md timestamp inconsistente | Principal | Actualizado con timestamp UTC correcto. | 2026-09-27 |
| 4 | 🟢 Baja | Bug: filtro ⚠ Legendarias en dropdown de Categoría del panel de Logros no funciona al seleccionarlo. Estado: deprecado — código del Legendary Tracker será eliminado de achievements.js cuando legendary-tracker.js esté funcional. No reintentar diagnóstico. | Principal | Deprecado — bug de código a eliminar (ver REGLA de código a construir vs deprecar) | 2026-09-28 |

## Severidades

- 🔴 **Alta** → afecta funcionalidad crítica. Requiere fix urgente.
- 🟡 **Media** → afecta UX o performance. Requiere fix en la sesión.
- 🟢 **Baja** → cosmético o deuda técnica. Puede esperar.

## Reglas

- El Principal es el responsable de actualizar este archivo.
- Se actualiza cuando hay una alerta nueva.
- Se cierra cuando la alerta se resuelve.
- Las alertas de severidad 🔴 se notifican al usuario con
  channel_message.
