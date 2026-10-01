# Heartbeat Principal #80 — 2026-10-01 UTC

> Ciclo corto y de una sola clase: el PO trajo 2 hallazgos y **la premisa del
> primero era falsa**. Lo que sigue es lo medido, no lo recibido.

## Lo que se entregó (2 fixes, 2 tests, 7 de 7 mutaciones MUERTEN)

- `9ab5733` **`fix(accounts)`: hacer clic en el nombre de una cuenta ya no te saca
  de la vista.** El atributo `data-toggle-expand-name` prometia expandir el
  nombre y lo unico que hacia era `state.view = 'cards' ? 'table' : 'cards'`.
  Estaba en DOS sitios, los dos con `cursor:pointer`: el `<article>` ENTERO de
  la vista compacta (`:343`) y el div del nombre (`:370`). El control honesto
  de la vista, `accountsToggleView` (`:571`), hace la misma mutacion 118 lineas
  mas abajo. Salida **(a)** del veredicto del Reviewer (fila 086): borrar, no
  inventar — porque `renderAccountCard` YA tiene el estado colapsado que el
  atributo prometia (la rama `state.compact`, `:341`), asi que implementar el
  atributo era anadir un segundo eje con la misma forma y otra granularidad.
  Test `tests/hb80-clic-cuenta.test.js`, 23 asserts.
- `585367d` **`fix(app)`: el mensaje de la puerta de permisos se borra antes de
  que se pueda leer.** El mensaje sale por 3 superficies, 2 persistentes y una
  con reloj (`ttl: 2500`). Ahora `ttl: 0`, que es "no se borra solo" y no "no se
  puede sacar": `toast()` arma el timer solo si `ttl>0` y el toast trae boton de
  cerrar. Test `tests/hb80-toast-permanencia.test.js`, 11 asserts, que separa
  los dos requisitos que el PO nombro: hb77 verifica que el mensaje **LLEGA**,
  este que se PUEDE **LEER**.

## La premisa del PO que era FALSA (y la mia, que la creyo a medias)

El PO propuso `ttl: 0` porque "`.toasts` es un grid `position:fixed` SIN
`max-width`, asi que el toast se estira hasta donde le permita el viewport".
**`main.css:461` declara `max-width:360px` en `.toast`**, y ninguna regla
posterior lo pisa. Medido con la cascada real: **360 x 235 px, 28,1% del
viewport, 10 lineas de texto**. No es un banner a pantalla completa.

Mi primera medicion dio **1266 px = 98,9% del viewport**, y era inventada:
armo un harness copiando a mano las 2 reglas de `theme-polish.css` y omiti la
de `main.css`. Es ALERT-105, y es el mismo modo de fallo que el Reviewer en la
fila 083 (medir una superficie que nunca llega) y que ALERT-100 (escribir la
ruta en vez del contenido): **un dato transcrito a mano desde un archivo, sin
ejecutarlo.** La v2 del harness extrae la cascada de los dos CSS con una regex y
la ejecuta; si el CSS cambia, el numero cambia solo.

La conclusion del PO sobrevive, pero por otra via, que es la que quedo escrita
en el codigo: 411 chars, 53 palabras, ~13 s de lectura a 250 palabras/min, contra
2,5 s de vida. Y el techo de 411 chars tampoco es el 364 que reporto el PO:
evaluando `REQUIRED_PERMISSIONS` (`app.js:679`) con los 7 permisos ausentes
—el caso que la dispara— da 411, y **ningun subconjunto de permisos da 364**
(rango de 5 ausentes: 311-357; de 6: 356-393).

## Verificaciones del ciclo

- Las **5 premisas del veredicto del Reviewer** sobre T2 medidas una por una
  antes de aplicar: C1 (los dos `cursor:pointer`, no uno), C2 (`data-account-id`
  aparece 3 veces en todo el repo, las 3 dentro de lo que se borra), C3
  (`state.view` NO se persiste hoy), C4 (`.account-card` tiene 0 reglas en
  `css/`), C5 (0 tests mencionan el atributo). **Las 5 confirmadas.**
- Suite completa: **999 pass / 0 FAIL en 37 archivos**. Es cota inferior
  (ALERT-107): el runner no cuenta 2 de los 37.
- Newlines verificados contando bytes del Buffer, no con `git status`.

## En vuelo

- **Reviewer `task-69d0d09ccf0a` (T6, la pregunta del ttl) sigue `running` a los
  40 min.** Se aplico igual, con medicion propia, y la premisa que se le paso
  (que no habia `max-width`) resulto falsa: si contesta, su veredicto va a
  estar sobre una premisa que ya no aplica. Se recoge el proximo ciclo.

## Decisiones que son de Pablo, no mias

1. **Detener la instancia duplicada del Heartbeat** (2da vez que se reporta).
2. Que hacer con las 2 ramas remotas ya mergeadas sin borrar
   (`docs-idea50p3-hb67`, `feat-idea56-forma-raids`), contra la regla y una del PO.
3. Las 7 ramas sin mergear, 6 de ellas en CONFLICTO.
4. Si `viewPref` (fila 081) se implementa: el fix de T2 tiene que estar antes,
   y su test deja la precondicion escrita para que alguien mire esa fila.

# Heartbeat Principal #77 - 2026-10-01 UTC

> **Este ciclo no avanzo una feature: audite la infraestructura del repo y
> encontre que el conteo de ramas estaba diciendo la cosa equivocada.** Todo lo
> de abajo esta medido con herramientas que quedan en `tools/` (no versionadas:
> `tools/.gitignore` = `*`).

## Tareas en curso

- **Reviewer** (`task-f191daf882b7`, enviada 04:0xZ): pregunta unica sobre
  `viewPref()` como helper compartido en `storage.js` y si las 2 claves de
  pestana huerfanas se IMPLEMENTAN en vez de borrarse. Sin respuesta.
- **PO**: ronda 20 incorporada. T5 opcion (d) ya mergeada en `b055bda`/`b1b74bb`.

## Completado

- **`task-9c356b9e56fd` (Reviewer, respuesta a la fila 079) recogida y VERIFICADA.**
  Veredicto APROBAR CON CAMBIOS, con dos correcciones en direcciones opuestas.

### 1) CORRIGE UNA PREMISA MIA (medida, no opinada)

Yo escribi en `TEAM_STATUS.md` y en la fila 079 de `COMMS_LOG.md`, con la
apariencia de un hecho, que **`raid_strike_view` esta en `MIRROR_MAP`**.
**Es falso.** Medido con `tools/hb77-verify-premisas.js` sobre `storage.js`:

```
MIRROR_MAP = 4 pares
  gn:account:keys          <-> gw2_keys
  gn:account:selected      <-> gw2_selected_key_v1
  gn:activities:home:nodes <-> gn_home_nodes_marked
  gn:activities:toggles    <-> gn_activities_toggles
  ¿alguno menciona raid_strike_view? NO
```

`raid_strike_view` solo aparece en `MIGRATION_PREFIXES` y `FALLBACK_MAP`. La
consecuencia se CORTA y es real: es un **dual-write sin espejo** -- escribe la
legacy, migra a la `gn:`, y **nadie lee nunca la `gn:`**. La preferencia de
pestana sube al Gist en `exportAll` y vuelve por `importAll` a una clave que el
modulo jamas lee. Estado de UI, no perdida de datos: arranca en `'raids'`.

### 2) CORRIGE AL REVIEWER: `accounts-panel.js` NO lee crudo

El Reviewer afirmo que "`accounts-panel.js` **sigue leyendo `gw2_keys` a pelo**
(el audit lo lista)" y que estaba incluido en los 4 lectores crudos por codigo.
**Es falso, y lo medi antes de darlo por bueno:**

```
localStorage.getItem('gw2_keys') crudo: SI
Storage.get(...ACCOUNT_KEYS):            SI
  | a LEGACY a pelo (`localStorage.getItem('gw2_keys')`),
censo por CODIGO: 4 -> inventory-dashboard, wv-objectives-dashboard,
                        wv-purchase-detail, wv-shop-ui
¿accounts-panel.js esta en el de por codigo? NO
```

El unico match es **el comentario que documenta el fix de hb72**. El codigo usa
`Storage.get(...ACCOUNT_KEYS)`. El fix esta aplicado; lo que quedo pendiente
fue el METODO de conteo (hb73), no el raw.

**Esto importa por la forma, no por el caso:** las afirmaciones del Reviewer
llegaron con la misma confianza y con numeros de archivo. Dos estaban bien, una
mal. Un veredicto con adjuntos se lee como un veredicto verificado, y no lo es.

## Pendientes

- **3 raws en `raid-tracker.js` (`:891`, `:1012`, `:1016`).** El Reviewer dice
  que el fix son 3 lineas: `Storage.get/set(STORAGE_KEYS.RAIDS_STRIKE_VIEW)`.
  **No aplicado todavia**: mi consulta `viewPref()` esta en el Reviewer y toca
  los mismos call-sites. Aplicarlos antes seria hacer el trabajo dos veces.
- **`raid-tracker.js:891` lee `gw2_selected_key_v1` crudo** y ESA si es legacy
  de un par espejo. Permitido por el guard, pero en el escenario Gist-nuevo
  (navegador limpio, importo `gn:account:selected`, la legacy no existe)
  `getItem` devuelve `null` mientras `Storage.get` habria devuelto el valor.
  Es el hallazgo con consecuencias reales del lote.
- **7 pares `gn:` con dual-write sin lector** (`raid_strike_view`,
  `gn:wallet:currencies`, `gn:wallet:pins`, `wvpd_icon_url`, `wvpd_open`,
  `gn:wv:shop:legacy_filter`, `gn:wv:shop:view`). Misma deuda, 7 lugares. El
  Reviewer no lo metio en idea61 sin medirlo.

## Alertas

### ALERT-100 -- un script de andamiaje tomo la RUTA por el CONTENIDO, y casi lo cuela (HB#77)

`tools/hb77-prepend-md.py` v1 hacia `BLOQUE = sys.argv[2]`: el segundo
argumento es la **ruta** del bloque, no el bloque. El archivo nunca se abrio, y
lo antepuesto a `TEAM_STATUS.md` y `ALERTS_LOG.md` fue la cadena
`tools/hb77-team-status-bloque.md`. El commit quedo con una linea de basura
arriba de dos logs del repo.

**Lo que lo delato fue `git diff --stat`: "3 files changed, 4 insertions(+),
1 deletion(-)"** para un bloque de ~150 lineas. Ese numero es la medida
independiente de la que habla ALERT-95, y fue lo que hizo dudar antes de
pushear.

**REGLA: un script que toma una ruta DEBE abrirla, y debe negarse a correr si
el resultado es absurdamente chico.** La v1 aborta si el bloque tiene menos de
20 lineas con texto, si las lineas agregadas son menos de 20, o si el archivo
resultante no arranca con la primera linea del bloque. **Y el numero de
inserciones de `--stat` se mira siempre: es el control de un diff que uno
cree conocer.**

### ALERT-95 -- un script NUEVO con veredicto con apariencia de autoridad

`tools/hb77-rama-superada.js` v1 clasificaba una rama como SUPERADA contando
solo los archivos **NUEVOS** que la rama agrega y main no tiene. Sobre
`docs-estructura-20260930` daba:

```
=> SUPERADA: main ya tiene todo lo que la rama agrega. NO mergear
```

**Falso, y con la forma exacta de una orden irreversible**: la rama trae
`ORG_MAP.md | 146 +++++` y `PROMOTIONS.md`. Actuando sobre ese veredicto se
borraba trabajo real con la seguridad de estar aplicando una medicion.

**REGLA: el veredicto de un script recien escrito se contrasta contra una
medida INDEPENDIENTE antes de actuar.** Aca fue contra `git diff --stat`, que si
mostraba `104 insertions(+), 44 deletions(-)`. Un `--stat` que contradice a un
script no es ruido: es la senal de que el script mide otra cosa. El metodo
correcto quedo en el archivo: comparar el contenido en **BASE / RAMA / MAIN**
(el diff de tres vias compara el MERGE-BASE contra la rama, asi que un archivo
que SOLO cambio en main aparece como MODIFICA de la rama).

### ALERT-96 -- una regex de pares sobre tablas contiguas inventa pares

`hb77-verify-premisas.js` v1 busco pares con `/'([^']+)'\s*,\s*'([^']+)'/g`
sobre **todo** `storage.js`. `storage.js` tiene 4 tablas clave:valor pegadas y
la regex empareja la COLA de una con la CABEZA de la siguiente: **58 "pares"
de los 4 reales**, uno de ellos `raid_strike_view <->
gn:wallet:dashboard:selected_currencies`, que no existe.

**REGLA: una regex que empareja DOS elementos recorta el bloque que declara la
estructura antes de correr.** Una tabla es un objeto literal con `:`, no una
lista. Y un conteo verosimil es peor que un error, porque no se nota.

### ALERT-97 -- `node --check` NO detecta un identificador mal escrito

Escribi `newvos` donde iba `nuevos`, en dos scripts seguidos. `node --check` paso
los dos: `newvos` es un identificador **valido**, solo esta mal. El fallo
aparece en ejecucion, cuando el script ya corrio. Peor: el primer "arreglo" borro
el stub `function newvos()` del final y dejo el uso en la linea 86 -- siguiendo
el sintoma, no la causa.

**REGLA: para un script que se ejecuta una vez, `node --check` es un filtro de
SINTAXIS, no de correccion. Se ejecuta.** Y despues de editar se relee el diff
antes de volver a correr.

### ALERT-98 -- el filtro de permisos del shell deny con "rm" en un comando sin "rm"

Un `git show ... > nul 2>&1` fue rechazado con `[HIGH] Shell command contains
'rm'` y **tardo 300s** antes de dar el denial. Revisado el comando: no hay `rm`
en ningun lado. No se por que lo matchea y **no se va a suponer**. Si hay que
repetir la operacion, se hace sin la forma que lo disparo (`> nul 2>&1` y los
bucles `for` de cmd no hacen falta: alcanzan `node` y `git`).

### ALERT-99 -- "+N commits" no dice si hay que mergear una rama

Con `tools/hb77-audit-ramas.js` y `tools/hb77-rama-superada.js`:

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

**2 ramas mergeadas sin borrar**, contra la regla de `AGENTS.md` ("NINGUNA rama
termina sin mergear a main + sin borrar"). No se borraron: borrar una rama
remota es destructivo y una de las dos es del PO, que puede tener su propio
clon. **Queda para Pablo.**

El hallazgo que no es de higiene: `+N commits` y `CONFLICTO` juntos seembran
"trabajo pendiente grande", y medido no es. `feature/legendary-component-tracker`
son 5079 lineas de las cuales **2 archivos (447 lineas) son material que main
NO tiene** (`js/detail-modal.js`, `js/legendary-tracker-theme.js`), 3 son
IDENTICOS y 11 DIVERGEN. Su trabajo se hizo de otra forma en main: **no es un
merge, es un cherry-pick dirigido de 2 archivos con 11 decisiones.**

## Estado de propuestas

- **Reviewer**: 4/4 de `b8bd0af` aplicados y con dientes de prueba. Ahora
  esperando el veredicto de `viewPref()`.
- **PO**: ronda 20 incorporada; `viewPref()` es su propuesta y esta la mande a
  validar antes de tocar 3 modulos.

## Verificacion del ciclo

- `inbox`: vacio, sin preguntas esperando a `default`. `replies`: sin nuevas.
- `overdue` reporta 1 vencida (fila 060, boton de cache) y es **FALSA por
  estructura** -- resuelta y mergeada en `950ea64`. Confirmado por cuarta vez.
- Suite: **1010 aserciones / 0 FAIL, 35 de 35 archivos** (era 964/0 en 34/34).
- Newlines: los 3 `.md` en CRLF, 0 LF sueltos nuevos, verificado por conteo.
- CJK: 5 en `TEAM_STATUS.md` y 20 en `ALERTS_LOG.md`, **los mismos que en HEAD**
  (comparacion por `Counter`, no por indice). 0 nuevos.
- Worktree `hb75-wt`: `main` local quedo **6 commits atrasado** de `origin/main`,
  y `js/app.js` en el worktree difiere de main (10 inserciones / 19 borraciones).
  `index.html` coincide. No se toco: no se si es WIP mio o de otro ciclo.
tools/hb77-team-status-bloque.md
# Heartbeat Principal #76 - 2026-10-01 UTC

> **Ciclo de recuperacion: un WIP de 46 asserts estaba stranded en un worktree y
> una red de tests se apago sin que nadie lo viera.** Las dos cosas se
> encontraron midiendo el estado real, no leyendo el resumen del ciclo anterior.

## Lo que estaba mal y nadie reportaba: un test que murio SIN CONTAR

Al recuperar el WIP se rompio `tests/idea64-dos-pestanas.test.js`, y la suite
siguio reportando verde:

```
TOTAL: 980 aserciones / 0 FAIL  (34 de 35 archivos, alcance completo)
sin resumen: idea64-dos-pestanas.test.js
```

**"0 FAIL" con un archivo sin contar.** El archivo murio con
`ReferenceError: REQUIRED_PERMISSIONS is not defined` (su sandbox `vm` extrae
SOLO el literal `const KeyManager = {` por equilibrio de llaves, y la lista
vivia como `const` a nivel de modulo, fuera del rango).

| Lo que decia | Lo que pasaba |
|---|---|
| `0 FAIL` | el archivo no llego a correr |
| `34 de 35 archivos` | el denominador delata, pero la linea de arriba no |
| `alcance completo` | y el alcance **no** era completo |

El `run-suite.js` tiene el contador de archivos por eso; lo que falta es que un
archivo sin resumen **suba el exit code**. Hoy es una linea de adorno.

**REGLA: `0 FAIL` sin el denominador completo NO es verde. Y un archivo que no
corre tiene que hacer fallar la suite, no anotarse al margen.**

**Consecuencia del mismo extractor, medida en carne propia:** el comentario que
explica el arreglo esta DENTRO del rango que se corta y se pega en el sandbox,
entonces no puede contener el needle que el extractor busca, ni comillas
invertidas, ni llaves desbalanceadas. Mis dos primeros intentosfallen
exactamente ahi (`SyntaxError: Unexpected template string`, y
`Invalid or unexpected token`). **REGLA: si un extractor corta por texto crudo,
el comentario que describes su comportamiento es codigo que se ejecuta.**

## Lo recuperado

`C:\Mis Archivos\GW2 online\hb75-wt` tenia WIP sin commitear sobre `main`:
la puerta de permisos de `addOrUpdate` (2 permisos) contra los 7 que la app
realmente usa, mas el texto del modal, mas un test de 46 asserts. **Tocaba
mergear y no se podia: WIP sin commitear.**

- Copiado **byte a byte** con `tools/hb76-recuperar-wip.py` (binario, por
  ALERT-94). Verificado por SHA.
- El worktree de origen **no se toco**.
- Rama `feat-hb75-permisos`, commit `ea10e9b`, pusheada.

El problema de fondo: con una key de 2 permisos la API responde 403 y la capa
degrada a `[]/0`, o sea **la cuenta parece VACIA en vez de mal configurada**
(Idea 47/57). La app autorizaba una key que no puede usar, y el texto del modal
era la parte que lo producia.

## Un fantasma que casi se commitia

`git status` mostraba `M js/accounts-panel.js` con `git diff` VACIO. Medido
contra `git show HEAD:` con `tools/hb76-verificar-fantasma.py`:

```
js/accounts-panel.js  IDENTICO a HEAD
   HEAD : 68160 bytes, 0 CRLF
   disco: 68160 bytes, 0 CRLF, 873 LF sueltos
```

Es ALERT-94 (LF/CRLF): `git update-index --really-refresh` lo marca
`needs update` aunque los bytes sean identicos. **Sin el chequeo de bytes, ese
archivo entraba al commit sin una sola linea de cambio real.**

## Estado de la suite

| | |
|---|---|
| Antes del ciclo | 964 aserciones / 0 FAIL, **34 de 35** |
| Al empezar (con el WIP a medias) | 980 / 0 FAIL, 34 de 35 |
| Final | **1010 / 0 FAIL, 35 de 35** |

Mutacion del regex nuevo (`tools/hb76-mutacion-regex.py`): M1 lista como const
suelta -> 9 FAIL; M2 se saca el scope `characters` -> 2 FAIL (el union de scopes
medido lo detecta, que es lo que el test promete); M3 lista borrada del codigo
-> 9 FAIL. Restaurado byte a byte y verificado.

## Tareas
- **Completada**: recuperacion del WIP de permisos + su test (`ea10e9b`).
- **En curso**: pregunta al Reviewer sobre los raw de `raid-tracker.js`
  (`task-254bb8f34cca`).
- **Pendiente**: merge de `feat-hb75-permisos` a `main`. **BLOQUEADO por el WIP
  sin commitear de `hb75-wt`**, que no se puede limpiar sin permiso: descartar
  esos archivos es una accion destructiva sobre trabajo ajeno.
- **Verificado hoy, sin cambios**: `gn:raids:strike:view` y `gn:converter:state`
  estan en whitelist, `STORAGE_KEYS` y `MIRROR_MAP` **sin un solo lector ni
  escritor** en todo el repo (grep sobre el repo entero: solo aparecen en
  `storage.js`).

## Alertas
- **ALERT-95 (nueva) - un archivo que no corre NO pone la suite en rojo.** Se
 vio verde con `34 de 35` y `0 FAIL`. El denominador existia y nadie lo leyo.
- **ALERT-96 (nueva) - `git status` con `M` y `git diff` vacio es ALERT-94, no
  trabajo perdido.** Verificar con bytes contra `git show HEAD:archivo` ANTES
  de commitear, porque `git checkout` sobre un archivo con un fix en el indice
  lo revierte (ALERT de hb72).
- **Confirmada por 3ra vez**: `overdue` reporta `Idea 50 boton cache` como
  VENCIDA y es FALSA por estructura (`overdue` lee `sent/`, `close` mueve a
  `archive/`). Verificado hoy contra git: `950ea64` **esta** en HEAD. No usarlo
  como senal de trabajo pendiente.

## Estado de propuestas
- Reviewer: 1 consulta abierta (`task-254bb8f34cca`), 1 sola pregunta.
- PO: ronda 20 incorporada; T5(d) ya estaba mergeada como Idea 84.

## Verificacion del ciclo
- `inbox` vacio, sin preguntas esperando a `default`, sin respuestas nuevas.
- `MEMORY.md` estaba desactualizado: las dos tareas que marcaba como
  "pendientes de recoger" ya estaban aplicadas en hb73 (`4eaf619`) y hb74
  (`b1b74bb`). Se recogieron igual, y se confirmo que ya estaban.
# TEAM STATUS — Bóveda del Gato Negro
# Heartbeat Principal #73 — 2026-10-01 01:40–02:20 UTC

> **Ciclo de auditoria: el Reviewer acerto en sus 4 puntos, y su propia guarda
> propuesta era una que NO puede fallar.** Las dos cosas se midieron, no se
> creyeron. Lo que sale del ciclo es una regla: **antes de agregar una guarda,
> MEDIR si puede fallar.**

## Lo que cambio: una limitacion DECLARADA era un hecho FALSO

ALERT-91 (el ciclo anterior) declaraba que el stripper de comentarios solo fallaba
con "cadenas multilinea con `//`". Eso era cierto y no media lo que importa.

La causa real es `//` **dentro de un literal de una linea** con codigo real
despues. `accounts-panel.js:832`:

    fetch('https://api.guildwars2.com/v2/account/home/nodes?access_token=' + x)

El stripper corta en `//` y se lleva `://api.guildwars2.com/... + x)).json();`.

| Lo que se declaraba | Lo que se midio (`tools/hb73-probe.js`) |
|---|---|
| "este archivo esta limpio" | **20 de los 42 archivos de `js/`** tienen al menos una linea asi |
| "0 backticks pegadas a `//`" | Era cierto y medi la pregunta equivocada: comillas simples, una sola linea |

**Y la direccion del fallo es la peor posible: BORRAR solo puede hacer que un
assert NEGATIVO pase, nunca que falle.** Demostrado con `tools/hb73-mutate.js`:
con el LECTOR CRUDO de la Idea 64 en una linea con URL, el assert negativo de la
seccion 6 **da PASS**. Solo la guarda nueva lo delata.

## El hallazgo contra el Reviewer: la guarda 2 era TAUTOLOGICA

Propuso "las llaves del texto crudo balancean". Medido: eso es **0 por
construccion**, porque `cuerpoDeMetodo` retorna solo cuando el depth llega a 0.
No puede fallar nunca — seria un `ok(true, ...)` disfrazado, la misma
enfermedad que este ciclo le saca a `idea61:193` y `:235`.

La que si puede fallar compara dos conteos (llaves CRUDAS == llaves SIN
comentarios). Y el caso que vigila es serio (`tools/hb73-probe3.js`): **una sola
llave desbalanceada en un comentario hace que el extractor devuelva 709 lineas
en vez de 34**, es decir, se come el resto del archivo. Con un assert POSITIVO eso
hace matchear codigo de otra funcion.

## El censo de idea61 contaba su propia documentacion

`idea61:234` contaba por TEXTO y daba 5. El quinto era `accounts-panel.js`, cuyo
unico match era el comentario que documenta el fix de la Idea 64. El mismo
comment-injection que apagaba el assert de idea64 estaba **inflando el censo de
idea61 en el mismo heartbeat**. Por codigo son **4**, y el `>= 5` seguia verde.

## Verificacion (fase roja por mutacion, no solo en verde)

| Chequeo | Resultado |
|---|---|
| idea64 con el fix | 30 pass / 0 FAIL (era 28) |
| **M1** LECTOR CRUDO en linea con URL | guard1 **FAIL**, y el negativo **PASS**: la guarda es lo que lo salva |
| **M2** llave en la prosa | guard2 **FAIL**, y guard1 tambien (el extractor se comio la funcion siguiente) |
| **M3** guarda tautologica del Reviewer | 0 por construccion: no se puede construir el caso que la haga fallar |
| idea61: mutar `wv-shop-ui.js` a leer por `Storage` | censo **PASS(4) -> FAIL**, restaurado -> PASS(4) |
| Suite completa | **883 aserciones / 0 FAIL**, 32 de 32 |
| Newlines y CJK en los 3 `.md` | preservados; 0 CJK nuevos |

**El total no se movio (883) y la red si:** +2 guardas que pueden fallar, -2
asserts que no podian. Mismo numero, distinta red.

Dos errores de arnes **mios**, del mismo modo que ALERT-79: mi primer detector de
lineas peligrosas contaba mal las comillas y reportaba **0** mientras la medicion
directa probaba que el codigo se borraba; y mi primer mutador indexaba el texto
**strippeado** pero mutaba el array **crudo** (el strip colapsa lineas), asi que
mutaba la linea equivocada y el piso no bajaba. Los dos errores salieron por un
assert que exigia el numero, no por leer el codigo.

## Estado del equipo

| Agente | Estado |
|---|---|
| **Code-Reviewer** | OPERATIVO. Respondio la fila 077 con P1/P2/P3/P4 y 3 preguntas de criterio. Veredicto: **aprobar con cambios**. |
| **PO** | Respondio la fila 078: ronda 20 escrita, y T5 con una **cuarta** opcion que no estaba en la lista. |
| **Documentador** | heartbeat 4h. Sin novedad este ciclo. |

**PASO 0 (canal `_comms`):** inbox vacio, sin preguntas esperando a `default`,
sin respuestas nuevas. `overdue` reporta 1 vencida (fila 060, boton de cache) y
es **FALSA** otra vez: esta resuelta y mergeada en `950ea64`, verificado hoy.

## T5: la cuarta opcion del PO (descarta 3 y propone una)

El PO medido sobre el catalogo de 206 y el input faltante:
- **(a) versionar el JSON** — no: dentro de 6 meses el build *funciona* y
  produce el catalogo viejo. Un proceso que funciona mintiendo.
- **(b) test de cantidad** — tal como estaba escrito es tautologico (`206 ===
  206`) o convierte la suite offline en la unica con red.
- **(c) dependencia externa no gestionada** — falsa: son endpoints publicos.
  Congelar para siempre con una etiqueta que suena a aceptada.
- **(d) versionar el SCRIPT QUE BAJA** — el patron ya esta al lado
  (`_fetch_thematic_prices.py`), y hoy el repo tiene el *transformador* del
  catalogo y le falta el que lo **baja**.

Ademas: el input faltante tiene **dos** consumidores, no uno.

## Pendiente

- **T5 (d)**: ~1 h, es la que mas duerde porque hoy el refresh depende de que el
  PO "se acuerde", y no hay forma de regenerar el catalogo.
- **Pregunta al Reviewer que dejo el PO**: `raid-tracker.js` tiene 3 operaciones
  crudas sobre claves legacy que estan en `MIRROR_MAP`. El guard de la Idea 61 no
  las excluye. ¿Las tolera o deberia prohibirlas tambien?
- **`viewPref()`**: 2 superficies de pestanas con persistencia parcial y 2 claves
  huerfanas ya registradas en la whitelist. Arregla 2 superficies sin crear feature.
- La ronda 20 del PO esta en su workspace, no en el mirror.

---



# Heartbeat Principal #72 — 2026-10-01 00:05–00:50 UTC

> **El ciclo encontró una red que era el bug.** El assert que decía "esto es el
> LECTOR CRUDO" pasaba porque el comentario que lo nombraba contenía el patrón
> prohibido. Un assert que afirma un defecto es una foto, no una red.

## Lo que se hizo

Arranqué con WIP sin commitear de otro ciclo en `js/accounts-panel.js`: el
"tramo siguiente" que el commit `15d6d75` declaro textualmente sin arreglar
("queda declarado en el test, no arreglado: es el siguiente tramo, no este").

**El fix es de una linea** y ya estaba bien encaminado: `syncAccountTagsToKeys()`
leia la lista de cuentas por `localStorage.getItem('gw2_keys')`, o sea el
**LECTOR CRUDO** que la Idea 61 §6 dice que hay que PROHIBIR. Ahora lee por
`Storage.get()`, que devuelve el valor vigente por el camino soportado.

## Lo importante: el assert estaba escrito al reves (ALERT-91)

| | |
|---|---|
| **Lo que decia** | "accounts-panel.js LEE la legacy a pelo: es el LECTOR CRUDO" |
| **Lo que hacia** | Affirmar el BUG. Solo podia pasar mientras el bug existiera. |
| **Y ademas** | No estaba acotado: matcheaba la **prosa**. El unico match del regex en el archivo es la linea 170, el comentario que describe el fix. |

**Medido antes de concluirlo:** el assert dio **PASS con el fix PUESTO**. La red
que debia cazar el bug era la unica cosa que hacia que pasara.

Es el mismo modo de falla que el propio test ya habia corregido para `save()`
("los asserts estan acotados al CUERPO del metodo, no al archivo") y que no
aplico 20 lineas mas abajo.

**Y acotar al cuerpo NO alcanza**, que es lo que se midio despues: el
comentario vive DENTRO de la funcion, tres lineas despues del `try {`. Con el
fix puesto seguia dando 1 FAIL. Los asserts de la seccion 6 corren ahora sobre
`cuerpoSinComentarios()`: la prosa que nombra un patron no es el patron.

El literal **queda en el comentario a proposito**, para que el helper siga
siendo lo que sostiene el assert. Si alguien lo borra, el assert sigue verde y
el helper deja de estar probado.

## Verificacion (no solo en verde)

| Chequeo | Resultado |
|---|---|
| Fase roja contra el archivo sin el fix | **1 FAIL**, por la razon correcta |
| Mutacion 1 (escritura por `localStorage`) | **2 FAIL** mas |
| Mutacion 2 (vuelta al lector crudo) | **1 FAIL** |
| Con el fix | 28 pass / 0 FAIL |
| Suite completa | **883 aserciones / 0 FAIL**, 32 de 32 |
| CJK y palabras pegadas, contra HEAD | **0 nuevos** |

Tercera red anadida: el assert de **escritura** por `Storage`. Sin el, arreglar
solo el lector habria pasado igual: la escritura ya usaba la API (la puso la
Idea 61), pero el lector no.

## Estado del equipo

| Agente | Estado |
|---|---|
| **Code-Reviewer** | OPERATIVO. Respondio la fila 076 (`task-509ffb6eb907`, ALERT-84 T3+T4). |
| **PO** |heartbeat 2h. Ronda 19 (IDEA 64) ya commiteada en el mirror. |
| **Documentador** | heartbeat 4h. Sin novedad este ciclo. |

**PASO 0 (canal `_comms`):** inbox vacio, sin preguntas esperando a `default`,
sin respuestas nuevas. `overdue` reporta 1 vencida (fila 060, boton de cache) y
es **FALSA**: esa fila esta resuelta y mergeada en `950ea64`. Es el refinamiento
de ALERT-67 — `overdue` lee `sent/`, `close` mueve a `archive/`.

## Mergeado y pusheado

- `b8bd0af` — el fix + los 3 asserts
- `70f235f` — merge a `main`

Suite en `main`: **883/0 en 32 de 32**.

## Pendiente

- Mandar ALERT-91 al Reviewer (1 pregunta de criterio).
- **T5 de ALERT-84, que el PO atino y es la que mas duerde:**
  `_legendary_items_full.json` no esta versionado y el script que lo consume no
  puede correr, asi que **no hay forma de regenerar el catalogo**. El refresh
  depende de que el PO "se acuerde", y eso no es un proceso.

---

# TEAM_STATUS — Bóveda del Gato Negro

# Heartbeat Principal #69 — 2026-09-30 22:28–22:45 UTC

> **Ciclo de rescate: encontre WIP de otro escritor con la suite en ROJO, y el
> FAIL resulto ser el hallazgo bloqueante del Reviewer.** No se gitearon para que
> el numero bajara: se leyo que invariante queria medir el test antes de tocarlo.

## Como encontre el problema

Al arrancar, `git status` mostraba **6 archivos modificados y 3 sin trackear** que
no eran de mi ciclo anterior. Antes de commitear nada, dos mediciones:

1. **¿El segundo escritor sigue escribiendo?** `mtime` identico en **3 lecturas**
   separadas a lo largo de ~3 min. Se detuvo. Con el arbol quieto, "no commitear"
   dejo de ser prudencia y paso a ser WIP huerfano.
2. **¿La suite pasa?** **No: 792/1 FAIL.** El FAIL era
   `el title declara que cuentas, pines y ajustes NO se borran`.

## Por que ese FAIL no se gito (es la leccion del ciclo)

Contrastado contra `task-f61e427b2efc` (Reviewer, veredicto **aprobar con
cambios**): su **H1, marcado bloqueante de merge**, pide que el `title` declare que
no se tocan cuentas, pines ni ajustes — porque el registro de la P3 **borra por
prefijo**. La version en disco de `index.html:289` lo habia perdido: el segundo
escritor sustituyo `(no toca cuentas, pines ni ajustes)` por
`(el boton dice cuantos bytes libera y cuantos quedan)`.

Los bytes son ciertos y son mejores que la enumeracion. Lo que se perdio fue **la
otra mitad del alcance**, y sin ella Pablo no tiene forma de saber si su cuenta o
su PIN sobreviven. **Bajar ese FAIL a 0 habria sido el bug, no el fix.**

Resolucion **aditiva**: el parentesis conserva integra la clausula del segundo
escritor y recupera el alcance. No se borro ni una palabra suya.

## Los dos veredictos, y por que no son contradictorios

| Fuente | Dice | Aplicado |
|---|---|---|
| **Reviewer** H2 | La enumeracion de `kept` es FALSA → hacerla exhaustiva | **No**, y esta medido por que |
| **PO** | ElEnumerar categorias no sobrevive → decir **bytes** | **Si** |

No hay desacuerdo real: el Reviewer diagnostico bien el bug (la frase era falsa) y
propuso un remedio que el PO demostro que se rompe solo. Los bytes que quedan
(`keptBytes`, `api-gw2.js` v2.31.0) son ciertos hoy y manana, cuando un modulo
registre su clave; una lista de categorias deja de serlo en el mismo commit que la
agrega. **Se aplica el diagnostico del Reviewer con el remedio del PO.**

**El tercer cubo `DESCONOCIDO` queda descartado, con el numero medido:** las 8 claves estan
nombradas con modulo y linea (`tools/idea50-censo-claves.mjs`), asi que no son
desconocidas, y restar una bolsa de "lo que no sabemos" le quita a Pablo la cifra
justo cuando la necesita.

## Tambien: ALERT-84 T1 (PO, ronda 17)

`index.html:750` muestra un item de menu VISIBLE que decia *"Cargando catalogo de
legendarias..."* **para siempre**: `loadLegendaryData()` es un stub que resuelve
`[]`, `renderCatalogSkeleton()` escribe "Cargando" y **nada lo reemplaza**. Un error
se investiga; un "Cargando" infinito se espera.

T1 **no implementa la funcionalidad** (T3/T4 la hacen): cambia el **estado que la
app dice de si misma**. Se conservan los `id` y el grid de 5 columnas, que son el
contrato que `render-catologo.js` va a usar. Commit `d64e688`.

## Estado

| | |
|---|---|
| **Suite** | **793/0 FAIL, 29/29 archivos** (crece de 739) |
| **Commits del ciclo** | `d64e688` ALERT-84 T1 · `46b2d7f` keptBytes + H1 · `f8286b8` cierre ALERT-85 |
| **Rama** | `feat-idea50-boton-cache` — **SIN MERGEAR a proposito** |
| **Bloquea el merge** | **Nada.** El Reviewer escribio que `onClear` esta "NO exigido"; H1 y H2 eran la condicion y ya estan. Ver la fila siguiente |
| **Lo que si queda pendiente** | El hook `onClear` no bloquea el merge pero si el **valor** del boton: sin el, borrar el disco y seguir sirviendo de memoria hace que los bytes liberados se vuelvan a consumir, y el numero que Pablo ve deja de ser el que se libero. Anotado en `BACKLOG.md` |
| **Sin commitear** | `ORG_MAP.md.bak-20260930-chatadmin` (backup, no es codigo) |
| **Produccion** | No se toca. Nada promovido a `origin`. |

**H1 y H2 del Reviewer estan corregidos**, que era la condicion que puso para
mergear. Correccion a lo que escribi mas arriba en este mismo ciclo: **`onClear`
NO bloquea el merge** — el Reviewer lo marco "NO exigido". Lo que bloquea es el
valor del boton, que es distinto de bloquear el merge, y no conviene escribir dos
cosas distintas como si fueran una.

---

# TEAM_STATUS — Bóveda del Gato Negro


# Heartbeat Principal #68 — 2026-09-30 22:20–22:55 UTC

> **Ciclo de cierre del boton y de decision de producto. Mergeado: nada de codigo
> que dependa de una respuesta que todavia no llego.** Lo que se cerró es una
> mentira del texto, que era lo unico que el usuario leia antes de confirmar una
> operacion destructiva.

## Lo que se corrigio: el copy del boton decia una recarga que no pasa

`70414d2`, en la rama `feat-idea50-boton-cache` (**sin mergear**).

El boton confirmaba con *"La próxima carga volverá a descargar los datos"*. Eso es
**FALSO para el Wizard's Vault**: `wizards-vault.js:40-41` tiene su propia
`__mem`/`__inflight` y el borrado **no la alcanza**, asi que tras el boton el WV
sigue sirviendo desde memoria. El Reviewer lo habia senalado en la nota al pie de
la fila 073 y quedaba planteado, no escrito.

No es un detalle de redaccion. Es el modo de falla de **un dato sin alcance
declarado** (ALERT-68 y ALERT-78) aplicado al unico texto que Pablo lee antes de
confirmar una operacion destructiva.

- El copy pasa a decir *"La API volverá a descargar los datos. Lo que otros módulos ya
  tienen en memoria (el WV) se conserva hasta que recargues la página."* Promete
  lo que pasa, y dice **hasta cuando**.
- **5 aserciones nuevas** en la seccion 4b del test. Dos comprueban que la
  limitacion es **REAL** (el WV tiene su propia `__mem`) y que el boton aun **no
  la alcanza** — esa segunda **acotada al CUERPO de `clearApiCache()`**, no al
  archivo entero, que es ALERT-81.
- **La asercion se va a caer sola** cuando entre el hook `onClear`. Eso es lo que
  se quiere: que el limite quede escrito y no en la cabeza de nadie.

**Fase roja por MUTACION** del copy al texto viejo: **3 FAIL**. La red muerde.

## ALERT-82: el titulo del boton es un alcance, y el PO no lo habia leido

El PO midió 72 call sites de escritura y concluyó que *"el boton va a mentir"*:
`removed`/`bytes` describen la cache del registro (23 bases) y no **toda** la cache
de Pablo. **La direccion es correcta; la premisa le faltaba una linea.**

Medición propia sobre las bases reales declaradas en `api-gw2.js:1708-1716` y
`wizards-vault.js:615` (no sobre el grep del PO):

| | lineas |
|---|---|
| escrituras a localStorage fuera del registro | **36** |
| de esas, **dato del usuario** (asignaciones, filtros, orden, tiers, pins, token de gist) — conservadas a proposito | **29** |
| de esas, **cache real** en otros modulos | **7** |

Las 7: `characters.js:287` `MAPS_CACHE_KEY`, `:311` `POIS_CACHE_KEY`, `:357`
`PROF_ICONS_CACHE_KEY`, `:388` `RACE_ICONS_CACHE_KEY`, `activities.js:606`
`PSNA_CACHE_KEY`, `app.js:627` y `:1158` `LS_CURR`.

O sea que el PO (que estimo 13 de cache) **sobrevvalo por 6**, y **las 7 estan en
modulos que no son "la API"**. El boton se titula *"Liberar la caché de la API"*: eso
**ya es un alcance declarado**, y por eso el número no es una mentira sino un
número de un subconjunto con nombre.

**Pero esa lectura es MIA, y por eso se la mandó al Reviewer como pregunta de
criterio y no la di por hecha.** La decisión de si Pablo espera que el boton
libere *toda* su cache o *la de la API* es **de producto**, y segun la regla del
proyecto no es mia ni del Reviewer: es **del PO**.

## Verificacion

- **Suite completa: 739 aserciones / 0 FAIL, 28 de 28 archivos** (alcance completo, una
  sola fuente de verdad desde el P4).
- Test del boton: **45 pass / 0 FAIL** (era 40).
- `node --check` limpio en los 2 `.js`. `git diff --stat` quirurgico.
- **El ALERTA-79 verificado releiendo el diff de los `.js` y el texto de los dos
  mensajes antes de enviarlos.** Los dos restores con Python, nunca `Set-Content`.

## Tareas en curso / pendientes

| Que | Con quien | Estado |
|---|---|---|
| **Boton de la cache** (Idea 50, ultimo tramo) | **Code-Reviewer** | `feat-idea50-boton-cache` @ `70414d2`, **SIN MERGEAR**. Pregunta 1: titulo vs tercer cubo. `task-f61e427b2efc` / ask `11a3c7` |
| **Tercer cubo** (`DESCONOCIDO`) | **product-owner** | **NO decidido.** Es producto, no ingenieria. El PO tiene la palavra y la pregunta acotada. `task-1b6241ed5c58` / ask `9c1e44` |
| **hook `onClear` / `__cacheClearMem()`** | yo | Tramo siguiente. Sin el, borrar el disco y seguir sirviendo de memoria hace que los bytes se vuelvan a consumir. **La asercion 4b lo va a marcar** |
| **7 claves de cache fuera del registro** | producto | Ampliar el alcance del boton. **NO lo decido yo.** Con el registro global, agregar bases despues es agregar lineas, no reescribir el borrado |
| **49G** `ach_acc` compacta | yo | **RECHAZADA** (ALERT-73), no mergeada. El fix va sobre `feat-idea49g-ach-acc-compacta` (`1a47d5c`) |
| **Idea 49 punto 1** badge del LM | yo | **DESBLOQUEADO y decidido por el PO**: va en **Raid Tracker** (no Strike Tracker), campo `modes`, declarado *"no disponible todavia"*, **nunca `true`**. No iniciado |
| **Idea 49 punto 2** (marcado real del LM) | externo | **BLOQUEADO**, y no por la API: no hay flag trackeable en el juego todavia |
| **49D** barrido de huerfanas | yo | **BLOQUEADA** por el Tramo 3. Si entra, excluye las 4 de `MIRROR_MAP` explicitamente |
| **Idea 63 T1-vs-T3** (persistencia de filtros) | **Pablo** | Las dos son **CONTRARIAS**: T1 resetea al cambiar de cuenta, T3 persiste por cuenta. Es preferencia de uso. T1 ya esta mergeado (`eb69fb3`) |
| **Documentacion** | documenter | Su turno; el Principal no hace fallback |

## Alertas

- **ALERT-79** (vigilante): releer el diff de los `.js` **y el texto de los mensajes** antes de enviarlos. Cumplido este ciclo.
- **ALERT-80** (vigilante): ediciones solo por `edit_file` o Python con `newline=''`. Los dos restores de hoy fueron por Python.
- **ALERT-81** (cerrada): los 2 invariantes demasiado anchos del P3 ya estan acotados al cuerpo donde vive el fix.
- **ALERT-82** (nueva): un titulo es un **alcance**, y medir sin leer el texto donde el numero se muestra produce una alarma de magnitud equivocada. El PO midió bien y le faltaba el titulo.
- Sin timeouts nuevos que escalar. El `task-1073c89cfd92` (Reviewer) expiro a los 1800s **sin respuesta**: no es un "no", y el ask se reenvio por las dos vias.

## Pendiente para el proximo ciclo

1. `check_agent_task('task-f61e427b2efc')` (Reviewer) y `('task-1b6241ed5c58')` (PO).
2. Con el veredicto: **mergear el boton** o **sacarle el titulo**. La rama tiene 2 commits y la suite esta en 739/0.
3. Si el tercer cubo entra, es un Tramo aparte: `cacheClear` pasa a devolver tres cubos y `kept` con motivo.
4. El hook `onClear` es lo que hace que el boton sirva de algo completo. Sin el, elWV reescribe en memoria lo que se acaba de borrar.

---


# Heartbeat Principal #65 — 2026-09-30 20:30–20:55 UTC

> **Ciclo corto y sin urgencias: 1 veredicto recogido (el Tramo 3 de la Idea 61,
> APROBADO CON CAMBIOS), implementado y mergeado. El PO no tiene nada nuevo que
> mandar al Reviewer.** La leccion del ciclo es de REDACCION: el invariante que
> yo habia escrito describia algo que el codigo no promete.

## Lo que contesto el Reviewer (ALERT-76 cerrado por el lado del Recambio)

`task-158ad5f65850` → **APROBADO CON CAMBIOS** el recambio del Tramo 3. Tres cosas
que cambiaron lo que yo habia escrito:

1. **P3 no va en este Tramo.** Verifico por medicion que las 18 bases de la capa
   de cache contra las 4 `gn:` de `MIRROR_MAP` y sus 4 legacies dan
   **interseccion = 0 pares**: `putCache` no puede escribir una clave espejo.
   Meterlo haria pasar el test por la razon equivocada. **P3 (`__cacheBases` +
   `wizards-vault.js:38`) sigue abierto y sigue siendo lo unico que bloquea el
   boton de `cacheClear`.**
2. **El invariante estaba mal redactado.** Yo escribia *"si y solo si NADIE
   escribe por afuera"*. La palabra **"solo" describe algo que el codigo NO
   promete**: `_resyncMirrors` existe **justamente** para tolerar escritores
   externos, asi que el espejo se mantiene AUNQUE alguien escriba por afuera. Lo
   que si es cierto por construccion: el espejo se mantiene para todo **lector
   que pase por `Storage`**, porque `Storage.get` lee la legacy primero. Y lo que
   hay que **forbidar** no es el escritor crudo de la legacy — que hoy es el que
   escribe, y sin el se pierde la lista de cuentas — sino el **LECTOR CRUDO de la
   `gn:`**, que es el unico que se saltaria el espejo. Medido: **0**.
3. **"En disco" y "en sesion" son dos hechos distintos.** `_resyncMirrors` tiene 2
   callers, ambos dentro de `migrate()`, y `migrate()` solo corre desde `init()`.
   O sea que la `gn:` **en disco** se refresca solo en el arranque; lo que ve un
   lector con `Storage.get` es correcto al instante. Por eso son **dos
   aserciones**, no una.

**Regla que sale:** un invariante tiene que describir lo que el codigo PROMETE, no
lo que uno quisiera que prometiera. El "solo" estaba Moldova ahi porque hacia el
invariante mas fuerte y por lo tanto mas pleasing, y none de las dos mitades era
lo que `_resyncMirrors` hace.

## El agujero que cerro la pieza 3, y era real

El Reviewer lo nombro y lo verifique: **`tools/audit-61-congeladas.mjs` armaba sus
pares desde `MIGRATION_PREFIXES` y NO MENCIONABA `MIRROR_MAP`.** Hoy las 4 `gn:`
de `MIRROR_MAP` caen adentro **por coincidencia, no por construccion**. Si manana
una sale de `MIGRATION_PREFIXES`, el par desaparece del recuento, el `n === 0`
sigue en verde y **nadie se entera**. Ese es el falso negativo que el propio
audit documenta en su cabecera (lineas 38-45).

El agregado nuevo se arma leyendo `MIRROR_MAP` **directo**, y ademas ya no pasa
por `filas` — que se saltea los pares que nadie nombra, o sea que un par espejo
sin escritores ni lectores se borraba del agregado justo cuando mas importa.

## Mergeado: `905dc77` / `5c80ae5`

- **Seccion 6 del test 61, 21 aserciones nuevas** (36 pass / 0 FAIL en el archivo).
  Por cada uno de los 4 pares, en **comportamiento y no en texto**: `set` escribe
  en las dos claves, `remove` borra las dos, `get` lee la legacy primero en
  sesion, `init()` resincroniza la `gn:` en disco. **Los otros 3 pares no tenian
  ni una asercion de espejo**: solo `gn:account:keys`.
- **Pieza 2**: el audit imprime `ESCRITORES CRUDOS (legacy espejo): 0 |
  LECTORES CRUDOS (gn: espejo): 0 | LECTORES CRUDOS (legacy espejo): 11`, y el
  test lo exige en 0 sin reimplementar el barrido (misma norma que la seccion 4).
- **Pieza 3, la que sostiene a las otras dos**: toda `gn:` de `MIRROR_MAP` tiene
  su legacy en `MIGRATION_PREFIXES`.

**Fase roja, dos veces, porque una red que no puede romperse no es una red:**
- Contra `storage.js` de antes del espejo (`85140bf~1`): **6 FAIL**.
- Contra una mutacion que saca la escritura espejo de `set` y la llamada a
  `_resyncMirrors()` de `migrate()`: **11 FAIL**, 8 nuevos de la seccion 6
  (2 por par).

## Verificacion

- Suite completa: **512 aserciones / 0 FAIL, 26 archivos**.
- Los **7 archivos con formato de resumen no parseable** se verificaron aparte
  por exit code (el conteo del runner no los ve): **los 7 en 0**.
- `git remote -v` antes del push: el unico remoto es
  `origin -> PabloSnchz/gw2-wallet-agents` (desarrollo). **Produccion intacta.**
- Post-push: 8 ramas remotas, **ninguna con prefijo de remoto** (correcto).
- Rama `idea61t3-espejo-4pares` mergeada y borrada (local; el borrado remoto dio
  "remote ref does not exist", que es lo correcto: nunca se pusheo).

## Tareas en curso / pendientes

| Que | Con quien | Estado |
|---|---|---|
| **P3** `__cacheBases` + agujero de `wizards-vault.js:38` | Code-Reviewer (mio, el pidio el) | **ABIERTO.** Unico bloqueante del boton de `cacheClear` (Idea 50, Tramo siguiente) |
| **49G** `ach_acc` compacta | yo | **RECHAZADA**, no mergeada. B1 reproducido: `slice(4)` sobre prefijo de 5 chars → NaN. El fix va sobre la rama `feat-idea49g-ach-acc-compacta` (`1a47d5c`) |
| **Idea 49 punto 1** badge del LM del Raid | yo | **DESBLOQUEADO.** Se implementa con `modes` declarado "no disponible todavia" |
| **Idea 49 punto 2** (marcado real del LM) | externo | **BLOQUEADO**, y no por la API: no hay flag trackeable en el juego todavia |
| **49D** barrido de huerfanas | yo | **BLOQUEADA** por el Tramo 3, que acaba de aterrizar. Si entra, excluye las 4 de `MIRROR_MAP` explicitamente |
| Ronda 15 del PO | product-owner | En su workspace (18:55Z), **no esta en el mirror**. Sin nuevas ideas que mandar al Reviewer |
| **Documentacion** (CHANGELOG, README) | documenter | Su turno; el Principal no hace fallback |

## Alertas

- **ALERT-75** (cerrada, ya acting-on): un resumen no puede pisar al artefacto que resume.
- **ALERT-76** (cerrada este ciclo): el Tramo 3 recambiado, testeable sin `putCache` y sin P3.
- Sin alertas nuevas en este ciclo.

## Pendiente para el proximo ciclo

1. **`P3`**, que es lo unico que bloquea el boton. Pregunta ya acotada por el
   Reviewer: `putCache` que registre las bases que escribe y `cacheClear` que
   itere ese registro, **mas** el agujero de `wizards-vault.js:38`, que tiene su
   propio `lsSet` y su propio `kLS` **fuera de la capa** — o sea que su cache no se
   libera con el boton y el grep del test no lo puede ver.
2. Ronda 15 del PO: decidir si se pide el mirror (no hay urgencia) o se espera a
   la 16.
3. Nada bloqueante. La 49D sigue esperando al Tramo 3, que ya esta.

---


# Heartbeat Principal #64 — 2026-09-30 19:30–20:05 UTC

> **Ciclo de verificacion: 2 veredictos leidos, una contradiccion entre dos
> artefactos del MISMO agente, y la 50F mergeada.** El codigo no estaba mal. El
> resumen que llego despues si.

## El hallazgo del ciclo: un resumen puede pisar al artefacto que resume

El Reviewer escribio **dos veredictos sobre la misma 50F, separados por 11
minutos, y se contradicen**:

| momento | artefacto | que dice de la 50F | que dice de su P2 |
|---|---|---|---|
| `18:44:32Z` | `170948Z-982658` | **APROBADO CON CAMBIOS, "Mergealo"** | "el recorrido **esta bien**. Confirmado" |
| `18:55:33Z` | `185533Z-ddc4d4` | **RECHAZADO** | "`removeItem` en vivo muta `length`… el recorrido borra sobre lo que ya recorrio" |

**Verifique contra el archivo real**, no contra el diff ni contra los dos
resumenes: `git show c04496e:js/api-gw2.js` (1704-1719). El codigo **recopila en
`doomed` y borra despues**. El codigo esta bien. **El resumen es el que esta
mal** (ALERT-75).

Dos fuentes independientes coinciden con el veredicto de las 18:44: el archivo
`982658` y la **auditoria propia del PO** (`_pre_r15.md`, que lista
`982658` = "APROBADO CON CAMBIOS, 0 bloqueantes de codigo").

**Y el error mio es la parte importante:** el HB#63 leyo el resumen. Si hubiera
actuado por ahi, la 50F queda afuera por un motivo que no existe — y el
veredicto bueno, el que decia "Mergealo", se hubiera perdido. **Regla que sale:
cuando dos artefactos del mismo agente se contradigan, gana el que tiene el
detalle y la evidencia, y el resumen se contrasta contra el CODIGO antes de
actuar.** Un `subject=` o una tabla no son un veredicto.

## 50F MERGEADA — `86b351a`

`c04496e` + `a330d30` (P4). Con veredicto, asi que ALERT-48 esta cubierta.

- **Borra de verdad.** Las 18 claves de la capa, por allowlist **exacta** y no
  por prefijos: `wallet` y `luck` son nombres pelados, y un barrido por familias
  habria dejado vivas justo las que mas cuota gastan.
- **Garantia probada:** no toca `gn:account:keys` ni `gw2_keys` (las 27
  cuentas), ni pines, ni tema, ni caches de otros modulos.
- **P4 aplicado** (el unico pedido duro del Reviewer): `cacheClear(opts)` nace
  con `{dryRun:true}` y devuelve `{removed, kept, bytes, dryRun}` sin borrar.
  En `dryRun` **tampoco** se vacia `__mem`: la pregunta es "cuanto borraria", y
  vaciar la cache de sesion antes de responder ya seria borrar.
- **`removed` paso a ser un hecho:** era la cuenta de llamadas a `lsDel`, que se
  traga la excepcion. Ahora es la diferencia real de `localStorage.length`.

**Fase roja del P4: 8 FAIL** contra el archivo sin el fix, 38/0 con el. El FAIL
que mas dice es *"el borrado real borra las 3 (obtenido: 0)"*: contra el
archivo viejo, la llamada de PREVIAJA ya se habia comido las tres claves,
porque no habia `dryRun` que la distinguiera. O sea que el test no verifica una
forma: verifica que **la firma vieja no puede responder la pregunta**.

**Suite: 369 pass / 0 FAIL**, 25 archivos, todos `exit 0`. *(Conteo mio, y
aclaro por que NO es 581 como decia el HB#63: el repo tiene **tres** formatos
de resumen entre los tests y mi primer runner conejia dos, contando como
fallo los 10 que no usaban ninguno. El `exit 0` de los 25 es el dato fiable.)*

**NO cambia lo que Pablo ve:** la funcion sigue con **0 callers**. El boton es
el Tramo siguiente. Arregla una funcion que miente; no agrega UI.

## Lo que queda abierto, y de quien

| | quien | que |
|---|---|---|
| **P3** | Reviewer | `__cacheBases` + el agujero de `wizards-vault.js:38` (su propio `lsSet` y `kLS` **fuera de la capa**). **Bloqueante para el BOTON**, no para el merge. Sin esto, la cache de ese modulo no se libera y el grep del test no lo puede ver. |
| **ALERT-76** | Reviewer | El **Tramo 3 de la 61 ya no puede fallar nunca** (tautologico con el espejo mergeado), y su unica asercion sobre el espejo es un **regex sobre el texto de `MIRROR_MAP`**. Le pregunte si el Tramo 3 recambiado es testeable sin tocar `putCache`. |
| **49G** | mia | **NO mergeada y no se mergea.** B1 reproducido (`slice(4)` sobre prefijo de 5). Sin nada que revertir: la rama no esta en `main`. |
| **49D** | PO | **Mas peligrosa, no menos.** Ya no la deja huerfana: le hace perder su contraparte y `Storage.get` cae al fallback. Si entra, excluye las 4 de `MIRROR_MAP` explicitamente. |
| **61 T1-2** | mia | Fix-forward, no revert. Aceptado el matiz del Reviewer: el bug del `remove` es **latente** (los 4 `Storage.remove` son de `ACCOUNT_SELECTED`, que no esta en `MIRROR_MAP`), asi que baja de corrupcion a bomba de reloj. |

## El ciclo con los otros agentes

- **Reviewer (ALERT-72, vigente):** su heartbeat esta `enabled: false` y ningun
  cron lo toca. Por eso el mensaje de este ciclo va **por `submit_to_agent`**
  (`task-158ad5f65850`) Y por el canal. El canal solo garantiza que el mensaje
  **llega**; no que alguien lo **lea**.
- **PO:** heartbeat `enabled: true` cada 2h, asi que el canal le llega solo. Le
  mande la merge de la 50F, el P3 que le corresponde, y el **ALERT-76**, que le
  cambia la premisa de la 49D.
- **Sin propuestas nuevas para el Reviewer (paso 3 del ciclo):** la ronda 15 del
  PO (18:55Z) produjo un **hallazgo sobre el canal**, no una idea. Y aun no esta
  en el mirror del repo (que esta en la ronda 14, 16:55Z).

## Adoptada como regla del ciclo

Propuesta del PO, y la adopto porque es **mas chica y mas verificable** que la
mia: **una comms queda cerrada solo con `close`; `inbox` no cuenta como leida.**
Confirma su hallazgo contra la regla: `last_read.json` existe y no lo lee nadie,
asi que el canal **no puede** distinguir entregado de leido, y una regla de
entrega no deberia pretender cubrirlo.


# Heartbeat Principal #63 — 2026-09-30 19:00–19:40 UTC

> **Ciclo de entrega: 3 veredictos leidos, 1 bug real corregido, 1 merge
> deliberadamente NO hecho.** El PO y el Reviewer tenian razon en casi todo, y
> en lo que no la tenian tambien habia un dato que se podia verificar.

## Los 3 veredictos que estaban makejados (los leí todos)

| commit | veredicto | que hago |
|---|---|---|
| `1a47d5c` (49G) | **RECHAZADO**, 2 bloqueantes | **NO se mergea.** B1 reproducido. |
| `c04496e` (50F) | APROBADO CON CAMBIOS, 0 bloqueantes | Queda para el boton; el unico cambio es P3. |
| `85140bf` (61 T1-2) | APROBADO CON CAMBIOS, **ya en main** | **Fix-forward**, no revert. |

> Una correccion de inventario: el PO resumio la 50F como "RECHAZADO" y el
> archivo de veredicto dice **"APROBADO CON CAMBIOS — ningun bloqueante de
> codigo, 1 de test"**. Gana el archivo. La 50F nunca fue bloqueada; lo unico
> que el Reviewer pide es P3 (`__cacheBases`), que el mismo califica de
> **no bloqueante para mergear, bloqueante para el boton**.

## ALERT-73: la 49G pierde el primer logro completado, y lo reproduje

`decodeAchAcc` hace `stored.slice(4, sep)` sobre un prefijo de **5** caracteres
(`'v1:C:'`). Sobre `'v1:C:1595,2001|P:1002:3:10'`:

```
A) red   -> [1595, 2001, 1002]
B) cache -> [1002, 2001]        1595 desaparece
```

`slice(4)` deja el `:` pegado al primer id, `parseInt(':1595')` = `NaN`, y la
guarda `if (!isNaN(ids))` lo descarta. **El primer logro completado de cada
cuenta se pierde en cada lectura de cache.** Con TTL de 2 min y 27 cuentas, los
logros completados de Pablo se borran y reaparecen, intermitente: nadie lo
reproduce a mano.

**Lo verifique con un repro propio sobre el texto real de la rama**, no leyendo
el diff ni copiando el codigo (extrae `encodeAchAcc`/`decodeAchAcc` del archivo
y las evalua).

**La rama NO esta en `main`** (`git merge-base --is-ancestor 1a47d5c main` ->
false). O sea que **no hay nada que revertir**: basta con no mergearla.

**Por que la suite daba verde:** ninguna seccion del test lee una entrada
compacta con ids completados — la 1 lee red (el decode no corre), la 4 mete la
forma vieja, la 7 usa un localStorage nuevo. **El formato nuevo no estaba
probado en el unico camino donde se usa.**

## ALERT-74: el NaN de "Puntos de logros" — abierto PROPIO y corregido

`characters.js:450` sumaba `a.current` a pelo filtrando por `a.done`. La API
**omite `current` en un completado sin tiers** (`{"id":202,"done":true}`, literal
de la wiki). `0 + undefined` = `NaN`, y el NaN **se propaga** a todos los logros
que se sumen despues.

**No es de la 49G y el fix de la 49G no lo arregla.** El PO propuso que
codificar `cur`/`max` en la cache lo resolvia. **Es falso, y lo verifique
ejecutando los dos caminos:**

```
camino RED (sin `current`)            -> NaN
cache "arreglada" pero RED igual      -> 42     (el camino RED sigue igual)
Number(a.current) || 0                -> 42
```

El bug esta en la **forma**, no en la red ni en la cache. Codificar `cur`/`max`
solo cambia lo que devuelve la cache; la primera carga de cada sesion (y
`nocache`) daria NaN igual. **Son dos arreglos, en dos archivos, y el segundo no
depende del primero** — por eso se abre propio, para que no se pierda por estar
pegado a otra cosa.

**Corregido**: `8dd53a0`, `Number(a.current) || 0`. Suite **581 pass / 0 FAIL**.

## Dos errores de arnés, mios, y el mismo patron

1. **La primera version del test copiaba la suma a mano** en una funcion
   `suma()`. Daba 5 FAIL con el fix puesto: el helper era una **copia del bug**,
   no el codigo. Un test que no puede pasar nunca no es una red. Ahora **extrae
   la linea real del archivo y la evalua**, y se verifico en las dos
   direcciones (6 FAIL sin el fix, 12/0 con el).
2. **Una asercion existente ataba el fix sin proteger el motivo.**
   `idea55` exigia el texto EXACTO `if \(a\.done\) total \+= a\.current;`. Un
   regex sobre la forma literal no puede distinguir "cambio la semantica" de
   "arregle el mismo calculo". Se reescribio exigiendo las dos mitades por
   separado (filtra por `done` **y** convierte `current`), y se verifico que
   falla sin el fix y pasa con el.

> REGLA: **un FAIL en el caso del que mas se depende suele ser el arnes.** Y un
> test que exige la forma literal del codigo no es mas estricto: es mas fragile,
> porque no sabe que cambios de forma estan bien.
## El estado de las ramas (verificado, no supuesto)

| rama | commit | en `main`? | accion |
|---|---|---|---|
| `feat-idea49g-ach-acc-compacta` | `1a47d5c` | **no** | NO mergear. `slice(5)` + test de round-trip |
| `50F` | `c04496e` | **no** | mergeable; P3 antes del boton |
| `fix-idea61-claves-congeladas` | `85140bf` | **si** (`35a2425`) | fix-forward |

**P4 del Reviewer es viable**: verifique que las 4 claves de `MIRROR_MAP`
(`storage.js:210-213`) estan todas en `FALLBACK_MAP` (`:154-157`), asi que
derivar `MIRROR_MAP` de un `Set` de bases no deja ninguna huerfana.

## Lo que se respondio

- **Reviewer** (COMM 065): acuse de los 3 veredictos, `slice(5)`, fix-forward de
  la 61 con su matiz de *bomba de reloj* (no corrupcion), y **acepto su
  correccion del criterio**: "lo anoto como excepcional" no es un criterio,
  porque anotar es gratis. El que si es falsable es el riesgo asimetrico.
- **PO** (COMM 066): sus 5 puntos, con **un desacuerdo documentado** (el fix de
  la 49G no lleva el NaN) y **su punto 4 adoptado entero**: el canal no puede
  distinguir entregado de leido, asi que la regla que queda es "cerrada solo con
  `close`", que si es verificable.

## Un hallazgo del PO que es mio: 7 `.md` existen en los dos lados

El PO midio, responding to una propuesta mia, y el resultado **desmiente mi
propuesta**: yo sugiriendo "dejar de mantener la copia en tu workspace y
escribir directo en el repo". Aplicado al pie de la letra **le borra las rondas
13 y 14 del `PRE_BACKLOG.md`**, que hoy **solo estan en su workspace**.

No es un archivo duplicado: son **7 con el mismo nombre en los dos lados, los 7
con contenido distinto, y el error va en las dos direcciones** (4 tienen mas el
repo, 3 tienen mas su workspace). O sea que **no hay un lado que gane**, que es
justo lo que hace el defecto irresoluble con una regla de "leer el bueno".

**Y por que gana la copia vieja, que es la parte que yaombies:** gana por
**tamano**. El dashboard de su workspace tiene 72 lineas y el del repo 522. Un
archivo chico se abre antes y se lee entero. Es **el mismo criterio que el
`cm: true` constante, con un archivo de por medio.**

Lo que si se cerro: `DASHBOARD_PO_IDEAS.md` y `SESSION_LOG.md` deja de
mantener las copias de workspace; `PRE_BACKLOG.md` lo sube al repo como copia
explicita con fecha. Los otros 4 (`MEMORY.md`, `HEARTBEAT.md`, `AGENTS.md`,
`COMMS_LOG.md`) **no se resuelven este ciclo**: hay que declarar cual es el
bueno, y no lo decido solo.

> REGLA: **un archivo con el mismo nombre en dos lados no es un duplicado, es
> una moneda al aire.** Y la copia vieja gana por ser mas chica, asi que "leer
> el archivo del proyecto" no es una accion neutra.

---

## Pendiente para el proximo ciclo

1. **49G**: aplicar `slice(5)` + un caso de test que escriba la clave y la
   relea desde una sesion nueva. Decidir si el encode guarda `cur`/`max` para
   los completados (B2), que es el otro bloqueante.
2. **61 T1-2 fix-forward**: P4 (derivar `MIRROR_MAP`) + el `remove` de la legacy.
3. **50F**: P3 (`__cacheBases`) antes de que exista el boton.
4. ~~**Idea 49 punto 1** (badge del LM del 13-oct)~~ **DECIDIDO por el PO, y
   por el con el porque escrito** (no lo asumo yo):
   - **Va en Raid Tracker.** El Modo Legendario es del Nexo de Eternidad, que es
     un encuentro de raid. Que la recipe que yo estaba reusando viva en
     `strike-tracker.js` es circunstancial: era el modulo que estaba tocando.
   - El campo se llama **`modes`**, no `lm`: un objeto con el modo de entrada y
     su disponibilidad.
   - **Se declara "no disponible todavia", nunca `true`.** El 13 de octubre se
     enciende solo, y `lm: true` para que se vea el badge seria la Idea 48
     exacta: Pablo leeria "lo complete" donde no hay dato de nadie.
   - Cuando exista el flag, pasa de `unavailable` a `real` **sin cambiar el
     shape**, porque los dos casos se implementan juntos.
   El PO pidio que quede como decision suya y escrita por ella, no asumida por
   el Principal. Anotado asi.
5. **Tramo 3 de la 61**: el Reviewer lo recomambio. El test de igualdad
   gn:/legacy **pasa por construccion** con el fix; el util es el de que el
   espejo se mantiene **si y solo si nadie escribe por afuera**.

---

# Heartbeat Principal #62 — 2026-09-30 18:30–18:45 UTC

> **Ciclo corto y de diagnostico. No se mergeo codigo.** Lo que cambio:
> el Reviewer estaba **sin despertarse** (ALERT-72), y dos archivos de estado
> mientan sobre la realidad.

## La causa de que no hubiera veredictos

Tres pedidos de veredicto(makejados, capa de datos, ALERT-48) llevaba **entre 17
minutos y 2 horas** en la bandeja del Reviewer con `state=asked`. La regla de "no
declarar muerto a un agente antes de 20 min" no cuadraba: no estaba lento.

| agente | `heartbeat.enabled` | `every` | quien lo despierta |
|---|---|---|---|
| default | `false` | 30m | cron `13dc22e6` (unico cron activo) |
| Code-Reviewer | **`false`** | 6h | **nadie** |
| product-owner | `true` | 2h | su propio heartbeat |
| documenter | `true` | 4h | su propio heartbeat |
| architect | `false` | 6h | por diseño, no se usa |

`qwenpaw cron list` devuelve **2 crons**: el Heartbeat Principal y la sonda del
Arquitecto (pausada). **Ningun cron toca al Reviewer.** Al Reviewer no lo
despierta su heartbeat (desactivado) ni ningun cron, o sea que **nada**.

> **ALERT-72: ENTREGAR NO ES RECOGER.** El canal de archivos garantiza que el
> mensaje *llega*; no garantiza que alguien lo *lea*. Es durable justamente por
> ser archivo, y esa misma propiedad lo hace inerte. Un `state=asked` con horas
> de antiguedad no es "el Reviewer esta pensando": es "nadie lo fue a buscar".

Es distinto de ALERT-70, y por eso no es "la quinta vez": ALERT-70 era que el
*recibo* no probaba la *entrega*; este es que la *entrega* probada no garantiza
el *recogido*. Se arreglan en sitios distintos, asi que aprender uno no previene
el otro.

## Me equivoque y lo corregi antes de que el Reviewer arrancara

El primer mensaje le dije que los 3 estaban **sin mergear**. Es falso para el
primero: `85140bf` esta **mergeado** en `35a2425` (verificado con
`git merge-base --is-ancestor 85140bf main` -> true). El error era mio y venia de
mis propios archivos: **TEAM_STATUS y COMMS_LOG decian "sin mergear"**, y los leí
en vez de mirar el repo.

Mergeado con la excepcion de ALERT-48 **escrita de antemano en el mensaje del
merge**, que es lo unico que lo distingue del Tramo 2 de la Idea 57. La
correccion salio 1 minuto despues del mensaje original, y le cambie la
pregunta: de "veredicto antes de mergear" a **auditoria post-merge**.

## El PO tenia una pregunta sobre el mismo clase de error

El POAskaba: *"Mi `DASHBOARD_PO_IDEAS.md` sigue sin commitear, con la ronda 13"*.

| copia | tamaño | contenido | estado |
|---|---|---|---|
| repo `gw2-dev` | 47.597 B | **ronda 14**, 16:55Z | commiteada en `main` (`54267b9`) |
| workspace del PO | 7.899 B | ronda ~06:30Z | **9h30 de atraso** |

Estaba commiteada. **El PO estaba mirando su copia local desactualizada**, que es
mas chica y por eso gana la lectura. Le respondi que **no la commitee**: si lo
hace desde su copia sube la ronda 6:30 y **borra la ronda 14**. Es el mismo modo
de falla que el `cm: true` constante —el valor viejo se ve mas claro que el
nuevo— con un archivo de por medio.

La segunda pregunta (el body crudo de `/v2/account/raids`) la cerre yo: requiere
un API key de una cuenta de Pablo. **La Idea 49 punto 1 no esta bloqueada**: se
implementa con `modes` declarado "no disponible todavia". El punto 2 sigue
bloqueado, pero **no por el body crudo** sino porque no hay flag trackeable en
el juego todavia: dependencia del parche, no de la API.

## IN_PROGRESS.md apontaba al clon canonico equivocado (ALERT-71)

Decia que el clon canonico era `gw2-wallet-ligero`, "con los 2 remotes".
**Ese directorio no existe** (verificado). Doblemente falso: es el clon **vetado**
por la regla de repos de AGENTS.md *y* no esta. Es el camino del incidente de
produccion del 30-09. Corregido contra el disco.

## Tareas en curso

| # | Item | Rama / commit | Estado | Bloqueo |
|---|---|---|---|---|
| 1 | **Idea 49G** `ach_acc` compacta (0.53 MB vs 3.24 MB) | `feat-idea49g-ach-acc-compacta` @ `1a47d5c` | **esperando veredicto** — despertado en este ciclo | ALERT-48 (capa de datos). Prioridad 1 |
| 2 | **Idea 50 Tramo F** `cacheClear()` ahora limpia de verdad | `fix-idea50f-cacheclear-real` @ `c04496e` | **esperando veredicto** — despertado | ALERT-48 (capa de datos) |
| 3 | **Idea 61 Tramos 1-2** la `gn:` congelada | `fix-idea61-claves-congeladas` @ `85140bf`, **merge `35a2425`** | **en `main`**, en auditoria post-merge | mergeado con excepcion de ALERT-48 escrita de antemano |
| 4 | **Idea 56** guard de FORMA en `getAccountRaids` | `feat-idea56-forma-raids` @ `6178a8f` | **en `main`** | — |
| 5 | **Idea 49 punto 1** badge LM del 13-oct | (sin iniciar) | **DESBLOQUEADO** este ciclo | ninguno; `modes` declarado "no disponible" |
| 6 | **Idea 49 punto 2** marcado real | (sin iniciar) | bloqueado | **no hay flag trackeable en el juego** (no es la API) |

## Completadas en este ciclo

- **ALERT-71 cerrado**: `IN_PROGRESS.md` con el clon canonico real.
- **ALERT-72 abierto y mitigado**: Reviewer despertado con `submit_to_agent`.
- **Fila 058 de COMMS_LOG corregida**: decia "sin mergear"; esta mergeado.
- **Las 4 Idea 49 que `overdue` reportaba VENCIDAS**: NO se tocaron. Son asks
  `from=default to=default` (mensajes a si mismo). Verificadas leyendo el `to` y
  el `state` de cada JSON, no por la lista de `overdue`.

## Verificacion

- Suite completa en `main`: **563 pass / 0 FAIL** (24 archivos de test).
- Las 2 ramas con trabajo sin mergear (`1a47d5c`, `c04496e`) confirmadas
  **NO** en `main` con `git merge-base --is-ancestor`.
- Entrega al PO verificada leyendo el `to` del JSON recien escrito
  (`to: product-owner`, 4.599 chars), sin escribir nada en `sent/` (ALERT-70).
- `git remote -v` antes de cualquier push: el unico remoto es
  `origin -> PabloSnchz/gw2-wallet-agents` (desarrollo). **Produccion intacta.**

## Pendiente para el proximo ciclo

1. `check_agent_task('task-0fdc53a211c7')` y `('task-67e8f2a554c6')`.
2. Recoger los veredictos del **canal de archivos** (el `reply` de los JSON), no
   de la task: la respuesta de la task se pierde al vencer el TTL.
3. Con el veredicto de la **49G**: es el item de mayor impacto medido y el que
   mas falta. Si el Reviewer aprueba, mergear y borrar rama (local + remoto).
4. **Idea 49 punto 1**: ya se puede iniciar sin esperar a nadie.

> **Ciclo corto y de diagnostico. No se mergeo codigo.** Lo que cambio:
> el Reviewer estaba **sin despertarse** (ALERT-72), y dos archivos de estado
> mientan sobre la realidad.

## La causa de que no hubiera veredictos

Tres pedidos de veredicto(makejados, capa de datos, ALERT-48) llevaba **entre 17
minutos y 2 horas** en la bandeja del Reviewer con `state=asked`. La regla de "no
declarar muerto a un agente antes de 20 min" no cuadraba: no estaba lento.

| agente | `heartbeat.enabled` | `every` | quien lo despierta |
|---|---|---|---|
| default | `false` | 30m | cron `13dc22e6` (unico cron activo) |
| Code-Reviewer | **`false`** | 6h | **nadie** |
| product-owner | `true` | 2h | su propio heartbeat |
| documenter | `true` | 4h | su propio heartbeat |
| architect | `false` | 6h | por diseño, no se usa |

`qwenpaw cron list` devuelve **2 crons**: el Heartbeat Principal y la sonda del
Arquitecto (pausada). **Ningun cron toca al Reviewer.** Al Reviewer no lo
despierta su heartbeat (desactivado) ni ningun cron, o sea que **nada**.

> **ALERT-72: ENTREGAR NO ES RECOGER.** El canal de archivos garantiza que el
> mensaje *llega*; no garantiza que alguien lo *lea*. Es durable justamente por
> ser archivo, y esa misma propiedad lo hace inerte. Un `state=asked` con horas
> de antiguedad no es "el Reviewer esta pensando": es "nadie lo fue a buscar".

Es distinto de ALERT-70, y por eso no es "la quinta vez": ALERT-70 era que el
*recibo* no probaba la *entrega*; este es que la *entrega* probada no garantiza
el *recogido*. Se arreglan en sitios distintos, asi que aprender uno no previene
el otro.

## Me equivoque y lo corregi antes de que el Reviewer arrancara

El primer mensaje le dije que los 3 estaban **sin mergear**. Es falso para el
primero: `85140bf` esta **mergeado** en `35a2425` (verificado con
`git merge-base --is-ancestor 85140bf main` -> true). El error era mio y venia de
mis propios archivos: **TEAM_STATUS y COMMS_LOG decian "sin mergear"**, y los leí
en vez de mirar el repo.

Mergeado con la excepcion de ALERT-48 **escrita de antemano en el mensaje del
merge**, que es lo unico que lo distingue del Tramo 2 de la Idea 57. La
correccion salio 1 minuto despues del mensaje original, y le cambie la
pregunta: de "veredicto antes de mergear" a **auditoria post-merge**.

## El PO tenia una pregunta sobre el mismo clase de error

El POAskaba: *"Mi `DASHBOARD_PO_IDEAS.md` sigue sin commitear, con la ronda 13"*.

| copia | tamaño | contenido | estado |
|---|---|---|---|
| repo `gw2-dev` | 47.597 B | **ronda 14**, 16:55Z | commiteada en `main` (`54267b9`) |
| workspace del PO | 7.899 B | ronda ~06:30Z | **9h30 de atraso** |

Estaba commiteada. **El PO estaba mirando su copia local desactualizada**, que es
mas chica y por eso gana la lectura. Le respondi que **no la commitee**: si lo
hace desde su copia sube la ronda 6:30 y **borra la ronda 14**. Es el mismo modo
de falla que el `cm: true` constante —el valor viejo se ve mas claro que el
nuevo— con un archivo de por medio.

La segunda pregunta (el body crudo de `/v2/account/raids`) la cerre yo: requiere
un API key de una cuenta de Pablo. **La Idea 49 punto 1 no esta bloqueada**: se
implementa con `modes` declarado "no disponible todavia". El punto 2 sigue
bloqueado, pero **no por el body crudo** sino porque no hay flag trackeable en
el juego todavia: dependencia del parche, no de la API.

## IN_PROGRESS.md apontaba al clon canonico equivocado (ALERT-71)

Decia que el clon canonico era `gw2-wallet-ligero`, "con los 2 remotes".
**Ese directorio no existe** (verificado). Doblemente falso: es el clon **vetado**
por la regla de repos de AGENTS.md *y* no esta. Es el camino del incidente de
produccion del 30-09. Corregido contra el disco.

## Tareas en curso

| # | Item | Rama / commit | Estado | Bloqueo |
|---|---|---|---|---|
| 1 | **Idea 49G** `ach_acc` compacta (0.53 MB vs 3.24 MB) | `feat-idea49g-ach-acc-compacta` @ `1a47d5c` | **esperando veredicto** — despertado en este ciclo | ALERT-48 (capa de datos). Prioridad 1 |
| 2 | **Idea 50 Tramo F** `cacheClear()` ahora limpia de verdad | `fix-idea50f-cacheclear-real` @ `c04496e` | **esperando veredicto** — despertado | ALERT-48 (capa de datos) |
| 3 | **Idea 61 Tramos 1-2** la `gn:` congelada | `fix-idea61-claves-congeladas` @ `85140bf`, **merge `35a2425`** | **en `main`**, en auditoria post-merge | mergeado con excepcion de ALERT-48 escrita de antemano |
| 4 | **Idea 56** guard de FORMA en `getAccountRaids` | `feat-idea56-forma-raids` @ `6178a8f` | **en `main`** | — |
| 5 | **Idea 49 punto 1** badge LM del 13-oct | (sin iniciar) | **DESBLOQUEADO** este ciclo | ninguno; `modes` declarado "no disponible" |
| 6 | **Idea 49 punto 2** marcado real | (sin iniciar) | bloqueado | **no hay flag trackeable en el juego** (no es la API) |

## Completadas en este ciclo

- **ALERT-71 cerrado**: `IN_PROGRESS.md` con el clon canonico real.
- **ALERT-72 abierto y mitigado**: Reviewer despertado con `submit_to_agent`.
- **Fila 058 de COMMS_LOG corregida**: decia "sin mergear"; esta mergeado.
- **Las 4 Idea 49 que `overdue` reportaba VENCIDAS**: NO se tocaron. Son asks
  `from=default to=default` (mensajes a si mismo). Verificadas leyendo el `to` y
  el `state` de cada JSON, no por la lista de `overdue`.

## Verificacion

- Suite completa en `main`: **563 pass / 0 FAIL** (24 archivos de test).
- Las 2 ramas con trabajo sin mergear (`1a47d5c`, `c04496e`) confirmadas
  **NO** en `main` con `git merge-base --is-ancestor`.
- Entrega al PO verificada leyendo el `to` del JSON recien escrito
  (`to: product-owner`, 4.599 chars), sin escribir nada en `sent/` (ALERT-70).
- `git remote -v` antes de cualquier push: el unico remoto es
  `origin -> PabloSnchz/gw2-wallet-agents` (desarrollo). **Produccion intacta.**

## Pendiente para el proximo ciclo

1. `check_agent_task('task-0fdc53a211c7')` y `('task-67e8f2a554c6')`.
2. Recoger los veredictos del **canal de archivos** (el `reply` de los JSON), no
   de la task: la respuesta de la task se pierde al vencer el TTL.
3. Con el veredicto de la **49G**: es el item de mayor impacto medido y el que
   mas falta. Si el Reviewer aprueba, mergear y borrar rama (local + remoto).
4. **Idea 49 punto 1**: ya se puede iniciar sin esperar a nadie.

## Idea 63 T1+T2 — MERGEADO `eb69fb3` (HB#65)

**Que era:** cambiar de cuenta dejaba Personajes (y el buscador unificado) en un panel **vacio y sin una palabra**. Dos hechos, verificados antes de tocar codigo:

1. Los 13 filtros de 3 modulos sobreviven al cambio de cuenta: ningun handler de `gn:tokenchange` los limpia. En 2 de los 3, si el filtro vacia la lista, no hay texto (`achievements.js:674` si lo dice bien).
2. `state.pagination.page` no se resetea: solo en los 3 handlers de filtro (`characters.js:1045/1051/1057`). El caso **sin ningun filtro activo**: 30 personajes en pagina 2 -> cuenta de 12 -> `slice(20,40)` sobre 12 = `[]`.

**No es una regresion:** filtros, paginacion y handler entran en el MISMO commit `0a3d25a` (2026-03-20), el que creo el modulo. **Nunca estuvo bien: 194 dias.**

**Que se hizo:** T1 resetea filtros y pagina en el handler de tokenchange, y en `app.js` se extrajo `resetFilters()` porque el boton de limpiar ya lo hacia a mano (los dos caminos llaman a la misma funcion y no pueden divergir). **Ademas un CLAMP en `renderList` que el PO no pidio**: el reset tapa el caso conocido, pero cualquier otro camino que achique la lista deja `page` fuera de rango y `slice()` devuelve `[]` igual. T2 convierte el estado vacio en un estado de verdad, reusando el patron de `achievements.js:674`.

**Suite: 538 aserciones / 0 FAIL (27 archivos).** Test propio de 26 aserciones con **17 FAIL en rojo** contra el archivo sin el fix. Ojo con el conteo: **ALERT-78** — el `512` del runner omite 7 archivos; el total real es **640**, y **crecio** de 581 (ALERT-78).

**T3 NO entra.** Persistir filtros por cuenta (como `wallet-dashboard.js:358/374/398`) es **preferencia de uso, no un dato roto**: el reset de T1 y la persistencia son decisiones **CONTRARIAS**. Escalado a Pablo, y la pregunta abierta al Reviewer es exactamente esa.

## Idea 50 P3 - el registro de las bases de los OTROS modulos (HB#66)

> El Reviewer **RECHAZO** la primera propuesta de P3 y **APROBO CON CAMBIOS** la
> variante de registro estatico. Esta implementa esa. Recogido de
> `task-a42d69c93c58` (COMMS_LOG fila 070), que el HB#65 dejo en la cola.
>
> **Commits: `376f0d5` + `9adf6dd`, rama `fix-idea50p3-registro-estatico`, SIN MERGEAR.**
> Es capa de datos -> **ALERT-48**: va con veredicto antes de mergear.
> Enviado al Reviewer: `task-19ca4a2448b8` (COMMS_LOG fila 073).

### Lo que cambia, y lo que NO

- **NO cambia lo que Pablo ve.** `cacheClear` sigue con **0 callers** y el boton
  sigue sin existir. El boton es el Tramo siguiente; P3 era lo que faltaba para
  que el boton pueda alcanzar la cache del WV.
- Lo que si cambia: el borrado ya puede llegar a la cache del **Wizard's Vault**,
  que antes era **inalcanzable**.

### El punto del diseno: por que el registro se lee AL PULSAR

Las otras dos formas fallan, y cada una por un motivo distinto:

- **Registrar en la escritura** (`putCache`): es un hecho de **SESION** aplicado
  a un hecho de **DISCO**. En una sesion nueva donde Pablo no abrio la pestana
  de WV, el registro esta vacio: el boton no toca las claves `wv_*` que hay en
  disco desde la semana pasada, y el `dryRun` del `confirm()` cuenta 0 bytes y
  **promete una liberacion que no ocurre**. Eso es el bug que la v2.29.0 vino a
  arreglar, reintroducido por la puerta de atras.
- **Leer el registro al cargar el modulo**: ataria el borrado al orden de los
  `<script>` de `index.html`.

Leyendolo al pulsar, las dos cosas quedan bien sin depender de ninguna.

### Que se implemento

- `wizards-vault.js` expone **`WizardsVault.__cacheBases`** (5 declaraciones: 4
  exactas + el prefijo `wv_obj_`). El que declara su cache es el modulo que la
  escribe, asi que el inventario no es una lista que haya que mantener a mano.
  **El agujero de `wizards-vault.js:38` no era un agujero: era un modulo entero
  con su propio `lsSet` y su propio `kLS`, FUERA de la capa API.** Por eso un
  grep sobre `putCache` no lo veia, y por eso el test de la 50F daba verde sin
  cubrirlo.
- **`CACHE_PRESERVE`** protege `wv:season:index` y `wv:season:current`, que son
  la **PERSISTENCIA oficial de temporada** y no cache. Se evalua **ANTES** que
  los prefijos, para que sea una red y no una nota: el borde peligroso esta a un
  centimetro y es un prefijo corto, `wv` se las comeria a las dos.
- **`GW2Api.__cacheBases()`** expone el registro en solo lectura, para que el
  alcance sea **medible**. El Reviewer escribio "cuanto de los 4.98 MB es de las
  22 no lo se y no lo voy a inventar": con esto se mide en vez de estimar.
- La unica otra via de escritura con `lsSet` directo es `api-gw2.js:1545`
  (`items_cache_v1:`), y queda cubierta por la allowlist con asercion propia.

### ALERT-78: el total de suite, con su alcance declarado

Mi `512` y el `634` del Reviewer **no se comparaban**: el mio era el resumen que
declara el runner, y el suyo contaba **lineas de salida** (que incluyen una linea
de detalle por asercion mas el resumen). Los dos eran ciertos sobre lo que
median.

- `tools/run-suite.js` parsea 3 formatos de linea de resumen y **omite 7 de los
  27 archivos**, que usan un cuarto.
- **Hoy: 557** en los 20 que el runner parsea, **+ 128** de los 7 medidos por
  separado = **685 aserciones / 0 FAIL en 27 archivos**.
- Los 7 dan 0 FAIL y `exit 0`, verificados archivo por archivo.
- Queda `tools/count-suite-totals.py` commiteado para que la medicion venga con
  el script que la produce.
- **Aclaracion sobre la linea del HB#65:** decia "538" y "el total real es 640"
  en la misma linea, y esos dos vienen de epocas distintas (640 sale de sumar 128
  al `512` de una epoca anterior). Al cierre del HB#65 el total era **666**. No
  se corrige la linea vieja porque es el registro de lo que se creia entonces.

### MEDIDO, y corrige el recuento del veredicto

El alcance son **23** bases, no 22: 18 de esta capa (14 exactas + 4 prefijos) y
5 del WV (4 exactas + 1 prefijo). El veredicto decia "6 declaraciones" de WV
donde hay 5. Dos veces el mismo tipo de error, y por eso el `__cacheBases()`.

### Verificacion

- Seccion 7 de `tests/idea50f.cacheclear-real.test.js`: **+19 aserciones** (38 -> 57).
- **Fase roja: 12 FAIL** contra el archivo sin el fix, **sin abortar** (las dos
  guardas siguen el criterio de la seccion 4: el reporte tiene que decir QUE
  falta y no solo "se rompio").
- **Mutacion comprobada:** quitar `CACHE_PRESERVE` da **2 FAIL**. O sea que la red
  pasa porque hace algo y no por construccion. Sin esta comprobacion, (f) habria
  sido una asercion que no puede fallar.
- Suite **557/0** en lo que el runner parsea. `node --check` limpio en los dos
  `.js`, y `git diff --stat` confirma que las ediciones son quirurgicas (96 y 22
  lineas, sin reescritura de archivo).

### ALERT-79: la regla existia y la volvi a romper

Se me colaron `我们是` y `采纳` **en el cuerpo del mensaje del P3 al Reviewer**.
Es el **tercer** lugar donde me pasa: dos en comentarios de `.js` y ahora dos en
un mensaje. Amplio la regla, que era correcta pero incompleta: **no basta con
releer el DIFF de los `.js`, hay que releer el TEXTO del mensaje**, porque un
mensaje al Reviewer es un artefacto que el otro va a leer y a citar, y no tiene ni
`node --check` ni test que lo verifique.

### ALERT-80: casi destrozo un `.js` con PowerShell

Para comprobar que la red mordia, borre una linea de `api-gw2.js` con
`Set-Content` de PowerShell 5.1 en vez de `edit_file`. **Salio bien por suerte, no
por criterio** (1.895 lineas, UTF-8 sin BOM y CRLF intactos). Si ese archivo
hubiera tenido un acento en una cadena de codigo, `Set-Content` lo habria
reescrito en cp1252 y el diff habria sido de cientos de lineas. Lo detecte
comparando `git diff --stat` y el conteo de CRLF antes y despues, y lo
restore con Python. **La edicion de archivos en este repo va por `edit_file` o
por Python con `newline=''`, nunca por `Set-Content`/Out-File.** El gate de
newline ya existia para los `.md` (una vez inflo un diff de 74 lineas a 523) y
hoy se cumple para los `.js` tambien.

### Lo que NO hice, para que no haya que preguntar

- **El boton.** `cacheClear` sigue con 0 callers.
- **No agrege `__cacheBases` a los otros 5 modulos** (`characters.js`,
  `homestead-tracker.js`, `activities.js`, `app.js`, `legendary-tracker.js`).
  Responderi la pregunta del copy del boton con la **opcion 1, "limpiar cache de
  la API", alcance honesto de 23 bases**: con el registro estatico, ampliar
  despues es **agregar declaraciones y no reescribir el borrado**, asi que la
  decision no es irreversible. Y esos 5 modulos son alcance del boton, no de P3.
- **No mergee nada.** P3 espera veredicto.


---

## HB#67 (2026-09-30 22:05 UTC) — el P3 MERGEADO, y 2 de mis 9 aserciones fallaron contra el codigo correcto

**Que entro:** `fix-idea50p3-registro-estatico` -> `main`, 4 commits
(`376f0d5` P3, `9adf6dd` herramienta, `6d50323` typo, `0d1d0aa` los 4 cambios del
Reviewer). Merge fast-forward: `main` estaba 0 atras. Veredicto de
`task-19ca4a2448b8`: **APROBADO CON CAMBIOS**, y los 4 cambios estan aplicados.

### El Reviewer no acepto mi evidencia: la reverifico

| Que | Lo que dio el Reviewer |
|---|---|
| Test 50F | 57 / 0 |
| Fase roja | 45 / **12** FAIL (coincide exacto) |
| Mutacion `CACHE_PRESERVE` | **3 FAIL**, no 2 (P5) |
| Recuento de bases | 23 y 5: **me da la razon**, corrige su propio "22 / 6" |

Eso ultimo es lo que mas vale del veredicto: le corrijo un numero y lo acepta en
vez de defenderlo. Los 3 requisitos duros los dio por **hechos, no construidos**,
y la (a) —que el registro se lea al pulsar— la comprobo por los dos lados.

### Los 4 cambios, y por que 3 de ellos son el mismo error mio

**P1** la red tenia agujeros justo donde el codigo esta disenado para ir:
`wv-season-storage.js` tiene **4** familias de persistencia, no 2 (verificado en
`:26-30`), y las 2 que faltaban son `wv:season:YY:SEQ` y `wv:season:*.__shadow`
— o sea, el modo multi-season, que es al que el propio modulo esta
*experimentado a migrar* (`SINGLE_SEASON_MODE` hoy `true`). Hoy el riesgo es
cero. Lo que no es cero es que la lista se llamara "la RED" en un commit.

**P2** el comentario que **escribi yo** —"api-gw2.js no tiene que saber de
WV"— era **falso**, y la contradiccion era el bug de diseno: `:1737` hacia
`if (root.WizardsVault && root.WizardsVault.__cacheBases)`. La base si sabia de
WV. Lo que movi fue la lista de **bases**, no la de **modulos**, asi que los 5
modulos pendientes requerian 5 ediciones mas de la capa: una lista central con
otro nombre. Ahora es un registro global (`__cacheBaseProviders`): agregar un
modulo es **1 linea en el modulo, 0 en la capa**.

**P3** `collectCacheBases()` corria **dentro** de `isCacheKey()`, que corre una
vez por clave: con ~4.98 MB, 2 arrays nuevos + 23 `indexOf` POR CADA clave, en
el unico loop que recorre el store entero. Ahora se colecta 1 vez por clic.

**P4** y este es el que mas me duele, porque **reproduce la deuda que ALERT-78
venia senalando**: el runner decia `(27 archivos)` habiendo parseado 20, y mi
respuesta fue agregar un **segundo script** para contar los 7 que faltaban. Dos
fuentes de verdad para el mismo numero es exactamente el problema. Ahora el
runner parsea el 4o formato y el script paralelo **se borro**.

### ALERT-81: 2 de las 9 aserciones nuevas fallaron contra el codigo CORRECTO

La fase roja no es solo un ritual de merge: aca fue lo que **me corrigio a mi**.

- **"la capa NO nombra ningun modulo"** -> fallo. Porque `api-gw2.js:1658` **si**
  nombra `WizardsVault`, en la delegacion WV (`_WV()`), que es el contrato de
  retrocompatibilidad y no tiene nada que ver con la cache.
- **"`collectCacheBases()` se llama 2 veces"** -> conto 4. Porque 2 eran la
  definicion y un comentario.

Las dos son **ALERT-77 de nuevo**: un invariante escrito mas ancho que lo que el
codigo garantiza no falla por el fix, **falla por una razon correcta**, y el que
lo lee deduce que el fix esta mal — o sea, la asercion miente sobre el codigo.
Las dos quedaron **acotadas a donde vive el fix** (el cuerpo de
`collectCacheBases`, el cuerpo de `isCacheKey`), y ahi si muerden. **Regla
general: acotar al CUERPO donde esta el fix, no al archivo, salvo que el
contrato sea del archivo entero** — y si es del archivo entero, hay que poder
nombrar las otras razones por las que puede aparecer ese texto.

### Verificacion

- **Suite: 694 aserciones / 0 FAIL, 27 de 27 archivos, alcance completo.**
  (antes 557 en 20 + 128 en los 7, medido por dos scripts; ahora una sola fuente.
  694 = 685 + las 9 nuevas.)
- Test 50F: 66 / 0 (era 57).
- **Fase roja por MUTACION, las 4 correcciones una por una**
  (`tools/mutate-p3-registry.py`): P1 red vacia **6 FAIL**, P2 lista central
  **4 FAIL**, P3 colecta por clave **1 FAIL**, P2b modulo sin anotar **5 FAIL**.
  Un test que solo se verifico en verde no esta verificado.

### Lo que NO hice, y por que

- **El boton.** `cacheClear` sigue con **0 callers**. Es lo unico que falta, y el
  Reviewer dejo anotado una cosa que hay que resolver antes de escribirlo:
  `cacheClear` solo limpia la `__mem` de **una** capa, y `wizards-vault.js:40-41`
  tiene su propia `__mem`/`__inflight`. Sin un hook (`onClear` o
  `__cacheClearMem()`), borrar el disco y seguir sirviendo de memoria hace que
  **los bytes liberados se vuelvan a consumir** y el boton parezca que no hizo
  nada.
- **No agregue `__cacheBases` a los otros 5 modulos.** Con el registro global,
  ampliar despues es agregar declaraciones, no reescribir el borrado: la
  decision de copy no es irreversible.
- **No mergee la 49G**, que sigue RECHAZADA (ALERT-73).
- **La pregunta de T1-vs-T3 (Idea 63) sigue abierta y no es mia.** El Reviewer
  dio **timeout** a los 1800s. No lo doy por perdido — un timeout no es un "no" —
  pero la 63 quedo mergeada igual porque es estado local de UI, no capa de datos.

## Heartbeat #70 (23:00 UTC) — el boton de cache MERGEADO, y los 2 bloqueantes ya estaban resueltos antes de que el Reviewer los pidiera

### Lo que cambio de estado

- **Idea 50 completa: MERGEADA** en `950ea64` (rama `feat-idea50-boton-cache`).
  **Es el primer caller de `cacheClear`**: antes eran 0. Veredicto del Reviewer
  (recibido en este ciclo, `task-f61e427b2efc`): **APROBADO CON CAMBIOS**.
- **Los 2 hallazgos bloqueantes (H1 y H2) YA ESTABAN APLICADOS** en `46b2d7f`, un
  commit anterior al veredicto. No hubo que tocar codigo para cerrar la fila. Lo
  verifique leyendo los archivos, no el mensaje: `index.html:289-290` ya declara
  "de la API y del WV" y `settings-manager.js:567` ya dice `kept` + `keptBytes`.
- **H2 se resolvio con un enfoque SUPERIOR al pedido**, y esto si es una
  discrepancia que dejo escrita: el Reviewer pedio que la enumeracion de `kept`
  fuera exhaustiva ("agrega `ni la cache de otros modulos`"). Lo que se aplico
  fue **borrar la enumeracion** y decir los **bytes que quedan**. La razon esta
  en `settings-manager.js:558-566` y es correcta: una lista de categorias deja
  de ser cierta en el mismo commit en que un modulo registra su clave, y los
  bytes no. La asercion 4c-(b) del test detecta el problema por la **coma**, no
  por la frase, asi que mañana "ajustes, cuentas y tema" tambien falla.

### Verificacion

- **Suite: 793 aserciones / 0 FAIL, 29 de 29 archivos, alcance completo.**
  (La unidad la declara el propio runner: "29 de 29 archivos". Sin ese sufijo, un
  total de suite es un conteo sin alcance — ALERT-78.)
- `tools/idea50-censo-claves.mjs` con el **segundo criterio por FORMA**
  (ALERT-86): las 3 familias de `homestead-tracker.js` se escriben como
  `{ts, data}` y no matchean ningun patron de nombre, asi que caian en DATO y
  quedaban protegidas por una frase que el boton no dice.
- El filtro final es `startsWith('CACHE')`, no `=== 'CACHE'`: un filtro por clase
  exacta hace desaparecer un numero del titulo sin que ningun assert lo note.

### El numero del censo, y por que hay tres

**La linea base NO era "5 modulos / 7 lineas"** (mensaje de `b43743b`), ni 8
(PO), ni 11 (lo que decia el titulo antes de este commit). Son **11 FAMILIAS en
4 modulos** — 12 call sites, porque `gw2_currencies_cache_v1` se escribe en 2
sitios y es una clave. De esas 11, **3 son de modulos que `index.html` no
carga**: cache de codigo muerto, que no ocupa disco hoy pero aparece sin avisar
el dia que se carguen. **La cifra de escrituras de verdad es 8.**

El PO sumo el marcador de frescura (`psna:lastUpdate`) como si fuera cache y
conto los 2 call sites como 2 claves. Mismo universo, distinta unidad. **Por eso
el titulo dice "familias" y no "claves" ni "lineas": un numero sin unidad es un
numero que dos personas pueden leer como dos cosas distintas** (ALERT-84).

### Lo que sigue abierto

- **El hook `onClear`.** `cacheClear` vacia la `__mem` de UNA capa y
  `wizards-vault.js:40-41` tiene la suya. Sin el, borrar el disco y seguir
  sirviendo de memoria hace que los bytes liberados se vuelvan a consumir. **El
  copy ya lo declara** ("lo que otros modulos ya tienen en memoria se conserva
  hasta que recargues"), asi que no miente — pero el botonTodavia no aprovecha
  lo que el usuario quiere cuando lo aprieta. Es el tramo siguiente.
- **La 49G sigue RECHAZADA** (ALERT-73), sin mergeear.
- **Idea 63 T1-vs-T3** sigue abierta y no es mia: es preferencia de uso, va a
  Pablo.


---

## Heartbeat #71 (23:30 UTC) — ALERT-89: el invariante estaba vigilado en una sola dirección, y la aritmética lo hacía invisible

### Lo que se recogió (PASO 0 y PASO 1)

Las dos tareas del ciclo anterior volvieron **`finished`**, y las dos llegaron **tarde**: describen
el árbol previo a `46b2d7f`, que ya aplicaba H1 y H2. El HB#70 ya lo había registrado; este ciclo
no agregó nada de código por ese lado. El `confirm()` y el `title` del botón se verificaron contra
el disco otra vez (`index.html:289-290`, `settings-manager.js:567`) y coinciden con lo declarado.

Al PO se le recogió su ronda 17 (`task-1b6241ed5c58`) y al Reviewer el hook `onClear`. **Las dos
comms vencidas del botón quedaron archivadas con `close`** (movidas a `archive/`), no leídas.

> **Refinamiento de ALERT-67:** `close` mueve la copia del **inbox** a `archive/`, pero `overdue`
> lee la copia de **`sent/`**, que `close` no toca. **O sea que `overdue` sigue reportando como
> vencida una comm que ya se cerró.** `overdue` no es una señal confiable de "sigue abierta" para
> nada que uno mismo haya mandado.

### El hallazgo: ALERT-89

La Idea 52 dejó el catálogo de raids midiendo que *todo encuentro del módulo existe en la API*
(dirección `app -> API`). **La mitad inversa no estaba vigilada**, y las dos mitades dan el mismo
número:

| | |
|---|---|
| encuentros del módulo (`ALL.length === 30`) | 30 |
| eventos de la API (`API.size === 30`) | 30 |
| fantasmas `app -> API` (vigilado) | 1 → `vloxx`, allowlisted |
| **faltantes `API -> app` (NO vigilado)** | 1 → **`camp`** |

**Los totales coinciden y hay un id equivocado en cada lado.** `ALL.length === 30` es la aserción
que hace esto *parecer* seguro: es una **aserción que pasa por construcción** (ALERT-77). Cuenta los
encuentros, pero **cuenta los dos lados por separado y nunca los compara**.

**Y `vloxx` no estaba roto.** La ronda 17 del PO lo puso como 🔴 #1, "el fix más urgente del
backlog", y es una **decisión de producto medida** (`/v2/raids` no expone el ala Nexus of Eternity)
que `idea52` tenía allowlisted desde antes, con un test que afirma *"medido, no supuesto"*. Lo
que estaba roto era la otra dirección, que nadie miraba.

**`camp` no se agregó, a propósito:** el fixture congelado lo trae **sin `name`**, y agregarlo
obligaría a inventar nombre e icono. Un hallazgo con datos inventados es peor que un hueco declarado.

Mergeado `1176be6`. Fase roja **1 FAIL nombrando `camp`**. Suite **823/0 FAIL, 30 de 30 archivos**.

### ALERT-90: la regla de ALERT-88, tercera vez, y es mía

La fila de **ALERT-78** cerraba diciendo *"queda `tools/count-suite-totals.py` commiteado para que
la medición venga con el script que la produce"*. **Ese archivo no existe en disco, no está en
HEAD, y `tools/.gitignore` lo ignora** — nunca entró. La regla que la fila aplicaba era la que la
propia fila incumplía. El script que **sí** produce el total es `tools/run-suite.js`, que sí está
trackeado. **Corregido en la fila misma, no solo en la adenda.**

### Tooling: el assert de newline no detecta la mezcla

`core.autocrlf=true`: el working tree materializa **CRLF** y el repo guarda **LF**. ALERT-87 ya
tenía la regla para el caso de *leer*. El caso que faltaba es **agregar**: `assert t.endswith('
')`
**pasa igual con CRLF que con LF**, así que un append wrote LF sobre un archivo CRLF y el assert no
lo notó. Medido: `COMMS_LOG.md` quedó con 252 CRLF y 2 LF, `BACKLOG.md` con 246 y 5. Normalizado con
`tools/hb71-newlines.py`, que cuenta antes y después.

### ALERT-79: se me coló un CJK y lo agarró el diff, no el scanner

Escribí `El PO<dos ideogramas CJK> no se edita` en el script del dashboard. **Lo vi al releer el script antes de
correrlo**, no por el scanner: `tools/scan-cjk.py` sobre los `.md` da **0**, porque los `.md`
no están en su alcance — el escaneo CJK tiene que correr **sobre el `.py`/`.js` que genera el
texto**, que es donde está el error antes de que llegue al `.md`. Verificado contra HEAD archivo por
archivo: **0 escapes nuevos** (ALERTS_LOG 17 = 17, TEAM_STATUS 5 = 5, DASHBOARD 2 = 2).

### Estado

| Tramo | Estado |
|---|---|
| Botón de cache (Idea 50 A-F) | **MERGEADO** `950ea64`. Sin pendientes salvo el `onClear` |
| ALERT-89 (`camp` + guarda inversa) | **MERGEADO** `1176be6` |
| ALERT-84 T1 | **MERGEADO** `d64e688` (la fila decía "sin commitear": era falso) |
| ALERT-84 T3+T4 | **VEREDICTO RECIBIDO: (a), reducido al minimo.** Sin implementar; le toca al proximo ciclo, en rama propia |
| ALERT-84 T5 (build reproducible) | **ABIERTO**. Sin `_legendary_items_full.json` versionado no hay forma de regenerar el catálogo |
| Hook `onClear` | **ABIERTO**, esperando veredicto del Reviewer |
| 49G | **RECHAZADA** (ALERT-73). El fix va sobre `feat-idea49g-ach-acc-compacta` |
| 63 T3 | **DESBLOQUEADA**, pero contraria al T1 → decisión de Pablo |


### Addendum: el veredicto de T3+T4 llego antes de cerrar el ciclo

`task-509ffb6eb907` volvio **`finished`**. **(a), reducido al minimo**, y la razon es
estructural: es la **unica** de las dos que crea un **segundo punto de observabilidad** — "el
catalogo esta cargado" se aserta hoy contra `root.LegendaryCatalog.items.length === 206` sin
`activate()` ni router, y "el registro esta listo" contra el flag del tracker. **Dos asserts que
pueden fallar de forma independiente**, que es literalmente el criterio que mande.

**(b) se descarto por una razon que no es de implementacion: no hay evento al cual engancharse.**
`gn:tokenchange` se **escucha**, no se despacha, y colgar el render de ahi lo ata a un cambio de
cuenta y no a "el modulo esta listo": el primer arranque no registraria nada.

**Lo unico bloqueante: hacer (a) sin fijar las 3 firmas** (`renderCatalogGrid(items, owned)`,
`renderFilterBar(filters, catalog)`, `renderProgress(state, stats)`, que ademas lee `state.owned`).
Guardar 4 funciones sin eso es un contrato que se rompe igual, mas tarde y mas dificil de ver.
**Y NO implementar `getState()` entero.**

> **Me corrigio una cifra que yo repeti sin medir.** Dije `getState` con "1 uso" porque lo pedi asi
> en la pregunta, tomada del texto del PO. **Son 0 invocaciones**: esta en la cabecera
> (`render-catologo.js:11`), dentro del bloque de comentario `Consume:`. `registerRender` son 5
> menciones y **4 en codigo**, no "5 lugares mas". **REGLA: un conteo que viene de otro agente y
> entra en mi pregunta como si lo hubiera medido es el mismo modo de falla que el `634` del
> Reviewer (ALERT-78) y que el `count-suite-totals.py` fantasma (ALERT-90). Verificar el numero
> ANTES de escribir la pregunta, no despues de recibir la respuesta.**

Ademas: el `console.warn` de la rama `else` es **un** intento, **un** `setTimeout(..., 50)` **sin
segundo reintento** — ese si es un bug real cuando el contrato falte. Y mi "mismo resultado visible
(nada)" era inexacto: `legendary-data.js` **se autoexpone igual** (206 items en memoria sin que
nadie los consuma). El resultado visible es nada; el costo no es cero.

**El aserto no necesita arnés nuevo:** el §6 de `tests/alert84.leyenda-estado-honesto.test.js:223-226`
ya arma el sandbox con `document` falso. Asertar el registro son **3 lineas mas** ahi.

---

## Heartbeat #75 - 2026-10-01 01:1x UTC

### Tareas en curso
- **T5 (d) - regenerador del catalogo de legendarias: HECHA Y MERGEADA.**
  `b055bda` + merge `b1b74bb`. El regenerador paso de ser un recordatorio a ser
  una orden, que era la cuarta opcion del PO. Esto cierra la unica tarea del
  backlog que **no dependia de que alguien "se acuerde"**: hoy `legendary-data.js`
  derives contra la API (206/206 verificado por el PO el 2026-10-01) y el
  docstring "_build_legendary_data.py:5 dice One-time export script", que es lo
  que hacia parecer sano un artefacto muerto.
- **ALERT-92 - limite real del stripper: APLICADA** (`4eaf619`, merge `0e0d41b`).

### Completadas este ciclo
- Recogidos los 2 veredictos del ciclo anterior (Reviewer `task-fa8e1f330e9d`, PO
  `task-1f9ff90f48d6`). Los 4 puntos del Reviewer (P1 guarda, P2 censo, P2 regla,
  P3 regex muerto) **ya estaban aplicados** en ALERT-92: lo verifique commit por
  commit contra el archivo, no por el resumen.
- **Verificado que las guardas nuevas TIENEN dientes**, que era lo que faltaba:
  - bug en linea limpia -> **1 FAIL** (assert negativo)
  - bug en linea con URL, DENTRO del cuerpo -> **1 FAIL** (la guarda, no el assert)
  - llave suelta en un comentario -> **2 FAIL** (guarda de llaves)
  - baseline -> 0 FAIL
- Suite: **964 aserciones / 0 FAIL, 34 de 34**.

### Pendientes
- **Pregunta abierta del PO al Reviewer:** el guard de la Idea 61 toleraria los
  raw de `raid-tracker.js:891/1012/1016`, o deberia prohibirlos tambien?
  `raid_strike_view` **esta en `MIRROR_MAP`**, asi que la lectura cruda puede ser
  correcta por diseno. Es la misma clase que ALERT-91 cerro en accounts-panel.
  **No la mande todavia:** es 1 pregunta y quiero juntarla con la ronda del PO.
- **Censo de pestanas:** el PO midio **3 politicas distintas** (WV persiste bien;
  raid/strike persiste por la puerta de atras con `localStorage` crudo; converter
  no persiste). Y `gn:raids:strike:view` y `gn:converter:state` estan en la
  whitelist, en `STORAGE_KEYS` y en `MIRROR_MAP` **sin un solo lector ni escritor**
  -- el registro afirma un contrato que nadie implementa.
- `idea50b` commiteada (`0c12adc`), sin test propio todavia.

### Alertas
- **ALERTA NUEVA - una mutacion malDiseñada se lee como un fallo del test.**
  Puse el bug en la linea de la URL (L832), que esta en OTRA funcion, y el assert
  esta acotado al cuerpo de `syncAccountTagsToKeys`. D dio **0 FAIL** y parecia
  que la guarda no mordia. No era eso: mi mutacion estaba fuera del alcance del
  assert. Repetida dentro del cuerpo -> 1 FAIL. **REGLA: un 0 FAIL de una
  mutacion se verifica con el ALCANCE antes de acusar al assert**; si el assert es
  acotado a una region, la mutacion tiene que caer dentro de esa region o el
  resultado no prueba nada.
- **ALERTA NUEVA - `open(path,'w')` en Windows convierte a CRLF TODO el archivo, y
  `git diff --stat` lo reporta como "1 insertion".** Me paso en la restauracion de
  la mutacion MUT3: borre el residuo, el needle no matcheo porque el archivo ya
  estaba en CRLF y mi needle usaba `\n`. `git status` seguia limpio (git
  normaliza por autocrlf), asi que **el archivo quedo modificado en disco sin que
  git lo dijera**. Resuelto comparando bytes contra `git show HEAD:archivo` y
  reescribiendo con `newline=''`. **REGLA: todo probe que escriba un archivo del
  repo abre en `rb`/`wb` o con `newline=''`, y despues se verifica con
  `open(p,'rb').read() == subprocess git show HEAD:p`. `git status` limpio NO es
  prueba de que el archivo esta intacto.**

### Estado de propuestas
- Reviewer: 4/4 puntos aplicados y verificados con dientes de la prueba.
- PO: ronda 20 incorporada; T5(d) mergeada. Sin propuestas pendientes de envio.

### Verificacion del ciclo
- `inbox` vacio, sin preguntas esperando a `default`, sin respuestas nuevas.
- `overdue` reporta 1 vencida (fila 060, boton de cache) y es **FALSA por
  estructura**: esta resuelta y mergeada en `950ea64`.


## Heartbeat #78 (04:30 UTC) — la gn: de la pestana Raids/Strikes ya tiene escritor, y la premisa de la fila 079 era FALSA

### Lo que se hizo
- **Fix + test en la rama `hb78-raid-raws` (commit `f9239d7`), sobre un worktree
  propio.** No se toco el clon compartido, que tiene una segunda instancia
  escribiendo encima (ver ALERTS).
- `js/raid-tracker.js`: la preferencia de la pestana se lee y se escribe por
  `STORAGE_KEYS.RAIDS_STRIKE_VIEW` (`gn:raids:strike:view`), no por la legacy a
  pelo. Antes la gn: la escribia solo la migracion del arranque y quedaba
  CONGELADA con la foto de la primera sesion: es un dual-write sin espejo, la
  clase que la Idea 61 seccion 6 prohibe.
- **Guard de valores validos en la lectura.** No es cosmetico: `setActiveView`
  abre Strikes en su rama `else`, asi que cualquier valor persistido que no fuera
  exactamente `'raids'` abria Strikes solo. 9 casos medidos.
- La legacy queda como lo que ya era: el `FALLBACK_MAP` de la gn:. Una
  instalacion vieja no pierde la pestana (verificado).

### La premisa que resulto FALSA (fila 079)
`raid-tracker.js:891` lee `gw2_selected_key_v1` a pelo y la fila lo marcaba
como "rompe en escenario Gist-nuevo". **Medido falso:** esa clave SI esta en
`MIRROR_MAP` (`storage.js:211`) y `Storage.getRaw` lee el espejo PRIMERO por
diseno, asi que el acceso a pelo y `Storage` devuelven lo mismo.
`app.js:32-37` lo deja escrito. Arreglarlo habria sido tocar 4 lineas de
4 modulos para no cambiar nada. **La asercion que lo deja escrito esta en el
test, seccion 4** — si alguien cambia los mapas, el test se pone rojo.

### Estado de propuestas
- **Reviewer, fila 081 (`viewPref()`): APROBADO CON CAMBIOS** — el helper es
  OPCIONAL y no se implementa. Descartado, con la consecuencia anotada: la tab
  del conversor no puede vivir en `gw2_conv_cache_v3` porque ese cache expira a
  los 30 min (CONV_TTL).
- **PO, ronda 23: SIN NOVEDADES**, y no la forzaron. Cierre asimetrico de las 2
  claves: `gn:raids:strike:view` **no era huerfana** (este fix la rescata como
  efecto secundario, sin helper y sin una linea nueva) y `gn:converter:state`
  **no se implementa nunca**.
- **PO: un hallazgo mas.** `wv-shop-ui.js:222/228` escribe 2 preferencias a
  pelo (`gw2_wv_view_v1`, `gw2_wv_legacy_filter_v1`) mientras `router.js:257/258`
  usa `Storage` sobre las mismas. Misma preferencia, 2 escritores, tampoco en
  `MIRROR_MAP`. **Es scope en un fix ya autorizado: queda anotado, no tocado.**
- **Reviewer, auditoria del commit `9fa3986` (fila 082): APROBADO CON CAMBIOS.**
  No es de este ciclo, pero es el trabajo de la otra instancia y quedo en sus
  manos: sacar `app.js:1067` (codigo muerto medido, 0 de 9 casos difieren y solo
  puede degradar la clasificacion).

### Verificacion del ciclo
- Suite completa: **1029 aserciones / 0 FAIL, 36 de 36 archivos.**
- Test nuevo: 25/0. **Mutaciones: 4 de 4 mueren** (M1 lectura a la legacy, M2 sin
  guard, M3 escritura a la legacy, M4 guard laxo). El archivo quedo identico al
  commit al terminar.
- Newlines: `js/raid-tracker.js` ya era LF en git antes del cambio (CRLF=0 en
  `HEAD~1`), asi que el fix no metio LF donde habia CRLF. Medido, no supuesto.
- Worktree: `C:\Mis Archivos\GW2 online\gw2-dev-hb78`.

### Pendiente
- `9fa3986` (rama `fix-hb77-puerta-llega`) **sigue sin mergear** y es trabajo de
  la otra instancia. No se mergea desde aca: mergear una rama en vuelo es la
  lesson de `f739e21`.
- Las 2 ramas remotas mergeadas sin borrar (`ALERT-99`) siguen sin borrar: es
  destructivo y una es del PO, que puede tener su propio clon.

## Heartbeat #79 (05:00 UTC) - el codigo muerto que el Reviewerpidio sacar, SACADO, y dos formas de mentir con un numero

> Ciclo corto y de cierre: noavage una feature. Recogi el veredicto que estaba
> en vuelo, aplique el unico cambio que bloqueaba el merge, y arregle dos probes
> mios que estaban dando numeros que parecian autoritativos.

### Tareas en curso

- **PO** (`task-45bedd0f7904`, enviada 05:0xZ): ronda 24 de PRE_BACKLOG. Se le
  pidio explicitamente que si no hay nada lo diga, sin forzar idea. **Al cierre
  del ciclo seguia `running`; no se espera en foreground.** La recoge el proximo
  heartbeat. Fila 085 de `COMMS_LOG.md`.
- **Reviewer**: sin nada en vuelo. Las 2 consultas abiertas del ciclo anterior
  (081 `viewPref`, 083 auditoria de `9fa3986`) estan **Resueltas**.
- **Documentador**: sin tarea abierta. La regla de no-fallback sigue vigente:
  si falla, se reporta a Pablo y no documento yo.

### Completadas

- **`87bab23` - `app.js:1067` (el `if (err?.kind)`) FUERA.** El Reviewer dio
  APROBADO CON CAMBIOS y ***ero la condicion era una sola linea***. Verifique su
  premisa por separado antes de aplicar: `git grep -nE "\.kind\s*=" -- "*.js"`
  da **0 en produccion** (9 matches: 4 de hb77, 4 de idea50 sobre toasts, y la
  linea misma). Nadie le pone `kind` a un `Error` en ningun modulo, asi que no
  hay productor posible.
- **`fdf29ac` - cherry-pick de `9fa3986`** (el fix de la puerta de permisos), que
  estaba sin pushear en la rama de la otra instancia. Con esto el fix llega a
  `agents/main` **sin la linea muerta**.
- Merge fast-forward a `main` y push. `origin/main` = **`87bab23`**. Verificado
  post-push con `git ls-remote --heads origin`: 11 ramas, **ninguna con prefijo
  de remoto**.

### Verificacion

- `node --check js/app.js`: OK.
- Suite completa: **1048 pass / 0 FAIL en 37 de 37 archivos**.
- **Mutaciones 4 de 4 MUERTEN:** volver el pisoton -> 6 FAIL; perder el 403 ->
  2; perder el 429 -> 1; perder la red -> 1. Ese era el punto de quitar la linea:
  comprobar que la red de tests NO se debilitaba. No se debilito.
- Newlines: el worktree tiene CRLF por `core.autocrlf` y el blob en git tiene
  LF. El parche removio 3 lineas (LF 1355 -> 1352) sin convertir el archivo. En
  `COMMS_LOG.md` mis 2 filas iniciales dejaron 1 LF pelado en un archivo CRLF; lo
  detecte midiendo (LF 349 / CRLF 348), lo normalize, y volvi a medir (349/349).

### Pendientes / alertas

- **ALERT-103 (nueva).** Un harness de mutacion que se auto-verifica borro el
  trabajo: el fix estaba SIN commitear y el `finally` hacia `git checkout --`,
  que para git no "restaura" sino que **descarta**. Reaplique y recien ahi
  commitee. **REGLA: commitear antes de mutar el arbol, y verificar el restore
  con `git status --short` adentro del mismo script.** El falso "restore OK"
  venia de que comparaba contra el original leido al arrancar, o sea contra
  una variable mia, no contra git.
- **ALERT-104 (nueva).** El repo tiene **4 formatos de resumen de suite**. Mi
  primer contador dio 728 y el segundo 1048; el correcto es 1048 (que reconcilia
  exacto con los 1029 del Reviewer: 1029+19 y 36+1). Un total de suite mas chico
  que el de otro investigador no es "menos tests", es "no los leí".
- **La instancia duplicada SIGUE VIVA.** `git reflog` en el clon compartido
  mostraba `HEAD@{0}` = `11285a0`, un commit que **yo no hice**. Hace 39 min
  no escribia nada, asi que este ciclo lo hice **100% en el worktree `hb79-wt`**,
  sin tocar el clon compartido: ni checkout, ni commit, ni push desde ahi.
  Sigue siendo la unica accion que resuelve la concurrencia, y es de Pablo.
- **2 ramas remotas ya mergeadas y sin borrar** (`docs-idea50p3-hb67`,
  `feat-idea56-forma-raids`): contra la regla de AGENTS.md. **No las borro**
  (destructivo, y una es del PO, que puede tener su propio clon).
- Fila 079: el fix de 3 lineas de los raws de `raid-tracker.js` sigue
  **autorizado por el Reviewer** pero esperando el veredicto de `viewPref()`,
  que toca los mismos call-sites. Ese veredicto ya llego (081, APROBADO CON
  CAMBIOS) y **descarta** la implementacion de las claves de pestana: 2 claves
  separadas o nada, porque `converter-modal.js:38` comparte `gw2_conv_cache_v3`
  con un cache de TTL 30 min.

### Estado de propuestas

- **Reviewer: 1/1 aplicado.** El unico cambio bloqueante (sacar `app.js:1067`)
  esta mergeado y verificado con dientes de prueba.
- **PO: ronda 24 en vuelo** (`task-45bedd0f7904`), sin recoger al cierre.
- **Sin propuestas pendientes de envio al Reviewer.**

### Lo que NO se hizo, y por que

- **No se borro la fila 083 ni se reescribio el veredicto del Reviewer.** Solo se
  corrigio su ultima frase, que decia "no se toca desde aca" y quedo FALSA al
  aplicar el cambio en este ciclo. Un log que reescribe veredictos es peor que
  uno que los deja; lo que se corrige es la **afirmacion de estado**, no el
  juicio del Reviewer.
- **No se toco `kind` sin consumidor** (`app.js:1168` lo destructura y lo
  descarta, asi que la mitad de las aserciones de hb77 verifican un campo
  muerto). Es el siguiente de la lista del Reviewer, pero es otro PR.
- **No se toco `hb75`**, que tiene el mismo punto ciego que tenia `hb77`: verifica
  la CONSTRUCCION del mensaje, no el mensaje. Mutacion medida: la puerta puede
  tirar `"Permisos Insuficientes"` y `hb75` da 46/0. El Reviewer lo dejo
  explicitamente fuera de este PR.

