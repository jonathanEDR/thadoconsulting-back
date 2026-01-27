/**
 * GerenteGeneral - Agente coordinador principal
 * Gestiona y coordina todos los agentes especializados con contexto centralizado
 */

import BaseAgent from './BaseAgent.js';
import orchestrator from './AgentOrchestrator.js';
import centralizedContext from '../context/CentralizedContextManager.js';
import AgentConfig from '../../models/AgentConfig.js';
import openaiService from '../services/OpenAIService.js';
import logger from '../../utils/logger.js';

export class GerenteGeneral extends BaseAgent {
  constructor() {
    super('GerenteGeneral', {
      description: 'Agente coordinador principal que gestiona todos los agentes especializados',
      version: '1.0.0',
      capabilities: [
        'session_management',
        'agent_coordination',
        'task_routing',
        'context_sharing',
        'monitoring',
        'reporting'
      ]
    });

    this.orchestrator = orchestrator;
    this.openaiService = openaiService;
    this.routingRules = this.initializeRoutingRules();
    this.config = null; // Configuración desde base de datos
    
    // Inicializar métricas
    this.metrics = {
      totalRequests: 0,
      successfulTasks: 0,
      failedTasks: 0,
      averageResponseTime: 0,
      activeAgents: 0,
      totalCoordinations: 0,
      agentHealth: {},
      lastActivity: Date.now(),
      uptime: Date.now()
    };
    
    // Configuración avanzada (se carga desde DB con trainingConfig)
    this.advancedConfig = null;
    
    // Flag para indicar si la configuración ya fue cargada
    this.configurationLoaded = false;
    
    // 🆕 Lazy loading: NO cargar configuración aquí - esperar a activate() para lazy initialization
    // this.loadConfiguration(); // ← REMOVIDO: causa problemas en deploy
    
    logger.info('👔 GerenteGeneral initialized (configuration will load on activation)');
  }

  /**
   * Activar GerenteGeneral y cargar configuración
   * @override
   */
  async activate() {
    try {
      // 🆕 Cargar configuración solo cuando se activa
      if (!this.configurationLoaded) {
        logger.info('🔄 Loading GerenteGeneral configuration on activation...');
        await this.loadConfiguration();
      }
      
      // Llamar al activate de BaseAgent
      return await super.activate();
    } catch (error) {
      logger.error('❌ Error activating GerenteGeneral:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Activar GerenteGeneral y cargar configuración
   * @override
   */
  async activate() {
    try {
      // 🆕 Cargar configuración solo cuando se activa
      if (!this.configurationLoaded) {
        logger.info('🔄 Loading GerenteGeneral configuration on activation...');
        await this.loadConfiguration();
      }
      
      // Llamar al activate de BaseAgent
      return await super.activate();
    } catch (error) {
      logger.error('❌ Error activating GerenteGeneral:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cargar configuración desde la base de datos (como BlogAgent)
   * IMPORTANTE: Cargar trainingConfig con ejemplos, taskPrompts y behaviorRules
   * @private
   */
  async loadConfiguration() {
    // Si ya está cargada, no volver a cargar
    if (this.configurationLoaded) {
      logger.debug('Configuration already loaded, skipping...');
      return;
    }
    
    try {
      // Buscar configuración en la base de datos
      let dbConfig = await AgentConfig.findOne({ agentName: 'gerente' });
      
      // Si no existe configuración, inicializar valores por defecto
      if (!dbConfig) {
        logger.info('🔄 No configuration found for gerente, initializing defaults...');
        await AgentConfig.initializeDefaults();
        dbConfig = await AgentConfig.findOne({ agentName: 'gerente' });
      }

      if (dbConfig) {
        // Aplicar configuración básica
        if (dbConfig.config) {
          this.config = { ...dbConfig.config };
        } else {
          this.config = {};
        }

        // Guardar configuración avanzada incluyendo trainingConfig
        this.advancedConfig = {
          personality: dbConfig.personality || this.getDefaultPersonality(),
          contextConfig: dbConfig.contextConfig || this.getDefaultContext(),
          responseConfig: dbConfig.responseConfig || this.getDefaultResponse(),
          promptConfig: dbConfig.promptConfig || this.getDefaultPrompts(),
          routingConfig: dbConfig.routingConfig || this.getDefaultRoutingConfig(),
          // CRÍTICO: Cargar trainingConfig con ejemplos y taskPrompts
          trainingConfig: dbConfig.trainingConfig || null
        };

        logger.success('✅ GerenteGeneral configuration loaded from database');
        logger.info(`🎭 Personality: ${this.advancedConfig.personality?.archetype || 'default'}`);
        logger.info(`🌡️  Temperature: ${this.config.temperature || 0.6}, Max Tokens: ${this.config.maxTokens || 1500}`);
        
        // Mostrar información de entrenamiento
        if (this.advancedConfig.trainingConfig?.taskPrompts?.length > 0) {
          logger.info(`🎯 Professional Task Prompts Available: ${this.advancedConfig.trainingConfig.taskPrompts.length}`);
        }
        if (this.advancedConfig.trainingConfig?.examples?.length > 0) {
          logger.info(`📚 Training Examples Available: ${this.advancedConfig.trainingConfig.examples.length}`);
        }
        if (this.advancedConfig.trainingConfig?.behaviorRules?.length > 0) {
          logger.info(`📋 Behavior Rules Defined: ${this.advancedConfig.trainingConfig.behaviorRules.length}`);
        }

        // Mostrar propiedades de configuración
        const autoRouting = this.config?.autoRouting ?? false;
        const contextSharing = this.config?.contextSharing ?? false;
        const sessionTTLHours = this.config?.sessionTTLHours ?? 24;
        const maxSessionsPerUser = this.config?.maxSessionsPerUser ?? 10;
        
        logger.info(`⚙️  Auto Routing: ${autoRouting ? 'enabled' : 'disabled'}`);
        logger.info(`💾 Context Sharing: ${contextSharing ? 'enabled' : 'disabled'}`);
        logger.info(`🕒 Session TTL: ${sessionTTLHours}h`);
        logger.info(`👥 Max Sessions per User: ${maxSessionsPerUser}`);
      } else {
        logger.warn('⚠️  GerenteGeneral configuration not found, using defaults');
        this.config = this.getDefaultConfig();
        this.advancedConfig = {
          personality: this.getDefaultPersonality(),
          contextConfig: this.getDefaultContext(),
          responseConfig: this.getDefaultResponse(),
          promptConfig: this.getDefaultPrompts(),
          routingConfig: this.getDefaultRoutingConfig(),
          trainingConfig: null
        };
      }
      
      // Marcar configuración como cargada
      this.configurationLoaded = true;
      
    } catch (error) {
      logger.error('❌ Error loading GerenteGeneral configuration:', error);
      this.config = this.getDefaultConfig();
      this.advancedConfig = {
        personality: this.getDefaultPersonality(),
        contextConfig: this.getDefaultContext(),
        responseConfig: this.getDefaultResponse(),
        promptConfig: this.getDefaultPrompts(),
        routingConfig: this.getDefaultRoutingConfig()
      };
      
      // Marcar configuración como cargada (con defaults)
      this.configurationLoaded = true;
    }
  }

  /**
   * Configuración por defecto si no se encuentra en DB
   * @private
   */
  getDefaultConfig() {
    return {
      agentName: 'gerente',
      enabled: true,
      config: {
        timeout: 30,
        maxTokens: 1500,
        temperature: 0.6,
        maxSessionsPerUser: 10,
        sessionTTLHours: 24,
        autoRouting: true,
        contextSharing: true
      },
      personality: {
        archetype: 'coordinator',
        communicationStyle: {
          tone: 'professional',
          verbosity: 'concise',
          formality: 8,
          enthusiasm: 7
        }
      }
    };
  }

  /**
   * Inicializar reglas de enrutamiento
   * Mapeo simple de palabras clave -> agente
   * @private
   */
  initializeRoutingRules() {
    return {
      // Blog Agent
      blog: {
        agent: 'BlogAgent',
        keywords: [
          // Palabras principales
          'blog', 'post', 'artículo', 'contenido', 'publicación',
          // Acciones de blog
          'escribir', 'redactar', 'crear blog', 'generar contenido',
          'optimizar contenido', 'mejorar artículo',
          // Análisis de blog específico (PRIORIDAD)
          'analizar seo del blog', 'analizar blog', 'seo del blog',
          // Elementos de blog
          'título', 'párrafo', 'introducción', 'conclusión',
          'tags', 'etiquetas', 'categorías blog'
        ],
        capabilities: ['content_optimization', 'seo_analysis', 'tag_generation', 'content_creation'],
        description: 'Especializado en creación y optimización de contenido de blog'
      },
      
      // SEO Agent
      seo: {
        agent: 'SEOAgent',
        keywords: [
          // SEO técnico
          'seo', 'posicionamiento', 'keywords', 'meta', 'schema', 'sitemap', 'robot', 'canonical',
          // Análisis SEO general (sin blog)
          'auditoria seo', 'análisis seo general', 'palabras clave', 'ranking',
          'meta description', 'meta title', 'h1', 'h2',
          // Optimización
          'optimizar seo', 'mejorar posicionamiento', 'google', 'buscadores'
        ],
        capabilities: ['technical_seo', 'keyword_research', 'competitor_analysis', 'seo_audit'],
        description: 'Especializado en SEO técnico y análisis de posicionamiento'
      },
      
      // Services Agent
      services: {
        agent: 'ServicesAgent',
        keywords: [
          // Servicios básicos
          'servicio', 'service', 'precio', 'paquete', 'oferta', 'producto',
          // Análisis de servicios
          'analizar servicio', 'evaluar servicio', 'revisar servicio',
          'descripción de servicio', 'features del servicio',
          // Gestión comercial
          'pricing', 'cotización', 'propuesta', 'portafolio',
          'consultoría', 'desarrollo', 'diseño', 'marketing digital'
        ],
        capabilities: ['service_management', 'pricing_strategy', 'content_generation', 'service_analysis'],
        description: 'Especializado en análisis y gestión de servicios profesionales'
      },

      // Event Agent
      events: {
        agent: 'EventAgent',
        keywords: [
          // Eventos principales
          'evento', 'eventos', 'agenda', 'calendario', 'programación',
          // Tipos de eventos
          'reunión', 'reuniones', 'cita', 'citas', 'meeting', 'appointment',
          'recordatorio', 'reminder', 'tarea programada',
          // Acciones de eventos
          'mostrar eventos', 'listar eventos', 'ver eventos', 'mis eventos',
          'eventos de hoy', 'eventos hoy', 'agenda de hoy', 'calendario de hoy',
          'próximos eventos', 'eventos próximos', 'eventos futuros', 'próximas reuniones',
          // Gestión de calendario
          'agenda personal', 'mi calendario', 'mi agenda', 'horario'
        ],
        capabilities: ['event_management', 'calendar_management', 'reminder_system', 'agenda_coordination'],
        description: 'Especializado en gestión de eventos, calendario y recordatorios'
      },

      // Casos especiales de coordinación multi-agente
      coordination: {
        agent: 'MULTI_AGENT',
        keywords: [
          // Blog basado en servicio (frases específicas)
          'crear blog del servicio', 'blog sobre servicio', 'contenido para servicio',
          'publicación de servicio', 'artículo sobre servicio',
          // Análisis + creación (las palabras clave más importantes)
          'analizar servicio para crear blog', 'analizar servicio para crear',
          'crear blog-publicacion', 'blog-publicacion',
          // Análisis completo
          'análisis completo', 'revisión general', 'evaluación total',
          'optimización integral', 'estrategia completa'
        ],
        capabilities: ['multi_agent_coordination', 'complex_task_management'],
        description: 'Coordina múltiples agentes para tareas complejas'
      }
    };
  }

  /**
   * Activar el agente
   * @override - Cargar configuración antes de activar
   */
  async activate() {
    try {
      // Cargar configuración desde DB (lazy initialization)
      await this.loadConfiguration();
      
      // Llamar al activate del padre
      return await super.activate();
    } catch (error) {
      this.status = 'error';
      logger.error(`❌ Error activating GerenteGeneral:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Procesar tarea principal
   * @override
   */
  async processTask(task, context = {}) {
    const startTime = Date.now();
    
    // Asegurar que la configuración esté cargada (lazy loading por si acaso)
    if (!this.configurationLoaded) {
      await this.loadConfiguration();
    }
    
    // Incrementar contador de requests
    this.metrics.totalRequests++;
    
    try {
      logger.info(`👔 GerenteGeneral procesando: ${task.action}`);

      // NUEVO: Verificar behavioral rules antes de procesar
      if (this.shouldApplyBehaviorRule('Verificar disponibilidad de agentes antes de coordinar')) {
        if (task.action === 'coordinate') {
          const agentHealth = this.checkAgentAvailability();
          if (!agentHealth.allHealthy && agentHealth.unhealthyCount > 0) {
            logger.warn(`⚠️  ${agentHealth.unhealthyCount} agents not available, proceeding with caution`);
          }
        }
      }

      // Obtener o crear sesión centralizada
      const session = await this.ensureSession(context);
      const sessionId = session.sessionId;

      let result;

      // Enrutar según acción
      switch (task.action) {
        case 'coordinate':
          result = await this.coordinateTask(task, sessionId, context);
          break;

        case 'route':
          result = await this.routeToAgent(task, sessionId);
          break;

        case 'status':
          result = await this.getSystemStatus(sessionId);
          break;

        case 'session_info':
          result = await this.getSessionInfo(sessionId);
          break;

        case 'update_context':
          result = await this.updateSessionContext(task, sessionId);
          break;

        default:
          // Intentar enrutamiento automático basado en contenido
          result = await this.autoRoute(task, sessionId);
      }

      const duration = Date.now() - startTime;

      // Registrar interacción en contexto centralizado con formato mejorado
      // NO registrar acciones de consulta (status, session_info) para evitar referencias circulares
      const readOnlyActions = ['status', 'session_info'];
      if (!readOnlyActions.includes(task.action)) {
        await centralizedContext.addInteraction(
          sessionId,
          'GerenteGeneral',
          task.action,
          { 
            task,
            userMessage: task.command, // Mensaje original del usuario
            userCommand: task.command
          },
          {
            ...result,
            agentResponse: result.message || result.response || result.result?.message // Respuesta del agente
          },
          duration,
          result.success !== false
        );
      }

      // Actualizar métricas de éxito
      this.metrics.successfulTasks++;
      this.metrics.totalCoordinations++;
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime + duration) / 2;

      // Emitir evento de tarea completada
      this.emit('task:completed', {
        agent: 'GerenteGeneral',
        taskId: task.action || 'unknown',
        task,
        result,
        duration
      });

      return result;

    } catch (error) {
      logger.error('❌ Error en GerenteGeneral.processTask:', error);
      
      // Actualizar métricas de error
      this.metrics.failedTasks++;
      
      this.emit('task:failed', {
        agent: 'GerenteGeneral',
        taskId: task.action || 'unknown',
        task,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Coordinar tarea compleja (delegar a múltiples agentes)
   */
  async coordinateTask(task, sessionId, context = {}) {
    try {
      const { command, params = {} } = task;

      logger.info(`🎯 Coordinando tarea: ${command}`);

      // 🔍 VERIFICAR SI HAY UNA CONVERSACIÓN DE BLOG ACTIVA
      if (params.blogCreationSessionId && params.conversationMode === 'blog_creation') {
        logger.info(`📝 Conversación de blog activa detectada: ${params.blogCreationSessionId}`);
        logger.info(`👉 Delegando continuación a BlogAgent...`);
        
        // Delegar directamente a BlogAgent con el contexto de conversación
        const result = await this.delegateToAgent(
          'BlogAgent',
          command,
          {
            ...params,
            sessionId: params.blogCreationSessionId,
            conversationMode: params.conversationMode,
            userId: context.userId
          },
          sessionId
        );

        // Extraer canvas_data si existe
        const canvasData = result.canvas_data || 
                          result.result?.canvas_data || 
                          result.data?.canvas_data;

        return {
          success: true,
          message: result.message || result.response || 'Tarea completada',
          agent: 'BlogAgent',
          results: [{
            agent: 'BlogAgent',
            result
          }],
          ...(canvasData && { canvas_data: canvasData })
        };
      }

      // Obtener contexto enriquecido
      const enrichedContext = await centralizedContext.getEnrichedContextForAgent(
        sessionId,
        'GerenteGeneral'
      );

      // Identificar agentes necesarios
      const targetAgents = this.identifyRequiredAgents(command);

      if (targetAgents.length === 0) {
        // No se identificó ningún agente específico
        // El GerenteGeneral responde directamente como consultor general
        logger.info(`💼 GerenteGeneral responderá directamente (sin delegación)`);
        
        try {
          // Usar OpenAI para responder como gerente general
          const prompt = `Como Gerente General de una empresa de tecnología, responde a la siguiente consulta de manera profesional y útil:

"${command}"

Proporciona una respuesta estratégica, práctica y orientada a resultados. Si es una pregunta sobre gestión, liderazgo o recomendaciones generales, ofrece insights valiosos basados en mejores prácticas.`;

          const aiResponse = await this.openaiService.generateChatResponse([
            { role: 'system', content: 'Eres un Gerente General experimentado de una empresa de tecnología. Proporcionas orientación estratégica, liderazgo y recomendaciones basadas en mejores prácticas empresariales.' },
            { role: 'user', content: command }
          ], {
            temperature: 0.7,
            max_tokens: 1500
          });

          return {
            success: true,
            message: aiResponse.content || aiResponse,
            type: 'direct_response',
            source: 'gerente_general',
            agentsInvolved: ['GerenteGeneral']
          };

        } catch (error) {
          logger.error('❌ Error en respuesta directa del GerenteGeneral:', error);
          
          // Fallback si falla OpenAI
          return {
            success: true,
            message: `Como Gerente General, entiendo tu consulta: "${command}". 

Para ayudarte mejor, podría delegar esta tarea a uno de nuestros agentes especializados:
• BlogAgent - Para contenido y artículos
• SEOAgent - Para optimización y posicionamiento
• ServicesAgent - Para gestión de servicios

¿Podrías reformular tu pregunta siendo más específico sobre qué área necesitas ayuda?`,
            type: 'direct_response',
            source: 'gerente_general_fallback',
            agentsInvolved: ['GerenteGeneral']
          };
        }
      }

      // Delegar a cada agente
      const results = [];
      
      for (const agentInfo of targetAgents) {
        logger.info(`📤 Delegando a ${agentInfo.agent}...`);
        
        // Incluir userId y otros datos del context en params
        const agentParams = {
          ...params,
          enrichedContext,
          userId: context.userId,
          clerkId: context.clerkId, // Agregar clerkId para EventAgent
          userRole: context.userRole,
          sessionId: context.sessionId
        };
        
        const agentResult = await this.delegateToAgent(
          agentInfo.agent,
          command,
          agentParams,
          sessionId
        );

        results.push({
          agent: agentInfo.agent,
          result: agentResult
        });

        // Guardar resultado en shared data
        await centralizedContext.updateSharedData(
          sessionId,
          `${agentInfo.agent}_lastResult`,
          agentResult
        );
      }

      // Si hay canvas_data en los resultados, agregarlo a la respuesta principal
      const canvasData = this.extractCanvasData(results);

      // 🆕 Extraer mensaje real del primer agente que tenga uno significativo
      let primaryMessage = 'Tarea coordinada exitosamente';
      for (const agentResult of results) {
        const result = agentResult.result;
        // Buscar mensaje en diferentes niveles de anidamiento
        const extractedMessage = result?.message ||
                                result?.result?.message ||
                                result?.data?.message ||
                                result?.response ||
                                result?.result?.response;
        
        // Solo usar si es un mensaje significativo (no genérico)
        if (extractedMessage && 
            extractedMessage !== 'Tarea coordinada exitosamente' &&
            extractedMessage !== 'Tarea completada' &&
            extractedMessage.length > 20) {
          primaryMessage = extractedMessage;
          logger.info(`✅ Extracted primary message from ${agentResult.agent}`);
          break;
        }
      }

      return {
        success: true,
        message: primaryMessage,
        agents: targetAgents.map(a => a.agent),
        results,
        ...(canvasData && { canvas_data: canvasData })
      };

    } catch (error) {
      logger.error('❌ Error coordinando tarea:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extraer datos de canvas de los resultados de los agentes
   * Busca canvas_data en las respuestas y lo formatea
   */
  extractCanvasData(results) {
    try {
      logger.info(`🔍 Extrayendo canvas_data de ${results.length} resultados...`);
      
      for (const agentResult of results) {
        const result = agentResult.result;
        
        logger.info(`🔍 Revisando resultado de ${agentResult.agent}:`, {
          hasCanvasData: !!result.canvas_data,
          hasResult: !!result.result,
          hasBlog: !!result.blog,
          hasService: !!result.service,
          hasItems: !!result.items,
          keys: Object.keys(result || {}),
          resultStructure: JSON.stringify(result, null, 2).substring(0, 500)
        });
        
        // Nivel 1: canvas_data directo en result
        if (result.canvas_data) {
          logger.info(`✅ Canvas data encontrado en nivel 1 (result.canvas_data)`);
          return result.canvas_data;
        }
        
        // Nivel 2: canvas_data en result.result
        if (result.result && result.result.canvas_data) {
          logger.info(`✅ Canvas data encontrado en nivel 2 (result.result.canvas_data)`);
          return result.result.canvas_data;
        }

        // Nivel 3: canvas_data en result.data
        if (result.data && result.data.canvas_data) {
          logger.info(`✅ Canvas data encontrado en nivel 3 (result.data.canvas_data)`);
          return result.data.canvas_data;
        }

        // Si el resultado tiene datos estructurados de blog o servicio
        if (result.blog || result.blogPost) {
          logger.info(`✅ Generando canvas_data desde blog data`);
          return {
            type: 'blog',
            mode: 'preview',
            data: result.blog || result.blogPost,
            metadata: {
              agent: agentResult.agent,
              action: 'blog_preview'
            }
          };
        }

        if (result.service || result.servicio) {
          logger.info(`✅ Generando canvas_data desde service data`);
          return {
            type: 'service',
            mode: 'preview',
            data: result.service || result.servicio,
            metadata: {
              agent: agentResult.agent,
              action: 'service_preview'
            }
          };
        }

        // Si tiene una lista de items
        if (result.items && Array.isArray(result.items)) {
          logger.info(`✅ Generando canvas_data desde items array`);
          return {
            type: 'list',
            mode: 'list',
            data: {
              items: result.items,
              totalCount: result.totalCount || result.items.length
            },
            metadata: {
              agent: agentResult.agent,
              action: 'list_items'
            }
          };
        }
      }

      logger.warn('⚠️ No se encontró canvas_data en ningún resultado');
      return null;
    } catch (error) {
      logger.error('❌ Error extrayendo canvas data:', error);
      return null;
    }
  }

  /**
   * Enrutar a agente específico
   */
  async routeToAgent(task, sessionId) {
    try {
      const { targetAgent, action, params = {} } = task;

      if (!targetAgent) {
        return {
          success: false,
          message: 'No se especificó agente destino'
        };
      }

      logger.info(`🎯 Enrutando a ${targetAgent}: ${action}`);

      // Obtener contexto enriquecido
      const enrichedContext = await centralizedContext.getEnrichedContextForAgent(
        sessionId,
        targetAgent
      );

      // Delegar
      const result = await this.delegateToAgent(
        targetAgent,
        action,
        { ...params, enrichedContext },
        sessionId
      );

      return {
        success: true,
        agent: targetAgent,
        result
      };

    } catch (error) {
      logger.error('❌ Error enrutando:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enrutamiento automático basado en contenido
   */
  async autoRoute(task, sessionId) {
    try {
      const { command, params = {} } = task;
      const content = (command || '').toLowerCase();

      // Verificar si auto-routing está habilitado en configuración
      if (!this.isAutoRoutingEnabled()) {
        logger.warn('⚠️  Auto-routing deshabilitado por configuración');
        return {
          success: false,
          routed: false,
          message: 'Auto-routing está deshabilitado. Especifica el agente manualmente.',
          availableAgents: Object.values(this.routingRules).map(r => r.agent)
        };
      }

      logger.info(`🔍 Auto-enrutando: ${command}`);

      // Obtener estilo de comunicación de la configuración
      const commStyle = this.getCommunicationStyle();
      const isVerbose = commStyle.verbosity !== 'concise';

      // FASE 1: Buscar primero coordinación multi-agente (máxima prioridad)
      const coordinationRules = Object.entries(this.routingRules).filter(([_, config]) => config.agent === 'MULTI_AGENT');
      
      for (const [category, config] of coordinationRules) {
        const matchedKeywords = config.keywords.filter(keyword => 
          content.includes(keyword.toLowerCase())
        );

        if (matchedKeywords.length > 0) {
          logger.info(`🎯 Match de coordinación encontrado: ${category} -> ${config.agent}`);
          logger.info('🚀 Detectada tarea de coordinación multi-agente');
          
          // Analizar qué tipo de coordinación se necesita
          if (content.includes('blog') && (content.includes('servicio') || content.includes('service'))) {
            logger.info('📋 Coordinación: Servicio → Blog');
            return await this.coordinateServiceToBlog(command, params, sessionId);
          }
          
          // Otras coordinaciones...
          return await this.coordinateComplexTask(command, params, sessionId);
        }
      }

      // FASE 2: Buscar agentes individuales (prioridad normal)
      const individualRules = Object.entries(this.routingRules).filter(([_, config]) => config.agent !== 'MULTI_AGENT');
      
      for (const [category, config] of individualRules) {
        const matchedKeywords = config.keywords.filter(keyword => 
          content.includes(keyword.toLowerCase())
        );

        if (matchedKeywords.length > 0) {
          const logMessage = isVerbose 
            ? `✅ Match encontrado: ${category} -> ${config.agent} (confianza: alta)`
            : `✅ Match: ${category} -> ${config.agent}`;
          
          logger.info(logMessage);
          // Obtener contexto enriquecido (si está habilitado)
          let enrichedContext = {};
          if (this.isContextSharingEnabled()) {
            enrichedContext = await centralizedContext.getEnrichedContextForAgent(
              sessionId,
              config.agent
            );
          }

          // Aplicar reglas de comportamiento de configuración
          const enhancedParams = { ...params };
          
          if (this.shouldApplyBehaviorRule('Siempre mantener contexto de sesión actualizado entre interacciones')) {
            enhancedParams.preserveContext = true;
          }

          if (this.shouldApplyBehaviorRule('Explicar brevemente qué agente usarás y por qué antes de delegar')) {
            enhancedParams.explainRouting = true;
            enhancedParams.routingReason = `Detecté keywords relacionadas con ${category}: ${matchedKeywords.join(', ')}`;
          }

          // Delegar con parámetros enriquecidos
          const result = await this.delegateToAgent(
            config.agent,
            command,
            { ...enhancedParams, enrichedContext },
            sessionId
          );

          // Personalizar respuesta según configuración
          const response = {
            success: true,
            routed: true,
            agent: config.agent,
            category
          };

          // Agregar detalles si verbosity es alta
          if (isVerbose) {
            response.routingDetails = {
              matchedKeywords,
              confidence: 'alta',
              capabilities: config.capabilities,
              description: config.description
            };
          }

          response.result = result;
          return response;
        }
      }

      // No match encontrado - respuesta personalizada según configuración
      const noMatchResponse = {
        success: false,
        routed: false,
        message: commStyle.tone === 'formal' 
          ? 'No se pudo determinar el agente más apropiado para esta solicitud'
          : 'No estoy seguro qué agente sería mejor para esto',
        suggestion: 'Especifica el agente o usa palabras clave más claras',
        availableAgents: Object.values(this.routingRules).map(r => r.agent)
      };

      // Agregar ayuda extendida si verbosity permite
      if (isVerbose) {
        noMatchResponse.help = {
          keywordHints: Object.entries(this.routingRules).map(([cat, conf]) => ({
            category: cat,
            agent: conf.agent,
            suggestedKeywords: conf.keywords.slice(0, 3) // Top 3 keywords
          }))
        };
      }

      return noMatchResponse;

    } catch (error) {
      logger.error('❌ Error en auto-route:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener estado del sistema
   */
  async getSystemStatus(sessionId) {
    try {
      // Info de agentes registrados
      const registeredAgents = Array.from(this.orchestrator.agents.keys());
      const activeAgents = Array.from(this.orchestrator.activeAgents);

      // Stats de sesiones
      const sessionStats = await centralizedContext.getSessionStats();

      // Health check de cada agente
      const agentHealth = {};
      for (const agentName of registeredAgents) {
        const agent = this.orchestrator.agents.get(agentName);
        if (agent && typeof agent.healthCheck === 'function') {
          agentHealth[agentName] = await agent.healthCheck();
        }
      }

      return {
        success: true,
        system: {
          registeredAgents,
          activeAgents,
          agentHealth,
          sessionStats
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ Error obteniendo status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener información de sesión actual
   */
  async getSessionInfo(sessionId) {
    try {
      const session = await centralizedContext.getSession(sessionId);

      if (!session) {
        return {
          success: false,
          message: 'Sesión no encontrada'
        };
      }

      return {
        success: true,
        session: {
          sessionId: session.sessionId,
          userId: session.userId,
          userRole: session.userRole,
          globalContext: session.globalContext,
          interactionsCount: session.interactions.length,
          interactions: session.interactions, // Devolver TODAS las interacciones
          sharedDataKeys: Array.from(session.sharedData.keys()),
          status: session.status,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity
        }
      };

    } catch (error) {
      logger.error('❌ Error obteniendo session info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Actualizar contexto de sesión
   */
  async updateSessionContext(task, sessionId) {
    try {
      const { updates = {} } = task;

      const session = await centralizedContext.getSession(sessionId);

      if (!session) {
        return {
          success: false,
          message: 'Sesión no encontrada'
        };
      }

      // Actualizar global context
      if (updates.globalContext) {
        Object.assign(session.globalContext, updates.globalContext);
      }

      // Actualizar shared data
      if (updates.sharedData) {
        for (const [key, value] of Object.entries(updates.sharedData)) {
          await centralizedContext.updateSharedData(sessionId, key, value);
        }
      }

      await session.save();

      logger.info(`✅ Contexto actualizado para sesión ${sessionId}`);

      return {
        success: true,
        message: 'Contexto actualizado',
        sessionId
      };

    } catch (error) {
      logger.error('❌ Error actualizando contexto:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ========================================================================
  // MÉTODOS AUXILIARES
  // ========================================================================

  /**
   * Asegurar que existe sesión (obtener o crear)
   * @private
   */
  async ensureSession(context) {
    try {
      const { 
        sessionId, 
        userId = 'anonymous', 
        userRole = 'guest',
        initialContext = {}
      } = context;

      return await centralizedContext.getOrCreateSession(
        sessionId,
        userId,
        userRole,
        initialContext
      );

    } catch (error) {
      logger.error('❌ Error asegurando sesión:', error);
      throw error;
    }
  }

  /**
   * Identificar agentes requeridos para un comando
   * @private
   */
  identifyRequiredAgents(command) {
    const content = (command || '').toLowerCase();
    const matches = [];

    for (const [category, config] of Object.entries(this.routingRules)) {
      const matchedKeywords = config.keywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
      );

      if (matchedKeywords.length > 0) {
        matches.push({
          ...config,
          matchCount: matchedKeywords.length,
          matchedKeywords
        });
      }
    }

    // Ordenar por número de keywords que hicieron match (más relevante primero)
    matches.sort((a, b) => b.matchCount - a.matchCount);

    // Retornar solo el más relevante para evitar delegación múltiple
    return matches.length > 0 ? [matches[0]] : [];
  }

  /**
   * Delegar tarea a agente específico
   * 🆕 Con activación bajo demanda (Lazy Loading)
   * @private
   */
  async delegateToAgent(agentName, action, params, sessionId) {
    try {
      const agent = this.orchestrator.agents.get(agentName);

      if (!agent) {
        logger.warn(`⚠️  Agente no encontrado: ${agentName}`);
        return {
          success: false,
          error: `Agente ${agentName} no disponible`
        };
      }

      // ========================================
      // 🆕 LAZY ACTIVATION: Activar agente bajo demanda
      // ========================================
      const isActive = this.orchestrator.activeAgents.has(agentName) || 
                       this.orchestrator.activeAgents.has(agent.id);
      
      if (!isActive) {
        logger.info(`🔄 Activating ${agentName} on demand...`);
        const activationResult = await this.orchestrator.activateAgentOnDemand(agentName);
        
        if (!activationResult.success) {
          logger.error(`❌ Failed to activate ${agentName}:`, activationResult.error);
          return {
            success: false,
            error: `No se pudo activar el agente ${agentName}: ${activationResult.error}`
          };
        }
        
        logger.success(`✅ ${agentName} activated successfully`);
      }

      logger.info(`📤 Delegando a ${agentName}: ${action.substring(0, 60)}...`);

      // Construir tarea con estructura completa
      const taskPayload = {
        type: 'natural_language_command',
        command: action, // El comando original del usuario
        action: params.action || 'process',
        userId: params.userId || params.enrichedContext?.userId,
        sessionId: sessionId,
        ...params
      };

      // Ejecutar tarea en agente
      const result = await agent.processTask(taskPayload);

      // Registrar en contexto centralizado
      await centralizedContext.addInteraction(
        sessionId,
        agentName,
        action,
        params,
        result,
        0, // duration calculado por agente
        result.success !== false
      );

      return result;

    } catch (error) {
      logger.error(`❌ Error delegando a ${agentName}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ========================================================================
  // MÉTODOS DE COORDINACIÓN ESPECIALIZADA
  // ========================================================================

  /**
   * Coordinación: Análisis de Servicio → Creación de Blog
   */
  async coordinateServiceToBlog(command, params, sessionId) {
    try {
      logger.info('🎯 Iniciando coordinación Servicio → Blog');

      // 1. Primero analizar el servicio con ServicesAgent
      logger.info('📝 Paso 1: Analizando servicio...');
      
      const serviceAnalysis = await this.delegateToAgent(
        'ServicesAgent',
        `Analiza este servicio para extraer información clave: ${command}`,
        { 
          ...params,
          task: 'analyze_for_blog',
          extractFor: 'blog_creation'
        },
        sessionId
      );

      if (!serviceAnalysis.success) {
        logger.error('❌ Error analizando servicio');
        return {
          success: false,
          error: 'No se pudo analizar el servicio',
          details: serviceAnalysis
        };
      }

      // Guardar análisis en contexto compartido
      await centralizedContext.updateSharedData(
        sessionId,
        'service_analysis_for_blog',
        serviceAnalysis
      );

      // 2. Crear contenido de blog basado en el análisis
      logger.info('📖 Paso 2: Creando contenido de blog...');
      
      const blogCreation = await this.delegateToAgent(
        'BlogAgent',
        `Crear un blog promocional basado en este análisis de servicio: ${JSON.stringify(serviceAnalysis)}`,
        {
          ...params,
          task: 'create_from_service',
          serviceData: serviceAnalysis,
          contentType: 'promotional_blog'
        },
        sessionId
      );

      if (!blogCreation.success) {
        logger.error('❌ Error creando blog');
        return {
          success: false,
          error: 'No se pudo crear el blog',
          details: { serviceAnalysis, blogCreation }
        };
      }

      // 3. Optimizar SEO del blog creado
      logger.info('🔍 Paso 3: Optimizando SEO...');
      
      const seoOptimization = await this.delegateToAgent(
        'SEOAgent',
        `Optimizar el SEO de este contenido de blog: ${JSON.stringify(blogCreation)}`,
        {
          ...params,
          task: 'optimize_blog_seo',
          blogContent: blogCreation,
          focus: 'service_promotion'
        },
        sessionId
      );

      // Resultado final
      const result = {
        success: true,
        coordinationType: 'service_to_blog',
        steps: [
          { step: 1, name: 'Análisis de Servicio', agent: 'ServicesAgent', result: serviceAnalysis },
          { step: 2, name: 'Creación de Blog', agent: 'BlogAgent', result: blogCreation },
          { step: 3, name: 'Optimización SEO', agent: 'SEOAgent', result: seoOptimization }
        ],
        finalOutput: {
          blogContent: blogCreation,
          seoOptimizations: seoOptimization,
          serviceAnalysis: serviceAnalysis
        },
        summary: 'Blog promocional creado exitosamente basado en análisis de servicio con optimización SEO'
      };

      // Guardar resultado completo en contexto
      await centralizedContext.updateSharedData(
        sessionId,
        'service_to_blog_complete',
        result
      );

      logger.success('✅ Coordinación Servicio → Blog completada exitosamente');
      return result;

    } catch (error) {
      logger.error('❌ Error en coordinación Servicio → Blog:', error);
      return {
        success: false,
        error: error.message,
        coordinationType: 'service_to_blog'
      };
    }
  }

  /**
   * Coordinación: Tarea compleja general
   */
  async coordinateComplexTask(command, params, sessionId) {
    try {
      logger.info('🎯 Iniciando coordinación de tarea compleja');

      // Analizar el comando para determinar agentes necesarios
      const requiredAgents = this.identifyRequiredAgents(command);

      if (requiredAgents.length === 0) {
        return {
          success: false,
          error: 'No se pudieron identificar agentes para esta tarea compleja',
          suggestion: 'Proporciona más detalles sobre lo que necesitas'
        };
      }

      logger.info(`📋 Agentes identificados: ${requiredAgents.map(a => a.agent).join(', ')}`);

      // Ejecutar secuencialmente
      const results = [];
      let previousResult = null;

      for (const agentInfo of requiredAgents) {
        logger.info(`⚡ Ejecutando con ${agentInfo.agent}...`);

        const agentParams = { 
          ...params,
          previousResult,
          coordinationContext: {
            totalAgents: requiredAgents.length,
            currentStep: results.length + 1,
            otherAgents: requiredAgents.filter(a => a.agent !== agentInfo.agent).map(a => a.agent)
          }
        };

        const result = await this.delegateToAgent(
          agentInfo.agent,
          command,
          agentParams,
          sessionId
        );

        results.push({
          agent: agentInfo.agent,
          step: results.length + 1,
          result
        });

        previousResult = result;

        // Guardar resultado intermedio
        await centralizedContext.updateSharedData(
          sessionId,
          `complex_task_step_${results.length}`,
          result
        );
      }

      const finalResult = {
        success: true,
        coordinationType: 'complex_multi_agent',
        totalSteps: results.length,
        results,
        finalOutput: previousResult,
        summary: `Tarea compleja completada usando ${results.length} agentes`
      };

      // Guardar resultado final
      await centralizedContext.updateSharedData(
        sessionId,
        'complex_task_complete',
        finalResult
      );

      logger.success('✅ Coordinación de tarea compleja completada');
      return finalResult;

    } catch (error) {
      logger.error('❌ Error en coordinación compleja:', error);
      return {
        success: false,
        error: error.message,
        coordinationType: 'complex_multi_agent'
      };
    }
  }

  /**
   * Health check del Gerente
   * @override
   */
  async healthCheck() {
    try {
      // Si la configuración no está cargada, el agente no está healthy todavía
      if (!this.configurationLoaded) {
        return {
          status: 'initializing',
          healthy: false,
          agent: 'GerenteGeneral',
          message: 'Configuration not loaded yet (waiting for activation)',
          timestamp: new Date().toISOString()
        };
      }
      
      const registeredCount = this.orchestrator.agents.size;
      const activeCount = this.orchestrator.activeAgents.size;
      const sessionStats = await centralizedContext.getSessionStats();

      return {
        status: 'healthy',
        healthy: true,
        agent: 'GerenteGeneral',
        registeredAgents: registeredCount,
        activeAgents: activeCount,
        sessionStats,
        configuration: {
          autoRouting: this.config?.config?.autoRouting || true,
          contextSharing: this.config?.config?.contextSharing || true,
          maxSessions: this.config?.config?.maxSessionsPerUser || 10,
          sessionTTL: this.config?.config?.sessionTTLHours || 24
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        healthy: false,
        agent: 'GerenteGeneral',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ========================================================================
  // MÉTODOS DE CONFIGURACIÓN
  // ========================================================================

  /**
   * Verificar si el auto-routing está habilitado
   */
  isAutoRoutingEnabled() {
    return this.config?.config?.autoRouting !== false;
  }

  /**
   * Verificar si el context sharing está habilitado
   */
  isContextSharingEnabled() {
    return this.config?.config?.contextSharing !== false;
  }

  /**
   * Obtener configuración de personalidad
   */
  getPersonalityConfig() {
    return this.config?.personality || this.getDefaultConfig().personality;
  }

  /**
   * Obtener estilo de comunicación basado en configuración
   */
  getCommunicationStyle() {
    const personality = this.getPersonalityConfig();
    return {
      tone: personality.communicationStyle?.tone || 'professional',
      verbosity: personality.communicationStyle?.verbosity || 'concise',
      formality: personality.communicationStyle?.formality || 8
    };
  }

  /**
   * Obtener prompt personalizado basado en configuración
   */
  getCustomPromptForTask(taskType) {
    const promptConfig = this.config?.promptConfig;
    if (!promptConfig?.useCustomPrompts) return null;

    const taskPrompts = this.config?.trainingConfig?.taskPrompts || [];
    const matchingPrompt = taskPrompts.find(p => p.taskType === taskType);
    
    return matchingPrompt || null;
  }

  /**
   * Aplicar reglas de comportamiento de la configuración
   */
  shouldApplyBehaviorRule(rule) {
    const behaviorRules = this.config?.trainingConfig?.behaviorRules || [];
    return behaviorRules.includes(rule);
  }

  /**
   * Actualizar configuración dinámicamente
   */
  async updateConfiguration(updates) {
    try {
      if (!this.config) {
        logger.warn('⚠️  No hay configuración cargada para actualizar');
        return false;
      }

      // Actualizar en base de datos
      await AgentConfig.findOneAndUpdate(
        { agentName: 'gerente' },
        { $set: updates },
        { new: true }
      );

      // Recargar configuración
      await this.loadConfiguration();

      logger.success('✅ Configuración de GerenteGeneral actualizada');
      return true;

    } catch (error) {
      logger.error('❌ Error actualizando configuración:', error);
      return false;
    }
  }

  /**
   * Obtener información de configuración completa para el frontend
   */
  getConfigurationSummary() {
    if (!this.config) return null;

    const summary = {
      agentName: this.config.agentName,
      enabled: this.config.enabled,
      
      // Configuración básica que espera el frontend
      config: {
        timeout: this.config.config?.timeout ?? 30,
        maxTokens: this.config.config?.maxTokens ?? 1500,
        temperature: this.config.config?.temperature ?? 0.6,
        // Configuraciones adicionales con valores por defecto seguros
        maxSessionsPerUser: this.config.config?.maxSessionsPerUser ?? 10,
        sessionTTLHours: this.config.config?.sessionTTLHours ?? 24,
        autoRouting: this.config.config?.autoRouting ?? true,
        contextSharing: this.config.config?.contextSharing ?? true
      },
      
      // Configuración de personalidad con valores seguros
      personality: {
        archetype: this.config.personality?.archetype ?? 'coordinator',
        traits: this.config.personality?.traits ?? [],
        communicationStyle: this.config.personality?.communicationStyle ?? {
          tone: 'professional',
          verbosity: 'concise',
          formality: 8,
          enthusiasm: 7,
          technicality: 6
        }
      },
      
      // Configuración de contexto
      contextConfig: {
        projectInfo: this.config.contextConfig?.projectInfo ?? {
          name: 'Web Scuti',
          type: 'AI Dashboard',
          domain: 'localhost',
          language: 'es',
          tone: 'professional'
        },
        userExpertise: this.config.contextConfig?.userExpertise ?? 'intermediate'
      },
      
      // Configuración de respuestas
      responseConfig: this.config.responseConfig ?? {
        defaultLanguage: 'es',
        supportedLanguages: ['es', 'en'],
        includeExamples: true,
        includeSteps: true,
        includeMetrics: false,
        includeRecommendations: true,
        responseFormat: 'structured'
      },
      
      // Configuración de prompts
      promptConfig: this.config.promptConfig ?? {
        useCustomPrompts: false,
        customSystemPrompt: '',
        promptVariables: {},
        contextWindow: 4000
      },
      
      // Configuración de routing (GerenteGeneral específico)
      routingConfig: this.config.routingConfig ?? {
        coordinationPhase: {
          enabled: true,
          keywords: ['coordinar', 'múltiples', 'varios agentes'],
          requireMultipleAgents: true,
          minAgentsForCoordination: 2
        },
        individualPhase: {
          defaultAgent: 'ServicesAgent',
          rules: []
        }
      },
      
      // Metadatos
      lastUpdated: this.config.updatedAt,
      createdAt: this.config.createdAt
    };
    
    return summary;
  }

  /**
   * Obtener métricas del sistema
   * @returns {Object} Objeto con las métricas actuales
   */
  getMetrics() {
    // Actualizar métricas en tiempo real
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Actualizar métricas del sistema
   * @private
   */
  updateMetrics() {
    this.metrics.uptime = Date.now() - this.metrics.uptime;
    this.metrics.lastActivity = Date.now();
    
    // Actualizar estado de agentes si el orchestrator está disponible
    if (this.orchestrator && this.orchestrator.agents) {
      this.metrics.activeAgents = Object.keys(this.orchestrator.agents).length;
      
      // Actualizar salud de agentes
      for (const [agentName, agent] of Object.entries(this.orchestrator.agents)) {
        this.metrics.agentHealth[agentName] = {
          status: agent.isHealthy ? 'healthy' : 'unhealthy',
          lastSeen: agent.lastActivity || Date.now()
        };
      }
    }
  }

  // ========================================================================
  // MÉTODOS DE ENTRENAMIENTO Y PERSONALIZACIÓN
  // ========================================================================

  /**
   * Obtener personalidad por defecto
   * @private
   */
  getDefaultPersonality() {
    return {
      archetype: 'coordinator',
      traits: [
        { trait: 'organized', intensity: 9 },
        { trait: 'diplomatic', intensity: 8 },
        { trait: 'efficient', intensity: 9 },
        { trait: 'analytical', intensity: 7 },
        { trait: 'strategic', intensity: 8 }
      ],
      communicationStyle: {
        tone: 'professional',
        verbosity: 'concise',
        formality: 8,
        enthusiasm: 7,
        technicality: 6
      }
    };
  }

  /**
   * Obtener contexto por defecto
   * @private
   */
  getDefaultContext() {
    return {
      projectInfo: {
        name: 'Web Scuti - Sistema de Agentes',
        type: 'agent_orchestration',
        domain: 'multi_agent_coordination',
        language: 'es-ES',
        tone: 'professional_coordinator'
      },
      userExpertise: 'varied'
    };
  }

  /**
   * Obtener configuración de respuesta por defecto
   * @private
   */
  getDefaultResponse() {
    return {
      defaultLanguage: 'es-ES',
      supportedLanguages: ['es-ES', 'en-US'],
      includeExamples: false,
      includeSteps: true,
      includeMetrics: false,
      includeRecommendations: true,
      responseFormat: 'structured'
    };
  }

  /**
   * NUEVO: Verificar disponibilidad de agentes (para behavioral rules)
   * @private
   */
  checkAgentAvailability() {
    if (!this.orchestrator || !this.orchestrator.agents) {
      return { allHealthy: false, unhealthyCount: 0, healthy: [], unhealthy: [] };
    }

    const healthy = [];
    const unhealthy = [];

    for (const [agentId, agent] of this.orchestrator.agents) {
      if (agent.status === 'active') {
        healthy.push(agentId);
      } else {
        unhealthy.push(agentId);
      }
    }

    return {
      allHealthy: unhealthy.length === 0,
      unhealthyCount: unhealthy.length,
      healthy,
      unhealthy
    };
  }

  /**
   * Obtener configuración de prompts por defecto
   * @private
   */
  getDefaultPrompts() {
    return {
      useCustomPrompts: true,
      customSystemPrompt: 'Eres el Gerente General del sistema de agentes de Web Scuti. Tu rol es coordinar y dirigir eficientemente las tareas entre los agentes especializados.',
      promptVariables: {
        role: 'Gerente General de Agentes',
        mission: 'Coordinar eficientemente el trabajo entre agentes especializados',
        approach: 'Análisis -> Enrutamiento -> Supervisión -> Reporte'
      },
      contextWindow: 50
    };
  }

  /**
   * Obtener configuración de routing por defecto
   * @private
   */
  getDefaultRoutingConfig() {
    return {
      coordinationPhase: {
        enabled: true,
        keywords: [],
        requireMultipleAgents: true,
        minAgentsForCoordination: 2
      },
      individualPhase: {
        defaultAgent: 'ServicesAgent',
        rules: []
      }
    };
  }

  /**
   * NUEVO: Construir prompt personalizado con configuración de personalidad y contexto
   * Integra task prompts profesionales predeterminados (como BlogAgent)
   * @param {string} basePrompt - Prompt base
   * @param {string} taskType - Tipo de tarea (coordinate, route, status, etc)
   * @returns {string} Prompt personalizado
   */
  buildPersonalizedPrompt(basePrompt, taskType = 'general') {
    // 1. PRIORIDAD: Buscar task prompt profesional específico
    const professionalPrompt = this.getTaskSpecificPrompt(taskType);
    if (professionalPrompt) {
      if (process.env.NODE_ENV !== 'production') {
        logger.debug(`🎯 Using professional task prompt for: ${taskType}`);
      }
      return professionalPrompt;
    }

    // 2. FALLBACK: Sistema de personalización legacy
    if (!this.advancedConfig) {
      logger.warn('⚠️ No advanced config available, using base prompt');
      return basePrompt;
    }

    let enhancedPrompt = '';

    // Aplicar personalidad del agente
    const personality = this.advancedConfig.personality;
    if (personality?.archetype) {
      const archetypeDescriptions = {
        coordinator: '👔 Eres un COORDINADOR maestro. Analiza solicitudes complejas, identifica agentes óptimos, asegura coherencia entre equipos y mantén el foco en objetivos.',
        analyst: '🔍 Eres un ANALISTA meticuloso. Enfócate en métricas, patrones y análisis profundos.',
        assistant: '🤝 Eres un ASISTENTE eficiente. Proporciona ayuda clara, directa y bien estructurada.'
      };

      enhancedPrompt += `PERSONALIDAD:\n${archetypeDescriptions[personality.archetype] || archetypeDescriptions.coordinator}\n\n`;
    }

    // Aplicar estilo de comunicación
    const style = personality?.communicationStyle || {};
    if (style.tone || style.verbosity) {
      enhancedPrompt += 'ESTILO:\n';
      if (style.tone) enhancedPrompt += `- Tono: ${style.tone}\n`;
      if (style.verbosity) enhancedPrompt += `- Detalle: ${style.verbosity}\n`;
      enhancedPrompt += '\n';
    }

    // Aplicar contexto del proyecto
    const context = this.advancedConfig.contextConfig;
    if (context?.projectInfo) {
      enhancedPrompt += `CONTEXTO:\n`;
      if (context.projectInfo.name) enhancedPrompt += `- Proyecto: ${context.projectInfo.name}\n`;
      if (context.projectInfo.domain) enhancedPrompt += `- Dominio: ${context.projectInfo.domain}\n`;
      enhancedPrompt += '\n';
    }

    // Prompt base
    enhancedPrompt += `---\n\n${basePrompt}`;

    return enhancedPrompt;
  }

  /**
   * NUEVO: Obtener prompt profesional específico para tipo de tarea
   * Busca en trainingConfig.taskPrompts el prompt correspondiente
   * @param {string} taskType - Tipo de tarea
   * @returns {string|null} Prompt profesional o null
   */
  getTaskSpecificPrompt(taskType) {
    if (!this.advancedConfig?.trainingConfig?.taskPrompts) {
      return null;
    }

    const taskPrompt = this.advancedConfig.trainingConfig.taskPrompts
      .find(tp => tp.taskType === taskType);

    if (taskPrompt?.systemPrompt) {
      return taskPrompt.systemPrompt;
    }

    return null;
  }

  /**
   * NUEVO: Obtener ejemplos (few-shot learning) para un tipo de tarea
   * @param {string} taskType - Tipo de tarea
   * @returns {Array} Array de ejemplos
   */
  getExamplesForTask(taskType) {
    if (!this.advancedConfig?.trainingConfig?.examples) {
      return [];
    }

    return this.advancedConfig.trainingConfig.examples
      .filter(ex => ex.category === taskType || ex.category === 'general');
  }

  /**
   * NUEVO: Aplicar behavioral rules para validar decisiones
   * @param {string} rule - Regla a verificar
   * @returns {boolean} Si la regla debe aplicarse
   */
  shouldApplyBehaviorRule(rule) {
    const behaviorRules = this.advancedConfig?.trainingConfig?.behaviorRules || [];
    return behaviorRules.includes(rule);
  }

  /**
   * NUEVO: Obtener todas las behavioral rules
   * @returns {Array} Array de reglas de comportamiento
   */
  getBehaviorRules() {
    return this.advancedConfig?.trainingConfig?.behaviorRules || [];
  }

  /**
   * NUEVO: Recargar configuración desde DB (útil para actualizaciones dinámicas)
   */
  async reloadConfiguration() {
    await this.loadConfiguration();
    logger.info('🔄 GerenteGeneral configuration reloaded');
  }

  /**
   * NUEVO: Obtener información de configuración de entrenamiento
   */
  getTrainingInfo() {
    const trainingConfig = this.advancedConfig?.trainingConfig;
    return {
      hasTrainingConfig: !!trainingConfig,
      taskPromptsCount: trainingConfig?.taskPrompts?.length || 0,
      examplesCount: trainingConfig?.examples?.length || 0,
      behaviorRulesCount: trainingConfig?.behaviorRules?.length || 0,
      learningMode: trainingConfig?.learningMode || 'balanced'
    };
  }
}

// Exportar instancia singleton
const gerenteGeneral = new GerenteGeneral();
export default gerenteGeneral;
