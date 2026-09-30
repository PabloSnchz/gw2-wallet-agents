# TEAM_STATUS — Bóveda del Gato Negro


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

## Pendiente para el proximo ciclo

1. **49G**: aplicar `slice(5)` + un caso de test que escriba la clave y la
   relea desde una sesion nueva. Decidir si el encode guarda `cur`/`max` para
   los completados (B2), que es el otro bloqueante.
2. **61 T1-2 fix-forward**: P4 (derivar `MIRROR_MAP`) + el `remove` de la legacy.
3. **50F**: P3 (`__cacheBases`) antes de que exista el boton.
4. **Idea 49 punto 1** (badge del LM del 13-oct): desbloqueada, con `modes`
   declarado "no disponible todavia". Falta decidir si va a Raid o Strike
   Tracker — pregunta abierta al PO.
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