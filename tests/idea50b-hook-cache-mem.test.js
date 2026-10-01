/*!
 * tests/idea50b-hook-cache-mem.test.js
 *
 * Idea 50, hook `onClear`: la cache de SESION que el boton no alcanzaba.
 *
 * Que estaba roto, y por que NO era cosmetica:
 * `cacheClear` (api-gw2.js) vaciaba la `__mem` de SU capa y borraba el disco.
 * `wizards-vault.js` tiene su PROPIA `__mem`/`__inflight` (:40-41) y su propio
 * `lsSet`, o sea que su cache de sesion seguia VIVA despues del boton. Como la
 * capa WV es la mas pesada en disco, el efecto observable era el peor posible:
 * el toast anunciaba los bytes liberados y la app no consumia un byte menos de
 * la cuota, porque todo se volvia a servir desde memoria.
 *
 * ALERT-91, aplicado a este archivo (esta seccion es el ejemplo del ciclo):
 * la seccion 4b de `idea50-boton-cache.test.js` AFIRMABA EL DEFECTO con dos
 * asserts:
 *   ok(clearApiBody.indexOf('WizardsVault') === -1,
 *      'y el boton no la alcanza todavia: no hay hook, es el tramo siguiente')
 *   ok(/incluido el WV/.test(msg), ...)
 * O sea, una foto: se ponian ROJOS el dia que se arreglaba el bug, y el fix
 * desligaba la red que lo justificaba. Un assert tiene que describir lo que
 * quiero que siga siendo cierto manana, no lo que quiero ver hoy. El signo de
 * esos dos quedo invertido al mismo tiempo que el bug: el hook tiene que
 * EXISTIR y el copy tiene que DECIR que se libera.
 *
 * QUE MIDE, Y POR QUE NO ES "UNAS ASERCIONES MAS":
 *   (1) Que el hook EXISTE y borra de verdad los `Map` del WV. Se monta el
 *       `wizards-vault.js` REAL en un sandbox y se mide, no se simula: se
 *       carga la `__mem` con una respuesta de red y despues se corta la red.
 *       Si el WV sigue contestando con el dato viejo, la `__mem` sigue viva.
 *   (2) Que `cacheClear` LO LLAMA, y que en `dryRun` NO. El dryRun es la mitad
 *       que mas importa: si el hook corriera ahi, el `confirm` responderia una
 *       pregunta y habria YA borrado.
 *   (3) Que el numero que ve Pablo es el numero que se libero.
 *   (4) Que el COPY del `confirm` coincide con lo que el boton hace.
 *
 * Ejecutar: node tests/idea50b-hook-cache-mem.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg, why) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg + (why ? '\n          -> ' + why : '')); }
}
function eq(a, b, msg) {
  ok(a === b, msg + '  (obtenido: ' + JSON.stringify(a) + ', esperado: ' + JSON.stringify(b) + ')');
}

/* ── Almacenamiento falso, compartido por los dos modulos ─────────────────── */
function fakeLS() {
  return {
    _d: {},
    get length() { return Object.keys(this._d).length; },
    key(i) { return Object.keys(this._d)[i]; },
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; }
  };
}
function fakeDoc() {
  return {
    readyState: 'loading', addEventListener() {}, removeEventListener() {},
    getElementById() { return null; },
    createElement() { return { style: {}, addEventListener() {} }; },
    body: {}
  };
}
function baseSandbox(ls) {
  return {
    console: { info() {}, warn() {}, error() {}, log() {}, debug() {} },
    document: fakeDoc(),
    localStorage: ls,
    setInterval() { return 0; }, clearInterval() {},
    URL, Promise, Map, Date, JSON, Object, Array, String, Number, Math, isFinite
  };
}
/** Una `fetch` que responde con un season identifiable. */
function fetchCon(payload) {
  let n = 0;
  const f = function () {
    n++;
    return Promise.resolve({
      ok: true, status: 200, headers: { get() { return null; } },
      text() { return Promise.resolve(payload); }
    });
  };
  f.count = function () { return n; };
  return f;
}
/** Una `fetch` que siempre falla: sirve para probar que NO se usa la `__mem`. */
function fetchCaida() {
  return function () { return Promise.reject(new Error('red cortada a proposito')); };
}

/* ═══ 1. EL WV TIENE SU PROPIA CACHE DE SESION, Y EL HOOK LA BORRA ═══════ */
console.log('\n[1] `__cacheClearMem` existe y vacia los `Map` del WV de verdad');

const ls = fakeLS();
const wv = baseSandbox(ls);
wv.window = wv; wv.globalThis = wv;
vm.createContext(wv);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'wizards-vault.js'), 'utf8'),
  wv, { filename: 'wizards-vault.js' });

const WV = wv.WizardsVault;
ok(!!WV, 'el modulo real se monto y expuso `WizardsVault`');
ok(typeof WV.__cacheClearMem === 'function',
  'expone `__cacheClearMem`: sin el, la cache de sesion no tiene por donde salir',
  'las claves de cache que si expone: ' + Object.keys(WV || {}).filter(k => /cache/i.test(k)).join(', '));

const wvSrcText = fs.readFileSync(path.join(ROOT, 'js', 'wizards-vault.js'), 'utf8');
ok(/var __mem = new Map\(\)/.test(wvSrcText) && /var __inflight = new Map\(\)/.test(wvSrcText),
  'y el modulo TIENE `__mem`/`__inflight` propias: el hook no es un no-op sobre una cache que no existe');

(async function run() {

  /* --- se llena la `__mem` REAL, por el camino real --------------------- */
  const red = fetchCon('{"id":"s1","title":"TITULO-DE-PRUEBA"}');
  wv.fetch = red;
  const primera = await WV.getWVSeason();
  ok(!!primera && primera.title === 'TITULO-DE-PRUEBA',
    'el WV cargo el dato por la red y lo dejo en su `__mem`',
    'devolvio: ' + JSON.stringify(primera).slice(0, 90));
  ok(red.count() >= 1, 'la primera carga pego a la red (' + red.count() + ' llamada(s)): la `__mem` se lleno de verdad');

  /* --- el hook, y su MEDIDA --------------------------------------------- */
  const devolvio = WV.__cacheClearMem();
  ok(typeof devolvio === 'number',
    'el hook devuelve un NUMERO: el boton necesita poder decir cuanto libero de memoria',
    'devolvio: ' + JSON.stringify(devolvio));
  ok(devolvio >= 1,
    'y ese numero es el de entradas que HABIA en la `__mem` (' + devolvio + ')',
    'devolvio 0: el hook no esta mirando el `Map` real');

  /* --- la sonda: distinguir `__mem` del disco ----------------------------
   * `putCache` (`:68-72`) escribe en `__mem` Y en `localStorage`, y
   * `getCache` (`:54-67`) sirve de uno o del otro. Entonces "red caida" NO
   * alcanza para probar nada: si el disco esta lleno, el WV responde igual y
   * uno creek que la `__mem` esta viva cuando lo unico que sirvio fue el disco.
   *
   * La sonda borra SOLO el disco y deja la `__mem` intacta. Ahi si se puede
   * separar: con la `__mem` llena el WV responde con el dato viejo sin red;
   * con la `__mem` vacia no tiene de donde sacarlo.
   */
  function borrarDisco() { for (var k in ls._d) delete ls._d[k]; }

  // Para la sonda A hace falta la `__mem` LLENA otra vez: arriba ya se ejecuto
  // el hook (por eso devolvio 1), o sea que ahora esta vacia. El orden importa:
  // si se sondea sin re-llenar, la sonda "pasa" por el motivo equivocado — y un
  // assert que pasa por el motivo equivocado es peor que uno que falla.
  wv.fetch = fetchCon('{"id":"s1","title":"TITULO-DE-PRUEBA"}');
  await WV.getWVSeason();

  // A) CON `__mem` INTACTA, disco borrado y red caida: el dato viejo sale de
  //    memoria. Esto prueba que la sonda tiene algo que encontrar.
  borrarDisco();
  wv.fetch = fetchCaida();
  const desdeMemoria = await WV.getWVSeason();
  ok(desdeMemoria && desdeMemoria.title === 'TITULO-DE-PRUEBA',
    'sonda: con la `__mem` intacta, disco borrado y red caida, el WV responde con el dato viejo (sale de memoria)',
    'respondio: ' + JSON.stringify(desdeMemoria).slice(0, 90));

  // B) DESPUES del hook: misma situacion, y ya NO puede responder con el viejo.
  //    `getCache` cae a la red, el fetch falla, y el `.catch`
  //    (`wizards-vault.js:181-186`) devuelve el objeto de seguridad `{title:'—'}`.
  //    Por eso lo que se mira es el TITULO: responde siempre, y responder con el
  //    dato viejo seria la prueba de que la memoria seguia viva.
  WV.__cacheClearMem();
  borrarDisco();
  wv.fetch = fetchCaida();
  const sinMemoria = await WV.getWVSeason();
  ok(sinMemoria && sinMemoria.title !== 'TITULO-DE-PRUEBA',
    'despues del hook, con el disco tambien borrado y la red caida, el WV NO devuelve el dato viejo: la `__mem` se vacio',
    'respondio: ' + JSON.stringify(sinMemoria).slice(0, 90));
  ok(sinMemoria && sinMemoria.title === '—',
    'y devuelve el objeto de seguridad `{title:"—"}`: no es un "no respondio" vago, es la caida controlada del modulo',
    'respondio: ' + JSON.stringify(sinMemoria).slice(0, 90));

  /* ═══ 2. `cacheClear` LLAMA AL HOOK, Y EN EL `dryRun` NO ═══════════════ */
  console.log('\n[2] `cacheClear` llama al hook, y el `dryRun` NO lo toca');

  const api = baseSandbox(ls);
  api.window = api; api.globalThis = api;
  // El MISMO registro global: el WV ya se anotó al cargarse, y se pasa el
  // array real, no una lista armada a mano. Asi se prueba el camino de
  // produccion, que es el unico que importa.
  api.__cacheBaseProviders = wv.__cacheBaseProviders;
  vm.createContext(api);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'api-gw2.js'), 'utf8'),
    api, { filename: 'api-gw2.js' });

  ok(Array.isArray(api.__cacheBaseProviders) && api.__cacheBaseProviders.length === 1,
    'el registro global de proveedores tiene el modulo REAL del WV: se prueba el camino de produccion',
    'entradas: ' + (api.__cacheBaseProviders || []).length);
  ok(api.__cacheBaseProviders[0] === WV,
    'y es el MISMO objeto que el del sandbox del WV, no una copia');

  // ESPIA alrededor del hook real: no se reemplaza la implementacion, se cuenta
  // que la capa API la invoque. Si el espia contara y no ejecutara, el `Map`
  // no se vaciaria y las aserciones de mas abajo no probarian nada.
  const wvReal = WV.__cacheClearMem;
  let llamadas = 0;
  WV.__cacheClearMem = function () { llamadas++; return wvReal.apply(this, arguments); };

  const dry = api.GW2Api.__cacheClear({ dryRun: true });
  eq(llamadas, 0,
    'el `dryRun` NO llama al hook: preguntar "cuanto se borraria" no puede borrar la memoria antes de preguntar');
  eq(dry.memCleared, 0, 'y por eso `memCleared` es 0 en el `dryRun`');
  ok(dry.dryRun === true, 'el dryRun se identifica como tal');

  const real = api.GW2Api.__cacheClear();
  eq(llamadas, 1, 'el borrado REAL llama al hook exactamente 1 vez (ni 0, ni por clave)');
  ok(real.dryRun === false, 'el borrado real no es un dryRun');
  ok(typeof real.memCleared === 'number',
    'y el resultado declara `memCleared`: el numero de memoria es parte del contrato',
    'claves del resultado: ' + Object.keys(real).join(', '));

  /* ═══ 3. EL NUMERO QUE VE PABLO ES EL NUMERO QUE SE LIBERO ════════════ */
  console.log('\n[3] el numero que ve Pablo es el numero que se libero');

  wv.fetch = fetchCon('{"id":"s3","title":"OTRO"}');
  await WV.getWVSeason();                       // llena la `__mem` otra vez
  const n = api.GW2Api.__cacheClear();
  ok(n.memCleared >= 1,
    '`memCleared` cuenta las entradas que el WV tenia en memoria y se sacaron (' + n.memCleared + ')',
    'vacio: el segundo click no esta mirando el `Map` real');

  // Un segundo click seguido, sin recargar nada: ya no hay nada en memoria, y
  // el numero tiene que BAJAR a 0 en vez de seguir repitiendo el de antes.
  const otraVez = api.GW2Api.__cacheClear();
  eq(otraVez.memCleared, 0,
    'y en el siguiente click, sin haber recargado nada, `memCleared` es 0: el numero se mide, no se acumula');

  /* ═══ 4. EL COPY DEL CONFIRM DICE LO QUE PASA ══════════════════════════ */
  console.log('\n[4] el texto que Pablo lee antes de confirmar coincide con lo que pasa');

  const smSrc = fs.readFileSync(path.join(ROOT, 'js', 'settings-manager.js'), 'utf8');
  const clearApiBody = (smSrc.match(/function clearApiCache\(\)\s*\{[\s\S]*?\n  \}/) || [''])[0];
  ok(clearApiBody !== '', 'se encontro el cuerpo de `clearApiCache` (el alcance del copy)');

  // ALERT-91, lado del copy: la version anterior asertaba `/incluido el WV/`
  // — o sea, AFIRMABA que el WV NO se liberaba. Con el hook ese texto es FALSO,
  // y el assert tiene que haber cambiado de signo en el mismo commit.
  ok(!/incluido el WV/.test(smSrc),
    'el copy ya no dice "(incluido el WV)" al lado de "se conserva": seria FALSO ahora que el hook lo libera');
  ok(/Se libera también lo que esos dos tienen en memoria/.test(smSrc),
    'el copy declara que la memoria de la API y del WV SI se libera: es lo que hace el hook');
  ok(/hasta que recargues la página/.test(smSrc),
    'y sigue diciendo HASTA CUANDO para lo que NO se toca (los otros modulos): el alcance no es una promesa abierta');
  ok(/en memoria/.test(smSrc),
    'el texto sigue nombrando la memoria, que es el dato en disputa');

  console.log('\n' + '='.repeat(64));
  console.log('TOTAL: ' + pass + ' pass, ' + fail + ' FAIL');
  if (fail) {
    console.log('\nUn FAIL aca significa que el boton y el texto que Pablo lee antes de');
    console.log('confirmar dicen cosas distintas. Eso es la clase que este archivo');
    console.log('existe para cazar: no un bug de estilo.');
  }
  process.exit(fail ? 1 : 0);
})().catch(function (e) {
  console.log('\n  FAIL  el arnes revento: ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n          ') : String(e)));
  console.log('TOTAL: ' + pass + ' pass, ' + (fail + 1) + ' FAIL');
  process.exit(1);
});