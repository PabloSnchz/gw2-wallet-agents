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
/* El corpus guarda DOS textos y los barridos usan el que NO tiene comentarios.
 *
 * `accounts-panel.js:170` tiene `localStorage.getItem('gw2_keys')` DENTRO de un
 * comentario, y el barrido lo contaba como un lector crudo vivo. O sea que el
 * audit informaba un sitio que ya no existe, y —peor— si alguien lo borraba de
 * verdad, el numero BAJABA solo y ningun assert se enteraba. Es la misma
 * debilidad que la Idea 64 ya cerro en su test con `cuerpoSinComentarios`
 * (tests/idea64-dos-pestanas.test.js:170): un aserción que mira prosa no puede
 * distinguir "el bug sigue" de "borraron el comentario".
 *
 * `t` (con comentarios) se conserva porque los ALIAS se resuelven sobre el texto
 * crudo: un alias declarado en un comentario es ruido igual que una llamada, y
 * basta con que laregex no lo alcance.
 */
const cuerpoSinComentarios = (codigo) => codigo
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\/\/[^\n]*/g, ' ');

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
  return { f: f, t: t, codigo: cuerpoSinComentarios(t), alias: aliasDe };
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
  return re.test(c.codigo);
}

function usaCrudo(c, metodo, key) {
  const re = new RegExp('\\b' + metodo + '\\(\\s*(' + nombresDe(c, key) + ')(?![\\w])');
  return re.test(c.codigo);
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

/* ── Los pares ESPEJO (MIRROR_MAP), contados SIEMPRE ────────────────────────
 *
 * NO se arman desde `filas`. `filas` se saltea un par cuando nadie lo nombra
 * (`if (!escLegacyW.length && !escGNR.length && ...) continue`), y un par
 * espejo sin escritores ni lectores desapareceria del agregado justo cuando
 * es el que mas importa. El agregado sale de MIRROR_MAP directo.
 *
 * Y el par se arma leyendo MIRROR_MAP, no MIGRATION_PREFIXES: hasta hoy las 4
 * gn: de MIRROR_MAP caian dentro de MIGRATION_PREFIXES POR COINCIDENCIA. Si
 * manana una sale, el par desaparece de aqui y el `ESCRITORES CRUDOS: 0`
 * seguiria en verde sin mirar nada. La asercion que ata las dos cosas vive en
 * tests/idea61-claves-congeladas.test.js (pieza 3), no aca: el audit no se
 * autovigila.
 */
const mStartM = storage.indexOf('const MIRROR_MAP = {');
const espejo = [...storage.slice(mStartM, mStartM + 1200)
  .matchAll(/'(gn:[^']+)':\s*'([^']+)'/g)]
  .map(m => ({ gn: m[1], legacy: m[2] }));

const lista = (metodo, campo) => {
  const out = new Map();   // archivo -> Set de legacy que explica por que aparece
  for (const p of espejo) {
    for (const c of corpus) {
      if (!usaCrudo(c, metodo, p[campo])) continue;
      if (!out.has(c.f)) out.set(c.f, new Set());
      out.get(c.f).add(p[campo]);
    }
  }
  return [...out.keys()].sort()
    .map(f => f + ' [' + [...out.get(f)].sort().join(', ') + ']');
};

const suma = (metodo, campo) => espejo.reduce(
  (n, p) => n + corpus.filter(c => usaCrudo(c, metodo, p[campo])).length, 0);

const escLegW = suma('setItem', 'legacy');   // escribe la legacy a pelo, fuera de Storage
const escLegR = suma('getItem', 'legacy');   // lee la legacy a pelo (esto es lo normal)
const escGnW  = suma('setItem', 'gn');       // escribe la gn: a pelo, saltandose Storage
const escGnR  = suma('getItem', 'gn');       // lee la gn: a pelo, saltandose Storage

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

/* El invariante de los pares ESPEJO, en la forma que CIERRA la puerta a la 49D.
 *
 * NO es "si y solo si NADIE escribe por afuera". `_resyncMirrors` existe
 * justamente para tolerar escritores externos: si un modulo escribe la legacy a
 * pelo, el espejo se refresca igual en el siguiente arranque. O sea que el
 * espejo se mantiene AUNQUE alguien escriba por afuera, y la palabra "solo"
 * Describe algo que el codigo no promete.
 *
 * Lo que SI es cierto por construccion, y es lo que la 49D necesita: la gn: se
 * mantiene para todo LECTOR que pase por Storage, haya o no escritor crudo
 * (Storage.get lee la legacy primero). Y lo que hay que FORBIDAR no es el
 * escritor crudo de la legacy — que es el que hoy escribe, y sin el la lista de
 * cuentas se pierde — sino el LECTOR CRUDO de la gn:, que es el unico que se
 * saltaria el espejo.
 *
 * Y el ESCRITORES CRUDO de la gn: (escGnW), que faltaba: es el unico movimiento
 * que rompe el espejo DE VERDAD. Si alguien escribe la `gn:` a pelo, el
 * `Storage.get` — que lee la legacy primero — sigue viendo el valor viejo para
 * siempre, y ningun re-sincronizador lo arregla porque `_resyncMirrors` copia
 * legacy -> gn:, no al reves.
 *
 * `escLegR` se imprime CON NOMBRE, no pelado. Es el unico numero de este guard
 * que puede ir de 0 a 40 sin un solo FAIL (o sea decoracion, si nadie lo
 * asserta), y un numero pelado seria la misma debilidad que el regex de
 * MIRROR_MAP que este guard vino a matar: una red que no puede romperse porque
 * no mira comportamiento. La lista permite que el test la gatee modulo por
 * modulo, y asi un modulo nuevo se vuelve un FAIL y no un numero que sube solo.
 */
console.log('ESCRITORES CRUDOS (legacy espejo): ' + escLegW +
            ' | LECTORES CRUDOS (legacy espejo): ' + escLegR +
            ' | ESCRITORES CRUDOS (gn: espejo): ' + escGnW +
            ' | LECTORES CRUDOS (gn: espejo): ' + escGnR);
console.log('LECTORES CRUDOS (legacy espejo) POR MODULO: ' +
            (lista('getItem', 'legacy').join(' ; ') || '(ninguno)'));
console.log('ESCRITORES CRUDOS (gn: espejo) POR MODULO: ' +
            (lista('setItem', 'gn').join(' ; ') || '(ninguno)'));
