# PRE_BACKLOG.md — Ideas del Arquitecto (Discovery)

> Generado por el Arquitecto en sesión de Discovery.
> Fecha: 2026-10-21
> Fuente: GW2 API, GW2 Wiki, Reddit, gw2treasures

## IDEA 1: Wizards Vault Tracker (account-scoped)

**Prioridad:** ALTA
**Endpoint:** `/v2/account/wizardsvault` (daily, weekly, listings, special)
**Scope:** account
**Descripción:** La Bóveda del Gato Negro ya tiene Wizards Vault en el menú, pero no rastrea el progreso de las tareas diarias/semanales del Wizards Vault. Agregar un tracker que muestre:
- Tareas diarias completadas/pendientes
- Tareas semanales completadas/pendientes
- Listings disponibles (recompensas)
- Special objectives

**Por qué:** El Wizards Vault es contenido nuevo y recurrente. Los jugadores quieren saber qué les falta completar cada día/semana.

**Estimación:** 4-6h (wrapper + call site + UI)
**Bloqueado por:** Nada. El endpoint existe y es account-scoped.

---

## IDEA 2: Mounts Collection Tracker (account-scoped)

**Prioridad:** MEDIA
**Endpoint:** `/v2/account/mounts` (488 mounts) + `/v2/mounts` (catálogo)
**Scope:** account
**Descripción:** Agregar un tracker de monturas desbloqueadas vs totales, por tipo (Raptor, Springer, Skimmer, Jackal, Griffon, Roller Beetle, Warclaw, Skyscale, Siege Turtle, etc.). Similar al tracker de skins pero para mounts.

**Por qué:** Las monturas son un coleccionable importante. Los jugadores quieren ver qué les falta.

**Estimación:** 6-8h (wrapper + batch + UI + filtros)
**Bloqueado por:** Paginación de catálogo (batch de 100 como skins).

---

## IDEA 3: Nexus of Eternity Raid Legendary Mode Tracker

**Prioridad:** MEDIA
**Endpoint:** `/v2/achievements` (logros del raid legendary mode)
**Scope:** progression
**Descripción:** El Nexus of Eternity raid legendary mode se lanzó el 13 de octubre. Agregar tracking de los logros del raid legendary mode (similar al tracker de raids existente pero para la versión legendary).

**Por qué:** Contenido nuevo. Los jugadores que hacen raids quieren trackear su progreso en el legendary mode.

**Estimación:** 3-4h (agregar logros al tracker existente)
**Bloqueado por:** IDs de logros del legendary mode (verificar contra API).

---

## IDEA 4: Home Instance (Homestead) Tracker

**Prioridad:** BAJA
**Endpoint:** `/v2/account/homestead` (decorations, glyphs)
**Scope:** account
**Descripción:** Tracker de decoraciones y glyphs del homestead. Mostrar qué decoraciones has desbloqueado vs totales.

**Por qué:** Contenido de Visions of Eternity. Los jugadores quieren saber qué les falta para completar su homestead.

**Estimación:** 8-10h (wrapper + batch + UI)
**Bloqueado por:** Catálogo de decoraciones (paginación).

---

## IDEA 5: Collections Dashboard (dyes, titles, minis, finishers, gliders, outfits, novelties, emotes)

**Prioridad:** BAJA
**Endpoints:** `/v2/account/dyes`, `/v2/account/titles`, `/v2/account/minis`, `/v2/account/finishers`, `/v2/account/gliders`, `/v2/account/outfits`, `/v2/account/novelties`, `/v2/account/emotes`
**Scope:** account
**Descripción:** Un dashboard unificado de colecciones que muestre el progreso de todas las colecciones account-scoped en un solo lugar, con porcentaje de completado por categoría.

**Por qué:** Los jugadores quieren ver todo su progreso de colecciones en un solo lugar.

**Estimación:** 10-12h (8 wrappers + batch + UI unificada)
**Bloqueado por:** Paginación de catálogos.

---

## Notas

- Ideas promovidas al BACKLOG.md cuando hay 3+ ideas consolidadas.
- Ideas archivadas después de 2 semanas sin acción.
- Backlog máximo: 10 items.
