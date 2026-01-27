/**
 * Rutas Administrativas para Gestión de Roles y Usuarios
 */

import express from 'express';
import {
  getAllUsers,
  getUserById,
  assignRole,
  toggleUserStatus,
  getUserStats,
  getRolesInfo
} from '../controllers/adminController.js';

import {
  requireAdmin,
  requireSuperAdmin,
  canManageUsers,
  canViewUsers,
  canAssignRoles,
  canManageSpecificUser,
  canAssignSpecificRole
} from '../middleware/roleAuth.js';

const router = express.Router();

/**
 * RUTAS DE INFORMACIÓN Y ESTADÍSTICAS
 */

// @route   GET /api/admin/stats
// @desc    Obtener estadísticas generales de usuarios y roles
// @access  Private (ADMIN, SUPER_ADMIN)
router.get('/stats', requireAdmin, getUserStats);

// @route   GET /api/admin/roles
// @desc    Obtener información de roles disponibles  
// @access  Private (requiere VIEW_ROLES permission)
router.get('/roles', canViewUsers, getRolesInfo);

/**
 * RUTAS DE GESTIÓN DE USUARIOS
 */

// @route   GET /api/admin/users
// @desc    Obtener lista de usuarios con filtros y paginación
// @access  Private (requiere VIEW_USERS permission)
router.get('/users', canViewUsers, getAllUsers);

// @route   GET /api/admin/users/:userId
// @desc    Obtener información detallada de un usuario específico
// @access  Private (requiere VIEW_USERS permission)
router.get('/users/:userId', canViewUsers, getUserById);

/**
 * RUTAS DE MODIFICACIÓN DE USUARIOS
 */

// @route   PUT /api/admin/users/:userId/role
// @desc    Asignar rol a un usuario específico
// @access  Private (requiere ASSIGN_ROLES permission + verificación de jerarquía)
router.put('/users/:userId/role', [
  ...canAssignRoles,
  canManageSpecificUser,
  canAssignSpecificRole
], assignRole);

// @route   PUT /api/admin/users/:userId/status
// @desc    Activar/desactivar un usuario
// @access  Private (requiere MANAGE_USERS permission + verificación de jerarquía)
router.put('/users/:userId/status', [
  ...canManageUsers,
  canManageSpecificUser
], toggleUserStatus);

/**
 * RUTAS ESPECÍFICAS DE SUPER ADMIN
 */

// @route   POST /api/admin/super/create-admin
// @desc    Crear nuevo administrador (solo super admin)
// @access  Private (SUPER_ADMIN only)
router.post('/super/create-admin', requireSuperAdmin, async (req, res) => {
  try {
    const { email, firstName, lastName, password } = req.body;
    
    // TODO: Implementar creación de admin con invitación
    res.json({
      success: true,
      message: 'Funcionalidad de creación de admin en desarrollo',
      data: { email, firstName, lastName }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// @route   GET /api/admin/super/system-info
// @desc    Información del sistema (solo super admin)
// @access  Private (SUPER_ADMIN only)
router.get('/super/system-info', requireSuperAdmin, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version,
          platform: process.platform
        },
        database: {
          status: 'connected', // TODO: implementar check real
          collections: ['users', 'pages', 'services', 'images']
        },
        roles: {
          total: Object.keys(require('../config/roles.js').ROLES).length,
          permissions: Object.keys(require('../config/roles.js').PERMISSIONS).length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo información del sistema',
      error: error.message
    });
  }
});

/**
 * MIDDLEWARE DE MANEJO DE ERRORES PARA RUTAS ADMIN
 */
router.use((error, req, res, next) => {
  console.error('Error en rutas administrativas:', error);
  
  res.status(500).json({
    success: false,
    message: 'Error interno en el sistema administrativo',
    code: 'ADMIN_SYSTEM_ERROR',
    ...(process.env.NODE_ENV === 'development' && { 
      error: error.message,
      stack: error.stack 
    })
  });
});

export default router;