"""Idea: cuenta las aserciones REALES de los test que el runner no parsea.

Por que existe: `tools/run-suite.js` reconoce 3 formatos de linea de resumen
("N pass / M FAIL", "TOTAL: N pass, M FAIL", "pass: N | FAIL: M") y hay 7
archivos que usan un cuarto, asi que quedan fuera del TOTAL que reporta. Un
total de suite sin alcance declarado no es un dato (ALERT-78), asi que esto mide
esos 7 por separado y los suma.

Advertencia de metodo: se cuentan LINEAS DE DETALLE que contienen PASS, no el
numero que el test declara. Cuando un test imprime una linea de detalle por
asercion, las dos cosas coinciden; si un test agrupara, habria que leer el
numero que declara. Por eso el script imprime el resumen propio del archivo
cuando existe, para poder comparar las dos cosas.
"""
import io
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

TEMP = os.environ.get("TEMP", ".")
total = 0
for name in sorted(os.listdir(TEMP)):
    if not name.startswith("t_idea") or not name.endswith(".txt"):
        continue
    path = os.path.join(TEMP, name)
    with io.open(path, encoding="utf-8", errors="replace") as fh:
        text = fh.read()
    lines = text.split("\n")
    # La linea de RESUMEN contiene la palabra "FAIL" (`pass: 13 | FAIL: 0`), asi
    # que contarla como fallo daria un falso 1 en los 7. Se separa de las
    # lineas de detalle.
    summary = [l.strip() for l in lines if re.search(r"pass\s*/|pass:|TOTAL", l)]
    detail_lines = [l for l in lines if re.search(r"\bPASS\b", l)]
    fails = len([l for l in detail_lines if re.search(r"\bFAIL\b", l)])
    detail = len(detail_lines)
    total += detail
    print("%-40s detalle=%-4d FAIL=%-3d resumen=%s" % (name[2:-4], detail, fails, summary[-1] if summary else "(ninguno)"))
print("SUMA de los no parseados: %d" % total)
