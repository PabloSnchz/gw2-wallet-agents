// Agregador de suite. NO mantiene lista de archivos: recorre tests/*.test.js.
//
// REGLA (ALERT-61,Endpoints): NO parsear un numero de resumen del formato de
// salida, porque cada test imprime uno distinto ("pass: N | FAIL: M",
// "N pass, M FAIL", "N OK / M FAIL"). La primera version de este runner hacia
// eso y reporto 456 cuando la suite real tiene mas: 8 archivos quedaron sin
// contar y parecian estar en verde. Se cuenta la cantidad de LINEAS DE
// ASERCION, que es la unica señal comparable entre test files.
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

const dir = path.join(__dirname, '..', 'tests');
let totalP = 0, totalF = 0;
const filas = [];
const sinAserciones = [];
const porResumen = [];

// Fallback para archivos que NO imprimen una linea de veredicto por asercion
// (estilo "titulos"): para esos, el resumen es la UNICA senal disponible.
//
// ALERT-61 prohibia parsear un numero de resumen como fuente UNIVERSAL, y esa
// regla se mantiene: la linea por asercion sigue siendo la fuente principal y
// gana siempre que exista. Lo que se corrige aqui es el otro extremo, que era
// peor: un archivo sin lineas por asercion se clasificaba como "SIN
// ASERCIONES" y se DROPEABA del total en silencio, entertaining 77 aserciones
// de 2 archivos y un "0 INDETERMINADOS" falso en el reporte.
//
// Los titulos NO sirven como proxy: alert86 imprime 4 titulos y afirma 31
// aserciones. Contarlos daria 4. Por eso el fallback es el resumen, y queda
// MARCADO en `porResumen` para que el total declare cuantos archivos lo usaron
// y la cifra sea auditable en vez de opaca.
const RESUMEN = [
  /(\d+)\s*aserciones?,?\s*(\d+)\s*FAIL/i,               // "N aserciones, M FAIL"
  /^\s*(?:TODO\s+)?(?:OK:\s*)?(\d+)\s*(?:OK|pass)\s*(?:\/\s*|,)\s*(\d+)\s*FAIL/i,
  /^\s*pass:\s*(\d+)\s*\|\s*FAIL:\s*(\d+)/i,             // "pass: N | FAIL: M"
  // Sin ancla al inicio: algunos runners prefijan el nombre del archivo
  // ("idea84-leyenda-pipeline: 46 pass, 0 FAIL"). Exige el token FAIL, que un
  // titulo de asercion no trae, asi que el match flojo no amplija el riesgo.
  /(\d+)\s*(?:OK|pass)\s*(?:\/\s*|,)\s*(\d+)\s*FAIL/i,
];

function resumenDe(lineas) {
  // Se mira solo el final del archivo: el resumen se imprime al terminar.
  for (let i = lineas.length - 1; i >= 0 && i >= lineas.length - 6; i--) {
    for (const re of RESUMEN) {
      const m = lineas[i].trim().match(re);
      if (m) return { p: +m[1], fa: +m[2] };
    }
  }
  return null;
}

for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.test.js')).sort()) {
  let out = '';
  try {
    out = execFileSync('node', [path.join(dir, f)], { encoding: 'utf8', timeout: 180000 });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
  }
  const lineas = out.split(/\r?\n/);
  let p = 0, fa = 0;
  for (const L of lineas) {
    const t = L.trim();
    // Una linea que arranca con el veredicto de una asercion. Case-insensitive
    // porque no todos los runners usan mayuscula ("ok  ..." vs "OK   ...").
    // Los separadores ("====", "----", "[1] titulo") no matchean.
    if (/^(OK|PASS)\b/i.test(t)) p++;
    else if (/^FAIL\b/i.test(t)) { fa++; }
  }
  // Un archivo que no reporto ninguna asercion NO esta en verde: esta sin correr.
  // Pero "no emitio linea por asercion" NO es lo mismo que "no corrio": los
  // archivos estilo "titulos" no emiten esa linea y si corrieron. Antes de
  // declararlo sin correr se prueba el resumen; si tampoco lo hay, recien ahi
  // es un archivo silencioso de verdad.
  if (p + fa === 0) {
    const r = resumenDe(lineas);
    if (r && r.p + r.fa > 0) {
      p = r.p; fa = r.fa;
      porResumen.push({ f, p, fa });
    } else {
      sinAserciones.push(f);
      continue;
    }
  }
  totalP += p; totalF += fa;
  filas.push({ f, p, fa });
}

for (const r of filas) {
  if (r.fa > 0) console.log('  FAIL ' + r.f + ': ' + r.fa);
}
console.log('archivos contados: ' + filas.length);
if (porResumen.length) {
  // Se declara cuantos archivos se contaron por resumen y cuantos aportaron.
  // Un total sin esto es opaco: no se puede saber que parte del numero salio
  // de la senal comparable y que parte del fallback.
  const aporta = porResumen.reduce((a, r) => a + r.p + r.fa, 0);
  console.log('por resumen (estilo titulos, sin linea por asercion): ' +
    porResumen.length + ' archivos, ' + aporta + ' aserciones -> ' +
    porResumen.map(r => r.f + ' (' + r.p + ')').join(', '));
}
if (sinAserciones.length) {
  console.log('SIN ASERCIONES (no contados, revisar): ' + sinAserciones.join(', '));
}
console.log('TOTAL: ' + totalP + ' pass, ' + totalF + ' FAIL');
process.exit(totalF === 0 && sinAserciones.length === 0 ? 0 : 1);
