/**
 * Middleware de Autorización por Roles
 * Funciones específicas para cada rol del sistema
 */

import { ROLES, PERMISSIONS, canAssignRole, ROLE_HIERARCHY } from '../config/roles.js';
import { requireAuth, requireRole, requirePermission, requireAnyRole } from './clerkAuth.js';
import logger from '../utils/logger.js';

/**
 * MIDDLEWARES POR ROL ESPECÍFICO
 */

// Super Administrador - Control total
export const requireSuperAdmin = [
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN)
];

// Administrador - Gestión completa excepto super admins
export const requireAdmin = [
  requireAuth,
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN])
];

// Moderador - Moderación y gestión limitada
export const requireModerator = [
  requireAuth,
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR])
];

// Cliente - Acceso a servicios cliente
export const requireClient = [
  requireAuth,
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR, ROLES.CLIENT])
];

// Usuario autenticado (cualquier rol)
export const requireUser = [
  requireAuth
];

/**
 * MIDDLEWARES POR PERMISOS ESPECÍFICOS
 */

// Gestión de usuarios
export const canManageUsers = [
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_USERS)
];

export const canViewUsers = [
  requireAuth,
  requirePermission(PERMISSIONS.VIEW_USERS)
];

// Gestión de contenido
export const canManageContent = [
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_CONTENT)
];

export const canModerateContent = [
  requireAuth,
  requirePermission(PERMISSIONS.MODERATE_CONTENT)
];

// Gestión de servicios
export const canManageServices = [
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_SERVICES)
];

export const canCreateServices = [
  requireAuth,
  requirePermission(PERMISSIONS.CREATE_SERVICES)
];

export const canEditAllServices = [
  requireAuth,
  requirePermission(PERMISSIONS.EDIT_ALL_SERVICES)
];

export const canEditOwnServices = [
  requireAuth,
  requirePermission(PERMISSIONS.EDIT_OWN_SERVICES)
];

export const canDeleteServices = [
  requireAuth,
  requirePermission(PERMISSIONS.DELETE_SERVICES)
];

export const canViewServicesStats = [
  requireAuth,
  requirePermission(PERMISSIONS.VIEW_SERVICES_STATS)
];

export const canManagePaquetes = [
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_PAQUETES)
];

export const canDuplicateServices = [
  requireAuth,
  requirePermission(PERMISSIONS.DUPLICATE_SERVICES)
];

// Gestión de uploads
export const canManageUploads = [
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_UPLOADS)
];

export const canUploadFiles = [
  requireAuth,
  requirePermission(PERMISSIONS.UPLOAD_FILES)
];

// Analytics y reportes
export const canViewAnalytics = [
  requireAuth,
  requirePermission(PERMISSIONS.VIEW_ANALYTICS)
];

// Sistema y configuración
export const canManageSystem = [
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_SYSTEM)
];

export const canViewLogs = [
  requireAuth,
  requirePermission(PERMISSIONS.VIEW_LOGS)
];

// Gestión de roles
export const canAssignRoles = [
  requireAuth,
  requirePermission(PERMISSIONS.ASSIGN_ROLES)
];

/**
 * MIDDLEWARES DE LÓGICA COMPLEJA
 */

/**
 * Verificar si el usuario puede gestionar a otro usuario específico
 * Se usa para endpoints que modifican usuarios específicos
 */
export const canManageSpecificUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticación requerida',
        code: 'AUTH_REQUIRED'
      });
    }

    const User = (await import('../models/User.js')).default;
    const targetUserId = req.params.userId || req.params.id;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario requerido',
        code: 'USER_ID_REQUIRED'
      });
    }

    const targetUser = await User.findById(targetUserId);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario objetivo no encontrado',
        code: 'TARGET_USER_NOT_FOUND'
      });
    }

    // Super admin puede gestionar a cualquiera
    if (req.user.role === ROLES.SUPER_ADMIN) {
      req.targetUser = targetUser;
      return next();
    }

    // Los usuarios solo pueden gestionar su propio perfil (excepto rol)
    if (req.user.id === targetUserId) {
      // Verificar que no esté intentando cambiar su propio rol
      if (req.body.role && req.body.role !== req.user.role) {
        return res.status(403).json({
          success: false,
          message: 'No puedes cambiar tu propio rol',
          code: 'CANNOT_CHANGE_OWN_ROLE'
        });
      }
      req.targetUser = targetUser;
      return next();
    }

    // Verificar jerarquía de roles
    const userLevel = ROLE_HIERARCHY[req.user.role];
    const targetLevel = ROLE_HIERARCHY[targetUser.role];

    if (userLevel <= targetLevel) {
      logger.warn('Intento de gestionar usuario de nivel igual o superior', {
        userId: req.user.id,
        userRole: req.user.role,
        targetUserId: targetUserId,
        targetUserRole: targetUser.role
      });

      return res.status(403).json({
        success: false,
        message: 'No puedes gestionar usuarios de tu mismo nivel o superior',
        code: 'INSUFFICIENT_HIERARCHY'
      });
    }

    req.targetUser = targetUser;
    next();

  } catch (error) {
    logger.error('Error en verificación de gestión de usuario', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'AUTHORIZATION_ERROR'
    });
  }
};

/**
 * Verificar si el usuario puede asignar un rol específico
 */
export const canAssignSpecificRole = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticación requerida',
        code: 'AUTH_REQUIRED'
      });
    }

    const { role: newRole } = req.body;
    
    if (!newRole) {
      return next(); // Si no hay rol en el body, continuar
    }

    if (!canAssignRole(req.user.role, newRole)) {
      logger.warn('Intento de asignar rol superior o igual', {
        userId: req.user.id,
        userRole: req.user.role,
        attemptedRole: newRole
      });

      return res.status(403).json({
        success: false,
        message: `No puedes asignar el rol: ${newRole}`,
        code: 'CANNOT_ASSIGN_ROLE'
      });
    }

    next();

  } catch (error) {
    logger.error('Error en verificación de asignación de rol', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'AUTHORIZATION_ERROR'
    });
  }
};

/**
 * Middleware para endpoints que requieren ser propietario del recurso
 */
export const requireOwnershipOrAdmin = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Autenticación requerida',
          code: 'AUTH_REQUIRED'
        });
      }

      // Super admin y admin pueden acceder a todo
      if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role)) {
        return next();
      }

      const resourceId = req.params[resourceIdParam];
      const Model = (await import(`../models/${resourceModel}.js`)).default;
      
      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Recurso no encontrado',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      // Verificar propiedad (asumiendo que el recurso tiene un campo 'createdBy' o 'userId')
      const ownerId = resource.createdBy || resource.userId || resource.user;
      
      if (ownerId && ownerId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este recurso',
          code: 'NOT_RESOURCE_OWNER'
        });
      }

      next();

    } catch (error) {
      logger.error('Error en middleware requireOwnership:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar permisos',
        error: error.message
      });
    }
  };
};

/**
 * Middleware para validar que el usuario puede editar un servicio
 * - SUPER_ADMIN y ADMIN pueden editar cualquier servicio
 * - MODERATOR solo puede editar servicios donde sea responsable
 */
export const canEditService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Verificar que el usuario esté autenticado
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticación requerida',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    // Verificar que el usuario tenga permisos
    if (!user.permissions || !Array.isArray(user.permissions)) {
      return res.status(403).json({
        success: false,
        message: 'Usuario sin permisos configurados',
        code: 'NO_PERMISSIONS'
      });
    }

    // Si tiene permiso para editar todos los servicios, permitir
    if (user.permissions.includes(PERMISSIONS.EDIT_ALL_SERVICES)) {
      return next();
    }

    // Si solo puede editar sus propios servicios, verificar ownership
    if (user.permissions.includes(PERMISSIONS.EDIT_OWN_SERVICES)) {
      const Servicio = (await import('../models/Servicio.js')).default;
      const servicio = await Servicio.findById(id);

      if (!servicio) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      // Verificar si el usuario es el responsable
      if (servicio.responsable && servicio.responsable.toString() === user.id) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Solo puedes editar servicios de los que eres responsable',
        code: 'NOT_SERVICE_OWNER'
      });
    }

    // Sin permisos
    return res.status(403).json({
      success: false,
      message: 'No tienes permisos para editar servicios',
      code: 'INSUFFICIENT_PERMISSIONS'
    });

  } catch (error) {
    logger.error('Error en middleware canEditService:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar permisos',
      error: error.message
    });
  }
};

/**
 * Middleware para validar que el usuario puede eliminar un servicio
 * Solo SUPER_ADMIN y ADMIN pueden eliminar servicios
 */
export const canDeleteService = async (req, res, next) => {
  try {
    const { user } = req;

    if (!user.permissions.includes(PERMISSIONS.DELETE_SERVICES)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar servicios',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();

  } catch (error) {
    logger.error('Error en middleware canDeleteService:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar permisos',
      error: error.message
    });
  }
};

export default {
  requireSuperAdmin,
  requireAdmin,
  requireModerator,
  requireClient,
  requireUser,
  canManageUsers,
  canViewUsers,
  canManageContent,
  canModerateContent,
  canManageServices,
  canCreateServices,
  canEditAllServices,
  canEditOwnServices,
  canDeleteServices,
  canViewServicesStats,
  canManagePaquetes,
  canDuplicateServices,
  canEditService,
  canDeleteService,
  canManageUploads,
  canUploadFiles,
  canViewAnalytics,
  canManageSystem,
  canViewLogs,
  canAssignRoles,
  canManageSpecificUser,
  canAssignSpecificRole,
  requireOwnershipOrAdmin
};