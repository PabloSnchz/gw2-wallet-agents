# READY_FOR_PROMOTION.md — Cambios listos para promover a origin

> Actualizado: 2026-09-29 00:23 UTC
> Mantenedor: Principal (default)
>
> IMPORTANTE: Este archivo es INFORMATIVO. No implica ninguna acción esperada de Pablo.
> El equipo NO espera respuesta. Pablo decide cuándo promover cuando quiera.
> * `57008ae` ya está en `origin/main` (VoE fue promovido desde origin vía PR #115).
>   Solo `4b253b2` (Solitary Throne CM) necesita ser cherry-picked a origin.

---

## Listos para promover

| Item | Rama | Commit(s) | Fecha | Descripción |
|------|------|-----------|-------|-------------|
| Sept 29 CM content | (branch deleted) | `4b253b2`, `57008ae`* | 2026-09-29 | Wing 9 VoE (raid-tracker, `57008ae` ya en origin) + Solitario Throne CM (activities, `4b253b2`). Cherry-picked a agents/main desde feature/cm-content-sept29. |
| Grid corruption fix | `fix/grid` | `d1e7c14` | 2026-09-29 | Cierra media query roto en main.css (header duplication). Merged a agents/main. |
| Security: gist-sync encryption | `fix/security-gist-sync-encryption` | `65f55f90` | 2026-09-29 | PBKDF2 + AES-GCM. Merged a agents/main. |
| Top pending items refactor | `fix/topPendingItems` | `d035e8c`, `729112` | 2026-09-29 | Refactor de topPendingItems. Merged a agents/main. |

---

## Reglas

1. Solo se agregan items estables y testeados por el equipo.
2. NO implica urgencia. NO esperar respuesta de Pablo.
3. Si un item queda obsoleto, se elimina de esta lista.
4. Cuando Pablo pide promover, los items se mueven a "promovidos" o se eliminan.