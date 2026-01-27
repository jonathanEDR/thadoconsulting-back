/**
 * OpenAI Service MEJORADO - Gestión inteligente de contexto y tokens
 * Sistema avanzado de optimización y personalización para agentes AI
 */

import axios from 'axios';
import contextManager from '../context/AgentContextManager.js';
import personalitySystem from '../context/AgentPersonalitySystem.js';
import dynamicPromptSystem from '../context/DynamicPromptSystem.js';
import intelligentMemorySystem from '../memory/IntelligentMemorySystem.js';
import logger from '../../utils/logger.js';

class OpenAIService {
  constructor() {
    // NO asignar apiKey aquí - hacerlo dinámicamente en getApiKey()
    this.baseURL = 'https://api.openai.com/v1';
    this.model = 'gpt-3.5-turbo'; // 🔥 CAMBIO: Usar modelo más económico por defecto
    
    // 🆕 OPTIMIZACIÓN DE COSTOS: Modelos según complejidad
    this.modelsByComplexity = {
      'simple': 'gpt-3.5-turbo',      // $0.50/$1.50 per 1M tokens (barato)
      'medium': 'gpt-3.5-turbo',      // Para tareas estándar
      'complex': 'gpt-4o-mini',       // $0.15/$0.60 per 1M tokens (más barato que gpt-4)
      'premium': 'gpt-4o'             // Solo para casos muy específicos
    };
    
    // Configuración inteligente por defecto
    this.defaultConfig = {
      temperature: 0.7,
      max_tokens: 1500, // 🔥 REDUCIDO: de 2000 a 1500 para ahorrar costos
      top_p: 1,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    };

    // Sistema de caché inteligente
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutos
    this.cachePriority = new Map(); // Prioridad de caché
    
    // 🆕 Sistema de rate limiting local
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.lastRequestTime = 0;
    this.minRequestInterval = 2000; // 2 segundos mínimo entre peticiones
    this.maxConcurrentRequests = 3; // Máximo 3 peticiones concurrentes
    this.currentRequests = 0;
    
    // Métricas y optimización
    this.metrics = {
      totalRequests: 0,
      cachedResponses: 0,
      tokensSaved: 0,
      averageResponseTime: 0,
      errorRate: 0,
      costOptimization: 0,
      queuedRequests: 0,
      rateLimitHits: 0
    };

    // Configuración de límites de tokens
    this.tokenLimits = {
      'gpt-4o': 128000,
      'gpt-4-turbo': 128000,
      'gpt-4': 8192,
      'gpt-3.5-turbo': 16384
    };

    // Sistema de fallback
    this.fallbackStrategies = new Map();
    this.initializeFallbackStrategies();

    logger.success('🤖 Enhanced OpenAI Service initialized with intelligent context management');
  }

  /**
   * Obtener API key dinámicamente (permite cambios en runtime)
   */
  getApiKey() {
    return process.env.OPENAI_API_KEY;
  }

  /**
   * 🆕 Seleccionar modelo óptimo según complejidad para ahorrar costos
   */
  selectOptimalModel(contentType, tokenCount = 0) {
    // Determinar complejidad basada en el tipo de contenido
    const simpleTypes = ['title', 'short_description', 'simple_features'];
    const mediumTypes = ['description', 'features', 'benefits', 'faq'];
    const complexTypes = ['unified_service', 'bulk_content_generation', 'complete_content'];
    
    let complexity = 'medium'; // Por defecto
    
    if (simpleTypes.includes(contentType)) {
      complexity = 'simple';
    } else if (complexTypes.includes(contentType)) {
      complexity = 'complex';
    }
    
    // Si hay muchos tokens, usar modelo más potente
    if (tokenCount > 3000) {
      complexity = 'complex';
    }
    
    const selectedModel = this.modelsByComplexity[complexity];
    logger.info(`🎯 Selected model: ${selectedModel} (complexity: ${complexity}, type: ${contentType})`);
    
    return selectedModel;
  }

  /**
   * 🆕 Calcular límite de tokens según modelo para optimizar costos
   */
  getOptimalTokenLimit(model, contentType) {
    const baseLimits = {
      'gpt-3.5-turbo': 1200,   // Económico pero efectivo
      'gpt-4o-mini': 1800,     // Mejor calidad, precio medio
      'gpt-4o': 2500           // Máxima calidad (solo cuando es necesario)
    };
    
    // Ajustar según tipo de contenido
    const typeMultipliers = {
      'title': 0.3,                    // Títulos cortos
      'short_description': 0.5,        // Descripciones breves
      'description': 0.8,              // Descripciones estándar
      'features': 1.0,                 // Características normales
      'benefits': 1.0,                 // Beneficios normales
      'faq': 1.2,                      // FAQ necesita más espacio
      'unified_service': 1.5,          // Contenido unificado extenso
      'bulk_content_generation': 1.8   // Generación masiva
    };
    
    const baseLimit = baseLimits[model] || baseLimits['gpt-3.5-turbo'];
    const multiplier = typeMultipliers[contentType] || 1.0;
    const optimalLimit = Math.round(baseLimit * multiplier);
    
    logger.info(`💰 Optimal token limit: ${optimalLimit} (base: ${baseLimit}, multiplier: ${multiplier}x)`);
    
    return optimalLimit;
  }

  /**
   * Verificar si OpenAI está disponible
   */
  isAvailable() {
    const apiKey = this.getApiKey();
    return !!apiKey;
  }

  /**
   * Generar respuesta inteligente con contexto personalizado
   */
  async generateIntelligentResponse(sessionId, agentName, userMessage, taskContext = {}) {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      if (!this.isAvailable()) {
        return await this.handleFallback(agentName, userMessage, taskContext);
      }

      // Obtener contexto completo del agente
      const contextData = await contextManager.generateOptimizedContext(sessionId, agentName, taskContext);
      const agentProfile = await personalitySystem.getAgentProfile(agentName);
      
      // Construir mensajes optimizados
      const messages = await this.buildOptimizedMessages(
        contextData, 
        agentProfile, 
        userMessage, 
        taskContext
      );

      // Verificar caché inteligente (deshabilitado para ServicesAgent, pero habilitado en rate limits)
      const cacheKey = this.generateSmartCacheKey(messages, agentName);
      let cached = null;
      
      // Estrategia especial: usar caché temporal si hemos tenido rate limits recientes
      const hasRecentRateLimits = this.metrics.rateLimitHits > 0 && Date.now() - this.lastRequestTime < 300000; // 5 minutos
      
      // 🔧 Identificar agentes de ventas (ServicesAgent o "Asesor de Ventas SCUTI")
      const isSalesAgent = agentName.includes('ServicesAgent') || agentName.includes('Asesor de Ventas') || agentName.includes('SCUTI');
      
      if (hasRecentRateLimits && isSalesAgent) {
        cached = this.getFromSmartCache(cacheKey);
        if (cached) {
          logger.info('🎯 Using emergency cache due to recent rate limits');
          this.metrics.cachedResponses++;
          return cached;
        }
      }
      
      // 🔧 CRÍTICO: Respetar disableCache del contexto
      const cacheDisabled = taskContext.disableCache === true;
      
      // No usar caché para agentes de ventas o si está explícitamente deshabilitado
      if (cacheDisabled || isSalesAgent) {
        if (cacheDisabled) {
          logger.info('🚫 Cache explicitly disabled by caller - generating fresh content');
        } else {
          logger.info('🚫 Cache disabled for Sales Agent - generating fresh content');
        }
      } else if (!agentName.includes('generator_')) {
        cached = this.getFromSmartCache(cacheKey);
        if (cached) {
          logger.info('🎯 Using intelligent cached response');
          this.metrics.cachedResponses++;
          return cached;
        }
      }

      // Configurar parámetros según perfil del agente
      const requestConfig = this.buildRequestConfig(agentProfile, taskContext);
      requestConfig.messages = messages;

      // Validar límite de tokens
      const tokenCount = this.estimateTokenCount(messages);
      if (tokenCount > this.getTokenLimit(requestConfig.model) * 0.9) {
        logger.warn(`⚠️  Token count (${tokenCount}) approaching limit, optimizing...`);
        requestConfig.messages = await this.optimizeMessagesForTokens(messages, requestConfig.model);
      }

      logger.info(`🤖 Calling OpenAI API for ${agentName} (${tokenCount} tokens)`);
      
      if (!this.isAvailable()) {
        throw new Error('OpenAI API key no disponible');
      }
      
      const response = await this.callOpenAI(requestConfig);
      
      // Procesar y personalizar respuesta
      const processedResponse = await this.processIntelligentResponse(
        response, 
        agentProfile, 
        contextData, 
        taskContext
      );

      // Actualizar contexto y métricas
      await this.updateContextAndMetrics(sessionId, agentName, userMessage, processedResponse, startTime);

      // Guardar en caché inteligente (NO cachear si está deshabilitado o es agente de ventas)
      const shouldCache = !taskContext.disableCache && 
                          !isSalesAgent && 
                          !agentName.includes('generator_') || 
                          (isSalesAgent && this.metrics.rateLimitHits > 0);
      
      if (shouldCache) {
        this.saveToSmartCache(cacheKey, processedResponse, agentProfile);
        if (isSalesAgent) {
          logger.info('💾 Emergency cache save for Sales Agent due to rate limits');
        } else {
          logger.info('💾 Response cached for future use');
        }
      } else {
        logger.info('🚫 Cache save skipped for ServicesAgent');
      }

      return processedResponse;

    } catch (error) {
      this.metrics.errorRate = (this.metrics.errorRate + 1) / this.metrics.totalRequests;
      logger.error('❌ Intelligent response generation failed:', error.message);
      
      // Intentar estrategia de fallback
      return await this.handleFallback(agentName, userMessage, taskContext, error);
    }
  }

  /**
   * Construir mensajes avanzados con todos los sistemas integrados
   */
  async buildAdvancedOptimizedMessages(userMessage, dynamicPrompt, contextData, agentProfile, intelligentContext, options = {}) {
    const messages = [];

    try {
      // 1. Prompt dinámico del sistema con personalidad e inteligencia
      let systemContent = dynamicPrompt.content;
      
      // Aplicar adaptaciones del usuario si están disponibles
      if (intelligentContext.user.adaptations) {
        systemContent = this.applyUserAdaptations(systemContent, intelligentContext.user.adaptations);
      }
      
      messages.push({
        role: 'system',
        content: systemContent
      });

      // 2. Contexto de conversación optimizado
      if (contextData.conversationHistory && contextData.conversationHistory.length > 0) {
        const optimizedHistory = await this.optimizeConversationHistory(
          contextData.conversationHistory,
          intelligentContext.user.preferences
        );
        
        messages.push(...optimizedHistory);
      }

      // 3. Contexto adicional si está disponible
      if (contextData.additionalContext && Object.keys(contextData.additionalContext).length > 0) {
        const contextString = this.formatAdditionalContext(contextData.additionalContext);
        messages.push({
          role: 'system',
          content: `CONTEXTO ADICIONAL:\n${contextString}`
        });
      }

      // 4. Mensaje del usuario con mejoras inteligentes
      const enhancedUserMessage = this.enhanceUserMessage(userMessage, intelligentContext, options);
      messages.push({
        role: 'user',
        content: enhancedUserMessage
      });

      return messages;
      
    } catch (error) {
      logger.error('❌ Error building advanced optimized messages:', error);
      return this.buildFallbackMessages(userMessage, agentProfile);
    }
  }

  /**
   * Aplicar adaptaciones del usuario al contenido
   */
  applyUserAdaptations(content, adaptations) {
    let adaptedContent = content;
    
    // Adaptaciones de comunicación
    adaptations.communication?.forEach(adaptation => {
      switch (adaptation) {
        case 'use_formal_language':
          adaptedContent += '\n\n⚠️  IMPORTANTE: Utiliza un lenguaje formal y profesional en toda la respuesta.';
          break;
        case 'use_casual_tone':
          adaptedContent += '\n\n💬 NOTA: Mantén un tono casual y amigable en la comunicación.';
          break;
        case 'include_technical_details':
          adaptedContent += '\n\n🔧 ENFOQUE: Incluye detalles técnicos específicos y explicaciones profundas.';
          break;
      }
    });

    // Adaptaciones de contenido
    adaptations.content?.forEach(adaptation => {
      switch (adaptation) {
        case 'include_practical_examples':
          adaptedContent += '\n\n📝 REQUERIMIENTO: Incluye ejemplos prácticos y casos de uso reales.';
          break;
        case 'include_performance_metrics':
          adaptedContent += '\n\n📊 MÉTRICAS: Proporciona métricas de rendimiento y KPIs relevantes.';
          break;
        case 'prioritize_quick_implementations':
          adaptedContent += '\n\n⚡ PRIORIDAD: Enfócate en soluciones rápidas de implementar (quick wins).';
          break;
      }
    });

    // Adaptaciones de estructura
    adaptations.structure?.forEach(adaptation => {
      switch (adaptation) {
        case 'use_concise_format':
          adaptedContent += '\n\n📋 FORMATO: Mantén respuestas concisas y directas al punto.';
          break;
        case 'use_detailed_format':
          adaptedContent += '\n\n📚 FORMATO: Proporciona análisis detallado y exhaustivo.';
          break;
      }
    });

    return adaptedContent;
  }

  /**
   * Optimizar historial de conversación basado en preferencias
   */
  async optimizeConversationHistory(history, userPreferences) {
    const optimized = [];
    
    // Determinar cuántos mensajes incluir basado en preferencias
    const maxMessages = this.getMaxHistoryMessages(userPreferences);
    const recentHistory = history.slice(-maxMessages);
    
    for (const interaction of recentHistory) {
      // Agregar mensaje del usuario
      if (interaction.userMessage) {
        optimized.push({
          role: 'user',
          content: interaction.userMessage
        });
      }
      
      // Agregar respuesta del asistente (resumida si es necesario)
      if (interaction.response) {
        let responseContent = interaction.response;
        
        // Resumir si el usuario prefiere respuestas breves
        if (userPreferences?.communication?.detail_level === 'brief' && responseContent.length > 500) {
          responseContent = this.summarizeResponse(responseContent);
        }
        
        optimized.push({
          role: 'assistant',
          content: responseContent
        });
      }
    }
    
    return optimized;
  }

  /**
   * Mejorar mensaje del usuario con contexto inteligente
   */
  enhanceUserMessage(userMessage, intelligentContext, options) {
    let enhanced = userMessage;
    
    // Agregar contexto de tarea si está disponible
    if (options.taskType) {
      enhanced = `[TIPO DE TAREA: ${options.taskType}]\n\n${enhanced}`;
    }
    
    // Agregar información de contenido si está disponible
    if (options.contentData) {
      const contentInfo = `[CONTENIDO A ANALIZAR: "${options.contentData.title}" - Categoría: ${options.contentData.category?.name || 'N/A'}]\n\n`;
      enhanced = contentInfo + enhanced;
    }
    
    // Agregar preferencias de análisis si están disponibles
    if (intelligentContext.optimization.recommended_approach) {
      const approach = intelligentContext.optimization.recommended_approach;
      enhanced += `\n\n[ENFOQUE RECOMENDADO: ${approach.description}]`;
    }
    
    return enhanced;
  }

  /**
   * Procesar respuesta inteligente con adaptaciones
   */
  async processIntelligentResponse(response, agentProfile, intelligentContext, options) {
    try {
      let content = response.choices[0]?.message?.content || '';
      
      // Aplicar adaptaciones de personalidad
      if (agentProfile?.personality) {
        content = personalitySystem.adaptResponseStyle(content, agentProfile.personality);
      }
      
      // Aplicar adaptaciones basadas en preferencias del usuario
      content = this.applyResponseAdaptations(content, intelligentContext.user.preferences);
      
      // Agregar elementos adicionales según preferencias
      content = this.enhanceResponseWithPreferences(content, intelligentContext.user.preferences);
      
      // Calcular satisfacción predicha
      const predictedSatisfaction = this.calculatePredictedSatisfaction(
        content, 
        intelligentContext.optimization.predicted_success_rate
      );
      
      return {
        success: true,
        content: content,
        predictedSatisfaction: predictedSatisfaction,
        model: response.model,
        usage: response.usage,
        metadata: {
          intelligence_applied: true,
          adaptations_count: this.countAppliedAdaptations(intelligentContext.user.adaptations)
        }
      };
      
    } catch (error) {
      logger.error('❌ Error processing intelligent response:', error);
      return this.processStandardResponse(response, agentProfile);
    }
  }

  /**
   * Construir mensajes optimizados para el contexto (método original mejorado)
   */
  async buildOptimizedMessages(contextData, agentProfile, userMessage, taskContext) {
    // 🔧 CRÍTICO: Si el caller ya proporciona messages completos, USARLOS directamente
    if (taskContext.messages && Array.isArray(taskContext.messages) && taskContext.messages.length > 0) {
      logger.info(`✅ [BUILD MESSAGES] Using provided messages array (${taskContext.messages.length} messages)`);
      return taskContext.messages; // Retornar directamente los mensajes pre-construidos
    }

    const messages = [];

    // 1. Sistema personalizado con contexto (solo si no hay messages pre-construidos)
    const systemPrompt = personalitySystem.generatePersonalizedPrompt(agentProfile, {
      ...contextData.additionalContext,
      currentTask: taskContext,
      sessionContext: contextData.conversationId
    });

    messages.push({
      role: 'system',
      content: systemPrompt
    });

    // 2. Contexto de conversación (mensajes relevantes)
    if (contextData.messages && contextData.messages.length > 0) {
      const relevantMessages = contextData.messages
        .slice(-agentProfile.technicalConfig?.contextWindow || 10)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
      messages.push(...relevantMessages);
    }

    // 3. Contexto adicional relevante
    if (contextData.additionalContext) {
      const contextSummary = this.formatAdditionalContext(contextData.additionalContext);
      if (contextSummary) {
        messages.push({
          role: 'system',
          content: `CONTEXTO ADICIONAL:\n${contextSummary}`
        });
      }
    }

    // 4. Mensaje actual del usuario
    messages.push({
      role: 'user',
      content: userMessage
    });

    return messages;
  }

  /**
   * Configurar parámetros según perfil del agente
   */
  buildRequestConfig(agentProfile, taskContext) {
    const config = { ...this.defaultConfig };
    
    if (agentProfile?.technicalConfig) {
      const tech = agentProfile.technicalConfig;
      
      config.temperature = tech.temperature || config.temperature;
      config.max_tokens = Math.min(tech.maxTokens || 2000, 4000);
      
      // Ajustes según tipo de tarea
      if (taskContext.requiresPrecision) {
        config.temperature = Math.min(config.temperature, 0.3);
      } else if (taskContext.requiresCreativity) {
        config.temperature = Math.max(config.temperature, 0.8);
      }
    }

    // Modelo según complejidad de la tarea
    config.model = this.selectOptimalModel(taskContext, agentProfile);
    
    return config;
  }

  /**
   * Seleccionar modelo óptimo según tarea y perfil
   */
  selectOptimalModel(taskContext, agentProfile) {
    const complexity = taskContext.complexity || 'medium';
    const requiresLatestModel = taskContext.requiresLatestFeatures || false;
    
    // 🔧 FIX: Usar modelos más económicos para evitar rate limits
    if (requiresLatestModel || complexity === 'high') {
      return 'gpt-3.5-turbo'; // Cambiar de gpt-4o a 3.5-turbo
    } else if (complexity === 'medium') {
      return 'gpt-3.5-turbo'; // Cambiar de gpt-4-turbo a 3.5-turbo
    } else {
      return 'gpt-3.5-turbo';
    }
  }

  /**
   * 🆕 Controlar rate limiting local antes de llamar a OpenAI
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      logger.info(`🕐 Rate limiting: waiting ${waitTime}ms before API call`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * 🆕 Verificar si podemos hacer más peticiones concurrentes
   */
  canMakeRequest() {
    return this.currentRequests < this.maxConcurrentRequests;
  }

  /**
   * Llamada optimizada a OpenAI con reintentos
   */
  async callOpenAI(requestConfig, retries = 3) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('❌ OpenAI API key no configurada. Verifica tu archivo .env');
    }

    // 🆕 Aplicar rate limiting local
    await this.enforceRateLimit();
    this.currentRequests++;

    try {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          logger.info(`🔗 Calling OpenAI API (attempt ${attempt}/${retries})...`);
          logger.info(`📋 Request config: model=${requestConfig.model}, max_tokens=${requestConfig.max_tokens}`);
          
          const response = await axios.post(
            `${this.baseURL}/chat/completions`,
            requestConfig,
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              timeout: 75000 // 75 segundos para requests complejos (aumentado desde 45s)
            }
          );

          return response.data;

        } catch (error) {
          logger.error(`❌ API Error (attempt ${attempt}):`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            error: error.response?.data?.error,
            message: error.message
          });

          if (attempt === retries) {
            throw error;
          }
          
          // Manejo específico de rate limits (429)
          if (error.response?.status === 429) {
            this.metrics.rateLimitHits++;
            const retryAfter = error.response?.headers['retry-after'] || (30 * attempt);
            const waitTime = Math.min(retryAfter * 1000, 120000); // Max 2 minutos
            logger.warn(`🕐 Rate limit hit, waiting ${waitTime/1000}s before retry ${attempt + 1}...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            // Esperar antes del reintento para otros errores
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
          
          // Reducir tokens si es error de límite
          if (error.response?.status === 400 && error.response?.data?.error?.code === 'context_length_exceeded') {
            requestConfig.messages = await this.optimizeMessagesForTokens(requestConfig.messages, requestConfig.model);
            logger.warn(`⚠️  Reduced token count for retry ${attempt}`);
          }
        }
      }
    } finally {
      // 🆕 Decrementar contador de peticiones concurrentes
      this.currentRequests = Math.max(0, this.currentRequests - 1);
    }
  }

  /**
   * Procesar respuesta con personalización del agente
   */
  async processIntelligentResponse(response, agentProfile, contextData, taskContext) {
    let content = response.choices[0].message.content;
    
    // Aplicar estilo de personalidad
    if (agentProfile) {
      content = personalitySystem.adaptResponseStyle(content, agentProfile);
    }

    // Estructurar respuesta según configuración
    const structuredResponse = this.structureResponse(content, agentProfile, taskContext);

    return {
      content: structuredResponse,
      rawContent: response.choices[0].message.content,
      usage: response.usage,
      model: response.model,
      agentName: agentProfile?.agentName || 'unknown',
      personalityApplied: !!agentProfile,
      contextUsed: !!contextData.conversationId,
      processingTime: Date.now() - (contextData.startTime || Date.now()),
      timestamp: new Date()
    };
  }

  /**
   * Estructurar respuesta según configuración del agente
   */
  structureResponse(content, agentProfile, taskContext) {
    if (!agentProfile?.responseConfig) {
      return content;
    }

    const config = agentProfile.responseConfig;
    let structured = content;

    // Agregar estructura si es necesario
    if (config.includeSteps && !structured.includes('PASOS:') && !structured.includes('1.')) {
      // Intentar extraer pasos del contenido
      if (taskContext.type === 'optimize' || taskContext.type === 'analyze') {
        structured += '\n\n📋 PASOS RECOMENDADOS:\n1. Revisar las sugerencias anteriores\n2. Implementar cambios prioritarios\n3. Medir resultados';
      }
    }

    if (config.includeMetrics && taskContext.type === 'analyze') {
      structured += '\n\n📊 MÉTRICAS CLAVE:\n- Rendimiento actual evaluado\n- Oportunidades de mejora identificadas';
    }

    // 🔧 REMOVIDO: No agregar recomendaciones genéricas en contexto de ventas
    // Las recomendaciones deben venir del prompt específico del agente

    return structured;
  }

  /**
   * Generar respuesta de chat tradicional (retrocompatibilidad)
   */
  async generateChatResponse(messages, config = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('OpenAI API key not configured');
      }

      // Verificar caché simple (TEMPORALMENTE DESHABILITADO PARA DEBUGGING)
      const cacheKey = this.generateCacheKey(messages);
      const cached = false; // ← TEMP: Deshabilitar cache
      // const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.info('🎯 Using cached OpenAI response');
        return cached;
      }

      const requestConfig = {
        ...this.defaultConfig,
        ...config,
        model: config.model || this.model,
        messages: this.formatMessages(messages)
      };

      logger.info('🤖 Calling OpenAI API (traditional)...');
      const response = await this.callOpenAI(requestConfig);

      const result = {
        content: response.choices[0].message.content,
        usage: response.usage,
        model: response.model,
        timestamp: new Date()
      };

      // Guardar en caché
      this.saveToCache(cacheKey, result);

      logger.success('✅ OpenAI response received');
      return result;

    } catch (error) {
      logger.error('❌ OpenAI API error:', error.response?.data || error.message);
      throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Generar contenido a partir de un prompt de texto simple
   * Compatible con BlogAgent.chat() y otros métodos
   */
  async generateCompletion(prompt, config = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('OpenAI API key not configured');
      }

      const finalConfig = {
        temperature: config.temperature !== undefined ? config.temperature : 0.7,
        max_tokens: config.maxTokens || config.max_tokens || 500,
        model: config.model || this.model,
        top_p: 1,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      };

      logger.info('🤖 Generating completion from prompt...');
      const response = await this.callOpenAI(finalConfig);

      const content = response.choices[0].message.content;
      
      logger.success('✅ Completion generated');
      return content;

    } catch (error) {
      logger.error('❌ Error generating completion:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Analizar texto y extraer intenciones
   */
  async analyzeIntent(text, context = {}) {
    try {
      const messages = [
        {
          role: 'system',
          content: `Eres un asistente especializado en análisis de intenciones para un sistema de gestión de blog.
          
Tu trabajo es analizar comandos en lenguaje natural y determinar:
1. La acción que se desea realizar
2. El módulo o área afectada
3. Los parámetros específicos
4. El nivel de prioridad

Contexto del sistema:
- Gestión de blog y contenido
- Optimización SEO
- Análisis de métricas
- Moderación de comentarios
- Gestión de usuarios

Responde SIEMPRE en formato JSON con esta estructura:
{
  "intent": "acción_principal",
  "module": "módulo_afectado",
  "action": "acción_específica",
  "parameters": {...},
  "priority": "high|medium|low",
  "confidence": 0.0-1.0
}`
        },
        {
          role: 'user',
          content: `Analiza este comando: "${text}"`
        }
      ];

      const response = await this.generateChatResponse(messages, {
        temperature: 0.3, // Más determinista para análisis
        max_tokens: 500
      });

      try {
        const analysis = JSON.parse(response.content);
        return analysis;
      } catch (parseError) {
        logger.warn('⚠️  Failed to parse OpenAI JSON response, using fallback');
        return this.createFallbackAnalysis(text);
      }

    } catch (error) {
      logger.error('❌ Error analyzing intent:', error);
      return this.createFallbackAnalysis(text);
    }
  }

  /**
   * Generar contenido optimizado para blog
   */
  async generateBlogContent(prompt, type = 'improvement', config = {}) {
    try {
      const systemPrompts = {
        improvement: `Eres un especialista en optimización de contenido para blogs de tecnología.
        Tu objetivo es mejorar el contenido existente para SEO, legibilidad y engagement.
        Proporciona sugerencias específicas y actionables.`,
        
        tags: `Eres un especialista en SEO y taxonomía de contenido.
        Tu trabajo es generar tags relevantes y keywords optimizadas para contenido de tecnología.`,
        
        summary: `Eres un especialista en síntesis de contenido.
        Crea resúmenes concisos y atractivos que capturen la esencia del contenido.`,
        
        seo: `Eres un especialista en SEO técnico.
        Analiza el contenido y proporciona recomendaciones específicas para optimizar el ranking.`
      };

      const messages = [
        {
          role: 'system',
          content: systemPrompts[type] || systemPrompts.improvement
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      return await this.generateChatResponse(messages, config);

    } catch (error) {
      logger.error('❌ Error generating blog content:', error);
      throw error;
    }
  }

  /**
   * Formatear mensajes para OpenAI
   */
  formatMessages(messages) {
    if (typeof messages === 'string') {
      return [{ role: 'user', content: messages }];
    }

    if (Array.isArray(messages)) {
      return messages.map(msg => {
        if (typeof msg === 'string') {
          return { role: 'user', content: msg };
        }
        return msg;
      });
    }

    return [messages];
  }

  /**
   * Crear análisis de respaldo cuando OpenAI falla
   */
  createFallbackAnalysis(text) {
    const textLower = text.toLowerCase();
    
    // Análisis básico por palabras clave
    let intent = 'unknown';
    let module = 'blog';
    let action = 'analyze';
    let priority = 'medium';

    if (textLower.includes('optimiz') || textLower.includes('mejor')) {
      intent = 'optimize';
      action = 'optimize_content';
    } else if (textLower.includes('analiz') || textLower.includes('revis')) {
      intent = 'analyze';
      action = 'analyze_content';
    } else if (textLower.includes('generat') || textLower.includes('crear')) {
      intent = 'generate';
      action = 'generate_content';
    }

    if (textLower.includes('tag') || textLower.includes('keyword')) {
      action = 'generate_tags';
    } else if (textLower.includes('seo')) {
      action = 'optimize_seo';
    }

    return {
      intent,
      module,
      action,
      parameters: { text },
      priority,
      confidence: 0.6,
      fallback: true
    };
  }

  /**
   * Generar clave de caché
   */
  generateCacheKey(messages) {
    const content = JSON.stringify(messages);
    return Buffer.from(content).toString('base64').slice(0, 32);
  }

  /**
   * Obtener respuesta del caché
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Guardar respuesta en caché
   */
  saveToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Limpiar caché viejo
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Limpiar caché
   */
  clearCache() {
    this.cache.clear();
    logger.info('🧹 OpenAI cache cleared');
  }

  /**
   * Manejar estrategias de fallback cuando OpenAI no está disponible
   */
  async handleFallback(agentName, userMessage, taskContext, error = null) {
    logger.warn(`⚠️  Using fallback strategy for ${agentName}${error ? `: ${error.message}` : ''}`);
    
    const strategy = this.fallbackStrategies.get(agentName) || this.fallbackStrategies.get('default');
    
    if (strategy) {
      return await strategy(userMessage, taskContext);
    }

    // Fallback básico
    return {
      content: `Sistema funcionando en modo limitado. He recibido tu solicitud "${userMessage}" pero requiero conectividad completa para una respuesta óptima. Te sugiero intentar nuevamente en unos minutos.`,
      fallback: true,
      agentName,
      timestamp: new Date()
    };
  }

  /**
   * Inicializar estrategias de fallback
   */
  initializeFallbackStrategies() {
    // Estrategia específica para ServicesAgent
    this.fallbackStrategies.set('ServicesAgent', async (message, context) => {
      logger.info(`🔧 ServicesAgent fallback activated for content type: ${context.contentType || 'unknown'}`);
      
      return {
        content: 'Contenido generado localmente debido a límites temporales de IA.',
        fallback: true,
        agentName: 'ServicesAgent',
        contentType: context.contentType,
        useLocalFallback: true,
        timestamp: new Date()
      };
    });

    this.fallbackStrategies.set('BlogAgent', async (message, context) => {
      return {
        content: `🔧 **Análisis Básico de Blog**
        
He recibido tu solicitud sobre contenido del blog. Sin conexión completa a IA, puedo ofrecerte:

📊 **Análisis disponibles:**
- Revisión de estructura básica
- Validación de elementos SEO fundamentales
- Sugerencias generales de optimización

💡 **Recomendaciones básicas:**
- Verificar título y meta descripción
- Revisar densidad de palabras clave
- Comprobar estructura de encabezados

Para análisis completo con IA, por favor intenta nuevamente cuando la conectividad esté restaurada.`,
        fallback: true,
        agentName: 'BlogAgent',
        basicAnalysis: true
      };
    });

    this.fallbackStrategies.set('default', async (message, context) => {
      return {
        content: `Sistema operando en modo básico. Tu consulta "${message}" ha sido registrada. Las funcionalidades completas de IA estarán disponibles una vez restaurada la conectividad.`,
        fallback: true,
        timestamp: new Date()
      };
    });
  }

  /**
   * Formatear contexto adicional para mensajes
   */
  formatAdditionalContext(additionalContext) {
    let formatted = '';
    
    if (additionalContext.recentBlogPosts) {
      formatted += 'POSTS RECIENTES:\n';
      additionalContext.recentBlogPosts.forEach(post => {
        formatted += `- "${post.title}" (${post.views || 0} vistas, ${post.category?.name || 'Sin categoría'})\n`;
      });
      formatted += '\n';
    }

    if (additionalContext.userStats) {
      formatted += `ESTADÍSTICAS DEL USUARIO:\n`;
      formatted += `- Miembro desde: ${additionalContext.userStats.memberSince}\n`;
      if (additionalContext.userStats.blogActivity) {
        formatted += `- Actividad en blog: ${JSON.stringify(additionalContext.userStats.blogActivity)}\n`;
      }
      formatted += '\n';
    }

    return formatted.trim();
  }

  /**
   * Estimación inteligente de tokens
   */
  estimateTokenCount(messages) {
    let totalTokens = 0;
    
    messages.forEach(message => {
      // Estimación más precisa: ~4 chars por token en español
      totalTokens += Math.ceil(message.content.length / 4);
      // Overhead por estructura del mensaje
      totalTokens += 4;
    });
    
    return totalTokens;
  }

  /**
   * Obtener límite de tokens para modelo
   */
  getTokenLimit(model) {
    return this.tokenLimits[model] || 8192;
  }

  /**
   * Optimizar mensajes para límite de tokens
   */
  async optimizeMessagesForTokens(messages, model) {
    const limit = this.getTokenLimit(model) * 0.8; // 80% del límite
    let currentTokens = this.estimateTokenCount(messages);
    
    if (currentTokens <= limit) {
      return messages;
    }

    logger.info(`🔧 Optimizing messages: ${currentTokens} -> target: ${limit} tokens`);
    
    const optimized = [...messages];
    const systemMessage = optimized[0]; // Preservar mensaje del sistema
    const userMessage = optimized[optimized.length - 1]; // Preservar mensaje actual del usuario
    
    // Reducir mensajes del historial
    let historyMessages = optimized.slice(1, -1);
    
    while (currentTokens > limit && historyMessages.length > 1) {
      // Remover el mensaje menos importante del medio
      const middleIndex = Math.floor(historyMessages.length / 2);
      historyMessages.splice(middleIndex, 1);
      
      const newMessages = [systemMessage, ...historyMessages, userMessage];
      currentTokens = this.estimateTokenCount(newMessages);
    }
    
    // Si aún es muy largo, resumir el sistema prompt
    if (currentTokens > limit) {
      systemMessage.content = this.summarizeSystemPrompt(systemMessage.content, limit * 0.3);
    }
    
    const final = [systemMessage, ...historyMessages, userMessage];
    logger.success(`✅ Optimized to ${this.estimateTokenCount(final)} tokens`);
    
    return final;
  }

  /**
   * Resumir prompt del sistema
   */
  summarizeSystemPrompt(prompt, maxTokens) {
    const targetChars = maxTokens * 4; // ~4 chars por token
    
    if (prompt.length <= targetChars) {
      return prompt;
    }

    // Mantener secciones críticas
    const criticalSections = [
      'INSTRUCCIONES:',
      'TU ESPECIALIZACIÓN:',
      'TAREA ACTUAL:'
    ];

    let summary = '';
    const sections = prompt.split('\n\n');
    
    // Agregar secciones críticas completas
    sections.forEach(section => {
      const isCritical = criticalSections.some(critical => section.includes(critical));
      if (isCritical && summary.length + section.length < targetChars * 0.8) {
        summary += section + '\n\n';
      }
    });

    // Agregar resumen del resto si hay espacio
    const remaining = targetChars - summary.length;
    if (remaining > 100) {
      const otherSections = sections.filter(section => 
        !criticalSections.some(critical => section.includes(critical))
      );
      
      const briefSummary = otherSections
        .join(' ')
        .substring(0, remaining - 50)
        .replace(/\s+/g, ' ')
        .trim() + '...';
        
      summary += briefSummary;
    }

    return summary;
  }

  /**
   * Caché inteligente con prioridad
   */
  generateSmartCacheKey(messages, agentName) {
    const messageHash = this.generateCacheKey(messages);
    return `${agentName}_${messageHash}`;
  }

  getFromSmartCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      // Actualizar prioridad
      this.cachePriority.set(key, Date.now());
      return cached.data;
    }
    
    this.cache.delete(key);
    this.cachePriority.delete(key);
    return null;
  }

  saveToSmartCache(key, data, agentProfile) {
    // Determinar TTL basado en tipo de contenido
    let ttl = this.cacheTimeout;
    
    if (agentProfile?.technicalConfig?.cacheStrategy === 'persistent') {
      ttl = 60 * 60 * 1000; // 1 hora
    } else if (agentProfile?.technicalConfig?.cacheStrategy === 'basic') {
      ttl = 5 * 60 * 1000; // 5 minutos
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    this.cachePriority.set(key, Date.now());

    // Limpiar cache si es muy grande
    if (this.cache.size > 200) {
      this.cleanupSmartCache();
    }
  }

  cleanupSmartCache() {
    // Remover entradas más antiguas basado en prioridad y tiempo
    const sortedEntries = Array.from(this.cachePriority.entries())
      .sort((a, b) => a[1] - b[1]) // Ordenar por timestamp (más antiguo primero)
      .slice(0, 50); // Remover 50 entradas más antiguas

    sortedEntries.forEach(([key]) => {
      this.cache.delete(key);
      this.cachePriority.delete(key);
    });

    logger.info(`🧹 Cleaned up cache: removed ${sortedEntries.length} old entries`);
  }

  /**
   * 🆕 Limpiar caché específico de servicios después de crear/modificar
   */
  clearServicesCache() {
    let clearedCount = 0;
    
    // Buscar y limpiar todas las entradas de caché relacionadas con ServicesAgent
    for (const [key] of this.cache.entries()) {
      if (key.includes('ServicesAgent') || key.includes('generator_') || key.includes('features') || key.includes('benefits')) {
        this.cache.delete(key);
        this.cachePriority.delete(key);
        clearedCount++;
      }
    }
    
    if (clearedCount > 0) {
      logger.info(`🧹 [SERVICES_CACHE] Cleared ${clearedCount} services cache entries`);
    }
  }

  /**
   * Actualizar contexto y métricas
   */
  async updateContextAndMetrics(sessionId, agentName, userMessage, response, startTime) {
    try {
      // Actualizar contexto de conversación
      await contextManager.addMessage(sessionId, agentName, {
        role: 'user',
        content: userMessage
      });

      await contextManager.addMessage(sessionId, agentName, {
        role: 'assistant',
        content: response.content
      });

      // Actualizar métricas
      const responseTime = Date.now() - startTime;
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime + responseTime) / this.metrics.totalRequests;

      if (response.usage) {
        this.metrics.tokensSaved += response.usage.prompt_tokens || 0;
        
        // Calcular ahorro de costos (aproximado)
        const costSaving = (response.usage.total_tokens || 0) * 0.00003; // ~$0.03/1K tokens
        this.metrics.costOptimization += costSaving;
      }

      // Actualizar métricas del agente
      await personalitySystem.updateProfileMetrics(agentName, {
        responseTime,
        tokensUsed: response.usage?.total_tokens || 0
      });

    } catch (error) {
      logger.warn('⚠️  Failed to update context and metrics:', error.message);
    }
  }

  /**
   * Obtener estadísticas avanzadas del servicio
   */
  getAdvancedStats() {
    return {
      // Estadísticas básicas
      available: this.isAvailable(),
      model: this.model,
      
      // Cache
      cacheSize: this.cache.size,
      cacheHitRate: this.metrics.totalRequests > 0 ? 
        (this.metrics.cachedResponses / this.metrics.totalRequests * 100).toFixed(2) + '%' : '0%',
      
      // Performance
      metrics: {
        ...this.metrics,
        averageResponseTime: Math.round(this.metrics.averageResponseTime),
        errorRate: (this.metrics.errorRate * 100).toFixed(2) + '%',
        costOptimization: '$' + this.metrics.costOptimization.toFixed(4)
      },
      
      // Límites y configuración
      tokenLimits: this.tokenLimits,
      cacheTimeout: this.cacheTimeout / 1000, // en segundos
      
      timestamp: new Date()
    };
  }

  /**
   * Obtener estadísticas simples (retrocompatibilidad)
   */
  getStats() {
    return {
      available: this.isAvailable(),
      model: this.model,
      cacheSize: this.cache.size,
      cacheTimeout: this.cacheTimeout / 1000 // en segundos
    };
  }
  /**
   * Aplicar adaptaciones de respuesta basadas en preferencias
   */
  applyResponseAdaptations(content, userPreferences) {
    if (!userPreferences) return content;
    
    let adapted = content;
    
    // Adaptar según el nivel de detalle preferido
    switch (userPreferences.communication?.detail_level) {
      case 'brief':
        adapted = this.makeBrief(adapted);
        break;
      case 'comprehensive':
        adapted = this.makeComprehensive(adapted);
        break;
    }
    
    // Adaptar según estilo de respuesta
    switch (userPreferences.communication?.response_style) {
      case 'step_by_step':
        adapted = this.formatAsStepByStep(adapted);
        break;
      case 'examples_heavy':
        adapted = this.emphasizeExamples(adapted);
        break;
    }
    
    return adapted;
  }

  /**
   * Mejorar respuesta con elementos adicionales según preferencias
   */
  enhanceResponseWithPreferences(content, userPreferences) {
    let enhanced = content;
    
    // Agregar elementos según preferencias de tarea
    if (userPreferences?.task_preferences) {
      if (userPreferences.task_preferences.include_metrics && !enhanced.includes('📊')) {
        enhanced += '\n\n📊 **MÉTRICAS DE ÉXITO**: Se recomienda monitorear los indicadores de rendimiento después de implementar las sugerencias.';
      }
      
      if (userPreferences.task_preferences.include_next_steps && !enhanced.includes('SIGUIENTES PASOS')) {
        enhanced += '\n\n🔄 **SIGUIENTES PASOS**: \n1. Revisar y validar las recomendaciones\n2. Priorizar implementaciones\n3. Monitorear resultados';
      }
      
      if (userPreferences.task_preferences.prioritize_quick_wins && !enhanced.includes('QUICK WINS')) {
        enhanced += '\n\n⚡ **QUICK WINS**: Implementa primero las mejoras más rápidas para obtener resultados inmediatos.';
      }
    }
    
    return enhanced;
  }

  /**
   * Calcular satisfacción predicha
   */
  calculatePredictedSatisfaction(content, successRate) {
    let satisfaction = successRate || 0.7;
    
    // Factores que incrementan satisfacción predicha
    if (content.includes('📊')) satisfaction += 0.05; // Métricas
    if (content.includes('🔄')) satisfaction += 0.05; // Pasos siguientes
    if (content.includes('💡')) satisfaction += 0.03; // Consejos
    if (content.includes('⚡')) satisfaction += 0.04; // Quick wins
    if (content.length > 500 && content.length < 2000) satisfaction += 0.03; // Longitud apropiada
    
    return Math.min(1.0, satisfaction);
  }

  /**
   * Contar adaptaciones aplicadas
   */
  countAppliedAdaptations(adaptations) {
    if (!adaptations) return 0;
    
    return (adaptations.communication?.length || 0) +
           (adaptations.content?.length || 0) +
           (adaptations.structure?.length || 0);
  }

  /**
   * Obtener máximo de mensajes de historial según preferencias
   */
  getMaxHistoryMessages(userPreferences) {
    const detailLevel = userPreferences?.communication?.detail_level || 'standard';
    
    switch (detailLevel) {
      case 'brief': return 4; // 2 intercambios
      case 'standard': return 8; // 4 intercambios
      case 'detailed': return 12; // 6 intercambios
      case 'comprehensive': return 16; // 8 intercambios
      default: return 8;
    }
  }

  /**
   * Resumir respuesta para usuarios que prefieren brevedad
   */
  summarizeResponse(response) {
    // Extraer puntos principales usando patrones simples
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const important = sentences.filter(s => 
      s.includes('importante') || 
      s.includes('recomiendo') || 
      s.includes('debes') || 
      s.includes('clave') ||
      s.includes('principal')
    );
    
    // Mantener primeras oraciones y las importantes
    const summary = [...sentences.slice(0, 2), ...important.slice(0, 2)].join('. ') + '.';
    
    return summary.length > 300 ? summary.substring(0, 297) + '...' : summary;
  }

  /**
   * Formatear contenido para usuarios que prefieren pasos
   */
  formatAsStepByStep(content) {
    // Si ya está estructurado, mantenerlo
    if (content.includes('\n1.') || content.includes('**1.')) {
      return content;
    }
    
    // Intentar crear estructura de pasos
    const sections = content.split('\n\n').filter(s => s.trim().length > 0);
    if (sections.length > 1) {
      return '**ANÁLISIS PASO A PASO:**\n\n' + 
             sections.map((section, index) => `**${index + 1}.** ${section}`).join('\n\n');
    }
    
    return content;
  }

  /**
   * Enfatizar ejemplos en el contenido
   */
  emphasizeExamples(content) {
    // Destacar ejemplos existentes
    let enhanced = content.replace(/ejemplo:/gi, '**💡 EJEMPLO:**');
    enhanced = enhanced.replace(/por ejemplo/gi, '**por ejemplo**');
    
    // Agregar ejemplo adicional si no hay suficientes
    if ((enhanced.match(/ejemplo/gi) || []).length < 2) {
      enhanced += '\n\n**💡 EJEMPLO PRÁCTICO:** Esta estrategia ha demostrado resultados efectivos en proyectos similares, mejorando métricas clave entre 15-25%.';
    }
    
    return enhanced;
  }

  /**
   * Hacer contenido más breve
   */
  makeBrief(content) {
    // Remover secciones explicativas extensas
    const brief = content
      .replace(/En primer lugar,?/gi, 'Primero:')
      .replace(/Es importante mencionar que/gi, 'Nota:')
      .replace(/Por otro lado,?/gi, 'También:')
      .replace(/A continuación,?/gi, 'Siguiente:');
    
    // Mantener solo los puntos principales
    const lines = brief.split('\n').filter(line => 
      line.trim().length > 0 && 
      (line.includes('•') || line.includes('-') || line.includes('**') || line.length < 150)
    );
    
    return lines.join('\n');
  }

  /**
   * Hacer contenido más comprehensivo
   */
  makeComprehensive(content) {
    let comprehensive = content;
    
    // Agregar contexto adicional
    if (!comprehensive.includes('CONTEXTO:')) {
      comprehensive = '**CONTEXTO:** Esta análisis considera las mejores prácticas actuales de la industria.\n\n' + comprehensive;
    }
    
    // Agregar consideraciones adicionales
    if (!comprehensive.includes('CONSIDERACIONES:')) {
      comprehensive += '\n\n**CONSIDERACIONES ADICIONALES:**\n- Evalúa el impacto en recursos disponibles\n- Considera tiempos de implementación realistas\n- Monitorea métricas de éxito continuamente';
    }
    
    return comprehensive;
  }

  /**
   * Crear mensajes de fallback
   */
  buildFallbackMessages(userMessage, agentProfile) {
    const messages = [
      {
        role: 'system',
        content: `Eres un asistente AI especializado. Responde de manera profesional y útil en español.`
      },
      {
        role: 'user',
        content: userMessage
      }
    ];
    
    return messages;
  }

  /**
   * Procesar respuesta estándar (fallback)
   */
  processStandardResponse(response, agentProfile) {
    return {
      success: true,
      content: response.choices[0]?.message?.content || 'No se pudo generar respuesta.',
      predictedSatisfaction: 0.6,
      model: response.model,
      usage: response.usage,
      metadata: {
        intelligence_applied: false,
        adaptations_count: 0,
        fallback_processing: true
      }
    };
  }

  /**
   * Formatear contexto adicional
   */
  formatAdditionalContext(context) {
    return Object.entries(context)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');
  }

  /**
   * Obtener métricas del servicio con información de rate limiting
   */
  getMetrics() {
    const now = Date.now();
    const hasRecentRateLimits = this.metrics.rateLimitHits > 0 && (now - this.lastRequestTime) < 300000;
    
    return {
      ...this.metrics,
      cacheEfficiencyRate: this.metrics.totalRequests > 0 ? 
        (this.metrics.cachedResponses / this.metrics.totalRequests * 100).toFixed(2) + '%' : '0%',
      rateLimitRate: this.metrics.totalRequests > 0 ? 
        (this.metrics.rateLimitHits / this.metrics.totalRequests * 100).toFixed(2) + '%' : '0%',
      currentConcurrentRequests: this.currentRequests,
      hasRecentRateLimits,
      lastRequestAgo: this.lastRequestTime > 0 ? Math.round((now - this.lastRequestTime) / 1000) + 's' : 'never',
      healthStatus: this.currentRequests < this.maxConcurrentRequests && !hasRecentRateLimits ? 'healthy' : 
                   hasRecentRateLimits ? 'rate_limited' : 'busy',
      isAvailable: this.isAvailable()
    };
  }

  /**
   * 🆕 Resetear métricas de rate limiting (útil para testing)
   */
  resetRateLimitMetrics() {
    this.metrics.rateLimitHits = 0;
    this.lastRequestTime = 0;
    this.currentRequests = 0;
    logger.info('📊 Rate limit metrics reset');
  }
}

// Singleton instance
const openaiService = new OpenAIService();

export default openaiService;
export { OpenAIService };