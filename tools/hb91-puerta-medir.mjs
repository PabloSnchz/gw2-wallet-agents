// HB#91: la puerta de app.js:783/872 - ¿la key de 2 permisos sigue pasando?
//
// El PO (ronda 21/22) afirmo que la puerta acepta account+wallet. Midio la
// CONDICION extraida del fuente. Este script la vuelve a medir, pero por
// COMPORTAMIENTO: arma el gate real (REQUIRED_PERMISSIONS + el filter FALTAN
// tal cual esta escrito) y lo evalua con keys de distinta forma, incluida una
// que NO debe discriminating (control negativo).
//
// Regla que aplica: "no existe" / "ya esta arreglado" se prueba por las DOS
// formas - la cadena que uno espera y el efecto. Una puerta real discrimina:
// si dos casos dan el mismo veredicto, el arnes esta roto, no el codigo.
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

// --- 1. Extraer la tabla REAL, no una copia --------------------------------
const tabla = src.match(/REQUIRED_PERMISSIONS:\s*\[([\s\S]*?)\]/);
if (!tabla) { console.log('NO SE PUDO leer REQUIRED_PERMISSIONS'); process.exit(1); }
const REQUIRED_PERMISSIONS = eval('[' + tabla[1] + ']');

// --- 2. Extraer el filter REAL, no reescribirlo -----------------------------
const filtro = src.match(/const FALTAN = (KeyManager\.REQUIRED_PERMISSIONS\.filter\([^;]+;)/);
if (!filtro) { console.log('NO SE PUDO leer la linea FALTAN'); process.exit(1); }
const lineaFALTAN = filtro[1];
// La expresion real espera `perms` en el ambito donde vive: se evalua dentro
// de una funcion, no suelta, para no reescribir la condicion.
const EXPR = new Function('perms', 'REQUIRED_PERMISSIONS',
  'const KeyManager = { REQUIRED_PERMISSIONS };\n' +
  'return ' + lineaFALTAN.replace(/;$/, '') + ';');

console.log('CONDICION REAL EXTRAIDA (app.js)');
console.log('  ' + lineaFALTAN);
console.log('');

const casos = [
  ['key del PO: account + wallet', ['account', 'wallet']],
  ['key vacia (control DEBE rechazar)', []],
  ['los 7 de la app', REQUIRED_PERMISSIONS.map(p => p.scope)],
  ['los 7 + characters de mas (tolera)', [...REQUIRED_PERMISSIONS.map(p => p.scope), 'extra']],
];

for (const [nombre, permissions] of casos) {
  const info = { permissions };
  const perms = new Set(info.permissions || []);
  const FALTAN = EXPR(perms, REQUIRED_PERMISSIONS);
  const veredicto = FALTAN.length ? 'RECHAZA' : 'ACEPTA';
  console.log(`  ${nombre.padEnd(38)} -> ${veredicto}` +
    (FALTAN.length ? '  (' + FALTAN.length + ' faltan)' : ''));
}

const r2 = EXPR(new Set(['account', 'wallet']), REQUIRED_PERMISSIONS).length > 0;
console.log('');
console.log(r2
  ? 'VEREDICTO: la puerta RECHAZA la key de 2 permisos. El hallazgo del PO NO esta en el codigo.'
  : 'VEREDICTO: la puerta ACEPTA la key de 2 permisos. El hallazgo del PO sigue vivo.');