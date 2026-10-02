/*!
 * js/gist-sync.js — Sincronización con GitHub Gist
 * v1.1.0 (2026-09-26)
 * 
 * Permite sincronizar la configuración de la app con un Gist privado en GitHub.
 * Requiere token personal de GitHub con permisos 'gist'.
 * El token se almacena cifrado en localStorage con AES-GCM + PBKDF2.
 * 
 * 🔒 Seguridad: El token se cifra con una clave derivada del password del
 *    usuario + salt aleatorio (PBKDF2 200k iter). El token NO se descifra
 *    en init() — se requiere unlockToken(password) bajo demanda.
 *    Tokens con cifrado obsoleto (CryptoJS/fixedSalt) no son compatibles.
 */

(function(root) {
  'use strict';
  var LOG = '[GistSync]';
  
  // Configuración
  var CONFIG = {
    STORAGE_TOKEN_KEY: 'gh_token_encrypted',
    STORAGE_GIST_ID_KEY: 'gh_gist_id',
    GIST_FILENAME: 'gw2-config.json',
    GIST_DESCRIPTION: 'Bóveda del Gato Negro - Configuración sincronizada'
  };
  
  // Estado interno
  var state = {
    token: null,
    gistId: null,
    initialized: false
  };
  
  // =======================================================================
  // 1. CRIPTOGRAFÍA (para token) — Web Crypto API (built-in, no CDN)
  // =======================================================================
  
  var PBKDF2_ITERATIONS = 200000;
  
  /**
   * Genera un salt aleatorio de 16 bytes (hex string)
   */
  function generateSalt() {
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(function(b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }
  
  /**
   * Convierte un ArrayBuffer a hex string
   */
  function buf2hex(buffer) {
    var bytes = new Uint8Array(buffer);
    return Array.from(bytes).map(function(b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }
  
  /**
   * Convierte un hex string a Uint8Array
   */
  function hexToBytes(hex) {
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }
  
  /**
   * Deriva una clave AES-GCM desde el password del usuario + salt aleatorio
   * usando PBKDF2 (200k iteraciones, SHA-256)
   */
  async function deriveKey(password, saltHex) {
    var enc = new TextEncoder();
    var saltBytes = hexToBytes(saltHex);
    var keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  }
  
  /**
   * Cifra el token antes de guardarlo usando AES-GCM + PBKDF2
   * Formato almacenado: "salt:iv:data" (todo en hex)
   */
  async function encryptToken(token, password) {
    var salt = generateSalt();
    var key = await deriveKey(password, salt);
    var enc = new TextEncoder();
    var data = enc.encode(token);
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv }, key, data
    );
    return salt + ':' + buf2hex(iv) + ':' + buf2hex(encrypted);
  }
  
  /**
   * Descifra el token guardado usando AES-GCM + PBKDF2
   * Formato esperado: "salt:iv:data" (todo en hex)
   * Tokens en formato antiguo (CryptoJS) lanzan error — deben re-ingresarse.
   */
  async function decryptToken(encryptedStr, password) {
    var parts = encryptedStr.split(':');
    if (parts.length !== 3) {
      // Formato antiguo (CryptoJS con fixedSalt) — no se puede descifrar con seguridad
      throw new Error('Token con cifrado obsoleto. Por favor, reingresá el token.');
    }
    var salt = parts[0];
    var iv = hexToBytes(parts[1]);
    var encrypted = hexToBytes(parts[2]);
    var key = await deriveKey(password, salt);
    var decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv }, key, encrypted
    );
    return new TextDecoder().decode(decrypted);
  }
  
  // =======================================================================
  // 2. GESTIÓN DE TOKEN
  // =======================================================================
  
  /**
   * Guarda el token cifrado en localStorage (requiere password del usuario)
   */
  async function saveToken(token, password) {
    try {
      var encrypted = await encryptToken(token, password);
      localStorage.setItem(CONFIG.STORAGE_TOKEN_KEY, encrypted);
      state.token = token;
      console.log(LOG, 'Token guardado correctamente');
      return true;
    } catch (e) {
      console.error(LOG, 'Error guardando token:', e);
      return false;
    }
  }
  
  /**
   * Recupera el token desde localStorage (requiere password del usuario)
   */
  async function loadToken(password) {
    try {
      var encrypted = localStorage.getItem(CONFIG.STORAGE_TOKEN_KEY);
      if (encrypted) {
        state.token = await decryptToken(encrypted, password);
        return state.token;
      }
    } catch (e) {
      console.warn(LOG, 'Error cargando token:', e);
      throw e;
    }
    return null;
  }
  
  /**
   * Desbloquea el token almacenado usando el password del usuario
   * (token se descifra bajo demanda, NO en init())
   */
  async function unlockToken(password) {
    var encrypted = localStorage.getItem(CONFIG.STORAGE_TOKEN_KEY);
    if (!encrypted) {
      throw new Error('No hay token guardado');
    }
    var token = await decryptToken(encrypted, password);
    state.token = token;
    return true;
  }
  
  /**
   * Elimina el token guardado
   */
  function clearToken() {
    try {
      localStorage.removeItem(CONFIG.STORAGE_TOKEN_KEY);
      localStorage.removeItem(CONFIG.STORAGE_GIST_ID_KEY);
      state.token = null;
      state.gistId = null;
      console.log(LOG, 'Token eliminado');
      return true;
    } catch (e) {
      console.error(LOG, 'Error eliminando token:', e);
      return false;
    }
  }
  
  // =======================================================================
  // 3. API DE GITHUB
  // =======================================================================
  
  /**
   * Headers para las peticiones a GitHub API
   */
  function getHeaders() {
    return {
      'Authorization': 'token ' + state.token,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  }
  
  /**
   * Verifica si el token es válido (haciendo una petición de prueba)
   */
  async function verifyToken() {
    if (!state.token) return false;
    
    try {
      var response = await fetch('https://api.github.com/user', {
        headers: getHeaders()
      });
      
      if (response.ok) {
        var user = await response.json();
        console.log(LOG, 'Token válido para usuario:', user.login);
        return true;
      }
    } catch (e) {
      console.warn(LOG, 'Error verificando token:', e);
    }
    return false;
  }
  
  /**
   * Crea un nuevo Gist para la configuración
   */
  async function createGist() {
    if (!state.token) {
      throw new Error('No hay token configurado');
    }
    
    var configData = await window.SettingsManager.exportData();
    var content = JSON.stringify(configData, null, 2);
    
    var body = {
      description: CONFIG.GIST_DESCRIPTION,
      public: false,
      files: {}
    };
    body.files[CONFIG.GIST_FILENAME] = { content: content };
    
    var response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      var error = await response.json();
      throw new Error(error.message || 'Error al crear Gist');
    }
    
    var gist = await response.json();
    state.gistId = gist.id;
    localStorage.setItem(CONFIG.STORAGE_GIST_ID_KEY, gist.id);
    
    console.log(LOG, 'Gist creado:', gist.id);
    return gist;
  }
  
  /**
   * Obtiene el Gist existente (por ID)
   */
  async function getGist(gistId) {
    if (!state.token) {
      throw new Error('No hay token configurado');
    }
    
    var response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        // Gist no existe, limpiar ID guardado
        localStorage.removeItem(CONFIG.STORAGE_GIST_ID_KEY);
        state.gistId = null;
        throw new Error('El Gist ya no existe. Será creado nuevamente.');
      }
      var error = await response.json();
      throw new Error(error.message || 'Error al obtener Gist');
    }
    
    return await response.json();
  }
  
  /**
   * Actualiza el Gist existente
   */
  async function updateGist(gistId, content) {
    if (!state.token) {
      throw new Error('No hay token configurado');
    }
    
    var body = {
      files: {}
    };
    body.files[CONFIG.GIST_FILENAME] = { content: content };
    
    var response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      var error = await response.json();
      throw new Error(error.message || 'Error al actualizar Gist');
    }
    
    return await response.json();
  }
  
  // =======================================================================
  // 4. OPERACIONES PRINCIPALES
  // =======================================================================
  
  /**
   * Inicializa el módulo (carga gistId, NO decrypta token — se hace bajo demanda)
   */
  function init() {
    var savedGistId = localStorage.getItem(CONFIG.STORAGE_GIST_ID_KEY);
    var hasEncrypted = !!localStorage.getItem(CONFIG.STORAGE_TOKEN_KEY);
    
    if (hasEncrypted) {
      state.gistId = savedGistId;
      console.log(LOG, 'Módulo inicializado (token en espera de desbloqueo)');
    } else if (savedGistId) {
      state.gistId = savedGistId;
      console.log(LOG, 'Módulo inicializado (sin token)');
    } else {
      console.log(LOG, 'Módulo inicializado (limpio)');
    }
    state.initialized = true;
  }
  
  /**
   * Configura el token y opcionalmente crea un Gist (requiere password)
   */
  async function setupToken(token, password, createGistIfNeeded = true) {
    // Verificar token
    state.token = token;
    var isValid = await verifyToken();
    
    if (!isValid) {
      state.token = null;
      throw new Error('Token inválido. Verificá que tenga permisos "gist".');
    }
    
    // Guardar token cifrado (con password del usuario)
    await saveToken(token, password);
    
    // Buscar o crear Gist
    if (createGistIfNeeded) {
      var existingGistId = localStorage.getItem(CONFIG.STORAGE_GIST_ID_KEY);
      
      if (existingGistId) {
        try {
          await getGist(existingGistId);
          state.gistId = existingGistId;
          console.log(LOG, 'Gist existente encontrado:', existingGistId);
        } catch (e) {
          console.warn(LOG, 'Gist existente no válido, creando nuevo');
          await createGist();
        }
      } else {
        await createGist();
      }
    }
    
    return { success: true, gistId: state.gistId };
  }
  
  /**
   * Sube la configuración actual al Gist
   */
  async function uploadConfig() {
    if (!state.token) {
      throw new Error('No hay token configurado. Configurá tu token primero.');
    }
    
    // Verificar que el Gist existe
    var gistId = state.gistId || localStorage.getItem(CONFIG.STORAGE_GIST_ID_KEY);
    if (!gistId) {
      // Crear nuevo Gist
      await createGist();
      gistId = state.gistId;
    } else {
      // Verificar que el Gist existe
      try {
        await getGist(gistId);
      } catch (e) {
        // Gist no existe, crear nuevo
        console.warn(LOG, 'Gist no encontrado, creando nuevo');
        await createGist();
        gistId = state.gistId;
      }
    }
    
    // Exportar configuración actual
    var configData = await window.SettingsManager.exportData();
    var content = JSON.stringify(configData, null, 2);
    
    // Actualizar Gist
    var updated = await updateGist(gistId, content);
    
    console.log(LOG, 'Configuración subida correctamente');
    return { success: true, gistId: gistId, updatedAt: updated.updated_at };
  }
  
    /**
   * Descarga la configuración desde el Gist y la aplica
   */
  async function downloadAndSync() {
    if (!state.token) {
      throw new Error('No hay token configurado. Configurá tu token primero.');
    }
    
    var gistId = state.gistId || localStorage.getItem(CONFIG.STORAGE_GIST_ID_KEY);
    if (!gistId) {
      throw new Error('No hay Gist configurado. Subí tu configuración primero.');
    }
    
    // Obtener Gist
    var gist = await getGist(gistId);
    var file = gist.files[CONFIG.GIST_FILENAME];
    
    if (!file) {
      throw new Error('El Gist no contiene el archivo de configuración');
    }
    
    // Descargar contenido (FORZANDO RECARGA PARA EVITAR CACHÉ)
    var contentResponse = await fetch(file.raw_url + '?t=' + Date.now());
    
    // CORRECCIÓN PARA EDGE/FIREFOX: Guardamos el texto crudo y lo parseamos ANTES de pasarlo
    var rawText = await contentResponse.text();
    var configData = JSON.parse(rawText);
    
    // Importar configuración usando SettingsManager
    // HB#119 T20-a: el confirm del Gist tiene que decir lo mismo que el del
    // archivo. Antes decia "Esto sobrescribira tu configuracion local" y nada
    // mas: 0 de las 7 familias, 0 cifras. Lo unico del backup que NO se
    // regenera con un click son las API keys -- una key de GW2 no se vuelve a
    // bajar de ArenaNet; si no la guardaste, hay que crear otra. El precedente
    // es literal y esta 60 lineas mas arriba, en settings-manager.js:594-603.
    var keyCount = configData?.data?.apiKeys?.list?.length || 0;
    var confirmMsg = '¿Sincronizar desde la nube?\n\n' +
      'Se descargará y aplicará la configuración remota.\n' +
      'Esto SOBRESCRIBE tu configuración local:\n\n' +
      '• API Keys (' + keyCount + ' claves)\n' +
      '• Wizard\'s Vault (pins y marcas)\n' +
      '• Wallet (pins, snapshots, vista compacta)\n' +
      '• Activities (toggles, home nodes)\n' +
      '• Characters (POIs, ubicaciones)\n' +
      '• Meta (favoritos, hecho hoy)\n' +
      '• Configuración global\n\n' +
      '¿Continuar?';
    
    if (confirm(confirmMsg)) {
      await window.SettingsManager.importFromData(configData);
      if (window.toast) {
        window.toast('success', 'Configuración sincronizada correctamente', { ttl: 2000 });
      }
      setTimeout(function() {
        location.reload();
      }, 500);
    }
    
    return { success: true, updatedAt: gist.updated_at };
  }
  
  /**
   * Obtiene el estado actual de sincronización
   */
  async function getStatus() {
    var hasToken = !!state.token;
    var hasEncrypted = !!localStorage.getItem(CONFIG.STORAGE_TOKEN_KEY);
    var hasGistId = !!(state.gistId || localStorage.getItem(CONFIG.STORAGE_GIST_ID_KEY));
    var needsUnlock = hasEncrypted && !hasToken;
    var gistInfo = null;
    
    if (hasToken && hasGistId) {
      try {
        var gistId = state.gistId || localStorage.getItem(CONFIG.STORAGE_GIST_ID_KEY);
        var gist = await getGist(gistId);
        gistInfo = {
          id: gist.id,
          updatedAt: gist.updated_at,
          createdAt: gist.created_at
        };
      } catch (e) {
        gistInfo = { error: e.message };
      }
    }
    
    return {
      hasToken: hasToken,
      hasEncryptedToken: hasEncrypted,
      needsUnlock: needsUnlock,
      hasGist: hasGistId,
      gistInfo: gistInfo,
      tokenConfigured: hasToken
    };
  }
  
  /**
   * Elimina la configuración de sincronización (token y Gist)
   */
  function clearSync() {
    clearToken();
    return { success: true };
  }
  
  // =======================================================================
  // 5. API PÚBLICA
  // =======================================================================
  
  var GistSync = {
    init: init,
    setupToken: setupToken,
    unlockToken: unlockToken,
    uploadConfig: uploadConfig,
    downloadAndSync: downloadAndSync,
    getStatus: getStatus,
    clearSync: clearSync,
    verifyToken: verifyToken,
    _debug: function() {
      return {
        hasToken: !!state.token,
        hasEncryptedToken: !!localStorage.getItem(CONFIG.STORAGE_TOKEN_KEY),
        hasGistId: !!state.gistId,
        needsUnlock: !!localStorage.getItem(CONFIG.STORAGE_TOKEN_KEY) && !state.token,
        initialized: state.initialized
      };
    }
  };
  
  root.GistSync = GistSync;
  
  // Auto-inicializar
  init();
  
})(typeof window !== 'undefined' ? window : this);