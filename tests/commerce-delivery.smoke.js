// Smoke test del banner de caja del TP.
// NO copia la función: la extrae del archivo real y la evalúa, así que
// si alguien edita converter-modal.js el test corre el código de verdad.
const fs = require('fs');
const path = require('path');

const ROOT = require('path').join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js/converter-modal.js'), 'utf8');

// --- extraer la función real + la esc() real ---------------------------
const fnStart = src.indexOf('function renderDeliveryBanner');
const fnEnd = src.indexOf('function getFilteredTransacciones');
if (fnStart < 0 || fnEnd < 0) {
  console.error('FALLO: no se encontró renderDeliveryBanner() en converter-modal.js');
  process.exit(1);
}
const fnSrc = src.slice(fnStart, fnEnd);

// `esc` contiene un callback `function (m)` interno, así que cortar por
// indexOf('function ') la trunca a mitad. Se corta por el cierre con
// sangría de 2 espacios, que es donde termina la función de verdad.
const escMatch = src.match(/function esc\(s\) \{[\s\S]*?\n {2}\}/);
if (!escMatch) {
  console.error('FALLO: no se encontró esc() en converter-modal.js');
  process.exit(1);
}
const escSrc = escMatch[0];
const esc = new Function('return (' + escSrc.replace(/^function esc/, 'function') + ')')();

function build(st) {
  const f = new Function('state', 'esc', fnSrc + '\nreturn renderDeliveryBanner;');
  return f(st, esc)(); // invocar, no devolver la función
}

// --- fixtures ----------------------------------------------------------
const ITEMS = {
  12345: { id: 12345, name: 'Legendaria de Test', icon: 'https://example.test/i.png' },
  999:   { id: 999,   name: 'Objeto "raro" & <b>html</b>', icon: 'https://example.test/j.png' }
};

const cases = [
  {
    name: 'pending (3 items, 1 sin metadata)',
    st: { deliveryStatus: 'pending',
          delivery: [{ item_id: 12345, quantity: 2 }, { item_id: 777, quantity: 1 }, { item_id: 999, quantity: 5 }],
          itemsById: ITEMS },
    expect: ['data-cv-color="pending"', '3 ítems sin recoger', 'no dice cuáles son', '<strong>8</strong> unidades', 'Legendaria de Test', 'Ítem #777']
  },
  {
    name: 'pending (singular)',
    st: { deliveryStatus: 'pending', delivery: [{ item_id: 12345, quantity: 1 }], itemsById: ITEMS },
    expect: ['data-cv-color="pending"', '1 ítem sin recoger', 'Legendaria de Test']
  },
  {
    name: 'error',
    st: { deliveryStatus: 'error', delivery: [], itemsById: {} },
    expect: ['data-cv-color="error"', 'No se pudo leer', 'cvDeliveryRetry', 'tradingpost']
  },
  { name: 'empty (silencio)', st: { deliveryStatus: 'empty', delivery: [], itemsById: {} }, expect: [''] },
  { name: 'unknown (aún no consultado)', st: { deliveryStatus: 'unknown', delivery: [], itemsById: {} }, expect: [''] }
];

// --- aserciones -------------------------------------------------------
let pass = 0, fail = 0;
for (const c of cases) {
  const html = build({ transacciones: c.st });
  const missing = c.expect.filter(e => !html.includes(e));
  if (missing.length === 0) {
    console.log(`  OK   ${c.name}  (${html.length} chars)`);
    pass++;
  } else {
    console.log(`  FAIL ${c.name}  faltan: ${JSON.stringify(missing)}`);
    console.log(`       html: ${html.slice(0, 400)}`);
    fail++;
  }
}

// --- XSS: el nombre del item viene de la API -------------------------
const xss = build({ transacciones: { deliveryStatus: 'pending',
  delivery: [{ item_id: 999, quantity: 1 }], itemsById: ITEMS } });
const escaped = xss.includes('&lt;b&gt;') && !xss.includes('<b>html</b>');
console.log(`  ${escaped ? 'OK  ' : 'FAIL'} XSS: nombre de item escapado por esc()`);
escaped ? pass++ : fail++;

// --- cap de chips (12) + contador "+N" -------------------------------
const many = Array.from({ length: 20 }, (_, i) => ({ item_id: 12345, quantity: 1 }));
const capped = build({ transacciones: { deliveryStatus: 'pending', delivery: many, itemsById: ITEMS } });
const chipCount = (capped.match(/cv-delivery__chip"/g) || []).length;
const hasMore = capped.includes('+8');
const capOk = chipCount === 12 && hasMore;
console.log(`  ${capOk ? 'OK  ' : 'FAIL'} tope de chips: ${chipCount} renderizados (esperado 12), badge "+8" ${hasMore ? 'presente' : 'AUSENTE'}`);
capOk ? pass++ : fail++;

// --- el render NO escribe estilos inline ------------------------------
const anyInline = /style="/.test(
  cases.map(c => build({ transacciones: c.st })).join('')
);
console.log(`  ${!anyInline ? 'OK  ' : 'FAIL'} sin style= inline en el banner (capa 3 lo pone el theme)`);
!anyInline ? pass++ : fail++;

console.log(`\n${pass} OK / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
