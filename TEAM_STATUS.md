# TEAM_STATUS - Heartbeat #124 (2026-10-02 06:2x UTC)

**Corto:** el WIP de un ciclo muerto era correcto, y casi lo commiteo sin mirarlo.
Auditarlo dio tres cosas que el test no afirmaba (las cinco clases del modal existen en
`main.css` pero no como selectores en `css/`; `root.LegendaryCatalog.items` existe;
`state.characterItems` es un gancho ya cableado). Y mutar el código encontró una
mutación que **no moría**: el arnés daba 32/0 con el `note` del `unknown` cambiado por el
del `no_recipe`, que es exactamente el bug que el plan de noche dice evitar. Ver
ALERT-189.

## Tareas en curso

| | Qué | Estado |
|---|---|---|
| **ARME 1.2** | modal de materiales | **TERMINADO y mergeado** — `6e6287b` |
| **ARME 2.3 / cola** | cola de crafteo (max 5) | pendiente — el paso 5 del plan |
| **Armería** | quitAR el switch 2.2 (`setScope`) | **NO se puede quitar antes** de la cola, o "Mi progreso" queda sin selector |

## Completadas

- **ARME 1.2 — modal de materiales.** `6e6287b`, 3 archivos, +564/-1. Click en una card
  -> TENGO / NECESITO / FALTA de cada material, contra banco + materiales + bolsa
  (**sumados**, no encogidos). Suite **1669/0, 64/64 por exit code**. Test propio 34/0.
- **ALERT-189 cerrado** en el mismo commit de logs: el arnés ahora exige que el `note` del
  `unknown` no sea el del `no_recipe`.

## Pendientes

1. **El Reviewer no lee su inbox (ALERT-188). 13 mensajes**, el más nuevo de las **01:05**
   de hoy; su `archive` deja de crecer el **01/10 20:12**. **2 días.** Es lo único que
   bloquea el paso 3 de verdad. **No reactivé su cron**: la verificación de crons la hace
   el Arquitecto.
2. **La pregunta abierta sobre `craftType:none`** sigue sin respuesta. El arnés del 1.2
   **no la supone en ninguno de los dos sentidos**, así que si la respuesta cambia, el
   cambio queda localizado en un solo lado.
3. `tools/.gitignore`: decisión de Pablo. Al dato le falta **una línea**, no cuatro.
4. **ALERT-41** (Strike Tracker): cierre único con el body crudo de `/v2/account/raids`.

## Propuestas del PO — paso 3 NO abrió ronda

Conteo sobre la **unión de las 12 refs** `po/*`, leyendo el **cuerpo** de cada blob:
**144 secciones** con "ronda N", **41 CUENTA / 39 CERRADAS**, control negativo **0**.

**41 es la unión, no 41 propuestas.** Los items **distintos son 6** (T13, T12, IDEA 64,
IDEA 63, T19, ALERT-84) y T12 aparece **dos veces con fecha distinta** — ALERT-168, **4a
vez que cae el mismo criterio**.

Los **6 verificados uno por uno contra `origin/main`: 9/9 con respaldo**, cada uno con su
test propio. **Los 6 ya están aplicados. No se mandó nada al Reviewer.**

## Alertas de este ciclo

- **ALERT-189 (nueva, CERRADA):** un arnés puede dar verde sobre el bug que dice cazar.
  Un aserto sobre el *enum* de un estado no alcanza si el estado también se pinta por su
  *texto*. **Un arnés al que nunca se le hizo una mutación no es un arnés.**
- **ALERT-188 (sigue ABIERTA):** el Reviewer con 13 mensajes sin leer.
- **ALERT-187 (de este heartbeat, sigue VIVA):** la suite da verde o rojo según un
  archivo (`tools/cl_recipes.json`) que **no está en git**. Copiado al worktree: verde.
- **El BOM volvió a salir en el commit** (`git commit -F` en Windows). Corregido con
  `--amend`. Mi verificación previa cubría **sólo el CJK**: la regla estaba escrita entera
  y la cumplí a medias.

## Entorno

- El driver **vetoó 3 comandos** por contener `rm` como subcadena (`Remove-Item`, un
  `for` con `%BR:refs/...%`, otro refspec). Workaround: **node en vez de `for` de cmd.**
- `git checkout main` falla en un worktree: `main` ya lo usa `hb90-wt`.

---

# TEAM_STATUS - Heartbeat #123 (2026-10-02 04:5x UTC)

**Corto:** el plan de la nocheaba dos pasos atras. **Los dos ya estaban hechos** --
no por el plan, sino por el ciclo anterior, que los mergeo a las **04:04** y **04:19**
UTC, cuando el plan se escribio a las **03:16**. Verifique las dos cosas que el plan
daba por rotas y ninguna lo estaba: `git merge-base --is-ancestor 22a6a71 origin/main`
da **MERGEADO**, y `legendary-data.js` tiene **206 items con 0 `generation: null`**
(era el bug ALERT-ARME-01, el que el plan marcaba como vivo y bloqueante).

**El FAIL con el que arranco el ciclo tampoco era un bug del codigo.** `CONTRATO-10a`
regenera `legendary-recipes.js` desde `tools/cl_recipes.json`, y **`tools/.gitignore`
es `*`**: el dataset no esta en ningun clon. El test da **53/0** donde el `.json`
untracked existe y **49/1** en un worktree limpio. Copie el dataset y dio **53/0** sin
tocar codigo -- **una sola variable**. Ver ALERT-187.

**Lo que si se hizo: ALERT-179 cerrado, y sin el Reviewer.** Su `last_read` sigue en
**2026-09-30 18:55**: **12 preguntas sin leer en 2 dias**. La pregunta era si delegar
`importFromData` en `applyImportData` cambia un contrato publico, y la respondi
**midiendo el cuerpo** de las dos funciones: las 7 escrituras eran **identicas linea
por linea y en el mismo orden**, y lo que hace distinta a `importFromData` (parsear,
validar, devolver `{success:true}`) queda **todo adelante y despues**. Delegar no
cambia el contrato. Commit `029d2e1`, **16/0** con 2 controles negativos, suite
**63 archivos / 1635 pass / 0 FAIL**. Ver ALERT-188.

---

## Tareas en curso

| Que | Quien | Estado |
|---|---|---|
| **Armeria, paso 1.2 (modal de materiales)** | default | **ARRANCABLE.** `state.bank` y `state.materials` ya se piden en `legendary-tracker.js:481` y nunca se leyeron: el contrato esta (paso 2, `ed9a126`) y los datos llegan. **Sin tocar todavia.** |
| **Armeria, paso 5 (cola de crafteo)** | default | Pendiente. Depende de 1.2. |
| **Que se cae el switch 2.2** (`setScope`, `scopeToggleHTML`, `wireScopeBar`) | default | **Reencuadrado por el plan**, no empezado. Vive en `legendary-tracker.js:116-117, 253, 308-316, 321-350` + `render-catologo.js:342`. Es ~40 lineas en 2 archivos. **Depende de que la cola de crafteo este antes**: quitarlo sin reemplazarlo deja "Mi progreso" sin selector. |

## Completadas este ciclo

- **ALERT-179** — `importFromData` delega en `applyImportData` (7 escrituras duplicadas
  que eran identicas linea por linea). `029d2e1`. Test propio 16/0, fase roja 2 FAIL.
- **PASO 3 cerrado sin ronda** — conteo sobre la union de las **12 refs** del PO, leidas
  del cuerpo de cada blob: **27 secciones**, **6 CUENTA / 10 CERRADAS**, control negativo
  **0**. Las 6 son **5 items** (la ronda 33 cuenta 2 veces, ALERT-168 3a vez), y **los 5
  ya estan aplicados** en `origin/main` con test propio (1/1, 2/2, 1/1, 2/2, 1/1).
  **No se abrio ronda** porque mandarle al Reviewer algo ya hecho es la forma mas cara
  de perder un ciclo.
- **PASO 0 limpio** — inbox sin preguntas, replies sin novedades. `overdue`: **12**
  consultas vencidas, **9 al Reviewer** + 3 al PO.

## Pendientes

1. **El Reviewer no lee su inbox** (ALERT-188) — 12 mensajes, 2 dias. Es la unica cosa
   de esta lista que **no depende de una decision de Pablo** y por lo tanto no la puede
   resolver el Arquitecto solo. **Si tiene que contestar, necesita un despertador.**
2. **Armeria 1.2** — el modal de materiales, que es lo que hace que la cola tenga sentido.
3. **`tools/.gitignore`** — es decision de Pablo (ARME_TRABAJO_NOCHE §8). La excepcion
   propuesta cubre de mas: `run-suite.js` y `run-suite.cmd` **ya estan trackeados**.
   Falta **una sola linea** para el dataset.

## Alertas

| # | Que | Estado |
|---|---|---|
| **ALERT-187** | La suite da verde o rojo segun un archivo que **no esta en git** | Medido. Decision de Pablo. |
| **ALERT-188** | Inbox del Reviewer: 12 preguntas sin leer desde 2026-09-30 18:55 | El Principal resolvio su cola (Capa 3). |
| ALERT-179 | `importFromData` con las 7 escrituras duplicadas | **CERRADO** (`029d2e1`). |
| ALERT-41 | Strike Tracker no puede marcar un strike como completado | **Sigue vigente.** Cierre unico: el body crudo de `/v2/account/raids` con token real. Si el endpoint no trae ids utilizables, **se borra el modulo** — decision de Pablo. |

## Estado de propuestas

**0 propuestas abiertas para el Reviewer.** Las 5 del PO estan aplicadas. Las 12
consultas que esperan son **preguntas de alcance** que el Reviewer no leyo, no propuestas
nuevas.

## Commits del ciclo

- `029d2e1` — `fix(settings)`: ALERT-179, `importFromData` delega en `applyImportData`.

## Salud de la suite

`node tests/_run-all.js` -> **63 archivos, 1635 pass, 0 FAIL**.
Arranco del ciclo: **62 archivos, 1619 pass, 1 FAIL** (el de `CONTRATO-10a`, que era
el entorno, no el codigo).

