import CronogramaSunat from '../models/CronogramaSunat.js';
import logger from '../utils/logger.js';

/**
 * 📅 Servicio de Cronograma SUNAT
 * Gestión de fechas de vencimiento tributario
 */

/**
 * Obtener fecha de vencimiento para un RUC y periodo
 * @param {string} ruc - RUC del contribuyente
 * @param {string} periodo - Periodo tributario (YYYY-MM)
 * @returns {Date|null} Fecha de vencimiento
 */
export const obtenerFechaVencimiento = async (ruc, periodo) => {
  try {
    let fechaVencimiento = await CronogramaSunat.getFechaVencimiento(ruc, periodo);
    
    // Si no existe el cronograma, generar uno por defecto
    if (!fechaVencimiento) {
      const anio = parseInt(periodo.split('-')[0]);
      logger.info(`📅 Cronograma no encontrado para ${periodo}. Generando cronograma default para ${anio}...`);
      
      await CronogramaSunat.generarCronogramaDefault(anio);
      fechaVencimiento = await CronogramaSunat.getFechaVencimiento(ruc, periodo);
    }
    
    return fechaVencimiento;
  } catch (error) {
    logger.error('Error obteniendo fecha de vencimiento:', error);
    throw error;
  }
};

/**
 * Obtener cronograma completo de un periodo
 * @param {string} periodo - Periodo tributario (YYYY-MM)
 * @returns {Array} Cronograma del periodo
 */
export const obtenerCronogramaPeriodo = async (periodo) => {
  try {
    let cronograma = await CronogramaSunat.getCronogramaPeriodo(periodo);
    
    if (!cronograma || cronograma.length === 0) {
      const anio = parseInt(periodo.split('-')[0]);
      logger.info(`📅 Generando cronograma default para ${anio}...`);
      await CronogramaSunat.generarCronogramaDefault(anio);
      cronograma = await CronogramaSunat.getCronogramaPeriodo(periodo);
    }
    
    return cronograma;
  } catch (error) {
    logger.error('Error obteniendo cronograma:', error);
    throw error;
  }
};

/**
 * Verificar si un cliente tiene declaración vencida
 * @param {string} ruc - RUC del contribuyente
 * @param {string} periodo - Periodo tributario (YYYY-MM)
 * @returns {Object} Estado de vencimiento
 */
export const verificarVencimiento = async (ruc, periodo) => {
  try {
    const fechaVencimiento = await obtenerFechaVencimiento(ruc, periodo);
    
    if (!fechaVencimiento) {
      return {
        vencido: false,
        fechaVencimiento: null,
        diasRestantes: null,
        alerta: 'NO_ENCONTRADO'
      };
    }
    
    const hoy = new Date();
    const diff = fechaVencimiento - hoy;
    const diasRestantes = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    let alerta = 'NORMAL';
    if (diasRestantes < 0) alerta = 'VENCIDO';
    else if (diasRestantes <= 3) alerta = 'CRITICO';
    else if (diasRestantes <= 7) alerta = 'PROXIMO';
    
    return {
      vencido: diasRestantes < 0,
      fechaVencimiento,
      diasRestantes,
      alerta,
      digitoRuc: parseInt(ruc.charAt(ruc.length - 1))
    };
  } catch (error) {
    logger.error('Error verificando vencimiento:', error);
    throw error;
  }
};

/**
 * Inicializar cronograma para el año actual si no existe
 */
export const inicializarCronograma = async () => {
  try {
    const anioActual = new Date().getFullYear();
    const existente = await CronogramaSunat.countDocuments({ anio: anioActual });
    
    if (existente === 0) {
      logger.info(`📅 Inicializando cronograma SUNAT para ${anioActual}...`);
      await CronogramaSunat.generarCronogramaDefault(anioActual);
      logger.success(`✅ Cronograma ${anioActual} generado (${120} registros)`);
    } else {
      logger.info(`📅 Cronograma SUNAT ${anioActual} ya existe (${existente} registros)`);
    }
  } catch (error) {
    logger.error('Error inicializando cronograma:', error);
  }
};

export default {
  obtenerFechaVencimiento,
  obtenerCronogramaPeriodo,
  verificarVencimiento,
  inicializarCronograma
};
