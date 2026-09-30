# ALERTA RESUELTA [2026-09-30] — Timeouts del ecosistema: causa raíz única + una segunda variable

## Resumen
Los "timeouts" del Reviewer, del Principal y del PO **no eran tres problemas**.
Eran **un solo bug de plataforma** reproducido tres veces, más un segundo
timeout independiente que se me pasó en la primera ronda.

## Causa raíz #1 — Dos timeouts de stream, ambos con default 30s

En `qwenpaw/providers/retry_chat_model.py` hay **DOS** timeouts independientes
para el stream del modelo, y **ambos** tenían default `30.0`:

| Variable | Qué mide | Symptom |
|----------|----------|---------|
| `QWENPAW_LLM_STREAM_IDLE_TIMEOUT` | Pausas **entre** tokens | `produced no content for 30s` |
| `QWENPAW_LLM_STREAM_FIRST_CONTENT_TIMEOUT` | Espera del **primer** token | `produced no content for 30s` (variante `FIRST_CONTENT`) |

Cualquier turno que pause >30s se muere. Cuanto más pesada la tarea, más
probable el fallo. **Afectaba a TODOS los agentes por igual.**

### El log reportaba mal la causa
`app/crons/executor.py:250` logueaba `cron execute ... timed out after
900s/1800s` aunque la sesión hubiera muerto a los 46 segundos por el idle
timeout. Por eso el equipo subía timeouts del cron cuando el problema era
otro, y por eso nunca se pudo diagnosticar. **El timeout del cron nunca fue
la causa de estos fallos.**

## Causa raíz #2 — Config por agente (bugs propios, no de plataforma)

1. **ID mal en `AGENTS.md`:** `code-reviewer` (minúscula) no existe.
   El ID real es **`Code-Reviewer`** (mayúscula y guion). Toda invocación
   desde el Principal fallaba por nombre, no por timeout.
2. **`drivers/mcp/mi-repo-boveda.yaml` del Reviewer con YAML roto:**
   el `description` estaba partido en dos líneas, la segunda sin comillas.
   `DriverCardError: mapping values are not allowed here`. El Reviewer
   quedaba **sin herramientas MCP** — no podía leer un archivo del repo.
   Introducido por el Arquitecto en la migración de permisos del 2026-09-30.
3. **Timeout 300s en los heartbeats de PO y Principal:** ambos configurados
   muy por debajo de su duración real de trabajo (9-15 min).

## Lo que se cambió

| Cambio | Antes | Después |
|--------|-------|---------|
| `STREAM_IDLE_TIMEOUT` (global) | 30s | **300s** |
| `STREAM_FIRST_CONTENT_TIMEOUT` (global) | 30s | **300s** |
| Cron `13dc22e6` (Principal) | 900s | **1800s** |
| Heartbeat interno `default` | enabled | **disabled** (cron manual es el único disparador) |
| Heartbeat `product-owner` | 300s | **1200s** |
| `AGENTS.md` ID Reviewer | `code-reviewer` | **`Code-Reviewer`** |
| YAML driver Reviewer | roto | **ok** (validado con `yaml.safe_load`) |

## Lo que se descubrió del mecanismo de respuestas

`submit_to_agent` **no devuelve la respuesta del subagente a quien pregunta.**
`format_background_submission_text` (`agent_management.py:479`) devuelve solo:

```
[TASK_ID: ...]  [SESSION: ...]  [TIMEOUT: ...s]
Task submitted successfully. Wait at least 30 seconds, then check with:
  check_agent_task(task_id='...')
```

La respuesta va al **canal de entrega** (la pantalla de Pablo), no al contexto
de quien preguntó. **No hay push.** El Principal solo la ve si polea el
`task_id` con `check_agent_task` — y ese canal **miente**: se observó devolviendo
`running` durante 35 min sobre una tarea **terminada 33 min antes**.

**Las "14 timeouts consecutivas" del Reviewer eran en buena parte respuestas
que llegaron y nadie recogió.**

## Verificación

- Test real de revisión (342 líneas de diff, `idea49.quotavisible`): el
  Reviewer respondió en **~2 min** con 7 hallazgos verificados ejecutando
  tests. Veredicto propio: APROBADO CON OBSERVACIONES.
- El PO y el Documentador quedaron con heartbeats utilizables.
- 100% de las comunicaciones con el Reviewer vienen del **Principal** (filas
  010-024 de `COMMS_LOG.md`). El PO manda al Principal, no al Reviewer.
  No hace falta extender el buzón a otros agentes.

## Backlog de lo que el Reviewer encontró (para el Principal, Tramo C)

1. `wizards-vault.js:38` — copia literal de `lsSet()` con el mismo bug,
   sin arreglar. El fix de cuota se aplicó a **una de dos copias idénticas**.
2. `wv-season-storage.js:42` — `setLS` **sin try/catch**: un
   `QuotaExceededError` se propaga al caller. Store oficial de WV.
3. Consecuencia: el comentario de `api-gw2.js:995-997` ("mientras siga en 0
   el problema no existe") es una **invariante falsa**.
4. `isQuotaError()` da falso positivo con `TimeoutError` (`code:22`).
   Bajo riesgo, pero documentado.
5. `__cacheClear()` no resetea `__lsQuotaFails` / `__lsQuotaWarned`.

## Pendiente

- Fila 022 de `COMMS_LOG.md` tiene `task_id = "(pendiente)"`. Backfill.
- `Documentador` y `Principal` pushean a `agents/main`: colisión de writers.
  Regla de "un solo writer" escrita en el `HEARTBEAT.md` del Documentador
  (`pull --rebase` antes de push, parar ante conflicto, nunca forzar).
