// ALERT-86: el censo (tools/idea50-censo-claves.mjs) clasifica cada clave que
// escribe FUERA del registro de cacheClear. Este archivo mira la MISMA pregunta
// por el otro camino — la FORMA de lo que se escribe — y exige que las dos
// cifras coincidan, o que la diferencia este NOMBRADA.
//
// Por que una comprobacion y no un numero fijo: un `eq(n, 8)` fijo pasa aunque
// el criterio se rompa al reves (y rompe ALERT-78: un numero sin alcance). Lo
// que ata el criterio a la realidad es que los DOS caminos tienen que ver lo
// mismo, y que toda diferencia se nombre en vez de desaparecer.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : (fail++, console.log('  FAIL: ' + m)); };

// ── 1. El criterio por FORMA, resuelto a mano y declarado ───────────────────
// No se importa el criterio del script: si se importara, el test compararia el
// script consigo mismo y no detectaria que los DOS se equivocaron juntos.
const FORMA = [
  // [archivo, linea, clave, familia]  — verificado con findstr sobre js/*.js
  ['js/characters.js', 287, 'characters:maps', 'characters:maps'],
  ['js/characters.js', 311, 'characters:pois', 'characters:pois'],
  ['js/characters.js', 388, 'characters:race_icons', 'characters:race_icons'],
  // HB#199 (rescate del Homestead): el fix de glifos (18ef9a4) inserto 46 lineas
  // de normalizacion ANTES de la seccion 4, asi que las tres escrituras bajaron de
  // 178/182/186 a 227/231/235. NUMERO MEDIDO con findstr sobre el archivo, no
  // restado a ojo — que es literalmente lo que el bloque [5] exige.
  ['js/homestead-tracker.js', 227, 'gn:homestead:decorations', 'gn:homestead:decorations'],
  ['js/homestead-tracker.js', 231, 'gn:homestead:categories', 'gn:homestead:categories'],
  ['js/homestead-tracker.js', 235, 'gn:homestead:glyphs', 'gn:homestead:glyphs'],
];

console.log('\n[1] cada clave con forma {ts,data} se escribe donde este test dice');
for (const [arch, linea, clave] of FORMA) {
  const src = fs.readFileSync(path.join(ROOT, arch), 'utf8').split('\n');
  const l = src[linea - 1] || '';
  ok(l.includes('localStorage.setItem'), arch + ':' + linea + ' escribe con setItem');
  ok(new RegExp(escapeRe(clave.split(':')[0])).test(l) || l.includes('CONFIG.'),
    arch + ':' + linea + ' escribe la clave de cache (' + clave + ')');
}

console.log('\n[2] el hetmo de cache que el nombre NO delata (el que se perdia)');
const hom = fs.readFileSync(path.join(ROOT, 'js/homestead-tracker.js'), 'utf8');
for (const k of ['gn:homestead:decorations', 'gn:homestead:categories', 'gn:homestead:glyphs']) {
  ok(hom.includes(k), 'la clave existe en el codigo: ' + k);
}
ok(!/_CACHE_KEY|:cached|_cache_v1/.test('gn:homestead:decorations'),
  'y su NOMBRE no matchea ningun patron del criterio viejo: por eso se perdia');
ok(/JSON\.stringify\(\s*\{[^}]*ts:/.test(hom),
  'pero la FORMA es {ts,data}: la misma que la capa de API, o sea que ES cache');

console.log('\n[3] el script declara el criterio por forma, no solo por nombre');
const sc = fs.readFileSync(path.join(ROOT, 'tools/idea50-censo-claves.mjs'), 'utf8');
ok(/CACHE_POR_FORMA/.test(sc), 'el script nombra la clase que el nombre no alcanza');
ok(/startsWith\('CACHE'\)/.test(sc),
  'y el filtro de salida la INCLUYE: un filtro con === la haria desaparecer del titulo sin asercion');
ok(/html\.includes\(f\.archivo\)/.test(sc),
  'y separa las familias de modulo MUERTO, que no ocupan disco hoy');

console.log('\n[4] la linea que se copia al dashboard dice 11, no 14');
// Se corre el script de verdad: el numero del headline tiene que salir de ahi.
// HB#199: el numero SUBIO de 8/3 a 11/4, y la razon tiene nombre. Las tres
// familias de homestead YA figuraban en el censo como "modulo muerto" (por eso
// el titulo viejo era 8 con "3 mas" que el numero de arriba no contaba, y el
// total con ellas era 11). El rescate las volvio MODULO VIVO: index.html lo
// carga. Mismo 11, otra unidad de donde sale. Por eso este bloque verifica que
// el salto este NOMBRADO y no que el numero sea el de antes.
let out = '';
try {
  out = execFileSync('node', [path.join(ROOT, 'tools/idea50-censo-claves.mjs')],
    { cwd: ROOT, encoding: 'utf8' });
} catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
ok(/"11 familias de clave de cache[^"]*en 4 modulos"/.test(out),
  'el headline dice 11 familias en 4 modulos (las que se ESCRIBEN)');
ok(/3 de esas familias NO se reconocen por el/.test(out)
  && /gn:homestead:decorations/.test(out)
  && /Con ellas el total serian 11/.test(out),
  'y el salto 8 -> 11 esta NOMBRADO con su causa: homestead paso de modulo muerto a vivo');

console.log('\n[5] ALERTA-84: la cita de linea declara el arbol al que pertenece');
const t84 = fs.readFileSync(path.join(ROOT, 'tests/alert84.leyenda-estado-honesto.test.js'), 'utf8');
const lt = fs.readFileSync(path.join(ROOT, 'js/legendary-tracker.js'), 'utf8');
ok(!/index\.html:750|index\.html:528|index\.html:988/.test(t84),
  'el test ya no cita las lineas de main@d328969');
ok(/index\.html:779/.test(t84) && /index\.html:539/.test(t84) && /index\.html:1047/.test(t84),
  'cita las de ESTE arbol');
ok(/main@d328969/.test(t84) && /main@d328969/.test(lt),
  'y las dos citas dicen que arbol son: una cita sin unidad es una cita sin unidad');
// Y que las lineas citadas digan lo que dicen: si el merge las moviera, el
// comentario volveria a mentir, y esta vez sin que nadie lo note.
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').split('\n');
// HB#199 (rescate del Homestead): el <section id="homesteadPanel"> entra en
// L539 y el item de menu en L779. Los dos quedan ANTES del bloque de scripts,
// asi que lo desplazan +18 y +35 respectivamente. El panel de la Armeria
// (L539) NO se movio: el de homestead se inserta despues. NUMEROS MEDIDOS con
// findstr sobre el archivo, no restados a ojo.
ok((html[778] || '').includes('navLegendaryArmory'), 'index.html:779 es el item de menu');
ok((html[538] || '').includes('legendaryArmoryPanel'), 'index.html:539 es el panel');
ok((html[1046] || '').includes('legendary-tracker.js'), 'index.html:1047 es el <script> del tracker');
ok((html[1047] || '').includes('legendary-data.js'), 'index.html:1048 es legendary-data.js');
ok((html[1048] || '').includes('legendary-recipes.js'), 'index.html:1049 es legendary-recipes.js (contrato, HB#122)');
ok((html[1051] || '').includes('render-catologo.js'), 'index.html:1052 es render-catologo.js');
ok((fs.readFileSync(path.join(ROOT, 'js/router.js'), 'utf8').split('\n')[124] || '').includes('legendary-armory'),
  'router.js:125 sigue siendo la ruta (esta NO se movio: el off-by-35 es solo del HTML)');

console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
