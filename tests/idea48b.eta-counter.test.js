/**
 * Idea 48, Tramo B: el contador "Cargando cuentas... N/27" dice cuanto falta.
 *
 * Contexto. El PO (heartbeat_48.md) medico que con POOL_MAX=6 y 27 cuentas la
 * primera pantalla del Dashboard Cartera tarda 16.4 s, y que en esos 16 s la
 * UI solo decia "Cargando cuentas... 4/27": un contador que avanza a saltos sin
 * decir si eso es normal o si la app se colgo.
 *
 * Lo que este test NO es: una prueba de que la cuenta atrasada da bien. La ETA
 * se MIDE sobre cuentas completadas por segundo en la corrida actual. Lo que
 * se verifica es lo que hace que un numero con formato de dato real no mienta:
 *
 *   1. computeEta NO devuelve nada antes de tener muestra suficiente
 *      (< ETA_MIN_DONE cuentas, o < ETA_MIN_MS de elapsed). Sin esto, una ETA
 *      calculada con 1 cuenta es ruido con apariencia de precision — el mismo
 *      modo de falla que la rotacion de fractales y /v2/events.
 *   2. Con muestra suficiente, la cuenta es la correcta:
 *      ms = (elapsed / done) * (total - done).
 *   3. Redondea hacia ARRIBA a segundos: un "~11 s" que son 11.4 y terminan en 12
 *      promete menos de lo que cumple.
 *   4. fmtEta: segundos hasta 60, despues minutos. Un "~0 s" o un "~-3 s"
 *      serian el equivalente aritmetico de la rotacion inventada.
 *   5. El mensaje NO lleva ETA cuando no hay muestra (no un "~0 s" Placeholder).
 *   6. El buster de index.html coincide con el header del archivo (regla de
 *      ALERT-24: el buster se bumpea en el MISMO commit que el contenido).
 *
 * Seccion [1]: ESTATICA sobre el archivo real del disco.
 * Seccion [2]: EJECUCION real de computeEta/fmtEta, extraidas del archivo.
 * No copia el codigo ni los thresholds.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WD = fs.readFileSync(path.join(ROOT, 'js', 'wallet-dashboard.js'), 'utf-8');
const INDEX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  OK   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  ->  ' + extra : '')); }
}
function section(t) { console.log('\n' + t); }

/** Cuerpo de una function nombrada, por conteo de llaves. */
function bodyOf(src, fnName) {
  const start = src.indexOf('function ' + fnName + '(');
  if (start < 0) return null;
  let i = src.indexOf('{', start), depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  return null;
}

section('[1] ESTATICA — la ETA existe y esta Measured, no estimada');

ok('computeEta existe', bodyOf(WD, 'computeEta') !== null);
ok('fmtEta existe', bodyOf(WD, 'fmtEta') !== null);
ok('la ETA se muestra en el mensaje de progreso',
  /msg \+= ' — ' \+ fmtEta\(/.test(bodyOf(WD, 'updateProgressStatus') || ''));
ok('la ETA NO se paints si computeEta devuelve null (sin placeholder "~0 s")',
  /if \(eta\) msg \+= /.test(bodyOf(WD, 'updateProgressStatus') || ''));
ok('el progreso guarda startedAt para poder medir elapsed',
  /startedAt: nowMs\(\)/.test(WD));
ok('la ETA se mide sobre cuentas, no sobre poolStats (no hay multiplicacion por requests)',
  !/poolStats/.test(bodyOf(WD, 'computeEta') || ''),
  'computeEta no debe depender del pool: el pool no sabe cuantas cuentas faltan');
ok('los thresholds son constantes con nombre, no numeros magicos en la cuenta',
  /var ETA_MIN_DONE = \d+;/.test(WD) && /var ETA_MIN_MS = \d+;/.test(WD));

section('[2] ESTATICA — el texto "limitado por la API" NO se implemento (y por que)');

// La Idea 46 t2 imaginaba un texto "limitado por la API (600/min)". Con
// POOL_MAX=6 y hasta 3 cuentas en vuelo la cola no esta vacia practicamente
// todo el recorrido: el texto estaria el 100% del tiempo y no informaria.
// La ETA ya contesta la pregunta. Si alguien lo agrega, este test lo marca.
ok('no se agregó el texto "limitado por la API" al contador',
  !/limitado por la API/.test(bodyOf(WD, 'updateProgressStatus') || ''),
  'con POOL_MAX=6 la cola nunca se vacia: el texto seria ruido, no informacion');

section('[3] ESTATICA — buster coherente con el header (ALERT-24)');

const wdHeader = (WD.match(/Versión: (\d+\.\d+\.\d+)/) || [])[1];
const wdBuster = (INDEX.match(/wallet-dashboard\.js\?v=(\d+\.\d+\.\d+)/) || [])[1];
ok('el archivo declara una version', !!wdHeader, 'no se encontro "Versión: x.y.z"');
ok('index.html sirve la MISMA version que el header declara',
  wdHeader && wdHeader === wdBuster,
  `header=${wdHeader} buster=${wdBuster}`);

section('[4] EJECUCION — computeEta con el reloj controlado');

const MIN_DONE = parseInt((WD.match(/var ETA_MIN_DONE = (\d+)/) || [])[1], 10);
const MIN_MS = parseInt((WD.match(/var ETA_MIN_MS = (\d+)/) || [])[1], 10);
const computeEta = new Function(
  'ETA_MIN_DONE', 'ETA_MIN_MS',
  bodyOf(WD, 'computeEta') + '; return computeEta;'
)(MIN_DONE, MIN_MS);
const fmtEta = new Function(bodyOf(WD, 'fmtEta') + '; return fmtEta;')();

ok('los thresholds se leyeron del archivo', MIN_DONE > 0 && MIN_MS > 0,
  `ETA_MIN_DONE=${MIN_DONE} ETA_MIN_MS=${MIN_MS}`);

// --- el caso que motiva el cambio -------------------------------------
// 4 cuentas de 27 en 16.4 s de recorrido. Con 4 hechas y 3 s elapsed:
//   3 s / 4 = 750 ms por cuenta; quedan 23 -> ~17.25 s.
{
  const e = computeEta(0, 4, 27, 3000);
  ok('con muestra suficiente devuelve ETA', e !== null);
  ok('la cuenta es (elapsed/done) * (total-done)',
    e && Math.abs(e.ms - 750 * 23) < 1,
    e ? `ms=${e.ms} esperado=${750 * 23}` : 'devolvio null');
  ok('redondea a segundos hacia arriba', e && e.secs === 18, e ? `secs=${e.secs}` : '');
}

// --- la honestidad: NO inventar el numero antes de tener muestra -------
ok('con 0 cuentas no hay ETA (no "~0 s")', computeEta(0, 0, 27, 5000) === null);
ok('con 1 cuenta no hay ETA: el promedio sale de UNA muestra',
  computeEta(0, 1, 27, 5000) === null,
  'esta es la asercion que evita el numero inventado');
ok('con 2 cuentas no hay ETA', computeEta(0, 2, 27, 5000) === null);

{
  // 3 cuentas es el umbral. Con elapsed por debajo del minimo, tampoco.
  const below = computeEta(0, MIN_DONE, 27, MIN_MS - 1);
  ok('con done suficiente pero elapsed insuficiente no hay ETA',
    below === null, `elapsed=${MIN_MS - 1} (min=${MIN_MS})`);
  const at = computeEta(0, MIN_DONE, 27, MIN_MS);
  ok('en el umbral exacto SI hay ETA (no off-by-one)',
    at !== null, 'el umbral es inclusivo');
}

// --- casos degenerados: NaN, negativo, todo hecho ---------------------
ok('si ya termino (done>=total) no hay ETA', computeEta(0, 27, 27, 30000) === null);
ok('total=0 no hay ETA', computeEta(0, 5, 0, 3000) === null);
ok('elapsed negativo (reloj que no avanza) no produce ETA infinita',
  computeEta(10000, 5, 27, 5000) === null,
  'sin este guard, ms seria negativo y fmtEta imprimiria "~-3 s"');
ok('startedAt ausente/0 con elapsed enorme no rompe', typeof computeEta(0, 5, 27, 1e12) !== 'undefined');

// --- fmtEta ------------------------------------------------------------
ok('fmtEta(1) = "~1 s"', fmtEta(1) === '~1 s', 'obtenido: ' + fmtEta(1));
ok('fmtEta(59) = "~59 s"', fmtEta(59) === '~59 s', 'obtenido: ' + fmtEta(59));
ok('fmtEta(60) cambia a minutos', fmtEta(60) === '~1 min', 'obtenido: ' + fmtEta(60));
ok('fmtEta(125) = "~3 min" (redondea hacia arriba)',
  fmtEta(125) === '~3 min', 'obtenido: ' + fmtEta(125));
ok('fmtEta nunca imprime "~0 s"', fmtEta(0.2) !== '~0 s', 'obtenido: ' + fmtEta(0.2));

// --- consistencia ETA <-> texto: lo que se muestra es lo que se calcula -
{
  const e = computeEta(0, 4, 27, 3000);
  ok('el texto que se pintaria es el de la ETA calculada',
    e && fmtEta(e.secs) === '~18 s', e ? 'obtenido: ' + fmtEta(e.secs) : '');
}

console.log(`\n${pass} OK / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
