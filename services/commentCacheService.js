/**
 * 🚀 Comment Cache Service
 * 
 * Servicio singleton para:
 * 1. Cachear comentarios en memoria (reduce queries a MongoDB)
 * 2. Controlar límites de comentarios por usuario
 * 
 * @author Web Scuti
 * @version 1.0.0
 */

import BlogComment from '../models/BlogComment.js';

class CommentCacheService {
  constructor() {
    if (CommentCacheService.instance) {
      return CommentCacheService.instance;
    }
    
    // Caché de comentarios por post
    this.commentsCache = new Map(); // key: postId, value: { data, timestamp }
    
    // Caché de estadísticas por post
    this.statsCache = new Map(); // key: postId, value: { data, timestamp }
    
    // Caché de conteo por usuario por post (para límites)
    this.userCountCache = new Map(); // key: `${postId}_${userId}`, value: { rootCount, replyCount, timestamp }
    
    // TTL (Time To Live) en milisegundos
    this.TTL = {
      comments: 2 * 60 * 1000,      // 2 minutos para comentarios
      stats: 5 * 60 * 1000,         // 5 minutos para estadísticas
      userCount: 10 * 60 * 1000     // 10 minutos para conteo de usuario
    };
    
    // Límites de comentarios por usuario por post
    this.LIMITS = {
      maxRootComments: 2,    // Máximo 2 comentarios principales por usuario por post
      maxReplies: 2,         // Máximo 2 respuestas por usuario por post
      maxTotal: 4            // Máximo 4 comentarios totales por usuario por post
    };
    
    CommentCacheService.instance = this;
    console.log('✅ CommentCacheService inicializado');
  }

  // ============================================
  // 🔢 CONTROL DE LÍMITES POR USUARIO
  // ============================================

  /**
   * Generar clave de caché para conteo de usuario
   */
  _getUserCountKey(postId, userId) {
    return `${postId}_${userId}`;
  }

  /**
   * Obtener conteo de comentarios de un usuario en un post
   * @returns { rootCount: number, replyCount: number, total: number }
   */
  async getUserCommentCount(postId, userId) {
    const cacheKey = this._getUserCountKey(postId, userId);
    
    // Verificar caché
    const cached = this.userCountCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.TTL.userCount) {
      console.log(`✨ UserCount cache hit: ${cacheKey}`);
      return cached.data;
    }
    
    // Consultar base de datos
    console.log(`🔍 UserCount cache miss: ${cacheKey} - Consultando BD`);
    
    const [rootCount, replyCount] = await Promise.all([
      // Contar comentarios principales (sin padre)
      BlogComment.countDocuments({
        post: postId,
        'author.userId': userId,
        parentComment: null,
        status: { $nin: ['rejected', 'spam'] } // No contar rechazados
      }),
      // Contar respuestas (con padre)
      BlogComment.countDocuments({
        post: postId,
        'author.userId': userId,
        parentComment: { $ne: null },
        status: { $nin: ['rejected', 'spam'] }
      })
    ]);
    
    const data = {
      rootCount,
      replyCount,
      total: rootCount + replyCount
    };
    
    // Guardar en caché
    this.userCountCache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  }

  /**
   * Verificar si un usuario puede comentar en un post
   * @returns { canComment: boolean, reason?: string, counts: object }
   */
  async canUserComment(postId, userId, isReply = false) {
    const counts = await this.getUserCommentCount(postId, userId);
    
    // Verificar límite total
    if (counts.total >= this.LIMITS.maxTotal) {
      return {
        canComment: false,
        reason: `Has alcanzado el límite máximo de ${this.LIMITS.maxTotal} comentarios en este artículo`,
        counts
      };
    }
    
    // Verificar límite específico
    if (isReply) {
      if (counts.replyCount >= this.LIMITS.maxReplies) {
        return {
          canComment: false,
          reason: `Has alcanzado el límite de ${this.LIMITS.maxReplies} respuestas en este artículo`,
          counts
        };
      }
    } else {
      if (counts.rootCount >= this.LIMITS.maxRootComments) {
        return {
          canComment: false,
          reason: `Has alcanzado el límite de ${this.LIMITS.maxRootComments} comentarios principales en este artículo`,
          counts
        };
      }
    }
    
    return { canComment: true, counts };
  }

  /**
   * Incrementar conteo de usuario (llamar después de crear comentario)
   */
  incrementUserCount(postId, userId, isReply = false) {
    const cacheKey = this._getUserCountKey(postId, userId);
    const cached = this.userCountCache.get(cacheKey);
    
    if (cached) {
      if (isReply) {
        cached.data.replyCount++;
      } else {
        cached.data.rootCount++;
      }
      cached.data.total++;
      console.log(`📝 UserCount actualizado: ${cacheKey} -> ${JSON.stringify(cached.data)}`);
    }
  }

  /**
   * Decrementar conteo de usuario (llamar después de eliminar comentario)
   */
  decrementUserCount(postId, userId, isReply = false) {
    const cacheKey = this._getUserCountKey(postId, userId);
    const cached = this.userCountCache.get(cacheKey);
    
    if (cached) {
      if (isReply && cached.data.replyCount > 0) {
        cached.data.replyCount--;
      } else if (!isReply && cached.data.rootCount > 0) {
        cached.data.rootCount--;
      }
      if (cached.data.total > 0) {
        cached.data.total--;
      }
    }
  }

  // ============================================
  // 📦 CACHÉ DE COMENTARIOS
  // ============================================

  /**
   * Obtener comentarios de un post (con caché)
   */
  async getPostComments(postId, options = {}) {
    const { page = 1, limit = 20, forceRefresh = false } = options;
    const cacheKey = `${postId}_p${page}_l${limit}`;
    
    // Verificar caché (solo si no es forzado y es página 1)
    if (!forceRefresh && page === 1) {
      const cached = this.commentsCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.TTL.comments) {
        console.log(`✨ Comments cache hit: ${cacheKey}`);
        return cached.data;
      }
    }
    
    console.log(`🔍 Comments cache miss: ${cacheKey}`);
    
    // Consultar base de datos usando el método del modelo
    const result = await BlogComment.getPostComments(postId, {
      page,
      limit,
      sortBy: options.sortBy || 'createdAt',
      sortOrder: options.sortOrder || 'desc',
      status: 'approved',
      includeReplies: options.includeReplies !== false
    });
    
    // Guardar en caché (solo página 1)
    if (page === 1) {
      this.commentsCache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`📦 Comments cache set: ${cacheKey}`);
    }
    
    return result;
  }

  /**
   * Obtener estadísticas de comentarios de un post
   */
  async getPostStats(postId) {
    const cached = this.statsCache.get(postId);
    if (cached && (Date.now() - cached.timestamp) < this.TTL.stats) {
      console.log(`✨ Stats cache hit: ${postId}`);
      return cached.data;
    }
    
    console.log(`🔍 Stats cache miss: ${postId}`);
    
    const [total, approved, pending] = await Promise.all([
      BlogComment.countDocuments({ post: postId }),
      BlogComment.countDocuments({ post: postId, status: 'approved' }),
      BlogComment.countDocuments({ post: postId, status: 'pending' })
    ]);
    
    const data = { total, approved, pending };
    
    this.statsCache.set(postId, { data, timestamp: Date.now() });
    
    return data;
  }

  // ============================================
  // 🗑️ INVALIDACIÓN DE CACHÉ
  // ============================================

  /**
   * Invalidar caché de un post específico
   */
  invalidatePost(postId) {
    // Invalidar comentarios de este post
    for (const key of this.commentsCache.keys()) {
      if (key.startsWith(postId)) {
        this.commentsCache.delete(key);
      }
    }
    
    // Invalidar estadísticas
    this.statsCache.delete(postId);
    
    console.log(`🗑️ Cache invalidado para post: ${postId}`);
  }

  /**
   * Invalidar conteo de usuario en un post
   */
  invalidateUserCount(postId, userId) {
    const cacheKey = this._getUserCountKey(postId, userId);
    this.userCountCache.delete(cacheKey);
    console.log(`🗑️ UserCount cache invalidado: ${cacheKey}`);
  }

  /**
   * Invalidar todo el caché
   */
  invalidateAll() {
    this.commentsCache.clear();
    this.statsCache.clear();
    this.userCountCache.clear();
    console.log('🗑️ Todo el caché de comentarios invalidado');
  }

  /**
   * Limpiar entradas expiradas (para mantenimiento)
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    // Limpiar comentarios expirados
    for (const [key, value] of this.commentsCache.entries()) {
      if (now - value.timestamp > this.TTL.comments) {
        this.commentsCache.delete(key);
        cleaned++;
      }
    }
    
    // Limpiar stats expiradas
    for (const [key, value] of this.statsCache.entries()) {
      if (now - value.timestamp > this.TTL.stats) {
        this.statsCache.delete(key);
        cleaned++;
      }
    }
    
    // Limpiar conteos expirados
    for (const [key, value] of this.userCountCache.entries()) {
      if (now - value.timestamp > this.TTL.userCount) {
        this.userCountCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Limpieza de caché: ${cleaned} entradas eliminadas`);
    }
    
    return cleaned;
  }

  // ============================================
  // 📊 INFORMACIÓN DEL CACHÉ
  // ============================================

  /**
   * Obtener estadísticas del caché
   */
  getStats() {
    return {
      comments: this.commentsCache.size,
      stats: this.statsCache.size,
      userCounts: this.userCountCache.size,
      limits: this.LIMITS
    };
  }
}

// Exportar instancia singleton
const commentCacheService = new CommentCacheService();

// Limpiar caché cada 5 minutos
setInterval(() => {
  commentCacheService.cleanup();
}, 5 * 60 * 1000);

export default commentCacheService;
