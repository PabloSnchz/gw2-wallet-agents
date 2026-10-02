# TEAM_STATUS - Heartbeat #130 (2026-10-02 12:1x UTC)

**Corto:** el backlog bajó de **10 items abiertos a 6**, y el más caro de los diez
—*"Legendary Armory Phase 3, ~15-20h, AWAITING API connection"*— **no existía
como trabajo.** Las 5 afirmaciones de la poda del PO se verificaron una por una
contra `origin/main` @ `32926dd` y contra la API viva antes de mergear nada.

## Tareas en curso

| Qué | Quién | Estado |
|---|---|---|
| **Poda de la ronda 41 del PO** | default | **APLICADA y mergeada** (`daeee6f`) |
| **ALERT-41** (Strike Tracker) | Pablo | **BLOQUEADO.** Una llamada con token real a `/v2/account/raids` |
| craftType en la cola | default | Pregunta de ALCANCE esperando al Reviewer |
| Armería paso 6 (árbol) | Pablo | Bloqueado por `tools/cl_recipes.json` sin versionar |

## Completadas este ciclo

- **Legendary Armory Phase 3 CERRADA.** Los 4 scripts (`index.html:1012-1015`),
  la ruta (`router.js:125`, `:1616-1629`, `:1875-1880`), panel (`:539`), nav
  (`:761`) y el veredicto del Reviewer entero (`render-catologo.js`) están
  todos. El "commit 4" es `ed9a126`, **ancestro de main = SI**.
- **ALERT-89 CERRADA.** Su condición de cierre ("cuando el catálogo traiga el
  nombre oficial") es **imposible**: contra `/v2/raids?ids=all` hoy (HTTP 200, 6
  raids, 8 wings, 30 eventos) los 30 eventos traen `{id,type}` y **cero de 30**
  tienen `name`. Recontado hoy: 30 declarados, 30 en la API, 1 fantasma
  (`vloxx`), 1 faltante (`camp`), 0 duplicados.
- **Idea 57: 7 wrappers pedidos, 4 reales.** `luck` ya está hecho
  (`api-gw2.js:1347`, FORMA v2.27.0). Contado con el arnés, no a mano.
- **2 filas archivadas con fecha:** estilos inline de `inventory-dashboard.js`
  (2 `border-radius`, ahora `:764` y `:885`) e Idea 63 T3 (decisión de
  producto, no trabajo).

## Control

- Conteo **propio** sobre el archivo mergeado, criterio `^- \[ \]`:
  **10 abiertos -> 6**.
- Suite: **67 archivos de test, todos exit 0**.
- `git ls-remote --heads origin`: `main = daeee6f`, **sin branch duplicado**.

## Lo que se rompió

Nada en código de producto; el diff es solo `.md`. **La amenaza de la corrida
era de integridad, y la reporta el PO desde su worktree:** `DASHBOARD_PO_IDEAS.md`
llegó al disco con **0 BYTES** y `git status` lo reportaba como "modificado", no
como el HEAD. Sin pérdida en la historia (blob = 156.930 bytes en `32926dd` y en
los 7 commits anteriores), pero lo que casi pasa es 156 KB reemplazados por un
párrafo.

## Pendientes

1. **ALERT-41** — la única llamada que Pablo tiene que hacer con su token real.
   Si el endpoint trae ids utilizables, se arregla; si no, **se borra el módulo**.
2. **14 consultas al Reviewer vencidas** (ALERT-188). Su heartbeat sigue apagado
   **por diseño**; la verificación de crons la hace el Arquitecto.
3. Decisiones de Pablo: versionar `tools/cl_recipes.json`, si `tools/` debe
   seguir ignorado, worktrees y ramas remotos ya mergeados.

## Alertas

| # | Qué | Estado |
|---|---|---|
| **ALERT-195 (nueva)** | `.md` truncado a 0 bytes en un worktree nuevo, invisible para `git status` | **ABIERTA como regla.** El control es el tamaño en disco, antes de editar |
| ALERT-194 | El paso 6 se apoyaba en un dato que el contrato no tiene | ABIERTO como puerta (test versionado) |
| ALERT-194b | `write_file` sobre un log prependeado | CERRADO |
| ALERT-188 | Inbox del Reviewer: 14 consultas vencidas | Sigue. Cron apagado **por diseño** |
| ALERT-41 | Strike Tracker no puede marcar un strike | Sigue. Decisión de Pablo |
| ALERT-187 | La suite depende de un archivo fuera de git | Sigue. Decisión de Pablo |

## Estado de propuestas

**0 propuestas abiertas para el Reviewer.** El PO entró en MODO PODA (10 abiertos
>= 8), así que la corrida entera fue podar: no hubo web research y no se abrió
ninguna idea. Mismo criterio que HB#124 y HB#128: sin ronda nueva, no se manda.

## Commits del ciclo

- `daeee6f` — poda del PO aplicada. Solo `BACKLOG.md`, 7+/6-.

## Salud de la suite

**67 archivos, todos exit 0.** El diff es solo `.md`: la suite no se movió, y
esa es justamente la razón por la que la poda se podía verificar entera antes de
mergear.

## Dos reglas que deja el ciclo

**Un archivo truncado a 0 se reporta como "modificado".** `git status` no
distingue "truncado" de "editado a propósito": los dos son `M`. Después de
`git worktree add`, medir el tamaño de los `.md` que son tuyos **antes** de
escribirlos.

**Una fila cuya condición de cierre nombra un dato que la fuente no produce, es
una fila que espera para siempre.** No es trabajo bloqueado: es trabajo muerto, y
contarlo infla el número que decide si el PO investiga o poda. Archivarla es
**fecharla**, no borrarla: la medición queda escrita para el que mida después.