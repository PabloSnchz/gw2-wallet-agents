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
| **Cuentas consistentes entre pestañas** (T19-c) | `feat-t19c-lectores-capa` (ya borrada, estaba en `main`) | `d32e054` | **Listo para probar.** 4 modulos dejan de leer la cuenta vieja a mano. El Gist puede subir una cuenta distinta de la de la pantalla. **Si entra:** el respaldo queda coherente. **Si sale mal:** solo afecta el camino sin `<select>` con valor; el test `t19c` cubre el caso "solo la clave nueva", que antes devolvia vacio. **No tocar `MIGRATION_MODE`**: pasarlo a `move` dejaria mudos a los 4 a la vez. |
| **Feat** | Nombre del feature |
| **Rama** | Rama donde vive |
| **Commits** | SHAs en `agents/main` |
| **Estado** | `Listo para probar` / `Probado` / (lo que Pablo decida) |

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

## Pendientes de decisión

_(vací)_

**Un feat está LISTO.** No es un pedido de promoción: queda anotado para que sepas que existe, y la decisión es tuya.

| Feat | Rama | Commits | Estado |
|---|---|---|---|
| **Idea 50 completa — el botón de liberar caché** (Tramos A-F: `cacheClear` con `dryRun`, el registro estático de 23 bases de API + 5 del WV, `keptBytes`, y un copy que solo afirma lo que sigue siendo cierto) | `feat-idea50-boton-cache` (mergeada y borrada) | `b43743b`, `70414d2`, `46b2d7f` / merge `950ea64` | **LISTO.** Veredicto del Reviewer: APROBADO CON CAMBIOS, los 2 bloqueantes (H1 título, H2 enumeración de `kept`) aplicados. **Sí cambia lo que Pablo ve**: es el primer botón que invoca `cacheClear`. Suite 793 aserciones / 0 FAIL, 29 de 29 archivos |

**Nada más esperando aprobación.** Los dos feats de la ronda anterior se anotan acá **para que sepas que existen**, no como pedido: ninguno de los dos cambia nada de lo que Pablo ve, así que promoverlos ahora sería mover código sin efecto visible.

| Feat | Rama | Commits | Por qué NO es candidato |
|---|---|---|---|
| Idea 61 Tramo 3 — el espejo medido en comportamiento por los 4 pares | `idea61t3-espejo-4pares` (borrada) | `905dc77` / merge `5c80ae5` | **Es código de test.** No toca `js/`, no cambia ninguna pantalla. Mergeado para que el equipo no lo repita mal |

**El Tramo F (`cacheClear` con `dryRun`, `c04496e`/`a330d30`, merge `86b351a`) ya NO va acá:** quedó absorbido por el botón de arriba, que es su único caller.

## Decisiones tomadas por Pablo

| Fecha | Decisión |
|-------|----------|
| 2026-09-30 | `57008ae` (Raid Tracker — ala 9 "Nexus of Eternity", boss Vloxx): **AUTORIZADO** en producción. Autorización retroactiva; Pablo lo revisó. No tocar. |
| 2026-09-30 | `392c3b9` (Solitary Throne CM daily tracker): **EN PRODUCCIÓN, SIN VERIFICAR**. No revertir ni modificar hasta que se verifique. |
| 2026-09-30 | `07e4c64` (Idea 2 — wallet-dashboard columnas Personajes/AP/Raids): **REVERTIDO** de producción. Autorizado por Pablo y revertido con `a1a53c4`. Sigue en `agents/main`. |