/*! tests/hb135-t20b-direccion.test.js
 *
 * QUE MIDE: T20-b (ronda 38 del PO) -- el confirm del Gist dice la DIRECCION.
 *
 * T20-a ya dice las 7 familias y la cifra. T20-c ya deja la foto. T20-b es el
 * que falta: sin el, T20-a le muestra "12 claves" a Pablo y aun asi no puede
 * saber si SON sus 12 o las 15 que le faltan. O sea el numero sin direccion.
 *
 * POR QUE ES EL ITEM QUE TOCABA HACE 3 CICLOS Y NO SE TOCO: el propio PO lo
 * escribio -- "sin esto, el error de T20-b no tiene red", y T20-c es la red.
 * T20-c mergeo en el HB#120 y T20-b seguia sin premisa. La premisa es un
 * HECHO, no una opinion, asi que se midio antes de escribir una linea.
 *
 * LOS 2 HECHOS QUE LO HACEN POSIBLE (los dos ya estan a mano, no hay que
 * inventar estado nuevo):
 *   1. `gist.updated_at` -- la API de GitHub ya lo devuelve y el modulo YA lo
 *      transporta en el retorno de downloadAndSync (`gist-sync.js:517/520`).
 *      O sea la fecha del remoto existe y es alcanzable desde el confirm.
 *   2. `configData.exportedAt` -- lo escribe `exportData()`
 *      (`settings-manager.js:208`) y viaja DENTRO del JSON remoto. O sea el
 *      remoto dice cuando se lo genero, sin pedirle nada a la API.
 *
 * LO QUE NO SE INVENTA: una "fecha de la ultima subida local". No existe
 * (medido: 0 escrituras de `lastUpload`/`uploadedAt`/`last_sync` en todo
 * gist-sync.js) y crearla seria estado nuevo para una pantalla que no lo pide.
 * La direccion sale de comparar remoto-contra-remoto: lo que dice el `updated_at`
 * del Gist contra el `exportedAt` que el propio remoto escribio.
 */
'use strict';
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } }

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'gist-sync.js'), 'utf8');
const lines = SRC.split(/\r?\n/);

// --- Recorta el CUERPO de downloadAndSync, sin comentarios. -----------------
// Un aserto que lee su propia justificacion no mide el codigo: mide el texto
// que lo rodea. El bloque de T20-b va a llevar un comentario que dice "viejo" y
// "remoto", y sin este strip los asertos de abajo los encontrarian a el.
const iFn = lines.findIndex(l => /async function downloadAndSync/.test(l));
ok(iFn !== -1, 'existe downloadAndSync() en gist-sync.js');
if (iFn === -1) { console.log('\n' + pass + ' pass / ' + fail + ' FAIL'); process.exit(1); }

// MEDIDO: con 130 lineas de ventana el camino de cancelar (`:561`) queda
// FUERA y el aserto de "sigue devolviendo cancelled" falla con el codigo
// correcto. La ventana es del arnes, no del producto: se amplia hasta que
// entre la rama de cancelar, que es lo que ese aserto pretende mirar.
const raw = lines.slice(iFn, iFn + 175);
const body = raw.map(l => l.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '')).join('\n');

console.log('\n== LO QUE TIENE QUE ESTAR ==');

// 1. La DIRECCION tiene que ser un hecho medido, no una palabra.
//
// CORRECCION (HB#135, y es una de las premisas mas caras del ciclo): la
// primera version de este fix comparaba `gist.updated_at` contra
// `configData.exportedAt` -- los dos del remoto. Es FALSO, y lo dijo la
// seccion EJECUTADA de mas abajo: `uploadConfig` arma el JSON con
// `exportData()`, que pone `exportedAt = new Date()`, y lo sube acto seguido.
// O sea `updated_at` es SIEMPRE posterior a `exportedAt` y la rama "viejo" no
// podria dispararse nunca. La referencia correcta es LOCAL: cuando subi yo por
// ultima vez (`gn:github:last_upload`).
ok(/updated_at/.test(body), 'el cuerpo lee el updated_at del Gist (la fecha del remoto)');
ok(/GIST_LAST_UPLOAD|gn:github:last_upload/.test(body),
   'el cuerpo lee la ULTIMA SUBIDA LOCAL (la referencia que si puede ser mas nueva que el remoto)');

// 2. Y tiene que COMPARARLOS. Dos fechas sueltas no son una direccion.
const cmp = /Date\.parse\([^)]*updated_at[^)]*\)/.test(body) && /Date\.parse\([^)]*(last_upload|GIST_LAST_UPLOAD|ultimaSubida)[^)]*\)/i.test(body);
ok(cmp, 'las dos fechas pasan por Date.parse (si no, no hay comparacion posible)');
ok(/>|<|Date\.getTime\(\)\s*[<>]/.test(body), 'hay una comparacion de orden entre las dos');

// Y el que ESCRIBE la referencia tiene que existir: sin el, la comparacion
// siempre cae en el default y la direccion nunca se lee.
//
// CORRECCION (HB#142). Este aserto daba FAIL con el codigo CORRECTO, y la
// razon era del aserto, no del codigo: exigia la constante DENTRO de la
// llamada a `set(`, pero el codigo resuelve la clave en una variable antes
// (`var lastUploadKey = STORAGE_KEYS.GIST_LAST_UPLOAD || 'gn:github:last_upload'`
// y despues `Storage.set(lastUploadKey, stamped)`). Medir la PROPIEDAD --
// "el valor que se escribe sederiva de la clave de ultima subida" -- en vez de
// "la constante aparece dentro del parentesis" deja de depender de si el autor
// eligio inlinear o no. Es la misma clase que ALERT-155, que este archivo ya
// documenta mas abajo: un aserto que exige la palabra exacta del autor mide la
// prosa, no la propiedad.
const escribeUltimaSubida =
  /set\(\s*[^)]*GIST_LAST_UPLOAD/.test(SRC) ||
  /set\(\s*[^)]*gn:github:last_upload/.test(SRC) ||
  (/set\(\s*[^)]*(lastUploadKey|ultimaSubida|lastUpload)[^)]*\)/i.test(SRC) &&
   /STORAGE_KEYS\.GIST_LAST_UPLOAD|gn:github:last_upload/.test(SRC));
ok(escribeUltimaSubida,
   'ALGUIEN escribe la ultima subida (si nadie la escribe, la comparacion nunca tiene contra que compararse)');
// Y que lo que se escribe sea de VERDAD la clave, no cualquier otra variable:
// sin esta segunda parte, la primera pasaria con un `set(otraVariable, x)`.
ok(/STORAGE_KEYS\.GIST_LAST_UPLOAD/.test(SRC) || /gn:github:last_upload/.test(SRC),
   'lo que se escribe ES la clave de ultima subida (una variable cualquiera no alcanza)');

// 3. Los DOS sentidos. El caso peligroso es el que no dice nada: si el remoto
//    esta viejo hay que decirlo, y si esta al dia NO hay que inventar una
//    alarma. Un confirm que solo cubre un lado miente en el otro.
//
//    MEDIDO: estas dos aserciones, palabra por palabra, fallaban con el codigo
//    correcto porque el fix dice "mas reciente" y no "al dia". Un aserto que
//    exige la palabra exacta del autor del fix mide la prosa, no la propiedad
//    (el mismo error que ALERT-155). Ahora se exige la PROPIEDAD: los dos
//    ramas del ternario existen y las dos tienen texto no vacio.
const iTern = body.indexOf("direccion === 'viejo'");
const iAlDia = body.indexOf("direccion === 'al-dia'");
ok(iTern !== -1, 'el caso "el remoto esta viejo" tiene su propia rama');
ok(iAlDia !== -1, 'el caso "el remoto esta al dia" tambien tiene rama (no queda mudo)');
ok(iTern !== -1 && iAlDia !== -1 && iTern < iAlDia, 'las dos ramas conviven en el mismo ternario');
// Cada rama tiene que aportar texto: una rama con solo el caso sin texto
// compila y no dice nada.
const ramaViejo = body.slice(iTern, iAlDia);
const ramaAlDia = body.slice(iAlDia, iAlDia + 400);
ok(ramaViejo.replace(/[\s'":?()|+,]/g, '').length > 30, 'la rama "viejo" aporta texto real');
ok(/reciente|al d[ií]a|actualizado|igual|m[áa]s nuevo|tiene lo [úu]ltimo/i.test(ramaAlDia), 'la rama "al dia" aporta texto real');
ok(/:\s*''\s*;?$/.test(ramaAlDia.trim().slice(-8)) === false || /null/.test(body.slice(iAlDia - 60, iAlDia)),
   'la rama sin dato NO promete direccion (el default es null, no un texto)');

// 4. Y la comparacion tiene que estar EN EL CONFIRM, no en un console.log.
//
// MEDIDO: esta asercion daba verde con el bug VIVO, porque `body.slice(iConf)`
// incluye el `return { cancelled:true, updatedAt: gist.updated_at }` del camino
// cancelado -- o sea encuentra el `updated_at` 40 lineas despues del confirm,
// donde no ayuda a nadie. Por eso ahora se exige que la DIRECCION (la variable
// que el mensaje consume) se arme ANTES de `confirmMsg`, y no que la palabra
// aparezca despues.
const iConf = body.indexOf('confirmMsg');
ok(iConf !== -1, 'se arma el confirmMsg');
const iDirVar = body.search(/const\s+dir(ecci[óo]n)?\b|var\s+dir(ecci[óo]n)?\b/);
ok(iDirVar !== -1, 'la direccion se calcula en una variable propia');
ok(iDirVar !== -1 && iConf !== -1 && iDirVar < iConf,
   'la direccion se calcula ANTES de armar el confirm (si queda despues, Pablo ya confirmo)');
// MEDIDO: esta asercion daba verde con el bug VIVO y en rojo con el fix
// correcto. Buscaba 'dir' en minuscula y la variable se llama
// `lineaDireccion` (D mayuscula): `indexOf` es sensible a mayusculas, o sea
// el aserto no podia ver NUNCA el uso -- ni presente ni ausente. Un aserto que
// no puede ver las dos respuestas no discrimina: hay que buscar el SIMBOLO,
// no una subcadena que el autor pudo cambiar de capitalizacion.
ok(/lineaDireccion/.test(body.slice(iConf, iConf + 1200)),
   'el texto del confirm USA la direccion calculada (no se calcula y se descarta)');

console.log('\n== LO QUE SE INVENTA, Y POR QUE ==');
// CORRECCION (HB#135). Este bloque decia, en el primer borrador, que NO se
// inventara una pref de "ultima subida" -- y la afirmacion era mia, no del PO.
// La seccion EJECUTADA la REFUTO: sin una referencia local, la comparacion es
// remoto contra remoto y `uploadConfig` genera el `exportedAt` en el mismo
// comando que sube, o sea la rama "viejo" no podria dispararse NUNCA. O sea la
// regla "no inventes estado" sin medir si el estado es NECESARIO produce
// features inertes que parecen completas.
//
// Lo que NO se inventa sigue siendo cierto y por eso el aserto quedo dado vuelta
// en vez de borrado: no hay ninguna pref NUEVA con prefijo propio. La clave usa
// el namespace `github:` que ya existe, y por lo tanto `KNOWN_NAMESPACES` la
// trae de vuelta en un restore, que es lo que la haceUnlike una pref suelta.
// CORRECCION (HB#142). Este aserto tambien daba FAIL con el codigo correcto, y
// por la misma razon: la DECLARACION de la pref no vive en `gist-sync.js` sino
// en `js/storage.js` (`STORAGE_KEYS`), que es donde vive TODA pref del
// proyecto. El aserto la buscaba en `SRC` (gist-sync.js), o sea en el archivo
// equivocado -- y un grep que no encuentra nada por una ruta mala se lee igual
// que un grep que no encuentra nada porque no esta. Se lee `storage.js`.
const STORAGE_SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'storage.js'), 'utf8');
ok(/GIST_LAST_UPLOAD:\s*'gn:github:last_upload'/.test(STORAGE_SRC),
   'la pref nueva se DECLARA en STORAGE_KEYS (storage.js) con el namespace github: (no uno suelto)');
ok(/GIST_LAST_UPLOAD/.test(STORAGE_SRC) && /GIST_SAFETY_SNAPSHOT/.test(STORAGE_SRC),
   'la convive con la foto de T20-c sin reemplazarla');

// El numero de T20-a no se puede perder: la direccion se SUMA a las 7 familias.
const iFam = body.indexOf('API Keys');
ok(iFam !== -1, 'T20-a sigue: el confirm sigue listando las familias');
ok(iFam !== -1 && iConf !== -1 && iFam < iConf + 1500,
   'la direccion no se comio el bloque de familias');

console.log('\n== LO QUE NO DEBE ROMPERSE ==');
ok(/createSafetySnapshot/.test(body), 'T20-c sigue: la foto sale antes del confirm');
ok(/snap\.ok/.test(body), 'T20-c sigue: el confirm declara si la foto se pudo guardar');
ok(/cancelled/.test(body), 'el camino de cancelar sigue devolviendo cancelled');
ok(/importFromData|applyImportData/.test(body), 'el import sigue despues del confirm');
const iSnap = body.indexOf('createSafetySnapshot');
ok(iSnap !== -1 && iConf !== -1 && iSnap < iConf, 'la foto se toma ANTES de preguntar (HB#120)');

// ===========================================================================
// SECCION EJECUTADA -- y existe por una razon medida.
//
// Los 4 controles de ARRIBA son de FORMA: comprueban que las palabras esten.
// Una mutacion que INVIERTE la comparacion (`remotoTs < exportTs`) deja todas
// las palabras en su sitio y el arnes de arriba da 23/0 con el bug VIVO
// (medido en tools/hb135-mutar-t20b.js: la mutacion 3 SOBREVIVE). O sea la
// seccion de forma no puede distinguir "el remoto esta viejo" de "el remoto
// esta al dia" -- que es literalmente lo unico que este item agrega.
//
// Asi que aca se EJECUTA el fragmento real, extraido del archivo, contra
// scenarios donde la respuesta correcta es obvia. Si la comparacion esta
// invertida, el remoto viejo sale "al dia" y este seccion lo ve.
// ===========================================================================
console.log('\n== LA DIRECCION, EJECUTADA (no leida) ==');

const iCalc = body.indexOf('var remotoTs');
const iFin = body.indexOf('var confirmMsg');
const frag = iCalc !== -1 && iFin !== -1 ? body.slice(iCalc, iFin) : '';

if (frag) {
  const vm = require('vm');
  // El fragmento real lee la referencia por `Storage`, asi que el sandbox se lo
  // da. `get` devuelve lo que hay simulado; `null` simula "nunca se subio".
  function corre(updated_at, ultimaSubida) {
    const ctx = {
      gist: { updated_at },
      Storage: { STORAGE_KEYS: { GIST_LAST_UPLOAD: 'gn:github:last_upload' }, get: () => ultimaSubida },
      root: { Storage: { STORAGE_KEYS: { GIST_LAST_UPLOAD: 'gn:github:last_upload' }, get: () => ultimaSubida } },
    };
    vm.createContext(ctx);
    vm.runInContext(frag, ctx);
    return ctx;
  }
  const ISO = '2026-10-02T12:00:00.000Z';
  const viejo = ISO, nuevo = '2026-10-02T14:00:00.000Z';

  // 1. El caso que hace existir el item: yo subi a las 14, el remoto quedo de
  //    las 12, y desde entonces cambie cosas. Decir "al dia" aca es decirle a
  //    Pablo que no va a perder nada cuando va a perder cambios.
  const c1 = corre(viejo, nuevo);
  ok(c1.direccion === 'viejo', 'remoto MAS VIEJO que mi ultima subida -> "viejo"');
  ok(/ATENCIÓN/i.test(c1.lineaDireccion || ''),
     'el caso "viejo" avisa que se van a perder cambios');
  ok(/perder/i.test(c1.lineaDireccion || ''),
     'el aviso nombra la CONSECUENCIA (perder cambios), no solo el hecho');

  // 2. El simetrico: el remoto tiene lo ultimo que subi. Ahi la alarma seria
  //    falsa, y una alarma falsa hace que Pablo deje de leerlas.
  const c2 = corre(nuevo, viejo);
  ok(c2.direccion === 'al-dia', 'remoto MAS NUEVO que mi ultima subida -> "al-dia"');
  ok(!/ATENCIÓN/i.test(c2.lineaDireccion || ''),
     'el caso "al dia" NO grita ATENCION (una alarma falsa es peor que ninguna)');

  // 3. Cuando falta un dato no se INVENTA direccion.
  const c3 = corre(null, nuevo);
  ok(c3.direccion === null, 'sin updated_at -> null (no se inventa la direccion)');
  ok((c3.lineaDireccion || '') === '', 'sin datos, la linea de direccion queda vacia (no promete)');
  const c4 = corre(ISO, 'no-es-una-fecha');
  ok(c4.direccion === null, 'con una ultima subida ilegible -> null, no "al dia" por defecto');
  const c5 = corre(ISO, null);
  ok(c5.direccion === null, 'si NUNCA se subio, no se dice que el remoto esta viejo (no hay con que comparar)');
  ok((c5.lineaDireccion || '') === '', 'sin ultima subida, la linea queda vacia (primera vez: no se acusa a nadie)');

  // 4. CONTROL POSITIVO del control: el harness tiene que poder DARSE VERDE
  //    con una respuesta que el espera. Si `corre` no computara nada, todo lo
  //    de arriba daria null y pasaria por "correcto" en el caso 1.
  ok(corre(viejo, nuevo).direccion !== undefined,
     'CONTROL: el fragmento ejecutado REALMENTE computa una direccion');
  ok(corre(nuevo, viejo).direccion !== undefined,
     'CONTROL: y computa ALGO DISTINTO en el caso simetrico (no es constante)');
} else {
  ok(false, 'no se pudo extraer el fragmento de calculo para ejecutarlo');
}

console.log('\n' + pass + ' pass / ' + fail + ' FAIL');
process.exit(fail > 0 ? 1 : 0);
