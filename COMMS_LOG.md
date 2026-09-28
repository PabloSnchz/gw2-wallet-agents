# COMMS_LOG.md

> Registro de comunicaciones entre agentes.
> Se actualiza cada vez que un agente envía o recibe un mensaje.
> Última actualización: 2026-09-28T14:30:00Z

## Comunicaciones activas

(none)

### Formato de la tabla

| # | De | A | Pedido | Estado | Task ID | Creado | Actualizado |

Regla del Task ID:
- Si la comunicación se originó con submit_to_agent → usar el task_id nativo
  que devuelve la tool (ej: task-0241c613a2e4).
- Si se originó con chat_with_agent → usar comms-NNN (ID secuencial manual).
  NOTA: QwenPaw NO expone un ID de sesión nativo para chat_with_agent;
  el ID es manual secuencial. Si en el futuro QwenPaw empieza a exponer un
  session_id en la respuesta de chat_with_agent, anotarlo como fallback
  adicional al comms-NNN en la columna Task ID.
- El ID se asigna al crear la comunicación y nunca se modifica.

## Comunicaciones cerradas (últimas 24h)

| # | De | A | Pedido | Resultado | Creado | Cerrado |
|---|-----|---|--------|-----------|--------|---------|
| 1 | Principal | Documentador | "Documentá el fix storage.js (S1)" | Completado — Documentado + commit 58a5190, push a agents | 2026-09-26 20:00 | 2026-09-26 20:30 |
| 2 | PO | Principal | "Priorización de propuestas y PRE_BACKLOG" | Consumido — PO investigó 4 ideas nuevas | 2026-09-26 19:00 | 2026-09-26 19:15 |
| 3 | Principal | PO | "Investigá 4 ideas nuevas para PRE_BACKLOG" | Completada (task-e27e5d658589) — PRE_BACKLOG.md actualizado | 2026-09-26 21:00 | 2026-09-27 18:07 |
| 4 | Principal | PO | "Heartbeat #9 query: novedades en PRE_BACKLOG?" | Consumido — 11 ideas consolidadas. Prio: Vista multicuenta NOW, VoE NEXT. | 2026-09-27 22:00 | 2026-09-27 22:02 |
| 5 | Principal | PO | "Heartbeat #10 query: novedades desde último reporte" | Consumido — 11 ideas sin cambios. Idea 2 bloqueada (gn:tokenchange). | 2026-09-27 22:30 | 2026-09-27 22:35 |
| 6 | Principal | Reviewer | "Validá las 3 propuestas del PO" | Cerrado — validation manual (Reviewer timeout #4). Ideas 11 y 7 validadas. | 2026-09-26 22:00 | 2026-09-27 23:50 |
| 7 | PO | Principal | "Heartbeat #11: prioridades PRE_BACKLOG (5-line summary)" | Consumido — prioridad: Homestead PRÓXIMA, VoE PRÓXIMA, New items feed DEPOES. | 2026-09-27 23:10 | 2026-09-27 23:35 |
| 8 | Principal | Reviewer | "Validar rediseño dashboard comms (5 archivos)" | Cerrado — validation manual (Reviewer timeout #5, bug session_id). CSS 3 capas verificadas. | 2026-09-27 23:45 | 2026-09-28 00:20 |
| 9 | PO | Principal | "Consultar Reviewer sobre Homestead?" | Cerrado — consumido via PRE_BACKLOG.md. Homestead pospuesto (DEPOES). Idea 2 prioridad #1. | 2026-09-26 21:28 | 2026-09-28 00:20 |
| 10 | Principal | Reviewer | "Validar commit 07e4c64: Idea 2 wallet-dashboard multicuenta" (task-0241c613a2e4, 90s) | Cerrado — Timeout (7mo Reviewer bug, session_id mismatch). Validation manual por Principal: CSS 3 capas OK, no !important, no gn:tokenchange. | 2026-09-28 00:35 | 2026-09-28 00:37 |

## Estados posibles

- Esperando respuesta — el destinatario no respondió todavía.
- Timeout — el destinatario no respondió en el tiempo esperado.
- Respondido — el destinatario respondió, pero el origen no consumió.
- Consumido — el origen recibió y procesó la respuesta.
- Fallido — el pedido no se pudo enviar.
- En progreso — el destinatario está trabajando en el pedido.

## Reglas de actualización

Cada agente es responsable de actualizar las comunicaciones donde participa
(como emisor o destinatario).

Al enviar (submit_to_agent o chat_with_agent):
- Agregar a "activas" con estado "Esperando" + Task ID.

Al recibir respuesta:
- Cambiar estado a "Respondido" (si sos el emisor) o "Consumido" (si procesaste la respuesta).

Al procesar completamente:
- Mover a "cerradas (últimas 24h)" con resultado.

Si una comunicación queda pendiente >1h sin movimiento:
- Cualquiera de las partes puede marcarla con estado "Timeout" y aplicar reintento.

Si después de 3 reintentos no hay respuesta:
- Marcar como "Fallido" y escalar al Principal.

El Principal, en su Heartbeat cada 30 min:
- Revisar comunicaciones con más de 2h sin actualización → Notificar al usuario.
- Revisar comunicaciones con estado "Respondido" pero no "Consumido" → Notificar al destinatario original.
- Revisar comunicaciones "Fallidas" → Notificar al usuario.

## Alertas automáticas

El Heartbeat del Principal debe verificar:

- Comunicaciones activas con mas de 2h sin actualización → Notificar al usuario.
- Comunicaciones con estado "Respondido" pero no "Consumido" → Notificar al destinatario.
- Comunicaciones fallidas → Notificar al usuario.
