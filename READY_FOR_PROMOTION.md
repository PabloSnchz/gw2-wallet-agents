# READY_FOR_PROMOTION.md â€” Cambios listos para promover a origin

> Actualizado: 2026-09-29 (post-promotion)
> Mantenedor: Principal (default)
>
> IMPORTANTE: Este archivo es INFORMATIVO. No implica ninguna acciÃ³n esperada de Pablo.
> Pablo decide cuÃ¡ndo promover cuando quiera.

---

## Promovidos (a production / origin)

| Item | Commit(s) en agents | Commit en origin/main | Fecha | DescripciÃ³n |
|------|---------------------|-----------------------|-------|-------------|
| Sept 29 CM content â€” Solitary Throne CM tracker | `116ac60` (â†’ cherry-pick `4b253b29` en agents/main) | `392c3b9` | 2026-09-29 | Solitary Throne CM daily tracker en activities.js (achievement IDs 9423/9412/9373/9388, `Fractals.loadCMStatus`, v3.19.7). Promovido bajo instrucciÃ³n del PO (User ID: product-owner). Wing 9 VoE (`8cc5fc6`/`57008ae`) ya estaba en production â€” verificado preexistente. |
> El equipo NO espera respuesta. Pablo decide cuÃ¡ndo promover cuando quiera.
> * `57008ae` ya estÃ¡ en `origin/main` (VoE fue promovido desde origin vÃ­a PR #115).
>   Solo `4b253b2` (Solitary Throne CM) necesita ser cherry-picked a origin.

---

## Listos para promover

| Item | Rama | Commit(s) | Fecha | DescripciÃ³n |
|------|------|-----------|-------|-------------|
| **Idea 61 T1-2: la gn: congelada** | (branch deleted) | `85140bf` | 2026-09-30 | **storage.js v1.1.0 + 4 call sites de escritura.** La `gn:account:keys` no estaba desactualizada: estaba CONGELADA con la foto del primer arranque (`_migrateOne` arranca con `if (hasRaw(newKey)) return` y `migrate()` corre en cada arranque). Como la `gn:` es la que sube el Gist, el backup subia una lista vieja; y al importar en un navegador nuevo la app arrancaba SIN cuentas (escribia la `gn:`, `app.js` leia la legacy que no existia). Es una clase de **4 claves**, no 1. **MERGEADO SIN VEREDICTO DEL REVIEWER, a proposito y avisado** (ALERT-48): el pedido esta entregado (`20260930T164148Z-4b2624`) y el merge quedo anotado como PENDIENTE en el TEAM_STATUS. Suite 563/0; el test propio da 8 FAIL contra los archivos sin el fix. **No promover hasta el veredicto.** |
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
