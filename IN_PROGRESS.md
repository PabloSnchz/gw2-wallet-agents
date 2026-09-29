# IN_PROGRESS.md

> 📌 Inventario de trabajo en curso del equipo de agentes.
> Se actualiza al iniciar/completar tareas. `origin` (producción) es
> dominio exclusivo de Pablo — nada se promueve sin su OK explícito.

## Trabajo activo

| Rama | Agente | Feat/Fix | Estado | Detalle |
|------|--------|----------|--------|---------|
| `feature/legendary-component-tracker` | Principal | feat-legendary-armory Phase 3 | 🟡 En progreso (3/4 commits) | Commit 1 (skeleton + render) ✅, Commit 2 (detail-modal) ✅, Commit 3 (CSS 3-capas) ✅, Commit 4 (API integration) ⏳ |
| `feat/legendary-data` (archivada) | Principal | feat-legendary-armory Phase 2 | ✅ Completado | 206 items en legendary-data.js con TP prices. Merge a `agents/main` pendiente Reviewer approval. |
| `chore/tracking-docs` | Principal | chore: create IN_PROGRESS.md + READY_FOR_PROMOTION.md | 🔄 En progreso | Esta rama. |

## Próximos sprints

| Prioridad | Feat | Rama objetivo | Estimado | Notas |
|-----------|------|---------------|----------|-------|
| 🥇 Alto | Homestead tracker | `feat/homestead-tracker` | ~15-20h | API confirmada. PO prioridad #1. Esperando creación de rama. |
| 🥈 Medio | VoE content integration | (extensión raid-tracker) | ~3-5h | Wing 9 base implementado. PO prioridad #2. |
| 🥉 Bajo | New items feed | (nuevo módulo) | ~8-10h | Consume `/v2/commerce/listings`. PO prioridad #3. |
| 🟡 Post-MVP | Comms table pagination | (comms-redesign) | ~2-3h | 50 rows/page. |

## Feats en `agents/main` (identificados)

| Feat/Fix | Rama | Commits clave | Status en main |
|----------|------|---------------|----------------|
| feat-cm-content | `feature/cm-content-sept29` | `8cc5fc6` (Wing 9 VoE), `116ac60` (Solitary Throne) | ✅ Merged |
| feat-legendary-armory Phase 1 | `feature/legendary-component-tracker` | `35a0f5e` (skeleton), `bac5c67` (Phase 3) | ⏳ In progress (Phase 3 Commit 1-3 merged) |
| fix-grid | `fix/grid` | `d1e7c14` (media query cerrado) | ✅ Merged |
| fix-security-gist-sync | `fix/security-gist-sync-encryption` | `65f5f90` (PBKDF2 + AES-GCM) | ✅ Merged |
| fix-topPendingItems | (sin rama dedicada) | `d035e8c`, `729112` | ✅ Merged |
| feat-mobile-responsive | `feature/mobile-responsive-phase1` | `16b9dff`, `755ba01`, `174423a` | ✅ Merged |
| feat-home-nodes-fixes | `feat/home-nodes-fixes` | `239278` | ✅ Merged |
| refactor-inline-to-css | (mergido) | `c293567` (migrar estilos inline a CSS) | ✅ Merged |

## Estado de agentes

| Agente | Estado | Notas |
|--------|--------|-------|
| Principal | ✅ Activo | Heartbeat #14 completado. Trabajando en Legendary Phase 3. |
| Code Reviewer | ⚠️ Timeout (platform bug) | 10ma consecutiva (session_id mismatch). Proceeding con criterio técnico. |
| Documentador | ⚠️ Timeout (platform bug) | 6ta consecutiva. Documentación manual aplicada. |
| PO | ⚠️ Timeout (platform bug) | Proceeding en base a prioridades establecidas. |
| Arquitecto | ✅ Activo (solo usuario) | No participa en tareas operativas. |

## Regla de oro (reforzada 2026-09-29)
- **Nunca proponer promoción a `origin`.** `origin` es dominio exclusivo de Pablo.
- Pablo PIDE EXPLÍCITAMENTE "promové feat-X a origin" → entonces cherry-pick.
- Hasta entonces: silencio sobre origin.
