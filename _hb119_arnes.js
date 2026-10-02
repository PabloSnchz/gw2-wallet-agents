// Arnes: ejecuta downloadAndSync() VERBATIM extraido de gist-sync.js @ origin/main 4fe38bc.
// Deps inyectadas. El STORE simula localStorage y SettingsManager.importFromData
// con la MISMA semantica del real (settings-manager.js:538 -> importApiKeys ->
// Storage.set(ACCOUNT_KEYS, apiKeysData.list)).

const fs = require('fs');
const fnSrc = fs.readFileSync(__dirname + '/_hb119_das.js', 'utf-8');

function makeEnv({ nLocal, nRemote, accept }) {
  const STORE = new Map();
  STORE.set('gw2_gist_id', 'GIST123');
  // 27 cuentas locales -> cada una con value = "acct-<i>"
  const local = [];
  for (let i = 1; i <= nLocal; i++) local.push({ id: 'a' + i, value: 'acct-' + i, name: 'Cuenta ' + i });
  STORE.set('gw2_account_keys', local);

  const remote = [];
  for (let i = 1; i <= nRemote; i++) remote.push({ id: 'a' + i, value: 'acct-' + i, name: 'Cuenta ' + i });

  const gistPayload = {
    id: 'GIST123',
    updated_at: '2026-09-20T10:00:00Z',
    files: { 'gw2-config.json': { raw_url: 'https://gist.githubusercontent/x/GIST123/raw/gw2-config.json' } },
  };
  const remoteJson = JSON.stringify({
    version: '3.0',
    exportedAt: '2026-09-20T10:00:00.000Z',
    app: 'gw2-wallet-ligero',
    data: { apiKeys: { list: remote }, wv: {}, wallet: {}, activities: {}, characters: {}, meta: {}, global: {} },
  });

  const log = { confirmPrompt: null, imported: false, toasts: [] };

  const env = {
    state: { token: 'tok', gistId: 'GIST123' },
    CONFIG: { GIST_FILENAME: 'gw2-config.json' },
    localStorage: { getItem: (k) => (STORE.has(k) ? STORE.get(k) : null), setItem: (k, v) => STORE.set(k, v) },
    getGist: async () => gistPayload,
    fetch: async (url) => ({ ok: true, status: 200, text: async () => remoteJson }),
    confirm: (msg) => { log.confirmPrompt = msg; return accept; },
    setTimeout: () => {},
    location: { reload: () => {} },
    window: {
      toast: (t, m) => log.toasts.push(t + ':' + m),
      SettingsManager: {
        // replica fiel de importFromData -> applyImportData -> importApiKeys
        importFromData: async (d) => {
          validate(d);
          STORE.set('gw2_account_keys', d.data.apiKeys.list);
          log.imported = true;
        },
      },
    },
  };
  function validate(d) {
    if (!d || typeof d !== 'object') throw new Error('Archivo invalido');
    if (d.version !== '3.0') throw new Error('Version no compatible. Se esperaba 3.0');
    if (d.app !== 'gw2-wallet-ligero') throw new Error('Este archivo no pertenece a Boveda del Gato Negro');
  }
  env._STORE = STORE;
  env._log = log;
  return env;
}

// eval de la funcion verbatim con las deps en scope
function run(env, nLocal, nRemote, accept) {
  const e = env || makeEnv({ nLocal, nRemote, accept });
  const names = ['state', 'CONFIG', 'localStorage', 'getGist', 'fetch', 'confirm', 'setTimeout', 'location', 'window'];
  const factory = new Function(...names, fnSrc + '\nreturn downloadAndSync();');
  return Promise.resolve(factory(...names.map(n => e[n]))).then(
    (r) => ({ r, e }),
    (err) => ({ err, e })
  );
}

function keys(n) {
  const v = n._STORE.get('gw2_account_keys');
  return Array.isArray(v) ? v.length : (v === undefined ? 0 : 'NO-LIST');
}

(async () => {
  const casos = [
    ['CONTROL  remoto==local (27/27), ACEPTA', 27, 27, true],
    ['CASO 1  remoto mas viejo (27 local / 12 remoto), ACEPTA', 27, 12, true],
    ['CASO 2  remoto mas viejo (27 local / 12 remoto), CANCELA', 27, 12, false],
    ['CASO 3  remoto mas NUEVO (3 local / 27 remoto), ACEPTA', 3, 27, true],
  ];
  for (const [label, nL, nR, acc] of casos) {
    const { err, e } = await run(null, nL, nR, acc);
    const perdidos = nL - (acc ? nR : nL);
    console.log('--- ' + label);
    console.log('    local antes : ' + nL + ' cuentas');
    console.log('    local despues: ' + keys(e) + ' cuentas');
    console.log('    importo?      : ' + e._log.imported);
    console.log('    perdidas      : ' + (err ? 'n/a (error: ' + err.message + ')' : perdidos));
    const prompt = e._log.confirmPrompt;
    const lines = prompt ? prompt.split('\n').filter(x => x.trim()) : [];
    let diceCifra = /\\d/.test(prompt || '');
    let diceFecha = /2026|fecha|hace|mes|d[ií]a/i.test(prompt || '');
    console.log('    el confirm menciona una cifra?  ' + diceCifra);
    console.log('    el confirm menciona una fecha?   ' + diceFecha);
    console.log('');
  }
})();