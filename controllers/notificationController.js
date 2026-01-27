import Notification from '../models/Notification.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * 🔔 Controlador de Notificaciones
 * Maneja todas las operaciones de notificaciones para usuarios
 */

/**
 * @desc    Obtener notificaciones del usuario autenticado
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    
    if (!clerkId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }
    
    const {
      tipo,
      prioridad,
      leido,
      archivado,
      desde,
      hasta,
      page = 1,
      limit = 20
    } = req.query;
    
    const options = {
      tipo,
      prioridad,
      leido: leido !== undefined ? leido === 'true' : undefined,
      archivado: archivado !== undefined ? archivado === 'true' : false,
      desde,
      hasta,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100) // Max 100
    };
    
    const result = await Notification.getForUser(clerkId, options);
    
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
    
  } catch (error) {
    logger.error('Error obteniendo notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener conteo de notificaciones no leídas
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
export const getUnreadCount = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    
    if (!clerkId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }
    
    const result = await Notification.getUnreadCount(clerkId);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Error obteniendo conteo de no leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener conteo',
      error: error.message
    });
  }
};

/**
 * @desc    Marcar notificación como leída
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    const { id } = req.params;
    
    if (!clerkId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }
    
    const notification = await Notification.findOneAndUpdate(
      { _id: id, clerkId },
      { 
        leido: true,
        leidoEn: new Date()
      },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: notification
    });
    
  } catch (error) {
    logger.error('Error marcando como leída:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar como leída',
      error: error.message
    });
  }
};

/**
 * @desc    Marcar todas las notificaciones como leídas
 * @route   PUT /api/notifications/mark-all-read
 * @access  Private
 */
export const markAllAsRead = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    
    if (!clerkId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }
    
    const result = await Notification.updateMany(
      { clerkId, leido: false, archivado: false },
      { 
        leido: true,
        leidoEn: new Date()
      }
    );
    
    res.json({
      success: true,
      data: {
        modified: result.modifiedCount
      }
    });
    
  } catch (error) {
    logger.error('Error marcando todas como leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar todas como leídas',
      error: error.message
    });
  }
};

/**
 * @desc    Archivar notificación
 * @route   PUT /api/notifications/:id/archive
 * @access  Private
 */
export const archiveNotification = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    const { id } = req.params;
    
    if (!clerkId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }
    
    const notification = await Notification.findOneAndUpdate(
      { _id: id, clerkId },
      { 
        archivado: true,
        archivadoEn: new Date()
      },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: notification
    });
    
  } catch (error) {
    logger.error('Error archivando notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al archivar notificación',
      error: error.message
    });
  }
};

/**
 * @desc    Eliminar notificación
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    const { id } = req.params;
    
    if (!clerkId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }
    
    const notification = await Notification.findOneAndDelete({ _id: id, clerkId });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }
    
    res.json({
      success: true,
      message: 'Notificación eliminada'
    });
    
  } catch (error) {
    logger.error('Error eliminando notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar notificación',
      error: error.message
    });
  }
};

/**
 * @desc    Crear notificación (uso interno/admin)
 * @route   POST /api/notifications
 * @access  Private (Admin)
 */
export const createNotification = async (req, res) => {
  try {
    const { userId, tipo, titulo, mensaje, prioridad, accion, origen, metadata } = req.body;
    
    // Buscar usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    const notification = await Notification.crearParaUsuario(user._id, user.clerkId, {
      tipo,
      titulo,
      mensaje,
      prioridad: prioridad || 'normal',
      accion,
      origen,
      metadata
    });
    
    res.status(201).json({
      success: true,
      data: notification
    });
    
  } catch (error) {
    logger.error('Error creando notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear notificación',
      error: error.message
    });
  }
};

/**
 * Helper: Crear notificación del sistema para un usuario
 * Uso interno desde otros controladores
 */
export const crearNotificacionSistema = async (clerkId, data) => {
  try {
    const user = await User.findOne({ clerkId });
    if (!user) {
      logger.warn(`Usuario no encontrado para notificación: ${clerkId}`);
      return null;
    }
    
    return await Notification.crearParaUsuario(user._id, clerkId, {
      tipo: 'sistema',
      prioridad: 'normal',
      ...data
    });
  } catch (error) {
    logger.error('Error creando notificación de sistema:', error);
    return null;
  }
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  deleteNotification,
  createNotification,
  crearNotificacionSistema
};
