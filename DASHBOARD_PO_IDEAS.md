# DASHBOARD_PO_IDEAS.md — Ideas del PO para el dashboard

> Actualizado: 2026-10-01T05:00:00Z (Heartbeat PO ronda 23 — **sin novedades**: no hay idea, tramo ni prioridad nueva desde la ronda 22, y la ronda 23 no abre ninguno. **Web research: 21 de 21 rondas sin feature nueva** (Reddit 403, gw2treasures `/feeds` 404), así que el producto de la ronda fue **auditar mi propia propuesta de la ronda 20** en vez de forzar una idea. Dos resultados: **(1) respuesta a la pregunta del Principal sobre las 2 claves de pestana: (c) cierre asimétrico** — `gn:raids:strike:view` **no es huórfana** (tiene escritor en `raid-tracker.js:1012/1016` y se implementa sola al arreglar el raw, sin helper), y `gn:converter:state` sí lo es pero **no se implementa nunca** (el Reviewer tiene razón: `gw2_conv_cache_v3` tiene TTL de 30 min; y de todos modos la pestaña del conversor no se la pide a nadie). **(2) Corrección: en la ronda 20 cité `MIRROR_MAP` y era `FALLBACK_MAP`** — `MIRROR_MAP` tiene 4 entradas y ninguna es de pestanas, y esa diferencia **no es cosmética**: solo `MIRROR_MAP` arregla el congelamiento. El código lo dice en `storage.js:416`. Además el conteo "2 superficies" era **3**: `wv-shop-ui.js:222/228` tiene el mismo patron y no estaba en ninguna lista. Prioridad #1 sigue siendo **T2-mini**)
> Mantenedor: PO (product-owner)



---

## ACTUALIZACION 2026-10-01 05:00 UTC — Heartbeat PO ronda 23 — sin idea nueva, y una premisa mía de la ronda 20 era FALSA

> **Espejo de la ronda 23 del PO.** Detalle largo en `PRE_BACKLOG.md` (privado). Esta ronda **no abre ninguna idea ni tramo nuevo**: su producto es una **decisión de cierre con el motivo escrito**, más **una autocorrección que cambia un dato que el dashboard ya afirmaba**.

### 1) NOVEDADES: **sin novedades.** Nada nuevo en `PRE_BACKLOG.md` desde la ronda 22.

La ronda 22 (04:00 UTC) es la última entrada. La 23 no agrega idea, ni tramo, ni prioridad. **Web research: 21 de 21 rondas sin feature nueva** (Reddit 403, gw2treasures `/feeds` 404). Con 0 aporte externo y una decisión de cierre que escribir, la ronda correcta era **no forzar una idea** — el producto útil salió de **auditar mi propia propuesta de la ronda 20**, que es de donde viene todo lo de abajo.

### 2) Respuesta a la pregunta del Principal sobre las 2 claves de pestaña: **(c) CIERRE — asimétrico**

El Reviewer declaró `viewPref()` opcional y el Principal lo descartó. **Coincido, no lo implemento y no lo vuelvo a proponer.** Pero el descarte del helper **no habilita (c) por sí solo**, porque al medir las 2 claves una por una **no son el mismo caso**:

| Clave | Realidad medida en `origin/main` | Destino |
|---|---|---|
| `gn:raids:strike:view` | **NO es huérfana.** Tiene escritor: `raid-tracker.js:1012/1016` escribe `raid_strike_view` a pelo, que es **el `FALLBACK_MAP` de la `gn:`** (`storage.js:180`). La preferencia **funciona**. | **No es un ítem del backlog:** al arreglar el raw con `Storage`, la `gn:` gana escritor **como efecto secundario, sin helper y sin una línea nueva**. El fix que la fila 079 ya autoriza lo resuelve solo. |
| `gn:converter:state` | **Sí es huérfana, y por las dos puntas:** está en `STATIC_KEYS` (`:51`), `STORAGE_KEYS` (`:90`) y `FALLBACK_MAP` (`:165`), pero su legacy `gn_converter_state` **no la escribe ningún módulo** y `state.activeTab` (`converter-modal.js:46/1336`) es **solo memoria**. | **Se cierra, no se implementa.** El Reviewer tiene razón en el riesgo: `gw2_conv_cache_v3` tiene `CONV_TTL` de **30 min** (`:39/140`), así que la pestaña se perdería sola. **Son 2 claves separadas o nada** — y "nada" es lo correcto, por producto: el conversor es un modal de una sola tarea, persistir la pestaña no le ahorra un click a Pablo. |

**El cierre asimétrico, en una línea:** *una de las dos claves se implementa sola con un fix ya autorizado; la otra no se implementa nunca; y ninguna de las dos requería el helper que se descartó.*

### 3) 🔴 Corrección: en la ronda 20 cité `MIRROR_MAP` y era `FALLBACK_MAP` — y el nombre cambia la conclusión

Cita mía de la ronda 20 (`PRE_BACKLOG.md`, ~5040): *"`gn:raids:strike:view` y `gn:converter:state` … en **`MIRROR_MAP` en las dos direcciones** (`:122/165/180` y `:146`)"*.

**Medido hoy: `MIRROR_MAP` (`storage.js:209-214`) tiene 4 entradas y ninguna es de pestañas:**

```js
const MIRROR_MAP = {
  'gn:account:keys':          'gw2_keys',
  'gn:account:selected':      'gw2_selected_key_v1',
  'gn:activities:home:nodes': 'gn_home_nodes_marked',
  'gn:activities:toggles':    'gn_activities_toggles',
};
```

`raid_strike_view` **no es espejo de nadie.** Las líneas que cité (`:122/146` = `MIGRATION_PREFIXES`, `:165/180` = `FALLBACK_MAP`) son los otros dos mapas, declarados a ~30 y ~60 líneas de distancia. Y la diferencia no es cosmética — **los tres mapas garantizan cosas distintas**:

| mapa | qué garantiza | efecto en el congelamiento |
|---|---|---|
| `FALLBACK_MAP` | si la `gn:` no existe, leer la legacy | **no arregla nada** si la `gn:` ya existe |
| `MIGRATION_PREFIXES` | copiar legacy→`gn:` **una vez** (`_migrateOne` arranca con `if (Storage.hasRaw(newKey)) return`) | **congela** la `gn:` en la foto del primer arranque |
| `MIRROR_MAP` | escribir **las dos** + `_resyncMirrors()` refresca la `gn:` en cada arranque | **el único que arregla el congelamiento** |

Y el propio código lo dice textualmente en `storage.js:416`: *"para las claves de `MIRROR_MAP` eso es exactamente la condición de congelación"*. **La condición estaba escrita en el archivo y yo la cité con el nombre del mapa equivocado.**

**Regla que sale:** *cuando citás una garantía, citás el nombre del mapa que la implementa; "está en el mapa" sin decir cuál es una categoría, no una cita.*

### 4) 🟡 El conteo "2 superficies rotas" era **3** — y la tercera no estaba en ninguna lista

| Superficie | ¿Persiste? | Dónde | ¿En las listas de la ronda 20? |
|---|---|---|---|
| **WV — 4 pestañas** | ✅ Sí, y **bien** (`Storage.set/get`) | `gn:wv:last_tab`, `router.js:259/260` | ✅ marcada correctamente |
| **WV — vista cards/table de la tienda** | ⚠️ **Sí, por la puerta de atrás** | **`wv-shop-ui.js:222`** escribe `gw2_wv_view_v1` a pelo | ❌ **no estaba** |
| **Raid/Strike toggle** | ⚠️ Sí, por la puerta de atrás | `raid-tracker.js:1012/1016` | ✅ (la cubre el fix de raws) |
| **Converter — 4 pestañas** | ❌ No, y no puede persistir donde está | memoria; el caché es TTL 30 min | ✅ (la detectó el Reviewer) |

**La fila nueva: `wv-shop-ui.js:222` y `:228`.** El botón "Vista: Tarjetas/Tabla" escribe `gw2_wv_view_v1` crudo, que es **el `FALLBACK_MAP` de `gn:wv:shop:view`** (`storage.js:160`) — y `router.js:257/258` tiene los mismos dos valores leyendo/escribiendo **la `gn:`** por `Storage`. **La misma preferencia, 2 escritores, 2 claves.** Funciona, pero *el último en escribir gana, y no siempre escriben el mismo lugar.*

**No pido ampliar el fix de raws ya autorizado** (fila 079 dice 3 raws de `raid-tracker.js`): es scope en un fix que el Principal ya tiene, y él decide. Lo que pido es que **queden escritos**, porque si no el próximo que mida "raws de localStorage" va a contar 3, va a encontrar 2, y va a reportar el mismo hallazgo con otro número.

### 5) Lo que NO voy a proponer, y por qué (para que no vuelva a salir)

- **No propongo `viewPref()` ni ningún helper.** 6 call-sites ya usan `Storage.get/set`; un helper para 2 superficies es API nueva. **La lección es la inversa a la que hice en la ronda 20:** el hallazgo **no requería un helper** — requería arreglar **1 escritor crudo**, y la `gn:` se implementaba sola. *Un helper propuesto para resolver N superficies es la señal de que el problema real es M escritores crudos.*
- **No propongo persistir la pestaña del conversor.** Única de las 3 donde la respuesta es "no hacer nada", y por producto. Si el conversor algún día es superficie de trabajo (el historial de `:1159` hoy es placeholder), la pregunta se vuelve respondable sola y la `gn:` ya declarada la tiene preparada.
- **No amplío el alcance del fix de raws.** Ver §4.

### 6) Estado yMethod

- **`agents/main` @ `5291138`** (`git fetch` primero). Rondas 22/21 siguen mergeadas en `ea10e9b`.
- **Concurrencia:** el clon compartido está en `fix-hb77-puerta-llega`, rama de la **segunda instancia del heartbeat**, con 2 untracked. **No la toqué** (ALERT-43/59). Este trabajo salió de mi worktree limpio `wt-r22` (rama `po/hb77-dashboard`), **solo `.md`, y no mergeo** (el PO no mergea). **Mi rama no choca con la otra**: toco `PRE_BACKLOG.md` (mi workspace, fuera del repo) y `DASHBOARD_PO_IDEAS.md`; la otra está commiteando código de app.
- **Secuencia: sin cambios.** La ronda 23 no agrega ni mueve nada: **T2-mini** (🟢 20 min) → **copy `glifos`** (🟢 1 línea) → **T2** (🟡 ~1 h) → **T4** (🟢 15 min) → **49G** (🟡, la que cierra la cuota) → **47/57** (el fondo del problema) → 49D → 49F/49E → 42 → 45 → 41. **Idea 44 fuera de la tabla** (decimoquinto heartbeat en 0%).
- **Autocorrecciones:** la cita de `MIRROR_MAP` (§3) y el conteo 2→3 (§4). **9ª de método en 72 h, ninguna de la web.** Y un glitch de generación mío (3ª vez, CJK + fullwidth en la prosa) que detecté con un scan `ord(c) > 0x2500` **antes** de ensamblar el `PRE_BACKLOG.md`, y corregí — el guard `tools/scan-cjk.py` del repo no cubre fullwidth ni corre sobre mi workspace.

---

---

## ACTUALIZACION 2026-10-01 04:00 UTC — Heartbeat PO ronda 22 — 🔴 T1 está mergeada y es correcta. Es una cerradura en UNA de TRES puertas.

> **Espejo de la ronda 22 del PO.** El detalle largo está en `PRE_BACKLOG.md` (privado del PO). Esta entrada existe para que el dashboard no quede 3 rondas atrás: **las rondas 20 y 21 no llegaron acá** (se workingaron solo en `PRE_BACKLOG.md` y sus fixes sí se mergearon). Estado real de las tres: ronda 20 **T5** mergeada @ `b1b74bb` · ronda 21 **T1 + T3** mergeadas @ `ea10e9b` · ronda 21 **Idea 64 T1+T2** @ `ea2721b` · ronda 17 **ALERT-84 T3+T4** @ `4778f92`.

### La pregunta de la ronda (que nadie se había hecho sobre la ronda 21)

La ronda 21 encontró que la puerta de `addOrUpdate` validaba 2 de los 7 permisos que la app usa, y el texto de `index.html` le decía a Pablo que marcara 2. Eso se arregló ayer (`ea10e9b`).

**La pregunta de hoy no fue "¿qué feature falta?". Fue: si la puerta exige los 7, ¿por dónde más puede entrar una API key a la lista de cuentas?** Porque una puerta solo sirve si es la única.

### Antes que nada: el censo de la ronda 21 estaba incompleto. Lo cerré

Re-extraje del código de `origin/main` (`_hb77_endpoints.py`) todos los fragmentos de URL en los 46 módulos de `js/` + `index.html`: **15 formas de endpoint con scope y 6 públicas.** La ronda 21 había medido **9**. Los 6 que faltaban, con el scope que **declara la wiki** (wikitext crudo, `action=raw`, no de memoria):

| endpoint que faltaba | scope declarado | ¿permiso nuevo? |
|---|---|---|
| `/v2/account` | `account` | no |
| `/v2/account/bank` | `account, inventories` | no |
| `/v2/account/materials` | `account, inventories` | no |
| `/v2/commerce/transactions` | `account, tradingpost` | no |
| `/v2/commerce/listings` | sin campo `scope` | — |
| `/v2/commerce/prices` | sin campo `scope` | — |

**La unión de los 15 es exactamente los 7 de `REQUIRED_PERMISSIONS`. La lista mergeada está completa — y verificada, que no es lo mismo.** ✅ **T1 CERRADA.**

> ⚠️ **Corrección del PO:** el `app.js:660-661` del fix dice `/v2/account/bank → account, inventories`, pero la tabla de arriba lo confirma contra la wiki y **no lo corrige**. Lo que sí queda sin verificar: `/v2/account/wizards-vault` da **404** en la wiki con ese título (`api-gw2.js` lo llama igual y funciona), así que su scope **no está verificado** y el PO no lo afirma.

### 🔴 EL HALLAZGO: 3 escritores de la lista de cuentas, 1 con candado

`STORAGE_KEYS.ACCOUNT_KEYS` (`gn:account:keys`) tiene **3 sitios que la escriben**, y solo uno pasa por `addOrUpdate`, que es el único que valida:

| # | escritor | quién lo llama | ¿pasa por la puerta? |
|---|---|---|---|
| 1 | `app.js:747` `KeyManager.save()` | `addOrUpdate` (modal), `rename`, `remove` | ✅ **sí** — y solo para lo que entra por el modal |
| 2 | `settings-manager.js:252` `importApiKeys()` | `:393` restaurar desde archivo · `:429` **importar desde el Gist** | ❌ **no** |
| 3 | `accounts-panel.js:197` | import del Excel cifrado (otro panel) | ❌ **no** |

```js
// settings-manager.js:247-261
function importApiKeys(apiKeysData) {
  if (!apiKeysData) return;
  if (apiKeysData.list !== undefined && Array.isArray(apiKeysData.list)) {
    Storage.set(Storage.STORAGE_KEYS.ACCOUNT_KEYS, apiKeysData.list);   // <- a disco, sin mirar un permiso
```

La puerta #2 no es secundaria: el export lleva las keys en claro (`settings-manager.js:175` y `:212`, `apiKeys: exportApiKeys()`), el Gist las sube (`gist-sync.js:452` → `SettingsManager.importFromData` → `importApiKeys`), y `validateImportData` (`settings-manager.js:230-241`) chequea **exactamente dos cosas**: que la versión sea `3.0` y que el archivo diga `app: 'gw2-wallet-ligero'`. **No mira una key.**

### Lo que Pablo ve después de restaurar el Gist en otra máquina

1. El toast dice *"Configuración importada"* y cuántas cuentas. **Nada sobre permisos.**
2. `KeyManager.load()` (`app.js:694`) lee la lista y no valida.
3. Cada módulo pide su endpoint. Con una key de `account`+`wallet`, la API responde **403** y la capa degrada a `[]`/`0` (Idea 47/57, ya medidas).
4. **Los 14 módulos quedan vacíos y no hay un solo mensaje.** Peor en Suerte: `getAccountLuck` devuelve `[]` y la columna muestra **`0%`**, un valor plausible y verdadero — se cree de buena fe.
5. `renderKeysList` (`app.js:994-1024`) muestra ícono, etiqueta, chip "En uso", la key ofuscada y 4 botones. **Cero información de salud.**

**Esto reencuadra la T2 de la ronda 21.** Yo la propuse como *"mostrar los permisos por cuenta"* — un extra. **Es la única defensa que no depende de por dónde entró la key.**

### Tramos

| # | tramo | dificultad | por qué |
|---|---|---|---|
| 🔴 **0** | **T2-mini: contador arriba del modal — "27 cuentas · 3 con permisos incompletos"** | 🟢 ~20 min | La pregunta que Pablo se hace primero no es *cuáles* sino *cuántas*: si son 3 las arregla; si son 27, el mensaje que necesita es otro. Sin esto, T2 obliga a recorrer 27 filas a ojo |
| 🔴 **0.5** | **Copy `app.js:683`: `unlocks` nombra "glifos", un módulo que NO existe** (`homestead-tracker.js` es código muerto, Idea 44, decimoquinto heartbeat en 0%). El texto correcto es **"Legendaria Imbuida, nodo de home"** | 🟢 **1 línea** | Es el mensaje que Pablo lee cuando su key es rechazada. **Es un error mío del copy de ayer** — misma clase que el `confirm()` de la ronda 19: el código es honesto, el texto que lo acompaña no |
| 🔴 **1** | **T2: chips de permisos por fila**, los que falten en rojo. Lee `tokeninfo` de las cuentas **ya guardadas** — implementa `tokenHasWVPermissions` (`api-gw2.js:712`, 0 callers) como su primer lector real. **Cubre las 3 puertas** | 🟡 ~1 h | Es la cerradura. Guardar un dato nuevo por cuenta ⇒ **va al Reviewer** (ALERT-48) |
| 🔴 **1.5** | **T4: el import dice qué trajo** — cuántas de las N llegaron sin los 7 | 🟢 ~15 min | Sin triage en el momento de la restauración, T2 le deja el trabajo a Pablo. Toca el import ⇒ Reviewer |

> **Lo que NO se propone: validar en `importApiKeys`.** Son 27 llamadas a `tokeninfo` (~25 s) y **bloquean el import**; peor, una key caduca **tira el import entero**. No se arregla un problema de permisos creando un problema de datos. La forma correcta es **no validar al importar y marcar "sin verificar"**, que es lo que T2 da gratis.

### Web research de la ronda (vigésima vez)

- **Reddit `/r/Guildwars2` → 403** (20/20). **gw2treasures `/feeds` → 404** (20/20; la ruta no existe desde la ronda 12).
- **Wiki `API:2/tokeninfo` → sí.** (a) Sirvió para el censo. Y trae una inconsistencia que **confirma la regla del PO**: la descripción dice **`builds`** y el ejemplo de respuesta devuelve **`build`**. *Un scope escrito de memoria es una constante, y las constantes se pudren* — y esta vez se pudre en la documentación oficial. (b) **Algo que el PO no sabía y NO abre idea:** `tokeninfo` devuelve `type` (`APIKey`/`Subtoken`) y `urls` en subtokens restringidos. Si se pegara un subtoken con lista de URLs, la puerta pasa y algunos endpoints dan 403 sin explicación. **Anotado como P3 dentro de T2** (que el chip muestre también `type`), no como idea: Pablo usa keys de `arena.net`.
- **Parche febrero 2026 = 42 Legendaria Imbuida** (28 Boss Bounty + 6 Weekly Quickplay). **Cierra el HB#50 / COMM 034**: el `vloxx` con `li: 1` hacía el 100% inalcanzable **por diseño del juego**, no por la app. ✅ **Cerrado por el juego.**
- **Idea 44 (`homestead-tracker.js`): 0%, decimoquinto heartbeat.** Sale de la tabla; queda en "decisión del Principal".

### Correcciones propias de la ronda

1. El censo de la ronda 21 era de **9 endpoints, no de 15**. La conclusión no cambió, pero el número estaba mal.
2. **La medición automatizada dio un censo más chico que el real y no lo delató.** `_hb77_endpoints.py` no vio `/v2/account/home/nodes` ni `/v2/characters/:id/inventory`, porque se arman con `fetch` crudo y concatenación, no con un literal `/v2/...`. Los encontré recién al grepear a mano. **Imprimir el total junto a la lista, y compararlo contra un grep a mano** — la regla funcionó.
3. **`app.js:683` nombra un módulo que no existe.** Error mío, introducido en el copy de la ronda 21 y mergeado sin que nadie lo pudiera ver. Va como T2-mini/0.5, 🟢 1 línea.

## ACTUALIZACION 2026-10-01 01:00 UTC — Heartbeat PO ronda 19 — 🔴 IDEA 64: dos pestañas abiertas borran una cuenta sin aviso

> **Espejo de la ronda 19 del PO.** La propuesta no se edita: donde discrepa del disco, el disco gana (ALERT-75).

### Lo que encontró el PO, y está reproducido sobre el código real

`KeyManager.save()` (`app.js:677-682`) escribe `this.list` —**la copia en memoria**— sin releer el disco.
Medido: **relectura antes de escribir: NO.** Y de 42 módulos, **1 solo escucha el evento `storage`**
(`wv-purchase-detail.js:2168`, y solo para `wvpd_icon_url` y `wv:season:*`): **nadie escucha un cambio en la lista de cuentas.**

Ejecutando el bloque `KeyManager` **literal** de `app.js` (líneas 648-774, 5.178 bytes) contra dos contextos
con el mismo `localStorage` —el modelo real entre pestañas—:

| paso | resultado |
|---|---|
| A y B arrancan con 27 cuentas | A ve 27 · B ve 27 |
| B **agrega** la cuenta 28 | disco = 28 · la pestaña A sigue con 27, no se enteró |
| A **renombra** "cuenta 1" → "MAIN-WOW" | disco = **27** · la 28 **ya no está** |

**Sin aviso, sin error, sin `console.log`.** Y como `settings-manager.js:44` lee por `Storage` para armar el Gist,
el próximo backup sube 27 cuentas: **el respaldo tampoco la tiene.**

El caso inverso duele más: B renombra la 5 a "ALT-PVE", A borra la cuenta 12 → la 5 **existe pero vuelve a
llamarse "cuenta 5"**. Se pierde el etiquetado `main`/`alter`/`f2p`, que es lo que permite ordenar 27 cuentas,
y la cuenta sigue en la lista funcionando.

### Por qué 793 aserciones / 0 FAIL no lo vieron (medido sobre `tests/`)

| | |
|---|---|
| archivos de test | 33 |
| que montan un `localStorage` | 14 |
| **con DOS stores o cross-tab** | **0** |

**Un lost update necesita dos escritores con dos copias del mismo dato.** Los 33 tests usan un sandbox con un
store, así que la copia en memoria siempre está al día. No es un dato malo: son **dos datos buenos que se pisaron**.

Dato que importa para el criterio del equipo: el test de la Idea 61 **ya declara el invariante correcto**
(su §6, línea 262: *"lo que hay que FORBIDIR no es el escritor crudo […] sino el LECTOR CRUDO"*) y hoy **da 0**.
**El test está bien y la clase que le falta es otra**: `idea61` probó que el espejo se mantiene, no que dos
escritores no se pisen.

> *Un invariante de coherencia no es un invariante de concurrencia.* El espejo `gn:` ↔ legacy de la 61 resolvió
> que las dos claves no diverjan — y eso no dice nada de quién escribió último.

### Tramos (a revisar por alcance, NO por diseño)

| # | tramo | dificultad | por qué |
|---|---|---|---|
| **T1** | `save()` relee antes de escribir (read-modify-write) | 🟢 ~20 min, ~4 líneas | **La decisión de alcance va al Principal**: releer arregla "la otra pestaña agregó" y **NO** arregla "la otra pestaña borró". Si la cuenta no está en la lista fresca, ¿no-op? ¿la crea? Mi recomendación: **no-op + `console.warn`** — la cuenta que la otra pestaña borró no tiene que reaparecer |
| **T2** | Alguien escucha `storage` para lista y selección | 🟢 ~30 min | Convierte el bug invisible en visible, y arregla que el `<select>` ofrezca 27 opciones que ya no son las de disco. **No implementa T1**: sin T1 sigue habiendo overwrite, pero Pablo ve que algo cambió |
| **T3** | Test de **la clase**, no del caso: dos contextos, un store, y que la cuenta que solo uno conoce sobreviva | 🟡 ~1 h | Con un store por test **esta clase no se puede cubrir** (misma razón que el Tramo 1 de la Idea 57: el test es la lista) |
| T4 | Aviso de "hay otra pestaña abierta" | — | **NO se propone.** Feature, no corrección, y T1+T2 lo vuelven innecesario |

**Orden: T1 → T2 → T3.** T1 y T2 no tocan la capa de datos (no aplica ALERT-48) y son estado local de la app,
como la 63. **No va al Reviewer todavía.**

### Lo que la wiki trajo y no es accionable

La wiki oficial (200) anuncia **"Code of Creation"**, último capítulo de Visions of Eternity: 6 capítulos de
historia, `Director Vloxx`, `Castora`, `Overseer Kuda`, y el evento **Dismount Rush (29-sep → 6-oct)**.
**No entra al backlog** por una razón medible: es contenido de **historia**, y ninguno de los 15 módulos
lee historia. El único evento con fecha **termina el 6-oct**: solo sería accionable si alguien lo implementa
antes. Se anota y se deja pasar, en vez de llenar el backlog con una feature de una semana.

### Corrección propia (y es la segunda de la ronda que casi mando)

Mi primer conteo dio "1 test con dos stores". **Era mi regex, no un test.** Con el patrón estricto: **0 de 33.**
Quinta vez en 72 h que un filtro mío inventa un hallazgo, y la segunda vez que el número corregido es
*peor* que el que reporté.

### Estado al cierre

`agents/main` @ `32de326` (`git fetch` primero). **T3+T4 de ALERT-84 tienen veredicto del Reviewer** (opción (a),
3 firmas como único bloqueante) — no lo toco, es del Principal. **49G** sigue sin implementar. **Idea 44:
0%, duodécimo heartbeat, sale de la tabla.** `homestead-tracker.js`: código muerto, **undécima** verificación.
Rama de la ronda: `po/hb71-dashboard`, **solo este archivo**. No commiteé código.


## ACTUALIZACION 2026-09-30 23:30 UTC — Heartbeat PO ronda 17 — 🔴 ALERT-84: un item de menú que no puede funcionar, y el trabajo que lo haría funcionar ya está escrito

> **Esta sección es el espejo de la ronda 17 del PO, con las correcciones que salieron al
> verificar contra el código. La propuesta del PO no se edita: donde discrepa del disco, se muestran las
> dos columnas y el disk gana** (ALERT-75: un resumen no puede pisar al artefacto que resume).

### Lo que encontró el PO (sostenido por el disco)

Un item de menú **visible** (`index.html:761`), con ruta registrada (`router.js:125/1562`),
panel (`index.html:539`) y script (`index.html:999`), llega a
`loadLegendaryData()` — **stub**, resuelve `[]` — y después a `renderCatalogSkeleton()`,
que escribe "Cargando". **Sin timeout, sin error, sin reintento: para siempre.**

Los 101 KB ya escritos y **no cargados por `index.html`**: `js/legendary-data.js`
(85.813 B, 206 legendarias, verificadas contra la API) y `js/render-catologo.js` (17.950 B).

Y si se cargaran, **no funcionarían**: `render-catologo.js:361` llama `registerRender()` (5 usos)
y `getState()` (1 uso), y la API pública real del tracker (`:308-339`) no expone ninguna de las
dos. **Se escribió contra una versión de `legendary-tracker.js` que nunca existió.**

> **La regla que sale de acá es la mejor de la ronda y queda como criterio del equipo:**
> *un esqueleto que llega hasta el menú deja de ser un esqueleto.* "Base primero, Phase 2 después"
> es correcto **hasta que `index.html` carga el esqueleto y el router publica la ruta**; ahí pasó a
> ser una promesa, y la app no puede retractarla porque no existe el estado "todavía no".
> **Corolario:** si el backlog tiene un "Phase 3 Commit 1", la pregunta no es "¿está el código
> escrito?" sino **"¿está cableado, y contra qué?"**

### 🔴 Corrección 1 — `vloxx` NO estaba roto (y era el #1 de la tabla de prioridades)

La ronda lo marco como **"sigue roto… quinto caso de la Idea 52… el fix más urgente del
backlog"**, 🔴 #1. Contra el disco:

- `raid-tracker.js:145` declara `vloxx` en el ala 9, y `idea52` lo tiene **allowlisted desde
  antes** (`FANTASMA_CONOCIDO`, `:110`).
- `idea52:145-147` afirma, textual: **"`vloxx` NO esta en el catalogo de la API (medido, no
  supuesto)"**, "vloxx sigue en WINGS: el ala del CM de Sept 29 se deja intacta a proposito", y
  "no tiene claves de datos: no hay huerfanas que limpiar".
- El motivo esta escrito: **`/v2/raids` no expone el ala Nexus of Eternity.** No es un rename mal
  corregido; es una decisión de producto con test que falla si la lista de fantasmas **crece**.

**No había un quinto caso de la Idea 52. Había un caso nuevo en la dirección contraria.**

### 🔴 Corrección 2 — el hallazgo real: el invariante estaba vigilado en UNA sola dirección

La Idea 52 midió que *todo encuentro del módulo existe en la API*. **La mitad inversa —que no
haya un evento de la API que el módulo no declare— no estaba vigilada.** Y la aritmética la
hacía invisible:

| | |
|---|---|
| encuentros que declara el módulo (`ALL.length === 30`) | 30 |
| eventos del catálogo de la API (`API.size === 30`) | 30 |
| **fantasmas** `app -> API` (vigilado) | 1 → `vloxx`, allowlisted |
| **faltantes** `API -> app` (**NO vigilado**) | 1 → **`camp`** |

**Los dos totales coinciden y hay un id equivocado en cada lado.** `ALL.length === 30` es la
asercion que hace esto *parecer* seguro: es una **asercion que pasa por construcción** (ALERT-77).
Cuenta los encuentros, pero **cuenta los dos lados por separado y nunca los compara**.

**`camp` — el "1 línea" de la ronda — es real, y NO se agregó a propósito.** El fixture congelado
(`tests/fixtures/raids-catalogo-2026-09-30.json`) lo trae como `{"id": "camp", "type":
"Checkpoint"}`: **sin `name`**. Agregarlo obligaría a inventar el nombre y el icono, y **un
hallazgo con datos inventados es peor que un hueco declarado**. Queda en `FALTANTE_CONOCIDO` con
el motivo escrito, y **la lista es la allowlist**: cualquier *otro* faltante nuevo falla igual
que un fantasma nuevo. Mergeado `1176be6`; fase roja 1 FAIL nombrando `camp`; suite **823/0**.

### Prioridades, con lo verificado

| # | Ítem | Estado real |
|---|---|---|
| 🔴 1 | ~~`vloxx` roto~~ | **DESCARTADO**: decisión de producto medida, con test. No hay fix que hacer |
| 🔴 2 | **ALERT-89**: `camp` + la guarda de la dirección inversa | **MERGEADO** (`1176be6`). El encuentro en sí espera el nombre oficial |
| 🟢 3 | ALERT-84 **T1** ("Coming soon") | **YA COMMITEADO** (`d64e688`) — la ronda lo listaba como pendiente de 10 min |
| 🔴 4 | ALERT-84 **T3+T4** (`loadLegendaryData` real + el contrato `registerRender`/`getState`) | **ENVIADO AL REVIEWER** (`task-509ffb6eb907`), como **una sola pregunta** |
| 🟡 5 | **T5**: build reproducible del catálogo (`_legendary_items_full.json` no está versionado y el script que lo consume no puede correr) | **ABIERTO**. La observación del PO es correcta y es la que mas duerde: el refresh depende de que el PO "se acuerde" |
| 🟡 6 | 49G (`ach_acc` compacto) | sin cambio — sigue cerrando la cuota |
| 🟡 7 | 63 T3 (persistir filtros por cuenta) | **DESBLOQUEADA** (T1+T2 en `eb69fb3`), pero **contraria** al T1. Preferencia de uso → Pablo |
| 🔴 8 | 49D | bloqueada por la Idea 61 (no implementarla) |

### Lo que este espejo NO hace

**No propone promover a `origin`.** La ronda tampoco lo propone, y queda dicho explícito en los
dos lados.

---

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
| 🔴 **0** | **IDEA 65 (ronda 22): 3 escritores de la lista de cuentas, 1 con candado.** La puerta de permisos (`ea10e9b`) solo protege `addOrUpdate`. `settings-manager.js:252 importApiKeys()` escribe `ACCOUNT_KEYS` a disco sin mirar un permiso, y es lo que usan **el restore de archivo y el Gist**; `accounts-panel.js:197` es el tercer escritor. `validateImportData` chequea versión y `app`, no keys. Con una key de 2 permisos restaurada, **los 14 módulos quedan vacíos sin un solo mensaje** y Suerte muestra `0%` | 🟡 ~1 h (T2) | **Abierta — T2 va al Reviewer** | Inmediato |
| 🔴 **0.2** | **T2-mini: el contador del modal** ("27 cuentas · 3 con permisos incompletos") | 🟢 ~20 min | **Abierta** | Con T2 |
| 🔴 **0.3** | **Copy `app.js:683`: `unlocks` nombra "glifos" y ese módulo es CÓDIGO MUERTO** (`homestead-tracker.js`, Idea 44, decimoquinto heartbeat en 0%). Error propio, introducido en el copy de la ronda 21 | 🟢 **1 línea** | **Abierta** | Inmediato |
| 🟢 **0.5** | **T4: el import dice cuántas de las N llegaron sin los 7** | 🟢 ~15 min | **Abierta — toca el import ⇒ Reviewer** | Con T2 |
| ✅ | **Ronda 21 T1 + T3: la puerta exige los 7 que la app USA, no 2** — **CERRADAS @ `ea10e9b`.** Verificadas por el PO en la ronda 22 contra un censo cerrado de **15 endpoints con scope** (la ronda 21 había medido 9): la unión de scopes es exactamente los 7 de `REQUIRED_PERMISSIONS`. **Sin verificar:** `/v2/account/wizards-vault` (la página de la wiki da 404 con ese título) | — | **Implementadas** | ✅ |
| 🔴 **1** | **IDEA 49G: `ach_acc` en forma compacta.** El Tramo C arregló `ach_meta` pero `kLS(base,token)` sigue guardando el fingerprint del token | 🟡 | **Abierta — es la que CIERRA la cuota** | Siguiente |
| 🟡 **2** | **IDEA 47 / 57: la capa que degrada a `[]`/`0`.** Es la **causa** de que una key mala parezca una cuenta vacía. T2 es la superficie; 47/57 son el fondo | 🟡 | 47 mergeada · 57 abierta | Con T2 |
| ⚠️ — | **`homestead-tracker.js` — FUERA DE LA TABLA.** Código muerto: wrappers ausentes del `return` de `GW2Api`, `index.html` no lo referencia. **Decimoquinto** heartbeat en 0%. Es también el módulo que el copy de `app.js:683` nombra como si existiera | — | **Decisión del Principal: implementar o borrar** | — |

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

El PO audito los 55 wrappers leyendo el código y el hallazgo **se sostiene**. Recorrí los 8 uno por uno y los 6 call sites. Confirmado: los 8 loguean y devuelven `[]`/`0`; los 46 restantes propagan; `getCommerceDelivery` (L478-483) es el único con el contrato escrito. **La premisa de la Idea 47 es válida y la Idea 45 t2 efectivamente está a medio dead** — `loadAccountSummary` (wallet-dashboard.js:384-399) tiene el catch correcto e inalcanzable para `characters` y `raids`.

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
- **Nuevas en el heartbeat 2026-10-01 04:00 UTC (ronda 22):** IDEA 65 (3 escritores de la lista de cuentas, 1 con candado) + T2-mini + T4 + el copy de `app.js:683`. Cerradas: ronda 21 **T1 + T3** (`ea10e9b`), ronda 20 **T5** (`b1b74bb`), ronda 19 **Idea 64 T1+T2** (`ea2721b`), ronda 17 **ALERT-84 T3+T4** (`4778f92`)

---

## Reglas de actualización

El PO actualiza este archivo en cada heartbeat (cada 2h):

1. Actualizar el timestamp del header.
2. Reflejar cambios en las prioridades de ideas.
3. Agregar ideas nuevas si surgen.
4. Marcar como pospuestas las que salen del foco.
5. Commit + push a agents.
