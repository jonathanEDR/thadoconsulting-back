/**
 * 🔍 Profile Validator
 * Validaciones para datos de perfil público
 */

// ============================================
// VALIDACIONES
// ============================================

/**
 * Validar URL
 */
const isValidUrl = (url) => {
  if (!url) return true; // URLs opcionales
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validar username público
 */
const isValidPublicUsername = (username) => {
  if (!username) return false;
  
  // Solo letras, números, guiones y guiones bajos, 3-30 caracteres
  const regex = /^[a-zA-Z0-9_-]{3,30}$/;
  return regex.test(username);
};

/**
 * Validar redes sociales
 */
const validateSocialLinks = (social) => {
  if (!social) return { isValid: true, errors: [] };
  
  const errors = [];
  
  // Validar Twitter (opcional)
  if (social.twitter && !social.twitter.startsWith('@')) {
    errors.push('El usuario de Twitter debe comenzar con @');
  }
  
  // Validar LinkedIn (opcional, debe ser URL)
  if (social.linkedin && !isValidUrl(social.linkedin)) {
    errors.push('LinkedIn debe ser una URL válida');
  }
  
  // Validar GitHub (opcional, solo username)
  if (social.github && !/^[a-zA-Z0-9_-]+$/.test(social.github)) {
    errors.push('GitHub debe ser un username válido (solo letras, números, _ y -)');
  }
  
  // Validar ORCID (opcional, formato específico)
  if (social.orcid && !/^\d{4}-\d{4}-\d{4}-\d{3}[X\d]$/.test(social.orcid)) {
    errors.push('ORCID debe tener el formato: 0000-0000-0000-0000');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validar configuración de privacidad
 */
const validatePrivacySettings = (privacy) => {
  if (!privacy) return { isValid: true, errors: [] };
  
  const errors = [];
  
  // Validar campos booleanos
  const booleanFields = ['showEmail', 'showLocation', 'showSocialLinks'];
  
  booleanFields.forEach(field => {
    if (privacy[field] !== undefined && typeof privacy[field] !== 'boolean') {
      errors.push(`${field} debe ser un valor booleano`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============================================
// VALIDADOR PRINCIPAL
// ============================================

/**
 * Validar datos completos del perfil
 */
export const validateProfileData = (data) => {
  const errors = [];
  
  // 1. Validar displayName (requerido)
  if (!data.displayName || typeof data.displayName !== 'string') {
    errors.push('El nombre para mostrar es requerido');
  } else if (data.displayName.length < 2 || data.displayName.length > 50) {
    errors.push('El nombre para mostrar debe tener entre 2 y 50 caracteres');
  }
  
  // 2. Validar bio (opcional)
  if (data.bio && (typeof data.bio !== 'string' || data.bio.length > 500)) {
    errors.push('La biografía debe ser texto de máximo 500 caracteres');
  }
  
  // 3. Validar avatar (opcional, debe ser URL)
  if (data.avatar && !isValidUrl(data.avatar)) {
    errors.push('El avatar debe ser una URL válida');
  }
  
  // 4. Validar website (opcional, debe ser URL)
  if (data.website && !isValidUrl(data.website)) {
    errors.push('El sitio web debe ser una URL válida');
  }
  
  // 5. Validar location (opcional)
  if (data.location && (typeof data.location !== 'string' || data.location.length > 100)) {
    errors.push('La ubicación debe ser texto de máximo 100 caracteres');
  }
  
  // 6. Validar expertise (opcional)
  if (data.expertise && (typeof data.expertise !== 'string' || data.expertise.length > 100)) {
    errors.push('La expertise debe ser texto de máximo 100 caracteres');
  }
  
  // 7. Validar redes sociales
  if (data.social) {
    const socialValidation = validateSocialLinks(data.social);
    if (!socialValidation.isValid) {
      errors.push(...socialValidation.errors);
    }
  }
  
  // 8. Validar configuración de privacidad
  if (data.privacy) {
    const privacyValidation = validatePrivacySettings(data.privacy);
    if (!privacyValidation.isValid) {
      errors.push(...privacyValidation.errors);
    }
  }
  
  // 9. Validar isPublicProfile (opcional, debe ser booleano)
  if (data.isPublicProfile !== undefined && typeof data.isPublicProfile !== 'boolean') {
    errors.push('isPublicProfile debe ser un valor booleano');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validar disponibilidad de username público
 */
export const validateUsernameAvailability = async (username, currentUserId = null) => {
  if (!isValidPublicUsername(username)) {
    return {
      isValid: false,
      errors: ['El username debe tener entre 3-30 caracteres y solo contener letras, números, _ y -']
    };
  }

  try {
    // Importar User dinámicamente para evitar dependencias circulares
    const User = (await import('../models/User.js')).default;
    
    const query = { 'blogProfile.publicUsername': username };
    
    // Si se proporciona currentUserId, excluir ese usuario de la búsqueda
    if (currentUserId) {
      query._id = { $ne: currentUserId };
    }
    
    const existingUser = await User.findOne(query);
    
    if (existingUser) {
      return {
        isValid: false,
        errors: ['Este username ya está en uso']
      };
    }
    
    return { isValid: true, errors: [] };
    
  } catch (error) {
    console.error('Error validating username availability:', error);
    return {
      isValid: false,
      errors: ['Error al validar disponibilidad del username']
    };
  }
};

/**
 * Validar datos para actualización parcial del perfil
 */
export const validatePartialProfileData = (data) => {
  // Para actualizaciones parciales, validar solo los campos enviados
  const partialData = {};
  
  // Copiar solo los campos que están presentes
  const allowedFields = [
    'displayName', 'bio', 'avatar', 'website', 
    'location', 'expertise', 'social', 'privacy', 'isPublicProfile'
  ];
  
  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      partialData[field] = data[field];
    }
  });
  
  return validateProfileData(partialData);
};