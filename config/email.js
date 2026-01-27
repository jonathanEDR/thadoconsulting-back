// ============================================
// Configuración de Email con Resend
// ============================================

import { Resend } from 'resend';

// Inicializar cliente de Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================
// CONFIGURACIÓN GENERAL
// ============================================

const emailConfig = {
  from: process.env.EMAIL_FROM || 'THADO Consulting <noreply@thadoconsulting.pe>',
  replyTo: process.env.EMAIL_REPLY_TO || 'contacto@thadoconsulting.pe',
  
  // URLs del sistema
  appUrl: process.env.APP_URL || 'https://www.thadoconsulting.com',
  portalUrl: process.env.PORTAL_URL || 'https://www.thadoconsulting.com',
  
  // Configuración de emails
  maxRetries: 3,
  timeout: 30000, // 30 segundos
};

// ============================================
// PLANTILLAS HTML DE EMAIL
// ============================================

/**
 * Layout base para todos los emails
 */
const emailLayout = (content, preheader = '') => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>THADO Consulting</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666666;
      border-top: 1px solid #e0e0e0;
    }
    .message-box {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box {
      background-color: #e3f2fd;
      border: 1px solid #90caf9;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .preheader {
      display: none;
      max-width: 0;
      max-height: 0;
      overflow: hidden;
      font-size: 1px;
      line-height: 1px;
      color: #ffffff;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 20px !important;
      }
    }
  </style>
</head>
<body>
  <span class="preheader">${preheader}</span>
  <div class="container">
    <div class="header">
      <h1>� THADO Consulting</h1>
    </div>
    ${content}
    <div class="footer">
      <p>© ${new Date().getFullYear()} THADO Consulting. Todos los derechos reservados.</p>
      <p>
        <a href="${emailConfig.appUrl}" style="color: #667eea; text-decoration: none;">Sitio Web</a> | 
        <a href="${emailConfig.portalUrl}" style="color: #667eea; text-decoration: none;">Portal Cliente</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Plantilla: Nuevo mensaje del equipo
 */
const plantillaMensajeEquipo = (datos) => {
  const { 
    nombreCliente, 
    asunto, 
    contenido, 
    nombreRemitente,
    leadId,
    mensajeId 
  } = datos;

  const urlMensaje = `${emailConfig.portalUrl}/mis-leads/${leadId}?mensaje=${mensajeId}`;

  const content = `
    <div class="content">
      <h2 style="margin-top: 0; color: #333;">Tienes un nuevo mensaje</h2>
      <p>Hola <strong>${nombreCliente}</strong>,</p>
      <p><strong>${nombreRemitente}</strong> te ha enviado un mensaje:</p>
      
      <div class="message-box">
        <h3 style="margin-top: 0; color: #667eea;">${asunto}</h3>
        <p style="margin-bottom: 0; white-space: pre-wrap;">${contenido}</p>
      </div>

      <p>Puedes responder directamente desde nuestro portal:</p>
      
      <center>
        <a href="${urlMensaje}" class="button">Ver y Responder Mensaje</a>
      </center>

      <div class="info-box">
        <p style="margin: 0;"><strong>💡 Tip:</strong> Todas las conversaciones relacionadas con tu proyecto se encuentran en tu portal personal.</p>
      </div>
    </div>
  `;

  return emailLayout(content, `Nuevo mensaje de ${nombreRemitente}`);
};

/**
 * Plantilla: Respuesta del cliente recibida
 */
const plantillaRespuestaCliente = (datos) => {
  const { 
    nombreCliente, 
    contenido, 
    leadId,
    mensajeId,
    nombreDestinatario 
  } = datos;

  const urlMensaje = `${emailConfig.appUrl}/crm/leads/${leadId}?mensaje=${mensajeId}`;

  const content = `
    <div class="content">
      <h2 style="margin-top: 0; color: #333;">Nueva respuesta del cliente</h2>
      <p>Hola <strong>${nombreDestinatario}</strong>,</p>
      <p><strong>${nombreCliente}</strong> ha respondido a tu mensaje:</p>
      
      <div class="message-box">
        <p style="margin: 0; white-space: pre-wrap;">${contenido}</p>
      </div>

      <center>
        <a href="${urlMensaje}" class="button">Ver Conversación Completa</a>
      </center>

      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Este es un correo de notificación automática del sistema CRM.
      </p>
    </div>
  `;

  return emailLayout(content, `Respuesta de ${nombreCliente}`);
};

/**
 * Plantilla: Lead asignado
 */
const plantillaLeadAsignado = (datos) => {
  const { 
    nombreAgente, 
    nombreLead,
    emailLead,
    telefonoLead,
    leadId 
  } = datos;

  const urlLead = `${emailConfig.appUrl}/crm/leads/${leadId}`;

  const content = `
    <div class="content">
      <h2 style="margin-top: 0; color: #333;">Nuevo lead asignado</h2>
      <p>Hola <strong>${nombreAgente}</strong>,</p>
      <p>Se te ha asignado un nuevo lead para seguimiento:</p>
      
      <div class="info-box">
        <p style="margin: 5px 0;"><strong>📝 Nombre:</strong> ${nombreLead}</p>
        <p style="margin: 5px 0;"><strong>📧 Email:</strong> ${emailLead}</p>
        ${telefonoLead ? `<p style="margin: 5px 0;"><strong>📱 Teléfono:</strong> ${telefonoLead}</p>` : ''}
      </div>

      <center>
        <a href="${urlLead}" class="button">Ver Lead Completo</a>
      </center>

      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Recuerda hacer el primer contacto dentro de las próximas 24 horas.
      </p>
    </div>
  `;

  return emailLayout(content, `Nuevo lead asignado: ${nombreLead}`);
};

/**
 * Plantilla: Mensaje con adjuntos
 */
const plantillaMensajeConAdjuntos = (datos) => {
  const { 
    nombreCliente, 
    asunto, 
    contenido, 
    nombreRemitente,
    adjuntos,
    leadId,
    mensajeId 
  } = datos;

  const urlMensaje = `${emailConfig.portalUrl}/mis-leads/${leadId}?mensaje=${mensajeId}`;

  const adjuntosHtml = adjuntos.map(adj => `
    <div style="padding: 10px; background: white; border-radius: 4px; margin: 5px 0;">
      <span style="margin-right: 10px;">📎</span>
      <strong>${adj.nombre}</strong>
      <span style="color: #666; font-size: 12px;">(${formatFileSize(adj.tamaño)})</span>
    </div>
  `).join('');

  const content = `
    <div class="content">
      <h2 style="margin-top: 0; color: #333;">Tienes un nuevo mensaje con archivos adjuntos</h2>
      <p>Hola <strong>${nombreCliente}</strong>,</p>
      <p><strong>${nombreRemitente}</strong> te ha enviado un mensaje con ${adjuntos.length} archivo(s) adjunto(s):</p>
      
      <div class="message-box">
        <h3 style="margin-top: 0; color: #667eea;">${asunto}</h3>
        <p style="white-space: pre-wrap;">${contenido}</p>
        
        <div style="margin-top: 20px;">
          <p style="margin-bottom: 10px;"><strong>📎 Archivos adjuntos:</strong></p>
          ${adjuntosHtml}
        </div>
      </div>

      <center>
        <a href="${urlMensaje}" class="button">Ver Mensaje y Descargar Archivos</a>
      </center>

      <div class="info-box">
        <p style="margin: 0;"><strong>🔒 Nota:</strong> Los archivos están seguros en nuestro portal. Inicia sesión para descargarlos.</p>
      </div>
    </div>
  `;

  return emailLayout(content, `Nuevo mensaje con archivos de ${nombreRemitente}`);
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Formatea el tamaño de archivo
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ============================================
// EXPORTACIONES
// ============================================

export {
  resend,
  emailConfig,
};

export const plantillas = {
  mensajeEquipo: plantillaMensajeEquipo,
  respuestaCliente: plantillaRespuestaCliente,
  leadAsignado: plantillaLeadAsignado,
  mensajeConAdjuntos: plantillaMensajeConAdjuntos,
};
