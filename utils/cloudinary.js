/**
 * 📁 Cloudinary Utils
 * Utilidades para upload y manejo de imágenes
 */

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ============================================
// FUNCIONES DE UPLOAD
// ============================================

/**
 * Subir imagen a Cloudinary desde buffer o base64
 */
export const uploadToCloudinary = async (imageBuffer, options = {}) => {
  try {
    const {
      folder = 'web-scuti/profiles',
      width = 400,
      height = 400,
      crop = 'fill',
      quality = 'auto:good',
      format = 'webp'
    } = options;

    const uploadOptions = {
      folder,
      transformation: [
        {
          width,
          height,
          crop,
          quality,
          format
        }
      ],
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    };

    // Si es un buffer, convertir a base64
    let imageToUpload = imageBuffer;
    if (Buffer.isBuffer(imageBuffer)) {
      imageToUpload = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    }

    const result = await cloudinary.uploader.upload(imageToUpload, uploadOptions);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };

  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Subir avatar específicamente (formato optimizado)
 */
export const uploadAvatar = async (imageBuffer) => {
  return uploadToCloudinary(imageBuffer, {
    folder: 'web-scuti/avatars',
    width: 300,
    height: 300,
    crop: 'fill',
    quality: 'auto:good',
    format: 'webp'
  });
};

/**
 * Subir imagen de blog
 */
export const uploadBlogImage = async (imageBuffer) => {
  return uploadToCloudinary(imageBuffer, {
    folder: 'web-scuti/blog',
    width: 1200,
    height: 800,
    crop: 'limit',
    quality: 'auto:best',
    format: 'webp'
  });
};

// ============================================
// FUNCIONES DE ELIMINACIÓN
// ============================================

/**
 * Eliminar imagen de Cloudinary
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    return {
      success: result.result === 'ok',
      result: result.result
    };

  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Eliminar múltiples imágenes
 */
export const deleteManyFromCloudinary = async (publicIds) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    
    return {
      success: true,
      deleted: result.deleted,
      notFound: result.not_found,
      partial: result.partial
    };

  } catch (error) {
    console.error('Error deleting multiple from Cloudinary:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ============================================
// FUNCIONES DE TRANSFORMACIÓN
// ============================================

/**
 * Generar URL transformada
 */
export const getTransformedUrl = (publicId, options = {}) => {
  try {
    const {
      width = 400,
      height = 400,
      crop = 'fill',
      quality = 'auto:good',
      format = 'webp'
    } = options;

    return cloudinary.url(publicId, {
      transformation: [
        {
          width,
          height,
          crop,
          quality,
          format
        }
      ]
    });

  } catch (error) {
    console.error('Error generating transformed URL:', error);
    return null;
  }
};

/**
 * Extraer public_id de una URL de Cloudinary
 */
export const extractPublicId = (cloudinaryUrl) => {
  try {
    if (!cloudinaryUrl || typeof cloudinaryUrl !== 'string') {
      return null;
    }

    // Buscar el patrón de URL de Cloudinary
    const match = cloudinaryUrl.match(/\/v\d+\/(.+)\.[a-zA-Z]{3,4}$/);
    
    if (match && match[1]) {
      return match[1];
    }

    return null;

  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

/**
 * Validar que Cloudinary esté configurado
 */
export const validateCloudinaryConfig = () => {
  const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Cloudinary config missing: ${missing.join(', ')}`);
  }
  
  return true;
};

/**
 * Obtener información de una imagen
 */
export const getImageInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    
    return {
      success: true,
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      createdAt: result.created_at
    };

  } catch (error) {
    console.error('Error getting image info:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default cloudinary;