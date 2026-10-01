// hb95: medir el estado REAL de la 49G y de las filas "esperando veredicto" del BACKLOG.
// No leer la fila: medir el repo.
import { execSync } from 'node:child_process';

const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();

console.log('=== 1. La 49G (Idea 49G) esta en main? ===');
const inMain = (sha) => {
  try { sh(`git merge-base --is-ancestor ${sha} origin/main`); return 'SI'; }
  catch { return 'NO'; }
};
for (const sha of ['1a47d5c', 'c04496e', '86b351a']) {
  console.log(`  ${sha} ancestro de origin/main: ${inMain(sha)}`);
}
console.log('  ¿existe el commit 1a47d5c?', (() => {
  try { return sh('git cat-file -t 1a47d5c'); } catch { return 'NO EXISTE'; }
})());

console.log('\n=== 2. ¿La 49G se fusiono alguna vez? (búsqueda por el mensaje del commit) ===');
console.log(sh('git log --oneline origin/main --grep="49g" -i -n 10').split('\n').filter(Boolean).join('\n') || '  (nada)');

console.log('\n=== 3. Filas del BACKLOG que dicen "esperando veredicto" ===');
const raw = sh('git show origin/main:BACKLOG.md');
raw.split('\n').forEach((l, i) => {
  if (/esperando veredicto|espera veredicto|veredicto del Reviewer/i.test(l)) {
    const ln = i + 1;
    // extrae el identificador de idea de la linea o de las 6 anteriores
    const ctx = raw.split('\n').slice(Math.max(0, i - 6), i + 1).join('\n');
    const idea = (ctx.match(/Idea\s+([0-9]+[A-Z]?(?:\s*\+\s*[A-Z])?)/) || [])[1] || '???';
    const tarea = (ctx.match(/task-[0-9a-f]{6,}/) || [])[0] || '(sin task_id)';
    const pedido = (l.match(/20\d{6}T\d{6}Z[-a-z0-9]*/) || [])[0] || '(sin id de pedido)';
    console.log(`  L${ln}  Idea ${idea}  pedido=${pedido}  ${tarea}`);
    console.log(`        ${l.trim().slice(0, 150)}`);
  }
});

console.log('\n=== 4. ¿Esos task_ids aparecen en COMMS_LOG con veredicto? ===');
const comms = sh('git show origin/main:COMMS_LOG.md');
for (const t of ['task-9c356b9e56fd', 'task-19ca4a2448b8']) {
  const line = comms.split('\n').find((l) => l.includes(t));
  console.log(`  ${t}: ${line ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);
}
console.log('  Veredicto de 49G en COMMS_LOG (grep "49G: RECHAZADO"):',
  /49G:?\s*RECHAZADO/i.test(comms) ? 'SI, esta escrito' : 'NO esta escrito');
