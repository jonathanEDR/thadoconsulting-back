import mongoose from 'mongoose';

const commentReportSchema = new mongoose.Schema({
  // Comentario reportado
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BlogComment',
    required: [true, 'El comentario es requerido'],
    index: true
  },

  // Quien reporta
  reporter: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    name: {
      type: String,
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
    ipAddress: {
      type: String,
      trim: true
    }
  },

  // Razón del reporte
  reason: {
    type: String,
    enum: ['spam', 'offensive', 'inappropriate', 'harassment', 'misinformation', 'copyright', 'other'],
    required: [true, 'La razón del reporte es requerida'],
    index: true
  },

  // Descripción detallada
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
  },

  // Estado del reporte
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },

  // Resolución
  resolution: {
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    action: {
      type: String,
      enum: ['comment_removed', 'comment_edited', 'comment_approved', 'report_dismissed', 'user_warned', 'user_banned'],
      default: null
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Las notas no pueden exceder 1000 caracteres']
    }
  },

  // Prioridad (calculada automáticamente)
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  // Metadata
  metadata: {
    userAgent: String,
    referrer: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========================================
// ÍNDICES
// ========================================

commentReportSchema.index({ comment: 1, status: 1 });
commentReportSchema.index({ 'reporter.email': 1 });
commentReportSchema.index({ reason: 1, status: 1 });
commentReportSchema.index({ status: 1, priority: 1, createdAt: -1 });

// ========================================
// MÉTODOS DE INSTANCIA
// ========================================

// Resolver reporte
commentReportSchema.methods.resolve = async function(moderatorId, action, notes) {
  this.status = 'resolved';
  this.resolution.resolvedBy = moderatorId;
  this.resolution.resolvedAt = new Date();
  this.resolution.action = action;
  this.resolution.notes = notes;

  return this.save();
};

// Descartar reporte
commentReportSchema.methods.dismiss = async function(moderatorId, notes) {
  this.status = 'dismissed';
  this.resolution.resolvedBy = moderatorId;
  this.resolution.resolvedAt = new Date();
  this.resolution.action = 'report_dismissed';
  this.resolution.notes = notes;

  return this.save();
};

// Marcar como en revisión
commentReportSchema.methods.startReview = async function() {
  this.status = 'reviewing';
  return this.save();
};

// ========================================
// MÉTODOS ESTÁTICOS
// ========================================

// Obtener reportes pendientes
commentReportSchema.statics.getPendingReports = async function(options = {}) {
  const {
    page = 1,
    limit = 50,
    reason = null,
    priority = null
  } = options;

  const query = { status: { $in: ['pending', 'reviewing'] } };
  if (reason) query.reason = reason;
  if (priority) query.priority = priority;

  const reports = await this.find(query)
    .populate({
      path: 'comment',
      populate: [
        { path: 'author.userId', select: 'firstName lastName email' },
        { path: 'post', select: 'title slug' }
      ]
    })
    .populate('reporter.userId', 'firstName lastName email')
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await this.countDocuments(query);

  return {
    reports,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Obtener estadísticas de reportes
commentReportSchema.statics.getStats = async function(timeframe = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);

  const stats = await this.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        reviewing: {
          $sum: { $cond: [{ $eq: ['$status', 'reviewing'] }, 1, 0] }
        },
        resolved: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        },
        dismissed: {
          $sum: { $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0] }
        }
      }
    }
  ]);

  const reasonStats = await this.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$reason',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  return {
    overview: stats[0] || { total: 0, pending: 0, reviewing: 0, resolved: 0, dismissed: 0 },
    byReason: reasonStats,
    timeframe: `${timeframe} días`
  };
};

// Verificar si un comentario ya fue reportado por un usuario
commentReportSchema.statics.hasUserReported = async function(commentId, email) {
  const report = await this.findOne({
    comment: commentId,
    'reporter.email': email
  });

  return !!report;
};

// ========================================
// MIDDLEWARE
// ========================================

// Pre-save: Calcular prioridad automáticamente
commentReportSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Contar reportes previos del mismo comentario
    const reportCount = await this.constructor.countDocuments({
      comment: this.comment,
      status: { $in: ['pending', 'reviewing'] }
    });

    // Asignar prioridad basada en cantidad de reportes y razón
    if (reportCount >= 5 || this.reason === 'harassment') {
      this.priority = 'critical';
    } else if (reportCount >= 3 || ['offensive', 'misinformation'].includes(this.reason)) {
      this.priority = 'high';
    } else if (reportCount >= 1 || this.reason === 'spam') {
      this.priority = 'medium';
    } else {
      this.priority = 'low';
    }
  }

  next();
});

// Post-save: Actualizar contador de reportes en el comentario
commentReportSchema.post('save', async function(doc) {
  if (doc.isNew && doc.status === 'pending') {
    const BlogComment = mongoose.model('BlogComment');
    const comment = await BlogComment.findById(doc.comment);
    
    if (comment) {
      await comment.incrementReports();
    }
  }
});

// ========================================
// EXPORT
// ========================================

const CommentReport = mongoose.model('CommentReport', commentReportSchema);

export default CommentReport;
