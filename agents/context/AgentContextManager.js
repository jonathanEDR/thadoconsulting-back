/**
 * AgentContextManager - Sistema avanzado de contexto para agentes AI
 * Maneja memoria persistente, contexto inteligente y optimización de tokens
 */

import mongoose from 'mongoose';
import logger from '../../utils/logger.js';

// Schema para conversaciones de agentes
const AgentConversationSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  agentName: { type: String, required: true }, // índice compuesto más abajo
  userId: { type: String }, // índice compuesto más abajo
  userRole: { type: String, index: true },
  
  // Contexto de la conversación
  context: {
    // Información del proyecto/empresa
    projectInfo: {
      name: { type: String, default: 'Web Scuti' },
      type: { type: String, default: 'tech_blog' },
      domain: { type: String, default: 'technology' },
      language: { type: String, default: 'es-ES' },
      tone: { type: String, default: 'professional_friendly' }
    },
    
    // Información del usuario
    userContext: {
      expertise: { type: String, default: 'intermediate' },
      preferences: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
      history: [{ type: String }],
      commonTasks: [{ type: String }]
    },
    
    // Contexto específico del agente
    agentContext: {
      specialization: { type: String },
      personality: { type: String },
      communicationStyle: { type: String },
      expertise_areas: [{ type: String }],
      capabilities: [{ type: String }],
      limitations: [{ type: String }]
    },
    
    // Contexto de la sesión actual
    sessionContext: {
      startTime: { type: Date, default: Date.now },
      lastActivity: { type: Date, default: Date.now },
      tasksFocus: [{ type: String }],
      currentGoals: [{ type: String }],
      completedTasks: [{ type: String }],
      pendingTasks: [{ type: String }]
    }
  },
  
  // Historial de mensajes (optimizado para tokens)
  messages: [{
    role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    tokenCount: { type: Number, default: 0 },
    importance: { type: Number, default: 1, min: 0, max: 10 }, // Para priorización
    summary: { type: String } // Resumen para contexto reducido
  }],
  
  // Métricas y optimización
  metrics: {
    totalTokensUsed: { type: Number, default: 0 },
    totalInteractions: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
    satisfactionScore: { type: Number, default: 0, min: 0, max: 10 },
    lastOptimized: { type: Date, default: Date.now }
  },
  
  // Estados y flags
  status: { 
    type: String, 
    enum: ['active', 'idle', 'archived', 'optimized'], 
    default: 'active' 
  },
  
  // Configuración específica
  settings: {
    maxTokens: { type: Number, default: 4000 },
    contextWindow: { type: Number, default: 10 }, // Últimos N mensajes
    autoOptimize: { type: Boolean, default: true },
    personalizedPrompts: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
  collection: 'agent_conversations'
});

// Índices para optimización
AgentConversationSchema.index({ sessionId: 1, agentName: 1 });
AgentConversationSchema.index({ userId: 1, createdAt: -1 });
AgentConversationSchema.index({ 'context.sessionContext.lastActivity': -1 });
AgentConversationSchema.index({ status: 1, createdAt: -1 });

const AgentConversation = mongoose.model('AgentConversation', AgentConversationSchema);

export class AgentContextManager {
  constructor() {
    this.activeConversations = new Map(); // Cache en memoria
    this.contextTemplates = new Map(); // Templates por tipo de agente
    this.tokenOptimizer = new TokenOptimizer();
    
    logger.info('🧠 AgentContextManager initialized');
  }

  /**
   * Crear o recuperar contexto de conversación
   */
  async getOrCreateContext(sessionId, agentName, userInfo = {}) {
    try {
      // Buscar en cache primero
      const cacheKey = `${sessionId}_${agentName}`;
      if (this.activeConversations.has(cacheKey)) {
        const cached = this.activeConversations.get(cacheKey);
        // Verificar si no está muy viejo (30 minutos)
        if (Date.now() - cached.lastAccessed < 30 * 60 * 1000) {
          cached.lastAccessed = Date.now();
          return cached.context;
        }
      }

      // Buscar en base de datos
      let conversation = await AgentConversation.findOne({
        sessionId,
        agentName,
        status: { $in: ['active', 'idle'] }
      }).sort({ createdAt: -1 });

      if (!conversation) {
        // Crear nueva conversación
        conversation = await this.createNewConversation(sessionId, agentName, userInfo);
      } else {
        // Actualizar actividad
        conversation.context.sessionContext.lastActivity = new Date();
        conversation.status = 'active';
        await conversation.save();
      }

      // Guardar en cache
      const contextData = {
        context: conversation,
        lastAccessed: Date.now()
      };
      this.activeConversations.set(cacheKey, contextData);

      return conversation;

    } catch (error) {
      logger.error('❌ Error getting context:', error);
      throw error;
    }
  }

  /**
   * Crear nueva conversación con contexto inicial
   */
  async createNewConversation(sessionId, agentName, userInfo = {}) {
    try {
      const agentTemplate = this.getAgentTemplate(agentName);
      
      const conversation = new AgentConversation({
        sessionId,
        agentName,
        userId: userInfo.id,
        userRole: userInfo.role,
        
        context: {
          projectInfo: {
            name: 'Web Scuti',
            type: 'tech_blog',
            domain: 'technology',
            language: 'es-ES',
            tone: 'professional_friendly'
          },
          
          userContext: {
            expertise: userInfo.expertise || 'intermediate',
            preferences: userInfo.preferences || {},
            history: [],
            commonTasks: []
          },
          
          agentContext: agentTemplate,
          
          sessionContext: {
            startTime: new Date(),
            lastActivity: new Date(),
            tasksFocus: [],
            currentGoals: [],
            completedTasks: [],
            pendingTasks: []
          }
        },
        
        messages: [],
        settings: {
          maxTokens: agentTemplate.maxTokens || 4000,
          contextWindow: agentTemplate.contextWindow || 10,
          autoOptimize: true,
          personalizedPrompts: true
        }
      });

      await conversation.save();
      
      logger.info(`✅ New conversation created: ${sessionId} - ${agentName}`);
      return conversation;

    } catch (error) {
      logger.error('❌ Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Agregar mensaje a la conversación
   */
  async addMessage(sessionId, agentName, message) {
    try {
      const conversation = await this.getOrCreateContext(sessionId, agentName);
      
      // Calcular tokens del mensaje
      const tokenCount = this.tokenOptimizer.estimateTokens(message.content);
      
      const messageData = {
        ...message,
        tokenCount,
        timestamp: new Date(),
        importance: this.calculateMessageImportance(message, conversation)
      };

      conversation.messages.push(messageData);
      conversation.metrics.totalInteractions++;
      conversation.metrics.totalTokensUsed += tokenCount;
      conversation.context.sessionContext.lastActivity = new Date();

      // Optimizar si es necesario
      if (conversation.settings.autoOptimize) {
        await this.optimizeConversationTokens(conversation);
      }

      await conversation.save();
      
      // Actualizar cache
      const cacheKey = `${sessionId}_${agentName}`;
      if (this.activeConversations.has(cacheKey)) {
        this.activeConversations.get(cacheKey).context = conversation;
        this.activeConversations.get(cacheKey).lastAccessed = Date.now();
      }

      return conversation;

    } catch (error) {
      logger.error('❌ Error adding message:', error);
      throw error;
    }
  }

  /**
   * Generar contexto optimizado para OpenAI
   */
  async generateOptimizedContext(sessionId, agentName, currentTask = null) {
    try {
      const conversation = await this.getOrCreateContext(sessionId, agentName);
      
      // Construir prompt del sistema personalizado
      const systemPrompt = this.buildSystemPrompt(conversation, currentTask);
      
      // Seleccionar mensajes importantes para el contexto
      const contextMessages = this.selectContextMessages(conversation);
      
      // Preparar contexto adicional relevante
      const additionalContext = await this.gatherRelevantContext(conversation, currentTask);
      
      return {
        systemPrompt,
        messages: contextMessages,
        additionalContext,
        tokenEstimate: this.tokenOptimizer.estimateTotal(systemPrompt, contextMessages, additionalContext),
        conversationId: conversation._id
      };

    } catch (error) {
      logger.error('❌ Error generating optimized context:', error);
      throw error;
    }
  }

  /**
   * Construir prompt del sistema personalizado
   */
  buildSystemPrompt(conversation, currentTask = null) {
    const { projectInfo, userContext, agentContext, sessionContext } = conversation.context;
    
    let prompt = `Eres ${agentContext.personality || agentContext.specialization}, un agente AI especializado que trabaja para ${projectInfo.name}.

CONTEXTO DEL PROYECTO:
- Empresa: ${projectInfo.name} (${projectInfo.type})
- Dominio: ${projectInfo.domain}
- Idioma: ${projectInfo.language}
- Tono: ${projectInfo.tone}

TU ESPECIALIZACIÓN:
- Área: ${agentContext.specialization}
- Personalidad: ${agentContext.personality}
- Estilo: ${agentContext.communicationStyle}
- Capacidades: ${agentContext.capabilities?.join(', ') || 'Análisis y optimización'}

CONTEXTO DEL USUARIO:
- Nivel: ${userContext.expertise}
- Rol: ${conversation.userRole || 'usuario'}
- Tareas comunes: ${userContext.commonTasks?.join(', ') || 'gestión de contenido'}

SESIÓN ACTUAL:
- Enfoque: ${sessionContext.tasksFocus?.join(', ') || 'optimización de contenido'}
- Objetivos: ${sessionContext.currentGoals?.join(', ') || 'mejorar rendimiento del blog'}
- Completadas: ${sessionContext.completedTasks?.length || 0} tareas`;

    if (currentTask) {
      prompt += `

TAREA ACTUAL: ${currentTask.type || 'análisis'}
${currentTask.description ? `Descripción: ${currentTask.description}` : ''}
${currentTask.parameters ? `Parámetros: ${JSON.stringify(currentTask.parameters)}` : ''}`;
    }

    prompt += `

INSTRUCCIONES:
1. Responde siempre en español (${projectInfo.language})
2. Mantén un tono ${projectInfo.tone}
3. Sé específico y actionable en tus recomendaciones
4. Utiliza tu especialización en ${agentContext.specialization}
5. Considera el nivel ${userContext.expertise} del usuario
6. Enfócate en resultados prácticos y medibles

${agentContext.limitations?.length ? `LIMITACIONES: ${agentContext.limitations.join(', ')}` : ''}`;

    return prompt;
  }

  /**
   * Seleccionar mensajes más relevantes para el contexto
   */
  selectContextMessages(conversation) {
    const { messages, settings } = conversation;
    const maxMessages = settings.contextWindow || 10;
    
    if (messages.length <= maxMessages) {
      return messages;
    }

    // Algoritmo de selección inteligente:
    // 1. Siempre incluir los últimos mensajes
    // 2. Incluir mensajes con alta importancia
    // 3. Incluir mensajes que contienen información clave
    
    const recentMessages = messages.slice(-Math.floor(maxMessages * 0.6)); // 60% recientes
    const importantMessages = messages
      .filter(msg => msg.importance >= 7)
      .slice(-Math.floor(maxMessages * 0.4)); // 40% importantes
    
    // Combinar y deduplicar
    const selectedMessages = [...new Map(
      [...importantMessages, ...recentMessages].map(msg => [msg._id?.toString() || msg.timestamp, msg])
    ).values()];

    // Ordenar por timestamp
    return selectedMessages
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-maxMessages);
  }

  /**
   * Recopilar contexto relevante adicional
   */
  async gatherRelevantContext(conversation, currentTask = null) {
    const context = {
      recentBlogPosts: null,
      userStats: null,
      systemMetrics: null
    };

    try {
      // Si es BlogAgent, obtener posts recientes
      if (conversation.agentName === 'BlogAgent') {
        const BlogPost = (await import('../../models/BlogPost.js')).default;
        context.recentBlogPosts = await BlogPost.find({ isPublished: true })
          .select('title slug category publishedAt views')
          .sort({ publishedAt: -1 })
          .limit(5)
          .populate('category', 'name');
      }

      // Obtener estadísticas del usuario si está disponible
      if (conversation.userId) {
        const User = (await import('../../models/User.js')).default;
        const user = await User.findById(conversation.userId).select('blogStats createdAt');
        if (user) {
          context.userStats = {
            memberSince: user.createdAt,
            blogActivity: user.blogStats
          };
        }
      }

    } catch (error) {
      logger.warn('⚠️  Could not gather additional context:', error.message);
    }

    return context;
  }

  /**
   * Calcular importancia de un mensaje
   */
  calculateMessageImportance(message, conversation) {
    let importance = 5; // Base: neutral
    
    const content = message.content.toLowerCase();
    
    // Aumentar importancia por palabras clave
    const importantKeywords = ['error', 'problema', 'urgente', 'crítico', 'optimizar', 'análisis'];
    const keywordMatches = importantKeywords.filter(keyword => content.includes(keyword));
    importance += keywordMatches.length * 0.5;
    
    // Aumentar si es una pregunta específica
    if (content.includes('?') || content.includes('cómo') || content.includes('por qué')) {
      importance += 1;
    }
    
    // Aumentar si menciona datos específicos (IDs, números, etc.)
    if (/\b[0-9a-f]{24}\b/.test(content) || /\d+/.test(content)) {
      importance += 1;
    }
    
    // Aumentar si es del usuario (vs assistant)
    if (message.role === 'user') {
      importance += 0.5;
    }
    
    // Aumentar si es reciente
    const messageAge = Date.now() - new Date(message.timestamp || Date.now()).getTime();
    if (messageAge < 5 * 60 * 1000) { // Últimos 5 minutos
      importance += 1;
    }
    
    return Math.min(Math.max(importance, 1), 10); // Clamp entre 1-10
  }

  /**
   * Optimizar tokens de conversación
   */
  async optimizeConversationTokens(conversation) {
    try {
      const totalTokens = conversation.metrics.totalTokensUsed;
      const maxTokens = conversation.settings.maxTokens;
      
      if (totalTokens > maxTokens * 0.8) { // 80% del límite
        logger.info(`🔧 Optimizing conversation tokens: ${conversation.sessionId}`);
        
        // Crear resúmenes de mensajes antiguos
        const messagesToSummarize = conversation.messages
          .filter(msg => msg.importance < 6)
          .slice(0, -conversation.settings.contextWindow);
        
        for (const message of messagesToSummarize) {
          if (!message.summary) {
            message.summary = this.tokenOptimizer.summarizeMessage(message.content);
            // Reducir contenido original para ahorrar tokens
            message.content = message.summary;
            message.tokenCount = this.tokenOptimizer.estimateTokens(message.summary);
          }
        }
        
        conversation.status = 'optimized';
        conversation.metrics.lastOptimized = new Date();
        
        logger.success('✅ Conversation optimized successfully');
      }
      
    } catch (error) {
      logger.error('❌ Error optimizing conversation:', error);
    }
  }

  /**
   * Obtener template de agente
   */
  getAgentTemplate(agentName) {
    const templates = {
      BlogAgent: {
        specialization: 'Especialista en Gestión de Blog y Optimización de Contenido',
        personality: 'BlogMaster Pro',
        communicationStyle: 'analítico, directo y orientado a resultados',
        expertise_areas: ['SEO', 'Content Marketing', 'Analytics', 'Optimización Web'],
        capabilities: [
          'Optimización de contenido',
          'Análisis SEO profundo',
          'Generación de tags inteligentes',
          'Análisis de rendimiento',
          'Sugerencias de mejora',
          'Detección de tendencias'
        ],
        limitations: [
          'No puede editar directamente el contenido',
          'Requiere confirmación para cambios importantes',
          'Depende de datos existentes para análisis'
        ],
        maxTokens: 4000,
        contextWindow: 15
      },
      
      UserAgent: {
        specialization: 'Especialista en Gestión de Usuarios y Comportamiento',
        personality: 'UserExpert Assistant',
        communicationStyle: 'empático, profesional y orientado al usuario',
        expertise_areas: ['User Experience', 'Behavioral Analysis', 'User Management'],
        capabilities: [
          'Análisis de comportamiento',
          'Gestión de perfiles',
          'Detección de patrones',
          'Segmentación de usuarios'
        ],
        maxTokens: 3000,
        contextWindow: 12
      },
      
      SecurityAgent: {
        specialization: 'Especialista en Seguridad y Moderación',
        personality: 'Security Guardian',
        communicationStyle: 'preciso, cauteloso y proactivo',
        expertise_areas: ['Cybersecurity', 'Content Moderation', 'Threat Detection'],
        capabilities: [
          'Detección de amenazas',
          'Moderación de contenido',
          'Análisis de seguridad',
          'Auditoría de accesos'
        ],
        maxTokens: 3500,
        contextWindow: 10
      }
    };

    return templates[agentName] || templates.BlogAgent;
  }

  /**
   * Limpiar conversaciones antiguas
   */
  async cleanupOldConversations(maxAge = 7) { // 7 días por defecto
    try {
      const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
      
      const result = await AgentConversation.updateMany(
        {
          'context.sessionContext.lastActivity': { $lt: cutoffDate },
          status: { $in: ['active', 'idle'] }
        },
        {
          $set: { status: 'archived' }
        }
      );
      
      if (result.modifiedCount > 0) {
        logger.info(`🧹 Archived ${result.modifiedCount} old conversations`);
      }
      
    } catch (error) {
      logger.error('❌ Error cleaning up conversations:', error);
    }
  }

  /**
   * Obtener estadísticas del contexto
   */
  async getContextStats() {
    try {
      const stats = await AgentConversation.aggregate([
        {
          $group: {
            _id: '$agentName',
            totalConversations: { $sum: 1 },
            activeConversations: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            totalTokens: { $sum: '$metrics.totalTokensUsed' },
            avgResponseTime: { $avg: '$metrics.averageResponseTime' },
            avgSatisfaction: { $avg: '$metrics.satisfactionScore' }
          }
        }
      ]);
      
      return {
        agentStats: stats,
        cacheSize: this.activeConversations.size,
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('❌ Error getting context stats:', error);
      return null;
    }
  }
}

/**
 * Optimizador de tokens para OpenAI
 */
class TokenOptimizer {
  constructor() {
    // Estimaciones aproximadas (1 token ≈ 4 caracteres en español)
    this.CHARS_PER_TOKEN = 4;
  }
  
  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }
  
  estimateTotal(systemPrompt, messages, additionalContext) {
    let total = this.estimateTokens(systemPrompt);
    
    messages.forEach(msg => {
      total += this.estimateTokens(msg.content);
    });
    
    if (additionalContext) {
      total += this.estimateTokens(JSON.stringify(additionalContext));
    }
    
    return total;
  }
  
  summarizeMessage(content) {
    if (content.length <= 100) return content;
    
    // Extraer puntos clave del mensaje
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const summary = sentences.slice(0, 2).join('. ');
    
    return summary.length > 10 ? summary + '.' : content.substring(0, 100) + '...';
  }
  
  optimizePrompt(prompt, maxLength = 2000) {
    if (prompt.length <= maxLength) return prompt;
    
    // Mantener secciones importantes y resumir el resto
    const sections = prompt.split('\n\n');
    const important = sections.filter(section => 
      section.includes('INSTRUCCIONES') || 
      section.includes('TAREA ACTUAL') ||
      section.includes('TU ESPECIALIZACIÓN')
    );
    
    const other = sections.filter(section => !important.includes(section));
    const otherSummary = other.map(section => 
      section.length > 200 ? section.substring(0, 200) + '...' : section
    );
    
    return [...important, ...otherSummary].join('\n\n');
  }
}

// Singleton instance
const contextManager = new AgentContextManager();

export default contextManager;
export { AgentConversation };