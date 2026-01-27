import express from 'express';
import {
  getServicios,
  getServiciosAdmin,
  getServicio,
  createServicio,
  updateServicio,
  deleteServicio,
  getServiciosDestacados,
  buscarServicios,
  getServiciosPorCategoria,
  duplicarServicio,
  cambiarEstado,
  cambiarEstadoMasivo,
  softDeleteServicio,
  restaurarServicio,
  getTopServicios
} from '../controllers/servicioController.js';

import {
  getPaquetes,
  createPaquete,
  getPaqueteMasPopular
} from '../controllers/paqueteController.js';

import {
  getDashboard,
  getEstadisticas,
  getEstadisticasVentas,
  getMetricasConversion,
  getEstadisticasPaquetes
} from '../controllers/servicioStatsController.js';

// Importar Cache Management controller
// Importar ServicesAgent controller
import {
  chatWithServicesAgent,
  chatWithServicesAgentPublic, // 🆕 Endpoint público para chatbot de ventas
  listPublicServices, // 🆕 Listar servicios públicos
  listPublicCategories, // 🆕 Listar categorías públicas
  createServiceWithAgent,
  editServiceWithAgent,
  analyzeServiceWithAgent,
  // generateContentWithAgent, // ❌ DEPRECADO - Usar generateCompleteServiceWithAgent
  generateCompleteServiceWithAgent, // 🚀 PRINCIPAL OPTIMIZADO
  generateAllContentWithAgent, // 🆕 (Legacy)
  analyzePortfolio,
  suggestPricing,
  analyzePricing,
  optimizePackagesPricing,
  getAgentMetrics,
  getAgentStatus
} from '../controllers/servicesAgentController.js';

// ✅ Middlewares de cache HTTP para servicios
import {
  cachePublicServices,
  cacheServiceDetail,
  cacheFeaturedServices,
  cacheServiceCategories,
  cacheServicePackages,
  cacheServiceStats,
  noCache,
  invalidateCacheOnMutation
} from '../middleware/serviciosCache.js';

// ✅ Auto-invalidación de cache para operaciones CRUD  
import { invalidateServicesCache, autoInvalidateCache } from '../utils/cacheInvalidator.js';

// ✅ Middlewares de validación para servicios
import { 
  validateServiceUpdate, 
  validateServiceCreate 
} from '../middleware/validateServiceData.js';

// ✅ Sistema de logging para servicios
import { serviceOperationLogger } from '../utils/serviceLogger.js';

// Importar middlewares de autenticación y autorización
import { requireAuth } from '../middleware/clerkAuth.js';
import {
  requireUser,
  requireModerator,
  canViewServicesStats,
  canCreateServices,
  canManageServices,
  canEditService,
  canDeleteService,
  canDuplicateServices,
  canManagePaquetes
} from '../middleware/roleAuth.js';

// ✅ Importar rate limiters y validadores centralizados (SIEMPRE activos)
import { body, validationResult } from 'express-validator';
import { 
  publicChatLimiter,
  aiChatLimiter, 
  generalLimiter,
  handleValidationErrors 
} from '../middleware/securityMiddleware.js';
import logger from '../utils/logger.js';

// ============================================================================
// 🔒 VALIDADORES DE SEGURIDAD PARA CHAT PÚBLICO
// ============================================================================

// Validador para mensajes de chat público (MÁS ESTRICTO)
const validatePublicChatMessage = [
  body('message')
    .trim()
    .notEmpty().withMessage('El mensaje es requerido')
    .isLength({ min: 1, max: 1000 }).withMessage('El mensaje debe tener entre 1 y 1000 caracteres')
    .custom((value) => {
      // Detectar patrones peligrosos
      const dangerousPatterns = [
        /<script/i, /javascript:/i, /on\w+\s*=/i, // XSS
        /\$\{.*\}/, /\{\{.*\}\}/, // Template injection
        /process\.env/i, /require\s*\(/i, /import\s*\(/i, // Code injection
        /system\s*prompt/i, /ignore\s*(previous|all)\s*instructions/i, // Prompt injection
        /you\s*are\s*now/i, /pretend\s*you/i, /act\s*as\s*if/i // Role manipulation
      ];
      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          logger.warn(`🚫 [SECURITY] Patrón peligroso detectado en chat público: ${pattern}`);
          throw new Error('Contenido no permitido');
        }
      }
      return true;
    }),
  body('sessionId')
    .optional()
    .isString()
    .isLength({ max: 100 }).withMessage('sessionId inválido'),
  body('servicioId')
    .optional()
    .isMongoId().withMessage('servicioId inválido'),
  handleValidationErrors
];

const router = express.Router();

// ============================================
// RUTAS DEL SERVICESAGENT (antes de todo)
// ============================================
// 🆕 ENDPOINTS PÚBLICOS (sin autenticación requerida)
// 🔒 Chat público con rate limiting ESTRICTO por IP + VALIDACIÓN
router.post('/agent/chat/public', 
  publicChatLimiter,           // ✅ Rate limiter centralizado (15 req/10min)
  validatePublicChatMessage,   // ✅ Validación anti-injection
  chatWithServicesAgentPublic
);

// Listados con rate limiting estándar
router.get('/agent/public/services', generalLimiter, listPublicServices); // 🗂️ Listar servicios
router.get('/agent/public/categories', generalLimiter, listPublicCategories); // 📂 Listar categorías

// Chat con el agente (autenticado)
router.post('/agent/chat', requireAuth, ...requireUser, aiChatLimiter, chatWithServicesAgent);

// Crear servicio con IA
router.post('/agent/create', requireAuth, canCreateServices, aiChatLimiter, createServiceWithAgent);

// Análisis de portfolio
router.post('/agent/analyze-portfolio', requireAuth, ...requireUser, aiChatLimiter, analyzePortfolio);

// Sugerir pricing
router.post('/agent/suggest-pricing', requireAuth, ...requireUser, aiChatLimiter, suggestPricing);

// Optimizar paquetes
router.post('/agent/optimize-packages', requireAuth, ...requireUser, aiChatLimiter, optimizePackagesPricing);

// Métricas del agente (admin)
router.get('/agent/metrics', requireAuth, ...requireModerator, getAgentMetrics);

// Status del agente
router.get('/agent/status', requireAuth, ...requireUser, getAgentStatus);

// ============================================
// RUTAS ADMINISTRATIVAS (sin cache)
// ============================================
// Listado admin sin cache - debe estar ANTES de las rutas públicas
router.get('/admin/list', 
  noCache,
  requireAuth,
  canViewServicesStats,
  getServiciosAdmin
);

// ============================================
// RUTAS DE ESTADÍSTICAS Y DASHBOARD
// ============================================
router.get('/dashboard', cacheServiceStats, canViewServicesStats, getDashboard);
router.get('/stats', cacheServiceStats, canViewServicesStats, getEstadisticas);
router.get('/stats/ventas', cacheServiceStats, canViewServicesStats, getEstadisticasVentas);
router.get('/stats/conversion', cacheServiceStats, canViewServicesStats, getMetricasConversion);

// ============================================
// RUTAS ESPECIALES (antes de las rutas con parámetros)
// ============================================
router.get('/destacados', cacheFeaturedServices, getServiciosDestacados);
router.get('/buscar', cachePublicServices, buscarServicios);
router.get('/top/vendidos', cacheFeaturedServices, getTopServicios);

// Cambio de estado masivo - Solo admins
router.patch('/bulk/estado', noCache, canManageServices, cambiarEstadoMasivo);

// ============================================
// RUTAS POR CATEGORÍA (públicas)
// ============================================
router.get('/categoria/:categoria', cacheServiceCategories, getServiciosPorCategoria);

// ============================================
// RUTAS CRUD PRINCIPALES
// ============================================
router.route('/')
  .get(cachePublicServices, getServicios)                              // GET /api/servicios - Público con cache
  .post(
    noCache, 
    canCreateServices, 
    validateServiceCreate,
    serviceOperationLogger('create'),
    autoInvalidateCache,
    createServicio
  ); // POST /api/servicios - Con validación y auto-invalidación

router.route('/:id')
  .get(cacheServiceDetail, getServicio)                               // GET /api/servicios/:id - Público con cache
  .put(
    noCache, 
    requireAuth, 
    canEditService, 
    validateServiceUpdate, 
    serviceOperationLogger('update'),
    autoInvalidateCache,
    updateServicio
  )  // PUT /api/servicios/:id - Con validación y auto-invalidación
  .delete(
    noCache, 
    requireAuth, 
    canDeleteService,
    serviceOperationLogger('delete'),
    autoInvalidateCache,
    deleteServicio
  );     // DELETE /api/servicios/:id - Con logging y auto-invalidación

// ============================================
// RUTAS DE ACCIONES ESPECIALES POR SERVICIO
// ============================================
router.post('/:id/duplicar', noCache, requireAuth, canDuplicateServices, autoInvalidateCache, duplicarServicio);
router.patch('/:id/estado', noCache, requireAuth, canEditService, autoInvalidateCache, cambiarEstado);
router.delete('/:id/soft', noCache, requireAuth, canDeleteService, autoInvalidateCache, softDeleteServicio);
router.patch('/:id/restaurar', noCache, requireAuth, canManageServices, restaurarServicio);

// Rutas de AI Agent por servicio específico
router.post('/:id/agent/edit', 
  noCache, 
  requireAuth, 
  canEditService, 
  validateServiceUpdate,
  serviceOperationLogger('agent_edit'),
  aiChatLimiter, 
  editServiceWithAgent
);
router.post('/:id/agent/analyze', 
  noCache, 
  requireAuth, 
  ...requireUser, 
  serviceOperationLogger('agent_analyze'),
  aiChatLimiter, 
  analyzeServiceWithAgent
);
// ❌ ENDPOINT DEPRECADO - Usar /generate-complete en su lugar
// router.post('/:id/agent/generate-content', 
//   noCache, 
//   requireAuth, 
//   ...requireUser, 
//   serviceOperationLogger('agent_generate'),
//   aiChatLimiter, 
//   generateContentWithAgent
// );

// 🚀 ENDPOINT PRINCIPAL OPTIMIZADO - Una sola consulta para todo el contenido
router.post('/:id/agent/generate-complete', 
  noCache, 
  requireAuth, 
  ...requireUser, 
  serviceOperationLogger('agent_generate_unified'),
  aiChatLimiter, 
  generateCompleteServiceWithAgent
);
// 🔄 Legacy endpoint para compatibilidad (deprecar eventualmente)
router.post('/:id/agent/generate-all-content', 
  noCache, 
  requireAuth, 
  ...requireUser, 
  serviceOperationLogger('agent_generate_bulk'),
  aiChatLimiter, 
  generateAllContentWithAgent
);
router.post('/:id/agent/analyze-pricing', 
  noCache, 
  requireAuth, 
  ...requireUser, 
  serviceOperationLogger('agent_pricing'),
  aiChatLimiter, 
  analyzePricing
);

// ============================================
// RUTAS DE PAQUETES POR SERVICIO
// ============================================
router.route('/:servicioId/paquetes')
  .get(cacheServicePackages, getPaquetes)                       // GET /api/servicios/:servicioId/paquetes - Público con cache
  .post(noCache, canManagePaquetes, createPaquete); // POST /api/servicios/:servicioId/paquetes - Sin cache

router.get('/:servicioId/paquetes/popular', cacheServicePackages, getPaqueteMasPopular);
router.get('/:id/stats/paquetes', cacheServiceStats, canViewServicesStats, getEstadisticasPaquetes);

export default router;

