/*!
 * tests/idea55.wv-online-parallel.test.js
 *
 * Idea 55 Tramo 2 (PO, HB 08:15 UTC). El hallazgo: en
 * wv-purchase-detail.js, refreshAllOnlineStatus() recorre las cuentas con un
 * `for` y un `await` ADENTRO, o sea los N requests en serie. Con 27 cuentas y
 * ~500 ms de latencia mediana son ~13 s, y lo unico visible meanwhile es un
 * toast que dura 1,5 s: ~11,5 s de pantalla sin ningun indicio de progreso.
 *
 * El Wallet Dashboard ya tenia `computeEta` (Idea 48 Tramo B). Este modulo no.
 *
 * Se cubre de las dos formas posibles, porque una sola no alcanza:
 *   - ESTRUCTURAL: el archivo ya no tiene el `for` con `await` adentro, usa
 *     Promise.allSettled, reporta progreso y no se inventa un pool local.
 *   - COMPORTAMENTAL: se EVALUA js/progress-eta.js de verdad y se le pegan los
 *     casos del contrato (null antes de 3 muestras, null antes de 1500 ms, null
 *     si termino, ceil a segundos) mas el caso que documento el PO: 27 cuentas
 *     a ~500 ms de media son ~12 s, no ~13, y el redondeo va hacia arriba.
 *
 * Ejecutar: node tests/idea55.wv-online-parallel.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
const src = fs.readFileSync(path.join(ROOT, 'js', 'wv-purchase-detail.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// La ventana va de la funcion hasta la seccion siguiente, para no depender de
// un ancho arbitrario de caracteres.
const iFn = src.indexOf('async function refreshAllOnlineStatus()');
ok(iFn !== -1, 'refreshAllOnlineStatus() sigue existiendo');
const iNext = src.indexOf('// ====== ', iFn + 10);
const body = iFn === -1 ? '' : src.slice(iFn, iNext === -1 ? iFn + 4000 : iNext);

// ── 1. El sintoma: la serie ────────────────────────────────────────────────
console.log('\n[1] refreshAllOnlineStatus() ya no es una serie de requests');

ok(!/for \((?:var |let )?i\s*=\s*0;\s*i\s*<\s*state\.accounts\.length; i\+\+\)[\s\S]{0,1200}?\bawait\b/.test(body),
   'NO queda un `for` con `await` adentro sobre state.accounts  <-- el fix');
ok(!/for \([^)]*of[^)]*\)[\s\S]{0,1200}?\bawait\b/.test(body),
   'NO queda un `for...of` con `await` adentro');
ok(/Promise\.allSettled\(state\.accounts\.map\(/.test(body),
   'los N requests salen juntos con Promise.allSettled(state.accounts.map(...))');

// El bug de fondo no era el await: era que el await hacia que cada iteracion
// esperase a la anterior. Con allSettled hay un unico punto de espera.
const awaits = (body.match(/\bawait\b/g) || []).length;
ok(awaits === 1,
   'hay UN SOLO `await` en la funcion (espera al lote, no a cada cuenta)  <-- encontrados: ' + awaits);

// ── 2. El estrangulamiento: lo pone la capa, no un pool local ──────────────
console.log('\n[2] El throttle lo pone la capa (jfetch -> poolRun), no un pool local');

const apiSrc = fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf8');
ok(/POOL_MAX\s*=\s*6/.test(apiSrc), 'la capa tiene un pool global (POOL_MAX = 6)');
ok(/function poolRun/.test(apiSrc), 'la capa tiene poolRun');
ok(/return poolRun\(/.test(apiSrc), 'jfetch pasa por poolRun');

// Si este modulo metiera su propio MAX + su propio Promise.all DENTRO, el
// estrangulamiento real seria MAX * POOL_MAX: exactamente el defecto de la
// Idea 46. Por eso se comprueba que NO exista.
ok(!/\bPOOL_MAX|MAX_CONCURRENT|MAX_PARALLEL|CONCURRENCY/i.test(body),
   'NO hay constante de concurrencia local en la funcion');
ok(!/for \([^)]*\)[\s\S]{0,900}?Promise\.all/.test(body),
   'NO hay un Promise.all DENTRO de un for (no hay pool local anidado)');

// ── 3. El progreso, que antes no existia ───────────────────────────────────
console.log('\n[3] Progreso visible durante la carga');

ok(/function reportProgress\(\)/.test(body), 'existe reportProgress()');
ok(/setStatus\(msg/.test(body), 'el progreso se escribe con setStatus()  <-- antes no habia ninguno');
ok(/done \+ '\/' \+ total/.test(body.replace(/"/g, "'")),
   'el progreso muestra el conteo hecho/total');
ok(/GN\.progressEta\.computeEta\(/.test(body), 'la ETA sale de GN.progressEta.computeEta');
ok(/GN\.progressEta\.fmtEta\(/.test(body), 'la ETA se formatea con GN.progressEta.fmtEta');
ok(/Date\.now\(\) - 0|startedAt = Date\.now\(\)/.test(body), 'startedAt se toma al arrancar');
ok(/if \(failedCount\) msg \+=/.test(body.replace(/"/g, "'")),
   'el progreso informa cuantas cuentas fallaron');

// El toast de arranque se conserva: avisa que empezo la accion.
ok(/window\.toast\('info', 'Actualizando estado online\.\.\.'/.test(body),
   'el toast inicial se conserva');

// ── 4. El contrato de error: una cuenta rota no tumba las otras ───────────
console.log('\n[4] Una cuenta que falla no se lleva las otras 26');

ok(/status === 'rejected'/.test(body), 'los rechazos se recorren al final');
ok(/if \(r\.status === 'rejected'\)[\s\S]{0,200}?console\.warn/.test(body),
   'cada rechazo se loguea con su cuenta');
ok(/failedCount\+\+/.test(body), 'los fallos se cuentan');
ok(/setStatus\(msg, failedCount \? 'error' : undefined\)/.test(body.replace(/"/g, "'")),
   'un fallo cambia el color del status, sin sacar el progreso');
ok(/no se pudieron leer/.test(body), 'al final se avisa cuantas cuentas no se pudieron leer');

// El `catch` viejo por cuenta se reemplaza por el segundo handler del .then.
// Si alguien lo saca, Promise.allSettled lo degloba igual, pero se pierde el
// conteo de errores: la asercion de failedCount++ lo cubre.
ok(/\.then\(function \(v\) \{ done\+\+; reportProgress\(\); return v; \},\s*\n\s*function \(e\) \{ done\+\+; failedCount\+\+; reportProgress\(\); throw e; \}\)/.test(body),
   'cada cuenta incrementa done Y failedCount antes de propagar su error');

// ── 5. Lo que NO cambia: la logica de negocio, intacta ─────────────────────
console.log('\n[5] La logica de negocio no se toco (regresion seria cambiar esto)');

ok(/isRecentlyActive\(accountInfo, 10\)/.test(body), 'el umbral de 10 minutos sigue igual');
ok(/getAccountInfo\(acc\.token, \{ nocache: true \}\)/.test(body),
   'nocache:true se conserva (para ' + "last_modified hay que releer siempre)");
ok(/if \(acc\.isOnline !== isOnline \|\| acc\.lastPlayedChar !== lastPlayedChar\)/.test(body),
   'el criterio de "cambio" (isOnline o lastPlayedChar) sigue igual');
ok(/updateSingleAccountRow\(acc\.token, acc\)/.test(body),
   'sigue buscando la fila por TOKEN, no por indice  <-- invariante');
ok(/if \(isOnline\) onlineCount\+\+;/.test(body), 'el conteo de online sigue igual');
ok(/Actividad hace ' \+ minutesSince \+ ' min/.test(body.replace(/`/g, "'").replace(/"/g, "'")),
   'el texto "Actividad hace N min" se conserva');

// ── 6. progress-eta.js: existe, se carga antes, y RESPETA el contrato ───────
console.log('\n[6] js/progress-eta.js — evaluado de verdad, no grepeado');

const etaPath = path.join(ROOT, 'js', 'progress-eta.js');
ok(fs.existsSync(etaPath), 'js/progress-eta.js existe');
const etaSrc = fs.readFileSync(etaPath, 'utf8');

// Evaluacion real: la IIFE se corre contra un root falso.
const fakeRoot = {};
vm.createContext(fakeRoot);
vm.runInContext(etaSrc, fakeRoot, { filename: 'progress-eta.js' });
const ETA = fakeRoot.GN && fakeRoot.GN.progressEta;
ok(!!ETA, 'la IIFE expone root.GN.progressEta');
ok(typeof ETA.computeEta === 'function' && typeof ETA.fmtEta === 'function',
   'expone computeEta y fmtEta');

if (ETA) {
  const T0 = 1000000;
  // Mismas constantes que la Idea 48 Tramo B.
  ok(ETA.thresholds.minDone === 3, 'ETA_MIN_DONE = 3 (mismo que Idea 48B)');
  ok(ETA.thresholds.minMs === 1500, 'ETA_MIN_MS = 1500 (mismo que Idea 48B)');

  // Sin muestras suficientes: null, no un "~0 s" que promete y no cumple.
  ok(ETA.computeEta(T0, 0, 27, T0 + 10000) === null, 'done=0 -> null');
  ok(ETA.computeEta(T0, 1, 27, T0 + 10000) === null, 'done=1 -> null (menos de 3 muestras)');
  ok(ETA.computeEta(T0, 2, 27, T0 + 10000) === null, 'done=2 -> null (menos de 3 muestras)');
  // 3 muestras pero en 200 ms: no dicen nada sobre las 24 que faltan.
  ok(ETA.computeEta(T0, 3, 27, T0 + 200) === null, '3 muestras en 200 ms -> null (piso de 1500 ms)');
  // Sin reloj: si tNow se pasa mal, no puede devolver basura.
  ok(ETA.computeEta(T0, 3, 27, undefined) === null, 'tNow undefined -> null, no NaN');
  ok(ETA.computeEta(T0, 27, 27, T0 + 9000) === null, 'ya termino (done>=total) -> null');
  ok(ETA.computeEta(T0, 5, 0, T0 + 9000) === null, 'total=0 -> null');

  // El caso real del PO: 27 cuentas a ~500 ms de latencia mediana. Con las
  // primeras 3 ya medidas (1500 ms, justo el piso) la media es 500 ms exactos,
  // y quedan 24: 24 * 500 = 12000 ms. Es la "~13 s" de UI congelada que
  // reporto el PO, expresada como lo que la ETA muestra de verdad: "~12 s".
  //
  // OJO sobre la aritmetica: la ETA extrapola sobre (total - done), no sobre
  // total. En un instante dado NO cuenta las cuentas ya terminadas. Una version
  // de este test que multiplicara 27 en vez de 24 estaria probando otra funcion.
  const e = ETA.computeEta(T0, 3, 27, T0 + 1500);
  ok(e && e.ms === 12000, '3 cuentas a 500 ms -> 12000 ms exactos (24 * 500)  <-- obtenido: ' + (e ? e.ms : 'null'));
  ok(e && e.secs === 12, 'y se muestra como 12 s, redondeado hacia ARRIBA');
  ok(ETA.fmtEta(e && e.secs) === '~12 s', 'fmtEta(12) === "~12 s"');

  // La extrapolacion es sobre las que FALTAN, no sobre el total.
  const e2 = ETA.computeEta(T0, 5, 27, T0 + 2000);
  ok(e2 && e2.ms === 8800, 'a 5 de 27 son 22 las que faltan: 22 * 400 = 8800 ms  <-- obtenido: ' + (e2 ? e2.ms : 'null'));

  ok(ETA.fmtEta(90) === '~2 min', 'fmtEta(90) === "~2 min"');
  ok(ETA.fmtEta(1) === '~1 s', 'fmtEta(1) === "~1 s"');
  ok(ETA.fmtEta(null) === '', 'fmtEta(null) === "" (no ensucia la UI)');
  ok(ETA.fmtEta(undefined) === '', 'fmtEta(undefined) === ""');

  // El redondeo hacia arriba es una decision de contrato, no un accidente: un
  // "~11 s" que en realidad son 11,4 s termina en 12 y promete MENOS de lo que
  // cumple. Y al reves seria peor: prometer mas de lo que se cumple.
  ok(ETA.computeEta(T0, 3, 10, T0 + 1501).secs === 4,
     'ceil a segundos: 3,5 s restantes se muestran como 4, no 3');
}

// ── 7. Carga en index.html, en el orden correcto (REGLA 2) ─────────────────
console.log('\n[7] Carga en index.html, en orden (ALERT-24 / REGLA 2)');

const iEta = html.indexOf('js/progress-eta.js');
const iWvpd = html.indexOf('js/wv-purchase-detail.js');
ok(iEta !== -1, 'progress-eta.js esta cargado en index.html');
ok(iEta !== -1 && iWvpd !== -1 && iEta < iWvpd,
   'progress-eta.js se carga ANTES que wv-purchase-detail.js (GN.progressEta existe al evaluar)');
// progress-eta.js es sync (sin defer) y wv-purchase-detail.js es defer: aunque
// el orden de etiquetas no bastara, el sync siempre corre antes que un defer.
ok(/<script src="js\/progress-eta\.js\?v=([\d.]+)"><\/script>/.test(html),
   'progress-eta.js se carga SIN defer (garantia extra de orden)');

const mEta = html.match(/js\/progress-eta\.js\?v=([\d.]+)/);
ok(mEta && mEta[1] === '1.0.0', 'el buster de progress-eta.js es 1.0.0  (encontrado: ' + (mEta ? mEta[1] : '?') + ')');
ok(/Versión: 1\.14\.0/.test(src), 'la cabecera de wv-purchase-detail.js declara v1.14.0');
const mWvpd = html.match(/js\/wv-purchase-detail\.js\?v=([\d.]+)/);
ok(mWvpd && mWvpd[1] === '1.14.0', 'el buster de wv-purchase-detail.js subio a 1.14.0  (encontrado: ' + (mWvpd ? mWvpd[1] : '?') + ')');
ok(/Cambios v1\.14\.0 \(Idea 55 Tramo 2\)/.test(src), 'la cabecera documenta el cambio y su motivo');

// ── resumen ────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────');
console.log('  ' + pass + ' pass / ' + fail + ' FAIL');
console.log('─────────────────────────────────────────');
process.exit(fail ? 1 : 0);
