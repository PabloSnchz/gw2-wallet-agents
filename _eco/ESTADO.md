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

4. **getMountsCatalog** agregado a api-gw2.js (limpio):
   - Fetch /v2/mounts/skins en batches de 200.
   - Exportado en API pública.
   - Solo una instancia (fix de duplicación).

5. **BACKLOG.md** actualizado para reflejar integración de WV, Mounts y Nexus legendary.

## Commits (sesión noche)
- `47af81e` feat: call site wizards-vault + mounts en inventory-dashboard.js
- `d8003d2` docs: BACKLOG.md — Nexus legendary desbloqueado
- `267264c` feat: legendary mode tracking en raid-tracker.js + BACKLOG update
- `f5d55e1` docs: ESTADO.md actualizado con progreso de noche
- `5c1fadf` feat: getMountsCatalog en api-gw2.js (batch /v2/mounts/skins) + BACKLOG update
- `5093e54` fix: restaurar JSDoc de getCharacterCount en api-gw2.js
- `898670c` docs: ESTADO.md actualizado con progreso completo de noche
- `eb8792d` feat: getMountsCatalog en api-gw2.js (batch /v2/mounts/skins) - limpio

## Pendiente (próxima sesión)
- UI para WV account data en dashboard (multi-account view) — call site done, UI pendiente.
- UI + filtros por tipo para Mounts Collection Tracker — catalog batch done, UI + filtros pendientes.
- PRE_BACKLOG.md: 5 ideas de Discovery (sin cambios por ahora).

## Nota sobre getMountsCatalog
- getMountsCatalog es una función de la capa de datos (api-gw2.js), disponible como GW2Api.getMountsCatalog().
- NO tiene UI que la consuma todavía. Es infraestructura lista para el Mounts Collection Tracker.
- La UI del tracker de monturas está pendiente.