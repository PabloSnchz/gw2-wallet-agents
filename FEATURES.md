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

## Ficha de la pieza: la cola de crafteo

- **Tipo:** mejora visible
- **Estado:** listo
- **Dónde la veo:** Leyenda Legendaria -> pestaña "Mi progreso". Ahi ahora hay una lista de hasta 5 legendarias: "Cola de crafteo 3/5". Para agregar, tabs a la pestaña "Catálogo" y toca una legendaria (se pinta de morado). Volves a "Mi progreso" y aparece la fila, con dos botones: "Materiales" (abre el modal con lo que te falta) y "Quitar". Las 3 primeras filas tienen borde morado.
- **Ruta:** `#/account/legendary-armory` (pestaña Mi progreso)
- **Descripción:** Elegis hasta 5 legendarias y ves, en una pantalla, cuales estas por fabricar y que materiales te faltan de cada una.
- **Commits:** `ae10e5b`
- **Rama:** `feat-hb126-cola-crafteo` (mergeada a main)
- **Si no entra:** "Mi progreso" sigue siendo la grilla de antes (las 206 divididas en desbloqueadas / solo faltantes), con el switch de alcance. El catalogo no cambia. No se rompe nada: es lo que habia hasta ayer.
- **Si sale mal:** la cola se pierde al recargar, o no acepta la 6ta legendaria. **Medido antes de mergear: 15 asserts propios mas la suite completa (66 archivos, 1701 pass, 0 FAIL), y un id fraccionario que entraba vivo y se perdia en la recarga ya esta corregido.**

### Lo que se CAE con esto, y por que

El switch "Desbloqueadas / Solo faltantes" y el porcentaje "Completado: X / 206"
desaparecen de "Mi progreso". Es un cambio de direccion **acordado con Pablo**
(plan de noche, seccion 2): "Mi progreso" ya no divide las 206 legendarias por
si las tenes, sino que muestra lo que elegiste fabricar. Un filtro de alcance
sobre una lista que ya no existe seria un boton que no cambia nada.

Los 3 filtros de categoria (Tipo / Gen / Expansion) **se quedan**. Ahora eligen
que legendarias tenes a mano para meter en la cola.

---

## Ficha de la pieza: materiales de una legendaria

- **Tipo:** mejora visible
- **Estado:** listo
- **Dónde la veo:** Leyenda Legendaria -> pestaña "Catálogo" -> click en cualquier tarjeta de legendaria. Se abre un modal con cada material y si lo TENGO o me FALTA. En "Mi progreso" también, click en la tarjeta.
- **Ruta:** `#/account/legendary-armory` (pestaña Catálogo)
- **Descripción:** Al clickear una legendaria se abre qué se necesita para fabricarla y cuánto de eso tenés en el banco, los materiales y la bolsa.
- **Commits:** `6e6287b`
- **Rama:** `feat-arme-1-2-modal-materiales` (mergeada a main, rama no borrada todavia)
- **Si no entra:** la leyenda sigue mostrando lo de antes (precio, tipo, generación) y el catalogo no cambia. No se rompe nada: es una vista nueva, no una modificación de las anteriores.
- **Si sale mal:** el click deja de abrir el modal (la tarjeta sigue mostrando todo lo de siempre). El caso serio sería que las cifras de TENGO/FALTA fueran incorrectas: **el contador suma banco + materiales + bolsa de personaje, y una parte partido entre las tres ya está cubierto por el test propio.**

### Lo que el modal distingue a proposito

Cuatro estados, cuatro textos distintos. No es decoracion: son datos que se contradicen
entre si y que el jugador necesita ver por separado.

| | Que dice |
|---|---|
| con receta | la lista de materiales, con tengo / falta |
| sin receta | "la fuente no publica receta para esta pieza" |
| marcador de cuenta (95093) | "no es una legendaria" |
| id desconocido | "no está en el catálogo" |

Un modal que dijera lo mismo en los cuatro sería el bug: si GW2 renombra el item 95093,
el filtro tiene que dejar de matchear **y eso tiene que verse**.

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

## Al borrar una cuenta, su caché se va con ella

- **Tipo:** mejora oculta
- **Estado:** listo
- **Dónde la veo:** — (no se ve; el síntoma era que la app dejara de guardar cosas sin avisar)
- **Ruta:** —
- **Descripción:** al borrar una cuenta sus datos en caché quedaban guardados
  para siempre. Con el token ya borrado, nadie los leía ni los borraba nunca,
  y el navegador se llenaba. Medido: 27 cuentas y 4,98 MB de datos de cuentas
  que ya no existían, después de lo cual la app dejaba de guardar.
- **Commits:** `6c3f8e5`
- **Rama:** `—`
- **Si no entra:** las cuentas que borres siguen dejando basura en el
  navegador. Con muchas cuentas la cuota se llena y la app deja de guardar
  en silencio, sin error visible.
- **Si sale mal:** **se refleta, no se corrompe.** Peor caso medido: dos
  tokens que coincidan en los primeros y últimos 4 caracteres comparten la
  misma clave de caché, así que al borrar una cuenta se borra la caché de la
  otra — se regenera sola al volver a usarla.
- **Riesgo deliberado:** el botón de liberar caché de Settings queda como red
  para las cuentas borradas antes de esta versión.
- **Tests:** 33 pass / 0 FAIL (con el fix revertido, 28 FAIL). Suite completa
  1315 aserciones / 0 FAIL.

## Al cambiar de sección, los módulos sueltos se apagan

- **Tipo:** mejora oculta
- **Estado:** listo
- **Dónde la veo:** — (no hay pantalla; el síntoma era que al navegar quedaran módulos trabajando en segundo plano)
- **Ruta:** —
- **Descripción:** al cambiar de sección, el sistema apagaba los módulos
  usando un dato guardado que no siempre coincidía con lo que estabas
  mirando. Como hay dos controles que pueden dejar ese dato desfasado, un
  módulo podía quedar "colgado" con su temporizador vivo.
- **Commits:** `1e5aedb`
- **Rama:** `—`
- **Si no entra:** al navegar entre secciones quedan temporizadores vivos y
  módulos haciendo consultas en segundo plano.
- **Si sale mal:** el criterio del arreglo es literalmente "el panel que
  quedó visible", o sea lo que estás mirando. Medido: no ocurre. La
  comprobación que lo avisa sigue en verde y **falla sola si alguien mete un
  módulo nuevo sin registrar** — un aviso que se puede apagar sin dejar
  rastro no serviría de nada.
- **Tests:** suite completa 1282 pass / 0 FAIL (venía de 1280 / 1 FAIL).

---

## Importar un backup avisa si a una key le faltan permisos

- **Tipo:** mejora visible
- **Estado:** listo
- **Dónde la veo:** Panel de Cuentas → importar backup. Solo aparece si hay
  algo que avisar; si todas las keys están completas, el import sigue
  haciendo lo mismo que antes.
- **Ruta:** `/account/accounts` (panel de Cuentas)
- **Descripción:** al importar un backup se guardaban las cuentas sin
  revisar que la clave de API tenga todos los permisos. Una clave con 5
  permisos de menos se guardaba sin error y sin mensaje, y el problema
  aparecía después, en otra parte, sin explicación.
- **Commits:** `570336b`, `5a6c8c3`
- **Rama:** `—`
- **Si no entra:** volvés a poder importar un backup con claves incompletas
  sin enterarte, y esas claves fallan después en pantalla por razones que no
  vas a poder conectar con el import.
- **Si sale mal:** **nunca se pierden cuentas.** Una clave sin el dato de
  permisos se trata como *desconocida*, no como mala: se importa igual y te
  avisa. Preferimos una advertencia de más a decirte que tus cuentas
  desaparecieron. Tampoco se corta el import por una sola clave: se importa
  todo y se informa cuál quedó incompleta.
- **Ojo — comportamiento que NO cambia:** importar un backup **reemplaza**
  la lista de cuentas, como siempre. Las cuentas que no estén en el backup
  no sobreviven al import. Eso no es de este cambio, pero conviene saberlo
  antes de importar.
- **Tests:** 26 pass / 0 FAIL. Control negativo real: contra `main` sin el
  fix da 14 FAIL. Suite completa 1341 pass / 0 FAIL.

---

## Las rondas del PO que nunca se veían

- **Tipo:** mejora oculta
- **Estado:** listo
- **Dónde la veo:** —
- **Ruta:** —
- **Descripción:** once entregas del PO (rondas 18, 22 a 28 y 32) estaban en el
  repo desde el 30/09 pero en cinco ramas distintas, así que ninguna se veía al
  leer la más nueva. Ahora están las 23 rondas en un solo archivo.
- **Commits:** `301cf0e`
- **Rama:** `hb116-wt`
- **Si no entra:** nada se rompe en la app. Las rondas vuelven a quedar repartidas
  en 5 ramas y el paso 3 del heartbeat sigue sin ver 4 de ellas.
- **Si sale mal:** el archivo es documentación interna del equipo, no se muestra en
  ninguna pantalla, así que Pablo no observa nada. Lo observable es que el equipo
  siga leyendo una sola ronda por ciclo.

---

## Cómo leer el archivo de ideas

- **Tipo:** mejora oculta
- **Estado:** listo
- **Dónde la veo:** —
- **Ruta:** —
- **Descripción:** los arneses que miden cuántas rondas del PO hay, y cuáles ya
  se aplicaron, están en `tools/hb116-*.mjs`. Antes el criterio contaba encabezados
  y daba por buenas ramas que ya estaban al día.
- **Commits:** `301cf0e`
- **Rama:** `hb116-wt`
- **Si no entra:** el paso 3 del heartbeat sigue contando por encabezado, que da
  falsos positivos entre ramas: la ronda con más texto parece la más nueva aunque
  sea la más vieja.
- **Si sale mal:** es código de medición, no de producto. El error es que un
  heartbeat futuro cuente mal, no que la app cambie.



## Cuentas consistentes entre pestañas

- **Tipo:** mejora oculta
- **Estado:** listo
- **Dónde la veo:** —
- **Ruta:** —
- **Descripción:** el respaldo (Gist) ahora guarda la misma cuenta que ves en pantalla.
  Antes, cuatro módulos (inventario, Raids, Strikes y el detalle de compra de la Bóveda)
  leían la cuenta vieja a mano, saltándose la capa de storage, así que el Gist podía
  quedar con una cuenta distinta de la que tenías abierta.
- **Commits:** `d32e054`
- **Rama:** `feat-t19c-lectores-capa`
- **Si no entra:** sigue como estaba. El Gist puede subir una cuenta vieja y al importar
  ese respaldo en otro navegador la app abre con otra cuenta. No rompe nada visible: el
  respaldo se sigue haciendo.
- **Si sale mal:** los cuatro módulos piden la cuenta al elemento `<select>` antes que al
  disco (eso NO se cambió, es lo que ya pasaba). Si el `<select>` no tuviera valor, ahora
  leen por la capa, que resuelve igual. El caso que cambia es "solo existe la clave nueva":
  antes devolvía vacío, ahora devuelve la cuenta. El test fija ese caso.

---

## El botón de "Sincronizar desde la nube" dice qué te va a pisar

- **Tipo:** mejora visible
- **Estado:** listo
- **Dónde la veo:** Ajustes → el botón que dice "Sincronizar desde la nube" (el que
  pregunta "¿Sincronizar desde la nube?"). El cartel de confirmación ahora lista las
  7 familias que se van a sobrescribir y **cuántas API Keys** trae el respaldo remoto.
- **Ruta:** `#/cards` (se abre desde el menú de Ajustes / el ícono de configuración)
- **Descripción:** el cartel ya no dice "esto sobrescribirá tu configuración" a secas;
  dice exactamente qué se pisa y cuántas claves, igual que el botón de restaurar desde
  archivo.
- **Commits:** `2c53b32`
- **Rama:** `fix-t20a-confirm-gist`
- **Si no entra:** sigue como está. El cartel no da ninguna cifra, y las API Keys son
  lo único del respaldo que **no se regenera con un click**: una key de GW2 no se
  vuelve a bajar de ArenaNet, así que si el respaldo de la nube tiene 12 y vos tenés
  27, al sincronizar perdés 15 y hay que recrearlas en la API. Es un escenario, no una
  pérdida medida: el respaldo es manual, no hay sincronización automática.
- **Si sale mal:** nada funcional. Solo cambia el texto de un `confirm()`. Si el
  respaldo remoto viniera sin la familia de API Keys, muestra "0 claves", que es lo
  que hay. Verificado en las tres formas (12, 27 y 0).

---

*Las cuatro fichas de arriba fueron escritas por el Arquitecto. La primera, a
partir de la review de Pablo. Las otras tres son retroactivas: los merges
pasaron antes de que existiera la regla de la ficha, y el Principal no las
escribió. Las tres últimas están pendientes de prueba en dev. La quinta (Cuentas consistentes entre pestañas) la escribió el Principal en el HB#118 y está pendiente de prueba. La sexta (el botón de la nube) la escribió el Principal en el HB#119 y está pendiente de prueba.*

## Foto antes de sobrescribir la configuración desde la nube

- **Tipo:** mejora oculta
- **Estado:** listo
- **Dónde la veo:** Ajustes → Gist → "Sincronizar desde la nube". El cartel de
  confirmación ahora termina con una línea que antes no estaba: dice que se guardó una
  copia y que se puede restaurar. Si la copia no se pudo guardar (almacenamiento
  lleno), el cartel lo avisa en rojo en vez de mentir.
- **Ruta:** —
- **Descripción:** Antes de bajar la configuración de GitHub, se guarda una copia de la
  que tenías, así que si el Gist está viejo no perdés nada sin remedy.
- **Commits:** `4413c34`, `d06c8d7`
- **Rama:** `hb120`
- **Si no entra:** no pasa nada. El boton es
  `#gistDownloadBtn` y SI esta montado (`index.html:927`).
  ALERT-184: el HB#120 afirmo lo contrario y es falso; el grep se corrio sobre `js/`.
  Lo que no tiene UI es el RESTAURAR, no el sincronizar: las 7 escrituras siguen
  pasando exactamente igual.
- **Si sale mal:** el riesgo real es que `localStorage` esté lleno y la copia no se
  guarde. Por eso el caso está contemplado y el cartel lo dice, en vez de confirmar en
  silencio. La copia vive en `gn:github:gist_snapshot` y se borra sola si no hay copia
  anterior al cancelar. **Restaurar todavía no tiene botón:** la función está expuesta
  (`SettingsManager.restoreSafetySnapshot()`) pero sin UI que la llame.
- **Métrica:** el camino del Gist pasa de 0 puntos de retorno a 1. El del archivo ya
  tenía el suyo desde HB#104 (leer antes de preguntar); este era el hermano que faltaba.

