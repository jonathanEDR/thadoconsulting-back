/**
 * Middleware de AutenticaciÃ³n Mejorado
 * - Valida tokens JWT de Clerk
 * - Obtiene roles y permisos desde MongoDB
 * - La base de datos es la fuente de verdad para roles
 */

import { verifyToken } from '@clerk/clerk-sdk-node';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getRolePermissions } from '../config/roles.js';
import logger from '../utils/logger.js';

/**
 * Middleware principal de autenticaciÃ³n
 * Valida el token JWT de Clerk y obtiene el usuario desde MongoDB
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticaciÃ³n requerido',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];

    // Validar token con Clerk
    let clerkUser;
    try {
      // Tolerancia de 60 segundos para desfase de reloj (clock skew)
      const CLOCK_TOLERANCE_SECONDS = 60;
      
      // En desarrollo, permitir tokens de prueba locales PRIMERO
      if (process.env.NODE_ENV === 'development' && process.env.JWT_SECRET) {
        try {
          clerkUser = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'],
            ignoreExpiration: false,
            clockTolerance: CLOCK_TOLERANCE_SECONDS
          });
          logger.info('✅ Token de prueba local validado');
        } catch (localError) {
          logger.info('❌ Token no es de prueba local, intentando con Clerk...');
          // Si falla con JWT_SECRET, intentar con CLERK_SECRET_KEY
          if (!process.env.CLERK_SECRET_KEY) {
            throw new Error('CLERK_SECRET_KEY no está configurado');
          }
          
          try {
            clerkUser = jwt.verify(token, process.env.CLERK_SECRET_KEY, {
              algorithms: ['HS256', 'RS256'],
              ignoreExpiration: false,
              clockTolerance: CLOCK_TOLERANCE_SECONDS
            });
          } catch (clerkJwtError) {
            // Intentar con SDK de Clerk como último recurso
            clerkUser = await verifyToken(token, {
              secretKey: process.env.CLERK_SECRET_KEY,
              clockSkewInMs: CLOCK_TOLERANCE_SECONDS * 1000
            });
          }
        }
      } else {
        if (!process.env.CLERK_SECRET_KEY) {
          logger.error('CLERK_SECRET_KEY no está configurado en variables de entorno');
          return res.status(500).json({
            success: false,
            message: 'Error de configuración del servidor',
            code: 'MISSING_CLERK_CONFIG'
          });
        }
        
        // En producción, usar la SDK de Clerk con tolerancia de clock skew
        clerkUser = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY,
          clockSkewInMs: CLOCK_TOLERANCE_SECONDS * 1000
        });
      }

    } catch (clerkError) {
      logger.warn('Token inválido de Clerk', { 
        error: clerkError.message,
        tokenPreview: token.substring(0, 20) + '...'
      });
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado',
        code: 'INVALID_TOKEN',
        details: clerkError.message
      });
    }

    // Buscar usuario en nuestra base de datos por clerkId
    const user = await User.findOne({ 
      clerkId: clerkUser.sub 
    }).populate('roleAssignedBy', 'firstName lastName email');

    if (!user) {
      logger.warn('Usuario no encontrado en DB', { clerkId: clerkUser.sub });
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado. SincronizaciÃ³n requerida.',
        code: 'USER_NOT_SYNCED'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Cuenta desactivada. Contacta al administrador.',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Agregar información del usuario a la request
    req.user = {
      id: user._id,
      clerkId: user.clerkId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      role: user.role,
      permissions: getRolePermissions(user.role),
      customPermissions: user.customPermissions || [],
      isActive: user.isActive,
      dbUser: user // Usuario completo de DB si se necesita
    };

    // Agregar req.userId para compatibilidad con controladores
    req.userId = user._id;

    // También agregar req.auth para compatibilidad con otros controladores
    req.auth = {
      userId: user.clerkId,
      sessionId: clerkUser.sid || null
    };

    // Actualizar último login (sin await para no bloquear)
    User.findByIdAndUpdate(user._id, { 
      lastLogin: new Date() 
    }).catch(err => 
      logger.warn('Error actualizando lastLogin', err)
    );

    next();

  } catch (error) {
    logger.error('Error en middleware de autenticaciÃ³n', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware opcional de autenticación
 * No bloquea la request si no hay token, pero añade info si lo hay
 * ✅ Permite peticiones sin autenticación
 * ✅ Detecta y agrega info del usuario si está autenticado
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Si no hay token, continuar sin usuario
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      req.userId = null;
      req.isAuthenticated = false;
      return next();
    }

    const token = authHeader.split(' ')[1];

    // Intentar validar token con Clerk
    try {
      const clerkUser = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY
      });

      // Buscar usuario en nuestra base de datos
      const user = await User.findOne({ 
        clerkId: clerkUser.sub 
      }).populate('roleAssignedBy', 'firstName lastName email');

      if (user && user.isActive) {
        // Usuario válido encontrado
        req.user = {
          id: user._id,
          clerkId: user.clerkId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          role: user.role,
          permissions: getRolePermissions(user.role),
          customPermissions: user.customPermissions || [],
          isActive: user.isActive,
          dbUser: user
        };
        req.userId = user._id;
        req.isAuthenticated = true;
        req.auth = {
          userId: user.clerkId,
          sessionId: clerkUser.sid || null
        };

        // Actualizar último login (sin bloquear)
        User.findByIdAndUpdate(user._id, { 
          lastLogin: new Date() 
        }).catch(err => 
          logger.warn('Error actualizando lastLogin en optionalAuth', err)
        );
      } else {
        // Usuario no encontrado o inactivo
        req.user = null;
        req.userId = null;
        req.isAuthenticated = false;
      }
    } catch (tokenError) {
      // Token inválido, continuar sin usuario
      logger.debug('Token inválido en optionalAuth, continuando sin autenticación');
      req.user = null;
      req.userId = null;
      req.isAuthenticated = false;
    }

    next();

  } catch (error) {
    // Error general, continuar sin usuario
    logger.error('Error en optionalAuth, continuando sin autenticación:', error);
    req.user = null;
    req.userId = null;
    req.isAuthenticated = false;
    next();
  }
};

/**
 * Middleware para verificar si el usuario tiene un permiso especÃ­fico
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'AutenticaciÃ³n requerida',
        code: 'AUTH_REQUIRED'
      });
    }

    const hasPermission = req.user.permissions.includes(permission) || 
                         req.user.customPermissions.includes(permission);

    if (!hasPermission) {
      logger.warn('Acceso denegado por permisos', {
        userId: req.user.id,
        role: req.user.role,
        requiredPermission: permission,
        userPermissions: req.user.permissions
      });

      return res.status(403).json({
        success: false,
        message: `Permisos insuficientes. Se requiere: ${permission}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * Middleware para verificar rol especÃ­fico (soporta string o array)
 */
export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'AutenticaciÃ³n requerida',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role.toUpperCase();

    // Soportar tanto string como array de roles
    let hasPermission = false;
    let requiredRoles = '';

    if (Array.isArray(role)) {
      // Si es array, verificar si el rol del usuario está en la lista
      const normalizedRoles = role.map(r => r.toUpperCase());
      hasPermission = normalizedRoles.includes(userRole);
      requiredRoles = role.join(' o ');
    } else {
      // Si es string, comparación directa
      const normalizedRole = role.toUpperCase();
      hasPermission = userRole === normalizedRole;
      requiredRoles = role;
    }

    if (!hasPermission) {
      logger.warn('Acceso denegado por rol', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRole: role,
        normalizedUserRole: userRole
      });

      return res.status(403).json({
        success: false,
        message: `Rol insuficiente. Se requiere: ${requiredRoles}`,
        code: 'INSUFFICIENT_ROLE'
      });
    }

    next();
  };
};

/**
 * Middleware para verificar múltiples roles (OR)
 */
export const requireAnyRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticación requerida',
        code: 'AUTH_REQUIRED'
      });
    }

    // Normalizar roles a mayúsculas para comparación
    const normalizedRoles = roles.map(role => role.toUpperCase());
    const userRole = req.user.role.toUpperCase();

    if (!normalizedRoles.includes(userRole)) {
      logger.warn('Acceso denegado por roles', {
        userId: req.user.id,
        userRole: req.user.role,
        allowedRoles: roles,
        normalizedRoles,
        normalizedUserRole: userRole
      });

      return res.status(403).json({
        success: false,
        message: `Rol insuficiente. Se requiere uno de: ${roles.join(', ')}`,
        code: 'INSUFFICIENT_ROLE'
      });
    }

    next();
  };
};

/**
 * Middleware para verificar multiples permisos (OR)
 * Usuario debe tener AL MENOS UNO de los permisos especificados
 */
export const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticacion requerida',
        code: 'AUTH_REQUIRED'
      });
    }

    const userPermissions = [...req.user.permissions, ...req.user.customPermissions];
    const hasAnyPermission = permissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasAnyPermission) {
      logger.warn('Acceso denegado por permisos', {
        userId: req.user.id,
        role: req.user.role,
        requiredPermissions: permissions,
        userPermissions: req.user.permissions
      });

      return res.status(403).json({
        success: false,
        message: 'Permisos insuficientes',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};
