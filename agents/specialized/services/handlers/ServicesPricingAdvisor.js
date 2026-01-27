/**
 * ServicesPricingAdvisor - Asesor de estrategias de pricing con IA
 * 
 * Responsabilidades:
 * - Sugerir precios basados en valor y mercado
 * - Analizar estrategias de pricing
 * - Recomendar descuentos y promociones
 * - Optimizar pricing de paquetes
 * - Análisis de márgenes y rentabilidad
 */

import mongoose from 'mongoose';
import openaiService from '../../../services/OpenAIService.js';
import Servicio from '../../../../models/Servicio.js';
import PaqueteServicio from '../../../../models/PaqueteServicio.js';
import logger from '../../../../utils/logger.js';

class ServicesPricingAdvisor {
  constructor(config = {}) {
    this.config = {
      temperature: 0.4, // Baja temperatura para análisis numérico preciso
      maxTokens: config.maxTokens || 1500,
      defaultMargin: config.defaultMargin || 40, // 40% margen por defecto
      ...config
    };

    this.metrics = {
      totalSuggestions: 0,
      averageTime: 0
    };

    logger.info('✅ ServicesPricingAdvisor initialized');
  }

  /**
   * Sugerir pricing para un servicio
   */
  async suggestPricing(serviceData, marketData = {}) {
    const startTime = Date.now();
    this.metrics.totalSuggestions++;

    try {
      logger.info('💰 Generating pricing suggestion...');

      // Análisis de mercado
      const marketAnalysis = await this.analyzeMarket(serviceData, marketData);

      // Calcular precio base
      const basePrice = this.calculateBasePrice(serviceData, marketAnalysis);

      // Generar estrategias
      const strategies = await this.generatePricingStrategies(
        serviceData,
        basePrice,
        marketAnalysis
      );

      // Recomendación final con IA
      const recommendation = await this.generateAIRecommendation(
        serviceData,
        strategies,
        marketAnalysis
      );

      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime);

      logger.success(`✅ Pricing suggestion generated in ${processingTime}ms`);

      return {
        success: true,
        data: {
          recommended: recommendation.price,
          range: recommendation.range,
          strategies,
          marketAnalysis,
          reasoning: recommendation.reasoning
        },
        metadata: {
          processingTime,
          confidence: recommendation.confidence || 'medium'
        }
      };

    } catch (error) {
      logger.error('❌ Error suggesting pricing:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analizar pricing actual
   */
  async analyzePricing(serviceId, marketData = {}) {
    try {
      logger.info(`📊 Analyzing current pricing for service ${serviceId}...`);

      const service = await Servicio.findById(serviceId).lean();
      if (!service) {
        throw new Error('Servicio no encontrado');
      }

      if (!service.precio && !service.precioMin) {
        return {
          success: false,
          message: 'Servicio sin precio definido',
          suggestion: await this.suggestPricing(service, marketData)
        };
      }

      // Obtener servicios similares para comparación
      const similarServices = await this.getSimilarServices(service);

      // Análisis
      const analysis = {
        current: {
          price: service.precio,
          type: service.tipoPrecio,
          currency: service.moneda
        },
        marketPosition: this.analyzeMarketPosition(service, similarServices),
        competitiveness: this.analyzeCompetitiveness(service, similarServices),
        recommendations: []
      };

      // Generar recomendaciones
      analysis.recommendations = await this.generatePricingRecommendations(
        service,
        analysis
      );

      return {
        success: true,
        data: analysis
      };

    } catch (error) {
      logger.error('Error analyzing pricing:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Optimizar pricing de paquetes
   */
  async optimizePackagePricing(packages) {
    try {
      logger.info('📦 Optimizing package pricing...');

      if (!packages || packages.length === 0) {
        throw new Error('No packages provided');
      }

      const optimized = packages.map((pkg, index) => {
        const tier = this.determineTier(index, packages.length);
        const discount = this.calculatePackageDiscount(tier);
        const optimizedPrice = this.optimizeTierPrice(pkg, tier, packages);

        return {
          ...pkg,
          suggestedPrice: optimizedPrice,
          discount,
          tier,
          reasoning: this.getPricingReasoning(tier, discount)
        };
      });

      return {
        success: true,
        data: {
          packages: optimized,
          strategy: 'tiered_pricing',
          totalValue: this.calculateTotalValue(optimized)
        }
      };

    } catch (error) {
      logger.error('Error optimizing package pricing:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sugerir estrategia de bundling
   */
  async suggestBundleStrategy(services) {
    try {
      logger.info('🎁 Suggesting bundle strategy...');

      // Analizar servicios complementarios
      const bundles = this.identifyComplementaryServices(services);

      // Calcular pricing óptimo para bundles
      const pricedBundles = bundles.map(bundle => {
        const totalPrice = bundle.services.reduce((sum, s) => sum + (s.precio || 0), 0);
        const bundleDiscount = 15; // 15% descuento por bundle
        const bundlePrice = Math.round(totalPrice * (1 - bundleDiscount / 100));

        return {
          ...bundle,
          individualPrice: totalPrice,
          bundlePrice,
          savings: totalPrice - bundlePrice,
          discountPercentage: bundleDiscount
        };
      });

      return {
        success: true,
        data: {
          bundles: pricedBundles,
          strategy: 'complementary_bundling',
          potentialRevenue: this.calculateBundleRevenue(pricedBundles)
        }
      };

    } catch (error) {
      logger.error('Error suggesting bundle strategy:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================
  // MÉTODOS DE ANÁLISIS
  // ============================================

  /**
   * Analizar mercado
   */
  async analyzeMarket(serviceData, marketData) {
    // Obtener servicios similares si no se proporcionaron datos de mercado
    if (!marketData.competitors || marketData.competitors.length === 0) {
      const similar = await Servicio.find({
        categoria: serviceData.categoria,
        estado: 'activo',
        precio: { $exists: true, $gt: 0 }
      })
      .limit(10)
      .lean();

      marketData.competitors = similar;
    }

    const prices = marketData.competitors
      .filter(c => c.precio)
      .map(c => c.precio);

    if (prices.length === 0) {
      return {
        available: false,
        message: 'No hay datos de mercado disponibles'
      };
    }

    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return {
      available: true,
      competitorsCount: prices.length,
      average: Math.round(avg),
      range: { min, max },
      median: this.calculateMedian(prices)
    };
  }

  /**
   * Calcular precio base
   */
  calculateBasePrice(serviceData, marketAnalysis) {
    // Si hay datos de mercado, usarlos como referencia
    if (marketAnalysis.available) {
      return marketAnalysis.average;
    }

    // Si no, estimar basado en complejidad/tiempo
    const estimatedHours = serviceData.estimatedHours || 40;
    const hourlyRate = 50; // S/ 50 por hora base
    
    return estimatedHours * hourlyRate;
  }

  /**
   * Generar estrategias de pricing
   */
  async generatePricingStrategies(serviceData, basePrice, marketAnalysis) {
    const strategies = [];

    // Estrategia 1: Competitiva (basada en mercado)
    if (marketAnalysis.available) {
      strategies.push({
        name: 'competitive',
        label: 'Precio Competitivo',
        price: marketAnalysis.average,
        description: 'Alineado con el promedio del mercado',
        pros: ['Competitivo', 'Fácil de justificar'],
        cons: ['Puede limitar márgenes']
      });
    }

    // Estrategia 2: Premium (20% sobre mercado)
    if (marketAnalysis.available) {
      const premiumPrice = Math.round(marketAnalysis.average * 1.2);
      strategies.push({
        name: 'premium',
        label: 'Precio Premium',
        price: premiumPrice,
        description: 'Posicionamiento de alta calidad',
        pros: ['Mejores márgenes', 'Percepción de calidad'],
        cons: ['Requiere diferenciación clara']
      });
    }

    // Estrategia 3: Penetración (15% bajo mercado)
    if (marketAnalysis.available) {
      const penetrationPrice = Math.round(marketAnalysis.average * 0.85);
      strategies.push({
        name: 'penetration',
        label: 'Precio de Penetración',
        price: penetrationPrice,
        description: 'Para capturar cuota de mercado',
        pros: ['Atractivo para nuevos clientes', 'Competitivo'],
        cons: ['Márgenes reducidos']
      });
    }

    // Estrategia 4: Valor (basado en beneficios)
    const valuePrice = this.calculateValueBasedPrice(serviceData);
    strategies.push({
      name: 'value-based',
      label: 'Precio por Valor',
      price: valuePrice,
      description: 'Basado en el valor entregado al cliente',
      pros: ['Justificado por beneficios', 'Flexibilidad'],
      cons: ['Requiere comunicación clara del valor']
    });

    return strategies;
  }

  /**
   * Generar recomendación con IA
   */
  async generateAIRecommendation(serviceData, strategies, marketAnalysis) {
    const prompt = `Como experto en pricing de servicios tecnológicos, recomienda el mejor precio para:

Servicio: ${serviceData.titulo || 'Servicio sin nombre'}
${serviceData.descripcion ? `Descripción: ${serviceData.descripcion.substring(0, 200)}` : ''}

Estrategias disponibles:
${strategies.map(s => `- ${s.label}: S/ ${s.price} (${s.description})`).join('\n')}

Datos de mercado:
${marketAnalysis.available ? `Promedio: S/ ${marketAnalysis.average}, Rango: S/ ${marketAnalysis.range.min} - S/ ${marketAnalysis.range.max}` : 'No disponible'}

Recomienda:
1. El precio óptimo (un número)
2. Rango recomendado (min-max)
3. Breve justificación (1-2 líneas)

Formato: JSON con {price, min, max, reasoning}`;

    try {
      const response = await this.callAI(prompt, 'pricing_recommendation');
      const parsed = this.parseAIResponse(response);

      return {
        price: parsed.price || strategies[0]?.price || 1000,
        range: {
          min: parsed.min || parsed.price * 0.9,
          max: parsed.max || parsed.price * 1.1
        },
        reasoning: parsed.reasoning || 'Basado en análisis de mercado y valor',
        confidence: 'medium'
      };

    } catch (error) {
      logger.warn('Could not generate AI recommendation, using fallback');
      return this.getFallbackRecommendation(strategies);
    }
  }

  /**
   * Obtener servicios similares
   */
  async getSimilarServices(service) {
    return await Servicio.find({
      categoria: service.categoria,
      _id: { $ne: service._id },
      estado: 'activo',
      precio: { $exists: true, $gt: 0 }
    })
    .limit(10)
    .lean();
  }

  /**
   * Analizar posición en mercado
   */
  analyzeMarketPosition(service, similarServices) {
    if (!service.precio || similarServices.length === 0) {
      return { position: 'undefined' };
    }

    const prices = similarServices.map(s => s.precio);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    if (service.precio < avg * 0.8) return { position: 'low', percentile: 25 };
    if (service.precio < avg) return { position: 'below_average', percentile: 40 };
    if (service.precio < avg * 1.2) return { position: 'average', percentile: 50 };
    if (service.precio < avg * 1.5) return { position: 'above_average', percentile: 75 };
    return { position: 'premium', percentile: 90 };
  }

  /**
   * Analizar competitividad
   */
  analyzeCompetitiveness(service, similarServices) {
    if (!service.precio) {
      return { competitive: false, reason: 'No price defined' };
    }

    const prices = similarServices.map(s => s.precio);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    const diff = ((service.precio - avg) / avg) * 100;

    return {
      competitive: Math.abs(diff) < 20,
      difference: Math.round(diff),
      recommendation: diff > 20 ? 'Considerar reducir precio' : 
                      diff < -20 ? 'Oportunidad de aumentar precio' : 
                      'Precio competitivo'
    };
  }

  /**
   * Generar recomendaciones de pricing
   */
  async generatePricingRecommendations(service, analysis) {
    const recs = [];

    if (analysis.marketPosition.position === 'premium') {
      recs.push('Justificar precio premium con valor diferenciado');
    }

    if (analysis.marketPosition.position === 'low') {
      recs.push('Considerar aumentar precio para mejorar percepción de valor');
    }

    if (analysis.competitiveness.difference > 30) {
      recs.push('Precio significativamente alto vs. competencia');
    }

    if (analysis.competitiveness.difference < -30) {
      recs.push('Precio bajo - evaluar si refleja el valor real');
    }

    return recs;
  }

  // ============================================
  // UTILIDADES
  // ============================================

  calculateValueBasedPrice(serviceData) {
    // Precio base por complejidad
    let baseValue = 1000;

    // Ajustar por características
    if (serviceData.caracteristicas && serviceData.caracteristicas.length > 5) {
      baseValue += 500;
    }

    // Ajustar por tecnologías
    if (serviceData.tecnologias && serviceData.tecnologias.length > 3) {
      baseValue += 300;
    }

    // Ajustar por tiempo de entrega
    if (serviceData.duracion && serviceData.duracion.valor) {
      baseValue += serviceData.duracion.valor * 100;
    }

    return Math.round(baseValue);
  }

  determineTier(index, total) {
    if (total === 1) return 'standard';
    if (total === 2) return index === 0 ? 'basic' : 'premium';
    if (total === 3) return ['basic', 'standard', 'premium'][index];
    return index === 0 ? 'basic' : index === total - 1 ? 'premium' : 'standard';
  }

  calculatePackageDiscount(tier) {
    const discounts = {
      basic: 0,
      standard: 10,
      premium: 15
    };
    return discounts[tier] || 10;
  }

  optimizeTierPrice(pkg, tier, allPackages) {
    const basePrice = pkg.precio || 1000;
    const multipliers = {
      basic: 0.7,
      standard: 1.0,
      premium: 1.5
    };
    
    return Math.round(basePrice * (multipliers[tier] || 1));
  }

  getPricingReasoning(tier, discount) {
    const reasons = {
      basic: 'Precio accesible para comenzar',
      standard: 'Mejor relación valor-precio',
      premium: 'Máximo valor y funcionalidades'
    };
    return reasons[tier] || 'Precio optimizado';
  }

  calculateMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  identifyComplementaryServices(services) {
    // Simplificado: agrupar por categoría
    const byCategory = {};
    services.forEach(s => {
      const cat = s.categoria?.toString() || 'other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(s);
    });

    return Object.values(byCategory)
      .filter(group => group.length >= 2)
      .slice(0, 3)
      .map((group, i) => ({
        id: `bundle_${i + 1}`,
        name: `Paquete ${group[0].categoria?.nombre || 'Servicios'}`,
        services: group.slice(0, 3)
      }));
  }

  calculateTotalValue(packages) {
    return packages.reduce((sum, pkg) => sum + (pkg.suggestedPrice || 0), 0);
  }

  calculateBundleRevenue(bundles) {
    return bundles.reduce((sum, bundle) => sum + bundle.bundlePrice, 0);
  }

  parseAIResponse(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(text);
    } catch (e) {
      return {};
    }
  }

  getFallbackRecommendation(strategies) {
    const competitive = strategies.find(s => s.name === 'competitive');
    return {
      price: competitive?.price || strategies[0]?.price || 1000,
      range: {
        min: (competitive?.price || 1000) * 0.9,
        max: (competitive?.price || 1000) * 1.1
      },
      reasoning: 'Basado en promedio de mercado',
      confidence: 'low'
    };
  }

  async callAI(prompt, type = 'general') {
    if (!openaiService.isAvailable()) {
      throw new Error('OpenAI not available');
    }

    const response = await openaiService.generateIntelligentResponse(
      `pricing_${Date.now()}`,
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
    const count = this.metrics.totalSuggestions;
    this.metrics.averageTime = 
      (this.metrics.averageTime * (count - 1) + processingTime) / count;
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

export default ServicesPricingAdvisor;
