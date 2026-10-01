// Probe: measure the Reviewer's P1/P2/P3/P4 claims against the real files.
// ASCII only. Diagnostic, deleted after the cycle.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JS = path.join(ROOT, 'js');

function sinComentarios(codigo) {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

// Does the stripper delete REAL code? A line is dangerous when the '//'
// lands inside a single-line string literal and real code follows it.
function borraCodigoReal(linea) {
  const i = linea.indexOf('//');
  if (i < 0) return false;
  const antes = linea.slice(0, i);
  const n = (antes.match(/'/g) || []).length +
            (antes.match(/"/g) || []).length +
            (antes.match(/`/g) || []).length;
  // Odd total count of quotes means the LAST quote seen was an opening one:
  // we are INSIDE a string literal when the '//' shows up.
  const dentroDeLiteral = n % 2 === 1;
  return dentroDeLiteral && linea.slice(i).trim().length > 0;
}

console.log('=== P1: files in js/ where the stripper deletes real code ===');
const jsFiles = fs.readdirSync(JS).filter(f => f.endsWith('.js'));
let bomba = 0;
const conBomba = [];
for (const f of jsFiles) {
  const lineas = fs.readFileSync(path.join(JS, f), 'utf8').split('\n');
  let n = 0;
  for (const L of lineas) if (borraCodigoReal(L)) n++;
  if (n > 0) { conBomba.push(f + ' (' + n + ')'); bomba++; }
}
console.log('files with >=1 dangerous line: ' + bomba + ' of ' + jsFiles.length);
conBomba.sort().forEach(s => console.log('  ' + s));

console.log('');
console.log('=== P1: is the case present in accounts-panel.js TODAY? ===');
const apRaw = fs.readFileSync(path.join(JS, 'accounts-panel.js'), 'utf8');
apRaw.split('\n').forEach((L, i) => {
  if (borraCodigoReal(L)) console.log('  line ' + (i + 1) + ': ' + L.trim().slice(0, 95));
});
const apStrip = sinComentarios(apRaw);
console.log('  raw length   : ' + apRaw.length);
console.log('  strip length : ' + apStrip.length);
console.log('  raw has https://api.guildwars2.com/v2/account/home/nodes : ' +
            apRaw.includes('/v2/account/home/nodes'));
console.log('  STRIP has it (proof code was deleted) : ' +
            apStrip.includes('/v2/account/home/nodes'));

console.log('');
console.log('=== P2: the idea61 census, by text vs by code ===');
const lectores = ['app.js', 'accounts-panel.js', 'inventory-dashboard.js',
                  'wv-objectives-dashboard.js', 'wv-purchase-detail.js',
                  'wv-shop-ui.js'];
const RE = /getItem\(\s*(LS_KEYS|'gw2_keys')/;
const porTexto = [], porCodigo = [];
for (const f of lectores) {
  const src = fs.readFileSync(path.join(JS, f), 'utf8');
  if (RE.test(src)) porTexto.push(f);
  if (RE.test(sinComentarios(src))) porCodigo.push(f);
}
console.log('  by text (' + porTexto.length + '): ' + porTexto.join(', '));
console.log('  by code (' + porCodigo.length + '): ' + porCodigo.join(', '));
console.log('  only in text (phantom): ' +
            porTexto.filter(f => porCodigo.indexOf(f) < 0).join(', '));

console.log('');
console.log('=== P4: CONFIG.STORAGE_KEYS_KEYS occurrences in js/ ===');
let nKeysKeys = 0;
for (const f of jsFiles) {
  const src = fs.readFileSync(path.join(JS, f), 'utf8');
  const n = (src.match(/STORAGE_KEYS_KEYS/g) || []).length;
  if (n) { console.log('  ' + f + ': ' + n); nKeysKeys += n; }
}
console.log('  TOTAL in js/: ' + nKeysKeys);

console.log('');
console.log('=== P3: ok(true, ...) asserts that cannot fail ===');
const TS = path.join(ROOT, 'tests');
for (const f of fs.readdirSync(TS).filter(f => f.endsWith('.test.js'))) {
  const src = fs.readFileSync(path.join(TS, f), 'utf8');
  const hits = src.split('\n').map((L, i) => ({ n: i + 1, L }))
    .filter(o => /ok\(\s*true\s*,/.test(o.L));
  if (hits.length) {
    console.log('  ' + f);
    hits.forEach(o => console.log('    line ' + o.n + ': ' + o.L.trim().slice(0, 80)));
  }
}