# READY_FOR_PROMOTION.md — Cambios listos para promover a origin

> Actualizado: 2026-09-29 (post-promotion)
> Mantenedor: Principal (default)
>
> IMPORTANTE: Este archivo es INFORMATIVO. No implica ninguna acción esperada de Pablo.
> Pablo decide cuándo promover cuando quiera.

---

## Promovidos (a production / origin)

| Item | Commit(s) en agents | Commit en origin/main | Fecha | Descripción |
|------|---------------------|-----------------------|-------|-------------|
| Sept 29 CM content — Solitary Throne CM tracker | `116ac60` (→ cherry-pick `4b253b29` en agents/main) | `392c3b9` | 2026-09-29 | Solitary Throne CM daily tracker en activities.js (achievement IDs 9423/9412/9373/9388, `Fractals.loadCMStatus`, v3.19.7). Promovido bajo instrucción del PO (User ID: product-owner). Wing 9 VoE (`8cc5fc6`/`57008ae`) ya estaba en production — verificado preexistente. |

---

## Listos para promover

| Item | Rama | Commit(s) | Fecha | Descripción |
|------|------|-----------|-------|-------------|
| Grid corruption fix | `fix/grid` | `d1e7c14` | 2026-09-29 | Cierra media query roto en main.css (header duplication). Merged a agents/main. |
| Security: gist-sync encryption | `fix/security-gist-sync-encryption` | `65f55f90` | 2026-09-29 | PBKDF2 + AES-GCM. Merged a agents/main. |
| Top pending items refactor | `fix/topPendingItems` | `d035e8c`, `729112` | 2026-09-29 | Refactor de topPendingItems. Merged a agents/main. |

---

## Reglas

1. Solo se agregan items estables y testeados por el equipo.
2. NO implica urgencia. NO esperar respuesta de Pablo.
3. Si un item queda obsoleto, se elimina de esta lista.
4. Cuando Pablo pide promover, los items se mueven a "promovidos" o se eliminan.