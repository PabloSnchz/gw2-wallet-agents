# READY_FOR_PROMOTION.md

> Inventario de feats/fixes listos para promocion a `origin/main`
> (produccion). El equipo NO promueve. Pablo debe solicitar
> explicitamente: "promove feat-X a origin" antes de cherry-pick.

## Feat 1: Sept 29 CM content — Listo

| Rama | Commits | Push | Detalle |
|------|---------|------|---------|
| `feature/cm-content-sept29` | `8cc5fc6`, `116ac60` | agents/main | Wing 9 VoE (raid-tracker) + Solitary Throne CM (activities) |

Cherry-pick: `8cc5fc6` + `116ac60` a `origin/main`

## Fix: Grid corruption — Listo

| Rama | Commits | Push | Detalle |
|------|---------|------|---------|
| `fix/grid` | `d1e7c14` | agents/main | Cierra media query roto en main.css (591/591 braces) |

Cherry-pick: `d1e7c14` a `origin/main`

## Feat: Legendary Armory Phase 1 — Parcial

| Rama | Commits | Push | Detalle |
|------|---------|------|---------|
| `feature/legendary-component-tracker` | `35a0f5e`, `bac5c67` | agents/main | Skeleton + Phase 3 Commits 1-3. Phase 3 Commit 4 en progreso. |

No cherry-pick hasta que Phase 3 Complete y Pablo test.

## Instrucciones para Pablo

1. Pablo prueba en gw2-wallet-agents Pages.
2. Pablo dice: "promove feat-sept-29-cm-content a origin"
3. Equipo cherry-picka los commits a origin/main
4. Pablo valida en gw2-wallet-ligero Pages

Recordatorio: el equipo NO propone promocion. Espera OK explicito.
