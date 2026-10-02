// HB#124 - ARME 1.2: el modal de materiales.
//
// La pregunta de diseño que se le mandó al Reviewer sigue SIN respuesta
// ("craftType:none" puede o no entrar en la cola). Este arnés NO la supone en
// ninguno de los dos sentidos: fija lo que el modal tiene que mostrar para los
// TRES dataStatus, que es lo que el plan de noche exige en voz alta --
// "un filtro invisible que un día deja de matchear y no dice nada es un bug
// futuro". Si después el Reviewer dice que (a), este archivo es el que hay que
// cambiar, y el cambio queda localizado en un solo lado.
//
// La lógica se EVALUA, no se lee: se extrae el cuerpo de computeMaterials y se
// corre contra stubs. Un aserto sobre el texto del source no distingue una
// función correcta de una que dice algo bonito.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const src = fs.readFileSync(path.join(ROOT, 'js/legendary-tracker.js'), 'utf8');
const srcCat = fs.readFileSync(path.join(ROOT, 'js/render-catologo.js'), 'utf8');
const lines = src.split(/\r?\n/);

const cuerpo = (nombre) => {
  const ini = lines.findIndex((l) => new RegExp('function\\s+' + nombre + '\\s*\\(').test(l));
  if (ini < 0) return null;
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

let pass = 0, fail = 0;
const ok = (cond, txt) => { if (cond) { pass++; console.log('  pass - ' + txt); } else { fail++; console.log('  FAIL - ' + txt); } };

// ---------------------------------------------------------------- evaluacion
const cuerpoCM = cuerpo('computeMaterials');
if (!cuerpoCM) {
  console.log('  FAIL - no existe computeMaterials en legendary-tracker.js (es el nucleo del 1.2)');
  fail++;
} else {
  console.log('computeMaterials: lineas ' + cuerpoCM.ini + '-' + cuerpoCM.fin);

  // Stubs del contrato. Los 3 dataStatus con los numeros REALES del contrato
  // (mystic_forge=124 crafting=18 none=64 sobre 206) NO hacen falta aqui: lo
  // que se fija es la MECANICA, no el reparto.
  const stubRecipes = {
    NO_RECIPE_NOTE: 'La fuente no publica receta para esta pieza. No es lo mismo que "sin datos".',
    // La forma REAL: `placeholder` es un objeto {id, name, note}, no la frase.
    // Un stub que lo pone plano deja pasar un bug que en produccion es
    // "[object Object]". Este aserto existe porque asi se cazó.
    placeholder: { id: 95093, name: 'Legendary Equipment Unlocked!', note: 'PLACEHOLDER_VISIBLE' },
    get: (id) => {
      if (id === 30684) return { craftType: 'mystic_forge', dataStatus: 'recipe', recipeId: 30684,
        outputCount: 1, disciplines: [],
        ingredients: [
          { itemId: 29166, count: 1, name: 'Tooth of Frostfang' },
          { itemId: 24277, count: 5, name: 'Pile of Crystalline Dust' },
          { itemId: 19625, count: 1, name: 'Gift of Frostfang' }
        ] };
      if (id === 1234) return { craftType: 'crafting', dataStatus: 'recipe', disciplines: ['Armorsmith'],
        ingredients: [{ itemId: 555, count: 2, name: 'Placa Obsidian' }] };
      if (id === 7777) return { craftType: 'none', dataStatus: 'no_recipe', ingredients: [] };
      if (id === 95093) return { craftType: 'none', dataStatus: 'placeholder', ingredients: [] };
      return null; // id desconocido
    }
  };

  // El banco y los materiales van SEPARADOS a proposito: el caso que importa es
  // un material repartido entre los dos, y si el codigo tomara uno solo el
  // arnes no lo veria.
  const bank = [{ id: 29166, count: 1 }, { id: 24277, count: 2 }];
  const materials = [{ id: 24277, count: 2 }, { id: 19625, count: 1 }];
  const characterItems = [];

  let fn;
  try {
    // `computeMaterials` llama a `stockMap`, que esta en el mismo archivo pero
    // en otra posicion: se extraen las DOS. Evaluar solo la primera daria un
    // ReferenceError que parece un bug del producto y es del arnes.
    const cuerpoStock = cuerpo('stockMap');
    if (!cuerpoStock) throw new Error('no existe stockMap (la funcion que agrega banco + materiales + bolsa)');
    console.log('stockMap: lineas ' + cuerpoStock.ini + '-' + cuerpoStock.fin);
    fn = new Function('root', 'state',
      'var LegendaryRecipes = root.LegendaryRecipes;\n' +
      cuerpoStock.txt + '\n' + cuerpoCM.txt +
      '\nreturn computeMaterials;')({ LegendaryRecipes: stubRecipes },
      { bank: bank, materials: materials, characterItems: characterItems });
  } catch (e) {
    console.log('  FAIL - computeMaterials no se pudo evaluar: ' + e.message);
    fail++;
    fn = null;
  }

  if (fn) {
    console.log('\n[LOS TRES ESTADOS DE UN MATERIAL]');
    const r = fn(30684);
    const fila = (itemId) => (r.rows || []).filter((x) => x.itemId === itemId)[0];

    const completo = fila(29166);
    ok(completo && completo.state === 'ok',
       'el material cubierto queda OK (tengo ' + (completo && completo.have) + ' de ' + (completo && completo.need) + ')');
    ok(completo && completo.missing === 0, 'y su missing es 0');

    const parcial = fila(24277);
    ok(parcial && parcial.state === 'partial',
       'el material a medias queda PARCIAL (tengo ' + (parcial && parcial.have) + ' de ' + (parcial && parcial.need) + ')');
    ok(parcial && parcial.need === 5 && parcial.have === 4 && parcial.missing === 1,
       'PARCIAL: 2 del banco + 2 de los materiales se SUMAN (4 de 5, falta 1) -- no toma el maximo ni el primero');

    const cero = fila(19625);
    ok(cero && cero.have === 1, 'y el que solo esta en los materiales de personaje tambien cuenta');

    console.log('\n[control negativo del filtro]');
    const imposible = fn({ craftType: 'mystic_forge', dataStatus: 'recipe', ingredients: [] }, true);
    ok(imposible && imposible.rows.length === 0, 'una receta sin ingredientes da 0 filas, no 1 fila vacia');

    console.log('\n[have NUNCA es negativo]');
    const negativo = [{ id: 29166, count: 0 }, { id: 24277, count: 0 }, { id: 19625, count: 0 }];
    const rNeg = (function () {
      const s = { bank: negativo, materials: negativo, characterItems: negativo };
      const stub2 = { LegendaryRecipes: stubRecipes };
      try {
        const f = new Function('root', 'state',
          'var LegendaryRecipes = root.LegendaryRecipes;\n' + cuerpo('stockMap').txt + '\n' + cuerpoCM.txt +
          '\nreturn computeMaterials;')(stub2, s);
        return f(30684);
      } catch (e) { return null; }
    })();
    const algunoNeg = rNeg && (rNeg.rows || []).some((x) => x.have < 0 || x.missing < 0);
    ok(rNeg && !algunoNeg, 'con banco y materiales en 0, ningun have ni missing da negativo');

    console.log('\n[LOS TRES dataStatus: NINGUNO SE Pinta vacio]');
    const sinReceta = fn(7777);
    ok(sinReceta && sinReceta.status === 'no_recipe', 'dataStatus "no_recipe" se distingue de "recipe"');
    ok(sinReceta && typeof sinReceta.note === 'string' && sinReceta.note.indexOf('no publica receta') !== -1,
       'y trae el motivo escrito, no un modal vacio');

    const ph = fn(95093);
    ok(ph && ph.status === 'placeholder', 'el placeholder 95093 es un status PROPIO, no un "no_recipe"');
    ok(ph && ph.note === 'PLACEHOLDER_VISIBLE',
       'y su nota es explicita y distinta: si GW2 renombra el filtro, esto tiene que verse');
ok(ph && typeof ph.note === 'string',
       'la nota es un STRING: LegendaryRecipes.placeholder es un objeto {id,name,note}, no la frase');

    const desconocido = fn(424242);
    ok(desconocido && desconocido.status === 'unknown',
       'un id que no esta en el contrato da "unknown", NO "no_recipe" -- son dos huecos distintos');

    // Y el MOTIVO tiene que ser distinto tambien. El status distinto alcanza
    // para que el arnés de arriba pase, pero el modal pinta el `note` debajo
    // del status: si un id ausente del contrato mostrara "la fuente no publica
    // receta", estariamos affirmationdo algo falso -- la fuente no publico
    // NADA sobre ese id, porque no existe. Mutacion verificada: cambiar solo el
    // note de 'unknown' por el de 'no_recipe' daba 32/0 con este arnés.
    ok(desconocido && typeof desconocido.note === 'string' &&
       desconocido.note !== sinReceta.note &&
       desconocido.note.indexOf('no publica receta') === -1,
       'el note de "unknown" NO es el de "no_recipe": un id ausente no puede decir "la fuente no publica receta"');
    ok(desconocido && desconocido.note.indexOf('catalogo') !== -1,
       'y el suyo dice la verdad: no esta en el catalogo');

    console.log('\n[crafting NO se confunde con mystic_forge]');
    const obsidian = fn(1234);
    ok(obsidian && obsidian.craftType === 'crafting', 'las piezas Obsidian devuelven craftType "crafting"');
    ok(obsidian && obsidian.rows.length === 1 && obsidian.disciplines.join() === 'Armorsmith',
       'y conservan la disciplina, que es lo que las distingue');
  }
}

// ------------------------------------------------------------------ cableado
console.log('\n[CABLEADO: el click de la card abre el modal]');
// Un regex que busca 'lt-item-card' pegado a 'addEventListener' mide la
// DISTANCIA entre dos strings, no si el click funciona. Lo que importa son los
// tres eslabones por separado: existe wireItemCards, registra un click sobre la
// clase, y se llama al pintar.
const cuerpoCards = cuerpo('wireItemCards');
ok(!!cuerpoCards, 'wireItemCards existe en el tracker');
ok(cuerpoCards && /addEventListener\s*\(\s*['"]click['"]/.test(cuerpoCards.txt),
   'y registra un listener de click');
ok(cuerpoCards && /lt-item-card/.test(cuerpoCards.txt),
   'y ese listener busca la clase .lt-item-card');
const nWires = (src.match(/wireItemCards\(\);/g) || []).length;
ok(nWires >= 2,
   'se llama al pintar, y en las DOS ramas (catalogo y progreso): ' + nWires + ' llamadas');
ok(/function\s+openItemModal\s*\(/.test(src), 'openItemModal existe en el tracker');
ok(/data-close/.test(src), 'el modal se cierra (data-close), como el resto de los modales del proyecto');

// Los dos que la suite completa cazó y este arnés todavía no afirmaba.
// 1) ensureItemModal() NO puede estar en wireItemCards(): cablear las cards
//    no es construir el modal, y arrastrarlo ahi revienta en cualquier
//    entorno sin document.body (alert84.t3t4-registro lo vio crashing).
const cuerpoEnsure = cuerpo('ensureItemModal');
ok(!!cuerpoEnsure, 'ensureItemModal existe');
ok(cuerpoCards && !/ensureItemModal\s*\(/.test(cuerpoCards.txt),
   'wireItemCards NO construye el modal (si lo hiciera, el arnés de DOM sin body lo vería caer)');
// 2) Y si no se construye al cablear, el cierre tiene que cablearse en el
//    mismo lugar donde se crea: si viviera en wireItemCards, jamas se
//    engancharia porque el nodo todavia no existe.
ok(cuerpoEnsure && /addEventListener\s*\(\s*['"]click['"]/.test(cuerpoEnsure.txt),
   'el cierre se cablea dentro de ensureItemModal, junto con el nodo nuevo');
ok(cuerpoEnsure && /appendChild/.test(cuerpoEnsure.txt) && /data-close/.test(cuerpoEnsure.txt),
   'y ese cableado vive junto al appendChild, no antes de que exista el nodo');

// 3) El tracker no dice "Cargando": no hay red detrás del render del modal,
//    así que un "cargando" sería mentira (alert84.leyenda-estado-honesto).
const cuerpoOpen = cuerpo('openItemModal');
ok(cuerpoOpen && !/Cargando/.test(cuerpoOpen.txt),
   'el fallback sin render no dice "Cargando": no hay red que esperar');
ok(!/!important/.test(src), 'el tracker no introduce !important (regla de las 3 capas)');

// El render vive en el archivo de render, no en el tracker: el tracker calcula
// y el archivo de render pinta. Es el mismo corte que ya tienen los otros 3.
ok(/function\s+renderItemModal\s*\(/.test(srcCat), 'el render del modal vive en render-catologo.js');
ok(!/function\s+renderItemModal\s*\(/.test(src), 'y NO esta duplicado dentro del tracker');

// No se toco el candado de REQUIRED_RENDERERS: el modal es un render NUEVO,
// no el quinto de los 4 existentes.
ok(!/REQUIRED_RENDERERS\s*=\s*\[[^\]]*itemModal/.test(src),
   'REQUIRED_RENDERERS sigue teniendo 4 claves: el modal entra por otra puerta');

// ------------------------------------------------------- control negativo real
console.log('\n[CONTROL NEGATIVO: el mismo regex sobre un archivo que NO debe]');
const otro = fs.readFileSync(path.join(ROOT, 'js/settings-manager.js'), 'utf8');
ok(!/wireItemCards/.test(otro),
   'settings-manager.js NO menciona wireItemCards -> el aserto discrimina');

const sinRecipeTexto = otro;
ok(!/renderItemModal/.test(sinRecipeTexto),
   'settings-manager.js no menciona renderItemModal -> el segundo aserto tambien discrimina');

console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail > 0 ? 1 : 0);