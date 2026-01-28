/**
 * ServicesOptimizer - Optimizador de servicios con IA
 * 
 * Responsabilidades:
 * - EDITAR servicios existentes con IA (actualizar en BD)
 * - Optimizar descripciones
 * - Mejorar metadata SEO
 * - Sugerencias de mejora
 * - Optimización de conversión
 * - A/B testing recommendations
 */

import mongoose from 'mongoose';
import openaiService from '../../../services/OpenAIService.js';
import Servicio from '../../../../models/Servicio.js';
import logger from '../../../../utils/logger.js';

class ServicesOptimizer {
  constructor(config = {}) {
    this.config = {
      temperature: config.temperature || 0.6, // Menos creatividad, más precisión
      maxTokens: config.maxTokens || 2000,
      autoApplyMinorFixes: config.autoApplyMinorFixes || false,
      ...config
    };

    this.metrics = {
      totalOptimizations: 0,
      servicesEdited: 0,
      errors: 0,
      averageTime: 0
    };

    logger.info('✅ ServicesOptimizer initialized');
  }

  /**
   * EDITAR servicio con IA (actualiza en BD)
   */
  async editServiceWithAI(serviceId, updates, context = {}) {
    const startTime = Date.now();
    this.metrics.totalOptimizations++;

    try {
      logger.info(`✏️ Editing service ${serviceId} with AI...`);

      // 1. Obtener servicio actual
      const service = await Servicio.findById(serviceId);
      if (!service) {
        throw new Error(`Servicio no encontrado: ${serviceId}`);
      }

      // 2. Validar permisos (en controller se valida con middleware)
      // Aquí solo validamos datos

      // 3. Procesar actualizaciones con IA
      const optimizedUpdates = await this.processUpdatesWithAI(service, updates, context);

      // 4. Validar actualizaciones
      this.validateUpdates(optimizedUpdates);

      // 5. ACTUALIZAR EN BASE DE DATOS
      Object.assign(service, optimizedUpdates);
      service.updatedAt = new Date();
      await service.save();

      this.metrics.servicesEdited++;
      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime);

      logger.success(`✅ Service edited successfully: ${serviceId} in ${processingTime}ms`);

      return {
        success: true,
        data: {
          service: service,
          id: service._id,
          updated: Object.keys(optimizedUpdates)
        },
        metadata: {
          processingTime,
          fieldsUpdated: Object.keys(optimizedUpdates).length,
          aiOptimized: optimizedUpdates.aiOptimized || []
        }
      };

    } catch (error) {
      this.metrics.errors++;
      logger.error('❌ Error editing service with AI:', error);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Optimizar servicio completo
   */
  async optimizeService(serviceId, optimizationType = 'complete') {
    const startTime = Date.now();

    try {
      logger.info(`⚡ Optimizing service ${serviceId} (type: ${optimizationType})...`);

      // Obtener servicio - ✅ Optimización: .lean() para solo lectura
      const service = await Servicio.findById(serviceId).lean();
      if (!service) {
        throw new Error('Servicio no encontrado');
      }

      let optimizations = {};

      switch (optimizationType) {
        case 'seo':
          optimizations = await this.optimizeSEO(service);
          break;
        case 'description':
          optimizations = await this.optimizeDescription(service);
          break;
        case 'structure':
          optimizations = await this.optimizeStructure(service);
          break;
        case 'conversion':
          optimizations = await this.optimizeConversion(service);
          break;
        case 'complete':
          optimizations = await this.optimizeComplete(service);
          break;
        default:
          throw new Error(`Unknown optimization type: ${optimizationType}`);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          currentService: service,
          optimizations: optimizations,
          recommendations: optimizations.recommendations || []
        },
        metadata: {
          processingTime,
          optimizationType,
          autoApplied: false
        },
        note: 'Optimizations suggested but not applied. Use editServiceWithAI to apply.'
      };

    } catch (error) {
      logger.error('Error optimizing service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================
  // OPTIMIZACIONES ESPECÍFICAS
  // ============================================

  /**
   * Optimizar SEO
   */
  async optimizeSEO(service) {
    logger.info('🔍 Optimizing SEO...');

    const prompt = `Analiza y optimiza el SEO de este servicio:

Título actual: ${service.titulo}
Descripción: ${service.descripcion}
Categoría: ${service.categoria}
Etiquetas actuales: ${service.etiquetas?.join(', ') || 'ninguna'}

Proporciona:
1. Título SEO optimizado (max 60 caracteres) - FORMATO NATURAL sin pipe (|)
   - Debe ser una frase completa que combine: servicio + beneficio + valor diferencial
   - Ejemplos: "Declaración Mensual de Renta e IGV con Cumplimiento Garantizado"
   - Usa palabras de acción: Profesional, Especializado, Garantizado, Optimizado
2. Meta descripción optimizada (150-160 caracteres)
3. 5-8 etiquetas/keywords relevantes
4. Sugerencias de mejora SEO

Formato JSON:
{
  "titulo": "título optimizado sin pipe",
  "metaDescription": "meta descripción",
  "etiquetas": ["tag1", "tag2"],
  "suggestions": ["sugerencia 1", "sugerencia 2"]
}`;

    const response = await this.callAI(prompt, 'seo_optimization');
    const seoData = this.parseJSONResponse(response);

    return {
      titulo: seoData.titulo || service.titulo,
      descripcionCorta: seoData.metaDescription,
      etiquetas: seoData.etiquetas || service.etiquetas,
      recommendations: seoData.suggestions || [],
      aiOptimized: ['seo', 'titulo', 'etiquetas']
    };
  }

  /**
   * Optimizar descripción
   */
  async optimizeDescription(service) {
    logger.info('📝 Optimizing description...');

    const prompt = `Mejora esta descripción de servicio para hacerla más atractiva y persuasiva:

Título: ${service.titulo}
Descripción actual: ${service.descripcion}

Mejora la descripción para:
- Ser más clara y específica
- Destacar beneficios sobre características
- Usar lenguaje persuasivo
- Incluir llamadas a la acción
- Mejorar legibilidad
- Mantener tono profesional

Genera solo la descripción mejorada (200-400 palabras).`;

    const optimizedDescription = await this.callAI(prompt, 'description_optimization');

    return {
      descripcion: optimizedDescription.trim(),
      descripcionCorta: optimizedDescription.substring(0, 150) + '...',
      aiOptimized: ['descripcion', 'descripcionCorta'],
      recommendations: [
        'Descripción optimizada para conversión',
        'Mejorado el enfoque en beneficios',
        'Añadidos elementos persuasivos'
      ]
    };
  }

  /**
   * Optimizar estructura
   */
  async optimizeStructure(service) {
    logger.info('🏗️ Optimizing structure...');

    const prompt = `Analiza y mejora la estructura de este servicio:

Título: ${service.titulo}
Características: ${service.caracteristicas?.join(', ') || 'ninguna'}
Beneficios: ${service.beneficios?.join(', ') || 'ninguno'}
Incluye: ${service.incluye?.join(', ') || 'nada especificado'}

Genera una estructura optimizada en JSON:
{
  "caracteristicas": ["característica 1", "característica 2"],
  "beneficios": ["beneficio 1", "beneficio 2"],
  "incluye": ["incluye 1", "incluye 2"],
  "noIncluye": ["no incluye 1"],
  "suggestions": ["sugerencia de mejora"]
}`;

    const response = await this.callAI(prompt, 'structure_optimization');
    const structureData = this.parseJSONResponse(response);

    return {
      caracteristicas: structureData.caracteristicas || service.caracteristicas,
      beneficios: structureData.beneficios || service.beneficios,
      incluye: structureData.incluye || service.incluye,
      noIncluye: structureData.noIncluye || service.noIncluye,
      aiOptimized: ['caracteristicas', 'beneficios', 'incluye', 'noIncluye'],
      recommendations: structureData.suggestions || []
    };
  }

  /**
   * Optimizar para conversión
   */
  async optimizeConversion(service) {
    logger.info('💰 Optimizing for conversion...');

    const prompt = `Analiza este servicio y sugiere mejoras para aumentar la tasa de conversión:

Título: ${service.titulo}
Descripción: ${service.descripcion}
Precio: ${service.precio ? `S/ ${service.precio}` : 'No definido'}
Beneficios: ${service.beneficios?.join(', ') || 'no definidos'}

Proporciona:
1. Mejoras en la propuesta de valor
2. Sugerencias de pricing psychology
3. Elementos de urgencia/escasez
4. Proof elements sugeridos
5. CTAs optimizados

Formato JSON con "suggestions" array.`;

    const response = await this.callAI(prompt, 'conversion_optimization');
    const conversionData = this.parseJSONResponse(response);

    return {
      recommendations: conversionData.suggestions || conversionData,
      conversionTips: [
        'Destacar propuesta de valor única',
        'Añadir elementos de prueba social',
        'Optimizar estructura de pricing',
        'Mejorar llamadas a la acción'
      ]
    };
  }

  /**
   * Optimización completa
   */
  async optimizeComplete(service) {
    logger.info('🎯 Running complete optimization...');

    const seoOpt = await this.optimizeSEO(service);
    const descOpt = await this.optimizeDescription(service);
    const structOpt = await this.optimizeStructure(service);
    const convOpt = await this.optimizeConversion(service);

    return {
      ...seoOpt,
      ...descOpt,
      ...structOpt,
      aiOptimized: [
        ...new Set([
          ...(seoOpt.aiOptimized || []),
          ...(descOpt.aiOptimized || []),
          ...(structOpt.aiOptimized || [])
        ])
      ],
      recommendations: [
        ...(seoOpt.recommendations || []),
        ...(convOpt.recommendations || []),
        ...(structOpt.recommendations || [])
      ]
    };
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  /**
   * Procesar actualizaciones con IA
   */
  async processUpdatesWithAI(service, updates, context) {
    const processed = { ...updates };
    const aiOptimized = [];

    // Si se actualiza la descripción, optimizarla
    if (updates.descripcion && updates.optimizeDescription !== false) {
      logger.info('Optimizing description update with AI...');
      const prompt = `Mejora esta descripción manteniendo la intención del usuario:

Original: ${service.descripcion}
Nueva propuesta: ${updates.descripcion}

Genera una versión optimizada que combine ambas, mejorando claridad y persuasión.`;

      processed.descripcion = await this.callAI(prompt, 'description_update');
      aiOptimized.push('descripcion');
    }

    // Si se actualiza el título, verificar SEO
    if (updates.titulo) {
      const tituloLength = updates.titulo.length;
      if (tituloLength > 60) {
        logger.warn(`Título muy largo (${tituloLength} caracteres). Recomendado: < 60`);
      }
    }

    // Si se actualizan características, validar calidad
    if (updates.caracteristicas && Array.isArray(updates.caracteristicas)) {
      processed.caracteristicas = updates.caracteristicas.filter(c => c && c.trim().length > 0);
    }

    processed.aiOptimized = aiOptimized;
    return processed;
  }

  /**
   * Validar actualizaciones
   */
  validateUpdates(updates) {
    if (updates.titulo && updates.titulo.length < 5) {
      throw new Error('Título muy corto (mínimo 5 caracteres)');
    }

    if (updates.titulo && updates.titulo.length > 100) {
      throw new Error('Título muy largo (máximo 100 caracteres)');
    }

    if (updates.descripcion && updates.descripcion.length > 1000) {
      throw new Error('Descripción muy larga (máximo 1000 caracteres)');
    }

    if (updates.precio && updates.precio < 0) {
      throw new Error('El precio no puede ser negativo');
    }
  }

  /**
   * Llamar a IA
   */
  async callAI(prompt, type = 'general') {
    if (!openaiService.isAvailable()) {
      throw new Error('OpenAI service not available');
    }

    try {
      const response = await openaiService.generateIntelligentResponse(
        `optimizer_${Date.now()}`,
        'ServicesAgent',
        prompt,
        {
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
          contextData: { type }
        }
      );

      return response.content || response.message || response;

    } catch (error) {
      logger.error(`Error calling AI for ${type}:`, error);
      throw error;
    }
  }

  /**
   * Parsear respuesta JSON
   */
  parseJSONResponse(text) {
    try {
      // Intentar extraer JSON del texto
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(text);
    } catch (e) {
      logger.warn('Could not parse AI response as JSON, returning as text');
      return { raw: text };
    }
  }

  /**
   * Actualizar métricas
   */
  updateMetrics(processingTime) {
    const total = this.metrics.servicesEdited;
    if (total > 0) {
      this.metrics.averageTime = 
        (this.metrics.averageTime * (total - 1) + processingTime) / total;
    }
  }

  /**
   * Obtener métricas
   */
  getMetrics() {
    return { ...this.metrics };
  }
}

export default ServicesOptimizer;
