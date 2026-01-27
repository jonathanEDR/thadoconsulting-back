import express from 'express';
import { syncUser, getUserProfile } from '../controllers/userController.js';
import { 
  getEligibleUsers, 
  promoteToClient, 
  updateUserRole,
  getRoleStatistics 
} from '../controllers/userRoleController.js';
import { requireAuth } from '../middleware/clerkAuth.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/roleAuth.js';
import { 
  authLimiter, 
  generalLimiter, 
  writeLimiter,
  validateUserSync,
  validateRoleUpdate,
  validators,
  handleValidationErrors 
} from '../middleware/securityMiddleware.js';
import { param } from 'express-validator';

const router = express.Router();

// ========================================
// 🔄 SINCRONIZACIÓN DE USUARIO
// ========================================

// @route   POST /api/users/sync
// @desc    Sincronizar usuario de Clerk con MongoDB
// @access  Private (llamado desde frontend después de auth)
// ⚠️ Rate limit estricto para prevenir abuso
router.post('/sync', 
  authLimiter,           // 🚦 5 intentos/15 min
  validateUserSync,      // ✅ Validar datos de Clerk
  syncUser
);

// @route   GET /api/users/profile/:clerkId
// @desc    Obtener perfil de usuario desde MongoDB
// @access  Private  
router.get('/profile/:clerkId', 
  generalLimiter,
  param('clerkId')
    .trim()
    .notEmpty()
    .withMessage('ClerkId es requerido')
    .matches(/^user_[a-zA-Z0-9]+$/)
    .withMessage('ClerkId inválido'),
  handleValidationErrors,
  getUserProfile
);

// ========================================
// 🎯 GESTIÓN DE ROLES Y PROMOCIONES
// ========================================

// @route   GET /api/users/eligible-for-promotion
// @desc    Obtener usuarios USER elegibles para promoción a CLIENT
// @access  Private (Admin/SuperAdmin)
router.get('/eligible-for-promotion', 
  generalLimiter,
  requireAdmin, 
  getEligibleUsers
);

// @route   POST /api/users/promote-to-client
// @desc    Promover usuario de USER a CLIENT
// @access  Private (Admin/SuperAdmin)
// ⚠️ Operación crítica: rate limiting estricto
router.post('/promote-to-client', 
  writeLimiter,
  requireAdmin,
  validators.clerkId,     // ✅ Validar clerkId del usuario a promover
  handleValidationErrors,
  promoteToClient
);

// @route   PATCH /api/users/:userId/role
// @desc    Cambiar rol de un usuario (solo SuperAdmin)
// @access  Private (SuperAdmin only)
// ⚠️ Operación MUY crítica: solo super_admin
router.patch('/:userId/role', 
  writeLimiter,
  requireSuperAdmin,
  validateRoleUpdate,     // ✅ Validar userId y role
  updateUserRole
);

// @route   GET /api/users/role-stats
// @desc    Obtener estadísticas de usuarios por rol
// @access  Private (Admin/SuperAdmin)
router.get('/role-stats', 
  generalLimiter,
  requireAdmin, 
  getRoleStatistics
);

export default router;