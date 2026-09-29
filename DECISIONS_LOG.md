# DECISIONS_LOG.md

> Registro de decisiones importantes del equipo de agentes.
> Se actualiza cuando el equipo toma una decisión que afecta al
> proyecto a largo plazo.
> Última actualización: 2026-09-29T14:36:00Z

## Decisiones recientes

### [2026-09-29] C2 — Destino del bloque CM de Solitary Throne en `activities.js`

**Contexto:** El Reviewer (COMM 015, `task-d3355a858009` — su primera respuesta en 13 intentos) aprobo la Idea 39 (Fractal Tracker multicuenta) *con cambios*, y la condicion bloqueante **C2** es que se decida esto ANTES de escribir una linea del modulo nuevo.

El bloque actual de `activities.js` ya renderiza el CM de Solitary Throne:
- `SOLITARY_THRONE_CM_ACHIEVEMENTS` (activities.js:823) — tabla `{9423:'T1', 9412:'T2', 9373:'T3', 9388:'T4'}` con iconos y escalas.
- `state.daily.fractals.cmAchievements` (activities.js:52, 844-867) — estado de completados.
- `renderFractals()` (activities.js:877-910) — pinta los badges.
- Export (activities.js:1242).

Si el Fractal Tracker **re-declara** esa tabla, aparece el hallazgo transversal #4 (codigo duplicado) desde el commit 1, y las dos vistas se desincronizan.

**Decision: opcion (a) — modulo compartido de datos, `activities.js` lo importa.**

Se crea `js/fractal-data.js` con la unica fuente de verdad (`CM_ACHIEVEMENTS` + tabla de instabilities + tabla de availability T1-T4+CM, todo con `nameEn` y provenance). `activities.js` pasa a leer de ahi en vez de declarar su propia tabla. El Fractal Tracker tambien lee de ahi.

**Por que (a) y no (b):**
1. `activities.js` esta **en produccion** y funcionando (CM lanzo hoy, Sept 29). Quitarle el render del CM es un cambio con riesgo de regresion visible para el usuario en el momento de mayor trafico del ciclo.
2. La opcion (b) dejaria a `activities.js` sin saber de fractales — un modulo en produccion que hoy pinta el CM quedaria ciego hasta que el tracker nuevo este completo.
3. La opcion (a) es un refactor mecanico y de bajo riesgo: la tabla no cambia de valores, solo de ubicacion.

**Consecuencias y condiciones:**
- **C1** — No inventar badge de relics. No existe endpoint de "fractal LI" en la API (a diferencia de `/v2/account/raids` con `li_value`). Si no hay dato, no hay KPI.
- **C3** — La tabla de 17 instabilities y de availability es **dato estatico de GW2 Wiki, no de la API**. Vive como constante dentro del IIFE, con `nameEn` y provenance. **No va a `localStorage`** sin consultar (checklist: prefijo `gn:`).
- Multicuenta: el last-win debe ser **por-token** (mapa de seq por cuenta), no un `_refreshSeq` global. `raid-tracker.js:895-896` y `strike-tracker.js:395-396` usan un seq global porque son de una sola cuenta; copiar eso en un tracker multicuenta hace que el render de la cuenta B se pise con el de la A. Es el riesgo #1 del modulo.
- CSS: el modulo **nace** con `fractal-tracker-theme.js` (solo `borderLeft`) y sin `style=` inline en el HTML del panel. No se replica el precedente de `raid-tracker.js:975` / `index.html:421,437`, que es una violacion preexistente de la arquitectura de 3 capas.
- Scope: "instability usada esta semana" es **imposible con los datos disponibles** (las instabilities no tienen representacion en `/v2/...`). El tracker solo puede marcar **achievement completion** de los tiers CM, via `getAccountAchievements` (igual que `activities.js:851`).

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

### [2026-09-29] Revertidos cambios de BOM en JS (out of scope heartbeat)

**Contexto:** 16 archivos .js en el repo tenían el UTF-8 BOM removido
(Byte Order Mark) — cambios detectados como diff inesperado durante
el sync del Heartbeat #27. El script `remove-bom.ps1` (untracked) fue
el responsable. Estos cambios no son parte de la agenda de este heartbeat
ni fueron validados por el Code Reviewer (que está DOWN, platform bug,
11th consecutive timeout).

**Decisión:** Revertir los 16 archivos .js con `git checkout -- js/*.js`.
Preservar `remove-bom.ps1` como artefacto para uso futuro. La remoción de
BOM es una tarea válida (documentada en BACKLOG.md: "Verificar encoding de
archivos — UTF-8 sin BOM"), pero requiere Reviewer validation (toca 16 archivos)
y debe ser un commit separado, no parte del sync de management files.

**Quién decidió:** Principal (default) — proceeding by merit (Reviewer DOWN).

**Impacto:** Los archivos .js permanecen con BOM intacto. El repo solo
commitea management files en este heartbeat. BOM removal queda pendiente
de Reviewer validation.

**Archivos afectados:** 16 archivos js/ revertidos. remove-bom.ps1 preservado (untracked).

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
