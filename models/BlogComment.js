import mongoose from 'mongoose';

const blogCommentSchema = new mongoose.Schema({
  // Contenido del comentario
  content: {
    type: String,
    required: [true, 'El contenido del comentario es requerido'],
    trim: true,
    minlength: [2, 'El comentario debe tener al menos 2 caracteres'],
    maxlength: [5000, 'El comentario no puede exceder 5000 caracteres']
  },

  // Autor del comentario (referencia a User o información de guest)
  author: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    name: {
      type: String,
      required: [true, 'El nombre del autor es requerido'],
      trim: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido']
    },
    website: {
      type: String,
      trim: true,
      maxlength: [200, 'La URL no puede exceder 200 caracteres'],
      match: [/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/, 'URL inválida']
    },
    avatar: {
      type: String,
      trim: true
    },
    isRegistered: {
      type: Boolean,
      default: false
    }
  },

  // Post al que pertenece el comentario
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BlogPost',
    required: [true, 'El post es requerido'],
    index: true
  },

  // Comentario padre (para respuestas/threads)
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BlogComment',
    default: null,
    index: true
  },

  // Nivel de anidación (para optimización)
  level: {
    type: Number,
    default: 0,
    min: 0,
    max: 5 // Máximo 5 niveles de anidación
  },

  // Estado de moderación
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'spam', 'hidden'],
    default: 'pending',
    index: true
  },

  // Metadata de moderación
  moderation: {
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    rejectedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'La razón no puede exceder 500 caracteres']
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Las notas no pueden exceder 1000 caracteres']
    },
    autoModerated: {
      type: Boolean,
      default: false
    },
    moderationScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    flags: [{
      type: {
        type: String,
        enum: ['spam', 'offensive', 'toxic', 'suspicious', 'links', 'caps']
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1
      },
      reason: String
    }]
  },

  // Edición
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Destacado/Fijado
  isPinned: {
    type: Boolean,
    default: false
  },
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  pinnedAt: {
    type: Date,
    default: null
  },

  // Sistema de votación
  votes: {
    likes: {
      type: Number,
      default: 0,
      min: 0
    },
    dislikes: {
      type: Number,
      default: 0,
      min: 0
    },
    score: {
      type: Number,
      default: 0
    },
    voters: [{
      userId: String, // ClerkID o IP hash para guests
      type: {
        type: String,
        enum: ['like', 'dislike']
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // Reportes
  reportsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isReported: {
    type: Boolean,
    default: false,
    index: true
  },

  // Respuestas
  repliesCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // IP y User Agent (para moderación)
  metadata: {
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    },
    referrer: {
      type: String,
      trim: true
    }
  },

  // Reputación del autor (calculada)
  authorReputation: {
    score: {
      type: Number,
      default: 0
    },
    totalComments: {
      type: Number,
      default: 0
    },
    approvedComments: {
      type: Number,
      default: 0
    },
    rejectedComments: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true, // createdAt, updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========================================
// ÍNDICES
// ========================================

// Índice compuesto para consultas frecuentes
blogCommentSchema.index({ post: 1, status: 1, createdAt: -1 });
blogCommentSchema.index({ post: 1, parentComment: 1 });
blogCommentSchema.index({ 'author.userId': 1, status: 1 });
blogCommentSchema.index({ 'author.email': 1 });
blogCommentSchema.index({ status: 1, isReported: 1 });
blogCommentSchema.index({ isPinned: 1, createdAt: -1 });

// ✅ NUEVO: Índice para conteo de comentarios por usuario por post (límites)
blogCommentSchema.index({ post: 1, 'author.userId': 1, parentComment: 1, status: 1 });

// Índice de texto para búsqueda
blogCommentSchema.index({ content: 'text' });

// ========================================
// VIRTUALS
// ========================================

// Virtual para obtener respuestas
blogCommentSchema.virtual('replies', {
  ref: 'BlogComment',
  localField: '_id',
  foreignField: 'parentComment'
});

// Virtual para calcular score de votación
blogCommentSchema.virtual('voteScore').get(function() {
  return this.votes.likes - this.votes.dislikes;
});

// Virtual para verificar si es comentario de nivel superior
blogCommentSchema.virtual('isTopLevel').get(function() {
  return this.level === 0 && !this.parentComment;
});

// Virtual para verificar si puede tener respuestas
blogCommentSchema.virtual('canHaveReplies').get(function() {
  return this.level < 5;
});

// ========================================
// MÉTODOS DE INSTANCIA
// ========================================

// Votar comentario
blogCommentSchema.methods.vote = async function(userId, voteType) {
  // Verificar si ya votó
  const existingVote = this.votes.voters.find(v => v.userId === userId);

  if (existingVote) {
    // Si ya votó igual, remover voto
    if (existingVote.type === voteType) {
      this.votes.voters = this.votes.voters.filter(v => v.userId !== userId);
      this.votes[voteType === 'like' ? 'likes' : 'dislikes']--;
    } else {
      // Cambiar voto
      existingVote.type = voteType;
      existingVote.votedAt = new Date();
      
      if (voteType === 'like') {
        this.votes.likes++;
        this.votes.dislikes--;
      } else {
        this.votes.dislikes++;
        this.votes.likes--;
      }
    }
  } else {
    // Nuevo voto
    this.votes.voters.push({ userId, type: voteType });
    this.votes[voteType === 'like' ? 'likes' : 'dislikes']++;
  }

  // Actualizar score
  this.votes.score = this.votes.likes - this.votes.dislikes;

  return this.save();
};

// Aprobar comentario
blogCommentSchema.methods.approve = async function(moderatorId) {
  this.status = 'approved';
  this.moderation.approvedBy = moderatorId;
  this.moderation.approvedAt = new Date();
  this.moderation.rejectedBy = null;
  this.moderation.rejectedAt = null;
  
  return this.save();
};

// Rechazar comentario
blogCommentSchema.methods.reject = async function(moderatorId, reason) {
  this.status = 'rejected';
  this.moderation.rejectedBy = moderatorId;
  this.moderation.rejectedAt = new Date();
  this.moderation.rejectionReason = reason;
  this.moderation.approvedBy = null;
  this.moderation.approvedAt = null;
  
  return this.save();
};

// Marcar como spam
blogCommentSchema.methods.markAsSpam = async function(moderatorId) {
  this.status = 'spam';
  this.moderation.rejectedBy = moderatorId;
  this.moderation.rejectedAt = new Date();
  this.moderation.rejectionReason = 'Marcado como spam';
  
  return this.save();
};

// Editar comentario
blogCommentSchema.methods.edit = async function(newContent, editorId) {
  // Guardar en historial
  this.editHistory.push({
    content: this.content,
    editedAt: new Date(),
    editedBy: editorId
  });

  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();

  return this.save();
};

// Fijar comentario
blogCommentSchema.methods.pin = async function(moderatorId) {
  this.isPinned = true;
  this.pinnedBy = moderatorId;
  this.pinnedAt = new Date();
  
  return this.save();
};

// Desfijar comentario
blogCommentSchema.methods.unpin = async function() {
  this.isPinned = false;
  this.pinnedBy = null;
  this.pinnedAt = null;
  
  return this.save();
};

// Incrementar contador de reportes
blogCommentSchema.methods.incrementReports = async function() {
  this.reportsCount++;
  this.isReported = true;
  
  // Auto-ocultar si tiene muchos reportes
  if (this.reportsCount >= 5 && this.status === 'approved') {
    this.status = 'hidden';
  }
  
  return this.save();
};

// ========================================
// MÉTODOS ESTÁTICOS
// ========================================

// Obtener comentarios de un post con paginación
blogCommentSchema.statics.getPostComments = async function(postId, options = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    status = 'approved',
    includeReplies = true
  } = options;

  const query = {
    post: postId,
    parentComment: null, // Solo comentarios de nivel superior
    status: status
  };

  const comments = await this.find(query)
    // Populate author with username and profile image so frontend can link to public profile
    .populate('author.userId', 'firstName lastName username profileImage blogProfile.isPublicProfile blogProfile.avatar')
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .limit(limit)
    .skip((page - 1) * limit);

  // Incluir respuestas si se solicita
  if (includeReplies) {
    await this.populate(comments, {
      path: 'replies',
      match: { status: 'approved' },
      options: { sort: { createdAt: 1 } },
      populate: {
        path: 'author.userId',
        // Asegurar los mismos campos de usuario en las respuestas
        select: 'firstName lastName username profileImage blogProfile.isPublicProfile blogProfile.avatar'
      }
    });
  }

  const total = await this.countDocuments(query);

  return {
    comments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Obtener thread completo (comentario + respuestas anidadas)
blogCommentSchema.statics.getThread = async function(commentId) {
  const comment = await this.findById(commentId)
    .populate('author.userId', 'firstName lastName avatar username profileImage blogProfile.isPublicProfile blogProfile.avatar');

  if (!comment) {
    return null;
  }

  // Obtener todas las respuestas recursivamente
  const getReplies = async (parentId, currentLevel = 0) => {
    if (currentLevel >= 5) return []; // Límite de profundidad

    const replies = await this.find({ 
      parentComment: parentId,
      status: 'approved'
    })
      .populate('author.userId', 'firstName lastName avatar username profileImage blogProfile.isPublicProfile blogProfile.avatar')
      .sort({ createdAt: 1 });

    // Obtener respuestas de cada respuesta
    for (let reply of replies) {
      reply.replies = await getReplies(reply._id, currentLevel + 1);
    }

    return replies;
  };

  comment.replies = await getReplies(comment._id);
  return comment;
};

// Obtener estadísticas de comentarios de un post
blogCommentSchema.statics.getPostStats = async function(postId) {
  // Convertir a ObjectId si es string
  const objectId = typeof postId === 'string' 
    ? new mongoose.Types.ObjectId(postId)
    : postId;
    
  const stats = await this.aggregate([
    { $match: { post: objectId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    spam: 0,
    hidden: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

// Obtener comentarios para moderación
blogCommentSchema.statics.getModerationQueue = async function(options = {}) {
  const {
    page = 1,
    limit = 50,
    status = 'pending',
    sortBy = 'createdAt',
    sortOrder = 'asc'
  } = options;

  const query = { status };

  // Priorizar reportados
  const comments = await this.find(query)
    .populate('author.userId', 'firstName lastName email avatar username profileImage blogProfile.isPublicProfile blogProfile.avatar')
    .populate('post', 'title slug')
    .sort({ isReported: -1, [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await this.countDocuments(query);

  return {
    comments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Obtener comentarios de un usuario
blogCommentSchema.statics.getUserComments = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status = null
  } = options;

  const query = { 'author.userId': userId };
  if (status) query.status = status;

  const comments = await this.find(query)
    .populate('post', 'title slug')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await this.countDocuments(query);

  return {
    comments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// ========================================
// MIDDLEWARE
// ========================================

// Pre-save: Calcular nivel de anidación
blogCommentSchema.pre('save', async function(next) {
  if (this.isNew && this.parentComment) {
    try {
      const parent = await this.constructor.findById(this.parentComment);
      if (parent) {
        this.level = parent.level + 1;
        
        // Limitar profundidad
        if (this.level > 5) {
          throw new Error('Máximo nivel de anidación alcanzado');
        }
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Post-save: Actualizar contador de respuestas del padre
blogCommentSchema.post('save', async function(doc) {
  if (doc.parentComment) {
    await this.constructor.updateOne(
      { _id: doc.parentComment },
      { $inc: { repliesCount: 1 } }
    );
  }

  // Actualizar contador de comentarios del post
  if (doc.isNew) {
    const BlogPost = mongoose.model('BlogPost');
    await BlogPost.updateOne(
      { _id: doc.post },
      { $inc: { 'analytics.comments': 1 } }
    );
  }
});

// Post-remove: Actualizar contadores
blogCommentSchema.post('remove', async function(doc) {
  if (doc.parentComment) {
    await this.constructor.updateOne(
      { _id: doc.parentComment },
      { $inc: { repliesCount: -1 } }
    );
  }

  // Actualizar contador del post
  const BlogPost = mongoose.model('BlogPost');
  await BlogPost.updateOne(
    { _id: doc.post },
    { $inc: { 'analytics.comments': -1 } }
  );

  // Eliminar respuestas en cascada
  await this.constructor.deleteMany({ parentComment: doc._id });
});

// ========================================
// EXPORT
// ========================================

const BlogComment = mongoose.model('BlogComment', blogCommentSchema);

export default BlogComment;
