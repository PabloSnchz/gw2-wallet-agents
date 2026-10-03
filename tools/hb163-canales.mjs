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

function scan(text) {
  const head = [...text.matchAll(RE_HEAD)].map((m) => Number(m[1]));
  const any = [...text.matchAll(RE_ANY)].map((m) => Number(m[1]));
  return {
    headMatches: head.length,
    headMax: head.length ? Math.max(...head) : null,
    anyMatches: any.length,
    anyMax: any.length ? Math.max(...any) : null,
    openItems: (text.match(/^- \[ \]/gm) || []).length,
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
const s3 = existsSync(PO_WS) ? scan(readFileSync(PO_WS, 'utf8'))
  : { headMatches: -1, headMax: null, anyMatches: -1, anyMax: null, openItems: -1 };

// ---- CONTROL NEGATIVO: un imposible tiene que dar 0 -------------------------------
const neg = scan('ZZZ999 sin ronda **ZZZ999');

const out = {
  ramas_medidas: c1.length,
  c1_por_fecha: { rama: porFecha.rama, fecha: porFecha.fecha, headMax: porFecha.headMax,
                  headMatches: porFecha.headMatches, anyMax: porFecha.anyMax },
  c1_por_ronda_max: { rama: porRonda.rama, headMax: porRonda.headMax,
                      headMatches: porRonda.headMatches },
  c1_ramas_sin_encabezado: c1.filter((x) => x.headMatches === 0).length,
  c1_ramas_solo_prosa: c1.filter((x) => x.headMatches === 0 && x.anyMatches > 0).length,
  c2_backlog_main: s2,
  c3_pre_backlog_ws: s3,
  control_negativo: neg,
  top5_por_ronda: c1.slice().sort((a, b) => (b.headMax ?? -1) - (a.headMax ?? -1)).slice(0, 5)
    .map((x) => `${x.rama} head=${x.headMax} n=${x.headMatches} any=${x.anyMax}`),
};
console.log(JSON.stringify(out, null, 1));