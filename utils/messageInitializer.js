import MessageTemplate from '../models/MessageTemplate.js';
import logger from './logger.js';
import INIT_CONFIG from '../config/initConfig.js';

/**
 * 📄 Inicializador de Plantillas de Mensajes
 * Crea las plantillas por defecto si no existen
 */

export const inicializarPlantillasMensajes = async () => {
  try {
    if (!INIT_CONFIG.INIT_MESSAGE_TEMPLATES) {
      return; // Salir silenciosamente si está desactivado
    }
    
    logger.info('🔧 Verificando plantillas de mensajes...');
    
    // Verificar si ya existen plantillas
    const plantillasExistentes = await MessageTemplate.countDocuments();
    
    if (plantillasExistentes > 0) {
      if (INIT_CONFIG.SHOW_DETAILED_LOGS) {
        logger.info(`✅ Ya existen ${plantillasExistentes} plantillas en la base de datos`);
      }
      return;
    }
    
    logger.info('📝 Creando plantillas por defecto...');
    
    // Crear plantillas por defecto usando el método del modelo
    await MessageTemplate.crearPlantillasDefault();
    
    const total = await MessageTemplate.countDocuments();
    logger.success(`✅ ${total} plantillas por defecto creadas exitosamente`);
    
  } catch (error) {
    logger.error('❌ Error inicializando plantillas de mensajes:', error);
    throw error;
  }
};

/**
 * Verificar salud de los modelos de mensajería
 */
export const verificarModelosMensajeria = async () => {
  try {
    logger.info('🔍 Verificando modelos de mensajería...');
    
    // Importar modelos para verificar que se carguen correctamente
    const LeadMessage = (await import('../models/LeadMessage.js')).default;
    const Lead = (await import('../models/Lead.js')).default;
    
    // Verificar que los modelos tengan los métodos necesarios
    const lead = await Lead.findOne().limit(1);
    
    if (lead) {
      // Verificar que existan los nuevos métodos
      const metodos = [
        'vincularUsuario',
        'agregarMensajeInterno',
        'enviarMensajeCliente',
        'registrarRespuestaCliente',
        'marcarMensajeLeido',
        'obtenerTimeline',
        'contarMensajesNoLeidos'
      ];
      
      const metodosFaltantes = metodos.filter(m => typeof lead[m] !== 'function');
      
      if (metodosFaltantes.length > 0) {
        logger.warn(`⚠️  Métodos faltantes en modelo Lead: ${metodosFaltantes.join(', ')}`);
      } else {
        logger.success('✅ Todos los métodos de mensajería están disponibles en Lead');
      }
    }
    
    // Verificar campos nuevos en el schema
    const leadConCamposNuevos = await Lead.findOne({ 
      usuarioRegistrado: { $exists: true } 
    });
    
    if (leadConCamposNuevos) {
      logger.success('✅ Campo usuarioRegistrado encontrado en Lead');
    } else {
      logger.info('ℹ️  No hay leads con usuario registrado todavía');
    }
    
    logger.success('✅ Modelos de mensajería verificados correctamente');
    
  } catch (error) {
    logger.error('❌ Error verificando modelos de mensajería:', error);
    throw error;
  }
};

export default {
  inicializarPlantillasMensajes,
  verificarModelosMensajeria
};
