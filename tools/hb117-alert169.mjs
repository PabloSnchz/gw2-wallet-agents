// ALERT-169: mide si `gn:tokenchange` llega a los modulos de inventario.
//
// Por que un arnes y no una linea de shell: en el HB#114 y el HB#116 un criterio
// de conteo sin control negativo resulto en "0 propuestas" y en "11 rondas
// perdidas". Un criterio que NUNCA puede fallar no esta midiendo. Cada aserto de
// este archivo tiene un control que TIENE que dar el valor contrario.
//
// Corre contra origin/main. No escribe nada.
import { execFileSync } from 'node:child_process';

const REPO = 'C:\\\\Mis Archivos\\\\GW2 online\\\\gw2-dev';
const REF = 'origin/main';
const g = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });
const show = (f) => g(['show', `${REF}:${f}`]);

const fallos = [];
const ok = (cond, msg) => { if (!cond) fallos.push(msg); console.log(`${cond ? 'OK  ' : 'FALLA'} ${msg}`); };

// --- 1. Census de suscripciones -------------------------------------------------
const grep = g(['grep', '-n', 'tokenchange', REF, '--', 'js/']);
const lineas = grep.split('\n').filter(Boolean);
const modulos = lineas.map((l) => l.split(':')[1]);

const conEvento = new Set();
for (const m of modulos) conEvento.add(m);

// CONTROL NEGATIVO: el modulo que SI escucha tiene que aparecer. Si esto da 0,
// el grep esta roto y todo lo de abajo no mide nada.
ok(conEvento.has('js/characters.js'), 'CONTROL POSITIVO: characters.js escucha tokenchange (si no, el grep esta roto)');

// CONTROL NEGATIVO: un modulo que NO escucha tiene que estar ausente.
ok(!conEvento.has('js/wizards-vault.js'), 'CONTROL NEGATIVO: wizards-vault.js NO escucha tokenchange');

// --- 2. El hallazgo --------------------------------------------------------------
const hub = show('js/inventory-hub.js');
const hubDash = show('js/inventory-dashboard.js');
const router = show('js/router.js');
const app = show('js/app.js');

ok(!/tokenchange/.test(hub), 'ALERT-169: inventory-hub.js NO tiene ninguna mencion de tokenchange');
ok(!/tokenchange/.test(hubDash), 'ALERT-169: inventory-dashboard.js NO tiene ninguna mencion de tokenchange');
ok(!/tokenchange/.test(router), 'ALERT-169: router.js NO tiene ninguna mencion de tokenchange');

// CONTROL: router.js SI menciona InventoryHub (si no, el archivo leido es otro).
ok(/InventoryHub/.test(router), 'CONTROL POSITIVO: router.js si menciona InventoryHub');

// --- 3. La cadena que deja el inventario viejo ----------------------------------
// refresh(true) solo debe aparecer en los 2 callers que_medimos.
const callers = (router.match(/InventoryHub\.refresh\(/g) || []).length;
ok(callers === 1, `ALERT-169: router.js llama InventoryHub.refresh() ${callers} vez (esperado 1)`);
ok(/inventory-hub\.js[\s\S]{0,40}refreshBtn[\s\S]{0,200}refresh\(true\)|refreshBtn\.addEventListener\('click', function\(\) \{ refresh\(true\); \}\)/.test(hub)
   || /refresh\(true\); \}\);/.test(hub), 'ALERT-169: inventory-hub.js tiene el refresh manual como 2do caller');

// El guard de silent: sin esto, el router volveria a correr y el bug no existiria.
ok(/if \(!opts\.silent && gs && changedByCode\)/.test(app),
   'ALERT-169: el guard `!opts.silent` de app.js:843 esta presente (si no, el analisis entero cae)');

// --- 4. El doc que miente -------------------------------------------------------
ok(/InventoryHub:\s*escucha\s*`?gn:tokenchange/.test(show('AGENTS.md')),
   'CONTROL: AGENTS.md sigue diciendo que InventoryHub escucha tokenchange (el doc contradice al codigo)');

console.log('\n--- resumen ---');
console.log('modulos que escuchan tokenchange:', [...conEvento].sort().join(', '));
console.log('fallos:', fallos.length);
if (fallos.length) { fallos.forEach((f) => console.log('  -', f)); process.exit(1); }
console.log('ALERT-169 CONFIRMADO contra', REF);