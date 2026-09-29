# DASHBOARD_PO_IDEAS.md — Ideas del PO para el dashboard

> Actualizado: 2026-09-29T19:00:00Z (Heartbeat PO #32 — 3 correcciones del Principal aceptadas, 1 idea DROP, 1 backlog cerrado)
> Mantenedor: PO (product-owner)
> Actualización: cada heartbeat PO (cada 2h)
>
> Este archivo es un espejo público filtrado del PRE_BACKLOG.md del PO (que vive en `C:\Users\psanc\.qwenpaw\workspaces\product-owner\PRE_BACKLOG.md`). Contiene solo las ideas que el PO decide mostrar en el dashboard.

---

## Top prioridades

> ⚠️ **Reordenado 2026-09-29 18:00 UTC.** El PO auditó la lista oficial de endpoints de `API:Main` contra los ~50 fetch reales de `js/`. Resultado: la Bóveda usa ~10 endpoints account-scoped de ~50 disponibles. Tres premisas del backlog anterior resultaron **falsas** (ver sección Correcciones).

| # | Idea | Dificultad | Estado | ETA |
|---|------|-----------|--------|-----|
| 🔴 0 | **Fix `meta.js`: endpoint `/v1/events` obsoleto** (ArenaNet lo marca deprecated desde megaservers). Ya existe `/v2/account/worldbosses` y `meta.js:230` lo usa | 🟢 Fácil | Bug real, no implementado | Inmediato |
| 🥇 1 | **Coleccionables account-scoped multicuenta** — 12 endpoints (`account/skins`, `outfits`, `finishers`, `minis`, `novelties`, `gliders`, `mailcarriers`, `mounts/skins`, `mounts/types`, `titles`, `dyes`, `home/cats`). Empezar por `skins` (10.632) | 🟡 Media | API confirmada, 0% implementado | Ahora |
| 🥇 2 | Fractal Tracker multicuenta (T1-T4+CM, instabilities, agony) — falta el 3er tipo de contenido instanciado | 🟡 Media | API parcial, patrón de raid/strike reusable | Ahora |
| 🥈 3 | **Commerce delivery**: ítems sin recoger de la caja del TP. La Bóveda ya lee buys/sells pero no `commerce/delivery` | 🟢 Fácil | API confirmada, no implementado | Próxima |
| 🥈 4 | **Dungeon dailies multicuenta** (`account/dungeons`, 8 mazmorras). Completa una familia que ya tiene WB + mapchests + dailycrafting | 🟢 Fácil | API confirmada, no implementado | Próxima |
| ⚠️ 5 | Desbloquear `homestead-tracker.js` (código muerto: 5 wrappers ausentes en api-gw2.js, sin wiring en index.html, schema de glyphs roto) | 🟡 | Bloqueado, estimación subestimada | Post-1 |
| 🥉 6 | New Items Awareness Feed (`gw2treasures.com`) | 🟢 Fácil | Validated, not implemented | Continuous |
| 4 | Mobile PWA (manifest.json + service worker) | 🟡 Media | CSS breakpoints done, PWA no | Post-Homestead |
| 5 | WvW Borderlands beta tracker | 🟡 Media | Not implemented | Nov 10 |
| 6 | Inventory cleanup tool (MetaForge WARDOGS competitive gap) | 🟡 Media | Not implemented | Post-Homestead |
| 7 | Goal tracking | 🟡 Media | Validated | — |
| 8 | Alt Roster Tracker | 🟡 Media | API limitation (no rested XP for alts) | — |

## 🔴 Correcciones del PO (2026-09-29 19:00 UTC) — acepto 3 del Principal, DROP 1 idea, cierro 1 item

El Principal (Desarrollo) respondió a mis heartbeats 16:00 y 17:00 con 3 correcciones factuales. **Las verifiqué yo mismo contra la API antes de aceptarlas.** Las 3 dan positivo: estaba equivocado.

| Mi afirmación previa | Verdad | Impacto |
|---|---|---|
| "Convergence Achievement Tracker" con IDs **9384 y 9454** | Ambos **no existen** (`/v2/achievements/9384` → `404 {"text":"no such id"}`). El set real es la **categoría 487**, 7 logros: 9349, 9394, 9405, 9409, 9422, 9435, 9447 | **Idea DROP** — y además es redundante: `achievements.js:255` ya carga `/v2/achievements/categories?ids=all` (360 categorías, la 487 incluida) y el filtro de categoría ya existe en el dropdown de logros |
| "`/v2/account/luck` no existe, no prometer la barra de Luck" | **Existe** (`401` sin token, no `404`). Ya implementado en `agents/main` @ `0cc5cb7` | Era mi **segundo** negative claim falso sobre un endpoint en 48h |
| Implícito: "4 achievements nuevos VoE" | 2 de los 4 eran IDs inventados/obsoletos. Venían de gw2treasures sin validar cada ID | El "Unknown Category" que reporté era un ID muerto, no un logro nuevo |

**Por qué importa más allá de esta idea:** los negative claims sobre la API bloquean features. Escribí en el heartbeat 18:00 la regla "toda afirmación negativa va con el comando que la desmintió" y **la violé yo 1 hora después**, sin ejecutar el `VERIFICATION NEEDED` que yo mismo había anotado. Sexta corrección en 48h. Aplico la regla con el comando pegado, sin excepción.

**Nota técnica (sin acción, solo registro):** las 4 categorías del CM Solitary Throne (78200/78572/78260/78613) todavía **no** están publicadas en `/v2/achievements/categories` (360 categorías). Nuestro código matchea por ID de logro, no por categoría → inmune. Anotado por si otro tracker agrupa por categoría.

### ✅ Backlog cerrado

**"VoE content integration verification" — COMPLETADO.** Solitary Throne CM (9423 T1, 9412 T2, 9373 T3, 9388 T4) verificados en producción (`activities.js:823-827`, scale 1+/26+/51+/76+). Nexus of Eternity en producción (`raid-tracker.js:121`, wing9.png, `.raid-expansion--voe`). Sale de la lista.

### 📌 Sobre estimaciones (⚠️ repetir error = no)

El Principal confirma mi propia corrección de las 16:00: **"skeleton-first" para homestead estaba subestimado**. Lo real son 5 wrappers en `api-gw2.js` + wiring en `index.html`/router + fix del schema de glyphs + ícono faltante. Lo escribí bien a las 16:00 y lo repetí como si fuera simple en la tabla de las 18:00.

**No lo repito con Fractals (#2, ya en Reviewer):** módulo nuevo + data estático de instabilidades + vista multicuenta es un sistema completo, no una extensión de `activities.js`. La estimación 🥇 "6-10h" es un piso, no un techo.

**Balance de este heartbeat:** 0 ideas nuevas, 1 DROP, 1 backlog cerrado, 3 correcciones aceptadas. El heartbeat con menos ideas y más valor — porque verificar mata ideas, y hoy maté la mía.

---

## 🔴 Correcciones del PO (2026-09-29 18:00 UTC) — 3 premisas falsas

Verificadas con `?access_token=INVALID`: **401 = el endpoint existe** (control negativo: `/v2/account/xyzzy123nonsense` → 404).

| Previa afirmación del PO | Verdad | Impacto |
|---|---|---|
| "`/v2/account/skins` no existe, la alternativa B queda **descartada**" | **SÍ existe** (401, documentado en `API:Main`). Era la mejor opción | Idea 38 invertida y subsumida en la nueva #1 |
| "Pets/mounts son 'por personaje, no account-scoped'" | Existen `account/mounts/types` y `account/mounts/skins` | Idea 40 subsumida en la nueva #1 |
| "`/v2/account/luck` no existe, no prometer la barra de Luck" | **Existe desde 2019-04-08** y ya está implementado en `agents/main` @ `0cc5cb7` (COMM 012) | Idea 40 reducida a solo "esencias sin consumir" (🟢) |

**Regla nueva del PO:** toda afirmación negativa sobre la API va acompañada del comando que la desmintió, o no se escribe. Un negative claim sin evidencia bloquea features.

**Nota técnica para implementar la #1:** `?ids=all` devuelve **HTTP 400** en `/v2/skins`, `/v2/items` y `/v2/achievements`. Hay que **paginar en lotes de 200**. Sí funciona en `/v2/currencies` y `/v2/colors` — no copiar ese patrón.

---

## Ideas pospuestas

| # | Idea | Razón |
|---|------|-------|
| — | Tracker de componentes de legendarias (Phase 3) | 🔴 Bloqueada — API GW2 no expone recetas con ingredients |
| — | Inventory item purpose journal | 🔴 Difícil — requiere integración wiki extensiva |
| — | API pública HTTP | ❌ Descartada — alto riesgo legal |
| — | Homestead daily node tracker | Descartada — existe "Collect All" in-game |
| — | Homestead layouts tracker | Descartada — no hay API para layouts específicos |

---

## ✅ Production Verification — RESUELTO (actualizado 2026-09-29 19:00 UTC)

> ⚠️ La tabla de las 06:00 quedó **SUPERSEDED**: marcó 🔴 URGENTE el CM de Solitary Throne como ausente de producción, y ya estaba resuelto. La promoción ocurrió entre las 06:00 y las 16:00.

| Feature | En production? | Verificación | Commit |
|---|---|---|---|
| Solitary Throne CM tracker | ✅ **SÍ** | `git show origin/main:js/activities.js \| findstr "9423"` → `SOLITARY_THRONE_CM_ACHIEVEMENTS` con 9423/9412/9373/9388, scale 1+/26+/51+/76+ | origin/main @ `392c3b9` |
| Nexus of Eternity raid (Wing 9) | ✅ **SÍ** | `raid-tracker.js:121` `nameEn: "Nexus of Eternity"`, wing9.png, clase `.raid-expansion--voe` | `57008ae` |
| VoE Convergence (cat 487) | ✅ SÍ | `achievements.js:255` carga categorías dinámicas (360, incluye 487) | — |
| Legendary tracker Phase 3 | ❌ NO | skeleton en `agents/main` | `35a0f5e` |
| Homestead tracker | ❌ NO | código muerto: 5 wrappers ausentes en `api-gw2.js`, sin wiring, schema de glyphs roto | `e855e67` |
| New Items Feed | ❌ NO | solo en `agents/main` (v3.20.0) | — |
| Mobile PWA | ❌ NO | manifest.json + sw.js no existen (CSS breakpoints sí) | — |
| PRIVACIDAD.md / DESARROLLADORES.md | ❌ NO | solo en `agents/main` | — |

**Regla del PO:** siempre `git fetch origin agents` antes de auditar producción. Auditar sobre refs stale me hizo marcar como urgente algo ya resuelto.

---

## ~~Production Verification (2026-09-29 06:00 UTC — CM Deadline Day)~~ — SUPERSEDED

<details><summary>Tabla histórica de las 06:00 (NO usar)</summary>
PO heartbeat verificó en vivo que el contenido crítico de Sept 29 NO está en producción:

| Feature | En production? | Detalle | Commit dev |
|---|---|---|---|
| Solitary Throne CM tracker | ❌ NO | `git show origin/main:js/activities.js | findstr "9423"` → NOT_FOUND. `git merge-base --is-ancestor 4b253b2 origin/main` → NOT_ON_MAIN. CM lanza TODAY. | 4b253b2 (agents/main) |
| Nexus of Eternity raid (Wing 9) | ✅ SÍ | In production | 8cc5fc6 |
| Nexus raid CM | ✅ Yes (likely) | Similar a Solitary Throne | 8cc5fc6 |
| Legendary tracker Phase 3 | ❌ NO | WIP en agents/main, no en production | bac5c67 |
| Legendary tracker legacy | ✅ SÍ | En achievements.js (v3.2.0) | 755ba01 |
| Homestead tracker | ❌ NO | WIP en feature/homestead-tracker | e855e67 |
| New Items Feed | ❌ NO | Only in agents/main | v3.20.0 |
| Mobile PWA | ❌ NO | manifest.json + sw.js no existen | CSS breakpoints only |
| PRIVACIDAD.md | ❌ NO | Only in agents/main | — |
| Dev docs (DESARROLLADORES.md) | ❌ NO | Only in agents/main | — |

**CRITICAL:** Solitary Throne CM tracker NOT in production. CM launches 2026-09-29.
Promotion AWAITING Pablo approval (COMM 008 escalado + channel_message enviado).
Reviewer en timeout #10 (platform bug). Proceeding by merit.
</details>

## Metadatos

- Total de ideas consolidadas: 14
- Viables (en backlog): 8
- Descartadas: 6 (+1 DROP en el heartbeat 19:00: Convergence Achievement Tracker)
- Cerradas/completadas: 1 (VoE content integration verification)
- Bloqueadas: 1 (Legendary component tracker — Phase 3)

---

## Reglas de actualización

El PO actualiza este archivo en cada heartbeat (cada 2h):

1. Actualizar el timestamp del header.
2. Reflejar cambios en las prioridades de ideas.
3. Agregar ideas nuevas si surgen.
4. Marcar como pospuestas las que salen del foco.
5. Commit + push a agents.
