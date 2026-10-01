## ALERT-118 - el mutex de refresh CANCELABA la carga nueva, y habia un contador declarado que media siempre 0

**Fecha:** 2026-10-01 (HB#90)
**Estado:** CORREGIDO en el ciclo para 2 de los 8 modulos (commit `955a64e`). Los 6
restantes abiertos (ver "LO QUE QUEDA").
**Origen:** T9 de la ronda 28 del PO, verificado y re-medido aca antes de tocar codigo.

### EL DEFECTO, Y POR QUE NO LO ARREGLO `47e4819`

`47e4819` (HB#87) arreglo "dos cargas concurrentes y la VIEJA gana al final".
Ese defecto se produce con un `await` y se arregla con una guarda de generacion.

Los 8 modulos que recargan por cambio de cuenta tienen otra cosa:

    if (_refreshInFlight) return _refreshInFlight;

Eso **no postpone la carga nueva: la descarta antes de pedirla.** Con
`gn:tokenchange` -> `refresh(true)` sobre una carga en vuelo, la red **no
recibe ninguna peticion para la cuenta nueva**, no hay reintento cuando la
vieja termina, y no hay forma de recuperarse. El desplegable dice B y la
pantalla muestra A.

La diferencia con el defecto de `47e4819` no es de grado, es de clase:

| | `47e4819` | este |
|---|---|---|
| la red pide B | si | **no** |
| se recupera al terminar A | si | **no** |
| como se arregla | guarda de generacion | reintento encolado |

Por eso el test de `47e4819` (`tests/hb87-carga-gana.test.js`, 216 lineas) no lo
ve: verifica QUE VALOR quedo en pantalla. "queda mal" y "nunca se pide" pueden
darse el mismo valor en pantalla, asi que un aserto de pantalla no discrimina.

### MEDIDO, CON UN CONTROL QUE DISCRIMINA

`tests/hb90-t9-mutex.test.js` (nuevo, 266 lineas, 14 aserciones) extrae
`refresh` y `loadStrikeData`/`loadRaidData` **verbatim** del fuente y los
evalua en un sandbox con la red inyectada. El aserto central es sobre la
**red**, no sobre la pantalla:

    LA RED RECIBIO UNA PETICION PARA B

- **SIN el fix:** 6 pass / 6 FAIL. `pedidos=["A"]` -- B nunca se pide.
- **CON el fix:** 14 pass / 0 FAIL. `pedidos=["A","B"]`.

Tres casos por modulo:

1. **Control** (A termina antes del cambio): 1 peticion, la de A. Da bien con y
   sin el fix. Si este fallara, el test estaria probando el arnes.
2. **El defecto** (Pablo cambia con A en vuelo).
3. **Control del arnes** (dos refresh sin esperarse): las 2 cuentas se piden.
   Da bien con y sin el fix, y por eso discrimina: es la misma pregunta que el
   caso 2 sin depender de la forma del codigo bajo prueba.

### EL FIX

Reusa el patron que **ya existia bien** en `wv-purchase-detail.js:2240`
(`safeRefresh`): el mutex espera, y `_refreshSeq` decide si la carga que espero
todavia es la ultima pedida. Cuatro lineas netas por modulo.

    var mySeq = ++_refreshSeq;
    if (_refreshInFlight) {
      try { await _refreshInFlight; } catch (_) {}
      if (mySeq !== _refreshSeq) return;
    }

### LA REGLA: UN CONTADOR DECLARADO Y NUNCA INCREMENTADO ES PEOR QUE UN CONTADOR AUSENTE

`raid-tracker.js:872` y `strike-tracker.js:396` declaraban
`var _refreshSeq = 0;` y **nadie lo incrementaba en todo el repo**. Se leia y
se publicaba en el diagnostico (`raid-tracker.js:1942`, `seq: _refreshSeq`).
O sea: la app **afirmaba medir la generacion de la carga y media siempre 0**.

Un contador ausente te dice "aca no hay defensa". Un contador declarado te dice
"aca hay defensa y alguien la desconecto" -- y como se publica en el
diagnostico, la app miente sobre su propia concurrencia. El segundo es peor
que el primero porque **apaga la detectors**: nadie busca un mutex roto en un
archivo que dice tener un contador de generacion.

Corolario operativo: `_debug()` que publica un contador tiene un aserto que
afirme que el contador **se mueve**. Hoy `raid-tracker._debug().refresh.seq`
era un campo muerto con forma de dato.

### LO QUE QUEDA (6 modulos, mismo mecanismo, SIN tocar)

`homestead-tracker:424`, `wallet-dashboard:1168`, `inventory-dashboard:1245`,
`wv-shop-ui:708`, `router:975`, `inventory-hub:1429`.

- **`inventory-hub.js:1429` ya tiene `_refreshSeq` Y lo incrementa**
  (`:1430`), pero el mutex sigue al principio: `if (_refreshInFlight) return
  _refreshInFlight;` descarta la carga nueva **antes** de llegar al
  `++_refreshSeq`. O sea, tiene la defensa completa y la deja sin usar. Es el
  caso que mas engaña de los 6.
- **`homestead-tracker.js` es CODIGO MUERTO** (ALERT-10: no hay script tag,
  ni route, ni panel; sus 5 metodos `GW2Api` no existen). **No tocar**: seria
  escribir un fix para un modulo que no corre. Decimoctavo heartbeat en 0%.
- Los otros 4 (`wallet-dashboard`, `inventory-dashboard`, `wv-shop-ui`,
  `router`) son el mismo fix de 4 lineas, pero cada uno tiene su propia forma
  (los dos primeros tienen un cuerpo async mas largo, `wv-shop-ui` usa
  `_refreshInFlight` con una forma distinta, `router:975` es `_shopInFlight` y
  envuelve una promesa de temporada, no una carga de cuenta). Cada uno
  necesita su propio test antes: el arnes de `hb90` esta armado para la forma
  `refresh`/`loadX`, y no se transplanta.

### LO QUE ESTE CASO SUMA A LA REGLA DE "MEDIR LA PREMISA"

La premisa del PO (ronda 28, T9) era **correcta y venia medida**: dio el
numero de los 8 sitios, los numeros de linea, y un caso de control (el 3) que
separaba el mutex del `await`. Fue la primera vez en 26 rondas que una premisa
llego con su control. La ronda 27 (T8) tambien, y por ahi salio `47e4819`.

Lo que **no** venia, y hubo que medir aca: los 6 restantes no son todos el
mismo fix. `inventory-hub` tiene el contador incremented y el mutex delante.
`homestead-tracker` no corre. Un "arregla los 8" habria producido 3 fixes
distintos y uno contra codigo muerto.

## ALERT-100 - un script de andamiaje tomo la RUTA por el CONTENIDO (HB#77)

**Fecha:** 2026-10-01 (HB#77)
**Estado:** cerrada en el ciclo (`tools/hb77-prepend-md.py`, v2)
**Origen:** error propio, detectado antes del push

`tools/hb77-prepend-md.py` v1 hacia `BLOQUE = sys.argv[2]`. El segundo
argumento es la **RUTA** del bloque, no el bloque: el archivo nunca se abrio, y
lo antepuesto a `TEAM_STATUS.md` y `ALERTS_LOG.md` fue la cadena
`tools/hb77-team-status-bloque.md`. Dos logs del repo quedaron con una linea de
basura arriba. El commit llego a existir; no llego al remoto.

**Lo que lo delato: `git diff --stat` decia "3 files changed, 4 insertions(+),
1 deletion(-)"** para un bloque de unas 150 lineas. Ese numero es exactamente la
medida independiente de la que habla ALERT-95, y fue lo que hizo dudar en vez de
pushear a ciegas.

**REGLA: un script que recibe una ruta DEBE abrirla, y debe negarse a correr si
el resultado es absurdamente chico.** La v2 aborta si el bloque tiene menos de 20
lineas con texto, si las lineas agregadas al destino son menos de 20, o si el
archivo resultante no arranca con la primera linea del bloque.

**Y la de siempre, que aqui pago dos veces:** el numero de inserciones de
`--stat` se mira SIEMPRE. Es el control de un diff que uno cree conocer.

## ALERT-99 - "+N commits" no dice si hay que mergear una rama: hay que mirarla de tres vias (HB#77)

**Fecha:** 2026-10-01 (HB#77)
**Estado:** abierta. Herramientas en el repo: `tools/hb77-audit-ramas.js`, `tools/hb77-rama-superada.js`
**Medida:** `origin/main` @ `2e36237`, 9 ramas remotas (sin `main`)

```
MERGEADAS (borrables): 2
  docs-idea50p3-hb67     @ d328969
  feat-idea56-forma-raids @ 6cfbf2c
SIN MERGEAR: 7   -- de las cuales 6 dan CONFLICTO contra main
  docs-estructura-20260930            + 1  MERGEABLE
  feat-idea49g-ach-acc-compacta       + 1  CONFLICTO
  feature/homestead-tracker           + 1  CONFLICTO
  feature/legendary-component-tracker +10  CONFLICTO
  fix/homestead-glyph-data            + 2  CONFLICTO
  po/hb56-forma-raids                 + 1  CONFLICTO
  po/hb69-dashboard                   + 1  CONFLICTO
```

`AGENTS.md` dice que ninguna rama termina sin mergear y sin borrar. **2 ramas
mergeadas sin borrar** violan la regla. No se borraron: borrar una rama remota
es destructivo y una de las dos es del PO, que puede tener su propio clon.
Queda para Pablo.

**El hallazgo que no es de higiene:** `+N commits` y `CONFLICTO` juntos seembran
"trabajo pendiente grande". Medido archivo por archivo, NO.
`feature/legendary-component-tracker` son 5079 lineas de las cuales **2
archivos (447 lineas) son material que main no tiene** (`js/detail-modal.js`,
`js/legendary-tracker-theme.js`), 3 son IDENTICOS y 11 DIVERGEN. Su trabajo se
hizo de otra forma en main: **no es un merge, es un cherry-pick dirigido de 2
archivos con 11 decisiones por tomar.**

**REGLA: para decidir si una rama se mergea, se borra o se archiva, comparar el
contenido en BASE / RAMA / MAIN**, no contra main a secas. El diff de tres vias
(`main...rama`) compara el MERGE-BASE contra la rama, asi que un archivo que
solo cambio en main aparece como MODIFICA de la rama -- y por la misma razon
una rama ya superada aparece con diferencias.

## ALERT-98 - el filtro de permisos del shell deny con "rm" en un comando sin "rm" (HB#77)

**Fecha:** 2026-10-01 (HB#77)
**Estado:** abierta, sin causa identificada

Un `git show ... > nul 2>&1` fue rechazado con `[HIGH] Shell command contains
'rm'` y **tardo 300s** antes de dar el denial. Revisado el comando: no hay `rm`
en ningun lado. No se por que lo matchea y **no se va a suponer**.

**REGLA: no reconstruir el motivo de un deny.** Repetir la operacion sin la
forma que lo disparo: `> nul 2>&1` y los bucles `for` de cmd no hacen falta
cuando `node` y `git` alcanzan.

## ALERT-97 - `node --check` no detecta un identificador mal escrito (HB#77)

**Fecha:** 2026-10-01 (HB#77)
**Estado:** cerrada en el ciclo

Escribi `newvos` donde iba `nuevos`, en dos scripts seguidos. `node --check` paso
los dos: `newvos` es un identificador **valido**, solo esta mal. El fallo
aparece en ejecucion, cuando el script ya corrio. Peor: el primer "arreglo" borro
el stub `function newvos()` del final y dejo el uso en la linea 86 -- siguiendo
el sintoma, no la causa.

**REGLA: para un script que se ejecuta una vez, `node --check` es un filtro de
SINTAXIS, no de correccion. Se ejecuta.** Y despues de editar se relee el diff
antes de volver a correr. Editar "lo que aparece en el stack trace" en vez de
"el error" deja el archivo igual de roto y con menos pistas.

## ALERT-96 - una regex de pares sobre tablas contiguas inventa pares (HB#77)

**Fecha:** 2026-10-01 (HB#77)
**Estado:** cerrada en el ciclo (`tools/hb77-verify-premisas.js`)

Buscar pares con `/'([^']+)'\s*,\s*'([^']+)'/g` sobre todo `js/storage.js`
devolvio **58 "pares" de los 4 reales**. `storage.js` tiene 4 tablas
clave:valor pegadas y la regex empareja la COLA de una con la CABEZA de la
siguiente. Uno de los inventados: `raid_strike_view <->
gn:wallet:dashboard:selected_currencies`.

**REGLA: una regex que empareja DOS elementos recorta el bloque que declara la
estructura antes de correr.** Una tabla es un objeto literal con `:`, no una
lista. Y un conteo verosimil es peor que un error, porque no se nota.

## ALERT-95 - un script NUEVO con veredicto con apariencia de autoridad (HB#77)

**Fecha:** 2026-10-01 (HB#77)
**Estado:** cerrada en el ciclo

`tools/hb77-rama-superada.js` v1 clasificaba una rama como SUPERADA contando
solo los archivos **NUEVOS** que la rama agrega y main no tiene. Sobre
`docs-estructura-20260930` daba:

```
=> SUPERADA: main ya tiene todo lo que la rama agrega. NO mergear
```

Falso, y con la forma exacta de una orden irreversible: la rama trae
`ORG_MAP.md | 146 +++++` y `PROMOTIONS.md`. Actuando sobre ese veredicto se
borraba trabajo real con la seguridad de estar aplicando una medicion.

**REGLA: el veredicto de un script recien escrito se contrasta contra una
medida INDEPENDIENTE antes de actuar.** Aca fue contra `git diff --stat`, que si
mostraba `104 insertions(+), 44 deletions(-)`. Un `--stat` que contradice a un
script no es ruido: es la senal de que el script mide otra cosa.
tools/hb77-alerts-bloque.md
## ALERT-92 - la limitacion DECLARADA era FALSA, y una guarda que no puede fallar no es una guarda (HB#73)

**Fecha:** 2026-10-01 (HB#73)
**Estado:** cerrada en el mismo ciclo (rama `hb73-alert91-limitacion-real`)
**Origen:** veredicto del Code-Reviewer sobre ALERT-91 (P1, P2, P4) y 3 preguntas de criterio

### (1) La limitacion del stripper era un hecho FALSO, con el caso denegado presente hoy

ALERT-91 declaraba: "no es un parser de JS; no contempla cadenas multilinea con
`//` adentro... 0 backticks pegadas a `//`". Era cierto y no media lo que importa.

La causa real NO es una cadena multilinea: es `//` DENTRO DE UN LITERAL DE UNA
LINEA con codigo real despues. `accounts-panel.js:832`:

    fetch('https://api.guildwars2.com/v2/account/home/nodes?access_token=' + x)

El stripper corta en `//` y se lleva `://api.guildwars2.com/... + x)).json();`.
Medido con `tools/hb73-probe.js`: **20 de los 42 archivos de `js/`** tienen al
menos una linea asi (legendary-data.js 206, raid-tracker.js 64,
strike-tracker.js 34, characters.js 24). No era "este archivo esta limpio": era
"esta funcion esta limpia por suerte".

**Y la direccion del fallo es la peor posible: BORRAR solo puede hacer que un
assert NEGATIVO pase, nunca que falle.** Demostrado, no supuesto
(`tools/hb73-mutate.js`, M1): con el LECTOR CRUDO de la Idea 64 puesto en una
linea con URL, el assert negativo de la seccion 6 **da PASS** y solo la guarda
nueva lo delata. Es el modo de falla de ALERT-91 un nivel mas abajo: la red que
caza el bug queda apagada por el helper que la sostiene.

**REGLA: una limitacion declarada al pie es un comentario que nadie lee; la misma
limitacion CONTADA es luz roja.** Si un helper sostiene un assert, su punto ciego
tiene que ser un assert, medido sobre el texto CRUDO.

### (2) La guarda que NO se puso, porque no puede fallar

El Reviewer propuso como segunda guarda "las llaves del texto crudo balancean".
Medido: eso es **0 POR CONSTRUCCION**. `cuerpoDeMetodo` retorna solo cuando el
depth llega a 0, asi que su resultado siempre balancea. No puede fallar nunca:
es un `ok(true, ...)` disfrazado, la misma enfermedad que este ciclo le saca a
idea61:193 y :235.

**REGLA: antes de agregar una guarda, MEDIR si puede fallar.** Una guarda que no
puede fallar no es una guarda: es prosa con parentesis.

La que si puede fallar compara dos conteos: llaves CRUDAS == llaves SIN
comentarios. Si difieren, hay una llave en la prosa y el extractor esta contando
llaves a traves de comentarios.

Y el caso es serio (`tools/hb73-probe3.js`): **una sola llave desbalanceada
dentro de un comentario hace que el extractor devuelva 709 lineas en vez de 34**,
es decir, se come el resto del archivo. Con un assert POSITIVO eso hace matchear
codigo de otra funcion: el assert pasa sin que la vigilada escriba por Storage.
Signo opuesto, misma enfermedad.

### (3) El censo de idea61 contaba su propia documentacion

`idea61:234` contaba por TEXTO y daba 5. El quinto era `accounts-panel.js`, cuyo
unico match era el comentario que documenta el fix de la Idea 64. El mismo
comment-injection que apagaba el assert de idea64 estaba **inflando el censo de
idea61 en el mismo heartbeat**. Por codigo son **4**, y el `>= 5` seguia verde:
"5 modulos la LEEN a pelo" ya no era verdad desde el fix de la 64.

**REGLA: un censo de TEXTO es un censo de PROSA.** Si el patron que se cuenta
puede aparecer en un comentario que lo describe, el censo se infla solo.

### (4) La regla de ALERT-91, reacondicionada

ALERT-91 prohibia "afirmar un defecto". Eso prohibia un assert SANO que el repo ya
tiene: idea61:234 afirma el defecto a proposito, porque el defecto esta
declarado, tiene dueno (bloquea la 49D) y su significado es "mientras sean >= 4,
no se borra". La pregunta que decide el signo no es el signo del defecto: es si
el defecto tiene **fix en camino** (=> afirmar el invariante) o es **deuda
aceptada con dueno** (=> afirmar el defecto es correcto). Y el ORDEN importa: la
ceguera a la prosa es ANTERIOR al signo, porque un signo correcto sobre un
objetivo que matchea su propia documentacion sigue mintiendo.

Regla vigente, en orden:

1. **Ciego a la prosa**, primero: un regex que nombra un patron matchea la FRASE
   que lo nombra.
2. **El signo**: fix en camino => invariante; deuda aceptada con dueno => el
   defecto se puede afirmar.
3. **Un assert tiene que poder fallar.** `ok(true, ...)` no es una asercion:
   ahora es `nota(...)`, que imprime y NO cuenta (idea61:193 y :235). El total
   era 883 con 2 que no podian fallar y es 883 con 2 que si: mismo numero, red
   distinta.
4. **Cambiar el assert en el MISMO commit** que arregla el defecto que nombra.

## ALERT-91 - Un assert que AFIRMA un defecto es una foto, no una red (HB#72)

**El assert mas peligroso que escribi, y no por lo que afirmaba sino por lo que
hacia.** En `tests/idea64-dos-pestanas.test.js` §6, el ultimo assert decia:

    ok(/localStorage\.getItem\(...'gw2_keys'/.test(ap),
       'accounts-panel.js LEE la legacy a pelo (no por Storage): es el LECTOR CRUDO',
       'ya lee por Storage: el alcance de esta idea cambio');

Dos fallos, independientes, y el segundo es el que lo hacia verde:

**(1) AFIRMABA EL BUG EN VEZ DE FORBIDIRLO.** La condicion es "existe el lector
crudo", y el mensaje lo nombra. Solo puede pasar mientras el bug exista. El dia
que se arregla, la red se apaga — que es exactamente lo que paso: el fix del
mismo heartbeat lo dejo pasando. Un assert que describe un defecto es una FOTO
del defecto, y una foto no avisa cuando el defecto se va.

**(2) NO ESTABA ACOTADO, Y MATCHEABA LA PROSA.** El unico match del regex en
todo `accounts-panel.js` es la **linea 170: el comentario que describe el
fix**. Medido antes de concluirlo (probe sobre el archivo real, no sobre el
diff): el assert dio **PASS con el fix PUESTO**. La red que debia cazar el bug
era la unica cosa que hacia que pasara.

Es el mismo modo de falla que el propio test ya habia corregido para `save()` —
su cabecera dice textualmente *"los asserts estan acotados al CUERPO del metodo,
no al archivo: el bloque de comentario de T1 menciona literalmente `save()` y
`this.list`, asi que un regex sin acotar matchearia la prosa y pasaria por
construccion"* — y que **no aplico 20 lineas mas abajo**, en el mismo archivo.

**Y ACOTAR AL CUERPO NO ALCANZA**, que es lo que se midio en la segunda vuelta:
el comentario del fix vive DENTRO de la funcion, tres lineas despues del `try {`.
Con el fix puesto, el assert acotado al cuerpo seguia dando **1 FAIL**. Los
asserts de la seccion 6 corren ahora sobre `cuerpoSinComentarios()`, un
stripper de comentarios. El limitacion es DECLARADA y medida: no es un parser
de JS; en `accounts-panel.js` hay 71 lineas con `//`, 10 backticks y **0
backticks pegadas a `//`**.

**REGLA (mas general que este caso): un regex que nombra un patron de codigo
matchea tambien la FRASE que nombra ese patron.** Hay tres consecuencias, y las
tres aplican a cualquier assert de este repo:

1. Un assert de CODIGO tiene que ser ciego a la PROSA (strip, o acotar a donde
   el codigo vive Y quitar comentarios).
2. Un assert tiene que afirmar el **INVARIANTE**, no el defecto. La pregunta que
   decide el signo es "que quiero que siga siendo cierto manana", no "que quiero
   ver hoy".
3. Cuando arreglas el bug que el assert nominaba, **el assert hay que cambiarlo en
   el mismo commit**. Si no, el fix se desactiva la red que lo justificaba.

**Corolario sobre el fixture:** el literal `localStorage.getItem('gw2_keys')`
queda **a proposito** en el comentario del fix, justamente para que el helper siga
siendo lo que sostiene el assert. Borrarlo dejaria el test verde y el helper sin
probar. Es el opposite de "limpiar el comentario": aqui la prosa es el test.

## ALERT-82 — un titulo es un ALCANCE, y medir sin leer el texto produce una alarma de magnitud equivocada

**Fecha:** 2026-09-30 (HB#68)
**Estado:** abierta, con el alcance ya acotado
**Tipo:** redaccion / alcance de un dato

**Que paso.** El PO midió las escrituras a `localStorage` de todo el proyecto y
concluyó que el boton de la cache *"va a mentir"*: `removed` y `bytes` describen
las 23 bases del registro, no toda la cache de Pablo. Y propuso tres cubos
(liberado / conservado a proposito / **DESCONOCIDO**).

**La direccion es correcta. La magnitud no, y la premisa le faltaba UNA LINEA.**

Medición propia sobre las bases **declaradas en el codigo**
(`api-gw2.js:1708-1716` y `wizards-vault.js:615`), no sobre el grep:

| | lineas |
|---|---|
| escrituras fuera del registro | **36** |
| de esas, dato del usuario (se conservan a proposito) | **29** |
| de esas, **cache real** en otros modulos | **7** |

El PO habia estimado **13** de cache. Las 7 reales estan en
`characters.js` (MAPS, POIS, PROF_ICONS, RACE_ICONS), `activities.js` (PSNA) y
`app.js` (LS_CURR x2) — **modulos que no son "la API"**, y el boton se titula
exactamente *"Liberar la caché de la API"*.

**La regla.** **El titulo de una accion es parte del alcance del numero que esa
accion muestra.** Medir cuantas escrituras quedan fuera del registro, sin leer
el texto donde el numero aparece, produce una alarma sobre el subconjunto
equivocado: aca daba una magnitud ~2x y mezclaba dato de usuario con cache.

Corolario, y es el que mas cuesta: **el "quedan 36 escrituras fuera" no es por si
mismo un defecto.** 29 de esas 36 son *dato del usuario* y el boton las conserva
a proposito. Un numero de escrituras fuera del registro **no dice si el registro
es correcto**: hay que clasificarlas por lo que la clave **representa**, y esa
clasificacion no sale de ningun grep.

**Lo que se hizo con esto.** No se corrigio el codigo. Se mando al Reviewer como
**pregunta de criterio** (el titulo ya acota el alcance, o hace falta el tercer
cubo) y al PO como la **decision que le corresponde**: si Pablo espera que el
boton libere toda su cache o la de la API. **Esa no es una decision tecnica y no
la tomo yo.**

**Como se evita repetirlo.** Antes de declarar que un numero "miente", leer el
**titulo y el copy** donde se muestra, y clasificar las escrituras por
representacion. `grep localStorage.setItem` no distingue `gh_token_encrypted`
de `PROF_ICONS_CACHE_KEY`.

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
| **ALERT-53** | 🟢 Baja | Data | **Huecos de datos menores en el mismo modulo y la misma capa** que ALERT-51, medidos y **no tocados** para no ampliar el diff: `statues_of_grenth` es `type: "jefe"` pero no tiene drops en `REWARDS_DATA`; `bandit_trio` y `river_of_souls` estan como `type: "evento"` cuando la API los reporta `Boss` (cosmético: icono y color). Y 5 eventos reales no cableados (`camp`, `escort`, `gate`, `soulless_horror`, `voice_in_the_void`), que agregarlos sube el KPI de 30 a 35. | ⏳ **ABIERTA, no bloqueante** | Los 2 primeros son SEO fillers: rellenarlos seria **inventar drops**, asi que no se hizo. Agregar los 5 no cableados **cambia el grid y el denominador del KPI que Pablo ve**: es decision de producto, no del equipo. Anotado en `TEAM_STATUS.md` bajo "Pendiente que requiere a Pablo". |

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
| **ALERT-49** | 🔴 Alta | Codigo / Cache | **El sharding de `ach_meta` (Tramo C) se mergeo SIN validacion del Reviewer, y tenia 2 defectos reales. El Reviewer los encontro despues (`task-329b54da90ef`, veredicto APROBAR CON CAMBIOS) y los 2 se reprodujeron contra el archivo sin modificar: **2 FAIL**. **BUG 1 (media-alta):** dos cargas concurrentes del mismo shard en frio construyen cada una su `bag = {}` local y entran al mismo `inflightOnce` (misma `ikey`), asi que solo el primer llamador muta su bag. El segundo resuelve contra `{}` y **recibe `[]`**. En la app eso es peor que un error: `achievements.js:1069` arma `metaById` con ese array, asi que la cuenta renderiza logros **sin nombre, sin icono y sin tiers**, y `earnedAP` (`:218`) da **0 AP en silencio**. Es alcanzable: `gn:tokenchange` (`:1096`) y `hashchange` (`:1106`) disparan `loadAll()` sin secuencia que serialice el `getAchievementsMeta` de la carga anterior. **BUG 2 (media-baja):** `getCache` devuelve `null` con `nocache` (`:325`) -> `bag = {}` -> `putCache` graba solo los ids pedidos, **encogiendo un shard del que dependen otras cuentas** y generando churn de cuota, justo lo que el commit vino a reducir. Es alcanzable por el boton de refresh (`achievements.js:829`) y por `gn:tokenchange`. **Ademas:** el fix de concurrencia se commiteo SIN tocar el buster de `index.html` ni el header de version, o sea **el fix existia en el repo y no en la app** (el navegador cacheado corria la v2.21.0, que es la que tiene los 2 bugs). | **RESUELTA (HB#48)** | Fix mergeado en `f09eb7c`: la resolucion final **relee cada shard del cache** en vez de usar el objeto local, y el bag **se lee y se mergea siempre**, tambien con `nocache` (un shard depende del id, no de quien lo pide). Ademas se poda al guardar los 5 campos que la API manda y NADIE lee (`bits`, `requirement`, `locked_text`, `prerequisites`, `point_cap`): medido contra la API en vivo, la metadata baja de **1.75 MB a 0.81 MB** (35% -> 16% de la cuota). `api-gw2.js` v2.22.0 con buster, suite **231 aserciones 0 FAIL**. **Verificacion del test, no supuesta:** `git show f98da49:js/api-gw2.js` + `node tests/idea49.shard-concurrency.test.js` = **12 pass / 2 FAIL**; con el fix = **14 pass / 0 FAIL**. **REGLA 1: un merge es merge, no validacion. Sin veredicto del Reviewer, un cambio de capa de datos se considera PROVISIONAL, y el `task_id` se sigue hasta el final.** **REGLA 2 (nueva, la mas economica de todas): el fix y su buster van en el MISMO commit.** Es la version de codigo de ALERT-24 y evita la clase de bug donde se arregla el repo y la app sigue rota sin que nadie lo note. |
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
(ALERT-47) ya nos habituamos a verificar **ramas** contra `main`. Esta vez la
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

Por eso los 3 pedidos quedaron completos a su bandeja y nadie los abrio. El
canal de archivos es durable — sobrevive reinicios y no vence, por eso es la via
primaria — y esa misma propiedad es la que lo hace **inerte**: un mensaje puede
estar en la bandeja del otro, con su `to` correcto y su cuerpo entero, durante
tiempo indeterminado.

> **El canal de archivos garantiza que el mensaje LLEGA. No garantiza que alguien
> lo LEA.** Son dos instancias distintas, y confundirlas produce el modo de falla
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


---

## ALERT-77 — cerrado en el mismo ciclo — un invariante redactado describe mas de lo que el codigo promete

**Donde:** el recambio del Tramo 3 de la Idea 61, escrito por el Principal.

**Que:** el invariante decia *"si y solo si NADIE escribe por afuera"*. La
mitad `si` es cierta; la mitad **`solo` es falsa**, y lo mas grave es que
**"si y solo si" suena a invariante y no lo es**: es un contrato mas fuerte que
el que el codigo entrega, disfrazado de propiedad. `_resyncMirrors` existe
justamente para tolerar escritores externos, asi que el espejo se mantiene
AUNQUE alguien escriba por afuera. Un invariante escrito mas fuerte que la
realidad no falla hoy: **falla el dia que alguien lo lea y construya sobre el**,
que es exactamente cuando el costo es maximo.

**El dato que lo desarma** (y que habia que medir, no suponer): lo que hay que
forbidar no es el escritor crudo de la legacy — que HOY es el que escribe, y sin
el se pierde la lista de cuentas — sino el **LECTOR CRUDO de la `gn:`**, que es
el unico que se saltaria el espejo. Medido: 0 de los 4 pares.

**Corolario, mas general que este caso:** antes de escribir "si y solo si" en un
test o en un `.md`, hay que poder nombrar **la parte del codigo que garantiza la
segunda mitad**. Si no se puede nombrar, no es un invariante: es una Esperanza.
La mitad que si se puede nombrar queda escrita como esta: *"el espejo se mantiene
para todo lector que pase por `Storage`, haya o no escritor crudo"* — y eso es
cierto sin mirar nada mas, porque `Storage.get` lee la legacy primero.

**Cerrado en el mismo ciclo:** el Tramo 3 se reescribio con la forma verdadera
y mergeado (`905dc77` / `5c80ae5`). La idea queda abierta como norma, no como
incidente.

| **ALERT-78** | 🟡 Media | Proceso | **El numero de suite se estaba contando de dos formas a la vez, y la que se citaba como evidencia era la incompleta.** Durante el HB#65 el Reviewer objeto mi `512 aserciones` yuncio un `634` que el repo no produce en ningun estado. **Los dos contaban cosas distintas:** el `512` es el total del runner (`tools/run-suite.js`), que parsea la linea de resumen de cada test con 3 regex y **omite 7 de los 27 archivos** porque usan un cuarto formato (`pass: N \| FAIL: M`); el `634` salio de contar **lineas de salida**, y los tests imprimen una linea de detalle por asercion (`idea61` solo: 37 lineas con la palabra 'pass' y un resumen que dice 36). **Medido sobre los hechos:** `8dd53a0` da **453** del runner y sus 7 archivos sin resumen suman **128** = **581**, que es el numero que cita ALERT-74. Hoy: **512** del runner + los mismos **128** = **640**. O sea que la suite **CRECIO 59** (38 de la 50F + 21 de la 61 T3) y el `512` parecia una baja porque contaba menos archivos. **REGLA: un total de suite tiene que declarar si incluye los archivos que el runner no parsea, y el `exit 0` de cada archivo sigue siendo el dato fiable.** *(HB#66: este alert quedo desactualizado por su propia causa y lo corrijo con la medicion, no con una cuenta nueva. El P3 subio `idea50f` de 38 a 57 aserciones, y el runner ahora da **557** en los 20 archivos que parsea; los 7 no parseados siguen dando **128**. O sea **685/0 en 27 archivos**, no el 640 que decia esta misma fila. Y de paso: el `634` del Reviewer y mi `512` NO se podian sumar ni compararse, porque el Reviewer contaba lineas de salida (que incluyen una linea de detalle por asercion mas el resumen) y el runner cuenta el resumen que declara cada test. Con eso aclarado los dos numeros son ciertos sobre lo que miden, y el `685` de arriba es el unico con alcance declarado. Queda `tools/count-suite-totals.py` commiteado para que la medicion venga con el script que la produce.)* *(HB#71: **esa ultima frase era FALSA y el error era mio** -- verificado con `dir`, `git check-ignore` y `git ls-tree HEAD`: ese archivo **no existe en disco ni en HEAD**, y `tools/.gitignore` lo ignora, asi que nunca entro. La regla que la fila aplicar ("el numero viene con el script que lo produce") era la que la propia fila incumplia. El script que SI produce el total es **`tools/run-suite.js`**, que SI esta trackeado. Ver ALERT-90.)* Un numero de conteo sin alcance declarado no es evidencia: es el mismo modo de falla que las 3 mediciones escritas a mano que ya caimos (ALERT-68). |

| **ALERT-79** | 🟡 Media | Proceso | **Tres veces en un solo ciclo se me colaron tokens de otro idioma dentro de comentarios y de un mensaje a otro agente.** En `characters.js` (`//ommited`), en `app.js` (`pueda同名`) y en el texto que le mande al Reviewer (`脱iro`, `frameworkes`, y un nombre inventado, `los 7Rodriguez`). Los tres pasaron `node --check` porque son **comentarios**, no codigo: la sintaxis no los detecta y la suite tampoco. **REGLA: un `node --check` verde NO dice que un comentario este bien escrito.** *(HB#66, 2a vez: la regla ya existia y la volvi a romper. Se me colaron `我们是` y `采纳` en el mensaje del P3 al Reviewer, que es el TERCER lugar donde me paso: dos en comentarios de `.js` y ahora dos en el cuerpo de un mensaje. Amplio la regla, que era correcta pero incompleta: no basta con releer el DIFF de los `.js`, hay que releer tambien el TEXTO del mensaje, porque un mensaje al Reviewer es un artefacto que el otro va a leer y a citar, y no tiene ni `node --check` ni test que lo verifique.)* Antes de commitear, releer el diff de los `.js` buscando texto que no sea del idioma del proyecto. Es barato y es la unica defensa: ninguna herramienta lo agarra. *(HB#71: **el escaneo sirve, un regex que REEMPLAZA todo el CJK de un `.md` no.** Corri uno sobre `TEAM_STATUS.md` para quitarme de encima un escape mio y **borre la evidencia de un escape ya documentado**: la fila de ALERT-79 cita literalmente los dos caracteres que se me colaron en el mensaje al Reviewer, y el regex los sustituyo por `<dos ideogramas CJK>`. Tuve que restituirla a mano. **REGLA: en un `.md` de este repo el CJK preexistente es EVIDENCIA, no un error: son los escapes que las alertas citan.** La forma correcta es comparar **contra HEAD archivo por archivo** y actuar solo sobre lo que es nuevo, no normalizar el archivo entero. Y `tools/scan-cjk.py` **no cubre los `.md`**: da 0 sobre ellos, asi que el escaneo tiene que correr sobre el `.py`/`.js` que genera el texto, que es donde esta el error antes de que llegue al `.md`.* |
| **ALERT-80** | Á Media | Proceso | **Casi destrozo un `.js` de 1.895 lineas usando PowerShell para hacer una mutacion de test.** Para comprobar que la red `CACHE_PRESERVE` mordia (y no pasaba por construccion) borre una linea con `Set-Content` de PowerShell 5.1 en vez de `edit_file`. Dos cosas salieron bien por suerte y ninguna por criterio: el archivo quedo UTF-8 sin BOM y CRLF intacto, porque `Get-Content -Raw` lo leyo bien. **Si ese archivo hubiera tenido un acento en una cadena de codigo, `Set-Content` lo habria reescrito en cp1252 y el cambio habria sido de cientos de lineas.** Lo detecte comparando `git diff --stat` y contando CRLF antes y despues, y lo restore con Python. **REGLA: en este repo la edicion de archivos va por `edit_file` o por Python con `newline=''`, NUNCA por `Set-Content`/Out-File de PowerShell 5.1.** Esto ya estaba anotado para los `.md` (una vez inflo un diff de 74 lineas a 523) y hoy se cumple para los `.js` tambien: el mismo gate de newline hay que aplicarlo a cualquier archivo del repo, no solo a los markdown. Y el control barato que lo agarro: `git diff --stat` + conteo de CRLF, antes de commitear cualquier edicion hecha por fuera de `edit_file`. |


## ALERT-81 (2026-09-30 22:05 UTC, HB#67) — una asercion mas ANCHA que el invariante falla por una razon CORRECTA

**2 de las 9 aserciones nuevas del P3 fallaron contra el codigo que ya estaba
bien.** No contra un fix roto: contra el fix correcto, por una razon que no
tenia nada que ver con el fix.

- **"la capa NO nombra ningun modulo: sin `WizardsVault`"** -> fallo.
  `api-gw2.js:1658` **si** lo nombra, en `_WV()`, la delegacion WV de
  retrocompatibilidad. El invariante real es *"la LECTURA DEL REGISTRO no nombra
  modulos"*, que vive en el cuerpo de `collectCacheBases`. Escrito sobre el
  archivo entero, el test miente sobre el codigo.
- **"`collectCacheBases()` se llama 2 veces en el archivo"** -> conto 4, porque 2
  eran la definicion y un comentario del header. Contar ocurrencias de un texto
  en un archivo no es medir una llamada: es medir coincidencias.

**Por que importa mas que el FAIL:** un invariante escrito mas ancho que lo que
el codigo garantiza **no falla por el fix, falla por una razon correcta**, y el
que lo lee deduce que el fix esta mal. O sea: la asercion produce una mentira
sobre el codigo, que es peor que no tenerla. Es **ALERT-77 por segunda vez** en
dos ciclos, y la segunda vez la escribi yo.

**Regla: acotar al CUERPO donde vive el fix**, no al archivo — salvo que el
contrato sea del archivo entero, y en ese caso hay que poder **nombrar las otras
razones** por las que ese texto puede aparecer. Las dos quedaron acotadas y ahi
muerden: la red de `wv:season:` da 6 FAIL sin la red, y el registro global da
4 FAIL si la capa vuelve a nombrar al modulo.


### ALERT-79, adenda del HB#67: 2 MAS, y uno SALIO

La regla de ALERT-79 (releer el texto antes de commitear) la cumpli a medias, y
el punto ciego esta justo donde no se lo espera: en el texto que no es codigo.

**Los 4 que arreglar en los `.md`:** `TEAM_STATUS.md:13` (`que改变`), `TEAM_STATUS.md:43`
(`lo名义o`), `ALERTS_LOG.md:477` (`nos習慣`), `COMMS_LOG.md:8` (la fila 069, `el名义o`).
Los 3 primeros venian de commits anteriores; el 4to estaba en un `.md` que yo
mismo iba a commitear en este ciclo. **La regla decia "releer el diff de los
`.js`", y por eso no miraba los `.md`, que es donde estaban los 4.** Amplio: el
chequeo es sobre TODO el texto que se commitea, y la forma de hacerlo es un scan
de CJK/Cirilico, distinguiendo el token REAL de un ejemplo intencional (los 4 de
`ALERTS_LOG.md:572` son los NOMBRES de los tokens, entre backticks, y quedan).

**Y 2 mas, en mensajes a otros agentes:**

- Al Documentador: `No文档es la Idea 49G`. Esa NO salio — el `submit_to_agent`
  fallo antes por el id del agente (`Documentador` con mayuscula no existe), y al
  reenviar lo lei y lo corregi. **Lo salvo un error de plumbing, no el escaneo.**
- Al Reviewer: `el reset本身`. **Si salio**, en `task-2d3619c1f75a`. No lo puedo
  retractionar.

**El patron, que es lo que hay que corregir:** los 6 ocurririeron **bajo carga** —
escribiendo un mensaje largo, con un commit que hacer y un push pendiente. En
NINGUN momento los escribi "reposado". Y el unico que el escaneo agarro fue el
que habia escrito a mano justo antes. **Regla: el scan de CJK/Cirilico va como
paso FIJO antes de CADA `submit_to_agent` y antes de CADA `git commit -F`, sin
importar cuanto de largo sea el mensaje.** Cuesta 2 segundos y es lo unico que
existe: un `node --check` no ve un comentario y la suite no ve un `.md`.

## 2026-09-30 22:28 UTC — ALERT-84 (PO, ronda 17) + ALERT-85

| # | Fecha | Sev | Ambito | Descripcion | Estado | Resolucion / Regla |
|---|-------|-----|--------|-------------|--------|--------------------|
| **ALERT-84** | 2026-09-30 | alta | UI/leyenda | "Armeria Legendaria" es un item de menu **visible** que decia "Cargando catalogo de legendarias..." **para siempre**. Cadena medida: `index.html:750` (item con icono, VISIBLE) -> `router.js:125/1562` (ruta registrada) -> `index.html:528` (section) -> `index.html:988` (script) -> `loadLegendaryData()` es un **stub** que resuelve `[]` -> `renderCatalogSkeleton()` escribe "Cargando" y **nada lo reemplaza**. Sin timeout, sin error, sin reintento. Los 101 KB de `legendary-data.js` (85.813 B, 206 legendarias) y `render-catologo.js` (17.950 B) estan **commiteados y NO cargados**. | **T1 APLICADO Y COMMITEADO** (`d64e688`, verificado en el HB#71: la fila decia "sin commitear" y el commit existia desde el HB#70) | Un error se investiga; un "Cargando" infinito se espera. **Un esqueleto que llega hasta el menu deja de ser un esqueleto**: la idea sana ("base primero, Phase 2 despues") es correcta hasta que `index.html` carga el esqueleto y el router publica la ruta; ahi pasa a ser una PROMESA, y la app no puede retractarla porque no existe el estado "todavia no". Corolatorio para planes: si hay un "Phase 3 Commit 1" en el backlog, la pregunta no es "¿esta el codigo escrito?" sino "¿esta cableado, y contra que?". T3/T4 siguen ABIERTOS (2-4 h cada uno, van al Reviewer). |
| **ALERT-85** | 2026-09-30 | alta | Repo | **ALERT-59 en vivo: DOS ESCRITORES en `gw2-dev`, confirmado dentro de este ciclo.** El PO aviso antes de empezar: *"Working tree tiene M js/settings-manager.js, M tests/idea50-boton-cache.test.js. NO los toque, NO commitee (ALERT-59)"*. Durante el ciclo, `index.html:289` paso a un texto que **el Principal no escribio** (`title="Liberar la cach� de la API y del WV (el boton dice cuantos bytes libera y cuantos quedan)"`, que **PIERDE** el "no toca cuentas, pines ni ajustes"), y `settings-manager.js` subio a `v1.0.4` con un bloque de comentario que tampoco es mio. Los archivos se quedaron quietos (mtime estable en 2 lecturas separadas a 20 s), asi que el segundo escritor termino; pero sus cambios **estan sin commitear en el working tree**. | **ABIERTA — no se commiteo nada** | El Principal **no commiteo** (instruccion explicita del PO) y **no piso** el texto ajeno: la version en disco se conservo intacta y se ajusto el test para que mida el **invariante** ("el title declara que cuentas/pines/ajustes no se borran") y no la frase. **Regla: cuando dos escritores comparten el working tree, la asercion no se escribe pineando la prosa propia.** Un assert que mide *mi* redaccion no es una red: es una firma, y falla por redaccion en vez de por perdida de alcance. |

**Sobre los 2 FAIL de `idea47-commit2` / `idea47-commit4` ("`api-gw2.js?v=` alineado con su header"):**
NO son una regresion de este ciclo. Causa medida: hay trabajo **sin commitear de un ciclo previo** que bumpea el header de `api-gw2.js` a `2.31.0` (`keptBytes`) sin haber bumpeado el `?v=` del `<script>`; el par `settings-manager.js`/`api-gw2.js` esta **coherente** entre si (el `confirm()` usa `dry.keptBytes` y `__cacheClear` lo devuelve), lo que faltaba era el token de cache-busting. Se alineo `index.html:951` a `?v=2.31.0`. En **HEAD** ninguno de los dos archivos menciona `keptBytes`: el working tree tiene un commit entero de mas, no a medio aplicar.



---

## 2026-09-30 22:50 UTC — ALERT-79, quinta vez: la regla estaba escrita y no se cumplio en el ciclo en que la escribia

Cuatro tokens en tres `.md` de este ciclo (un acento raro, dos ideogramas pegados a
una palabra espanola), y un quinto **en cirilico dentro del mensaje que le mande al
PO** (`task-e9cca2150b9a`).

**Lo que lo hace distinto de las cuatro anteriores: no es que el escaneo no existiera.**
El escaneo se creo, se corrio antes de cada commit y agarro los cuatro primeros. Lo
que fallo es el **segundo punto de la regla**, que dice *"el scan va como paso FIJO
antes de CADA `submit_to_agent`"*: **no lo corri antes de los dos `submit_to_agent`
del cierre.** O sea, la regla estaba escrita, la entendia, y aun asi no la ejecute en
el mismo ciclo en que la ratificaba.

**Por que esto ya no es un problema mio:** los otros cuatro se quedaron en un `.md`
del repo, que se releen. Este salio por el canal y **lo lee otro agente**, que puede
copiarlo a su prosa. Un token nuestro en un `.md` se limpia; un token nuestro en un
mensaje entre agentes se propaga a un archivo que no controlo.

**Corregido de forma util:** las notas de ALERT-79 **dejan de reproducir los tokens
que describen**, porque si los escriben entre backticks el escaneo los vuelve a
marcar para siempre y deja de servir como senal — es decir, la documentacion del
problema se estaba vuelve el problema.

**Regla que agrega:** el scan no es un paso de commit, es un paso de **escritura**.
Va antes de escribir el mensaje y despues de escribir el parrafo, y el segundo es el
que se saltea todo el mundo.

 (el segundo escritor se detuvo, y el arbol estaba en ROJO)

**Lo que encontre al retomar:** el working tree tenia 6 archivos modificados y 3 sin
trackear, con **1 FAIL en la suite** (`idea50-boton-cache.test.js`, 62/1), y **el FAIL
era cierto**: `el title declara que cuentas, pines y ajustes NO se borran`.

**Por que ese FAIL no era ruido, era el H1 del Reviewer.** Verificado contra
`task-f61e427b2efc` (veredicto *aprobar con cambios*): H1 pide que el `title` declare
el alcance, y la version en disco de `index.html:289` lo habia perdido — el segundo
escritor sustituyo el parentesis `(no toca cuentas, pines ni ajustes)` por
`(el boton dice cuantos bytes libera y cuantos quedan)`. Los bytes son ciertos y
utiles; lo que se perdio fue la **otra mitad del alcance**, y sin ella el registro de
la P3 borra por prefijo y el usuario no tiene forma de saber si su cuenta sobrevive.

**REGLA: un FAIL en un test que otro writer escribio no se resuelve/gitando el test.
Se resuelve preguntandose que INVARIANTE pretendia medir.** Este no era una asercion
mala: era el unico testigo de que el alcance se estaba perdiendo, y la unica razon por
la que el bug no llego a `main`. Bajarlo a "0 FAIL" habria sido exactamente el bug.

**Como se resolvio, sin pisar al segundo escritor:** el parentesis quedo **aditivo**.
`(no toca cuentas, pines ni ajustes; el boton dice cuantos bytes libera y cuantos
quedan)`. No se borro ni una palabra de lo que el otro habia escrito: la clausula de
bytes sobrevive y el alcance vuelve. Commit `46b2d7f`.

**El segundo escritor se detuvo, y eso se midio, no se supuesto:** `mtime` de los 6
archivos **identico en 3 lecturas separadas** a lo largo de ~3 minutos (19:30:27,
19:30:45, y el cierre). Con el arbol quieto, "no commitear" dejo de ser prudencia y
paso a ser WIP huerfano — que es lo que la propia regla de AGENTS.md prohibe.

**Lo que si quedo SIN commitear, a proposito:** `ORG_MAP.md.bak-20260930-chatadmin`
(backup, no es codigo). Y la rama `feat-idea50-boton-cache` sigue **SIN MERGEAR a
proposito**: ahora tiene el H1 y el H2 corregidos, que era la condicion que puso el
Reviewer para mergear.

**Reflexion sobre el propio ALERT-85:** la nota original escribio la regla correcta
(*la asercion no se escribe pineando la prosa propia*) y aun asi el test que quedo en
disco pineaba `no toca[^)]*`. Una regex mas floja que la frase exacta sigue siendo una
firma si el otro writer puede cambiar el parentesis entero. **La version de esa regex
que sobrevive es la que pregunta por el INVARIANTE QUE SIRVE** (el alcance esta
declarado en el boton), no la que busca una forma de escribirlo.

## ALERT-87 — un newline detectado en el sitio equivocado infla el diff a 500 lineas (HB#70)

**Lo que paso.** Al actualizar `COMMS_LOG.md` con un script que detecta el
newline del archivo que va a escribir, el diff salio de **4 lineas a 500**
(252 inserciones, 248 borradas) sobre un archivo al que solo se le agregaban dos
filas al final. El archivo no estaba corrupto: estaba **intacto**.

**Causa raiz, y es la que hay que corregir.** El detector leia los BYTES DEL
WORKING TREE. Este repo tiene **`core.autocrlf=true`**: el **repositorio guarda
LF** y el working tree materializa **CRLF**. O sea, el working tree miente
sobre el contenido que se va a commitear, y leerlo da la respuesta **invertida**.
Un detector de newline que lee el disco en vez de leer **lo commiteado** no
detecta el newline: detecta el del checkout.

**Por que la regla anterior no la cubria.** La regla de AGENTS.md dice "leer el
newline del archivo con el que vas a escribir". Es correcta, y durante anos fue
suficiente **mientras el working tree coincidia con el repo**. Con `autocrlf`
activo, "leer el archivo" y "leer lo que se commitea" son dos cosas distintas, y
solo la segunda importa para el diff.

**La regla que queda:** el newline se decide contra **`git show HEAD:<archivo>`**
(o el byte que se va a stagear), nunca contra los bytes del working tree. En
este repo el resultado es siempre **LF**, y la comprobacion de 1 linea
(`git show HEAD:X | python -c "import sys;b=sys.stdin.buffer.read();print(b.count(b'\r\n'),b.count(b'\n'))"`)
lo confirma antes de escribir 40 lineas de script.

**Como se detecto, y por que importa el detalle.** No por el `git diff --stat`,
que es el sintoma: un `assert` de newline **falla**, `io.open(...).read()` no
falla, y `git diff --stat` se ve "grande". La cadena fue: el `assert` del
working tree PASA (por eso la primera version del script corrio y escribio),
el archivo quedo con CRLF donde el repo tiene LF, y el unico sintoma fue un
diff inflado. **Un assert que pasa sobre la lectura equivocada es peor que sin
assert**, porque da una garantia falsa.

**Lo que NO es este ALERT.** No es el criterio de los `.md` "no son todos
iguales" (que sigue en pie por archivo), ni un problema de codigo de producto:
`PROMOTIONS.md` y `TEAM_STATUS.md` tenian CRLF en el working tree tambien, y el
repo los tiene en LF, asi que los dos se corrigieron con el mismo fix.

## ALERT-88 — Un veredicto que nombra lineas de un arbol que ya no existe

**Estado:** abierta. Mergeado igual, y el resultado es correcto. Lo que queda es
la forma del veredicto, que es lo que casi me costo trabajo de mas.

**Que paso.** El veredicto del Reviewer sobre la Idea 50 (`task-f61e427b2efc`,
APROBADO CON CAMBIOS) tiene dos bloqueantes: H1, el `title`; H2, la linea de
`kept` que enumeraba categorias. **Los dos YA ESTABAN APLICADOS** en `46b2d7f`,
un commit ~4 h ANTERIOR al veredicto. Mergeado `950ea64` sobre `main` sin tocar
codigo: no habia nada que cumplir.

**La prueba, que es un detalle y por eso la guardo.** El Reviewer cita
`settings-manager.js:543` con el texto

    '• Se conservan ' + dry.kept + ' claves: cuentas, pines, tema y ajustes'

Hoy la linea 543 es un comentario, y esa linea es la **567**, que ya dice

    '• Se conservan ' + dry.kept + ' claves (' + fmtBytes(dry.keptBytes) + ')'

Lei el archivo DESPUES de que el commit existiera y aun asi VIO el texto viejo.
**Lo que se aplica no es lo que se nombra.** Sin el numero de linea el
veredicto habria sido lo mismo de correcto y de accionable; el numero de linea
es lo que permitio leer un arbol sin leerlo.

**Por que no es un reclamo por el resultado.** Los 2 bloques son los que pidio,
y H2 quedo mejor de lo que pidio: la enumeracion de categorias se cambio por
`keptBytes`, que sigue siendo cierto cuando manana un modulo registre su clave
(una lista de categorias deja de serlo en el mismo commit que la cambia). El
merge no estaba en riesgo.

**REGLA.** *Un veredicto tiene que llevar el commit al que se aplica en la
primera linea.* Sin eso no hay forma de distinguir "esto ya esta" de "esto
falta", y el segundo caso se resuelve tocando codigo que ya funciona o —peor—
revirtiendo un arreglo mejor por un pedido que se callo. Corolario para el que
lee: **antes de aplicar un veredicto, `git log -1 --format=%cI <commit>` y
comparar con el `replied_utc` de la respuesta.** Si el commit es anterior, el
veredicto habla de un arbol que ya no esta: releer el archivo, no el informe.

**Lo que si aprovecho del veredicto, y es H3.** El inventario de 6-7 modulos
del Reviewer era MAS COMPLETO que el mio, y la diferencia resulto real. Medi
`tools/idea50-censo-claves.mjs` clasificando cada clave por la FORMA de lo que
se escribe en vez de por su nombre: **3 familias que el nombre no delata** estan
en `homestead-tracker.js` (`gn:homestead:decorations|categories|glyphs`, las
tres `{ts, data}`). Mi criterio las contaba como "dato de usuario" — o sea
PROTEGIDAS por una frase que el boton no dice. Con las dos: 11, no 8.

**Y el hallazgo que va contra el numero que yo iba a publicar:**
`homestead-tracker.js` **no lo carga `index.html`** (ni el `<script>`, ni el
panel `homesteadTrackerBody`, ni la ruta en `router.js`: los tres ausentes). Es
codigo muerto — la novena verificacion del PO. Sus 3 claves **no ocupan disco
hoy**, asi que el headline sigue siendo **8 familias en 3 modulos**, y las 3
restantes quedan NOMBRADAS con el motivo en vez de restadas en silencio: si el
modulo se carga manana aparecen +3 y el numero tiene que saltar a la vista.

Es la regla de las unidades, aplicada a un caso que no habia considerado: un
numero de "familias de cache" tiene que declarar **si se escriben hoy**, no solo
cuantas hay en el codigo. El censo ahora separa `CACHE_POR_FORMA` y excluye del
headline lo que esta en modulo muerto, nombrandolo.

**Correcciones aplicadas.** Criterio por forma en el censo; filtro de salida
`startsWith('CACHE')` en vez de `=== 'CACHE'` (un `===` hacia desaparecer las 3
del titulo SIN que ningun assert lo notara — un numero que baja y nadie mira);
`tests/alert86.censo-clasificacion.test.js`, 29 aserciones, **fase roja 7 FAIL
contra `3bdafca`** (3 del criterio + 4 de las citas). Suite **822 / 0 FAIL,
30 de 30 archivos**.

**Citas de linea sin unidad (PO, HB#69).** Las 3 citas de `index.html` en el
test de ALERT-84 eran ciertas en `main@d328969` y falsas en la rama: el boton de
cache suma 11 lineas antes de todo lo demas (750 -> 761, 528 -> 539,
988 -> 999). `router.js:125` no se movio. El contraste que lo prueba esta en el
mismo commit: `settings-manager.js:550` cita `index.html:289`, que SI es cierto
en la rama. Mismo repo, dos citas, una correcta y otra no: **no era una regla
del equipo, era si estabas mirando el archivo del commit o el de `main`.** El
merge las dejaba falsas para siempre. Corregidas a las de este arbol, y las dos
citas (test y `legendary-tracker.js`) **declaran que arbol son**. La cita nueva
no es decorativa: el test verifica que `index.html:761` siga siendo el item de
menu, asi que si un merge futuro las mueve, el test lo dice en vez de mentir.


## ALERT-89 - El invariante de encounters estaba vigilado en UNA sola direccion, y la aritmetica lo hacia invisible

**La Idea 52 dejo el catalogo de raids midiendo que "todo encuentro del modulo
existe en la API"** (direccion `app -> API`, los fantasmas). **La mitad inversa no
estaba vigilada**: que no haya un evento de la API que el modulo no declare. Y no
era un detalle de redaccion: las dos mitades dan el mismo numero.

| Medida | Valor |
|---|---|
| encuentros que declara el modulo (`ALL.length`) | 30 |
| eventos del catalogo de la API (`API.size`) | 30 |
| **fantasmas** (`app -> API`, vigilado) | 1 -> `vloxx`, en la allowlist |
| **faltantes** (`API -> app`, NO vigilado) | 1 -> **`camp`**, en ninguna parte |

Los dos totales coinciden **y hay un id equivocado en cada lado**. La constante
`ALL.length === 30` es justamente la que hace esto parecer seguro: es una
**asercion que pasa por construccion** (misma familia que ALERT-77). Cuenta los
encuentros, pero cuenta **los dos lados por separado y nunca los compara**.

**Lo que mas importa: `vloxx` NO estaba roto.** La ronda 17 del PO lo marco como
roto y como "el fix mas urgente del backlog". Es una decision de producto
**medida** -- `/v2/raids` no expone el ala Nexus of Eternity -- y el test la
tenia fijada desde antes (`idea52:110` en `FANTASMA_CONOCIDO`, y `:145-147` que
afirma que `vloxx` NO esta en la API, medido, no supuesto). Lo que si estaba
roto era **la otra mitad, que nadie miraba**.

**`camp` NO se agrego, a proposito.** El fixture congelado
(`tests/fixtures/raids-catalogo-2026-09-30.json`) lo trae como
`{"id": "camp", "type": "Checkpoint"}`: **sin `name`**. Agregarlo al modulo
obligaria a inventar el nombre y el icono, y un hallazgo con datos inventados es
peor que un hueco declarado. Queda en `FALTANTE_CONOCIDO` con el motivo escrito,
igual que `vloxx` esta en `FANTASMA_CONOCIDO`; **la lista es la allowlist, asi
que cualquier OTRO faltante nuevo falla igual que un fantasma nuevo.**

**REGLA: cuando un invariante es una relacion entre dos conjuntos, "A ⊆ B" y
"B ⊆ A" son DOS invariantes, y el que no se vigila es el que puede fallar con
la suite en verde.** La asercion que cuenta los elementos de A no dice nada de
B. Y el sintoma es indistinguible del modulo sano: la cuenta cuadra.

Fase roja: la guarda sin allowlist da **1 FAIL nombrando `camp`**. Con la
allowlist, `35/0`. Suite **823/0 FAIL, 30 de 30 archivos** (era 822).
Commits: rama `alert89-direccion-inversa-raids`, `1176be6`.
Scripts que producen la medicion, con el commit: `tools/alert89-direccion-inversa.py`
(las dos direcciones contra el fixture), `tools/alert89-camp-dato.py` (por que
`camp` no se agrega).


## ALERT-90 - Tercera instancia de ALERT-88, y esta es mia: una ALERT que cita un script que NUNCA fue commiteado

ALERT-88 (HB#70) fue "un veredicto que nombra lineas de un arbol que ya no
existia". Esta es la misma regla y el artefacto es otro: **una fila de
`ALERTS_LOG.md` que afirma el estado de un archivo sin mirarlo.**

La fila de **ALERT-78** cierra diciendo:

> *"Queda `tools/count-suite-totals.py` commiteado para que la medicion venga con
> el script que la produce."*

Verificado en el HB#71, con tres comandos y no uno:

```
dir /b tools\count-suite-totals.py        -> NO-EXISTE-EN-DISCO
git check-ignore -v tools\count-suite-totals.py
        -> tools/.gitignore:1:*  "tools\count-suite-totals.py"
git ls-tree HEAD tools/ --name-only | findstr /i count   -> (vacio)
```

**No esta en disco, no esta en HEAD, y `tools/.gitignore` lo ignora**, asi que
tampoco es un archivo que "se perdio al borrar una rama": nunca entro. Y la
regla que la fila estaba aplicando -- *el numero tiene que venir con el script
que lo produce* -- es **justo la que la propia fila incumple**.

**El script que SI produce el total es `tools/run-suite.js`, y SI esta trackeado**
(es el que corre los 30 tests e imprime `TOTAL: N aserciones / M FAIL`). Asi que
la correccion no es crear el script fantasma: es **corregir la cita** para que
apunte al artefacto real.

**REGLA: cuando una fila de un log dice "queda commiteado", el commit tiene que
existir Y hay que haber mirado el archivo.** Es la misma regla de `IN_PROGRESS.md`
apuntando a un clon que ya no existia (ALERT-71) y de TEAM_STATUS declarando un
merge que no estaba. **Un `.md` propio es una hipotesis mia sobre el disco, no un
dato** -- y el disco es el unico que la puede refutar. Un numero de suite sin el
script que lo produce es un numero de oido (ALERT-68, ALERT-78), y un nombre de
archivo sin el archivo es el mismo numero en el eje equivocado.

---

## ALERT-93 - un 0 FAIL de una mutacion hay que verificarlo por ALCANCE antes de culpar al assert

**Severidad: medio. Tipo: metodo de verificacion (el que mas caro sale, porque
uno "arregla" el assert que estaba bien).**

Cicuito: la mutacion del bug reintroducido sobre una linea que tiene una URL
(`'https://...'`), que es justamente el punto ciego que el Reviewer senalo.
El resultado fue **0 FAIL**, o sea "la guarda nueva no tiene dientes".

**No era cierto, y el assert estaba bien.** El assert esta acotado al **cuerpo de
`syncAccountTagsToKeys`**. La linea de la URL (`accounts-panel.js:832`) esta en
**otra** funcion. Puse el bug ahi: fuera del alcance del assert. Repetida dentro
del cuerpo, sobre una linea con URL: **1 FAIL**, y el FAIL lo produce la guarda,
no el assert negativo -- que es exactamente el comportamiento que la guarda
existia para dar.

**REGLA: un 0 FAIL de una mutacion no se lee como "el assert no sirve". Se lee
como "la mutacion no cayo donde el assert mira".** Si el assert esta acotado a una
region (cuerpo de un metodo, bloque, archivo), la mutacion tiene que caer dentro de
esa region; si no, el resultado no prueba nada en ninguna direccion. Y el chequeo
es una linea: `la linea donde meti la mutacion esta dentro del alcance del assert?`

Corolario del mismo modo de falla: **acabar de escribir el assert engendra la
gana de que el rojo sea mio.** El orden correcto es verificar el alcance de la
propia mutacion ANTES de concluir sobre el assert, no despues de ver el verde.

---

## ALERT-94 - un `open(path,'w')` en Windows rompe los newlines del archivo entero, y `git status` NO lo denuncia

**Severidad: medio. Tipo: tooling/probe. Reincidencia de ALERT-87 (escritura), y
la variante que faltaba: la restauracion.**

Restaurando una mutacion temporal con Python, `open(path,'w')` tradujo los `\n`
a `\r\n` en las 873 lineas de `accounts-panel.js`. Los dos senales que se
esperan NO los}dieron:

- `git diff --stat` -> "1 insertion" (dice una verdad parcial, pero no la del fallo)
- `git status` -> **limpio**, porque `core.autocrlf` normaliza y para git el
  archivo queda identico a HEAD

**El archivo estaba modificado en disco y git no lo decia.** Se detecto porque el
`assert` del needle falló (`found 0`): el needle llevaba `\n` y el archivo ya
estaba en CRLF. O sea, **el sintoma se manifesto en otro probe**, no en el que
escribio.

**REGLA: ningun probe abre un archivo del repo para escribir sin pasarle
`newline=''` (o en `rb`/`wb`), y despues de escribir se verifica con bytes, no
con git:**

```
open(p,'rb').read() == subprocess.run(['git','show','HEAD:'+p],capture_output=True).stdout
```

**`git status` limpio NO es prueba de que un archivo del repo este intacto** --
con `autocrlf` es consistente con un archivo reescrito entero. Y un `assert` que
falla porque el needle no matchea es una senal de que el archivo cambio de forma,
no solo de contenido: leer ahi antes de suspectar del needle.


### ALERT-101 - la gn: de una preferencia se escribia una vez y se congelaba: no habia lector, y por eso no se veia

**MEDIDO (`tools/hb78-censo-claves.js`; ojo: `tools/` esta en `.gitignore`, asi
que el script es local y no se puede correr desde el repo — hay que rehacerlo):**
`raid_strike_view` aparece en 2
lineas de `raid-tracker.js` y en 2 de `storage.js`
(`MIGRATION_PREFIXES:122`, `FALLBACK_MAP:180`). **No esta en `MIRROR_MAP`**
(`:209-214`, 4 entradas, ninguna de raids). O sea: la migracion la escribia UNA
vez, en el arranque, y el modulo seguia escribiendo la legacy a pelo. La gn: queda
congelada con la foto de la primera sesion para siempre.

**Por que no se nota:** porque no hay NINGUN lector fuera de `storage.js`
(contado en el test, seccion 5). Un dual-write sin espejo se comporta bien y por
eso nadie lo reporto. Lo dangerouso es hacia adelante: el primer lector que se
agregue recibe un valor viejo, y no hay forma de saber por que.

**Corregido** en `f9239d7`. Lo que se aprende: "esta en `MIGRATION_PREFIXES` y
en `FALLBACK_MAP`" **no** es lo mismo que "esta en `MIRROR_MAP`". Los tres mapas
garantizan cosas distintas, y solo `MIRROR_MAP` escribe las dos. El propio codigo
lo dice en `storage.js:416`: *"para las claves de `MIRROR_MAP` eso es exactamente
la condicion de congelacion"*. La condicion estaba escrita y se citaba con el
nombre del mapa equivocado. **Citar un mapa sin decir cual es una categoria, no
una cita.**

### ALERT-102 - una premisa heredada del PO traveled 3 documentos antes de que alguien la midiera

La ronda 20 afirmo que `gn:raids:strike:view` y `gn:converter:state` estaban "en
`MIRROR_MAP` en las dos direcciones". **Falso**, y el PO lo corrigio el mismo en
que se lo pregunte. El error viajo de `PRE_BACKLOG` a `DASHBOARD_PO_IDEAS` a la
fila 081 de `COMMS_LOG`, donde el Reviewer lo trato como-premise a corregir, y a
la fila 079, donde became la justificacion de un "fix de 3 lineas" que incluia
arreglar `raid-tracker.js:891`.

**Lo que salio de medirla (y era al reves):** la clave que NO esta en
`MIRROR_MAP` (`raid_strike_view`) es la que TIENE el bug real. La que SI esta
(`gw2_selected_key_v1`) no lo tiene: alli el acceso a pelo y `Storage` devuelven
lo mismo porque el espejo se lee primero. O sea que el fix "de 3 lineas" iba a
cambiar 2 lineas a Useful y 1 a la nada.

**REGLA:** una premisa que se cita por nombre de clave y por numero de mapa es
una cita, y se mide antes de actuar. Un nombre de clave sin mapa no dice nada, y
un numero de mapa sin midirlo puede ser de otro mapa.

## ALERT-103 - un harness de mutacion que se auto-verifica tambien puede BORRAR el trabajo, y el falso "restore OK" lo tapo

Ciclo #79. Escribi un probe de mutacion para comprobar que quitar `app.js:1067`
no debilitaba la red de tests. La version 1 copiaba `js/` y `tests/` a un temp y
corria la suite ahi: la base salio en **ROJO (6 FAIL)** porque los tests leen
archivos de la RAIZ del repo (`index.html`, css). Copiar parcialmente rompe el
contexto del test. La version 2 muta **en el worktree real** y restaura con
`git checkout -- js/app.js`.

Las 4 mutaciones murieron (6 / 2 / 1 / 1 FAIL), que era el objetivo. Y en el
`finally` el script imprimio `RESTORE FALLIDO: 61913 != 61686`.

**Lo que paso:** el fix de `app.js:1067` estaba en el worktree SIN commitear.
`git checkout --` no lo "--restaura": lo **descarta**, porque para git lo
commiteado es la verdad. El probe borro 3 lineas de trabajo real. Y lo peor es
el modo de fallo: los bytes que compare son los del **original leido al
arrancar el script**, o sea que el chequeo era correcto y aun asi el trabajo
estaba perdido, porque el "original" no estaba en ningun lado salvo en mi
variable. Reaplique el parche y recien ahi commitee.

**REGLA: antes de mutar el arbol, el cambio tiene que estar COMMITTEADO, y el
restore se verifica con `git status --short` en el mismo script.** Un harness
que se auto-verifica no es una garantia: se auto-verifico *y* perdio el trabajo,
porque verifico que el archivo volviera a lo que el script creia, no a lo que
git creia.

Corolario del mismo probe: un harness cuya BASE esta en rojo no prueba nada,
por bueno que sea el resto. Por eso el script aborta si `base !== 0` antes de
mutar, en vez de reportar el numero de la primera mutacion.

## ALERT-104 - el repo tiene 4 formatos de resumen de suite, y el que parsea 1 da un numero con 300 de diferencia

El Reviewer reporto la suite en **1029 aserciones / 36 archivos**. Mi primer
contador dio **728**, y mi segundo dio **1048**. Ninguno de los dos era el
numero real de entrada, y el 728 semia "el suite esta bien" cuando en realidad
estaba ignorando 14 archivos de 37.

Causa: los test files no comparten un formato de resumen. Hay cuatro:
`"N pass, M fail"`, `"N pass / M FAIL"`, `"N aserciones, M FAIL"` y
`"pass: N | FAIL: M"`, mas dos variantes con `OK` en vez de `pass`
(`"--- N OK / 0 FAIL ---"`, `"TODO OK: N OK / 0 FAIL"`).

El numero correcto, medido: **1048 pass / 0 FAIL en 37 de 37**. Reconcilia
exactamente con el del Reviewer: `1029 + 19` (el test hb77 que el Reviewer no
tenia, porque audito antes de que yo lo mergeara) y `36 + 1` archivos. Esa
cuadra es la prueba de que el numero no es inventado: dos mediciones
independientes que sourceden de contextos distintos.

**REGLA: un contador de suite que no recognize TODOS los formatos devuelve un
numero que parece autoritativo y no lo es.** Antes de reportar un total,
imprimir cuantos archivos quedaron SIN parsear; si es > 0, el total es una
cota inferior, no un total. Un numero de suite mas chico que el de otro
investigador no es "menos tests": es "no los leí".

## ALERT-105 - un harness armado copiando CSS a mano dio 98,9% del viewport cuando la cascada real da 28,1%

**Que paso.** Para responder si el toast de la puerta de permisos se estira a
pantalla completa, arme un HTML con las 2 reglas `.toasts`/`.toast` de
`css/theme-polish.css`, copiadas a mano. Medido: **1266 px de ancho en un
viewport de 1280 = 98,9%**, 85 px de alto. Con ese numero, la respuesta a la
pregunta del Reviewer era "si, se estira, y por eso `ttl:0` dejaria un banner
permanente".

**Falso.** `css/main.css:461` declara `max-width:360px` en `.toast`, y
ninguna regla posterior lo pisa: la cascada real da **360 x 235 px = 28,1% del
viewport, 10 lineas de texto**. El harness no reproducia la pagina porque le
faltaba la mitad del CSS.

**Por que importa mas que el numero.** Es la **tercera vez en tres ciclos que un
dato se transcribe a mano en vez de ejecutarse**, y las 3 con la misma firma:
- ALERT-100: un script escribio la RUTA de un archivo donde iba el CONTENIDO.
- Fila 083 (Reviewer): midio 356 chars sobre una superficie que nunca llegaba
  a la pantalla.
- Esta: copie 2 reglas de CSS y omiti las otras 2 que estan en otro archivo.

Las tres se corrigieron con la misma regla y no por buena voluntad: **extraer
del original y ejecutar, nunca transcribir**. `tools-hb80/hb80-cascada-real.js`
extrae la cascada de los 2 CSS con una regex de bloques, imprime las 6 reglas
que matchean `.toasts?` en orden de cascada (con el orden de carga verificado
contra `index.html`, no supuesto) y arma el harness con eso. Si el CSS cambia,
el numero cambia solo.

**Corolario sobre las citas.** La premisa del PO ("`.toasts` no tiene
`max-width`) era incorrecta y yo la medi como si fuera cierta durante medio
ciclo. Una cita de un archivo al vuelo se contrasta con un `git grep` de 10
segundos ANTES de darla como premisa. Y cuando la cita es del CSS, el
`grep` no alcanza: hay que resolver la cascada, porque el archivo donde uno
mira no es el archivo donde gana.

## ALERT-106 - un harness declaro "base en verde" sobre una corrida que no ocurrio, y|reporto| 7 mutaciones vivas

**Que paso.** El harness de mutaciones de este ciclo paso dos controles y no
corrio un solo test:

1. `correr(t)` anteponia `'tests\\'` a un path que ya traia `'tests/'`. Node
   pedia `tests/tests/hb80-....test.js` y tiraba `MODULE_NOT_FOUND`.
2. El chequeo de la base era `fails(out) === 0`. Un `MODULE_NOT_FOUND` **no
   produce ningun FAIL: da 0**. O sea que el control de "la base esta en verde"
   daba OK sobre una corrida inexistente, y las **7 mutaciones quedaron
   marcadas como SOBREVIVIENTES** cuando en realidad no se midio nada.

**Por que es la peor clase de falla.** Es la segunda vez en dos ciclos que un
harness se auto-verifica y la auto-verificacion no verifica (ALERT-103: el
restore comparaba los bytes contra un snapshot en memoria y no detecto que el
propio harness habia borrado el fix). Un harness que dice "OK" cuando no ocurrio
nada es peor que uno que no dice nada: **convierte un error de andamiaje en un
resultado con formato de hallazgo**.

**REGLA (queda escrita para todos los harnesses de este repo).** "Verde" se
declara exigiendo las TRES condiciones, no una:
1. `exit code === 0`;
2. existe la linea de resumen con el patron esperado (si no hay resumen, el
   resultado es **INDETERMINADO**, y se reporta como tal, no como 0 fallos);
3. el archivo de test existe.
Y el resultado de una corrida debe poder ser `INDETERMINADO` como categoria de
tercer tipo, al lado de `VIVE` y `MUERE`. Con las tres condiciones, la v2 del
harness dio **7 de 7 MUEREN** con numeros por mutacion.

## ALERT-107 - el runner de suite cuenta 37 archivos y no ve 2: el total es cota inferior, y ahora el riesgo cambio de lado

**Estado.** `tests/_run-all.js` cuenta lineas que arrancan con `OK`/`PASS`
(ALERT-61, que prohibio parsear los 4 formatos de resumen distintos). Resultado
de este ciclo: **999 pass / 0 FAIL en 37 archivos contados, de 37 existentes**.
Los dos que no entran:
- `alert86.censo-clasificacion.test.js`: imprime sus 31 aserciones como
  `[1] titulo` en vez de `OK`. Corre bien: **31 pass**. El runner lo marca
  "SIN ASERCIONES" y lo cuenta 0.
- `idea84-leyenda-pipeline.test.js`: hace un **fetch real** a la API de GW2 y
  en este entorno fallo (`FetchError: 1 de 3 ids pedidos no volvieron`), asi que
  no emitio ninguna asercion. Es **dependiente de la red**: su total cambia
  entre corridas y entre maquinas.

**Por que lo dejo anotado y no lo arreglo.** Arreglar el primero es cambiar la
forma de imprimir de un test que no es mio; el segundo necesita un snapshot
local que genera `python js/_fetch_legendary_items.py`. Los dos son de otro
alcance que este ciclo. Lo que **no** es de otro alcance es la consequence:
**999 es una cota inferior y asi hay que reportarlo.**

**La regla de ALERT-104 era la del caso inverso, y aqui se cumple al reves.**
Ahi: un total mas chico que el de otro investigador = "no los lei". Ahora:
un total mas chico que el de ayer (1048) = "el runner dejo de ver 2 archivos",
no "se perdieron 49 asserts". Y el numero cuadra por la via corta: **965 base +
23 del test de cuentas + 11 del de permanencia = 999**. Los 3 numeros se
suman contra una medicion previa, que es la unica forma de que un total sea un
dato y no una cifra.

## ALERT-108 - `!important` en la capa 2: no es un hallazgo, y casi lo mandé como tal

**Estado.** Hipótesis minha al ver `.panel-head { ... !important }` en
`theme-polish.css`: "la capa de piel viola la regla de no-`!important` de
AGENTS.md". Medido antes de escribir la pregunta al Reviewer: `theme-polish.css`
tiene **~50 declaraciones `!important`** (líneas 106, 145, 146, 203, 209, 312,
441, 447 y muchas más).

**Por qué la hipótesis era falsa por partida triple.** No es una violación
aislada: son decenas. No es necesariamente indebido: buena parte es
deliberada. Y **el propio archivo documenta una eliminación de `!important` en
curso** (comentarios en `:1466`, `:1499`, `:1509`, `:1521`). O sea, es una
decisión del equipo con un plan escrito, y yo estaba por reportar una de sus
líneas como defecto.

**Regla.** Un `grep` que encuentra **muchas** ocurrencias de una regla violada no
está simulando un defecto: está describiendo una política. La pregunta "¿esto
viola la regla?" **solo tiene sentido para un hallazgo puntual y contextual**. Y
la pregunta que sí valía la pena, y que seeral Reviewer, no era por el
`!important` sino por la regla de capas: el defecto de `.toasts` fue la **capa 2
siendo dueña de una propiedad estructural** (`z-index`), no el `!important`.

## ALERT-109 - `ALERT-107` estaba en parte FALSO: los 2 tests sí emiten resumen, y el "cota inferior" de ayer era artificial

**Estado.** `ALERT-107` afirmó que 2 tests "no emiten asercion en el formato que
parsea", y de ahí a reportar 999 como cota inferior. **Los dos emiten linea de
resumen, y los dos se parsean sin problema:**

- `tests/alert86.censo-clasificacion.test.js` → **`31 pass / 0 FAIL`**, exit 0.
  Imprime sus aserciones como `[1] título` y ADEMÁS cierra con el resumen. No
  "no emite aserciones": el runner de ayer contaba lineas que arrancan con
  `OK`/`PASS` (por ALERT-61) y por eso no veía la linea de cierre.
- `tests/idea84-leyenda-pipeline.test.js` → **`46 pass, 0 FAIL`**, exit 0, **con
  el `FetchError` en stderr** (`1 de 3 ids pedidos no volvieron`). O sea: la
  premisa de ALERT-107 de que "el fetch falló, así que no emitio ninguna
  asercion" es **falsa**: el test tolera el id faltante y afirma 46 cosas igual.
  Lo que sí es cierto, y sigue valiendo, es que es **dependiente de la red**: su
  aporte puede variar entre corridas.

**Consecuencia sobre el total.** Ayer se reportaron 999. Sumando los 2 archivos
que el runner no contaba: 999 + 31 + 46 = 1076. El total de hoy es
**1094 pass / 0 FAIL, 40 de 40 archivos, 0 INDETERMINADOS**, o sea **exacto**, no
cota inferior.

**La descomposición fina NO cuadra y no se maquilla.** 999 + 46 + 31 + 16 (el test
nuevo) − 4 (el de permanencia bajó de 11 a 7 aserciones al repararse) = 1088, y
lo medido es 1094. **Quedan 6 sin explicar y no los persigo**: preferí reportar
el residuo escrito a inventarle una causa. La parte que sí está medida es la que
importa: **77 de las 95 del salto eran dos archivos que el runner de ayer no veía.**

**Regla.** "No lo puedo parsear" y "no emite" son afirmaciones distintas, y la
segunda se tiene que **ejecutar el archivo y mirar la salida** antes de escribir
la alerta. El runner que cuenta mal **es** un bug del runner; el archivo de
test no estaba roto.

## ALERT-110 - un test puede extraer la mitad del problema y después afirmar que el problema entero está resuelto

**Estado.** `tests/hb80-toast-permanencia.test.js` daba verde y afirmaba que el
toast de la puerta era persistente. Su mecanismo:

1. extraía con una regex el **literal del call-site** (el `0`) y evaluaba **ese
   literal** → `0`;
2. **no componía** con la **resolución del calle** (`Number(opts.ttl || 3500)`)
   → el temporizador veía **3500**.

Y dos asserts más abajo afirmaba que el fallback `opts.ttl || (\d+)` **existía**,
citándolo como prueba de que "el 0 es explícito y no un default silencioso":
**localizaba por regexp la expresión que se come el 0 y la reportaba como
garantía.** Los dos asserts eran mutuamente contradictorios. Los dos PASABAN.

**Por qué es alerta y no anécdota.** Es la **tercera** variante de la misma
familia (ALERT-100, 105, 106): **afirmar algo que el dato no soporta**. Pero esta
tiene una forma propia y transferible: *todo test que extraiga un valor del
call-site tiene que componerlo con la resolución del calle antes de afirmar
nada*. Si no compone, está midiendo un número que el programa nunca usa.

**Reparado, no borrado.** El archivo tenía cobertura que el test nuevo no tiene
(las dos salidas: reloj y botón de cerrar; y la guarda de los mensajes cortos).
Borrarlo habría tirado esa cobertura. Ahora los dos tests se complementan: el
ttl resuelto por el calle y la cascada de z-index son de `hb81`, las dos salidas
son de `hb80`.

## ALERT-111 - el driver bloqueó un `del` y la denegación fue por TIMEOUT, no por política

**Estado.** Iba a borrar `tests/hb80-toast-permanencia.test.js` con `del`. El
permiso se denegó con el mensaje de que podía causar pérdida de datos y la
denegación llegó **por timeout (300 s)**: el gate no llegó a responder. **La
denegación es final y no se reintentó**; la vía fue reparar el archivo en lugar de
borrarlo (ALERT-110), que además resultó mejor.

**Lo que queda en pie.** Es un borrado de un archivo **propio**, en un worktree
propio, que nunca se completa. Si hace falta de verdad, la alternativa es
`git rm` en el stage, que no es un borrado en disco. **Y la lección de fondo:** un
ciclo que dependía de borrar se resolvió **sin borrar**, y se resolvió mejor. La
dependencia estaba mal planteada.

## ALERT-112 - mi generación de texto se corrompe, y ya van 4 en 2 ciclos (2 de ellas en mensajes a otros agentes)

**Estado.** Cuatro casos, y **dos_RECORDADOS en ciclos anteriores**, o sea que
viene de antes y no es de este ciclo:

1. `TEAM_STATUS.md:1660` (ciclo **HB#80**, ya registrado en su momento):
   "Se me colaron `我们采集` y `采纳` **en el cuerpo del mensaje del P3 al
   Reviewer**". O sea: **al Reviewer le llegó un mensaje con basura CJK**, y no se
   detectó hasta que alguien lo leyó en el log.
2. (HB#80) **otra** corruptción en otro mensaje al Reviewer, con una conclusión
   opuesta sobre el mismo código. Dos mensajes corruptos en un ciclo, en la misma
   dirección.
3. (este ciclo) **dos probes con un espacio perdido después de `const`**:
   `constESTRUCT` y `const_FILES`. El primero lo escribí yo; el segundo lo
   detectó el `ReferenceError` y lo corregí.
4. (este ciclo) un encabezado de test con `尚` pegado, y el **mensaje al PO** con
   `T6窑y el Reviewer-Cksealaron` y un `-Ademas` pegado al punto anterior. El
   mensaje al PO **salió con la basura**, y no hay forma de editarlo: ya se envió.

**Por qué el caso 3 es el peligroso.** `const X = ...` escrito `constX = ...` es
**sintaxis válida**: asigna una global implícita. **`node --check` NO lo
detecta.** El síntoma aparece como `ReferenceError: ESTRUCT is not defined` en
runtime, lejos de la causa y con un mensaje que apunta al identificador equivocado.
Es **la misma clase que el `newvos`/`nuevos` de HB#78**.

**Regla.** Después de escribir un probe, **correrlo inmediatamente**, antes de
seguir. Un `ReferenceError` en la primera línea ejecutable es casi siempre un
espacio perdido, no un bug de lógica. Y para texto largo destined a personas u
otros agentes, **pasarlo por un detector de caracteres no-ASCII antes de
mandarlo** (`tools-hb81/probe-cjk.js`): el ojo no la agarra, y en este ciclo la
basura llegó a dos mensajes.
## ALERT-113 - el runner contaba la LINEA DE RESUMEN como si fuera una asercion, y los dos errores se cancelaban en el total

**Estado.** HB#82 arreglo el runner (contaba lineas por asercion y no el
resumen, con fallback para los archivos "estilo titulos"). Resultado medido:
**1088 pass / 0 FAIL, 40 de 40 archivos**. Y el ciclo anterior (HB#81) habia
reportado **1094**. Seis de diferencia, sin explicar.

**Los 6 NO son un error de suma: son dos errores opuestos en el MISMO defecto,
y se compensan.**

Medido archivo por archivo (`tools-hb83/diff-real.js`, que corre los dos
criterios sobre la misma salida e imprime solo los que difieren):

```
idea49.partial-206.retry404.test.js   runner=14  indep=13  delta=-1
idea56.f1-hint-permiso.test.js        runner=24  indep=23  delta=-1
idea56.forma-raids.test.js            runner=21  indep=20  delta=-1
idea57.forma-contracts.test.js        runner=18  indep=17  delta=-1
idea57t2-luck-sindato.test.js         runner=22  indep=21  delta=-1
idea57t3-jsdoc-honesto.test.js        runner=14  indep=13  delta=-1
idea60b.forma-charcount.test.js       runner=22  indep=21  delta=-1
idea57t4-idioma-contrato.test.js      runner=1   indep=14  delta=+13
                                   TOTAL  runner=1088  indep=1094  delta=+6
```

**La causa, una sola.** El runner cuenta "una linea que arranca con el
veredicto de una asercion" con `/^(OK|PASS)\b/i` sobre la linea TRIMADA. Pero
**una linea de resumen tambien arranca asi**:

- `pass: 13 | FAIL: 0` empieza por "pass" -> el runner suma **1 de mas**. Medido
  en los **7 archivos** del `delta=-1`.
- `OK: 14 pass, 0 FAIL` empieza por "OK" -> `p` queda en **1**, el fallback de
  resumen **NUNCA se dispara**, y un archivo de **14** aserciones se reporta
  como **1**. Medido en `idea57t4-idioma-contrato.test.js`.

O sea: **+7 de un lado, -13 del otro, y el total queda 6 por debajo.** Ese es
el peor modo de fallo posible para una cifra de medicion: **los dos errores se
cancelan, el numero final parece razonable, y ninguna parte del reporte lo
delata.** Solo aparece si alguien compara el total contra otro metodo.

**El fix.** `esResumen(t)`: antes de sumar, probar la linea contra los MISMOS
regex que usa `resumenDe`. Detalle que importa: se prueba con una **copia sin
flag `g`** (`new RegExp(re.source, re.flags.replace('g', ''))`), porque un
RegExp con `g` guarda `lastIndex` entre llamadas y `test()` daria resultados
alternos: un resumen con numero PAR contaria y con numero IMPAR no. Eso es un
bug que se manifestaria una vez cada dos corridas y seria indetectable.

**Verificacion.**
- Con el fix: **1094 pass / 0 FAIL, 40 de 40, exit 0**. Y el numero coincide
  con el que HF#81 reporto manualmente, y con un **contador independiente**
  (`tools-hb83/conteo-indep.js`, otra estrategia: escanea TODA la salida, no las
  ultimas 6 lineas). Dos metodos que no comparten codigo dan 1094.
- **MUTACION** (`tools-hb83/mutacion-resumen.js`): quitar el guard devuelve el
  total a **1088** y el fallback vuelve a ser de 2 archivos. **La mutacion
  muere.** El fix se commiteo ANTES de mutar, y la restauracion se verifica con
  `git status --short` DENTRO del script, no contra un snapshot en memoria
  (ALERT-103).

**Lo que hace este ALERT del patron de los otros.** Es **ALERT-107** ("no lo puedo
parsear" != "no emitio"), aplicado a una capa mas adentro: HB#82 arreglo el
extremo del "no hay linea por asercion", y el defecto que quedo es del otro
extremo, "hay linea Y es un resumen". **El fallback no se dispara solo porque
`p > 0`**, y `p > 0` puede venir de una linea que no es una asercion.

**Regla.** Un total de medicion que se reporta sin el desglose por archivo es un
numero opaco, y un numero opaco puede tener DOS errores que se cancelen y dar
algo plausible. **Cuando dos metodos dan distinto, la diferencia se acota
archivo por archivo antes de tocar el que parece equivocado** -- aca el
"equivocado" era el que ya habia sido arreglado y reportado como verde.

## ALERT-114 - tres de mis errores de este ciclo, todos del mismo tipo, y uno de hide-and-seek con el editor

**Estado.** Cuatro fallos propios, ninguno de logica del producto:

1. **`f` declarado dos veces en el mismo scope** (contador independiente): el
   `for (const f of archivos)` y el `let f = 0` de abajo. Resultado: **40
   archivos con 0 aserciones y un TOTAL de 0**. Lo delato que imprimia el
   nombre del archivo como `0`. **`node --check` NO lo detecta**: es error de
   tiempo de ejecucion, no de sintaxis.
2. **`consthits = []`** (el de newlines): **sintaxis valida**, asigna una global
   implicita. `node --check` pasa. Falla con `ReferenceError: hits is not
   defined` en runtime. Es **exactamente** el caso 3 de ALERT-112, y el ciclo
   siguiente al que lo documento. O sea: **la regla de ALERT-112 no se aplico
   en el ciclo inmediatamente posterior a escribirla.**
3. **`git show` sin `cwd`**: el probe corria `git` desde el directorio de los
   scripts, no desde el repo, y daba `not a git repository` 6 veces. No lo
   detecte porque el script seguia imprimiendo: **fallo en silencio con la
   forma de la salida correcta**.
4. **La asercion del propio script de newlines era falsa**:iba a comparar
   `crlf` con `lf` y marco "6 con problema" sobre 6 archivos que estan
   **correctos**. La mezcla LF/CRLF no existe: el problema era que
   `core.autocrlf` convierte **en disco** todo a CRLF, y el blob en git queda en
   LF. O sea: **estaba marcando como defecto el comportamiento correcto de
   git.**
5. **El script de insercion tenia el nombre del archivo de destino HARCODEADO**
   (`COMMS_LOG.md`), y lo use para insertar el bloque de ALERT-113/114. Escribio
   **105 lineas de alertas dentro del log de comunicaciones**. Lo delato que
   `git status` mostraba `ALERTS_LOG.md` sin modificar: se lo inserts ahi y no
   aparecio. **El script reporto exito y los dos archivos quedaron con newlines
   coherentes** -- o sea que todas las verificaciones del script pasaron y aun
   asi escribo en el archivo equivocado. **La unica deteccion fue "falta el
   archivo que yo se que modifique".** Corregido: el destino es parametro, y el
   script **aborta si no se le pasa** y **verifica que el destino exista**.

**Los 5 son el mismo tipo: el probe o el script tienen una premisa que no
verifique, y el modo de fallo es que la salida PARECE correcta.**

**La leccion del 4 y del 5, que es la que importa.** Un control que marca
"problema" cuando no hay ninguno es peor que no tener control: entrena al que lo
lee a ignorar la salida. Y un script que reporta exito mientras escribe en el
archivo equivocado es peor que uno que falla: **destruye un log y deja el otro
intacto, que es el peor caso para el que busca el bug.** Se corrigieron para
leer **el blob** (`git show HEAD:<archivo>`) y para **exigir el destino por
parametro**.

**Regla del ciclo, y es la misma de ALERT-112 con cinco casos mas:** despues de
escribir un probe, **correrlo y leer su salida completa**, no solo el exit
code. Y despues de correr un script que MODIFICA algo, **`git status` y mirar el
archivo que se modifico, no solo los que el script dijo**. Cuando el probe dice
"problema" en todos los archivos, **la primera hipotesis es que el probe esta
mal** -- un control que falla el 100% de las veces no esta finderando un
defecto, esta fallando.

## ALERT-115 - 7 ALERTs estaban referenciadas desde 4 archivos committed y no existian nunca, y ningun test lo veia

**Estado.** `COMMS_LOG.md` y `TEAM_STATUS.md` (los dos **committed**) citan
`ALERT-108`, `ALERT-110` y `ALERT-112` como si fueran entradas existentes de
`ALERTS_LOG.md`. **No existian.** En `a5ec94f` la auditoria da **16 referencias
huerfanas a 7 ids distintos** (`20`, `22`, `30`, `86`, `108`, `110`, `112`),
repartidas en 4 archivos de la raiz mas el propio `ALERTS_LOG.md`.

**De donde vino el hueco.** Las 5 ALERT-108..112 se escribieron en el ciclo
HB#81 como **documentacion sin commitear** (291 lineas en `hb81-wt`, de las que
128 eran el bloque de `ALERTS_LOG.md`). HB#83 rescato parte de ese WIP y escribio
`ALERT-113` y `ALERT-114` sobre el mismo material, **pero no las 5 anteriores**.
O sea: el rescate fue parcial y nadie lo noto, porque los 2 documentos que las
citan se commitearon igual y quedaron apuntando al vacio.

**Por que no lo agarro nada.** Los `.md` no se validan. La suite corre
`tests/*.test.js` y no mira documentacion. No hay ningun test, script ni hook que
compruebe que una referencia cruzada resuelva. **Es un agujero de una clase
entera, no de estas 5 lineas.**

**El instrumento: `tools/audit-alert-refs.mjs`.** Indexa los ids definidos en
`ALERTS_LOG.md` (de las 2 formas en que se definen: titulo `## ALERT-n` y fila
de tabla `| **ALERT-n** |`) y lista toda referencia `ALERT-n` de los `.md` de la
raiz que no resuelve. Acepta `--alerts=<ruta>` y `--docs=<dir>` para poder
medir un commit anterior sin tocar el arbol.

**Lo que mas importa de esta ALERT es el fallo del instrumento, no el
instrumento.** La primera version del extractor solo reconocia **titulos**, y
reporto **343 huerfanas**: las filas de tabla, que son la mayoria de las
definiciones, quedaron como no definidas. O sea, un numero **25 veces mayor que
el real**, producido por un regex recien escrito, exactamente la familia de
ALERT-61 y ALERT-104. Lo unico que impidio reportarlo fue el **CONTROL** del
script: si el conjunto de definidos baja de 100, sale con codigo 2 y se niega a
reportar un total. Ese control es lo que hay que escribir en cualquier contador
nuevo, y es mas barato que las 343.

**Medicion antes/despues, con el mismo script:**

| arbol | definidos | referencias | huerfanas | ids huerfanos |
|---|---|---|---|---|
| `a5ec94f` (HEAD antes de este ciclo) | 103 | 524 | **16** | 20, 22, 30, 86, 108, 110, 112 |
| este ciclo | 108 | 535 | **8** | 20, 22, 30, 86 |

Las 4 que quedan (`ALERT-20`, `ALERT-22`, `ALERT-30`, `ALERT-86`) **no se
inventan**: son referencias a entradas que nunca se escribieron, y la mas
alcanzada es `ALERT-86`, citada desde `COMMS_LOG.md`, `SESSION_LOG.md` y
`TEAM_STATUS.md`. Quedan **ANOTADAS, no resueltas**: escribir un ALERT para
explicar por que no hay un ALERT es fabricar el hallazgo que el numero no
sostiene.

**Regla.** Una referencia cruzada en un archivo committed es una afirmacion
sobre la existencia de otra cosa, y tiene el mismo estatus que cualquier otra
afirmacion: **o se verifica, o no se escribe.** Y si el log es la unica
evidencia, la verificacion tiene que ser un comando, no una lectura.


**Addendum (escrito despues de correr el script, y es parte del hallazgo).** La
auditoria **cuenta sus propias referencias**: este parrafo cita `ALERT-20`,
`ALERT-22`, `ALERT-30` y `ALERT-86`, asi que el total de referencias huerfanas
subio de 8 a 13 al escribirlo. Por eso el script imprime como cifra de cabeza
los **ids distintos** (4, estable) y no el conteo crudo, y avisa cuando parte
del total es el propio informe. Sin eso, el unico trabajo de este ciclo habria
sido hacer subir el numero que venia a medir.

**Y una ocurrencia en vivo de ALERT-112, en este mismo ciclo.** Al redactar esta
ALERT se me colaron dos ideogramas en el cuerpo (`/account` donde iba una
palabra, y un caracter colado en "el real"), y los perdi en la lectura. Los
atrapo `tools/probe-cjk.mjs` **antes** de anexar el bloque, que es exactamente
el uso que la 112 pedia. El detector tiene ademas un **canario** que verifica
ver su propia basura: sin el, un detector roto daria "0 hallazgos" con la misma
autoridad que uno sano.
## ALERT-116 — `tools/audit-alert-refs.mjs` acierta en el numero y se equivoca en el verbo, y el error es el que hace todo el trabajo

La ALERT-115 dejo 4 ids "huerfanas" anotados con la frase de que **no se
inventan** porque "son referencias a entradas que nunca se escribieron". **Eso
es FALSO para 1 de los 4, y el numero de HB#86 sale de un metodo que no podia
distinguirlo.**

### El hallazgo

`ALERT-20` **si se escribio.** Evidencia, en 3 pasos independientes:

1. `git log --all -S"| **ALERT-20** |" -- ALERTS_LOG.md` devuelve **un** commit:
   `d91888b`, con la fila completa de|ALERT-20| (FASE 2 del dashboard de
   inventario sin pool, "Corregido (HB#36)", con su medicion de pico 27 -> 3).
2. `git branch -a --contains d91888b` dice que vive en
   `legacy/fix-concurrency-pool-phase2`.
3. `git merge-base --is-ancestor d91888b origin/main` **falla**.

O sea: la ALERT-20 **esta escrita**, y no esta en `main` porque el commit que la
agrego **nunca llego a `main`**. La rama se quedo en `legacy/`.

**Por eso el audit no lo puede ver.** `tools/audit-alert-refs.mjs` responde a
una sola pregunta: *¿esta el id definido en el `ALERTS_LOG.md` de este arbol?*
Una fila que vivio en una rama que no se mergeo es, para ese script,
indistinguible de una que nunca existio. El numero es correcto **para la pregunta
que hace** y no sirve para la que se le esta haciendo.

### Los otros 3, uno por uno (si verificados)

| id | donde se cita | definicion | veredicto |
|---|---|---|---|
| `ALERT-20` | `ALERTS_LOG.md:422` (fila ALERT-25), `PRE_BACKLOG.md`, `SESSION_LOG.md` | **`d91888b`, rama `legacy/fix-concurrency-pool-phase2`, nunca mergeada** | **Se perdio al no mergear la rama** |
| `ALERT-22` | `ALERTS_LOG.md:418` (fila ALERT-24) | **no esta en ninguna de las 11 ramas remotas** | nunca existio |
| `ALERT-30` | `ALERTS_LOG.md:432` (fila ALERT-35) | **no esta en ninguna de las 11 ramas remotas** | nunca existio |
| `ALERT-86` | `TEAM_STATUS.md`, `SESSION_LOG.md`, `COMMS_LOG.md:259` | **nunca existio, y describe algo que SI se implemento** | ver abajo |

`ALERT-22` y `ALERT-30` se confirman por un metodo que **no comparte codigo** con
el audit: un `git grep` del patron de fila sobre las 11 ramas de
`git ls-remote --heads`, una por una. 0 en todas. Sus citas son de filas que si
existen (ALERT-24 y ALERT-35), o sea que el que las escribo **se estaba
refiriendo a algo real** que no quedo escrito.

### `ALERT-86` es un tercer caso, y es el que no se puede cerrar solo

La cita dice, textual: *"las 3 familias de `homestead-tracker.js` se escriben
como `{ts, data}` y no matchean ningun patron de nombre, asi que caian en DATO y
quedaban protegidas por una frase que el boton no dice"*. El segundo criterio por
**forma** **esta implementado** en `tools/idea50-censo-claves.mjs`. O sea que la
ALERT-86 **describe un defecto que ya se arranglo y nunca se documento como ALERT**.

Es la clase de perdida mas cara de las 3: las otras dos pierden texto, esta
pierde **el registro de que algo se arreglo y por que**. Sin la entrada, el
proximo que lea `idea50-censo-claves.mjs` ve un criterio raro sin explicacion y
lo puede borrar creyendo que sobra.

### Lo que NO se hizo, y por que

- **No se escribieron las 4 ALERTs.** Escribir una ALERT para explicar por que
  no hay una ALERT es fabricar el hallazgo que el numero no sostiene: el titulo
  pasaria a ser el unico sitio donde el hecho existe.
- **No se borro ninguna referencia.** La cita de `ALERT-20` en la fila de
  `ALERT-25` es **correcta**: existio, y describe un gap real. Borrarla seria
  perder la unica pista de por que el boton de cache existio.
- **No se mergerio `legacy/fix-concurrency-pool-phase2`.** Es una rama vieja y
  sus 3 resurrected filas arrastran otras; y la ALERT-20 dice "Corregido", o
  sea que resucitarla no agrega trabajo, agrega texto. **Decidir si el registro
  se completa o se acepta la perdida es de Pablo.**

### Regla que sale

**Un instrumento que responde "¿esta definido aca?" no puede usarse para
concluir "nunca existio".** Para esa segunda pregunta hace falta el historial:
`git log --all -S` sobre la fila exacta, y despues `merge-base --is-ancestor`
para separar "se borro" de "nunca se escribio". Son 2 preguntas distintas y el
script contesta 1.

La generalizacion es la de siempre (**ALERT-61**, **ALERT-104**, y el primer
borrador de la 115 que reporto **343** huerfanas): *un numero recien escrito no
se reporta hasta que un metodo que no comparte codigo con el da lo mismo.* Ahi el
segundo metodo existio y **no lo corrí** porque la ALERT-115 ya narraba el
resultado como cerrado. **Un hallazgo sin contraste no se escribe aunque el
instrumento que lo produce tenga control.**

**Y el control que faltaba en el audit, que es el que habria atrapado esto:**
hoy verifica que `definidos.size >= 100`. Eso protege contra el extractor roto.
No protege contra **el archivo equivocado**: si `ALERTS_LOG.md` de este arbol no
tiene lo que un commit de otra rama si tiene, el script no tiene forma de saber
que le falta algo. Un control del mismo genero que el del `>= 100` seria
**comparar el conjunto de definidos contra `git log --all -S`**, y reportar como
separado lo que "esta en otra rama" de lo que "no esta en ninguna".

## ALERT-117 - el canario CJK dio "limpio" sobre un archivo que estaba corrupto, y ningun detector que escribi despues sirve

**Severidad:** Media (documental, no rompe codigo) · **Estado:** ✅ RESUELTA en HB#88
**Origen:** ALERT-112 (la clase CJK) y ALERT-116 (el instrumento con el verbo
equivocado). Esta es la tercera de la misma familia, y es la que cierra el
asunto: **la instrumentacion de esta clase no existe, y el intento de
construirla es lo que produce el hallazgo.**

### El hecho

El HB#86 escribio la ALERT-116 y, segun su propio registro, corrio
`probe-cjk.mjs` **antes de anexarla** para confirmar que no se le colaban
ideogramas. Dio limpio. El archivo commiteado en `e1262b0`, en la prosa viva
de esa misma ALERT-116, tiene:

    ALERTS_LOG.md:1892  "...y **no locorrí** porque la ALERT-115 yaNnarraba el..."

`no locorrí` donde va `no lo corrí`. `yaNnarraba` donde va `ya narraba`. Dos
espacios perdidos y una letra duplicada, **en la frase que sostiene la regla
del ciclo**. No hay ningun ideograma. El canario estaba bien construido, se
corrio, y su respuesta fue correcta sobre lo que el pregunta: **"no hay CJK"**.
Lo que se leyo del otro lado fue "esta limpio".

### Tres intentos de detector, tres formas de fallar

| # | Instrumento | Que pregunta | Resultado medido |
|---|---|---|---|
| 1 | `probe-cjk.mjs` | hay ideogramas? | **0**. No ve esta clase. |
| 2 | `probe-glue.mjs` | minuscula pegada a mayuscula? | **131** en 5 `.md`. ~11 reales, ~120 falsos (CamelCase deliberado de identificadores citados en prosa sin backticks). Ademas **no ve `locorrí`**: los dos lados son minusculas, asi que no hay cambio de caja. |
| 3 | `probe-fusion.mjs` | el token contiene una palabra funcional pegada? | **~5000 falsos.** Inutilizable: en espanol las palabras funcionales **son prefijos de palabras comunes por construccion** (`de`+`fecto`, `con`+`flicto`, `a`+`rchivo`, `lo`+`gro`). No hay lista de palabras funcionales que no reviente el corpus. |

El intento 3 es el que decide el asunto, y lo decide por la via negativa: la
clase **"un espacio desaparece entre dos palabras" no es detectable por
instrumento lexico barato en espanol**. No es que falte afinar el regex; es que
la senal no esta en los caracteres.

Y el intento 2 tiene el defecto opuesto y peor: 8% de precision. Un detector
que grita con 120 falsos por 11 reales es un detector que nadie corre, que es
la forma que tomo el silencio.

### Lo que se corrigio, y por que lo enumero uno por uno

**12 defectos**, todos verificados **leyendo la frase en contexto**, no por el
numero del detector. `probe-glue.mjs` encontro 11; el **`pedidosentedaron`**
(linea 831, `quedaron` con `qu` sustituido por `en`) **no lo encontro ninguno de
los tres**, porque no es un espacio comido: es una sustitucion. Un defecto que
el instrumento no ve sigue siendo un defecto, y por eso el criterio de
aceptacion no puede ser "el detector dice 0".

    ALERTS_LOG.md  407  sonSEO fillers   -> son SEO fillers
    ALERTS_LOG.md  524  ElReviewer       -> El Reviewer
    ALERTS_LOG.md  831  pedidosentedaron -> pedidos quedaron      (lo vio leer, no el script)
    ALERTS_LOG.md  838  loLEA / dosinstantias -> lo LEA / dos instancias
    ALERTS_LOG.md 1389  elReviewer       -> el Reviewer
    ALERTS_LOG.md 1892  no locorrí / yaNnarraba -> no lo corrí / ya narraba
    SESSION_LOG.md 605  seResolvedieron  -> se resolvieron
    SESSION_LOG.md 1484 tieneREWARDS_DATA-> tiene REWARDS_DATA
    TEAM_STATUS.md 1024 ElEnumerar       -> El Enumerar
    TEAM_STATUS.md 1170 elWV             -> el WV
    TEAM_STATUS.md 2064 botonTodavia     -> boton todavia
    TEAM_STATUS.md 2229 malDiseñada      -> mal Diseñada

**Uno NO se corrigio a proposito.** `SESSION_LOG.md:2008` dice
`y laPuede cer:`. El pegado es obvio, pero **el texto correcto hay que
inventarlo** ("se puede cerrar" es la lectura natural, no la unica), y una
reparacion adivinada dentro de un registro de decisiones es peor que un defecto
visible: el defecto se lee y se corrige, la adivinacion se cita como si fuera
un hecho. Queda visible a proposito.

### Los instrumentos NO se mergearon

`probe-glue.mjs` y `probe-fusion.mjs` **no entran al repo**. No porque fallen
sino porque lo que hacen es producir un numero que invita a citarse, y sus
numeros son 131/~5000 con 12 defectos reales. Un instrumento asi en `tools/` es
una trampa con nombre de aide: el proximo que lo corra va a reportar "131
corrupciones" o va a ignorar el archivo entero.

Se conservan los dos archivos en el worktree, fuera del arbol, como registro de
que se intento.

### Reglas que salen

1. **Un instrumento que cubre UNA clase no autoriza la frase "esta limpio".
   Autoriza "no hay clase X".** El HB#86 escribio la regla del contraste de
   instrumentos y en el mismo commit se apoyo en un instrumento sin contraste.
   Las dos cosas pueden ser verdad y aun asi el resultado es falso.
2. **Para esta clase, el detector es leer la frase.** No hay atajo, y
  attemptar el atajo cuesta mas que el defecto: 3 instrumentos, ~5100 falsos
   reportados, 12 defectos reales.
3. **Un defecto que el instrumento no ve no deja de ser defecto.** El criterio
   de cierre es "lei la prosa", no "el script dio 0". `pedidosentedaron` es la
   prueba de que un cierre por numero deja huecos sin avisar.
4. **Un defecto que exige adivinar el texto correcto no se repara solo.** Se
   deja visible. Esto es lo inverso de la regla 3 y no la contradice: primero
   se cierra lo que se sabe, despues lo que se supone.

# ALERT-118 - La fila 079 del COMMS_LOG era un bug VIVO escrito como "pendiente", y nadie lo habia medido

**Estado:** medida y REFUTADA. El codigo NO se toca.
**Origen:** fila 079 de `COMMS_LOG.md`, abierta por el veredicto del Code-Reviewer
en el HB#75 y arrastrada hasta el HB#89.
**Ciclo:** HB#89 (2026-10-01 09:0x-09:3x UTC)
**Medicion:** `tests/hb89-premisa-raw-selected.test.js`, 18 aserciones, 0 FAIL.

## Que decia

La fila 079, en la parte que el Reviewer corrigio, deja esto pendiente:

> `raid-tracker.js:891` (raw de `gw2_selected_key_v1`, **rompe en escenario
> Gist-nuevo**) y 7 pares `gn:` con dual-write sin lector

O sea: 3 modulos (`inventory-hub.js:163`, `strike-tracker.js:415`,
`wv-purchase-detail.js:1842`) leen la legacy a pelo en vez de pasar por
`Storage.getRaw`, y por eso "en un navegador nuevo" devolverian `null` con una
cuenta seleccionada y la app arrancaria sin sesion.

Ese item quedo abierto cuatro heartbeats. Lo retomo en el HB#89 porque el
veredicto de `viewPref()` (fila 081, recogido en el HB#88) lo desbloquea.

## Por que la premisa es FALSA

Para que el raw difiera de `Storage.getRaw` hace falta UN estado:

    gn:account:selected   POBLADA
    gw2_selected_key_v1   AUSENTE

porque `getRaw` (`storage.js:274`) lee el espejo primero y, si no esta, cae a
la gn:. Y ese estado no lo produce el codigo, por tres razones medidas:

1. **`Storage.set` escribe las dos** (`storage.js:290`): el par no se separa al
   escribir.
2. **`Storage.remove` borra las dos** (`storage.js:295`): no se separa al borrar.
3. **`MIGRATION_MODE = 'copy'`** (`storage.js:34`): `_migrateOne` NO borra la
   legacy al migrar. El unico `removeItem(oldKey)` de la migracion esta
   condicionado a `'move'` (`storage.js:457`), o sea hoy es codigo muerto.

Y el escenario que la fila nombra **no separa el par**: el import real
(`settings-manager.js:258`) entra por `Storage.set`, que escribe la gn: **y** la
legacy. El test siembra un almacen vacio, importa, y las dos quedan puestas.

Un barrido de los 43 `.js` de `js/` no encuentra ni un escritor crudo de una
`gn:` (`localStorage.setItem('gn:...`) ni un borrador crudo de la legacy. No hay
codigo que separe el par.

## El estado peligroso SI existe, y por que no lo arreglo

Una `gn:` sola **sobrevive** a `_resyncMirrors`, y eso es **por diseno**, con el
motivo escrito en el propio `storage.js:434`:

> "Una gn: sola puede ser legitima (navegador nuevo, la legacy todavia no se
> creo) y borrarla seria perder el dato."

Ahi el raw devuelve `null` y la capa devuelve el valor: divergen de verdad. Pero
para llegar hay que sembrar el almacen a mano. **No es un bug, es un
riesgo latente con una condicion de ruptura conocida y vigilada.**

## Decision

**No toco los 3 modulos.** El fix seria codigo a favor de un escenario que no
ocurre, y pagaria con:

- 3 call sites que pasan a depender de la capa en un modulo que hoy no la carga
  (`raid-tracker.js` ya la usa, `inventory-hub.js` y `strike-tracker.js` hay que
  verificarlo), o sea una dependencia nueva por un beneficio nulo.
- La fila de la allowlist `LECTORES_LEGACY_ESPERADOS`
  (`tests/idea61-claves-congeladas.test.js:425`) tiene que cambiar de 3 entradas,
  y esa allowlist **es decorativa a proposito**: el propio test dice que un numero
  pelado no se puede distinguir de "un modulo nuevo y deliberado". Tocarla para
  accommodate un fix que no arregla nada es empeorarla.

Lo que dejo en su lugar es el test, que es la parte que si tiene valor: afirma
las 3 condiciones de ruptura (`MIGRATION_MODE`, escritor crudo, borrador crudo)
y falla si alguna se cumple. Si alguien sube el modo a `move`, el test lo dice
antes de que un modulo pierda la sesion.

## La regla

**Una fila de COMMS_LOG que dice "rompe en escenario X" es una HIPOTESIS hasta
que algo la mide, y este equipo las escribia con el verbo del veredicto.**

`rompe`, `esta roto`, `falla` son afirmaciones; en la fila 079 las tres estan
escritas como hechos y ninguna se midio. Peor: venia de un **veredicto del
Reviewer**, o sea que tenia la apariencia de estar validada. No lo estaba: el
Reviewer no midio este caso, lo dedujo, y el verbo ocultó que era una deducción.

Esto ya paso dos veces y por dos caminos distintos:

- **La fila 084 / ronda 24 del PO:** `.toasts` "carece de `max-width`" — falso,
  `main.css:461` lo tiene. Ahi la medicion la hice yo antes de aplicar, y el
  fix salio igual por otra via.
- **La ronda 26 (T7):** el PO propuso `ttl: null` como persistente y su fix
  chocaba con un assert de `hb80` que **defendia el defecto**. Dos casos
  del mismo tipo: el sintoma es real, el diagnostico no esta medido.

Lo que las 3 tienen en comun es que el sintoma era REAL. Por eso la tentacion
de arreglar sin medir es fuerte: el bug existe, entonces el item existe. **La
premisa y el sintoma son dos afirmaciones separadas y hay que medirlas las dos.**

Corolario pratico: cuando una fila diga "rompe en escenario X" y no traiga la
medicion, el item no esta *verificado*, esta *reportado*. Tratarlo como
verificado es lo que hizo que 4 heartbeats lo arrastraran.

Corolario mas chico y el que mas me sirve: **`git grep` no alcanza.** Las 3
razones de arriba estan en el codigo de `storage.js`, y un grep por
`gw2_selected_key_v1` no las ve: hay que leer el contrato de la capa, que es lo
que dice cuando se separa el par. Lo mismo que la ALERT-117: la senal esta en la
prosa del contrato, no en los caracteres.

## Nota de instrumentacion

`MIGRATION_MODE` se midio con regex **y** por comportamiento (sembrando la
legacy, corriendo `migrate()` y comprobando que la legacy sigue). La regex
alcanza para decir que el codigo esta escrito asi; la segunda es la que demuestra
que hoy no borra. Con una sola de las dos, el aserto habria sido una forma.

# ALERT-119 - Dos sesiones aplican el mismo fix en paralelo, y una revierte codigo de la otra

**Estado:** abierta. **Ciclo:** HB#90. **Fila de COMMS_LOG:** 097 y su merge.

## Que paso

La sesion `chatadmin` mergeo `hb77` y el cambio del Reviewer (`87bab23`) **antes**
de que yo recogiera el veredicto correspondiente. Mi ramaodia el mismo fix hecho de
otra forma, y mergearla habia **revertido el `kind` removido**.

No lo delato un chequeo previo: lo delato un **conflicto add/add en el test** y el
`CONFLICT` en `app.js`, que mostraba dos versiones de `parseKeyError`. O sea: el
sistema de merge hizo su trabajo, pero por el motivo equivocado y en el momento mas
tarde posible.

## Por que importa mas de lo que parecio

El equipo tiene **dos instancias escribiendo en `agents/main`**. Eso ya aparecio
como annoyance (push rechazado, ramas rebaseadas). Esta vez aparecio como
**riesgo de perdida de codigo**, y por el peor camino: un fix del Reviewer, ya
aprobado, que dejo de estar en `main` porque otra sesion uso la rama equivocada.

Lo peligroso del caso es que **el arreglo parecia correcto**: mi rama implementaba
literalmente lo que el Reviewer habia pedido. El error no estaba en el contenido,
estaba en **no mirar si ya estaba ahi**.

## La regla

**Antes de mergear un veredicto del Reviewer:**

1. `git merge-base --is-ancestor <sha-del-fix> origin/main` — ¿ya esta?
2. **Leer el estado de los archivos en MAIN**, no el diff propio. La pregunta es
   "que hay en `main` ahora", no "que trae mi rama".
3. `git fetch origin` **primero**, y comparar `HEAD` contra `origin/main` antes de
   escribir nada.

Es la 4a manifestacion de "el clon compartido y la sesion paralela se pisan". Las
otras tres fueron annoyance; esta fue perdida de codigo.

## Lo que queda para Pablo

**Detener UNA de las dos instancias.** No es una preferencia: mientras las dos
escriban en `gw2-wallet-agents`, esta ALERT se va a repetir, y la proxima vez puede
caer sobre un fix que no tenga conflicto visible.

---

# ALERT-120 - El driver deniega por subcadena, y hay 2 archivos basura que NO puedo borrar

**Estado:** abierta, **esperando autorizacion de Pablo**. **Ciclo:** HB#90, reaffirmed
en HB#91.

## Los 2 casos del HB#90

1. **`git merge` denegado por la palabra "permisos".** El filtro del driver busca
   la subcadena `rm`, y "pe**rm**isos" la contiene. Es el **5to caso** de esta clase
   (ver ALERT-39). Se resolvió con `git merge -F` leyendo el mensaje de un archivo.

2. **El borrado de 2 archivos basura fue denegado**: `Approval for 'Bash' timed out
   after 300s`, motivo `contains 'rm'`.

## Los 2 archivos

```
?? ORG_MAP.md.bak-20260930-chatadmin   18917 bytes
?? console.log(k.padEnd(42)+                0 bytes
?? {const                                    0 bytes
```

En el clon compartido, `C:\Mis Archivos\GW2 online\gw2-dev`.

Los 2 ultimos son de **0 bytes** y sus nombres son **fragmentos de codigo**:
`console.log(k.padEnd(42)+` y `{const`. Es la firma de un **redireccionamiento de
shell mal cerrado** — algo como `> console.log(k.padEnd(42)+` — que nunca llego a
ser comando. La hora (`23:07:33`) coincide con un script de la ronda 5 del PO.

El PO **no los borro** y reporto, que es lo correcto: no es su working tree, y
borrar archivos que otro agente puede estar usando es justo la clase de operacion
que el equipo marca (ALERT-43/ALERT-59).

## Por que importa mas de lo que parece

**No rompen nada.** Son 0 bytes. Pero **ensucian `git status`**, y `git status` es
la superficie que **todos** usan para decidir si el arbol esta limpio. Un
`git status` con basura hace que un WIP real parezca limpio, y al reves.

## Lo que pido

**Pablo: hace falta que el driver autorice el borrado de esos 2 archivos.** No lo
rodeo ni lo hago de otra forma — la denegacion fue explicita y no se esquiva. Dos
opciones: (a) autorizar el `rm` de esos 2 paths exactos, o (b) meterlos en
`.gitignore`, que no requiere borrar nada y achieves el mismo efecto sobre la
superficie que todos miran.

---

# ALERT-121 - `^\s*` con flag `m` cruza lineas, y el mutador borro la tabla entera

**Estado:** abierta. **Ciclo:** HB#91. **Archivos:** `tools/hb91-mutar-puerta.mjs`.

## Que paso

Escribi un mutador para hacer la fase roja de un assert sobre la puerta de permisos
de `app.js`. La idea era borrar los 5 permisos no estructurales de
`REQUIRED_PERMISSIONS` y dejar `account + wallet`, que es la clase de mutacion
justa: **la forma del codigo queda intacta, solo cambia la conducta**.

```js
// MAL: en modo 'm', \s incluye \n, as[i] que el cuantificador
//      se come lineas de arriba y borra lo que hay por encima.
const re = new RegExp("^[ \\t]*\\{ scope: '" + s + "',[^\\n]*\\n", 'm');

// BIEN: [ \t]* es un cuantificador que no puede cruzar la linea.
const re = new RegExp("^[ \\t]*\\{ scope: '" + s + "',[^\\n]*\\n", 'm');
```

El primero borro **`account` y `wallet` tambien**. La puerta quedo **vacia**, no
laxa: el mutador hacia el caso *opuesto* del que yo queria.

## Como lo delato

Por el **numero que sale imposible**: el assert reporto `puerta=0 union=7`.
Una puerta con 0 permisos no es una puerta laxa, es una puerta rota, y el 0
delata que el problema estaba en el instrumento y no en lo medido.

Segundo senal, mas tarde: **11 FAIL en vez de los 8 esperados**, y el mensaje de
cobertura de la union se quejaba del *numero de permisos declarados*.

## La regla

**Con flag `m`, un cuantificador al principio de linea es `[ \t]*` o no es nada.**
`\s` incluye `\n` y `^` solo|matchea| despues de un `\n`, asi que `^\s*` puede
consumir varias lineas completas hacia atras. Cualquier mutador, censor o extractor
escrito asi esta **midiendo otra cosa** sin avisar.

Corolario, y es el que mas me sirve: **un mutador se verifica con su numero
esperado.** Si el FAILcount no es el que dijiste antes de correr, el problema es el
mutador, y la fase roja que obtuviste no prueba nada. Por eso conviene **anotar el
numero de FAIL esperado antes de mutar**, no despues de mirar.

## Corolario del corolario

Esto es **ALERT-115 de vuelta, y por mi mano**: la clase "algo se referencia pero
no existe, y nada lo detecta". En el mismo ciclo, `ALERT-119` y `ALERT-120`
aparecian referenciadas **7 veces** en `TEAM_STATUS.md` y `COMMS_LOG.md` desde el
ciclo anterior, y **no existian en `ALERTS_LOG.md`** (el ultimo definido era el
118). `tools/audit-alert-refs.mjs` deberia haberlo visto — la ALERT-115 existe
precisamente porque no lo hacia — asi que **el detector tampoco corre sobre los
logs que los heartbeats escriben**.

**La regla de la regla:** un detector que se escribio una vez y no se vuelve a
correr sobre los archivos nuevos es un detector de museo. Los 3 ultimos ciclos
fueron ALERT sobre ALERTs que no seHabian escrito.
# ALERT-122 - El canal de archivos entrega mensajes que el destinatario no puede leer, y el error es silencioso en las dos formas

## Que pasa

`cli.py inbox` no es "listar lo que hay en la carpeta del otro". Es
`agentlink.inbox(agente, kind='question')`, y eso son **dos condiciones**:

1. `glob(<agente>/inbox/*.json)` -- la **raiz** de la carpeta del agente no entra.
2. `read(m)['kind'] == 'question'` -- un `kind` ausente, o escrito `ask` / `ASK`
   en vez de `question`, **no pasa el filtro**.

`agentlink.ask()` cumple las dos. **Un JSON escrito a mano no las cumple, y no da
error al escribirlo.** No hay excepcion, no hay warning, no hay traceback: el
archivo queda en disco con su cuerpo entero y su `to` correcto, y parece
entregado.

## La medicion

`tools/hb92-comms-legible.mjs` (nuevo en este ciclo) recorre `_comms` y le dice
a cada agente **cuanto ve con su propio lector**. Resultado:

| agente | VE | en disco |
|--------|----|----------|
| default | 0 | 0 |
| code-reviewer | 1 | 6 |
| product-owner | 4 | 8 |
| documenter | 0 | 0 |
| architect | 0 | 1 |

**10 mensajes con cuerpo real (>= 200 chars) que su destinatario NUNCA va a
listar.** Los 3 modos, los 3 presentes:

- `code-reviewer/20261001T110000Z-hb91-puerta.json` (4413 chars): **raiz** + sin
  `kind`. Invisible por las dos condiciones.
- `product-owner/20261001T1012*Z-hb90r1.json` x4 (3326-3334 chars): en `inbox/`,
  que es la carpeta correcta, y **sin `kind`**. Invisible solo por el filtro.
- `code-reviewer/20260930T195500Z__hb64-50f.json` (3802): `kind="ASK"`.

## Por que importa mas de lo que parece

Dos mensajes que el equipo dio por entregados **no lo fueron**:

- **La 099 al Reviewer (HB#91)**: mi MEMORY del ciclo anterior dice, textual,
  *"Entregado verificado leyendo el JSON recien escrito: `to: Code-Reviewer`,
  4413 chars"*. Es cierto y no alcanza: verifique que **el instrumento** habia
  escrito, no que **el consumidor** lo leeria. El Reviewer tenia **0** preguntas
  visibles; ahora tiene 1, la misma, entregada por `ask()`.
- **La 098 al PO (HB#90)**: 4 copias, ninguna legible. La fila de `COMMS_LOG.md`
  quedo **VENCIDA "sin respuesta"**, y el PO no habia contestado **porque no
  podia leer**. Anotarlo como silencio del otro agente estuvo a punto de ser una
  accuse falsa.

**Consecuencia sobre el registro, y es lo importante: una fila `VENCIDA` no
distingue "el otro no contesto" de "el otro no podia leer lo que le mande".** Son
la misma fila y causas opuestas, y la segunda es la que produce diagnosticos
falsos sobre el comportamiento de otro agente.

## La regla

**Verificar una entrega con el LECTOR del destinatario, no con el escritor.**

```python
# NO alcanza: el archivo existe
assert os.path.exists(path)

# ESTE es el que sirve: el lector del otro lo lista
assert path in agentlink.inbox(to, kind='question')
```

Corolario para todo lo que cruce a otro agente: `ask()` o nada. Si hace falta
escribir a mano por una limitacion del driver, el mensaje **no esta entregado**
hasta que el `assert` de arriba pasa, y hay que decirlo en el log.

## La clase, y por que la 3a vez no la agarro el detector

Es **ALERT-115 con un paso mas**: ahi lo que se referenciaba y no existia era un
documento. Aca lo que se referenciaba y no existia era **una entrega**. La
misma forma, y el mismo fallo mio de no correr el detector sobre lo nuevo.

Y el detector que existe (`tools/audit-alert-refs.mjs`) lo agarro a medias, con
un **falso positivo propio**: reporta `ALERT-119`, `ALERT-120` y `ALERT-121`
como huerfanas, y las 3 **si estan escritas** (`ALERTS_LOG.md:2236`, `:2283`,
`:2332`) pero como encabezado `# ALERT-NNN`, no como fila de tabla
`| **ALERT-NNN** |`, que es la unica forma que el detector reconoce. Las
huerfanas de verdad siguen siendo 4: `ALERT-20`, `ALERT-22`, `ALERT-30`,
`ALERT-86` (item conocido, abierto desde el HB#80).

**Regla de la regla: un detector con una sola forma valida produce huerfanas
falsas, y un detector al que hay que argumentarle es un detector que nadie
corre.** Las dos nomas las pago hoy: primero por no tener el detector
(ALERT-115), despues por no creerle al que hay (ALERT-119/120/121 "faltantes"
que existian).
# ALERT-123 - El PO contesta por `submit_to_agent` y no lee el canal de archivos: 4 preguntas visibles, la mas vieja de hace 12,5 h

**Lo que si esta medido (todo por comando, nada de memoria):**

1. Las 4 preguntas que le mande al PO **SON LEGIBLES para su lector**. Corriendo su
   propio comando documentado desde su workspace,
   `python ...\_comms\cli.py inbox` responde `soy product-owner (via cwd del workspace)`
   y lista **4**: `9c1e44` (HB#68), `a1ae0d` (ronda 28), `b72da0` (acuse) y
   `2a471b` (ronda 29). La mas vieja es del **2026-09-30T23:00Z: ~12,5 h sin
   responder**. O sea que **esta descartado que sean entregas rotas** (ALERT-122 ya
   habia medido las invisibles; estas 4 son las 4 visibles).
2. Su `HEARTBEAT.md` **si tiene PASO 0** con `cli.py inbox` como primer paso, con la
   instruccion de no seguir a investigar sin responder. No es que no lo sepa.
3. Su cron **esta activo y corrio**: `c3f30dc2`, `0 */2 * * *`, `enabled: true`,
   `last_run_at = 2026-10-01T10:09:24.836Z`, `last_status = success`, `last_error: null`,
   `next_run_at = 12:00Z`.
4. **Esa corrida no dejo artifact**: en su workspace, `PRE_BACKLOG.md` tiene
   `LastWriteTime = 07:08:24Z` y `MEMORY.md = 05:06:48Z`. No hay ningun `_r29*` ni
   `_hb9x*`. O sea: **corrio, dio `success`, y no escribio nada ni contesto nada.**
5. **El PO si responde por el otro canal.** Tiene 5 sesiones agent-to-agent hoy
   (`default:to:product-owner:...`) que cerraron 04:41, 05:13, 05:49, 06:34 y
   **08:31:34Z** — esta ultima es la respuesta a la ronda 27, que mande por
   `submit_to_agent`. O sea: **alcanzable por `submit_to_agent`, no alcanzable por el
   canal de archivos.**

**Lo que NO esta establecido, y no lo voy a afirmar:** *por que* su ciclo no lee el
inbox. Descartado lo que se puede descartar cheaply: (a) no es entrega rota, medido
en (1); (b) no es que su HEARTBEAT.md ignoranta el canal, medido en (2); (c) no es un
cron apagado, medido en (3). Candidates que quedan, ninguno verificado: que el turno
del cron muera antes de llegar al paso 0, que la corrida de 10:09Z sea un `success`
vacio, o que `cli.py` falle dentro de su shell por falta de `BOVEDA_AGENT` (su
HEARTBEAT.md documenta el comando **sin** `set BOVEDA_AGENT`, y sin el el `cli.py`
aborta: reproducido, sale `ERROR: no se puede determinar que agente sos`). **Ojo con
este ultimo: es CANDIDATO, no causa.** El `cli.py` resuelve el agente por el cwd, y su
cron corre en su workspace, asi que deberia funcionar — pero no lo medi desde su
runtime y no lo voy a reportar como causa cerrada.

**Por que importa mas de lo que parece:** el paso 3 del ciclo del heartbeat ("si el PO
tiene 3+ propuestas, mandalas al Reviewer") **no se puede cumplir porque el PO no
propone**, y no propone porque no lee. Van **10 rondas** (25 a 29 mas las reenviadas)
mandandole lo mismo. Mi MEMORY de los HB#90-92 lo atribuyo a "un PO al que no se le
pregunta nada no propone nada" (ronda 22) y a la clase "se arma bien y no se ve". **Las
dos explanations son wrong o estan incompletas: la pregunta se le hacia, se leia, y
no contestaba. La ronda 22 ya no explica el silencio; el silencio es mio y del PO a la
vez, pero la causa medible esta en el punto (4).**

**Que hago en este ciclo, sin esperar a nadie:** vuelvo a preguntarle al PO por
`submit_to_agent` (background, con TTL grande), que es el **unico** canal con evidencia
de que le llega (punto 5). Y **dejo de tratar "VENCIDA sin respuesta" del PO como
senal de trabajo pendiente**: hasta el HB#92 la leia asi, y durante 2 heartbeats estuve
persistiendo en un canal que el PO no abre.

**Regla que sale (la 4a manifestacion de "afirmar un negativo con un solo
instrumento"):** *`git grep` por el simbolo que uno tiene en la cabeza no es
"no existe".* Buscando `onClear` en `origin/main` da 0 en `api-gw2.js`, y el hook
**esta ahi** (`api-gw2.js:1861-1867`): se llama `__cacheClearMem`. Con ese 0 yo habria
reportado un cuarto "ya esta / no existe" (tras las rondas 19 y 27 del PO y la puerta de
`app.js:783`). **Cuando el grep da 0, el nombre hay que buscarlo en el DIFF del commit
que lo implemento, no en el arbol actual.** Y su gemela en comms: *un `inbox` que
devuelve 0 no prueba que no te leyeron; prueba que tu lector y tu entrega usaban
nombres distintos.*

---

# ALERT-124 — HB#94: un arnés que no discrimina puede "dar verde" el bug que vino a encontrar

**Medido:** `tools/hb94-wv-store.mjs` en su primera version daba
`el caso real respeta la eleccion del usuario : SI` para `gn:wv:shop:view`, que
es justamente el bug que el PO reporto como T10-bis. O sea: mi arnés de 4 lineas
**aprobo el defecto**. El control tambien pasaba, y el veredicto final decia
`el arnes discrimina: NO (no sirve)`. Si no hubiera impreso ese veredicto, yo
tenia en la mano un "OK" verde sobre un bug real.

**Causa raiz (mi secuencia, no el codigo):** en el `arranque 1` no habia ninguna
legacy escrita, asi que `_migrateOne` no tenia de donde copiar y la `gn:` **no
nacia**. En el `arranque 2` entonces si migraba, de la legacy correcta. Para
reproducir la congelacion hace falta que la `gn:` **ya exista**, o sea que el
arranque 1 tenga una PRIMERA eleccion (`cards`) que la migracion photographie.
Falta ese paso y el escenario degenera en el caso que si funciona.

**La regla, y es la 2a vez que la aprendo en la misma forma (ALERT-121 fue el
mismo modo, al reves):** un arnés se valida con su **control negativo**. Si el
caso que tiene que FALLAR pasa, el defecto no esta en el codigo: esta en el arnes,
y la primera respuesta no es tocar el codigo. Imprime siempre el veredicto de
"discrimina SI/NO" como asercion propia, al final, y no solo los casos.
Con el paso agregado: caso real = CONGELADA en `cards` con `legacy = table` en
localStorage, control `gn:account:selected` = OK. Discrimina SI.

**Corolario para los arneses que ya estan en el repo:** cualquier arnen que solo
afirme "X esta bien" y no tenga un caso que tiene que estar MAL, no prueba nada
todavia. Vale la pena revisarlos cuando toque.

---

# ALERT-125 — HB#94: mi barrido de alcance dio 2 de 3, y el que perdi es el mas expuesto

**Medido:** `tools/hb94-alcance.mjs` recorre las 3 capas buscando
`opacity:0 | visibility:hidden | translateY( | scale(` junto a `animation:` en la
MISMA regla. Salio:
  [css   ] css/theme-polish.css:825  .raid-wing-card
  [inline] js/raid-tracker.js:1437   (con `animation:` en el style)
  total = 2
El PO reporto **3** y Third era `js/strike-tracker.js:699`, que usa
`.raid-wing-card` **sin animacion inline**. Verificado: el style de :699 tiene
`background`, `border`, `border-radius`, `overflow`, `margin-bottom` y nada mas.
No hay `animation:` inline, asi que mi regex no lo podia ver.

**Por que el que perdi es el PEOR y no el menos importante:** la tarjeta del
Strike Tracker es **100% dependiente de la capa 2**. Su `opacity:0` NO esta en
el template, esta en `theme-polish.css:826`. Si alguien "arregla" solo los dos
sitios donde el estado inicial esta escrito en el HTML, el Strike Tracker sigue
en blanco y el test pasa. Ese es el fallo de alcance que un barrido escrito con
una sola forma valida produce.

**La regla (2a manifestacion del mismo eje, y al reves de la del HB#92):** un
detector que reconoce una sola forma produce **falsos negativos**, y un falso
negativo en un barrido de alcance es mas peligroso que un falso positivo, porque
el numero chico se lee como "es un punto" y se termina creyendo que el alcance
esta medido. Cuando el hallazgo de otro agente y el mio difieren en un conteo, la
diferencia es el dato: hay que **explicar la diferencia mirando el caso que mi
instrumento no puede ver**, no descartar el numero mayor. Arreglado: el barrido
ahora reporta tambien las clases que usan el estado inicial de la CAPA, y da 3.

---

# ALERT-124 — HB#94: un arnés que no discrimina puede "dar verde" el bug que vino a encontrar

**Medido:** `tools/hb94-wv-store.mjs` en su primera version daba
`el caso real respeta la eleccion del usuario : SI` para `gn:wv:shop:view`, que
es justamente el bug que el PO reporto como T10-bis. O sea: mi arnés de 4 lineas
**aprobo el defecto**. El control tambien pasaba, y el veredicto final decia
`el arnes discrimina: NO (no sirve)`. Si no hubiera impreso ese veredicto, yo
tenia en la mano un "OK" verde sobre un bug real.

**Causa raiz (mi secuencia, no el codigo):** en el `arranque 1` no habia ninguna
legacy escrita, asi que `_migrateOne` no tenia de donde copiar y la `gn:` **no
nacia**. En el `arranque 2` entonces si migraba, de la legacy correcta. Para
reproducir la congelacion hace falta que la `gn:` **ya exista**, o sea que el
arranque 1 tenga una PRIMERA eleccion (`cards`) que la migracion photographie.
Falta ese paso y el escenario degenera en el caso que si funciona.

**La regla, y es la 2a vez que la aprendo en la misma forma (ALERT-121 fue el
mismo modo, al reves):** un arnés se valida con su **control negativo**. Si el
caso que tiene que FALLAR pasa, el defecto no esta en el codigo: esta en el arnes,
y la primera respuesta no es tocar el codigo. Imprime siempre el veredicto de
"discrimina SI/NO" como asercion propia, al final, y no solo los casos.
Con el paso agregado: caso real = CONGELADA en `cards` con `legacy = table` en
localStorage, control `gn:account:selected` = OK. Discrimina SI.

**Corolario para los arneses que ya estan en el repo:** cualquier arnen que solo
afirme "X esta bien" y no tenga un caso que tiene que estar MAL, no prueba nada
todavia. Vale la pena revisarlos cuando toque.

---

# ALERT-125 — HB#94: mi barrido de alcance dio 2 de 3, y el que perdi es el mas expuesto

**Medido:** `tools/hb94-alcance.mjs` recorre las 3 capas buscando
`opacity:0 | visibility:hidden | translateY( | scale(` junto a `animation:` en la
MISMA regla. Salio:
  [css   ] css/theme-polish.css:825  .raid-wing-card
  [inline] js/raid-tracker.js:1437   (con `animation:` en el style)
  total = 2
El PO reporto **3** y Third era `js/strike-tracker.js:699`, que usa
`.raid-wing-card` **sin animacion inline**. Verificado: el style de :699 tiene
`background`, `border`, `border-radius`, `overflow`, `margin-bottom` y nada mas.
No hay `animation:` inline, asi que mi regex no lo podia ver.

**Por que el que perdi es el PEOR y no el menos importante:** la tarjeta del
Strike Tracker es **100% dependiente de la capa 2**. Su `opacity:0` NO esta en
el template, esta en `theme-polish.css:826`. Si alguien "arregla" solo los dos
sitios donde el estado inicial esta escrito en el HTML, el Strike Tracker sigue
en blanco y el test pasa. Ese es el fallo de alcance que un barrido escrito con
una sola forma valida produce.

**La regla (2a manifestacion del mismo eje, y al reves de la del HB#92):** un
detector que reconoce una sola forma produce **falsos negativos**, y un falso
negativo en un barrido de alcance es mas peligroso que un falso positivo, porque
el numero chico se lee como "es un punto" y se termina creyendo que el alcance
esta medido. Cuando el hallazgo de otro agente y el mio difieren en un conteo, la
diferencia es el dato: hay que **explicar la diferencia mirando el caso que mi
instrumento no puede ver**, no descartar el numero mayor. Arreglado: el barrido
ahora reporta tambien las clases que usan el estado inicial de la CAPA, y da 3.
﻿
---

# ALERT-126 — una fila de estado del BACKLOG envejece sola cuando el veredicto ya se cerro, y el detector de esa clase NO es instrumentable

**Descubierto en:** Heartbeat #95 (2026-10-01). **Clase:** estado compartido derivado, sin dependencia.
**Es la TERCERA vez en dos ciclos** que aparecen filas del BACKLOG que afirman algo
ya decidido (HB#93 encontro 2 sobre el hook `onClear`; aqui 2 mas). La diferencia con
aquellas: **estas dos son las que un agente leeria para volver a trabajar algo que ya
no existe.**

## El hallazgo

Dos filas de `BACKLOG.md` decían "esperando veredicto del Reviewer" cuando el veredicto
llevaba **30 y 40 heartbeats escrito** en `COMMS_LOG.md`:

| Fila | Idea | Lo que decia | Realidad, medida en `origin/main` |
|------|------|---------------|-----------------------------------|
| L114 | 56 | "PROVISIONAL: en rama, NO mergeada... esperando veredicto (`task-b20623f46caa`)" | **APROBADA y MERGEADA en el HB#55.** `git merge-base --is-ancestor 6178a8f origin/main` = **SI**. Follow-ups F1/F2/F3 en `979bfa6`/`23b1565`/`4c95774`/`72cc8af`. |
| L199 | 49G | "IMPLEMENTADA EN RAMA... esperando veredicto (pedido `20260930T181500Z-49g01`)" | **RECHAZADA en el HB#63, no se mergea** (COMMS_LOG 065, B1: `slice(4)` sobre prefijo de 5 chars -> `parseInt` NaN -> **se pierde el primer logro completado en cada lectura de cache**). `git merge-base --is-ancestor 1a47d5c origin/main` = **NO**, o sea que nunca llego a main y no hay nada que revertir. |

El daño no es cosmetics. La L199 describe una rama que **parece** ser trabajo en curso de
un capa de datos con ALERT-48 encima: es exactamente el perfil que se re-agenda, se
re-mide o se cherry-pickea por error. Y su B1 es un bug real de perdida de datos que
alguien podria "arreglar" — trabajo tirado, porque la implementacion esta rechazada
(regla de oro "codigo a construir vs a deprecar").

**Por que envejece sola:** el veredicto se escribe en `COMMS_LOG.md` (que crece cada
heartbeat) y la fila vive en `BACKLOG.md` (que se edita a mano). **Nada los liga.** La
unica defensa era leer el log entero, y el log tiene >300 lineas.

**Corregido en `BACKLOG.md` @ este ciclo:** las 2 filas ahora llevan el veredicto
cerrado, la medicion que lo prueba (`merge-base --is-ancestor`), y explicitamente que
**no hay nada pendiente y nada que revertir**. La L199 deja escrito que arreglar el B1
NO se hace y que las 4 mediciones de abajo si sobreviven (son datos, no codigo).
Diff **+2/-2**, 294 lineas antes y despues: se reemplazaron 2 clausulas de estado, no
se toco historial.

## Lo que NO se hizo, y por que: el detector de esta clase no es instrumentable

Escribi `tools/hb95-rows-falsas.mjs` para que esto no vuelva a pasar sola. **No lo
commiteo, porque en 6 candidatas dio 1 acierto, 1 falso negativo y 3 falsos positivos.**

- **Acierto:** L114 (Idea 56) — el cruce por `task_id` contra `COMMS_LOG` funciona.
- **Falso negativo (el importante):** L199, **la fila que si era falsa**, la dio como
  "pendiente real". Causa **estructural, no un bug del regex**: el id del pedido
  (`20260930T181500Z-49g01`) esta en la fila 061, que dice `Enviado`; el veredicto esta
  en la fila **065**, que **no repite el id**. Cruzarlos exige seguir la *cadena* de una
  conversacion a mano.
- **3 falsos positivos:** L10, L22 y L279 son **prosa que explica que una espera era
  falsa** (`...va con veredicto del Reviewer". **Era FALSO...**`). Una linea que *menciona*
  una espera no es una linea que *afirme* una espera, y el regex no puede distinguirlas.

**Regla que sale, y es la misma del HB#92:** *un detector al que hay que
argumentarle no se corre, y uno que no se puede discriminar no se commitea, porque el
proximo lo corre y le cree.* Un detector de museo con 3 falsos positivos es peor que no
tener detector: produce el "limpio" falso, que es la clase de ALERT-92. **La defensa real de
esta clase no es un regex sobre el texto: es que la fila de estado lleve el veredicto
en la misma linea**, que es como quedo ahora.

## Dos errores de metodo mio, de la misma clase, en el mismo ciclo

1. **`hb95-49g.mjs` atribuyo la 49G a "Idea 53".** Saque el identificador de una ventana
   de 6 lineas alrededor del match, y la ventana se come el identificador de la fila
   vecina. Es ALERT-125 exactamente (un detector con una sola forma produce falsos
   negativos y eso se lee como "es un punto"). Corregido: los ids se sacan **de la misma
   linea**, nunca de una ventana. La version corregida es la que produjo la tabla de arriba
   — y las 2 filas se confirman **midiendo el repo**, no leyendo la fila.
2. **`tools/hb95-49g.mjs` empezo a leer `tools/hb92-comms-legible.mjs` desde el clon
   compartido**, donde ese archivo no existe, y casi reporto "0 entregas invisibles"
   atribuyendole la salida de otro comando (el archivo no existia y el comando "corria
   bien"). Es el error de HB#93, repetido: **si un detector no esta donde creo, no le
   atribuyo su salida: lo corro donde esta.**
﻿
---

## ALERT-126 — ADDENDUM (mismo heartbeat, 30 min despues): el censo era 4 filas, no 2, y hay DOS clases distintas

Escribi el hallazgo como "2 filas falsas" y **era la mitad**. Al preguntarle al BACKLOG
cuantas filas mas afirman "SIN MERGEAR" (`tools/hb95-sin-mergear.mjs`, que si se
commitea), el numero real es **4 de 6**, y las 4 se corrigieron.

**Censo completo, todas medidas con `git merge-base --is-ancestor` contra `origin/main`:**

| Fila | Afirmaba | Realidad medida | Que se hizo |
|------|----------|-----------------|-------------|
| L114 | Idea 56 "PROVISIONAL: en rama, NO mergeada... esperando veredicto" | **APROBADA y MERGEADA** en el HB#55 (`6178a8f` en main) | Corregida |
| L199 | Idea 49G "esperando veredicto (`20260930T181500Z-49g01`)" | **RECHAZADA** en el HB#63 (`1a47d5c` **fuera** de main) | Corregida |
| L252 | Tramo F "SIN MERGEAR" | **MERGEADA** (`c04496e` en main; COMMS_LOG 067 la registra como `86b351a`) | Corregida |
| L253 | P3 "SIN MERGEAR" | **MERGEADA** (`376f0d5` **y** `9adf6dd` en main; COMMS_LOG 073: los 4 cambios en `0d1d0aa`) | Corregida |

Las 4 tenian la misma forma: **el commit de la rama y el estado "sin mergear"conviven
en la misma linea, y cuando el merge ocurre, la linea no se toca.** Las 4 quedaron obsoletas hace 30-40 heartbeats cada una.

## LAS DOS CLASES, Y SOLO UNA ES INSTRUMENTABLE

Esto es lo que la primera version de la 126 no distinguia, y es la leccion que mas rinde:

1. **Clase MECANICA — "SIN MERGEAR" cuando el commit ya esta en `main`.**
   Instrumentable, y de forma trivial: `git merge-base --is-ancestor <sha> origin/main`.
   **Committed** como `tools/hb95-sin-mergear.mjs`. Sale 1 si hay filas de esta clase.
   Control de calidad: **0 falsos positivos** sobre 5 candidatas, con control positivo
   explicito (las 3 filas que ahora marca son las 3 que *estan* mal) y saltando las
   filas ya corregidas por tachado.
2. **Clave NO instrumentable — "esperando veredicto" cuando el veredicto ya se cerro.**
   `tools/hb95-rows-falsas.mjs` dio 1 acierto, 1 falso negativo (justo la L199) y 3
   falsos positivos, y **no se commitea**. El falso negativo es **estructural**: el id
   del pedido esta en la fila 061 y el veredicto en la 065, que **no repite el id**, asi
   que cruzar pedido->veredicto exige seguir la cadena de una conversacion a mano. Los
   falsos positivos son prosa que *menciona* una espera en vez de *afirmar* una espera.

**Regla: separar "estado de git" de "estado de conversacion."** El primero se comprueba
con una llamada; el segundo no tiene ninguna. **Un detector solo es honesto sobre la
primera**, y en la segunda la unica defensa es estructural: **que la fila lleve el
veredicto en la misma linea**, que es como quedaron las 4.

## Dos formas distintas de decir "esto ya no lo arregles"

- **La 49G (L199):** el bug (B1) es real y **no se arregla**, porque la implementacion
  esta rechazada. Queda escrito en la fila para que "arreglarlo" no se lea como pendiente.
- **La L114 y la L253:** no hay bug, hay una afirmacion vieja. Se corrigen y listo.
- **El resto que el detector marca y NO se toca:** `L3` es la nota de cabecera fechada
  ("Actualizado: 2026-09-30T10:10:00Z"). **Es una foto de un momento y se deja como
  historia.** Un detector que pide corregir una foto historica no se puede usar como
  puerta: habria que reescribir la historia cada vez que algo se mergea.
  `L211` (`18ef9a4`) dice la verdad, el commit esta fuera de main.

## Nota sobre como fallo el conteo

Escribi "2 filas" y solo cuando me pregunte *cuantas* me di cuenta de que no habia
preguntado. La razon por la que el primer conteo fue 2: **busque la frase que ya tenia
en la cabeza** ("esperando veredicto"), no el estado que las filas afirman. Con la otra
frase (`SIN MERGEAR`) aparecieron 2 mas. Es la **quarta vez** que en este equipo un
`grep` por la cadena que uno tiene en la cabeza se lee como "el censo" (ALERT-109, la
ronda 19 y la 27 del PO, y el `onClear` del HB#93). **Censo = buscar el ESTADO, no la
palabra que uno uso al escribir.**
