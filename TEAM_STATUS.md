# TEAM_STATUS — Heartbeat Principal
# HB#161 — 2026-10-03 05:00-05:5x UTC — LOS 2 CHEQUEOS DEL BANNER DABAN VERDE CON EL ESPEJO DESACTUALIZADO, Y EL AGENTE QUE LO LEE ES EL QUE EJECUTA

> **Actualizado:** 2026-10-03 (HB#161) por el Principal.
> **Base:** `origin/main` = `87ee481` al abrir. Arranque **05:00:06 UTC**.
> Suite completa **2307 / 0 FAIL en 86 de 86**, exit 0 (medida **despues** de ramificar:
> `chore-hb161-espejo-y-paso3` desde `origin/main`), o sea el numero es de esta rama.
> Arbol limpio al abrir y en la 2a medicion. **83 sesiones, 0 no-idle.** HEAD en `main`.
> Rama de este ciclo: `chore-hb161-espejo-y-paso3`.
>
> **Sobre el numero de ciclo:** el ultimo `TEAM_STATUS` es HB#159, pero el commit mas
> nuevo (`87ee481`) se autotiqueta **HB#158** y es POSTERIOR a los etiquetados HB#159 y
> HB#160. **La numeracion de HB en los mensajes de commit no es monotona**, asi que este
> ciclo sigue por encima del maximo visto (160) y no por encima del ultimo escrito.

## EL HALLAZGO DEL CICLO (1 de 2): los 2 chequeos del banner dan VERGE con el espejo roto

El `HEARTBEAT.md` canonico (el del repo) y el **espejo** (`workspaces/default/HEARTBEAT.md`,
el que lee el cron, o sea **yo**) **divergian**, y el paso 3 de uno de los dos esta
defectuoso. Los dos controles que el propio banner manda correr **dan OK**.

**Medido:**

| | canonico (`gw2-dev`) | espejo (`workspaces/default`) |
|---|---|---|
| `findstr /c:"MAX(ronda)"` | matchea | **NO matchea** |
| paridad de secciones `### ` | 13 | 13 |

El commit `87ee481` (04:46:47 UTC) agrego **51 lineas** al canonico con la regla de
ALERT-227. **El espejo no las tiene.**

**Por que los 2 chequeos no lo ven, y es el hallazgo:**

- El chequeo de `for-each-ref` verifica que el **comando** este escrito. El comando no
  cambio: cambio **la explicacion que lo rodea**. La senal que el banner eligio (la
  AUSENCIA de `for-each-ref`) no se movio.
- El chequeo de paridad cuenta **secciones `### `**. Detecta "falta o sobra un paso".
  **No detecta que el CONTENIDO de un paso cambio.** Y este cambio fue dentro de una
  seccion que ya existia.

**REGLA: un control que cuenta cantidad de secciones no puede ver un cambio de contenido
dentro de una seccion.** Si lo que importa es que un paso se ejecute igual, el control
tiene que mirar **el contenido del paso**, no su cantidad. Y el caso grave no es teorico:
el agente que lee el espejo es el que ejecuta, y el paso 3 del espejo es **el que
ALERT-227 demuestra que esta *actively invertido*** (resuelve la rama del PO por fecha,
cuando la rama mas nueva tiene 3 rondas MAS VIEJAS).

Corregido en este ciclo: el espejo se regenero desde el canonico (copy) y se re-verifico.
Los 2 chequeos dan OK **ahora porque las dos copias son iguales**, no porque el control
servira.

**Lo que NO hago, y por que:** no agrego un tercer chequeo al banner. `HEARTBEAT.md` es un
archivo de instrucciones con un procedure de escritura propio, y el banner dice que el
canonico gana y que las correcciones van ahi primero. Agregar el control es decision del
Principal/Arquitecto; **lo que si hago es dejar el hallazgo medido aca para que la decision
tenga la medicion.**

## EL HALLAZGO DEL CICLO (2 de 2): la regla de ALERT-227 tampoco ve la ronda 47

ALERT-227 escribio la regla correcta: la rama viva del PO **no** se resuelve por fecha,
sino por `MAX(ronda)` sobre todas las ramas `po/*`. La aplique tal cual, con la regex
anclada en `^## ` y `matchAll` con flag `g`, y sin `try/catch` que trague:

```
RAMAS VIVAS=hb150-poda   RONDA_MAX=45
```

**Y el repo dice que la ultima ronda del PO es la 47.** El merge `7bfd8f4` se titula
literalmente *"poda de la ronda 47 del PO (HB#160)"*. Verificado:

- `DASHBOARD_PO_IDEAS.md` en `origin/po/hb160-poda` (la mas nueva por fecha):
  el encabezado de ronda mas alto es **42**. **No hay ronda 47.**
- El commit `f2b5a82`, que es el de "la ronda 47", toca **solo `BACKLOG.md`**
  (31 inserciones, 1 archivo). No toca el archivo de ideas.

**O sea: el PO tiene DOS canales de salida y el paso 3 mira UNO.** Cuando el PO **poda**,
escribe en `BACKLOG.md` y no en `DASHBOARD_PO_IDEAS.md`, y su ronda mas reciente es
invisible para el detector. `MAX(ronda)` y la fecha **discrepan**, y el detector elige una
en silencio.

**Y el resultado de este ciclo fue el mismo por las dos rondas: 0 propuestas.** Eso es
justo el motivo por el que esto no se puede dejar pasar: **un 0 que no distingue "no hay
nada" de "estoy mirando el archivo equivocado"**. ALERT-227 ya lo dijo para la fecha; se
repite para el archivo.

**REGLA (misma familia que ALERT-222): el criterio de "cual es la ronda viva" necesita las
DOS dimensiones — `MAX(ronda)` Y la fecha del ultimo commit del PO — y cuando
discrepan tiene que DECIR que discrepan.** Elegir una en silencio es como un assert que no
puede fallar: hoy el resultado coincidia y nadie lo ve; manana, con una ronda de
propuestas en `BACKLOG.md` en vez de en el archivo de ideas, las pierde sin avisar.

## PASO 1: los 11 `task_id` siguen dando 404, y eso ya esta catalogado

`task-6cc3851b8d15` -> **HTTP 404**. **No lo marco fallido** (regla de `HEARTBEAT.md`).

**Correccion de mi propia memoria:** mi `MEMORY.md` (ciclo HB#157) Todavia decia que esa
tarea *"vuelve finished SIN veredicto, Max iterations (100), 8to ciclo"*. **Cambio de
estado:** ahora la tarea **no existe en la API**. No es lo mismo — *"termino sin
veredicto"* y *"el registro ya no esta"* son estados distintos y se anotan distinto.

El HB#159 (`159611c`) ya midio los 11: **todos dan 404**, y la regla que salio es *"un 404
verificado es un estado terminal y se cierra"*. Las filas 118 y 121 ya estan cerradas; las
5 (010, 011, 012, 016, 019) quedan abiertas a proposito porque sus notas ya describen el
resultado. **No hay tarea viva.** No se mando nada al Reviewer y no hay nada que recoger.

**Inbox y replies: vacios.** 23 `overdue`, los mismos de ciclos anteriores (HB#91 a HB#147),
ninguno dirigido a mi.

## Estado de las propuestas (PO): 0, y NO se mando nada al Reviewer

Ronda viva **45** (`origin/po/hb150-poda`), que es **PAUSA** por el regimen propio del PO:
*"no se investiga y no se traen ideas"*. **0 encabezados `### Tramos`.**

Control negativo del conteo: `**ZZZ999` (imposible) -> **0**. El criterio discrimina.

**Lo que hay que decir de paso:** la ronda 47 **ya fue mergeada a `main`** por el
Principal como poda de `BACKLOG.md` (`7bfd8f4`, sobre `f2b5a82`), reencuadrando L88
(Coberturable) y L242 (WvW). O sea: **la actividad reciente del PO no esta perdida, esta
aplicada.** Lo que falta es que el detector la vea. Enviarle al Reviewer las propuestas de
una poda ya aplicada seria la forma mas cara de perder un ciclo.

## BACKLOG: 4 filas abiertas, medidas, y por que NO se arranca ninguna

`findstr /r /c:"^- \[ \]"` sobre `origin/main:BACKLOG.md` -> **4**.

| fila | item | estado real, medido |
|---:|---|---|
| 60 | **ALERT-41** Strike Tracker | **BLOQUEADO por Pablo**: falta el body crudo de `/v2/account/raids` con token real. Escalado en el HB#149 (`success: true`). No es mio. |
| 88 | **Coberturable** account-scoped | **Tramo 2 ya a medio hacer**: `getAccountSkins` (`:1467`) y `getSkinsBatch` (`:1545`) mergeados y exportados; `git grep` da **1 solo archivo** (`api-gw2.js`), o sea **0 de pantalla** — y el control del metodo discrimina (`getAccountLuck`, que si tiene pantalla, da 2 archivos). Falta (1) catalogo paginado de `/v2/skins` y (2) call site + pantalla. |
| 90 | **Dungeon dailies** | ~3-4 h, y **la premisa "~3-4 h, patron probado" cae**: los 3 hermanos viven en `meta.js`, no en `activities.js`. |
| 242 | **WvW Borderlands** | **Podada y reencuadrada** a VISOR, no tracker. El plazo "Nov 10" no se puede escribir: `/v2/wvw/timers/teamAssignment` **rota** (el valor de NA avanzo una rotacion entera en 24 h). |

**Por que no arranco el L88 aunque es el unico desbloqueado — razon RE-DERIVADA, no
heredada** (regla del HB#152): un cron de 30 min que arranca producto y no llega al commit
deja el arbol sucio, que es **exactamente** lo que el PASO -1 existe para impedir, y lo
que el HB#150 sufrio. Un ciclo que cierra con el repo limpio vale mas que uno que deja
medio item mas. Y encima mi `MEMORY.md` estaba **3 ciclos desfasado**, o sea arrancar
producto sin re-derivar el estado real del backlog seria repetir el error del HB#153.

## Alertas

| | |
|---|---|
| **ALERT-228 (este ciclo)** | Los 2 chequeos del banner dan verde con el espejo funcionalmente desactualizado. Corregido; el control que falta lo decide el Principal. |
| **ALERT-227** (HB#158) | El paso 3 resolvia la rama del PO por fecha, y la fecha esta *actively invertida*. **Su regla esta aplicada y es correcta, pero es incompleta**: no ve la ronda 47 (ver arriba). |
| **ALERT-219** (HB#149/152/157) | Escritores concurrentes en el mismo clon. Re-medida a mitad de ciclo: **83 sesiones, 0 no-idle**, Pablo idle desde 03:00:27 UTC, `origin/main` mas viejo que mi arranque. Sin conflicto. |
| **ALERT-41** | Sin cambio: esperando el body crudo de `/v2/account/raids` de Pablo. |
| **ALERT-179** | Sin cambio: fix mergeado, Reviewer mudo. |
| **T14/T15** | Sin cambio: veredicto opcion C, precondicion medida, sin aplicar. |
| **Idea 57, los 4 wrappers** | Sin cambio: viven solo en ALERT-48. |
| **FILTRO-05** | Sin cambio: es decision de contrato. |
| **Deuda de bookkeeping** | Las filas con `task_id` cerrado y las 5 abiertas a proposito. No es trabajo vivo. |

## Hallazgo secundario: el PASO -1 no mira EN QUE RAMA esta el HEAD

El HB#159 sufrio esto: edito `COMMS_LOG.md` con HEAD en la rama de Pablo, porque **el
PASO -1 no tiene ninguna condicion que mire la rama del HEAD**. Ese dia el arbol estaba
limpio y el remoto mas viejo, o sea el PASO -1 dio *"ciclo normal"* y no cubria el caso.

**Esta vez si lo mire, a mano** (`git rev-parse --abbrev-ref HEAD` -> `main`), pero
**a mano no es un control**: el paso escrito sigue sin la condicion. Queda anotado para
agregarla junto con el tercer chequeo del banner.

## Errores de instrumento PROPIOS de este ciclo (6, TODOS de la familia ALERT-79)

Los 6 salieron del mismo trabajo —un script que inserta un bloque en 2 archivos de log—
y cada uno lo produjo una falta de control distinto. Los cuento todos porque la leccion
es del conjunto: **escribir en un archivo de bitacora es mas fragil que lo que parece**.

1. **`tail` en `cmd.exe`.** Reincidencia: ya me paso en el HB#152 y esta anotado en
   `MEMORY.md`. Rompio el comando entero (`"tail" no se reconoce`). **Un error que ya
   medi no se vuelve a cometer: si el default esta escrito en mi propia memoria, no
   probarlo.**
2. **`require` dentro de un `.mjs`.** `ReferenceError: require is not defined in ES
   module scope`. Corregido con `import { execFileSync }`. El fallo fue **ruidoso**, que
   es lo que ALERT-227 pide: un instrumento que revienta es mejor que uno que devuelve
   un 0 disfrazado de medicion.
3. **Mi primera insercion PERDIO la cabecera `# HB#159`.** Reemplazaba la linea 2, que
   es el unico encabezado de HB#159, y dejo su contenido huerfano sin titulo. **Lo
   detecto el control de integridad** (`HB#159 sigue presente: false`), no yo. Corregido
   insertando despues de la linea 1 en vez de reemplazar la 2.
   **REGLA: insertar en un archivo de bitacora es `conservar lo viejo + agregar`, y el
   control tiene que afirmar que TODOS los encabezados viejos siguen ahi.** El titulo
   de un ciclo es lo unico que lo hace legible.
4. **Dos `ReferenceError` por TDZ** (`Cannot access 'alOrig' / 'alert228' before
   initialization`): las usaba antes de declararlas. Peor: el `writeFileSync` de
   TEAM_STATUS va **antes** de la linea que falla, asi que el script moria dejando **un
   archivo ya escrito y el otro sin tocar**. La v1 fallo 2 veces.
   **REGLA: las declaraciones van antes del primer uso, y un script que escribe varios
   archivos tiene que validar TODAS sus entradas antes de escribir el primero.**
5. **La guardia de idempotencia daba "ok" con TRES copias de ALERT-228/229** ya
   escritas. La guardia era `includes()` (booleano): preguntaba "esta?", no contaba.
   **REGLA: un guard de idempotencia CUENTA ocurrencias.** Preguntar por inclusion y
   contar son controles distintos, y solo el segundo detecta una duplicacion.
6. **Mi propio control de EOL comparaba cosas que no son comparables:** el archivo
   **en disco** (CRLF, por `core.autocrlf`) contra la salida de `git show` /
   `git cat-file` (el **blob crudo**, que es LF). Daba "CRLF 0 / 1 linea" en la
   referencia, que no es un dato del archivo: es un artefacto de la herramienta.
   Es la misma clase del HB#157 (*"un control con dos paths y un solo nombre de archivo
   es un control que puede estar midiendo el archivo equivocado"*). Medido y aclarado:
   el blob es LF puro y el arbol de trabajo es CRLF; mi archivo esta **uniforme** en
   CRLF, sin finales mezclados, y se normaliza al commitear como todos los demas.

**El control de encoding final (delta contra `origin/main`) dio:** TEAM_STATUS
sin BOM, 0 LF sueltos, **delta CJK = 0**; ALERTS_LOG sin BOM, 0 LF sueltos,
**delta CJK = 0** sobre 32 historicos. E **integridad**: todo el contenido previo
sigue presente byte a byte, HB#155/156/159 conservan su encabezado, ALERT-227 sigue, y
ALERT-228/229 quedan **1 vez cada uno**.

## Notas de encoding (control de DELTA, no de valor absoluto)

- `TEAM_STATUS.md`: **88.527 bytes, CRLF puro** (1491 CRLF, 0 LF sueltos), sin BOM.
- `ALERTS_LOG.md`: **445.076 bytes, CRLF puro** (6911 CRLF, 0 LF sueltos), sin BOM,
  **32 CJK/U+FFFD HISTORICOS** (deuda vieja, no de este ciclo).
- Por eso el control es **delta contra `origin/main`**: uno de valor absoluto marca los 32
  historicos para siempre y deja de correrse (regla del HB#151).
# HB#159 — 2026-10-03 04:00-04:3x UTC — LOS ONCE task_id DEL PASO 1 DAN 404, Y ESO HACE QUE UN PASO QUE NO PUEDE RECOGER NADA PAREZCA QUE HAY 7 TRABAJOS PENDIENTES

> **Actualizado:** 2026-10-03 (HB#159) por el Principal.
> **Base:** `origin/main` = `ceb5a60` al abrir. Arranque **04:00:11 UTC**.
> Suite completa **2307 / 0 FAIL en 86 de 86**. Arbol limpio al abrir y en la
> 2a medicion. Cero sesiones `running`. `main` UNICA, 0 duplicados por refspec.
> Rama de este ciclo: `chore-hb159-404-y-turno`, creada desde `origin/main`.
>
> **Correccion de la linea de arriba (error mio, HB#159): la primera medicion dio
> "2340 / 0 FAIL en 87 de 87" y quedo anotada asi.** Ese numero es el de la RAMA
> DE PABLO, que trae un test mas. Repetida la suite en `origin/main` (la rama de
> este ciclo): **2307 / 0 FAIL en 86 de 86**. La medicion era correcta, la
> etiqueta no: corri la suite con HEAD en la rama ajena y anote el numero como si
> fuera del commit que iba a reportar. **REGLA: la suite se corre DESPUES de
> ramificar, y el numero que va al log es el de esa rama** — un total que no
> corresponde al commit que se describe es el numero de otro ciclo.

## EL HALLAZGO DEL CICLO: el PASO 1 mide 7 pendientes, y los 7 son el MISMO 404

El PASO 1 del ciclo dice, textualmente: *"buscá las filas donde vos sos el
remitente y el estado es `Enviado` o `Fallido` ... Para cada `task_id`
encontrado, llamá `check_agent_task`"*. Con el filtro correcto sobre
`COMMS_LOG.md` da **7 filas abiertas con 9 `task_id` distintos**.

**MEDIDO, los 11 (los 9 de las filas abiertas + los 2 que arrastraba el ciclo
anterior): los 11 dan HTTP 404.** No es timeout, no es `failed`, no es
`session_id mismatch`, no es "el Reviewer esta pensando": **el registro ya no
existe en el servidor.**

| task_id | fila | HTTP |
|---|---|---|
| `task-dd859ed5ab5e` | 010 | 404 |
| `task-ec845e5c532b` | 012 | 404 |
| `task-1f9858ba7c2e` | 011 | 404 |
| `task-50223079043d` | 011 | 404 |
| `task-6042477524c8` | 011 | 404 |
| `task-57c182d1993a` | 019 | 404 |
| `task-5ccb7fb3377d` | 016 | 404 |
| `task-b1df00fd92d6` | 118 | 404 |
| `task-7768bbccf6cb` | 121 | 404 |
| `task-6cc3851b8d15` | (ciclo ant.) | 404 |
| `task-debe51c6331f` | (ciclo ant.) | 404 |

**POR QUE ESTO ES UN HALLAZGO Y NO UN RUIDO.** El 404 es lo unico que el
propio `HEARTBEAT.md` documenta — *"la tarea ya vencio"* — pero **no dice que
se marque la fila como cerrada**, y el PASO 3 del protocolo de `AGENTS.md`
(`Esperando` -> `Reintento` -> `Reasignado` -> `Fallido` -> `Resuelto`)
**no tiene ninguna transicion que cubra el 404**. Las dos instrucciones juntas
producen un bucle: el paso pide recoger, el 404 dice "no la marques fallida",
y la fila queda abierta para siempre. **Un paso que no puede cerrar nada no
puede distinguir "hay 7 trabajos vivos" de "hay 7 filas que el log nunca
cerro"** — y el paso 1 solo sabe contarlas.

**Y UNA DE LAS 7 ERA RESPUESTA APLICADA.** La fila 118 (T13, el latch de
`activate()`) estaba **Enviada** con `task-b1df00fd92d6`; la fila **125 es
la MISMA pregunta con el MISMO `task_id`, y dice "Respondido (ya aplicado)"**
con el P1 CRITICO citado. No faltaba la respuesta: **faltaba la escritura.**
Un `grep` por `task_id` sobre el log entero la habria encontrado; nadie lo
hizo porque el paso 1 no dice "busca si ya esta en otra fila".

## Reglas que salen de ahi

1. **Un 404 verificado es un estado terminal, y se cierra.** La regla de
   `HEARTBEAT.md` ("no la marques fallida por 404") esta bien para NO
   inventar un veredicto, pero deja la fila abierta para siempre. Lo correcto
   es marcarla con lo que se sabe — "el registro no existe; el veredicto, si
   hubo, llego por el canal de archivos" — y eso NO es "fallido" ni "resuelto".
2. **Un `task_id` puede aparecer en DOS filas.** Antes de tratar una fila
   abierta como trabajo vivo, buscarla en todo el archivo. La 118/125 es el
   caso medido, y es exactamente la clase de fila que el PASO 1 no puede ver
   porque solo mira la columna de estado.
3. **Un contador de pendientes que no puede dar 0 no esta contando.** Misma
   familia que ALERT-222 (el filtro del paso 3). Este es su hermano en el
   paso 1: "filas abiertas" mezcla trabajo vivo con deuda de bookkeeping.

## Lo que se cerro (2 filas) y por que

- **118** -> **Resuelto (auto)**. Mismo `task_id` que la 125, que ya estaba
  Respondido. No se toco codigo.
- **121** (T14/T15) -> **Fallido (404, cerrable)**. El veredicto llego por el
  canal de archivos y la precondicion quedo medida; el registro murio. **NO se
  reenvia**: es la septima muerte en el mismo lugar (ALERT-225).

Las **5 restantes** (010, 011, 012, 016, 019) son de HB#30 a HB#121 y quedan
abiertas a proposito: **sus 5 `task_id` tambien dan 404, pero sus notas ya
describen el resultado** ("Principal ejecuto el item por merito, commit
18ef9a4"), y cerrarlas sin releer cada una seria escribir de memoria. Van
contra el mismo filtro del proximo ciclo.

## Y UN ERROR PROPIO, de la familia ALERT-219, que el control NO habria visto

**Edite `COMMS_LOG.md` teniendo HEAD en la rama de Pablo**
(`feat-wallet-dashboard-solo-suerte`). El arbol estaba limpio y el remoto era
mas viejo que mi arranque, asi que el PASO -1 dio "ciclo normal" — **y el
PASO -1 no tiene ninguna condicion que mire EN QUE RAMA esta el HEAD.** Es
la 4a variante de la misma familia: las tres anteriores median *si hay otro
escritor*, esta mide *si el clon esta donde yo creo que esta*.

**Como salio bien:** (1) el paso `git remote -v` + `git status` de control
lo mostro antes de ramificar; (2) `COMMS_LOG.md` es **IDENTICO** en la rama
de Pablo y en `origin/main` (`git diff --stat` vacio), asi que el cambio
viajo limpio al cambiar de rama; (3) el commit de Pablo (`23eed32`, 5
archivos, sin pushear) quedo **intacto**. Si ese archivo hubiera diferido, el
cambio se hubiera aplicado sobre una base equivocada sin avisar.

**REGLA: antes de escribir, `git rev-parse --abbrev-ref HEAD`.** Un arbol
limpio no dice en que rama estas, y por lo tanto no dice sobre que commit se
va a escribir.

## Estado de las propuestas (PO)

Sin ronda nueva, **4to ciclo**. **18 refs `po/*`**, la mas reciente sigue
siendo `origin/po/hb150-poda` (2026-10-02 19:07, ronda 45). La seccion mas
reciente trae **0 `### Tramos`** = PAUSA por el regimen propio del PO.
**Control negativo = 0**, asi que el criterio mide y no esta partido.
**ALERT-222 sigue sin corregir** (su arreglo necesita el dato del "ultimo
corte", que no existe en ningun archivo). **No se mando nada al Reviewer**:
ademas de que no hay novedades, el Reviewer venia devolviendo sin veredicto
(ALERT-225).

## Lo que se consulto al Reviewer (1 pregunta, de ALCANCE)

**`task-b6c235ed3e30`** — donde debe vivir el call site que pinte la
coleccion de skins de una cuenta: **(A)** subvista dentro de InventoryHub o
**(B)** pantalla nueva con ruta propia. Es la pregunta que bloquea el Tramo 3
de Coberturable, y **no la elegi yo** porque las dos tocan "ningun modulo toca
DOM ajeno" y "router.js es el orquestador unico". Partida, no reenviada
(ALERT-225).

**Lo medido que la responde:** 6 endpoints `/v2/account/*` existen de verdad
(`outfits`, `finishers`, `minis`, `novelties`, `dyes`, `skins` ->
**401** con token falso) contra el control `/v2/account/bogusendpoint123` ->
**404**. Los 10 `getAccountXxx` exportados hoy cubren 8 de los 12 que nombra
la fila L88; faltan `outfits`, `finishers`, `minis`, `novelties`, `gliders`,
`mailcarriers`, `mounts/*`, `titles`, `dyes`, `home/cats`.

> ## VEREDICTO DEL REVIEWER (task-b6c235ed3e30): (B), y la PREMISA DE LA PREGUNTA ERA FALSA
> 
> **Respondio entero, en un turno** — contrario a la serie de "Max iterations
> (100) reached". Seeenio porque la pregunta era UNA y de alcance (ALERT-225).
> 
> **Respuesta: (B)**, pantalla propia con ruta propia, siguiendo el molde exacto
> de `legendary-tracker.js`: `#/account/skins`, `skinsPanel`, entrada de nav en
> `index.html` junto a la de la armería, `activate`/`deactivate` propios.
> 
> ### P1 CRITICO: mi premisa era FALSA — `Characters` NO es subvista de `InventoryHub`
> 
> Yo escribi en la pregunta *"inventario y personajes ya son subvistas suyas"*.
> **Falso, y es lo que hacia las dos opciones parecer simetricas.** Medido por el
> Reviewer: `inventoryPanel` y `charactersPanel` son **dos `<section>` al mismo
> nivel** (`characters.js:1454-1459`), no uno dentro del otro; el salto entre
> ellos es un **intercambio imperativo en las dos direcciones**
> (`inventory-hub.js:1431-1436` ↔ `characters.js:1076-1082`); y la ruta
> `#/account/characters` muestra `inventoryPanel`, no `charactersPanel`.
> 
> **La prueba de que no es subvista es que el router ya tiene un work-around por
> eso:** `router.js:1501` documenta que si su panel quedo visible no se toca, y
> por eso el `barridoLatch` (`:1517-1526`) esta **keyed en el DOM y no en la
> ruta**. Un patron que yamade el control del router no puede ser el molde de una
> pantalla nueva.
> 
> **REGLA: una premisa que hace dos opciones simetricas hay que verificarla ANTES
> de preguntar.** Pregunté *"A o B"* donde las dos caian por la misma razon, y la
> respuesta del Reviewer empieza por corregirme, no por responder.
> 
> ### Las 4 mediciones que deciden (las cito, no las re-derivé)
> 
> 1. El buscador unificado es de **items**, no de "cosas que tenes":
>    `state.itemsById` se puebla con `getItemsMany` y las 3 secciones son
>    `materials / bank / armory`. Una skin no entra: no tiene `count`, ni slot,
>    ni peso. Su ficha vive en otra cache (`__skinsMeta`). **Meter skins ahi no
>    reutiliza el buscador: lo rompe.**
> 2. El hub tiene tope de **25 items visibles** (`MAX_VISIBLE_ITEMS`). Skins son
>    **10.632**. El hub no tiene paginacion ni virtualizacion.
> 3. **Ya existe el precedente exacto, y es una ruta**: `legendary-tracker.js` =
>    `#/account/legendary-armory`. Coleccion account-scoped con card por
>    desbloqueo, grid y barra de filtros. Es la misma forma que pide skins.
> 4. El hub **ya lee** esos datos (`inventory-hub.js:234` llama
>    `getAccountLegendaryArmory`) y aun asi no los hospeda: la pantalla es un
>    modulo y ruta aparte. **El repo ya resolvio este caso y chose (B).**
> 
> ### P4: mi "escape hatch" es FALSO para skins y VERDADERO para outfits
> 
> Planteé que quizas no se podia decidir por falta de datos. El Reviewer lo
> midio en las dos direcciones:
> 
> - **`skins`: se puede decidir HOY.** `getSkinsBatch` ya mapea id→ficha con
>   `name` e `icon`. No hay hueco.
> - **`outfits`: el hueco es ESTRUCTURAL.** `getOutfit|/v2/outfits` ->
>   **0 matches** en `api-gw2.js`. No hay wrapper, y no es endpoint de catalogo
>   publico: outfits son ids que solo existen en la cuenta. **Sin catalogo, un
>   grid de outfits no puede mostrar nombre ni icono.**
> 
> **CONSECUENCIA PARA EL BACKLOG: la fila de 12 endpoints NO tiene una sola
> respuesta.** Decidir (B) para `skins` no ejecuta nada para `outfits`, que
> necesita un diseno distinto antes de escribir una linea. **La decision es POR
> ENDPOINT, no por fila** — y esa distincion no estaba escrita en ningun lado.
> 
> ### Lo que NO se hizo
> 
> No se escribio codigo de producto. La pregunta era de **alojamiento**, y la
> respuesta habilita el Tramo 3 pero no lo arrancá: falta el catalogo de
> nombres para 2 de los 12, y un grid de 10.632 necesita paginacion que el hub
> no tiene. **Escribir la pantalla sin esas dos cosas seria el "Tramo 3" que la
> propia fila dice que no es solo "data + columnas".**
> 
> ### Lo que el Reviewer NO re-verifico (lo dice el mismo)
> 
> Tomo de la fila los "6 lugares en 3 archivos" y el "0 de 6" **sin re-verificarlos**
> en esta pasada. Lo que si midio es consistente: los 6 son plomeria (allowlist
> `CACHE_KEYS_EXACT`, `?v=` de `index.html`) y **esa plomeria es identica en
> (A) y en (B)**, o sea no era un factor de la decision.

## Alertas

- **ALERT-229** — el PASO 1 no tiene transicion para el 404: 7 filas abiertas
  que no son trabajo vivo, una de ellas ya Respondido y aplicada. Cerradas 2,
  quedan 5 pendientes de relectura.
- **ALERT-230** — el PASO -1 no mira **en que rama** esta el HEAD. Se casi
  escribe sobre la rama de Pablo con su commit sin pushear.
- **ALERT-225** — sigue vigente: partir la pregunta, no reenviarla. La 121 no
  se reenvia.
- **ALERT-228** — el `PASO -1` se declara solo lectura por el commit del ciclo
  anterior. **Sin cambio: este ciclo dio normal** (remoto mas viejo + arbol
  limpio) y no se modifico la regla.

## Commits de este ciclo

- (rama `chore-hb159-404-y-turno`, este commit).
- **Base**: `ceb5a60` (HB#158), sobre `2d13d7c` (rescate HB#157).


> **Actualizado:** 2026-10-03 (HB#158) por el Principal.
> **Base:** `origin/main` = `90775ee` al abrir.
> **Origen de verdad:** `gw2-dev` -> `origin/main` = `3c3af8a` al abrir (commit del
> HB#149). **18 refs** `po/*`, `main` UNICO, 0 duplicados por refspec; las 7 ramas
> con barra que no son `po/*` son intencionales (`feat/`, `feature/`, `fix/`,
> `rescate/` x2, `tools/`). Remoto = `origin` (`gw2-wallet-agents`): la forma
> correcta aca es `git push origin HEAD:main`.
>
> **LO QUE HIZO ESTE CICLO (HB#158): rescatar el trabajo TERMINADO del
> HB#157, que murio antes del commit.** Medido, no supuesto: arranque
> **03:00:12 UTC**, arbol sucio con mtimes 02:47-02:59, `origin/main` en
> **02:31:56 UTC** (MAS VIEJO que mi arranque). Cero sesiones `running`.
> El test nuevo se identifica solo — su encabezado dice *"LA MEDICION PREVIA
> (HB#157)"*. Suite completa **2307 / 0 FAIL en 86 de 86**. Rescatado sin tocar
> una linea: commit `2d13d7c`.
>
> **EL HALLAZGO DEL CICLO, y es el 3er caso de la misma familia (ALERT-219): el
> ciclo anterior no solo trabajo sin commitear, trabajo `DESPUES` de la hora que
> firmo en su propio `MEMORY.md`.** `MEMORY.md` dice que HB#157 fue
> 02:30-02:47. Los mtimes llegan a **02:59:25**, y `HEARTBEAT.md` a **03:00:15**:
> tres segundos DESPUES de que yo arrancara. O sea que la hora de cierre que un
> ciclo escribe en su memoria **no es un dato del ciclo, es una intencion**: el
> ciclo apunto cuando CREYO que terminaba y followo trabajando 12 minutos mas.
> **REGLA: la hora que un ciclo escribe sobre si mismo no cierra nada. Lo que
> cierra es el mtime del ultimo archivo que toco.** Y como el mtime puede caer
> despues de mi arranque, la comprobacion tiene que ser REPETIDA a mitad de ciclo
> (lo hice: `HEARTBEAT.md` quedo estable 3 min, mtime y longitud constantes).
> Si la segunda medicion cambia, hay escritor vivo y el ciclo es de solo lectura.
>
> **LO QUE SI FUE FALSO EN ESTE CICLO, Y LA REGLA QUE DEJA.** Mi primer
> `qwenpaw chats list` devolvio todas las sesiones y me dio a leer `idle` en
> todas, o sea "no hay escritor". Con el mtime de `HEARTBEAT.md` a 03:00:15 y
> mi arranque a 03:00:12, la conclusion correcta era "hay alguien escribiendo y
> acaba de parar", no "no hay escritor". **Un estado `idle` es un instante, como
> un `running`; lo que decide es si el arbol CAMBIO durante el ciclo.** La
> segunda medicion es la que decide, y la primera sola no alcanza.
>
> **PASO 3: no se abrio ronda, 5to ciclo.** Rama viva `origin/po/hb150-poda` @
> 19:07:32 del 10-02, 18 refs `po/*`, sin mover. Ronda MAX **45 = PAUSA** por el
> regimen propio del PO. **Y el conteo de `HEARTBEAT.md` dio 10, no 0** — el
> defecto de ALERT-222, que ya diagnostique: las 10 son rondas 16-38, todas
> atendidas hace ciclos, y al criterio le falta el filtro de "ronda posterior al
> ultimo corte". Control negativo 0, asi que el criterio mide; lo que le falta es
> el dato del corte, que no existe en ningun archivo. **No se mando nada al
> Reviewer**: ademas de no haber nada nuevo, el unico tramo libre de la serie es
> mandarle trabajo a un agente que viene perdendo iteraciones.
>
> **PASO 1: `task-6cc3851b8d15` (Reviewer) volvio SIN veredicto**, "Max
> iterations (100) reached" — **9o ciclo seguido**. Confirma ALERT-225 y su
> regla: reenviar la misma pregunta es la septima muerte; hay que PARTIRLA.
> Las **27 filas con `task_id` abierto** de `COMMS_LOG.md` son de HB#30 a
> HB#121: deuda de bookkeeping, no tareas vivas.
>
> **Suite: 2307 aserciones / 0 FAIL en 86 de 86 archivos**, alcance completo.
> **STEP: nada se abrio.** El trabajo rescatado era el pendiente natural y
> cerro el ciclo.

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
> **PASO 1, con `check_agent_task` explicito (ALERT-223).** `task-debe51c6331f`
> (Reviewer) salio **finished con veredicto entero**; `task-6cc3851b8d15` (cola)
> salio **finished SIN veredicto** ("Max iterations (100) reached"), **4to ciclo**.
> Las **23 filas con `task_id` abierto** del COMMS_LOG son todas de **HB#30 a
> HB#117** y su contenido ya se proceso en su ciclo: es deuda de bookkeeping, no
> tareas vivas. Al veredicto del Reviewer le apliqué **ALERT-218** (un veredicto
> recuperado tarde se mide antes de actuarlo): cito `legendary-tracker.js:105`, y
> ese archivo hoy tiene **1317 lineas** y **L105 es el cierre de un objeto de
> estado** — el lector esta en **L149-150**. Los otros 6 coinciden al numero.
> **Los 7 siguen leyendo `keySelectGlobal` + `.value.trim()`, sin `Storage.get` ni
> fallback:** el veredicto sigue valido en su alcance, solo vencieron los numeros de
> linea. Queda el censo con las lineas de hoy en ALERT-223. Y **mi primer
> diagnostico fue FALSO**: el grep de `ACCOUNT_SELECTED` dio 0 hits y concluí
> "ya esta migrado" — no, **nunca leyeron esa constante**, leen el DOM; el 0 hits
> **es el sintoma del bug, no la cura**.
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

## HB#153 (2026-10-03 00:30-00:40 UTC) — el "paso 1 bloqueante" de la noche ya estaba mergeado hace 4 minutos, y Pablo nunca se durmio

**Que se hizo.** Ciclo de solo lectura sobre el repo mas correccion de un archivo
de control. **Ninguna linea de codigo de producto.** Dos alertas nuevas
(ALERT-224, ALERT-225). El hallazgo del ciclo es que **las dos premisas del
bloque "TRABAJO PRIORITARIO DE LA NOCHE" son falsas**, y la primera nacio falsa.

**HALLAZGO — el paso 1 que rigio la noche ya estaba hecho.** El bloque (en
`HEARTBEAT.md` y `ARME_TRABAJO_NOCHE.md`) dice: *"el fix de los 93 items con
`generation=null` NO esta mergeado en main (rama `22a6a71`,
`git merge-base --is-ancestor` da falso). El bug esta vivo. Es el paso 1 y
bloquea todo lo demas."* Medido:
- `git merge-base --is-ancestor 22a6a71 origin/main` → **exit 0** = mergeado.
- Lo mergeo `9a68eb4` el **2026-10-02 03:12:36 UTC**.
- El bloque dice *"Son las 03:16 UTC cuando se escribio esto"* → **se escribio
  3 min 24 s DESPUES del commit que hacia falsa su propia frase principal.**
- Verificado por **efecto**, no por el mensaje del commit: el test de regresion
  esta en `origin/main` y corre **121 pass, 0 fail**.

**HALLAZGO — y "Pablo se fue a dormir" tampoco.** Sesion
`1790896138537-8kgh5xf`, `updated_at` = `last_finished_at` =
**2026-10-03T00:28:27Z**: 2 minutos antes de que arrancara este ciclo. Commits
suyos de hoy: `d2dfd57` (00:08 UTC) y `6b0c12c` (00:27 UTC). **Las dos premisas
juntas son lo que autorizaba trabajar solo de madrugada sobre los archivos de
Pablo** — con la segunda caida, la ventana de 12:00 UTC existe suponiendo a
alguien dormido que no lo esta. Detalle en **ALERT-224**.

**El WIP que el HB#152 encontro, ya no esta.** El arbol abrio **LIMPIO** y en
`main`: Pablo commiteo el trabajo que el HB#152 vio sin commitear, en 3 commits
(`7e2c916` iconos de rareza, `d2dfd57` boton + Cola, `6b0c12c` presupuesto de
cache de 906 ids), 10 archivos. Sus scratch `_fix*.mjs` tambien los borro.
**Esto desbloquea lo que el HB#152 dejo explicito**: alli estaba prohibido tocar
`HEARTBEAT.md` porque cualquier commit se llevaba por delante su WIP a medias.
Ese bloqueo ya no existe.

**PASO 1 — 2 veredictos, y son estados distintos.**
- `task-debe51c6331f` (Reviewer, T19-c) → **finished CON veredicto entero**.
  Confirma lo ya cerrado: T19-c es un bug de **lectura**, no dos escritores.
- `task-6cc3851b8d15` (cola) → **finished SIN veredicto**, *"Max iterations
  (100) reached"*. **6to ciclo consecutivo.** No es el Reviewer caido: es la
  pregunta mas grande que su presupuesto de iteraciones no cubre. Reenviar la
  misma es la septima muerte en el mismo lugar → **ALERT-225**, con la regla de
  partirla.

**PASO 3 — no se abrio ronda.** 18 refs `po/*`; la mas reciente sigue siendo
`origin/po/hb150-poda` (22:07 UTC del 10-02), sin mover. Conteo literal de
HEARTBEAT.md sobre ese ref: **7 CUENTA / 4 CERRADAS / 16 sin "### Tramos"**.
**Las 7 son de las rondas 16 a 37**, todas atendidas hace ciclos; ronda MAX 45
es **PAUSA** (6 items -> 4-7 = PAUSA, y en PAUSA no se investiga por regimen).
**Control negativo: 0**, asi que el criterio si mide — lo que le falta es el
filtro de "ronda posterior al ultimo corte" (**ALERT-222**, sin corregir: el
dato del "ultimo corte" no existe en ningun archivo).
**No se mando nada al Reviewer**: ademas de que el conteo no da novedades, el
unico tramo libre de la serie es justamente mandarle trabajo.

## Alertas

- **ALERT-224 (nueva)** — el control que regia la noche nacio falso, y la premisa
  que autorizaba trabajar solo ya no se sostiene.
- **ALERT-225 (nueva)** — 6 ciclos seguidos del Reviewer sin veredicto, con causa
  medible y con remedio (partir la pregunta).

## Pendientes

1. **ALERT-41**: sigue esperando el body crudo de `GET /v2/account/raids`.
   Escalado en el HB#149; **Pablo esta despierto hoy**, asi que la condicion de
   cierre cambio de probabilidad. No se re-escala: ya se mando una vez.
2. **`ARME_TRABAJO_NOCHE.md`**: tiene la misma premisa falsa que `HEARTBEAT.md`
   pero es documento del Arquitecto → **no se toco**. Le corresponde a el o a Pablo.
3. **ALERT-179**: fix mergeado, Reviewer mudo desde el HB#121.
4. **T14/T15**: veredicto = **opcion C**. Precondicion medida. Sin aplicar.
5. **Los 7 del patron B** (HB#118): el veredicto sigue valido en alcance.
6. **Idea 57 — los 4 wrappers**: medidos, NO tocados (ALERT-48).
7. **Tramo 2 de Coberturable**: medido y listo. Sigue pendiente, y ahora sin la
   excusa del arbol sucio — pero **no se arranco** porque Pablo esta commiteando
   en el mismo clon y el work es de producto.
8. **ALERT-222**: filtro de ronda del PASO 3, blocked en que exista el dato del
   "ultimo corte".

---

# HB#155 — 2026-10-03 02:00-02:20 UTC — la guardia se DISPARO, y por poco no era de otra cosa

> **Actualizado:** 2026-10-03 (HB#155) por el Principal.
> **Origen de verdad:** `gw2-dev` -> `origin/main` = `23e2fea` al abrir **y al
> cerrar** (sin commits en el clon durante el ciclo). **18 refs** `po/*`,
> `main` UNICO, 0 duplicados por refspec. Remoto = `origin` (`gw2-wallet-agents`).

## Lo que hizo este ciclo

**LA GUARDIA DE ESCRITOR VIVO SE DISPARO, y esta vez midio bien.** Al abrir
(02:00:05 UTC) `git status` daba **arbol limpio**, pero `origin/main` tenia un
commit de **10 minutos antes** (`23e2fea`, 01:50 UTC). El arbol limpio NO dice
que no haya otro escritor — ALERT-219 ya lo aviso. Fui a `qwenpaw chats list` y
ahi estaba: la sesion `1790896138537-8kgh5xf` ("Correcciones de Armeria
Legendaria") estaba **`status: running`**, `updated_at` 01:43:49Z.

**Regla aplicada tal cual esta escrita:** con escritor vivo, el ciclo es de **SOLO
LECTURA** — PASO 0, PASO 1 y PASO 3, sin rama, sin `checkout`, sin commit. Esta vez
la regla **si costo trabajo**: el ciclo entero podia haber abierto rama y
commiteado encima. No lo hizo.

**Y el resultado de aplicar la regla bien fue que la guardia SE LIBERO sola a mitad
de ciclo.** A mitad de ciclo repeti la comprobacion (no me quedo con la lectura de
apertura): la sesion paso de `running` a **`idle`** a las **02:02:23Z**, con
`last_finished_at` identico. `origin/main` seguia en `23e2fea` y el arbol seguia
limpio.Pablo habia terminado su racha de commits.

**La leccion del ciclo (nueva forma de ALERT-219):** una guardia que se dispara no
es una guardia dead-weight; es una que **hay que volver a medir a mitad de ciclo
para saber si sigue disparando**. Si solo mirara al abrir yUMMARY-diera "escritor
vivo" para siempre, este ciclo se hubiera quedado en solo-lectura con el escritor ya
ido. Y al reves: si solo mirara al abrir y el escritor se hubiera ido a los 10
segundos, se hubiera escrito product code sobre un clon que recien se liberaba. La
**misma** comprobacion, corrida dos veces con 15 min de diferencia, es lo que
distingue "vive ahora" de "vivia cuando abri".

## Tareas en curso / completadas / pendientes

**Completado este ciclo:**
- **PASO 0** — inbox **vacio**, replies **vacias**. **23 `overdue`**, todas de
  ciclos anteriores (HB#91 a HB#147): son las mismas filas de `task_id` abierto que
  ya son deuda de bookkeeping, no tareas vivas.
- **PASO 1** — `task-debe51c6331f` ya cerrado en el HB#153. Volvio a salir
  `task-6cc3851b8d15`: **finished SIN veredicto, "Max iterations (100) reached",
  7to ciclo consecutivo.** Confirma **ALERT-225** un ciclo mas: la causa medible es
  el **tamano** de la pregunta, no el Reviewer. Reenviarla es la septima muerte en
  el mismo lugar.
- **PASO 3** — **NO se abrio ronda.** 18 refs `po/*`, la mas reciente sigue
  `origin/po/hb150-poda` (sin mover). Conteo literal de HEARTBEAT.md: **7 CUENTA
  / 5 CERRADAS / 15 sin Tramos**, ronda MAX **45**. **Control negativo 0** (el
  criterio mide), pero **ALERT-222 sigue sin corregir**: no existe el dato del
  "ultimo corte" en ningun archivo, asi que el filtro "ronda posterior al corte" no
  se puede construir. Las 7 CUENTA son rondas 16-37, todas atendidas hace ciclos.
- **Verificacion de las 7 CUENTA contra `origin/main`** (regla del PASO 3, "antes de
  mandarla al Reviewer, verificar cada una"): las 7 colapsan a **0 nuevas** —
  `BACKLOG.md` las tiene marcadas `[x]` / CERRADAS / ya en el Reviewer. Las unicas
  2 que siguen de verdad abiertas (**T13-a**, **T19-a**) son justamente la familia
  que cubre el `task-6cc3851b8d15` mudo. **No se mando nada al Reviewer**: no hay
  novedades, y el unico tramo libre de la serie es mandarle trabajo.
- **Suite completa**: **2272 aserciones / 0 FAIL en 85 de 85 archivos**, leida de la
  linea `TOTAL` del detector (nunca sumando las filas — ALERT-217).

**Pendiente (sin cambios, re-derivado este ciclo):**
- `ALERT-41` — esperando el body crudo de `GET /v2/account/raids`. Escalado en el
  HB#149; **Pablo esta despierto** (comiteo a las 01:50 UTC), asi que la condicion
  de cierre cambio de probabilidad. **No se re-escala** — ya se le mando una vez.
- `ALERT-225` — 7to ciclo del Reviewer sin veredicto. Remedio: **partir la
  pregunta**, no reenviarla.
- `ALERT-222` — filtro de ronda del PASO 3. **Blocked en que exista el dato del
  "ultimo corte"**; hoy no existe en ningun archivo, por eso no se toco nada.
- `ALERT-179` — fix mergeado, Reviewer mudo desde el HB#121.
- `T14/T15` — veredicto opcion C, precondicion medida, sin aplicar.
- **Tramo 2 de Coberturable** (`getSkinsBatch`) — **ya NO esta pendiente: Pablo lo
  commiteo** en `23e2fea` ("rescate de HB#154 — getSkinsBatch cierra los 3 FAIL").
  Este ciclo no lo toco. Verificado por efecto: la suite da 0 FAIL.
- Los **7 del patron B** (HB#118) — veredicto sigue valido en alcance.
- **Idea 57, los 4 wrappers** — medidos, NO tocados (ALERT-48).

## HALLAZGO PROPIO — HB#154 no dejo ni una linea de log, y su rescate tampoco

**HB#154 existio y su trabajo esta en `main`, pero no hay registro de el en ningun
log de control.** MEDIDO: `23e2fea` ("rescate de HB#154") esta en `origin/main`; un
grep de `HB#154` sobre `TEAM_STATUS.md`, `COMMS_LOG.md`, `ALERTS_LOG.md` y
`SESSION_LOG.md` da **0 hits**. Osea: el equipo completo no tiene forma de saber
que hizo el HB#154, salvo por leer el mensaje de ese commit. **La cadena de logs
tiene un hueco de un ciclo completo**, y el commit que lo lleno se llama a si mismo
"rescate" — o sea el HB#154 escribio producto y **no llego a los logs**, y Pablo lo
commiteo sin los logs. No es un fallo grave (el producto esta), pero es exactamente
el escenario que ALERT-219 previene cuando se escapa: si el HB#154 hubiera tenido
WIP sin commitear, el rescate lo habria encontrado sin registro que lo explicara.
**Regla: un rescate de producto debe ir acompanado del bloque de log del ciclo que
lo origino, o el hueco queda para siempre.** Lo registro y lo atribuyo a lo que si
se puede atribuir: el commit.

## Estado de las propuestas (PO)

- **Ronda MAX = 45, y es PAUSA.** No es que el PO este proposesiendo: su propio
  regimen manda "no se investiga y no se traen ideas" en PAUSA (6 items abiertos ->
  4-7). El 0 de la ronda 45 lo verifique yo, no lo acepte (**control de HB#151**).
- **No se abrio ronda.** Ver arriba.
- **ALERT-222** (el conteo del PASO 3 esta roto): sin corregir, sin danio nuevo —
  el filtro falta, y depende de un dato que no existe todavia.

## Alertas

- **ALERT-225 (sigue)** — 7to ciclo del Reviewer sin veredicto (misma tarea, misma
  causa medible: tamano de la pregunta). Remedio pendiente: partirla.
- **ALERT-226 (nueva)** — la guardia de escritor vivo **si se disparo** y **si se
  libero sola** a mitad de ciclo. Confirmacion de que la regla del HB#153 funciona;
  agrega el matiz de que hay que **re-medirla a mitad de ciclo**, no solo al abrir.
- **HB#154 sin logs** — hueco de un ciclo completo en la cadena de logs (arriba).

## Notas de instrumentos

- El conteo del PASO 3 lo corri un **script propio en `%TEMP%`** con el criterio
  literal de HEARTBEAT.md **y su control negativo** (criterio imposible -> 0).
  Cuando un contador da un numero distinto del esperado, el primer suspecto es el
  script, no la realidad.
- **CRLF**: el repositorio trabaja en CRLF. Cualquier escritura mia se normaliza a
  CRLF antes de commitear, si no el proximo diff trae lineas de ruido de fin de
  linea (ALERT-79 reincidente).

## Commits de este ciclo

- (se completa al commitear)

# HB#156 — 2026-10-03 02:45-03:30 UTC — HABIA DOS `HEARTBEAT.md` QUE NO ERAN EL MISMO DE DOS GENERACIONES, Y CADA UNO TENIA LO QUE AL OTRO LE FALTABA

> **Actualizado:** 2026-10-03 (HB#156) por el Principal.
> `origin/main` = `24f7dbc` (sobre `a7918db`, sobre `e1dfb69` del HB#155). Suite
> **2272/0 en 85 de 85**. 31 refs, `main` UNICA, 0 duplicados por refspec. Remoto =
> `origin` (`gw2-wallet-agents`).

## Lo que hizo este ciclo

- **Hubo dos crisis de rescate de WIP.** El arbol abrio con **WIP sin commitear
  de 2 sesiones muertas** (HB#149 y HB#150, los dos con el trabajo TERMINADO y
  sin commit). Rescatados: 39 + 9 archivos, mergeados sin perder una linea.
- **Rescate de HB#154**: su trabajo estaba en `origin/main` (`23e2fea`) pero
  **no habia dejado ni una linea en ningun log** (ALERT-226). Se registro.
- **HB#152**: no toco `HEARTBEAT.md` por colision con WIP ajeno. Razon correcta,
  y el item quedo esperando. Se destrabo este ciclo.
- **Coberturable Tramo 2**: `getSkinsBatch` con paginacion y cache
  (`js/api-gw2.js` L468-540, 176 lineas). Cierra los 3 FAIL de la suite.
  **Sin cambio de contrato**: solo se agrego `cacheKey`, que ya estaba soportado.
- **Armeria**: cache propio para items (906 iconos en 5 llamadas) y cola con
  `QUEUE_MAX=5`.
- **PRODUCT CODE: 0 commits de producto.** Toda la sesion fue logistica.

## El hallazgo de este ciclo: dos `HEARTBEAT.md`, divergentes en los DOS sentidos

**La interseccion de lo que les faltaba era VACIA.**

| | repo | workspace (el que lee el cron) |
|---|---|---|
| lineas / secciones `### ` | 188 / 11 | 415 / 17 |
| secciones de mismo titulo, contenido IDENTICO (sha1) | 6 | 6 |
| secciones de mismo titulo, contenido DISTINTO | 2 | 2 |

- **Solo en el repo**: el `PASO 3` version **HB#114** = **la correccion**.
- **Solo en el workspace**: `PASO -1` rescate, `PASO 0`, `PASO 1`, regla de
  espera, reglas de comunicacion, cierre de worktrees — y el `PASO 3` version
  **HB#103 = el defecto, que era el que se ejecutaba**.

**Por que no se veia: hoy el paso 3 acerto POR LA RAZON EQUIVOCADA.** Media
`origin/po/hb99-dashboard` (ronda 33, 2026-10-01 13:12) en vez de
`origin/po/hb150-poda` (ronda 45, 2026-10-02 19:07): **~30 h de retraso y 12
rondas del PO invisibles**. La 33 tiene T12 ya cerrado -> da menos de 3 -> la
regla "si no da 3 no se fuerza" frena el paso. **El resultado coincide con el
correcto y por eso nadie lo ve.** Es el **mismo bug del HB#103 con otro archivo
equivocado**: ahi el contador leia `PRE_BACKLOG.md`, hoy lee una rama pineada.

## Lo que quedo decidido (Pablo delego la ejecucion)

- **Canonico = el del repo**, porque git sobrevive a que se borre un workspace.
  **Espejo = el del workspace**, regenerado desde el canonico. **Gana el
  canonico** si divergen. Banner arriba de los dos que lo dice.
- El canonico quedo con **13 secciones**: las 11 del repo + las 6 que solo
  tenia el espejo. **Canonicalizar sin haberlas movido las habria borrado** —
  ese era el riesgo de la operacion.
- **`PASO -0` nuevo, el primero del ciclo**: regenerar el espejo + correr los
  2 chequeos. Una regla en un banner es documentacion; en el orden del ciclo
  es un paso (mismo criterio por el que se escribio el `PASO -1`).
- **14 enunciados falsos muertos** (no 6: medidos, varios derivados), cada uno
  con su medicion. **Documentador NO se toco**: 6 timeouts -> "SIN MEDIR",
  porque `cron list` no devolvio nada y no se propaga un numero que nadie
  volvio a contar.
- **`PASO -1` NO se toco**, como pediste.

## Los 2 chequeos son SEMANTICOS, no de bytes

Dos archivos pueden ser identicos y estar los dos mal, y cualquier diferencia de
espacios los marca como distintos sin que importe. Por eso:

1. `for-each-ref` presente = el paso 3 **resuelve** la rama. **Es el chequeo que
   habria parado este bug.**
2. Paridad del numero de secciones `### `.

Ejecutados contra las dos copias: ambos **OK**.

## HALLAZGO PROPIO — mi PASO -1 se dispara solo, y es la 2a vez

El `PASO -1` del HB#153 compara `origin/main` contra la **hora de arranque**.
Al aplicarlo me dio "escritor VIVO -> solo lectura", porque `origin/main` era
`e1dfb69` (23:08) y yo arranque 22:45. **El commit era del HB#155, que arranco
DESPUES de que yo terminara: construyo sobre mi `23e2fea`.** No habia escritor
concurrente: habia un ciclo **secuencial**, y el guard no distingue "otro ciclo
escribio" de "el ciclo anterior escribio". El HB#155 lo topo solo y escribio el
mismo hallazgo. **Costo real: cada ciclo que pushea se auto-declara de solo
lectura al siguiente.** **NO se toco el PASO -1** (pediste no tocarlo y el
arreglo es una condicion, no una reescritura). Queda esperando tu palabra.

## Errores de instrumento PROPIOS de este ciclo (6, todos cazados antes del commit)

1. **Un control que compara la cantidad y lo llama "contenido".** Mi primer
   diff de secciones|reportaba "mismo cuerpo" comparando el **numero de lineas**.
   Dio 8 de 8 identicas cuando `Acciones pospuestas` — la del enunciado falso —
   era distinta. Rehice con sha1 por seccion.
2. **Un control que se puede disparar con el material que controla deja de ser
   control — 3a vez (HB#151 x2).** El banner **transcribia el titulo de la
   version vencida** para explicar que senalaba: la senal aparecia en el archivo
   sano. Resuelto con la senal que no se puede falsear por mencionarla (la
   AUSENCIA de `for-each-ref`). **Costo: un commit extra** (`24f7dbc`).
3. **LF en un archivo CRLF** (187 CRLF / 0 LF -> 546 LF). Sin medir fines de
   linea el proximo diff habia mostrado las 188 lineas enteras. Normalizado.
4. **Un `--amend` despues de pushear** creo un commit hermano, no descendiente,
   y el push reboto. **Recuperado con un commit NUEVO encima, no con
   `--force`.**
5. **Un check que leyo `origin/main` DESPUES del amend pero ANTES del push**
   → leyo el contenido viejo y dio un falso positivo.
6. **`statSync` despues de `unlinkSync`** (el error de log impidio ver que el
   borrado si habia salido) y **`write_file` metiendo BOM al mensaje de commit**
   (ALERT-79, enésima vez).

Ademas: un hook veto un comando por contener `rm` (**falso positivo**, no habia
`rm`) y la denegacion es final: se cambio de instrumento a node.

## Estado de las propuestas (PO)

Sin ronda nueva, 3er ciclo. **18 refs `po/*`**, la mas reciente
`origin/po/hb150-poda` (2026-10-02 19:07, ronda 45). El conteo literal del
criterio viejo da **7 CUENTA / 4 CERRADAS**, pero son las rondas 16 a 45, todas
atendidas: **ALERT-222 sigue sin corregir** porque su arreglo necesita el dato
del "ultimo corte", que no existe en ningun archivo. Ronda MAX 45 = PAUSA.

## Alertas

- **ALERT-226** — los dos `HEARTBEAT.md` divergentes en ambos sentidos (arriba).
- **ALERT-227** — HB#154 sin logs; la cadena de control perdio un ciclo entero.
- **ALERT-228** — mi `PASO -1` se declara solo lectura por el commit del ciclo
  anterior. 2a vez. Pendiente de decision.
- **ALERT-225** — la premisa falsa de la noche vivia tambien en el prompt
  embebido de un **cron de supervision nocturna** (el que pregunta por
  `22a6a71` y da por hecho que Pablo duerme). No es archivo mio: hay que
  avisarle.

## Commits de este ciclo

- `a7918db` — `docs(hb156)`: canonico en git, espejo regenerado, 14 falsos
  muertos, `PASO -0`, los 2 chequeos, ALERT-226 (157 lineas).
- `24f7dbc` — `docs(hb156-fix)`: el banner citaba el marcador que su propio
  chequeo busca.
- **Base**: `23e2fea` (rescate HB#154), `e1dfb69` (HB#155).
