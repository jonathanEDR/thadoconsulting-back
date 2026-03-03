import ClienteContable from '../models/ClienteContable.js';
import DeclaracionMensual from '../models/DeclaracionMensual.js';
import { verificarVencimiento } from './cronogramaService.js';
import logger from '../utils/logger.js';

/**
 * 🚨 Servicio de Alertas Contables
 * Genera alertas de vencimiento y estado de declaraciones
 */

/**
 * Obtener periodo actual (mes anterior al actual, que es el que se declara)
 * @returns {string} Periodo en formato YYYY-MM
 */
const getPeriodoActual = () => {
  const hoy = new Date();
  let mes = hoy.getMonth(); // 0-11, el mes actual
  let anio = hoy.getFullYear();
  
  // El periodo tributario es el mes anterior
  if (mes === 0) {
    mes = 12;
    anio--;
  }
  
  return `${anio}-${String(mes).padStart(2, '0')}`;
};

/**
 * Obtener resumen del semáforo de vencimientos
 * @returns {Object} Resumen con conteos y detalles
 */
export const obtenerSemaforoVencimientos = async () => {
  try {
    const periodoActual = getPeriodoActual();
    
    // Obtener clientes activos
    const clientes = await ClienteContable.find({ activo: true, estado: 'activo' }).lean();
    
    if (clientes.length === 0) {
      return {
        periodo: periodoActual,
        totalClientes: 0,
        vencidos: { count: 0, clientes: [] },
        proximos: { count: 0, clientes: [] },
        alDia: { count: 0, clientes: [] },
        pendientes: { count: 0, clientes: [] }
      };
    }
    
    // Buscar declaraciones del periodo actual
    const declaraciones = await DeclaracionMensual.find({
      periodo: periodoActual,
      activo: true,
      clienteId: { $in: clientes.map(c => c._id) }
    }).lean();
    
    // Map de declaraciones por clienteId
    const declaracionMap = new Map();
    declaraciones.forEach(d => {
      declaracionMap.set(d.clienteId.toString(), d);
    });
    
    const resultado = {
      periodo: periodoActual,
      totalClientes: clientes.length,
      vencidos: { count: 0, clientes: [] },
      proximos: { count: 0, clientes: [] },
      alDia: { count: 0, clientes: [] },
      pendientes: { count: 0, clientes: [] }
    };
    
    // Clasificar cada cliente
    for (const cliente of clientes) {
      const declaracion = declaracionMap.get(cliente._id.toString());
      
      const clienteInfo = {
        _id: cliente._id,
        ruc: cliente.ruc,
        razonSocial: cliente.razonSocial,
        regimen: cliente.regimenTributario,
        linkDrive: cliente.linkDrive || null
      };
      
      if (declaracion) {
        // Ya tiene declaración registrada
        if (declaracion.estado === 'PAGADO' || declaracion.estado === 'PRESENTADO') {
          resultado.alDia.count++;
          resultado.alDia.clientes.push({
            ...clienteInfo,
            estado: declaracion.estado,
            totalAPagar: declaracion.totalAPagar,
            fechaPresentacion: declaracion.fechaPresentacion
          });
        } else if (declaracion.estado === 'VENCIDO') {
          resultado.vencidos.count++;
          resultado.vencidos.clientes.push({
            ...clienteInfo,
            estado: 'VENCIDO',
            totalAPagar: declaracion.totalAPagar,
            fechaVencimiento: declaracion.fechaVencimiento
          });
        } else {
          // PENDIENTE - verificar si está próximo a vencer
          const vencimiento = await verificarVencimiento(cliente.ruc, periodoActual);
          if (vencimiento.alerta === 'VENCIDO') {
            resultado.vencidos.count++;
            resultado.vencidos.clientes.push({
              ...clienteInfo,
              estado: 'VENCIDO',
              diasRestantes: vencimiento.diasRestantes,
              fechaVencimiento: vencimiento.fechaVencimiento
            });
          } else if (vencimiento.alerta === 'CRITICO' || vencimiento.alerta === 'PROXIMO') {
            resultado.proximos.count++;
            resultado.proximos.clientes.push({
              ...clienteInfo,
              estado: 'PROXIMO',
              diasRestantes: vencimiento.diasRestantes,
              fechaVencimiento: vencimiento.fechaVencimiento
            });
          } else {
            resultado.pendientes.count++;
            resultado.pendientes.clientes.push({
              ...clienteInfo,
              estado: 'PENDIENTE',
              diasRestantes: vencimiento.diasRestantes,
              fechaVencimiento: vencimiento.fechaVencimiento
            });
          }
        }
      } else {
        // No tiene declaración registrada para este periodo
        const vencimiento = await verificarVencimiento(cliente.ruc, periodoActual);
        
        if (vencimiento.alerta === 'VENCIDO') {
          resultado.vencidos.count++;
          resultado.vencidos.clientes.push({
            ...clienteInfo,
            estado: 'VENCIDO',
            diasRestantes: vencimiento.diasRestantes,
            fechaVencimiento: vencimiento.fechaVencimiento
          });
        } else if (vencimiento.alerta === 'CRITICO' || vencimiento.alerta === 'PROXIMO') {
          resultado.proximos.count++;
          resultado.proximos.clientes.push({
            ...clienteInfo,
            estado: 'PROXIMO',
            diasRestantes: vencimiento.diasRestantes,
            fechaVencimiento: vencimiento.fechaVencimiento
          });
        } else {
          resultado.pendientes.count++;
          resultado.pendientes.clientes.push({
            ...clienteInfo,
            estado: 'PENDIENTE',
            diasRestantes: vencimiento.diasRestantes,
            fechaVencimiento: vencimiento.fechaVencimiento
          });
        }
      }
    }
    
    return resultado;
  } catch (error) {
    logger.error('Error obteniendo semáforo de vencimientos:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas generales del módulo contable
 * @returns {Object} Estadísticas generales
 */
export const obtenerEstadisticasGenerales = async () => {
  try {
    const [
      totalClientes,
      clientesPorRegimen,
      declaracionesMes,
      totalHonorarios
    ] = await Promise.all([
      ClienteContable.countDocuments({ activo: true, estado: 'activo' }),
      ClienteContable.contarPorRegimen(),
      DeclaracionMensual.countDocuments({ 
        periodo: getPeriodoActual(), 
        activo: true,
        estado: { $in: ['PRESENTADO', 'PAGADO'] }
      }),
      ClienteContable.aggregate([
        { $match: { activo: true, estado: 'activo' } },
        { $group: { _id: null, total: { $sum: '$honorarioMensual' } } }
      ])
    ]);
    
    return {
      totalClientes,
      clientesPorRegimen,
      declaracionesPresentadasMes: declaracionesMes,
      periodoActual: getPeriodoActual(),
      ingresosMensualesEstimados: totalHonorarios[0]?.total || 0
    };
  } catch (error) {
    logger.error('Error obteniendo estadísticas generales:', error);
    throw error;
  }
};

export default {
  obtenerSemaforoVencimientos,
  obtenerEstadisticasGenerales,
  getPeriodoActual
};
