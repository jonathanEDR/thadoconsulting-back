import logger from './logger.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

/**
 * 🔔 Servicio de Notificaciones - Persistido en MongoDB
 * Crea notificaciones reales que el frontend consulta via polling
 */

/**
 * Tipos de notificaciones
 */
export const NOTIFICATION_TYPES = {
  MENSAJE_INTERNO: 'mensaje_interno',
  MENSAJE_CLIENTE: 'mensaje_cliente',
  RESPUESTA_CLIENTE: 'respuesta_cliente',
  LEAD_ASIGNADO: 'lead_asignado',
  CAMBIO_ESTADO: 'cambio_estado',
  USUARIO_VINCULADO: 'usuario_vinculado'
};

/**
 * Resolver usuario por clerkId para obtener userId (ObjectId) y clerkId
 * @param {string} clerkId - Clerk ID del usuario
 * @returns {object|null} - { _id, clerkId } o null
 */
const resolverUsuario = async (clerkId) => {
  if (!clerkId) return null;
  try {
    const user = await User.findOne({ clerkId }).select('_id clerkId').lean();
    return user;
  } catch (error) {
    logger.error(`Error resolviendo usuario ${clerkId}:`, error);
    return null;
  }
};

/**
 * Crear notificación persistida en MongoDB
 * @param {object} options - Opciones de la notificación
 * @returns {array} - Notificaciones creadas
 */
export const crearNotificacion = async ({
  tipo,
  titulo,
  mensaje,
  destinatarios = [], // Array de clerkIds
  metadata = {},
  prioridad = 'normal',
  accion = null
}) => {
  try {
    if (destinatarios.length === 0) {
      logger.warn(`📬 Notificación ${tipo} sin destinatarios, omitida`);
      return [];
    }

    // Resolver todos los usuarios en paralelo
    const usuarios = await Promise.all(
      destinatarios.map(clerkId => resolverUsuario(clerkId))
    );

    const usuariosValidos = usuarios.filter(Boolean);

    if (usuariosValidos.length === 0) {
      logger.warn(`📬 Ningún destinatario válido para notificación ${tipo}`);
      return [];
    }

    // Crear notificaciones en batch usando el modelo Notification
    const notificacionesData = usuariosValidos.map(user => ({
      userId: user._id,
      clerkId: user.clerkId,
      tipo,
      titulo,
      mensaje,
      prioridad,
      metadata,
      ...(accion && { accion })
    }));

    const notificaciones = await Notification.insertMany(notificacionesData);

    logger.info(`📬 Notificación ${tipo} creada para ${notificaciones.length} usuario(s)`);

    return notificaciones;

  } catch (error) {
    logger.error('Error creando notificación:', error);
    return [];
  }
};

/**
 * Notificar nuevo mensaje interno
 * @param {object} mensaje - Mensaje creado
 * @param {object} lead - Lead asociado
 */
export const notificarMensajeInterno = async (mensaje, lead) => {
  try {
    const destinatarios = [];
    
    // Notificar al usuario asignado al lead
    if (lead.asignadoA?.userId && lead.asignadoA.userId !== mensaje.autor.userId) {
      destinatarios.push(lead.asignadoA.userId);
    }
    
    // Notificar al creador del lead
    if (lead.creadoPor?.userId && 
        lead.creadoPor.userId !== mensaje.autor.userId &&
        !destinatarios.includes(lead.creadoPor.userId)) {
      destinatarios.push(lead.creadoPor.userId);
    }
    
    if (destinatarios.length > 0) {
      await crearNotificacion({
        tipo: NOTIFICATION_TYPES.MENSAJE_INTERNO,
        titulo: `Nueva nota en: ${lead.nombre}`,
        mensaje: `${mensaje.autor.nombre} agregó una nota interna`,
        destinatarios,
        metadata: {
          leadId: lead._id?.toString(),
          messageId: mensaje._id?.toString(),
          leadNombre: lead.nombre
        },
        accion: {
          tipo: 'link',
          url: `/dashboard/crm/messages`,
          label: 'Ver mensaje'
        },
        prioridad: mensaje.prioridad || 'normal'
      });
    }
    
  } catch (error) {
    logger.error('Error notificando mensaje interno:', error);
  }
};

/**
 * Notificar mensaje al cliente
 * @param {object} mensaje - Mensaje creado
 * @param {object} lead - Lead asociado
 */
export const notificarMensajeCliente = async (mensaje, lead) => {
  try {
    if (!lead.usuarioRegistrado?.userId) {
      logger.warn('Lead no tiene usuario registrado, no se puede notificar');
      return;
    }
    
    await crearNotificacion({
      tipo: NOTIFICATION_TYPES.MENSAJE_CLIENTE,
      titulo: `Nuevo mensaje del equipo`,
      mensaje: mensaje.asunto || 'Tienes un nuevo mensaje de THADO Consulting',
      destinatarios: [lead.usuarioRegistrado.userId],
      metadata: {
        leadId: lead._id?.toString(),
        messageId: mensaje._id?.toString(),
        leadNombre: lead.nombre,
        autorNombre: mensaje.autor.nombre
      },
      accion: {
        tipo: 'link',
        url: `/dashboard/client/messages`,
        label: 'Ver mensaje'
      },
      prioridad: mensaje.prioridad || 'normal'
    });
    
    logger.info(`📧 Notificación enviada al cliente: ${lead.usuarioRegistrado.email}`);
    
  } catch (error) {
    logger.error('Error notificando mensaje al cliente:', error);
  }
};

/**
 * Notificar respuesta del cliente al equipo
 * @param {object} mensaje - Mensaje de respuesta
 * @param {object} lead - Lead asociado
 */
export const notificarRespuestaCliente = async (mensaje, lead) => {
  try {
    const destinatarios = [];
    
    // Notificar al usuario asignado
    if (lead.asignadoA?.userId) {
      destinatarios.push(lead.asignadoA.userId);
    }
    
    // Notificar al creador del lead
    if (lead.creadoPor?.userId && !destinatarios.includes(lead.creadoPor.userId)) {
      destinatarios.push(lead.creadoPor.userId);
    }
    
    if (destinatarios.length > 0) {
      await crearNotificacion({
        tipo: NOTIFICATION_TYPES.RESPUESTA_CLIENTE,
        titulo: `Respuesta de cliente: ${lead.nombre}`,
        mensaje: `${mensaje.autor.nombre} respondió a tu mensaje`,
        destinatarios,
        metadata: {
          leadId: lead._id?.toString(),
          messageId: mensaje._id?.toString(),
          leadNombre: lead.nombre,
          clienteNombre: mensaje.autor.nombre
        },
        accion: {
          tipo: 'link',
          url: `/dashboard/crm/messages`,
          label: 'Ver respuesta'
        },
        prioridad: 'alta'
      });
    }
    
    logger.info(`🔔 Notificación de respuesta cliente enviada a ${destinatarios.length} usuarios`);
    
  } catch (error) {
    logger.error('Error notificando respuesta cliente:', error);
  }
};

/**
 * Notificar lead asignado
 * @param {object} lead - Lead asignado
 * @param {string} asignadoA - ClerkId del usuario al que se asignó
 */
export const notificarLeadAsignado = async (lead, asignadoA) => {
  try {
    await crearNotificacion({
      tipo: NOTIFICATION_TYPES.LEAD_ASIGNADO,
      titulo: `Nuevo lead asignado`,
      mensaje: `Se te ha asignado el lead: ${lead.nombre}`,
      destinatarios: [asignadoA],
      metadata: {
        leadId: lead._id?.toString(),
        leadNombre: lead.nombre,
        leadEstado: lead.estado,
        leadPrioridad: lead.prioridad
      },
      accion: {
        tipo: 'link',
        url: `/dashboard/crm`,
        label: 'Ver lead'
      },
      prioridad: lead.prioridad === 'urgente' ? 'alta' : 'normal'
    });
    
    logger.info(`📌 Notificación de asignación enviada a ${asignadoA}`);
    
  } catch (error) {
    logger.error('Error notificando lead asignado:', error);
  }
};

/**
 * Notificar cambio de estado del lead
 * @param {object} lead - Lead modificado
 * @param {string} estadoAnterior - Estado anterior
 * @param {string} estadoNuevo - Estado nuevo
 */
export const notificarCambioEstado = async (lead, estadoAnterior, estadoNuevo) => {
  try {
    const destinatarios = [];
    
    // Notificar al usuario registrado (cliente) si existe
    if (lead.usuarioRegistrado?.userId) {
      destinatarios.push(lead.usuarioRegistrado.userId);
    }
    
    // Notificar al usuario asignado
    if (lead.asignadoA?.userId && !destinatarios.includes(lead.asignadoA.userId)) {
      destinatarios.push(lead.asignadoA.userId);
    }
    
    if (destinatarios.length > 0) {
      await crearNotificacion({
        tipo: NOTIFICATION_TYPES.CAMBIO_ESTADO,
        titulo: `Cambio de estado: ${lead.nombre}`,
        mensaje: `El estado cambió de "${estadoAnterior}" a "${estadoNuevo}"`,
        destinatarios,
        metadata: {
          leadId: lead._id?.toString(),
          leadNombre: lead.nombre,
          estadoAnterior,
          estadoNuevo
        },
        prioridad: 'normal'
      });
    }
    
    logger.info(`🔄 Notificación de cambio de estado enviada a ${destinatarios.length} usuarios`);
    
  } catch (error) {
    logger.error('Error notificando cambio de estado:', error);
  }
};

// Exportar servicio de notificaciones
export default {
  crearNotificacion,
  notificarMensajeInterno,
  notificarMensajeCliente,
  notificarRespuestaCliente,
  notificarLeadAsignado,
  notificarCambioEstado,
  NOTIFICATION_TYPES
};
