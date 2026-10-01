// HB#108 - mide P1 del veredicto T13 del Reviewer: los DOS toggles de la
// pantalla Raids/Strikes no coinciden. Uno escribe la pref, el otro no.
//
// REGLA: una afirmacion sin medicion es una premisa (ALERT-129/133).
// Este script NO lee el fixture: extrae las funciones del codigo real.
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.argv[2] || '.');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const rt = rd('js/raid-tracker.js');
const st = rd('js/strike-tracker.js');

let fails = 0;
const chk = (name, cond, extra) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (extra ? '  -> ' + extra : ''));
  if (!cond) fails++;
};

// Devuelve null si no encuentra nada. Un extractor que ABORTA en un criterio
// imposible no puede usarse como control negativo: el control tiene que
// CORRER y decir 0 (ALERT-136: un arnes que rompe antes de medir no mide).
function extraer(src, re, que) {
  const i = src.search(re);
  if (i < 0) return null;
  let d = 0;
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); }
  }
  console.error('EXTRACCION SIN CIERRE: ' + que);
  process.exit(2);
}

console.log('=== 0. CONTROLES DEL ARNES (un criterio imposible da 0) ===');
chk('el extractor NO encuentra una funcion que no existe (control negativo)',
    extraer(rt, /function NO_EXISTE_9F3A_HAY\(\)/, 'x') === null);
chk('el extractor SI anade el cierre que busca (control positivo del balance)',
    (() => { const f = extraer(rt, /function wireViewToggle\(\)/, 'w'); return !!f && /^function /.test(f) && f.endsWith('}'); })());
chk('el extractor SI encuentra wireViewToggle() en raid-tracker.js',
    /function wireViewToggle\(\)/.test(rt));
chk('el extractor SI encuentra wireStrikeViewToggle() en strike-tracker.js',
    /function wireStrikeViewToggle\(\)/.test(st));

// El cuerpo REAL de cada toggle, con sus listeners.
const wRaid = extraer(rt, /function wireViewToggle\(\)/, 'wireViewToggle');
const wStrike = extraer(st, /function wireStrikeViewToggle\(\)/, 'wireStrikeViewToggle');

console.log('\n=== 1. P1: quien ESCRIBE la pref gn:raids:strike:view ===');
const escRaid = /prefSet\s*\(|STORAGE_KEYS_RT\.RAIDS_STRIKE_VIEW/.test(wRaid);
const escStrike = /prefSet\s*\(|STORAGE_KEYS_RT\.RAIDS_STRIKE_VIEW/.test(wStrike);
chk('wireViewToggle (raid-tracker.js) ESCRIBE la pref', escRaid);
chk('wireStrikeViewToggle (strike-tracker.js) NO escribe la pref', !escStrike,
    'esta es la asimetria: el 2o toggle cambia el DOM y deja la pref vieja');

console.log('\n=== 2. P1: quien cambia la VISIBILIDAD de los dos paneles ===');
const tocaRaid = /raidTrackerPanel/.test(wRaid) && /strikesPanel/.test(wRaid);
const tocaStrike = /raidTrackerPanel/.test(wStrike) && /strikesPanel/.test(wStrike);
chk('wireViewToggle cambia la visibilidad de LOS DOS paneles', tocaRaid);
chk('wireStrikeViewToggle cambia la visibilidad de LOS DOS paneles', tocaStrike);
chk('AMBOS toggles mueven la misma visibilidad -> hay 2 escritores de 1 hecho',
    tocaRaid && tocaStrike);

console.log('\n=== 3. P1: quien ACTIVA / DESACTIVA al modulo hermano ===');
// OJO: el criterio tiene que ser `X.activate` EXACTO. Con `window.RaidTracker`
// a secas matchea tambien el `refresh` de la linea 1213 y el control da un
// "true" que no es lo que se pregunta (ALERT-136: el arnes que no discrimina
// es peor que no tener arnes, porque da verde).
const actRaid = /\bStrikeTracker\s*\.\s*activate\s*\(/.test(wRaid);
const deactRaid = /\bStrikeTracker\s*\.\s*deactivate\s*\(/.test(wRaid);
const actStrike = /\bRaidTracker\s*\.\s*activate\s*\(/.test(wStrike);
const deactStrike = /\bRaidTracker\s*\.\s*deactivate\s*\(/.test(wStrike);
console.log('  raid-tracker:   activa al hermano=' + actRaid + '  lo desactiva=' + deactRaid);
console.log('  strike-tracker: activa al hermano=' + actStrike + '  lo desactiva=' + deactStrike);
chk('el criterio "X.activate(" NO matchea un X.refresh( (control de exactitud)',
    !/\bRaidTracker\s*\.\s*activate\s*\(/.test('window.RaidTracker.refresh(false);'));
chk('ninguno de los 2 toggles DESACTIVA al hermano (ni el otro)',
    !deactRaid && !deactStrike,
    'o sea: tras clickear el toggle, el modulo escondido sigue con su latch bajo');

console.log('\n=== 4. EL ESTADO DIVERGENTE, deducido de 1-3 ===');
chk('{DOM visible=raids, pref=strikes} es ALCANZABLE: hay un escritor de DOM',
    tocaStrike, 'strike-tracker cambia el DOM sin tocar la pref');
chk('...y ESTABLE: ese click NO pasa por el unico escritor de la pref',
    !actStrike && !deactStrike,
    'el click de strike-tracker solo llama refresh; no vuelve a setActiveView');
console.log('  => si la pref dice "strikes" y Pablo clickea "Raids" dentro del panel');
console.log('     de Strikes, la vista visible pasa a raids y la pref sigue "strikes".');
console.log('     Un deactivate() keyed en la pref apagaria el modulo que Pablo mira.');

console.log('\n=== 5. CONTROL NEGATIVO: el criterio tiene que PODER fallar ===');
// Mismo criterio, aplicado a un toggle inventado que SI escribe la pref.
const falso = 'function wireFalso(){ prefSet(K,"k","raids"); }';
chk('el criterio "escribe la pref" da TRUE con un toggle que si la escribe',
    /prefSet\s*\(/.test(falso));
chk('el criterio "escribe la pref" da FALSE con un toggle que no la escribe',
    !/prefSet\s*\(/.test('function wireFalso(){ var a = 1; }'));

console.log('\n=== VEREDICTO ===');
console.log(fails === 0
  ? 'P1 CONFIRMADO en origin/main: los 2 toggles no coinciden.'
  : 'P1 NO CONFIRMADO: ' + fails + ' medicion(es) distinta(s) de lo que dice el veredicto.');
process.exit(0);
