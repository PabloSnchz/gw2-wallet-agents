# TEAM_STATUS — Bóveda del Gato Negro

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