# TEAM_STATUS - Heartbeat #116 (2026-10-01 23:0x-23:4x UTC)

**Corto:** 11 rondas del PO (18, 22-28, 32) llevaban desde el 30/09 en `main`
sin aparecer nunca, porque **"la rama del PO" no es una rama: son 5**. Mergeado
por union de las 9 refs remotas. Sin codigo de producto tocado.

## Tareas en curso

| Quien | Que | Estado |
|---|---|---|
| **Reviewer** | C1 + pregunta de ORDEN (C vs B) | **Enviada** (`20261001T223349Z-c06d42` + correccion `a17853`). **VENCIDA** a las 23:02, sin respuesta. La ronda 36 (T16/T17/T18) **no se envia**: T17-b es decision de Pablo. |
| **PO** | Ronda 36 (T16/T17/T18) | **Ahora si esta en `main`** (venia de `po/hb114-dashboard`, sin mergear). Sin tarea nueva. |
| **Documentador** | - | Sin tarea (regla de no-fallback vigente). |
| **Pablo** | "que verdad manda: la URL o la pref" | **Espera.** Le llega por `channel_message`. Es la unica decision que bloquea al equipo. |

## Completado en este ciclo

- **Union de las 9 refs remotas de `DASHBOARD_PO_IDEAS.md`** (`301cf0e`, 36 secciones,
  23 rondas). 0 encabezados perdidos contra las 9 fuentes, 0 duplicados, orden
  no-creciente sin rupturas. Los 8 cuerpos en conflicto se revisaron uno por uno:
  gana `main` por ser la fuente mas reciente, y ninguno pierde un identificador de item.
- **14 arneses en `tools/`** (`hb116-*.mjs`), commiteados con `git add -f` porque
  `tools/` esta gitignored. Sin eso, lo que mide no se puede volver a medir (ALERT del HB#115).
- Suite completa: **1341 pass / 0 FAIL en 53 archivos** (`node tools/hb105-suite.cjs`).

## Hallazgos del ciclo

### ALERT-167 — "la rama del PO" no es una rama

Las rondas viven repartidas en **5 ramas que nacieron de puntos distintos**
(`po/hb69`, `po/hb77`, `po/hb87`, `po/hb97`, `po/hb99`, mas `hb104`/`hb110`/`hb114`).
El paso 3 del heartbeat dice "buscar la rama mas reciente", y con eso las otras 4
quedan invisibles para siempre. Y el numero hace ver que "falta poco": `main` solo
tiene 20 secciones y la rama mas nueva 21, o sea **1 de diferencia**.

**REGLA: antes de concluir que un archivo esta al dia, mirarlo en TODAS las refs
remotas sin mergear, no en la mas reciente.** Un archivo que se prepende en cada
rama no tiene un "estado" hasta que se unen todas.

### ALERT-168 — contar secciones por `## ` entre ramas da falsos positivos

El conteo de encabezados difiere por rama (20, 21, 23, 24, 26) porque cada rama
nacio de un punto distinto: el numero no significa nada entre ramas. Con ese
criterio, "Top prioridades" de `hb69` (12572ch) parecia mas nueva que la de
`main` (11281ch) **porque es mas larga, no mas reciente**.

**El criterio que si funciona es el identificador de idea** (`IDEA 49`, `T12`,
`ALERT-84`, `ronda N`): es estable entre ramas y no depende del punto de partida.

## Pendientes

1. **Decisiones de Pablo** (bloquean T14-T18): que verdad manda (URL o pref);
   borrar los worktrees acumulados y las ramas remotas ya mergeadas;
   `feat-idea49g-ach-acc-compacta` (620 lineas esperando veredicto desde el HB#102).
2. **8 ramas remotas sin mergear** que ya aportan 0 secciones nuevas
   (`po/hb69`, `hb77`, `hb87`, `hb97`, `hb99`, `hb104`, `hb110`, `hb114`):
   se pueden borrar cuando Pablo lo autorice.
3. **IDEA 62 T1 sigue sin aplicar** (los 5 TTL siguen en 2 min, `api-gw2.js:398/399/402/409/411`).
   El HB#113 afirmo que estaba aplicada: era FALSO, esas consultas eran otras.
4. El **paso 3 no abrio ronda** otra vez, y esta vez por una razon distinta y
   verificada: las 6 secciones de T16/T17/T18 que hay que mandar dependen de
   una decision de Pablo, y mandarlas al Reviewer sin ella produce un verde falso.

## Alertas

| # | Que | Efecto |
|---|---|---|
| ALERT-167 | La rama del PO son 5, no 1 | 11 rondas invisibles desde el 30/09 |
| ALERT-168 | Conteo de secciones invalido entre ramas | Falsos positivos de "falta poco" |
| ALERT-166 | PowerShell y `git show` recodifican | Census por ese canal no son census |
| — | 5 consultas al Reviewer **vencidas** | La del HB#115 vencio a las 23:02 sin respuesta |
| — | **51 worktrees** acumulados | Decisión de Pablo (no se borran sin OK) |
| — | Un `git commit` con heredoc fue **denegado** | Usar `-F archivo` (el mensaje largo no entra por heredoc) |
