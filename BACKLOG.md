# BACKLOG.md — Tareas técnicas pendientes

> Actualizado: 2026-09-29 04:01 UTC (Heartbeat #16)
> Prioridad: ordenadas de mayor a menor prioridad técnica.
> Estado de ramas verificado via `git log --oneline agents/main -5`.

## Pendientes (prioridad alta)

- [ ] **Homestead tracker (js/homestead-tracker.js)** — WIP v0.1 en branch `feature/homestead-tracker` (commit e855e67, 657 líneas, 4 archivos: api-gw2.js v2.16.0 + homestead-tracker.js + router.js + index.html). API confirmed: getHomesteadDecorationDetails/Categories/Glyphs, getAccountHomesteadDecorations/Glyphs. Faltan: CSS theme layer (theme-homestead.js), data file (homestead-decorations-data.js), catalog grid render, progress tracking. **PO priority #1.**
- [ ] **inventory-dashboard.js (glow + overflow)** — Revisar glow de KPI cards y overflow del dashboard. Diagnóstico: glow usa box-shadow inline (capa 2) + overflow no contenido. Violación CSS 3-capas potencial. Requiere Reviewer validation (down — proceeding by merit).
- [ ] **Bug clearTimeout en inventory-dashboard.js** — clearTimeout no se cancela correctamente durante abort pipeline. loadAllInventories lacks abort mechanism en loadActiveCharacterInventory path.
- [ ] **VoE content integration / Fractal tracker** — Gap: Solitary Throne fractal no está en activities.js. Nexus achievement (cat 487) ya tracked vía achievements.js. **PO priority #2 (post-Homestead).**
- [ ] **New Items Awareness Feed** — gw2treasures items every 1-5h. No feed exists. **PO priority #3.**
- [ ] **Mobile PWA** — Manifest.json + service worker faltan. CSS breakpoints ✅ en prod. **PO priority #4.**

## Pendientes (prioridad media)

- [ ] **Verificar codificación (encoding corruption)** — Detectado `ENCODING CORRUPT` en algunos archivos. Investigar cuáles y reparar. `fix/grid` (d1e7c14) resolvió la @media que causaba header duplication.

## Completed

- [x] **Armería Legendaria (js/legendary-tracker.js)** — Phase 1 (skeleton, commit 35a0f5e) + Phase 2 (data file) + Phase 3 (catalog grid + mi progreso + CSS 3-capas + detail-modal + dropdown fix). Branch `feature/legendary-component-tracker`, 3/4 commits merged a agents/main. Reviewer-approved (task-fa0e4c29b938).
- [x] **storage.js Fase 2** — Migración de claves restantes a Storage API. Completada. settings-manager.js migrada, STORAGE_KEYS actualizado. PO confirmado.
- [x] **Sept 29 CM content** — Solitary Throne CM daily tracker implementado (commit 116ac60), promovido a producción (origin/main @ 392c3b9). activities.js v3.19.7.
- [x] **S1: gist-sync security** — Fix PBKDF2 + AES-GCM aplicado (commit 65f55f90, rama `fix/security-gist-sync-encryption`). Merged a agents/main.
- [x] **Grid corruption fix** — Cierra @media(max-width:480px) roto en main.css (commit d1e7c14).
- [x] **Solitary Throne CM tracker** — Implementado en activities.js (v3.19.7). Commit 116ac60 + pushed a agents.
- [x] **topPendingItems refactor** — Commits d035e8c + 729112. Merged a agents/main.
- [x] Cache-busting: refs `?v=` alineadas (commit 794bafa, 33fdcd9, 58a5190)
- [x] Regla de verificación obligatoria en 5 AGENTS.md (v6.6.2)
- [x] Crons Heartbeat configurados (13dc22e6 + c3f30dc2, 900s timeout, share_session: false)
- [x] TEAM_STATUS.md creado con timestamp correcto
- [x] storage.js Fase 1: migración localStorage → Storage API (commit 39aeaa3)
- [x] Validar grid visualmente — Grid fix verificado (commit d1e7c14, @media cerrado)
- [x] Sistema auto-recuperable de comunicaciones (4 capas) — AGENTS.md actualizado, COMMS_LOG.md reestructurado.
- [x] Incident 2026-09-29 (refspec/regla push/merge) — Reglas nuevas en AGENTS.md + branch verification post-push.
