// _hb117_t19.mjs — Ronda 37 / T19
// "¿La Bóveda sabe que hay otra pestaña abierta?"
//
// Los handlers son VERBATIM de origin/main @ 5f4688f:
//   js/app.js:798-821   KeyManager._watchOtherTabs (listener de 'storage')
//   js/app.js:822-828   KeyManager.setSelected, bloque de persistencia
//   js/storage.js:291-299  Storage.set (+ espejo por MIRROR_MAP)
//   js/storage.js:209-214  MIRROR_MAP
// Lo UNICO simulado es el reloj/event-loop: por spec el evento `storage` no se
// dispara en la pestaña que escribe, solo en las otras.

// ── el "disco" compartido por todas las pestañas ────────────────────────────
const disco = new Map();
const tabs = [];
const LOG = { eventos: [], reacciones: [] };

const MIRROR_MAP = {
  'gn:account:keys':          'gw2_keys',
  'gn:account:selected':      'gw2_selected_key_v1',
  'gn:activities:home:nodes': 'gn_home_nodes_marked',
  'gn:activities:toggles':    'gn_activities_toggles',
};
const mirrorOf = (key) =>
  Object.prototype.hasOwnProperty.call(MIRROR_MAP, key) ? MIRROR_MAP[key] : null;

// js/storage.js:291-299, verbatim en lo que decide
// El navegador emite UN evento `storage` por cada setItem/removeItem, no por
// llamada a Storage.set. Se respeta eso, porque cambia el numero que se reporta.
function escribir(k, str, fromTab) {
  disco.set(k, str);
  for (const otra of tabs) {
    if (otra === fromTab) continue;            // la que escribe no recibe
    otra.recibidos.push(k);
    for (const fn of otra.listeners) fn({ key: k, newValue: disco.get(k) });
  }
}
function StorageSet(key, value, fromTab) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  escribir(key, str, fromTab);
  const mir = mirrorOf(key);
  if (mir) escribir(mir, str, fromTab);
}
function StorageRemove(key, fromTab) {
  disco.delete(key);
  const mir = mirrorOf(key);
  if (mir) disco.delete(mir);
  for (const otra of tabs) {
    if (otra === fromTab) continue;
    otra.recibidos.push(key);
    for (const fn of otra.listeners) fn({ key, newValue: null });
  }
  if (mir) {
    for (const otra of tabs) {
      if (otra === fromTab) continue;
      otra.recibidos.push(mir);
      for (const fn of otra.listeners) fn({ key: mir, newValue: null });
    }
  }
}

const KEY = { KEYS: 'gn:account:keys', SELECTED: 'gn:account:selected' };

// ── una pestaña ─────────────────────────────────────────────────────────────
function abrirPestana(nombre) {
  const t = {
    nombre, listeners: [], recibidos: [], reacciones: [],
    _watching: false, selected: null, list: [],
  };

  // app.js:780-784
  t._fresh = function () {
    const raw = disco.get(KEY.KEYS);
    try { const d = raw == null ? null : JSON.parse(raw); return Array.isArray(d) ? d : []; }
    catch { return []; }
  };
  // app.js:785-792
  t.save = function (mutate) {
    const fresh = t._fresh();
    const next = typeof mutate === 'function' ? mutate(fresh) : fresh;
    t.list = Array.isArray(next) ? next : fresh;
    try { StorageSet(KEY.KEYS, t.list, t); } catch { }
  };
  // app.js:798-821
  t._watchOtherTabs = function () {
    if (t._watching) return;
    t._watching = true;
    t.listeners.push((e) => {
      if (!e || e.key !== KEY.KEYS) return;          // <-- EL FILTRO
      const fresh = t._fresh();
      if (JSON.stringify(fresh) === JSON.stringify(t.list)) return;
      t.list = fresh;
      if (t.selected && !t.list.some((k) => k.value === t.selected)) {
        t.selected = null;
        try { StorageRemove(KEY.SELECTED, t); } catch {}
        t.reacciones.push('seleccion anulada (la cuenta ya no existe)');
      }
      t.reacciones.push('lista de cuentas actualizada');
    });
  };
  // app.js:822-828 (solo persistencia)
  t.setSelected = function (token) {
    t.selected = token || null;
    try {
      if (t.selected) StorageSet(KEY.SELECTED, t.selected, t);
      else StorageRemove(KEY.SELECTED, t);
    } catch {}
  };
  tabs.push(t);
  return t;
}

// ── arranque: 27 cuentas, 2 pestañas ────────────────────────────────────────
const CUENTAS = Array.from({ length: 27 }, (_, i) => ({
  value: 'key-' + String(i).padStart(2, '0'),
  label: 'CUENTA-' + String(i + 1).padStart(2, '0'),
}));

const A = abrirPestana('A');
StorageSet(KEY.KEYS, CUENTAS, A);      // la lista de 27 cuentas, como al boot
A._watchOtherTabs();
A.setSelected('key-00');               // A abre en CUENTA-01

const B = abrirPestana('B');
B._watchOtherTabs();
// B arranca como la app arranca al boot: lee del disco
B.list = B._fresh();
B.selected = disco.get(KEY.SELECTED) || null;

const linea = (s) => console.log(s);

linea('== CONTROL: A agrega una cuenta; B esta mirando la lista ==');
B.recibidos = []; B.reacciones = [];
A.save((l) => l.concat([{ value: 'key-27', label: 'CUENTA-28' }]));
const CONTROL = {
  recibidos: B.recibidos.slice(),
  reacciones: B.reacciones.slice(),
  cuentas_en_B: B.list.length,
};
linea('   eventos recibidos por B : ' + (CONTROL.recibidos.join(', ') || '(ninguno)'));
linea('   reacciones de B         : ' + (CONTROL.reacciones.join(' | ') || '(ninguna)'));
linea('   B ve ahora              : ' + CONTROL.cuentas_en_B + ' cuentas');
linea('   -> el listener EXISTE y funciona. Es lo que el handler sabe hacer.\n');

linea('== CASO REAL: A cambia de cuenta a CUENTA-14; B esta abierta al lado ==');
B.recibidos = []; B.reacciones = [];
A.setSelected('key-13');
const REAL = {
  recibidos: B.recibidos.slice(),
  reacciones: B.reacciones.slice(),
  en_A: CUENTAS.find((c) => c.value === A.selected).label,
  en_B: CUENTAS.find((c) => c.value === B.selected)?.label ?? '(ninguna)',
  disco: disco.get(KEY.SELECTED),
};
linea('   eventos recibidos por B : ' + (REAL.recibidos.join(', ') || '(ninguno)'));
linea('   reacciones de B         : ' + (REAL.reacciones.join(' | ') || '(NINGUNA)'));
linea('   A muestra               : ' + REAL.en_A);
linea('   B muestra               : ' + REAL.en_B + '   <-- lo que Pablo ve en la otra pestana');
linea('   en disco                : ' + REAL.disco);

linea('');
linea('== CASO 2: Pablo le da F5 a la pestana B ==');
const trasRecarga = disco.get(KEY.SELECTED);
linea('   B pasa de mostrar       : ' + REAL.en_B + ' -> ' +
  (trasRecarga === 'key-13' ? 'CUENTA-14' : String(trasRecarga)));
linea('   URL en A y en B         : identica (#/wallet/dashboard)');
linea('   la cuenta depende de QUE pestana recarga');

linea('');
linea('== CASO 3: B estaba en CUENTA-05, y A borra esa cuenta ==');
// A y B quedan en cuentas distintas y A borra la que tiene B seleccionada.
A.setSelected('key-04');
B.setSelected('key-04');            // las 2 en CUENTA-05
const antesB = B.selected;
A.recibidos = []; A.reacciones = [];   // <-- lo que OBSERVA A
B.recibidos = []; B.reacciones = [];
A.save((l) => l.filter((k) => k.value !== 'key-04'));   // A borra CUENTA-05
const CASO3 = {
  recibidos_A: A.recibidos.slice(),
  reacciones_A: A.reacciones.slice(),
  recibidos_B: B.recibidos.slice(),
  reacciones_B: B.reacciones.slice(),
  B_selected_en_memoria: B.selected,
  disco_selected: disco.has(KEY.SELECTED) ? disco.get(KEY.SELECTED) : '(borrada)',
  A_selected_en_memoria: A.selected,
  A_selected_sigue_en_la_lista: A.list.some((k) => k.value === A.selected),
  cuenta_que_A_sigue_pintando: CUENTAS.find((c) => c.value === A.selected)?.label,
};
linea('   eventos que recibio B  : ' + (CASO3.recibidos_B.join(', ') || '(ninguno)'));
linea('   reacciones de B        : ' + (CASO3.reacciones_B.join(' | ') || '(ninguna)'));
linea('   B seleccion en memoria : ' + antesB + ' -> ' + CASO3.B_selected_en_memoria);
linea('   disco                  : ' + CASO3.disco_selected + '   <- lo borro B para protegerse');
linea('   eventos que recibio A  : ' + (CASO3.recibidos_A.join(', ') || '(ninguno)'));
linea('   reacciones de A        : ' + (CASO3.reacciones_A.join(' | ') || '(NINGUNA)'));
linea('   A seleccion en memoria : ' + CASO3.A_selected_en_memoria +
  '  (existe en la lista? ' + (CASO3.A_selected_sigue_en_la_lista ? 'si' : 'NO') + ')');
linea('   A sigue pintando       : ' + CASO3.cuenta_que_A_sigue_pintando);

linea('');
linea('--- VEREDICTO ---');
linea('   eventos que B recibe al cambiar de cuenta : ' + REAL.recibidos.length +
  '  (' + REAL.recibidos.join(', ') + ')');
linea('   de esos, los que B reacciona             : ' + REAL.reacciones.length);
linea('   CONTROL (lista de cuentas) reacciones     : ' + CONTROL.reacciones.length);
linea('   CASO 3: A con token muerto en memoria    : ' +
  (CASO3.A_selected_sigue_en_la_lista ? 'no' : 'SI') +
  '  (eventos que recibio A: ' + CASO3.recibidos_A.length +
  ', reacciones: ' + CASO3.reacciones_A.length + ')');
const ok = REAL.reacciones.length === 0 && CONTROL.reacciones.length > 0
  && !CASO3.A_selected_sigue_en_la_lista;
linea('   -> ' + (ok ? 'DISCRIMINA en los 3 casos'
                   : 'NO DISCRIMINA: el arnes esta mal'));
process.exit(ok ? 0 : 1);