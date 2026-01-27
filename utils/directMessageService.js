import User from '../models/User.js';
import LeadMessage from '../models/LeadMessage.js';
import Lead from '../models/Lead.js';
import logger from '../utils/logger.js';

/**
 * 💬 SERVICIO DE MENSAJERÍA DIRECTA A USUARIOS
 * Permite enviar mensajes a CUALQUIER usuario registrado sin necesidad de un Lead
 * Útil para comunicación administrativa directa con usuarios
 */

/**
 * Crear un "Lead Virtual" temporal para un usuario sin lead
 * Esto permite usar el sistema de mensajería existente
 */
async function getOrCreateVirtualLead(userId, userData) {
  try {
    // Buscar si ya existe un lead virtual para este usuario
    // Los leads virtuales se identifican por el tag 'virtual'
    let virtualLead = await Lead.findOne({
      'usuarioRegistrado.userId': userId,
      tags: 'virtual', // Identificar por tag
      activo: true
    });

    if (virtualLead) {
      return virtualLead;
    }

    // Crear lead virtual
    virtualLead = new Lead({
      nombre: userData.fullName || userData.email,
      email: userData.email,
      correo: userData.email,
      telefono: 'Virtual',
      celular: 'Virtual',
      empresa: 'Mensajería Directa',
      tipoServicio: 'consultoria', // Usar valor válido del enum
      descripcionProyecto: '📧 Lead virtual para mensajería directa. Este usuario recibe mensajes del equipo sin un proyecto específico.',
      estado: 'nuevo',
      prioridad: 'media', // Valor válido: 'baja', 'media', 'alta', 'urgente'
      origen: 'chat', // Valor válido del enum
      
      usuarioRegistrado: {
        userId: userId,
        nombre: userData.fullName || userData.email,
        email: userData.email,
        vinculadoEn: new Date(),
        vinculadoPor: {
          userId: 'system',
          nombre: 'Sistema de Mensajería'
        }
      },
      
      creadoPor: {
        userId: 'system',
        nombre: 'Sistema de Mensajería Directa',
        email: 'sistema@scuti.company'
      },
      
      tags: ['virtual', 'mensaje_directo'], // Tags para identificar leads virtuales
      
      actividades: [{
        fecha: new Date(),
        tipo: 'nota',
        descripcion: '📧 Lead virtual creado para mensajería directa. Este usuario no tiene proyectos activos pero recibe mensajes del equipo.',
        usuarioId: 'system',
        usuarioNombre: 'Sistema',
        esPrivado: true,
        direccion: 'interno'
      }]
    });

    await virtualLead.save();

    logger.success('✅ Lead virtual creado para usuario', {
      userId,
      leadId: virtualLead._id.toString(),
      email: userData.email
    });

    return virtualLead;

  } catch (error) {
    logger.error('❌ Error creando/obteniendo lead virtual', {
      error: error.message,
      userId
    });
    throw error;
  }
}

/**
 * Enviar mensaje directo a un usuario (crea lead virtual si es necesario)
 * 
 * @param {string} userId - Clerk ID del usuario destinatario
 * @param {Object} messageData - Datos del mensaje
 * @param {Object} senderData - Datos del remitente (admin)
 * @returns {Promise<Object>} Mensaje creado
 */
export const sendDirectUserMessage = async (userId, messageData, senderData) => {
  try {
    logger.info('📧 Enviando mensaje directo a usuario', {
      userId,
      asunto: messageData.asunto
    });

    // 1. Obtener datos del usuario destinatario
    const destinatario = await User.findOne({ clerkId: userId });
    if (!destinatario) {
      throw new Error('Usuario destinatario no encontrado');
    }

    // 2. Obtener o crear lead virtual
    const virtualLead = await getOrCreateVirtualLead(userId, {
      fullName: `${destinatario.firstName} ${destinatario.lastName}`.trim(),
      email: destinatario.email
    });

    // 3. Crear el mensaje
    const mensaje = new LeadMessage({
      leadId: virtualLead._id,
      tipo: 'mensaje_cliente',
      
      autor: {
        userId: senderData.userId,
        nombre: senderData.nombre,
        email: senderData.email,
        rol: senderData.rol
      },
      
      destinatario: {
        userId: destinatario.clerkId,
        nombre: `${destinatario.firstName} ${destinatario.lastName}`.trim(),
        email: destinatario.email,
        rol: destinatario.role
      },
      
      asunto: messageData.asunto,
      contenido: messageData.contenido,
      prioridad: messageData.prioridad || 'normal',
      esPrivado: false, // Mensajes directos siempre visibles
      canal: messageData.canal || 'sistema',
      estado: 'enviado',
      
      etiquetas: ['mensaje_directo', 'sin_proyecto', ...(messageData.etiquetas || [])],
      
      metadata: {
        esMensajeDirecto: true,
        leadVirtual: true,
        enviadoDesde: 'admin_panel'
      }
    });

    await mensaje.save();

    // 4. Agregar actividad al lead virtual
    await virtualLead.agregarActividad(
      'mensaje_cliente', // Tipo válido del enum
      `💬 Mensaje directo enviado: ${messageData.asunto || 'Sin asunto'}`,
      {
        id: senderData.userId,
        fullName: senderData.nombre,
        email: senderData.email
      }
    );

    logger.success('✅ Mensaje directo enviado', {
      messageId: mensaje._id.toString(),
      leadId: virtualLead._id.toString(),
      destinatario: destinatario.email
    });

    return {
      success: true,
      message: 'Mensaje directo enviado exitosamente',
      data: {
        mensaje,
        leadVirtual: virtualLead
      }
    };

  } catch (error) {
    logger.error('❌ Error enviando mensaje directo', {
      error: error.message,
      stack: error.stack,
      userId
    });

    return {
      success: false,
      message: 'Error enviando mensaje directo',
      error: error.message
    };
  }
};

/**
 * Obtener lista de TODOS los usuarios activos del sistema
 * (Cualquier usuario registrado, tengan o no proyectos)
 * 
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Array>} Lista de usuarios activos
 */
export const getAllActiveUsers = async (filters = {}) => {
  try {
    logger.info('🔍 Iniciando búsqueda de usuarios activos', { filters });

    // Primero, verificar cuántos usuarios hay en total
    const totalUsers = await User.countDocuments({});
    logger.info(`📊 Total de usuarios en DB: ${totalUsers}`);

    // Verificar usuarios por rol
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    logger.info('📊 Usuarios por rol:', usersByRole);

    // Obtener TODOS los usuarios activos (excepto super admins si se desea)
    const query = {
      isActive: true,
      role: { $in: ['USER', 'CLIENT', 'MODERATOR'] }, // Excluir admins
      ...filters
    };

    logger.info('🔍 Query para usuarios activos:', query);

    const allUsers = await User.find(query)
      .select('clerkId email firstName lastName username profileImage role createdAt lastLogin')
      .sort({ firstName: 1, lastName: 1 }) // Ordenar alfabéticamente
      .lean();

    logger.info(`✅ Usuarios encontrados con query: ${allUsers.length}`);

    // Agregar información adicional
    const enrichedUsers = await Promise.all(
      allUsers.map(async (user) => {
        // Contar mensajes que ha recibido
        const messageCount = await LeadMessage.countDocuments({
          'destinatario.userId': user.clerkId,
          eliminado: false
        });

        // Verificar si tiene leads reales (excluir leads virtuales)
        const hasRealLeads = await Lead.exists({
          'usuarioRegistrado.userId': user.clerkId,
          tags: { $ne: 'virtual' }, // Excluir leads con tag 'virtual'
          activo: true
        });

        return {
          ...user,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          messageCount,
          hasRealLeads: !!hasRealLeads
        };
      })
    );

    logger.info(`📊 ${enrichedUsers.length} usuarios activos encontrados`);

    return {
      success: true,
      users: enrichedUsers,
      total: enrichedUsers.length
    };

  } catch (error) {
    logger.error('❌ Error obteniendo usuarios activos', {
      error: error.message
    });

    return {
      success: false,
      users: [],
      total: 0,
      error: error.message
    };
  }
};

/**
 * Obtener historial de mensajes directos de un usuario
 */
export const getUserDirectMessages = async (userId) => {
  try {
    // Buscar lead virtual del usuario
    const virtualLead = await Lead.findOne({
      'usuarioRegistrado.userId': userId,
      tipoServicio: 'virtual',
      activo: true
    });

    if (!virtualLead) {
      return {
        success: true,
        messages: [],
        total: 0
      };
    }

    // Obtener mensajes del lead virtual
    const messages = await LeadMessage.find({
      leadId: virtualLead._id,
      eliminado: false
    })
    .sort({ createdAt: -1 })
    .lean();

    return {
      success: true,
      messages,
      total: messages.length,
      leadId: virtualLead._id
    };

  } catch (error) {
    logger.error('❌ Error obteniendo mensajes directos', {
      error: error.message,
      userId
    });

    return {
      success: false,
      messages: [],
      total: 0,
      error: error.message
    };
  }
};
