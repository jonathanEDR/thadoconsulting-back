/**
 * Middleware de autorización para eventos
 * Valida permisos de acceso y modificación
 */

import Event from '../models/Event.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Verificar que el usuario es el organizador del evento
 */
export const isEventOrganizer = async (req, res, next) => {
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

    // Verificar que el usuario es el organizador
    if (event.organizer.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Solo el organizador puede realizar esta acción'
      });
    }

    // Guardar event en req para uso posterior
    req.event = event;
    req.user = user;
    next();

  } catch (error) {
    logger.error('Error verificando organizador:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar permisos'
    });
  }
};

/**
 * Verificar que el usuario es participante del evento
 */
export const isEventParticipant = async (req, res, next) => {
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

    // Verificar que el usuario es organizador o participante
    const isOrganizer = event.organizer.toString() === user._id.toString();
    const isAttendee = event.attendees.some(a => 
      a.user && a.user.toString() === user._id.toString()
    );

    if (!isOrganizer && !isAttendee) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para acceder a este evento'
      });
    }

    req.event = event;
    req.user = user;
    req.isOrganizer = isOrganizer;
    req.isAttendee = isAttendee;
    next();

  } catch (error) {
    logger.error('Error verificando participante:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar permisos'
    });
  }
};

/**
 * Verificar que el usuario puede editar el evento
 * Solo el organizador puede editar
 */
export const canEditEvent = async (req, res, next) => {
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

    // Solo el organizador puede editar
    if (event.organizer.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Solo el organizador puede editar este evento'
      });
    }

    // No permitir editar eventos cancelados
    if (event.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'No se pueden editar eventos cancelados'
      });
    }

    req.event = event;
    req.user = user;
    next();

  } catch (error) {
    logger.error('Error verificando permisos de edición:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar permisos'
    });
  }
};

/**
 * Verificar que el usuario puede eliminar el evento
 * Solo el organizador o admin puede eliminar
 */
export const canDeleteEvent = async (req, res, next) => {
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

    // Verificar permisos
    const isOrganizer = event.organizer.toString() === user._id.toString();
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user.role);

    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Solo el organizador o administradores pueden eliminar este evento'
      });
    }

    req.event = event;
    req.user = user;
    next();

  } catch (error) {
    logger.error('Error verificando permisos de eliminación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar permisos'
    });
  }
};

/**
 * Verificar que el usuario puede ver todos los eventos
 * Solo admin o superadmin
 */
export const canViewAllEvents = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Verificar que es admin
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Se requieren permisos de administrador'
      });
    }

    req.user = user;
    next();

  } catch (error) {
    logger.error('Error verificando permisos de admin:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar permisos'
    });
  }
};

/**
 * Verificar que el evento no ha pasado
 */
export const eventNotPast = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }

    const now = new Date();
    if (event.endDate < now) {
      return res.status(400).json({
        success: false,
        error: 'No se pueden modificar eventos que ya pasaron'
      });
    }

    req.event = event;
    next();

  } catch (error) {
    logger.error('Error verificando fecha del evento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar evento'
    });
  }
};

/**
 * Verificar que el evento no está cancelado
 */
export const eventNotCancelled = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado'
      });
    }

    if (event.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Este evento ha sido cancelado'
      });
    }

    req.event = event;
    next();

  } catch (error) {
    logger.error('Error verificando estado del evento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar evento'
    });
  }
};

export default {
  isEventOrganizer,
  isEventParticipant,
  canEditEvent,
  canDeleteEvent,
  canViewAllEvents,
  eventNotPast,
  eventNotCancelled
};
