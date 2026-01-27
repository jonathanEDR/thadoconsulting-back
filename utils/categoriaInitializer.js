import Categoria from '../models/Categoria.js';
import logger from './logger.js';
import INIT_CONFIG from '../config/initConfig.js';

// Categorías por defecto para servicios contables
const categoriasDefecto = [
  {
    nombre: 'Contabilidad',
    descripcion: 'Contabilidad general, libros contables y estados financieros',
    icono: '📊',
    color: '#3B82F6',
    orden: 1
  },
  {
    nombre: 'Tributación',
    descripcion: 'Asesoría tributaria, declaraciones SUNAT y planificación fiscal',
    icono: '📋',
    color: '#8B5CF6',
    orden: 2
  },
  {
    nombre: 'Planillas',
    descripcion: 'Gestión de planillas PLAME, AFP, CTS y beneficios laborales',
    icono: '👥',
    color: '#10B981',
    orden: 3
  },
  {
    nombre: 'Constitución',
    descripcion: 'Constitución de empresas, formalización y trámites legales',
    icono: '🏢',
    color: '#F59E0B',
    orden: 4
  },
  {
    nombre: 'Asesoría',
    descripcion: 'Asesoría empresarial, financiera y de gestión',
    icono: '💼',
    color: '#EF4444',
    orden: 5
  },
  {
    nombre: 'Otro',
    descripcion: 'Otros servicios especializados',
    icono: '⚡',
    color: '#6B7280',
    orden: 99
  }
];

// Función para inicializar categorías
export const inicializarCategorias = async () => {
  try {
    if (!INIT_CONFIG.INIT_CATEGORIES) {
      return; // Salir silenciosamente si está desactivado
    }
    
    logger.info('🏷️  Inicializando categorías por defecto...');
    
    // Verificar si ya existen categorías
    const categoriasExistentes = await Categoria.countDocuments();
    
    if (categoriasExistentes > 0) {
      if (INIT_CONFIG.SHOW_DETAILED_LOGS) {
        logger.info(`Ya existen ${categoriasExistentes} categorías en la base de datos`);
      }
      return;
    }
    
    // Crear categorías por defecto
    const categoriasCreadas = [];
    
    for (const categoriaData of categoriasDefecto) {
      try {
        const categoria = new Categoria(categoriaData);
        const categoriaGuardada = await categoria.save();
        categoriasCreadas.push(categoriaGuardada);
        logger.success(`✅ Categoría creada: ${categoriaGuardada.nombre}`);
      } catch (error) {
        logger.error(`❌ Error creando categoría ${categoriaData.nombre}:`, error.message);
      }
    }
    
    logger.success(`🎉 Inicialización completada: ${categoriasCreadas.length} categorías creadas`);
    
    return categoriasCreadas;
    
  } catch (error) {
    logger.error('Error en inicialización de categorías:', error);
    throw error;
  }
};

// Función para migrar servicios existentes (útil si ya tienes servicios)
export const migrarServiciosExistentes = async () => {
  try {
    const Servicio = (await import('../models/Servicio.js')).default;
    
    logger.info('🔄 Iniciando migración de servicios existentes...');
    
    // Obtener todas las categorías
    const categorias = await Categoria.find();
    const mapaCategorias = {};
    
    categorias.forEach(cat => {
      const nombre = cat.nombre.toLowerCase();
      mapaCategorias[nombre] = cat._id;
    });
    
    // Buscar servicios sin categoría ObjectId (string)
    const servicios = await Servicio.find({
      categoria: { $type: 'string' }
    });
    
    if (servicios.length === 0) {
      logger.info('No hay servicios que migrar');
      return;
    }
    
    logger.info(`Encontrados ${servicios.length} servicios para migrar`);
    
    let migrados = 0;
    let errores = 0;
    
    for (const servicio of servicios) {
      try {
        const categoriaString = servicio.categoria.toLowerCase();
        const categoriaId = mapaCategorias[categoriaString] || mapaCategorias['otro'];
        
        if (categoriaId) {
          await Servicio.updateOne(
            { _id: servicio._id },
            { categoria: categoriaId }
          );
          migrados++;
          logger.info(`✅ Servicio migrado: ${servicio.titulo} -> ${categoriaString}`);
        } else {
          errores++;
          logger.warn(`⚠️  No se encontró categoría para: ${servicio.titulo} (${categoriaString})`);
        }
      } catch (error) {
        errores++;
        logger.error(`❌ Error migrando servicio ${servicio.titulo}:`, error.message);
      }
    }
    
    logger.success(`🎉 Migración completada: ${migrados} servicios migrados, ${errores} errores`);
    
  } catch (error) {
    logger.error('Error en migración de servicios:', error);
    throw error;
  }
};

export default { inicializarCategorias, migrarServiciosExistentes };