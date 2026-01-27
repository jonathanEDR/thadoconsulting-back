/**
 * Endpoint de Prueba - Demostración de Independencia de Clerk
 * Este endpoint muestra cómo Clerk solo autentica, pero los roles vienen de nuestra DB
 */

import express from 'express';
import { requireAuth } from '../middleware/clerkAuth.js';
import { ROLE_DESCRIPTIONS, ROLE_PERMISSIONS } from '../config/roles.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * @desc    Endpoint de demostración: Clerk vs Nuestra DB
 * @route   GET /api/demo/auth-flow
 * @access  Private (requiere token de Clerk pero roles de nuestra DB)
 */
router.get('/auth-flow', requireAuth, async (req, res) => {
  try {
    // Datos del token JWT de Clerk (solo autenticación)
    const clerkData = {
      source: 'CLERK JWT TOKEN',
      clerkId: req.user.clerkId,
      email: req.user.email,
      note: 'Clerk solo nos dice QUIEN es el usuario, NO sus permisos'
    };

    // Datos de nuestra base de datos (roles y permisos)
    const ourDbData = {
      source: 'NUESTRA BASE DE DATOS MONGODB',
      role: req.user.role,
      permissions: req.user.permissions,
      customPermissions: req.user.customPermissions,
      roleInfo: ROLE_DESCRIPTIONS[req.user.role],
      note: 'Nosotros controlamos QUE puede hacer el usuario'
    };

    // Demostrar que podemos cambiar roles sin tocar Clerk
    const canChangeRoleInOurDb = {
      demonstration: 'INDEPENDENCIA TOTAL DE CLERK',
      explanation: 'Podemos cambiar roles en nuestra DB sin involucrar a Clerk',
      example: 'POST /api/admin/users/:id/role cambia rol SOLO en MongoDB',
      clerkIgnores: 'Clerk no sabe ni le importa nuestros roles'
    };

    res.json({
      success: true,
      message: 'Demostración: Clerk solo autentica, nosotros manejamos roles',
      authenticationFlow: {
        step1: 'Frontend envía token JWT de Clerk',
        step2: 'Validamos token con Clerk (solo autenticación)',
        step3: 'Buscamos usuario en NUESTRA DB por clerkId',
        step4: 'Obtenemos roles y permisos de NUESTRA DB',
        step5: 'Usuario autenticado + roles propios'
      },
      clerkData,
      ourDbData,
      canChangeRoleInOurDb,
      currentUser: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        permissions: req.user.permissions
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en demostración',
      error: error.message
    });
  }
});

/**
 * @desc    Verificar usuarios existentes en la base de datos
 * @route   GET /api/demo/users-status
 * @access  Public (solo para verificación)
 */
router.get('/users-status', async (req, res) => {
  try {
    // Contar usuarios por rol
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } }
        }
      }
    ]);

    // Obtener lista de usuarios (solo info básica)
    const users = await User.find({})
      .select('email role isActive createdAt lastLogin')
      .sort({ createdAt: 1 })
      .limit(10);

    const totalUsers = await User.countDocuments();
    const hasSuperAdmin = await User.exists({ role: 'SUPER_ADMIN', isActive: true });

    res.json({
      success: true,
      message: 'Estado actual de usuarios en MongoDB',
      database: process.env.MONGODB_URI,
      summary: {
        totalUsers,
        hasSuperAdmin: !!hasSuperAdmin,
        defaultRoleForNewUsers: 'USER'
      },
      usersByRole: userStats,
      recentUsers: users.map(user => ({
        email: user.email,
        role: user.role,
        active: user.isActive,
        created: user.createdAt,
        lastLogin: user.lastLogin || 'Nunca'
      })),
      systemStatus: {
        webhookConfigured: true,
        defaultRole: 'USER',
        superAdminEmail: process.env.DEFAULT_SUPER_ADMIN_EMAIL,
        rolesManaged: 'MongoDB (no Clerk)'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verificando usuarios',
      error: error.message
    });
  }
});

/**
 * @desc    Simular cambio de rol sin tocar Clerk
 * @route   POST /api/demo/change-role-demo
 * @access  Public (solo para demostración)
 */
router.post('/change-role-demo', async (req, res) => {
  try {
    const { email, newRole } = req.body;

    if (!email || !newRole) {
      return res.status(400).json({
        success: false,
        message: 'Email y newRole requeridos'
      });
    }

    // Buscar usuario en nuestra DB
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado en NUESTRA base de datos'
      });
    }

    const previousRole = user.role;
    
    // Cambiar rol SOLO en nuestra DB (Clerk no se entera)
    user.role = newRole;
    user.roleAssignedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'ROL CAMBIADO SOLO EN NUESTRA DB (Clerk no sabe nada)',
      demonstration: {
        whatHappened: 'Cambiamos el rol directamente en MongoDB',
        clerkKnows: 'NADA - Clerk sigue funcionando igual',
        nextLogin: 'Usuario tendrá nuevos permisos automáticamente',
        independence: 'TOTAL - No dependemos de Clerk para roles'
      },
      changes: {
        user: user.email,
        previousRole,
        newRole: user.role,
        changedAt: user.roleAssignedAt,
        clerkId: user.clerkId,
        clerkStillWorks: true
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cambiando rol',
      error: error.message
    });
  }
});

/**
 * @desc    Migrar usuario específico al nuevo sistema de roles
 * @route   POST /api/demo/migrate-user
 * @access  Public (solo para migración)
 */
router.post('/migrate-user', async (req, res) => {
  try {
    const { email, newRole } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requerido'
      });
    }

    // Buscar usuario
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Mapeo de roles antiguos a nuevos
    const roleMapping = {
      'user': 'USER',
      'admin': 'ADMIN',
      'moderator': 'MODERATOR'
    };

    const oldRole = user.role;
    const mappedRole = roleMapping[oldRole] || newRole || 'USER';

    // Actualizar usuario
    user.role = mappedRole;
    user.roleAssignedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Usuario migrado exitosamente',
      migration: {
        email: user.email,
        previousRole: oldRole,
        newRole: user.role,
        migratedAt: user.roleAssignedAt
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en migración',
      error: error.message
    });
  }
});

/**
 * @desc    Promocionar usuario a Super Admin
 * @route   POST /api/demo/promote-super-admin
 * @access  Public (solo para configuración inicial)
 */
router.post('/promote-super-admin', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requerido'
      });
    }

    // Verificar si ya existe un super admin
    const existingSuperAdmin = await User.findOne({ 
      role: 'SUPER_ADMIN', 
      isActive: true 
    });

    if (existingSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un Super Admin en el sistema',
        existingSuperAdmin: existingSuperAdmin.email
      });
    }

    // Buscar usuario a promocionar
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Promocionar a Super Admin
    const previousRole = user.role;
    user.role = 'SUPER_ADMIN';
    user.roleAssignedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: '🎉 Usuario promovido a Super Admin exitosamente',
      promotion: {
        email: user.email,
        previousRole,
        newRole: 'SUPER_ADMIN',
        promotedAt: user.roleAssignedAt,
        isFirstSuperAdmin: true
      },
      nextSteps: [
        'El usuario ahora tiene control total del sistema',
        'Puede gestionar todos los roles desde /api/admin/*',
        'Puede crear otros administradores'
      ]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error promocionando usuario',
      error: error.message
    });
  }
});

export default router;