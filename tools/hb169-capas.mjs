#!/usr/bin/env node
// HB#169 - ALERT-239: LOS DISPARADORES VIVEN EN DOS CAPAS, Y ADEMAS EL FILTRO
// POR DEFECTO DE LA API NO FILTRA.
//
// Medido hoy 2026-10-03. Las cuatro mediciones que sostienen esto:
//
//   id                 header X-Agent-Id    query ?agent_id=
//   -----------------  -------------------  ------------------
//   default            200, n=2            200, n=2
//   documenter         200, n=0            200, n=2   <- IGNORADO
//   product-owner      200, n=1            200, n=2   <- IGNORADO
//   Code-Reviewer      200, n=0            200, n=2   <- IGNORADO
//   code-reviewer      404                 200, n=2   <- el id NO es la carpeta
//   zzz999             404                 200, n=2
//
// El filtro de agente es el HEADER `X-Agent-Id` (qwenpaw/cli/cron_cmd.py:61-62).
// Pasarlo como query param no da error: da HTTP 200 y la lista GLOBAL, para
// cualquier valor, incluido un id que no existe. Un filtro mal formado se lee
// como un filtro que funcionó, y su salida se lee como "este agente tiene 2
// crons" cuando puede no tener ninguno.
//
// La segunda mitad, que es la que rompe una REGLA de AGENTS.md: el Documentador
// tiene 0 crons y un heartbeat interno enabled:true every:4h. `cron list` dice
// []. Esa misma salida es la de un agente sin ningun disparador. La regla que
// dice "si un heartbeat nota un cron apagado que no es suyo, lo reporta en
// ALERTS_LOG.md" NO SE PUEDE CUMPLIR mirando solo la capa de crons: al
// Documentador se lo leeria como caido y se reportaria como incidente.
//
// ESTADOS (5, todos distinguibles entre si):
//   CRON                        - solo hay cron activo
//   HEARTBEAT                   - solo hay heartbeat interno enabled
//   AMBAS                       - las dos capas
//   SIN_DISPARADOR_EN_NINGUNA_CAPA - agent.json existe, ninguna capa activa
//   AGENTE_INEXISTENTE          - no existe ese id (404, o sin agent.json)
//   NO_MEDIDO                   - no se pudo consultar; NUNCA se imprime como 0

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WS = 'C:\\Users\\psanc\\.qwenpaw\\workspaces';
const API = 'http://127.0.0.1:8088/api/cron/jobs';

// El ultimo NO existe a proposito: es el control negativo.
const OBJETIVOS = ['default', 'documenter', 'product-owner', 'Code-Reviewer',
  'architect', 'zzz-no-existe-999'];

// ---- capa 1: agent.json (heartbeat interno) ---------------------------------
// El id del agente NO es siempre el nombre de su carpeta: el workspace del
// Reviewer se llama `code-reviewer` y su agent.json declara id `Code-Reviewer`,
// y con la carpeta la API responde 404. Se indexa por las dos y se informa la
// diferencia, porque usarla sin saberlo produce un 404 que parece "no hay".
const porId = new Map();
for (const carpeta of readdirSync(WS)) {
  const p = join(WS, carpeta, 'agent.json');
  if (!existsSync(p)) continue;
  let j = null;
  try { j = JSON.parse(readFileSync(p, 'utf8')); } catch { continue; }
  const id = j.id || carpeta;
  porId.set(id, { carpeta, hb: j.heartbeat || null });
}

// ---- capa 2: API de crons, por HEADER (la unica via que filtra) -------------
// Un fallo de red NO es una lista vacia: se marca NO_MEDIDO y no cuenta como 0.
async function cronsDe(id) {
  try {
    const r = await fetch(API, {
      headers: { 'X-Agent-Id': id },
      signal: AbortSignal.timeout(8000),
    });
    if (r.status === 404) return { estado: 'AGENTE_INEXISTENTE', jobs: [] };
    if (!r.ok) return { estado: 'NO_MEDIDO', motivo: `HTTP ${r.status}`, jobs: [] };
    const j = await r.json();
    const jobs = Array.isArray(j) ? j : (j.jobs || []);
    return { estado: 'MEDIDO', jobs };
  } catch (e) {
    return { estado: 'NO_MEDIDO', motivo: String(e.message || e), jobs: [] };
  }
}

// El control del defecto: la misma consulta con el filtro por query param.
async function cronsPorQuery(id) {
  try {
    const r = await fetch(`${API}?agent_id=${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const jobs = Array.isArray(j) ? j : (j.jobs || []);
    return jobs.length;
  } catch { return null; }
}

const filas = [];
for (const nombre of OBJETIVOS) {
  const agente = porId.get(nombre);
  if (!agente) { filas.push({ nombre, veredicto: 'AGENTE_INEXISTENTE' }); continue; }
  const c = await cronsDe(nombre);
  const porQuery = c.estado === 'MEDIDO' ? await cronsPorQuery(nombre) : null;
  const cronsActivos = c.estado === 'MEDIDO'
    ? c.jobs.filter(j => j.enabled !== false).length : null;
  const hbActivo = !!(agente.hb && agente.hb.enabled);

  let veredicto;
  if (c.estado === 'AGENTE_INEXISTENTE') veredicto = 'AGENTE_INEXISTENTE';
  else if (c.estado !== 'MEDIDO' && !hbActivo) veredicto = 'NO_MEDIDO';
  else if (hbActivo && cronsActivos) veredicto = 'AMBAS';
  else if (hbActivo) veredicto = 'HEARTBEAT';
  else if (cronsActivos) veredicto = 'CRON';
  else veredicto = 'SIN_DISPARADOR_EN_NINGUNA_CAPA';

  filas.push({
    nombre, carpeta: agente.carpeta, cronEstado: c.estado,
    cronsActivos: cronsActivos === null ? 'NO MEDIDO' : cronsActivos,
    porQuery, hbEnabled: hbActivo,
    hbEvery: (agente.hb && agente.hb.every) || '-',
    veredicto,
  });
}

// ---- salida ------------------------------------------------------------------
const L = [];
const P = (s) => L.push(s);
P('HB#169 - ALERT-239: los disparadores viven en DOS capas y el filtro por');
P('           query param de la API no filtra');
P(`  capa CRON      : ${API} con el HEADER X-Agent-Id  (cron_cmd.py:61)`);
P('  capa HEARTBEAT : agent.json -> <workspace>/<carpeta>/agent.json');
P('');
for (const f of filas) {
  P(`AGENTE  ${f.nombre}${f.carpeta && f.carpeta !== f.nombre ? `   (carpeta: ${f.carpeta})` : ''}`);
  if (f.veredicto === 'AGENTE_INEXISTENTE') {
    P(`  VEREDICTO ........ ${f.veredicto}   (la API responde 404 y no hay agent.json)`);
    P('');
    continue;
  }
  P(`  CRON .............. ${f.cronEstado}: ${f.cronsActivos} activo(s)` +
    (f.porQuery === null ? '' : `   [por query param daria ${f.porQuery}: el filtro se IGNORA]`));
  P(`  HEARTBEAT ........ enabled=${f.hbEnabled} every=${f.hbEvery}`);
  P(`  VEREDICTO ........ ${f.veredicto}`);
  if (f.veredicto === 'HEARTBEAT') {
    P('                       ^ INVISIBLE para `cron list`: [] no es "sin disparador".');
  }
  P('');
}

// ---- controles ---------------------------------------------------------------
const f = (n) => filas.find(x => x.nombre === n);
const principal = f('default');
const doc = f('documenter');
const inexistente = f('zzz-no-existe-999');
const po = f('product-owner');

const controles = [
  ['positivo: el Principal tiene cron activo -> CRON',
    principal && principal.veredicto === 'CRON', principal && principal.veredicto],
  ['positivo: 0 crons + heartbeat interno enabled -> HEARTBEAT, no []',
    doc && doc.veredicto === 'HEARTBEAT', doc && doc.veredicto],
  ['negativo: un id inexistente NO es una lista vacia',
    inexistente && inexistente.veredicto === 'AGENTE_INEXISTENTE',
    inexistente && inexistente.veredicto],
  ['el defecto sigue existiendo: por query param el PO devuelve MAS que por header',
    po && po.porQuery !== null && po.cronsActivos !== 'NO MEDIDO' && po.porQuery > Number(po.cronsActivos),
    po ? `header=${po.cronsActivos} query=${po.porQuery}` : 'sin fila'],
];

P('CONTROLES');
let ok = true;
for (const [nombre, paso, visto] of controles) {
  if (!paso) ok = false;
  P(`  ${paso ? 'OK   ' : 'FALLA'} ${nombre}  [${visto}]`);
}
P('');
P(ok ? 'RESULTADO: todos los controles OK'
  : 'RESULTADO: hay al menos un control en ROJO');
process.stdout.write(L.join('\n') + '\n');
process.exitCode = ok ? 0 : 1;