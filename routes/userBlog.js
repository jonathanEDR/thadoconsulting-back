/**
 * 👤 User Blog Routes
 * Rutas para la actividad personal del usuario en el blog
 */

import express from 'express';
import { requireAuth } from '../middleware/clerkAuth.js';

import {
  getUserBlogStats,
  getMyComments,
  deleteMyComment,
  getMyBookmarks,
  toggleBookmark,
  getMyLikes,
  toggleLike,
  getReadingHistory,
  addToReadingHistory
} from '../controllers/userBlogController.js';

const router = express.Router();

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================

router.use(requireAuth);

// ============================================
// ESTADÍSTICAS
// ============================================

/**
 * @route   GET /api/user-blog/stats
 * @desc    Obtener estadísticas de actividad del usuario
 * @access  Private
 */
router.get('/stats', getUserBlogStats);

// ============================================
// COMENTARIOS
// ============================================

/**
 * @route   GET /api/user-blog/my-comments
 * @desc    Obtener comentarios del usuario
 * @access  Private
 * @query   ?page=1&limit=10&status=approved&postSlug=example&sortBy=-createdAt
 */
router.get('/my-comments', getMyComments);

/**
 * @route   DELETE /api/user-blog/my-comments/:commentId
 * @desc    Eliminar un comentario propio
 * @access  Private
 */
router.delete('/my-comments/:commentId', deleteMyComment);

// ============================================
// BOOKMARKS
// ============================================

/**
 * @route   GET /api/user-blog/bookmarks
 * @desc    Obtener posts guardados
 * @access  Private
 * @query   ?page=1&limit=12&category=id&sortBy=-bookmarkedAt
 */
router.get('/bookmarks', getMyBookmarks);

/**
 * @route   POST /api/user-blog/bookmarks/:postId
 * @desc    Toggle bookmark en un post
 * @access  Private
 */
router.post('/bookmarks/:postId', toggleBookmark);

// ============================================
// LIKES
// ============================================

/**
 * @route   GET /api/user-blog/likes
 * @desc    Obtener posts con like
 * @access  Private
 * @query   ?page=1&limit=10&sortBy=-likedAt
 */
router.get('/likes', getMyLikes);

/**
 * @route   POST /api/user-blog/likes/:postId
 * @desc    Toggle like en un post
 * @access  Private
 */
router.post('/likes/:postId', toggleLike);

// ============================================
// HISTORIAL DE LECTURA
// ============================================

/**
 * @route   GET /api/user-blog/reading-history
 * @desc    Obtener historial de lectura
 * @access  Private
 * @query   ?page=1&limit=20&period=week
 */
router.get('/reading-history', getReadingHistory);

/**
 * @route   POST /api/user-blog/reading-history/:postId
 * @desc    Registrar lectura de un post
 * @access  Private
 * @body    { progress: 50 }
 */
router.post('/reading-history/:postId', addToReadingHistory);

export default router;
