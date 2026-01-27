/**
 * 🔧 Utilidades para normalización de roles
 * Asegura que los roles siempre estén en el formato correcto (UPPERCASE)
 */

import { ROLES } from '../config/roles.js';
import logger from './logger.js';

/**
 * Normaliza un rol a formato uppercase y válido
 * @param {string} role - El rol a normalizar
 * @returns {string} - El rol normalizado en uppercase
 */
export const normalizeRole = (role) => {
  if (!role || typeof role !== 'string') {
    logger.warn('Rol inválido recibido para normalización', { role, type: typeof role });
    return ROLES.USER; // Default fallback
  }

  // Convertir a uppercase
  const normalizedRole = role.toUpperCase().trim();
  
  // Verificar que sea un rol válido
  const validRoles = Object.values(ROLES);
  if (!validRoles.includes(normalizedRole)) {
    logger.warn('Rol no válido después de normalización', { 
      originalRole: role, 
      normalizedRole, 
      validRoles 
    });
    return ROLES.USER; // Default fallback
  }

  logger.debug('Rol normalizado correctamente', { 
    original: role, 
    normalized: normalizedRole 
  });

  return normalizedRole;
};

/**
 * Valida si un rol es válido (case-insensitive)
 * @param {string} role - El rol a validar
 * @returns {boolean} - true si es válido
 */
export const isValidRole = (role) => {
  if (!role || typeof role !== 'string') {
    return false;
  }

  const normalizedRole = role.toUpperCase().trim();
  const validRoles = Object.values(ROLES);
  
  return validRoles.includes(normalizedRole);
};

/**
 * Obtiene el rol por defecto para nuevos usuarios
 * Verifica el email contra DEFAULT_SUPER_ADMIN_EMAIL
 * @param {string} email - Email del usuario
 * @returns {string} - Rol asignado ('SUPER_ADMIN' o 'USER')
 */
export const getDefaultRole = (email) => {
  if (!email || typeof email !== 'string') {
    return ROLES.USER;
  }

  const defaultSuperAdminEmail = process.env.DEFAULT_SUPER_ADMIN_EMAIL;
  
  if (defaultSuperAdminEmail && email.toLowerCase() === defaultSuperAdminEmail.toLowerCase()) {
    logger.success('Usuario identificado como Super Admin por defecto', { email });
    return ROLES.SUPER_ADMIN;
  }

  logger.debug('Usuario asignado rol USER por defecto', { email });
  return ROLES.USER;
};

/**
 * Migra roles existentes a formato correcto (UPPERCASE)
 * @param {Object} User - Modelo de Usuario de Mongoose
 * @returns {Promise<Object>} - Resultado de la migración
 */
export const migrateExistingRoles = async (User) => {
  try {
    logger.startup('Iniciando migración de roles existentes...');

    // Obtener todos los usuarios
    const users = await User.find({});
    logger.debug(`Encontrados ${users.length} usuarios para verificar`);

    let migratedCount = 0;
    const migrations = [];

    for (const user of users) {
      const originalRole = user.role;
      const normalizedRole = normalizeRole(originalRole);

      if (originalRole !== normalizedRole) {
        // Actualizar usuario
        await User.findByIdAndUpdate(user._id, { 
          role: normalizedRole 
        });

        migrations.push({
          userId: user._id,
          email: user.email,
          from: originalRole,
          to: normalizedRole
        });

        migratedCount++;
        
        logger.success('Rol migrado', {
          userId: user._id,
          email: user.email,
          from: originalRole,
          to: normalizedRole
        });
      }
    }

    const result = {
      totalUsers: users.length,
      migratedUsers: migratedCount,
      migrations: migrations,
      success: true
    };

    if (migratedCount > 0) {
      logger.success(`Migración completada: ${migratedCount} usuarios actualizados`);
    } else {
      logger.debug('No se requirió migración, todos los roles están correctos');
    }

    return result;

  } catch (error) {
    logger.error('Error durante migración de roles', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  normalizeRole,
  isValidRole,
  getDefaultRole,
  migrateExistingRoles
};