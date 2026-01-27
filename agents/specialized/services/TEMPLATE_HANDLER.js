/**
 * TEMPLATE DE HANDLER PARA SERVICESAGENT
 * 
 * Este template define la estructura estándar que deben seguir
 * todos los handlers del ServicesAgent para mantener consistencia
 * y facilitar el mantenimiento.
 */

// ============================================
// IMPORTS ESTÁNDAR
// ============================================
import openaiService from '../../../services/OpenAIService.js';
import Servicio from '../../../../models/Servicio.js';
import PaqueteServicio from '../../../../models/PaqueteServicio.js';
import logger from '../../../../utils/logger.js';

// ============================================
// CLASE HANDLER
// ============================================
/**
 * [HandlerName] - [Breve descripción]
 * 
 * Responsabilidades:
 * - Responsabilidad 1
 * - Responsabilidad 2
 * - Responsabilidad 3
 * 
 * @class
 */
class HandlerName {
  /**
   * Constructor
   * @param {Object} config - Configuración del handler
   */
  constructor(config = {}) {
    this.config = {
      // Configuración por defecto
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      cacheEnabled: config.cacheEnabled !== false,
      ...config
    };

    // Estado interno
    this.cache = new Map();
    this.metrics = {
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      averageResponseTime: 0
    };

    logger.info(`✅ ${this.constructor.name} initialized`);
  }

  // ============================================
  // MÉTODOS PRINCIPALES
  // ============================================

  /**
   * Método principal del handler
   * @param {Object} params - Parámetros
   * @returns {Promise<Object>} Resultado
   */
  async mainMethod(params) {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      logger.info(`🔄 ${this.constructor.name}.mainMethod started`);

      // 1. Validar entrada
      this.validateInput(params);

      // 2. Verificar caché
      const cached = this.getFromCache(params);
      if (cached) {
        logger.info('📦 Using cached result');
        return cached;
      }

      // 3. Obtener datos necesarios
      const data = await this.fetchRequiredData(params);

      // 4. Procesar con IA (si aplica)
      const aiResult = await this.processWithAI(data, params);

      // 5. Post-procesar resultado
      const result = await this.postProcess(aiResult, data);

      // 6. Guardar en caché
      this.saveToCache(params, result);

      // 7. Actualizar métricas
      this.updateMetrics(startTime, true);

      logger.success(`✅ ${this.constructor.name}.mainMethod completed in ${Date.now() - startTime}ms`);
      
      return {
        success: true,
        data: result,
        metadata: {
          processingTime: Date.now() - startTime,
          cached: false
        }
      };

    } catch (error) {
      this.updateMetrics(startTime, false);
      logger.error(`❌ ${this.constructor.name}.mainMethod failed:`, error);

      return {
        success: false,
        error: error.message,
        metadata: {
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  // ============================================
  // MÉTODOS AUXILIARES PRIVADOS
  // ============================================

  /**
   * Validar entrada
   * @private
   */
  validateInput(params) {
    if (!params) {
      throw new Error('Parameters are required');
    }
    // Validaciones específicas
  }

  /**
   * Obtener datos requeridos
   * @private
   */
  async fetchRequiredData(params) {
    // Obtener datos de BD u otras fuentes
    return {};
  }

  /**
   * Procesar con IA
   * @private
   */
  async processWithAI(data, params) {
    if (!openaiService.isAvailable()) {
      return this.getFallbackResponse(data, params);
    }

    // Construir prompt
    const prompt = this.buildPrompt(data, params);

    // Llamar a OpenAI
    const response = await openaiService.generateIntelligentResponse(
      params.sessionId || 'default',
      'ServicesAgent',
      prompt,
      {
        temperature: this.config.temperature || 0.7,
        maxTokens: this.config.maxTokens || 2000
      }
    );

    return response;
  }

  /**
   * Construir prompt para IA
   * @private
   */
  buildPrompt(data, params) {
    return {
      system: 'Eres un asistente experto en...',
      user: `Analiza el siguiente servicio: ${JSON.stringify(data)}`
    };
  }

  /**
   * Post-procesar resultado
   * @private
   */
  async postProcess(aiResult, originalData) {
    // Parsear, validar, enriquecer el resultado
    return aiResult;
  }

  /**
   * Respuesta de fallback
   * @private
   */
  getFallbackResponse(data, params) {
    return {
      message: 'AI service not available, using fallback',
      data: data
    };
  }

  // ============================================
  // SISTEMA DE CACHÉ
  // ============================================

  /**
   * Generar key de caché
   * @private
   */
  getCacheKey(params) {
    return JSON.stringify({
      method: this.constructor.name,
      params: params
    });
  }

  /**
   * Obtener de caché
   * @private
   */
  getFromCache(params) {
    if (!this.config.cacheEnabled) return null;

    const key = this.getCacheKey(params);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < 600000) { // 10 minutos
      return cached.data;
    }

    return null;
  }

  /**
   * Guardar en caché
   * @private
   */
  saveToCache(params, data) {
    if (!this.config.cacheEnabled) return;

    const key = this.getCacheKey(params);
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });

    // Limitar tamaño de caché
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Limpiar caché
   */
  clearCache() {
    this.cache.clear();
    logger.info(`🗑️  ${this.constructor.name} cache cleared`);
  }

  // ============================================
  // MÉTRICAS
  // ============================================

  /**
   * Actualizar métricas
   * @private
   */
  updateMetrics(startTime, success) {
    const responseTime = Date.now() - startTime;

    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.errorCount++;
    }

    // Calcular promedio móvil
    const totalCompleted = this.metrics.successCount + this.metrics.errorCount;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (totalCompleted - 1) + responseTime) / totalCompleted;
  }

  /**
   * Obtener métricas
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successCount / this.metrics.totalRequests) * 100 
        : 0,
      errorRate: this.metrics.totalRequests > 0 
        ? (this.metrics.errorCount / this.metrics.totalRequests) * 100 
        : 0
    };
  }

  /**
   * Resetear métricas
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      averageResponseTime: 0
    };
    logger.info(`📊 ${this.constructor.name} metrics reset`);
  }

  // ============================================
  // CONFIGURACIÓN
  // ============================================

  /**
   * Actualizar configuración
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    logger.info(`⚙️  ${this.constructor.name} config updated`);
  }

  /**
   * Obtener configuración
   */
  getConfig() {
    return { ...this.config };
  }
}

// ============================================
// EXPORT
// ============================================
export default HandlerName;

// ============================================
// EJEMPLO DE USO
// ============================================
/*
import HandlerName from './handlers/HandlerName.js';

// Crear instancia
const handler = new HandlerName({
  timeout: 30000,
  cacheEnabled: true
});

// Usar
const result = await handler.mainMethod({
  serviceId: '123',
  options: { ... }
});

if (result.success) {
  console.log('Resultado:', result.data);
} else {
  console.error('Error:', result.error);
}

// Ver métricas
console.log('Métricas:', handler.getMetrics());
*/
