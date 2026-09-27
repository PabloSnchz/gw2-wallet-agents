# Política de Privacidad — Bóveda del Gato Negro

> Última actualización: 2026-09-27

## ¿Qué es esta app?

**gw2-wallet-ligero** es una aplicación web **100% cliente** (sin backend).
Es decir: **tu navegador es el servidor.** No existe un servidor central
que reciba tus datos. No hay registro de usuarios. No hay base de datos.

Todo corre en tu máquina: los fetch a la API de GW2 se hacen con tu key
desde tu navegador, y los resultados se procesan localmente.

## ¿Qué datos se recopilan?

**Ningún dato personal, ni de tu cuenta de GW2, ni de tu identidad, sale de tu navegador.**

La única información que circula fuera de tu máquina es:
- Peticiones a la **API de Guild Wars 2** (`https://api.guildwars2.com/v2/`) usando tu API key.
- Peticiones a la **API de GitHub** (`https://api.github.com/`) si usás Gist Sync (opcional).
- Eventos anónimos de uso a **Google Analytics** (`www.google-analytics.com`) — opcional, configurable.

### Google Analytics

La app carga `gtag.js` para métricas básicas de uso. Puedes deshabilitarlo en **⚙️ Configuración → Analytics**.
No se envían datos de tu wallet, items, ni API key. Solo eventos como `view_module`.

## ¿Qué datos se almacenan localmente?

Todo en tu navegador, con el prefijo `gn:` (storage.js v1.0.1):

| Clave | Tipo | Protegido |
|-------|------|-----------|
| `gn:apiKeys` | JSON (API keys) | ❌ No — necesario para funcionar |
| `gn:selectedKey` | string (key activa) | ❌ No |
| `gn:settings` | JSON (preferencias) | ❌ No |
| `gn:accountsData` | JSON **encriptado** | ✅ Sí (AES-GCM) |
| `gn:accountsMeta` | JSON (nombre archivo) | ❌ No |
| `gn:wvSeason_v<year>` | JSON (WV season data) | ❌ No |
| `gn:github:token` | string (GitHub token) | ❌ No |
| `gn:github:gist_id` | string (Gist ID) | ❌ No |

### API Keys de GW2

Se guardan en `localStorage` sin encriptar, pero **nunca se envían a nuestro servidor** —
solo se usan para las peticiones a la API de GW2 directamente desde tu navegador.

### Sincronización con Gist (opcional)

Si activás la sync con GitHub Gist:
1. La app **encripta** tus datos usando **Web Crypto API** (PBKDF2 + AES-GCM).
2. La clave de encriptación se deriva de una **contraseña que vos elegís** (nunca se guarda).
3. El Gist resultante es un JSON opaco — GitHub no puede leerlo.
4. Para restaurar, necesitás el Gist ID + tu contraseña.

**Importante:** Perder la contraseña = perder el acceso a tus datos encriptados.

## Tus derechos

- Podés **exportar** toda tu data local: ⚙️ Configuración → Exportar JSON.
- Podés **importar** datos previamente exportados.
- Podés **borrar** todo en cualquier momento: abrí Dev Tools → `localStorage.clear()`.

## Terceros

| Servicio | Motivo | Datos enviados |
|----------|--------|---------------|
| Guild Wars 2 API | Wallet, logros, inventario, etc. | API key (scope limitado) |
| GitHub API | Opcional: sync con Gist | Token de GitHub (scope: gist) |
| Google Analytics | Métricas anónimas | Event names (view_module, export, etc.) |

---

¿Preguntas? Abrí un issue en
[github.com/PabloSnchz/gw2-wallet-ligero](https://github.com/PabloSnchz/gw2-wallet-ligero/issues).