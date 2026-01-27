/**
 * Configuración del ServicesAgent
 * Define todos los parámetros y opciones configurables del agente
 */

export const SERVICES_AGENT_CONFIG = {
  // ============================================
  // CONFIGURACIÓN DE ANÁLISIS
  // ============================================
  analysis: {
    // Longitud de descripción
    minDescriptionLength: 100,
    optimalDescriptionLength: 300,
    maxDescriptionLength: 1000,
    
    // Scoring
    seoScoreThreshold: 70,
    qualityScoreThreshold: 75,
    completenessThreshold: 80,
    
    // Opciones de análisis
    includeCompetitorAnalysis: true,
    includeSEOAnalysis: true,
    includePricingAnalysis: true,
    includeGapAnalysis: true,
    
    // Profundidad de análisis
    analysisDepth: {
      quick: { maxTime: 5000, detail: 'basic' },
      standard: { maxTime: 15000, detail: 'moderate' },
      thorough: { maxTime: 30000, detail: 'comprehensive' },
      exhaustive: { maxTime: 60000, detail: 'complete' }
    }
  },

  // ============================================
  // CONFIGURACIÓN DE GENERACIÓN
  // ============================================
  generation: {
    // OpenAI
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1,
    frequencyPenalty: 0.1,
    presencePenalty: 0.1,
    
    // Creatividad
    creativityLevel: 'balanced', // 'low', 'balanced', 'high', 'very_high'
    creativityMap: {
      low: 0.3,
      balanced: 0.7,
      high: 0.85,
      very_high: 0.95
    },
    
    // Opciones de generación
    includeExamples: true,
    includeSEOTags: true,
    includeMetadata: true,
    generateMultipleVariations: false,
    variationsCount: 3,
    
    // Validaciones
    validateBeforeCreate: true,
    autoOptimizeSEO: true,
    suggestImprovements: true
  },

  // ============================================
  // CONFIGURACIÓN DE PRICING
  // ============================================
  pricing: {
    // Estrategia
    defaultStrategy: 'value-based', // 'competitive', 'premium', 'penetration', 'value-based'
    
    // Análisis de mercado
    considerMarketRates: true,
    includeCompetitorPricing: true,
    includeValueAnalysis: true,
    
    // Márgenes
    minimumMargin: 20, // Porcentaje
    optimalMargin: 40,
    premiumMargin: 60,
    
    // Descuentos
    suggestDiscounts: true,
    maxDiscountPercentage: 30,
    
    // Paquetes
    bundleDiscount: 15, // Porcentaje de descuento en paquetes
    analyzeBundleOpportunities: true,
    
    // Monedas soportadas
    defaultCurrency: 'PEN',
    supportedCurrencies: ['USD', 'EUR', 'MXN', 'PEN'],
    
    // Tipos de pricing
    pricingTypes: ['fijo', 'desde', 'rango', 'personalizado', 'consultar']
  },

  // ============================================
  // CONFIGURACIÓN DE OPTIMIZACIÓN
  // ============================================
  optimization: {
    // Tipos de optimización
    types: ['seo', 'description', 'structure', 'conversion', 'complete'],
    
    // Auto-optimización
    autoSuggestImprovements: true,
    autoApplyMinorFixes: false, // Por seguridad
    
    // SEO
    includeSEORecommendations: true,
    optimizeMetaTags: true,
    optimizeHeadings: true,
    optimizeKeywords: true,
    
    // Conversión
    includeConversionTips: true,
    includeCTAOptimization: true,
    includeValuePropositionTips: true,
    
    // Contenido
    improveReadability: true,
    improveClarity: true,
    enhanceBenefits: true,
    
    // A/B Testing
    suggestABTests: true,
    generateVariations: true
  },

  // ============================================
  // CONFIGURACIÓN DE CHAT
  // ============================================
  chat: {
    // Contexto
    maxContextLength: 10, // Últimos N mensajes
    includeServiceContext: true,
    includePortfolioContext: true,
    
    // Respuestas
    maxResponseLength: 500,
    includeRecommendations: false, // 🔧 Desactivado: Las recomendaciones vienen del prompt específico
    includeExamples: true,
    includeNextSteps: false, // 🔧 Desactivado para conversaciones más naturales
    
    // Personalización
    adaptToUserExpertise: true,
    rememberPreferences: true,
    
    // Sugerencias
    suggestActions: true,
    suggestQuestions: true
  },

  // ============================================
  // CONFIGURACIÓN DE PERMISOS
  // ============================================
  permissions: {
    // Creación
    canCreateServices: true,
    canCreatePackages: true,
    
    // Edición
    canEditServices: true,
    canEditPackages: true,
    canEditPricing: true,
    canEditSEO: true,
    
    // Eliminación (deshabilitado por seguridad)
    canDeleteServices: false,
    canDeletePackages: false,
    
    // Publicación
    canPublishServices: false, // Requiere aprobación manual
    canUnpublishServices: false,
    
    // Pricing
    canManagePricing: true,
    canSuggestDiscounts: true,
    
    // Análisis
    canAccessAnalytics: true,
    canViewCompetitors: true
  },

  // ============================================
  // CONFIGURACIÓN DE CACHÉ
  // ============================================
  cache: {
    enabled: true,
    ttl: 600000, // 10 minutos
    maxSize: 100,
    
    // Tipos de caché
    cacheAnalysis: true,
    cacheOptimizations: true,
    cacheGenerations: false, // Para evitar repeticiones
    cachePricingSuggestions: true
  },

  // ============================================
  // CONFIGURACIÓN DE MÉTRICAS
  // ============================================
  metrics: {
    enabled: true,
    trackUsage: true,
    trackPerformance: true,
    trackSuccessRate: true,
    
    // Alertas
    alertOnErrors: true,
    alertOnSlowPerformance: true,
    performanceThreshold: 5000, // ms
    
    // Reportes
    generateDailyReport: false,
    generateWeeklyReport: false
  },

  // ============================================
  // CONFIGURACIÓN DE VALIDACIÓN
  // ============================================
  validation: {
    // Campos requeridos para servicios
    requiredFields: ['titulo', 'descripcion', 'categoria'],
    
    // Validaciones de contenido
    validateURLs: true,
    validateEmails: true,
    validatePhones: true,
    
    // Validaciones de negocio
    validatePricing: true,
    validateCategories: true,
    validateTags: true,
    
    // Seguridad
    sanitizeInput: true,
    preventXSS: true,
    preventSQLInjection: true
  },

  // ============================================
  // CONFIGURACIÓN DE FORMATO
  // ============================================
  formatting: {
    // Idioma por defecto
    defaultLanguage: 'es-ES',
    
    // Formato de respuestas
    responseFormat: 'structured', // 'text', 'structured', 'markdown', 'json'
    
    // Formato de precios
    currencyDisplay: 'symbol', // 'symbol', 'code', 'name'
    decimalPlaces: 2,
    
    // Formato de fechas
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    
    // Formato de números
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },

  // ============================================
  // CONFIGURACIÓN DE INTEGRACIÓN
  // ============================================
  integration: {
    // OpenAI
    openai: {
      model: 'gpt-4o',
      fallbackModel: 'gpt-3.5-turbo',
      timeout: 30000,
      retryAttempts: 3
    },
    
    // Cloudinary (si aplica)
    cloudinary: {
      enabled: true,
      autoUpload: false
    },
    
    // Email (para notificaciones)
    email: {
      enabled: false,
      notifyOnCreation: false,
      notifyOnErrors: false
    }
  }
};

// Exportar también funciones de utilidad para configuración

/**
 * Obtener configuración de creatividad
 */
export function getCreativityConfig(level) {
  const temperature = SERVICES_AGENT_CONFIG.generation.creativityMap[level] || 0.7;
  return {
    temperature,
    topP: temperature > 0.8 ? 0.95 : 1,
    frequencyPenalty: temperature > 0.8 ? 0.2 : 0.1
  };
}

/**
 * Obtener configuración de análisis por profundidad
 */
export function getAnalysisConfig(depth = 'standard') {
  return SERVICES_AGENT_CONFIG.analysis.analysisDepth[depth] || 
         SERVICES_AGENT_CONFIG.analysis.analysisDepth.standard;
}

/**
 * Validar y combinar configuración personalizada
 */
export function mergeConfig(customConfig = {}) {
  return {
    ...SERVICES_AGENT_CONFIG,
    ...customConfig,
    // Mergear objetos anidados
    analysis: { ...SERVICES_AGENT_CONFIG.analysis, ...(customConfig.analysis || {}) },
    generation: { ...SERVICES_AGENT_CONFIG.generation, ...(customConfig.generation || {}) },
    pricing: { ...SERVICES_AGENT_CONFIG.pricing, ...(customConfig.pricing || {}) },
    optimization: { ...SERVICES_AGENT_CONFIG.optimization, ...(customConfig.optimization || {}) },
    chat: { ...SERVICES_AGENT_CONFIG.chat, ...(customConfig.chat || {}) },
    permissions: { ...SERVICES_AGENT_CONFIG.permissions, ...(customConfig.permissions || {}) }
  };
}

export default SERVICES_AGENT_CONFIG;
