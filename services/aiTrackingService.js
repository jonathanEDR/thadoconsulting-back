/**
 * 📊 AI Tracking Service
 * Servicio para trackear y persistir interacciones con IA
 */

import AIInteraction from '../models/AIInteraction.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

class AITrackingService {
  constructor() {
    this.activeSession = new Map(); // sessionId -> session data
  }

  // Crear nueva sesión de tracking
  createSession(userId, metadata = {}) {
    const sessionId = uuidv4();
    const session = {
      sessionId,
      userId,
      startTime: new Date(),
      metadata,
      interactions: []
    };

    this.activeSession.set(sessionId, session);
    logger.debug(`📊 Nueva sesión AI tracking: ${sessionId} para usuario ${userId}`);
    
    return sessionId;
  }

  // Trackear una sugerencia de autocompletado
  async trackSuggestion(params) {
    const {
      userId,
      sessionId,
      postId,
      postTitle,
      postCategory,
      userInput,
      aiResponse,
      performance,
      metadata = {}
    } = params;

    try {
      const interaction = new AIInteraction({
        userId,
        sessionId,
        interactionType: 'suggestion',
        postId,
        postTitle,
        postCategory,
        userInput: {
          content: userInput.content,
          cursorPosition: userInput.cursorPosition,
          contextBefore: userInput.contextBefore,
          contextAfter: userInput.contextAfter,
          instruction: userInput.instruction
        },
        aiResponse: {
          content: aiResponse.content,
          confidence: aiResponse.confidence,
          model: aiResponse.model || 'gpt-4o',
          temperature: aiResponse.temperature || 0.7,
          maxTokens: aiResponse.maxTokens || 150,
          cached: aiResponse.cached || false,
          cacheKey: aiResponse.cacheKey
        },
        performance: {
          requestDuration: performance.requestDuration,
          cacheHit: performance.cacheHit || false,
          rateLimited: performance.rateLimited || false,
          retries: performance.retries || 0
        },
        metadata: {
          ...metadata,
          source: 'post-editor',
          version: '1.0.0'
        }
      });

      const saved = await interaction.save();
      logger.info(`📊 Sugerencia trackeada: ${saved._id}`);
      
      return saved._id;
    } catch (error) {
      logger.error('Error trackeando sugerencia:', error);
      return null;
    }
  }

  // Trackear respuesta de chat
  async trackChat(params) {
    const {
      userId,
      sessionId,
      postId,
      userMessage,
      aiResponse,
      performance,
      metadata = {}
    } = params;

    try {
      const interaction = new AIInteraction({
        userId,
        sessionId,
        interactionType: 'chat',
        postId,
        userInput: {
          content: userMessage,
          instruction: 'chat_message'
        },
        aiResponse: {
          content: aiResponse.content,
          confidence: aiResponse.confidence || 0.8,
          model: aiResponse.model || 'gpt-4o',
          cached: aiResponse.cached || false
        },
        performance,
        metadata: {
          ...metadata,
          source: 'ai-chat',
          version: '1.0.0'
        }
      });

      const saved = await interaction.save();
      logger.info(`📊 Chat trackeado: ${saved._id}`);
      
      return saved._id;
    } catch (error) {
      logger.error('Error trackeando chat:', error);
      return null;
    }
  }

  // Marcar interacción como aceptada
  async markAsAccepted(interactionId, modifiedText = null) {
    try {
      const interaction = await AIInteraction.findById(interactionId);
      if (interaction) {
        await interaction.markAsAccepted(modifiedText);
        logger.info(`✅ Interacción marcada como aceptada: ${interactionId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error marcando como aceptada:', error);
      return false;
    }
  }

  // Marcar interacción como rechazada
  async markAsRejected(interactionId) {
    try {
      const interaction = await AIInteraction.findById(interactionId);
      if (interaction) {
        await interaction.markAsRejected();
        logger.info(`❌ Interacción marcada como rechazada: ${interactionId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error marcando como rechazada:', error);
      return false;
    }
  }

  // Agregar rating a interacción
  async addRating(interactionId, rating, feedback = null) {
    try {
      const interaction = await AIInteraction.findById(interactionId);
      if (interaction) {
        await interaction.addRating(rating, feedback);
        logger.info(`⭐ Rating agregado: ${interactionId} - ${rating}/5`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error agregando rating:', error);
      return false;
    }
  }

  // Obtener estadísticas generales
  async getGeneralStats(filters = {}) {
    try {
      return await AIInteraction.getStats(filters);
    } catch (error) {
      logger.error('Error obteniendo estadísticas generales:', error);
      return null;
    }
  }

  // Obtener estadísticas de usuario
  async getUserStats(userId, days = 30) {
    try {
      return await AIInteraction.getUserStats(userId, days);
    } catch (error) {
      logger.error('Error obteniendo estadísticas de usuario:', error);
      return null;
    }
  }

  // Obtener interacciones recientes
  async getRecentInteractions(filters = {}, limit = 50) {
    try {
      return await AIInteraction.find(filters)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('userId interactionType aiResponse.content userAction.action createdAt');
    } catch (error) {
      logger.error('Error obteniendo interacciones recientes:', error);
      return [];
    }
  }

  // Limpiar sesiones antiguas
  cleanupSessions() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    let cleaned = 0;

    for (const [sessionId, session] of this.activeSession.entries()) {
      if (session.startTime.getTime() < oneHourAgo) {
        this.activeSession.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`🧹 Sesiones AI limpiadas: ${cleaned}`);
    }
  }

  // Obtener estadísticas de cache y performance
  async getPerformanceStats(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await AIInteraction.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            cacheHits: { $sum: { $cond: ['$aiResponse.cached', 1, 0] } },
            avgDuration: { $avg: '$performance.requestDuration' },
            totalTokens: { $sum: '$aiResponse.totalTokens' },
            acceptanceRate: {
              $avg: { $cond: [{ $eq: ['$userAction.action', 'accepted'] }, 1, 0] }
            }
          }
        }
      ]);

      return stats[0] || {
        totalRequests: 0,
        cacheHits: 0,
        avgDuration: 0,
        totalTokens: 0,
        acceptanceRate: 0
      };
    } catch (error) {
      logger.error('Error obteniendo estadísticas de performance:', error);
      return null;
    }
  }
}

// Instancia singleton
const aiTrackingService = new AITrackingService();

// Auto-cleanup cada hora
setInterval(() => {
  aiTrackingService.cleanupSessions();
}, 60 * 60 * 1000);

export default aiTrackingService;