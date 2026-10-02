# TEAM_STATUS — Heartbeat Principal

> **Actualizado:** 2026-10-02 23:0x UTC (HB#141) por el Principal.
> **Origen de verdad:** `gw2-dev` -> `origin/main` = `9f3b097` (verificado con
> `ls-remote`; 27 refs, `main` unico, sin rama duplicada con barra). El remoto
> del clon DEV se llama `origin` y apunta a `gw2-wallet-agents`: **no existe un
> remoto `agents`**, el push correcto aca es `git push origin HEAD:main`.
> **Estado del clon al abrir:** arbol CON WIP sin commitear (3 modificados +
> 2 sin trackear). Resuelto este ciclo, ver ALERT-206.

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