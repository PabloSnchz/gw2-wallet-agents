import io, subprocess, sys, shutil
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

API = 'js/api-gw2.js'
WV = 'js/wizards-vault.js'
TEST = 'tests/idea50f.cacheclear-real.test.js'

def run():
    r = subprocess.run(['node', TEST], capture_output=True, text=True, encoding='utf-8', errors='replace')
    out = r.stdout
    fails = [l.strip() for l in out.split('\n') if l.strip().startswith('FAIL')]
    tail = [l for l in out.split('\n') if 'pass /' in l]
    return fails, (tail[-1].strip() if tail else '?')

def mutate(path, old, new, label):
    orig = io.open(path, encoding='utf-8-sig', newline='').read()
    assert old in orig, 'NO MATCH: ' + label
    io.open(path, 'w', encoding='utf-8', newline='').write(orig.replace(old, new, 1))
    try:
        fails, total = run()
        print('\n== MUTACION: ' + label)
        print('   ' + total)
        for f in fails:
            print('   FAIL -> ' + f[:130])
        if not fails:
            print('   *** LA MUTACION NO LA MORDIO: el test no la atrapa ***')
    finally:
        io.open(path, 'w', encoding='utf-8', newline='').write(orig)

# P1: volver a las 2 exactas (la red con agujeros que el Reviewer signalo)
mutate(API,
       "var CACHE_PRESERVE_PREFIX = ['wv:season:'];",
       "var CACHE_PRESERVE_PREFIX = [];",
       'P1 -> CACHE_PRESERVE_PREFIX vacio (la red sin red)')

# P2: volver a la lista central de modulos en la capa
mutate(API,
       "var mods = root.__cacheBaseProviders || [];",
       "var mods = root.WizardsVault ? [root.WizardsVault] : [];",
       'P2 -> la capa vuelve a nombrar al modulo (lista central)')

# P3: volver a colectar por clave
mutate(API,
       "function isCacheKey(k, bases) {",
       "function isCacheKey(k, bases) { bases = collectCacheBases();",
       'P3 -> isCacheKey vuelve a colectar por clave')

# P2b: el modulo deja de anotarse
mutate(WV,
       "(root.__cacheBaseProviders = root.__cacheBaseProviders || []).push(WizardsVault);",
       "/* sin registro */;",
       'P2b -> el modulo no se anota en el registro global')
