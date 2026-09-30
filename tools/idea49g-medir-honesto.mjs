/* Principal HB#61 - Idea 49G: cuanto pesa ach_acc si se guarda lo que el CODIGO
   LEE, no lo que la API manda.
 *
 * La propuesta del PO (tools/idea49g-achacc-measure.mjs) mide una forma con
 * `bits: [1..12]` en cada logro en progreso. Escribio eso como si lo mandara la
 * API. La API manda `bits` como STRING binario, y ademas NADIE lo lee:
 * grep sobre TODO js/ -> cero apariciones de `.bits` fuera de un comentario.
 * Asi que su medicion de 4.10 MB incluye un campo que el codigo descarta.
 *
 * Aca se mide lo que sobrevive al filtro de los consumidores reales:
 *   achievements.js:1073  a.id
 *   achievements.js:189   r.current, r.max, r.done   (computeProgress)
 *   achievements.js:221   r.current, r.done          (earnedAP)
 *   characters.js:449     a.done, a.current
 *   activities.js:908     a.done, a.id
 * Es decir: {id, current, max, done}. Y `max` solo importa cuando la metadata
 * NO tiene tiers (achievements.js:199 `if (!target && max) target = max`).
 */
const enc = o => Buffer.byteLength(JSON.stringify(o), 'utf8');
const N_TOTAL = 6991;   // logros reales escaneados por el PO
const CUOTAS = 4.98;    // MB, medidos en navegador real

// Escenario realista: una cuenta de Gw2 veteran.
function cuenta(n, pctProgreso) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    // ~45% completados: la API responde {id, done:true} y nada mas.
    if (i % 100 < 45) { out.push({ id: i, done: true }); continue; }
    // ~5% en progreso con bits (logros repetibles: daily/weekly/monthly).
    const esRepetible = i % 20 === 0;
    if (esRepetible && pctProgreso > 0) {
      out.push({ id: i, current: Math.round(3 + (i % 7)), max: 10, done: false, bits: '0101010101' });
    } else {
      out.push({ id: i, current: 0, max: 0, done: false, bits: null });
    }
  }
  return out;
}

// ---- Forma A: lo que hoy se guarda (RESPETA LA API, no el codigo) ----
function formaApi(c) { return c; }

// ---- Forma B: podada a lo que el codigo lee ----
function formaPodada(c) {
  return c.map(a => (a.done
    ? { id: a.id, done: true }
    : { id: a.id, current: a.current, max: a.max, done: false }));
}

// ---- Forma C: compacta. Dos listas, no una de objetos.
//   "C" = ids completados (current/max no importan: computeProgress los ignora
//   cuando done es true, y earnedAP usa current que es irrelevante si no hay
//   tiers -> ver achievedAP). "P" = id:cur:max de los que siguen en curso. ----
function formaCompacta(c) {
  const comp = [], prog = [];
  for (const a of c) {
    if (a.done) comp.push(a.id);
    else prog.push(a.id + ':' + a.current + ':' + a.max);
  }
  return comp.join(',') + '|' + prog.join(',');
}

function fila(nombre, bytesPorCuenta) {
  const mb = (bytesPorCuenta * 27) / 1048576;
  const total = 0.81 + mb; // + ach_meta del Tramo C (ya medido)
  return { nombre, kb: bytesPorCuenta / 1024, mb, total, pasa: total > CUOTAS };
}

console.log('=== 45% completados / 5% en progreso repetible, 27 cuentas ===');
console.log('cuota real del navegador: ' + CUOTAS + ' MB');
console.log('ach_meta (Tramo C) ya ocupa: 0.81 MB');
console.log('');
console.log('n     forma              KB/cuenta    x27        +0.81    estado');

for (const n of [1000, 2000, 3000, 4000, 6991]) {
  const c = cuenta(n, 1);
  const filas = [
    fila('A API cruda   ', enc(formaApi(c))),
    fila('B podada      ', enc(formaPodada(c))),
    fila('C compacta    ', enc(formaCompacta(c))),
  ];
  for (const f of filas) {
    console.log(
      String(n).padStart(4) + '  ' + f.nombre +
      f.kb.toFixed(0).padStart(8) + ' KB' +
      (f.mb.toFixed(2) + ' MB').padStart(11) +
      (f.total.toFixed(2) + ' MB').padStart(11) + '    ' +
      (f.pasa ? '*** SE PASA por ' + (f.total / CUOTAS).toFixed(2) + 'x' : 'entra, aire ' + (CUOTAS - f.total).toFixed(2) + ' MB'));
  }
  console.log('');
}

console.log('=== cuanto pesa CADA campo en la forma B (n=3000) ===');
const base = cuenta(3000, 1);
const formaA3 = enc(formaApi(base));
for (const campo of ['bits', 'max', 'current']) {
  const sinCampo = base.map(a => {
    const o = { ...a };
    delete o[campo];
    return o;
  });
  const dif = formaA3 - enc(sinCampo);
  console.log('  ' + campo.padEnd(9) + ' ' + (dif / 1024).toFixed(1).padStart(7) + ' KB/cuenta' +
    '  = ' + ((dif * 27) / 1048576).toFixed(2) + ' MB en 27 cuentas');
}
console.log('  base A(n=3000): ' + (formaA3 / 1024).toFixed(0) + ' KB/cuenta');