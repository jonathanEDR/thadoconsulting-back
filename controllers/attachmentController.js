// ============================================
// Controlador de Adjuntos
// ============================================

import cloudinary from '../config/cloudinary.js';
import LeadMessage from '../models/LeadMessage.js';
import Lead from '../models/Lead.js';
import { hasPermission } from '../utils/roleHelper.js';
import { VIEW_LEAD_MESSAGES, DELETE_LEAD_MESSAGES } from '../config/roles.js';
import logger from '../utils/logger.js';

// ============================================
// CONFIGURACIÓN
// ============================================

const ALLOWED_MIME_TYPES = [
  // Documentos
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  
  // Imágenes
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  
  // Archivos comprimidos
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  
  // Otros
  'application/json',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Obtiene el tipo de archivo legible
 */
function getTipoArchivo(mimetype) {
  if (mimetype.startsWith('image/')) return 'imagen';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.includes('pdf')) return 'pdf';
  if (mimetype.includes('word') || mimetype.includes('document')) return 'documento';
  if (mimetype.includes('excel') || mimetype.includes('sheet')) return 'hoja_calculo';
  if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'presentacion';
  if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('7z')) return 'comprimido';
  return 'otro';
}

/**
 * Formatea el tamaño del archivo
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Verifica acceso al lead
 */
async function verificarAccesoLead(leadId, userId, userRole) {
  const lead = await Lead.findById(leadId);
  
  if (!lead) {
    return { permitido: false, error: 'Lead no encontrado' };
  }

  // SUPER_ADMIN y ADMIN pueden ver cualquier lead
  if (userRole >= 4) {
    return { permitido: true, lead };
  }

  // MODERATOR solo puede ver leads asignados
  if (userRole === 3) {
    if (lead.asignadoA?.toString() === userId) {
      return { permitido: true, lead };
    }
    return { permitido: false, error: 'No tienes acceso a este lead' };
  }

  // CLIENT solo puede ver leads vinculados a su usuario
  if (userRole === 2) {
    if (lead.usuarioRegistrado?.userId === userId) {
      return { permitido: true, lead };
    }
    return { permitido: false, error: 'No tienes acceso a este lead' };
  }

  return { permitido: false, error: 'Sin permisos' };
}

// ============================================
// CONTROLADORES
// ============================================

/**
 * Subir archivo a Cloudinary y asociarlo a un mensaje
 * POST /api/crm/leads/:leadId/attachments
 */
export const uploadAttachment = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { userId, role, nombre: userName } = req.auth;

    // Verificar que se haya enviado un archivo
    if (!req.files || !req.files.archivo) {
      return res.status(400).json({
        success: false,
        message: 'No se ha enviado ningún archivo'
      });
    }

    const file = req.files.archivo;

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: `El archivo es muy grande. Tamaño máximo: ${formatFileSize(MAX_FILE_SIZE)}`
      });
    }

    // Validar tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de archivo no permitido'
      });
    }

    // Verificar acceso al lead
    const acceso = await verificarAccesoLead(leadId, userId, role);
    if (!acceso.permitido) {
      return res.status(403).json({
        success: false,
        message: acceso.error
      });
    }

    // Subir a Cloudinary
    logger.info(`📤 Subiendo archivo: ${file.name} (${formatFileSize(file.size)})`);

    const resultado = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: `leads/${leadId}/attachments`,
      resource_type: 'auto',
      public_id: `${Date.now()}_${file.name.split('.')[0]}`,
    });

    logger.info(`✅ Archivo subido exitosamente - Public ID: ${resultado.public_id}`);

    // Preparar datos del adjunto
    const adjunto = {
      nombre: file.name,
      url: resultado.secure_url,
      tipo: getTipoArchivo(file.mimetype),
      mimetype: file.mimetype,
      tamaño: file.size,
      cloudinaryId: resultado.public_id,
      subidoPor: userId,
      fechaSubida: new Date()
    };

    res.status(201).json({
      success: true,
      message: 'Archivo subido exitosamente',
      data: adjunto
    });

  } catch (error) {
    logger.error('❌ Error al subir archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir archivo',
      error: error.message
    });
  }
};

/**
 * Obtener adjuntos de un mensaje
 * GET /api/crm/messages/:messageId/attachments
 */
export const getMessageAttachments = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, role } = req.auth;

    // Buscar mensaje
    const mensaje = await LeadMessage.findById(messageId)
      .select('adjuntos leadId esPrivado');

    if (!mensaje) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }

    // Verificar acceso al lead
    const acceso = await verificarAccesoLead(mensaje.leadId, userId, role);
    if (!acceso.permitido) {
      return res.status(403).json({
        success: false,
        message: acceso.error
      });
    }

    // Verificar si puede ver mensajes privados
    if (mensaje.esPrivado && !hasPermission(role, VIEW_LEAD_MESSAGES)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver este mensaje'
      });
    }

    res.json({
      success: true,
      data: {
        adjuntos: mensaje.adjuntos || [],
        total: mensaje.adjuntos?.length || 0
      }
    });

  } catch (error) {
    logger.error('❌ Error al obtener adjuntos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener adjuntos',
      error: error.message
    });
  }
};

/**
 * Eliminar adjunto de Cloudinary y del mensaje
 * DELETE /api/crm/messages/:messageId/attachments/:cloudinaryId
 */
export const deleteAttachment = async (req, res) => {
  try {
    const { messageId, cloudinaryId } = req.params;
    const { userId, role } = req.auth;

    // Buscar mensaje
    const mensaje = await LeadMessage.findById(messageId);

    if (!mensaje) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }

    // Verificar permisos
    if (!hasPermission(role, DELETE_LEAD_MESSAGES)) {
      // Si no tiene permiso general, verificar si es el autor
      if (mensaje.autor.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para eliminar este adjunto'
        });
      }
    }

    // Buscar el adjunto
    const adjunto = mensaje.adjuntos.find(a => a.cloudinaryId === cloudinaryId);
    
    if (!adjunto) {
      return res.status(404).json({
        success: false,
        message: 'Adjunto no encontrado'
      });
    }

    // Eliminar de Cloudinary
    try {
      await cloudinary.uploader.destroy(cloudinaryId);
      logger.info(`🗑️  Adjunto eliminado de Cloudinary: ${cloudinaryId}`);
    } catch (cloudinaryError) {
      logger.error('⚠️  Error al eliminar de Cloudinary:', cloudinaryError);
      // Continuar aunque falle Cloudinary
    }

    // Eliminar del mensaje
    mensaje.adjuntos = mensaje.adjuntos.filter(a => a.cloudinaryId !== cloudinaryId);
    await mensaje.save();

    logger.info(`✅ Adjunto eliminado del mensaje: ${adjunto.nombre}`);

    res.json({
      success: true,
      message: 'Adjunto eliminado exitosamente',
      data: {
        nombreArchivo: adjunto.nombre
      }
    });

  } catch (error) {
    logger.error('❌ Error al eliminar adjunto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar adjunto',
      error: error.message
    });
  }
};

/**
 * Obtener todos los adjuntos de un lead
 * GET /api/crm/leads/:leadId/attachments
 */
export const getLeadAttachments = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { userId, role } = req.auth;
    const { tipo, page = 1, limit = 50 } = req.query;

    // Verificar acceso al lead
    const acceso = await verificarAccesoLead(leadId, userId, role);
    if (!acceso.permitido) {
      return res.status(403).json({
        success: false,
        message: acceso.error
      });
    }

    // Construir filtro
    const filtro = { leadId, eliminado: false };
    
    // Solo mostrar mensajes públicos si no tiene permisos
    if (!hasPermission(role, VIEW_LEAD_MESSAGES)) {
      filtro.esPrivado = false;
    }

    // Buscar mensajes con adjuntos
    const mensajes = await LeadMessage.find(filtro)
      .select('adjuntos autor createdAt tipo')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Extraer todos los adjuntos
    let adjuntos = [];
    mensajes.forEach(mensaje => {
      if (mensaje.adjuntos && mensaje.adjuntos.length > 0) {
        mensaje.adjuntos.forEach(adj => {
          adjuntos.push({
            ...adj.toObject(),
            mensajeId: mensaje._id,
            mensajeTipo: mensaje.tipo,
            autorNombre: mensaje.autor.nombre,
            fechaMensaje: mensaje.createdAt
          });
        });
      }
    });

    // Filtrar por tipo si se especificó
    if (tipo) {
      adjuntos = adjuntos.filter(adj => adj.tipo === tipo);
    }

    // Calcular estadísticas
    const stats = {
      total: adjuntos.length,
      tamaño_total: adjuntos.reduce((sum, adj) => sum + (adj.tamaño || 0), 0),
      por_tipo: {}
    };

    adjuntos.forEach(adj => {
      if (!stats.por_tipo[adj.tipo]) {
        stats.por_tipo[adj.tipo] = 0;
      }
      stats.por_tipo[adj.tipo]++;
    });

    res.json({
      success: true,
      data: {
        adjuntos,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: adjuntos.length
        }
      }
    });

  } catch (error) {
    logger.error('❌ Error al obtener adjuntos del lead:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener adjuntos',
      error: error.message
    });
  }
};

/**
 * Obtener información de un adjunto específico
 * GET /api/crm/attachments/:cloudinaryId
 */
export const getAttachmentInfo = async (req, res) => {
  try {
    const { cloudinaryId } = req.params;
    const { userId, role } = req.auth;

    // Buscar el mensaje que contiene este adjunto
    const mensaje = await LeadMessage.findOne({
      'adjuntos.cloudinaryId': cloudinaryId,
      eliminado: false
    }).select('adjuntos leadId esPrivado autor');

    if (!mensaje) {
      return res.status(404).json({
        success: false,
        message: 'Adjunto no encontrado'
      });
    }

    // Verificar acceso al lead
    const acceso = await verificarAccesoLead(mensaje.leadId, userId, role);
    if (!acceso.permitido) {
      return res.status(403).json({
        success: false,
        message: acceso.error
      });
    }

    // Encontrar el adjunto específico
    const adjunto = mensaje.adjuntos.find(a => a.cloudinaryId === cloudinaryId);

    res.json({
      success: true,
      data: {
        adjunto,
        mensaje: {
          id: mensaje._id,
          tipo: mensaje.tipo,
          autor: mensaje.autor
        }
      }
    });

  } catch (error) {
    logger.error('❌ Error al obtener información del adjunto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener información del adjunto',
      error: error.message
    });
  }
};

// ============================================
// EXPORTACIONES
// ============================================

export {
  uploadAttachment,
  getMessageAttachments,
  deleteAttachment,
  getLeadAttachments,
  getAttachmentInfo
};
