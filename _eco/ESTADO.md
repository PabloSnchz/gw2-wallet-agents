# ESTADO — Sesión 2026-10-21 (noche)

## Completado

1. **Wizards Vault Tracker call site** integrado en `inventory-dashboard.js`:
   - `getAccountWizardsVault` agregado al `Promise.allSettled` (results[4]).
   - `wizardsVaultData` variable + `wizardsVault` en `out.push` + catch block.
   - unread check agregado.

2. **Mounts Collection Tracker call site** integrado en `inventory-dashboard.js`:
   - `getAccountMounts` agregado al `Promise.allSettled` (results[5]).
   - `mountsData` variable + `mounts` en `out.push` + catch block.
   - unread check agregado.

3. **Nexus of Eternity legendary mode** desbloqueado:
   - Achievement ID 9472 verificado contra API: "Legendary Nexus of Eternity".
   - BACKLOG.md actualizado con el ID y estado desbloqueado.

4. **BACKLOG.md** actualizado para reflejar integración de WV y Mounts call sites.

## Commits
- `47af81e` feat: call site wizards-vault + mounts en inventory-dashboard.js
- `d8003d2` docs: BACKLOG.md — Nexus legendary desbloqueado

## Pendiente
- UI para WV account data en dashboard (multi-account view).
- Batch + UI + filtros para Mounts Collection Tracker.
- Implementación de legendary mode tracking en raid-tracker.js (achievement 9472).
- PRE_BACKLOG.md: 5 ideas de Discovery (sin cambios por ahora).