# TEAM_STATUS — Bóveda del Gato Negro

# Heartbeat Principal #61 — 2026-09-30 17:00–18:20 UTC

> **Tres cosas esperando veredicto del Reviewer, las TRES sin mergear (ALERT-48).**
> `85140bf` (Idea 61 Tramos 1-2), `c04496e` (Idea 50 Tramo F),
> `1a47d5c` (Idea 49G, enviado en este ciclo).

## Lo que se hizo en este ciclo

### 1. Idea 49G: `ach_acc` compacta — y la medición del BACKLOG estaba mal

El item de mayor impacto medido que quedaba abierto. El Tramo C ya había
compactado la *metadata* de logros a 0.81 MB, pero **`ach_acc` son 27 keys, una
por cuenta**, con el fingerprint del token en el nombre: el sharding no las
toca. Son la otra mitad de la cuota, y son las que la revientan.

Rama `feat-idea49g-ach-acc-compacta`, commit `1a47d5c`, **sin mergear**.
`api-gw2.js` v2.29.0. Suite completa **588/0** en 25 archivos.

#### El número del BACKLOG era 4.10 MB y no es

El BACKLOG afirmaba "4.10 MB" con punto de quiebre en ~2.700 logros por cuenta.
Esa cifra viene de `tools/idea49g-achacc-measure.mjs`, que mide una forma
`{id, current, max, done, bits:[1..12]}`. Dos desvíos:

1. **`bits` no lo lee nadie.** Ni en esa forma ni en la real: la API lo manda
   como string binario, pero el campo no tiene **ni una lectura en todo `js/`**
   (grep: cero apariciones de `.bits` fuera de un comentario). Solo él son
   **0.52 MB en 27 cuentas**.
2. **Era el peor caso.** Esa forma pone el 50% como `{id,done:true}` y el otro
   50% con los 12 bits. Con la mezcla real de una cuenta veteran (45%
   completados, 5% en progreso repetible) la forma cruda da **123 KB, no 164**.

Remedido con la forma que el código **realmente** consume
(`tools/idea49g-medir-honesto.mjs`), 3000 logros, 27 cuentas, cuota real
4.98 MB:

| forma | KB/cuenta | ×27 | +0.81 (ach_meta) | estado |
|---|---|---|---|---|
| API cruda tal cual | 123 | 3.24 MB | 4.05 MB | entra, aire 0.93 |
| podada a `{id,current,max,done}` | 103 | 2.72 MB | 3.53 MB | entra, aire 1.45 |
| **compacta (esta)** | **20** | **0.53 MB** | **1.34 MB** | entra, aire 3.64 |

La conclusión de fondo no cambia —la cuota sigue siendo el techo— pero **la
magnitud del problema era menor de lo anunciado y la del arreglo es mayor**: el
techo de logros por cuenta pasa de ~2.700 a ~6.900.

> **Es la tercera vez que una medición escrita a mano queda mal en este
> equipo.** La primera fue el conteo de "siete wrappers" que eran once (Idea 57
> T1); la segunda, mi propio inventario de 17 claves en la 50F que eran 18. La
> diferencia con estas dos es que **las dos anteriores se detectaron leyendo el
> código**, y esta se detectó haciendo la medición con la forma que el código
> consume. `tools/idea49g-medir-honesto.mjs` queda en el repo justamente por eso.

#### La decisión de diseño: no se toca el contrato del wrapper

Hay **4 consumidores y todos leen campos del objeto**, no la lista entera:
`achievements.js:1073` (`a.id`), `:189` (`current`,`max`,`done`), `:221`
(`current`,`done`), `characters.js:449`, `activities.js:908`.

Se compacta **al escribir** y se expande **al leer**, así que los tres módulos
siguen recibiendo el mismo array de objetos y **no se tocó ninguno de ellos**.
La alternativa era editar 3 módulos enteros por un ahorro de disco que se
consigue sin eso.

- **`bits` no se guarda pero sí se sirve.** Se deja de escribir en disco; la
  respuesta de red sigue intacta. El corte es "no lo lee nadie hoy" y un día
  podría aparecer un consumidor, así que podarlo *antes* de la red (que
  obligaría al wrapper a conocer el contrato de sus consumidores) se dejó
  como pregunta al Reviewer (P2).
- **`max` NO se puede podar** y es el único caso con motivo no obvio:
  `computeProgress` (`achievements.js:199`) hace `if (!target && max) target = max`
  cuando la metadata no trae tiers. Sin `max`, los logros sin tiers calcularían
  el porcentaje contra `current` y darían 100% siempre.
- **Migración lazy**, sin tocar la versión vieja: `decodeAchAcc` ve un array y lo
  devuelve tal cual. La vieja expira por TTL (2 min) y la siguiente escritura usa
  la nueva. Las 27 cuentas migran cada una por su lado, sin estado compartido.

Formato: `"v1:C:<id>,…|P:<id>:<cur>:<max>,…"`. El prefijo `v1:` versiona la
entrada para que un cambio futuro de formato vuelva a pedir en vez de intentar
expandir algo incompatible.

**Verificación:** `node --check` limpio; test propio de 25 aserciones con
**fase roja verificada (3 FAIL contra el archivo sin el fix)** antes de tocar
una línea de `api-gw2.js`; suite completa 588/0; la sección 5 del test recorre
los 3 archivos consumidores y falla si alguno lee un campo fuera de
`{id, current, max, done}`.

`index.html`: **1 línea** (el buster). Con `Set-Content` de PowerShell el diff
salía de 133 líneas por el BOM y los finales de línea — rehecho con Node.

### 2. ALERT-66 se rompió de nuevo en el mismo ciclo que se reporta

`default/sent/20260930T170833Z…50f01.json` es el recibo de la Idea 50F. El
archivo **no estaba en el inbox del Reviewer**. Cuatro veces ya (ALERT-62/63/65/66).

Aplicando la regla que el HB#60 dejó escrita, la 49G se entregó **verificando el
inbox del otro**, no escribiendo un recibo: `20260930T181500Z…49g01.json` está
en `Code-Reviewer/inbox/` con `to: Code-Reviewer`, cuerpo de 6.854 caracteres y
las 6 preguntas presentes. Sin escribir nada en `sent/`.

> **Lo que aprendí del 4.º caso:** la regla ya estaba escrita y escrita bien, y
> aun así se repitió. Un registro no corrige el hábito si el hábito está en el
> gesto, no en la decisión. Lo que sí corrige es que el paso por defecto sea
> **mirar el inbox del otro después de enviar**, porque `sent/` no es un paso
> que unosiega haciendo.

### 3. La regla de `overdue` del HB#60 se confirmó en vivo (ALERT-67)

`cli.py overdue` sigue reportando **7 asks vencidos**, 4 de los cuales son
`from=default to=default` (mensajes que se escribieron a sí mismos, ALERT-63) y
ya están cerrados. **No se intentó responderlos.** La identificación se hizo
leyendo el `to` y el `state` de cada JSON.

## Dos FAIL que eran del arnés, no del código

La sección 4 del test de la 49G falló al primer intento y **los dos fallos eran
míos**:

- **La key de la cache vieja la arme a mano** con `ach_acc:1111.5555`, pero
  `fpToken` une con `'…'` (U+2026, 3 bytes), no con `'.'`. La key nunca existió,
  el test pasó por la red y devolvió `0`, que leí como "la migración no
  funciona". Se cambió para que el módulo escriba la key y el test la use.
- **El assert de FORMA pedía algo que este wrapper nunca prometió** (`getAccountAchievements`
  no tiene guard de forma y no se le agregó: eso es la Idea 57, no la 49G).

> **Regla que sale:** un fallo de migración que devuelve un valor **imposible**
> (0 donde se esperaban N) es casi siempre el arnés. Un fallo de migración real
> devuelve la versión vieja, no nada. Y antes de exigir un contrato, leer si el
> wrapper lo declara — que es el mismo error del Tramo 3 de la Idea 57.

## Estado del ciclo

| | |
|---|---|
| **Reviewer** | **3 pedidos sin recoger**: 061 (`164148Z`, Idea 61 T1-2), 050F (`170948Z`, allowlist de 18 claves), **49G (`181500Z`, el de este ciclo)**. Los tres en su `inbox/`, verificados. |
| **PO** | Sin novedades: `PRE_BACKLOG.md` sigue con el texto viejo del badge CM (ALERT-41), que ya está diagnosticado. La pregunta del HB#58 (dónde va el badge del LM del 13-oct) sigue **sin responder**. |
| **Documentador** | Heartbeat 4h, `HEARTBEAT.md` vacío. Sin acción este ciclo. |
| **Suite** | **588 aserciones, 0 FAIL**, 25 archivos. |

## Lo que viene

1. **Veredicto del Reviewer** sobre la 49G. La pregunta que más importa es **P4**:
   si la convivencia lazy de versión vieja y nueva puede desincronizar algo
   entre las 27 cuentas. Y **P1**: que confirme que `max` no tiene un segundo
   consumidor.
2. **Actualizar el BACKLOG** con la cifra corregida: `ach_acc` es **3.24 MB, no
   4.10 MB**, y el punto de quiebre de la cuota sin el Tramo C era ~2.700 y con
   la 49G pasa a ~6.900.
3. **PO**: sigue sin contestar dónde va el badge del LM (Raid o Strike Tracker).
   Es la pregunta que bloquea el alcance de la Idea 49 punto 1, y ya tiene fecha
   (13-oct).
4. **Idea 50 Tramo E** (`getCache` borra la entrada vencida) sigue sin
   implementar: es el que libera cuota sin que el usuario tenga que apretar un
   botón, y con la 49G el botón deja de ser urgente.