# Developer Guide — Bóveda del Gato Negro (gw2-wallet-ligero)

> v6.6.2 — API pública, eventos, debug y convenciones de arquitectura.

## Quick Start

```js
// Cada módulo expone su API en window.* automáticamente al cargar el bundle.
// Usa los métodos _debug() para inspeccionar estado interno:
InventoryHub._debug();     // { active, view, section, bankItems, materialsCount, ... }
Accounts._debug();         // { active, hasData, fileName, accountsCount, view, compact }
RaidTracker._debug();      // { active, token, wings, completedCount, ... }
StrikeTracker._debug();    // { inited, active, token, completedStrikes, loading, error }
ConverterModal._debug();   // { inited, activeTab }
WVObjectivesDashboard._debug(); // multi-account comparison data
SettingsManager._debug();  // { version, ready }
```

---

## Arquitectura en 3 capas CSS (NO ROMPER)

| Capa | Archivo | Responsabilidad |
|------|---------|-----------------|
| Layout | `main.css` | Estructura, fondos, tipografía. **Sin bordes ni box-shadows.** |
| Piel unificada | `theme-polish.css` | Bordes neutros, glow base, hover, dimensiones de UI. |
| Color semántico | `*-theme.js` | **SOLO `borderLeft: 3px solid <color>`.** |

**Nunca usar `!important`** en temas. Ningún `*-theme.js` puede sobrescribir `border`, `boxShadow`, `borderRadius`, `transition` (excepto `borderLeft`).

---

## Módulos y APIs públicas (`window.*`)

| Módulo | Archivo | API pública |
|--------|---------|-------------|
| `Accounts` | `accounts-panel.js` | `initOnce()`, `activate()`, `deactivate()`, `Route`, `_debug()` |
| `Achievements` | `achievements.js` | `initOnce()`, `render(opts)`, `onTokenChange()` |
| `Activities` | `activities.js` | `initOnce()`, `activate()`, `deactivate()`, `prefetch()`, `Route`, `_debug()`, `_renderPSNA`, `_forceReload()` |
| `ActivitiesAPI` | `activities.js` | `getToken()`, `isActive()`, `onHomeNodesTabSelected(cb)`, `renderHomeNodes(container)` |
| `Analytics` | `analytics.js` | `viewModule(name)`, `exportBackup()`, `importBackup()`, `openAccountWizard()`, `downloadExcelTemplate()`, `enrichWithAPI()`, `encryptAccountsFile()`, `forceReloadSeason()`, `openApiKeysModal()`, `addApiKey()`, `deleteApiKey()` |
| `ConverterModal` | `converter-modal.js` | `initOnce()`, `open()`, `close()`, `_debug()` |
| `GistSync` | `gist-sync.js` | `syncUp()`, `syncDown()`, `clearLocal()`, `_debug()` |
| `InventoryDashboard` | `inventory-dashboard.js` | `initOnce()`, `activate()`, `deactivate()`, `refresh(forceNoCache)` |
| `InventoryHub` | `inventory-hub.js` | `initOnce()`, `activate()`, `deactivate()`, `refresh(force)`, `_debug()` |
| `RaidTracker` | `raid-tracker.js` | `initOnce()`, `activate()`, `deactivate()`, `prefetch()`, `Route`, `_debug()` |
| `SettingsManager` | `settings-manager.js` | `init()`, `exportAll()`, `exportData()`, `importAll()`, `importFromFile()`, `importFromData()`, `_debug()` |
| `StrikeTracker` | `strike-tracker.js` | `initOnce()`, `activate()`, `deactivate()`, `prefetch()`, `Route`, `_debug()` |
| `ThemeSelector` | `theme-selector.js` | `init()`, `apply(theme)`, `_debug()` |
| `WalletDashboard` | `wallet-dashboard.js` | `initOnce()`, `activate()`, `deactivate()`, `show()`, `refresh(forceNoCache)` |
| `Welcome` | `welcome-panel.js` | `initOnce()`, `activate()`, `refreshAPIKeysStatus()` |
| `WizardsVault` | `wizards-vault.js` | `forceReload()`, `getCurrentSeason()`, `getAccountListings()`, `purchase(itemId)` |
| `WVSeasonStore` | `wv-season-storage.js` | `getCurrentSeasonInfo()`, `listSeasons()`, `readSeason(fp,y,s)`, `writeSeason()`, `getPinned()`, `setPinned()`, `delPinned()`, `getMarks()`, `setMarks()`, `getPrefs()`, `setPrefs()`, `getKeyPrefs()`, `setKeyPrefs()`, `compact()`, `migrateFromLegacy()`, `__util`, `__cfg` |
| `WVShopUI` | `wv-shop-ui.js` | `render()`, `ensureShopToolbar()`, `refresh(nocache)` |
| `WVObjectivesUI` | `wv-objectives-ui.js` | `renderTab(host,data,kind)`, `renderZero(kind)` |
| `WVObjectivesDashboard` | `wv-objectives-dashboard.js` | `activate()`, `deactivate()`, `refresh(force)`, `_debug()` |
| `WVPurchaseDetail` | `wv-purchase-detail.js` | `initOnce()`, `show(data)`, `hide()`, `refreshOnlineStatus()`, `_debug()` |
| `forceReloadWVSeason` | `wizards-vault.js` | `forceReloadWVSeason()` — inyecta botón de recarga estacional |
| `toast` | `app.js` | `toast(type, message, opts)` — type: 'success'\|'error'\|'warn'\|'info' |
| `KeyManager` | `app.js` | `load()`, `refreshSelects()`, `setSelected(token,opts)`, `addOrUpdate(key)`, `copy(val)`, `rename(val,name)`, `remove(val)`, `list`, `selected` |
| `GW2Api` / `WV` | `api-gw2.js` | `root.GW2Api` — API wrapper con métodos: `getAccount()`, `getAccountAchievements()`, `getAchievementsMeta()`, `getWallet()`, `getCharacters()`, `getInventories()`, `getAccountWvListings()`, etc. |

---

## Sistema de eventos

### `gn:tokenchange` — Canal único de cambio de cuenta

```
UX cambia key → KeyManager.setSelected() → dispatchEvent('gn:tokenchange')
```

**Invariante técnica:** es el **único canal** para cambio de cuenta.
Router, InventoryHub, Characters, RaidTracker, StrikeTracker y Activities escuchan este evento.

```js
document.addEventListener('gn:tokenchange', function(e) {
  const token = e.detail.token;  // API key string
});
```

### `gn:nav-active` — Navegación activa

Disparamo `gn:nav-active` con `{ detail: { hash } }` cuando la ruta cambia.
Usado por `wizards-vault.js` para injectar el botón de recarga estacional.

### `characters:<event>` — Eventos de Characters

```js
window.Characters.on('loaded', callback);   // characters loaded
window.Characters.off('loaded', callback);  // remove listener
```

### Analytics events

`window.Analytics.*` envía eventos a Google Analytics vía `sendEvent()`.
Eventos: `view_module`, `export_backup`, `import_backup`, `open_account_wizard`,
`download_excel_template`, `enrich_with_api`, `encrypt_accounts_file`,
`force_reload_season`, `open_api_keys_modal`, `add_api_key`, `delete_api_key`.

---

## Storage (localStorage)

**Prefijo `gn:` para todas las claves nuevas.** Gestionado por `storage.js` v1.0.1.

| Key | Tipo | Descripción |
|-----|------|-------------|
| `gn:selectedKey` | string | API key seleccionada actualmente |
| `gn:apiKeys` | JSON | Lista de keys con label/value |
| `gn:settings` | JSON | Preferencias de usuario (theme, compact mode, etc.) |
| `gn:accountsData` | JSON (encryptado) | Cuentas syncadas vía Gist |
| `gn:accountsMeta` | JSON | Meta de accounts (fileName, updatedAt) |
| `gn:charactersCache:<hash>` | JSON | Cache de personajes con TTL |
| `gn:wvSeason_v<year>` | JSON | WVSeasonStore — datos por temporada |
| `gn:gistSync` | JSON | Estado de sync Gist |

## Debug methods

| Módulo | `window.X._debug()` devuelve |
|--------|------------------------------|
| `InventoryHub` | `{ active, view, section, bankItems, materialsCount, armoryCount, token }` |
| `ConverterModal` | `{ inited, activeTab }` |
| `Accounts` | `{ active, hasData, fileName, accountsCount, view, compact }` |
| `RaidTracker` | `{ active, token, wings, completedCount, pendingCount }` |
| `StrikeTracker` | `{ inited, active, token, completedStrikes, loading, error }` |
| `Characters` | `{ characters, maps, pois, profIcons, specs, assignments, filters, view, pagination, token, accountAchievements, ... }` |
| `WVObjectivesDashboard` | Datos comparativos multi-cuenta |
| `SettingsManager` | `{ version, ready }` |


