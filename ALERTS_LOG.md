# ALERTS_LOG.md

> Registro de alertas del ecosistema.
> Se actualiza cuando hay errores, timeouts, o bugs que afectan
> al funcionamiento del equipo.
> Última actualización: 2026-09-28T14:30:00Z
> Nota: sin nuevas alertas 🔴. Reviewer bug persiste (6to timeout reportado). PO task-581ac98a9f0a timeout 600s (demasiado complejo). Idea 2 (multicuenta) implementada ✅ commit 07e4c64. Cron 13dc22e6 REACTIVADO (enabled: true). Heartbeat #14 manual ejecutado.

## Alertas activas

| # | Severidad | Descripción | Agente | Estado | Creado |
|---|-----------|-------------|--------|--------|--------|
| 1 | 🟡 Media | Code Reviewer: bug de session_id mismatch. No puede fetchear de GitHub. timed out 6 veces (120s, 600s, 600s, 60s, 60s, 600s). Último: PO Heartbeat #13 query (idea priorities update). Validación manual por Principal ✅. | Code-Reviewer | ⏳ Sin resolver | 2026-09-26 |

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
