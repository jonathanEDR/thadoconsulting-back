/**
 * 🚀 Post Cache Service
 * 
 * Servicio singleton para cachear posts del blog en memoria
 * Reduce queries a MongoDB en endpoints frecuentemente consultados
 * 
 * @author Web Scuti
 * @version 1.0.0
 */

import BlogPost from '../models/BlogPost.js';

class PostCacheService {
  constructor() {
    if (PostCacheService.instance) {
      return PostCacheService.instance;
    }
    
    this.cache = {
      featuredPosts: { data: null, timestamp: null },
      popularPosts: { data: null, timestamp: null },
      recentPosts: { data: null, timestamp: null }
    };
    
    // TTL (Time To Live) en milisegundos
    this.TTL = {
      featuredPosts: 10 * 60 * 1000,  // 10 minutos
      popularPosts: 5 * 60 * 1000,    // 5 minutos (cambia más frecuente)
      recentPosts: 3 * 60 * 1000      // 3 minutos (cambia muy frecuente)
    };
    
    PostCacheService.instance = this;
    console.log('✅ PostCacheService inicializado');
  }

  /**
   * Verificar si el caché está vigente
   */
  isCacheValid(cacheKey) {
    const cached = this.cache[cacheKey];
    if (!cached.data || !cached.timestamp) {
      return false;
    }
    
    const now = Date.now();
    const age = now - cached.timestamp;
    return age < this.TTL[cacheKey];
  }

  /**
   * Guardar en caché
   */
  setCache(cacheKey, data) {
    this.cache[cacheKey] = {
      data,
      timestamp: Date.now()
    };
    console.log(`📦 Cache actualizado: ${cacheKey} (${data?.length || 0} items)`);
  }

  /**
   * Obtener del caché
   */
  getCache(cacheKey) {
    if (this.isCacheValid(cacheKey)) {
      console.log(`✨ Cache hit: ${cacheKey}`);
      return this.cache[cacheKey].data;
    }
    console.log(`❌ Cache miss: ${cacheKey}`);
    return null;
  }

  /**
   * Invalidar caché específico
   */
  invalidate(cacheKey) {
    if (cacheKey) {
      this.cache[cacheKey] = { data: null, timestamp: null };
      console.log(`🗑️  Cache invalidado: ${cacheKey}`);
    } else {
      // Invalidar todo
      Object.keys(this.cache).forEach(key => {
        this.cache[key] = { data: null, timestamp: null };
      });
      console.log('🗑️  Todo el cache invalidado');
    }
  }

  /**
   * Obtener posts destacados (con caché)
   */
  async getFeaturedPosts(limit = 5) {
    const cacheKey = 'featuredPosts';
    
    // Intentar obtener del caché
    const cached = this.getCache(cacheKey);
    if (cached) {
      // Aplicar límite al caché
      return cached.slice(0, limit);
    }

    // Si no está en caché, consultar DB
    const posts = await BlogPost.find({
      isPublished: true,
      status: 'published',
      isFeatured: true
    })
      .populate('author', 'firstName lastName email username profileImage')
      .populate('category', 'name slug color')
      .populate('tags', 'name slug color')
      .select('title slug excerpt featuredImage publishedAt readingTime stats analytics.views analytics.likes')
      .sort('-publishedAt')
      .limit(20) // Cachear hasta 20, pero devolver según limit
      .lean();

    // Guardar en caché
    this.setCache(cacheKey, posts);
    
    return posts.slice(0, limit);
  }

  /**
   * Obtener posts populares (con caché)
   */
  async getPopularPosts(limit = 5, days = 30) {
    const cacheKey = 'popularPosts';
    
    // Intentar obtener del caché
    const cached = this.getCache(cacheKey);
    if (cached) {
      // Aplicar límite al caché
      return cached.slice(0, limit);
    }

    // Si no está en caché, usar el método estático del modelo
    const posts = await BlogPost.getPopularPosts(20, days); // Cachear hasta 20
    
    // Guardar en caché
    this.setCache(cacheKey, posts);
    
    return posts.slice(0, limit);
  }

  /**
   * Obtener posts recientes (con caché)
   */
  async getRecentPosts(limit = 5) {
    const cacheKey = 'recentPosts';
    
    // Intentar obtener del caché
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached.slice(0, limit);
    }

    // Si no está en caché, consultar DB
    const posts = await BlogPost.find({
      isPublished: true,
      status: 'published'
    })
      .populate('author', 'firstName lastName')
      .populate('category', 'name slug color')
      .populate('tags', 'name slug')
      .select('title slug excerpt featuredImage publishedAt readingTime')
      .sort('-publishedAt')
      .limit(20) // Cachear hasta 20
      .lean();

    // Guardar en caché
    this.setCache(cacheKey, posts);
    
    return posts.slice(0, limit);
  }

  /**
   * Invalidar caché cuando se crea/actualiza/elimina un post
   */
  invalidateOnPostChange() {
    this.invalidate(); // Invalida todos los cachés
  }

  /**
   * Obtener estadísticas del caché
   */
  getStats() {
    return {
      featuredPosts: {
        cached: this.cache.featuredPosts.data?.length || 0,
        valid: this.isCacheValid('featuredPosts'),
        age: this.cache.featuredPosts.timestamp 
          ? Math.round((Date.now() - this.cache.featuredPosts.timestamp) / 1000) 
          : null
      },
      popularPosts: {
        cached: this.cache.popularPosts.data?.length || 0,
        valid: this.isCacheValid('popularPosts'),
        age: this.cache.popularPosts.timestamp 
          ? Math.round((Date.now() - this.cache.popularPosts.timestamp) / 1000) 
          : null
      },
      recentPosts: {
        cached: this.cache.recentPosts.data?.length || 0,
        valid: this.isCacheValid('recentPosts'),
        age: this.cache.recentPosts.timestamp 
          ? Math.round((Date.now() - this.cache.recentPosts.timestamp) / 1000) 
          : null
      }
    };
  }
}

// Exportar instancia singleton
const postCacheService = new PostCacheService();
export default postCacheService;
