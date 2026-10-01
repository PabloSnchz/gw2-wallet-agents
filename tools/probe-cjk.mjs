// Detector de CJK/hangul/kana en texto que va a un archivo .md o a un mensaje
// a otro agente. Regla de ALERT-112: el ojo no la agarra, y `node --check`
// tampoco (en un .js, `constX = 1` es sintaxis valida).
//
// Uso: node tools/probe-cjk.mjs <archivo...>
// NOTA: REPORTA, no juzga. `ALERTS_LOG.md` tiene 8 aciertos y todos son
// texto corrupto citado a proposito como evidencia (ALERT-79 y ALERT-112
// documentan el defectoque el detector caza). Un 1 aqui no es "arreglarlo":
// es "mirar la linea y decidir".
import fs from 'node:fs';

// Rangos que NO aparecen nunca en la documentacion de este repo.
const RANGOS = [
  [0x2e80, 0x2fff, 'CJK radicals/puntuacion'],
  [0x3040, 0x30ff, 'kana'],
  [0x3100, 0x312f, 'bopomofo'],
  [0x3400, 0x4dbf, 'CJK ext A'],
  [0x4e00, 0x9fff, 'CJK unificado'],
  [0xa000, 0xa4cf, 'yi'],
  [0xac00, 0xd7af, 'hangul'],
  [0xf900, 0xfaff, 'CJK compat'],
  [0xff00, 0xffef, 'fullwidth'],
];

let sucios = 0;
for (const f of process.argv.slice(2)) {
  const txt = fs.readFileSync(f, 'utf8');
  txt.split(/\r?\n/).forEach((linea, i) => {
    for (const ch of linea) {
      const cp = ch.codePointAt(0);
      for (const [ini, fin, nombre] of RANGOS) {
        if (cp >= ini && cp <= fin) {
          console.log('  ' + f + ':' + (i + 1) + '  U+' + cp.toString(16).toUpperCase() +
            ' (' + nombre + ')  ' + JSON.stringify(linea.trim().slice(0, 60)));
          sucios++;
          return;
        }
      }
    }
  });
}

// CONTROL: si el archivo esta vacio o el rango no matchea nunca, "0 hallazgos"
// no prueba nada. Se prueba el detector contra un caso que DEBE dar positivo.
const canario = 'const' + 'X = 1; // \u4e2d\u6587';
let canarioOk = false;
for (const ch of canario) {
  const cp = ch.codePointAt(0);
  if (RANGOS.some(([ini, fin]) => cp >= ini && cp <= fin)) canarioOk = true;
}
if (!canarioOk) {
  console.log('CONTROL FALLADO: el detector no ve su propio canario.');
  process.exit(2);
}
console.log('CONTROL ok: el detector ve su canario.');
console.log(sucios ? 'CJK ENCONTRADO: ' + sucios : 'sin CJK en ' + (process.argv.length - 2) + ' archivo(s)');
process.exit(sucios ? 1 : 0);