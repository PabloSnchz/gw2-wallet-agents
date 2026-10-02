// HB#123 - ALERT-179: ¿son las 7 escrituras de importFromData y applyImportData
// la MISMA lista? La pregunta al Reviewer era si delegar cambia un contrato
// publico. La respuesta se mide sobre el cuerpo, no sobre el resumen.
//
// Lo que hay que PROBAR, en dos partes:
//   (1) las 7 escrituras son identicas linea por linea -> delegar es seguro
//   (2) las DIFERENCIAS son solo parsear + validar + retorno -> el delegado
//       tiene que quedarlas ADELANTE, no perderlas
const fs = require('fs');
const path = require('path');
// ALERT-205 (HB#139): esto era `const ROOT = 'C:/MisArchivos/hb123'`, la ruta
// del worktree donde se escribio el arnes. Ese worktree ya no existe, asi que el
// archivo moria con ENOENT ANTES de la primera asercion: exit=1, 0 pass, y el
// runner lo reportaba como "sin-veredicto". El fix de ALERT-179 podia haber
// sido revertido entero y este archivo no lo habria notado. Como todos los
// demas: el repo se resuelve desde la ubicacion del propio arnes.
const ROOT = path.join(__dirname, '..');

const src = fs.readFileSync(path.join(ROOT, 'js/settings-manager.js'), 'utf8');
const lines = src.split(/\r?\n/);

const cuerpo = (nombre) => {
  const ini = lines.findIndex((l) => new RegExp('function\\s+' + nombre + '\\s*\\(').test(l));
  if (ini < 0) throw new Error('no existe ' + nombre);
  let fin = ini, nivel = 0, abierto = false;
  for (let i = ini; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { nivel++; abierto = true; }
      else if (ch === '}') nivel--;
    }
    if (abierto && nivel === 0) { fin = i; break; }
  }
  return { ini: ini + 1, fin: fin + 1, txt: lines.slice(ini, fin + 1).join('\n') };
};

const A = cuerpo('applyImportData');
const B = cuerpo('importFromData');

const ESCRITURA = /^\s*import(ApiKeys|WVData|WalletData|ActivitiesData|CharactersData|MetaData|GlobalData)\(/;
const lista = (bloque) =>
  bloque.txt.split(/\r?\n/).filter((l) => ESCRITURA.test(l)).map((l) => l.trim());

const la = lista(A), lb = lista(B);

console.log('applyImportData  : lineas', A.ini + '-' + A.fin);
console.log('importFromData   : lineas', B.ini + '-' + B.fin);
console.log('\nlas 7 escrituras de applyImportData:');
la.forEach((l, i) => console.log('  ' + (i + 1) + '. ' + l.replace(/\s*import(Data)?\(.*/, (m) => m.replace(/\s+/g, ' '))));
console.log('las 7 escrituras de importFromData:');
lb.forEach((l, i) => console.log('  ' + (i + 1) + '. ' + l.replace(/\s*import(Data)?\(.*/, (m) => m.replace(/\s+/g, ' '))));

let pass = 0, fail = 0;
const ok = (cond, txt) => { if (cond) { pass++; console.log('  pass - ' + txt); } else { fail++; console.log('  FAIL - ' + txt); } };

console.log('\n[IDENTIDAD] las dos listas eran la misma (ASI FUE EL HALLAZGO)');
ok(la.length === 7, 'applyImportData tiene las 7 escrituras (medido: ' + la.length + ')');
// ALERT-205 (HB#139): esto era `ok(la.join('|') === la.join('|'), ...)` — una
// comparacion de una lista consigo misma. SIEMPRE verdadera, con el fix o sin
// el fix: una guarda que no puede fallar no es una guarda (misma clase que
// ALERT-92). Lo que la frase queria decir es "las 7 escrituras viven en UN solo
// lugar del archivo", y eso se mide contra el archivo entero, no contra `la`.
const enElArchivo = lines.filter((l) => ESCRITURA.test(l)).map((l) => l.trim());
ok(enElArchivo.length === 7 && enElArchivo.join('|') === la.join('|'),
   'applyImportData es la UNICA copia de las 7 (en todo settings-manager.js: '
   + enElArchivo.length + ')');

// El hallazgo era que las dos listas eran iguales. Aplicado el fix, la segunda
// tiene que HABER DESAPARECIDO -- no "ser igual", sino no existir. Por eso el
// aserto no es de igualdad sino de ausencia, y por eso el control negativo va
// al reves: se inyecta la duplicacion y tiene que romper.
ok(lb.length === 0,
   'importFromData YA NO duplica las 7 escrituras (medido: ' + lb.length + ')');
ok(!ESCRITURA.test(B.txt), 'importFromData no escribe ninguna de las 7 directamente');

// CONTROL NEGATIVO: se reintroduce la duplicacion y el aserto tiene que FALLAR.
// La reinyeccion suma 7 a las 7 que ya estan: 14, que es lo que la duplicacion
// costs. Un control negativo que de 7(false) por la razon equivocada no
// demuestra nada -- tiene que fallar por la razon que dice.
const reintroducido = A.txt.replace('function applyImportData(importData) {',
  'function applyImportData(importData) {\n' + la.map((l) => '  ' + l).join('\n'));
const lbInyectado = reintroducido.split(/\r?\n/).filter((l) => ESCRITURA.test(l)).map((l) => l.trim());
ok(lbInyectado.length === la.length * 2,
   'CONTROL NEGATIVO: al reinyectar, las escrituras se DUPLICAN (7 -> ' + lbInyectado.length + ')');
ok(!(lbInyectado.length === 0),
   'CONTROL NEGATIVO: el aserto de ausencia DETECTA la reinyeccion');

console.log('\n[LO QUE SE PERDERIA] las diferencias NO son solo escrituras');
ok(/typeof importData === 'string'/.test(B.txt), 'importFromData PARSEA un string (applyImportData no)');
ok(/JSON\.parse/.test(B.txt), 'importFromData hace JSON.parse');
ok(/validateImportData\(importData\)/.test(B.txt), 'importFromData VALIDA');
ok(/success:\s*true/.test(B.txt), 'importFromData DEVUELVE { success: true }');
ok(!/validateImportData/.test(A.txt), 'applyImportData NO valida (ya viene validado)');
ok(!/success:\s*true/.test(A.txt), 'applyImportData NO devuelve { success: true }');

console.log('\n[CONSECUENCIA] delegar es seguro SOLO si el parseo va antes');
const delegando = B.txt.replace(/importApiKeys[\s\S]*?importGlobalData\([^)]*\);?/, 'applyImportData(importData);');
ok(delegando.indexOf('JSON.parse') < delegando.indexOf('applyImportData(importData);'),
   'el parseo queda ANTES de delegar');
ok(delegando.indexOf('validateImportData') < delegando.indexOf('applyImportData(importData);'),
   'la validacion queda ANTES de delegar');
ok(/success:\s*true/.test(delegando), 'el { success: true } se conserva');
// El orden inverso seria el bug: delegar antes de validar escribe sin preguntar.
ok(delegando.indexOf('applyImportData(importData);') < delegando.indexOf('JSON.parse') === false,
   'CONTROL NEGATIVO: delegar ANTES de validar se detecta');

console.log('\nRESULTADO: ' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
