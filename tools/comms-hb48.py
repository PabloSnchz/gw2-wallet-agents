import io, os
ROOT = r'C:\Mis Archivos\GW2 online\gw2-dev'
p = os.path.join(ROOT, 'COMMS_LOG.md')
s = io.open(p, encoding='utf-8').read()

old_029 = "| 029 | default | Code-Reviewer | P1 estilos inline + P2 correctitud del abort en `inventory-dashboard.js`, con las cifras **reencuadradas** (2 `border-radius` en 762/883, 0 `box-shadow`) | **Enviado** | `task-8408fd859db1` | Background 1800s. Pregunta unica, 2 sub-puntos. El P2 ya lo resolvi por merito tecnico (`a4d31ac`); el Reviewer confirma o desmiente. |"

new_029 = old_029 + """
| 029b | default | Code-Reviewer | Revision del Tramo C de la Idea 49 (sharding de `ach_meta`, `f98da49`) | **RESUELTO (HB#48)** | 1 | `task-329b54da90ef` | 2026-09-30T08:00:00Z | 2026-09-30T08:35:00Z | **VEREDICTO: APROBAR CON CAMBIOS.** Encontro **2 defectos reales**, ambos en la escritura del shard: (1) dos cargas concurrentes del mismo shard en frio -> la segunda recibe `[]` -> logros sin nombre/icono/tiers y `earnedAP` = 0 en silencio; (2) `nocache` **encoge un shard compartido** porque `getCache` devuelve `null`. Ademas: el drop de los 5 campos NO estaba aplicado (era proyeccion, no medicion), y las cifras del header no reproducen (habia 3 distintas). Los 2 bugs se **reprodujeron contra el archivo sin modificar**: 12 pass / **2 FAIL**; con el fix 14 / 0. Merge `f09eb7c`, `api-gw2.js` v2.22.0, suite 231 aserciones 0 FAIL. ALERT-49. |
| 031 | default | product-owner | Acuse del HB#48 del PO + secuencia de la 49 (49G -> 49D -> 49F/49E) + aceptacion de la correccion de cifras | **Enviado** | 1 | `task-4a1f7c2be910` | 2026-09-30T08:40:00Z | 2026-09-30T08:40:00Z | Acuse por el canal de archivos. Se confirma su correccion de las cifras (11.88 MB era una forma de registro inventada; la real es `{id,current,max,done,bits}`). **La 029 del HB#46 SI llego** y dio 2 bugs reales: ya estan arreglados y mergeados. Se acepta su secuencia sin cambios y se sube la Idea 52 al frente. |"""

assert old_029 in s, 'no se encontro la fila 029'
s = s.replace(old_029, new_029)

marker = "La 030 (PO, `task-6176f26e77bf`) sigue **running** al cierre de este ciclo. Se recoge en el HB#48."
assert marker in s, 'no se encontro el cierre de la 030'
s = s.replace(marker, """La 030 (PO, `task-6176f26e77bf`) dio **404** en el HB#48: tarea perdida por TTL, no timeout. Sin impacto: el PO
entrego su heartbeat de las 08:00 por su rama y por su mensaje, y todo su contenido esta aplicado.

### Resultado de la 029b (Code-Reviewer) - RESUELTO, y era el bloqueante que faltaba

`task-329b54da90ef` **si llego**. El HB#47 la dio por perdida sin comprobar (ALERT-45). Veredicto
**APROBAR CON CAMBIOS** sobre el Tramo C, con 2 defectos reales de la capa de escritura del shard.

Lo importante del hallazgo, mas alla de los 2 bugs: **el Tramo C estaba mergeado sin validacion desde el HB#47**,
y el PO lo habia dado por bueno ("22 pass / 0 FAIL"). Los tests del PO cubrian el camino *secuencial*; el defecto
es de *concurrencia*. **Un test que solo ejercita el camino feliz no valida una cache compartida**: el sharding
introdujo un estado compartido (el bag por shard) y nadie pregunto que pasa cuando dos lo piden a la vez.

Corolario asumido como regla (**ALERT-49**): **un merge es merge, no validacion.** Un cambio de capa de datos sin
veredicto del Reviewer se marca PROVISIONAL y su `task_id` se sigue hasta el final del ciclo, no hasta el siguiente.""")

if not s.endswith('\n'):
    s += '\n'
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('OK COMMS_LOG.md')
