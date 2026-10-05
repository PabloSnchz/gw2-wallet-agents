/*!
 * tools/idea50-censo-claves.mjs
 *
 * CENSURA CON UNIDAD. El PO (ronda 17) pidio una linea para el dashboard y
 * la condicion que puso es que lleve UNIDAD: "lineas != claves != bytes".
 * Ese numero cambio 3 veces en un dia (13 -> 7 -> 8) y las tres veces por lo
 * mismo. Este script es el que produce la linea, y declara en que unidad
 * cuenta y sobre que universo.
 *
 * UNIVERSO: los `localStorage.setItem` de `js/*.js` que NO son de la capa de
 * API (`api-gw2.js`) ni del WV (`wizards-vault.js`, que SI esta registrado
 * desde el P3 via `root.__cacheBaseProviders`).
 *
 * CLASIFICACION: no sale de `setItem`. Sale de que REPRESENTA la clave:
 *   - `*_CACHE_KEY` / `cached:` / `_cache_v1`  -> CACHE (liberable y recomputable)
 *   - el resto                                  -> DATO de usuario
 * Lo que este script NO puede hacer es decidir si una clave de cache "deberia"
 * estar en el registro: eso es una DECISION, no un hecho.
 *
 * Ejecutar: node tools/idea50-censo-claves.mjs   (desde la raiz del repo)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const JS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'js');
const CAPA = new Set(['api-gw2.js', 'wizards-vault.js']);   // los dos ya registrados

// Archivos cuya escritura NO es una clave de cache sino la capa que mueve keys.
// No se excluyen en silencio: se declaran CON el motivo, y salen en su propia
// linea. Un modulo que se borra del `Set` tiene que cambiar el motivo, no
// desaparecer del conteo.
const CAPA_DECLARADA = {
  'storage.js': 'la capa de clave: escribe la legacy y su espejo `gn:` del nombre que le pasa el llamador (MIGRATION_PREFIXES / MIRROR_MAP). No decide el nombre de la clave, asi que un censo por nombre no puede incluirla.',
  'wv-season-storage.js': 'la persistencia oficial de temporada (`wv:season:`), que `CACHE_PRESERVE_PREFIX` protege del borrado. Es DATO, no cache, por definicion del modulo.'
};

// Criterio de "esto es cache". Se declara aca a proposito: un criterio que sale
// del `setItem` seria el criterio equivocado (misma confusion que en la Idea 57
// T3: dos cosas indistinguibles en la representacion pero no en el sentido).
//
// Se matchea el VALOR resuelto de la clave, no el nombre de la constante: una
// vez mas, las dos cosas se ven distintas en el codigo y son la misma. Los dos
// renglones son el mismo criterio aplicado a las dos formas de escribirlo.
const CACHE_PATRON = [
  // por NOMBRE de la constante (se evaluan sobre el valor, asi que estos dos
  // renglones solo funcionan si el valor conserva la palabra: ver los de abajo)
  /_CACHE_KEY/,
  /:cached/,           // characters:cached:<hash>
  /_cache_v1/,         // gw2_currencies_cache_v1
  // por VALOR de la clave, que es lo que queda despues de resolver
  /^characters:(maps|pois|prof_icons|race_icons)/,
  /^psna:schedule$/,
  /^gn_activities_stones_/   // lleva la semana adentro: 27 x 52 al ano (49D)
];

// META de cache: el marcador que dice "esto que hay en disco es de hace X",
// sin el payload. Ocupa ~10 bytes y no crece con cuentas ni con semanas, asi
// que contarlo como "cache que falta liberar" infla el numero. Se cuenta
// aparte para que la diferencia con el censo del PO (que lohomologyo en su 8)
// sea VISIBLE y con nombre, en vez de ser un 9 contra un 8 sin explicacion.
const META_PATRON = [
  /lastUpdate$/,        // psna:lastUpdate (activities.js:607)
  /^gn_activities_stones_.*last/i
];

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

const files = fs.readdirSync(JS).filter(f => f.endsWith('.js')).sort();

// ── Constantes de CONFIG y `const X = '...'` de todo el repo ───────────────
const CONSTS = {};
for (const file of files) {
  const src = fs.readFileSync(path.join(JS, file), 'utf8');
  const re = /(?:([A-Z_]+)\s*:\s*|(?:const|var|let)\s+([A-Z_]+)\s*=\s*)'([^']+)'/g;
  let m;
  while ((m = re.exec(src))) {
    const nom = m[1] || m[2];
    if (!nom) continue;
    if (CONSTS[nom] && CONSTS[nom] !== m[3]) CONSTS[nom] = '<AMBIGUO:' + nom + '>';
    else CONSTS[nom] = m[3];
  }
}

const SRC = {};
function srcDe(file) { return SRC[file] || (SRC[file] = fs.readFileSync(path.join(JS, file), 'utf8')); }

// Devuelve la FAMILIA de la clave: el primer segmento de la concatenacion.
// `CONFIG.CHARACTERS_CACHE_KEY + ':' + hashToken16(token)` es la familia
// `characters:cached` (una clave por token, 27 en la cuenta de Pablo), y eso
// es lo que hay que reportar: la unidad es FAMILIA de clave, no escritura.
function resolverFamilia(clave, file) {
  if (!clave) return null;
  const c = clave.trim();
  if (/^'/.test(c)) { const m = /^'(.+?)'/.exec(c); return m ? m[1] : null; }
  const src = srcDe(file);
  // TEMPLATE LITERAL: la clave se arma con `` `gn_activities_stones_${h}_${w}` ``.
  // Lo que importa para "familias" es el PREFIJO hasta la primera `${`: lo que
  // hay entre corchetes es el sufijo variable (el hash del token, la semana).
  const tmpl = /`([^`$]+)/.exec(c);
  if (tmpl && tmpl[1]) return tmpl[1];
  // primer segmento de una concatenacion: lo que va antes del primer `+`
  const primero = c.split('+')[0].trim();
  for (const cand of [primero, c, c.split('.').pop()]) {
    if (!cand) continue;
    const nom = cand.split('.').pop();
    const propio = new RegExp("(?:CONFIG\\.)?\\b" + escapeRe(nom) + "\\s*[:=]\\s*'([^']+)'").exec(src);
    if (propio) return propio[1];
    if (CONSTS[nom]) return CONSTS[nom];
  }
  return null;
}

// ── El censo ──────────────────────────────────────────────────────────────
const filas = [];
for (const file of files) {
  if (CAPA.has(file)) continue;
  const lineas = fs.readFileSync(path.join(JS, file), 'utf8').split('\n');
  lineas.forEach((line, i) => {
    const m = line.match(/localStorage\.setItem\(\s*([A-Za-z_$.]+|'[^']*')/);
    if (!m) return;
    const expr = m[1];
    // RESOLUCION LOCAL: `setItem(cacheKey, ...)` (characters.js:578) no lleva
    // CONFIG adentro, y `const LS_CURR = 'x'` no es `A: 'x'`. Sin esto el
    // script cuenta 5 donde hay 8: un numero que depende de que el grep sea
    // bueno no es un dato (ALERT-78).
    let clave = expr;
    if (!/^'/.test(clave)) {
      const nom = clave.split('.').pop();
      for (let j = i - 1; j >= Math.max(0, i - 25); j--) {
        const def = lineas[j].match(new RegExp('(?:var|let|const)\\s+' + escapeRe(nom) + '\\s*=\\s*([^;]+)'));
        if (def) { clave = def[1].trim(); break; }
      }
      // `const key = getStoneStorageKey(token)` (activities.js:439): la clave la
      // decide una FUNCION. Se sigue su cuerpo y se toma el template literal que
      // devuelve. Es una regla acotada y explicita — seguir el grafo entero de
      // funciones seria inventar un interprete; con una capa mas hay que
      // escribir la regla a mano, y queda a la vista cuando pasa.
      const call = /^([A-Za-z_$][\w$]*)\s*\(/.exec(clave);
      if (call) {
        const fbody = srcDe(file).match(new RegExp('function\\s+' + escapeRe(call[1]) + '\\s*\\([^)]*\\)\\s*\\{[\\s\\S]{0,600}?\\n\\s{2,}\\}'));
        if (fbody) {
          const lit = /`([^`$]+)/.exec(fbody[0]);
          if (lit) clave = '`' + lit[1];
        }
      }
    }
    const r = resolverFamilia(clave, file);
    if (!r) {
      const cap = CAPA_DECLARADA[file];
      filas.push({ archivo: file, linea: i + 1, expr, clase: cap ? 'CAPA' : 'NO_RESUELTA', motivo: cap });
      return;
    }
    const esCache = CACHE_PATRON.some(p => p.test(r));
    const esMeta = META_PATRON.some(p => p.test(r));
    // SEGUNDO CRITERIO, por FORMA (ALERT-86). El de arriba decide por el NOMBRE
    // de la clave, y hay cache cuyo nombre no dice "cache": las 3 de
    // `homestead-tracker.js` son `gn:homestead:decorations|categories|glyphs` y
    // se escriben como `{ts, data}` — la misma forma que la capa de API. Un
    // nombre asi no matchea ningun patron y caia en DATO, o sea: contadas como
    // dato de usuario y PROTEGIDAS por una frase que el boton no dice. El
    // Reviewer (H3) y este script midieron 11 familias; la diferencia eran
    // exactamente estas 3. Los dos criterios se ORDEAN: por forma no se declara
    // cache, porque `JSON.stringify(data.schedule)` tambien es un objeto.
    const ventana = lineas.slice(i, i + 6).join('\n');
    const formaCache = /JSON\.stringify\(\s*\{[^}]*\bts\s*:/.test(ventana);
    filas.push({ archivo: file, linea: i + 1, expr, clave: r,
      clase: esCache ? 'CACHE' : esMeta ? 'META' : formaCache ? 'CACHE_POR_FORMA' : 'DATO' });
  });
}

// `CACHE_POR_FORMA` cuenta con las de `CACHE`: un filtro que se queda solo con
// la clase exacta hace DESAPARECER un numero del titulo sin que ningun assert
// lo note. Por eso el filtro es `startsWith('CACHE')` y no `=== 'CACHE'`.
const caches = filas.filter(f => f.clase.startsWith('CACHE'));
const soloPorForma = filas.filter(f => f.clase === 'CACHE_POR_FORMA');
const metas = filas.filter(f => f.clase === 'META');
const datos = filas.filter(f => f.clase === 'DATO');
const capas = filas.filter(f => f.clase === 'CAPA');
const sinResolver = filas.filter(f => f.clase === 'NO_RESUELTA');
const modulos = [...new Set(caches.map(f => f.archivo))].sort();

// ── Salida ────────────────────────────────────────────────────────────────
console.log('CENSURA — escrituras a localStorage FUERA de la capa de API y del WV');
console.log('universo: js/*.js salvo ' + [...CAPA].join(', ') + '  (ambos ya registrados)');
console.log('');
// El conteo por FAMILIA se calcula ANTES del primer `console.log` que lo cita:
// `unicas` es un `const` y usarlo antes de su declaracion revienta con TDZ
// (ya paso una vez en este archivo: el encabezado y la lista eran dos cifras
// distintas porque el titulo leia el campo equivocado, no porque faltara nada).
const vistos = new Map();
for (const f of caches) vistos.set(f.clave, (vistos.get(f.clave) || 0) + 1);
const unicas = vistos.size;

console.log('CACHE (liberable y recomputable): ' + unicas + ' FAMILIAS en ' +
  modulos.length + ' modulos');
for (const [k, n] of [...vistos].sort()) {
  console.log('  ' + (n > 1 ? '[x' + n + ' call sites, 1 familia] ' : '') + k);
}
console.log('');
console.log('  CHECK: ' + caches.length + ' filas (call sites), ' + unicas +
  ' familias unicas. El numero del titulo es el de FAMILIAS: dos call sites');
console.log('         que escriben la misma clave son una clave, no dos.');
if (soloPorForma.length) {
  console.log('');
  console.log('  ' + soloPorForma.length + ' de esas familias NO se reconocen por el');
  console.log('  NOMBRE de la clave (ALERT-86: se perdian por clasificar solo por nombre):');
  for (const f of soloPorForma) {
    console.log('    ' + f.clave + '   (' + f.archivo + ':' + f.linea + ')');
  }
}
console.log('');
console.log('META de cache (el marcador de frescura, ~10 B, no crece): ' + metas.length);
metas.forEach(f => console.log('  ' + f.clave + '   (' + f.archivo + ':' + f.linea + ')'));
console.log('');
console.log('DATO de usuario (se conserva a proposito): ' + datos.length + ' escrituras');
const modDato = [...new Set(datos.map(f => f.archivo))].sort();
console.log('  en ' + modDato.length + ' modulos: ' + modDato.join(', '));
console.log('');
if (capas.length) {
  console.log('CAPA DE CLAVES (el nombre lo decide el llamador, no el archivo): ' +
    capas.length + ' escrituras');
  for (const [f, mot] of Object.entries(CAPA_DECLARADA)) {
    const n = capas.filter(c => c.archivo === f).length;
    if (n) console.log('  ' + f + ' (' + n + ' escrituras): ' + mot);
  }
  console.log('');
}
if (sinResolver.length) {
  console.log('!! SIN RESOLVER: ' + sinResolver.length +
    ' escrituras cuya clave no se pudo resolver. NO se contaron ni arriba ni abajo:');
  sinResolver.forEach(f => console.log('     ' + f.archivo + ':' + f.linea + '  ' + f.expr));
  console.log('   Un numero que excluye lo que no supo leer no es un total.');
  console.log('');
}
// ALERT-86: de las 11 que salen, 3 estan en un modulo que `index.html` NO
// carga. Cache de codigo muerto no ocupa disco HOY, asi que contarlo sin
// decirlo hace que el headline prometa mas de lo que hay. El headline usa las
// que se ESCRIBEN; las de modulo muerto se nombran aparte, con el motivo.
const html = fs.readFileSync(path.join(JS, '..', 'index.html'), 'utf8');
const muertos = soloPorForma.filter(f => !html.includes(f.archivo));
const escritas = unicas - muertos.length;
const modulosEscritos = [...new Set(caches.filter(f => !muertos.includes(f)).map(f => f.archivo))].sort();

console.log('PARA EL DASHBOARD (una linea, con unidad):');
console.log('  "' + escritas + ' familias de clave de cache escritas fuera del registro de ' +
  'cacheClear, en ' + modulosEscritos.length + ' modulos"' +
  (sinResolver.length ? '   [INCOMPLETO: ' + sinResolver.length + ' sin resolver]' : ''));
console.log('  (+ ' + metas.length + ' marcador(es) de frescura, ~10 B, no crece con cuentas)');
if (muertos.length) {
  console.log('');
  console.log('  LAS ' + muertos.length + ' QUE EL NUMERO DE ARRIBA NO CUENTA' +
    (muertos.length ? ', y por que:' : ': ninguna.'));
  for (const f of muertos) console.log('    ' + f.clave + '   (' + f.archivo + ':' + f.linea + ')');
  console.log('    Cache de codigo MUERTO: `index.html` no carga ' + [...new Set(muertos.map(f => f.archivo))].join(', ') +
    ', asi que');
  console.log('    la clave no ocupa disco hoy. No se la resta por poco: se la nombra,');
  console.log('    porque el dia que ese modulo se cargue aparecen +' + muertos.length +
    ' sin que nadie mire este script. Con ellas el total serian ' + unicas + '.');
} else {
  console.log('');
  console.log('    El numero de arriba cuenta las ' + escritas + ' familias de los ' +
    modulosEscritos.length + ' modulos que `index.html` carga. Con ellas el total serian ' +
    unicas + '.');
  console.log('    (HB#199: cuando `homestead-tracker.js` paso a cargarse desde');
  console.log('    `index.html`, las 3 familias de homestead dejaron de ser cache de');
  console.log('    codigo MUERTO y el total subio de 8 a ' + unicas + '. Este bloque solo');
  console.log('    hablaba cuando habia alguna, asi que el salto no lo nombraba nadie.)');
}
console.log('');
console.log('  SI el numero difiere de otro censo, la diferencia TIENE NOMBRE.');
console.log('  El del PO (8) sumo el marcador de frescura como clave de cache, y conto');
console.log('  los 2 call sites de `gw2_currencies_cache_v1` como 2 claves. Este separa');
console.log('  las dos cosas: mismo universo, distinta unidad. Por eso el titulo dice');
console.log('  "familias" y no "claves" ni "lineas".');
console.log('');
console.log('LO QUE ESTE SCRIPT NO DICE, y por que importa:');
console.log('  - No dice el TAMAÑO de esas claves. Es el unico numero que decide si');
console.log('    "Liberar la cache de la API" es cierto, y no se puede medir desde aca:');
console.log('    depende de la cuenta de Pablo. Por eso el boton ahora lo DICE solo');
console.log('    (`keptBytes`), y es el numero que Pablo ve el que decide el titulo.');
console.log('  - No dice si una clave de cache DEBERIA estar en el registro. Es una');
console.log('    decision, y por eso no se automatiza ni se promete en el copy.');