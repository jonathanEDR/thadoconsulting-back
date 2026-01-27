/**
 * 🤖 AIInteraction Model
 * Modelo para persistir interacciones con IA (sugerencias, chat, etc.)
 */

import mongoose from 'mongoose';

const aiInteractionSchema = new mongoose.Schema({
  // Identificación
  userId: {
    type: String,
    required: true
    // Índice compuesto en userId + createdAt más abajo
  },
  
  sessionId: {
    type: String,
    required: true,
    index: true
  },

  // Tipo de interacción
  interactionType: {
    type: String,
    required: true,
    enum: ['suggestion', 'chat', 'completion', 'improvement', 'seo']
    // Índice compuesto en interactionType + createdAt más abajo
  },

  // Contexto del post/contenido
  postId: {
    type: String,
    index: true
  },

  postTitle: String,
  postCategory: String,

  // Input del usuario
  userInput: {
    content: String,
    cursorPosition: {
      line: Number,
      column: Number,
      absolutePosition: Number
    },
    contextBefore: String,
    contextAfter: String,
    instruction: String
  },

  // Respuesta de la IA
  aiResponse: {
    content: String,
    confidence: Number,
    model: String,
    temperature: Number,
    maxTokens: Number,
    promptTokens: Number,
    completionTokens: Number,
    totalTokens: Number,
    cached: {
      type: Boolean,
      default: false
    },
    cacheKey: String
  },

  // Acción del usuario
  userAction: {
    action: {
      type: String,
      enum: ['accepted', 'rejected', 'ignored', 'modified'],
      default: 'ignored'
    },
    modifiedText: String, // Si el usuario modificó la sugerencia
    actionTimestamp: Date
  },

  // Métricas de performance
  performance: {
    requestDuration: Number, // ms
    cacheHit: Boolean,
    rateLimited: Boolean,
    retries: Number
  },

  // Métricas de calidad
  quality: {
    userRating: {
      type: Number,
      min: 1,
      max: 5
    },
    helpful: Boolean,
    feedback: String
  },

  // Metadatos
  metadata: {
    userAgent: String,
    ipAddress: String,
    source: String, // 'post-editor', 'chat', etc.
    version: String
  }

}, {
  timestamps: true,
  collection: 'ai_interactions'
});

// Índices compuestos para consultas eficientes
aiInteractionSchema.index({ userId: 1, createdAt: -1 });
aiInteractionSchema.index({ interactionType: 1, createdAt: -1 });
aiInteractionSchema.index({ postId: 1, createdAt: -1 });
aiInteractionSchema.index({ 'userAction.action': 1, createdAt: -1 });
aiInteractionSchema.index({ 'aiResponse.cached': 1, createdAt: -1 });

// Método para marcar como aceptada
aiInteractionSchema.methods.markAsAccepted = function(modifiedText = null) {
  this.userAction.action = 'accepted';
  this.userAction.actionTimestamp = new Date();
  if (modifiedText) {
    this.userAction.modifiedText = modifiedText;
  }
  return this.save();
};

// Método para marcar como rechazada
aiInteractionSchema.methods.markAsRejected = function() {
  this.userAction.action = 'rejected';
  this.userAction.actionTimestamp = new Date();
  return this.save();
};

// Método para agregar rating
aiInteractionSchema.methods.addRating = function(rating, feedback = null) {
  this.quality.userRating = rating;
  this.quality.helpful = rating >= 3;
  if (feedback) {
    this.quality.feedback = feedback;
  }
  return this.save();
};

// Método estático para obtener estadísticas
aiInteractionSchema.statics.getStats = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        accepted: {
          $sum: { $cond: [{ $eq: ['$userAction.action', 'accepted'] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$userAction.action', 'rejected'] }, 1, 0] }
        },
        cached: {
          $sum: { $cond: ['$aiResponse.cached', 1, 0] }
        },
        avgConfidence: { $avg: '$aiResponse.confidence' },
        avgRating: { $avg: '$quality.userRating' },
        totalTokens: { $sum: '$aiResponse.totalTokens' },
        avgDuration: { $avg: '$performance.requestDuration' }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    total: 0,
    accepted: 0,
    rejected: 0,
    cached: 0,
    avgConfidence: 0,
    avgRating: 0,
    totalTokens: 0,
    avgDuration: 0
  };
};

// Método estático para obtener estadísticas por usuario
aiInteractionSchema.statics.getUserStats = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const pipeline = [
    {
      $match: {
        userId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$interactionType',
        count: { $sum: 1 },
        accepted: {
          $sum: { $cond: [{ $eq: ['$userAction.action', 'accepted'] }, 1, 0] }
        },
        avgRating: { $avg: '$quality.userRating' }
      }
    }
  ];

  return await this.aggregate(pipeline);
};

const AIInteraction = mongoose.model('AIInteraction', aiInteractionSchema);

export default AIInteraction;