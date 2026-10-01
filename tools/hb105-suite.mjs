// HB#105 - runner de suite.
//
// Por que NO se parsea la linea de resumen como fuente unica: los tests del
// repo usan 5 formatos de linea de resumen distintos ("N pass / M FAIL",
// "N pass, M fail", "N aserciones, M FAIL", "N OK / M FAIL", "idea84: N pass,
// M FAIL"), asi que cualquier regex de resumen deja afuera a quien no
// matchea. Y "dejarlo afuera" NO es 0 FAIL: es un archivo cuyo veredicto
// NADIE mira. Medido en HB#105: un regex de un solo formato conto 18 de 49
// archivos y reporto "0 FAIL" mientras `tests/hb104-confirm-antes-de-escribir`
// tenia 1 FAIL real.
//
// Estrategia, por orden de preferencia:
//   1. lineas de asercion con prefijo (PASS / OK / ok / FAIL). Es lo que
//      tienen 46 de 49.
//   2. si el archivo no usa prefijos (idea84 usa "  · "), se cae al resumen
//      declarado.
//   3. la linea de RESUMEN se excluye del conteo de lineas: varias emiten
//      "OK - 12 pass, 0 FAIL", que empieza con OK y seria una asercion mas.
//   4. cuando existen las dos señales, se cruzan y una discrepancia se
//      reporta en vez de elegir una en silencio.
const fs = require('fs');
const { execSync } = require('child_process');

const RE_RESUMEN = /(\d+)\s+(?:pass|aserciones|OK)\s*[,/]?\s*(\d+)\s+FAIL/i;

const files = fs.readdirSync('tests').filter(f => f.endsWith('.test.js')).sort();
let P = 0, F = 0, ERR = 0;
const conFallo = [], sinVeredicto = [], incoherentes = [];

function correr(f) {
  let out = '', code = 0;
  try {
    out = execSync('node "tests/' + f + '"', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
    code = e.status || 1;
  }
  return { out, code };
}

// 48 de los 49 tests llaman `process.exit()`. Con stdout en PIPE las
// escrituras de process.stdout son asincronas y `process.exit()` NO las
// vacia, asi que la salida puede truncarse. Medido (HB#105):
// `alert86.censo-clasificacion` devolvio 0 aserciones bajo el runner y 12
// al correrlo a mano, y 12 al volver a correr el runner: la perdida es una
// CARRERA, no una caracteristica fija. Consecuencia: el numero de la suite
// no es reproducible, y un truncamiento a medias puede BAJAR el conteo de
// FAIL sin que el resumen declarado se entere. Por eso hay 2 defensas:
// el cruzamiento contra el resumen declarado (si no cuadra, el runner
// falla), y un reintento cuando no hay resumen que cruzar.
function correrEstable(f) {
  let r = correr(f);
  if (!RE_RESUMEN.test(r.out)) return r;      // sin resumen: no hay con que cruzar
  if (cua(r.out) === null) return r;         // resumen presente y completo
  return correr(f);                           // truncado: un reintento
}
function cua(out) {
  const m = out.match(RE_RESUMEN);
  if (!m) return null;
  const aserc = out.split(/\r?\n/).filter(l => !RE_RESUMEN.test(l));
  const p = aserc.filter(l => /^\s*(PASS|OK)\s/i.test(l)).length;
  const q = aserc.filter(l => /^\s*FAIL\b/.test(l)).length;
  if (p + q === 0) return { p: +m[1], q: +m[2] };  // sin prefijos: el resumen es la verdad
  return (+m[1] === p && +m[2] === q) ? { p, q } : null;  // null = no cuadra
}

for (const f of files) {
  const { out, code } = correrEstable(f);
  const lines = out.split(/\r?\n/);

  // (3) excluir las lineas que son resumen, no aserciones
  const aserc = lines.filter(l => !RE_RESUMEN.test(l));
  const p = aserc.filter(l => /^\s*(PASS|OK)\s/i.test(l)).length;
  const q = aserc.filter(l => /^\s*FAIL\b/.test(l)).length;

  // (2) fallback al resumen declarado
  const m = out.match(RE_RESUMEN);
  let P2 = p, F2 = q, via = 'lineas';
  if (p + q === 0 && m) { P2 = +m[1]; F2 = +m[2]; via = 'resumen'; }

  // (4) cruzar
  if (p + q > 0 && m && (+m[1] !== p || +m[2] !== q)) {
    incoherentes.push(f + ' (declara ' + m[1] + '/' + m[2] + ', lineas ' + p + '/' + q + ')');
  }

  if (p + q === 0 && !m) { sinVeredicto.push(f + ' [exit ' + code + ']'); ERR++; continue; }
  P += P2; F += F2;
  if (F2 > 0) conFallo.push(f + ' (' + F2 + ', via ' + via + ')');
}

console.log('archivos: ' + files.length + ' | pass: ' + P + ' | FAIL: ' + F + ' | sin veredicto: ' + ERR);
if (conFallo.length) { console.log('--- con FAIL:'); conFallo.forEach(x => console.log('  ' + x)); }
if (sinVeredicto.length) { console.log('--- SIN VEREDICTO:'); sinVeredicto.forEach(x => console.log('  ' + x)); }
if (incoherentes.length) { console.log('--- resumen que no cuadra con las lineas:'); incoherentes.forEach(x => console.log('  ' + x)); }
console.log(F === 0 && ERR === 0 && incoherentes.length === 0
  ? 'SUITE COMPLETA OK' : 'SUITE COMPLETA CON PROBLEMAS');
process.exit(F === 0 && ERR === 0 && incoherentes.length === 0 ? 0 : 1);
