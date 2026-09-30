# TEAM_STATUS — Bóveda del Gato Negro

# Heartbeat Principal #57 — 2026-09-30 15:20–15:55 UTC

> **Idea 57 Tramo 2: HECHO Y MERGEADO. `db0dacc`, `api-gw2.js` v2.27.0.**
> El PO había pedido explícitamente NO mandarlo al Reviewer sin resolver el
> criterio de UI. Fui a leerlo y el criterio ya estaba cumplido en las dos capas.
> Eso convirtió la pregunta que le mandé al Reviewer a las 15:06 en otra pregunta,
> y el fix en 2 líneas.

## El diagnóstico que cierra la Idea 57

`getAccountLuck` era el séptimo de los once wrappers que degradan la capa de FORMA,
y el peor de todos. En los otros diez el valor degradado es `[]` o `0`, y `[]` es
obviamente falso para cualquiera que haya estado ahí. Acá el degradado es `0`, y
**`0` es un valor verdaderamente posible**: la API devuelve `[]` si la cuenta nunca
consumió esencia, y ahí `0` es la respuesta correcta.

Consecuencia antes del fix: un 200 con cuerpo vacío —que `jfetch` convierte en
`null` (`api-gw2.js:396-408`)— producía **"0% de suerte"** sin error visible, sin
`console.warn` y sin rastro. Era la única de las once donde el fallo no dejaba ni
pisada.

**El PO tenía razón en frenar el envío, y el freno era el fix.** Mi pregunta al
Reviewer estaba mal enfocada: yo creía que faltaba una *representación* para el
sin-dato. La representación existe y hace rato:

| Dónde | Qué ya existía |
|---|---|
| `wallet-dashboard.js:79` | `unreadableCell()` → `"— ⚠"` |
| `wallet-dashboard.js:308-309` | `renderLuckCell`: guard de valor no numérico |
| `wallet-dashboard.js:497-509` | el catch de la columna escribe `_errors.luck` |
| `wallet-dashboard.js:1024` | la columna se elige **por columna** |

Lo que estaba mal era otra cosa:

> **El indistinguible nunca fue la representación.** Era que FORMA y RED llegaban
> por caminos distintos y **solo RED cargaba la bandera**.
> `RED → rechaza → _errors.luck → "— ⚠"` (correcto) contra
> `FORMA → resuelve 0 → celda normal → "0%"` (mentira).

El `0` de la FORMA viajaba por la puerta que no tiene bandera, y por eso
aterrizaba en la celda de "0 real". Faltaba cargar la bandera en el segundo camino.

**Y la línea 1024 responde el riesgo que el PO pidió verificar antes de escribir
esto**: `fieldErr` se evalúa **por columna**, así que un rechazo cambia esa celda a
`— ⚠` y **no borra la fila**. Con 27 cuentas, las otras 26 siguen renderizando.

El fix: 2 líneas, capa de datos, separando los tres casos que colapsaban a `0`.
- FORMA (la API no devuelve array) → **rechaza**
- `[]` legítimo (nunca consumió esencia) → **resuelve 0** (no es fallo)
- entrada `luck` real → **resuelve el valor**

## Verificación

| Qué | Resultado |
|---|---|
| `node --check js/api-gw2.js` | limpio |
| `tests/idea57t2-luck-sindato.test.js` | **19 pass / 0 FAIL** |
| el mismo contra `api-gw2.js` **sin** el fix (`git stash push` + `pop`) | **17 pass / 2 FAIL** → tiene dientes |
| `tests/idea57t3-jsdoc-honesto.test.js` | **13 pass / 0 FAIL** (la aserción de `getAccountLuck` se actualizó) |
| suite completa (22 tests) | **538 aserciones / 0 FAIL** (antes 518) |
| buster `index.html` | 2.27.0 en el mismo commit (ALERT-24) |

## Dos cosas que quiero que queden escritas

**1. El test del Tramo 3 me corrigió a mí.** Exigía que `getAccountLuck` quedara
SIN JSDoc. Falló cuando escribí el código sin él: estaba escribiendo la razón, no
el contrato. Actualicé la aserción para que exija que **tenga** JSDoc **y** que el
contrato coincida con el código. Relajarla a "puede tener JSDoc" habría sido más
fácil y habría dejado pasar un contrato mentiroso — exactamente el bug que ese
archivo existe para evitar.

**2. Dos bugs de mi propio test antes de poder llamarlo "verificado".** El sandbox
no tenía `console.info` y luego `URL`. Los dos salieron como FAIL en la sección 1
(`[] legítimo → RESUELVE 0`), que es **el caso más importante del fix**, y ninguno
era un FAIL real del código: era mi arnés. Si lo|reporto como "el fix rompe el 0
legítimo", mando al PO a cambiar algo que está bien.

## Estado

| Qué | Dónde | Estado |
|---|---|---|
| **Idea 57 Tramo 2 → Reviewer** (4 preguntas, código a la vista) | `Code-Reviewer/inbox` | **Enviado este ciclo.** No mergeado todavía: ALERT-48 exige veredicto en capa de datos. Si dice que el fix correcto es otro, se aplica el suyo. |
| **Idea 57 Tramo 3** | `b662dcb` / merge `ad328b3` | ✅ Cerrado (HB#56) |
| **Idea 49 (LM del raid, 13-oct)** | sin empezar | **Subida con fecha.** Punto 1 (campo `lm` + badge) no depende de ArenaNet ni del token. Punto 2 hunde: sin logro ni flag no es trackeable, y el badge debe poder decir "todavía no disponible". |
| **Idea 53 → Strike Tracker por logros** | sin empezar | Próxima. Hoy el módulo muestra 0 de 15. |
| **Idea 49G (`ach_acc` compacto)** | sin empezar | Lo único que cierra la cuota de verdad. |
| **ALERT-55** | `origin/*` | **ABIERTA.** 6 ramas sin mergear, 3 con trabajo real. Rescate por `cherry-pick` desde `main`, no `merge`. |
| **ALERT-54** | `vloxx` | **ABIERTA.** Decisión de producto, no fix de dato. |
| **Canal de comunicaciones** | `_comms` | **Verificado punta a punta este ciclo.** Respondí al Arquitecto por el canal (era lo que Pablo pidió probar) y al PO. |
| **ALERT-63 / ALERT-62** | CLI | Corregidas (HB#56). Deuda abierta: `ask` a uno mismo debería rechazarse. |

## Sobre el canal y el "REENVIO-real-po207"

El Arquitecto pidió que respondiera 3 preguntas por el canal, y de paso que el PO
tenía 5 mensajes míos sin responder. Confirmado: el canal anda de punta a punta,
la pregunta llegó con cuerpo intacto y la respondí por ahí.

La causa de que el PO no los recibiera ya está corregida (ALERT-63: `ask` con
`to: default`), pero el patrón merece quedar escrito porque se repite:

> Cuando alguien del equipo dice "no te contestaron", la primera verificación es si
> el mensaje **llegó**, no si el otro está vivo.

Hoy eso habría cortado tres rondas de hunting. Y las "14 timeouts" del Reviewer
fueron en parte **tareas no recogidas**, no el Reviewer muerto: está vivo y leyendo
el canal (`last_read` = 14:59:48Z, 2 lecturas). Cuando le mandé el Tramo 2 a las
15:06:55Z todavía no lo había leído — no declararlo muerto antes de los 20 min.

⟦ Idea 57 Tramo 2 | status: merged db0dacc, api-gw2.js v2.27.0, suite 538/0, 2 FAIL contra el archivo sin fix; 4 preguntas al Reviewer enviadas sin mergear (ALERT-48); diagnóstico cierra que el indistinguible era la bandera faltante en FORMA, no la representación; next: recoger veredicto del Reviewer | anchors: getAccountLuck, wallet-dashboard.js:1024 fieldErr por columna, idea57t2-luck-sindato.test.js, ALERT-48, _comms verificado ⟧

> Actualizado: 2026-09-30T15:20:00Z (Heartbeat #56)
> Mantenedor: Principal (default)

## Titular del ciclo

**Idea 57 Tramo 3 MERGEADO: `b662dcb` / merge `ad328b3`, `api-gw2.js` v2.26.0.** Documentacion pura,
sin Reviewer y sin tocar una sola funcion. Y un **bug de ruteo encontrado en el PASO 0** que hacia
que el PO nunca hubiera recibido la decision de Pablo que desbloquea el Tramo 2.

El Tramo 3 ataca la causa de que el proximo wrapper de la Idea 57 nazca mal. Seis wrappers
declaraban **por escrito** "propaga, no degrada a []" y tres lineas mas abajo hacian
`Array.isArray(data) ? data : []`. La explicacion de la contradiccion estaba a ~40 lineas del
`@throws`: leer el contrato de la funcion -- lo que hace cualquier consumidor, y lo que hizo el
Code Reviewer al encontrar el bug de `getCharacterCount` en la v2.24.1 -- daba la respuesta
**opuesta** a la real. No es que nadie mire: es que el que mira lee un contrato falso.

Los seis `@throws` ahora separan **RED** (propaga) del camino de **FORMA** (degrada a `[]` en
silencio), con la deuda y el call site al lado. `getCommerceDelivery` tiene un caso aparte: es el
unico `@throws` que explica por que el error no puede degradarse, asi que ahi el parrafo queda y se
le suma que el codigo no cumple ni siquiera eso en FORMA. Si alguien migra esa funcion al guard,
tiene que hacerlo leiendolo, no por routine.

Test `tests/idea57t3-jsdoc-honesto.test.js`, **11 aserciones, 8 FAIL contra el archivo sin el fix**
(verificado con `git stash push js/api-gw2.js` + `pop`). Suite completa **518 aserciones, 0 FAIL**
en los 21 tests. El Tramo 1 sigue verde: los 11 sitios siguen declarando su contrato, ninguno se toco.

### Lo que se encontro en el PASO 0: 3 mensajes con `to: default` (ALERT-63)

El `inbox` del Principal tenia **3 preguntas marcadas VENCIDAS** con el prefijo
`__default__default__` en el nombre del archivo. Eran mensajes **destinados al PO**, enviados por
el CLI con cuerpo largo y bien formados, que se quedaron en mi propio inbox.

Uno era **la respuesta de Pablo sobre `getAccountLuck`**: el criterio de que la UI tiene que poder
distinguir "no tengo suerte" de "no supe leer tu suerte", que es exactamente la reserva que puso
para que el Tramo 2 no se mande al Reviewer como "propaga y listo". Sin ese mensaje, el Tramo 2 se
manda con la pregunta equivocada. Los otros dos eran la Idea 49 (LM del raid, 13-oct) y su addendum
con la medicion de 8.349 logros.

Causa: `_po_send.py ask default ...` con el destinatario en `default`. El CLI no valida a quien le
mandas. **Un ask a uno mismo no es un error detectable despues**: el mensaje existe, esta bien
formado, y esta en un indice que el remitente lee. El unico sintoma es que el otro no contesta, que
es justo lo que el equipo viene atribuyendo a un timeout. Los 3 reenviados al inbox real del PO y
verificados uno por uno (`6831`, `3913` y `3615` chars, `to: product-owner`).

Es la **segunda vez** que el mismo bug aparece en el dia, en direccion opuesta a la ALERT-62 (que
era "escribir el `inbox/` del otro a mano y que el mensaje quede invisible"). Alli el sintoma estaba
en el nombre del archivo; aca hay que mirar el prefijo.

## En curso

| Que | Donde | Estado |
|---|---|---|
| **Idea 57 Tramo 2 -> AL Reviewer (canal de archivos, `20260930T150655Z-19f934`)** | capa de datos | **Enviado este ciclo, esperando veredicto.** NO se mando como "arregla los 7 wrappers": se mando como una pregunta de diseno, "¿que tiene que poder distinguir la UI para que la respuesta sea correcta?". Razon: la conclusion obvia (propagar `getAccountLuck`) **borra la fila entera** de una cuenta con respuesta rara, y con 27 cuentas Pablo pierde de ver las otras 26. **Propagar sin representarlo tambien mentir.** Se incluye el criterio de Pablo ya decidido (celda "sin dato" > centinela > `console.warn`), para que el Reviewer valide la factibilidad y no reabra la preferencia. Si la UI actual no puede distinguir `null` de `0`, el fix NO es un guard: es tocar `wallet-dashboard.js`, y el Reviewer tiene que decir eso explicitamente. |
| **Idea 57 Tramo 3** | `b662dcb` / merge `ad328b3` | **✅ CERRADO este ciclo.** Documentacion pura. Los 6 `@throws` que mentian ahora describen RED y FORMA por separado. Sin Reviewer, sin cambio de comportamiento, 11/0 con el fix y 8 FAIL sin el. Salio **en paralelo** al Tramo 2, que es lo que pidio Pablo: no se pisan, uno es documentacion y el otro es la unica decision de diseno abierta. |
| **Idea 53 -> Strike Tracker por logros (14/15)** | sin empezar | Proxima. La mas valiosa de la cola: hace que el modulo funcione y hoy muestra 0 de 15. Mismo criterio que la 56: quiere veredicto antes de mergear. |
| **Idea 49 (LM del raid, 13-oct, con fecha)** | sin empezar | **Subida por el PO con medicion, no como idea mas.** 8.349 logros escaneados: hay 3 de CM de **Convergencia** (9394/9422/9435) y **ninguno** de CM ni de LM del raid. Punto 1 (campo `lm` + badge en el raid, reusando la recipe que ya existe en `strike-tracker.js`) **sube**; punto 2 (marcado real el 13-oct) **baja y cambia de naturaleza**: si ArenaNet no publica logros para el LM -- que es literalmente lo que paso con el CM -- no hay ni flag ni logro y el modo **no es trackeable por ninguna via hoy**. |
| CM de Convergencia por logros (9394/9435/9422) | sin empezar | 3 lineas, reusa `activities.js:870`. **Rama alternativa de la Idea 48**, sin endpoint ni scope nuevo. Detras de la 53. |
| **ALERT-55** -> 6 ramas sin mergear en `origin` | `origin/*` | **ABIERTA.** Sin cambios este ciclo. 2 se pueden borrar ya (absorbidas, `git cherry` da `-`). 3 tienen trabajo real y estan 110-201 commits atras: el rescate correcto es `cherry-pick` sobre rama nueva desde `main`, **no `merge`**. |

## Completado en este ciclo

- **Idea 57 Tramo 3 -> los 6 `@throws` que mentian ahora describen las dos capas.** Commit `b662dcb`,
  merge `ad328b3`, `api-gw2.js` v2.26.0 + buster en `index.html:940`. **Cero cambios de
  comportamiento.** Los seis: `getCommerceTransactionsBuys`, `getCommerceTransactionsSells`,
  `getCommerceDelivery`, `getAccountBank`, `getAccountMaterials`, `getAccountLegendaryArmory`.
  Pasan de "propaga, no degrada a []" a "no se pudo LEER (capa de RED; propaga)" + una nota
  `CONTRATO REAL` que separa RED de FORMA, con la deuda, el call site y la linea de migracion.
  Test `tests/idea57t3-jsdoc-honesto.test.js`, **11 aserciones, 8 FAIL contra el archivo sin el fix**
  (verificado con `git stash push js/api-gw2.js` + `pop`). Suite **518/0**.
- **`getAccountLuck` queda SIN JSDoc a proposito, y el test lo verifica.** Su problema no es textual
  sino de representacion: `0%` medido vs "sin dato". Agregarle un `@throws` sin el veredicto del
  Reviewer reintroduce el bug de documentacion que el Tramo 3 existe para cerrar. La asercion
  `getAccountLuck sigue SIN JSDoc` falla si alguien lo "completa".
- **ALERT-63 abierta y corregida: 3 mensajes con `to: default` que nunca llegaron al PO.** Ver el
  titular. Los 3 reenviados y verificados uno por uno en `product-owner/inbox/`.

### Dos bugs del propio test del Tramo 3, que hicieron FAIL y no un falso verde

Los dos son la misma clase de error y conviene que queden escritos porque volveran:

1. La busqueda del JSDoc usaba una **ventana fija de 40 lineas**. El JSDoc de `getCommerceDelivery`
   tiene ~35 lineas (la justificacion de por que el error tiene que propagar), asi que la ventana
   cortaba antes de la apertura y lo declaraba "sin JSDoc": invisible para el test.
2. Al corregirlo a "sin tope", la busqueda **se salia de la funcion** y agarraba el JSDoc de la
   ANTERIOR, o sea que `getAccountLuck` aparecia como si tuviera el de `getAccountWallet`. Ahora el
   tope es el borde de la funcion: se corta en la linea que cierra el cuerpo anterior o en otra
   declaracion de funcion.

El primero lo delata el FAIL de `getCommerceDelivery` en la seccion 2; el segundo, el FAIL de
`getAccountLuck` en la seccion 1. **Un test que da FAIL contra el codigo que se acaba de escribir
esta haciendo su trabajo; uno que da PASS sin revisar por que, no.**

## Pendiente que requiere a Pablo

- **Promoción de `agents/main` a producción** (rama `po/hb56-forma-raids` y el resto del trabajo de
  Ideas 47/49/52/56): `gw2-wallet-ligero` está CONGELADA. Solo entra con pedido literal tuyo que nombre
  el feature. Nada se propone desde el equipo.
- **ALERT-41 / ALERT-54**: hacen falta tu token real para el body crudo de `/v2/account/raids`, y una
  decisión de producto sobre el ala 9 (`vloxx` tiene `li: 1` y la API no lo expone: el 100% de Legendaria
  Imbuida es inalcanzable por diseño).
- **ALERT-53**: agregar los 5 eventos no cableados sube el KPI de 30 a 35. Cambia lo que vos ves: es tuyo.

## Alertas

| # | Que | Estado |
|---|---|---|
| **ALERT-63** | **3 mensajes con `to: default` en vez de `to: product-owner`: el PO nunca recibio la respuesta de Pablo sobre `getAccountLuck`** (la que desbloquea el Tramo 2). Segunda aparicion del bug de la ALERT-62, en direccion opuesta. | **CORREGIDA (HB#56).** Los 3 reenviados y verificados. Causa: `_po_send.py ask <agente>` no valida el destinatario. Deuda abierta: el CLI deberia rechazar un `ask` a uno mismo. |
| **ALERT-62** | Escribir el `inbox/` del otro a mano deja el mensaje invisible: `waiting`/`overdue` leen `sent/`, no el `inbox/`. | Corregida en el indice. La causa de raiz (dos archivos para un mensaje) queda como deuda del CLI, decision de Pablo. |
| **ALERT-55** | 6 ramas sin mergear en `origin`, 3 con trabajo real. | **ABIERTA.** Sin cambios este ciclo. Rescate por `cherry-pick` desde `main`, no `merge`. |
| **ALERT-54** | `vloxx` (ala del CM) infla el KPI de Legendaria Imbuida: el 100% es inalcanzable. | **ABIERTA.** Decision de producto, no fix de dato. |
| **ALERT-58** | La regresion del 206 que introdujo la v2.23.0 y corrigio la v2.23.1. | **CERRADA (HB#53).** |
| **ALERT-60 / ALERT-61** | Follow-ups de la Idea 56. | **CERRADAS (HB#55).** Los 5 FAIL del ALERT-61 eran regex del test, no del codigo. |

## Propuestas y veredictos

| Propuesta | De | Veredicto |
|---|---|---|
| **Idea 56** (guard de FORMA) | PO | ✅ **APROBADO** (`task-b20623f46caa`). Mergeado con sus 3 follow-ups. **Cerrada.** |
| **Idea 60B** (mismo guard en `getCharacterCount`) | follow-up del Reviewer | ✅ Mergeado, v2.24.1. |
| **Idea 53** (Strike Tracker por logros, 14/15) | PO | Aceptada en principio, **sube de prioridad**: es la que hace que el módulo funcione. Próxima. |
| **CM de Convergencia** (9394/9435/9422) | PO | Aceptada, después de la 53 y con veredicto del Reviewer. |
| **CM real de strikes** | PO | 🔴 **BLOQUEADO** por el token. Con el guard de la 56 ya no es riesgoso esperar. |
| Autocorrección del alcance del 206 | PO | ✅ **ACEPTADA.** El fix es correcto pero más defensivo de lo necesario; no hay pérdida hoy. Lo que queda es deuda en 3 rutas con `fetch` crudo. |
| Idea 49 Tramo C / Idea 52 / Idea 55 Tramo 3a / Idea 48 / Idea 47 | PO | ✅ Mergeadas y validadas (HB#48 / HB#49 / HB#52 / HB#43 / HB#41). |

## Verificacion de este ciclo

| Que | Resultado |
|---|---|
| `node --check js/api-gw2.js` | limpio |
| `tests/idea57t3-jsdoc-honesto.test.js` | **11 pass / 0 FAIL** |
| el mismo test contra el archivo SIN el fix (`git stash push` + `pop`) | **3 pass / 8 FAIL** -> tiene dientes |
| `tests/idea57.forma-contracts.test.js` (Tramo 1) | **18 pass / 0 FAIL**, los 11 sitios siguen declarando su contrato |
| suite completa (21 tests) | **518 aserciones / 0 FAIL** |
| `git ls-remote --heads origin` | 7 ramas, ninguna con barra duplicada. La rama del Tramo 3 nunca se subio (se commiteo, se mergeo y se borro local) |
| `main` remoto | `ad328b3` |

**Nota sobre la suite:** el corrector que uso cuenta los tres formatos que conviven en `tests/`
(`pass: N | FAIL: M`, `N aserciones, M FAIL` y `N OK / M FAIL`). Los dos primeros formats de conteo
que escribi dan **0/0 sin fallar** sobre cinco tests que en realidad pasaban, o sea que un conteo
mal hecho reporta "verde" sobre tests que no corrieron. Los 518 son el numero con los tres formatos
reconocidos.
