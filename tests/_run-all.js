// Runner de la suite completa. No es un test: solo agrega los exits.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir)
  .filter(f => f.endsWith('.test.js') && !f.startsWith('_'))
  .sort();

let pass = 0, fail = 0, failedFiles = [];
for (const f of files) {
  try {
    const out = execFileSync(process.execPath, [path.join(dir, f)], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
    });
    const m = out.match(/(\d+)\s*pass/i);
    const p = m ? parseInt(m[1], 10) : 0;
    pass += p;
    console.log(`OK   ${f} (${p})`);
  } catch (e) {
    fail++;
    failedFiles.push(f);
    const out = (e.stdout || '') + (e.stderr || '');
    const m = out.match(/(\d+)\s*pass/i);
    const p = m ? parseInt(m[1], 10) : 0;
    pass += p;
    console.log(`FAIL ${f} (${p})`);
    const fl = out.split('\n').filter(l => /FAIL/i.test(l)).slice(0, 6);
    fl.forEach(l => console.log('     ' + l.trim()));
  }
}
console.log(`\nTOTAL aserciones pass: ${pass} | archivos fallados: ${fail}`);
if (failedFiles.length) { console.log('Fallados: ' + failedFiles.join(', ')); process.exit(1); }
