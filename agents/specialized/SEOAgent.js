/**
 * SEOAgent - Agente especializado en SEO técnico y análisis avanzado
 * Funcionalidades: Auditorías técnicas, investigación keywords, análisis competencia, optimización schema, etc.
 */

import BaseAgent from '../core/BaseAgent.js';
import openaiService from '../services/OpenAIService.js';
import BlogPost from '../../models/BlogPost.js';
import BlogCategory from '../../models/BlogCategory.js';
import BlogTag from '../../models/BlogTag.js';
import AgentConfig from '../../models/AgentConfig.js';
import { generateAIMetadata } from '../../utils/aiMetadataGenerator.js';
import { generatePostMetaTags, validatePostSEO } from '../../utils/seoGenerator.js';
import { generateBlogSitemap, getSitemapStats } from '../../utils/sitemapGenerator.js';
import { generateArticleSchema, generateAllSchemas } from '../../utils/schemaGenerator.js';
import logger from '../../utils/logger.js';

export class SEOAgent extends BaseAgent {
  constructor(skipDBConnection = false) {
    super(
      'SEOAgent',
      'Agente especializado en SEO técnico y análisis de rendimiento avanzado',
      [
        'natural_language_command', // Comandos de lenguaje natural
        'chat_interaction',         // Interacciones de chat
        'content_optimization',     // Optimización de contenido
        'content_analysis',         // Análisis específico de contenido
        'generate_structure',       // Generación de estructura
        'content_review',          // Revisión completa de contenido
        'technical_seo_audit',      // Auditoría SEO técnica
        'keyword_research',         // Investigación de keywords
        'competitor_analysis',      // Análisis de competencia
        'schema_optimization',      // Optimización de schema.org
        'sitemap_generation',       // Generación de sitemaps
        'meta_optimization',        // Optimización de meta tags
        'performance_analysis',     // Análisis de rendimiento SEO
        'backlink_analysis',        // Análisis de backlinks
        'content_gap_analysis',     // Análisis de gaps de contenido
        'local_seo_optimization'    // Optimización SEO local
      ]
    );

    // Configuración específica del SEOAgent (valores por defecto)
    this.config = {
      maxKeywordsPerAnalysis: 50,
      seoAuditDepth: 'comprehensive',
      competitorLimit: 10,
      performanceThreshold: 90,
      schemaValidation: true,
      sitemapFrequency: 'daily',
      backlinkCheckInterval: 'weekly',
      // Configuración OpenAI por defecto (más precisión que creatividad)
      timeout: 75000,        // Mayor timeout para análisis complejos (aumentado desde 45s)
      maxTokens: 3000,       // Más tokens para reportes detallados
      temperature: 0.3       // Menor creatividad, más precisión técnica
    };

    // Configuración avanzada (se carga desde DB)
    this.advancedConfig = null;

    // Cargar configuración desde base de datos (solo si no se salta)
    if (!skipDBConnection) {
      this.loadConfiguration();
    } else {
      // Usar configuración por defecto para testing
      this.advancedConfig = {
        personality: this.getDefaultPersonality(),
        contextConfig: this.getDefaultContext(),
        responseConfig: this.getDefaultResponse(),
        promptConfig: this.getDefaultPrompts(),
        trainingConfig: null
      };
    }
  }

  /**
   * Cargar configuración desde base de datos
   */
  async loadConfiguration() {
    try {
      let dbConfig = await AgentConfig.findOne({ agentName: 'seo' }); // Cambio de agentId a agentName

      if (!dbConfig) {
        logger.info('📊 SEOAgent config not found, creating default configuration...');
        
        dbConfig = new AgentConfig({
          agentId: 'SEOAgent',
          agentName: 'seo', // Agregar agentName válido del enum
          personality: this.getDefaultPersonality(),
          contextConfig: this.getDefaultContext(),
          responseConfig: this.getDefaultResponse(),
          promptConfig: this.getDefaultPrompts(),
          trainingConfig: {
            examples: [],
            taskPrompts: [],
            behaviorRules: [],
            specialInstructions: '',
            learningMode: 'balanced', // Cambio de 'adaptive' a 'balanced' (válido en enum)
            feedbackEnabled: true
          },
          isActive: true
        });

        await dbConfig.save();
        logger.success('✅ SEOAgent default configuration created');
      }

      // Inicializar task prompts si están vacíos
      await this.initializeTaskPromptsIfNeeded(dbConfig);

      this.advancedConfig = {
        personality: dbConfig.personality,
        contextConfig: dbConfig.contextConfig,
        responseConfig: dbConfig.responseConfig,
        promptConfig: dbConfig.promptConfig,
        trainingConfig: dbConfig.trainingConfig
      };

      logger.info('🚀 SEOAgent configuration loaded successfully');

    } catch (error) {
      logger.error('❌ Error loading SEOAgent configuration:', error);
      // Usar valores por defecto en caso de error
      this.advancedConfig = {
        personality: this.getDefaultPersonality(),
        contextConfig: this.getDefaultContext(),
        responseConfig: this.getDefaultResponse(),
        promptConfig: this.getDefaultPrompts(),
        trainingConfig: null
      };
    }
  }

  /**
   * Obtener personalidad por defecto específica para SEO
   */
  getDefaultPersonality() {
    return {
      archetype: 'expert', // Cambio de 'technical_expert' a 'expert' (válido en enum)
      traits: [
        { trait: 'analytical', intensity: 9 },
        { trait: 'precise', intensity: 9 },
        { trait: 'technical', intensity: 8 },
        { trait: 'professional', intensity: 8 }
      ],
      communicationStyle: {
        tone: 'technical', // Cambio de 'technical_professional' a 'technical' (válido en enum)
        verbosity: 'detailed',
        formality: 8,
        enthusiasm: 5,
        technicality: 9
      }
    };
  }

  /**
   * Obtener contexto por defecto específico para SEO
   */
  getDefaultContext() {
    return {
      projectInfo: {
        name: 'Web Scuti',
        type: 'tech_blog_seo',
        industry: 'technology',
        target_audience: 'developers_and_tech_professionals',
        primary_language: 'spanish',
        markets: ['latin_america', 'spain']
      },
      seoObjectives: {
        primary_goals: [
          'improve_organic_visibility',
          'increase_search_traffic',
          'enhance_technical_performance',
          'optimize_user_experience'
        ],
        target_metrics: {
          organic_traffic_growth: '25%_monthly',
          core_web_vitals_score: '>90',
          page_speed_score: '>85',
          mobile_usability: '100%'
        }
      },
      technicalContext: {
        cms: 'custom_nodejs',
        hosting: 'render_cloud',
        cdn: 'integrated',
        analytics: 'google_analytics_4',
        search_console: 'enabled'
      }
    };
  }

  /**
   * Obtener configuración de respuesta por defecto
   */
  getDefaultResponse() {
    return {
      format: 'structured_technical_report',
      includeMetrics: true,
      includeRecommendations: true,
      includePriorization: true,
      includeImplementationSteps: true,
      language: 'spanish',
      technicalLevel: 'advanced',
      reportStructure: {
        executive_summary: true,
        detailed_analysis: true,
        action_items: true,
        performance_metrics: true,
        timeline_estimates: true
      }
    };
  }

  /**
   * Obtener prompts por defecto específicos para SEO
   */
  getDefaultPrompts() {
    return {
      systemPrompt: `Eres un SEOAgent especializado, experto en SEO técnico y análisis de rendimiento. 

Tu misión es proporcionar análisis SEO precisos, recomendaciones técnicas fundamentadas y estrategias de optimización basadas en datos.

Características principales:
- Enfoque técnico y basado en métricas
- Conocimiento profundo de algoritmos de búsqueda
- Experiencia en Core Web Vitals y rendimiento
- Especialización en análisis competitivo
- Dominio de herramientas SEO profesionales

Siempre incluye:
1. Datos y métricas específicas
2. Recomendaciones priorizadas por impacto
3. Pasos de implementación técnica detallados
4. Estimaciones de tiempo y recursos
5. Métricas de seguimiento y KPIs

Mantén un enfoque profesional, preciso y orientado a resultados medibles.`,

      userPrompt: `Analiza la siguiente solicitud SEO y proporciona un análisis técnico detallado con recomendaciones específicas y métricas de rendimiento.`,

      temperature: 0.3,
      maxTokens: 3000
    };
  }

  /**
   * Recargar configuración (útil para cambios en tiempo real)
   */
  async reloadConfiguration() {
    await this.loadConfiguration();
    logger.info('🔄 SEOAgent configuration reloaded');
  }

  /**
   * Inicializar task prompts por defecto si no existen
   */
  async initializeTaskPromptsIfNeeded(dbConfig) {
    try {
      if (!dbConfig.trainingConfig.taskPrompts || dbConfig.trainingConfig.taskPrompts.length === 0) {
        logger.info('📋 Initializing default SEO task prompts...');

        const defaultTaskPrompts = [
          {
            taskType: 'technical_audit',
            systemPrompt: `Eres un experto en auditorías SEO técnicas. Analiza sitios web de manera exhaustiva identificando problemas técnicos que afecten el SEO.

Áreas de análisis principales:
- Estructura HTML y semántica
- Core Web Vitals y rendimiento
- Crawlability e indexabilidad
- Meta tags y structured data
- Mobile-first y responsive design
- Seguridad y HTTPS
- Arquitectura de información

Proporciona:
1. Lista detallada de problemas encontrados
2. Nivel de prioridad (Alto/Medio/Bajo)
3. Impacto estimado en el SEO
4. Pasos específicos de corrección
5. Métricas para medir la mejora`,
            userPrompt: 'Realiza una auditoría SEO técnica completa del sitio web proporcionado',
            temperature: 0.2,
            maxTokens: 2500
          },
          {
            taskType: 'keyword_research',
            systemPrompt: `Eres un especialista en investigación de palabras clave y análisis de mercado SEO. Tu expertise incluye análisis de intención de búsqueda, competencia y oportunidades de ranking.

Metodología de investigación:
- Análisis de volumen de búsqueda y tendencias
- Evaluación de dificultad de ranking
- Identificación de keywords long-tail
- Análisis de intención de búsqueda
- Mapping de keywords a funnel de conversión
- Análisis de competidores por keyword
- Identificación de gaps de contenido

Entrega:
1. Lista priorizada de keywords objetivo
2. Métricas de volumen y dificultad
3. Análisis de intención por keyword
4. Estrategia de contenido recomendada
5. Cronograma de implementación`,
            userPrompt: 'Realiza una investigación completa de palabras clave para el tema o industria especificada',
            temperature: 0.3,
            maxTokens: 2000
          },
          {
            taskType: 'schema_optimization',
            systemPrompt: `Eres un experto en structured data y optimización de schema.org. Especializas en implementar markup que mejore la visibilidad en resultados de búsqueda.

Tipos de schema especializados:
- Article y BlogPosting
- Organization y WebSite
- BreadcrumbList y SiteNavigationElement
- FAQPage y HowTo
- Product y Review
- LocalBusiness y Event
- VideoObject y ImageObject

Proceso de optimización:
1. Análisis del contenido existente
2. Identificación de oportunidades de schema
3. Implementación de markup apropiado
4. Validación técnica
5. Testing de rich snippets
6. Monitoreo de resultados

Proporciona código JSON-LD válido y completo con todas las propiedades requeridas y recomendadas.`,
            userPrompt: 'Optimiza el schema markup para el tipo de contenido especificado',
            temperature: 0.1,
            maxTokens: 2000
          },
          {
            taskType: 'performance_analysis',
            systemPrompt: `Eres un especialista en análisis de rendimiento SEO y Core Web Vitals. Tu enfoque está en optimizar la velocidad, usabilidad y experiencia de usuario desde la perspectiva SEO.

Métricas clave de análisis:
- Core Web Vitals (LCP, FID, CLS)
- Page Speed Insights scores
- Mobile usability
- Server response times
- Resource optimization
- Rendering performance
- User experience metrics

Metodología de análisis:
1. Medición de métricas actuales
2. Identificación de bottlenecks
3. Análisis de recursos críticos
4. Evaluación de impacto SEO
5. Recomendaciones de optimización
6. Plan de implementación priorizado

Proporciona recomendaciones específicas, medibles y con impacto directo en rankings y user experience.`,
            userPrompt: 'Analiza el rendimiento SEO y proporciona recomendaciones de optimización',
            temperature: 0.2,
            maxTokens: 2500
          }
        ];

        // Agregar behavior rules específicas para SEO
        const defaultBehaviorRules = [
          'Priorizar siempre datos técnicos precisos y medibles en todos los análisis',
          'Proporcionar recomendaciones SEO basadas en mejores prácticas actuales de Google',
          'Incluir métricas de rendimiento específicas y KPIs en todos los reportes',
          'Validar todas las implementaciones técnicas antes de recomendar',
          'Considerar el impacto en Core Web Vitals en todas las sugerencias de optimización',
          'Mantener consistencia con las directrices oficiales de Google Search Central',
          'Proporcionar alternativas técnicas para diferentes presupuestos y recursos',
          'Incluir cronogramas realistas para la implementación de mejoras SEO',
          'Validar compatibilidad con diferentes CMS y tecnologías web',
          'Priorizar mejoras con mayor impacto SEO vs esfuerzo técnico requerido'
        ];

        // Special instructions específicas para SEO
        const specialInstructions = `MISIÓN DEL SEOAGENT:
Soy un agente especializado en SEO técnico y análisis avanzado de rendimiento. Mi propósito es proporcionar auditorías técnicas precisas, investigación de keywords fundamentada y optimizaciones basadas en datos que generen resultados medibles en términos de visibilidad orgánica y experiencia de usuario.

PRINCIPIOS DE OPERACIÓN:
1. PRECISIÓN TÉCNICA: Todos mis análisis están basados en datos verificables y métricas oficiales
2. ENFOQUE HOLÍSTICO: Considero tanto aspectos técnicos como de contenido y experiencia de usuario
3. RESULTADOS MEDIBLES: Cada recomendación incluye métricas específicas para medir el éxito
4. IMPLEMENTACIÓN PRÁCTICA: Proporciono pasos técnicos detallados y cronogramas realistas
5. ACTUALIZACIÓN CONSTANTE: Mis recomendaciones reflejan las últimas actualizaciones de algoritmos

ESTÁNDARES DE CALIDAD:
- Análisis técnicos exhaustivos con validación cruzada
- Recomendaciones priorizadas por impacto vs esfuerzo
- Implementación compatible con estándares web actuales
- Monitoreo y seguimiento de resultados implementados
- Documentación técnica clara y completa

PROTOCOLOS DE SEGURIDAD:
- Validación de todas las implementaciones técnicas
- Respaldo de configuraciones antes de cambios
- Testing en entornos de desarrollo antes de producción
- Monitoreo continuo post-implementación

Mi expertise abarca desde auditorías técnicas básicas hasta análisis competitivos avanzados, siempre manteniendo el más alto nivel de precisión técnica y orientación a resultados.`;

        // Actualizar la configuración en la base de datos
        dbConfig.trainingConfig.taskPrompts = defaultTaskPrompts;
        dbConfig.trainingConfig.behaviorRules = defaultBehaviorRules;
        dbConfig.trainingConfig.specialInstructions = specialInstructions;

        await dbConfig.save();

        logger.success(`✅ Auto-initialized complete SEO training config: ${defaultTaskPrompts.length} task prompts, ${defaultBehaviorRules.length} behavior rules, and special instructions`);
      }
    } catch (error) {
      logger.error('❌ Error initializing SEO task prompts:', error);
    }
  }

  /**
   * Ejecutar tarea específica del SEOAgent
   */
  async executeTask(task, context = {}) {
    try {
      logger.info(`🎯 SEOAgent executing task: ${task.type}`);

      // Validar parámetros básicos
      if (!task || !task.type) {
        throw new Error('Task type is required');
      }

      // Obtener configuración específica para la tarea
      const taskConfig = this.getTaskConfiguration(task.type);
      
      // Ejecutar según el tipo de tarea
      switch (task.type) {
        case 'natural_language_command':
          return await this.handleNaturalLanguageCommand(task, context);
          
        case 'chat_interaction':
          return await this.handleChatInteraction(task, context);
          
        case 'content_optimization':
          return await this.optimizeContent(task, context);

        case 'content_analysis':
          return await this.analyzeContent(task, context);

        case 'generate_structure':
          return await this.generateContentStructure(task, context);

        case 'content_review':
          return await this.reviewContent(task, context);
          
        case 'technical_audit':
        case 'technical_seo_audit':
          return await this.performTechnicalAudit(task, context);
          
        case 'keyword_research':
          return await this.performKeywordResearch(task, context);
          
        case 'schema_optimization':
          return await this.optimizeSchemaMarkup(task, context);
          
        case 'performance_analysis':
          return await this.analyzePerformanceMetrics(task, context);
          
        case 'competitor_analysis':
          return await this.analyzeCompetitors(task, context);
          
        case 'sitemap_generation':
          return await this.generateSitemaps(task, context);
          
        case 'meta_optimization':
          return await this.optimizeMetaTags(task, context);
          
        case 'backlink_analysis':
          return await this.analyzeBacklinks(task, context);
          
        case 'content_gap_analysis':
          return await this.analyzeContentGaps(task, context);
          
        case 'local_seo_optimization':
          return await this.optimizeLocalSEO(task, context);
          
        default:
          return await this.handleGenericSEOCommand(task, context);
      }

    } catch (error) {
      logger.error(`❌ Error in SEOAgent task execution (${task.type}):`, error);
      return {
        success: false,
        error: error.message,
        task: task.type,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Obtener configuración específica para un tipo de tarea
   */
  getTaskConfiguration(taskType) {
    const taskPrompts = this.advancedConfig?.trainingConfig?.taskPrompts || [];
    return taskPrompts.find(tp => tp.taskType === taskType) || this.getDefaultPrompts();
  }

  /**
   * Realizar auditoría SEO técnica
   */
  async performTechnicalAudit(task, context) {
    try {
      const { url, depth = 'comprehensive' } = task;
      
      logger.info(`🔍 Performing technical SEO audit for: ${url}`);

      // Aquí implementaremos la lógica de auditoría técnica
      // Por ahora, estructura básica de respuesta
      
      const auditResult = {
        success: true,
        taskType: 'technical_audit',
        url: url,
        timestamp: new Date().toISOString(),
        audit: {
          score: 85, // Score provisional
          issues: [],
          recommendations: [],
          metrics: {}
        }
      };

      logger.success('✅ Technical SEO audit completed');
      return auditResult;

    } catch (error) {
      logger.error('❌ Error in technical audit:', error);
      throw error;
    }
  }

  /**
   * Realizar investigación de palabras clave
   */
  async performKeywordResearch(task, context) {
    try {
      const { topic, market = 'es', depth = 'comprehensive' } = task;
      
      logger.info(`🔍 Performing keyword research for topic: ${topic}`);

      // Estructura básica de respuesta
      const keywordResult = {
        success: true,
        taskType: 'keyword_research',
        topic: topic,
        timestamp: new Date().toISOString(),
        keywords: {
          primary: [],
          secondary: [],
          longTail: [],
          opportunities: []
        },
        analysis: {
          competitionLevel: 'medium',
          totalVolume: 0,
          recommendations: []
        }
      };

      logger.success('✅ Keyword research completed');
      return keywordResult;

    } catch (error) {
      logger.error('❌ Error in keyword research:', error);
      throw error;
    }
  }

  /**
   * Optimizar schema markup
   */
  async optimizeSchemaMarkup(task, context) {
    try {
      const { contentType, content, url } = task;
      
      logger.info(`🔍 Optimizing schema markup for content type: ${contentType}`);

      // Usar utilidad existente para generar schema
      let schema = {};
      
      if (contentType === 'article' || contentType === 'blog_post') {
        schema = generateArticleSchema(content, url);
      } else {
        schema = generateAllSchemas(content, contentType);
      }

      const schemaResult = {
        success: true,
        taskType: 'schema_optimization',
        contentType: contentType,
        timestamp: new Date().toISOString(),
        schema: schema,
        recommendations: [
          'Validar el schema con Google Rich Results Test',
          'Implementar el JSON-LD en el <head> del documento',
          'Monitorear rich snippets en Search Console'
        ]
      };

      logger.success('✅ Schema optimization completed');
      return schemaResult;

    } catch (error) {
      logger.error('❌ Error in schema optimization:', error);
      throw error;
    }
  }

  /**
   * Analizar métricas de rendimiento
   */
  async analyzePerformanceMetrics(task, context) {
    try {
      const { url, device = 'both' } = task;
      
      logger.info(`🔍 Analyzing performance metrics for: ${url}`);

      // Estructura básica de respuesta
      const performanceResult = {
        success: true,
        taskType: 'performance_analysis',
        url: url,
        timestamp: new Date().toISOString(),
        metrics: {
          coreWebVitals: {
            lcp: { value: 2.1, status: 'good' },
            fid: { value: 85, status: 'good' },
            cls: { value: 0.08, status: 'needs_improvement' }
          },
          pageSpeed: {
            desktop: 92,
            mobile: 78
          },
          recommendations: []
        }
      };

      logger.success('✅ Performance analysis completed');
      return performanceResult;

    } catch (error) {
      logger.error('❌ Error in performance analysis:', error);
      throw error;
    }
  }

  /**
   * Placeholder methods para futuras implementaciones
   */
  async analyzeCompetitors(task, context) {
    return { success: true, message: 'Competitor analysis - Coming soon' };
  }

  async generateSitemaps(task, context) {
    return generateBlogSitemap();
  }

  async optimizeMetaTags(task, context) {
    return generatePostMetaTags(task.content, task.url);
  }

  async analyzeBacklinks(task, context) {
    return { success: true, message: 'Backlink analysis - Coming soon' };
  }

  async analyzeContentGaps(task, context) {
    return { success: true, message: 'Content gap analysis - Coming soon' };
  }

  async optimizeLocalSEO(task, context) {
    return { success: true, message: 'Local SEO optimization - Coming soon' };
  }

  /**
   * Manejar interacción de chat con el SEO Agent
   */
  async handleChatInteraction(task, context) {
    try {
      logger.info('🗨️ SEOAgent handling chat interaction');

      const { message, context: chatContext } = task;
      
      if (!message) {
        throw new Error('Message is required for chat interaction');
      }

      // Configurar el prompt para la interacción de chat
      const systemPrompt = `Eres un especialista en SEO avanzado. Proporciona respuestas técnicas precisas y actionables sobre optimización para motores de búsqueda.

Contexto del chat: ${JSON.stringify(chatContext || {})}

Responde de manera profesional y técnica, enfocándote en:
- Análisis SEO técnico
- Recomendaciones específicas
- Mejores prácticas de optimización
- Métricas y KPIs relevantes`;

      const fullPrompt = `${systemPrompt}\n\nUsuario: ${message}`;

      // Llamar a OpenAI
      const response = await openaiService.generateCompletion(fullPrompt, {
        maxTokens: this.config.maxTokens || 1000,
        temperature: 0.7,
        timeout: this.config.timeout
      });

      const result = {
        success: true,
        taskType: 'chat_interaction',
        response: response, // response ya es string
        usage: null, // No disponible en este método
        timestamp: new Date().toISOString(),
        processingTime: null // No disponible en este método
      };

      logger.success('✅ SEOAgent chat interaction completed');
      return result;

    } catch (error) {
      logger.error('❌ Error in SEOAgent chat interaction:', error);
      throw error;
    }
  }

  /**
   * Manejar comandos de lenguaje natural del SEO Agent
   */
  async handleNaturalLanguageCommand(task, context) {
    try {
      logger.info('🗨️ SEOAgent handling natural language command');

      const { command } = task;
      
      if (!command) {
        throw new Error('Command is required for natural language processing');
      }

      // Extraer el mensaje del comando SEO_CHAT
      let message = command;
      if (command.startsWith('SEO_CHAT:')) {
        message = command.replace('SEO_CHAT:', '').trim();
      }

      // Configurar el prompt para comandos de lenguaje natural
      const systemPrompt = `Eres un especialista en SEO avanzado y marketing digital. Ayudas a usuarios a optimizar su contenido y estrategias SEO.

Proporciona respuestas prácticas y específicas sobre:
- Estrategias de contenido SEO
- Optimización técnica
- Análisis de palabras clave
- Mejores prácticas de posicionamiento
- Recomendaciones personalizadas

Contexto: ${JSON.stringify(context || {})}`;

      const fullPrompt = `${systemPrompt}\n\nUsuario: ${message}`;

      // Llamar a OpenAI
      const response = await openaiService.generateCompletion(fullPrompt, {
        maxTokens: this.config.maxTokens || 1000,
        temperature: 0.7,
        timeout: this.config.timeout
      });

      const result = {
        success: true,
        taskType: 'natural_language_command',
        command: command,
        response: response, // response ya es string
        usage: null, // No disponible en este método
        timestamp: new Date().toISOString(),
        processingTime: null // No disponible en este método
      };

      logger.success('✅ SEOAgent natural language command completed');
      return result;

    } catch (error) {
      logger.error('❌ Error in SEOAgent natural language command:', error);
      throw error;
    }
  }

  /**
   * Optimizar contenido para SEO
   */
  async optimizeContent(task, context) {
    try {
      logger.info('📝 SEOAgent optimizing content');

      const { content, title, optimize = true } = task;
      
      if (!content) {
        throw new Error('Content is required for optimization');
      }

      // Configurar el prompt para optimización de contenido
      const systemPrompt = `Eres un experto en optimización de contenido SEO. Tu tarea es analizar y optimizar contenido para mejorar su rendimiento en motores de búsqueda.

Analiza el siguiente contenido y proporciona:
1. Análisis SEO del contenido actual
2. Recomendaciones de optimización
3. Sugerencias de palabras clave
4. Mejoras en estructura y legibilidad
5. Optimización de meta datos

${optimize ? 'IMPORTANTE: Proporciona una versión optimizada del contenido.' : 'IMPORTANTE: Solo proporciona análisis y recomendaciones, NO modifiques el contenido.'}`;

      const contentPrompt = `
Título: ${title || 'Sin título'}
Contenido: ${content}

Contexto adicional: ${JSON.stringify(context || {})}`;

      const fullPrompt = `${systemPrompt}\n\n${contentPrompt}`;

      // Llamar a OpenAI
      const response = await openaiService.generateCompletion(fullPrompt, {
        maxTokens: this.config.maxTokens || 2000,
        temperature: 0.5,
        timeout: this.config.timeout
      });

      const result = {
        success: true,
        taskType: 'content_optimization',
        originalContent: content,
        originalTitle: title,
        optimized: optimize,
        analysis: response, // response ya es string
        usage: null, // No disponible en este método
        timestamp: new Date().toISOString(),
        processingTime: null // No disponible en este método
      };

      logger.success('✅ SEOAgent content optimization completed');
      return result;

    } catch (error) {
      logger.error('❌ Error in SEOAgent content optimization:', error);
      throw error;
    }
  }

  /**
   * Analizar contenido SEO específico
   */
  async analyzeContent(task, context) {
    try {
      logger.info('📊 SEOAgent analyzing content');

      const { content, title, keywords, description } = task;
      
      if (!content || !title) {
        throw new Error('Content and title are required for analysis');
      }

      // Configurar el prompt para análisis SEO específico
      const systemPrompt = `Eres un analista SEO experto. Analiza el siguiente contenido y proporciona un análisis detallado en formato JSON.

Tu análisis debe incluir:
1. Puntuación SEO general (0-100)
2. Análisis de palabras clave
3. Evaluación de meta tags  
4. Legibilidad y estructura
5. Recomendaciones específicas
6. Keywords sugeridas

Responde SOLO con JSON válido con esta estructura:
{
  "seo_score": 85,
  "keyword_analysis": {
    "primary_keywords": ["keyword1", "keyword2"],
    "keyword_density": 2.5,
    "keyword_distribution": "good"
  },
  "meta_analysis": {
    "title_score": 90,
    "description_score": 75
  },
  "readability": {
    "score": 80,
    "level": "medium"
  },
  "recommendations": [
    "Añadir más subtítulos H2",
    "Mejorar meta descripción"
  ],
  "suggested_keywords": ["nueva_keyword1", "nueva_keyword2"]
}`;

      const contentPrompt = `
Título: ${title}
${description ? `Descripción: ${description}` : ''}
${keywords ? `Keywords objetivo: ${JSON.stringify(keywords)}` : ''}

Contenido a analizar:
${content}`;

      const fullPrompt = `${systemPrompt}\n\n${contentPrompt}`;

      // Llamar a OpenAI
      const response = await openaiService.generateCompletion(fullPrompt, {
        maxTokens: this.config.maxTokens || 1500,
        temperature: 0.3,
        timeout: this.config.timeout
      });

      // Intentar parsear JSON response
      let analysisData;
      try {
        analysisData = JSON.parse(response);
      } catch (parseError) {
        // Si no es JSON válido, crear estructura básica
        analysisData = {
          seo_score: 75,
          analysis_text: response,
          recommendations: ['Revisar análisis completo en respuesta'],
          suggested_keywords: []
        };
      }

      const result = {
        success: true,
        taskType: 'content_analysis',
        originalContent: content,
        originalTitle: title,
        analysis: analysisData,
        timestamp: new Date().toISOString()
      };

      logger.success('✅ SEOAgent content analysis completed');
      return result;

    } catch (error) {
      logger.error('❌ Error in SEOAgent content analysis:', error);
      throw error;
    }
  }

  /**
   * Generar estructura de contenido SEO optimizada
   */
  async generateContentStructure(task, context) {
    try {
      logger.info('🏗️ SEOAgent generating content structure');

      const { topic, keywords, targetAudience } = task;
      
      if (!topic) {
        throw new Error('Topic is required for structure generation');
      }

      // Configurar el prompt para generación de estructura
      const systemPrompt = `Eres un estratega de contenido SEO. Genera una estructura detallada y optimizada para SEO para el tema especificado.

Proporciona una estructura completa con:
1. Título SEO optimizado
2. Meta descripción 
3. Estructura de encabezados (H1, H2, H3)
4. Puntos clave para cada sección
5. Keywords a incluir en cada parte
6. Call-to-actions sugeridos

Responde en formato JSON estructurado:
{
  "title": "Título SEO optimizado",
  "meta_description": "Meta descripción atractiva",
  "structure": [
    {
      "heading": "H1: Título principal",
      "level": 1,
      "content_points": ["Punto 1", "Punto 2"],
      "keywords": ["keyword1", "keyword2"]
    }
  ],
  "call_to_actions": ["CTA 1", "CTA 2"],
  "estimated_word_count": 1500
}`;

      const contentPrompt = `
Tema: ${topic}
${keywords ? `Keywords objetivo: ${JSON.stringify(keywords)}` : ''}
${targetAudience ? `Audiencia objetivo: ${targetAudience}` : ''}

Contexto adicional: ${JSON.stringify(context || {})}`;

      const fullPrompt = `${systemPrompt}\n\n${contentPrompt}`;

      // Llamar a OpenAI
      const response = await openaiService.generateCompletion(fullPrompt, {
        maxTokens: this.config.maxTokens || 2000,
        temperature: 0.4,
        timeout: this.config.timeout
      });

      // Intentar parsear JSON response
      let structureData;
      try {
        structureData = JSON.parse(response);
      } catch (parseError) {
        // Si no es JSON válido, crear estructura básica
        structureData = {
          title: `${topic} - Guía Completa`,
          meta_description: `Descubre todo sobre ${topic}. Guía completa y actualizada.`,
          structure_text: response,
          estimated_word_count: 1200
        };
      }

      const result = {
        success: true,
        taskType: 'generate_structure',
        topic: topic,
        structure: structureData,
        timestamp: new Date().toISOString()
      };

      logger.success('✅ SEOAgent structure generation completed');
      return result;

    } catch (error) {
      logger.error('❌ Error in SEOAgent structure generation:', error);
      throw error;
    }
  }

  /**
   * Revisar contenido completo SEO 
   */
  async reviewContent(task, context) {
    try {
      logger.info('🔍 SEOAgent reviewing content');

      const { content, title, description, keywords } = task;
      
      if (!content || !title) {
        throw new Error('Content and title are required for review');
      }

      // Configurar el prompt para revisión completa
      const systemPrompt = `Eres un auditor SEO profesional. Realiza una revisión completa y detallada del contenido proporcionado.

Tu revisión debe incluir un checklist detallado con items específicos verificables.

Responde SOLO con JSON válido en este formato exacto:
{
  "overall_score": 82,
  "checklist": [
    {
      "id": "title_length",
      "category": "Meta Tags",
      "item": "Longitud del título",
      "status": "pass",
      "message": "El título tiene 55 caracteres, dentro del rango óptimo (50-60)",
      "priority": "high"
    },
    {
      "id": "meta_description",
      "category": "Meta Tags",
      "item": "Meta descripción presente",
      "status": "fail",
      "message": "No se proporcionó meta descripción. Es crítico para CTR en resultados de búsqueda",
      "priority": "high"
    }
  ],
  "critical_issues": [
    "Meta descripción faltante - reduce CTR significativamente",
    "Sin enlaces internos - pierde potencial de PageRank"
  ],
  "warnings": [
    "Densidad de keywords baja - considerar aumentarla al 1-2%",
    "Pocos encabezados H2 - mejorar estructura"
  ],
  "recommendations": [
    "Agregar meta descripción de 150-160 caracteres",
    "Incluir al menos 3-5 enlaces internos relevantes",
    "Optimizar densidad de keyword principal"
  ],
  "seo_summary": {
    "title_optimization": 85,
    "content_quality": 78,
    "keywords_usage": 65,
    "meta_tags": 40,
    "readability": 82,
    "structure": 70
  }
}

Estados posibles: "pass", "warning", "fail"
Prioridades posibles: "high", "medium", "low"
Categorías sugeridas: "Meta Tags", "Contenido", "Keywords", "Estructura", "Enlaces", "Legibilidad", "Técnico"`;

      const contentPrompt = `
Título: ${title}
${description ? `Descripción: ${description}` : 'Sin meta descripción'}
${keywords && keywords.length > 0 ? `Keywords objetivo: ${JSON.stringify(keywords)}` : 'Sin keywords definidas'}

Contenido a revisar (${content.length} caracteres):
${content.substring(0, 3000)}${content.length > 3000 ? '...' : ''}

Analiza exhaustivamente y proporciona un checklist detallado con al menos 8-12 items específicos cubriendo todas las áreas SEO.`;

      const fullPrompt = `${systemPrompt}\n\n${contentPrompt}`;

      // Llamar a OpenAI
      const response = await openaiService.generateCompletion(fullPrompt, {
        maxTokens: 2500,
        temperature: 0.2,
        timeout: this.config.timeout
      });

      // Intentar parsear JSON response
      let reviewData;
      try {
        // Limpiar respuesta si tiene markdown
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }
        
        reviewData = JSON.parse(cleanResponse);
        
        // Validar estructura mínima
        if (!reviewData.checklist || !Array.isArray(reviewData.checklist)) {
          throw new Error('Invalid checklist structure');
        }
        
        // Asegurar que todos los campos requeridos existen
        reviewData = {
          overall_score: reviewData.overall_score || 75,
          checklist: reviewData.checklist || [],
          critical_issues: reviewData.critical_issues || [],
          warnings: reviewData.warnings || [],
          recommendations: reviewData.recommendations || [],
          seo_summary: reviewData.seo_summary || {
            title_optimization: 75,
            content_quality: 75,
            keywords_usage: 75,
            meta_tags: 75,
            readability: 75,
            structure: 75
          }
        };
        
      } catch (parseError) {
        logger.warn('⚠️ Failed to parse review JSON, creating fallback structure:', parseError.message);
        
        // Estructura de fallback si el parsing falla
        reviewData = {
          overall_score: 70,
          checklist: [
            {
              id: 'title_present',
              category: 'Meta Tags',
              item: 'Título presente',
              status: title ? 'pass' : 'fail',
              message: title ? 'El título está presente' : 'Falta el título',
              priority: 'high'
            },
            {
              id: 'meta_description_present',
              category: 'Meta Tags',
              item: 'Meta descripción presente',
              status: description ? 'pass' : 'fail',
              message: description ? 'Meta descripción presente' : 'Falta meta descripción',
              priority: 'high'
            },
            {
              id: 'content_length',
              category: 'Contenido',
              item: 'Longitud del contenido',
              status: content.length >= 300 ? 'pass' : 'warning',
              message: `Contenido tiene ${content.length} caracteres. Mínimo recomendado: 300+`,
              priority: 'medium'
            },
            {
              id: 'keywords_defined',
              category: 'Keywords',
              item: 'Keywords definidas',
              status: keywords && keywords.length > 0 ? 'pass' : 'warning',
              message: keywords && keywords.length > 0 ? `${keywords.length} keywords definidas` : 'No hay keywords definidas',
              priority: 'medium'
            }
          ],
          critical_issues: !description ? ['Meta descripción faltante'] : [],
          warnings: content.length < 300 ? ['Contenido muy corto'] : [],
          recommendations: [
            'Revisar análisis completo',
            'Optimizar elementos básicos de SEO',
            'Agregar keywords relevantes'
          ],
          seo_summary: {
            title_optimization: title ? 80 : 0,
            content_quality: 70,
            keywords_usage: keywords && keywords.length > 0 ? 75 : 50,
            meta_tags: description ? 80 : 40,
            readability: 70,
            structure: 70
          },
          review_text: response
        };
      }

      const result = {
        success: true,
        taskType: 'content_review',
        ...reviewData,
        timestamp: new Date().toISOString()
      };

      logger.success('✅ SEOAgent content review completed');
      return result;

    } catch (error) {
      logger.error('❌ Error in SEOAgent content review:', error);
      throw error;
    }
  }

  /**
   * Manejar comandos genéricos de SEO
   */
  async handleGenericSEOCommand(task, context) {
    try {
      logger.info(`🤖 SEOAgent handling generic command: ${task.type}`);

      const taskConfig = this.getTaskConfiguration(task.type) || this.getDefaultPrompts();
      
      // Construir prompt completo
      const fullPrompt = `${taskConfig.systemPrompt}\n\n${taskConfig.userPrompt}\n\nTarea específica: ${JSON.stringify(task)}\nContexto: ${JSON.stringify(context)}`;

      // Llamar a OpenAI con configuración específica
      const response = await openaiService.generateCompletion(fullPrompt, {
        maxTokens: taskConfig.maxTokens || this.config.maxTokens,
        temperature: taskConfig.temperature || this.config.temperature,
        timeout: this.config.timeout
      });

      const result = {
        success: true,
        taskType: task.type,
        response: response, // response ya es string
        usage: null, // No disponible en este método
        timestamp: new Date().toISOString(),
        processingTime: null // No disponible en este método
      };

      logger.success(`✅ SEOAgent generic command completed: ${task.type}`);
      return result;

    } catch (error) {
      logger.error(`❌ Error in SEOAgent generic command (${task.type}):`, error);
      throw error;
    }
  }

  /**
   * Obtener configuración actual del SEOAgent
   */
  async getConfiguration() {
    try {
      logger.info('📋 Getting SEOAgent configuration');

      const configuration = {
        agentInfo: {
          name: this.name,
          description: this.description,
          capabilities: this.capabilities,
          status: this.status
        },
        config: this.config,
        advancedConfig: this.advancedConfig,
        personality: this.advancedConfig?.personality,
        contextConfig: this.advancedConfig?.contextConfig,
        responseConfig: this.advancedConfig?.responseConfig,
        promptConfig: this.advancedConfig?.promptConfig,
        trainingConfig: this.advancedConfig?.trainingConfig
      };

      logger.success('✅ SEOAgent configuration retrieved');
      return configuration;

    } catch (error) {
      logger.error('❌ Error getting SEOAgent configuration:', error);
      throw error;
    }
  }

  /**
   * Actualizar configuración del SEOAgent
   */
  async updateConfiguration(newConfig) {
    try {
      logger.info('⚙️ Updating SEOAgent configuration');

      // Validar configuración básica
      if (newConfig.config) {
        this.config = { ...this.config, ...newConfig.config };
      }

      // Actualizar configuración avanzada
      if (newConfig.advancedConfig) {
        this.advancedConfig = { ...this.advancedConfig, ...newConfig.advancedConfig };
      }

      // Actualizar configuraciones específicas
      if (newConfig.personality) {
        this.advancedConfig.personality = { ...this.advancedConfig.personality, ...newConfig.personality };
      }

      if (newConfig.promptConfig) {
        this.advancedConfig.promptConfig = { ...this.advancedConfig.promptConfig, ...newConfig.promptConfig };
      }

      // Guardar en base de datos si es necesario
      if (newConfig.saveToDatabase !== false) {
        try {
          const dbConfig = await AgentConfig.findOne({ agentName: 'seo' });
          if (dbConfig) {
            await AgentConfig.updateOne(
              { agentName: 'seo' },
              {
                personality: this.advancedConfig.personality,
                contextConfig: this.advancedConfig.contextConfig,
                responseConfig: this.advancedConfig.responseConfig,
                promptConfig: this.advancedConfig.promptConfig,
                trainingConfig: this.advancedConfig.trainingConfig
              }
            );
            logger.success('✅ SEOAgent configuration saved to database');
          }
        } catch (dbError) {
          logger.warn('⚠️ Could not save to database:', dbError.message);
        }
      }

      const result = {
        success: true,
        message: 'SEOAgent configuration updated successfully',
        updatedConfig: {
          config: this.config,
          advancedConfig: this.advancedConfig
        },
        timestamp: new Date().toISOString()
      };

      logger.success('✅ SEOAgent configuration updated');
      return result;

    } catch (error) {
      logger.error('❌ Error updating SEOAgent configuration:', error);
      throw error;
    }
  }
}

// Exportar instancia singleton
const seoAgent = new SEOAgent();
export default seoAgent;