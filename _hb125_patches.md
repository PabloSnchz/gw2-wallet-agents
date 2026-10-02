# Parches de PODA para `BACKLOG.md` — ronda 40 del PO

**Aplicar sobre `origin/main` @ `de42a69`.** El PO no puede escribir `BACKLOG.md`
(AGENTS.md § "Permisos sobre el repo agents"), así que van como parches exactos.
Cada uno dice **qué línea se toca** y **por qué**, para que la razón sobreviva a
la edición: *nunca borres una idea sin decir por qué*.

**Efecto: 13 `- [ ]` → 7.**

---

## P1 — `Idea 49` (línea 115): cambiar `[ ]` por `[x]`, la fila ya se autod describe como nota

```
- [ ] **Idea 49 ...
+ [x] **Idea 49 ... — 🟹 ARCHIVADA (ronda 40 del PO): lo que queda es 1 línea de comentario, y la fila misma lo dice. `api-gw2.js:15` afirma que "cacheClear sigue con 0 callers y el botón sigue sin existir"; MEDIDO en `de42a69`, las dos mitades son falsas (3 callers en `settings-manager.js:737/742/769`, botón en `index.html`, y `api-gw2.js:2056` lo expone en el return). **Revisar: 2026-11-15** o antes si se toca la cabecera de `api-gw2.js`.**
```

**Por qué:** la fila dice desde la ronda 39, textual, *"una fila de 15 líneas cuyo único pendiente es un `grep` de 30 segundos no es un item de backlog, es una nota"*. Un item que su propio texto llama nota no puede seguir contando como item.

---

## P2 — `Homestead tracker: completar wiring` (línea 213) → archivar con fecha

```
- [ ] **Homestead tracker: completar wiring** ...
+ [x] **Homestead tracker: completar wiring** — 🟹 ARCHIVADA CON FECHA (ronda 40 del PO), **NO cerrada**. MEDIDO en `de42a69`: `js/homestead-tracker.js` sigue commiteado (blob `e03b07c`) y **sigue inerte** — `git grep homestead origin/main -- js/api-gw2.js index.html js/router.js` devuelve **3 líneas, las 3 comentarios de `router.js:1504-1505`**: 0 wrappers, 0 `<script>`, 0 route. Último commit que lo tocó: `680f051` (Heartbeat #17). El icono `assets/icons/Cuentas/homestead-icon.png` sigue sin existir. **LA DECISIÓN SIGUE VIVA:** mergear la rama completa (con icono) vs dejar el fix vs revertir el archivo huérfano es de Pablo. **La razón de archivar y no de cerrar:** 40+ heartbeats en 0% y un item que depende de una decisión de producto no es cola; es una pregunta. **Revisar: 2026-11-01.**
```

---

## P3 — `Homestead decoration collection tracker` (línea 218) → **fundida con P2**

```
- [ ] **Homestead decoration collection tracker** ...
+ [x] **Homestead decoration collection tracker** — 🟹 FUNDIDA con "Homestead tracker: completar wiring" (ronda 40 del PO). Es la misma fila contada dos veces: **este item depende de que exista el wiring**, que es justamente lo que no está (ver esa fila). `git ls-tree` del icono da **nada**. "Construir el tracker" y "construir la cosa que el tracker trackea" son el mismo item con distinto verbo. **Revisar: 2026-11-01**, junto con la otra.
```

---

## P4 — `Verificar encoding` (línea 214) → archivar con fecha, con el número **re-medido**

```
- [ ] **Verificar encoding de archivos** ...
+ [x] **Verificar encoding de archivos** — 🟹 ARCHIVADA CON FECHA (ronda 40 del PO). **Re-medido en `de42a69`, sin cambios: siguen siendo 9, los mismos 9** (`achievements-theme.js`, `analytics.js`, `converter-modal.js`, `meta.js`, `sidebar-nav.js`, `wv-objectives-dashboard.js`, `wv-objectives-ui.js`, `wv-season-storage.js`, `wv-theme.js`) — 9 de 9, cero bajas desde la ronda 39. **LA RAZÓN, y es la misma por las dos últimas rondas:** (a) es higiene, no producto — un BOM no le cambia nada a Pablo; (b) la fila **ella misma avisa que su lista está caducada**, así que el trabajo no es "quitar 9 BOM" sino "re-medir y decidir si vale un cambio masivo con validación del Reviewer", que es una pregunta y no una fila; (c) se midió dos rondas seguidas sin que nadie la ejecute, y una fila que nadie ejecuta dos veces no la va a ejecutar un tercero. **MÉTODO, para el que mida después:** sacar el árbol con `git archive origin/main js | tar -x` y leer bytes crudos. Con `git show` + `Out-String` el conteo da **0 para los 9** — no porque no tengan BOM, sino porque el pipeline de texto se los come. **Revisar: 2026-11-15.**
```

---

## P5 — `Mobile PWA enhancement` (línea 220) → archivar con fecha

```
- [ ] **Mobile PWA enhancement** ...
+ [x] **Mobile PWA enhancement** — 🟹 ARCHIVADA CON FECHA (ronda 40 del PO). **No se descarta: es idea del PO** (sale del análisis UX del flujo de API Key; la Bóveda en mobile es funcional pero no cómoda). No depende de nada, no tiene deadline, y hoy hay 6 items **antes** que ella. **Revisar: 2026-11-01.**
```

---

## P6 — `Inventory cleanup tool` (línea 222) → archivar con fecha

```
- [ ] **Inventory cleanup tool** ...
+ [x] **Inventory cleanup tool** — 🟹 ARCHIVADA CON FECHA (ronda 40 del PO). Gap competitivo real contra MetaForge WARDOGS, y el estimado más caro de la cola (**15-20h**), sin deadline ni dependencia. **Revisar: 2026-11-01.**
```

---

# Y dos correcciones de PREMISA que hay que hacer aunque no se poda nada

Estas dos NO bajan el número. Las dejo aparte porque **una poda que solo baja el
número pierde el detalle, y el detalle es lo que evita el re-trabajo.**

## C1 — 🔴 `Idea 57` (línea 106): la fila dice "Tramo 2 PENDIENTE DE VEREDICTO". **Está hecho, con test y control negativo. Lo que falta es el merge.**

Texto a cambiar, dentro de la fila:

```
- **Tramo 2 (PENDIENTE).** Migrar los 7 al guard de la v2.24.0. ...
+ - **Tramo 2 (HECHO, SIN MERGEAR).** ⚠️ CORREGIDO en la ronda 40 del PO: la fila decía
+   "pendiente de veredicto del Reviewer" y **eso ya no es cierto**. Commit
+   **`a621767 fix(idea57): Tramo 2 - los 3 wrappers de inventario ya no degradan la FORMA a []`**,
+   en la rama `fix-idea57-t2-forma` (worktree `hb113-wt`). `git merge-base --is-ancestor
+   a621767 origin/main` = **NO**. Trae `tests/idea57-t2-forma-propaga.test.js` (225 líneas,
+   21 aserciones), **control negativo real** (`tools/hb113-control-negativo.mjs`: 13 pass /
+   **8 FAIL** contra el archivo sin el fix), **suite 1359 pass / 0 FAIL en 54 archivos**, y
+   cubre los 3 wrappers que la fila nombra: `getAccountBank` (`api-gw2.js:1180`),
+   `getAccountMaterials` (`:1220`) y `getAccountLegendaryArmory` (`:1260`).
+   **LO QUE PIDE ESTA CORRECCIÓN:** decidir el merge de `a621767`, y **si se mergea,
+   cambiar el "11" de esta fila por "7"** — el propio test del Tramo 1 avisa que el umbral
+   baja 8 → 7 cuando el Tramo 2 entra, y un número que el test va a contradecir es
+   exactamente el tipo de dato que este equipo ya corrigió dos veces (Idea 57 T1 y Idea 49G).
```

## C2 — 🟡 `Dungeon dailies` (línea 90): 2 de los 3 "patrones ya probados" **no están en `activities.js`**

La fila dice: *"`activities.js` ya trackea `dailycrafting`, `worldbosses` y `mapchests`;
falta `dungeons`... **Patrón ya probado, es el de menor riesgo de los tres**"*, y de
ahí sale el "~3-4h".

Texto a añadir a la fila:

```
  🟡 **CORRECCIÓN DE PREMISA (ronda 40 del PO), MEDIDA en `origin/main` @ `de42a69`:**
  **`git grep -niE "worldboss|mapchest" origin/main -- js/activities.js` → 0 resultados.**
  Las dos familias viven en **`meta.js`** (`:100`, `:101`, `:228`, `:236`, `:377-380`,
  `:837-838`, `:844`) — el módulo de **Meta & Eventos**, con otro ciclo de vida y otra
  capa de render. `dailycrafting` sí está en `activities.js`, pero **dentro del bloque de
  "Ecto"** (`:748-751`): no es una familia de tracker, es un `fetch` crudo dentro de un panel.
  `/v2/account/dungeons` **sí existe**, confirmado contra `/v2.json` (184 rutas) — la fila
  tenía razón en eso.
  **LO QUE CAMBIA:** el estimado "~3-4h, la de menor riesgo, patrón ya probado" sale
  **literalmente** de que los 3 hermanos estén en el mismo módulo. No lo están. El trabajo
  real es *traer una familia nueva a `activities.js` desde otro módulo*.
  **"El patrón ya está probado" no es un argumento a favor hasta que el patrón esté
  en el módulo destino.**
```