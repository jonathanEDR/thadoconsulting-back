/**
 * 🗑️ Utilidad para Invalidación Automática de Cache
 * 
 * SOLUCIÓN REAL: Deshabilita el cache directamente en CacheConfig
 * que es el sistema principal de cache del backend.
 * 
 * @author Web Scuti
 * @version 2.0.0
 */

import CacheConfig from '../models/CacheConfig.js';
import { invalidateConfigCache } from '../middleware/serviciosCache.js';

/**
 * Invalidar todos los cachés relacionados con servicios
 * SOLUCIÓN DIRECTA: Deshabilitar el cache en CacheConfig por completo
 */
export const invalidateServicesCache = async () => {
  try {
    console.log('\n🔄 [CACHE] ========================================');
    console.log('🔄 [CACHE] INICIANDO INVALIDACIÓN DE CACHE');
    console.log('🔄 [CACHE] ========================================\n');
    
    // 1. Invalidar cache en memoria primero
    invalidateConfigCache();
    console.log('✅ [CACHE] Paso 1: Cache en memoria invalidado');
    
    // 2. DESHABILITAR EL CACHE COMPLETAMENTE EN LA BASE DE DATOS
    try {
      // Buscar la configuración activa
      const cacheConfig = await CacheConfig.findOne({ isActive: true });
      
      if (cacheConfig) {
        console.log('📋 [CACHE] Configuración encontrada - Deshabilitando cache...');
        
        // DESHABILITAR COMPLETAMENTE
        cacheConfig.enabled = false;
        cacheConfig.lastUpdated = new Date();
        cacheConfig.temporaryDisable = true;
        cacheConfig.disableUntil = new Date(Date.now() + 120000); // 2 minutos
        
        // Deshabilitar también todas las configuraciones individuales
        if (cacheConfig.configurations) {
          Object.keys(cacheConfig.configurations).forEach(key => {
            if (cacheConfig.configurations[key]) {
              cacheConfig.configurations[key].enabled = false;
            }
          });
        }
        
        await cacheConfig.save();
        
        console.log('✅ [CACHE] Paso 2: Cache DESHABILITADO en CacheConfig');
        console.log('⏰ [CACHE] Se reactivará en 2 minutos automáticamente');
      } else {
        console.log('⚠️ [CACHE] No se encontró configuración, creando nueva...');
        
        // Crear configuración deshabilitada
        await CacheConfig.create({
          isActive: true,
          enabled: false,
          temporaryDisable: true,
          disableUntil: new Date(Date.now() + 120000),
          lastUpdated: new Date()
        });
        
        console.log('✅ [CACHE] Nueva configuración creada con cache DESHABILITADO');
      }
    } catch (dbError) {
      console.error('🚨 [CACHE] Error al modificar CacheConfig:', dbError.message);
      throw dbError;
    }
    
    // 3. Invalidar cache en memoria MÚLTIPLES VECES para forzar recarga
    for (let i = 0; i < 5; i++) {
      invalidateConfigCache();
    }
    console.log('✅ [CACHE] Paso 3: Cache en memoria invalidado múltiples veces');
    
    console.log('\n🎉 [CACHE] ========================================');
    console.log('🎉 [CACHE] ✅ INVALIDACIÓN COMPLETADA');
    console.log('🎉 [CACHE] Cache deshabilitado por 2 minutos');
    console.log('🎉 [CACHE] ========================================\n');
    
    return true;
    
  } catch (error) {
    console.error('\n🚨 [CACHE] ========================================');
    console.error('🚨 [CACHE] ERROR CRÍTICO AL INVALIDAR CACHE');
    console.error('🚨 [CACHE] ========================================');
    console.error('🚨 [CACHE] Error:', error.message);
    console.error('🚨 [CACHE] ========================================\n');
    return false;
  }
};

/**
 * Función helper para invalidar cache manualmente desde controladores
 */
export const manualCacheInvalidation = async (context = '') => {
  try {
    console.log(`\n🔧 [CACHE] INVALIDACIÓN MANUAL: ${context}\n`);
    const result = await invalidateServicesCache();
    
    if (result) {
      console.log(`\n✅ [CACHE] Invalidación manual exitosa: ${context}\n`);
    } else {
      console.log(`\n⚠️ [CACHE] Invalidación manual falló: ${context}\n`);
    }
    
    return result;
  } catch (error) {
    console.error(`\n🚨 [CACHE] Error en invalidación manual (${context}):`, error.message, '\n');
    return false;
  }
};

/**
 * Middleware para invalidar cache automáticamente después de operaciones CRUD
 */
export const autoInvalidateCache = async (req, res, next) => {
  try {
    const originalJson = res.json;
    
    res.json = async function(data) {
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && res.statusCode < 400) {
        console.log(`\n🗑️ [CACHE] Auto-invalidando después de ${req.method} ${req.originalUrl}\n`);
        
        setImmediate(async () => {
          await invalidateServicesCache();
        });
        
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('X-Cache-Invalidated', 'true');
        res.setHeader('X-Cache-Invalidated-Timestamp', new Date().toISOString());
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('🚨 [CACHE] Error en autoInvalidateCache middleware:', error.message);
    next();
  }
};

export default {
  invalidateServicesCache,
  manualCacheInvalidation,
  autoInvalidateCache
};