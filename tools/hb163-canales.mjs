// HB#163 — medicion de las TRES dimensiones de "cual es la rama/canal vivo del PO".
// ALERT-231: el paso 3 mira UN canal (DASHBOARD_PO_IDEAS.md en la rama por fecha).
// ALERT-223: un 0 que no distingue "no existe" de "no lo se buscar" no es medicion.
//   => por canal se CUENTAN los matches, y se reporta el conteo explicito.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const REPO = 'C:/Mis Archivos/GW2 online/gw2-dev';
const PO_WS = 'C:/Users/psanc/.qwenpaw/workspaces/product-owner/PRE_BACKLOG.md';

const git = (...a) =>
  execFileSync('git', a, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

// Regex SOLO de encabezados (misma que escribe HEARTBEAT.md): /ronda (\d+)/ matchea
// prosa y por eso el criterio se invierte. Se miden AMBAS para poder comparar.
const RE_HEAD = /^#{2,} .*?ronda (\d+)/gim;
const RE_ANY = /ronda (\d+)/gi;

// ALERT-236: el marcador de tarea, en CUALQUIER estado y en columna 0.
// Sin esta cuenta, "0 items abiertos" y "0 porque aca no hay checkboxes" son el MISMO
// numero, y el segundo se lee con la misma confianza que el primero.
// ALERT-249: el marcador y el conteo se preguntan con la MISMA forma. Si la guarda
// `openItemsDiscrimina` usara una forma mas estrecha que el numero que custodia, la
// guarda queda rota por construccion: el campo mas estrecho (anclado) puede dar 0
// mientras el numero autoritativo (tolerante) da 3, y los dos se leen como verdad.
// Una guarda tiene que medir con la misma regla que lo que guarda.
const RE_MARCA = /^[ \t]*- \[/gm;
// La forma ANCLADA en columna 0: una casilla abierta que alguien indente bajo un
// subtitulo deja de contar, y en silencio. Se conserva, pero SOLO como diagnostico.
const RE_ABIERTO_ANCLADA = /^- \[ \]/gm;
// ALERT-249: la forma que NO pierde ese item es la que TOLERA SANGRIA, y es la que
// decide el modo de los 5 agentes. Con ALERT-248 la ancla se habia quedado con el campo
// autoritativo (`openItems`) y la forma tolerante con el campo nuevo, que nadie mira.
// Un detector que nadie mira es decorativo, y el defecto de fondo seguia vivo: el
// numero que se lee era el que se decrementa solo. Invertido — `openItems` es la forma
// TOLERANTE. El nombre no cambia porque HEARTBEAT.md lo cita por nombre, y lo que la
// cita tiene que alcanzar es el numero que no puede perder trabajo. La asimetria es lo
// que decide el caso: la forma tolerante es un SUPERCONJUNTO de la anclada, asi que
// `openItems` solo puede subir o quedarse. Subir es hacia MODO PODA (frena); bajar
// seria hacia RECOLECTAR (trae mas trabajo). Un control de carga tiene que fallar
// hacia el lado caro, no hacia el barato.
const RE_ABIERTO = /^[ \t]*- \[ \]/gm;

function scan(text) {
  const head = [...text.matchAll(RE_HEAD)].map((m) => Number(m[1]));
  const any = [...text.matchAll(RE_ANY)].map((m) => Number(m[1]));
  const marcador = (text.match(RE_MARCA) || []).length;
  const abiertosAnclada = (text.match(RE_ABIERTO_ANCLADA) || []).length;
  const abiertos = (text.match(RE_ABIERTO) || []).length;
  return {
    headMatches: head.length,
    headMax: head.length ? Math.max(...head) : null,
    anyMatches: any.length,
    anyMax: any.length ? Math.max(...any) : null,
    marcadorPresente: marcador,
    // openItems SOLO es una medicion si el marcador existe en el canal. Si no existe,
    // el 0 es vacio: hay que reportarlo como vacio, no como "no hay trabajo".
    openItemsDiscrimina: marcador > 0,
    // ALERT-249: el campo autoritativo es la forma que TOLERA SANGRIA. Con ALERT-248
    // era la anclada, y por eso se perdia trabajo en silencio.
    openItems: abiertos,
    // La cuenta ANCLADA en columna 0, que es la que pierde un item si alguien lo
    // indenta. Se publica para poder ver la diferencia, no para decidir el modo.
    openItemsAnclada: abiertosAnclada,
    // Cuantos items abiertos hay que la anclada NO ve. Hoy 0 en BACKLOG.md, y por
    // casualidad y no por contrato: las 3 casillas con sangria (L284, L420, L421) son
    // todas `- [x]`. Si esto pasa a >0, ya hay trabajo que la forma anclada perdia.
    openItemsQueLaAncladaPierde: abiertos - abiertosAnclada,
  };
}

// ---- CANAL 1: las 19 ramas po/*, DASHBOARD_PO_IDEAS.md ----------------------------
const ramas = git('for-each-ref', '--format=%(refname:short) %(committerdate:iso8601)',
  'refs/remotes/origin/po/').trim().split('\n').filter(Boolean)
  .map((l) => { const [r, d] = l.split(' '); return { r, d }; })
  .sort((a, b) => (a.d < b.d ? 1 : -1));

const c1 = [];
for (const { r, d } of ramas) {
  let txt = '';
  try { txt = git('show', `${r}:DASHBOARD_PO_IDEAS.md`); } catch { /* rama sin el archivo */ }
  const s = scan(txt);
  c1.push({ rama: r, fecha: d, ...s });
}
const porFecha = c1[0];
const porRonda = c1.reduce((a, b) => (b.headMax ?? -1) > (a.headMax ?? -1) ? b : a);

// ---- CANAL 2: BACKLOG.md en origin/main (la ronda vive en PROSA dentro de la fila) -
const bl = git('show', 'origin/main:BACKLOG.md');
const s2 = scan(bl);

// ---- CANAL 3: PRE_BACKLOG.md del workspace del PO --------------------------------
// ALERT-236: si el archivo no existe NO se puede distinguir de "existe y esta vacio".
// Se reporta el motivo del -1 explicitamente para que el 0 de abajo no se lea solo.
const c3Ausente = !existsSync(PO_WS);
const s3 = c3Ausente
  ? { headMatches: -1, headMax: null, anyMatches: -1, anyMax: null,
      marcadorPresente: -1, openItemsDiscrimina: false, openItems: -1 }
  : scan(readFileSync(PO_WS, 'utf8'));

// ---- CONTROLES -------------------------------------------------------------------
// El flag nuevo tiene que saber decir SI y NO. Un flag que solo sabe decir NO
// convierte todo 0 en "no hay trabajo", que es exactamente el defecto que cierra.
// Con ambos controles el script sale con codigo distinto de 0 si el flag miente.
const ctrlPos = scan('- [ ] abierto\n- [x] tachado\n');   // el flag tiene que decir SI
const ctrlNeg = scan('ZZZ999 sin ronda **ZZZ999');        // y NO
// ALERT-248: el control tiene que DISCRIMINAR el caso que la forma anclada pierde.
// Fixture con 1 abierta en columna 0 y 1 abierta sangrada: la anclada tiene que decir 1
// y la tolerante 2. Si las dos dicen lo mismo, el detector del hueco no funciona y el
// campo nuevo no sirve para reportar nada. Sin este control, "las dos coinciden hoy" se
// lee como "no hay diferencia posible".
const ctrlSangria = scan('- [ ] abierta en columna 0\n  - [ ] abierta sangrada bajo un subtitulo\n');
// El fixture tiene que poner la ancla y el autoritativo en numeros DISTINTOS: con la
// forma tolerante como autoritativo, `openItems` tiene que dar 2 y la anclada 1. Si los
// dos dieran lo mismo, el campo autoritativo habria vuelto a ser el que pierde el item y
// este control no lo veria. El `marcadorPresente` tiene que dar 2 y no 1 por lo mismo:
// la guarda que decide si `openItems` es medicion tiene que ver el mismo caso que el
// numero que custodia.
const controlesOk =
  ctrlPos.openItemsDiscrimina === true && ctrlPos.openItems === 1 &&
  ctrlNeg.openItemsDiscrimina === false && ctrlNeg.openItems === 0 &&
  ctrlSangria.openItems === 2 &&
  ctrlSangria.openItemsAnclada === 1 &&
  ctrlSangria.openItemsQueLaAncladaPierde === 1 &&
  ctrlSangria.marcadorPresente === 2;

// Canales cuyo openItems NO es una medicion. Se listan arriba de todo para que un 0
// vacio se lea como vacio y no como "el PO no propuso nada".
const openItemsVacios = [['c2_backlog_main', s2], ['c3_pre_backlog_ws', s3]]
  .filter(([, s]) => !s.openItemsDiscrimina)
  .map(([n]) => n);

const out = {
  // Lo primero que hay que leer: que canales tienen un 0 que NO es medicion.
  // Si esta lista no esta vacia, "0 items" de ahi no se puede usar como criterio.
  openItems_VACIOS_no_son_medicion: openItemsVacios,
  // ALERT-249: canales donde la forma ANCLADA y la autorativa dan numeros distintos. Con
  // la inversion `openItems` ya no puede perder trabajo, asi que lo que queda en esta
  // lista es DONDE leer el numero anclado seria leer menos del que hay. Hoy vacia (5 = 5
  // en BACKLOG.md, porque no hay ninguna abierta sangrada). Y sigue siendo una lista que
  // nadie mira: por eso la correccion no fue agregarla mas grande, fue poner la forma que
  // no falla EN EL CAMPO QUE SE LEE.
  openItems_INCONSISTENTE_por_forma: [['c2_backlog_main', s2], ['c3_pre_backlog_ws', s3]]
    .filter(([, s]) => s.openItemsQueLaAncladaPierde > 0)
    .map(([n]) => n),
  controles_ok: controlesOk,
  c3_archivo_ausente: c3Ausente,
  ramas_medidas: c1.length,
  c1_por_fecha: { rama: porFecha.rama, fecha: porFecha.fecha, headMax: porFecha.headMax,
                  headMatches: porFecha.headMatches, anyMax: porFecha.anyMax },
  c1_por_ronda_max: { rama: porRonda.rama, headMax: porRonda.headMax,
                      headMatches: porRonda.headMatches },
  c1_ramas_sin_encabezado: c1.filter((x) => x.headMatches === 0).length,
  c1_ramas_solo_prosa: c1.filter((x) => x.headMatches === 0 && x.anyMatches > 0).length,
  c2_backlog_main: s2,
  c3_pre_backlog_ws: s3,
  control_negativo: ctrlNeg,
  control_positivo: ctrlPos,
  // ALERT-249: el fixture que separa las dos formas. Si el autoritativo y el anclado
  // dieran lo mismo ACA, el campo que decide el modo habria vuelto a ser el que pierde
  // el item y el control no lo veria.
  control_sangria: ctrlSangria,
  top5_por_ronda: c1.slice().sort((a, b) => (b.headMax ?? -1) - (a.headMax ?? -1)).slice(0, 5)
    .map((x) => `${x.rama} head=${x.headMax} n=${x.headMatches} any=${x.anyMax}`),
};
console.log(JSON.stringify(out, null, 1));
// Un control que no puede fallar no es un control: si los controles no coinciden,
// el 0 de los canales queda sin verificar y hay que saberlo por el exit code.
process.exitCode = controlesOk ? 0 : 1;