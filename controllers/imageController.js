import Image from '../models/Image.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import logger from '../utils/logger.js';
import { getImageDimensions } from '../utils/imageProcessor.js';
import cloudinary, { deleteFromCloudinary } from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directorio de uploads (mantener para compatibilidad local)
const uploadsDir = path.join(__dirname, '../uploads');

// @desc    Subir imagen y guardar en DB (usando Cloudinary)
// @route   POST /api/upload/image
// @access  Private
export const uploadImage = async (req, res) => {
  try {
    // ============================================
    // LOGGING INICIAL PARA DEBUGGING - MEJORADO
    // ============================================
    logger.info('📤 Upload request iniciado', {
      hasFile: !!req.files?.image,
      userId: req.user?.clerkId || req.user?.id,
      userRole: req.user?.role,
      fileInfo: req.files?.image ? {
        name: req.files.image.name,
        size: req.files.image.size,
        mimetype: req.files.image.mimetype,
        hasTempFilePath: !!req.files.image.tempFilePath,
        tempFilePath: req.files.image.tempFilePath,
        hasData: !!req.files.image.data,
        dataSize: req.files.image.data ? req.files.image.data.length : 0
      } : null,
      cloudinaryConfigured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
      environment: process.env.NODE_ENV,
      requestHeaders: {
        authorization: !!req.headers.authorization,
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent']
      }
    });

    // Verificar archivos y autenticación
    if (!req.files || !req.files.image) {
      logger.warn('❌ No se proporcionó imagen en la request');
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ninguna imagen'
      });
    }

    const imageFile = req.files.image;
    const userId = req.user?.clerkId || req.user?.id; // Fallback
    
    if (!userId) {
      logger.error('❌ Usuario no autenticado correctamente', { user: req.user });
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado correctamente'
      });
    }

    // ============================================
    // VERIFICAR CONFIGURACIÓN DE CLOUDINARY
    // ============================================
    const cloudinaryConfig = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    };

    const missingConfig = Object.entries(cloudinaryConfig)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingConfig.length > 0) {
      logger.error('❌ Configuración de Cloudinary incompleta:', {
        missing: missingConfig,
        environment: process.env.NODE_ENV
      });
      return res.status(503).json({
        success: false,
        message: 'Servicio de almacenamiento de imágenes no configurado correctamente',
        error: process.env.NODE_ENV === 'development' ? `Missing: ${missingConfig.join(', ')}` : undefined
      });
    }
    
    // Validar tipo de archivo (agregado SVG para íconos)
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'image/svg+xml'  // ✅ SVG para íconos sin fondo
    ];
    
    if (!allowedTypes.includes(imageFile.mimetype)) {
      logger.warn('❌ Tipo de archivo no permitido:', {
        provided: imageFile.mimetype,
        allowed: allowedTypes
      });
      return res.status(400).json({
        success: false,
        message: 'Tipo de archivo no permitido. Solo se permiten: JPG, PNG, GIF, WEBP, SVG'
      });
    }

    // Validar tamaño (max 5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
      logger.warn('❌ Archivo demasiado grande:', {
        size: imageFile.size,
        maxSize: 5 * 1024 * 1024,
        sizeFormatted: `${(imageFile.size / 1024 / 1024).toFixed(2)}MB`
      });
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo 5MB'
      });
    }

    // ============================================
    // SUBIR A CLOUDINARY CON LOGS DETALLADOS
    // ============================================
    logger.info('☁️ Iniciando upload a Cloudinary...', {
      fileName: imageFile.name,
      fileSize: `${(imageFile.size / 1024 / 1024).toFixed(2)}MB`,
      mimeType: imageFile.mimetype
    });
    
    const uploadResult = await new Promise((resolve, reject) => {
      // Detectar si es SVG para configuración especial
      const isSVG = imageFile.mimetype === 'image/svg+xml';
      
      // Generar public_id único con extensión para SVG
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const basePublicId = `${timestamp}_${randomStr}`;
      
      // Configuración mejorada para el upload
      const uploadOptions = {
        folder: 'web-scuti',
        resource_type: isSVG ? 'raw' : 'image',  // SVG como 'raw' en Cloudinary
        type: 'upload', // ✅ Tipo de upload público
        access_mode: 'public', // ✅ CRÍTICO: Hacer imágenes accesibles públicamente
        // Para SVG, agregar la extensión explícitamente en el public_id
        ...(isSVG ? { public_id: `${basePublicId}.svg` } : {}),
        // Solo aplicar transformaciones a imágenes raster (no SVG)
        ...(isSVG ? {} : {
          transformation: [
            { width: 2000, height: 2000, crop: 'limit' },
            { quality: 'auto:best' }
          ]
        }),
        timeout: 60000 // 60 segundos timeout
      };

      logger.info('☁️ Configuración de upload:', uploadOptions);

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            logger.error('❌ Error detallado en Cloudinary upload:', {
              error: error.message,
              code: error.http_code,
              name: error.name,
              stack: error.stack,
              details: error,
              fileName: imageFile.name,
              fileSize: imageFile.size,
              config: {
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY ? '***CONFIGURADO***' : 'NO_CONFIGURADO'
              }
            });
            reject(error);
          } else {
            logger.success('✅ Upload a Cloudinary exitoso:', {
              publicId: result.public_id,
              url: result.secure_url,
              size: result.bytes,
              format: result.format,
              dimensions: `${result.width}x${result.height}`,
              uploadTime: result.created_at
            });
            resolve(result);
          }
        }
      );

      // Añadir timeout manual por si acaso
      const timeoutId = setTimeout(() => {
        logger.error('❌ Timeout en upload de Cloudinary después de 60 segundos');
        reject(new Error('Timeout: El upload tardó demasiado tiempo'));
      }, 60000);

      uploadStream.on('finish', () => {
        clearTimeout(timeoutId);
      });

      uploadStream.on('error', (error) => {
        clearTimeout(timeoutId);
        logger.error('❌ Error en stream de upload:', error);
        reject(error);
      });

      try {
        // express-fileupload con useTempFiles: true usa .tempFilePath
        // en vez de .data (buffer en memoria)
        if (imageFile.tempFilePath) {
          // Modo archivo temporal - leer y enviar al stream
          const readStream = fs.createReadStream(imageFile.tempFilePath);
          
          readStream.on('error', (readError) => {
            clearTimeout(timeoutId);
            logger.error('❌ Error leyendo archivo temporal:', readError);
            reject(readError);
          });

          readStream.pipe(uploadStream);
        } else if (imageFile.data) {
          // Modo buffer en memoria (fallback)
          uploadStream.end(imageFile.data);
        } else {
          clearTimeout(timeoutId);
          const error = new Error('No se pudo acceder a los datos del archivo');
          logger.error('❌ Archivo sin datos ni tempFilePath:', {
            hasTempFilePath: !!imageFile.tempFilePath,
            hasData: !!imageFile.data,
            fileName: imageFile.name
          });
          reject(error);
        }
      } catch (streamError) {
        clearTimeout(timeoutId);
        logger.error('❌ Error al enviar datos al stream:', streamError);
        reject(streamError);
      }
    });

    // Obtener metadatos adicionales del body (si existen)
    const {
      category = 'other',
      title = imageFile.name,
      description = '',
      alt = '',
      tags = []
    } = req.body;

    // ============================================
    // CREAR REGISTRO EN BASE DE DATOS
    // ============================================
    logger.info('💾 Guardando registro en base de datos...');
    
    const imageRecord = await Image.create({
      filename: uploadResult.public_id, // Usar public_id de Cloudinary
      originalName: imageFile.name,
      url: uploadResult.secure_url, // URL pública de Cloudinary
      cloudinaryId: uploadResult.public_id, // Guardar ID para eliminar después
      mimetype: imageFile.mimetype,
      size: uploadResult.bytes,
      width: uploadResult.width,
      height: uploadResult.height,
      category,
      title,
      description,
      alt,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
      uploadedBy: userId,
      isOrphan: true // Inicialmente es huérfana hasta que se use
    });

    // Limpiar archivo temporal si existe
    if (imageFile.tempFilePath) {
      try {
        await fs.promises.unlink(imageFile.tempFilePath);
        logger.info('🗑️ Archivo temporal limpiado:', imageFile.tempFilePath);
      } catch (unlinkError) {
        logger.warn('⚠️ No se pudo eliminar archivo temporal:', {
          path: imageFile.tempFilePath,
          error: unlinkError.message
        });
      }
    }

    logger.success('🎉 Upload completado exitosamente:', {
      imageId: imageRecord._id,
      cloudinaryId: uploadResult.public_id,
      url: uploadResult.secure_url,
      userId: userId,
      category: category,
      size: `${(uploadResult.bytes / 1024 / 1024).toFixed(2)}MB`
    });

    res.status(201).json({
      success: true,
      message: 'Imagen subida correctamente',
      data: imageRecord
    });
  } catch (error) {
    // Limpiar archivo temporal en caso de error
    if (req.files?.image?.tempFilePath) {
      try {
        await fs.promises.unlink(req.files.image.tempFilePath);
        logger.info('🗑️ Archivo temporal limpiado tras error:', req.files.image.tempFilePath);
      } catch (unlinkError) {
        logger.warn('⚠️ No se pudo eliminar archivo temporal tras error:', unlinkError.message);
      }
    }

    // ============================================
    // MANEJO DE ERRORES CON LOGS DETALLADOS
    // ============================================
    logger.error('💥 Error crítico en upload de imagen:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      userId: req.user?.clerkId || req.user?.id,
      userRole: req.user?.role,
      fileName: req.files?.image?.name,
      fileSize: req.files?.image?.size,
      environment: process.env.NODE_ENV,
      cloudinaryConfig: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME ? '✅ CONFIGURADO' : '❌ NO CONFIGURADO',
        apiKey: process.env.CLOUDINARY_API_KEY ? '✅ CONFIGURADO' : '❌ NO CONFIGURADO',
        apiSecret: process.env.CLOUDINARY_API_SECRET ? '✅ CONFIGURADO' : '❌ NO CONFIGURADO'
      },
      requestInfo: {
        url: req.url,
        method: req.method,
        headers: {
          'content-type': req.headers['content-type'],
          'authorization': !!req.headers.authorization,
          'user-agent': req.headers['user-agent']
        }
      }
    });

    // Determinar tipo de error para respuesta más específica
    let statusCode = 500;
    let message = 'Error interno del servidor al subir la imagen';
    let detailedError = error.message;

    // Errores específicos de Cloudinary
    if (error.message.includes('Invalid image file') || error.message.includes('Unsupported format')) {
      statusCode = 400;
      message = 'Formato de imagen no válido';
    } else if (error.message.includes('File too large') || error.message.includes('File size too large')) {
      statusCode = 413;
      message = 'El archivo es demasiado grande';
    } else if (error.message.includes('Cloudinary') || error.name === 'CloudinaryError') {
      statusCode = 503;
      message = 'Error en el servicio de almacenamiento de imágenes';
      detailedError = `Cloudinary Error: ${error.message}`;
    } else if (error.message.includes('Timeout') || error.code === 'ECONNABORTED') {
      statusCode = 504;
      message = 'Tiempo de espera agotado al subir la imagen';
    } else if (error.message.includes('Network') || error.code === 'ECONNRESET') {
      statusCode = 503;
      message = 'Error de conectividad con el servicio de almacenamiento';
    } else if (error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
      statusCode = 401;
      message = 'Error de autenticación con el servicio de almacenamiento';
    } else if (error.message.includes('Invalid signature') || error.message.includes('Invalid timestamp')) {
      statusCode = 401;
      message = 'Error de configuración del servicio de almacenamiento';
    }

    // Respuesta de error mejorada
    const errorResponse = {
      success: false,
      message: message,
      errorCode: statusCode,
      timestamp: new Date().toISOString()
    };

    // Incluir detalles adicionales en desarrollo
    if (process.env.NODE_ENV === 'development') {
      errorResponse.detailedError = detailedError;
      errorResponse.errorName = error.name;
      errorResponse.cloudinaryConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
    }

    res.status(statusCode).json(errorResponse);
  }
};

// @desc    Listar imágenes con filtros y paginación
// @route   GET /api/upload/images
// @access  Private
export const listImages = async (req, res) => {
  try {
    const {
      category,
      isOrphan,
      uploadedBy,
      tags,
      search,
      page = 1,
      limit = 20,
      sortBy = '-uploadedAt'
    } = req.query;

    const options = {
      category,
      isOrphan: isOrphan === 'true' ? true : isOrphan === 'false' ? false : undefined,
      uploadedBy,
      tags: tags ? tags.split(',') : undefined,
      search,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy
    };

    const result = await Image.findWithFilters({}, options);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error al listar imágenes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar imágenes',
      error: error.message
    });
  }
};

// @desc    Obtener imagen por ID
// @route   GET /api/upload/images/:id
// @access  Private
export const getImageById = async (req, res) => {
  try {
    const { id } = req.params;

    const image = await Image.findById(id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }

    res.json({
      success: true,
      data: image
    });
  } catch (error) {
    logger.error('Error al obtener imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la imagen',
      error: error.message
    });
  }
};

// @desc    Actualizar metadatos de imagen
// @route   PATCH /api/upload/images/:id
// @access  Private
export const updateImageMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      alt,
      category,
      tags
    } = req.body;

    const image = await Image.findById(id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }

    // Actualizar solo los campos proporcionados
    if (title !== undefined) image.title = title;
    if (description !== undefined) image.description = description;
    if (alt !== undefined) image.alt = alt;
    if (category !== undefined) image.category = category;
    if (tags !== undefined) {
      image.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    }

    await image.save();

    logger.success(`Metadatos actualizados para imagen ${id}`);

    res.json({
      success: true,
      message: 'Metadatos actualizados correctamente',
      data: image
    });
  } catch (error) {
    logger.error('Error al actualizar metadatos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar metadatos',
      error: error.message
    });
  }
};

// @desc    Eliminar imagen
// @route   DELETE /api/upload/images/:id
// @access  Private
export const deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query; // ?force=true para forzar eliminación

    const image = await Image.findById(id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }

    // Verificar si se puede eliminar
    if (!image.canDelete(force === 'true')) {
      return res.status(400).json({
        success: false,
        message: 'La imagen está en uso y no puede ser eliminada. Usa ?force=true para forzar la eliminación.',
        usedIn: image.usedIn
      });
    }

    // Eliminar de Cloudinary si tiene cloudinaryId
    if (image.cloudinaryId) {
      try {
        await deleteFromCloudinary(image.cloudinaryId);
        logger.success(`Imagen eliminada de Cloudinary: ${image.cloudinaryId}`);
      } catch (cloudinaryError) {
        logger.error('Error al eliminar de Cloudinary:', cloudinaryError);
        // Continuar con la eliminación de BD aunque falle Cloudinary
      }
    } else {
      // Fallback: eliminar archivo físico local (para imágenes antiguas)
      const filePath = path.join(uploadsDir, image.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Eliminar registro de la base de datos
    await Image.findByIdAndDelete(id);

    logger.success(`Imagen eliminada de BD: ${image.filename}`);

    res.json({
      success: true,
      message: 'Imagen eliminada correctamente'
    });
  } catch (error) {
    logger.error('Error al eliminar imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la imagen',
      error: error.message
    });
  }
};

// @desc    Buscar imágenes
// @route   GET /api/upload/images/search
// @access  Private
export const searchImages = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un término de búsqueda'
      });
    }

    const images = await Image.find({
      $or: [
        { filename: { $regex: q, $options: 'i' } },
        { originalName: { $regex: q, $options: 'i' } },
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ]
    })
    .limit(parseInt(limit))
    .sort('-uploadedAt');

    res.json({
      success: true,
      count: images.length,
      data: images
    });
  } catch (error) {
    logger.error('Error al buscar imágenes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar imágenes',
      error: error.message
    });
  }
};

// @desc    Obtener imágenes huérfanas
// @route   GET /api/upload/images/orphans
// @access  Private
export const getOrphanImages = async (req, res) => {
  try {
    const orphans = await Image.find({ isOrphan: true })
      .sort('-uploadedAt');

    const totalSize = orphans.reduce((sum, img) => sum + img.size, 0);

    res.json({
      success: true,
      count: orphans.length,
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      data: orphans
    });
  } catch (error) {
    logger.error('Error al obtener imágenes huérfanas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener imágenes huérfanas',
      error: error.message
    });
  }
};

// @desc    Limpiar imágenes huérfanas
// @route   POST /api/upload/images/cleanup
// @access  Private (Admin only - agregar middleware)
export const cleanupOrphanImages = async (req, res) => {
  try {
    const { dryRun = false } = req.body;

    const orphans = await Image.find({ isOrphan: true });

    if (dryRun) {
      const totalSize = orphans.reduce((sum, img) => sum + img.size, 0);
      return res.json({
        success: true,
        message: 'Simulación de limpieza',
        count: orphans.length,
        totalSize,
        totalSizeFormatted: formatBytes(totalSize),
        images: orphans.map(img => ({
          filename: img.filename,
          size: img.sizeFormatted,
          uploadedAt: img.uploadedAt
        }))
      });
    }

    // Eliminar archivos físicos y registros
    const deleted = [];
    const errors = [];

    for (const image of orphans) {
      try {
        const filePath = path.join(uploadsDir, image.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        await Image.findByIdAndDelete(image._id);
        deleted.push(image.filename);
      } catch (err) {
        errors.push({ filename: image.filename, error: err.message });
      }
    }

    logger.success(`Limpieza completada: ${deleted.length} imágenes eliminadas`);

    res.json({
      success: true,
      message: 'Limpieza completada',
      deleted: deleted.length,
      errors: errors.length,
      details: { deleted, errors }
    });
  } catch (error) {
    logger.error('Error al limpiar imágenes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al limpiar imágenes',
      error: error.message
    });
  }
};

// @desc    Obtener estadísticas de imágenes
// @route   GET /api/upload/images/stats
// @access  Private
export const getImageStatistics = async (req, res) => {
  try {
    const stats = await Image.getStatistics();

    res.json({
      success: true,
      data: {
        ...stats,
        totalSizeFormatted: formatBytes(stats.totalSize)
      }
    });
  } catch (error) {
    logger.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// @desc    Agregar referencia de uso a una imagen
// @route   POST /api/upload/images/:id/reference
// @access  Private (Internal use)
export const addImageReference = async (req, res) => {
  try {
    const { id } = req.params;
    const { model, documentId, field } = req.body;

    if (!model || !documentId || !field) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren model, documentId y field'
      });
    }

    const image = await Image.findById(id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }

    await image.addReference(model, documentId, field);

    res.json({
      success: true,
      message: 'Referencia agregada correctamente',
      data: image
    });
  } catch (error) {
    logger.error('Error al agregar referencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar referencia',
      error: error.message
    });
  }
};

// @desc    Eliminar referencia de uso de una imagen
// @route   DELETE /api/upload/images/:id/reference
// @access  Private (Internal use)
export const removeImageReference = async (req, res) => {
  try {
    const { id } = req.params;
    const { model, documentId, field } = req.body;

    if (!model || !documentId || !field) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren model, documentId y field'
      });
    }

    const image = await Image.findById(id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }

    await image.removeReference(model, documentId, field);

    res.json({
      success: true,
      message: 'Referencia eliminada correctamente',
      data: image
    });
  } catch (error) {
    logger.error('Error al eliminar referencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar referencia',
      error: error.message
    });
  }
};

// Helper function
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
