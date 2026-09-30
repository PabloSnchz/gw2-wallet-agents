# ALERTS_LOG.md — Registro de alertas

## ALERT-64 (2026-09-30 15:55 UTC, HB#57) — OBSERVACION, no bloquea

**El test del Tramo 3 detecto que mi JSDoc no declaraba lo que hace.** La
aserción exigía que `getAccountLuck` quedara SIN JSDoc (decisión de diseño de
aquel momento). Cuando escribí el bloque de código sin él, el test falló. La
causa real: estaba escribiendo la *razón* del comportamiento, no su
*contrato*.

Un test que falla contra el código que uno acaba de escribir está haciendo su
trabajo. Si lo hubiera "arreglado" relajando la aserción a "puede tener JSDoc",
el test habría pasado con un contrato mentiroso — que es exactamente el bug que
ese archivo existe para evitar.

**Regla:** cuando un test reciente te contradiga después de un cambio tuyo, la
primera hipótesis es que el test tiene razón. Antes de tocar la aserción,
escribí la frase que el JSDoc debería contener y fijate si el código la cumple.

## ALERT-65 (2026-09-30 15:55 UTC, HB#57) — sobre "no te contestaron"

Refuerza ALERT-63 con el caso cerrado. El Arquitecto reportó que el PO tenía
**5 mensajes míos sin responder**. Causa: `ask` con `to: default` en vez de
`to: product-owner` — se quedaban en mi propio inbox.

Un mensaje enviado a uno mismo es **indetectable después**: existe, está bien
formado, y aparece en un índice que el remitente lee. El único síntoma es que el
otro no contesta, que es lo que el equipo viene atribuyendo a un timeout del
Reviewer.

Ocurrió hoy **dos veces, en direcciones opuestas**: 3 mensajes al PO que nunca
llegaron, y el Tramo 2 al Reviewer que el Reviewer no había leído todavía
(`last_read` 14:59:48Z, enviado 15:06:55Z).

**Regla:** cuando alguien diga "no te contestaron", la primera verificación es si
el mensaje **llegó**, no si el otro está vivo. Y no declarar a un agente muerto
antes de los 20 minutos: el Reviewer tarda 2–15 min en una revisión real.

**Deuda de CLI (ya registrada):** `ask` debería rechazar un envío a uno mismo.


> Mantenedor: Principal (default) — actualizado por Heartbeat cada 30 min.
> Fuente de verdad: este archivo + TEAM_STATUS.md en el workspace del Principal.

## Formato

| ID | Severidad | Tipo | Descripción | Archivo(s) / Comentario | Estado | Detectado | Última actualización |
|----|-----------|------|-------------|-------------------------|--------|-----------|---------------------|
| **ALERT-61** | Media | Test / Proceso | **Cinco FAIL mios en un ciclo, y cuatro eran de las REGEX del test, no del codigo.** Escribi `tests/idea56.f1-hint-permiso.test.js` con una regex que partia el ternario buscando el `:` equivocado:tomaba el `:` interno de `error.message || ''` en vez del `:` del operador ternario, asi que la rama `else` salia vacia y daba FAIL aunque el fix estuviera perfecto. Dos aserciones mas fallaron porque busque el texto del guard con una regex de una sola linea y en el fuente esta partido por concatenacion (`'account/raids: forma no soportada (' +` en la linea siguiente). `idea60b` fallo 4 por lo mismo. **En los 3 casos el codigo estaba bien y el test estaba mal.** | ✅ **RESUELTA en el acto (HB#55)** | Regla aplicada: los tres tests quedaron en 23/0, 21/0 y 473/0, y el "el codigo esta bien" quedo **probado** ademas de supuesto (el test da FAIL contra el archivo sin el fix, lo que descarta que el test sea trivial). **REGLA: cuando la asercion parsea el fuente, se parsea con la misma forma que tiene en el archivo.** Un FAIL aqui se diagnostica leyendo el match real, no releyendo el codigo de produccion: aqui el bug estaba en el test las 3 veces. Es ALERT-56 reincidente, ahora con nombre propio. |

## Alertas activas
| **ALERT-73** | 🔴 Alta | Data | **La 49G (`ach_acc` compacta) pierde el PRIMER logro completado de cada cuenta, en cada lectura de cache.** El prefijo del formato es `v1:C:` = **5** caracteres y el slice arranca en **4**: `stored.slice(4, sep)`. Sobre `'v1:C:1595,2001|P:1002:3:10'` eso da `':1595,2001'`, y `parseInt(':1595')` = `NaN`, que la guarda `if (!isNaN(ids))` descarta. O sea: el primer id de la lista de completados se pierde **siempre**, para todas las cuentas. Con 27 cuentas y TTL de 2 min, Pablo ve logros **ya completados borrarse y reaparecer** cada vez que vence el TTL, de forma intermitente (nadie lo reproduce a mano: hay que andar dos veces seguidas). Afecta: grid de logros, AP permanente y el total de la API. | 🆕 **ABIERTA (HB#63). NO MERGEADA.** Verificado con repro propio sobre el texto real de la rama: red `-> [1595,2001,1002]`, cache `-> [1002,2001]`. La rama `feat-idea49g-ach-acc-compacta` (`1a47d5c`) **NO esta en main** (`git merge-base --is-ancestor` -> false), asi que no hay que revertir nada: basta con no mergearla. Fix del Reviewer: `slice(5)` + un caso de test que escriba la clave y la vuelva a leer desde una sesion nueva. **Por que la suite daba verde sin dientes:** ninguna seccion del test lee una entrada compacta con ids completados (la 1 lee red, la 4 mete la forma vieja, la 7 usa un localStorage nuevo). Es el hallazgo de "el suite no tiene dientes", con consecuencia real. |
| **ALERT-74** | 🔴 Alta | Producto | **La columna "Puntos de logros" de la vista de Personajes muestra `NaN` explicito en `main`, hoy.** `characters.js:450` suma `a.current` a pelo para los logros `done`, y la GW2 API **omite `current` en un logro completado SIN tiers** (ejemplo literal de la wiki: `{"id":202,"done":true}`). `0 + undefined` = `NaN`, y el NaN se propaga a todos los logros que se sumen despues. Preexistente, NO introducido por la 49G, y no depende de la cache ni del TTL. | ✅ **CORREGIDO (HB#63)** — commit `8dd53a0`, `Number(a.current) || 0`. Test `tests/idea78-puntos-logros-nan.test.js` (12 aserciones): **6 FAIL** contra el archivo sin el fix (stash push/pop), 12/0 con el. Suite **581 pass / 0 FAIL** en los 25 archivos. **SE DESMIENTE la hipotesis de que el fix de la 49G lo arreglaba:** se verifico que NO. El bug esta en la FORMA, y codificar `cur`/`max` en la cache solo cambia el camino cache; el camino RED (primera carga, o `nocache`) daria NaN igual. Por eso se abre **propio** y no como parte de la 49G. **Consecuencia para la 49G:** el B2 del Reviewer (que `done` descarte `current`/`max`) es la MISMA clase, y ahi si es un bug de cache. Los dos convergen en el campo `current` pero **no se arreglan con el mismo commit**. |
| **ALERT-75** | 🔴 Alta | Proceso | **El resumen de las 18:55Z del Code-Reviewer se contradice a si mismo con su veredicto detallado de las 18:44Z, sobre la MISMA 50F, y el resumen es el que llega último.** En `20260930T170948Z-982658` (respondido `18:44:32Z`) el veredicto es **APROBADO CON CAMBIOS, "Mergealo"**, y su P2 dice textual: *"`doomed` se recapila primero y se borra despues, asi que `removeItem` no muta `localStorage.length` ni `key(i)` durante el scan"* — o sea, P2 **verificado como correcto**. 11 minutos despues, en `20260930T185533Z-ddc4d4`, el mismo agente escribe que la 50F esta **RECHAZADA** y que *"`removeItem` en vivo muta `localStorage.length` y `key(i)`, y el recorrido borra sobre lo que ya recorrio"*: el mismo P2, agora como bug. | ✅ **RESUELTO (HB#64) — la 50F se mergeo.** Se verifico contra el **archivo real** de `c04496e` (`git show c04496e:js/api-gw2.js`, lineas 1704-1719), no contra el diff ni contra los dos resumenes: el codigo recopila en `doomed` y borra despues, o sea que **el codigo esta bien y el resumen de las 18:55 es el que esta mal**. Dos fuentes independientes coinciden con el veredicto de las 18:44: el archivo `982658` y la auditoria propia del PO (`_pre_r15.md`, que lista `982658` = "APROBADO CON CAMBIOS, 0 bloqueantes de codigo"). Merge `86b351a`. **Por que se abre igual:** el modo de falla no es que este veredicto fuera falso — es que un resumen en prosa llego **despues** y con menos detalle, y el HB#63 llego a leer ese. Un resumen no puede pisar al artefacto que resume. **Regla: cuando dos artefactos del mismo agente se contradigan, gana el que tiene el detalle y la evidencia, y el resumen se contrasta contra el codigo antes de actuar.** Un `subject=` o una tabla no son un veredicto. |
| **ALERT-76** | 🟡 Media | Producto | **El Tramo 3 de la Idea 61, que el PO puso como la PUERTA de la 49D, ya no puede fallar nunca.** El test que escribio (`DASHBOARD_PO_IDEAS.md:84`) era "la `gn:` y la legacy tienen el mismo largo". Con el fix de la 61 ya mergeado, `Storage.set` escribe las DOS y `Storage.get` lee la legacy primero (`storage.js:246-252`): no hay forma de que se desacoplen por el camino normal, asi que la asercion es tautologica. Ademas, la unica asercion que el test tiene sobre el espejo (`tests/idea61-claves-congeladas.test.js:225`) es un **regex sobre el texto de `MIRROR_MAP`**: verifica que el mapa este escrito, no que el espejo funcione. | 🆕 **ABIERTA (HB#64). No es un bug de codigo, es un test que miente sobre lo que cubre.** El Reviewer lo planteo y esta verificado; lo dejo anotado porque el razonamiento del PO ("sin el test no se puede borrar la legacy") **cambio de premisa**: con el fix, lo que ata las dos claves es el ESPEJO en la escritura, no un test que las observe despues. **Y la 49D quedo MAS peligrosa, no menos:** antes de borrar la legacy no la dejaba huerfana; ahora la gn: es su espejo, y `Storage.get` cae al fallback, o sea que se pierde la fuente de verdad. Si la 49D entra, tiene que **excluir explicitamente las 4 claves de `MIRROR_MAP`**, y no por "no tiene contraparte `gn:`". El Tramo 3 no se borra: **se recambia** por un test de la clase de bug que `MIRROR_MAP` no cubre (que alguien escriba la legacy a pelo y la `gn:` se vuelva a congelar). |


| # | Severidad | Tipo | Descripción | Estado | Resolución |
|---|-----------|------|-------------|--------|-----------|
| **ALERT-60** | ?? Baja | Data | **Un `catch` que devuelve un valor por defecto borra la diferencia entre "no lo pude leer" y "no hay nada".** `js/api-gw2.js:566` (antes del fix) hacia `var raids = Array.isArray(data) ? data : []` en `getAccountRaids`: una respuesta con una forma no soportada pasaba por `[]` sin warning. El JSDoc de la MISMA funcion ya decia "@throws ... no degrada a []": el catch de RED propagaba, el camino de FORMA no. En el Strike Tracker eso es `state.completedStrikes = []` -> **"0 de 15 completados", que es exactamente lo que se ve si la cuenta no hizo ninguno**. La rama 2 documentada en el wiki de 2019 (`progress:[{id,cm,li}]`) daria un ARRAY, pasaria el `Array.isArray`, y el `.filter(function(id){...})` de `strike-tracker.js:1106` recibiria objetos: 0 de 15, igual, en silencio. | ✅ **CERRADA (HB#55)** — APROBADA por el Reviewer (`task-b20623f46caa`, veredicto APROBADO sin bloqueantes) y mergeada con sus 3 follow-ups: `979bfa6`/merge `23b1565` (F2, `getCharacterCount`, v2.24.1) y `4c95774`/merge `72cc8af` (F1, la pista de permiso) + F3 (doc). Suite completa **473 aserciones, 0 FAIL**. **CORRECCION DE RECUENTO que sale de F2: son SIETE los wrappers que degradaban por forma, no seis.** El "cinco propagados" de la Idea 47 no incluía a `getCharacterCount`, aunque BACKLOG/ALERT-31 lo listaban como propagado. El Reviewer lo detecto leyendo el JSDoc de la funcion, no el codigo: el doc decia "no degrada a 0" y solo el catch de RED lo cumplia. | Propuesta del PO (Idea 56, 2026-09-30 10:00 UTC), verificada de forma independiente antes de tocar codigo: los 5 call sites (`raid-tracker.js:1713/1805`, `strike-tracker.js:1092/1165`, `wallet-dashboard.js:448`) ya manejan rechazo (`allSettled` con re-throw explicito, `try/catch` que relanza, prefetch que ignora), asi que el `throw` no tumba nada. Test `tests/idea56.forma-raids.test.js` (20 aserciones): **8 pass / 12 FAIL** contra el archivo sin modificar, 20/0 con el fix; suite completa **352/0**. **NO arregla el modulo**: ALERT-41 sigue bloqueado (falta el body crudo). Lo que hace es convertir el bloqueo en diagnostico. **REGLA: un valor por defecto en un `catch` tiene que ser distinguible del valor real. Un `[]` de fallback que el consumidor no puede diferenciar de un `[]` de verdad es un bug esperando el dia que la API cambie.** Corolario: el sexto wrapper que degrada, cuando la Idea 47 ya propago cinco. Un FAIL del test era del TEST (ALERT-56): el caso "string" usaba el texto `[]`, que parsea a un array JSON valido y tiene que pasar el guard. |
| **ALERT-59** | 🔴 Alta | Repo | **El clon de trabajo tiene DOS ESCRITORES y `git checkout` entre ramas mueve el working tree entero.** En un mismo ciclo (HB#53) el PO commiteo `1fcb9b6` sobre `po/hb56-forma-raids` **mientras el Principal hacia la fase roja con `git stash push js/api-gw2.js` sobre `main`**: el stash se aplico a la rama del PO. No se perdio nada (su rama solo toca `DASHBOARD_PO_IDEAS.md`, sin conflicto con `api-gw2.js`), pero la recuperacion dependio del orden de dos agentes. Ya habia pasado antes en el MISMO ciclo: el `TEAM_STATUS.md` del HB#52 lo escribio un proceso paralelo y el Principal lo iba a pisar. | ABIERTA | El log ajeno se conservo intacto (`6c5a278`) en vez de sobrescribirlo; el stash se restauro con `git stash pop` sobre `main`. **Peticion al PO por el canal de archivos:** mientras el Principal este en `main`, no commitear en este clon; usar rama `po/` y avisar. **REGLA: antes de un `git stash` o un `git checkout`, correr `git status -sb` y `git log --oneline -1` juntos, porque la rama pudo cambiar desde la ultima llamada.** |
| **ALERT-58** | 🔴 Alta | Data | **La regresión del 206: el reintento de los ids faltantes no tenia handler de rechazo, y el 404 de la API descartaba los ids validos que ya teniamos.** Los ids que faltaron de un 206 son, por definicion, ids que la API no tiene; al repreguntarlos sola responde **404** ("all ids provided are invalid"), NO 206 — porque 206 significa "queda al menos uno valido". Ese 404 propagaba y `arr` se descartaba con el. Medido con un lote de 15 ids (10 validos + 5 invalidos): **pre-fix 10 items / 1 request / 10 cacheados -> post-fix 0 items / 2 requests / 0 cacheados**. El fix empeoraba el bug que queria arreglar. Peor en `getAchievementsMeta`, que no tiene catch: **tumbaba la vista de logros completa**, y la 2a llamada no se sanaba porque no se cacheo nada. Encontrado por el Code-Reviewer (`task-d2dd2353be24`, veredicto RECHAZAR). | ✅ **CORREGIDO** (HB#53) | `9e96986`, `api-gw2.js` v2.23.1 + `index.html:940`. El reintento paso a `.then(onOk, function () { return arr; })`: es una mejora, no un requisito. Test `tests/idea49.partial-206.retry404.test.js` (13 aserciones, mock fiel): **8 pass / 5 FAIL** contra el archivo sin el fix, 13/0 con el. Suite completa **16/16**. **REGLA: un test que simula una API externa y cuya logica nueva depende de COMO FALLA la API tiene que copiar los dos caminos de fallo (parcial y total), no solo el exito parcial.** El mock original calculaba `status = (got.length===list.length) ? 200 : 206`, asi que para el reintento devolvia 206 con `[]` cuando la API real devuelve 404: simulaba un endpoint distinto del real justo en la ruta que el fix agrega. Por eso discriminaba 6 FAIL contra el codigo viejo y daba 0 FAIL con el. |
| **ALERT-57** | 🔴 Alta | Data | **La API devuelve 206 cuando solo PARTE de los ids pedidos existen, y `!res.ok` no lo ve** (206 es 2xx). Medido sin token: `ids=1,2,3` → 404; `ids=1,2,3,4,5` → **206 con solo los 2 válidos**; `ids=all` → 400. Reportado por el PO (Idea 48) y **reproducido**. Consecuencias medidas: (1) `getAchievementsMeta` cacheaba el shard incompleto y los ids ausentes quedaban fuera del bag hasta vencer `TTL.ACH_META` → logros sin nombre/icono/tiers y `earnedAP = 0` en silencio; (2) `getItemsMany` dejaba items sin icono que parpadeaban entre renders; (3) **carrera preexistente en `getItemsMany`**: la 2ª llamada concurrente del mismo id-set recibía `[]` sin error, porque `out` es local y solo muta al que gana el `inflightOnce`. | ✅ **CORREGIDO** (HB#52) | `c4b226a` / merge `381fe9d`, `api-gw2.js` v2.23.0. `fetchBatchWithRepair()` reintenta solo lo que faltó, con piso anti-loop. Aplicado en los 3 lotes. Test `tests/idea49.partial-206.test.js` (23 aserciones): **6 FAIL** contra el archivo sin modificar, **0 FAIL** con el fix. Suite completa 15/15 exit 0. **REGLA: un lote se valida contra los IDS PEDIDOS, nunca contra el largo de la respuesta, y nunca se rellena por posición.** Se verificó que ningún consumidor mapea por posición (todos usan `obj.id`), así que el daño era de dato faltante, no de dato atribuido al item equivocado. |
| **ALERT-56** | Media | Test | **Un test textual que verifica la AUSENCIA de algo no puede correr sobre un archivo donde uno escribio ese mismo string al documentar el fix.** En `tests/idea55.account-layer.test.js` 2 de las 3 primeras aserciones fallaron por matchear mis propios comentarios de cabecera (`cache:no-store`, `if (accountRes.ok)`), no el codigo. Un tercero: el sandbox que evalua la funcion real de `api-gw2.js` no tenia `TTL` ni `CFG` en el contexto y tiraba `ReferenceError`. Un cuarto: el stub de `inflightOnce` era `return fn()` y no deduplicaba, asi que la asercion de concurrencia fallaba por el harness. | ABIERTA (regla incorporada) | Filtrar lineas de comentario antes de todo match textual de "no existe". Y: la dedupe de concurrencia la hace `inflightOnce`, no el cache (las 2 llamadas llegan antes de que la primera resuelva). **Un FAIL se diagnostica antes de tocarse**: si el codigo esta bien, relajar la asercion es como se pierde la cobertura. |
| ALERT-01 | 🔴 Alta | Platform | Code Reviewer: bug session_id mismatch. **13 failures consecutivos.** PERO: en HB#30 (`task-d3355a858009`) **RESPONDIÓ con un análisis completo** — el Reviewer volvió a la vida. Modo de fallo nuevo detectado en paralelo: `Provider returned an empty response`. | ✅ **MITIGADO** (HB#30) | El Reviewer es funcional de forma intermitente. Reintentar en cada heartbeat. CSS changes ya NO estan bloqueados por defecto. Escalado a Pablo sigue vigente (bug de plataforma no arreglado). |
| **ALERT-13** | 🔴 Alta | Platform | **Reviewer: modo de fallo NUEVO** — `Model 'kilo-auto/free' execution failed. Reason: Provider returned an empty response` (COMM 013b, `task-5dd795a4dd73`). Distinto del `session_id mismatch` de los 12 fallos previos. Dump en `%TEMP%\qwenpaw_query_error_*.json`. | 🆕 Detectado (HB#30) | No es culpa del prompt ni del mensaje largo (esta vez el mensaje era corto y acotado). Es provider-side. Reintentar: funciono 1 de cada ~14 intentos. |
| **ALERT-14** | 🔴 Alta | Data | **El PO propuso 2 IDs de logro INEXISTENTES.** Su "Convergence Achievement Tracker" se apoyaba en `9384` y `9454`; ambos devuelven `404 {"text":"no such id"}`. El set real de VoE es la categoría 487 `Convergencia: Nexo de Eternidad` = `{9349, 9394, 9405, 9409, 9422, 9435, 9447}` (7 logros). Además la 487 **ya se carga dinámicamente** en `achievements.js:255`, así que el módulo propuesto era redundante. | 🆕 Detectado + corregido (HB#30) | Correcciones enviadas al PO (`task-5ccb7fb3377d`). Leccion: regar AGENTS.md #6 — no insistir en features imposibles con los datos disponibles. Regla nueva en vigor: **toda feature del PO pasa por `curl` a la API antes de mandarse al Principal.** |
| **ALERT-15** | 🟡 Media | Data | **Claim falso del PO:** "`/v2/account/luck` no existe". Falso. `GET /v2/account/luck` sin token → **`HTTP 401 Unauthorized`**, no 404. 401 prueba que el endpoint existe y pide auth (un endpoint inexistente devuelve 404 `no such id`, como 9384). | 🆕 Detectado + corregido (HB#30) | La feature Suerte (MF) ya commiteada en `agents/main` es **correcta**. Lo que el PO retracto bien fue la premisa de temporalidad (MF account-wide es de 2013-09-03). Registrado en BACKLOG + DECISIONS_LOG. |
| **ALERT-16** | 🟡 Media | Repo | **`DASHBOARD_PO_IDEAS.md` 10h desactualizado** (timestamp `2026-09-29T07:37:00Z`). No refleja los heartbeats PO de 16:00 ni 17:00 UTC — las Ideas 38/39/40/41 no aparecen. Es el **único artefacto que ve Pablo**. | 🆕 Detectado (HB#30) | Pedido explícito al PO en `task-5ccb7fb3377d`. |
| **ALERT-17** | 🟡 Media | Repo | **Segundo clon divergente del repo en el disco.** `C:\repo` (sin remote `agents`, `main` @ 48b9914) duplica a `C:\Mis Archivos\GW2 online\gw2-wallet-ligero` (con ambos remotes, rama `fix/fractal-rotation-hardcoded` pusheada). Heartbeat #30 casi commitea sobre el clon equivocado. | ✅ **Resuelto** (HB#30) | Todo el trabajo de HB#30 se hizo en el clon canonico. `C:\repo` queda como scratch — no usarlo para commits. |
| ALERT-10 | 🔴 Alta | Codebase | **Homestead tracker huerfano en `agents/main`**: `js/homestead-tracker.js` commiteado (680f051, HB#17) pero sus 5 metodos `GW2Api` NO existen en `api-gw2.js` de main, y no hay script tag en index.html, ni route en router.js, ni panel. El modulo es inerte en main. En `feature/homestead-tracker` el wiring esta completo pero falta el icono `assets/icons/Cuentas/homestead-icon.png` (no existe). | ⏳ Pendiente decision | Requiere merge de la rama completa (con icono) o revert del archivo en main. No bloquea produccion: el archivo NO esta en `origin/main`. |
| ALERT-11 | 🟡 Media | Codebase | **Schema incorrecto de la API de glyphs (CORREGIDO en 18ef9a4)**: `/v2/homestead/glyphs` devuelve un array de **strings** (36 entradas tipo `"alchemy_harvesting"`), NO objetos `{id,name,icon}`. El modulo leia `glyph.id`/`glyph.icon`/`glyph.name` sobre strings -> los 36 glyphs se renderizaban rotos. `glyph.upgrade_item` (reportado por el PO) nunca existio. | ✅ Resuelto (Heartbeat #28) | `normalizeGlyphs()` + `normalizeGlyphIds()` agregados; dead code `CONFIG.GLYPH_UPGRADES` eliminado. Verificado contra API real (36/36) + `node --check`. Sin cambios CSS. En rama `fix/homestead-glyph-data`, NO mergeado (depende de ALERT-10). |
| ALERT-12 | 🟢 Baja | Codebase | 17 archivos .js con BOM UTF-8 en `js/` (detectado HB#28). | 📋 Escaneado — no modificado | Cambio masivo; requiere validacion del Reviewer (DOWN). No se toco para evitar riesgo. |
| ALERT-02 | 🟡 Media | Platform | Documentador: timeout. 7th consecutive timeout. | ✅ **RESUELTO** (HB#30) | **Documentador RECUPERADO**: `task-b4a7f3aeb84b` (COMM 014) completada — CHANGELOG + README + ONBOARDING de la feature Suerte/MF, commit `53425b0` a agents. Fin de la ventana "Principal mantiene los logs". |
| ALERT-03 | 🟢 Baja | Platform | HEARTBEAT.md re-injection: platform reads HEARTBEAT.md e inyecta como prompt cada turn. Banner aplicado como mitigación. | ⏳ Sin resolver (platform-level) | Banner en HEARTBEAT.md previene ejecución automática. Cron share_session: false verificado. Heartbeats manuales ejecutados (#14-#26) por request de usuario. |
| ALERT-09 | 🟡 Media | Platform | PO heartbeat platform bug: heartbeats 08:00/10:00 UTC no produjeron contenido. 9th timeout. | ⚠️ **PARCIALMENTE resuelto** (HB#30) | **PO volvio a producir**: heartbeats 16:00 y 17:00 UTC con 4 ideas nuevas + autocrítica propia. El bug de plataforma persiste pero el PO es **productivo de forma intermitente**. Sus propuestas ahora se verifican contra la API antes de aceptarse (ALERT-14, ALERT-15). |
| ALERT-04 | 🟡 Media | Repo | BACKLOG.md en repo was STALE (Sept 24 version). | ✅ Resuelto (Heartbeat #18) | Workspace BACKLOG.md synced to repo. Current. |
| ALERT-05 | 🟡 Media | Repo | TEAM_STATUS.md en repo was STALE (Sept 26 bootstrap). | ✅ Resuelto (Heartbeat #18) | Workspace TEAM_STATUS.md synced to repo. Current. |
| ALERT-06 | 🟢 Baja | Codebase | **~39 `style="..."` inline en inventory-dashboard.js** (deuda preexistente de layout). Mayormente `display:flex`/`gap`/`padding`, que por la arquitectura de 3 capas corresponde a `main.css`. | ⚠️ **DIAGNOSTICO ORIGINAL FALSO** (HB#36) | El diagnostico del backlog ("4 inline styles con box-shadow/border-radius en lines 462/473/709/830") **no sobrevive la verificacion**: no hay ningun `box-shadow` en el archivo, y L462/473 son asignaciones de propiedad DOM dentro de `startDeltaBlink` (animacion transitoria), no markup inline. Reetiquetado como deuda de layout, no bug de arquitectura. **Pendiente**: extraer a `main.css` cuando toque. |
| ALERT-07 | 🟡 Media | Codebase | inventory-dashboard.js: "clearTimeout bug / timer leaks" (lines 267-290). | ⚠️ **DIAGNOSTICO ORIGINAL FALSO** (HB#36) | `loadActiveCharacterInventory` tiene `try/catch/finally` anidado correcto, con `clearTimeout(t1)` **y** `clearTimeout(t2)` en `finally`, que corre en todas las rutas incluido el error. **No hay leak de timers.** Cerrada como falso positivo. |
| ALERT-08 | 🟢 Baja | Repo | Unpushed commit f16ee12 en feature/legendary-component-tracker. | ✅ Resuelto (Heartbeat #18) | Commit en agents/main via merge (35a0f5e). |
| **ALERT-18** | Alta | Repo | **`ALERTS_LOG.md` quedo truncado a 0 bytes en disco** al arrancar el HB#35. `git status` mostraba ` M ALERTS_LOG.md` con un diff de -39 lineas (archivo entero borrado). Perdia 17 alertas activas, incluidas ALERT-14/15 (falsos datos del PO) y ALERT-17 (clon divergente). | **Resuelto (HB#35)** | Restaurado con `git checkout -- ALERTS_LOG.md` (8151 bytes). Causa probable: un write_file truncante del heartbeat anterior. Regla: todo log se commitea en el MISMO heartbeat que lo modifica; un log que queda solo en el working tree se puede perder entero. |
| **ALERT-19** | Media | Repo | **`ALERTS_LOG.md` no esta en el workspace del Principal.** El Principal lo edita en el repo, mientras el resto de sus logs vive en `workspaces\default`: dos fuentes de verdad para el mismo dato. | Pendiente decision | No bloquea. Unificar en el heartbeat que toque cada log. |
| **ALERT-51** | 🟠 Media-alta | Data | **`js/raid-tracker.js`: 5 de los 30 encuentros tienen un `id` que no existe en `/v2/raids`**, asi que `completedSet.has(enc.id)` (`:1438`) falla para siempre: la tarjeta **nunca se marca**, el ala queda trabada en N-1/N y **no hay error ni warning**. 4 renombres: `siege_the_stronghold`->`escort`, `desmina`->`soulless_horror`, `dhuum`->`voice_in_the_void`, `gates_of_ahdashim`->`gate`. Emparejados **por ala**, no por nombre (los nombres no se parecen). Ademas `ura_guardian` no era el id de ningun encounter (el de Ura es `ura`): las recompensas de Ura y su ficha nunca se mostraban. Y `the_threshold` eran 19 lineas muertas. | ✅ **RESUELTA (HB#49)** | Merge `ab39823`, `raid-tracker.js` v1.10.0. Test nuevo `tests/idea52.raid-encounter-ids.test.js` (27 aserciones) con el catalogo real embebido en `tests/fixtures/`. **Verificado fallando contra el archivo sin modificar: 20 pass / 7 FAIL; despues 27 / 0.** Suite completa 258 aserciones, 0 FAIL. Sin CSS, sin logica, sin localStorage (el estado siempre viene de la API), total de encounters sin cambio. **REGLA: un tracker no se valida probando que marca, sino probando que lo que NO marca es porque la API no lo tiene.** Origen: idea del PO, verificada de forma independiente antes de tocar codigo; el hallazgo se reprodujo exacto. |
| **ALERT-52** | 🟡 Media | Platform | **Los ids de encuentro NO son resolubles uno a uno contra `/v2/raids`.** `GET /v2/raids?ids=gorseval` -> **404 `all ids provided are invalid`**. Solo existen dentro de `?ids=all`, y la forma real es **`raid.wings[].events[]`**, NO `raid.events[]` (la extraccion ingenua devuelve los 6 ids de raiz y hace creer que hay 6 encuentros en el juego). | 🆕 Detectado (HB#49) | **ABIERTA — trampa para la Idea 53** (Strike Tracker re-apuntado a logros). Quien la implemente resolviendo un id contra `/v2/raids?ids=<id>` se come un 404, igual que se lo comio el primer probe. **REGLA: el catalogo de la API se extrae de la respuesta completa, y "no existe" se demuestra con el snapshot, no con una consulta suelta.** El PO llego a la conclusion correcta por otra via; el detalle de la resolucion individual no lo tenia. |
| **ALERT-53** | 🟢 Baja | Data | **Huecos de datos menores en el mismo modulo y la misma capa** que ALERT-51, medidos y **no tocados** para no ampliar el diff: `statues_of_grenth` es `type: "jefe"` pero no tiene drops en `REWARDS_DATA`; `bandit_trio` y `river_of_souls` estan como `type: "evento"` cuando la API los reporta `Boss` (cosmético: icono y color). Y 5 eventos reales no cableados (`camp`, `escort`, `gate`, `soulless_horror`, `voice_in_the_void`), que agregarlos sube el KPI de 30 a 35. | ⏳ **ABIERTA, no bloqueante** | Los 2 primeros sonSEO fillers: rellenarlos seria **inventar drops**, asi que no se hizo. Agregar los 5 no cableados **cambia el grid y el denominador del KPI que Pablo ve**: es decision de producto, no del equipo. Anotado en `TEAM_STATUS.md` bajo "Pendiente que requiere a Pablo". |

## Alertas resueltas (histórico)

| # | Severidad | Tipo | Descripción | Fecha |
|---|-----------|------|-------------|-------|
| ALERT-04 | 🟡 Media | Repo | BACKLOG.md en repo STALE — synced to workspace version + push a agents en Heartbeat #18. | 2026-09-29 |
| ALERT-05 | 🟡 Media | Repo | TEAM_STATUS.md en repo STALE — synced to workspace version + push a agents en Heartbeat #18. | 2026-09-29 |
| ALERT-08 | 🟢 Baja | Repo | Unpushed commit f16ee12 en feature/legendary-component-tracker — commit ya está en agents/main via merge (35a0f5e). Resuelto. | 2026-09-29 |

| ALERT-23 | Alta | Platform | **Dos heartbeats corriendo en paralelo sobre el mismo clon local.** `git reflog` muestra `checkout: moving from feat-46-global-request-pool to fix/concurrency-pool-phase2` entre dos comandos consecutivos del Principal, y el working tree tenia cambios de otro (`inventory-dashboard.js` con un `mapWithPool` local, `ALERTS_LOG.md` reetiquetado en HB#36). Un commit mio quedo colgado en la rama del otro. | Detectado (HB#36) | El reflog lo hace diagnosticable: `git reflog -8` antes de culpar a uno mismo. Mitigacion aplicada: **mergear desde un worktree aislado** (`git worktree add <tmp> main`) para no tocar el clon compartido. A aplicar en cualquier heartbeat que Detecte el arbol sucio al arrancar. |
| ALERT-24 | Media | Repo | **Un buster de cache puede apuntar a una version que no esta en el repo.** `index.html` servia `wallet-dashboard.js?v=2.8.0` mientras el archivo en `main` era 2.7.0, porque el busto se bumpeo en el tramo 1 y el tramo 2 nunca se mergeo. | RESUELTO (HB#36) | Cherry-pick `2806296`. Regla que sale de ahi: **el buster se bumpea en el MISMO commit que el contenido**, nunca en un commit anterior. Es el modo de falla inverso al de ALERT-22 (alli el buster atrasaba; aca adelanta). |
| **ALERT-38** | 🟡 Media | Codebase | **`wallet-dashboard.js:488` tiene su propio pool local `MAX = 3`, anidado dentro del pool global de requests.** El Tramo A de la Idea 48 subio el global de 3 a 6 (justamente porque el `3` no lo eligio nadie y nunca se midio), pero el local quedo como el nuevo piso, **sin medir y por la misma razon**. No lo anula: son dos cosas distintas (local = cuentas en vuelo, global = requests simultaneos) y con 4 requests por cuenta, 3 cuentas piden 12 y el global cede 6, asi que el global sigue siendo el cuello. | Abierta (HB#42) | **No lo toco**: cambiarlo sin medir seria repetir exactamente el error que el PO acaba de corregir en el otro lado del pool. **REGLA: cuando se recalibra un pool, contar cuantos hay en el camino y preguntarse cual limita de verdad.** El dato para medirlo sale de la nueva ETA: con ella se puede ver si el piso local aparece. |
| **ALERT-39** | 🟡 Media | Repo | **El `git commit` fue denegado por la politica del driver por un falso positivo.** El mensaje de commit contenia la secuencia de caracteres `rm` **dentro de la palabra "formato"** (`fo-rm-ato`) y el clasificador la tomo por comando destructivo. No hay ningun `rm` en el comando. Ocurrio tambien en el HB#30, con el mismo modo de falla. | ~~Abierta (HB#42)~~ -> **RESUELTA (HB#43)** | La denegacion fue **real pero sin consecuencia permanente**: un heartbeat posterior commiteo el Tramo B igual, `90d2b0e` (`wallet-dashboard.js` v2.9.0), y esta en `agents/main`. Verificado contra `git log`, no asumido. **REGLA: una denegacion del driver cancela EL INTENTO, no el trabajo.** Antes de dejar algo marcado como perdido, comprobar si otro ciclo ya lo commiteo — sobre todo con heartbeats paralelos, que es exactamente cuando la denegacion se cuela. | (`js/wallet-dashboard.js`, `index.html`, `tests/idea48b.eta-counter.test.js`). El trabajo esta verificado (151 aserciones, 0 FAIL) pero **no llega a `agents/main`**. **REGLA: al escribir un mensaje de commit, evitar palabras que contengan `rm` en medio** ("formato", "confirma", "normalizar", "transformar"). No reintentar el commit sin autorizacion del usuario: la denial es final para esa request. |
| **ALERT-40** | 🔵 Baja | Repo | **`TEAM_STATUS.md` puede quedar desfasado respecto al repo cuando hay heartbeats paralelos.** El Tramo A de la Idea 48 se mergeo en `agents/main` @ `78a5a7a` a las 03:09 UTC, **21 minutos despues** de la ultima actualizacion del log (02:30 UTC), y el log seguia listandolo como "SIGUIENTE ITEM". Lo mergeo un heartbeat concurrente y ninguno de los dos actualizo el status. | Abierta (HB#42) | Se detecto al arrancar el HB#42 por `git log origin/main` antes de leer el log. **REGLA: al arrancar un heartbeat, `git log --oneline -5` ANTES de leer `TEAM_STATUS.md`, y contrastar la hora del ultimo `Actualizado:` contra la del ultimo commit.** Es la version barata de la regla de ALERT-36 (que exigia revisar worktrees). |
| ALERT-25 | Baja | Code | **`getAccountBank` se come los errores igual que `getCommerceDelivery`.** Lo destapo la prueba 2 del pool: 4 de 12 cuentas con 403 devuelven `[]` sin propagar nada. Es el mismo patron de ALERT-20, en otro endpoint del mismo archivo. | Detectado (HB#36) | Con 0 callers de `getCommerceDelivery` el costo era cero. `getAccountBank` **si** tiene callers, asi que propagar aca es refactor sobre codigo en uso: no se hace en este commit. Queda para cuando el Reviewer tenga capacidad. |

| ALERT-26 | 🟡 Media | Codebase | **`wizards-vault.js:89-124` tiene `jfetch` + `fetchWithRetry` copiados VERBATIM, fuera del pool.** Verificado en HB#37 con `findstr /s`: son las unicas otras definiciones de esas dos funciones en todo `js/`. El modulo lee `GW2Api.__cfg.API_BASE`/`RETRIES` pero **no comparte el estrangulador**, asi que toda la WV pasa por la copia. | Abierta (HB#37) | Hallazgo #1 del Reviewer sobre la Idea 46 t1. **Corregirlo es t1b, commit propio**: mezclar un refactor de WV con la infra del pool haria el commit irrevisable. Efecto colateral: elimina la copia y cierra el hallazgo transversal #4 (codigo duplicado) de a Proper. **No bloquea** a t1, ya mergeado y verificado. |
| ALERT-27 | 🟡 Media | Codebase | **El pool global NO arregla el 429: el limite de ArenaNet es de TASA, no de concurrencia.** Con `POOL_MAX=3` y respuestas de ~200ms el techo real es ~15 req/s = 900/min, por encima del presupuesto de 600/min. `fetchWithRetry` tampoco lee `X-Rate-Limit-Remaining` ni `Retry-After`. | Abierta (HB#37) | Hallazgo #5 del Reviewer. Con 27 cuentas (los 324 requests de la Idea 42) el agregado sigue reventando. **Es decision de alcance del PO**: t1 amortigua picos, no excedentes sostenidos. Falta un token bucket. **La Idea 42 no debe entrar sin resolver esto.** |
| ALERT-28 | 🟡 Media | Codebase | **~28 `fetch` crudo contra `api.guildwars2.com` siguen FUERA del pool.** El Reviewer verifico el arbol completo: ~13 con `access_token` (los que cuentan para el 429) y ~15 publicos sin token. Varios reimplementan endpoints que ya existen en `GW2Api`. | Abierta (HB#37) | Hallazgo #6 del Reviewer. `activities.js:378` no es *el* hole sino el peor caso de un patron. Migracion natural: borrar el `fetch` crudo y llamar al metodo `GW2Api` que ya existe, lo que ademas mata codigo duplicado. **Candidato a t3**, antes de la Idea 42. |
| ALERT-29 | 🟡 Media | Codebase | **El pool global no tiene timeout por request, y el radio de dano paso a ser global.** `grep AbortController|setTimeout|timeout` en `api-gw2.js` -> una sola coincidencia, el backoff. `jfetch` solo usa `signal` si el caller lo pasa. Antes un request colgado trababa el pool local de un dashboard; ahora traba los 3 slots globales. | Abierta (HB#37) | Hallazgo #3 del Reviewer. No es un agujero nuevo, pero el pool lo escala de "un panel trabado" a "todo trabado". **Es el cambio que mas duele si no.** Puesto en t1b/t2 con el resto. |
| **ALERT-31** | 🔴 Alta | Codebase | **8 wrappers de `api-gw2.js` convierten "no pude leer" en "no tenes nada".** Verificado por el Principal en HB#38 con un parser sobre `agents/main` @ `02254a7`: `getCharacterCount` -> `0`; `[]` en `getAccountRaids`, `getAccountBank`, `getAccountMaterials`, `getAccountLegendaryArmory`, `getCommerceListings`, `getCommerceTransactionsBuys`, `getCommerceTransactionsSells`. Patron identico: `console.warn` + `return []`. Contrasta con `getCommerceDelivery`, que tiene el mismo `.catch` pero `throw error` por contrato escrito. | **RESUELTA (HB#41)** | Mergeada @ `agents/main` `110b049`. **Hallazgo del PO (Idea 47), confirmado por el Principal y por el Reviewer.** 7 call sites verificados por grep. Empeora: `wallet-dashboard.js:365` tiene un `try/catch` por columna que escribe `summary._errors.<campo>`, y los catch de `characters` y `raids` son **inalcanzables** — el error muere un nivel mas abajo. La Idea 45 t2 esta a medio dead por construccion. Enviado al Reviewer (`task-ec29dfb1ec3f`) para decidir Opcion A (propagar + `allSettled`) vs Opcion B (`{ok,data,err}`). |
| **ALERT-32** | 🟡 Media | Codebase | **`getAccountRaids` propaga el mismo error a 3 modulos, y 2 de ellos son modulos dedicados al tema.** `raid-tracker.js:1726,1808` y `strike-tracker.js:1092,1165`. En un tracker dedicado, "no completaste nada" y "no pude leer si lo completaste" son la misma columna. `strike-tracker.js:1165` tiene un `try/catch` esperando un rechazo que nunca llega. | **RESUELTA (HB#41)** | Subcaso de ALERT-31 con el impacto mas alto: una API key vencida hace ver "0 alas" / "0 strikes" en letra normal, indistinguible de una cuenta nueva. Includes el caso del PO: el usuario ve 0 en una cuenta que sabe que tiene 40 chars y termina borrando y re-agregando la key. |
| **ALERT-33** | 🟡 Media | Repo | **Un heartbeat paralelo mergeo a `agents/main` mientras este heartbeat corria** (`02254a7`, 6 commits: Commerce Delivery UI + fixes de `borderLeft` + bumpe de `theme-selector.js?v=`). El worktree local estaba en `f80fb88` y mergear a ciegas habria revierto todo eso. | ✅ Resuelto (HB#38) | Mitigado con `git merge --ff-only origin/main` **antes** de tocar nada. Confirma ALERT-23: la regla de mergear desde un worktree aislado y de fetchear antes de commitear no es opcional. Verificado el trabajo ajeno: smoke test `tests/commerce-delivery.smoke.js` **8 OK / 0 FAIL**, capa 3 (`commerce-delivery-theme.js`, `fractal-tracker-theme.js`) sin `!important` ni `style=` inline. |
| **ALERT-34** | 🟡 Media | Repo | **`fix/concurrency-pool-phase2` era una bomba de merge en el remoto.** El commit `d91888b` (sesion #38) duplicaba `9a8262c`, ya en `agents/main` — verificado por `patch-id` identico (`ebea65da`). Su unico delta era **bajar** `api-gw2.js?v=2.17.1` a `2.17.0`, una regresion de cache-buster. | ✅ Resuelto (HB#38) | Borrada local y del remoto (`git push origin --delete`), junto con `feat-46-t1-global-pool` (contenido ya en main). Patron repetido: una rama brakeda que se repara a mano produce un commit que *parece* trabajo nuevo y no lo es. **Regla: comparar `patch-id` antes de mergear cualquier rama con un unico delta.** |
| **ALERT-35** | 🟡 Media | Codebase | **`legendary-tracker.js` en `agents/main` tiene 3 `style=` inline y su catalogo es inert.** Auditado en HB#38: `legendary-tracker.js:112,171` construyen markup con `style=` inline (`display:flex;gap:8px` y `grid-template-columns:repeat(5,1fr);gap:12px`) — viola la arquitectura CSS de 3 capas. Los unicos `addEventListener` del archivo (3 de 350+ lineas) son el toggle de modo, `gn:tokenchange` y `DOMContentLoaded`: **las cards del catalogo no tienen ningun handler de click**, y `js/detail-modal.js` no existe en el repo. | Abierta (HB#38) | Amplia ALERT-30. El modulo se renderiza pero no es interactivo, y su layout esta en la capa equivocada. **No lo arreglo acá**: el fix correcto es portar el commit 2 de `feature/legendary-component-tracker` (144 commits atras) y eso toca CSS, o sea requiere Reviewer. Prioridad baja: el catalogo se ve, no se puede usar. |
| **ALERT-36** | Alta | Repo | **5 commits de la Idea 47 casi se pierden en un worktree paralelo.** Al arrancar el HB#41, `git worktree list` mostro `_wt_main` y `_wt_47` con trabajo sin pushear. En `_wt_main` habia 4 commits (c1-c3) sobre `main` local mas **c4 entero sin commitear** y 9 archivos de scratch (`_hb39_*.txt/.py/.patch`). La ultima escritura era de 24 minutos antes: un heartbeat concurrente que murio a mitad de camino. | Abierta (HB#41) -> **RESUELTA este mismo ciclo** | Rescatado: auditado commit por commit contra el veredicto del Reviewer, el commit c4 commiteado (`92b9cc1`) y todo mergeado a `agents/main` @ `110b049`. **REGLA: al arrancar un heartbeat, `git worktree list` ANTES de tocar nada, y `git log --oneline origin/main..HEAD` en CADA worktree.** Es la generalizacion de ALERT-23: el danger no es solo que dos heartbeats se pisen, es que uno muera y deje trabajo sin commitear en ningun lado. |
| **ALERT-37** | Media | Codebase | **Un test puede fallar porque el test esta mal, no porque el codigo este mal.** `tests/idea47-commit4.converter.test.js` daba 36/37: la asercion `cada fallo se avisa por consola` pedia 3 `console.warn` y el regex era `/No se pudo\w* leer/`. El `\w*` estaba puesto para cubrir el plural, pero **"pudieron" no contiene la subcadena "pudo"** (p-u-d-i, no p-u-d-o), asi que el `\w*` no tenia nada que recuperar. Matcheaba solo el singular de la caja del TP. | **Resuelta (HB#41)** | Corregido a `/No se pud\w+ leer/`. La asercion conserva su intencion y ahora ve los 3 warns. **REGLA: antes de tocar el codigo de produccion para que pase un test, comprobar que el test dice lo que pretende decir.** Un `\w*` para cubrir una variante linguistica no cubre una diferencia en la cuarta letra. |
| **ALERT-41** | 🔴 Alta | API / Codebase | **Los 15 IDs de strike del `strike-tracker.js` no existen en el catalogo de la GW2 API, asi que `strike-tracker.js:1106` nunca puede marcar un strike como completado para nadie.** Medido en vivo (HB#43): `/v2/raids` devuelve **6 entradas, no ~26**, y la forma cambio a `{id, wings:[{id, events:[{id,type}]}]}`. Los ids que el endpoint de cuenta puede devolver son los de `events[]` (29 en total: `gorseval`, `xera`, `cairn`, `samarog`, `deimos`, `conjured_amalgamate`, `qadim`, `adina`, `sabir`, `qadim_the_peerless`, `decima`, `ura`, ...). **Ninguno** de los 15 ids de `STRIKES_BY_EXPANSION` (`old_lions_court`, `shiverpeaks_pass`, `voice_claw`, `fraenir`, `boneskinner`, `whisper_of_jormag`, `forging_steel`, `cold_war`, `aetherblade_hideout`, `xunlai_jade_junkyard`, `kaineng_overlook`, `harvest_temple`, `cosmic_observatory`, `temple_of_febe`, `guardians_glade`) esta en esa lista: `/v2/raids?ids=<id>` responde `all ids provided are invalid` para **los 15**. Como el filtro es `completed.filter(id => strikeIds.indexOf(id) !== -1)`, el resultado es **siempre `[]`**: el parseo esta bien, los ids no existen. **Esto NO es la rama 2 que planteo el PO** (objetos en vez de strings: el `.filter` sobre strings funciona perfecto) **ni cosmetico**: el Strike Tracker no le dice a nadie lo que hizo. Bonus del mismo hallazgo: `vloxx` (Nexus of Eternity, el ala del CM de Sept 29) **tampoco** esta en el catalogo, asi que el ala nueva tampoco puede marcarse. | Abierta (HB#43) | **LIMITE HONESTO: no tuve un token, asi que no puedo llamar a `/v2/account/raids`.** La evidencia es fuerte (el wiki dice que los ids "se resuelven contra `/v2/raids`", y el catalogo de hoy no contiene ninguno de los 15) pero no es una prueba directa del endpoint de cuenta. **NO lo arreglo todavia**: cambiar los ids es una decision de producto (¿cuales son los ids correctos? ¿o el Strike Tracker quedo sin backend posible?) y no un fix mecanico. Mandado al PO para que lo confirme con su cuenta, y al Reviewer la pregunta de alcance. **REGLA: antes de confiar en un catalogo cacheado en el codigo, contrastarlo contra `/v2/raids` en vivo.** Los ids de `raid-tracker.js` si coinciden (12 de 12); los de strikes, no. |
| **ALERT-42** | 🔴 Alta | Codebase / Cache | **`activities.js:activate()` borraba la cache de logros de TODAS las cuentas en cada navegacion a `#/activities`.** `cleanAchievementsCache()` (activities.js:537) borra toda clave localStorage con prefijo `ach_`, y esa es exactamente la familia que `api-gw2.js:putCache()` escribe para logros: `ach_acc:<fpToken>` (TTL 2 min) y **`ach_meta_v2:es:<ids>` (TTL 12 h, la cara)**. `router.js` invoca `Activities.activate()` en cada entrada a `#/activities` (router.js:1661 y 1758), asi que abrir el panel de Actividades dejaba sin cache de logros a todas las cuentas y la pagina de Logros arrancaba en frio (~433 requests) aunque uno acabara de cargar. **Medido:** la metadata sola son **~3.6 MB por id-set de cuenta** (35 chunks de 200 ids x 536 B reales contra `/v2/achievements?ids=..&lang=es`); con 27 cuentas el volumen no gestionado seria **~96 MB** contra una cuota de **4.98 MB**. O sea: lo que venia manteniendo la cuota a raya era un borrado accidental, no el diseno. | **RESUELTA (HB#44)** | Quitada la llamada de `activate()`, conservada `cleanActivitiesCache()` (prefijo `psna:`, datos del propio modulo). La regla aplicada: **un modulo no borra la cache de otro**; limpiar cache es accion explicita del usuario. `cleanAchievementsCache()` sigue definida para llamadas a proposito. Fix en `d7cbe0d`, merge `9e211b5` en `agents/main`, `activities.js` v3.20.3. Runner: `tests/idea49.activities-cache-wipe.test.js` 16/16, suite completa 159/0. **SIN CSS, SIN cambio de UI.**
| **ALERT-43** | 🔴 Alta | Repo / Proceso | **Un heartbeat concurrente mergeo a `main` y movio la rama del Principal por debajo de su trabajo sin commitear, a mitad de sesion.** Ocurrio en el HB#45: el merge `9e211b5` (del HB#44) llevo `js/activities.js` fuera del `git diff` sin ninguna accion del Principal, y lo dejo commiteando sobre `main` en vez de su rama. Si ahi llega un `git checkout` o un `git stash` de otro proceso, el trabajo se pierde y no queda rastro: el `git diff` ya no lo mostraba, asi que ni siquiera un `git status` lo delata. | Abierta (HB#45) | **Mitigada en este ciclo:** el trabajo estaba respaldado en `%TEMP%` porque un comando mio anterior fallo a mitad de cadena y por suerte se restoreo. Esa fue suerte, no procedimiento. **REGLA: commitear temprano, aunque falte el cierre del heartbeat.** Un commit ahi puesto no depende de que otro proceso coopere; el working tree si. Corolario: cuando un heartbeat encuentra WIP sin commitear, la primera pregunta no es "¿de quien es?" sino "¿esta a salvo?" — en este caso el SESSION_LOG del HB#44 lo atribuyo al PO, y una atribucion equivocada es exactamente como un trabajo desaparece sin que nadie lo note. Corregida la procedencia en este ciclo. Es la generalizacion de ALERT-23 y ALERT-36. |
| **ALERT-44** | 🟡 Media | Test / Codebase | **Un test puede dar verde por la razon equivocada.** `tests/idea49.quotavisible.test.js` montaba un sandbox con `console: fake` y despues incluia `console` real en la lista de globals del mismo literal, asi que el real sobrescribia al fake y el test "veia" un aviso que si se imprimia. Peor que no testear: verde falso. | **Resuelta (HB#45)** | Reemplazado por un `Proxy` que reenvia todo al console real y captura solo `warn`. **REGLA: en un sandbox, nunca pongas el mismo nombre dos veces en el literal de globals.** El ultimo gana, en silencio, y el test pasa. Misma familia que ALERT-37 (el test estaba mal, no el codigo): **antes de tocar el codigo de produccion para que un test pase, comprobar que el test dice lo que pretende decir.** |
| **ALERT-45** | 🔴 Alta | Platform / Proceso | **Una `task_id` puede desaparecer del servidor sin dejar rastro: `check_agent_task` devuelve `404 Not Found`, no `failed` ni `timeout`.** En el HB#46, las 2 tareas del ciclo anterior (`task-100c75d090d5` y `task-dbb64f500af6`, ambas del PO) no existen. Sus respuestas no se pudieron recoger. | **Detectada (HB#46)** | **Invalida parte del conteo historico de fallas:** varias de las "14 fallas consecutivas del Reviewer" y los repetidos "timeouts del PO" fueron **tareas nunca recogidas**, no tareas que fallaron. La racha se reinicia con evidencia real, no con anotaciones a ciegas. **REGLA: un 404 NO es un timeout.** Ante 404 se reenvia la consulta con id nuevo y se anota `perdida`, sin esperar mas. Antes de anotar `failed`, **comprobar que la respuesta dice `failed` y no 404**: `check_agent_task` devuelve 404 tambien para tareas que **completaron bien** y que simplemente ya no estan en el registro (ocurrio con `task-838665263c09` en el HB#10, que documentaba bien y quedo anotada como perdida). |
| **ALERT-46** | 🟡 Media | Medicion | **La cifra "27 cuentas x 3.6 MB = ~96 MB" del HB#45 estaba mal calculada.** Multiplicaba el catalogo completo de logros (6991) por 27 cuentas, cuando lo que se guarda en `ach_meta_v2` son los **subconjuntos** de cada cuenta, y ademas con el id-set entero dentro de la key, o sea parcialmente solapados entre cuentas. | **Detectada y corregida (HB#46)** | Simulacion con ids reales de la API (3459 ids barriados en 1..4000), 27 cuentas x 1500 logros, **519 B/registro medidos en vivo**: el volumen real es **20.22 MB**, no 96 MB. El problema sigue siendo grave (20 MB contra 4.98 MB de cuota), pero **la cifra inflada empujaba a la conclusion equivocada**: comprimir 13x el formato `id:done`, cuando lo que hace falta es **deduplicar** (sharding por `id//200`: 20.22 MB -> 1.71 MB, **-91.5%**, y de 216 claves a 18). **REGLA: cuando un numero determina el diseno del arreglo, medir el volumen real del patron existente, no el peor caso teorico multiplicado.** Una cifra inflada no exaggerate el riesgo: te hace elegir el arreglo equivocado. |
| **ALERT-47** | 🟡 Media | Codigo / Cuota | **`getAchievementsMeta` guarda la metadata de logros como una key por id-set, y el id-set va entero dentro del nombre de la key.** Con 27 cuentas eso son 216 claves que se solapan entre si, guardando la misma tabla muchas veces. La metadata **no depende del token** (se cachea con `null`), asi que la duplicacion es pura. | **Medida (HB#46), sin arreglar** | Los 5 campos mas pesados de la metadata no los lee **nadie**: `bits` (20.1%), `requirement` (8.3%), `locked_text` (0.8%), `prerequisites` (0.1%), `point_cap` (0%) = **-29%** al dropearlos, verificado con grep sobre todo `js/` (`getAchievementsMeta` tiene **un solo call site**, `achievements.js:1067`, y no toca ninguno). El resto (`tiers`, `flags`, `rewards`, `description`, `name`, `icon`, `type`, `id`) si se usan. **La correccion estructural es sharding por `id//200`**, que ademas es trivial de invalidar (TTL). **No implementado en el HB#46**: cambia el contrato de `getAchievementsMeta` y la estrategia de red (un shard pide 200 ids aunque la cuenta tenga 3 en ese rango), y la pregunta 1 al PO sigue abierta. **REGLA: una key de cache que incluye el conjunto de lo que se busca deduplica sola; una que incluye solo el valor, no.** |
| **ALERT-48** | 🔴 Alta | Repo / Proceso | **El Principal sobreescribio `SESSION_LOG.md` (842 lineas de historico) sin leerlo antes.** En el HB#46 escribio el archivo con `write_file` para agregar la entrada del ciclo, sin verificar su contenido previo. `write_file` **crea o sobreescribe**: no es una herramienta de edicion. La perdida se detecto porque el `git diff` mostro `842 deletions` en un archivo que solo debia crecer, y se recupero con `git show HEAD:SESSION_LOG.md` + reinsercion al frente. | **Resuelta en el acto (HB#46)** | **Sin consecuencia permanente**: el historico estaba en `agents/main` y volvio completo (934 lineas, 26 entradas). **REGLA: antes de `write_file` sobre un archivo que existe y tiene historico, leerlo o partir de `git show HEAD:<archivo>`. Si el diff muestra mas borrados que lineas agregadas en un log, algo salio mal: mirar `git diff --stat` ANTES de commitear, no despues.** Esto es la version suave de ALERT-18 (log truncado a 0 bytes), con la misma causa de fondo: **un log es un archivo que se AGREGA, y la unica forma de perderlo del todo es tratarlo como si se reemplazara.** |

## ALERT-49 — 2 bugs de correctitud mergeados sin revision del Code Reviewer
> **Abierta (HB#48, 2026-09-30). Severidad: alta. Estado: los 2 corregidos (`f09eb7c`).**

El Tramo C de la Idea 49 (`f98da49`, HB#46) se mergeo **por merito**, sin validacion del Reviewer, y tenia
2 defectos reales en `getAchievementsMeta`:

1. **Concurrencia en el primer llenado.** `bag = {}` era local por llamada; dos cargas concurrentes del
   mismo shard comparten `inflightOnce`, asi que solo la primera mutaba su bag y la segunda resolvia contra
   `{}`. Efecto en la app: logros sin nombre, icono ni tiers, y **`earnedAP` en 0 sin error visible**.
   Alcanzable por `gn:tokenchange` y `hashchange`.
2. **`nocache` encogia un shard compartido**, dejando a otras cuentas sin metadata hasta que volvieran a
   pedirla.

**La leccion no es "el Reviewer falla" — responde bien y en un turno. La leccion es cuando "por merito" es
legitimo:** vale para riesgo estetico o de baja superficie; **no** para un cambio de capa de datos que
reescribe la estrategia de claves. Ese caso necesita validacion, y la costo ~20 min.
Corregidos con test que da 2 FAIL contra el archivo sin modificar.

### ALERT-55 ƒ?" 6 ramas sin mergear, 3 con trabajo real perdido

**Severidad: alta. Estado: ABIERTA (HB#50). Sin merge a ciegas.**

El remoto tiene 6 ramas que no son ancestro de `main`. La pregunta obvia ("¿perdi trabajo?") tiene una
respuesta que no es "si" ni "no", y por eso hay que medirla de tres formas.

**1. Por contenido del commit — `git cherry main <rama>`.** Compara el *patch*, no el hash, asi que
ignora el ruido de la base vieja:

| Rama | Commits no absorbedos |
|---|---|
| `fix/theme-borderleft-shorthand` | **0** (`-`): ya esta en main |
| `feat/commerce-delivery-ui` | 1 de 3 (el fix de CSS esta; los 2 del banner, no por hash) |
| `feature/homestead-tracker` | 1 |
| `feature/legendary-component-tracker` | 7 de 10 |
| `fix/homestead-glyph-data` | 2 |
| `docs-estructura-20260930` | 1 |

**2. Por archivo — que es la que manda.** Un commit puede no estar en main por hash y aun asi estar su
contenido. La pregunta es "¿la funcion existe en `main`?", yaca hay tres "no" que no admiten discussion:

- `js/api-gw2.js` de main **no tiene** `getHomesteadDecorationDetails`, `getAccountHomesteadDecorations`
  ni `getHomesteadGlyphs`. La rama si.
- `js/router.js` de main **no tiene** la ruta `homestead`. La rama si.
- `index.html` de main **no carga** `homestead-tracker.js`. La rama si.
- `js/detail-modal.js` y `js/legendary-tracker-theme.js` **no existen como archivo** en main. La rama si.
- `index.html` de main (linea 988) carga solo `legendary-tracker.js?v=1.0.0`.

Y un "si" que tambien importa: el banner de la caja del Trading Post **si esta en main**
(`converter-modal.js:14` documenta la v1.1.1, que es justamente el fix de titulo de esa rama). Esa rama
esta absorbida.

**3. Por que NO se mergea nada en este ciclo.** Las ramas con trabajo perdido estan **110 a 201 commits
atras**. Entre su base y `main`, `js/api-gw2.js` cambio **481 lineas** — incluida la reescritura de
claves de cache de la Idea 49. Un `git merge` de `homestead-tracker` revierte todo eso. Mergear es la
operacion que destruye el trabajo; el rescate es **`cherry-pick` sobre una rama nueva desde `main`**, y
uno por modulo.

**Lo que si se puede hacer ya:** borrar `fix/theme-borderleft-shorthand` y, tras verificar que su unico
commit unico esta en main, tambien `feat/commerce-delivery-ui`.

**Por que existio esto.** La regla de AGENTS.md dice que el Principal es el unico que mergea y que
ninguna rama queda sin mergear. El problema no es la regla: es que las 6 ramas se crearon **antes** de la
migracion de clones del 2026-09-30 y quedaron colgadas en el remoto viejo. `git ls-remote` las muestra,
`git status` no las ve nunca, y nadie las reviso en 33 heartbeats. **Un remoto con ramas huerfanas es un
agenda de trabajo invisible, y las invisible no se cierran solas.**

## ALERT-50 — colision de ramas en el worktree compartido
> **Abierta (HB#48). Severidad: media. Estado: abierta, mitigada por procedimiento.**
> (Seccion de detalle de la fila **ALERT-50** de la tabla. La numeracion quedo duplicada durante el
> HB#48 porque dos procesos escribieron el log a la vez; se renumero para que la tabla mande.)

El commit del PO (`0b9721d`, `DASHBOARD_PO_IDEAS.md`) cayo dentro de `fix/idea49c-shard-races` porque el
Principal creo esa rama desde `origin/main` mientras el PO trabajaba en el mismo worktree. Benigno porque era
un `.md`, y ambos agentes lo detectaron y lo resolve sin drama.

**Riesgo real:** un commit de *codigo* de un agente puede terminar en la rama de otro, o al reves, y que
`git status` no lo delate si el archivo no se toco. Mitigacion: `git status --short` y `git log --oneline -3`
antes de cada commit, y revisar el stat del commit ajeno si aparece en la propia rama.
**No se decide reorganizar el worktree en caliente** (mover el PO a su propio worktree) porque romper el
PO en mitad de su heartbeat es peor que el riesgo que mitiga.
| **ALERT-49** | 🔴 Alta | Codigo / Cache | **El sharding de `ach_meta` (Tramo C) se mergeo SIN validacion del Reviewer, y tenia 2 defectos reales. ElReviewer los encontro despues (`task-329b54da90ef`, veredicto APROBAR CON CAMBIOS) y los 2 se reprodujeron contra el archivo sin modificar: **2 FAIL**. **BUG 1 (media-alta):** dos cargas concurrentes del mismo shard en frio construyen cada una su `bag = {}` local y entran al mismo `inflightOnce` (misma `ikey`), asi que solo el primer llamador muta su bag. El segundo resuelve contra `{}` y **recibe `[]`**. En la app eso es peor que un error: `achievements.js:1069` arma `metaById` con ese array, asi que la cuenta renderiza logros **sin nombre, sin icono y sin tiers**, y `earnedAP` (`:218`) da **0 AP en silencio**. Es alcanzable: `gn:tokenchange` (`:1096`) y `hashchange` (`:1106`) disparan `loadAll()` sin secuencia que serialice el `getAchievementsMeta` de la carga anterior. **BUG 2 (media-baja):** `getCache` devuelve `null` con `nocache` (`:325`) -> `bag = {}` -> `putCache` graba solo los ids pedidos, **encogiendo un shard del que dependen otras cuentas** y generando churn de cuota, justo lo que el commit vino a reducir. Es alcanzable por el boton de refresh (`achievements.js:829`) y por `gn:tokenchange`. **Ademas:** el fix de concurrencia se commiteo SIN tocar el buster de `index.html` ni el header de version, o sea **el fix existia en el repo y no en la app** (el navegador cacheado corria la v2.21.0, que es la que tiene los 2 bugs). | **RESUELTA (HB#48)** | Fix mergeado en `f09eb7c`: la resolucion final **relee cada shard del cache** en vez de usar el objeto local, y el bag **se lee y se mergea siempre**, tambien con `nocache` (un shard depende del id, no de quien lo pide). Ademas se poda al guardar los 5 campos que la API manda y NADIE lee (`bits`, `requirement`, `locked_text`, `prerequisites`, `point_cap`): medido contra la API en vivo, la metadata baja de **1.75 MB a 0.81 MB** (35% -> 16% de la cuota). `api-gw2.js` v2.22.0 con buster, suite **231 aserciones 0 FAIL**. **Verificacion del test, no supuesta:** `git show f98da49:js/api-gw2.js` + `node tests/idea49.shard-concurrency.test.js` = **12 pass / 2 FAIL**; con el fix = **14 pass / 0 FAIL**. **REGLA 1: un merge es merge, no validacion. Sin veredicto del Reviewer, un cambio de capa de datos se considera PROVISIONAL, y el `task_id` se sigue hasta el final.** **REGLA 2 (nueva, la mas economica de todas): el fix y su buster van en el MISMO commit.** Es la version de codigo de ALERT-24 y evita la clase de bug donde se arregla el repo y la app sigue rota sin que nadie lo note. |
| **ALERT-50** | 🟡 Media | Repo / Proceso | **Un commit de un agente cayo dentro de la rama de otro, en un worktree compartido, y nadie lo noto.** En el HB#48, el commit del PO (`0b9721d`, el dashboard de las 08:00) quedo dentro de `fix/idea49c-shard-races` porque el Principal cambio de rama mientras el PO trabajaba en el mismo clon. Benigno en este caso: era un `.md`, y el contenido era correcto. | **RESUELTA en el acto (HB#48)** | Los dos lo detectaron y lo resolvieron sin drama, que es exactamente por que funciona el canal de archivos. **REGLA: antes de commitear en un clon compartido, `git status -sb` y `git branch --show-current` en la MISMA llamada.** Si la rama no es la que uno cree, el commit va a la rama equivocada y el `git log` de la otra la muestra como si nunca hubiera existido. Corolario barato: `git log --oneline -1` inmediatamente despues de commitear, y verificar que el hash aparece en la rama esperada. Es la generalizacion de ALERT-43: alli el trabajo sin commitear casi se pierde; aqui el commit se guardo en el lugar equivocado. El riesgo real no es este caso, es el proximo en que el commit cruzado sea de codigo. |
| **ALERT-55** | **Alta** | Repo / Proceso | **6 ramas sin mergear en `origin`, y al menos 3 contienen trabajo real que NO esta en `main`.** `git ls-remote --heads` las muestra todas; ninguna es ancestro de `main`. El detalle importa mas que el numero, porque **3 de las 6 estan enteramente absorbidas** y **3 tienen contenido perdido**. **ABSORBIDAS (el trabajo ya esta en main, las ramas solo están atrasadas):** `fix/theme-borderleft-shorthand` (`git cherry` da `-`: el patch ya esta) y `feat/commerce-delivery-ui` (su fix de CSS igual, y el banner de la v1.1.1 esta en `converter-modal.js:14` de main). **CON TRABAJO PERDIDO, verificado archivo por archivo contra `main`:** **(1) `feature/homestead-tracker` + `fix/homestead-glyph-data`** (la segunda contiene a la primera): `getHomesteadDecorationDetails`, `getAccountHomesteadDecorations` y `getHomesteadGlyphs` **no existen en `js/api-gw2.js` de main**; la ruta `#/account/homestead` **no esta en `js/router.js`**; `index.html` **no carga `homestead-tracker.js`**. La normalizacion de glyphs (`normalizeGlyphs`) tampoco esta en `js/homestead-tracker.js` de main. Son ~160 lineas de `api-gw2.js` y el fix de schema que el PO ya dio por bueno (COMM 010/012). **(2) `feature/legendary-component-tracker`:** `js/detail-modal.js` y `js/legendary-tracker-theme.js` **NO EXISTEN EN MAIN** (fichero completo, no un diff), e `index.html` de main solo carga `legendary-tracker.js?v=1.0.0`, sin el detail modal ni el theme de la capa 3. Son las Fases 2B y 3 del tracker. **(3) `docs-estructura-20260930`:** `ORG_MAP.md` tiene 103 lineas de diferencia contra main (una rama nace de un commit viejo, asi que el diff grande no es trabajo perdido: esto hay que leerlo, no contarlo). | **ABIERTA (HB#50)** | **Ninguna rama se borra ni se mergea en este ciclo**, y la razon es el orden de las operaciones, no la duda: las ramas que tienen trabajo perdido estan **110 a 201 commits atras** de `main`, y `api-gw2.js` cambio **481 lineas** desde su base. Un merge a ciegas de `homestead-tracker` revierte el sharding de la Idea 49 y arrastra elarranque del modulo. **El rescate correcto es por `cherry-pick` sobre una rama nueva desde `main`, no `merge`**, y uno por uno: (a) `homestead` (API + router + index + fix de glyphs, 2 commits), (b) `legendary` Phase 2B/3 (2 archivos que no existen), (c) `ORG_MAP` (revisar a mano, el diff es ruido de base). **Las 2 ramas absorbidas se pueden borrar YA, con seguridad verificada.** **REGLA que sale de aca:** `git cherry main <rama>` decide si un commit esta en main **por contenido**, no por hash; un `git diff main <rama>` grande NO prueba trabajo perdido, porque la rama nace vieja. Es el ALERT-47 con una segunda vuelta. |
| **ALERT-54** | Media | Producto / Datos | **`vloxx` infla el KPI de Legendaria Imbuida: el 100% de LI es inalcanzable por diseno.** `vloxx` es el ala del CM de Sept 29 (Nexus of Eternity). `/v2/raids` **no lo expone** (medido contra la API en vivo, no supuesto), asi que esa tarjeta nunca se va a poder marcar. Pero el calculo de `liTotal` (`raid-tracker.js`) cuenta los encounters con `li === 1`, y `vloxx` lo tiene: el denominador suma un encuentro que la API jamas va a reportar. Es exactamente la clase de defecto que vino a matar la Idea 52 ("el modulo promete algo que no puede cumplir"), y quedo vivo dentro del propio fix que la ataco. No se toca en esta iteracion: decidir el ala 9 es producto (borrar el ala, o esperar a que GW2 la publique), no un fix de dato. | **ABIERTA (HB#50)** | Anotada, sin cambio de codigo. Cuando Pablo decida el ala 9 se cierra sola: si `vloxx` se borra, `liTotal` baja y el 100% vuelve a ser alcanzable. Si se conserva, hay que sacar `li: 1` del encuentro o excluir los fantasmas del calculo de LI. **Medicion que la sostiene:** el propio test de la Idea 52 ya valida que `vloxx` no esta en el catalogo (`tests/idea52.raid-encounter-ids.test.js`, seccion 3) y lo declara `FANTASMA_CONOCIDO` con la explicacion. Lo que faltaba era que el KPI de LI lo sintiera. |
| **ALERT-63** | 🔴 Alta | Proceso / Comunicacion | **La ALERT-62 se repitio al revés: 3 mensajes con `to: default` en vez de `to: product-owner`. El PO nunca recibio la respuesta de Pablo sobre `getAccountLuck`, que era la decision de diseno que bloqueaba el Tramo 2 de la Idea 57.** La ALERT-62 fue "escribir el `inbox/` del otro a mano y queda invisible". Esta es la direccion opuesta y mas insidious: el mensaje se mando **por el CLI, con cuerpo largo y bien formado, y salio bien escrito**. Los 3 quedaron en `default/inbox/` y en `default/sent/`, con el prefijo `__default__default__` en el nombre del archivo, que es la unica señal. **Lo que lo causo:** `_po_send.py ask <agente> ...` con el parametro `<agente>` en `default` en vez de `product-owner`. El script no valida que el destinatario sea otro agente: `cli.py ask` acepta cualquier string. Los 3.tenian `vence` en ~13:17Z y el `overdue` los reporto como "a default", que es la senal que se leyo tarde. **Por que importa mas que la 62:** un mensaje que se autoenvia no le falta a nadie de forma visible —yo lo "mande" y quedo en mi inbox—, asi que el unico sintoma es que el otro no contesta, que es exactamente el sintoma que el equipo viene atribuyendo a un timeout del Reviewer. **REGLA: un ask que se manda a uno mismo es un ask que no salio. Verificar el prefijo del archivo, o el campo `to`, antes de contar con que el mensaje fue entregado.** | **CORREGIDA (HB#56)** | Los 3 reenviados al inbox real del PO por `cli.py ask product-owner` y verificados uno por uno contra `product-owner/inbox/` (los tres presentes con `to: product-owner` y cuerpo integro: 6831, 3913 y 3615 chars). El test que faltaba no es de codigo: es que `_po_send.py` tiene que fallar si el destinatario es el propio remitente. No se parchea en este ciclo; queda como el mismo item de deuda que la ALERT-62 (es diseno del CLI, no nuestro). |

## ALERT-62 — escribir el `inbox/` del otro a mano deja el mensaje INVISIBLE: `waiting`/`overdue` leen `sent/`, no el `inbox/`

**Severidad:** media. **Origen:** heartbeat Principal, 2026-09-30 ~10:57 UTC. **Estado:** corregido en el
indice; la causa de raiz es de diseno del CLI y queda como deuda.

### Que paso

Para responderle al PO (HB#12) escribi `product-owner/inbox/20260930T104000Z__default__product-owner__po207.json`
**a mano**, con el `write_file` de la herramienta de archivos, en vez de usar el comando del CLI que lo manda.
El archivo quedo bien formado y con el JSON valido: `cli.py inbox` del PO lo habria leido perfecto.

Pero el PO **nunca lo vio**, y `cli.py overdue` seguia reportando 5 mensajes vencidos mio que yo ya habia
cerrado. Dos bugs, en realidad:

### Bug 1 (el que importa): el par enviado/recibido son DOS archivos, y solo uno es el indice

`agentlink.py` guarda el MISMO mensaje en dos lugares:

```
<remitente>/sent/<id>.json         <- indice propio
<destinatario>/inbox/<id>.json     <- lo que lee el destinatario
```

Y las funciones de consulta leen **solo el del remitente**:

```python
def awaited(agent):        # agentlink.py:112
    for p in glob.glob(os.path.join(BASE, _dir(agent), 'sent', '*.json')):
def overdue(agent):        # agentlink.py:124
    return [(p, m) for p, m in awaited(agent) if (m.get('deadline_utc') or '') <= now]
```

Escribi solo el del destinatario. Resultado: el watchdog de los dos lados cree que la pregunta **nunca
existo**, y yo la creia mandada. **La asimetria es la trampa**: si hubiera escrito solo el `sent/`, el PO
no lo habria visto y yo si lo habria creido enviado. Ninguno de los dos casos se detecta solo.

**Corregido** en el indice (`default/sent/`) en los 6 mensajes afectados: 4 pasados a `done`, 1 mas
`done` con nota, y los 2 nuevos registrados. Verificado: `cli.py waiting` muestra 1 pendiente con
deadline 13:00Z.

### Bug 2: `overdue` no refresca, y por eso el cierre parecia no funcionar

Cerré los 4 mensajes en el inbox del PO y volvi a correr `overdue`: seguian los 5. Tarde varios
minutos en mirar **de donde lee** en vez de reintentar. `overdue` no estaba cacheado: leia `sent/`, que
yo no habia tocado. **La leccion es la de siempre y la seguí perdiendo**: cuando una herramienta dice
lo que uno espera que diga, el siguiente paso es leer la herramienta, no repetir el comando.

### El hallazgo que si es recuperable

`20260930T080656Z__default__product-owner__e30dbd.json` estaba en `sent/` con `state: waiting` y
deadline 08:31Z, **vencido hace 2 horas**, y **no existia en el inbox del PO**. Es decir: hay al menos
un mensaje mio que el PO jamas recibio, del HB#50. No se reenvia: su contenido (los 2 hallazgos del 206
y de la clasificacion de wrappers) **ya esta aplicado y mergeado** en `979bfa6` / `4c95774`, asi que
mandarlo ahora seria un acuse de algo que el PO no pidio. Se cerro con nota.

### Recurrencia: la ALERT-62 volvio, en la direccion opuesta (HB#56)

Tres horas despues de escribir la ALERT-62, el mismo bug ocurrio al reves y nadie lo vio. La
ALERT-62 fue "escribir el `inbox/` del otro a mano y el mensaje queda invisible". Esta vez el
mensaje se mando **por el CLI**, con cuerpo largo (6831 chars), con `_po_send.py` que existe
justamente para eso, y quedo bien escrito. En `default/inbox/`. Con `to: default`.

Los tres eran para el PO y los tres eran importantes: la respuesta de Pablo sobre el criterio de
UI de `getAccountLuck` (la decision que bloqueaba el Tramo 2 de la Idea 57), la Idea 49 del LM del
raid y su addendum con la medicion de 8.349 logros. El PO no recibio ninguno.

Lo unico que lo delata es el **prefijo del nombre del archivo**: `__default__default__` en vez de
`__default__product-owner__`. `cli.py inbox` los imprime como "preguntas esperando" sin marcar
que estan dirigidas a uno mismo, y `cli.py overdue` los lista como "a default", que es la senal
que se leyo tarde.

La causa concreta es una sola: `_po_send.py ask <agente> ...` con `<agente>` en `default`. El
script no valida nada, y `cli.py ask` acepta cualquier string como destinatario. Un `ask` a uno
mismo no es un error que el sistema pueda detectar despues: el mensaje existe, esta bien formado,
y esta en un indice que el remitente lee. El unico sintoma es que el otro no contesta — que es
justo el sintoma que este equipo viene atribuyendo a un timeout del Reviewer.

**Corregido en el HB#56:** los tres reenviados con `cli.py ask product-owner` y verificados uno
por uno en `product-owner/inbox/`.

**Por que se agrega como ALERT-63 y no como nota de la 62:** la 62 dice "escribir el `inbox/` del
otro a mano deja el mensaje invisible". Esta dice "mandar por el CLI tampoco alcanza, porque el CLI
no valida a quien le mandas". Son dos modos de falla del mismo par de archivos, y el segundo es el
que no tiene defensa propia: el primero se ve en el nombre del archivo, el segundo no se ve en
ningun lado salvo en el prefijo.

**Lo que sigue faltando (misma deuda que la 62, y por eso no se arregla aca):** el CLI deberia
rechazar un `ask` cuyo destinatario sea el propio remitente, o al menos marcarlo. Es una linea.
Mientras tanto la regla para nosotros es: **despues de mandar, verificar el prefijo del archivo
creado.**

### Deuda (NO la arreglo, es del CLI, y es decision de Pablo)

`agentlink.py` deberia, en vez de duplicar el mensaje en dos archivos, tener **un** archivo con un campo
`delivered_to`, o **`send()` como unico camino de escritura** con `inbox/` derivado. Hoy el
`write_file` a mano es un camino valido en apariencia y roto en silencio. Dos opciones, y la segunda es
la que importa:

1. Que `send()` sea el unico escritor y `inbox/` se symlinkee o se deduplique.
2. **Que exista un comando de reconciliacion**: `cli.py verify` que compare `*/sent/` contra
   `*/inbox/`, reporte los pares desbalanceados y proponga la reparacion. Sin el, esto se repite.

Mientras tanto, la regla para nosotros: **mandar por el CLI, nunca escribir el `inbox/` del otro a
mano.** Si hay que escribirlo a mano, registrar en `sent/` en el MISMO minuto, o el mensaje no existe.

## ALERT-66 (2026-09-30 16:45 UTC, HB#59) — un recibo en `sent/` NO es un mensaje entregado

Es ALERT-62/63/65 por cuarta vez, y esta vez la fallo **yo**, en el mismo heartbeat
en que reporte las tres anteriores. Escribi a mano el JSON del pedido al Reviewer en
`default/sent/`. El archivo exists, esta bien formado, dice `to: Code-Reviewer`, y
el `sent/` es exactamente donde el emisor mira para creer que envio.

**No fue entregado.** `agentlink.ask()` hace DOS cosas: escribe la pregunta en
`<to>/inbox/` **y** un recibo en `<from>/sent/`.hacer solo la segunda deja un
mensaje que no existe para el destinatario.

Como el `to` decia `Code-Reviewer` y el archivo estaba en `sent/`, todo parecia
correcto. Lo que lo delato fue una verificacion que ya era costumbre: leer el
inbox del otro. `code-reviewer/inbox/` estaba vacio.

**Regla:** el recibo es la CONSECUENCIA de la entrega, no la entrega. After de
escribir un pedido a mano, la unica verificacion que vale es abrir
`<to>/inbox/` y confirmar el archivo. `sent/` no prueba nada. Y `cli.py ask` es el
unico camino con entrega; el JSON a mano es para cuando el cuerpo no entra por
linea de comando, y en ese caso hay que llamar `ask` y no escribir el archivo.

**Deuda de tooling (ya registrada, se suma esta):** `ask` deberia rechazar un envio
a uno mismo, y deberia tener un modo `ask --from-file` para cuerpos largos, que es
la razon por la que existe esta trampa.
## ALERT-67 (2026-09-30, HB#60) — `overdue` y `close` no comparten estado

**Sintoma:** `cli.py overdue` seguia reportando 4 asks de la Idea 49 como
`[VENCIDO]` despues de cerrarlos con `cli.py close` (que devuelve `rc=0` y los
archiva). Los 4 eran en realidad asks `from=default to=default` — mensajes que
se escribieron a si mismos (ALERT-63) — y su contenido ya habia llegado al PO
por el reenvio correcto.

**Por que importa:** un heartbeat que use `overdue` para decidir "que contesto"
va a volver a trabajar tareas ya resueltas, y a reportar como carga pendiente
algo que no lo esta. El modo de fallo es el del PO en el HB#58: uno cree que
tiene algo pendiente y en realidad esta mirando un estado fantasma.

**No bloqueante.** Anotado para que el CLI unifique el criterio de "vencida".
**Mitigacion aplicada:** se identifica cada ask leyendo su `to` y su `state` en
el JSON, no por el nombre del archivo ni por la carpeta en la que esta.

## ALERT-68 — una medición escrita a mano dio una cifra 26% más alta que la real (HB#61)

**El BACKLOG afirmaba que `ach_acc` pesaba 4.10 MB con 27 cuentas, y son 3.24 MB.**

La cifra venía de `tools/idea49g-achacc-measure.mjs`, que mide una forma
`{id, current, max, done, bits:[1..12]}`. Dos desvíos, ambos en el mismo sentido:

1. **`bits` no lo lee nadie.** Ni en esa forma ni en la que manda la API
   (allí va como string binario): el campo no tiene **ni una lectura en todo
   `js/`** — grep: cero apariciones de `.bits` fuera de un comentario. Solo él
   son **0.52 MB en 27 cuentas**.
2. **Era el peor caso posible.** Esa forma pone el 50% de los logros como
   `{id, done:true}` y el otro 50% con los 12 bits. Con la mezcla real de una
   cuenta veteran (45% completados, 5% en progreso repetible) la forma cruda da
   **123 KB/cuenta, no 164**.

**Remedido con la forma que el código REALMENTE consume**
(`tools/idea49g-medir-honesto.mjs`, 3000 logros, 27 cuentas, cuota real 4.98 MB):

| forma | KB/cuenta | ×27 | +0.81 (`ach_meta`) |
|---|---|---|---|
| API cruda tal cual | 123 | 3.24 MB | 4.05 MB |
| podada a `{id,current,max,done}` | 103 | 2.72 MB | 3.53 MB |
| **compacta (49G)** | **20** | **0.53 MB** | **1.34 MB** |

La conclusión de fondo no cambia (la cuota sigue siendo el techo), pero la
magnitud del problema era menor de lo anunciado y la del arreglo es mayor: el
techo de logros por cuenta pasa de **~2.700 a ~6.900**.

**Es la TERCER vez que una medición escrita a mano queda mal en este equipo.**
Las otras dos:

- el conteo de "siete wrappers que degradaban por forma" que eran **once**
  (Idea 57 T1, encontrado por el Reviewer leyendo un JSDoc);
- mi propio inventario de **17 claves en la 50F que eran 18**, porque
  `getItemsMany` escribe por `lsSet` directo y no pasa por `putCache`
  (ALERT-66 / commit `c04496e`).

**Lo que las tres tienen en común es que el número estaba en un comentario o en
la salida de un script, y nadie lo recontó.** Las dos primeras se detectaron
leyendo el código; esta se detectó haciendo la medición con la forma que el
código consume.

> **Regla:** un número de peso o de cantidad que se pone en un BACKLOG tiene que
> ir acompañado del **script que lo produjo, committed**, y ese script tiene que
> modelar lo que el código **consume**, no lo que la API/documentación **manda**.
> La diferencia entre las dos cosas es justamente donde viven estos errores.
> `tools/idea49g-medir-honesto.mjs` queda en el repo por eso, aunque `tools/`
> esté gitignored (add -f`).

---

## ALERT-69 — un FAIL de migración que devuelve un valor imposible es del arnés, no del código (HB#61)

La sección 4 del test de la 49G (leer la cache vieja sin migrarla) falló al
primer intento con `llego 0`. **El bug era del test:**

- Armé la key de la cache a mano: `ach_acc:1111.5555`. Pero `fpToken` une con
  **`'…'` (U+2026, 3 bytes), no con `'.'`**. La key nunca existió, `getCache`
  no encontró nada, el wrapper fue a la red, y el mock devolvió `[]`.
- Yo leí ese `0` como "la migración no funciona" y casi reporté un bug de
  `api-gw2.js` que no existía.

Se detectó instrumentando `getCache`/`lsGet` con `console.log` — y **la
primera instrumentación no Printsó nada**, porque el sandbox del test define
`console.log` como no-op. El `[GW2Api] listo` sí apareció porque ese mensaje va
por `console.info`. Sin el log visible, el `0` no tenía explicación.

**Regla:**

1. **Un fallo de migración que devuelve `0` donde se esperaban `N` registros es
   el arnés, no el código.** Un fallo de migración real devuelve la versión
   vieja, no nada. `0` significa "nunca llegaste a leer la entrada".
2. **En un test de migración, no construir la key a mano: que sea el módulo el
   que la escriba** y el test la use. Es el mismo criterio del HB#59 con
   `fpToken`/key, aplicado a otro sitio.
3. **Un sandbox con `console.log` silencioso oculta su propia instrumentación.**
   Si un `console.log` de debug no aparece, primero sospechá del sandbox.

---

## ALERT-70 — ALERT-66, cuarta vez, en el ciclo donde se iba a corregir (HB#61)

`default/sent/20260930T170833Z…50f01.json` es el recibo de la Idea 50F. **El
archivo no estaba en el `inbox` del Reviewer.** Es ALERT-62/63/65/66 por cuarta
vez.

La regla del HB#60 ya estaba escrita y escrita bien ("el recibo es la
CONSECUENCIA de la entrega, no la entrega"), y aun así se repitió.

> **Lo que creo que explica por qué un registro no alcanza:** la regla cambió una
> *decisión*, pero el fallo está en un *gesto*. `sent/` es un paso que se hace
> por inercia porque siempre se hizo, y una regla escrita no borra la inercia de
> un gesto que nadie está mirando.

Mitigación aplicada en la 49G (este mismo ciclo): el pedido se entregó
**verificando `Code-Reviewer/inbox/`** — `to: Code-Reviewer`, cuerpo de 6.854
caracteres, las 6 preguntas presentes — **y no se escribió nada en `sent/`**.
Lo que hay que hacer por defecto es **mirar el inbox del otro después de
enviar**, porque el paso por defecto tiene que ser el que verifica.

---

## ALERT-71 (2026-09-30 18:40 UTC, HB#62) — IN_PROGRESS.md apontava al clon canonico equivocado, y ese clon ya no existe

La cabecera de `IN_PROGRESS.md` decia, textual:

> **Clon canónico:** `C:\Mis Archivos\GW2 online\gw2-wallet-ligero` (tiene los 2
> remotes: `origin`=produccion, `agents`=desarrollo).

Verificado contra el disco: **`gw2-wallet-ligero\.git` no existe.** El clon fue
borrado. O sea que la linea era doblemente falsa — nombraba un clon **vetado**
por la regla de repos de `AGENTS.md` *y* describia como vigente un directorio
inexistente.

No es cosmetico. Ese clon viejo es exactamente el que tiene `main` local
trackeando `agents/main` y **los dos remotos con `origin` = produccion**: es el
camino del incidente del 30-09, donde un `push origin main` desde ahi manda
commits de desarrollo a produccion. Un `.md` que dice "canonico" e invita a
commitear ahi es un camino abierto a repetir ese incidente.

La regla de "una rama que no es ancestro de main no implica WIP perdido"
(ALERT-47) ya nos習慣 a verificar **ramas** contra `main`. Esta vez la
verificacion era sobre un **directorio**, y la misma disciplina la resuelve:
`os.path.isdir(ruta + "/.git")` antes de decir que un clon existe.

Corregido en `IN_PROGRESS.md` con el clon real (`gw2-dev`, rama `main`, remoto
de desarrollo `origin`, refspec `git push origin HEAD:main`) y la razon del
cambio escrita, para que el proximo que lo lea sepa que la linea anterior no
era una preferencia.

> **Regla:** un archivo que dice "canonico" es una afirmacion sobre el disco, no
> una convencion del equipo. Se verifica como cualquier otra afirmacion.

---

## ALERT-72 (2026-09-30 18:35 UTC, HB#62) — ENTREGAR NO ES RECOGER: el canal de archivos no despierta a nadie

Los 3 pedidos de veredicto al Reviewer (Idea 61 T1-2 `164148Z`, Idea 50 Tramo F
`170948Z`, Idea 49G `181500Z`) llevaban **entre 17 minutos y 2 horas** en
`code-reviewer/inbox/` con `state=asked`, sin una sola respuesta. Con la regla
de "no declarar muerto a un agente antes de 20 min" porque ya no cuadra: el
Reviewer no estaba lento.

La causa, verificada en `workspaces/code-reviewer/agent.json`:

    code-reviewer  heartbeat: { enabled: FALSE, every: "6h" }
    product-owner  heartbeat: { enabled: TRUE,  every: "2h" }
    documenter     heartbeat: { enabled: TRUE,  every: "4h" }
    default        heartbeat: { enabled: FALSE, every: "30m" }  (lo cubre el cron 13dc22e6)

Y `qwenpaw cron list` tiene **2 crons**: el Heartbeat Principal y la sonda del
Arquitecto (pausada). **Ningun cron toca al Reviewer.** Es decir: al Reviewer no
lo despierta ni su heartbeat (desactivado por diseno) ni ningun cron. **Nada.**

Por eso los 3 pedidosentedaron completos a su bandeja y nadie los abrio. El
canal de archivos es durable — sobrevive reinicios y no vence, por eso es la via
primaria — y esa misma propiedad es la que lo hace **inerte**: un mensaje puede
estar en la bandeja del otro, con su `to` correcto y su cuerpo entero, durante
tiempo indeterminado.

> **El canal de archivos garantiza que el mensaje LLEGA. No garantiza que alguien
> loLEA.** Son dosinstantias distintas, y confundirlas produce el modo de falla
> mas caro que tenemos: **parece perdido cuando en realidad nadie lo fue a
> buscar.** Un `state=asked` con horas de antiguedad no es "el Reviewer esta
> pensando", es "nadie lo despertar".

Mitigacion aplicada en este ciclo: un `submit_to_agent` al Reviewer que nombra
los 3 archivos por nombre y por hash de commit, para que no los vuelva a
buscar. Y el mensaje nuevo **declara** que el heartbeat esta apagado, para que
`state=asked` con 2h se lea como lo que es.

Corolario para el resto del equipo: **el PO y el Documentador si tienen
heartbeat activo**, asi que a ellos un mensaje en el canal basta. **Al Reviewer
no.** Es la unica asimetria real del ecosistema y hay que tenerla en la cabeza
al elegir canal, no al esperar el veredicto.

> **Distinto de ALERT-70, y por eso no es "la quinta vez":** ALERT-70-era que
> el *recibo* no probaba la *entrega*. Este es que la *entrega* probada no
> garantiza el *recogido*. Se arreglan en lugares distintos — uno escribiendo en
> `sent/`, otro no llamando a `submit_to_agent` — asi que learn la regla de uno
> no previene el otro.
