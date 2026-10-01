/* tests/hb78-preferencia-pestana.test.js
 *
 * HB#78 — la preferencia de la pestana Raids/Strikes se escribe en la legacy
 * mientras la gn: que storage.js declara y migra queda CONGELADA en el primer
 * arranque. Hoy no explota porque nadie lee la gn: (medido: 0 lectores fuera de
 * storage.js). Es un dual-write sin espejo, la clase de bug que la Idea 61 §6
 * prohibio para las 4 claves que SI tenian espejo.
 *
 * ── El defecto, que no necesita ningun modulo para entenderse ───────────────
 *
 *   storage.js:122  MIGRATION_PREFIXES: raid_strike_view -> gn:raids:strike:view
 *   storage.js:180  FALLBACK_MAP:        gn:raids:strike:view -> raid_strike_view
 *   storage.js:209  MIRROR_MAP:          gn:account:selected -> gw2_selected_key_v1
 *                                       (raid_strike_view NO esta: medido)
 *
 *   raid-tracker.js escribe SIEMPRE la legacy. La gn: la escribe una sola vez,
 *   la migracion del arranque, y de ahi en adelante nadie la actualiza. El
 *   usuario cambia de pestana, vuelve, y la gn: sigue diciendo lo de la
 *   sesion anterior. Como nadie la lee, no se nota. Cuando alguien la lea, ya
 *   devuelve un valor viejo y no va a haber forma de saber por que.
 *
 * ── Por que NO es un problema de nombres ───────────────────────────────────
 *
 * Las 3 claves de las que hablaba la fila 081 YA estan en STORAGE_KEYS
 * (medido: RAIDS_STRIKE_VIEW en :89, ACCOUNT_SELECTED en :59). Lo que no existe
 * es el CALL-SITE: el modulo sigue yendo a localStorage a pelo.
 *
 * ── Y por que el otro raw NO se toca (esta seccion, medida) ───────────────
 *
 * `raid-tracker.js:891` lee `gw2_selected_key_v1` a pelo, y la fila 079 lo
 * marcaba como "rompe en escenario Gist-nuevo". MEDIDO FALSO para esa clave:
 * `gw2_selected_key_v1` SI esta en MIRROR_MAP, y `Storage.getRaw()` lee el
 * espejo PRIMERO por diseno ("la legacy es la fuente de verdad"). O sea que el
 * raw y Storage devuelven EXACTAMENTE lo mismo, y app.js:32-37 lo dice
 * escrito: "las 6 modulos que las leen a pelo siguen viendo lo mismo".
 *
 * El caso es el CONTRARIO en raid_strike_view, que NO esta en MIRROR_MAP: ahi
 * si hay una diferencia real, y es la que arregla este test. Convertir el raw
 * de :891 habria sido cambiar 4 lineas de 4 modulos para no cambiar nada.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const JS = path.join(ROOT, 'js');
const GN = 'gn:raids:strike:view';
const LEG = 'raid_strike_view';

let pass = 0, fail = 0;
function ok(cond, msg, why) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg + (why ? '\n          -> ' + why : '')); }
}
function section(t) { console.log('\n[' + t + ']'); }

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

/** De `function f(` hasta la llave que cierra a su nivel. */
function cuerpoDeFuncion(src, ancla) {
  const ini = src.indexOf(ancla);
  if (ini < 0) return '';
  const abre = src.indexOf('{', ini);
  if (abre < 0) return '';
  let depth = 0;
  for (let i = abre; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(ini, i + 1); }
  }
  return src.slice(ini);
}

/** Un regex que nombra un patron de codigo matchea tambien la FRASE que lo nombra. */
function cuerpoSinComentarios(codigo) {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/** El punto ciego del stripper, CONTADO en vez de declarado. */
function lineasConSlashesEnLiteral(codigo) {
  let n = 0;
  for (const linea of codigo.split('\n')) {
    const i = linea.indexOf('//');
    if (i < 0) continue;
    const antes = linea.slice(0, i);
    const comillas = (antes.match(/'/g) || []).length +
                     (antes.match(/"/g) || []).length +
                     (antes.match(/`/g) || []).length;
    if (comillas % 2 === 1 && linea.slice(i).trim().length > 0) n++;
  }
  return n;
}

function llavesCrudasIgualesAStrippeadas(crudo, strip) {
  const c = (s, ch) => s.split(ch).length - 1;
  return c(crudo, '{') === c(strip, '{') && c(crudo, '}') === c(strip, '}');
}

/** Monta wireViewToggle REAL contra un store, con DOM minimo. */
function montarToggle(semilla, sinStorage) {
  const ls = nuevoLS();
  Object.keys(semilla).forEach((k) => ls.setItem(k, semilla[k]));
  const Storage = sinStorage ? null : cargarStorage(ls);

  function el() {
    const cls = new Set();
    const e = {
      _attrs: {}, _h: null,
      setAttribute(n, v) { this._attrs[n] = v; },
      removeAttribute(n) { delete this._attrs[n]; },
      getAttribute(n) { return Object.prototype.hasOwnProperty.call(this._attrs, n) ? this._attrs[n] : null; },
      addEventListener(t, fn) { this._h = fn; },
      innerHTML: '',
    };
    // `classList` NO puede ser un objeto literal con `this`: dentro de el,
    // `this` seria el classList y no el elemento. Se liga despues, con closure.
    e.classList = {
      add(c) { cls.add(c); },
      remove(c) { cls.delete(c); },
      contains(c) { return cls.has(c); },
    };
    return e;
  }
  const raidsBtn = el(), strikesBtn = el(), raidsPanel = el(), strikesPanel = el();

  const src = fs.readFileSync(path.join(JS, 'raid-tracker.js'), 'utf8');
  // El bloque de la preferencia (STORAGE_KEYS_RT + prefGet + prefSet) es una
  // rebanada CONTIGUA del archivo. Se toma entera y no helper por helper: los
  // helpers usan STORAGE_KEYS_RT, y un `var` de modulo no vive dentro de
  // ninguna funcion, asi que extraerlos por separado deja el nombre sin
  // definir y el arnes revienta con ReferenceError en vez de con un FAIL.
  const iIni = src.indexOf('var STORAGE_KEYS_RT');
  const iFin = src.indexOf('function getSelectedToken');
  const bloque = (iIni >= 0 && iFin > iIni) ? src.slice(iIni, iFin) : '';

  const sandbox = {
    localStorage: ls,
    document: {
      getElementById(id) {
        return { viewRaidsBtn: raidsBtn, viewStrikesBtn: strikesBtn,
                 raidTrackerPanel: raidsPanel, strikeTrackerPanel: strikesPanel }[id] || null;
      },
    },
    window: null,
    console: { info() {}, warn() {}, error() {}, log() {}, debug() {} },
  };
  sandbox.window = sandbox;
  if (Storage) sandbox.Storage = Storage;
  vm.createContext(sandbox);
  const toggle = cuerpoDeFuncion(src, 'function wireViewToggle(');
  vm.runInContext(bloque, sandbox, { filename: 'raid-tracker.js#prefs' });
  vm.runInContext(toggle, sandbox, { filename: 'raid-tracker.js#toggle' });
  vm.runInContext('wireViewToggle()', sandbox);
  return { ls, Storage, raidsBtn, strikesBtn, raidsPanel, strikesPanel };
}

/* ═════════════════════════════════════════════════════════════════════════
   1. LA FORMA: la region vigilada no lee ni escribe la legacy a pelo
   ═════════════════════════════════════════════════════════════════════════ */
section('1. wireViewToggle() no toca localStorage a pelo, y el stripper es exacto aca');

{
  const src = fs.readFileSync(path.join(JS, 'raid-tracker.js'), 'utf8');
  const crudo = cuerpoDeFuncion(src, 'function wireViewToggle(');
  const limpio = cuerpoSinComentarios(crudo);

  const peligroso = lineasConSlashesEnLiteral(crudo);
  ok(peligroso === 0,
     'la region vigilada no tiene `//` dentro de un literal con codigo despues: aca el stripper es exacto',
     peligroso + ' linea(s): el assert negativo de abajo pasaria con el bug puesto');
  ok(llavesCrudasIgualesAStrippeadas(crudo, limpio),
     'el extractor no esta contando llaves a traves de la prosa',
     'hay una llave en un comentario: podria comerse la funcion siguiente');

  ok(limpio.length > 0, 'se encontro wireViewToggle()', 'no se encontro: los asserts siguientes no probarian nada');

  ok(!/localStorage\.getItem\(\s*'raid_strike_view'/.test(limpio),
     'NO lee la legacy a pelo',
     'vuelve a leer raid_strike_view por localStorage: la gn: sigue sin lector y el dual-write sigue sin espejo');
  ok(!/localStorage\.setItem\(\s*'raid_strike_view'/.test(limpio),
     'NO escribe la legacy a pelo',
     'sigue escribiendo la legacy: la gn: queda congelada en el primer arranque');

  /* No se aserta que aparezca el LITERAL 'gn:raids:strike:view', y esa es la
   * decision: el call-site usa el NOMBRE que storage.js declara
   * (STORAGE_KEYS.RAIDS_STRIKE_VIEW). Asertar el literal aca celebraria una
   * copia del nombre — o sea, un segundo lugar donde puede quedar viejo. Lo que
   * se aserta es que usa el nombre, y que el nombre resuelve a la gn: (abajo,
   * contra storage.js, no contra una constante escrita aqui). */
  ok(/RAIDS_STRIKE_VIEW/.test(limpio),
     'usa la clave por el NOMBRE que storage.js declara, no por un literal copiado',
     'no aparece RAIDS_STRIKE_VIEW: o esta escribiendo la gn: a mano, o todavia no la gn:');
}

/* La premisa del assert de arriba, medida contra storage.js y no declarada: */
{
  const st = fs.readFileSync(path.join(JS, 'storage.js'), 'utf8');
  const m = /RAIDS_STRIKE_VIEW:\s*'([^']+)'/.exec(st);
  ok(!!m && m[1] === GN,
     'STORAGE_KEYS.RAIDS_STRIKE_VIEW resuelve a la gn: (medido en storage.js)',
     m ? 'resuelve a ' + m[1] + ', no a ' + GN : 'no se encontro RAIDS_STRIKE_VIEW en STORAGE_KEYS');
}

/* ═════════════════════════════════════════════════════════════════════════
   2. EL DEFECTO, en comportamiento: una instalacion nueva pierde la pestana
   ═════════════════════════════════════════════════════════════════════════ */
section('2. el comportamiento que hoy esta roto y despues del fix no');

/* El caso: el usuario elige Strikes, y la gn: (la clave que la migracion
 * escribio) sigue diciendo "raids". Quien lea la gn: devuelve la pestana
 * equivocada y no hay forma de saber por que. */
{
  const { ls, strikesPanel } = montarToggle({ [LEG]: 'strikes' });
  ok(strikesPanel.getAttribute('hidden') === null,
     'instalacion vieja (solo la legacy): la pestana Strikes se respeta',
     'la gn:/la legacy no llegada: la pestana se pierde en el arranque');

  // El del fix: lo que se escribe AHORA va a la gn:, que es la que storage.js
  // nombra. Antes iba a la legacy y la gn: congelaba el valor del arranque.
  const t = montarToggle({ [LEG]: 'raids' });
  t.strikesBtn._h();
  ok(t.ls.getItem(GN) === 'strikes',
     'al cambiar de pestana se escribe la gn: (no solo la legacy)',
     'la gn: quedo en ' + JSON.stringify(t.ls.getItem(GN)) + ': la gn: nunca se actualiza y su primer lector va a devolver la foto del arranque');
  ok(t.strikesPanel.getAttribute('hidden') === null,
     'y el cambio se ve en pantalla', 'Strikes no se abrio: el click no surtio efecto');
}

/* El caso de verdad: el valor corrupto. El `else` de setActiveView abre
 * Strikes, asi que un valor persistido que no sea 'raids' -- "", "STRIKES",
 * "strikes " de un edit manual, o un null -- abre Strikes solo. El Reviewer
 * (fila 081, punto b) pidio el guard de valores validos; aca se mide. */
section('3. un valor persistido invalido NO abre Strikes solo');

{
  const malos = ['', 'STRIKES', 'strikes ', 'strikes\n', 'undefined', 'null', 'toString'];
  for (const v of malos) {
    const t = montarToggle({ [LEG]: v });
    ok(t.strikesPanel.getAttribute('hidden') === '',
       'valor corrupto ' + JSON.stringify(v) + ' cae en Raids',
       'abrio Strikes: el `else` de setActiveView trata cualquier cosa que no sea "raids" como Strikes');
  }
  const vacio = montarToggle({});
  ok(vacio.strikesPanel.getAttribute('hidden') === '',
     'sin nada persistido abre Raids (el default)', 'abrio Strikes sin que nadie lo pidiera');
  const bueno = montarToggle({ [LEG]: 'strikes' });
  ok(bueno.strikesPanel.getAttribute('hidden') === null,
     'el valor valido "strikes" NO cae en el default fijo: la preferencia se respeta',
     'el guard se comio el valor legitimo: el fix no puede ser "cerrar siempre en Raids"');
}

/* ═════════════════════════════════════════════════════════════════════════
   4. LO QUE ESTA MEDIDO Y NO SE TOCA
   ═════════════════════════════════════════════════════════════════════════ */
section('4. el otro raw: NO es un bug, y por eso NO se arregla');

{
  const st = fs.readFileSync(path.join(JS, 'storage.js'), 'utf8');
  ok(/'gn:account:selected':\s*'gw2_selected_key_v1'/.test(st),
     'gw2_selected_key_v1 SI esta en MIRROR_MAP: el raw y Storage devuelven lo mismo',
     'cambio el mapa: hay que volver a medir antes de afirmar el no-fix');
  ok(!/MIRROR_MAP\s*=\s*\{[^}]*raid_strike_view/.test(st),
     'raid_strike_view NO esta en MIRROR_MAP: por eso SI hay una diferencia real',
     'lo agregaron al espejo: entonces el fix de este test ya no seria necesario');

  const stl = st.split(/\r?\n/);
  const decl = stl.findIndex((l) => /MIRROR_MAP\s*=/.test(l));
  const bloque = stl.slice(decl, decl + 8).join('\n');
  ok(!/raid_strike_view/.test(bloque),
     'medido sobre el bloque de MIRROR_MAP y no sobre el archivo entero');
}

/* El alcance del fix, contado: si raid_strike_view apareciera en otro modulo,
 * el fix dejaria de ser local. `storage.js` queda fuera A PROPOSITO y no por
 * conveniencia: ahi la legacy tiene que estar, es la que MIGRATION_PREFIXES
 * copia y la que FALLBACK_MAP lee. La asercion de que estan las dos se hace
 * contra el bloque, no contra el archivo. */
section('5. alcance: la legacy no tiene otro MODULO consumidor en js/');

{
  const otros = [];
  for (const f of fs.readdirSync(JS)) {
    // storage.js es donde la legacy DEBE estar. Contarlo como "otro
    // consumidor" daria 1 FAIL perpetuo y el assert no distinguiria nada.
    if (!f.endsWith('.js') || f === 'raid-tracker.js' || f === 'storage.js') continue;
    const t = fs.readFileSync(path.join(JS, f), 'utf8');
    if (t.indexOf(LEG) >= 0) otros.push(f);
  }
  ok(otros.length === 0,
     'ningun modulo fuera de raid-tracker.js nombra la legacy (escribir solo la gn: no rompe a nadie)',
     'aparecio en: ' + otros.join(', ') + ' — hay que mirarlo antes de mergear');

  const stl = fs.readFileSync(path.join(JS, 'storage.js'), 'utf8').split(/\r?\n/);
  const en = (re) => stl.some((l) => re.test(l));
  ok(en(/MIGRATION_PREFIXES/) && stl.some((l) => /from:\s*'raid_strike_view'/.test(l)),
     'storage.js declara la legacy en MIGRATION_PREFIXES: por eso el fallback existe');
  ok(stl.some((l) => /'gn:raids:strike:view':\s*'raid_strike_view'/.test(l)),
     'y en FALLBACK_MAP: por eso una instalacion vieja no pierde la pestana');
}

console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);