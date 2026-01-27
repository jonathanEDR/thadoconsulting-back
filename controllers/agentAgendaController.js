/**
 * Controlador de Agenda para Agentes
 * Endpoints específicos para que los agentes (GerenteGeneral) gestionen eventos
 */

import {
  createEventForAgent,
  getUserEventsForAgent,
  getUpcomingEventsForAgent,
  getTodayEventsForAgent,
  getEventDetailForAgent,
  updateEventForAgent,
  deleteEventForAgent,
  cancelEventForAgent,
  searchEventsForAgent,
  getEventStatsForAgent
} from '../services/agentAgendaService.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Crear evento (para uso del agente)
 * POST /api/agents/agenda
 */
export const createEventFromAgent = async (req, res) => {
  try {
    const { userId } = req.auth; // Clerk userId

    // Buscar usuario en MongoDB
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Validar datos mínimos requeridos
    const { title, startDate, endDate, type } = req.body;
    if (!title || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: title, startDate, endDate'
      });
    }

    const result = await createEventForAgent(req.body, user._id);

    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Error en createEventFromAgent:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al crear evento desde agente'
    });
  }
};

/**
 * Obtener todos los eventos del usuario
 * GET /api/agents/agenda
 */
export const getEventsFromAgent = async (req, res) => {
  try {
    const { userId } = req.auth;

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Parsear filtros desde query params
    const filters = {
      type: req.query.type,
      status: req.query.status,
      priority: req.query.priority,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit) || 100
    };

    const result = await getUserEventsForAgent(user._id, filters);

    res.json(result);
  } catch (error) {
    console.error('❌ Error en getEventsFromAgent:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener eventos desde agente'
    });
  }
};

/**
 * Obtener eventos próximos
 * GET /api/agents/agenda/upcoming
 */
export const getUpcomingFromAgent = async (req, res) => {
  try {
    const { userId } = req.auth;

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const days = parseInt(req.query.days) || 7;
    const result = await getUpcomingEventsForAgent(user._id, days);

    res.json(result);
  } catch (error) {
    console.error('❌ Error en getUpcomingFromAgent:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener eventos próximos desde agente'
    });
  }
};

/**
 * Obtener eventos de hoy
 * GET /api/agents/agenda/today
 */
export const getTodayFromAgent = async (req, res) => {
  try {
    const { userId } = req.auth;

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const result = await getTodayEventsForAgent(user._id);

    res.json(result);
  } catch (error) {
    console.error('❌ Error en getTodayFromAgent:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener eventos de hoy desde agente'
    });
  }
};

/**
 * Obtener detalle de un evento
 * GET /api/agents/agenda/:id
 */
export const getEventDetailFromAgent = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { id } = req.params;

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const result = await getEventDetailForAgent(id, user._id);

    res.json(result);
  } catch (error) {
    console.error('❌ Error en getEventDetailFromAgent:', error);
    
    if (error.message === 'Evento no encontrado') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('No tienes permiso')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener detalle del evento desde agente'
    });
  }
};

/**
 * Actualizar evento
 * PUT /api/agents/agenda/:id
 */
export const updateEventFromAgent = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { id } = req.params;

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const result = await updateEventForAgent(id, user._id, req.body);

    res.json(result);
  } catch (error) {
    console.error('❌ Error en updateEventFromAgent:', error);
    
    if (error.message === 'Evento no encontrado') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('Solo el organizador') || error.message.includes('No se puede actualizar')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Error al actualizar evento desde agente'
    });
  }
};

/**
 * Eliminar evento
 * DELETE /api/agents/agenda/:id
 */
export const deleteEventFromAgent = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { id } = req.params;

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const result = await deleteEventForAgent(id, user._id);

    res.json(result);
  } catch (error) {
    console.error('❌ Error en deleteEventFromAgent:', error);
    
    if (error.message === 'Evento no encontrado') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('Solo el organizador')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Error al eliminar evento desde agente'
    });
  }
};

/**
 * Cancelar evento
 * PATCH /api/agents/agenda/:id/cancel
 */
export const cancelEventFromAgent = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const result = await cancelEventForAgent(id, user._id, reason);

    res.json(result);
  } catch (error) {
    console.error('❌ Error en cancelEventFromAgent:', error);
    
    if (error.message === 'Evento no encontrado') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('Solo el organizador')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Error al cancelar evento desde agente'
    });
  }
};

/**
 * Buscar eventos
 * GET /api/agents/agenda/search
 */
export const searchEventsFromAgent = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro de búsqueda "q" es requerido'
      });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const result = await searchEventsForAgent(user._id, q);

    res.json(result);
  } catch (error) {
    console.error('❌ Error en searchEventsFromAgent:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al buscar eventos desde agente'
    });
  }
};

/**
 * Obtener estadísticas
 * GET /api/agents/agenda/stats
 */
export const getStatsFromAgent = async (req, res) => {
  try {
    const { userId } = req.auth;

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const result = await getEventStatsForAgent(user._id);

    res.json(result);
  } catch (error) {
    console.error('❌ Error en getStatsFromAgent:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener estadísticas desde agente'
    });
  }
};

export default {
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
};
