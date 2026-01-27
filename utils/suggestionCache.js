/**
 * 🧠 Memory Cache para el Backend
 * Cache simple en memoria para respuestas de OpenAI
 */

import crypto from 'crypto';
import logger from './logger.js';

class MemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutos
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
  }

  // Generar clave de cache
  generateKey(prompt, options = {}) {
    const data = {
      prompt: prompt.slice(-200), // Últimos 200 caracteres
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 150
    };
    
    return crypto.createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex')
      .slice(0, 16);
  }

  // Obtener del cache
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Verificar expiración
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      logger.debug(`💾 Cache expired: ${key}`);
      return null;
    }

    this.stats.hits++;
    logger.debug(`💾 Cache hit: ${key}`);
    return item.value;
  }

  // Guardar en cache
  set(key, value, ttl = this.defaultTTL) {
    // Limpiar espacio si es necesario
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const expires = Date.now() + ttl;
    this.cache.set(key, {
      value,
      expires,
      created: Date.now()
    });

    this.stats.sets++;
    logger.debug(`💾 Cache set: ${key} (TTL: ${ttl}ms)`);
  }

  // Eliminar entrada más antigua
  evictOldest() {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      logger.debug(`🗑️ Cache evicted: ${oldestKey}`);
    }
  }

  // Limpiar cache expirado
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`🧹 Cache cleanup: ${cleaned} expired entries removed`);
    }

    return cleaned;
  }

  // Obtener estadísticas
  getStats() {
    const now = Date.now();
    const activeEntries = Array.from(this.cache.values())
      .filter(item => now <= item.expires).length;

    return {
      ...this.stats,
      size: this.cache.size,
      activeEntries,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) * 100 || 0,
      maxSize: this.maxSize
    };
  }

  // Limpiar todo el cache
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`🗑️ Cache cleared: ${size} entries removed`);
  }
}

// Instancia singleton
const suggestionCache = new MemoryCache({
  maxSize: 150,
  defaultTTL: 300000 // 5 minutos
});

// Auto-cleanup cada 2 minutos
setInterval(() => {
  suggestionCache.cleanup();
}, 120000);

export default suggestionCache;