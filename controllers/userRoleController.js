import User from '../models/User.js';
import logger from '../utils/logger.js';
import { promoteUserToClient, getUsersEligibleForPromotion } from '../utils/clientPromotionService.js';
import { hasPermission } from '../utils/roleHelper.js';
import { PERMISSIONS } from '../config/roles.js';

/**
 * @desc    Obtener usuarios USER elegibles para promoción a CLIENT
 * @route   GET /api/users/eligible-for-promotion
 * @access  Private (Admin/SuperAdmin)
 */
export const getEligibleUsers = async (req, res) => {
  try {
    const { role } = req.user;

    // Solo admins pueden ver usuarios elegibles
    if (!hasPermission(role, PERMISSIONS.MANAGE_USERS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para gestionar usuarios'
      });
    }

    const result = await getUsersEligibleForPromotion();

    res.json({
      success: result.success,
      users: result.users,
      total: result.total,
      error: result.error
    });

  } catch (error) {
    logger.error('❌ Error obteniendo usuarios elegibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo usuarios elegibles',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Promover usuario de USER a CLIENT
 * @route   POST /api/users/promote-to-client
 * @access  Private (Admin/SuperAdmin)
 */
export const promoteToClient = async (req, res) => {
  try {
    const { clerkId: adminClerkId, role, fullName, email } = req.user;
    const { userId, notes } = req.body;

    // Validar datos requeridos
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId es requerido'
      });
    }

    // Solo admins pueden promover usuarios
    if (!hasPermission(role, PERMISSIONS.MANAGE_USERS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para promover usuarios'
      });
    }

    logger.info('🎯 Admin iniciando promoción de usuario', {
      adminEmail: email,
      targetUserId: userId,
      notes: notes || 'Sin notas'
    });

    // Ejecutar promoción
    const promotedBy = {
      userId: adminClerkId,
      nombre: fullName || email,
      email: email
    };

    const result = await promoteUserToClient(userId, promotedBy, notes);

    if (result.success) {
      res.json({
        success: true,
        message: '¡Usuario promovido a CLIENT exitosamente!',
        promotion: result.promotion
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

  } catch (error) {
    logger.error('❌ Error promoviendo usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error promoviendo usuario a CLIENT',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Cambiar rol de un usuario (genérico)
 * @route   PATCH /api/users/:userId/role
 * @access  Private (SuperAdmin only)
 */
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newRole, notes } = req.body;
    const { clerkId: adminClerkId, role: adminRole, fullName, email } = req.user;

    // Solo SUPER_ADMIN puede cambiar roles arbitrariamente
    if (adminRole !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Solo SUPER_ADMIN puede cambiar roles. Use /promote-to-client para promociones USER → CLIENT.'
      });
    }

    // Validar datos
    if (!newRole) {
      return res.status(400).json({
        success: false,
        message: 'newRole es requerido'
      });
    }

    const validRoles = ['USER', 'CLIENT', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(newRole.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Rol inválido. Roles válidos: ${validRoles.join(', ')}`
      });
    }

    // Buscar usuario
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const previousRole = user.role;
    user.role = newRole.toUpperCase();
    user.roleAssignedBy = adminClerkId;
    user.roleAssignedAt = new Date();
    await user.save();

    logger.success('✅ Rol de usuario actualizado', {
      userId: user.clerkId,
      email: user.email,
      previousRole,
      newRole: user.role,
      changedBy: email,
      notes: notes || 'Sin notas'
    });

    res.json({
      success: true,
      message: 'Rol actualizado exitosamente',
      user: {
        clerkId: user.clerkId,
        email: user.email,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        previousRole,
        newRole: user.role,
        roleAssignedBy: fullName || email,
        roleAssignedAt: user.roleAssignedAt
      }
    });

  } catch (error) {
    logger.error('❌ Error actualizando rol de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando rol de usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener estadísticas de usuarios por rol
 * @route   GET /api/users/role-stats
 * @access  Private (Admin/SuperAdmin)
 */
export const getRoleStatistics = async (req, res) => {
  try {
    const { role } = req.user;

    if (!hasPermission(role, PERMISSIONS.VIEW_USERS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver estadísticas'
      });
    }

    const stats = await User.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          role: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    const totalUsers = await User.countDocuments({ isActive: true });

    res.json({
      success: true,
      statistics: {
        total: totalUsers,
        byRole: stats,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    logger.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
