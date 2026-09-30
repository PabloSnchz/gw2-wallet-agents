/*!
 * tests/idea52.raid-encounter-ids.test.js
 *
 * Idea 52 (PO, heartbeat 06:30 UTC 2026-09-30): 5 de los 30 encuentros de
 * js/raid-tracker.js no existen en la API. Medido hoy de forma independiente
 * por el Principal: 30 encuentros en el codigo contra 30 eventos reales en
 * GET /v2/raids?ids=all, 25 coinciden, 5 no existen, 5 eventos reales no
 * estan cableados.
 *
 * MECANISMO DEL BUG, y por que este test no necesita un token:
 *
 *     state.completedEncounters = GW2Api.getAccountRaids(token)  // array plano
 *     var completedSet = new Set(completedEncounters);          // :1392
 *     var isCompleted = completedSet.has(enc.id);                // :1438
 *
 * `/v2/account/raids` devuelve un array plano de STRINGS con el id del
 * encuentro. Si `enc.id` no es byte a byte ese string, la comparacion falla
 * para siempre: la tarjeta nunca se marca, el ala queda trabada en N-1/N, el
 * KPI no lo dice y no hay error ni warning. Un tracker que miente en silencio.
 *
 * DATO QUE CORRIGE AL PO (y que el test deja escrito a proposito):
 * los ids de evento NO son resolubles uno por uno contra /v2/raids.
 *
 *     GET /v2/raids?ids=gorseval -> 404 "all ids provided are invalid"
 *
 * Solo existen dentro de `?ids=all`, y la forma real es raid.wings[].events[],
 * no raid.events[]. Por eso este test usa un snapshot embebido y corre sin red.
 *
 * Ejecutar: node tests/idea52.raid-encounter-ids.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function eq(a, b, msg) { ok(a === b, msg + '   [obtenido: ' + JSON.stringify(a) + ']'); }

// ---------------------------------------------------------------------------
// Catalogo real, medido 2026-09-30 con GET /v2/raids?ids=all.
// Frozen a proposito: el test tiene que ser determinista y sin red.
// ---------------------------------------------------------------------------
const CAT = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'fixtures', 'raids-catalogo-2026-09-30.json'), 'utf8'));

const API = new Map();
for (const raid of CAT.raids) {
  for (const wing of raid.wings) {
    for (const ev of wing.events) {
      API.set(ev.id, { type: ev.type, raid: raid.id, wing: wing.id });
    }
  }
}

const SRC = path.join(ROOT, 'js', 'raid-tracker.js');
const code = fs.readFileSync(SRC, 'utf8');

// ---------------------------------------------------------------------------
// Extraer una tabla por nombre del fuente real, sin copiar una linea de codigo
// ---------------------------------------------------------------------------
function table(name) {
  const start = code.indexOf('var ' + name + ' =');
  if (start < 0) return null;
  const open = code.indexOf('[', start) < code.indexOf('{', start)
    ? Math.min(code.indexOf('[', start), code.indexOf('{', start))
    : code.indexOf('{', start);
  // Soporta las dos formas del proyecto: WINGS es un array, REWARDS_DATA y
  // RAD_DETAIL son objetos. Se balancea el delimitador de apertura encontrado.
  const ch = code[open];
  const close = ch === '[' ? ']' : '}';
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === ch) depth++;
    else if (code[i] === close) { depth--; if (depth === 0) return code.slice(open, i + 1); }
  }
  return null;
}
function loadTable(name) {
  const src = table(name);
  if (!src) return null;
  return vm.runInNewContext('(' + src + ')');
}

// ---------------------------------------------------------------------------
console.log('\n--- 1. Todo encuentro del modulo tiene que existir en la API ---');
const WINGS = loadTable('WINGS');
ok(!!WINGS, 'WINGS se lee del archivo real');
if (!WINGS) { console.log('\n' + pass + ' pass / ' + fail + ' FAIL'); process.exit(1); }

const ALL = [];
for (const w of WINGS) for (const e of w.encounters) ALL.push(Object.assign({ _wingName: w.nameEn }, e));

eq(ALL.length, 30, 'el modulo declara 30 encuentros (el total no cambia con este fix)');
eq(API.size, 30, 'el catalogo de la API tiene 30 eventos');
eq(WINGS.length, 9, 'el modulo declara 9 alas');

const ghosts = ALL.filter(e => !API.has(e.id));

// vloxx NO se corrige en este fix: es el ala del CM de Sept 29 (Nexus of
// Eternity) y el catalogo no la expone. Arreglarlo es una decision de producto
// (borrar el ala, o esperar a que GW2 la publique), no un fix de dato. Queda
// como fantasma CONOCIDO y el test falla si la lista CRECE: la excepcion es
// explicita y no se puede extender sola.
const FANTASMA_CONOCIDO = {
  vloxx: 'decision de producto pendiente: /v2/raids no expone el ala Nexus of Eternity',
};
const nuevos = ghosts.filter(e => !(e.id in FANTASMA_CONOCIDO));
eq(nuevos.length, 0, 'ningun encuentro es un id que la API no conoce' +
  (nuevos.length ? '   -> FANTASMAS NUEVOS: ' + nuevos.map(g => g.id + ' (' + g.nameEn + ')').join(', ') : ''));
eq(ghosts.length, Object.keys(FANTASMA_CONOCIDO).length,
   'la lista de fantasmas es la allowlist y solo la allowlist (' +
   ghosts.map(g => g.id).join(', ') + ')');

// ALERT-89. La direccion INVERSA. Todo lo de arriba mira "app -> API": que
// cada encuentro del modulo exista en el catalogo. La otra mitad del invariante
// es "API -> app": que no haya un evento de la API que el modulo no declare, y
// ESO NO ESTABA VIGILADO. Consecuencia medida, no temida: el suite puede estar
// en verde con `ALL.length === 30` y `API.size === 30` mientras un id esta
// equivocado en cada lado. Los dos errores se CANCELAN en la cuenta, asi que la
// asercion que "cuenta los encounters" no los ve: cuenta los dos lados.
//
// La constante `ALL.length === 30` de arriba es justamente la que hace esto
// parecer seguro. Es una asercion que pasa por construccion.
const FALTANTE_CONOCIDO = {
  // El catalogo de la API declara `camp` (Checkpoint, mount_balrior) y el modulo
  // no lo tiene. NO se agrega el encuentro porque el fixture congelado trae solo
  // `{id, type}`: sin `name` oficial habria que inventar el nombre y el icono, y
  // un hallazgo con datos inventados es peor que un hueco declarado. Es el mismo
  // criterio de ALERT-84: cambiar el ESTADO que la app dice de si misma, no
  // rellenar el hueco con una suposicion. Se cierra cuando el catalogo traiga el
  // nombre real; la lista es la allowlist, asi que cualquier OTRO faltante nuevo
  // falla igual que un fantasma nuevo.
  camp: 'hueco de datos: el fixture no trae el name oficial, no se inventa',
};
const faltantes = Array.from(API.keys()).filter(id => !ALL.some(e => e.id === id));
eq(faltantes.length, Object.keys(FALTANTE_CONOCIDO).length,
   'la lista de faltantes es la allowlist y solo la allowlist (faltan: ' +
   (faltantes.join(', ') || 'ninguno') + ')');

console.log('\n--- 2. Los 4 ids corregidos existen y caen en el ala correcta ---');
// La correspondencia se prueba por ALA, no por nombre: "Siege the Stronghold" y
// "escort" no se parecen, pero los dos son el unico evento del wing
// stronghold_of_the_faithful, que es el ala 3 del modulo.
const ESPERADOS = {
  escort:            'stronghold_of_the_faithful',
  soulless_horror:   'hall_of_chains',
  voice_in_the_void: 'hall_of_chains',
  gate:              'the_key_of_ahdashim',
};
for (const id of Object.keys(ESPERADOS)) {
  const real = API.get(id);
  ok(!!real, 'la API tiene el id "' + id + '"' + (real ? ' (' + real.type + ')' : ''));
  if (real) eq(real.wing, ESPERADOS[id], '  "' + id + '" esta en el wing ' + ESPERADOS[id]);
}
{
  const presentes = ALL.filter(e => ESPERADOS[e.id]).length;
  eq(presentes, 4, 'los 4 ids corregidos estan en WINGS');
  // y cada uno en el ala que el modulo le asigna
  const enAla = WINGS.filter(w => w.encounters.some(e => ESPERADOS[e.id])).map(w => w.nameEn);
  eq(enAla.join(' | '), 'Stronghold of the Faithful | Hall of Chains | The Key of Ahdashim',
     'las 3 alas afectadas se llaman por su nombre en ingles en el catalogo');
}

console.log('\n--- 3. vloxx:Decision de producto, no fix de dato ---');
ok(!API.has('vloxx'), 'vloxx NO esta en el catalogo de la API (medido, no supuesto)');
ok(ALL.some(e => e.id === 'vloxx'), 'vloxx sigue en WINGS: el ala del CM de Sept 29 se deja intacta a proposito');
ok(!/["']vloxx["']\s*:/.test(code), 'vloxx no tiene claves de datos: no hay huerfanas que limpiar');

console.log('\n--- 4. Coherencia interna entre encounters y tablas por id ---');
for (const tabla of ['REWARDS_DATA', 'BOSS_DETAILS']) {
  const t = loadTable(tabla);
  ok(!!t, tabla + ' se lee del archivo real');
  if (!t) continue;
  const huerfanas = Object.keys(t).filter(k => !ALL.some(e => e.id === k));
  eq(huerfanas.length, 0, tabla + ': toda clave corresponde a un encuentro real (huerfanas: ' +
    (huerfanas.join(', ') || 'ninguna') + ')');
}
{
  // Requisito real, no "todos": un checkpoint no tiene drops. Solo los jefes
  // tienen que llegar a las dos tablas. Dos excepciones, y ninguna es un bug
  // de id: vloxx es el ala del CM que /v2/raids no expone, y Statues of
  // Grenth es jefe de verdad pero la tabla nunca le puso drops (hueco de
  // datos, a rellenar por quien quiera, no en este fix).
  const SIN_DATOS = {
    vloxx: 'decision de producto pendiente',
    statues_of_grenth: 'hueco de datos: es jefe y no tiene drops en la tabla',
  };
  for (const tabla of ['REWARDS_DATA', 'BOSS_DETAILS']) {
    const t = loadTable(tabla);
    const jefes = ALL.filter(e => e.type === 'jefe');
    const sinTabla = jefes.filter(e => !t[e.id] && !(e.id in SIN_DATOS)).map(e => e.id);
    eq(sinTabla.length, 0, 'todo jefe tiene ' + tabla + ' (faltan: ' + (sinTabla.join(', ') || 'ninguno') + ')');
  }
  // Y el caso del PO: los checkpoints NO tienen que tener drops.
  const t = loadTable('REWARDS_DATA');
  const ckpt = ALL.filter(e => e.type === 'evento' && !t[e.id]).map(e => e.id);
  ok(ckpt.length > 0, 'los checkpoints/eventos sin drops son lo esperado (' + ckpt.length + '), no un bug');
}

console.log('\n--- 5. Los ids corregidos no colisionan con los que ya funcionaban ---');
{
  const dups = {};
  for (const e of ALL) dups[e.id] = (dups[e.id] || 0) + 1;
  const repetidos = Object.keys(dups).filter(k => dups[k] > 1);
  eq(repetidos.length, 0, 'ningun id de encounter esta duplicado (repetidos: ' + (repetidos.join(', ') || 'ninguno') + ')');
}

// ---------------------------------------------------------------------------
console.log('\n--- 6. Ninguna clave repetida DENTRO de una tabla ---');
// El hole exacto por donde paso el bug del 1.10.0: vm.runInNewContext colapsa
// las claves repetidas de un object literal sin avisar, asi que loadTable()
// NUNCA puede ver una duplicada. Y la seccion 4 tampoco la ve, porque "ura" si
// es un encuentro real: la huerfana y la buena tienen el mismo nombre. Hay que
// mirar el TEXTO de la tabla, no el objeto que produce.
function clavesEnOrden(src) {
  // El texto empieza en '{'. Se avanza caracter a caracteres saltando los
  // strings, y se anotan los ':' que caen con depth == 1 (primer nivel).
  const claves = [];
  let depth = 0, i = 0, inStr = false;
  while (i < src.length) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') { i += 2; continue; }
      if (c === '"') inStr = false;
      i++; continue;
    }
    if (c === '"') { inStr = true; i++; continue; }
    if (c === '{' || c === '[') { depth++; i++; continue; }
    if (c === '}' || c === ']') { depth--; i++; continue; }
    if (c === ':' && depth === 1) {
      // retroceder hasta la comilla de cierre de esta clave
      let j = i - 1;
      while (j >= 0 && /\s/.test(src[j])) j--;
      if (src[j] === '"') {
        let k = j - 1, buf = '';
        while (k >= 0 && src[k] !== '"') { if (src[k] !== '\\') buf = src[k] + buf; k--; }
        claves.push(buf);
      }
      i++; continue;
    }
    i++;
  }
  return claves;
}
for (const tabla of ['REWARDS_DATA', 'BOSS_DETAILS']) {
  const src = table(tabla);
  if (!src) continue;
  const claves = clavesEnOrden(src);
  const vistas = {}, repetidas = [];
  for (const k of claves) {
    if (vistas[k]) repetidas.push(k + ' (x' + (vistas[k] + 1) + ')');
    vistas[k] = (vistas[k] || 0) + 1;
  }
  eq(repetidas.length, 0, tabla + ': ninguna clave repetida (repetidas: ' +
    (repetidas.join(', ') || 'ninguna') + ')');
  // Y la que gana es la ultima, asi que el bloque que realmente se ve es el
  // que hay que leer. Para "ura" eso significa "Ura, la Aulladora de Vapores":
  // el 1.10.0 dejo DOS bloques "ura" y ganaba el segundo, asi que borrar el
  // huerfano no puede cambiar lo que el usuario ve.
  const pos = claves.lastIndexOf('ura');
  ok(pos >= 0, tabla + ': "ura" existe una sola vez');
  if (tabla === 'BOSS_DETAILS' && pos >= 0) {
    const idx = src.indexOf('"ura":');
    ok(idx >= 0 && /Aulladora/.test(src.slice(idx, idx + 400)),
       'la ficha de "ura" que gana es la de "Ura, la Aulladora de Vapores", no la de "Guardián Ura"');
    ok(!/Guardián Ura/.test(src), 'no queda el bloque huerfano "Guardián Ura"');
    const img = /image:\s*"([^"]+)"/.exec(src.slice(idx, idx + 900));
    ok(!!img && fs.existsSync(path.join(ROOT, img[1].replace(/\//g, path.sep))),
       'la imagen de la ficha de Ura existe en disco (' + (img ? img[1] : 'sin image') + ')');
  }
}

console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
