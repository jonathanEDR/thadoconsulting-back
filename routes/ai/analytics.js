/**
 * 📊 AI Analytics Routes
 * Endpoints para tracking y analytics de IA
 */

import express from 'express';
import aiTrackingService from '../../services/aiTrackingService.js';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';

const router = express.Router();

/**
 * POST /api/ai/track/accept
 * Marcar sugerencia como aceptada
 */
router.post('/track/accept', requireAuth, async (req, res) => {
  try {
    const { trackingId, modifiedText } = req.body;
    
    if (!trackingId) {
      return res.status(400).json({
        success: false,
        message: 'trackingId es requerido'
      });
    }

    const success = await aiTrackingService.markAsAccepted(trackingId, modifiedText);
    
    if (success) {
      logger.info(`✅ Sugerencia aceptada por ${req.user?.id}: ${trackingId}`);
      res.json({
        success: true,
        message: 'Sugerencia marcada como aceptada'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Interacción no encontrada'
      });
    }
  } catch (error) {
    logger.error('Error marcando sugerencia como aceptada:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/ai/track/reject
 * Marcar sugerencia como rechazada
 */
router.post('/track/reject', requireAuth, async (req, res) => {
  try {
    const { trackingId } = req.body;
    
    if (!trackingId) {
      return res.status(400).json({
        success: false,
        message: 'trackingId es requerido'
      });
    }

    const success = await aiTrackingService.markAsRejected(trackingId);
    
    if (success) {
      logger.info(`❌ Sugerencia rechazada por ${req.user?.id}: ${trackingId}`);
      res.json({
        success: true,
        message: 'Sugerencia marcada como rechazada'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Interacción no encontrada'
      });
    }
  } catch (error) {
    logger.error('Error marcando sugerencia como rechazada:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/ai/track/rating
 * Agregar rating a una sugerencia
 */
router.post('/track/rating', requireAuth, async (req, res) => {
  try {
    const { trackingId, rating, feedback } = req.body;
    
    if (!trackingId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'trackingId y rating son requeridos'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating debe estar entre 1 y 5'
      });
    }

    const success = await aiTrackingService.addRating(trackingId, rating, feedback);
    
    if (success) {
      logger.info(`⭐ Rating agregado por ${req.user?.id}: ${trackingId} - ${rating}/5`);
      res.json({
        success: true,
        message: 'Rating agregado correctamente'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Interacción no encontrada'
      });
    }
  } catch (error) {
    logger.error('Error agregando rating:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/ai/stats/general
 * Obtener estadísticas generales de IA
 */
router.get('/stats/general', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Filtro por fecha
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const filters = {
      createdAt: { $gte: startDate }
    };

    const stats = await aiTrackingService.getGeneralStats(filters);
    
    res.json({
      success: true,
      data: {
        ...stats,
        period: `${days} días`,
        acceptanceRate: stats.total > 0 ? (stats.accepted / stats.total * 100).toFixed(2) : 0,
        cacheHitRate: stats.total > 0 ? (stats.cached / stats.total * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    logger.error('Error obteniendo estadísticas generales:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/ai/stats/user
 * Obtener estadísticas de usuario
 */
router.get('/stats/user', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { days = 30 } = req.query;
    
    const stats = await aiTrackingService.getUserStats(userId, parseInt(days));
    
    res.json({
      success: true,
      data: {
        userId,
        period: `${days} días`,
        interactions: stats
      }
    });
  } catch (error) {
    logger.error('Error obteniendo estadísticas de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/ai/stats/performance
 * Obtener estadísticas de performance
 */
router.get('/stats/performance', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const stats = await aiTrackingService.getPerformanceStats(parseInt(days));
    
    res.json({
      success: true,
      data: {
        ...stats,
        period: `${days} días`,
        cacheHitRate: stats.totalRequests > 0 ? (stats.cacheHits / stats.totalRequests * 100).toFixed(2) : 0,
        acceptanceRatePercent: (stats.acceptanceRate * 100).toFixed(2)
      }
    });
  } catch (error) {
    logger.error('Error obteniendo estadísticas de performance:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/ai/interactions/recent
 * Obtener interacciones recientes
 */
router.get('/interactions/recent', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, type } = req.query;
    
    const filters = {};
    if (type) {
      filters.interactionType = type;
    }
    
    const interactions = await aiTrackingService.getRecentInteractions(filters, parseInt(limit));
    
    res.json({
      success: true,
      data: interactions
    });
  } catch (error) {
    logger.error('Error obteniendo interacciones recientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/ai/session/create
 * Crear nueva sesión de tracking
 */
router.post('/session/create', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { postId, metadata = {} } = req.body;
    
    const sessionId = aiTrackingService.createSession(userId, {
      ...metadata,
      postId,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    });
    
    res.json({
      success: true,
      data: {
        sessionId,
        userId
      }
    });
  } catch (error) {
    logger.error('Error creando sesión de tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;