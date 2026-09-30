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
  if (p + fa === 0) { sinAserciones.push(f); continue; }
  totalP += p; totalF += fa;
  filas.push({ f, p, fa });
}

for (const r of filas) {
  if (r.fa > 0) console.log('  FAIL ' + r.f + ': ' + r.fa);
}
console.log('archivos contados: ' + filas.length);
if (sinAserciones.length) {
  console.log('SIN ASERCIONES (no contados, revisar): ' + sinAserciones.join(', '));
}
console.log('TOTAL: ' + totalP + ' pass, ' + totalF + ' FAIL');
process.exit(totalF === 0 && sinAserciones.length === 0 ? 0 : 1);
