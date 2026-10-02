/*
 * T20-a — el confirm del Gist tiene que decir lo mismo que el del archivo.
 *
 * QUE MIDE: el texto EXACTO que downloadAndSync() le pasa a confirm(), con el
 * js/gist-sync.js de este worktree cargado VERBATIM. No reimplementa
 * downloadAndSync: si el mensaje del repo cambia, el test se entera, porque lo
 * lee del archivo real y solo se intervene para destrabar el guard de token.
 *
 * PRECEDENTE que se copia: settings-manager.js:594-603 (el confirm del archivo
 * ya lista las 7 familias con la cifra de API keys).
 *
 * CRITERIO: el TEXTO. Si el criterio fuera "que sea largo" no discriminaria, y
 * el caso de 12 vs 27 es el que prueba que la cifra sale del remoto y no es
 * una constante.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '..');
const RAW = fs.readFileSync(path.join(REPO, 'js', 'gist-sync.js'), 'utf8');

// Unico cambio al fuente: se saltea el guard de token, que es criptografia y
// no es lo que esta bajo prueba. Se cuenta y se verifica que hubo 1.
// Anclado a la firma de downloadAndSync: hay 5 guardas `if (!state.token)` en
// el archivo (lineas 234/271/297/384/421) y sin ancla el replace pega en la
// primera, que no es la de esta funcion.
let patched = 0;
const SRC = RAW.replace(
  /(async function downloadAndSync\(\) \{\s*)if \(!state\.token\) \{[\s\S]{0,160}?\n\s*\}/,
  function (_m, head) {
    patched++;
    return head + "state.token = 'stub';";
  }
);

let pass = 0, fail = 0;
const failures = [];
function assert(cond, name) {
  if (cond) { pass++; console.log('  pass  ' + name); }
  else { fail++; failures.push(name); console.log('  FAIL  ' + name); }
}

function makeKeys(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ id: 'k' + i, name: 'Key ' + i, value: 'x' });
  return out;
}

async function captureConfirm(nRemoteKeys) {
  const confirmCalls = [];
  const sandbox = {
    console: { log(){}, warn(){}, error(){}, info(){}, debug(){} },
    setTimeout(){ return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){},
    location: { reload(){} },
    localStorage: {
      getItem: function (k) { return k === 'gh_gist_id' ? 'gist-stub' : null; },
      setItem(){}, removeItem(){}
    },
    crypto: { getRandomValues: function (a) { return a; }, subtle: {} },
    TextEncoder, TextDecoder, Uint8Array, Int8Array, ArrayBuffer, DataView,
    Promise, Date, JSON, Math, Object, Array, String, Number, Boolean, Error,
    RegExp, isNaN, parseInt, parseFloat, btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    alert(){}, prompt(){ return null; },
    confirm: function (msg) { confirmCalls.push(msg); return true; },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;

  // SettingsManager stub: NO es lo que esta bajo prueba (eso settings-manager
  // y el arnes del PO). Va porque si el confirm se moviera despues del import,
  // este harness debe FALLAR y no seguir leyendo el texto.
  const importCalls = [];
  sandbox.SettingsManager = {
    importFromData: async function (d) { importCalls.push(d); return { success: true }; },
    exportData: async function () { return { data: { apiKeys: { list: makeKeys(1) } } }; },
  };
  sandbox.__importCalls = importCalls;

  // El remoto responde con N claves. La API de GitHub y el raw_url del gist
  // se distinguen por URL.
  sandbox.fetch = async function (url) {
    if (String(url).indexOf('raw_url') !== -1 || String(url).indexOf('/raw/') !== -1) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ data: { apiKeys: { list: makeKeys(nRemoteKeys) } } }) };
    }
    return {
      ok: true, status: 200,
      json: async () => ({ updated_at: '2026-09-20T00:00:00Z', files: { 'gw2-config.json': { raw_url: 'https://gist.githubusercontent.com/raw/x' } } }),
      text: async () => JSON.stringify({ updated_at: '2026-09-20T00:00:00Z', files: { 'gw2-config.json': { raw_url: 'https://gist.githubusercontent.com/raw/x' } } }),
    };
  };

  const ctx = vm.createContext(sandbox);
  vm.runInContext(SRC, ctx, { filename: 'gist-sync.js' });
  try { await ctx.GistSync.downloadAndSync(); }
  catch (e) { console.log('  (downloadAndSync lanzo: ' + e.message + ')'); }
  assert(importCalls.length === 1, 'el import se ejecuto 1 vez (el confirm esta antes de escribir)');
  return confirmCalls;
}

(async function run() {
  console.log('T20-a: el confirm del Gist dice las 7 categorias + la cifra de claves');
  console.log('  fuente: js/gist-sync.js verbatim, ' + RAW.length + ' bytes, guard parcheado ' + patched + ' vez');

  assert(patched === 1, 'el unico parche (guard de token) se aplico exactamente una vez');

  // ---- CASO 1: remoto de 12. La escena. -----------------------------------
  const c12 = await captureConfirm(12);
  assert(c12.length === 1, 'CASO 1: se pidio confirm exactamente una vez');
  if (c12.length) {
    const m = c12[0];
    console.log('  --- texto actual del confirm, remoto de 12 claves ---');
    console.log(m.split('\n').map(function (l) { return '  | ' + l; }).join('\n'));
    console.log('  ---------------------------------------------------');
    assert(/(^|[^0-9])12([^0-9]|$)/.test(m), 'CASO 1: el confirm nombra la cifra de claves del remoto (12)');
    const cats = ["API Keys", "Wizard's Vault", "Wallet", "Activities", "Characters", "Meta", "Configuración global"];
    for (const c of cats) {
      assert(m.indexOf(c) !== -1, 'CASO 1: el confirm nombra la categoria "' + c + '"');
    }
  }

  // ---- CONTROL: remoto de 27. La cifra tiene que MOVIRSE con el remoto. ---
  const c27 = await captureConfirm(27);
  assert(c27.length === 1, 'CONTROL 27: se pidio confirm exactamente una vez');
  if (c27.length) {
    assert(/(^|[^0-9])27([^0-9]|$)/.test(c27[0]), 'CONTROL 27: el confirm nombra 27 cuando el remoto tiene 27');
    assert(!/(^|[^0-9])12([^0-9]|$)/.test(c27[0]), 'CONTROL 27: el confirm NO dice 12 cuando el remoto tiene 27');
  }

  // ---- CASO 0: remoto sin la familia apiKeys. -----------------------------
  const c0 = await captureConfirm(0);
  assert(c0.length === 1, 'CASO 0: se pidio confirm exactamente una vez');
  if (c0.length) {
    assert(/(^|[^0-9])0([^0-9]|$)/.test(c0[0]), 'CASO 0: el confirm dice 0 claves cuando el remoto no tiene ninguna');
  }

  console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
  if (fail) { console.log('fallos:'); failures.forEach(function (f) { console.log('  - ' + f); }); }
  process.exit(fail ? 1 : 0);
})();