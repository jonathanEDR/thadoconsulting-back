/**
 * Rutas para gestión de eventos/agenda
 * Endpoints para reuniones, citas, recordatorios
 */

import express from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth.js';
import rateLimit from 'express-rate-limit';

// Importar controlador (se creará en el siguiente paso)
import * as eventController from '../controllers/eventController.js';

// Importar middleware de autorización (se creará después)
import {
  isEventOrganizer,
  canEditEvent,
  canDeleteEvent,
  canViewAllEvents
} from '../middleware/eventAuth.js';

const router = express.Router();

// ============================================================================
// RATE LIMITERS
// ============================================================================

// Rate limiter para consultas generales
const queryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 200,
  message: {
    success: false,
    error: 'Demasiadas consultas, intenta de nuevo en 15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para creación/edición
const mutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 30 : 100,
  message: {
    success: false,
    error: 'Demasiadas operaciones, intenta de nuevo en 15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para recordatorios
const reminderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 10 : 50,
  message: {
    success: false,
    error: 'Demasiados recordatorios, intenta de nuevo en 15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// RUTAS DE CONSULTA (GET)
// ============================================================================

/**
 * GET /api/events
 * Listar todos los eventos del usuario autenticado
 * Query params:
 *   - type: meeting | appointment | reminder | event
 *   - status: scheduled | completed | cancelled
 *   - priority: low | medium | high | urgent
 *   - startDate: fecha inicio (ISO)
 *   - endDate: fecha fin (ISO)
 *   - limit: número de resultados (default: 50)
 *   - page: página (default: 1)
 */
router.get(
  '/',
  requireAuth,
  queryLimiter,
  eventController.getAllEvents
);

/**
 * GET /api/events/today
 * Obtener eventos de hoy
 */
router.get(
  '/today',
  requireAuth,
  queryLimiter,
  eventController.getTodayEvents
);

/**
 * GET /api/events/upcoming
 * Obtener próximos eventos (7 días por defecto)
 * Query params:
 *   - days: número de días hacia adelante (default: 7)
 */
router.get(
  '/upcoming',
  requireAuth,
  queryLimiter,
  eventController.getUpcomingEvents
);

/**
 * GET /api/events/week
 * Obtener eventos de esta semana
 */
router.get(
  '/week',
  requireAuth,
  queryLimiter,
  eventController.getWeekEvents
);

/**
 * GET /api/events/month/:year/:month
 * Vista calendario mensual
 * Params:
 *   - year: año (YYYY)
 *   - month: mes (1-12)
 */
router.get(
  '/month/:year/:month',
  requireAuth,
  queryLimiter,
  eventController.getMonthEvents
);

/**
 * GET /api/events/search
 * Búsqueda avanzada de eventos
 * Query params:
 *   - q: término de búsqueda
 *   - type: tipo de evento
 *   - status: estado
 *   - priority: prioridad
 *   - startDate: desde
 *   - endDate: hasta
 */
router.get(
  '/search',
  requireAuth,
  queryLimiter,
  eventController.searchEvents
);

/**
 * GET /api/events/by-type/:type
 * Filtrar eventos por tipo
 * Params:
 *   - type: meeting | appointment | reminder | event
 */
router.get(
  '/by-type/:type',
  requireAuth,
  queryLimiter,
  eventController.getEventsByType
);

/**
 * GET /api/events/by-status/:status
 * Filtrar eventos por estado
 * Params:
 *   - status: scheduled | completed | cancelled
 */
router.get(
  '/by-status/:status',
  requireAuth,
  queryLimiter,
  eventController.getEventsByStatus
);

/**
 * GET /api/events/:id
 * Obtener detalle de un evento específico
 */
router.get(
  '/:id',
  requireAuth,
  queryLimiter,
  eventController.getEventById
);

// ============================================================================
// RUTAS DE CREACIÓN Y EDICIÓN (POST, PUT, PATCH, DELETE)
// ============================================================================

/**
 * POST /api/events
 * Crear un nuevo evento
 * Body:
 *   - title: string (required)
 *   - description: string
 *   - type: string (required)
 *   - startDate: Date (required)
 *   - endDate: Date (required)
 *   - location: object
 *   - attendees: array
 *   - reminders: array
 *   - priority: string
 *   - etc...
 */
router.post(
  '/',
  requireAuth,
  mutationLimiter,
  eventController.createEvent
);

/**
 * PUT /api/events/:id
 * Actualizar un evento completo
 * Solo el organizador puede actualizar
 */
router.put(
  '/:id',
  requireAuth,
  mutationLimiter,
  canEditEvent,
  eventController.updateEvent
);

/**
 * PATCH /api/events/:id/status
 * Actualizar solo el estado de un evento
 * Body:
 *   - status: scheduled | in_progress | completed | cancelled
 *   - outcome: string (opcional, para completed)
 *   - cancelReason: string (opcional, para cancelled)
 */
router.patch(
  '/:id/status',
  requireAuth,
  mutationLimiter,
  canEditEvent,
  eventController.updateEventStatus
);

/**
 * DELETE /api/events/:id
 * Eliminar un evento
 * Solo el organizador puede eliminar
 */
router.delete(
  '/:id',
  requireAuth,
  mutationLimiter,
  canDeleteEvent,
  eventController.deleteEvent
);

// ============================================================================
// RUTAS DE PARTICIPANTES
// ============================================================================

/**
 * POST /api/events/:id/attendees
 * Agregar un participante al evento
 * Body:
 *   - userId: ObjectId (opcional)
 *   - email: string (opcional)
 * Nota: Debe proporcionar al menos uno
 */
router.post(
  '/:id/attendees',
  requireAuth,
  mutationLimiter,
  isEventOrganizer,
  eventController.addAttendee
);

/**
 * DELETE /api/events/:id/attendees/:userId
 * Eliminar un participante del evento
 */
router.delete(
  '/:id/attendees/:userId',
  requireAuth,
  mutationLimiter,
  isEventOrganizer,
  eventController.removeAttendee
);

/**
 * PATCH /api/events/:id/attendees/response
 * Responder a una invitación (como participante)
 * Body:
 *   - status: accepted | declined | maybe
 */
router.patch(
  '/:id/attendees/response',
  requireAuth,
  mutationLimiter,
  eventController.respondToInvitation
);

// ============================================================================
// RUTAS DE RECORDATORIOS
// ============================================================================

/**
 * POST /api/events/:id/reminders
 * Agregar un recordatorio al evento
 * Body:
 *   - type: email | system | push
 *   - minutesBefore: number
 */
router.post(
  '/:id/reminders',
  requireAuth,
  reminderLimiter,
  isEventOrganizer,
  eventController.addReminder
);

/**
 * DELETE /api/events/:id/reminders/:reminderId
 * Eliminar un recordatorio
 */
router.delete(
  '/:id/reminders/:reminderId',
  requireAuth,
  reminderLimiter,
  isEventOrganizer,
  eventController.removeReminder
);

/**
 * POST /api/events/:id/reminders/send
 * Enviar recordatorio manual inmediato
 */
router.post(
  '/:id/reminders/send',
  requireAuth,
  reminderLimiter,
  isEventOrganizer,
  eventController.sendManualReminder
);

// ============================================================================
// RUTAS DE ADMINISTRACIÓN (Solo admin/superadmin)
// ============================================================================

/**
 * GET /api/events/admin/all
 * Obtener todos los eventos del sistema (admin)
 * Query params similares a GET /api/events
 */
router.get(
  '/admin/all',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  queryLimiter,
  canViewAllEvents,
  eventController.getAllEventsAdmin
);

/**
 * GET /api/events/admin/stats
 * Obtener estadísticas de eventos (admin)
 */
router.get(
  '/admin/stats',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  queryLimiter,
  eventController.getEventStats
);

// ============================================================================
// EXPORTAR ROUTER
// ============================================================================

export default router;
