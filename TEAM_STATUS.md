# TEAM_STATUS - Heartbeat #132 (2026-10-02 11:5x-12:0x UTC)

**Corto:** cierre del plan de noche. **Corte de las 12:00 UTC alcanzado: no se
arranco nada nuevo.** Dos cosas se corrigieron antes de cerrar, y las dos son
del mismo tipo: **un numero que se leia de un lugar que no era el codigo.**

1. **La suite daba 53 archivos en el clon principal y 68 en `origin/main`.** Los
   dos runs en verde, los dos con el mismo runner y el mismo codigo. La razon:
   el working tree del clon principal esta en la rama `docs-hb113-logs`, **19
   commits atras**, y su `index` tiene `api-gw2.js` con el contenido de
   `origin/main` mientras el archivo en disco tiene una version **vieja** que
   perduio el Tramo E. Verificado por hash: **`index` == `origin/main`, disco !=
   ambos.** Un runner que recorre `tests/` sobre ese disco mide un repo que no
   existe.
2. **`TEAM_STATUS.md` estaba 19 heartbeats atras y `SESSION_LOG.md` 42.** No es
   un forgetting: los ultimos ciclos escribieron solo `COMMS_LOG.md`.

## Tareas en curso

| Quien | Que | Estado |
|---|---|---|
| **Code-Reviewer** | T12-b (alcance) | **Veredicto leido y Decision tomada** (HB#131). **Sin nada en vuelo ahora.** |
| **PO** | Ronda 42 | **Sin novedades.** La rama `po/hb99-dashboard` no se movio: sigue en `4fe6162` (ronda 33). |
| **Documentador** | - | Sin tarea (regla de no-fallback vigente). |
| **Pablo** | ALERT-41 | **BLOQUEADO**, unico item que necesita un token real suyo. |

## El numero del paso 3, y por que NO se abrio ronda

Conteo con el criterio del PO (la seccion trae `### Tramos` y ninguna linea
dice `aplicada`/`cerrada`): **4 CUENTA sobre 22 secciones**, control negativo
imposible = 0. Las 4 son **rondas viejas** y **las 4 ya estan aplicadas**,
verificadas una por una contra `origin/main`:

| Ronda | Que | Verificacion |
|---|---|---|
| 33 | T12 | `9c93300` ancestro = **SI** |
| 19 | IDEA 64 | **`NO esta en el BACKLOG`** (ver abajo) |
| 16 | IDEA 63 | `eb69fb3` ancestro = **SI** |
| s/f | Idea 50 | `46b2d7f` ancestro = **SI** |

**0 nuevas. No se manda nada al Reviewer.** Mandarle trabajo ya hecho es la
forma mas cara de perder un ciclo, y por eso el conteo se verifica antes de
escalar.

**Una correccion al conteo de los ciclos previos:** HB#131 conto **6 CUENTA
sobre "rondas 16-34"** y verifico 6 una por una. Hoy el mismo archivo da **4**.
La razon es que HB#131 conto sobre un archivo que se leyo con otro criterio, no
que el PO haya hecho marche atras: la rama esta en el **mismo** `4fe6162`. **El
numero de un conteo es una propiedad del SCRIPT que conto, no del archivo que
 conto.** Es la misma clase que el `53` vs `68` de la suite.

## Lo que se detecto y NO se toco: el clon principal esta a medias

`git status` del clon `gw2-dev` (NO el worktree de trabajo): **2 `MM`** y **75
untracked**.

    js/api-gw2.js                     MM
    tests/idea57.forma-contracts.test.js  MM

Medido, no supuesto:

- `HEAD` = `067754f` en la rama `docs-hb113-logs`.
- El **index** de `api-gw2.js` tiene hash **identico a `origin/main`**.
- El **disco** tiene una version distinta, y es la **vieja**: `lsHas` = 3 en
  `origin/main` y en el index, **0 en disco**. `expiredDrops` = 4 / 4 / **0**.

O sea: **el Tramo E (mergeado en `f4e35e4`) esta ausente del archivo en disco.**
Si alguien commitea desde ahi, revierte el fix.

**NO lo toco y NO lo commiteo.** Es el clon que la regla de dos clones declara
"no es un lugar de trabajo", y `docs-hb113-logs` no es un nombre de rama de
trabajo: es un estado de index a medio aplicar. Restaurarlo es una operacion
destructiva sobre trabajo de otro ciclo, y **no hay forma de saber cual de los
dos lados es el que se quiso dejar.**

## Estado de propuestas

**0 al Reviewer.** Sin ronda nueva del PO, y sin nada propio que reportar este
ciclo (cierre de logs, sin codigo de producto).

## Pendiente del proximo ciclo

1. **T12-b: el codigo.** Opcion **(3a)** ya decidida, con **las 3 condiciones en
   un MISMO commit** (sin la 1 es regresion; sin la 3 no cablea). Fase roja +
   las 3 aserciones, y despues suite completa.
2. **El clon principal de `gw2-dev` esta a medias** (arriba). No hacer push
   desde ahi nunca; el worktree `wt-hb132` es el metodo que funciono.
3. **ALERT-41**: la unica llamada que Pablo tiene que hacer con su token real.

---

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
---

# TEAM_STATUS - Heartbeat #133 (2026-10-02 12:30-13:0x UTC)

**Corto:** corte de las 12:00 UTC ya pasado, y el ciclo lo paso completo. En vez
de arrancar el siguiente item del BACKLOG, aparecio esto: **T12-b estaba MUERTO
en `main` desde hacia 26 minutos y enterado nadie.** Arreglado y verificado.

## Tareas en curso

| Quien | Que | Estado |
|-------|-----|--------|
| default | T12-b: escritor comun de la pref Raids/Strikes | **APLICADO** `6e5a60c` (no por mi: cherry-pick de `52ba8c2`, rama del HB#125 sin mergear) |
| default | **ALERT-197: `app.js` se come el escritor de T12-b** | **RESUELTO** `7c4f8d1` (este ciclo) |
| default | BACKLOG, siguiente item | **NO ARRANCADO.** Corte de horario. Ver "Por que no_avance el BACKLOG". |
| Code-Reviewer | veredictos | Operativo. Recogido 1 este ciclo (ver abajo). |
| product-owner | ronda 42 (`po/hb132-poda` @ `9ad2ced`) | **SI se movio** (25 h de silencio era de `po/hb99-dota`, no del PO) |
| documenter | heartbeat 4h | Sin Novedades. No le mande nada (no-fallback vigente). |

## Completadas este ciclo

- **ALERT-197, fixa y con test.** `app.js:1432` hacia `window.__GN__ = { ... }`,
  o sea una reasignacion del objeto entero. Como `app.js` es el script 1034 con
  `defer`, corre AL FINAL y se lleva `__GN__.wireViewTogglePair` que
  `raid-tracker.js:2035` publica en carga. La lectura de `strike-tracker.js:622`
  es de **runtime**, o sea tarde: caia al `else` y logueaba un `console.debug`.
  Fix de 1 linea: `Object.assign(window.__GN__ || {}, {...})`.
  Test nuevo de 17 asertos, **fase roja verificada 15/2**.
  Suite: **70 archivos, 0 caidas, control negativo discrimina.**

## El hallazgo que importa mas que el fix

**El veredicto del Reviewer estaba SIN LEER y el codigo se mergeo DESPUES.**

`task-1f9ee292b9f3` (fila #158) esta `finished` y dice **BLOQUEADO**, con B1
exactamente este defecto. `6e5a60c` se mergeo 26 minutos despues de ese
veredicto. O sea: veredicto escrito, veredicto sin recoger, merge. Es la
**tercera vez en 3 ciclos** (ALERT-127, y las 5 premisas falsas del HB#131).

**La leccion mecanica, y es la que hay que aplicar:** el commit de `6e5a60c` trae
un mensaje de 45 lineas con 6 mediciones y **esta en verde**. Habria que
auditarlo igual, porque verde no es lo mismo que correcto: el runner de suite no
puede ver un problema de orden de carga, y ningun arnes de aserciones lo hace
salvo que ejecute los hooks en orden de documento.

## Alertas

- **ALERT-197 (nueva, resuelta):** el detalle en `ALERTS_LOG.md`. Queda abierto
  el **diseno**: `__GN__` es un namespace con contrato cero y 2 escritores, uno
  desde `raid-tracker.js` y otro desde `app.js`. El fix arregla esta destruccion,
  no el diseno. Mismo agujero que `.Route`, en otra caja. No lo abro aqui.
- **ALERT-198: RETIRADA, era FALSA y la invente yo.** `git worktree list` NO miente: la
  ruta real de `wt-hb132b` es `C:/Mis Archivos/GW2 online/wt-hb132b`, FUERA de
  `gw2-dev`, y yo la lei como si estuviera dentro y la verifique con un
  `if exist` relativo. Medido con `--porcelain`: **75 worktrees, 75 con
  directorio, 0 inexistentes.** Correccion completa al final de `ALERTS_LOG.md`.
  Sin costo: no habia ningun fix de codigo colgado de esta alerta.
- **ALERT-175 (4a vez):** mi fila se numero del MAXIMO real (**160**), no del
  ultimo leido. Y con el control de columnas (**12**, igual que la referencia).
- **BOM (6a vez, y esta vez bien):** `write_file` lo antepone. Lo detecte
  **antes** del commit —que es lo que faltaba en los ciclos anteriores— y lo
  verifique **sobre el commit ya escrito** (`git log -1 --format=%B` = 0).
- **Preservacion de otro agente:** casi borro los 4 BOM y 31 CJK
  preexistentes de `ALERTS_LOG.md` (copie un `.replace(/\uFEFF/g,'')` de mi
  propia memoria sin pensar). Detectado por comparar contra `HEAD`,
  revertido con `git checkout`, rehecho. **4 -> 4, 31 -> 31.** Borrarlos habria
  destruido la evidencia citada en ALERT-122.
- **CJK:** 2 ideogramas en este mismo `TEAM_STATUS.md`, los metio el splice.
  Detectados **antes** del commit. `ALERTS_LOG.md` y `SESSION_LOG.md` conservan
  los suyos.

## Propuestas al Reviewer: 0

**PASO 3 SI se ejecuto, y el conteo dio 7 CUENTA / 2 CERRADAS** sobre 37
secciones, control negativo 0, ronda 42. **Pero no mande ninguna**, por dos
motivos medidos:

1. Las 7 son rondas **16-34**, y el HB#132 ya verifico una por una que 4 estan
   aplicadas. El conteo mide el **texto** de la ronda, no el estado del repo.
2. **La fuente que manda HEARTBEAT.md esta congelada.** Dice leer
   `origin/po/hb99-dashboard:DASHBOARD_PO_IDEAS.md`, y esa rama sigue en
   **ronda 33**. El PO escribe en una rama nueva por ronda; la 42 esta en
   `po/hb132-poda`. Si hubiera obeyedido la instruccion al pie de la letra,
   el conteo de este ciclo habria sido el del HB#118.

**Esa es la accion pendiente real del paso 3:** `HEARTBEAT.md` manda leer una
ref que el PO no toca. Es ALERT-170 de nuevo, ahora en la instruccion misma.

## Por que NO_avance el BACKLOG

El corte era 12:00 UTC y son las 12:30. `HEARTBEAT.md`: "a las 11:30 UTC cerra
lo que tengas con la suite en verde y actualiza TEAM_STATUS.md. No arranques
nada nuevo." Lo que me encontre al abrir el ciclo era una regresion viva en
`main`, y cerrarla es literalmente lo que la regla pide. Lo que **no** hago es
abrir el siguiente item del BACKLOG con el horario vencido.

## Pendiente

1. **`HEARTBEAT.md` paso 3: la ref que manda leer esta congelada.** Decidir si
   se cambia la instruccion o se deja, y por que. Es de Pablo.
2. **52 filas de COMMS_LOG con estado pendiente** (De=default, control negativo
   0). Son casi todas envios viejos por canal de archivos que nunca se
   marcaron. No las toco: cerrarlas en lote seria un conteo sin evidencia.
3. **`__GN__`: el namespace con contrato cero y 2 escritores.** Diseno, no bug.
4. **ALERT-41:** unica llamada que Pablo tiene que hacer con su token real.
5. **El clon principal de `gw2-dev` sigue a medias** (index = `origin/main`,
   disco viejo, un `MM` sin resolver). Decision de Pablo. Este ciclo no lo toco:
   todo se midio en un worktree limpio.
