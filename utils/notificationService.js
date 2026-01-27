import logger from './logger.js';

/**
 * 🔔 Servicio de Notificaciones Simple
 * Sistema básico para notificar eventos de mensajería
 * Se puede extender con email, push notifications, etc.
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
 * Cola de notificaciones pendientes
 * En producción, esto debería usar Redis o una cola real
 */
const notificationQueue = [];

/**
 * Crear notificación
 * @param {object} options - Opciones de la notificación
 * @returns {object} - Notificación creada
 */
export const crearNotificacion = async ({
  tipo,
  titulo,
  mensaje,
  destinatarios = [], // Array de userIds
  metadata = {},
  prioridad = 'normal'
}) => {
  try {
    const notificacion = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tipo,
      titulo,
      mensaje,
      destinatarios,
      metadata,
      prioridad,
      leida: false,
      creadaEn: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
    };
    
    // Agregar a la cola (en producción, usar Redis/Queue service)
    notificationQueue.push(notificacion);
    
    logger.info(`📬 Notificación creada: ${tipo} para ${destinatarios.length} usuarios`);
    
    return notificacion;
    
  } catch (error) {
    logger.error('Error creando notificación:', error);
    throw error;
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
          leadId: lead._id,
          messageId: mensaje._id,
          leadNombre: lead.nombre
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
      mensaje: mensaje.asunto || 'Tienes un nuevo mensaje',
      destinatarios: [lead.usuarioRegistrado.userId],
      metadata: {
        leadId: lead._id,
        messageId: mensaje._id,
        leadNombre: lead.nombre,
        autorNombre: mensaje.autor.nombre
      },
      prioridad: mensaje.prioridad || 'normal'
    });
    
    logger.info(`📧 Notificación enviada al cliente: ${lead.usuarioRegistrado.email}`);
    
    // TODO: Aquí se podría integrar con servicio de email
    // await enviarEmail({
    //   to: lead.usuarioRegistrado.email,
    //   subject: mensaje.asunto,
    //   body: mensaje.contenido
    // });
    
  } catch (error) {
    logger.error('Error notificando mensaje al cliente:', error);
  }
};

/**
 * Notificar respuesta del cliente
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
          leadId: lead._id,
          messageId: mensaje._id,
          leadNombre: lead.nombre,
          clienteNombre: mensaje.autor.nombre
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
 * @param {string} asignadoA - Usuario al que se asignó
 */
export const notificarLeadAsignado = async (lead, asignadoA) => {
  try {
    await crearNotificacion({
      tipo: NOTIFICATION_TYPES.LEAD_ASIGNADO,
      titulo: `Nuevo lead asignado`,
      mensaje: `Se te ha asignado el lead: ${lead.nombre}`,
      destinatarios: [asignadoA],
      metadata: {
        leadId: lead._id,
        leadNombre: lead.nombre,
        leadEstado: lead.estado,
        leadPrioridad: lead.prioridad
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
          leadId: lead._id,
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

/**
 * Obtener notificaciones de un usuario
 * @param {string} userId - ID del usuario
 * @param {object} filtros - Filtros opcionales
 * @returns {array} - Array de notificaciones
 */
export const obtenerNotificaciones = async (userId, filtros = {}) => {
  try {
    let notificaciones = notificationQueue.filter(n => 
      n.destinatarios.includes(userId)
    );
    
    // Aplicar filtros
    if (filtros.noLeidas) {
      notificaciones = notificaciones.filter(n => !n.leida);
    }
    
    if (filtros.tipo) {
      notificaciones = notificaciones.filter(n => n.tipo === filtros.tipo);
    }
    
    // Ordenar por fecha (más recientes primero)
    notificaciones.sort((a, b) => b.creadaEn - a.creadaEn);
    
    return notificaciones;
    
  } catch (error) {
    logger.error('Error obteniendo notificaciones:', error);
    return [];
  }
};

/**
 * Marcar notificación como leída
 * @param {string} notificationId - ID de la notificación
 * @param {string} userId - ID del usuario
 */
export const marcarComoLeida = async (notificationId, userId) => {
  try {
    const notificacion = notificationQueue.find(n => 
      n.id === notificationId && n.destinatarios.includes(userId)
    );
    
    if (notificacion) {
      notificacion.leida = true;
      notificacion.leidaEn = new Date();
      logger.info(`✅ Notificación ${notificationId} marcada como leída por ${userId}`);
    }
    
  } catch (error) {
    logger.error('Error marcando notificación como leída:', error);
  }
};

/**
 * Contar notificaciones no leídas
 * @param {string} userId - ID del usuario
 * @returns {number} - Cantidad de notificaciones no leídas
 */
export const contarNoLeidas = async (userId) => {
  try {
    const noLeidas = notificationQueue.filter(n => 
      n.destinatarios.includes(userId) && !n.leida
    );
    
    return noLeidas.length;
    
  } catch (error) {
    logger.error('Error contando notificaciones no leídas:', error);
    return 0;
  }
};

/**
 * Limpiar notificaciones expiradas
 * Ejecutar periódicamente (cron job)
 */
export const limpiarNotificacionesExpiradas = async () => {
  try {
    const ahora = new Date();
    const antes = notificationQueue.length;
    
    // Filtrar notificaciones no expiradas
    const notificacionesValidas = notificationQueue.filter(n => 
      n.expiresAt > ahora
    );
    
    // Actualizar la cola
    notificationQueue.length = 0;
    notificationQueue.push(...notificacionesValidas);
    
    const eliminadas = antes - notificationQueue.length;
    
    if (eliminadas > 0) {
      logger.info(`🗑️ ${eliminadas} notificaciones expiradas eliminadas`);
    }
    
  } catch (error) {
    logger.error('Error limpiando notificaciones expiradas:', error);
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
  obtenerNotificaciones,
  marcarComoLeida,
  contarNoLeidas,
  limpiarNotificacionesExpiradas,
  NOTIFICATION_TYPES
};
