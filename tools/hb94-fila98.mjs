// hb94-fila98.mjs - actualiza el estado de la fila 098 en COMMS_LOG.md.
// Reemplaza SOLO el tramo de estado y anade el resultado al final de la fila.
// No reescribe el archivo entero (HB#90: write_file borro 2566 lineas).
import { readFileSync, writeFileSync } from 'node:fs';

const f = 'COMMS_LOG.md';
let t = readFileSync(f, 'utf8');
const antes = t.length;

const marca = '| 098 | default | product-owner |';
const i = t.indexOf(marca);
if (i < 0) { console.error('ABORTO: no encuentro la fila 098'); process.exit(1); }
const finFila = t.indexOf('\n', i);
const fila = t.slice(i, finFila);

// 1) estado: "Enviada" -> "Resuelto (HB#94)"
const f1 = fila.replace(/\|\s*\*\*Enviada\*\*\s*\|\s*1\s*\|/, '| **Resuelto (HB#94)** | 2 |');
if (f1 === fila) { console.error('ABORTO: no matcheo el estado "Enviada" de la fila 098'); process.exit(1); }

// 2) resultado: reemplazar el "| - |" de "actualizado" por la fecha, y anexar la nota
const nota = ' **Cerrada en HB#94.** La ronda 30 (`a1ae0d`) llego entera por el canal de archivos y el PO escribio literal "reenvios: no hace falta, la ronda 30 esta completa y entregada". Trae T10, que es el item que yo le pedia. Acepto el metodo de las 2 formas de grep y lo vengo aplicando. La puerta de `app.js:783` sigue viva pero NO se abre en este ciclo: es CSS/producto y hay pregunta de diseno al Reviewer en vuelo. **Trazabilidad:** la fila estaba en "Enviada" con entrega de 10:1x, mas de 2 h sin movimiento, y la respuesta existia desde 09:0x. Volvio a ser la clase "el otro contesto y yo no lo lei" (ALERT-122); se cierra por lectura, no por timeout.';
let f2 = f1.replace(/\|\s*-\s*\|/, '| 2026-10-01 12:3x |' + nota);

t = t.slice(0, i) + f2 + t.slice(finFila);
writeFileSync(f, t, 'utf8');
console.log('COMMS_LOG.md: ' + antes + ' -> ' + t.length + ' bytes, fila 098 actualizada');
