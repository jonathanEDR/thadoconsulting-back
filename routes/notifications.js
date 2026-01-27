import express from 'express';
import { requireAuth } from '../middleware/clerkAuth.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  deleteNotification,
  createNotification
} from '../controllers/notificationController.js';

const router = express.Router();

/**
 * 🔔 Rutas de Notificaciones
 * Todas las rutas requieren autenticación con Clerk
 */

// Aplicar autenticación a todas las rutas
router.use(requireAuth);

// GET /api/notifications - Obtener notificaciones del usuario
router.get('/', getNotifications);

// GET /api/notifications/unread-count - Obtener conteo de no leídas
router.get('/unread-count', getUnreadCount);

// PUT /api/notifications/mark-all-read - Marcar todas como leídas
router.put('/mark-all-read', markAllAsRead);

// PUT /api/notifications/:id/read - Marcar como leída
router.put('/:id/read', markAsRead);

// PUT /api/notifications/:id/archive - Archivar notificación
router.put('/:id/archive', archiveNotification);

// DELETE /api/notifications/:id - Eliminar notificación
router.delete('/:id', deleteNotification);

// POST /api/notifications - Crear notificación (admin)
router.post('/', createNotification);

export default router;
