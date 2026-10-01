// hb73 mutation: prove the idea61 census CAN fail (red phase for P2).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const JS = path.join(ROOT, 'js');
const T = path.join(ROOT, 'tests/idea61-claves-confeladas.test.js'.replace('confeladas', 'congeladas'));

const VICTIMA = path.join(JS, 'wv-shop-ui.js');
const ORIGINAL = fs.readFileSync(VICTIMA, 'utf8');
const salida = () => {
  try { return execFileSync(process.execPath, [T], { encoding: 'utf8', cwd: ROOT }); }
  catch (e) { return (e.stdout || '') + (e.stderr || ''); }
};
const lineaCenso = o => {
  const m = o.match(/PASS {2}al menos (\d+) modulos/);
  return m ? 'PASS(' + m[1] + ')' : 'FAIL';
};

console.log('BASE                        : ' + lineaCenso(salida()));

// How does wv-shop-ui read it? Index the RAW lines: the stripped text has a
// DIFFERENT line numbering (a /* */ block collapses to one space), so finding
// the match in the stripped copy and then editing the raw array mutates the
// wrong line and the census does not move. That happened on the first run.
const RE = /getItem\(\s*(LS_KEYS|'gw2_keys')/;
const lineas = ORIGINAL.split('\n');
const hits = [];
lineas.forEach((l, i) => { if (RE.test(l.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' '))) hits.push(i); });
console.log('wv-shop-ui reads it at raw line(s): ' + hits.map(i => i + 1).join(', ') +
            '  (occurrences: ' + hits.length + ')');
hits.forEach(i => console.log('  ' + (i + 1) + ': ' + lineas[i].trim().slice(0, 100)));

if (hits.length > 0) {
  const guardadas = hits.map(i => lineas[i]);
  // M1: el modulo deja de leer a pelo -> el censo debe BAJAR a 3 y FALLAR.
  // OJO: hay que mutar TODAS las ocurrencias del modulo. El censo cuenta
  // MODULOS, no ocurrencias, y con una sola cambiada wv-shop-ui seguia
  // matcheando por la otra: el piso se queda en 4 y la mutacion no se ve.
  const copia = lineas.slice();
  hits.forEach(i => {
    copia[i] = copia[i].replace(/getItem\(\s*(LS_KEYS|'gw2_keys')/,
                               'Storage.get(Storage.STORAGE_KEYS.ACCOUNT_KEYS)');
  });
  console.log('  mutadas ' + hits.length + ' ocurrencias; alguna sigue matcheando: ' +
              copia.some(l => RE.test(l.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' '))));
  fs.writeFileSync(VICTIMA, copia.join('\n'), 'utf8');
  console.log('M1 (lee por Storage)        : ' + lineaCenso(salida()) +
              '   <-- el piso de 4 tiene que ver la baja');
  fs.writeFileSync(VICTIMA, ORIGINAL, 'utf8');
  console.log('restaurado byte a byte      : ' + (fs.readFileSync(VICTIMA, 'utf8') === ORIGINAL));
  console.log('FINAL                       : ' + lineaCenso(salida()));
} else {
  console.log('ABORT: no occurrences found');
}