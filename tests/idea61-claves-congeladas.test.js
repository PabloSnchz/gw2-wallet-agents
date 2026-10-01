/* tests/idea61-claves-congeladas.test.js
 *
 * IDEA 61 — la lista de cuentas vive en DOS claves y la migracion congelo una.
 *
 * Este test es LA LISTA. No verifica un fix: verifica que la clase de bug sea
 * VISIBLE y CONTADA, para que no dependa de que alguien se acuerde.
 *
 * ── La forma del bug, que no necesita ningun modulo para entenderse ──────────
 *
 *   1. `migrate()` copia la legacy -> la gn: la PRIMERA vez.
 *   2. `_migrateOne` arranca con `if (Storage.hasRaw(newKey)) return;`
 *      => si la gn: ya existe, no se vuelve a tocar. Y `migrate()` corre en
 *      CADA arranque (storage.js:380-391).
 *   3. Mientras tanto, un modulo sigue ESCRIBIENDO la legacy a pelo
 *      (`localStorage.setItem`), que es la que si cambia.
 *   4. Otro modulo LEE la gn: con `Storage.get`.
 *   => el que lee la gn: ve la foto del primer arranque, PARA SIEMPRE.
 *
 * La gn: no esta "desactualizada": esta CONGELADA. Y no hay forma de notarlo,
 * porque `Storage.get` devuelve un array BIEN FORMADO con la lista vieja. Un
 * array vacio se ve; un array de 27 cuentas que ya no son las tuyas, no.
 *
 * ── Polaridad ───────────────────────────────────────────────────────────────
 *
 * Las secciones 1-4 fallaban contra el codigo sin el fix: eran la
 * ESPECIFICACION de lo que hay que arreglar (mismo patron que el Tramo 1 de la
 * Idea 57). Con el fix mergeado estan en VERDE, y quedan como el archivo que
 * avisa si alguien reintroduce la divergencia.
 *
 * La seccion 5 es distinta: afirma un INVARIANTE que el fix NO cambia (gw2_keys
 * no es una huerfana, es la lista de cuentas), pero cuya FORMA si cambio, porque
 * el escritor de la legacy paso de app.js a storage.js. Por eso sus tres
 * aserciones miran el mecanismo nuevo. Se razono en el commit.
 *
 * ── Por que un test y no una lista en un .md ────────────────────────────────
 *
 * Una lista escrita a mano se desactualiza en silencio, que es exactamente el
 * bug que denuncia. Este test RECORRE los pares que el propio storage.js
 * declara y los cruza contra los modulos reales. Una clave nueva que entre en
 * esa forma aparece sola en el FAIL.
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

/**
 * Una NOTA imprime y NO cuenta. No es una asercion.
 *
 * Por que existe (ALERT-91): este archivo usaba `ok(true, '...')` para dejar
 * escrito un razonamiento. Eso suma al total de la suite sin verificar nada,
 * y el total es justamente el numero que se mira para saber si la red crecio o
 * se achico. Un `ok(true, ...)` es un comentario vestido de asercion, que es
 * el modo de falla que registra la ALERT-92. Si algo se tiene que verificar, es un
 * `ok(...)` de verdad; si solo se quiere dejar escrito, es una `nota(...)`.
 */
function nota(msg) { console.log('  NOTA  ' + msg); }

/* ── localStorage de mentira, con las DOS claves ─────────────────────────── */
function nuevoLS() {
  return {
    _d: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
    get length() { return Object.keys(this._d).length; },
    key(i) { return Object.keys(this._d)[i] || null; },
  };
}

/** Carga el storage.js real contra un localStorage dado. */
function cargarStorage(ls) {
  const sandbox = {
    localStorage: ls,
    console: { info() {}, warn() {}, error() {}, log() {}, debug() {} },
    document: { readyState: 'loading', addEventListener() {} },  // init() a mano
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(JS, 'storage.js'), 'utf8'), sandbox,
                  { filename: 'storage.js' });
  return sandbox.Storage;
}

const GN = 'gn:account:keys';
const LEG = 'gw2_keys';

/* ═══════════════════════════════════════════════════════════════════════════
   1. INVARIANTE: la gn: y su legacy no pueden divergir
   ═══════════════════════════════════════════════════════════════════════════ */
section('1. la gn: no puede quedar congelada respecto de su legacy');

{
  const ls = nuevoLS();
  ls.setItem(LEG, JSON.stringify([{ value: 'k1', label: 'Main' }]));
  const S = cargarStorage(ls);
  S.init();
  ok(ls.getItem(GN) !== null,
     'la PRIMERA vez migrate() copia la legacy a la gn:',
     'la gn: quedo sin crearse: el fallback habria funcionado y no habria bug');

  // la app sigue escribiendo la legacy a pelo (app.js:622, accounts-panel.js:181)
  ls.setItem(LEG, JSON.stringify([{ value: 'k1' }, { value: 'k2' }, { value: 'k3' }]));

  // el siguiente arranque: migrate() corre otra vez (storage.js:380-391)
  const S2 = cargarStorage(ls);
  S2.init();

  ok(JSON.parse(ls.getItem(GN)).length === 3,
     'la gn: sigue a la legacy cuando la app escribe mas cuentas',
     'la gn: tiene ' + JSON.parse(ls.getItem(GN)).length +
     ' y la legacy tiene ' + JSON.parse(ls.getItem(LEG)).length +
     ': la gn: quedo con la foto del primer arranque');
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. BUG A: el Gist tiene que subir la lista ACTUAL
   ═══════════════════════════════════════════════════════════════════════════ */
section('2. Bug A — el backup sube la lista que la app tiene ahora');

{
  const ls = nuevoLS();
  ls.setItem(LEG, JSON.stringify([{ value: 'k1' }]));
  const S = cargarStorage(ls);
  S.init();                                    // gn: = [k1]
  ls.setItem(LEG, JSON.stringify([{ value: 'k1' }, { value: 'k2' }, { value: 'k3' }]));

  // esto es exportApiKeys() (settings-manager.js:33-36), que es lo que sube el Gist
  const exportado = S.get(S.STORAGE_KEYS.ACCOUNT_KEYS);
  const real = JSON.parse(ls.getItem(LEG));
  ok(Array.isArray(exportado) && exportado.length === real.length,
     'lo que exporta el Gist tiene las mismas cuentas que la app',
     'el Gist sube ' + exportado.length + ' y la app tiene ' + real.length);
  ok(exportado.length > 0,
     'el Gist no sube una lista vacia sobre una app con cuentas',
     'subio ' + exportado.length);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. BUG B: importar tiene que dejar la app con cuentas
   ═══════════════════════════════════════════════════════════════════════════ */
section('3. Bug B — el escenario de recuperacion deja la app con cuentas');

{
  const rescatadas = [{ value: 'k1', label: 'Main' }, { value: 'k2', label: 'Altra' }];

  // navegador NUEVO: no hay ninguna de las dos claves
  const ls = nuevoLS();
  const S = cargarStorage(ls);
  S.init();

  // esto es importApiKeys() (settings-manager.js:238-249), que es lo que corre
  // cuando Pablo restaura desde el Gist
  S.set(S.STORAGE_KEYS.ACCOUNT_KEYS, rescatadas);
  S.set(S.STORAGE_KEYS.ACCOUNT_SELECTED, 'k1');

  ok(ls.getItem(LEG) !== null,
     'el import escribe tambien la legacy: es la que lee KeyManager.load()',
     'la legacy quedo en null, asi que app.js:604 hace JSON.parse(null) || [] ' +
     'y el Panel de Cuentas arranca VACIO, con toast de "sincronizada"');

  // esto es KeyManager.load() (app.js:603-606), literal
  const lista = JSON.parse(ls.getItem(LEG) || null) || [];
  ok(lista.length === 2,
     'la app arranca con las 2 cuentas importadas',
     'arranco con ' + lista.length);
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. NO ES UNA CLAVE: ES UNA CLASE
   ═══════════════════════════════════════════════════════════════════════════ */
section('4. la clase — el recuento, hecho sobre los pares de storage.js');

{
  // El audit (tools/audit-61-congeladas.mjs) recorre los pares que el propio
  // storage.js declara y los cruza contra los modulos. Este test NO reimplementa
  // el audit: lo corre y mira lo que dice. Si el audit se rompe y devuelve 0,
  // esto falla — que es el falso negativo que casi paso durante la escritura.
  const r = require('child_process').spawnSync(
    process.execPath, [path.join(ROOT, 'tools', 'audit-61-congeladas.mjs')],
    { encoding: 'utf8' });
  const salida = (r.stdout || '') + (r.stderr || '');

  const m = salida.match(/CONGELADAS:\s*(\d+)/);
  ok(!!m, 'el audit corre y su salida es parseable', 'salida: ' + salida.slice(-300));
  const n = m ? parseInt(m[1], 10) : -1;

  ok(n === 0,
     'ninguna clave esta en la forma congelada',
     'el audit encuentra ' + n + ': ' +
     (salida.match(/\[CONGELADA\][\s\S]*?(?=\n\[|$)/g) || []).join(' | ').slice(0, 900));

  // Hoy son 4, no 1. La que reporto el PO es una de las cuatro; las otras tres
  // suben al Gist por el mismo camino y ningun test las mira.
  nota('DUAL-WRITE: ' + ((salida.match(/DUAL-WRITE:\s*(\d+)/) || [])[1] || '?'));
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. LO QUE ESTA BIEN: la 49D no puede borrar gw2_keys
   ═══════════════════════════════════════════════════════════════════════════ */
section('5. 49D — el barrido de huerfanas no puede borrar gw2_keys');

{
  const appSrc = fs.readFileSync(path.join(JS, 'app.js'), 'utf8');
  const panelSrc = fs.readFileSync(path.join(JS, 'accounts-panel.js'), 'utf8');
  const storageSrc = fs.readFileSync(path.join(JS, 'storage.js'), 'utf8');

  // El PO propuso dos caminos para el Tramo 1: (a) que la copia se actualice
  // sola, o (b) que app.js y accounts-panel.js dejen de escribir la legacy a
  // pelo. Se eligio (b) MAS el resync, y por eso el escritor de la legacy
  // cambio de modulo: ya no es app.js, es storage.js (MIRROR_MAP).
  //
  // Estas 3 aserciones fijaban el MECANISMO viejo (buscaban
  // `localStorage.setItem('gw2_keys')` en app.js y accounts-panel.js). Con el
  // fix dan FAIL, y el FAIL es correcto: el mecanismo que mordian ya no existe.
  // Lo que NO puede cambiar es el INVARIANTE que sostenian, y ese se mide
  // abajo: la legacy tiene que seguir existiendo, tener un escritor, y que ese
  // escritor sea el que la app usa.
  ok(!/const\s+LS_KEYS\s*=\s*'gw2_keys'/.test(appSrc),
     'app.js ya no declara la legacy: escribe por Storage (STORAGE_KEYS.ACCOUNT_KEYS)');
  ok(!/localStorage\.setItem\(\s*'gw2_keys'/.test(panelSrc),
     'accounts-panel.js ya no escribe la legacy a pelo: escribe por Storage');
  ok(/'gn:account:keys':\s*'gw2_keys'/.test(storageSrc),
     'storage.js declara el par espejo: gn:account:keys <-> gw2_keys');

  // El invariante, que es lo que la 49D tiene que respetar:
  ok(/MIRROR_MAP[\s\S]{0,400}'gn:account:keys':\s*'gw2_keys'/.test(storageSrc) ||
     /MIRROR_MAP[\s\S]{0,200}gw2_keys/.test(storageSrc),
     'la legacy sigue declarada: no es una huerfana, es la fuente de verdad');

  // El censo cuenta POR CODIGO, no por texto (ALERT-91, corregir 2026-10-01).
  // Contaba por texto y daba 5; el quinto era `accounts-panel.js`, cuyo unico
  // match era el COMENTARIO que documenta el fix de la Idea 64 y contiene
  // literalmente el patron. O sea que el censo estaba contando su propia
  // documentacion, que es el mismo comment-injection que apagaba el assert de
  // idea64. Por codigo son 4, y 4 es el numero cierto: "5 modulos la LEEN a
  // pelo" ya no era verdad desde el fix de la 64, pero el `>= 5` seguia verde.
  //
  // QUE ESTE ASSERT AFIRME UN DEFECTO ESTA BIEN, Y ES DELIBERADO: el defecto
  // esta declarado, tiene dueno (bloquea la 49D) y su significado es "mientras
  // sean >= 4, no se borra". Un `ok(bugExiste)` que se pone rojo el dia que
  // arreglas el bug no es ambiguo si el mensaje dice que lo retira; es una
  // puerta, no una fotografia.
  const sinComentarios = c => c.replace(/\/\*[\s\S]*?\*\//g, ' ')
                                 .replace(/\/\/[^\n]*/g, ' ');
  const lectores = ['app.js', 'accounts-panel.js', 'inventory-dashboard.js',
                    'wv-objectives-dashboard.js', 'wv-purchase-detail.js',
                    'wv-shop-ui.js'];
  const RE_LECTOR = /getItem\(\s*(LS_KEYS|'gw2_keys')/;
  const porCodigo = lectores.filter(f =>
    RE_LECTOR.test(sinComentarios(fs.readFileSync(path.join(JS, f), 'utf8'))));
  const porTexto = lectores.filter(f =>
    RE_LECTOR.test(fs.readFileSync(path.join(JS, f), 'utf8')));
  ok(porCodigo.length >= 4,
     'al menos 4 modulos la LEEN a pelo (por codigo): ' + porCodigo.join(', '),
     'quedan ' + porCodigo.length + ': ' + porCodigo.join(', ') +
     ' — si esto baja de 4, la 49D tiene que reevaluarse antes de borrar nada');
  nota('por texto daba ' + porTexto.length + ' (' + porTexto.join(', ') +
       '); la diferencia es prosa que nombra el patron, no codigo que lo tiene');
  nota('=> borrarla no es "limpiar una huerfana": es borrar la lista. ' +
       'La 49D queda BLOQUEADA, y la razon es esta, no una regla de estilo.');
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. EL ESPEJO, POR LOS 4 PARES (Idea 61 Tramo 3, recambiado por el Reviewer)
   ═══════════════════════════════════════════════════════════════════════════

   ALERT-76: con el espejo mergeado, "las dos claves tienen el mismo largo" es
   tautologico — Storage.set escribe las dos. Y la unica asercion que quedaba
   sobre el espejo era un REGEX sobre el texto de MIRROR_MAP: una red que no
   puede romperse porque no mira comportamiento.

   Este test no verifica un fix. Es una RED que hoy esta en verde y mañana tiene
   que SEGUIR en verde: si alguien saca el espejo de `set`, o de `get`, o del
   resync del arranque, el FAIL tiene que aparecer aca y no en produccion.

   Y aca esta el invariante bien escrito, que no es el que habia propuesto:

     NO es "si y solo si NADIE escribe por afuera". _resyncMirrors existe PARA
     TOLERAR escritores externos: si un modulo escribe la legacy a pelo, el
     espejo se refresca igual en el siguiente arranque. O sea que el espejo se
     mantiene AUNQUE alguien escriba por afuera, y la palabra "solo" describe
     algo que el codigo no promete.

     Lo que si es cierto por construccion: el espejo se mantiene para todo
     LECTOR que pase por Storage, haya o no escritor crudo, porque Storage.get
     lee la legacy primero (storage.js:252-258). Y lo que hay que FORBIDAR no
     es el escritor crudo de la legacy — que HOY es el que escribe, y sin el la
     lista de cuentas se pierde — sino el LECTOR CRUDO de la gn:, que es el
     unico que se saltaria el espejo. De ahi el conteo de la pieza 2.
   */
section('6. el espejo, en comportamiento, para los 4 pares de MIRROR_MAP');

{
  const src = fs.readFileSync(path.join(JS, 'storage.js'), 'utf8');

  /* --- los 4 pares, leidos de MIRROR_MAP (no de MIGRATION_PREFIXES) --- */
  const mM = src.indexOf('const MIRROR_MAP = {');
  const pares = [...src.slice(mM, mM + 1200)
    .matchAll(/'(gn:[^']+)':\s*'([^']+)'/g)].map(m => ({ gn: m[1], legacy: m[2] }));

  ok(pares.length === 4,
     'MIRROR_MAP declara 4 pares espejo',
     'declarados ' + pares.length + ': ' + pares.map(p => p.gn).join(', '));

  // Un valor de escritura por par. Uno es string a proposito: `set` tiene dos
  // ramas (`typeof value === 'string'` o no) y probando solo una de las dos, la
  // otra queda sin cubrir.
  const VAL = {
    'gn:account:keys':          [{ value: 'k1', label: 'Main' }, { value: 'k2' }],
    'gn:account:selected':      'k2',
    'gn:activities:home:nodes': { v: [1, 2, 3] },
    'gn:activities:toggles':    { t: 'raid' },
  };
  const NUEVO = {
    'gn:account:keys':          [{ value: 'k1' }, { value: 'k9' }],
    'gn:account:selected':      'k9',
    'gn:activities:home:nodes': { v: [4, 5] },
    'gn:activities:toggles':    { t: 'strike' },
  };
  const crudo = v => (typeof v === 'string' ? v : JSON.stringify(v));

  for (const { gn, legacy } of pares) {
    const v = VAL[gn], nv = NUEVO[gn];

    /* --- 6.1 set escribe en las DOS --- */
    let ls = nuevoLS();
    let S = cargarStorage(ls);
    S.init();
    S.set(gn, v);
    ok(ls.getItem(gn) === crudo(v) && ls.getItem(legacy) === crudo(v),
       'set(' + gn + ') escribe en las dos claves',
       'gn:=' + ls.getItem(gn) + ' legacy=' + ls.getItem(legacy));

    /* --- 6.2 remove borra en las DOS --- */
    S.remove(gn);
    ok(ls.getItem(gn) === null && ls.getItem(legacy) === null,
       'remove(' + gn + ') borra las dos: si no, la legacy revive en el resync',
       'gn:=' + ls.getItem(gn) + ' legacy=' + ls.getItem(legacy));

    /* --- 6.3 SESION: el lector por Storage ve la NUEVA, sin reiniciar ---
     * A un escritor crudo de la legacy, cambia la legacy a pelo y se mira lo
     * que devuelve Storage.get. Esto es lo que ve la app hoy mismo.
     */
    S.set(gn, v);
    ls.setItem(legacy, crudo(nv));
    const leido = S.get(gn);
    ok(JSON.stringify(leido) === JSON.stringify(nv),
       'get(' + gn + ') lee la legacy primero, en sesion, sin arrancar',
       'devolvio ' + JSON.stringify(leido) + ' y la legacy tiene ' + crudo(nv));

    /* --- 6.4 DISCO: en el siguiente arranque la gn: se refresca ---
     * _resyncMirrors corre SOLO desde init(). Asi que "lo que ve un lector" y
     * "lo que quedo escrito" son DOS hechos distintos, y por eso son DOS
     * aserciones: si solo midieras el disco, estarias probando un arranque; si
     * solo midieras la sesion, no estarias probando que la foto se refresca.
     */
    const antesDelBoot = ls.getItem(gn);
    const S2 = cargarStorage(ls);
    S2.init();
    ok(ls.getItem(gn) === crudo(nv),
       'init() resincroniza la gn: EN DISCO desde la legacy',
       'antes del arranque la gn: era ' + antesDelBoot +
       ' y quedo ' + ls.getItem(gn) + ' con legacy ' + crudo(nv));
  }

  /* ── pieza 2: lo que el audit cuenta, exigido en 0 ───────────────────────
   * NO se reimplementa el barrido: se corre el audit y se mira lo que dice.
   * Misma norma que la seccion 4.
   */
  const r = require('child_process').spawnSync(
    process.execPath, [path.join(ROOT, 'tools', 'audit-61-congeladas.mjs')],
    { encoding: 'utf8' });
  const salida = (r.stdout || '') + (r.stderr || '');
  const mEsc = salida.match(/ESCRITORES CRUDOS \(legacy espejo\):\s*(\d+)/);
  const mGNR = salida.match(/LECTORES CRUDOS \(gn: espejo\):\s*(\d+)/);
  const mGNW = salida.match(/ESCRITORES CRUDOS \(gn: espejo\):\s*(\d+)/);
  ok(!!mEsc && !!mGNR,
     'el audit imprime el agregado de los pares espejo',
     'salida: ' + salida.slice(-300));
  ok(mEsc && parseInt(mEsc[1], 10) === 0,
     'nadie escribe a pelo la legacy de un par espejo, fuera de Storage',
     'el audit encuentra ' + (mEsc && mEsc[1]));
  ok(mGNR && parseInt(mGNR[1], 10) === 0,
     'nadie LEE a pelo la gn: de un par espejo (el que se saltaria el espejo)',
     'el audit encuentra ' + (mGNR && mGNR[1]));

  /* El ESCRITOR CRUDO de la gn:. Es el unico movimiento que rompe el espejo de
   * VERDAD: `Storage.get` lee la legacy primero (storage.js:250-258), asi que
   * alguien que escriba la `gn:` a pelo deja al resto de la app viendo el valor
   * viejo para siempre. Y ningun re-sincronizador lo arregla, porque
   * `_resyncMirrors` copia legacy -> gn:, no al reves. El audit no lo contaba
   * y el test no lo exigia: era el cuarto numero que faltaba.
   */
  ok(mGNW && parseInt(mGNW[1], 10) === 0,
     'nadie ESCRIBE a pelo la gn: de un par espejo (el que rompe el espejo de verdad)',
     'el audit encuentra ' + (mGNW && mGNW[1]) +
     '; si es >0, el modulo esta en: ' + (salida.match(/ESCRITORES CRUDOS \(gn: espejo\) POR MODULO: (.*)/) || [, '?'])[1]);

  /* El LECTOR CRUDO de la legacy espejo: TOLERADO POR DISENO, pero con nombre.
   *
   * Es el unico numero del guard que puede ir de 0 a 40 sin un solo FAIL, o sea
   * decoracion si queda pelado. Peor: un numero pelado es la misma debilidad
   * que el regex de MIRROR_MAP que este guard vino a matar — una red que no
   * puede romperse porque no mira comportamiento. Si sube a 12 nadie puede
   * distinguir "un modulo nuevo y deliberado" de "un modulo que empezo a saltarse
   * la capa".
   *
   * Por eso se gatea POR PAR (archivo, legacy), que es lo que produce
   * `usaCrudo(c, metodo, key)` y lo que el audit ahora imprime. Una allowlist
   * por MODULO no alcanzaria: `wv-purchase-detail.js` lee dos legacy distintas
   * (:858 `gw2_keys` y :1842 `gw2_selected_key_v1`), y una lista de modulos no
   * puede expresar que las dos son conocidas por separado.
   */
  const LECTORES_LEGACY_ESPERADOS = new Set([
    'activities-theme.js[gn_home_nodes_marked]',
    'activities.js[gn_activities_toggles]',
    'inventory-dashboard.js[gw2_keys]',
    'inventory-hub.js[gw2_selected_key_v1]',
    'raid-tracker.js[gw2_selected_key_v1]',
    'strike-tracker.js[gw2_selected_key_v1]',
    'wv-objectives-dashboard.js[gw2_keys]',
    'wv-purchase-detail.js[gw2_keys, gw2_selected_key_v1]',
    'wv-shop-ui.js[gw2_keys]',
  ]);
  /* `accounts-panel.js` NO esta, y es a proposito: hasta el HB#84 el audit lo
   * contaba, porque su unico `getItem('gw2_keys')` esta DENTRO de un comentario
   * (accounts-panel.js:170) que documenta el fix de la Idea 64. El audit leia
   * prosa, asi que informaba un sitio muerto — y si alguien lo borraba de verdad
   * el numero bajaba solo, sin que ningun assert se enterara. El corpus ahora
   * se barre sin comentarios (mismo helper que idea64-dos-pestanas.test.js:170).
   * Volver a escribir una lectura cruda ACA es lo que tiene que dar FAIL.
   */
  const mLista = salida.match(
    /LECTORES CRUDOS \(legacy espejo\) POR MODULO: (.*)/);
  const leidos = mLista && mLista[1] !== '(ninguno)'
    ? mLista[1].split(' ; ').map(s => {
        const m = s.match(/^(\S+)\s*\[(.*)\]$/);
        return m ? m[1] + '[' + m[2].split(', ').sort().join(', ') + ']' : s.trim();
      }).sort()
    : null;
  ok(!!leidos,
     'el audit nombra los modulos que leen la legacy espejo a pelo',
     'salida: ' + salida.slice(-300));
  const inesperados = (leidos || []).filter(f => !LECTORES_LEGACY_ESPERADOS.has(f));
  ok(leidos && inesperados.length === 0,
     'los lectores crudos de la legacy espejo son los conocidos, con nombre',
     'inesperados: ' + (inesperados.join(', ') || '(ninguno)') +
     ' | lista: ' + (leidos || []).join(', '));
  const faltantes = [...LECTORES_LEGACY_ESPERADOS].filter(f => !(leidos || []).includes(f));
  ok(leidos && faltantes.length === 0,
     'ningun lector crudo conocido desaparecio sin que se decida aqui',
     'faltantes: ' + (faltantes.join(', ') || '(ninguno)') +
     ' | si uno se mudo a Storage, borralo de LECTORES_LEGACY_ESPERADOS y decilo');

  /* ── pieza 3: LA QUE SOSTIENE A LAS OTRAS DOS ───────────────────────────
   * Si una gn: de MIRROR_MAP no estuviera en MIGRATION_PREFIXES, el audit la
   * seguiria mirando (arma sus pares de MIRROR_MAP) pero la MIGRACION no la
   * traeria nunca, y el par empezaria a existir solo en un lado. Sin esta
   * asercion, las dos de arriba vigilan un conjunto que puede menguar en
   * silencio: el recuento bajaria y el `=== 0` seguiria en verde.
   */
  const mP = src.indexOf('MIGRATION_PREFIXES = [');
  const legacyDeMigracion = new Set(
    [...src.slice(mP, mP + 4000).matchAll(/\{\s*from:\s*'([^']+)'[^}]*to:\s*'([^']+)'/g)]
      .map(m => m[1]));
  const huerfanas = pares.filter(p => !legacyDeMigracion.has(p.legacy)).map(p => p.gn);
  ok(huerfanas.length === 0,
     'toda gn: de MIRROR_MAP tiene su legacy en MIGRATION_PREFIXES',
     'sin contraparte de migracion: ' + huerfanas.join(', '));
}

console.log('\n' + '='.repeat(64));
console.log('TOTAL: ' + pass + ' pass, ' + fail + ' FAIL');
if (fail) {
  console.log('');
  console.log('Un FAIL aca no es "el fix esta mal" a secas. Antes de tocar el');
  console.log('codigo: las secciones 1-4 son la ESPECIFICACION de la Idea 61 y');
  console.log('deben estar en verde; la 5 afirma un INVARIANTE (gw2_keys no es una');
  console.log('huerfana) y su forma cambio con el fix. Si la 5 falla, la razon');
  console.log('puede ser que el invariante se haya roto de verdad.');
}
process.exit(fail ? 1 : 0);
