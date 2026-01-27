import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configurar storage de Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'web-scuti', // Carpeta en Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    type: 'upload', // Tipo de upload público
    access_mode: 'public', // ✅ IMPORTANTE: Hacer imágenes públicas
    resource_type: 'auto',
    transformation: [
      {
        width: 2000,
        height: 2000,
        crop: 'limit',
        quality: 'auto:best'
      }
    ]
  }
});

// Configurar multer con Cloudinary
export const uploadToCloudinary = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// Función para eliminar imagen de Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error al eliminar de Cloudinary:', error);
    throw error;
  }
};

// Función para obtener URL optimizada
export const getOptimizedUrl = (publicId, options = {}) => {
  const {
    width = 'auto',
    quality = 'auto:best',
    format = 'auto'
  } = options;
  
  return cloudinary.url(publicId, {
    width,
    quality,
    fetch_format: format,
    secure: true,
    type: 'upload', // ✅ Asegurar que sea del tipo público
    sign_url: false // ✅ No firmar URLs (acceso público)
  });
};

// ✅ Función para hacer una imagen pública (si fue subida como privada)
export const makeImagePublic = async (publicId) => {
  try {
    const result = await cloudinary.uploader.explicit(publicId, {
      type: 'upload',
      access_mode: 'public'
    });
    return result;
  } catch (error) {
    console.error('Error al hacer imagen pública:', error);
    throw error;
  }
};

export default cloudinary;
