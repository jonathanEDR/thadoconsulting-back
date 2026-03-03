import ProyeccionPago from '../models/ProyeccionPago.js';
import ClienteContable from '../models/ClienteContable.js';
import { calcularDeclaracionCompleta } from '../services/calculadoraImpuestos.js';
import { obtenerFechaVencimiento } from '../services/cronogramaService.js';
import { hasPermission } from '../utils/roleHelper.js';
import { PERMISSIONS } from '../config/roles.js';
import logger from '../utils/logger.js';

/**
 * 📊 Controller de Proyecciones de Pago
 * Calculadora inteligente de estimación de pagos tributarios
 */

// ========================================
// 🧮 CALCULAR PROYECCIÓN (EN TIEMPO REAL)
// ========================================

/**
 * @desc    Calcular proyección de pago sin guardar
 * @route   POST /api/contabilidad/proyecciones/calcular
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const calcularProyeccion = async (req, res) => {
  try {
    const {
      clienteId,
      periodo,
      ingresosEstimados,
      comprasEstimadas,
      coeficiente,
      categoriaRUS,
      saldoFavorAnterior
    } = req.body;
    
    // Validar datos mínimos
    if (!clienteId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el clienteId'
      });
    }
    
    const cliente = await ClienteContable.findById(clienteId).lean();
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    // Calcular impuestos estimados
    const calculo = calcularDeclaracionCompleta({
      regimen: cliente.regimenTributario,
      ventasGravadas: ingresosEstimados || 0,
      creditoFiscal: comprasEstimadas ? Math.round(comprasEstimadas * 0.18 * 100) / 100 : 0,
      saldoFavorAnterior: saldoFavorAnterior || 0,
      coeficiente: coeficiente || cliente.configuracionTributaria?.coeficienteRenta,
      categoriaRUS: categoriaRUS || cliente.configuracionTributaria?.categoriaRUS
    });
    
    // Obtener fecha de vencimiento si se proporcionó periodo
    let fechaVencimiento = null;
    if (periodo) {
      fechaVencimiento = await obtenerFechaVencimiento(cliente.ruc, periodo);
    }
    
    res.json({
      success: true,
      data: {
        cliente: {
          _id: cliente._id,
          ruc: cliente.ruc,
          razonSocial: cliente.razonSocial,
          regimen: cliente.regimenTributario,
          digitoRuc: parseInt(cliente.ruc.charAt(10))
        },
        periodo,
        ingresosEstimados: ingresosEstimados || 0,
        comprasEstimadas: comprasEstimadas || 0,
        calculo,
        fechaVencimiento,
        esEstimacion: true
      }
    });
    
  } catch (error) {
    logger.error('Error calculando proyección:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al calcular proyección'
    });
  }
};

// ========================================
// 💾 GUARDAR PROYECCIÓN
// ========================================

/**
 * @desc    Guardar una proyección de pago
 * @route   POST /api/contabilidad/proyecciones
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const guardarProyeccion = async (req, res) => {
  try {
    const { role, clerkId, firstName, lastName, email } = req.user;
    
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_DECLARATIONS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para guardar proyecciones'
      });
    }
    
    const {
      clienteId,
      periodo,
      ingresosEstimados,
      comprasEstimadas,
      coeficiente,
      categoriaRUS,
      saldoFavorAnterior,
      observaciones,
      compartidoConCliente
    } = req.body;
    
    // Verificar cliente
    const cliente = await ClienteContable.findById(clienteId).lean();
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    // Calcular impuestos
    const creditoFiscalEstimado = comprasEstimadas ? Math.round(comprasEstimadas * 0.18 * 100) / 100 : 0;
    
    const calculo = calcularDeclaracionCompleta({
      regimen: cliente.regimenTributario,
      ventasGravadas: ingresosEstimados || 0,
      creditoFiscal: creditoFiscalEstimado,
      saldoFavorAnterior: saldoFavorAnterior || 0,
      coeficiente: coeficiente || cliente.configuracionTributaria?.coeficienteRenta,
      categoriaRUS: categoriaRUS || cliente.configuracionTributaria?.categoriaRUS
    });
    
    // Obtener fecha de vencimiento
    let fechaVencimiento = null;
    if (periodo) {
      fechaVencimiento = await obtenerFechaVencimiento(cliente.ruc, periodo);
    }
    
    const nuevaProyeccion = new ProyeccionPago({
      clienteId,
      periodo,
      ingresosEstimados: ingresosEstimados || 0,
      comprasEstimadas: comprasEstimadas || 0,
      igvEstimado: {
        debitoFiscal: calculo.detalleIGV?.debitoFiscal || 0,
        creditoFiscal: calculo.detalleIGV?.creditoFiscal || 0,
        igvAPagar: calculo.detalleIGV?.igvAPagar || 0
      },
      rentaEstimada: {
        regimenAplicado: cliente.regimenTributario,
        coeficienteAplicado: calculo.detalleRenta.coeficienteAplicado || 0,
        rentaAPagar: calculo.detalleRenta.rentaAPagar || 0
      },
      fechaVencimiento,
      observaciones,
      compartidoConCliente: compartidoConCliente || false,
      fechaCompartido: compartidoConCliente ? new Date() : null,
      creadoPor: {
        userId: clerkId,
        nombre: `${firstName || ''} ${lastName || ''}`.trim(),
        email
      }
    });
    
    await nuevaProyeccion.save();
    
    logger.info(`💾 Proyección guardada: ${cliente.razonSocial} - Periodo ${periodo} - Total estimado: S/ ${nuevaProyeccion.totalEstimado}`);
    
    res.status(201).json({
      success: true,
      message: 'Proyección guardada exitosamente',
      data: nuevaProyeccion
    });
    
  } catch (error) {
    logger.error('Error guardando proyección:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar proyección',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 📋 LISTAR PROYECCIONES DE UN CLIENTE
// ========================================

/**
 * @desc    Obtener proyecciones de un cliente
 * @route   GET /api/contabilidad/proyecciones/cliente/:clienteId
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const getProyeccionesCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { limit = 12 } = req.query;
    const { role } = req.user;
    
    if (!hasPermission(role, PERMISSIONS.VIEW_ACCOUNTING_DECLARATIONS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver proyecciones'
      });
    }
    
    const proyecciones = await ProyeccionPago.getByCliente(clienteId, parseInt(limit));
    
    res.json({
      success: true,
      data: proyecciones
    });
    
  } catch (error) {
    logger.error('Error obteniendo proyecciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener proyecciones',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 🔄 COMPARAR PROYECCIÓN CON DECLARACIÓN REAL
// ========================================

/**
 * @desc    Comparar proyección con declaración real
 * @route   POST /api/contabilidad/proyecciones/:id/comparar
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const compararProyeccion = async (req, res) => {
  try {
    const { id } = req.params;
    const { declaracionId } = req.body;
    const { role } = req.user;
    
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_DECLARATIONS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para comparar proyecciones'
      });
    }
    
    if (!declaracionId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID de la declaración real para comparar'
      });
    }
    
    const resultado = await ProyeccionPago.compararConReal(id, declaracionId);
    
    res.json({
      success: true,
      message: 'Comparación realizada exitosamente',
      data: resultado
    });
    
  } catch (error) {
    logger.error('Error comparando proyección:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al comparar proyección',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 📅 OBTENER CRONOGRAMA
// ========================================

/**
 * @desc    Obtener cronograma de vencimientos SUNAT de un periodo
 * @route   GET /api/contabilidad/cronograma/:periodo
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const getCronograma = async (req, res) => {
  try {
    const { periodo } = req.params;
    const { obtenerCronogramaPeriodo } = await import('../services/cronogramaService.js');
    
    const cronograma = await obtenerCronogramaPeriodo(periodo);
    
    res.json({
      success: true,
      data: {
        periodo,
        vencimientos: cronograma
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo cronograma:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener cronograma',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 📅 GENERAR CRONOGRAMA POR DEFECTO
// ========================================

/**
 * @desc    Generar cronograma por defecto para un año
 * @route   POST /api/contabilidad/cronograma/generar
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const generarCronograma = async (req, res) => {
  try {
    const { anio } = req.body;
    const { role } = req.user;
    
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_CLIENTS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para generar cronograma'
      });
    }
    
    const anioGenerar = parseInt(anio) || new Date().getFullYear();
    
    const CronogramaSunat = (await import('../models/CronogramaSunat.js')).default;
    const resultado = await CronogramaSunat.generarCronogramaDefault(anioGenerar);
    
    logger.info(`📅 Cronograma generado para ${anioGenerar}: ${resultado.length} registros`);
    
    res.json({
      success: true,
      message: `Cronograma ${anioGenerar} generado exitosamente`,
      data: {
        anio: anioGenerar,
        registros: resultado.length
      }
    });
    
  } catch (error) {
    logger.error('Error generando cronograma:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar cronograma',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
