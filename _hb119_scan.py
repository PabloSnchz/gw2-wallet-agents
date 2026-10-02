import io, sys, glob

# Scan de CJK / cirilico / fullwidth sobre los .md del worktree propio.
# Regla: los .md que el PO escribe deben dar 0. Un CJK preexistente de otra
# ronda se corrige y se anota (no se deja pasar en silencio).
base = r"C:\Users\psanc\.qwenpaw\workspaces\product-owner\wt-r38"
targets = ["PRE_BACKLOG.md", "DASHBOARD_PO_IDEAS.md"]
total = 0
for t in targets:
    p = base + "\\" + t
    txt = io.open(p, encoding="utf-8").read()
    hits = []
    for i, ch in enumerate(txt):
        o = ord(ch)
        if 0x3000 <= o <= 0x9FFF or 0xAC00 <= o <= 0xD7AF or 0xFF00 <= o <= 0xFFEF or 0x0400 <= o <= 0x04FF:
            line = txt.count("\n", 0, i) + 1
            hits.append((line, hex(o), ch))
    total += len(hits)
    print("%-26s | %s | bytes: %d" % (t, ("glitches: %d" % len(hits)) if hits else "0 raros", len(txt.encode("utf-8"))))
    for h in hits[:12]:
        print("      L%-6d %s  %r" % (h[0], h[1], h[2]))
print("TOTAL:", total)