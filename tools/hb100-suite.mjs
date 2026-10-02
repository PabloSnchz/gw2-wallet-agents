// HB#100 - corre TODOS los tests/*.test.js y agrega pass/FAIL por archivo.
//
// ALERTA (medida con tools/hb100-control-suite.mjs). Dos falsos, en las dos
// direcciones, y los dos importan:
//
//  (a) FALSO LIMPIO. Un runner que solo mira "N FAIL" da "limpio" a un archivo
//      que imprime "SUITE FAIL" y a uno que muere por AssertionError. En el
//      control, ctl2 y ctl3 pasaron como 0/0.
//  (b) FALSO ROJO. La primera correccion uso /\\bFAIL\\b/ sobre toda la salida
//      y marco 43 de 46 archivos en rojo: los tests que PASA imprimen
//      "TOTAL: 10 aserciones, 0 FAIL", o sea la palabra esta en la linea del
//      exito. Un detector tan ancho que no se puede correr es un detector de
//      museo (ALERT-92).
//
// Regla que queda: se cuenta el MAXIMO de los conteos numericos de FAIL (no la
// primera coincidencia y no la mera presencia de la palabra), mas el codigo de
// salida, mas un "SUITE FAIL" explicito. "0 FAIL" es exito por construccion.
//
// ALERT-204 (HB#138). El MAXIMO es correcto para el caso que el comentario de
// arriba describe ("3 FAIL" a mitad, "0 FAIL" al final), pero choca con los
// tests que hacen un CONTROL NEGATIVO y reportan su propio conteo de fallos
// deliberados. `hb105-perms-persistidos.test.js` imprime "con el bug: 5 FAIL
// de 10 aserciones" y despues "SUITE OK  11 pass / 0 FAIL": el harness hacia
// exactamente lo que debe (detectar que sin `perms` el bug vuelve) y el runner
// lo leia como regresion. Un arnes con control negativo se marcaba a si mismo
// en rojo SIEMPRE, o sea el control era informacion muerta.
//
// La senal que falta no es otra cuenta: es el VEREDICTO EXPLICITO. Cuando un
// test emite "SUITE OK" y sale con codigo 0, esa es su ultima palabra y gana
// sobre la heuristica. Solo 2 de 72 archivos emiten veredicto, asi que el
// maximo se sigue aplicando al resto: esto no relaja el detector, lo pisa solo
// donde hay una declaracion autoritativa. Y no se puede convertir un archivo en
// verde por accident: "SUITE OK" no sirve si el codigo de salida != 0 ni si el
// mismo archivo imprime "SUITE FAIL" en algun lado.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const dir = 'tests';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort();
const SUITE_FAIL = /SUITE\s+FAIL|FALL\s+TODOS|ASSERTION\s+FAILED/i;
// ALERT-204: veredicto explicito de exito. Un archivo que lo emite y sale con
// codigo 0 ya se declaro sano; el control negativo que imprime despues (o antes)
// no lo puede volver rojo.
const SUITE_OK = /SUITE\s+OK\b/i;
const LINE_FAIL = /^\s*(not\s+ok|FAIL|XX)\b/im;
const VEREDICTO = /pass|FAIL|ok\b|SUITE|aserciones|assert/i;

let tp = 0, tf = 0;
const bad = [], sinVeredicto = [];
for (const f of files) {
  let out = '', code = 0;
  try {
    out = execFileSync(process.execPath, [dir + '/' + f], { encoding: 'utf8', timeout: 120000 });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || ''); code = e.status ?? 1;
  }
  const p = +(out.match(/(\d+)\s*(?:pass|pasaron|ok)/i)?.[1] ?? 0);
  // MAXIMO de todos los conteos, no el primero: un archivo puede imprimir
  // "3 FAIL" a mitad y "0 FAIL" al final, y el final es el que manda.
  let fl = Math.max(0, ...[...out.matchAll(/(\d+)\s*FAIL/gi)].map((m) => +m[1]));
  // ALERT-204: el veredicto explicito pisa la heuristica, pero solo si el
  // archivo NO se declaro en FAIL y salio limpio. Sin este cierre, un archivo
  // que imprime "SUITE OK" y despues revienta seria verde.
  const declaroOK = SUITE_OK.test(out) && !SUITE_FAIL.test(out) && code === 0;
  if (declaroOK) fl = 0;
  tp += p;
  const motivos = [];
  if (fl > 0) motivos.push('FAIL=' + fl);
  if (SUITE_FAIL.test(out)) motivos.push('SUITE-FAIL');
  if (LINE_FAIL.test(out)) motivos.push('linea-de-fallo');
  if (code !== 0) motivos.push('exit=' + code);
  if (!VEREDICTO.test(out)) motivos.push('sin-veredicto');
  const fallo = motivos.length > 0;
  if (fallo) { tf++; bad.push(`${f} [${motivos.join(',')}]`); }
  if (!VEREDICTO.test(out)) sinVeredicto.push(f);
  process.stdout.write(`${fallo ? 'XX ' : 'ok '}${f}  pass=${p}${fallo ? '  <- ' + motivos.join(',') : ''}\n`);
}
process.stdout.write(`\nTOTAL pass=${tp} FAIL=${tf} en ${files.length} archivos\n`);
if (sinVeredicto.length) process.stdout.write(`SIN VEREDICTO RECONOCIBLE (revisar formato): ${sinVeredicto.join(', ')}\n`);
process.stdout.write(bad.length ? 'FALLAN: ' + bad.join(' | ') + '\n' : 'SUITE OK\n');
process.exit(tf ? 1 : 0);
