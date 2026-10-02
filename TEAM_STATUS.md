# TEAM_STATUS - Heartbeat #121 (2026-10-02 04:0x UTC)

**Corto:** el ciclo arranco auditando el trabajo del ciclo anterior y no encontro
`origin/main` donde deberia: **HB#120 commiteo T20-c (`4413c34`) y nunca lo pusheo.**
Antes de empujar lo audite, y el fix estaba bien pero **incompleto**: el codigo nuevo
devuelve `{success:false, cancelled:true}` cuando Pablo dice que no, y **el boton de
`index.html` ignoraba el return**. O sea que Cancelar ponia "Configuracion sincronizada.
Recargando..." y recargaba la pagina: el cartel dizia exactamente lo contrario de lo que
pasaba. Aplicado en `d06c8d7` (5 lineas + test). **Fase roja 5 FAIL contra `origin/main`
-> verde 10/0. Suite 58 archivos exit 0.**

**La premisa que este ciclo desmenti, y la habia escrito yo mismo en el commit anterior:**

> `GistSync` NO esta montado en ningun HTML (medido: `git grep GistSync` = 3 matches, los
> 3 dentro del propio `gist-sync.js`)

**FALSO.** `index.html` tiene **7** referencias, entre ellas el boton `#gistDownloadBtn`
(`:927`) y `window.GistSync.downloadAndSync()` (`:1377`). El grep se corrio sobre `js/` y
no sobre el repo: **el numero de matches que "medi" no era el del archivo que la
afirmacion describe.** Y el error no fue cosmetico -- de ahi salio el bug que arregle,
porque si el boton no estuviera montado no habria quien ignorara el `cancelled`.

**Consecuencia sobre el trabajo pendiente:** el HB#120 dejo "montar
`restoreSafetySnapshot()` en una UI" como pendiente,de  era que no habia pantalla donde
montarlo. **Ese pendiente tiene una pantalla real: la del Gist, en `index.html`.** No se
monta en este ciclo (es trabajo de UI, no un fix de 5 lineas), pero el motivo por el que estaba diferido era falso.

**Por que el fix anterior no se detecto solo:** nadie leyo el return antes de empujar. La
fase roja del HB#120 midio el bloque de `gist-sync.js` y dio verde; el aserto no miraba el
HTML, porque el archivo que se modifico era el `.js`. Un fix puede estar completo en el
archivo que se toco y a medio camino en el que se llamo.

## Tareas en curso

| Quien | Que | Estado |
|---|---|---|
| **Principal** | **T20-c** (`4413c34`) | **PUSHEADO** en este ciclo, junto con `d06c8d7` que completa el llamador. |
| **Principal** | Montar `restoreSafetySnapshot()` en la UI del Gist | **Vivo, y con el motivo corregido** (la pantalla existe: `index.html`). |
| **Reviewer** | **ALERT-179** (`importFromData` duplica `applyImportData`) | **ENVIADO** en este ciclo, canal de archivos, `20261002T030431Z-e6775b`. |
| **Reviewer** | **T19-a** (el listener del InventoryHub) | Sin respuesta. El `check_agent_task` devuelve **404** (tarea vencida), no "timeout". |
| **PO** | T20-b (la direccion: si el remoto es mas viejo, el confirm lo dice) | Propuesta, sin tocar. |
| **Pablo** | Que verdad manda: la URL o la pref | **Bloquea T14-T18.** Sin decision no se tocan. |

## Completadas en este ciclo

| Que | Commit | Pruebas |
|---|---|---|
| Auditar y pushear T20-c, que estaba commiteado sin pushear | `4413c34` | harness T20-c 11/0; suite 58 exit 0 |
| El llamador mira el `cancelled`: Cancelar no dice "sincronizada" ni recarga | `d06c8d7` | fase roja 5 FAIL / verde 10/0 |
| Correccion de la premisa "GistSync no esta en ningun HTML" (7 refs, no 3) | este commit | `git grep` + `findstr` sobre `index.html` |
| ALERT-179 enviada al Reviewer por el canal que llega | `20261002T030431Z-e6775b` | -- |

## Pendientes

- **Montar `restoreSafetySnapshot()` en la UI del Gist.** La foto se guarda pero ningun
  boton la restaura. La pantalla **si** existe (`#gistDownloadBtn` esta en `index.html`);
  el confirm nombra la funcion porque no hay boton todavia.
- **T20-b** y **T19-a** (esta ultima sin respuesta y con la tarea vencida).
- **Los 5 del patron B** (numero corregido en el HB#120).
- **ALERT-179**, esperando veredicto.
- **Las 10 consultas vencidas** del canal de archivos: 8 al Reviewer y 2 al PO. Ninguna
  tiene respuesta. Ver la nota de abajo.

## Alertas nuevas

- **ALERT-184** - la premisa "X no esta montado en ningun HTML / no hay nadie que lo llame"
  se escribio contra un `grep` corrido sobre `js/` y no sobre el repo. El numero de
  matches fue real pero **no era el del archivo nombrado**, y la conclusion se uso para
  diferir trabajo. Regla: **un grep se corre sobre el alcance del archivo que la frase
  nombra**, o la frase dice el alcance.
- **ALERT-185** - un fix en el `.js` estaba a medio camino en el `.html` que lo llama, y la
  fase roja no lo vio porque **solo miraba el archivo que se modifico**. Un camino de
  codigo que cruza archivos se prueba por sus **bordes**, no por el modulo.
- **ALERT-186** - un aserto de texto puede fallar por leer **el comentario que lo
  justifica**: el test buscaba "sincronizada" y la encontraba dentro del comentario del
  propio fix, que explica por que el cartel mintiente es un bug. El codigo estaba bien y el
  aserto dio rojo. Se quitan los comentarios antes de buscar las cadenas.

## Estado de las propuestas del PO

Conteo sobre la **union de las 11 refs `po/*`** (descubiertas con `git ls-remote`, nunca
escritas a mano): **7 CUENTAN / 31 CERRADAS** sobre 38 secciones unicas, con control
negativo en 0.

**La ronda mas nueva del PO es la 38**, y es la que el HB#119 y el HB#120 aplicaron
(T20-a, T20-c). **No hay ronda 39 todavia**, asi que este ciclo no abrio ronda nueva: lo
que estaba vivo era lo que el ciclo anterior dejo a medias. La asertion del arnes que
buscaba "ronda 39|40" da FAIL y es **correcta que falle**: todavia no hay 39. Se deja
dicha en vez de relajarla, porque relajar un aserto porque molesta es como se vuelve
verde una suite que no mide.

Medidas una por una contra `origin/main @ 4974c81`, y el estado real no cambio respecto del
HB#120 salvo por T20:

| Ronda | Propuesta | Estado real |
|---|---|---|
| 33 / 35 | **T12** (toggle Raids/Strikes) | Parcial. La gn: tiene **1 solo escritor** (`raid-tracker.js:1080`). **Vivo:** `setActiveView` no toca `location`/`hash`, la URL no sigue al toggle (T17). Depende de la decision de Pablo. |
| 34 | T13 (el latch) | **APLICADA** (`_watchOtherTabs` en `app.js`) |
| 37 | T19 | **T19-c APLICADA** (HB#118). **T19-a NO aplicada**, por la cadena medida de la fila 143. |
| 38 | T20 | **T20-a APLICADA** (HB#119), **T20-c APLICADA** (HB#120, pusheada en este ciclo). **T20-b** sin tocar. |
| 16 | IDEA 63 | **Parcial**: `characters.js` si; los otros 2 modulos no (es el patron B). |
| 18 | ALERT-84 | **CERRADA** (ALERT-182). |
| - | Idea 50 | **APLICADA** (`cacheClear` en `api-gw2.js`) |

## Comunicaciones: 10 vencidas y ninguna respondida

`cli.py overdue` devuelve **10 consultas vencidas**: 8 al Code-Reviewer y 2 al PO. El
`inbox` esta vacio y `replies` tambien: **nadie contesto ninguna**. Dos filas del HB#120
ya estaban en "Resuelto" sin que haya habido respuesta (la 145 es mia y la redaccion es
mia, no la respuesta del otro).

**Lo que esto significa, sin adornos:** el canal de archivos **esta fallando en silencio**.
`ask` reporta exito, la fila queda "Esperando", y al vencimiento nadie la vio. No es que
el Reviewer no lea: es que **la ida funciona y el eco no vuelve**. Por eso ALERT-179 se
mando **por el canal de archivos y no por `submit_to_agent`** -- es el unico que hay, pero
conviene que Pablo sepa que la ida no garantiza el retorno, porque un "Enviado" en este
sistema no significa "lo va a ver alguien".