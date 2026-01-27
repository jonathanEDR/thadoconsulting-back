// ============================================
// Servicio de Envío de Emails
// ============================================

import { resend, emailConfig, plantillas } from '../config/email.js';
import logger from './logger.js';

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Envía email cuando el equipo envía un mensaje al cliente
 * @param {Object} datos - Datos del mensaje
 * @param {string} datos.nombreCliente - Nombre del cliente
 * @param {string} datos.emailCliente - Email del cliente
 * @param {string} datos.asunto - Asunto del mensaje
 * @param {string} datos.contenido - Contenido del mensaje
 * @param {string} datos.nombreRemitente - Nombre del remitente
 * @param {string} datos.leadId - ID del lead
 * @param {string} datos.mensajeId - ID del mensaje
 * @param {Array} datos.adjuntos - Archivos adjuntos (opcional)
 * @returns {Promise<Object>} Resultado del envío
 */
async function enviarEmailMensajeCliente(datos) {
  try {
    logger.info(`📧 Enviando email a cliente: ${datos.emailCliente}`);

    // Validar datos requeridos
    if (!datos.emailCliente || !datos.nombreCliente) {
      throw new Error('Email y nombre del cliente son requeridos');
    }

    // Determinar qué plantilla usar
    const html = datos.adjuntos && datos.adjuntos.length > 0
      ? plantillas.mensajeConAdjuntos(datos)
      : plantillas.mensajeEquipo(datos);

    // Enviar email
    const resultado = await resend.emails.send({
      from: emailConfig.from,
      to: datos.emailCliente,
      replyTo: emailConfig.replyTo,
      subject: datos.asunto || 'Nuevo mensaje de Scuti Company',
      html: html,
      // Tags para tracking
      tags: [
        { name: 'tipo', value: 'mensaje_cliente' },
        { name: 'leadId', value: datos.leadId },
      ],
    });

    logger.info(`✅ Email enviado exitosamente - ID: ${resultado.id}`);

    return {
      success: true,
      emailId: resultado.id,
      mensaje: 'Email enviado exitosamente'
    };

  } catch (error) {
    logger.error('❌ Error al enviar email a cliente:', error);
    
    // No fallar la operación si el email falla
    return {
      success: false,
      error: error.message,
      mensaje: 'Mensaje guardado pero email no pudo ser enviado'
    };
  }
}

/**
 * Notifica al equipo cuando un cliente responde
 * @param {Object} datos - Datos de la respuesta
 * @param {string} datos.nombreCliente - Nombre del cliente
 * @param {string} datos.emailDestinatario - Email del miembro del equipo
 * @param {string} datos.nombreDestinatario - Nombre del miembro del equipo
 * @param {string} datos.contenido - Contenido de la respuesta
 * @param {string} datos.leadId - ID del lead
 * @param {string} datos.mensajeId - ID del mensaje
 * @returns {Promise<Object>} Resultado del envío
 */
async function enviarEmailRespuestaCliente(datos) {
  try {
    logger.info(`📧 Notificando respuesta de cliente a: ${datos.emailDestinatario}`);

    if (!datos.emailDestinatario) {
      throw new Error('Email del destinatario es requerido');
    }

    const html = plantillas.respuestaCliente(datos);

    const resultado = await resend.emails.send({
      from: emailConfig.from,
      to: datos.emailDestinatario,
      replyTo: emailConfig.replyTo,
      subject: `Respuesta de ${datos.nombreCliente}`,
      html: html,
      tags: [
        { name: 'tipo', value: 'respuesta_cliente' },
        { name: 'leadId', value: datos.leadId },
      ],
    });

    logger.info(`✅ Notificación enviada - ID: ${resultado.id}`);

    return {
      success: true,
      emailId: resultado.id
    };

  } catch (error) {
    logger.error('❌ Error al notificar respuesta:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Notifica cuando se asigna un lead a un agente
 * @param {Object} datos - Datos del lead asignado
 * @param {string} datos.nombreAgente - Nombre del agente
 * @param {string} datos.emailAgente - Email del agente
 * @param {string} datos.nombreLead - Nombre del lead
 * @param {string} datos.emailLead - Email del lead
 * @param {string} datos.telefonoLead - Teléfono del lead (opcional)
 * @param {string} datos.leadId - ID del lead
 * @returns {Promise<Object>} Resultado del envío
 */
async function enviarEmailLeadAsignado(datos) {
  try {
    logger.info(`📧 Notificando asignación de lead a: ${datos.emailAgente}`);

    if (!datos.emailAgente) {
      throw new Error('Email del agente es requerido');
    }

    const html = plantillas.leadAsignado(datos);

    const resultado = await resend.emails.send({
      from: emailConfig.from,
      to: datos.emailAgente,
      replyTo: emailConfig.replyTo,
      subject: `Nuevo lead asignado: ${datos.nombreLead}`,
      html: html,
      tags: [
        { name: 'tipo', value: 'lead_asignado' },
        { name: 'leadId', value: datos.leadId },
      ],
    });

    logger.info(`✅ Notificación de asignación enviada - ID: ${resultado.id}`);

    return {
      success: true,
      emailId: resultado.id
    };

  } catch (error) {
    logger.error('❌ Error al notificar asignación:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Envía email genérico personalizado
 * @param {Object} datos - Datos del email
 * @param {string} datos.to - Email destinatario
 * @param {string} datos.subject - Asunto
 * @param {string} datos.html - Contenido HTML
 * @param {Array} datos.tags - Tags para tracking (opcional)
 * @returns {Promise<Object>} Resultado del envío
 */
async function enviarEmailGenerico(datos) {
  try {
    logger.info(`📧 Enviando email genérico a: ${datos.to}`);

    const resultado = await resend.emails.send({
      from: emailConfig.from,
      to: datos.to,
      replyTo: datos.replyTo || emailConfig.replyTo,
      subject: datos.subject,
      html: datos.html,
      tags: datos.tags || [],
    });

    logger.info(`✅ Email genérico enviado - ID: ${resultado.id}`);

    return {
      success: true,
      emailId: resultado.id
    };

  } catch (error) {
    logger.error('❌ Error al enviar email genérico:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Envía email de bienvenida a nuevo lead registrado
 * @param {Object} datos - Datos del nuevo lead
 * @param {string} datos.nombreCliente - Nombre del cliente
 * @param {string} datos.emailCliente - Email del cliente
 * @param {string} datos.portalUrl - URL del portal (opcional)
 * @returns {Promise<Object>} Resultado del envío
 */
async function enviarEmailBienvenida(datos) {
  try {
    logger.info(`📧 Enviando email de bienvenida a: ${datos.emailCliente}`);

    const portalUrl = datos.portalUrl || emailConfig.portalUrl;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; }
          .button { display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 ¡Bienvenido a Scuti Company!</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${datos.nombreCliente}</strong>,</p>
            <p>¡Gracias por contactarnos! Hemos recibido tu solicitud y estamos emocionados de poder ayudarte.</p>
            <p>Nuestro equipo revisará tu información y se pondrá en contacto contigo muy pronto. Mientras tanto, puedes:</p>
            <ul>
              <li>Acceder a tu portal personal</li>
              <li>Ver el estado de tu solicitud</li>
              <li>Comunicarte directamente con nosotros</li>
            </ul>
            <center>
              <a href="${portalUrl}" class="button">Acceder al Portal</a>
            </center>
            <p style="margin-top: 30px; color: #666;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Scuti Company. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const resultado = await resend.emails.send({
      from: emailConfig.from,
      to: datos.emailCliente,
      replyTo: emailConfig.replyTo,
      subject: '¡Bienvenido a Scuti Company! 🚀',
      html: html,
      tags: [
        { name: 'tipo', value: 'bienvenida' },
      ],
    });

    logger.info(`✅ Email de bienvenida enviado - ID: ${resultado.id}`);

    return {
      success: true,
      emailId: resultado.id
    };

  } catch (error) {
    logger.error('❌ Error al enviar email de bienvenida:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verifica si el servicio de email está configurado
 * @returns {boolean} True si está configurado
 */
function emailConfigurado() {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Obtiene el estado del servicio de email
 * @returns {Object} Estado del servicio
 */
function getEstadoEmail() {
  return {
    configurado: emailConfigurado(),
    from: emailConfig.from,
    replyTo: emailConfig.replyTo,
    appUrl: emailConfig.appUrl,
    portalUrl: emailConfig.portalUrl,
  };
}

// ============================================
// EXPORTACIONES
// ============================================

export {
  enviarEmailMensajeCliente,
  enviarEmailRespuestaCliente,
  enviarEmailLeadAsignado,
  enviarEmailGenerico,
  enviarEmailBienvenida,
  emailConfigurado,
  getEstadoEmail,
};
