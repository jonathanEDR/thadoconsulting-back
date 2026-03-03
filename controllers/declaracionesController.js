import DeclaracionMensual from '../models/DeclaracionMensual.js';
import ClienteContable from '../models/ClienteContable.js';
import { calcularIGV, calcularRenta, calcularDeclaracionCompleta } from '../services/calculadoraImpuestos.js';
import { obtenerFechaVencimiento } from '../services/cronogramaService.js';
import { hasPermission } from '../utils/roleHelper.js';
import { PERMISSIONS } from '../config/roles.js';
import logger from '../utils/logger.js';

/**
 * 📄 Controller de Declaraciones Mensuales
 * Gestión de declaraciones tributarias de clientes contables
 */

// ========================================
// ➕ REGISTRAR DECLARACIÓN
// ========================================

/**
 * @desc    Registrar nueva declaración mensual
 * @route   POST /api/contabilidad/declaraciones
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const registrarDeclaracion = async (req, res) => {
  try {
    const { role, clerkId, firstName, lastName, email } = req.user;
    
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_DECLARATIONS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para registrar declaraciones'
      });
    }
    
    const {
      clienteId,
      periodo,
      ventasGravadas,
      ventasNoGravadas,
      ventasExportacion,
      creditoFiscal,
      saldoFavorAnterior,
      coeficiente,
      categoriaRUS,
      formulario,
      numeroOrden,
      fechaPresentacion,
      pago,
      observaciones,
      estado
    } = req.body;
    
    // Verificar que el cliente existe
    const cliente = await ClienteContable.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente contable no encontrado'
      });
    }
    
    if (!cliente.activo) {
      return res.status(400).json({
        success: false,
        message: 'No se puede registrar declaración para un cliente dado de baja'
      });
    }
    
    // Verificar que no exista una declaración para el mismo periodo
    const existente = await DeclaracionMensual.findOne({
      clienteId,
      periodo,
      activo: true,
      esRectificatoria: false
    });
    
    if (existente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe una declaración para el periodo ${periodo}. Use rectificatoria si necesita modificarla.`,
        declaracionExistente: existente._id
      });
    }
    
    // Obtener fecha de vencimiento del cronograma
    const fechaVencimiento = await obtenerFechaVencimiento(cliente.ruc, periodo);
    
    if (!fechaVencimiento) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró fecha de vencimiento en el cronograma. Verifique el periodo.'
      });
    }
    
    // Calcular impuestos automáticamente
    const calculo = calcularDeclaracionCompleta({
      regimen: cliente.regimenTributario,
      ventasGravadas: ventasGravadas || 0,
      creditoFiscal: creditoFiscal || 0,
      saldoFavorAnterior: saldoFavorAnterior || 0,
      coeficiente: coeficiente || cliente.configuracionTributaria?.coeficienteRenta,
      categoriaRUS: categoriaRUS || cliente.configuracionTributaria?.categoriaRUS,
      zonaIGV: cliente.zonaIGV || 'GRAVADA'
    });
    
    // Construir detalle IGV
    const detalleIGV = calculo.detalleIGV ? {
      ventasGravadas: ventasGravadas || 0,
      ventasNoGravadas: ventasNoGravadas || 0,
      ventasExportacion: ventasExportacion || 0,
      debitoFiscal: calculo.detalleIGV.debitoFiscal,
      creditoFiscal: calculo.detalleIGV.creditoFiscal,
      igvResultante: calculo.detalleIGV.igvResultante,
      saldoFavorAnterior: calculo.detalleIGV.saldoFavorAnterior,
      igvAPagar: calculo.detalleIGV.igvAPagar,
      saldoFavorSiguiente: calculo.detalleIGV.saldoFavorSiguiente
    } : {
      ventasGravadas: 0,
      debitoFiscal: 0,
      creditoFiscal: 0,
      igvResultante: 0,
      igvAPagar: 0,
      saldoFavorAnterior: 0,
      saldoFavorSiguiente: 0
    };
    
    // Determinar estado
    let estadoFinal = estado || 'PENDIENTE';
    if (fechaPresentacion && pago?.montoPagado > 0) {
      estadoFinal = 'PAGADO';
    } else if (fechaPresentacion) {
      estadoFinal = 'PRESENTADO';
    }
    
    const nuevaDeclaracion = new DeclaracionMensual({
      clienteId,
      periodo,
      anio: parseInt(periodo.split('-')[0]),
      mes: parseInt(periodo.split('-')[1]),
      detalleIGV,
      detalleRenta: calculo.detalleRenta,
      totalAPagar: calculo.resumen.totalAPagar,
      formulario: formulario || (cliente.regimenTributario === 'RUS' ? 'NRUS' : 'PDT621'),
      numeroOrden,
      pago: pago || {},
      fechaPresentacion: fechaPresentacion ? new Date(fechaPresentacion) : null,
      fechaVencimiento,
      estado: estadoFinal,
      observaciones,
      registradoPor: {
        userId: clerkId,
        nombre: `${firstName || ''} ${lastName || ''}`.trim(),
        email
      }
    });
    
    await nuevaDeclaracion.save();
    
    logger.info(`📄 Declaración registrada: ${cliente.razonSocial} - Periodo ${periodo} - Total: S/ ${calculo.resumen.totalAPagar}`);
    
    res.status(201).json({
      success: true,
      message: 'Declaración registrada exitosamente',
      data: nuevaDeclaracion,
      calculo: calculo.resumen
    });
    
  } catch (error) {
    logger.error('Error registrando declaración:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una declaración para este cliente y periodo'
      });
    }
    
    if (error.name === 'ValidationError') {
      const errores = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errores
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al registrar declaración',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 🧮 CALCULAR IMPUESTOS (PREVIEW)
// ========================================

/**
 * @desc    Calcular impuestos sin guardar (preview)
 * @route   POST /api/contabilidad/declaraciones/calcular
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const calcularImpuestosPreview = async (req, res) => {
  try {
    const {
      clienteId,
      ventasGravadas,
      creditoFiscal,
      saldoFavorAnterior,
      coeficiente,
      categoriaRUS,
      regimen // Opcional: usar si no se pasa clienteId
    } = req.body;
    
    let regimenCalculo = regimen;
    let coeficienteCalculo = coeficiente;
    let categoriaCalculo = categoriaRUS;
    let zonaIGVCalculo = 'GRAVADA';
    
    // Si se pasa clienteId, obtener régimen del cliente
    if (clienteId) {
      const cliente = await ClienteContable.findById(clienteId);
      if (cliente) {
        regimenCalculo = cliente.regimenTributario;
        coeficienteCalculo = coeficiente || cliente.configuracionTributaria?.coeficienteRenta;
        categoriaCalculo = categoriaRUS || cliente.configuracionTributaria?.categoriaRUS;
        zonaIGVCalculo = cliente.zonaIGV || 'GRAVADA';
      }
    }
    
    if (!regimenCalculo) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un régimen tributario o un clienteId válido'
      });
    }
    
    const resultado = calcularDeclaracionCompleta({
      regimen: regimenCalculo,
      ventasGravadas: ventasGravadas || 0,
      creditoFiscal: creditoFiscal || 0,
      saldoFavorAnterior: saldoFavorAnterior || 0,
      coeficiente: coeficienteCalculo,
      categoriaRUS: categoriaCalculo,
      zonaIGV: zonaIGVCalculo
    });
    
    res.json({
      success: true,
      data: resultado
    });
    
  } catch (error) {
    logger.error('Error calculando impuestos:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al calcular impuestos'
    });
  }
};

// ========================================
// 📋 HISTORIAL DE DECLARACIONES
// ========================================

/**
 * @desc    Obtener historial de declaraciones de un cliente
 * @route   GET /api/contabilidad/declaraciones/cliente/:clienteId
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const getHistorialDeclaraciones = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { anio, estado, page = 1, limit = 24 } = req.query;
    const { role } = req.user;
    
    if (!hasPermission(role, PERMISSIONS.VIEW_ACCOUNTING_DECLARATIONS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver declaraciones'
      });
    }
    
    let filter = { clienteId, activo: true };
    
    if (anio) {
      filter.anio = parseInt(anio);
    }
    
    if (estado && estado !== 'todos') {
      filter.estado = estado;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [declaraciones, total] = await Promise.all([
      DeclaracionMensual.find(filter)
        .sort({ periodo: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean({ virtuals: true }),
      DeclaracionMensual.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      data: declaraciones,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: declaraciones.length,
        totalItems: total
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo historial de declaraciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 📊 RESUMEN ANUAL
// ========================================

/**
 * @desc    Obtener resumen anual de un cliente
 * @route   GET /api/contabilidad/declaraciones/resumen-anual/:clienteId
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const getResumenAnual = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { anio } = req.query;
    const { role } = req.user;
    
    if (!hasPermission(role, PERMISSIONS.VIEW_ACCOUNTING_DECLARATIONS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver el resumen anual'
      });
    }
    
    const anioCalculo = parseInt(anio) || new Date().getFullYear();
    
    const [resumen, declaraciones] = await Promise.all([
      DeclaracionMensual.getResumenAnual(clienteId, anioCalculo),
      DeclaracionMensual.find({
        clienteId,
        anio: anioCalculo,
        activo: true
      }).sort({ periodo: 1 }).lean({ virtuals: true })
    ]);
    
    // Obtener datos del cliente
    const cliente = await ClienteContable.findById(clienteId).lean();
    
    res.json({
      success: true,
      data: {
        cliente: cliente ? {
          _id: cliente._id,
          ruc: cliente.ruc,
          razonSocial: cliente.razonSocial,
          regimenTributario: cliente.regimenTributario
        } : null,
        anio: anioCalculo,
        resumen: resumen[0] || {
          totalIGV: 0,
          totalRenta: 0,
          totalPagado: 0,
          totalAPagar: 0,
          declaracionesPresentadas: 0,
          declaracionesPendientes: 0,
          declaracionesVencidas: 0
        },
        declaracionesMensuales: declaraciones
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo resumen anual:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen anual',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// ✏️ ACTUALIZAR DECLARACIÓN
// ========================================

/**
 * @desc    Actualizar datos de una declaración
 * @route   PUT /api/contabilidad/declaraciones/:id
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const actualizarDeclaracion = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.user;
    
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_DECLARATIONS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para actualizar declaraciones'
      });
    }
    
    const declaracion = await DeclaracionMensual.findById(id);
    
    if (!declaracion) {
      return res.status(404).json({
        success: false,
        message: 'Declaración no encontrada'
      });
    }
    
    const {
      pago,
      estado,
      fechaPresentacion,
      numeroOrden,
      observaciones,
      // Recalculation fields (optional)
      ventasGravadas,
      creditoFiscal,
      saldoFavorAnterior,
      coeficiente
    } = req.body;
    
    // If calculation fields provided, recalculate amounts
    if (ventasGravadas !== undefined || creditoFiscal !== undefined) {
      const cliente = await ClienteContable.findById(declaracion.clienteId);
      if (cliente) {
        const calculo = calcularDeclaracionCompleta({
          regimen: cliente.regimenTributario,
          ventasGravadas: ventasGravadas ?? 0,
          creditoFiscal: creditoFiscal ?? 0,
          saldoFavorAnterior: saldoFavorAnterior ?? 0,
          coeficiente: coeficiente || cliente.configuracionTributaria?.coeficienteRenta,
          categoriaRUS: cliente.configuracionTributaria?.categoriaRUS,
          zonaIGV: cliente.zonaIGV || 'GRAVADA'
        });
        if (calculo.detalleIGV) {
          declaracion.detalleIGV = {
            ventasGravadas: ventasGravadas ?? 0,
            debitoFiscal: calculo.detalleIGV.debitoFiscal,
            creditoFiscal: calculo.detalleIGV.creditoFiscal,
            igvResultante: calculo.detalleIGV.igvResultante,
            saldoFavorAnterior: calculo.detalleIGV.saldoFavorAnterior,
            igvAPagar: calculo.detalleIGV.igvAPagar,
            saldoFavorSiguiente: calculo.detalleIGV.saldoFavorSiguiente
          };
        }
        declaracion.detalleRenta = calculo.detalleRenta;
        declaracion.totalAPagar = calculo.resumen.totalAPagar;
      }
    }

    // Actualizar campos permitidos
    if (pago) declaracion.pago = { ...declaracion.pago.toObject?.() || declaracion.pago, ...pago };
    if (estado) declaracion.estado = estado;
    if (fechaPresentacion) declaracion.fechaPresentacion = new Date(fechaPresentacion);
    if (numeroOrden !== undefined) declaracion.numeroOrden = numeroOrden;
    if (observaciones !== undefined) declaracion.observaciones = observaciones;
    
    // Auto-detectar estado basado en datos
    if (pago?.montoPagado > 0 && fechaPresentacion) {
      declaracion.estado = 'PAGADO';
    } else if (fechaPresentacion && declaracion.estado === 'PENDIENTE') {
      declaracion.estado = 'PRESENTADO';
    }
    
    await declaracion.save();
    
    logger.info(`✏️ Declaración actualizada: ${id} → Estado: ${declaracion.estado}`);
    
    res.json({
      success: true,
      message: 'Declaración actualizada exitosamente',
      data: declaracion
    });
    
  } catch (error) {
    logger.error('Error actualizando declaración:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar declaración',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 🔄 CAMBIAR ESTADO
// ========================================

/**
 * @desc    Cambiar estado de una declaración
 * @route   PATCH /api/contabilidad/declaraciones/:id/estado
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const cambiarEstadoDeclaracion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const { role } = req.user;
    
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_DECLARATIONS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cambiar el estado'
      });
    }
    
    const estadosValidos = ['PENDIENTE', 'PRESENTADO', 'PAGADO', 'VENCIDO', 'RECTIFICADO'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Opciones: ${estadosValidos.join(', ')}`
      });
    }
    
    const declaracion = await DeclaracionMensual.findByIdAndUpdate(
      id,
      { estado },
      { new: true, runValidators: true }
    );
    
    if (!declaracion) {
      return res.status(404).json({
        success: false,
        message: 'Declaración no encontrada'
      });
    }
    
    logger.info(`🔄 Estado de declaración ${id} cambiado a ${estado}`);
    
    res.json({
      success: true,
      message: `Estado cambiado a ${estado}`,
      data: declaracion
    });
    
  } catch (error) {
    logger.error('Error cambiando estado de declaración:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 👤 PORTAL CLIENTE: Mis Declaraciones
// ========================================

/**
 * @desc    Obtener declaraciones del cliente autenticado
 * @route   GET /api/contabilidad/mis-declaraciones
 * @access  Private (CLIENT, USER)
 */
export const getMisDeclaraciones = async (req, res) => {
  try {
    const { clerkId } = req.user;
    const { anio, page = 1, limit = 12 } = req.query;
    
    // Buscar el cliente contable vinculado al usuario
    const cliente = await ClienteContable.findByUsuarioVinculado(clerkId);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'No tienes una cuenta contable vinculada',
        code: 'NO_ACCOUNTING_ACCOUNT'
      });
    }
    
    let filter = { clienteId: cliente._id, activo: true };
    
    if (anio) {
      filter.anio = parseInt(anio);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [declaraciones, total] = await Promise.all([
      DeclaracionMensual.find(filter)
        .select('periodo anio mes estado totalAPagar fechaPresentacion fechaVencimiento detalleIGV.igvAPagar detalleRenta.rentaAPagar detalleRenta.regimenAplicado pago.montoPagado')
        .sort({ periodo: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean({ virtuals: true }),
      DeclaracionMensual.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      data: {
        cliente: {
          ruc: cliente.ruc,
          razonSocial: cliente.razonSocial,
          regimen: cliente.regimenTributario
        },
        declaraciones,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: declaraciones.length,
          totalItems: total
        }
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo declaraciones del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener declaraciones',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 👤 PORTAL CLIENTE: Mi Estado
// ========================================

/**
 * @desc    Obtener estado resumido del cliente autenticado
 * @route   GET /api/contabilidad/mi-estado
 * @access  Private (CLIENT, USER)
 */
export const getMiEstado = async (req, res) => {
  try {
    const { clerkId } = req.user;
    
    const cliente = await ClienteContable.findByUsuarioVinculado(clerkId);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'No tienes una cuenta contable vinculada',
        code: 'NO_ACCOUNTING_ACCOUNT'
      });
    }
    
    // Obtener último periodo declarado
    const ultimaDeclaracion = await DeclaracionMensual.findOne({
      clienteId: cliente._id,
      activo: true,
      estado: { $in: ['PRESENTADO', 'PAGADO'] }
    }).sort({ periodo: -1 }).lean({ virtuals: true });
    
    // Obtener declaraciones pendientes
    const pendientes = await DeclaracionMensual.find({
      clienteId: cliente._id,
      activo: true,
      estado: { $in: ['PENDIENTE', 'VENCIDO'] }
    }).sort({ periodo: -1 }).lean({ virtuals: true });
    
    // Verificar vencimiento del periodo actual
    const hoy = new Date();
    let mesAnterior = hoy.getMonth(); // 0-11
    let anioAnterior = hoy.getFullYear();
    if (mesAnterior === 0) { mesAnterior = 12; anioAnterior--; }
    const periodoActual = `${anioAnterior}-${String(mesAnterior).padStart(2, '0')}`;
    
    const vencimientoPeriodoActual = await obtenerFechaVencimiento(cliente.ruc, periodoActual);
    
    // Determinar estado general
    let estadoGeneral = 'AL_DIA';
    if (pendientes.some(p => p.estado === 'VENCIDO')) {
      estadoGeneral = 'VENCIDO';
    } else if (pendientes.length > 0) {
      estadoGeneral = 'PENDIENTE';
    }
    
    res.json({
      success: true,
      data: {
        estadoGeneral,
        ultimaDeclaracion: ultimaDeclaracion ? {
          periodo: ultimaDeclaracion.periodo,
          periodoFormateado: ultimaDeclaracion.periodoFormateado,
          estado: ultimaDeclaracion.estado,
          totalAPagar: ultimaDeclaracion.totalAPagar,
          fechaPresentacion: ultimaDeclaracion.fechaPresentacion
        } : null,
        declaracionesPendientes: pendientes.length,
        proximoVencimiento: vencimientoPeriodoActual,
        periodoActual
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo estado del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estado',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
