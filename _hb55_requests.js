/* PO Heartbeat 2026-09-30 08:0x - Idea 55: cuantas requests hace CADA modulo con 27 cuentas
   pregunta nueva de la ronda: no "que feature falta" ni "cuanto pesa la cache",
   sino "cuanto pide cada modulo y hay alguno que se pasa de su presupuesto solo".
   No necesita token: es un grafo estatico de llamadas. */
const fs = require('fs');
const path = require('path');

const DIR = 'C:\\Mis Archivos\\GW2 online\\gw2-dev\\js';
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.js'));

// 1) Quien llama a que wrapper de GW2Api
const byWrapper = {};
const byModule = {};
for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const calls = [...src.matchAll(/GW2Api\.(\w+)/g)].map(m => m[1]);
  const direct = [...src.matchAll(/['"`](\/v2\/[a-z0-9\/_-]+)/gi)].map(m => m[1]);
  const fetchN = (src.match(/\bfetch\s*\(/g) || []).length;
  if (!calls.length && !direct.length) continue;
  byModule[f] = { calls: [...new Set(calls)], direct: [...new Set(direct)], fetchN };
  for (const c of new Set(calls)) (byWrapper[c] = byWrapper[c] || []).push(f);
}

console.log('=== WRAPPERS DE GW2Api QUE USA MAS DE UN MODULO (posible duplicacion) ===');
let dupes = 0;
for (const [w, mods] of Object.entries(byWrapper).sort((a, b) => b[1].length - a[1].length)) {
  if (mods.length > 1) { console.log('  ' + w.padEnd(32) + mods.length + ' modulos: ' + mods.join(', ')); dupes++; }
}
console.log('  total wrappers duplicados: ' + dupes + ' / ' + Object.keys(byWrapper).length);

console.log('');
console.log('=== WRAPPERS QUE NADIE USA (0 callers) ===');
const api = fs.readFileSync(path.join(DIR, 'api-gw2.js'), 'utf8');
const exported = [...api.matchAll(/^\s{2,4}(\w+)\s*:\s*(\w+)\s*,?\s*$/gm)].map(m => m[1]);
const declared = [...api.matchAll(/\n\s{2}function (\w+)\s*\(/g)].map(m => m[1]);
const orphan = [];
for (const fn of new Set(declared)) {
  const isUsedElsewhere = Object.keys(byWrapper).some(w => w.toLowerCase().includes(fn.toLowerCase().replace(/^(get|fetch)/, '')));
  if (!isUsedElsewhere) orphan.push(fn);
}
console.log('  ' + orphan.join(', '));

console.log('');
console.log('=== MODULOS: llamadas GW2Api + fetch crudo + /v2/ literales ===');
for (const [f, m] of Object.entries(byModule).sort((a, b) => b[1].calls.length - a[1].calls.length)) {
  console.log('  ' + f.padEnd(26) + 'gw2api:' + String(m.calls.length).padStart(3) +
    '  fetch(' + String(m.fetchN).padStart(3) + ')' +
    (m.direct.length ? '  rutas:' + m.direct.slice(0, 4).join(' ') : ''));
}

console.log('');
console.log('=== WRAPPER vs MODULO: quien llama getCharacters / inventory / bank ===');
for (const w of ['getCharacters', 'getCharacterInventory', 'getAccountBank', 'getAccountMaterials', 'getAccountAchievements', 'getAccountInfo', 'getWallet', 'getAccountRaids', 'getAccountTitles', 'getCommerceListings']) {
  console.log('  ' + w.padEnd(28) + '-> ' + ((byWrapper[w] || []).join(', ') || 'NINGUNO'));
}
