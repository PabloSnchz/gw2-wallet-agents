# TEAM_STATUS — Heartbeat Principal

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