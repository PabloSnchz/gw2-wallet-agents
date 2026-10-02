# TEAM_STATUS - Heartbeat #126 (2026-10-02 08:0x-08:4x UTC)

**Corto:** main estaba **5 commits atras** y no lo sabia nadie. El trabajo estaba
terminado, testeado y commiteado, pero en ramas LOCALES a las que ningun
`git branch -r --contains` llegaba. Sin este ciclo se perdia con el proximo
`git worktree prune`. Ademas, el paso 5 de la Armeria estaba **hecho, sin
commitear y sin un solo test**, y el test que escribi encontro un bug real en
el.

## Tareas en curso

| Que | Quien | Estado |
|---|---|---|
| **ARME paso 5 (cola de crafteo)** | default | **TERMINADO y mergeado** - `ae10e5b` |
| **Armeria, pasos 3 y 4** | default | Pendiente. No arrancados este ciclo. |
| **craftType en la cola** | default | Pregunta de ALCANCE esperando al Reviewer. El codigo NO valida craftType a proposito, y el comentario lo dice para que cambiarla sea una linea. |

## Completadas este ciclo

- **RECUPERACION: 5 commits que estaban FUERA de main, ahora dentro.** Y todos
  verificados antes de mergear, no confiados:
  - `3520fdc` - el generador de recetas declara su fuente; sus 3 casos dejan de
    estar fundidos (arregla un rojo que llevaba 2 ciclos invisible).
  - `0d498b1` - MERGE del Tramo 2 de Idea 57: los 3 wrappers de inventario ya no
    degradan la FORMA a `[]`.
  - `0a6c569` - la poda del PO aplicada (6 archivadas); conteo corregido 16 a 10.
  - `ad0e353` - la cabecera de la v2.30.0 de `api-gw2.js` describia en presente
    lo que ya no era cierto.
- **ARME paso 5 - la cola de crafteo.** `ae10e5b`. "Mi progreso" pasa a ser la
  cola: maximo 5, en orden de agregado, las 3 primeras con mas peso visual.
  Con eso se cae el switch "Desbloqueadas / Solo faltantes" y `setScope()`.
- **Test propio de la cola** (nuevo, 15 asserts) con **fase roja verificada**:
  14 FAIL contra el archivo sin la cola, y el unico pass es COLA-13 (los filtros
  se mantienen), que es exactamente el que debe pasar.
- **BUG REAL encontrado por el test, que no estaba en el WIP:**
  `toggleQueue` validaba `isFinite && > 0` pero NO exigia entero, mientras
  `sanitizeQueue` si lo exigia. Un id fraccionario (1.5) entraba vivo, se
  persistia y **desaparecia en la recarga**. Dos validadores que no coinciden,
  y el sintoma es "perdi un item" sin ningun error. Corregido y con assert.
- **3 tests actualizados al contrato nuevo**, porque fallaban de verdad y el
  contrato cambio a proposito (no por descuido). Ver abajo.

## Pendientes

1. **El Reviewer no lee su inbox (ALERT-188).** `overdue` de este ciclo: **14
   consultas vencidas**, 11 al Reviewer + 3 al PO. Sigue siendo lo unico que no
   depende de una decision de Pablo. **No reactivo su cron**: la verificacion de
   crons la hace el Arquitecto.
2. **`tools/.gitignore`** - decision de Pablo. Al dataset (`tools/cl_recipes.json`)
   le falta **una linea**, no cuatro.
3. **ALERT-41** (Strike Tracker): cierre unico con el body crudo de
   `/v2/account/raids` con token real. Si el endpoint no trae ids utilizables,
   se borra el modulo - decision de Pablo.
4. **Armeria, pasos 3 y 4.**

## Alertas

| # | Que | Estado |
|---|---|---|
| **ALERT-190** | 5 commits terminados, testeados y fuera de `main`, solo en ramas locales | **CERRADO** (`ae10e5b` y el push de `fd8e579`). El modo de fallo: nadie mira `git branch -r --contains <sha>`, y un commit que no esta en ninguna rama remota no existe para el que vuelva. **Un WIP terminado que no llega a main es trabajo perdido, no trabajo a medias.** |
| **ALERT-191** | El paso 5 estaba HECHO, sin commitear y **sin un solo test** | **CERRADO.** Un cambio de 231 lineas que reescribe el modo principal de un modulo necesita test aunque venga bien pensado. El test no solo lo cubrio: encontro un bug de perdida de datos. |
| **ALERT-192** | El validador de ESCRITURA de la cola y el de LECTURA no coincidian | **CERRADO** en `ae10e5b`. Semeasure con COLA-07 en rojo (`q=[1.5]`). **Un item que entra por un camino y el otro lo rechaza es una perdida silenciosa**, y no da error ni warning: la cola queda mas corta y nadie sabe por que. |
| ALERT-188 | Inbox del Reviewer: 14 consultas vencidas | Sigue. El Principal resolvio su cola por Capa 3. |
| ALERT-41 | Strike Tracker no puede marcar un strike | Sigue vigente. Decision de Pablo. |
| ALERT-187 | La suite da verde o rojo segun un archivo que no esta en git | Sigue. Decision de Pablo. |

## Estado de propuestas

**0 propuestas abiertas para el Reviewer.** Las del PO estan aplicadas (las 6
podas de la ronda 40 entraron en `0a6c569`, ya en main). Las 14 consultas
vencidas son **preguntas de alcance** que el Reviewer no leyo, no propuestas
nuevas.

## Commits del ciclo

- `ae10e5b` - `feat(armeria)`: paso 5, la cola de crafteo + test propio + el bug
  del id fraccionario + los 3 tests actualizados al contrato nuevo.
- `fd8e579` - el push de recuperacion de los 5 commits perdidos.

## Salud de la suite

`node tests/_run-all.js` -> **66 archivos, 1701 pass, 0 FAIL**.
Por exit code (no por texto, que es lo que produjo ALERT-176): **66 de 66**.
Arranco del ciclo: 65 archivos, 1686 pass, **4 FAIL** (los del contrato viejo).