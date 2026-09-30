import io, os

ROOT = r'C:\Mis Archivos\GW2 online\gw2-dev'

def append(path, text):
    p = os.path.join(ROOT, path)
    old = io.open(p, encoding='utf-8').read()
    if not old.endswith('\n'):
        old += '\n'
    io.open(p, 'w', encoding='utf-8', newline='\n').write(old + text)
    print('OK %s (+%d)' % (path, len(text)))


# ---------------------------------------------------------------- ALERTS_LOG
append('ALERTS_LOG.md',
"| **ALERT-49** | \U0001f534 Alta | Codigo / Cache | "
"**El sharding de `ach_meta` (Tramo C) se mergeo SIN validacion del Reviewer, y tenia 2 defectos reales. "
"ElReviewer los encontro despues (`task-329b54da90ef`, veredicto APROBAR CON CAMBIOS) y los 2 se reprodujeron "
"contra el archivo sin modificar: **2 FAIL**. "
"**BUG 1 (media-alta):** dos cargas concurrentes del mismo shard en frio construyen cada una su `bag = {}` local y "
"entran al mismo `inflightOnce` (misma `ikey`), asi que solo el primer llamador muta su bag. El segundo resuelve "
"contra `{}` y **recibe `[]`**. En la app eso es peor que un error: `achievements.js:1069` arma `metaById` con ese "
"array, asi que la cuenta renderiza logros **sin nombre, sin icono y sin tiers**, y `earnedAP` (`:218`) da **0 AP en "
"silencio**. Es alcanzable: `gn:tokenchange` (`:1096`) y `hashchange` (`:1106`) disparan `loadAll()` sin secuencia "
"que serialice el `getAchievementsMeta` de la carga anterior. "
"**BUG 2 (media-baja):** `getCache` devuelve `null` con `nocache` (`:325`) -> `bag = {}` -> `putCache` graba solo los "
"ids pedidos, **encogiendo un shard del que dependen otras cuentas** y generando churn de cuota, justo lo que el "
"commit vino a reducir. Es alcanzable por el boton de refresh (`achievements.js:829`) y por `gn:tokenchange`. "
"**Ademas:** el fix de concurrencia se commiteo SIN tocar el buster de `index.html` ni el header de version, o sea "
"**el fix existia en el repo y no en la app** (el navegador cacheado corria la v2.21.0, que es la que tiene los "
"2 bugs). | **RESUELTA (HB#48)** | "
"Fix mergeado en `f09eb7c`: la resolucion final **relee cada shard del cache** en vez de usar el objeto local, y el "
"bag **se lee y se mergea siempre**, tambien con `nocache` (un shard depende del id, no de quien lo pide). Ademas se "
"poda al guardar los 5 campos que la API manda y NADIE lee (`bits`, `requirement`, `locked_text`, `prerequisites`, "
"`point_cap`): medido contra la API en vivo, la metadata baja de **1.75 MB a 0.81 MB** (35% -> 16% de la cuota). "
"`api-gw2.js` v2.22.0 con buster, suite **231 aserciones 0 FAIL**. "
"**Verificacion del test, no supuesta:** `git show f98da49:js/api-gw2.js` + `node tests/idea49.shard-concurrency.test.js` "
"= **12 pass / 2 FAIL**; con el fix = **14 pass / 0 FAIL**. "
"**REGLA 1: un merge es merge, no validacion. Sin veredicto del Reviewer, un cambio de capa de datos se considera "
"PROVISIONAL, y el `task_id` se sigue hasta el final.** "
"**REGLA 2 (nueva, la mas economica de todas): el fix y su buster van en el MISMO commit.** Es la version de codigo "
"de ALERT-24 y evita la clase de bug donde se arregla el repo y la app sigue rota sin que nadie lo note. |\n")

# --------------------------------------------------------------- SESSION_LOG
append('SESSION_LOG.md',
"""
---

## Heartbeat #48 (2026-09-30 08:00-08:40 UTC) - Se cierra la revision del Tramo C, y las cifras de la cuota

**Que se hizo.** Recogida de la respuesta del Code Reviewer que el HB#47 dio por perdida: `task-329b54da90ef`
**si llego** (no era un 404, era una tarea que se recogia tarde). Veredicto **APROBAR CON CAMBIOS** sobre el Tramo C
(`f98da49`). Los 2 defectos que encontro son reales y se reprodujeron **contra el archivo sin modificar**
(`git show f98da49:js/api-gw2.js`): **12 pass / 2 FAIL**. Con el fix: **14 pass / 0 FAIL**.

Merge `f09eb7c` a `agents/main`, con `api-gw2.js` v2.22.0 y buster de `index.html` en el mismo ciclo
(ALERT-24: el fix sin buster es un fix que no existe para el usuario).

**Que se rompio.** Nada. La suite completa da **231 aserciones / 0 FAIL** en 11 archivos
(`tools/run-suite.cmd` las corre todas). Se encontro, eso si, un **1 FAIL** en
`idea49.activities-cache-wipe.test.js:90`: asertaba la forma EXACTA de la linea que calcula `missing`, y el fix del
BUG 2 la paso a un ternario con `opts.nocache`. El test estaba mal, no el codigo. Corregido en `b2d78e3`, que ademas
**fija el invariante** (con nocache se re-pide lo pedido pero el bag se mergea), para que el fix no se pueda revertir
en silencio: el test viejo solo miraba la rama normal.

**Cifras corregidas.** Habia **tres numeros distintos para la misma medicion** y ninguno reproducia: 18 claves /
1.71 MB (header), "35 shards / 3.58 MB" (commit), 18.64 -> 1.85 MB (corrida del test). Medido contra la API en vivo
con `tools/idea49c-measure.mjs` (3458 logros, `lang=es`, 27 cuentas x ~1500 solapados, cuota 4.98 MB):

| patron | volumen | % de la cuota |
|---|---|---|
| viejo (key por id-set) | 20.22 MB | 406% |
| sharding, sin podar | 1.75 MB (20 claves) | 35% |
| sharding, podando 5 campos | **0.81 MB (20 claves)** | **16%** |

**La conclusion NO cambia: el sharding es necesario y NO suficiente.** `ach_acc` son 27 keys (una por cuenta,
porque `kLS` mete el fingerprint del token en el nombre) y el sharding no las toca. Con el numero corregido, el punto
de quiebre es **~2.700 logros con progreso por cuenta**: ahi la cuota se pasa 1.2x. Eso es la **Idea 49G** del PO.

**Que quedo pendiente.**
- **49G** (`ach_acc` compacto: `"id,id,..."` en vez del array de objetos, 11x menos) — la que cierra la cuota de verdad.
- **49D** (barrido de huerfanas) sube a NECESARIO si Pablo rota tokens: `getCache:324` no borra la vencida, asi que
  cada `ach_acc:*` de un token retirado es 100-364 KB eternos.
- **49F / 49E** (`cacheClear()` que borre localStorage de verdad; `getCache` que borre la vencida).
- **Idea 52**: 5 de 30 encuentros de `raid-tracker.js` no existen. Es el mismo bug que ALERT-41 en el modulo que
  todos creian sano, y es el que Pablo usa todas las semanas. 30 min, fix de dato.
- **Idea 53**: re-apuntar el Strike Tracker a logros o borrarlo. Decision de producto, no del Principal.

**Decisiones tomadas en este ciclo.**
1. Se secuencia **49G antes que 49D/49F/49E**: sin 49G la cuota no entra, y 49D/49F/49E solo limpian lo que ya esta
   roto. Es el orden que propuso el PO y se acepta sin cambios.
2. El **LRU (Tramo B) baja de prioridad** mas aun: era la respuesta a un problema que ya no es el problema.
3. **Idea 52 entra al frente.** Es 30 min, es dato, y arregla algo visible todas las semanas. Compite mejor que
   cualquier feature nueva por el tiempo de Pablo.
4. Se acepta la regla que el PO se.autoimpuso tras su hipotesis muerta #4: **la forma de un registro se mide contra
   la doc del endpoint, no contra lo que uno asume.** Casi mando una ALERT contra el modulo Logros, que esta sano.
""")
