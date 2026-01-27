import express from 'express';
import { requireAuth } from '../middleware/clerkAuth.js';
import { requireAdmin } from '../middleware/roleAuth.js';
import { 
  sendDirectUserMessage, 
  getAllActiveUsers,
  getUserDirectMessages 
} from '../utils/directMessageService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * 📧 RUTAS DE MENSAJERÍA DIRECTA A USUARIOS
 * Permite a admins enviar mensajes a usuarios sin leads (usuarios del blog)
 */

/**
 * GET /api/direct-messages/users/active
 * Obtener lista de TODOS los usuarios activos del sistema
 * Acceso: ADMIN, SUPER_ADMIN
 */
router.get(
  '/users/active',
  requireAdmin,
  async (req, res) => {
    try {
      const { search, limit = 100 } = req.query;

      const filters = {};
      
      // Filtro de búsqueda
      if (search) {
        filters.$or = [
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } }
        ];
      }

      const result = await getAllActiveUsers(filters);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Error obteniendo usuarios',
          error: result.error
        });
      }

      // Limitar resultados
      const limitedUsers = result.users.slice(0, parseInt(limit));

      res.json({
        success: true,
        users: limitedUsers,
        total: result.total,
        showing: limitedUsers.length
      });

    } catch (error) {
      logger.error('❌ Error en GET /users/active', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Error del servidor',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/direct-messages/send/:userId
 * Enviar mensaje directo a un usuario específico
 * Acceso: ADMIN, SUPER_ADMIN
 */
router.post(
  '/send/:userId',
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { asunto, contenido, prioridad, canal, etiquetas } = req.body;

      // Validaciones
      if (!contenido || contenido.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El contenido del mensaje es requerido'
        });
      }

      // Datos del remitente (admin autenticado)
      const senderData = {
        userId: req.auth.userId,
        nombre: `${req.user.firstName} ${req.user.lastName}`.trim() || req.user.email,
        email: req.user.email,
        rol: req.user.role
      };

      // Datos del mensaje
      const messageData = {
        asunto: asunto || 'Mensaje del equipo Scuti',
        contenido,
        prioridad: prioridad || 'normal',
        canal: canal || 'sistema',
        etiquetas: etiquetas || []
      };

      // Enviar mensaje directo
      const result = await sendDirectUserMessage(userId, messageData, senderData);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }

      logger.success('✅ Mensaje directo enviado desde API', {
        from: senderData.email,
        to: userId,
        asunto
      });

      res.status(201).json({
        success: true,
        message: 'Mensaje enviado exitosamente',
        data: {
          messageId: result.data.mensaje._id.toString(),
          leadId: result.data.leadVirtual._id.toString(),
          isVirtual: true
        }
      });

    } catch (error) {
      logger.error('❌ Error en POST /send/:userId', {
        error: error.message,
        stack: error.stack,
        userId: req.params.userId
      });

      res.status(500).json({
        success: false,
        message: 'Error enviando mensaje',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/direct-messages/history/:userId
 * Obtener historial de mensajes directos de un usuario
 * Acceso: ADMIN, SUPER_ADMIN
 */
router.get(
  '/history/:userId',
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      const result = await getUserDirectMessages(userId);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Error obteniendo historial',
          error: result.error
        });
      }

      res.json({
        success: true,
        messages: result.messages,
        total: result.total,
        leadId: result.leadId || null
      });

    } catch (error) {
      logger.error('❌ Error en GET /history/:userId', {
        error: error.message,
        userId: req.params.userId
      });

      res.status(500).json({
        success: false,
        message: 'Error del servidor',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/direct-messages/stats
 * Estadísticas de mensajería directa
 * Acceso: ADMIN, SUPER_ADMIN
 */
router.get(
  '/stats',
  requireAdmin,
  async (req, res) => {
    try {
      const [allUsersResult] = await Promise.all([
        getAllActiveUsers({})
      ]);

      res.json({
        success: true,
        stats: {
          totalActiveUsers: allUsersResult.total,
          usersWithMessages: allUsersResult.users.filter(u => u.messageCount > 0).length
        }
      });

    } catch (error) {
      logger.error('❌ Error en GET /stats', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas',
        error: error.message
      });
    }
  }
);

export default router;
