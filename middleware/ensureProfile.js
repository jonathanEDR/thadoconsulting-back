/**
 * 🛡️ Middleware para asegurar que el usuario tenga blogProfile
 * 
 * Este middleware verifica que el usuario autenticado tenga el campo
 * blogProfile inicializado. Si no lo tiene, lo crea automáticamente.
 * 
 * Esto previene errores cuando usuarios antiguos (creados antes de 
 * implementar el sistema de perfiles) acceden a endpoints que requieren
 * este campo.
 */

import User from '../models/User.js';

/**
 * Inicializa blogProfile con valores por defecto
 */
const initializeBlogProfile = (user) => {
  return {
    displayName: user.firstName 
      ? `${user.firstName} ${user.lastName || ''}`.trim() 
      : (user.email ? user.email.split('@')[0] : 'Usuario'),
    bio: '',
    avatar: user.profileImage || '',
    website: '',
    location: '',
    expertise: '',
    social: {
      twitter: '',
      linkedin: '',
      github: '',
      orcid: ''
    },
    isPublicProfile: true,
    allowComments: true,
    showEmail: false,
    profileCompleteness: 0,
    lastProfileUpdate: new Date()
  };
};

/**
 * Middleware que asegura que el usuario tenga blogProfile
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Callback de next
 */
export const ensureUserProfile = async (req, res, next) => {
  try {
    // Solo actuar si hay usuario autenticado
    if (!req.user || !req.user.id) {
      return next();
    }

    // Buscar usuario en la base de datos
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si tiene blogProfile
    if (!user.blogProfile || !user.blogProfile.displayName) {
      console.warn(`⚠️ Usuario ${user.email} sin blogProfile, inicializando automáticamente...`);
      
      // Inicializar blogProfile
      user.blogProfile = initializeBlogProfile(user);
      
      // Marcar como modificado para que Mongoose lo guarde
      user.markModified('blogProfile');
      
      try {
        await user.save();
        console.log(`✅ blogProfile inicializado para ${user.email}`);
      } catch (saveError) {
        console.error(`❌ Error al guardar blogProfile para ${user.email}:`, saveError);
        // No fallar la request, continuar con el perfil en memoria
      }
    }
    
    // Continuar con la request
    next();
  } catch (error) {
    console.error('❌ Error en ensureUserProfile middleware:', error);
    
    // No bloquear la request por este error
    // Enviar advertencia pero continuar
    next();
  }
};

/**
 * Middleware alternativo más estricto
 * Falla la request si no se puede asegurar el perfil
 */
export const ensureUserProfileStrict = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (!user.blogProfile) {
      user.blogProfile = initializeBlogProfile(user);
      user.markModified('blogProfile');
      await user.save();
    }
    
    next();
  } catch (error) {
    console.error('❌ Error en ensureUserProfileStrict:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar perfil de usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default { ensureUserProfile, ensureUserProfileStrict };
