// Idea 49 Tramo C — medicion contra la API REAL (no registros sinteticos).
// Pregunta: el sharding deja la metadata en 1.71 MB (BACKLOG) o 3.58 MB (test)?
// Y el drop de los 5 campos que nadie lee, cuanto suma de verdad?
const API = 'https://api.guildwars2.com';
const LANG = 'es';            // el codigo cachea con CFG.LANG
const SHARD = 200;
const CUOTA = 4.98 * 1024 * 1024;
const CUENTAS = 27;
const POR_CUENTA = 1500;

// 1) Barrer el catalogo real de logros para saber el rango de ids y el tamano.
async function barrer() {
  const todos = [];
  for (let i = 0; i < 4000; i += 200) {
    const ids = Array.from({ length: 200 }, (_, k) => i + k).join(',');
    const r = await fetch(`${API}/v2/achievements?ids=${ids}&lang=${LANG}`);
    if (!r.ok) continue;
    const data = await r.json();
    todos.push(...data);
  }
  return todos;
}

const MUERTOS = ['bits', 'requirement', 'locked_text', 'prerequisites', 'point_cap'];

function medir(registros,iuente) {
  return JSON.stringify(registros.map(r => {
    if (!iuente) return r;
    const c = {};
    for (const k of Object.keys(r)) if (!MUERTOS.includes(k)) c[k] = r[k];
    return c;
  }));
}

(async () => {
  const cat = await barrer();
  console.log(`Catalogo real: ${cat.length} logros, ids ${Math.min(...cat.map(a=>a.id))}..${Math.max(...cat.map(a=>a.id))}`);

  // 2) 27 cuentas con subconjuntos SOLAPADOS de ~1500 (modelo del test).
  const pool = cat.slice();
  const cuentas = [];
  for (let c = 0; c < CUENTAS; c++) {
    const set = [];
    while (set.length < POR_CUENTA) {
      const a = pool[Math.floor(Math.random() * pool.length)];
      if (!set.includes(a.id)) set.push(a.id);
    }
    cuentas.push(set);
  }
  const shards = new Set(cuentas.flat().map(id => Math.floor(id / SHARD)));
  console.log(`Shards tocados: ${shards.size} (rango esperado ~${Math.ceil(Math.max(...pool.map(a=>a.id))/SHARD)})`);

  // 3) Cada shard guarda el subconjunto que las cuentas aportaron (NO el shard entero).
  for (const iu of [false, true]) {
    const bags = new Map();
    for (const c of cuentas) {
      for (const id of c) {
        const s = Math.floor(id / SHARD);
        if (!bags.has(s)) bags.set(s, []);
        if (!bags.get(s).some(r => r.id === id)) bags.get(s).push(cat.find(a => a.id === id));
      }
    }
    let bytes = 0;
    for (const [s, recs] of bags) bytes += medir(recs, iu).length + `ach_meta_v3:${LANG}:${s}`.length + 12;
    const mb = bytes / 1024 / 1024;
    console.log(`${iu ? 'CON drop 5 campos' : 'SIN drop (como esta)'} : ${bags.size} claves, ${mb.toFixed(2)} MB, ${(bytes / CUOTA * 100).toFixed(1)}% de la cuota`);
  }
  const ej = cat.find(a => a.bits || a.requirement || a.locked_text || a.prerequisites || a.point_cap);
  if (ej) console.log(`\nEjemplo registro #${ej.id}: ${JSON.stringify(ej).length} B -> sin campos muertos ${JSON.stringify(Object.fromEntries(Object.entries(ej).filter(([k])=>!MUERTOS.includes(k)))).length} B`);
  const sinDead = cat.filter(a => !MUERTOS.some(k => a[k] != null));
  console.log(`Logros que tienen al menos 1 campo muerto: ${cat.length - sinDead.length}/${cat.length}`);
})();