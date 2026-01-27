/**
 * 🚀 Configuración de Optimización de Consultas MongoDB
 * 
 * Configuraciones globales para prevenir:
 * - Memory leaks
 * - Consultas sin límite
 * - Timeouts indefinidos
 * - Sobrecarga del servidor
 * 
 * @author Web Scuti
 * @version 1.0.0
 */

/**
 * Límites de seguridad para consultas
 */
export const QUERY_LIMITS = {
  // Límites por tipo de consulta
  DEFAULT_LIMIT: 10,
  MAX_POSTS_PER_PAGE: 50,
  MAX_POSTS_FOR_ANALYSIS: 50,
  MAX_POSTS_FOR_PERFORMANCE: 100,
  MAX_CATEGORIES: 100,
  MAX_TAGS: 200,
  MAX_SEARCH_RESULTS: 50,
  MAX_RELATED_POSTS: 5,
  MAX_POPULAR_POSTS: 20,
  MAX_FEATURED_POSTS: 10,
  
  // Cache
  CACHE_TTL_FEATURED: 10 * 60 * 1000,  // 10 minutos
  CACHE_TTL_POPULAR: 5 * 60 * 1000,    // 5 minutos
  CACHE_TTL_RECENT: 3 * 60 * 1000,     // 3 minutos
  
  // Timeouts (en milisegundos)
  QUERY_TIMEOUT: 15000,                 // 15 segundos
  AGGREGATE_TIMEOUT: 30000,             // 30 segundos
  SEARCH_TIMEOUT: 20000,                // 20 segundos
};

/**
 * Campos comunes para populate optimizado
 */
export const POPULATE_FIELDS = {
  AUTHOR_PUBLIC: 'firstName lastName avatar username',
  AUTHOR_ADMIN: 'firstName lastName email avatar username role',
  CATEGORY: 'name slug color description',
  CATEGORY_MINIMAL: 'name slug',
  TAG: 'name slug color',
  TAG_MINIMAL: 'name slug',
  POST_LIST: 'title slug excerpt featuredImage category tags publishedAt readingTime analytics.views isFeatured',
  POST_DETAIL: 'title slug excerpt content featuredImage category tags author publishedAt readingTime analytics allowComments',
};

/**
 * Configuración de select para consultas optimizadas
 */
export const SELECT_FIELDS = {
  POST_CARD: 'title slug excerpt featuredImage category tags publishedAt readingTime analytics.views analytics.likes isFeatured',
  POST_ADMIN: 'title slug excerpt featuredImage category tags author status isPublished publishedAt readingTime analytics createdAt updatedAt',
  CATEGORY_LIST: 'name slug color description postCount order isActive',
  TAG_LIST: 'name slug color usageCount isActive',
  AUTHOR_PROFILE: 'firstName lastName avatar username bio blogProfile',
};

/**
 * Wrapper para aplicar timeout a una consulta
 * @param {Query} query - Consulta de Mongoose
 * @param {number} timeout - Timeout en milisegundos
 * @returns {Query} - Consulta con timeout aplicado
 */
export const withTimeout = (query, timeout = QUERY_LIMITS.QUERY_TIMEOUT) => {
  return query.maxTimeMS(timeout);
};

/**
 * Validar y sanitizar límite de paginación
 * @param {number|string} limit - Límite solicitado
 * @param {number} max - Límite máximo permitido
 * @returns {number} - Límite validado
 */
export const validateLimit = (limit, max = QUERY_LIMITS.MAX_POSTS_PER_PAGE) => {
  const parsed = parseInt(limit) || QUERY_LIMITS.DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, 1), max);
};

/**
 * Validar y sanitizar página de paginación
 * @param {number|string} page - Página solicitada
 * @returns {number} - Página validada
 */
export const validatePage = (page) => {
  const parsed = parseInt(page) || 1;
  return Math.max(parsed, 1);
};

/**
 * Crear objeto de paginación optimizado
 * @param {number} page - Página actual
 * @param {number} limit - Límite por página
 * @param {number} total - Total de documentos
 * @returns {Object} - Objeto de paginación
 */
export const createPagination = (page, limit, total) => {
  const pages = Math.ceil(total / limit);
  
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
    nextPage: page < pages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
  };
};

/**
 * Opciones por defecto para consultas lean
 */
export const LEAN_OPTIONS = {
  virtuals: false,
  getters: false,
  defaults: false,
};

/**
 * Configuración de proyección para optimizar queries
 * @param {string[]} fields - Campos a incluir
 * @returns {Object} - Objeto de proyección
 */
export const createProjection = (fields) => {
  return fields.reduce((acc, field) => {
    acc[field] = 1;
    return acc;
  }, {});
};

/**
 * Middleware para logging de consultas lentas
 * Úsalo en desarrollo para identificar problemas de performance
 */
export const logSlowQuery = (queryName, startTime, threshold = 1000) => {
  const duration = Date.now() - startTime;
  
  if (duration > threshold) {
    console.warn(`⚠️  SLOW QUERY: ${queryName} tomó ${duration}ms`);
    console.warn(`   Considera optimizar índices o usar caché`);
  }
  
  return duration;
};

/**
 * Configuración de índices recomendados para performance
 * (Referencia para verificar que estén creados en el modelo)
 */
export const RECOMMENDED_INDEXES = {
  BlogPost: [
    { fields: { isPublished: 1, status: 1, publishedAt: -1 }, name: 'published_posts_optimized' },
    { fields: { isPublished: 1, status: 1, isFeatured: 1, publishedAt: -1 }, name: 'featured_posts_optimized' },
    { fields: { category: 1, isPublished: 1, status: 1, publishedAt: -1 }, name: 'category_posts_optimized' },
    { fields: { tags: 1, isPublished: 1, status: 1, publishedAt: -1 }, name: 'tag_posts_optimized' },
    { fields: { author: 1, isPublished: 1, status: 1, publishedAt: -1 }, name: 'author_posts_optimized' },
    { fields: { slug: 1 }, unique: true, name: 'slug_unique' },
  ],
  BlogCategory: [
    { fields: { isActive: 1, order: 1 }, name: 'active_categories' },
    { fields: { slug: 1 }, unique: true, name: 'slug_unique' },
  ],
  BlogTag: [
    { fields: { isActive: 1, usageCount: -1 }, name: 'active_popular_tags' },
    { fields: { slug: 1 }, unique: true, name: 'slug_unique' },
  ],
};

/**
 * Best practices para consultas
 */
export const BEST_PRACTICES = {
  ALWAYS_USE_LEAN: 'Siempre usa .lean() para consultas de solo lectura',
  LIMIT_POPULATE_FIELDS: 'Especifica solo los campos necesarios en populate',
  USE_SELECT: 'Usa .select() para limitar campos devueltos',
  SET_LIMITS: 'Siempre establece límites máximos en consultas',
  USE_INDEXES: 'Asegúrate de que las consultas usen índices apropiados',
  CACHE_FREQUENT: 'Cachea consultas frecuentes (featured, popular)',
  TIMEOUT_QUERIES: 'Establece timeouts para prevenir queries colgadas',
  AVOID_REGEX_START: 'Evita regex que no empiecen con ^ (no usan índices)',
  PAGINATION: 'Siempre pagina resultados, nunca traigas todo',
  LEAN_VIRTUALS: 'Si necesitas virtuals, usa .lean({ virtuals: true })',
};

export default {
  QUERY_LIMITS,
  POPULATE_FIELDS,
  SELECT_FIELDS,
  withTimeout,
  validateLimit,
  validatePage,
  createPagination,
  LEAN_OPTIONS,
  createProjection,
  logSlowQuery,
  RECOMMENDED_INDEXES,
  BEST_PRACTICES,
};
