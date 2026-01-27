import express from 'express';
import {
  getAllPages,
  getPageBySlug,
  updatePage,
  createPage,
  initHomePage,
  initAllPages
} from '../controllers/cmsController.js';
import { requireAuth } from '../middleware/clerkAuth.js';
import { canManageContent, canManageSystem } from '../middleware/roleAuth.js';
import { initializeDatabase, checkDatabaseHealth } from '../utils/dbInitializer.js';
import validateCardStylesMiddleware from '../middleware/validateCardStyles.js';
import { 
  generalLimiter, 
  writeLimiter,
  validateCmsUpdate,
  validators,
  handleValidationErrors 
} from '../middleware/securityMiddleware.js';

const router = express.Router();

// ============================================
// 🌐 RUTAS PÚBLICAS (Con Rate Limiting)
// ============================================

// Rutas públicas (sin autenticación pero con rate limiting)
router.get('/pages', generalLimiter, getAllPages);
router.get('/pages/:slug', generalLimiter, validators.pageSlug, handleValidationErrors, getPageBySlug);

// Health check de base de datos
router.get('/health', generalLimiter, async (req, res) => {
  try {
    const health = await checkDatabaseHealth();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al verificar salud de la base de datos',
      error: error.message
    });
  }
});

// ============================================
// 🔒 RUTAS PROTEGIDAS (Autenticación + Rate Limiting)
// ============================================

// Rutas protegidas (requieren permisos de gestión de contenido)
// ⚠️ Operaciones críticas: rate limiting estricto
router.put('/pages/:slug', 
  writeLimiter,
  canManageContent, 
  validators.pageSlug,
  validators.cmsContent,
  handleValidationErrors,
  validateCardStylesMiddleware, 
  updatePage
);

router.post('/pages', 
  writeLimiter,
  canManageContent, 
  validators.cmsContent,
  handleValidationErrors,
  validateCardStylesMiddleware, 
  createPage
);

router.post('/pages/init-home', 
  writeLimiter,
  canManageContent, 
  initHomePage
);

router.post('/pages/init-all', 
  writeLimiter,
  canManageContent, 
  initAllPages
);

// ============================================
// ⚠️ RUTAS DE SISTEMA (Solo Super Admins)
// ============================================

// Forzar re-inicialización de base de datos (solo para admins con permisos de sistema)
// ⚠️ Operación MUY crítica: rate limiting muy estricto
router.post('/init-database', 
  writeLimiter,
  canManageSystem, 
  async (req, res) => {
    try {
      console.log('🔄 Forzando re-inicialización de base de datos...');
      await initializeDatabase();
      
      res.json({
        success: true,
        message: 'Base de datos inicializada correctamente'
      });
    } catch (error) {
      console.error('Error al inicializar base de datos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al inicializar base de datos',
        error: error.message
      });
    }
  }
);

export default router;
