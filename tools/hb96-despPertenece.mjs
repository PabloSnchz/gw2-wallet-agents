/**
 * HB#96 - ALERT-127: "legible" no es "leido". Un mensaje en el inbox del
 * destinatario no sirve si NADIE lo despierta a ejecutar su lector.
 *
 * Lo que el HB#92 midio (ALERT-122) fue la LEGIBILIDAD: la ruta existia y el
 * filtro `kind=='question'` la aceptaba. Eso es necesario y no alcanza.
 * La 099 (HB#91) y la T10 (HB#94) estan las dos legibles y las dos sin
 * respuesta. Faltava medir la TERCERA condicion: el DISPARADOR.
 *
 * Salida 1 si hay un agente con preguntas legibles y sin disparador.
 * Con control explicito: si TODOS tuvieran disparador daria 0, y si
 * ningun agente tuviera preguntas legibles daria 0 tambien. Sin control
 * negativo, "no hay disparador" podria ser "no hay pregunta" (ALERT-124).
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import http from 'http';

const AGENTS_DIR = process.env.BOLETA_COMMS || 'C:/Users/psanc/.qwenpaw/_comms';
const AGENTS = ['default', 'Code-Reviewer', 'product-owner', 'documenter', 'architect'];

// MEDIDO, no supuesto: el scoping de /cron/jobs NO es un query param, es el
// header `X-Agent-Id` (qwenpaw/cli/cron_cmd.py:69). Con ?agent_id= el server
// devuelve la lista COMPLETA igual, y un detector que use el parametro reporta
// "0 crons" para un agente que tiene uno -- o sea, produce el "todo limpio"
// falso. Lo que sigue lo hace por header, con control.
function getJSON(url, agentId) {
  return new Promise((res) => {
    const req = http.get(url, { headers: { 'X-Agent-Id': agentId } }, (r) => {
      let b = ''; r.on('data', (c) => (b += c));
      r.on('end', () => { try { res(JSON.parse(b)); } catch { res(null); } });
    });
    req.on('error', () => res(null));
  });
}

// Mismo criterio que cli.py inbox: glob <agente>/inbox/*.json Y kind=='question'.
function preguntasVisibles(agente) {
  const dir = join(AGENTS_DIR, agente, 'inbox');
  let files = [];
  try { files = readdirSync(dir); } catch { return []; }
  const out = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      if (j && j.kind === 'question') out.push({ file: f, mtime: statSync(join(dir, f)).mtime, to: j.to, subj: (j.subject || '').slice(0, 60) });
    } catch { /* ilegible: no contarlo */ }
  }
  return out;
}

const jobs = (await getJSON('http://127.0.0.1:8088/api/cron/jobs', 'default')) || [];

// CONTROL DEL SCOPING: el mismo endpoint con un agent_id que SI tiene jobs
// tiene que devolver distinto que con 'default'. Si no, el filtro no esta
// scoping y todo lo de abajo seria un "0 crons" sin informacion (ALERT-124).
const jobsPO = (await getJSON('http://127.0.0.1:8088/api/cron/jobs', 'product-owner')) || [];
const scopingFunciona = jobsPO.length !== jobs.length ||
  JSON.stringify(jobsPO.map((j) => j.id)) !== JSON.stringify(jobs.map((j) => j.id));

const cronsByOwner = {};
for (const a of AGENTS) {
  const js = a === 'default' ? jobs : ((await getJSON('http://127.0.0.1:8088/api/cron/jobs', a)) || []);
  for (const j of js) {
    if (!j.enabled) continue;
    (cronsByOwner[a] = cronsByOwner[a] || []).push(j.name);
  }
}

let fallos = 0, conPreguntas = 0, conDisparador = 0;
console.log('agente            preguntas legibles  crons activos  awaken  veredicto');
console.log('-'.repeat(84));
for (const a of AGENTS) {
  const qs = preguntasVisibles(a);
  const cs = cronsByOwner[a] || [];
  if (qs.length) conPreguntas++;
  if (cs.length) conDisparador++;
  const despierto = cs.length > 0;
  if (qs.length && !despierto) fallos++;
  console.log(
    a.padEnd(17) + String(qs.length).padStart(6) + '        ' +
    String(cs.length).padStart(3) + '         ' +
    (despierto ? 'si' : 'NO').padEnd(8) +
    (qs.length && !despierto ? '  <== preguntas sin nadie que las lea' : '')
  );
  for (const c of cs) console.log('                     cron: ' + c);
  for (const q of qs) console.log('                     - ' + q.file.slice(0, 44) + '  ' + q.subj);
}

console.log('\nCONTROLES');
console.log('  scoping por X-Agent-Id funciona  : ' + (scopingFunciona ? 'SI' : 'NO  <== todo lo de arriba no vale'));
console.log('  jobs de default / de product-owner : ' + jobs.length + ' / ' + jobsPO.length);
console.log('  agentes con preguntas legibles : ' + conPreguntas);
console.log('  agentes con cron activo         : ' + conDisparador);
if (!scopingFunciona) { console.log('  FALLA el control de scoping: los 0 crons no son informacion'); fallos++; }
if (conPreguntas === 0) { console.log('  FALLA el control: no hay ninguna pregunta, "sin disparador" no se puede atribuir'); fallos++; }
if (jobs.length === 0) { console.log('  FALLA el control: /api/cron/jobs vacio, no se puede afirmar nada'); fallos++; }
else console.log('  OK: el endpoint respondio ' + jobs.length + ' jobs para default, la ausencia de un resto SI es informacion');

console.log('\nVEREDICTO: ' + fallos + ' chequeo(s) en fallo.');
process.exit(fallos > 0 ? 1 : 0);
