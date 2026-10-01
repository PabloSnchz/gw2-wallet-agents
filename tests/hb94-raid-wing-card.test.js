/**
 * hb94-raid-wing-card.test.js — T10: ".raid-wing-card es invisible con movimiento reducido".
 *
 * ESTADO: PENDIENTE (ROJO A PROPOSITO). El defecto esta confirmado y medido, pero
 * el arreglo es CSS y la validacion del Reviewer antes de aplicar es obligatoria.
 * Pregunta enviada al Reviewer en HB#94 (3 vias + 1 riesgo). El fix entra cuando
 * llegue el veredicto; este test es el que lo cierra.
 *
 * COMO SE USA HASTA ENTONCES: la seccion [3] se ejecuta y se INFORMA, pero no
 * cuenta como FAIL, para que la suite no quede roja por un fix que todavia no se
 * aplico. No se silencia el aserto: se imprime. Un arnes que se apaga entero
 * informa que no se midio nada (ALERT-115: un detector que no se corre sobre lo
 * nuevo es un detector de museo). En cuanto el CSS este arreglado, borrar el
 * bloque PENDIENTE de abajo y el test vuelve a ser rojo/verde normal.
 *
 * Que se mide: el estado FINAL de la tarjeta cuando el usuario tiene
 * "Efectos de animacion" apagado (prefers-reduced-motion: reduce).
 *
 * Por que no alcanza con grep: opacity:0 + una animacion que la revierte es un
 * estado INVISIBLE que solo se ve con un motor de layout. El PO lo midio
 * contando pixeles de un PNG con el CSS real (control 82.5% de pixeles
 * no-fondo, caso real 0.0% de 68.640). Este test replica la MISMA medicion
 * con el CSS real del repo, para que no dependa de que alguien la vuelva a hacer.
 *
 * Que NO hace: no toca el producto. Solo lee las 3 capas y aplica la cascada.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

let pass = 0, fail = 0;
// PENDIENTE: se apaga SOLO el aserto de comportamiento de la seccion [3], que
// es el que depende del fix. Se sigue ejecutando y se sigue imprimiendo. Todo
// lo demas cuenta normal. Quitar cuando el CSS este aplicado.
let PENDIENTE_COMPORTAMIENTO = false;

const t = (nombre, cond, detalle) => {
  if (cond) { pass++; console.log('  ok   ' + nombre); }
  else if (PENDIENTE_COMPORTAMIENTO && /queda VISIBLE con movimiento reducido/.test(nombre)) {
    console.log('  PENDIENTE ' + nombre + (detalle ? '  -> ' + detalle : ''));
  }
  else { fail++; console.log('  FAIL ' + nombre + (detalle ? '  -> ' + detalle : '')); }
};

/**
 * Resuelve la cascada de UNA propiedad de una regla, en el orden REAL de
 * carga de index.html. Se usa solo para leer las 2 reglas que chocan; no es un
 * motor de cascada general.
 */
function reglasDe(archivo, patron) {
  const txt = leer(archivo);
  const out = [];
  const re = new RegExp('([^{}]+)\\{([^{}]*)\\}', 'g');
  let m;
  while ((m = re.exec(txt)) !== null) {
    if (patron.test(m[1])) out.push({ sel: m[1].trim(), cuerpo: m[2] });
  }
  return out;
}

// --- SECCION 1: las 3 reglas que existen hoy (hechos, noARNES) -----------

console.log('\n[1] Las tres reglas que secondo el hallazgo');
{
  const pol = leer('css/theme-polish.css');
  const main = leer('css/main.css');

  // Esta asercion DESCRIBE el defecto ("la regla que congela existe"). Cuando el
  // fix entre, deja de ser verdad y por eso va en PENDIENTE junto con la de
  // comportamiento: las dos dejan de valer el mismo dia. Verificado con
  // tools/hb94-gate-check.mjs.
  if (PENDIENTE_COMPORTAMIENTO) {
    const roto = /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,200}animation:\s*none\s*!important/.test(pol);
    console.log((roto ? '  ok   ' : '  PENDIENTE ') +
      'theme-polish.css declara prefers-reduced-motion con animation:none!important (el defecto)');
  } else {
    t('theme-polish.css ya NO declara animation:none!important bajo movimiento reducido',
      !/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,200}animation:\s*none\s*!important/.test(pol),
      'la regla que congela el estado inicial sigue presente');
  }

  t('main.css declara prefers-reduced-motion con animation-duration:.001ms (criterio sano)',
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,300}animation-duration:\s*\.001ms/.test(main),
    'no se encontro la regla');

  const orden = leer('index.html');
  const iMain = orden.indexOf('css/main.css');
  const iPol = orden.indexOf('css/theme-polish.css');
  t('theme-polish.css carga DESPUES de main.css (gana el que rompe)',
    iMain > 0 && iPol > iMain, `main=${iMain} pol=${iPol}`);
}

console.log('\n[2] El estado inicial de la tarjeta depende de la animacion');
{
  const pol = leer('css/theme-polish.css');
  const kf = /@keyframes\s+raidFadeInUp\s*\{([\s\S]*?)\n\}/.exec(pol);
  t('la keyframe raidFadeInUp existe y su estado final es opacity:1',
    !!kf && /to\s*\{[^}]*opacity:\s*1/.test(kf[1]),
    kf ? kf[1].slice(0, 60) : 'no existe la keyframe');

  const carta = reglasDe('css/theme-polish.css', /^\s*\.raid-wing-card\s*$/);
  const conOpacity = carta.filter(r => /opacity:\s*0\b/.test(r.cuerpo));
  t('.raid-wing-card pone opacity:0 en la MISMA regla que su animation',
    conOpacity.some(r => /animation\s*:/.test(r.cuerpo)),
    'opacity:0 y animation estan en reglas distintas');
}

// --- SECCION 3: LA CONDUCTA. Aplica la cascada real y calcula el color final.
// ESTA SECCION ES LA QUE FALLA HOY. Se escribe en terminos del COMPORTAMIENTO
// Wanted ("la tarjeta tiene que quedar visible"), no del defecto, para que la
// suite se ponga roja con el bug y verde con el arreglo. Un test que afirma que
// el bug existe es un test de caracterizacion: no previene la regresion.

console.log('\n[3] CASCADE REAL: la tarjeta tiene que quedar VISIBLE con la preferencia activa');

/**
 * Calcula el opacity final de .raid-wing-card bajo la politica de movimiento
 * reducido REAL del repo (la que gana por orden de carga). Sin motor: resuelve
 * por especificidad y orden de carga, que es lo que determina el resultado.
 */
function opacityFinal() {
  // CASCADA POR PROPIEDAD, no por capa. El\arnés anterior hacia
  // `gana = la capa que carga ultimo` y leia SOLO esa: con el fix, theme-polish
  // ya no declara nada y el arnes devolvia 0, o sea **decia que el fix no
  // funciona** cuando el Reviewer lo midio en Chrome real. Es la 2a vez en este
  // archivo que el arnes es el que falla (la 1a, ALERT-124: sin control negativo
  // aprobo el bug que vino a encontrar).
  //
  // Lo que dice el CSS real: `main.css:687` pone `animation-duration:.001ms
  // !important` sobre `*`, y `.raid-wing-card` pone `animation: ... forwards`
  // SIN important. Entre dos declaraciones, gana la important sin importar la
  // especificidad ni el orden. O sea que la animacion no se cancela: corre a
  // duracion ~0 y, con `forwards`, termina en `to{opacity:1}` => visible.
  //
  // Y lo que hacia theme-polish: `animation: none !important` sobre `*`, que es
  // una CANCELACION (animation-name:none). Sin animacion no hay `forwards` y
  // gana el estado inicial de la regla, `opacity: 0`. Las dos son important; si
  // las dos estuvieran presentes, ganaria la que carga ultimo, que es la de
  // theme-polish (index.html: main.css en la 19, theme-polish en la 20).
  //
  // El orden de carga se DERIVA de index.html, no esta fijado: si alguien
  // intercambia las lineas, el resultado tiene que cambiar solo.
  const orden = leer('index.html');
  const iMain = orden.indexOf('css/main.css');
  const iPol = orden.indexOf('css/theme-polish.css');
  const capas = [
    { nombre: 'main', txt: leer('css/main.css'), pos: iMain },
    { nombre: 'pol', txt: leer('css/theme-polish.css'), pos: iPol },
  ].sort((a, b) => a.pos - b.pos); // orden real de carga

  // Ultima declaracion importante que toque la animacion, en orden de carga.
  let cancela = false;
  for (const c of capas) {
    for (const m of c.txt.matchAll(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]{0,400}?)\n\}/g)) {
      const bloque = m[1];
      if (/animation\s*:\s*none\s*!important/.test(bloque)) cancela = true;
      if (/animation-duration\s*:\s*\.001ms\s*!important/.test(bloque)) cancela = false;
    }
  }
  return cancela ? 0 : 1;
}

// CONTROL: la misma tarjeta bajo la politica sana de main.css debe verse.
// Sirve para probar que este arnes NO dice "no a todo".
const control = /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,300}animation-duration:\s*\.001ms\s*!important/.test(leer('css/main.css')) ? 1 : 0;
const real = opacityFinal();

t('CONTROL: el arnes sabe distinguir visible de invisible', control === 1, `control=${control}`);
t('COMPORTAMIENTO: la tarjeta de ala queda VISIBLE con movimiento reducido', real === 1,
  real === 0
    ? 'opacity final 0: la politica de theme-polish.css anula la animacion y congela el estado inicial'
    : `opacity final ${real}`);

// --- SECCION 4: ALCANCE. Quien queda atrapado si la tarjeta no aparece. ---

console.log('\n[4] Alcance de la tarjeta invisible');
{
  const raid = leer('js/raid-tracker.js');
  const strike = leer('js/strike-tracker.js');
  t('raid-tracker.js pone la animacion INLINE y opacity:0 en el mismo style',
    /class="raid-wing-card"[^>]*animation:\s*raidFadeInUp[^>]*opacity:\s*0/.test(raid),
    'no coincide el orden inline');
  t('strike-tracker.js usa .raid-wing-card SIN animacion inline (100% dependiente de la capa 2)',
    /class="raid-wing-card"/.test(strike) && !/class="raid-wing-card"[^>]*animation:/.test(strike),
    'la tarjeta inline si lleva animacion: habria que revisar el supuesto');
  // Los encuentros van DENTRO de la tarjeta -> se pierden con ella.
  // No se adivina el token: se toma el bloque real de la tarjeta y se comprueba
  // que dentro de ese bloque hay un bucle sobre `encounters`.
  const iCarta = raid.indexOf('class="raid-wing-card"');
  const finCarta = raid.indexOf("html += '</div>'", iCarta);
  const bloque = raid.slice(iCarta, finCarta > iCarta ? finCarta : iCarta + 6000);
  t('los encuentros se renderizan DENTRO de la tarjeta del ala (se pierden con ella)',
    /\.encounters\b/.test(bloque),
    `la tarjeta va de ${iCarta} a ${finCarta} y no itera .encounters dentro`);
}

// El formato lo tiene que entender tools/run-suite.js, no solo ser legible:
// su 1er regex es /(\d+)\s+aserciones?,\s*(\d+)\s+FAIL/i -> COMA, no barra.
const resumen = '  TOTAL: ' + (pass + fail) + ' aserciones, ' + fail + ' FAIL  (' +
  (pass + fail) + ' de ' + (pass + fail) + ', alcance completo' +
  (PENDIENTE_COMPORTAMIENTO ? '; 1 PENDIENTE por fix de CSS sin aplicar' : '') + ')';
console.log(resumen);
process.exit(fail === 0 ? 0 : 1);
