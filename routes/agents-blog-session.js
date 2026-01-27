/**
 * Rutas para sesiones conversacionales de blog
 * Endpoints para crear contenido mediante conversación guiada
 * 
 * 🔒 SEGURIDAD: Rate limiting centralizado desde securityMiddleware.js
 */

import express from 'express';
import { requireAuth } from '../middleware/clerkAuth.js';
import { body, param } from 'express-validator';
import { 
  aiChatLimiter, 
  generalLimiter,
  handleValidationErrors 
} from '../middleware/securityMiddleware.js';
import * as blogSessionController from '../controllers/blogSessionController.js';

const router = express.Router();

// ============================================================================
// 🔒 VALIDADORES DE SEGURIDAD
// ============================================================================

const validateSessionMessage = [
  param('sessionId')
    .isString()
    .isLength({ min: 1, max: 100 }).withMessage('sessionId inválido'),
  body('message')
    .trim()
    .notEmpty().withMessage('El mensaje es requerido')
    .isLength({ min: 1, max: 2000 }).withMessage('El mensaje debe tener máximo 2000 caracteres')
    .custom((value) => {
      const dangerousPatterns = [
        /<script/i, /javascript:/i,
        /\$\{.*\}/, /\{\{.*\}\}/,
        /process\.env/i, /require\s*\(/i
      ];
      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          throw new Error('Contenido no permitido');
        }
      }
      return true;
    }),
  handleValidationErrors
];

const validateSessionId = [
  param('sessionId')
    .isString()
    .isLength({ min: 1, max: 100 }).withMessage('sessionId inválido'),
  handleValidationErrors
];

// Todas las rutas requieren autenticación
router.use(requireAuth);

// Aplicar rate limiting general
router.use(generalLimiter);

/**
 * POST /api/agents/blog/session/start
 * Iniciar nueva sesión conversacional
 * 🔒 Rate limit: 5 req/min (aiChatLimiter)
 * 
 * Body: {
 *   startedFrom?: string // 'dashboard', 'toolbar', etc
 * }
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     sessionId: string,
 *     message: string,
 *     questions: string[],
 *     status: 'active',
 *     stage: 'topic_discovery'
 *   }
 * }
 */
router.post('/start', aiChatLimiter, blogSessionController.startSession);

/**
 * POST /api/agents/blog/session/:sessionId/message
 * Enviar mensaje en la conversación
 * 🔒 Rate limit: 5 req/min (aiChatLimiter) + Validación
 * 
 * Body: {
 *   message: string // Respuesta del usuario (max 2000 chars)
 * }
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     message: string, // Respuesta del agente
 *     questions?: string[], // Preguntas para el usuario
 *     stage: string, // Etapa actual
 *     progress: number, // 0-100
 *     context?: object, // Contexto adicional
 *     shouldGenerate?: boolean // Si debe iniciar generación
 *   }
 * }
 */
router.post('/:sessionId/message', aiChatLimiter, validateSessionMessage, blogSessionController.sendMessage);

/**
 * POST /api/agents/blog/session/:sessionId/generate
 * Generar contenido (endpoint directo)
 * 🔒 Rate limit: 5 req/min (aiChatLimiter)
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     status: 'generating',
 *     message: string,
 *     sessionId: string,
 *     pollUrl: string,
 *     estimatedTime: string
 *   }
 * }
 */
router.post('/:sessionId/generate', aiChatLimiter, validateSessionId, blogSessionController.generateContent);

/**
 * GET /api/agents/blog/session/:sessionId
 * Obtener estado de la sesión
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     sessionId: string,
 *     status: string,
 *     stage: string,
 *     progress: number,
 *     collected: object,
 *     conversationHistory: array,
 *     generation?: object,
 *     createdPost?: object,
 *     actions?: array
 *   }
 * }
 */
router.get('/:sessionId', validateSessionId, blogSessionController.getSession);

/**
 * POST /api/agents/blog/session/:sessionId/save
 * Guardar contenido generado como borrador
 * 
 * Body: {
 *   tags?: string[], // Tags personalizados
 *   customData?: object // Datos adicionales (excerpt, etc)
 * }
 * 
 * Response: {
 *   success: true,
 *   message: string,
 *   data: {
 *     id: string,
 *     title: string,
 *     slug: string,
 *     status: 'draft',
 *     url: string,
 *     nextSteps: string[]
 *   }
 * }
 */
router.post('/:sessionId/save', validateSessionId, blogSessionController.saveDraft);

/**
 * DELETE /api/agents/blog/session/:sessionId
 * Cancelar sesión
 * 
 * Response: {
 *   success: true,
 *   message: string,
 *   data: {
 *     sessionId: string,
 *     status: 'cancelled'
 *   }
 * }
 */
router.delete('/:sessionId', validateSessionId, blogSessionController.cancelSession);

/**
 * GET /api/agents/blog/sessions
 * Listar sesiones del usuario
 * 
 * Query params:
 * - status?: 'active' | 'completed' | 'cancelled' | 'expired'
 * - limit?: number (default 10)
 * - page?: number (default 1)
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     sessions: array,
 *     pagination: {
 *       page: number,
 *       limit: number,
 *       total: number,
 *       pages: number
 *     }
 *   }
 * }
 */
router.get('/', blogSessionController.listSessions);

export default router;
