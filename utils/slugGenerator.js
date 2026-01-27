/**
 * Utilidad para generar slugs SEO-friendly
 * Convierte texto a formato URL seguro y único
 */

/**
 * Convertir texto a slug básico
 * @param {string} text - Texto a convertir
 * @returns {string} - Slug generado
 */
export const textToSlug = (text) => {
  if (!text) return '';
  
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Reemplazar caracteres especiales españoles
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/ü/g, 'u')
    // Remover caracteres no alfanuméricos (excepto guiones y espacios)
    .replace(/[^\w\s-]/g, '')
    // Reemplazar espacios y múltiples guiones con un solo guion
    .replace(/[\s_-]+/g, '-')
    // Remover guiones al inicio y final
    .replace(/^-+|-+$/g, '');
};

/**
 * Generar slug único para modelo
 * @param {string} text - Texto base para el slug
 * @param {object} Model - Modelo de Mongoose
 * @param {string} excludeId - ID a excluir (para updates)
 * @returns {Promise<string>} - Slug único
 */
export const generateUniqueSlug = async (text, Model, excludeId = null) => {
  let slug = textToSlug(text);
  let uniqueSlug = slug;
  let counter = 1;
  
  // Verificar si el slug existe
  while (true) {
    const query = { slug: uniqueSlug };
    
    // Excluir el ID actual si es una actualización
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    const exists = await Model.findOne(query);
    
    if (!exists) {
      break;
    }
    
    // Agregar contador al slug
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
  
  return uniqueSlug;
};

/**
 * Generar slug para BlogPost
 * @param {string} title - Título del post
 * @param {string} postId - ID del post (para updates)
 * @returns {Promise<string>} - Slug único
 */
export const generatePostSlug = async (title, postId = null) => {
  const { default: BlogPost } = await import('../models/BlogPost.js');
  return await generateUniqueSlug(title, BlogPost, postId);
};

/**
 * Generar slug para BlogCategory
 * @param {string} name - Nombre de la categoría
 * @param {string} categoryId - ID de la categoría (para updates)
 * @returns {Promise<string>} - Slug único
 */
export const generateCategorySlug = async (name, categoryId = null) => {
  const { default: BlogCategory } = await import('../models/BlogCategory.js');
  return await generateUniqueSlug(name, BlogCategory, categoryId);
};

/**
 * Generar slug para BlogTag
 * @param {string} name - Nombre del tag
 * @param {string} tagId - ID del tag (para updates)
 * @returns {Promise<string>} - Slug único
 */
export const generateTagSlug = async (name, tagId = null) => {
  const { default: BlogTag } = await import('../models/BlogTag.js');
  return await generateUniqueSlug(name, BlogTag, tagId);
};

/**
 * Validar formato de slug
 * @param {string} slug - Slug a validar
 * @returns {boolean} - true si es válido
 */
export const isValidSlug = (slug) => {
  if (!slug) return false;
  
  // Solo letras minúsculas, números y guiones
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
};

/**
 * Sanitizar slug (por si viene de usuario)
 * @param {string} slug - Slug a sanitizar
 * @returns {string} - Slug sanitizado
 */
export const sanitizeSlug = (slug) => {
  return textToSlug(slug);
};

export default {
  textToSlug,
  generateUniqueSlug,
  generatePostSlug,
  generateCategorySlug,
  generateTagSlug,
  isValidSlug,
  sanitizeSlug
};
