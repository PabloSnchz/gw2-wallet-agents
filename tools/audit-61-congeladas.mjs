/* tools/audit-61-congeladas.mjs  (v2 — resuelve alias)
 *
 * Idea 61: la congelacion no es de UNA clave. Es una clase.
 *
 * Forma del bug, sin mirar ningun modulo:
 *   1. la clave gn: se creo una vez (migrate() al entrar storage.js, o un
 *      import del Gist) y quedo con una foto;
 *   2. _migrateOne arranca con `if (hasRaw(newKey)) return;` → la foto no se
 *      refresca nunca, y migrate() corre en cada arranque;
 *   3. mientras tanto un modulo SIGUE ESCRIBIENDO la legacy a pelo
 *      (localStorage.setItem), que es la que si cambia;
 *   4. otro modulo LEE la gn: con Storage.get.
 *   => el que lee la gn: ve la foto para siempre.
 *
 * v2 corrije un fallo de v1: no resolvia los ALIAS. router.js hace
 * `var LS_WV_SHOP_VIEW = Storage.STORAGE_KEYS.WV_SHOP_VIEW` y despues
 * `Storage.set(LS_WV_SHOP_VIEW, v)`. Buscando el nombre de la constante de
 * storage.js, v1 no veia ese writer y clasificaba mal la clave. Ahora se
 * resuelve el alias en cada archivo antes de buscar.
 *
 * Las tres clases:
 *   CONGELADA   : escritor CRUDO de la legacy + LECTOR de la gn:  -> la foto miente
 *   DUAL-WRITE  : escritor crudo de la legacy + escritor de la gn: -> carrera
 *   SOLO-LEGACY : la gn: no existe todavia; el fallback aun funciona
 */
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const jsDir = join(here, '..', 'js');
const storage = readFileSync(join(jsDir, 'storage.js'), 'utf8');
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* --- pares (legacy -> gn:) tal como los declara storage.js --- */
const mStart = storage.indexOf('const MIGRATION_PREFIXES = [');
const pares = [...storage.slice(mStart, mStart + 4000)
  .matchAll(/\{\s*from:\s*'([^']+)'\s*,\s*to:\s*'([^']+)'\s*\}/g)]
  .map(m => ({ legacy: m[1], gn: m[2] }))
  .filter(p => p.legacy.slice(-1) !== ':' && p.legacy.slice(-1) !== '_');

/* --- nombre de la constante de storage.js para cada gn: --- */
// Solo el objeto STORAGE_KEYS. Un match global sobre storage.js tambien
// agarra el `to:` de cada entrada de MIGRATION_PREFIXES, y como el ultimo par
// es {from:'gn_theme', to:'gn:theme'}, 'gn:theme' quedaba con el nombre 'to'.
// Un nombre de constante equivocado hace que el patron no matchee NADA, y un
// audit que no matchea nada reporta "0 congeladas": el falso negativo mas
// peligroso posible, porque parece una buena noticia.
const skStart = storage.indexOf('var STORAGE_KEYS = {');
const constDeGn = new Map();
for (const m of storage.slice(skStart, storage.indexOf('\n  };', skStart))
                  .matchAll(/(\w+):\s*'(gn:[^']+)'/g)) constDeGn.set(m[2], m[1]);

/* --- corpus: por archivo, los NOMBRES que valen cada clave --- */
const archivos = readdirSync(jsDir).filter(f => f.endsWith('.js') && f !== 'storage.js');
const corpus = archivos.map(f => {
  const t = readFileSync(join(jsDir, f), 'utf8');
  // alias: cualquier binding cuyo valor sea la legacy, la gn:, o la constante
  // de storage.js que la nombra.
  const aliasDe = new Map();                       // nombre local -> clave real
  for (const m of t.matchAll(/(?:var|let|const)\s+(\w+)\s*=\s*([^;\n]+)/g)) {
    const v = m[2].trim();
    if (/^'gw2[\w]*'$/.test(v) || /^'gn_[\w]*'$/.test(v) || /^'gn:[^']*'$/.test(v) ||
        /^'wvpd_[\w]*'$/.test(v) || /^'raid_strike_view'$/.test(v) || /^'walletCompact'$/.test(v) ||
        /^'gh_[\w]*'$/.test(v) || /^'gn_activities_[\w]*'$/.test(v) || /^'gn_meta_[\w:]*'$/.test(v) ||
        /^'gn_wallet_[\w]*'$/.test(v) || /^'gn_inv_[\w]*'$/.test(v) || /^'gn_accounts_[\w]*'$/.test(v) ||
        /^'gn_welcome_seen'$/.test(v) || /^'gn_theme'$/.test(v) || /^'gn_converter_state'$/.test(v) ||
        /^'gn_wv_[\w]*'$/.test(v) || /^'wallet_dashboard_[\w]*'$/.test(v) || /^'wv:season:[\w:]*'$/.test(v)) {
      aliasDe.set(m[1], v.slice(1, -1));
    } else {
      // alias de alias: LS_X = Storage.STORAGE_KEYS.NAME
      const mm = v.match(/^Storage\.STORAGE_KEYS\.(\w+)$/);
      if (mm) aliasDe.set(m[1], 'STORAGE_KEYS.' + mm[1]);
    }
  }
  // segundo paso: resolver los alias de alias contra constDeGn
  for (const [k, v] of [...aliasDe]) {
    if (v.startsWith('STORAGE_KEYS.')) {
      const gn = [...constDeGn].find(([, c]) => c === v.slice(13))?.[0];
      if (gn) aliasDe.set(k, gn);
    }
  }
  return { f: f, t: t, alias: aliasDe };
});

/** Formas con las que un modulo puede nombrar la clave `key`:
 *   - el literal:                  Storage.get('gn:account:keys')
 *   - un alias local:              var LS_X = 'gn:account:keys'
 *   - la constante de storage.js:  Storage.get(Storage.STORAGE_KEYS.ACCOUNT_KEYS)
 * La tercera no se resolvia en v1, y por eso el audit no veía a
 * settings-manager.js, que es justamente el modulo del backup.
 */
function nombresDe(c, key) {
  const out = new Set(["'" + key + "'"]);
  for (const [k, v] of c.alias) if (v === key) out.add(k);
  const partes = [...out].map(x => esc(x));
  // La forma de la constante se arma YA escapada: si pasa por esc(), sus
  // backslashes se vuelven a escapar y el patron busca una barra literal.
  const cn = constDeGn.get(key);
  if (cn) partes.push('Storage\\.STORAGE_KEYS\\.' + cn);
  return partes.join('|');
}

function usa(c, metodo, key) {
  const re = new RegExp('\\b' + metodo + '\\(\\s*(?:Storage\\.STORAGE_KEYS\\.)?(' +
                        nombresDe(c, key) + ')(?![\\w])');
  return re.test(c.t);
}

function usaCrudo(c, metodo, key) {
  const re = new RegExp('\\b' + metodo + '\\(\\s*(' + nombresDe(c, key) + ')(?![\\w])');
  return re.test(c.t);
}

const filas = [];
for (const { legacy, gn } of pares) {
  const escLegacyW = corpus.filter(c => usaCrudo(c, 'setItem', legacy)).map(c => c.f);
  const escLegacyR = corpus.filter(c => usaCrudo(c, 'getItem', legacy)).map(c => c.f);
  const escGNW      = corpus.filter(c => usa(c, 'set', gn)).map(c => c.f);
  const escGNR      = corpus.filter(c => usa(c, 'get', gn)).map(c => c.f);

  if (!escLegacyW.length && !escGNR.length && !escGNW.length && !escLegacyR.length) continue;

  const clase = (escLegacyW.length && escGNR.length) ? 'CONGELADA'
              : (escLegacyW.length && escGNW.length)   ? 'DUAL-WRITE'
              : 'SOLO-LEGACY';
  filas.push({ gn, legacy, clase, escLegacyW, escLegacyR, escGNW, escGNR });
}

const orden = { CONGELADA: 0, 'DUAL-WRITE': 1, 'SOLO-LEGACY': 2 };
filas.sort((a, b) => orden[a.clase] - orden[b.clase] || a.gn.localeCompare(b.gn));

const n = { CONGELADA: 0, 'DUAL-WRITE': 0, 'SOLO-LEGACY': 0 };
for (const f of filas) {
  n[f.clase]++;
  console.log('[' + f.clase + ']  ' + f.gn + '   <- legacy: ' + f.legacy);
  if (f.escLegacyW.length) console.log('    ESCRIBE la legacy a pelo: ' + f.escLegacyW.join(', '));
  if (f.escLegacyR.length) console.log('    lee la legacy a pelo:    ' + f.escLegacyR.join(', '));
  if (f.escGNR.length)      console.log('    LEE la gn: (Storage):    ' + f.escGNR.join(', '));
  if (f.escGNW.length)      console.log('    escribe la gn: (Storage):' + f.escGNW.join(', '));
  console.log('');
}
console.log('CONGELADAS: ' + n.CONGELADA + ' | DUAL-WRITE: ' + n['DUAL-WRITE'] +
            ' | SOLO-LEGACY: ' + n['SOLO-LEGACY']);
