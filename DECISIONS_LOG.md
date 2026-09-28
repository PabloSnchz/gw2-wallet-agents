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

**Contexto:** La regla anterior ("solo se promueve con aprobacion del
usuario") era insuficiente. Permitía que
un agente propusiera promover algo a `origin` asumiendo que funcionaba
porque era `main` de `agents`. El enfoque se reforzó: el equipo NUNCA
propone promover. `origin` es dominio exclusivo de Pablo.

**Quien decreto:** Pablo (Arquitecto -> todo el equipo).

**Impacto:** Todos los agentes (Principal, Reviewer, Documentador, PO,
Arquitecto) tienen actualizado su AGENTS.md con esta regla. Ningun
agente promueve `origin` sin OK explicito de Pablo (viola la regla). Pablo
decide que promover; el equipo colabora solo cuando Pablo lo pide.

**Archivos afectados:** AGENTS.md de los 5 agentes (workspaces de
QwenPaw). Esta entrada en DECISIONS_LOG.md (repo `agents`).

### [2026-09-28] Aprobada construcción de Armería Legendaria

**Contexto:** El Legendary Tracker vivía mal ubicado en Logros (achievements.js).
El filtro "⚠ Legendarias" en el dropdown de Categoría tenía un bug funcional, pero
se decidió NO arreglarlo porque ese código va a ser eliminado cuando el módulo nuevo
esté listo. Se decidió construir módulo nuevo js/legendary-tracker.js con ruta
#/account/legendary-armory.

**Regla aplicada:** REGLA de código a construir vs deprecar — antes de diagnosticar
o arreglar el bug del filtro, se preguntó si el código seguiría existiendo en 3 meses.
Respuesta: NO (mudanza a legendary-tracker.js). Por lo tanto, NO diagnosticar ni arreglar.

**Alcance:** Catálogo de armas, armaduras, abalorios y espalderes legendarios. Dos
modos (Catálogo / Mi progreso). Precios TP, badges Lista/Comprable, sugerencias por
precursor.

**Quién decidió:** Pablo (con input del Arquitecto).

**Impacto:** Al terminar el módulo nuevo, se elimina TODO el código del Legendary
Tracker de achievements.js (no solo el filtro).

**Estado:** Construcción iniciada en agents. Estado: implementación pendiente.

### [2026-09-28] Reforzamiento de la regla de oro sobre `origin`

**Contexto:** La regla de promoción a origin se reforzó: el equipo
NUNCA propone promover. Pablo decide cuándo y qué promover. El rol del
equipo termina en `agents`; `origin` (gw2-wallet-ligero) es dominio
exclusivo de Pablo.

**Decision:** Regla de oro reforzada (registro permanente):
- El equipo **NUNCA propone** promover a `origin`. Pablo decide.
- `origin` (gw2-wallet-ligero) es dominio exclusivo de Pablo.
- El universo del equipo es `agents` (gw2-wallet-agents).
- Si un agente propone promover → violación de regla; Pablo lo corrige.
- Si Pablo pide promover algo → el equipo colabora (solo con OK explícito).

**Impacto:** Actualizados los 5 AGENTS.md + KNOWLEDGE.md del Arquitecto
(workspaces QwenPaw) con la regla reforzada. Ningún agente propone
promover a `origin`. `origin` intacto.

**Archivos afectados:** 5 AGENTS.md (workspaces QwenPaw) + KNOWLEDGE.md
del Arquitecto + DECISIONS_LOG.md (repo `agents`).

## Reglas

- El Principal es el responsable de actualizar este archivo.
- Se actualiza cuando se toma una decisión que afecta al
  proyecto a largo plazo.
- No se actualiza por decisiones operativas (esas van en
  COMMS_LOG.md).
