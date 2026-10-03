// HB#164 — ALERT-233. Por que el punto 1 del banner de HEARTBEAT.md no puede fallar.
//
// MEDIDO, no hipotesis (cmd.exe, `findstr`, 2026-10-03):
//
//   1) `findstr` con VARIOS archivos es un OR, no un AND. Devuelve 0 si encuentra
//      la cadena en ALGUNO. Medido con 4 espejos distintos, todos con el canonico
//      presente y correcto:
//        espejo con la cadena    -> exit=0, 7 lineas
//        espejo SIN la cadena   -> exit=0, 7 lineas   <-- indistinguible
//        espejo vacio           -> exit=0, 7 lineas   <-- indistinguible
//        solo el canonico        -> exit=0, 7 lineas   <-- indistinguible
//      O sea: el chequeo que el banner declara "EL QUE IMPORTA: es el que habria
//      parado este bug" NO LEE EL ESPEJO. Con el espejo en la version VENCIDA
//      del paso 3, da VERDE. Es un aserto que no puede fallar.
//
//   2) El comando esta escrito con la RUTA PARTIDA en dos lineas (hard-wrap).
//      Copiado VERBATIM tal como aparece en el banner: exit=0, 7 lineas, y no
//      lee el espejo — el espacio del hard-wrap entra en la ruta. O sea que el
//      unico caso en que el check falla es el ACCIDENTAL, nunca el que pretende
//      detectar.
//
// ESTE ARCHIVO es el AND de verdad: mide cada archivo por separado y falla si
// CUALQUIERA de los dos no cumple. Los 4 checks del banner son de FORMA (miran
// si el comando esta escrito, o cuantas secciones hay); este es el unico que
// mide lo que el paso HACE sobre los dos archivos.
//
// REGLAS que este archivo respeta (importan mas que el resultado):
//   - Control negativo OBLIGATORIO: si un espejo sin la cadena pasara, el
//     control no discrimina y hay que arreglarlo antes de confiar en el verde.
//   - No se imprime el marcador vencido del paso 3 (ALERT-216): lo que un
//     control tiene que medir no puede ser algo que el material que controla
//     menciona a proposito. La senal es la AUSENCIA.
//   - El fin de linea se mide como CARACTER (ALERT-HB163): comparar recounts de
//     lineas grita en falso, porque la operacion cambia el numero de lineas.
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const CANON = 'C:/Mis Archivos/GW2 online/gw2-dev/HEARTBEAT.md';
const ESPEJO = 'C:/Users/psanc/.qwenpaw/workspaces/default/HEARTBEAT.md';
const TMP = process.env.TEMP + '\\_hb164_ctl.md';

// La senal de que el paso 3 RESUELVE la rama viva en vez de pinear una:
// el comando que recorre refs/remotes/origin/po/ esta presente. Un paso 3
// pineado a un nombre fijo no lo tiene.
const SENAL = 'for-each-ref';
const ENCABEZADO = /^### /gm;

const controles = [];
const add = (nombre, ok, detalle) => controles.push({ nombre, ok, detalle });

function leer(p) {
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8');
}

// EOL como caracter: puro LF => crlf 0; puro CRLF => crlf == lf.
function eol(t) {
  const crlf = (t.match(/\r\n/g) || []).length;
  const lf = (t.match(/\n/g) || []).length;
  return { crlf, lf, clase: crlf === 0 ? 'LF' : crlf === lf ? 'CRLF' : 'MIXTO' };
}

// Paridad de comentarios HTML. Nacio de ALERT-232: un ancla de una linea con
// delimitador dejo el `<!--` de apertura sin cerrar y el bloque nuevo quedo
// DENTRO del comentario, invisible. El control que faltaba era este.
function paridadComentarios(t) {
  const abre = (t.match(/<!--/g) || []).length;
  const cierra = (t.match(/-->/g) || []).length;
  return { abre, cierra, parejo: abre === cierra };
}

// ALERT-234 (HB#165): LA PARIDAD NO ALCANZA. Medido 2026-10-03.
//
// El control de arriba (paridad `<!--`/`-->`) dio VERDE con el archivo ROTO:
// 132/132, parejo, y el texto estaba partido a la mitad de una_oracion, con la
// afirmacion original DUPLICADA y 5 lineas de prosaBroken FUERA del comentario.
// Razon: cuando el ancla matchea el TEXTO de una linea `<!-- ... -->` sin los
// delimitadores, el texto sale del comentario pero los delimitadores no se
// mueven: la paridad no cambia. O sea: **mover texto fuera de un comentario no
// altera el conteo de delimitadores.** La paridad es NECESARIA y NO SUFICIENTE.
//
// EL CONTROL QUE FALTA, medido contra el blob intacto: dentro del banner, una
// linea desnuda (que no empieza con `<!--`) y que tiene contenido solo puede
// estar en sangria 0, 3 o 6. Cualquier otra sangria es texto que se movio de
// lugar. En el blob hay 29 lineas desnudas y TODAS en 0/3/6 (14/12 + 3 vacias).
// En el archivo roto hay 5 en sangria 21: exactamente las 5 lineas partidas.
const BANNER_CIERRE = /^<!-- Si alguno falla/m;
const SANGRIAS_OK = new Set([-1, 0, 3, 6]); // -1 = linea `>` vacia

function sangriaImposible(t) {
  if (!t) return { malas: [], total: 0 };
  const m = t.match(BANNER_CIERRE);
  if (!m) return { malas: [], total: 0, sinRegion: true };
  const region = t.slice(0, m.index);
  const malas = [];
  let total = 0;
  region.split(/\r?\n/).forEach((l, i) => {
    if (!l.trim() || l.startsWith('<!--')) return;
    total++;
    const mm = /^>(\s*)(\S)/.exec(l);
    const sp = mm ? mm[1].length : -1;
    if (!SANGRIAS_OK.has(sp)) malas.push({ n: i + 1, sp, txt: l.trim().slice(0, 44) });
  });
  return { malas, total };
}

const canon = leer(CANON);
const espejo = leer(ESPEJO);

add('el canonico existe', canon !== null, canon ? '' : 'no se puede leer');
add('el espejo existe', espejo !== null, espejo ? '' : 'no se puede leer');

if (canon && espejo) {
  // --- EL AND: cada archivo por separado. Este es el punto. ------------------
  add('canonico tiene la senal del paso 3', canon.includes(SENAL), '');
  add('ESPEJO tiene la senal del paso 3', espejo.includes(SENAL),
      '*** el OR de findstr no lo puede ver: con 2 archivos da VERDE igual ***');

  // Paridad de secciones, medida por archivo (no la suma).
  const cs = (canon.match(ENCABEZADO) || []).length;
  const es = (espejo.match(ENCABEZADO) || []).length;
  add('paridad de secciones', cs === es, `canonico=${cs} espejo=${es}`);

  // Paridad de comentarios en los DOS (ALERT-232).
  const pc = paridadComentarios(canon);
  const pe = paridadComentarios(espejo);
  add('paridad <!--/--> en el canonico', pc.parejo, `${pc.abre}/${pc.cierra}`);
  add('paridad <!--/--> en el espejo', pe.parejo, `${pe.abre}/${pe.cierra}`);

  // ALERT-234: sangria imposible en el banner (texto que salio del comentario).
  const gc = sangriaImposible(canon);
  const ge = sangriaImposible(espejo);
  const fmt = (g) => g.sinRegion ? 'sin region de banner'
    : g.malas.length ? g.malas.map((x) => `L${x.n}/sp${x.sp}`).join(' ')
    : `${g.total} lineas, todas en 0/3/6`;
  add('sin sangria imposible en el canonico', !gc.sinRegion && gc.malas.length === 0, fmt(gc));
  add('sin sangria imposible en el espejo', !ge.sinRegion && ge.malas.length === 0, fmt(ge));
}

// --- CONTROL NEGATIVO: un espejo ROTO tiene que dar ROJO. ---------------------
// Si esto pasara, el control de arriba no discrimina y su verde no vale nada.
let ctlNeg = { corrio: false, detecto: false, detalle: 'no se pudo correr' };
try {
  const roto = '### uno\n### dos\nver la rama origin/po/hb99-dashboard\n';
  writeFileSync(TMP, roto, 'utf8');
  const salida = execFileSync(process.execPath, ['-e', `
    const {readFileSync}=require('fs');
    const t=readFileSync(${JSON.stringify(TMP)},'utf8');
    process.stdout.write(t.includes(${JSON.stringify(SENAL)})?'SENAL':'SIN_SENAL');
  `], { encoding: 'utf8' });
  ctlNeg = { corrio: true, detecto: salida.trim() === 'SIN_SENAL',
             detalle: `un espejo con el paso 3 VENCIDO => ${salida.trim()}` };
  unlinkSync(TMP);
} catch (e) {
  ctlNeg = { corrio: false, detecto: false, detalle: String(e.message).slice(0, 120) };
}
add('control negativo: un espejo VENCIDO se detecta', ctlNeg.detecto, ctlNeg.detalle);

// --- CONTROL NEGATIVO del detector de sangria (ALERT-234) ---------------------
// Sin esto, "sin sangria imposible" podria ser un control que nunca dispara.
// Se construye un banner roto A MEDIDA (texto sintetico, no el archivo real:
// ALERT-216) con una sola linea desnuda en sangria 21, y se exige que la
// marque. Si no la marca, el control no discrimina.
const ROTO_SIN = '<!-- x -->\n' +
  '>   4. bloque legitimo en sangria 3\n' +
  '>      continuacion legitima en sangria 6\n' +
  '>                     IMPORTA" al aire en sangria 21\n' +
  '<!-- y -->\n' +
  '<!-- Si alguno falla, el canonico gana. -->\n';
const SANO_SIN = ROTO_SIN.split('\n').filter((l) => !l.includes('sangria 21')).join('\n');
const gRoto = sangriaImposible(ROTO_SIN);
const gSano = sangriaImposible(SANO_SIN);
add('control negativo: sangria 21 se detecta',
    gRoto.malas.length === 1 && gRoto.malas[0].sp === 21,
    `banner roto => ${gRoto.malas.length} mala(s)`);
add('control negativo: banner sano NO dispara',
    gSano.malas.length === 0,
    `banner sano => ${gSano.malas.length} mala(s), ${gSano.total} lineas desnudas`);

// --- CONTROL DE EOL: caracter, no recuento. ----------------------------------
if (canon && espejo) {
  const ec = eol(canon), ee = eol(espejo);
  add('sin EOL mixto', ec.clase !== 'MIXTO' && ee.clase !== 'MIXTO',
      `canonico=${ec.clase} espejo=${ee.clase}`);
}

const fallos = controles.filter((c) => !c.ok);
console.log('HB#164 — ALERT-233: el AND entre canonico y espejo');
console.log('canonico: ' + CANON);
console.log('espejo:   ' + ESPEJO);
console.log('');
for (const c of controles) {
  console.log((c.ok ? '  OK   ' : '  FALLA') + ' ' + c.nombre + (c.detalle ? '  [' + c.detalle + ']' : ''));
}
console.log('');
console.log('RESULTADO: ' + (fallos.length ? fallos.length + ' FALLA(S)' : 'todos los controles OK'));
process.exit(fallos.length ? 1 : 0);