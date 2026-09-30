# BACKLOG.md — Tareas técnicas pendientes
> Prioridad: ordenadas de mayor a menor prioridad técnica.
> Actualizado: 2026-09-30T02:30:00Z (Heartbeat #41 — Idea 47 cerrada y mergeada; Idea 48 al frente)
> Mantenedor: Principal (default)

## 🚨 URGENTE (Sept 29 — CM content deadline) — ✅ COMPLETADO

- [x] **Nexus of Eternity achievement tracker** — ✅ COMPLETADO. Category 487 (9349 Conqueror, 9405 Power Unleashed, 9388 Essence Collector, 9447 Weekly) loads dynamically via `/v2/achievements/categories` API dropdown. No code change needed. CM entra Sept 29. (commit 116ac60, branch feature/cm-content-sept29)
- [x] **Solitary Throne fractal daily tracker** — ✅ COMPLETADO. 4 daily achievements: 9423 (T1), 9412 (T2), 9373 (T3), 9388 (T4). `SOLITARY_THRONE_CM_ACHIEVEMENTS` + `Fractals.loadCMStatus()` with abort/last-win pattern. Render badges in `renderFractals()`, wired into tokenchange + refresh. CM entra Sept 29. (activities.js v3.19.7, commit 116ac60, pushed to agents)
- [x] **Nexus of Eternity raid tracker (Wing 9)** — ✅ COMPLETADO. Wing 9: Nexus of Eternity (Vloxx boss, CM Sept 29). CSS class `.raid-expansion--voe`. wing9.png icon. (commit 8cc5fc6, raid-tracker.js v1.9.0, pushed to agents)
- [x] **Promotion to production** — 🚨 CRÍTICO: CM launches TODAY (Sept 29). Content NOT in production (verified by PO 06:00 UTC: `git merge-base --is-ancestor 4b253b2 origin/main` → NOT_ON_MAIN). Cherry-pick 4b253b2 onto origin/main. Golden rule: Pablo decides. Already escalated via channel_message (COMM 008). Reviewer 10th timeout (platform bug), proceeding by merit.

## Pendientes (prioridad alta)

- [x] **Idea 47 — errores que se muestran como ceros** — ✅ **CERRADA (HB#41), mergeada a `agents/main` @ `110b049`.** 4 commits: `7ca8195` (allSettled + banner de lectura incompleta), `9860a2e` (propagacion en la capa API), `776b1ea` (`.catch` no-op en los launches tardios de wallet-dashboard), `92b9cc1` (el call site del TP). `api-gw2.js` v2.18.0, `converter-modal.js` v1.2.0, `inventory-hub.js` v1.4.0, `inventory-dashboard.js` v1.2.0, `raid-tracker.js` v1.9.0. Verificacion: `node --check` 7/7, suite **105/105 aserciones, 0 FAIL**.
  - **El Code Reviewer acorto el scope de 8 wrappers a 5** (`task-ec29dfb1ec3f`, veredicto *aprobado con cambios*). El caso de commerce no se arregla propagando: `converter-modal.js` ya usaba `allSettled` y el call site deshacia el contrato con `status === 'fulfilled' ? value : []`. **El fix de commerce estaba en el convertidor, no en `api-gw2.js`.** Propagan: `getCharacterCount`, `getAccountRaids`, `getAccountBank`, `getAccountMaterials`, `getAccountLegendaryArmory`. Los 10 call sites fueron auditados uno por uno antes de aplicar.
  - **`getCommerceListings` queda afuera, deliberadamente y por escrito.** Es un catalogo **global**, no per-token: `[]` es estado normal. El motivo esta en el JSDoc (P5 del Reviewer) para que el proximo que lea el archivo no lo "arregle" porroutine y rompa el convertidor.
  - **Riesgo descartado por el Reviewer:** el camino de error de estos wrappers **no** contaminaba la cache, porque `putCache` esta dentro del `.then` de exito y no del `.catch`. Un `[]` cacheado por un error no existia.
  - **Correccion a mi propio analisis:** dije que raid/strike eran la peor superficie porque "no completaste nada" y "no pude leer" eran la misma columna. Con propagacion, esas dos columnas **ya renderizaban el error** (`raid-tracker.js:1741`, `strike-tracker.js:1113`). El riesgo real esta en 2 modulos, no en 4.
  - **La Idea 45 t2 dejo de estar a medio dead.** Los `catch` de `characters` y `raids` en `wallet-dashboard.js` eran inalcanzables porque los wrappers resolvian `0`/`[]` y nunca rechazaban. Ahora corre.
  - **P6 del Reviewer, relevante para el changelog:** esto no corrige un descuido, **revierte una decision del propio Reviewer** que era valida para commerce (`getCommerceDelivery` documentaba que buys/sells degradan a `[]` "revisado por el Code Reviewer") e invalida para inventario. Describirlo como "fix: errores tragados" seria incompleto.
  - **El `catch` de `getCommerceListings` en `converter-modal.js` no se toco** a proposito: su unico call site ya degrada a `[]` y en un catalogo global eso es lo correcto.

- [x] **Rotación diaria de fractales INVENTADA (hallazgo del PO)** — ✅ CORREGIDO (Heartbeat #32, commit `27b8394` en `agents/main`). `loadToday()`/`loadTomorrow()` hardcodeaban 3 fractales T4 + 3 escalas fijas y los pintaban como los "dailies de hoy" y "de mañana" — **el panel mostraba siempre los mismos nombres, presentados como datos reales**. Verificado contra la API: `/v2/fractals` → **404**, `/v2/achievements/daily` → **503 `{"text":"API not active"}`**. La GW2 API no expone esa rotación. Ahora `rotationAvailable:false`, arrays vacíos, y se muestra un aviso explícito en vez de inventar nombres. El tracker de Solitary Throne CM **no se toca** (ese sí es real, vía `getAccountAchievements`). `js/activities.js` v3.20.1, `node --check` limpio, HTML balanceado.
  - ⚠️ **Rescate de rama:** el commit del PO `c081496` vivía en `fix-fractals-fake-daily-data`, brakeda desde `53425b0`. Mergearla habría revertido **335 líneas de logs** y el guard `LEY_LINE_ENDPOINT_RETIRED` de `meta.js`. Se rescató con `cherry-pick -x` a una rama limpia. **Esa rama no se mergea; ya está obsoleta.**
  - ⏳ **Abierto (COMM 019):** el nuevo `<div>` del aviso introduce `border` / `border-left` / `border-radius` en `style=` inline → viola la arquitectura CSS de 3 capas. Consultado al Reviewer (`task-57c182d1993a`). Es cosmético, no funcional.

- [x] **`/v2/events` RETIRADO (meta.js Ley Line)** — ✅ RESUELTO 2026-09-29T18:20Z, commit `f533d67` en `agents/main`. Verificado en vivo: `/v2/events` y `/v2/achievements/daily` → **503 `{"text":"API not active"}`**, mientras `/v2/maps`, `/v2/worlds`, `/v2/continents` y `/v2/itemstats` → **200**. No es caída transitoria: es retiro selectivo de esos dos endpoints. **No hay endpoint sustituto** — la rotación del mapa de Ley Line Anomaly no está expuesta en la GW2 API. La propuesta de reemplazarlo por `/v2/account/worldbosses` es incorrecta (worldbosses = historial de bosses derrotados). El código ya degradaba solo (`inst._activeWaypoint || meta.chat`); el guard `LEY_LINE_ENDPOINT_RETIRED` solo evita emitir un request condenado y documenta el hallazgo. El mismo retiro aplica a `/v2/achievements/daily`, aunque hoy no lo usa ningún módulo de `js/`.
- [ ] **Idea 48 — el pool esta calibrado a 1/3 del permiso** — 🟡 **SIGUIENTE ITEM. Tramo A: 30-45 min.** (Idea del PO, 2026-09-30 02:00 UTC, `2cdacce`.) No es una feature: es un numero mal calibrado en algo **ya mergeado**. `POOL_MAX: 3` no lo eligio nadie, se heredo de los worker-pool locales y nunca se midio.
  - **Medido en vivo por el PO:** latencia mediana **902 ms** (7 respuestas 200 con datos), **cero 429 hasta 20 requests concurrentes**, `X-Rate-Limit-Limit: 600` confirmado. El pool actual rinde **~200 req/min = 33% del permiso**.
  - **Impacto:** con 27 cuentas, el Dashboard Cartera son 109 requests → **32.7 s hasta la primera pantalla con datos**. Con `POOL_MAX=6`: **16.4 s**. Y mientras tanto la UI solo dice `"Cargando cuentas... 4/27"`, un contador que avanza a saltos sin decir si eso es normal.
  - **Tramo A (30-45 min):** `POOL_MAX` 3 → 6. `fetchWithRetry` ya tiene backoff exponencial para 429.
  - **Tramo B (2-3h):** ETA real en ese contador, leyendo `poolStats()` (ya expone `queued`/`waitMs`). **Cierra la Idea 46 t2 con datos medidos en vez de con una estimacion.**
  - ⚠️ **Interaccion con ALERT-27:** subir `POOL_MAX` **no** arregla el 429. El limite de ArenaNet es de **tasa**, no de concurrencia; el pool amortigua picos, no excedentes sostenidos. Con 3 slots y ~200 ms el techo teorico es ~900/min, por encima del presupuesto de 600/min. **El token bucket sigue siendo necesario antes de la Idea 42** (324 requests).

- [ ] **Coberturable account-scoped multicuenta (idea del PO 18:00 UTC)** — 🟡 **MAYOR GAP MEDIDO.** 12 endpoints `/v2/account/*` sin tocar: `skins` (10.632), `outfits` (136), `finishers` (70), `minis` (983), `novelties` (236), `gliders` (148), `mailcarriers` (16), `mounts/skins` (488), `mounts/types` (9), `titles` (496), `dyes` (643), `home/cats` (35). La Bóveda usa ~10 de ~50 disponibles. Arrancar por `skins`; el resto es data + columnas. Subsume las Ideas 38/40/41 del PO. ⚠️ **Trampa verificada:** `?ids=all` → **HTTP 400** en `/v2/skins` (y en `/v2/items`, `/v2/achievements`), pero **200** en `/v2/currencies`. Hay que paginar en lotes. Referencia del código existente: `chunk = 100` (`meta.js:294`).
- [x] **Commerce delivery** — 🟢 **API LISTA (HB#33)**, UI pendiente. `getCommerceDelivery(token, opts)` en `js/api-gw2.js` v2.16.0, mismo patron que buys/sells (cache 60s, `inflightOnce`, inflight key por `fpToken`). Endpoint verificado en vivo: `/v2/commerce/delivery` con token falso → **401** (existe); control `/v2/commerce/bogusendpoint123` → **404** (no existe). **Falta**: render en UI (bloqueado por Reviewer, 14ª falla) y la decision sobre el `.catch` a `[]` (en delivery, vacio puede significar «no tenes nada» en vez de «no se pudo leer»). Friccion real reportada por el PO: la Boveda muestra la venta como pasada sin avisar que el dinero no se cobro.
- [ ] **Dungeon dailies** — 🟢 ~3-4h, completa una familia ya implementada 3/4. `activities.js` ya trackea `dailycrafting`, `worldbosses` y `mapchests`; falta `dungeons` (8 mazmorras, verificado 401 = existe). Patrón ya probado, es el de menor riesgo de los tres.
- [ ] **Legendary Armory Phase 3** — ⏳ Skeleton implemented (bac5c67, 7c88fe6, 1aaff5a). Detail modal + CSS 3-capas done. AWAITING API connection (Phase 3 commit 4). Componentes de recetas bloqueados (API GW2 no expone recetas con ingredients). Wages of Stars (110020) ya en legendary-data.js. ~15-20h remaining.
- [ ] **inventory-dashboard.js (glow + overflow)** — 📋 DIAGNOSTICADO. 4 inline styles con box-shadow/border-radius/transition (lines 462, 473, 709, 830) violate CSS 3-layer architecture. Awaiting Reviewer validation (Reviewer DOWN — 10th timeout, platform bug).
- [ ] **Bug clearTimeout en inventory-dashboard.js** — 📋 DIAGNOSTICADO. loadActiveCharacterInventory (lines 267-290): clearTimeout(t1) en finally, pero AbortController c1 nunca se aborting explícitamente en error paths. loadAllInventories/loadCharactersInBackground no implementan abort en el pipeline. Timer leaks en caso de key-change o abort. Pattern reference: activities.js loadCMStatus (abort + last win).
- [x] **VoE content integration verification** — ✅ COMPLETADO (Heartbeat #30, 2026-09-29T18:00 UTC). Verificado contra API en vivo y contra producción:
  - **Solitary Throne CM** — los 4 logros existen y están hardcodeados en `origin/main:js/activities.js:823-827`: `SOLITARY_THRONE_CM_ACHIEVEMENTS = {9423:'T1' (Scale 1+), 9412:'T2' (26+), 9373:'T3' (51+), 9388:'T4' (76+)}`. Nombres reales en la API: "Daily Tier 1/2/3/4 Solitary Throne". ✅
  - **Nexus of Eternity** — presente en `origin/main:js/raid-tracker.js:121` (`nameEn: "Nexus of Eternity"`, `assets/icons/raids/wing9.png`, clase `.raid-expansion--voe`). ✅
  - **Categoría 487 "Convergencia: Nexo de Eternidad"** ya aparece en el selector de logros: `achievements.js:255` carga `/v2/achievements/categories?ids=all&lang=es` dinámicamente (360 categorías, 168 KB). ✅
  - **Hallazgo de robustez:** las 4 categorías del CM (78200/78572/78260/78613) **todavía no están publicadas** en `/v2/achievements/categories` (no aparecen entre las 360). Nuestro código matchea por **ID de logro**, no por categoría → inmune. No agrupar por categoría en código nuevo sin verificar contra la API.
  - **IDs inválidos detectados:** `9384` y `9454` (propuestos por el PO) devuelven `404 {"text":"no such id"}`. El set real de VoE es `{9349, 9394, 9405, 9409, 9422, 9435, 9447}`. Ver DECISIONS_LOG 2026-09-29.

## Pendientes (prioridad media)

- [x] **Homestead Glyph API mismatch** — ✅ CORREGIDO (Heartbeat #28, commit 18ef9a4, rama `fix/homestead-glyph-data`). El diagnostico del PO era incorrecto: la API `/v2/homestead/glyphs` devuelve un array de **strings** (36 entradas tipo `"alchemy_harvesting"`), no objetos `{id,name,icon}`. No existe `upgrade_item` ni `upgrades`. Agregado `normalizeGlyphs()` + `normalizeGlyphIds()`; eliminado el dead code `CONFIG.GLYPH_UPGRADES`. Verificado contra API real (36/36) + `node --check`. Sin cambios CSS. NO mergeado a main: el modulo solo es funcional en `feature/homestead-tracker` (ver item siguiente).
- [ ] **Homestead tracker: completar wiring** — ⚠️ PENDIENTE DECISION. En `agents/main` el archivo `js/homestead-tracker.js` esta commiteado pero **inerte**: sus 5 metodos `GW2Api` no existen en `api-gw2.js` de main, y no hay script tag en index.html, ni route en router.js, ni panel. En la rama `feature/homestead-tracker` el wiring esta completo, salvo que falta el icono `assets/icons/Cuentas/homestead-icon.png` (no existe en el repo). Decidir: mergear la rama completa (con icono) vs dejar el fix ahi vs revertir el archivo huerfano de main.
- [ ] **Verificar encoding de archivos** — 📋 ESCANEADO (Heartbeat #28). Detectados 17 archivos .js con BOM UTF-8 en `js/`. NO se modificaron: es un cambio masivo que requiere validacion del Reviewer (DOWN). Pendiente.

## Pendientes (prioridad baja)

- [ ] **Homestead decoration collection tracker** — PO Prioridad #1 (post-promotion). API confirmada (`/v2/account/homestead/decorations`, `/v2/homestead/glyphs`, `/v2/account/home/cats`). 837+ decorations, max_count varía. Pattern: activities.js Home Nodes. ~15-20h.
- [x] **New Items Awareness Feed** — ✅ COMPLETADO. js/activities.js v3.20.0 + assets/data/new-items-feed.json. NewItemsFeed module con fetch + abort/last-win (_fetchId), gn:activities:new-items cache key, localStorage fallback, GW2 API fetch para item details. Render dinámico en activities panel. (commit en agents/main)
- [ ] **Mobile PWA enhancement** — manifest.json + service worker. CSS breakpoints ya implementados. ~8-12h.
- [ ] **WvW Borderlands beta tracker** — Nov 10 deadline. Bóveda tiene WvW objectives pero no borderlands map tracker. ~6-8h.
- [ ] **Inventory cleanup tool** — MetaForge WARDOGS competitive gap. ~15-20h.

## Completed (referencia histórica)

- [x] **Convergence Achievement Tracker — DROP (no downgrade)** — El propio PO lo descartó (Heartbeat 19:00 UTC) tras aceptar mis correcciones: 2 de sus 4 IDs de logro (`9384`, `9454`) devuelven 404, y la categoría 487 ya se carga dinámicamente en `achievements.js:255` → el módulo habría sido redundante. Commit `feda750`.

- [x] **Fractal Tracker multicuenta (Idea 39 del PO)** — 🟡 **DESBLOQUEADO, listo para arrancar.** El Reviewer aprobó con cambios (COMM 015, C1-C3) y la condición bloqueante C2 ya fue resuelta por el Principal (DECISIONS_LOG 2026-09-29): el bloque CM de `activities.js` se queda donde está. Previo: `27b8394` eliminó la rotación inventada, así que el módulo arranca sobre datos reales. Condiciones del Reviewer a respetar: sin badge de relics inventado, tabla de 17 instabilities como constante en el IIFE (no `localStorage`), last-win por token, y el tema nace como `fractal-tracker-theme.js` sin `style=` inline.

- [x] **Suerte (MF base account-wide)** — ✅ IMPLEMENTADO (2026-09-29, `agents/main` @ `0cc5cb7`, commits `44c64a9`/`6067851`). Columna opt-in "Suerte (MF)" en el Dashboard Cartera multicuenta. `js/luck-curve.js` v1.0.0 (nuevo, tabla oficial de 300 umbrales de GW2 Wiki + `fromLuck()`), `getAccountLuck()` en api-gw2.js vía `/v2/account/luck`. **Corrección a la premisa del PO:** la Luck NO está en `/v2/currencies`; el endpoint dedicado existe desde 2019-04-08 y la mecánica es de 2013-09-03. Test funcional node TODO OK, `node --check` limpio.

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
