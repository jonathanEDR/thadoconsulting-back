/**
 * Utilidades Helper para Gestión de Roles
 * Funciones de apoyo para validación y gestión de roles
 */

import User from '../models/User.js';
import { 
  ROLES, 
  ROLE_HIERARCHY, 
  ROLE_PERMISSIONS, 
  canAssignRole,
  DEFAULT_SUPER_ADMIN 
} from '../config/roles.js';
import logger from './logger.js';

/**
 * Verificar si existe al menos un super administrador
 */
export const ensureSuperAdminExists = async () => {
  try {
    const superAdminCount = await User.countDocuments({ 
      role: ROLES.SUPER_ADMIN,
      isActive: true 
    });

    if (superAdminCount === 0) {
      logger.warn('No se encontró ningún super administrador activo');
      
      // Verificar si hay un usuario con el email por defecto
      const defaultAdminEmail = DEFAULT_SUPER_ADMIN.email;
      const existingUser = await User.findOne({ email: defaultAdminEmail });
      
      if (existingUser && existingUser.role !== ROLES.SUPER_ADMIN) {
        // Promover usuario existente a super admin
        await existingUser.assignRole(ROLES.SUPER_ADMIN, null);
        logger.success(`Usuario ${defaultAdminEmail} promovido a Super Admin`);
        return existingUser;
      } else if (!existingUser) {
        logger.warn(`No se encontró usuario con email ${defaultAdminEmail} para promover a Super Admin`);
        return null;
      }
    }

    return await User.findOne({ 
      role: ROLES.SUPER_ADMIN, 
      isActive: true 
    });

  } catch (error) {
    logger.error('Error verificando super administrador', error);
    return null;
  }
};

/**
 * Obtener jerarquía de un usuario específico
 */
export const getUserHierarchyLevel = (role) => {
  return ROLE_HIERARCHY[role] || 0;
};

/**
 * Verificar si un usuario puede realizar una acción sobre otro usuario
 */
export const canUserManageUser = (managerRole, targetRole) => {
  const managerLevel = ROLE_HIERARCHY[managerRole];
  const targetLevel = ROLE_HIERARCHY[targetRole];
  
  return managerLevel > targetLevel;
};

/**
 * Obtener usuarios que un rol específico puede gestionar
 */
export const getManageableUsers = async (managerRole, options = {}) => {
  try {
    const managerLevel = ROLE_HIERARCHY[managerRole];
    
    // Obtener todos los roles que puede gestionar
    const manageableRoles = Object.keys(ROLES).filter(role => 
      ROLE_HIERARCHY[role] < managerLevel
    );

    const query = { 
      role: { $in: manageableRoles },
      ...options.filters 
    };

    const users = await User.find(query)
      .select(options.select || '-clerkCreatedAt -clerkUpdatedAt -__v')
      .populate('roleAssignedBy', 'firstName lastName email')
      .sort(options.sort || { createdAt: -1 })
      .limit(options.limit || 50);

    return users;

  } catch (error) {
    logger.error('Error obteniendo usuarios gestionables', error);
    return [];
  }
};

/**
 * Validar asignación de rol con logging detallado
 */
export const validateRoleAssignment = async (assignerId, targetUserId, newRole) => {
  try {
    const assigner = await User.findById(assignerId);
    const target = await User.findById(targetUserId);

    if (!assigner) {
      return { valid: false, reason: 'Usuario asignador no encontrado' };
    }

    if (!target) {
      return { valid: false, reason: 'Usuario objetivo no encontrado' };
    }

    if (assignerId === targetUserId) {
      return { valid: false, reason: 'No se puede cambiar el propio rol' };
    }

    if (!canAssignRole(assigner.role, newRole)) {
      return { 
        valid: false, 
        reason: `Rol ${assigner.role} no puede asignar rol ${newRole}` 
      };
    }

    if (!canUserManageUser(assigner.role, target.role)) {
      return { 
        valid: false, 
        reason: `No se puede gestionar usuario de nivel igual o superior` 
      };
    }

    return { 
      valid: true, 
      assigner, 
      target,
      previousRole: target.role
    };

  } catch (error) {
    logger.error('Error validando asignación de rol', error);
    return { valid: false, reason: 'Error interno de validación' };
  }
};

/**
 * Obtener estadísticas de roles del sistema
 */
export const getRoleStatistics = async () => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
          recentLogins: {
            $sum: {
              $cond: [
                {
                  $gte: ['$lastLogin', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Formatear estadísticas para incluir todos los roles
    const formattedStats = Object.values(ROLES).map(role => {
      const roleStats = stats.find(stat => stat._id === role);
      return {
        role,
        total: roleStats?.total || 0,
        active: roleStats?.active || 0,
        inactive: roleStats?.inactive || 0,
        recentLogins: roleStats?.recentLogins || 0,
        hierarchyLevel: ROLE_HIERARCHY[role]
      };
    });

    return {
      byRole: formattedStats,
      summary: {
        totalUsers: stats.reduce((sum, stat) => sum + stat.total, 0),
        activeUsers: stats.reduce((sum, stat) => sum + stat.active, 0),
        inactiveUsers: stats.reduce((sum, stat) => sum + stat.inactive, 0),
        recentActiveUsers: stats.reduce((sum, stat) => sum + stat.recentLogins, 0)
      }
    };

  } catch (error) {
    logger.error('Error obteniendo estadísticas de roles', error);
    return null;
  }
};

/**
 * Verificar permisos específicos de un usuario
 */
/**
 * Verificar si un rol tiene un permiso específico
 * @param {string} role - Rol a verificar
 * @param {string} permission - Permiso requerido
 * @returns {boolean} - True si el rol tiene el permiso
 */
export const hasPermission = (role, permission) => {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return rolePermissions.includes(permission);
};

/**
 * Verificar permisos de usuario por ID
 */
export const checkUserPermissions = async (userId, permissions) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return { hasPermissions: false, reason: 'Usuario no encontrado' };
    }

    if (!user.isActive) {
      return { hasPermissions: false, reason: 'Usuario inactivo' };
    }

    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    const userCustomPermissions = user.customPermissions || [];
    const allUserPermissions = [...userPermissions, ...userCustomPermissions];

    const missingPermissions = permissions.filter(
      permission => !allUserPermissions.includes(permission)
    );

    if (missingPermissions.length > 0) {
      return {
        hasPermissions: false,
        reason: `Permisos faltantes: ${missingPermissions.join(', ')}`,
        missingPermissions,
        userPermissions: allUserPermissions
      };
    }

    return {
      hasPermissions: true,
      userPermissions: allUserPermissions
    };

  } catch (error) {
    logger.error('Error verificando permisos de usuario', error);
    return { hasPermissions: false, reason: 'Error interno' };
  }
};

/**
 * Limpiar roles inconsistentes en la base de datos
 */
export const cleanupInconsistentRoles = async () => {
  try {
    logger.startup('Iniciando limpieza de roles inconsistentes');

    // Buscar usuarios con roles inválidos
    const validRoles = Object.values(ROLES);
    const usersWithInvalidRoles = await User.find({
      role: { $nin: validRoles }
    });

    let cleanupCount = 0;
    
    for (const user of usersWithInvalidRoles) {
      logger.warn(`Usuario con rol inválido encontrado: ${user.email} - ${user.role}`);
      
      // Asignar rol USER por defecto
      user.role = ROLES.USER;
      user.roleAssignedAt = new Date();
      user.roleAssignedBy = null;
      
      await user.save();
      cleanupCount++;
    }

    if (cleanupCount > 0) {
      logger.success(`Limpieza completada: ${cleanupCount} usuarios actualizados`);
    } else {
      logger.debug('No se encontraron roles inconsistentes');
    }

    return { cleanedUsers: cleanupCount };

  } catch (error) {
    logger.error('Error en limpieza de roles', error);
    return { error: error.message };
  }
};

/**
 * Generar reporte de seguridad de roles
 */
export const generateRoleSecurityReport = async () => {
  try {
    const [
      superAdmins,
      admins,
      usersWithoutLogin,
      inactiveUsersWithHighRoles
    ] = await Promise.all([
      User.find({ role: ROLES.SUPER_ADMIN }).select('email firstName lastName lastLogin isActive'),
      User.find({ role: ROLES.ADMIN }).select('email firstName lastName lastLogin isActive'),
      User.find({ lastLogin: { $exists: false } }).select('email role createdAt'),
      User.find({ 
        isActive: false, 
        role: { $in: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR] } 
      }).select('email role lastLogin')
    ]);

    return {
      security: {
        superAdminCount: superAdmins.length,
        adminCount: admins.length,
        usersWithoutLoginCount: usersWithoutLogin.length,
        inactiveHighRoleUsers: inactiveUsersWithHighRoles.length
      },
      details: {
        superAdmins: superAdmins.map(u => ({
          email: u.email,
          name: u.firstName + ' ' + u.lastName,
          lastLogin: u.lastLogin,
          isActive: u.isActive
        })),
        alerts: [
          ...usersWithoutLogin.map(u => ({
            type: 'NEVER_LOGGED_IN',
            user: u.email,
            role: u.role,
            created: u.createdAt
          })),
          ...inactiveUsersWithHighRoles.map(u => ({
            type: 'INACTIVE_HIGH_ROLE',
            user: u.email,
            role: u.role,
            lastLogin: u.lastLogin
          }))
        ]
      },
      timestamp: new Date()
    };

  } catch (error) {
    logger.error('Error generando reporte de seguridad', error);
    return { error: error.message };
  }
};

export default {
  ensureSuperAdminExists,
  getUserHierarchyLevel,
  canUserManageUser,
  getManageableUsers,
  validateRoleAssignment,
  getRoleStatistics,
  checkUserPermissions,
  cleanupInconsistentRoles,
  generateRoleSecurityReport
};