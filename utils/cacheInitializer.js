/**
 * 🚀 Script de Inicialización del Cache de Servicios
 * 
 * Crea la configuración inicial del cache en la base de datos
 * Se ejecuta automáticamente al inicializar el servidor
 * 
 * @author Web Scuti
 * @version 1.0.0
 */

import CacheConfig from '../models/CacheConfig.js';
import INIT_CONFIG from '../config/initConfig.js';

/**
 * Inicializa la configuración de cache por defecto
 */
export const inicializarCache = async () => {
  try {
    if (!INIT_CONFIG.INIT_CACHE_CONFIG) {
      return; // Salir silenciosamente si está desactivado
    }
    
    console.log('🔧 Inicializando configuración de cache...');
    
    // Verificar si ya existe configuración
    let config = await CacheConfig.findOne({ moduleName: 'servicios' });
    
    if (config) {
      console.log('✅ Configuración de cache ya existe');
      
      // Verificar si necesita actualización de esquema
      if (!config.autoInvalidation || !config.statistics) {
        console.log('🔄 Actualizando esquema de configuración de cache...');
        
        // Agregar campos faltantes
        if (!config.autoInvalidation) {
          config.autoInvalidation = {
            disableDuringMutations: true,
            reactivationDelay: 30,
            lastInvalidation: null
          };
        }
        
        if (!config.statistics) {
          config.statistics = {
            totalHits: 0,
            totalMisses: 0,
            totalInvalidations: 0,
            lastReset: new Date()
          };
        }
        
        await config.save();
        console.log('✅ Esquema de cache actualizado');
      }
      
      return config;
    }
    
    // Crear configuración por primera vez
    config = new CacheConfig({
      moduleName: 'servicios',
      enabled: true,
      temporaryDisabled: false,
      
      configurations: {
        'service-list': {
          enabled: true,
          maxAge: 300,        // 5 minutos
          staleWhileRevalidate: 600,  // 10 minutos
          public: true
        },
        'service-detail': {
          enabled: true,
          maxAge: 600,        // 10 minutos
          staleWhileRevalidate: 1800, // 30 minutos
          public: true
        },
        'featured-services': {
          enabled: true,
          maxAge: 900,        // 15 minutos
          staleWhileRevalidate: 1800, // 30 minutos
          public: true
        },
        'service-categories': {
          enabled: true,
          maxAge: 1800,       // 30 minutos
          staleWhileRevalidate: 3600, // 1 hora
          public: true
        },
        'service-packages': {
          enabled: true,
          maxAge: 600,        // 10 minutos
          staleWhileRevalidate: 1800, // 30 minutos
          public: true
        },
        'service-stats': {
          enabled: true,
          maxAge: 1800,       // 30 minutos
          staleWhileRevalidate: 3600, // 1 hora
          public: false       // Datos administrativos
        }
      },
      
      autoInvalidation: {
        disableDuringMutations: false,  // ❌ DESHABILITADO: Solo control manual
        reactivationDelay: 30,
        lastInvalidation: null
      },
      
      statistics: {
        totalHits: 0,
        totalMisses: 0,
        totalInvalidations: 0,
        lastReset: new Date()
      },
      
      modifiedBy: 'system',
      lastModified: new Date()
    });
    
    await config.save();
    
    console.log('✅ Configuración inicial de cache creada exitosamente');
    console.log('📊 Estado del cache:');
    console.log(`   - Global: ${config.enabled ? 'Activado' : 'Desactivado'}`);
    console.log(`   - Auto-invalidación: ${config.autoInvalidation.disableDuringMutations ? 'Activada' : 'Desactivada'}`);
    console.log(`   - Tipos configurados: ${Object.keys(config.configurations).length}`);
    
    return config;
    
  } catch (error) {
    console.error('🚨 Error inicializando configuración de cache:', error);
    throw error;
  }
};

/**
 * Verificar estado del cache y mostrar información
 */
export const checkCacheStatus = async () => {
  try {
    const config = await CacheConfig.getCurrentConfig();
    
    const status = {
      enabled: config.enabled,
      temporaryDisabled: config.temporaryDisabled,
      reactivateAt: config.reactivateAt,
      activeTypes: Object.keys(config.configurations).filter(
        type => config.configurations[type].enabled
      ),
      statistics: config.statistics,
      hitRate: config.hitRate
    };
    
    console.log('📈 Estado actual del cache:');
    console.log(`   - Estado global: ${status.enabled ? 'Activado' : 'Desactivado'}`);
    console.log(`   - Desactivado temporalmente: ${status.temporaryDisabled ? 'Sí' : 'No'}`);
    console.log(`   - Tipos activos: ${status.activeTypes.length}/${Object.keys(config.configurations).length}`);
    console.log(`   - Hit rate: ${status.hitRate}%`);
    console.log(`   - Total hits: ${status.statistics.totalHits}`);
    console.log(`   - Total misses: ${status.statistics.totalMisses}`);
    
    return status;
    
  } catch (error) {
    console.error('🚨 Error verificando estado del cache:', error);
    return null;
  }
};

export default {
  inicializarCache,
  checkCacheStatus
};