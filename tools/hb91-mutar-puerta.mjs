// HB#91: mutacion de la puerta, para la fase roja del assert de la seccion 6.
//
// Borra los 5 permisos NO estructurales de REQUIRED_PERMISSIONS, dejando
// account + wallet. La FORMA del codigo queda intacta (`FALTAN` sigue
// derivando de `KeyManager.REQUIRED_PERMISSIONS.filter`), o sea que es
// exactamente la clase de mutacion que las secciones 1 y 2 no pueden ver:
// el codigo sigue "correcto" para el analisis estatico y cambia de conducta.
//
// Uso:  node tools/hb91-mutar-puerta.mjs <archivo>
import fs from 'node:fs';

const p = process.argv[2] || 'js/app.js';
const NO_ESTRUCTURALES = ['progression', 'unlocks', 'inventories', 'tradingpost', 'characters'];

let src = fs.readFileSync(p, 'utf8');
let quitados = 0;
for (const s of NO_ESTRUCTURALES) {
  // `[ \t]*` y NO `\s*`: en modo 'm', `\s` incluye \n, asi que el cuantificador
  // puede comerse lineas de arriba y borrar permisos que no eran el objetivo.
  // (Primer intento del mutador: se llevo tambien account y wallet, y la
  // puerta quedo vacia en vez de laxa.)
  const re = new RegExp("^[ \\t]*\\{ scope: '" + s + "',[^\\n]*\\n", 'm');
  const antes = src;
  src = src.replace(re, '');
  if (src !== antes) quitados++;
}
if (quitados === 0) { console.error('MUTACION NO APLICADA: la puerta ya no tiene esos permisos'); process.exit(1); }
fs.writeFileSync(p, src, 'utf8');
console.log('mutado: quitados ' + quitados + ' de ' + NO_ESTRUCTURALES.length + ' permisos');