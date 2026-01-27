/**
 * Controlador Administrativo para Gestión de Roles
 * Manejo de usuarios, roles y permisos
 */

import User from '../models/User.js';
import { 
  ROLES, 
  ROLE_DESCRIPTIONS, 
  PERMISSIONS, 
  ROLE_PERMISSIONS,
  canAssignRole,
  getManageableRoles,
  ROLE_HIERARCHY 
} from '../config/roles.js';
import logger from '../utils/logger.js';

/**
 * @desc    Obtener todos los usuarios con filtros
 * @route   GET /api/admin/users
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const getAllUsers = async (req, res) => {
  const startTime = Date.now();
  
  try {
    logger.api('GET', '/api/admin/users', 'PROCESSING');

    const { 
      page = 1, 
      limit = 20, 
      role, 
      isActive, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Construir filtros
    const filters = {};
    
    if (role && Object.values(ROLES).includes(role)) {
      filters.role = role;
    }
    
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    if (search) {
      filters.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    // Si no es super admin, no puede ver otros super admins
    if (req.user.role !== ROLES.SUPER_ADMIN) {
      filters.role = { $ne: ROLES.SUPER_ADMIN };
    }

    // Configurar ordenamiento
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Ejecutar consulta con paginación
    const users = await User.find(filters)
      .select('-clerkCreatedAt -clerkUpdatedAt -__v')
      .populate('roleAssignedBy', 'firstName lastName email')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const totalUsers = await User.countDocuments(filters);
    
    // Agregar información adicional de roles
    const usersWithRoleInfo = users.map(user => ({
      ...user,
      roleInfo: ROLE_DESCRIPTIONS[user.role],
      canManage: req.user.role === ROLES.SUPER_ADMIN || 
                ROLE_HIERARCHY[req.user.role] > ROLE_HIERARCHY[user.role]
    }));

    logger.api('GET', '/api/admin/users', 200, Date.now() - startTime);

    res.json({
      success: true,
      data: {
        users: usersWithRoleInfo,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / parseInt(limit)),
          totalUsers,
          hasNext: parseInt(page) < Math.ceil(totalUsers / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        },
        filters: {
          appliedFilters: filters,
          availableRoles: Object.values(ROLES),
          roleDescriptions: ROLE_DESCRIPTIONS
        }
      }
    });

  } catch (error) {
    logger.error('Error obteniendo usuarios', error);
    logger.api('GET', '/api/admin/users', 500, Date.now() - startTime);
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener usuario específico por ID
 * @route   GET /api/admin/users/:userId
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-clerkCreatedAt -clerkUpdatedAt -__v')
      .populate('roleAssignedBy', 'firstName lastName email role')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si puede ver este usuario
    if (req.user.role !== ROLES.SUPER_ADMIN && 
        user.role === ROLES.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este usuario'
      });
    }

    // Agregar información adicional
    const userWithInfo = {
      ...user,
      roleInfo: ROLE_DESCRIPTIONS[user.role],
      permissions: ROLE_PERMISSIONS[user.role] || [],
      canManage: req.user.role === ROLES.SUPER_ADMIN || 
                ROLE_HIERARCHY[req.user.role] > ROLE_HIERARCHY[user.role],
      manageableRoles: getManageableRoles(req.user.role)
    };

    res.json({
      success: true,
      data: { user: userWithInfo }
    });

  } catch (error) {
    logger.error('Error obteniendo usuario por ID', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * @desc    Asignar rol a usuario
 * @route   PUT /api/admin/users/:userId/role
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const assignRole = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.params;
    const { role, reason } = req.body;

    logger.api('PUT', `/api/admin/users/${userId}/role`, 'PROCESSING');

    // Validaciones
    if (!role || !Object.values(ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido',
        availableRoles: Object.values(ROLES)
      });
    }

    // Verificar si puede asignar este rol
    if (!canAssignRole(req.user.role, role)) {
      logger.warn('Intento de asignar rol no autorizado', {
        adminId: req.user.id,
        adminRole: req.user.role,
        attemptedRole: role,
        targetUserId: userId
      });

      return res.status(403).json({
        success: false,
        message: `No puedes asignar el rol: ${role}`,
        manageableRoles: getManageableRoles(req.user.role)
      });
    }

    // Buscar usuario objetivo
    const targetUser = await User.findById(userId);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar que no sea el mismo usuario intentando cambiar su propio rol
    if (req.user.id === userId) {
      return res.status(403).json({
        success: false,
        message: 'No puedes cambiar tu propio rol'
      });
    }

    // Verificar jerarquía para el usuario objetivo
    if (req.user.role !== ROLES.SUPER_ADMIN && 
        ROLE_HIERARCHY[req.user.role] <= ROLE_HIERARCHY[targetUser.role]) {
      return res.status(403).json({
        success: false,
        message: 'No puedes modificar usuarios de tu mismo nivel o superior'
      });
    }

    // Guardar rol anterior para logs
    const previousRole = targetUser.role;

    // Asignar nuevo rol
    await targetUser.assignRole(role, req.user.id);

    logger.success('Rol asignado exitosamente', {
      adminId: req.user.id,
      adminEmail: req.user.email,
      targetUserId: userId,
      targetUserEmail: targetUser.email,
      previousRole,
      newRole: role,
      reason: reason || 'No especificado'
    });

    logger.api('PUT', `/api/admin/users/${userId}/role`, 200, Date.now() - startTime);

    res.json({
      success: true,
      message: `Rol ${role} asignado correctamente`,
      data: {
        user: {
          id: targetUser._id,
          email: targetUser.email,
          fullName: targetUser.fullName,
          previousRole,
          newRole: role,
          roleAssignedBy: {
            id: req.user.id,
            email: req.user.email,
            fullName: `${req.user.firstName} ${req.user.lastName}`
          },
          roleAssignedAt: targetUser.roleAssignedAt
        }
      }
    });

  } catch (error) {
    logger.error('Error asignando rol', error);
    logger.api('PUT', `/api/admin/users/${userId}/role`, 500, Date.now() - startTime);
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * @desc    Activar/desactivar usuario
 * @route   PUT /api/admin/users/:userId/status
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, reason } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Estado isActive debe ser boolean'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar permisos
    if (req.user.id === userId) {
      return res.status(403).json({
        success: false,
        message: 'No puedes cambiar tu propio estado'
      });
    }

    if (req.user.role !== ROLES.SUPER_ADMIN && 
        ROLE_HIERARCHY[req.user.role] <= ROLE_HIERARCHY[user.role]) {
      return res.status(403).json({
        success: false,
        message: 'No puedes modificar usuarios de tu mismo nivel o superior'
      });
    }

    // Actualizar estado
    user.isActive = isActive;
    await user.save();

    logger.success('Estado de usuario modificado', {
      adminId: req.user.id,
      targetUserId: userId,
      targetUserEmail: user.email,
      newStatus: isActive,
      reason: reason || 'No especificado'
    });

    res.json({
      success: true,
      message: `Usuario ${isActive ? 'activado' : 'desactivado'} correctamente`,
      data: {
        user: {
          id: user._id,
          email: user.email,
          isActive: user.isActive
        }
      }
    });

  } catch (error) {
    logger.error('Error modificando estado de usuario', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener estadísticas de usuarios y roles
 * @route   GET /api/admin/stats
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const getUserStats = async (req, res) => {
  try {
    // Estadísticas por rol
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: { 
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } 
          },
          inactive: { 
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } 
          }
        }
      }
    ]);

    // Usuarios recientes (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Total de usuarios
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });

    // Formatear estadísticas por rol
    const roleStatsFormatted = Object.values(ROLES).map(role => {
      const stats = roleStats.find(stat => stat._id === role);
      return {
        role,
        roleInfo: ROLE_DESCRIPTIONS[role],
        count: stats?.count || 0,
        active: stats?.active || 0,
        inactive: stats?.inactive || 0
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          recentUsers
        },
        roleBreakdown: roleStatsFormatted,
        permissions: {
          availableRoles: Object.values(ROLES),
          availablePermissions: Object.values(PERMISSIONS),
          roleDescriptions: ROLE_DESCRIPTIONS
        }
      }
    });

  } catch (error) {
    logger.error('Error obteniendo estadísticas', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener información de roles disponibles
 * @route   GET /api/admin/roles
 * @access  Private (VIEW_ROLES permission)
 */
export const getRolesInfo = async (req, res) => {
  try {
    const manageableRoles = getManageableRoles(req.user.role);
    
    res.json({
      success: true,
      data: {
        currentUserRole: {
          role: req.user.role,
          roleInfo: ROLE_DESCRIPTIONS[req.user.role],
          permissions: ROLE_PERMISSIONS[req.user.role] || []
        },
        availableRoles: Object.values(ROLES).map(role => ({
          role,
          roleInfo: ROLE_DESCRIPTIONS[role],
          permissions: ROLE_PERMISSIONS[role] || [],
          canAssign: req.user.role === ROLES.SUPER_ADMIN || manageableRoles.includes(role)
        })),
        hierarchy: ROLE_HIERARCHY
      }
    });

  } catch (error) {
    logger.error('Error obteniendo información de roles', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};