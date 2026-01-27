import Servicio from '../models/Servicio.js';
import PaqueteServicio from '../models/PaqueteServicio.js';
import Categoria from '../models/Categoria.js';
import { ServiceLogger } from '../utils/serviceLogger.js';
import { manualCacheInvalidation } from '../utils/cacheInvalidator.js';

/**
 * @desc    Obtener todos los servicios con filtros avanzados
 * @route   GET /api/servicios
 * @access  Public
 */
export const getServicios = async (req, res) => {
  try {
    const { 
      categoria, 
      destacado, 
      activo, 
      estado,
      visibleEnWeb,
      etiqueta,
      precioMin,
      precioMax,
      tipoPrecio,
      departamento,
      search,  // ✨ NUEVO: Parámetro de búsqueda
      sort = '-createdAt',
      page = 1,
      limit = 10,
      includeDeleted = false,
      admin = false // Para identificar si es una consulta administrativa
    } = req.query;
    
    // Construir filtros dinámicos
    const filtros = {};
    
    // Si no es una consulta administrativa, filtrar solo servicios públicos
    if (admin !== 'true') {
      filtros.activo = true;
      filtros.visibleEnWeb = true;
    }
    
    // ✨ NUEVO: Convertir nombre de categoría a ObjectId si es necesario
    if (categoria) {
      try {
        // Si es un ObjectId válido, usarlo directamente
        if (categoria.match(/^[0-9a-fA-F]{24}$/)) {
          filtros.categoria = categoria;
        } else {
          // Si es un string (nombre), buscar la categoría por nombre
          const categoriaDoc = await Categoria.findOne({ 
            $or: [
              { nombre: categoria },
              { slug: categoria }
            ]
          });
          
          if (categoriaDoc) {
            filtros.categoria = categoriaDoc._id;
          } else {
            // Si no encuentra la categoría, no filtrar por ella
            console.warn(`⚠️ Categoría "${categoria}" no encontrada`);
          }
        }
      } catch (error) {
        console.error(`❌ Error procesando categoría: ${error.message}`);
      }
    }
    
    if (destacado !== undefined) filtros.destacado = destacado === 'true';
    if (activo !== undefined && admin === 'true') filtros.activo = activo === 'true';
    if (estado) filtros.estado = estado;
    if (visibleEnWeb !== undefined && admin === 'true') filtros.visibleEnWeb = visibleEnWeb === 'true';
    if (etiqueta) filtros.etiquetas = etiqueta;
    if (tipoPrecio) filtros.tipoPrecio = tipoPrecio;
    if (departamento) filtros.departamento = departamento;
    
    // ✨ NUEVO: Búsqueda por texto en título y descripción
    if (search) {
      filtros.$or = [
        { titulo: { $regex: search, $options: 'i' } },
        { descripcion: { $regex: search, $options: 'i' } },
        { etiquetas: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filtros de precio
    if (precioMin || precioMax) {
      filtros.$or = [];
      if (precioMin) {
        filtros.$or.push(
          { precio: { $gte: Number(precioMin) } },
          { precioMin: { $gte: Number(precioMin) } }
        );
      }
      if (precioMax) {
        filtros.$or.push(
          { precio: { $lte: Number(precioMax) } },
          { precioMax: { $lte: Number(precioMax) } }
        );
      }
    }

    // Configurar opciones de paginación
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort
    };

    // Si se incluyen eliminados, agregar opción especial
    const queryOptions = includeDeleted === 'true' ? { includeDeleted: true } : {};

    console.log('\n');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('📋 [GET SERVICIOS] Obteniendo lista de servicios');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('🔍 Filtros:', JSON.stringify(filtros, null, 2));
    console.log('📄 Página:', options.page, '| Límite:', options.limit);
    console.log('🔄 Cache-Control Header:', req.get('Cache-Control') || 'No especificado');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('\n');

    const servicios = await Servicio.find(filtros, null, queryOptions)
      .sort(options.sort)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit)
      .populate('responsable', 'firstName lastName email')
      .populate('categoria', 'nombre descripcion slug icono color')
      .populate('paquetes')
      .lean();  // ✅ Optimización: Retorna objetos planos sin overhead Mongoose

    const total = await Servicio.countDocuments(filtros);
    
    console.log('\n');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('📊 [GET SERVICIOS] Resultados');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('✅ Total servicios en DB:', total);
    console.log('📄 Servicios en esta página:', servicios.length);
    console.log('📄 Páginas totales:', Math.ceil(total / options.limit));
    console.log('⏰ Timestamp:', new Date().toISOString());
    
    // 🔍 Debug: Ver slug de cada servicio
    servicios.forEach((serv, idx) => {
      console.log(`  ├─ Servicio ${idx + 1}: ID=${serv._id} | SLUG=${serv.slug || 'SIN SLUG'} | TÍTULO=${serv.titulo}`);
    });
    
    console.log('════════════════════════════════════════════════════════════════');
    console.log('\n');
    
    // ✅ Agregar headers de cache para que el frontend sepa el estado
    res.setHeader('X-Cache-Status', 'FRESH');
    res.setHeader('X-Total-Items', total.toString());
    res.setHeader('X-Current-Page', options.page.toString());
    res.setHeader('X-Total-Pages', Math.ceil(total / options.limit).toString());
    res.setHeader('X-Response-Timestamp', new Date().toISOString());
    
    res.status(200).json({
      success: true,
      count: servicios.length,
      total,
      page: options.page,
      pages: Math.ceil(total / options.limit),
      data: servicios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener servicios',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener todos los servicios (Admin - Sin cache)
 * @route   GET /api/servicios/admin/list
 * @access  Private - Admin only
 */
export const getServiciosAdmin = async (req, res) => {
  try {
    const { 
      categoria, 
      destacado, 
      activo, 
      estado,
      visibleEnWeb,
      etiqueta,
      precioMin,
      precioMax,
      tipoPrecio,
      departamento,
      sort = '-createdAt',
      page = 1,
      limit = 10,
      includeDeleted = false
    } = req.query;
    
    // Construir filtros dinámicos (sin restricción de activo/visibleEnWeb para admin)
    const filtros = {};
    
    if (categoria) filtros.categoria = categoria;
    if (destacado !== undefined) filtros.destacado = destacado === 'true';
    if (activo !== undefined) filtros.activo = activo === 'true';
    if (estado) filtros.estado = estado;
    if (visibleEnWeb !== undefined) filtros.visibleEnWeb = visibleEnWeb === 'true';
    if (etiqueta) filtros.etiquetas = etiqueta;
    if (tipoPrecio) filtros.tipoPrecio = tipoPrecio;
    if (departamento) filtros.departamento = departamento;
    
    // Filtros de precio
    if (precioMin || precioMax) {
      filtros.$or = [];
      if (precioMin) {
        filtros.$or.push(
          { precio: { $gte: Number(precioMin) } },
          { precioMin: { $gte: Number(precioMin) } }
        );
      }
      if (precioMax) {
        filtros.$or.push(
          { precio: { $lte: Number(precioMax) } },
          { precioMax: { $lte: Number(precioMax) } }
        );
      }
    }

    // Configurar opciones de paginación
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort
    };

    // Si se incluyen eliminados, agregar opción especial
    const queryOptions = includeDeleted === 'true' ? { includeDeleted: true } : {};

    const servicios = await Servicio.find(filtros, null, queryOptions)
      .sort(options.sort)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit)
      .populate('responsable', 'firstName lastName email')
      .populate('categoria', 'nombre descripcion slug icono color')
      .populate('paquetes');

    const total = await Servicio.countDocuments(filtros);
    
    res.status(200).json({
      success: true,
      count: servicios.length,
      total,
      page: options.page,
      pages: Math.ceil(total / options.limit),
      data: servicios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener servicios (admin)',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener un servicio por ID o slug con paquetes
 * @route   GET /api/servicios/:id
 * @access  Public
 */
export const getServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { includePaquetes = true, admin = false } = req.query;
    
    console.log('🔍 [BACKEND] Obteniendo servicio:', { id, admin, includePaquetes });
    
    // Construir filtros base
    const baseFilter = {
      $or: [
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        { slug: id }
      ]
    };
    
    // Si no es una consulta administrativa, filtrar solo servicios públicos
    if (admin !== 'true') {
      baseFilter.activo = true;
      baseFilter.visibleEnWeb = true;
    }
    
    // Buscar por ID o por slug con filtros de visibilidad
    let query = Servicio.findOne(baseFilter)
      .populate('responsable', 'firstName lastName email')
      .populate('categoria', 'nombre descripcion slug icono color');

    if (includePaquetes === 'true') {
      query = query.populate('paquetes');
    }

    // ✅ CORRECCIÓN: Sin .lean() para que FAQ y subdocumentos se carguen correctamente
    const servicio = await query;

    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado o no disponible públicamente'
      });
    }

    // 🔍 DEBUG: Ver datos que se van a enviar
    // ✅ Servicio encontrado - preparando respuesta
    console.log('✅ [BACKEND] Servicio encontrado:', {
      _id: servicio._id,
      titulo: servicio.titulo,
      arrays: {
        caracteristicas: servicio.caracteristicas?.length || 0,
        incluye: servicio.incluye?.length || 0,
        noIncluye: servicio.noIncluye?.length || 0,
        faq: servicio.faq?.length || 0
      }
    });

    res.status(200).json({
      success: true,
      data: servicio
    });
  } catch (error) {
    console.error('❌ [BACKEND] Error al obtener servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el servicio',
      error: error.message
    });
  }
};

/**
 * @desc    Crear un nuevo servicio
 * @route   POST /api/servicios
 * @access  Private - Requiere CREATE_SERVICES permission
 */
export const createServicio = async (req, res) => {
  try {
    // Agregar automáticamente el usuario responsable si está autenticado
    const servicioData = {
      ...req.body
    };

    // Si el usuario está autenticado, asignarlo como responsable
    if (req.user && req.user.id) {
      servicioData.responsable = req.user.id;
    }

    // Si no se proporciona slug, se generará automáticamente en el middleware
    // Si se proporciona slug y ya existe, el middleware agregará timestamp

    const servicio = await Servicio.create(servicioData);
    
    console.log('\n');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('🆕 [CREATE] SERVICIO CREADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('📝 Título:', servicio.titulo);
    console.log('🔖 Slug:', servicio.slug);
    console.log('🆔 ID:', servicio._id);
    console.log('════════════════════════════════════════════════════════════════');
    console.log('🗑️ INVALIDANDO CACHE AUTOMÁTICAMENTE...');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('\n');
    
    // 🗑️ Invalidar cache automáticamente después de crear servicio
    const invalidationResult = await manualCacheInvalidation(`CREATE_SERVICE: ${servicio.titulo}`);
    
    console.log('\n');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('🗑️ RESULTADO INVALIDACIÓN DE CACHE');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('✅ Resultado:', invalidationResult ? 'ÉXITO' : 'FALLÓ');
    console.log('📝 Servicio:', servicio.titulo);
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('════════════════════════════════════════════════════════════════');
    console.log('\n');
    
    res.status(201).json({
      success: true,
      message: 'Servicio creado exitosamente',
      data: servicio
    });
  } catch (error) {
        
    // Manejo específico para error de slug duplicado
    if (error.code === 11000 && error.keyPattern?.slug) {
      return res.status(400).json({
        success: false,
        message: 'Error: El slug del servicio ya existe',
        error: 'Por favor, intenta con un título diferente o deja que el sistema genere el slug automáticamente'
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Error al crear el servicio',
      error: error.message
    });
  }
};

/**
 * @desc    Actualizar un servicio
 * @route   PUT /api/servicios/:id
 * @access  Private (por ahora public para testing)
 */
export const updateServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('📥 [BACKEND] Actualizando servicio:', { 
      id, 
      fieldsToUpdate: Object.keys(updateData),
      hasAdvancedContent: !!(updateData.descripcionRica || updateData.videoUrl || updateData.galeriaImagenes || updateData.contenidoAdicional),
      hasSEO: !!updateData.seo 
    });

    // Verificar que el servicio existe antes de actualizar
    const existingService = await Servicio.findById(id);
    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado',
        code: 'SERVICE_NOT_FOUND'
      });
    }

    // Preparar datos para actualización con manejo seguro de subdocumentos
    const safeUpdateData = { ...updateData };
    
    // Manejar FAQ de forma segura
    if (safeUpdateData.faq && Array.isArray(safeUpdateData.faq)) {
      safeUpdateData.faq = safeUpdateData.faq.filter(item => 
        item && item.pregunta && item.respuesta
      );
    }
    
    // Manejar SEO de forma segura
    if (safeUpdateData.seo && typeof safeUpdateData.seo === 'object') {
      safeUpdateData.seo = {
        titulo: safeUpdateData.seo.titulo || '',
        descripcion: safeUpdateData.seo.descripcion || '',
        palabrasClave: safeUpdateData.seo.palabrasClave || ''
      };
    }

    // Actualizar con transacción para consistencia
    const servicio = await Servicio.findByIdAndUpdate(
      id,
      { 
        ...safeUpdateData,
        updatedAt: new Date() // Forzar actualización de timestamp
      },
      {
        new: true, // Retornar el documento actualizado
        runValidators: true, // Ejecutar validaciones del schema
        lean: false // Necesario para virtuals y middleware
      }
    ).populate('categoria', 'nombre descripcion slug icono color')
     .populate('responsable', 'firstName lastName email');

    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Error al actualizar el servicio',
        code: 'UPDATE_FAILED'
      });
    }

    // 🔍 DEBUG: Verificar datos guardados
    console.log('💾 [BACKEND] Servicio actualizado exitosamente:', {
      _id: servicio._id,
      titulo: servicio.titulo,
      updatedAt: servicio.updatedAt
    });

    // 🗑️ Invalidar cache automáticamente después de actualizar servicio
    console.log('🔄 [UPDATE] Iniciando invalidación de cache para servicio actualizado...');
    setImmediate(async () => {
      await manualCacheInvalidation(`UPDATE_SERVICE: ${servicio.titulo}`);
    });

    res.status(200).json({
      success: true,
      message: 'Servicio actualizado exitosamente',
      data: servicio
    });

  } catch (error) {
    console.error('❌ [BACKEND] Error al actualizar servicio:', {
      id: req.params.id,
      error: error.message,
      stack: error.stack
    });
    
    // Determinar tipo de error
    let statusCode = 500;
    let message = 'Error interno del servidor';
    let code = 'INTERNAL_ERROR';

    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = 'Error de validación';
      code = 'VALIDATION_ERROR';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      message = 'ID de servicio inválido';
      code = 'INVALID_ID';
    } else if (error.code === 11000) {
      statusCode = 409;
      message = 'Conflicto: el slug ya existe';
      code = 'DUPLICATE_SLUG';
    }

    res.status(statusCode).json({
      success: false,
      message,
      code,
      error: error.message
    });
  }
};

/**
 * @desc    Eliminar un servicio
 * @route   DELETE /api/servicios/:id
 * @access  Private (por ahora public para testing)
 */
export const deleteServicio = async (req, res) => {
  try {
    const servicio = await Servicio.findByIdAndDelete(req.params.id);

    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // 🗑️ Invalidar cache automáticamente después de eliminar servicio
    setImmediate(async () => {
      await manualCacheInvalidation(`DELETE_SERVICE: ${servicio.titulo}`);
    });

    res.status(200).json({
      success: true,
      message: 'Servicio eliminado exitosamente',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el servicio',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener servicios destacados
 * @route   GET /api/servicios/destacados
 * @access  Public
 */
export const getServiciosDestacados = async (req, res) => {
  try {
    const servicios = await Servicio.findDestacados();
    
    res.status(200).json({
      success: true,
      count: servicios.length,
      data: servicios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener servicios destacados',
      error: error.message
    });
  }
};

/**
 * @desc    Buscar servicios
 * @route   GET /api/servicios/buscar
 * @access  Public
 */
export const buscarServicios = async (req, res) => {
  try {
    const { q, categoria, estado } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un término de búsqueda'
      });
    }

    const filtros = {};
    if (categoria) filtros.categoria = categoria;
    if (estado) filtros.estado = estado;

    const servicios = await Servicio.buscar(q, filtros);

    res.status(200).json({
      success: true,
      count: servicios.length,
      data: servicios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en la búsqueda',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener servicios por categoría
 * @route   GET /api/servicios/categoria/:categoria
 * @access  Public
 */
export const getServiciosPorCategoria = async (req, res) => {
  try {
    const { categoria } = req.params;
    const servicios = await Servicio.findByCategoria(categoria);

    res.status(200).json({
      success: true,
      count: servicios.length,
      data: servicios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener servicios por categoría',
      error: error.message
    });
  }
};

/**
 * @desc    Duplicar un servicio
 * @route   POST /api/servicios/:id/duplicar
 * @access  Private
 */
export const duplicarServicio = async (req, res) => {
  try {
    // ✅ CORRECCIÓN: Sin .lean() en servicio para copiar subdocumentos (FAQ) correctamente
    const [servicioOriginal, paquetesOriginales] = await Promise.all([
      Servicio.findById(req.params.id),
      PaqueteServicio.find({ servicioId: req.params.id }).lean()
    ]);

    if (!servicioOriginal) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Crear copia del servicio - Convertir documento Mongoose a objeto plano
    const servicioCopia = { ...servicioOriginal.toObject() };
    delete servicioCopia._id;
    delete servicioCopia.createdAt;
    delete servicioCopia.updatedAt;
    servicioCopia.titulo = `${servicioCopia.titulo} (Copia)`;
    servicioCopia.slug = null; // Se generará automáticamente
    servicioCopia.vecesVendido = 0;
    servicioCopia.ingresoTotal = 0;
    servicioCopia.activo = false; // Comenzar inactivo
    servicioCopia.estado = 'desarrollo';

    const nuevoServicio = await Servicio.create(servicioCopia);

    // Duplicar paquetes si existen
    if (paquetesOriginales.length > 0) {
      const nuevosPaquetes = paquetesOriginales.map(paquete => {
        const paqueteCopia = { ...paquete };
        delete paqueteCopia._id;
        delete paqueteCopia.createdAt;
        delete paqueteCopia.updatedAt;
        paqueteCopia.servicioId = nuevoServicio._id;
        paqueteCopia.vecesVendido = 0;
        paqueteCopia.ingresoTotal = 0;
        return paqueteCopia;
      });

    await PaqueteServicio.insertMany(nuevosPaquetes);
    }

    // 🗑️ Invalidar cache automáticamente después de duplicar servicio
    setImmediate(async () => {
      await manualCacheInvalidation(`DUPLICATE_SERVICE: ${nuevoServicio.titulo}`);
    });

    res.status(201).json({
      success: true,
      message: 'Servicio duplicado exitosamente',
      data: nuevoServicio
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error al duplicar el servicio',
      error: error.message
    });
  }
};

/**
 * @desc    Cambiar estado de un servicio
 * @route   PATCH /api/servicios/:id/estado
 * @access  Private
 */
export const cambiarEstado = async (req, res) => {
  try {
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({
        success: false,
        message: 'El estado es requerido'
      });
    }

    const servicio = await Servicio.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true, runValidators: true }
    );

    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: `Estado cambiado a ${estado}`,
      data: servicio
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error al cambiar el estado',
      error: error.message
    });
  }
};

/**
 * @desc    Cambiar estado masivo de servicios
 * @route   PATCH /api/servicios/bulk/estado
 * @access  Private
 */
export const cambiarEstadoMasivo = async (req, res) => {
  try {
    const { ids, estado } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs'
      });
    }

    if (!estado) {
      return res.status(400).json({
        success: false,
        message: 'El estado es requerido'
      });
    }

    const result = await Servicio.updateMany(
      { _id: { $in: ids } },
      { estado }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} servicios actualizados`,
      data: { modificados: result.modifiedCount }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error al cambiar estados',
      error: error.message
    });
  }
};

/**
 * @desc    Soft delete de un servicio
 * @route   DELETE /api/servicios/:id/soft
 * @access  Private
 */
export const softDeleteServicio = async (req, res) => {
  try {
    const servicio = await Servicio.findById(req.params.id);

    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    await servicio.softDelete();

    res.status(200).json({
      success: true,
      message: 'Servicio eliminado exitosamente (soft delete)',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el servicio',
      error: error.message
    });
  }
};

/**
 * @desc    Restaurar un servicio eliminado
 * @route   PATCH /api/servicios/:id/restaurar
 * @access  Private
 */
export const restaurarServicio = async (req, res) => {
  try {
    const servicio = await Servicio.findById(req.params.id).setOptions({ includeDeleted: true });

    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    await servicio.restore();

    res.status(200).json({
      success: true,
      message: 'Servicio restaurado exitosamente',
      data: servicio
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al restaurar el servicio',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener top servicios más vendidos
 * @route   GET /api/servicios/top/vendidos
 * @access  Public
 */
export const getTopServicios = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const servicios = await Servicio.getTopServicios(parseInt(limit));

    res.status(200).json({
      success: true,
      count: servicios.length,
      data: servicios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener top servicios',
      error: error.message
    });
  }
};
