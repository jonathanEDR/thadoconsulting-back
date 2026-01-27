/**
 * Blog Session Controller
 * Maneja las sesiones conversacionales para crear contenido de blog
 */

import blogConversationService from '../agents/services/blog/BlogConversationService.js';
import BlogCreationSession from '../models/BlogCreationSession.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * POST /api/agents/blog/session/start
 * Iniciar nueva sesión de creación de blog
 */
export const startSession = async (req, res) => {
  try {
    const userId = req.auth.userId;
    
    // Buscar usuario en la BD
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Metadata opcional
    const metadata = {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
      startedFrom: req.body.startedFrom || 'dashboard'
    };
    
    // Crear sesión
    const result = await blogConversationService.startSession(user._id, metadata);
    
    res.json({
      success: true,
      data: result,
      message: 'Sesión iniciada exitosamente'
    });
    
  } catch (error) {
    logger.error('❌ Error starting session:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: error.message
    });
  }
};

/**
 * POST /api/agents/blog/session/:sessionId/message
 * Enviar mensaje en la conversación
 */
export const sendMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'El mensaje es requerido y debe ser un string'
      });
    }
    
    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'El mensaje es demasiado largo (máximo 2000 caracteres)'
      });
    }
    
    // Verificar que la sesión pertenece al usuario
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    const session = await BlogCreationSession.findOne({
      sessionId,
      userId: user._id
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Sesión no encontrada o no tienes acceso'
      });
    }
    
    if (!session.isActive()) {
      return res.status(400).json({
        success: false,
        message: 'La sesión ha expirado',
        code: 'SESSION_EXPIRED'
      });
    }
    
    // Procesar mensaje
    const result = await blogConversationService.processMessage(sessionId, message);
    
    // Si el resultado indica que debe generar, iniciar generación
    if (result.shouldGenerate) {
      // Iniciar generación asíncrona
      setImmediate(async () => {
        try {
          await blogConversationService.generateContent(sessionId);
        } catch (error) {
          logger.error('❌ Background generation failed:', error);
        }
      });
      
      return res.json({
        success: true,
        data: {
          ...result,
          status: 'generating',
          message: '🎨 Generando contenido... Esto tomará 2-3 minutos. Usa el endpoint de estado para verificar el progreso.',
          pollUrl: `/api/agents/blog/session/${sessionId}`
        }
      });
    }
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('❌ Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar mensaje',
      error: error.message
    });
  }
};

/**
 * POST /api/agents/blog/session/:sessionId/generate
 * Generar contenido (endpoint directo)
 */
export const generateContent = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Verificar sesión y permisos
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    const session = await BlogCreationSession.findOne({
      sessionId,
      userId: user._id
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Sesión no encontrada'
      });
    }
    
    if (!session.isActive()) {
      return res.status(400).json({
        success: false,
        message: 'La sesión ha expirado',
        code: 'SESSION_EXPIRED'
      });
    }
    
    // Verificar que tiene datos suficientes
    if (!session.collected.title || !session.collected.category) {
      return res.status(400).json({
        success: false,
        message: 'Datos insuficientes para generar contenido',
        code: 'INCOMPLETE_DATA'
      });
    }
    
    // Iniciar generación asíncrona
    setImmediate(async () => {
      try {
        await blogConversationService.generateContent(sessionId);
      } catch (error) {
        logger.error('❌ Background generation failed:', error);
      }
    });
    
    res.json({
      success: true,
      data: {
        status: 'generating',
        message: '🎨 Generación iniciada',
        sessionId,
        pollUrl: `/api/agents/blog/session/${sessionId}`,
        estimatedTime: '2-3 minutos'
      }
    });
    
  } catch (error) {
    logger.error('❌ Error generating content:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar contenido',
      error: error.message
    });
  }
};

/**
 * GET /api/agents/blog/session/:sessionId
 * Obtener estado de la sesión
 */
export const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Verificar permisos
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    const session = await BlogCreationSession.findOne({
      sessionId,
      userId: user._id
    })
      .populate('collected.category', 'name slug description')
      .populate('createdPostId', 'title slug status createdAt')
      .lean();
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Sesión no encontrada'
      });
    }
    
    // Construir respuesta
    const response = {
      success: true,
      data: {
        sessionId: session.sessionId,
        status: session.status,
        stage: session.stage,
        progress: session.progress,
        collected: session.collected,
        conversationHistory: session.conversationHistory,
        generation: session.generation,
        createdPost: session.createdPostId,
        metadata: session.metadata,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        expiresAt: session.expiresAt
      }
    };
    
    // Si está generando, agregar info adicional
    if (session.status === 'generating' && session.generation) {
      response.data.generationStatus = {
        generationId: session.generation.generationId,
        status: session.generation.status,
        startedAt: session.generation.startedAt,
        estimatedCompletion: new Date(session.generation.startedAt.getTime() + 3 * 60 * 1000) // +3 min
      };
    }
    
    // Si completó generación, agregar resultado
    if (session.generation?.status === 'completed') {
      response.data.result = {
        content: session.generation.content,
        metadata: session.generation.metadata,
        draft: session.generation.draft
      };
      
      response.data.actions = [
        {
          id: 'save_draft',
          label: '💾 Guardar como borrador',
          endpoint: `/api/agents/blog/session/${sessionId}/save`,
          method: 'POST'
        },
        {
          id: 'regenerate',
          label: '🔄 Regenerar contenido',
          endpoint: `/api/agents/blog/session/${sessionId}/generate`,
          method: 'POST'
        }
      ];
    }
    
    res.json(response);
    
  } catch (error) {
    logger.error('❌ Error getting session:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener sesión',
      error: error.message
    });
  }
};

/**
 * POST /api/agents/blog/session/:sessionId/save
 * Guardar contenido generado como borrador
 */
export const saveDraft = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { tags, customData } = req.body;
    
    // Verificar permisos
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    const session = await BlogCreationSession.findOne({
      sessionId,
      userId: user._id
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Sesión no encontrada'
      });
    }
    
    // Verificar que tiene contenido generado
    if (!session.generation || session.generation.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'No hay contenido generado para guardar',
        code: 'NO_CONTENT'
      });
    }
    
    // Si ya se guardó un post, retornar el existente
    if (session.createdPostId) {
      return res.json({
        success: true,
        message: 'El contenido ya fue guardado previamente',
        data: {
          postId: session.createdPostId,
          sessionId,
          url: `/blog/editor/${session.createdPostId}`
        }
      });
    }
    
    // Preparar datos personalizados
    const customPostData = {
      ...customData
    };
    
    // Si se proporcionaron tags, sobrescribir
    if (tags && Array.isArray(tags)) {
      customPostData.tags = tags;
    }
    
    // Guardar borrador
    const result = await blogConversationService.saveDraft(
      sessionId,
      user._id,
      customPostData
    );
    
    res.json({
      success: true,
      message: '✅ Borrador guardado exitosamente',
      data: {
        ...result.post,
        sessionId,
        url: `/blog/editor/${result.post.id}`,
        nextSteps: [
          '✏️ Editar contenido si lo deseas',
          '🖼️ Agregar imagen destacada',
          '🏷️ Revisar y ajustar tags',
          '📝 Publicar cuando estés listo'
        ]
      }
    });
    
  } catch (error) {
    logger.error('❌ Error saving draft:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar borrador',
      error: error.message
    });
  }
};

/**
 * DELETE /api/agents/blog/session/:sessionId
 * Cancelar sesión
 */
export const cancelSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Verificar permisos
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    const session = await BlogCreationSession.findOne({
      sessionId,
      userId: user._id
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Sesión no encontrada'
      });
    }
    
    // Cancelar sesión
    session.cancel();
    await session.save();
    
    res.json({
      success: true,
      message: 'Sesión cancelada exitosamente',
      data: {
        sessionId,
        status: 'cancelled'
      }
    });
    
  } catch (error) {
    logger.error('❌ Error cancelling session:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar sesión',
      error: error.message
    });
  }
};

/**
 * GET /api/agents/blog/sessions
 * Listar sesiones del usuario
 */
export const listSessions = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    const { status, limit = 10, page = 1 } = req.query;
    
    const query = { userId: user._id };
    
    if (status) {
      query.status = status;
    }
    
    const skip = (page - 1) * limit;
    
    const sessions = await BlogCreationSession.find(query)
      .select('sessionId status stage progress collected.title collected.template createdAt updatedAt expiresAt')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    const total = await BlogCreationSession.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('❌ Error listing sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar sesiones',
      error: error.message
    });
  }
};
