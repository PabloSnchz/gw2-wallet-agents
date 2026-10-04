# PROMOTIONS.md — inventario para Pablo

> **Regla:** cuando un feat queda terminado en `agents/main`, el equipo
> **no lo comunica**. Se anota acá y Pablo decide.
> Este archivo es de **lectura de Pablo**, no un ticket de trabajo.
>
> Clon: `C:\Mis Archivos\GW2 online\gw2-dev` (desarrollo).
> Producción está CONGELADA: ver la regla de oro en `AGENTS.md`.

## Cómo se usa

| Columna | Qué significa |
|---------|---------------|
| **Feat** | Nombre del feature |
| **Rama** | Rama donde vive |
| **Commits** | SHAs en `agents/main` |
| **Estado** | `Listo para probar` / `Probado` / (lo que Pablo decida) |
| **Por qué NO es candidato** | el motivo, cuando la fila no espera ninguna decisión |

### Los estados que existen, y por qué

El parser del dashboard (js/parser.js) clasifica por texto, no por posición,
y cada estado cae en un bloque distinto. Cuando inventes un estado nuevo,
decime cuál de estos sos:

| Estado | Qué significa | Bloque en la tab |
|---|---|---|
| `LISTO` | está en `agents/main`, se puede probar | Esperando tu decisión |
| `PENDIENTE` | quedó a medio camino | Esperando tu decisión |
| `AUTORIZADO` | Pablo lo aprobó; está en producción | Decisiones tomadas |
| `REVERTIDO` / `RECHAZADO` | no entra, o entró y se sacó | Decisiones tomadas |
| `EN PRODUCCIÓN, SIN VERIFICAR` | **ya está en producción pero nadie confirmó que funcione** | En producción sin verificar |
| "no revertir / no tocar" | congelado: hay algo que no hay que mover | Congelado |

**`EN PRODUCCIÓN, SIN VERIFICAR` existe desde el 2026-10-01.** Antes, un item
que estaba en producción pero sin probar caía en "PENDIENTE", que se leía como
"falta decidir" — y la tab le pedía a Pablo una decisión sobre algo que ya
había resuelto. También al revés: marcarlo AUTORIZADO lo esconde bajo
"decidido" y deja de avisar que nadie lo probó.

Que esté **visible** no es lo mismo que **funcione**. El `392c3b9` estaba en
producción y su pill se veía en Actividades, pero nadie había confirmado que
hiciera lo que dice hacer. Marcarlo AUTORIZADO habría sido afirmar una
funcionalidad que nadie midió.

### Por qué todo tiene que estar en una TABLA

El parser solo lee las secciones cuyo título matchea `/pendient|esperando|por
decidir|candidato|revisar/` o `/decidid|tomadas|historial|aprobad/`, y de cada
sección solo lee tablas con encabezado o bullets. Un `## HB#xxx` suelto se
descarta entero: **no aparece en la tab**. Eso ya pasó con T19-c, T20-c,
HB#136 y HB#141, que estaban escritos abajo como secciones sueltas y la tab
mostraba una cola más corta que la real. Si algo no está en una tabla de esta
sección, para la tab no existe.

## Pendientes de decisión

| Feat | Rama | Commits | Estado |
|---|---|---|---|
| **Idea 50 completa — el botón de liberar caché** | `feat-idea50-boton-cache` (mergeada y borrada) | `b43743b`, `70414d2`, `46b2d7f` / merge `950ea64` | **LISTO.** Tramos A-F: `cacheClear` con `dryRun`, el registro estático de 23 bases de API + 5 del WV, `keptBytes`, y un copy que solo afirma lo que sigue siendo cierto. Veredicto del Reviewer: APROBADO CON CAMBIOS, los 2 bloqueantes aplicados. **Sí cambia lo que Pablo ve**: es el primer botón que invoca `cacheClear`. Suite 793 aserciones / 0 FAIL, 29 de 29 archivos |
| **Cuentas consistentes entre pestañas (T19-c)** | `feat-t19c-lectores-capa` (ya borrada, estaba en `main`) | `d32e054` | **Listo para probar.** 4 módulos dejan de leer la cuenta vieja a mano; el Gist puede subir una cuenta distinta de la de la pantalla. **Si entra:** el respaldo queda coherente. **Si sale mal:** solo afecta el camino sin `<select>` con valor; el test `t19c` cubre el caso "solo la clave nueva", que antes devolvía vacío. **`MIGRATION_MODE` no se toca**: pasarlo a `move` dejaría mudos a los 4 a la vez |
| **T20-c — foto local antes de sobrescribir por el Gist** | `hb120` (mergeada) | `4413c34`, `d06c8d7` | **Listo, sin probar por Pablo.** Ajustes → Gist → "Sincronizar desde la nube": el cartel cambió. **Si das Cancelar**, antes ponía "sincronizada" y recargaba. Ojo: el HB#120 escribió que `GistSync` no está montado en ningún HTML y es FALSO (ALERT-184: el grep se corrió sobre `js/`); el botón existe, es `#gistDownloadBtn` en `index.html` |

**Nada más esperando aprobación.** El Tramo F (`cacheClear` con `dryRun`,
`c04496e`/`a330d30`, merge `86b351a`) ya NO va acá: quedó absorbido por el botón
de liberar caché, que es su único caller.

| Feat | Rama | Commits | Por qué NO es candidato |
|---|---|---|---|
| Idea 61 Tramo 3 — el espejo medido en comportamiento por los 4 pares | `idea61t3-espejo-4pares` (borrada) | `905dc77` / merge `5c80ae5` | **Es código de test.** No toca `js/`, no cambia ninguna pantalla. Mergeado para que el equipo no lo repita mal |
| HB#136 · arnés de la escena 2 (solo Strikes) | `hb136-escena2` | `d12ab8b` | **Es una red de test, no una feature.** Es la precondición que el Reviewer pidió dos veces antes de tocar T14/T15; nada en pantalla, es el suelo debajo de features que sí van a venir |

## Decisiones tomadas por Pablo

| Fecha | Feat | Commits | Decisión |
|---|---|---|---|
| 2026-10-04 | Armería Legendaria — 12 módulos nuevos, 36 archivos, 1994 KB | `c0471e0` (incluye el árbol de fabricación de HB#141 `539f410` / `9f3b097`) | **AUTORIZADO** en producción. Pablo lo probó y confirmó que todo funciona. No tocar. |
| 2026-09-30 | Raid Tracker — ala 9 "Nexus of Eternity", boss Vloxx | `57008ae` | **AUTORIZADO** en producción. Autorización retroactiva; Pablo lo revisó. No tocar. |
| 2026-09-30 | Solitary Throne CM daily tracker | `392c3b9` | **EN PRODUCCIÓN, SIN VERIFICAR.** No revertir ni modificar hasta que se verifique. |
| 2026-09-30 | Idea 2 — wallet-dashboard columnas Personajes/AP/Raids | `07e4c64` | **REVERTIDO** de producción. Autorizado por Pablo y revertido con `a1a53c4`. Sigue en `agents/main`. |