/**
 * Sistema de logging específico para servicios
 * Proporciona logging estructurado para operaciones CRUD y debug
 */

import logger from '../utils/logger.js';

/**
 * Logger para operaciones de servicios
 */
export class ServiceLogger {
  static logServiceOperation(operation, serviceId, userId, data = {}) {
    logger.info(`🔧 SERVICE_OPERATION`, {
      operation,
      serviceId,
      userId,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  static logServiceError(operation, serviceId, userId, error, data = {}) {
    logger.error(`❌ SERVICE_ERROR`, {
      operation,
      serviceId,
      userId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  static logValidationError(serviceId, userId, errors) {
    logger.warn(`⚠️ VALIDATION_ERROR`, {
      operation: 'validation',
      serviceId,
      userId,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  static logUpdateDetails(serviceId, userId, beforeData, afterData) {
    const changes = this.detectChanges(beforeData, afterData);
    
    logger.info(`📝 SERVICE_UPDATE_DETAILS`, {
      serviceId,
      userId,
      changedFields: Object.keys(changes),
      changes,
      timestamp: new Date().toISOString()
    });
  }

  static detectChanges(before, after) {
    const changes = {};
    
    for (const key in after) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changes[key] = {
          from: before[key],
          to: after[key]
        };
      }
    }
    
    return changes;
  }
}

/**
 * Middleware para logging automático de operaciones
 */
export const serviceOperationLogger = (operation) => {
  return (req, res, next) => {
    const serviceId = req.params.id;
    const userId = req.auth?.userId || req.user?.id;
    
    // Log de inicio de operación
    ServiceLogger.logServiceOperation(operation, serviceId, userId, {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Interceptar respuesta para log de resultado
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode >= 400) {
        ServiceLogger.logServiceError(operation, serviceId, userId, new Error(data.message || 'Unknown error'), {
          statusCode: res.statusCode,
          responseData: data
        });
      } else {
        ServiceLogger.logServiceOperation(`${operation}_success`, serviceId, userId, {
          statusCode: res.statusCode,
          success: true
        });
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
};

export default ServiceLogger;