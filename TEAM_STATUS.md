# TEAM_STATUS - Heartbeat #117 (2026-10-02 00:0x-00:3x UTC)

**Corto:** 6 de las 7 propuestas vivas del PO ya estan aplicadas; la septima (T12-b) es
justo lo que el Reviewer pidio. Y al medir por que las otras 6 estan aplicadas, aparecio
**ALERT-169**: `gn:tokenchange` no llega al InventoryHub, y `AGENTS.md` documenta como
hecho algo que no esta en el disco. Sin codigo de producto tocado; 1 pregunta al Reviewer.

## Tareas en curso

| Quien | Que | Estado |
|---|---|---|
| **Reviewer** | ALERT-169 (alcance del fix del InventoryHub) | **Enviada** `20261002T000335Z-7f6f72`. 1 pregunta de ALCANCE. |
| **Reviewer** | 6 consultas previas (HB#91, IDEA 49E, IDEA 62 T1 x2, HB#115, correccion de C1) | **VENCIDAS, sin respuesta.** La mas nueva es la de HB#115 (vencio 23:02). Ninguna bloquea: son preguntas de diseno que formule yo. |
| **Reviewer** | "opcion C tiene un hueco MECANICO" (HB#117) | **Enviada** en el ciclo anterior de este mismo heartbeat. Sin respuesta todavia. |
| **PO** | Ronda 37 | Sin tarea. Le pedi el nombre exacto de la rama. Sin respuesta todavia. |
| **Documentador** | — | Sin tarea (regla de no-fallback vigente). |
| **Pablo** | "que verdad manda: la URL o la pref" | **Espera** (fila 128). Le llega por `channel_message`. Es la unica decision que bloquea al equipo. |

## Completado en este ciclo

- **PASO 3: las 7 propuestas vivas del PO, medidas una por una contra `origin/main`.**
  6 ya estan aplicadas; **ninguna se manda al Reviewer** (ver tabla abajo).
- **T13 cerrado en `BACKLOG.md`**: estaba como `- [ ]` cuando el fix ya esta en
  `router.js:1524` (`try { m.deactivate(); }`, generalizado). Verificado con
  `git grep -n "deactivate()" origin/main -- js/router.js`.
- Sin codigo de producto tocado. Suite no re-corrida: no hubo cambios de producto
  (mismo criterio que el HB#116).

### Las 7 vivas del PO, y por que 6 no van al Reviewer

| Ronda | Item | Estado medido en `origin/main` @ `5f4688f` |
|---|---|---|
| 34 | **T13** latch de `state.active` | **APLICADA** — `router.js:1524`, `try { m.deactivate(); }` |
| 33 (x2, ramas distintas) | **T12** toggle Raids/Strikes duplicado | T12-a (guard) aplicada. **T12-b sigue VIVO**: `wireStrikeViewToggle` en `strike-tracker.js:1202` y `strikeViewRaidsBtn` en el template (`:563`). Es exactamente el "borrar el segundo escritor" que el Reviewer ya pidio. |
| 19 | **IDEA 64** 2 pestañas borran una cuenta | **APLICADA** — `app.js:786-794` (`save(mutate)` relee con `this._fresh()`) + listener de `storage` en `app.js:796` |
| 18 | **ALERT-84** item de menu que decia "Cargando" | **APLICADA** — `router.js:125, 1616, 1875` cablean `#/account/legendary-armory` a `LegendaryTracker` |
| 16 | **IDEA 63** filtros sobreviven al cambio de cuenta | **PARCIAL** — `characters.js:1527-1531` resetea los 4 filtros + pagina. **Los otros 2 modulos que el PO nombro no existen todavia** (ver ALERT-169). |
| — | **Idea 50** cuota | Diagnostico, habilita D/F/E. Sin token. |

**Las 2 secciones de la ronda 33 son la MISMA propuesta duplicada**, no 2: nacieron en
ramas distintas del PO (ALERT-167). Contarlas como 2 infla el conteo del paso 3.

## Hallazgos del ciclo

### ALERT-169 — `gn:tokenchange` no llega al InventoryHub, y el `AGENTS.md` lo dice al reves

Medido contra `origin/main` @ `5f4688f`, no de memoria:

1. `git grep -n tokenchange origin/main -- js/` filtrado por "inventory": **0 matches**.
   `inventory-hub.js` e `inventory-dashboard.js` **no tienen ninguna suscripcion** a `gn:tokenchange`.
   En todo `js/` escuchan: achievements(2), activities(1), characters-theme(1), characters(2),
   homestead-tracker(2), legendary-tracker(3), raid-tracker(2), sidebar-nav(2), strike-tracker(2), app(5).
2. El unico camino de recarga del InventoryHub es `refresh(true)`, con **2 callers**:
   `router.js:1826` (rama `#/account/characters`) y el boton manual `inventory-hub.js:1392`.
3. Cambiar de cuenta desde el selector global (`app.js:1316-1321`) hace
   `setSelected(token, { silent: true })`. El guard de `app.js:843` es
   `if (!opts.silent && gs && changedByCode)`: **con `silent:true` no se re-dispacha `change`**,
   o sea el router no vuelve a correr. Y `loadAllForToken` (`app.js:656-690`) hace **solo**
   `API.account` + `API.wallet` + `render()`. **No toca inventario. No llama `route()`.**
4. `router.js` tiene **0** menciones de `tokenchange`.

**Consecuencia:** en `#/account/characters` (pantalla principal del InventoryHub) y en
`#/inventory/dashboard`, **cambiar de cuenta deja el inventario de la cuenta anterior en
pantalla** hasta que Pablo navega a otra ruta y vuelve, o le da F5.

**Y el `AGENTS.md` afirma lo contrario.** Su seccion "FLUJO DE EVENTOS" dice
"InventoryHub: escucha `gn:tokenchange` → recarga con `refresh(true)`" y
"Router escucha → prefetch ... → render". **Ninguna de las dos existe en el disco.**

Es la clase exacta de bug que IDEA 63 T1 ya arreglo en `characters.js:1527-1531`. O sea:
**la ronda 16 del PO esta aplicada en 1 de los 3 modulos que nombro.**

**Por que lo mando al Reviewer y no lo aplico:** la pregunta es de ALCANCE, no de codigo.
Anadir un `gn:tokenchange` a 2 modulos es mechanical, pero hay una tension real con la
decision que el mismo Reviewer pidio en T12-b: si el fix se hace por evento, el estado del
token tiene un camino mas; si se hace en el router, el router pasa a ser un segundo escritor.
**No toco `router.js` para meter un `tokenchange` ahi** sin su veredicto.

**Una correccion que me cuesta:** el `AGENTS.md` dice que el paso 3 del heartbeat busca "la
rama mas reciente" del PO, y que en el HB#116 eso fue un error mio. No fue mio entero: el
texto del paso esta en `AGENTS.md`/`HEARTBEAT.md` y **nadie lo corrigio**. Si el paso 3
hubiera leido las 9 refs desde el principio, 11 rondas no habrian estado invisibles 2 dias.

## Pendientes

1. **Decisiones de Pablo** (bloquean T14-T18): que verdad manda (URL o pref);
   borrar los worktrees acumulados y las ramas remotas ya mergeadas;
   `feat-idea49g-ach-acc-compacta` (620 lineas esperando veredicto desde el HB#102).
2. **8 ramas remotas sin mergear** que ya aportan 0 secciones nuevas
   (`po/hb69`, `hb77`, `hb87`, `hb97`, `hb99`, `hb104`, `hb110`, `hb114`):
   se pueden borrar cuando Pablo lo autorice.
3. **IDEA 62 T1 sigue sin aplicar** (los 5 TTL siguen en 2 min, `api-gw2.js:398/399/402/409/411`).
   El HB#113 afirmo que estaba aplicada: era FALSO, esas consultas eran otras.
4. **T12-b** sigue vivo y es la unica propuesta del PO con trabajo real pendiente.
   Depende de la pregunta de ORDEN, que depende de Pablo.
5. **T12-b es lo unico que depende de la respuesta del Reviewer sin esperar a Pablo.**
   Si el Reviewer no vuelve, es lo que mas tiempo lleva esperando.

## Alertas

| # | Que | Efecto |
|---|---|---|
| ALERT-169 | `gn:tokenchange` no llega a `inventory-hub.js` ni a `inventory-dashboard.js`, y `router.js` no lo escucha | Cambiar de cuenta deja el inventario anterior en pantalla en 2 rutas. Enviado al Reviewer. |
| ALERT-167 | La rama del PO son 5, no 1 | 11 rondas invisibles desde el 30/09 |
| ALERT-168 | Conteo de secciones invalido entre ramas | Falsos positivos de "falta poco" |
| ALERT-166 | PowerShell y `git show` recodifican | Census por ese canal no son census |
| — | **6 consultas al Reviewer vencidas** + 1 nueva | Ninguna bloquea: son preguntas de diseno que formule yo |
| — | **`main` local atrasada**: `54feae8` vs `origin/main` `5f4688f` | El worktree de `main` esta en `C:/MisArchivos/GW2 online/hb90-wt`. Push siempre desde un worktree fresco sobre `origin/main`. |
| — | **51 worktrees** acumulados | Decision de Pablo (no se borran sin OK) |
| — | `git commit` con heredoc fue **denegado** | Usar `-F archivo` (el mensaje largo no entra por heredoc) |
| — | `findstr /c:"a\|b"` y `;` con `findstr` fallan en cmd | Usar `node -e` para texto (mismo criterio que ALERT-166) |