import Lead from '../models/Lead.js';
import User from '../models/User.js';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { hasPermission } from '../utils/roleHelper.js';
import { PERMISSIONS } from '../config/roles.js';
import logger from '../utils/logger.js';

/**
 * 🔧 Helper: Obtener información del usuario desde Clerk
 */
const getUserInfo = async (userId) => {
  try {
    const user = await clerkClient.users.getUser(userId);
    return {
      id: user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.emailAddresses[0]?.emailAddress || '',
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress
    };
  } catch (error) {
    logger.error('Error obteniendo usuario de Clerk:', error);
    throw new Error('Usuario no encontrado');
  }
};

/**
 * @desc    Obtener todos los leads (con filtros de rol)
 * @route   GET /api/crm/leads
 * @access  Private
 */
export const getLeads = async (req, res) => {
  try {
    const { role, clerkId: userId } = req.user; // ✅ Cambiar de req.user a req.user
    const { 
      estado, 
      search, 
      page = 1, 
      limit = 10, 
      asignado, 
      prioridad,
      tipoServicio,
      origen 
    } = req.query;
    
    // ✅ Verificar permisos
    if (!hasPermission(role, PERMISSIONS.VIEW_ALL_LEADS) && 
        !hasPermission(role, PERMISSIONS.VIEW_OWN_LEADS) &&
        !hasPermission(role, PERMISSIONS.VIEW_TEAM_LEADS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver leads'
      });
    }
    
    // 🔍 Construir filtro base
    let filter = { activo: true };
    
    // 👥 Filtros de rol (importante para seguridad)
    if (hasPermission(role, PERMISSIONS.VIEW_ALL_LEADS)) {
      // SUPER_ADMIN y ADMIN ven todos los leads
      logger.debug(`Usuario ${userId} con rol ${role} consultando todos los leads`);
    } else if (hasPermission(role, PERMISSIONS.VIEW_OWN_LEADS)) {
      // MODERATOR solo ve sus leads asignados
      filter['asignadoA.userId'] = userId;
      logger.debug(`Usuario ${userId} consultando solo sus leads asignados`);
    }
    
    // 📊 Filtros adicionales
    if (estado && estado !== 'all') {
      filter.estado = estado;
    }
    
    if (asignado && asignado !== 'all') {
      filter['asignadoA.userId'] = asignado;
    }
    
    if (prioridad && prioridad !== 'all') {
      filter.prioridad = prioridad;
    }
    
    if (tipoServicio && tipoServicio !== 'all') {
      filter.tipoServicio = tipoServicio;
    }
    
    if (origen && origen !== 'all') {
      filter.origen = origen;
    }
    
    // 🔎 Búsqueda por texto
    if (search) {
      filter.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { correo: { $regex: search, $options: 'i' } },
        { empresa: { $regex: search, $options: 'i' } },
        { descripcionProyecto: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 📄 Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Lead.countDocuments(filter)
    ]);
    
    logger.debug(`Usuario ${userId} consultó ${leads.length} leads de ${total} totales`);
    
    res.json({
      success: true,
      data: leads,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: leads.length,
        totalRecords: total
      }
    });
    
  } catch (error) {
    logger.error('❌ Error en getLeads:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener un lead por ID
 * @route   GET /api/crm/leads/:id
 * @access  Private
 */
export const getLead = async (req, res) => {
  try {
    const { role, clerkId: userId } = req.user;
    const { id } = req.params;
    
    const lead = await Lead.findById(id).lean();
    
    if (!lead || !lead.activo) {
      return res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      });
    }
    
    // ✅ Verificar permisos de acceso
    const canViewAll = hasPermission(role, PERMISSIONS.VIEW_ALL_LEADS);
    const canViewOwn = hasPermission(role, PERMISSIONS.VIEW_OWN_LEADS);
    
    if (!canViewAll && (!canViewOwn || lead.asignadoA?.userId !== userId)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este lead'
      });
    }
    
    logger.debug(`Usuario ${userId} consultó lead ${id}`);
    
    res.json({
      success: true,
      data: lead
    });
    
  } catch (error) {
    logger.error('❌ Error en getLead:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Crear nuevo lead
 * @route   POST /api/crm/leads
 * @access  Private
 */
export const createLead = async (req, res) => {
  try {
    const { role, clerkId: userId } = req.user;
    
    // ✅ Verificar permisos
    if (!hasPermission(role, PERMISSIONS.CREATE_LEADS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear leads'
      });
    }
    
    // 👤 Obtener información del usuario creador
    const userInfo = await getUserInfo(userId);
    
    const leadData = {
      ...req.body,
      creadoPor: {
        userId: userInfo.id,
        nombre: userInfo.fullName,
        email: userInfo.email
      }
    };
    
    const lead = await Lead.create(leadData);
    
    // � VINCULACIÓN AUTOMÁTICA: Buscar usuario registrado con el mismo email
    let autoLinkResult = null;
    if (lead.email || lead.correo) {
      const leadEmail = lead.email || lead.correo;
      try {
        const existingUser = await User.findOne({ 
          email: leadEmail,
          role: 'CLIENT' 
        }).lean();
        
        if (existingUser && !lead.usuarioRegistrado?.userId) {
          lead.usuarioRegistrado = {
            userId: existingUser.clerkId,
            nombre: `${existingUser.firstName} ${existingUser.lastName}`.trim(),
            email: existingUser.email,
            vinculadoEn: new Date(),
            vinculadoPor: {
              userId: userInfo.id,
              nombre: userInfo.fullName
            }
          };
          
          await lead.save();
          
          autoLinkResult = {
            success: true,
            message: 'Lead vinculado automáticamente con usuario existente',
            linkedUser: {
              clerkId: existingUser.clerkId,
              email: existingUser.email,
              name: `${existingUser.firstName} ${existingUser.lastName}`.trim()
            }
          };
          
          logger.success('Lead vinculado automáticamente al crearse', {
            leadId: lead._id.toString(),
            userEmail: existingUser.email
          });
        }
      } catch (linkError) {
        logger.error('Error en vinculación automática del lead (no crítico)', {
          error: linkError.message,
          leadEmail
        });
      }
    }
    
    // �📝 Agregar actividad inicial
    await lead.agregarActividad('nota', 'Lead creado en el sistema', userInfo);
    
    logger.success(`✅ Lead ${lead._id} creado por usuario ${userId}`);
    
    res.status(201).json({
      success: true,
      message: 'Lead creado exitosamente',
      autoLinking: autoLinkResult, // Información de vinculación automática
      data: lead
    });
    
  } catch (error) {
    logger.error('❌ Error en createLead:', error);
    
    // Manejo específico de errores de validación
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Actualizar lead
 * @route   PUT /api/crm/leads/:id
 * @access  Private
 */
export const updateLead = async (req, res) => {
  try {
    const { role, clerkId: userId } = req.user;
    const { id } = req.params;
    
    const lead = await Lead.findById(id);
    
    if (!lead || !lead.activo) {
      return res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      });
    }
    
    // ✅ Verificar permisos
    const canEditAll = hasPermission(role, PERMISSIONS.EDIT_ALL_LEADS);
    const canEditOwn = hasPermission(role, PERMISSIONS.EDIT_OWN_LEADS);
    
    if (!canEditAll && (!canEditOwn || lead.asignadoA?.userId !== userId)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para editar este lead'
      });
    }
    
    // 🔄 Actualizar campos permitidos
    const camposActualizables = [
      'nombre', 'celular', 'correo', 'empresa',
      'tipoServicio', 'descripcionProyecto', 'presupuestoEstimado',
      'fechaDeseada', 'prioridad', 'fechaProximoSeguimiento', 'tags'
    ];
    
    camposActualizables.forEach(campo => {
      if (req.body[campo] !== undefined) {
        lead[campo] = req.body[campo];
      }
    });
    
    await lead.save();
    
    // 📝 Registrar actividad
    const userInfo = await getUserInfo(userId);
    await lead.agregarActividad('nota', 'Lead actualizado', userInfo);
    
    logger.debug(`Lead ${id} actualizado por usuario ${userId}`);
    
    res.json({
      success: true,
      message: 'Lead actualizado exitosamente',
      data: lead
    });
    
  } catch (error) {
    logger.error('❌ Error en updateLead:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Eliminar lead (soft delete)
 * @route   DELETE /api/crm/leads/:id
 * @access  Private
 */
export const deleteLead = async (req, res) => {
  try {
    const { role, clerkId: userId } = req.user;
    const { id } = req.params;
    
    // ✅ Verificar permisos
    if (!hasPermission(role, PERMISSIONS.DELETE_LEADS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar leads'
      });
    }
    
    const lead = await Lead.findById(id);
    
    if (!lead || !lead.activo) {
      return res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      });
    }
    
    // Soft delete
    lead.activo = false;
    await lead.save();
    
    logger.warn(`⚠️ Lead ${id} eliminado (soft delete) por usuario ${userId}`);
    
    res.json({
      success: true,
      message: 'Lead eliminado exitosamente'
    });
    
  } catch (error) {
    logger.error('❌ Error en deleteLead:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Cambiar estado del lead
 * @route   PATCH /api/crm/leads/:id/estado
 * @access  Private
 */
export const cambiarEstado = async (req, res) => {
  try {
    const { role, clerkId: userId } = req.user;
    const { id } = req.params;
    const { estado, razon } = req.body;
    
    // ✅ Verificar permisos
    if (!hasPermission(role, PERMISSIONS.CHANGE_LEAD_STATUS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cambiar el estado del lead'
      });
    }
    
    const lead = await Lead.findById(id);
    
    if (!lead || !lead.activo) {
      return res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      });
    }
    
    const userInfo = await getUserInfo(userId);
    await lead.cambiarEstado(estado, razon || 'Sin razón especificada', userInfo);
    
    logger.debug(`✅ Estado del lead ${id} cambiado a ${estado} por usuario ${userId}`);
    
    res.json({
      success: true,
      message: 'Estado actualizado exitosamente',
      data: lead
    });
    
  } catch (error) {
    logger.error('❌ Error en cambiarEstado:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Agregar actividad al lead
 * @route   POST /api/crm/leads/:id/actividades
 * @access  Private
 */
export const agregarActividad = async (req, res) => {
  try {
    const { role, clerkId: userId } = req.user;
    const { id } = req.params;
    const { tipo, descripcion } = req.body;
    
    // ✅ Verificar permisos
    if (!hasPermission(role, PERMISSIONS.ADD_LEAD_ACTIVITIES)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para agregar actividades'
      });
    }
    
    if (!tipo || !descripcion) {
      return res.status(400).json({
        success: false,
        message: 'Tipo y descripción son requeridos'
      });
    }
    
    const lead = await Lead.findById(id);
    
    if (!lead || !lead.activo) {
      return res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      });
    }
    
    const userInfo = await getUserInfo(userId);
    await lead.agregarActividad(tipo, descripcion, userInfo);
    
    logger.debug(`📝 Actividad "${tipo}" agregada al lead ${id} por usuario ${userId}`);
    
    res.json({
      success: true,
      message: 'Actividad agregada exitosamente',
      data: lead
    });
    
  } catch (error) {
    logger.error('❌ Error en agregarActividad:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Asignar lead a un usuario
 * @route   PATCH /api/crm/leads/:id/asignar
 * @access  Private
 */
export const asignarLead = async (req, res) => {
  try {
    const { role, clerkId: userId } = req.user;
    const { id } = req.params;
    const { usuarioId } = req.body;
    
    // ✅ Verificar permisos
    if (!hasPermission(role, PERMISSIONS.ASSIGN_LEADS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para asignar leads'
      });
    }
    
    if (!usuarioId) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario es requerido'
      });
    }
    
    const lead = await Lead.findById(id);
    
    if (!lead || !lead.activo) {
      return res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      });
    }
    
    // Obtener información del usuario a asignar
    const usuarioAsignado = await getUserInfo(usuarioId);
    const usuarioAsignador = await getUserInfo(userId);
    
    await lead.asignarA(usuarioAsignado, usuarioAsignador);
    
    logger.success(`✅ Lead ${id} asignado a ${usuarioAsignado.fullName} por ${usuarioAsignador.fullName}`);
    
    res.json({
      success: true,
      message: 'Lead asignado exitosamente',
      data: lead
    });
    
  } catch (error) {
    logger.error('❌ Error en asignarLead:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener estadísticas del CRM
 * @route   GET /api/crm/estadisticas
 * @access  Private
 */
export const getEstadisticas = async (req, res) => {
  try {
    const { role, clerkId: userId } = req.user;
    
    // ✅ Verificar permisos
    if (!hasPermission(role, PERMISSIONS.VIEW_CRM_REPORTS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver reportes'
      });
    }
    
    // 🔍 Filtros basados en rol
    let matchFilter = { activo: true };
    if (!hasPermission(role, PERMISSIONS.VIEW_ALL_LEADS)) {
      matchFilter['asignadoA.userId'] = userId;
    }
    
    const [
      estadoPorEstado,
      estadoPorPrioridad,
      estadoPorOrigen,
      estadoPorTipoServicio,
      totalLeads,
      leadsPorMes,
      leadsPendientesSeguimiento
    ] = await Promise.all([
      // Leads por estado
      Lead.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$estado', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Leads por prioridad
      Lead.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$prioridad', count: { $sum: 1 } } }
      ]),
      
      // Leads por origen
      Lead.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$origen', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Leads por tipo de servicio
      Lead.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$tipoServicio', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Total de leads
      Lead.countDocuments(matchFilter),
      
      // Leads por mes (últimos 6 meses)
      Lead.aggregate([
        { 
          $match: { 
            ...matchFilter, 
            createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) } 
          } 
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      
      // Leads pendientes de seguimiento
      Lead.countDocuments({
        ...matchFilter,
        fechaProximoSeguimiento: { $lte: new Date() },
        estado: { $nin: ['ganado', 'perdido'] }
      })
    ]);
    
    logger.debug(`📊 Usuario ${userId} consultó estadísticas del CRM`);
    
    res.json({
      success: true,
      data: {
        total: totalLeads,
        porEstado: estadoPorEstado,
        porPrioridad: estadoPorPrioridad,
        porOrigen: estadoPorOrigen,
        porTipoServicio: estadoPorTipoServicio,
        porMes: leadsPorMes,
        pendientesSeguimiento: leadsPendientesSeguimiento
      }
    });
    
  } catch (error) {
    logger.error('❌ Error en getEstadisticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener leads pendientes de seguimiento
 * @route   GET /api/crm/leads/pendientes
 * @access  Private
 */
export const getLeadsPendientes = async (req, res) => {
  try {
    const { role, clerkId: userId } = req.user;
    
    // ✅ Verificar permisos
    if (!hasPermission(role, PERMISSIONS.VIEW_ALL_LEADS) && 
        !hasPermission(role, PERMISSIONS.VIEW_OWN_LEADS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver leads pendientes'
      });
    }
    
    let filter = {
      activo: true,
      fechaProximoSeguimiento: { $lte: new Date() },
      estado: { $nin: ['ganado', 'perdido'] }
    };
    
    // Filtrar por usuario si no tiene permisos completos
    if (!hasPermission(role, PERMISSIONS.VIEW_ALL_LEADS)) {
      filter['asignadoA.userId'] = userId;
    }
    
    const leads = await Lead.find(filter)
      .sort({ fechaProximoSeguimiento: 1 })
      .limit(50)
      .lean();
    
    logger.debug(`📅 Usuario ${userId} consultó ${leads.length} leads pendientes`);
    
    res.json({
      success: true,
      count: leads.length,
      data: leads
    });
    
  } catch (error) {
    logger.error('❌ Error en getLeadsPendientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener timeline completo de un lead (actividades + mensajes)
 * @route   GET /api/crm/leads/:id/timeline
 * @access  Private
 */
export const getLeadTimeline = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, clerkId: userId } = req.user;
    const { incluirPrivados = false } = req.query;
    
    // Verificar permisos
    if (!hasPermission(role, PERMISSIONS.VIEW_ALL_LEADS) && 
        !hasPermission(role, PERMISSIONS.VIEW_OWN_LEADS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este lead'
      });
    }
    
    const lead = await Lead.findById(id);
    
    if (!lead || !lead.activo) {
      return res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      });
    }
    
    // Verificar acceso según rol
    if (hasPermission(role, PERMISSIONS.VIEW_OWN_LEADS) && 
        !hasPermission(role, PERMISSIONS.VIEW_ALL_LEADS)) {
      if (lead.asignadoA?.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a este lead'
        });
      }
    }
    
    // Determinar si puede ver mensajes privados
    const puedeVerPrivados = hasPermission(role, PERMISSIONS.VIEW_PRIVATE_NOTES) && 
                             incluirPrivados === 'true';
    
    // Obtener timeline
    const timeline = lead.obtenerTimeline(puedeVerPrivados);
    
    // Contar mensajes no leídos
    const mensajesNoLeidos = lead.contarMensajesNoLeidos(userId);
    
    res.status(200).json({
      success: true,
      data: {
        lead: {
          id: lead._id,
          nombre: lead.nombre,
          correo: lead.correo,
          empresa: lead.empresa,
          estado: lead.estado,
          prioridad: lead.prioridad,
          usuarioRegistrado: lead.usuarioRegistrado
        },
        timeline,
        stats: {
          totalActividades: timeline.length,
          mensajesNoLeidos
        }
      }
    });
    
  } catch (error) {
    logger.error('❌ Error en getLeadTimeline:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Vincular lead con usuario registrado
 * @route   POST /api/crm/leads/:id/vincular-usuario
 * @access  Private (ADMIN)
 */
export const vincularUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, clerkId: userId } = req.user;
    const { usuarioId } = req.body; // clerkId del usuario a vincular
    
    // Verificar permisos
    if (!hasPermission(role, PERMISSIONS.EDIT_ALL_LEADS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para vincular usuarios'
      });
    }
    
    if (!usuarioId) {
      return res.status(400).json({
        success: false,
        message: 'El ID del usuario es requerido'
      });
    }
    
    const lead = await Lead.findById(id);
    
    if (!lead || !lead.activo) {
      return res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      });
    }
    
    // Verificar si ya está vinculado
    if (lead.usuarioRegistrado?.userId) {
      return res.status(400).json({
        success: false,
        message: 'Este lead ya tiene un usuario vinculado'
      });
    }
    
    // Obtener información del usuario a vincular
    const usuarioAVincular = await getUserInfo(usuarioId);
    
    // Obtener información del usuario que hace la vinculación
    const vinculadoPor = await getUserInfo(userId);
    
    // Vincular usuario
    await lead.vincularUsuario(usuarioAVincular, vinculadoPor);
    
    logger.info(`✅ Usuario ${usuarioId} vinculado a lead ${id} por ${userId}`);
    
    res.status(200).json({
      success: true,
      message: 'Usuario vinculado exitosamente',
      data: {
        lead: {
          id: lead._id,
          nombre: lead.nombre,
          usuarioRegistrado: lead.usuarioRegistrado
        }
      }
    });
    
  } catch (error) {
    logger.error('❌ Error en vincularUsuario:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Desvincular usuario registrado de un lead
 * @route   DELETE /api/crm/leads/:id/vincular-usuario
 * @access  Private (ADMIN)
 */
export const desvincularUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, clerkId: userId } = req.user;
    
    // Verificar permisos
    if (!hasPermission(role, PERMISSIONS.EDIT_ALL_LEADS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para desvincular usuarios'
      });
    }
    
    const lead = await Lead.findById(id);
    
    if (!lead || !lead.activo) {
      return res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      });
    }
    
    if (!lead.usuarioRegistrado?.userId) {
      return res.status(400).json({
        success: false,
        message: 'Este lead no tiene un usuario vinculado'
      });
    }
    
    // Desvincular
    lead.usuarioRegistrado = undefined;
    
    // Agregar actividad
    const vinculadoPor = await getUserInfo(userId);
    await lead.agregarActividad(
      'nota',
      'Usuario registrado desvinculado',
      vinculadoPor
    );
    
    await lead.save();
    
    logger.info(`✅ Usuario desvinculado de lead ${id} por ${userId}`);
    
    res.status(200).json({
      success: true,
      message: 'Usuario desvinculado exitosamente'
    });
    
  } catch (error) {
    logger.error('❌ Error en desvincularUsuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener mis leads (para clientes registrados)
 * @route   GET /api/crm/cliente/mis-leads
 * @access  Private (CLIENT)
 */
export const getMisLeads = async (req, res) => {
  try {
    const { clerkId: userId, role } = req.user;
    const { page = 1, limit = 10 } = req.query;
    
    // Permitir acceso a clientes (CLIENT) y usuarios registrados (USER)
    if (!['CLIENT', 'USER'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Esta ruta es solo para clientes'
      });
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [leads, total] = await Promise.all([
      Lead.find({
        'usuarioRegistrado.userId': userId,
        activo: true
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-actividades') // No enviar todas las actividades
        .lean(),
      Lead.countDocuments({
        'usuarioRegistrado.userId': userId,
        activo: true
      })
    ]);
    
    // Agregar contador de mensajes no leídos a cada lead
    const leadsConStats = await Promise.all(
      leads.map(async (lead) => {
        const leadDoc = await Lead.findById(lead._id).lean();
        const mensajesNoLeidos = leadDoc.contarMensajesNoLeidos ? leadDoc.contarMensajesNoLeidos(userId) : 0;
        return {
          ...lead,
          mensajesNoLeidos
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: {
        leads: leadsConStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    logger.error('❌ Error en getMisLeads:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Exportar todas las funciones
export default {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  cambiarEstado,
  agregarActividad,
  asignarLead,
  getEstadisticas,
  getLeadsPendientes,
  getLeadTimeline,
  vincularUsuario,
  desvincularUsuario,
  getMisLeads
};
