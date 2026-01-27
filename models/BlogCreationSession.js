/**
 * BlogCreationSession Model
 * Gestiona las sesiones conversacionales para crear contenido de blog
 */

import mongoose from 'mongoose';

const ConversationMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'agent', 'system'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

const CollectedDataSchema = new mongoose.Schema({
  // Datos básicos del post
  topic: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  
  // Tipo y template
  postType: {
    type: String,
    enum: ['tutorial', 'guide', 'technical', 'informative', 'opinion', 'custom'],
    default: 'informative'
  },
  template: {
    type: String,
    enum: ['tutorial', 'guide', 'technical', 'informative', 'opinion'],
    default: 'informative'
  },
  
  // Audiencia y nivel
  audience: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert', 'general'],
    default: 'intermediate'
  },
  
  // Longitud y formato
  length: {
    type: Number,
    default: 1000,
    min: 500,
    max: 5000
  },
  
  // Keywords y SEO
  keywords: [{
    type: String,
    trim: true
  }],
  
  // Categoría y tags
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BlogCategory'
  },
  suggestedTags: [{
    type: String,
    trim: true
  }],
  
  // Instrucciones personalizadas
  customInstructions: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Tono y estilo
  tone: {
    type: String,
    enum: ['formal', 'professional', 'casual', 'technical', 'friendly'],
    default: 'professional'
  },
  style: {
    type: String,
    enum: ['academic', 'conversational', 'technical', 'storytelling', 'instructional'],
    default: 'conversational'
  }
}, { _id: false });

const GenerationResultSchema = new mongoose.Schema({
  generationId: {
    type: String,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Contenido generado
  content: {
    type: String
  },
  
  // Metadata del contenido
  metadata: {
    wordCount: Number,
    seoScore: Number,
    readingTime: Number,
    suggestedTags: [String],
    structure: {
      hasHeaders: Boolean,
      hasCodeBlocks: Boolean,
      hasLists: Boolean,
      hasBoldText: Boolean,
      paragraphCount: Number,
      avgWordsPerParagraph: Number
    },
    validation: mongoose.Schema.Types.Mixed
  },
  
  // Draft del post (listo para guardar)
  draft: {
    title: String,
    excerpt: String,
    content: String,
    contentFormat: {
      type: String,
      enum: ['html', 'markdown'],
      default: 'markdown'
    },
    category: mongoose.Schema.Types.ObjectId,
    tags: [String],
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String]
    }
  },
  
  // Timestamps
  startedAt: Date,
  completedAt: Date,
  
  // Error si falla
  error: {
    message: String,
    code: String,
    stack: String
  }
}, { _id: false });

const BlogCreationSessionSchema = new mongoose.Schema({
  // Identificador único de sesión
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Usuario propietario
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Estado de la sesión
  status: {
    type: String,
    enum: ['active', 'generating', 'completed', 'cancelled', 'expired'],
    default: 'active',
    index: true
  },
  
  // Etapa actual del flujo
  stage: {
    type: String,
    enum: [
      'initialized',
      'topic_discovery',
      'type_selection',
      'details_collection',
      'category_selection',
      'review_and_confirm',
      'final_confirmation',
      'generating',
      'generation_completed',
      'draft_saved',
      'completed',
      'cancelled'
    ],
    default: 'initialized',
    index: true
  },
  
  // Progreso (0-100)
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Datos recolectados durante la conversación
  collected: {
    type: CollectedDataSchema,
    default: {}
  },
  
  // Historial completo de la conversación
  conversationHistory: [ConversationMessageSchema],
  
  // Resultado de la generación
  generation: {
    type: GenerationResultSchema,
    default: null
  },
  
  // Post creado (si se guardó)
  createdPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BlogPost'
  },
  
  // Metadata adicional
  metadata: {
    userAgent: String,
    ipAddress: String,
    startedFrom: {
      type: String,
      enum: ['dashboard', 'blog_list', 'direct', 'api', 'test', 'scuti-ai'],
      default: 'dashboard'
    },
    totalMessages: {
      type: Number,
      default: 0
    },
    regenerationCount: {
      type: Number,
      default: 0
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
  }
}, {
  timestamps: true
});

// Índices compuestos
BlogCreationSessionSchema.index({ userId: 1, status: 1 });
BlogCreationSessionSchema.index({ userId: 1, createdAt: -1 });
BlogCreationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Métodos de instancia

/**
 * Agregar mensaje a la conversación
 */
BlogCreationSessionSchema.methods.addMessage = function(role, message, metadata = {}) {
  this.conversationHistory.push({
    role,
    message,
    timestamp: new Date(),
    metadata
  });
  this.metadata.totalMessages = this.conversationHistory.length;
  this.updatedAt = new Date();
};

/**
 * Actualizar datos recolectados
 */
BlogCreationSessionSchema.methods.updateCollected = function(data) {
  Object.assign(this.collected, data);
  this.updatedAt = new Date();
};

/**
 * Actualizar progreso
 */
BlogCreationSessionSchema.methods.updateProgress = function(progress) {
  this.progress = Math.min(Math.max(progress, 0), 100);
  this.updatedAt = new Date();
};

/**
 * Cambiar etapa
 */
BlogCreationSessionSchema.methods.moveToStage = function(stage, progress = null) {
  this.stage = stage;
  if (progress !== null) {
    this.updateProgress(progress);
  }
  this.updatedAt = new Date();
};

/**
 * Iniciar generación
 */
BlogCreationSessionSchema.methods.startGeneration = function(generationId) {
  this.generation = {
    generationId,
    status: 'in_progress',
    startedAt: new Date()
  };
  this.status = 'generating';
  this.stage = 'generating';
  this.updateProgress(95);
  this.updatedAt = new Date();
};

/**
 * Completar generación con éxito
 */
BlogCreationSessionSchema.methods.completeGeneration = function(result) {
  this.generation.status = 'completed';
  this.generation.completedAt = new Date();
  this.generation.content = result.content;
  this.generation.metadata = result.metadata;
  this.generation.draft = result.draft;
  this.stage = 'generation_completed';
  this.updateProgress(100);
  this.updatedAt = new Date();
};

/**
 * Marcar generación como fallida
 */
BlogCreationSessionSchema.methods.failGeneration = function(error) {
  this.generation.status = 'failed';
  this.generation.completedAt = new Date();
  this.generation.error = {
    message: error.message,
    code: error.code || 'GENERATION_ERROR',
    stack: error.stack
  };
  this.status = 'active'; // Volver a activo para reintentar
  this.stage = 'final_confirmation';
  this.updatedAt = new Date();
};

/**
 * Guardar post creado
 */
BlogCreationSessionSchema.methods.linkCreatedPost = function(postId) {
  this.createdPostId = postId;
  this.status = 'completed';
  this.stage = 'draft_saved';
  this.updatedAt = new Date();
};

/**
 * Cancelar sesión
 */
BlogCreationSessionSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.stage = 'cancelled';
  this.updatedAt = new Date();
};

/**
 * Verificar si la sesión está activa
 */
BlogCreationSessionSchema.methods.isActive = function() {
  return this.status === 'active' && new Date() < this.expiresAt;
};

/**
 * Obtener resumen de la configuración
 */
BlogCreationSessionSchema.methods.getConfigurationSummary = function() {
  const { collected } = this;
  
  return {
    title: collected.title || 'Sin título',
    type: collected.postType || 'informative',
    template: collected.template || 'informative',
    audience: collected.audience || 'intermediate',
    length: collected.length || 1000,
    keywords: collected.keywords || [],
    category: collected.category,
    tone: collected.tone || 'professional',
    style: collected.style || 'conversational'
  };
};

// Métodos estáticos

/**
 * Crear nueva sesión
 */
BlogCreationSessionSchema.statics.createSession = async function(userId, metadata = {}) {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const session = await this.create({
    sessionId,
    userId,
    status: 'active',
    stage: 'initialized',
    progress: 0,
    metadata: {
      ...metadata,
      startedFrom: metadata.startedFrom || 'dashboard',
      totalMessages: 0,
      regenerationCount: 0
    }
  });
  
  return session;
};

/**
 * Buscar sesión activa por ID
 */
BlogCreationSessionSchema.statics.findActiveSession = async function(sessionId) {
  const session = await this.findOne({
    sessionId,
    status: { $in: ['active', 'generating'] },
    expiresAt: { $gt: new Date() }
  });
  
  return session;
};

/**
 * Obtener sesiones activas de un usuario
 */
BlogCreationSessionSchema.statics.getUserActiveSessions = async function(userId) {
  return this.find({
    userId,
    status: { $in: ['active', 'generating'] },
    expiresAt: { $gt: new Date() }
  }).sort({ updatedAt: -1 });
};

/**
 * Limpiar sesiones expiradas
 */
BlogCreationSessionSchema.statics.cleanupExpiredSessions = async function() {
  const result = await this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      status: { $in: ['active', 'generating'] }
    },
    {
      $set: {
        status: 'expired',
        updatedAt: new Date()
      }
    }
  );
  
  return result;
};

// Middleware pre-save
BlogCreationSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const BlogCreationSession = mongoose.model('BlogCreationSession', BlogCreationSessionSchema);

export default BlogCreationSession;
