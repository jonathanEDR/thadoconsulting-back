import Image from '../models/Image.js';
import logger from './logger.js';

/**
 * Utilidad para rastrear el uso de imágenes en diferentes modelos
 */

/**
 * Registra que una imagen está siendo utilizada en un documento
 * @param {string} imageUrl - URL de la imagen
 * @param {string} model - Modelo que usa la imagen ('Page', 'Servicio', 'User')
 * @param {string} documentId - ID del documento que usa la imagen
 * @param {string} field - Campo donde se usa la imagen
 */
export const registerImageUsage = async (imageUrl, model, documentId, field) => {
  try {
    if (!imageUrl || !model || !documentId || !field) {
      logger.warn('Parámetros incompletos para registrar uso de imagen:', {
        imageUrl, model, documentId, field
      });
      return;
    }

    // Extraer el filename de la URL
    const filename = extractFilenameFromUrl(imageUrl);
    if (!filename) {
      logger.warn('No se pudo extraer filename de URL:', imageUrl);
      return;
    }

    // Buscar la imagen por filename o URL
    const image = await Image.findOne({
      $or: [
        { filename },
        { url: { $regex: filename } }
      ]
    });

    if (!image) {
      logger.warn('Imagen no encontrada para registrar uso:', filename);
      return;
    }

    // Verificar si ya existe esta referencia
    const existingRef = image.usedIn.find(ref => 
      ref.model === model && 
      ref.documentId.toString() === documentId.toString() && 
      ref.field === field
    );

    if (existingRef) {
      console.log('Referencia ya existe para imagen:', filename);
      return;
    }

    // Agregar nueva referencia
    image.usedIn.push({
      model,
      documentId,
      field,
      addedAt: new Date()
    });

    // Actualizar estado huérfano
    image.isOrphan = false;

    await image.save();

    logger.success('Uso de imagen registrado:', {
      filename,
      model,
      documentId,
      field
    });

  } catch (error) {
    logger.error('Error registrando uso de imagen:', error);
  }
};

/**
 * Remueve el registro de uso de una imagen
 * @param {string} imageUrl - URL de la imagen
 * @param {string} model - Modelo que usa la imagen
 * @param {string} documentId - ID del documento
 * @param {string} field - Campo donde se usa la imagen
 */
export const removeImageUsage = async (imageUrl, model, documentId, field) => {
  try {
    const filename = extractFilenameFromUrl(imageUrl);
    if (!filename) return;

    const image = await Image.findOne({
      $or: [
        { filename },
        { url: { $regex: filename } }
      ]
    });

    if (!image) return;

    // Remover la referencia
    image.usedIn = image.usedIn.filter(ref => 
      !(ref.model === model && 
        ref.documentId.toString() === documentId.toString() && 
        ref.field === field)
    );

    // Actualizar estado huérfano
    image.isOrphan = image.usedIn.length === 0;

    await image.save();

    logger.success('Uso de imagen removido:', {
      filename,
      model,
      documentId,
      field
    });

  } catch (error) {
    logger.error('Error removiendo uso de imagen:', error);
  }
};

/**
 * Actualiza todas las referencias de imágenes en un documento
 * @param {Object} oldData - Datos anteriores del documento
 * @param {Object} newData - Datos nuevos del documento
 * @param {string} model - Modelo del documento
 * @param {string} documentId - ID del documento
 */
export const updateImageReferences = async (oldData, newData, model, documentId) => {
  try {
    const oldImages = extractImagesFromData(oldData);
    const newImages = extractImagesFromData(newData);

    // Remover referencias de imágenes que ya no se usan
    for (const { url, field } of oldImages) {
      if (!newImages.some(img => img.url === url && img.field === field)) {
        await removeImageUsage(url, model, documentId, field);
      }
    }

    // Agregar referencias de nuevas imágenes
    for (const { url, field } of newImages) {
      if (!oldImages.some(img => img.url === url && img.field === field)) {
        await registerImageUsage(url, model, documentId, field);
      }
    }

  } catch (error) {
    logger.error('Error actualizando referencias de imágenes:', error);
  }
};

/**
 * Extrae todas las URLs de imágenes de un objeto de datos
 * @param {Object} data - Datos a analizar
 * @param {string} prefix - Prefijo para el campo (para anidados)
 * @returns {Array} Array de {url, field}
 */
function extractImagesFromData(data, prefix = '') {
  const images = [];
  
  if (!data || typeof data !== 'object') return images;

  for (const [key, value] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string' && isImageUrl(value)) {
      images.push({ url: value, field: fullKey });
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'string' && isImageUrl(item)) {
          images.push({ url: item, field: `${fullKey}.${index}` });
        } else if (typeof item === 'object') {
          images.push(...extractImagesFromData(item, `${fullKey}.${index}`));
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      images.push(...extractImagesFromData(value, fullKey));
    }
  }

  return images;
}

/**
 * Verifica si una URL es una imagen
 * @param {string} url - URL a verificar
 * @returns {boolean}
 */
function isImageUrl(url) {
  if (typeof url !== 'string') return false;
  
  // Verificar si es una URL de imagen del sistema
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
  return imageExtensions.test(url) || url.includes('/uploads/');
}

/**
 * Extrae el filename de una URL
 * @param {string} url - URL de la imagen
 * @returns {string|null}
 */
function extractFilenameFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  
  try {
    // Manejar URLs completas y rutas relativas
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    
    // Remover query parameters
    return filename.split('?')[0];
  } catch (error) {
    return null;
  }
}

/**
 * Escanea y actualiza el estado de todas las imágenes
 * Útil para migración o limpieza masiva
 */
export const scanAndUpdateOrphanStatus = async () => {
  try {
    logger.success('Escaneo y actualización de imágenes iniciado');
    
    const images = await Image.find({});
    let updated = 0;

    for (const image of images) {
      const wasOrphan = image.isOrphan;
      const shouldBeOrphan = image.usedIn.length === 0;
      
      if (wasOrphan !== shouldBeOrphan) {
        image.isOrphan = shouldBeOrphan;
        await image.save();
        updated++;
      }
    }

    logger.success(`Escaneo completo. ${updated} imágenes actualizadas.`);
    return updated;

  } catch (error) {
    logger.error('Error en escaneo de imágenes:', error);
    throw error;
  }
};