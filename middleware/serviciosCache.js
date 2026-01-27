/**
 * 🌐 Middleware de Cache HTTP para Servicios - Versión Controlada
 * 
 * Implementa headers de cache con control dinámico desde base de datos:
 * - Cache-Control
 * - ETag
 * - Last-Modified
 * - Expires
 * 
 * ✅ CACHE CONTROLADO: Se puede activar/desactivar desde el panel de admin
 * ✅ INVALIDACIÓN AUTOMÁTICA: Durante operaciones de edición/creación
 * ✅ CONFIGURACIÓN GRANULAR: Por tipo de ruta
 * 
 * @author Web Scuti
 * @version 2.0.0
 */

import crypto from 'crypto';
import CacheConfig from '../models/CacheConfig.js';

/**
 * Configuración de cache por defecto (fallback si no hay DB)
 */
const DEFAULT_CACHE_CONFIG = {
  'service-list': {
    maxAge: 300,        // 5 minutos
    staleWhileRevalidate: 600,
    public: true,
    enabled: true
  },
  'service-detail': {
    maxAge: 600,        // 10 minutos
    staleWhileRevalidate: 1800,
    public: true,
    enabled: true
  },
  'featured-services': {
    maxAge: 900,        // 15 minutos
    staleWhileRevalidate: 1800,
    public: true,
    enabled: true
  },
  'service-categories': {
    maxAge: 1800,       // 30 minutos
    staleWhileRevalidate: 3600,
    public: true,
    enabled: true
  },
  'service-packages': {
    maxAge: 600,        // 10 minutos
    staleWhileRevalidate: 1800,
    public: true,
    enabled: true
  },
  'service-stats': {
    maxAge: 1800,       // 30 minutos
    staleWhileRevalidate: 3600,
    public: false,
    enabled: true
  },
  'no-cache': {
    maxAge: 0,
    noCache: true,
    noStore: true,
    mustRevalidate: true
  }
};

// Cache en memoria para configuración de DB (evitar consultas constantes)
let cachedConfig = null;
let configCacheTime = 0;
const CONFIG_CACHE_DURATION = 60000; // 1 minuto

/**
 * Obtener configuración de cache desde DB con cache en memoria
 */
async function getCacheConfiguration() {
  const now = Date.now();
  
  // Si tenemos config en cache y no ha expirado, usarla
  if (cachedConfig && (now - configCacheTime) < CONFIG_CACHE_DURATION) {
    return cachedConfig;
  }
  
  try {
    const dbConfig = await CacheConfig.getCurrentConfig();
    cachedConfig = dbConfig;
    configCacheTime = now;
    return dbConfig;
  } catch (error) {
    console.error('🚨 Error obteniendo configuración de cache:', error.message);
    // Fallback a configuración por defecto
    return {
      enabled: true,
      configurations: DEFAULT_CACHE_CONFIG,
      isCacheEnabled: (type) => DEFAULT_CACHE_CONFIG[type]?.enabled || false,
      getCacheConfig: (type) => DEFAULT_CACHE_CONFIG[type] || DEFAULT_CACHE_CONFIG['no-cache'],
      incrementStat: () => {}
    };
  }
}

/**
 * Invalidar cache de configuración (para forzar recarga desde DB)
 */
export function invalidateConfigCache() {
  cachedConfig = null;
  configCacheTime = 0;
}

/**
 * Generar ETag basado en el contenido
 */
const generateETag = (data) => {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('md5').update(content).digest('hex');
};

/**
 * Construir header Cache-Control
 */
const buildCacheControl = (config) => {
  const directives = [];
  
  if (config.noCache) {
    directives.push('no-cache');
  }
  
  if (config.noStore) {
    directives.push('no-store');
  }
  
  if (config.mustRevalidate) {
    directives.push('must-revalidate');
  }
  
  if (config.public) {
    directives.push('public');
  } else if (config.public === false) {
    directives.push('private');
  }
  
  if (config.maxAge !== undefined) {
    directives.push(`max-age=${config.maxAge}`);
  }
  
  if (config.staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }
  
  return directives.join(', ');
};

/**
 * Middleware base para cache con configuración dinámica
 */
const createCacheMiddleware = (configKey) => {
  return async (req, res, next) => {
    try {
      // Obtener configuración actual desde DB
      const cacheConfig = await getCacheConfiguration();
      
      // Verificar si el cache está habilitado para este tipo
      if (!cacheConfig.isCacheEnabled(configKey)) {
        // Cache desactivado - aplicar headers no-cache
        const noCacheConfig = {
          maxAge: 0,
          noCache: true,
          noStore: true,
          mustRevalidate: true
        };
        
        res.setHeader('Cache-Control', buildCacheControl(noCacheConfig));
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // 📝 Headers de debugging
        res.setHeader('X-Cache-Status', 'DISABLED');
        res.setHeader('X-Cache-Type', configKey);
        res.setHeader('X-Cache-Reason', cacheConfig.temporaryDisabled ? 'TEMPORARY_DISABLED' : 'GLOBALLY_DISABLED');
        
        console.log(`❌ Cache DESACTIVADO para ${configKey} en ${req.originalUrl || req.url}`);
        
        return next();
      }
      
      // Cache activado - obtener configuración específica
      const config = cacheConfig.getCacheConfig(configKey);
      
      // Interceptar res.json para aplicar cache headers
      const originalJson = res.json;
      res.json = function(data) {
        // Generar ETag
        const etag = generateETag(data);
        
        // Verificar If-None-Match
        if (req.headers['if-none-match'] === etag) {
          // Cache hit
          cacheConfig.incrementStat('hit');
          console.log(`🎯 Cache HIT para ${configKey} en ${req.originalUrl || req.url} - ETag match`);
          
          // Agregar headers de debugging para HIT
          res.setHeader('X-Cache-Status', 'ACTIVE');
          res.setHeader('X-Cache-Type', configKey);
          res.setHeader('X-Cache-Response', 'HIT');
          res.setHeader('X-Cache-Hit-Rate', cacheConfig.hitRate || '0');
          
          return res.status(304).end();
        }
        
        // Verificar If-Modified-Since
        const lastModified = new Date(Date.now() - (config.maxAge * 1000)).toUTCString();
        if (req.headers['if-modified-since'] && 
            new Date(req.headers['if-modified-since']) >= new Date(lastModified)) {
          // Cache hit
          cacheConfig.incrementStat('hit');
          console.log(`🎯 Cache HIT para ${configKey} en ${req.originalUrl || req.url} - Last-Modified match`);
          
          // Agregar headers de debugging para HIT
          res.setHeader('X-Cache-Status', 'ACTIVE');
          res.setHeader('X-Cache-Type', configKey);
          res.setHeader('X-Cache-Response', 'HIT');
          res.setHeader('X-Cache-Hit-Rate', cacheConfig.hitRate || '0');
          
          return res.status(304).end();
        }
        
        // Cache miss
        cacheConfig.incrementStat('miss');
        
        // Aplicar headers de cache
        res.setHeader('Cache-Control', buildCacheControl(config));
        res.setHeader('ETag', etag);
        res.setHeader('Last-Modified', lastModified);
        
        if (config.maxAge > 0) {
          const expires = new Date(Date.now() + (config.maxAge * 1000)).toUTCString();
          res.setHeader('Expires', expires);
        }
        
        // 📝 Headers de debugging (siempre activos para monitoreo)
        res.setHeader('X-Cache-Status', 'ACTIVE');
        res.setHeader('X-Cache-Type', configKey);
        res.setHeader('X-Cache-MaxAge', config.maxAge);
        res.setHeader('X-Cache-Hit-Rate', cacheConfig.hitRate || '0');
        res.setHeader('X-Cache-Response', 'MISS');
        
        console.log(`✅ Cache ACTIVO para ${configKey} en ${req.originalUrl || req.url} - MISS (maxAge: ${config.maxAge}s)`);
        
        // Llamar al método original
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error(`🚨 Error en middleware de cache (${configKey}):`, error.message);
      // En caso de error, continuar sin cache
      next();
    }
  };
};

// ============================================
// MIDDLEWARES ESPECÍFICOS
// ============================================

/**
 * Cache para listado público de servicios
 */
export const cachePublicServices = createCacheMiddleware('service-list');

/**
 * Cache para detalle de servicio individual
 */
export const cacheServiceDetail = createCacheMiddleware('service-detail');

/**
 * Cache para servicios destacados
 */
export const cacheFeaturedServices = createCacheMiddleware('featured-services');

/**
 * Cache para categorías de servicios
 */
export const cacheServiceCategories = createCacheMiddleware('service-categories');

/**
 * Cache para paquetes de servicios
 */
export const cacheServicePackages = createCacheMiddleware('service-packages');

/**
 * Cache para estadísticas de servicios
 */
export const cacheServiceStats = createCacheMiddleware('service-stats');

/**
 * Sin cache para rutas administrativas
 */
export const noCache = createCacheMiddleware('no-cache');

/**
 * Middleware para invalidar cache en mutaciones (SOLO HEADERS - SIN AUTO-DESACTIVACIÓN)
 */
export const invalidateCacheOnMutation = async (req, res, next) => {
  try {
    const originalJson = res.json;
    
    res.json = async function(data) {
      // Si es una operación exitosa (POST, PUT, DELETE)
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && res.statusCode < 400) {
        
        // 📝 SOLO agregar headers para invalidar cache del cliente
        // ❌ NO desactivar cache automáticamente (solo control manual)
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('X-Cache-Invalidated', 'true');
        
        console.log(`🗑️ Headers de invalidación enviados por ${req.method} ${req.originalUrl} (auto-invalidación DESHABILITADA)`);
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('🚨 Error en invalidateCacheOnMutation:', error.message);
    next();
  }
};

/**
 * Middleware para forzar invalidación manual de cache
 */
export const forceCacheInvalidation = async (req, res, next) => {
  try {
    const cacheConfig = await getCacheConfiguration();
    await cacheConfig.disableTemporarily(0); // Invalidar inmediatamente
    invalidateConfigCache();
    
    console.log('🔄 Cache invalidado manualmente');
    next();
  } catch (error) {
    console.error('🚨 Error en invalidación manual de cache:', error.message);
    next();
  }
};

export default {
  cachePublicServices,
  cacheServiceDetail,
  cacheFeaturedServices,
  cacheServiceCategories,
  cacheServicePackages,
  cacheServiceStats,
  noCache,
  invalidateCacheOnMutation,
  forceCacheInvalidation,
  invalidateConfigCache
};