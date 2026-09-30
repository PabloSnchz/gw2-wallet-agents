# TEAM STATUS - Heartbeat #49 (2026-09-30 07:40 UTC)

> Actualizado por el Principal. Clon de trabajo: `C:\Mis Archivos\GW2 online\gw2-dev`.
> `agents/main` @ `ab39823`. El remoto de desarrollo se llama **`origin`** en este clon.

## Estado del equipo

| Agente | Estado | Evidencia del ciclo |
|---|---|---|
| Principal (default) | **OPERATIVO** | Ciclo completo. Merge `ab39823` + push verificados contra `git ls-remote`: el remoto quedo en `ab39823`, sin branches duplicados. |
| Code-Reviewer | **OPERATIVO** | Tarea enviada este ciclo (`task-bcff44b0f698`, Idea 52). Sin respuesta todavia — se recoge en el proximo ciclo (PASO 1). |
| product-owner | **OPERATIVO** | Entrego 4 heartbeats seguidos (04:00, 06:00, 06:30, 08:00) con Ideas 49, 50, 52, 53. La Idea 52 se implemento este ciclo. Pregunta abierta `20260930T073734Z-74adc1`. |
| Documentador | Sin evidencia | Sin tarea en vuelo y sin comprobacion este ciclo. `HEARTBEAT.md` sigue registrando timeout. **Pendiente: verificar `active_model`.** |
| Arquitecto | Activo | Intervino en el canal de archivos: detecto que el cuerpo de la comm 029 llego como la palabra `prueba.txt`. |

## Trabajo completado este ciclo

### Idea 52 — 5 de los 30 encuentros de raid-tracker no se podian marcar nunca

**Origen:** propuesta del PO en su heartbeat de 06:30. **Verificada de forma independiente antes de tocar codigo**, y el hallazgo del PO se reproducio exacto: 30 encounters en el codigo contra 30 eventos reales, 25 coinciden, 5 no existen, 5 eventos reales no cableados.

**El mecanismo, y por que no hace falta un token para probarlo:**

```js
state.completedEncounters = GW2Api.getAccountRaids(token)  // array plano de STRINGS
var completedSet = new Set(completedEncounters);           // :1392
var isCompleted = completedSet.has(enc.id);                // :1438
```

`/v2/account/raids` devuelve el id del encuentro como string. Si `enc.id` no coincide **byte a byte**, la comparacion falla para siempre: la tarjeta no se marca jamas, el ala queda trabada en N-1/N, el KPI no lo dice y **no hay error ni warning**. Un tracker que miente en silencio.

**Cambios (14 renombres de clave + 1 bloque muerto borrado):**

| Antes | Ahora | Ala (medida contra el catalogo) |
|---|---|---|
| `siege_the_stronghold` | `escort` | Stronghold of the Faithful |
| `desmina` | `soulless_horror` | Hall of Chains |
| `dhuum` | `voice_in_the_void` | Hall of Chains |
| `gates_of_ahdashim` | `gate` | The Key of Ahdashim |

Los renombres se emparejaron **por ala, no por nombre**, porque los nombres no se parecen: `Siege the Stronghold` vs `escort`, `Dhuum` vs `voice_in_the_void`. La unica senal fuerte es que cada uno es el unico evento de ese wing.

**Hallazgo adicional, no estaba en el informe del PO:** las claves `ura_guardian` de `REWARDS_DATA` y `BOSS_DETAILS` no eran el id de ningun encounter — el de Ura es `ura`. Las recompensas de Ura y su ficha **nunca se mostraban**. Mismo tipo de bug, otra capa. Tambien se borro `the_threshold` (19 lineas muertas de un encuentro que no esta en ningun lado).

**Lo que NO se toco, a proposito:** `vloxx` (el ala del CM de Sept 29) queda como fantasma conocido. `/v2/raids` no expone el ala Nexus of Eternity, y decidir que hacer con ella es **producto, no fix de dato**. El test falla si la lista de fantasmas crece, asi que la excepcion no se puede extender sola.

**Verificacion (no supuesta):**
- `tests/idea52.raid-encounter-ids.test.js`, 27 aserciones, con el catalogo real embebido en `tests/fixtures/`.
- **20 pass / 7 FAIL contra el archivo SIN modificar** → **27 pass / 0 FAIL** despues.
- Suite completa del repo: **258 aserciones, 0 FAIL** en los 11 tests.
- Riesgo de datos del usuario: **cero**. El modulo no persiste los marcados en `localStorage` (solo guarda `raid_strike_view` y la key); el estado siempre viene de la API. Sin CSS, sin logica, sin endpoints, total de encounters sin cambio (30), y `name`/`nameEn`/`type`/`li`/`icon` intactos.

### Rescate de trabajo del PO que se estaba perdiendo

`PRE_BACKLOG.md` y tres scripts del PO (`tools/idea52-audit.py`, `tools/idea52-icons.py`, `tools/mem-hb48.py`) estaban **untracked en el working dir y en ninguna rama**. Ya paso con `_hb54_achacc.js` en el HB#48. Commiteados en `ab39823`.

## Tareas en curso

| Task | Agente | Que | Estado |
|---|---|---|---|
| `task-bcff44b0f698` | Code-Reviewer | Revision del diff de la Idea 52 (14 renombres de id) | **En vuelo.** Recoger en el proximo ciclo con PASO 1. |
| `20260930T073734Z-74adc1` | product-owner | Acuse de la Idea 52 + 5 preguntas/datos | **Esperando.** |

## Propuestas

| # | Idea | Origen | Estado |
|---|---|---|---|
| 52 | 4 renombres de id en raid-tracker | PO 06:30 | **IMPLEMENTADA** en `ab39823` |
| 53 | Strike Tracker: re-apuntarlo a logros | PO 06:30 | Abierta, **decision de producto**. El PO mismo ofrece borrar el modulo si el mapeo no verifica |
| 50 | La cuota de localStorage no se libera nunca (49D/E/F) | PO 06:00 | Abierta. **49D (barrido de huerfanas, ~30 lineas) es la que mas rinde** |
| 49G | `ach_acc` en forma compacta | PO 08:00 | Abierta, verde-media. Unica pieza que cierra la cuota de verdad |

## Alertas

- **ALERT-51 (nueva, RESUELTA):** `raid-tracker.js` — 5 de 30 encuentros con id inexistente, 1 clave de datos mal (`ura_guardian`), 1 bloque muerto (`the_threshold`). Ver detalle abajo.
- **ALERT-52 (nueva, ABIERTA):** `/v2/raids?ids=<id-de-evento>` devuelve **404**. Ver abajo — es una trampa para la Idea 53.
- **ALERT-53 (nueva, ABIERTA, baja):** huecos de datos menores en el mismo modulo.
- **ALERT-50 (de HB#48):** sigue mitigada por procedimiento. La regla se aplico: `git status -sb` + `git log --oneline -1` en la misma llamada antes de commitear, y el hash verificado en la rama esperada despues.
- **ALERT-49 (de HB#48):** resuelta en `f09eb7c`.

### ALERT-51 — 5 de 30 encuentros con un id que la API no tiene

**Severidad: media-alta. Estado: RESUELTA en el HB#49 (merge `ab39823`).**

17% de los encuentros de un modulo que Pablo usa todas las semanas **no se podian marcar nunca**, en
silencio. El ala 3 se trababa en 3/4, el ala 5 en 3/4, el ala 7 en 3/4. Nada en la UI lo indicaba.

**Por que no lo detecta ningun test que existia:** los tests cubrian el camino feliz del marcado; ninguno
verifico que el `enc.id` exista en el catalogo. La asercion que hacia falta es *"todo id que el modulo
puede marcar tiene que ser alcanzable por la API"*, y esa no existia.

**Corolario reutilizable:** un tracker no se valida probando que marca, sino probando que **lo que no marca es
porque la API no lo tiene**. La diferencia entre las dos es exactamente el espacio de los bugs silenciosos.

### ALERT-52 — los ids de evento NO son resolubles uno a uno

**Severidad: media. Estado: ABIERTA. Trampa para quien implemente la Idea 53.**

Medido hoy contra la API en vivo:

```
GET /v2/raids?ids=gorseval  ->  404  "all ids provided are invalid"
GET /v2/raids?ids=all       ->  6 raids, cada uno con wings[].events[]
```

Dos consecuencias:

1. Los ids de encuentro **no se pueden pedir individualmente** a `/v2/raids`. Solo existen dentro de
   `?ids=all`. Quien implemente la Idea 53 resolviendo un id de strike contra `/v2/raids?ids=<id>` se come
   un 404, igual que se lo comio mi primer probe.
2. La forma real es **`raid.wings[].events[]`**, no `raid.events[]`. La extraccion ingenua (`w.events`)
   devuelve los 6 ids de raiz y hace creer que solo hay 6 encuentros en el juego.

El POlewsl 06:30 llego a la conclusion correcta (los 15 ids de strike no existen ahi) pero por otra via; el
detalle de la resolucion individual no lo tenia. **Regla: el catalogo de la API se extrae de la respuesta
completa, y "no existe" se demuestra con el snapshot, no con una consulta suelta.**

### ALERT-53 — huecos de datos menores en raid-tracker (mismo modulo, misma capa)

**Severidad: baja. Estado: ABIERTA, no bloqueante. No se toco en este ciclo.**

Medido, sin actuar:

- `statues_of_grenth` esta declarado `type: "jefe"` pero no tiene drops en `REWARDS_DATA`. Es un jefe real
  (Grenth): hueco de datos, no bug de id. **No se relleno porque rellenarlo es inventar drops.**
- `bandit_trio` y `river_of_souls` estan clasificados `type: "evento"` cuando la API los reporta `Boss`.
  Cosmético: cambia el icono (👑 vs ⚡) y el color de la tarjeta. **No se toco** para no ampliar el diff.
- Los 5 eventos reales no cableados (`camp`, `escort`, `gate`, `soulless_horror`, `voice_in_the_void`).
  Agregarlos suma 5 encounters y **cambia el denominador del KPI (30 → 35)**. Eso cambia el grid: es
  decision de Pablo, no del equipo.

## Pendiente que requiere a Pablo

- **Decision de producto sobre `vloxx` / Nexus of Eternity:** el ala no esta en `/v2/raids`. ¿Se saca el ala
  9 del grid, o se deja como espera?
- **Decision de producto sobre los 5 encounters no cableados:** 30 → 35 cambia el KPI que Pablo ve.
- **Promocion a produccion:** `PROMOTIONS.md` mantiene el inventario. El equipo **no propone promover**.

## Verificacion del push de este ciclo

```
62a8b0f..ab39823  HEAD -> main
git ls-remote --heads origin  ->  main = ab39823
```

Sin branch duplicado con slash. Rama `fix-idea52-raid-encounter-ids` borrada local (nunca existio en remoto:
solo se pusheo el merge a `main`, que es lo que corresponde).
