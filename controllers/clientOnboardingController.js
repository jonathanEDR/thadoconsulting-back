import User from '../models/User.js';
import Lead from '../models/Lead.js';
import LeadMessage from '../models/LeadMessage.js';
import logger from '../utils/logger.js';
import { createWelcomeOnboarding } from '../utils/onboardingService.js';

/**
 * 🔍 Verificar si el usuario registrado necesita onboarding
 * @desc    Verifica si el usuario ya tiene leads y mensajes (aplica a usuarios USER)
 * @route   GET /api/client/onboarding-check
 * @access  Private (user)
 */
export const checkOnboardingStatus = async (req, res) => {
  try {
    const { clerkId: userId, role } = req.user;
    
    // Solo para usuarios registrados (USER) - Los CLIENT tienen su propio flujo después
    const validUserRoles = ['user', 'USER', 'client', 'CLIENT']; // Incluir CLIENT para retrocompatibilidad
    if (!validUserRoles.includes(role)) {
      return res.json({
        needsOnboarding: false,
        reason: `Usuario no requiere onboarding automático (rol: ${role}). Este flujo es para usuarios registrados (USER).`,
        leadCount: 0,
        messageCount: 0,
        currentRole: role
      });
    }

    // Contar leads vinculados al usuario
    const leadCount = await Lead.countDocuments({
      'usuarioRegistrado.userId': userId,
      activo: true
    });

    // Contar mensajes del usuario
    const messageCount = await LeadMessage.countDocuments({
      'destinatario.userId': userId,
      eliminado: false
    });

    const needsOnboarding = leadCount === 0 && messageCount === 0;
    
    logger.info('🔍 Verificación onboarding', {
      userId,
      leadCount,
      messageCount,
      needsOnboarding
    });

    res.json({
      needsOnboarding,
      reason: needsOnboarding 
        ? 'Usuario nuevo sin leads ni mensajes' 
        : `Usuario tiene ${leadCount} leads y ${messageCount} mensajes`,
      leadCount,
      messageCount
    });

  } catch (error) {
    logger.error('❌ Error verificando estado onboarding:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando estado de onboarding',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 🎉 Ejecutar onboarding de bienvenida
 * @desc    Crear lead y mensaje de bienvenida para usuario registrado (USER)
 * @route   POST /api/client/welcome-onboarding
 * @access  Private (user)
 */
export const executeWelcomeOnboarding = async (req, res) => {
  try {
    const { clerkId: userId, role } = req.user;
    const { clerkId, email, firstName, lastName } = req.body;

    // Solo para usuarios registrados (USER) - Los CLIENT tienen su propio flujo después
    const validUserRoles = ['user', 'USER', 'client', 'CLIENT']; // Incluir CLIENT para retrocompatibilidad
    if (!validUserRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Solo usuarios registrados pueden usar este onboarding. Rol actual: ${role}`
      });
    }

    // Verificar que los datos coincidan con el usuario autenticado
    if (clerkId !== userId) {
      return res.status(400).json({
        success: false,
        message: 'Los datos del usuario no coinciden'
      });
    }

    // Verificar que el usuario no tenga ya leads/mensajes
    const leadCount = await Lead.countDocuments({
      'usuarioRegistrado.userId': userId,
      activo: true
    });

    if (leadCount > 0) {
      return res.json({
        success: true,
        message: 'Usuario ya tiene leads, onboarding omitido',
        onboarding: {
          leadCreated: false,
          messagesSent: 0,
          leadId: null,
          leadName: null
        }
      });
    }

    logger.info('🎉 Iniciando onboarding de bienvenida', {
      userId,
      email,
      firstName,
      lastName
    });

    // Ejecutar onboarding completo
    const onboardingResult = await createWelcomeOnboarding({
      clerkId,
      email,
      firstName,
      lastName
    });

    if (onboardingResult.success) {
      logger.success('✅ Onboarding completado para usuario registrado (USER)', {
        userId,
        email,
        result: onboardingResult
      });

      res.json({
        success: true,
        message: '¡Bienvenido! Hemos configurado tu cuenta automáticamente',
        onboarding: onboardingResult.onboarding
      });
    } else {
      logger.error('❌ Error en onboarding automático', {
        userId,
        error: onboardingResult.error
      });

      res.status(500).json({
        success: false,
        message: 'Error configurando tu cuenta',
        error: onboardingResult.error
      });
    }

  } catch (error) {
    logger.error('❌ Error ejecutando onboarding:', error);
    res.status(500).json({
      success: false,
      message: 'Error ejecutando onboarding de bienvenida',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};