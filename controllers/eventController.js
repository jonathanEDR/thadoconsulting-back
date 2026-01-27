/**
 * Controlador de Eventos/Agenda
 * Lógica de negocio para gestión de eventos
 */

import Event from '../models/Event.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

// ============================================================================
// CONSULTAS Y LISTADOS
// ============================================================================

/**
 * GET /api/events
 * Obtener todos los eventos del usuario autenticado
 */
export const getAllEvents = async (req, res) => {
  try {
    const userId = req.auth.userId; // ID de Clerk
    
    // Buscar el usuario en MongoDB para obtener su _id
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Construir filtros desde query params
    const filters = {};
    
    if (req.query.type) {
      filters.type = req.query.type;
    }
    
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    if (req.query.priority) {
      filters.priority = req.query.priority;
    }
    
    if (req.query.startDate || req.query.endDate) {
      filters.startDate = {};
      if (req.query.startDate) {
        filters.startDate.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filters.startDate.$lte = new Date(req.query.endDate);
      }
    }

    // Paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Obtener eventos
    const events = await Event.getEventsByUser(user._id, filters)
      .limit(limit)
      .skip(skip);

    // Contar total
    const total = await Event.countDocuments({
      $or: [
        { organizer: user._id },
        { 'attendees.user': user._id }
      ],
      ...filters
    });

    res.json({
      success: true,
      data: events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Error obteniendo eventos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener eventos'
    });
  }
};

/**
 * GET /api/events/today
 * Obtener eventos de hoy
 */
export const getTodayEvents = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const events = await Event.getTodayEvents(user._id);

    res.json({
      success: true,
      data: events,
      count: events.length
    });

  } catch (error) {
    logger.error('Error obteniendo eventos de hoy:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener eventos de hoy'
    });
  }
};

/**
 * GET /api/events/upcoming
 * Obtener próximos eventos
 */
export const getUpcomingEvents = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const days = parseInt(req.query.days) || 7;
    const events = await Event.getUpcomingEvents(user._id, days);

    res.json({
      success: true,
      data: events,
      count: events.length,
      days
    });

  } catch (error) {
    logger.error('Error obteniendo eventos próximos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener eventos próximos'
    });
  }
};

/**
 * GET /api/events/week
 * Obtener eventos de esta semana
 */
export const getWeekEvents = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const events = await Event.getWeekEvents(user._id);

    res.json({
      success: true,
      data: events,
      count: events.length
    });

  } catch (error) {
    logger.error('Error obteniendo eventos de la semana:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener eventos de la semana'
    });
  }
};

/**
 * GET /api/events/month/:year/:month
 * Vista calendario mensual
 */
export const getMonthEvents = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    // Validar año y mes
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        error: 'Año o mes inválido'
      });
    }

    // Calcular inicio y fin del mes
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const events = await Event.getEventsByDateRange(user._id, startDate, endDate);

    res.json({
      success: true,
      data: events,
      count: events.length,
      month: {
        year,
        month,
        startDate,
        endDate
      }
    });

  } catch (error) {
    logger.error('Error obteniendo eventos del mes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener eventos del mes'
    });
  }
};

/**
 * GET /api/events/search
 * Búsqueda avanzada
 */
export const searchEvents = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const { q, type, status, priority, startDate, endDate } = req.query;

    // Construir query
    const query = {
      $or: [
        { organizer: user._id },
        { 'attendees.user': user._id }
      ]
    };

    // Búsqueda de texto
    if (q) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { notes: { $regex: q, $options: 'i' } }
        ]
      });
    }

    if (type) query.type = type;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const events = await Event.find(query)
      .populate('organizer', 'firstName lastName email profileImage')
      .populate('attendees.user', 'firstName lastName email profileImage')
      .sort({ startDate: 1 })
      .limit(100);

    res.json({
      success: true,
      data: events,
      count: events.length,
      query: { q, type, status, priority, startDate, endDate }
    });

  } catch (error) {
    logger.error('Error en búsqueda de eventos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar eventos'
    });
  }
};

/**
 * GET /api/events/by-type/:type
 * Filtrar por tipo
 */
export const getEventsByType = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const { type } = req.params;

    // Validar tipo
    const validTypes = ['meeting', 'appointment', 'reminder', 'event'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de evento inválido'
      });
    }

    const events = await Event.getEventsByUser(user._id, { type });

    res.json({
      success: true,
      data: events,
      count: events.length,
      type
    });

  } catch (error) {
    logger.error('Error obteniendo eventos por tipo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener eventos por tipo'
    });
  }
};

/**
 * GET /api/events/by-status/:status
 * Filtrar por estado
 */
export const getEventsByStatus = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const { status } = req.params;

    // Validar estado
    const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Estado inválido'
      });
    }

    const events = await Event.getEventsByUser(user._id, { status });

    res.json({
      success: true,
      data: events,
      count: events.length,
      status
    });

  } catch (error) {
    logger.error('Error obteniendo eventos por estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener eventos por estado'
    });
  }
};

/**
 * GET /api/events/:id
 * Obtener detalle de un evento
 */
export const getEventById = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const event = await Event.findById(req.params.id)
      .populate('organizer', 'firstName lastName email profileImage')
      .populate('attendees.user', 'firstName lastName email profileImage')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate('cancelledBy', 'firstName lastName email');

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }

    // Verificar que el usuario tenga acceso
    const isOrganizer = event.organizer._id.toString() === user._id.toString();
    const isAttendee = event.attendees.some(a => 
      a.user && a.user._id.toString() === user._id.toString()
    );

    if (!isOrganizer && !isAttendee && event.visibility === 'private') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para ver este evento'
      });
    }

    res.json({
      success: true,
      data: event
    });

  } catch (error) {
    logger.error('Error obteniendo evento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener evento'
    });
  }
};

// ============================================================================
// CREACIÓN Y EDICIÓN
// ============================================================================

/**
 * POST /api/events
 * Crear nuevo evento
 */
export const createEvent = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Validaciones básicas
    const { title, type, startDate, endDate } = req.body;

    if (!title || !type || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: title, type, startDate, endDate'
      });
    }

    // Validar que endDate > startDate
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: 'La fecha de fin debe ser posterior a la fecha de inicio'
      });
    }

    // Crear evento
    const eventData = {
      ...req.body,
      organizer: user._id,
      createdBy: user._id
    };

    const event = new Event(eventData);
    await event.save();

    // Poblar datos para respuesta
    await event.populate('organizer', 'firstName lastName email profileImage');
    await event.populate('attendees.user', 'firstName lastName email profileImage');

    logger.info(`Evento creado: ${event._id} por usuario ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Evento creado exitosamente',
      data: event
    });

  } catch (error) {
    logger.error('Error creando evento:', error);
    
    // Manejo de errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'Error de validación',
        details: errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear evento'
    });
  }
};

/**
 * PUT /api/events/:id
 * Actualizar evento completo
 */
export const updateEvent = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }

    // Validar fechas si se están actualizando
    if (req.body.startDate && req.body.endDate) {
      const start = new Date(req.body.startDate);
      const end = new Date(req.body.endDate);

      if (end <= start) {
        return res.status(400).json({
          success: false,
          error: 'La fecha de fin debe ser posterior a la fecha de inicio'
        });
      }
    }

    // Actualizar campos
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== 'organizer' && key !== 'createdBy') {
        event[key] = req.body[key];
      }
    });

    event.updatedBy = user._id;
    await event.save();

    await event.populate('organizer', 'firstName lastName email profileImage');
    await event.populate('attendees.user', 'firstName lastName email profileImage');

    logger.info(`Evento actualizado: ${event._id}`);

    res.json({
      success: true,
      message: 'Evento actualizado exitosamente',
      data: event
    });

  } catch (error) {
    logger.error('Error actualizando evento:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'Error de validación',
        details: errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al actualizar evento'
    });
  }
};

/**
 * PATCH /api/events/:id/status
 * Actualizar estado del evento
 */
export const updateEventStatus = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }

    const { status, outcome, cancelReason } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'El estado es requerido'
      });
    }

    // Actualizar estado
    if (status === 'cancelled') {
      event.cancel(user._id, cancelReason);
    } else if (status === 'completed') {
      event.complete(outcome);
    } else {
      event.status = status;
    }

    event.updatedBy = user._id;
    await event.save();

    await event.populate('organizer', 'firstName lastName email profileImage');

    logger.info(`Estado de evento actualizado: ${event._id} -> ${status}`);

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente',
      data: event
    });

  } catch (error) {
    logger.error('Error actualizando estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar estado'
    });
  }
};

/**
 * DELETE /api/events/:id
 * Eliminar evento
 */
export const deleteEvent = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }

    await event.deleteOne();

    logger.info(`Evento eliminado: ${req.params.id} por usuario ${user.email}`);

    res.json({
      success: true,
      message: 'Evento eliminado exitosamente'
    });

  } catch (error) {
    logger.error('Error eliminando evento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar evento'
    });
  }
};

// ============================================================================
// GESTIÓN DE PARTICIPANTES
// ============================================================================

/**
 * POST /api/events/:id/attendees
 * Agregar participante
 */
export const addAttendee = async (req, res) => {
  try {
    const { userId: attendeeUserId, email } = req.body;

    if (!attendeeUserId && !email) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar userId o email'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }

    // Si se proporciona userId, verificar que el usuario existe
    let userToAdd = null;
    if (attendeeUserId) {
      userToAdd = await User.findById(attendeeUserId);
      if (!userToAdd) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }
    }

    // Agregar participante
    event.addAttendee({
      user: userToAdd ? userToAdd._id : null,
      email: email || userToAdd?.email
    });

    await event.save();
    await event.populate('attendees.user', 'firstName lastName email profileImage');

    logger.info(`Participante agregado a evento ${event._id}`);

    res.json({
      success: true,
      message: 'Participante agregado exitosamente',
      data: event
    });

  } catch (error) {
    logger.error('Error agregando participante:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar participante'
    });
  }
};

/**
 * DELETE /api/events/:id/attendees/:userId
 * Eliminar participante
 */
export const removeAttendee = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }

    event.removeAttendee(req.params.userId);
    await event.save();

    logger.info(`Participante eliminado de evento ${event._id}`);

    res.json({
      success: true,
      message: 'Participante eliminado exitosamente',
      data: event
    });

  } catch (error) {
    logger.error('Error eliminando participante:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar participante'
    });
  }
};

/**
 * PATCH /api/events/:id/attendees/response
 * Responder a invitación
 */
export const respondToInvitation = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const { status } = req.body;

    if (!status || !['accepted', 'declined', 'maybe'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Estado inválido. Debe ser: accepted, declined o maybe'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }

    event.updateAttendeeStatus(user._id, status);
    await event.save();

    logger.info(`Usuario ${user.email} respondió a evento ${event._id}: ${status}`);

    res.json({
      success: true,
      message: 'Respuesta registrada exitosamente',
      data: event
    });

  } catch (error) {
    logger.error('Error respondiendo a invitación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al responder invitación'
    });
  }
};

// ============================================================================
// GESTIÓN DE RECORDATORIOS
// ============================================================================

/**
 * POST /api/events/:id/reminders
 * Agregar recordatorio
 */
export const addReminder = async (req, res) => {
  try {
    const { type, minutesBefore } = req.body;

    if (!minutesBefore || minutesBefore < 0) {
      return res.status(400).json({
        success: false,
        error: 'minutesBefore es requerido y debe ser positivo'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }

    event.addReminder({ type, minutesBefore });
    await event.save();

    logger.info(`Recordatorio agregado a evento ${event._id}`);

    res.json({
      success: true,
      message: 'Recordatorio agregado exitosamente',
      data: event
    });

  } catch (error) {
    logger.error('Error agregando recordatorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar recordatorio'
    });
  }
};

/**
 * DELETE /api/events/:id/reminders/:reminderId
 * Eliminar recordatorio
 */
export const removeReminder = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }

    // Encontrar y eliminar el recordatorio
    const reminderIndex = event.reminders.findIndex(
      r => r._id.toString() === req.params.reminderId
    );

    if (reminderIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Recordatorio no encontrado'
      });
    }

    event.reminders.splice(reminderIndex, 1);
    await event.save();

    logger.info(`Recordatorio eliminado de evento ${event._id}`);

    res.json({
      success: true,
      message: 'Recordatorio eliminado exitosamente',
      data: event
    });

  } catch (error) {
    logger.error('Error eliminando recordatorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar recordatorio'
    });
  }
};

/**
 * POST /api/events/:id/reminders/send
 * Enviar recordatorio manual
 */
export const sendManualReminder = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'firstName lastName email')
      .populate('attendees.user', 'firstName lastName email');

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }

    // TODO: Implementar envío de email en Fase 3
    // Por ahora solo respondemos con éxito

    logger.info(`Recordatorio manual enviado para evento ${event._id}`);

    res.json({
      success: true,
      message: 'Recordatorio enviado exitosamente',
      note: 'Funcionalidad de email se implementará en Fase 3'
    });

  } catch (error) {
    logger.error('Error enviando recordatorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar recordatorio'
    });
  }
};

// ============================================================================
// ADMINISTRACIÓN
// ============================================================================

/**
 * GET /api/events/admin/all
 * Obtener todos los eventos (admin)
 */
export const getAllEventsAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Construir filtros
    const filters = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.status) filters.status = req.query.status;

    const events = await Event.find(filters)
      .populate('organizer', 'firstName lastName email')
      .populate('attendees.user', 'firstName lastName email')
      .sort({ startDate: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Event.countDocuments(filters);

    res.json({
      success: true,
      data: events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Error obteniendo todos los eventos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener eventos'
    });
  }
};

/**
 * GET /api/events/admin/stats
 * Estadísticas de eventos (admin)
 */
export const getEventStats = async (req, res) => {
  try {
    const totalEvents = await Event.countDocuments();
    const scheduledEvents = await Event.countDocuments({ status: 'scheduled' });
    const completedEvents = await Event.countDocuments({ status: 'completed' });
    const cancelledEvents = await Event.countDocuments({ status: 'cancelled' });

    const eventsByType = await Event.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const eventsByPriority = await Event.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        total: totalEvents,
        byStatus: {
          scheduled: scheduledEvents,
          completed: completedEvents,
          cancelled: cancelledEvents
        },
        byType: eventsByType,
        byPriority: eventsByPriority
      }
    });

  } catch (error) {
    logger.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
};

export default {
  getAllEvents,
  getTodayEvents,
  getUpcomingEvents,
  getWeekEvents,
  getMonthEvents,
  searchEvents,
  getEventsByType,
  getEventsByStatus,
  getEventById,
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  addAttendee,
  removeAttendee,
  respondToInvitation,
  addReminder,
  removeReminder,
  sendManualReminder,
  getAllEventsAdmin,
  getEventStats
};
