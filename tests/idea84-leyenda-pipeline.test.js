/**
 * idea84-leyenda-pipeline.test.js
 *
 * T5: el catalogo de `js/legendary-data.js` (206 legendarias) NO se puede
 * regenerar. Medido: `_legendary_items_full.json` no esta en el repo ni en
 * NINGUNA rama (`git log --all` -> nada), y es el input de los DOS consumidores
 * del build: `_build_legendary_data.py` y `_fetch_thematic_prices.py`.
 *
 * El artefacto es reproducible; el PROCESO no. Este test cierra el proceso.
 *
 * QUE AFIRMA (y por que cada asercion esta escrita asi):
 *
 *  [a] La cadena existe y es ORDENADA. No alcanza con que haya un script: lo
 *      que se rompe es que alguien corra el transformador sin el fetcher y no
 *      se entere. Se lee el `import`/`INPUT_FILE` de cada uno de los dos
 *      consumidores del snapshot y se verifica que ambos apuntan al archivo que
 *      el fetcher produce.
 *
 *  [b] El fetcher NO TIENE LAS DOS ENFERMEDADES que el repo ya-curio:
 *      - `/v2/legendaryarmory` da 206 ids y `/v2/items?ids=` acepta 200 por
 *        request: un `?ids=` con los 206 da HTTP 400. MEDIDO. Si el fetcher
 *        no pagina, el build esta roto hoy y el error solo aparece con red.
 *      - La API responde 206 con los ids que existen, no 404 (ALERT-49). Un id
 *        pedido y no recibido tiene que ser FALLO explicito, no un item menos:
 *        si GW2 saca una legendaria, el endpoint la deja de listar y el id ni
 *        llega a pedirse. Un faltante silencioso seria una baja de catalogo
 *        invisible.
 *
 *  [c] La forma del snapshot es la EXACTA que consume el transformador. Se
 *      deriva del codigo real de `transform_item` (que campos lee) y del
 *      recorrido de `main` (que descarta), no de una copia a mano.
 *
 *  [d] EL REGENERADOR ES EJECUTABLE, con un fixture de 3 items, sin red. Esta
 *      es la asercion que el PO pidio y la que NO tiene el repo: hoy el
 *      regenerador es inejecutable y por eso nadie lo ejecuto nunca. Falla sin
 *      el fetcher y pasa con el.
 *
 *  [e] La cadena reproduce el artefacto YA VERSIONADO. Campo a campo, en el
 *      orden que emite el builder. Los precios se excluyen del comparacion
 *      porque son de otra fase y cambian solos; pero se verifica que el
 *      snapshot los hace presente, porque si `--with-prices` dejara de
 *      encontrar la cache el artefacto saldria con 206 ceros y nadie lo veria.
 *
 * QUE NO AFIRMA, y por que:
 *  - Que la API devuelva 206 items. Seria el UNICO test de red de una suite que
 *    es offline por construccion (`tools/run-suite.js` = readdirSync +
 *    execFileSync(node)). Y el dia que GW2 saque una legendaria fallaria por
 *    algo que no es un defecto: un rojo que no significa defecto entrena a
 *    ignorar el rojo.
 *  - Que el precio de un item sea un numero dado. Mismo motivo.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const JS = path.resolve(__dirname, '..', 'js');
const FETCHER = path.join(JS, '_fetch_legendary_items.py');
const BUILDER = path.join(JS, '_build_legendary_data.py');
const PRICES = path.join(JS, '_fetch_thematic_prices.py');
const ARTIFACT = path.join(JS, 'legendary-data.js');

let pass = 0, fail = 0;
const fallos = [];

function ok(cond, msg, porQue) {
  if (cond) { pass++; return true; }
  fail++;
  fallos.push(msg + (porQue ? '  [' + porQue + ']' : ''));
  return false;
}
function leer(p) { return fs.readFileSync(p, 'utf8'); }

function extraerCatalogo(src) {
  const ini = src.indexOf('var LEGENDARY_CATALOG = ') + 'var LEGENDARY_CATALOG = '.length;
  const fin = src.indexOf('\n  root.LegendaryCatalog');
  if (ini < 0 || fin < 0) return null;
  return JSON.parse(src.slice(ini, fin).trim().replace(/;$/, ''));
}

console.log('\n=== idea84 · T5: la cadena que regenera el catalogo ===\n');

// ---------------------------------------------------------------- [a] cadena
console.log('[a] la cadena existe y es ordenada');
ok(fs.existsSync(FETCHER), 'existe _fetch_legendary_items.py (el eslabón que baja el input)');
ok(fs.existsSync(BUILDER), 'existe _build_legendary_data.py (el transformador)');

if (fs.existsSync(FETCHER) && fs.existsSync(BUILDER) && fs.existsSync(PRICES)) {
  const f = leer(FETCHER), b = leer(BUILDER), p = leer(PRICES);

  // los DOS consumidores apuntan al archivo que el fetcher produce
  const nombreOut = (f.match(/OUTPUT_FILE\s*=\s*os\.path\.join\([^,]+,\s*"([^"]+)"/) || [])[1];
  ok(!!nombreOut, 'el fetcher declara que archivo produce', 'sin OUTPUT_FILE no hay contrato');
  ok(
    (b.match(/INPUT_FILE\s*=\s*os\.path\.join\([^,]+,\s*"([^"]+)"/) || [])[1] === nombreOut,
    'el transformador lee el MISMO archivo que produce el fetcher',
    'cadena rota: dos nombres para el mismo input'
  );
  ok(
    (p.match(/INPUT_FILE\s*=\s*os\.path\.join\([^,]+,\s*"([^"]+)"/) || [])[1] === nombreOut,
    'el fetcher de PRECIOS tambien lee ese archivo (2do consumidor, no 1)',
    'el snapshot tiene dos consumidores; si divergen, uno queda colgado'
  );

  // los 3 endpoints publicos, sin token
  ok(f.includes('/legendaryarmory'), 'pega a /v2/legendaryarmory');
  ok(f.includes('/items?ids='), 'pega a /v2/items');
  ok(f.includes('lang='), 'pide tambien lang=es (el catalogo tiene nameEs)');
  ok(!/access_token|api_key|API_KEY/i.test(f), 'sin token: los 3 endpoints son publicos');

  // el docstring declara el por que del no-versionado
  ok(
    /NO se versiona|not.*version/i.test(f),
    'el fetcher declara POR QUE el snapshot no se versiona',
    'sin esa razon, alguien lo versiona y el build empieza a mintiendo'
  );
}

// ------------------------------------------------------------------ [b] red
console.log('[b] el fetcher pagina y no pierde ids en silencio');
if (fs.existsSync(FETCHER)) {
  const f = leer(FETCHER);

  ok(/BATCH_SIZE\s*=\s*200/.test(f), 'BATCH_SIZE = 200 (206 ids en una URL dan HTTP 400)');
  ok(/range\(0,\s*len\([^)]*\),\s*BATCH_SIZE\)/.test(f),
    'itera en lotes de BATCH_SIZE', 'sin esto, el primer pedido con 206 ids es un 400');

  // La red del "no perder ids en silencio" NO es este assert de texto. Uno que
  // busca un nombre de variable matchea el nombre dentro del PROPIO mensaje de
  // error que dice la regla (ALERT-92: un regex que nombra un patron matchea
  // tambien la frase que lo nombra). Mutar el `raise` a `if False` deja el
  // texto intacto y el assert verde. Por eso la version que sostiene la red es
  // la de COMPORTAMIENTO de mas abajo: un fixture al que le falta un id tiene
  // que hacer fallar el fetcher.
  ok(/FetchError/.test(f), 'el fetcher tiene un error propio, no un print');

  // cache-first: sin red el build se repite, y eso es lo que lo hace testeable
  ok(/CACHE_DIR|RAW_CACHE/.test(f), 'cache-first con crudo en disco (testeable sin red)');
  ok(/--refresh/.test(f), 'el refresh es opt-in y explicito');
}

// ----------------------------------------------------------------- [c] forma
console.log('[c] la forma del snapshot es la que consume el transformador');
if (fs.existsSync(FETCHER) && fs.existsSync(BUILDER)) {
  const f = leer(FETCHER), b = leer(BUILDER);

  // que campos lee transform_item, derivado del codigo
  const cuerpo = b.slice(b.indexOf('def transform_item'));
  const lee = [...cuerpo.matchAll(/item\.get\("(\w+)"/g)].map(m => m[1]);
  ok(lee.includes('name_en') && lee.includes('name_es') && lee.includes('icon')
     && lee.includes('type') && lee.includes('details') && lee.includes('id'),
    'el transformador lee id/name_en/name_es/icon/type/details', 'derivado del codigo: ' + lee.join(','));

  // el recorrido descarta los que no tienen name_en
  ok(/if not item\.get\("name_en"\)/.test(b),
    'el transformador descarta entries sin name_en',
    'si el fetcher no lo garantiza, el descarte es silencioso');

  // el fetcher tiene que producir ESOS campos
  for (const campo of ['name_en', 'name_es', 'icon', 'type', 'details']) {
    ok(new RegExp('"' + campo + '"').test(f), `el fetcher escribe "${campo}"`);
  }

  // la clave es el id, como str (el builder recorre .items() sobre un dict)
  ok(/"id"\]\s*=|snap\[str\(/.test(f) || /snap\[str\(/.test(f),
    'el snapshot es un dict {id_str: item}, no una lista',
    'el builder hace items_raw.items() sobre claves string');
}

// ------------------------------------------------------- [d] ejecutable
console.log('[d] el regenerador es EJECUTABLE, sin red, con un fixture');
// Fixture de 3 items DERIVADO del artefacto versionado, no copiado a mano.
// Un fixture con constantes escritas a mano se pudre en silencio: el dia que la
// API cambie un icono, el fixture sigue dando el viejo y el test pasa
// comparando dos mentiras que se Parecen. Derivar del artefacto hace que la
// comparacion signifique algo.
const ARTEFACTO_CAT = extraerCatalogo(leer(ARTIFACT)) || [];
const IDS_FIXTURE = [30684, 83162, 101582];  // axe, armguards, relic (3 tipos distintos)

const TIPO_API = { weapon: 'Weapon', armor: 'Armor', trinket: 'Trinket', back: 'Back' };

const FIXTURE = IDS_FIXTURE.map(id => {
  const real = ARTEFACTO_CAT.find(i => i.id === id);
  if (!real) throw new Error('fixture: el id ' + id + ' no esta en el artefacto versionado');
  return {
    en: {
      id: real.id,
      name: real.name,
      icon: real.icon,
      type: TIPO_API[real.type] || real.type.toUpperCase(),
      rarity: 'Legendary',
      // details no vive en el artefacto (subtype es su proyeccion), asi que se
      // reconstruye desde el subtype. Lo que se prueba aca es la FORMA del
      // snapshot, no infer_gex (que tiene su propio test).
      details: real.subtype ? { type: real.subtype.split(' ').pop(), weight_class: real.subtype.split(' ')[0] } : {},
    },
    es: { id: real.id, name: real.nameEs },
  };
});

function correr(args, cwd) {
  return execFileSync('python', args, { cwd: cwd || JS, encoding: 'utf8', timeout: 120000 });
}

  // El cache crudo del fixture se arma a mano y el fetcher corre SIN red: es lo
// que hace que la parte [d] sea posible. El `--cache-dir` explicito es
// necesario: sin el, el fetcher lee el cache REAL de 206 y "3 items" pasa
// por 206 sin que ningun assert se de cuenta.
if (fs.existsSync(FETCHER)) {
  const cacheDir = path.join(JS, '_legendary_raw_cache_test');
  fs.rmSync(cacheDir, { recursive: true, force: true });
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(path.join(cacheDir, 'armory.json'),
    JSON.stringify(FIXTURE.map(f => f.en.id)));

  const batchSize = parseInt((leer(FETCHER).match(/BATCH_SIZE\s*=\s*(\d+)/) || [])[1], 10) || 200;
  FIXTURE.forEach((f, i) => {
    const lote = Math.floor(i / batchSize) + 1;
    const enPath = path.join(cacheDir, `items-en-${lote}.json`);
    const esPath = path.join(cacheDir, `items-es-${lote}.json`);
    const leerRaw = p => (fs.existsSync(p) ? JSON.parse(leer(p)) : []);
    fs.writeFileSync(enPath, JSON.stringify(leerRaw(enPath).concat([f.en])));
    fs.writeFileSync(esPath, JSON.stringify(leerRaw(esPath).concat([f.es])));
  });

  const snapTmp = path.join(JS, '_legendary_items_test.json');
  const catTmp = path.join(JS, '_legendary_catalog_test.js');
  const catReal = path.join(JS, '_legendary_catalog_check.js');

  try {
    // ------------------------------------------------------- [d] ejecutable
    try {
      correr([FETCHER, '--cache-dir', cacheDir, '--out', snapTmp]);
      pass++;
      console.log('  · el fetcher CORRE y escribe el snapshot');
    } catch (e) {
      fail++;
      fallos.push('el fetcher NO corre con el fixture (sin red): '
        + String(e.stderr || e.message).split('\n').slice(0, 4).join(' '));
    }

    if (fs.existsSync(snapTmp)) {
      const snap = JSON.parse(leer(snapTmp));

      ok(Object.keys(snap).length === 3, 'el snapshot tiene los 3 items del fixture',
        'obtenidos: ' + Object.keys(snap).length);
      ok(!Array.isArray(snap), 'el snapshot es un objeto {id: item}, no una lista');
      ok(!!snap['30684'] && snap['30684'].name_en === 'Frostfang',
        'la clave es el id como string, y el nombre EN esta');
      ok(!!snap['30684'] && snap['30684'].name_es === 'Colmilloescarcha',
        'trae el nombre ES');
      ok(!!snap['30684'] && !!snap['30684'].details && !!snap['30684'].details.type,
        'trae details (de ahi sale el subtype)');
      ok(!!snap['101582'] && !!snap['101582'].details
         && typeof snap['101582'].details === 'object',
        'details null de la API queda como {} (transform_item hace .get encima)');

      // y el snapshot que produce entra al transformador
      try {
        correr([BUILDER, '--with-prices', '--input', snapTmp, '--out', catTmp]);
        pass++;
        console.log('  · el transformador corre con ESE snapshot');
      } catch (e) {
        fail++;
        fallos.push('el transformador NO corre con el snapshot del fixture: '
          + String(e.stderr || e.message).split('\n').slice(0, 4).join(' '));
      }

      if (fs.existsSync(catTmp)) {
        const cat = extraerCatalogo(leer(catTmp));
        if (ok(!!cat, 'el artefacto generado es parseable como LegendaryCatalog')) {
          ok(cat.length === 3, 'los 3 items llegan al catalogo', 'obtenidos: ' + cat.length);
          ok(cat.every(i => i.rarity === 'Legendary'), 'los 3 con rarity Legendary');
          const ff = cat.find(i => i.id === 30684);
          ok(!!ff && ff.name === 'Frostfang', 'el campo `name` sale de name_en');
          ok(!!ff && ff.nameEs === 'Colmilloescarcha', 'el campo `nameEs` sale de name_es');
          ok(!!ff && ff.type === 'weapon', 'el tipo se mapea a minuscula');
          ok(!!ff && ff.subtype === 'axe', 'el subtype sale de details.type');
          const relic = cat.find(i => i.id === 101582);
          ok(!!relic && relic.subtype === '', 'un item sin details no rompe map_subtype');
          ok(!!relic && relic.type === 'relic',
            'un tipo fuera de la lista conocida tambien pasa');
        }
      }
    }

    // ------------------------------------------------------- (f) faltantes
      // ALERT-49: la API responde 206 con los ids que existen, no 404. Un id
      // pedido y no recibido tiene que ser FALLO explicito, no un item menos:
      // si GW2 saca una legendaria, el endpoint la deja de listar y el id ni
      // llega a pedirse, asi que un faltante aqui siempre es un problema del
      // fetcher (o un lote a medias). Este assert es de COMPORTAMIENTO a
      // proposito: se le saca un id al fixture y se exige que el fetcher falle.
      const cacheRota = path.join(JS, '_legendary_raw_cache_roto');
      fs.rmSync(cacheRota, { recursive: true, force: true });
      fs.mkdirSync(cacheRota, { recursive: true });
      // se piden 3 ids pero solo se sirven 2
      fs.writeFileSync(path.join(cacheRota, 'armory.json'),
        JSON.stringify(FIXTURE.map(f => f.en.id)));
      FIXTURE.forEach((f, i) => {
        const lote = Math.floor(i / batchSize) + 1;
        const enPath = path.join(cacheRota, `items-en-${lote}.json`);
        const leerRaw = p => (fs.existsSync(p) ? JSON.parse(leer(p)) : []);
        if (i === 1) return; // el del medio NO vuelve
        fs.writeFileSync(enPath, JSON.stringify(leerRaw(enPath).concat([f.en])));
      });
      FIXTURE.forEach((f, i) => {
        const lote = Math.floor(i / batchSize) + 1;
        const esPath = path.join(cacheRota, `items-es-${lote}.json`);
        const leerRaw = p => (fs.existsSync(p) ? JSON.parse(leer(p)) : []);
        if (i === 1) return;
        fs.writeFileSync(esPath, JSON.stringify(leerRaw(esPath).concat([f.es])));
      });

      const rotoOut = path.join(JS, '_legendary_items_roto.json');
      let fallo = false, msg = '';
      try {
        correr([FETCHER, '--cache-dir', cacheRota, '--out', rotoOut]);
      } catch (e) {
        fallo = true;
        msg = String(e.stderr || e.message);
      }

      // "FALLA" no es una sola cosa: un KeyError sin controlar tambien es un
      // exit != 0, asi que el assert de `fallo` solo no alcanza. Lo que se
      // exige es un fallo CONTROLADO: el error propio del fetcher, que diga
      // QUE id falta, y sin traceback. Un crash uncontrolled pasa los tres.
      const controlado = fallo && /FetchError/.test(msg) && !/Traceback/.test(msg);
      ok(controlado,
        'un id pedido y no recibido hace FALLAR el fetcher por su error propio, sin crash',
        'ALERT-49: un faltante silencioso parece una baja de catalogo'
        + (fallo && !controlado ? ' (salio por crash uncontrolled: ' + msg.split('\n').pop() + ')' : ''));
      ok(controlado && /83162/.test(msg),
        'el error dice QUE id falta, no solo que algo fallo');
      ok(!fs.existsSync(rotoOut),
        'no deja un snapshot a medias cuando falla');
      fs.rmSync(cacheRota, { recursive: true, force: true });
      if (fs.existsSync(rotoOut)) fs.rmSync(rotoOut);

      // ---------------------------------------------------- (e) contra el real
    // Necesita el snapshot REAL de 206, no el de 3 del fixture. Ese snapshot NO
    // esta versionado a proposito (ver el docstring del fetcher), asi que en un
    // clon limpio no existe. Se dice en voz alta en vez de contarse como pass:
    // un aserto que no se ejecuto no es un aserto que pasa.
    const SNAP_REAL = path.join(JS, '_legendary_items_full.json');
    if (!fs.existsSync(SNAP_REAL)) {
      console.log('  · (e) OMITIDO: no hay snapshot local de 206. Regenerar con:');
      console.log('      python js/_fetch_legendary_items.py');
      console.log('      python js/_build_legendary_data.py --with-prices --out <tmp>');
    } else {
      try {
        correr([BUILDER, '--with-prices', '--input', SNAP_REAL, '--out', catReal]);
        const nuevo = extraerCatalogo(leer(catReal));
        const viejo = ARTEFACTO_CAT;

        if (ok(!!nuevo && !!viejo, '(e) el artefacto versionado y el generado se leen')) {
          ok(nuevo.length === viejo.length,
            '(e) misma cantidad de items que el artefacto versionado',
            'versionado=' + viejo.length + ' generado=' + nuevo.length);
          ok(nuevo.map(i => i.id).join(',') === viejo.map(i => i.id).join(','),
            '(e) mismo ORDEN de ids que el artefacto versionado',
            'el orden (tipo, generacion, id) es parte del contrato');

          const CAMPOS = ['id', 'name', 'nameEs', 'icon', 'type', 'subtype',
                          'rarity', 'generation', 'expansion'];
          const porId = new Map(viejo.map(i => [i.id, i]));
          const deriva = [];
          for (const c of nuevo) {
            const v = porId.get(c.id);
            if (!v) { deriva.push('id ' + c.id + ' ausente del versionado'); continue; }
            for (const k of CAMPOS) {
              if (JSON.stringify(c[k]) !== JSON.stringify(v[k])) {
                deriva.push('id=' + c.id + ' ' + k + ': '
                  + JSON.stringify(v[k]) + ' -> ' + JSON.stringify(c[k]));
              }
            }
          }
          ok(deriva.length === 0,
            '(e) deriva 0 contra el artefacto versionado, en los 9 campos de catalogo',
            deriva.slice(0, 4).join(' | '));

          // Los precios quedan fuera del comparacion (son de otra fase y
          // cambian solos), pero tienen que ESTAR: si --with-prices dejara de
          // encontrar la cache, el catalogo saldria con 206 ceros en silencio.
          ok(nuevo.every(i => 'tpSell' in i && 'tpBuy' in i && 'tpTradeable' in i),
            '(e) los items traen tpSell/tpBuy/tpTradeable, no ausentes');
          const tradeables = nuevo.filter(i => i.tpTradeable).length;
          ok(tradeables > 0 && tradeables < nuevo.length,
            '(e) la mezcla tradeable/no-tradeable es la misma forma, no todo 0',
            'tradeables=' + tradeables);
        }
      } catch (e) {
        fail++;
        fallos.push('(e) no se pudo regenerar contra el artefacto real: '
          + String(e.stderr || e.message).split('\n').slice(0, 4).join(' '));
      }
    }
  } finally {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    [snapTmp, catTmp, catReal].forEach(f => { if (fs.existsSync(f)) fs.rmSync(f); });
  }
}

// ------------------------------------------------- [f] no versionado, de verdad
// El docstring del fetcher dice que el snapshot NO se versiona, y eso es una
// RAZON, no un hecho: sin gitignore, el primer `git add .` de cualquiera mete
// 240 KB de snapshot y el contrato queda en la prosa (ALERT-92: una regla que
// vive en un comentario no es una regla).
//
// De comportamiento, no de prosa: se le PREGUNTA A GIT, no se busca el nombre
// del archivo dentro del .gitignore. Un grep del path matchearia el COMENTARIO
// que explica la regla y daria verde con la regla rota - que es exactamente el
// modo de falla que este archivo ya evita en [b].
console.log('[f] el snapshot no se puede versionar por accidente');
const RAIZ = path.resolve(__dirname, '..');
const IGNORADOS = [
  'js/_legendary_items_full.json',   // el snapshot: lo regenera la API
  'js/_legendary_raw_cache/armory.json', // el crudo cacheado
  'js/_legendary_catalog_test.js',   // temporales del propio test
];
let hayGit = true;
for (const rel of IGNORADOS) {
  try {
    // El exito SE DEMONSTRA con que no haya excepción: con `stdio` en 'ignore'
    // `execFileSync` devuelve null, no 0. Comparar el valor de retorno contra 0
    // es un rojo que no significa el defecto que dice significar (aca se vio:
    // los 3 asserts de [f] en rojo con el .gitignore CORRECTO, porque
    // `r === 0` era false para siempre). El codigo de salida ya lo dice todo.
    execFileSync('git', ['check-ignore', '-q', rel],
      { cwd: RAIZ, stdio: ['ignore', 'ignore', 'ignore'] });
    ok(true, `git ignora ${rel}`,
      'sin esto, un `git add .` versiona el snapshot y el build empieza a mentir');
  } catch (e) {
    // `git check-ignore` sale 1 cuando NO esta ignorado, y >1 cuando git no esta
    // o el repo no existe. Solo el segundo caso es "no se puede preguntar".
    if (e.status === 1) {
      ok(false, `git ignora ${rel}`,
        'la regla del docstring sin .gitignore es prosa, no un hecho');
    } else {
      hayGit = false;
    }
  }
}
if (!hayGit) {
  // Se dice en voz alta en vez de contarse como pass: un aserto que no se
  // ejecuto no es un aserto que pasa.
  console.log('  · (f) OMITIDO: git no disponible o el repo no es un work tree.');
}

// ------------------------------------------------------------------ resumen
console.log('\n' + '='.repeat(62));
console.log(`idea84-leyenda-pipeline: ${pass} pass, ${fail} FAIL`);
if (fallos.length) {
  console.log('\nFALLOS:');
  fallos.forEach(f => console.log('  x ' + f));
}
console.log('='.repeat(62));
process.exit(fail ? 1 : 0);