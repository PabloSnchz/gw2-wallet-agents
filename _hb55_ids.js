const https = require('https');
const get = u => new Promise(r => https.get(u, x => {
  let d = ''; x.on('data', c => d += c);
  x.on('end', () => {
    let j = null; try { j = JSON.parse(d); } catch (e) { }
    r({ s: x.statusCode, n: Array.isArray(j) ? j.length : j, rc: x.headers['x-result-count'],
        first: Array.isArray(j) && j[0] ? j[0].id : null, txt: Array.isArray(j) ? null : d.slice(0, 90) });
  });
}));
(async () => {
  const B = 'https://api.guildwars2.com/v2/achievements';
  const cases = {
    'repetido x3':  B + '?ids=6354&ids=7116&ids=6513&lang=es',
    'coma x3':       B + '?ids=6354,7116,6513&lang=es',
    'coma x100':     B + '?ids=' + Array.from({ length: 100 }, (_, i) => i + 6301).join(',') + '&lang=es',
    'coma x200':     B + '?ids=' + Array.from({ length: 200 }, (_, i) => i + 6301).join(',') + '&lang=es',
    'repetido x100': B + '?ids=' + Array.from({ length: 100 }, (_, i) => 6301 + i).join('&ids=') + '&lang=es',
    'coma x300':     B + '?ids=' + Array.from({ length: 300 }, (_, i) => i + 6301).join(',') + '&lang=es',
  };
  for (const [k, u] of Object.entries(cases)) {
    const r = await get(u);
    console.log(k.padEnd(14), 'url_len=' + String(u.length).padStart(5), 'status', r.s,
      'devueltos', r.n, 'X-Result-Count', r.rc, 'primer', r.first, r.txt ? ('ERR ' + r.txt) : '');
  }
  // y el mismo test en otro endpoint, para saber si es del endpoint o de la API
  const o = 'https://api.guildwars2.com/v2/items';
  for (const [k, u] of Object.entries({
    'items coma x200': o + '?ids=' + Array.from({ length: 200 }, (_, i) => i + 1).join(','),
    'items repet x200': o + '?ids=' + Array.from({ length: 200 }, (_, i) => 1 + i).join('&ids='),
  })) { const r = await get(u); console.log(k.padEnd(14), 'status', r.s, 'devueltos', r.n, 'X-Result-Count', r.rc); }
})();
