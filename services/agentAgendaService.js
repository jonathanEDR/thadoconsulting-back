/**
 * Servicio de Agenda para Agentes
 * Permite que los agentes (GerenteGeneral) gestionen eventos de la agenda
 */

import Event from '../models/Event.js';
import User from '../models/User.js';

/**
 * Crear evento desde el agente
 * @param {Object} eventData - Datos del evento
 * @param {String} organizerUserId - ID del usuario organizador
 * @returns {Object} Evento creado
 */
export const createEventForAgent = async (eventData, organizerUserId) => {
  try {
    // Buscar el usuario organizador
    const organizer = await User.findById(organizerUserId);
    if (!organizer) {
      throw new Error('Usuario organizador no encontrado');
    }

    // Validar fechas
    const startDate = new Date(eventData.startDate);
    const endDate = new Date(eventData.endDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Fechas inválidas');
    }

    if (endDate <= startDate) {
      throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    // Crear el evento
    const event = new Event({
      title: eventData.title,
      description: eventData.description || '',
      type: eventData.type || 'event',
      category: eventData.category || 'otro',
      startDate,
      endDate,
      allDay: eventData.allDay || false,
      timezone: eventData.timezone || 'America/Lima',
      organizer: organizerUserId,
      createdBy: organizerUserId, // AGREGADO: Campo requerido
      location: eventData.location || {
        type: 'none'
      },
      attendees: eventData.attendees || [],
      reminders: eventData.reminders || [],
      status: 'scheduled',
      priority: eventData.priority || 'medium',
      visibility: eventData.visibility || 'private',
      color: eventData.color || '#3B82F6',
      tags: eventData.tags || [],
      notes: eventData.notes || ''
    });

    await event.save();

    // Poblar organizer
    await event.populate('organizer', 'firstName lastName email profileImage');

    return {
      success: true,
      message: 'Evento creado exitosamente por el agente',
      data: event
    };
  } catch (error) {
    logger.error('Error al crear evento desde agente:', error);
    throw error;
  }
};

/**
 * Obtener eventos del usuario
 * @param {String} userId - ID del usuario
 * @param {Object} filters - Filtros opcionales
 * @returns {Array} Lista de eventos
 */
export const getUserEventsForAgent = async (userId, filters = {}) => {
  try {
    const query = {
      $or: [
        { organizer: userId },
        { 'attendees.user': userId }
      ]
    };

    // Aplicar filtros
    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.startDate || filters.endDate) {
      query.startDate = {};
      if (filters.startDate) {
        query.startDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.startDate.$lte = new Date(filters.endDate);
      }
    }

    const events = await Event.find(query)
      .populate('organizer', 'firstName lastName email profileImage')
      .populate('attendees.user', 'firstName lastName email profileImage')
      .sort({ startDate: 1 })
      .limit(filters.limit || 100);

    return {
      success: true,
      data: events,
      count: events.length
    };
  } catch (error) {
    console.error('❌ Error al obtener eventos desde agente:', error);
    throw error;
  }
};

/**
 * Obtener eventos próximos (siguiente semana)
 * @param {String} userId - ID del usuario
 * @param {Number} days - Número de días a futuro (default: 7)
 * @returns {Array} Lista de eventos próximos
 */
export const getUpcomingEventsForAgent = async (userId, days = 7) => {
  try {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    const events = await Event.find({
      $or: [
        { organizer: userId },
        { 'attendees.user': userId }
      ],
      startDate: {
        $gte: now,
        $lte: future
      },
      status: { $ne: 'cancelled' }
    })
      .populate('organizer', 'firstName lastName email profileImage')
      .populate('attendees.user', 'firstName lastName email profileImage')
      .sort({ startDate: 1 });

    return {
      success: true,
      data: events,
      count: events.length,
      days
    };
  } catch (error) {
    console.error('❌ Error al obtener eventos próximos desde agente:', error);
    throw error;
  }
};

/**
 * Obtener eventos de hoy
 * @param {String} userId - ID del usuario
 * @returns {Array} Lista de eventos de hoy
 */
export const getTodayEventsForAgent = async (userId) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const events = await Event.find({
      $or: [
        { organizer: userId },
        { 'attendees.user': userId }
      ],
      startDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $ne: 'cancelled' }
    })
      .populate('organizer', 'firstName lastName email profileImage')
      .populate('attendees.user', 'firstName lastName email profileImage')
      .sort({ startDate: 1 });

    return {
      success: true,
      data: events,
      count: events.length
    };
  } catch (error) {
    console.error('❌ Error al obtener eventos de hoy desde agente:', error);
    throw error;
  }
};

/**
 * Obtener detalle de un evento
 * @param {String} eventId - ID del evento
 * @param {String} userId - ID del usuario (para validar permisos)
 * @returns {Object} Detalle del evento
 */
export const getEventDetailForAgent = async (eventId, userId) => {
  try {
    const event = await Event.findById(eventId)
      .populate('organizer', 'firstName lastName email profileImage')
      .populate('attendees.user', 'firstName lastName email profileImage');

    if (!event) {
      throw new Error('Evento no encontrado');
    }

    // Verificar que el usuario tiene acceso al evento
    const isOrganizer = event.organizer._id.toString() === userId;
    const isAttendee = event.attendees.some(
      att => att.user && att.user._id.toString() === userId
    );

    if (!isOrganizer && !isAttendee) {
      throw new Error('No tienes permiso para ver este evento');
    }

    return {
      success: true,
      data: event
    };
  } catch (error) {
    console.error('❌ Error al obtener detalle de evento desde agente:', error);
    throw error;
  }
};

/**
 * Actualizar evento desde el agente
 * @param {String} eventId - ID del evento
 * @param {String} userId - ID del usuario organizador
 * @param {Object} updateData - Datos a actualizar
 * @returns {Object} Evento actualizado
 */
export const updateEventForAgent = async (eventId, userId, updateData) => {
  try {
    const event = await Event.findById(eventId);

    if (!event) {
      throw new Error('Evento no encontrado');
    }

    // Verificar que el usuario es el organizador
    if (event.organizer.toString() !== userId) {
      throw new Error('Solo el organizador puede actualizar el evento');
    }

    // Verificar que el evento no esté cancelado
    if (event.status === 'cancelled') {
      throw new Error('No se puede actualizar un evento cancelado');
    }

    // Verificar que el evento no sea del pasado
    if (event.startDate < new Date()) {
      throw new Error('No se puede actualizar un evento del pasado');
    }

    // Actualizar campos permitidos
    const allowedFields = [
      'title', 'description', 'startDate', 'endDate', 'location',
      'priority', 'notes', 'tags', 'reminders'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        event[field] = updateData[field];
      }
    });

    await event.save();

    await event.populate('organizer', 'firstName lastName email profileImage');
    await event.populate('attendees.user', 'firstName lastName email profileImage');

    return {
      success: true,
      message: 'Evento actualizado exitosamente por el agente',
      data: event
    };
  } catch (error) {
    console.error('❌ Error al actualizar evento desde agente:', error);
    throw error;
  }
};

/**
 * Eliminar evento desde el agente
 * @param {String} eventId - ID del evento
 * @param {String} userId - ID del usuario organizador
 * @returns {Object} Confirmación de eliminación
 */
export const deleteEventForAgent = async (eventId, userId) => {
  try {
    const event = await Event.findById(eventId);

    if (!event) {
      throw new Error('Evento no encontrado');
    }

    // Verificar que el usuario es el organizador
    if (event.organizer.toString() !== userId) {
      throw new Error('Solo el organizador puede eliminar el evento');
    }

    await Event.findByIdAndDelete(eventId);

    return {
      success: true,
      message: 'Evento eliminado exitosamente por el agente'
    };
  } catch (error) {
    console.error('❌ Error al eliminar evento desde agente:', error);
    throw error;
  }
};

/**
 * Cancelar evento desde el agente
 * @param {String} eventId - ID del evento
 * @param {String} userId - ID del usuario organizador
 * @param {String} reason - Razón de cancelación
 * @returns {Object} Evento cancelado
 */
export const cancelEventForAgent = async (eventId, userId, reason = '') => {
  try {
    const event = await Event.findById(eventId);

    if (!event) {
      throw new Error('Evento no encontrado');
    }

    // Verificar que el usuario es el organizador
    if (event.organizer.toString() !== userId) {
      throw new Error('Solo el organizador puede cancelar el evento');
    }

    event.status = 'cancelled';
    if (reason) {
      event.cancelReason = reason;
    }
    event.cancelledAt = new Date();

    await event.save();

    await event.populate('organizer', 'firstName lastName email profileImage');

    return {
      success: true,
      message: 'Evento cancelado exitosamente por el agente',
      data: event
    };
  } catch (error) {
    console.error('❌ Error al cancelar evento desde agente:', error);
    throw error;
  }
};

/**
 * Buscar eventos por término
 * @param {String} userId - ID del usuario
 * @param {String} searchTerm - Término de búsqueda
 * @returns {Array} Lista de eventos encontrados
 */
export const searchEventsForAgent = async (userId, searchTerm) => {
  try {
    const events = await Event.find({
      $or: [
        { organizer: userId },
        { 'attendees.user': userId }
      ],
      $and: [
        {
          $or: [
            { title: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
            { notes: { $regex: searchTerm, $options: 'i' } },
            { tags: { $in: [new RegExp(searchTerm, 'i')] } }
          ]
        }
      ]
    })
      .populate('organizer', 'firstName lastName email profileImage')
      .populate('attendees.user', 'firstName lastName email profileImage')
      .sort({ startDate: -1 })
      .limit(50);

    return {
      success: true,
      data: events,
      count: events.length,
      searchTerm
    };
  } catch (error) {
    console.error('❌ Error al buscar eventos desde agente:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de eventos del usuario
 * @param {String} userId - ID del usuario
 * @returns {Object} Estadísticas
 */
export const getEventStatsForAgent = async (userId) => {
  try {
    const now = new Date();

    const [total, scheduled, completed, cancelled, today, upcoming] = await Promise.all([
      Event.countDocuments({
        $or: [{ organizer: userId }, { 'attendees.user': userId }]
      }),
      Event.countDocuments({
        $or: [{ organizer: userId }, { 'attendees.user': userId }],
        status: 'scheduled'
      }),
      Event.countDocuments({
        $or: [{ organizer: userId }, { 'attendees.user': userId }],
        status: 'completed'
      }),
      Event.countDocuments({
        $or: [{ organizer: userId }, { 'attendees.user': userId }],
        status: 'cancelled'
      }),
      Event.countDocuments({
        $or: [{ organizer: userId }, { 'attendees.user': userId }],
        startDate: {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lte: new Date(now.setHours(23, 59, 59, 999))
        }
      }),
      Event.countDocuments({
        $or: [{ organizer: userId }, { 'attendees.user': userId }],
        startDate: { $gte: new Date() },
        status: 'scheduled'
      })
    ]);

    return {
      success: true,
      data: {
        total,
        scheduled,
        completed,
        cancelled,
        today,
        upcoming
      }
    };
  } catch (error) {
    console.error('❌ Error al obtener estadísticas desde agente:', error);
    throw error;
  }
};

export default {
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
};
