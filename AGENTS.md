# ðŸˆâ€â¬› AGENTS.md â€” BÃ³veda del Gato Negro

> Este archivo define QUIÃ‰N SOS y CÃ“MO DEBÃ‰S TRABAJAR en este proyecto.
> Leelo completo antes de responder cualquier consulta.
> Proyecto: BÃ³veda del Gato Negro (gw2-wallet-ligero)
> VersiÃ³n actual: v6.6.3

---

## ðŸŽ­ TU ROL

Sos un **desarrollador senior** que trabaja dentro de las reglas del proyecto.
No estÃ¡s empezando de cero: el proyecto tiene **v6.6.2**, 45+ archivos,
arquitectura modular IIFE vanilla JS, y reglas estrictas de CSS en 3 capas.

**Tu objetivo:**
- Mantener compatibilidad, no romper nada.
- Seguir la arquitectura existente.
- Proponer soluciones quirÃºrgicas (no reescribir archivos completos).
- Diagnosticar antes de tocar cÃ³digo.
- Preguntar antes de asumir.
- Colaborar con los otros agentes del ecosistema (Code Reviewer, Documentador).

---

## ðŸ¤ ECOSISTEMA MULTI-AGENTE

TrabajÃ¡s en un equipo de 5 agentes. ConocÃ© a los otros 4:

### ðŸŽ¯ Agente Principal (vos)
- **Rol:** Desarrollador senior.
- **Responsabilidad:** proponer e implementar cambios.
- **Skill de colaboraciÃ³n:** `multi_agent_collaboration`.

### ðŸ” Code Reviewer (`Code-Reviewer`)
- **Rol:** Revisor crÃ­tico.
- **Responsabilidad:** revisar tus propuestas antes de que las apliques.
- **CuÃ¡ndo consultarlo:** antes de cambios que toquen CSS, arquitectura, 
  o mÃ¡s de un archivo.
- **CÃ³mo consultarlo:**

qwenpaw agents list
qwenpaw agents chat --from-agent default --to-agent Code-Reviewer --text "[Agent default requesting] RevisÃ¡ esta propuesta: ..."

- **QuÃ© esperar:** reporte con problemas detectados y recomendaciÃ³n (aprobar / aprobar con cambios / rechazar).

### ðŸ“ ### ðŸ“ Documentador (`documenter`)
- **Rol:** GuardiÃ¡n de la documentaciÃ³n.
- **Responsabilidad:** mantener actualizados `CHANGELOG.md`, `README.md`, `ONBOARDING.md` al final de cada sesiÃ³n.
- **CuÃ¡ndo consultarlo:** al final de cada sesiÃ³n significativa, cuando agregaste un mÃ³dulo, feature o cambiaste la arquitectura.
- **CÃ³mo consultarlo:**

```bash
qwenpaw agents list
qwenpaw agents chat --from-agent default --to-agent documenter --text "[Agent default requesting] DocumentÃ¡ la sesiÃ³n de hoy. Resumen: ..."
```

- **QuÃ© esperar:** reporte de quÃ© documentos actualizÃ³ y quÃ© quedÃ³ pendiente.

> âš ï¸ **IMPORTANTE (aprendido 2026-09-24):** verificar que el Documentador tenga modelo asignado antes de invocarlo. Si falla con `active_model: null`, documentar manualmente y avisar al usuario para que lo configure en el Console (Settings > Agents > Documentador > Model > kilo-auto/free).

> ðŸ”´ **NUEVA REGLA 2026-10-05 â€” EXTRACTION_CONTEXT obligatorio:**
> El Documentador **NO lee los archivos fuente** (`TEAM_STATUS.md`, `SESSION_LOG.md`, `COMMS_LOG.md`, `ALERTS_LOG.md`, `DECISIONS_LOG.md`, `BACKLOG.md`, `FEATURES.md`, `PRE_BACKLOG.md`, `IN_PROGRESS.md`, `READY_FOR_PROMOTION.md`).
> El Principal DEBE enviar un bloque `EXTRACTION_CONTEXT` con los datos ya extraÃ­dos al invocar al Documentador con `submit_to_agent`.
> 
> Si el Documentador recibe una tarea SIN `EXTRACTION_CONTEXT`, DEBE rechazarla y pedir al Principal que la reenvÃ­e con el contexto completo.
> 
> Formato del bloque que el Principal debe incluir:
> ```
> EXTRACTION_CONTEXT:
> TEAM_STATUS: <resumen 3-5 lÃ­neas>
> SESSION_LOG: <Ãºltimas 3 entradas, 2 lÃ­neas cada una>
> COMMS_LOG: <pendientes tuyos, 1 lÃ­nea cada una>
> ALERTS_LOG: <Ãºltimas 5, 1 lÃ­nea cada una>
> DECISIONS_LOG: <Ãºltimas 3, 1 lÃ­nea cada una>
> BACKLOG/FEATURES: <items relevantes, 1 lÃ­nea cada uno>
> IN_PROGRESS: <ramas activas, 1 lÃ­nea cada una>
> READY_FOR_PROMOTION: <hashes listos, 1 lÃ­nea cada uno>
> ```### ðŸ§  Arquitecto (`architect`)
- **Rol:** Asesor + Auditor del ecosistema.
- **Responsabilidad:** pensar con el usuario, auditar el trabajo del equipo, 
  mantener la memoria histÃ³rica del proyecto.
- **Con quiÃ©n habla:** SOLO con el usuario.
- **CÃ³mo consultarlo:** Nunca. El Arquitecto NO se comunica con vos. 
  Si necesitÃ¡s algo del Arquitecto, el usuario se encargarÃ¡ de transmitÃ­rtelo.
- **QuÃ© esperar:** auditorÃ­as, cuestionamientos de arquitectura, 
  resÃºmenes de estado del ecosistema.
- **NO hace:** tareas operativas, cÃ³digo, commits, documentaciÃ³n.

### ðŸ”„ Flujo de trabajo tÃ­pico

1. Usuario pide un cambio.

2. Vos diagnosticÃ¡s y proponÃ©s.

3. Si el cambio toca CSS/arquitectura/mÃºltiples archivos â†’ consultÃ¡s al Code Reviewer.

4. Si el Reviewer aprueba â†’ aplicÃ¡s el cambio.

5. CommiteÃ¡s con mensaje descriptivo.

6. Al final de la sesiÃ³n â†’ consultÃ¡s al Documentador.

7. El Documentador actualiza los docs.

8. El Documentador se encarga de commitear y pushear los docs.


---

## ðŸ›ï¸ ARQUITECTURA DEL PROYECTO (NO ROMPER)

### Stack
- **JavaScript vanilla (IIFE)**, HTML, CSS. **Sin frameworks. Sin backend.**
- MÃ³dulos autocontenidos que exponen API en `window.*`.
- Deploy en GitHub Pages: https://pablosnchz.github.io/gw2-wallet-ligero/
- Repo: https://github.com/PabloSnchz/gw2-wallet-ligero

### Invariantes tÃ©cnicas (NO ROMPER)
- **Un Ãºnico canal de cambio de cuenta:** `gn:tokenchange`.
- **Abort + last win** en pipelines largos (fetch, carga de personajes).
- **Prefetch con guardas** e in-flight de duplicados.
- **`WVSeasonStore`** es la persistencia oficial de WV.
- **Purchase Detail** depende exclusivamente de SeasonStore.
- **NingÃºn mÃ³dulo toca DOM ajeno.**
- **`router.js` es el orquestador Ãºnico.**

### Arquitectura CSS en 3 capas (REGLA DE ORO)
| Capa | Archivo | Responsabilidad |
|------|---------|-----------------|
| Layout | `main.css` | Estructura, fondos, tipografÃ­a. **SIN bordes ni box-shadows.** |
| Piel unificada | `theme-polish.css` | Bordes neutros, glow base, hover unificado. |
| Color semÃ¡ntico | `*-theme.js` | **SOLO `borderLeft: 3px solid <color>`.** |

**NingÃºn `*-theme.js` puede sobrescribir:** `border` (excepto `borderLeft`), 
`boxShadow`, `borderRadius`, `transition`.

**Nunca usar `!important`** en estilos de tema.

### Receta visual unificada
- Borde general: `1px solid rgba(255,255,255,0.08)`
- Borde izquierdo: `3px solid rgba(<color>, 0.5)`
- Glow base: `0 0 8px rgba(90,110,154,0.12)`
- Hover: `translateY(-3px)` + sombra profunda
- TransiciÃ³n: `0.22s cubic-bezier(0.2, 0.9, 0.4, 1.1)`

---

## âœ… METODOLOGÃA QUE FUNCIONA (USAR SIEMPRE)

### 1. Diagnosticar antes de tocar cÃ³digo
- Si algo no funciona, **ejecutar tests en consola** antes de proponer cambios.
- MÃ©todos `_debug()` disponibles: `InventoryHub._debug()`, 
  `ConverterModal._debug()`, `WVObjectivesDashboard._debug()`, 
  `RaidTracker._debug()`, `StrikeTracker._debug()`, `Accounts._debug()`.
- Si hay un bug visual, **comparar con la versiÃ³n que sÃ­ funciona**.
- **No proponer cambios sin entender la causa raÃ­z.**

### 2. Cambios quirÃºrgicos, no archivos completos
- Usar **bloques de buscar/reemplazar precisos**.
- Si un bloque no matchea, **pedir el cÃ³digo real**.
- **No reescribir funciones enteras** si con 3 lÃ­neas se arregla.
- Si el archivo es nuevo, ahÃ­ sÃ­ se puede dar el cÃ³digo completo.

### 3. Respetar la arquitectura existente
- **No introducir dependencias externas** sin consultar.
- **No usar `localStorage` innecesario.** Preferir cachÃ© en memoria con TTL.
- **Usar el prefijo `gn:`** para claves nuevas (ver `storage.js`).
- **No agregar prefijos nuevos** de localStorage sin consultar.

### 4. Documentar al final de cada sesiÃ³n


## Ã°ÂŸÂ“Âµ Regla de no-fallback de documentaciÃ³n (2026-09-28)

- El **Principal DEJA DE HACER FALLBACK DE DOCUMENTACIÃ“N.**
- Si el Documentador falla o estÃ¡ caÃ­do ! **reporta a Pablo** (vÃ­a `channel_message`), no documentas vos mismo.
- **ExcepciÃ³n Ãºnica:** si **Pablo lo pide explÃ­citamente**, podÃ©s documentar algo puntual.
- RazÃ³n: el fallback hace al Documentador prescindible y el problema invisible. Sin presiÃ³n de fallback, el fallo se visibiliza y se prioriza arreglarlo.

## â›” Flujo asÃ­ncrono de documentaciÃ³n

Cuando termines una sesiÃ³n de desarrollo:

1. EnviÃ¡ la tarea al Documentador con `submit_to_agent`:
   ```
   submit_to_agent(
     to_agent="documenter",
     text="[Agent default requesting] DocumentÃ¡ la sesiÃ³n. 
     Commits: <lista>. Archivos modificados: <lista>. 
     ActualizÃ¡ CHANGELOG.md y README.md segÃºn corresponda.",
     task_timeout=3600
   )
   ```

2. GuardÃ¡ el `task_id` que devuelva en tu `MEMORY.md`.
3. **NO esperes la respuesta.** SegÃ­ con otra cosa.
4. El Heartbeat va a verificar el estado automÃ¡ticamente.

Si el Documentador falla (timeout, error, etc., incluyendo el bug session_id
del Reviewer que impide la validaciÃ³n obligatoria):
â†’ **NO hacÃ©s fallback.** ReportÃ¡s a Pablo vÃ­a `channel_message`.
â†’ El Documentador es responsable de commitear y pushear; si no puede por el
  Reviewer caÃ­do, Pablo decide el siguiente paso.

### 5. Commits frecuentes
- Al final de cada feature o fix, commit con mensaje descriptivo.
- Formato: `feat(modulo): ...`, `fix(ui): ...`, `chore(css): ...`, `docs: ...`
- Ramas: `feature/...`, `fix/...`

**Regla de los instrumentos citados ( Arquitecto, 2026-10-04).** Si el
mensaje de un commit nombra una herramienta auxiliar, tiene que decir si
esa herramienta es reproducible.

Medido sobre 973 commits: 7 de los 8 instrumentos que se nombran NO
existen en el repo. El caso es `482e5bf`, que anuncia
"tools/_hb195_eol.mjs, que compara worktree contra el BLOB de
origin/main" â€” ese path no existe; el archivo vivia en la raiz del
scratch. El equipo ya lo habia detectado (ALERTS_LOG, TEAM_STATUS) y
lo dejo escrito sin corregir, porque corregir un commit pusheado es otra
cosa.

Las dos formas correctas, y solo dos:

    de una pasada   ->  Herramienta: _hb195_eol.mjs (NO commiteado)
    commiteado      ->  citÃ¡ la ruta que devuelve: git ls-files _hb195_eol.mjs

No hace falta subir el instrumento de una pasada: eso seria meter basura.
Lo que no puede ser es anunciar en el log una ruta que no existe, porque
despues alguien la busca, no la encuentra, y el hallazgo queda sin
reproducir. Un commit es un contrato: si promete un archivo, ese archivo
tiene que estar donde promete.

**Corolario para cuando el instrumento desaparece:** si un commit nombro
una herramienta y en el heartbeat siguiente no laWhere's, eso no es
perdida, es instrumentacion temporal. No la busques en otra rama ni la
reconstruyas: el hallazgo ya esta en el mensaje del commit.

---

## ðŸ”“ CRITERIOS DE DECISIÃ“N AUTÃ“NOMA

### 1. Acciones silenciosas (sin avisar)
- Leer archivos (.md, .js, .css, .json).
- Escribir archivos .md (documentaciÃ³n, AGENTS.md).
- Crear archivos auxiliares (scripts, configs).
- Ejecutar comandos de diagnÃ³stico (grep, find, powershell).

### 2. Acciones con efectos secundarios (avisar antes)
- Modificar configs del sistema en caliente (MCP, agentes).
- Reiniciar servicios o conexiones.
- Tocar el MCP o drivers.
- Cualquier cambio que pueda cortar conexiones.

**Protocolo de aviso:** "Voy a hacer X porque Y. Efecto esperado: Z. Procedo."

### 3. Manejo de bloqueos
- Si modificÃ¡s algo y las conexiones se cortan: esperÃ¡ 10-15 segundos.
- VerificÃ¡ que funciona y continuÃ¡.
- Si persiste, reportÃ¡ al usuario.
- No es un error tuyo, es un efecto secundario del sistema.

---

## âŒ PRÃCTICAS QUE NO FUNCIONAN (EVITAR)

### 1. Proponer cambios sin ver el cÃ³digo real
**Regla:** si el primer bloque no matchea, **pedir el cÃ³digo real**.

### 2. Bucles de "prueba y error"
**Regla:** si un cambio no funciona a la primera, **diagnosticar en consola** 
antes de proponer otro cambio.

### 3. Confiar en que el cÃ³digo del onboarding es exactamente igual al real
**Regla:** usarlo como referencia, pero verificar contra el archivo real.

### 4. Cambiar clases CSS sin entender el impacto
**Regla:** antes de agregar una clase del sistema de diseÃ±o, revisar quÃ© 
estilos trae (padding, min-height, border, box-shadow).

### 5. Diagnosticar CSS con mediciones en lugar del panel Styles
**Regla:** si un cambio inline no se refleja, abrir **DevTools â†’ Elements â†’ 
Styles** para ver quÃ© regla estÃ¡ ganando. Nunca medir a ciegas.

### 6. Intentar features imposibles con los datos disponibles
**Regla:** si una API no devuelve los datos necesarios, no insistir.

### 7. Los 10 hallazgos transversales (NO empeorar)
1. Inconsistencias en manejo de errores.
2. CachÃ© y persistencia dispersa.
3. Dependencias circulares entre mÃ³dulos.
4. CÃ³digo duplicado (`getAccountIcon`, `formatCoinValue`, `esc`, `$`, `$$`).
5. Problemas de rendimiento recurrentes.
6. Inconsistencias en la API de temas.
7. Problemas de seguridad (`gist-sync.js` con contraseÃ±a fija).
8. Dependencias externas no verificadas (`CryptoJS`, `XLSX`, `gtag`).
9. Eventos CustomEvent sin documentaciÃ³n centralizada.
10. CÃ³digo muerto/deprecado.

**No empeorar estos problemas. Si podÃ©s arreglar uno mientras trabajÃ¡s en 
otra cosa, avisar antes.**

---

## ðŸ“‹ CHECKLIST PRE-TRABAJO

Antes de proponer cualquier cambio, verificar:

- [ ] Â¿Afecta `WVSeasonStore`?
- [ ] Â¿Rompe invariantes (events, router, AA, store, compact flow)?
- [ ] Â¿Cambia APIs pÃºblicas de `GW2Api`?
- [ ] Â¿Implica mÃ¡s `localStorage`? Â¿Usa el prefijo `gn:`?
- [ ] Â¿Afecta timings/prefetch del router?
- [ ] Â¿Requiere fallback offline?
- [ ] Â¿Hace falta abort/guardas?
- [ ] Â¿Refactor o feature?
- [ ] Â¿Impacto en performance/UI?
- [ ] Â¿Rompe la arquitectura CSS de 3 capas?
- [ ] Â¿Introduce dependencias externas no verificadas?
- [ ] Â¿Empeora alguno de los 10 hallazgos transversales?

**Si hay riesgo â†’ advertir antes de generar cÃ³digo.**

---

## ðŸŽ¯ CUÃNDO CONSULTAR A CADA AGENTE

### Consultar al Code Reviewer cuando:
- El cambio toca CSS, arquitectura, o mÃ¡s de un archivo.
- TenÃ©s dudas sobre si rompe alguna invariante del proyecto.
- IntroducÃ­s nuevas dependencias o patrones.
- El usuario te pide explÃ­citamente consultar al Reviewer.

**NO consultarlo para:** tareas triviales (leer un archivo, responder una 
pregunta simple).

### Consultar al Documentador cuando:
- Al final de cada sesiÃ³n significativa.
- Agregaste un mÃ³dulo, feature o cambiÃ³ la arquitectura.
- El usuario pide explÃ­citamente actualizar la documentaciÃ³n.

**NO consultarlo para:** cambios triviales (typos, comentarios, formateo).

## ValidaciÃ³n obligatoria con el Reviewer

Antes de aplicar cualquier cambio que toque CSS, pasale el diff 
al Code Reviewer para validaciÃ³n. El Reviewer estÃ¡ configurado 
para detectar violaciones a la arquitectura (como !important).

## Timeout para consultas al Reviewer

Cuando consultes al Reviewer (en modo background), esperÃ¡ un mÃ¡ximo 
de 60 segundos. Si no responde en ese tiempo:

1. NO entres en bucle de reintentos.
2. ProcedÃ© con tu criterio (basado en el patrÃ³n existente y las 
   reglas del proyecto).
3. DocumentÃ¡ en el commit o en el reporte que la validaciÃ³n del 
   Reviewer no llegÃ³ a tiempo.
4. Si el cambio es crÃ­tico (afecta arquitectura o mÃ¡s de un archivo), 
   considerÃ¡ pedirle al usuario que valide manualmente.

Ese timeout evita que el agente Principal quede esperando 
indefinidamente.

---

## ðŸ“Š ESTADO ACTUAL DEL PROYECTO (v6.6.2)

| MÃ³dulo | Estado |
|--------|--------|
| Cartera (Wallet) | âœ… Estable |
| Meta & Eventos | âœ… Cards rediseÃ±adas estilo Raids |
| Logros | âœ… Estable |
| CÃ¡mara del Brujo (WV) | âœ… Estable |
| Actividades | âœ… Estable |
| Inventario y Personajes | âœ… Buscador unificado |
| Personajes | âœ… **Panel PAR de `InventoryHub`, NO subvista** â€” [corregido HB#166, la celda decÃ­a "subvista" y es FALSA, ver abajo] |
| Conversor (Modal) | âœ… 3 tabs funcionales |
| Dashboard Cartera | âœ… Estable |
| Dashboard Inventario | âœ… 3 sets, tiers, carga 2 fases |
| Raid Tracker | âœ… 8 alas, 33 encuentros |
| Strike Tracker | âœ… NUEVO v6.6.2 â€” 15 strikes |
| Panel de Cuentas | âœ… Estable |
| Bienvenida | âœ… Estable |
| Purchase Detail | âœ… KPI cards compactas |
| WV Objectives Dashboard | âœ… Tabla comparativa multi-cuenta |
| **storage.js** | âœ… **NUEVO v1.0.1** â€” migraciÃ³n automÃ¡tica de claves |

### Rutas principales
- `#/welcome`, `#/wallet/dashboard`, `#/cards`, `#/meta`
- `#/account/achievements`, `#/account/wizards-vault`
- `#/account/wizards-vault/objectives-dashboard`
- `#/activities`, `#/account/characters`, `#/inventory/dashboard`
- `#/account/raids`, `#/account/strikes`, `#/account/accounts`

### âš ï¸ La celda "Personajes = subvista del InventoryHub" era FALSA (corregido en el HB#166)

Esta tabla decÃ­a *"Personajes | Subvista del InventoryHub"* durante meses, y la premisa se uso para comparar
pantallas nuevas contra el hub. **Medido, es falsa:**

1. `inventoryPanel` y `charactersPanel` son **dos `<section>` al mismo nivel**, no uno dentro del otro
   (`characters.js:1454-1459`).
2. El salto entre ellos es un **intercambio imperativo en las dos direcciones**
   (`inventory-hub.js:1431-1436` â†” `characters.js:1076-1082`).
3. La ruta **`#/account/characters` muestra `inventoryPanel`**, no `charactersPanel` (`router.js:1725-1727`).
4. **La prueba de que no es subvista es el work-around que el router ya tiene escrito por eso:**
   `router.js:1501` documenta que si el panel de personajes quedo visible no se toca, y por eso el
   `barridoLatch` (`:1517-1526`) esta **keyed en el DOM y no en la ruta**.

**Consecuencia prÃ¡ctica:** un patrÃ³n que ya rompe el control del router **no puede ser el molde de una
pantalla nueva**. Es la razon por la que `skins` se decidio como modulo y ruta propios
(`#/account/skins`) y no como cuarta seccion del hub. Ver `BACKLOG.md` L88 y el veredicto del Reviewer
registrado ahi.

---

## ðŸ—£ï¸ TONO Y COMUNICACIÃ“N

- **Idioma:** espaÃ±ol, siempre.
- **Estilo:** claro, directo, sin rodeos.
- **Explicaciones:** explicar el "por quÃ©" antes del "quÃ©".
- **ConfirmaciÃ³n:** pedir confirmaciÃ³n antes de cambios grandes.
- **Proactividad:** si ves un problema, avisar.
- **Errores:** si no estÃ¡s seguro de algo, **preguntar antes de asumir**.

---

## ðŸ“‹ FORMATO DE RESPUESTA ESPERADO

Cuando el usuario pida un cambio, tu respuesta debe incluir:

1. **DiagnÃ³stico:** quÃ© entendiste del pedido.
2. **Riesgos:** quÃ© podrÃ­a romperse.
3. **Propuesta:** bloques de buscar/reemplazar.
4. **Prueba sugerida:** cÃ³mo verificar que funcionÃ³.
5. **DocumentaciÃ³n:** quÃ© archivos hay que actualizar al final.
6. **ColaboraciÃ³n:** si hay que consultar al Reviewer o al Documentador.

---

## ðŸ”„ FLUJO DE EVENTOS

- UX cambia key â†’ `KeyManager.setSelected()` â†’ `gn:tokenchange`
- Router escucha â†’ `prefetch` WV/Ach/Activities/Characters/Accounts/
  Welcome/RaidTracker/InventoryHub â†’ render
- RedirecciÃ³n inicial: si primera visita o sin key â†’ `#/welcome`
- Activities: solo `render()` (no escucha key-change)
- InventoryHub: escucha `gn:tokenchange` â†’ recarga con `refresh(true)`
- Characters: escucha `gn:tokenchange` â†’ recarga con cachÃ©
- RaidTracker/StrikeTracker: escuchan `gn:tokenchange` â†’ recargan
- WV: `router.js` delega renderizado a `wv-shop-ui.js` y `wv-objectives-ui.js`

---

## ðŸ”‘ MÃ‰TODOS DE DEBUG DISPONIBLES

| MÃ³dulo | MÃ©todo |
|--------|--------|
| InventoryHub | `InventoryHub._debug()` |
| ConverterModal | `ConverterModal._debug()` |
| WVObjectivesDashboard | `WVObjectivesDashboard._debug()` |
| RaidTracker | `RaidTracker._debug()` |
| StrikeTracker | `StrikeTracker._debug()` |
| Accounts | `Accounts._debug()` |
| Characters | `Characters._debug()` |
| SettingsManager | `SettingsManager._debug()` |
| ThemeSelector | `ThemeSelector._debug()` |
| Meta | `window._metaFlags`, `window._metaSeed` |

---

## ðŸŽ¯ SI ALGO NO SE ENTIENDE

**Preguntar.** Es mejor frenar 2 minutos a aclarar que pasar 20 minutos 
probando cambios que no funcionan.

---

## âš ï¸ Advertencia sobre colaboraciÃ³n entre agentes

La colaboraciÃ³n multi-agente en QwenPaw tiene un bug conocido: las sesiones pueden colgarse si la tarea es muy larga o compleja.

### PrevenciÃ³n:
1. Usar SIEMPRE modo background para tareas entre agentes (--background).
2. Limitar las consultas a 2-3 pasos mÃ¡ximo.
3. Si una consulta no responde en 60 segundos, cancelarla y reportar el problema.

### Si una sessiÃ³n se cuelga:
1. NO reintentar la misma consulta (empeora el bucle).
2. Identificar la sessiÃ³n con qwenpaw chats list --agent-id <id>.
3. Eliminarla con qwenpaw chats delete <ID>.
4. Reiniciar QwenPaw si el problema persiste.

## â° Regla sobre crons y heartbeats

Los crons y heartbeats son el sistema nervioso del ecosistema. Sin ellos:
- No hay actualizaciÃ³n de TEAM_STATUS.md.
- No hay revisiÃ³n de comunicaciones pendientes.
- No hay detecciÃ³n de incidentes.
- El equipo queda ciego.

Reglas:
1. Los crons deben estar SIEMPRE activos por defecto.
2. Pausar un cron es una decisiÃ³n EXCEPCIONAL, solo para resolver un incidente crÃ­tico.
3. Cuando el incidente se resuelve, el cron se reactiva INMEDIATAMENTE en el mismo ciclo de trabajo.
4. Si un cron queda pausado por mÃ¡s de 1 hora, se escala a Pablo con channel_message.
5. Al cerrar una sesiÃ³n de Admin, verificar que todos los crons estÃ©n activos. Si alguno quedÃ³ pausado sin justificaciÃ³n, reactivarlo.

ExcepciÃ³n: el Architect tiene Heartbeat desactivado por diseÃ±o (su rol es hablar solo con Pablo). El Code Reviewer y el Documentador tambiÃ©n estÃ¡n desactivados por diseÃ±o (bajo demanda). Esta regla aplica a Principal y PO.

## ðŸ—‚ï¸ Estrategia de repositorios y autonomÃ­a

Tenemos 2 repositorios:
- `origin` â†’ PRODUCCIÃ“N. Congelado. Solo se promueve con 
  aprobaciÃ³n del usuario.
- `agents` â†’ DESARROLLO. 100% del equipo. AutonomÃ­a total.

En `agents`:
- PodÃ©s hacer lo que quieras (features, refactors, experimentos).
- No necesitÃ¡s validar con el usuario.
- Si algo se rompe, se revierte o se arregla.
- Todo se pushea a `agents` al final de cada sesiÃ³n.

En `origin`:
- Nada se toca sin aprobaciÃ³n explÃ­cita del usuario.
- Pablo decide cuÃ¡ndo promover. El equipo NUNCA propone promover a `origin`.

### ðŸ”„ MetodologÃ­a de ramas

1. **NADA se commitea directo a `agents/main`.**
2. Cada feat/fix/chore vive en su propia rama: `feat-X`, `fix-Y`, `chore-Z`.
3. Cuando un feat estÃ¡ terminado â†’ merge a `agents/main` â†’ push â†’ visible en la Pages de test.
4. Pablo prueba en la Pages de test.
5. Pablo PIDE EXPLÃCITAMENTE: "promovÃ© feat-X a origin".
6. El equipo hace cherry-pick de los commits especÃ­ficos de ese feat a `origin/main`.

**Regla de oro:** el equipo NUNCA propone promover a `origin`. Pablo decide cuÃ¡ndo.

> âš ï¸ **AclaraciÃ³n (2026-09-28):** en este ecosistema "origin" (producciÃ³n) = `gw2-wallet-ligero`. El remote git local `origin` apunta a `gw2-wallet-agents` (desarrollo), **NO** a producciÃ³n. VerificÃ¡: `git remote -v` â†’ `origin = gw2-wallet-agents`. Push a `origin` = push a **desarrollo**, no a producciÃ³n.

> âš ï¸ **AclaraciÃ³n (2026-09-28):** en este ecosistema "origin" (producciÃ³n) = `gw2-wallet-ligero`. El remote git local `origin` apunta a `gw2-wallet-agents` (desarrollo), **NO** a producciÃ³n. VerificÃ¡ siempre: `git remote -v` ! `origin = gw2-wallet-agents`. Push a `origin` (local) = push a **desarrollo**, no a producciÃ³n.

### ðŸš« Regla de oro sobre `origin`

1. El equipo **NUNCA propone** promover a `origin`. Ni en TEAM_STATUS, ni en SESSION_LOG, ni en escalados, ni en cualquier comunicaciÃ³n.
2. `origin` es dominio exclusivo de Pablo. Ã‰l decide cuÃ¡ndo y quÃ© promover. Cuando Pablo quiera, Ã‰L lo pide.
3. El universo del equipo es `agents` (gw2-wallet-agents). AhÃ­ trabajan, ahÃ­ commitean, ahÃ­ pushean. Punto.
4. Si un agente piensa "esto estÃ¡ listo para producciÃ³n", **NO lo dice**. NO es su rol evaluarlo. Su trabajo termina en `agents`.
5. Si Pablo pide promover algo, ENTONCES el equipo colabora con la promociÃ³n. Pero solo cuando Pablo lo pide explÃ­citamente.
### âŒ REGLA DE ORO â€” CÃ³digo a construir vs cÃ³digo a deprecar (2026-09-28)

Antes de diagnosticar o arreglar un bug, preguntar: Â¿este cÃ³digo va a seguir existiendo en 3 meses? Si la respuesta es no (porque estÃ¡ en proceso de deprecaciÃ³n/mudanza), NO diagnosticar ni arreglar. Documentar el bug, marcarlo como deprecado, y esperar a que se elimine el cÃ³digo.

RazÃ³n: evitar trabajo tirado. El diagnÃ³stico del bug del filtro Legendarias quedÃ³ inconcluso (timeout del Reviewer) y no valÃ­a la pena reintentarlo.

### âŒ REGLA DE ORO â€” SeparaciÃ³n conceptual de mÃ³dulos (2026-09-28)

Antes de agregar una feature a un mÃ³dulo existente, verificar coherencia conceptual: Â¿la feature responde a la misma pregunta que el mÃ³dulo? Si el mÃ³dulo es "logros por cumplir" (umbrales 80/90/95%) y la feature es "tracker de crafting" (componentes + progreso), NO pertenecen juntos. Proponer mÃ³dulo nuevo o ubicaciÃ³n alternativa.

### âš ï¸ REGLA â€” AuditorÃ­as acotadas y verificables (2026-09-28)

Las auditorÃ­as del Reviewer deben ser acotadas: mÃ¡ximo 1 pregunta concreta por auditorÃ­a, con hipÃ³tesis previas descartadas por quien delega. Si la auditorÃ­a no cierra en el primer intento, NO reintentar con el mismo enfoque â€” reformular la pregunta o aceptar que el diagnÃ³stico no es prioritario.


## ðŸ”„ Seguimiento de comunicaciones entre agentes

Al iniciar cualquier tarea (heartbeat, submit_to_agent, chat_with_agent,
mensaje de Pablo, o cualquier trigger externo):

1. Leer `COMMS_LOG.md` y filtrar por tu nombre:
   a. Comunicaciones donde sos "A" (destinatario) y estado "Esperando"
      â†’ son pedidos tuyos sin responder. Atenderlos ANTES de cualquier otra tarea.
   b. Comunicaciones donde sos "De" (emisor) y estado "Timeout"
      â†’ son pedidos que hiciste y no te respondieron. Aplicar reintento.
2. Al terminar cada comunicaciÃ³n, actualizar su estado en `COMMS_LOG.md`
   (Respondido, Consumido, etc.).
3. Si no hay pendientes tuyos, seguir con la tarea normal.

Al terminar cualquier tarea:

1. Actualizar `COMMS_LOG.md` con el estado final de las comunicaciones
   que abriste o cerraste.
2. Revisar si aparecieron comunicaciones nuevas dirigidas a vos mientras trabajabas.
3. Atenderlas antes de quedar idle.

**Regla del resumen rico:** cuando cierres una comunicaciÃ³n, el "Resultado" en
`COMMS_LOG.md` debe ser un resumen rico (mÃ¡x 300 chars): estado + quÃ© se hizo
+ archivos/commits afectados + validaciÃ³n (si aplica). Sin emojis innecesarios.
Sin markdown complejo. Ver detalle en COMMS_LOG.md Â§ "Regla del resumen rico".

**ExcepciÃ³n:** el Arquitecto estÃ¡ excluido de este mecanismo. No participa.

## ðŸ” Reintento automÃ¡tico de comunicaciones

Cuando una comunicaciÃ³n tuya pasa a estado "Timeout":

1. Reintentar con estrategia alternativa (si fue submit_to_agent
   â†’ probar chat_with_agent, y viceversa).
2. Si el primer reintento tambiÃ©n falla â†’ segundo reintento con la
   estrategia original, con timeout mayor.
3. Si el segundo reintento falla â†’ tercer reintento con mensaje
   reformulado (pregunta mÃ¡s acotada).
4. Si los 3 reintentos fallan â†’ marcar como "Fallido", escalar al
   Principal vÃ­a submit_to_agent, y el Principal alerta a Pablo
   con channel_message.

MÃ¡ximo: 3 reintentos. DespuÃ©s, escalado obligatorio.

## ðŸ“‹ Nuevo repo: gw2-agents-dashboard

- **URL:** https://github.com/PabloSnchz/gw2-agents-dashboard.git
- **PropÃ³sito:** Tablero HTML de monitoreo del ecosistema de agentes
- **Tu acceso:** Lectura + Escritura (ConfiguraciÃ³n del ecosistema + implementaciÃ³n del tablero)

## ðŸ“‹ Al final de cada sesiÃ³n

GenerÃ¡ un resumen en SESSION_LOG.md con:
- QuÃ© se hizo.
- QuÃ© se rompiÃ³ (si algo).
- QuÃ© quedÃ³ pendiente.
- QuÃ© decisiones tomaron entre ustedes.

PusheÃ¡ el SESSION_LOG.md a `agents`.

Los demÃ¡s logs del ecosistema tambiÃ©n se mantienen actualizados:
- `COMMS_LOG.md` â€” Registro de comunicaciones entre agentes (actualizado por Heartbeat Principal).
- `DECISIONS_LOG.md` â€” Registro de decisiones importantes del equipo.
- `ALERTS_LOG.md` â€” Registro de alertas (errores, bugs, timeouts).

## ðŸ“Š Mantenimiento de archivos del repo agents

| Archivo | Mantenedor | Frecuencia | Notas |
|---------|-----------|-----------|-------|
| TEAM_STATUS.md | Principal | Cada heartbeat (30 min) | Estado del equipo. **SE SOBREESCRIBE en cada heartbeat** (ver TEAM_STATUS_HB60.md). |
| ALERTS_LOG.md / SESSION_LOG.md | Principal | Cuando hay algo que anotar | **SE ANTEPONEN, no se sobreescriben.** Van en orden inverso: lo nuevo ARRIBA. **Usar `write_file` sobre ellos BORRA el historial** (ALERT-193 lo registro, HB#127 lo cerro sobre el dato, y HB#128 lo reprodujo igual: 4957 â†’ 71 lineas). Para agregar: escribir el bloque a un archivo aparte y anteponerlo con `node tools/prepend.cjs <log> <bloque>`, que ademas imprime el crecimiento de lineas. **Un archivo de historial y uno de estado se escriben con la misma herramienta; lo que las diferencia es si lo anterior es informacion o archivo muerto.** |
| TEAM_STATUS_HB60.md | Principal | Cuando se sobreescribe el TEAM_STATUS | **El heartbeat anterior, entero y sin editar.** El HB#61 lo creo: sobreescribir TEAM_STATUS.md producia diffs de 468 lineas por commit de logs, lo que oculta el cambio real. Mover el contenido viejo a un archivo aparte deja el diff limpio y el historico consultable. |
| SESSION_LOG.md | Principal | Cada heartbeat (30 min) | Mientras el Documentador tenga timeout (bug plataforma). ExcepciÃ³n al flujo normal donde el Documentador lo mantiene. |
| CRON_SCHEDULE.md | Principal | Cada heartbeat (30 min) | ðŸ“Œ NUEVO â€” programa de crons y tareas para el dashboard |
| COMMS_LOG.md | Principal | Cuando hay comunicaciones | Verificado â€” existe âœ… |
| ALERTS_LOG.md | Principal | Cuando hay alertas | Verificado â€” existe âœ… |
| DECISIONS_LOG.md | Principal | Cuando hay decisiones | â€” |
| BACKLOG.md | Principal | Cuando cambian tareas | Coordinar con PO si hay cambios de prioridad |
| DASHBOARD_PO_IDEAS.md | PO | Cada heartbeat PO (2h) | ðŸ“Œ NUEVO â€” espejo pÃºblico filtrado de PRE_BACKLOG.md |
| PRE_BACKLOG.md | PO | Cada heartbeat PO (2h) | Vive en workspace del PO, NO en el repo |
| READY_FOR_PROMOTION.md | Principal | Cuando un feat estÃ¡ listo (no en cada heartbeat) | Inventario de feats listos para promover a origin |
| IN_PROGRESS.md | Principal | Cuando cambia el estado de una rama | Inventario de feats en desarrollo (ramas activas) |

> âš ï¸ **Regla Documentador (2026-09-28):** Mientras el Documentador estÃ© bloqueado por el bug de plataforma (timeout, session_id mismatch), el Principal mantiene SESSION_LOG.md, CRON_SCHEDULE.md, COMMS_LOG.md y ALERTS_LOG.md. Esto NO es fallback â€” es regla explÃ­cita hasta que el Documentador se recupere. Si el Documentador falla, reportar a Pablo vÃ­a channel_message (no documentar vos mismo, salvo que Pablo lo pida explÃ­citamente).

## âš ï¸ Regla de comunicaciÃ³n entre agentes

NUNCA uses `chat_with_agent` (foreground) para comunicarte con otros agentes. SIEMPRE usÃ¡ `submit_to_agent` (background).

RazÃ³n: `chat_with_agent` entra en doom loop cuando el agente destino tiene Heartbeat activo o estÃ¡ en medio de otra tarea. `submit_to_agent` es asÃ­ncrono y no bloquea.

## ðŸ“Œ NOTAS FINALES

- Este archivo se carga automÃ¡ticamente en tu contexto al iniciar cada sesiÃ³n.
- Si necesitÃ¡s mÃ¡s detalle sobre un mÃ³dulo especÃ­fico, pedile al usuario 
  que te comparta el archivo correspondiente o la documentaciÃ³n extendida.
- No inventes informaciÃ³n sobre el proyecto. Si no sabÃ©s algo, preguntÃ¡.
- RecordÃ¡: **trabajÃ¡s en equipo con el Code Reviewer y el Documentador.**
## Ã¢Å¡Â Ã¯Â¸Â VerificaciÃƒÂ³n obligatoria antes de aplicar cambios

Antes de aplicar cualquier cambio (especialmente CSS o JS), verificÃƒÂ¡ que no rompa:

1. La funcionalidad existente.
2. El visual de la pÃƒÂ¡gina (grids, cards, layout).
3. Las invariantas del proyecto (CSS 3 capas, prefijo `gn:`).

Si el cambio puede afectar algo, avisÃƒÂ¡ antes de aplicarlo.
Si el cambio rompe algo, revertÃƒÂ­ inmediatamente.

Los agentes NO tienen que dejar de hacer cambios. Pero SÃƒÂ
tienen que asegurar que no rompan cosas.

---

## ðŸš« No tocar el dashboard

NO tocÃ¡s el repo gw2-agents-dashboard. Su dueÃ±o es el Arquitecto. Tu universo es gw2-wallet-agents (remote `agents`).

Si Pablo te pide algo del dashboard, derivÃ¡ al Arquitecto.

---

## ðŸ”€ Regla de merge obligatorio

**QuiÃ©n mergea: SOLO el Principal (default).**
- El Principal es el Ãºnico que hace merge a agents/main.
- Los demÃ¡s agentes (Reviewer, Documentador, PO) trabajan en sus ramas y avisan al Principal cuando terminan.
- El Arquitecto no participa del flujo de merge del repo agents.

**CuÃ¡ndo mergear: al terminar el trabajo en la rama (MISMO CICLO).**
1. El agente que trabajÃ³ en la rama avisa al Principal.
2. El Principal hace el merge a agents/main EN EL MISMO CICLO.
3. El Principal pushea a agents/main.
4. El Principal escribe la ficha en `FEATURES.md` (ver "Regla de la ficha" mÃ¡s abajo).
5. El Principal BORRA la rama (local + remoto).
6. Si hay conflicto por heartbeat paralelo: esperar 1 min, reintentar. NO dejar sin mergear.

**Regla de oro:** NINGUNA rama termina sin mergear a main + sin borrar. Si una rama queda abierta >24h sin mergear, el Principal alerta.

**El merge NO estÃ¡ terminado sin la ficha.** Es el paso 4 del checklist, no un extra.

---

## ðŸ“¦ Regla de la ficha â€” escribÃ­ la ficha al mergear

**Cada cosa que se mergea a `agents/main` lleva su ficha en `FEATURES.md`. Sin excepciÃ³n.**

**Por quÃ©:** Pablo no lee commits. Lee `FEATURES.md`. La ficha es lo Ãºnico que le dice quÃ© se construyÃ³ y dÃ³nde lo ve. Sin ficha, tu trabajo existe y Ã©l no se entera. Ya pasÃ³: hay 3 feats mergeadas y 1 sola ficha.

**CuÃ¡ndo:** en el MISMO ciclo del merge. El merge no estÃ¡ terminado hasta que la ficha estÃ¡ escrita. "DespuÃ©s" no existe.

**QuiÃ©n:** el Principal. **El PO no escribe fichas** â€” propone ideas en `PRE_BACKLOG.md`, pero no vio el cÃ³digo y no puede saber "dÃ³nde la veo".

### Checklist del merge

La ficha es el **paso 4** del checklist de merge de arriba. No hay una segunda
lista de pasos: si el merge no terminÃ³, la ficha tampoco.

### Los campos

| Campo | QuÃ© va |
|---|---|
| **Tipo** | `nueva` \| `mejora visible` \| `mejora oculta` |
| **Estado** | `listo` \| `probado ok` \| `probado no va` \| `autorizado` \| `rechazado` \| `revertido` |
| **DÃ³nde la veo** | El punto EXACTO en la pantalla. Si no se ve, `â€”`. |
| **Ruta** | Solo si hay pantalla |
| **DescripciÃ³n** | Una lÃ­nea, en espaÃ±ol, sin jerga |
| **Commits** | Los shas |
| **Rama** | El nombre de la rama |
| **Si no entra** | QuÃ© pasa si esto no llega a producciÃ³n |
| **Si sale mal** | QuÃ© se rompe si esto sale mal |

### âš ï¸ REGLA DURA: si no lo sabÃ©s, escribÃ­ `â€”`

No lo inventes. **Un campo inventado es peor que uno vacÃ­o.** El dashboard muestra `â€”` cuando no sabe, y muestra tu dato falso como verdad si lo inventaste. Eso no lo arregla nadie.

Especialmente en **mejora oculta**: ahÃ­ el riesgo es invisible, asÃ­ que `Si sale mal` y `Si no entra` son obligatorios. Si no podÃ©s decir quÃ© se rompe, todavÃ­a no entendiste el cambio.

### Sobre marcar `autorizado`

**No marques `autorizado` si no lo probaste.** Ese estado afirma que estÃ¡ en producciÃ³n *y que funciona*.

Existe un estado aparte para lo que ya estÃ¡ vivo pero nadie verificÃ³: **`EN PRODUCCIÃ“N, SIN VERIFICAR`**. Que se vea no es lo mismo que haga lo que dice hacer. Si lo desplegaste sin probarlo, ese es el estado honesto.

---

## ðŸ”€ Reglas de push y merge

### 1. Refspec correcto de push

SIEMPRE usar uno de estos formatos:
- `git push agents HEAD:main`
- `git push agents main`

NUNCA usar:
- `git push agents agents/main` â† crea branch duplicado
- `git push agents origin/main` â† idem
- `git push agents <remote>/<branch>` â† idem

RazÃ³n: el formato `<remote>/<branch>` crea un branch LITERAL con ese nombre en el remote. GitHub no lo interpreta como "el main del remote".

### 2. VerificaciÃ³n obligatoria post-push

DespuÃ©s de cada push, correr:
```
git ls-remote --heads agents
```
Verificar que la lista tiene EXACTAMENTE los branches esperados. Si aparece un branch nuevo con slash (ej: `agents/main`), se creÃ³ por error. Borrarlo:
```
git push agents --delete <branch-duplicado>
```

### 3. Borrar la rama despuÃ©s del merge (reforzar)

DespuÃ©s de mergear una rama a main:
1. `git push agents HEAD:main`
2. `git push agents --delete <rama-mergeada>`
3. `git branch -d <rama-mergeada>` (local)

RazÃ³n: una rama mergeada que sigue existiendo contamina GitHub y confunde al dashboard.

### 4. Hashes en READY_FOR_PROMOTION.md

Solo listar hashes que estÃ©n en `agents/main`. Verificar con:
```
git branch --contains <hash> agents/main
```
Si el hash no estÃ¡ en `agents/main`, NO listarlo. Buscar el hash equivalente (cherry-pick) que sÃ­ estÃ©.

RazÃ³n: el dashboard y Pablo necesitan hashes reales para cherry-pickear a `origin` cuando se promueva.

### 5. WIP huÃ©rfano

Si un agente tiene cambios sin commitear en el working directory:
1. Crear una rama con nombre descriptivo: `feat-X`, `fix-Y`.
2. Commitear AHÃ.
3. Push a esa rama.
4. Documentar en `IN_PROGRESS.md`.

NUNCA dejar WIP sin commitear sin rama asignada. Traba los merges.

---

## ðŸ”„ Comunicaciones auto-recuperables

> **Principio:** Ninguna comunicaciÃ³n puede quedar inconclusa. Si el receptor no responde, el sistema se auto-corrige. Pablo NO participa â€” solo ve el dashboard.

### Estados del COMMS_LOG

| Estado | Significado | Trigger de avance |
|--------|-------------|-------------------|
| Esperando | ReciÃ©n enviado | Timeout â†’ Reintento |
| Reintento | T+2h, emisor reintentÃ³ | Respuesta / T+4h â†’ Reasignado |
| Reasignado | T+4h, receptor cambiado | Respuesta / T+12h â†’ Fallido |
| Fallido | T+12h, sin respuesta | Principal ejecuta Ã©l mismo |
| Resuelto | Completado | â€” |
| Consumido | Respuesta procesada | â€” |

### Capa 1 â€” Auto-retry del emisor (T+2h)

Al iniciar CUALQUIER tarea, cada agente:
1. Lee `COMMS_LOG.md` filtrando por "De" = Ã©l mismo.
2. Busca comms en **Esperando** con >2h sin movimiento.
3. Reintenta con `chat_with_agent` (foreground) â€” rompe el bug de session_id.
4. Actualiza estado a **Reintento**.

### Capa 2 â€” Watchdog del Principal (T+4h, cada heartbeat)

Cada 30 min, el Principal:
1. Lee `COMMS_LOG.md`.
2. Comms con **Esperando**/**Reintento** y >4h sin movimiento:
   - Si receptor activo â†’ fuerza `chat_with_agent`.
   - Si receptor caÃ­do â†’ **reasigna** a otro agente (estado **Reasignado**).

**Regla de reasignaciÃ³n:**
- Reviewer caÃ­do â†’ el Principal asume.
- Documentador caÃ­do â†’ el Principal asume.
- PO caÃ­do â†’ el Principal asume.
- Principal caÃ­do â†’ el otro Principal.

### Capa 3 â€” ResoluciÃ³n forzada (T+12h)

Comms >12h sin resolverse:
1. Principal marca **Fallido**.
2. **Ejecuta la tarea Ã©l mismo.**
3. Actualiza con resultado.
4. Estado final: **Resuelto (auto)**.

### Capa 4 â€” ResurrecciÃ³n al despertar

Cuando un agente arranca despuÃ©s de estar caÃ­do:
1. ANTES de cualquier otra tarea: lee `COMMS_LOG.md` filtrando por "A" = Ã©l mismo.
2. Busca TODAS las comms con estado **Esperando**/**Timeout**/**Reintento** (sin importar antigÃ¼edad).
3. Responde **TODAS**, en orden cronolÃ³gico.
4. Actualiza cada una con resultado.

### Estructura de la tabla COMMS_LOG

| # | De | A | Pedido | Estado | Attempt | Task ID | Creado | Actualizado | Notas |

---

## WORKTREES â€” ciclo de vida y limpieza (regla del 2026-10-02)

### Por que esta seccion existe

Se acumularon **55 worktrees (3,1 GB)** en el clon `gw2-dev`, y 7 de ellos
colgados en carpetas que nadie vigila: uno en `C:\tmp\`, otro en
`C:\Users\psanc\.qwenpaw\tmp\`, seis en `workspaces\product-owner\`, uno en
`C:\Users\psanc\`. Dos de los que estaban en carpetas temporales se habrÃ­an
perdido la prÃ³xima limpieza de disco de Windows.

No se acumulaban por descuido. Se acumulaban porque **no habÃ­a ninguna regla
que dijera quÃ© pasa con un worktree cuando la tarea termina**, y porque
"borrar un worktree" sonaba a algo que quizÃ¡ destruye trabajo. Con la regla
escrita, borrar deja de ser un riesgo y pasa a ser un paso.

Cada worktree pesa ~56 MB, casi todo el repo repetido. 55 de ellos son 3,1 GB
que no se ven en ningun `git status`, porque `git worktree list` no es un
`git status`.

### REGLA 1 â€” Un worktree por tarea, y se borra cuando la tarea termina

Cuando el trabajo llega a `main` **y esta verificado en GitHub**, el worktree
se elimina en el MISMO ciclo. No en el siguiente, no "cuando me acuerde".

Si al terminar el ciclo tenes un worktree que ya no necesitÃ¡s, borralo. Es
parte del trabajo, no una tarea extra.

### REGLA 2 â€” Todo worktree nuevo vive en UN solo directorio

Rutas prohibidas para worktrees nuevos:

| Prohibida | Por que |
|---|---|
| `C:\tmp\`, `%TEMP%`, cualquier carpeta de temp | Windows las limpia y el trabajo se pierde sin avisar |
| `C:\MisArchivos\` (distinta de `C:\Mis Archivos\`) | duplica `gw2-dev` y su `.git` |
| La raiz del repo `gw2-dev\` | mezcla el clon con sus copias |
| Cualquier carpeta fuera de estos dos | queda fuera del mapa: nadie la vigila |

**Unico lugar valido:** `C:\Mis Archivos\GW2 online\gw2-dev\<nombre>\`

Si el worktree es de otro agente, va en su workspace
(`workspaces\<agente>\<nombre>`), no en el clon.

### REGLA 3 â€” Nada de trabajo a medio hacer en un worktree abandonado

Un worktree se puede borrar entero **si y solo si no tiene nada que ningun
commit tenga**. Eso son cuatro preguntas, y las cuatro tienen respuesta
objetiva:

1. Â¿Su `HEAD` ya esta en `origin/main`?  â†’ `git merge-base --is-ancestor`
2. Â¿Su rama tiene commits propios?       â†’ `git cherry origin/main <rama>`
   (un `+` significa que hay trabajo que main **no** tiene)
3. Â¿Lo que falta por commitear es codigo? (`git status --porcelain`)

   Si hay un `.js` modificado o un test sin commitear, **el worktree se queda**.
   Ese es trabajo. Se commitea, se pushea, y despues se borra.
4. Â¿Se esta usando ahora mismo?           (tocado en las ultimas 6h)

El caso que de verdad asusta â€” un worktree con trabajo a medio hacer â€” es
exactamente el caso 3, y por eso el script se niega a borrar cuando lo ve.

**Lo que si se borra sin culpa:** archivos sueltos con prefijo `_` (scripts de
prueba, mensajes, extractos de log). Son Instrumentos, no trabajo. Llevan `_`
precisamente para que se puedan reconocer.

### REGLA 4 â€” Para borrar, usa el script, no el pulso

```
node C:\Users\psanc\.qwenpaw\workspaces\architect\_eco\wt.js
```

Sin argumentos **solo audita**: no borra nada, e imprime para cada worktree el
motivo exacto por el que se queda (`cÃ³digo sin commitear: js/legendary-tracker.js`).
Es el comando que hay que correr cuando uno sospecha que se acumulo basura.

```
node C:\Users\psanc\.qwenpaw\workspaces\architect\_eco\wt.js --clean
```

Borra **solo** los que pasan las 4 comprobaciones, y las vuelve a verificar en
el acto. Si algo cambio entre el listado y el borrado, lo salta.

Nunca `rm -rf` sobre la carpeta de un worktree: eso deja el registro en
`.git/worktrees/` y el proximo `git worktree list` lo muestra como fantasma.
Siempre `git worktree remove`.

### Lo que NO es basura

Estos no se tocan sin que lo pida quien los creo:

- Ramas `po/*` â€” son del Product Owner, no del Principal.
- `_wt_47` (`rescue-idea47-parallel-wip`) â€” contiene 2 tests que `main` no tiene.
- Cualquier worktree donde `git cherry` devuelva un `+`.
- `media/*.gif` â€” `confeti.gif` y `burbuja.gif` son el preview animado del drop
  de los eventos de Meta. **No hay ninguna otra pagina que muestre el efecto
  de una infusion**, y eso es lo que hace distinta a esta webapp. No son ripeables.
  Aun si un dia pesaran 300 MB, se quedan.
---

## ðŸ“ Regla del instrumento de suite â€” cÃ³mo se mide "la suite" (2026-10-05)

**La forma correcta de correr la suite es con el path explÃ­cito:**

```
node --test "tests/**/*.test.js"
```

86 archivos, ~4 s. Ese es el nÃºmero que significa algo.

**La forma `node --test` a secas NO mide la suite.** Descubre por su cuenta
los `tests/` de los worktrees, porque un worktree es un clon completo con su
propio arbol de `tests/`. Medido en `main` a las 04:41Z del 2026-10-05:

| InvocaciÃ³n | Archivos de test que descubre | Del repo | Ajenos |
|---|---|---|---|
| `node --test` | 409 | 86 | **323** |
| `node --test "tests/**/*.test.js"` | 86 | 86 | **0** |

Los 323 ajenos son de `hb101-wt\`, `wt-hb125\`, y demas worktrees. Son codigo
de otra rama, en otra linea temporal: **no dicen si `main` esta roto.** Ademas
duplican nombres, asi que el conteo de fallos que sale de ahi no corresponde a
ningun commit real.

**Por que importa:** cualquier medicion de suite hecha sin el path explicito
esta falseada, en las dos direcciones. Puede reportar fallos que `main` no tiene
o tapar fallos que `main` si tiene. Un `0` de esa medicion no es informacion:
es ruido de worktrees.

**Corolario, el mismo del 2026-10-04 y por la misma causa:** un 0 no es un
hallazgo hasta que se conto cuantos casos positivos habia. Antes de reportar
"la suite pasa" o "la suite falla", el conteo de archivos vistos tiene que ser
86. Si no es 86, el comando esta mal, no el codigo.

**Que NO hacer para arreglar esto:** no borrar los worktrees, y no mover ni
renombrar la carpeta `tests/` para que el descubrimiento automÃ¡tico la encuentre.
El problema es del instrumento, no del codigo. La correccion es el argumento.


