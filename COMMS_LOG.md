# COMMS_LOG.md

> Registro de comunicaciones entre agentes.
> Se actualiza cada vez que un agente envía o recibe un mensaje.
> Última actualización: 2026-09-27T22:15:00Z

## Comunicaciones activas

| # | De | A | Pedido | Estado | Creado | Última actualización |
|---|-----|---|--------|--------|--------|----------------------|
| 1 | Principal | Reviewer | "Validá las 3 propuestas del PO" | ⏱ Timeout (bug session_id conocido) | 2026-09-26 22:00 | 2026-09-27 22:15 |
| 2 | PO | Principal | "¿Consulto al Reviewer sobre Homestead?" | ⏳ Esperando respuesta (Reviewer bug) | 2026-09-26 21:28 | 2026-09-27 22:15 |

## Comunicaciones cerradas (últimas 24h)

| # | De | A | Pedido | Resultado | Creado | Cerrado |
|---|-----|---|--------|-----------|--------|---------|
| 1 | Principal | Documentador | "Documentá el fix storage.js (S1)" | ✅ Documentado + commit 58a5190, push a agents | 2026-09-26 20:00 | 2026-09-26 20:30 |
| 2 | PO | Principal | "Priorización de propuestas y PRE_BACKLOG" | ✅ Consumido — PO investigó 4 ideas nuevas | 2026-09-26 19:00 | 2026-09-26 19:15 |
| 3 | Principal | PO | "Investigá 4 ideas nuevas para PRE_BACKLOG" | ✅ completada (task-e27e5d658589) — PRE_BACKLOG.md actualizado | 2026-09-26 21:00 | 2026-09-27 18:07 |
| 4 | Principal | PO | "Heartbeat #9 query: ¿novedades en PRE_BACKLOG?" | ✅ Consumido — 11 ideas consolidadas (4 🟢, 4 🟡, 3 pospuestas). Prio: Vista multicuenta NOW, VoE NEXT. | 2026-09-27 22:00 | 2026-09-27 22:02 |
| 5 | Principal | PO | "Heartbeat #10 query: ¿novedades desde último reporte?" | ✅ Consumido — 11 ideas sin cambios. Usuario NO autoriza Ideas 11/2. Idea 2 bloqueada (conflicto gn:tokenchange). | 2026-09-27 22:30 | 2026-09-27 22:35 |

## Estados posibles

- ⏳ **Esperando respuesta** → el destinatario no respondió todavía.
- ⏱ **Timeout** → el destinatario no respondió en el tiempo esperado.
- ✅ **Respondido** → el destinatario respondió, pero el origen no consumió.
- ✅ **Consumido** → el origen recibió y procesó la respuesta.
- ❌ **Fallido** → el pedido no se pudo enviar.
- 🔄 **En progreso** → el destinatario está trabajando en el pedido.

## Reglas de actualización

El Principal es el responsable de actualizar este archivo:

1. Cuando envía una tarea (con submit_to_agent) → agregar a "activas".
2. Cuando el otro agente responde → cambiar estado a "Respondido".
3. Cuando consume la respuesta → mover a "cerradas" con estado "Consumido".
4. Cuando una tarea queda pendiente >1h → marcar con ⏱ y alertar.
5. Cada 30 min (con el Heartbeat) → revisar y actualizar.

## Alertas automáticas

El Heartbeat del Principal debe verificar:

- ¿Hay comunicaciones activas con más de 2h sin actualización?
  → Notificar al usuario con channel_message.
- ¿Hay comunicaciones con estado "Respondido" pero no "Consumido"?
  → Notificar al destinatario original.
- ¿Hay comunicaciones fallidas?
  → Notificar al usuario.
