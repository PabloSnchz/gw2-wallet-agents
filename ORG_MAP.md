# ORG_MAP.md — Mapa organizacional del ecosistema Bóveda del Gato Negro

> Documento canónico de estructura del ecosistema multi-agente.
> Fuente: los 5 `AGENTS.md` de los workspaces + `agent.json` de cada agente +
> `git remote -v` de los 3 repos + `qwenpaw cron list` / `qwenpaw chats list` / `qwenpaw channels list`.
> Verificado contra el código real el 2026-09-30.
> Los `AGENTS.md` no están versionados: viven en los workspaces, no en el repo.

---

## 1. Agentes y roles

| agente | ID | rol | heartbeat | estado actual |
|--------|----|-----|-----------|---------------|
| Principal | `default` | Dev senior. Propone, implementa, mergea a `main`, pushea. Único que mergea. | Activo. Cron `13dc22e6` `*/30 * * * *` UTC, `share_session: false`, timeout 900s. `agent.json`: `every 30m` pero `enabled: **false**` — el `agent.json` NO lo corre; el mecanismo vivo es el cron (verificado 2026-09-30 contra `jobs.json` y `agent.json`) | Activo. Heartbeat #37 (2026-09-30 00:00 UTC). Modelo `kilo-auto/free` |
| Code Reviewer | `Code-Reviewer` (⚠️ ver nota 1) | Revisor crítico. NO escribe código, NO commitea. Valida propuestas antes de aplicarse. | Desactivado por diseño. `agent.json`: `enabled: false`, `every 6h` | Operativo con intermitencia. Racha de 14 timeouts rota en HB#37: respondió `task-f80666adeb79`, veredicto "aprobado con cambios" con 6 hallazgos |
| Documentador | `documenter` | Documenta `CHANGELOG.md` / `README.md` / `ONBOARDING.md`. Hace commit y push de docs. | ⚠️ A CONFIRMAR. `agent.json` dice `enabled: true`, `every 4h`, timeout 900s. `CRON_SCHEDULE.md` solo lista 2 heartbeats (Principal y PO) | Operativo con caídas. 7 timeouts consecutivos en su historial; recuperado en HB#30 y HB#33 |
| Product Owner | `product-owner` | Alterego de Pablo como usuario. Detecta fricciones, propone features, prioriza. NO escribe código de producción. | Activo. NO es un cron de QwenPaw: `agent.json` con `every 2h`, `enabled: true`, timeout 300s (equivalente a `0 */2 * * *`) | Activo y productivo. Última entrega en vuelo al cierre de HB#37 |
| Arquitecto | `architect` | CTO externo. Asesor de Pablo, auditor del ecosistema, dueño del dashboard. NO habla con agentes salvo pedido explícito de Pablo. | Desactivado por diseño. `agent.json`: `enabled: false`, `every 6h` | Activo. Se activa cuando Pablo abre QwenPaw |
| QA Agent (builtin) | `QwenPaw_QA_Agent_0.2` | Helper de preguntas y respuestas sobre QwenPaw, su configuración y su documentación. | Sin heartbeat | No operativo: `active_model: null`. No aparece en ningún `AGENTS.md`. Fuera del mapa del equipo |

Nota 1: el `AGENTS.md` del Reviewer y el del Arquitecto se refieren a él como
`code-reviewer`, pero el ID real registrado en QwenPaw es `Code-Reviewer`
(verificado con `qwenpaw agents list`). `submit_to_agent` exige el ID exacto.

---

## 2. Interacciones entre agentes

Regla global de los 5 `AGENTS.md`: **NUNCA `chat_with_agent` (foreground) para
comunicarse entre agentes. SIEMPRE `submit_to_agent` (background).** Motivo:
`chat_with_agent` entra en doom loop cuando el receptor tiene el heartbeat activo.

| emisor | receptor | canal | para qué | estado |
|--------|----------|-------|----------|--------|
| Principal | Code Reviewer | `submit_to_agent` (background) | Validar propuestas que tocan CSS, arquitectura o más de un archivo | Único flujo con bug. 14 timeouts (`session_id mismatch`) + 1 `Provider returned an empty response`. Se rompió en HB#37 |
| Principal | Documentador | `submit_to_agent` (background) | Documentar la sesión al cierre | Flujo asíncrono. El `task_id` se guarda y el heartbeat lo verifica después |
| Principal | Product Owner | `submit_to_agent` (background) | Consultar novedades de `PRE_BACKLOG.md` y tomar decisiones de alcance | Flujo estable. Última consulta en vuelo al cierre de HB#37 (COMM 027) |
| Product Owner | Principal | `submit_to_agent` (background) | Entregar hallazgos e ideas, pedir correcciones factuales | Flujo más frecuente del ecosistema. Hay decenas de sesiones `product-owner:to:default:*` |
| Product Owner | Code Reviewer | `submit_to_agent` (background) | Validar viabilidad técnica de propuestas 🟡/🔴 (regla de su `AGENTS.md`) | ⚠️ A CONFIRMAR: no hay evidencia de ejecuciones. En la práctica el PO consulta al Principal |
| Documentador | Code Reviewer | `submit_to_agent` (background) | Gate obligatorio: sin aprobación del Reviewer no commitea docs | Depende del mismo bug. Si el Reviewer cae, el Documentador no commitea y reporta a Pablo |
| Arquitecto | Code Reviewer | `submit_to_agent` (background) | Delegar auditoría técnica, SOLO si Pablo lo pide | Excepción acotada a la regla "el Arquitecto no habla con agentes" |
| Cualquier agente | Pablo | canal `console` (único canal habilitado) | Reportes, escalados, `channel_message` | Directo, sin intermediarios |
| Pablo | Principal | `chat_with_agent` en foreground al `default`, desde la CLI o el Console | Tareas de desarrollo | Ver sección 6 |

### Bug del Reviewer y workarounds

`submit_to_agent` al Reviewer falla con `session_id mismatch`: la sesión queda
en `running`, hace polling ~2 minutos y el backend la cancela sin respuesta. Es
un bug de infraestructura de QwenPaw, no del agente. Hay un segundo modo de
fallo más grave: `Provider returned an empty response`.

Workarounds documentados:

1. `chat_with_agent` (foreground) — Pablo puede hablar con el Reviewer
   directamente cuando no hay heartbeats activos.
2. `session_id` explícito — pasar el `session_id` de una sesión previa del
   Reviewer. Puede funcionar o no.
3. Principal como intermediario — el Principal delega internamente. Si el
   Reviewer está caído, la auditoría técnica la hace el Principal.
4. Timeout acotado — esperar máximo 60s. Si no responde, NO reintentar en
   bucle: proceder por mérito técnico y dejarlo asentado en el commit.
5. Regla anti-doom-loop — máximo 3 reintentos por comunicación. Después:
   marcar `Fallido` en `COMMS_LOG.md` y escalar a Pablo vía `channel_message`.

---

## 3. Permisos de escritura — archivos del repo agents

| archivo | quién escribe | quién solo lee |
|---------|---------------|----------------|
| `AGENTS.md` (raíz del repo) | Principal | todos |
| `AGENTS_SYNC.md` | Principal | todos |
| `ORG_MAP.md` | Principal (este documento) | todos |
| `CHANGELOG.md` | Documentador | todos |
| `README.md` | Documentador | todos |
| `ONBOARDING.md` | Documentador | todos |
| `TEAM_STATUS.md` | Principal (heartbeat) | todos |
| `COMMS_LOG.md` | Principal (heartbeat) | todos |
| `ALERTS_LOG.md` | Principal (heartbeat) | todos |
| `CRON_SCHEDULE.md` | Principal (heartbeat) | todos |
| `DECISIONS_LOG.md` | Principal | todos |
| `READY_FOR_PROMOTION.md` | Principal | todos |
| `IN_PROGRESS.md` | Principal | todos |
| `BACKLOG.md` | Principal | todos |
| `DASHBOARD_PO_IDEAS.md` | Product Owner | todos |
| `SESSION_LOG.md` | Documentador (por AGENTS.md) / Principal (en la práctica, mientras el Documentador tenga timeouts) | todos |
| `PRE_BACKLOG.md` | Product Owner | nadie más. Vive en su workspace, no en el repo |
| `HEARTBEAT.md` | Principal | todos |
| `MEMORY.md`, `KNOWLEDGE.md` | Principal (los suyos, en el workspace) | n/a |
| `js/`, `css/`, `index.html`, `assets/` | Principal únicamente | Reviewer, Documentador, PO, Arquitecto |
| `AGENTS.md` de cada agente | Cada agente, el suyo, en su workspace. NO están versionados | n/a |

Reglas transversales de escritura:

- Nada se commitea directo a `main`. Cada feat/fix/chore vive en su rama
  (`feat-X`, `fix-Y`, `chore-Z`).
- Solo el Principal mergea a `agents/main`, pushea y borra la rama, en el
  mismo ciclo. Si una rama queda abierta más de 24h sin mergear, el Principal
  alerta a Pablo.
- Ningún agente salvo el Principal mergea. Documentador y PO avisan al
  Principal cuando terminan su rama.

---

## 4. Permisos de escritura — repos

| repo | quién pushea | quién solo lee | quién no toca |
|------|--------------|----------------|----------------|
| `PabloSnchz/gw2-wallet-agents` (DESARROLLO) | Principal a `main`. Documentador y PO a su propia rama, y avisan al Principal para el merge | todos los agentes | nadie está excluido. Autonomía total |
| `PabloSnchz/gw2-wallet-ligero` (PRODUCCIÓN) | Solo Pablo. El equipo hace cherry-pick únicamente cuando Pablo lo pide explícitamente | todos los agentes | El equipo no propone promover. Ni en `TEAM_STATUS.md`, ni en `SESSION_LOG.md`, ni en escalados, ni en ninguna comunicación |
| `PabloSnchz/gw2-agents-dashboard` (Dashboard) | Arquitecto. Es su producto | Principal y agentes | Los agentes operativos NO tocan el dashboard. Si hace falta un cambio, va al Arquitecto |

### Los 3 repos y sus remotes

| path local | remotes | aclaración crítica |
|------------|---------|--------------------|
| `C:\Mis Archivos\GW2 online\gw2-wallet-agents` | `origin` → `gw2-wallet-agents.git` | Ahí el remote de DESARROLLO se llama `origin`. `git push agents` falla |
| `C:\Mis Archivos\GW2 online\gw2-wallet-ligero` | `agents` → `gw2-wallet-agents.git` (desarrollo) y `origin` → `gw2-wallet-ligero.git` (producción) | Push por defecto a `agents`. Solo a `origin` cuando Pablo lo pide |
| `C:\Mis Archivos\GW2 online\gw2-agents-dashboard` | `origin` → `gw2-agents-dashboard.git` | Repo del Arquitecto |

El término "origin" en los `AGENTS.md` es ambiguo: a veces significa el remote
git local `origin` (que en el clon de `agents` apunta a DESARROLLO) y a veces
significa PRODUCCIÓN (`gw2-wallet-ligero`). Verificar siempre con
`git remote -v` antes de pushear.

### Refspec de push

Correcto: `git push agents HEAD:main` o `git push agents main`.
Incorrecto: `git push agents agents/main` — crea un branch literal duplicado.
Verificar después con `git ls-remote --heads agents`.

### Worktrees

El trabajo activo ocurre en worktrees para no ensuciar el clon principal:
`C:\Users\psanc\.qwenpaw\workspaces\default\_wt_main` es el worktree de
`main` de `gw2-wallet-agents`. Los logs se editan en el worktree y se commitean
desde ahí. Nunca usar `Set-Content` de PowerShell sobre los `.md` del repo: mete
BOM y reescribe finales de línea, inflando el diff.

---

## 5. Permisos de configuración

| recurso | quién puede tocarlo | tipo de enforcement |
|---------|---------------------|--------------------|
| `agent.json` de cada agente (en su workspace) | Principal, y Pablo desde el Console. Requiere avisar antes por efecto secundario | Regla de honor. Cualquier agente tiene `write_file` sobre su propio workspace |
| `skill.json` de cada agente | Principal / Pablo | Regla de honor |
| MCP `mi-repo-boveda` (paths) | Principal / Pablo | Regla de honor. Los args se editan en `agent.json` |
| Crons de QwenPaw (`qwenpaw cron *`) | Principal. Regla de los `AGENTS.md`: pausar un cron es excepcional, y si queda pausado más de 1h se escala a Pablo | Enforcement parcial: el cron corre en el servicio, no en el agente |
| `HEARTBEAT.md` | Principal | Regla de honor |
| Permisos del driver / tool policy | Pablo, desde el Console | Enforcement real |
| `channels` (Telegram, Discord, etc.) | Pablo | Enforcement real |

### Enforcement real vs regla de honor

**Enforcement real** (lo impone la plataforma, no el equipo):

- El `security.tool_guard` del agente `default` está activo y deniega
  `SAFETY_CHECKS_DESTRUCTIVE_COMMAND`. Los otros 4 agentes tienen
  `security: null`.
- El sistema de canales: solo `console` está habilitado. Los demás
  (Telegram, Discord, Slack, Feishu, DingTalk, etc.) están `disabled`.
- Los heartbeats vienen de `agent.json` o de crons registrados en el servicio.
  Un agente no puede disparar uno que no existe.

**Regla de honor** (nada lo impide técnicamente, solo la regla escrita):

- El MCP `mi-repo-boveda` es `@modelcontextprotocol/server-filesystem`: no
  distingue lectura de escritura por path. Los 5 agentes tienen
  `C:\Mis Archivos\GW2 online\gw2-wallet-agents` en sus args, así que los 5
  **pueden escribir en el repo agents**. Lo único que los frena es la sección
  "Permisos" de su `AGENTS.md`.
- Por eso la prohibición de escribir en `gw2-wallet-ligero` (producción) es
  regla de honor. El único freno real es que el agente no tenga el remote
  configurado, y sí lo tiene (el clon de `ligero` tiene `origin` = producción),
  así que puede pushear.
- La regla "el Arquitecto es el único que escribe el dashboard" también es
  regla de honor: los 4 agentes operativos tienen el path del dashboard en su
  MCP.

Consecuencia práctica: un AGENTS.md sin enforcement es una declaración de
intenciones, no un candado. La única defensa real es no darle el path.

---

## 6. Comunicación con Pablo

Único canal habilitado: `console`. Todos los demás canales (iMessage, Discord,
Telegram, DingTalk, Feishu, QQ, Slack, Matrix, WeChat, etc.) están `disabled`.

| chat | agente | session id | para qué |
|------|--------|-----------|----------|
| Desarrollo — Bóveda del Gato Negro | `default` | `1790264876233-s66k3aw` | Trabajo de código, features, fixes, implementaciones |
| ~~Admin — Ecosistema multi-agente~~ | `default` | `1790305907439-1wpuw3u` | **RETIRADO 2026-09-30.** No era un agente: era un chat manual de Pablo dentro de `default`. La administración del ecosistema (agentes, crons, MCPs, permisos, organización) la hace hoy el **Arquitecto** (`architect`), como director de estructura. Aquí nació este ORG_MAP |
| Mapa organizacional del ecosistema | `default` | `1790728294420-wa11wi8` | Creación de ORG_MAP.md (esta sesión) |
| Resumen del estado actual del ecosistema | `architect` | `1790447070263-lhuuzna` | Pablo ↔ Arquitecto. Asesoramiento y auditoría |
| Completada Phase 2 Armería Legendaria | `architect` | `1790580926601-8j8fw51` | Pablo ↔ Arquitecto |
| Error de ejecución del modelo | `architect` | `1790726902753-qsuxrvo` | Pablo ↔ Arquitecto |

| emisor | cómo notifica a Pablo | para qué |
|--------|----------------------|----------|
| Principal | `channel_message` | Escalados: Reviewer caído, Documentador caído, Documentador bloqueado |
| Documentador | `channel_message` | "Documentación actualizada y pusheada" + hash. También cuando el Reviewer lo bloquea |
| Product Owner | `channel_message` | Solo si algo es urgente. Máximo 1 resumen semanal |
| Arquitecto | Directo, en su propio chat | Decisiones de arquitectura, traducción de diagnósticos, mensajes listos para pegar |
| Code Reviewer | `channel_message` | Raro. Su salida es para el Principal |

Las sesiones con nombre `[Agent pro` o `product-owner:to:default:*` NO son
chats de Pablo: son sesiones internas creadas por `submit_to_agent` del PO al
Principal. No confundir.

---

## 7. Excepciones y reglas de oro

### 7.1 Promoción a `origin` (producción)

1. El equipo **NUNCA propone** promover a `origin`. Ni en `TEAM_STATUS.md`, ni
   en `SESSION_LOG.md`, ni en escalados, ni en ninguna comunicación.
2. `origin` (producción, `gw2-wallet-ligero`) es dominio exclusivo de Pablo. Él
   decide cuándo y qué promover.
3. Si un agente piensa "esto está listo para producción", **no lo dice**. No
   es su rol evaluarlo. Su trabajo termina en `agents`.
4. Cuando Pablo lo pide explícitamente, el equipo hace cherry-pick de los
   commits concretos a `origin/main`. Paso a paso registrado en los logs.

### 7.2 Autonomía

- En `gw2-wallet-agents`: autonomía total. Features, refactors, experimentos.
  No hace falta validar con Pablo. Si algo se rompe, se arregla o se revierte.
- En `gw2-wallet-ligero`: cero. Solo cuando Pablo lo pide.
- En `gw2-agents-dashboard`: solo el Arquitecto.

### 7.3 Fallbacks

| situación | regla |
|-----------|-------|
| Documentador caído | El Principal NO hace fallback de documentación. Reporta a Pablo vía `channel_message`. Único agente autorizado: Pablo, si lo pide explícitamente. Razón: el fallback vuelve al Documentador prescindible y esconde el problema |
| Reviewer caído | Si no responde en 60s: se procede por mérito técnico y se asienta en el commit. Máximo 3 reintentos, después se escala |
| Principal caído | Toma el rol el otro Principal. Si no hay otro, la tarea queda en `COMMS_LOG.md` con estado `Reasignado` |
| PO caído | El Principal asume la priorización |

Excepción vigente y ya aplicada: mientras el Documentador esté bloqueado por
bugs de plataforma, el Principal mantiene `SESSION_LOG.md`,
`CRON_SCHEDULE.md`, `COMMS_LOG.md` y `ALERTS_LOG.md`. Eso está escrito, no es
fallback improvisado.

### 7.4 Otras reglas de oro

- **Código a construir vs a deprecar**: antes de diagnosticar o arreglar un
  bug, preguntar si el código va a seguir existiendo en 3 meses. Si no,
  documentar y dejar de lado.
- **Separación conceptual de módulos**: si una feature no responde a la misma
  pregunta que el módulo donde entraría, no entra ahí. Proponer módulo nuevo.
- **Auditorías acotadas**: máximo 1 pregunta concreta por auditoría, con
  hipótesis previas descartadas por quien delega. Si no cierra al primer
  intento, no reintentar con el mismo enfoque.
- **Comunicaciones auto-recuperables**: 4 capas. Auto-retry del emisor a T+2h
  (cambia de canal para romper el bug de `session_id`), watchdog del Principal
  a T+4h (reasigna), resolución forzada a T+12h (el Principal ejecuta),
  resurrección al despertar (cada agente responde sus pendientes).
- **Comunicación entre agentes**: siempre `submit_to_agent`. Nunca
  `chat_with_agent` en foreground. Si un agente entra en bucle 2 veces, para y
  reporta.
- **El Arquitecto está excluido** del mecanismo de `COMMS_LOG.md`.
- **No fallback de documentación** (ver 7.3).
- **Refs de push**: `git push agents HEAD:main`. Nunca `agents/main`.
- **Cuidado con PowerShell**: `Set-Content` sobre los `.md` del repo mete BOM y
  reescribe finales de línea. Usar Python con `newline='\n'`.

---

## Pendientes de verificación

Datos que no se pudieron confirmar contra una fuente y quedan marcados:

1. **ID del Code Reviewer**: `Code-Reviewer` según `qwenpaw agents list`,
   `code-reviewer` según los `AGENTS.md`. El que importa para `submit_to_agent`
   es el primero.
2. **Heartbeat del Documentador**: `agent.json` dice `enabled: true, every 4h`,
   pero `CRON_SCHEDULE.md` solo lista 2 heartbeats activos (Principal y PO) y
   el Documentador arrastra timeouts. Alguien debería decidir si se reactiva o
   se documenta como desactivado.
3. **PO → Reviewer**: la regla existe en su `AGENTS.md`, pero no hay evidencia
   de que se haya ejecutado. En la práctica el PO consulta al Principal.
4. **QA Agent**: `active_model: null`, no está en ningún `AGENTS.md`. No se
   sabe si entra al mapa o se desregistra.
5. **Promoción pendiente**: si hay algo esperando aprobación de Pablo para
   `origin`, no se incluyó aquí a propósito. Ese estado vive en
   `READY_FOR_PROMOTION.md`, que es del Principal.
