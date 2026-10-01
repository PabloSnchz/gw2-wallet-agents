// hb95-sin-mergear.mjs — todas las filas del BACKLOG que dicen "SIN MERGEAR"/"en rama",
// comprobadas una por una contra origin/main con merge-base --is-ancestor.
//
// Por que existe: ALERT-126 encontro 2 filas falsas de esta clase. Si hay mas, la
// alerta esta subdimensionada y hay que decirlo con el numero, no con un ejemplo.
import { execSync } from 'node:child_process';

const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const backlog = sh('git show origin/main:BACKLOG.md').split('\n');
const main = 'origin/main';

const claims = [];
backlog.forEach((line, i) => {
  if (!/sin\s*mergear|no\s*mergead|en rama,? no|provisional/i.test(line)) return;
  // Una fila YA corregida guarda el texto viejo dentro de un tachado (~~...~~), y por
  // eso el pattern la seguia agarrando: 1 falso positivo de 6, la L273 del HB#93.
  // Saltear el tachado lo deja en 0. Regla: un detector que se puede dejar en 0
  // falsos positivos vale la pena arreglarlo; uno que no, se tira y se dice por que.
  if (/~~[^~]+~~/.test(line)) return;
  // ids de ESTA linea. Ojo: hay que SACAR primero los `task-...` y los ids con
  // timestamp, porque si no el patron de sha se come la cola (`task-b20623f46caa`
  // -> "b20623f46caa") y git revienta con "Not a valid object name". Mi primer
  // version hacia exactamente eso.
  const sinIds = line.replace(/task-[0-9a-f]+|\b20\d{6}T\d{6}Z[-a-z0-9]*\b/gi, ' ');
  const shas = [...new Set([...sinIds.matchAll(/\b[0-9a-f]{7,40}\b/g)].map((m) => m[0]))];
  const ids = [...line.matchAll(/task-[0-9a-f]{8,}|(20\d{6}T\d{6}Z[-a-z0-9]*)/g)].map((m) => m[0]);
  if (!shas.length && !ids.length) return;
  claims.push({ ln: i + 1, line, shas, ids: [...new Set(ids)] });
});

console.log(`filas que afirman "sin mergear": ${claims.length}\n`);
let falsas = 0;
for (const c of claims) {
  const res = c.shas.map((s) => {
    let t;
    try { t = sh(`git cat-file -t ${s}`); } catch { return `${s}=NO EXISTE`; }
    if (t !== 'commit') return `${s}=no-es-commit`;
    try { sh(`git merge-base --is-ancestor ${s} ${main}`); return `${s}=EN MAIN`; }
    catch { return `${s}=fuera`; }
  });
  const enMain = res.filter((r) => r.includes('EN MAIN'));
  const malas = enMain.length > 0;
  if (malas) falsas++;
  console.log(`  L${c.ln} ${malas ? '*** FALSA ***' : 'ok'}`);
  console.log(`     ${res.join('  ')}`);
  console.log(`     ${c.line.trim().slice(0, 110)}`);
}
console.log(`\nfilas que afirman "sin mergear" y estan EN MAIN: ${falsas} de ${claims.length}`);
