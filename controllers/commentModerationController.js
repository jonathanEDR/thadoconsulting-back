import BlogComment from '../models/BlogComment.js';
import CommentReport from '../models/CommentReport.js';
import BlogPost from '../models/BlogPost.js';
import { batchReanalyze, updateAuthorReputation } from '../utils/commentModerator.js';
import { handleCommentNotifications } from '../utils/commentNotifier.js';

// ========================================
// COLA DE MODERACIÓN
// ========================================

/**
 * GET /api/admin/comments/moderation/queue
 * Obtiene comentarios pendientes de moderación
 */
const getModerationQueue = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status = 'pending',
      sortBy = 'createdAt',
      sortOrder = 'asc'
    } = req.query;

    const result = await BlogComment.getModerationQueue({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      data: {
        data: result.comments,
        pagination: result.pagination
      }
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener cola de moderación',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// APROBAR COMENTARIO
// ========================================

/**
 * POST /api/admin/comments/:id/approve
 * Aprueba un comentario
 */
const approveComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const comment = await BlogComment.findById(id)
      .populate('post', 'title slug author');
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado'
      });
    }

    // Aprobar
    await comment.approve(req.userId);

    // Agregar notas si las hay
    if (notes) {
      comment.moderation.notes = notes;
      await comment.save();
    }

    // Actualizar reputación del autor
    try {
      await updateAuthorReputation(comment.author.email);
    } catch (repError) {
      
    }

    // Notificar al autor
    try {
      await handleCommentNotifications('comment.approved', {
        comment,
        post: comment.post
      });
    } catch (notifError) {
      
    }

    res.json({
      success: true,
      message: 'Comentario aprobado exitosamente',
      data: comment
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al aprobar comentario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// RECHAZAR COMENTARIO
// ========================================

/**
 * POST /api/admin/comments/:id/reject
 * Rechaza un comentario
 */
const rejectComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'La razón del rechazo es requerida'
      });
    }

    const comment = await BlogComment.findById(id)
      .populate('post', 'title slug author');
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado'
      });
    }

    // Rechazar
    await comment.reject(req.userId, reason);

    // Agregar notas si las hay
    if (notes) {
      comment.moderation.notes = notes;
      await comment.save();
    }

    // Actualizar reputación del autor
    try {
      await updateAuthorReputation(comment.author.email);
    } catch (repError) {
      
    }

    // Notificar al autor
    try {
      await handleCommentNotifications('comment.rejected', {
        comment,
        post: comment.post,
        reason
      });
    } catch (notifError) {
      
    }

    res.json({
      success: true,
      message: 'Comentario rechazado exitosamente',
      data: comment
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al rechazar comentario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// MARCAR COMO SPAM
// ========================================

/**
 * POST /api/admin/comments/:id/spam
 * Marca un comentario como spam
 */
const markAsSpam = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const comment = await BlogComment.findById(id);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado'
      });
    }

    // Marcar como spam
    await comment.markAsSpam(req.userId);

    // Agregar notas si las hay
    if (notes) {
      comment.moderation.notes = notes;
      await comment.save();
    }

    // Actualizar reputación del autor (penalización mayor)
    try {
      await updateAuthorReputation(comment.author.email);
    } catch (repError) {
      
    }

    res.json({
      success: true,
      message: 'Comentario marcado como spam',
      data: comment
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al marcar como spam',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// MODERACIÓN EN LOTE
// ========================================

/**
 * POST /api/admin/comments/bulk-approve
 * Aprueba múltiples comentarios
 */
const bulkApprove = async (req, res) => {
  try {
    const { commentIds } = req.body;

    if (!Array.isArray(commentIds) || commentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de comentarios'
      });
    }

    const results = {
      approved: 0,
      failed: 0,
      errors: []
    };

    for (const id of commentIds) {
      try {
        const comment = await BlogComment.findById(id);
        if (comment) {
          await comment.approve(req.userId);
          results.approved++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ id, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `${results.approved} comentarios aprobados, ${results.failed} fallidos`,
      data: results
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error en aprobación masiva',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * POST /api/admin/comments/bulk-reject
 * Rechaza múltiples comentarios
 */
const bulkReject = async (req, res) => {
  try {
    const { commentIds, reason } = req.body;

    if (!Array.isArray(commentIds) || commentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de comentarios'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'La razón del rechazo es requerida'
      });
    }

    const results = {
      rejected: 0,
      failed: 0,
      errors: []
    };

    for (const id of commentIds) {
      try {
        const comment = await BlogComment.findById(id);
        if (comment) {
          await comment.reject(req.userId, reason);
          results.rejected++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ id, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `${results.rejected} comentarios rechazados, ${results.failed} fallidos`,
      data: results
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error en rechazo masivo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * POST /api/admin/comments/bulk-spam
 * Marca múltiples comentarios como spam
 */
const bulkSpam = async (req, res) => {
  try {
    const { commentIds } = req.body;

    if (!Array.isArray(commentIds) || commentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de comentarios'
      });
    }

    const results = {
      marked: 0,
      failed: 0,
      errors: []
    };

    for (const id of commentIds) {
      try {
        const comment = await BlogComment.findById(id);
        if (comment) {
          await comment.markAsSpam(req.userId);
          results.marked++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ id, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `${results.marked} comentarios marcados como spam, ${results.failed} fallidos`,
      data: results
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al marcar spam masivo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// GESTIÓN DE REPORTES
// ========================================

/**
 * GET /api/admin/comments/reports
 * Obtiene reportes pendientes
 */
const getReports = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      reason = null,
      priority = null
    } = req.query;

    const result = await CommentReport.getPendingReports({
      page: parseInt(page),
      limit: parseInt(limit),
      reason,
      priority
    });

    res.json({
      success: true,
      data: result.reports,
      pagination: result.pagination
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener reportes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * POST /api/admin/comments/reports/:id/resolve
 * Resuelve un reporte
 */
const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;

    const validActions = ['comment_removed', 'comment_edited', 'comment_approved', 'report_dismissed', 'user_warned', 'user_banned'];
    
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Acción inválida',
        validActions
      });
    }

    const report = await CommentReport.findById(id)
      .populate('comment');
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Reporte no encontrado'
      });
    }

    // Resolver reporte
    await report.resolve(req.userId, action, notes || '');

    // Tomar acción sobre el comentario si es necesario
    if (report.comment) {
      switch (action) {
        case 'comment_removed':
          await report.comment.markAsSpam(req.userId);
          break;
        case 'comment_approved':
          await report.comment.approve(req.userId);
          break;
      }
    }

    res.json({
      success: true,
      message: 'Reporte resuelto exitosamente',
      data: report
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al resolver reporte',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * POST /api/admin/comments/reports/:id/dismiss
 * Descarta un reporte
 */
const dismissReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const report = await CommentReport.findById(id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Reporte no encontrado'
      });
    }

    await report.dismiss(req.userId, notes || 'Reporte descartado sin acción');

    res.json({
      success: true,
      message: 'Reporte descartado',
      data: report
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al descartar reporte',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// ESTADÍSTICAS DE MODERACIÓN
// ========================================

/**
 * GET /api/admin/comments/stats
 * Obtiene estadísticas generales de comentarios
 */
const getModerationStats = async (req, res) => {
  try {
    const { timeframe = 30 } = req.query;

    // Estadísticas de comentarios
    const commentStats = await BlogComment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const commentsByStatus = {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      spam: 0,
      hidden: 0
    };

    commentStats.forEach(stat => {
      commentsByStatus[stat._id] = stat.count;
      commentsByStatus.total += stat.count;
    });

    // Estadísticas de reportes
    const reportStats = await CommentReport.getStats(parseInt(timeframe));

    // Comentarios recientes que necesitan atención
    const needsAttention = await BlogComment.countDocuments({
      $or: [
        { status: 'pending' },
        { isReported: true, status: 'approved' }
      ]
    });

    // Top autores por comentarios
    const topAuthors = await BlogComment.aggregate([
      {
        $match: { status: 'approved' }
      },
      {
        $group: {
          _id: '$author.email',
          name: { $first: '$author.name' },
          count: { $sum: 1 },
          avgScore: { $avg: '$votes.score' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Promedio de tiempo de moderación
    const avgModerationTime = await BlogComment.aggregate([
      {
        $match: {
          status: { $in: ['approved', 'rejected'] },
          'moderation.approvedAt': { $exists: true }
        }
      },
      {
        $project: {
          moderationTime: {
            $subtract: [
              { $ifNull: ['$moderation.approvedAt', '$moderation.rejectedAt'] },
              '$createdAt'
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$moderationTime' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        comments: commentsByStatus,
        reports: reportStats,
        needsAttention,
        topAuthors,
        avgModerationTimeMs: avgModerationTime[0]?.avgTime || 0,
        avgModerationTimeHours: avgModerationTime[0]?.avgTime 
          ? (avgModerationTime[0].avgTime / (1000 * 60 * 60)).toFixed(2)
          : 0
      }
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/admin/comments/reports/stats
 * Obtiene estadísticas de reportes
 */
const getReportStats = async (req, res) => {
  try {
    const { timeframe = 30 } = req.query;

    const stats = await CommentReport.getStats(parseInt(timeframe));

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de reportes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// RE-ANÁLISIS DE COMENTARIOS
// ========================================

/**
 * POST /api/admin/comments/reanalyze
 * Re-analiza comentarios pendientes con moderación automática
 */
const reanalyzeComments = async (req, res) => {
  try {
    const { limit = 100 } = req.body;

    const results = await batchReanalyze(parseInt(limit));

    res.json({
      success: true,
      message: `${results.processed} comentarios re-analizados`,
      data: results
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al re-analizar comentarios',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// CONFIGURACIÓN DE MODERACIÓN
// ========================================

/**
 * GET /api/admin/comments/settings
 * Obtiene configuración de moderación
 */
const getModerationSettings = async (req, res) => {
  try {
    // TODO: Implementar almacenamiento de configuración en DB
    const settings = {
      autoApprove: {
        enabled: true,
        minScore: 80,
        minReputation: 0.8,
        minCommentsCount: 10
      },
      autoReject: {
        enabled: true,
        maxScore: 30
      },
      requireModeration: {
        firstTimeCommenters: true,
        guestComments: true,
        commentsWithLinks: true
      },
      notifications: {
        emailModerators: true,
        emailAuthors: true
      }
    };

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// EXPORT
// ========================================

export {
  getModerationQueue,
  approveComment,
  rejectComment,
  markAsSpam,
  bulkApprove,
  bulkReject,
  bulkSpam,
  getReports,
  resolveReport,
  dismissReport,
  getModerationStats,
  getReportStats,
  reanalyzeComments,
  getModerationSettings
};
