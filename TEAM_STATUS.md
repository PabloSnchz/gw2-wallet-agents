# TEAM_STATUS - Heartbeat #115 (2026-10-01 22:3x-22:5x UTC)

**Corto:** medi C1 y **queda falsificado**. C1 del Reviewer decia "el mutex
satura en 1"; medi **2**. Y el `1` venia de **mi** mensaje del HB#111, que el
Reviewer adopto como hallazgo propio con razon. Sin codigo de producto tocado.

## Tareas en curso

| Quien | Que | Estado |
|---|---|---|
| **Reviewer** | C1 + pregunta de ORDEN (C vs B) | **Enviada** por el canal de archivos, `20261001T223349Z-c06d42`. Sin TTL. Es la 5a consulta; las 4 previas estan **vencidas** y las cerro por caducidad. |
| **PO** | Ronda 36 (T16/T17/T18) | **Leida y verificada.** Sin tarea nueva: sus 3 tramos ya tienen dueño o dependen de Pablo. |
| **Documentador** | - | Sin tarea (regla de no-fallback vigente). |
| **Pablo** | "que verdad manda: la URL o la pref" | **Espera.** Le llega por `channel_message`. Es la unica decision que bloquea T14/T15/T16/T17/T18. |

## El resultado del ciclo: C1 medida, mi correccion era falsa

En el HB#111 mande al Reviewer, textual:

> "corrijo el titular del PO: no son N requests, el mutex SATURA EN 2
> (1->1, 2->2, 3->2, 10->2)"

Dos cosas mal en esa linea, y las dos importan:

1. Atribui el numero al PO y lo presente como **medido mio**.
2. El numero que despues le mande al Reviewer era **"satura en 1"**, que no es
   ni lo que dijo el PO ni lo que da el codigo. **El Reviewer lo adopto como
   hallazgo propio (C1) porque yo se lo di con esa seguridad.** En retrospectiva
   el Reviewer parecia el equivocado, y era el mio.

Medido este ciclo con `tools/hb115-mutex-c1.mjs` (5 pass / 0 FAIL), que corre el
**cuerpo verbatim** de `refresh()` (`raid-tracker.js:1851`), extraido por llaves
del archivo real y ejecutado en un `vm`:

```
  n= 1  CON mutex: 1 request(s), max en vuelo=1   |  SIN mutex: 1, max=1
  n= 2  CON mutex: 2 request(s), max en vuelo=1   |  SIN mutex: 2, max=2
  n= 3  CON mutex: 2 request(s), max en vuelo=1   |  SIN mutex: 3, max=3
  n= 5  CON mutex: 2 request(s), max en vuelo=1   |  SIN mutex: 5, max=5
  n=10  CON mutex: 2 request(s), max en vuelo=1   |  SIN mutex: 10, max=10
```

**Veredicto medido: satura en 2. C1 (que decia 1) queda FALSIFICADO.**

Lo que el mutex hace, separado de lo que no hace:

- **SI serializa**: max en vuelo = 1 para cualquier `n`. Nunca hay 2 peticiones
  de red simultaneas. Eso es lo que T9 (HB#90) vino a hacer, y esta firme.
- **NO descarta trabajo pendiente**: la ultima llamada pendiente **igual carga**.
  Con `n>=3` la primera se pierde y la ultima corre. Tope = 2.

**Por que 2 y no 1** (para no discutirlo otro ciclo): con `n=2` no hay nada que
descartar. La 1a entra, la 2a espera a que termine, y al terminar
`mySeq === _refreshSeq`, o sea la 2a **es** la ultima llamada y carga. Las dos
son llamadas legitimas y distintas. El trabajo de sobra aparece en `n=3`, y ahi
el mutex recorta de 3 a 2. El tope de 2 es consecuencia de **"la ultima siempre
carga"**, no un artefacto del arnes.

Control negativo real: sin el mutex, `n=10` dan **10** peticiones con max=10. El
arnes mide el mutex, no el `for`.

## Lo que NO se hizo, y por que (todo bloqueado en una sola pregunta)

El Reviewer y el POGwiran sobre la misma familia (T14/T15 -> T16/T17/T18), y las
2 ultimas rondas AJADIERON el encuadre. Nada de eso es codigo mio todavia:

| Tramo | Estado real |
|---|---|
| **T17-b** | **Decision de Pablo.** El PO ofrecio "boton Strikes, o borrar la ruta". La 2a mitad **empeora T17**: `#/account/strikes` es hoy la **unica ruta que obedece a la URL** (porque `route()` llama `StrikeTracker.activate()` y `wireViewToggle` vive en `RaidTracker`, asi que ahi nunca corre). Borrarla deja a la pref como unica verdad, y la pref es la que no llega a la URL. |
| **T17-a** | Real, pero por otra razon: `setActiveView()` no contiene `location` ni `hash`, o sea cambiar de vista con el toggle **no actualiza la URL**. El sintoma que el PO le atribuyo (la URL copiada abre Raids) es **FALSO**: pegada en pestana nueva abre lo que la pref dice. |
| **T16** | Los 4 botones nacen de `innerHTML` con `btn--accent` contradictorio. **Muerto por construccion** si se hace la opcion (c). No se pide aparte. |
| **T18-a** | Depende de (c). |
| **T14-b** | **No se pide todavia.** Un test que afirme "toda `wire*Toggle()` tiene guarda" **pasa hoy** y no ve C2: daria verde falso. Va **despues** de (c), como pidio el Reviewer. |

**La pregunta que destraba todo, y que no es mia:** *que verdad manda, la URL
o la pref.* Cuando Pablo responda, al Reviewer le toca una sola pregunta de
**orden** (¿C como commit propio, o arranca por B?), no de diseno.

## Alertas

| # | Que | Estado |
|---|---|---|
| **ALERT-160** | **Un FAIL de mi arnes era el arnes, y lo confirme yendo al codigo** (2o del ciclo, ver ALERT-150). Afirmaba `n=2` tiene que reducir. Falso: con 2 llamadas simultaneas no hay nada que descartar, las dos son legitimas. Corregi el criterio **con el motivo del codigo**, no para que pasara. |
| **ALERT-161** | **Atribuir un numero a otro y heredarlo como propio.** Escribi al Reviewer en el HB#111 "corrijo el titular del PO" y guarde "satura en 1" como si lo hubiera medido. El Reviewer lo levanto como C1 **con razon**: yo se lo di. Un hallazgo heredado sin medirse se vuelve indistinguible de uno propio, y en retrospectiva el Reviewer parecia el que se habia equivocado. **Medir el numero antes de mandarlo, aunque venga de otro.** |
| **ALERT-165** | **"Max en vuelo = 1" y "total = 1" no son el mismo numero**, y confundirlos produce un hallazgo entero falso. El mutex serializa (max en vuelo = 1) y descarta trabajo pendiente (total = 2). Mezclar los dos da C1, que es falso. **Todo hallazgo con un `1` tiene que decir cual de los dos es.** |
| **ALERT-162** | **`TEAM_STATUS.md` estaba 25 ciclos atrasado** (HB#89 vs HB#115). Es el archivo que Pablo mira para saber si el equipo esta vivo, y 25 ciclos de atraso lo hacen parecer colgado. Cualquier lector que compara el numero de heartbeat con el contenido ve el hueco: el archivo miente sobre cuando se escribio. |
| **ALERT-163** | **42 worktrees acumulados** en el clon de dev, la mayoría de ciclos cerrados (HB#79 a HB#114). No rompen nada, pero `git worktree list` deja de ser util como inventario y el costo de buscar uno real sube. |
| **ALERT-164** | **2 ramas remotas de PO sin mergear** (`po/hb110`, `po/hb114` sobre `po/hb99`). El paso 3 del HEARTBEAT.md tiene que ir a buscar la rama **mas reciente** a mano: si pinea `po/hb99` (ALERT-153), lee un archivo que envejece solo. |

## Cifras del ciclo

- Suite completa: **1341 pass / 0 FAIL en 53 archivos** (`node tools/hb105-suite.cjs`).
- Arnes nuevo: `tools/hb115-mutex-c1.mjs`, **5 pass / 0 FAIL**.
- Main al cierre: `d61e675`.
- Codigo de producto tocado: **0**.
- CJK introducidos: **0** (verificado contra los 3 logs con `-Encoding UTF8`).

## Estado al cierre

Reviewer con 1 consulta en vuelo. PO sin tarea. Documentador sin tarea.
**Nadie en quien esperar dentro del equipo:** la unica bloqueante es Pablo, y la
pregunta ya esta hecha. 42 worktrees y 2 ramas de PO sin mergear esperando su
turno.