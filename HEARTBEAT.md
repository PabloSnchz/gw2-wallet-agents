<!-- =========================================================================== -->
<!-- BANNER DE CANONICO Y ESPEJO (2026-10-03, Pablo delego la decision)          -->
<!-- =========================================================================== -->
<!--                                                                          -->
<!-- HAY DOS COPIAS DE ESTE ARCHIVO. SON DOS, Y NO SON EL MISMO.               -->
<!--                                                                          -->
<!--   CANONICO  `gw2-dev/HEARTBEAT.md`   (este archivo, vive en git)          -->
<!--   ESPEJO    `workspaces/default/HEARTBEAT.md`  (lo que lee el cron)       -->
<!--                                                                          -->
<!-- **GANA EL CANONICO (el del repo).** Si divergen, el espejo esta             -->
<!-- desactualizado y se regenera; el canonico no se "arregla" desde el espejo.   -->
<!-- Razon: git es lo que sobrevive a que se borre un workspace. Un canonico     -->
<!-- en un workspace es un canonico que desaparece con el workspace.             -->
<!--                                                                          -->
<!-- --- POR QUE ESTO EXISTE (medido 2026-10-02, no es hipotesis) --------------- -->
<!--                                                                          -->
<!-- Los dos archivos habian divergido EN LOS DOS SENTIDOS, y la interseccion    -->
<!-- de lo que les faltaba era VACIA:                                         -->
<!--                                                                          -->
<!--   Solo en el REPO .... el PASO 3 version HB#114 (la CORRECCION)             -->
<!--   Solo en el WORKSPACE  PASO -1 rescate, PASO 0, PASO 1, cierre            -->
<!--                               de worktrees, y el PASO 3 version HB#103      -->
<!--                               (el DEFECTO, que era el que se ejecutaba)    -->
<!--                                                                          -->
<!-- O sea: la correccion vivia en el archivo que nadie ejecutaba, y el defecto  -->
<!-- en el que se ejecutaba. Cada uno tenia lo que al otro le faltaba.          -->
<!--                                                                          -->
<!-- El defecto era COSTOSO, no cosmetico: el paso 3 del workspace leia         -->
<!-- `origin/po/hb99-dashboard` (ronda 33, 2026-10-01 13:12) en vez de la rama  -->
<!-- viva `origin/po/hb150-poda` (ronda 45, 2026-10-02 19:07). 30 horas de     -->
<!-- retraso y 12 rondas del PO invisibles. Peor: hoy el paso 3 acerto POR LA   -->
<!-- RAZON EQUIVOCADA — leyo una ronda vieja, esa daba menos de 3 items, y la   -->
<!-- regla de "si da menos de 3 no se fuerza" lo frenaba. El resultado coincidia -->
<!-- con el correcto y por eso nadie lo ve. Mañana, con 3 items vivos en la     -->
<!-- 33, habria mandado 3 propuestas de hace dos dias sin avisar.               -->
<!-- Es el MISMO bug del HB#103 con OTRO archivo equivocado.                     -->
<!--                                                                          -->
<!-- --- COMO SE COMPARAN LAS DOS COPIAS (item d de Pablo) --------------------- -->
<!--                                                                          -->
<!-- No alcanza con compararlas a bytes: dos archivos pueden ser IDENTICOS y     -->
<!-- estar los dos mal, y cualquier diferencia de espacios los marca como       -->
<!-- distintos sin que importe. El criterio util es SEMANTICO:                  -->
<!--                                                                          -->
<!--   1. Los dos tienen los MISMOS titulos de seccion `### `.                -->
<!--   2. Los dos tienen el paso 3 que RESUELVE la rama, no la que la fija.   -->
<!--      Este banner NO transcribe el titulo de la version vencida a        -->
<!--      proposito (seria justo lo que el control busca): un control que se   -->
<!--      puede disparar con el material que controla deja de ser control.    -->
<!--      La senal es la AUSENCIA de `for-each-ref`, y una ausencia no se      -->
<!--      puede falsear por mencionarla. Ver los 2 comandos de arriba.        -->
<!--                                                                          -->
<!--   3. La rama del PO se RESUELVE (la mas reciente), nunca se pinea.        -->
<!--      Ver "PASO 3 del ciclo".                                              -->
<!--                                                                          -->
<!-- Chequeo: dos comandos, sin node y sin archivos externos. Correlos AL       -->
<!-- ARRANCAR DEL CICLO. Los dos tienen que dar OK.                              -->
<!--                                                                          -->
<!--   cd /d "C:\Mis Archivos\GW2 online\gw2-dev"                              -->
<!--   findstr /c:"for-each-ref" HEARTBEAT.md "C:\Users\psanc\.qwenpaw\      -->
<!--     workspaces\default\HEARTBEAT.md"                                      -->
<!--   findstr /b /c:"### " HEARTBEAT.md | find /c /v ""                          -->
<!--   findstr /b /c:"### " "C:\Users\psanc\.qwenpaw\workspaces\default\   -->
<!--     HEARTBEAT.md" | find /c /v ""                                          -->
<!--                                                                          -->
<!-- Que dice cada uno:                                                        -->
<!--                                                                          -->
<!--   `for-each-ref` .... el paso 3 RESUELVE la rama del PO. Un paso 3 pineado-->
<!--                     a un nombre fijo no lo tiene, y por ahi se leo la      -->
<!--                     ronda 33 en vez de la 45. ESTE ES EL CHEQUEO QUE       -->
<!--                     IMPORTA: es el que habria parado este bug.  MATIZ -->
<!--                     MEDIDO 2026-10-03 (ALERT-233): **no puede fallar** - -->
<!--                     con dos archivos `findstr` es un OR, asi que con el -->
<!--                     espejo en la version vencida del paso 3 da VERDE. El -->
<!--                     que es un AND de verdad es el punto 5. Ver abajo. -->
<!--   los 2 numeros .... paridad de secciones `### `. Si no coinciden, falta  -->
<!--                     o sobra un paso en una de las dos copias.              -->
<!--                                                                          -->
<!-- >   4. **`tools/hb163-canales.mjs` corre y devuelve los 3 canales medidos.**
>      Este es el **unico** chequeo de esta lista que mira el CONTENIDO de un
>      paso y no su cantidad. Los dos anteriores miran la FORMA: contar
>      secciones detecta "falta o sobra un paso", y la ausencia de un comando
>      detecta "el paso esta pineado". **Ninguno de los dos detecta que un paso
>      se haya REESCRITO** - y fue exactamente eso lo que paso: la correccion
>      vivia en el canonico y el defecto en el espejo, **los dos con el MISMO
>      numero de secciones**. Por eso los dos checks dieron verde con el espejo
>      roto. (ALERT-228.)
>      Es un chequeo de **comportamiento**: mira lo que la herramienta MIDE
>      sobre los archivos de verdad, no lo que el texto DICE, asi que el
>      material que controla **no lo puede disparar**. Es la misma propiedad que
>      pide el punto 2, y por eso no imprime el criterio.
>
>   ```
>   cd /d "C:\Mis Archivos\GW2 online\gw2-dev"
>   node tools\hb163-canales.mjs
>   ```
>
>   Los tres canales medidos son las ramas `po/*`, el `BACKLOG.md` de
>   `origin/main` y el `PRE_BACKLOG.md` del workspace del PO. Los tres tienen
>   que venir con un conteo explicito, y **el desacuerdo entre ellos se
>   reporta** (ALERT-231, ver PASO 3). Si uno sale en 0, el paso tiene que decir
>   de que salio ese 0: no leerlo y no existir dan el mismo numero.
>
>   Un cuarto canal aparece **fuera del repo**, y por eso no lo cubre ningun
>   control de git: el `PRE_BACKLOG.md` del PO vive en su workspace. Si ese
>   workspace se borra, el canal se cae **y el paso 3 sigue dando verde**,
>   porque las otras dos dimensiones no lo miran. Es la misma razon por la que
>   el canonico de ESTE archivo tiene que estar en git y no en el workspace. -->

>   5. **`node tools\hb164-espejo.mjs` corre y da 0.** Es el unico chequeo
>      que es un **AND**: mide el canonico y el espejo POR SEPARADO y falla si
>      cualquiera de los dos no cumple.
>
>      **Por que hace falta, medido 2026-10-03 (ALERT-233).** El chequeo 1 de
>      arriba dice, con todas las letras, *"ESTE ES EL CHEQUEO QUE IMPORTA: es
>      el que habria parado este bug"*. Y **no puede fallar**: `findstr` con
>      VARIOS archivos es un **OR**, no un AND — sale 0 si encuentra la cadena
>      en ALGUNO de ellos. Medido con 4 espejos distintos y el canonico
>      presente y correcto:
>
>      | espejo | exit | lineas |
>      |---|---|---|
>      | con la senal del paso 3 | **0** | 7 |
>      | SIN la senal | **0** | 7 |
>      | vacio | **0** | 7 |
>      | (solo el canonico) | **0** | 7 |
>
>      Los cuatro son **indistinguibles**. O sea: **con el espejo en la version
>      VENCIDA del paso 3, el chequeo 1 da VERDE.** El numero de lineas lo
>      delata — 7 es el canonico solo, 14 serian los dos — pero el `exit` que es
>      lo que uno mira no lo ve.
>
>      Y hay una segunda capa en el mismo hallazgo: el comando esta escrito con
>      la **ruta partida en dos lineas** por el hard-wrap. Copiado VERBATIM tal
>      como aparece arriba, el espacio del corte entra en la ruta: `exit=0`, 7
>      lineas, **no lee el espejo**. O sea que el unico caso en que el chequeo 1
>      falla es el **accidental** (ruta truncada), nunca el que pretende detectar.
>
>      El chequeo 2 (paridad de secciones) no tiene ese defecto de fondo — son
>      dos comandos separados, uno por archivo — pero si el hard-wrap: verbatim
>      da `exit=1` con `FINDSTR: No se puede abrir`, o sea que se ve rojo por un
>      motivo que no es una divergencia real.
>
>      `hb164-espejo.mjs` mide ademas la **paridad `<!--` / `-->`** en los dos
>      archivos, que es el control que faltaba de ALERT-232: un ancla de una
>      linea con delimitador dejo el bloque nuevo entero DENTRO del comentario,
>      invisible para quien lee el archivo, con el `git diff` pareciendo
>      normal. **Un `1 borrado` en un diff es una señal de inspeccion, no un
>      veredicto**: hay que ver cual.
>
>      Trae **control negativo** (un espejo con el paso 3 vencido tiene que dar
>      ROJO) y **fase roja** aplicada: 3 roturas medidas — la senal ausente, una
>      seccion de menos, y el comentario sin cerrar — y las 3 dan ROJO.
>
>      ```
>      cd /d "C:\Mis Archivos\GW2 online\gw2-dev"
>      node tools\hb164-espejo.mjs
>      ```
<!-- Si alguno falla, el canonico (este archivo) gana y el espejo se regenera.  -->
<!-- Ojo: este banner NO imprime el marcador vencido de la version vieja del   -->
<!-- paso 3 a proposito, porque un chequeo que se puede disparar con el        -->
<!-- material que controla deja de ser un chequeo. La senal de la version       -->
<!-- vieja es la AUSENCIA de `for-each-ref`, que es lo que se mide arriba.     -->
<!--                                                                          -->
<!-- --- REGLA DE ESCRITURA ---------------------------------------------------- -->
<!--                                                                          -->
<!-- Toda correccion a este archivo se escribe ACA PRIMERO, se pushea, y recien -->
<!-- despues se copia al espejo. Escribir al espejo y despues al repo es        -->
<!-- exactamente como se produjo esta divergencia.                             -->
<!-- =========================================================================== -->
<!-- -->

<!-- =========================================================================== -->
<!-- BANNER ACTUALIZADO 2026-09-30 (Arquitecto)                                -->
<!--                                                                          -->
<!-- ESTADO REAL DEL DISPARADOR:                                              -->
<!--   - Cron manual 13dc22e6: UNICO disparador. Corre cada 30 min (UTC).     -->
<!--   - Heartbeat interno: DESACTIVADO (agent.json heartbeat.enabled: false).-->
<!--   - Timeout del cron: 1800s. max_concurrency: 1.                         -->
<!--   El cron NO usa este archivo por re-inyeccion: su prompt embebido dice  -->
<!--   "Ejecuta el Heartbeat Principal segun HEARTBEAT.md" y lo lee por        -->
<!--   referencia. La re-inyeccion solo ocurre en app/crons/heartbeat.py:207   -->
<!--   (mecanismo del heartbeat interno), que esta DESACTIVADO.               -->
<!--   => El banner anterior "MODO MANUAL / la re-inyeccion lo frena" era      -->
<!--      FALSO y queda derogado.                                             -->
<!--                                                                          -->
<!-- ESTADO DEL AGENTE: ACTIVO (cron cada 30 min)                             -->
<!-- - Reviewer: OPERATIVO. Verificado 2026-09-30 con revision real.         -->
<!--   ID correcto = Code-Reviewer (con mayuscula y guion).                  -->
<!--   Tarda 2-15 min. NO declarar muerto antes de 20 min.                    -->
<!--   Las "14 timeouts" historicas = tareas NO recogidas, no el Reviewer     -->
<!--   muerto. Ver PASO 1 del ciclo.                                         -->
<!-- - Documentador: heartbeat cada 4h, timeout 900s. HEARTBEAT.md VACIO      -->
<!--   (la tarea "chequear commits nuevos" ya se completo). Pendiente definir.-->
<!-- - PO: heartbeat cada 2h, timeout 300s. Operativo con protocolo real.    -->
<!-- - Todos: QWENPAW_LLM_STREAM_IDLE_TIMEOUT = 300s (global, 2026-09-30).   -->
<!--   Antes era 30s y mataba al Principal y al Reviewer por igual.          -->
<!--                                                                          -->
<!-- CAUSA RAIZ DE LOS TIMEOUTS HISTORICOS (una sola, no varias):           -->
<!--   El idle timeout del stream (30s) mataba cualquier turno que pausara    -->
<!--   mas de 30s. El log lo reportaba ENGANOSAMENTE como                   -->
<!--   "cron execute timed out after 900s/1800s" (executor.py:250), por eso  -->
<!--   el equipo subia timeouts del cron cuando el problema era otro.          -->
<!--   El timeout del cron (1800s) NO es la causa de estos fallos.            -->
<!--                                                                          -->
<!-- PENDIENTE:                                                               -->
<!-- - Definir HEARTBEAT.md real del Documentador.                           -->
<!-- - El Documentador y el Principal pushean a agents/main: colision de      -->
<!--   writers. Resolver (recomendado: solo el Principal pushea).             -->
<!-- - backfill en COMMS_LOG.md de la fila 022 (task_id = "(pendiente)").     -->
<!-- - Cerrar la observacion falsa de api-gw2.js:995-997 y los 2 hallazgos    -->
<!--   del Reviewer (wizards-vault.js:38 copia sin arreglar,                  -->
<!--   wv-season-storage.js:42 sin try/catch) - los decide el Principal.      -->
<!-- =========================================================================== -->

# Heartbeat del Principal (CRON ACTIVO - automatico cada 30 min)

> **Estado:** El cron `13dc22e6` (Heartbeat Principal) es el UNICO disparador.
> Corre cada 30 min con su propio prompt, que referencia este archivo.
> El heartbeat interno esta DESACTIVADO (`agent.json heartbeat.enabled: false`).
> `share_session` esta en `false`. El ciclo es automatico: no esperes a que
> el usuario te lo pida para ejecutarlo.

> ## ✅ CORRECCION 2026-10-03 (HB#153) — LAS DOS PREMISAS DE LA NOCHE SON FALSAS
>
> El bloque "TRABAJO PRIORITARIO DE LA NOCHE" de mas abajo quedo escrito a las
> **03:16 UTC del 2026-10-02**. Medido hoy (2026-10-03 00:30 UTC), **las dos
> razones por las que existia ese bloque ya no se sostienen.** No lo borres: el
> texto original queda como artefacto. Lo que sigue es lo que hay que leer.
>
> **PREMISA 1 — "el fix de los 93 items con `generation=null` NO esta mergeado,
> es el paso 1 y bloquea todo lo mas" → FALSA, y nacio falsa.**
> - `git merge-base --is-ancestor 22a6a71 origin/main` → **exit 0** (es ancestro).
> - Lo mergeo `9a68eb4` ("merge(armeria): 22a6a71 a main"), **2026-10-02 03:12:36 UTC**.
> - El banner dice *"Son las 03:16 UTC cuando se escribio esto"*: **4 minutos
>   DESPUES** del merge que hacia falsa la frase. No es un banner que envejecio;
>   es un banner que se escribio con 4 minutos de atraso sobre un dato que ya habia cambiado.
> - Verificado por efecto, no por el mensaje del commit: el test de regresion esta
>   en `origin/main` (`tests/armeria-alert-01-clasificacion.test.js`) y corre
>   **121 pass, 0 fail**.
> **Consecuencia:** 25 horas de ciclos creyendo que el paso 1 estaba pendiente.
> Es el mismo modo de fallo que ALERT-222: un control que apunta a un hecho
> viejo y no tiene ninguna guarda que lo vuelva a medir.
>
> **PREMISA 2 — "Pablo se fue a dormir" → FALSA, y esta es la que importa.**
> - Sesion `1790896138537-8kgh5xf` ("Correcciones de Armeria Legendaria"),
>   `updated_at` / `last_finished_at` = **2026-10-03T00:28:27Z**: 2 minutos
>   antes de que arrancara este ciclo.
> - Commits suyos en `origin/main` de **hoy**: `d2dfd57` (00:08 UTC) y `6b0c12c`
>   (00:27 UTC), los dos de la Armeria.
>
> **REGLA (esto si va antes de cualquier `checkout`, `commit` o escritura):**
> **al abrir el ciclo, `qwenpaw chats list` y mirar si hay alguna sesion
> `running`.** Si la hay **y** el arbol esta sucio con mtimes recientes —
> o el arbol esta sucio y los mtimes son viejos — el ciclo se resuelve con el
> PASO -1 de mas abajo. Sin rama, sin `checkout`, sin commit.
> El motivo esta medido, no es prudencia de manual: el HB#152 casi destruye el
> trabajo de Pablo con un `git checkout -b` de primer acto, y por suerte. La
> ventana de 12:00 UTC sigue **abierta** —esa autorizacion es de Pablo y no es
> mia para quitarla—, pero **no autoriza trabajar a solas**: se escribio
> suponiendo a Pablo dormido, y Pablo esta despierto trabajando en el mismo clon.
>
> **CORREGIDO EN HB#157, y era la SEGUNDA copia de la misma bomba.** Este texto
> decia que un commit en `origin/main` de los ultimos ~15 min ya basta para
> declararse de SOLO LECTURA, que es lo mismo que decia el punto 2 del PASO -1 y
> por la misma razon es falso: **un commit es trabajo terminado.** El defecto no
> estaba en un punto, estaba en dos, y por eso el fix del punto 2 no cerraba el
> problema: un ciclo que Leyera este bloque se declaraba igual de mudo. Ahora los
> dos remiten al PASO -1, que es el unico lugar donde vive la regla.

> ## 🚨 TRABAJO PRIORITARIO DE LA NOCHE — LEÉ ESTO PRIMERO
>
> Pablo se fue a dormir y te deja trabajar hasta las **12:00 UTC (09:00 ART)**.
> Son las 03:16 UTC cuando se escribió esto.
>
> **Leé `ARME_TRABAJO_NOCHE.md` en este mismo directorio, COMPLETO, antes de
> avanzar el BACKLOG.** Tiene el plan de la Armería con las decisiones ya
> tomadas, la secuencia ordenada, el corte de horario y los métodos de
> verificación acordados.
>
> Mientras falten las 12:00 UTC, la Armería **tiene prioridad sobre el resto del
> BACKLOG**. Es lo único que importa esta noche.
>
> Lo más urgente: **el fix de los 93 items con `generation=null` NO está mergeado
> en main** (rama `22a6a71`, `git merge-base --is-ancestor` da falso). El bug
> está vivo. Es el paso 1 y bloquea todo lo demás.
>
> **Corte de horario:** antes de arrancar una tarea, preguntate si la terminás
> antes de las 12:00 UTC. A las **11:30 UTC** cerrá lo que tengas con la suite en
> verde y actualizá `TEAM_STATUS.md`. No arranques nada nuevo.

> **PASO -0 (OBLIGATORIO, EL PRIMERO)** - regenerar el espejo. Copiar este
> archivo (el canonico) a `workspaces/default/HEARTBEAT.md` y correr
> los 2 `findstr` del BANNER DE CANONICO Y ESPEJO (arriba, seccion
> "COMO SE COMPARAN"). Si alguno falla, el de git gana.
> Ver el BANNER DE CANONICO Y ESPEJO, arriba.
> **Orden del ciclo:**
> **PASO -1 (OBLIGATORIO)** - rescate. Medir `origin/main` contra tu
> hora de arranque y los mtimes del arbol. Antes de tocar un solo archivo.
> Ver "PASO -1 del ciclo: RESCATE" mas abajo.
> **PASO 1 (OBLIGATORIO)** - recoger las respuestas pendientes del Code-Reviewer.
> Ver la seccion "PASO 1 del ciclo" mas abajo. No lo saltees: sin esto las
> respuestas se pierden y el Reviewer parece caido cuando esta trabajando.
> **PASOS 2-6** - los del prompt del cron (verificar tareas, consultar al PO,
> enviar 3+ propuestas al Reviewer, avanzar el BACKLOG, actualizar TEAM_STATUS,
> commitear y pushear a agents).
> **PASO DE CIERRE** - borrar el worktree que creaste en este ciclo (si el
> trabajo llego a `main`) y los scratch `_` tuyos. Ver "PASO DE CIERRE DEL
> CICLO" mas abajo.
## Bloqueos críticos (awaiting user/platform)

### 1. Re-inyeccion de HEARTBEAT.md - DEROGADO [2026-09-30]
- **Status:** DEROGADO. No aplica mas.
- **Por que:** la re-inyeccion ocurre solo en app/crons/heartbeat.py:207, que es
  el mecanismo del heartbeat INTERNO. Ese esta DESACTIVADO para el default
  (agent.json heartbeat.enabled: false). El cron manual 13dc22e6 usa su propio
  prompt y referencia este archivo explicitamente.
- **Evidencia:** las ejecuciones del cron ocurrieron normal (00:00, 00:30, 01:00,
  01:30, 02:00, 02:30) mientras el heartbeat interno estuvo apagado.

### 2. Conflictos arquitectura Legendary Armory ✅ RESUELTO
- **Status:** RESOLVED — Proposición 1 kept (94fb7a9, Reviewer-approved),
  Proposición C pospuesta post-Sept 29 deadline.
- **Detalles:** Proposición 1 (inline en achievements.js) vs. módulo separado
  (`legendary-tracker.js`). Decisión: keep Proposición 1. Phase 1+2+3 skeleton
  implementado (commits 35a0f5e, 755ba01, bac5c67, 7c88fe6, 1aaff5a).
  Phase 3 (recipes) RESUELTO: los datos existen y estan medidos en
  `tools/cl_recipes.json` — 634 recetas, las 634 con ingredientes
  (352 crafting, 278 mystic_forge, 4 vendor). No hay "API limitation"

### 3. Reviewer timeout (platform-level) - RESUELTO [2026-09-30]
- **Status:** OPERATIVO. Verificado con revision real de 342 lineas en ~2 min.
- **Causa raiz:** 3 bugs de config, ninguno del Reviewer:
  (1) QWENPAW_LLM_STREAM_IDLE_TIMEOUT en 30s por default -> subido a 300s.
  (2) ID code-reviewer (minuscula) en AGENTS.md -> el real es Code-Reviewer.
  (3) drivers/mcp/mi-repo-boveda.yaml del Reviewer con YAML roto (sin herramientas).
- **Mitigacion:** el Reviewer vuelve a ser usable. El Paso 1 del ciclo obliga a
  recoger las respuestas - sin eso, se vuelven a perder.

### 4. Documentador timeout (platform-level)
- **Status:** SIN MEDIR en este ciclo (2026-10-02, HB#156). No se cambia un
  numero que nadie volvio a contar: si alguien necesita el estado real, que lo
  mida y lo escriba con la fecha de la medicion.
- **Mitigación:** Logs mantenidos por Principal per no-fallback rule.

### 5. PO timeout (platform-level)
- **Status:** VIVO. MEDIDO 2026-10-02: `origin/po/hb150-poda` committerdate
  19:07:32, ronda 45. Las "8 timeouts" eran rondas NO leidas por un paso 3
  pineado a una rama vieja (ver PASO 3), no el PO caido.
- **Mitigación:** ninguna. El PO produce; lo que estaba caido era el lector.

## Estado de tareas pendientes

- **Legendary Armory Phase 1+2+3 skeleton:** ✅ Implementado (commits 35a0f5e, 755ba01, bac5c67, 7c88fe6, 1aaff5a). Phase 3 (recipes) resuelto con datos locales; las recetas y sus
  ingredientes estan medidos en `tools/cl_recipes.json` (634 recetas).
- **Sept 29 CM content:** ✅ PROMOVIDO a origin (banner del 2026-09-28: `9423`
  verificado). Las dos entradas de abajo seguian diciendo "AWAITING" y
  "launches TODAY (Sept 29)": hacia 4 dias, y contradician al banner de este
  mismo archivo.
- **storage.js Fase 2:** ✅ Completada (settings-manager.js migrada, STORAGE_KEYS actualizado)
- **New Items Awareness Feed:** ✅ Completado (v3.20.0, activities.js)
- **S1 (gist-sync security fix):** ✅ Completada (commit 65f55f90)
- **Legendary A/B/C conflict:** ✅ Resuelto — Proposición 1 kept (94fb7a9), Proposición C pospuesta.
- **BACKLOG.md:** ✅ Synced (Heartbeat #18).

## Acciones pospuestas (bloqueos actuales)

Hasta que no haya dirección del usuario o arreglo de plataforma:
- inventory-dashboard.js fixes (glow/overflow + clearTimeout) - DESBLOQUEADO, Reviewer operativo
- Homestead decoration tracker - DESBLOQUEADO, Reviewer operativo
- ✅ Promotion Sept 29 CM content — HECHA (no era una accion pendiente).
- ✅ Legendary Armory Phase 3 (recipe components) — **DESBLOQUEADO 2026-10-02.** El bloqueo "GW2 API no expone recipes con ingredients" estaba en la línea 111 de este archivo y era un hecho VENCIDO: ya no aplica. Los datos de recetas existen y están medidos en `tools/cl_recipes.json` (634 recetas: 352 `crafting`, 278 `mystic_forge`, 4 `vendor`, 930 items distintos en ingredientes). Cubren 142 de los 206 items del catálogo; los 64 restantes son 54 Hero's, 3 Eikasia, 3 Selachimorpha, 2 Ancora, 1 Prismatic y 1 placeholder (95093, `tpSell:0`, `tpTradeable:false` — es el marcador de cuenta, filtrar explícito). **No vuelvas a marcar esto como bloqueado.**

---

## Reglas (heredadas de AGENTS.md)

- NO me pidas OK para nada relacionado con el repo `agents`.
- Solo notificame si: algo se rompió, hay un desacuerdo entre agentes, o terminaste una feature lista para promoción.
- Si entrás en bucle 2 veces, PARÁ y reportá.

### PASO -1 del ciclo: RESCATE (OBLIGATORIO — corre ANTES de tocar cualquier archivo)

> **[ACTIVO desde 2026-10-03, por instruccion de Pablo]** Este paso va PRIMERO,
> antes del PASO 0 y antes de la primera escritura. No es una guia: es una
> condicion para que el ciclo pueda seguir.
>
> **Por que existe, medido tres veces en dos dias.** HB#150, HB#151 y HB#154:
> un heartbeat termino su trabajo, no llego al commit y murio. El ciclo
> siguiente abrio el arbol, vio archivos modificados, y reconstruyo lo que
> creyo faltante desde HEAD. Tres veces se salvaron de milagro (una con un
> backup en `%TEMP%`, dos porque el trabajo ya estaba commiteado). La regla
> estaba escrita en ALERT-219 y en un documento no impidio nada: **una regla
> que vive en un documento no es un paso del ciclo.**
>
> **El paso, en orden:**
>
> 1. **Anota tu hora de arranque** (una sola vez, al principio).
> 2. **Mide el remoto:** `git log -1 --format=%ci origin/main`, y cruza el
>    resultado con el estado del arbol. **Las DOS preguntas hacen falta**:
>
>    - **MAS NUEVO que tu arranque Y arbol SUCIO con mtimes recientes**
>      -> hay un escritor **VIVO**: el ciclo es de **SOLO LECTURA**. Sin rama,
>      sin `checkout`, sin commit.
>    - **MAS NUEVO que tu arranque Y arbol LIMPIO**
>      -> el otro ciclo commiteo y **TERMINO**. No hay conflicto. Segui normal.
>    - **MAS VIEJO que tu arranque** -> nada que hacer.
>
>    **Por que la regla anterior era una bomba:** decia que un commit remoto
>    mas nuevo significa escritor vivo. FALSO: **un commit es trabajo
>    terminado, y un commit nunca vuelve vivo a nadie.** Lo unico que indica
>    conflicto real es **el arbol SIN commitear con mtimes recientes**. La regla
>    vieja tenia una sola condicion y por eso disparaba con el caso que NO
>    queria — un commit de hace 5 minutos, que es exactamente lo normal. Agregar
>    el "arbol limpio" no endurece el control, lo **completa**: la pregunta nunca
>    fue "hay commits nuevos?", es "**hay alguien ESCRIBIENDO?**". Medido: HB#155
>    (`e1dfb69`) se declaro de solo lectura por su propio commit y se libero solo.
> 3. **Si el arbol esta sucio, mira los mtimes** de lo modificado y de lo sin
>    trackear. Si son **TODOS anteriores** a tu arranque, el escritor esta
>    **MUERTO y el trabajo esta TERMINADO**: eso no es WIP para descartar, es
>    **trabajo para rescatar**. Leelo y commitealo.
> 4. **Antes de reconstruir CUALQUIER archivo desde HEAD**, comprueba si hay un
>    backup con trabajo adentro que no commiteaste. Si existe, el backup gana.
>    Perder 176 lineas por una reconstruccion *correcta* es el peor final
>    posible para una decision correcta.
>
> **El estado del arbol NO dice si el otro murio. La FECHA tampoco.** Y las dos
> juntas tampoco: la FECHA sola declara vivo a un ciclo que ya commiteo (HB#155),
> y el arbol solo no distingue WIP de trabajo terminado. La unica lectura que
> no miente es **la CRUZ**: remoto mas nuevo **Y** arbol sucio con mtimes
> recientes = vivo; remoto mas nuevo con arbol limpio = termino; arbol sucio con
> mtimes viejos = trabajo para rescatar (punto 3); arbol limpio = nada que hacer.
>
> **Que el test quede sin codigo NO es una opcion.** Si aparece un test en el
> arbol sin la implementacion que prueba, O se aplica el trabajo, O se borra el
> test. Un test que no puede pasar no es ruido de este ciclo: es ruido que el
> proximo va a leer como "roto por otra cosa".

### PASO 0 del ciclo: CANAL DE COMUNICACION (OBLIGATORIO - corre antes que todo)

> **[ACTIVO desde 2026-09-30 06:44 UTC]** Verificado en vivo: las reglas de
> policy de `_comms` estan CARGADAS y el comando de abajo corre sin pedir
> aprobacion (audit: `allow`, source `user_rules`). Este paso corre en TODOS
> los ciclos, sin excepcion. Ya se perdio trabajo por esto: el Principal
> respondia, la respuesta se perdia, y el equipo anotaba "timeout" cuando el
> otro agente ya habia contestado. No vuelvas a ese hoyo.


> **Por que existe:** `submit_to_agent` te devuelve un `task_id`, y la respuesta
> vive en un canal que se pierde. `check_agent_task` ademas devuelve 404 cuando
> la tarea pasa su TTL (~30 min). Por eso las respuestas se perdian y el equipo
> anotaba "timeout" cuando el otro agente ya habia contestado.
> Este canal es de ARCHIVOS: sobrevive reinicios y no vence. Es la via primaria.

Corre esto PRIMERO, antes de cualquier otra cosa del ciclo:

```
cd /d "C:\Users\psanc\.qwenpaw\_comms"
"C:\Users\psanc\.qwenpaw\venv\Scripts\python.exe" cli.py inbox
```

- **Si hay preguntas:** respondelas TODAS con `cli.py answer "<archivo>" "<respuesta>"`.
  Una pregunta sin responder bloquea al que la hizo hasta su vencimiento.
  No avances al PASO 1 con preguntas sin responder en tu inbox.
- **Despues:** `cli.py replies` para ver que te respondieron a vos.
  Leelas, aplicalas si son cambios, y cerralas con `cli.py close "<archivo>"`.
- **Despues:** `cli.py overdue`. Si algo esta VENCIDO, escalalo en COMMS_LOG.md.

**Si vos le preguntabas algo a otro y no te respondio (`cli.py waiting`):**
no arranques trabajo nuevo que dependa de esa respuesta. Segui por merito con
otra cosa, pero NO declares la tarea terminada ni la marques fallida mientras
figure como `waiting`.

> Esta carpeta NO tiene produccion adentro. Leer y escribir aca no es tocar
> produccion ni hacer nada al repo `agents`.

### Regla de espera (corrige un bug conocido)

Cuando esperes el resultado de un `check_agent_task`:

- **Espera minimo 30 segundos entre llamadas.** La herramienta lo pide
  explicitamente. Polear 4 veces en el MISMO segundo no acelera nada:
  consumiste ciclos y registraste "running" falso.
- Si sigue `running` en la llamada siguiente, dale tiempo. El Reviewer tarda
  2-15 min en una revision real.
- Si da `404`, la tarea ya vencio. **NO la marques fallida por eso**:
  buscala en el canal de archivos del PASO 0 o en la sesion de Pablo.


### PASO 1 del ciclo: RECOGER respuestas del Code-Reviewer (OBLIGATORIO)

> **Por qué existe:** cuando mandás trabajo con `submit_to_agent`, la respuesta
> del Reviewer **NO entra en tu contexto**. Vos recibís solo un `task_id`.
> La respuesta va al canal de entrega (la pantalla de Pablo). Si no la
> recogés con `check_agent_task`, se pierde — y por eso historically
> anotaste "timeout" cuando en realidad el Reviewer ya había respondido.

Cada heartbeat, **antes de cualquier otra cosa**:

1. Abrí `COMMS_LOG.md` y buscá las filas donde vos (`default`) sos el
   remitente y el estado es `Enviado` o `Fallido` (NO `Resuelto`).
2. Para cada `task_id` encontrado, llamá `check_agent_task(task_id='...')`.
3. Interpretá el resultado:
   - `completed` → leé el veredicto. Anotalo en la fila de COMMS_LOG
     (estado `Resuelto`, resumen del veredicto, fecha). **Si tiene hallazgos
     bloqueantes, aplicalos antes de avanzar al siguiente item.**
   - `failed` → anotá el motivo EXACTO que devuelve. Distinguí:
     `StreamIdleTimeoutError` (modelo pensando lento) vs
     `empty response` (provider caído) vs `session_id mismatch`.
     **No los anotes todos como "timeout".**
   - `running` → dejala para el próximo heartbeat. **No la marques como
     fallida.** (Ojo: `check_agent_task` puede devolver `running` con la
     tarea YA terminada. Si pasa 2 heartbeats seguidos en `running`,
     asumí que terminó y buscala en la sesión de Pablo.)
4. Si una tarea quedó `running` por más de 2 heartbeats, marcala
   `Fallido` en COMMS_LOG y **seguí por mérito técnico**. No bloquees el ciclo.

**Nunca reenvíes la misma consulta sin leer el resultado anterior primero.**

### Reglas de comunicación con Code-Reviewer

- **ID correcto:** `Code-Reviewer` (con mayúscula y guion). `code-reviewer`
  en minúscula NO existe y la llamada falla.
- **Timeout:** el Reviewer tarda ~2-15 min en una revisión real. No lo
  declares muerto antes de 20 min.
- **Consultá siempre con `task_timeout: 1800`** (30 min). El default de
  la plataforma es insuficiente para revisiones grandes.
- **Pregunta única y acotada.** El Reviewer funciona mejor con un diff
  o una pregunta concreta que con "revisá todo".


### PASO 3 del ciclo: la fuente de propuestas del PO

> **HB#114: esta seccion no existia en el repo.** El HB#102 (fila 113 de
> `COMMS_LOG.md`) corrigio el paso 3 **solo en el `HEARTBEAT.md` del workspace**
> (`C:\Users\psanc\.qwenpaw\workspaces\default\`), que **no es un repo git**.
> O sea: la correccion nunca se pusheo, y la version del repo seguia apuntando
> a `PRE_BACKLOG.md` por el criterio viejo. Alguien que clonee el repo no tiene
> el paso 3. **REGLA: una correccion a un archivo de instrucciones tiene que
> ir al REPO del que se clonea, no solo al workspace que el agente esta leyendo.**

**Fuente unica: la rama MAS RECIENTE del PO, y "mas reciente" se resuelve, no se pinea.**

```
git fetch origin "refs/heads/po/*:refs/remotes/origin/po/*"
git for-each-ref --sort=-committerdate --format="%(refname:short) %(committerdate:iso)" refs/remotes/origin/po/
```

La primera de esa lista es la rama viva. **No la nombrees fija**: el PO crea una
rama por ronda (`po/hb99`, `po/hb104`, `po/hb110`...), asi que un nombre pineado
envejece en 2-3 rondas y el paso 3 pasa a leer rondas viejas **sin avisar**.
Medido HB#114: el paso 3 pineado a `po/hb99-dashboard` leia la **ronda 33**,
cuando la viva es la **35**.

> #### 🔴 ALERT-227 (HB#158): ORDENAR POR FECHA NO ES SUFICIENTE. LA RAMA MAS
> #### RECIENTE PUEDE SER LA QUE TIENE **MENOS** HISTORIAL DEL PO.
>
> **Medido hoy, con dos instrumentos que coinciden.** Ordenando `origin/po/*` por
> `-committerdate`, la primera es **`origin/po/hb160-poda`** (04:11 UTC). Su
> `DASHBOARD_PO_IDEAS.md` tiene su seccion mas nueva en la **ronda 42**.
> **`origin/po/hb150-poda` (5 h mas VIEJA) tiene la ronda 45.** Y `hb160` **no
> contiene** la ronda 45:
>
> ```
> git merge-base --is-ancestor 8779109 origin/po/hb160-poda   -> FALLA
> ```
>
> **La causa, medida:** el PO crea la rama de cada ronda desde **`main`**, y las
> rondas 43-45 **nunca se mergearon a main** (18 de 19 ramas `po/*` siguen sin
> mergear). O sea que cada rama nueva **nace sin el historial del PO**, y la
> fecha del tip sube mientras el contenido **baja**. `hb160` tiene 2 rondas
> menos que `hb150`.
>
> **Por que el ciclo de hoy casi no lo ve:** el detector leyo `hb160` = ronda 42,
> y la 42 esta marcada cerrada, asi que el conteo dio 0 Tramos y el paso 3 no
> mando nada. **El resultado fue correcto por la razon equivocada** — igual que
> el bug del HB#103. Con una ronda 43-45 abierta, el paso 3 habria leido "0
> propuestas" sobre un archivo que no tiene la ronda nueva.
>
> **REGLA: la rama viva NO se resuelve solo por fecha. Se resuelve por
> `MAX(ronda)` sobre TODAS las ramas `po/*`, y se lee la ronda mas alta
> encontrada, no la primera de la lista de fechas.** Las dos condiciones hacen
> falta, y por la misma razon que en ALERT-222: un criterio de seleccion que
> solo mira una dimension se rompe en cuanto esa dimension deja de correlacionar
> con lo que se busca.
>
> ```
> :: medir la ronda MAX de cada rama po/* y leer la mas alta
> git for-each-ref --format="%(refname:short)" refs/remotes/origin/po/ ^
>   | git show "%%:DASHBOARD_PO_IDEAS.md" 2>NUL   :: se hace con node, ver abajo
> ```
>
> En `node` (sin `try/catch` que trague: un catch convierte un crash en `null`
> y 19 ramas "sin rondas" se leen como una medicion — medido en el HB#158):
> ```js
> const HEAD = /^## .*?ronda (\d+)/gim;   // SOLO encabezados: `/ronda (\d+)/`
>                                         // matchea la prosa ("las rondas 45 y 46")
> ```
>
> **Corolario de fondo:** el `append-only` que el PO mismo se impuso ("el conteo
> tiene que salir de un archivo que yo no pueda reescribir despues de haber
> contado") **no aguanta un rebase sobre `main`**. El archivo es append-only
> *dentro* de una rama y **perdedor entre ramas**. Mergear `main` <- rama del PO
> no es solo higiene: es lo que hace que la maxima exista en un solo lugar.

> #### ALERT-231 (HB#163): EL PO TIENE **TRES** CANALES, Y EL PASO 3 MIRA UNO.
> #### ADEMAS LA TERCERA DIMENSION NO SALE POR NINGUNA DE LAS DOS QUE YA
> #### EXISTIAN.
>
> **Medido en el HB#163 sobre las 19 ramas `po/*`, con control negativo que da 0.**
> Las dimensiones de "cual es el canal vivo" se contradicen:
>
> | Dimension | Instrumento | Resultado |
> |---|---|---|
> | rama por FECHA | `for-each-ref --sort=-committerdate` | `origin/po/hb160-poda`, ronda **42** |
> | ronda por MAX en las 19 ramas | regex anclada de encabezado sobre `DASHBOARD_PO_IDEAS.md` | `origin/po/hb150-poda`, ronda **45** |
> | `BACKLOG.md` en `origin/main` | **la misma regex** | **0 encabezados**, 46 coincidencias en PROSA, maximo **47** |
> | `PRE_BACKLOG.md` del workspace del PO | **la misma regex** | 1 encabezado, ronda **47** |
>
> **La ronda 47 es la mas nueva de las cuatro y no la da NINGUNO de los dos
> criterios anteriores.** La causa es una forma nueva de la misma trampa: **el PO
> publica por mas de un canal, el paso 3 mira uno, y los otros dos no usan la FORMA
> que el criterio sabe leer.** En `BACKLOG.md` la ronda esta **dentro de la fila**,
> en prosa, y el mismo regex da **0 en las 19 ramas**.
>
> **Ese 0 es el punto, no un detalle.** Un `0` de ese regex **no distingue "no
> existe" de "no lo se buscar"**: es ALERT-223 una dimension mas adentro, y hoy
> es invisible porque **el ganador no cambia** y los dos criterios siguen leyendo
> una ronda vieja. El `MAX(ronda)=45` que se viene reportando es cierto **y esta
> incompleto: es el maximo de UN canal.**
>
> **LO QUE ESTO CORRIGE DE ALERT-227:** la regla de ALERT-227 ("se resuelve por
> `MAX(ronda)` sobre todas las ramas") queda **SUPERADA**, no ampliada: es
> **necesaria pero no suficiente**, porque lee un solo canal. Ordenar por fecha y
> maximizar la ronda sobre las ramas **siguen siendo necesarios**; ya no bastan
> ninguno de los dos por separado.
>
> **REGLA, en este orden:**
>
> 1. Medir los **3 canales** y **REPORTAR SU DESACUERDO** en `TEAM_STATUS.md`.
>    El ultimo en escribir no es el ultimo en contenido.
> 2. Si coinciden, hay una ronda. Si no, **gana el numero mas alto de los tres**,
>    y cada propuesta se verifica contra `origin/main` antes de mandarla.
> 3. Contar **items abiertos** (`- [ ]`), no encabezados de ronda: un encabezado
>    de ronda no dice si hay trabajo. **La forma exacta es la que dice el bloque
>    4 de mas abajo** (`/^[ \t]*- \[ \]/`, que **tolera sangria**), no la glifo
>    suelto: una `- [ ]` que alguien indenta bajo un subtitulo sigue siendo un
>    item abierto, y el conteo no puede bajarla en silencio. Medido
>    2026-10-03 sobre `origin/main:BACKLOG.md` @ `4dfeff8`: la forma tolerante da
>    **5**, la anclada en columna 0 tambien **5**, y coinciden **por casualidad**
>    — las 3 casillas con sangria (L284, L420, L421) son todas `- [x]`.
>
> 4. **CONTROL DE CARGA — la tabla vive ACA, no en un workspace.** Este archivo
>    es el unico canonico del ciclo, asi que la tabla que decide el modo de los
>    5 agentes tiene que estar aca y no en el `AGENTS.md` de otro agente.
>    Medido 2026-10-03 (ALERT-244) sobre `origin/main` @ `d342c3c`: `AGENTS.md` =
>    **0** coincidencias de `MODO PODA` / `RECOLECTAR` / `CONTROL DE CARGA`, y
>    `AGENTS_SYNC.md` = **0**. La tabla existia **solo** en el `AGENTS.md` del
>    workspace del PO, y el puntero que la citaba (`PASO 0.5 - CONTROL DE
>    CARGA`) era **colgante**: este archivo tiene **4** coincidencias de `PASO 0`
>    y **ninguna** es `PASO 0.5`. **Si ese workspace se resetea, el control de
>    carga entero desaparece sin un solo diff en el repo.** Esta seccion es su
>    unica mitad en git:
>
>    | items abiertos | modo |
>    |---|---|
>    | **0 - 3** | **RECOLECTAR** |
>    | **4 - 7** | **PAUSA** — no se investiga, no se traen ideas |
>    | **>= 8** | **MODO PODA** |
>
>    El conteo autoritativo es el campo `c2_backlog_main.openItems` de
>    `tools/hb163-canales.mjs`, y **solo cuenta si `openItemsDiscrimina` es
>    `true`** (ALERT-236). Medido hoy: **5 = PAUSA** (era 4 antes del rescate del HB#174,
>    que abrio 1 fila abierta al mover el trabajo multicuenta del Fractal Tracker a su
>    propia fila). **`openItems` es la forma que TOLERA SANGRIA** (ALERT-249, dos parrafos
>    abajo): no puede perder un item abierto si alguien lo indenta bajo un subtitulo, que
>    es la unica forma en que este numero podia bajar solo. El numero anclado se publica
>    aparte, como `openItemsAnclada`, y hoy los dos dan **5 = 5**.
>
>    **La holgura entre las dos formas se consumio en el primer item real del ciclo, y
>    no en una frase.** Medido sobre el staged y sobre `origin/main`: la forma que
>    discrimina da **4 -> 5**, y la subcadena da **7 -> 8**. El piso de ruido son **3
>    lineas** (L200, L286, L425), las mismas 3 antes y despues: el salto no lo produjo
>    una frase de cierre nueva, lo produjo **una fila abierta real**. ALERT-243 predijo
>    que la cuarta frase de cierre cruzaba 8; lo que lo cruza es el primer item de
>    trabajo. **El disparador de MODO PODA es mas probable de lo estimado, y por el
>    motivo mas banal: anadir trabajo es mas frecuente que documentar un cierre en esa
>    forma exacta.** La banda correcta (4-7 = PAUSA) no se movio en ninguno de los dos.
>
>    **La FORMA del conteo importa, y hay tres (ALERT-243).** Con un fixture de 6
>    lineas que mezcla los dos casos, sobre un archivo real: la forma anclada en
>    columna 0 da **1**, la que tolera sangria da **3**, y la subcadena sin ancla
>    da **4** (fixture de 6 lineas: 1 abierta en columna 0 + 1 sangrada + 2 de
>    prosa que citan el glifo). Sobre `origin/main:BACKLOG.md` @ `7ffab62` las tres
>    dan **5 / 5 / 8**. La anclada y la que tolera sangria **coinciden porque hoy no
>    hay ninguna casilla ABIERTA con sangria** — las 3 con sangria son `- [x]`, y por
>    eso aca no hay nada que citar por linea: **lo que hay que citar es la forma**,
>    que es lo unico que se re-deriva solo. **Coinciden por casualidad, no por
>    contrato.** La forma que NO pierde un item abierto si alguien lo indenta bajo
>    un subtitulo es la que **tolera sangria**: la anclada en columna 0 lo dejaria de
>    contar en silencio.
>    **ALERT-247: toda cita `L<n>` de este bloque lleva su sha al lado.** Sin sha, una
>    cita se pudre sola. HB#174 inserto 10 lineas en `L298` y las 3 referencias de
>    linea de debajo quedaron +10 desfasadas, mientras el conteo de al lado se
>    re-derivo bien. **El valor se refresca, la coordenada no, y el parrafo se lee
>    como una sola medicion de hoy.**
>    **ALERT-248: el contador que decide el modo era el que este mismo bloque declara
>    incorrecto.** `hb163-canales.mjs` contaba con `/^- \[ \]/gm`, **anclado en columna
>    0**, mientras el parrafo de arriba — que existe para medir esa misma forma —
>    concluia que la que no pierde un item abierto si alguien lo indenta bajo un subtitulo
>    es la que **tolera sangria**. **El parrafo tenia escrita la forma correcta a cinco
>    lineas del campo que usaba la otra.** Medido hoy sobre `origin/main:BACKLOG.md` @
>    `4dfeff8` con un fixture de 4 lineas (1 abierta en columna 0, 1 abierta sangrada, 1
>    cerrada sangrada, 1 prosa que cita el glifo): **anclada 1, tolerante 2**. Sobre el
>    archivo real dan **5 / 5 / 8** y las dos primeras coinciden porque **las 3 casillas
>    con sangria (L284, L420, L421) son todas `- [x]`**. Coinciden por casualidad, no por
>    contrato, y el modo de los 5 agentes se decidia con el numero de la forma que puede
>    perder un item sin avisar.
>    Corregido en ALERT-248, y **corregido al reves en ALERT-249.** La primera vez el
>    campo autoritativo se dejo como estaba (`openItems` = anclada, "porque este archivo
>    lo cita por nombre") y la forma correcta se agrego como campo nuevo al lado. Eso
>    **conserva la cita y deja el defecto vivo**: el numero que se lee seguia siendo el
>    que se decrementa solo, y el detector que lo veia quedo en un campo que nadie mira.
>    **Un detector que nadie mira es decorativo**, y el residuo no era teorico: el PO
>    senalo que nadie iba a buscar `openItems_INCONSISTENTE_por_forma` salvo que fuera a
>    buscarlo, y que por eso el fix **detectaba pero no previnia**. Ahora `openItems`
>    **es** la forma tolerante — el nombre no cambia, la cita no se rompe, y lo que la
>    cita alcanza es el numero que no puede perder trabajo — y `openItemsAnclada` +
>    `openItemsQueLaAncladaPierde` + `openItems_INCONSISTENTE_por_forma` quedan como
>    **diagnostico**. Hoy vacia (5 = 5).
>    **La asimetria del parrafo de abajo es lo que decidia el caso:** la forma tolerante
>    es un **superconjunto** de la anclada, asi que invertir el campo quiere decir que
>    `openItems` solo puede **subir o quedarse**. Subir es hacia MODO PODA (frena);
>    bajar seria hacia RECOLECTAR (trae mas trabajo). **Invertir el campo es poner el
>    numero en el lado caro del error.**
>    **La guarda tambien hubo que moverla:** `openItemsDiscrimina` se calcula sobre
>    `marcadorPresente`, y con la forma anclada la guarda era **mas estrecha que el numero
>    que custodia**: un canal con la unica casilla sangrada daba `marcadorPresente: 0`,
>    `openItemsDiscrimina: false` y `openItems: 1` — tres campos, uno solo cierto. Medido
>    en `BACKLOG.md`: `marcadorPresente` pasa de **65 a 68**, que son las 3 casillas con
>    sangria (L284, L420, L421), todas `- [x]`. `openItems` **no se mueve**: 5.
>    **Con control y fase roja** (ALERT-249, medida): el fixture `control_sangria` da
>    **autoritativo 2 / anclada 1 / perdidos 1 / `marcadorPresente` 2**. Dos
>    mutaciones, las dos en rojo: colapsar `RE_ABIERTO` a la forma anclada ->
>    `controles_ok: false`, **exit 1**; colapsar `RE_MARCA` a la forma anclada ->
>    `controles_ok: false`, **exit 1**. Sano: `true`, **exit 0**. Restaurado byte a byte.
>    **Y el margen no es un margen** (medido por el PO, su ronda 50): la subcadena con
>    guion da **8** y sin guion **9**, y el umbral de MODO PODA es `>= 8`. La banda buena
>    (4-7) mide **3 de ancho**. O sea que **la distancia entre la forma que decide bien y
>    la que decide mal es el ancho entero de la banda**: no se acercan, no hay un tercer
>    canal, la forma ruidosa entra directo en el otro modo. Por eso no hay que "vigilar"
>    la forma: hay que usarla solo una.
>    **Y la asimetria es la parte que hay que recordar: la perdida va en la direccion de
>    RECOLECTAR.** Un item que se indenta **baja** el conteo; bajar de 5 a 4 no cambia el
>    modo, pero bajar de **4 a 3** cambia PAUSA por RECOLECTAR. O sea que el defecto no es
>    simetrico: **el error que este instrumento puede cometer es el que abre la puerta a
>    traer mas trabajo**, nunca el que la frena. Un control de carga que solo puede
>    fallar hacia un lado hay que revisarlo cada vez que se escribe, no solo cuando
>    alguien lo nota.
>    La subcadena **no puede discriminar nunca**: las 3 lineas de mas que agrega
>    (L200, L286, L451 @ `4dfeff8`; antes L425 @ `7ffab62`, movida por el rescate del
>    HB#174) son frases **escritas sobre este bug** que niegan el
>    estado abierto. O sea que **cada frase que el equipo escribe para explicar
>    el fallo del glifo sube el conteo del contador roto.** La holgura de 1 entre
>    7 y 8 no es un margen: es una tension que crece con la calidad del trabajo.
> **Herramienta: `tools/hb163-canales.mjs`**, que mide los 3 canales y **CUENTA**
> las coincidencias de cada uno. **Un canal que da 0 tiene que decir de que salio
> el 0**: si no se pudo leer, eso es un fallo de medicion y se reporta como tal, no
> como un cero.

```
git show origin/po/<rama-viva>:DASHBOARD_PO_IDEAS.md
```

`DASHBOARD_PO_IDEAS.md` **en la rama del PO**: una seccion `## ACTUALIZACION ...
ronda N` por ronda, orden inverso, y es lo unico que se puede leer sin pedirle
nada al PO (append-only por construccion — ver la condicion que el PO mismo
puso: *"el conteo tiene que salir de un archivo que yo no pueda reescribir
despues de haber contado"*).

**Criterio de conteo. El que estaba escrito mide PROSA, y por eso esta
invertido.** Decia: *cuenta si la seccion trae `### Tramos` y ninguna linea
dice `aplicada`/`cerrada`*. Medido HB#114 contra la rama viva:

| Seccion | Items | El filtro viejo dice | Realidad contra `origin/main` |
|---|---|---|---|
| ronda 35 | T14-a, T14-b, T15-a, T15-b | **CERRADA** (la excluye) | **VIVA** — T14/T15 nunca se aplicaron |
| ronda 34 | T13-a/b/d | cuenta | aplicada en `1e5aedb` |
| ronda 33 | T12-a/b/c | cuenta | aplicada en `6c3f8e5` |
| ronda 19 | 64 T1/T2/T3 | cuenta | aplicada en `47a2526` |
| ronda 16 | 63 T1/T2 | cuenta | aplicadas en `eb69fb3` |

El filtro falla por una palabra: la ronda 35 dice "T13 ya esta APLICADA" en su
**encabezado narrativo**, asi que `aplicada` matchea y tira la seccion entera.
Pero cerrar T13 no cierra T14/T15, que son items distintos de la misma ronda.
**Es el mismo error que un assert que mira la FORMA en vez del VEREDITO, y que
un regex que no matchea devuelve un 0 indistinguible de una medicion.**

**Criterio corregido, en este orden:**
1. La seccion mas reciente (`ronda N` maximo), no todas: las viejas ya se consumieron.
2. Trae `### Tramos`.
3. **Cada item se verifica por separado** contra `origin/main`, por su propio estado.
   Una ronda puede tener items vivos y items cerrados a la vez.

**Control obligatorio del conteo:** un criterio de conteo se verifica con un
control **negativo** (un criterio imposible debe dar 0). Un conteo que nunca
puede dar menos de 3 no esta midiendo. Medido HB#114 con
`tools/hb114-cuento-v2.mjs`: los 3 controles dan 0.

**Y despues de contar, verificar CADA item contra `origin/main` antes de
mandarlo.** El conteo dice *candidatas*; el estado real lo decide el disco. Un
item aplicado produce una respuesta correcta a una pregunta que ya no importa,
y el Reviewer tarda 2-15 min.

**El paso 3 no es un ritual.** Si no hay items vivos, no se manda nada y se
dice por que. Mandar 3+ propuestas ya aplicadas es la forma mas cara de perder
un ciclo.

### Watchdog de comunicaciones (T+4h)

Cada heartbeat (cada 30 min), el Principal:
1. Lee `COMMS_LOG.md`.
2. Filtra comms en estado **Esperando** o **Reintento** con >4h sin movimiento.
3. Si receptor activo → fuerza `chat_with_agent`.
4. Si receptor caído → reasigna al Principal (estado **Reasignado**).
5. Si >12h sin resolverse → marca **Fallido**, ejecuta la tarea él mismo, estado **Resuelto (auto)**.
6. Al arranque, cada agente revisa COMMS_LOG filtrando por "A"=él y responde todas las pending.

---


---

### PASO DE CIERRE DEL CICLO: worktrees y scratch (2026-10-02)

Este paso va **al final**, despues de commitear y pushear. No antes: si pusheaste,
el trabajo ya esta a salvo y el worktree que lo contenia es solo una copia.

**Por que existe:** se acumularon 55 worktrees (3,1 GB), 7 en carpetas que nadie
vigila, dos de ellas en carpetas temporales de Windows. Y 30 archivos sueltos con
prefijo `_` en la raiz del repo. Las reglas estan en `AGENTS.md`, seccion
"WORKTREES — ciclo de vida y limpieza". El resumen operativo:

**1. Si creaste un worktree para este ciclo, borralo al terminar.**

```
git worktree remove "C:/Mis Archivos/GW2 online/gw2-dev/<nombre>" --force
```

Solo si el trabajo llego a `main` y esta verificado en GitHub. Si el trabajo
esta **a medias**, el worktree se queda: ahi esta el trabajo. No lo abandones,
**commitealo** — un worktree con codigo sin commitear es la unica forma de que
el trabajo se pierda sin que nadie lo note.

**2. Archivos sueltos en la raiz:** los que empiezan con `_` y son tuyos,
borralos. `.gitignore` los ignora, pero ignorado no es borrado, y un
`git status` que miente sobre cuanto trabajo queda pendiente es peor que no
tenerlo. Antes de borrar uno, **miralo**: `LICENSE` no tiene prefijo y no es
basura. La regla del prefijo `_` es precisamente para que la decision sea
obvia sin tener que abrir cada archivo.

**3. Una vez por semana (o cuando el numero te parezca raro), auditá:**

```
node C:\Users\psanc\.qwenpaw\workspaces\architect\_eco\wt.js
```

Sin argumentos **no borra nada**. Imprime, para cada worktree, el motivo exacto
por el que se queda. Es el comando para responder "¿esto se puede borrar?" con
una verificacion y no con una sensacion.

**Lo que no se toca:** ramas `po/*` (son del PO), `_wt_47`, y
`media/*.gif` (`confetti.gif` y `burbuja.gif` son el preview animado del drop
de los eventos de Meta; no hay otra pagina que muestre el efecto de una
infusion, y eso es lo que hace distinta a esta webapp).

<!-- ORIGINAL HEARTBEAT CONTENT (preservado para reversibilidad) -->
<!-- Si se re-activa el cron, eliminar este banner y restaurar el contenido original -->
