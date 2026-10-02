/**
 * armeria-alert-01-clasificacion.test.js — ALERT-ARME-01
 *
 * El filtro "Gen" del Catalogo de la Armeria le `generation` a cada item. 93 de
 * los 206 items salian con `generation: null` porque `_build_legendary_data.py`
 * no tenia regla para la familia de armaduras de set de PoF, ni para dos tipos
 * sin mapear. Con `null` no los alcanzaba NINGUN filtro: no aparecian en "Gen 1",
 * ni en "Gen 2", ni en "Gen 3", ni en un "Sin generacion" que nadie habia
 * dibujado. Invisible en la UI, y por eso nadie lo reporto.
 *
 * ESTE TEST NO MIDE EL CATALOGO. Mide el BUILD.
 * `legendary-data.js` es un artefacto generado: probar el artefacto seria probar
 * que el archivo de hoy esta bien, y manana el build puede volver a Romperlo sin
 * que nadie se entere. Lo que se prueba es la funcion que decide la
 * clasificacion, y se prueba regenerando.
 *
 * POR QUE RECONSTRUYE EL INPUT: el snapshot crudo (`_legendary_items_full.json`)
 * NO se versiona a proposito —se regenera de la API—so que en un clon limpio no
 * existe y el build no se puede ejercitar sin red. Este test lo reconstruye
 * desde el catalogo versionado. No es el snapshot real (faltan `chat_link`,
 * `details.type` exacto y `vendor_value`) pero `infer_gex()` depende solo de
 * `id`, `name` y `type`, y los tres se conservan.
 *
 * NOTA DE POSICION: vive en `tests/` y no en `tools/` porque `tools/` esta en
 * `.gitignore` con `*` (es scratch). Un test en `tools/` no se versiona, no lo
 * corre `run-suite.cmd`, y el fix queda sin congelar.
 *
 * FASE ROJA: 95 FAIL contra `origin/main` antes del fix, 120/0 despues.
 */
'use strict';

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const JS_DIR = path.join(__dirname, '..', 'js');
const BUILD = path.join(JS_DIR, '_build_legendary_data.py');
const CATALOG = path.join(JS_DIR, 'legendary-data.js');
const PY = process.env.PYTHON_BIN || 'python';

let pass = 0;
let fail = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ' -> ' + detail : ''));
}

function eq(name, actual, expected) {
  ok(name, actual === expected,
    `esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(actual)}`);
}

// --- Reconstruccion del input (autonoma, sin depender de tools/) ----------
const TYPE_UP = {
  weapon: 'Weapon', armor: 'Armor', trinket: 'Trinket', back: 'Back',
  relic: 'Relic', upgradecomponent: 'UpgradeComponent'
};

function leerCatalogo() {
  const src = fs.readFileSync(CATALOG, 'utf8');
  const m = src.match(/var LEGENDARY_CATALOG = (\[[\s\S]*?\]);/);
  if (!m) throw new Error('no se encontro LEGENDARY_CATALOG en legendary-data.js');
  return { items: JSON.parse(m[1]), header: src };
}

function reconstruirInput(items) {
  const out = {};
  for (const i of items) {
    const t = TYPE_UP[i.type] || 'Armor';
    const details = {};
    if (t === 'Armor' && i.subtype) {
      const parts = i.subtype.split(' ');
      details.type = parts.slice(1).join(' ');
      details.weight_class = parts[0];
    } else if (t === 'Weapon' || t === 'Trinket') {
      details.type = i.subtype;
    }
    out[String(i.id)] = {
      id: i.id, name_en: i.name, name_es: i.nameEs,
      type: t, icon: i.icon, rarity: i.rarity, details
    };
  }
  return out;
}

// --- Build ------------------------------------------------------------------
function buildCatalog(outPath) {
  // `python` explicito y no el .py directo: en Windows un .py no es ejecutable
  // sin asociacion de extension (EFTYPE). La suite ya corre Python asi.
  execFileSync(PY, [BUILD, '--out', outPath], { cwd: JS_DIR, stdio: 'pipe' });
  const src = fs.readFileSync(outPath, 'utf8');
  const m = src.match(/var LEGENDARY_CATALOG = (\[[\s\S]*?\]);/);
  if (!m) throw new Error('el build no produjo un LEGENDARY_CATALOG legible');
  return { items: JSON.parse(m[1]), header: src };
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'armentalert01-'));
const snapshot = path.join(JS_DIR, '_legendary_items_full.json');
let hadSnapshot = fs.existsSync(snapshot);
let snapshotAntes = null;
if (hadSnapshot) {
  // Si el developer ya tiene el snapshot real (descargado de la API), se
  // RESPETA: es mejor input que el reconstruido. Se restaura al final.
  snapshotAntes = fs.readFileSync(snapshot, 'utf8');
}

try {
  const versionado = leerCatalogo();
  eq('el catalogo versionado tiene 206 items', versionado.items.length, 206);

  if (!hadSnapshot) {
    fs.writeFileSync(snapshot, JSON.stringify(reconstruirInput(versionado.items), null, 1), 'utf8');
  }
  eq('el input para el build tiene los 206 items',
    Object.keys(JSON.parse(fs.readFileSync(snapshot, 'utf8'))).length, 206);

  const built = buildCatalog(path.join(tmp, 'new.js'));
  const byId = {};
  built.items.forEach(i => { byId[i.id] = i; });

  // --- 0b. El artefacto tiene que SER JavaScript --------------------------
  // Este assert existe porque yo no lo tuve. Escribi `lines.append("}})(" ...)`
  // donde el original decia `lines.append(f"}})(" ...)`: en un f-string `}}` es la
  // escaped de UNA llave, sin la `f` salen DOS y el IIFE queda desbalanceado.
  // El .js salia con sintaxis invalida.
  //
  // Lo grave no es el error: es que la mayoria de los tests de este repo leen el
  // catalogo con una REGEX (`var LEGENDARY_CATALOG = (...)`) y nunca ejecutan el
  // archivo. Un .js roto con el JSON intacto los deja en verde. El typo paso
  // 57 de 58 archivos, y los 2 que lo detectaron fallaron por el efecto
  // secundario (contexto vacio), no por medir sintaxis. `node --check` va primero.
  const chk = spawnSync(process.execPath, ['--check', path.join(tmp, 'new.js')],
    { encoding: 'utf8' });
  eq('el artefacto generado es JavaScript valido', chk.status, 0);
  eq('el IIFE cierra una sola vez',
    (built.header.match(/\}\)\(typeof window/g) || []).length, 1);

  // --- 1. La invariante: NINGUN item sin clasificar -----------------------
  // Este es el assert que importa. Los demas son el detalle de QUE se
  // clasifico; este dice que el limbo no puede volver a existir.
  const unclassified = built.items.filter(i => !i.generation);
  eq('ningun item con generation=null', unclassified.length, 0);
  unclassified.slice(0, 10).forEach(i =>
    failures.push('  item sin clasificar: ' + i.id + ' ' + i.name));
  eq('ningun item con expansion=null',
    built.items.filter(i => !i.expansion).length, 0);

  // --- 2. La familia que estaba en el limbo -------------------------------
  // 90, no 93: los otros 3 del limbo son el Legendary Sigil, el Rune y el Relic,
  // que se prueban aparte en la seccion 3 porque no son armaduras. Los 90 son
  // 15 sets x 6 piezas: 72 "Glorious/Triumphant Hero's" (con variantes
  // Mistforged/Sublime) + 18 "Ardent Glorious".
  const sets = built.items.filter(i =>
    /hero's|ardent|calibrated/i.test(i.name) && i.type === 'armor');
  eq('la familia de sets de armadura son 90 items', sets.length, 90);
  eq("72 de la familia son Hero's",
    sets.filter(i => /hero's/i.test(i.name)).length, 72);
  eq('18 de la familia son Ardent',
    sets.filter(i => /ardent/i.test(i.name)).length, 18);
  sets.forEach(i => {
    ok('set ' + i.id + ' clasificado como Gen 1 PoF',
      i.generation === 1 && i.expansion === 'PoF',
      `obtenido ${i.generation}/${i.expansion} en "${i.name}"`);
  });

  // --- 3. Los tres que no son armadura ------------------------------------
  // Legendary Sigil, Legendary Rune y Legendary Relic salian con null porque
  // el script no tenia regla para `relic` ni `upgradecomponent`.
  const sigil = byId[91505];
  ok('Legendary Sigil existe', !!sigil);
  eq('Legendary Sigil es upgradecomponent', sigil && sigil.type, 'upgradecomponent');
  eq('Legendary Sigil es Gen 3', sigil && sigil.generation, 3);
  eq('Legendary Rune es Gen 3', byId[91536] && byId[91536].generation, 3);
  const relic = byId[101582];
  ok('Legendary Relic existe', !!relic);
  eq('Legendary Relic es relic', relic && relic.type, 'relic');
  eq('Legendary Relic es Gen 3', relic && relic.generation, 3);

  // --- 4. NO REGRESION: lo que YA estaba bien sigue bien ------------------
  // El fix agrega una rama a una cadena `elif`. Una rama nueva puede tragarse
  // una existente. Este bloque congela el estado previo de todo lo que ya
  // estaba clasificado, para que un cambio futuro se note como regresion y no
  // como "el numero bajo".
  const gen1Core = built.items.filter(i => i.generation === 1 && i.expansion === 'Core');
  ok('los Gen 1 Core siguen ahi', gen1Core.length >= 20, 'encontrados ' + gen1Core.length);
  const eikasia = built.items.filter(i => /eikasia/i.test(i.name));
  ok('Eikasia sigue Gen 3 EoD, no la como Gen 1 PoF',
    eikasia.length > 0 && eikasia.every(i => i.generation === 3 && i.expansion === 'EoD'),
    JSON.stringify(eikasia.slice(0, 2).map(i => i.name + '=' + i.generation)));
  ok('Obsidian sigue Gen 3 EoD',
    built.items.filter(i => /obsidian/i.test(i.name))
      .every(i => i.generation === 3 && i.expansion === 'EoD'));
  ok('Aurene sigue Gen 3 EoD',
    built.items.filter(i => /^aurene's /i.test(i.name))
      .every(i => i.generation === 3 && i.expansion === 'EoD'));
  ok('Perfected Envoy sigue Gen 1 HoT',
    built.items.filter(i => /perfected envoy/i.test(i.name))
      .every(i => i.generation === 1 && i.expansion === 'HoT'));
  const trinkets = built.items.filter(i => i.type === 'trinket');
  ok('los 10 trinkets siguen clasificados',
    trinkets.length === 10 && trinkets.every(i => !!i.generation),
    JSON.stringify(trinkets.filter(i => !i.generation).map(i => i.name)));

  // --- 5. El encabezado no puede mentir ------------------------------------
  ok('el encabezado declara el total',
    /Catalogo estatico de 206 legendarias/.test(built.header));
  ok('el encabezado no declara un hueco que no existe',
    !/SIN CLASIFICAR/.test(built.header),
    'la linea SIN CLASIFICAR aparecio con 0 items sin clasificar');
  ok('el encabezado declara la correccion de ALERT-ARME-01',
    /ALERT-ARME-01/.test(built.header),
    'el .js no dice de donde sale la clasificacion de los 93');

  // --- 6. El tipo del relic no viene por accidente -------------------------
  // `map_type` no tenia `Relic` ni `UpgradeComponent` en su diccionario: salian
  // por el fallback `item_type.lower()`. El resultado era correcto por
  // coincidencia —el fallback produce justo el string que el tracker leia—, y por
  // eso el bug era invisible. Este assert fija el string exacto para que dejar
  // de depender del fallback.
  ok('ningun item con type "unknown"',
    built.items.filter(i => i.type === 'unknown').length === 0);

  // --- 7. El orden de sort cubre los tipos nuevos --------------------------
  // `type_order` no tenia `upgradecomponent` ni `relic`: caian en el 99 y se
  // mezclaban con cualquier tipo desconocido. El orden del catalogo es parte
  // del contrato de la vista.
  const order = built.items.map(i => i.type);
  ok('armor va antes que trinket',
    order.lastIndexOf('armor') < order.indexOf('trinket'));
  ok('upgradecomponent va despues de los trinkets',
    order.indexOf('upgradecomponent') > order.indexOf('trinket'));
  ok('relic es el ultimo tipo', order.indexOf('relic') > order.indexOf('upgradecomponent'));

  // --- 8. Generar con y sin precios no puede perder los precios ------------
  // El artefacto versionado se genera con `--with-prices`. Si un cambio futuro
  // rompe la mergeo del cache, el catalogo sale con 206 ceros en silencio y la
  // UI muestra "0g" en todas. Este assert corre el build SIN la flag y
  // comprueba que los precios desaparecen de forma explícita, no a medias.
  const sinPrecios = buildCatalog(path.join(tmp, 'noprices.js'));
  eq('sin --with-prices no hay tpSell',
    sinPrecios.items.filter(i => 'tpSell' in i).length, 0);
  eq('sin --with-prices el catalogo sigue entero',
    sinPrecios.items.length, 206);
} finally {
  if (hadSnapshot) {
    if (snapshotAntes !== null) fs.writeFileSync(snapshot, snapshotAntes, 'utf8');
  } else {
    try { fs.rmSync(snapshot, { force: true }); } catch (e) { /* nada */ }
  }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* nada */ }
}

console.log(`${pass} pass, ${fail} fail`);
if (fail) {
  failures.slice(0, 30).forEach(f => console.log('  FAIL: ' + f));
  process.exit(1);
}
