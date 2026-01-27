/**
 * Sistema de Notificaciones para Comentarios
 * Gestiona notificaciones por email y en-app para eventos de comentarios
 */

// Importación dinámica para evitar cargar emailService si no se usa
let emailService = null;
const getEmailService = async () => {
  if (!emailService) {
    emailService = await import('./emailService.js');
  }
  return emailService;
};

// Función helper para enviar emails
const sendEmail = async (options) => {
  try {
    const service = await getEmailService();
    return await service.enviarEmailGenerico(options);
  } catch (error) {
    console.error('Email service not configured or error sending email:', error.message);
    return { sent: false, error: error.message };
  }
};

// ========================================
// PLANTILLAS DE EMAIL
// ========================================

/**
 * Genera HTML para email de nuevo comentario al autor del post
 */
const generateNewCommentEmail = (post, comment) => {
  return {
    subject: `Nuevo comentario en tu post: ${post.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .comment { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4F46E5; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          .meta { color: #6b7280; font-size: 14px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>💬 Nuevo Comentario</h2>
          </div>
          <div class="content">
            <p>Hola,</p>
            <p>Has recibido un nuevo comentario en tu post <strong>"${post.title}"</strong>:</p>
            
            <div class="comment">
              <div class="meta">
                <strong>${comment.author.name}</strong>
                ${comment.author.email ? `(${comment.author.email})` : ''}
                - ${new Date(comment.createdAt).toLocaleString('es-ES')}
              </div>
              <p>${comment.content}</p>
            </div>

            <a href="${process.env.FRONTEND_URL}/blog/${post.slug}#comment-${comment._id}" class="button">
              Ver comentario
            </a>

            <p class="meta">
              Si este comentario es inapropiado, puedes reportarlo o moderarlo desde el panel de administración.
            </p>
          </div>
          <div class="footer">
            <p>Este es un email automático de Web Scuti CMS</p>
            <p>Para dejar de recibir estas notificaciones, actualiza tus preferencias en tu perfil</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Nuevo comentario en tu post: ${post.title}

${comment.author.name} comentó:
${comment.content}

Ver en: ${process.env.FRONTEND_URL}/blog/${post.slug}#comment-${comment._id}
    `
  };
};

/**
 * Genera HTML para email de respuesta a comentario
 */
const generateReplyEmail = (originalComment, reply, post) => {
  return {
    subject: `${reply.author.name} respondió a tu comentario`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .comment { background: white; padding: 15px; margin: 15px 0; }
          .original { border-left: 4px solid #d1d5db; }
          .reply { border-left: 4px solid #10B981; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .button { display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          .meta { color: #6b7280; font-size: 14px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>↩️ Nueva Respuesta</h2>
          </div>
          <div class="content">
            <p>Hola ${originalComment.author.name},</p>
            <p><strong>${reply.author.name}</strong> respondió a tu comentario en <strong>"${post.title}"</strong>:</p>
            
            <div class="comment original">
              <div class="meta">Tu comentario:</div>
              <p>${originalComment.content.substring(0, 150)}${originalComment.content.length > 150 ? '...' : ''}</p>
            </div>

            <div class="comment reply">
              <div class="meta">
                <strong>${reply.author.name}</strong> - ${new Date(reply.createdAt).toLocaleString('es-ES')}
              </div>
              <p>${reply.content}</p>
            </div>

            <a href="${process.env.FRONTEND_URL}/blog/${post.slug}#comment-${reply._id}" class="button">
              Ver respuesta
            </a>
          </div>
          <div class="footer">
            <p>Este es un email automático de Web Scuti CMS</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
${reply.author.name} respondió a tu comentario

Tu comentario:
${originalComment.content.substring(0, 150)}...

Respuesta:
${reply.content}

Ver en: ${process.env.FRONTEND_URL}/blog/${post.slug}#comment-${reply._id}
    `
  };
};

/**
 * Genera email para moderador sobre comentario pendiente
 */
const generateModerationNeededEmail = (comment, post, analysis) => {
  const flagsHtml = analysis.flags.map(flag => `
    <li>
      <strong>${flag.type}</strong> (${flag.severity}): ${flag.reason}
      <br><small>Confianza: ${(flag.confidence * 100).toFixed(0)}%</small>
    </li>
  `).join('');

  return {
    subject: `⚠️ Comentario requiere moderación - Score: ${analysis.score}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F59E0B; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .comment { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #F59E0B; }
          .score { font-size: 24px; font-weight: bold; margin: 10px 0; }
          .score.low { color: #EF4444; }
          .score.medium { color: #F59E0B; }
          .score.high { color: #10B981; }
          .flags { background: #FEF3C7; padding: 15px; margin: 15px 0; border-radius: 6px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; }
          .button.approve { background: #10B981; }
          .button.reject { background: #EF4444; }
          .meta { color: #6b7280; font-size: 14px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>⚠️ Moderación Requerida</h2>
          </div>
          <div class="content">
            <p>Un nuevo comentario requiere revisión manual:</p>

            <div class="score ${analysis.score < 50 ? 'low' : analysis.score < 70 ? 'medium' : 'high'}">
              Score de Moderación: ${analysis.score}/100
            </div>
            
            <div class="comment">
              <div class="meta">
                <strong>Post:</strong> ${post.title}<br>
                <strong>Autor:</strong> ${comment.author.name} (${comment.author.email})<br>
                <strong>Fecha:</strong> ${new Date(comment.createdAt).toLocaleString('es-ES')}<br>
                <strong>IP:</strong> ${comment.metadata?.ipAddress || 'N/A'}
              </div>
              <p><strong>Comentario:</strong></p>
              <p>${comment.content}</p>
            </div>

            ${analysis.flags.length > 0 ? `
            <div class="flags">
              <strong>⚠️ Alertas detectadas:</strong>
              <ul>${flagsHtml}</ul>
            </div>
            ` : ''}

            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/admin/comments/moderation" class="button approve">
                ✓ Aprobar
              </a>
              <a href="${process.env.FRONTEND_URL}/admin/comments/moderation" class="button reject">
                ✗ Rechazar
              </a>
              <a href="${process.env.FRONTEND_URL}/admin/comments/moderation" class="button">
                📋 Ver en panel
              </a>
            </div>

            <p class="meta">
              <strong>Recomendación automática:</strong> ${analysis.autoAction}
            </p>
          </div>
          <div class="footer">
            <p>Sistema de Moderación Automática - Web Scuti CMS</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
⚠️ MODERACIÓN REQUERIDA

Score: ${analysis.score}/100

Post: ${post.title}
Autor: ${comment.author.name} (${comment.author.email})
Fecha: ${new Date(comment.createdAt).toLocaleString('es-ES')}

Comentario:
${comment.content}

Alertas: ${analysis.flags.map(f => `${f.type} (${f.severity})`).join(', ')}

Moderar en: ${process.env.FRONTEND_URL}/admin/comments/moderation
    `
  };
};

/**
 * Genera email de comentario aprobado
 */
const generateCommentApprovedEmail = (comment, post) => {
  return {
    subject: `✓ Tu comentario fue aprobado`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .comment { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #10B981; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .button { display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>✓ Comentario Aprobado</h2>
          </div>
          <div class="content">
            <p>Hola ${comment.author.name},</p>
            <p>Tu comentario en <strong>"${post.title}"</strong> ha sido aprobado y ya es visible:</p>
            
            <div class="comment">
              <p>${comment.content}</p>
            </div>

            <a href="${process.env.FRONTEND_URL}/blog/${post.slug}#comment-${comment._id}" class="button">
              Ver tu comentario
            </a>

            <p>¡Gracias por participar en nuestra comunidad!</p>
          </div>
          <div class="footer">
            <p>Web Scuti CMS</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
✓ Comentario Aprobado

Hola ${comment.author.name},

Tu comentario en "${post.title}" ha sido aprobado.

Ver en: ${process.env.FRONTEND_URL}/blog/${post.slug}#comment-${comment._id}
    `
  };
};

/**
 * Genera email de comentario rechazado
 */
const generateCommentRejectedEmail = (comment, post, reason) => {
  return {
    subject: `Tu comentario requiere revisión`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #EF4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .comment { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #EF4444; }
          .reason { background: #FEE2E2; padding: 15px; margin: 15px 0; border-radius: 6px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>⚠️ Comentario No Publicado</h2>
          </div>
          <div class="content">
            <p>Hola ${comment.author.name},</p>
            <p>Tu comentario en <strong>"${post.title}"</strong> no pudo ser publicado:</p>
            
            <div class="comment">
              <p>${comment.content}</p>
            </div>

            ${reason ? `
            <div class="reason">
              <strong>Motivo:</strong> ${reason}
            </div>
            ` : ''}

            <p>Si crees que esto es un error, por favor contáctanos.</p>
          </div>
          <div class="footer">
            <p>Web Scuti CMS</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
⚠️ Comentario No Publicado

Hola ${comment.author.name},

Tu comentario en "${post.title}" no pudo ser publicado.

${reason ? `Motivo: ${reason}` : ''}

Si crees que esto es un error, por favor contáctanos.
    `
  };
};

// ========================================
// FUNCIONES DE NOTIFICACIÓN
// ========================================

// Verificar si las notificaciones están habilitadas
const NOTIFICATIONS_ENABLED = process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true';

/**
 * Notifica al autor del post sobre un nuevo comentario
 */
const notifyPostAuthor = async (comment, post) => {
  try {
    // Si las notificaciones están deshabilitadas
    if (!NOTIFICATIONS_ENABLED) {
      return { sent: false, reason: 'Notifications disabled' };
    }

    // Si el autor del post es el mismo que el del comentario, no notificar
    if (post.author.userId && comment.author.userId && 
        post.author.userId.toString() === comment.author.userId.toString()) {
      return { sent: false, reason: 'Self-comment' };
    }

    const emailData = generateNewCommentEmail(post, comment);
    
    // Enviar a email del autor del post
    const authorEmail = post.author.email || post.author.userId?.email;
    if (!authorEmail) {
      return { sent: false, reason: 'No author email' };
    }

    await sendEmail({
      to: authorEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text
    });

    return { sent: true, to: authorEmail };
  } catch (error) {
    console.error('Error notifying post author:', error);
    return { sent: false, error: error.message };
  }
};

/**
 * Notifica al autor del comentario original sobre una respuesta
 */
const notifyCommentAuthor = async (originalComment, reply, post) => {
  try {
    // Si las notificaciones están deshabilitadas
    if (!NOTIFICATIONS_ENABLED) {
      return { sent: false, reason: 'Notifications disabled' };
    }

    // Si el autor de la respuesta es el mismo que el del comentario original, no notificar
    if (originalComment.author.email === reply.author.email) {
      return { sent: false, reason: 'Self-reply' };
    }

    const emailData = generateReplyEmail(originalComment, reply, post);
    
    await sendEmail({
      to: originalComment.author.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text
    });

    return { sent: true, to: originalComment.author.email };
  } catch (error) {
    console.error('Error notifying comment author:', error);
    return { sent: false, error: error.message };
  }
};

/**
 * Notifica a moderadores sobre comentarios que requieren revisión
 */
const notifyModerators = async (comment, post, analysis) => {
  try {
    // Si las notificaciones están deshabilitadas
    if (!NOTIFICATIONS_ENABLED) {
      return { sent: false, reason: 'Notifications disabled' };
    }

    const { default: User } = await import('../models/User.js');
    
    // Obtener moderadores (usuarios con permisos de moderación)
    const moderators = await User.find({
      permissions: { $in: ['moderate_comments', 'manage_all'] }
    }).select('email');

    if (moderators.length === 0) {
      return { sent: false, reason: 'No moderators found' };
    }

    const emailData = generateModerationNeededEmail(comment, post, analysis);
    
    // Enviar a todos los moderadores
    const results = await Promise.allSettled(
      moderators.map(mod => 
        sendEmail({
          to: mod.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;

    return { 
      sent: sent > 0, 
      count: sent,
      total: moderators.length 
    };
  } catch (error) {
    console.error('Error notifying moderators:', error);
    return { sent: false, error: error.message };
  }
};

/**
 * Notifica al autor cuando su comentario es aprobado
 */
const notifyCommentApproved = async (comment, post) => {
  try {
    // Si las notificaciones están deshabilitadas
    if (!NOTIFICATIONS_ENABLED) {
      return { sent: false, reason: 'Notifications disabled' };
    }

    // Solo notificar si el comentario estuvo pendiente
    if (comment.status !== 'approved') {
      return { sent: false, reason: 'Not approved' };
    }

    const emailData = generateCommentApprovedEmail(comment, post);
    
    await sendEmail({
      to: comment.author.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text
    });

    return { sent: true, to: comment.author.email };
  } catch (error) {
    console.error('Error notifying comment approval:', error);
    return { sent: false, error: error.message };
  }
};

/**
 * Notifica al autor cuando su comentario es rechazado
 */
const notifyCommentRejected = async (comment, post, reason) => {
  try {
    // Si las notificaciones están deshabilitadas
    if (!NOTIFICATIONS_ENABLED) {
      return { sent: false, reason: 'Notifications disabled' };
    }

    const emailData = generateCommentRejectedEmail(comment, post, reason);
    
    await sendEmail({
      to: comment.author.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text
    });

    return { sent: true, to: comment.author.email };
  } catch (error) {
    console.error('Error notifying comment rejection:', error);
    return { sent: false, error: error.message };
  }
};

/**
 * Handler principal para notificaciones de comentarios
 */
const handleCommentNotifications = async (event, data) => {
  const { comment, post, analysis, originalComment, reason } = data;

  switch (event) {
    case 'comment.created':
      // Notificar al autor del post
      await notifyPostAuthor(comment, post);
      
      // Si es una respuesta, notificar al autor del comentario original
      if (comment.parentComment && originalComment) {
        await notifyCommentAuthor(originalComment, comment, post);
      }
      
      // Si requiere moderación, notificar a moderadores
      if (comment.status === 'pending' && analysis) {
        await notifyModerators(comment, post, analysis);
      }
      break;

    case 'comment.approved':
      await notifyCommentApproved(comment, post);
      break;

    case 'comment.rejected':
      await notifyCommentRejected(comment, post, reason);
      break;

    case 'comment.moderation_needed':
      await notifyModerators(comment, post, analysis);
      break;

    default:
      console.warn(`Unknown notification event: ${event}`);
  }
};

// ========================================
// EXPORT
// ========================================

export {
  notifyPostAuthor,
  notifyCommentAuthor,
  notifyModerators,
  notifyCommentApproved,
  notifyCommentRejected,
  handleCommentNotifications
};

export const generators = {
  generateNewCommentEmail,
  generateReplyEmail,
  generateModerationNeededEmail,
  generateCommentApprovedEmail,
  generateCommentRejectedEmail
};
