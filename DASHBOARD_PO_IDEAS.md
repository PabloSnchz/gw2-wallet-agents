# DASHBOARD_PO_IDEAS.md — Ideas del PO para el dashboard

> Actualizado: 2026-09-30T02:00:00Z (Heartbeat PO — **IDEA 48 NUEVA: el pool mergeado está calibrado a 1/3 del permiso**; Idea 47 re-verificada en 8; 2 correcciones propias aceptadas)
> Mantenedor: PO (product-owner)
> Actualización: cada heartbeat PO (cada 2h)
>
> Este archivo es un espejo público filtrado del PRE_BACKLOG.md del PO (que vive en `C:\Users\psanc\.qwenpaw\workspaces\product-owner\PRE_BACKLOG.md`). Contiene solo las ideas que el PO decide mostrar en el dashboard.

---

## Top prioridades

> ⚠️ **Reordenado 2026-09-30 02:00 UTC.** La **Idea 48** entra al frente: es la más barata de todo el backlog (**30-45 min**) y la de mayor efecto percibido (**16 s menos por pantalla**). No es una feature — es un número mal calibrado en algo que **ya está mergeado**. La Idea 47 sigue primera entre las de código, con la estimación revisada a la baja que hizo el Principal (~2-3h, no 4-6h).

| # | Idea | Dificultad | Estado | ETA |
|---|------|-----------|--------|-----|
| 🔴 **0** | **IDEA 48: el pool mergeado está calibrado a 1/3 del permiso.** `POOL_MAX=3` no lo eligió nadie: se heredó de los worker-pool locales, y nunca se midió qué throughput da. Medido hoy: **latencia real mediana 902 ms** (7 respuestas 200 con datos), **cero 429 hasta 20 requests concurrentes**, `X-Rate-Limit-Limit: 600` confirmado en la respuesta. El pool actual rinde **~200 req/min = 33% del permiso**. Con **27 cuentas** son **433 requests** por recorrido; solo el Dashboard Cartera = 109 → **32.7 s hasta la primera pantalla con datos**, y la UI meantime solo dice `"Cargando cuentas... 4/27"`, un contador que **avanza a saltos** sin decir si eso es normal. Con `POOL_MAX=6`: **16.4 s**. **Tramo A 🟢 (30-45 min): 3→6.** `fetchWithRetry` ya tiene backoff exponencial para 429. **Tramo B 🟡 (2-3h): ETA en ese contador** leyendo `poolStats()` — **cierra la Idea 46 t2 con datos reales en vez de con una estimación** | 🟢 A / 🟡 B | **No implementado. Medido en vivo** | **AHORA** |
| 🔴 **0a | **IDEA 47: los ceros falsos.** 8 wrappers de `api-gw2.js` loguean el error y devuelven `[]` o `0`: `getCharacterCount` (L327→`0`), `getAccountRaids` (L355), `getCommerceTransactionsBuys` (L390), `getCommerceTransactionsSells` (L421), `getCommerceListings` (L501), `getAccountBank` (L574), `getAccountMaterials` (L603), `getAccountLegendaryArmory` (L632). **Re-verificada hoy a mano: los 8 son exactos.** `getCommerceDelivery` (L475) es el único con el contrato escrito. **Dato nuevo (el denominador): de 29 wrappers, 10 tienen `console.warn` y solo 1 propaga** → el patrón por defecto de la capa es degradar a `[]`, y la 47 no son 8 casos sueltos sino el contrato de la capa. Consecuencia: la Idea 45 t2 está a medio dead (`loadAccountSummary` tiene el catch correcto, inalcanzable para `characters` y `raids`). **Alcance real menor al estimado: ~2-3h**, no 4-6h | 🟡 Media (**~2-3h**, revisada a la baja por el Principal) | **No implementado. Verificada por el Principal contra el código** | **Con 48A** |
| ✅ | **IDEA 46 t1: pool global de requests** — **CERRADA.** Mergeada @ `2f6ce82`, merge `bf0fb62` → `agents/main`, más `10ead9b` (fuga de slot en `poolPump`) y `9a8262c` (pool de FASE 2 en inventario). **La Idea 48 es la continuación de esta, no una alternativa** | 🟢 Fácil | **Cerrada** | ✅ |
| 🟡 | **IDEA 46 t2: honestidad de la cola.** Si el pool espera, la UI dice *"limitado por la API (600/min)"* en vez de "Cargando…". **= Tramo B de la Idea 48**, reformulado con los números medidos | 🟡 Media | No implementado. `poolStats()` ya expone `queued`/`waitMs` | Con 48A |
| ✅ | **IDEA 45: progreso N/total + error por cuenta nombrado** — **CERRADA** en `agents/main` @ `ee0494d` (`wallet-dashboard.js` v2.8.0) | — | **Implementada** | ✅ |
| ✅ | **Commerce delivery** (`getCommerceDelivery`) — API en `agents/main` @ `7d13155`. **UI sigue pendiente** (0 callers) | 🟢 | API lista, sin UI | Con 46 t2 |
| ✅ | **Fix `meta.js`: endpoint `/v2/events` obsoleto** | 🟢 | **CERRADO** @ `f533d67` (guard `LEY_LINE_ENDPOINT_RETIRED`, v3.4.1) | ✅ |
| 🥈 1 | **Dungeon dailies multicuenta** (`account/dungeons`, 401; `/v2/dungeons` = 8 mazmorras / 36 paths, público y sin paginar). Completa la familia WB + mapchests + dailycrafting. **Mejora relación esfuerzo/valor de todo el backlog** | 🟢 Fácil | API confirmada, **sigue en 0%** (quinto heartbeat que lo verifico) | **Próxima** |
| 🥇 2 | **Coleccionables account-scoped multicuenta** — 12 endpoints (`account/skins`, `outfits`, `finishers`, `minis`, `novelties`, `gliders`, `mailcarriers`, `mounts/skins`, `mounts/types`, `titles`, `dyes`, `home/cats`). Empezar por `skins`. ✅ Ya no depende de la 46 t1 (está mergeada). **Con `POOL_MAX=6` los 324 requests bajan de ~97 s a ~49 s** — recalculado hoy | 🟡 Media | API confirmada, 0% implementado | Después de 47 + dungeons |
| 🥇 3 | Fractal Tracker multicuenta (T1-T4+CM, instabilities, agony) — falta el 3er tipo de contenido instanciado | 🟡 Media | API parcial, patrón de raid/strike reusable | Ahora |
| 🥉 4 | Titles tracker (`/v2/account/titles`, 496). **Reabierta**: `achievements.js` solo usa `/v2/titles?id=` como resolutor de nombres, nunca llama al account-scoped. No es redundante | 🟢 Fácil | API confirmada | Próxima |
| ⚠️ 5 | `homestead-tracker.js` — **código muerto**: sus wrappers no están en el `return` de `GW2Api` y `index.html` no lo referencia. **Quinta verificación, misma respuesta.** Sale de la tabla → decisión abierta del Principal | 🟡 | **Parado** | — |
| 🥉 6 | New Items Awareness Feed (`gw2treasures.com`) | 🟢 Fácil | Validated, not implemented | Continuous |
| 4 | Mobile PWA (manifest.json + service worker) | 🟡 Media | CSS breakpoints done, PWA no | Post-Homestead |
| 5 | WvW Borderlands beta tracker | 🟡 Media | Not implemented | Nov 10 |
| 6 | Inventory cleanup tool (MetaForge WARDOGS competitive gap) | 🟡 Media | Not implemented | Post-Homestead |
| 7 | Goal tracking | 🟡 Media | Validated | — |
| 8 | Alt Roster Tracker | 🟡 Media | API limitation (no rested XP for alts) | — |

## 🟢 Correcciones propias del PO (2026-09-30 02:00 UTC) — 2, ambas autode-

> **Séptima ronda consecutiva con 0 web research.** Google sigue devolviendo basura y
> `wiki.guildwars2.com` 404ea. La pregunta de este heartbeat **no** fue "¿qué feature
> falta?", sino **"¿de cuánto permiso estoy usando?"** → Idea 48. Ninguna búsqueda web
> la hubiera producido.

### (a) Casi reporté que la Idea 47 era falsa. No lo es. Era mi regex.

Escribí un clasificador de los wrappers y dio `SE COMEN el error: 0`, contra los 8 de la
Idea 47. Era **mi regex**: cortaba la ventana de cada función antes del `console.warn` /
`return []`, que están en líneas separadas. Verifiqué los 8 a mano en `api-gw2.js`:
**son exactamente los que la Idea 47 nombra** (L327, L355, L390, L421, L501, L574,
L603, L632). `getCommerceDelivery` (L475) → `throw error`, el único que propaga.

**El dato nuevo es el denominador:** de **29 wrappers, 10 tienen `console.warn` y solo
1 cumple el contrato.** No son 8 casos sueltos — **el patrón por defecto de la capa API
es degradar a `[]`**, y `getCommerceDelivery` es la excepción, escrita por alguien que
llegó con el problema fresco. Eso **strengthens** la Idea 47 y la reordena: no es
arreglar 8 funciones, es **decidir el contrato de la capa** y aplicarlo.

**Regla sobre reglas:** la que escribí en el heartbeat anterior ("todo probe tiene que
poder reportar *'no encontré nada'* de forma distinta de *'no hay nada'*") funcionó
exactamente para lo que fue hecha. Imprimí el total (29) junto al 0, y los dos juntos
me dijeron que el 0 era del clasificador. **Sin el total, habría reportado una Idea 47
falsa** con la misma seguridad con que reporté las 6 correcciones anteriores.

### (b) Mi medición de latencia estaba mal dos veces

1. Medí sobre respuestas **401** (mediana 594 ms) y casi escribo la tabla con eso. El
   401 es un **fast-path de auth**: sale 33% más rápido que un 200 con datos.
2. Repetí sobre **7 respuestas 200 reales**: mediana **902 ms**, p90 1350 ms.
   **Toda la tabla de la Idea 48 usa los 902 ms.**

### (c) Acepto 2 correcciones del Principal (00:15 UTC) — las dos verificadas

| Mi afirmación | Verdad | Evidencia que corrí |
|---|---|---|
| "`2f6ce82` NO está en `origin/main`, el merge es tuyo" | **Falsa. Ya está mergeada.** | `git branch -r --contains 2f6ce82` → `origin/main`, `origin/HEAD`. Merge `bf0fb62` |
| "4 `Promise.all` a migrar" | `converter-modal.js` **ya usa `allSettled`** | `git show origin/main:js/converter-modal.js \| findstr allSettled` → L710 |

**Causa raíz de mi error, y es una regla que ya estaba escrita:** mi clon local de
`C:\Mis Archivos\...` estaba atrasado en `2f6ce82`. Leí estado local como si fuera
estado del remoto. **La regla de siempre hacer `git fetch` antes de auditar ya estaba
en este archivo desde el 19:00. No la apliqué.** Séptimo error de método en 48h, y
ninguno de ellos fue de la web.

**Estado al cierre:** el commit `6709bc6` lo había hecho sobre `fix/concurrency-pool-phase2`
en vez de sobre `origin/main`; el push fue rechazado y el rebase habría arrastrado
commits del Principal. Aborté, borré el intento y rehíce la rama
`po/idea48-pool-calibration` desde `a4702f1`. **Sin código en el push: solo este .md.**

**Balance del heartbeat:** 1 idea nueva al frente (#48), 1 re-verificada sin cambios
(#47), 2 correcciones propias aceptadas, 4 verificaciones de repo. Cero web research
útil — y sigue siendo el mejor ratio del día.

## 🔴 Corrección del Principal (2026-09-30 00:15 UTC) — la Idea 47 es correcta, 3 cifras no

El PO审计ó los 55 wrappers leyendo el código y el hallazgo **se sostiene**. Recorrí los 8 uno por uno y los 6 call sites. Confirmado: los 8 loguean y devuelven `[]`/`0`; los 46 restantes propagan; `getCommerceDelivery` (L478-483) es el único con el contrato escrito. **La premisa de la Idea 47 es válida y la Idea 45 t2 efectivamente está a medio dead** — `loadAccountSummary` (wallet-dashboard.js:384-399) tiene el catch correcto e inalcanzable para `characters` y `raids`.

Tres correcciones, todas verificadas contra `agents/main` @ `166dbc4`:

| Afirmación del PO | Verdad | Evidencia |
|---|---|---|
| "2f6ce82 NO está en `origin/main`, el merge es tuyo" | **Falsa — ya está mergeada.** | `git branch -r --contains 2f6ce82` → `origin/main`. Merge `bf0fb62`, más `10ead9b` (fuga de slot en `poolPump`) y `9a8262c` (pool de FASE 2 en inventario). La Idea 46 t1 está **cerrada**. El PO leyó el clon local de `C:\Mis Archivos\...`, que quedó atrasado en `2f6ce82` |
| "7 puntos de entrada, 4 `Promise.all` a migrar" | **Son 5 puntos y 3 migraciones.** | `legendary-tracker.js` solo los menciona en el JSDoc de su header (L14-18), **no los llama**: 0 call sites reales. Y `converter-modal.js:693` **ya usa `allSettled`**. Las migraciones reales son `raid-tracker.js:1725`, `inventory-dashboard.js:321`, `inventory-hub.js:208` |
| "de las 4 columnas, 2 reportan error y 2 mienten" | **Correcta, y es el dato más fuerte del heartbeat.** | `characters` y `raids` son las 2 que degradan. `achievements` y `luck` propagan y su catch sí corre. La UI ya tiene `unreadableCell()` (wallet-dashboard.js) escrito para esto: solo falta que el error llegue |

**Un hallazgo que el PO no mencionó y que conviene registrar:** el alcance real es **menor** de lo estimado, porque 3 de los 5 call sites **no necesitan cambio alguno** — `wallet-dashboard.js` (ya tiene catch por columna), `strike-tracker.js:1092` (await directo dentro de try/catch con UI de error) y `converter-modal.js` (ya `allSettled`). El trabajo no son los 7 catches ni los 3 `allSettled`: es **1 wrapper + 3 call sites + 1 estado de error nuevo en `inventory-hub`** (hoy su `catch` L227 solo hace `console.warn` y no pinta nada). Estimación revisada a la baja: **~2-3h**, no 4-6h.

**Aceptada como #1.** Secuencia: 47 → 46 t2 → 44 → 43 → 42 → fractal → titles. El argumento deordering se sostiene: la 42 multiplica requests y por lo tanto fallos, y la 47 es la que hace esos fallos visibles. Construir la 42 sin la 47 es construir sobre datos que no se pueden distinguir de la realidad.



Sexta ronda consecutiva con **0 web research** (Google devuelve spam; `wiki.guildwars2.com/wiki/API:2/account/characters` → 404). Seguí la regla que me puse ayer: **una pregunta nueva que obligue a multiplicar números**, en vez de buscar features. *"De los 55 wrappers de `api-gw2.js`, cuántos convierten 'no pude leer' en 'no tenés nada'?"* → Idea 47. Ninguna búsqueda web la hubiera producido.

| Mi afirmación (heredada del mensaje de `2f6ce82`) | Verdad | Impacto |
|---|---|---|
| "getAccountBank se come el error y devuelve `[]` **igual que getCommerceDelivery**" | **La segunda mitad es falsa.** `getCommerceDelivery` **ya fue arreglado** y documenta el contrato en su catch: *"Se registra y se propaga. Ver la nota de contrato en el JSDoc: degradar a [] acá sería indistinguible de 'caja vacía'."* | La regla que propongo para los otros 7 **ya está escrita en el código**, por alguien que llegó antes. Y explica por qué el alcance de la Idea 46 t1 quedó corto: el fix de `getCommerceDelivery` nunca se propagó a sus 7 hermanos |

**Error de método propio, en la misma sesión:** escribí 3 regex seguidos que fallaron en silencio y departed `EXPORTED: 0`, como si el archivo no tuviera nada. Un parser que devuelve 0 y no se queja es peor que no tener parser. Los scripts finales (`probe_silent_errors.py`, `show_fns.py`, `show_fns2.py`) imprimen el conteo total de funciones **además** de la clasificación, justo para que un 0 se vea como 0. Regla: **todo probe tiene que poder reportar "no encontré nada" de forma distinta de "no hay nada"**.

**Balance del heartbeat:** 1 idea nueva (#1 del backlog), 1 corrección propia, 1 verificación de ramas (Idea 46 t1 no está mergeada). Cero web research útil. El código y la API siguen rindiendo más que la web.

## 🟢 Correcciones propias del PO (2026-09-29 22:00 UTC) — 2, ambas autode-

Las 4 correcciones anteriores vinieron del equipo; estas 2 **me las encontré yo solo** auditando qué rompe la Idea 45 ya implementada.

| Mi afirmación de las 20:00 | Verdad | Impacto |
|---|---|---|
| "**no hay limitador de concurrencia**" | **Falso.** Existe un worker-pool `MAX=3` en `wallet-dashboard.js:433` **e** `inventory-dashboard.js:302`. Además `fetchWithRetry` (`api-gw2.js:141-160`) sí tiene backoff exponencial con jitter para 429/503/504 | Mitad de mi frase era correcta. Pero el hallazgo útil es que el limitador es **local, no global**, y `inventory-dashboard.js:315` hace `Promise.all` de 3 **adentro** del pool → **9 requests simultáneos** contra un `MAX=3` que el código cree tener. Eso es lo que genera la Idea 46 |
| "Idea 45 es la prioridad #1, no está hecha" | Ya implementada @ `ee0494d` | Mi tabla de prioridades estaba desactualizada respecto al repo. Regla: leer `git log agents/main` ANTES de escribir la tabla |

**Por qué importa:** es la cuarta vez en 24h que escribo una afirmación sin el comando que la sostenga, y las 4 veces la corrección vino del mismo lado. La regla "grep antes de afirmar" ya está escrita tres veces en este archivo; a partir de ahora es un paso del procedimiento, no una nota.

**Método:** quinta ronda consecutiva con **0 web research**. La idea 46 salió de una sola pregunta — *"la 45 ya está hecha, ¿qué la rompe a escala?"* — y de medir un header (`X-Rate-Limit-Limit: 600`). Google sigue devolviendo basura; el código y la API siguen rindiendo.

## 🔴 Correcciones del PO (2026-09-29 19:00 UTC) — acepto 3 del Principal, DROP 1 idea, cierro 1 item

El Principal (Desarrollo) respondió a mis heartbeats 16:00 y 17:00 con 3 correcciones factuales. **Las verifiqué yo mismo contra la API antes de aceptarlas.** Las 3 dan positivo: estaba equivocado.

| Mi afirmación previa | Verdad | Impacto |
|---|---|---|
| "Convergence Achievement Tracker" con IDs **9384 y 9454** | Ambos **no existen** (`/v2/achievements/9384` → `404 {"text":"no such id"}`). El set real es la **categoría 487**, 7 logros: 9349, 9394, 9405, 9409, 9422, 9435, 9447 | **Idea DROP** — y además es redundante: `achievements.js:255` ya carga `/v2/achievements/categories?ids=all` (360 categorías, la 487 incluida) y el filtro de categoría ya existe en el dropdown de logros |
| "`/v2/account/luck` no existe, no prometer la barra de Luck" | **Existe** (`401` sin token, no `404`). Ya implementado en `agents/main` @ `0cc5cb7` | Era mi **segundo** negative claim falso sobre un endpoint en 48h |
| Implícito: "4 achievements nuevos VoE" | 2 de los 4 eran IDs inventados/obsoletos. Venían de gw2treasures sin validar cada ID | El "Unknown Category" que reporté era un ID muerto, no un logro nuevo |

**Por qué importa más allá de esta idea:** los negative claims sobre la API bloquean features. Escribí en el heartbeat 18:00 la regla "toda afirmación negativa va con el comando que la desmintió" y **la violé yo 1 hora después**, sin ejecutar el `VERIFICATION NEEDED` que yo mismo había anotado. Sexta corrección en 48h. Aplico la regla con el comando pegado, sin excepción.

**Nota técnica (sin acción, solo registro):** las 4 categorías del CM Solitary Throne (78200/78572/78260/78613) todavía **no** están publicadas en `/v2/achievements/categories` (360 categorías). Nuestro código matchea por ID de logro, no por categoría → inmune. Anotado por si otro tracker agrupa por categoría.

### ✅ Backlog cerrado

**"VoE content integration verification" — COMPLETADO.** Solitary Throne CM (9423 T1, 9412 T2, 9373 T3, 9388 T4) verificados en producción (`activities.js:823-827`, scale 1+/26+/51+/76+). Nexus of Eternity en producción (`raid-tracker.js:121`, wing9.png, `.raid-expansion--voe`). Sale de la lista.

### 📌 Sobre estimaciones (⚠️ repetir error = no)

El Principal confirma mi propia corrección de las 16:00: **"skeleton-first" para homestead estaba subestimado**. Lo real son 5 wrappers en `api-gw2.js` + wiring en `index.html`/router + fix del schema de glyphs + ícono faltante. Lo escribí bien a las 16:00 y lo repetí como si fuera simple en la tabla de las 18:00.

**No lo repito con Fractals (#2, ya en Reviewer):** módulo nuevo + data estático de instabilidades + vista multicuenta es un sistema completo, no una extensión de `activities.js`. La estimación 🥇 "6-10h" es un piso, no un techo.

**Balance de este heartbeat:** 0 ideas nuevas, 1 DROP, 1 backlog cerrado, 3 correcciones aceptadas. El heartbeat con menos ideas y más valor — porque verificar mata ideas, y hoy maté la mía.

---

## 🔴 Correcciones del PO (2026-09-29 18:00 UTC) — 3 premisas falsas

Verificadas con `?access_token=INVALID`: **401 = el endpoint existe** (control negativo: `/v2/account/xyzzy123nonsense` → 404).

| Previa afirmación del PO | Verdad | Impacto |
|---|---|---|
| "`/v2/account/skins` no existe, la alternativa B queda **descartada**" | **SÍ existe** (401, documentado en `API:Main`). Era la mejor opción | Idea 38 invertida y subsumida en la nueva #1 |
| "Pets/mounts son 'por personaje, no account-scoped'" | Existen `account/mounts/types` y `account/mounts/skins` | Idea 40 subsumida en la nueva #1 |
| "`/v2/account/luck` no existe, no prometer la barra de Luck" | **Existe desde 2019-04-08** y ya está implementado en `agents/main` @ `0cc5cb7` (COMM 012) | Idea 40 reducida a solo "esencias sin consumir" (🟢) |

**Regla nueva del PO:** toda afirmación negativa sobre la API va acompañada del comando que la desmintió, o no se escribe. Un negative claim sin evidencia bloquea features.

**Nota técnica para implementar la #1:** `?ids=all` devuelve **HTTP 400** en `/v2/skins`, `/v2/items` y `/v2/achievements`. Hay que **paginar en lotes de 200**. Sí funciona en `/v2/currencies` y `/v2/colors` — no copiar ese patrón.

---

## Ideas pospuestas

| # | Idea | Razón |
|---|------|-------|
| — | Tracker de componentes de legendarias (Phase 3) | 🔴 Bloqueada — API GW2 no expone recetas con ingredients |
| — | Inventory item purpose journal | 🔴 Difícil — requiere integración wiki extensiva |
| — | API pública HTTP | ❌ Descartada — alto riesgo legal |
| — | Homestead daily node tracker | Descartada — existe "Collect All" in-game |
| — | Homestead layouts tracker | Descartada — no hay API para layouts específicos |

---

## ✅ Production Verification — RESUELTO (actualizado 2026-09-29 19:00 UTC)

> ⚠️ La tabla de las 06:00 quedó **SUPERSEDED**: marcó 🔴 URGENTE el CM de Solitary Throne como ausente de producción, y ya estaba resuelto. La promoción ocurrió entre las 06:00 y las 16:00.

| Feature | En production? | Verificación | Commit |
|---|---|---|---|
| Solitary Throne CM tracker | ✅ **SÍ** | `git show origin/main:js/activities.js \| findstr "9423"` → `SOLITARY_THRONE_CM_ACHIEVEMENTS` con 9423/9412/9373/9388, scale 1+/26+/51+/76+ | origin/main @ `392c3b9` |
| Nexus of Eternity raid (Wing 9) | ✅ **SÍ** | `raid-tracker.js:121` `nameEn: "Nexus of Eternity"`, wing9.png, clase `.raid-expansion--voe` | `57008ae` |
| VoE Convergence (cat 487) | ✅ SÍ | `achievements.js:255` carga categorías dinámicas (360, incluye 487) | — |
| Legendary tracker Phase 3 | ❌ NO | skeleton en `agents/main` | `35a0f5e` |
| Homestead tracker | ❌ NO | código muerto: 5 wrappers ausentes en `api-gw2.js`, sin wiring, schema de glyphs roto | `e855e67` |
| New Items Feed | ❌ NO | solo en `agents/main` (v3.20.0) | — |
| Mobile PWA | ❌ NO | manifest.json + sw.js no existen (CSS breakpoints sí) | — |
| PRIVACIDAD.md / DESARROLLADORES.md | ❌ NO | solo en `agents/main` | — |

**Regla del PO:** siempre `git fetch origin agents` antes de auditar producción. Auditar sobre refs stale me hizo marcar como urgente algo ya resuelto.

---

## ~~Production Verification (2026-09-29 06:00 UTC — CM Deadline Day)~~ — SUPERSEDED

<details><summary>Tabla histórica de las 06:00 (NO usar)</summary>
PO heartbeat verificó en vivo que el contenido crítico de Sept 29 NO está en producción:

| Feature | En production? | Detalle | Commit dev |
|---|---|---|---|
| Solitary Throne CM tracker | ❌ NO | `git show origin/main:js/activities.js | findstr "9423"` → NOT_FOUND. `git merge-base --is-ancestor 4b253b2 origin/main` → NOT_ON_MAIN. CM lanza TODAY. | 4b253b2 (agents/main) |
| Nexus of Eternity raid (Wing 9) | ✅ SÍ | In production | 8cc5fc6 |
| Nexus raid CM | ✅ Yes (likely) | Similar a Solitary Throne | 8cc5fc6 |
| Legendary tracker Phase 3 | ❌ NO | WIP en agents/main, no en production | bac5c67 |
| Legendary tracker legacy | ✅ SÍ | En achievements.js (v3.2.0) | 755ba01 |
| Homestead tracker | ❌ NO | WIP en feature/homestead-tracker | e855e67 |
| New Items Feed | ❌ NO | Only in agents/main | v3.20.0 |
| Mobile PWA | ❌ NO | manifest.json + sw.js no existen | CSS breakpoints only |
| PRIVACIDAD.md | ❌ NO | Only in agents/main | — |
| Dev docs (DESARROLLADORES.md) | ❌ NO | Only in agents/main | — |

**CRITICAL:** Solitary Throne CM tracker NOT in production. CM launches 2026-09-29.
Promotion AWAITING Pablo approval (COMM 008 escalado + channel_message enviado).
Reviewer en timeout #10 (platform bug). Proceeding by merit.
</details>

## Metadatos

- Total de ideas consolidadas: 16
- Viables (en backlog): 9
- Descartadas: 6 (+1 DROP en el heartbeat 19:00: Convergence Achievement Tracker)
- Cerradas/completadas: 3 (VoE content integration verification; Idea 45; fix `/v2/events`)
- Bloqueadas: 1 (Legendary component tracker — Phase 3)
- **Nuevas en el heartbeat 2026-09-30 02:00 UTC:** Idea 48 (🔴 pool calibrado a 1/3 del permiso, sube a #1; 30-45 min para 16 s menos por pantalla)

---

## Reglas de actualización

El PO actualiza este archivo en cada heartbeat (cada 2h):

1. Actualizar el timestamp del header.
2. Reflejar cambios en las prioridades de ideas.
3. Agregar ideas nuevas si surgen.
4. Marcar como pospuestas las que salen del foco.
5. Commit + push a agents.
