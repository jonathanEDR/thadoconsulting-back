import Lead from '../models/Lead.js';
import LeadMessage from '../models/LeadMessage.js';
import User from '../models/User.js';
import logger from './logger.js';

/**
 * 🎉 SISTEMA DE ONBOARDING AUTOMÁTICO
 * 
 * Se ejecuta cuando un nuevo usuario registrado (USER) se registra en el sistema
 * Nota: Todos los usuarios se registran como USER. El equipo interno asigna CLIENT después.
 * Crea automáticamente:
 * - Lead de bienvenida
 * - Mensaje de bienvenida del equipo
 * - Actividad inicial en el CRM
 */

/**
 * Crea un lead de bienvenida completo para un nuevo usuario registrado (USER)
 * Nota: Este onboarding es para usuarios recién registrados, no para clientes asignados
 * 
 * @param {Object} userData - Datos del usuario recién registrado
 * @param {string} userData.clerkId - ID de Clerk del usuario
 * @param {string} userData.email - Email del usuario
 * @param {string} userData.firstName - Nombre del usuario
 * @param {string} userData.lastName - Apellido del usuario
 * @returns {Promise<Object>} Resultado del onboarding
 */
export const createWelcomeOnboarding = async (userData) => {
  try {
    const { clerkId, email, firstName, lastName } = userData;
    const fullName = `${firstName} ${lastName}`.trim();

    logger.info('🎉 Iniciando onboarding automático para nuevo cliente', {
      clerkId,
      email,
      fullName
    });

    // 1. CREAR LEAD DE BIENVENIDA
    const welcomeLead = await createWelcomeLead(userData);
    if (!welcomeLead.success) {
      throw new Error(`Error creando lead de bienvenida: ${welcomeLead.error}`);
    }

    // 2. ENVIAR MENSAJE DE BIENVENIDA
    const welcomeMessage = await sendWelcomeMessage(welcomeLead.lead, userData);
    if (!welcomeMessage.success) {
      logger.warn('Error enviando mensaje de bienvenida (no crítico)', {
        error: welcomeMessage.error,
        leadId: welcomeLead.lead._id.toString()
      });
    }

    // 3. CREAR ACTIVIDAD DE ONBOARDING
    await welcomeLead.lead.agregarActividad(
      'nota',
      '🎉 ¡Bienvenido a SCUTI Company! Hemos iniciado tu proceso de onboarding automático. Pronto nos pondremos en contacto contigo.',
      {
        id: 'system',
        fullName: 'Sistema de Onboarding',
        email: 'system@scuticompany.com'
      }
    );

    const result = {
      success: true,
      message: 'Onboarding automático completado exitosamente',
      onboarding: {
        leadCreated: welcomeLead.success,
        messagesSent: welcomeMessage.success ? 1 : 0,
        leadId: welcomeLead.lead._id.toString(),
        leadName: welcomeLead.lead.nombre
      }
    };

    logger.success('🎉 Onboarding automático completado', {
      userEmail: email,
      leadId: welcomeLead.lead._id.toString(),
      messagesCreated: welcomeMessage.success ? 1 : 0
    });

    return result;

  } catch (error) {
    logger.error('❌ Error en onboarding automático', {
      error: error.message,
      stack: error.stack,
      userData: {
        clerkId: userData.clerkId,
        email: userData.email
      }
    });

    return {
      success: false,
      message: 'Error en onboarding automático',
      error: error.message
    };
  }
};

/**
 * Crea un lead específico de bienvenida para el nuevo usuario
 */
async function createWelcomeLead(userData) {
  try {
    const { clerkId, email, firstName, lastName } = userData;
    const fullName = `${firstName} ${lastName}`.trim();

    const welcomeLead = new Lead({
      nombre: fullName,
      email: email,
      correo: email,
      telefono: 'Por completar', // Placeholder temporal
      celular: 'Por completar', // Placeholder temporal
      empresa: 'Por completar', // Placeholder temporal
      tipoServicio: 'consultoria',
      descripcionProyecto: 'Proceso de onboarding - Nuevo usuario registrado en la plataforma. Bienvenida y configuración inicial. Pendiente de calificación por equipo interno.',
      estado: 'nuevo',
      prioridad: 'alta', // Alta prioridad para nuevos registros
      origen: 'web',
      
      // Vinculación automática con el usuario
      usuarioRegistrado: {
        userId: clerkId,
        nombre: fullName,
        email: email,
        vinculadoEn: new Date(),
        vinculadoPor: {
          userId: 'system',
          nombre: 'Sistema de Onboarding Automático'
        }
      },
      
      // Creado por el sistema
      creadoPor: {
        userId: 'system',
        nombre: 'Sistema de Onboarding'
      },
      
      // Actividad inicial
      actividades: [{
        fecha: new Date(),
        tipo: 'nota',
        descripcion: `🎉 Nuevo usuario registrado: ${fullName} (${email}). Iniciando proceso de onboarding automático. Pendiente de calificación por equipo interno.`,
        usuarioId: 'system',
        usuarioNombre: 'Sistema de Onboarding',
        esPrivado: false,
        direccion: 'interno'
      }]
    });

    await welcomeLead.save();

    logger.success('✅ Lead de bienvenida creado', {
      leadId: welcomeLead._id.toString(),
      leadName: welcomeLead.nombre,
      userEmail: email
    });

    return {
      success: true,
      lead: welcomeLead
    };

  } catch (error) {
    logger.error('❌ Error creando lead de bienvenida', {
      error: error.message,
      userData: {
        clerkId: userData.clerkId,
        email: userData.email
      }
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Envía un mensaje de bienvenida automático al nuevo cliente
 */
async function sendWelcomeMessage(lead, userData) {
  try {
    const { firstName } = userData;
    const leadId = lead._id;

    // Obtener usuario administrador para enviar el mensaje
    const adminUser = await User.findOne({ role: 'SUPER_ADMIN' }).sort({ createdAt: 1 });
    if (!adminUser) {
      throw new Error('No se encontró usuario administrador para enviar mensaje de bienvenida');
    }

    const welcomeMessageContent = `¡Hola ${firstName}! 🎉

¡Bienvenido/a a SCUTI Company! Estamos emocionados de tenerte como parte de nuestra comunidad.

Tu cuenta ha sido creada exitosamente y ya puedes acceder a todas las funcionalidades de nuestro portal cliente:

✅ **Panel de Control Personal**: Accede a tu dashboard personalizado
✅ **Gestión de Proyectos**: Ve el estado de tus solicitudes y proyectos
✅ **Mensajería Directa**: Comunícate directamente con nuestro equipo
✅ **Seguimiento en Tiempo Real**: Mantente informado del progreso

**¿Qué sigue?**
1. Explora tu panel de control
2. Completa tu perfil con información adicional
3. No dudes en escribirnos si tienes alguna pregunta

Nuestro equipo estará encantado de ayudarte en lo que necesites. 

¡Gracias por confiar en nosotros para tu próximo proyecto!

---
El equipo de SCUTI Company 🚀`;

    const welcomeMessage = new LeadMessage({
      leadId: leadId,
      tipo: 'mensaje_cliente',
      autor: {
        userId: adminUser.clerkId,
        nombre: `${adminUser.firstName} ${adminUser.lastName}`.trim(),
        email: adminUser.email,
        rol: adminUser.role || 'SUPER_ADMIN'
      },
      destinatario: {
        userId: userData.clerkId,
        nombre: `${userData.firstName} ${userData.lastName}`.trim(),
        email: userData.email,
        rol: 'USER' // Usuario registrado, no cliente asignado
      },
      contenido: welcomeMessageContent,
      asunto: '¡Bienvenido/a a SCUTI Company! 🎉',
      prioridad: 'alta',
      esPrivado: false,
      etiquetas: ['bienvenida', 'onboarding', 'automatico'],
      
      // Estado del mensaje
      estadoMensaje: 'enviado',
      fechaEnvio: new Date(),
      leido: false,
      
      // Metadata
      metadata: {
        tipoOnboarding: 'bienvenida_automatica',
        version: '1.0',
        sistemaAutomatico: true
      }
    });

    await welcomeMessage.save();

    // Agregar actividad al lead
    await lead.agregarActividad(
      'mensaje_cliente',
      `Mensaje de bienvenida enviado automáticamente a ${userData.firstName}`,
      {
        id: adminUser.clerkId,
        fullName: `${adminUser.firstName} ${adminUser.lastName}`.trim(),
        email: adminUser.email
      }
    );

    logger.success('💬 Mensaje de bienvenida enviado', {
      messageId: welcomeMessage._id.toString(),
      leadId: leadId.toString(),
      userEmail: userData.email
    });

    return {
      success: true,
      message: welcomeMessage
    };

  } catch (error) {
    logger.error('❌ Error enviando mensaje de bienvenida', {
      error: error.message,
      leadId: lead._id.toString(),
      userData: {
        clerkId: userData.clerkId,
        email: userData.email
      }
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Crea mensajes de seguimiento automático (opcional, para usar después)
 */
export const createFollowUpMessages = async (leadId, userData) => {
  try {
    // Programar mensajes de seguimiento para el futuro
    // Por ejemplo: mensaje a los 3 días, semana, etc.
    
    logger.info('📅 Sistema de seguimiento automático inicializado', {
      leadId: leadId.toString(),
      userEmail: userData.email
    });

    return {
      success: true,
      message: 'Sistema de seguimiento configurado'
    };

  } catch (error) {
    logger.error('❌ Error configurando seguimiento automático', {
      error: error.message,
      leadId
    });

    return {
      success: false,
      error: error.message
    };
  }
};