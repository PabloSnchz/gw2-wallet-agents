/* tests/idea64-dos-pestanas.test.js
 *
 * IDEA 64 — dos pestanas abiertas borran una cuenta de la lista, sin aviso.
 *
 * Este test es LA LISTA, no el fix. Verifica que la CLASE de bug sea visible y
 * CONTADA, para que no dependa de que alguien se acuerde.
 *
 * ── La forma del bug, que no necesita ningun modulo para entenderse ───────────
 *
 *   KeyManager es un objeto UNICO por pestana, con `this.list` como copia en
 *   memoria. `save()` (app.js) escribe `this.list` a disco SIN releerlo:
 *
 *       save() { Storage.set(STORAGE_KEYS.ACCOUNT_KEYS, this.list); }
 *
 *   Dos pestanas tienen dos `this.list`. La que escribe ultima pisa a la otra.
 *
 *   - B agrega la cuenta 28 -> disco = 28. La pestana A sigue con 27 y NO se
 *     entera (nadie escucha el evento `storage` para esta clave).
 *   - A renombra "cuenta 1" (un clic) -> `save()` escribe los 27 de A sobre el
 *     disco. La 28 DESAPARECE. Sin aviso, sin error, sin log.
 *
 * El caso inverso duele mas: B renombra la 5 a "ALT-PVE", A borra la 12 -> la 5
 * sigue existiendo pero vuelve a llamarse "cuenta 5". Se pierde el
 * main/alter/f2p, que es lo que permite ordenar 27 cuentas. Y la cuenta
 * funciona: no vas a notarlo nunca.
 *
 * ── Por que la suite existente no lo ve (medido, no supuesto) ─────────────────
 *
 * Los 33 tests usan un sandbox con UN solo localStorage. Con un store, la copia
 * en memoria SIEMPRE esta al dia y el overwrite no puede ocurrir. Un lost
 * update no es un dato malo: son dos datos buenos que se pisaron.
 *
 * La suite mide QUE SE GUARDA. Esta clase mide QUIEN ESCRIBIO ULTIMO.
 *
 * Ojo con un criterio que se da por bueno: el test de la Idea 61 §6 ya declara
 * el invariante correcto ("lo que hay que FORBIDIR no es el escritor crudo sino
 * el LECTOR CRUDO") y hoy da 0. El test esta bien y la clase que le falta es
 * OTRA: la 61 probo que el espejo gn:<->legacy se mantiene; no probo que dos
 * escritores no se pisen. Un invariante de COHERENCIA no es un invariante de
 * CONCURRENCIA.
 *
 * ── Como se construye el arnes ──────────────────────────────────────────────
 *
 * Se extrae el objeto `KeyManager` de app.js por EQUILIBRIO DE LLAVES (no por
 * numeros de linea: las lineas se mueven en cada merge, y un test que cita
 * lineas de un arbol distinto aserta sobre un archivo que no esta probando).
 *
 * El `localStorage` de mentira es COMPARTIDO por referencia entre los dos
 * contextos: eso es lo que hace que las dos pestanas escriban en el mismo sitio.
 * El evento `storage` NO se dispara a mano en el arnes de escritura (se dispara
 * en la pestana que ESCUCHA, y el fix de T2 lo agrega).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const JS = path.join(ROOT, 'js');

let pass = 0, fail = 0;
function ok(cond, msg, why) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg + (why ? '\n          -> ' + why : '')); }
}
function section(t) { console.log('\n[' + t + ']'); }

/* ── localStorage COMPARTIDO entre pestanas, con el evento `storage` ──────── */
function nuevoLS() {
  return {
    _d: {},
    _subs: [],
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) {
      const old = this.getItem(k);
      this._d[k] = String(v);
      // El evento `storage` real NO se dispara en la pestana que escribe, solo
      // en las otras. Aqui lo despachamos a los suscriptores registrados.
      this._subs.forEach(fn => { try { fn({ key: k, oldValue: old, newValue: String(v) }); } catch (_) {} });
    },
    removeItem(k) { const old = this.getItem(k); delete this._d[k]; this._subs.forEach(fn => { try { fn({ key: k, oldValue: old, newValue: null }); } catch (_) {} }); },
    onStorage(fn) { this._subs.push(fn); },
    get length() { return Object.keys(this._d).length; },
    key(i) { return Object.keys(this._d)[i] || null; },
  };
}

const GN = 'gn:account:keys';
const LEG = 'gw2_keys';

/** Carga el storage.js real contra un localStorage COMPARTIDO. */
function cargarStorage(ls) {
  const sandbox = {
    localStorage: ls,
    console: { info() {}, warn() {}, error() {}, log() {}, debug() {} },
    document: { readyState: 'loading', addEventListener() {} },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(JS, 'storage.js'), 'utf8'), sandbox, { filename: 'storage.js' });
  return sandbox.Storage;
}

/* ── Extraccion de KeyManager por EQUILIBRIO DE LLAVES ────────────────────── */
function extraerKeyManager(src) {
  const ini = src.indexOf('const KeyManager = {');
  if (ini < 0) throw new Error('no se encontro `const KeyManager = {` en app.js');
  let depth = 0, i = src.indexOf('{', ini), fin = -1;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { fin = i + 1; break; } }
  }
  if (fin < 0) throw new Error('el objeto KeyManager no cierra sus llaves');
  return src.slice(ini, fin);
}

/**
 * El CUERPO de un metodo de objeto: desde su definicion hasta la llave que
 * cierra al mismo nivel de profundidad.
 *
 * Por que hace falta: sin esto, un assert como "save() no escribe this.list a
 * pelo" matchea el BLOQUE DE COMENTARIO que explica T1 — que menciona
 * exactamente esas dos palabras. El assert pasaria por construccion y el test
 * no estaria probando donde dice que prueba. Es el mismo modo de falla que
 * asertar sobre el archivo entero en vez de sobre el handler.
 */
function cuerpoDeMetodo(bloque, ini) {
  let depth = 0, visto = false;
  for (let i = ini; i < bloque.length; i++) {
    const c = bloque[i];
    if (c === '{') { depth++; visto = true; }
    else if (c === '}') { depth--; if (visto && depth === 0) return bloque.slice(ini, i + 1); }
  }
  return bloque.slice(ini);
}

/**
 * Quita comentarios de linea y de bloque de un TROZO DE CODIGO.
 *
 * Por que existe: un assert que busca un patron de codigo matchea tambien la
 * FRASE que nombra ese patron. El caso que lo motiva esta medido en la
 * seccion 6: el comentario que documenta el fix de `syncAccountTagsToKeys`
 * esta DENTRO de la funcion y contiene literalmente
 * `localStorage.getItem('gw2_keys')`, o sea el patron prohibido. Acotar el
 * assert al cuerpo de la funcion - que es lo que arregla el caso de `save()`
 * - no alcanza: con el fix puesto, el assert seguia dando FAIL.
 *
 * Por que no es un parser: no hace falta. Es un stripper, y su unica
 * Limitacion (cadenas multilinea con `//` adentro) esta medida y declarada en
 * la seccion 6. Un parser de verdad seria mas correcto y mas caro, y el
 * analisis de que el archivo no tiene ese caso es de una linea.
 */
function cuerpoSinComentarios(codigo) {
  return codigo
    .replace(/\/\*[\s\S]*?\*\//g, ' ')   // bloque
    .replace(/\/\/[^\n]*/g, ' ');        // linea
}

/**
 * Monta UNA pestana: el KeyManager real de app.js, contra el store compartido.
 * El `document` es minimo: `refreshSelects` necesita `el.keySelectGlobal`.
 */
function montarPestana(ls, Storage) {
  const src = fs.readFileSync(path.join(JS, 'app.js'), 'utf8');
  const bloque = extraerKeyManager(src);

  const sel = { _opts: [], innerHTML: '', value: '',
    appendChild(o) { this._opts.push(o); } };

  const sandbox = {
    localStorage: ls,
    Storage: Storage,
    console: { info() {}, warn() {}, error() {}, log() {}, debug() {} },
    document: {
      readyState: 'complete',
      createElement() { return { value: '', textContent: '', appendChild() {} }; },
      dispatchEvent() {},
      getElementById() { return null; },
    },
    navigator: { clipboard: { writeText() { return Promise.resolve(); } } },
    state: { keys: [], selected: null },
    el: { keySelectGlobal: sel },
    obfuscate: (v) => '***' + String(v).slice(-4),
    setStatus() {},
    loadAllForToken() { return Promise.resolve(); },
    render() {},
    emitRefreshEvents() {},
    toast() {},
    setTimeout() {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  // T2: `window.addEventListener('storage', ...)` es lo que conecta la pestaña
  // al store compartido. Sin esto, el arnes no puede reproducir la clase.
  sandbox.addEventListener = (tipo, fn) => { if (tipo === 'storage') ls.onStorage(fn); };
  vm.createContext(sandbox);
  vm.runInContext(bloque, sandbox, { filename: 'app.js#KeyManager' });
  // `const` en el contexto de vm NO cuelga de `sandbox`: se lee del contexto.
  const km = vm.runInContext('KeyManager', sandbox);
  return { km: km, sel, sandbox };
}

/** Lee la lista que hay REALMENTE en disco, por la gn: y por su legacy. */
function enDisco(ls) {
  const gn = JSON.parse(ls.getItem(GN) || '[]');
  const leg = JSON.parse(ls.getItem(LEG) || '[]');
  return { gn, leg, n: gn.length, valores: gn.map(k => k.value) };
}

/**
 * Deja N cuentas en disco y monta dos pestanas que las han cargado.
 *
 * OJO: sembrar `km.list` a mano y llamar `save()` ya NO es una preparacion
 * valida desde T1 — `save()` relee el disco y resuelve la escritura sobre la
 * lista FRESCA, asi que sembrar la copia en memoria se pisa a si mismo. Una
 * pestaña real arranca LEYENDO, que es lo que hace `load()` aca.
 */
function dosPestanas(n, extra) {
  const ls = nuevoLS();
  const S = cargarStorage(ls);
  S.init();
  const base = [];
  for (let i = 1; i <= n; i++) base.push({ label: 'cuenta ' + i, value: 'k' + i, tag: 'main' });
  // Se escribe por la gn: y su legacy a la vez, como hace Storage.set.
  ls.setItem(GN, JSON.stringify(base));
  ls.setItem(LEG, JSON.stringify(base));
  if (extra) extra(ls, base);

  const A = montarPestana(ls, S);
  const B = montarPestana(ls, S);
  A.km.load();
  B.km.load();
  return { ls, S, A, B };
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. LO QUE YA SE SABE: save() relee del disco antes de escribir (T1)
   ═══════════════════════════════════════════════════════════════════════════ */
section('1. save() relee del disco: la escritura se resuelve sobre la lista FRESCA');

{
  const src = fs.readFileSync(path.join(JS, 'app.js'), 'utf8');
  const bloque = extraerKeyManager(src);
  // El ancla es la DEFINICION del metodo (con su sangria), no la palabra
  // `save(`. Con un texto suelto, el indice cae en el primer `save()` que
  // aparece — y el bloque de T1 los menciona en los comentarios: el test
  // estaria leyendo prosa. Es el modo de falla de citar lineas en vez de codigo.
  const mSave = /\n {4}save\(/.exec(bloque);
  ok(!!mSave, 'save() existe como METODO del KeyManager de app.js');
  const iSave = mSave ? mSave.index : -1;

  const cuerpo = iSave >= 0 ? cuerpoDeMetodo(bloque, iSave) : '';

  // NO se aserta "save() no escribe this.list": SI lo escribe, y esta bien.
  // La diferencia entre el bug y el fix no es la variable que se pasa a
  // Storage.set, es DE DONDE SALE esa variable: antes era la copia en memoria
  // sin tocar; ahora es `fresh`, releido y mutado. Un assert de FORMA sobre el
  // nombre de la variable no puede distinguir las dos cosas y solo miente.
  // Lo que si se puede afirmar de la forma es el ORDEN: la relectura ocurre
  // ANTES de que `this.list` deje de ser una copia obsoleta.
  const iFresh = cuerpo.indexOf('this._fresh()');
  const iAssign = cuerpo.indexOf('this.list =');
  ok(iFresh >= 0,
     'save() relee la lista fresca de disco',
     'save() no relee: el caso 2 vuelve a perder la etiqueta que escribio la otra pestana');
  ok(iAssign < 0 || iFresh < iAssign,
     'la relectura ocurre ANTES de que `this.list` se reasigne (si no, se escribe la copia obsoleta)',
     'save() reasigna this.list y DESPUES relee: el valor escrito es el viejo');
  ok(/typeof mutate === 'function'/.test(cuerpo),
     'save() exige una mutacion: no hay forma de volcar la copia en memoria',
     'save() acepta `save()` sin funcion: la clase de bug vuelve a ser posible');

  // ALCANCE DE ESE ASSERT, medido: una mutacion que hace que `save()` sin
  // argumento escriba `this.list` (el bug original) NO lo detecta, porque hoy
  // NINGUN camino de produccion llama `save()` sin `mutate` — los 4 de un clic
  // pasan la operacion. Se lo declara en vez de dejarlo pasar: un assert que
  // pasa porque el codigo muerto no lo ejercita es una guarda, no una red.
  // La que muerde es la de arriba (la relectura), verificada por mutacion.
}

/* Nota de esta seccion: antes de T1 CONGELABA la forma vieja ("save() escribe
 * this.list sin releer"), y sus 2 asserts se INVIERTEN al aplicar el fix — el
 * mismo patron que la Idea 61 §6. Los asserts que miran el EFECTO (que la
 * cuenta que solo una pestana conoce sobrevive) estan en las secciones 2-4 y no
 * se invierten: son la clase de bug, no la forma. */

/* ═══════════════════════════════════════════════════════════════════════════
   2. POLARIDAD: los 2 casos que el PO reprodujo, medidos contra el codigo real
   ═══════════════════════════════════════════════════════════════════════════ */
section('2. la cuenta que solo UNA pestana conoce, y la etiqueta que solo una escribio');

/* --- Caso 1: B agrega la 28, A renombra la 1 -> la 28 desaparece ----------- */
{
  const { ls, A, B } = dosPestanas(27);
  // B agrega la cuenta 28. El nucleo real de `addOrUpdate` es este push sobre la
  // lista fresca: la envoltura async (validar la key contra la API) es otro
  // asunto y no participa del lost update.
  B.km.save(fresh => fresh.push({ label: 'cuenta 28', value: 'k28' }));

  ok(enDisco(ls).n === 28, 'B agrego la cuenta 28 y el disco tiene 28',
     'el disco tiene ' + enDisco(ls).n);

  // A no se enteró todavía: la escritura de B dispara `storage`, pero el
  // listener corre en el próximo tick del navegador; acá se afirma el estado
  // de partida, que es lo que hace posible el lost update.
  ok(enDisco(ls).n === 28, 'el disco tiene las 28 (estado de partida medido)');

  A.km.rename('k1', 'MAIN-WOW');      // UN CLIC
  const d = enDisco(ls);

  ok(d.n === 28,
     'CASO 1: tras renombrar en A, el disco sigue teniendo las 28',
     'el disco tiene ' + d.n + ': la cuenta que solo B conoce fue pisada por A');
  ok(d.valores.indexOf('k28') >= 0, 'CASO 1: la cuenta 28 SIGUE en el disco',
     'k28 desaparecio: la pestana A escribio sus 27 encima de las 28');
  ok((d.gn.find(k => k.value === 'k1') || {}).label === 'MAIN-WOW',
     'CASO 1: el renombrado de A SI se aplico (no se arreglo perdiendo el cambio propio)',
     'el renombrado de A se perdio: el fix no puede ser "no escribir"');
}

/* --- Caso 2 (el que duele mas): B renombra la 5, A borra la 12 -------------- */
{
  const { ls, A, B } = dosPestanas(27);

  B.km.rename('k5', 'ALT-PVE');
  const trasB = enDisco(ls);
  ok((trasB.gn.find(k => k.value === 'k5') || {}).label === 'ALT-PVE',
     'B renombro la 5 a ALT-PVE', 'el renombrado de B no llego al disco');

  A.km.remove('k12');                 // UN CLIC, en la otra pestaña
  const d = enDisco(ls);
  const k5 = d.gn.find(k => k.value === 'k5');

  ok(d.n === 26, 'CASO 2: el borrado de A se aplico (27 - 1)',
     'el disco tiene ' + d.n + ': el borrado de A se perdio');
  ok(k5 && k5.label === 'ALT-PVE',
     'CASO 2: la 5 sigue llamandose ALT-PVE (la etiqueta de B NO se pierde)',
     'la 5 se llama "' + (k5 && k5.label) + '": el cambio de B fue pisado. ' +
     'La cuenta existe y funciona, asi que esto no se va a notar nunca');
  ok(k5 && k5.tag === 'main',
     'CASO 2: el tag main/alter/f2p de la 5 sobrevive al borrado de la 12',
     'el tag se perdio: es lo que permite ordenar 27 cuentas');
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. LO QUE FALTA: la clase, no el caso (T1 — releer antes de escribir)
   ═══════════════════════════════════════════════════════════════════════════ */
section('3. la clase: la cuenta que solo una pestana conoce SOBREVIVE a un clic de la otra');

{
  const { ls, A, B } = dosPestanas(27);

  B.km.save(fresh => fresh.push({ label: 'cuenta 28', value: 'k28' }));
  ok(enDisco(ls).n === 28, 'preparacion: B agrego la 28', 'el disco tiene ' + enDisco(ls).n);

  // A hace CUALQUIER cosa de un clic. Todas las de la seccion 2 deben dejar
  // la 28 en pie: esta es la asercion de CLASE, no de caso.
  A.km.rename('k1', 'MAIN-WOW');
  A.km.setKeyTag('k2', 'f2p');
  A.km.remove('k3');

  const d = enDisco(ls);
  ok(d.valores.indexOf('k28') >= 0,
     'CLASE: la cuenta que solo B conoce sobrevive a los 3 clics de A',
     'k28 desaparecio tras ' + d.n + ' cuentas: alguien escribio su copia en memoria encima');
  ok((d.gn.find(k => k.value === 'k1') || {}).label === 'MAIN-WOW',
     'CLASE: y el renombrado de A tambien se aplico (no se resuelve descartando el cambio propio)');
  ok((d.gn.find(k => k.value === 'k2') || {}).tag === 'f2p',
     'CLASE: y el tag que puso A tambien esta');
  ok(d.valores.indexOf('k3') < 0, 'CLASE: y el borrado de A tambien se aplico');
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. EL INVARIANTE QUE HACE FALTA, DICHO COMO INVARIANTE
   ═══════════════════════════════════════════════════════════════════════════ */
section('4. escribir una cuenta nunca borra una cuenta que el escritor no conoce');

{
  // Con dos escrituras sobre el mismo store, para TODO escritor de la gn:.
  const { ls, A, B } = dosPestanas(5);
  const conocidasPorA = new Set(A.km.list.map(k => k.value));

  // B escribe una cuenta que A NO conoce. Cuando A escriba, no puede borrarla.
  B.km.save(fresh => fresh.push({ label: 'solo-B', value: 'kB' }));
  ok(enDisco(ls).valores.indexOf('kB') >= 0, 'preparacion: kB esta en disco');

  A.km.rename('k1', 'renombrada');
  const d = enDisco(ls);

  const perdidas = d.valores.filter(v => v !== 'kB' && !conocidasPorA.has(v));
  ok(perdidas.length === 0,
     'INVARIANTE: A no borro ninguna cuenta que no conocia',
     'A perdio: ' + JSON.stringify(perdidas) + ' (A conocia ' + conocidasPorA.size + ')');

  // Y la mitad que NO es de A: lo que A no conocia pero existia antes.
  ok(d.valores.indexOf('kB') >= 0,
     'INVARIANTE: la cuenta de B sigue en disco tras la escritura de A',
     'kB desaparecio. Un lost update no es un dato malo: son dos datos buenos que se pisaron');
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. T2: el `storage` se escucha para la lista (bug invisible -> visible)
   ═══════════════════════════════════════════════════════════════════════════ */
section('5. alguien escucha el evento storage de la lista de cuentas');

{
  const src = fs.readFileSync(path.join(JS, 'app.js'), 'utf8');
  const conStorage = /addEventListener\(\s*['"]storage['"]/.test(src);
  ok(conStorage,
     'app.js escucha el evento `storage`',
     'nadie escucha la lista de cuentas entre pestanas: el cambio es invisible hasta que se pisa');
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. EL ALCANCE REAL: cuantos escritores tiene la gn:, medidos
   ═══════════════════════════════════════════════════════════════════════════ */
section('6. cuantos escritores tiene la clave de la lista de cuentas');

{
  const Writers = [
    ['js/app.js', 'KeyManager.save()'],
    ['js/accounts-panel.js', 'syncAccountTagsToKeys()'],
    ['js/settings-manager.js', 'importApiKeys()'],
  ];
  for (const [f, quien] of Writers) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const n = (src.match(/Storage\.set\(\s*Storage\.STORAGE_KEYS\.ACCOUNT_KEYS/g) || []).length;
    ok(n > 0, f + ' escribe ACCOUNT_KEYS (' + quien + ')',
       'ya no escribe: el alcance de esta idea cambio, hay que volver a medirlo');
  }

  /* --- el LECTOR CRUDO, acotado al CUERPO de la funcion que lo hace ---
   *
   * ALERT-91. Este assert estaba escrito al reves, y de dos formas a la vez:
   *
   * (1) AFIRMABA el bug en vez de forbiddinglo. Decia "es el LECTOR CRUDO" y
   *     por eso solo podia pasar mientras el bug existiera. Un assert que
   *     describe un defecto es una foto, no una red: el dia que se arregla, la
   *     red se apaga. Ahora afirma el INVARIANTE ("no hay lector crudo"), que
   *     es lo que tiene que seguir siendo cierto manana.
   *
   * (2) NO ESTABA ACOTADO AL CUERPO, y por eso matcheaba la PROSA. El unico
   *     match de `/localStorage.getItem\(\s*'gw2_keys'/` en el archivo es la
   *     linea 170, que es el COMENTARIO que describe el fix
   *     (`esto leia la LEGACY a pelo (localStorage.getItem('gw2_keys'))`).
   *     Medido con tools/hb72-probe.js. O sea que el assert paso con el fix
   *     PUESTO, por el texto que anuncia el fix: la forma exacta del fallo que
   *     el propio test ya corrigio en app.js ("los asserts estan acotados al
   *     CUERPO del metodo, no al archivo") y que no aplico 20 lineas mas abajo.
   *
   * La regla que sale es mas general que este caso: un regex que nombra un
   * patron de codigo matchea tambien la FRASE que nombra ese patron. Si el
   * patron esta escrito en el archivo, el assert tiene que acotarse a donde el
   * codigo vive, o va a pasar por construccion.
   *
   * Y acotarse al CUERPO NO ALCANZA, que es lo que se midio. El comentario que
   * documenta el fix esta DENTRO de la funcion (linea 170, tres lineas despues
   * del `try {`), asi que un assert acotado al cuerpo sigue matcheandolo: con
   * el fix PUESTO daba 1 FAIL. Por eso los asserts de esta seccion corren
   * sobre `cuerpoSinComentarios()`: la prosa que nombra un patron no es el
   * patron, y un assert de CODIGO tiene que ser ciego a ella.
   *
   * Nota sobre el helper: es un stripper de comentarios de linea y de bloque,
   * NO un parser de JavaScript. No contempla cadenas multilinea con `//`
   * adentro. MEDIDO en `accounts-panel.js` antes de escribirlo: 71 lineas con
   * `//`, 10 backticks, y **0 backticks pegadas a `//`** (las 10 estan en
   * comentarios o en plantillas `innerHTML` que no contienen `//`). O sea que
   * hoy el caso limite no se da, y es unaLimitacion DECLARADA, no una
   * garantia: si el archivo crece hasta ese caso, este helper es lo primero
   * que hay que revisar.
   */
  const ap = fs.readFileSync(path.join(ROOT, 'js/accounts-panel.js'), 'utf8');
  const iSync = ap.indexOf('function syncAccountTagsToKeys');
  const cuerpoSync = iSync >= 0 ? cuerpoSinComentarios(cuerpoDeMetodo(ap, iSync)) : '';
  ok(cuerpoSync.length > 0,
     'se encontro el cuerpo de syncAccountTagsToKeys() para poder acotar el assert',
     'el helper no devolvio nada: el assert de abajo no estaria probando nada');
  ok(!/localStorage\.getItem\(\s*CONFIG\.STORAGE_KEYS_KEYS|localStorage\.getItem\(\s*'gw2_keys'/.test(cuerpoSync),
     'syncAccountTagsToKeys() NO lee la legacy a pelo: el LECTOR CRUDO esta prohibido (Idea 61 §6)',
     'vuelve a leer la legacy por localStorage: es el LECTOR CRUDO, el unico que se saltaria el espejo');

  // Y la mitad de la Idea 64 que el fix habilita: escribe por la API, que
  // escribe la gn: Y su legacy. Sin esto, el "arreglo" del LECTOR CRUDO
  // dejaria la gn: con la foto del primer arranque, que es el bug de la 61.
  ok(/Storage\.set\(\s*Storage\.STORAGE_KEYS\.ACCOUNT_KEYS/.test(cuerpoSync),
     'syncAccountTagsToKeys() ESCRIBE por Storage (que espeja gn: <- legacy)',
     'escribe por localStorage: la gn: se queda con la foto del primer arranque (Idea 61)');
}

console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
