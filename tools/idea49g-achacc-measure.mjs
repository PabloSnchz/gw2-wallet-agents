/* PO Heartbeat 2026-09-30 08:00 - Idea 49G: peso real de ach_acc con la FORMA REAL
   que documenta wiki API:2/account/achievements (oldid 2310308):
     {id, bits?, current?, max?, done, repeated?, unlocked?}
   Mi medicion anterior uso una forma inventada (completed/bits/value) y quedo
   mal. Esta vez la forma sale de la doc, no de la memoria. */
const enc = o => Buffer.byteLength(JSON.stringify(o), 'utf8');

const N = 6991;
const cuenta = [];
for (let i = 1; i <= N; i++) {
  const done = i % 2 === 0;                 // la mitad completada (casoilverado)
  if (done) cuenta.push({ id: i, done: true });
  else cuenta.push({ id: i, current: 12, max: 30, done: false, bits: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] });
}

console.log('forma real segun la wiki (oldid 2310308)');
console.log('  record completado   :', enc(cuenta[1]), 'B  ->', JSON.stringify(cuenta[1]));
console.log('  record en progreso  :', enc(cuenta[0]), 'B  ->', JSON.stringify(cuenta[0]).slice(0, 60) + '...');
console.log('');
console.log('logros con progreso por cuenta -> ach_acc:* (27 cuentas), cuota real 4.98 MB');
for (const n of [1000, 2000, 3000, 4000, 5000, 6991]) {
  const s = cuenta.slice(0, n);
  const perAcc = enc(s) / 1024;
  const total = (enc(s) * 27) / 1048576;
  console.log('  ' + String(n).padStart(4) + ' -> ' + perAcc.toFixed(0).padStart(4) + ' KB/cuenta   x27 = ' +
    total.toFixed(2).padStart(5) + ' MB   ' + (total > 4.98 ? 'PASA LA CUOTA' : 'entra'));
}

const all = Array.from({ length: N }, (_, i) => i);
const comp = enc(all.join(','));
console.log('');
console.log('forma compacta "id,id,..."  N ids = ' + comp + ' B = ' + (comp / 1024).toFixed(0) + ' KB/cuenta');
console.log('  x27 (techo 6991)  = ' + ((comp * 27) / 1048576).toFixed(2) + ' MB');
for (const n of [2000, 3000, 5000]) {
  const c = enc(all.slice(0, n).join(','));
  console.log('  x27 (' + String(n).padStart(4) + ')     = ' + ((c * 27) / 1048576).toFixed(2) + ' MB');
}

console.log('');
console.log('--- cuota real DESPUES del Tramo C (f98da49) = 1.71 MB de ach_meta ---');
for (const n of [2000, 3000, 5000, 6991]) {
  const total = 1.71 + (enc(cuenta.slice(0, n)) * 27) / 1048576;
  console.log('  1.71 + ach_acc(' + String(n).padStart(4) + ') = ' + total.toFixed(2) +
    ' MB   ' + (total > 4.98 ? 'SE PASA por ' + (total / 4.98).toFixed(1) + 'x' : 'entra, margen ' + (4.98 - total).toFixed(2) + ' MB'));
}
console.log('  (+ bank/items/listings, que no medi con token: 1.07 MB segun mi estimacion)');
