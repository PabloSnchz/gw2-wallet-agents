# TEAM_STATUS - Heartbeat #128 (2026-10-02 11:0x UTC)

**Corto:** el **último paso del plan de noche se cayó porque se lo LGPL midió antes
de programarlo**, y caerse así es barato. El árbol de fabricación necesita la
receta de cada *ingrediente*; el contrato declara 567 ingredientes en 236 ids y
**0** de esos ids tienen receta en el propio contrato. Un árbol recursivo sobre
esto dibuja siempre un nivel. No le falta la recursión: le faltan los datos.

Y en el camino, **ALERT-193 se reprodujo un ciclo después de cerrarse**, en el
mismo archivo y con el mismo número. Esa parte es la que más me importa mirar.

## Tareas en curso

| Qué | Quién | Estado |
|---|---|---|
| **Armería paso 6 (árbol de fabricación)** | default | **CORTADO con la premisa medida.** Puerta versionada: `tests/armeria-arbol-premisa.test.js` (11/0) |
| **ALERT-194b — reincidencia de ALERT-193** | default | **CERRADO.** Datos restaurados; mecanismo corregido |
| craftType en la cola | default | Pregunta de ALCANCE esperando al Reviewer. El código NO valida craftType a propósito |

## Completadas este ciclo

- **La premisa del plan de noche, medida antes de codearla.** El plan (paso 6)
  da por hecho que el contrato sostiene un árbol recursivo. Medido: **567
  ingredientes declarados, 236 ids distintos, 0 con receta en el propio
  contrato**. El dato sí existe en la fuente (**86%** de esos ingredientes, con
  profundidad de hasta **8 niveles**); lo que falta es que la fuente entre al
  contrato.
- **El corte quedó como puerta, no como veredicto.** El test afirma el **número**
  (`cubiertos === 0`), no un «no se puede». El día que alguien amplíe el
  contrato, ese número deja de ser 0 y **el test falla solo**. Fase roja probada
  en las dos direcciones: `CONTROL 2` dentro del archivo versionado da 1 con un
  contrato sintético; `tools/hb128_fase_roja.js` da **10 pass / 1 FAIL** al
  cambiar el aserto contra el contrato real.
- **Sizing de la ampliación, para que la decisión de Pablo no sea a ciegas.**
  206 → **613** entradas (471 componentes), **65.9 KB → 214.3 KB (×3.3)**.
- **PASO 3: sin ronda.** `ls-remote refs/heads/po/*` = **13 refs, el mismo
  conjunto que HB#127**. 0 propuestas nuevas. No se mandó nada al Reviewer:
  mandarle lo ya aplicado es la forma más cara de perder un ciclo (HB#103).

## Lo que se rompió, y por qué importa

**ALERT-194b: ALERT-193 se cerró en HB#127 y se reprodujo en HB#128.** Al escribir
ALERT-194 usé `write_file` sobre `ALERTS_LOG.md`, que va por **prepend** y la
herramienta **sobreescribe**:

    1 file changed, 65 insertions(+), 4951 deletions(-)
    ALERTS_LOG.md   4957 lineas  ->  71

Restaurado con `git checkout` en ~1 segundo. **La única razón de que esto no sea
otra tragedia: el archivo estaba commiteado.** Si hubiera estado sin commitear, el
ciclo anterior lo habría perdido.

**Lo que HB#127 aprendió no era lo que había que aprender.** Cerró el alerta sobre
el *dato* (8500 líneas recuperadas, y una regla útil sobre historial vs. estado).
Esa regla es cierta y no era el fallo. El fallo es que **el log va por prepend y
la herramienta disponible sobreescribe** — con un log prependeado, esa herramienta
es un `rm` con otro nombre. **Recuperar el dato no cierra el bug si lo que falló
fue la herramienta.**

Corregido: `tools/prepend.cjs` (antepone e imprime el crecimiento de líneas) y,
porque `tools/` está en `.gitignore` y no se versiona, **la regla además quedó
escrita en `AGENTS.md`**, que sí está versionado.

## Pendientes

1. **Árbol de fabricación** — bloqueado por decisión de Pablo: versionar
   `tools/cl_recipes.json` (plan de noche §8). Con eso solo: ampliar el contrato
   y la puerta se abre sola.
2. **Reviewer sin despertador** (ALERT-188): 14 consultas vencidas, la más vieja
   de 2 días. **No reactivo su cron**: la verificación de crons la hace el
   Arquitecto.
3. `tools/.gitignore` y **ALERT-41** (Strike Tracker): decisión de Pablo.
4. 51 worktrees vivos y ramas remotas ya mergeadas sin borrar: decisión de Pablo.

## Alertas

| # | Qué | Estado |
|---|---|---|
| **ALERT-194b** | `write_file` sobre un log prependeado: 4951 líneas borradas | **CERRADO.** Datos OK; mecanismo corregido en `tools/` + `AGENTS.md` |
| **ALERT-194** | El paso 6 del plan se apoya en un dato que el contrato no tiene | **ABIERTO como puerta.** El número está congelado en un test |
| ALERT-193 | Logs truncados por overwrite | Cerrado en HB#127; **reincidente en HB#128**, ver 194b |
| ALERT-188 | Inbox del Reviewer: 14 consultas vencidas | Sigue. Su heartbeat está desactivado por diseño |
| ALERT-41 | Strike Tracker no puede marcar un strike | Sigue. Decisión de Pablo |
| ALERT-187 | La suite da verde o rojo según un archivo que no está en git | Sigue. Decisión de Pablo |

## Estado de propuestas

**0 propuestas abiertas para el Reviewer.** Sin ronda nueva del PO y con las
14 consultas vencidas siendo preguntas de alcance que el Reviewer no leyó, no
hay nada que mandarle.

## Commits del ciclo

- `8dac6c8` — la puerta del árbol. **Sin cambios en código de producto**: 1 test,
  166 líneas.

## Salud de la suite

`node tests/_run-all.js` → **67 archivos, 1712 pass, 0 FAIL, exit code 0**.
(66 archivos / 1701 en HB#127; el test nuevo aporta 11 aserciones.)
`armeria-alert-01-clasificacion` aislado: **121/0**.

## Dos reglas que deja el ciclo

**Un 0 de un detector nuevo se verifica abriendo el dato, no preguntándole al
detector.** La primera medición dio 0/567 —el número que casi cacé como
verdad— por indexar la fuente con `r.output`, clave que no existe (la real es
`output_id`). Un índice por una clave inexistente da 0 con toda seguridad, y ese
0 es indistinguible de «el dato no está». Con esa medición el informe habría
dicho «el árbol es imposible» y habría sido **falso**: el 86% sí tiene receta.
Lo que distinguished las dos cosas fue imprimir `Object.keys(arr[0])`.

**Recuperar el dato no cierra el bug si lo que falló fue la herramienta.**
ALERT-193 se cerró sobre el archivo; el archivo volvió a caerse porque la forma
de escribir no cambió. Una alerta que se reproduce un ciclo después de
cerrarse no estaba cerrada: estaba **arreglada**.