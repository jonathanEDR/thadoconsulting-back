/**
 * ServicesAnalyzer - Analizador de servicios con IA
 * 
 * Responsabilidades:
 * - Analizar servicios individuales (calidad, SEO, completitud)
 * - Analizar portafolio completo
 * - Detectar gaps en el portafolio
 * - Análisis competitivo
 * - Generar insights y recomendaciones
 */

import mongoose from 'mongoose';
import openaiService from '../../../services/OpenAIService.js';
import Servicio from '../../../../models/Servicio.js';
import Categoria from '../../../../models/Categoria.js';
import logger from '../../../../utils/logger.js';

class ServicesAnalyzer {
  constructor(config = {}) {
    this.config = {
      temperature: 0.5, // Baja temperatura para análisis preciso
      maxTokens: config.maxTokens || 1500,
      seoScoreThreshold: config.seoScoreThreshold || 70,
      ...config
    };

    this.metrics = {
      totalAnalyses: 0,
      averageTime: 0
    };

    logger.info('✅ ServicesAnalyzer initialized');
  }

  /**
   * Analizar servicio individual
   */
  async analyzeService(serviceId, options = {}) {
    const startTime = Date.now();
    this.metrics.totalAnalyses++;

    try {
      logger.info(`🔍 Analyzing service: ${serviceId}`);

      // Obtener servicio
      const service = await Servicio.findById(serviceId)
        .populate('categoria', 'nombre slug')
        .lean();

      if (!service) {
        throw new Error('Servicio no encontrado');
      }

      // Análisis base
      const analysis = {
        service: {
          id: service._id,
          titulo: service.titulo,
          categoria: service.categoria?.nombre
        },
        scores: await this.calculateScores(service),
        seoAnalysis: await this.analyzeSEO(service),
        qualityAnalysis: await this.analyzeQuality(service),
        recommendations: []
      };

      // Análisis adicionales según opciones
      if (options.includeCompetitors) {
        analysis.competitiveAnalysis = await this.analyzeCompetitive(service);
      }

      if (options.includePricing) {
        analysis.pricingAnalysis = await this.analyzePricing(service);
      }

      // Generar recomendaciones con IA
      if (options.generateRecommendations !== false) {
        analysis.recommendations = await this.generateRecommendations(service, analysis);
      }

      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime);

      logger.success(`✅ Service analysis completed in ${processingTime}ms`);

      return {
        success: true,
        data: analysis,
        metadata: {
          processingTime,
          depth: options.depth || 'standard'
        }
      };

    } catch (error) {
      logger.error('❌ Error analyzing service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analizar portafolio completo
   */
  async analyzePortfolio(criteria = {}) {
    const startTime = Date.now();

    try {
      logger.info('📊 Analyzing complete portfolio...');

      // Obtener todos los servicios activos
      const services = await Servicio.find({ estado: 'activo' })
        .populate('categoria', 'nombre slug')
        .lean();

      // Estadísticas generales
      const stats = await this.calculatePortfolioStats(services);

      // Análisis de distribución
      const distribution = this.analyzeDistribution(services);

      // Detectar gaps
      const gaps = await this.detectGaps(services);

      // Análisis de pricing
      const pricingAnalysis = this.analyzePricingStrategy(services);

      // Recomendaciones estratégicas
      const recommendations = await this.generatePortfolioRecommendations(
        services,
        stats,
        gaps
      );

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          summary: {
            totalServices: services.length,
            categories: distribution.byCategory.length,
            averageQuality: stats.averageQuality,
            portfolioHealth: stats.healthScore
          },
          stats,
          distribution,
          gaps,
          pricingAnalysis,
          recommendations
        },
        metadata: {
          processingTime,
          servicesAnalyzed: services.length
        }
      };

    } catch (error) {
      logger.error('Error analyzing portfolio:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================
  // ANÁLISIS ESPECÍFICOS
  // ============================================

  /**
   * Calcular scores del servicio
   */
  async calculateScores(service) {
    const scores = {
      overall: 0,
      seo: 0,
      quality: 0,
      completeness: 0,
      conversion: 0
    };

    // SEO Score (0-100)
    scores.seo = this.calculateSEOScore(service);

    // Quality Score (0-100)
    scores.quality = this.calculateQualityScore(service);

    // Completeness Score (0-100)
    scores.completeness = this.calculateCompletenessScore(service);

    // Conversion Potential (0-100)
    scores.conversion = this.calculateConversionScore(service);

    // Overall Score (promedio ponderado)
    scores.overall = Math.round(
      (scores.seo * 0.25) +
      (scores.quality * 0.3) +
      (scores.completeness * 0.25) +
      (scores.conversion * 0.2)
    );

    return scores;
  }

  /**
   * Score SEO
   */
  calculateSEOScore(service) {
    let score = 0;
    const maxScore = 100;

    // Título optimizado (20 puntos)
    if (service.titulo) {
      const titleLength = service.titulo.length;
      if (titleLength >= 30 && titleLength <= 60) score += 20;
      else if (titleLength > 0) score += 10;
    }

    // Descripción (20 puntos)
    if (service.descripcion) {
      const descLength = service.descripcion.length;
      if (descLength >= 150 && descLength <= 300) score += 20;
      else if (descLength > 0) score += 10;
    }

    // Meta descripción corta (15 puntos)
    if (service.descripcionCorta && service.descripcionCorta.length >= 100) {
      score += 15;
    }

    // Etiquetas (15 puntos)
    if (service.etiquetas && service.etiquetas.length >= 3) {
      score += 15;
    } else if (service.etiquetas && service.etiquetas.length > 0) {
      score += 7;
    }

    // Categoría (10 puntos)
    if (service.categoria) score += 10;

    // Contenido rico (10 puntos)
    if (service.descripcionRica && service.descripcionRica.length > 200) {
      score += 10;
    }

    // Imágenes (10 puntos)
    if (service.imagen || (service.imagenes && service.imagenes.length > 0)) {
      score += 10;
    }

    return Math.min(score, maxScore);
  }

  /**
   * Score de calidad
   */
  calculateQualityScore(service) {
    let score = 0;

    // Descripción completa (25 puntos)
    if (service.descripcion && service.descripcion.length >= 200) score += 25;
    else if (service.descripcion) score += 10;

    // Características (20 puntos)
    if (service.caracteristicas && service.caracteristicas.length >= 5) score += 20;
    else if (service.caracteristicas && service.caracteristicas.length > 0) score += 10;

    // Beneficios (20 puntos)
    if (service.beneficios && service.beneficios.length >= 3) score += 20;
    else if (service.beneficios && service.beneficios.length > 0) score += 10;

    // Información de entrega (15 puntos)
    if (service.tiempoEntrega) score += 7;
    if (service.garantia) score += 8;

    // FAQ (10 puntos)
    if (service.faq && service.faq.length >= 3) score += 10;

    // Tecnologías (10 puntos)
    if (service.tecnologias && service.tecnologias.length > 0) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Score de completitud
   */
  calculateCompletenessScore(service) {
    const requiredFields = [
      'titulo', 'descripcion', 'categoria', 'precio',
      'caracteristicas', 'beneficios', 'estado'
    ];

    const optionalFields = [
      'descripcionCorta', 'imagen', 'etiquetas', 'tiempoEntrega',
      'garantia', 'tecnologias', 'incluye', 'noIncluye'
    ];

    let score = 0;

    // Campos requeridos (70% del score)
    const requiredScore = 70 / requiredFields.length;
    requiredFields.forEach(field => {
      if (service[field]) {
        if (Array.isArray(service[field]) && service[field].length > 0) {
          score += requiredScore;
        } else if (!Array.isArray(service[field])) {
          score += requiredScore;
        }
      }
    });

    // Campos opcionales (30% del score)
    const optionalScore = 30 / optionalFields.length;
    optionalFields.forEach(field => {
      if (service[field]) {
        if (Array.isArray(service[field]) && service[field].length > 0) {
          score += optionalScore;
        } else if (!Array.isArray(service[field])) {
          score += optionalScore;
        }
      }
    });

    return Math.round(score);
  }

  /**
   * Score de conversión
   */
  calculateConversionScore(service) {
    let score = 0;

    // Propuesta de valor clara (30 puntos)
    if (service.beneficios && service.beneficios.length >= 3) score += 30;

    // Precio definido (20 puntos)
    if (service.precio || service.precioMin) score += 20;

    // Call to action implícito (20 puntos)
    if (service.requiereContacto !== undefined) score += 10;
    if (service.visibleEnWeb) score += 10;

    // Prueba social / garantía (15 puntos)
    if (service.garantia) score += 15;

    // Urgencia / disponibilidad (15 puntos)
    if (service.destacado) score += 10;
    if (service.tiempoEntrega) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Analizar SEO en detalle
   */
  async analyzeSEO(service) {
    return {
      title: {
        current: service.titulo,
        length: service.titulo?.length || 0,
        optimal: service.titulo?.length >= 30 && service.titulo?.length <= 60,
        issues: this.getTitleIssues(service.titulo)
      },
      description: {
        length: service.descripcion?.length || 0,
        optimal: service.descripcion?.length >= 150 && service.descripcion?.length <= 300,
        issues: this.getDescriptionIssues(service.descripcion)
      },
      keywords: {
        count: service.etiquetas?.length || 0,
        optimal: service.etiquetas?.length >= 3 && service.etiquetas?.length <= 8,
        tags: service.etiquetas || []
      }
    };
  }

  /**
   * Analizar calidad
   */
  async analyzeQuality(service) {
    const issues = [];
    const strengths = [];

    // Revisar descripción
    if (!service.descripcion || service.descripcion.length < 100) {
      issues.push('Descripción muy corta o inexistente');
    } else {
      strengths.push('Descripción completa');
    }

    // Revisar características
    if (!service.caracteristicas || service.caracteristicas.length < 3) {
      issues.push('Pocas características definidas');
    } else {
      strengths.push(`${service.caracteristicas.length} características definidas`);
    }

    // Revisar beneficios
    if (!service.beneficios || service.beneficios.length < 2) {
      issues.push('Pocos beneficios destacados');
    } else {
      strengths.push('Beneficios bien definidos');
    }

    // Revisar pricing
    if (!service.precio && !service.precioMin) {
      issues.push('Precio no definido');
    } else {
      strengths.push('Pricing definido');
    }

    return { issues, strengths };
  }

  /**
   * Análisis competitivo (simplificado)
   */
  async analyzeCompetitive(service) {
    // Obtener servicios similares de la misma categoría
    const similarServices = await Servicio.find({
      categoria: service.categoria,
      _id: { $ne: service._id },
      estado: 'activo'
    })
    .limit(5)
    .lean();

    const comparison = {
      category: service.categoria?.nombre,
      competitorsCount: similarServices.length,
      priceComparison: this.comparePricing(service, similarServices),
      position: 'average' // simplificado
    };

    return comparison;
  }

  /**
   * Análisis de pricing
   */
  async analyzePricing(service) {
    if (!service.precio && !service.precioMin) {
      return {
        defined: false,
        recommendation: 'Definir precio basado en el valor y mercado'
      };
    }

    return {
      defined: true,
      price: service.precio,
      type: service.tipoPrecio,
      currency: service.moneda
    };
  }

  /**
   * Generar recomendaciones con IA
   */
  async generateRecommendations(service, analysis) {
    const prompt = `Como experto en optimización de servicios digitales, analiza este servicio y genera 5 recomendaciones ESPECÍFICAS y ACCIONABLES:

SERVICIO: "${service.titulo}"
CATEGORÍA: ${service.categoria?.nombre || 'No especificada'}
PRECIO: ${service.precio || 'No definido'}

PUNTUACIONES ACTUALES:
- Score General: ${analysis.scores.overall}/100
- Score SEO: ${analysis.scores.seo}/100  
- Score Calidad: ${analysis.scores.quality}/100
- Score Completitud: ${analysis.scores.completeness}/100

PROBLEMAS DETECTADOS:
${analysis.qualityAnalysis.issues.length > 0 ? analysis.qualityAnalysis.issues.join('\n') : '- Sin problemas críticos detectados'}

INSTRUCCIONES:
1. Genera exactamente 5 recomendaciones priorizadas por impacto
2. Cada recomendación debe ser CONCRETA y ESPECÍFICA para este servicio
3. Usa verbos de acción: "Agrega", "Optimiza", "Mejora", "Define", "Incluye"
4. Menciona números específicos cuando sea posible (ej: "añade al menos 3 características")
5. Enfócate en mejoras que aumenten conversión y ventas

EJEMPLO DE FORMATO (usa este estilo):
- Optimiza el título SEO incluyendo la palabra clave principal y una propuesta de valor clara
- Agrega al menos 5 preguntas frecuentes (FAQ) que respondan las dudas más comunes de tus clientes
- Define una estructura de precios con 3 paquetes (básico, profesional, premium) para aumentar opciones

Genera las 5 recomendaciones ahora:`;

    try {
      const aiResponse = await this.callAI(prompt, 'recommendations');
      return this.parseRecommendations(aiResponse);
    } catch (error) {
      logger.warn('Could not generate AI recommendations:', error);
      return this.getFallbackRecommendations(analysis);
    }
  }

  // ============================================
  // ANÁLISIS DE PORTAFOLIO
  // ============================================

  /**
   * Calcular estadísticas del portafolio
   */
  async calculatePortfolioStats(services) {
    const qualityScores = services.map(s => this.calculateQualityScore(s));
    const seoScores = services.map(s => this.calculateSEOScore(s));

    return {
      totalServices: services.length,
      averageQuality: Math.round(
        qualityScores.reduce((a, b) => a + b, 0) / services.length
      ),
      averageSEO: Math.round(
        seoScores.reduce((a, b) => a + b, 0) / services.length
      ),
      healthScore: this.calculatePortfolioHealth(services),
      withPricing: services.filter(s => s.precio || s.precioMin).length,
      featured: services.filter(s => s.destacado).length
    };
  }

  /**
   * Analizar distribución
   */
  analyzeDistribution(services) {
    // Por categoría
    const byCategory = {};
    services.forEach(s => {
      const catName = s.categoria?.nombre || 'Sin categoría';
      byCategory[catName] = (byCategory[catName] || 0) + 1;
    });

    // Por rango de precio
    const byPriceRange = {
      'bajo': services.filter(s => s.precio && s.precio < 500).length,
      'medio': services.filter(s => s.precio && s.precio >= 500 && s.precio < 2000).length,
      'alto': services.filter(s => s.precio && s.precio >= 2000).length,
      'sin_precio': services.filter(s => !s.precio && !s.precioMin).length
    };

    return {
      byCategory: Object.entries(byCategory).map(([name, count]) => ({ name, count })),
      byPriceRange
    };
  }

  /**
   * Detectar gaps
   */
  async detectGaps(services) {
    const gaps = [];

    // Gap de precios
    const withPricing = services.filter(s => s.precio || s.precioMin).length;
    const percentage = (withPricing / services.length) * 100;
    if (percentage < 70) {
      gaps.push({
        type: 'pricing',
        severity: 'high',
        message: `Solo ${Math.round(percentage)}% de servicios tienen precio definido`
      });
    }

    // Gap de SEO
    const avgSEO = services.reduce((sum, s) => 
      sum + this.calculateSEOScore(s), 0) / services.length;
    if (avgSEO < 60) {
      gaps.push({
        type: 'seo',
        severity: 'medium',
        message: `Score SEO promedio bajo: ${Math.round(avgSEO)}/100`
      });
    }

    // Gap de calidad
    const avgQuality = services.reduce((sum, s) => 
      sum + this.calculateQualityScore(s), 0) / services.length;
    if (avgQuality < 50) {
      gaps.push({
        type: 'quality',
        severity: 'high',
        message: `Calidad promedio baja: ${Math.round(avgQuality)}/100`
      });
    }

    return gaps;
  }

  /**
   * Analizar estrategia de pricing
   */
  analyzePricingStrategy(services) {
    const withPrice = services.filter(s => s.precio);
    
    if (withPrice.length === 0) {
      return { strategy: 'undefined', message: 'No hay suficientes datos de pricing' };
    }

    const prices = withPrice.map(s => s.precio);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return {
      strategy: 'mixed',
      average: Math.round(avg),
      range: { min, max },
      distribution: this.getPriceDistribution(prices)
    };
  }

  /**
   * Generar recomendaciones de portafolio
   */
  async generatePortfolioRecommendations(services, stats, gaps) {
    const recommendations = [];

    // Basado en gaps
    gaps.forEach(gap => {
      if (gap.type === 'pricing') {
        recommendations.push('Definir precios para todos los servicios activos');
      }
      if (gap.type === 'seo') {
        recommendations.push('Mejorar optimización SEO del portafolio');
      }
      if (gap.type === 'quality') {
        recommendations.push('Enriquecer descripciones y características');
      }
    });

    // Basado en distribución
    if (stats.featured < services.length * 0.2) {
      recommendations.push('Destacar más servicios estratégicos');
    }

    return recommendations;
  }

  // ============================================
  // UTILIDADES
  // ============================================

  calculatePortfolioHealth(services) {
    const qualityScores = services.map(s => this.calculateQualityScore(s));
    const completeness = services.map(s => this.calculateCompletenessScore(s));
    const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / services.length;
    const avgCompleteness = completeness.reduce((a, b) => a + b, 0) / services.length;
    
    return Math.round((avgQuality + avgCompleteness) / 2);
  }

  getTitleIssues(title) {
    const issues = [];
    if (!title) return ['Título no definido'];
    if (title.length < 30) issues.push('Título muy corto');
    if (title.length > 60) issues.push('Título muy largo para SEO');
    return issues;
  }

  getDescriptionIssues(description) {
    const issues = [];
    if (!description) return ['Descripción no definida'];
    if (description.length < 100) issues.push('Descripción muy corta');
    if (description.length > 500) issues.push('Descripción muy larga');
    return issues;
  }

  comparePricing(service, competitors) {
    if (!service.precio) return { position: 'undefined' };
    
    const prices = competitors
      .filter(c => c.precio)
      .map(c => c.precio);

    if (prices.length === 0) return { position: 'no_data' };

    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    if (service.precio < avg * 0.8) return { position: 'low', avg };
    if (service.precio > avg * 1.2) return { position: 'high', avg };
    return { position: 'competitive', avg };
  }

  getPriceDistribution(prices) {
    return {
      low: prices.filter(p => p < 500).length,
      medium: prices.filter(p => p >= 500 && p < 2000).length,
      high: prices.filter(p => p >= 2000).length
    };
  }

  parseRecommendations(text) {
    const lines = text
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^[-•*\d.]\s*/, '').trim())
      .filter(line => line.length > 10)
      .slice(0, 5);
    
    // Convertir strings simples a objetos estructurados para el frontend
    return lines.map((line, index) => {
      // Inferir prioridad basada en palabras clave
      let priority = 'medium';
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('urgente') || lowerLine.includes('crítico') || lowerLine.includes('importante')) {
        priority = 'high';
      } else if (lowerLine.includes('opcional') || lowerLine.includes('considera') || lowerLine.includes('podría')) {
        priority = 'low';
      }
      
      // Inferir tipo basado en palabras clave
      let type = 'General';
      if (lowerLine.includes('seo') || lowerLine.includes('posicionamiento')) {
        type = 'SEO';
      } else if (lowerLine.includes('precio') || lowerLine.includes('costo')) {
        type = 'Pricing';
      } else if (lowerLine.includes('contenido') || lowerLine.includes('descripción')) {
        type = 'Contenido';
      } else if (lowerLine.includes('imagen') || lowerLine.includes('visual')) {
        type = 'Visual';
      } else if (lowerLine.includes('conversión') || lowerLine.includes('cta')) {
        type = 'Conversión';
      }
      
      // Inferir impacto
      const impacts = ['Alto', 'Medio-Alto', 'Medio', 'Medio-Bajo'];
      const impact = impacts[Math.min(index, impacts.length - 1)];
      
      return {
        type,
        description: line,
        impact,
        priority
      };
    });
  }

  getFallbackRecommendations(analysis) {
    const recs = [];
    
    if (analysis.scores.seo < 60) {
      recs.push({
        type: 'SEO',
        description: 'Optimiza el SEO del servicio: agrega un título descriptivo con palabras clave (máx 60 caracteres), una meta descripción atractiva (máx 160 caracteres) y al menos 5 etiquetas relevantes para mejorar el posicionamiento en buscadores',
        impact: 'Alto',
        priority: 'high'
      });
    }
    
    if (analysis.scores.quality < 60) {
      recs.push({
        type: 'Contenido',
        description: 'Mejora la calidad del contenido escribiendo una descripción completa de al menos 300 palabras que explique claramente qué incluye el servicio, cómo funciona y qué beneficios específicos recibirá el cliente',
        impact: 'Alto',
        priority: 'high'
      });
    }
    
    if (analysis.scores.completeness < 70) {
      recs.push({
        type: 'Visual',
        description: 'Completa la información visual del servicio: agrega una imagen profesional de alta calidad (1200x630px), crea una galería con al menos 3 imágenes de ejemplo y considera agregar un video explicativo de 1-2 minutos',
        impact: 'Medio-Alto',
        priority: 'medium'
      });
    }
    
    if (analysis.scores.conversion < 60) {
      recs.push({
        type: 'Conversión',
        description: 'Fortalece los elementos de conversión: define un precio claro y visible, agrega al menos 5 características específicas que destaquen el valor, incluye 3-5 testimonios de clientes y crea un llamado a la acción (CTA) convincente',
        impact: 'Alto',
        priority: 'high'
      });
    }

    // Recomendaciones adicionales basadas en campos faltantes
    if (!analysis.scores.seo && !analysis.scores.quality) {
      recs.push({
        type: 'General',
        description: 'Establece una base sólida para tu servicio: define claramente qué problema resuelve, para quién está diseñado y cuál es tu propuesta de valor única que te diferencia de la competencia',
        impact: 'Medio',
        priority: 'medium'
      });
    }

    // Asegurar que siempre haya al menos 3 recomendaciones útiles
    if (recs.length < 3) {
      recs.push({
        type: 'Contenido',
        description: 'Añade una sección de Preguntas Frecuentes (FAQ) con al menos 5 preguntas que respondan las dudas más comunes de tus potenciales clientes sobre el servicio, proceso, tiempos y garantías',
        impact: 'Medio',
        priority: 'medium'
      });
    }

    if (recs.length < 4) {
      recs.push({
        type: 'Pricing',
        description: 'Considera crear diferentes paquetes de servicio (básico, estándar, premium) con precios escalonados para atraer a diferentes segmentos de clientes y aumentar el valor promedio de venta',
        impact: 'Medio-Alto',
        priority: 'medium'
      });
    }

    if (recs.length < 5) {
      recs.push({
        type: 'General',
        description: 'Actualiza el servicio regularmente: revisa y mejora el contenido cada 3 meses, actualiza las imágenes con trabajos recientes y mantén los precios competitivos según las tendencias del mercado',
        impact: 'Medio-Bajo',
        priority: 'low'
      });
    }
    
    return recs.slice(0, 5); // Asegurar máximo 5 recomendaciones
  }

  async callAI(prompt, type = 'general') {
    if (!openaiService.isAvailable()) {
      throw new Error('OpenAI not available');
    }

    const response = await openaiService.generateIntelligentResponse(
      `analyzer_${Date.now()}`,
      'ServicesAgent',
      prompt,
      {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      }
    );

    return response.content || response.message || response;
  }

  updateMetrics(processingTime) {
    const count = this.metrics.totalAnalyses;
    this.metrics.averageTime = 
      (this.metrics.averageTime * (count - 1) + processingTime) / count;
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

export default ServicesAnalyzer;
