import re, sys, io, subprocess

# Sin esto, print de un emoji revienta con cp1252 (el defecto 3 del PO).
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ALERT-79: node --check y la suite NO ven un token de otro idioma dentro de un
# comentario o de un .md. El unico chequeo que existe es este.
CJK = re.compile(
    u'[\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff'
    u'\uff00-\uffef\u0400-\u04ff]'
)

files = sys.argv[1:]
bad = 0
for f in files:
    try:
        t = io.open(f, encoding='utf-8-sig').read()
    except Exception as e:
        print(u'[%s] NO SE PUDO LEER: %s' % (f, e))
        bad += 1
        continue
    for i, line in enumerate(t.splitlines(), 1):
        m = CJK.findall(line)
        if m:
            print(u'[%s:%d] %s' % (f, i, line.strip()[:110]))
            bad += 1
print(u'--- matches: %d' % bad)
