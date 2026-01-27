import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const API_LOG_FILE = path.join(logsDir, 'api-requests.log');

/**
 * Middleware para loguear todas las requests de API relacionadas con CMS
 */
export const cmsLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.ip || req.connection.remoteAddress;
  
  // Solo loguear requests de CMS
  if (!url.includes('/cms/')) {
    return next();
  }

  // Log inicial de la request
  const requestLog = {
    timestamp,
    method,
    url,
    ip,
    user: req.user?.email || 'anonymous',
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
    }
  };

  // Si es PUT/POST, loguear el body (cuidado con datos sensibles)
  if ((method === 'PUT' || method === 'POST') && req.body) {
    // Clonar body sin incluir datos sensibles grandes
    const bodyCopy = { ...req.body };
    
    // Si hay content, solo loguear las URLs de imágenes
    if (bodyCopy.content) {
      const contentSummary = {};
      
      if (bodyCopy.content.hero?.backgroundImage) {
        contentSummary.heroBackgroundImage = bodyCopy.content.hero.backgroundImage;
      }
      
      if (bodyCopy.content.solutions?.backgroundImage) {
        contentSummary.solutionsBackgroundImage = bodyCopy.content.solutions.backgroundImage;
      }
      
      if (bodyCopy.content.solutions?.items) {
        contentSummary.solutionsItems = bodyCopy.content.solutions.items.map(item => ({
          title: item.title,
          iconLight: item.iconLight,
          iconDark: item.iconDark,
          icon: item.icon
        }));
      }
      
      requestLog.contentSummary = contentSummary;
      delete bodyCopy.content; // No loguear todo el content
    }
    
    if (bodyCopy.theme) {
      requestLog.themeUpdated = true;
      delete bodyCopy.theme; // No loguear todo el theme
    }
    
    requestLog.body = bodyCopy;
  }

  console.log(`📝 [CMS] ${method} ${url} - User: ${requestLog.user}`);
  
  // Log en archivo
  const logMessage = `${JSON.stringify(requestLog, null, 2)}\n${'='.repeat(80)}\n`;
  fs.appendFileSync(API_LOG_FILE, logMessage);

  // Interceptar la respuesta para loguear el resultado
  const originalSend = res.send;
  res.send = function (data) {
    const responseLog = {
      timestamp: new Date().toISOString(),
      method,
      url,
      statusCode: res.statusCode,
      user: req.user?.email || 'anonymous',
    };

    // Parsear la respuesta si es JSON
    try {
      const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
      if (jsonData.success !== undefined) {
        responseLog.success = jsonData.success;
        responseLog.message = jsonData.message;
      }
    } catch (e) {
      // No es JSON, ignorar
    }

    console.log(`✅ [CMS] Response ${res.statusCode} - ${url}`);
    
    const responseLogMessage = `RESPONSE: ${JSON.stringify(responseLog, null, 2)}\n${'='.repeat(80)}\n`;
    fs.appendFileSync(API_LOG_FILE, responseLogMessage);

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Función para leer los últimos N logs
 */
export const getRecentLogs = (lines = 50) => {
  try {
    if (!fs.existsSync(API_LOG_FILE)) {
      return [];
    }

    const content = fs.readFileSync(API_LOG_FILE, 'utf-8');
    const logEntries = content.split('='.repeat(80));
    
    // Retornar los últimos N entries
    return logEntries.slice(-lines).filter(entry => entry.trim());
  } catch (error) {
    console.error('Error al leer logs:', error);
    return [];
  }
};

/**
 * Función para limpiar logs antiguos (mantener solo últimos 7 días)
 */
export const cleanOldLogs = () => {
  try {
    if (!fs.existsSync(API_LOG_FILE)) {
      return;
    }

    const content = fs.readFileSync(API_LOG_FILE, 'utf-8');
    const logEntries = content.split('='.repeat(80));
    
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const recentLogs = logEntries.filter(entry => {
      try {
        const logData = JSON.parse(entry.replace('RESPONSE:', '').trim());
        const logTimestamp = new Date(logData.timestamp).getTime();
        return logTimestamp > sevenDaysAgo;
      } catch {
        return true; // Mantener entries que no se puedan parsear
      }
    });

    if (recentLogs.length < logEntries.length) {
      fs.writeFileSync(API_LOG_FILE, recentLogs.join('='.repeat(80) + '\n'));
      console.log(`🧹 Logs limpiados: ${logEntries.length - recentLogs.length} entries eliminadas`);
    }
  } catch (error) {
    console.error('Error al limpiar logs:', error);
  }
};

// Limpiar logs antiguos al iniciar
cleanOldLogs();

export default {
  cmsLogger,
  getRecentLogs,
  cleanOldLogs
};
