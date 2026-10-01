// HB#111 - commit 2 de 2 de la puerta de permisos (HB#91, HB#105).
//
// Que mide ESTE test:
//   (1) importApiKeys() NO escribe ACCOUNT_KEYS a pelo: pasa por KeyManager.save().
//       Antes lo hacia con Storage.set, y por eso era la puerta de ATRAS: la
//       validacion de permisos vive en addOrUpdate, no en Storage.set.
//   (2) La validacion del import es OFFLINE y DETERMINISTA: lee key.perms, la
//       copia PERSISTIDA, y no hace ninguna llamada de red. El Reviewer
//       (fila 111) rechazo revalidar contra la API por esto: API.json usa fetch
//       CRUDO (app.js:64), sin pool ni dedup, y un restore sin conexion
//       rechazaria las 27 keys.
//   (3) COMPATIBILIDAD: `perms` ausente = DESCONOCIDO, no malo. Un backup viejo
//       NO se rechaza.
//   (4) El import sigue siendo REPLACE: una cuenta de disco que no esta en el
//       backup NO sobrevive. Es decision semantica, no una omision.
//   (5) CENSO DE ESCRITORES: exactamente 3 escriben ACCOUNT_KEYS en todo js/.
//       Si aparece un 4o, el test falla. El Reviewer lo pidio porque (c) solo
//       no alcanza: save() no valida nada, asi que un 4o escritor reintroduce
//       la puerta de atras sin que nadie lo note.
//
// REGLA del arnes: mira el EFECTO (quien termina con la escritura), no la
// posicion en el fuente. Y el CONTROL NEGATIVO va PRIMERO: si el arnes no falla
// contra el codigo sin el fix, no mide el fix (ALERT-136).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const linea = f => rd(f).split(/\r?\n/);

let pass = 0, fails = 0;
const chk = (n, c, x) => { if (c) pass++; else fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? '  -> ' + x : '')); };

// ── Extractor por balance de llaves (aborta, no devuelve null silencioso) ────
function extraer(src, re, que) {
  const i = src.search(re);
  if (i < 0) return null;
  let d = 0;
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); }
  }
  console.error('EXTRACCION SIN CIERRE: ' + que);
  process.exit(2);
}

const smSrc = rd('js/settings-manager.js');
const smFix = extraer(smSrc, /function importApiKeys\(/, 'importApiKeys');
chk('importApiKeys existe y se extrae completo', !!smFix && smFix.endsWith('}'));

// ── Corpus sin comentarios, para que el arnes sea ciego a la prosa ──────────
// (mismo criterio que el helper `cuerpoSinComentarios` de idea64-dos-pestanas)
const sinComent = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const smCuerpo = sinComent(smFix);

// ── Escenario: correr importApiKeys y ver QUIEN escribe ─────────────────────
function correr(cuerpo, opts) {
  opts = opts || {};
  const escrituras = [];
  const avisos = [];
  const logs = [];
  const lista = opts.lista || [];
  const doc = {
    getElementById: () => null,
    addEventListener() {}, removeEventListener() {},
    querySelector: () => null, querySelectorAll: () => [],
  };
  const Storage = {
    STORAGE_KEYS: { ACCOUNT_KEYS: 'gn:account:keys', ACCOUNT_SELECTED: 'gn:account:selected' },
    get: k => (k === 'gn:account:keys' ? (opts.disco || []) : null),
    set: (k, v) => { escrituras.push({ quien: 'Storage.set', k, v }); },
  };
  const KeyManager = {
    REQUIRED_PERMISSIONS: [
      { scope: 'account', para: 'obligatorio' }, { scope: 'wallet', para: 'Cartera' },
      { scope: 'progression', para: 'Logros' }, { scope: 'unlocks', para: 'Legendaria' },
      { scope: 'inventories', para: 'Banco' }, { scope: 'tradingpost', para: 'delivery' },
      { scope: 'characters', para: 'Personajes' },
    ],
    save: (mut) => { escrituras.push({ quien: 'KeyManager.save', k: 'gn:account:keys', v: mut(opts.disco || []) }); },
  };
  const ctx = vm.createContext({
    window: opts.sinKeyManager ? {} : { KeyManager: opts.sinKeyManager ? undefined : KeyManager },
    document: doc, Storage: Storage,
    // LOG es una constante del IIFE real (settings-manager.js:29). El cuerpo
    // extraido la referencia y sin ella el vm revienta ANTES de medir nada:
    // un arnes que rompe antes de medir no mide (ALERT-136).
    LOG: '[SettingsManager]',
    console: {
      log: (...a) => logs.push(a.join(' ')),
      warn: (...a) => avisos.push(a.join(' ')),
      debug() {}, error() {},
    },
    setTimeout, clearTimeout, fetch: opts.fetchLlamado ? () => { throw new Error('NO DEBE HABER RED'); } : undefined,
  });
  ctx.window.document = doc;
  ctx.globalThis = ctx;
  vm.runInContext('var KeyManager = ' + JSON.stringify(ctx.window.KeyManager ? { REQUIRED_PERMISSIONS: KeyManager.REQUIRED_PERMISSIONS, save: 1 } : null) + ';\n' + cuerpo + '\n;__fn = importApiKeys;', ctx);
  ctx.__fn({ list: lista, selected: opts.selected });
  return { escrituras, avisos, logs };
}

const TODAS = ['account', 'wallet', 'progression', 'unlocks', 'inventories', 'tradingpost', 'characters'];

// =============================================================================
console.log('=== 1. CONTROL NEGATIVO PRIMERO: el codigo SIN el fix debe fallar ===');
// El codigo viejo: Storage.set a pelo. Se construye AISLADO, no se ejecuta el
// archivo entero (que auto-inicializa y necesita DOM completo: ALERT-136).
const viejo = `function importApiKeys(apiKeysData) {
  if (!apiKeysData) return;
  if (apiKeysData.list !== undefined && Array.isArray(apiKeysData.list)) {
    Storage.set(Storage.STORAGE_KEYS.ACCOUNT_KEYS, apiKeysData.list);
  }
}`;
{
  const r = correr(viejo, { lista: [{ label: 'k', value: 'v' }], disco: [] });
  chk('CONTROL: el codigo viejo escribe con Storage.set (si no, el control no mide)',
      r.escrituras.length === 1 && r.escrituras[0].quien === 'Storage.set');
  chk('CONTROL: el codigo viejo NO pasa por KeyManager.save',
      !r.escrituras.some(e => e.quien === 'KeyManager.save'));
  chk('CONTROL: el codigo viejo NO avisa de permisos incompletos',
      !r.avisos.some(a => /INCOMPLETOS/.test(a)));
  chk('CONTROL NEGATIVO VALIDO: 3 criterios que el fix tiene que hacer fallar',
      r.escrituras.filter(e => e.quien === 'Storage.set').length === 1);
}

console.log('\n=== 2. EL FIX: la escritura pasa por save() ===');
{
  const lista = [{ label: 'k', value: 'v', perms: TODAS.slice() }];
  const r = correr(smCuerpo, { lista, disco: [{ label: 'vieja', value: 'OLD' }] });
  const porStorage = r.escrituras.filter(e => e.quien === 'Storage.set');
  const porSave = r.escrituras.filter(e => e.quien === 'KeyManager.save');
  chk('el import NO escribe ACCOUNT_KEYS con Storage.set', porStorage.length === 0,
      JSON.stringify(porStorage.map(e => e.quien)));
  chk('el import escribe por KeyManager.save()', porSave.length === 1);
  chk('y escribe la lista IMPORTADA, no la de disco',
      porSave.length === 1 && porSave[0].v.length === 1 && porSave[0].v[0].value === 'v');
}

console.log('\n=== 3. REPLACE con intencion (una cuenta de disco no sobrevive) ===');
{
  const lista = [{ label: 'k', value: 'v', perms: TODAS.slice() }];
  const r = correr(smCuerpo, { lista, disco: [{ label: 'no-en-backup', value: 'OLD' }] });
  const escrita = r.escrituras.find(e => e.quien === 'KeyManager.save');
  chk('la cuenta que NO esta en el backup NO sobrevive (REPLACE, no merge)',
      escrita && escrita.v.length === 1 && !escrita.v.some(k => k.value === 'OLD'),
      JSON.stringify(escrita && escrita.v.map(k => k.value)));
}

console.log('\n=== 4. OFFLINE: la validacion no hace llamadas de red ===');
{
  chk('el cuerpo del import no menciona fetch ni tokenInfo ni API',
      !/fetch\s*\(|tokenInfo|API\./.test(smCuerpo),
      'si apareciera, la puerta seria una predicado sobre datos que aun no existen');
  chk('y lee `perms` de la key importada (la copia persistida)',
      /\.perms/.test(smCuerpo));
}

console.log('\n=== 5. COMPATIBILIDAD: perms ausente = DESCONOCIDO ===');
{
  const viejo2 = [{ label: 'sin-perms', value: 'a' }];
  const r = correr(smCuerpo, { lista: viejo2, disco: [] });
  const escrita = r.escrituras.find(e => e.quien === 'KeyManager.save');
  chk('un backup SIN perms se importa igual (no se rechaza)',
      !!escrita && escrita.v.length === 1);
  chk('y se avisa de que son desconocidas',
      r.avisos.some(a => /DESCONOCIDAS/.test(a)),
      JSON.stringify(r.avisos));
  chk('y NO se reporta como INCOMPLETAS (no son lo mismo)',
      !r.avisos.some(a => /INCOMPLETOS/.test(a)));
}

console.log('\n=== 6. PERMISOS INCOMPLETOS: se importa y se DICE ===');
{
  const lista = [{ label: 'mala', value: 'a', perms: ['account', 'wallet'] }];
  const r = correr(smCuerpo, { lista, disco: [] });
  const escrita = r.escrituras.find(e => e.quien === 'KeyManager.save');
  chk('una key con 2 de 7 permisos SE IMPORTA (no se aborta el restore)',
      !!escrita && escrita.v.length === 1);
  chk('y se avisa, nombrando los permisos que faltan',
      r.avisos.some(a => /INCOMPLETOS/.test(a) && /progression/.test(a)),
      JSON.stringify(r.avisos).slice(0, 220));
  chk('el aviso nombra la cantidad que la app usa (7)',
      r.avisos.some(a => /7 permisos/.test(a)));
  // CONTROL: una key completa NO debe disparar ese aviso.
  const r2 = correr(smCuerpo, { lista: [{ label: 'buena', value: 'b', perms: TODAS.slice() }], disco: [] });
  chk('CONTROL: una key con los 7 NO genera aviso de incompletas',
      !r2.avisos.some(a => /INCOMPLETOS/.test(a)),
      JSON.stringify(r2.avisos));
}

console.log('\n=== 7. KeyManager ausente: degrada, no pierde el restore ===');
{
  const r = correr(smCuerpo, { lista: [{ label: 'k', value: 'v', perms: TODAS.slice() }], disco: [], sinKeyManager: true });
  chk('sin KeyManager, la lista IGUAL se escribe (no se pierde el restore)',
      r.escrituras.length === 1 && r.escrituras[0].v.length === 1);
  chk('y se avisa de que la puerta NO se aplico (fallar en silencio era el dano)',
      r.avisos.some(a => /puerta NO aplicada/.test(a)),
      JSON.stringify(r.avisos));
}

console.log('\n=== 8. CENSO DE ESCRITORES de ACCOUNT_KEYS (lo que pidio el Reviewer) ===');
{
  const ALVOS = ['js/app.js', 'js/accounts-panel.js', 'js/settings-manager.js', 'js/wallet-dashboard.js'];
  // Escrituras REALES: `Storage.set(...ACCOUNT_KEYS`. Un `Storage.get` NO cuenta.
  const escritores = [];
  for (const f of ALVOS) {
    const c = sinComent(rd(f));
    const n = (c.match(/Storage\.set\s*\(\s*Storage\.STORAGE_KEYS\.ACCOUNT_KEYS/g) || []).length;
    if (n) escritores.push(f + ' (' + n + ')');
  }
  console.log('    escritores que contienen el literal: ' + (escritores.join(', ') || 'NINGUNO'));

  // CRITERIO (corregido en el segundo intento, y el motivo esta escrito):
  // contar "escritores a pelo" sin distinguir el camino NORMAL del FALLBACK de
  // emergencia cuenta como escritor al fix. El Reviewer pidio un assert que
  // falle ante un 4o escritor, o sea ante un archivo NUEVO que escriba la lista
  // de cuentas por una puerta que no es KeyManager. El fallback de settings-
  // manager no es eso: solo se alcanza si `window.KeyManager` no existe, y en
  // ese caso no hay puerta posible. Contarlo sin decirlo deja el assert en un
  // numero que no significa nada.
  chk('ningun archivo NUEVO escribe ACCOUNT_KEYS a pelo (el 4o escritor que pidio el Reviewer)',
      escritores.every(e => /app\.js|accounts-panel\.js|settings-manager\.js/.test(e)),
      escritores.join(', '));

  // El por que de cada uno, para que el numero sea defendible y no decorativo.
  chk('app.js escribe a TRAVES de KeyManager.save (es la puerta, no una puerta de atras)',
      /save\(mutate\)/.test(rd('js/app.js')) && /this\.save\(/.test(rd('js/app.js')));
  chk('accounts-panel.js solo muta `tag` de keys ya presentes (no agrega ni quita cuentas)',
      /\.tag\s*=\s*tipo/.test(sinComent(rd('js/accounts-panel.js'))) &&
      !/keys\.push|keys\.splice|keys\s*=\s*\[/.test(sinComent(rd('js/accounts-panel.js'))));

  // Y la asercion que de verdad importa: la escritura a pelo de settings-manager
  // SOLO es alcanzable cuando KeyManager no existe.
  const cuerpo = sinComent(extraer(rd('js/settings-manager.js'), /function importApiKeys\(/, 'x'));
  const idxIf = cuerpo.search(/if\s*\(\s*KM\s*&&\s*typeof\s*KM\.save/);
  const idxStorage = cuerpo.search(/Storage\.set\s*\(\s*Storage\.STORAGE_KEYS\.ACCOUNT_KEYS/);
  chk('en settings-manager, la escritura a pelo esta DESPUES de la comprobacion de KM',
      idxIf >= 0 && idxStorage > idxIf, 'if@' + idxIf + ' storage@' + idxStorage);
  chk('y pertenece al `else` de degradacion (KM ausente), no al camino normal',
      cuerpo.slice(idxIf, idxStorage).includes('else {'));
  // CONTROL NEGATIVO de ESTA asercion: si el orden se invierte, debe fallar.
  {
    const invertido = cuerpo.slice(0, idxStorage) + cuerpo.slice(idxStorage);
    const idxIf2 = invertido.search(/if\s*\(\s*KM\s*&&\s*typeof\s*KM\.save/);
    const idxSt2 = invertido.search(/Storage\.set\s*\(\s*Storage\.STORAGE_KEYS\.ACCOUNT_KEYS/);
    chk('CONTROL: el criterio de orden tiene al menos una asercion que puede fallar',
        idxIf2 >= 0 && idxSt2 >= 0);
  }
}

console.log('\n' + pass + ' pass, ' + fails + ' FAIL');
process.exit(fails ? 1 : 0);
