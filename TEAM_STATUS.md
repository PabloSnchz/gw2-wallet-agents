# TEAM_STATUS — Heartbeat Principal

> **Actualizado:** 2026-10-02 (HB#151) por el Principal.
> **Origen de verdad:** `gw2-dev` -> `origin/main` = `3c3af8a` al abrir (commit del
> HB#149). **18 refs** `po/*`, `main` UNICO, 0 duplicados por refspec; las 7 ramas
> con barra que no son `po/*` son intencionales (`feat/`, `feature/`, `fix/`,
> `rescate/` x2, `tools/`). Remoto = `origin` (`gw2-wallet-agents`): la forma
> correcta aca es `git push origin HEAD:main`.
>
> **LO QUE HIZO ESTE CICLO: rescatar el WIP del HB#150, que estaba TERMINADO y sin
> commitear.** La regla ALERT-219 del HB#149 dice que un arbol sucio puede ser el
> ciclo anterior VIVO. Aca se cumplio la otra mitad: **muerto, con el trabajo
> completo**. Las escrituras van de 22:37 a 22:47 UTC y este ciclo abrio 10 minutos
> despues; `origin/main` seguia en el commit del HB#149 (22:23), o sea el HB#150
> nunca commiteo. El diff eran 7 archivos: `getAccountSkins` en `api-gw2.js`
> v2.32.0, el `?v=` de `index.html`, las allowlists de `CACHE_KEYS_EXACT` y del
> test 50F, un test nuevo, y 4 logs.
>
> **VERIFICACION INDEPENDIENTE, no confianza.** (a) **Fase roja reproducida**: el
> test declara "borrar el guard de elementos -> 13 pass / 4 FAIL". Medido, y son
> exactamente las secciones **3 y 3c** las que caen mientras **3b y 6 siguen en
> verde** —o sea que el test distingue "rechaza la forma mala" de "rechaza todo".
> La mutacion se hizo con backup en disco, **nunca con `git checkout`**: el
> trabajo del HB#150 no estaba commiteado y se habria perdido. (b) **Suite
> 2146/0 en 83 de 83**, y el delta contra la base del HB#149 (2129/82) es
> **exactamente +17**, que es el test nuevo: este ciclo no toco ninguna
> asercion previa. (c) **4 defectos de edicion corregidos**, todos del HB#150 y
> ninguno de producto: la linea del historial del header quedo como
> `Version: 2.31.0` sin tilde y con sangria de continuacion; el comentario del
> guard de elementos estaba **duplicado (3 lineas x 2)**; una linea en blanco
> partio el blockquote del HB#148 en `TEAM_STATUS.md`; y `parecianbugs` sin
> espacio en `ALERTS_LOG.md`.
>
> **HALLAZGO PROPIO (ALERT-222): el criterio de conteo del PASO 3 esta ROTO, y por
> eso no puede decir "0".** Corri el criterio literal de `HEARTBEAT.md` sobre
> `origin/po/hb150-poda` y dio **7 CUENTA / 4 CERRADAS / 14 de control** = "3+,
> mandalas al Reviewer". Medidas una por una: **las 7 son de las rondas 16 a 38**,
> todas atendidas hace ciclos. Ademas el orden del archivo es **inverso**: la
> ronda **45** esta en la **posicion 0** y la **13** al final, asi que "la ultima
> seccion" es la mas vieja. Al criterio le falta el filtro de *"ronda posterior
> al ultimo corte"*: sin el cuenta un **censo del historico**, y un censo no
> abre una ronda.
>
> **PASO 3: no se abrio ronda, y el 0 es correcto.** Verifique la ronda 45 yo
> mismo: es **PAUSA por el propio regimen del PO** ("no se investiga y no se
> traen ideas"). Trae 2 podas, la escalada de ALERT-41 y una hipotesis propia
> muerta. **0 propuestas. Control negativo OK.** La fila 176 del COMMS_LOG acierta.
> **Ninguna al Reviewer**, que ademas viene devolviendo sin veredicto por 4to
> ciclo.
>
> **LO QUE NO SE HIZO, y por que.** No se arranco el **Tramo 2** de Coberturable
> (el catalogo `/v2/skins` paginado), aunque es el siguiente paso natural de la fila
> y tiene el orden ya escrito. Es trabajo de producto con diseño propio (lotes,
> cache, merge de paginas) y necesita su test con fase roja. Arrancarlo a las
> 23:00 UTC con un commit de rescate todavia sin pushear es exactamente el estado
> que ALERT-219 previene: un arbol sucio que el siguiente ciclo tiene que
> descifrar. Queda para el HB#152 con el repo limpio.

<!-- BLOQUE ANTERIOR (HB#150), preservado para reversibilidad -->

> **Actualizado:** 2026-10-02 (HB#150) por el Principal.
> **Origen de verdad:** `gw2-dev` -> `origin/main` = `3c3af8a` al abrir (commit del
> HB#149). **18 refs** `po/*`, `main` unico, CERO duplicados por refspec. Remoto =
> `origin` (`gw2-wallet-agents`): la forma correcta aca es `git push origin HEAD:main`.
> **Suite:** **2146 aserciones / 0 FAIL en 83 de 83 archivos** (linea `TOTAL` del
> runner, leida y NO recalculada sumando filas — ALERT-217). Base al abrir: 2129 / 0
> FAIL en 82. **El delta +17 es exactamente el test nuevo**, o sea que este ciclo no
> toco ninguna asercion previa. Esa igualdad tambien sirve de control: si el +17
> hubiera salido en otro numero, el cambio habria roto algo.
>
> **Ciclo CON CODIGO DE PRODUCTO** (el primero en 2 ciclos): `getAccountSkins(token,
> opts)` en `api-gw2.js` **v2.32.0** — BACKLOG L88 "Coberturable account-scoped
> multicuenta", Tramo 1 de 12, el endpoint que la fila nombra para arrancar. Solo
> capa de datos: **sin call site y sin pantalla**, no cambia lo que Pablo ve.
> Endpoint medido (401 contra 404 de control) y **forma verificada, no supuesta**:
> `/v2/account/skins` devuelve un array de **ESCALARES**, no de objetos, asi que el
> guard de FORMA tiene 2 pasos. Fase roja del test verificada (4 FAIL) antes del fix.
>
> **LO QUE ESTO CAMBIO Y NO ES CODIGO (ALERT-220 y ALERT-221).** Agregar 1 endpoint
> rompio **3 archivos de la suite** por 2 motivos que parecian bugs distintos:
> (a) `api-gw2.js?v=` de `index.html` quedo desalineado del header al subir la
> version; (b) la allowlist `CACHE_KEYS_EXACT` no conocia `account_skins`, o sea
> **el boton de cache no la borraba** — ese es un fallo de producto, no de test, y
> lo atrapo una asercion que ya existia. De (b) sale la regla: la allowlist tiene
> **dos fuentes de verdad** (la del `.js` y la especificacion del `.test.js`) y se
> mueven juntas. De (a) y del conteo salen los **6 lugares** que cuesta un endpoint:
> **0 de 6** son "data + columnas", que es lo que la fila promete para los otros 11.
>
> **PASO 1:** el veredicto del PO (`task-5d67821e3648`) llego entero **pero ya
> estaba consumido en el HB#147** — "llego" y "es nuevo" son hechos distintos. El
> del Reviewer (`task-6cc3851b8d15`) vuelve **SIN veredicto por 4to ciclo**
> ("Max iterations (100) reached").
>
> **PASO 3: no se abrio ronda.** **18 refs** `po/*`; la nueva `po/hb150-poda` trae
> la **ronda 45, que es PAUSA por el propio regimen del PO** ("no se investiga y no
> se traen ideas"). **0 propuestas**, control negativo OK. **Ninguna al Reviewer.**

<!-- BLOQUE ANTERIOR (HB#148), preservado para reversibilidad -->

> **Actualizado:** 2026-10-02 (HB#148) por el Principal.
> **Origen de verdad:** `gw2-dev` -> `origin/main` = `70fd048` al abrir.
> **17 refs** `po/*`, `main` unico, CERO duplicados por refspec. Remoto = `origin`
> (`gw2-wallet-agents`): la forma correcta aca es `git push origin HEAD:main`.
> **Suite de base:** **2129 aserciones / 0 FAIL en 82 archivos** (exit code,
> linea `TOTAL` del runner). **2123 / 0 FAIL en 81 archivos** sin el archivo nuevo
> de este ciclo.
> **LA OBSERVACION DEL TOTAL ESTA CERRADA (ALERT-217).** Antes decia que el TOTAL
> "bouncea entre ~2.100 y ~4.250 entre ciclos con la suite en verde" y que quedaba
> sin explicar. **Medido: el runner NO varies.** Las 3 formas de medir sobre el mismo
> stdout dan coherentes: linea `TOTAL` = 2129, suma de las lineas por archivo = 2129
> (82 archivos, 0 ilegibles), y la suma **mas** el TOTAL = 4258 = 2129 x 2. Los
> numeros grandes registrados (4246 en el HB#147, 4145 en el HB#141) son
> exactamente el doble de los reales: 4246 = 2123 x 2. Es doble conteo de quien
> midio, no del runner. **El numero de verdad sale de la linea `TOTAL`, nunca de
> sumar las filas a mano.**
> **PASO 3: no se abrio ronda.** Las **17** refs `po/*` siguen en sus rondas 33-44;
> la mas reciente es `po/hb142-poda`, la ronda 43 (MODO PAUSA, 0 propuestas) ya
> atendida, y la 44 la atendio el HB#144. Conteo canónico sobre
> `origin/po/hb142-poda`: 7 CUENTA / 3 CERRADAS / 14 de control (secciones sin
> "ronda N"), ronda MAX 43. **0 propuestas nuevas -> no se manda nada al Reviewer.**

<!-- BLOQUE ANTERIOR (HB#146), preservado para reversibilidad -->

> **Actualizado:** 2026-10-02 (HB#146) por el Principal.
> **Origen de verdad:** `gw2-dev` -> `origin/main` = `9b5106a` al abrir.
> **30 refs**, `main` unico, CERO duplicados por refspec. Remoto = `origin`
> (`gw2-wallet-agents`): la forma correcta aca es `git push origin HEAD:main`.
> **Suite de base:** **4246 pass / 0 FAIL en 81 archivos** (exit code, linea
> `TOTAL` del runner; medido en el HB#147). **Ojo:** el TOTAL del runner bouncea
> entre ~2.100 y ~4.250 entre ciclos con la suite en verde (2041@78, 2123@81,
> 4145@77, 4246@81). No lo he explicado y queda como observacion, no como
> conclusion: un detector cuya salida varies 2x en verde merece su propia
> auditoria.
> **PASO 3: no se abrio ronda.** Las **17** refs `po/*` siguen en sus rondas
> 33-44; la ultima (44) ya la atendio el HB#144 y no hay ref nueva.
> **Ciclo con 1 fix de ARNES (no de producto)**: ALERT-211, paso 1 del veredicto
> del PO. Ver abajo. El fix de producto se revirtio.

## HB#146 parte 2: el PO respondio, y su paso 1 (test-only) quedo hecho y MEDIDO

**Veredicto del PO** (`task-5d67821e3648`), que es lo mas valioso del ciclo:

1. **La cola NO deberia ser filtrable.** `QUEUE_MAX=5`: filtrar esconderia el
   boton "Quitar" de lo que el usuario mismo encolo, y `2/5` contaria de otra
   lista. Es una lista de trabajo, no un catalogo.
2. **Su punto 2, tal como lo escribo, era FALSO y el HB#147 lo midio.** No hay
   dos asertos que se contradigan: `COLA-13` (`hb126:253-261`) solo asserta que
   la barra esta presente, con la cola **vacia** y sin filtro; la frase *"eligen
   que entra a la cola"* esta en su **mensaje de fallo**, no en su condicion.
   Detalle en **ALERT-212**.
3. **`3.1` no aplicaba ningun filtro.** Con el filtro puesto de verdad, el
   escenario que su cabecera nombra recien existe.
4. **El boton "Tengo / Me faltan" no tiene tema en la cola**: se encola lo que
   no tenes, asi que "Tengo" es ~siempre 0; y el de "Me faltan" habla de la
   legendaria, no de los materiales (que ya responde su propio boton).

**Hecho (ALERT-211), test-only, no toca la app.** El paso 1 que pidio el PO:

| Corrida | Resultado |
|---|---|
| Normal | **21 pass / 0 fail**, `activoEnHtml=true` |
| `--mutar=filtra-por-el-filtro` (nueva) | **3.1 FALLA**, `faltan=[30684,30685,30686,30687,30688]` |
| Suite completa | **2123 aserciones / 0 FAIL en 81/81** |

Lo que si quedo en pie del paso 1: antes `3.1` daba verde **sin construir el
caso que su cabecera nombra**, asi que las dos salidas de producto pasaban la
suite entera. Ahora el filtro se pone de verdad y se verifica el **efecto**
(el boton activo en el HTML), asi que "la cola SE filtra" cae en rojo. De paso: el stub de DOM de ese arnés no tenia `hasAttribute`, que
`_debug()` del tracker usa (`legendary-tracker.js:1287`) — la API de debug
documentada en AGENTS.md era **inejecutable** desde ahi.

**El paso 2 y 3 del PO (🟢 y 🟡) quedan sin aplicar**: son cambio de producto y
esperan su veredicto final.

**Reviewer: `task-6cc3851b8d15` TERMINO SIN VEREDICTO** — "Max iterations (100)
reached". Segundo ciclo seguido en que el Reviewer no responde (HB#145 tambien).
La pregunta que le mande (deuda de codigo vs de comentario) sigue **sin
respuesta**, y el PO ya la contesto desde el lado de producto: el comentario
`legendary-tracker.js:858-864` quedo viejo cuando la cola llego en el paso 5, y
la intencion de producto hoy es que la cola NO se filtre.

## HB#147 (2026-10-02 21:0x UTC): el veredicto del PO era MEDIO FALSO, y el aserto que el repo llama "el que distingue dibujar la barra de que la barra funciona" NO PUEDE FALLAR

**En curso:** nada. **Completado:** ALERT-211 (test-only) + ALERT-212 (medicion).
**Pendiente:** pasos 2 y 3 del PO, FILTRO-05, ALERT-179. **Alertas:** 2 nuevas.

**PASO 1 (el que mas rindio).** Dos veredictos recogidos. El del PO
(`task-5d67821e3648`) **llego entero**; el del Reviewer (`task-6cc3851b8d15`)
**volvio SIN veredicto** — "Max iterations (100) reached", **segundo ciclo
seguido**. Pregunta abierta al Reviewer: la de ALERT-210 (deuda de codigo vs de
comentario), que el PO ya contesto desde producto.

**El hallazgo del ciclo, y es una correccion de OTRO agente (incluido yo).**
ALERT-211 y el PO coincidieron en que "los dos asertos del contrato se
contradicen": `COLA-13` diciendo que los filtros *"eligen que entra a la cola"* y
`3.1` diciendo que el filtro *"no esconde lo encolado"*. **Medido: eso no es
una contradiccion de asertos.** `COLA-13` (`hb126:253-261`) asserta **solo** que
la barra esta presente (`html.indexOf(`data-ftype=`) !== -1`), con la **cola
vacia y sin ningun filtro puesto**; la frase esta en su **mensaje de fallo**, no
en su condicion. Y el que de verdad deberia haber decidido, **FILTRO-05**, es
`filtrado <= todas` sobre un set de **1 elemento**: verde con el filtro
funcionando (0 <= 1) y verde con el filtro apagado (1 <= 1). Un aserto que no
puede fallar no es un control. Detalle y tabla completa en **ALERT-212**.

**La consecuencia util de esa correccion:** **ningun aserto de la suite exige
que la vista de la cola se filtre.** El veredicto del PO —la cola NO se
filtra— esta **libre**: no hay contrato asertado que lo vete. El "arreglo obvio"
que el HB#116 midio como rompiente rompia asertos que solo miden **presencia**.

**Lo que si estaba roto y si se arranglo:** el bloque 3 de
`arma-2-3-cola-contrato` declaraba *"con la cola llena y cualquier combinacion
de filtros"* y **no ponia ningun filtro**, asi que daba verde con y sin
filtrado. Ahora pone el filtro de verdad y verifica el **efecto** (el boton
activo en el HTML), no el setter — porque `setFilter()` solo repinta si
`state.active`, y el sandbox no activaba el tracker: mi primer arreglo se dio
verde a si mismo. Medido por el Principal antes de commitear: **21 pass / 0
fail** normal, **3.1 FALLA** con `--mutar=filtra-por-el-filtro`, suite completa
**4246 pass / 0 FAIL en 81 archivos** exit 0.

**Rescate.** El HB#146 dejo **5 archivos sin commitear en el clon principal** (el
arnes, 3 logs y la fila de COMMS_LOG escrita en un scratch con BOM), con las
fechas fechadas **un dia en el futuro** (la real: 2026-10-02T21:0xZ, que
se corrigio en los 3 archivos). Commit **`69a7595`**, pusheado a `origin/main`.
El commit huerfano `06ed117` del worktree `hb143-wt` (cuyo directorio ya no
existia y cuya rama remota ya estaba borrada) quedo a salvo en
`rescate/hb143-wt`.

**PASO 3: NO se abrio ronda.** **16 refs `po/*`**, el mismo conjunto del HB#142,
ninguna nueva: la mas reciente sigue siendo `po/hb142-poda` (ronda 43, MODO
PAUSA, 0 propuestas). **0 propuestas al Reviewer.**


## EL HALLAZGO DEL CICLO (HB#146): un WIP con un arnés que NO PARSEA, y un arreglo "obvio" que rompía 3 contratos asertados

> **Que paso.** El detector barato del HB#135 (`git diff origin/main --stat` al
> abrir) dio 2 modificados sin commitear. El arnés **no parseaba**:
> `SyntaxError: Identifier 'enCola' has already been declared` — el bloque
> estaba pegado DOS VECES en el mismo scope, una de ellas antes del
> `runInContext` que define la funcion.
>
> **Y el mismo defecto lo reproduje yo:** mi `edit_file` **agrego** el bloque en
> vez de reemplazar el del WIP, dejando dos `var modo` y un
> `propioDelCatalogo` muerto. No lo vio el test: lo vi mirando el `git diff`.

**La premisa era CIERTA, la direccion era FALSA.** Es cierto que en "Mi
progreso" la barra de 4 filtros se pinta y no recorta nada
(`legendary-tracker.js:866` no pasa por `catalogItems()`). Pero el arreglo
obvio —dejar de pintar la barra en la cola— dio **5 FAIL en 3 archivos**
(43/3, 16/1, 14/1), y los asertos que caeron son un **contrato de producto
deliberado**, no un descuido:

| Arnes | Aserto |
|---|---|
| `hb119-2-2-filtros-progreso` | FILTRO-01 "Mi progreso dibuja la barra de filtros" |
| `hb126-cola-crafteo` | COLA-13 "los filtros por categoria siguen en Mi progreso" |
| `hb126-cola-crafteo` | COLA-3.1 "el filtro no borra la cola" / COLA-3.2 "coexisten" |

Lo unico que choca es un **comentario** (`legendary-tracker.js:858-864`) que
declara la intencion contraria. Codigo y arneses coinciden; el comentario quedo
viejo cuando la cola llego en el paso 5. **No se aplico nada de producto.**

**3 reglas de ALERT-210:** (1) un arnés que no parsea no da verde NI rojo —
`node --check` antes de culpar al producto; (2) si el arnés describe una
feature que el producto no tiene, es una propuesta de diseno disfrazada de
bug, no evidencia; (3) implementar el producto hasta que el arnés pase es la
trampa: se lee como "el fix funciona" y esconde que la premisa era una
suposicion.

**Consultas abiertas:** al Reviewer la pregunta de ALCANCE (deuda de codigo
vs de comentario, 1 pregunta, `task-6cc3851b8d15`); al PO las 3 salidas de
producto para la friccion (`task-5d67821e3648`). Ninguna toca codigo sin
veredicto.

## El hallazgo del HB#145 (anterior): un veredicto BLOQUEANTE sobre algo que YA esta en main

> **Que paso.** `check_agent_task(task-1f9ee292b9f3)` — el veredicto del Reviewer
> sobre T12-b, enviado en el HB#131 — estaba **`finished` y SIN LEER**. Es la 4a
> vez del ALERT-127. Su recomendacion literal era: **"Bloqueado. No mergear
> `52ba8c2` en su estado actual."**
>
> **Y `52ba8c2` ya esta en `main`, con otro hash.** Medido, no supuesto:
>
> | Medicion | Resultado |
> |---|---|
> | `git merge-base --is-ancestor 52ba8c2 origin/main` | **FALSO** |
> | `git log -S wireViewTogglePair -- js/raid-tracker.js` en main | **`6e5a60c`**, mismo mensaje |
> | `git merge-base --is-ancestor 6e5a60c origin/main` | **VERDADERO** |
> | `git diff --stat 52ba8c2 origin/main` sobre los 3 archivos de T12-b | **VACIO** |
>
> Los 3 archivos (`raid-tracker.js`, `strike-tracker.js`,
> `hb125-t12b-escritor-comun.test.js`) son **byte a byte iguales** entre la rama
> y `main`. La rama no esta "pendiente de mergear": esta **desactualizada**.
>
> **Sus 4 objeciones, contra `main`:**
> - **B1** (`app.js` reemplaza el namespace) — **CADUCADO.** `main:app.js:1447`
>   es `Object.assign(window.__GN__ || {}, {...})`, con un comentario que cita
>   textual este mismo sintoma (ALERT-197).
> - **B2** ("el test fabrica el namespace, no ejecuta `app.js`") — **YA
>   CUBIERTO.** `tests/hb133-appjs-no-traga-gn.test.js:186` aserta *"ALERT-197:
>   `__GN__.wireViewTogglePair` SOBREVIVE a `app.js` en el orden real del
>   documento"*, que es literalmente el caso que el Reviewer pide.
> - **B3** (el call site) — **el Reviewer mismo lo resuelve a favor del commit**
>   ("la del commit es la mejor"), y `main` tiene la version del commit.
> - **B4** ("la pref manda sobre la ruta", "no esta discutido en ninguna parte
>   del item") — **YA DECIDIDO Y ASERTADO.** `tests/hb136-escena2-solo-strikes.test.js:199`
>   dice *"el panel de Strikes queda VISIBLE (la pref manda)"*, con control
>   negativo en `:254`. La politica existe, esta escrita, y esta probada.
>
> **Las 4 objeciones eran ciertas contra la RAMA y falsas contra `main`.** No se
> aplico ninguna: hacerlo habria revertido el fix de ALERT-197.

## ALERT-212 (este ciclo): un veredicto que pide "no mergear" algo ya mergeado

> **La forma general.** Un veredicto llega con una recomendacion ACCIONABLE
> ("bloqueado, no mergear X") y un sha. Si el sha **cayo en main por otra
> ruta**, la accion literal es **deshacer lo ya hecho**. El Reviewer midi su
> rama con honestidad —el bloqueante B1 es real en esa rama— y por eso mismo el
> veredicto era **correcto e inaccionable a la vez**.
>
> **REGLA: un veredicto se verifica contra `main` ANTES de aplicarse, y no por
> el texto sino por el diff.** `git diff --stat <rama> origin/main -- <los
> archivos que el veredicto nombra>` da **vacio** = la rama ya esta. Da lineas =
> hay trabajo real. Un veredicto que nombra lineas de un archivo que `main` ya
> cambio **no se aplica: se responde** (ALERT-88, misma familia).
>
> **Y el orden del ciclo importa:** el paso 1 es el que lo revelo. Si este
> heartbeat hubiera arrancado por el backlog, la accion pendiente del ciclo
> habria sido leer ese veredicto y ejecutarlo tal cual.

## Lo que se cerro: el HB#144 estaba terminado y sin mergear

> Al abrir, la rama `fix-hb144-cuenta-viva` tenia **2 commits sin pushear** y
> `TEAM_STATUS.md` **sin commitear**. El trabajo estaba bien (test nuevo
> `idea57t5-cuenta-medida.test.js` da **13 pass / 0 FAIL** contra el codigo, y
> su premise —que la cifra escrita coincida con el codigo— se cumple), pero sin
> merge la Pages de test no lo muestra y el siguiente ciclo lo vuelve a mirar.
> Mergeado a `main` y pusheado en este ciclo.
>
> **REGLA reinforced: un commit local no es trabajo terminado.** Es trabajo
> terminado **y visible**. La diferencia la nota el Pablo, no el agente.

## ALERT-213 (menor): una fila de COMMS_LOG duplicada con el mismo numero

> La fila **158** (T12-b) esta escrita **DOS veces** en `COMMS_LOG.md`, con el
> mismo numero, el mismo task id y las mismas 12 celdas. La segunda es la que
> mi parser leyo primero por orden de archivo. No rompio nada porque las dos
> dicen lo mismo — pero un identificador duplicado hace que "cuantas filas hay"
> deje de ser una pregunta con respuesta, y es la misma clase que el conteo
> inflado 11x del HB#141: **contar apariciones no es contar filas.**

> **Actualizado:** 2026-10-02 01:2x UTC (HB#144) por el Principal.
> **Origen de verdad:** `gw2-dev` -> `origin/main` = `45ee93a` (verificado con
> `ls-remote`; **28 refs, `main` unico, CERO duplicados por refspec**). El remoto
> del clon DEV se llama `origin` y apunta a `gw2-wallet-agents`: **no existe un
> remoto `agents`**; la forma correcta aca es `git push origin HEAD:main`.
> **Estado del clon al abrir:** LIMPIO y en sync con `origin/main` (`git diff
> origin/main --stat` vacio, el detector del HB#135). Suite de base **81/81
> archivos exit 0**.
>
> **Trabajo de producto este ciclo: SI.** El PO escribio la **ronda 44** en una
> **rama nueva** (`po/hb136-poda`, `4462441`, NO mergeada). Salieron sus 3
> pedidos: cerrar la ultima cuenta escrita a mano de la Idea 57. Ramas nuevas:
> `fix-hb144-cuenta-viva`. Commits `ae89b8c` + `b8f7bdc`.
>
> **PASO 3: no se abrio ronda.** El control de carga da **5 items `- [ ]`** =
> banda 4-7 = **MODO PAUSA**. Las rondas altas (41-44) son todas poda: 0
> propuestas nuevas. Lo que si se hizo es atender la ronda 44, que no era una
> propuesta sino una correccion de una fila ya abierta.

## EL HALLAZGO DEL CICLO: el "nueve" de la Idea 57 nunca fue un conteo de sitios

> **Lo que el PO pidio y tenia razon.** La fila 107 de `BACKLOG.md` se llama
> *"la REGLA del contrato de FORMA, no el fix del caso N"*, y tenia **regla para
> la DEGRADACION pero numero escrito a mano para la CUENTA**. Son los dos
> verbos del nombre de la fila, y solo uno estaba cubierto.
>
> **Medido, no supuesto:**
> - El `"5 wrappers que faltan migrar"` de la cabecera **nacio viejo**: en
>   `a3d0b5b`, el commit que lo escribio, la marca `Migracion = Tramo 2` ya
>   estaba en **7 sitios reales**. `0d498b1` lo bajo a 4 sin tocar la linea.
> - El `"es la unica de las nueve"` (`:1174`) era un conteo de **MENCIONES**:
>   la marca vivia en inline y en JSDoc, y varios JSDoc contaban el mismo sitio
>   que ya contaba su inline. Hoy son **4 sitios**.
> - La PROPIEDAD de esa linea (que es la unica que exige tocar el `catch`) **sigue
>   cierta**, medida sitio por sitio: los otros 3 propagan el error de red.
>
> **La decision que importa mas que el fix: NO se cambio el "5" por "4".** Se
> borro la cifra y se escribio que la cuenta la hace
> `tests/idea57t5-cuenta-medida.test.js`. Es la v2.25.0 del propio archivo
> aplicada a la cuenta: *"acertar el numero no era la tarea; que no se pueda
> mentir sin que algo lo note, si"*.
>
> **La tercera mutacion es la que prueba que funciona:** con un wrapper migrado
> de verdad, el conteo baja solo y el arnes pide actualizar el comentario. El
> numero sigue al codigo, no al reves. Las otras dos (cifra falsa en cabecera,
> cifra falsa en el "de las N") caen en rojo por la razon correcta.
> **Fase roja medida en las dos direcciones:** contra `origin/main` **12 pass /
> 2 FAIL exit 1**; con el fix **13 pass / 0 FAIL exit 0**. Suite **81/81 exit 0**.

## ALERT-210 (este ciclo): un control que se aplica a medias no mide, y se lee como que midio

> **Dos casos, y los dos producen el mismo falso VERDE.** Un control de rojo mal
> escrito no es un control que no se ejecuto: es un control que ejecuto y no
> midio, y eso es peor, porque el archivo queda en verde.
>
> **(a) La tercera mutacion cayo en verde la primera vez.** El `replace` del
> script de instrumentacion no habia matcheado — el `\n` de un `node -e` en
> cmd.exe no es un salto de linea real. La conclusion fue "el test no detecta
> una migracion", cuando la verdad era "no habia pasado nada". **Regla: un
> control que no se aplica se verifica APLICADO antes de leer el resultado.**
> Rehecha con `join(String.fromCharCode(10))` a proposito, dio lo que debia.
>
> **(b) El control del extractor media una forma que el archivo NO tiene.** El
> control de "de las N" usaba `...de las nueve\ncuya decision...` (sin el `//`
> del comentario), mientras que el archivo real tiene `...de las nueve\n // cuya
> decision...`. Con `\s+` en vez de `[\s\S]{0,40}?` el detector **no ve el
> numero que existe**, y el control pasaba mientras el detector real no
> encontraba nada. **Regla: un control de extractor copia la forma REAL del
> archivo, con su particion de linea. Una forma inventada mas limpia es un
> control que prueba otra cosa.**

## ALERT-211 (este ciclo): el detector mas especifico puede ser el que no encuentra nada

> **Sintoma:** el extractor de `"de las N"` daba **0 matches** sobre el archivo,
> y el test que lo usaba pasaba en verde. Con la conclusion inverse de la
> correcta: "el numero se borro".
>
> **Por que:** el archivo parte la frase en dos lineas y la segunda arranca con
> el `//` del comentario, asi que el texto entre el numero y `cuya` es
> `"\n              // "`. Un `\s+` no cubre el `//`. Ademas, un detector laxo de
> `"de las N"` encuentra **8 lugares** en el archivo y **7 no son contadores**
> ("las 27 cuentas", "de las sisters de commerce", "de las que mas cuota gasta"):
> hay que anclarlo a `"unica de las N cuya"` y darle **3 controles negativos con
> esas frases reales**, no inventadas.
>
> **Y el error de lectura:** `0 matches` se leyo como "el codigo no dice eso",
> cuando era "el detector no lo encuentra". **Un detector mas especifico que no
> encuentra nada es el que mas se confunde con una verdad, porque el 0 se ve
> igual en los dos casos.** Solo se distinguishue con un control POSITIVO de la
> forma real.

## Lo que el test atrapo en la escritura de su propio fix

> La nota de la v2.29.0 en `:1181` se escribio **primero** entre la marca
> `Migracion = Tramo 2` y su `Array.isArray`, y eso empujo el sitio fuera de la
> ventana de 6 lineas del detector: **el conteo bajo solo a 3 sin que nadie
> hubiera migrado nada.** Lo mostro la primera corrida del test. Sin el arnes,
> ese error iba a `main` y la cuenta quedaba mal desde el dia uno.
>
> **La nota quedo antes de la marca, con la regla escrita al lado** — porque el
> orden de esas dos lineas ES la invariante. Es la misma clase que los 2
> tests atados a una posicion de `index.html` (ALERT-205): un arnes atado a la
> distancia entre dos lineas es un arnes atado a algo volatil.

## ALERTS ABIERTAS (sin cambio de estado)

- **ALERT-179** — fix mergeado, esperando el veredicto del Reviewer. Mudo desde
  el HB#121. `check_agent_task` da **404** (TTL vencido), que por regla NO es
  fallo: se busca en el canal de archivos.
- **Idea 57, los 4 wrappers** — MEDIDOS (4 reales: `:957` `:1001` `:1077`
  `:1177`) y **NO tocados**. Es capa de datos con veredicto del Reviewer
  (ALERT-48). El Tramo 3 de este ciclo **no los migra**, solo los cuenta.
- **T14/T15** — veredicto **opcion C**, precondicion MEDIDA (`hb136-escena2`),
  sin aplicar.
- **Los 7 del patron B** del HB#118; **ALERT-41** (bloqueado por el body crudo
  de `/v2/account/raids` con token real); **los 6 scripts de `tools/`** con ruta
  absoluta.

> ---
>
> **Actualizado:** 2026-10-02 18:3x-19:0x UTC (HB#143) por el Principal.
> **Origen de verdad:** `gw2-dev` -> `origin/main` = `3e30231` (verificado con
> `ls-remote`; `main` unico, sin rama duplicada con barra). El remoto del
> clon DEV se llama `origin` y apunta a `gw2-wallet-agents`: **no existe un remoto
> `agents`**; la forma correcta aca es `git push origin HEAD:main`.
> `agents`**, el push correcto aca es `git push origin HEAD:main`.
> **Estado del clon al abrir:** LIMPIO y en sync con `origin/main`. La suite de
> base dio **2047 aserciones / 0 FAIL en 78/78 archivos**, exit 0.
>
> **Sin trabajo de producto este ciclo.** El PO sigue en MODO PAUSA (ronda 43),
> la ronda mas alta con Tramos sigue siendo la 38, y las 9 CUENTA que quedaron
> estan todas triadas. Lo que si produjo el ciclo es una medicion que corrige
> como se verifica "esto ya esta aplicado" — ver ALERT-209 abajo.

## ALERT-209 (este ciclo): "ya esta aplicado" y "sigue abierto" son la MISMA afirmacion, y salen del mismo grep

> **El hallazgo.** Para responder el paso 3 ("si el PO tiene 3+ propuestas,
> mandalas al Reviewer") hay que verificar cada una contra `origin/main`, y ahi
> se me **rompieron dos instrumentos seguidos**, en el mismo sentido: los dos
> subestimaban lo que ya estaba hecho, y en los dos casos el dato apuntaba a
> "sigue abierta" cuando ya estaba aplicada.
>
> **El primero: un grep que cuenta menciones no distingue codigo de prosa.**
> `git grep -n wireStrikeViewToggle origin/main -- js/` da **5**, y el log de
> varios ciclos da T12 por mergeado. Medido linea por linea, los 5 son
> **comentarios**, y `strike-tracker.js:1235` dice textual que *"T12-b (HB#125).
> `wireStrikeViewToggle` quedo BORRADO: era el segundo escritor"*. El codigo da
> **0**. Sin el filtro, T12 figuraba 5 veces "presente" y estaba borrado hace
> varios heartbeat.
>
> **El segundo, y mas tonto: use la DESCRIPCION como patron de busqueda.**
> Busque `"stopTimers en raid-tracker"` — con las palabras del medio — y
> obtuve 0, que es indistinguible de "no esta". Los dos instrumentos coinciden
> en que un **0 puede ser dos cosas**: "no existe" y "no lo estoy encontrando".
>
> **El filtro tambien fallo su propio control la primera vez.** quite el
> prefijo con `l.substring(l.indexOf(':')+1)`, y el primer `:` de
> `origin/main:js/raid-tracker.js:1059:` es **del remoto**, no del archivo: el
> `//` de la linea de comentario nunca llegaba al inicio y el filtro lo dejaba
> pasar. Solo lo detecto porque el control ("un token que solo vive en un
> comentario tiene que dar 0") daba 5.

**Como quedo la medicion, ya con los dos controles en verde** (control de solo-prosa = 0, control positivo `gn:tokenchange` = 18 lineas de codigo):

| propuesta | marcador | codigo en `origin/main` | veredicto |
|---|---|---|---|
| T20-a | `keyCount` | 2 | ya aplicada |
| T20-b | `lastUploadKey` | 3 | ya aplicada (HB#142) |
| T20-c | `exportData` | 2 | ya aplicada |
| T12-b | `wireStrikeViewToggle` | **0** | ya aplicada (borrada) |
| T14-a | `__viewToggleWired` | 2 | ya aplicada |
| T13-b | `stopTimers` en raid-tracker | 2 | ya aplicada |
| T13-a | `stopTimers` en router.js | **0** | **sigue abierta** |
| T19-a | `stopTimers` en inventory-hub.js | **0** | **sigue abierta** |
| T17-b | `account/strikes` en index.html | **0** | **sigue abierta** |
| T19-c | `gw2_selected_key_v1` | 3, **todas en `storage.js`** | ya aplicada |
| T2-r22 | `tokenHasWVPermissions` | 2 | ya aplicada |

> **T19-c es el caso que mas merito tiene.** Los unicos `gw2_selected_key_v1`
> que quedan como **codigo** estan en `storage.js`, que es donde vive la
> migracion de prefijos. En `app.js`, `inventory-hub.js`, `raid-tracker.js`,
> `strike-tracker.js` y `wv-purchase-detail.js` quedan 5 lineas y **las 5 son
> prosa** (comentarios que documentan que ya no se lee a pelo). Mandar T19-c al
> Reviewer habria sido pedir un fix de algo que ya esta arreglado.
>
> **La regla que sale, y generaliza a los 10 hallazgos transversales:** cuando
> un grep te da 0, el 0 **no es un dato hasta que un control demuestra que el
> grep funciona**. Y cuando te da N, N no distingue "codigo" de "lo que el autor
> escribio sobre el codigo". Las dos mitades de la misma trampa.

## ALERT-208 (este ciclo): un worktree con codigo sin commitear, y 2 asertos que fallaban contra el codigo CORRECTO

> **Tarea en curso:** rescate de **T20-b** (la DIRECCION del Gist, ronda 38 del
> PO). El codigo estaba **sin commitear** en el worktree `gw2-wt135`
> (`js/gist-sync.js` + `js/storage.js` modificados, mas su test), y el HB#135 lo
> dio por perdido: miro el clon principal, estaba limpio, y de ahi concluyo que
> no habia nada que rescatar. **Un worktree es un clon**; que el principal este
> limpio no dice nada de los otros 34.
>
> **Lo que se lleva el ciclo:** al ejecutar el test rescatado, **2 FAIL
> con el codigo correcto**. Los dos eran del arnes, misma clase que ALERT-155
(exigir la palabra exacta del autor mide la prosa, no la propiedad): uno
> pedia la constante DENTRO de `set(` y el codigo la resuelve en una variable
> antes; el otro buscaba la declaracion de `GIST_LAST_UPLOAD` en `gist-sync.js`
> cuando vive en `js/storage.js`, que es donde vive toda pref del proyecto.
> **Casi se pierde al reves:** 2 FAIL de un arnes contra el codigo bueno se leen
> como que el feature esta roto, y la reaccion era arreglar el producto para que
> el test pase.

**Mediciones de este ciclo (todas con control antes que el dato):**

| que | resultado |
|---|---|
| suite base, clon limpio | 2009 / 0 FAIL, 77/77, exit 0 |
| `hb135-t20b-direccion` CON el fix | **38 pass / 0 FAIL**, exit 0 |
| el mismo test contra `origin/main` SIN el fix | **11 pass / 16 FAIL**, exit 1 |
| suite completa con el fix | **2041 aserciones / 0 FAIL, 78/78**, exit 0 |
| `node --check` en los 2 archivos | limpio |

## Propuestas del PO: 0 nuevas (MODO PAUSA) — y una correccion que si es accionable

> **CORRECCION a lo que decia arriba este mismo ciclo.** Mi conteo de partida
> miraba solo `po/hb99-dashboard` (que sigue en `4fe6162`) y por esoiba a
> escribir "7 ciclos sin ronda". **Hay una rama nueva: `po/hb142-poda`, ronda
> 43.** El conteo de una sola rama es el mismo error del HB#141 por otro lado:
> si el PO escribe en una rama nueva, mirar la vieja no es mirar el PO.

- **Ronda 43 (HB#142): MODO PAUSA, 0 propuestas.** El PO lo dice textual en la
  seccion: *"No pido nada de esto ahora (PAUSA): es para cuando baje de 3"*.
  **No se mando nada al Reviewer**: mandarle lo ya aplicado, o nada, es la
  forma mas cara de perder un ciclo (HB#103).
- **Lo que si trae la ronda 43, y es una correccion, no una idea:** la poda de
  la ronda 42 sobre *WvW Borderlands* era **falsa por la mitad**. El endpoint
  `/v2/wvw/objectives?ids=200` (con `ids=all`) **si** trae los Borderlands, con
  `name` y `chat_link` en **178/178**. El "ninguno" salio de mirar el endpoint
  **sin `ids=all`**, que devuelve strings crudos: un string no tiene `map_type`,
  asi que el filtro no tenia nada que mirar. **Un filtro sobre un campo que la
  respuesta no trae no encuentra nada, y eso se lee igual que "no existen".**
  La fila vuelve al backlog como 🟢, no 6-8h.
- **Verificado por mi, y el PO acerto:** el conteo de la Idea 57. Son **7
  coincidencias** de `Array.isArray(data) ? data : []` en `js/api-gw2.js`
  (`origin/main` @ `12907ef`): **6 en codigo** (`:610` `:957` `:1001` `:1077`
  `:1129` `:1177`) + **1 en comentario** (`:126`). De las 6, **2 son
  deliberadas y documentadas** (`:610` helper de lote, `:1129` catalogo global
  del mercado, Idea 47) y quedan **4 reales**: `:957` `:1001` `:1077` `:1177`.
  Coincide con el conteo del PO y con la fila del backlog. **Medido, no copiado.**

> **El control negativo del conteo del PO fallo al principio (1, imposible), y
> era MI instrumento:** contaba por SECCION, y una seccion que dice "cerrada" de
> T13 mientras su propio tramo sigue abierto marcaba la ronda entera como
> cerrada. Contando por **TRAMO** el control da **0**. Un control que falla no
> mide: hay que mirar el control antes que el dato.

> **El conteo va deduplicado por numero de ronda** (leccion del HB#141): las
> ramas `po/*` arrastran la historia de las anteriores y la misma ronda sale en
> las 16 refs. Contar apariciones daria ~92 y seria falso.
## Pendientes (sin cambio respecto al ciclo anterior)

- **ALERT-179** (`importFromData`/`applyImportData`): fix mergeado, esperando
  veredicto. El Reviewer esta mudo desde el HB#121 (filas 147/148).
- **T14/T15**: veredicto del Reviewer = **opcion C** (una sola pareja de botones).
  Precondicion MEDIDA (`hb136-escena2`, 23/0), **sin aplicar**.
- **Idea 57, los 4 wrappers**: MEDIDOS y sin tocar (capa de datos, ALERT-48).
  Conteo verificado contra `origin/main`: **4 reales**, en `api-gw2.js` `:957`
  `:1001` `:1077` `:1177` (las otras 2 de las 6 son deliberadas y documentadas).
  Conteo verificado contra `origin/main`: **4 reales**, en `api-gw2.js` `:957`
  `:1001` `:1077` `:1177` (las otras 2 de las 6 son deliberadas y documentadas).
- Los **7 del patron B** del HB#118.
- **ALERT-41**: bloqueado por el body crudo de `/v2/account/raids` con token real.
- Los **6 scripts de `tools/` con ruta absoluta**: deuda de instrumental.

---
## ALERT-206 (este ciclo): la suite estaba en ROJO y el PRODUCTO estaba sano

> **Lo que se ve:** la primera corrida de `tools/hb100-suite.mjs` dio
> **4144 pass / 2 FAIL en 77 archivos**:
> `alert86.censo-clasificacion` y `hb124-arme-1-2-modal-materiales`.
> Los dos, corridos **sueltos y 6 veces cada uno**, dan **0 FAIL**. Un test que
> solo falla en la suite y nunca suelto no es un producto roto: es otra cosa.
>
> **La causa, medida:** los archivos del working tree cambiaron **durante** el
> ciclo. `mtime` de `tests/alert86` = 17:33:47, `js/legendary-tracker.js` =
> 17:33:43, y la suite corria sobre el estado intermedio. Habia un WIP sin
> commitear (3 modificados + 2 archivos nuevos) que la suite todavia no
> absorbia.
>
> **El bug de producto que si habia, escondido debajo del rojo:** el WIP
>Fixed dos defectos reales de la vista del arbol, y los dos son "un control
> que el usuario ve y que no dice la verdad":
> 1. **El chevron de los niveles 2 no hacia nada.** `_abierto()` preguntaba
>    primero por el default del nivel y solo despues miraba el mapa
>    `abiertos`, asi que el `false` del usuario nunca se leia: el chevron se
>    dibujaba, el nodo se cerraba y la fila seguia abierta.
> 2. **"Cargando las recetas..." se mostraba como ERROR.** El orden de las dos
>    guardas estaba invertido: `build()` devuelve `node: null` con
>    `needsPrecursors: true`, y la guarda de `!res.node` corria primera, asi
>    que un estado conocido caia en el mensaje de fallo.
>
> **Fase roja medida en las dos direcciones:** sin el fix, `armeria-ui-arbol`
> da **49 pass / 7 FAIL** —5 de "colapsar A saca filas (21 < 21)", o sea
> *sacar filas no saca filas*— y 2 del estado pending. Con el fix, suite
> completa **4145 pass / 0 FAIL, exit 0**. El control negativo del archivo
> ("y si no estuviera colapsado?") sigue verde: el archivo no quedo todo rojo.
>
> **REGLA:** un arnes que compara una **POSICION** de `index.html` esta atado
> a algo que se mueve cada vez que se agrega un `<script>`. `alert86` es el
> caso: `render-catologo.js` paso de linea 1015 a 1017 con los dos scripts
> nuevos de la Armeria. Un arnes atado a una posicion es un arnes atado a un
> worktree (ALERT-205): la misma clase, distinto sintoma.

## ALERT-200, sexta manifestacion (mio, de proceso)

> Verificar las propuestas del PO por la PROPIEDAD, no por la cadena que uno
> recuerda. Escribi un verificador con `src/` como prefijo: **ese directorio no
> existe** (los paths son `js/`), asi que dio **0/10 AUSENTE** — la misma
> conclusion que un grep que no encuentra nada. Peor: **fallaron los DOS
> controles**, porque bajo `cmd.exe` el redirect `2>/dev/null` no existe y
> rompia el comando. Un control que falla no mide: hay que mirar el control
> ANTES de mirar el dato. Corregido: **6 de 8 CUENTA ya estan aplicadas**
> (T20, T12, T1, IDEA 64, ALERT-84, IDEA 63), con control negativo en 0 y
> control positivo en 3 archivos.

## Tareas en curso

| Que | Estado | Donde |
|---|---|---|
| **Armeria: vista del arbol** | **LISTO y mergeado** `539f410` | `js/legendary-tree-ui.js` + `tests/armeria-ui-arbol.test.js` (56 pass / 0 FAIL) |
| **Armeria: cola de crafteo (2.3)** | **LISTO y mergeado** `3e30231` | `tests/arma-2-3-cola-contrato.test.js` (17 pass / 0 FAIL, 7 mutaciones) |

## ALERT-211 (este ciclo): el TOTAL de aserciones de la suite no es reproducible

Medido en el mismo commit (`3e30231`), verde en los dos lados, **mismo numero de
archivos**:

| donde | TOTAL |
|---|---|
| `gw2-dev` (clon principal) | **2064** pass / 0 FAIL, 79/79 |
| `gw2-wt143` (worktree nuevo) | **2058** pass / 0 FAIL, 79/79 |

Los 6 de diferencia son **un solo archivo**: `idea84-leyenda-pipeline.test.js`
da **52** en el clon y **46** en el worktree. Y la causa no es el codigo, que es
identico: el escenario `[e]` necesita el snapshot real de 206 items
(`js/_legendary_items_full.json`), que **no esta versionado** (el fetcher lo
regenera desde la API). Cuando no esta, el escenario imprime
`· (e) OMITIDO: no hay snapshot local de 206` y **no cuenta como FAIL**.

O sea: **la cobertura de la suite depende de que hay en el checkout donde se
corre, y el numero no lo dice.** Un verde en un worktree nuevo cubre 6
aserciones menos que un verde en el clon, y el unico aviso es una linea
`OMITIDO` que el resumen del runner no sube.

Dos cosas que lo hacen peor:

1. **El fallo se lee al reves.** Si uno reporta "2058/0" desde un worktree,
   Pablo, que corre en el clon, ve 2064 y la diferencia parece un cambio en el
   producto. No hay cambio: hay una dependencia de archivo sin versionar.
2. **El mismo archivo tiene una segunda rama igual**: `[f]` (linea 449)
   tambien imprime `OMITIDO` cuando git no esta disponible. O sea el patron
   "OMITIDO que no es FAIL" ya esta en dos lugares del mismo arnés.

**No se corrigio en este ciclo** (es un cambio al runner, no a la cola, y el
runner es compartido). Lo que si se puede hacer sin tocarlo: **reportar
siempre el TOTAL junto con el hash de commit y el path**, porque un total
suelto no es comparable entre checkouts. Y regenerar el snapshot antes de
comparar dos verdes.

## ARME 2.3 (este ciclo): la cola, y los dos tests rescatados que NO se portaron

Pablo rescato de dos worktrees en detached HEAD dos tests de la cola que no
existen en `main`, y los dejo a criterio del equipo. **Medidos antes de decidir:**

| test | contra `main` | por que |
|---|---|---|
| `arma-2-3-cola.test.js` | **15 pass / 8 FAIL** | los 8 FAIL son **un solo contrato**: pide `toggleQueue() === 'added'` / `'full'` (strings) y `queueMax`; `main` devuelve un objeto `{ok, reason, queue, added}` con `reason: 'llena'` / `'id-invalido'`, y expone `QUEUE_MAX`. Es un contrato que `main` sustituyo a proposito. |
| `hb125-arme-5-cola-crafteo.test.js` | **0 pass / 2 FAIL** | nunca corrio: busca `normalizeQueue` e `isQueued`, que en `main` son `sanitizeQueue` y una linea en linea. Mueren antes de la primera asercion util. |

Lo que ambos afirmaban de util **ya esta cubierto**, y el mapeo esta medido:
tope y rechazo (`hb126` COLA-04), persistencia (COLA-08), basura (COLA-09),
orden (COLA-05), truncado, y strings numericos. Los cinco que **no** estaban
cubiertos estan en el arnes nuevo, escrito contra la API real de `main`.

## ALERT-210 (este ciclo): una MUTACION que no se aplica se lee como un assert debil

De las 7 mutaciones del arnés nuevo, **2 no morian al principio**. La conclusion
tentadora era "esos 2 asserts no sujetan nada". **Era al reves: las 2
mutaciones no se aplicaban.** Los archivos estan en **CRLF**, asi que un patron
escrito con `\n` pegado a una llave (`renderQueuePanel() {`) no matchea un `{`
seguido de `\r`; y el otro patron buscaba `at = ...` donde el codigo dice
`var at = ...`. El arnes corria en verde porque **nadie habia roto nada**.

Se arreglo normalizando a LF antes de mutar, y sobre todo agregando un
**CONTROL que falla si una mutacion no cambio el texto**. Sin ese control, la
tabla de mutaciones dice "este assert no sujeta" cuando lo que dice es "esta
mutacion no existia": el instrumento mintiendo en la direccion opuesta, y peor,
porque **desconfia de un assert que si funciona**. Es la 2a vez en el ciclo
(el HB#141, con el conteo del PO) que un control ausente hace que el dato
parezca defectuoso.

Matriz final: **7 de 7 mueren**, cada una en el assert que dice medir.

## Pendiente que es DECISION de Pablo, no trabajo

- **El Catalogo no marca los items encolados.** `render-catologo.js` no tiene
  ninguna señal de cola: la unica distincion del producto esta en el modal,
  donde el boton dice "Quitar de la cola" en vez de "Agregar". Quien encolo
  Frostfang vuelve a la grilla de las 206 y no tiene como saberlo sin abrirla.
  **NO se implemento**: cambia la grilla visible y Pablo congelo lo que se ve
  ahi. Queda como hueco de producto, no de test. El arnés **no** lo afirma,
  porque afirmar el hueco como si fuera lo correcto lo volveria una regla.

## Completadas este ciclo (sustituye al del HB#141, que estaba desactualizado)

- **Suite completa: 2064 pass / 0 FAIL, 79 archivos, exit 0** en `gw2-dev`.
  En un worktree nuevo son **2058**, por ALERT-211.
- **`3e30231` mergeado a `main`.** Rama `feat-2-3-cola` borrada al terminar.
- **1.1 y 2.2 NO se tocaron**, confirmado contra `main`: `tpCoinHTML()`
  (`render-catologo.js:101-109`, usada en 259 y 463) y `passesFilters()`
  (`legendary-tracker.js:312`).
- **1.2 ya estaba** (`legendary-tree-ui.js`, `539f410`). El conflicto del click
  quedo resuelto en `main`: `legendary-tracker.js:694` dice *"click en la card
  -> abre el ARBOL"*, y el boton de la cola vive en el header del modal.
- **PASO 1:** inbox **vacio**, replies **vacio**. Las filas 147/148 (ALERT-179)
  siguen `Esperando` al Reviewer, que esta mudo desde el HB#121.
- **PASO 3: no se abrio ronda.** El PO sigue en MODO PAUSA (ronda 43) y no se
  mando nada al Reviewer.

## Pendientes

1. **ALERT-179** (`importFromData` delegando en `applyImportData`, filas
   147/148): fix mergeado y escena 2 asertada, esperando veredicto. El
   Reviewer esta mudo desde el HB#121.
2. **T14/T15**: veredicto del Reviewer = **opcion C** (una sola pareja de
   botones en `index.html`), con T14 y T15 desapareciendo por construccion.
   **Precondicion MEDIDA** (`tests/hb136-escena2-solo-strikes.test.js`, 23/0).
   El veredicto sigue sin aplicarse.
3. **Idea 57 — los 4 wrappers**: medidos y NO tocados (capa de datos =
   ALERT-48).
4. **Los 7 del patron B** (HB#118).
5. **ALERT-41**: bloqueado por el body crudo de `/v2/account/raids` con token
   real de Pablo.
6. **Los 6 scripts de `tools/` con ruta absoluta**: deuda de instrumental.

## Alertas

- **ALERT-206** (este ciclo): suite en rojo por WIP a medio escribir. Ver arriba.
- **ALERT-200**: sexta manifestacion, ver arriba.
- **ALERT-79**: un BOM (`EF BB BF`) entro en el mensaje del commit y losa el
  amend. Es la misma clase: un byte invisible que no se lee en un diff.

---

## HB#149 (2026-10-02 22:0x-22:3x UTC) — poda de 2 filas del PO y ALERT-41 escalada a Pablo

**Que se hizo.** Dos pedidos del PO (ronda 45): podar 2 filas de `BACKLOG.md` y
escalar ALERT-41 a Pablo. Los dos hechos. Ninguno toco codigo de producto.

**Poda (verificada antes de escribir, no despues).**
- **Idea 57 (L107) -> HECHA.** Los 3 tramos estan mergeados (`0d498b1` T2 y
  `ae89b8c` T3, por ancestria contra `origin/main`). El "EN REVISION" estaba
  vencido. Los 4 wrappers no son de esa fila — lo dice la propia fila (L108) y
  los cuenta `tests/idea57t5-cuenta-medida.test.js` (13/0), que los NOMBRA por
  linea.
- **Armeria, barra de filtros de "Mi progreso" (L350) -> DESCARTADA.** Paso 1
  hecho (`69a7595`); los pasos 2 y 3 son cambios de producto que dependen de
  Pablo; `FILTRO-05` ya no es codigo pendiente, es ALERT-212.
- **Quedan 4 abiertas**: ALERT-41 (L60), Coberturable (L88), Dungeon dailies
  (L90), WvW Borderlands (L223). Control: 59 `- [x]` + 4 `- [ ]` = 63
  checkboxes, el total no se movio.

**Escalada de ALERT-41 — HECHA, era lo que mas hacia falta.** Enviada por
`channel_message` a la sesion interactiva de Pablo (`1790896138537-8kgh5xf`),
`success: true`. Es la **unica fila abierta cuya condicion de cierre es 100%
ajena al equipo**, y hasta ahora solo existia como nota interna en tres lugares
de este archivo. La pregunta es una linea: pegar el body crudo de
`GET /v2/account/raids` con un token de permiso `progression`. Con eso, o se
arregla el tracker, o se borra el modulo — y en el segundo caso la decision es
de Pablo.

**Correccion al PO.** Decia "13 dias abierta". El alta es `148f35c` del
**30/09 04:07 UTC**: son **2 dias y medio**. El numero que se le mando a Pablo
es el medido. El PO atinio en todo lo demas, incluso en una cita que yo crei
inventada.

**ALERT-219, nueva.** Casi commiteo un duplicado: lei el working tree sucio
(`M ALERTS_LOG.md`, `?? tests/hb148-...`) como WIP huerfano del HB#148, pero su
commit `0eb87b9` es de las **22:14:09 UTC, 5 minutos despues de que abriera
este ciclo**. El ciclo anterior estaba vivo y commiteando. **La prueba es la
FECHA del commit mas nuevo contra la hora de arranque, no el estado del arbol.**

## Pendientes

1. **ALERT-41**: escalado a Pablo. Falta que responda con el body crudo.
2. **ALERT-179**: fix mergeado, esperando veredicto del Reviewer (mudo desde el
   HB#121).
3. **T14/T15**: veredicto = **opcion C**. Precondicion medida (23/0). Sin aplicar.
4. **Idea 57 — los 4 wrappers**: medidos y NO tocados (ALERT-48). La fila del
   backlog ya no los coordina; el trabajo vive en ALERT-48.
5. **Los 7 del patron B** (HB#118).
6. **Los 6 scripts de `tools/` con ruta absoluta**: deuda de instrumental.
