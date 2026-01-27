import express from 'express';
import { 
  uploadImage, 
  listImages, 
  getImageById, 
  updateImageMetadata, 
  deleteImage,
  searchImages,
  getOrphanImages,
  cleanupOrphanImages,
  getImageStatistics,
  addImageReference,
  removeImageReference
} from '../controllers/imageController.js';
import { canUploadFiles, canManageUploads, requireUser } from '../middleware/roleAuth.js';
import { 
  uploadLimiter, 
  generalLimiter, 
  writeLimiter,
  validateImageMetadata,
  validators,
  handleValidationErrors 
} from '../middleware/securityMiddleware.js';

const router = express.Router();

// ============================================
// 📤 RUTAS DE UPLOAD (PROTEGIDAS)
// ============================================

// Upload de imagen (requiere permiso de upload)
// ⚠️ Rate limiting: 10 uploads/hora por usuario
router.post('/image', 
  uploadLimiter,         // 🚦 10 uploads/hora
  canUploadFiles, 
  uploadImage
);

// Listar todas las imágenes con filtros (requiere permiso de gestión)
router.get('/images', 
  generalLimiter,
  canManageUploads, 
  listImages
);

// Buscar imágenes (requiere permiso de gestión)
router.get('/images/search', 
  generalLimiter,
  canManageUploads, 
  searchImages
);

// Obtener estadísticas (requiere gestión de uploads)
router.get('/images/stats', 
  generalLimiter,
  canManageUploads, 
  getImageStatistics
);

// Obtener imágenes huérfanas (requiere gestión de uploads)
router.get('/images/orphans', 
  generalLimiter,
  canManageUploads, 
  getOrphanImages
);

// Limpiar imágenes huérfanas (requiere gestión de uploads)
// ⚠️ Operación crítica: rate limiting estricto
router.post('/images/cleanup', 
  writeLimiter,
  canManageUploads, 
  cleanupOrphanImages
);

// Obtener imagen por ID (requiere usuario autenticado)
router.get('/images/:id', 
  generalLimiter,
  requireUser,
  validators.mongoId,
  handleValidationErrors,
  getImageById
);

// Actualizar metadatos de imagen (requiere gestión de uploads)
router.patch('/images/:id', 
  writeLimiter,
  canManageUploads,
  validateImageMetadata,   // ✅ Validar ID y metadatos
  updateImageMetadata
);

// Eliminar imagen (requiere gestión de uploads)
router.delete('/images/:id', 
  writeLimiter,
  canManageUploads,
  validators.mongoId,
  handleValidationErrors,
  deleteImage
);

// Agregar referencia de uso - internal (requiere gestión de uploads)
router.post('/images/:id/reference', 
  writeLimiter,
  canManageUploads,
  validators.mongoId,
  handleValidationErrors,
  addImageReference
);

// Eliminar referencia de uso - internal (requiere gestión de uploads)
router.delete('/images/:id/reference', 
  writeLimiter,
  canManageUploads,
  validators.mongoId,
  handleValidationErrors,
  removeImageReference
);

// ============================================
// 👤 RUTAS DE PERFIL (AVATARES)
// ============================================

/**
 * @desc    Upload de avatar para perfil
 * @route   POST /api/upload/avatar
 * @access  Private (usuario autenticado)
 * ⚠️ Rate limiting: 10 uploads/hora por usuario
 */
router.post('/avatar', 
  uploadLimiter,         // 🚦 10 uploads/hora
  requireUser, 
  async (req, res) => {
  try {
    // Importar dinámicamente para evitar dependencias circulares
    const { uploadAvatar } = await import('../utils/cloudinary.js');
    const User = (await import('../models/User.js')).default;
    
    if (!req.files || !req.files.avatar) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ningún archivo de avatar'
      });
    }

    const avatarFile = req.files.avatar;
    
    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(avatarFile.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de archivo no permitido. Solo se permiten: JPEG, PNG, WebP'
      });
    }

    // Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (avatarFile.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Tamaño máximo: 5MB'
      });
    }

    // Subir a Cloudinary
    const uploadResult = await uploadAvatar(avatarFile.data);
    
    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Error al subir avatar',
        error: uploadResult.error
      });
    }

    // Obtener usuario actual
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Si ya tenía avatar, eliminar el anterior
    if (user.blogProfile.avatar) {
      const { extractPublicId, deleteFromCloudinary } = await import('../utils/cloudinary.js');
      const oldPublicId = extractPublicId(user.blogProfile.avatar);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
      }
    }

    // Actualizar avatar en el perfil
    await user.updateBlogProfile({
      avatar: uploadResult.url
    });

    res.json({
      success: true,
      message: 'Avatar actualizado exitosamente',
      data: {
        avatar: uploadResult.url,
        publicId: uploadResult.publicId,
        dimensions: {
          width: uploadResult.width,
          height: uploadResult.height
        },
        size: uploadResult.bytes
      }
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================
// 🌐 RUTAS PÚBLICAS (SIN AUTENTICACIÓN)
// ============================================

/**
 * @desc    Obtener imagen por ID (público - para blog y páginas públicas)
 * @route   GET /api/upload/public/images/:id
 * @access  Public
 * 🚦 Rate limiting para prevenir scraping
 */
router.get('/public/images/:id', 
  generalLimiter,
  validators.mongoId,
  handleValidationErrors,
  async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar imagen en la base de datos
    const image = await require('../models/Image.js').default.findById(id);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }
    
    // Retornar información pública de la imagen
    res.json({
      success: true,
      data: {
        _id: image._id,
        filename: image.filename,
        url: image.url,
        cloudinaryUrl: image.cloudinaryUrl,
        thumbnailUrl: image.thumbnailUrl,
        alt: image.alt,
        title: image.title,
        width: image.width,
        height: image.height,
        format: image.format,
        size: image.size
      }
    });
  } catch (error) {
    console.error('Error obteniendo imagen pública:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la imagen'
    });
  }
});

export default router;
