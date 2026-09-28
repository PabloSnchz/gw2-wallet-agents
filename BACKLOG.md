# BACKLOG.md — Tareas técnicas pendientes
> Prioridad: ordenadas de mayor a menor prioridad técnica.
> Actualizado: 2026-09-28T23:30:00Z
> Mantenedor: Principal (default)

## 🚨 URGENTE (Sept 29 — CM content deadline) — ✅ COMPLETADO

- [x] **Nexus of Eternity achievement tracker** — ✅ COMPLETADO. Category 487 (9349 Conqueror, 9405 Power Unleashed, 9388 Essence Collector, 9447 Weekly) loads dynamically via `/v2/achievements/categories` API dropdown. No code change needed. CM entra Sept 29. (commit 116ac60, branch feature/cm-content-sept29)
- [x] **Solitary Throne fractal daily tracker** — ✅ COMPLETADO. 4 daily achievements: 9423 (T1), 9412 (T2), 9373 (T3), 9388 (T4). `SOLITARY_THRONE_CM_ACHIEVEMENTS` + `Fractals.loadCMStatus()` with abort/last-win pattern. Render badges in `renderFractals()`, wired into tokenchange + refresh. CM entra Sept 29. (activities.js v3.19.7, commit 116ac60, pushed to agents)
- [x] **Nexus of Eternity raid tracker (Wing 9)** — ✅ COMPLETADO. Wing 9: Nexus of Eternity (Vloxx boss, CM Sept 29). CSS class `.raid-expansion--voe`. wing9.png icon. (commit 8cc5fc6, raid-tracker.js v1.9.0, pushed to agents)
- [x] **Promotion to production** — ⏳ AWAITING Pablo approval. Cherry-pick 116ac60 + 8cc5fc6 onto origin/main. Golden rule: Pablo manual test + explicit OK required. Reviewer DOWN (10th timeout, platform bug), proceeding by merit.

## Pendientes (prioridad alta)

- [ ] **Legendary Armory Phase 3** — ⏳ Skeleton implemented (bac5c67, 7c88fe6, 1aaff5a). Detail modal + CSS 3-capas done. AWAITING API connection (Phase 3 commit 4). Componentes de recetas bloqueados (API GW2 no expone recetas con ingredients). Wages of Stars (110020) ya en legendary-data.js. ~15-20h remaining.
- [ ] **inventory-dashboard.js (glow + overflow)** — 📋 DIAGNOSTICADO. 4 inline styles con box-shadow/border-radius/transition (lines 462, 473, 709, 830) violate CSS 3-layer architecture. Awaiting Reviewer validation (Reviewer DOWN — 10th timeout, platform bug).
- [ ] **Bug clearTimeout en inventory-dashboard.js** — 📋 DIAGNOSTICADO. loadActiveCharacterInventory (lines 267-290): clearTimeout(t1) en finally, pero AbortController c1 nunca se aborting explícitamente en error paths. loadAllInventories/loadCharactersInBackground no implementan abort en el pipeline. Timer leaks en caso de key-change o abort. Pattern reference: activities.js loadCMStatus (abort + last win).
- [ ] **VoE content integration verification** — Confirmar que Nexus raid + Solitary Throne CM trackers funcionan con VoE verification content. Post-Sept 29. ~2h.

## Pendientes (prioridad media)

- [ ] **Verificar encoding de archivos** — UTF-8 sin BOM en todos los archivos .js del repo. Usar powershell para verificar.

## Pendientes (prioridad baja)

- [ ] **Homestead decoration collection tracker** — PO Prioridad #1 (post-promotion). API confirmada (`/v2/account/homestead/decorations`, `/v2/homestead/glyphs`, `/v2/account/home/cats`). 837+ decorations, max_count varía. Pattern: activities.js Home Nodes. ~15-20h.
- [ ] **New Items Awareness Feed** — Items nuevos cada 1-5h en gw2treasures. JSON estático + UI simple. ~3-5h.
- [ ] **Mobile PWA enhancement** — manifest.json + service worker. CSS breakpoints ya implementados. ~8-12h.
- [ ] **WvW Borderlands beta tracker** — Nov 10 deadline. Bóveda tiene WvW objectives pero no borderlands map tracker. ~6-8h.
- [ ] **Inventory cleanup tool** — MetaForge WARDOGS competitive gap. ~15-20h.

## Completed (referencia histórica)

- [x] Legendary Armory Phase 1 skeleton (router + panel + IIFE v1.0.0) — ✅ Implementado (commit 35a0f5e, rama agents/feature/legendary-component-tracker)
- [x] Legendary Armory Phase 2 (legendary-data.js: catálogo base 206 items + precios TP 39 tradeables) — ✅ Completado (commit 755ba01, 174423a)
- [x] Legendary Armory Phase 3 skeleton (render-catologo + detail-modal + CSS theme JS) — ✅ Implementado (commits bac5c67, 7c88fe6, 1aaff5a). Awaiting API connection (Phase 3 commit 4).
- [x] Legendary A/B/C conflict resolution — ✅ Resuelto: Keep Proposición 1 (94fb7a9, inline en achievements.js), posponer Proposición C (bac5c67) hasta post-Sept 29 deadline.
- [x] storage.js Fase 2 — Migración de claves restantes a Storage API. Completada (settings-manager.js migrada, STORAGE_KEYS actualizado). ✅
- [x] Cache-busting: refs `?v=` alineadas (commit 794bafa, 33fdcd9, 58a5190)
- [x] Multi-account (multicuenta) wallet dashboard — ✅ Implementado (commit 07e4c64)
- [x] Strike Tracker — ✅ Implementado (commit 07e4c64)
- [x] storage.js Fase 1 — ✅ Migración de claves legacy (commit 39aeaa3)
- [x] Ventas de WV (WvE/WvW) — ✅ Implementado
- [x] Ventas de WV History — ✅ Implementado
- [x] Ventas de WV History 2 — ✅ Implementado
- [x] Sept 29 CM content: Solitary Throne tracker + Nexus raid tracker — ✅ Implementado (commits 116ac60, 8cc5fc6, branch feature/cm-content-sept29)
- [x] S1: gist-sync.js security fix (contraseña fija) — ✅ Implementado (commit 65f55f90, rama fix/security-gist-sync-encryption)

---

## Mantenimiento de logs

El Principal actualiza estos archivos en cada heartbeat. Si el Documentador
tiene timeout (bug de plataforma), el Principal los mantiene.
