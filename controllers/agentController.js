/**
 * Agent Controller - API endpoints para el sistema de agentes
 * Maneja la comunicación entre el frontend y el sistema de agentes
 */

import AgentOrchestrator from '../agents/core/AgentOrchestrator.js';
import BlogAgent from '../agents/specialized/BlogAgent.js';
import seoAgent from '../agents/specialized/SEOAgent.js';
import ServicesAgent from '../agents/specialized/services/ServicesAgent.js';
import eventAgent from '../agents/specialized/EventAgent.js';
import gerenteGeneral from '../agents/core/GerenteGeneral.js';
import centralizedContext from '../agents/context/CentralizedContextManager.js';
import openaiService from '../agents/services/OpenAIService.js';
import AgentConfig from '../models/AgentConfig.js';
import logger from '../utils/logger.js';

// ============================================
// 🚀 LAZY INITIALIZATION - OPTIMIZACIÓN
// ============================================
// Solo GerenteGeneral se activa al inicio
// Los demás agentes se activan bajo demanda

let isInitialized = false;
const initializeAgents = async () => {
  if (isInitialized) return;
  
  try {
    logger.info('🚀 Initializing Agent System (Lazy Mode)...');
    
    // Inicializar configuraciones por defecto si no existen
    logger.info('📋 Checking agent configurations...');
    await AgentConfig.initializeDefaults();
    
    // ========================================
    // 📦 REGISTRAR AGENTES (sin activar)
    // ========================================
    
    // Crear y registrar BlogAgent (LAZY)
    const blogAgent = new BlogAgent();
    const blogResult = AgentOrchestrator.registerAgentLazy(blogAgent);
    if (blogResult.success) {
      logger.info('📦 BlogAgent registered (lazy) - will activate on demand');
    }

    // Registrar SEOAgent (LAZY)
    const seoResult = AgentOrchestrator.registerAgentLazy(seoAgent);
    if (seoResult.success) {
      logger.info('📦 SEOAgent registered (lazy) - will activate on demand');
    }

    // Crear y registrar ServicesAgent (LAZY)
    const servicesAgent = new ServicesAgent();
    const servicesResult = AgentOrchestrator.registerAgentLazy(servicesAgent);
    if (servicesResult.success) {
      logger.info('📦 ServicesAgent registered (lazy) - will activate on demand');
    }

    // Registrar EventAgent (LAZY)
    const eventResult = AgentOrchestrator.registerAgentLazy(eventAgent);
    if (eventResult.success) {
      logger.info('📦 EventAgent registered (lazy) - will activate on demand');
    }

    // ========================================
    // ✅ ACTIVAR SOLO GERENTE GENERAL
    // ========================================
    // GerenteGeneral es el único que debe estar activo desde el inicio
    // Él se encargará de activar los demás según necesidad
    
    const gerenteRegistrationResult = await AgentOrchestrator.registerAgent(gerenteGeneral);
    
    if (gerenteRegistrationResult.success) {
      logger.success('✅ GerenteGeneral registered and ACTIVATED');
      logger.info('👔 GerenteGeneral ready to coordinate all agents');
      logger.info('💡 Other agents will activate on demand to reduce resource usage');
      isInitialized = true;
    } else {
      logger.error('❌ Failed to register GerenteGeneral:', gerenteRegistrationResult.error);
    }

    if (isInitialized) {
      logger.success('✅ Agent system initialized successfully (Lazy Mode)');
      logger.info(`📊 Agents registered: 5 | Active: 1 (GerenteGeneral)`);
    }
    
  } catch (error) {
    logger.error('❌ Error initializing agents:', error);
  }
};

// Inicializar agentes al importar
initializeAgents();

/**
 * GET /api/agents/status
 * Obtener estado general del sistema de agentes
 */
export const getAgentStatus = async (req, res) => {
  try {
    const agentsInfo = AgentOrchestrator.getAgentsInfo();
    const openaiStatus = openaiService.getStats();
    
    res.json({
      success: true,
      data: {
        system: {
          initialized: isInitialized,
          timestamp: new Date().toISOString()
        },
        orchestrator: agentsInfo,
        openai: openaiStatus,
        capabilities: [
          'content_optimization',
          'seo_analysis', 
          'tag_generation',
          'performance_analysis',
          'natural_language_processing',
          'services_management',
          'pricing_optimization',
          'portfolio_analysis'
        ]
      }
    });
    
  } catch (error) {
    logger.error('❌ Error getting agent status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/agents/command
 * Procesar comando de lenguaje natural
 */
export const processCommand = async (req, res) => {
  try {
    const { command, context = {}, target } = req.body;
    
    // Validación básica
    if (!command || typeof command !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Command is required and must be a string'
      });
    }
    
    if (command.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Command too long. Maximum 500 characters.'
      });
    }
    
    logger.info(`🎯 Processing command from ${req.user?.id || 'anonymous'}: "${command}"`);
    
    // Agregar información del usuario al contexto
    const enrichedContext = {
      ...context,
      user: req.user || null,
      timestamp: new Date(),
      source: 'api',
      targetAgent: target // Agregar target al contexto
    };
    
    // Procesar comando con el orquestador
    const result = await AgentOrchestrator.processCommand(command, enrichedContext);
    
    // Log del resultado
    if (result.success) {
      logger.success(`✅ Command processed successfully: ${result.agentName || 'unknown agent'}`);
    } else {
      logger.warn(`⚠️  Command failed: ${result.error}`);
    }
    
    res.json(result);
    
  } catch (error) {
    logger.error('❌ Error processing command:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * POST /api/agents/blog/optimize
 * Optimizar contenido específico de blog
 */
export const optimizeBlogContent = async (req, res) => {
  try {
    const { postId, slug, content, title } = req.body;
    
    if (!postId && !slug && !content) {
      return res.status(400).json({
        success: false,
        error: 'postId, slug, or content is required'
      });
    }
    
    logger.info(`🔧 Optimizing blog content: ${postId || slug || 'custom content'}`);
    
    // Crear task específico para optimización
    const task = {
      id: `optimize_${Date.now()}`,
      type: 'optimize_content',
      command: 'optimizar contenido',
      postId,
      slug,
      content,
      title
    };
    
    const context = {
      user: req.user,
      source: 'api_direct',
      action: 'optimize_content'
    };
    
    const result = await AgentOrchestrator.executeTask({
      agent: AgentOrchestrator.findAgentByType('BlogAgent'),
      task
    });
    
    res.json(result);
    
  } catch (error) {
    logger.error('❌ Error optimizing blog content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/agents/blog/analyze
 * Analizar contenido de blog
 */
export const analyzeBlogContent = async (req, res) => {
  try {
    const { postId, slug, category, limit } = req.body;
    
    logger.info('📊 Analyzing blog content');
    
    const task = {
      id: `analyze_${Date.now()}`,
      type: 'analyze_content', 
      command: 'analizar contenido',
      postId,
      slug,
      category,
      limit
    };
    
    const context = {
      user: req.user,
      source: 'api_direct',
      action: 'analyze_content'
    };
    
    const result = await AgentOrchestrator.executeTask({
      agent: AgentOrchestrator.findAgentByType('BlogAgent'),
      task
    });
    
    res.json(result);
    
  } catch (error) {
    logger.error('❌ Error analyzing blog content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/agents/blog/tags
 * Generar tags para contenido
 */
export const generateBlogTags = async (req, res) => {
  try {
    const { postId, slug, content, title } = req.body;
    
    if (!postId && !slug && !content) {
      return res.status(400).json({
        success: false,
        error: 'postId, slug, or content is required'
      });
    }
    
    logger.info(`🏷️ Generating tags for: ${postId || slug || 'custom content'}`);
    
    const task = {
      id: `tags_${Date.now()}`,
      type: 'generate_tags',
      command: 'generar tags',
      postId,
      slug,
      content,
      title
    };
    
    const context = {
      user: req.user,
      source: 'api_direct',
      action: 'generate_tags'
    };
    
    const result = await AgentOrchestrator.executeTask({
      agent: AgentOrchestrator.findAgentByType('BlogAgent'),
      task
    });
    
    res.json(result);
    
  } catch (error) {
    logger.error('❌ Error generating blog tags:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/agents/blog/seo
 * Optimizar SEO de contenido
 */
export const optimizeSEO = async (req, res) => {
  try {
    const { postId, slug } = req.body;
    
    if (!postId && !slug) {
      return res.status(400).json({
        success: false,
        error: 'postId or slug is required'
      });
    }
    
    logger.info(`🔍 SEO optimization for: ${postId || slug}`);
    
    const task = {
      id: `seo_${Date.now()}`,
      type: 'optimize_seo',
      command: 'optimizar seo',
      postId,
      slug
    };
    
    const context = {
      user: req.user,
      source: 'api_direct',
      action: 'optimize_seo'
    };
    
    const result = await AgentOrchestrator.executeTask({
      agent: AgentOrchestrator.findAgentByType('BlogAgent'),
      task
    });
    
    res.json(result);
    
  } catch (error) {
    logger.error('❌ Error optimizing SEO:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/agents/blog/performance
 * Analizar rendimiento del blog
 */
export const analyzeBlogPerformance = async (req, res) => {
  try {
    const { timeframe = '30d', category } = req.query;
    
    logger.info(`📈 Analyzing blog performance: ${timeframe}`);
    
    const task = {
      id: `performance_${Date.now()}`,
      type: 'analyze_performance',
      command: `analizar rendimiento ${timeframe}`,
      timeframe,
      category
    };
    
    const context = {
      user: req.user,
      source: 'api_direct',
      action: 'analyze_performance'
    };
    
    const result = await AgentOrchestrator.executeTask({
      agent: AgentOrchestrator.findAgentByType('BlogAgent'),
      task
    });
    
    res.json(result);
    
  } catch (error) {
    logger.error('❌ Error analyzing blog performance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/agents/capabilities
 * Obtener capacidades disponibles de los agentes
 */
export const getAgentCapabilities = async (req, res) => {
  try {
    const agentsInfo = AgentOrchestrator.getAgentsInfo();
    
    const capabilities = {
      natural_language: {
        available: openaiService.isAvailable(),
        description: 'Procesamiento de comandos en lenguaje natural',
        examples: [
          'optimizar el post "Mi primer artículo"',
          'analizar rendimiento del blog',
          'generar tags para el contenido sobre React',
          'revisar SEO de todos los posts'
        ]
      },
      blog_management: {
        available: true,
        description: 'Gestión completa de contenido del blog',
        features: [
          'Optimización de contenido',
          'Análisis SEO',
          'Generación de tags',
          'Análisis de rendimiento',
          'Sugerencias de mejora'
        ]
      },
      content_analysis: {
        available: true,
        description: 'Análisis profundo de contenido',
        metrics: [
          'Legibilidad',
          'Puntuación SEO',
          'Keywords principales',
          'Tópicos relevantes',
          'Tiempo de lectura'
        ]
      }
    };
    
    res.json({
      success: true,
      data: {
        agents: agentsInfo.agents.map(agent => ({
          name: agent.name,
          status: agent.isActive ? 'active' : 'inactive',
          capabilities: agent.capabilities,
          metrics: agent.metrics
        })),
        capabilities,
        systemMetrics: agentsInfo.metrics
      }
    });
    
  } catch (error) {
    logger.error('❌ Error getting agent capabilities:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/agents/reinitialize
 * Reinicializar el sistema de agentes
 */
export const reinitializeAgents = async (req, res) => {
  try {
    logger.info('🔄 Reinitializing agent system...');
    
    // Solo permitir a administradores
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    // Reinicializar sistema
    isInitialized = false;
    await AgentOrchestrator.shutdown();
    await initializeAgents();
    
    const agentsInfo = AgentOrchestrator.getAgentsInfo();
    
    res.json({
      success: true,
      message: 'Agent system reinitialized successfully',
      data: agentsInfo
    });
    
  } catch (error) {
    logger.error('❌ Error reinitializing agents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/agents/health
 * Health check del sistema de agentes
 */
export const getAgentHealth = async (req, res) => {
  try {
    const agentsInfo = AgentOrchestrator.getAgentsInfo();
    const openaiStats = openaiService.getStats();
    
    const health = {
      overall: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        orchestrator: {
          status: isInitialized ? 'healthy' : 'unhealthy',
          agents: agentsInfo.agents.length,
          activeAgents: agentsInfo.metrics.activeAgents
        },
        openai: {
          status: openaiStats.available ? 'healthy' : 'limited',
          model: openaiStats.model,
          cacheSize: openaiStats.cacheSize
        },
        agents: agentsInfo.agents.map(agent => ({
          name: agent.name,
          status: agent.isActive ? 'healthy' : 'unhealthy',
          lastActivity: agent.lastActivity,
          successRate: agent.metrics.successRate
        }))
      }
    };
    
    // Determinar estado general
    const unhealthyComponents = [
      !health.components.orchestrator.status === 'healthy',
      health.components.agents.some(agent => agent.status === 'unhealthy')
    ].filter(Boolean);
    
    if (unhealthyComponents.length > 0) {
      health.overall = 'degraded';
    }
    
    res.json({
      success: true,
      data: health
    });
    
  } catch (error) {
    logger.error('❌ Error getting agent health:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      health: {
        overall: 'unhealthy',
        error: error.message
      }
    });
  }
};

/**
 * GET /api/agents/config
 * Obtener configuración de todos los agentes
 */
export const getAgentConfigs = async (req, res) => {
  try {
    const configs = await AgentConfig.find({});
    
    // Si no hay configuraciones, inicializar con valores por defecto
    if (configs.length === 0) {
      await AgentConfig.initializeDefaults();
      const newConfigs = await AgentConfig.find({});
      return res.json({
        success: true,
        data: newConfigs
      });
    }
    
    res.json({
      success: true,
      data: configs
    });
    
  } catch (error) {
    logger.error('❌ Error getting agent configs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/agents/config/:agentName
 * Obtener configuración de un agente específico
 */
export const getAgentConfig = async (req, res) => {
  try {
    const { agentName } = req.params;
    
    let config = await AgentConfig.findOne({ agentName });
    
    // Si no existe, crear con valores por defecto
    if (!config) {
      await AgentConfig.initializeDefaults();
      config = await AgentConfig.findOne({ agentName });
    }
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuración no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: config
    });
    
  } catch (error) {
    logger.error('❌ Error getting agent config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * PUT /api/agents/config/:agentName
 * Actualizar configuración de un agente
 */
export const updateAgentConfig = async (req, res) => {
  try {
    const { agentName } = req.params;
    const { enabled, config, personality, contextConfig, responseConfig, promptConfig } = req.body;
    const userId = req.auth.userId; // Clerk user ID
    
    // ========== VALIDACIONES DE CONFIG BÁSICA ==========
    if (config) {
      if (config.timeout && (config.timeout < 5 || config.timeout > 120)) {
        return res.status(400).json({
          success: false,
          error: 'Timeout debe estar entre 5 y 120 segundos'
        });
      }
      
      if (config.maxTokens && (config.maxTokens < 500 || config.maxTokens > 4000)) {
        return res.status(400).json({
          success: false,
          error: 'MaxTokens debe estar entre 500 y 4000'
        });
      }
      
      if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 1)) {
        return res.status(400).json({
          success: false,
          error: 'Temperature debe estar entre 0 y 1'
        });
      }
      
      if (config.maxTagsPerPost && (config.maxTagsPerPost < 3 || config.maxTagsPerPost > 20)) {
        return res.status(400).json({
          success: false,
          error: 'MaxTagsPerPost debe estar entre 3 y 20'
        });
      }
      
      if (config.seoScoreThreshold && (config.seoScoreThreshold < 0 || config.seoScoreThreshold > 100)) {
        return res.status(400).json({
          success: false,
          error: 'SEO Score Threshold debe estar entre 0 y 100'
        });
      }
    }
    
    // ========== VALIDACIONES DE PERSONALIDAD ==========
    if (personality) {
      const validArchetypes = ['analyst', 'coach', 'expert', 'assistant', 'guardian', 'innovator'];
      if (personality.archetype && !validArchetypes.includes(personality.archetype)) {
        return res.status(400).json({
          success: false,
          error: `Archetype debe ser uno de: ${validArchetypes.join(', ')}`
        });
      }
      
      if (personality.traits) {
        const validTraits = ['analytical', 'friendly', 'precise', 'creative', 'professional', 'enthusiastic', 'technical', 'supportive'];
        for (const trait of personality.traits) {
          if (!validTraits.includes(trait.trait)) {
            return res.status(400).json({
              success: false,
              error: `Trait inválido: ${trait.trait}. Debe ser uno de: ${validTraits.join(', ')}`
            });
          }
          if (trait.intensity < 1 || trait.intensity > 10) {
            return res.status(400).json({
              success: false,
              error: 'Intensity de trait debe estar entre 1 y 10'
            });
          }
        }
      }
      
      if (personality.communicationStyle) {
        const style = personality.communicationStyle;
        if (style.formality && (style.formality < 1 || style.formality > 10)) {
          return res.status(400).json({
            success: false,
            error: 'Formality debe estar entre 1 y 10'
          });
        }
        if (style.enthusiasm && (style.enthusiasm < 1 || style.enthusiasm > 10)) {
          return res.status(400).json({
            success: false,
            error: 'Enthusiasm debe estar entre 1 y 10'
          });
        }
        if (style.technicality && (style.technicality < 1 || style.technicality > 10)) {
          return res.status(400).json({
            success: false,
            error: 'Technicality debe estar entre 1 y 10'
          });
        }
      }
    }
    
    // ========== VALIDACIONES DE PROMPT CONFIG ==========
    if (promptConfig) {
      if (promptConfig.contextWindow && (promptConfig.contextWindow < 5 || promptConfig.contextWindow > 50)) {
        return res.status(400).json({
          success: false,
          error: 'Context Window debe estar entre 5 y 50'
        });
      }
    }
    
    // Preparar actualización
    const updateData = {
      ...(enabled !== undefined && { enabled }),
      ...(config && { config }),
      ...(personality && { personality }),
      ...(contextConfig && { contextConfig }),
      ...(responseConfig && { responseConfig }),
      ...(promptConfig && { promptConfig }),
      updatedBy: userId
    };
    
    // Actualizar configuración
    const updatedConfig = await AgentConfig.findOneAndUpdate(
      { agentName },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );
    
    // Actualizar el agente en el orquestador si está registrado
    if (agentName === 'blog') {
      const agent = AgentOrchestrator.agents.get('BlogAgent');
      if (agent) {
        // Recargar toda la configuración desde la base de datos
        await agent.reloadConfiguration();
        logger.info(`✅ BlogAgent configuration reloaded from database`);
      }
    }
    
    logger.info(`✅ Agent config updated: ${agentName} by user ${userId}`);
    
    res.json({
      success: true,
      data: updatedConfig,
      message: 'Configuración actualizada exitosamente'
    });
    
  } catch (error) {
    logger.error('❌ Error updating agent config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/agents/config/:agentName/reset
 * Resetear configuración de un agente a valores por defecto
 */
export const resetAgentConfig = async (req, res) => {
  try {
    const { agentName } = req.params;
    const userId = req.auth.userId;
    
    // Eliminar configuración existente
    await AgentConfig.deleteOne({ agentName });
    
    // Reinicializar con valores por defecto
    await AgentConfig.initializeDefaults();
    
    const config = await AgentConfig.findOne({ agentName });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'No se pudo resetear la configuración'
      });
    }
    
    // Actualizar el agente en el orquestador
    if (agentName === 'BlogAgent') {
      const agent = AgentOrchestrator.agents.get('BlogAgent');
      if (agent) {
        Object.assign(agent.config, config.config);
        logger.info(`✅ BlogAgent configuration reset in orchestrator`);
      }
    }
    
    logger.info(`✅ Agent config reset: ${agentName} by user ${userId}`);
    
    res.json({
      success: true,
      data: config,
      message: 'Configuración reseteada a valores por defecto'
    });
    
  } catch (error) {
    logger.error('❌ Error resetting agent config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * 💬 Chat conversacional con BlogAgent
 * POST /api/agents/blog/chat
 */
export const chatWithBlogAgent = async (req, res) => {
  try {
    await initializeAgents();
    
    const { message, context } = req.body;
    const userId = req.auth?.userId;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El mensaje es requerido'
      });
    }
    
    logger.info(`💬 Chat request from user ${userId}: "${message.substring(0, 50)}..."`);
    
    // Obtener BlogAgent
    const blogAgent = AgentOrchestrator.getAgent('BlogAgent');
    if (!blogAgent) {
      return res.status(503).json({
        success: false,
        error: 'BlogAgent no está disponible'
      });
    }
    
    // Construir contexto completo para el agente
    const fullContext = {
      userId,
      currentContent: context?.content || '',
      title: context?.title || '',
      category: context?.category || '',
      tags: context?.tags || [],
      chatHistory: context?.chatHistory || [],
      userMessage: message
    };
    
    // Procesar con el agente
    const response = await blogAgent.chat(fullContext);
    
    logger.success(`✅ Chat response generated for user ${userId}`);
    
    res.json({
      success: true,
      data: {
        message: response.message,
        suggestions: response.suggestions || [],
        actions: response.actions || [],
        metadata: response.metadata || {}
      }
    });
    
  } catch (error) {
    logger.error('❌ Error in chat with BlogAgent:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error procesando el chat'
    });
  }
};

/**
 * ⚡ Generar contenido con BlogAgent
 * POST /api/agents/blog/generate-content
 */
export const generateContent = async (req, res) => {
  try {
    await initializeAgents();
    
    const { 
      type, // 'full' | 'section' | 'extend' | 'improve' | 'autocomplete'
      title,
      category,
      currentContent,
      style,
      wordCount,
      focusKeywords,
      instruction
    } = req.body;
    
    const userId = req.auth?.userId;
    
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'El tipo de generación es requerido'
      });
    }
    
    logger.info(`⚡ Content generation request: ${type} for user ${userId}`);
    
    // Obtener BlogAgent
    const blogAgent = AgentOrchestrator.getAgent('BlogAgent');
    if (!blogAgent) {
      return res.status(503).json({
        success: false,
        error: 'BlogAgent no está disponible'
      });
    }
    
    let result;
    
    switch (type) {
      case 'full':
        result = await blogAgent.generateFullPost({
          title,
          category,
          style: style || 'professional',
          wordCount: wordCount || 800,
          focusKeywords: focusKeywords || []
        });
        break;
        
      case 'section':
        result = await blogAgent.generateContentSection({
          title: instruction || title,
          context: currentContent,
          wordCount: wordCount || 200
        });
        break;
        
      case 'extend':
        result = await blogAgent.extendContent({
          currentContent,
          instruction: instruction || 'Continúa el contenido de forma natural',
          wordCount: wordCount || 150
        });
        break;
        
      case 'improve':
        result = await blogAgent.improveContent({
          content: currentContent,
          instruction: instruction || 'Mejora la calidad y claridad del contenido'
        });
        break;
        
      case 'autocomplete':
        result = await blogAgent.suggestNextParagraph({
          currentContent,
          context: { title, category }
        });
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Tipo de generación no válido'
        });
    }
    
    logger.success(`✅ Content generated (${type}) for user ${userId}`);
    
    res.json({
      success: true,
      data: {
        content: result.content || result.text || result,
        metadata: result.metadata || {},
        suggestions: result.suggestions || [],
        seoScore: result.seoScore || null
      }
    });
    
  } catch (error) {
    logger.error('❌ Error generating content:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error generando contenido'
    });
  }
};

/**
 * 🧠 Procesar patrón contextual #...#
 * Endpoint para el sistema avanzado de sugerencias con patrones
 */
export const processContextPattern = async (req, res) => {
  try {
    await initializeAgents();

    const { 
      patternType, 
      contextText, 
      selectedText, 
      surroundingContext, 
      modifiers 
    } = req.body;

    // Validaciones
    if (!patternType) {
      return res.status(400).json({
        success: false,
        error: 'Pattern type is required'
      });
    }

    if (!selectedText && !contextText) {
      return res.status(400).json({
        success: false,
        error: 'Selected text or context text is required'
      });
    }

    logger.info(`🧠 Processing context pattern: ${patternType} - "${contextText || selectedText.substring(0, 50)}..."`);

    // Obtener el BlogAgent
    const agent = await AgentOrchestrator.getAgent('BlogAgent');
    
    if (!agent) {
      return res.status(500).json({
        success: false,
        error: 'BlogAgent not available'
      });
    }

    // Procesar el patrón
    const startTime = Date.now();
    
    const result = await agent.processContextPattern({
      patternType,
      contextText: contextText || '',
      selectedText: selectedText || contextText,
      surroundingContext: surroundingContext || {},
      modifiers: modifiers || {}
    });

    const processingTime = Date.now() - startTime;

    logger.info(`✅ Pattern processed successfully in ${processingTime}ms`);

    res.json({
      success: true,
      data: {
        result: result.result,
        patternType: result.patternType,
        originalText: result.originalText,
        confidence: result.confidence,
        metadata: {
          processingTime,
          timestamp: new Date().toISOString(),
          modifiersApplied: modifiers || {}
        }
      }
    });

  } catch (error) {
    logger.error('❌ Error processing context pattern:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error procesando patrón contextual',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// ============================================================================
// GERENTE GENERAL ENDPOINTS
// ============================================================================

/**
 * POST /api/gerente/command
 * Procesar comando a través del Gerente General
 */
export const processGerenteCommand = async (req, res) => {
  try {
    const { 
      command, 
      action = 'coordinate',
      params = {},
      sessionId,
      targetAgent 
    } = req.body;

    if (!command && action !== 'status' && action !== 'session_info') {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un comando'
      });
    }

    logger.info(`👔 Gerente procesando: ${action} - ${command || 'N/A'}`);

    // DEBUG: Ver qué viene en el request
    logger.info('🔍 DEBUG Request Auth:', { 
      'params.userId': params.userId,
      'req.userId': req.userId,
      'req.user.id': req.user?.id,
      'req.user.clerkId': req.user?.clerkId,
      'req.auth.userId': req.auth?.userId
    });

    // Construir contexto - obtener userId de múltiples fuentes
    // 🔧 FIX: Usar clerkId para sesiones (consistente con frontend)
    // El clerkId es el que usa el frontend para consultar sesiones
    const clerkId = req.auth?.userId || req.user?.clerkId;
    const mongoUserId = req.userId || req.user?.id;
    
    const context = {
      sessionId,
      userId: clerkId || mongoUserId || params.userId, // Priorizar clerkId para sesiones
      mongoUserId: mongoUserId, // Mantener MongoDB ID para operaciones de DB
      userRole: req.user?.role || 'guest',
      clerkId: clerkId
    };

    // Validar que tengamos userId
    if (!context.userId) {
      logger.warn('⚠️ No se pudo obtener userId del request');
      return res.status(401).json({
        success: false,
        error: 'Se requiere autenticación. Por favor, inicia sesión.',
        code: 'USER_NOT_AUTHENTICATED'
      });
    }

    logger.info(`✅ UserId obtenido: ${context.userId} (Clerk: ${context.clerkId})`);

    // Construir tarea
    const task = {
      action,
      command,
      params,
      targetAgent
    };

    // Procesar con GerenteGeneral
    const result = await gerenteGeneral.processTask(task, context);

    // Responder
    res.json({
      success: result.success !== false,
      data: result,
      sessionId: result.sessionId || sessionId
    });

  } catch (error) {
    logger.error('❌ Error en processGerenteCommand:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error procesando comando del Gerente'
    });
  }
};

/**
 * GET /api/gerente/status
 * Obtener estado completo del sistema desde Gerente
 */
export const getGerenteStatus = async (req, res) => {
  try {
    const result = await gerenteGeneral.processTask({
      action: 'status'
    }, {
      userId: req.auth?.userId || req.user?.clerkId || 'anonymous',
      userRole: req.user?.role || 'guest'
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('❌ Error en getGerenteStatus:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error obteniendo estado del sistema'
    });
  }
};

/**
 * GET /api/gerente/sessions/:sessionId
 * Obtener información de sesión específica
 */
export const getGerenteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere sessionId'
      });
    }

    const result = await gerenteGeneral.processTask({
      action: 'session_info'
    }, {
      sessionId,
      userId: req.auth?.userId || req.user?.clerkId || 'anonymous',
      userRole: req.user?.role || 'guest'
    });

    res.json({
      success: result.success !== false,
      data: result
    });

  } catch (error) {
    logger.error('❌ Error en getGerenteSession:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error obteniendo información de sesión'
    });
  }
};

/**
 * GET /api/gerente/sessions/user/:userId
 * Obtener sesiones de un usuario
 */
export const getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere userId'
      });
    }

    // Verificar permisos: solo el mismo usuario o admin
    const requestClerkId = req.auth?.userId || req.user?.clerkId;
    const userRole = req.user?.role;

    // El userId del parámetro es un clerkId del frontend
    if (requestClerkId !== userId && userRole !== 'admin' && userRole !== 'superadmin') {
      logger.warn(`⚠️ Acceso denegado: requestClerkId=${requestClerkId}, userId=${userId}`);
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para acceder a estas sesiones'
      });
    }

    logger.info(`📋 Buscando sesiones para userId (clerkId): ${userId}`);
    const sessions = await centralizedContext.getUserSessions(userId, parseInt(limit));

    res.json({
      success: true,
      data: {
        userId,
        sessions,
        count: sessions.length
      }
    });

  } catch (error) {
    logger.error('❌ Error en getUserSessions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error obteniendo sesiones del usuario'
    });
  }
};

/**
 * POST /api/gerente/sessions/:sessionId/complete
 * Completar/finalizar una sesión
 */
export const completeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere sessionId'
      });
    }

    const success = await centralizedContext.completeSession(sessionId);

    res.json({
      success,
      message: success ? 'Sesión completada exitosamente' : 'Error completando sesión',
      sessionId
    });

  } catch (error) {
    logger.error('❌ Error en completeSession:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error completando sesión'
    });
  }
};

/**
 * GET /api/gerente/health
 * Health check del Gerente General
 */
export const getGerenteHealth = async (req, res) => {
  try {
    const health = await gerenteGeneral.healthCheck();

    res.json({
      success: health.status === 'healthy',
      data: health
    });

  } catch (error) {
    logger.error('❌ Error en getGerenteHealth:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error en health check'
    });
  }
};

/**
 * GET /api/gerente/config
 * Obtener configuración del Gerente General
 */
export const getGerenteConfig = async (req, res) => {
  try {
    const configSummary = gerenteGeneral.getConfigurationSummary();

    if (!configSummary) {
      return res.status(404).json({
        success: false,
        error: 'Configuración del Gerente no encontrada'
      });
    }

    res.json({
      success: true,
      data: configSummary
    });

  } catch (error) {
    logger.error('❌ Error en getGerenteConfig:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error obteniendo configuración del Gerente'
    });
  }
};

/**
 * PUT /api/gerente/config
 * Actualizar configuración del Gerente General
 */
export const updateGerenteConfig = async (req, res) => {
  try {
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren datos para actualizar'
      });
    }

    // Validar que el usuario tiene permisos (admin/superadmin)
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para modificar la configuración del Gerente'
      });
    }

    const success = await gerenteGeneral.updateConfiguration(updates);

    if (success) {
      const updatedConfig = gerenteGeneral.getConfigurationSummary();
      
      res.json({
        success: true,
        message: 'Configuración actualizada exitosamente',
        data: updatedConfig
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error actualizando configuración'
      });
    }

  } catch (error) {
    logger.error('❌ Error en updateGerenteConfig:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error actualizando configuración del Gerente'
    });
  }
};

/**
 * POST /api/gerente/config/reload
 * Recargar configuración del Gerente desde la base de datos
 */
export const reloadGerenteConfig = async (req, res) => {
  try {
    // Verificar permisos
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para recargar la configuración'
      });
    }

    await gerenteGeneral.loadConfiguration();
    const configSummary = gerenteGeneral.getConfigurationSummary();

    res.json({
      success: true,
      message: 'Configuración recargada desde la base de datos',
      data: configSummary
    });

  } catch (error) {
    logger.error('❌ Error en reloadGerenteConfig:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error recargando configuración'
    });
  }
};

/**
 * GET /api/gerente/routing-rules
 * Obtener reglas de routing del GerenteGeneral
 */
export const getGerenteRoutingRules = async (req, res) => {
  try {
    const configSummary = gerenteGeneral.getConfigurationSummary();

    if (!configSummary || !configSummary.routingConfig) {
      return res.status(404).json({
        success: false,
        error: 'Reglas de routing no encontradas'
      });
    }

    res.json({
      success: true,
      data: configSummary.routingConfig
    });

  } catch (error) {
    logger.error('❌ Error en getGerenteRoutingRules:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error obteniendo reglas de routing'
    });
  }
};

/**
 * PUT /api/gerente/routing-rules
 * Actualizar reglas de routing del GerenteGeneral
 */
export const updateGerenteRoutingRules = async (req, res) => {
  try {
    const newRules = req.body;

    if (!newRules || Object.keys(newRules).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Datos de reglas de routing requeridos'
      });
    }

    // Actualizar en la base de datos
    const success = await gerenteGeneral.updateConfiguration({
      routingConfig: newRules
    });

    if (success) {
      const updatedConfig = gerenteGeneral.getConfigurationSummary();
      
      res.json({
        success: true,
        message: 'Reglas de routing actualizadas exitosamente',
        data: updatedConfig.routingConfig
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error actualizando reglas de routing'
      });
    }

  } catch (error) {
    logger.error('❌ Error en updateGerenteRoutingRules:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error actualizando reglas de routing'
    });
  }
};

export default {
  getAgentStatus,
  processCommand,
  optimizeBlogContent,
  analyzeBlogContent,
  generateBlogTags,
  optimizeSEO,
  analyzeBlogPerformance,
  getAgentCapabilities,
  reinitializeAgents,
  getAgentHealth,
  getAgentConfigs,
  getAgentConfig,
  updateAgentConfig,
  resetAgentConfig,
  chatWithBlogAgent,
  generateContent,
  processContextPattern,
  // Gerente General endpoints
  processGerenteCommand,
  getGerenteStatus,
  getGerenteSession,
  getUserSessions,
  completeSession,
  getGerenteHealth,
  getGerenteConfig,
  updateGerenteConfig,
  reloadGerenteConfig,
  getGerenteRoutingRules,
  updateGerenteRoutingRules
};