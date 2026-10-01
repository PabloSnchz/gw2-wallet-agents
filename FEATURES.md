# FEATURES.md — inventario de lo construido, para Pablo

> Este archivo alimenta la tab **Promociones** del dashboard.
> A diferencia de `PROMOTIONS.md` (que es el log de **decisiones**),
> este es el **catálogo**: qué se construyó y dónde se ve.
>
> **Regla dura: si no lo sabés, escribí `—`. No lo inventes.**
> Un campo inventado es peor que uno vacío, porque el dashboard deja de
> poder distinguir "no lo sé" de "no existe". En el dashboard, `—` se muestra
> como `—`. Un dato falso se muestra como verdad y eso no lo arregla nadie.

---

## Cómo se escribe una ficha

Una ficha por cosa construida. El encabezado `##` es el **nombre de fantasía**
(lo que Pablo va a leer, no el nombre técnico del branch).

```markdown
## Nombre de fantasía

- **Tipo:** nueva | mejora visible | mejora oculta
- **Estado:** listo | probado ok | probado no va | autorizado | rechazado | revertido
- **Dónde la veo:** <texto concreto: "Cartera → botón ⚡ junto al total">
- **Ruta:** <la ruta del router, si hay pantalla>
- **Descripción:** <una línea, en español, sin jerga>
- **Commits:** `<sha>`, `<sha>` / merge `<sha>`
- **Rama:** `<nombre de rama>`
- **Si no entra:** <qué pasa si esto no llega a producción>
- **Si sale mal:** <qué se rompe si esto sale mal>
```

## Qué significa cada tipo

| Tipo | Qué es | Qué tiene que poder responder Pablo |
|---|---|---|
| `nueva` | Algo que no existía en la app | ¿dónde lo pruebo? |
| `mejora visible` | Botón, filtro, modal o apartado nuevo en algo que ya existía | ¿dónde lo encuentro dentro de la pantalla? |
| `mejora oculta` | No cambia nada en pantalla; hace la app más rápida o más segura | ¿qué gana y qué me puede pasar si entra mal? |

## Qué significa cada estado

| Estado | Qué implica | Dónde lo ve Pablo |
|---|---|---|
| `listo` | está en `agents/main` y se puede probar | en la tab, bajo **Tenés que decidir** |
| `probado ok` | Pablo lo probó y le gustó | en la tab, bajo **Tenés que decidir** |
| `probado no va` | Pablo lo probó y no lo quiere | en la tab, bajo **Descartado** |
| `autorizado` | Pablo lo aprobó; está o va a producción | en la tab, bajo **Ya está en producción** |
| `rechazado` / `revertido` | no entra | en la tab, bajo **Descartado** |

**Regla de escritura:** quien implementa escribe la ficha **en el mismo momento
en que mergea a `agents/main`**, no después. El equipo no anuncia nada por
otro canal: la ficha en este archivo *es* el aviso.

**La ficha la escribe el Principal.** El PO no la escribe: propone ideas en
`PRE_BACKLOG.md` / `DASHBOARD_PO_IDEAS.md`, pero no vio el código y no puede
saber "dónde la veo". Si el Principal no puede llenar un campo, escribe `—`.

---

## Fichas

## Armería Legendaria

- **Tipo:** nueva
- **Estado:** listo
- **Dónde la veo:** Menú lateral → Armería Legendaria (8º ítem)
- **Ruta:** /account/legendary-armory
- **Descripción:** catálogo de las 206 legendarias del juego con precios de
  Trading Post en 39 de ellas, filtro por tipo, generación y expansión, y modo
  "Mi progreso" para marcar las que tenés.
- **Commits:** `35a0f5e`, `bac5c67`, `1aaff5a`, `de14964`, `056501c`, `d64e688`, `3f9d857`
- **Rama:** `feat-legendary-armory` (mergeada)
- **Si no entra:** la webapp sigue sin catálogo de legendarias
- **Si sale mal:** la pantalla abre vacía o el filtro no responde. El resto de
  la app no la toca: es una ruta aislada.
- **Nota:** el detalle al clickear una card **no funciona todavía** —
  `render-catologo.js` no tiene listener. Es ALERT-30, sigue abierto.
