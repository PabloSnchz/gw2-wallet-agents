# -*- coding: utf-8 -*-
import io, os, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT = r'C:\Mis Archivos\GW2 online\gw2-dev'


def edit(path, pairs, must=True):
    p = os.path.join(ROOT, path)
    s = io.open(p, encoding='utf-8').read()
    for old, new in pairs:
        if old not in s:
            if must:
                raise SystemExit('NO ENCONTRADO en %s: %r' % (path, old[:70]))
            continue
        s = s.replace(old, new, 1)
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
    print('OK ' + path)


# ---------------------------------------------------------------------------
# TEAM_STATUS.md — el heartbeat paralelo escribio esto con numeracion de ALERT
# que choca con ALERTS_LOG.md (alla 48 = SESSION_LOG sobrescrito). Ademas
# quedaron palabras partidas de una reescritura automatica.
# ---------------------------------------------------------------------------
edit('TEAM_STATUS.md', [
    # --- ALERT-48 esta ocupado en ALERTS_LOG.md (SESSION_LOG sobrescrito).
    ('- **ALERT-48 (nueva) — 2 bugs de la cache mergeados sin revision.**',
     '- **ALERT-49 (nueva) — 2 bugs de la cache mergeados sin revision.**'),
    ('- **ALERT-49 (nueva) — colision de ramas en el worktree compartido.**',
     '- **ALERT-50 (nueva) — colision de ramas en el worktree compartido.**'),

    # --- glitches de reescritura
    ('lo-AMos stroke sin drama', 'lo resolvieron sin drama'),
    ('| **PROPUESTA, sin implementing** |', '| **PROPUESTA, sin implementar** |'),
    ('antes de propagating un', 'antes de propagar un'),

    # --- la tabla de propuestas no tieneIdea 53 con detalle
    ('| 53 | Strike Tracker: re-apuntarlo a logros o borrarlo. | Propuesta |',
     '| 53 | Strike Tracker: re-apuntarlo a logros o borrarlo. Es la misma pregunta de ALERT-41: sin backend no hay modulo. | **DECISION DE PRODUCTO, no del Principal.** |'),

    # --- Idea 49: el "siguiente tramo sin definir" ya no es cierto
    ('- **Idea 49 — el sharding no alcanza solo.** Tramo C mergeado (35 shards, 3.58 MB, -94%), pero con el resto de la caché\n  el total medido sigue en **~14.49 MB contra 4.98 MB de cuota**. Siguiente tramo sin definir (consultado al PO, punto 3).',
     '- **Idea 49 — el sharding no alcanza solo.** Tramo C mergeado y **corregido** (0.81 MB con el drop de los 5 campos\n'
     '  muertos), pero `ach_acc` son **27 keys** (el fingerprint del token va en el nombre) y el sharding no las toca.\n'
     '  Secuencia acordada con el PO: **49G** (compacto, la que cierra la cuota) -> **49D** (barrido de huerfanas) ->\n'
     '  **49F/49E**. El **LRU (Tramo B) baja**: era la respuesta a un problema que ya no es el problema.\n'
     '- **Idea 52 — 5 de 30 encuentros de `raid-tracker.js` no existen** (4 renombres 1:1 + `vloxx`, que no esta en\n'
     '  ninguna parte). 30 min, fix de dato, y es el modulo que Pablo usa todas las semanas. **Entra al frente.**'),
])

# ---------------------------------------------------------------------------
# BACKLOG.md — faltan las 3 ideas del PO que no estan todavia como item.
# ---------------------------------------------------------------------------
edit('BACKLOG.md', [
    ('- [ ] **Idea 49G —',
     '- [ ] **Idea 52 — `raid-tracker.js`: 5 de 30 encuentros que no existen (PO, 08:00 UTC)** — '
     '\U0001f7e2 **PRIMERA DEL BACKLOG. 30 min, fix de dato puro.** El BACKLOG decia "12 de 12 ids en el catalogo": eso '
     'era comparar 12, no 30. Medido sobre `WINGS`: **25 de 30**. Cuatro son renombres 1:1 '
     '(`siege_the_stronghold`->`escort`, `desmina`->`soulless_horror`, `dhuum`->`voice_in_the_void`, '
     '`gates_of_ahdashim`->`gate`) y **`vloxx` no existe en ninguna parte**: es el ala del CM del 29-sep y **no es '
     'marcable en ninguno de los dos modulos**. Al reves: **5 eventos reales sin cablear**. Es el mismo bug que '
     'ALERT-41 en el modulo que todos creian sano, y el que Pablo mira todas las semanas. **Sin logica, sin CSS.**\n'
     '- [ ] **Idea 53 — Strike Tracker: re-apuntarlo a logros o borrarlo (PO, 08:00 UTC)** — '
     '\U0001f7e2 **DECISION DE PRODUCTO, no tecnica.** Es la pregunta que ALERT-41 ya dejo abierta: los 15 ids de '
     '`STRIKES_BY_EXPANSION` no existen en `/v2/raids`, asi que el modulo no puede marcar nada. '
     '**Bloqueada hasta que Pablo pegue el body crudo de una llamada a `/v2/account/raids` con token real.** '
     'Si la respuesta es que el endpoint no trae ids utilizables, la opcion honesta es **borrar el modulo**, '
     'no dejar un tracker que no puede marcar.\n'
     '- [ ] **Idea 50 — la cuota no se libera nunca (PO, 06:00 UTC)** — \U0001f7e2 **DIAGNOSTICO, habilita D/F/E.** '
     '`lsDel()` (`api-gw2.js:243`) tiene **0 callers**; `cacheClear()` (`:1077`) limpia `__mem` y **no toca '
     'localStorage**; `getCache()` (`:324`) devuelve `null` al vencer pero **no borra la entrada**; '
     '`KeyManager.remove()` (`app.js:694`) saca la API Key de la lista y **deja su cache huerfana para siempre**. '
     'El TTL deja de leer, no libera. Consecuencia practica: si Pablo rota tokens, cada `ach_acc:*` huerfano son '
     '100-364 KB que no se van nunca. **De aqui salen los Tramos D (barrido), F (que `cacheClear` borre de verdad) '
     'y E (que `getCache` borre la vencida).**\n'
     '- [ ] **Idea 49G —'),
])
