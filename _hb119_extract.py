import re, sys

src = open(r"C:\Users\psanc\.qwenpaw\workspaces\product-owner\wt-r38\js\gist-sync.js", encoding="utf-8").read()

def extract(src, header_re):
    m = re.search(header_re, src)
    if not m:
        return None
    i = src.index("{", m.start())
    depth = 0
    started = False
    for j in range(i, len(src)):
        c = src[j]
        if c == "{":
            depth += 1
            started = True
        elif c == "}":
            depth -= 1
            if started and depth == 0:
                return src[m.start():j+1]
    return None

fn = extract(src, r"async function downloadAndSync\(\)")
if not fn:
    print("EXTRACT FAIL"); sys.exit(1)

open(r"C:\Users\psanc\.qwenpaw\workspaces\product-owner\_hb119_das.js", "w", encoding="utf-8").write(fn)
print("EXTRACT OK, chars:", len(fn))

print("--- CONFIRM LITERAL ---")
m = re.search(r"var confirmMsg = (.*?);", fn, re.S)
print(m.group(1) if m else "NO MATCH")

print("--- MENCIONES EN LA FUNCION ---")
for tok in ["exportedAt", "updated_at", "created_at", "gist.id"]:
    print("  %-14s %d" % (tok, fn.count(tok)))

print("--- MENCIONES EN TODO gist-sync.js ---")
for tok in ["exportedAt", "data.apiKeys", ".list.length"]:
    print("  %-14s %d" % (tok, src.count(tok)))