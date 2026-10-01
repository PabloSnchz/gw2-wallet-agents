/**
 * hb87-carrera-probe.mjs
 *
 * NO AFIRMA NADA. Extrae `loadAllForToken` VERBATIM de js/app.js, la evalua con
 * dependencias inyectadas, y monta DOS cargas concurrentes con el ORDEN DE
 * RESOLUCION controlado por el script (no por la red real, que no es
 * determinista). El control es un caso en orden NATURAL: ultima en pedir =
 * ultima en responder, que es lo que pasa cuando la red no se porta mal.
 *
 * Uso: node tools/hb87-carrera-probe.mjs
 * Salida: JSON con los dos casos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(HERE, '..', 'js', 'app.js');
const src = fs.readFileSync(APP, 'utf8');

// --- Extraccion verbatim: desde la firma hasta la llave de cierre de la fn ---
const START = '  async function loadAllForToken(token) {';
const startIdx = src.indexOf(START);
if (startIdx < 0) { console.error('NO SE ENCONTRO loadAllForToken'); process.exit(2); }

let depth = 0, endIdx = -1, seen = false;
for (let i = startIdx; i < src.length; i++) {
  const ch = src[i];
  if (ch === '{') { depth++; seen = true; }
  else if (ch === '}') { depth--; if (seen && depth === 0) { endIdx = i + 1; break; } }
}
if (endIdx < 0) { console.error('LLAVES DESBALANCEADAS'); process.exit(2); }

const verbatim = src.slice(startIdx, endIdx);
const body = verbatim.replace(/^\s*async function loadAllForToken\(token\)\s*\{/, '').replace(/\}\s*$/, '');

/** Monta un sandbox con la funcion extraida y las deps que el harness controla. */
function montar({ conGuarda }) {
  const log = { toasts: [], status: [], renders: 0, ownerLabel: null, cerrado: 0 };
  const state = { accountName: null, wallet: null };

  // deps inyectadas: la red es la UNICA cosa que este script ordena.
  const pending = new Map();   // token -> {acct, wallet, resolvers}
  const orden  = [];           // tokens en el orden en que se PIDIERON

  const API = {
    account(tok) { return new Promise((res) => { pending.get(tok).acct = res; }); },
    wallet(tok) { return new Promise((res) => { pending.get(tok).wallet = res; }); },
  };

  const ctx = {
    state,
    el: { ownerLabel: { textContent: '' } },
    setStatus: (m, k) => log.status.push(m + (k ? ' [' + k + ']' : '')),
    render: () => { log.renders++; },
    ensureCurrencies: async () => {},
    migrateFavsToPinsIfNeeded: () => {},
    API,
    window: {
      toast: (type, msg) => {
        const t = { type, msg, closed: false, close() { this.closed = true; log.cerrado++; } };
        log.toasts.push(t);
        return t;
      },
    },
  };
  ctx.globalThis = ctx;

  const loader = conGuarda
    ? `let loadSeq = 0;\nasync function loadAllForToken(token) {\n  const mine = ++loadSeq;\n${body}\n}\nmodule.exports = loadAllForToken;`
    : `async function loadAllForToken(token) {\n${body}\n}\nmodule.exports = loadAllForToken;`;

  const mod = { exports: null };
  vm.createContext(ctx);
  vm.runInContext(loader + '\n', Object.assign(ctx, { module: mod, exports: mod.exports }));

  return { loadAllForToken: ctx.module.exports, state, log, pending, orden, el: ctx.el };
}

/** Resuelve las N cargas en el orden dado (indices en `orden`). */
function resolverEn(h, indices) {
  for (const i of indices) {
    const tok = h.orden[i];
    const p = h.pending.get(tok);
    p.acct({ name: 'CUENTA-' + tok });
    p.wallet([{ id: 1, value: 10 * (tok.charCodeAt(0) - 64) }]);
  }
}

function caso(nombre, conGuarda, indices) {
  const h = montar({ conGuarda });
  // Las 2 cargas se PIDEN juntas, como dos cambios rapidos del desplegable.
  h.loadAllForToken('A');
  h.pending.set('A', { acct: null, wallet: null });  // el API ya guardo el pending
  h.loadAllForToken('B');
  h.pending.set('B', { acct: null, wallet: null });
  return h;
}

// El problema: `API.account` registra el pending al ser llamado, o sea en el
// await. Hay que crear los pending ANTES de arrancar. Version simple:
function escenario(conGuarda, ordenRespuesta) {
  const h = montar({ conGuarda });
  // Pre-registro los pendientes en el orden de peticion A, B.
  h.pending.set('A', { acct: null, wallet: null });
  h.pending.set('B', { acct: null, wallet: null });
  h.orden.push('A', 'B');

  const pa = h.loadAllForToken('A');
  const pb = h.loadAllForToken('B');

  // flush de macrotask: deja que las dos cargas lleguen al await de la red
  // (ensureCurrencies es await, y el Promise.all tambien) antes de resolver.
  const flush = () => new Promise(r => setTimeout(r, 0));

  return flush()
    .then(() => { resolverEn(h, ordenRespuesta); return flush(); })
    .then(() => Promise.all([pa, pb]))
    .then(() => ({
      conGuarda,
      ordenRespuesta,
      accountName: h.state.accountName,
      wallet: h.state.wallet,
      ownerLabel: h.el.ownerLabel.textContent,
      status: h.log.status.slice(),
      toastsVivos: h.log.toasts.filter(t => !t.closed).length,
      renders: h.log.renders,
    }));
}

const out = [];
await escenario(false, [0, 1]).then(r => out.push(Object.assign({ caso: 'CONTROL natural (B ultima)' }, r)));
await escenario(false, [1, 0]).then(r => out.push(Object.assign({ caso: 'B responde primero, la carga vieja de A despues' }, r)));
await escenario(true,  [0, 1]).then(r => out.push(Object.assign({ caso: 'CONTROL natural CON GUARDA' }, r)));
await escenario(true,  [1, 0]).then(r => out.push(Object.assign({ caso: 'B primero CON GUARDA' }, r)));

console.log(JSON.stringify(out, null, 2));

// Veredicto mecanico, no interpretacion.
const controlNatural = out[0].accountName;
const invertida      = out[1].accountName;
console.log('\n--- VEREDICTO (Pablo selecciono B en los dos casos) ---');
console.log('sin guarda, orden natural  ->', controlNatural, controlNatural === 'CUENTA-B' ? 'OK' : 'MAL');
console.log('sin guarda, orden invertido->', invertida,      invertida      === 'CUENTA-B' ? 'OK' : 'MAL  <-- la carga vieja gana');
console.log('con guarda, invertido      ->', out[3].accountName, out[3].accountName === 'CUENTA-B' ? 'OK' : 'MAL');
