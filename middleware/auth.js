/**
 * Middleware de autenticación básico
 *
 * NOTA IMPORTANTE: Este es un middleware básico de protección.
 * Para producción, se recomienda integrar con Clerk Backend SDK
 * para validar tokens JWT desde el frontend.
 *
 * Instalación recomendada para producción:
 * npm install @clerk/clerk-sdk-node
 *
 * Luego reemplazar este middleware con validación real de tokens:
 * import { requireAuth } from '@clerk/clerk-sdk-node';
 */

// Middleware básico de autenticación
// En producción, esto debe validar tokens JWT de Clerk
export const requireAuth = (req, res, next) => {
  // TODO: Implementar validación de token JWT de Clerk
  // Por ahora, verificamos si hay un header de autorización

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No autorizado. Token de autenticación requerido.'
    });
  }

  // En producción, aquí deberías:
  // 1. Extraer el token: const token = authHeader.split(' ')[1];
  // 2. Verificar el token con Clerk Backend SDK
  // 3. Agregar usuario a req.user

  // Por ahora, solo verificamos que exista el header
  // ADVERTENCIA: Esto NO es seguro para producción
  console.warn('⚠️  ADVERTENCIA: Usando autenticación básica. Implementa validación JWT para producción.');

  // Simular usuario para development
  // En producción, esto vendría del token JWT decodificado
  req.user = {
    id: '690a39415b95c3b74b4f407d', // ID del usuario de prueba real
    userId: 'dev_clerk_id_test',
    email: 'dev@example.com',
    role: 'USER'
  };

  next();
};

// Middleware para verificar roles de admin
export const requireAdmin = (req, res, next) => {
  // TODO: Verificar rol de usuario desde token
  // Por ahora, permitimos el acceso
  console.warn('⚠️  ADVERTENCIA: Verificación de admin no implementada.');
  next();
};

// Middleware opcional de autenticación
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Si hay token, simular usuario para development
    req.user = {
      id: '690a39415b95c3b74b4f407d', // ID del usuario de prueba real
      userId: 'dev_clerk_id_test',
      email: 'dev@example.com',
      role: 'USER'
    };
  }

  // Continuar independientemente de si hay auth o no
  next();
};

/**
 * IMPLEMENTACIÓN RECOMENDADA PARA PRODUCCIÓN:
 *
 * import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
 *
 * export const requireAuth = ClerkExpressRequireAuth({
 *   // Configuración de Clerk
 * });
 *
 * Luego en las rutas:
 * router.put('/pages/:slug', requireAuth, updatePage);
 */
