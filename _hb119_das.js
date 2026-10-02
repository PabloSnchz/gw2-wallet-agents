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
    var confirmMsg = '¿Sincronizar desde la nube?\n\n' +
      'Se descargará y aplicará la configuración remota.\n' +
      'Esto sobrescribirá tu configuración local.\n\n' +
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