# ALERTS_LOG.md — Registro de alertas

> Mantenedor: Principal (default) — actualizado por Heartbeat cada 30 min.
> Fuente de verdad: este archivo + TEAM_STATUS.md en el workspace del Principal.

## Formato

| ID | Severidad | Tipo | Descripción | Archivo(s) / Comentario | Estado | Detectado | Última actualización |
|----|-----------|------|-------------|-------------------------|--------|-----------|---------------------|

## Alertas activas

| # | Severidad | Tipo | Descripción | Estado | Resolución |
|---|-----------|------|-------------|--------|-----------|
| ALERT-01 | 🔴 Alta | Platform | Code Reviewer: bug session_id mismatch. **12th consecutive timeout** (reintento HB#28 task-ec845e5c532b, 90s → FAILED). Cannot validate CSS/arquitectura/multi-file changes. | ⚠️ Escalado a Pablo (platform-level) | Awaiting platform fix. Proceeding by merit: diffs audited against existing patterns. CSS changes bloqueados. |
| ALERT-10 | 🔴 Alta | Codebase | **Homestead tracker huerfano en `agents/main`**: `js/homestead-tracker.js` commiteado (680f051, HB#17) pero sus 5 metodos `GW2Api` NO existen en `api-gw2.js` de main, y no hay script tag en index.html, ni route en router.js, ni panel. El modulo es inerte en main. En `feature/homestead-tracker` el wiring esta completo pero falta el icono `assets/icons/Cuentas/homestead-icon.png` (no existe). | ⏳ Pendiente decision | Requiere merge de la rama completa (con icono) o revert del archivo en main. No bloquea produccion: el archivo NO esta en `origin/main`. |
| ALERT-11 | 🟡 Media | Codebase | **Schema incorrecto de la API de glyphs (CORREGIDO en 18ef9a4)**: `/v2/homestead/glyphs` devuelve un array de **strings** (36 entradas tipo `"alchemy_harvesting"`), NO objetos `{id,name,icon}`. El modulo leia `glyph.id`/`glyph.icon`/`glyph.name` sobre strings -> los 36 glyphs se renderizaban rotos. `glyph.upgrade_item` (reportado por el PO) nunca existio. | ✅ Resuelto (Heartbeat #28) | `normalizeGlyphs()` + `normalizeGlyphIds()` agregados; dead code `CONFIG.GLYPH_UPGRADES` eliminado. Verificado contra API real (36/36) + `node --check`. Sin cambios CSS. En rama `fix/homestead-glyph-data`, NO mergeado (depende de ALERT-10). |
| ALERT-12 | 🟢 Baja | Codebase | 17 archivos .js con BOM UTF-8 en `js/` (detectado HB#28). | 📋 Escaneado — no modificado | Cambio masivo; requiere validacion del Reviewer (DOWN). No se toco para evitar riesgo. |
| ALERT-02 | 🟡 Media | Platform | Documentador: timeout. 7th consecutive timeout (unchanged, platform bug). No fallback per no-fallback rule (2026-09-28). | ⏳ Sin resolver (platform-level) | Awaiting platform fix. Principal maintains logs manually per rule. |
| ALERT-03 | 🟢 Baja | Platform | HEARTBEAT.md re-injection: platform reads HEARTBEAT.md e inyecta como prompt cada turn. Banner aplicado como mitigación. | ⏳ Sin resolver (platform-level) | Banner en HEARTBEAT.md previene ejecución automática. Cron share_session: false verificado. Heartbeats manuales ejecutados (#14-#26) por request de usuario. |
| ALERT-09 | 🟡 Media | Platform | PO heartbeat platform bug: heartbeats 08:00/10:00 UTC no produjeron contenido nuevo. **9th timeout**. PRE_BACKLOG.md sin novedades desde 10:00 UTC (mismas 3 ideas). | ⏳ Sin resolver (platform-level) | Awaiting platform fix. Principal proceeding by merit. Última PROPOSAL consolidada COMM 009 (Respondido). |
| ALERT-04 | 🟡 Media | Repo | BACKLOG.md en repo was STALE (Sept 24 version). | ✅ Resuelto (Heartbeat #18) | Workspace BACKLOG.md synced to repo. Current. |
| ALERT-05 | 🟡 Media | Repo | TEAM_STATUS.md en repo was STALE (Sept 26 bootstrap). | ✅ Resuelto (Heartbeat #18) | Workspace TEAM_STATUS.md synced to repo. Current. |
| ALERT-06 | 🟢 Baja | Codebase | inventory-dashboard.js: 4 inline styles con box-shadow/border-radius/transition (lines 462, 473, 709, 830) violate CSS 3-layer architecture. | ⏳ Diagnosticado — awaiting Reviewer | Awaiting Reviewer validation (DOWN, 12th timeout). Pending migration to theme-polish.css + inventory-dashboard-theme.js. CSS changes bloqueados. |
| ALERT-07 | 🔴 Alta | Codebase | inventory-dashboard.js: clearTimeout bug en loadActiveCharacterInventory (lines 267-290). Timer leaks. | ⏳ Diagnosticado — awaiting fix | Awaiting Reviewer validation (DOWN, 12th timeout). Pattern reference: activities.js loadCMStatus (abort + last win). |
| ALERT-08 | 🟢 Baja | Repo | Unpushed commit f16ee12 en feature/legendary-component-tracker. | ✅ Resuelto (Heartbeat #18) | Commit en agents/main via merge (35a0f5e). |

## Alertas resueltas (histórico)

| # | Severidad | Tipo | Descripción | Fecha |
|---|-----------|------|-------------|-------|
| ALERT-04 | 🟡 Media | Repo | BACKLOG.md en repo STALE — synced to workspace version + push a agents en Heartbeat #18. | 2026-09-29 |
| ALERT-05 | 🟡 Media | Repo | TEAM_STATUS.md en repo STALE — synced to workspace version + push a agents en Heartbeat #18. | 2026-09-29 |
| ALERT-08 | 🟢 Baja | Repo | Unpushed commit f16ee12 en feature/legendary-component-tracker — commit ya está en agents/main via merge (35a0f5e). Resuelto. | 2026-09-29 |
