/**
 * 🗄️ Modelo de Configuración de Cache para Servicios
 * 
 * Almacena la configuración global de cache para el módulo de servicios
 * Permite control granular desde el panel de administración
 * 
 * @author Web Scuti
 * @version 1.0.0
 */

import mongoose from 'mongoose';

const CacheConfigSchema = new mongoose.Schema({
  // Configuración general de cache
  moduleName: {
    type: String,
    required: true,
    unique: true,
    default: 'servicios'
  },
  
  // Estado general del cache
  enabled: {
    type: Boolean,
    default: true,
    description: 'Estado global del cache del módulo'
  },
  
  // Configuraciones específicas por tipo de ruta
  configurations: {
    // Cache para listado público de servicios
    'service-list': {
      enabled: { type: Boolean, default: true },
      maxAge: { type: Number, default: 300 },        // 5 minutos
      staleWhileRevalidate: { type: Number, default: 600 }, // 10 minutos
      public: { type: Boolean, default: true }
    },
    
    // Cache para detalle de servicio individual
    'service-detail': {
      enabled: { type: Boolean, default: true },
      maxAge: { type: Number, default: 600 },        // 10 minutos
      staleWhileRevalidate: { type: Number, default: 1800 }, // 30 minutos
      public: { type: Boolean, default: true }
    },
    
    // Cache para servicios destacados
    'featured-services': {
      enabled: { type: Boolean, default: true },
      maxAge: { type: Number, default: 900 },        // 15 minutos
      staleWhileRevalidate: { type: Number, default: 1800 }, // 30 minutos
      public: { type: Boolean, default: true }
    },
    
    // Cache para categorías de servicios
    'service-categories': {
      enabled: { type: Boolean, default: true },
      maxAge: { type: Number, default: 1800 },       // 30 minutos
      staleWhileRevalidate: { type: Number, default: 3600 }, // 1 hora
      public: { type: Boolean, default: true }
    },
    
    // Cache para paquetes de servicios
    'service-packages': {
      enabled: { type: Boolean, default: true },
      maxAge: { type: Number, default: 600 },        // 10 minutos
      staleWhileRevalidate: { type: Number, default: 1800 }, // 30 minutos
      public: { type: Boolean, default: true }
    },
    
    // Cache para estadísticas de servicios
    'service-stats': {
      enabled: { type: Boolean, default: true },
      maxAge: { type: Number, default: 1800 },       // 30 minutos
      staleWhileRevalidate: { type: Number, default: 3600 }, // 1 hora
      public: { type: Boolean, default: false }      // Datos administrativos
    }
  },
  
  // Configuración de invalidación automática
  autoInvalidation: {
    // Desactivar cache temporalmente durante ediciones
    disableDuringMutations: {
      type: Boolean,
      default: true
    },
    
    // Tiempo en segundos para reactivar cache después de mutaciones
    reactivationDelay: {
      type: Number,
      default: 30
    },
    
    // Última vez que se invalidó el cache
    lastInvalidation: {
      type: Date,
      default: null
    }
  },
  
  // Estado temporal del cache
  temporaryDisabled: {
    type: Boolean,
    default: false,
    description: 'Cache desactivado temporalmente por operaciones de edición'
  },
  
  // Timestamp para reactivación automática
  reactivateAt: {
    type: Date,
    default: null
  },
  
  // Metadatos de control
  lastModified: {
    type: Date,
    default: Date.now
  },
  
  modifiedBy: {
    type: String,
    default: 'system'
  },
  
  // Estadísticas de uso del cache
  statistics: {
    totalHits: { type: Number, default: 0 },
    totalMisses: { type: Number, default: 0 },
    totalInvalidations: { type: Number, default: 0 },
    lastReset: { type: Date, default: Date.now }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para calcular hit rate
CacheConfigSchema.virtual('hitRate').get(function() {
  const total = this.statistics.totalHits + this.statistics.totalMisses;
  return total > 0 ? ((this.statistics.totalHits / total) * 100).toFixed(2) : 0;
});

// Método estático para obtener configuración actual
CacheConfigSchema.statics.getCurrentConfig = async function() {
  let config = await this.findOne({ moduleName: 'servicios' });
  
  // Si no existe, crear configuración por defecto
  if (!config) {
    config = await this.create({
      moduleName: 'servicios',
      enabled: true
    });
  }
  
  return config;
};

// Método para verificar si el cache está habilitado para un tipo específico
CacheConfigSchema.methods.isCacheEnabled = function(cacheType) {
  // Verificar estado general
  if (!this.enabled || this.temporaryDisabled) {
    return false;
  }
  
  // Verificar si debe reactivarse automáticamente
  if (this.reactivateAt && this.reactivateAt <= new Date()) {
    this.temporaryDisabled = false;
    this.reactivateAt = null;
    this.save();
  }
  
  // Verificar configuración específica del tipo
  const typeConfig = this.configurations[cacheType];
  return typeConfig ? typeConfig.enabled : false;
};

// Método para obtener configuración de cache para un tipo específico
CacheConfigSchema.methods.getCacheConfig = function(cacheType) {
  if (!this.isCacheEnabled(cacheType)) {
    return {
      maxAge: 0,
      noCache: true,
      noStore: true,
      mustRevalidate: true
    };
  }
  
  const typeConfig = this.configurations[cacheType];
  return {
    maxAge: typeConfig.maxAge,
    staleWhileRevalidate: typeConfig.staleWhileRevalidate,
    public: typeConfig.public
  };
};

// Método para desactivar cache temporalmente
CacheConfigSchema.methods.disableTemporarily = function(duration = 30) {
  this.temporaryDisabled = true;
  this.reactivateAt = new Date(Date.now() + (duration * 1000));
  this.autoInvalidation.lastInvalidation = new Date();
  this.statistics.totalInvalidations += 1;
  
  return this.save();
};

// Método para activar/desactivar cache globalmente
CacheConfigSchema.methods.toggleCache = function(enabled, userId = 'admin') {
  this.enabled = enabled;
  this.modifiedBy = userId;
  this.lastModified = new Date();
  
  // Si se activa, quitar desactivación temporal
  if (enabled) {
    this.temporaryDisabled = false;
    this.reactivateAt = null;
  }
  
  return this.save();
};

// Método para actualizar configuración de un tipo específico
CacheConfigSchema.methods.updateTypeConfig = function(cacheType, config, userId = 'admin') {
  if (this.configurations[cacheType]) {
    Object.assign(this.configurations[cacheType], config);
    this.modifiedBy = userId;
    this.lastModified = new Date();
    this.markModified('configurations');
    
    return this.save();
  }
  
  throw new Error(`Tipo de cache '${cacheType}' no válido`);
};

// Método para incrementar estadísticas
CacheConfigSchema.methods.incrementStat = function(type) {
  if (type === 'hit') {
    this.statistics.totalHits += 1;
  } else if (type === 'miss') {
    this.statistics.totalMisses += 1;
  }
  
  return this.save();
};

// Índices para optimización
// moduleName ya tiene unique: true, no necesita índice adicional
CacheConfigSchema.index({ enabled: 1, temporaryDisabled: 1 });
CacheConfigSchema.index({ reactivateAt: 1 });

const CacheConfig = mongoose.model('CacheConfig', CacheConfigSchema);

export default CacheConfig;