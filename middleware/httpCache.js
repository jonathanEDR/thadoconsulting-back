/**
 * 🌐 Middleware de Cache HTTP
 * 
 * Implementa headers de cache para optimizar respuestas HTTP:
 * - Cache-Control
 * - ETag
 * - Last-Modified
 * - Expires
 * 
 * Evita descargas innecesarias cuando el contenido no ha cambiado
 * 
 * @author Web Scuti
 * @version 1.0.0
 */

import crypto from 'crypto';

/**
 * Configuración de cache por tipo de ruta
 */
const CACHE_CONFIG = {
  // Rutas públicas con cache largo
  'public-static': {
    maxAge: 86400,        // 24 horas
    public: true,
    immutable: false,
  },
  
  // Posts publicados (cache moderado)
  'post-list': {
    maxAge: 300,          // 5 minutos
    public: true,
    staleWhileRevalidate: 60,
  },
  
  // Post individual
  'post-detail': {
    maxAge: 600,          // 10 minutos
    public: true,
    staleWhileRevalidate: 120,
  },
  
  // Posts destacados/populares
  'post-featured': {
    maxAge: 600,          // 10 minutos
    public: true,
    staleWhileRevalidate: 60,
  },
  
  // Categorías y tags
  'taxonomy': {
    maxAge: 1800,         // 30 minutos
    public: true,
    staleWhileRevalidate: 300,
  },
  
  // Sitemaps y feeds
  'seo-files': {
    maxAge: 3600,         // 1 hora
    public: true,
  },
  
  // Imágenes y assets
  'assets': {
    maxAge: 31536000,     // 1 año
    public: true,
    immutable: true,
  },
  
  // Sin cache (admin, autenticado)
  'no-cache': {
    maxAge: 0,
    public: false,
    mustRevalidate: true,
  },
};

/**
 * Generar ETag basado en contenido
 */
function generateETag(data) {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Construir header Cache-Control
 */
function buildCacheControl(config) {
  const parts = [];
  
  if (config.public) {
    parts.push('public');
  } else {
    parts.push('private');
  }
  
  if (config.maxAge !== undefined) {
    parts.push(`max-age=${config.maxAge}`);
  }
  
  if (config.staleWhileRevalidate) {
    parts.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }
  
  if (config.immutable) {
    parts.push('immutable');
  }
  
  if (config.mustRevalidate) {
    parts.push('must-revalidate');
  }
  
  return parts.join(', ');
}

/**
 * Middleware de cache para posts públicos
 */
export const cachePublicPosts = (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    // Generar ETag
    const etag = generateETag(data);
    
    // Verificar si el cliente tiene la versión más reciente
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    
    // Configurar headers de cache
    const cacheControl = buildCacheControl(CACHE_CONFIG['post-list']);
    
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('ETag', etag);
    res.setHeader('Vary', 'Accept-Encoding');
    
    return originalJson(data);
  };
  
  next();
};

/**
 * Middleware de cache para post individual
 */
export const cachePostDetail = (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    const etag = generateETag(data);
    
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    
    const cacheControl = buildCacheControl(CACHE_CONFIG['post-detail']);
    
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('ETag', etag);
    res.setHeader('Vary', 'Accept-Encoding');
    
    // Si el post tiene fecha de actualización, usar Last-Modified
    if (data.data?.post?.updatedAt) {
      const lastModified = new Date(data.data.post.updatedAt).toUTCString();
      res.setHeader('Last-Modified', lastModified);
      
      // Verificar If-Modified-Since
      if (req.headers['if-modified-since'] === lastModified) {
        return res.status(304).end();
      }
    }
    
    return originalJson(data);
  };
  
  next();
};

/**
 * Middleware de cache para posts destacados/populares
 */
export const cacheFeaturedPosts = (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    const etag = generateETag(data);
    
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    
    const cacheControl = buildCacheControl(CACHE_CONFIG['post-featured']);
    
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('ETag', etag);
    res.setHeader('Vary', 'Accept-Encoding');
    
    return originalJson(data);
  };
  
  next();
};

/**
 * Middleware de cache para categorías y tags
 */
export const cacheTaxonomy = (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    const etag = generateETag(data);
    
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    
    const cacheControl = buildCacheControl(CACHE_CONFIG['taxonomy']);
    
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('ETag', etag);
    res.setHeader('Vary', 'Accept-Encoding');
    
    return originalJson(data);
  };
  
  next();
};

/**
 * Middleware de cache para sitemaps y feeds
 */
export const cacheSEOFiles = (req, res, next) => {
  const originalSend = res.send.bind(res);
  
  res.send = function(data) {
    const etag = generateETag(data);
    
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    
    const cacheControl = buildCacheControl(CACHE_CONFIG['seo-files']);
    
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('ETag', etag);
    
    return originalSend(data);
  };
  
  next();
};

/**
 * Middleware para deshabilitar cache (rutas admin/autenticadas)
 */
export const noCache = (req, res, next) => {
  const cacheControl = buildCacheControl(CACHE_CONFIG['no-cache']);
  
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  next();
};

/**
 * Middleware genérico de cache configurable
 */
export const cache = (type) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      const etag = generateETag(data);
      
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      
      const cacheControl = buildCacheControl(CACHE_CONFIG[type]);
      
      res.setHeader('Cache-Control', cacheControl);
      res.setHeader('ETag', etag);
      res.setHeader('Vary', 'Accept-Encoding');
      
      return originalJson(data);
    };
    
    next();
  };
};

export default {
  cachePublicPosts,
  cachePostDetail,
  cacheFeaturedPosts,
  cacheTaxonomy,
  cacheSEOFiles,
  noCache,
  cache,
};
