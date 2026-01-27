import BlogComment from '../models/BlogComment.js';
import CommentReport from '../models/CommentReport.js';
import BlogPost from '../models/BlogPost.js';
import { moderateNewComment } from '../utils/commentModerator.js';
import { handleCommentNotifications } from '../utils/commentNotifier.js';
import commentCacheService from '../services/commentCacheService.js';

// ========================================
// OBTENER COMENTARIOS DE UN POST
// ========================================

/**
 * GET /api/blog/:slug/comments
 * Obtiene comentarios de un post específico
 * ✅ Optimizado con caché
 */
const getPostComments = async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeReplies = 'true'
    } = req.query;

    // Buscar el post
    const post = await BlogPost.findOne({ slug }).select('_id').lean();
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    // ✅ Usar caché para obtener comentarios
    const result = await commentCacheService.getPostComments(post._id.toString(), {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
      includeReplies: includeReplies === 'true'
    });

    res.json({
      success: true,
      data: result.comments,
      pagination: result.pagination
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener comentarios',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/comments/:id
 * Obtiene un comentario específico con su thread
 */
const getComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await BlogComment.getThread(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado'
      });
    }

    // Solo mostrar si está aprobado (o si es el autor o moderador)
    const isAuthor = req.userId && comment.author.userId?.toString() === req.userId;
    const isModerator = req.user?.permissions?.includes('moderate_comments');

    if (comment.status !== 'approved' && !isAuthor && !isModerator) {
      return res.status(403).json({
        success: false,
        message: 'Comentario no disponible'
      });
    }

    res.json({
      success: true,
      data: comment
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener comentario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// CREAR COMENTARIO
// ========================================

/**
 * POST /api/blog/:slug/comments
 * Crea un nuevo comentario
 * ✅ Validación de límites por usuario
 */
const createComment = async (req, res) => {
  try {
    const { slug } = req.params;
    const { content, parentCommentId, name, email, website } = req.body;

    // Validar campos requeridos
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El contenido del comentario es requerido'
      });
    }

    // Si no está autenticado, requiere name y email
    if (!req.userId) {
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: 'Nombre y email son requeridos para comentar como invitado'
        });
      }
    }

    // Buscar el post
    const post = await BlogPost.findOne({ slug })
      .select('_id allowComments author') // ✅ Optimizado: solo campos necesarios
      .populate('author', 'email') // ✅ Solo email (para notificaciones)
      .lean();
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    // Verificar que el post permita comentarios
    if (!post.allowComments) {
      return res.status(403).json({
        success: false,
        message: 'Los comentarios están deshabilitados para este post'
      });
    }

    // ✅ NUEVO: Verificar límites de comentarios por usuario (solo para usuarios registrados)
    if (req.userId) {
      const isReply = !!parentCommentId;
      const limitCheck = await commentCacheService.canUserComment(
        post._id.toString(),
        req.userId.toString(),
        isReply
      );
      
      if (!limitCheck.canComment) {
        return res.status(429).json({
          success: false,
          message: limitCheck.reason,
          code: 'COMMENT_LIMIT_EXCEEDED',
          counts: limitCheck.counts
        });
      }
    }

    // Construir datos del autor
    let authorData = {
      isRegistered: false
    };

    if (req.userId) {
      // Usuario autenticado
      authorData = {
        userId: req.userId,
        name: req.user?.firstName + ' ' + req.user?.lastName || name,
        email: req.user?.email || email,
        avatar: req.user?.avatar,
        isRegistered: true
      };
    } else {
      // Usuario invitado
      authorData = {
        name,
        email,
        website,
        isRegistered: false
      };
    }

    // Verificar comentario padre si existe
    let parentComment = null;
    if (parentCommentId) {
      parentComment = await BlogComment.findById(parentCommentId);
      
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: 'Comentario padre no encontrado'
        });
      }

      // Verificar que no exceda el nivel máximo de anidación
      if (parentComment.level >= 5) {
        return res.status(400).json({
          success: false,
          message: 'Máximo nivel de anidación alcanzado'
        });
      }
    }

    // Crear comentario
    const comment = new BlogComment({
      content: content.trim(),
      author: authorData,
      post: post._id,
      parentComment: parentCommentId || null,
      metadata: {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer
      }
    });

    // Aplicar moderación automática
    const moderationResult = await moderateNewComment(comment);
    
    // Guardar comentario
    await moderationResult.comment.save();

    // ✅ NUEVO: Actualizar caché
    const isReply = !!parentCommentId;
    if (req.userId) {
      // Incrementar conteo del usuario
      commentCacheService.incrementUserCount(post._id.toString(), req.userId.toString(), isReply);
    }
    // Invalidar caché de comentarios del post
    commentCacheService.invalidatePost(post._id.toString());

    // Enviar notificaciones
    try {
      await handleCommentNotifications('comment.created', {
        comment: moderationResult.comment,
        post,
        analysis: moderationResult.analysis,
        originalComment: parentComment
      });
    } catch (notifError) {
            // No fallar la creación por errores de notificación
    }

    // Respuesta
    res.status(201).json({
      success: true,
      message: moderationResult.comment.status === 'approved' 
        ? 'Comentario publicado exitosamente'
        : 'Comentario enviado, pendiente de moderación',
      data: {
        comment: moderationResult.comment,
        moderation: {
          status: moderationResult.comment.status,
          score: moderationResult.analysis.score,
          requiresReview: moderationResult.comment.status === 'pending'
        }
      }
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al crear comentario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// EDITAR COMENTARIO
// ========================================

/**
 * PUT /api/comments/:id
 * Edita un comentario (solo el autor o moderador)
 */
const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El contenido es requerido'
      });
    }

    const comment = await BlogComment.findById(id);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado'
      });
    }

    // Verificar permisos
    const isAuthor = req.userId && comment.author.userId?.toString() === req.userId;
    const isModerator = req.user?.permissions?.includes('moderate_comments');

    if (!isAuthor && !isModerator) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para editar este comentario'
      });
    }

    // No permitir editar comentarios rechazados o spam
    if (['rejected', 'spam'].includes(comment.status) && !isModerator) {
      return res.status(403).json({
        success: false,
        message: 'No se puede editar un comentario rechazado'
      });
    }

    // Editar comentario
    await comment.edit(content.trim(), req.userId);

    // Si es editado por el autor, puede requerir nueva moderación
    if (isAuthor && comment.status === 'approved') {
      const moderationResult = await moderateNewComment(comment);
      comment.moderation = moderationResult.comment.moderation;
      comment.status = moderationResult.comment.status;
      await comment.save();
    }

    res.json({
      success: true,
      message: 'Comentario actualizado exitosamente',
      data: comment
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al actualizar comentario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// ELIMINAR COMENTARIO
// ========================================

/**
 * DELETE /api/comments/:id
 * Elimina un comentario (solo el autor o moderador)
 * ✅ Invalida caché al eliminar
 */
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await BlogComment.findById(id);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado'
      });
    }

    // Verificar permisos
    const isAuthor = req.userId && comment.author.userId?.toString() === req.userId;
    const isModerator = req.user?.permissions?.includes('moderate_comments');

    if (!isAuthor && !isModerator) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar este comentario'
      });
    }

    // Guardar datos antes de eliminar para invalidar caché
    const postId = comment.post.toString();
    const authorUserId = comment.author.userId?.toString();
    const isReply = !!comment.parentComment;

    // Si tiene respuestas, no eliminar físicamente sino ocultar
    if (comment.repliesCount > 0) {
      comment.content = '[Comentario eliminado por el usuario]';
      comment.status = 'hidden';
      await comment.save();

      // ✅ Invalidar caché
      commentCacheService.invalidatePost(postId);

      return res.json({
        success: true,
        message: 'Comentario ocultado (tiene respuestas)',
        data: { hidden: true }
      });
    }

    // Eliminar físicamente
    await comment.deleteOne();

    // ✅ Invalidar caché y decrementar conteo
    commentCacheService.invalidatePost(postId);
    if (authorUserId) {
      commentCacheService.decrementUserCount(postId, authorUserId, isReply);
    }

    res.json({
      success: true,
      message: 'Comentario eliminado exitosamente'
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al eliminar comentario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// VOTACIÓN
// ========================================

/**
 * POST /api/comments/:id/vote
 * Vota un comentario (like/dislike)
 */
const voteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    if (!['like', 'dislike'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de voto inválido (like/dislike)'
      });
    }

    const comment = await BlogComment.findById(id);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado'
      });
    }

    // Solo comentarios aprobados pueden ser votados
    if (comment.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'No se puede votar este comentario'
      });
    }

    // Identificador del votante (usuario o IP)
    const voterId = req.userId || req.ip;

    // Votar
    await comment.vote(voterId, type);

    res.json({
      success: true,
      message: 'Voto registrado',
      data: {
        likes: comment.votes.likes,
        dislikes: comment.votes.dislikes,
        score: comment.votes.score
      }
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al votar comentario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// REPORTAR COMENTARIO
// ========================================

/**
 * POST /api/comments/:id/report
 * Reporta un comentario
 */
const reportComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;

    const validReasons = ['spam', 'offensive', 'inappropriate', 'harassment', 'misinformation', 'copyright', 'other'];
    
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'Razón de reporte inválida',
        validReasons
      });
    }

    const comment = await BlogComment.findById(id);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado'
      });
    }

    // Datos del reportador
    const reporterData = {
      name: req.user?.firstName + ' ' + req.user?.lastName || 'Anónimo',
      email: req.user?.email || req.body.email,
      ipAddress: req.ip
    };

    if (req.userId) {
      reporterData.userId = req.userId;
    }

    if (!reporterData.email) {
      return res.status(400).json({
        success: false,
        message: 'Email requerido para reportar'
      });
    }

    // Verificar si ya reportó este comentario
    const hasReported = await CommentReport.hasUserReported(id, reporterData.email);
    
    if (hasReported) {
      return res.status(400).json({
        success: false,
        message: 'Ya has reportado este comentario'
      });
    }

    // Crear reporte
    const report = new CommentReport({
      comment: id,
      reporter: reporterData,
      reason,
      description: description || '',
      metadata: {
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer
      }
    });

    await report.save();

    res.status(201).json({
      success: true,
      message: 'Reporte enviado exitosamente. Será revisado por nuestro equipo.',
      data: {
        reportId: report._id,
        status: report.status
      }
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al reportar comentario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// ESTADÍSTICAS DE COMENTARIOS
// ========================================

/**
 * GET /api/blog/:slug/comments/stats
 * Obtiene estadísticas de comentarios de un post
 * ✅ Optimizado con caché
 */
const getPostCommentStats = async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await BlogPost.findOne({ slug }).select('_id').lean();
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    // ✅ Usar caché para estadísticas
    const stats = await commentCacheService.getPostStats(post._id.toString());

    res.json({
      success: true,
      data: stats
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
 * GET /api/users/:userId/comments
 * Obtiene comentarios de un usuario
 */
const getUserComments = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, status = null } = req.query;

    // Verificar permisos (solo el usuario o moderador)
    if (req.userId !== userId && !req.user?.permissions?.includes('moderate_comments')) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver estos comentarios'
      });
    }

    const result = await BlogComment.getUserComments(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    res.json({
      success: true,
      data: result.comments,
      pagination: result.pagination
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener comentarios del usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// FIJAR/DESFIJAR COMENTARIO (MODERADOR)
// ========================================

/**
 * POST /api/comments/:id/pin
 * Fija un comentario
 */
const pinComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await BlogComment.findById(id);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado'
      });
    }

    await comment.pin(req.userId);

    res.json({
      success: true,
      message: 'Comentario fijado exitosamente',
      data: comment
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al fijar comentario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * DELETE /api/comments/:id/pin
 * Desfija un comentario
 */
const unpinComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await BlogComment.findById(id);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado'
      });
    }

    await comment.unpin();

    res.json({
      success: true,
      message: 'Comentario desfijado exitosamente',
      data: comment
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al desfijar comentario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// EXPORT
// ========================================

export {
  getPostComments,
  getComment,
  createComment,
  updateComment,
  deleteComment,
  voteComment,
  reportComment,
  getPostCommentStats,
  getUserComments,
  pinComment,
  unpinComment
};
