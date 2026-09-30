# IN_PROGRESS.md — Feats en desarrollo

> Actualizado: 2026-09-30 (deploy-testables-2026-09-30)
> Mantenedor: Principal (default)
>
> **Clon canónico:** `C:\Mis Archivos\GW2 online\gw2-wallet-ligero` (tiene los 2 remotes: `origin`=produccion, `agents`=desarrollo). Existe un clon duplicado en `C:\repo` SIN remote `agents` y 5 commits atras — **no commitear ahi** (ALERT-17).

---

## Ramas activas

| Rama | Item | Iniciada | Estado | Notas |
|------|------|----------|--------|-------|
| `fix/concurrency-pool-phase2` | Idea 46 t1b — pool FASE 2 | 2026-09-30 | 🟡 **REDUNDANTE — no mergear** | El commit `d91888b` (sesion #38) DUPLICA `9a8262c`, que ya estaba en `agents/main`. Unico delta: baja `api-gw2.js?v=2.17.1` a `2.17.0` (una regresion). Verificado con `git diff`: `mapWithPool` ya esta en main. **Se puede borrar la rama.** |
| `feat/commerce-delivery-ui` | Commerce Delivery UI | 2026-09-29 | ✅ **CERRADA** — cherry-pick a `agents/main` @ `26a5aa7` | 3 commits aplicados limpios (1dde564, 5309344, 59798a1). Smoke test `tests/commerce-delivery.smoke.js` 8 OK / 0 FAIL. La rama queda 9 commits atras: **no mergear el tip, solo cherry-pick**. |
| `fix/theme-borderleft-shorthand` | borderLeft shorthand | 2026-09-29 | ✅ **CERRADA** — cherry-pick a `agents/main` @ `26a5aa7` | Commit `261b493`. Misma rama 9 commits atras: no mergear el tip. |
| `chore/heartbeat-30` | Sync de logs del Heartbeat #30 | 2026-09-29T18:00 | 🟢 Commiteada y pusheada a `agents/main` | VoE verification cerrado, 3 correcciones factuales al PO, decision C2 registrada, ALERT-13 a ALERT-17 nuevos. |
| `fix/fractal-rotation-hardcoded` | Rotacion de fractales desde JSON estatico | 2026-09-29 | ✅ **Pusheada** (316311d) | `assets/data/fractal-rotation.json` + `activities.js` v3.21.0. **NO mergeada a `agents/main`** — es pre-requisito de datos del Fractal Tracker (Idea 39). Revisar con el Reviewer antes de mergear. |
| `feat-fractal-tracker` (a crear) | **Idea 39 — Fractal Tracker multicuenta** | 2026-09-29 | 🟡 **APROBADA CON CAMBIOS por el Reviewer** (COMM 015, `task-d3355a858009` — su primera respuesta en 13 intentos). **Todavia NO iniciada.** | Orden obligatorio: (1) `js/fractal-data.js` como fuente unica de verdad (decision C2 en DECISIONS_LOG) + migrar `activities.js` a importarla; (2) recien ahi el tracker. Condiciones: C1 (sin badge de relics, no hay endpoint), C3 (instabilities = dato estatico de Wiki, no de API, en el IIFE, nada de localStorage), last-win **por-token** (no `_refreshSeq` global como raid/strike), `fractal-tracker-theme.js` desde el dia 1 sin `style=` inline. Scope: "instability usada esta semana" es IMPOSIBLE con los datos disponibles. 
| `feature/legendary-component-tracker` | feat-legendary-armory Phase 3 | 2026-09-26 | 🟡 En progreso (3/4 commits) — **144 commits atras de main** | Commit 1 (skeleton + render) ✅, Commit 2 (detail-modal) ⚠️ **NO esta en main**, Commit 3 (CSS 3-capas) ✅, Commit 4 (API integration) ⏳. `agents/main` tiene panel + ruta + `legendary-data.js` (206 items) pero **le falta `js/detail-modal.js`** y `render-catologo.js` no tiene ningun `addEventListener`: las cards del catalogo tienen `cursor:pointer` y no hacen nada (ALERT-30). Mergear el tip borraria 23 archivos. Solo cherry-pick. |
| `feature/homestead-tracker` | Homestead Decorator Tracker v0.1 | 2026-09-29 | 🔴 **WIP — invisible en la app** | `agents/main` tiene `js/homestead-tracker.js` (481 lineas) pero **`index.html` no lo referencia**: sin panel, sin nav, sin `<script>`. Es un archivo muerto. Ademas falta el icono `assets/icons/Cuentas/homestead-icon.png`. 53 commits atras de main: solo cherry-pick. |
| `fix/homestead-glyph-data` | Fix schema glyphs | 2026-09-29 | 🟢 Fix aplicado (18ef9a4) | Rama hija de `feature/homestead-tracker`. Corrige el schema de `/v2/homestead/glyphs` (devuelve strings, no objetos). NO mergeada: hereda el problema de wiring/icono de la rama padre. **Reviewer vuelve a estar disponible (HB#30)** — el bloqueo por timeout se levanto, queda la decision de ALERT-10. |

---

## Reglas

1. Solo se listan ramas activas (no mergeadas a main todavía).
2. Cuando una rama se mergea a main → se mueve a READY_FOR_PROMOTION.md.
3. Cuando una rama se descarta → se elimina de esta lista.
4. **Nunca mergear el tip de una rama atrasada.** Todas las ramas de este tabla estan 9-144 commits detras de `agents/main`; un `git merge` borraria trabajo mas nuevo (`homestead-tracker.js`, `luck-curve.js`, `fractal-tracker-theme.js`, 567 lineas de `wallet-dashboard.js`). Usar `git cherry-pick <commit>`.