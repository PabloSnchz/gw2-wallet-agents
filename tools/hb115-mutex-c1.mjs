// HB#115. Verifica C1 (la afirmacion que MEMORY.md del HB#111 guardo como
// "el mutex SATURA EN 1") contra el CUERPO VERBATIM de raid-tracker.js.
//
// Por que verbatim y no reescrito: ALERT-158 -- un arnes reescrito a mano no
// puede tener menos fallos que el codigo real, y los 4 fallos de este repo en
// las ultimas rondas fueron de arneses del PO reescritos. Se extrae el bloque
// del archivo real por llaves y se corre en un vm.
//
// CONTROL OBLIGATORIO (ALERT-154): un arnes que no se delata a si mismo no
// mide. Si el mutex no estuviera, N simultaneas darian N. Si el mutex esta,
// tienen que dar menos. Un arnes que solo puede dar "poco" no esta probando
// el mutex: esta probando que el for loop corre.

import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SRC = readFileSync(new URL('../js/raid-tracker.js', import.meta.url), 'utf8');

// ---- Extraccion verbatim del cuerpo de refresh() -------------------------
function extraerRefresh(src) {
  const i = src.indexOf('async function refresh(forceNoCache)');
  if (i < 0) throw new Error('refresh() no encontrado: el arnes midio otra cosa');
  let j = src.indexOf('{', i), depth = 0;
  for (let k = j; k < src.length; k++) {
    const ch = src[k];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(i, k + 1); }
  }
  throw new Error('llaves sin cerrar');
}

const refreshSrc = extraerRefresh(SRC);
const CON_MUTEX = refreshSrc;

// CONTROL NEGATIVO: el mismo cuerpo con la linea del mutex (el await +
// el return por seq) sacada. Si esto NO da mas que el original, el mutex no
// esta haciendo nada y el arnes no lo esta midiendo.
const SIN_MUTEX = refreshSrc
  .replace(/if \(_refreshInFlight\) \{[\s\S]*?\n    \}/, '')
  .replace('var mySeq = ++_refreshSeq;', 'var mySeq = ++_refreshSeq; void mySeq;');

function correr(cuerpo, n) {
  let enVuelo = 0, maxVuelo = 0, total = 0;
  const ctx = {
    _refreshSeq: 0,
    _refreshInFlight: null,
    loadRaidData: () => {
      total++; enVuelo++; maxVuelo = Math.max(maxVuelo, enVuelo);
      return new Promise(r => setTimeout(() => { enVuelo--; r(); }, 5));
    },
  };
  vm.createContext(ctx);
  vm.runInContext('var _refreshSeq = 0, _refreshInFlight = null;\n' + cuerpo, ctx);
  const p = [];
  for (let k = 0; k < n; k++) p.push(ctx.refresh(true).catch(() => {}));
  return Promise.all(p).then(() => ({ total, maxVuelo }));
}

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  ok   ' + m))
                             : (fail++, console.log('  FAIL ' + m)); };

(async () => {
  console.log('CUERPO VERBATIM de refresh() (raid-tracker.js)');
  console.log('');
  const filas = [];
  for (const n of [1, 2, 3, 5, 10]) {
    const con = await correr(CON_MUTEX, n);
    const sin = await correr(SIN_MUTEX, n);
    filas.push({ n, con: con.total, conMax: con.maxVuelo, sin: sin.total, sinMax: sin.maxVuelo });
    console.log(`  n=${String(n).padStart(2)}  CON mutex: ${con.total} request(s), max=${con.maxVuelo}` +
                `   |  SIN mutex: ${sin.total}, max=${sinMax(sin)}`);
  }
  function sinMax(s) { return s.maxVuelo; }
  console.log('');

  // 1. El mutex tiene que REDUCIR. Sin esto el arnes no esta midiendo el mutex.
  //
  //    n=2 NO se exige que reduzca, y la razon es del codigo, no una excepcion
  //    para que el arnes pase: con 2 llamadas simultaneas la 1a entra y la 2a
  //    espera a que termine. Al terminar, mySeq === _refreshSeq (la 2a es la
  //    ultima), asi que la 2a SI carga. Total = 2. No hay trabajo que descartar:
  //    las dos llamadas son distintas y las dos son legitimas.
  //
  //    A partir de n=3 si hay trabajo de sobra (la 1a y la 2a son la misma
  //    "ultima llamada"), y ahi el mutex tiene que reducir. n=3 es el punto de
  //    corte real, asi que ahi se mira.
  ok(filas[1].con === filas[1].sin && filas[1].con === 2,
     `n=2: ${filas[1].con} == ${filas[1].sin} == 2 (con 2 llamadas no hay nada que descartar)`);
  ok(filas[2].con < filas[2].sin, `n=3: CON mutex ${filas[2].con} < SIN mutex ${filas[2].sin} (el mutex reduce)`);
  ok(filas[3].con < filas[3].sin, `n=5: CON mutex ${filas[3].con} < SIN mutex ${filas[3].sin}`);
  ok(filas[3].conMax === 1, `n=5: max en vuelo CON mutex = ${filas[3].conMax}, debe ser 1 (nunca 2 a la vez)`);

  // 2. LA AFIRMACION C1. "satura en 1" significa que el total de requests se
  //    queda en 1 para cualquier n. Si el total crece con n, NO satura en 1.
  const saturaEn1 = filas.every(f => f.con === 1);
  console.log('');
  console.log('  VEREDICTO C1:');
  console.log(`    totales CON mutex por n: ${filas.map(f => f.n + '->' + f.con).join('  ')}`);
  if (saturaEn1) {
    console.log('    -> C1 SE SOSTIENE: el total nunca pasa de 1 request.');
    ok(true, 'C1: satura en 1');
  } else {
    const maxTot = Math.max(...filas.map(f => f.con));
    console.log(`    -> C1 NO SE SOSTIENE. El total CRECE con n y tope en ${maxTot}.`);
    console.log(`       La cifra de "satura en 1" que guarde MEMORY.md del HB#111 es FALSA.`);
    console.log(`       El mutex serializa (max=1 en vuelo) pero NO descarta trabajo pendiente:`);
    console.log(`       la ultima llamada pendiente igual carga. Tope medido: ${maxTot}.`);
    ok(maxTot === 2, `C1 NO se sostiene: tope medido = ${maxTot} (2 = el numero del PO)`);
  }

  console.log('');
  console.log(`${pass} pass / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();