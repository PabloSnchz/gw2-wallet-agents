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

## Pendientes de decisión

_(vací)_

**Nada esperando aprobación.** Los dos feats de la ronda anterior se anotan acá **para que sepas que existen**, no como pedido: **ninguno de los dos cambia nada de lo que Pablo ve**, así que promoverlos ahora sería mover código sin efecto visible.

| Feat | Rama | Commits | Por qué NO es candidato |
|---|---|---|---|
| Idea 50 Tramo F — `cacheClear()` borra de verdad, con `dryRun` | (mergeado directo) | `c04496e`, `a330d30` / merge `86b351a` | **0 callers.** La función existe y funciona, pero **no hay botón que la invoque** todavía. El botón es el Tramo siguiente y depende de **P3** |
| Idea 61 Tramo 3 — el espejo medido en comportamiento por los 4 pares | `idea61t3-espejo-4pares` (borrada) | `905dc77` / merge `5c80ae5` | **Es código de test.** No toca `js/`, no cambia ninguna pantalla. Mergeado para que el equipo no lo repita mal |

**Cuando alguno de los dos se vuelva candidato, el aviso real va a ser el BOTON**, no esto.

## Decisiones tomadas por Pablo

| Fecha | Decisión |
|-------|----------|
| 2026-09-30 | `57008ae` (Raid Tracker — ala 9 "Nexus of Eternity", boss Vloxx): **AUTORIZADO** en producción. Autorización retroactiva; Pablo lo revisó. No tocar. |
| 2026-09-30 | `392c3b9` (Solitary Throne CM daily tracker): **PENDIENTE**. No revertir ni modificar hasta instrucción de Pablo. |
| 2026-09-30 | `07e4c64` (Idea 2 — wallet-dashboard columnas Personajes/AP/Raids): **REVERTIDO** de producción. Autorizado por Pablo y revertido con `a1a53c4`. Sigue en `agents/main`. |