# DASHBOARD_PO_IDEAS.md — Ideas del PO para el dashboard

> Actualizado: 2026-09-30T23:00:00Z (Heartbeat PO ronda 18 — 🔴 **ALERT-84: "Armería Legendaria" es un item de menú VISIBLE que decía "Cargando catálogo de legendarias…" PARA SIEMPRE. `loadLegendaryData()` es un stub que resuelve `[]` y el renderer que pone "Cargando" es el último paso. T1 (estado honesto) ya está hecho en `d64e688`; T2-T5 abiertos.** Entra también la ronda 17, que estaba solo en el workspace del PO. Dos P3: el censo de las 8 familias —que NO es idea— y las 3 citas de línea del test ALERT-84, que son de `main` y no de la rama donde viven.)
> Mantenedor: PO (product-owner)

---
## ACTUALIZACION 2026-09-30 23:00 UTC — Heartbeat PO ronda 18 — 🔴 ALERT-84: un item de menú VISIBLE que decía "Cargando…" para siempre

> Encadre (corrección del Principal, aceptada): el **censo de las 8 familias** es NOTA de P3, no idea — queda acá abajo como nota. Lo que va al dashboard es **ALERT-84**, que es de otra clase: no falta una feature, falta un **estado**.

Decimoséptima ronda con 0 web research útil (17ª vez). La pregunta fue **"¿qué pasa en la Bóveda cuando GW2 agrega contenido nuevo?"**, porque gw2treasures acaba de listar el Nexus of Eternity, Tenebral Ward y Convergence.

### El hallazgo

| Pieza | Estado |
|---|---|
| `index.html:761` item de menú `navLegendaryArmory`, con icono | ✅ **VISIBLE** |
| `router.js:125/1562/1816` ruta | ✅ funciona |
| `index.html:539` `<section id="legendaryArmoryPanel">` | ✅ existe |
| `index.html:999` `<script legendary-tracker.js>` | ✅ se carga |
| `legendary-tracker.js:213` `loadLegendaryData()` | 🔴 **STUB**: `not implemented (Phase 2)`, resuelve `[]` |
| `legendary-tracker.js:189/199` los 2 renderers | 🔴 decían **"Cargando…"** y nada lo reemplaza |

**Lo que se veía:** clic en "Armería Legendaria" → **"Cargando catálogo de legendarias…"** → **para siempre**. Sin timeout, sin error, sin reintento. `doRefresh()` llama al stub que resuelve `[]` en microsegundos, y después llama al renderer — que ES el string de "Cargando". El ciclo termina ahí.

**Es peor que un error:** un error se investiga, un "Cargando" infinito se espera.

### Los 101 KB ya escritos y no cargados

| Archivo | Bytes | ¿Se carga? |
|---|---|---|
| `js/legendary-data.js` — catálogo de **206 legendarias** | **85.813** | 🔴 **NO** |
| `js/render-catologo.js` — grid 5 col + barra de filtros + vista progreso | **17.950** | 🔴 **NO** |

Ambos commiteados, ambos ausentes del HTML. Y `legendary-data.js` ya se autoexpone (`root.LegendaryCatalog`) — `legendary-tracker.js` nunca lo lee.

### Y si se cargaran, NO funcionarían

`render-catologo.js:361` llama `registerRender({filterBar, catalogGrid, skeleton, progress})`.

| Símbolo | lo pide render-catologo | lo ofrece legendary-tracker |
|---|---|---|
| `registerRender` | **5 usos** | 🔴 **0** |
| `getState` | **1 uso** | 🔴 **0** |

API pública real: `initOnce, activate, deactivate, refresh, prefetch, _debug, Route`. **`render-catologo.js` se escribió contra una versión de `legendary-tracker.js` que nunca existió.** El guard `typeof … === 'function'` es falsy → reintenta a 50 ms → `console.warn` → nada.

> **Por qué esto importa en la práctica:** "agregar los dos `<script>`" es la solución obvia y es **incorrecta**. Da el mismo resultado visible (nada) más dos warnings. El orden es: **`loadLegendaryData()` primero → `registerRender` después → recién ahí cargar los archivos.**

### La deriva de catálogo, medida (y salió limpia)

| Catálogo | App | API oficial | Faltantes | Fantasmas |
|---|---|---|---|---|
| legendarias | 206 | **206** | **0** | **0** ✅ |
| raids (encuentros) | 29 | **30** | 1 (`camp`) | 1 (`vloxx`) |

**El catálogo de legendas está perfecto.** Deriva cero, 2 días después de generarse. Eso **descarta** mi hipótesis de la ronda para legendas.

- 🔴 **`vloxx` sigue roto** — el ala de CM del Nexus of Eternity, wing 9, **contenido nuevo de esta semana**. Quinto caso de la Idea 52: se arreglaron 4 renombres, no el que no existe.
- 🟢 `camp` sin cablear. 1 línea.

### 🔴 La cadena de actualización no es reproducible

```
_build_legendary_data.py    : OK (versionado)
_fetch_thematic_prices.py   : OK (versionado)
_legendary_items_full.json  : *** FALTA ***  <- el input del build
```

`git log --all --diff-filter=D` **nunca lo muestra borrado** → **nunca fue commiteado**. No está en `.gitignore`. El archivo dice *"NO modificar manualmente. Para actualizaciones, usar `_build_legendary_data.py`"* — **y ese script no se puede correr.** La instrucción apunta a un camino cerrado.

Y el que debería vigilarlo no puede: el propio `legendary-data.js:11` dice *"Pablo mantiene este archivo manualmente. **El PO detecta novedades en Heartbeat.**"* — el refresh depende de que yo me acuerde. Eso no es un proceso, es una coincidencia.

### Tramos

| Tramo | Qué | Dificultad | Estado |
|---|---|---|---|
| **T1** | "Módulo en construcción" en vez de "Cargando…" | 🟢 ~10 min | ✅ **HECHO `d64e688`** |
| **T2** | `vloxx` + `camp` — cierra la Idea 52 | 🟢 ~30 min | 🔴 **abierto, primero de la lista** |
| **T3** | Implementar `loadLegendaryData()` de verdad | 🔴 ~2-4 h | 🔴 abierto, **va al Reviewer** |
| **T4** | `registerRender` + `getState`, y recién ahí cargar los 2 scripts | 🔴 ~1-2 h | 🔴 abierto, **va al Reviewer** |
| **T5** | Build reproducible (que el script baje el input, o versionarlo) | 🟡 ~1 h | 🟡 a definir |
| T6 | ~~Test de "catálogo == API"~~ | ❌ **NO** | — |

**Por qué NO un test de deriva como red:** la API cambia todos los días y un test que falla en cada patch entrena a ignorar al test. **La red correcta es T5**: si el build es reproducible, regenerar es una orden, no una decisión.

### Regla que sale

*Un esqueleto que llega hasta el menú deja de ser un esqueleto.* La idea sana —"base primero, Phase 2 después"— es correcta **hasta que `index.html` carga el esqueleto y el `router` publica la ruta**. Ahí dejó de ser etapa interna y pasó a ser **una promesa**, y la app no tiene forma de retractarla porque no existe el estado "todavía no".

*Corolario:* si un plan tiene "Phase 3 Commit 1" en el backlog, la pregunta no es "¿está el código escrito?" sino **"¿está cableado, y contra qué?"**.

---

## 📌 P3 (nota, no idea) — ronda 18: el censo de las 8 familias, y por qué NO va al dashboard

**Medidor trackeado:** `node tools/idea50-censo-claves.mjs` (dentro de `46b2d7f`, forzado con `git add -f` porque `tools/.gitignore` ignora todo).

**8 FAMILIAS de clave de caché en 3 módulos**, fuera del registro de `cacheClear`: `characters:cached` · `characters:maps` · `characters:pois` · `characters:prof_icons` · `characters:race_icons` · `gn_activities_stones_` · `gw2_currencies_cache_v1` · `psna:schedule`. + 1 marcador de frescura (~10 B, no crece).

**La que decide si el título del botón es cierto:** `characters:cached:<hash>` — 40 personajes por cuenta × 27 cuentas, TTL 5 min. Con 40 KB de residuo el título cierra el tema; con 2 MB hay que registrar esa clave.

**Por qué esto NO es una idea:** un censo es una lista, y las listas se pudren — el caso 8 siempre aparece por accidente de alguien, no por un test (la Idea 57 aplicada). Además **el script no dice el tamaño**, que es el único número que decide si "Liberar la caché de la API" es cierto, y no se puede medir sin la cuenta de Pablo. Por eso el botón ahora lo DICE solo (`keptBytes`).

**Corrección propia:** mi ronda 17 annunció "8 claves en 4 módulos". El número de módulos estaba mal (son 3: `characters.js`, `activities.js`, `app.js`) y el título del API ahora dice lo correcto. **Regla: un número sin unidad es un número que la próxima vez se cita mal** — y esta vez la unidad la escribí mal yo.

---

## 📌 P3 (nota) — ronda 18b: las 3 citas de línea del test ALERT-84 son de `main`, no de la rama donde viven

Medido con `git show <rev>:index.html` y conteo de líneas, sobre las 3 revisiones:

| Cita en el test y en el comentario del `.js` | `main` / `origin/main` | `feat-idea50-boton-cache` (donde vive) | ¿Cierta? |
|---|---|---|---|
| `index.html:750` (item de menú) | **750** | **761** | 🔴 off-by-11 |
| `index.html:528` (el panel) | **528** | **539** | 🔴 off-by-11 |
| `index.html:988` (el `<script>`) | **988** | **999** | 🔴 off-by-11 |
| `router.js:125` (la ruta) | 125 | 125 | ✅ |

**Por qué exactamente 11:** la rama agrega el botón de caché en `index.html:283-292` (+11 líneas antes de todo lo demás). Las 3 citas se tomaron de `main`, que no tiene el botón. Y como el merge va a traer el `index.html` de la rama, **`main` post-merge va a tener las 3 líneas en 761/539/999**: las citas quedan falsas y lo van a quedar para siempre.

**El contraste que lo confirma:** `settings-manager.js:550` cita `index.html:289` — el `title` del botón — y esa **sí es cierta en la rama**. Mismo repo, mismo commit, citation correcta e incorrecta. La diferencia no es una regla del equipo: es si quien escribió la línea estaba mirando el archivo del commit o el de `main`.

**Por qué NO lo escalate como bug:** el test no verifica números de línea (verifica regex sobre contenido), así que **no hay riesgo de fallo funcional**. Es documentación. Pero es documentación del tipo que el propio ALERT-84 vino a arreglar, y ahora está en el archivo que dice *"un módulo a medio hacer que dice la verdad"*.

**Regla que sale:** *una cita de línea sin el árbol al que pertenece es una cita sin unidad.* La unidad de `index.html:750` es **`main@d328969`**. Es la misma clase que el "8 sin unidad" del censo, y en este caso la que insistí en la unidad fui yo.

**Extra del mismo commiteo — el guard de texto ajeno está a medio cubrir:** `tests/alert84….test.js` tiene 2 glitches de generación en los comentarios: **L36** *"lo que hay que`**`PRIMARY`**`: si hay un"* y **L234** *"el PO se **`savings`** de investigar"*. `tools/scan-cjk.py` (el guard que el repo se armó para exactamente este defecto) da **0 matches**: `PRIMARY` y `savings` son ASCII, y el regex solo cubre CJK y cirílico (U+0400-04FF). Es la primera vez que un glitch mío de generación llega a un archivo commiteado; las 2 anteriores fueron en chat. **El guard cubre la mitad de mi defecto, y la mitad que no cubre es la que ya tocó el repo.**

---


## ACTUALIZACION 2026-09-30 20:00 UTC — Heartbeat PO ronda 16 — 🔴 IDEA 63: cambiar de cuenta te puede dejar Personajes en blanco, y no hay forma de saber por qué

Quinceava ronda con 0 web research útil (Reddit 403 por 15ª vez, `gw2treasures/feeds` 404 por 3ª). La pregunta fue **"¿qué sobrevive a un F5?"** — inventario de lo que la app guarda. El de forwards ya lo conocía; el relevante era el reverso.

### El hallazgo

**13 filtros en 3 módulos. Los 3 sobreviven al cambio de cuenta. En 2 de los 3, si el filtro vacía la lista, no hay ni una palabra.**

| Módulo | Filtros | ¿Se limpian al cambiar de cuenta? | Si vacían la lista, ¿qué se ve? |
|---|---|---|---|
| **Personajes** `characters.js:102` | 4 | **NO** | 🔴 **nada** — `renderCards` (`:1227`) itera una lista vacía |
| **Buscador unificado** `app.js:1045-1049` | 5 | **NO** | 🔴 **nada** — `app.js:527-531` vacía contenedores y `return` |
| **Logros** `achievements.js:850-895` | 4 | **NO** | 🟢 *"No hay logros que coincidan con los filtros"* (`:674`) |

Los 3 handlers de `gn:tokenchange` que encontré no tocan filtros: `characters.js:1469-1479`, `achievements.js:1100-1107`, y el de `app.js` (no revisado entero — marcado como probable en el PRE_BACKLOG).

**Logros es el único que lo hace bien, y por qué lo hace bien es el dato útil:** su vacío nombra la causa. Eso convierte "algo falló" en "yo lo filtré". Los otros dos no pueden ni eso.

### El agravante: la página también sobrevive, y da el vacío SIN NINGÚN FILTRO

- `state.pagination.page` solo se resetea en los 3 handlers de filtro (`characters.js:1045/1051/1057`).
- El handler de tokenchange (`:1469`) **no lo toca**. `loadCharacters()` **tampoco**.
- `renderList()` `:1103` → `slice((page-1)*20, +20)`.

**Flujo real, sin un filtro activo:** cuenta A con 30 personajes → Pablo va a **página 2** → cambia a la cuenta B con 12 → `slice(20,40)` sobre 12 = **vacío**. Y `renderPagination()` `:1389` marca activo `i === page` = 2, pero con `total=12` solo existe la página 1 → **ningún botón de página aparece activo**.

Umbral: ">20 personajes después de filtrar". Las cuentas de Pablo son veteranas. Es lo normal.

### Por qué es peor que el `0%` de Suerte

Misma clase (dato silenciosamente incorrecto), pero `0%` **puede ser verdad**, así que Pablo duda. **Un panel en blanco no es un estado válido** de una cuenta con personajes: no hay nada que dudar. No puede distinguir entre las 4 causas — y la única que es culpa de la app es la que gana.

### Desde cuándo

`git log -S`: filtros, paginación y tokenchange entran **en el mismo commit** `0a3d25a` (**2026-03-20**), el que creó el módulo. **No es una regresión: nunca estuvo bien. 194 días.** Y `findstr` de "sin resultados"/"no hay personajes" en `characters.js` → 0 apariciones: el estado vacío nunca existió.

### Tramos

| | Alcance | Dif | Nota |
|---|---|---|---|
| **T1** | Reset de `state.filters` + `page = 1` en los handlers de tokenchange (3 líneas) | 🟢 | Cierra el bug de datos. **No va al Reviewer**: estado local de UI, `ALERT-48` no aplica |
| **T2** | Estado vacío con texto + botón limpiar en Personajes y Buscador unificado | 🟢 | **Reutilizar el patrón que ya funciona** (`achievements.js:674`), no inventar uno. El botón ya existe en `app.js:1051`, no en `characters.js` |
| **T3** | Persistir filtros **por cuenta**, como ya hace el Wallet Dashboard con `sort`/`selectedCurrencies`/`summaryFields` (`wallet-dashboard.js:358/374/398`) | 🟡 | **Decisión de Pablo, no del PO.** El patrón ya está aceptado en el producto y el buscador no lo tiene. **Bloqueada por T1+T2**: con chip visible + botón limpiar, persistir es seguro |
| T4 | `perPage` fijo en 20 sin selector | 🟡 | Anotada, **NO se propone**. Feature, no fricción |

### Secuencia

**63 T1 → 63 T2 → [decisión de Pablo] → 63 T3**

49G y 62 siguen en cola detrás, y 62 T1 es de una línea.

---

## ACTUALIZACION 2026-09-30 18:55 UTC — Heartbeat PO ronda 15 — 🟡 IDEA 62: el 85% de tu caché vence cada 2 minutos, y ya tenés un botón que fuerza la recarga

> **Entra acá ahora.** Estaba solo en el workspace del PO (alertado en el HB#64 del Principal: *"tu ronda 15 NO está en el mirror"*). Resumen; el detalle está en el PRE_BACKLOG del PO.

Medido en `api-gw2.js:320-339`: **5 claves con TTL de 2 minutos** (`ach_acc`, `bank`, `materials`, `wallet`, `comm_prices`) = **la cuota entera y sobra**. La más cara es `ach_acc` = **11.88 MB**.

**El argumento que cierra la idea:** `achievements.js:834` ya tiene `loadAll({nocache:true})` en el botón de refrescar → `getCache` devuelve `null` y se re-descarga. **El TTL de 2 min no es el mecanismo de frescura: es un piso de ancho de banda.** Subirlo a 30 min no saca ninguna capacidad que hoy tengas.

**El costo real no es el de disco:** al vencer el TTL, `getCache` (`:623-635`) **no borra la entrada**, y `putCache` (`:636-640`) **re-hace `JSON.stringify` de los 440 KB y re-escribe la clave entera**. Cada vencimiento paga **440 KB de stringify por cuenta, por ciclo**.

| | | Dif |
|---|---|---|
| **62 T1** | `ACH_ACC` 2 min → 30 min (una línea, `:361`), y `BANK` igual (`:348`) — su comentario *"inventario cambia poco"* está **en el mismo renglón** que un TTL de 2 min | 🟢 ~15 min |
| **62 T2** | *Stale-while-revalidate*: `getCache` devuelve lo vencido **y** dispara el refetch en background. Hoy la expiración **castiga** con una espera; con esto no se nota. **Ojo:** `getCache` es **síncrono** y tiene 4 call sites que usan el valor de retorno → hay que decidir si el refetch lo dispara `getCache` o el caller | 🟡 ~2 h |
| **62 T3** | Mostrar *"actualizado hace X"* con el `entry.ts` que **ya se guarda** (`putCache:637`) | 🟢 |

**No la mezclo con la 49G, y el motivo importa:** 49G achata lo que se guarda (11.88 MB → ~1.37 MB, ataca el costo de F5); 62 deja de repetirlo (ataca los repetidos + el stringify). **Mi recomendación: 62 T1 primero, porque es una línea y el efecto se ve en la segunda visita.**

---

## ACTUALIZACION 2026-09-30 (Heartbeat PO ronda 13) — 🔴 IDEA 61: tu backup sube una lista vieja de cuentas, y al importarlo en otro navegador la app queda sin cuentas

> La pregunta de la ronda **no** fue "¿qué feature falta?". Fue **"¿qué pasa si borro el navegador donde tengo todo?"** — o sea, *probá el backup*. Nunca lo probamos. Decimotercera ronda con 0 web research útil (Reddit 403 por 13ª vez).

### 🔴 La lista de cuentas vive en DOS claves, y solo una está viva

Medido sobre `agents/main` @ `957cc2c`:

| | clave | quién ESCRIBE | quién LEE |
|---|---|---|---|
| **viva** | `gw2_keys` (legacy) | `app.js:622`, `accounts-panel.js:181` | `app.js:604`, `accounts-panel.js:170`, `inventory-dashboard.js:231`, `wv-objectives-dashboard.js:169`, `wv-purchase-detail.js:858`, `wv-season-storage.js:496`, `wv-shop-ui.js:273,314` |
| **congelada** | `gn:account:keys` (nueva) | **solo** `settings-manager.js:242` (import del Gist) | `router.js:559,600`, `wallet-dashboard.js:430`, `settings-manager.js:34` (export del Gist) |

`storage.js` hace lo contrario de lo que se espera:
- `MIGRATION_MODE = 'copy'` (`storage.js:30`): copia la vieja a la nueva y **no borra la vieja**.
- `_migrateOne` (`storage.js:364`) arranca con `if (Storage.hasRaw(newKey)) return;` — **si la nueva ya existe, no la vuelve a tocar.**
- `migrate()` corre sola en cada arranque (`storage.js:380-391`).

**=`gn:account:keys` quedó con una foto de tu lista de cuentas del día que `storage.js` v1.0.1 entró por primera vez, y esa foto nunca se actualiza más.** `gw2_keys` sigue creciendo; la nueva, no.

### Lo que ve Pablo: dos bugs distintos

**Bug A — el backup que sube está viejo.** `gist-sync.js:406` sube `SettingsManager.exportData()` → `exportApiKeys()` → `Storage.get('gn:account:keys')`. Como la nueva existe, **el fallback a `gw2_keys` no se activa**: el Gist sube la foto del primer arranque. Toast: *"Configuración subida correctamente"* — y es verdad, no es tu configuración.

**Bug B — 🔴 importar en una máquina nueva deja la app sin cuentas.** `importFromData` escribe `gn:account:keys`. En un navegador limpio **no existe `gw2_keys`** → `app.js:604` `JSON.parse(null) || []` → **`this.list = []`**. Panel de Cuentas vacío, toast *"sincronizada correctamente"*, `location.reload()`. Y **no es hipotético: es exactamente el escenario para el que existe el botón de Gist.**

### 🔴 Corrección propia a un plan YA EN EL BACKLOG: NO implementen la Idea 49D

Yo propuse el Tramo D ("barrido de huérfanas", 🟢 1-1.5 h). **Tal como está escrito borra `gw2_keys`**, que no es una huérfana: es la lista de 27 cuentas. Es el peor falso positivo posible del plan, y el más caro — no se ve hasta que alguien pierde el navegador. **49D queda bloqueado detrás de la 61.** El barrido tiene que distinguir "llave legacy sin contraparte `gn:`" de "llave legacy que ES la fuente de verdad"; hoy no hay forma.

### Por qué nadie lo vio: cobertura

**42 módulos de `js/`, 25 archivos en `tests/`, 23 con cobertura, 19 sin una sola mención.** Incluye **`settings-manager.js` y `gist-sync.js`, los dos módulos que definen el backup**. Cero tests mencionan `gw2_keys`, `gn:account:keys` ni `MIGRATION_MODE`. `storage.js` no tiene un solo test propio. Los otros 17 sin cobertura: `legendary-data` (86 KB), `wv-shop-ui` (35), `welcome-panel` (28), `wizards-vault` (28), `wv-objectives-dashboard` (25), `wv-season-storage` (24), `homestead-tracker` (19), `render-catologo` (18), `theme-selector` (12), `legendary-tracker` (12), `wv-objectives-ui` (9), `wv-tabs-skin` (6), `luck-curve` (5), `fractal-tracker-theme` (5), `commerce-delivery-theme` (4), `sidebar-nav` (4), `analytics` (2).

**Hallazgo lateral, misma clase:** `MIGRATION_PREFIXES` declara **41 prefijos legacy** y `FALLBACK_MAP` los declara otra vez. Dos listas de la misma verdad en el mismo archivo. Es la Idea 57 aplicada a un archivo que ya existe.

### IDEA 61 — 3 tramos

- **Tramo 1 🟢 (~30 min):** que la copia se actualice, o que `app.js:622` y `accounts-panel.js:181` dejen de escribir `gw2_keys` y passen a `Storage.set(ACCOUNT_KEYS)` — con eso la nueva pasa a ser la viva y el `hasRaw` deja de congelar.
- **Tramo 2 🟡 (~1 h):** que el import escriba donde la app lee. Si el Tramo 1 va por el segundo camino, sale gratis.
- **Tramo 3 🟡 (~1-1.5 h):** un test de la invariante — simular `gw2_keys` + `gn:account:keys` y fallar si `Storage.get(ACCOUNT_KEYS)` devuelve un largo distinto del de `gw2_keys`. **El test es la lista**, patrón del Tramo 1 de la 57.

**No va al Reviewer todavía:** el Tramo 1 tiene dos caminos con consecuencias opuestas sobre datos que Pablo tiene en producción. Es decisión de alcance.

---

## ACTUALIZACION 2026-09-30 16:55 UTC — Heartbeat PO ronda 14 — 🔴 la 49D NO, y por que

### Me contradije

En el HB#13 (16:06, este mismo archivo) escribi: **"LA IDEA 49D ESTA BLOQUEADA: tal como esta escrita borra `gw2_keys`"**.

Cuatro horas despues, respondiendo el HB#58, le mande al Principal: *"1. Idea 50 tramo D. 1 a 1.5 h. Sigue siendo lo que mas rinde por minuto del backlog entero. Si solo haces una cosa este ciclo, es esta."*

**Le recomende el unico tramo que borra la lista de 27 cuentas.** No por falta de dato: estaba escrito con mayusculas, en este archivo, que tengo abierto. No lo mire. Y estaba sin commitear, asi que tampoco estaba en el `git log` que si mire.

### El bloqueo no se levanto: cambio de forma

Medido sobre `agents/main` @ `77be9e5`:

| pieza | linea | que dice |
|---|---|---|
| la app ya usa la clave nueva | `app.js:611` lee / `app.js:633` escribe | `storage.js:58` = **`gn:account:keys`** |
| la 61 T1 esta mergeada | `35a2425` | la app lee/escribe la clave nueva |
| **pero sigue el fallback** | `storage.js:154`, `storage.js:210` | `gn:account:keys` -> `gw2_keys` |
| el unico barrido que existe | `api-gw2.js:1408` | acota a `k.indexOf('ach_meta_v2:') === 0` |

El riesgo viejo (`gw2_keys` es la fuente de verdad) ya no aplica desde el Tramo 1. **El riesgo nuevo es el fallback:** si el barrido borra `gw2_keys` y hay un caso donde `gn:account:keys` nunca llego a escribirse, no queda copia. Y ese caso existe sin que nadie lo sepa: cualquiera que importo desde el Gist con un build viejo tiene la lista en la vieja.

### La forma correcta de la 49D

**No deteccion de huerfanas. Un barrido acotado por prefijo, igual que `purgeLegacyAchMeta`.**

- "huerfana" exige saber **cual de las dos claves es la verdadera**. Hoy no hay forma de saberlo.
- "todo lo que empieza por `ach_` y esta vencido" no exige ningun juicio. Es una lista de prefijos.

**Regla para el BACKLOG:** si la 49D vuelve a plantearse como "barrer las llaves sin contraparte", **no se implementa sin la Idea 61 Tramo 3** (el test de la invariante). Ese test es el unico que puede decir que la clave nueva esta escrita antes de borrar la vieja.

### Orden corregido

1. **49F** (`cacheClear()` que borre de verdad + boton) — **30 min, segura, es la que va ahora.** Medido: `api-gw2.js:1632` hoy solo hace `__mem.clear()` y `__inflight.clear()`; no toca localStorage. **Condicion que pido por escrito:** alcance `ach_*` / `commerce_*` / `items_cache_*`, **nunca `gw2_keys` ni `gn:account:keys`**.
2. **49E** (`getCache` borra la vencida) — 30 min, segura por definicion.
3. **49G** (`ach_acc` compacta) — el que mas guarda (4.10 -> 0.36 MB) pero toca los 2 consumidores que leen campos del objeto. Tramo largo.
4. **49D** — NO.

### Idea 49 punto 1, corregida: `modes`, no `lm: true`

El badge va en **Raid Tracker** (el LM es del Nexo de Eternidad, que es un encuentro de raid; que la recipe viva en Strike Tracker es circunstancial).

Lo importante es otro: **el bug de la Idea 48 no fue la ubicacion, fue que el flag era constante (`cm: true`).** Escribir `lm: true` reproduce el mismo bug con fecha 13 de octubre encima. Por eso el campo se declara **"no disponible todavia"** y se llama **`modes`** (objeto con el modo y su disponibilidad), no `lm`. Cuando la API exponga el flag pasa de `unavailable` a `real` **sin cambiar el shape**.

---

## ACTUALIZACION 2026-09-30 10:00 UTC — IDEA 56: el fix 206 esta bien, pero mi hipotesis de alcance MURIO

**Que se verifico del lado del Principal:** v2.23.0 esta en `agents/main` (commit `c4b226a`, merge `381fe9d`). El sharding de la 49 esta en v2.21.0 (`f98da49`).

**Lo que Yo midi y CONTRADICE mi propio reporte anterior.** Fui a medir el alcance real de la perdida por 206 parcial y **no hay ninguna perdida hoy**:

| Lista que la app pide por `fetch` crudo | ids | FALTAN |
|---|---|---|
| `assets/meta-drops.json` -> `highlightItemId` (`meta.js:682`) | 11 | **0** (HTTP 200) |
| `ALL_DISPLAY_ITEMS[].itemId` (`activities-theme.js:814`) | 10 | **0** (HTTP 200) |
| `activities.js` `_itemIds` (ecto) | 4 | **0** |
| `activities.js:819` hardcodeado | 2 | **0** |

Los ids que probed y "faltan" en un rango (`items` 1..1000 -> 54 ausentes, `achievements` 1..1000 -> 205 ausentes) **dán 404 probedos de a uno: no existen en la API.** No los perdía la app; nunca estuvieron.

**Consecuencia honesta:** el fix v2.23.0 es *correcto y mas defensivo de lo necesario*, no urgente. Las 3 rutas crudas (`meta.js:305`, `activities-theme.js:506`, `activities.js:754`) **no tienen `fetchBatchWithRepair`**, pero hoy no pueden dispararlo porque sus listas estan limpias. Queda como deuda, no como bug.

**Idea 56 (nueva, 🟢 1 linea, SIN token) — el guard de forma en `getAccountRaids`.** `api-gw2.js:537`:
```js
var raids = Array.isArray(data) ? data : [];
```
Si el body de `/v2/account/raids` fuera `progress:[{id,cm,li}]` (objeto, no array), **la capa devuelve `[]` sin warning**. Los 3 consumidores (`raid-tracker.js:1713/1805`, `strike-tracker.js:1092/1165`, `wallet-dashboard.js:448`) reciben `[]`. En el Strike Tracker eso es `state.completedStrikes = []` -> **0 de 15 marcados, indistinguible de "no complete ningun strike"**. Es el patron de la Idea 47 (degradar a `[]`) en el punto mas caro que queda. Con un `else { console.warn(LOGP, 'raids: forma no soportada', ...); throw }` el bloqueo por falta de token **se convierte en diagnostico**: la primera vez que Pablo abra el modulo, la app le dice que vio.

**Idea 53 sube de prioridad (era mi propuesta de las 06:30, sigue viva).** Los 14/15 ids de logro con `requirement` de clear que medi en el HB#50 son **datos, no codigo**, y `/v2/account/achievements` **la app ya lo lee** (`achievements.js:1058`, `activities.js:902`). Marcar 14 de 15 strikes **hoy**, sin token y sin endpoint nuevo, es mas valor que 3 lineas de Convergencia.

**Orden propuesto (reemplaza al "Convergencia primero, raids despues"):**
1. 🟢 **Guard de forma** en `api-gw2.js:537` — 1 linea, sin token, elimina el modo de mentira.
2. 🟢 **Strike Tracker por logros (14/15)** — Idea 53. Es lo que hace que el modulo funcione; hoy muestra 0.
3. 🟢 **CM de Convergencia por logros** (3 lineas) — de acuerdo, despues del Reviewer.
4. 🔴 **CM real de strikes** — bloqueado por el token, y con el guard (1) ya no es riesgoso esperar.

---

> Actualización: cada heartbeat PO (cada 2h)
>
> Este archivo es un espejo público filtrado del PRE_BACKLOG.md del PO (que vive en `C:\Users\psanc\.qwenpaw\workspaces\product-owner\PRE_BACKLOG.md`). Contiene solo las ideas que el PO decide mostrar en el dashboard.

---

## Top prioridades

> 🆕 **Reordenado 2026-09-30 08:15 UTC.** Dos cosas cambian de status: **(1) ALERT-41 deja de estar bloqueado** — el "límite honesto" que yo mismo escribí a las 06:30 (que `/v2/achievements` no dice cuál logro es el clear) **era falso**: el campo es `requirement`, y solo viene poblado con `lang=es`. **(2) Aparece la Idea 55.** Y una corrección: **8 de los 17 ids de logro que anoté a las 06:30 no existen**; los de la tabla nueva están todos verificados hoy contra la API viva.

| # | Idea | Dificultad | Estado | ETA |
| 🔴 **1** | **ALERT-84 T2: `vloxx` + `camp` sin cablear — cierra la Idea 52.** `vloxx` es el ala de CM del Nexus of Eternity (wing 9), **contenido nuevo de esta semana**: la app lo lista y no lo puede marcar. Es el 5º caso de la Idea 52 (se arreglaron los 4 renombres, no el que no existe) | 🟢 | **Abierto. ~30 min, el más barato que queda** | **AHORA** |
| 🔴 **2** | **ALERT-84 T3 + T4: la Armería Legendaria no se puede completar.** `loadLegendaryData()` es un stub y `render-catologo.js` pide `registerRender` (5 usos) y `getState` (1) que la capa no expone. **Agregar los 2 `<script>` sueltos NO alcanza** — mismo síntoma visible (nada) + 2 warnings | 🔴 | **Abierto, ambos van al Reviewer** (ALERT-48) | T3 2-4 h · T4 1-2 h |
| ✅ | **ALERT-84 T1: el item de menú ya no dice "Cargando" para siempre** | 🟢 | **HECHO `d64e688`** (rama `feat-idea50-boton-cache`, sin mergear). Cambia el estado que la app dice de sí misma, no la funcionalidad | — |
| 🟡 **3** | **ALERT-84 T5: la cadena de actualización del catálogo no es reproducible** (`_legendary_items_full.json` nunca fue commiteado y `_build_legendary_data.py` no se puede correr) | 🟡 | **Abierto, a definir con el Principal** | ~1 h |
| 🟡 **4** | **49G** (`ach_acc` compacto) | 🟡 | sin cambio — sigue cerrando la cuota | — |
|---|------|-----------|--------|-----|
| 🔴 **0** | **ALERT-41 RESUELTA: el Strike Tracker se puede re-apuntar a logros, con evidencia pública y sin token.** Escaneé el catálogo entero de `/v2/achievements` (ids 1..9999, lotes de 200 con comas): **8.349 achievements, 96 con "encuentro de incursión" en el `requirement`**. **14 de los 15 strikes del módulo tienen un clear inequívoco**: `old_lions_court` **6797** (*"Completa el encuentro de incursión de la vieja Corte del León"*), `shiverpeaks_pass` **4979**, `voice_claw` **5207**, `fraenir` **5233**, `boneskinner` **5194**, `whisper_of_jormag` **5118**, `cold_war` **5299**, `aetherblade_hideout` **6354**, `xunlai_jade_junkyard` **6084**, `kaineng_overlook` **6243**, `harvest_temple` **6513**, `cosmic_observatory` **7163**, `temple_of_febe` **7116**, `guardians_glade` **9218**. **Único sin clear: `forging_steel`** — el nuevo `vloxx`, un apido de wiki donde la API usa otro nombre (`5957 Reunión en el Ojo`). **Lo que falta NO es un dato: es elegir cuál de los 2-4 candidatos por strike es el clear, leyendo el `requirement`. Son 30 minutos con la lista de 96 del script, sin adivinar y sin el token de Pablo.** Corregí también que **`old_lions_court` NO tiene "0 logros"** (tiene el 6797) y que mi lista tenía 12 de 15 (faltaban `voice_claw`, `fraenir`, `forging_steel`) | 🟢 | **Decidible hoy. La lista de 96 está en `_hb55_strikeclear.js`** | **AHORA (30 min de mapeo)** |
| 🔴 **0.5** | **IDEA 55: 9 sitios con el token se evaden de la capa `GW2Api`** (de 40 `fetch` crudos a `api.guildwars2.com`, 9 son account-scoped). Todos sin caché, sin `fetchWithRetry`, sin pool: `characters.js:410/420/445`, `activities.js:391/396/745`, `activities-theme.js:488`, `achievements.js:1022`, `meta.js:230/238`, `inventory-dashboard.js:276/284`. **Los dos que duelen:** (a) **`characters.js:410` baja los 364 KB de `/v2/account/achievements` crudo en CADA cambio de cuenta** (`wireGlobal:1392`), y ese mismo payload **ya está cacheado** en `achievements.js:1058` y `activities.js:902` → la app lo baja dos veces, una cacheada y otra no; (b) **`wv-purchase-detail.js:978-980` recorre 27 cuentas en serie con `nocache:true`** debajo de un toast de 1.5 s → **~13 s de UI congelada sin progreso**, y el Wallet Dashboard ya tiene `computeEta` de la Idea 48B. **Tramo 1 🟢:** `characters.js:410` → `GW2Api.getAccountAchievements` (el wrapper ya existe). **Tramo 2 🟢:** sacar el `await` del loop + ETA. **Tramo 3 🟡:** migrar los 9 (cierra parte de la Idea 47: el contrato de error viene gratis con la capa) | 🟢 t1 / 🟢 t2 / 🟡 t3 | **No implementado. Medido sobre el código** | **AHORA (t1: 1 línea)** |

> ⚠️ **Reordenado 2026-09-30 08:00 UTC.** El **Tramo C de la 49 ya está MERGEADO** (`f98da49`, `api-gw2.js` v2.21.0: sharding `ach_meta_v3:<lang>:<id//200>`). Pero **no cierra la cuota**: `ach_acc` son 27 keys (una por cuenta, porque `kLS` mete el fingerprint del token en el nombre) y pesan lo mismo. **Aparece la Idea 49G.** También entra la **Idea 52**: `raid-tracker.js` tiene **5 de 30 encuentros rotos**, en el módulo que todos creían sano.
>
> ✅ **Cifras corregidas por el Principal (HB#48).** Las tres que circulaban para la misma medición (18 claves / 1.71 MB, "35 shards / 3.58 MB", 18.64 → 1.85 MB) **no reproducen**. Medido contra la API en vivo con `tools/idea49c-measure.mjs` (3458 logros, lang=es, 27 cuentas): patrón viejo **20.22 MB** → sharding sin podar **1.75 MB (35% de la cuota)** → **podando los 5 campos que nadie lee, 0.81 MB (16%)**. Sigue siendo necesario, y solo.
>
> 🔧 **Revisión del Code Reviewer (task-329b54da90ef, "APROBAR CON CAMBIOS") aplicada y mergeada** (`f09eb7c`): 2 defectos reales del sharding, reproducidos con test. `api-gw2.js` v2.22.0, suite **231 aserciones 0 FAIL**.

| # | Idea | Dificultad | Estado | ETA |
|---|------|-----------|--------|-----|
| 🔴 **0** | **IDEA 49G: `ach_acc` en forma compacta.** El Tramo C arregló `ach_meta` (20.22 → 1.71 MB) pero `kLS(base,token)` (`api-gw2.js:250`) mete el fingerprint del token EN EL NOMBRE de la key → `ach_acc` no es una key, son **27, una por cuenta**, y el sharding no las toca. Medido con la forma real de la wiki (`{id,current,max,done,bits}`): 3.000 logros con progreso × 27 = **4.10 MB**, y `+1.71` de `ach_meta` = **5.81 MB contra una cuota de 4.98 MB**. **El punto de quiebre es ~2.700 logros por cuenta**, y un veteran con raids+legendarias llega ahí. Además `TTL.ACH_ACC` son 2 min pero `getCache:324` **no borra la vencida**, y si Pablo rota tokens cada `ach_acc:*` huérfano son 100-364 KB eternos. **Solución: guardar `"id,id,..."` (33 KB/cuenta) → 0.36 MB con 27 cuentas, 11× menos. Suma final 3.14 MB, dentro de la cuota con 1.8 MB de margen.** No es tan trivial como el Tramo C: `getAccountAchievements` tiene **2 consumidores que leen campos del objeto** (`achievements.js:1058` vía `computeProgress:184-186` y `earnedAP:216-217`; `activities.js:902` lee `a.done`) | 🟡 Media | **No implementado. Medido con la forma real del endpoint** | **AHORA** |
| 🔴 **0.5** | **IDEA 52: `raid-tracker.js` tiene 5 de 30 encuentros que no existen.** El BACKLOG decía *"12 de 12 ids en el catálogo"* — eso era comparar 12, no 30. Medido sobre `WINGS`: **25 de 30**. 4 son renombres 1:1 (`siege_the_stronghold`→`escort`, `desmina`→`soulless_horror`, `dhuum`→`voice_in_the_void`, `gates_of_ahdashim`→`gate`) y **`vloxx` no existe en ninguna parte** (el ala del CM del 29-sep, NO MARCABLE en los dos módulos). Al revés: **5 eventos reales sin cablear.** Es el mismo bug que ALERT-41 en el módulo que todo el mundo creía sano, y es el que Pablo usa todas las semanas | 🟢 Fácil | **No implementado. Fix de dato, sin lógica ni CSS** | **AHORA (30 min)** |
| 🔴 **1** | **IDEA 49: la caché persistente muere en silencio.** `api-gw2.js:189` — `function lsSet(key,val){ try{ localStorage.setItem(key, JSON.stringify(val)); } catch(_){} }` — **se traga el `QuotaExceededError`**. Cuota medida en navegador real: **4.98 MB**. Caché de logros por cuenta: **0.53 MB** (6.991 achievements × 79 B medidos). **27 cuentas = 14.22 MB al 100%, 9.95 MB al 70%, 5.69 MB al 40%.** La app revienta entre la **cuenta ~10 y la ~24**; Pablo tiene **27**. Cuando revienta, la copia en localStorage deja de existir (la de `__mem` sobrevive, por eso no hay error visible), **cada F5 vuelve a ser un arranque en frío de 433 requests ≈ 65 s** — y `cacheClear()` tiene **0 callers y ningún botón**, así que no hay escape. **Lo grave no es la lentitud: es que se presenta como "la Bóveda anda lenta" y no como un fallo.** **Tramo C ✅ MERGEADO (`f98da49`)**. Tramo A ✅ mergeado. **Tramo D 🔴 BLOQUEADO (HB#13): tal como está escrita BORRA `gw2_keys`, que no es una huérfana sino la lista de 27 cuentas — ver IDEA 61. NO implementarlo antes.** Tramo D 🟢 (1-1.5 h): barrido de huérfanas al arrancar — sube de "conviene" a necesario. Tramo F 🟢 (30 min): `cacheClear()` que borre de verdad + botón. Tramo E 🟢 (30 min): `getCache` borra las entradas vencidas (hoy el TTL deja de leer pero no libera). Tramo B 🟡 (2-3 h): LRU — **BAJA de prioridad**, era la respuesta a un problema que ya no es el problema. **Orden 49G → 49D → 49F → 49E; B al final** | 🟢 D / 🟢 F / 🟢 E / 🟡 B | **C y A mergeadas. D/F/E pendientes** | **Después de 49G** |
| ✅ | **IDEA 48: recalibrar el pool (3 → 6) + ETA en el contador** — **CERRADA.** Tramo A @ `9d77b32` + merge `78a5a7a` (`api-gw2.js` v2.19.0, `POOL_MAX: 6` L129). Tramo B @ `90d2b0e` (`wallet-dashboard.js` v2.9.0, ETA medida con umbrales `ETA_MIN_DONE=3` / `ETA_MIN_MS=1500`) | 🟢 / 🟡 | **Cerrada** | ✅ |
| ✅ | **IDEA 47: los ceros falsos** — **CERRADA.** Merge @ `110b049` + `776b1ea` (`.catch` en launches tardíos) + `7ca8195` (allSettled + banner) + `92b9cc1` (call site del TP nombra el fallo) | 🟡 | **Cerrada** | ✅ |
| ✅ | **IDEA 46 t1: pool global de requests** — **CERRADA.** Mergeada @ `2f6ce82`, merge `bf0fb62` → `agents/main`, más `10ead9b` (fuga de slot en `poolPump`) y `9a8262c` (pool de FASE 2 en inventario). **La Idea 48 es la continuación de esta, no una alternativa** | 🟢 Fácil | **Cerrada** | ✅ |
| ✅ | **IDEA 46 t2: honestidad de la cola** — **CERRADA** por el Tramo B de la 48 (`90d2b0e`): el contador ya mide y muestra ETA real en vez de decir "Cargando…" | 🟡 | **Cerrada** | ✅ |
| ✅ | **IDEA 45: progreso N/total + error por cuenta nombrado** — **CERRADA** en `agents/main` @ `ee0494d` (`wallet-dashboard.js` v2.8.0) | — | **Implementada** | ✅ |
| ✅ | **Commerce delivery** (`getCommerceDelivery`) — API en `agents/main` @ `7d13155`. **UI sigue pendiente** (0 callers) | 🟢 | API lista, sin UI | Con 46 t2 |
| ✅ | **Fix `meta.js`: endpoint `/v2/events` obsoleto** | 🟢 | **CERRADO** @ `f533d67` (guard `LEY_LINE_ENDPOINT_RETIRED`, v3.4.1) | ✅ |
| 🥈 1 | **Dungeon dailies multicuenta** (`account/dungeons` + `dungeons`, **ambos confirmados contra `/v2.json` el 04:00**; 8 mazmorras / 36 paths, público, sin paginar). Completa la familia WB + mapchests + dailycrafting. **Mejora relación esfuerzo/valor de todo el backlog** | 🟢 Fácil | API confirmada, **sigue en 0% (sexto heartbeat)** | **Próxima** |
| 🥇 2 | **Coleccionables account-scoped multicuenta** — 12 endpoints, **12/12 confirmados contra el índice oficial `/v2.json` el 04:00** (`skins`, `outfits`, `finishers`, `minis`, `novelties`, `gliders`, `mailcarriers`, `mounts/skins`, `mounts/types`, `titles`, `dyes`, `home/cats`). Empezar por `skins`. ✅ Ya no depende de la 46 t1 (está mergeada). Con `POOL_MAX=6` los 324 requests bajan de ~97 s a ~49 s | 🟡 Media | API confirmada, 0% implementado | Después de 49C |
| 🥇 3 | Fractal Tracker multicuenta (T1-T4+CM, instabilities, agony) — falta el 3er tipo de contenido instanciado | 🟡 Media | API parcial, patrón de raid/strike reusable | Ahora |
| 🥉 4 | Titles tracker (`/v2/account/titles`, 496). **Reabierta**: `achievements.js` solo usa `/v2/titles?id=` como resolutor de nombres, nunca llama al account-scoped. No es redundante | 🟢 Fácil | API confirmada | Próxima |
| ⚠️ 5 | `homestead-tracker.js` — **código muerto**: sus wrappers no están en el `return` de `GW2Api` y `index.html` no lo referencia. **Quinta verificación, misma respuesta.** Sale de la tabla → decisión abierta del Principal | 🟡 | **Parado** | — |
| 🥉 6 | New Items Awareness Feed (`gw2treasures.com`) | 🟢 Fácil | Validated, not implemented | Continuous |
| 4 | Mobile PWA (manifest.json + service worker) | 🟡 Media | CSS breakpoints done, PWA no | Post-Homestead |
| 5 | WvW Borderlands beta tracker | 🟡 Media | Not implemented | Nov 10 |
| 6 | Inventory cleanup tool (MetaForge WARDOGS competitive gap) | 🟡 Media | Not implemented | Post-Homestead |
| 7 | Goal tracking | 🟡 Media | Validated | — |
| 8 | Alt Roster Tracker | 🟡 Media | API limitation (no rested XP for alts) | — |

## 🟢 Heartbeat PO 2026-09-30 06:00 UTC — Idea 50: la cuota no se libera nunca

> **Novena ronda consecutiva sin web research útil** (Reddit devolvió los mismos 5 posts de
> siempre; gw2treasures confirma 78.422 items / 10.635 skins / 4.821 skills, nada nuevo).
> La pregunta fue **"¿qué borra la caché?"** → **Idea 50**. Ninguna búsqueda web la produce.
>
> **Lo más importante de este heartbeat es una corrección, no una idea nueva:**
> **el Tramo C no cierra la cuota por sí solo.**

### La respuesta a "¿qué la borra?" — nada

| Mecanismo | Qué hace | Callers |
|---|---|---|
| `lsDel(key)` `api-gw2.js:243` | borra una clave de localStorage | **0** |
| `cacheClear()` `:1077` | limpia `__mem` + `__inflight` | **0** |
| `getCache()` `:324` | si venció → `return null`, **no borra** | — |
| `KeyManager.remove()` `app.js:694` | saca la Key de la lista | **no toca la caché** |

`cacheClear()` es peor de lo que dice su nombre: **solo limpia la caché en memoria, no la
de localStorage.** El TTL no libera espacio, deja de leer. Y **eliminar una API Key deja
su caché huérfana para siempre** — ese es el caso común, no "la caché se hace grande".

### El presupuesto completo, medido (27 cuentas)

18 `putCache`: **14 por token** (→ 378 claves fijas con 27 cuentas) + 4 globales.

| | Hoy | Con Tramo C | + compacto `ach_acc` |
|---|---|---|---|
| `ach_meta` | 41.60 MB | **1.54 MB** | 1.54 MB |
| `ach_acc` | 11.88 MB | 11.88 MB | **1.08 MB** |
| bank + items + resto | 1.07 MB | 1.07 MB | 1.07 MB |
| **TOTAL** | **54.55 MB** | **14.49 MB** 🔴 | **3.99 MB** 🟢 |

Contra la cuota de **4.98 MB**. **Con sharding solo siguen 14.49 MB: ×3.**
Los dos tramos juntos: 3.99 MB. **Por eso el LRU (Tramo B) baja de prioridad.**

Bytes medidos sobre la forma real (`ensure_ascii=False`, como guarda `JSON.stringify`):
**458 B** por entrada `ach_meta` (6991 logros), **66 B** por `ach_acc`,
`currencies_all:es` 23.3 KB, `commerce_listings` 159.5 KB (27.997 ids), `items_cache_v1`
189.1 KB (378 B/item). `account_bank` (~44 KB/cuenta) es **estimación** (necesita token);
aunque fuera el doble no cambia la conclusión.

### La idea que murió en la verificación

Iba a proponer que **el sharding rompe la correctitud** (un hit de caché con key de shard
significa "tengo *algunos* ids", y el `if (cached) return;` sin pedir lo que falta daría
listas de logros incompletas). **No se reporta: ya está implementado y está bien.**
`api-gw2.js:925-983` guarda un bag por shard, calcula `missing` y pide solo eso (`:952`),
y resuelve en el orden pedido deduplicado. **22 pass / 0 FAIL** en
`tests/idea49.tramoc-sharding.test.js`. Mi idea nació de un `if (cached) return` de la
versión vieja; el código actual ya no lo tiene.

### Tramos propuestos

| Tramo | Qué | 🟢 |
|---|---|---|
| **D** | Barrido de huérfanas al arrancar: borrar claves cuyo token ya no está en `gw2_keys`. La prueba: tras eliminar una Key, `localStorage.length` baja | 1-1.5 h |
| **F** | Que `cacheClear()` borre localStorage de verdad, o renombrarse `memClear()` + `cacheClearAll()` | 30 min |
| **E** | Que `getCache` borre la entrada vencida (con cuidado: `TTL.ACCOUNT` son 30 s) | 30 min |
| **B** | LRU — **baja de prioridad**, ya no es el problema | 🟡 ⬇️ |

---

## 🔴 Heartbeat PO 2026-09-30 04:00 UTC — Idea 49 + catálogo de endpoints con autoridad

> **Octava ronda consecutiva con 0 web research útil.** La pregunta del heartbeat no fue
> "¿qué feature falta?", sino **"¿qué ve Pablo cuando localStorage se llena?"**
> → **Idea 49**. Ninguna búsqueda web la hubiera producido.

### Lo que cambió en el repo desde las 02:00 (leído, no supuesto)

| Idea | Estado | Commits |
|---|---|---|
| 48 Tramo A — `POOL_MAX` 3→6 | ✅ **CERRADA** | `9d77b32` + merge `78a5a7a` |
| 48 Tramo B — ETA en el contador | ✅ **CERRADA** | `90d2b0e` |
| 47 — ceros falsos | ✅ **CERRADA** | `110b049` + `776b1ea` + `7ca8195` + `92b9cc1` |
| 46 t1 / t2 | ✅ **CERRADA** | t1 en `c0cd18f`/`25e6cc5`/`10ead9b`; **t2 resuelta por el Tramo B de la 48** |
| 44 — dungeons | 🟡 **sigue en 0%** (sexto heartbeat) | — |
| `homestead-tracker.js` | ⚠️ código muerto (sexta verificación) | — |

NUEVO en el repo: **`PROMOTIONS.md`**, inventario de feats para decisión de **Pablo**.
Producción congelada. El equipo no propone promover y este heartbeat **no lo hace**.

### Una idea candidata que murió en la medición

Iba a proponer **requests condicionales con ETag**: si la API devolviera `ETag`, un F5
costaría ~0 requests de los 433, porque los 304 no gastan presupuesto.
**Medido: la API de GW2 no soporta ETag.** `GET /v2/colors?ids=1..15` → 200, con
`X-Rate-Limit-Limit: 600` y `Cache-Control: public,max-age=3600`, pero **sin `ETag` y
sin `Last-Modified`**. Sin eso no hay 304. La única palanca HTTP que existe ya está
usada: el `fetch` va con `cache: 'default'` (`api-gw2.js:224`). **La palanca real es del
lado del almacenamiento, no del protocolo.**

### Correcciones propias (3, autode-)

1. **Probe de `/v2.json` devolvió 0 endpoints** y estuve a punto de reportar que no había
   índice. Era mi bug: leí la clave `endpoints` cuando el documento usa `routes`. La
   salida me lo decía. **Segunda vez en 48 h que "imprimir el total junto al 0" me evita
   reportar una idea falsa.**
2. **La columna "SIN USAR" estaba inflada.** La armé sobre prefijos de wrappers de
   `GW2Api`, pero `activities.js`, `meta.js` y `wizards-vault.js` llaman con `fetch`
   crudo. Verificado: `dailycrafting`, `worldbosses`, `mapchests`, `luck` y
   `wizardsvault/*` **sí se usan**. El gap real es menor que el que despaché.
3. **Premisa wrong sobre la caché:** creí que era solo en memoria y que un F5 repedía
   las 433 requests. Falso — `putCache` también escribe en localStorage. No cambió la
   conclusión, pero cambió el diagnóstico: lo que muere no es la caché al hacer F5, es
   **la copia persistente cuando la cuota se agota.**

### Catálogo de endpoints, cerrado con el índice oficial

Usé `/v2.json` en vez de mi heurística 401-vs-404, que ya me produjo un error con
`/v2/account/mounts`. **184 routes, 45 `account/*`.**

- **Idea 42: 12/12 confirmados.** `dungeons` también. `dungeons/rooms` **no** existe.
- **Resuelto:** `account/mail` **existe** (quedaba "503, no confirmable").
- **Gaps nuevos que no tenía anotados:** `account/buildstorage`, `account/mastery/points`,
  `account/inventory`, `account/emotes`, `account/recipes`, `account/jadebots`,
  `account/progression`, `account/pvp/heroes`, `account/skiffs`, `account/home`,
  `account/homestead{,/decorations,/glyphs}`.
  El que más me interesa es **`account/buildstorage`**: es donde viven los ítems
  duplicados, que es justo lo que la Idea 28 (inventory cleanup, gap competitivo contra
  MetaForge WARDOGS) necesita y **no tenía en su lista de fuentes**.

### Secuencia vigente (04:00 UTC)

`49C compactar logros → 44 dungeons → 49A decir que la caché falló → 49B LRU → 42 coleccionables → titles → buildstorage`

---

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
