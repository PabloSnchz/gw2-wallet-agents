/* PO Heartbeat 2026-09-30 08:1x - Idea 53 DEFINITIVO.
   Escaneo /v2/achievements completo (1..9999, coma, 200 por request) y saco
   TODOS los requisitos que mencionan "encuentro de incursión".
   Regla de oro de esta ronda: la forma del endpoint se mide contra la API viva,
   y el RANGO se imprime junto al 0 (aca perdi el 7116 por escanear hasta 7000). */
const https = require('https');
const get = u => new Promise(r => https.get(u, x => {
  let d = ''; x.on('data', c => d += c);
  x.on('end', () => { let j = null; try { j = JSON.parse(d); } catch (e) { } r(Array.isArray(j) ? j : []); });
}));

// strike id -> palabras que SOLO aparecen en el requisito de su clear
const MAP = {
  old_lions_court:      ['vieja corte del le'],
  shiverpeaks_pass:     ['picosescalofriantes'],
  voice_claw:           ['voz de los caídos y la garra', 'voz de los caidos y la garra'],
  fraenir:              ['fraenir'],
  boneskinner:          ['pelahuesos'],
  whisper_of_jormag:    ['susurro de jormag'],
  forging_steel:        ['forja de acero', 'reunión en el ojo', 'reunion en el ojo'],
  cold_war:             ['guerra fría', 'guerra fria'],
  aetherblade_hideout:  ['escondite filoetéreo', 'escondite filoetereo'],
  xunlai_jade_junkyard: ['chatarrería de xunlai', 'chatarrena de xunlai'],
  kaineng_overlook:     ['mirador de kaineng'],
  harvest_temple:       ['templo de la cosecha'],
  cosmic_observatory:   ['observatorio cósmico', 'observatorio cosmico'],
  temple_of_febe:       ['templo de febe'],
  guardians_glade:      ['claro del guardián', 'claro del guardian'],
};

(async () => {
  const all = [];
  for (let base = 1; base <= 9999; base += 200) {
    const ids = Array.from({ length: 200 }, (_, i) => base + i).join(',');
    all.push(...await get('https://api.guildwars2.com/v2/achievements?ids=' + ids + '&lang=es'));
    process.stderr.write('.');
  }
  console.log('\nCATALOGO ESCANEADO: ' + all.length + ' achievements (rango 1..9999)');
  const inc = all.filter(a => /encuentro de incursi/i.test(a.requirement || ''));
  console.log('con "encuentro de incursión" en el requirement: ' + inc.length);
  const rest = all.filter(a => !a.requirement && !a.description);
  console.log('achievements SIN requirement (forma vacía): ' + rest.length + '  <- si esto fuera alto, mi filtro no serviría');

  console.log('\n=== MAPEO de los 15 strikes del módulo ===');
  const usados = new Set();
  for (const [id, kws] of Object.entries(MAP)) {
    const hits = inc.filter(a => kws.some(k => a.requirement.toLowerCase().includes(k)));
    // el clear "de verdad" = el cuyo nombre NO es una condicion concreta
    const limpios = hits.filter(a => !/bonificaci|contraataque|ataque prioritario|modo desafío|sin que|10 segundos|veces|misión/i.test(a.name));
    const pick = limpios[0] || hits[0];
    if (pick) usados.add(pick.id);
    console.log('  ' + id.padEnd(22) + (pick
      ? 'id ' + String(pick.id).padStart(5) + '  ' + pick.name.padEnd(40) + ' | ' + pick.requirement.slice(0, 62)
      : '*** SIN CLEAR ENCONTRADO ***'));
  }
  const sinClear = Object.keys(MAP).filter(id => {
    const kws = MAP[id];
    return !inc.some(a => kws.some(k => a.requirement.toLowerCase().includes(k)));
  });
  console.log('\n  strikes SIN clear: ' + (sinClear.length ? sinClear.join(', ') : 'NINGUNO - los 15 tienen clear'));
  console.log('  (otros requisitos de strike, por si el modulo los necesita: ' +
    inc.filter(a => !usados.has(a.id)).map(a => a.id + ':' + a.name.slice(0, 28)).slice(0, 12).join(' | ') + ')');
})();
