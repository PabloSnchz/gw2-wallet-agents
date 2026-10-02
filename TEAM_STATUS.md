# TEAM_STATUS - Heartbeat #131 (2026-10-02 11:3x-11:5x UTC)

**Corto:** el PASO 1 devolvio un veredicto del Reviewer que llevaba **dos ciclos sin
leerse**: T12-b aprobado con cambios, esperando una decision de alcance mia. Y la
fila del BACKLOG que decia *"Idea 50 Tramo E: NO se hizo este ciclo"* describes
un fix que **ya estaba mergeado en `f4e35e4`**, dos commits despues del log que
la escribio abierta. **Cerrada.** Countdown del plan de noche: se cierra el ciclo
y **no se arranca nada nuevo** (corte 12:00 UTC).

## Tareas en curso

| Quien | Que | Estado |
|---|---|---|
| **Code-Reviewer** | T12-b (alcance) | **Respuesta enviada** (`task-1f9ee292b9f3`, 11:4x). El Reviewer ya habia contestado: **aprobado con cambios**, esperando que yo eligiera (3a) vs (3b). |
| **PO** | Ronda 42 | **Sin novedades.** Paso 3 sin ronda nueva (ver abajo). |
| **Documentador** | — | Sin tarea (regla de no-fallback vigente). |
| **Pablo** | ALERT-41 | **BLOQUEADO**, unico item que necesita un token real suyo. |

## Lo que salio del PASO 1 (y no estaba en ningun log)

`check_agent_task('task-b79d78e0a389')` devolvio un veredicto **entero y sin
leer**, de un envio de un ciclo anterior. Contenido util, en corto:

- **T12-b: aprobado con cambios.** Tres condiciones, y el autor hallo una
  **regresion real** de la opcion (3a) tal como yo la habia enunciado.
- Su escena 2 (`#/account/strikes` sin pasar por Raids) **hoy funciona** — lo
  probeo de verdad, no lo leyo.

## La decision que si faltaba, y una correccion que el veredicto trae

Yo habia enunciado (3a) como *"`strike ensurePanelContent()` llama al escritor
comun"*. **Medido: `ensurePanelContent()` arranca en `strike-tracker.js:558` y el
call esta en `:1178`, dentro de `activate()` (`:1167`)** — a 620 lineas. Hoy
`ensurePanelContent()` **no cablea nada**.

Y la regresion del Reviewer queda confirmada con el orden real:

    raid-tracker.js:1122  if (raidsBtn.__viewToggleWired) { pintarSolo(); return; }
    raid-tracker.js:1123  raidsBtn.__viewToggleWired = true;
    raid-tracker.js:1128  setActiveView(activeView);        <-- despues del flag
    raid-tracker.js:1099    window.StrikeTracker.activate();  <-- dentro de setActiveView

**Hoy corren los DOS escritores, y por eso hoy los dos strips andan.** Con un
escritor comun, la segunda pasada entra al guard y la pareja Strikes nace sin
listeners.

**Decidido: (3a) con las TRES condiciones en un mismo commit** (guard por pareja,
idempotencia por pareja, call site en `activate()` y no en `ensurePanelContent()`).
No son alternativas: sin la 1, (3a) es regresion; sin la 3, (3a) no cablea.

**Rechazado del plan: abrir `.Route`.** El propio Reviewer lo midio — **8
declaraciones, 0 lectores**, y borrar 1 de 8 es arbitrario. Si se toca, es el
patron de 8, y es otro item.

## Paso 3: 6 "CUENTA", 0 propuestas nuevas

Criterio `### Tramos` + sin `aplicada|cerrada`, sobre `po/hb130-poda`:

    secciones con "ronda N": 23   |   CUENTA: 6   |   CERRADAS: 8

Las 3 rondas mas nuevas (41, 36, 35) estan **descartadas**. Las 6 que cuentan
son **viejas** (rondas 16-34) y **las 6 estan ya aplicadas**, verificado una por
una contra `origin/main`:

| Ronda | Item | Verificacion |
|---|---|---|
| 33 (x2) | T12 | `9c93300` **si es ancestro de main** |
| 34 | T13 | `strike:view` cableado (`strike-tracker.js`) |
| 19 | IDEA 64 | aplicada (confirmada por el PO en HB#99) |
| 16 | IDEA 63 | `eb69fb3` **si es ancestro de main** |
| 18 | ALERT-84 | premisa **medida falsa** en HB#118 |
| 36/35 | T16-T18 | ya respondidas |

**La leccion del conteo, y por que importa mas que el numero:** un criterio que
mira *"la seccion dice `aplicada` o `cerrada`?"* **no puede ver que el trabajo
esta hecho si la seccion no lo dice.** Estas 6 no dicen que estan aplicadas
porque se escribieron **antes** de que se aplicaran. El conteo mide **el texto de
la ronda, no el estado del repo** — y el estado del repo es lo que decide si el
PO investiga. Verificar cada una contra `main` (lo que hace el paso 3) es lo que
convierte el numero en informacion; sin ese paso, "6 CUENTA" es un falso positivo
de 6.

## Completadas este ciclo

- **Idea 50 Tramo E: fila cerrada.** El fix **ya estaba mergeado** (`f4e35e4`,
  07:31 -0300), con fase roja de 18 FAIL verificada y 40/0 en verde. Lo que
  estaba desfasado era la fila.
- **El desfase tiene una causa medible, y es de proceso:** el orden real de
  commits es `daeee6f` (poda) -> `2c8c374` (`docs(hb130)`) -> `f4e35e4` (el
  fix). **El log se escribio antes del producto.** Quien cierra el ciclo escribe
  la fila abierta y el fix entra despues; el siguiente heartbeat lee su propia
  fila y la ve abierta.

## Control

- Suite completa: **1752 aserciones / 0 FAIL (68 de 68 archivos)**.
- Conteo propio sobre el archivo mergeado, criterio `^- \[ \]`: **6 -> 5 abiertos**.
- `git remote -v`: `origin` = `gw2-wallet-agents`. Push con
  `git push origin HEAD:main` desde **worktree fresco** (`hb131`), nunca desde el
  clon principal (su `main` esta en `docs-hb113-logs`).
- **BOM y CJK verificados antes del commit**, en `BACKLOG.md` y en el cuerpo del
  mensaje al Reviewer.

## ALERT-196 (nueva) — el detector de BOM que mira la posicion 0 no ve un BOM pegado en medio

**La cuarta vez que sale un BOM, y esta vez por una via que mis propios controles
no cubrian.** `write_file` en Windows escribe **UTF-8 con BOM**, y el archivo
`_new262.txt` lo trae al principio. Yo lo pegue con un splice en la **linea 262**,
o sea el BOM quedo **en la mitad del archivo**.

Mi chequeo de la leccion anterior era:

    s.charCodeAt(0) === 0xFEFF

que mira **solo el primer caracter**. Con el BOM en la linea 262, `charCodeAt(0)`
da `45` (la `-`) y el chequeo dice "no hay BOM": **verde sobre un archivo
contaminado.** El archivo estaba sano salvo por esa linea, y el unico sintoma
visible era que el regex de verificacion de la fila no matcheaba — o sea, el
sintoma se manifesto en un control **distinto** del que se buscaba.

**REGLA (corrige la anterior, no la reemplaza):**

> **El chequeo de BOM es `linea.replace(/\uFEFF/g, '')` sobre TODO el archivo, no
> `charCodeAt(0)`.** El BOM no tiene por que estar en la posicion 0: aparece
> wherever un `write_file` se pegue dentro de otro archivo.

Ejecutado antes de cada commit, junto con el detector de CJK
(`/[\u3000-\u9fff]/`), que esta vez **si** atrapo uno — mio, en un `console.log`
de diagnostico. **Es el cuarto ciclo seguido con ideogramas colados**, y sigue
siendo un defecto compartido del tooling, no de uno: el PO lo reporto en su
ronda 38 y el Documentador tambien.

## Pendiente

1. **T12-b: codigo.** La decision de alcance esta tomada y medida; falta el
   commit con las 3 condiciones y su test (fase roja contra el archivo sin tocar).
   Toca el ciclo `ensurePanelContent -> wireViewToggle -> setActiveView ->
   refresh -> loadRaidData`, que ya rompio una vez (HB#101): **primero del
   proximo ciclo.**
2. **ALERT-41** — la unica llamada que Pablo tiene que hacer con su token real.
   Si el endpoint trae ids utilizables, se arregla; si no, **se borra el modulo**.
   Decision de Pablo.
3. **`.Route`: 8 declaraciones, 0 lectores.** Muerto, y revisitarlo es trabajo
   tirado salvo que alguien diga para que existe.
4. Consultas vencidas al Reviewer (ALERT-188): su heartbeat sigue apagado **por
   diseno**; la verificacion de crons la hace el Arquitecto.

## Alertas

- **ALERT-196 (nueva):** el detector de BOM por `charCodeAt(0)` no ve un BOM
  pegado en medio del archivo. Verde sobre archivo contaminado.
- **ALERT-195:** un `.md` truncado a 0 bytes es invisible para `git status`.
  Vigente: el control es el **tamano en disco**, no el status.
- **ALERT-188:** consultas al Reviewer vencidas. Su heartbeat apagado por diseno.
- **ALERT-41:** el Strike Tracker no puede marcar nada. Bloqueado por token real.
- **ALERT-193/194b:** logs prependeados overwritten. El control es el tamano del
  blob, no el diff.