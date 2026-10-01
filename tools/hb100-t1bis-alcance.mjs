// HB#100 - alcance exacto de T1-bis segun el criterio del PO ("degradar, pero
// sin toolbar / sin listeners / sin el 2o saveView"). Pregunta: si el fallback
// se queda pero sin la maquinaria de toolbar, esa maquinaria queda MUERTA, y
// hay que saber si tiene algun caller REAL antes de borrarla.
//
// ALERTA-130 applied to this very detector, first version: el regex
// `\\b${s}\\s*\\(` contaba como llamada local a `WVShopUI.ensureShopToolbar()`,
// o sea una llamada CALIFICADA al metodo de otro modulo. Daba "HAY CALLER
// FUERA -> no se puede borrar" para los 5 simbolos, y era un FALSO ROJO: cada
// modulo tiene su propia copia privada (IIFE) y nada se publica en `window.*`
// (grep de `window.X =` da 0). Segunda vez en el mismo ciclo que un detector
// da un numero creible y falso, y por eso el control va aca adentro: una
// llamada CALIFICADA (`Algo.` o `Algo[` delante) no es un caller local.
import fs from 'node:fs';
const R = (p) => fs.readFileSync(p, 'utf8').split(/\r?\n/);
const out = (s) => process.stdout.write(s + '\n');

const js = fs.readdirSync('js').filter((f) => f.endsWith('.js'));
const SIMBOLOS = ['ensureShopToolbar', 'syncShopToggleLabel', 'saveView', 'shopSyncLine', 'ensureShopHost'];

for (const s of SIMBOLOS) {
  out(`\n=== ${s} ===`);
  const calificadas = [];
  const locales = [];
  for (const f of js) {
    const L = R('js/' + f);
    L.forEach((ln, i) => {
      if (!new RegExp(`\\b${s}\\s*\\(`).test(ln)) return;
      const esDef = new RegExp(`(function\\s+${s}\\b|\\b${s}\\s*=\\s*function)`).test(ln);
      // Callbacks: si el simbolo va precedido de un identificador, es metodo de
      // otro objeto, no el helper local de este modulo.
      const calificada = /[A-Za-z_$][\w$]*\s*\.\s*$/.test(ln.slice(0, ln.indexOf(s)));
      const tag = esDef ? '[def]' : calificada ? '[CALIFICADA -> otro modulo]' : '[local]';
      const linea = `  ${f}:${i + 1} ${tag}  ${ln.trim()}`;
      if (calificada && !esDef) calificadas.push(linea); else locales.push(linea);
    });
  }
  [...locales, ...calificadas].forEach(out);
  out(`  VEREDICTO: ${calificadas.length
    ? 'solo llamadas CALIFICADAS (a otro modulo) -> el helper local NO tiene callers externos'
    : 'todo local'}`);
  // Los callers locales que quedan son los que hay que clasificar a mano:
  // vivo (delegacion) o fallback.
}
