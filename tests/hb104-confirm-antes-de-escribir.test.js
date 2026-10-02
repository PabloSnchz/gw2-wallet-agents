/*! tests/hb104-confirm-antes-de-escribir.test.js
 *
 * HB#104 — Cancelar un restore de configuracion NO puede dejar los datos escritos.
 *
 * ─── El defecto, medido en `origin/main` @ `7002e78` ────────────────────────
 *
 *   settings-manager.js:463   await importFromFile(file)   <--LEE Y ESCRIBE
 *   settings-manager.js:393-399   las 7 escrituras (apiKeys, wv, wallet,
 *                                 activities, characters, meta, global)
 *   settings-manager.js:477   if (confirm(confirmMsg))     <--PREGUNTA
 *   settings-manager.js:486   reject('Importacion cancelada')
 *
 * El `confirm` estaba DESPUES de las 7 escrituras. Consecuencia, medida leyendo
 * el flujo y no suponiendola: si Pablo elige "Cancelar", `importAll` hace
 * `reject` y la pagina dice que no se importo nada — pero `ACCOUNT_KEYS`,
 * `ACCOUNT_SELECTED`, WV, wallet, activities, characters, meta y global ya
 * estan sobreescritos en `localStorage`. **Cancelar era indistinguible de
 * aceptar**, y el estado anterior ya no existia para volver atras.
 *
 * Por que el camino del Gist no lo tenia: `gist-sync.js:451` confirma y `:452`
 * importa, o sea ahi siempre fue correcto. Solo el de archivo estaba invertido, y
 * por eso es un descuido y no una decision de diseno.
 *
 * ─── Por que NO se "mueve el confirm" ──────────────────────────────────────
 *
 * `importFromFile` es API PUBLICA (`SettingsManager.importFromFile`, `:644`) y su
 * contrato documentado es "leer y aplicar de una". Meterle un confirm adentro le
 * cambia el contrato a todos los call sites. El fix parte la RESPONSABILIDAD:
 * `readImportFile` lee y valida SIN escribir, `applyImportData` aplica, y el
 * llamador decide el medio. `importFromFile` queda igual, porque hay call sites
 * que la usan como "leer y aplicar de una".
 *
 * ─── QUE MIDE ESTE ARCHIVO ─────────────────────────────────────────────────
 *
 * No mira la FORMA del codigo (que `readImportFile` exista): mira el EFECTO. Monta
 * `settings-manager.js` real en un `vm` con un `Storage` que REGISTRA cada
 * `set`, corre `importAll()` con un `confirm` que dice NO, y afirma que no se
 * escribio ni una clave. Esa es la unica forma de comprobar un bug de ORDEN: un
 * grep no puede distinguir "escribo despues" de "escribo antes".
 *
 * ─── EL CONTROL, Y POR QUE ESTA PRIMERO ────────────────────────────────────
 *
 * Se corre el MISMO arnes contra el bloque VIEJO (reconstruido en el test desde
 * el mismo archivo, con el fix revertido). Si el control no falla, este archivo no
 * sabe ver el defecto y su veredicto sobre el codigo sano no vale nada: seria un
 * arnes que dice "OK" siempre. Ya paso dos veces en el equipo (ALERT-96/124).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const RUTA = path.join(ROOT, 'js', 'settings-manager.js');
const srcReal = fs.readFileSync(RUTA, 'utf8');

let pass = 0, fail = 0;
const fallos = [];
function ok(cond, msg, why) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else {
    fail++;
    fallos.push(msg);
    console.log('  FAIL  ' + msg + (why ? '\n          -> ' + why : ''));
  }
}
function section(t) { console.log('\n[' + t + ']'); }

/**
 * Monta `settings-manager.js` en un vm con un Storage que REGISTRA las
 * escrituras, y devuelve las escrituras mas las funciones publicas.
 *
 * El `FileReader` es el unico global que hay que falsear de verdad: el resto
 * (localStorage, document, confirm, toast) se puede resolver con stubs, porque
 * `importAll` no los usa todavia cuando `confirm` dice NO.
 */
function montar(src, opts) {
  const opts2 = opts || {};
  const escrituras = [];
  const archivo = JSON.stringify({
    version: '3.0',
    app: 'gw2-wallet-ligero',
    data: {
      apiKeys: { list: [{ label: 'DE-LA-PRUEBA', value: 'CLAVE-DE-LA-PRUEBA' }], selected: 'CLAVE-DE-LA-PRUEBA' },
      wv: { seasonIndex: 3, seasons: {} },
      wallet: { pins: ['w1'] },
      activities: { toggles: { a1: true } },
      characters: { pois: { c1: ['p1'] } },
      meta: { favoritos: ['m1'] },
      global: { welcomeSeen: true },
    },
  });

  const sandbox = {
    // `info` tambien: `init()` lo llama al final (`settings-manager.js:634`) y
    // el autoarranque del IIFE dispara `init()` porque `document.readyState` ya
    // es 'complete'. La primera version del arnesDefining stub lo omitio y el
    // es 'complete'. La primera version del arnes omitio info() y el sandbox
    // revento con: TypeError: console.info is not a function.
    console: { log() {}, warn() {}, error() {}, info() {}, debug() {} },
    setTimeout() {},          // no queremos el location.reload() del caso "si"
    clearTimeout() {},
    localStorage: {
      getItem(k) { return null; },
      setItem(k, v) { escrituras.push([k, v]); },
      removeItem() {},
    },
    Storage: {
      STORAGE_KEYS: {
        ACCOUNT_KEYS: 'gn:accounts',
        ACCOUNT_SELECTED: 'gn:accounts:selected',
        WV_SEASON_INDEX: 'gn:wv:season',
        WV_PINNED: 'gn:wv:pins',
        WALLET_PINS: 'gn:wallet:pins',
        WALLET_COMPACT: 'gn:wallet:compact',
        WALLET_SNAPSHOTS: 'gn:wallet:snapshots',
        ACTIVITIES_TOGGLES: 'gn:activities:toggles',
        ACTIVITIES_HOME_NODES: 'gn:activities:home',
        CHARACTERS_POIS: 'gn:characters:pois',
        CHARACTERS_LOCATIONS: 'gn:characters:locations',
        META_FAVORITES: 'gn:meta:favorites',
    META_DONE_TODAY: 'gn:meta:done',
        WELCOME_SEEN: 'gn:welcome:seen',
      },
      get() { return null; },
      set(k, v) { escrituras.push([k, v]); },
      remove() {},
    },
    // El `confirm` que decide. Por defecto NO, que es el escenario del bug.
    confirm: function (msg) {
      sandbox.__confirmVisto = msg;
      return opts2.confirm === true;
    },
    // `FileReader` minimo: entrega el archivo valido y dispara `onload` en el
    // siguiente tick, como el de verdad.
    FileReader: function () {
      this.onload = null; this.onerror = null;
      this.readAsText = function () {
        const self = this;
        Promise.resolve().then(function () {
          if (self.onload) self.onload({ target: { result: archivo } });
        });
      };
    },
    document: {
      readyState: 'complete',
      createElement() {
        return {
          type: '', accept: '', onclick: null, files: [],
          click() {
            // El input.onchange corre asincrono, como el input real.
            const self = this;
            Promise.resolve().then(function () {
              if (self.onchange) self.onchange({ target: { files: [{}] } });
            });
          },
        };
      },
      addEventListener() {},
      // bindButtons() (init - llama getElementById en 2 botones y les
      // pone listener. Devolver null es lo que hace el DOM antes de que existan:
      // bindButtons tiene que tolerarlo, y si no lo tolera, el defecto seria del
      // arnes y no del codigo. La 2a version del arnes omitio esto.
      getElementById() { return null; },
    },
    location: { reload() { sandbox.__reload = true; } },
    Analytics: undefined,
    promiseTick: null,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  const ctx = vm.createContext(sandbox);
  vm.runInContext(src, ctx, { filename: 'settings-manager.js' });
  return { escrituras, sandbox, SM: sandbox.SettingsManager };
}

// El cuerpo de `importAll` como promise: corre el flujo hasta el confirm.
function correrImportAll(montaje) {
  return montaje.SM.importAll().then(
    function (r) { return { ok: true, r }; },
    function (e) { return { ok: false, err: e }; }
  );
}

// ===========================================================================
section('1. CONTROL NEGATIVO: el arnes tiene que ver el defecto en el codigo VIEJO');
// Si esto pasa sin fallar, el arnes no sabe mirar y todo lo de mas vale nada.
{
  // NO se reconstruye la version vieja del archivo "a mano". Se intento y es
  // un error de construccion, no una medicion (ver el comentario de mas
  // abajo). Ademas resulto ser IMPOSIBLE que esos replacesVERSEan algo, y
  // no por la indentacion: `js/settings-manager.js` es CRLF y los tres
  // patrones terminaban en `\n`, asi que los 3 eran no-op silenciosos. Medido
  // (HB#105): (a2) con 12 espacios NO matchea, con 10 tampoco; (b1), (b2) y
  // (b3) NO matchean; el unico que matchea es el replace de cadena literal
  // (a1). O sea que este bloque no producia una version vieja: producia el
  // MISMO archivo. Un mutador que no matchea no mide nada, y encima exige
  // una asercion que no puede pasar.
  //
  // CONTROL real: el bug se inyecta en el archivo REAL con el cambio minimo
  // que lo reproduce. Solo UNA linea: el llamador vuelve a leer-Y-aplicar, y
  // el apply se queda adentro del confirm. Es exactamente el defecto
  // original, y el fix sigue presente en el resto del archivo.
  const conBug = srcReal
    .replace('var importData = await readImportFile(file);', 'var importData = await importFromFile(file);');
  ok(conBug !== srcReal, 'el bug se puede inyectar con un cambio minimo (readImportFile -> importFromFile)');

  montar(srcReal);
  const mViejo = montar(conBug);
  return correrImportAll(mViejo).then(function (res) {
    ok(res.ok === false, 'el control: con el bug, el flujo termina en reject (Importacion cancelada)');
    ok(res.err && /cancelada/i.test(res.err.message),
      'el control: el motivo del reject es la cancelacion',
      'motivo=' + (res.err && res.err.message));
    ok(mViejo.escrituras.length > 0,
      'CONTROL: el bug PRODUCE escrituras a Storage pese a cancelar',
      'escrituras=' + JSON.stringify(mViejo.escrituras.map(e => e[0])));

    // ---- Y el codigo sano, en el mismo arnes, tiene que dar 0 ------------
    section('2. El caso real: con confirm = NO, NO se escribe NADA');
    const mSano = montar(srcReal);
    return correrImportAll(mSano).then(function (res2) {
      ok(res2.ok === false, 'con confirm NO, el flujo termina en reject');
      ok(res2.err && /cancelada/i.test(res2.err.message),
        'con confirm NO, el motivo es la cancelacion (el usuario ve el mismo error de siempre)');
      ok(mSano.escrituras.length === 0,
        'CONFIRMAR NO deja CERO escrituras a Storage',
        'escrituras=' + JSON.stringify(mSano.escrituras.map(e => e[0])));

      ok(/Restaurar/.test(mSano.sandbox.__confirmVisto || ''),
        'el confirm se SIGUE mostrando (el fix no quito la pregunta)',
        'visto=' + JSON.stringify((mSano.sandbox.__confirmVisto || '').slice(0, 40)));

      section('3. El otro lado: con confirm = SI, se escribe (el fix no rompio el restore)');
      const mSi = montar(srcReal, { confirm: true });
      return correrImportAll(mSi).then(function (res3) {
        ok(res3.ok === true, 'con confirm SI, el flujo resuelve');
        ok(mSi.escrituras.length > 0, 'con confirm SI, HAY escrituras (el restore sigue funcionando)',
          'escrituras=' + JSON.stringify(mSi.escrituras.map(e => e[0])));
        const fam = mSi.escrituras.map(e => String(e[0]));
        ok(fam.some(k => /accounts/.test(k)), 'se escribieron las API keys', fam.join(','));
        ok(fam.length >= 7, 'se escribieron las 7 familias o mas (contadas, no supuestas)',
          'n=' + fam.length);

        section('4. Contrato de la API publica: importFromFile sigue aplicando');
        // El contrato NO cambia: quien la llama como "leer y aplicar de una"
        // sigue escribiendo. Si esto fallara, el fix habia roto callers.
        const m4 = montar(srcReal);
        return m4.SM.importFromFile({})
          .then(function () {
            ok(m4.escrituras.length > 0,
              'importFromFile (API publica) sigue leyendo Y aplicando, sin preguntar',
              'escrituras=' + JSON.stringify(m4.escrituras.map(e => e[0])));
            ok(/readImportFile/.test(srcReal), 'readImportFile existe');
            ok(/applyImportData/.test(srcReal), 'applyImportData existe');

            section('5. El orden en el fuente: el apply esta DENTRO del confirm');
            // Acotado al CUERPO de importAll. La 1a version buscaba la PRIMERA
            // ocurrencia en el archivo entero y por eso encontraba la de
            // importFromFile (:423) -- que existe a proposito, porque ese es el
            // call site que mantiene el contrato 'leer y aplicar de una'. El
            // FAIL era de la ASERCION, no del fix. Un grep del archivo entero
            // no puede preguntar por un orden que es de UNA funcion: por eso
            // hay que recortar el cuerpo primero.
            const cuerpoImportAll = (function () {
              const i0 = srcReal.indexOf('async function importAll()');
              if (i0 < 0) return '';
              let depth = 0;
              for (let k = srcReal.indexOf('{', i0); k < srcReal.length; k++) {
                if (srcReal[k] === '{') depth++;
                else if (srcReal[k] === '}') { depth--; if (depth === 0) return srcReal.slice(i0, k + 1); }
              }
              return '';
            })();
            ok(cuerpoImportAll.length > 0, 'se encontro y recorto el cuerpo de importAll');
            ok(!/await importFromFile\(file\)/.test(cuerpoImportAll),
              'importAll NO lee con importFromFile (que escribe), lee con readImportFile');
            ok(/await readImportFile\(file\)/.test(cuerpoImportAll),
              'importAll lee con readImportFile (que no escribe)');
            const lineas = cuerpoImportAll.split('\n');
            const lineaApply = lineas.findIndex(l => /^\s*applyImportData\(importData\);/.test(l));
            const lineaConfirm = lineas.findIndex(l => /if \(confirm\(confirmMsg\)\)/.test(l));
            ok(lineaApply > lineaConfirm && lineaApply >= 0 && lineaConfirm >= 0,
              'applyImportData se llama DESPUES del if (confirm(...)) DENTRO de importAll',
              'apply@' + (lineaApply + 1) + ' confirm@' + (lineaConfirm + 1));

            console.log('\n' + pass + ' aserciones, ' + fail + ' FAIL');
            if (fallos.length) {
              console.log('FALLAS:');
              fallos.forEach(f => console.log('  - ' + f));
            }
            process.exitCode = fail ? 1 : 0;
          })
          .catch(function (e) { console.log('  FAIL  importFromFile lanzo: ' + e.message); process.exitCode = 1; });
      });
    });
  });
}