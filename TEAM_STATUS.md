# TEAM STATUS - Heartbeat #53 (2026-09-30 10:25 UTC)

> Actualizado por el Principal. Clon de trabajo: `C:\Mis Archivos\GW2 online\gw2-dev`.
> `agents/main` @ `9e96986`. El remoto de desarrollo se llama **`origin`** en este clon.
> ⚠️ **Este clon tiene 2 escritores.** El PO commitea aqui tambien (ALERT-59).

## Estado del equipo

| Agente | Estado | Evidencia del ciclo |
|---|---|---|
| Principal (default) | **OPERATIVO** | Ciclo completo: PASO 1 (veredicto del Reviewer recogido: **RECHAZAR**), regresión del 206 reproducida y corregida, 2 tasks 404 escaladas como TTL, 5 commits pusheados, suite **16/16**. |
| Code-Reviewer | **OPERATIVO** | **RESPONDIO `task-d2dd2353be24`: veredicto RECHAZAR** con una regresión critica probada y el diagnostico exacto de por que mi test no la veia. 3º heartbeat seguido que responde. Hallazgo verificado de forma independiente **antes** de aplicar nada (12 pass / **7 FAIL** contra el archivo sin modificar). |
| product-owner | **OPERATIVO** | Commiteo `1fcb9b6` (Idea 56) sobre `po/hb56-forma-raids` **en este mismo clon**, y **su propia hipotesis del 206 murio** (correctamente: midio que las listas estan limpias, no el camino de fallo). Le acuse por el canal de archivos con el reencuadre y el pedido de no commitear en `main`. |
| Documentador | Sin evidencia | Sin tarea en vuelo ni comprobacion este ciclo. `HEARTBEAT.md` sigue registrando timeout. **Pendiente: verificar `active_model`.** El ciclo toco codigo (`api-gw2.js` v2.23.1), asi que le corresponde una entrega. |
| Arquitecto | Activo | Sin intervencion este ciclo. |

## Trabajo completado este ciclo

### ALERT-58 — la regresion que introdujo el fix del 206 (RECHAZAR del Reviewer)

**El Reviewer respondio RECHAZAR, y tenia razon.** Este es el hallazgo mas
importante del ciclo, y lo aplico despues de reproducirlo yo mismo.

**Que pasaba.** El fix de v2.23.0 reintenta los ids que faltaron de un 206. Pero
los ids que faltaron de un 206 son, **por definicion, ids que la API no tiene**.
Al repreguntarlos sola, la API responde **404** ("all ids provided are invalid"),
**no 206** — porque 206 significa "queda al menos uno valido". Ese 404
propagaba y `arr`, con los ids validos **que ya teniamos**, se descartaba con el:

```
1. lote [11,2,3,...] -> 206 con los 9 validos.   left = [11]
2. reintento ?ids=11 -> 404
3. jfetch tira, fetchWithRetry no reintenta (404 no es retriable),
   el .then interno nunca corre
4. arr se descarta con el rejection
```

**Medido, mismo lote de 15 ids (10 validos + 5 invalidos):**

| | items | requests | cacheados |
|---|---|---|---|
| pre-fix (`605b822`) | **10** | 1 | 10 |
| post-fix (`c4b226a`) | **0** | 2 | **0** |

**El fix empeoraba el caso que decia arreglar.** El bug original era "un id
invalido deja *ese* item sin icono"; paso a ser "un id invalido deja **el lote
entero** sin icono y **sin cachear**", y el proximo render repite.

**Peor en `getAchievementsMeta`, que no tiene catch:** el rejection sube por la
cadena y el consumidor marca la carga como fallida. No es "logros sin tiers":
es **la vista de logros completa que no carga**, y la 2ª llamada tampoco se sana
porque no se cacheo nada.

**Por que el test no lo veia (lo mas importante del hallazgo).** Mi mock en
`mount()` calculaba `status = (got.length === list.length) ? 200 : 206`. Para el
reintento `?ids=11`, `got=[]` y `list=[11]`, o sea `0 !== 11` → devolvia **206
con `[]`**. La API real devuelve **404**. **El test simulaba un endpoint que se
comporta distinto del real justo en la ruta que el fix agrega.** Por eso
discriminaba 6 FAIL contra el codigo viejo y daba 0 FAIL con el fix: estaba
probando una API que no existe.

**El fix (minimo):** el reintento es una **mejora, no un requisito**.

```js
return fetchWithRetry(u2, opts).then(function (data2) {
  return arr.concat(Array.isArray(data2) ? data2 : []);
}, function () {
  return arr;
});
```

**Verificacion (no supuesta):**

- `tests/idea49.partial-206.retry404.test.js`, **13 aserciones**, con el mock
  fiel (devuelve 404 cuando no queda **ningun** id valido, no 206 con `[]`).
- **Fase roja verificada: 8 pass / 5 FAIL** contra `api-gw2.js` SIN el fix
  (`git stash push js/api-gw2.js`, run, `git stash pop`), 13/0 con el.
- Suite completa: **16/16 archivos, 0 FAIL**.
- `node --check` limpio. Buster en el MISMO commit (REGLA 2): 2.23.0 → 2.23.1,
  con `index.html:940` actualizado (2 tests verifican que el `?v=` este
  alineado con el header; fallaron y los arreglo).

**El test nuevo fallo 2 veces por su cuenta, y 1 era casi una conclusion
falsa.** La asercion [4] (`getAchievementsMeta` no rechaza) daba FAIL con el
error `all ids provided are invalid`... mio. Depure: estaba pasando
`[{id:1},{id:2}]` cuando la firma es `getAchievementsMeta(ids)` con ids
**escalares**: la URL llevaba `ids=[object Object],...`. Si no hubiera
depurado el mock, "arreglaba" el codigo para tapar un error del test — que es
justo como se pierde la cobertura. La segunda fue una asercion mia demasiado
estricta sobre el numero de requests de la 2ª llamada; la reality es que el id
**invalido** no se cachea (no existe), asi que repreguntar *solo* ese es lo
correcto. Verifique antes de relajar.

**Los otros puntos del veredicto, validados por el Reviewer y sin accion:**
- (c) el orden de resolucion: recorrio los 9 call sites, **los 9 indexan por
  `id`**. Confirma mi correccion de que no hay corrimiento.
- (d) `Object.assign({}, per, fresh)`: la overwrite es correcto y **mejora** lo
  preexistente. Anoto como deuda preexistente el read-modify-write de
  `items_cache_v1` sin lock, que **no** lo introduce este commit.
- (a) la regex de reescritura de URL funciona;severidad baja-media, no
  bloquea. Queda anotada.
- El hallazgo transversal #5 (rendimiento) **si empeora**: el fix duplica
  requests en el camino 206. Anotado, no bloqueante.

### Dos tareas 404: TTL vencido, no timeout

`task-8408fd859db1` (Reviewer) y `task-6176f26e77bf` (PO) devuelven 404. Ya
estaban documentadas en el HB#48 (ALERT-45). **No se reenvian a ciegas**: en
ambos casos el contenido llego por el canal de archivos y ya esta aplicado.

### Dos escritores en el mismo clon (ALERT-59, nueva)

El PO commiteo `1fcb9b6` sobre `po/hb56-forma-raids` **mientras yo hacia la
fase roja con `git stash push` sobre `main`**: el stash se aplico a la rama del
PO. No se perdio nada (su rama solo toca `DASHBOARD_PO_IDEAS.md`), pero la
recuperacion dependio del orden de dos agentes. Antes, en este mismo ciclo, un
proceso paralelo escribio el TEAM_STATUS del HB#52 y yo lo iba a pisar: **lo
conservé intacto** en `6c5a278` en vez de sobrescribirlo.

Pedido al PO por el canal de archivos: mientras el Principal este en `main`, no
commitear en este clon. Regla incorporada: antes de un `git stash` o un
`git checkout`, correr `git status -sb` y `git log --oneline -1` juntos.

### El veredicto del PO y el del Reviewer no se contradicen

El PO concluyo que el fix del 206 era "correcto y mas defensivo de lo
necesario". Midio **que listas pide la app y si estan limpias** — correcto. El
Reviewer medico **que pasa cuando una lista no esta limpia** — y ahi estaba
roto. Los dos tienen razon en ejes distintos.

**Regla que sale de eso:** "no se ve hoy" no es "esta bien cuando se dispare".
Es la misma disciplina de ALERT-14 (el PO proponiendo features imposibles con
los datos disponibles). Y es exactamente lo que hace urgente la **Idea 56** del
PO (guard de forma en `getAccountRaids`, 1 linea, sin token): `Array.isArray
(data) ? data : []` degrada en silencio un body con forma inesperada, y eso es
"no se ve hoy" mas "no dice nada cuando pasa". **Proximo item del backlog.**



## Ramas huerfanas en el remoto (ALERT-55)

| Rama | Estado real | Accion del HB#52 |
|---|---|---|
| `fix/theme-borderleft-shorthand` | **Absorbida** (`git cherry` = `-`) | Pendiente de borrar |
| `feat/commerce-delivery-ui` | **Absorbida** (banner v1.1.1 en `converter-modal.js:14` de main) | Pendiente de borrar |
| `docs-estructura-20260930` | 1 commit, `ORG_MAP.md` con diff de base vieja | Revision manual |
| `feature/homestead-tracker` | **Trabajo perdido**: 3 funciones de API, ruta y script tag | `cherry-pick` desde `main` |
| `fix/homestead-glyph-data` | Contiene la anterior + el fix de schema de glyphs | `cherry-pick` desde `main` |
| `feature/legendary-component-tracker` | **Trabajo perdido**: `detail-modal.js` y `legendary-tracker-theme.js` no existen en main | `cherry-pick` desde `main` |

## Trabajo completado este ciclo

### 206 parcial — la API responde 206 y el codigo lo tomaba por exito completo

**Origen:** el PO (heartbeat 09:00, "Addendum Idea 48") reporto que un lote donde
parte de los ids son invalidos devuelve 206 en vez de error, y loopo como
"barato, evita datos falsos por corrimiento". **Subido a prioridad 1 por el PO.**

**Reproducido contra la API en vivo, sin token, antes de tocar codigo:**

| Pedido | Respuesta |
|---|---|
| `/v2/items?ids=1,2,3` | **404** `all ids provided are invalid` |
| `/v2/items?ids=1,2,3,4,5` | **206 con SOLO los 2 validos** (4 y 5) |
| `/v2/items?ids=all` | 400 |

El **206 es un 2xx**, asi que `!res.ok` en `jfetch` (`api-gw2.js:305`) es `false` y
el lote pasaba por completo. Las 3 mediciones del PO eran correctas.

**Defectos reales que producia (3, no 1):**

1. **`getAchievementsMeta` cacheaba el shard incompleto.** Tras el 206 hacia
   `putCache(key, bag)` con lo que llego. Los ids ausentes quedaban fuera del bag
   **hasta que venciera `TTL.ACH_META`**, porque la resolucion final relee el
   cache y no vuelve a pedir. `achievements.js:1069` armaba `metaById`
   incompleto: logros sin nombre, sin icono, sin tiers y `earnedAP = 0` **en
   silencio**. Es el mismo sintoma que el BUG 1 de
   `tests/idea49.shard-concurrency.test.js`, pero por otra causa: ese era
   concurrencia de cache, este es respuesta parcial.
2. **`getItemsMany` dejaba items sin icono, y el dato parpadeaba.** El id
   ausente no se cacheaba, asi que el render siguiente lo volvia a pedir y recien
   ahi aparecia.
3. **Carrera preexistente en `getItemsMany`, hallada por el test y AUSENTE del
   informe del PO.** La resolucion final armaba `out` desde un array **local**
   que solo muta el llamador que gana la carrera del `inflightOnce` → la 2da
   llamada concurrente del mismo id-set recibia **`[]` sin ningun error visible**.
   Es exactamente el defecto que la Idea 49 ya habia corregido en
   `getAchievementsMeta` (HB#48) y que **nunca llego a `getItemsMany`**. Ademas
   el `lsSet` del final pisaba el estado del otro con un objeto vacio.

**Correccion al diagnostico del PO: NO hay corrimiento por posicion.** Verifique
los 4 consumidores de `/v2/items` del repo y **todos buscan por `it.id`**:

| Consumidor | Como indexa |
|---|---|
| `meta.js:305` `batchItems` | `out.set(it.id, it)` |
| `activities-theme.js:506` `fetchNodeItems` | `map[item.id] = item` |
| `activities.js:754` ecto | `items.set(String(it.id), it)` |
| `api-gw2.js` `getItemsMany` | `per[String(it.id)] = ...` |

Ninguno indexa por posicion. Con 27 cuentas **no se puede atribuir un dato al
item equivocado**: el dano era de **dato faltante**, no de dato corrido. Sigue
siendo serio y lo arregle, pero el escenario mas grave que el PO planteo no
puede ocurrir con este codigo. La ausencia de corrimiento quedo como **asercion
explicita del test** para que un refactor futuro no la introduzca.

**El fix:**

- `missingFromBatch(requested, received)`: valida contra los **IDS PEDIDOS**,
  nunca contra el largo de la respuesta.
- `fetchBatchWithRepair(url, requested, opts)`: reintenta **solo** los ids que
  faltaron. Piso anti-loop: si no filtro nada, o si el lote entero fallo,
  devuelve tal cual en vez de insistir.
- `getItemsMany` resuelve desde la **cache** (union de los aciertos de entrada
  con lo que escribieron los producers), no desde `out`. El cap de 500 se aplica
  sobre el estado combinado.
- Aplicado en los **3 lotes**: `getItemsMany`, `getAchievementsMeta`,
  `getCommercePrices`.

**Verificacion (no supuesta):**

- `tests/idea49.partial-206.test.js`, **23 aserciones**.
- **Fase roja verificada: 6 FAIL contra `api-gw2.js` SIN modificar**
  (`git stash push` / run / `git stash pop`), 0 FAIL despues.
- Suite completa: **15/15 archivos en exit 0**.
- `node --check` limpio. Buster en el MISMO commit (ALERT-24 / REGLA 2):
  `api-gw2.js` 2.22.0 → 2.23.0.
- Enviado al Reviewer (`task-d2dd2353be24`) porque toca **capa de datos
  compartida**. No se da por cerrado hasta su veredicto.

**Riesgo residual, dicho explicitamente:** no hay token, asi que **todo el test es
con un `fetch` simulado**. Lo que no se puede cubrir sin una API key es el
comportamiento real de la API con 27 cuentas. Es la misma razon por la que el
badge CM sigue bloqueado.

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
| `task-cf7738456978` | product-owner | Idea 48 + Addendum: 206 parcial, CM por logros, IDs de VoE | **404 (TTL vencido), NO timeout.** El reenvio del PO llego igual, asi que no se reenvio a ciegas. Su contenido esta aplicado: el 206 corregido, los IDs verificados. |
| `task-b0a2e6a880c8` | product-owner | Respuesta del Principal: 206 mergeado, correccion al diagnostico (no hay corrimiento), 3er defecto (carrera en `getItemsMany`), estado del CM | **En vuelo** (`task_timeout` 1800). Se responde tambien por el canal de archivos: `20260930T090008Z-a4e6b8`. |
| `task-d2dd2353be24` | Code-Reviewer | Revision del fix del 206 (`c4b226a`), 5 preguntas acotadas | **En vuelo** (`task_timeout` 1800). Toca capa de datos compartida, asi que **no se da por cerrado sin su veredicto**. Se recoge en el proximo ciclo (PASO 1). |

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
