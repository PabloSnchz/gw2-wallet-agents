# TEAM STATUS - Heartbeat #51 (2026-09-30 09:05 UTC)

> Actualizado por el Principal. Clon de trabajo: `C:\Mis Archivos\GW2 online\gw2-dev`.
> `agents/main` @ `af899c9`. El remoto de desarrollo se llama **`origin`** en este clon.

## Estado del equipo

| Agente | Estado | Evidencia del ciclo |
|---|---|---|
| Principal (default) | **OPERATIVO** | Ciclo completo: PASO 1 (veredicto del Reviewer recogido y aplicado), documentacion de la Idea 52 corregida, Idea 55 Tramo 3a implementado con test y fase roja verificada, suite **389/0**, logs y push. |
| Code-Reviewer | **OPERATIVO** | **RESPONDIO** `task-bcff44b0f698` (Idea 52, "aprobado con cambios"). Informe de 8 secciones, verificado de forma independiente: los 4 renombres son correctos contra la API en vivo, y el hallazgo de `ura` estaba a medias falso. Aplicados los 3 cambios de codigo y el de documentacion. |
| product-owner | **OPERATIVO** | Sus 2 tasks en vuelo dieron **404 = TTL vencido**, no timeout. Su contenido llego igual por el canal de archivos (heartbeat 08:15, commit `54f97fe`): Idea 55 + ALERT-41 decidible. **No se reenviaron**: reenviar a ciegas habria duplicado su trabajo. Sigue con 3 asks `waiting` en su inbox. |
| Documentador | Sin evidencia | Sin tarea en vuelo ni comprobacion este ciclo. `HEARTBEAT.md` sigue registrando timeout. **Pendiente: verificar `active_model`.** El ciclo toco codigo, asi que le corresponde una entrega. |
| Arquitecto | Activo | Intervino en el canal de archivos: detecto que el cuerpo de la comm 029 llego como la palabra `prueba.txt`. |

## Ramas huerfanas en el remoto (ALERT-55)

| Rama | Estado real | Accion del HB#50 |
|---|---|---|
| `fix/theme-borderleft-shorthand` | **Absorbida** (`git cherry` = `-`) | Pendiente de borrar |
| `feat/commerce-delivery-ui` | **Absorbida** (banner v1.1.1 en `converter-modal.js:14` de main) | Pendiente de borrar |
| `docs-estructura-20260930` | 1 commit, `ORG_MAP.md` con diff de base vieja | Revision manual |
| `feature/homestead-tracker` | **Trabajo perdido**: 3 funciones de API, ruta y script tag | `cherry-pick` desde `main` |
| `fix/homestead-glyph-data` | Contiene la anterior + el fix de schema de glyphs | `cherry-pick` desde `main` |
| `feature/legendary-component-tracker` | **Trabajo perdido**: `detail-modal.js` y `legendary-tracker-theme.js` no existen en main | `cherry-pick` desde `main` |

## Trabajo completado este ciclo

### Idea 55 Tramo 3a - `/v2/account` pasa por la capa GW2Api (3 sitios)

**Origen:** la Idea 55 del PO (heartbeat 08:15) decia "9 sitios con el token se
evadian de la capa `GW2Api`". Los Tramos 1 y 2 migraron 2 de ellos. Este toma
los **3 que bajan `/v2/account` con `fetch` crudo**.

**El hallazgo que reencuadra la propuesta del PO: el wrapper YA EXISTIA.**
`getAccountInfo` esta en `api-gw2.js:393` y exportada en `:1156`. No hacia falta
escribir nada en la capa: el trabajo era **borrar la evasion**, no agregar una
API. La prueba de que ya se usaba: 5 call sites la consumian
(`wallet-dashboard.js:445`, `wv-purchase-detail.js:1025` y `:1118`,
`inventory-dashboard.js:333`), y ahora son 8.

**Lo que hacia la app, medido sobre el codigo:**

| | Antes | Despues |
|---|---|---|
| `/v2/account` sin cache | 3 sitios | 0 |
| `/v2/account` con cache | 5 sitios | 8 (todos por la capa) |
| Dedupe de concurrencia | ninguno en los 3 | si, viene gratis con el pool |
| Pasa por el estrangulador global | no | si |

O sea: el **mismo payload, del mismo endpoint, en la misma sesion**, se bajaba
8 veces, 3 de ellas sin TTL, sin retry, sin pool y sin dedupe de inflight.

**Los 3 sitios y su contrato de error, que es lo delicateo de esta migracion:**

- `characters.js` `loadAccountData()` leia `wvw_rank`. Antes era
  `if (accountRes.ok)`, o sea un **skip**: si fallaba se seguia al resto. El
  wrapper **rechaza**, asi que la llamada quedo en su propio `try/catch` y el
  guard de exito paso a `if (accountInfo)`. Sin ese catch el rechazo se come
  el `try` externo y PvP/WvW quedan sin leer, que es el header entero en `-`.
- `achievements.js` `fetchAccountAP()` leia `daily_ap` y `monthly_ap`. Antes
  tiraba `if (!r.ok) throw`, dentro de un `Promise.all` en `loadAll()`. Propagaba
  y el wrapper tambien propaga: contrato identico, sin catch. Se conserva
  `nocache:true`, que es el equivalente del `cache:'no-store'` viejo: el AP se
  relee siempre y no se mete un TTL de 30 s donde antes no habia ninguno.
- `accounts-panel.js` `enrichWithGW2API()` lee 7 campos. El `try/catch` por
  cuenta ya existia y es lo que mantiene el "una cuenta rota no corta el
  enriquecimiento de las otras". No se toco. El test verifica que los 7 campos
  se siguen leyendo igual: si el wrapper devolviera otra forma, el `.json` que
  Pablo descargaaria tendria `undefined` y no se veria hasta abrir el archivo.

**Lo que NO se toco, a proposito:**

- `/v2/account/home/nodes` sigue crudo en `accounts-panel.js`: **no tiene
  wrapper** en la capa, y migrarlo seria inventar un endpoint nuevo.
- `/v2/pvp/stats` y `/v2/characters` de `characters.js` siguen crudos: son el
  **Tramo 3b**. Meterlos sin test propio seria repetir el patron de la Idea 47.

**Verificacion (no supuesta):**

- `tests/idea55.account-layer.test.js`, **44 aserciones**.
- **Fase roja verificada: 18 FAIL contra los 3 archivos SIN modificar**
  (`git stash push` de los 3, run, `git stash pop`), 0 FAIL despues.
- Suite completa: **389 aserciones, 0 FAIL** en los 14 tests.
- `node --check` limpio en los 3. Busters en el MISMO commit (ALERT-24 /
  REGLA 2): `characters.js` 2.4.0 a 2.4.1, `achievements.js` 3.2.0 a 3.2.1,
  `accounts-panel.js` 2.0.0 a 2.0.1.
- Riesgo de datos del usuario: **cero**. Sin CSS, sin `localStorage` nuevo, sin
  endpoints nuevos, sin cambio de la forma de los datos.

**El test fallo 3 veces antes de dar bien, y 2 de esas no eran del codigo.**
La primera corrida dio 3 FAIL:

1. Dos aserciones en FAIL por **matchear mis propios comentarios**: yo
   escribi "`cache:'no-store'`" y "`if (accountRes.ok)`" en el codigo y en la
   documentacion del fix, y el test las buscaba como si fueran codigo. El fix
   fue filtrar las lineas de comentario antes del match. **Regla: un test
   textual que verifica la ausencia de algo no puede correr sobre un archivo
   donde uno escribio ese mismo string al documentar el fix.**
2. La tercera era el sandbox: extrae la funcion real de `api-gw2.js` y la
   corre, pero le faltaban `TTL` y `CFG` en el contexto, asi que tiraba
   `ReferenceError` y la asercion de dedupe no llegaba a correr.
3. Al arreglar eso aparecio un 4to FAIL que si era informativo: mi stub de
   `inflightOnce` era `return fn()`, o sea **no deduplicaba**. La asercion de
   "2 llamadas concurrentes salen como 1 request" fallaba por el harness. La
   dedupe de concurrencia la hace `inflightOnce`, no el cache: las dos llamadas
   llegan antes de que la primera resuelva y el cache todavia esta vacio.

**Corolario:** las primeras 3 fallas eran del test, no del codigo, y las 3 se
habrian "arreglado" incorrectamente relajar la asercion. Un FAIL hay que
diagnosticarlo antes de tocarlo: si el codigo esta bien, el test esta mal, y
relajar la asercion es como se pierde la cobertura.

### Correccion documental de la Idea 52 (veredicto del Code-Reviewer)

Aplicado el **Cambio 2** del veredicto de `task-bcff44b0f698` ("aprobado con
cambios"), que era el unico de los 4 que quedaba pendiente. Los otros 3 ya
estaban aplicados en `07f4052` / merge `88a7721`.

El hallazgo de `ura` **estaba a medias falso** y asi estaba escrito en
`TEAM_STATUS.md` y `BACKLOG.md`. Lo verifique de forma independiente antes de
corregir el texto, y es cierto lo que dijo el Reviewer:

- `REWARDS_DATA` **no tiene ningun lector en todo el repo**: solo su declaracion
  (`api` linea 151) y el test. Verificado con grep sobre `js/*.js` y `tests/*.js`.
  Son ~150 lineas muertas. Renombrar la clave ahi no podia "arreglar" recompensas
  ocultas porque no hay nada que leer.
- `BOSS_DETAILS` ya tenia la clave `"ura"` correcta y el lookup es
  `BOSS_DETAILS[enc.id]`: la ficha de Ura **ya se mostraba**.

Ademas se corrigio el metodo de emparejamiento: el commit, la cabecera y los
logs decia "por ala", y el Reviewer tiene razon en que eso da 50% de probabilidad
de error en el ala 5, la unica genuinamente ambigua (2 huecos, 2 candidatos). Lo
que cierra el razonamiento es **ala + posicion + nombre**: en las alas 3 y 7 es
eliminacion de conjunto (los otros 3 ya coincidian byte a byte), y en el ala 5 la
posicion en la API resuelve los 2 candidatos.


### Idea 52 — 5 de los 30 encuentros de raid-tracker no se podian marcar nunca

**Origen:** propuesta del PO en su heartbeat de 06:30. **Verificada de forma independiente antes de tocar codigo**, y el hallazgo del PO se reproducio exacto: 30 encounters en el codigo contra 30 eventos reales, 25 coinciden, 5 no existen, 5 eventos reales no cableados.

**El mecanismo, y por que no hace falta un token para probarlo:**

```js
state.completedEncounters = GW2Api.getAccountRaids(token)  // array plano de STRINGS
var completedSet = new Set(completedEncounters);           // :1392
var isCompleted = completedSet.has(enc.id);                // :1438
```

`/v2/account/raids` devuelve el id del encuentro como string. Si `enc.id` no coincide **byte a byte**, la comparacion falla para siempre: la tarjeta no se marca jamas, el ala queda trabada en N-1/N, el KPI no lo dice y **no hay error ni warning**. Un tracker que miente en silencio.

**Cambios (14 renombres de clave + 1 bloque muerto borrado):**

| Antes | Ahora | Ala (medida contra el catalogo) |
|---|---|---|
| `siege_the_stronghold` | `escort` | Stronghold of the Faithful |
| `desmina` | `soulless_horror` | Hall of Chains |
| `dhuum` | `voice_in_the_void` | Hall of Chains |
| `gates_of_ahdashim` | `gate` | The Key of Ahdashim |

Los renombres se emparejaron **por ala + posicion + nombre, no por nombre**, porque los nombres no se parecen: `Siege the Stronghold` vs `escort`, `Dhuum` vs `voice_in_the_void`. ElReviewer (HB#51) pidio esta correccion: "por ala" solo da 50% de probabilidad de error en el ala 5, que es la unica genuinamente ambigua (2 huecos, 2 candidatos) y la resuelve la **posicion** en la API.

**CORRECCION (HB#51, `task-bcff44b0f698`): el hallazgo de `ura` estaba a medias falso.** Este parrafo describia como hecho que "las recompensas de Ura y su ficha nunca se mostraban". Medido sobre el pre-fix real:

- `BOSS_DETAILS` **nunca estuvo roto**: ya tenia la clave `"ura"` con el texto correcto, y el lookup es `BOSS_DETAILS[enc.id]` → `"ura"`. La ficha de Ura ya se mostraba.
- `REWARDS_DATA` **no tiene ningun lector en todo el repo** (es `var` local dentro de la IIFE, no se exporta). Son ~150 lineas muertas. Las recompensas que ve el usuario salen de `WINGS` + `getSpecialDrops()`. Renombrar la clave ahi no podia arreglar nada.
- Lo que el renombre **si** produjo: una clave `"ura"` **duplicada** en las dos tablas. En JS gana la ultima, asi que el efecto visual fue cero, pero quedaron 8 lineas muertas y una mina silenciosa. **Resuelto en `07f4052` / merge `88a7721` (v1.10.1)** borrando el bloque huerfano — nunca el de "Ura, la Aulladora de Vapores", que es el que ganaba.
- Defecto real que si quedaba: la ficha apuntaba a `ura_detail.png`, que **no existe** (caia al fallback). Corregido a `ura_guardian.png`, que si.

Tambien se borro `the_threshold` (19 lineas muertas de un encuentro que no esta en ningun lado). El Reviewer aprobo ese borrado, pero senalo la incoherencia interna que lo produjo: el mismo razonamiento de "huerfano" que justificaba borrar `the_threshold` decia **borrar** `ura_guardian`, no renombrarlo.

**Lo que NO se toco, a proposito:** `vloxx` (el ala del CM de Sept 29) queda como fantasma conocido. `/v2/raids` no expone el ala Nexus of Eternity, y decidir que hacer con ella es **producto, no fix de dato**. El test falla si la lista de fantasmas crece, asi que la excepcion no se puede extender sola.

**Verificacion (no supuesta):**
- `tests/idea52.raid-encounter-ids.test.js`, 27 aserciones, con el catalogo real embebido en `tests/fixtures/`.
- **20 pass / 7 FAIL contra el archivo SIN modificar** → **27 pass / 0 FAIL** despues.
- Suite completa del repo: **258 aserciones, 0 FAIL** en los 11 tests.
- Riesgo de datos del usuario: **cero**. El modulo no persiste los marcados en `localStorage` (solo guarda `raid_strike_view` y la key); el estado siempre viene de la API. Sin CSS, sin logica, sin endpoints, total de encounters sin cambio (30), y `name`/`nameEn`/`type`/`li`/`icon` intactos.

### Rescate de trabajo del PO que se estaba perdiendo

`PRE_BACKLOG.md` y tres scripts del PO (`tools/idea52-audit.py`, `tools/idea52-icons.py`, `tools/mem-hb48.py`) estaban **untracked en el working dir y en ninguna rama**. Ya paso con `_hb54_achacc.js` en el HB#48. Commiteados en `ab39823`.

## Tareas en curso

| Task | Agente | Que | Estado |
|---|---|---|---|
| `task-bcff44b0f698` | Code-Reviewer | Revision del diff de la Idea 52 | **RESUELTO** (HB#51). APROBAR CON CAMBIOS, veredicto aplicado COMPLETO: cambios 1, 3 y 4 en `07f4052` / merge `88a7721` (HB#50), y el cambio 2 (documentacion) en este ciclo. El Reviewer tambien detecto que el hallazgo de `ura` estaba a medias falso, verificado de forma independiente antes de corregir el texto. Detalle largo en COMMS_LOG.md fila 032. |
| `task-4a1f7c2be910` | product-owner | Acuse del HB#48 del PO | **404 (TTL vencido).** No reenviada: el contenido llego por el canal de archivos y ya estaba aplicado. |
| `task-6176f26e77bf` | product-owner | 3 puntos del HB#48 (novedades, ALERT-41, alcance) | **404 (TTL vencido)**, ya cerrada por merito en el HB#49. |
| `20260930T073734Z-74adc1` | product-owner | Acuse de la Idea 52 + 5 preguntas/datos | **Esperando.** Su confirmacion de que `?ids=<evento>` da 404 ya quedo como ALERT-52. |
| `20260930T083000Z-hb50` | product-owner | Acuse del HB#50: 2 hallazgos nuevos + ALERT-54 | **Esperando.** |

## Propuestas

| # | Idea | Origen | Estado |
|---|---|---|---|
| 52 | 4 renombres de id en raid-tracker | PO 06:30 | **IMPLEMENTADA** en `ab39823`, **corregida** en `88a7721` (v1.10.1) |
| 53 | Strike Tracker: re-apuntarlo a logros | PO 06:30 | Abierta, **decision de producto**. El PO mismo ofrece borrar el modulo si el mapeo no verifica |
| 50 | La cuota de localStorage no se libera nunca (49D/E/F) | PO 06:00 | Abierta. **49D (barrido de huerfanas, ~30 lineas) es la que mas rinde** |
| 49G | `ach_acc` en forma compacta | PO 08:00 | Abierta, verde-media. Unica pieza que cierra la cuota de verdad |
| 54 | `vloxx` infla `liTotal`: el 100% de LI es inalcanzable | **nueva, del HB#50** | **ALERTA abierta, no es propuesta.** Decision de producto (PO): borrar el ala 9, o excluir los fantasmas del calculo de LI |

## Alertas

- **ALERT-55 (nueva, ALTA, ABIERTA):** **6 ramas sin mergear en `origin`; 3 tienen trabajo real que NO esta en `main`.** `js/api-gw2.js` de main no expone las 3 funciones de Homestead, `router.js` no tiene la ruta, `index.html` no carga el modulo, y `js/detail-modal.js` + `js/legendary-tracker-theme.js` no existen como archivo. Se rescata por `cherry-pick` desde `main`, no por `merge`: las ramas estan 110-201 commits atras y `api-gw2.js` cambio 481 lineas desde su base.
- **ALERT-54 (nueva, ABIERTA):** `vloxx` tiene `li: 1` y `/v2/raids` no lo expone -> **`liTotal` cuenta un encuentro que jamas se va a reportar, y el 100% de Legendaria Imbuida es inalcanzable por diseno.** Es la misma clase de defecto que vino a matar la Idea 52, y quedo vivo dentro del fix que la ataco. No se toco: decidir el ala 9 es producto.
- **ALERT-51 (HB#49, RESUELTA y reabierta en parte):** el fix de la Idea 52 creo la clave `"ura"` DUPLICADA en `REWARDS_DATA` y `BOSS_DETAILS` (bug introducido, efecto visual cero). Resuelta en `88a7721` con test anti-duplicadas. `raid-tracker.js` — 5 de 30 encuentros con id inexistente, 1 clave de datos mal (`ura_guardian`), 1 bloque muerto (`the_threshold`). Ver detalle abajo.
- **ALERT-52 (nueva, ABIERTA):** `/v2/raids?ids=<id-de-evento>` devuelve **404**. Ver abajo — es una trampa para la Idea 53.
- **ALERT-53 (nueva, ABIERTA, baja):** huecos de datos menores en el mismo modulo.
- **ALERT-50 (de HB#48):** sigue mitigada por procedimiento. La regla se aplico: `git status -sb` + `git log --oneline -1` en la misma llamada antes de commitear, y el hash verificado en la rama esperada despues.
- **ALERT-49 (de HB#48):** resuelta en `f09eb7c`.

### ALERT-54 ƒ?" `vloxx` vuelve el 100% de Legendaria Imbuida inalcanzable

**Severidad: media. Estado: ABIERTA (HB#50). Sin cambio de codigo: es decision de producto.**

`liTotal` cuenta los encounters con `li === 1`. `vloxx` (el ala del CM de Sept 29, Nexus of Eternity) tiene
`li: 1` y **`/v2/raids` no lo expone** (medido contra el catalogo real, no supuesto). O sea que el
denominador del KPI suma un encuentro que la API jamas va a reportar: **el 100% de LI no es alcanzable**.

Es exactamente la clase de defecto que la Idea 52 vino a eliminar, y quedo vivo **dentro del propio fix
que la ataco**: el commit `2de8f35`cerro 5 tarjetas que no se podian marcar y dejo, en la misma capa y en
el mismo archivo, un KPI que promete algo que no puede cumplir. Lo anoto el Reviewer.

Lo que ya estaba bien: el test de la Idea 52 valida que `vloxx` no esta en el catalogo y lo declara
`FANTASMA_CONOCIDO` con la explicacion, y falla si la lista de fantasmas **crece**. Lo que faltaba era que
el KPI de LI lo sintiera.

Como se cierra: si Pablo decide borrar el ala 9, `liTotal` baja y el 100% vuelve a ser alcanzable. Si se
conserva, hay que sacar `li: 1` del encuentro o excluir los fantasmas del calculo. **No se decide solo.**

### ALERT-51 — 5 de 30 encuentros con un id que la API no tiene

**Severidad: media-alta. Estado: RESUELTA en el HB#49 (merge `ab39823`).**

17% de los encuentros de un modulo que Pablo usa todas las semanas **no se podian marcar nunca**, en
silencio. El ala 3 se trababa en 3/4, el ala 5 en 3/4, el ala 7 en 3/4. Nada en la UI lo indicaba.

**Por que no lo detecta ningun test que existia:** los tests cubrian el camino feliz del marcado; ninguno
verifico que el `enc.id` exista en el catalogo. La asercion que hacia falta es *"todo id que el modulo
puede marcar tiene que ser alcanzable por la API"*, y esa no existia.

**Corolario reutilizable:** un tracker no se valida probando que marca, sino probando que **lo que no marca es
porque la API no lo tiene**. La diferencia entre las dos es exactamente el espacio de los bugs silenciosos.

### ALERT-52 — los ids de evento NO son resolubles uno a uno

**Severidad: media. Estado: ABIERTA. Trampa para quien implemente la Idea 53.**

Medido hoy contra la API en vivo:

```
GET /v2/raids?ids=gorseval  ->  404  "all ids provided are invalid"
GET /v2/raids?ids=all       ->  6 raids, cada uno con wings[].events[]
```

Dos consecuencias:

1. Los ids de encuentro **no se pueden pedir individualmente** a `/v2/raids`. Solo existen dentro de
   `?ids=all`. Quien implemente la Idea 53 resolviendo un id de strike contra `/v2/raids?ids=<id>` se come
   un 404, igual que se lo comio mi primer probe.
2. La forma real es **`raid.wings[].events[]`**, no `raid.events[]`. La extraccion ingenua (`w.events`)
   devuelve los 6 ids de raiz y hace creer que solo hay 6 encuentros en el juego.

El POlewsl 06:30 llego a la conclusion correcta (los 15 ids de strike no existen ahi) pero por otra via; el
detalle de la resolucion individual no lo tenia. **Regla: el catalogo de la API se extrae de la respuesta
completa, y "no existe" se demuestra con el snapshot, no con una consulta suelta.**

### ALERT-53 — huecos de datos menores en raid-tracker (mismo modulo, misma capa)

**Severidad: baja. Estado: ABIERTA, no bloqueante. No se toco en este ciclo.**

Medido, sin actuar:

- `statues_of_grenth` esta declarado `type: "jefe"` pero no tiene drops en `REWARDS_DATA`. Es un jefe real
  (Grenth): hueco de datos, no bug de id. **No se relleno porque rellenarlo es inventar drops.**
- `bandit_trio` y `river_of_souls` estan clasificados `type: "evento"` cuando la API los reporta `Boss`.
  Cosmético: cambia el icono (👑 vs ⚡) y el color de la tarjeta. **No se toco** para no ampliar el diff.
- Los 5 eventos reales no cableados (`camp`, `escort`, `gate`, `soulless_horror`, `voice_in_the_void`).
  Agregarlos suma 5 encounters y **cambia el denominador del KPI (30 → 35)**. Eso cambia el grid: es
  decision de Pablo, no del equipo.

## Pendiente que requiere a Pablo

- **Decision de producto sobre `vloxx` / Nexus of Eternity:** el ala no esta en `/v2/raids`. ¿Se saca el ala
  9 del grid, o se deja como espera?
- **Decision de producto sobre los 5 encounters no cableados:** 30 → 35 cambia el KPI que Pablo ve.
- **Promocion a produccion:** `PROMOTIONS.md` mantiene el inventario. El equipo **no propone promover**.

## Verificacion del push de este ciclo

```
62a8b0f..ab39823  HEAD -> main
git ls-remote --heads origin  ->  main = ab39823
```

Sin branch duplicado con slash. Rama `fix-idea52-raid-encounter-ids` borrada local (nunca existio en remoto:
solo se pusheo el merge a `main`, que es lo que corresponde).
