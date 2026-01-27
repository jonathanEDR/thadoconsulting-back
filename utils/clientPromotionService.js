import User from '../models/User.js';
import Lead from '../models/Lead.js';
import LeadMessage from '../models/LeadMessage.js';
import logger from './logger.js';

/**
 * 🎯 SERVICIO DE PROMOCIÓN A CLIENTE
 * 
 * Maneja la promoción de usuarios USER a CLIENT
 * Incluye:
 * - Cambio de rol con validaciones
 * - Mensaje de bienvenida específico para clientes
 * - Actualización de leads relacionados
 * - Registro de actividad en el CRM
 */

/**
 * Promover usuario de USER a CLIENT
 * 
 * @param {string} userId - Clerk ID del usuario a promover
 * @param {Object} promotedBy - Usuario que realiza la promoción
 * @param {string} promotedBy.userId - Clerk ID del admin
 * @param {string} promotedBy.nombre - Nombre del admin
 * @param {string} promotedBy.email - Email del admin
 * @param {string} notes - Notas opcionales sobre la promoción
 * @returns {Promise<Object>} Resultado de la promoción
 */
export const promoteUserToClient = async (userId, promotedBy, notes = '') => {
  try {
    logger.info('🎯 Iniciando promoción de usuario a CLIENT', {
      userId,
      promotedBy: promotedBy.email,
      notes
    });

    // 1. VALIDAR USUARIO EXISTE Y ES USER
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (user.role !== 'USER') {
      throw new Error(`El usuario ya tiene el rol ${user.role}. Solo usuarios USER pueden ser promovidos a CLIENT.`);
    }

    // 2. CAMBIAR ROL A CLIENT
    user.role = 'CLIENT';
    user.roleAssignedBy = promotedBy.userId;
    user.roleAssignedAt = new Date();
    await user.save();

    logger.success('✅ Rol actualizado a CLIENT', {
      userId,
      email: user.email,
      previousRole: 'USER',
      newRole: 'CLIENT'
    });

    // 3. ACTUALIZAR LEADS RELACIONADOS
    const leadsUpdated = await updateRelatedLeads(user, promotedBy, notes);

    // 4. ENVIAR MENSAJE DE BIENVENIDA COMO CLIENT
    const welcomeMessage = await sendClientWelcomeMessage(user, promotedBy);

    const result = {
      success: true,
      message: 'Usuario promovido a CLIENT exitosamente',
      promotion: {
        userId: user.clerkId,
        email: user.email,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        previousRole: 'USER',
        newRole: 'CLIENT',
        promotedBy: promotedBy.nombre,
        promotedAt: new Date(),
        leadsUpdated: leadsUpdated.count,
        messageSent: welcomeMessage.success
      }
    };

    logger.success('🎉 Promoción a CLIENT completada', result.promotion);

    return result;

  } catch (error) {
    logger.error('❌ Error en promoción a CLIENT', {
      error: error.message,
      stack: error.stack,
      userId
    });

    return {
      success: false,
      message: 'Error en promoción a CLIENT',
      error: error.message
    };
  }
};

/**
 * Actualizar leads relacionados con el usuario promovido
 */
async function updateRelatedLeads(user, promotedBy, notes) {
  try {
    const leads = await Lead.find({
      'usuarioRegistrado.userId': user.clerkId,
      activo: true
    });

    let updatedCount = 0;

    for (const lead of leads) {
      // Agregar actividad de promoción
      await lead.agregarActividad(
        'nota',
        `🎯 Usuario promovido a CLIENT por ${promotedBy.nombre}. ${notes ? `Notas: ${notes}` : 'El usuario ahora tiene acceso a servicios y funcionalidades de cliente.'}`,
        {
          id: promotedBy.userId,
          fullName: promotedBy.nombre,
          email: promotedBy.email
        }
      );

      // Actualizar prioridad si es necesario
      if (lead.estado === 'nuevo') {
        lead.prioridad = 'alta';
        lead.descripcionProyecto = lead.descripcionProyecto.replace(
          'Pendiente de calificación por equipo interno.',
          'Calificado como CLIENT - Cliente activo en el sistema.'
        );
        await lead.save();
      }

      updatedCount++;
    }

    logger.success(`✅ ${updatedCount} leads actualizados`, {
      userEmail: user.email,
      leadsUpdated: updatedCount
    });

    return {
      success: true,
      count: updatedCount,
      leads: leads.map(l => l._id.toString())
    };

  } catch (error) {
    logger.error('❌ Error actualizando leads', {
      error: error.message,
      userEmail: user.email
    });

    return {
      success: false,
      count: 0,
      error: error.message
    };
  }
}

/**
 * Enviar mensaje de bienvenida específico para CLIENT
 */
async function sendClientWelcomeMessage(user, promotedBy) {
  try {
    // Buscar el lead principal del usuario
    const lead = await Lead.findOne({
      'usuarioRegistrado.userId': user.clerkId,
      activo: true
    }).sort({ createdAt: 1 });

    if (!lead) {
      throw new Error('No se encontró lead asociado al usuario');
    }

    const firstName = user.firstName || user.email.split('@')[0];

    const clientWelcomeContent = `¡Felicidades ${firstName}! 🎊

¡Has sido calificado como **Cliente Oficial** de SCUTI Company! 🎯

Tu cuenta ha sido actualizada y ahora tienes acceso a beneficios exclusivos para clientes:

✨ **Beneficios Exclusivos de Cliente:**
• 📊 **Dashboard Premium**: Acceso completo a herramientas avanzadas
• 🎯 **Gestor de Proyectos**: Gestiona múltiples proyectos simultáneos
• 💬 **Soporte Prioritario**: Respuestas más rápidas de nuestro equipo
• 📈 **Reportes Detallados**: Seguimiento completo del progreso de tus proyectos
• 🔔 **Notificaciones VIP**: Actualizaciones en tiempo real
• 💎 **Descuentos Especiales**: Ofertas exclusivas para clientes

**¿Qué puedes hacer ahora?**
1. Explora tu nuevo dashboard con funciones premium
2. Revisa tus proyectos y solicitudes en curso
3. Accede a tu gestor de proyectos personalizado
4. Contacta a tu agente asignado directamente

**Tu Equipo Asignado:**
Ahora cuentas con un equipo dedicado para atender tus necesidades. Puedes escribirnos en cualquier momento y recibirás soporte prioritario.

**¿Necesitas algo?**
No dudes en contactarnos. Estamos aquí para hacer realidad tus proyectos y superar tus expectativas.

¡Bienvenido al nivel CLIENT! Estamos emocionados de trabajar contigo. 🚀

---
El equipo de SCUTI Company 💼
Actualizado por: ${promotedBy.nombre}`;

    const welcomeMessage = new LeadMessage({
      leadId: lead._id,
      tipo: 'mensaje_cliente',
      autor: {
        userId: promotedBy.userId,
        nombre: promotedBy.nombre,
        email: promotedBy.email,
        rol: 'ADMIN' // Quien promueve debe ser admin
      },
      destinatario: {
        userId: user.clerkId,
        nombre: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        rol: 'CLIENT' // Ahora es CLIENT
      },
      contenido: clientWelcomeContent,
      asunto: '🎊 ¡Bienvenido al Nivel Cliente!',
      prioridad: 'alta',
      esPrivado: false,
      etiquetas: ['promocion', 'client', 'bienvenida', 'premium'],
      
      // Estado del mensaje
      estado: 'enviado',
      leido: false,
      
      // Metadata
      metadata: {
        tipoPromocion: 'user_to_client',
        version: '1.0',
        promotedBy: promotedBy.nombre,
        promotedAt: new Date()
      }
    });

    await welcomeMessage.save();

    logger.success('✅ Mensaje de bienvenida CLIENT enviado', {
      leadId: lead._id.toString(),
      userId: user.clerkId,
      messageId: welcomeMessage._id.toString()
    });

    return {
      success: true,
      message: welcomeMessage
    };

  } catch (error) {
    logger.error('❌ Error enviando mensaje de bienvenida CLIENT', {
      error: error.message,
      userId: user.clerkId
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtener usuarios USER que pueden ser promovidos a CLIENT
 * 
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Array>} Lista de usuarios USER
 */
export const getUsersEligibleForPromotion = async (filters = {}) => {
  try {
    const query = {
      role: 'USER',
      isActive: true,
      ...filters
    };

    const users = await User.find(query)
      .select('clerkId email firstName lastName username profileImage createdAt lastLogin')
      .sort({ createdAt: -1 })
      .lean();

    // Agregar información adicional de leads
    const usersWithLeadInfo = await Promise.all(
      users.map(async (user) => {
        const leadCount = await Lead.countDocuments({
          'usuarioRegistrado.userId': user.clerkId,
          activo: true
        });

        const messageCount = await LeadMessage.countDocuments({
          'destinatario.userId': user.clerkId,
          eliminado: false
        });

        return {
          ...user,
          leadCount,
          messageCount,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
        };
      })
    );

    logger.info(`📋 ${usersWithLeadInfo.length} usuarios USER elegibles para promoción`);

    return {
      success: true,
      users: usersWithLeadInfo,
      total: usersWithLeadInfo.length
    };

  } catch (error) {
    logger.error('❌ Error obteniendo usuarios elegibles', {
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
