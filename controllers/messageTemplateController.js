import MessageTemplate from '../models/MessageTemplate.js';
import { hasPermission } from '../utils/roleHelper.js';
import { PERMISSIONS } from '../config/roles.js';
import logger from '../utils/logger.js';

/**
 * @desc    Obtener todas las plantillas disponibles
 * @route   GET /api/crm/templates
 * @access  Private
 */
export const getTemplates = async (req, res) => {
  try {
    const { clerkId: userId, role } = req.user;
    const { tipo, categoria, favoritos, search, page = 1, limit = 20 } = req.query;
    
    // Verificar permisos
    if (!hasPermission(role, PERMISSIONS.USE_MESSAGE_TEMPLATES)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para usar plantillas'
      });
    }
    
    let query = {
      esActiva: true,
      $or: [
        { esPrivada: false },
        { 'creadoPor.userId': userId }
      ]
    };
    
    // Filtros adicionales
    if (tipo && tipo !== 'all') {
      query.tipo = tipo;
    }
    
    if (categoria && categoria !== 'all') {
      query.categoria = categoria;
    }
    
    // Filtro de favoritos
    if (favoritos === 'true') {
      query['favoritos.userId'] = userId;
    }
    
    // Búsqueda por texto
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { titulo: { $regex: search, $options: 'i' } },
          { descripcion: { $regex: search, $options: 'i' } },
          { etiquetas: { $regex: search, $options: 'i' } }
        ]
      });
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [plantillas, total] = await Promise.all([
      MessageTemplate.find(query)
        .sort({ vecesUsada: -1, titulo: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      MessageTemplate.countDocuments(query)
    ]);
    
    // Marcar cuáles son favoritas del usuario
    const plantillasConFavoritos = plantillas.map(p => ({
      ...p,
      esFavorito: p.favoritos?.some(f => f.userId === userId) || false
    }));
    
    res.status(200).json({
      success: true,
      data: {
        plantillas: plantillasConFavoritos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo plantillas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo plantillas'
    });
  }
};

/**
 * @desc    Obtener plantilla por ID
 * @route   GET /api/crm/templates/:id
 * @access  Private
 */
export const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { clerkId: userId, role } = req.user;
    
    // Verificar permisos
    if (!hasPermission(role, PERMISSIONS.USE_MESSAGE_TEMPLATES)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver plantillas'
      });
    }
    
    const plantilla = await MessageTemplate.findById(id).lean();
    
    if (!plantilla || !plantilla.esActiva) {
      return res.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      });
    }
    
    // Verificar si puede acceder (pública o propia)
    if (plantilla.esPrivada && plantilla.creadoPor.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes acceso a esta plantilla'
      });
    }
    
    // Agregar si es favorita
    plantilla.esFavorito = plantilla.favoritos?.some(f => f.userId === userId) || false;
    
    res.status(200).json({
      success: true,
      data: plantilla
    });
    
  } catch (error) {
    logger.error('Error obteniendo plantilla:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo plantilla'
    });
  }
};

/**
 * @desc    Crear nueva plantilla
 * @route   POST /api/crm/templates
 * @access  Private (ADMIN)
 */
export const createTemplate = async (req, res) => {
  try {
    const { clerkId: userId, role } = req.user;
    const {
      titulo,
      descripcion,
      asunto,
      contenido,
      tipo,
      categoria = 'general',
      variables = [],
      esPrivada = false,
      canal = 'sistema',
      etiquetas = []
    } = req.body;
    
    // Verificar permisos
    if (!hasPermission(role, PERMISSIONS.MANAGE_MESSAGE_TEMPLATES)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear plantillas'
      });
    }
    
    // Validaciones
    if (!titulo || !contenido || !tipo) {
      return res.status(400).json({
        success: false,
        message: 'Título, contenido y tipo son requeridos'
      });
    }
    
    // Verificar que el título no exista
    const existente = await MessageTemplate.findOne({ titulo });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una plantilla con ese título'
      });
    }
    
    const plantilla = new MessageTemplate({
      titulo,
      descripcion,
      asunto,
      contenido,
      tipo,
      categoria,
      variables: Array.isArray(variables) ? variables : [],
      esPrivada,
      canal,
      etiquetas: Array.isArray(etiquetas) ? etiquetas : [],
      creadoPor: {
        userId,
        nombre: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
        email: req.user.email
      }
    });
    
    await plantilla.save();
    
    logger.info(`Plantilla creada: ${titulo} por ${userId}`);
    
    res.status(201).json({
      success: true,
      message: 'Plantilla creada exitosamente',
      data: plantilla
    });
    
  } catch (error) {
    logger.error('Error creando plantilla:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando plantilla'
    });
  }
};

/**
 * @desc    Actualizar plantilla
 * @route   PUT /api/crm/templates/:id
 * @access  Private (ADMIN o creador)
 */
export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { clerkId: userId, role } = req.user;
    const updates = req.body;
    
    // Verificar permisos
    if (!hasPermission(role, PERMISSIONS.MANAGE_MESSAGE_TEMPLATES)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para actualizar plantillas'
      });
    }
    
    const plantilla = await MessageTemplate.findById(id);
    
    if (!plantilla) {
      return res.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      });
    }
    
    // Solo el creador o admin puede actualizar
    if (plantilla.creadoPor.userId !== userId && !hasPermission(role, PERMISSIONS.MANAGE_SYSTEM)) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes editar tus propias plantillas'
      });
    }
    
    // Actualizar campos permitidos
    const camposPermitidos = [
      'titulo', 'descripcion', 'asunto', 'contenido', 'tipo', 
      'categoria', 'variables', 'esPrivada', 'canal', 'etiquetas', 'esActiva'
    ];
    
    camposPermitidos.forEach(campo => {
      if (updates[campo] !== undefined) {
        plantilla[campo] = updates[campo];
      }
    });
    
    await plantilla.save();
    
    logger.info(`Plantilla actualizada: ${id} por ${userId}`);
    
    res.status(200).json({
      success: true,
      message: 'Plantilla actualizada exitosamente',
      data: plantilla
    });
    
  } catch (error) {
    logger.error('Error actualizando plantilla:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando plantilla'
    });
  }
};

/**
 * @desc    Eliminar plantilla (desactivar)
 * @route   DELETE /api/crm/templates/:id
 * @access  Private (ADMIN)
 */
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { clerkId: userId, role } = req.user;
    
    // Verificar permisos
    if (!hasPermission(role, PERMISSIONS.MANAGE_MESSAGE_TEMPLATES)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar plantillas'
      });
    }
    
    const plantilla = await MessageTemplate.findById(id);
    
    if (!plantilla) {
      return res.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      });
    }
    
    // Desactivar en lugar de eliminar
    plantilla.esActiva = false;
    await plantilla.save();
    
    logger.info(`Plantilla desactivada: ${id} por ${userId}`);
    
    res.status(200).json({
      success: true,
      message: 'Plantilla eliminada exitosamente'
    });
    
  } catch (error) {
    logger.error('Error eliminando plantilla:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando plantilla'
    });
  }
};

/**
 * @desc    Usar plantilla (procesar variables)
 * @route   POST /api/crm/templates/:id/use
 * @access  Private
 */
export const usarPlantilla = async (req, res) => {
  try {
    const { id } = req.params;
    const { clerkId: userId } = req.user;
    const { valores = {} } = req.body;
    
    const plantilla = await MessageTemplate.findById(id);
    
    if (!plantilla || !plantilla.esActiva) {
      return res.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      });
    }
    
    // Verificar acceso
    if (plantilla.esPrivada && plantilla.creadoPor.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes acceso a esta plantilla'
      });
    }
    
    // Procesar plantilla con las variables proporcionadas
    const resultado = plantilla.procesar(valores);
    
    // Registrar uso
    await plantilla.registrarUso();
    
    res.status(200).json({
      success: true,
      data: {
        ...resultado,
        plantillaId: plantilla._id,
        titulo: plantilla.titulo
      }
    });
    
  } catch (error) {
    logger.error('Error usando plantilla:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando plantilla'
    });
  }
};

/**
 * @desc    Toggle favorito
 * @route   POST /api/crm/templates/:id/favorite
 * @access  Private
 */
export const toggleFavorito = async (req, res) => {
  try {
    const { id } = req.params;
    const { clerkId: userId } = req.user;
    
    const plantilla = await MessageTemplate.findById(id);
    
    if (!plantilla || !plantilla.esActiva) {
      return res.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      });
    }
    
    await plantilla.toggleFavorito(userId);
    
    const esFavorito = plantilla.esFavoritoDe(userId);
    
    res.status(200).json({
      success: true,
      message: esFavorito ? 'Agregado a favoritos' : 'Removido de favoritos',
      data: {
        esFavorito
      }
    });
    
  } catch (error) {
    logger.error('Error toggling favorito:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando favorito'
    });
  }
};

/**
 * @desc    Clonar plantilla
 * @route   POST /api/crm/templates/:id/clone
 * @access  Private
 */
export const clonarPlantilla = async (req, res) => {
  try {
    const { id } = req.params;
    const { clerkId: userId, role } = req.user;
    
    const plantilla = await MessageTemplate.findById(id);
    
    if (!plantilla || !plantilla.esActiva) {
      return res.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      });
    }
    
    // Verificar acceso
    if (plantilla.esPrivada && plantilla.creadoPor.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes acceso a esta plantilla'
      });
    }
    
    const clon = plantilla.clonar(req.user);
    await clon.save();
    
    logger.info(`Plantilla clonada: ${id} → ${clon._id} por ${userId}`);
    
    res.status(201).json({
      success: true,
      message: 'Plantilla clonada exitosamente',
      data: clon
    });
    
  } catch (error) {
    logger.error('Error clonando plantilla:', error);
    res.status(500).json({
      success: false,
      message: 'Error clonando plantilla'
    });
  }
};

/**
 * @desc    Obtener plantillas más usadas
 * @route   GET /api/crm/templates/popular
 * @access  Private
 */
export const getPlantillasPopulares = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const plantillas = await MessageTemplate.obtenerMasUsadas(parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: plantillas
    });
    
  } catch (error) {
    logger.error('Error obteniendo plantillas populares:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo plantillas populares'
    });
  }
};

/**
 * @desc    Inicializar plantillas por defecto
 * @route   POST /api/crm/templates/init-defaults
 * @access  Private (SUPER_ADMIN only)
 */
export const inicializarPlantillasDefault = async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Solo SUPER_ADMIN puede inicializar plantillas por defecto'
      });
    }
    
    await MessageTemplate.crearPlantillasDefault();
    
    res.status(200).json({
      success: true,
      message: 'Plantillas por defecto inicializadas exitosamente'
    });
    
  } catch (error) {
    logger.error('Error inicializando plantillas por defecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error inicializando plantillas por defecto'
    });
  }
};
