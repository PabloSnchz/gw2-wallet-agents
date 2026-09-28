# BACKLOG.md — Tareas técnicas pendientes

> Prioridad: ordenadas de mayor a menor prioridad técnica.

## Pendientes (prioridad alta)

- [ ] **Verificar codificación (encoding corruption)** — Carácter corrupto `械` en `<tr>` en versiones anteriores fue corregido (CHANGELOG v1.x). Verificar que no reaparezca en archivos recientes via git diff + encoding check.
- [ ] **Validar grid visualmente** — Requires API key para renderizar cards en https://pablosnchz.github.io/gw2-wallet-agents/. Grid CSS verificado en código (d1e7c14) pero validación visual pendiente (no se puede validar sin key).

## Completed (referencia histórica)

- [x] Cache-busting: refs `?v=` alineadas (commits 794bafa, 33fdcd9, 58a5190)
- [x] Regla de verificación obligatoria en 5 AGENTS.md (v6.6.2)
- [x] Crons Heartbeat configurados (13dc22e6 + c3f30dc2)
- [x] PO cron share_session fix (false) — root cause Heartbeat loop (Heartbeat #10)
- [x] TEAM_STATUS.md creado y actualizado (v22:30 UTC)
- [x] BACKLOG.md created y actualizado con estado real
- [x] storage.js Fase 1: migración localStorage → Storage API (commit 39aeaa3)
- [x] storage.js Fase 2: declarar oldKey + DOMContentLoaded init (commit 5d550b8)
- [x] Bug clearTimeout en inventory-dashboard.js (commit 95b4136 — moved to finally blocks)
- [x] inventory-dashboard.js !important removal (commit 6065d8c — 7 !important → theme-polish.css)
- [x] inventory-dashboard.js glow + id-cell-updated class (commit 95b4136)
- [x] S1: contraseña fija en gist-sync.js → Web Crypto PBKDF2 + AES-GCM (commit 65f5f90)
- [x] Grid roto @media(480px) no cerrado (commit d1e7c14 — braces 591/591)
- [x] Raid tracker VoE: Nexus of Eternity wing 9 + CSS raid-expansion--voe (commit 57008ae)
- [x] Encoding corruption: carácter `械` en `<tr>` — corregido en versiones anteriores (CHANGELOG v1.x)
- [x] Documentador timeout bug conocido (task-0c858087dfb7 FAILED 600s) — documentación manual aplicada
