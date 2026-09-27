# COMMS_LOG.md

> Registro de comunicaciones entre agentes.
> Se actualiza cada vez que un agente envÃ­a o recibe un mensaje.
> Ãšltima actualizaciÃ³n: 2026-09-27T19:00:00Z

## Comunicaciones activas

| # | De | A | Pedido | Estado | Creado | Ãšltima actualizaciÃ³n |
|---|-----|---|--------|--------|--------|----------------------|
| 1 | Principal | Reviewer | "ValidÃ¡ las 3 propuestas del PO" | â± Timeout (bug session_id) | 2026-09-26 22:00 | 2026-09-26 22:10 |
| 2 | PO | Principal | "Â¿Consulto al Reviewer sobre Homestead?" | â³ Esperando respuesta | 2026-09-26 21:28 | 2026-09-26 21:28 |

## Comunicaciones cerradas (Ãºltimas 24h)

| # | De | A | Pedido | Resultado | Creado | Cerrado |
|---|-----|---|--------|-----------|--------|---------|
| 1 | Principal | Documentador | "DocumentÃ¡ el fix storage.js (S1)" | âœ… Documentado + commit 58a5190, push a agents | 2026-09-26 20:00 | 2026-09-26 20:30 |
| 2 | PO | Principal | "PriorizaciÃ³n de propuestas y PRE_BACKLOG" | âœ… Consumido â€” PO investigÃ³ 4 ideas nuevas | 2026-09-26 19:00 | 2026-09-26 19:15 |
| 3 | Principal | PO | "InvestigÃ¡ 4 ideas nuevas para PRE_BACKLOG" | âœ… completada (task-e27e5d658589) â€” PRE_BACKLOG.md actualizado | 2026-09-26 21:00 | 2026-09-27 18:07 |

## Estados posibles

- â³ **Esperando respuesta** â†’ el destinatario no respondiÃ³ todavÃ­a.
- â± **Timeout** â†’ el destinatario no respondiÃ³ en el tiempo esperado.
- âœ… **Respondido** â†’ el destinatario respondiÃ³, pero el origen no consumiÃ³.
- âœ… **Consumido** â†’ el origen recibiÃ³ y procesÃ³ la respuesta.
- âŒ **Fallido** â†’ el pedido no se pudo enviar.
- ðŸ”„ **En progreso** â†’ el destinatario estÃ¡ trabajando en el pedido.

## Reglas de actualizaciÃ³n

El Principal es el responsable de actualizar este archivo:

1. Cuando envÃ­a una tarea (con submit_to_agent) â†’ agregar a "activas".
2. Cuando el otro agente responde â†’ cambiar estado a "Respondido".
3. Cuando consume la respuesta â†’ mover a "cerradas" con estado "Consumido".
4. Cuando una tarea queda pendiente >1h â†’ marcar con â± y alertar.
5. Cada 30 min (con el Heartbeat) â†’ revisar y actualizar.

## Alertas automÃ¡ticas

El Heartbeat del Principal debe verificar:

- Â¿Hay comunicaciones activas con mÃ¡s de 2h sin actualizaciÃ³n?
  â†’ Notificar al usuario con channel_message.
- Â¿Hay comunicaciones con estado "Respondido" pero no "Consumido"?
  â†’ Notificar al destinatario original.
- Â¿Hay comunicaciones fallidas?
  â†’ Notificar al usuario.

