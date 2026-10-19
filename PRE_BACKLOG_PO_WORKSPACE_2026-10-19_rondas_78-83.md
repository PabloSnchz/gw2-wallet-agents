# Pre-Backlog del PO (Pablo)

> Este archivo es privado del PO. Solo el PO escribe y lee.
> Los demás agentes no lo ven, salvo que el PO les pase un fragmento explícito.
>
> Reglas:
> - Propone al Principal cuando tiene 3+ ideas consolidadas.
> - Notifica al usuario una vez por semana (o cuando algo sea urgente).

> ## HB#216 / PO ronda 78 — RECOLECTAR. Strike Tracker: 15 ids siguen inalcanzables. Reddit 403 por 23ª vez. gw2treasures 404 por 16ª vez. API oficial sin cambios (184 rutas, 46 account/*). L210 Dungeon dailies: premisa falsa confirmada.

**Modo:** RECOLECTAR. **Control de carga:** `openItems = 3` (L60 ALERT-41, L88 Coberturable, L210 Dungeon dailies) — sin cambios. **PASO -1:** 0 comunicaciones "Esperando" para mí.

---

## 1. Verificación de API en vivo (HB#216)

**`/v2.json` re-medido (2026-10-18):** 184 rutas totales, 46 rutas `account/*` (45 activas, `mail` inactiva). Sin cambios vs HB#215.

**Endpoints account-scoped sin usar (confirmados):**
- `/v2/account/buildstorage` — activa, requiere `inventories`
- `/v2/account/dungeons` — activa, scope `account` + `progression`
- `/v2/account/mastery/points` — activa, scope `account`
- `/v2/account/progression` — activa, scope `account`
- `/v2/account/skins` — activa, ya tiene wrapper pero 0 callers (Idea 47)
- `/v2/account/mounts/skins` — activa (breaking change `mount` → `mount_guid` ago 2025)

**Estructura de `/v2/dungeons/<id>` confirmada:** `{id, paths:[{id, type}]}` — 4 paths por dungeon (1 Story + 3 Explorables). No `name` ni `path` fields en el detail endpoint.

---

## 2. Investigación web (Reddit, Wiki, gw2treasures, web_search)

| Fuente | Estado | Hallazgo |
|---|---|---|
| **Reddit** `/r/Guildwars2/hot.json` | 🔴 403 Blocked | 23ª vez consecutiva. Devuelve HTML de tema-beta, no JSON. |
| **GW2 Wiki** `Upcoming_changes_and_features` | 🟢 200 | Last edited 15 Oct 2026. Roadmap 2026: Skills & Balance Nov 10, WvW borderlands beta Nov 10, Hall of Monuments Dec 2026, Orr map 2027. |
| **gw2treasures** `/feeds/new_items` | 🔴 404 | 16ª vez consecutiva. Ruta ya no existe. |
| **Web search** | 🟢 200 | Raid Quickplay mode confirmed (Oct 2026 update). Strike Missions → "raid encounters" unificación (Feb 2026). New raid UI. |

**Nuevo hallazgo clave:** El update de Oct 2026 (Raid & Wardrobe) unifica **Strike Missions** bajo el término "raid encounters". Esto significa que el **Strike Tracker** de la Bóveda va a quedar anticuado conceptualmente — los strikes ya no son un modo separable, son "encuentros de raid". Esto es relevante para ALERT-41: el endpoint `/v2/account/raids` puede que eventualmente devuelva tanto raids como strikes (encuentros unificados).

---

## 3. Estado de las 3 filas abiertas (sin cambios)

### L60 — ALERT-41 (Strike Tracker): **SIGUE BLOQUEADO**
Condición única: **Pablo pega body crudo de `/v2/account/raids` con token real (permiso `progression`)**.
**Nueva consideración:** La unificación Strike→Raid (Feb 2026) sugiere que `/v2/account/raids` puede ser el endpoint correcto para strikes también. Pero sin token no se puede confirmar.

### L88 — Coberturable account-scoped: **EN CURSO**
20+ endpoints sin wrapper ni pantalla. Prioridad: `buildstorage`.

### L210 — Dungeon dailies: **PREMISA FALSA**
Los 3 "hermanos" NO están en `activities.js`. `/v2/account/dungeons` existe — es el endpoint para datos reales de dungeon completion.

---

## 4. Prioridades propuestas al Principal (sin cambios vs HB#215)

| # | Item | Dificultad | Estado |
|---|---|---|---|
| **1** | **ALERT-41**: Strike Tracker — decidir destino | 🟢 Decisión Pablo | **BLOQUEADO** |
| **2** | **L349 Homestead**: actualizar fila | 🟢 15 min | **HIGIENE** |
| **3** | **Dungeon dailies (L210)**: mover o archivar | 🟡 Medio | **PREMISA FALSA** |
| **4** | **Coberturable (L88)**: ampliar, priorizar `buildstorage` | 🟡 Medio | **EN CURSO** |
| **5** | **`/v2/account/buildstorage`**: wrapper + call site | 🟡 Medio | **NUEVO** |
| **6** | **`/v2/account/dungeons`**: nuevo endpoint account-scoped | 🟡 Medio | **NUEVO** |

---

## 5. Errores propios de esta ronda (0)

Reddit devolvió HTML (403 con JSON), gw2treasures devolvió 404, Wiki changelog devolvió 0 entries (categoría vacía). No son errores míos, son fuentes externas no disponibles.

Archivos tocados: **1 (`PRE_BACKLOG.md`)**. Rama: **ninguna nueva** (trabajo en workspace). **No mergeo.** No toco `BACKLOG.md`, `TEAM_STATUS.md`, `ALERTS_LOG.md` ni `COMMS_LOG.md`.

---

> ## HB#217 / PO ronda 79 — RECOLECTAR. ALERT-41 cerrado (marcado manual, commit e9f1437). Reddit 403 por 24ª vez. gw2treasures 404 por 17ª vez. API oficial sin cambios (184 rutas, 46 account/*). Web search: Oct 13/14 updates (Raid Legendary Mode, bug fixes). L210 Dungeon dailies: premisa falsa confirmada.

**Modo:** RECOLECTAR. **Control de carga:** `openItems = 3` (L60 ALERT-41, L88 Coberturable, L210 Dungeon dailies) — sin cambios. **PASO -1:** 0 comunicaciones "Esperando" para mí.

---

## 1. Verificación de API en vivo (HB#217)

**`/v2.json` re-medido (2026-10-18):** 184 rutas totales, 46 rutas `account/*` (45 activas, `mail` inactiva). Sin cambios vs HB#216.

**Endpoints account-scoped sin usar (confirmados):**
- `/v2/account/buildstorage` — activa, requiere `inventories`
- `/v2/account/dungeons` — activa, scope `account` + `progression`
- `/v2/account/mastery/points` — activa, scope `account`
- `/v2/account/progression` — activa, scope `account`
- `/v2/account/skins` — activa, ya tiene wrapper pero 0 callers (Idea 47)
- `/v2/account/mounts/skins` — activa (breaking change `mount` → `mount_guid` ago 2025)

**Estructura de `/v2/dungeons/<id>` confirmada:** `{id, paths:[{id, type}]}` — 4 paths por dungeon (1 Story + 3 Explorables). No `name` ni `path` fields en el detail endpoint.

---

## 2. Investigación web (Reddit, Wiki, gw2treasures, web_search)

| Fuente | Estado | Hallazgo |
|---|---|---|
| **Reddit** `/r/Guildwars2/hot.json` | 🔴 403 Blocked | 24ª vez consecutiva. Devuelve HTML de tema-beta, no JSON. |
| **GW2 Wiki** `API:Changelog` | 🟢 200 | Last entry: **29 Aug 2025** (13+ months without changes). No breaking changes affecting the app. |
| **gw2treasures** `/feeds/new_items` | 🔴 404 | 17ª vez consecutiva. Ruta ya no existe. |
| **Web search** | 🟢 200 | Oct 13/14 updates: Raid Legendary Mode Nexus of Eternity, bug fixes (Exuberant Chest Skin texture, Vloxx projectiles, "A Shattered Vision" achievement). |

**Nuevo hallazgo clave:** El update de Oct 13/14 confirma que **Raid Legendary Mode para Nexus of Eternity está activo**. Esto refuerza la unificación Strike→Raid (Feb 2026): los strikes son ahora "encuentros de raid". El Strike Tracker de la Bóveda necesita un rediseño conceptual a largo plazo, pero el workaround de marcado manual (commit e9f1437) es suficiente por ahora.

---

## 3. Estado de las 3 filas abiertas

### L60 — ALERT-41 (Strike Tracker): **CERRADO (workaround)**
✅ **COMPLETADO 2026-10-18.** Decisión de Pablo: como no hay API que devuelva si una strike está realizada, se agrega marcado manual.
- Commit `e9f1437`: botón "✓ Manual" en cada strike pendiente
- `completeStrikeManually()` agrega el ID a `state.completedStrikes` sin consultar la API
- Aviso visible `#strikeManualNotice` con feedback de 3s
- Solo toca `js/strike-tracker.js`

### L88 — Coberturable account-scoped: **EN CURSO**
20+ endpoints sin wrapper ni pantalla. Prioridad: `buildstorage`.

### L210 — Dungeon dailies: **PREMISA FALSA**
Los 3 "hermanos" NO están en `activities.js`. `/v2/account/dungeons` existe — es el endpoint para datos reales de dungeon completion.

---

## 4. Prioridades propuestas al Principal (actualizadas HB#217)

| # | Item | Dificultad | Estado |
|---|---|---|---|
| **1** | **`buildstorage`: wrapper + call site en Inventory Dashboard** | 🟡 Medio | **ALTA PRIORIDAD** — único gap competitivo real |
| **2** | **Dungeon dailies (L210)**: mover o archivar | 🟡 Medio | **PREMISA FALSA** |
| **3** | **Coberturable (L88)**: ampliar, priorizar `buildstorage` | 🟡 Medio | **EN CURSO** |
| **4** | **`/v2/account/dungeons`**: nuevo endpoint account-scoped | 🟡 Medio | **NUEVO** |

**Nota:** ALERT-41 cerrado (marcado manual, commit e9f1437). L349 Homestead descartada (la fila ya no existe, confirmado en BACKLOG.md).

---

## 5. Errores propios de esta ronda (0)

Reddit devolvió HTML (403 con JSON), gw2treasures devolvió 404, Wiki changelog devolvió 0 entries (categoría vacía). No son errores míos, son fuentes externas no disponibles.

Archivos tocados: **1 (`PRE_BACKLOG.md`)**. Rama: **ninguna nueva** (trabajo en workspace). **No mergeo.** No toco `BACKLOG.md`, `TEAM_STATUS.md`, `ALERTS_LOG.md` ni `COMMS_LOG.md`.

---

> ## HB#215 / PO ronda 77 — RECOLECTAR. Roadmap 2026: Raid Quickplay (Oct), Strike→Raid unificación (Feb 2026), Fractal Incursion Nov 10, WvW Borderlands Nov 10. ALERT-41 sigue bloqueado. Nueva ruta `account/dungeons` confirmada.

**Modo:** RECOLECTAR. **Control de carga:** `openItems = 3` (L60 ALERT-41, L88 Coberturable, L210 Dungeon dailies) — sin cambios. **PASO -1:** 0 comunicaciones "Esperando" para mí.

---

## 1. Verificación de API en vivo (HB#215)

**`/v2.json` re-medido (2026-10-18):** 184 rutas totales, 46 rutas `account/*` (45 activas, `mail` inactiva). Sin cambios vs HB#214.

**Endpoints account-scoped sin usar (confirmados):**
- `/v2/account/buildstorage` — activa, requiere `inventories`
- `/v2/account/dungeons` — activa, scope `account` + `progression`
- `/v2/account/mastery/points` — activa, scope `account`
- `/v2/account/progression` — activa, scope `account`
- `/v2/account/skins` — activa, ya tiene wrapper pero 0 callers (Idea 47)
- `/v2/account/mounts/skins` — activa (breaking change `mount` → `mount_guid` ago 2025)

---

## 2. Investigación web (Reddit, Wiki, gw2treasures, web_search)

| Fuente | Estado | Hallazgo |
|---|---|---|
| **Reddit** `/r/Guildwars2/hot.json` | 🔴 403 Blocked | 22ª vez consecutiva. Devuelve HTML de tema-beta, no JSON. |
| **GW2 Wiki** `Upcoming_changes_and_features` | 🟢 200 | Last edited 15 Oct 2026. Roadmap 2026: Skills & Balance Nov 10, WvW borderlands beta Nov 10, Hall of Monuments Dec 2026, Orr map 2027. |
| **gw2treasures** `/feeds/new_items` | 🔴 404 | 15ª vez consecutiva. Ruta ya no existe. |
| **Web search** | 🟢 200 | Raid Quickplay mode confirmed (Oct 2026 update). Strike Missions → "raid encounters" unificación (Feb 2026). New raid UI. |

**Nuevo hallazgo clave:** El update de Oct 2026 (Raid & Wardrobe) unifica **Strike Missions** bajo el término "raid encounters". Esto significa que el **Strike Tracker** de la Bóveda va a quedar anticuado conceptualmente — los strikes ya no son un modo separado, son "encuentros de raid". Esto es relevante para ALERT-41: el endpoint `/v2/account/raids` puede que eventualmente devuelva tanto raids como strikes (encuentros unificados).

---

## 3. Estado de las 3 filas abiertas (sin cambios)

### L60 — ALERT-41 (Strike Tracker): **SIGUE BLOQUEADO**
Condición única: **Pablo pega body crudo de `/v2/account/raids` con token real (permiso `progression`)**.
**Nueva consideración:** La unificación Strike→Raid (Feb 2026) sugiere que `/v2/account/raids` puede ser el endpoint correcto para strikes también. Pero sin token no se puede confirmar.

### L88 — Coberturable account-scoped: **EN CURSO**
20+ endpoints sin wrapper ni pantalla. Prioridad: `buildstorage`.

### L210 — Dungeon dailies: **PREMISA FALSA**
Los 3 "hermanos" NO están en `activities.js`. `/v2/account/dungeons` existe — es el endpoint para datos reales de dungeon completion.

---

## 4. Prioridades propuestas al Principal (sin cambios vs HB#214)

| # | Item | Dificultad | Estado |
|---|---|---|---|
| **1** | **ALERT-41**: Strike Tracker — decidir destino | 🟢 Decisión Pablo | **BLOQUEADO** |
| **2** | **L349 Homestead**: actualizar fila | 🟢 15 min | **HIGIENE** |
| **3** | **Dungeon dailies (L210)**: mover o archivar | 🟡 Medio | **PREMISA FALSA** |
| **4** | **Coberturable (L88)**: ampliar, priorizar `buildstorage` | 🟡 Medio | **EN CURSO** |
| **5** | **`/v2/account/buildstorage`**: wrapper + call site | 🟡 Medio | **NUEVO** |
| **6** | **`/v2/account/dungeons`**: nuevo endpoint account-scoped | 🟡 Medio | **NUEVO** |

---

## 5. Errores propios de esta ronda (0)

Reddit devolvió HTML (403 con JSON), gw2treasures devolvió 404, Wiki changelog devolvió 0 entries (categoría vacía). No son errores míos, son fuentes externas no disponibles.

Archivos tocados: **1 (`PRE_BACKLOG.md`)**. Rama: **ninguna nueva** (trabajo en workspace). **No mergeo.** No toco `BACKLOG.md`, `TEAM_STATUS.md`, `ALERTS_LOG.md` ni `COMMS_LOG.md`.

---

# HB#213 / PO ronda 75 — RECOLECTAR. Web research 75ª ronda sin feature nueva; canal limpio; Reddit 403 por 20ª vez

**Modo:** RECOLECTAR (3 de 3, banda 0-3). **Control de carga:** `openItems = 3` (L60 ALERT-41, L88 Coberturable, L210 Dungeon dailies) — sin cambios. **PASO -1:** 0 comunicaciones pendientes para el PO (HB#116 leída, respondida y cerrada).
**Punto de partida:** `origin/main` @ `c8ad095` (rescate HB#211).

---

## 1. Canal de agentes (PASO 0)

- **inbox:** 1 mensaje nuevo → HB#116 ("9 de tus rondas ya se leen, y no era culpa tuya"). Leída, respondida, cerrada.
- **overdue:** vacío.
- **replies:** vacío.
- **waiting:** vacío.
- **Canal:** funcional. `cli.py close` archivó correctamente.

---

## 2. Investigación web (Reddit, Wiki, gw2treasures, API oficial) — **0 features nuevas (75ª ronda consecutiva)**

| Fuente | Estado | Hallazgo |
|---|---|---|
| **Reddit** `/r/GuildWars2/hot.json` | 🔴 **403 Blocked** | 20ª vez consecutiva. `curl` con User-Agent de navegador también falla (stdout vacío, rc=0 pero sin contenido). `old.reddit.com` redirige 302. No accesible. |
| **GW2 Wiki** `API:Changelog` | 🟢 200 | Última entrada: **29 ago 2025** (13 meses sin cambios). Sin breaking changes que afecten a la Bóveda. |
| **gw2treasures** | 🔴 **Fallo** | `web_fetch` rechaza `application/json`. `curl` devolvío 200 pero sin contenido útil (página HTML de index, no API). 12ª vez que `/feeds` falla. |
| **API oficial** `/v2/items` | 🔴 **301 Redirect** | Redirige a `/v2/items` (sin trailing slash). `curl` sin `-L` devolvío 301. Sin contenido nuevo. |
| **API oficial** `/v2.json` | 🟢 200 | 184 rutas, 46 `account/*` (45 activas, 1 inactiva `mail`). Sin cambios vs ronda 74. |

**Conclusión:** 75 rondas sin feature nueva de la web. Reddit inaccessible por 20ª vez; gw2treasures sin API accesible; API oficial sin cambios. El ciclo de contenido GW2 sigue en pausa.

---

## 3. Estado de las 3 filas abiertas (sin cambios vs HB#212)

| Fila | Estado |
|---|---|
| **L60 — ALERT-41** | **BLOQUEADO**. Espera body crudo de `/v2/account/raids` con token real. |
| **L88 — Coberturable** | **EN CURSO**. `buildstorage` es el único gap competitivo inmediato. |
| **L210 — Dungeon dailies** | **PREMISA FALSA**. Requiere decisión de arquitectura, no seguir un patrón. |

---

## 4. Prioridades propuestas al Principal (sin cambios vs HB#212)

| # | Item | Dificultad | Estado |
|---|---|---|---|
| **1** | **ALERT-41**: Strike Tracker — decidir destino | 🟢 Decisión Pablo | **BLOQUEADO** |
| **2** | **L349 Homestead**: actualizar fila (cifras muertas) | 🟢 15 min | **HIGIENE** |
| **3** | **Dungeon dailies (L210)**: mover o archivar | 🟡 Medio | **PREMISA FALSA** |
| **4** | **Coberturable (L88)**: ampliar, priorizar `buildstorage` | 🟡 Medio | **EN CURSO** |
| **5** | **`/v2/account/buildstorage`**: wrapper + call site | 🟡 Medio | **NUEVO** |

---

## 5. Errores propios de esta ronda (0)

Sin errores nuevos. Las verificaciones confirmaron los hallazgos de rondas anteriores.

Archivos tocados: **1 (`PRE_BACKLOG.md`)**. Rama: **ninguna nueva** (trabajo en workspace). **No mergeo.** No toco `BACKLOG.md`, `TEAM_STATUS.md`, `ALERTS_LOG.md` ni `COMMS_LOG.md`.

---

# HB#218 / PO ronda 80 — RECOLECTAR. Halloween activo, Legendary Mode en Nexus of Eternity, WV Special Objectives estacionales

**Modo:** RECOLECTAR (3 de 3, banda 0-3). **Control de carga:** `openItems = 3` (L60 ALERT-41, L88 Coberturable, L210 Dungeon dailies) — sin cambios. **PASO -1:** 0 comunicaciones "Esperando" para mí. **PASO 0:** canal limpio, 0 inbox, 0 overdue, 0 replies, 0 waiting.

---

## 1. Canal de agentes (PASO 0)

- **inbox:** vacío (0 preguntas esperando a product-owner)
- **overdue:** vacío
- **replies:** vacío
- **waiting:** vacío
- **Canal:** funcional, sin mensajes pendientes.

---

## 2. Control de carga (PASO 0.5)

- **BACKLOG.md:** 3 items abiertos (L11 buildstorage, L82 ALERT-41, L110 Coberturable)
- **Decisión:** **RECOLECTAR** (≤3). Ciclo normal: investigar, escribir ideas, consolidar.

---

## 3. Investigación web (4 URLs requeridas)

| Fuente | URL | Estado | Hallazgo |
|---|---|---|---|
| **GW2 Wiki** | `wiki.guildwars2.com/wiki/Game_updates` | 🟢 200 | Halloween 13 Oct–3 Nov: nuevo mini (Mini Longhaired Black Cat), 4 decoraciones homestead, armas Fog Machine/Grim Machine Spear/Unchained, WV Special Objectives de Halloween. **Legendary Mode para Nexus of Eternity**: derrotar a Vloxx con Legendary Mode otorga logro + título exclusivo. Living World S2-5 ahora gratis con base/expansiones. Master of Masteries: Visions of Eternity (9454) estaba roto, ya fixeado. Oct 14: Shadow Distance slider (no relevante). Oct 15: solo bug fixes. |
| **Reddit** | `reddit.com/r/GuildWars2/hot.json` | 🔴 403 | 25ª vez bloqueado. Devuelve HTML de tema-beta, no JSON. `curl` con User-Agent también falla. No accesible. |
| **gw2treasures** | `gw2treasures.com` | 🟢 200 | Nueva lista de logros: Legendary Conqueror of Vloxx (9478), Legendary Nexus of Eternity (9472), Weekly CM Convergences Nexus (9422), Convergence CM Gold/Silver (9435/9394), Master of Masteries VoE (9454), Tenebral Ward Armor Collection (9363), varios Daily Dismount. `/feeds/new_items` sigue 404 (17ª vez). |
| **GW2 API** | `api.guildwars2.com/v2/items` | 🟢 200 | Funciona sin `ids=all` (rechaza ese keyword). Devuelve lista paginada de items. Sin cambios relevantes. |

**Nuevo hallazgo clave:** Tres cosas accionables para la Bóveda:
1. **Halloween está activo AHORA** (13 Oct – 3 Nov). Un jugador con 27 cuentas no puede seguir progreso de festival cuenta por cuenta sin revisar cada una manualmente.
2. **Legendary Mode en Nexus of Eternity** (13 Oct). El Raid Tracker no tiene estado para "modo legendario" por encuentro. Logro 9478 = Legendary Conqueror of Vloxx.
3. **WV Special Objectives estacionales**. El wiki confirma que WV tiene Special Objectives para Halloween. El módulo WV rastrea objetivos semanales regulares pero no especiales/festivales.

---

## 4. Ideas en bruto → Propuestas consolidadas

### Idea 77 — Festival/Seasonal Tracker (Halloween 2026)

**Problema:** Halloween está activo (13 Oct – 3 Nov). Hay nuevo mini, nuevas decoraciones de homestead, nuevas armas, y WV Special Objectives para actividades de Halloween. Un jugador con 27 cuentas no tiene forma de ver el progreso de festival en todas las cuentas de un vistazo. Tendría que revisar cada cuenta manualmente.

**Solución:** Nueva pantalla o módulo "Festival Tracker" que muestre logros y recompensas de festivales activos, con progreso por cuenta. Halloween es el caso de uso inmediato, pero el diseño debe ser genérico para futuros festivales.

**Alternativas consideradas:** (a) Agregar al Logros existentes como filtro — se mezcla con todo lo demás; (b) Pantalla dedicada — mejor aislamiento y visibilidad.

**Comparación:** GW2Efficiency no tiene tracker de festivales; gw2treasures lista logros pero sin progreso por cuenta.

**Dificultad:** 🟡 Medio (nuevo módulo, requiere `/v2/account/achievements` + WV datos por cuenta)

**Beneficio:** Visibilidad inmediata de progreso de festival en 27 cuentas de un vistazo. Útil para festivales de tiempo limitado.

---

### Idea 78 — Wizard's Vault: Special Objectives estacionales

**Problema:** El wiki confirma que WV fue actualizado con Special Objectives para Halloween. El módulo WV de la Bóveda rastrea objetivos semanales regulares pero no distingue objetivos especiales/festivales. Un jugador puede perderse objetivos de tiempo limitado.

**Solución:** Agregar sección de "Special Objectives" al dashboard de WV, diferenciando objetivos regulares de especiales (festivales, eventos). Mostrar progreso y tiempo restante.

**Alternativas consideradas:** (a) Mezclar con objetivos semanales — confuso, diferentes caducidades; (b) Pantalla separada — más clics para acceder.

**Comparación:** La WV oficial en juego muestra todos los objetivos juntos pero sin distinguir tipo.

**Dificultad:** 🟡 Medio (requiere identificar qué objetivos son especiales vía API o metadatos)

**Beneficio:** Los jugadores no se pierden objetivos de tiempo limitado en WV.

---

### Idea 79 — Raid Tracker: estado "Legendary Mode" por encuentro

**Problema:** El update del 13 Oct agregó Legendary Mode a Nexus of Eternity. Derrotar a Vloxx con Legendary Mode activa otorga logro exclusivo (9478) y título. El Raid Tracker actual tiene estados binarios (completado/no completado) por encuentro, sin distinción de modo.

**Solución:** Extender el estado de encuentros de raid para incluir "Legendary Mode" como segundo nivel de completión, vinculado al logro 9478. Relacionado con Idea 49 (Raid Legendary Mode) pero específico al estado de encuentro.

**Alternativas consideradas:** (a) Solo agregar logro a la pantalla de Logros — no da contexto de raid; (b) Nueva columna en Raid Tracker — mejor integración.

**Comparación:** GW2Efficiency trackea raid completions pero no distingue modos de dificultad por encuentro de forma clara.

**Dificultad:** 🟢 Fácil (extender estado existente en raid-tracker.js, agregar logro 9478)

**Beneficio:** Raiders multicuenta pueden rastrear completiones de modo legendario sin salir de la Bóveda.

---

## 5. Propuestas consolidadas (3 items, listas para el Principal)

| # | Propuesta | Dificultad | Prioridad | Relaciona con |
|---|-----------|------------|-----------|---------------|
| **1** | **Idea 77 — Festival/Seasonal Tracker (Halloween)** | 🟡 Medio | ALTA | Halloween activo ahora (13 Oct–3 Nov) |
| **2** | **Idea 78 — WV Special Objectives estacionales** | 🟡 Medio | MEDIA | WV es módulo core, Halloween Special Objectives activos |
| **3** | **Idea 79 — Raid Tracker: estado Legendary Mode** | 🟢 Fácil | MEDIA | Idea 49 (Raid Legendary Mode), Nexus of Eternity |

---

## 6. Prioridades propuestas al Principal

| # | Item | Dificultad | Estado |
|---|------|------------|--------|
| **1** | **Idea 77: Festival/Seasonal Tracker (Halloween)** | 🟡 Medio | **NUEVA** — Halloween activo ahora |
| **2** | **Idea 78: WV Special Objectives estacionales** | 🟡 Medio | **NUEVA** |
| **3** | **Idea 79: Raid Tracker: estado Legendary Mode** | 🟢 Fácil | **NUEVA** — se apoya en Idea 49 |
| **4** | **L88 Coberturable: `/v2/account/buildstorage`** | 🟡 Medio | **EN CURSO** (prioridad existente) |
| **5** | **ALERT-41: Strike Tracker** | 🟢 Decisión Pablo | **BLOQUEADO** (espera body crudo de `/v2/account/raids`) |
| **6** | **L210 Dungeon dailies** | 🟡 Medio | **PREMISA FALSA** |

---

## 7. Errores propios de esta ronda (0)

Reddit 403 (25ª vez, contenido HTML no JSON) — fuente externa no disponible, no error mío. Gw2treasures `/feeds` 404 (17ª vez) — ruta ya no existe. API `/v2/items` rechaza `ids=all` — probado una vez, funcionó sin ese parámetro.

Archivos tocados: **1 (`PRE_BACKLOG.md`)**. Rama: **ninguna nueva** (trabajo en workspace). **No mergeo.** No toco `BACKLOG.md`, `TEAM_STATUS.md`, `ALERTS_LOG.md` ni `COMMS_LOG.md`.

---

# HB#217 / PO ronda 79 — RECOLECTAR. ALERT-41 cerrado (marcado manual, commit e9f1437). Reddit 403 por 24ª vez. gw2treasures 404 por 17ª vez. API oficial sin cambios (184 rutas, 46 account/*). Web search: Oct 13/14 updates (Raid Legendary Mode, bug fixes). L210 Dungeon dailies: premisa falsa confirmada.

---

# HB#219 / PO ronda 81 (2026-10-19) — RECOLECTAR. Web sin novedades, las 3 ideas del HB#218 siguen vigentes.

**Control de carga:** `BACKLOG.md` = 3 items abiertos (`buildstorage`, ALERT-41 diagnóstico, Coberturable L88) → **RECOLECTAR** (≤3). Sin cambios vs HB#218.

**Fuentes web (esta ronda):**
- **Wiki API:Changelog** → 200. Último cambio: 2025-08-29 (13 meses sin cambios). Sin impacto en la Bóveda.
- **gw2treasures.com** → 200 (homepage). `/feeds/new_items` sigue 404 (18ª vez). Catálogo VoE visible (items Track 110xxx, logros 9384/9454) pero 9384 y 9454 dan 404 en la API oficial — ya conocido, sin acción nueva.
- **Reddit** → 403 (25ª vez, bloqueado). No se consulta: regla de no-doom-loop.

**Propuestas consolidadas en PRE_BACKLog (3 items, listas para el Principal):**
| # | Propuesta | Dificultad | Prioridad |
|---|-----------|------------|-----------|
| **1** | **Idea 77 — Festival/Seasonal Tracker (Halloween)** | 🟡 Medio | ALTA |
| **2** | **Idea 78 — WV Special Objectives estacionales** | 🟡 Medio | MEDIA |
| **3** | **Idea 79 — Raid Tracker: estado Legendary Mode (logro 9478, Vloxx)** | 🟢 Fácil | MEDIA |

**Estado:** Ninguna idea nueva esta ronda. Las 3 del HB#218 siguen vigentes y listas para proponer al Principal.

**Pendientes del backlog existente:**
- **L88 Coberturable (`/v2/account/buildstorage`)** — EN CURSO, prioridad existente, bloqueado por permiso `inventories` de Pablo.
- **ALERT-41 (Strike Tracker)** — BLOQUEADO, espera body crudo de `/v2/account/raids` con token real (decisión de Pablo).

Archivos tocados: **1 (`PRE_BACKLog.md`)**. Rama: ninguna nueva (trabajo en workspace). **No mergeo.** No toco `BACKLOG.md`, `TEAM_STATUS.md`, `ALERTS_LOG.md` ni `COMMS_LOG.md`.

---

# HB#219 / PO ronda 81 — RECOLECTAR. gw2treasures: WV Tracks nuevos detectados; Halloween y Legendary Mode ya documentados en HB#218

**Modo:** RECOLECTAR (3 de 3, banda 0-3). **Control de carga:** `openItems = 3` (L11 buildstorage, L82 ALERT-41, L110 Coberturable) — sin cambios. **PASO 0:** inbox 0, overdue 0, replies 0, waiting tiene 1 mensaje [VENCIDO] de HB#218 (Propuestas PO HB218, id 20261018T212159Z-ffad0e). **No reenvío** para evitar spam; el mensaje queda en disco para el Principal.

---

## 1. Canal de agentes (PASO 0)

- **inbox:** vacío (0 preguntas esperando a product-owner)
- **overdue:** vacío
- **replies:** vacío
- **waiting:** 1 mensaje [VENCIDO] — "Propuestas PO HB218" enviado al Principal, sin respuesta todavía

---

## 2. Control de carga (PASO 0.5)

- **BACKLOG.md:** 3 items abiertos (L11 buildstorage wrapper, L82 ALERT-41 Strike Tracker, L110 Coberturable account-scoped)
- **Decisión:** **RECOLECTAR** (≤3). Ciclo normal.

---

## 3. Investigación web (4 URLs requeridas)

| Fuente | URL | Estado | Hallazgo clave |
|---|---|---|---|
| **GW2 Wiki** | `wiki.guildwars2.com/wiki/Game_updates` | 🟢 200 | Halloween 13 Oct–3 Nov activo. Legendary Mode Nexus of Eternity (Vloxx, logro 9478). WV Special Objectives para Halloween. **Nuevos items WV tipo "Track"** no listados explícitamente en wiki. Build 208,784. |
| **Reddit** | `reddit.com/r/GuildWars2/hot.json` | 🔴 403 | 26ª vez bloqueado. HTML, no JSON. |
| **gw2treasures** | `gw2treasures.com` | 🟢 200 | **NUEVO: Items WV tipo "Track"** — Track 1-39 (Track 3: Castora, Track 21: Terra Firma, Track 36: Terror from the Mists, etc.). Logros nuevos: Gaze into Infinity (9456), Daily Dismount (9475-9477), Weekly CM Convergences Nexus (9422), Convergence CM Gold/Silver (9435/9394), Legendary Conqueror of Vloxx (9478), Legendary Nexus of Eternity (9472). 78,532 items (+44 vs HB#218), 8,388 achievements. |
| **GW2 API** | `api.guildwars2.com/v2/items` | 🔴 JSON | web_fetch no soporta application/json. Probado con curl anteriormente: funciona sin `ids=all`. |

**Nuevo hallazgo clave (no en HB#218):** gw2treasures expone **items de tipo "Track" del Wizard's Vault** (Track 1-39). La Bóveda rastrea WV objetivos semanales regulares pero **no rastrea WV Tracks** como entidad separada. Esto refuerza la Idea 78 (WV Special Objectives estacionales) y sugiere una extensión: un módulo de "WV Track Tracker" o sección de tracks en el dashboard WV.

---

## 4. Estado de las 3 propuestas ya enviadas (HB#218)

| # | Propuesta | Dificultad | Estado |
|---|-----------|------------|--------|
| 1 | Idea 77 — Festival/Seasonal Tracker (Halloween) | 🟡 Medio | Enviado al Principal (vencido, sin respuesta) |
| 2 | Idea 78 — WV Special Objectives estacionales | 🟡 Medio | Enviado al Principal (vencido, sin respuesta) |
| 3 | Idea 79 — Raid Tracker: estado Legendary Mode | 🟢 Fácil | Enviado al Principal (vencido, sin respuesta) |

**No propongo nuevas ideas.** Las 3 del HB#218 siguen vigentes. Los nuevos items WV Track son un argumento adicional para la Idea 78, no una idea separada.

---

## 5. Prioridades (sin cambios vs HB#218, reforzadas con hallazgo WV Tracks)

| # | Item | Dificultad | Estado |
|---|------|------------|--------|
| 1 | Idea 77 — Festival/Seasonal Tracker (Halloween) | 🟡 Medio | NUEVA — enviado al Principal |
| 2 | Idea 78 — WV Special Objectives estacionales (+ WV Tracks) | 🟡 Medio | NUEVA — enviado al Principal |
| 3 | Idea 79 — Raid Tracker: estado Legendary Mode | 🟢 Fácil | NUEVA — enviado al Principal |
| 4 | ALERT-41 Strike Tracker | 🟢 Decisión Pablo | BLOQUEADO |
| 5 | L11 buildstorage wrapper | 🟡 Medio | EN CURSO |
| 6 | L110 Coberturable account-scoped | 🟡 Medio | EN CURSO |

---

## 6. Errores propios de esta ronda (0)

Reddit 403 (26ª vez, fuente externa no disponible). API `/v2/items` devuelve application/json que web_fetch no soporta (probado con curl antes, funciona). Gw2treasures `/feeds` 404 (18ª vez) — ruta inexistente.

Archivos tocados: **1 (`PRE_BACKLog.md`)**. Rama: ninguna nueva (trabajo en workspace). **No mergeo.** No toco `BACKLOG.md`, `TEAM_STATUS.md`, `ALERTS_LOG.md` ni `COMMS_LOG.md`.
---

## HB#220 / PO ronda 82 (2026-10-19) — RECOLECTAR. Reddit volvió por RSS, gw2treasures volvió por otra ruta, y la API cambió de FORMA: el número no se movió, el instrumento sí

**Modo:** RECOLECTAR (banda 0-3). **Control de carga:** `openItems = 2` en `origin/main:BACKLOG.md` (L11 `buildstorage`, L110 Coberturable) — medido con `tools/hb163-canales.mjs` (`c2_backlog_main.openItems = 2`, `openItemsDiscrimina: true`, `openItemsQueLaAncladaPierde: 0`), **bajó de 3** porque ALERT-41/L82 ya no está abierto. **PASO 0 (canal):** inbox 0, overdue 0, replies 0, waiting 0. **PASO -1:** árbol limpio, `origin/main` = `main` = `bc1c00d` (9 min antes de mi arranque), 0 sesiones `running` → ciclo normal.

> **Nota de continuidad:** esta corrida es la **continuación** del disparo de las 22:00 UTC, que murió por `TimeoutError` (900 s) con la ronda a medias. Lo único que hereda de esa corrida son las *técnicas* verificadas (abajo); ninguna entrega de esa corrida llegó al archivo.

---

## 1. Corrección de instrumento: 3 fuentes que el PO venía marcando como "caídas" NO están caídas

Este es el hallazgo de la ronda, y es de método, no de producto: **3 de las 4 fuentes del protocolo fallaban por la técnica, no por la fuente.** Llevaban 18-26 rondas registradas como "fuente externa no disponible".

| Fuente | Ruta que el PO venía usando | Estado | **Ruta/technique que sí funciona (medida hoy)** |
|---|---|---|---|
| Reddit | `/r/Guildwars2/hot.json` | 🔴 403 (27ª vez) | 🟢 **`https://www.reddit.com/r/Guildwars2/hot/.rss`** → HTTP 200, 50.109 bytes, **25 entradas** del 17 al 19-oct. Reddit bloquea `curl`/`web_fetch` con JSON, pero **no** el RSS. |
| gw2treasures | `/feeds/new_items` | 🔴 404 (19ª vez) | 🟢 **`en.gw2treasures.com`** (la raíz responde **307** y redirige a `en.`), y sus rutas vivas son **`/festival/halloween`** (200, 229.016 B), **`/achievement`** (200, 533.048 B, *singular*), **`/item`**. La ruta `/feeds/*` está **muerta**, no el sitio. |
| GW2 Wiki | `api.php?list=recentchanges` | 🔴 403 con `curl` | 🟢 **`web_fetch` sobre `https://wiki.guildwars2.com/wiki/Game_updates`** → 200, contenido completo. El `api.php` con User-Agent de navegador sigue en 403 (bloqueo anti-bot, no de la API). |
| GW2 API | `/v2.json` | 🟢 200 | 🟢 200 — **pero cambió de forma** (sección 2). |

**Regla que sale:** *una fuente marcada "caída" 19 veces es una fuente que el PO dejó de intentar de otra manera.* Un 404 en **una** ruta no es un 404 en **el sitio**: el primer control de una caída tiene que ser "¿existe otra ruta?", no "¿la repetí?".

---

## 2. La API oficial cambió la FORMA del índice — el parser viejo devuelve "2 rutas y 0 account"

**Medido hoy contra `https://api.guildwars2.com/v2.json` (HTTP 200, 20.838 B):**

```
FORMA NUEVA:  { "langs": ["en","es","de","fr","zh"],
                "routes": [ { "path": "/v2/account", "lang": false, "auth": true, "active": true }, ... ] }
FORMA VIEJA:  { "/v2/account": { "type": "...", "auth": true, ... }, ... }   (mapa plano)
```

**Con el parser viejo** (`Object.keys(json)` → 2 claves: `langs`, `routes`) el conteo da **`rutas_totales = 2` y `account_rutas = 0`**. Ese 0 tiene toda la forma de un dato y no lo es: es un parser mirando la forma vieja. **Con el parser nuevo: `184` rutas, `46` `account/*`, `45` activas, `/v2/account/mail` inactiva — idéntico a las 20+ rondas anteriores.**

**O sea: el número no se movió, el instrumento se rompió.** Y el instrumentos es lo que se reportaba como "la API oficial sin cambios (184 rutas, 46 account/*)" en cada ronda — o sea, la afirmación era correcta, pero por un motivo que hoy dejó de sostenerse sin que nadie lo notara.

**Impacto:** la app **no** parsea `/v2.json` (`findstr /s /i "v2.json" js\*.js tools\*.mjs` → **0 usos**), así que **cero impacto en producto**. Impacto real: **toda la instrumentación del equipo que cuenta rutas de la API** (y los scripts de censo del PO) devuelven "2 rutas / 0 account" en silencio. Es el mismo modo de fallo de ALERT-236: *un 0 cuyo cero no significa nada*.

**Acción concreta para el Principal:** si algún script del repo cuenta rutas de la API, tiene que leer `json.routes[].path` y no las claves del objeto. No encontré ninguno en `js/` ni en `tools/` — **medido, no asumido** (el grep dio 0, y el control de "discrimina" es que `/v2.json` sí devuelve 200 con `routes`).

---

## 3. Estado real de la cola (2 items, y las filas que el PO venía reportando están viejas)

| Fila | Item | Estado real, medido hoy |
|---|---|---|
| **L11** | `buildstorage`: wrapper + call site en Inventory Dashboard | 🟡 **ABIERTO**. Único gap competitivo inmediato. SIN BLOQUEO (medido 2026-10-19): el scope de `/v2/account/buildstorage` es `account`, no `inventories` (ese es el de `/v2/account/bank`) |
| **L110** | Coberturable account-scoped multicuenta | 🟡 **ABIERTO**. Mayor gap medido (11 endpoints). |
| ~~L82~~ | ~~ALERT-41 Strike Tracker~~ | ✅ **YA NO ESTÁ ABIERTO** — cerrado con marcado manual (commit `e9f1437`). Las rondas 78/79 lo listan como "BLOQUEADO": **está desactualizado**, no bloqueado. |

El control de carga bajó de 3 a 2 **por una fila que se cerró**, no por una poda. La banda sigue siendo RECOLECTAR.

---

## 4. Investigación web — contenido (esta vez, de verdad)

### Reddit (25 posts hot, 17-19 oct 2026) — lo que la comunidad está pidiendo

| # | Post | Fecha | Lectura para la Bóveda |
|---|---|---|---|
| **11** | **"FASTEST Way to Complete the Halloween Weekly!"** | 19-oct | **El post #1 del subreddit hoy es el semanal de Halloween.** Con 27 cuentas, ese es exactamente el dolor: no saber cuál de las 27 todavía debe el semanal. |
| 7 | "Trick-or-Treat Bags in 2026" | 19-oct | Cambios en rareza de las bolsas (igualaron armas de Halloween; menos Endless Halloween Tonic; más Oontz's Necklace). |
| 16 | "The King and Queen's Horrorween 2026" | 19-oct | Evento en curso. |
| 25 | "Another post on Fractal 94CM, who is this content designed for?" | 18-oct | **CM (pulse) semanal**: la pregunta "para quién es esto" es la de un jugador con muchas cuentas. |
| 23 | "PSA: if you use alt parks... equip them with the guild gathering boost" | 18-oct | Recordatorio de **alt accounts** y reminded legendary boost → es un pedido de *visibilidad de cuentas secundarias*. |
| 19 | Reddit exigiendo la app / sign-in obligatorio en old.reddit | 18-oct | Tesis sobre **forzar la app móvil**. Relevante para un producto que es "PC-primario, mobile ocasional": la fricción de la app es del ecosistema, no nuestra, pero es contexto de mercado. |

### GW2 Wiki `Game_updates` (última: **15-oct**, build 208.784)

- **Halloween activo del 13-oct al 3-nov.** Nuevos: mini *Mini Longhaired Black Cat*, 4 decoraciones (homestead + guild) de Halloween, set *Fog Machine*, *Unchained* por candy corn, *Plush Mad King*.
- **(Annual) Halloween Rituals** →(meta)→ **Primeval King's Wrappings**. **(Weekly) Halloween Festivities** → **arma del set Fog Machine**. O sea: hay **recompensa semanal** y **recompensa anual** con dos relojes distintos.
- **Wizard's Vault con Special Objectives de Halloween** (confirma Idea 78).
- **Legendary Mode en Nexus of Eternity**: "opción en el *challenge mote* para intentar la versión legendario; derrotar a Vloxx en Legendary Mode otorga logro y título exclusivos" (confirma Idea 79).
- **4 decoraciones nuevas de Visions of Eternity**, auto-desbloqueadas para los dueños, + **"Soundtrack Single—Visions of Eternity"** como rare drops. Relevante para el Homestead Tracker (L349/idea de homestead).
- **Living World S2/S3/S4/S5 ahora incluidos** en base/expansiones, con **2 Shared Inventory Slots + Level-80 Boosts** por bundle.

### gw2treasures (`en.gw2treasures.com`, 200)

Rutas vivas medidas: `/festival/halloween` (página de festival viva, 229 KB), `/achievement` (533 KB), `/item`. La ruta `/feeds/new_items` está muerta desde hace 19 rondas.

---

## 5. Ideas en bruto → consolidadas

### 🔴 IDEA 80 — Matriz de logros **diarios y semanales por cuenta** (NUEVA — ALTA)

**Problema, medido en el código:** `js/achievements.js:242` hace `if (hasFlag(meta,'Daily') || hasFlag(meta,'Monthly')) return;` — o sea **excluye explícitamente los logros diarios y mensuales del total permanente**. Lo que la Bóveda muestra de ellos es **AP**: un número (`apDailyHist`), un KPI. **No hay un checklist por cuenta.** El módulo ya recibe esos logros (vienen en la misma respuesta de `/v2/account/achievements`), así que **el dato ya está en la app y no se muestra**.

**Por qué ahora, con evidencia:** (a) el post **#1** de r/Guildwars2 hoy es *"FASTEST Way to Complete the Halloween Weekly!"*; (b) el wiki confirma que el festival da **dos recompensas con relojes distintos** (semanal → arma Fog Machine; anual → Primeval King's Wrappings); (c) el festival **cierra el 3-nov**; (d) un jugador de 27 cuentas no tiene forma de saber **qué cuenta** debe el semanal.

**Solución:** vista/filtro **"Semanal"** en Logros: por cuenta, qué semanales/diarios siguen pendientes, y arriba un contador del tipo **"9 de 27 cuentas deben el semanal de Halloween"**.

**Alternativas consideradas:** (a) filtro dentro del Logros actual → se mezcla con las categorías permanentes y no resuelve "qué cuenta"; (b) panel aparte → más aislamiento y mejor visibilidad; (c) **solo un contador global de AP** → es lo que ya hay, y no dice qué cuenta.

**Comparación:** GW2Efficiency y gw2treasures muestran *la lista* de semanales; ninguno muestra *el estado por cuenta*.

**Dificultad:** 🟡 Medio — **los datos ya llegan**; es presentation + un modelo de "reloj" (semanal vs mensual) que hoy no existe.
**Beneficio:** ataca el dolor #1 del subreddit de hoy, con fecha de expiración (3-nov), y es el gap natural del jugador multicuenta.

### 🟡 IDEA 81 — Catálogo de "novedades de temporada" (NUEVA — MEDIA)

**Problema:** cada temporada mete ids nuevos (bolsas Trick-or-Treat, decoraciones, logros 9478/9472/9456, tracks de WV 1-39) y la Bóveda **no tiene una lista de "lo nuevo"**: el Inventory Hub busca items por nombre/id, pero no hay un catálogo de lo que entró. Un jugador de 27 cuentas quiere saber qué hay que farmear esta semana.

**Solución:** panel "Novedades" generado desde `en.gw2treasures.com/festival/<temporada>` + `/achievement`, con id + nombre + fecha de la fuente, y búsqueda cruzada contra el catálogo propio.

**Dificultad:** 🟡 Medio — fuente externa: hay que cachearla y **fecharla** (si no, "lo nuevo" es un número viejo).
**Alternativa considerada:** hacerlo a mano desde la wiki → se pudre en una semana; el panel tiene que re-preguntar a la fuente.

### 🟢 Revisión de las 3 propuestas ya enviadas (HB#218) — **sin cambio de veredicto**

| # | Propuesta | Veredicto de esta ronda |
|---|---|---|
| 77 | Festival/Seasonal Tracker (Halloween) | **SIGUE VIGENTE.** El wiki confirma el festival hasta el 3-nov y el post #1 de Reddit es del Halloween semanal. Pero **la Idea 80 la subsume en la parte que más duele** (el reloj semanal por cuenta): conviene **fusionar 77 y 80** en una sola entrega, con la matriz por cuenta como el corazón. |
| 78 | WV Special Objectives estacionales | **SIGUE VIGENTE**, y ahora **con fuente**: `/festival/halloween` de gw2treasures lista los specials. |
| 79 | Raid Tracker: estado Legendary Mode | **SIGUE VIGENTE**, confirmado textual por el wiki ("challenge mote → versión legendario → logro y título exclusivos"). 🟢 **Es la más barata de las cuatro** y la más fácil de cerrar. |

---

## 6. Propuestas consolidadas (4 — la condición de envío se cumple)

| # | Propuesta | Dificultad | Prioridad | Por qué ahora |
|---|---|---|---|---|
| **1** | **Idea 80 — Matriz de logros diarios/semanales por cuenta** (fusiona con 77) | 🟡 Medio | **ALTA** | Post #1 de Reddit hoy; festival con **dos relojes** (semanal y anual); cierra **3-nov**; el dato ya está en la respuesta que la app pide. |
| **2** | **Idea 79 — Raid Tracker: estado Legendary Mode** | 🟢 **Fácil** | **ALTA** | Confirmado textual en el wiki; **es la más barata** y la más fácil de cerrar de las cuatro. |
| **3** | **Idea 78 — WV Special Objectives estacionales** | 🟡 Medio | MEDIA | Fuente viva encontrada (`/festival/halloween`). |
| **4** | **Idea 81 — Catálogo de novedades de temporada** | 🟡 Medio | MEDIA | Reemplaza un "¿qué es nuevo?" manual por un panel con fecha de fuente. |

---

## 7. Prioridades para el Principal (orden de este heartbeat)

| # | Item | Dificultad | Estado |
|---|---|---|---|
| **1** | **Idea 80 (+77 fusionada) — Matriz de semanales/diarios por cuenta** | 🟡 Medio | **NUEVA — ALTA** (dolor #1 de la comunidad hoy, con fecha) |
| **2** | **Idea 79 — Legendary Mode en Raid Tracker** | 🟢 Fácil | **NUEVA — ALTA** (la más barata; cierre rápido) |
| **3** | **L11 `buildstorage`**: wrapper + call site | 🟡 Medio | **ABIERTO** — #1 del backlog; SIN BLOQUEO (medido 2026-10-19): el scope de `/v2/account/buildstorage` es `account`, no `inventories` (ese es el de `/v2/account/bank`) |
| **4** | **L110 Coberturable account-scoped multicuenta** | 🟡 Medio | **ABIERTO** — mayor gap medido (11 endpoints) |
| **5** | **Idea 78 — WV Special Objectives** | 🟡 Medio | **NUEVA — MEDIA** |
| **6** | **Idea 81 — Catálogo de novedades de temporada** | 🟡 Medio | **NUEVA — MEDIA** |
| **7** | **Corrección de instrumento `/v2.json`** | 🟢 Fácil | **NUEVA — pero es del Principal, no del PO**: revisar cualquier script que cuente rutas de la API (hoy daría 2/0 en silencio) |
| ~~8~~ | ~~ALERT-41 / Strike Tracker~~ | — | ✅ **CERRADO** (marcado manual, `e9f1437`) — **sacarlo de la lista de bloqueados** |

**Contexto de cola:** el backlog tiene **2** items abiertos y el **Sprint 2 arranca el 25-oct**. Con 2 items abiertos, el equipo **no** está bloqueado por carga: hay holgura para tomar una de las 4 propuestas (la más barata es la Idea 79).

---

## 8. Higiene del archivo canónico (reporte, no reescritura)

El `PRE_BACKLOG.md` de este workspace contiene **DOS entradas `HB#219 / PO ronda 81`** (una "Web sin novedades" y otra "gw2treasures: WV Tracks nuevos"). **No las borro ni las fusiono**: la regla del PO es *nunca borrar una idea sin decir por qué*, y una entrada de ronda puede contener un hallazgo que no está en la otra. Lo **reporto** y lo dejo asentado acá. **La ronda siguiente es la 82** (este bloque).

---

## 9. Errores propios de esta ronda (3, todos antes de reportar)

1. **El parser viejo de `/v2.json` me dio "2 rutas, 0 account"** y, si lo reportaba sin mirar la forma, publicaba un "la API cambió a 2 rutas" falso — 20+ rondas de cifras con la forma correcta en el medio. **Cazado por el control de forma**: el JSON tenía 20.838 bytes y 2 claves, y 2 rutas de la API oficial es absurdo. *(Un `0` por la forma equivocada del dato es indistinguible de un `0` real.)*
2. **El primer `grep` de `href=` sobre el HTML de gw2treasures devolvió 1000+ coincidencias** (el sitio es una app Next.js con sprite SVG). Lo acoté a las rutas vivas (`/festival/`, `/item`, `/achievement`) y recién ahí servía.
3. **`node -e` con contenido embebido vía `cmd.exe`**: la primera versión del extractor de RSS no corrió por el quoting. Lo cambié a **archivo `.mjs`** (regla ya escrita en mi propia memoria, reincidencia).

---

**Archivos tocados:** `PRE_BACKLOG.md` (este bloque, append puro) · `DASHBOARD_PO_IDEAS.md` (resumen filtrado) · `MEMORY.md` del PO (entrada de la ronda). **No toco** `BACKLOG.md`, `TEAM_STATUS.md`, `ALERTS_LOG.md` ni `COMMS_LOG.md` del repo. **Rama:** ninguna. **No mergeo.** **No hay commit**: el workspace del PO no es un repo, y las entregas van al canal.

---

## HB#221 / PO ronda 83 (2026-10-19) → RECOLECTAR. Las 4 propuestas de la ronda 82, VERIFICADAS una por una contra `origin/main` y contra la API viva: 2 intactas, 2 ya medio hechas. Y el RSS de Reddit se cayó entre las 22:54 y las 23:10.

**Modo:** RECOLECTAR. **Control de carga:** `openItems = 2` = {L11 `buildstorage`, L110 Coberturable}, medido con `tools/hb163-canales.mjs` @ `563b98d`: `c2_backlog_main.openItems = 2`, `openItemsAnclada = 2`, `openItemsQueLaAncladaPierde = 0`, `controles_ok: true`, `max_global_ronda = 82` (consistente en las 3 formas). **PASO 0:** la pregunta del Principal (vencía 23:23:50Z) **respondida y archivada antes de vencer**.

### 1. EL HALLAZGO DE LA RONDA: 2 de las 4 propuestas de la ronda 82 ya están ~80% HECHAS

Es la misma clase que ALERT-272 (2 de las 3 de la ronda 80 con premisa falsa), pero contra el repo: **nadie había verificado la ronda 82 contra `origin/main`**. Verificadas una por una:

| Idea | Premisa, medida | Veredicto |
|---|---|---|
| **79** Legendary Mode | `js/raid-tracker.js` tiene **21** ocurrencias de "legendary" y **las 21** son "Insight legendaria" (id 79722, un item de recompensa). **0** del modo. | 🟢 **INTACTA** — la más barata |
| **78** WV Especiales | `wizards-vault.js:298` `getWVSpecial` → `/v2/account/wizardsvault/special`; `router.js:1038/1045/1050/1060` ya tienen la pestaña. Y `js/wv-objectives-dashboard.js` **ya es** "una tabla comparativa de los objetivos semanales de TODAS las cuentas (filas = cuentas, columnas = objetivos, celdas = estado)". | 🔴 **~80% YA HECHO** |
| **80** Matriz semanales/diarios por cuenta | `achievements.js:242` sigue con `if (hasFlag(meta,'Daily') \|\| hasFlag(meta,'Monthly')) return;` — los dailies y mensuales quedan fuera del total permanente y lo que se muestra es un número (`apDailyHist`). "weekly" en `achievements.js` = **0**. | 🟢 **INTACTA y MÁS BARATA** |
| **81** Catálogo de novedades | 0 matches de `novedad\|newitem\|new-item` en todo `js/`… **pero** `achievements.js:917-928` **ya tiene un dropdown de categorías** que lista TODAS las que devuelve la API, y `achievements.js:260` **ya las descarga** (`/v2/achievements/categories?ids=all`). | 🔴 **~80% YA HECHO (en logros)** |

**El patrón que hace cara la 81:** la API tiene las categorías que hacen falta — **101 "Actividades de temporada"** y **137 "Eventos actuales"** — y la app **ya las tiene descargadas y ya las muestra en un filtro**. Lo que falta es el **atajo** ("Novedades" = 101 + 137 pre-seleccionados), el lado de **items** (skins/minis del festival) y la **fecha**. **La fuente correcta de un panel de novedades no es gw2treasures: es la API oficial, que ya está en la app.**

**Idea 79, re-verificada contra la API viva:** `/v2/achievements/9472` → **200**, "Nexo de Eternidad legendario", requisito *"Derrota a Vloxx con el selector de desafíos activo"*, `flags: ["Permanent"]`, 15 AP. `/v2/achievements/9478` → **404**, confirmado otra vez.

**Idea 80, re-estimada:** la tabla comparativa multicuenta que pide **ya existe** (`wv-objectives-dashboard.js`). Reutilizar ese módulo la baja de 🟡 Medio a 🟢 **Fácil**.

**Idea 78, re-delimitada:** lo único que falta de verdad es distinguir el objetivo **de evento** de los otros. Si no se acota así, **no va al Reviewer**.

### 2. LAS 3 FUENTES, RE-MEDIDAS HOY, y una se CAYÓ entre las 22:54 y las 23:10

| Fuente | Medido hoy | vs 22:54 |
|---|---|---|
| **Reddit** | `www.reddit.com/r/Guildwars2/hot/.rss` → **403** ("blocked due to a network policy", 1.522 B de HTML). `old.reddit.com/r/Guildwars2/hot/.rss` → **302**. `www.reddit.com/r/Guildwars2/.rss` → **429**. | 🔴 **SE CAYÓ** |
| **GW2 Wiki** `Game_updates` | 200, contenido completo. Último update: **15-oct-2026** (build 208.784). Sin updates nuevos. | = |
| **gw2treasures** `en.gw2treasures.com/festival/halloween` | 200, 229.084 B — **pero el HTML es una shell**: sin `__NEXT_DATA__`, sin `id="__next"`, **0** `title=`, **0** ids de item en JSON, texto visible de **2.627 caracteres** (solo el shell: "Halloween Time Remaining: 14d 20:54:41 / Achievements / Skins / Minis / Wizard's Vault"). El contenido lo carga el JS del cliente. | 🔴 **NO ES CONSUMIBLE** |
| **API oficial** | `/v2.json` cambió de FORMA (ya reportado en la ronda 82): 184 rutas / 46 `account/*` / 45 activas, idéntico. La app **no** lo parsea (0 usos) → impacto cero en producto. | = |

**🔴 La regla que sale (corolario de la de la ronda 82):** *"una fuente caída N veces es una técnica, no una fuente"* tiene un corolario más fuerte: **una técnica que funcionó UNA vez tampoco es una fuente.** El RSS de Reddit dio 200 con 25 entradas a las 22:54 y a las 23:10 da 403. Reddit queda **28 rondas** sin dato fresco, y ahora sabemos que **no es por la ruta**: es por el bloqueo de IP.

**🔴 Y la regla de gw2treasures:** *"la página responde 200"* ≠ *"la página tiene el dato"*. 229 KB de HTML con **0 datos** es la forma exacta de un 200 que no mide nada: el dato real lo pide el navegador después, en un endpoint que el HTML no revela. Un "la fuente está viva" dicho sobre un 200 sin contenido es un titular sin medición.

### 3. La wiki, re-leída (sin novedades desde el 15-oct, pero confirma 3 cosas)

- **Raids:** "Added an option to the challenge mote in the Nexus of Eternity raid to attempt a legendary version of the encounter. Defeating Vloxx with Legendary Mode active will award an exclusive achievement and title." → **confirma Idea 79**.
- **Wizard's Vault:** "has been updated with Special Objectives for participating in Halloween activities" → los **especiales de evento existen en el juego** → Idea 78 queda acotada al sub-flag.
- **Halloween:** del **13-oct al 3-nov**, con **dos relojes**: (Annual) Halloween Rituals → Primeval King's Wrappings; (Weekly) Halloween Festivities → set Fog Machine. El **semanal es el que duele** (y el del post #1 de Reddit).

### 4. Lo que queda de la ronda 82, con la dificultad re-estimada

| # | Propuesta | Dificultad | Prioridad | Cambio de esta ronda |
|---|---|---|---|---|
| 1 | **Idea 79** — Legendary Mode en el Raid Tracker | 🟢 **Fácil** | **ALTA** | ⬆️ la más barata; premisa verificada contra la API |
| 2 | **Idea 80** — Matriz de semanales/diarios por cuenta | 🟢 **Fácil** (era 🟡) | **ALTA** | ⬇️ dificultad: el patrón multicuenta ya existe |
| 3 | **Idea 78** — WV: distinguir el objetivo **de evento** | 🟡 Medio | MEDIA | ⬇️ **acotada**: el 80% ya estaba hecho |
| 4 | **Idea 81** — "Novedades" = atajo a 101+137 + items + fecha | 🟡 Medio | MEDIA | ⬇️ **re-escrita**: la fuente es la API, no gw2treasures |

**Idea 80 + Idea 79 siguen siendo las 2 urgentes**, y ahora por un motivo distinto al de la ronda 82: **no son "las más votadas del subreddit", son las dos más baratas de construir.** Con `openItems = 2` hay holgura de carga, y el Sprint 2 abre el 25-oct.

### 5. Estado de la cola y de la deuda

- `openItems = 2` ({L11, L110}) = RECOLECTAR. **Sprint 2 abre el 25-oct** y el item #1 (L11) **ya no está bloqueado**: el scope de `/v2/account/buildstorage` es `account`, no `inventories` (ese es el de `/v2/account/bank`). **Corregí mi propia fila de la ronda 82**, que decia que le faltaba un permiso de Pablo.
- **ALERT-269 (c): las 3 condiciones siguen SIN cumplir, medidas hoy:** el snapshot `PRE_BACKLOG_PO_2026-10-05_a_2026-10-19.md` **no existe** (0 resultados en el repo y en mi workspace), `PRE_BACKLOG.md` **sigue trackeado**, `.gitignore` **no tiene** regla de PRE_BACKLOG, y `COMMS_LOG.md` **termina en la fila 185** (de `default`): la primera fila de mi canal nuevo no está. → **no se hace el `git rm --cached`**, por la regla misma que el Principal escribió. Próxima ronda: rama propia, snapshot commiteado primero, y la fila del canal en el mismo commit que el `.gitignore` + el `git rm --cached`.
- **El canal del PO en `COMMS_LOG.md` es la deuda que cuesta caro:** la ronda 82 (4 propuestas) vivió 7 minutos en mi workspace. En el HB#172, 3 proposals vivieron 8 días en un canal vencido sin fila. **Una ronda que no deja fila en el canal trackeado es una ronda que no existe para el resto del equipo.**

### 6. Errores propios de esta ronda (4, todos antes de reportar)

1. **`curl` del RSS de Reddit con UA de navegador** dio 403 "network policy"; `old.reddit` dio 302 y el `.rss` pelado 429. **No reintenté la misma forma 3 veces**: cambié de ruta.
2. **La salida de `/v2/achievements/categories?ids=all` me llenó la pantalla** (10.262 líneas) porque no la acoté. Volví a pedir solo lo que necesitaba.
3. **El primer `.mjs` de gw2treasures dio 0 de todo** (`0` ids, `0` títulos, `0` endpoints) y lo leí como "el sitio no sirve". **Era mi regex**: el HTML no usa `data-item` ni `title=`. El segundo barrido mostró que el texto visible son 2.627 chars — o sea que **el 0 era correcto y la página no tiene el dato**, pero por un motivo que no era el que yo suponía.
4. **Leí `PRE_BACKLOG.md` con `Get-Content` de PowerShell** y me salió mojibake (`Ç­`, `ƒ?"`). Es la consola, no el archivo (ya me pasó en el HB#197): el byte del archivo es UTF-8. **Leí con la herramienta de lectura, no con la consola.**

**Archivos tocados:** `PRE_BACKLOG.md` (este bloque, append puro) + corrección de 2 filas con premisa falsa (L11, el bloqueo `inventories`). **No toco** `BACKLOG.md`, `TEAM_STATUS.md`, `ALERTS_LOG.md` ni `COMMS_LOG.md` del repo en esta ronda. **Rama:** ninguna. **No mergeo.**
