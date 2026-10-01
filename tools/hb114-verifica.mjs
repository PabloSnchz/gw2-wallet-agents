// HB#114 - verificar contra origin/main que las 4 secciones "CUENTA" ya estan
// aplicadas o en vuelo, antes de mandar nada al Reviewer (paso 3).
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const R = 'C:\\Mis Archivos\\GW2 online\\gw2-dev';
const g = (...a) => execSync(`git -C "${R}" ${a.join(' ')}`, { encoding: 'utf8' }).trim();

console.log('origin/main =', g('rev-parse', '--short', 'origin/main'));
for (const s of ['1e5aedb', '6c3f8e5', '47a2526', '5a6c8c3', '8ff95b5']) {
  let enMain = false;
  try { execSync(`git -C "${R}" merge-base --is-ancestor ${s} origin/main`); enMain = true; } catch {}
  console.log(`  ${s} ${enMain ? 'EN_MAIN' : 'NO_en_main'}`);
}

// Por que la ronda 35 quedo fuera del conteo: buscar la palabra que la cerro
const txt = readFileSync(process.env.TEMP + '\\hb114-ideas.md', 'utf8');
const lines = txt.split(/\r?\n/);
const h35 = lines.findIndex(l => /ronda 35/i.test(l) && /^##\s*ACTUALIZACION/.test(l));
console.log('\n--- ronda 35: lineas con aplicada/cerrada ---');
for (let i = 0; i < 200; i++) {
  if (/aplicada|cerrada/i.test(lines[i] || '') && i < (h35 + 200)) console.log(`  L${i + 1}: ${lines[i].slice(0, 150)}`);
}