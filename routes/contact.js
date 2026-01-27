import express from 'express';
import {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
  cambiarEstado,
  agregarNota,
  getEstadisticas,
  getContactosPendientes,
  buscarContactos,
  validateContactCreation,
  getCategoriasTipoServicio
} from '../controllers/contactController.js';
import { requireAuth, requirePermission, optionalAuth } from '../middleware/clerkAuth.js';
import { 
  contactLimiter, 
  generalLimiter, 
  writeLimiter,
  validators,
  handleValidationErrors 
} from '../middleware/securityMiddleware.js';

const router = express.Router();

/**
 * 🌐 RUTAS PÚBLICAS (AUTENTICACIÓN OPCIONAL)
 * Para formulario de contacto del sitio web
 * Funciona con o sin usuario autenticado
 */

// GET /api/contact/categorias-tipos - Obtener mapeo de categorías a tipos de servicio
// Aplicar rate limiting general para evitar scraping
router.get('/categorias-tipos', generalLimiter, getCategoriasTipoServicio);

// POST /api/contact - Crear nuevo contacto desde formulario público
// ⚠️ RUTA CRÍTICA: Rate limiting estricto para prevenir spam
router.post(
  '/',
  contactLimiter,           // 🚦 3 contactos/minuto máximo por IP
  optionalAuth,             // ✅ Detecta auth pero no la requiere
  validateContactCreation,  // ✅ Validación del controlador
  createContact
);

/**
 * 🔒 RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN Y PERMISOS)
 * Para panel de administración
 */

// GET /api/contact - Listar todos los contactos (con paginación y filtros)
router.get(
  '/',
  generalLimiter,
  requireAuth,
  requirePermission('VIEW_CONTACTS'),
  getContacts
);

// GET /api/contact/stats - Obtener estadísticas de contactos
router.get(
  '/stats',
  generalLimiter,
  requireAuth,
  requirePermission('VIEW_CONTACTS'),
  getEstadisticas
);

// GET /api/contact/pendientes - Obtener contactos pendientes (nuevos/en proceso)
router.get(
  '/pendientes',
  generalLimiter,
  requireAuth,
  requirePermission('VIEW_CONTACTS'),
  getContactosPendientes
);

// GET /api/contact/buscar - Buscar contactos por texto
router.get(
  '/buscar',
  generalLimiter,
  requireAuth,
  requirePermission('VIEW_CONTACTS'),
  buscarContactos
);

// GET /api/contact/:id - Obtener un contacto por ID
router.get(
  '/:id',
  generalLimiter,
  requireAuth,
  requirePermission('VIEW_CONTACTS'),
  validators.mongoId,
  handleValidationErrors,
  getContactById
);

// PATCH /api/contact/:id - Actualizar contacto
router.patch(
  '/:id',
  writeLimiter,
  requireAuth,
  requirePermission('MANAGE_CONTACTS'),
  validators.mongoId,
  handleValidationErrors,
  updateContact
);

// PATCH /api/contact/:id/estado - Cambiar estado del contacto
router.patch(
  '/:id/estado',
  writeLimiter,
  requireAuth,
  requirePermission('MANAGE_CONTACTS'),
  validators.mongoId,
  handleValidationErrors,
  cambiarEstado
);

// POST /api/contact/:id/notas - Agregar nota al contacto
router.post(
  '/:id/notas',
  writeLimiter,
  requireAuth,
  requirePermission('MANAGE_CONTACTS'),
  validators.mongoId,
  handleValidationErrors,
  agregarNota
);

// DELETE /api/contact/:id - Eliminar contacto
router.delete(
  '/:id',
  writeLimiter,
  requireAuth,
  requirePermission('DELETE_CONTACTS'),
  validators.mongoId,
  handleValidationErrors,
  deleteContact
);

export default router;
