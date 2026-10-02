## ACTUALIZACION 2026-10-02 07:30 UTC — Heartbeat PO ronda 41 — MODO PODA: 10 items abiertos a 6, y el mas caro de la cola no existia

## ⟱ Heartbeat PO — ronda 43 (HB#142, 2026-10-02) — PAUSA: podado, y **la poda de la ronda 42 estaba FALSA**

**Control de carga:** `BACKLOG.md` sobre `origin/main` @ **`12907ef`** → **5 items `- [ ]`**, los 5 de sangría 0 → **MODO PAUSA** (4-7): no se traen ideas, la corrida es podado. **Sin items escondidos**: la sección *"Pendientes que el control de carga no contaba"* ya no aporta ninguno (sus 3 están `[x]`).

### 🔴 Corrección a la ronda 42: `/v2/wvw/objectives` **sí** tiene los Borderlands, y con nombre

La ronda 42 podó *"WvW Borderlands"* con dos afirmaciones: **"el endpoint no existe (404)"** y **"178 objetivos, ninguno de Borderlands"**. La primera es cierta y la segunda es **falsa** — y las dos juntas sostienen la poda.

| lo que la ronda 42 escribió | lo que dice el mismo endpoint |
|---|---|
| `/v2/wvw/objectives?ids=all` → *"178 objetivos, ninguno de Borderlands"* | **200**, **64 664 B**, y **178 de 178 tienen `name`**. `map_type`: **RedHome 42, GreenHome 42, BlueHome 42**, Center 28, EdgeOfTheMists 24. **Cero de otro mapa.** |
| *"el endpoint no existe"* | `/v2/wvw/borderlands` sí da 404 — **pero `/v2/wvw/objectives` es el endpoint del dato y da 200** |

**Cómo se produjo el "ninguno":** mirando `/v2/wvw/objectives` **sin `ids=all`**, que devuelve **strings** crudos (`"1099-99"`). Un string no tiene `map_type`, así que el filtro "cuáles son de Borderlands" no tenía nada que mirar. Con `?ids=all` el endpoint devuelve los objetos:

```
{"id":"1099-99","name":"Laboratorio de Hamm","type":"Camp","map_type":"RedHome",
 "map_id":1099,"upgrade_id":6,"marker":"https://render.guildwars2.com/.../102532.png",
 "chat_link":["&DGMAAABLBAAA"]}
{"id":"1143-99","name":"Laboratorio de Zakk",...,"map_type":"BlueHome","map_id":1143,...}
{"id":"1102-99","name":"Laboratorio de Lesh",...,"map_type":"GreenHome","map_id":1102,...}
```

**Y la fila de 6-8h era una promesa sobre mantener datos a mano que NO hay que mantener:**

| campo | cobertura | qué habilita |
|---|---|---|
| `name` | **178/178** | el nombre oficial viene en la respuesta — no hay que sourcear de la wiki |
| `chat_link` | **178/178** | compartir el objetivo con un clic — el entregable real de un tracker |
| `marker` | 151/178 | icono listo (URL de render) |
| `coord` | 97/178 (el resto `label_coord`) | coordenadas de mapa: render posible **sin** Tile Service |
| `upgrade_id` | **54 valores** (1-57, faltan 12 y 43) | cruza con `/v2/wvw/upgrades` |

**El deadline "Nov 10" tampoco sale de ninguna parte.** Lo único que la API publica sobre rotación de borderlands es `/v2/wvw/timers/teamAssignment` — **`Scope: none`**, público, sin token — y hoy devuelve `{"na":"2026-10-03T02:00:00Z","eu":"2026-11-06T18:00:00Z"}`. `/v2/wvw/timers/lockout` → `{"na":"2026-09-29T07:59:00Z","eu":"2026-11-03T07:59:00Z"}`. **El único deadline verificable es 6 de noviembre (EU).**

**Estado medido:** la app usa **0 de 21 rutas `/v2/wvw/*`** salvo `/v2/wvw/ranks` (`characters.js:505`), y **no dibuja mapas** (`tile|maprender|canvas` → 0; el único `map` es un link a `maps.gw2.io`, `meta.js:538`). **Corrección extra:** de los 8 `map_id`, solo **5 de 8** resuelven contra `/v2/maps` (1099, 95, 96, 38, 968); **3 no existen** (94, 1102, 1143), confirmado contra los **1086** mapas de `?ids=all`. O sea: **`map_id` no es confiable para el título del mapa, `map_type` sí** — está en cada objetivo.

**Decisión:** la fila **vuelve al backlog como 🟢**, no como 6-8h. El estimado venía de "hay que mantener los nombres" y los nombres vienen en el payload. Es el patrón de `wv-objectives-dashboard.js`, que ya existe. **No pido nada de esto ahora** (PAUSA): es para cuando baje de 3.

### Poda 2 — Idea 57: el arnés dice 7 y son **6** ocurrencias

`git show origin/main:js/api-gw2.js` + grep de `Array.isArray(data) ? data : []` → **6 en código** (`610, 957, 1001, 1077, 1129, 1177`) + **1 en comentario** (`126`). Dos son deliberadas y documentadas (`610` = `fetchBatchWithRepair`, helper de lote; `1129` = `getCommerceListings`, catálogo global, Idea 47). **Quedan 4 reales** — los mismos 4 que la ronda 42 identificó y que la fila nombra uno por uno. **La fila sigue ABIERTA por trabajo real**; el número que hay que corregir es el de la cabecera, que todavía dice "las nueve".

### Poda 3 — ALERT-41: **NO se poda**, y el número de la fila está mal

La fila dice *"los **15** ids de `STRIKES_BY_EXPANSION`"*. **Medido hoy contra la API viva:** la constante declara **6 expansiones y 16 strikes**, y los **16 dan `NO EXISTE`** contra `/v2/raids?ids=all` (200, 6 raids, **30 eventos** — los mismos 30, `{id, type}` y nada más, lo que confirma ALERT-89). **No se poda porque el bloqueador es una llamada de 30 segundos de Pablo, no trabajo del equipo.**

**Por qué esta no entra en la regla de "un item que depende de una decisión de producto no es cola de trabajo":** la ronda 41 archivó Homestead e Idea 63 T3 por eso, y el criterio era correcto ahí — la pregunta era *"¿qué quiere Pablo?"*. Acá la pregunta es *"¿qué devuelve la API?"*. **Una llamada de Pablo responde esta; una decisión de Pablo no.** Archivar un item bloqueado por un dato obtainable esconde el único camino de salida.

### Tres errores míos (los tres antes de reportar)

1. **`?ids=all` no lo usé en la primera pasada.** Pregunté a secas, recibí strings, y escribí *"178 ids opacos, ese es el corazón del estimado de 6-8h"*. **Estaba a punto de repetir como usuario la conclusión de la ronda 42.** La contramedida: si el id es opaco sin expandir, expandilo — ahí estaban los `name`.
2. **El conteo de prefijos dio 8 mapas y solo 5 resolvieron.** Sin imprimir el total junto al parcial, *"5 de 8"* se lee como "la API tiene 5".
3. **`findstr` no expande `%{http_code}`** (2ª vez en el repo). Los códigos salieron de `curl -w` en comando aparte.

### Reglas que salen
1. **Un endpoint que devuelve strings a secas y objetos con `?ids=all` es el mismo endpoint con dos respuestas, y la segunda tiene el dato.** *"Ninguno de Borderlands" salió de un filtro aplicado a strings que no tienen `map_type`.*
2. **Un deadline que no sale de la API no es un deadline.** "Nov 10" no está en ningún endpoint; el verificable es `teamAssignment` (público, sin token).
3. **"Bloqueado por un dato" y "bloqueado por una decisión" son filas distintas.** La primera se deja abierta: la respuesta existe y solo falta que alguien la pida.


> **Espejo de la ronda 41 del PO.** El control de carga (PASO 0.5 de AGENTS.md) dio
> **10 items abiertos** en `BACKLOG.md` @ `origin/main` `32926dd` = **≥8 = MODO PODA**.
> En MODO PODA la corrida entera es podar: **no se investiga y no se traen ideas.**
> Lo que hay abajo son **mediciones sobre el código y la API viva**, no(web research).

### El número que decide

| | items abiertos |
|---|---|
| al empezar (medido con `^- \[ \] `, que es el criterio del equipo) | **10** |
| al terminar | **6** |

Los 6 que quedan, y por qué siguen: **ALERT-41** (bloqueado por una llamada de Pablo con
token real), **Coberturable account-scoped**, **Dungeon dailies**, **Idea 57** (4 wrappers),
**WvW Borderlands** (deadline 10/11), **Idea 50 Tramo E** (30 min).

### 🔴 El más caro de la cola eran 15-20h de trabajo que no existía

La fila *"Legendary Armory Phase 3 — ⏳ AWAITING API connection (Phase 3 commit 4) —
~15-20h remaining"* era **el número más grande del backlog**, y su único bloqueo era una
espera. Medido pieza por pieza en `origin/main` @ `32926dd`:

| lo que la fila pedía | dónde está, medido |
|---|---|
| los 4 scripts cargados, en orden | `index.html:1012-1015` |
| la ruta | `router.js:125`, `:1616-1626`, `:1875-1879` |
| panel y nav | `index.html:539`, `:761` |
| `registerRender` + las 3 firmas del veredicto | `render-catologo.js` — 5 llamadas, `renderCatalogGrid`/`renderFilterBar`/`renderProgress` x3 cada una |
| **"Phase 3 commit 4"** | **`ed9a126`, mergeado**: el contrato de fabricación (`craftType` + `dataStatus` para los 206 ids) |

**Cerrada.** Un item que promete 15-20h y dice *"AWAITING"* no es trabajo a medias: es
trabajo inexistente con la etiqueta del trabajo inexistente.

### 🔴 Una fila cuya condición de cierre la API no puede cumplir

`ALERT-89` decía: *"Se cierra cuando el catálogo traiga el nombre oficial"*.
Medido contra `/v2/raids?ids=all` **hoy** (HTTP 200, 6 raids, 30 eventos):

> **Los 30 eventos traen `{id, type}`. Cero de 30 tienen `name`.**

`camp` no es la excepción: es la norma, y por eso el fixture congelado lo trajo sin nombre.
**Una fila que espera un dato que la fuente no produce espera para siempre.** El fix ya
está mergeado (`1176be6`, ancestro de `main` = SI) y la guarda con allowlist es la
protección permanente. Recontado hoy: **30 declarados, 30 en la API, 1 fantasma (`vloxx`),
1 faltante (`camp`), 0 duplicados.**

### Las otras dos podas

- **`Estilos inline de inventory-dashboard.js`** → archivada. Re-medido: siguen siendo **2**
  (`border-radius` en `:764` — un `<img>` — y `:885` — un `<label>`; las cifras de línea
  volvieron a correrse, 762/883 → 764/885). Y la fila **esperaba un veredicto de una task
  muerta**: `task-8408fd859db1` dio **404** y COMMS_LOG 029 quedó **CERRADA** en el HB#53.
  No es un item bloqueado, es un item **colgado**.
- **`Idea 63 T3`** → archivada. La fila misma dice *"no es del equipo: es preferencia de uso,
  va a Pablo"*: es una elección entre dos comportamientos, no trabajo. Misma regla que la
  fila de Homestead en la ronda 40.

### Una corrección que no es poda: la Idea 57 pedía 7 y quedan 4

La fila listaba `buys, sells, delivery y luck` + `prices`. **`luck` ya está hecho**:
`getAccountLuck` (`api-gw2.js:1347`) lleva `FORMA (v2.27.0)`: separa el `null` de forma del
`[]` legítimo y propaga solo el primero — el caso que la fila declaraba *"el peor de los
once"* es el único que quedó bien resuelto, y por la razón más difícil. **Lo que queda, con
el arnés y no a mano: 4** (`buys` `:918`, `sells` `:962`, `delivery` `:1038`, `prices`
`:1138`). Los otros 2 que degradan por forma degradan **a propósito y declarado**
(`fetchBatchWithRepair` `:602`, helper de lote; `getCommerceListings` `:1090`, catálogo global).

### ⚠️ Y un aviso de integridad que no es del backlog

Al crear el worktree de esta ronda, **`DASHBOARD_PO_IDEAS.md` llegó al disco con 0 bytes**
y `git status` lo reportaba como modificado — no como el HEAD. El blob en el árbol está
íntegro (**156.930 bytes**, sin pérdida en la historia; restaurado con `git checkout --`).
Lo que casi pasa es lo de siempre: si ese archivo hubiera llegado vacío y yo hubiera
"actualizado" el dashboard encima, **156 KB reemplazados por un párrafo**. Es el mismo
error que en la ronda 37 (reemplacé `PRE_BACKLOG.md` por una copia de 13 KB).

> **Después de `git worktree add`, medir el tamaño de los `.md` que son tuyos antes de
> editar uno.** Es la misma regla que *"imprimir el total junto al 0"*: un archivo que llega
> vacío no se nota hasta que ya lo sobreescribiste.


---

## ACTUALIZACION 2026-10-02 02:00 UTC — Heartbeat PO ronda 38 — T20: el botón de "Sincronizar desde la nube" dice 0 de las 7 cosas que su botón hermano dice las 7

> **Espejo de la ronda 38 del PO.** La propuesta no se edita: donde discrepa del disco, el disco gana.

### El hallazgo, en una tabla

Los **dos** botones de restauración ejecutan las **mismas 7 escrituras**
(`applyImportData`, `settings-manager.js:483`) y **dicen cosas distintas**:

| botón | qué dice el `confirm` |
|---|---|
| **archivo** · `settings-manager.js:593` | `'Se sobrescribirán:\n• API Keys (' + keyCount + ' claves)\n• Wizard's Vault…'` — **las 7 categorías, con la cifra** |
| **Gist** · `gist-sync.js:451` | `'Esto sobrescribirá tu configuración local.\n\n¿Continuar?'` — **0 categorías, 0 cifras** |

La capacidad ya está escrita **60 líneas antes, en el mismo archivo**. No hay que
descubrir nada para arreglarlo: hay que copiar.

### Arnés `_hb119_arnes.js` — `downloadAndSync()` verbatim, deps inyectadas

```
CONTROL  remoto==local (27/27), ACEPTA    27 -> 27   perdidas 0
CASO 1   remoto más viejo (27/12), ACEPTA 27 -> 12   perdidas 15   <- la escena
CASO 2   remoto más viejo (27/12), CANCELA 27 -> 27   perdidas 0
CASO 3   remoto más NUEVO (3/27), ACEPTA   3 -> 27   perdidas -24

el confirm menciona una cifra?  false  (los 4)
el confirm menciona una fecha?   false  (los 4)
```

El CONTROL discrimina: 27/27 deja 27 y 27/12 deja 12. El overwrite **no es una
suposición mía, se ejecutó**.

### Lo que lo hace serio: es el único elemento del backup sin segunda copia

Todo lo demás del export (pins de wallet, favoritos, home nodes) se regenera con
un click. **La lista de `apiKeys` no**: una API key de GW2 no se vuelve a
descargar de la página de ArenaNet. Si no la guardaste, hay que crear otra.

### El dato para arreglarlo existe y no lo lee nadie

`exportData()` escribe `exportedAt` (`settings-manager.js:209`). **Cero lecturas
en todo el repo** (0 ocurrencias fuera de sus 2 escrituras, 0 en `gist-sync.js`).
Y el otro ya está **en pantalla**: `updateGistStatus()` pinta *"Última
sincronización: \<fecha\>"* (`index.html:1235`), en el mismo modal, a centímetros
del botón.

### Por qué el equipo no lo vio — y sí lo vio a medias

HB#104 lo rozó. El comentario de `applyImportData` (`settings-manager.js:475`)
dice que *"el camino del Gist siempre fue correcto"* porque confirma antes de
importar. **Eso es cierto sobre el ORDEN** — y es por ahí que se dejó. El
problema de esta ronda no es el orden: es que **"el confirm está en el lugar
correcto" no es "el confirm dice la verdad"**. La regla escrita por el propio
equipo está en la v1.0.4 del mismo archivo (`:15`), y se aplicó al botón de
**liberar caché**. No se aplicó al de **borrar cuentas**.

### Tramos

- **T20-a** 🟢 15 min, 3 líneas — el confirm del Gist dice las mismas 7 categorías
  + `keyCount`. Precedente literal: `settings-manager.js:593`.
- **T20-b** 🟡 ~1 h — **la dirección**: si el remoto es más viejo, el confirm lo
  dice y nombra la diferencia. Sin esto, T20-a le muestra "12 claves" a Pablo y
  aun así no puede saber si son sus 12 o las 15 que le faltan.
- **T20-c** 🟢 30 min — **una foto local antes de sobrescribir**, con
  `exportData()`, que ya sabe armar el JSON. Es el principio de HB#104 aplicado
  al otro camino. **Sin el, el error de T20-b no tiene red.**

**T20-c es el único de los 3 que evita la pérdida en vez de contarla.**

### Prioridades (ronda 38)

| # | tramo | 🟢/🟡 | tiempo | nota |
|---|---|---|---|---|
| 1 | **T19-a** | 🟢 | 20 min | `gn:tokenchange` no llega al InventoryHub. El único que pido sin esperar |
| 2 | **T20-a** | 🟢 | 15 min | el confirm del Gist dice las 7 categorías + la cifra |
| 3 | **T20-c** | 🟢 | 30 min | foto local antes de sobrescribir. **El que evita la pérdida** |
| 4 | **T20-b** | 🟡 | ~1 h | la dirección. Va con T20-a, no la reemplaza |
| 5 | **T17-b** | 🟢 | 15 min | **decisión de Pablo:** `#/account/strikes` es una ruta sin botón que la alcance |
| 6 | T17-a | 🟢 | 20 min | el hash se actualiza al cambiar de vista |
| 7 | T18-a | 🟡 | 30 min | `showPanel()` y `setActiveView()` no se pisan |
| 8 | Opción (c) de T14/T15 | 🟡 | ~1 h | una sola pareja de botones. Cierra T14, T15, T16 y media T18 |
| 9 | T14-b | 🟢 | 20 min | test de unicidad, después de (c) |
| 10 | T11 | 🟢 | — | `accounts-panel.js` `state.view` sin persistir |

**Cerrada esta ronda:** **T19-c** ✅ mergeada (`d32e054`, HB#118) — los 4 lectores
de la cuenta seleccionada pasan por la capa `Storage`. Anotada en `PROMOTIONS.md`.
**Sigue abierta:** T19-a (el token muerto), T19-b (espera tu decisión de producto).

Sin novedad externa: **38 de 38 rondas** con Reddit 403 y
`gw2treasures/feeds/new_items` 404. gw2treasures **vivo** por otra ruta (la home,
HTTP 200): **78.425 ítems / 8.381 logros / 10.635 skins / 4.821 skills**. Lo que
salió de T20 salió de **preguntarme qué pasa si aprieto el botón de mi propia ronda
37**, no de ninguna búsqueda.

---


## ACTUALIZACION 2026-10-02 00:40 UTC — Heartbeat PO ronda 37 — T19: la app tiene un mecanismo de multi-pestaña que funciona, cubre 1 clave, y la clave que no cubre es la que Pablo está mirando.

> **Espejo de la ronda 37 del PO.** La propuesta no se edita: donde discrepa del disco, el disco gana.
> Medido sobre `origin/main` @ `5f4688f`, con `git fetch` primero.

La pregunta **no** es "¿qué feature falta?". Sale de una frase que la **ronda 36
dejó escrita como caso de uso de Pablo** — *"Pablo copia la URL y la abre en otra
pestaña"* — y que no seguimos: **si Pablo abre la Bóveda en dos pestañas, ¿la app
sabe que la otra existe?**

### 🔴 T19 — el filtro del handler es de 1 clave, y el dominio que escribe son 2

**Censo medido:** `git grep -n "addEventListener('storage'" -- js` → **2 listeners
en 46 módulos**: `app.js:804` y `wv-purchase-detail.js:2168`.

El de cuentas, verbatim (`app.js:798-821`):

```js
window.addEventListener('storage', (e) => {
  if (!e || e.key !== Storage.STORAGE_KEYS.ACCOUNT_KEYS) return;   // :805  ← el filtro
  ...
  // "Si la seleccion era una cuenta que la otra pestaña borro, se anula"
  try { Storage.remove(Storage.STORAGE_KEYS.ACCOUNT_SELECTED); } catch {}   // :815
});
```

**Lo que hay que mirar es la 815 contra la 805.** El handler **escribe**
`ACCOUNT_SELECTED` y **se niega a observarla**. Y el filtro no es una omisión de
lista: es una **guarda de igualdad sobre una clave, en un objeto que escribe
dos** (`app.js:791` y `:827`, a 32 líneas de distancia).

**Y el filtro sale más caro de lo que parece:** `gn:account:selected` está en
`MIRROR_MAP` (`storage.js:209-214`), así que `Storage.set` hace **2 `setItem`** y
el navegador emite **2 eventos**. El handler descarta los 2 con la misma línea.

### Arnés `_hb117_t19.mjs` — 3 casos, y el CONTROL discrimina

```
CONTROL — A agrega una cuenta, B mirando la lista
   eventos que recibió B : gn:account:keys, gw2_keys
   reacciones de B       : lista de cuentas actualizada        <- el listener FUNCIONA

CASO REAL — A cambia a CUENTA-14, B abierta al lado
   eventos que recibió B : gn:account:selected, gw2_selected_key_v1
   reacciones de B       : (NINGUNA)
   A muestra CUENTA-14   |   B muestra CUENTA-01   |   en disco: key-13

CASO 2 — F5 a la pestaña B
   B pasa de CUENTA-01 a CUENTA-14, misma URL
   -> la cuenta depende de QUÉ pestaña recarga

CASO 3 — A y B en CUENTA-05, A borra esa cuenta
   reacciones de B   : seleccion anulada  ->  disco: (borrada)
   eventos que recibió A : gn:account:selected, gw2_selected_key_v1
   reacciones de A   : (NINGUNA)
   A sigue pintando  : CUENTA-05          <- cuenta que ya no existe
```

**Lo que paga Pablo, en orden:**

1. **La segunda pestaña no es copia de la primera.** Misma URL, misma ruta,
   cuentas distintas — y con 27 cuentas **probablemente eso es lo que quiere**
   (mirar dos cuentas en paralelo). **Por eso el bug NO es que B no reaccione.**
2. **El F5 decide qué cuenta ves.** Sin aviso, con la misma URL.
3. **Caso 3: el mecanismo que SÍ funciona deja un token muerto.** B se protege
   y borra la clave compartida; A recibe los 2 eventos y no reacciona a ninguno.
   **Severidad honesta: media**, es transitorio (al recargar, `app.js:744` lo
   arregla). Lo vendo como **la demostración del contra-producto**, no como
   rotura de datos.

### ⚠️ 3 cosas que **no** afirmo (descartadas antes de reportar)

1. **"Los módulos siguen a la otra pestaña"** — FALSO. Hay **4** lectores a pelo
   de `gw2_selected_key_v1` (`inventory-hub.js:163`, `raid-tracker.js:921`,
   `strike-tracker.js:415`, `wv-purchase-detail.js:1842`) y **los 4 leen primero
   el `<select>`**, con localStorage de fallback. Casi reporto media app
   siguiendo a la otra.
2. **"El handler cubre 0 claves"** — el CONTROL lo desmiente: cubre 1, y bien.
   El titular honesto es **1 de 2**.
3. **El censo de "cuántas claves debería mirar"** — mi script dio **7** donde hay
   **63** literales `gn:`, porque la mayoría va por constante. **No abro idea con
   ese número.**

### 🔵 Pregunta que va a Pablo y define el tamaño del fix

> *¿La segunda pestaña es "otra cuenta a propósito" o "la misma, y la que no se
> enteró"?*

Si fuera lo segundo, el arreglo es 🟢 de una línea. Pero con 27 cuentas el caso
probable es el primero, y ahí **el arreglo no es sincronizar: es no mentir en el
F5.**

### Tramos

| # | tramo | 🟢/🟡 | tiempo | nota |
|---|---|---|---|---|
| 1 | **T19-a** | 🟢 | 20 min | **el único que pido sin esperar a nadie.** Caso 3: cuando el handler anula su selección, que el token muerto no quede en memoria. Guarda después de `this.list = fresh`, + 2 tests del arnés |
| 2 | **T19-c** | 🟢 | 15 min | los 4 lectores a pelo de `gw2_selected_key_v1` → `Storage.get(ACCOUNT_SELECTED)`. Hoy funcionan **por el espejo**, no por contrato. Otro archivo, otra clase: no se mezcla con T19-a |
| 3 | **T19-b** | 🟡 | — | **bloqueado por la pregunta a Pablo**, no por código |
| 4 | **T17-b** | 🟢 | 15 min | **decisión de Pablo:** `#/account/strikes` es una ruta sin botón que la alcance. **La única que cambia el producto** |
| 5 | **T17-a** | 🟢 | 20 min | el hash se actualiza al cambiar de vista con el toggle |
| 6 | **T18-a** | 🟡 | 30 min | `showPanel()` y `setActiveView()` no se pisan. Va con (c) |
| 7 | Opción (c) de T14/T15 | 🟡 | ~1 h | una sola pareja de botones |
| 8 | T14-b | 🟢 | 20 min | test de unicidad, **después** de (c) |
| 9 | T11 | 🟢 | — | `accounts-panel.js` `state.view` sin persistir |

Sin novedad externa: **37 de 37 rondas.** Reddit 403, `old.reddit` 302,
`gw2treasures/feeds/new_items` **307 → 404**, wiki 200.
**T19 no viene de la web:** sale de leer mi propia ronda 36 y preguntar qué hice
con una frase que escribí como caso de uso.

### Regla que sale

> *Un mecanismo que cubre 1 de las 2 claves que su propio objeto escribe no está
> terminado: está escrito a la mitad, y la mitad que falta es la que el comentario
> de al lado ya nombra.* La línea 815 **borra** `ACCOUNT_SELECTED` desde dentro de
> un handler que **filtra** `ACCOUNT_KEYS`. La capacidad estaba; faltaba la
> segunda clave de una guarda.

## ⟱ Heartbeat PO — ronda 42 (HB#132, 2026-10-02) — PAUSA: podado, y el podado encontró un endpoint que no existe

**Control de carga:** conteo sobre `origin/main` @ **`1b6b930`**, `findstr /r /c:"^- \[ \]" BACKLOG.md` → **5 items abiertos** → **MODO PAUSA** (4-7): no se agregan ideas, la corrida es podado. Las rondas 39-41 ya llevaron el número de 23 a 5.

⚠️ **La primera medición casi fue sobre el árbol equivocado.** El clon de `gw2-dev` que uso está en `docs-hb113-logs` @ `067754f`, **30+ commits atras y con 75 cambios ajenos sin commitear**. Contando ahí salen **20 items**, de los cuales 15 ya estaban podados en `main`: un conteo sobre el clon da **4 veces el número real** y hace creer que hay cola para llenar. Es la regla de la ronda 37 con el número al revés.

### Poda 1 — WvW Borderlands: 🚩 **el endpoint no existe (404)**

La fila pedía "~6-8h, Nov 10 deadline" y afirmaba *"la Bóveda tiene WvW objectives"*.

| medición | resultado |
|---|---|
| `/v2/wvw/borderlands` | **404**, body vacío |
| `/v2/wvw/objectives?ids=all` | **200**, 178 objetivos, **ninguno de Borderlands** |
| tipos de esos 178 | Camp 42, Tower 39, Ruins 30, Keep 24, Spawn 24, Generic 9, Resource 6, Mercenary 3, Castle 1 |
| `map_type` de la muestra | `RedHome` / `BlueHome` (WvW_home) |
| `git grep -n wvw origin/main -- js/` | 0 hits que no sean filtro de modo del WV |

**No hay ni el endpoint ni los datos.** Y lo de *"la Bóveda tiene WvW objectives"* es falso en el sentido útil: lo que hay es un **filtro de modo** sobre el Wizard's Vault (`wv-objectives-dashboard.js:244` ordena `pve 0 / pvp 1 / wvw 2`). El único WvW real es `characters.js:95/505` (`/v2/wvw/ranks`, público, para el nombre del rango). Es la clase ALERT-41 al revés: allá el endpoint existe y no trae lo esperado; **acá el endpoint directamente no existe**.

**Lo que sobrevive:** renderizar los 178 objetivos públicos (se bajan **sin token**). Es idea nueva → **no entra en esta corrida**, el control de carga está en PAUSA.

**Por qué se poda y no se archiva:** un item que promete 6-8h sobre un endpoint en 404 es *trabajo que no existe con la etiqueta de trabajo que no existe*. Si vuelve, la pregunta previa es una llamada: `curl /v2/wvw/borderlands`.

### Poda 2 — Idea 57: de los 4 sitios que quedan, **1 es trabajo real**

El arnés `tests/idea57.forma-contracts.test.js` corre **14 pass / 0 FAIL**: **7 sitios degradan por forma**, 3 declarados "a propósito" (`fetchBatchWithRepair` ×2, `getCommerceListings`), quedan **4**.

Pregunta nueva, y no era *"¿cuántos degradan?"* sino **"migrar el wrapper cambia algo que Pablo VE?"**. Arnés propio (`_hb132_arnes.js`, CONTROL 4/4) cruzando *la UI ya muestra el fallo* × *el catch de la capa ya propaga*:

| wrapper | UI ya lo muestra | catch propaga | migrar cambia algo |
|---|---|---|---|
| `getCommerceTransactionsBuys` | sí (`buysStatus='error'`) | sí | **NO — robustez** |
| `getCommerceTransactionsSells` | sí (`sellsStatus='error'`) | sí | **NO — robustez** |
| `getCommerceDelivery` | sí (`deliveryStatus='error'`) | sí | **NO — robustez** |
| `getCommercePrices` | **NO** | **NO** | **SÍ — trabajo real** |

Los 3 degradan en una ruta **cubierta 2 veces**: migrarlos no cambia una celda que Pablo vea. **`getCommercePrices` sí**: sus 2 call sites (`converter-modal.js:462`, `inventory-dashboard.js:600`) hacen `await` sin estado de error, y la capa no propaga ni el catch (por diseño: `out` se arma con `concat`, un lote caído no puede correr a los demás). En pantalla queda **el ítem sin precio, indistinguible de "no tiene precio en el TP"** — el mismo fallo de la Idea 47 que ya pagó caro la columna Suerte.

**Lo que queda abierto:** 1 wrapper propaga + sus 2 call sites distinguen *"no se pudo leer"* de *"no tiene"*, con el patrón ya escrito 3 veces en el mismo archivo. Las 3 de robustez → **revisar 2026-11-15**.

### Dos errores míos, ambos antes de reportar

1. **El arnés v1 dio un hecho FALSO**: "getCommerceDelivery sin catch". Lo tiene, y propaga (`throw error`). Mi extractor cortaba el cuerpo con `'\n  function '` y se comió el `catch`. Lo detecté porque **ya había leído ese código a mano 3 tool calls antes** — si no lo hubiera leído, lo reportaba. Rehecho en v2 con un CONTROL explícito.
2. **La v1 preguntaba "¿el call site tiene `try`?" y esa no es la pregunta.** El `try` no es cobertura: lo que importa es si el fallo llega a la pantalla. La v2 lo pregunta bien.

**Un objetivo (`%` en cmd)**: `curl -w "...:%%{http_code}"` salió literalmente `%{http_code}` y un `-o nul` con dos URLs imprimió la etiqueta dos veces. Una medición de red que **no da número** no es medición.

**Reglas que salen:**
1. *Contar sobre el clon de trabajo da 4 veces el número real.* El conteo de carga es la **única** medición que hay que hacer sobre `origin/main`, y es la que más fácil se hace mal porque el clon está a mano y `origin` hay que ir a buscarlo.
2. *Un item con un estimado grande es una afirmación sobre la fuente de datos, y hay que verificarla antes de podarlo o de creerlo.* "6-8h" y "Nov 10 deadline" son promesas; un 404 las desmiente a las dos.
3. *"Migrar el wrapper" y "el usuario ve algo distinto" son dos preguntas distintas, y solo la segunda es producto.* 3 de 4 sitios eran robustez en una ruta ya cubierta dos veces.
## ACTUALIZACION 2026-10-01 22:40 UTC — Heartbeat PO ronda 36 — T16/T17/T18: no hay "un toggle". Hay 2 rutas, 2 toggles y 3 verdades.

> **Espejo de la ronda 36 del PO.** La propuesta no se edita: donde discrepa del disco, el disco gana.

### Lo que cambia el encuadre de T14/T15

La ronda 35 y el veredicto del Reviewer (`904345b`) parten de que hay **un** toggle
de Raids/Strikes. **Hay dos rutas** (`router.js:123-124`, `:1584`, `:1600`) y
**0 enlaces en `index.html` las alcanzan**: el unico href del sidebar es `navRaids`
-> `#/account/raids` (`index.html:741`), rotulado **"Raids y Strikes"**.

### 🔴 T17 — la pref le gana a la URL, y la URL nunca se actualiza al cambiar de vista

| verdad | quien la escribe |
|---|---|
| **URL** | `route()`, solo al navegar. `setActiveView()` (`raid-tracker.js:1064-1089`) **no contiene `location` ni `hash`** |
| **pref** | `setActiveView()` (`raid-tracker.js:1066`). Ni `route()` ni `wireStrikeViewToggle()` la escriben |
| **DOM** | los 2 toggles + `showPanel()`, y se contradicen |

**3 verdades, 3 escritores, 0 reconciliacion.** El arnés `_hb114_t17.mjs`, con CONTROL:

```
click en "Strikes" del toggle:   URL=raids  pref=strikes  PANTALLA=strikes  -> DIFIEREN
CONTROL (solo URL, sin toggle):  URL=strikes pref=raids   PANTALLA=strikes  -> coinciden SIEMPRE
```

**Lo que paga Pablo:** la URL que copia para compartir, guardar en favorito o
mandar a un amigo **abre Raids aunque la haya copiado estando en Strikes**.

### 🔴 T18 — la misma URL, con la misma pref, abre 3 pantallas distintas

`pref=strikes`, `URL=#/account/raids`, 3 caminos de entrada (`_hb114_t18.mjs`):
**strikes / raids / raids**. CONTROL con `pref=raids`: **los 3 dan raids**.

Mecanismo verificado por lectura: `router.js:1586` llama `showPanel()` **antes**
de `activate()`, y `wireViewToggle()` tiene dos salidas — `:1108` `pintarSolo()`
**no toca paneles**, `:1114` `setActiveView()` **sí**. **La primera pasada pisa a
`showPanel()`; todas las siguientes no.** Cuál es la primera depende del latch.

**No es "la pestaña que no pedí": es la que le tocó.** No reproducible ni por error
ni por F5, sino por el camino.

### 🟡 T16 — los 4 botones de toggle nacen con `btn--accent` contradictorio

`0` en `index.html`; nacen de `innerHTML` (`raid-tracker.js:1227-1228`,
`strike-tracker.js:563-564`). Cada modulo afirma que **su** vista es la activa y
solo `wireViewToggle` repinta **2 de los 4**. Hoy Pablo no lo ve (el otro toggle
está oculto), y **la opción (c) del Reviewer lo mata por construcción**: no se pide aparte.

### ⚠️ Corrección al veredicto del Reviewer: **C3 no se sostiene**

> C3 [ALTA] "el toggle roto es el **único** camino de Pablo para salir de Strikes,
> y el work-around del router (barridoLatch keyed en el DOM) existe **POR T15**."

**MITAD 1 — FALSO.** Hay un segundo camino, y es el que Pablo va a usar: **el link
del sidebar**. Y **ese camino es el que sale de Strikes sin cambiar la pref**.

```
CONTROL (pref y URL de acuerdo)           -> URL/pantalla SI,  toggle/pantalla SI
route(#/account/raids) con pref=strikes  -> URL/pantalla *** NO ***, toggle SI
route(#/account/strikes) con pref=raids  -> URL/pantalla SI,  toggle *** NO ***
-> los 2 bugs son OPUESTOS; sin CONTROL se fusionan en uno.
```

**MITAD 2 — FALSO, y el router lo dice 9 líneas arriba.** `barridoLatch()` no lee ni
escribe la pref: su única condición es el DOM (`if (p && !p.hasAttribute('hidden')) continue;`,
`router.js:1521`), y el comentario en `:1489-1497` dice textual *"**NO es la pref**"*.

**Lo que sí es cierto de C3:** el toggle de abajo sí es un camino roto y sí produce
un estado estable visible. Eso ya está. Lo que no se sostiene es que sea **el único**,
ni que el work-around exista **por** T15. **Un work-around cuya causa resultó ser
otra se limpia en el mismo commit** — si no, el próximo que lea `barridoLatch` lo
va a defender como "por T15" para siempre.

### Prioridades

| # | tramo | 🟢/🟡 | tiempo | nota |
|---|---|---|---|---|
| 1 | **T17-b** | 🟢 | 15 min | **decisión de Pablo:** `#/account/strikes` es una ruta sin botón que la alcance. ¿Botón "Strikes" en el menú, o se borra la ruta? **La única que cambia el producto** |
| 2 | **T17-a** | 🟢 | 20 min | el hash se actualiza al cambiar de vista con el toggle |
| 3 | **T18-a** | 🟡 | 30 min | `showPanel()` y `setActiveView()` no se pisan. Va con (c) |
| 4 | **Opción (c) de T14/T15** | 🟡 | ~1 h | una sola pareja de botones. Cierra T14, T15, T16 y media T18. **El Reviewer tiene razón: "2 flags o 1" era el eje equivocado** |
| 5 | T14-b | 🟢 | 20 min | test de unicidad, **después** de (c) |
| 6 | T11 | 🟢 | — | `accounts-panel.js` `state.view` sin persistir |

Sin novelty externa: **36 de 36 rondas** con Reddit 403 y `gw2treasures/feeds` 404.
T16/T17/T18 salen de leer el veredicto del Reviewer y preguntarle *"¿esta pregunta
está bien formulada?"*.




---

## ACTUALIZACION 2026-10-01 20:05 UTC - Heartbeat PO ronda 35 - T14/T15: el fix de T13 abre la reentrada, y el toggle de Strikes no escribe la pref

> **Espejo de la ronda 35 del PO.** La propuesta no se edita: donde discrepa del disco, el disco gana (ALERT-75).
> Medido sobre `origin/main` @ `c50e008`. **T13 quedo APLICADA** (`1e5aedb`, predicado DOM pospuesto, P3/P4
> resueltos, suite 1282/0) y el PO la **cierra**.

La pregunta de la ronda no fue "¿qué feature falta?" sino la que **se la hacia el propio commit de T13**:
su mensaje termina con un PENDIENTE P1, *"unificar los dos toggles (P1). Hoy hay 2 implementaciones del
mismo control con semanticas distintas, y cualquier predicado queda pegado al estado {DOM, pref} que
produce el otro."* Ese P1 tiene dos mitades y **solo una es la que el commit nombro.**

### T15 (🔴 nuevo) — el toggle de Strikes cambia lo que Pablo ve y no deja rastro

`git grep -n "RAIDS_STRIKE_VIEW" origin/main -- js/` → **3 resultados**:

| | |
|---|---|
| `js/storage.js:89` | la declaracion: `gn:raids:strike:view` |
| `js/raid-tracker.js:1061` | la **UNICA** lectura (`prefGet`) |
| `js/raid-tracker.js:1066` | la **UNICA** escritura (`prefSet`) |

Y `strike-tracker.js` → **0 coincidencias** de `prefSet` / `prefGet` / `STORAGE_KEYS`.
No es que escriba mal: **no tiene acceso a la preferencia.** Sus 2 handlers (`:1209-1223`) mueven el DOM
y llaman `refresh(false)`, y nada mas.

Los 4 botones (`viewRaidsBtn`, `viewStrikesBtn`, `strikeViewRaidsBtn`, `strikeViewStrikesBtn`) estan en
**0 lugares de `index.html`**: los crea cada modulo a mano dentro de su propio panel. O sea que **cada
panel trae su propio toggle**, y uno de los dos no persiste lo que Pablo eligio.

**Arnes con CONTROL** (`_hb110_pref_divergencia.mjs`):

```
CONTROL (todo con el toggle de raid-tracker, que escribe la pref):
  click Strikes, click Raids, F5     pref=raids    pantalla=RAIDS    consistente: SI
CASO REAL (el ultimo toggle que toco Pablo fue el de strike-tracker):
  entro a Strikes, click Raids, F5   pref=strikes  pantalla=STRIKES  consistente: NO
  -> lo que Pablo estaba mirando al final: RAIDS
  -> lo que muestra despues del F5:     STRIKES
```

Sale de **2 clicks**: entrar a Strikes (con el toggle de Raids, que si escribe) y click en **"Raids" DENTRO
del panel de Strikes** — que es el unico toggle que Pablo puede usar estando ahi, porque esta viendo ese panel.

**El router no es el culpable; la pref lo esta.** El F5 hace su trabajo normal: `showPanel('raidTrackerPanel')`
(`router.js:1586`) y despues `wireViewToggle` corre `setActiveView(storedView)`.

> **Aclaracion de alcance, y es mia:** la **alcanzabilidad** del estado `{visible=raids, pref=strikes}` ya
> la habian medido en `1e5aedb` (`tools/hb108-toggle-divergencia.mjs`, 11 controles 11 ok) y asi lo escribio
> el commit. **Lo que no estaba medido era la CONSECUENCIA**: que ese estado **sobrevive al F5**. El PO aporta
> el "y que pasa despues", no el hallazgo.

### T14 (🔴 nuevo) — lo produce el fix de T13, no la app de antes

`strike-tracker.js:1155-1167`: `activate()` llama `wireStrikeViewToggle()` y esa funcion **no tiene guarda
`__viewToggleWired`**. El repo tiene esa guarda escrita **al lado**, en `raid-tracker.js:1108`, agregada por
**T12 en la ronda 33**, con un comentario que explica exactamente este bug.

**Arnés, cuerpo extraido VERBATIM de `:1202-1225`** (`_hb110_strike_toggle.mjs`):

```
CONTROL (activate() 1 vez):      handlers en el boton=1   refresh=1
CASO REAL (activate() 2 veces):  handlers en el boton=2   refresh=2
3 veces:                         handlers en el boton=3   refresh=3
DISCRIMINA: SI
```

**Por que T13-a lo ACTIVO**, medido sobre los 2 routers:

```
c60b096 (antes de T13-a):  deactivate() en el router = WV (1491), Activities (1495).  0 de los 4.
origin/main (con T13-a):   + barridoLatch() sobre MODULOS_CON_LATCH = 4 modulos.
```

Antes el **latch tapaba** el bug: `state.active` se quedaba en `true` y `activate()` no volvia a correr.
T13 bajo el latch, y con el latch bajo **la segunda pasada ahora ocurre**. Los botones persisten porque el
`innerHTML` de `ensurePanelContent` esta guardado por un `if` (`:562`).

> **Hallazgo de metodo de la ronda:** *un fix que cierra un ciclo de vida puede abrir el bug que ese ciclo
> ocultaba.* T13 es correcto y aun asi T14 no existiria sin el. Es distinta de "el guard esta mal escrito"
> (T2, ronda 24): **el guard no estaba, y no hacia falta porque nunca se ejecutaba dos veces.**

### El numero HONESTO de T14, no el que le conviene al titular

Medi el mutex de `refresh()` tambien (`_hb110_mutex.mjs`, cuerpo verbatim de `:1142-1154`) porque
"N handlers" suena a "N requests" y **no es eso**:

```
 1 handler  -> 1 carga       4 handlers -> 2 cargas
 2 handlers -> 2 cargas      8 handlers -> 2 cargas
 3 handlers -> 2 cargas     10 handlers -> 2 cargas
```

**El mutex coalesce y SATURA en 2 cargas**, con cualquier cantidad de handlers. O sea: **no son N requests,
son 2**, y el extra es **1 request por click**. Lo que **si** escala sin limite son los **listeners
acumulados** (medido 1→2→3) y el trabajo de DOM sobre un panel que puede no estar visible.

> **Correccion propia:** mi primer redactado decia "un click dispara N refresh y por lo tanto N requests".
> Medido: **2**, y satura ahi. **No lo vendo como N requests.** Regla: *cuando el titular dice "N veces", el
> arnes tiene que imprimir la N; si la instrumentacion satura, el titular tambien.*

### Tramos

| | Tramo | Dif | Tiempo |
|---|---|---|---|
| **T14-a** | el guard `__viewToggleWired` en `wireStrikeViewToggle`, con el nombre y el comentario que ya existen en `raid-tracker.js:1108` | 🟢 | 10 min |
| **T15-a** | que el toggle de Strikes escriba la pref por el camino que ya existe (exponer `setActiveView` y que lo cuente) | 🟢 | 15 min |
| **T15-b** | que sus 2 handlers **no toquen el DOM a pelo** y deleguen en `RaidTracker.setActiveView(view)` → los 2 toggles pasan a ser el mismo control = el P1 textual de `1e5aedb` | 🟢 | 10 min |
| **T14-b** | test que falle si una `wire*Toggle()` llama `addEventListener` sin guarda `__xWired` (evita el caso 6) | 🟢 | 20 min |
| T15-c | unificar los 4 botones en 2 | 🟡 | anotado, **no pedido** (refactor de UI; su beneficio depende de T15-b) |

**No implementado por el PO** (es del Principal). **T14-a y T15-a/b al Reviewer** por tocar modulo con ciclo de vida.

### Web

**35 de 35 rondas sin aporte** (Reddit 403, `gw2treasures.com/feeds` 404). No se reintenta ninguna.
**T14 y T15 salen del PENDIENTE que dejo el fix de la ronda anterior**, o sea del propio ciclo del equipo,
que es la unica fuente que todavia rinde. La ronda 22 ya establecio que con 0 aporte externo, forzar una
idea seria inventarla.

### Prioridades (ronda 35)

1. **T14-a** 🟢 10 min — 3 lineas, el guard que el repo ya tiene escrito al lado.
2. **T15-a + T15-b** 🟢 25 min — cierra el P1 textual de `1e5aedb` y el "abre en la pestana que no pediste".
3. **T14-b** 🟢 20 min — el test que evita el caso 6 de la clase del guard.
4. **T11** 🟢 — `accounts-panel.js` `state.view` sin persistir (gemelo de T13, un solo modulo).
5. T15-c 🟡 — anotado, no pedido.
6. Idea 49G → 47/57 → 49D → 49F/49E → 42 → 45.

### Estado

**Cerrada:** T13-a/b (ronda 34) — APLICADA en `1e5aedb`.
**Fuera de la tabla:** Idea 44 (homestead/dungeons), 0%. T13 la excluyo de `MODULOS_CON_LATCH` **con razon
medida**: su `deactivate()` solo hace `abortLastFetch()` y no tiene panel propio (`homesteadTrackerBody`, 0
matches en `index.html`).

---

## ACTUALIZACION 2026-10-01 18:00 UTC — Heartbeat PO ronda 34 — 🔴 T13: el latch que nadie apaga

> **Espejo de la ronda 34 del PO.** La propuesta no se edita: donde discrepa del disco, el disco gana (ALERT-75).

### El hallazgo, en una linea

Cinco modulos tienen `if (state.active) return;` en `activate()`. **Los cinco exportan
`deactivate()`. El router llama `deactivate()` en exactamente dos: `WV` y `Activities`
(`router.js:1491`, `router.js:1495`). Ninguno de los dos es de esta lista.**

O sea: `state.active` se prende la primera vez que Pablo abre el modulo y **no baja
hasta el F5**.

### Medido, no supuesto

```
modulos con `if (state.active) return;` en activate(): 5
  raid-tracker        refrescaAlCambiarCuenta=true   setInterval1s=3
  strike-tracker      refrescaAlCambiarCuenta=true   setInterval1s=3
  legendary-tracker   refrescaAlCambiarCuenta=true   setInterval1s=0  (stub: 0 red)
  inventory-hub       refrescaAlCambiarCuenta=false
  homestead-tracker   (codigo muerto, Idea 44 — fuera de la tabla)

a los que el router llama deactivate(): WV, Activities
```

**Arnes con CONTROL** (cuerpo del listener extraido *verbatim* de `origin/main` y
evaluado con deps inyectadas):

| | resultado |
|---|---|
| CONTROL — nunca se abrio Raids | `{"calls":[]}` |
| CASO REAL — visito Raids 1 vez, luego se fue | `{"calls":["refresh(true)"]}` |
| **discrimina** | **SI** |

El primer intento del arnes **NO discriminaba** (mi extractor de llaves fallaba y los
dos casos daban `{error}`). Se corrigio antes de reportar, no despues.

### Lo que paga Pablo

1. **3 requests de red por cada cambio de cuenta**, en paneles que no esta mirando
   (`gn:tokenchange`, `app.js:836` y `:1396`). Con `POOL_MAX=3` (Idea 48) esas requests
   **ocupan el pool** que el panel visible necesita.
2. **6 timers de 1s** (`setInterval(…, 1000)` x 3 en cada tracker) escribiendo
   `textContent` dentro de un panel con `hidden`, indefinidamente. `stopTimers()` los
   limpia los 3, pero **solo corre desde `deactivate()`**.

### El detalle que lo hace una finding y no una observacion

Los 5 modulos exportan `Route: { path, mount, unmount }` — el contrato de ciclo de vida
completo, con `unmount` incluido. Y **`git grep "\.Route\b" js/` da 0 resultados**: el
router nunca lo consulta, monta a mano en un `if/else if` de 20 ramas
(`router.js:1490-1822`). **La respuesta a "como se apaga un modulo" esta escrita en el
repo, en 5 lugares, y nadie la conecta.**

Las guardas de `gn:tokenchange` estan bien escritas **para un mundo donde existe un
`unmount`**. Ese mundo no existe.

### Tramos

| tramo | dificultad | que arregla |
|---|---|---|
| **T13-b** | 🟢 20 min | `stopTimers()` al principio de `activate()`, antes del `return` del guard. El menor cambio con el mayor radio: mata los 6 timers sin tocar el router. `startTimers()` YA es idempotente (limpia los 3 antes de crear, `raid-tracker.js:1193-1195`) |
| **T13-a** | 🟢 30 min | El router desactiva los 5 con latch, con el patron de las 2 lineas que ya existen (`:1491`/`:1495`). Cierra el refresh fantasma. **No arregla los timers** — son 2 problemas con 2 parades |
| **T13-d** | 🟢 20 min | Test que falle si un modulo tiene el guard y no esta en la lista de los que el router desactiva. Es lo que evita el caso 6 |
| T13-c | 🟡 | Conectar `Route.mount/unmount` y borrar el `if/else` de 20 ramas. **Anotado, NO pedido**: refactor de arquitectura |

**T13-a y T13-b al Reviewer**: tocan router + ciclo de vida de modulos.

### Dos numeros mios que estaban mal, y por que

Esta es la parte de metodo de la ronda y va primero porque es la que casi convierte el
finding en ruido:

1. **"el router solo desactiva a Activities".** FALSO: desactiva a **WV y Activities**.
   Mi regex era `/(?:\.|WV\.)(\w+)\.deactivate\(\)/` — exige un `.` o un `WV.` **antes**
   del nombre, y en `WV.deactivate();` el nombre esta al principio de la sentencia.
   *Un cuantificador mal puesto no devuelve "no hay": devuelve "no hay aqui".*
2. **"0 setInterval en raid-tracker".** FALSO: son **3**. Mi bloque por regex
   `/function startTimers[\s\S]{0,900}?setInterval/g` se cortaba antes, y `reduce`
   sobre un array vacio devuelve **0 sin error**.

Los dos son la misma clase: **un regex que no matchea produce un cero, y un cero no se
distingue de una medicion.** Es la regla de la ronda 12 que volvi a violar. Los dos los
agarre por contrastar contra el `git grep` que ya habia corrido en el mismo heartbeat.

### Web

**34 de 34 rondas sin aporte.** Reddit 403, `gw2treasures.com/feeds` 404. No reintento
ninguna: con 0 aporte externo, forzar una idea seria inventarla. T13 no viene de la web y
no necesita venir — sale de la pregunta que T12 dejaba abierta.

---

## ACTUALIZACION 2026-10-01 18:00 UTC — Heartbeat PO ronda 33 — 🔴 T12: el toggle Raids/Strikes está duplicado, y la mitad del tiempo es un botón MUERTO

> **Espejo de la ronda 33 del PO.** Medido sobre `origin/main` @ `844d33c`.

### El control está escrito dos veces, con 4 ids que no se comparten

| | ids | quién los inyecta | quién los cablea |
|---|---|---|---|
| strip de Raids | `viewRaidsBtn` / `viewStrikesBtn` | `raid-tracker.js:1200-1201` | `wireViewToggle()` (`:1034`) |
| strip de Strikes | `strikeViewRaidsBtn` / `strikeViewStrikesBtn` | `strike-tracker.js:563-564` | `wireStrikeViewToggle()` (`:1202`) |

Cada módulo inyecta su fila dentro de **su** panel y cablea **su** fila. `git grep` de los 4 ids
juntos: **ningún id en común**. Es el mismo control, dos veces.

### La copia sin la garantía (medido sobre el código, no supuesto)

| | escribe la pref | cambia las clases | llama `activate()` del otro |
|---|---|---|---|
| `wireViewToggle` (`raid-tracker.js:1034`) | **sí** (`prefSet`, `:1059`) | **sí** (`:1064-1067`) | **sí** |
| `wireStrikeViewToggle` (`strike-tracker.js:1202`) | **NO** | **NO** | **NO** — llama `refresh()` |

Misma forma visual (`.btn.btn--ghost` / `.btn--accent`), misma posición en la fila,
semántica distinta: **el de Raids recuerda la elección, el de Strikes no.**

### 🔴 El botón muerto — por qué esto es 🔴 y no 🟡

`ensurePanelContent()` (`raid-tracker.js:1184`) puebla el panel **con los botones pero sin
listener**. El único que se los pone es `wireViewToggle()`, y ese corre **solo** desde
`activate()` (`:1847`), que tiene guard de una vez (`:1826`).

El camino que hace Pablo — entrar por `#/account/strikes` y hacer clic en "Raids" — llama
`window.RaidTracker.refresh(false)` (`strike-tracker.js:1216`), **no** `activate()`.

Arnés con los strips extraídos *verbatim* del fuente (`_hb100_arnes2.mjs`):

```
CASO REAL — Pablo entra por #/account/strikes
  STRIKES visible   strikeViewRaidsBtn (ghost, CON listener)   strikeViewStrikesBtn (accent, CON listener)
  Pablo hace clic en "strikeViewRaidsBtn"...
  RAIDS visible     viewRaidsBtn (accent)   *** SIN LISTENER — BOTÓN MUERTO ***
```

**El F5 que Pablo acaba de hacer le restaura los listeners** (porque `activate()` corre en el
arranque de la ruta). O sea: el botón funciona *recién después de recargar*, que es
exactamente al revés de lo que espera cualquiera.

**Y es asimétrico:** en el sentido inverso (Raids → Strikes) `wireViewToggle` sí llama
`StrikeTracker.activate()`. Un sentido funciona, el otro no.

### Por qué 1100+ aserciones no lo ven

`tests/hb78-preferencia-pestana.test.js` prueba `wireViewToggle` con un sandbox donde **los 2
botones ya están inyectados y `document` resuelto** (`:161`): prueba el cableado en el mejor
caso, nunca el camino de entrada. Y `git grep strikeViewRaidsBtn tests/` → **0 matches**:
el segundo strip no tiene ni un assert.

*Un test de un control tiene que probar el camino de llegada al control, no el control ya
armado.* Es la misma clase que el lost update de la Idea 64 y que T8: hay que controlar el
**orden de las llamadas**, no un valor. El arnés discrimina porque el control y el caso real
dan resultados distintos — sin control, ambos habrían dado "no pasa nada" y el PO lo habría
reportado al revés.

### Tramos (el PO no implementa)

| # | tramo | dificultad | nota |
|---|---|---|---|
| **T12-a** | el camino inverso cablea el toggle del panel de destino | 🟢 ~30 min | lo barato: mover el cableado de `activate()` a `ensurePanelContent()` (donde los botones nacen), patrón ya presente en el repo |
| **T12-b** | borrar `wireStrikeViewToggle` y sus 2 botones; el strip de Strikes usa `viewRaidsBtn`/`viewStrikesBtn` | 🟢 ~15 min | 4 botones → 2, una sola implementación, y ya tiene la preferencia + el test. **Va después de T12-a**: toca el mismo archivo |
| **T12-c** | el resaltado de la pestaña activa | 🟡 | desaparece solo con T12-b |

### Falso positivo propio de la ronda (corregido antes de reportar)

Medí las claves de preferencia buscando **literales** `gn:...` en las líneas de `Storage.get`
y salieron **5 "declaradas sin lectura"**. **Las 5 sí persisten**: se leen y escriben por
**constante**, no por literal (`wallet-dashboard.js:249-250` + `:345/:358/:364/:374`;
`meta.js:36` + `:39/:873`). `STORAGE_KEYS` existe justamente para no repetir literales — mi
grep leía lo que el código evita. Regla: *la herramienta que encuentra el bug puede ser la que
lo inventó; contrastar el hallazgo contra el disco antes de escribirlo.*

Del censo queda una sola cosa real, anotada y **no propuesta**: `STATIC_KEYS`
(`storage.js:40-53`, 34 claves) se declara y no se usa en ningún lado (`git grep` → 1 match,
su propia declaración). No rompe nada — la migración usa `MIGRATION_PREFIXES` y el import usa
`KNOWN_NAMESPACES`. Es deuda, y borrar deuda no es valor para Pablo.

**Web: 33 de 33 rondas sin aporte.** `gw2treasures.com/feeds` → 404; Reddit sin nada;
Google devuelve anuncios de GW3 y balance. Confirma la regla de la ronda 22: con 0 aporte
externo, forzar una idea sería inventarla. **T12 salió sin web.**

---

## ACTUALIZACION 2026-10-01 11:00 UTC — Heartbeat PO ronda 33 — 🔴 T12: el toggle Raids/Strikes está duplicado, y la mitad del tiempo es un botón MUERTO

> **Espejo de la ronda 33 del PO.** Medido sobre `origin/main` @ `844d33c`.

### El control está escrito dos veces, con 4 ids que no se comparten

| | ids | quién los inyecta | quién los cablea |
|---|---|---|---|
| strip de Raids | `viewRaidsBtn` / `viewStrikesBtn` | `raid-tracker.js:1200-1201` | `wireViewToggle()` (`:1034`) |
| strip de Strikes | `strikeViewRaidsBtn` / `strikeViewStrikesBtn` | `strike-tracker.js:563-564` | `wireStrikeViewToggle()` (`:1202`) |

Cada módulo inyecta su fila dentro de **su** panel y cablea **su** fila. `git grep` de los 4 ids
juntos: **ningún id en común**. Es el mismo control, dos veces.

### La copia sin la garantía (medido sobre el código, no supuesto)

| | escribe la pref | cambia las clases | llama `activate()` del otro |
|---|---|---|---|
| `wireViewToggle` (`raid-tracker.js:1034`) | **sí** (`prefSet`, `:1059`) | **sí** (`:1064-1067`) | **sí** |
| `wireStrikeViewToggle` (`strike-tracker.js:1202`) | **NO** | **NO** | **NO** — llama `refresh()` |

Misma forma visual (`.btn.btn--ghost` / `.btn--accent`), misma posición en la fila,
semántica distinta: **el de Raids recuerda la elección, el de Strikes no.**

### 🔴 El botón muerto — por qué esto es 🔴 y no 🟡

`ensurePanelContent()` (`raid-tracker.js:1184`) puebla el panel **con los botones pero sin
listener**. El único que se los pone es `wireViewToggle()`, y ese corre **solo** desde
`activate()` (`:1847`), que tiene guard de una vez (`:1826`).

El camino que hace Pablo — entrar por `#/account/strikes` y hacer clic en "Raids" — llama
`window.RaidTracker.refresh(false)` (`strike-tracker.js:1216`), **no** `activate()`.

Arnés con los strips extraídos *verbatim* del fuente (`_hb100_arnes2.mjs`):

```
CASO REAL — Pablo entra por #/account/strikes
  STRIKES visible   strikeViewRaidsBtn (ghost, CON listener)   strikeViewStrikesBtn (accent, CON listener)
  Pablo hace clic en "strikeViewRaidsBtn"...
  RAIDS visible     viewRaidsBtn (accent)   *** SIN LISTENER — BOTÓN MUERTO ***
```

**El F5 que Pablo acaba de hacer le restaura los listeners** (porque `activate()` corre en el
arranque de la ruta). O sea: el botón funciona *recién después de recargar*, que es
exactamente al revés de lo que espera cualquiera.

**Y es asimétrico:** en el sentido inverso (Raids → Strikes) `wireViewToggle` sí llama
`StrikeTracker.activate()`. Un sentido funciona, el otro no.

### Por qué 1100+ aserciones no lo ven

`tests/hb78-preferencia-pestana.test.js` prueba `wireViewToggle` con un sandbox donde **los 2
botones ya están inyectados y `document` resuelto** (`:161`): prueba el cableado en el mejor
caso, nunca el camino de entrada. Y `git grep strikeViewRaidsBtn tests/` → **0 matches**:
el segundo strip no tiene ni un assert.

*Un test de un control tiene que probar el camino de llegada al control, no el control ya
armado.* Es la misma clase que el lost update de la Idea 64 y que T8: hay que controlar el
**orden de las llamadas**, no un valor. El arnés discrimina porque el control y el caso real
dan resultados distintos — sin control, ambos habrían dado "no pasa nada" y el PO lo habría
reportado al revés.

### Tramos (el PO no implementa)

| # | tramo | dificultad | nota |
|---|---|---|---|
| **T12-a** | el camino inverso cablea el toggle del panel de destino | 🟢 ~30 min | lo barato: mover el cableado de `activate()` a `ensurePanelContent()` (donde los botones nacen), patrón ya presente en el repo |
| **T12-b** | borrar `wireStrikeViewToggle` y sus 2 botones; el strip de Strikes usa `viewRaidsBtn`/`viewStrikesBtn` | 🟢 ~15 min | 4 botones → 2, una sola implementación, y ya tiene la preferencia + el test. **Va después de T12-a**: toca el mismo archivo |
| **T12-c** | el resaltado de la pestaña activa | 🟡 | desaparece solo con T12-b |

### Falso positivo propio de la ronda (corregido antes de reportar)

Medí las claves de preferencia buscando **literales** `gn:...` en las líneas de `Storage.get`
y salieron **5 "declaradas sin lectura"**. **Las 5 sí persisten**: se leen y escriben por
**constante**, no por literal (`wallet-dashboard.js:249-250` + `:345/:358/:364/:374`;
`meta.js:36` + `:39/:873`). `STORAGE_KEYS` existe justamente para no repetir literales — mi
grep leía lo que el código evita. Regla: *la herramienta que encuentra el bug puede ser la que
lo inventó; contrastar el hallazgo contra el disco antes de escribirlo.*

Del censo queda una sola cosa real, anotada y **no propuesta**: `STATIC_KEYS`
(`storage.js:40-53`, 34 claves) se declara y no se usa en ningún lado (`git grep` → 1 match,
su propia declaración). No rompe nada — la migración usa `MIGRATION_PREFIXES` y el import usa
`KNOWN_NAMESPACES`. Es deuda, y borrar deuda no es valor para Pablo.

**Web: 33 de 33 rondas sin aporte.** `gw2treasures.com/feeds` → 404; Reddit sin nada;
Google devuelve anuncios de GW3 y balance. Confirma la regla de la ronda 22: con 0 aporte
externo, forzar una idea sería inventarla. **T12 salió sin web.**

---

## ACTUALIZACION 2026-10-01 10:00 UTC — Heartbeat PO ronda 28 — 🔴 T9: el mutex de recarga no postpone la carga nueva: la CANCELA. Y hay 2 módulos que declararon el contador y nunca lo incrementaron

> **Espejo de la ronda 28 del PO.** Rama `po/hb87-dashboard`, **solo este archivo**. No commiteé código.

### La pregunta de la ronda no fue "¿qué feature falta?"

La ronda 27 encontró que dos cargas concurrentes hacemos que **gane la vieja** (`app.js`), y se arregló con
un contador de generación (`47e4819`). La pregunta de esta ronda fue la que ese commit no hacía:
**"¿ese fix cubrió el síntoma o la clase?"**

Vigésimasexta ronda de web research, **vigésimasexta sin feature nueva** (Reddit 403, `gw2treasures/feeds` 404).
Cero aporte externo, y está bien: la pregunta es de concurrencia, no de mercado.

### 🔴 T9 — el hallazgo

**No cubre la clase. La cubre al revés.** El fix de `app.js` agrega la guarda correcta *al revés del
mutex*: los otros 8 módulos que recargan por cambio de cuenta tienen el mutex **sin** la guarda, y el
mutex **no postpone la carga nueva: la descarta antes de pedirla.**

El patrón (`git grep -nE "if \(_\w*InFlight\) return _\w*InFlight"` sobre `js/`) está en **8 sitios**:

| módulo | función | ¿lee token? | ¿revalida tras el await? | guardia de generación |
|---|---|---|---|---|
| `raid-tracker.js:1803` | `refresh` | no (delega) | **NO** | **FANTASÍA: `_refreshSeq` declarado `:872`, nunca `++`** |
| `strike-tracker.js:1132` | `refresh` | no (delega) | **NO** | **FANTASÍA: `_refreshSeq` declarado `:396`, nunca `++`** |
| `homestead-tracker.js:424` | `refresh` | no | NO | ninguna |
| `wallet-dashboard.js:1168` | `refreshData` | no | NO | ninguna |
| `inventory-dashboard.js:1245` | `refreshData` | no | NO | ninguna |
| `wv-shop-ui.js:708` | `refreshShopData` | sí | NO | ninguna |
| `router.js:975` | `refreshShopData` | sí | sí | sí |
| `inventory-hub.js:1429` | `refresh` | no | sí | sí |

**Los dos "FANTASÍA" son el dato más barato de la ronda:** el contador que arregla la carrera **está
escrito, con nombre, en el lugar exacto, y nunca se incrementa.** Se lee y se publica en el diagnóstico
(`raid-tracker.js:1927`, `seq: _refreshSeq`) —o sea: **la app afirma medir la generación de la carga y
mide siempre 0.**

### Ejecutado, no inferido. Y con control que discrimina.

Función `refresh` + `loadStrikeData` **verbatim** de `strike-tracker.js` (`:1064`, `:1113`, `:1130`),
con la red inyectada y **el orden de resolución controlado por el test**:

| caso | qué pasó | veredicto |
|---|---|---|
| **1 — CONTROL**: A termina antes del cambio | pantalla = `["strike_2"]` (de B) | correcto |
| **2 — REAL**: Pablo cambia con A todavía en vuelo | **la carga de B NO SE PIDIÓ A LA RED** | pantalla = `["strike_1"]`, desplegable = `KEY-B` |
| **3 — CONTROL DEL ARNÉS**: mismo caso sin el mutex | A escribe al final | demuestra que el defecto es el mutex, no el `await` |

**El caso 3 es el que convierte esto en hallazgo y no en lectura:** el `await` solo produce "gana la vieja"
— que es exactamente lo que arregló `47e4819`. Lo que produce el mutex es peor: **`state.shop` nunca se
vuelve a pedir.** El select dice B y la pantalla muestra A, y no hay forma de recuperarlo: no hay reintento
cuando la carga vieja termina.

### El disparador es exactamente el que usa Pablo con 27 cuentas

- `raid-tracker.js:1867` y `strike-tracker.js:1179`: `gn:tokenchange` → `refresh(true)`
- `router.js:1811/1817`: al cambiar de cuenta, `refresh(true)`
- `activate()` llama `refresh(false)` **sin `await`** (`:1149`) → la carga de la cuenta vieja queda en vuelo

**La ventana son los primeros ~2 min tras el F5** (mediana de latencia 902 ms, ronda 02:00; `TTL.WALLET = 2 min`
en `api-gw2.js:409`) — o sea, es cuando Pablo abre la Bóveda y empieza a pasar de cuenta en cuenta.

### 🟢 Tramo 1 — 4 líneas por módulo, sin cambiar firmas

```js
let _refreshSeq = 0;                       // YA ESTÁ DECLARADO en los 2 módulos
async function refresh(forceNoCache) {
  const mine = ++_refreshSeq;
  if (_refreshInFlight) return _refreshInFlight;
  try {
    _refreshInFlight = loadStrikeData(!!forceNoCache, mine);
    await _refreshInFlight;
  } finally { if (mine === _refreshSeq) _refreshInFlight = null; }
}
```

y en el loader, antes de escribir: `if (mine !== _refreshSeq) return;`

**Empieza por `strike-tracker.js` y `raid-tracker.js`:** son los 2 con el contador ya declarado (el
escritor es otro, o sea que el diseño ya se decidió) **y los 2 con dos disparadores** de `refresh(true)`.

**🟢 Tramo 2 — 1 línea, y es independiente:** los 4 módulos sin secuencia
(`wallet-dashboard`, `inventory-dashboard`, `homestead-tracker`, `wv-shop-ui`) al menos **deben reintentar**
cuando el `finally` corre con una solicitud pendiente. Sin eso, la carga nueva no se pierde por datos
viejos: se pierde porque nunca se pidió.

### Por qué los tests no lo ven (medido)

`tests/hb87-carga-gana.test.js` es el test del fix de la ronda 27: 216 líneas, extrae `loadAllForToken`
de `app.js` y monta la carrera. **Es el test correcto del defecto que arregló.** No cubre los 8 módulos
con mutex porque **el defecto anterior y este son distintos**: uno es "la vieja gana al final", este es
"la nueva nunca se pide". El test que falta tiene que afirmar **que la red recibió una petición para B**,
no qué valor quedó en pantalla.

### Prioridades tras esta ronda

1. **T9 Tramo 1** 🟢 (raid + strike) — 2 contadores ya declarados, esperando un `++`
2. **T9 Tramo 2** 🟢 — reintento en los 4 módulos sin secuencia
3. **T2-mini** 🟢 (contador de cuentas con permisos incompletos) → **T2** 🟡 → **T4** 🟢
4. 49G → 47/57 → 49D → 49F/49E → 42 → 45

**Fuera:** Idea 44 (`homestead-tracker.js` es código muerto — **decimoctavo** heartbeat en 0%).

**La regla que sale:** *un contador declarado y nunca incrementado es peor que un contador ausente.*
El ausente te dice que no hay defensa. El declarado te dice que **hay una defensa, y que alguien la
desconectó** — y como se publica en el diagnóstico, la app miente sobre su propia concurrencia.




---

## ACTUALIZACION 2026-10-01 09:00 UTC - Heartbeat PO ronda 27 - **T8: la cuenta que Pablo dejo es la que aparece**

> **Espejo de la ronda 27 del PO.** Detalle largo en `PRE_BACKLOG.md` (privado).
> La ronda abre **una idea (T8)** y cierra **dos tramos viejos + una consulta**.

### 1) NOVEDADES: sin feature externa. **25 de 25 rondas**

Reddit **403**, gw2treasures `/feeds` **404** (25 de 25). La pregunta de la ronda no
fue "¿qué feature falta?" sino la que nacía de `1f0fd6e`: **el toast de carga pasó a
ser persistente**, y si un toast dura lo que dura la carga, la pregunta es
**¿cuál de las 27 está cargando?** Y de ahi la de verdad: **¿qué pasa si hay dos?**

### 2) 🔴 T8 - la carga vieja gana (🟢 3-4 lineas)

`loadAllForToken` (`app.js:638-661`) escribe `state.accountName`, `state.wallet` y
`el.ownerLabel` **sin ninguna guarda**. `git grep -nE "KeyManager\.selected\s*(===|!==)"`
sobre todo `js/` -> **0 resultados**.

**Ejecutado, no inferido.** Extraje la funcion **verbatim** de `origin/main`, la
evaluate con deps inyectadas y el **orden de respuesta controlado por mi**, con un
control en orden natural:

```
CASO 1 CONTROL (la ultima en pedir es la ultima en responder):
   accountName = CUENTA-B | wallet = [{"id":"item-de-B"}]        <- correcto
CASO 2 (B responde primero, la carga vieja de A despues):
   tras la carga vieja -> accountName = CUENTA-A | wallet = [{"id":"item-de-A"}]
   Pablo selecciono B. Lo que la app le muestra es: CUENTA-A
```

**El titular casi salio mal.** El bug no es "se pisan dos cargas": es **"el dropdown
dice B y el wallet es de A"**, porque `KeyManager.setSelected` ya corrio **antes**
del `await`. Y el `ownerLabel` recibe el mismo valor viejo, asi que **el rotulo del
bug miente junto con los datos**.

**Camino real:** `app.js:1260`, el `change` del **desplegable global** — handler
`async`, sin debounce, sin abort. Tambien el boton "Usar" (`:1047`) y el borrado
(`:900`, sin `await`).

**La ventana: los primeros 2 minutos tras el F5.** `TTL.WALLET = 2 * 60 * 1000`
(`api-gw2.js:409`). Cacheado -> `Promise.resolve(cached)`, **la carrera no puede
ocurrir**. Sin cache -> red. Y sin cache esta **el arranque**, que es cuando Pablo
abre la boveda y pasa de cuenta en cuenta.

**Tramo 1 🟢 3 lineas, sin cambiar firmas:**
```js
let loadSeq = 0;
async function loadAllForToken(token) {
  const mine = ++loadSeq;
  ...
    if (mine !== loadSeq) return;      // una carga vieja NO escribe
    state.accountName = acct?.name || '—'; state.wallet = w || [];
```
No cancela la request, pero impide que se muestre. El `abort` real (🟡) ya tiene
patron en el repo: `router.js:1466` (`_actAbort`). La guarda va **dentro** del
`try`, asi que el `finally` de `1f0fd6e` sigue cerrando el toast viejo: **este fix
no deshace el anterior**.

**Tramo 2 🟢 1 linea, mismo diff:** `'Cargando wallet...'` no dice de que cuenta.
Con la carrera hay **2 toasts identicos apilados** (medido por el harness:
`textos = ["Cargando wallet..."]`), y el `setStatus` da **dos "Listo."**.

**Por que los 1122 asserts no lo ven:** ninguno puede montar dos cargas
concurrentes — hace falta controlar el **orden de resolucion de la red**, no un
valor. Misma clase que el lost update de la Idea 64.

### 3) Cierres de la ronda

- **T7 CERRADA** — `1f0fd6e` puso `opts.ttl ?? 3500`. La ronda 26 la dio por abierta
  y esta la mide **cerrada**.
- **T6 CERRADA** — `2593306` (el toast estaba **detras** del modal) + test de la
  *relacion* `z-index(toasts) > z-index(modal)`.
- **Cuentas-panel** — `9ab5733`: clickear el nombre ya no te saca de la vista.
- **`toast.legacy:228`** quedo con `ms||2500` (el gemelo que la ronda 26 previjo).
  **Latente, no vivo**: los 4 callers pasan 1600/1200/2400/1400, ninguno 0.
  No abro ticket; se arregla en el mismo diff si se vuelve a tocar `toast()`.
- **Consulta al Reviewer `task-254bb8f34cca` CERRADA.** Medio que `raid_strike_view`
  esta **fuera** de `MIRROR_MAP` (solo `FALLBACK_MAP` + `MIGRATION_PREFIXES`), lo
  cual **coincide con mi correccion de la ronda 23** (lo habia citado como si
  estuviera en `MIRROR_MAP`; no lo esta). "Tolerant" en las dos, acepto.
  **Su punto 2 quedo superado antes de que contestara:** `f9239d7` paso
  `:1012/:1016` por `prefSet(STORAGE_KEYS_RT.RAIDS_STRIKE_VIEW, ...)` -> `Storage.set`
  (`:910`), lee por `prefGet` la `gn:` (`:1054`). Verificado en `origin/main`.
  *Un veredicto medido sobre el arbol de otro es un veredicto con fecha.*
- **T2 sigue ABIERTA:** `tokenHasWVPermissions` (`api-gw2.js:712`, expuesta en
  `:1918`) sigue con **0 callers**.

### 4) Prioridades

**T8 (🟢 4 lineas) -> T2-mini (🟢 20 min) -> T2 chips (🟡) -> T4 (🟢) -> 49G -> 47/57
-> 49D -> 49F/49E -> 42 -> 45.** Fuera: Idea 44.

### 5) Estado del repo

`origin/main` @ **`950753d`**. Clon compartido en `fix-hb77-puerta-llega` @
`11285a0` con 2 untracked ajenos — **no lo toco** (ALERT-43/59). Este dashboard va
en el worktree propio `wt-r22`, rama `po/hb77-dashboard`. **El PO no mergea.**

## ACTUALIZACION 2026-10-01 08:00 UTC — Heartbeat PO ronda 26 — **T7 no se implemento, y el test que lo bloquea afirma la razon por la que no se puede**

> **Espejo de la ronda 26 del PO.** Detalle largo en `PRE_BACKLOG.md` (privado). Esta ronda **no abre idea ni tramo nuevo**: su producto es **el fix de T7 cerrado con su test**, mas un **censo que responde si la clase es 1 caso o una familia**.

### 1) NOVEDADES: sin idea nueva. **24 de 24 rondas** de web research sin feature externa

Reddit `/r/Guildwars2` → **403** (24 de 24, probé también la variante `.json`). gw2treasures `/feeds` → **404** (24 de 24). El único resultado GW2 toolado fue FarmingTracker (Raidcore), que además usa un **DRF Token** (servicio externo) — **no abro idea**: contradice el criterio de Pablo de "todo en el navegador, sin servidores externos". Queda anotado como P3 descartado para que no vuelva a salir.

### 2) T7: el call site ya esta arreglado, la linea que lo anula no

`agents/main` @ **`d970995`** (sin cambio desde el cierre de la ronda 25). Dato nuevo de esta ronda: el fix del HB80 (`585367d`) **si puso `{ ttl: 0 }` en `app.js:1180`**. O sea que el paso 1 de T7 ya se dio — **falta solo la linea 215**:

| call site | pide | obtiene | lee 411 chars? |
|---|---|---|---|
| `app.js:634` (`'Cargando wallet...'`) | `ttl: 0` | **3500 ms** | no aplica (cortos) |
| **`app.js:1180`** (puerta de permisos) | `ttl: 0` | **3500 ms** | **~16 s de lectura contra 3,5 s** |

```js
app.js:215   const ttl = Number(opts.ttl || 3500);   // 0 es falsy -> el default pisa el cero
app.js:216   const timer = ttl>0 ? setTimeout(close, ttl) : null;
```

### 3) LO NUEVO Y LO QUE CAMBIA EL ESTADO: **arreglar T7 rompe un test que hoy pasa**

`tests/hb80-toast-permanencia.test.js`, seccion 3, assert 4:

```js
// El ttl por defecto, si alguien pasa un opts vacio, sigue siendo finito: el 0
// es explicito en el call-site, no un default silencioso.
const defTtl = app.match(/opts\.ttl\s*\|\|\s*(\d+)/);
ok(!!defTtl, 'el ttl por defecto de toast() sigue siendo un numero finito', ...);
```

Con el fix de T7 este assert **deja de matchear y falla**. Y no es un assert accidental: su comentario afirma un requisito real (*"el default tiene que seguir siendo finito"*), y la expresion `opts.ttl || (\d+)` es la unica forma de garantizarlo con un `match`.

**La paradoja, textual: el `||` es a la vez el defecto (se come el 0) y lo que el test garantiza (default finito).** El test no puede distinguir *"un `||` con default 3500"* de *"un `||` que se come el 0"*, porque **son literalmente la misma expresion**. *La forma que el bug necesita es la forma que la garantia necesita.*

**El fix completo son 2 lineas, no 1.** La ronda 25 dijo "el assert 4 hay que cambiarlo" sin medir cuanto ni que tenia que decir el reemplazo. Medido:

```js
// app.js:215  — respeta el 0 explicito y mantiene el default finito
const ttl = Number(opts.ttl === undefined ? 3500 : opts.ttl);

// el assert baja de la FORMA al COMPORTAMIENTO, que es lo que su comentario
// decia querer:  {ttl: 0} -> 0 (sin temporizador)   |   {} -> 3500 (finito)
```

### 4) El censo que responde la pregunta de la ronda: **la clase es 1 caso**

Busque `(opts|o|options|config|params)\.<campo> \|\| <numero>` en los 46 modulos de `js/` + `index.html`:

```
origin/main:js/app.js:215    const ttl = Number(opts.ttl || 3500);
```

**1 coincidencia.** Con el patron ancho hay 200+ (`count || 0`, `cost || 0`, `size || 48`), pero **ninguna puede fallar**: ahi el valor legitimo y el default son el mismo (`0 || 0 === 0`). La condicion para que la clase exista es ***"el default es distinto del valor legitimo"*** — y hay **1**.

**`toast.legacy` (`app.js:221`, `{ttl: ms||2500}`) es el mismo defecto con el mismo default distinto**, pero los 4 callers (`meta.js`) pasan `ms` posicional y ninguno tiene un `0` natural. **Se arregla en la misma pasada que `:215`; no es un ticket aparte.** Si se toca solo `:215`, `:221` queda como el gemelo que nadie vuelve a mirar.

### 5) Anotado sin backlog (P3) — y explicitamente **NO verificado**

- **`wv-purchase-detail.js` 5× `limit` sin normalizar** (`:1744/1781/1824/1883/2004`): usan `rowData.purchase_limit` a pelo, mientras **24 sitios del mismo repo** usan el patron guardado (`typeof X === 'number' ? X : null`, en `router.js` y `wv-shop-ui.js`). Si un item llega sin `purchase_limit`, el input permite `999` inventado, el boton MAX queda inerte (`data-limit="0"` + `if (maxLimit > 0)`) y el status imprime **literalmente `"Pendiente: null (0 AA)"`**.
  **No se puede confirmar sin token de cuenta:** `/v2/items` devuelve `purchase_limit` en **0 de 958** items (ids 19000–20599, medido) — el campo solo existe en las listings de `/v2/account/commerce/listings`. **No hay caso vivo verificado, asi que no entra al backlog.**
- `activities.js:713` (feedback de "copiado" a 200 ms, con un toast de 900 ms que dice lo mismo) · `gn:toast` (`legendary-tracker.js:124`, dispatch sin listener) · DRF como dependencia (descartado).

### Prioridades al cierre

1. **T7 — 2 lineas** (`:215` + assert 4). **PRIMERO.** El unico fix de 1 linea del backlog donde el unico obstaculo es el test que lo defiende.
2. **T2-mini** (contador de cuentas con permisos incompletos) → 3. **T2** chips por fila → 4. **T4** (el import dice cuantas llegaron sin los 7)
5. **49G** (`ach_acc` compacto — la que cierra la cuota) → 6. **47/57** (la capa que degrada a `[]` es la causa de que una key mala parezca una cuenta vacia) → 7. 49D → 49F/49E → 42 → 45
8. **Idea 44: fuera de la tabla** (decimoctavo heartbeat en 0%).

### Reglas que salen

1. *Un test que afirma una forma no puede guardar una propiedad de esa forma.* El assert 4 exige `opts.ttl || (\d+)`; el fix correcto borra exactamente esa expresion. **El test y el bug son la misma linea leida con dos intenciones.** El reemplazo no es "arreglar el test para que pase": es **bajar la asercion de la forma al comportamiento**, que es lo que el comentario del test ya decia querer.
2. *La clase se cierra cuando el valor legitimo y el default coinciden.* `count || 0` no es un caso porque no puede fallar; `ttl || 3500` si porque puede. **Un grep de `|| <n>` sin el filtro "default != legitimo" da 200 falsos positivos**, y se lee como "el repo entero tiene el bug".
3. *Cuando dos modulos hacen lo mismo con convenciones distintas, el bug no esta en ninguno: esta en que uno de los dos va a ser el que se actualice.* 24 sitios normalizan `purchase_limit`, 5 no. Sin caso vivo verificado, **no entra al backlog** — pero el dia que haya uno, la causa va a ser "este archivo no normaliza", no "la API cambio".

### Estado

`agents/main` @ **`d970995`**. El fix de z-index de la ronda 25 sigue en `hb81-ciclo` @ `b1fe9e7`, **sin mergear**. Clon compartido en `fix-hb77-puerta-llega` con 2 untracked ajenos — **no lo toco** (ALERT-43/59). Trabajo en mi worktree limpio `wt-r22`, rama `po/hb77-dashboard`, solo `.md`, **no mergeo** (el PO no mergea).

---

## ACTUALIZACION 2026-10-01 07:30 UTC - Heartbeat PO ronda 32 - T1-bis: el boton esta duplicado, y el que escribe bien es el que esta muerto

> **Espejo de la ronda 32 del PO.** No se editan filas existentes.

### T1-bis confirmado en los 3 puntos de delegacion, y el alcance medido es MAYOR al propuesto

Los 3 puntos que pidio el Principal delegan de verdad (medido sobre `origin/main` @ `c1b0693`):

| punto | delegation | estado |
|---|---|---|
| `router.js:775-776` | `if (window.WVShopUI) { WVShopUI.render(); return; }` | **delega y corta** |
| `router.js:1013-1015` | `if (window.WVShopUI) { ensureShopToolbar(); render(); }` | **delega** |
| `router.js:1176-1178` | `if (window.WVShopUI) { ensureShopToolbar(); return refresh(false)... }` | **delega** |

Y `wv-shop-ui.js` esta cargado **siempre**: `index.html:1009` lo declara con `defer`, antes que
`router.js` (`index.html:1020`). Los dos son `defer`, o sea el orden de ejecucion es el del HTML.
**La rama `else` es inalcanzable.** El fallback de `router.js:780-...` es codigo muerto,
confirmado: su unico camino vivo es el `if`.

### LO QUE NO ESTABA EN LA PROPUESTA: el boton esta escrito DOS VECES, y las dos copias se contradicen

Medido con `git grep` sobre `origin/main`:

- **Copia A (viva):** `wv-shop-ui.js:192` pinta el boton, `:220-224` lo cablea, `:222`
  escribe **`localStorage.setItem('gw2_wv_view_v1', ...)` A PELO**. Rótulo: `'Vista: Tarjetas'`.
- **Copia B (muerta):** `router.js:498` pinta el boton, `:523` lo cablea, `:523` llama
  **`saveView(...)` -> `Storage.set(LS_WV_SHOP_VIEW, v)`**. Rótulo: `'Vista: Tarjetas'`.

**Los dos rotulos son identicos y los dos autores son distintos.** El que sobrevive escribe a pelo;
el que esta muerto escribe por `Storage`. `saveView` tiene **1 solo caller** (`:523`), y `:523` esta
dentro del bloque que `:775` ya corto. Medido: `saveView` es alcanzable **0 veces**.

Consecuencia para T1: **el fix (i) "declarar la clave en `MIRROR_MAP`" repara el symptoms pero deja
vivo el escritor crudo, y el fix (ii) "pasar el escritor por `Storage` repara los dos. La pregunta
(i) vs (ii) que esta en el Reviewer tiene una respuesta mas simple que las dos: hay un tercer camino.**

**T1-bis = 1 decision, no 2:** borrar la copia muerta (`router.js:486-525`, `:257-262`, `:773-...` hasta
el `return`) deja **una sola** escritura, y esa una es la que hay que arreglar. Arreglar las dos y
despues borrar tambien funciona, pero paga un fix en codigo que no corre.

### La premisa del arnes del Principal era mas grande que el bug, y por eso T1 se achica

El arnes dio "CONGELADA - FALLA" con `legacy=table`, `gn:=cards`. Correcto como arnes.
Lo que el arnes **no** puede ver: el estado NO esta congelado **dentro de la sesion**.
`wv-shop-ui.js:66-68` -> `root.WV.__getShopState()` devuelve **el mismo objeto** que
`state.shop` del router (`router.js:990-995` escribe en el). O sea el click muta el estado
compartido y el render siguiente lo ve. **La preferencia se pierde al recargar (F5), y solo al
recargar** - en `router.js:995` y `:1173`, `state.shop.view = loadView()` relee la `gn:`.

**Traducido a producto: lo que Pablo pierde es "la vista que elegi, al abrir la app manana".
No es "la vista que elegi, mientras la app esta abierta".** Es un bug real y molesto, y es de
una magnitud distinta a la que propone el titular "queda congelada".

### T11 (nuevo, propuesta mia, NO se implementa): los DOS botones "Vista" significan cosas distintas

No es un problema de si el boton persiste. Es que hay **dos controles con la misma forma visual
(`.btn.btn--ghost`), el mismo prefijo de texto ("Vista") y semanticas OPUESTAS**:

| | boton | rotulo cuando estas en cards | persiste al F5 |
|---|---|---|---|
| Tienda WV | `wvShopToggleView` | `Vista: Tarjetas` = **el estado actual** | si (por la legacy) |
| Panel Cuentas | `accountsToggleView` | `Vista tabla` = **la accion** | **no: no persiste nada** |

Medido en `accounts-panel.js`: `state.view` (`:110`) no tiene **ningun** `Storage.set` ni
`setItem` en todo el archivo. Clic en `:573` -> `state.view` -> `renderList()`. **Se pierde en cada
cambio de modulo**, no solo al F5: es un estado de render, no una preferencia.

Un usuario que aprendio "Vista X = la vista a la que voy" en Cuentas, lee "Vista: Tarjetas" en la
Tienda y **no entiende si eso es donde esta o a donde va**. Para los 27 perfiles de Pablo, que es
donde mas se usa el panel de cuentas, el de la Tienda es el unico que ademas sobrevive al F5.

**T11 no es copy, es consistencia.** Y no se arregla tocando dos strings: el boton tiene que
**nombrar la accion** en los dos, y decidir en cual de los dos la preferencia es real.

### T2: SI, pero no entra con T1

**SI sigue en pie** - pero la formulacion cambio. T2 era "el copy promete una persistencia que se
pierde". Medido: **el copy no promete nada**, dice el estado. El problema real es que el estado
que dice **es el equivocado** (esta congelado al valor de la `gn:`, que es lo que el bug T1 rompe).
O sea **T2 y T1 son el mismo bug visto desde dos angulos**, y T1 lo arregla. **T2 sin T1 es
cambiar el texto de un boton que miente.**

Y entra **aparte** por la razon opuesta: si T2 fuera "copy honesto" seria una linea, pero el
problema que sobrevive a T1 es el de la **semantica opuesta entre los dos botones**, que es T11 y
no depende de que la `gn:` se actualice.

**Mi posicion de PO: T1 primero (esta con el Reviewer), T2 se cae como tarea independiente porque
T1 la resuelve, y T11 entra como la propuesta de copy real.**

### Orden de la ronda, con T10 fuera

| # | item | por que en este lugar |
|---|---|---|
| 1 | **T8** - carrera de `loadAllForToken` | el unico con datos de OTRA cuenta a la vista. 4 lineas |
| 2 | **T1 + T1-bis** | con el Reviewer; T1-bis es 1 decision y la mas simple de las 3 |
| 3 | **T11** (nuevo) | consistente con T1: es el mismo boton, otro lado |
| 4 | T2-mini | contador de cuentas con permisos incompletos (20 min) |
| 5 | T2 chips | 7 chips por fila; usa `tokenHasWVPermissions` (0 callers) |
| 6 | T4 | el import dice cuantas llegaron sin los 7 |
| 7 | 49G | la unica que cierra la cuota de storage |
| 8 | 47/57 | la causa del fondo: la capa degrada a `[]` |
| 9 | 49D | barrido de huerfanas |
| 10 | 49F/49E | `cacheClear` que borre de verdad |
| 11 | 42 | 12 endpoints de cuenta |
| 12 | 45 | fundida con T2 |

**Fuera:** Idea 44 - **decimoctavo** heartbeat en 0%.
**Cerrada esta ronda:** **T10** (`f487573`, en `origin/main`, verificado con `merge-base --is-ancestor`).

### Reglas que salen

1. **Un fix en un codigo muerto se paga dos veces.** `router.js:523` escribe por `Storage` y esta
   inalcanzable; `wv-shop-ui.js:222` escribe a pelo y esta vivo. Arreglar los dos y borrar despues
   es correcto y caro. **Borrar primero deja una escritura, y una escritura se arregla una vez.**
2. **"Congelado" y "se pierde al recargar" son bugs distintos con el mismo sintoma**, y el arnes
   solo mide el primero. El dato que los separa es si el **estado en memoria** se actualiza: si se
   actualiza, hay un solo punto de lectura (el arranque) y el fix es de ahi, no del click.
3. **Un control que nombra el estado y otro que nombra la accion no son el mismo control.**
   Medir "este boton persiste" sin medir "este otro tambien" produce un fix local que crea la
   inconsistencia.
## ACTUALIZACION 2026-10-01 07:00 UTC — Heartbeat PO ronda 25 — 🔴 T7: `{ttl: 0}` no existe, y el fix del HB80 no hizo lo que su test dice

> **Espejo de la ronda 25 del PO.** Detalle largo en `PRE_BACKLOG.md` (privado). Esta ronda
> **no abre idea ni tramo de feature** (23 de 23 rondas de research sin novedad): su producto es
> **la lista de casos de una clase de defecto que pidió el Principal**, con número por caso.

### (a) PRE_BACKLOG: **sin novedades.** La última escritura era la ronda 24.

### (b) La clase "el mensaje se arma bien y no se ve / se va antes de tiempo": **hay más casos, y el peor es que el fix del HB80 no logra lo que afirma**

#### 🔴 T7 — `{ttl: 0}` es inalcanzable (`app.js:215`)

```js
app.js:215   const ttl = Number(opts.ttl || 3500);
app.js:216   const timer = ttl>0 ? setTimeout(close, ttl) : null;
```

**Componiendo las dos líneas con node** (no leyéndolas): `{ttl: 0}` → **ttl 3500, timer armado**.

| call site | pide | vive | nota |
|---|---|---|---|
| `app.js:634` | `{ttl: 0}` | **3500 ms** | el comentario en `:633` dice *"Propuesta 9: toast persistente (ttl:0)"* |
| `app.js:1180` | `{ttl: 0}` | **3500 ms** | el mensaje de la puerta de permisos (364 chars) |

**El fix del HB80 (`585367d`) cambió la política de 2500 ms a 3500 ms.** No sacó el mensaje del reloj: lo corrió más lento. Y **los 11 asserts de `tests/hb80-toast-permanencia.test.js` pasan igual**, porque:

- el **assert 2** evalúa la expresión de `ttl` **del call site** (`{ttl: 0}` → `0`) y asegura `ttl === 0` — no mira qué pasa adentro de `toast()`;
- el **assert 4** exige que exista `/opts\.ttl\s*\|\|\s*(\d+)/`, con el comentario *"el ttl por defecto sigue siendo un número finito: el 0 no debe colarse"*. **El `||` que rompe el cero es parte del contrato que el test defiende.**

Ningún test de la suite puede encontrarlo: la verdad está **entre** las dos líneas, y cada assert mira una de las dos.

**🟢 Tramo T7 (1 línea):** `opts.ttl === undefined ? 3500 : Number(opts.ttl)`. Habilita los 2 sites y no cambia los **65** call sites que pasan `ttl:` numérico. **El assert 4 hay que cambiarlo**, porque hoy exige la forma que causa el bug.

**Latente, mismo defecto:** `toast.legacy` (`app.js:221`, `ms||2500`), 4 callers en `meta.js`, ninguno pasa 0 hoy → no es un caso, es la misma bomba para el día que alguien quiera un toast persistente de Meta.

#### 🟢 Los toasts que nacen dentro de un `.modal` son **5, no 3**

Hay **4 superficies `.modal`**, todas en `z-index:10000` (`main.css:483`): `#keysModal` (`index.html:822`), `#gistSyncModal` (`:863`), `#guideModal` (`:1393`) y **`#themeModal`, que se crea por JS** (`theme-selector.js:88`, abierto en `:200`).

| # | call site | mensaje | ttl | |
|---|---|---|---|---|
| 1 | `app.js:854` | Key guardada | 1400 | ya visto |
| 2 | `app.js:1038` | API Key copiada | 1500 | ya visto |
| 3 | `app.js:1180` | mensaje de la puerta | 0→3500 | ya visto |
| 4 | **`app.js:1119`** | **"Formato de API key inválido"** | **2500** | **faltaba** |
| 5 | **`gist-sync.js:454`** | **"Configuración sincronizada correctamente"** | **2000** | **faltaba** |

`#guideModal` y `#themeModal` no disparan toasts. Los 6 de `settings-manager.js` no son caso: viven en el panel de Ajustes, que no es `.modal`, y varios pasan antes por un `confirm()` nativo.

**El fix de z-index cierra la familia entera, no caso por caso:** `hb81-wt` @ `b1fe9e7` (rama `hb81-ciclo`) sube `.toasts` a `10001` en las dos declaraciones de `main.css` (`:457` y `:668`) y **saca** el `z-index:60` de `theme-polish.css:133`, que ganaba por orden de carga. Medí los 22 `z-index` del repo: **10000 es el máximo aparte del propio host**, así que no queda superficie que lo tape.

⚠️ **`b1fe9e7` NO está en `origin/main`** (que está en `d970995`). Mientras no mergee, los 5 toasts están invisibles. No propongo promover a `origin`.

#### Superficies de estado que se limpien solas: **1 caso, y ningún timer largo**

Censo de `setTimeout` con delay **≥ 1000 ms** en `js/`: **1** (`wv-purchase-detail.js:2201`, un poller). **Ninguna superficie de estado se limpia sola con reloj largo.** Las que sí: `app.js:180` y `converter-modal.js:120` (micro-anim `markUpdated`, 220 ms, intencionales) y **`activities.js:713`, que saca el `.btn--success` a los 200 ms** — el feedback de "copiado" dura 200 ms, y el mismo archivo ya tiene el toast de 900 ms que dice lo mismo. **🟢** No lo aplico (es funcional).

#### El inverso, ya logged: un emisor de toast sin ninguna listener

`legendary-tracker.js:117` define un **segundo** `toast(msg, type)` que no dibuja nada: despacha `gn:toast` (`:124`) y **`git grep gn:toast` devuelve 1 sola línea, la del dispatch** — no hay listener. Y el `toast` local tiene **0 callers**. No es un caso vivo (es el módulo que ALERT-84 ya marcó como stub); lo anoto para que cablear la Armería después no se lea como "el toast no funciona". **P3, no entra al backlog.**

### ✍️ Corrección propia (12 de método)

Escribí que "`.toasts` es un grid **sin `max-width`**, así que el toast se estira hasta donde le permita el viewport". **Falso como conclusión:** el contenedor no tiene `max-width` pero **el item** `.toast` sí — `main.css:460`, `max-width:360px`. El Principal lo midió en navegador: 360 × 235 px. Mi regla era cierta y **no conté la regla del item.** La conclusión de la ronda 24 (2,5 s no alcanza) era correcta; la razón era inventada, y el bug real resultó ser T7.

### Estado y prioridades

`agents/main` @ **`d970995`**. El fix de z-index está en `hb81-wt` @ `b1fe9e7` (rama `hb81-ciclo`, sin mergear). Clon compartido en `fix-hb77-puerta-llega` con 2 untracked de otra instancia: **no lo toco** (ALERT-43/59). Mido contra `git show origin/main:` y `git grep origin/main`.

**Secuencia:** **T7 (1 línea + 1 assert, esta ronda)** → T2-mini → T2 chips → T4 → 49G → 47/57 → 49D → 49F/49E → 42 → 45.
**Anotado sin backlog:** los 2 toasts extra en `.modal` (cerrados por `b1fe9e7`), `activities.js:713` (200 ms), `toast.legacy` (latente), `gn:toast` (P3). **Fuera:** Idea 44 (decimoséptimo heartbeat en 0%).

**Reglas que salen:**
1. *Un test que mira el literal del call site y la guarda por separado no mira la composición.* Los 11 asserts pasan y el defecto sigue vivo. **La verdad de un default está en el medio, entre la línea que lo declara y la que lo usa.**
2. *Un `||` sobre un valor cuyo cero es legítimo no es un default: es un techo.* `opts.ttl || 3500` no dice "si no me diste ttl, 3500", dice "si me diste 0, también 3500".
3. *Un fix de apilado en el host cierra la familia; uno por mensaje deja 4 casos para la semana.* El criterio de cierre es **"la superficie que lo tapa quedó arriba"**, no "el mensaje se arregló".

---

## ACTUALIZACION 2026-10-01 06:00 UTC — Heartbeat PO ronda 24 — 🔴 el mensaje de la puerta ya no es incorrecto: ahora es largo de mas

> **Espejo de la ronda 24 del PO.** La propuesta no se edita: donde discrepa del disco, el disco gana (ALERT-75).
> **Medido contra `origin/main` @ `87bab23`.**

### La cronologia importa: el bug era el inverso al reportado, y ya lo arreglaron

**Lo que encontre al arrancar (`1fb0e32`):** `app.js:1065` reescribia el mensaje de la puerta con un literal fijo
(`'Faltan permisos: account + wallet'`, los **2 permisos de antes de T1**) mientras la puerta ya exigia 7
(`app.js:829-832` armaba los 364 chars correctos y `parseKeyError` los pisaba).
**364 chars lanzados -> 33 mostrados**, y los 33 decian 2. El detalle se construia bien y **no se mostraba nunca**.
No era ilegible: era **falso** — decia que faltaban los 2 permisos que Pablo ya tenia.

**Veinte minutos despues (`87bab23`), dos commits nuevos de otra instancia:**

| commit | que hace |
|---|---|
| `fdf29ac` | `parseKeyError` conserva `msg: m` en vez de reemplazarlo. **Mi hallazgo, ya implementado.** Ademas corrige el copy `glifos` de la ronda 22 (`app.js:683`). |
| `87bab23` | saca el codigo muerto de `app.js:1067`. |

`app.js:1063-1071` ahora: `if (/permisos/i.test(m)) return { msg: m, kind: 'perms' };` — el clasificador sigue
intacto para 401/403/429/red, le sacaron el pisoton, no lo desarmaron.

**No reclamo autoria.** La otra instancia tenia el mismo hallazgo. Lo que queda escrito es que el problema que
el Reviewer pregunto **sigue vivo y cambio de forma**.

### 🔴 T6 — el bug REAL que queda: los 364 chars salen por 3 destinos, y uno es un toast de 2500 ms

`app.js:1172/1174/1175`, verificado en `87bab23`:
`msg` son **364 chars** y van a los tres. `_fieldMsg.textContent` y `setStatus` son persistentes;
`window.toast?.('error', msg, { ttl: 2500 })` **borra a los 2,5 s**. Antes los tres textos eran identicos (33 chars);
ahora son el mismo texto largo con **tres politicas de permanencia distintas**.

`.toasts` (`theme-polish.css:133`) es `position:fixed; right:14px; bottom:16px` en `display:grid` **sin `max-width`**.
El toast se estira hasta donde le permita el viewport: 364 chars a 2,5 s es un bloque que **se lee o no se lee**.

**🟢 Tramo T6 (1 linea):** `ttl: 0` en `app.js:1175`. Precedente en el mismo archivo, `app.js:634` ya usa
`toast('info','Cargando wallet…',{ttl:0})` justamente porque es un mensaje que no queres que desaparezca.
Los otros 2 destinos ya son persistentes: **el que sobra es el efimero, no el largo.**

**Sobre `tests/hb77-puerta-llega`:** verifica que el mensaje **LLEGA**, no que se **PUEDA LEER**. No es un agujero
del test — "llega" y "se lee" son dos requisitos. Con el fix, los 364 chars llegan (correcto) y sigue sin haber
nada que mida si un humano los lee en 2,5 s.

### 🟡 accounts-panel.js — el nombre de la cuenta es un toggle de vista disfrazado de expandable

`js/accounts-panel.js:452-453`, sin cambios en `87bab23`: clic en el nombre de **cualquier** cuenta (`:370`, con
`cursor:pointer`) hace `state.view = state.view === 'cards' ? 'table' : 'cards'`. El atributo se llama
`data-toggle-expand-name` y `id` no se usa. El boton honesto esta 118 lineas abajo (`:571`, `accountsToggleView`).

Pablo hace clic para ver el detalle de **una** cuenta y pierde la vista entera. Y como el boton de abajo tiene el
mismo efecto, **la friccion no se puede deducir de la pantalla**: dos controles con la misma accion, uno accidental.

**🟢 (2 opciones, elijo la segunda):** (a) borrar el handler; **(b) hacer lo que el atributo promete** →
expandir/colapsar inline, que es el patron de `state.expandedAccounts` que el mismo archivo ya usa en `:449`.
Es funcional: **no lo aplica el PO.**

### Respuesta a la pregunta 2 del Principal

- **RaidTracker:** sano. `f9239d7` mergeado, la `gn:` de la pestana ya tiene escritor. Fila 079 cerrada.
- **Accounts:** el toggle de arriba.
- **InventoryHub: nada, y no lo audite a fondo.** No se vende como revisado.

### Verificado y sin accion

`kind: 'perms'` no llega a ningun lado: `.toast--perms` no existe en CSS (`main.css:462-464/680-682` solo tiene
ok/warn/error/success) y `normalizeType` (`:198`) colapsa a `'info'`. **Inocuo hoy.** Anotado para que cablearlo
despues no se lea como fix incompleto.

### Estado y prioridades

`agents/main` @ **`87bab23`**. El clon compartido sigue en `fix-hb77-puerta-llega` con 2 untracked de otra
instancia: **no lo toco** (ALERT-43/59). Todo medido con `git show origin/main:`, nunca contra el working tree.

**Prioridades:** **T6 (1 linea, esta ronda)** -> T2-mini (contador de cuentas con permisos incompletos) -> T2 chips
-> T4 -> 49G -> 47/57 -> 49D -> 49F/49E -> 42 -> 45.
**Cerradas por otra instancia en esta ronda:** `fdf29ac`, `87bab23`. **Fuera:** Idea 44 (decimosesimo heartbeat en 0%).

**Reglas que salen:**
1. *Un parser que matchea por palabra y devuelve una constante no traduce el error: lo reemplaza, y el reemplazo
   envejece.* Con 2 permisos el literal era correcto; con 7 quedo archivado. **Un literal que nombra una lista debe
   vivir junto a la lista** — `REQUIRED_PERMISSIONS` (`:679`) esta a 385 lineas del literal que la describe.
2. *Medir un hallazgo, y volverlo a medir despues de arreglarlo: el valor no sobrevive el fix.* El Reviewer midio
   356 chars sobre un mensaje que **nunca llegaba** — el numero era correcto y la superficie, inventada. Al
   arreglar el arriving, la lectura paso a ser el bug, y nadie lo habia medido porque la medicion era valida solo
   para el codigo viejo.

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

El PO auditó los 55 wrappers leyendo el código y el hallazgo **se sostiene**. Recorrí los 8 uno por uno y los 6 call sites. Confirmado: los 8 loguean y devuelven `[]`/`0`; los 46 restantes propagan; `getCommerceDelivery` (L478-483) es el único con el contrato escrito. **La premisa de la Idea 47 es válida y la Idea 45 t2 efectivamente está a medio dead** — `loadAccountSummary` (wallet-dashboard.js:384-399) tiene el catch correcto e inalcanzable para `characters` y `raids`.

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

## Ideas pospuestas

| # | Idea | Razón |
|---|------|-------|
| — | Tracker de componentes de legendarias (Phase 3) | 🔴 Bloqueada — API GW2 no expone recetas con ingredients |
| — | Inventory item purpose journal | 🔴 Difícil — requiere integración wiki extensiva |
| — | API pública HTTP | ❌ Descartada — alto riesgo legal |
| — | Homestead daily node tracker | Descartada — existe "Collect All" in-game |
| — | Homestead layouts tracker | Descartada — no hay API para layouts específicos |

---

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

