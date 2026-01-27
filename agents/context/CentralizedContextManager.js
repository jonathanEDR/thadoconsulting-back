/**
 * CentralizedContextManager - Gestión de contexto centralizado para GerenteGeneral
 * Maneja sesiones compartidas entre todos los agentes
 */

import mongoose from 'mongoose';
import logger from '../../utils/logger.js';

// ============================================================================
// SCHEMA: GerenteSession
// ============================================================================

const GerenteSessionSchema = new mongoose.Schema({
  sessionId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  
  // Usuario que inicia la sesión
  userId: { 
    type: String, 
    index: true 
  },
  userRole: { 
    type: String 
  },
  
  // Contexto global de la sesión
  globalContext: {
    projectName: { 
      type: String, 
      default: 'Web Scuti' 
    },
    currentGoal: { 
      type: String 
    },
    language: { 
      type: String, 
      default: 'es' 
    },
    tone: { 
      type: String, 
      default: 'professional',
      enum: ['professional', 'casual', 'friendly', 'technical']
    }
  },
  
  // Historial de interacciones en esta sesión
  interactions: [{
    timestamp: { 
      type: Date, 
      default: Date.now 
    },
    agent: { 
      type: String,
      required: true
    },
    action: { 
      type: String,
      required: true
    },
    input: { 
      type: mongoose.Schema.Types.Mixed 
    },
    result: { 
      type: mongoose.Schema.Types.Mixed 
    },
    duration: { 
      type: Number // ms
    },
    success: {
      type: Boolean,
      default: true
    }
  }],
  
  // Datos compartidos entre agentes
  sharedData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  
  // Metadata
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastActivity: { 
    type: Date, 
    default: Date.now 
  },
  status: { 
    type: String, 
    enum: ['active', 'idle', 'completed', 'expired'], 
    default: 'active',
    index: true
  },
  
  // TTL: auto-eliminar después de 24 horas de inactividad
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
    // No usar index: true aqui, ya definido abajo con expireAfterSeconds
  }
}, {
  timestamps: true,
  collection: 'gerente_sessions'
});

// Índices compuestos para optimización
GerenteSessionSchema.index({ sessionId: 1, status: 1 });
GerenteSessionSchema.index({ userId: 1, createdAt: -1 });
GerenteSessionSchema.index({ lastActivity: -1 });

// Índice TTL para auto-limpieza
GerenteSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Método para extender expiración
GerenteSessionSchema.methods.extendExpiration = function() {
  this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  this.lastActivity = new Date();
};

// Método para agregar interacción
GerenteSessionSchema.methods.addInteraction = function(agent, action, input, result, duration, success = true) {
  this.interactions.push({
    timestamp: new Date(),
    agent,
    action,
    input,
    result,
    duration,
    success
  });
  
  // Limitar historial a últimas 50 interacciones
  if (this.interactions.length > 50) {
    this.interactions = this.interactions.slice(-50);
  }
  
  this.lastActivity = new Date();
  this.extendExpiration();
};

const GerenteSession = mongoose.model('GerenteSession', GerenteSessionSchema);

// ============================================================================
// CLASE: CentralizedContextManager
// ============================================================================

export class CentralizedContextManager {
  constructor() {
    this.activeSessionsCache = new Map(); // Cache en memoria
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutos
    
    // Iniciar limpieza periódica de cache
    this.startCacheCleanup();
    
    logger.info('🧠 CentralizedContextManager initialized');
  }

  /**
   * Crear nueva sesión con contexto centralizado
   * 
   * @param {string} userId - ID del usuario
   * @param {string} userRole - Rol del usuario
   * @param {Object} initialContext - Contexto inicial
   * @returns {Promise<Object>}
   */
  async createSession(userId, userRole, initialContext = {}) {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const session = await GerenteSession.create({
        sessionId,
        userId,
        userRole,
        globalContext: {
          projectName: initialContext.projectName || 'Web Scuti',
          currentGoal: initialContext.currentGoal || '',
          language: initialContext.language || 'es',
          tone: initialContext.tone || 'professional'
        },
        sharedData: initialContext.sharedData || {}
      });

      // Guardar en cache
      this.cacheSession(sessionId, session);

      logger.success(`✅ Sesión creada: ${sessionId}`);
      
      return {
        success: true,
        sessionId,
        session: this.sanitizeSession(session)
      };

    } catch (error) {
      logger.error('❌ Error creando sesión:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener sesión existente
   * 
   * @param {string} sessionId - ID de la sesión
   * @returns {Promise<Object|null>}
   */
  async getSession(sessionId) {
    try {
      // 1. Buscar en cache primero
      if (this.activeSessionsCache.has(sessionId)) {
        const cached = this.activeSessionsCache.get(sessionId);
        
        // Verificar que no esté expirado
        if (Date.now() - cached.cachedAt < this.cacheTimeout) {
          logger.debug(`💨 Sesión obtenida del cache: ${sessionId}`);
          cached.lastAccessed = Date.now();
          return cached.session;
        } else {
          // Cache expirado, remover
          this.activeSessionsCache.delete(sessionId);
        }
      }

      // 2. Buscar en DB (permitir reactivar sesiones completadas)
      const session = await GerenteSession.findOne({ 
        sessionId,
        status: { $in: ['active', 'idle', 'completed'] }
      });

      if (!session) {
        logger.debug(`⚠️  Sesión no encontrada: ${sessionId}`);
        return null;
      }

      // 3. Reactivar sesión y actualizar actividad
      const wasCompleted = session.status === 'completed';
      session.lastActivity = new Date();
      session.status = 'active';
      session.extendExpiration();
      await session.save();
      
      if (wasCompleted) {
        logger.info(`🔄 Sesión reactivada desde estado completado: ${sessionId}`);
      }

      // 4. Guardar en cache
      this.cacheSession(sessionId, session);

      logger.debug(`📋 Sesión obtenida: ${sessionId}`);
      return session;

    } catch (error) {
      logger.error('❌ Error obteniendo sesión:', error);
      return null;
    }
  }

  /**
   * Obtener o crear sesión
   * 
   * @param {string} sessionId - ID de sesión (opcional)
   * @param {string} userId - ID del usuario
   * @param {string} userRole - Rol del usuario
   * @param {Object} initialContext - Contexto inicial
   * @returns {Promise<Object>}
   */
  async getOrCreateSession(sessionId, userId, userRole, initialContext = {}) {
    try {
      // Si hay sessionId, intentar obtener
      if (sessionId) {
        const existing = await this.getSession(sessionId);
        if (existing) {
          logger.info(`🔄 Reutilizando sesión: ${sessionId}`);
          return existing;
        }
        logger.info(`⚠️  Sesión ${sessionId} no encontrada, creando nueva`);
      }

      // Crear nueva sesión
      const result = await this.createSession(userId, userRole, initialContext);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return result.session;

    } catch (error) {
      logger.error('❌ Error en getOrCreateSession:', error);
      throw error;
    }
  }

  /**
   * Agregar interacción al historial
   * 
   * @param {string} sessionId - ID de la sesión
   * @param {string} agentName - Nombre del agente
   * @param {string} action - Acción realizada
   * @param {Object} input - Input de la acción
   * @param {Object} result - Resultado de la acción
   * @param {number} duration - Duración en ms
   * @param {boolean} success - Si fue exitosa
   * @returns {Promise<boolean>}
   */
  async addInteraction(sessionId, agentName, action, input, result, duration, success = true) {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        logger.warn(`⚠️  Sesión no encontrada para agregar interacción: ${sessionId}`);
        return false;
      }

      // Usar método del schema
      session.addInteraction(agentName, action, input, result, duration, success);
      await session.save();

      // Actualizar cache
      this.cacheSession(sessionId, session);

      logger.debug(`📝 Interacción agregada a ${sessionId}: ${agentName}/${action}`);
      return true;

    } catch (error) {
      logger.error('❌ Error agregando interacción:', error);
      return false;
    }
  }

  /**
   * Actualizar datos compartidos
   * 
   * @param {string} sessionId - ID de la sesión
   * @param {string} key - Clave del dato
   * @param {*} value - Valor a guardar
   * @returns {Promise<boolean>}
   */
  async updateSharedData(sessionId, key, value) {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        logger.warn(`⚠️  Sesión no encontrada para actualizar shared data: ${sessionId}`);
        return false;
      }

      session.sharedData.set(key, value);
      session.lastActivity = new Date();
      session.extendExpiration();
      await session.save();

      // Actualizar cache
      this.cacheSession(sessionId, session);

      logger.debug(`💾 Shared data actualizado en ${sessionId}: ${key}`);
      return true;

    } catch (error) {
      logger.error('❌ Error actualizando shared data:', error);
      return false;
    }
  }

  /**
   * Obtener datos compartidos
   * 
   * @param {string} sessionId - ID de la sesión
   * @param {string} key - Clave del dato (opcional)
   * @returns {Promise<*>}
   */
  async getSharedData(sessionId, key = null) {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        return null;
      }

      if (key) {
        return session.sharedData.get(key);
      }

      // Retornar todo como objeto
      return Object.fromEntries(session.sharedData);

    } catch (error) {
      logger.error('❌ Error obteniendo shared data:', error);
      return null;
    }
  }

  /**
   * Obtener contexto enriquecido para un agente
   * 
   * @param {string} sessionId - ID de la sesión
   * @param {string} agentName - Nombre del agente
   * @returns {Promise<Object>}
   */
  async getEnrichedContextForAgent(sessionId, agentName) {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        logger.debug(`⚠️  No hay sesión, retornando contexto vacío`);
        return {};
      }

      // Construir contexto enriquecido
      const enrichedContext = {
        // Info de sesión
        sessionId: session.sessionId,
        userId: session.userId,
        userRole: session.userRole,
        
        // Contexto global
        global: session.globalContext,
        
        // Datos compartidos (convertir Map a Object)
        shared: Object.fromEntries(session.sharedData),
        
        // Historial reciente (últimas 5 interacciones)
        recentHistory: session.interactions
          .slice(-5)
          .map(i => ({
            agent: i.agent,
            action: i.action,
            timestamp: i.timestamp,
            success: i.success
          })),
        
        // Interacciones previas de este mismo agente
        agentHistory: session.interactions
          .filter(i => i.agent === agentName)
          .slice(-3)
          .map(i => ({
            action: i.action,
            success: i.success,
            timestamp: i.timestamp
          })),
        
        // Metadata
        sessionCreatedAt: session.createdAt,
        sessionLastActivity: session.lastActivity
      };

      logger.debug(`✨ Contexto enriquecido generado para ${agentName}`);
      return enrichedContext;

    } catch (error) {
      logger.error('❌ Error obteniendo contexto enriquecido:', error);
      return {};
    }
  }

  /**
   * Completar sesión
   * 
   * @param {string} sessionId - ID de la sesión
   * @returns {Promise<boolean>}
   */
  async completeSession(sessionId) {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        return false;
      }

      session.status = 'completed';
      await session.save();

      // Remover de cache
      this.activeSessionsCache.delete(sessionId);

      logger.info(`✅ Sesión completada: ${sessionId}`);
      return true;

    } catch (error) {
      logger.error('❌ Error completando sesión:', error);
      return false;
    }
  }

  /**
   * Obtener estadísticas de sesiones
   * 
   * @returns {Promise<Object>}
   */
  async getSessionStats() {
    try {
      const stats = await GerenteSession.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgInteractions: { $avg: { $size: '$interactions' } }
          }
        }
      ]);

      return {
        activeInCache: this.activeSessionsCache.size,
        byStatus: stats
      };

    } catch (error) {
      logger.error('❌ Error obteniendo stats:', error);
      return null;
    }
  }

  /**
   * Obtener sesiones de un usuario
   * 
   * @param {string} userId - ID del usuario
   * @param {number} limit - Límite de resultados
   * @returns {Promise<Array>}
   */
  async getUserSessions(userId, limit = 10) {
    try {
      // Filtrar sesiones que tengan al menos una interacción válida (no solo status)
      const sessions = await GerenteSession.find({ 
        userId,
        'interactions.0': { $exists: true } // Al menos 1 interacción
      })
        .sort({ lastActivity: -1 })
        .limit(limit * 2) // Obtener más para filtrar luego
        .select('sessionId status globalContext createdAt lastActivity interactions');

      // Filtrar sesiones que tengan mensajes reales (no solo status)
      const validSessions = sessions.filter(s => {
        return s.interactions.some(interaction => 
          interaction.action === 'coordinate' || 
          interaction.action === 'route' ||
          (interaction.input?.userMessage || interaction.input?.task?.command)
        );
      }).slice(0, limit);

      return validSessions.map(s => this.sanitizeSession(s));

    } catch (error) {
      logger.error('❌ Error obteniendo sesiones del usuario:', error);
      return [];
    }
  }

  // ========================================================================
  // MÉTODOS PRIVADOS (Helpers)
  // ========================================================================

  /**
   * Guardar sesión en cache
   * @private
   */
  cacheSession(sessionId, session) {
    this.activeSessionsCache.set(sessionId, {
      session,
      cachedAt: Date.now(),
      lastAccessed: Date.now()
    });
  }

  /**
   * Sanitizar sesión para retorno (remover datos sensibles)
   * @private
   */
  sanitizeSession(session) {
    return {
      sessionId: session.sessionId,
      userId: session.userId,
      userRole: session.userRole,
      globalContext: session.globalContext,
      interactionsCount: session.interactions?.length || 0,
      lastInteraction: session.interactions?.length > 0 
        ? session.interactions[session.interactions.length - 1]
        : null,
      sharedDataKeys: session.sharedData 
        ? Array.from(session.sharedData.keys())
        : [],
      status: session.status,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity
    };
  }

  /**
   * Iniciar limpieza periódica de cache
   * @private
   */
  startCacheCleanup() {
    // Limpiar cache cada 5 minutos
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [sessionId, data] of this.activeSessionsCache) {
        // Remover si no se ha accedido en 30 minutos
        if (now - data.lastAccessed > this.cacheTimeout) {
          this.activeSessionsCache.delete(sessionId);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.info(`🗑️  Cache limpiado: ${cleaned} sesiones removidas`);
      }
    }, 5 * 60 * 1000); // 5 minutos
  }
}

// Exportar instancia singleton
const centralizedContext = new CentralizedContextManager();
export default centralizedContext;
