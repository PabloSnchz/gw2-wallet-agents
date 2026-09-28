# BACKLOG.md — Tareas técnicas pendientes

> Prioridad: ordenadas de mayor a menor prioridad técnica.

## Pendientes (prioridad alta)

- [ ] **Armería Legendaria (js/legendary-tracker.js)** — NUEVO módulo Phase 1: esqueleto (IIFE, ruta, sidebar, toggle, stubs). Phase 2: data file legendario-data.js. Phase 3: catálogo grid + mi progreso collapsible + progreso componentes + badges + toast.
- [ ] **inventory-dashboard.js (glow + overflow)** — Revisar glow de KPI cards y overflow del dashboard. Ver diagnosticado en sesión previa.
- [ ] **Bug clearTimeout en inventory-dashboard.js** — clearTimeout no se cancela correctamente durante abort pipeline.
- [ ] **storage.js Fase 2** — Migración de claves restantes a Storage API. Fase 1 completada en commit 39aeaa3.

## Pendientes (prioridad media)

- [ ] **Verificar codificación (encoding corruption)** — Detectado `ENCODING CORRUPT` en algunos archivos. Investigar cuáles y reparar.

## Completed (referencia histórica)

- [x] Cache-busting: refs `?v=` alineadas (commit 794bafa, 33fdcd9, 58a5190)
- [x] Regla de verificación obligatoria en 5 AGENTS.md (v6.6.2)
- [x] Crons Heartbeat configurados (13dc22e6 + c3f30dc2)
- [x] TEAM_STATUS.md creado con timestamp correcto
- [x] storage.js Fase 1: migración localStorage → Storage API (commit 39aeaa3)
- [x] S1: contraseña fija en gist-sync.js — Fix aplicado (commit 65f5f90, rama `fix/security-gist-sync-encryption`)
- [x] Validar grid visualmente — Grid fix verificado visualmente (commit d1e7c14, @media cerrado)
