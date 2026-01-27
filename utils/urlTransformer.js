/**
 * Utilidad para transformar URLs relativas a absolutas
 * Reemplaza rutas locales con la URL base del servidor
 */

// Obtener la URL base del servidor
const getBaseUrl = () => {
  // En producción usa la variable de entorno, en desarrollo usa localhost
  return process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
};

/**
 * Transforma URLs relativas en un objeto a URLs absolutas
 * @param {Object} obj - Objeto a transformar
 * @returns {Object} - Objeto con URLs transformadas
 */
export const transformImageUrls = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const baseUrl = getBaseUrl();
  const transformed = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    const value = obj[key];

    if (typeof value === 'string') {
      // Si es una URL relativa que empieza con /uploads/ o http://localhost
      if (value.startsWith('/uploads/')) {
        transformed[key] = `${baseUrl}${value}`;
      } else if (value.startsWith('http://localhost:')) {
        // Reemplazar localhost con la URL base
        transformed[key] = value.replace(/http:\/\/localhost:\d+/, baseUrl);
      } else {
        transformed[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursión para objetos anidados
      transformed[key] = transformImageUrls(value);
    } else {
      transformed[key] = value;
    }
  }

  return transformed;
};

/**
 * Middleware para transformar URLs en respuestas
 */
export const transformUrlsMiddleware = (data) => {
  return transformImageUrls(data);
};

export default {
  transformImageUrls,
  transformUrlsMiddleware,
  getBaseUrl
};
