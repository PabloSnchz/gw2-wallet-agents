# AGENTS.md Sync Log

> Registro de la sincronización de AGENTS.md entre agentes del ecosistema.
> Los AGENTS.md de todos los agentes viven en sus workspaces de
> QwenPaw (`C:\Users\psanc\.qwenpaw\workspaces\<agent>\AGENTS.md`),
> por lo que NO están versionados en el repo git (como documenta
> el MEMORY.md del Arquitecto). Este archivo documenta los cambios
> aplicados a todos los agentes y sirve como registro de auditoría.

## Sincronización — v6.6.3 (2026-09-28)

**Commit:** `chore(agents): sync AGENTS.md across team`
**Agentes involucrados:** Principal, Code Reviewer, Product Owner, Documentador, Arquitecto

### Fix 1 · Version mismatch (High)

| Agente | Workspace | Antes | Después |
|--------|-----------|-------|---------|
| Principal | default | v6.6.2 | v6.6.3 ✅ |
| Code Reviewer | code-reviewer | v6.6.2 | v6.6.3 ✅ |
| Product Owner | product-owner | v6.6.3 | v6.6.3 ✅ (ya actualizado) |
| Documentador | documenter | v6.6.2 | v6.6.3 ✅ |
| Arquitecto | architect | v1.1 (ecosistema) | v1.1 + v6.6.3 (proyecto) ✅ |

**Detalle:** Se agregó `> Versión actual del proyecto: v6.6.3` al header del
AGENTS.md del Arquitecto. El tag `v1.1` se mantiene como versión del ecosistema.

### Fix 2 · gw2-agents-dashboard documentado (Medium)

Verificación: todos los agentes ya mencionaban el repo
`https://github.com/PabloSnchz/gw2-agents-dashboard.git` en sus AGENTS.md.
**No se requirió cambio.** ✅

### Fix 3 · Nuevos logs documentados (Medium)

Los siguientes logs del ecosistema no estaban documentados en los AGENTS.md:
- `COMMS_LOG.md` — Registro de comunicaciones entre agentes
- `DECISIONS_LOG.md` — Registro de decisiones importantes
- `ALERTS_LOG.md` — Registro de alertas (errores, bugs, timeouts)

**Cambios aplicados:**

| Agente | Sección actualizada |
|--------|-------------------|
| Principal | `## 📋 Al final de cada sesión` — agregada lista de logs |
| Code Reviewer | `## 📋 Al final de cada sesión` — agregada lista de logs |
| Product Owner | `## 📋 Al final de cada sesión` — agregada lista de logs |
| Documentador | `## 📋 Al final de cada sesión` + tabla `DOCUMENTOS QUE MANTENÉS` — agregada sección de archivos de estado del repo agents |
| Arquitecto | Ya documentado en MEMORY.md y AGENTS.md (`## 🏗️ EL ECOSISTEMA QUE VOS AYUDÁS A MANTENER`) ✅ |

### Fix 4 · Reviewer: bugs conocidos documentados (Low)

**Cambio aplicado al AGENTS.md del Code Reviewer:**

Se agregó sección `### 🐛 Bugs conocidos y workarounds` con:
1. Bug de `submit_to_agent` (session_id mismatch) — bug de infraestructura de QwenPaw, no del agente.
2. Three workarounds documentados: chat_with_agent (foreground), session_id explícito, Principal como intermediario.

### Fix 5 · Arquitecto: workarounds documentados (Low)

**Cambio aplicado al AGENTS.md del Arquitecto:**

Se agregó sección `### 🐛 Bugs conocidos del ecosistema` con los 3
workarounds para el Code Reviewer, incluyendo el flujo alternativo
`Pablo → Principal → diagnosis → Pablo → Arquitecto` cuando el Reviewer
tiene el bug de session_id mismatch activo.

### Verificación

Los diffs de todos los edits fueron verificados visualmente en los
respectivos workspaces. Todos los cambios aplicaron correctamente.

```
workspaces/default/AGENTS.md         → v6.6.2 → v6.6.3 + logs ✅
workspaces/code-reviewer/AGENTS.md   → v6.6.2 → v6.6.3 + logs + bugs ✅
workspaces/product-owner/AGENTS.md   → v6.6.3 (sin cambio versión) + logs ✅
workspaces/documenter/AGENTS.md      → v6.6.2 → v6.6.3 + logs ✅
workspaces/architect/AGENTS.md       → v1.1 + v6.6.3 + workarounds ✅
```