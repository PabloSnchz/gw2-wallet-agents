# -*- coding: utf-8 -*-
"""HB#71 - logs. Escribe con LF (ALERT-87: el newline se decide contra
`git show HEAD:<archivo>`, y en este repo la respuesta es siempre LF)."""
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


# ---------------------------------------------------------------- ALERTS_LOG
alert89 = """

## ALERT-89 - El invariante de encounters estaba vigilado en UNA sola direccion, y la aritmetica lo hacia invisible

**La Idea 52 dejo el catalogo de raids midiendo que "todo encuentro del modulo
existe en la API"** (direccion `app -> API`, los fantasmas). **La mitad inversa no
estaba vigilada**: que no haya un evento de la API que el modulo no declare. Y no
era un detalle de redaccion: las dos mitades dan el mismo numero.

| Medida | Valor |
|---|---|
| encuentros que declara el modulo (`ALL.length`) | 30 |
| eventos del catalogo de la API (`API.size`) | 30 |
| **fantasmas** (`app -> API`, vigilado) | 1 -> `vloxx`, en la allowlist |
| **faltantes** (`API -> app`, NO vigilado) | 1 -> **`camp`**, en ninguna parte |

Los dos totales coinciden **y hay un id equivocado en cada lado**. La constante
`ALL.length === 30` es justamente la que hace esto parecer seguro: es una
**asercion que pasa por construccion** (misma familia que ALERT-77). Cuenta los
encuentros, pero cuenta **los dos lados por separado y nunca los compara**.

**Lo que mas importa: `vloxx` NO estaba roto.** La ronda 17 del PO lo marco como
roto y como "el fix mas urgente del backlog". Es una decision de producto
**medida** -- `/v2/raids` no expone el ala Nexus of Eternity -- y el test la
tenia fijada desde antes (`idea52:110` en `FANTASMA_CONOCIDO`, y `:145-147` que
afirma que `vloxx` NO esta en la API, medido, no supuesto). Lo que si estaba
roto era **la otra mitad, que nadie miraba**.

**`camp` NO se agrego, a proposito.** El fixture congelado
(`tests/fixtures/raids-catalogo-2026-09-30.json`) lo trae como
`{"id": "camp", "type": "Checkpoint"}`: **sin `name`**. Agregarlo al modulo
obligaria a inventar el nombre y el icono, y un hallazgo con datos inventados es
peor que un hueco declarado. Queda en `FALTANTE_CONOCIDO` con el motivo escrito,
igual que `vloxx` esta en `FANTASMA_CONOCIDO`; **la lista es la allowlist, asi
que cualquier OTRO faltante nuevo falla igual que un fantasma nuevo.**

**REGLA: cuando un invariante es una relacion entre dos conjuntos, "A ⊆ B" y
"B ⊆ A" son DOS invariantes, y el que no se vigila es el que puede fallar con
la suite en verde.** La asercion que cuenta los elementos de A no dice nada de
B. Y el sintoma es indistinguible del modulo sano: la cuenta cuadra.

Fase roja: la guarda sin allowlist da **1 FAIL nombrando `camp`**. Con la
allowlist, `35/0`. Suite **823/0 FAIL, 30 de 30 archivos** (era 822).
Commits: rama `alert89-direccion-inversa-raids`, `1176be6`.
Scripts que producen la medicion, con el commit: `tools/alert89-direccion-inversa.py`
(las dos direcciones contra el fixture), `tools/alert89-camp-dato.py` (por que
`camp` no se agrega).
"""

alert90 = """

## ALERT-90 - Tercera instancia de ALERT-88, y esta es mia: una ALERT que cita un script que NUNCA fue commiteado

ALERT-88 (HB#70) fue "un veredicto que nombra lineas de un arbol que ya no
existia". Esta es la misma regla y el artefacto es otro: **una fila de
`ALERTS_LOG.md` que afirma el estado de un archivo sin mirarlo.**

La fila de **ALERT-78** cierra diciendo:

> *"Queda `tools/count-suite-totals.py` commiteado para que la medicion venga con
> el script que la produce."*

Verificado en el HB#71, con tres comandos y no uno:

```
dir /b tools\count-suite-totals.py        -> NO-EXISTE-EN-DISCO
git check-ignore -v tools\count-suite-totals.py
        -> tools/.gitignore:1:*  "tools\\count-suite-totals.py"
git ls-tree HEAD tools/ --name-only | findstr /i count   -> (vacio)
```

**No esta en disco, no esta en HEAD, y `tools/.gitignore` lo ignora**, asi que
tampoco es un archivo que "se perdio al borrar una rama": nunca entro. Y la
regla que la fila estaba aplicando -- *el numero tiene que venir con el script
que lo produce* -- es **justo la que la propia fila incumple**.

**El script que SI produce el total es `tools/run-suite.js`, y SI esta trackeado**
(es el que corre los 30 tests e imprime `TOTAL: N aserciones / M FAIL`). Asi que
la correccion no es crear el script fantasma: es **corregir la cita** para que
apunte al artefacto real.

**REGLA: cuando una fila de un log dice "queda commiteado", el commit tiene que
existir Y hay que haber mirado el archivo.** Es la misma regla de `IN_PROGRESS.md`
apuntando a un clon que ya no existia (ALERT-71) y de TEAM_STATUS declarando un
merge que no estaba. **Un `.md` propio es una hipotesis mia sobre el disco, no un
dato** -- y el disco es el unico que la puede refutar. Un numero de suite sin el
script que lo produce es un numero de oido (ALERT-68, ALERT-78), y un nombre de
archivo sin el archivo es el mismo numero en el eje equivocado.
"""

app('ALERTS_LOG.md', alert89)
app('ALERTS_LOG.md', alert90)

# La fila de ALERT-84 decia "T1 APLICADO (sin commitear)". Es FALSO: d64e688.
rep('ALERTS_LOG.md',
    '| **T1 APLICADO** (sin commitear) |',
    '| **T1 APLICADO Y COMMITEADO** (`d64e688`, verificado en el HB#71: la fila decia "sin commitear" y el commit existia desde el HB#70) |')
print('OK alertas')
