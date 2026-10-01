// HB#92: el canal de archivos entrega mensajes que el destinatario NO puede leer.
//
// Que un mensaje este escrito en disco NO significa que haya llegado. El lector
// de un agente es `cli.py inbox` -> `agentlink.inbox(agente, kind='question')`,
// que hace dos cosas:
//
//   1. glob de  <agente>/inbox/*.json     <- la RAIZ de la carpeta NO entra
//   2. filtra por  m['kind'] === 'question'  <- kind ausente o mal escrito no pasa
//
// Un mensaje escrito a mano falla las dos cosas a la vez y NO da error al
// escribirlo: `ask()` es la unica via que las cumple. Por eso el HB#91 cerro
// "entregado verificado: to=Code-Reviewer, 4413 chars" y la 099 era invisible:
// se habia verificado que el JSON existia, no que el LECTOR del destinatario
// lo listara. Es la clase ALERT-115 (algo referenciado que nada detecta) con un
// paso mas: verificar el instrumento en vez del consumidor.
//
// Uso:  node tools/hb92-comms-legible.mjs [ruta-a-_comms]
// Salida: 0 si no hay invisibles, 1 si hay al menos uno. Los de `kind:'reply'`
// en la inbox de otro agente no se cuentan: son copias, no preguntas.
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2]
  || 'C:\\Users\\psanc\\.qwenpaw\\_comms';

const AGENTS = ['default', 'code-reviewer', 'product-owner', 'documenter', 'architect'];
const MIN_BODY = 200;   // un mensaje de menos de esto no es una pregunta real

if (!fs.existsSync(BASE)) {
  console.log('NO EXISTE ' + BASE + ' (pasalo como argumento si esta en otro lado)');
  process.exit(2);
}

// El lector, tal cual. Si esto cambia en agentlink.py, el detector miente.
// OJO: hay DOS lectores, no uno. `inbox` pide kind='question' y `replies` pide
// kind='reply'. Contar un reply como invisible seria un falso positivo que hace
// reenviar respuestas ya entregadas, y un detector que hay que arguear es un
// detector que nadie corre.
const leen = (agente, kind) => {
  try {
    return fs.readdirSync(path.join(BASE, agente, 'inbox'))
      .filter(f => f.endsWith('.json'))
      .filter(f => {
        try {
          return JSON.parse(fs.readFileSync(path.join(BASE, agente, 'inbox', f), 'utf8')).kind === kind;
        } catch { return false; }
      });
  } catch { return []; }
};

const leidas = (agente) => new Set(
  [...leen(agente, 'question'), ...leen(agente, 'reply')].map(f => f.toLowerCase())
);

console.log('CANAL DE ARCHIVOS - que ve cada agente con SU propio lector');
console.log('-'.repeat(56));
console.log('agente'.padEnd(18) + 'VE'.padEnd(8) + 'en disco');
let total = 0;
for (const a of AGENTS) {
  let enDisco = 0;
  try { enDisco = fs.readdirSync(path.join(BASE, a, 'inbox')).filter(f => f.endsWith('.json')).length; } catch { }
  const v = leen(a, 'question').length;
  total += enDisco - v;
  console.log(a.padEnd(18) + String(v).padEnd(8) + enDisco);
}

console.log('');
console.log('=== INVISIBLES (el destinatario no los puede leer) ===');
let encontrados = 0;
for (const a of AGENTS) {
  const vistos = leidas(a);
  const pool = [];
  try { pool.push(...fs.readdirSync(path.join(BASE, a, 'inbox')).filter(f => f.endsWith('.json')).map(f => path.join('inbox', f))); } catch { }
  // La RAIZ tambien se mira: ahi fue a parar la 099.
  try { pool.push(...fs.readdirSync(path.join(BASE, a)).filter(f => f.endsWith('.json')).map(f => f)); } catch { }

  for (const rel of pool.sort()) {
    const base = path.basename(rel);
    if (base === 'last_read.json') continue;
    let m;
    try { m = JSON.parse(fs.readFileSync(path.join(BASE, a, rel), 'utf8')); } catch { continue; }
    const len = (m.body || '').length;
    if (len < MIN_BODY) continue;
    if (rel.startsWith('inbox' + path.sep) && vistos.has(base.toLowerCase())) continue;

    const porQue = [];
    if (!rel.startsWith('inbox' + path.sep)) porQue.push('esta en la RAIZ de ' + a + '/ (fuera de inbox/)');
    if (m.kind !== 'question') porQue.push('kind=' + JSON.stringify(m.kind) + ' y el lector pide exactamente "question"');
    encontrados++;
    console.log('  ' + a + '/' + base);
    console.log('      body=' + len + '  to=' + m.to + '  ->  ' + porQue.join(' + '));
  }
}

console.log('  total = ' + encontrados);
if (encontrados) {
  console.log('');
  console.log('VEREDICTO: ' + encontrados + ' mensaje(s) con cuerpo real que su destinatario NUNCA va a listar.');
  console.log('Reentregar por la via canonica: agentlink.ask(from, to, subject, body).');
  console.log('Verificacion obligatoria: que la ruta nueva aparezca en inbox(to, kind=\'question\').');
  process.exit(1);
}
console.log('VEREDICTO: todo lo que tiene cuerpo es legible por su destinatario.');
