/* =======================================================================
 * tests/hb90-t9-mutex.test.js  -  el mutex CANCELA la carga nueva
 *
 * HALLAZGO DEL PO (HB#90, ronda 28, T9) y MEDIDO aqui antes de tocar
 * una linea de los 8 modulos.
 *
 * EL DEFECTO, DISTINTO DEL DE 47e4819
 *   47e4819 arrrego: "dos cargas concurrentes y la VIEJA gana al final".
 *   Ese defecto se produce con un `await` y se arregla con una guarda de
 *   generacion. El de este test no se arregla con una guarda: se produce
 *   porque la carga nueva NUNCA SE PIDE.
 *
 *   Los 8 modulos que recargan por cambio de cuenta hacen:
 *       if (_refreshInFlight) return _refreshInFlight;
 *   Eso no es "esperar a la que esta en vuelo": es DESCARTAR la solicitud
 *   nueva antes de pedirla. No hay reintento cuando la vieja termina, asi
 *   que no hay forma de recuperarse: el select dice B y la pantalla muestra
 *   A para siempre.
 *
 * POR QUE ESTE TEST AFIRMA UNA COSA DISTINTA AL DE 47e4819
 *   El test de 47e4819 mira QUE VALOR quedo en pantalla. Este mira SI LA RED
 *   RECIBIO UNA PETICION PARA B. Es la diferencia entre un sintoma y la
 *   clase: "queda mal" y "nunca se pide" se pueden parecer en un aserto de
 *   pantalla, y por eso el test de 47e4819 no puede ver este defecto.
 *
 * POR QUE UN CASO DE CONTROL
 *   Si el caso de control tambien falla, el test no esta probando el mutex
 *   sino el arnes. Por eso CASO 1 tiene que dar bien SIN el fix: A termina
 *   antes del cambio, la red pide una vez y la pantalla queda en A, que es
 *   lo correcto.
 *
 * Alcance: `refresh` y `loadStrikeData`/`loadRaidData` extraidas VERBATIM del
 * fuente y evaluadas en un sandbox con la red inyectada y el orden de
 * resolucion controlado por el test. No levanta el IIFE completo.
 * ======================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { console.log('  PASS  ' + label); pass++; }
  else { console.log('  FAIL  ' + label + (extra ? '  (' + extra + ')' : '')); fail++; }
}
function section(t) { console.log('\n[' + t + ']'); }

/* --- Extraccion por balanced-brace (mismo metodo que hb77/hb85/hb87) ----- */
function extraerFn(src, firma) {
  const i = src.indexOf(firma);
  if (i < 0) return null;
  const abre = src.indexOf('{', i);
  let depth = 0, enStr = null, esc = false, enCom = false;
  for (let k = abre; k < src.length; k++) {
    const c = src[k];
    if (enCom) { if (c === '\n') enCom = false; continue; }
    if (esc) { esc = false; continue; }
    if (enStr) { if (c === '\\') esc = true; else if (c === enStr) enStr = null; continue; }
    if (c === '/' && src[k + 1] === '/') { enCom = true; continue; }
    if (c === '/' && src[k + 1] === '*') { enCom = true; k++; continue; }
    if (c === '"' || c === "'" || c === '`') { enStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(i, k + 1); }
  }
  return null;
}

/* =======================================================================
 * ARNES
 * ======================================================================= */
function montar(modulo, cargaNombre, quitarEspera) {
  const src = fs.readFileSync(path.join(REPO, 'js', modulo), 'utf8');

  let refreshSrc = extraerFn(src, 'async function refresh(');
  const cargaSrc = extraerFn(src, 'async function ' + cargaNombre + '(');
  // Variante SIN ESPERA del refresh actual. Se borra unicamente el bloque que
  // espera la carga en vuelo y nada mas.
  //
  // NO se puede "quitar la linea del mutex" como si el mutex fuera una linea
  // estable: despues del fix la linea no existe, y un control del arnes que
  // depende de la forma del codigo bajo prueba deja de discriminar justo
  // cuando el fix esta. Lo que CASO 3 tiene que responder es una pregunta
  // estable: "si dos refresh corren sin esperarse, la red pide las dos
  // cuentas?". La respuesta tiene que ser SI, siempre, con y sin fix. Si
  // alguna vez da NO, el defecto no es el mutex sino este arnes.
  if (quitarEspera) {
    const sinEspera = refreshSrc.replace(
      /if\s*\(\s*_refreshInFlight\s*\)\s*\{[\s\S]*?\n\s*\}/, '');
    if (sinEspera === refreshSrc) throw new Error('no se encontro el bloque de espera en ' + modulo);
    refreshSrc = sinEspera;
  }
  // El estado de modulo (`_refreshInFlight`, `_refreshSeq`) vive FUERA de las
  // funciones. Sin esto el sandbox tira ReferenceError y el test muere antes
  // de contar nada (lo que le paso a idea64 con `cur`/`max`).
  const declInFlight = (src.match(/^[ \t]*var\s+_refreshInFlight\s*=\s*null\s*;[ \t]*$/m) || [null])[0];
  const declSeq = (src.match(/^[ \t]*var\s+_refreshSeq\s*=\s*0\s*;[ \t]*$/m) || [null])[0];
  if (!declInFlight || !declSeq) throw new Error('faltan las declaraciones de modulo en ' + modulo);

  const log = { redPedidos: [], redResoluble: new Map() };
  const state = { token: null, loading: false, error: null };
  // El desplegable global. Se lee por closure y NO por `this`: en el sandbox
  // la funcion se llama sin receptor, asi que `this` seria undefined.
  const desplegable = { selected: 'A' };
  const ctx = {
    log,
    state,
    STRIKES_BY_EXPANSION: [{ strikes: [{ id: 's1' }, { id: 's2' }] }],
    WINGS: [{ id: 'w1' }, { id: 'w2' }],
    LOG: '[T9]',
    getSelectedToken() { return desplegable.selected; },
    ensurePanelContent() { return true; },
    showSkeleton() {}, hideSkeleton() {},
    startTimers() {}, stopTimers() {}, closeModal() {},
    renderKPIs() {}, updateLiDisplay() {},
    renderStrikesGrid(ids) { state.pantalla = (ids || []).join(','); },
    renderWingsGrid(ids) { state.pantalla = (ids || []).join(','); },
    esc: (s) => String(s),
    loadLiAvailable: async () => 5,
    console: { log() {}, debug() {}, info() {}, warn() {}, error() {} },
    document: { getElementById: () => null },
    setTimeout, clearTimeout, Promise,
  };
  ctx.root = {
    GW2Api: {
      getAccountRaids(token) {
        log.redPedidos.push(token);
        return new Promise((res) => log.redResoluble.set(token + '#' + log.redPedidos.length, res));
      },
    },
  };
  ctx.globalThis = ctx;
  ctx.module = { exports: null };
  vm.createContext(ctx);
  vm.runInContext(declInFlight + '\n' + declSeq + '\n' + refreshSrc + '\n' + cargaSrc +
    '\n;module.exports = { refresh: refresh };', ctx);
  return { refresh: ctx.module.exports.refresh, state, log, ctx, desplegable };
}

const flush = () => new Promise(r => setTimeout(r, 0));

/**
 * Resolutor del n-esimo pedido que llego a la red (1-based).
 * La clave se construye con el token y el numero de pedido, porque la misma
 * cuenta puede pedir mas de una vez (una tras un retry) y sin el indice dos
 * llamadas caerian sobre la misma clave.
 */
function resolver(h, indice) {
  const tok = h.log.redPedidos[indice - 1];
  if (tok === undefined) return null;
  return h.log.redResoluble.get(tok + '#' + indice);
}

/** El modulo bajo prueba. */
/* =======================================================================
 * CASO 1 -- CONTROL. A termina antes del cambio. La red pide una vez y la
 * pantalla queda en A, que es lo correcto. Tiene que dar bien SIN el fix.
 * ======================================================================= */
async function control(h, deA) {
  const p1 = h.refresh(false);
  await flush();
  resolver(h, 1)(deA);
  await p1;
}

/* =======================================================================
 * CASO 2 -- EL DEFECTO. Pablo cambia con A en vuelo. La red tiene que
 * recibir una peticion para B, y la pantalla tiene que quedar en B.
 * ======================================================================= */
async function defecto(h, deA, deB) {
  const p1 = h.refresh(false);
  await flush();
  h.desplegable.selected = 'B';                 // el desplegable ya dice B
  const p2 = h.refresh(true);           // gn:tokenchange -> refresh(true)
  await flush();
  // A todavia no respondio. A_partir_de_aca la carga de B tiene que estar
  // EN COLA, no descartada: cuando A termine, B se pide.
  // Con el fix la carga de B se pide DESPUES de que A termine (el refresh
  // serializa), no en paralelo. Lo que importa no es CUANDO se pide, es que
  // se pida. Este flag mide si, en el instante del cambio, B ya esta en la
  // red; con el fix da false y eso es lo correcto.
  const enColaEnElInstante = h.log.redPedidos.includes('B');
  resolver(h, 1)(deA);                             // A responde con lo suyo
  await flush(); await flush(); await flush();
  // Si B quedo en cola, su resolutor existe. Si el mutex lo descarto, NO
  // existe: el test tiene que poder TERMINAR y reportar el fallo, no morir
  // con un TypeError que no dice nada del defecto.
  const resB = resolver(h, 2);
  if (resB) resB(deB);                             // B responde con lo suyo
  await flush();
  await Promise.all([p1, p2]);
  return enColaEnElInstante;
}

/* =======================================================================
 * CASO 3 -- CONTROL DEL ARNES. El mismo caso con la espera DESACTIVADA
 * (dos refresh libres). Es la misma pregunta que CASO 2 y tiene que dar el
 * mismo resultado, porque no depende de la forma del codigo bajo prueba: si
 * con la espera off la red no pide B, el arnes esta roto y CASO 2 no probaria
 * el mutex. Da OK tanto con el fix como sin el, y por eso discrimina.
 * ======================================================================= */
async function sinEspera(h) {
  const p1 = h.refresh(false);
  await flush();
  h.desplegable.selected = 'B';
  const p2 = h.refresh(true);
  await flush();
  return h.log.redPedidos.includes('B');
}

(async function main() {
  // `deA`/`deB` son los IDs que cada cuenta "tiene completados". Tienen que
  // ser DIFERENTES y reconocibles para su modulo: sin eso el aserto de
  // pantalla no distingue "quedo la de B" de "quedo la de A".
  const modulos = [
    ['strike-tracker.js / loadStrikeData', 'loadStrikeData', ['s1'], ['s2']],
    ['raid-tracker.js / loadRaidData', 'loadRaidData', ['w1'], ['w2']],
  ];

  for (const [nombre, carga, deA, deB] of modulos) {
    const archivo = nombre.split(' / ')[0];
    section('MODULO: ' + nombre);

    section('  CASO 1 CONTROL (A termina antes del cambio)');
    {
      const h = montar(archivo, carga, false);
      await control(h, deA);
      ok(h.log.redPedidos.length === 1, 'la red recibio 1 sola peticion',
         JSON.stringify(h.log.redPedidos));
      ok(h.log.redPedidos[0] === 'A', 'la peticion es para la cuenta que estaba seleccionada',
         JSON.stringify(h.log.redPedidos));
      ok(h.state.pantalla === deA.join(','), 'la pantalla quedo con los datos de A',
         'pantalla=' + h.state.pantalla);
    }

    section('  CASO 2 EL DEFECTO (Pablo cambia con A en vuelo)');
    {
      const h = montar(archivo, carga, false);
      const enColaEnElInstante = await defecto(h, deA, deB);
      ok(h.log.redPedidos.includes('B'),
         'LA RED RECIBIO UNA PETICION PARA B  <-- el aserto que 47e4819 no puede ver',
         'pedidos=' + JSON.stringify(h.log.redPedidos) + '  <-- si no dice B, la carga nueva NUNCA SE PIDIO');
      // El fix serializa, asi que en el instante del cambio B todavia no esta
      // en la red. Lo que NO puede pasar es que B se pierda: tiene que pedirla
      // en cuanto A se libera. Este aserto mide la garantia, no el momento.
      ok(h.log.redPedidos.length === 2 && !enColaEnElInstante,
         'B se pide en cuanto A se libera (serializado), y no se pierde',
         'pedidos=' + JSON.stringify(h.log.redPedidos) + ' enElInstante=' + enColaEnElInstante);
      ok(h.state.pantalla === deB.join(','),
         'la pantalla quedo con los datos de B, no los de A',
         'pantalla=' + h.state.pantalla + '  <-- si dice ' + deA.join(',') + ', la carga de A escribio al final');
    }

    section('  CASO 3 CONTROL DEL ARNES (dos refresh sin esperarse)');
    {
      const h = montar(archivo, carga, true);
      const okLibre = await sinEspera(h);
      ok(okLibre, 'sin la espera, las 2 cuentas se piden: el defecto no es el arnes',
         'pedidos=' + JSON.stringify(h.log.redPedidos));
    }
  }

  console.log('\n' + (fail === 0 ? 'OK' : 'FALLOS') + ' — ' + pass + ' pass, ' + fail + ' FAIL');
  process.exit(fail === 0 ? 0 : 1);
})();
