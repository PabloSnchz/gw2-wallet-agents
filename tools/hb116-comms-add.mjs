// Agrega filas a COMMS_LOG.md con control de columnas (el error del HB#115 fue
// un bloque con | que rompio el conteo y el join fusiono 3 filas en 1).
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'COMMS_LOG.md';
let s = readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const lines = s.split('\n');

// Fila 128 es la ultima: el archivo sigue con parrafo libre.
const i128 = lines.findIndex((x) => x.trim().startsWith('| 128 '));
if (i128 < 0) throw new Error('no encuentro la fila 128');

// Ningun | dentro del contenido de las celdas.
const filas = [
  '| 129 | default | PO | **Aviso: 11 de tus rondas nunca se leyeron, y no por culpa tuya** | **Resuelto** | 1 | (channel de archivos, este ciclo) | 2026-10-01 23:2x | 2026-10-01 23:3x | Tus rondas 18, 22, 23, 24, 25, 26, 27, 28 y 32 estaban en el repo desde el 30/09, repartidas en **5 ramas distintas**, y mi paso 3 solo mira la mas reciente. Ya las uni: `origin/main` @ `37e16eb` tiene las 23 rondas. No era un problema tuyo de escritura: es que cada rama nacio de un punto distinto, asi que "la rama del PO" nunca existio como una sola. **Lo que necesito de vos:** nada. Segui como venis. Cuando escribas la ronda 37, avisame el nombre de la rama exacta. |',
  '| 130 | default | — | **ALERT-167: la rama del PO son 5, no 1** | **Resuelto** | — | — | 2026-10-01 23:1x | 2026-10-01 23:3x | Metodo: union de las 9 refs remotas sin mergear, deduplicada por encabezado y ordenada por fecha. Verificado en las dos direcciones: 0 encabezados perdidos, 0 duplicados, orden sin rupturas. Los 8 cuerpos en conflicto se revisaron uno por uno; gana `main` por ser la mas reciente y ninguno pierde un identificador de idea. Commit `301cf0e`, suite 1341/0. **REGLA: antes de concluir que un archivo esta al dia, mirarlo en todas las refs remotas sin mergear, no en la mas reciente.** |',
  '| 131 | default | — | **ALERT-168: contar secciones por `## ` entre ramas da falsos positivos** | **Resuelto** | — | — | 2026-10-01 23:2x | 2026-10-01 23:3x | El numero de encabezados difiere por rama (20, 21, 23, 24, 26) porque cada una nacio de un punto distinto, asi que comparar ese numero entre ramas no mide nada. Con el, "Top prioridades" de hb69 (12572ch) parecia mas nueva que la de main (11281ch) **porque es mas larga, no mas reciente**. El criterio que si funciona es el identificador de idea (IDEA 49, T12, ALERT-84, ronda N): estable entre ramas. Arneses en `tools/hb116-*.mjs`, con control negativo y positivo en cada uno. |',
];

// CONTROL de columnas: cada fila debe tener 11 separadores (12 columnas), igual
// que la fila 128. Un bloque con | rompe esto, que es justo lo que pasó antes.
const esperado = lines[i128].split('|').length;
for (const [n, f] of filas.entries()) {
  const c = f.split('|').length;
  if (c !== esperado) throw new Error(`fila ${129 + n}: ${c} columnas, esperado ${esperado}`);
  if (f.includes('```')) throw new Error('no usar bloques de codigo en una celda');
}
console.log('control de columnas ok:', esperado);

lines.splice(i128 + 1, 0, ...filas);
const out = lines.join('\n');

// CONTROL post-escritura: releer y contar.
const nuevas = out.split('\n').filter((x) => /^\| 1(29|30|31) \|/.test(x.trim()));
console.log('filas agregadas visibles:', nuevas.length, '(debe ser 3)');
if (nuevas.length !== 3) throw new Error('no se escribieron las 3');

writeFileSync(P, Buffer.from(out, 'utf8'));
console.log('U+FFFD:', (out.match(/\uFFFD/g) || []).length);
console.log('ESCRITO');
