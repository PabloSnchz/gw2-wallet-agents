// Confirm the M2 chain: one brace in prose -> extractor swallows the next
// function -> the URL line at 832 enters the watched body -> guard1 also fires.
const fs = require('fs');
const path = require('path');
const AP = path.join(__dirname, '..', 'js/accounts-panel.js');

const ORIGINAL = fs.readFileSync(AP, 'utf8');
function cuerpoDeMetodo(b, ini) {
  let depth = 0, visto = false;
  for (let i = ini; i < b.length; i++) {
    const c = b[i];
    if (c === '{') { depth++; visto = true; }
    else if (c === '}') { depth--; if (visto && depth === 0) return b.slice(ini, i + 1); }
  }
  return b.slice(ini);
}
function medir(src) {
  const i = src.indexOf('function syncAccountTagsToKeys');
  const RAW = i >= 0 ? cuerpoDeMetodo(src, i) : '';
  const lineas = RAW.split('\n');
  return {
    i, len: RAW.length, lineas: lineas.length,
    incluyeUrl: RAW.includes('/v2/account/home/nodes'),
    defineOtra: RAW.includes('function otra'),
    cola: lineas.slice(-3).map(s => s.trim().slice(0, 70)),
  };
}
const ancla = "      var keys = Storage.get(Storage.STORAGE_KEYS.ACCOUNT_KEYS) || [];";
console.log('BASE :', JSON.stringify(medir(ORIGINAL), null, 1));

const m2 = ancla + "\n      // ejemplo en prosa: { esto abre una llave y el extractor la cuenta";
fs.writeFileSync(AP, ORIGINAL.replace(ancla, m2), 'utf8');
console.log('M2   :', JSON.stringify(medir(fs.readFileSync(AP, 'utf8')), null, 1));
fs.writeFileSync(AP, ORIGINAL, 'utf8');
console.log('restaurado byte a byte: ' + (fs.readFileSync(AP, 'utf8') === ORIGINAL));