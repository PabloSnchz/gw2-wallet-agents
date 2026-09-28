# DECISIONS_LOG.md

> Registro de decisiones importantes del equipo de agentes.
> Se actualiza cuando el equipo toma una decisión que afecta al
> proyecto a largo plazo.
> Última actualización: 2026-09-28T10:00:00Z

## Decisiones recientes

### [2026-09-27] Rol del Arquitecto corregido

**Contexto:** El Arquitecto perdía tiempo auditando código técnicamente.

**Decisión:** Su rol cambió. Ahora piensa, analiza, y traduce
diagnósticos en tareas. NO audita código.

**Quién decidió:** Pablo (con input del Arquitecto original).

**Impacto:** El Arquitecto será más eficiente. El Code Reviewer
auditará (cuando funcione). El Principal asume auditoría manual
mientras el Reviewer está roto.

**Archivos afectados:** AGENTS.md, SOUL.md, KNOWLEDGE.md,
MEMORY.md del Arquitecto.

### [2026-09-27] Estrategia de repositorios

**Contexto:** El equipo trabaja en `agents`. `origin` (producción)
está congelado.

**Decisión:** `agents` es 100% autónomo. `origin` solo se promueve
con OK explícito de Pablo.

**Quién decidió:** Pablo.

**Impacto:** El equipo puede experimentar sin riesgo.

**Archivos afectados:** AGENTS.md de los 5 agentes.

### [2026-09-27] Timeout de crons aumentado a 900s

**Contexto:** Los crons del Heartbeat (Principal y PO) timed out
con 600s. El PO se quedó stuck en 17:02 UTC.

**Decisión:** Timeout aumentado de 600s a 900s en ambos crons.

**Quién decidió:** Pablo (Principal).

**Impacto:** Los crons ahora completan su ejecución sin interrupciones.
Verificado: PO cron exitoso a las 18:07 UTC con 900s.

**Archivos afectados:** jobs.json (cron config del Principal y PO).

### [2026-09-27] Idea 11 (New Content VoE) aprobada

**Contexto:** El PO propuso agregar datos de nuevas actualizaciones
de contenido a los trackers de raids/strikes.

**Decisión:** Aprobada. Implementará datos estáticos con pattern
idéntico a raid/strike tracker. Bajo riesgo.

**Quién decidió:** Principal (validación técnica, Reviewer roto).

**Impacto:** Se implementará en el chat de Desarrollo.

**Archivos afectados:** raid-tracker.js, strike-tracker.js,
constants (posible nuevo archivo).

### [2026-09-27] Idea 7 (Homestead Tracker) revalidada

**Contexto:** El Principal había pospuesto esta idea creyendo que la
API de Homestead no existía.

**Decisión:** El PO confirmó que las APIs
`/v2/account/homestead/decorations`, `/v2/homestead/glyphs`,
`/v2/homestead/decorations/categories` EXISTEN.
La idea pasa de POSPUESTA a DEPOIS (prioridad 🥄).

**Quién decidió:** Pablo (Principal), basado en datos del PO.

**Impacto:** La idea vuelve a la pila de implementación pendiente.

**Archivos afectados:** PRE_BACKLOG.md.

### [2026-09-28] Regla de oro: promocion a origin requiere test manual confirmado

**Contexto:** El Arquitecto corrigio el enfoque sobre promocion a
`origin`. La regla anterior ("solo se promueve con aprobacion del
usuario") era insuficiente. Generaba casos donde un agente
proponia promover algo a `origin` asumiendo que estaba funcionando
porque era `main` de `agents`.

**Decision:** NUEVA regla de oro (registro permanente):
- NUNCA proponer promover `agents` -> `origin` sin que Pablo haya
  hecho un test manual confirmado que funciona.
- NUNCA asumir que algo esta funcionando porque esta en
  `agents/main`.
- Siempre preguntar primero: "¿Queres promover esto a origin?"
  con la pregunta explicita de Pablo.
- La promocion a `origin` requiere: (1) test manual confirmado por
  Pablo que funciona en browser real, (2) OK explicito de Pablo.
- Si un agente propone promover algo -> Pablo lo corrige en el spot.

**Quien decreto:** Pablo (Arquitecto -> todo el equipo).

**Impacto:** Todos los agentes (Principal, Reviewer, Documentador, PO,
Arquitecto) tienen actualizado su AGENTS.md con esta regla. Ningun
agente propone promocion a `origin` sin test manual confirmado + OK
explicito de Pablo.

**Archivos afectados:** AGENTS.md de los 5 agentes (workspaces de
QwenPaw). Esta entrada en DECISIONS_LOG.md (repo `agents`).

## Reglas

- El Principal es el responsable de actualizar este archivo.
- Se actualiza cuando se toma una decisión que afecta al
  proyecto a largo plazo.
- No se actualiza por decisiones operativas (esas van en
  COMMS_LOG.md).
