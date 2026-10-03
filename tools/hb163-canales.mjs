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
const RE_MARCA = /^- \[/gm;
const RE_ABIERTO = /^- \[ \]/gm;

function scan(text) {
  const head = [...text.matchAll(RE_HEAD)].map((m) => Number(m[1]));
  const any = [...text.matchAll(RE_ANY)].map((m) => Number(m[1]));
  const marcador = (text.match(RE_MARCA) || []).length;
  return {
    headMatches: head.length,
    headMax: head.length ? Math.max(...head) : null,
    anyMatches: any.length,
    anyMax: any.length ? Math.max(...any) : null,
    marcadorPresente: marcador,
    // openItems SOLO es una medicion si el marcador existe en el canal. Si no existe,
    // el 0 es vacio: hay que reportarlo como vacio, no como "no hay trabajo".
    openItemsDiscrimina: marcador > 0,
    openItems: (text.match(RE_ABIERTO) || []).length,
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
const controlesOk =
  ctrlPos.openItemsDiscrimina === true && ctrlPos.openItems === 1 &&
  ctrlNeg.openItemsDiscrimina === false && ctrlNeg.openItems === 0;

// Canales cuyo openItems NO es una medicion. Se listan arriba de todo para que un 0
// vacio se lea como vacio y no como "el PO no propuso nada".
const openItemsVacios = [['c2_backlog_main', s2], ['c3_pre_backlog_ws', s3]]
  .filter(([, s]) => !s.openItemsDiscrimina)
  .map(([n]) => n);

const out = {
  // Lo primero que hay que leer: que canales tienen un 0 que NO es medicion.
  // Si esta lista no esta vacia, "0 items" de ahi no se puede usar como criterio.
  openItems_VACIOS_no_son_medicion: openItemsVacios,
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
  top5_por_ronda: c1.slice().sort((a, b) => (b.headMax ?? -1) - (a.headMax ?? -1)).slice(0, 5)
    .map((x) => `${x.rama} head=${x.headMax} n=${x.headMatches} any=${x.anyMax}`),
};
console.log(JSON.stringify(out, null, 1));
// Un control que no puede fallar no es un control: si los controles no coinciden,
// el 0 de los canales queda sin verificar y hay que saberlo por el exit code.
process.exitCode = controlesOk ? 0 : 1;