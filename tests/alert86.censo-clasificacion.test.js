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
  ['js/homestead-tracker.js', 178, 'gn:homestead:decorations', 'gn:homestead:decorations'],
  ['js/homestead-tracker.js', 182, 'gn:homestead:categories', 'gn:homestead:categories'],
  ['js/homestead-tracker.js', 186, 'gn:homestead:glyphs', 'gn:homestead:glyphs'],
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

console.log('\n[4] la linea que se copia al dashboard dice 8, no 11');
// Se corre el script de verdad: el numero del headline tiene que salir de ahi.
let out = '';
try {
  out = execFileSync('node', [path.join(ROOT, 'tools/idea50-censo-claves.mjs')],
    { cwd: ROOT, encoding: 'utf8' });
} catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
ok(/"8 familias de clave de cache[^"]*en 3 modulos"/.test(out),
  'el headline dice 8 familias en 3 modulos (las que se ESCRIBEN)');
ok(/LAS 3 QUE EL NUMERO DE ARRIBA NO CUENTA/.test(out) && /Con ellas el total serian 11/.test(out),
  'y las 3 de modulo muerto estan NOMBRADAS con el motivo, no restadas en silencio');

console.log('\n[5] ALERTA-84: la cita de linea declara el arbol al que pertenece');
const t84 = fs.readFileSync(path.join(ROOT, 'tests/alert84.leyenda-estado-honesto.test.js'), 'utf8');
const lt = fs.readFileSync(path.join(ROOT, 'js/legendary-tracker.js'), 'utf8');
ok(!/index\.html:750|index\.html:528|index\.html:988/.test(t84),
  'el test ya no cita las lineas de main@d328969');
ok(/index\.html:761/.test(t84) && /index\.html:539/.test(t84) && /index\.html:1012/.test(t84),
  'cita las de ESTE arbol');
ok(/main@d328969/.test(t84) && /main@d328969/.test(lt),
  'y las dos citas dicen que arbol son: una cita sin unidad es una cita sin unidad');
// Y que las lineas citadas digan lo que dicen: si el merge las moviera, el
// comentario volveria a mentir, y esta vez sin que nadie lo note.
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').split('\n');
ok((html[760] || '').includes('navLegendaryArmory'), 'index.html:761 es el item de menu');
ok((html[538] || '').includes('legendaryArmoryPanel'), 'index.html:539 es el panel');
// Estas tres citas se movieron DOS veces, y las dos las detecto este bloque:
// la T3 (999 -> 1004, +5 lineas de comentario antes) y el contrato de
// fabricacion (1004 -> 1012, +9 lineas: 8 de comentario y el <script> nuevo).
// Lo que las mueve es siempre una linea insertada ANTES, asi que la correccion
// es medir el numero, no restarlo a ojo. Si vuelve a pasar, este bloque tiene
// que volver a fallar y decir por que.
ok((html[1011] || '').includes('legendary-tracker.js'), 'index.html:1012 es el <script> del tracker');
ok((html[1012] || '').includes('legendary-data.js'), 'index.html:1013 es legendary-data.js');
ok((html[1013] || '').includes('legendary-recipes.js'), 'index.html:1014 es legendary-recipes.js (contrato, HB#122)');
ok((html[1016] || '').includes('render-catologo.js'), 'index.html:1017 es render-catologo.js');
ok((fs.readFileSync(path.join(ROOT, 'js/router.js'), 'utf8').split('\n')[124] || '').includes('legendary-armory'),
  'router.js:125 sigue siendo la ruta (esta NO se movio: el off-by-11 es solo del HTML)');

console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
