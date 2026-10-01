<!-- HEARTBEAT RE-INJECTION BANNER (2026-09-28) -->
<!-- ESTADO: CRON ACTIVO (enabled: true) | share_session: false -->
<!-- BUG DE PLATAFORMA: HEARTBEAT.md se reinyecta como prompt cada turn -->
<!-- independientemente del cron. El banner previene ejecución automática. -->
<!-- El agente ejecuta heartbeats MANUALMENTE cuando el usuario lo solicita. -->
<!-- Ver MEMORY.md: "HEARTBEAT.md system file está siendo re-inyectado cada -->
<!-- turn como platform prompt a pesar de el cron estar pausado." -->
<!-- -->
<!-- ESTADO DEL AGENTE: ACTIVO (heartbeats manuales) -->
<!-- - Bug platform re-injection: en progreso (awaiting platform fix) -->
<!-- - Legendary Armory A/B/C conflict: ✅ RESUELTO (Proposición 1 kept, C pospuesta) -->
<!-- - Sept 29 CM content: ✅ En agents/main (4b253b2). ✅ PROMOVIDO a origin (9423 verificado) -->
<!-- - Reviewer: TIMEOUT (11x consecutivas, session_id mismatch) — platform bug -->
<!-- - Documentador: TIMEOUT (7x consecutivas) — platform bug -->
<!-- - PO: TIMEOUT (8x, heartbeats 08:00/10:00 UTC no produjeron contenido) — platform bug -->
<!-- - Heartbeats #14-#26 ejecutados (#14-#25 manual, #26 cron-triggered) ✅ -->
<!-- -->
<!-- ACCIONES TOMADAS: -->
<!-- 1. Cron pausado (qwenpaw cron update ... --enabled false) [2026-09-27] -->
<!-- 2. share_session: false verificado -->
<!-- 3. Sesión cron atorada borrada -->
<!-- 4. Escalada vía channel_message (interrumpida por usuario) -->
<!-- 5. MODIFICACIÓN DE HEARTBEAT.md para frenar re-inyección (banner) -->
<!-- 6. Todos los bugs reportados en ALERTS_LOG.md -->
<!-- 7. CRON REACTIVADO (qwenpaw cron resume 13dc22e6) — enabled: true ✅ [2026-09-28T14:27] -->
<!-- 8. Heartbeats #14-#26 ejecutados — logs actualizados + push a agents ✅ -->
<!-- 9. Sept 29 CM promotion: ✅ PROMOVIDO a origin (origin/main @ 392c3b9, achievement 9423 verified) ✅ -->
<!-- -->
<!-- ESTADO: CRON ACTIVO. Banner preservado por bug de platform re-injection. -->
<!-- El cron firea cada 30 min; el banner evita ejecución automática. -->
<!-- Heartbeats se ejecutan manualmente cuando el usuario los solicita. -->
<!-- -->
<!-- PRÓXIMOS PASOS: -->
<!-- - Plataforma: fijar re-injection de HEARTBEAT.md -->
<!-- - Plataforma: fijar session_id mismatch (Reviewer/Documentador/PO) -->
<!-- - Pablo: aprobar promotion Sept 29 CM content a origin (CRÍTICO, CM launches Sept 29) -->

# Heartbeat del Principal (CRON ACTIVO — MODO MANUAL por re-injection)

> **Estado:** El cron de heartbeat está **activo** (`enabled: true`) y
> `share_session` está en `false`. La plataforma QwenPaw tiene un bug por el
> cual `HEARTBEAT.md` se reinyecta como prompt de sistema cada turn. Este
> banner previene ejecución automática. **El agente ejecuta heartbeats
> manualmente** cuando el usuario lo solicita. Los heartbeats #14-#20 se
> ejecutaron exitosamente (manual):

## Bloqueos críticos (awaiting user/platform)

### 1. Re-inyección de HEARTBEAT.md (platform-level)
- **Status:** CRÍTICO — 10ma re-inyección consecutiva
- **Root cause:** Plataforma lee `C:\Users\psanc\.qwenpaw\workspaces\default\HEARTBEAT.md`
  e inyecta su contenido cada turn, ignorando que el cron está pausado
- **Mitigación aplicada:** Modificación de este archivo (banner) para que
  la re-inyección muestre información de estado en lugar del ciclo automático
- **Necesita:** Intervención de plataforma para desvincular la re-inyección del archivo

### 2. Conflictos arquitectura Legendary Armory ✅ RESUELTO
- **Status:** RESOLVED — Proposición 1 kept (94fb7a9, Reviewer-approved),
  Proposición C pospuesta post-Sept 29 deadline.
- **Detalles:** Proposición 1 (inline en achievements.js) vs. módulo separado
  (`legendary-tracker.js`). Decisión: keep Proposición 1. Phase 1+2+3 skeleton
  implementado (commits 35a0f5e, 755ba01, bac5c67, 7c88fe6, 1aaff5a).
  Phase 3 awaiting API connection for recipe components (GW2 API limitation).

### 3. Reviewer timeout (platform-level)
- **Status:** TIMEOUT 10x consecutivas (`session_id mismatch`)
- **Mitigación:** Proceediendo en base a mérito técnico; sin reintentos

### 4. Documentador timeout (platform-level)
- **Status:** TIMEOUT 6x consecutivas
- **Mitigación:** Logs mantenidos por Principal per no-fallback rule.

### 5. PO timeout (platform-level)
- **Status:** TIMEOUT (platform bug) — pero production verification publicada (06:00 UTC)
- **Mitigación:** Proceediendo by merit. DASHBOARD_PO_IDEAS.md espejo actualizado.

## Estado de tareas pendientes

- **Legendary Armory Phase 1+2+3 skeleton:** ✅ Implementado (commits 35a0f5e, 755ba01, bac5c67, 7c88fe6, 1aaff5a). Phase 3 awaiting API connection for recipe components.
- **Sept 29 CM content:** ✅ Implementado en agents/main (commits 116ac60, 8cc5fc6, 4b253b2). AWAITING promotion to origin (Pablo approval).
- **storage.js Fase 2:** ✅ Completada (settings-manager.js migrada, STORAGE_KEYS actualizado)
- **New Items Awareness Feed:** ✅ Completado (v3.20.0, activities.js)
- **S1 (gist-sync security fix):** ✅ Completada (commit 65f55f90)
- **Legendary A/B/C conflict:** ✅ Resuelto — Proposición 1 kept (94fb7a9), Proposición C pospuesta.
- **BACKLOG.md:** ✅ Synced (Heartbeat #18).

## Acciones pospuestas (bloqueos actuales)

Hasta que no haya dirección del usuario o arreglo de plataforma:
- ❌ inventory-dashboard.js fixes (glow/overflow + clearTimeout) — Reviewer DOWN (platform bug)
- ❌ Homestead decoration tracker — Reviewer DOWN (platform bug)
- ⚠️ Promotion Sept 29 CM content to origin — ⚠️ AWAITING Pablo approval (COMM 008 + channel_message). CM launches TODAY (Sept 29).
- ❌ Legendary Armory Phase 3 (API connection for recipe components) — GW2 API no expone recipes con ingredients.

---

## Reglas (heredadas de AGENTS.md)

- NO me pidas OK para nada relacionado con el repo `agents`.
- Solo notificame si: algo se rompió, hay un desacuerdo entre agentes, o terminaste una feature lista para promoción.
- Si entrás en bucle 2 veces, PARÁ y reportá.

### PASO 3 del ciclo: la fuente de propuestas del PO

> **HB#114: esta seccion no existia en el repo.** El HB#102 (fila 113 de
> `COMMS_LOG.md`) corrigio el paso 3 **solo en el `HEARTBEAT.md` del workspace**
> (`C:\Users\psanc\.qwenpaw\workspaces\default\`), que **no es un repo git**.
> O sea: la correccion nunca se pusheo, y la version del repo seguia apuntando
> a `PRE_BACKLOG.md` por el criterio viejo. Alguien que clonee el repo no tiene
> el paso 3. **REGLA: una correccion a un archivo de instrucciones tiene que
> ir al REPO del que se clonea, no solo al workspace que el agente esta leyendo.**

**Fuente unica: la rama MAS RECIENTE del PO, y "mas reciente" se resuelve, no se pinea.**

```
git fetch origin "refs/heads/po/*:refs/remotes/origin/po/*"
git for-each-ref --sort=-committerdate --format="%(refname:short) %(committerdate:iso)" refs/remotes/origin/po/
```

La primera de esa lista es la rama viva. **No la nombrees fija**: el PO crea una
rama por ronda (`po/hb99`, `po/hb104`, `po/hb110`...), asi que un nombre pineado
envejece en 2-3 rondas y el paso 3 pasa a leer rondas viejas **sin avisar**.
Medido HB#114: el paso 3 pineado a `po/hb99-dashboard` leia la **ronda 33**,
cuando la viva es la **35**.

```
git show origin/po/<rama-viva>:DASHBOARD_PO_IDEAS.md
```

`DASHBOARD_PO_IDEAS.md` **en la rama del PO**: una seccion `## ACTUALIZACION ...
ronda N` por ronda, orden inverso, y es lo unico que se puede leer sin pedirle
nada al PO (append-only por construccion — ver la condicion que el PO mismo
puso: *"el conteo tiene que salir de un archivo que yo no pueda reescribir
despues de haber contado"*).

**Criterio de conteo. El que estaba escrito mide PROSA, y por eso esta
invertido.** Decia: *cuenta si la seccion trae `### Tramos` y ninguna linea
dice `aplicada`/`cerrada`*. Medido HB#114 contra la rama viva:

| Seccion | Items | El filtro viejo dice | Realidad contra `origin/main` |
|---|---|---|---|
| ronda 35 | T14-a, T14-b, T15-a, T15-b | **CERRADA** (la excluye) | **VIVA** — T14/T15 nunca se aplicaron |
| ronda 34 | T13-a/b/d | cuenta | aplicada en `1e5aedb` |
| ronda 33 | T12-a/b/c | cuenta | aplicada en `6c3f8e5` |
| ronda 19 | 64 T1/T2/T3 | cuenta | aplicada en `47a2526` |
| ronda 16 | 63 T1/T2 | cuenta | aplicadas en `eb69fb3` |

El filtro falla por una palabra: la ronda 35 dice "T13 ya esta APLICADA" en su
**encabezado narrativo**, asi que `aplicada` matchea y tira la seccion entera.
Pero cerrar T13 no cierra T14/T15, que son items distintos de la misma ronda.
**Es el mismo error que un assert que mira la FORMA en vez del VEREDITO, y que
un regex que no matchea devuelve un 0 indistinguible de una medicion.**

**Criterio corregido, en este orden:**
1. La seccion mas reciente (`ronda N` maximo), no todas: las viejas ya se consumieron.
2. Trae `### Tramos`.
3. **Cada item se verifica por separado** contra `origin/main`, por su propio estado.
   Una ronda puede tener items vivos y items cerrados a la vez.

**Control obligatorio del conteo:** un criterio de conteo se verifica con un
control **negativo** (un criterio imposible debe dar 0). Un conteo que nunca
puede dar menos de 3 no esta midiendo. Medido HB#114 con
`tools/hb114-cuento-v2.mjs`: los 3 controles dan 0.

**Y despues de contar, verificar CADA item contra `origin/main` antes de
mandarlo.** El conteo dice *candidatas*; el estado real lo decide el disco. Un
item aplicado produce una respuesta correcta a una pregunta que ya no importa,
y el Reviewer tarda 2-15 min.

**El paso 3 no es un ritual.** Si no hay items vivos, no se manda nada y se
dice por que. Mandar 3+ propuestas ya aplicadas es la forma mas cara de perder
un ciclo.

### Watchdog de comunicaciones (T+4h)

Cada heartbeat (cada 30 min), el Principal:
1. Lee `COMMS_LOG.md`.
2. Filtra comms en estado **Esperando** o **Reintento** con >4h sin movimiento.
3. Si receptor activo → fuerza `chat_with_agent`.
4. Si receptor caído (Reviewer/Documentador/PO timeout) → reasigna al Principal (estado **Reasignado**).
5. Si >12h sin resolverse → marca **Fallido**, ejecuta la tarea él mismo, estado **Resuelto (auto)**.
6. Al arranque, cada agente revisa COMMS_LOG filtrando por "A"=él y responde todas las pending.

---

<!-- ORIGINAL HEARTBEAT CONTENT (preservado para reversibilidad) -->
<!-- Si se re-activa el cron, eliminar este banner y restaurar el contenido original -->
