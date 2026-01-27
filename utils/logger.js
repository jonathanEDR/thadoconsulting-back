/**
 * 📊 Logger Configuration for Web Scuti
 * Maneja logging diferenciado para desarrollo vs producción
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

class Logger {
  constructor() {
    this.isDev = isDevelopment;
    this.isProd = isProduction;
  }

  // 🚀 Logs de inicialización (siempre se muestran)
  startup(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`🚀 [STARTUP] ${timestamp}: ${message}`);
    if (data && this.isDev) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }

  // ✅ Logs de éxito
  success(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`✅ [SUCCESS] ${timestamp}: ${message}`);
    if (data && this.isDev) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }

  // ❌ Logs de error (siempre se muestran)
  error(message, error = null) {
    const timestamp = new Date().toISOString();
    console.error(`❌ [ERROR] ${timestamp}: ${message}`);
    
    if (error) {
      if (this.isDev) {
        // En desarrollo: stack trace completo
        console.error('   Stack:', error.stack || error);
      } else {
        // En producción: solo el mensaje del error
        console.error('   Error:', error.message || error);
      }
    }
  }

  // ⚠️ Logs de advertencia
  warn(message, data = null) {
    const timestamp = new Date().toISOString();
    console.warn(`⚠️ [WARN] ${timestamp}: ${message}`);
    if (data && this.isDev) {
      console.warn('   Data:', JSON.stringify(data, null, 2));
    }
  }

  // ℹ️ Logs informativos
  info(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`ℹ️ [INFO] ${timestamp}: ${message}`);
    if (data && this.isDev) {
      console.log('   Info:', JSON.stringify(data, null, 2));
    }
  }

  // 🔍 Logs de debug (solo desarrollo)
  debug(message, data = null) {
    if (!this.isDev) return;
    
    const timestamp = new Date().toISOString();
    console.log(`🔍 [DEBUG] ${timestamp}: ${message}`);
    if (data) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }

  // 📊 Logs de performance (solo desarrollo)
  performance(operation, duration, data = null) {
    if (!this.isDev) return;
    
    const timestamp = new Date().toISOString();
    console.log(`⚡ [PERF] ${timestamp}: ${operation} completed in ${duration}ms`);
    if (data) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }

  // 📡 Logs de API calls
  api(method, endpoint, status, duration = null) {
    const timestamp = new Date().toISOString();
    const statusIcon = status >= 200 && status < 300 ? '✅' : status >= 400 ? '❌' : '⚠️';
    
    let logMessage = `${statusIcon} [API] ${timestamp}: ${method} ${endpoint} - Status: ${status}`;
    if (duration) {
      logMessage += ` - ${duration}ms`;
    }
    
    console.log(logMessage);
  }

  // 🗄️ Logs de base de datos
  database(operation, collection = null, result = null) {
    const timestamp = new Date().toISOString();
    let message = `🗄️ [DB] ${timestamp}: ${operation}`;
    
    if (collection) {
      message += ` en ${collection}`;
    }
    
    console.log(message);
    
    if (result && this.isDev) {
      console.log('   Result:', JSON.stringify(result, null, 2));
    }
  }

  // ⚡ Logs de performance
  performance(operation, startTime) {
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();
    
    let icon = '⚡';
    if (duration > 1000) icon = '🐌';      // > 1s
    else if (duration > 500) icon = '⚠️';   // > 500ms
    
    console.log(`${icon} [PERF] ${timestamp}: ${operation} completado en ${duration}ms`);
  }

  // 💾 Log para operaciones de archivos
  file(operation, filePath, success = true) {
    const timestamp = new Date().toISOString();
    const icon = success ? '💾' : '❌';
    console.log(`${icon} [FILE] ${timestamp}: ${operation} - ${filePath}`);
  }

  // 🔄 Log para operaciones de inicialización
  init(step, status = 'success', details = null) {
    const timestamp = new Date().toISOString();
    const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : '🔄';
    
    console.log(`${icon} [INIT] ${timestamp}: ${step}`);
    
    if (details && this.isDev) {
      console.log('   Details:', JSON.stringify(details, null, 2));
    }
  }
}

// Exportar instancia singleton
const logger = new Logger();

export default logger;