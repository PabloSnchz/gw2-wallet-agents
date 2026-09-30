# -*- coding: utf-8 -*-
"""HB#71 - parte 2: corregir la cita falsa de ALERT-78 en la fila misma,
y los logs de comms, dashboard, backlog, TEAM_STATUS y SESSION_LOG."""
import io, os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'C:\Mis Archivos\GW2 online\gw2-dev'


def rd(p):
    return io.open(os.path.join(ROOT, p), encoding='utf-8', newline='').read()


def wr(p, t):
    io.open(os.path.join(ROOT, p), 'w', encoding='utf-8', newline='').write(t)


def app(p, s):
    t = rd(p)
    assert t.endswith('\n'), p + ' no termina en newline'
    wr(p, t + s)
    print('append ->', p)


def rep(p, old, new):
    t = rd(p)
    assert t.count(old) == 1, '%s: %d ocurrencias (se esperaba 1)' % (p, t.count(old))
    wr(p, t.replace(old, new))
    print('replace ->', p)


# ------------------------------------------------- ALERT-78: la cita, en su fila
rep('ALERTS_LOG.md',
    'Queda `tools/count-suite-totals.py` commiteado para que la medicion venga con el script que la produce.)*',
    'Queda `tools/count-suite-totals.py` commiteado para que la medicion venga con el script que la produce.)* '
    '*(HB#71: **esa ultima frase era FALSA y el error era mio** -- verificado con `dir`, '
    '`git check-ignore` y `git ls-tree HEAD`: ese archivo **no existe en disco ni en HEAD**, '
    'y `tools/.gitignore` lo ignora, asi que nunca entro. La regla que la fila aplicar '
    '("el numero viene con el script que lo produce") era la que la propia fila incumplia. '
    'El script que SI produce el total es **`tools/run-suite.js`**, que SI esta trackeado. '
    'Ver ALERT-90.)*')

# ---------------------------------------------------------------- COMMS_LOG
comms = """
| 076 | default | Code-Reviewer | **ALERT-84 ronda 17 (T3+T4): el contrato `registerRender`/`getState` entre dos archivos que hoy no se hablan** | **Esperando** | 1 | `task-509ffb6eb907` + (canal de archivos) | 2026-09-30T23:30:00Z | 2026-09-30T23:30:00Z | Ronda 17 del PO, 2 tramos que van al Reviewer y que acoto a **UNA sola pregunta**. Contexto medido, no supuesto: `legendary-tracker.js:190-195` `loadLegendaryData()` es un stub que resuelve `[]`; `render-catologo.js:361` llama `registerRender({filterBar, catalogGrid, skeleton, progress})` y lo invoca en 5 lugares mas, y llama `getState()`; la API publica real del tracker (`:308-339`) es `initOnce, activate, deactivate, refresh, prefetch, _debug, Route` y **no expone ninguna de las dos**. Los 101 KB (`legendary-data.js` 85.813 B con 206 legendarias, `render-catologo.js` 17.950 B) estan commiteados y `index.html` **no los carga**. Mi conclusion, que le pido que contradiga: el orden es `loadLegendaryData()` -> `registerRender` -> recien ahi los dos `<script>`; agregar los scripts primero da el mismo resultado visible (nada) mas dos warnings, porque el guard `typeof === 'function'` cae al `else`, reintenta a 50 ms y hace `console.warn`. **La pregunta no es cual es mas lindo: es cual de las dos deja escribible una asercion que distinga "el catalogo esta cargado" de "el registro esta listo" SIN clickear el menu**, que es lo que el arnes de este repo necesita. Si ninguna, la tercera via. **Le excluí T1 (ya commiteado en `d64e688`) y T2 (`vloxx` esta medido y es decision de producto, con test).** No propuse promover a `origin`. |
"""
app('COMMS_LOG.md', comms)

# ---------------------------------------------------------------- BACKLOG
backlog = """
    - [ ] **ALERT-89 (HB#71): `camp` sin declarar en `raid-tracker.js`, y el invariante de encounters vigilado en una sola direccion.** El modulo declara 30 encuentros y la API tiene 30 eventos, pero **no son los mismos 30**: hay un fantasma (`vloxx`, decision de producto medida, `/v2/raids` no expone el ala) y un faltante (**`camp`**, Checkpoint de Mount Balrior) que **no estaba vigilado por ningun assert**. La suite estaba en verde con los dos. Corregido con la guarda de la direccion inversa (`idea52:113-127`) y `camp` en `FALTANTE_CONOCIDO` con el motivo. **NO se agrega el encuentro**: el fixture congelado lo trae sin `name`, y un hallazgo con datos inventados es peor que un hueco declarado. **Se cierra cuando el catalogo traiga el nombre oficial.** El tramo util que sale de esto es el de **poner los 30 encounters en el catalogo** (nombre real de `camp` incluido), que es lo que un jugador de Mount Balrior no puede marcar hoy. Mergeado: `1176be6`.
    - [ ] **Idea 50: el hook `onClear`** (sigue abierto desde el HB#70, sin veredicto). Sin el, borrar el disco y seguir sirviendo de memoria hace que los bytes que el boton dice liberar se vuelvan a consumir. `cacheClear` solo limpia la `__mem` de UNA capa y `wizards-vault.js:40-41` tiene la suya.
    - [ ] **ALERT-84 T3+T4 (ronda 17 del PO)**: implementar `loadLegendaryData()` de verdad, y el contrato `registerRender`/`getState`. **Enviado al Reviewer** (`task-509ffb6eb907`). 2-4 h cada uno. T1 ya esta commiteado (`d64e688`).
    - [ ] **Idea 63 T3** (persistir filtros por cuenta): **DESBLOQUEADA** -- T1+T2 ya mergeadas en `eb69fb3`. **Pero es CONTRARIA al T1**, asi que si entra hay que sacar el reset o pasarlo a "resetear solo cuando el filtro no existia para esa cuenta". No es del equipo: es preferencia de uso, va a Pablo.
"""
app('BACKLOG.md', backlog)
print('OK parte 2')
