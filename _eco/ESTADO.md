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

3. **Nexus of Eternity legendary mode** tracking implementado:
   - Achievement ID 9472 verificado contra API.
   - `state.legendaryAchievements` agregado.
   - Carga de achievements en `Promise.allSettled` (results[2]).
   - BACKLOG.md actualizado.

4. **BACKLOG.md** actualizado para reflejar integración de WV, Mounts y Nexus legendary.

## Commits
- `47af81e` feat: call site wizards-vault + mounts en inventory-dashboard.js
- `d8003d2` docs: BACKLOG.md — Nexus legendary desbloqueado
- `267264c` feat: legendary mode tracking en raid-tracker.js + BACKLOG update

## Pendiente
- UI para WV account data en dashboard (multi-account view) — call site done, UI pendiente.
- Batch + UI + filtros para Mounts Collection Tracker — call site done, batch/UI/filtros pendientes.
- PRE_BACKLOG.md: 5 ideas de Discovery (sin cambios por ahora).