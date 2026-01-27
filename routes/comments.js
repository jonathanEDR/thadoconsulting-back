import express from 'express';
const router = express.Router();

// Middleware
import { requireAuth, requirePermission, optionalAuth } from '../middleware/clerkAuth.js';
import { generalLimiter, writeLimiter, contactLimiter } from '../middleware/securityMiddleware.js';

// Alias para compatibilidad
const hasPermission = requirePermission;

// Controllers
import {
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
} from '../controllers/commentController.js';

import {
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
} from '../controllers/commentModerationController.js';

// ========================================
// RUTAS PÚBLICAS - COMENTARIOS
// ========================================

/**
 * Obtener comentarios de un post
 * GET /api/blog/:slug/comments
 * Query params: page, limit, sortBy, sortOrder, includeReplies
 */
router.get('/blog/:slug/comments', generalLimiter, getPostComments);

/**
 * Obtener estadísticas de comentarios de un post
 * GET /api/blog/:slug/comments/stats
 */
router.get('/blog/:slug/comments/stats', generalLimiter, getPostCommentStats);

/**
 * Obtener un comentario específico con su thread
 * GET /api/comments/:id
 */
router.get('/comments/:id', generalLimiter, getComment);

/**
 * Crear un nuevo comentario
 * POST /api/blog/:slug/comments
 * Body: { content, parentCommentId?, name?, email?, website? }
 * Si está autenticado, usa datos del usuario
 * Si no, requiere name y email
 */
router.post('/blog/:slug/comments', contactLimiter, optionalAuth, createComment);

/**
 * Votar un comentario (like/dislike)
 * POST /api/comments/:id/vote
 * Body: { type: 'like' | 'dislike' }
 */
router.post('/comments/:id/vote', writeLimiter, voteComment);

/**
 * Reportar un comentario
 * POST /api/comments/:id/report
 * Body: { reason, description?, email? }
 */
router.post('/comments/:id/report', writeLimiter, reportComment);

// ========================================
// RUTAS AUTENTICADAS - COMENTARIOS
// ========================================

/**
 * Editar un comentario propio
 * PUT /api/comments/:id
 * Body: { content }
 * Requiere: Ser el autor o moderador
 */
router.put('/comments/:id', requireAuth, updateComment);

/**
 * Eliminar un comentario propio
 * DELETE /api/comments/:id
 * Requiere: Ser el autor o moderador
 */
router.delete('/comments/:id', requireAuth, deleteComment);

/**
 * Obtener comentarios de un usuario
 * GET /api/users/:userId/comments
 * Query params: page, limit, status
 * Requiere: Ser el mismo usuario o moderador
 */
router.get('/users/:userId/comments', requireAuth, getUserComments);

// ========================================
// RUTAS DE MODERACIÓN - REQUIEREN PERMISOS
// ========================================

/**
 * Obtener cola de moderación
 * GET /api/admin/comments/moderation/queue
 * Query params: page, limit, status, sortBy, sortOrder
 * Requiere: Permiso MODERATE_COMMENTS
 */
router.get(
  '/admin/comments/moderation/queue',
  requireAuth,
  hasPermission('MODERATE_COMMENTS'),
  getModerationQueue
);

/**
 * Aprobar un comentario
 * POST /api/admin/comments/:id/approve
 * Body: { notes? }
 * Requiere: Permiso MODERATE_COMMENTS
 */
router.post(
  '/admin/comments/:id/approve',
  requireAuth,
  hasPermission('MODERATE_COMMENTS'),
  approveComment
);

/**
 * Rechazar un comentario
 * POST /api/admin/comments/:id/reject
 * Body: { reason, notes? }
 * Requiere: Permiso MODERATE_COMMENTS
 */
router.post(
  '/admin/comments/:id/reject',
  requireAuth,
  hasPermission('MODERATE_COMMENTS'),
  rejectComment
);

/**
 * Marcar comentario como spam
 * POST /api/admin/comments/:id/spam
 * Body: { notes? }
 * Requiere: Permiso MODERATE_COMMENTS
 */
router.post(
  '/admin/comments/:id/spam',
  requireAuth,
  hasPermission('MODERATE_COMMENTS'),
  markAsSpam
);

/**
 * Fijar comentario
 * POST /api/comments/:id/pin
 * Requiere: Permiso MODERATE_COMMENTS
 */
router.post(
  '/comments/:id/pin',
  requireAuth,
  hasPermission('MODERATE_COMMENTS'),
  pinComment
);

/**
 * Desfijar comentario
 * DELETE /api/comments/:id/pin
 * Requiere: Permiso MODERATE_COMMENTS
 */
router.delete(
  '/comments/:id/pin',
  requireAuth,
  hasPermission('MODERATE_COMMENTS'),
  unpinComment
);

// ========================================
// RUTAS DE MODERACIÓN EN LOTE
// ========================================

/**
 * Aprobar múltiples comentarios
 * POST /api/admin/comments/bulk-approve
 * Body: { commentIds: string[] }
 * Requiere: Permiso MODERATE_COMMENTS
 */
router.post(
  '/admin/comments/bulk-approve',
  requireAuth,
  hasPermission('MODERATE_COMMENTS'),
  bulkApprove
);

/**
 * Rechazar múltiples comentarios
 * POST /api/admin/comments/bulk-reject
 * Body: { commentIds: string[], reason: string }
 * Requiere: Permiso MODERATE_COMMENTS
 */
router.post(
  '/admin/comments/bulk-reject',
  requireAuth,
  hasPermission('MODERATE_COMMENTS'),
  bulkReject
);

/**
 * Marcar múltiples comentarios como spam
 * POST /api/admin/comments/bulk-spam
 * Body: { commentIds: string[] }
 * Requiere: Permiso MODERATE_COMMENTS
 */
router.post(
  '/admin/comments/bulk-spam',
  requireAuth,
  hasPermission('MODERATE_COMMENTS'),
  bulkSpam
);

// ========================================
// RUTAS DE GESTIÓN DE REPORTES
// ========================================

/**
 * Obtener reportes pendientes
 * GET /api/admin/comments/reports
 * Query params: page, limit, reason, priority
 * Requiere: Permiso MODERATE_COMMENTS
 */
router.get(
  '/admin/comments/reports',
  requireAuth,
  hasPermission('MODERATE_COMMENTS'),
  getReports
);

/**
 * Resolver un reporte
 * POST /api/admin/comments/reports/:id/resolve
 * Body: { action, notes? }
 * Actions: comment_removed, comment_edited, comment_approved, report_dismissed, user_warned, user_banned
 * Requiere: Permiso MODERATE_COMMENTS
 */
router.post(
  '/admin/comments/reports/:id/resolve',
  requireAuth,
  hasPermission('MODERATE_COMMENTS'),
  resolveReport
);

/**
 * Descartar un reporte
 * POST /api/admin/comments/reports/:id/dismiss
 * Body: { notes? }
 * Requiere: Permiso MODERATE_COMMENTS
 */
router.post(
  '/admin/comments/reports/:id/dismiss',
  requireAuth,
  hasPermission('MODERATE_COMMENTS'),
  dismissReport
);

/**
 * Estadísticas de reportes
 * GET /api/admin/comments/reports/stats
 * Query params: timeframe (días, default 30)
 * Requiere: Permiso MODERATE_COMMENTS
 */
router.get(
  '/admin/comments/reports/stats',
  requireAuth,
  hasPermission('MODERATE_COMMENTS'),
  getReportStats
);

// ========================================
// RUTAS DE ESTADÍSTICAS Y HERRAMIENTAS
// ========================================

/**
 * Estadísticas generales de moderación
 * GET /api/admin/comments/stats
 * Query params: timeframe (días, default 30)
 * Requiere: Permiso MODERATE_COMMENTS
 */
router.get(
  '/admin/comments/stats',
  requireAuth,
  hasPermission('MODERATE_COMMENTS'),
  getModerationStats
);

/**
 * Re-analizar comentarios pendientes
 * POST /api/admin/comments/reanalyze
 * Body: { limit? }
 * Requiere: Permiso MODERATE_COMMENTS
 */
router.post(
  '/admin/comments/reanalyze',
  requireAuth,
  hasPermission('MODERATE_COMMENTS'),
  reanalyzeComments
);

/**
 * Obtener configuración de moderación
 * GET /api/admin/comments/settings
 * Requiere: Permiso manage_settings
 */
router.get(
  '/admin/comments/settings',
  requireAuth,
  hasPermission('manage_settings'),
  getModerationSettings
);

// ========================================
// EXPORT
// ========================================

export default router;
