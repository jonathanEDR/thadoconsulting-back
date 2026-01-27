import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extraer dimensiones de una imagen
 * @param {string} filePath - Ruta completa del archivo
 * @returns {Promise<{width: number, height: number}>}
 */
export const getImageDimensions = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height
    };
  } catch (error) {
    console.error('Error al obtener dimensiones:', error);
    return { width: null, height: null };
  }
};

/**
 * Generar thumbnail de una imagen
 * @param {string} filePath - Ruta completa del archivo original
 * @param {string} outputPath - Ruta donde guardar el thumbnail
 * @param {number} width - Ancho del thumbnail (default: 300)
 * @param {number} height - Alto del thumbnail (default: 300)
 * @returns {Promise<{success: boolean, path: string, width: number, height: number}>}
 */
export const generateThumbnail = async (filePath, outputPath, width = 300, height = 300) => {
  try {
    const info = await sharp(filePath)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      })
      .toFile(outputPath);

    return {
      success: true,
      path: outputPath,
      width: info.width,
      height: info.height,
      size: info.size
    };
  } catch (error) {
    console.error('Error al generar thumbnail:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Optimizar imagen (comprimir sin pérdida significativa de calidad)
 * @param {string} filePath - Ruta completa del archivo
 * @param {object} options - Opciones de optimización
 * @returns {Promise<{success: boolean, originalSize: number, optimizedSize: number, saved: string}>}
 */
export const optimizeImage = async (filePath, options = {}) => {
  try {
    const {
      quality = 85,
      maxWidth = 1920,
      maxHeight = 1080
    } = options;

    // Obtener tamaño original
    const originalStats = fs.statSync(filePath);
    const originalSize = originalStats.size;

    // Leer la imagen
    const image = sharp(filePath);
    const metadata = await image.metadata();

    // Determinar si necesita redimensionar
    let pipeline = image;
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Aplicar compresión según formato
    switch (metadata.format) {
      case 'jpeg':
      case 'jpg':
        pipeline = pipeline.jpeg({ quality, progressive: true });
        break;
      case 'png':
        pipeline = pipeline.png({ quality, compressionLevel: 9 });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality });
        break;
      default:
        // No optimizar otros formatos
        return {
          success: false,
          error: 'Formato no soportado para optimización'
        };
    }

    // Guardar imagen optimizada temporalmente
    const tempPath = `${filePath}.optimized`;
    await pipeline.toFile(tempPath);

    // Obtener tamaño optimizado
    const optimizedStats = fs.statSync(tempPath);
    const optimizedSize = optimizedStats.size;

    // Solo reemplazar si el tamaño se redujo significativamente
    if (optimizedSize < originalSize * 0.95) {
      fs.unlinkSync(filePath);
      fs.renameSync(tempPath, filePath);

      const savedBytes = originalSize - optimizedSize;
      const savedPercent = ((savedBytes / originalSize) * 100).toFixed(2);

      return {
        success: true,
        originalSize,
        optimizedSize,
        savedBytes,
        savedPercent: `${savedPercent}%`
      };
    } else {
      // Si no se reduce significativamente, mantener original
      fs.unlinkSync(tempPath);
      return {
        success: false,
        message: 'No se logró reducción significativa',
        originalSize,
        optimizedSize
      };
    }
  } catch (error) {
    console.error('Error al optimizar imagen:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Validar que un archivo es una imagen válida
 * @param {string} filePath - Ruta completa del archivo
 * @returns {Promise<{valid: boolean, format: string, width: number, height: number}>}
 */
export const validateImage = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    
    const validFormats = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
    const isValid = validFormats.includes(metadata.format);

    return {
      valid: isValid,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      size: metadata.size,
      space: metadata.space,
      channels: metadata.channels,
      hasAlpha: metadata.hasAlpha
    };
  } catch (error) {
    console.error('Error al validar imagen:', error);
    return {
      valid: false,
      error: error.message
    };
  }
};

/**
 * Convertir imagen a formato específico
 * @param {string} filePath - Ruta completa del archivo
 * @param {string} outputPath - Ruta de salida
 * @param {string} format - Formato destino (jpeg, png, webp)
 * @param {number} quality - Calidad (1-100)
 * @returns {Promise<{success: boolean, path: string, size: number}>}
 */
export const convertImageFormat = async (filePath, outputPath, format = 'webp', quality = 85) => {
  try {
    let pipeline = sharp(filePath);

    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        pipeline = pipeline.jpeg({ quality, progressive: true });
        break;
      case 'png':
        pipeline = pipeline.png({ quality });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality });
        break;
      default:
        throw new Error(`Formato no soportado: ${format}`);
    }

    const info = await pipeline.toFile(outputPath);

    return {
      success: true,
      path: outputPath,
      size: info.size,
      width: info.width,
      height: info.height,
      format
    };
  } catch (error) {
    console.error('Error al convertir imagen:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Crear múltiples versiones de una imagen (responsive)
 * @param {string} filePath - Ruta completa del archivo
 * @param {string} outputDir - Directorio de salida
 * @param {string} baseName - Nombre base (sin extensión)
 * @returns {Promise<Array>} Array con información de cada versión creada
 */
export const createResponsiveVersions = async (filePath, outputDir, baseName) => {
  const sizes = [
    { name: 'thumbnail', width: 300, height: 300 },
    { name: 'small', width: 640, height: null },
    { name: 'medium', width: 1024, height: null },
    { name: 'large', width: 1920, height: null }
  ];

  const versions = [];

  for (const size of sizes) {
    try {
      const outputPath = path.join(outputDir, `${baseName}-${size.name}.webp`);
      
      let pipeline = sharp(filePath);
      
      if (size.height) {
        pipeline = pipeline.resize(size.width, size.height, {
          fit: 'cover',
          position: 'center'
        });
      } else {
        pipeline = pipeline.resize(size.width, null, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      const info = await pipeline
        .webp({ quality: 85 })
        .toFile(outputPath);

      versions.push({
        name: size.name,
        path: outputPath,
        width: info.width,
        height: info.height,
        size: info.size
      });
    } catch (error) {
      console.error(`Error al crear versión ${size.name}:`, error);
    }
  }

  return versions;
};

/**
 * Obtener información completa de una imagen
 * @param {string} filePath - Ruta completa del archivo
 * @returns {Promise<object>} Información detallada de la imagen
 */
export const getImageInfo = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    const stats = fs.statSync(filePath);

    return {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (error) {
    console.error('Error al obtener información:', error);
    return {
      error: error.message
    };
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

export default {
  getImageDimensions,
  generateThumbnail,
  optimizeImage,
  validateImage,
  convertImageFormat,
  createResponsiveVersions,
  getImageInfo
};
