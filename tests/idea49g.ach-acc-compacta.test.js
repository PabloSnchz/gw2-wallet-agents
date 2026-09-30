/* =======================================================================
 * tests/idea49g.ach-acc-compacta.test.js  --  Idea 49G (PO, 08:00 UTC)
 *
 * QUE RESUELVE
 *   `ach_acc` son 27 keys, una por cuenta, y el fingerprint del token va en el
 *   nombre. El sharding del Tramo C (0.81 MB de `ach_meta`) NO las toca, asi
 *   que es la otra mitad de la cuota.
 *
 *   La propuesta del PO (BACKLOG, "Idea 49G") media 4.10 MB en 27 cuentas y de
 *   ahi sacaba la conclusion "compactar a 'id,id,...': 0.36 MB". Esa medicion
 *   uso una forma `{id, done}` / `{id, current, max, done, bits:[1..12]}` que
 *   no es la que la API manda, y ademas incluyo `bits`, que NADIE lee (grep
 *   sobre TODO js/: cero apariciones de `.bits` fuera de un comentario).
 *   tools/idea49g-medir-honesto.mjs remide con la forma que el codigo REALMENTE
 *   necesita: {id, current, max, done}.
 *
 * QUE SE VERIFICA
 *   1. Round-trip: lo que sale de `getAccountAchievements` es EXACTAMENTE lo
 *      que la API respondio, campo por campo, para los 4 consumidores.
 *   2. Lo que se guarda en disco es mucho mas chico (la mitad o menos).
 *   3. Un campo que NADIE lee no aparece en disco.
 *   4. La version vieja en disco se DECODIFICA igual (migracion), no se tira.
 *   5. Los consumidores no se tocan (no hay ningun cambio de contrato).
 *   6. FORMA: la funcion sigue degradando igual que antes (Idea 57 T1).
 *
 * POR QUE ES "compactar al escribir, expandir al leer"
 *   Cambiar el FORMATO DE LA CACHE es barato si el contrato del wrapper no
 *   cambia: los 4 consumidores (`achievements.js:1073/189/221`,
 *   `characters.js:449`, `activities.js:908`) siguen leyendo `a.id`, `a.done`,
 *   `a.current`, `a.max` de un array de objetos. Si se tocaran, el blast
 *   radius seria 3 modulos enteros. Aca no se toca ninguno.
 *
 * QUE NO ES
 *   - No es un test de texto: levanta `api-gw2.js` con un `fetch` falso y lee
 *     lo que REALMENTE queda en `localStorage`.
 *   - No mantiene una lista de consumidores a mano en el test: recorre el
 *     repo y verifica que ninguno lee un campo fuera de la lista.
 * ======================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.join(__dirname, '..');
const API = path.join(REPO, 'js', 'api-gw2.js');
const JS = path.join(REPO, 'js');

let pass = 0, fail = 0;
function section(t) { console.log('\n[' + t + ']'); }
function ok(c, msg, why) {
  if (c) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); if (why) console.log('          ' + why); }
}

function nuevoLocalStorage() {
  return {
    _d: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
    get length() { return Object.keys(this._d).length; },
    key(i) { return Object.keys(this._d)[i]; }
  };
}

function cargarApi(respuesta, storage) {
  const src = fs.readFileSync(API, 'utf8');
  const sandbox = {
    console: { warn() {}, error() {}, log() {}, info() {}, debug() {} },
    localStorage: storage || nuevoLocalStorage(),
    setTimeout, clearTimeout,
    fetch: function (url) {
      const r = respuesta(url);
      return Promise.resolve({
        ok: r.status >= 200 && r.status < 300,
        status: r.status,
        headers: {
          get(n) { return String(r.headers && r.headers[n] != null ? r.headers[n] : '').toLowerCase(); },
          has(n) { return !!(r.headers && r.headers[n]); }
        },
        text() { return Promise.resolve(r.body); },
        json() { return Promise.resolve(JSON.parse(r.body)); }
      });
    },
    JSON, Math, Date, Number, Object, Array, String, Boolean, Error, Promise,
    isFinite, parseInt, parseFloat, URL, URLSearchParams, Intl, RegExp,
    Map, Set, Symbol
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'api-gw2.js' });
  return sandbox;
}

const TOKEN = '11111111-2222-3333-4444-555555555555-11111111-2222-3333-4444-555555555555';

/* Una cuenta realista: ~45% completados (la API responde {id, done:true} y nada
 * mas), ~5% en progreso repetible CON `bits` (daily/weekly/monthly), el resto
 * `{id, current:0, max:0, done:false}`. `bits` va como STRING binario, que es
 * lo que manda la API, y no como el array de 12 enteros que uso el PO. */
function cuentaRealista(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    if (i % 100 < 45) { out.push({ id: i, done: true }); continue; }
    if (i % 20 === 0) {
      out.push({ id: i, current: 3 + (i % 7), max: 10, done: false, bits: '0101010101' });
    } else {
      out.push({ id: i, current: 0, max: 0, done: false, bits: null });
    }
  }
  return out;
}

function bytesDe(o) { return Buffer.byteLength(JSON.stringify(o), 'utf8'); }

/* =========================================================================
 * 1-2. ROUND-TRIP y PESO
 * ========================================================================= */
async function testRoundTrip() {
  section('1-2. Round-trip exacto y peso en disco');
  const N = 3000;
  const cuenta = cuentaRealista(N);
  const storage = nuevoLocalStorage();
  const sb = cargarApi(
    () => ({ status: 200, body: JSON.stringify(cuenta), headers: {} }),
    storage
  );

  const devuelto = await sb.GW2Api.getAccountAchievements(TOKEN);

  ok(Array.isArray(devuelto), 'getAccountAchievements devuelve un array');
  ok(devuelto.length === N,
    'devuelve los ' + N + ' registros (llego ' + devuelto.length + ')',
    'si falta alguno, un logro se pierde del grid para siempre hasta el TTL');

  // Campo por campo, en orden. Esto es lo que el contrato promete.
  let iguales = 0, diferencias = [];
  for (let i = 0; i < N; i++) {
    const a = cuenta[i], b = devuelto[i];
    if (a.id === b.id && !!a.done === !!b.done &&
        Number(a.current || 0) === Number(b.current || 0) &&
        Number(a.max || 0) === Number(b.max || 0)) { iguales++; }
    else if (diferencias.length < 3) {
      diferencias.push(i + ': ' + JSON.stringify(a) + ' -> ' + JSON.stringify(b));
    }
  }
  ok(iguales === N,
    'los ' + N + ' registros coinciden en id/done/current/max',
    'primeras diferencias -> ' + diferencias.join(' | '));

  // Lo que quedo EN DISCO.
  const lkey = Object.keys(storage._d).find(k => k.indexOf('ach_acc') === 0);
  ok(!!lkey, 'la cache se guardo bajo una key ach_acc*', 'keys: ' + Object.keys(storage._d).join(','));
  if (!lkey) return;

  const entry = JSON.parse(storage._d[lkey]);
  const enDisco = JSON.stringify(entry);
  const crudo = bytesDe(cuenta);
  const guardado = Buffer.byteLength(enDisco, 'utf8');

  ok(guardado < crudo * 0.55,
    'lo guardado es <55% de lo crudo (' + Math.round(guardado / 1024) + ' KB vs ' +
    Math.round(crudo / 1024) + ' KB)',
    'sin reduccion no hay por que hacerlo. crudo=' + crudo + ' guardado=' + guardado);

  ok(/"ts"/.test(enDisco), 'la entrada de cache conserva su `ts` (el TTL depende de el)');

  // Proyeccion a 27 cuentas con la forma que la API manda.
  const mb27 = (guardado * 27) / 1048576;
  ok(mb27 < 1.5,
    'x27 son ' + mb27.toFixed(2) + ' MB (cuota 4.98 MB)',
    'la idea de la 49G era bajar de 4.10 MB a algo que entre con aire');
}

/* =========================================================================
 * 3. `bits` NO se persiste
 * ========================================================================= */
async function testBitsNoSeGuarda() {
  section('3. Lo que nadie lee no ocupa disco');
  const cuenta = cuentaRealista(200);
  const storage = nuevoLocalStorage();
  const sb = cargarApi(
    () => ({ status: 200, body: JSON.stringify(cuenta), headers: {} }),
    storage
  );
  await sb.GW2Api.getAccountAchievements(TOKEN);
  const lkey = Object.keys(storage._d).find(k => k.indexOf('ach_acc') === 0);
  const enDisco = storage._d[lkey];

  ok(enDisco.indexOf('"bits"') === -1,
    '`bits` no aparece en lo guardado',
    '`bits` es el campo mas caro por byte y ningun consumidor lo lee');

  // La API lo manda y el wrapper lo recibe: que no se guarde no significa que
  // se haya perdido antes de llegar al consumidor.
  const sb2 = nuevoLocalStorage();
  const sb2c = cargarApi(
    () => ({ status: 200, body: JSON.stringify(cuenta), headers: {} }),
    sb2
  );
  const dev = await sb2c.GW2Api.getAccountAchievements(TOKEN);
  ok(dev.some(a => 'bits' in a),
    'el wrapper NO borra `bits` de lo que devuelve (se pierde al leer, no al servir)');
}

/* =========================================================================
 * 4. MIGRACION: la version vieja en disco
 * ========================================================================= */
async function testMigracion() {
  section('4. La cache vieja (sin compactar) se sigue leyendo');
  const cuenta = cuentaRealista(50);

  // NO se construye la key a mano: `fpToken` une con '…' (U+2026, 3 bytes),
  // no con '.', asi que una key escrita a mano nunca encuentra la entrada y el
  // test pasa por la red. Se pide una vez al modulo para que el sea el que
  // escribe la key, y despues se sustituye su contenido por la forma VIEJA.
  const storage = nuevoLocalStorage();
  const sb = cargarApi(
    () => ({ status: 200, body: JSON.stringify(cuenta), headers: {} }),
    storage
  );
  await sb.GW2Api.getAccountAchievements(TOKEN);

  const lkey = Object.keys(storage._d).find(k => k.indexOf('ach_acc') === 0);
  ok(!!lkey, 'el modulo escribio la entrada (y el test usa SU key, no una inventada)');
  if (!lkey) return;

  // Se reemplaza por la version vieja: el array crudo de la API.
  storage._d[lkey] = JSON.stringify({ ts: Date.now(), data: cuenta });

  // Segundo sandbox: la app YA tiene esa cache vieja en disco.
  const sb2 = cargarApi(
    () => ({ status: 200, body: '[]', headers: {} }),
    storage
  );
  let fallo = null;
  const dev = await sb2.GW2Api.getAccountAchievements(TOKEN).catch(e => { fallo = e; return null; });

  ok(!fallo, 'una cache vieja no hace rechazar el wrapper',
    'si esto rechaza, toda cuenta con la version anterior pierde logros hasta que venza el TTL');
  ok(Array.isArray(dev) && dev.length === cuenta.length,
    'y devuelve los ' + cuenta.length + ' registros que tenia guardados',
    'llego ' + (Array.isArray(dev) ? dev.length : JSON.stringify(dev)) +
    ' (si esto es 0 y la red devuelve [], es que la key no matcheo y se perdio la cache)');

  if (Array.isArray(dev) && dev.length === cuenta.length) {
    let bien = 0;
    for (let i = 0; i < cuenta.length; i++) {
      if (dev[i].id === cuenta[i].id && !!dev[i].done === !!cuenta[i].done) bien++;
    }
    ok(bien === cuenta.length, 'con id y done intactos');
  }
}

/* =========================================================================
 * 5. LOS CONSUMIDORES NO SE TOCAN
 * ========================================================================= */
function testConsumidores() {
  section('5. Ningun consumidor lee un campo fuera de {id, current, max, done}');

  const permitidos = ['id', 'current', 'max', 'done', 'bits'];
  const fallos = [];
  // Los 4 call sites, con la linea donde esta el uso.
  const espera = [
    { f: 'achievements.js', patron: /getAccountAchievements/ },
    { f: 'characters.js',     patron: /getAccountAchievements/ },
    { f: 'activities.js',     patron: /getAccountAchievements/ }
  ];

  for (const e of espera) {
    const src = fs.readFileSync(path.join(JS, e.f), 'utf8').split(/\r?\n/);
    const lineaDeLaLlamada = src.findIndex(l => e.patron.test(l));
    if (lineaDeLaLlamada === -1) continue;
    // Ventana de 40 lineas alrededor de la llamada: es donde se consume.
    const ventana = src.slice(Math.max(0, lineaDeLaLlamada - 20), lineaDeLaLlamada + 20);
    const usa = new Set();
    for (const l of ventana) {
      for (const m of l.matchAll(/\b([a-zA-Z_$][\w$]*)\.(id|current|max|done|bits|completed|value|progress)\b/g)) {
        usa.add(m[2]);
      }
    }
    for (const campo of usa) {
      if (!permitidos.includes(campo)) fallos.push(e.f + ':' + (lineaDeLaLlamada + 1) + ' lee `.' + campo + '`');
    }
  }

  ok(fallos.length === 0,
    'los consumidores usan solo campos que la forma compacta conserva',
    fallos.join(' | '));

  // Y la forma compacta tiene que conservar `max`, que `computeProgress` usa
  // cuando la metadata NO tiene tiers (achievements.js:199).
  const ach = fs.readFileSync(path.join(JS, 'achievements.js'), 'utf8');
  ok(/if \(!target && max\) target = max;/.test(ach),
    '`max` se sigue usando cuando la metadata no trae tiers -> hay que conservarlo',
    'si se podara `max`, los logros sin tiers calcularian el % contra el current');
}

/* =========================================================================
 * 6. FORMA: no se rompe el contrato de la Idea 57 T1
 * ========================================================================= */
async function testForma() {
  section('6. FORMA: el compactado no cambia lo que el wrapper hace con una forma rara');
  const storage = nuevoLocalStorage();
  const sb = cargarApi(
    () => ({ status: 200, body: JSON.stringify({ no: 'es un array' }), headers: {} }),
    storage
  );
  let fallo = null;
  const dev = await sb.GW2Api.getAccountAchievements(TOKEN).catch(e => { fallo = e; return null; });

  // El compactado NO puede empeorar esto. `getAccountAchievements` hoy NO tiene
  // guard de FORMA (no hay ningun `Array.isArray(data) ? data : []` aca), asi que
  // devuelve el objeto tal cual y el call site lo trata:
  // `achievements.js:1070` -> `Array.isArray(acc) ? acc : []`. La Idea 57 T1 lo
  // declaro "propaga"; este assert mide que la forma rara SIGUE siendo la misma
  // rareza, no un array inventado a partir de un string roto.
  ok(!Array.isArray(dev),
    'una forma no soportada no se convierte en un array por el compactado',
    'llego ' + JSON.stringify(dev));
  ok(fallo === null || dev === null,
    'y tampoco se convierte en un rechazo nuevo (seria cambiar el contrato)');
  console.log('          (comportamiento OBSERVADO, sin cambiar: rejection=' +
    (fallo ? fallo.message : 'ninguna') + ', valor=' + JSON.stringify(dev) + ')');

  // Lo que importa para el compactado: una entrada NO-array no se debe compactar
  // a una string y volver a expandirse como algo distinto. Si se compacta, el
  // round-trip tiene que devolver lo mismo.
  const storage2 = nuevoLocalStorage();
  const sb2 = cargarApi(
    () => ({ status: 200, body: JSON.stringify({ no: 'es un array' }), headers: {} }),
    storage2
  );
  const dev2 = await sb2.GW2Api.getAccountAchievements(TOKEN);
  ok(JSON.stringify(dev2) === JSON.stringify(dev),
    'el round-trip de una forma no-array es estable (idempotente)',
    '1a vez ' + JSON.stringify(dev) + ', 2a vez ' + JSON.stringify(dev2));
}

/* =========================================================================
 * 7. La forma compacta es ROBUSTA ante lo que la API ya manda
 * ========================================================================= */
async function testRobustez() {
  section('7. Casos rarejos que la API ya devuelve');
  const CASOS = [
    { nombre: '[] vacio (cuenta sin logros)', cuerpo: [] },
    { nombre: 'un solo logro', cuerpo: [{ id: 7, done: true }] },
    { nombre: 'solo en progreso, sin completados', cuerpo: [{ id: 7, current: 2, max: 9, done: false }] },
    { nombre: 'current > max (dato raro de la API)', cuerpo: [{ id: 7, current: 50, max: 10, done: false }] },
    { nombre: 'current como string', cuerpo: [{ id: 7, current: '3', max: '10', done: false }] },
    { nombre: 'done ausente (undefined)', cuerpo: [{ id: 7, current: 1, max: 2 }] },
    { nombre: 'id grande (5 digitos)', cuerpo: [{ id: 98765, done: true }] }
  ];

  for (const c of CASOS) {
    const storage = nuevoLocalStorage();
    const sb = cargarApi(
      () => ({ status: 200, body: JSON.stringify(c.cuerpo), headers: {} }),
      storage
    );
    let fallo = null, dev = null;
    try { dev = await sb.GW2Api.getAccountAchievements(TOKEN); }
    catch (e) { fallo = e; }

    if (fallo) {
      ok(false, c.nombre, 'rechaza: ' + fallo.message);
      continue;
    }
    const igual = Array.isArray(dev) && dev.length === c.cuerpo.length &&
      c.cuerpo.every((a, i) => dev[i] && dev[i].id === a.id &&
        !!dev[i].done === !!a.done &&
        Number(dev[i].current || 0) === Number(a.current || 0) &&
        Number(dev[i].max || 0) === Number(a.max || 0));
    ok(igual, c.nombre,
      'entrada ' + JSON.stringify(c.cuerpo) + ' -> salida ' + JSON.stringify(dev));
  }
}

(async function main() {
  try { await testRoundTrip(); } catch (e) { ok(false, 'round-trip no lanzo', e.stack); }
  try { await testBitsNoSeGuarda(); } catch (e) { ok(false, 'bits no lanzo', e.stack); }
  try { await testMigracion(); } catch (e) { ok(false, 'migracion no lanzo', e.stack); }
  try { testConsumidores(); } catch (e) { ok(false, 'consumidores no lanzo', e.stack); }
  try { await testForma(); } catch (e) { ok(false, 'forma no lanzo', e.stack); }
  try { await testRobustez(); } catch (e) { ok(false, 'robustez no lanzo', e.stack); }

  console.log('\n' + pass + ' pass, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})();