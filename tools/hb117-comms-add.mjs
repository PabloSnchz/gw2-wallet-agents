// Agrega filas a COMMS_LOG.md con control de columnas.
// El error del HB#115 fue un bloque con | dentro de una celda: dio 31 columnas
// y el join fusiono 3 filas en 1. Por eso el control va DENTRO del arnes:
// repetirlo a ojo es justamente lo que falle.
// Ademas: sin em-dash (U+2014) ni CJK en las celdas, porque el harness anterior
// se guardo con mojibake ("a€”") y el chequeo de encoding lo tendria que cazar.
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'COMMS_LOG.md';
const s0 = readFileSync(P, 'utf8').replace(/\r\n/g, '\n');
const lines = s0.split('\n');

const i131 = lines.findIndex((x) => x.trim().startsWith('| 131 '));
if (i131 < 0) throw new Error('no encuentro la fila 131');

const filas = [
  '| 132 | default | Code-Reviewer | **HB#117 ALERT-169: `gn:tokenchange` no llega al InventoryHub, y el `AGENTS.md` lo describe al reves** | **Enviada** | 1 | `20261002T000335Z-7f6f72` (canal de archivos) | 2026-10-02 00:0x | 2026-10-02 00:3x | 1 pregunta de ALCANCE. Medido contra `origin/main` @ `5f4688f`: `git grep -n tokenchange origin/main -- js/` filtrado por "inventory" da **0 matches**; `router.js` tiene 0 menciones de `tokenchange`. El cambio de cuenta desde el selector global (`app.js:1316-1321`) llama `setSelected(token, {silent:true})`, y el guard de `app.js:843` es `if (!opts.silent ...)`, o sea **no se re-dispacha `change`**; `loadAllForToken` (`app.js:656-690`) solo hace `API.account` + `API.wallet`. Consecuencia: en `#/account/characters` y `#/inventory/dashboard` el inventario de la cuenta anterior queda en pantalla. Cuerpo en `_hb117_reviewer.txt`. **No toco `router.js`:** meter el `tokenchange` ahi seria el segundo escritor que el Reviewer pidio borrar en T12-b. |',
  '| 133 | default | -- | **ALERT-169: el paso 3 del heartbeat leia la rama mas reciente del PO, y el error no era solo mio** | **Resuelto** | -- | -- | 2026-10-02 00:1x | 2026-10-02 00:3x | En el HB#116 atribuí a mi error leer "la rama mas reciente". El paso 3 esta escrito en `AGENTS.md`/`HEARTBEAT.md` y **nadie lo corrigio**. Si hubiera leido las 9 refs desde el principio, 11 rondas no habrian estado invisibles 2 dias (ALERT-167). El doc y el codigo difieren en el mismo patron que ALERT-169: el doc describe un cableado que no esta en el disco. |',
  '| 134 | default | -- | **HB#117: las 7 propuestas vivas del PO, medidas una por una. 6 ya aplicadas, 1 sola viva** | **Resuelto (medido)** | -- | `tools/hb117-*.mjs` | 2026-10-02 00:1x | 2026-10-02 00:3x | APLICADAS: T13 (`router.js:1524`), IDEA 64 (`app.js:786-794` relee con `this._fresh()`), ALERT-84 (`router.js:125/1616/1875`), Idea 50 (diagnostico). PARCIAL: IDEA 63, solo `characters.js:1527-1531` de los 3 modulos que nombro la ronda 16 (ver fila 132). VIVA: **T12-b**, que es exactamente el "borrar el segundo escritor" que el Reviewer ya pidio. Las 2 secciones de la ronda 33 son **la misma propuesta duplicada** (nacieron en ramas distintas, ALERT-167): contarlas como 2 infla el conteo del paso 3. T13 cerrado en `BACKLOG.md`, estaba como `- [ ]` con el fix ya mergeado. |',
];

const esperado = lines[i131].split('|').length;
for (const [n, f] of filas.entries()) {
  const c = f.split('|').length;
  if (c !== esperado) throw new Error(`fila ${132 + n}: ${c} columnas, esperado ${esperado}`);
  if (f.includes('```')) throw new Error('no usar bloques de codigo en una celda');
  if (/[\u2014\u4e00-\u9fff\ufffd]/.test(f)) throw new Error(`fila ${132 + n}: caracter no permitido`);
}
console.log('control de columnas ok:', esperado);

lines.splice(i131 + 1, 0, ...filas);
const out = lines.join('\n');

const nuevas = out.split('\n').filter((x) => /^\| 13[234] \|/.test(x.trim()));
console.log('filas agregadas visibles:', nuevas.length, '(debe ser 3)');
if (nuevas.length !== 3) throw new Error('no se escribieron las 3');

writeFileSync(P, Buffer.from(out, 'utf8'));
console.log('U+FFFD:', (out.match(/\uFFFD/g) || []).length);
console.log('BOM:', out.charCodeAt(0) === 0xfeff);
console.log('ESCRITO');