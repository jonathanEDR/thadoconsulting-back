import LeadMessage from '../models/LeadMessage.js';
import Lead from '../models/Lead.js';
import { hasPermission } from '../utils/roleHelper.js';
import { PERMISSIONS } from '../config/roles.js';
import logger from '../utils/logger.js';

/**
 * 🔧 Helper: Verificar acceso al lead
 */
const verificarAccesoLead = async (leadId, userId, role) => {
  const lead = await Lead.findById(leadId).lean();
  
  if (!lead) {
    throw new Error('Lead no encontrado');
  }
  
  // SUPER_ADMIN y ADMIN tienen acceso a todos los leads
  if (hasPermission(role, PERMISSIONS.VIEW_ALL_LEADS)) {
    return lead;
  }
  
  // MODERATOR solo puede acceder a leads asignados
  if (hasPermission(role, PERMISSIONS.VIEW_OWN_LEADS)) {
    if (lead.asignadoA?.userId !== userId) {
      throw new Error('No tienes acceso a este lead');
    }
    return lead;
  }
  
  // CLIENT y USER pueden acceder a sus propios leads vinculados
  if (role === 'CLIENT' || role === 'USER') {
    if (lead.usuarioRegistrado?.userId !== userId) {
      throw new Error('No tienes acceso a este lead');
    }
    return lead;
  }
  
  throw new Error('No tienes permisos para acceder a este lead');
};

/**
 * 🔧 Helper: Obtener información del usuario
 */
const getUserInfo = (user) => {
  return {
    userId: user.clerkId || user.id,
    nombre: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    email: user.email,
    rol: user.role
  };
};

/**
 * @desc    Obtener timeline de mensajes de un lead
 * @route   GET /api/crm/leads/:id/messages
 * @access  Private
 */
export const getLeadMessages = async (req, res) => {
  try {
    const { id: leadId } = req.params;
    const { clerkId: userId, role } = req.user;
    const { incluirPrivados = false, tipo, page = 1, limit = 50 } = req.query;
    
    // Verificar permisos básicos
    if (!hasPermission(role, PERMISSIONS.VIEW_LEAD_MESSAGES)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver mensajes'
      });
    }
    
    // Verificar acceso al lead
    const lead = await verificarAccesoLead(leadId, userId, role);
    
    // Determinar si puede ver mensajes privados
    const puedeVerPrivados = hasPermission(role, PERMISSIONS.VIEW_PRIVATE_NOTES);
    const mostrarPrivados = incluirPrivados === 'true' && puedeVerPrivados;
    
    // Construir filtros
    const filtros = {};
    if (tipo) {
      filtros.tipo = tipo;
    }
    
    // Obtener mensajes
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {
      leadId,
      eliminado: false,
      ...filtros
    };
    
    if (!mostrarPrivados) {
      query.esPrivado = false;
    }
    
    const [mensajes, total] = await Promise.all([
      LeadMessage.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('respondidoA', 'contenido autor.nombre createdAt')
        .lean(),
      LeadMessage.countDocuments(query)
    ]);
    
    // Obtener estadísticas
    const stats = await LeadMessage.obtenerEstadisticas(leadId);
    
    res.status(200).json({
      success: true,
      data: {
        mensajes,
        lead: {
          id: lead._id,
          nombre: lead.nombre,
          email: lead.correo,
          usuarioRegistrado: lead.usuarioRegistrado
        },
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo mensajes del lead:', error);
    res.status(error.message.includes('acceso') ? 403 : 500).json({
      success: false,
      message: error.message || 'Error obteniendo mensajes'
    });
  }
};

/**
 * @desc    Enviar mensaje interno (nota privada)
 * @route   POST /api/crm/leads/:id/messages/internal
 * @access  Private (ADMIN, MODERATOR)
 */
export const enviarMensajeInterno = async (req, res) => {
  try {
    const { id: leadId } = req.params;
    const { clerkId: userId, role } = req.user;
    const { contenido, asunto, prioridad = 'normal', etiquetas = [] } = req.body;
    
    // Verificar permisos
    if (!hasPermission(role, PERMISSIONS.SEND_LEAD_MESSAGES)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para enviar mensajes'
      });
    }
    
    // Validaciones
    if (!contenido || contenido.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El contenido del mensaje es requerido'
      });
    }
    
    // Verificar acceso al lead
    const lead = await verificarAccesoLead(leadId, userId, role);
    const userInfo = getUserInfo(req.user);
    
    // Crear mensaje interno
    const mensaje = new LeadMessage({
      leadId,
      tipo: 'nota_interna',
      autor: userInfo,
      asunto,
      contenido,
      esPrivado: true,
      estado: 'enviado',
      prioridad,
      etiquetas: Array.isArray(etiquetas) ? etiquetas : []
    });
    
    await mensaje.save();
    
    // También agregar a las actividades del lead (para mantener compatibilidad)
    await lead.agregarMensajeInterno(contenido, req.user);
    
    logger.info(`Mensaje interno creado en lead ${leadId} por ${userId}`);
    
    res.status(201).json({
      success: true,
      message: 'Nota interna agregada exitosamente',
      data: mensaje
    });
    
  } catch (error) {
    logger.error('Error enviando mensaje interno:', error);
    res.status(error.message.includes('acceso') ? 403 : 500).json({
      success: false,
      message: error.message || 'Error enviando mensaje interno'
    });
  }
};

/**
 * @desc    Enviar mensaje al cliente
 * @route   POST /api/crm/leads/:id/messages/client
 * @access  Private (ADMIN, MODERATOR)
 */
export const enviarMensajeCliente = async (req, res) => {
  try {
    const { id: leadId } = req.params;
    const { clerkId: userId, role } = req.user;
    const { contenido, asunto, prioridad = 'normal', canal = 'sistema' } = req.body;
    
    // Verificar permisos
    if (!hasPermission(role, PERMISSIONS.SEND_CLIENT_MESSAGES)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para enviar mensajes a clientes'
      });
    }
    
    // Validaciones
    if (!contenido || contenido.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El contenido del mensaje es requerido'
      });
    }
    
    // Verificar acceso al lead
    const lead = await verificarAccesoLead(leadId, userId, role);
    
    // Verificar que el lead tenga usuario registrado
    if (!lead.usuarioRegistrado?.userId) {
      return res.status(400).json({
        success: false,
        message: 'Este lead no tiene un usuario registrado vinculado. No se puede enviar mensaje al cliente.'
      });
    }
    
    const userInfo = getUserInfo(req.user);
    
    // Crear mensaje al cliente
    const mensaje = new LeadMessage({
      leadId,
      tipo: 'mensaje_cliente',
      autor: userInfo,
      destinatario: {
        userId: lead.usuarioRegistrado.userId,
        nombre: lead.usuarioRegistrado.nombre,
        email: lead.usuarioRegistrado.email,
        rol: 'CLIENT'
      },
      asunto,
      contenido,
      esPrivado: false,
      estado: 'enviado',
      canal,
      prioridad
    });
    
    await mensaje.save();
    
    // También agregar a las actividades del lead
    await lead.enviarMensajeCliente(contenido, req.user);
    
    // 📧 Email deshabilitado temporalmente
    // Para habilitar: configurar RESEND_API_KEY en .env y descomentar emailService import
    const emailStatus = process.env.RESEND_API_KEY ? 'configurado pero no implementado' : 'deshabilitado';
    
    logger.info(`Mensaje enviado al cliente en lead ${leadId} por ${userId}`);
    
    res.status(201).json({
      success: true,
      message: 'Mensaje enviado al cliente exitosamente',
      data: mensaje,
      emailStatus
    });
    
  } catch (error) {
    logger.error('Error enviando mensaje al cliente:', error);
    res.status(error.message.includes('acceso') || error.message.includes('registrado') ? 403 : 500).json({
      success: false,
      message: error.message || 'Error enviando mensaje al cliente'
    });
  }
};

/**
 * @desc    Responder mensaje
 * @route   POST /api/crm/messages/:messageId/reply
 * @access  Private
 */
export const responderMensaje = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { clerkId: userId, role } = req.user;
    const { contenido } = req.body;
    
    // Verificar permisos
    if (!hasPermission(role, PERMISSIONS.REPLY_LEAD_MESSAGES)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para responder mensajes'
      });
    }
    
    // Validaciones
    if (!contenido || contenido.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El contenido de la respuesta es requerido'
      });
    }
    
    // Obtener mensaje original
    const mensajeOriginal = await LeadMessage.findById(messageId);
    if (!mensajeOriginal || mensajeOriginal.eliminado) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }
    
    // Verificar acceso al lead
    const lead = await verificarAccesoLead(mensajeOriginal.leadId, userId, role);
    
    const userInfo = getUserInfo(req.user);
    
    // Determinar tipo de respuesta
    let tipoRespuesta = 'nota_interna';
    let esPrivado = true;
    let destinatario = null;
    
    if (role === 'CLIENT') {
      // Cliente responde al equipo
      tipoRespuesta = 'respuesta_cliente';
      esPrivado = false;
      destinatario = mensajeOriginal.autor;
    } else {
      // Equipo responde al cliente
      if (mensajeOriginal.tipo === 'respuesta_cliente' || mensajeOriginal.tipo === 'mensaje_cliente') {
        tipoRespuesta = 'mensaje_cliente';
        esPrivado = false;
        destinatario = lead.usuarioRegistrado ? {
          userId: lead.usuarioRegistrado.userId,
          nombre: lead.usuarioRegistrado.nombre,
          email: lead.usuarioRegistrado.email,
          rol: 'CLIENT'
        } : null;
      }
    }
    
    // Crear respuesta
    const respuesta = new LeadMessage({
      leadId: mensajeOriginal.leadId,
      tipo: tipoRespuesta,
      autor: userInfo,
      destinatario,
      contenido,
      esPrivado,
      estado: 'enviado',
      respondidoA: messageId,
      prioridad: mensajeOriginal.prioridad
    });
    
    await respuesta.save();
    
    // Actualizar mensaje original
    await mensajeOriginal.agregarRespuesta(respuesta._id);
    
    logger.info(`Respuesta creada para mensaje ${messageId} por ${userId}`);
    
    res.status(201).json({
      success: true,
      message: 'Respuesta enviada exitosamente',
      data: respuesta
    });
    
  } catch (error) {
    logger.error('Error respondiendo mensaje:', error);
    res.status(error.message.includes('acceso') ? 403 : 500).json({
      success: false,
      message: error.message || 'Error respondiendo mensaje'
    });
  }
};

/**
 * @desc    Marcar mensaje como leído
 * @route   PATCH /api/crm/messages/:messageId/read
 * @access  Private
 */
export const marcarMensajeLeido = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { clerkId: userId, role } = req.user;
    
    const mensaje = await LeadMessage.findById(messageId);
    
    if (!mensaje || mensaje.eliminado) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }
    
    // Verificar acceso al lead
    await verificarAccesoLead(mensaje.leadId, userId, role);
    
    // Marcar como leído
    await mensaje.marcarComoLeido(req.user);
    
    res.status(200).json({
      success: true,
      message: 'Mensaje marcado como leído',
      data: mensaje
    });
    
  } catch (error) {
    logger.error('Error marcando mensaje como leído:', error);
    res.status(error.message.includes('acceso') ? 403 : 500).json({
      success: false,
      message: error.message || 'Error marcando mensaje como leído'
    });
  }
};

/**
 * @desc    Eliminar mensaje
 * @route   DELETE /api/crm/messages/:messageId
 * @access  Private (ADMIN)
 */
export const eliminarMensaje = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { clerkId: userId, role } = req.user;
    
    // Verificar permisos
    if (!hasPermission(role, PERMISSIONS.DELETE_LEAD_MESSAGES)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar mensajes'
      });
    }
    
    const mensaje = await LeadMessage.findById(messageId);
    
    if (!mensaje || mensaje.eliminado) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }
    
    // Verificar acceso al lead
    await verificarAccesoLead(mensaje.leadId, userId, role);
    
    // Eliminar mensaje (soft delete)
    await mensaje.eliminar(req.user);
    
    logger.info(`Mensaje ${messageId} eliminado por ${userId}`);
    
    res.status(200).json({
      success: true,
      message: 'Mensaje eliminado exitosamente'
    });
    
  } catch (error) {
    logger.error('Error eliminando mensaje:', error);
    res.status(error.message.includes('acceso') || error.message.includes('permisos') ? 403 : 500).json({
      success: false,
      message: error.message || 'Error eliminando mensaje'
    });
  }
};

/**
 * @desc    Obtener mensajes no leídos del usuario
 * @route   GET /api/crm/messages/unread
 * @access  Private
 */
export const getMensajesNoLeidos = async (req, res) => {
  try {
    const { clerkId: userId, role } = req.user;
    
    let query = {
      eliminado: false,
      leido: false
    };
    
    if (role === 'CLIENT') {
      // Cliente solo ve mensajes dirigidos a él
      query['destinatario.userId'] = userId;
      query.esPrivado = false;
    } else {
      // Equipo ve mensajes de leads asignados o respuestas de clientes
      const leads = await Lead.find({
        $or: [
          { 'asignadoA.userId': userId },
          { 'usuarioRegistrado.userId': userId }
        ],
        activo: true
      }).select('_id');
      
      const leadIds = leads.map(l => l._id);
      query.leadId = { $in: leadIds };
      
      // Solo mensajes de clientes (respuestas)
      if (role === 'MODERATOR') {
        query.tipo = 'respuesta_cliente';
      }
    }
    
    const mensajes = await LeadMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('leadId', 'nombre correo estado')
      .lean();
    
    const total = await LeadMessage.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: {
        mensajes,
        total
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo mensajes no leídos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo mensajes no leídos'
    });
  }
};

/**
 * @desc    Buscar mensajes
 * @route   GET /api/crm/messages/search
 * @access  Private
 */
export const buscarMensajes = async (req, res) => {
  try {
    const { clerkId: userId, role } = req.user;
    const { q, leadId, tipo, desde, hasta, page = 1, limit = 20 } = req.query;
    
    let query = {
      eliminado: false
    };
    
    // Solo agregar búsqueda de texto si se proporciona y tiene al menos 3 caracteres
    if (q && q.trim().length >= 3) {
      query.$or = [
        { contenido: { $regex: q, $options: 'i' } },
        { asunto: { $regex: q, $options: 'i' } }
      ];
    } else if (q && q.trim().length > 0 && q.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'La búsqueda debe tener al menos 3 caracteres'
      });
    }
    
    // Si no hay query de búsqueda, permitir cargar todos los mensajes
    
    // Filtros adicionales
    if (leadId) {
      query.leadId = leadId;
    }
    
    if (tipo) {
      query.tipo = tipo;
    }
    
    if (desde || hasta) {
      query.createdAt = {};
      if (desde) query.createdAt.$gte = new Date(desde);
      if (hasta) query.createdAt.$lte = new Date(hasta);
    }
    
    // Filtros por rol
    if (role === 'CLIENT') {
      query.esPrivado = false;
      query['destinatario.userId'] = userId;
    } else if (role === 'MODERATOR') {
      // Solo mensajes de leads asignados
      const leads = await Lead.find({
        'asignadoA.userId': userId,
        activo: true
      }).select('_id');
      
      const leadIds = leads.map(l => l._id);
      query.leadId = { $in: leadIds };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [mensajes, total] = await Promise.all([
      LeadMessage.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('leadId', 'nombre correo')
        .lean(),
      LeadMessage.countDocuments(query)
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        mensajes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    logger.error('Error buscando mensajes:', error);
    res.status(500).json({
      success: false,
      message: 'Error buscando mensajes'
    });
  }
};
