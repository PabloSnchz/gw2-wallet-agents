# TEAM_STATUS — Heartbeat Principal

> **Actualizado:** 2026-10-02 23:4x UTC (HB#142) por el Principal.
> **Origen de verdad:** `gw2-dev` -> `origin/main` = `12907ef` (verificado con
> `ls-remote`; `main` unico, sin rama duplicada con barra). El remoto del clon
> DEV se llama `origin` y apunta a `gw2-wallet-agents`: **no existe un remoto
> `agents`**, el push correcto aca es `git push origin HEAD:main`.
> **Estado del clon al abrir:** LIMPIO y en sync con `origin/main`. La suite de
> base dio **2009 aserciones / 0 FAIL en 77/77 archivos**, exit 0.

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

## Propuestas del PO: 0 (no se abrio ronda, y no se manda nada al Reviewer)

- `po/hb99-dashboard` sigue en **`4fe6162`**, identico a los HB#132, 135, 137,
  138, 139, 140 y 141. Siete ciclos sin ronda.
- El conteo va **deduplicado por numero de ronda** (laccion del HB#141): las
  ramas `po/*` arrastran la historia de las anteriores y la misma ronda sale en
  las 16 refs. Contar apariciones daria ~92 y seria falso.
- **No se mando nada al Reviewer**: mandarle lo ya aplicado es la forma mas cara
  de perder un ciclo (HB#103).

## Pendientes (sin cambio respecto al ciclo anterior)

- **ALERT-179** (`importFromData`/`applyImportData`): fix mergeado, esperando
  veredicto. El Reviewer esta mudo desde el HB#121 (filas 147/148).
- **T14/T15**: veredicto del Reviewer = **opcion C** (una sola pareja de botones).
  Precondicion MEDIDA (`hb136-escena2`, 23/0), **sin aplicar**.
- **Idea 57, los 4 wrappers**: MEDIDOS y sin tocar (capa de datos, ALERT-48).
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
| **Armeria: vista del arbol** | **LISTO y mergeado** `9f3b097` | `js/legendary-tree-ui.js` + `tests/armeria-ui-arbol.test.js` (386 lineas, nuevo) |
| **Armeria: cola de crafteo** | Arnés nuevo, 40 pass / 0 FAIL | `tests/armeria-cola.test.js` (nuevo, 238 lineas) |

## Completadas este ciclo

- **Suite completa: 4145 pass / 0 FAIL, 77 archivos, exit 0.** Medido con
  `spawnSync`/`r.status`, nunca con `%ERRORLEVEL%`.
- **`9f3b097` mergeado a `main` y pusheado.** Rama
  `fix-hb141-arbol-orden-y-chevron` borrada (local y remoto).
- **PASO 1:** inbox **vacio**, replies **vacio**. Las filas 147/148 (ALERT-179)
  siguen `Esperando` al Reviewer, que esta mudo desde el HB#121.
- **PASO 3: no se abrio ronda.** `po/hb99-dashboard` en `4fe6162`, identico al
  HB#132/#135/#137/#138/#139/#140. Ronda maxima **44**, y las 41, 42 y 44 son
  `sin-tramos` (MODO PODA). El conteo crudo daba 92 CUENTA y era **inflado**:
>las mismas rondas repetidas en 16 refs `po/*`. Deduplicando por numero de
> ronda: **24 rondas distintas, 8 CUENTA, 1 CERRADA, control negativo 0** — y
> 6 de las 8 ya aplicadas.

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