/**
 * Rutas de Agenda para Agentes
 * Endpoints específicos para que GerenteGeneral gestione eventos
 */

import express from 'express';
import { requireAuth } from '../middleware/clerkAuth.js';
import {
  createEventFromAgent,
  getEventsFromAgent,
  getUpcomingFromAgent,
  getTodayFromAgent,
  getEventDetailFromAgent,
  updateEventFromAgent,
  deleteEventFromAgent,
  cancelEventFromAgent,
  searchEventsFromAgent,
  getStatsFromAgent
} from '../controllers/agentAgendaController.js';

const router = express.Router();

/**
 * Todas las rutas requieren autenticación
 */
router.use(requireAuth);

/**
 * GET /api/agents/agenda/stats
 * Obtener estadísticas de eventos del usuario
 */
router.get('/stats', getStatsFromAgent);

/**
 * GET /api/agents/agenda/search
 * Buscar eventos por término
 * Query params: q (término de búsqueda)
 */
router.get('/search', searchEventsFromAgent);

/**
 * GET /api/agents/agenda/today
 * Obtener eventos de hoy
 */
router.get('/today', getTodayFromAgent);

/**
 * GET /api/agents/agenda/upcoming
 * Obtener eventos próximos
 * Query params: days (número de días, default: 7)
 */
router.get('/upcoming', getUpcomingFromAgent);

/**
 * GET /api/agents/agenda/:id
 * Obtener detalle de un evento específico
 */
router.get('/:id', getEventDetailFromAgent);

/**
 * GET /api/agents/agenda
 * Listar todos los eventos del usuario con filtros opcionales
 * Query params: type, status, priority, startDate, endDate, limit
 */
router.get('/', getEventsFromAgent);

/**
 * POST /api/agents/agenda
 * Crear nuevo evento
 * Body: { title, description, type, startDate, endDate, location, priority, etc. }
 */
router.post('/', createEventFromAgent);

/**
 * PUT /api/agents/agenda/:id
 * Actualizar evento existente
 * Body: campos a actualizar
 */
router.put('/:id', updateEventFromAgent);

/**
 * PATCH /api/agents/agenda/:id/cancel
 * Cancelar evento
 * Body: { reason: "motivo de cancelación" }
 */
router.patch('/:id/cancel', cancelEventFromAgent);

/**
 * DELETE /api/agents/agenda/:id
 * Eliminar evento permanentemente
 */
router.delete('/:id', deleteEventFromAgent);

export default router;
