# 📜 Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato sigue las recomendaciones de  
**Keep a Changelog** (https://keepachangelog.com/)  
y el versionado **SemVer** (https://semver.org/).

---

## [Unreleased]

### Fixed
- **fix(cache): las 5 familias de Homestead entran en la allowlist de `cacheClear`, y el censo nombra por qué el total saltó de 8 a 11 (`df9131b`; `js/api-gw2.js` v2.34.0)**:

  **El bug**: los 5 métodos de Homestead escriben 5 claves — `homestead_decorations_all`, `homestead_decoration_categories`, `homestead_glyphs_all`, `account_homestead_decorations`, `account_homestead_glyphs` — y **ninguna** estaba en `CACHE_KEYS_EXACT`. El botón de "limpiar caché" las contaba como conservadas y sus cuotas quedaban vivas: exactamente el fallo que la allowlist exacta vino a evitar.

  **Van exactas y no por prefijo, por dos motivos distintos.** Los 3 de catálogo (`homestead_*`) **no comparten prefijo útil entre sí** (`_decorations_all` vs `_categories` vs `_glyphs_all`): un prefijo `homestead_` los cubriría, pero ese mismo prefijo se lo comería cualquier clave futura de Homestead escrita a mano, que es justo lo que la lista exacta vino a evitar. Los 2 de cuenta llevan la huella del token (`:<fpToken>`) y aun así van exactas, porque la lista matchea la clave EXACTA y el sufijo lo agrega la escritura, no la declaración.

  **Allowlist medida hoy sobre el archivo real** (no tomada de un comentario): `CACHE_KEYS_EXACT` = **20** claves, `CACHE_KEYS_PREFIX` = **5**.

  **El censo (`tools/idea50-censo-claves.mjs`) nombra el salto 8 → 11**, que antes no lo nombraba nadie: cuando `homestead-tracker.js` pasó a cargarse desde `index.html`, sus 3 familias dejaron de ser cache de **código MUERTO**. La unidad del censo es **familias**, no claves ni líneas: son **12 filas (call sites) = 11 familias únicas**, porque `gw2_currencies_cache_v1` tiene 2 call sites y **una sola** familia. Dos call sites que escriben la misma clave son una clave, no dos.

  **ALERT-86, ahora con el número encima**: **3 de esas 11 familias no se reconocen por el NOMBRE de la clave** — las 3 de `gn:homestead:*`. Un censo que clasifica solo por nombre las pierde; por eso la lista es explícita y no deducida.

  **Lo que el censo NO dice, y por qué importa**: no dice el **tamaño** de esas claves (depende de la cuenta de Pablo, y es el único número que decide si "liberar la cache de la API" es cierto), ni si una clave **debería** estar en el registro — eso es una decisión, no se automatiza. Y **quedan 4 escrituras sin resolver** (`gist-sync.js:422`, `gist-sync.js:571`, `raid-tracker.js:914`, `settings-manager.js:241`): un número que excluye lo que no supo leer no es un total.

  **Verificación**: `tests/idea50f.cacheclear-real.test.js` **69 pass / 0 FAIL**; `tests/alert86.censo-clasificacion.test.js` **32 pass / 0 FAIL**.

  **✅ Incoherencia detectada y CORREGIDA**: el docblock de la cabecera del mismo `api-gw2.js` decia "CACHE_KEYS_EXACT 15 + CACHE_KEYS_PREFIX 5" y "su registro cubre los 18", que ya no coinciden con el codigo (20 y 25). **Es un archivo `.js` y el Documentador no edita codigo**, asi que quedo reportado al Principal, que lo corrigio en este mismo commit (L479-L480): ahora dice 20 + 5 y "cubre los 25". Verificado contando las entradas de la allowlist sobre el archivo real, con control positivo (`tokeninfo`, `account_skins`, `homestead_glyphs_all` = 3/3) y control negativo (`ZZZ999` = 0).

- **fix(cache): el borrado de caché ya alcanza la cache del Wizard's Vault, y el inventario de bases dejó de ser una lista central (Idea 50 P3 — `376f0d5` + `9adf6dd` + `0d1d0aa`; `js/api-gw2.js` v2.30.0, `js/wizards-vault.js` v1.3.1)**:

  **Estado: MERGEADO a `agents/main`** por fast-forward. Veredicto del Code-Reviewer (`task-19ca4a2448b8`): **APROBADO CON CAMBIOS**; los 4 cambios pedidos se aplicaron antes del merge (`0d1d0aa`).

  **⚠️ NO cambia lo que Pablo ve.** `cacheClear` sigue con **0 callers** y el botón sigue sin existir. Lo único que cambia es que el borrado **ya puede alcanzar** la cache del Wizard's Vault, que antes era inalcanzable.

  **El punto ciego que cierra (motivo medido)**: `wizards-vault.js` escribe su cache con su **propio `lsSet` y su propio `kLS`, FUERA de la capa API**. Un grep sobre `putCache` no la veía, y el test de la 50F daba **verde sin cubrirla**.

  **El diseño, que es lo no obvio: el registro es ESTÁTICO y se LEE AL PULSAR** (`collectCacheBases()`), no en la escritura ni al cargar el módulo. Las otras dos formas fallan, cada una por un motivo distinto:
  - **Registrar al escribir** (`putCache`) es un **hecho de SESIÓN aplicado a un hecho de DISCO**. En una sesión nueva donde Pablo no abrió la pestaña de WV, el registro está vacío: el botón no toca las claves `wv_*` que hay en disco desde la semana pasada, y el `dryRun` del **futuro `confirm()`** contaría 0 bytes y **prometería una liberación que no ocurre**. Es el bug que la v2.29.0 vino a arreglar, reintroducido por la puerta de atrás.
  - **Leer el registro al cargar el módulo** lo ata al **orden de los `<script>`** de `index.html`.

  Leyéndolo al pulsar, las dos cosas quedan bien sin depender de ninguna.

  **Cada módulo se anota solo, con UNA línea**: registro global `root.__cacheBaseProviders` (`(root.__cacheBaseProviders = root.__cacheBaseProviders || []).push(WizardsVault)`, `wizards-vault.js:699`). **La capa API NO nombra ningún módulo**: agregar un módulo es **1 línea en el módulo y 0 en la capa**. El que declara su cache es el módulo que la escribe, así que el inventario no es una lista a mantener a mano.

  **La red de preservación** es el **prefijo** `wv:season:` (`CACHE_PRESERVE_PREFIX`), no claves exactas, porque `wv-season-storage.js` tiene **4 familias** de persistencia, no 2: `wv:season:index` (`KEY_INDEX`), `wv:season:current` (`CURRENT_KEY`), `wv:season:YY:SEQ` (`FILE_PREFIX`, multi-season; hoy dormida porque `SINGLE_SEASON_MODE = true`) y `wv:season:*.__shadow` (`SHADOW_SUFFIX`, escritura atómica). Se evalúa **ANTES** que los prefijos de cache: el borde peligroso es un prefijo corto, y el día que alguien declare `wv`, las 4 familias se comen de una y esto las salva. Hoy el riesgo es cero — por eso es **la red y no una nota**.

  **Alcance medido: 23 bases**, no 22 — **18 de la capa API (14 exactas + 4 prefijos)** + **5 del WV (4 exactas + 1 prefijo)**. El recuento del veredicto decía 6 declaraciones de WV donde hay 5 (`wizards-vault.js:615`: `exact: ['wv_season','wv_account_v2','wv_listings_all','wv_acc_listings']`, `prefix: ['wv_obj_']`). `GW2Api.__cacheBases()` expone el registro en **solo lectura**, para que el alcance sea medible en vez de estimado.

  **Los 4 cambios que pidió el Code-Reviewer (`0d1d0aa`), ninguno bloqueante de datos:**
  1. **P1 — la red tenía agujeros justo donde el código está diseñado para ir.** `CACHE_PRESERVE` listaba 2 claves exactas sobre un módulo con 4 familias; ahora es un prefijo.
  2. **P2 — "api-gw2.js no tiene que saber de WV" era un comentario FALSO, y la contradicción era el bug de diseño.** Era literalmente `if (root.WizardsVault && root.WizardsVault.__cacheBases)`: lo que se movió fue la lista de **BASES**, no la de **MÓDULOS**, y eso convertía el registro en una lista central con otro nombre (los 5 módulos pendientes exigían 5 ediciones más de la capa). Sustituido por el registro global.
  3. **P3 (Reviewer) — la colecta estaba en el loop caliente.** `collectCacheBases()` corría DENTRO de `isCacheKey()`, que corre una vez por clave de `localStorage`: con ~4.98 MB son 2 arrays nuevos (`slice()`) + 23 `indexOf` **por clave**, en el único loop que recorre el store entero. Ahora se colecta **una vez** al empezar el clic y se pasa por parámetro. No rompe el "se lee al pulsar": lo que decide el momento es `cacheClear`.
  4. **P4 — la suite mentía en su propia línea de resumen, y el arreglo con un segundo script la empeoró.** `run-suite.js` imprimía `TOTAL: 557 ... (27 archivos)` habiendo parseado 20; la respuesta de medir los 7 que faltaban por separado eran **dos fuentes de verdad para el mismo número**. Ahora el runner parsea el **4º formato** de línea de resumen (`pass: N | FAIL: M`, usado por 7 de los 27 archivos) y **`tools/count-suite-totals.py` se BORRA**. La línea de total ahora declara su alcance: `27 de 27 archivos, alcance completo`.

  **Correcciones de comentarios** (mismo commit): el typo `Revieweredia` → `Reviewer decia` (`api-gw2.js:1730`, ALERT-79, commit `6d50323`) y el BOM UTF-8 restaurado en `wizards-vault.js`.

  **Verificación:**
  - **Test**: `tests/idea50f.cacheclear-real.test.js` **66 pass / 0 FAIL** (era 57; +9 aserciones, 3 de ellas nacidas de 2 fallos que corrigieron al propio autor — ver ALERT-81 en `ALERTS_LOG.md`).
  - **Fase roja por MUTACIÓN** (no solo en verde), con la herramienta nueva `tools/mutate-p3-registry.py`, una corrección por vez:

    | Mutación | FAIL que muerde |
    |---|---|
    | P1 — red de preservación vacía | **6** |
    | P2 — lista central de módulos | **4** |
    | P3 — colecta por clave | **1** |
    | P2b — módulo sin anotar en el registro | **5** |

  - **Suite completa: 694 aserciones / 0 FAIL, 27 de 27 archivos, alcance completo** (verificado con `node tools/run-suite.js`). Antes: 685/0 medido por dos scripts (557 del runner en 20 + 128 de los 7).

  **Pendiente, y es el Tramo siguiente:**
  - **El botón de "limpiar caché" sigue sin existir.** Es lo único que bloquea, y además necesita un **hook** (`onClear` o `__cacheClearMem()`): `cacheClear` solo limpia la `__mem` de una capa, y `wizards-vault.js:40-41` tiene su propia `__mem`/`__inflight` — sin ese hook los bytes liberados se vuelven a servir desde memoria y el botón parecerá que no hizo nada (anotado por el Reviewer).
  - **5 módulos todavía no declaran sus bases**: `characters.js`, `homestead-tracker.js`, `activities.js`, `app.js` y `legendary-tracker.js`.
  - **La Idea 49G sigue RECHAZADA (ALERT-73) y deliberadamente sin mergear**: no forma parte de este cambio.

- **fix(cache): `cacheClear()` dejó de limpiar solo la sesión y ahora borra de verdad; nace con `dryRun` (Idea 50 Tramo F — `c04496e` + `a330d30`, merge `86b351a`; `js/api-gw2.js` v2.28.0 → v2.29.0)**:

  **⚠️ NO cambia lo que Pablo ve.** La función sigue con **0 callers** y el botón sigue sin existir. Arregla una función que mentía, no agrega UI. Tramo F y P3 son el mismo camino visto desde las dos puntas: primero la función tiene que ser verdad, después se le pone el botón.

  **Bug**: `cacheClear()` hacía `try { __mem.clear(); __inflight.clear(); }`, o sea limpiaba la cache de la **SESIÓN** y no la de **DISCO**: la cuota de `localStorage` (~4.98 MB medidos en navegador real) seguía llena y el borrado no liberaba un solo byte. El efecto era invisible solo porque no había botón — cualquier botón que se hubiera colgado de esta función habría sido un botón que no hacía nada.

  **Fix, en dos commits**:
  - `c04496e` — borra de verdad, por **allowlist EXACTA** de las claves de la capa y **no por prefijos**. El motivo está medido y no es obvio: `wallet` y `luck` son nombres **pelados**, así que un barrido por familias habría dejado vivas justo las claves que más cuota gastan.
  - `a330d30` (P4 del Reviewer) — `cacheClear(opts)` acepta `{dryRun: true}` y devuelve `{removed, kept, bytes, dryRun}` **sin borrar**. En `dryRun` tampoco vacía `__mem`: la pregunta es "cuánto liberaría" y vaciar la sesión antes de responder ya sería borrar. Petición explícita del Reviewer para que el botón no tenga que cambiar una firma ya mergeada.

  **El detalle que hace que el número signifique algo**: `removed` pasó de contar llamadas a `lsDel` —que **se traga la excepción**, o sea que contaba una intención— a ser **la diferencia real de `localStorage.length` antes y después**. Con la forma anterior, un borrado fallido se contaba como borrado.

  **Garantía verificada por el test**: NO toca `gn:account:keys` ni `gw2_keys` (las 27 cuentas), ni pines, ni tema, ni las caches de otros módulos.

  **Verificación**: test nuevo `tests/idea50f.cacheclear-real.test.js` (**57 pass / 0 FAIL** al cierre del Tramo; el archivo no existía antes y nació aquí — lo que P3 lo llevó a 66). Fase roja **8 FAIL** contra el archivo sin el fix, registrada en el mensaje de merge `86b351a`. Suite: **369 pass / 0 FAIL, 25 archivos**, todos exit 0.

  **Nota de proceso (ALERT-75)**: el Reviewer escribió **dos veredictos contradictorios sobre este mismo Tramo** —`APROBADO CON CAMBIOS, "Mergealo"` a las 18:44:32Z y `RECHAZADO` a las 18:55:33Z. Contrastado contra el archivo real (`git show c04496e:js/api-gw2.js`), el código está bien y el que se equivocó fue el resumen. **El resumen no pisa al artefacto que resume.**

- **fix(cache): Actividades ya no borra la cache de logros de otros módulos, y `lsSet` deja de tragarse el `QuotaExceededError` (Idea 49, Tramos 1 y A — `d7cbe0d` + merge `9e211b5`, `fb55fe2` + buster `4e5296b`; `js/activities.js` v3.20.3, `js/api-gw2.js` v2.20.0)**:

  **Tramo 1 — un módulo borraba la cache de otro (`activities.js` v3.20.2 → v3.20.3)**

  - **Bug**: `Activities.activate()` llamaba a `cleanAchievementsCache()` (`activities.js:553`), que borra **toda** clave `localStorage` con prefijo `ach_` — exactamente la familia que `api-gw2.js putCache()` escribe para logros: `ach_acc:<fpToken>` (TTL 2 min, `api-gw2.js:860`, `TTL.ACH_ACC`) y `ach_meta_v2:es:<ids>` (TTL 12 h, `api-gw2.js:887`, `TTL.ACH_META` — la cara: chunkea de a 200 ids y escribe una clave completa por id-set distinto).
  - `router.js` invoca `Activities.activate()` en **cada** navegación a `#/activities` (`router.js:1661` y `router.js:1758`). Consecuencia: abrir el panel de Actividades invalidaba la cache de logros de **todas** las cuentas y la página de Logros arrancaba en frío (~433 requests) aunque recién se hubiera cargado.
  - **Fix**: quitada la llamada de `activate()`. `cleanActivitiesCache()` **se conserva** (prefijos `psna:` y `ACTIVITIES_CACHE_KEYS`, datos del propio módulo). `cleanAchievementsCache()` **sigue definida** para llamadas explícitas; no se borró ninguna función.
  - Regla aplicada: **un módulo no borra la cache de otro**. Limpiar la cache es acción explícita del usuario, no parte de entrar a un panel.
  - **Lo que el fix destapa** (medición de ALERT-42): la metadata sola son **~3.6 MB por id-set de cuenta**; con 27 cuentas el volumen no gestionado sería **~96 MB** contra una cuota de navegador de **4.98 MB**. Es decir, lo que mantenía la cuota a raya era **un borrado accidental, no el diseño**. Por eso el Tramo A va encadenado a este en el mismo ciclo: quitar el wipe sin hacer visible el fallo de cuota habría cambiado «la página de Logros tarda» por «todo reinicia en frío, en más sitios, y sin decir nada».
  - Sin CSS, sin cambio de UI. `index.html` subido a `activities.js?v=3.20.3` en el mismo commit.
  - Runner: `tests/idea49.activities-cache-wipe.test.js` **16/16**; suite completa en ese commit 159/0.

  **Tramo A — el fallo de cuota dejó de ser invisible (`api-gw2.js` v2.19.0 → v2.20.0)**

  - **Bug**: `lsSet()` era `try{...}catch(_){}` — se tragaba **cualquier** error sin dejar rastro. El que importa es el de cuota: la cuota de `localStorage` (**~4.98 MB medidos en navegador real**) es **compartida por todas las claves cacheadas de la página, no por módulo**. Al llenarse, cada escritura posterior falla, la copia en `__mem` sigue sirviendo solo durante la sesión, y **cada recarga vuelve a ser un arranque en frío** (~433 requests, ~65 s) presentado como «la Bóveda anda lenta» en vez de como un fallo. `cacheClear()` tiene 0 callers y ningún botón: no había escape.
  - **Fix**: `lsSet()` devuelve booleano, cuenta los fallos de cuota (`isQuotaError()` cubre `QuotaExceededError`, `NS_ERROR_DOM_QUOTA_REACHED` y los `code` legacy 22/1014) y avisa **una sola vez** por consola (no una por escritura: son cientos por carga). Nueva **`GW2Api.__cacheStats()` → `{ quotaFails, quotaWarned }`**: `quotaFails > 0` significa que la cache dejó de persistir entre recargas.
  - **No relanza el error, a propósito**: la copia en `__mem` ya sirvió para la sesión y lanzar ahí sería peor que el fallo que se está corrigiendo. Los 2 call sites de `lsSet` ignoran el valor de retorno; no se tocaron.
  - **⚠️ ESTE TRAMO NO ARREGLA LA CUOTA.** El volumen sigue siendo el que es; lo único que cambia es que el fallo deja de disfrazarse de lentitud. Sigue pendiente el **Tramo C**, que es el que de verdad manda, y su **objetivo está corregido**: apuntaba a `ach_acc` (**0.17 MB/cuenta**, 4.6 MB las 27 cuentas), pero la clave cara es **`ach_meta_v2` (metadata, TTL 12 h) con ~3.6 MB/cuenta** — comprimir `ach_acc` por sí solo no alcanza. Pregunta abierta al PO (COMMS_LOG 027). Después, Tramo B: LRU sobre `gw2_*` (hoy el único cap del código es `items_cache_v1` a 500).
  - Runner: `tests/idea49.quotavisible.test.js` **11/11** con el fix y **4/11 (7 FAIL) contra el archivo sin modificar**, montando un `localStorage` que lanza `QuotaExceededError` de verdad sobre el archivo real (no una copia del código a un test). Suite completa: **7 runners, 170 aserciones, 0 FAIL**.
  - `index.html`: `api-gw2.js?v=2.20.0`. Sin CSS, sin cambio de UI, sin endpoints nuevos, sin tocar `router.js` ni `gn:tokenchange`.
  - **Alcance de la sesión (HB#45)**: `ALERT-43` (un heartbeat concurrente movió la rama por debajo del trabajo sin commitear → regla: commitear temprano) y `ALERT-44` (un sandbox con el mismo nombre dos veces en el literal de globals daba verde falso). Registradas en `ALERTS_LOG.md` por el Principal.

- **docs: dos anotaciones que se leían como promoción a producción sin serlo** (a pedido del PO, 2026-09-29):
  - `CHANGELOG.md` y `docs/ONBOARDING.md` afirmaban, en la sección de Suerte, que `origin/main` estaba en `0cc5cb7` con `luck-curve.js` y `getAccountLuck`. **Falso**: `0cc5cb7` es el head de `agents/main` (desarrollo). Producción (`origin/main` = repo `gw2-wallet-ligero`) está en `392c3b9` y **no** contiene esos archivos — verificado con `git cat-file -e origin/main:js/luck-curve.js` (no existe) y `git branch --contains 0cc5cb7` (solo `main`/`agents/main`).
  - Causa: en este clon el remote `origin` apunta a producción y el remote `agents` a desarrollo, así que un `origin/main` sin contexto se lee como "ya está en producción". Ahora ambas líneas nombran **el repositorio**, no el alias del remote.
  - `docs/ONBOARDING.md`: el heading "Novedades 2026-09-29 (SEPT 2026)" mezclaba la fecha de la release con la de la mecánica (que es de 2013-09-03). Se quitó el paréntesis y se agregó una nota explícita de que la fecha es la del proyecto.
  - Solo docs. Sin código, sin CSS. Producción intacta.

- **fix(activities): la rotación diaria de fractales era información INVENTADA (`27b8394` en `agents/main`; original `c081496`)**:
  - **Bug**: `Fractals.loadToday()` / `loadTomorrow()` tenían **3 fractales T4 + 3 escalas hardcodeadas** y el panel los pintaba como los dailies de hoy y de mañana. Eran siempre los mismos, todos los días, sin ninguna fuente real.
  - **Verificado contra la API GW2** (2026-09-29): `/v2/fractals?ids=1` → **404 not found**; `/v2/achievements/daily` → **`{"text":"API not active"}`**. La GW2 API **no expone** esta rotación. No existe endpoint sustituto.
  - **Fix**: `rotationAvailable: false` en el estado de fractales. El panel deja de pintar nombres de fractales/escalas y muestra un aviso explícito. Se eliminó el hardcode de los 3 T4 + 3 escalas.
  - **Lo que NO se tocó**: el tracker de Solitary Throne CM (achievements `9423`/`9412`/`9373`/`9388`) sigue intacto — ese dato **sí** viene de `getAccountAchievements` y es real.
  - Sin CSS, sin endpoints nuevos, sin tocar `router.js` ni `gn:tokenchange`.
- **Estado**: **MERGEADO a `agents/main`** como `27b8394` (`js/activities.js` v3.20.1 + `index.html` `?v=3.20.1`). Verificado con `git branch --contains 27b8394` → `main`. El commit original `c081496` quedó en la rama `fix-fractals-fake-daily-data`, ya superada. (La anotación anterior decía que no estaba mergeado: se escribió sobre un worktree con estado previo al merge. Corregido en Heartbeat #32.)

- **fix(meta): `/v2/events` retirado por megaservers → guard `LEY_LINE_ENDPOINT_RETIRED` (`f533d67`, en `agents/main`)**:
  - **Bug**: `fetchLeyLineActiveMap()` pegaba a `/v2/events?ids=<GUIDs>`. Ese endpoint fue **retirado** con la transición a megaservers. Verificado 2026-09-29 18:06 UTC: `/v2/events` → **503 `{"text":"API not active"}`**, mientras `/v2/maps`, `/v2/worlds`, `/v2/continents`, `/v2/itemstats` responden **200**. El 503 es específico de esos dos endpoints: es **retiro, no caída transitoria**.
  - Los `eventIds` de `assets/meta-events.json` son **GUIDs de `v1/events`**, que nunca fueron válidos contra `/v2`. La request moría en cada render sin aportar nada.
  - **Descartada la propuesta de reemplazo por `/v2/account/worldbosses`**: devuelve el historial de bosses derrotados de la cuenta, no tiene relación alguna con el mapa rotativo de Ley Line Anomaly.
  - **Fix**: la llamada dinámica queda **deshabilitada a propósito** mediante el flag `LEY_LINE_ENDPOINT_RETIRED = true` (línea 258 de `js/meta.js`). El panel usa el **waypoint estático** (`meta.chat`). **No se hardcodeó ninguna rotación local de mapas** — criterio de proyecto, ver README/ONBOARDING.
  - El código ya degradaba solo (`if (!r.ok) return cache || null`, y el render usa `inst._activeWaypoint || meta.chat`), así que **no había crash**: el fix evita emitir un request que nunca va a funcionar y documenta el hallazgo.
  - **Reversión**: poner `LEY_LINE_ENDPOINT_RETIRED` en `false`. La lógica queda intacta.
  - Sin validación del Code Reviewer (**13º timeout consecutivo**, bug de plataforma `session_id` mismatch). Cambio data-only, 1 archivo, sin CSS, no toca invariantes.
- **Nota de versión**: el bump se aplicó en el Heartbeat #32 (`js/meta.js` v3.4.0 → **v3.4.1** + `index.html` `?v=3.4.1`), porque un fix funcional que no bumpea la query string no llega al navegador por cache. La rama `fix/leyline-obsolete-events` nunca existió en el remoto: el fix entró directo a `agents/main` como `f533d67`.

- **fix(achievements): Legendary Tracker dropdown — opción "⚠ Legendarias" no aparecía (`b591210`)**:
  - **Bug doble de runtime** (no deploy, el JS v3.2.0 estaba en producción pero con lógica rota):
    - **Bug 1 — `discoverLegendaryCategory()` faltante en no-token path**: en el path de render sin key, `discoverLegendaryCategory()` no se llamaba antes de `fillCategoryDropdown()`, por lo que `state.legendaryCatId` permanecía vacío y la opción "⚠ Legendarias" nunca se agregaba al dropdown. Fix: insertada llamada `discoverLegendaryCategory()` entre `ensureCategories()` y `fillCategoryDropdown()` (línea 1045).
    - **Bug 2 — Guard `__filled` bloqueaba re-populación**: `fillCategoryDropdown()` tenía `if (!list || list.__filled) return;` + `list.__filled = true;`, lo que evitaba que el dropdown se rebuilde tras la primera renderización. Aunque `discoverLegendaryCategory()` seteaba `state.legendaryCatId` en llamadas posteriores, `fillCategoryDropdown()` retornaba early. Fix: removido el guard `__filled` (la función ya hace `list.innerHTML = html` rebuild completo).
  - **Verificado en browser**: opción "⚠ Legendarias" aparece con `data-value='114'` y estilo `color:var(--color-amber)`. Dropdown pasó de 361 → 362 opciones. `discoverLegendaryCategory()` encontró keyword match ('legendaria' en "Armas legendarias", ID 114) — funciona dinámicamente, no depende del fallback '148'.
  - **Cambio quirúrgico**: 2 líneas borradas, 1 agregada. No toca CSS ni arquitectura. Code Reviewer ✅ (task-fa0e4c29b938, commit original `94fb7a9`).

### Added
- **Homestead Tracker: decoraciones por categoría y glifos coleccionables (`41c79d8` + `ca673ac`; `js/homestead-tracker.js` v1.0.0, `js/api-gw2.js`, `js/router.js`)**:

  **⚠️ Esto SÍ cambia lo que Pablo ve.** Ruta propia **`#/account/homestead`**, alcanzada desde el side-nav, con su `<section id="homesteadTrackerPanel">` en `index.html`.

  **El módulo ya existía y estaba muerto.** `homestead-tracker.js` v1.0.0 (2026-09-29) estaba en el repo **byte a byte idéntico** a su rama de origen, pero `index.html` **no lo cargaba**. Medido: **0 matches de `getHomestead*` en `main`**, o sea que sus 5 dependencias no existían y el primer fetch habría muerto con `TypeError`.

  **Por qué NO se hizo merge de la rama** (que sí se llevaba el trabajo): la rama nació **53 commits atrás**, así que el "257 archivos, 88706 borrados" que circulaba es ruido, y un merge habría revertido el **sharding de la Idea 49**. Se extrajeron **a mano** los 3 bloques: `index.html` (+42), `js/api-gw2.js` (+123) y `js/router.js` (+44). **No se copió `api-gw2.js` entero** porque ese archivo había cambiado **1940 líneas** desde la base de la rama.

  **5 métodos nuevos en la capa API** — `getHomesteadDecorationDetails`, `getHomesteadDecorationCategories`, `getHomesteadGlyphs`, `getAccountHomesteadDecorations`, `getAccountHomesteadGlyphs` — más **2 TTL nuevos**: `TTL.HOMESTEAD` (5 min, lo que cambia seguido) y `TTL.HOMESTEAD_STATIC` (24 h, catálogo estático). Siguen el patrón `cache` / `inflightOnce` / `fetchWithRetry` del archivo.

  **`router.js`**: entrada en el mapa de vistas (`'#/account/homestead' : 'homestead'`), rama de `showPanel` con `homesteadTrackerPanel` agregado a la lista de paneles ocultables, call site de `activate()` y bloque de `gn:tokenchange`.

  **Un comentario que el wiring dejó viejo, corregido**: `MODULOS_CON_LATCH` excluía a `HomesteadTracker` y la razón escrita ("no tiene panel propio, nadie lo activa") **era cierta cuando se escribió y es falsa con el wiring**. Medido hoy: ambas cosas ya no son cero. Entra al latch, igual que `LegendaryTracker`.

  **Icono**: `assets/icons/Cuentas/homestead-icon.png` **no existe** en el repo (medido con `dir` sobre la carpeta). No fue un bloqueo: se resolvió con **SVG inline** en el panel y en el nav, que no depende de ningún archivo externo y por lo tanto no puede mostrar borde roto.

  **`ca673ac` — el esquema real de los glifos son STRINGS, no objetos.** `/v2/homestead/glyphs` devuelve un array de cadenas (`"herbalist_mining"`), **no** `{id, name, icon}`. El módulo tenía los mapas de presentación y los leía como objetos. Normalizado en `js/homestead-tracker.js` (+69/-23); los mapas quedan siendo **solo presentación**.

  **Verificado contra la API pública**: `/v2/homestead/glyphs` devuelve objetos con `id` string, `item_id` y `slot` — **sin** `name`, **sin** `icon` y **sin** `upgrade_item`. Eso confirma que los ids `21234`/`21244` de `CONFIG.GLYPH_UPGRADES` **son inventados**.

  **Persistencia**: prefijo `gn:homestead:` — `gn:homestead:decorations`, `gn:homestead:categories`, `gn:homestead:glyphs`, TTL 6 h. Ninguna clave nueva fuera de ese prefijo.

  **Invariantes respetadas**: Abort + last win en los fetches, `gn:tokenchange` como **único** canal de cambio de cuenta, y patrón idéntico a `activities.js` / `raid-tracker.js` / `strike-tracker.js`.

- **Armería Legendaria: catálogo de las 206 legendarias, con árbol de fabricación y materiales (`js/legendary-tracker.js` v1.1.0 + 11 módulos de soporte)**:
  - **Qué es**: un módulo propio con ruta **`#/account/legendary-armory`**, alcanzado desde el sidebar como "Armería Legendaria". Reemplaza el filtro "Legendarias" que vivía dentro de la pantalla de Logros (`achievements.js`).
  - **Dos pestañas** inyectadas dentro de `#legendaryArmoryPanel`: **Catálogo** (la grilla completa) y **Mi progreso** (la cola de crafteo). Botones `#legendaryModeCatalog` / `#legendaryModeProgress`.
  - **Filtros**: tipo (`weapon` / `armor` / `accessory` / `back`), generación (T3 / T4) y expansión, más el filtro de posesión **Tengo / Me faltan** sobre `owned[id] > 0`. El recorte "solo faltantes" **no** aplica al catálogo: ahí se ve el catálogo entero, así que el switch no cambiaría nada.
  - **Click en la carta** → `openItemModal(itemId)` y se abre el árbol de fabricación de esa legendaria. Encolar es un **botón aparte** dentro de la card (`.lt-card-queue-btn`, `+ Cola` / `✓ En la cola`): vive dentro a propósito y `wireItemCards` lo intercepta para que el click no abra el modal al mismo tiempo. `toggleQueue()` es la misma función para el botón y para un consumidor externo, y el tope de la cola es `QUEUE_MAX = 5`.
  - **Árbol de fabricación**: lo calcula `legendary-tree.js` (`build()`) bajando por los precursores hasta los ingredientes base; lo pinta `legendary-tree-ui.js` (`renderTreeHTML()`), que **no calcula cantidades** — las pide al motor con `build()`. El nivel más externo viene abierto por defecto (`NIVEL_ABIERTO_POR_DEFECTO`).
  - **Vista de materiales**: `computeMaterials()` devuelve por ingrediente `{need, have, missing}` y los totales `{need, have, missing}` más `allHave`. `have` se recorta con `Math.min(have, need)` y `missing` con `Math.max(0, need - have)`, así que nunca aparece un negativo, que en la columna se leería como un bug del juego. Los tres estados se pintan como **TENGO** (verde), **FALTA** parcial (ámbar) o **FALTA** (rojo).
  - **`js/legendary-precursors.js` (268 KB) es un archivo GENERADO** por `js/_build_legendary_precursors.py` desde `tools/cl_recipes.json` y **no se edita a mano**. Se carga **bajo demanda** (`ensurePrecursors()`), solo al abrir un árbol: por eso no está entre los `<script>` de `index.html`.
  - **Los otros dos datos grandes también son generados**: `legendary-data.js` (catálogo estático de 206) y `legendary-recipes.js` (contrato de fabricación de 206). Recuento real del contrato: `mystic_forge` 124, `crafting` 18, `none` 64; por estado de dato, `recipe` 142, `no_recipe` 63, `placeholder` 1.
  - **Render por registro, no por dependencia**: `legendary-tracker.js` no conoce a los archivos de render. `render-catologo.js` se registra con `registerRender({filterBar, catalogGrid, skeleton, progress})` y `registerItemModal(renderItemModal)`. El registro es **todo o nada**: si falta cualquiera de los 4 renderers se rechaza el registro entero y la lista de faltantes queda en `state._renderMissing`, visible desde `LegendaryTracker._debug()`.
  - **Orden de `<script>` obligatorio**: `legendary-tracker.js` tiene que cargarse **antes** que `render-catologo.js`, o el registro falla. `legendary-data.js` puede ir en cualquier posición (sus usos son en tiempo de render) e `item-icons.js` se busca en runtime, cuando ya se está pintando.
  - **Módulos de soporte**: `item-icons.js` resuelve icono y color de rareza desde la API con su propia caché (`items_cache_armory_v1`); `progress-eta.js` calcula la ETA de un progreso "N/total" (`GN.progressEta.computeEta()` / `fmtEta()`); `luck-curve.js` mantiene la curva de Suerte (Luck) account-wide; `commerce-delivery-theme.js` y `fractal-tracker-theme.js` son capa 3 (color semántico) y escriben **solo** `borderLeft`.
  - **Persistencia**: prefijo `gn:legendary:`. Ninguna clave nueva fuera de ese prefijo.

- **`getCommerceDelivery(token, opts)` — Commerce Delivery, la caja del Trading Post sin cobrar (`js/api-gw2.js` v2.16.0)**:
  - **Fricción real reportada por el PO**: un ítem que quedó en la caja del Trading Post hace semanas y la Bóveda lo muestra como **venta pasada**, sin ninguna señal de que el dinero nunca se cobró.
  - **Endpoint verificado en vivo** (2026-09-29), antes de escribir una línea:

    | Check | Resultado |
    |---|---|
    | `/v2/commerce/delivery` con token falso | **401** `Invalid access token` → **existe** |
    | `/v2/commerce/bogusendpoint123` (control) | **404** `not found` → así se ven los inexistentes |

  - Mismo patrón que `getCommerceTransactionsBuys`/`Sells`: cache con TTL de 60s, `inflightOnce`, inflight key prefijada por `fpToken(token)`. **Sin colisión de claves** (verificado con grep: `commerce_delivery` no existe en ninguna otra base-key).
  - **⚠️ Se desvía deliberadamente de sus sisters en el manejo de error** — decisión del Code Reviewer, no un descuido:
    - `buys`/`sells` degradan a `[]` porque `[]` es su estado **normal**.
    - En `delivery`, `[]` es indistinguible de «caja vacía» cuando en realidad puede ser «no se pudo leer». El caso que más probable lo dispara no es una caída transitoria sino un **403 permanente por falta de scope `tradingpost`**, que nunca se resuelve solo. Como el valor de la feature **es** el alerta, un vacío silencioso la deja mintiendo sobre su único propósito.
    - Por lo tanto el error **se propaga**. La UI debería distinguir tres estados: **pendiente / vacío real / no se pudo leer**.
  - **Estado: API sin consumidor todavía.** No hay UI. Se documenta explícitamente para que no se lea como deuda oculta (hallazgo transversal #10, código muerto). Cablear la vista es el paso siguiente.
  - **Validación del Code Reviewer**: `task-a0398e55c545` — *aprobado con cambios*, el primero en ManyToMany tras 14 fallas. Cache/inflight aprobados sin reservas; los 3 cambios pedidos (propagar el error, restaurar el BOM, declarar el ámbito) están aplicados.
  - Sin CSS, sin endpoints nuevos, sin tocar `router.js`, `gn:tokenchange` ni `WVSeasonStore`.

- **`meta.js` v3.4.0 → v3.4.1** (Heartbeat #33): el guard `LEY_LINE_ENDPOINT_RETIRED` (`f533d67`) ya estaba en `agents/main`, pero el query string de `index.html` seguía en `?v=3.4.0`. **El fix existía en el repo pero no en la app**: cualquier navegador con el archivo cacheado seguía ejecutando el código viejo y emitiendo el request a `/v2/events` que devuelve 503. Un fix funcional sin bump de query string no llega al usuario.


- **🎲 Columna "Suerte (MF)" en el Dashboard de Cartera (`js/luck-curve.js` v1.0.0 + `wallet-dashboard.js` v2.7.0, `44c64a9`)**:
  - **Idea del PO (2026-09-29), premisa verificada y corregida antes de implementar**:
    - La Luck **NO** aparece en `/v2/currencies` (verificado en vivo: 79 monedas, `id` máximo 83, 0 coincidencias con `luck`/`magic find`).
    - Endpoint real: **`/v2/account/luck`**, activo desde **2019-04-08**, scope `account`. Devuelve `[{"id":"luck","value":N}]` o `[]` si la cuenta nunca consumió esencia.
    - La mecánica de *magic find* account-wide es de **2013-09-03**, no de septiembre 2026. Lo nuevo en 2025/2026 en el juego es otro sistema (ítems account-bound con stat options, del ecosistema Path of Fire) y **no afecta estos datos**.
  - `js/luck-curve.js` (NUEVO, v1.0.0, IIFE → `window.LuckCurve`): tabla `CUMULATIVE` con los **300 umbrales oficiales** de GW2 Wiki + `fromLuck(value)` → `{value, mf, missing, nextLuck, capped, pct, maxed, overflow}`. Sin DOM, sin fetch, sin storage.
  - `js/api-gw2.js`: nueva `getAccountLuck(token, opts) -> Number` con `TTL.LUCK = 10 min`. Sigue el patrón de `getAccountWallet` (`getCache`/`putCache`/`inflightOnce`/`fetchWithRetry`). Devuelve el luck crudo; el MF% se calcula aparte con `LuckCurve`.
  - `js/wallet-dashboard.js` v2.6.0 → **v2.7.0**: nuevo campo de resumen opt-in `'luck'` (columna "Suerte (MF)"). Helpers `luckToProgress`/`fmtLuck`/`renderLuckCell`, fetch en `loadAccountSummary`. Celda con MF% + barra de progreso + tooltip "faltan X luck para el próximo +1%". KPI "Mejor MF base (N/M al tope)". La fila TOTAL muestra "N tope" porque el MF% **no** se puede sumar entre cuentas (curva independiente por cuenta).
  - `index.html`: `<script src="js/luck-curve.js?v=1.0.0">` + bump de cache-busting de `wallet-dashboard.js` a `?v=2.7.0`.
  - **Curva oficial**: 300 niveles, tope de **300% de MF base = 4.295.450 luck**. Además se siguen acumulando hasta **472.510** de exceso (ya sin otorgar MF). Fuente: https://wiki.guildwars2.com/wiki/Luck
  - **Validación**: tabla parseada del wikitext y verificada en consistencia cumulativa — **0 discrepancias** entre suma-de-requeridos y total-de-fila en los 300 niveles; tope calculado 4.295.450 coincide con la prosa de la wiki. Test funcional en Node contra el código real extraído del archivo (8 casos: 0, 99, 100, 1000000, 4295449, 4295450, 4500000, `[]` + 4 checks de curva) → TODO OK. `node --check` OK en los 3 JS antes y después del merge. Verificado en GitHub: `agents/main` (desarrollo, repo `gw2-wallet-agents`) @ `0cc5cb7` contiene `luck-curve.js`, `getAccountLuck` y el script tag. **NO está en producción**: `origin/main` (repo `gw2-wallet-ligero`) sigue en `392c3b9` sin estos archivos, verificado con `git cat-file -e origin/main:js/luck-curve.js` → no existe.
  - Sin CSS, sin DOM ajeno, sin localStorage nuevo, sin prefijo `gn:` nuevo. Producción (`gw2-wallet-ligero`) intacta.
  - Commits: `44c64a9` (feat), `6067851` (merge `feat-luck-kpi`), `0cc5cb7` (merge de `gw2-wallet-ligero/main` a `gw2-wallet-agents/main`)

- **Mejoras de UX en flujo de API Keys (9 propuestas del PO Pablo)**:
  - Propuesta 1: Loading state en botón "Guardar" (`.btn--loading` + spinner CSS)
  - Propuesta 2: Focus automático en `kfValue` tras éxito (con `select()`)
  - Propuesta 3: Validación local de formato `isValidKeyFormat()` (regex 20+ chars)
  - Propuesta 4: Feedback visual en campo (`.field--ok`/`.field--bad` + `.field-msg` hermano)
  - Propuesta 5: Diferenciar "Agregando" vs "Actualizando" (variable `idx` existente)
  - Propuesta 6: Timeout de validación 10s (AbortController + `clearTimeout` en `finally`)
  - Propuesta 7: Botón "Limpiar" con ícono (156107 + `btn--ghost`)
  - Propuesta 8: `parseKeyError()` con mensajes diferenciados (401/403/429/permisos/red)
  - Propuesta 9: Toast persistente de carga en `loadAllForToken()` (`ttl: 0`)
  - Commits: `86bbdf9`, `886ed6b`, `e142bf2`, `e359572`, `15c2573`

- **Centralización de localStorage (`js/storage.js` v1.0.1)**:
  - Único punto de acceso a `Storage.get/set/remove` en lugar de 27 claves dispersas
  - 38 reglas de prefijos viejos → nuevos (`gw2_keys` → `gn:account:keys`, etc.)
  - Modo `copy`: claves viejas preservadas, los módulos existentes no se tocan
  - Fallback map automático si un módulo nuevo busca clave nueva y no existe
  - Idempotente y seguro en múltiples pestañas
  - Commit: `c1fcf8d`

- **Tracker de componentes de legendarias en Logros (achievements.js v3.2.0, Proposición 1, PO prioridad #2, Code Reviewer ✅ aprobado)**:
  - Filtro "⚠ Legendarias" en el dropdown de categorías de logros (después de "Todas")
  - `discoverLegendaryCategory()` — descubre dinámicamente la categoría de armas legendarias desde `v2/achievements/categories` (lang=es) con keywords `['legendaria', 'legendary', 'arma legendaria', 'legend']`; fallback ID 148
  - `isLegendaryTrackerActive()` — retorna `true` cuando la categoría activa coincide con `legendaryCatId`
  - `cardLegendaryTrackerHTML(meta, r, pr)` — card view mejorada con ítems-componente (iconos, nombres, conteos), título en ámbar, barra de progreso
  - `renderKpi()` — KPI tile de "Componentes" con contador total (`countTotalComponents`)
  - `getLegendaryComponents(meta)` / `countTotalComponents(allRows)` — extrae ítems de recompensa (type=Item) usando `_rewardCache` + `loadRewardItemDetail` para nombres/iconos
  - `injectLegendaryStyles()` — CSS inyectado para `.a-card--legendary`, `.ach-legendary-components`, `.ach-legendary-badge` (sin `!important`, specificity vía `#inventoryDashboardPanel`)
  - `fillCategoryDropdown()` — opción "Legendarias" (⚠) agregada
  - `loadAll()` — llama `discoverLegendaryCategory()` después de `ensureCategories()`
  - APIs reutilizadas (no nuevas): `getAchievementsMeta`, `getItemsMany` (via `loadRewardItemDetail`)
  - Invariantes verificadas: único canal `gn:tokenchange`, router orquesta, CSS 3 capas (estilos inyectados dentro del módulo como patrón existente de achievements.js)
  - **Validado por Code Reviewer**: ✅ APROBADO (task-fa0e4c29b938)
  - Commit: `94fb7a9`

- **🔒 S1 Security: gist-sync.js reemplaza fixedSalt por Web Crypto API PBKDF2 + AES-GCM**:
  - **Bug original**: `encryptToken(token, password)` IGNORABA el parámetro `password` y usaba `fixedSalt = 'gw2-vault-sync-2026'` hardcoded. Cualquiera con acceso al código fuente podía descifrar cualquier token de GitHub almacenado en localStorage en milisegundos.
  - **Fix**: Migración de CryptoJS (CDN externa) → **Web Crypto API nativo** (built-in browser, cero dependencias externas).
  - **Cifrado**: AES-GCM (256-bit, authenticated encryption) con clave derivada vía PBKDF2 (200,000 iteraciones, SHA-256) a partir del password del usuario + salt aleatorio de 16 bytes **único por token**.
  - **Formato almacenado**: `"salt:iv:data"` (todo hex) — cada token tiene su propio salt, impidiendo rainbow table attacks.
  - **Token no se descifra en init():** El token permanece cifrado en localStorage. Se requiere `unlockToken(password)` bajo demanda (cuando el usuario necesita sincronizar).
  - **Backward compatibility**: Tokens en formato antiguo (CryptoJS/fixedSalt) son detectados y **inválidados** — el usuario debe reingresar su token + password. Mensaje de error claro.
  - **UI**: Agregado campo de password `#ghPasswordInput` y sección de desbloqueo `#gistUnlockSection` con botón `#gistUnlockBtn` en el modal de sincronización.
  - **Documentación**: `js/gist-sync.js` v1.1.0 — documentado el nuevo flujo de cifrado.
  - **Nota**: CryptoJS CDN sigue activo para `accounts-panel.js` (import/export de cuentas). No se eliminó.
  - **Code Reviewer**: Validación solicitada con timeout 60s — task timed out (bug de `session_id mismatch` conocido). Procedido con criterio técnico según AGENTS.md timeout rules.
  - Commit: `65f5f90`

- **Vista multicuenta en Wallet Dashboard (wallet-dashboard.js v2.6.0, Idea 2 PO prioridad #1)**:
  - Columnas summary: Personajes (char count), Logros AP (account AP), Raids (% encounters completed)
  - loadAccountSummary() per-cuenta: getCharacterCount() + getAccountInfo() + getAccountRaids() con cache + inflight dedup
  - KPIs resumen multicuenta: total chars/AP/raids con progress bars y borderLeft color semántico
  - Dropdown selector renderSummarySelector() para togglear campos: Storage.set('gn:wallet:dashboard:selected_summaries')
  - Sorting extendido: sortable-summary columns con toggle asc/desc
  - api-gw2.js: getCharacterCount(token) — fetch /v2/characters, count, cache TTL.ACCOUNT
  - CSS 3 capas: inline borderLeft 3px solid rgba() (theme color layer). Zero !important. No border/boxShadow/borderRadius/transition override.
  - No cambia gn:tokenchange event binding — extensi\u00f3n del refresh existente.
  - Code Reviewer: validation solicitada (task-0241c613a2e4, 90s). Timeout #7 (bug session_id). Validation manual: CSS 3 capas OK, no !important, no invariantes rotas, node --check OK.
  - Commit: `07e4c64`

### Changed
- **El esquema de la API NO está en la clave de caché, y queda escrito en el propio archivo (`531a5fe`; `js/api-gw2.js`)** — docblock de 26 líneas, **sin cambio de comportamiento**:

  `kMem(base, token)` y `kLS(base, token)` son `base + separador + fpToken(token)`. De los **18 sitios de lectura/escritura** contados por `tests/idea50e.cache-expiry-purge.test.js` sección 3, **solo 2** piden `?v=latest` (`/v2/account?v=latest` y `/v2/achievements?v=latest`); los otros **16** viajan sin él.

  O sea: **la clave no es un identificador estable del dato, es una etiqueta de dónde vino.** Si ArenaNet cambia un esquema, la app no lo va a notar — no hay ninguna pieza del sistema, ni código ni clave ni doc, que diga "esto se llenó con el esquema viejo".

  **HOY NO ES UN BUG**: la API no cambia desde 2025-08-29, y el único breaking change de ese día (`/v2/mounts/skins`: `mount` → `mount_guid`) **no toca la app** (0 usos de `mount_guid`). Es una **ventana SIN CALIBRAR**, no un escape: la ausencia de detección es indistinguible de que no haga falta, hasta que hace falta.

  **El escape existe y ya está medido**: `cacheClear()` (v2.29.0) borra de verdad, tiene `{dryRun: true}` y su registro cubre la allowlist completa.

  **Lo que NO se hizo, y por qué**: poner `?v=latest` en los 16 restantes sería **optar a todo cambio de la API para siempre**, que es el problema al revés. Y hoy no hay ni un cambio que lo exija. Que se decida el día que la API se mueva, con el caso delante.

- **Flujo asíncrono de documentación**: Implementación de un flujo de trabajo asíncrono entre el agente Documentador y el agente Principal, que permite la actualización de documentación de forma no bloqueante durante las sesiones de desarrollo.
- **Migración de estilos inline a CSS (Fase 1)**:
  - `theme-polish.css`: Nuevas clases `.wd-kpi-*` (4 KPIs de Wallet Dashboard) y `.id-kpi-*` (4 KPIs de Inventory Dashboard) con `border-left` semántico + `box-shadow` glow
  - `theme-polish.css`: Nuevas clases `.id-badge`, `.id-dd-item`, `.id-dd-opt`, `.id-grid`, `.id-skel` para dropdowns, grids y skeletons de Inventory Dashboard
  - `theme-polish.css`: Reglas `#inventoryDashboardPanel` con layout de grid, border-left, glow y controles de carga
  - `wallet-dashboard.js`: Eliminados estilos inline de dropdown, KPIs y tabla — ahora usan `.wd-*` + `.card`
  - `inventory-dashboard.js`: Eliminados estilos inline de badge, dropdown, KPIs, grid, skeleton y tablewrap — ahora usan `.id-*` + `.card`
  - Eliminados backups locales `.backup_kpi_css/` y `.backup_id_kpi_css/` (no subir basura al repo)
  - **Herramienta**: Skill `migrar-estilos-inline` creada y documentada en workspace del agente
- **Arquitectura CSS de 3 capas aplicada a dashboards**:
  - `main.css`: layout, grid, espaciados (sin bordes ni box-shadows)
  - `theme-polish.css`: bordes neutros, glow base, hover unificado, `.card`, `.wd-*`, `.id-*`
  - `*-theme.js`: solo `borderLeft` (en este caso, los colores semánticos viven en `theme-polish.css` como clases `.wd-kpi-*` / `.id-kpi-*`)

### Fixed
- **UX API Keys — 9 propuestas del análisis del PO (Pablo)**:
  - **Propuesta 1** (`86bbdf9`): **Loading state en botón "Guardar"** — spinner CSS `.btn--loading` + `disabled`. Restauración en `finally`.
  - **Propuesta 2** (`86bbdf9`): **Focus automático en `kfValue`** tras éxito, con `select()` para edición inmediata.
  - **Propuesta 3** (`86bbdf9`): **Validación local de formato** `isValidKeyFormat()` (mín. 20 caracteres alfanuméricos) antes de fetch. Evita peticiones innecesarias.
  - **Propuesta 4** (`886ed6b`): **Feedback visual en campo** — clases `.field--ok` / `.field--bad` en `theme-polish.css` + mensaje hermano `.field-msg` con `aria-live`. Sin `!important`, solo `border-color`.
  - **Propuesta 5** (`e142bf2`): **Diferenciar agregar/actualizar** — toast "Key guardada" (nueva) vs "Key actualizada" (existente). Usa `idx` existente, no cambia el return de `addOrUpdate`.
  - **Propuesta 6** (`e359572`): **Timeout 10s con AbortController** — `controller.abort()` tras 10s. Cadena signal: handler → `addOrUpdate({signal})` → `tokenInfo(t, signal)` → `json(url, signal)` → `fetch({signal})`. Catch detecta `AbortError` → mensaje específico. `clearTimeout` en `finally`.
  - **Propuesta 7** (`15c2573`): **Botón "Limpiar"** en el modal con ícono `156107.png` + clase `btn--ghost` + `title="Limpiar campos"`.
  - **Propuesta 8** (`15c2573`): **`parseKeyError()`** con mensajes diferenciados: 401 (inválida), 403 (prohibida), 429 (rate limit), permisos (account+wallet), red (fetch/conexión), timeout (AbortError).
  - **Propuesta 9** (`15c2573`): **Toast persistente de carga** en `loadAllForToken()` con `{ ttl: 0 }` — "Cargando wallet…" mientras se obtienen datos.
  - **Docs**: Análisis UX (fricciones F1-F8) agregado a `BACKLOG.md` (`ddc6d8c`).
- **inventory-dashboard.js v1.0.0 + theme-polish.css v2.2.0 — Fixes de glow, overflow y timers (PO prioridad #1, commit `95b4136`)**:
  - **Bug `clearTimeout`** (`loadActiveCharacterInventory`): los timers `t1` (4s) y `t2` (15s) no se limpiaban en los bloques `catch` si `fetch()` fallaba — quedaban colgantes hasta que se disparaban. Movido a bloques `finally` anidados, garantizando limpieza en todos los paths (éxito, excepción, early return). Mismo patrón que Propuesta 6 (`e359572`).
  - **Removido `!important`** (`theme-polish.css` línea 1352): `.total-row` usaba `background: var(--bg-1) !important`. Selector cambiado a `tbody tr.total-row` — specificity `(2,1,2)` empatado con `tr:nth-child(even)` `(2,1,2)`, gana por source order (declarado después en el archivo). Cumple con la regla "Nunca usar `!important` en estilos de tema" del AGENTS.md.
  - **Clase `.id-cell-updated` agregada** (`theme-polish.css`): la clase que agregaba `startDeltaBlink()` no existía en CSS (no producía glow). Regla nueva con `box-shadow: 0 0 8px rgba(255,211,107,0.5)` + `border-radius: 4px` + `transition`, sin `!important`, matchgeando el patrón existente `.kpi--warn` (línea 276).
  - **Cleanup zombie en `startDeltaBlink()`** (`inventory-dashboard.js`): al final del ciclo de blink (blinks > 6) ahora restaura `cell.style.color = ''`, `cell.style.fontWeight = ''`, `cell.style.transition = ''` y `cell.classList.remove('id-cell-updated')`. Antes dejaba estilos inline zombie y la clase sin remover.
  - **Validado por Code Reviewer**: ✅ APROBADO (verificado contra código real, invariantes y arquitectura CSS).
  - **Commits**: `95b4136` (fixes) + `3ca1cd1` (TEAM_STATUS.md)

- **storage.js v1.0.1 — Bug crítico de fallback (fix post-release)**:
  - `Storage.get()` y `Storage.getRaw()` referenciaban `oldKey` (variable no declarada) en vez de `FALLBACK_MAP[key]`. En modo no-strict, `oldKey` es `undefined`, por lo que el fallback a claves legacy (`gw2_keys`, `walletCompact`, etc.) NUNCA funcionaba. Sin este fix, usuarios con datos pre-v1.0.1 (ej: imports de gist-sync) pierden acceso a sus keys si la migración `Storage.migrate()` no corrió.
  - **Root cause**: scoping bug — `var oldKey` faltaba en `get()` y `getRaw()` (pero existía correctamente en `has()`).
  - **Fix**: Agregada `var oldKey = FALLBACK_MAP[key];` en ambas funciones (4 líneas, patrón idéntico a `has()`).
  - **Fix secundario**: `Storage.init()` no se ejecutaba en carga fría (readyState='loading'). Agregado `DOMContentLoaded` fallback.
  - **Validación**: `node --check` ✅.
  - **Code Reviewer**: solicitada validación (timeout por bug de `session_id mismatch`, procedido con criterio técnico).
  - Commit: `5d550b8`

- **settings-manager.js — Migración completa a Storage API (Fase 2 de storage.js)**:
  - 14 llamadas `localStorage.getItem/setItem` migradas → `Storage.get/set` + `Storage.STORAGE_KEYS`.
  - 6 bucles `for (var i < localStorage.length)` reemplazados por `Storage.list('gn:...')`.
  - Claves migradas: `gw2_keys`, `gw2_selected_key_v1`, `wv:season:index`, `walletPins:*`, `walletSnapshot:*`, `walletCompact`, `gn_activities_toggles`, `gn_home_nodes_marked`, `characters:assignments:*`, `characters:location_history:*`, `gn_meta_hecho_hoy:*`, `gn_meta_favs:*`, `gn_welcome_seen`.
  - Zero referencias a `localStorage` restantes (verificado con grep).
  - Sintaxis validada con `node --check`.
  - Commit: `5d550b8`

### Build
- **Idea 49 Tramo A**: `index.html` pasa a `js/api-gw2.js?v=2.20.0` (`4e5296b`). Sin este bump el fix existiría en el repo y no en la app: un navegador con el archivo cacheado seguiría ejecutando la v2.19.0 con el `QuotaExceededError` tragado. El bump de `activities.js` a `?v=3.20.3` va dentro de `d7cbe0d`. Mismo modo de falla que ya se registró con `meta.js` en el HB#33.
- **Idea 50 Tramo F**: `index.html` pasa a `js/api-gw2.js?v=2.29.0` (línea 940, dentro de `c04496e`). Sin el bump el fix existiría en el repo y no en la app: un navegador con el archivo cacheado seguiría ejecutando la v2.28.0, en la que `cacheClear()` solo limpiaba la sesión. Mismo modo de falla que las dos entradas siguientes y que la de `meta.js` v3.4.0 en el HB#33.
- **Idea 50 P3**: `index.html` pasa a `js/api-gw2.js?v=2.30.0` (línea 940) y `js/wizards-vault.js?v=1.3.1` (línea 942). Sin estos bumps el registro de bases existiría en el repo y no en la app: un navegador con los archivos cacheados seguiría con la v2.29.0, sin registro de bases, y el botón borraría solo las 18 de la capa. Mismo modo de falla que las dos entradas anteriores.
- **v6.6.2-agents**: chore(build) cache-busting `?v` refs aligned to file headers (main.css 2.7.0, theme-polish 2.2.0, activities.js 3.19.6, gist-sync.js 1.1.0). `wv-purchase-detail.js` 1.13.1 untouched (coincidía). Commits: `794bafa`, `33fdcd9`.

---

## [6.7.1] - 2026-06-XX

### Changed
- **theme-selector.js v1.1.0**: Modal rediseñado con filas horizontales
  - Cada fila muestra los colores reales del tema (fondo, borde, acento)
  - Mood del tema visible como subtítulo
  - Badge "✓ Activo" con fondo del color accent
  - Hover con desplazamiento horizontal
- **theme-polish.css**: Nuevas reglas `.theme-card` para filas

---

## [6.7.0] - 2026-06-XX

### Added
- **Selector de Temas (theme-selector.js v1.0.0)**:
  - Modal de selección con 18 temas + modo aleatorio
  - Persistencia en localStorage (`gn_theme`)
  - Botón en el header (`an-util-left`, después de Home)
  - Cada tema en archivo separado `css/themes/*.css`
  - Temas: Bóveda, Catppuccin, Cyberpunk, Discord, Dracula, Everforest, Fluent, Glassmorphism, Gruvbox, macOS, Material Dark, Nord, Notion, One Dark, PS5, Solarized Dark, Steam, Tokyo Night
- **18 archivos de tema** en `css/themes/`

### Changed
- **main.css v2.7.0**: Todos los colores hex → variables CSS
- **theme-polish.css v2.2.0**: Todos los colores hex → variables CSS
- **24 archivos JS**: Colores hex hardcodeados → variables CSS
- **index.html**: Bloque `<style>` consolidado con variables + `<link>` a boveda.css + `<script>` theme-selector

### Fixed
- Typo `bobeda.css` → `boveda.css`
- Llave extra `}` en CSS inyectado de wv-purchase-detail.js
- Llamada faltante a `injectStyles()` en wv-tabs-skin.js

---

## [6.6.2] - 2026-06-03

### Added
- **Strike Tracker — Seguimiento de Strike Missions (strike-tracker.js v1.0.0)**:
  - Nuevo módulo que muestra el progreso semanal de Strike Missions (encuentros de incursión)
  - 15 strikes organizadas por expansión: Core (1), Icebrood Saga (7), EoD (4), SotO (2), VoE (1)
  - Marcado automático vía API `/v2/account/raids` (mismo endpoint que raids)
  - KPIs semanales: Strikes completadas, LI farmeables (15), porcentaje de progreso
  - Grid de 3 columnas optimizado para distribuir el contenido sin huecos vacíos:
    - Columna 1: Juego base + End of Dragons
    - Columna 2: Sangre y Hielo (Icebrood Saga)
    - Columna 3: Secrets of the Obscure + Visions of Eternity
  - Modal informativo por strike con: Descripción (5+ bullets), Estrategia (5+ bullets), Enlace a video tutorial
  - Diferenciación visual entre Modo NORMAL (📋), DESAFÍO (⚔️) y LEGENDARIO (🏆)
  - Reset semanal automático (lunes 07:30 UTC, misma lógica que raids)
  - Navegación integrada con Raid Tracker mediante botones "Raids" y "Strikes" en el header
  - Badge de LI disponibles sincronizado automáticamente con Raid Tracker
  - Escucha `gn:tokenchange` para recargar datos automáticamente
- **Nueva ruta `#/account/strikes`** en router.js v2.17.0
- **Nuevo panel `#strikeTrackerPanel`** en index.html
- **Nuevo evento Analytics**: `view_module` con `module_name: 'strikes'`
- **Navegación unificada**: Botones Raids/Strikes en el header de ambos módulos con persistencia en localStorage (`raid_strike_view`)

### Changed
- **raid-tracker.js v1.7.0 → v1.8.0**:
  - Header rediseñado con título, badge LI a la derecha, botones Raids/Strikes y timer en la misma fila
  - Eliminado título duplicado del panel (ahora se usa el de index.html)
  - Agregada función `wireViewToggle()` para navegación entre módulos
- **router.js v2.16.0 → v2.17.0**:
  - Agregada ruta `#/account/strikes`
  - Agregado `strikeTrackerPanel` a `showPanel()`
  - Agregado caso en `onKeySelectChange()` para recargar al cambiar de key
  - Agregado `updateSidebarFor('strikes')`
- **index.html**:
  - Eliminado título duplicado del panel Raid Tracker (ahora se usa el panel__title del HTML)
  - Agregado panel `#strikeTrackerPanel` con título y badge LI incorporado
  - Agregado script `js/strike-tracker.js` después de `raid-tracker.js`
  - Badge LI movido al título del panel (margen derecho de la misma fila)
- **Documentación**: ONBOARDING.md, README.md, CHANGELOG.md actualizados a v6.6.2

### Fixed
- **Raid Tracker**: Eliminado badge LI duplicado que quedaba en el cuerpo del panel
- **Strike Tracker**: Badge LI ahora se actualiza correctamente desde Raid Tracker

### Removed
- **Título duplicado en raid-tracker.js**: El título "Seguimiento de incursiones" que creaba el módulo fue eliminado (ahora se usa el del HTML)

---

## [6.6.1] - 2026-06-02

### Changed
- **Meta & Eventos — Rediseño de cards (meta.js v3.4.0)**:
  - Cards rediseñadas con estructura unificada estilo Raids
  - Barra de progreso dentro del header (como en Raids)
  - Íconos de expansión con assets locales 42x42 (sin contenedor ni glow)
  - Horarios convertidos a hora local con colores semánticos por ventana
  - Estado "Completado/Pendiente" con íconos locales (156108/156107)
  - Íconos de acción 32x32 (Waypoint, Mapa, Compartir, Wiki)
  - Wiki redirige a español (`wiki-es.guildwars2.com`)
  - Preview de infusiones con hover restaurado
  - Eliminada caché duplicada de flags (~90 líneas menos)
  - `_debug()` expuesto: `window._metaFlags`, `window._metaSeed`
- **Nuevos assets**: `assets/icons/expansions/` — 10 íconos locales (core.png, HoT.png, PoF.png, EoD.webp, SoTO.webp, JW.webp, VoE.webp, ls2.png, ls4.png, IS LS5.png)

### Fixed
- **Modal de API Keys**: no se bloquea si hay keys sin acceso al juego (try/catch en `boot()`)

---

## [6.6.0] - 2026-05-30

### Added
- **Dashboard de Inventario Multi-Cuenta (inventory-dashboard.js v1.0.0)**:
  - Tabla comparativa de ítems (banco + materiales + personaje activo) para todas las cuentas
  - 3 sets predefinidos: Alto Valor, Materiales de artesanía, Símbolos y demás
  - Sistema de Tiers para "Materiales de artesanía": T6/T5/T4/T3 (32 ítems) con checkboxes para activar/desactivar
  - Orden canónico: Colmillos → Escamas → Garras → Huesos → Sangre → Veneno → Tótem → Polvo
  - Carga en 2 fases: Fase 1 rápida (banco + materiales), Fase 2 background (personaje activo con `Promise.allSettled`)
  - Indicador visual de carga con glow pulsante `charPulse` (#7bc2ff)
  - Flash ámbar en celdas con delta positivo del personaje: 3 parpadeos + fijo hasta hover
  - Badge de valor total en oro con precios del Trading Post
  - Filtros: ocultar cuentas vacías, ocultar columnas vacías, ocultar cuentas main
  - Método `_debug()` con diagnóstico completo del módulo
- **Nuevo archivo**: `js/inventory-dashboard.js` v1.0.0
- **Nuevo archivo actualizado**: `assets/data/inventory-sets.json` v2 (3 sets + sistema de tiers)
- **Método `_debug()` en Raid Tracker (raid-tracker.js v1.7.0)**:
  - Expone: version, inited, active, token, completedEncounters, liAvailable, loading, error, dom, timers, encounters, refresh

### Changed
- **Skeleton loader ampliado en WV Shop**:
  - Cards: 8 → 24 (en `router.js` y `wv-shop-ui.js`)
  - Tabla: 8 → 30 filas
- **router.js v2.16.0 → v2.17.0**:
  - Fix: F5 en Tienda WV redirigía a Diarias (causa: `hideObjectivesDashboard()` en `route()`)
  - Reemplazada llamada a `hideObjectivesDashboard()` por código inline que solo oculta el panel sin tocar `setActiveTab`
- **Documentación**: ONBOARDING.md, CHANGELOG.md actualizados a v6.6.0

### Fixed
- **F5 en Tienda WV**: al recargar estando en Tienda, ahora mantiene la tab de Tienda (antes saltaba a Diarias)
- **IDs corregidas en inventory-sets.json**: Hueso grande (24341), Hueso pesado (24345), Hueso (24344)

---

## [6.5.1] - 2026-05-21

### Added
- **WV Objectives Dashboard — Dashboard de Objetivos Multi-Cuenta (wv-objectives-dashboard.js v1.0.0)**:
  - Tabla comparativa de objetivos semanales: filas = cuentas, columnas = objetivos, celdas = estado
  - KPIs con íconos GW2, descripciones y totales (X / Y): Cuentas, Reclamados, Completados, Progreso
  - Mini barra de progreso en el KPI de Progreso con gradiente azul
  - Countdown semanal al reset (lunes 07:30 UTC), mismo formato que Actividades/Meta
  - Carga paralela MAX=3 desde `GW2Api.getWVWeekly()` por cuenta
  - Skeleton loader durante la carga de datos
  - Fila de resumen TOTAL con contadores de reclamados/completados por columna
  - Scroll horizontal para muchas columnas de objetivos
  - Zebra striping + hover en tabla con estilos unificados
  - Iconos de cuenta idénticos a `wallet-dashboard.js` (`ACCOUNT_TYPE_ICONS` + `DECORATIVE_ICONS`)
  - Ruta: `#/account/wizards-vault/objectives-dashboard`
  - Panel integrado dentro de `wvPanel` (mismo patrón que Purchase Detail)
- **Botones de navegación en el `<nav class="tabs">` de WV**:
  - Dashboard (visible solo en Diarias/Semanales/Especiales)
  - Compras / Purchase Detail (visible solo en Tienda)
  - Refrescar y Volver (visibles solo cuando el dashboard está abierto)
  - Visibilidad alternada automáticamente según la tab activa
- **Nuevo evento Analytics**: `view_module` con `module_name: 'wv_objectives_dashboard'`

### Changed
- **router.js v2.16.0 → v2.17.0**:
  - Nuevas funciones: `showObjectivesDashboard()`, `hideObjectivesDashboard()` expuestas en API pública de WV
  - Ruta `#/account/wizards-vault/objectives-dashboard`
  - `setActiveTab` alterna visibilidad de botones Dashboard/Compras
  - `showObjectivesDashboard` inicializa WV si es necesario (soporta F5 en el dashboard)
  - `onTabClick` cierra el dashboard al clickear cualquier tab de objetivos
  - `hideBothNavButtons()` oculta Dashboard y Compras al abrir Purchase Detail
- **wv-shop-ui.js v1.0.2**:
  - Eliminado botón `#wvPDOpenBtn` del toolbar de tienda (movido al nav de tabs)
  - Eliminado event listener asociado
- **index.html**:
  - Panel `wvObjectivesDashboardPanel` dentro de `wvPanel` (en `tabs-content`)
  - Botones en `<nav class="tabs">`: Dashboard, Compras, Refrescar, Volver
  - CSS para display/hidden de botones (`#wvTabBtnObjDashboard`, `#wvTabBtnPurchaseDetail`, etc.)
- **theme-polish.css**:
  - Estilos `#wvTabBtnObjDashboard[hidden]`, `#wvTabBtnPurchaseDetail[hidden]`, `#wvTabBtnRefreshDashboard[hidden]`, `#wvTabBtnBackToWV[hidden]` con `display: none !important`
- **Documentación**: ONBOARDING.md, README.md, CHANGELOG.md actualizados a v6.5.1

### Removed
- **Botón `#wvPDOpenBtn` del toolbar de tienda**: eliminado del HTML generado por `wv-shop-ui.js` y `router.js`
- **Funciones deprecadas en `router.js`**: `_pdDeprecated_ensureToolbarButton()`, `observeToolbar()`, `accessIconHTML()` — código muerto eliminado

### Fixed
- **F5 en el dashboard**: los botones de navegación ahora funcionan correctamente tras recargar la página en el dashboard
- **Botón Dashboard siempre visible**: corregido con CSS `display: inline-flex !important` + `[hidden] { display: none !important }`
- **Countdown semanal**: se inicia correctamente después de renderizar el DOM del dashboard

---

## [6.5.0] - 2026-05-04

### Added
- **Conversor Gem ↔ Gold — Migración a Modal (converter-modal.js v1.0.0)**:
  - Extraído de `app.js` como módulo independiente con 4 tabs
  - **Tab Cambio**: Conversor completo con índice de conveniencia (igual que antes, ahora en modal)
  - **Tab Transacciones**: Órdenes activas de compra/venta del jugador en el TP con KPIs de totales (compras, ventas, balance)
  - **Tab Populares**: Ítems con mayor volumen de transacciones en el TP, filtro por rareza y ordenamiento especial para legendarias
  - **Tab Historial**: Placeholder para tendencia de gemas (Fase 3)
  - KPIs con glow semántico: Total en compras (rojo), Total en ventas (verde), Balance (verde/rojo)
  - Formato de monedas unificado `3 g 17 s 88 c` en todas las tabs
  - Embellecimiento visual: título con glow dorado, labels con glow de color, outputs con fondo, botones con íconos, estado verde
- **Nuevas funciones en api-gw2.js v2.15.0**:
  - `getCommerceListings(opts)` — Endpoint: `/v2/commerce/listings`. TTL: 5 min
  - `getCommercePrices(ids, opts)` — Endpoint: `/v2/commerce/prices`. TTL: 2 min
  - `getCommerceTransactionsBuys(token, opts)` — Endpoint: `/v2/commerce/transactions/current/buys`. TTL: 1 min
  - `getCommerceTransactionsSells(token, opts)` — Endpoint: `/v2/commerce/transactions/current/sells`. TTL: 1 min
- **Nuevo archivo**: `js/converter-modal.js` v1.0.0
- **Glow neutro en íconos de divisas sin color (wallet-theme.js v1.3.1)**:
  - Las divisas que no matchean con ningún color reciben glow blanco sutil (`rgba(255,255,255,0.12)`)

### Changed
- **api-gw2.js v2.13.0 → v2.15.0**:
  - Agregadas funciones `getCommerceListings`, `getCommercePrices`, `getCommerceTransactionsBuys`, `getCommerceTransactionsSells`
  - Agregado cap de 500 entradas en `items_cache_v1:es` (elimina las 100 más viejas al superar el límite)
- **app.js v2.6.3 → v2.7.0**:
  - Extraídas ~246 líneas del conversor a `converter-modal.js`
  - Agregado wire del botón `walletConverterBtn` para abrir el modal
  - Eliminadas referencias a `#asideConvSection` y variables del conversor
- **router.js v2.15.0 → v2.16.0**:
  - Eliminada referencia a `asideConvSection` en `updateSidebarFor`
  - Sidebar liberada (~80 líneas menos en index.html)
- **index.html**:
  - Eliminado `#asideConvSection` de la sidebar
  - Agregado botón `[💎 Conversor]` en toolbar de Wallet (antes de Dashboard)
  - Agregado script `converter-modal.js` en el bloque defer
- **wallet-theme.js v1.3.0 → v1.3.1**:
  - Glow en ícono aplicado también a divisas sin color (glow neutro)
- **Documentación**: ONBOARDING.md, README.md, CHANGELOG.md actualizados a v6.5.0

### Removed
- `assets/data/gemstore-items.json` — Datos estáticos de Gem Store (reemplazado por datos reales de API en tabs Populares y Transacciones)

---

## [6.4.0] - 2026-05-04

### Added
- **Inventory Hub — Buscador de Objetos en toda la Cuenta (inventory-hub.js v1.3.1)**:
  - Nuevo módulo que reemplaza a Personajes como pantalla principal de `#/account/characters`
  - KPIs rápidos: Materiales, Banco, Legendarios, Personajes, y acceso a "Ver Personajes"
  - Buscador unificado que busca en Materiales, Banco y Armería simultáneamente
  - Filtros por rareza (dropdown + chips clickeables) y búsqueda por texto
  - Resultados agrupados por ubicación + rareza con mini-cards en una fila horizontal
  - Ítems en grid de 5 columnas con `border-left` del color de rareza
  - Vistas de sección independientes con navegación Hub ↔ Sección:
    - **Materiales:** 10 categorías como en el juego (básicos, intermedios, avanzados, ascendidos, gemas y joyas, cocina, ingredientes, recetas, festivos, otros)
    - **Banco:** Grid de 10×3 slots con paginación cada 30, íconos al 80% de la celda, resaltado de búsqueda
    - **Armería:** Grid de 5 columnas por tipo (armas, armaduras, espaldares, abalorios/baratijas, otros)
  - Modal de ítem con stats reales de API:
    - Nombre, ícono, descripción, rareza, tipo, nivel requerido
    - Daño (armas): min_power - max_power (tipo de daño)
    - Defensa + peso (armaduras)
    - Atributos (Potencia, Precisión, Dureza, Vitalidad, Daño de condición, Curación, Ferocidad, Concentración, Pericia, Resistencia a la agonía)
    - Stats disponibles, ranuras de infusión con flags
    - Bonificaciones (runas) con niveles, sufijo
    - Valor NPC en formato oro-plata-cobre
    - Flags (Ligado a cuenta, Se liga al usar, Único, etc.)
    - Botón para copiar código de chat
    - Enlace a Wiki en español (`wiki-es.guildwars2.com`)
  - Búsqueda inteligente: barra vacía = 5 ítems de mayor rareza; con texto = coincidencia parcial hasta 25 resultados
  - Sin localStorage adicional — solo caché en memoria con TTL de 2-5 minutos
- **Nuevas funciones en api-gw2.js v2.13.0**:
  - `getAccountBank(token, opts)` — Endpoint: `/v2/account/bank`. TTL: 2 min
  - `getAccountMaterials(token, opts)` — Endpoint: `/v2/account/materials`. TTL: 2 min
  - `getAccountLegendaryArmory(token, opts)` — Endpoint: `/v2/account/legendaryarmory`. TTL: 5 min
- **Nuevo archivo**: `js/inventory-hub.js` v1.3.1
- **Nuevos assets**:
  - `assets/icons/Welcome/358409.png` — Ícono del módulo (sidebar y título)
  - `assets/icons/Welcome/3124974.png` — Ícono de búsqueda
  - `assets/icons/Cuentas/156670.png` — Ícono de banco
  - `assets/icons/Cuentas/255373.png` — Ícono de materiales
  - `assets/icons/Cuentas/157085.png` — Ícono de legendarios

### Changed
- **router.js v2.15.0**:
  - Ruta `#/account/characters` ahora apunta a `InventoryHub.activate()` como pantalla principal
  - `Characters.activate()` se llama desde el Hub como subvista
  - Panel `inventoryPanel` agregado a `showPanel()`
  - Mapeo de navegación: `'#/account/characters':'inventory'`
  - `updateSidebarFor('inventory')` sin panel específico
  - Evento Analytics: `view_module` con `module_name: 'inventory'`
- **characters.js v2.3.0**:
  - Nuevo método `getCharacterList()` que expone la lista de personajes al InventoryHub
  - Nueva función `renderBackToInventoryButton()` con botón "← Volver al Inventario" en el título del panel
  - Funciona como subvista del InventoryHub
- **api-gw2.js v2.12.0 → v2.13.0**:
  - Agregadas funciones `getAccountBank`, `getAccountMaterials`, `getAccountLegendaryArmory`
  - Agregados TTL.BANK, TTL.MATERIALS, TTL.ARMORY
- **index.html**:
  - Nuevo panel `<section id="inventoryPanel">`
  - Sidebar: ícono cambiado a `assets/icons/Welcome/358409.png`, texto "Inventario y Personajes"
  - Script `js/inventory-hub.js` cargado antes de `characters.js`
- **Documentación**: ONBOARDING.md actualizado a v6.4.0, README.md actualizado a v6.4.0, CHANGELOG.md actualizado
- **Receta visual unificada**: `inventory-hub.js` implementa cards de ítems con `border-left` por rareza (Legendary #974EFF, Ascended #FB3E8D, etc.)

### Fixed
- **KPIs en columna al volver de una sección**: `renderHubKPIs()` ahora fuerza `display:grid` con `grid-template-columns` en el contenedor
- **Banco**: Íconos con `width:80%; height:80%; object-fit:contain` para ocupar el 80% de la celda manteniendo la plantilla 10×3

---

## [6.3.1] - 2026-05-02

### Refactor
- **Arquitectura CSS en 3 capas estrictas**:
  - `main.css` → Layout, fondos, tipografía, espaciados. **Sin bordes ni box-shadows.**
  - `theme-polish.css` → Piel unificada: bordes neutros `rgba(255,255,255,0.08)`, glow base `rgba(90,110,154,0.12)`, hover unificado `translateY(-3px)` con `--elev-hover`, badges, pills, tablas.
  - `*-theme.js` → **Solo `border-left: 3px solid rgba(<color>, 0.5)`** vía `card.style.borderLeft`. El resto de bordes y sombras lo hereda de `.card` en `theme-polish.css`.
- **Regla de oro:** Ningún `*-theme.js` puede sobrescribir `border`, `boxShadow`, `borderRadius` ni `transition`. Solo `borderLeft` + `classList.add('card')`.

### Changed
- **Meta & Eventos — Rediseño completo (meta.js v3.3.0)**:
  - Ícono de expansión con glow del color (`box-shadow: 0 0 0 2px <color>, 0 0 10px <color>`)
  - Chips de timing con color semántico: verde (activo), ámbar (próximo), azul (más tarde), neutro (info)
  - Tag de infusión celestial: fondo frío `#1a1e28`, texto `#c8dfff`, glow `rgba(150,190,255,0.4)` — reemplaza al tag ámbar genérico
  - Estructura HTML unificada: `meta-card__top` con ícono + título + timing debajo, igual que `wallet-card__top`
  - Nuevas funciones: `expIconHTML(meta)`, `chipsForTiming(inst, minsRemaining)`, `footerDropHTML(meta, item)`
  - Nuevos estilos en `theme-polish.css`: `.meta-card__iconWrap`, `.meta-card__icon`, `.meta-card__timing`, `.meta-chip--active/soon/later/neutral`
  - Nuevo estilo en `main.css`: `.m-tag--infusion` con gradiente y glow celestial
- **WV Tienda — Rediseño (wv-shop-ui.js v1.0.2)**:
  - Glow solo en el ícono de rareza (`iconDeco`), eliminado de la card
  - `cardDeco` eliminado (glow/borde inline en la card)
  - `setTimeout` post-render para forzar `wv-theme.js` a aplicar `borderLeft` + `class="card"`
  - Fix: `borderLeft` ahora se aplica correctamente buscando el color en `wv-card__name`
- **Cartera — Glow en íconos de divisa (wallet-theme.js v1.3.0)**:
  - `applyCurrencyTheme()` agrega glow al ícono: `box-shadow: 0 0 0 2px <color>, 0 0 10px <color>`
  - Colores por divisa: Gems `#4BBDF0`, Coins `#F4C542`, Karma `#AF63DF`, Laurels `#2BC14E`, Trade Contracts `#28C3BB`, Elegy Mosaic `#E2AE43`
- **Actividades — Glow en íconos de Ecto (activities.js v3.19.6)**:
  - Contenedor de ícono 44×44px con glow del color de estado: verde si está hecho, ámbar si pendiente
  - Ícono de 32×32px con `object-fit: contain`
- **Panel de Cuentas — Rediseño "Profile Card" Premium (accounts-panel.js v2.0.0)**:
  - Ícono decorativo aleatorio (cat tag) con glow del color del tipo de cuenta — reemplaza al ícono de tipo anterior
  - Tags mostrados como iconitos 18px en fila con tooltip (sin texto) debajo de nombre y email
  - Expansiones colapsables con toggle chevron (`528716.png` / `528717.png`) + barra de progreso
  - Twitch/GeForce siempre visibles con íconos de estado (`156108.png` ✅ / `156107.png` ❌)
  - Credenciales en grid 2 columnas (email, contraseña, Gmail, Twitch, GeForce)
  - Separadores con gradiente horizontal del color del tipo de cuenta
  - Footer con botones "Copiar Email" y "Copiar API Key"
  - Vista compacta (toggle): reduce cada tarjeta a 4 líneas
  - Vista tabla rediseñada: zebra striping, hover, `border-left` por tipo, encabezados con `text-transform: uppercase`
  - Fix: wire de `[data-toggle-section]` para expansiones colapsables
  - Fix: rutas de íconos chevron corregidas a `assets/icons/Cuentas/528716.png` y `528717.png`
- **Dashboard de Cartera Multi-Cuenta — KPIs con Glow + Tabla Unificada**:
  - KPIs con `border-left` semántico + glow: Oro `rgba(244,197,66,0.5)`, Karma `rgba(175,99,223,0.5)`, Laurel `rgba(43,193,78,0.5)`, AA `rgba(123,194,255,0.5)`
  - Tabla con zebra striping, hover, sticky header con `border-bottom: 2px solid #2a2c35`
- **Conversor Gem ↔ Gold — Rediseño Visual**:
  - Quick-chips (100, 400, 800, 1200 / 10g, 100g, 250g) ahora usan clase `conv2-chip` (estilo badge/pill)
  - Las dos secciones (Gemas y Oro) envueltas en `conv2-card` con borde sutil y sombra
  - Estado "Actualizado." ahora es un `<span class="conv2-state">` con estilo pill
- **Purchase Detail — Fix de ícono (wv-purchase-detail.js v1.13.1)**:
  - Emoji 🕐 reemplazado por ícono local `assets/icons/523381.png`

### Fixed
- **5 archivos de tema corregidos** (solo `borderLeft`, sin pisar bordes ni sombras):
  - `meta-theme.js` v1.4.1 → **v1.4.2**: Eliminado `card.style.border` y `card.style.boxShadow`. Solo `borderLeft`.
  - `achievements-theme.js` v1.1.0 → **v1.1.1**: Eliminado `card.style.border` y `card.style.boxShadow`. Agregado `card.classList.add('card')`. Solo `borderLeft`.
  - `characters-theme.js` v1.0.0 → **v1.0.1**: Eliminados `card.style.border`, `boxShadow`, `borderRadius`, `transition`. Eliminados event listeners manuales de hover. Solo `borderLeft`.
  - `wv-theme.js` v1.0.0 → **v1.0.1**: Eliminado `card.style.borderTop/Right/Bottom` y `boxShadow`. Expone `window.WVTheme` para forzar aplicación post-render. Solo `borderLeft`.
  - `wallet-theme.js` v1.2.0 → **v1.3.0**: Ya aplicaba solo `borderLeft`. Agregado glow en ícono de divisa.
- **Fix de timing en WV Tienda**: `wv-theme.js` no detectaba las cards recién renderizadas porque el observer estaba sobre `#wvPanel` pero las cards se insertan en `#wvShopList`. Se agregó `setTimeout` en `renderShopArea()` que resetea `__wvThemed` y fuerza `WVTheme.themeAllNow(area)`.
- **Fix de estado online en Purchase Detail**: `refreshAllOnlineStatus()` usaba el índice del array `state.accounts` para actualizar la fila, pero la tabla estaba ordenada por delta (Δ). Ahora busca por `tr[data-token="..."]`.
- **Fix de preview de infusiones en Meta**: Ahora lee `data-preview` del DOM en vez de buscar en `meta._extItems`. Eliminado `.inf-prev` duplicado de `theme-polish.css`.
- **Fix de botón Dashboard de Wallet**: El event listener no se enganchaba a tiempo. Se agregó en `DOMContentLoaded`, antes de `wirePDButton()`.

### Removed
- **`wv-theme.js` duplicado en index.html**: Estaba cargado en el bloque `defer` y en el bloque `sync`. Eliminada la carga duplicada del bloque `defer`.
- **`.inf-prev` duplicado en `theme-polish.css`**: La regla original está en `main.css`.

---

## [6.3.0] - 2026-05-01

### Added
- **Receta Visual Unificada (Standard Visual Recipe)**:
  - Estándar visual común para todas las cards: borde neutro `rgba(255,255,255,0.08)`, border-left de 3px con color semántico, glow suave `rgba(90,110,154,0.12)`
  - Hover unificado: `translateY(-3px)` + sombra profunda `0 10px 28px rgba(0,0,0,0.45)` + glow intensificado
  - Transición: `0.22s cubic-bezier(0.2, 0.9, 0.4, 1.1)`
  - Aplicado en 11 módulos mediante `theme-polish.css`, `wallet-theme.js`, `meta-theme.js`, `achievements-theme.js`, `characters-theme.js`, `wv-theme.js`, `activities.js`, `accounts-panel.js`, `wallet-dashboard.js`
- **Desacople de Cámara del Brujo (WV) de router.js (Fases 1-3)**:
  - **Fase 1: `wv-theme.js` v1.0.0**: Tema visual para cards de Tienda y Objetivos WV (borde de rareza/modo, glow unificado). MutationObserver para cards dinámicas. Riesgo cero.
  - **Fase 2: `wv-shop-ui.js` v1.0.0**: UI de Tienda WV extraída de router.js (~400 líneas). Renderizado de cards/tabla, toolbar, filtros, skeleton loader, marcas, pins, auto-refresh. Con fallback completo.
  - **Fase 3: `wv-objectives-ui.js` v1.0.0**: UI de Objetivos WV extraída de router.js (~130 líneas). Renderizado de diarias/semanales/especiales, modo zero, hydrate mode pills. Con fallback completo.
  - `router.js` reducido de ~1200 a ~750 líneas. Solo orquesta navegación y ciclo de vida.
  - API pública extendida: `__getShopState()`, `__getObjState()`, `__setObjState()` en `window.WV`
- **`characters-theme.js` v1.0.0**: Tema visual de Personajes con borde de color por profesión (9 colores), hover con sombra de profesión, dropdowns personalizados para POIs (reemplazan `<select>` nativos), MutationObserver para cards dinámicas
- **Rediseño de Vista Tabla de Cartera (Wallet)**:
  - Íconos de divisa en cada fila
  - Formato de moneda con colores: oro `#f4c542`, plata `#e0e0e0`, cobre `#b87333`
  - Categorías migradas a badges visuales
  - Header sticky con `text-transform: uppercase` y `letter-spacing`
  - Hover en filas con `background: #1a1d28`
  - Estilos unificados con `.table-unified` en `theme-polish.css`
  - Nueva función `formatCoinValue()` en `app.js`
- **Rediseño de Dashboard de Cartera Multi-Cuenta**:
  - KPIs con `border-left` semántico por tipo (Oro `#F4C542`, Karma `#AF63DF`, Laurel `#2BC14E`, AA `#7BC2FF`)
  - Iconos decorativos por tipo de cuenta (`main`/`alter`/`f2p`) heredados del Panel de Cuentas
  - Sincronización de tags entre `accounts-panel.js` → `gw2_keys` → `wallet-dashboard.js`
  - Emoji 📊 de TOTAL reemplazado por ícono local `assets/icons/578844.png`
  - Nuevas funciones `getAccountIcon(tag)` y `ACCOUNT_TYPE_ICONS` en `wallet-dashboard.js`
- **Rediseño del Panel de Cuentas**:
  - Pantalla de carga rediseñada a 2 columnas (Asistente + Acceso a cuentas) con cards del mismo alto
  - Texto de seguridad ampliado: 4 bullets con iconos (cifrado AES, sin servidores, Comunidad Gato Negro)
  - Selector de archivo estilizado: botón que muestra nombre del archivo seleccionado en verde
  - Vista tabla con `border-left` por tipo de cuenta (`main`/`alter`/`f2p`)
  - Fila expandible al hacer clic (GW2 Avanzado, Expansiones, Servicios y API, Notas)
  - Corrección de bugs: `<tr>` corrupto (carácter `械`), `renderTableRow()` con `colspan` correcto
  - Nueva función `getBorderColor(account)` y `syncAccountTagsToKeys(accounts)`
- **Rediseño del Modal de API Keys**:
  - Iconos de tipo de cuenta en cada key (hereda de `accounts-panel.js`)
  - Badge "✓ En uso" en la key seleccionada (verde)
  - Key ofuscada con icono de candado
  - Botones con iconos: Usar (⚡), Copiar (📋), Renombrar (✏️), Eliminar (🗑️)
  - Botón Eliminar destacado en rojo con fondo semitransparente
  - Estado vacío con icono y mensaje descriptivo
  - Nuevas constantes `ACCOUNT_TYPE_ICONS` y `CONFIG_ICONS` en `app.js`
  - Nuevo método `KeyManager.setKeyTag(token, tag)` para persistir tipo de cuenta
- **Unificación visual de Actividades**:
  - Cards de Ecto: `border-left` verde `#a0ffc8` (hecho) / ámbar `#ffd36b` (pendiente)
  - Cards de Fractales T4: `border-left` verde (normal) / ámbar (CM)
  - Cards de Fractales Recomendados: `border-left` azul `#7bc2ff`
  - Cards de PSNA: `border-left` azul unificado
- **Nuevo asset**: `assets/icons/578844.png` para TOTAL del Dashboard

### Changed
- **router.js v2.14.0 → v2.15.0**:
  - `ensureLoadTab('shop')` y `onTokenChanged` delegan a `WVShopUI` con fallback
  - `renderObjectivesTab` y `renderObjectivesZero` delegan a `WVObjectivesUI` con fallback
  - Reducción de ~450 líneas (de ~1200 a ~750)
  - API pública extendida con `__getShopState`, `__getObjState`, `__setObjState`
- **wallet-theme.js v1.3.0 → v1.4.0**:
  - `applyCurrencyTheme()` actualizada con receta visual unificada
  - Borde neutro `rgba(255,255,255,0.08)` + `border-left` de color de divisa
  - Glow unificado `rgba(90,110,154,0.12)` en vez de glow por color
  - Marco de ícono simplificado (sin glow)
- **theme-polish.css v2.0.0 → v2.1.0**:
  - Nueva variable `--elev-hover` para hover unificado
  - `.card:hover` actualizado: `translateY(-3px)` + sombra profunda + glow intensificado
  - `.table-unified` extendido con soporte para `#walletTable`, `#accountsList table`
  - Hover unificado en filas de tabla
- **main.css v2.5.0 → v2.6.0**:
  - Agregados estilos para `.wd-kpi-card` con `border-left` semántico por `:nth-child()`
  - Agregados estilos para tabla de Cuentas (`#accountsList table`)
  - Eliminados estilos de Modo Deluxe (`body[data-meta-deluxe="on"]`)
- **meta.js v3.2.1**:
  - Eliminación de Modo Deluxe: `setDeluxe()`, `LS_META_DELUXE`, `DELUXE_DEFAULT`, botón Deluxe de `injectUIToggles()`
  - El Modo Compacto se mantiene intacto
- **accounts-panel.js v1.9.0**:
  - `renderLoadForm()` rediseñado a 2 columnas
  - `renderTableRow()` con fila expandible y `getBorderColor()`
  - Nueva función `syncAccountTagsToKeys()` llamada desde `loadFromFile()` y `loadFromStoredFile()`
  - Corrección de `<tr>` corrupto en `renderTable()`
- **app.js v2.6.3**:
  - `renderKeysList()` rediseñado con iconos, badges, botones con iconos
  - Nuevo método `KeyManager.setKeyTag(token, tag)`
  - Nuevas constantes `ACCOUNT_TYPE_ICONS` y `CONFIG_ICONS`
  - Nueva función `formatCoinValue()` para tabla de Wallet
- **wallet-dashboard.js v2.5.0**:
  - `renderTable()` con iconos por tipo de cuenta en cada fila
  - Nuevas funciones `getAccountIcon(tag)` y constantes `ACCOUNT_TYPE_ICONS`, `DECORATIVE_ICONS`
- **activities.js v3.19.3**:
  - `renderEcto()`, `renderFractals()`, `renderPSNA()` con `border-left` semántico y receta visual unificada
- **index.html**:
  - Scripts reorganizados por capas con comentarios documentados
  - Agregados `wv-shop-ui.js`, `wv-objectives-ui.js`, `wv-theme.js`, `characters-theme.js`
  - Nuevo orden de carga documentado
- **Documentación**: ONBOARDING.md actualizado a v6.3.0 (~2350 líneas), README.md actualizado a v6.3.0, CHANGELOG.md actualizado

### Removed
- **Modo Deluxe de Meta & Eventos**: no tenía efecto visual real (`meta-theme.js` ya pisa el `border-left`). Eliminados `setDeluxe()`, `LS_META_DELUXE`, `DELUXE_DEFAULT`, botón Deluxe y estilos CSS asociados
- **`wallet-cur-theme-patch.js`**: archivo redundante (v2.3.1) que competía con `wallet-theme.js`. Aplicaba `!important`, eliminaba glows, usaba heurísticas frágiles. `wallet-theme.js` v1.4.0 cubre toda la funcionalidad

### Fixed
- **Vista tabla del Panel de Cuentas**: corregido `<tr>` corrupto (carácter `械`) y `renderTableRow()` con estructura HTML inválida
- **Vista tabla del Panel de Cuentas**: fila expandible ahora muestra GW2 Avanzado, Expansiones, Servicios y API (antes solo nombre de Twitch)
- **Dashboard de Cartera**: emoji 📊 reemplazado por ícono local para consistencia visual
- **Selector de archivo en Panel de Cuentas**: ahora es un botón estilizado en vez del input nativo

---

## [6.2.0] - 2026-04-21

### Added
- **Raid Tracker — Seguimiento Semanal de Raids (raid-tracker.js v1.3.1)**:
  - Nuevo módulo que muestra las 8 alas de raid con todos sus encuentros
  - 33 encuentros totales (21 jefes + 12 eventos)
  - Marcado automático vía API `/v2/account/raids` (requiere permiso `progression`)
  - KPIs semanales: Completados / Total y porcentaje de progreso
  - Modal informativo por encuentro con:
    - Descripción (5+ bullets)
    - Estrategia (5+ bullets)
    - Enlace a video tutorial
  - Diferenciación visual entre JEFE (👑) y EVENTO (⚡)
  - Reset semanal automático (misma lógica que Activities, lunes 07:30 UTC)
  - Manejo seguro de imágenes: sin reintentos infinitos, fallback a emojis (🏰 para alas, 👾 para encuentros)
  - Escucha `gn:tokenchange` para recargar datos automáticamente
- **Nueva función `getAccountRaids(token, opts)` en api-gw2.js v2.12.0**:
  - Endpoint: `/v2/account/raids`
  - TTL de 5 minutos (el reset es semanal)
  - Requiere permiso `progression` (devuelve array vacío si no está presente)
- **Nueva ruta `#/account/raids`** en router.js v2.14.0
- **Nuevo enlace en sidebar** para Raids (debajo de Actividades, antes de Personajes)
- **Nuevo panel `#raidTrackerPanel`** en index.html
- **Nuevo evento Analytics `view_module`** con `module_name: 'raids'`
- **Nuevos assets en `assets/icons/raids/`**:
  - `raid-icon.png` — Ícono del módulo (sidebar y título)
  - `wing1.png` a `wing8.png` — Íconos de cada ala
  - `bosses/` — 33 archivos de íconos de encuentros

### Changed
- **api-gw2.js v2.11.0 → v2.12.0**:
  - Agregada función `getAccountRaids`
  - Agregado TTL.RAIDS = 5 * 60 * 1000
  - Actualizada documentación del archivo
- **router.js v2.13.0 → v2.14.0**:
  - Agregada ruta `#/account/raids`
  - Agregado `raidTrackerPanel` a `showPanel()`
  - Agregado mapeo `'#/account/raids':'raids'` en `setActiveNav()`
  - Agregado caso en `updateSidebarFor()` para `raids`
  - Agregado bloque en `route()` para RaidTracker
  - Agregado caso en `onKeySelectChange()` para recargar al cambiar de key
- **index.html**:
  - Agregado panel `#raidTrackerPanel` con clase `panel col-main`
  - Agregado enlace en sidebar para Raids (después de Actividades, antes de Personajes)
  - Agregado script `js/raid-tracker.js` a la lista de scripts
  - Actualizada versión de `api-gw2.js` a v2.12.0-modular
  - Actualizada versión de `router.js` a v2.14.0
- **welcome-panel.js v1.2.0**:
  - Agregada sección de Raids en lista de funcionalidades (8 acciones)
  - Agregado botón de acceso rápido a Raids
  - Nuevo ícono exclusivo `assets/icons/welcome/raids-icon.png`
- **Documentación**: README.md, ONBOARDING.md actualizados a v6.2.0

### Fixed
- **Ninguno** (nuevo módulo)

---

## [6.1.0] - 2026-04-08

### Added
- **Dashboard de Cartera Multi-Cuenta (wallet-dashboard.js v2.5.0)**:
  - Nuevo módulo que muestra todas las cuentas (API keys) en una tabla
  - Columnas: divisas seleccionadas por el usuario (Gemas, Oro, Laurel, AA, Karma, Esquirla espiritual por defecto)
  - Fila de totales (suma de cada divisa entre todas las cuentas)
  - Selector de divisas dropdown con íconos y persistencia en localStorage
  - Ordenamiento dinámico por columna (clic en encabezado alterna ascendente/descendente)
  - KPIs resumen con íconos oficiales: Total Oro, Total Karma, Total Laurel, Reconocimiento Astral
  - Formato de moneda para Oro: `X g Y s Z c` con colores (amarillo para oro, gris para plata, cobre para cobre)
  - Skeleton loader animado durante carga de datos
  - Scroll horizontal para tablas grandes
  - Botón "Refrescar" para recargar todas las wallets con `nocache: true`
  - Botón "Volver a Cartera" que cambia el hash a `#/cards`
- **Nueva ruta `#/wallet/dashboard`** en router.js v2.13.0
- **Botón "Dashboard" en el panel de Cartera** (`#walletPanel`) que navega a `#/wallet/dashboard`
- **Persistencia en localStorage**:
  - `wallet_dashboard_selected_currencies` — IDs de divisas seleccionadas
  - `wallet_dashboard_sort` — columna y dirección de ordenamiento

### Changed
- **router.js v2.12.0 → v2.13.0**:
  - Agregada ruta `#/wallet/dashboard`
  - Agregado `walletDashboardPanel` a `showPanel()` para que oculte correctamente `walletPanel`
  - Modificada redirección de bienvenida: no redirige si ya está en `#/welcome` o `#/wallet/dashboard`
  - Agregado evento `view_module` para `wallet_dashboard`
- **index.html**:
  - Agregado panel `#walletDashboardPanel` con clase `panel col-main`
  - Agregado botón "Dashboard" en los filtros del panel de Cartera
  - Agregado script `wallet-dashboard.js` a la lista de scripts
- **Documentación**: README.md, ONBOARDING.md actualizados a v6.1.0

### Fixed
- **Redirección de bienvenida**: al recargar la página en `#/wallet/dashboard`, ya no redirige a `#/welcome`
- **Carga inicial del dashboard**: reintento de renderizado si la tabla no existe en el DOM (100ms)

---

## [6.0.0] - 2026-04-05

### Added
- **Estado online basado en last_modified**:
  - Nueva función `getAccountInfo(token, opts)` en `api-gw2.js` v2.11.0
  - Nueva función `isRecentlyActive(accountInfo, minutesThreshold)` en `api-gw2.js` v2.11.0
  - Endpoint: `/v2/account?v=latest` para obtener `last_modified`
  - Umbral configurable: 20 minutos por defecto
  - Detecta CUALQUIER actividad (PvP, PvE, WvW, economía)
  - No requiere permiso especial `pvp` (usa `account` que todas las keys tienen)
  - TTL de 30 segundos para datos de actividad
- **Botón "Online" en el dashboard de compras**:
  - Ubicado junto al botón "Sincronizar" en `#wvpdFilters`
  - Actualiza solo el estado online sin recargar todos los datos
  - Usa el método público `WVPurchaseDetail.refreshOnlineStatus()`

### Changed
- **api-gw2.js v2.7.0-modular → v2.11.0**:
  - Eliminadas funciones `getPvPGames` e `isRecentlyActiveInPvP` (reemplazadas por `getAccountInfo` e `isRecentlyActive`)
  - Nueva función `getAccountInfo` con `?v=latest` para obtener `last_modified`
  - Nueva función `isRecentlyActive` para determinar actividad reciente
  - TTL.ACCOUNT agregado (30 segundos)
- **wv-purchase-detail.js v1.11.0 → v1.13.0**:
  - `loadAll()` ahora usa `getAccountInfo()` + `isRecentlyActive(accountInfo, 20)`
  - `refreshAllOnlineStatus()` ahora usa la misma lógica
  - Ícono cambiado de ⚔️ (PvP) a 🕐 (actividad general)
  - Tooltip actualizado: "Activo (actividad reciente)"
  - Botón "Online" movido del toolbar de tienda al dashboard
  - Eliminada dependencia de `getPvPGames` e `isRecentlyActiveInPvP`
- **Documentación**: README.md, ONBOARDING.md actualizados a v6.0.0

### Removed
- **Eliminada lógica de PvP**:
  - `getPvPGames` (reemplazada por `getAccountInfo`)
  - `isRecentlyActiveInPvP` (reemplazada por `isRecentlyActive`)
  - Dependencia del permiso `pvp` en API keys
  - Ícono ⚔️ (reemplazado por 🕐)

### Fixed
- **Estado online inconsistente**: ahora detecta actividad de cualquier tipo, no solo partidas PvP terminadas
- **Permisos de API key**: ya no requiere permiso `pvp`, todas las keys con permiso `account` funcionan
- **Latencia de detección**: `last_modified` se actualiza inmediatamente con cualquier cambio en la cuenta

---

## [5.9.0] - 2026-03-31

### Added
- **Google Analytics y Eventos Personalizados**:
  - Script de seguimiento GA4 agregado en `<head>` con ID `G-LB782QT9TR`
  - Nuevo archivo `js/analytics.js` v1.0.0 con API pública `window.Analytics`
  - Cola de eventos segura: si gtag no está cargado, los eventos se guardan y se envían cuando esté disponible
  - Eventos personalizados medidos:
    - `view_module` — Navegación a cada módulo (9 módulos: wallet, meta_events, achievements, wizards_vault, activities, characters, accounts, welcome, wallet_dashboard)
    - `export_backup` / `import_backup` — Uso de backup/restaurar
    - `open_account_wizard` — Apertura del asistente de cuentas
    - `download_excel_template` — Descarga de plantilla Excel
    - `enrich_with_api` — Enriquecimiento con GW2 API
    - `encrypt_accounts_file` — Creación de archivo .enc cifrado
    - `force_reload_season` — Recarga forzada de temporada WV
    - `open_api_keys_modal` — Apertura del modal de API Keys
    - `add_api_key` — Agregar nueva API Key
    - `delete_api_key` — Eliminar API Key
  - Debug en consola: cada evento se loguea con `[Analytics]` prefix

### Changed
- **router.js v2.12.0**: Agregados eventos `view_module` en todos los módulos (wallet, meta_events, achievements, wizards_vault, activities, characters, accounts, welcome, wallet_dashboard)
- **settings-manager.js v1.0.1**: Agregados eventos `export_backup` e `import_backup`
- **accounts-panel.js v1.9.0**: Agregados eventos `open_account_wizard`, `download_excel_template`, `enrich_with_api`, `encrypt_accounts_file`
- **wizards-vault.js v1.3.0**: Agregado evento `force_reload_season`
- **app.js v2.6.3**: Agregados eventos `open_api_keys_modal`, `add_api_key`, `delete_api_key`
- **index.html**: Agregado script `js/analytics.js` después del script de GA4
- **Documentación**: README.md, ONBOARDING.md actualizados a v5.9.0

---

## [5.8.0] - 2026-03-30

### Added
- **Automatización de compras en Wizard's Vault**:
  - **Dashboard de compras (wv-purchase-detail.js v1.11.0)**:
    - Barra de progreso compacta en cada celda de ítem fijado
    - Input numérico + botón MAX para marcas manuales
    - Auto-guardado con debounce (500ms)
    - Regla dual: `Math.max(apiPurchased, manualMarks)` — muestra el valor más alto entre API y marcas manuales
  - **Tienda unificada (router.js v2.12.0)**:
    - Barra de progreso e input manual integrados como parte nativa del HTML de cada tarjeta
    - Eliminado event listener conflictivo de `wv:season-store:mutate` que recreaba la tienda innecesariamente
    - Persistencia de marcas directamente en WVSeasonStore sin recargar toda la tienda
    - Las barras no desaparecen al modificar valores ni al cambiar de pestaña
    - Funciones internas: `saveManualMark()`, `updateCardUI()`, `setupManualInputEvents()`
- **Recarga forzada de temporada en Wizard's Vault (wizards-vault.js v1.3.0)**:
  - Ícono clickeable (sin apariencia de botón) ubicado junto al tooltip de información (`wvSyncNote`), a la derecha del título "Cámara del Brujo"
  - Ícono: `assets/icons/Welcome/834002.png`
  - Función `forceReloadSeason()`: obtiene temporada fresca de la API (`/v2/wizardsvault` con `nocache: true`)
  - Actualiza automáticamente la UI (`wvSeasonTitle`, `wvSeasonDates`)
  - Guarda los datos en `WVSeasonStore` para persistencia
  - Feedback visual con toast (info → éxito/error)
  - Función global `window.forceReloadWVSeason` expuesta para debug en consola
  - Inyección automática del ícono al cargar el DOM y al navegar a `#/account/wizards-vault`

### Changed
- **wizards-vault.js v1.3.0**:
  - Nueva función `forceReloadSeason()` con lógica completa de recarga
  - Nueva función `injectReloadSeasonButton()` para inyectar el ícono en la UI
  - El ícono se inserta después del tooltip existente (`wvSyncNote`)
  - Estilos del ícono: opacidad 0.7 → 1 al hover, cursor pointer, transición suave
- **wv-purchase-detail.js v1.8.6 → v1.11.0**:
  - Nueva regla dual para mostrar valor más alto entre API y marcas manuales
  - Auto-guardado con debounce 500ms
- **router.js v2.10.6 → v2.12.0**:
  - Barra de progreso e input manual integrados en HTML nativo
  - Eliminado event listener conflictivo

### Fixed
- **Información de temporada no visible**: ahora el usuario puede restaurarla manualmente con un clic, sin necesidad de recargar toda la página ni usar la consola
- **Barras de progreso en tienda**: ya no desaparecen al modificar valores ni al cambiar de pestaña

---

## [5.7.0] - 2026-03-28

### Added
- **Sistema de Backup/Restaurar (settings-manager.js v1.0.1)**:
  - Exportación completa de configuración a archivo JSON
  - Importación con validación de versión y confirmación de sobrescritura
  - Botones "Backup" (`assets/icons/155034.png`) y "Restaurar" (`assets/icons/155033.png`) en utilbar
  - Datos exportados: API Keys, Wizard's Vault (pins y marcas), Wallet (pins, snapshots, vista compacta), Activities (toggles, home nodes), Characters (POIs, ubicaciones), Meta (favoritos, hecho hoy), configuración global (`gn_welcome_seen`)
  - Formato JSON versión 3.0 con timestamp de exportación
- **Header compacto**:
  - Altura reducida de ~140px a ~60px
  - Logo + nombre en una sola línea con tipografía Cinzel Decorative
  - Eliminación del hero y tabs (navegación ahora solo en sidebar)
  - Responsive: en móvil se apila verticalmente
- **Mejoras en Cámara del Brujo (WV)**:
  - Reemplazo de texto largo por ícono `assets/icons/155018.png` con tooltip
  - Ícono ubicado junto al título "Cámara del Brujo"
- **Iconos de redes sociales en utilbar**:
  - Discord: `assets/icons/Welcome/discord.png`
  - Instagram: `assets/icons/Welcome/instagram.png`
  - YouTube: `assets/icons/Welcome/youtube.png`
  - Twitch: `assets/icons/Welcome/twitchlogo.png`
  - GitHub: `assets/icons/Welcome/github.png` (nuevo)

### Changed
- **settings-manager.js v1.0.1**:
  - Corrección de claves de localStorage para API Keys: ahora usa `gw2_keys` y `gw2_selected_key_v1`
  - Mejora en logs de depuración
- **index.html**:
  - Header compacto con nueva estructura
  - Botones Backup/Restaurar en utilbar
  - Reemplazo de SVGs de redes sociales por imágenes locales
  - Tooltip WV con ícono `155018.png`
- **Archivos de documentación**: README.md, ONBOARDING.md actualizados a v5.7.0

### Fixed
- **Desborde de sidebar en WV**: corregido con estilos de contención y reubicación del ícono de información
- **Header pisando contenido**: resuelto con header compacto

---

## [5.6.0] - 2026-03-28

### Added
- **Panel de Cuentas — Rediseño completo (accounts-panel.js v1.9.0)**:
  - **Información detallada de Twitch** dentro de subsección "Servicios" colapsable:
    - Username con @ (copiable al portapapeles)
    - Email (copiable, si existe)
    - Password (toggle independiente + copiable, si existe)
  - **Iconos separados para títulos de secciones vs campos internos**:
    - Credenciales (título): nuevo icono `assets/icons/Welcome/733266.png`
    - Contraseña (campo): mantiene `assets/icons/Cuentas/733265.png`
    - GW2 Avanzado (título): nuevo icono `assets/icons/Cuentas/358409.png`
    - Chars (campo): mantiene `assets/icons/Cuentas/156409.png`
  - **Reemplazo de emoji 👁️ por imagen local** en todos los toggles de contraseña (`assets/icons/welcome/528726.png`)
  - **Reemplazo de emoji ✅ por imagen local** en GeForce Now (`assets/icons/Welcome/156108.png`)
  - **Barra de estadísticas optimizada**: separadores con `margin: 0 -6px` para mejor ajuste en zoom 100%
  - **Plantilla Excel actualizada**: nuevas columnas `twitch_user`, `twitch_email`, `twitch_password`

### Changed
- **accounts-panel.js v1.9.0**:
  - Subsección "Servicios" colapsable dentro de Servicios y API
  - Toggle independiente para contraseña Twitch (`state.showTwitchPasswords`)
  - Estado de expansión de secciones persistente en memoria (no localStorage)
  - Copia al portapapeles extendida a Twitch username, email y password
- **Plantilla Excel**: incluye ahora columnas `twitch_user`, `twitch_email`, `twitch_password` para capturar datos completos de Twitch

### Fixed
- **Contraseña Twitch**: ahora se muestra correctamente (oculta por defecto) con toggle funcional
- **Barra de estadísticas**: separadores optimizados para que no rompa en dos líneas en zoom 100%

---

## [5.5.0] - 2026-03-27

### Added
- **Pantalla de Bienvenida (welcome-panel.js v1.2.0)**:
  - Nueva ruta `#/welcome` con onboarding completo
  - Secciones: funcionalidades (8 acciones, incluyendo Raids), API Key, asistente de cuentas, acceso rápido, comunidad, apoyo
  - Iconos exclusivos para cada funcionalidad (cartera, meta, logros, WV, actividades, personajes, cuentas, raids)
  - Botón home en utilbar con ícono local (`assets/icons/ui/home.png`)
  - Redirección inteligente: primera visita o sin API key → bienvenida
  - Flag `gn_welcome_seen` en localStorage para no mostrar repetidamente
- **Panel de Cuentas — Asistente integrado (accounts-panel.js v1.3.1)**:
  - Modal con 4 pasos para crear archivos `.enc` desde Excel:
    1. Descargar plantilla Excel con columnas predefinidas
    2. Subir Excel → Generar JSON
    3. Enriquecer con GW2 API (account name, AP, fecha creación, expansiones)
    4. Cifrar con contraseña → archivo `.enc`
  - Separación visual: bloque "Asistente" arriba, bloque "Acceso a cuentas" abajo
  - Botón "➕ Crear nuevo archivo" abre el modal
  - Persistencia de último archivo en localStorage
  - Iconos exclusivos para cada paso del asistente
- **Detección automática de llave semanal — Validación de semana actual (Activities v3.19.3)**:
  - Nueva condición: personaje Thief debe haber sido creado **después** del último reset semanal (lunes 07:30 UTC)
  - Función auxiliar `getLastWeeklyResetUTC()`
  - Previene que Thiefs creados el domingo bloqueen la llave de la semana siguiente
  - Leyenda actualizada: "nivel 10+, <7 días, **misma semana**"

### Changed
- **welcome-panel.js v1.2.0**:
  - Todos los emojis reemplazados por imágenes locales en todas las secciones
  - Iconos de comunidad: Discord, Instagram, YouTube, Twitch, GitHub, email
  - Iconos de apoyo: PayPal, Ko-fi, café
  - Botones "Agregar API Key" y "Gestionar Keys" abren modal correctamente
  - Modal de API Keys cierra correctamente (backdrop, X, ESC)
- **router.js v2.10.6**:
  - Nueva ruta `#/welcome` agregada
  - Lógica de redirección inicial en `onDomReady()`
  - Actualización de `showPanel`, `setActiveNav`, `onKeySelectChange` para soportar bienvenida
- **accounts-panel.js v1.3.1**:
  - Mantenimiento de funcionalidad existente (carga de archivo guardado, contraseña, botón "Cambiar archivo")
  - Corrección de bug: modal de API Keys cierra correctamente desde bienvenida

### Fixed
- **Modal de API Keys**: ahora cierra correctamente (backdrop, X, ESC) cuando se abre desde cualquier lugar
- **Panel de cuentas**: separación visual correcta entre asistente y acceso a cuentas
- **Modal de asistente**: corrección de margen izquierdo (div extra eliminado)

---

## [5.4.0] - 2026-03-26

### Added
- **Panel de Cuentas (accounts-panel.js v1.2.1)**:
  - Cifrado local de archivos JSON con AES (CryptoJS)
  - Persistencia de último archivo en localStorage para acceso rápido
  - Vista dual: tarjetas / tabla con botón toggle
  - Información sensible oculta con botón 👁️
  - Copia al portapapeles (email, contraseña, Gmail Pass)
  - Click en nombre de cuenta expande información adicional (mochilas, bancos, material, legendarias)
  - Sección colapsable "Más info" con estadísticas
  - Filtros por tipo (principales, alternativas, farming, llaves) y tags
  - Botón "Cambiar archivo" para resetear estado
  - Ruta `#/account/accounts`
- **Detección automática de llave semanal (Activities v3.19.2)**:
  - Busca personajes Thief con nivel ≥10 y menos de 7 días de antigüedad
  - UI dedicada en la parte superior del panel de actividades
  - Eliminado marcado manual (checkbox deshabilitado)
- **Barra de horarios unificada** (Activities v2.5.0 / Meta v1.3.1):
  - Iconos oficiales de GW2: UTC, Local, Reset diario, Reset semanal
  - Actualización en tiempo real con segundos
  - Cuenta regresiva con formato `Xd Xh Xm Xs`

### Changed
- **index.html**: Nuevo enlace en sidebar para Cuentas, agregado script de crypto-js y SheetJS
- **router.js v2.10.5**: Nueva ruta `#/account/accounts`
- **activities.js v3.19.3**: Mejora en detección de llave con validación de semana actual

---

## [5.3.0] - 2026-03-25

### Added
- **Migración completa a íconos locales**:
  - Profesiones: íconos locales en `assets/icons/professions/2163502.png` a `2163510.png`
  - Fractales: ícono genérico local `assets/icons/Fractal/2591.png` para todas las tarjetas
  - Conversor: SVG reemplazados por imágenes locales (`502065.png`, `619316.png`, `784280.png`)
  - Countdowns WV: íconos de reset diario, semanal y temporada locales (`523379.png`, `523380.png`, `523381.png`)
- **Títulos de paneles con íconos**:
  - Cartera: `733322.png`
  - Meta & Eventos: `102420.png`
  - Logros: `155059.png`
  - Cámara del Brujo: `3172791.png`
  - Actividades: `1302773.png`
  - Personajes: `156678.png`
- **Corrección de rutas assets**: eliminada barra inicial `/` en todas las rutas para compatibilidad con GitHub Pages

### Changed
- **Characters.js v2.3.0**: `loadProfIcons()` ahora usa íconos locales en lugar de API
- **Activities.js v3.19.0**: Fractales usan ícono genérico local, simplificadas funciones `getFractalIconHtml()` y `getScaleIconHtml()`
- **wv-purchase-detail.js v1.8.6**: Countdowns con íconos locales
- **index.html**: Conversor y títulos de paneles con íconos locales

### Removed
- Dependencia de `/v2/files` para íconos de profesión
- Dependencia de wiki.guildwars2.com para íconos de fractales
- SVG inline del conversor (gemas y oro)

---

## [5.2.0] - 2026-03-24

### Added
- **Íconos en títulos de paneles**:
  - Cartera: `733322.png`
  - Meta & Eventos: `102420.png`
  - Logros: `155059.png`
  - Cámara del Brujo: `3172791.png`
  - Actividades: `1302773.png`
  - Personajes: `156678.png`

### Changed
- **index.html**: Todos los títulos de paneles ahora incluyen ícono correspondiente
- **activities.js v3.18.0**: Título del panel con ícono
- **characters.js v2.3.0**: Título del panel con ícono

---

## [5.1.0] - 2026-03-24

### Added
- **Migración a íconos locales**:
  - Sidebar: todos los íconos de navegación migrados a `assets/icons/` (28x28)
  - Barra de tiempos (Activities): UTC, Local, Daily, Weekly
  - Countdowns WV: diario, semanal, temporada (523379-523381)
  - Banner y botón Purchase Detail: ícono Cámara del Brujo (3594051)

### Fixed
- **Bucle infinito en Wizard's Vault**:
  - Restaurado endpoint correcto en `getWVSeason` (`/v2/wizardsvault`)
  - `scheduleSeasonReset` evita reprogramación múltiple
  - `msUntil` corregida para objetos Date
- **Información de temporada**:
  - `nextSeasonResetUTC` retorna null si fecha ya pasó
  - `setWVSeasonHeader` se ejecuta correctamente al cargar

---

## [5.0.0] - 2026-03-23

### Added
- **Barra de horarios unificada** con iconos oficiales de Guild Wars 2:
  - Hora servidor UTC y hora local con actualización en tiempo real (segundos)
  - Cuenta regresiva para reset diario (00:00 UTC) y reset semanal (lunes 07:30 UTC)
  - Formato unificado: `Xd Xh Xm Xs` con segundos
  - Implementada en Activities (v2.5.0) y Meta & Eventos (v1.3.1)
- **Meta & Eventos — Mejora de horarios en tarjetas**:
  - Conversión UTC → hora local en horarios desplegables
  - Color dinámico del botón "Horarios": 🟢 verde (activo), 🟡 ámbar (próximo ≤20 min), 🔵 azul (más tarde)
  - Resaltado del próximo horario en la lista de horarios
  - Ícono 🕒 añadido al botón
- **Home Nodes — Rediseño completo** (activities-theme.js v2.3.0):
  - Lista completa de 74 elementos (53 nodos API + 6 Janthir + 15 contratos/consumibles)
  - Estado en tiempo real ✅/❌ vía API `/v2/account/home/nodes`
  - Filtros avanzados por categoría, tipo y estado
  - Tarjetas rediseñadas con icono de tipo (44px) e imagen de ítem destacada (64px)
  - Checkbox "Recolectado hoy" con persistencia diaria en localStorage
  - Contador de progreso con porcentaje
  - Sistema de fallback de imágenes desde gw2treasures

### Changed
- **Purchase Detail** (v1.8.4): Sistema de colores unificado (verde/amarillo/rojo), badges con hover, KPIs con glow, skeleton loader, animación de entrada
- **Wallet Theme** (v1.3.0): Migración a badges canónicos, glows preservados, migración a clase `.card`
- **Meta Theme** (v1.1.0): Badges canónicos, extensión visual con pills
- **Theme Polish** (v2.0.0): Componentes canónicos unificados (badges, pills, KPIs, tabla)
- **ONBOARDING.md**: Actualizado con documentación completa de Home Nodes y barra de horarios

### Removed
- Eliminado reglón extra con símbolo '^' sobre tabla en Purchase Detail
- Removido fingerprint de la columna cuenta
- Eliminado campo redundante "Última actualización" en Meta & Eventos

---

## [4.1.0] - 2026-03-01

### Added
- **UI Overhaul**: rediseño de tarjetas y layouts de Wallet, Meta & Logros; unificación de barras de progreso.
- **Conversor v2.0**: quick‑chips (gemas/oro), micro‑animaciones, halo dorado reforzado, estado "Actualizado." en pill, sombras dinámicas de la barra y layout simétrico.

### Fixed
- **WV**: pastillas de modo (PvE/PvP/WvW) muestran iconos correctamente. Se incorpora `hydrateWVModePills(scope)` y se llama tras render, cambios de tab y de token. Se añade `MutationObserver` en `#wvPanel`.

### Changed
- Pulidos de estilo en `theme-polish.css`, halos por rareza y coherencia de tonos/pills.

---

## [4.0.0] – 2026-02-28

### Wallet
- Rework de tarjetas con estética WV (`wallet-card-grid`, `wallet-card*`).
- Reemplazo de estrella por **📌** con persistencia por cuenta (`LS_WALLET_PINS`) y **migración** desde `LS_FAVS`.
- **Vista compacta** con persistencia (`LS_WALLET_COMPACT`), toggle inyectado en toolbar.
- **Delta de cantidades** (↑/↓) contra snapshot por cuenta (`LS_WALLET_SNAPSHOT`), pill verde/roja; en tabla también ±0.
- Toolbar: botones **"Vista compacta"** y **"Actualizar base"**.
- Accesibilidad: `aria-pressed` en pins/toggles.

### UI/Index
- `#walletCards` ahora usa `wallet-card-grid`.
- "Favoritas" → "Fijadas".
- Encabezado de Tabla (última col) ahora es **📌**.

### Nuevo módulo completo: Cámara del Brujo (Wizard's Vault)
- Objetivos Diarios / Semanales / Especiales.
- Progreso de Meta global de temporada.
- Aclamación Astral: disponible, gastado API, reservado (marcas locales).
- Tienda WV con vista tarjetas/tabla, filtros, buscador, stock y contadores ± persistentes.
- Toolbar PvE / PvP / WvW.
- Manejo de permisos y fallback en caso de tokens sin wizardsvault.
- Integración con endpoints oficiales:
  - `/v2/wizardsvault/seasons`
  - `/v2/account/wizardsvault/categories`
  - `/v2/account/wizardsvault/listings`

### Nuevo módulo completo: Pantalla de Logros (Achievements)
- Vista dedicada en `#/account/achievements`.
- Barra de progreso por objetivo.
- Filtros PvE / PvP / WvW.
- Rareza, progreso numérico y porcentaje.
- Integración con `/v2/account/achievements` y `/v2/achievements`.
- Estilo oscuro, limpio y consistente con el resto del panel.

### Selects (Meta & Eventos / Wallet)
- Tema oscuro real, sin caret, menú desplegable dark, una sola pastilla (chip).

### Chips sólidos
- Hover/focus/pressed/checked consistentes y accesibles.

### Toggles inyectados (sin tocar index.html)
- `data-meta-deluxe="on|off"`
- `data-meta-compact="on|off"`

### Integración total con:
- **Hecho hoy (API)**: `/v2/account/worldbosses`, `/v2/account/mapchests`.
- **Hecho hoy (Manual)**: por id/token/día UTC (localStorage), reset automático 00:00 UTC.
- **Cache de flags** (TTL 5′), **refresh** manual.

### Nuevo sistema de iconografía en el sidebar
- Reemplazo de emojis → íconos reales (Wiki e íconos GW2).
- Preparado para repositorio propio de imágenes.

### Cambiado
- Refinamiento visual de tarjetas y filtros, sin romper la estructura previa.
- Ordenación por favoritos, estado (activo → próximo → más tarde) y proximidad.
- Router actualizado: navegación por hash y emisión correcta de `gn:tabchange` para inicialización del módulo MetaEventos.
- Correcta separación de asides según vista (Wallet / MetaEventos / Logros / WV).

### Corregido
- Selects que se veían con fondo blanco / texto claro (ilegible) en algunos navegadores.
- Flechita (caret) que se superponía en los chips de filtros.
- Error crítico: MetaEventos no iniciaba debido a cambio en la navegación → solucionado.
- Tooltips de infusiones: fix de `pop is not defined`, escopo correcto y `createElement('img')` sin CORS.
- Render de íconos: `iconTag()` / `wpIcon()` ahora devuelven `<img>` reales.
- Corrección de enlaces Wiki/Mapa (se mostraban como texto).

---

## [2.6.3] - 2026-02-28

### Router / Sidebar
- `setActiveNav` robusto (sin entidades, normalización de hash, rAF).
- **`updateSidebarFor(view)`**: sidebar contextual coherente por vista.
- **`try/finally`** en cada rama de `route()` para garantizar **actualización de nav + sidebar** aun ante excepciones.
- Refuerzo `hashchange`: rutear + re‑aplicar active al final del ciclo.
- WV: `WV.activate()` antes del marcado de nav; se corrige el **bug de pastilla** y el **sidebar fantasma**.

---

## [2.6.1–2.6.2] - 2026-02-28

- Limpieza de entidades HTML fuera de strings en JS (evita errores de sintaxis).
- Ajustes menores de compatibilidad y logs de diagnóstico.

---

## [3.0.0] – 2026-02-24

### Agregado
- **MetaEventos Deluxe v3.0**:
  - Tarjetas con jerarquía clara: header → subinfo → ✔ → contexto → acciones → pie.
  - **Acciones**: Copiar WP, abrir Wiki, **Mapa** (gw2.io), **Compartir** texto, Favorito.
  - **Horarios por tarjeta** (toggle), chips con estados **NOW** y **SOON (≤20m)**.
  - **Vista Compacta** global.
  - **Colores por categoría** (worldboss/meta/global/instance/temple/event).
  - **Contexto** automático por tipo.
- **Selects** (Meta & Eventos / Wallet): tema **oscuro** real, **sin caret**, menú desplegable dark, **una sola pastilla** (chip).
- **Chips sólidos**: hover/focus/pressed/checked consistentes y accesibles.
- **Toggles** inyectados (sin tocar index.html):  
  - `data-meta-deluxe="on|off"`  
  - `data-meta-compact="on|off"`
- Integración total con:
  - **Hecho hoy (API)**: `/v2/account/worldbosses`, `/v2/account/mapchests`.
  - **Hecho hoy (Manual)**: por `id`/token/día UTC (localStorage), reset automático 00:00 UTC.
  - **Cache** de flags (TTL 5′), **refresh** manual.

### Cambiado
- Refinamiento visual de tarjetas y filtros, sin romper la estructura previa.
- Ordenación por favoritos, estado (activo > próximo > más tarde) y proximidad.

### Corregido
- **Selects** que se veían con **fondo blanco / texto claro** (ilegible) en algunos navegadores.
- Flechita (caret) que se superponía en **checkbox chips** ("Activos", "Próximos", etc.).

---

## [2.6.2] – 2026-02-23

### Agregado
- **Manual check** para metas sin API (`manualCheck:true`), persistente por token/día UTC.
- Tooltips y preview en infusiones (cuando hay `highlightItemId` o `preview`).
- Top‑3 próximos en sidebar.

### Cambiado
- Skeleton y render más robustos; mensajes de estado claros.

### Corregido
- Ajustes menores de iconos y tooltips.
- Evitar error silencioso cuando `meta-drops.json` no está disponible.

---

## [2.6.1] - 2026-02-24

### Added
- MetaEventos: cache por API key (TTL 5 min) para "Hecho hoy".
- Botón **Refrescar estado** con bloqueo y toast.
- **Auto‑refresh** en 00:00 UTC (reset diario).
- Timestamp visible `Actualizado hh:mm:ss` y tooltip del ✔ con fuente e ID (cuando aplica).
- UI: encabezados + filtros en chips; meta‑topbar con badges.
- Conversor: títulos color/ícono; un único input por lado.

### Changed
- Alineación de componentes (Wallet/Meta/Conversor) y responsive <900px.

### Fixed
- Duplicado de `renderSkeletonMeta` y pequeños hardenings en `updateClock`.

---

## [2.6.0] — 2026-02-24

### 🎯 Nuevo
- Modal completo de API Keys (alta, edición, eliminado, uso, copia).
- Selector global visible en todas las vistas.
- Validación automática de permisos `account + wallet`.
- UX mejorada en gestión de cuentas múltiples.

### 🛠 Cambios técnicos
- KeyManager centralizado.
- Limpieza de código legacy en Wallet.
- Eliminación total del selector viejo.
- Fix en `onBottomInput()` y mejoras en `updateRef400()`.

### 🔁 Migración
- El panel Wallet ya no administra API Keys.
- La gestión se concentra en el header y modal.

---

## [v2.5.0] — 2026-02-22

### Added
- Activación del módulo **MetaEventos** con:
  - Estado: Activo / Próximo / Más tarde
  - Filtros (tipo, expansión, activos, próximos ≤20m, infusiones)
  - Favoritos (máx. 6)
  - Sidebar "**Top 3** próximos"
  - Tooltips visuales para infusiones (preview + wiki)
  - Botón **copiar waypoint** con icono personalizado

### Changed
- Hero actualizado con **glow dorado**.
- Tabs del hero robustecidas para evitar deformaciones.
- CSS general reorganizado y limpiado.
- Normalización de badges por expansión.

### Fixed
- Tooltips de infusiones ahora se enganchan después del render.
- Correcciones del layout del hero para evitar el desplazamiento de tabs.
- Ajuste del reloj y "Próximo reset".

---

## [v2.3.3] — 2026-02-21

### Added
- Glow rojo en tabs del hero.
- Iconos de redes (Discord, Instagram, YouTube, Twitch).
- Mejoras visuales en tarjetas y botones.

### Changed
- Conversor final estable sin loops.
- Íconos de divisas a 22px.
- Limpieza visual en `main.css`.

### Fixed
- Render robusto de íconos API.
- Eliminado error `ReferenceError: renderCards is not defined`.

---

## [2.0.0] - 2026-02-21

### 🚀 Rediseño total – "Bóveda del Gato Negro"
Esta versión reemplaza completamente la versión anterior de *gw2-wallet-ligero*, introduciendo una nueva identidad visual, estructura profesional y mejoras profundas en la UI/UX.

#### ✨ Nuevo
- Nueva identidad: **Bóveda del Gato Negro**
- Header estilo ArenaNet con:
  - Textura Hero
  - Overlay semitransparente
  - Logo + tipografía ornamental
  - Tabs principales flotantes
- Navegación renovada
- Dropdown **"Enlaces útiles"** (Efficiency, Timer, ArcDPS, API docs)
- Redes integradas: Discord, Instagram, YouTube
- Favicon nuevo (SVG + PNG)
- Marquita GN para footer
- Estructura HTML optimizada
- Estilo CSS reescrito desde cero
- Paleta de color basada en identidad del logo
- 🧩 Preparación modular para próximos módulos:
  - Conversor Gem ↔ Oro
  - MetaEventos
  - Dashboard extendido

#### 🛠 Mejorado
- Mejor rendimiento de carga inicial
- Overlay con efecto **glass UI**
- Header + hero responsivos
- Espaciados y jerarquía visual revisada
- Compatibilidad con GitHub Pages

#### 🧹 Eliminado
- Proyecto antiguo y archivos previos (HTML/CSS/JS obsoletos)
- Legacy tokens de estilos y scripts viejos
- Documentación antigua

---

## [1.6.1] - 2026-02-20

### 🎨 Ajustes de overlay
- Correcciones en overlay debajo/encima del header
- Ajustes responsive
- Afinado de glow y colores

---

## [1.5.0] - 2026-02-19

### 🎨 Incorporación logo + branding inicial

---

## [1.4.0] - 2026-02-18

### 🧭 Nuevo header con textura + barra superior

---

## [1.3.4] - 2026-02-17

### 🐞 Fix crítico
- Corrección de iconos en tarjetas
- Corrección de overflow en descripciones largas

---

## [1.0.0] - 2026-02-15

### 🎉 Versión inicial
- Lectura de API Keys
- Integración con `/v2/account/wallet`
- Grilla de tarjetas
- Vista compacta (tabla)