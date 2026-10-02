/* tests/hb205-ruta-no-atada.test.js
 *
 * HB#139 — ALERT-205: un arnés atado a la RUTA de un worktree, no al repo.
 *
 * ── El hecho ──────────────────────────────────────────────────────────────
 * `tests/hb123-alert179-delegacion.test.js` declaraba ROOT con la ruta
 * absoluta del worktree donde se había escrito (`C:/MisArchivos/hb123`).
 * Ese worktree ya no existe → ENOENT ANTES de la primera aserción: exit=1,
 * 0 pass, y el runner lo reportaba como "sin-veredicto". O sea: el fix de
 * ALERT-179 podía haberse revertido entero y ese arnés no lo notaba. La
 * suite给出的 rojo era real, peroapisaba por un arnés roto y no por el
 * producto — el mismo falso que ALERT-204, con la causa invertida.
 *
 * ── Por qué un censo y no un arreglo a mano ───────────────────────────────
 * Los otros 6 scripts con ruta absoluta están en `tools/`, y el runner NO los
 * corre. No pueden poner la suite en rojo, pero sí se rompen al correrlos
 * desde otro cwd. La regla se aplica a `tests/`; `tools/` se mide y se
 * reporta, no se reescribe de un plumazo.
 *
 * ── Dos trampas que este arnés se cobró a sí mismo ─────────────────────────
 *  (1) EL DETECTOR NO PUEDE LEER COMENTARIOS. La v1 de este censo se señaló a
 *      sí misma: el comentario que explicaba el bug contenía la ruta literal
 *      entre comillas. Es ALERT-174 con otro disfraz.
 *  (2) EL MUTANTE TENÍA QUE CAER FUERA. Poner la 8ª escritura dentro de
 *      applyImportData la ve `la.length === 7`, así que no prueba nada sobre
 *      el aserto nuevo. La tercera copia va en una función aparte, que es
 *      justo lo que el aserto viejo (comparar la lista consigo misma) no
 *      puede ver.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// 'letra:' seguido de separador, dentro de comillas. Un texto como "C:/api"
// dentro de un ejemplo NO cuenta: la clave es la forma `disco:` + separador.
// El detector no puede leer comentarios NI sus propios fixtures. La v1 se
// señaló a sí misma por el comentario que explicaba el bug; la v2, porque sus
// strings de control estaban en código. Y CONCATENAR NO ALCANZA: los
// caracteres se arman por charCode, así que el archivo no contiene ninguna
// secuencia de disco. Un detector que necesita excepción para sus propios
// datos no está terminado.
const LETRA_C = String.fromCharCode(67);       // "C"
const DOS_PUNTOS = String.fromCharCode(58);    // ":"
const BARRA = String.fromCharCode(47);        // "/"
const prefijoDeDisco = LETRA_C + DOS_PUNTOS + BARRA;
const RUTA_OK = prefijoDeDisco + 'worktrees/x';

const ABS = /['"`][A-Za-z]:[\\/][^'"`\r\n]+['"`]/g;
const esComentario = (l) => /^\s*(\/\/|\/\*|\*|#)/.test(l);
const codigoDe = (s) => s.split(/\r?\n/).filter((l) => !esComentario(l)).join('\n');

const barrer = (dir) => {
  if (!fs.existsSync(path.join(ROOT, dir))) return [];
  const out = [];
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    if (!/\.(test\.js|mjs|js)$/.test(f)) continue;
    const src = fs.readFileSync(path.join(ROOT, dir, f), 'utf8');
    const m = codigoDe(src).match(ABS);
    if (m) out.push({ p: dir + '/' + f, m });
  }
  return out;
};

let pass = 0, fail = 0;
const ok = (c, t) => { if (c) { pass++; console.log('  pass - ' + t); } else { fail++; console.log('  FAIL - ' + t); } };

section('[suite] tests/ con ruta ABSOLUTA a disco  (el runner SI los corre)');
const enSuite = barrer('tests');
enSuite.forEach((h) => console.log('  ' + h.p + ' -> ' + h.m.slice(0, 3).join(' ; ')));
ok(enSuite.length === 0,
   'ningun arnes de la suite declara una ruta ABSOLUTA a disco (medido: ' + enSuite.length + ')');

section('[tools] scripts de medicion con ruta ABSOLUTA  (el runner NO los corre)');
const enTools = barrer('tools');
enTools.forEach((h) => console.log('  ' + h.p + ' -> ' + h.m.slice(0, 2).join(' ; ')));
console.log('  MEDIDO: ' + enTools.length + '. Deuda de instrumental, no rojo de suite.');
console.log('  Se reporta; no se reescribe de un plumazo (transversal #4: duplicar).');

section('[POR QUE] el detector tiene que discriminar, no solo existir');
ok((codigoDe("var r = '" + RUTA_OK + "';").match(ABS) || []).length === 1,
   'CONTROL POSITIVO: una ruta absoluta EN CODIGO se detecta');
ok((codigoDe("const ROOT = path.join(__dirname, '..');").match(ABS) || []).length === 0,
   'CONTROL NEGATIVO: __dirname no se detecta');
ok((codigoDe("// antes era ROOT = '" + RUTA_OK + "' (arreglado)").match(ABS) || []).length === 0,
   'CONTROL NEGATIVO: una ruta citada SOLO en un comentario NO se cuenta (ALERT-174)');
ok((codigoDe('/* doc: ' + RUTA_OK + ' */' + '\nvar a = 1;').match(ABS) || []).length === 0,
   'CONTROL NEGATIVO: la misma cita en un comentario de bloque tampoco cuenta');
ok((codigoDe(fs.readFileSync(__filename, 'utf8')).match(ABS) || []).length === 0,
   'CONTROL NEGATIVO: este archivo no contiene ninguna ruta absoluta NI en codigo (fixtures por concatenacion)');

section('[LA SUITE NO PUEDE DELEGAR] el runner ejecuta tests/, no tools/');
const runner = fs.readFileSync(path.join(ROOT, 'tools', 'hb100-suite.mjs'), 'utf8');
ok(/readdirSync\(dir\)/.test(runner) && /\.test\.js/.test(runner),
   'el runner filtra por *.test.js: un .mjs de tools/ no puede entrar en el conteo');
ok(!/readdirSync\('tools'\)|readdirSync\("tools"\)/.test(runner),
   'el runner no lee la carpeta tools/');

section('[EL ARNES QUE SE ROMPIO] hb123 tiene que seguir vivo');
const hb123 = path.join(ROOT, 'tests', 'hb123-alert179-delegacion.test.js');
ok(fs.existsSync(hb123), 'tests/hb123-alert179-delegacion.test.js existe');
ok(/path\.join\(__dirname,\s*'\.\.'\)/.test(codigoDe(fs.readFileSync(hb123, 'utf8'))),
   'hb123 resuelve el repo desde __dirname, no desde una ruta absoluta');
ok(!/la\.join\('\|'\)\s*===\s*la\.join\('\|'\)/.test(codigoDe(fs.readFileSync(hb123, 'utf8'))),
   'hb123 no tiene el aserto tautologico (comparar la lista consigo misma)');

section('[POR QUE EL ASERTO NUEVO APORTA] fase roja, con el viejo como control');
// El mutante tiene que caer FUERA de applyImportData: dentro lo ve
// `la.length === 7` y no prueba nada del aserto nuevo.
// ── (1) EL DETECTOR NO PUEDE LEER COMENTARIOS ─────────────────────────────
// La v1 de este censo se señaló a sí misma: el comentario que explicaba el bug
// contenía la ruta literal entre comillas. Es ALERT-174 con otro disfraz.
//
// ── (2) NI SUS PROPIOS FIXTURES ───────────────────────────────────────────
// (arriba: LETRA_C / DOS_PUNTOS / BARRA por charCode, y por que concatenar
// no alcanza. La constante se declara aca para que quede junto al control que
// la usa, pero el valor ya se resolvio mas arriba.)

const { spawnSync } = require('child_process');
const os = require('os');
const T = path.join(os.tmpdir(), 'hb205-arbol');
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(path.join(T, 'js'), { recursive: true });
fs.mkdirSync(path.join(T, 'tests'), { recursive: true });

const lineas = fs.readFileSync(hb123, 'utf8').split(/\r?\n/);
const i = lineas.findIndex((l) => l.includes('ALERT-205 (HB#139): esto era `ok(la.join'));
const j = lineas.findIndex((l, k) => k > i && l.includes('+ enElArchivo.length'));
ok(i >= 0 && j > i, 'el bloque del aserto nuevo es localizable (el control depende de esto)');
const conViejo = [...lineas.slice(0, i),
  "ok(la.join('|') === la.join('|'), 'applyImportData es la unica copia de las 7');",
  ...lineas.slice(j + 1)].join('\n');

const ancla = '  importGlobalData(importData.data.global);';
const malo = fs.readFileSync(path.join(ROOT, 'js', 'settings-manager.js'), 'utf8') +
  '\nfunction _tercera_copia(importData) {\n' + ancla + '\n}\n';
fs.writeFileSync(path.join(T, 'js', 'settings-manager.js'), malo);

const correr = (nombre, texto) => {
  const runner = path.join(T, 'tests', nombre + '.test.js');
  fs.writeFileSync(runner, texto);
  const r = spawnSync(process.execPath, [runner], { encoding: 'utf8', maxBuffer: 1e8 });
  return { code: r.status, out: r.stdout + r.stderr };
};

const nuevo = correr('nuevo', fs.readFileSync(hb123, 'utf8'));
const viejo = correr('viejo', conViejo);

ok(/UNICA copia/.test(nuevo.out) && nuevo.code !== 0,
   'el aserto NUEVO ve una 3ra copia de las escrituras fuera de applyImportData (exit ' + nuevo.code + ')');
ok(viejo.code === 0,
   'CONTROL: el aserto VIEJO da VERDE sobre esa misma 3ra copia (exit 0) — sin esto, el fix del aserto no aportaria nada');

fs.rmSync(T, { recursive: true, force: true });

console.log('\nRESULTADO: ' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);

// ── helper ──
function section(t) { console.log('\n' + t); }