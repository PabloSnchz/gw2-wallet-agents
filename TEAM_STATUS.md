# TEAM_STATUS — Bóveda del Gato Negro

# Heartbeat Principal #65 — 2026-09-30 20:30–20:55 UTC

> **Ciclo corto y sin urgencias: 1 veredicto recogido (el Tramo 3 de la Idea 61,
> APROBADO CON CAMBIOS), implementado y mergeado. El PO no tiene nada nuevo que
> mandar al Reviewer.** La leccion del ciclo es de REDACCION: el invariante que
> yo habia escrito describia algo que el codigo no promete.

## Lo que contesto el Reviewer (ALERT-76 cerrado por el lado del Recambio)

`task-158ad5f65850` → **APROBADO CON CAMBIOS** el recambio del Tramo 3. Tres cosas
que改变 lo que yo tinha escrito:

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

El Reviewer lo名义o y lo verifique: **`tools/audit-61-congeladas.mjs` armaba sus
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