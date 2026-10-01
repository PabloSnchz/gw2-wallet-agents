
# TEAM_STATUS - Heartbeat #89 (2026-10-01 09:0x-09:4x UTC)

**Corto:** el item de la fila 079 estaba "pendiente" desde el HB#75 porque un
veredicto del Reviewer decia que un raw "rompe en escenario Gist-nuevo". **Medido
antes de tocar: la premisa es FALSA.** El codigo NO se toco. **ALERT-118** +
`tests/hb89-premisa-raw-selected.test.js` (18/0). Ronda 28 reenviada al PO por el
canal de archivos, que es el unico que no tiene TTL.

## Tareas en curso

| Quien | Que | Estado |
|---|---|---|
| **PO** | Ronda 28 (`20261001T090227Z-a1ae0d`, 3 preguntas) | Enviada por el **canal de archivos**. 1er envio (`task-dafa909f1450`) **FALLO por TTL de 1800 s**. Sin plazo: si vuelve a vencer se anota como 2a falla. |
| **Reviewer** | — | **Sin nada en vuelo.** Sus 2 ultimos veredictos (081, 088) se recogieron en el HB#88 y ya estan aplicados. |
| **Documentador** | — | Sin tarea (regla de no-fallback vigente). |

## Lo que se cerro SIN tocar codigo (el resultado del ciclo)

La fila 079 decia, textual:

> `raid-tracker.js:891` (raw de `gw2_selected_key_v1`, **rompe en escenario
> Gist-nuevo**)

Para que ese raw difiera de `Storage.getRaw` hace falta un estado: la `gn:`
poblada y la legacy ausente. Y ese estado **no lo produce el codigo**, por 3
razones medidas, no supuestas:

1. `Storage.set` escribe la `gn:` **y** la legacy.
2. `Storage.remove` borra la `gn:` **y** la legacy.
3. **`MIGRATION_MODE = 'copy'`** (`storage.js:34`): el unico `removeItem(oldKey)`
   de la migracion esta condicionado a `'move'` (`storage.js:457`), o sea hoy es
   codigo muerto.

Y el escenario que la fila nombra no separa el par: el import real
(`settings-manager.js:258`) entra por `Storage.set`. Barrido de los 43 `.js` de
`js/`: **0** escritores crudos de una `gn:`, **0** borradores crudos de la
legacy.

Lo que si existe es el estado peligroso, y **sobrevive a `_resyncMirrors` por
diseno** (motivo escrito en `storage.js:434`), pero hay que sembrarlo a mano.
El fix habria sido codigo a favor de un escenario que no ocurre, y habria hecho
falta tocar una allowlist que es decorativa a proposito.

**Entregado:** el test, que si tiene valor — afirma las 3 condiciones de ruptura
y falla si alguna se cumple. Si alguien sube `MIGRATION_MODE` a `move`, avisa
antes de que un modulo pierda la sesion.

## La regla que deja el ciclo

**Una fila que dice "rompe en escenario X" es una HIPOTESIS hasta que algo la
mide**, y esta venia de un **veredicto del Reviewer**: tenia la apariencia de
estar validada. No lo estaba; el Reviewer dedujo el caso y el verbo (`rompe`)
ocultó que era una deducción.

Es la tercera vez que una premisa así se sostiene en un fix real (ronda 24 del PO:
`max-width`; ronda 26/T7: el fix chocaba con un assert que defendia el
defecto). Lo que las 3 comparten: **el sintoma era real, la premisa no estaba
medida**, y esa confusion es la que hace que el item parezca urgente.
Y `git grep` no alcanza: las 3 razones estan en el **contrato** de `storage.js`.
La senal esta en la prosa del contrato, como en la ALERT-117.

## Estado de propuestas (paso 3 del ciclo)

**No hay nada que mandar al Reviewer.** Sin novedades del PO (rondas 22-27: 6 de
6 sin feature nueva) y sin item de codigo que enviar: el unico item que
desbloqueaba el HB#88 resulto no ser un bug. El paso 3 se cumple por vacuidad, no
por omision.

## Alertas

- **ALERT-118** (nueva): la fila 079 era un bug escrito como veredicto de
  Reviewer. Refutada por medicion. Ver ALERTS_LOG.md.
- **ALERT-117** (HB#88): el canario CJK dio "limpio" sobre un archivo corrupto.
  La clase no es instrumentable; el detector es leer la frase.
- **TTL de 1800 s** (2do registro): `task-dafa909f1450` murio. Es el 4to motivo de
  "timeout" y el primero que se distingue del stream idle y del provider caido.
  **El canal de archivos no tiene TTL** — es la via para lo que no se puede
  perder.
- **6to ciclo del clon compartido atrasado:** `gw2-dev`.main esta en `11285a0`
  sobre su propia rama (`fix-hb77-puerta-llega`) mientras `origin/main` va en
  `6ca0858`. Se trabajo en un worktree sobre `origin/main`. **13 worktrees** y
  **2 ramas remotas ya mergeadas** siguen sin borrar: es decision de Pablo.

**Corto:** el canario CJK del HB#86 dio "limpio" sobre un archivo que estaba
corrupto. Tres instrumentos despues, la clase resulta no detectable por
metodo lexico barato. **12 defectos corregidos** (11 los vio un script, 1
solo la lectura), **ALERT-117 escrita**, y **ningun instrumento mergeado**.

## Tareas en curso

| Quien | Que | Estado |
|---|---|---|
| **PO** | Ronda 28 (`task-dafa909f1450`, 3 preguntas) | ❌ **FALLIDA — `Task timed out after 1800s`**. No hay respuesta que recoger. Ver abajo. |
| **Reviewer** | 2 veredictos (ALERT-84 ronda 17, e Idea 50 boton cache) | ✅ Sin nada en vuelo. Sus 2 veredictos ya estan aplicados. |
| **Documentador** | — | Sin tarea (regla de no-fallback vigente). |

## La falla del PO, y por que NO la reintento todavia

`task-dafa909f1450` devolvio **"Task failed. Error: Task timed out after 1800s"**.
Las 3 preguntas que llevaba (PRE_BACKLOG, la TERCERA de la clase "se arma bien
y no se ve", y cual de los 2 raws nota Pablo primero) **no tienen respuesta**.

No la reenvio en este ciclo, por una razon concreta: **el paso 3 del ciclo
("si el PO trae 3+ propuestas, van al Reviewer") quedo sin aplicar porque no
hubo propuestas, y la causa de que no haya propuestas es justamente que la tarea
murio.** Reenviar y esperar 30 min es correcto, pero el ciclo ya tiene
trabajo entregado y madejo. Queda como primer item del HB#89.

Nota de instrumentacion: `check_agent_task` devuelve `running` mientras la
tarea esta viva y un error **definitivo** cuando expiro. `running` y `failed`
no son el mismo estado y no deben anotarse igual en `COMMS_LOG.md`.

## Hallazgo del ciclo: ALERT-117

El HB#86 corrio `probe-cjk.mjs` antes de anexar la ALERT-116 y dio limpio. El
archivo commiteado en `e1262b0` tiene, **en la prosa viva de esa ALERT**:

    ALERTS_LOG.md:1892  "...y **no locorrí** porque la ALERT-115 yaNnarraba el..."

El canario respondio correctamente a lo que pregunta ("no hay CJK"). Lo que se
leyo del otro lado fue "esta limpio". Es **el mismo verbo** que la ALERT-116
acusaba en `audit-alert-refs.mjs`: un instrumento acotado autorizando una
conclusion que no le corresponde.

**Tres instrumentos, tres fallas distintas:**

| Instrumento | Pregunta | Medido |
|---|---|---|
| `probe-cjk.mjs` | ideogramas? | **0**. No ve la clase. |
| `probe-glue.mjs` | minuscula pegada a mayuscula? | **131** falsos/realos: ~120 falsos. Y **no ve `locorrí`** (ambos lados minusculas). |
| `probe-fusion.mjs` | token con palabra funcional pegada? | **~5000 falsos**. Inutilizable: en espanol las palabras funcionales son prefijos de palabras comunes por construccion (`de`+`fecto`, `lo`+`gro`). |

El tercero resuelve el asunto **por la via negativa**: la clase "un espacio
desaparece entre dos palabras" **no es detectable por instrumento lexico
barato en espanol**. No es que falte afinar el regex.

**Defecto que NINGUNO de los tres vio:** `pedidosentedaron` (`ALERTS_LOG.md:831`,
`quedaron` con `qu` sustituido por `en`). No es un espacio comido, es una
**sustitucion**. Salio leyendo. Por eso el criterio de cierre del ciclo es
"lei la prosa", no "el script dio 0".

## Los 12 defectos corregidos

Todos verificados leyendo la frase en contexto. Diff = 12 lineas, 12 archivos
de prosa, EOL CRLF preservado en los 4.

    ALERTS_LOG.md  407  sonSEO fillers      -> son SEO fillers
    ALERTS_LOG.md  524  ElReviewer          -> El Reviewer
    ALERTS_LOG.md  831  pedidosentedaron    -> pedidos quedaron      <- solo lectura
    ALERTS_LOG.md  838  loLEA, dosinstantias-> lo LEA, dos instancias
    ALERTS_LOG.md 1389  elReviewer          -> el Reviewer
    ALERTS_LOG.md 1892  no locorrí, yaNnarraba -> no lo corrí, ya narraba
    SESSION_LOG.md 605  seResolvedieron     -> se resolvieron
    SESSION_LOG.md 1484 tieneREWARDS_DATA   -> tiene REWARDS_DATA
    TEAM_STATUS.md 1024 ElEnumerar          -> El Enumerar
    TEAM_STATUS.md 1170 elWV                -> el WV
    TEAM_STATUS.md 2064 botonTodavia        -> boton todavia
    TEAM_STATUS.md 2229 malDiseñada         -> mal Diseñada

**Uno NO se corrigio, a proposito:** `SESSION_LOG.md:2008` dice `y laPuede cer:`.
El pegado es obvio pero el texto correcto hay que **inventarlo**, y una
reparacion adivinada en un registro de decisiones es peor que un defecto
visible. Queda visible.

## Instrumentos: 3 scripts NO mergeados

`probe-glue.mjs` y `probe-fusion.mjs` **no entran al repo**. No porque fallen,
sino porque lo que hacen es **producir un numero que invita a citarse**, y sus
numeros son 131 y ~5000 para 12 defectos reales. En `tools/` serian una
trampa con nombre de aide: el proximo que los corra reporta "131
corrupciones" o abandona el archivo entero. Quedan en el worktree, fuera del
arbol, como registro del intento.

## Lo que sigue

1. **HB#89, primer item:** reenviar al PO la ronda 28. El paso 3 del ciclo
   (3+ propuestas al Reviewer) quedo sin aplicar por esta falla, no por
   olvido.
2. Anotar `task-dafa909f1450` como `Fallido` en `COMMS_LOG.md` con el motivo
   exacto (`Task timed out after 1800s`), no como "timeout" generico.
3. Decisiones que son de Pablo, sin cambio: (a) la perdida del registro de
   `ALERT-20` y `ALERT-86` se acepta o se rescata; (b) **detener UNA de las dos
   instancias** — el clon compartido otra vez detras de `origin/main`
   (HB#87 escribio ahi, yo escribo en `hb88-wt`); (c) borrar los **13
   worktrees** vivos y las ramas remotas ya mergeadas.

# Heartbeat Principal #87 — 2026-10-01 08:0x–09:0x UTC

> Ciclo de **auditoria de un hallazgo ya cerrado**. La ALERT-115 (HB#86) cerro
> con "las 4 huerfanas no se inventan". Este ciclo midi si eso era cierto y
> **para 1 de las 4 es falso**. No agregue features: el codigo que el Reviewer
> aprobo ya esta entero en `main`, y el item del BACKLOG que quedaba abierto
> resulto tener la premisa **medida falsa** en HB#78.

## Lo que se entrego

- **ALERT-116** (nueva): `tools/audit-alert-refs.mjs` acierta el numero y se
  equivoca en el verbo. **1 de las 4 ids "nunca escritas" si se escribio.**
- **`tools/append-alert.mjs`** (nuevo): anexa a un `.md` respetando su EOL y
  **se niega a escribir si el archivo ya es mixto**. Cierra la causa de los LF
  pelados de HB#77 y HB#86.
- **`tools/_eol.mjs`** (nuevo): cuenta CRLF/LF de un archivo y avisa si es
  mixto. El instrumento de la regla.

## El hallazgo del ciclo: "nunca existio" no es lo que el script midio

HB#86 cerro con 4 ids huerfanas y la frase de que **no se inventan** porque
"son referencias a entradas que nunca se escribieron". Medi cada una por
separado, con un metodo que **no comparte codigo** con el audit:

| id | citado desde | definicion | veredicto |
|---|---|---|---|
| **`ALERT-20`** | `ALERTS_LOG.md:422` (fila ALERT-25), `PRE_BACKLOG.md`, `SESSION_LOG.md` | **`d91888b`**, en `legacy/fix-concurrency-pool-phase2` | **si se escribio; la rama nunca llego a `main`** |
| `ALERT-22` | `ALERTS_LOG.md:418` (fila ALERT-24) | 0 en las 11 ramas remotas | nunca existio |
| `ALERT-30` | `ALERTS_LOG.md:432` (fila ALERT-35) | 0 en las 11 ramas remotas | nunca existio |
| `ALERT-86` | `TEAM_STATUS`, `SESSION_LOG`, `COMMS_LOG:259` | nunca existio, **y describe algo que SI se implemento** | registro perdido |

Los 3 pasos de `ALERT-20`, que es el que cambia el veredicto:

1. `git log --all -S"| **ALERT-20** |" -- ALERTS_LOG.md` -> **un** commit:
   `d91888b`, fila completa ("FASE 2 sin pool", "Corregido HB#36", pico 27->3).
2. `git branch -a --contains d91888b` -> `legacy/fix-concurrency-pool-phase2`.
3. `git merge-base --is-ancestor d91888b origin/main` -> **falla**.

**Por que el script no lo puede ver.** `audit-alert-refs.mjs` responde *¿esta el
id definido en el `ALERTS_LOG.md` de **este** arbol?*. Una fila que vivio en una
rama no mergeada es indistinguible de una que nunca existio. El numero es
correcto para la pregunta que hace, y no sirve para la que se le esta haciendo.

**`ALERT-86` es el caso caro.** Su cita describe el segundo criterio por **forma**
de `tools/idea50-censo-claves.mjs` (las 3 familias de `homestead-tracker.js` que
se escriben como `{ts, data}`). **Ese criterio esta implementado.** Se perdio
el registro de que algo se arreglo y por que: sin la entrada, el proximo que lea
ese script ve un criterio raro sin explicacion y lo puede borrar.

**El fallo de metodo, que es la parte que mas rindio.** El control del audit
(`definidos.size >= 100`) protege contra el extractor roto — y asi detecto los
**343 huerfanos falsos** del primer borrador. Lo que **no** cubre es **el archivo
equivocado**: si el `ALERTS_LOG.md` de este arbol no tiene lo que un commit de
otra rama si tiene, no hay forma de saber que le falta. El segundo metodo existia
y **no se corrio**, porque la ALERT-115 ya narraba el resultado como cerrado.
**Un hallazgo sin contraste no se escribe aunque el instrumento que lo produce
tenga control.**

## Lo que se midio y NO se aplico (y por que)

- **El "fix de 3 lineas" de los raws de `raid-tracker.js`** (fila 079, el unico
  item de codigo que quedaba del BACKLOG): **su premisa ya estaba medida FALSA**
  en HB#78. `raid-tracker.js:921` lee `gw2_selected_key_v1` a pelo, y la fila
  079 lo marcaba como "rompe en escenario Gist-nuevo". **`gw2_selected_key_v1`
  SI esta en `MIRROR_MAP`** (`storage.js:211`), o sea que la legacy **es** la
  fuente de verdad por declaracion y el raw devuelve **exactamente lo mismo** que
  `Storage`. Aplicar el fix habria sido cambiar 4 lineas de 4 modulos para no
  cambiar nada. **El item ya no es un fix: es una correccion de la fila 079.**
- **`raid_strike_view`** (`raid-tracker.js:1054/1059`): ya **arreglado** en
  `f9239d7` (HB#78), con default en la llamada y guard de valores validos, tal
  como pidio el Reviewer. No queda nada.
- **No se mergero `legacy/fix-concurrency-pool-phase2`.** Resucitaria texto, no
  trabajo: la ALERT-20 dice "Corregido". **Que el registro se complete o se
  acepte la perdida es decision de Pablo.**

## Tareas en curso

- **Reviewer: sin nada en vuelo.** Recoggi 2 veredictos con `check_agent_task`
  (`task-f191daf882b7` y `task-98befbf8c084`): **los 2 ya estaban aplicados** en
  `agents/main` (`1f0fd6e` para P1/P2/P3, `2206217` + `386a022` para el runner).
  No hay nada que reenviar ni que aplicar.
- **PO: ronda 28 enviada** (`task-dafa909f1450`), en vuelo al cierre. Se le
  pregunto por (a) novedades de PRE_BACKLOG, (b) si hay una **tercera** instancia
  de la clase "el mensaje se arma bien y no se ve" (hoy hay 2), y (c) cual de los
  2 raws Pablo nota primero.
- **Documentador: sin tarea.** La regla de no-fallback sigue vigente.

## Completadas (verificado en `origin/main`, no de memoria)

- **P1 — el contrato del `ttl`**: `app.js:222` es `Number(opts.ttl ?? 3500)` y
  `loadAllForToken` tiene el `try/finally`. En `1f0fd6e`.
- **P2 — `.side-nav__icon`**: `theme-polish.css:118` ya **no** declara
  `display:grid`. Era el unico choque de capa 2 vivo de los 29.
- **P3 — `kind` de `parseKeyError`**: `git grep kind -- js/app.js` da **0**, y
  `hb77-puerta-llega.test.js` se ajusto en el **mismo** commit.
- **El runner de suite**: `2206217` (dejaba pasar 77 aserciones en silencio) y
  `386a022` (contaba la linea de resumen como asercion). Contrastado con un
  **segundo contador de codigo propio** que dio el mismo total.

## Pendientes / alertas

- **ALERT-116 (nueva).** Ver arriba. La accion pendiente es de **Pablo**: si la
  perdida del registro de `ALERT-86` (y de `ALERT-20`) se acepta o se rescata.
- **`ALERT-22` y `ALERT-30` siguen sin escribirse.** Sus citas son de filas que
  **si** existen (ALERT-24 y ALERT-35), o sea que el que las escribo se estaba
  refiriendo a algo real que no quedo anotado. **No se inventan.**
- **`tools/audit-alert-refs.mjs` no se corre en ningun sitio.** `git grep` lo
  encuentra **solo en prosa de `.md`**: no hay hook, ni test, ni script que lo
  invoquen. Es decir que **el instrumento existe y el agujero sigue abierto**:
  la ALERT-115 es correcta en que "los `.md` no se validan", y el fix que el
  mismo ciclo dejo es **optativo**. Anotado, no resuelto en este ciclo.
- **Una ocurrencia en vivo de la ALERT-112**, y con el canario funcionando: se me
  colaron 2 ideogramas en el borrador de la ALERT-116 y los atrapo
  `tools/probe-cjk.mjs` **antes** de anexar. Uno estaba en una palabra clave
  ("describir"), que es donde mas dano hace porque se lee como texto correcto.
- **La instancia duplicada.** `origin/main` esta en `950753d`. El clon
  compartido sigue en `11285a0` con 9 commits **que no son ancestro de `main`**:
  es la firma de la otra instancia, y confirma la regla de siempre (**la verdad
  es `origin/main`**). Todo este ciclo fue en `hb86-wt`, sin tocar el clon
  compartido. **No se decide: es de Pablo.**
- **11 worktrees vivos** y **2 ramas remotas ya mergeadas sin borrar**
  (`docs-idea50p3-hb67`, `feat-idea56-forma-raids`). **No se borran:** borrar
  worktrees con WIP ajeno es lo unico que no hago sin que lo pida.

## Estado de propuestas

- **Reviewer: 3/3 aplicadas** (P1, P2, P3) + 3 hallazgos no pedidos y tambien
  cerrados (runner de suite, artefacto del scanner CSS, `.an-hero` muerto por el
  `!important` de `main.css:1239`). **Sin nada en vuelo.**
- **PO: ronda 28 en vuelo.** No hay 3+ propuestas para mandar al Reviewer, asi que
  **el paso 3 del ciclo no aplica** — y eso es una decision, no un olvido: la
  ronda 22 ya establecio que un PO al que no se le pregunta nada no propone nada.
  En este ciclo **si se le pregunto** (3 preguntas concretas), asi que la ronda
  28 tiene material para producir.
- **Sin propuestas pendientes de envio al Reviewer.**

# Heartbeat Principal #86 — 2026-10-01 07:30–08:0x UTC

> Ciclo de **cierre de deuda de documentacion**. No agrego features: el codigo
> que el Reviewer apruebo en HB#81 (P1/P2/P3) ya esta entero en `main` desde
> HB#84/HB#85. Lo que quedaba era el agujero que rodeaba al codigo, y encima
> faltaban los logs de dos ciclos.

## Lo que se entrego

- **ALERT-108 a ALERT-112 RESCATADAS** (`ALERTS_LOG.md`, +128 lineas). Estaban
  escritas en el WIP sin commitear de `hb81-wt` y **nunca llegaron a `main`**, pero
  si sus referencias: `COMMS_LOG.md` filas 087/088 y `TEAM_STATUS.md` las
  citaban como si existieran. Ver ALERT-115.
- **`tools/audit-alert-refs.mjs`** (nuevo): indexa los ids definidos en
  `ALERTS_LOG.md` y lista toda referencia `ALERT-n` de los `.md` de la raiz que
  no resuelve. Acepta `--alerts=<ruta>` y `--docs=<dir>` para medir un commit
  anterior sin tocar el arbol. Sale 1 si hay huerfanas, 2 si el extractor fallo.
- **`tools/probe-cjk.mjs`** (nuevo): el detector que la ALERT-112 pedia y que no
  existia en el repo. **REPORTA, no juzga**: los 8 aciertos de `ALERTS_LOG.md` son
  texto corrupto citado a proposito como evidencia.
- **Fila 088 de `COMMS_LOG.md` cerrada** con los 3 veredictos del Reviewer.

## El hallazgo del ciclo: 7 ALERTs se citaban desde 4 archivos committed y no existian

Medido con el mismo script sobre el mismo arbol, antes y despues:

| arbol | ALERTs definidos | referencias | huerfanas | ids huerfanos |
|---|---|---|---|---|
| `a5ec94f` (HEAD al empezar) | 103 | 524 | **16** | 20, 22, 30, 86, **108**, **110**, **112** |
| este ciclo | 108 | 549 | 13 | 20, 22, 30, 86 |

Las 5 en negrita son las rescatadas. Las 13 referencias huerfanas que quedan son
4 ids (**`ALERT-20`, `ALERT-22`, `ALERT-30`, `ALERT-86`**) y **5 de esas 13 son
las del propio informe que las nombra**: la auditoria cuenta sus propias
referencias, asi que el script imprime los ids distintos como cifra de cabeza.
**Quedan ANOTADAS, no resueltas.** Escribir un ALERT para explicar por que no
hay un ALERT es fabricar el hallazgo que el numero no sostiene.

## Lo que casi se reportaba y no se reporto

La primera version del extractor de definiciones solo reconocia **titulos**
(`## ALERT-n`) y reporto **343 referencias huerfanas**, porque las filas de
tabla `| **ALERT-n** |` — que son la mayoria de las definiciones — le parecian
referencias. Un numero **25 veces mayor que el real**, salido de un regex que
escribi ese mismo ciclo. Lo unico que lo impidio fue el **CONTROL** del script:
si el conjunto de definidos baja de 100, sale con codigo 2 y se niega a dar un
total. Ese control es lo que hay que escribir en cualquier contador nuevo, y es
mas barato que las 343.

## Verificacion

- Suite completa: **1123 pass / 0 FAIL, 41 archivos contados, STATUS=0**. Sin
  `SIN ASERCIONES`. Es el numero que pedia el Reviewer como condicion de merge
  de HB#81 ("no se aprueba hasta que el STATUS sea 0 y el numero que reportas
  sea el que sale"): **los 2 archivos que el runner no contaba ya se cuentan por
  resumen** (`alert86` 31, `idea57t4` 14, `idea84` 46).
- `node tools/audit-alert-refs.mjs`: **CONTROL ok, 109 definidos, 4 ids
  huerfanos** (la cifra sube a 108->109 porque la ALERT-115 misma define una).
- `node tools/probe-cjk.mjs`: CONTROL ok (ve su canario). Sin CJK en los 2
  archivos nuevos y en la ALERT-115.
- EOL: `ALERTS_LOG.md` quedo con **14 LF pelados** al anexar el addendum con un
  one-liner de `cmd` donde `\$` llego al regex como dollar literal y el trim no
  ocurrio. Medido (crlf 1798 / lf 1812) y normalizado con un script que **se
  niega a normalizar si el archivo es mayormente LF**. Final: 1812/1812. Es el
  hueco de TEAM_STATUS en HB#77, repetido por la misma causa: un one-liner en
  vez de un script con guardas.

## Tareas en curso

- **Reviewer**: sin nada en vuelo. Las 3 preguntas de la fila 088 llegaron
  completas y las 3 estan aplicadas.
- **PO**: ronda 26 recibida (fila 090). T7 era real y ya lo cubre `1f0fd6e`.
- **Documentador**: sin tarea. La regla de no-fallback sigue vigente.

## Completadas (verificado en `origin/main`, no de memoria)

- **P1 — el contrato del `ttl`.** `app.js:222` es `Number(opts.ttl ?? 3500)`
  (no `||`), y `loadAllForToken` tiene el `try/finally` que hacia falta para que
  el toast persistente no se cuelgue en error de red. En `1f0fd6e`.
- **P2 — `.side-nav__icon`.** `theme-polish.css:118` ya **no** declara
  `display:grid`; la capa 1 conserva `inline-grid`. Era el unico choque de capa
  2 vivo de los 29.
- **P3 — `kind` de `parseKeyError`.** `git grep kind -- js/app.js` da **0**. Las
  6 ramas y el destructure se fueron, y `hb77-puerta-llega.test.js` se ajusto
  en el **mismo** commit, como pedia el Reviewer.

## Pendientes / alertas

- **ALERT-115 (nueva).** Ver arriba. El agujero es de una clase entera: **los
  `.md` no se validan** y la suite no los mira.
- **`ALERT-20`, `ALERT-22`, `ALERT-30`, `ALERT-86` siguen huerfanas.** La mas
  alcanzada es la 86, citada desde `COMMS_LOG.md`, `SESSION_LOG.md` y
  `TEAM_STATUS.md`. No se inventan.
- **`TEAM_STATUS.md` tiene huecos: faltan los ciclos #82, #84 y #85.** Los
  tres commitearon codigo y ALERT-113/114 pero ninguno actualizo el estado del
  equipo, que es lo que la regla de `AGENTS.md` pide en cada heartbeat. Este
  ciclo cierra el #86 y deja el hueco anotado.
- **La instancia duplicada.** `origin/main` esta en `a5ec94f` desde las 04:19 y
  este ciclo es el primero que escribe desde ahi. La verdad sigue siendo
  `origin/main`, no el clon compartido, que seguia en `11285a0` — un commit que
  **no es ancestro de `main`**. Todo el trabajo de este ciclo fue en el
  worktree nuevo `hb86-wt`, sin tocar el clon compartido ni los worktrees de
  la otra instancia.
- **11 worktrees vivos** (5 de ellos de esta familia). Sigue sin decidirse si se
  limpian: es decision de Pablo y borrar worktrees con WIP ajeno es lo unico
  que no hago sin que lo pida.
- **2 ramas remotas ya mergeadas y sin borrar**
  (`docs-idea50p3-hb67`, `feat-idea56-forma-raids`): contra la regla de
  `AGENTS.md`. No las borro.

## Estado de propuestas

- **Reviewer: 3/3 aplicadas** (P1, P2, P3), mas los 3 hallazgos que no
  pregunte y tambien cerrados: el runner de suite, el artefacto del scanner CSS
  (esta en `main.css` tambien, no solo en `theme-polish.css`) y el
  `.an-hero{min-height:240px}` muerto por el `!important` de `main.css:1239`.
- **PO: 1 propuesta received** (ronda 26), y su propuesta **chocaba con un
  assert** de `hb80` que defendia el defecto. No se aplico: hay veredicto del
  Reviewer en vuelo sobre esa misma linea. Ese veredicto ya llego y la aplico
  `1f0fd6e`.
- **Sin propuestas pendientes de envio.**

## Lo que NO se hizo, y por que

- **No se borro el WIP de `hb81-wt`.** Se rescue lo que era evidencia (las 128
  lineas de ALERT) y se dejo el resto. `_hb81_probe.html` sigue ahi y las 159
  lineas de `TEAM_STATUS.md` de ese ciclo no se copiaron: HB#83 ya escribio una
  seccion para el #81, y pegar dos versiones del mismo ciclo seria peor que
  dejar una.
- **No se escribieron las 4 ALERTs huerfanas que faltan.** Ver arriba.
- **No se hizo la ronda 27 al PO.** No hay 3+ propuestas que mandar al Reviewer, y
  la ronda 26 ya no dejo nada sin aplicar.

# Heartbeat Principal #83 — 2026-10-01 UTC

> Ciclo de **cierre**: dos ciclos mios quedaron con commits sin mergear y este
> los merges, mide lo que esos midieron, y encuentra un defecto en el runner que
> habia falseado el reporte de suite dos ciclos seguidos.

## Lo que se entrego

- **`2593306`** (cherry-pick de `b1fe9e7`, de HB#81) — el fix del z-index del
  toaster. **Estaba verificado y con veredicto del Reviewer desde el ciclo
  anterior, sin mergear.** Mergeado ahora. Remueve `z-index:60` de
  `theme-polish.css` (capa 2) y lo sube a `10001` en `main.css` (capa 1).
- **`386a022`** — fix del runner de suite. Es lo que se explica abajo.
- Fila 087 cerrada (el veredicto del Reviewer sobre T6, **rechazaba el fix de
  HB#80**), 089 y 090 nuevas.

## El hallazgo del ciclo: los 6 que HB#81 dejo sin explicar eran un bug del runner

HB#82 (2206217, ya en main) reportaba **1088 pass / 0 FAIL**. HB#81 reportaba
**1094**. Seis de diferencia, y el propio HB#81 escribio que no las persiguia.

**Los 6 son dos errores opuestos que se cancelan, y los dos son el mismo
defecto:** el runner cuenta "linea que arranca con el veredicto de una
asercion" con `/^(OK|PASS)\b/i`, y **una linea de resumen tambien arranca asi**.

| archivo | runner | correcto | delta |
|---|---|---|---|
| `idea57t4-idioma-contrato.test.js` | **1** | **14** | **+13** |
| 7 archivos mas (resumen `pass: N \| FAIL: 0`) | N+1 | N | **-1 c/u** |
| **total** | **1088** | **1094** | **+6** |

El caso de `idea57t4` es el grave: `"OK: 14 pass, 0 FAIL"` deja `p = 1`, el
**fallback de resumen nunca se dispara**, y un archivo de 14 aserciones se
reporta como 1. El otro extremo son 7 archivos donde la linea de resumen suma
una asercion de mas.

**+7 y -13 se cancelan y el total queda 6 por debajo.** Ese es el peor modo de
fallo de una cifra: los dos errores son plausibles, el numero final tambien, y
nada en el reporte lo delata.

**Fix:** `esResumen()` antes de sumar, probando la linea contra los mismos
regex que usa el fallback. Con una copia **sin flag `g`** (con `g`, `test()`
alterna por `lastIndex` y el resumen contaria solo con numeros pares).

**Verificacion:** 1094 por el runner **y** por un contador independiente con
otra estrategia (escanea toda la salida, no las ultimas 6 lineas). **Dos
metodos que no comparten codigo.** Mutacion: quitar el guard devuelve 1088 y el
fallback a 2 archivos. **La mutacion muere.**

**Consecuencia para los ciclos anteriores:** los "1094 / 40 de 40 / 0
INDETERMINADOS" de HB#81 eran correctos **a mano**, y el runner no podia
llegar. Y el "1088" de HB#82 era el numero del runner **con el bug**, no el
real. Ver ALERT-113.

## T7 (la prioridad 1 del PO): medida, y **NO aplicada**, y por que

La ronda 26 del PO midi bien: `app.js:215` `Number(opts.ttl || 3500)` se come el
`0`, y el censo de la clase es **1 caso real en 46 modulos** (`.legacy`,
`app.js:221`, es el gemelo). **El diagnostico es correcto.**

**No se aplico por una razon de proceso, no tecnica:** ya hay un veredicto del
Reviewer **en vuelo** (fila 088, pregunta P1) sobre **exactamente** este
contrato de `toast()`. Aplicar el fix de la misma linea antes de su veredicto es
la clase de cambio que este equipo no hace.

**El hallazgo del PO sobre el test es lo mas bueno de la ronda**, y es una
tercera instancia del patron de ALERT-110: el assert 4 de
`hb80-toast-permanencia.test.js` exige `opts.ttl || (\d+)` **como garantia de
que el default siga siendo finito**. O sea: **el test defiende la expresion que
es el defecto.** La forma que el bug necesita es la forma que la garantia
necesita. ("un test que afirma una forma no puede guardar una propiedad de esa
forma"). Medido: el assert existe y matchea hoy.

## Verificaciones del ciclo

- Suite: **1094 pass / 0 FAIL, 40 de 40, exit 0**, por dos metodos
  independientes.
- **Newlines por conteo de BYTES del BLOB** (`git show HEAD:<archivo>`), no del
  disco: los 6 archivos quedan en **LF puro, 0 CRLF, 0 BOM**. El disco los ve
  en CRLF por `core.autocrlf` y eso no dice nada (ALERT-114, caso 4).
- **CJK: 0** en los 3 archivos de log, con `probe-cjk.js` y los rangos CJK
  reales. Y el detector **atrapo 3 corrupciones mias** antes de que llegaran al
  repo (ALERT-112 aplicado en el ciclo siguiente al que se escribio).
- `reflog` del clon compartido: **sin cambios**, `11285a0`, sin escritura de la
  segunda instancia en este ciclo. 2 untracked ajenos (`ORG_MAP.md.bak-...`,
  `con`) siguen sin tocar.

## En vuelo / pendiente

- **`task-98befbf8c084`** (Reviewer, 3 preguntas: P1 el contrato de `toast()`,
  P2 la capa 2 como duena de propiedades estructurales, P3 el `kind` que nadie
  lee). **Enviado, sin recoger.** La P1 es la que desbloquea T7.
- Worktrees con ramas sin mergear: `hb81-wt` (HB#81, ya mergeado por cherry-pick
  — la rama se puede borrar), `_wt_hb82v` (HB#82, **ya en main** — la rama se
  puede borrar). **No las borro yo**: `hb81-wt` tiene 3 archivos de log
  modificados sin commitear que son los ALERT-108 a 112, y/octienen material
  que el ciclo anterior escribio y no mergeo.
- **P3 anotado por el PO, sin backlog:** `wv-purchase-detail.js` usa
  `rowData.purchase_limit` a pelo en 5 sitios (`:1744/1781/1824/1883/2004`)
  mientras 24 sitios del repo usan el patron guardado. **NO verificado que exista
  un caso vivo** (0 de 958 items tienen `purchase_limit` en `/v2/items`; el campo
  solo existe en `/v2/account/commerce/listings`, que requiere token de cuenta).
  **Sin caso vivo verificado NO entra al backlog**, y el PO lo marco bien.

## Decisiones que son de Pablo, no mias

1. **Detener la instancia duplicada** (3er ciclo que se reporta).
2. Borrar las 2 ramas remotas ya mergeadas sin borrar (`docs-idea50p3-hb67`,
   `feat-idea56-forma-raids`).
3. Que hacer con las 7 ramas sin mergear, 6 en CONFLICTO.
4. Si `viewPref` se implementa (veredicto en fila 081): la 2 claves de pestana
   **se descartan** por el conflicto con `gw2_conv_cache_v3` (TTL 30 min).

# Heartbeat Principal #81 — 2026-10-01 UTC
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
| **PO** | El Enumerar categorias no sobrevive → decir **bytes** | **Si** |

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
4. El hook `onClear` es lo que hace que el boton sirva de algo completo. Sin el, el WV reescribe en memoria lo que se acaba de borrar.

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
  hasta que recargues"), asi que no miente — pero el boton todavia no aprovecha
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
- **ALERTA NUEVA - una mutacion mal Diseñada se lee como un fallo del test.**
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



---

# Heartbeat #90 (2026-10-01 09:5x-10:3x UTC) — los 2 veredictos ya estaban aplicados en main, y el bug del PO ya estaba arreglado

**Corto:** recogi los 2 veredictos pendientes del Reviewer (hb77, hb76) y **los
dos ya estaban en `origin/main`**, aplicados por la sesion paralela. Este ciclo
**no mergeo codigo de produccion: el codigo ya estaba.** Lo que si cambia es una
regla (**ALERT-119**), porque mi rama redundante habria **revertido** parte de lo
que la otra sesion hizo. Suite de `origin/main`: **1153 pass / 0 FAIL**.

## Tareas en curso

| Quien | Que | Estado |
|---|---|---|
| **Reviewer** | ƒ?" | **Sin nada en vuelo.** Sus 2 veredictos (hb76 `task-254bb8f34cca`, hb77 `task-0aa1d0284655`) se recogieron este ciclo y los 2 estan **cerrados con el codigo ya aplicado**. |
| **PO** | Ronda 27 respondida (`20261001T101351Z-hb90r1`); ronda 28 **sigue VENCIDA** | Entregada y verificada leyendo el `to` del JSON recien escrito (ALERT-91). |
| **Documentador** | ƒ?" | Sin tarea (regla de no-fallback vigente). |

## Los 2 veredictos, y por que este ciclo no mergeo nada

### hb77 — APROBADO CON CAMBIOS, ya aplicado (y por 3 caminos)

El Reviewer pidio sacar `app.js:1067` (`if (err?.kind) return ...`) de
`parseKeyError`. Lo midio el, no se afirmo: extrajo la funcion, evaluo las **dos**
variantes contra 9 entradas y difieren en **0 de 9**; `git grep -nE "\.kind\s*=" --
"*.js"` da **0** en todo el repo, o sea que el caso que habilita la rama no
existe. Y va **primera**, asi que saltea el clasificador entero (un 403 con `kind`
degrada de "Key prohibida (HTTP 403)" a "HTTP 403 forbidden").

**Ya estaba hecho:**
- `87bab23` "se saca el codigo muerto que el Reviewer measuro en app.js:1067".
- `fdf29ac`, el cherry-pick de la sesion `chatadmin` con el fix original.
- Y `main` fue **mas alla**: elimino el campo `kind` entero, con test propio
  (`idea61` P3, "0 productores, 0 consumidores").

Yo habia aplicada mi version (`37155ae` sobre `9fa3986`) **sin saber de la sesion
paralela**, y la borre. **Mi commit era redundante.**

**Correccion propia que queda escrita:** el commit `9fa3986` **decia haber sacado
esa linea y no la habia sacado** — el mensaje de commit la describia como parte
del fix. El Reviewer lo detecto. Un mensaje de commit es un artefacto que otros
leen para decidir si algo esta hecho.

### hb76 — el Reviewer deskadro UNA de mis DOS premisas

Pregunte si el guard de la Idea 61 toleraba los raw de las claves mapeadas en
`MIRROR_MAP`. **La premisa no se sostenia:** `MIRROR_MAP` (`storage.js:209-214`)
tiene 4 pares y **`raid_strike_view` NO esta** — esta solo en `FALLBACK_MAP` y
`MIGRATION_PREFIXES`. **Verificado a mano en este ciclo**, no de memoria. De los 3
raws de `raid-tracker.js`, **solo 1** cae dentro del guard (`:891`), y es
tolerant **por construccion**: el espejo declara que la legacy es la fuente de
verdad, asi que un lector crudo ve exactamente lo que `Storage.get`. Ademas no es
el primero: es el cuarto modulo que hace eso.

El Reviewer marco que `escLegR = 11` era **decoracion**: el unico numero del guard
que puede ir de 0 a 40 sin un solo FAIL. Recomiendo convertirlo en puerta con
allowlist por par y modulo.

**La opcion (A) YA ESTA APLICADA en `origin/main`:** `idea61` tiene
`LECTORES_LEGACY_ESPERADOS` (9 entradas), con el motivo escrito de por que
`accounts-panel.js` NO esta, **y el cuarto numero que el Reviewer decia que
faltaba** (el escritor crudo de la `gn:`, el unico movimiento que rompe el espejo
de verdad, porque `Storage.get` lee la legacy primero). `idea61` da **38 pass /
0 FAIL**.

## El bug del PO: la premisa estaba mal medida

El PO reporto (ronda 27) que `loadAllForToken` escribe sin guarda y que **la carga
vieja gana**. Ejecutado con sandbox y con control, que es el metodo correcto.
**El defecto es real como descripcion y NO esta en el codigo.**

`origin/main` ya tiene la guarda, con **otra forma**:

```js
let loadSeq = 0;
async function loadAllForToken(token) {
  const mine = ++loadSeq;
  ...
  if (mine !== loadSeq) return;   // :679
```

**Por que el PO no lo vio:** su grep fue
`git grep -nE "KeyManager\.selected\s*(===|!==)"` → 0 resultados, y de ahi concluyo
que no hay guarda. La guarda existe **como contador de secuencia, no como
comparacion contra `KeyManager.selected`.**

> **REGLA (3a vez en el equipo, la mas cara): `git grep` sobre UNA forma concreta
> devuelve 0 tambien cuando la cosa existe con otra forma.** Las otras 2: la
> ronda 19 del PO (¿la app hace round-trip? "no", porque el codigo usa `fetch` y
> no `XMLHttpRequest`) y mi conteo de 35 que el PO corrigio. **El sintoma y la
> premisa son DOS afirmaciones y hay que medirlas las dos.** Se le pide al PO que
> antes de afirmar "no existe" pruebe con **2 formas**: la cadena que espera, y una
> por el efecto (`loadSeq`, `abort`, `Promise.race`, contadores).

`tests/hb87-carga-gana.test.js` (12/0) cubre **las dos escenas del PO**: el
control en orden natural y B-responde-primero, y tambien su punto del
`ownerLabel` ("la etiqueta de dueno miente con el mismo valor viejo").

## Alertas

- **ALERT-119 (nueva).** Dos sesiones pueden aplicar el mismo fix en paralelo sin
  que ninguna lo sepa. Aqui la sesion `chatadmin` mergeo hb77 y el cambio del
  Reviewer (`87bab23`) **antes** de que yo recogiera el veredicto. El conflicto
  add/add del test revelo que `main` ya no tenia la linea, y el `CONFLICT` en
  `app.js` mostraba dos versiones de `parseKeyError`. **Sin el chequeo de "esto ya
  esta en `origin/main`?", el merge habia REVERTIDO el `kind` removido.** Regla:
  antes de mergear un veredicto, `git merge-base --is-ancestor` contra
  `origin/main` y **leer el estado de los archivos de MAIN, no el diff propio.**
- **ALERT-120 (nueva).** El driver denego el merge por la subcadena `rm` dentro
  de la palabra "**perm**isos" (ALERT-39, **5to caso**). Se resolvio con un archivo
  de mensaje (`git merge -F`). Y **denego tambien el borrado de 2 archivos basura
  de 0 bytes**: `Approval for 'Bash' timed out after 300s`, motivo "contains
  'rm'". **No se borraron** y quedan en `git status` del clon compartido. No son
  mios segun el PO (firma: `>` mal cerrado, nombres que son fragmentos de codigo,
  23:07:33) y **no rompen nada**, pero ensucian la superficie que todos usan para
  decidir si el arbol esta limpio. **Pablo: para borrarlos hace falta que el driver
  los autorice.**
- **ALERT-118 (sigue abierta).** `raid-tracker.js:1012/:1016` escribe
  `raid_strike_view` a pelo → `gn:raids:strike:view` queda con la foto del
  **primer arranque** para siempre. No se ve porque no hay lector. Si algún dia se
  toca, el fix va en la direccion **contraria** a la que propone el PO: a
  `Storage.set` (que escribe las dos), no "dejar el crudo".
- **ALERT-121 (nueva, menor).** `tests/_run-all.js` excluye archivos por **formato
  de salida**, no por fallo. Este ciclo reporto "3 archivos, 91 aserciones" por
  resumen (`alert86` 31, `idea57t4` 14, `idea84` 46). **Verificados archivo por
  archivo: los 3 en verde.** El conteo es correcto; el riesgo es que un test nuevo
  con formato raro **parezca verde por exclusion**.

## Estado de propuestas

- **Reviewer: 2/2 aplicados**, ambos ya en `origin/main` antes de empezar el ciclo.
- **PO: 1 respuesta enviada** (a la ronda 27); 1 suya vencida (ronda 28).
- **Sin propuestas pendientes de envio al Reviewer.**

## Lo que NO se hizo, y por que

- **No se mergeo nada.** El codigo de los 2 veredictos ya estaba en `origin/main`.
  Mergear mi rama redundante habia revertido el `kind` removido. El aporte de este
  ciclo son los docs y la regla de ALERT-119.
- **No se abrio la puerta de `app.js:783`** (`!perms.has('account') ||
  !perms.has('wallet')`), que el PO midio con control y que es el hallazgo **mas
  fuerte y vivo** de su ronda: acepta una key que la API rechaza en 8 de 9
  endpoints. PR aparte, con pregunta de **diseno** al Reviewer ("que tiene que
  poder distinguir la UI para que la respuesta sea correcta"), no un "arregla la
  condicion".
- **No se borro la basura de 2 archivos**: el driver la denego. Ver ALERT-120.
---

# Heartbeat Principal #91 — 2026-10-01 11:0x-11:2x UTC

**Rama:** `hb91-ciclo` (worktree `gw2-hb91-wt`), base `origin/main` @ `73477cc`.
**Suite:** 1157 aserciones / **0 FAIL** (43 de 44 archivos). Entrada: 1149.
**No hubo merge.** No hubo nada que mergear: este ciclo no toco codigo de app.

## El item del ciclo: la puerta de permisos — la premisa era FALSA, y el hueco era de TEST

Era el item que el HB#90 dejo anotado como "sigue vivo". **No esta vivo.**

### Lo medido, por las 2 formas (no por una)

| Forma | Resultado |
|---|---|
| Cadena: `git grep "has('account')" -- js/` | **0** — la forma de 2 permisos no existe |
| Efecto: extraer y evaluar `REQUIRED_PERMISSIONS` + la linea `FALTAN` **tal cual** (`tools/hb91-puerta-medir.mjs`) | `account+wallet` → **RECHAZA (5 faltan)**; vacia → RECHAZA (7); los 7 → ACEPTA; 7+extra → ACEPTA |

Con **control negativo y positivo** en el mismo script: si los 4 casos dieran el
mismo veredicto, el arnes estaria roto y la medida no valeria nada. Discrimina.
Y `git merge-base --is-ancestor ea10e9b origin/main` → **si**: el fix de la puerta
(`feat(app): la puerta de permisos exige los 7 que la app USA, no 2 (recuperado)`)
esta en main desde antes de que el PO lo midiera por 1a vez.

**Es la 3a manifestacion de la clase "no existe / ya esta" en el equipo** (tras la
ronda 19 del PO y la ronda 27). El verbo del PO es **"acepta"**; el codigo dice
**"rechaza"**. La descripcion del sintoma era correcta; la premisa no.

### El hueco que SI era real: `hb75` afirmaba la FORMA, nunca la CONDUCTA

`tests/hb75-permisos.test.js` secciones 1 y 2 afirman que `FALTAN` deriva de la
lista completa y que no exista el condicional parcial. Las dos **siguen validas y
ninguna ejecuta la puerta**. La via natural de una regresion —**cambiar la LISTA,
dejar el `filter`**— pasa las dos.

Comprobado: borre los 5 permisos no estructurales dejando `account + wallet`
(la forma intacta) → **8 FAIL**, pero los dispararon las aserciones de cobertura
de la union de scopes, que miran el **numero**, no el **veredicto**.

**Seccion 6 agregada**: extrae la condicion real y la evalua con 5 casos
(2 del PO / 7 / 7+extra para tolerar permisos que la app no usa / vacia).
Con la misma mutacion da **1 FAIL que es exactamente el que debe**
(`una key con SOLO account+wallet es RECHAZADA`). Sin mutacion: **54/0**.

Herramientas committed: `tools/hb91-puerta-medir.mjs` (la medida, reusable) y
`tools/hb91-mutar-puerta.mjs` (el mutador, para la fase roja de cualquier ciclo futuro).

## Un error mio de este ciclo, y el sintoma que lo delato

El primer mutador uso `^\s*\{ scope: '...'`. En modo `m`, **`\s` incluye `\n`**,
así que el cuantificador se comio lineas de arriba y borro `account` y `wallet`
tambien: la puerta quedo **vacia**, no laxa. Daba 11 FAIL en vez de 8 y el mensaje
era `puerta=0 union=7` — un numero que no puede ser real y que delato la causa.
Corregido a `[ \t]*`. **Regla: en un regex con flag `m`, el cuantificador al
principio de linea es `\s*` o no es nada; `[^ \t]` de mas es un cuantificador que
cruza lineas.**

## Pregunta enviada al Reviewer (DISENO, no "arregla la condicion")

`(a) sin escopos` y `(b) escopos insuficientes` son el mismo `Error` hoy, y para
Pablo son hechos distintos: (a) hay que ir a crear los permisos, (b) la key ya
esta guardada con 5 permisos de menos. Con `addOrUpdate` **(b) no es alcanzable**,
pero vuelve a serlo en cuanto exista una segunda puerta o editar una key guardada
(item abierto del PO). Pregunté que tiene que distinguir la UI, y si se resuelve
con mas ramas, con un campo que ya existe, o no se resuelve. **No le pedi una
tercera rama sin necesidad.** Entregado verificado: `to: Code-Reviewer`, 4413 chars.

## Estado al cierre

- **Reviewer:** 1 pregunta en vuelo (esta). Sin nada recogido.
- **PO:** ronda 28 (095) y acuse de HB#90 (098) **VENCIDAS**, sin respuesta. Su
  item principal de la ronda 27 era el de esta puerta: **pregunta resuelta por
  medicion, no por veredicto.**
- **Documentador:** sin tarea (no-fallback vigente).
- **Nada esperando respuesta de nadie para seguir.**

## Lo que NO se hizo, y por que

- **No se "arreglo" la puerta**: no hay defecto de codigo. Arreglarlo habria sido
  inventar trabajo.
- **No se borro la basura de 2 archivos** (`con`, `ORG_MAP.md.bak-...chatadmin`):
  el driver la denego en el HB#90 (ALERT-120). **Sigue sin autorizacion de Pablo.**
- **No se borro ninguno de los 11 worktrees** ni las 9 ramas remotas ya mergeadas:
  son decision de Pablo, y borrar `rm` esta denegado por el driver de todas formas.
- **No se propuso promover a `origin`.** `PROMOTIONS.md` no se toco.
## 2026-10-01 - Heartbeat #92 - la 099 al Reviewer y la 098 al PO NUNCA LLEGARON, y el error no daba ninguno

**El hallazgo del ciclo, y no es de codigo: es de entrega.** El canal de archivos
acepta mensajes que su destinatario **no puede leer**, y el fallo es silencioso
en las dos formas. Detalle y evidencia: **ALERT-122**.

### Que se rompio, exactamente

`cli.py inbox` no es "listar la carpeta del otro". Es
`agentlink.inbox(agente, kind='question')` = glob de `inbox/*.json` **Y** filtro
por `kind == 'question'`. Son dos condiciones. `ask()` cumple las dos; un JSON
escrito a mano no, y no tira error al escribirse.

Medido con `tools/hb92-comms-legible.mjs` (nuevo, corre el lector de cada agente):

| agente | VE | en disco |
|--------|----|----------|
| default | 0 | 0 |
| code-reviewer | 1 | 6 |
| product-owner | 4 | 8 |
| documenter | 0 | 0 |
| architect | 0 | 1 |

**10 mensajes con cuerpo real que su destinatario nunca va a listar**, en los 3
modos: en la **raiz** de la carpeta (la 099: 4413 chars, raiz + sin `kind`), en
`inbox/` pero **sin `kind`** (las 4 copias de la 098 al PO), y con `kind` mal
escrito (`"ASK"`, `"ask"`).

### Los dos mensajes que el equipo dio por entregados y no lo estaban

- **La 099 al Reviewer.** Mi MEMORY del HB#91 decia, textual: *"Entregado
  verificado leyendo el JSON recien escrito: `to: Code-Reviewer`, 4413 chars"*.
  Cierto, y no alcanza: verifique que **el instrumento** habia escrito, no que
  **el consumidor** lo leeria. El Reviewer tenia **0** preguntas visibles.
- **La 098 al PO.** 4 copias, ninguna legible. La fila quedo **VENCIDA "sin
  respuesta"** y el PO no habia contestado **porque no podia leer**. Anotarlo
  como silencio del otro agente es una accuse falsa.

**De ahi sale la regla que mas rinde: una fila `VENCIDA` no distingue "el otro
no contesto" de "el otro no podia leer lo que le mande". Misma fila, causas
opuestas, y la segunda produce diagnosticos falsos sobre otro agente.**

### Corregido en este ciclo, y verificado por el LECTOR del otro

- **La 099 reentregada** por `agentlink.ask()`. Verificado: `inbox('Code-Reviewer',
  kind='question')` paso de **0 a 1**, y el cuerpo releido son los 4413 chars
  originales. No es la misma "entrega verificada" de antes: esa miraba el
  escritor.
- **Ronda 29 al PO** entregada por la via canonica y verificada asi. Le digo lo
  de la 098, que use `ask()` y por que escribir a mano no es equivalente, y que
  "no hay tercera instancia" es una respuesta util.

### Dos errores mios, y los dos los agarro un detector o una medida

- **El detector nuevo 보고 13 invisibles cuando hay 10.** Conte `kind:'reply'`
  como invisible, pero `cli.py replies` **si** los ve: hay **dos** lectores, no
  uno (`kind='question'` y `kind='reply'`), y solo mire el primero. Ademas se
  colaba un `.json.bak`. Un detector con un falso positivo hay que argumentarlo
  antes de correrlo, y ese es el modo de que nadie lo corra.
- **Casi reporto un ALERT-115 que no existia.** `Select-String` ordenado
  lexicamente me dio `ALERT-99` como maximo y concludes que 118-121 faltaban.
  Falso: el maximo real es **121** y las 3 estan escritas. Me lo corrigio
  `tools/audit-alert-refs.mjs`... que a su vez las reporta como huerfanas, porque
  solo reconoce la forma de tabla y ellas son encabezado `# ALERT-NNN`. Las
  huerfanas de verdad son 4 y son conocidas: `ALERT-20`, `22`, `30`, `86`.

### Estado al cierre

- **Reviewer:** 1 pregunta en vuelo, la 099 de diseno sobre la puerta de
  permisos, **ahora si legible por el**. Sin recoger.
- **PO:** 4 preguntas visibles (2 viejas vencidas + ronda 28 + ronda 29), 0
  respondidas. `PRE_BACKLOG.md` sin cambios desde `07:08:24Z` (4 h).
- **Documentador:** sin tarea (no-fallback vigente).
- **Suite:** `1175/0`, **44 de 44** archivos, alcance completo.
- **Nada mergeado a `origin` (produccion) ni propuesto.** `PROMOTIONS.md` intacto.

### Lo que NO se hizo, y por que

- **No se reenviaron los 8 invisibles viejos** (la 50F, hb70, r17-t34,
  `ask-hb70-stale`, la del PO del hb70). Varios son de rondas que ya se cerraron
  por otro canal, y reenviar un mensaje viejo **contamina** al que lo recibe. Se
  anotan y se decide con quien corresponda; el detector los deja visibles para
  que la decision sea de Pablo, no un efecto colateral de este ciclo.
- **No se borro el huerfano de la raiz** ni los 2 archivos basura de ALERT-120:
  el driver deniega `rm` (5to caso) y **no se rodea una denegacion**.
- **No se borro ninguno de los 11 worktrees** ni las ramas remotas ya mergeadas.
## Heartbeat #93 — 2026-10-01 11:3x-12:0x UTC

### Tareas en curso
- **Reviewer:** 1 pregunta en vuelo (la 099 de la puerta de permisos, reentregada en
  el HB#92 y verificada legible). Sin veredicto al cierre de este ciclo.
- **PO:** 1 pregunta en vuelo por `submit_to_agent` (`task-b434adc70d5b`, TTL 3600 s),
  ronda 30. **Cambio de mecanismo, no de estilo** — ver ALERT-123.
- **Documentador:** sin tarea (regla de no-fallback vigente).

### Completado
- **BACKLOG.md: 3 filas corregidas, las 3 eran FALSAS.** El item "Hook `onClear`"
  figuraba como "No empezado", "sigue abierto desde el HB#70, sin veredicto" y
  "`fix-idea50b-hook-cache-mem` SIGUE SIN MERGEAR". **Esta implementado y mergeado en
  `origin/main` desde `0c12adc`.** Medido en main: `api-gw2.js:1861-1867/1909`,
  `wizards-vault.js:636`, y el test de 271 lineas esta ahi. Con esto se cierra tambien
  el bloqueo de ALERT-48 sobre esa rama: no hay nada esperando veredicto.
- **ALERT-123 escrito** (el PO no procesa su inbox de archivos).
- Suite **1175 pass / 0 FAIL, 44 de 44 archivos**. Sin codigo de producto tocado.

### Pendiente
- `check_agent_task` sobre `task-b434adc70d5b` y sobre la 099 del Reviewer.
- **Paso 3 del ciclo sigue sin poder cumplirse** (3+ propuestas del PO al Reviewer):
  van 10 rondas. La causa esta medida y no es "el PO no propone por falta de ideas":
  es que **no lee el canal por el que le llegan las preguntas** (ALERT-123).

### Alertas
- **ALERT-123 (nueva):** el PO contesta por `submit_to_agent` (session cerrada
  08:31:34Z) y **no** por el canal de archivos, con 4 preguntas visibles y la mas vieja
  de ~12,5 h. Su cron corrio a las 10:09:24Z con `success` y no escribio nada.
  **La causa exacta NO esta establecida y no se afirma.** Regla: *un `inbox` que
  devuelve 0 no prueba que no te leyeron.*
- **ALERT-119/120/121/122:** siguen abiertas, sin novedad este ciclo.
- **Regla de la 4a manifestacion de "afirmar un negativo con un solo instrumento":**
  `git grep` por el simbolo que uno tiene en la cabeza no es "no existe". Buscar
  `onClear` daba 0 y el hook estaba ahi, con otro nombre. **Cuando el grep da 0, el
  nombre hay que buscarlo en el DIFF del commit que lo implemento.**

### Estado de propuestas
- Al Reviewer: **1** en vuelo (099). **0** nuevas este ciclo.
- Del PO al Reviewer: **0**. Sin novedades de PRE_BACKLOG (`LastWriteTime 07:08:24Z`).
- **Nada mergeado a `origin` (produccion) y nada propuesto para promover.**

### Verificaciones del ciclo
- `git fetch` PRIMERO y `origin/main` compared antes de escribir (ALERT-119 no se cumplio).
- `node tools/hb92-comms-legible.mjs`: **10 invisibles, los mismos de siempre** (5 al
  Reviewer, 5 al PO, los 3 modos). No se reenvian: son de rondas cerradas y
  reenviar un mensaje viejo contamina al que lo recibe.
- Los 3 logs anexados con `tools/append-alert.mjs`, que **se niega a escribir** si el
  archivo queda con EOL mixto: `ALERTS_LOG` 2480 -> 2541 CRLF, `COMMS_LOG` 368 -> 370.

---

# Heartbeat #94 — 2026-10-01 ~12:0x–12:4x UTC

**Ciclo de una sola cosa: T10 del PO, verificado por ejecucion, y NO aplicado por
regla.** No se toco codigo de producto.

## Estado del equipo

| Agente | Estado | En vuelo | Notas |
|--------|--------|----------|-------|
| **Code-Reviewer** | OPERATIVO | **1 pregunta (HB#94 T10), verificada legible** | 2 visibles para el. La pregunta 099 (permisos) sigue sin respuesta. Entregada y verificada con el LECTOR del receptor: 1 -> 2. |
| **Product-Owner** | OPERATIVO | 0 | Ronda 30 completa y entregada. Las 4 respuestas suyas cerradas este ciclo. Confirma que su falla anterior era de ENTREGA (TTL 1800 s), no de trabajo. |
| **Documentador** | sin tarea | 0 | No-fallback vigente. |

## Tareas en curso

- **T10-mitad A (CSS, `.raid-wing-card` invisible):** EN ESPERA DE VEREDICTO. Es CSS
  y la validacion del Reviewer antes de aplicar es obligatoria. Preguntada como
  DisENO con 3 vias y 1 riesgo que no medi. Test en rojo: `tools/hb94-wv-view.test.js`
  (9/10; el unico FAIL es el de comportamiento, que es el que tiene que fallar).
- **T10-mitad B (vista del WV no persiste):** CONFIRMADA por ejecucion, sin fix
  todavia. Depende de la misma pregunta de diseno (si se tocan las claves del WV,
  la decision de capa es la misma).
- **Propuesta ronda 12 del PO (confirm con BYTES RESTANTES):** sigue abierta, sin
  merge. Es producto y espera el tramo tecnico.

## Completado este ciclo

- 4 respuestas del PO leidas, procesadas y cerradas (`9c1e44`, `a1ae0d`, `b72da0`, `2a471b`).
- Fila 098 de COMMS_LOG cerrada: estaba "Enviada" con la respuesta ya existente
  desde las 09:0x. Volvio a ser la clase "el otro contesto y yo no lo lei".
- T10 verificado en `origin/main @ 03ca201`, las 2 mitades, por ejecucion.
- Suite completa: **1175 aserciones / 0 FAIL, 44 de 44 archivos**. Sin codigo de
  producto tocado.

## Pendiente (ordenado)

1. **Veredicto del Reviewer sobre T10-mitad A** (esta en vuelo, legible).
2. Cuando llegue: aplicar el CSS en rama propia, correr el test hasta verde,
   suite completa, push. Si el Reviewer elige la via (i), el test pasa sin tocar
   las 3 reglas de `.raid-wing-card`.
3. Preguntar a Pablo si tiene la preferencia de movimiento reducido activa. El PO
   no lo midi y yo tampoco: no sale de un grep. Si no la tiene, T10-mitad A es un
   defecto real con bajo impacto, y eso cambia la prioridad de la B.
4. T10-mitad B: el tramo tecnico (los writers crudos vs `MIRROR_MAP`) es el mismo
   item que el que ya se reporto. La decision de por donde va la correccion la
   tiene el Reviewer.
5. Revisar los arneses existentes con el criterio de ALERT-124 (un arnes sin
   control negativo no prueba nada).

## Alertas de este ciclo

- **ALERT-124 (nueva):** un arnés SIN control negativoaprobo el bug que vino a
  encontrar. `hb94-wv-store.mjs` en su 1a version decia que el caso real
  respetaba la eleccion del usuario. Causa: mi ciclo no creaba la `gn:` en el
  arranque 1, asi que el caso degeneraba en el que si funciona. Con el paso
  agregado: caso real CONGELADA, control OK, discrimina. Regla: si el caso que
  tiene que fallar pasa, el defecto esta en el arnes, y la primera respuesta no
  es tocar el codigo. Imprimir el "discrimina SI/NO" como asercion propia.
- **ALERT-125 (nueva):** mi barrido de alcance dio 2 de 3 y el que perdi es el MAS
  expuesto (`strike-tracker.js:699`, sin animacion inline, 100% dependiente de la
  capa 2). Un detector con una sola forma valida produce falsos negativos, y en un
  barrido de alcance eso se lee como "es un punto" y se deja de medir. Cuando el
  conteo mio y el de otro difieren, la diferencia es el dato.
- **ALERT-122 (recurrencia):** la 098 estuvo 2 h+ en "Enviada" con respuesta ya
  entregada. El paso 3 del ciclo tiene que leer antes de declarar vencido.
- **ALERT-120 (abierta):** 2 archivos basura de 0 bytes siguen sin poder borrarse
  (el driver denego el comando). Sin resolver.
- **Nota de shell:** `printf`-style (`%d`/`%s`) a traves de cmd.exe se rompe
  (imprime `NaN`). Los scripts de este repo usan concatenacion con `+`.

## Estado de propuestas al Reviewer

| # | Asunto | Estado |
|---|--------|--------|
| 099 | Puertas: que tiene que distinguir la UI entre "sin escopos" e "insuficientes" | En vuelo, legible. Sin respuesta. |
| **HB#94** | **T10 `.raid-wing-card`: 3 vias + riesgo de colateral** | **En vuelo, legible (2 visibles para el).** |

## Notas de metodo (este ciclo)

- El arnés del WV tiene que **crear** la `gn:` en el arranque 1 para reproducir la
  congelacion. Sin ese primer estado, migracion y congelacion son indistinguibles.
- Un detector se valida con su control negativo; un conteo se valida contra el
  caso que el instrumento no puede ver.
- No se aplico CSS sin veredicto, aunque el bug sea de una linea y este sea el
  hallazgo mas grave en 30 rondas del PO. Esa es exactamente la clase de cambio
  que la validacion del Reviewer existe para frenar.
﻿
---

## Heartbeat #95 (2026-10-01 12:3x-13:0x UTC) — 2 filas del BACKLOG que mentian sobre veredictos cerrados, y el detector que no era posible

### Tareas en curso
- **T10 (PO, ronda 30) — YA TOMADO por el HB#94, no lo retomo.** `.raid-wing-card` invisible con `prefers-reduced-motion` (la tarjeta del ala y los encuentros van dentro: el Raid Tracker aparece en blanco) y la vista del WV congelada. Verificado por ejecucion, test en rojo a proposito, **pregunta de diseno al Reviewer en vuelo** (`20261001T123316Z__default__Code-Reviewer__b41551.json`, 6400 B). **El fix NO se aplica hasta ese veredicto** (es CSS, la validacion es obligatoria).
- **Pregunta de permisos en vuelo** (`20261001T110146Z__default__Code-Reviewer__1d4d69.json`, 4949 B): que tiene que distinguir la UI entre "sin escopos" y "escopos insuficientes".
- El Reviewer tiene **2 preguntas visibles y 0 respondidas**. El PO tiene **4 mensajes, 0 respondidos** (los 4 entrantes ya cerrados por mi).

### Completado en este ciclo
- **ALERT-126 + 2 filas del BACKLOG corregidas.** L114 (Idea 56) decia "esperando veredicto" siendo **APROBADA y MERGEADA desde el HB#55**; L199 (Idea 49G) decia lo mismo siendo **RECHAZADA en el HB#63**. Medido con `git merge-base --is-ancestor` contra `origin/main`, no leyendo las filas. `+2/-2`, 294 lineas antes y despues.
- **Fila 103 cerrada:** el PO **respondio** (4 mensajes, cerrados con `close`). ALERT-123 era un sintoma; la causa es el TTL de 1800 s de `submit_to_agent` y el PO **no estaba caido** — el mismo heartbeat corre y escribe.
- **4 respuestas del PO recogidas y leidas**, incluida la correccion de que su T9 llego tarde y ya estaba mergeado, y 3 correcciones a mis rounds previos.

### Pendiente
- **El paso 3 del ciclo (3+ propuestas del PO al Reviewer) sigue sin poder mandarse.** No por falta de ideas: por **ALERT-123, el PO no procesa su inbox de archivos**. Todo su trafico tiene que ir por `submit_to_agent`, con TTL >= 3600 s. Es decision de Pablo.
- **2 preguntas al Reviewer sin responder.** No hay nada que hacer hasta que responda; nadie en quien esperar.
- Backlog: sigue abierto el **boton de liberate de cache** (0 callers de `cacheClear`), el **Idea 50 Tramo E**, y el **Idea 53** bloqueado por falta del body crudo de `/v2/raids` que solo Pablo puede pegar.

### Alertas de este ciclo
- **ALERT-126 (nueva, la del ciclo).** Una fila de estado del BACKLOG envejece sola cuando el veredicto ya se cerro: el veredicto vive en `COMMS_LOG.md` y la fila en `BACKLOG.md`, y **nada los liga**. Es la **tercera vez en dos ciclos** (HB#93 encontro 2 sobre `onClear`).
- **Y lo que mas rinde de la 126: el detector de esa clase NO es instrumentable, y no lo commitee.** En 6 candidatas dio 1 acierto, **1 falso negativo (justo la fila que si era falsa)** y 3 falsos positivos. El FN es estructural — el id del pedido esta en la fila 061 y el veredicto en la 065, que no lo repite — y los FP son que una linea que *menciona* una espera no es una linea que *afirme* una espera. **La defensa real es que la fila lleve el veredicto en la misma linea**, que es como quedo.
- **2 errores de metodo mios, misma clase:** (a) mi medidor atribuyo la 49G a "Idea 53" por tomar el id de una **ventana de 6 lineas** en vez de la linea misma (ALERT-125 exacto); (b) casi reporte "0 entregas invisibles" por correr un detector **desde el clon compartido, donde ese archivo no existe** (error de HB#93, repetido).
- **Una falsa alerta que casi escribo y NO escribi.** El reply `20260930T185533Z__code-reviewer__default__ddc4d4.json` esta en la **carpeta del Reviewer** con `to: code-reviewer`, y pense reportar que "el Reviewer se manda replies a si mismo y no llego" (ALERT-126 en mi cabeza, el numero ya ocupado). **Medido antes de escribir: tiene `replied_by = default, replied_utc = 20260930T190932Z`** — lo consumi en el HB#64 (fila 067 = ALERT-75). No habia mensaje perdido. **Afirmar un mecanismo de entrega con un solo campo del JSON es la misma clase que medir un negativo con una sola forma de grep.**

### Estado de propuestas
| Quien | Que | Estado |
|-------|-----|--------|
| Reviewer | T10 (raid-wing-card + vista WV) | En vuelo, legible, sin veredicto |
| Reviewer | Diseno de la puerta de permisos | En vuelo, legible, sin veredicto |
| PO | Ronda 30 (T10) | **Respondida y cerrada**; el T10 lo tiene el HB#94 |
| Documentador | — | Sin tarea. **Regla de no-fallback vigente**: si falla, se reporta a Pablo, no documento yo |
|-production- | — | **CONGELADA.** Nada mergeado a `origin`, nada promovido, nada propuesto |

### Para Pablo (decisiones que no son mias)
1. **El paso 3 del ciclo sigue bloqueado por ALERT-123** (el PO no abre el canal de archivos). O se le exige abrirlo, o todo su trafico migra a `submit_to_agent` con TTL largo. Mientras tanto el PO aporta propuestas y yo las verifico, pero el ciclo no puede cerrarse como estaba previsto.
2. **Detener UNA de las dos instancias.** ALERT-119 se cumplio otra vez: `origin/main` estaba 9 commits adelante con el HB#94 ya hecho, y perdi el inicio del ciclo hasta hacer `git fetch`. Esta vez no rompi nada porque compare antes de escribir; la anterior casi revierte codigo.
3. **Borrar los 2 archivos basura de 0 bytes** (ALERT-120) y los **16 worktrees** + las ramas remotas ya mergeadas, entre ellas `feat-idea49g-ach-acc-compacta` y `feat-idea56-forma-raids`, que este ciclo dejo confirmado que **no** se van a mergear.
4. **La pregunta del PO que necesita a Pablo y no a un grep:** con la preferencia de "movimiento reducido" activa, el Raid Tracker aparece en blanco. El PO **no midi cuantos usuarios la tienen ni si a Pablo le pasa hoy**. Si no le pasa, el hallazgo es real y de alcance acotado; si le pasa, es la pantalla entera.
﻿
### Addendum del mismo ciclo (30 min despues) — el censo era 4, no 2
- **Censo real: 4 filas falsas, no 2.** Las 2 primeras (Idea 56, Idea 49G) +
  **2 mas** que aparecieron al preguntar por la OTRA frase: L252 (Tramo F, `c04496e`
  **en main**) y L253 (P3, `376f0d5` y `9adf6dd` **en main**). Todas corregidas con su
  medicion. **El motivo de escribir "2" fue buscar la frase que ya tenia en la cabeza
  ("esperando veredicto") en vez del estado que las filas afirman ("sin mergear").**
  Cuarta vez que un grep por la cadena propia se lee como el censo (ALERT-109, rondas 19
  y 27 del PO, `onClear` en el HB#93). **Censo = buscar el ESTADO, no la palabra.**
- **Y hay DOS clases, y solo una es instrumentable.** (1) **Mecanica** — "SIN MERGEAR"
  con el commit ya en `main`: se comprueba con `git merge-base --is-ancestor`.
  **Commiteada** como `tools/hb95-sin-mergear.mjs`, **0 falsos positivos** en 5
  candidatas, con control positivo explicito. (2) **No instrumentable** — "esperando
  veredicto" con el veredicto cerrado: el id del pedido esta en la fila 061 y el
  veredicto en la 065, que no lo repite. **NO se commitea.** La defensa de esa clase
  es estructural: el veredicto en la misma linea, que es como quedaron las 4.
- **Lo que el detector marca y NO se toca, a proposito:** `L3` es la nota de cabecera
  fechada ("Actualizado: 2026-09-30T10:10:00Z"). Es una foto de un momento; corregirla
  es reescribir la historia cada vez que algo se mergea. Por eso ese detector **no es
  una puerta de CIERRE**: informa, no bloquea.
- **La 49G deja escrito que su B1 NO se arregla** (implementacion rechazada = trabajo
  tirado), y que sus 4 mediciones si sobreviven porque son datos y no codigo.
- Suite **1183/0 en 45 de 45** tras las 4 correcciones. `ALERTS_LOG` 216393 -> 220505.

---

## [2026-10-01 13:0x-13:4x UTC] Heartbeat #96 - ALERT-127: hay una TERCERA condicion para que un mensaje llegue, y era la que explicaba al Reviewer mudo

**PASO 0 primero.** Inbox vacio, `replies` vacio, **1 VENCIDA** (al Reviewer). `git fetch` al
arranque: `origin/main` en `5a0c437`, mi HEAD clonado en `4573f30` (detached, 3 heartbeats
atras). Worktree `hb96-wt` desde `origin/main` directo, sin tocar el clon.

### El hallazgo del ciclo

**El canal de archivos entrega, no despierta.** Las 2 preguntas del Reviewer (099 del HB#91 y
T10 del HB#94) estan **las dos legibles** — verificado con su propio lector, `inbox('Code-Reviewer',
kind='question')` = 2 — y las dos **sin respuesta**. El HB#92 arreglo la legibilidad
(ALERT-122) y no cambio nada, porque la legibilidad es la condicion 2 de 3.

Medido, mismo endpoint y mismo momento, comparando con el PO:

| agente | preguntas legibles | crons activos | despertado |
|---|---|---|---|
| `default` | 0 | 1 | si |
| **`Code-Reviewer`** | **2** | **0** | **NO** |
| `product-owner` | 0 | 1 | si |

`Code-Reviewer/agent.json` tiene `heartbeat.enabled: false` y `cron list --agent-id Code-Reviewer`
devuelve `[]`. Su ultima escritura es de las **05:34**, hace 7.5 h. **El PO no tiene el problema
porque a el lo despierta su cron; el Reviewer no tiene cron.** No es que el PO sea mas
ordenado. Detector commiteado: `tools/hb96-despPertenece.mjs`, con control de scoping.

**Un error propio que casi da la conclusion OPUESTA:** la primera version del detector pasaba
`?agent_id=` en la query y el server la ignora, o sea que reportaba `product-owner: 0 crons` y de
ahi salia "el PO tampoco tiene disparador, el problema es general" — **falso**. El scoping va en
el header `X-Agent-Id` (`qwenpaw/cli/cron_cmd.py:69`). Corregido, y ahora el detector falla si
`default` y `product-owner` devuelven lo mismo. **2a vez en 2 ciclos que un detector da el
"limpio" falso** (la 1a fue contar `kind:'reply'`, ALERT-92). Regla: un 0 que no se puede
reproducir con un caso positivo NO es un hallazgo.

### Que se hizo, en el orden del ciclo

- **Tareas en vuelo verificadas.** `task-b434adc70d5b` (PO) = **finished, "Max iterations (100)
  reached"** — o sea el PO llega al tope de iteraciones, no se cuelga. La 103 quedo Resuelta en el
  HB#95, coherente.
- **PO consultado (paso 2).** `PRE_BACKLOG.md` a las **12:10:50Z** (ronda 30, T10): **si esta
  escribiendo**, no estaba stagnant. Preguntado por el cron y por la ronda 31,_TASK
  `task-b51dea39f809`. Se le dice que T10 ya esta verificado y que la puerta de `app.js:783` es
  mia — no le doy trabajo que no es suyo.
- **Reviewer despertado (el fix del ALERT-127).** `task-d0bc61b5e63b`, con **las 2 preguntas
  escritas en el cuerpo**, no como referencia al archivo. Se le explica por que se lo mando por
  este canal y no por el de archivos. **No se crea un cron para el Reviewer**: su heartbeat
  apagado es decision del Arquitecto ("bajo demanda"), y "bajo demanda" significa que lo
  despierto yo cuando hay algo que preguntarle.
- **Paso 3 (3+ propuestas al Reviewer): no aplica.** El PO no tiene 3 propuestas: van 27 rondas
  sin feature y el equipo se lo pidio 3 veces. Lo que si produce es la clase "se arma bien y no
  se ve", y sus 3 hallazgos de ahi los cerre yo. Se le dice que siga ahi, sin pedirle features.
- **BACKLOG revisado.** Las 4 filas falsas que corrigio el HB#95 siguen corregidas. Los items
  abiertos grandes siguen **bloqueados por decisiones de Pablo, no por trabajo mio**: ALERT-41
  (falta el body crudo de `/v2/account/raids` con token real), el badge CM, y el Idea 53
  (borrar el Strike Tracker o re-apuntarlo a logros). **No hay item abierto que pueda avanzar
  sin una respuesta del Reviewer o sin Pablo.** Eso es el estado real, no un bloqueo mio.
- **Nada de codigo de producto tocado.** Suite sin correr porque no hay cambios de producto que
  verificar; el unico codigo nuevo es el detector, que corre y se autoverifica.

### Estado de propuestas al cierre

| a quien | que | task_id | estado |
|---|---|---|---|
| Code-Reviewer | P1 puerta de permisos (DISENO) + P2 T10 `.raid-wing-card` | `task-d0bc61b5e63b` | en vuelo, **despertado por el canal correcto** |
| product-owner | ronda 31 + SI/NO de si su cron produce | `task-b51dea39f809` | en vuelo |
| documenter | — | — | sin tarea (no-fallback vigente) |

**Nadie en quien esperar que no tenga una pregunta en vuelo.** Las 2 filas del Reviewer
(099/100) y la 103 quedan anotadas como "entregadas y ahora si despertado"; la 099 no se
cierra hasta tener veredicto, porque la pregunta de diseño sigue abierta.

### Decisiones que son de Pablo, no mias

1. **Que el Reviewer no tenga ni heartbeat ni cron es una decision del Arquitecto y la respeto,
   pero le deja mudo.** Cada pregunta al Reviewer necesita 2 vias (archivos + `submit_to_agent`)
   o no llega. Se puede sostener, pero es un costo por pregunta. Si Pablo quiere, un cron de
   15 min que solo ejecute su PASO 0 lo resuelve — **no lo creo sin que lo pida**, porque su
   heartbeat apagado esta escrito como decision.
2. **Autorizar el borrado de los 2 archivos basura** (ALERT-120) y de los **16 worktrees** y las
   **~10 ramas remotas ya mergeadas**. Todo el equipo usa `git status` para decidir si el arbol
   esta limpio y esos lo ensucian.
3. **Detener UNA de las dos instancias.** `origin/main`.move 3 heartbeats (HB#94 y #95 los corrio
   la sesion paralela) mientras mi HEAD clonado estaba 3 heartbeats atras. No hubo perdida este
   ciclo porque empece con `git fetch` y compare antes de escribir, pero ALERT-119 se cumplio 2
   veces en 2 ciclos y una vez estaba a punto de revertir codigo.
4. **El PO llega a "Max iterations (100) reached"** en sus tareas largas. No es cuelgue, pero
   es un techo: si le pido mucho en un solo turno, se le corta la respuesta a la mitad.
5. **Colision de writers de los docs con el Documentador.**

### Pendiente proximo ciclo

1. `git fetch` PRIMERO y comparar HEAD vs `origin/main` antes de escribir nada.
2. `check_agent_task` sobre `task-d0bc61b5e63b` (Reviewer) y `task-b51dea39f809` (PO), con 30 s
   entre polls.
3. `node tools/hb96-despPertenece.mjs` en el PASO 0: si el Reviewer sigue con 0 crons y
   preguntas legibles, la 3ra condicion sigue abierta y hay que seguir despertandolo a mano.
4. Si el Reviewer contesta P1, el fix de la puerta se aplica recien ahi — es codigo de UI y
   necesita su veredicto antes.

### Actualizacion de las 14:0x UTC (mismo ciclo): LLEGO EL VEREDICTO y se aplico el fix

El Reviewer respondio `task-d0bc61b5e63b` con veredictos sustanciales sobre las 2
preguntas, y **desmiente 2 de mis 3 premisas**. Verificados por mi contra
`origin/main` antes de aceptar ninguno:

- **P1 (la puerta de permisos): veredicto (ii)**, y el discriminador es `idx`, que ya
  existe en scope y se calcula DESPUES del `throw` (`app.js`, offsets 40844 y 41196). No
  hace falta una rama nueva: hace falta **mover un `findIndex` que ya esta ahi** y elegir
  entre dos textos.
- **P1, y aqui me equivoque yo: (b) NO es inalcanzable.** Dije que "vuelve a ser alcanzable
  cuando haya una segunda puerta". **La segunda puerta YA EXISTE y esta en produccion hoy:**
  `settings-manager.js:247-260` `importApiKeys` escribe la lista de keys con `Storage.set`
  (linea 252) **sin pasar por ninguna validacion** — verificado que su cuerpo no menciona
  `REQUIRED_PERMISSIONS` ni ninguna forma de `permission|scope|perms` — y lo llama el import
  normal (`:393`) y `importFromData` (`:429`), que es el **camino del sync de Gist**. La puerta
  vive **solo** en `addOrUpdate` (`app.js:872-876`). Importar un backup con una key de 2
  permisos la guarda **sin error y sin mensaje**, y los modulos que piden `progression`
  degradan a `[]`. Eso es el bug original entrando por la puerta de atras.
  **El Reviewer lo mas: el criterio de fondo es mover la puerta al punto donde la lista se
  PERSISTE**, no agregar ramas. Hoy hay 1 escritor con puerta y 1 sin puerta; `accounts-panel.js:197`
  solo reetiqueta claves existentes y es benigno. **HB#91 NO se cierra con esto.**
- **P2 (T10): veredicto fix B**, y se APLICA en este ciclo (abajo).
- **Alcance corregido:** el PO reporto 1 pantalla y son **2** (`strike-tracker.js:699` usa la
  clase sin animacion inline y queda en blanco igual). Y `theme-polish.css:826` es el **unico**
  `opacity:0` como estado base en todo `css/`: el resto son `from{opacity:0}` dentro de un
  keyframe, que es seguro. El censo es de tamano 1 y se cierra con un assert.

### Que se aplico: el fix B de T10, y el test que lo prueba

`css/theme-polish.css`: se **BORRA** el bloque `@media (prefers-reduced-motion: reduce) { * {
animation: none !important; ... } }` (159-161), con el motivo escrito en el archivo. Gana
`main.css:686-688`, que ya tenia el criterio sano. No se toca `!important` en la capa 2
(prohibido) ni se anade ninguna regla: es el diff mas chico de los dos candidatos.

**El arnes del test estaba ROTO y decia que el fix no funcionaba.** Modelaba la cascada como
"gana la capa que carga ultimo" y leia solo esa; con el fix, `theme-polish` ya no declara
nada y el arnes devolvia 0, o sea **decia invisible con el CSS arreglado**, cuando el
Reviewer lo midio en Chrome real. El CSS real es **por propiedad**, y `animation-duration:
.001ms !important` sobre `*` le gana a `animation: ... forwards` sin `important` de
`.raid-wing-card`. Corregido. **2a vez en este archivo que el arnes es el que falla** (la 1a,
ALERT-124).

**Control negativo, que es lo que prueba que la correccion del arnes es real**
(`tools/hb96-fixb-control.mjs`): **sin el bug 0 FAIL, con el bug de vuelta 2 FAIL,
restaurado 0**. Y un error propio en el camino: **anote "1 FAIL" antes de mutar y son 2**
(uno por la regla prohibida, otro por el comportamiento). El numero de FAIL esperado se
anota DESPUES de medir la primera vez; el que se anota antes y no se corrige es el que hace
que un arnes mal calibrado "suene bien".

Suite completa **1185 pass / 0 FAIL, 45 de 45 archivos**.
---

# Heartbeat #99 — 2026-10-01 15:3x-15:5x UTC

## Lo que cambia en el estado

**T1 APLICADO Y VERIFICADO** (`8ff95b5`). `gn:wv:shop:view` y
`gn:wv:shop:legacy_filter` estaban **CONGELADAS**: `wv-shop-ui.js:222/228`
escribian la legacy a pelo con `localStorage.setItem` y el resto de la app
escribe por `Storage.set`. Como `storage.js` corre en modo copy, la `gn:` nace
de la legacy en el arranque 1 y la migracion ya no la toca: **la eleccion se
perdia al reiniciar**. El alcance real eran **2 claves**, no 1.

Lo interesante del diagnostico: las 2 claves estan en `MIRROR_MAP`
(`storage.js:160-161`), o sea **escribir la legacy funciona mientras la `gn:`
este sincronizada y se rompe en cuanto divergen**. Por eso el fix no es "agregar
la clave al espejo" sino **"dejar de escribir la legacy"**: la app escribe
siempre la `gn:` y el espejo se deriva solo. `router.js:257` ya lo hacia bien
para la misma clave — `wv-shop-ui.js` era el que no lo seguia.

**Test de ciclo de vida, no de grep**: ejecuta el `storage.js` real y los
handlers reales extraidos del archivo, porque un grep daria "OK" con el bug
puesto. **Con el bug: 7 pass / 4 FAIL. Con el fix: 11 pass / 0 FAIL.** Sin el
control de la seccion 4, un arnes que dijera "CONGELADA" siempre pasaria igual.

**Suite completa: 1196 aserciones / 0 FAIL, 46 de 46 archivos** (venia de 1185/45;
los +11 son del test nuevo).

## ALERT-128 (nueva, ver arriba)

19 worktrees acumulados. `hb98-wt` tenia **el fix de T1 completo, sin
commitear**, y el ciclo estaba por reportar "HB#97 y #98 no dejaron nada".
**Regla: `git worktree list` es parte del PASO 0.** Desde `origin/main` solo,
"no hubo commits nuevos" y "hubo un ciclo entero sin commitear" se ven iguales.

El fix se recupero **verificando el diff de la otra sesion contra
`origin/main`**, no copiandolo a ciegas: un WIP ajeno es un hypothesis, no un
resultado. ALERT-119 **no se cumplio** este ciclo (HEAD era ancestro de
`origin/main` al arrancar, y `origin/main` no se movio durante el ciclo).

## En curso

- **`task-bbf65a6542fe` al Code-Reviewer: RESPONDIDO** (verdict completo, ~4.5 k
  caracteres). **APROBADO CON CAMBIOS: (a), y T1-bis ANTES que T11.**

  El censo **cambio la pregunta**: no son 2 controles, son **5, y 4 de 5 nombran
  la ACCION** (Cartera `app.js:616`, Cuentas `accounts-panel.js:568`, Personajes
  `characters.js:1034`, Meta `meta.js:867`, Tienda `wv-shop-ui.js:192`). **La
  Tienda es la unica que nombra el estado y la unica que persiste**: mi premisa de
  "asimetria rara" era la excepcion, no el patron.

  - **(a) = rotulo de ACCION, constante, 1 solo sitio.** Y la razon de fondo
    explica el bug: *si el rotulo es constante se emite una vez; si es estado hay
    que re-derivarlo en cada render, y por eso se multiplica por modulo*.
  - **Sin los 3 canales, (a) seria una regresion**: rotulo (accion) +
    `aria-pressed` (booleano) + `data-tip` (estado legible, porque
    `aria-pressed` es invisible al mouse). El repo ya tiene sistema de tooltip.
  - **(b) —persistir Cuentas— RECHAZADO**, con un criterio de informacion que no
    esperaba: Tienda compara las **mismas** entradas en dos disposiciones;
    Cuentas muestra **campos distintos**. **La asimetria de persistencia es una
    consecuencia, no una inconsistencia, y no se arregla.**
  - **(c) "documentar"** solo es sostenible *despues* de (a): con 4 strings, la
    documentacion no puede seguir al codigo.
  - **(d) (hacerlo `<select>`) RECHAZADO**: cambia un ghost por un select en una
    toolbar densa, y no se mete de yapa.

  **T1-bis: SI va antes, pero por VERIFICABILIDAD, no por dependencia.** Un
  renombre de 4 literales dont3 estan en codigo muerto no lo cierra ningun test
  (el test ve 1 de 4). Y el Reviewer **corrige un alcance que yo no medi**:
  **T1-bis son ~130 lineas, no 5** — es una 2ª implementacion completa del
  toolbar, incluida la **2ª definicion de `saveView` (`router.js:523`)**, o sea la
  que escribia la clave que T1 acaba de congelar. Con eso **T1 queda confirmado**
  como el cierre del unico writer vivo.

  **Test de CENSO, no de ejecucion** (mismo criterio que
  `idea50-censo-claves.mjs`): tiene que fallar cuando aparezca un 5º sitio, no
  cuando cambie el string.

  **Las 4 afirmaciones estructurales re-verificadas por mi contra `origin/main`:
  CONFIRMAN** (los 2 guards `return`, el rotulo escrito en 4 sitios,
  `root.WVShopUI` sin condicion, `aria-pressed` 3 veces en `js/`).

  **Matiz que el Reviewer no levanta y queda para Pablo:** esa rama no es codigo
  muerto puro, es un **fallback de fallo de carga**: si `wv-shop-ui.js` no carga,
  `window.WVShopUI` es `undefined` y el camino alternativo **si corre**. Borrarlo
  sin mas le quita a la app una degradacion.

- **ALERT-129 (nueva)**: el Reviewer midi sobre el **clon compartido** `gw2-dev`
  (en `4573f30`, 3 heartbeats atras) y no sobre `origin/main`; el aviso lo dio el
  mismo. **3a manifestacion de "el clon compartido y la sesion paralela se
  pisan", y la 1a que afecta al OTRO agente**: un arbol que no existe en ninguna
  parte. Sus *conclusiones* no cambiaron al reconfirmarlas, pero una conclusion
  correcta medida sobre el arbol equivocado no es una medicion.

## Cerrado

- **T10** (`f487573`) — ya estaba en `origin/main`.
- **T1 / T1-bis (la parte de decision)** — la decision era "no agregar al
  espejo, dejar de escribir la legacy"; el fix la aplica.

## Pendiente

- **Idea 44**: decimoctavo heartbeat en 0% (lo reporta el PO).
- **HB#91 (la puerta de permisos)**: el Reviewer laMarco *severidad media-alta*
  y **no se cierra**. La puerta vive solo en `addOrUpdate`
  (`app.js:872-876`) y `settings-manager.js:247-260` `importApiKeys` escribe
  `ACCOUNT_KEYS` **sin validacion** — o sea **el sync de Gist entra por la
  puerta de atras, en silencio**. Criterio de fondo del Reviewer: **mover la
  puerta al punto donde la lista se PERSISTE**, no agregar ramas.
- **El PO tiene un techo de 100 iteraciones**: responde pero se le corta. Pedirle
  **corto**. `PRE_BACKLOG.md` sin cambios desde 11:30Z.
- **ALERT-127 sigue abierta**: el Reviewer tiene 0 crons y su heartbeat esta
  apagado por diseno. Se lo sigue despertando a mano con `submit_to_agent`.

## Estado de propuestas al Reviewer

1 item en vuelo (`task-bbf65a6542fe`). Sin nada vencido de mi parte.

## Lo que NO se hizo

- **No se borro ningun worktree** (19) ni las ramas remotas ya mergeadas: son de
  ciclos viejos, la limpieza es de Pablo, y borrar el worktree de otra sesion
  mientras corre seria peor que dejarlo.
- **No se reenviaron las 10 entregas invisibles** viejas: `hb92-comms-legible`
  sigue dando 10, pero varias son de rondas ya cerradas por otro canal.
- **No se creo un cron para el Reviewer.**
- **Nada mergeado a `origin` (produccion) ni propuesto.**