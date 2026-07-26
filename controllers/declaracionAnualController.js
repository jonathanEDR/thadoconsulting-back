import DeclaracionAnual from '../models/DeclaracionAnual.js';
import DeclaracionMensual from '../models/DeclaracionMensual.js';
import ClienteContable from '../models/ClienteContable.js';
import { calcularRentaAnual } from '../services/calculadoraImpuestos.js';
import { hasPermission } from '../utils/roleHelper.js';
import { PERMISSIONS } from '../config/roles.js';
import logger from '../utils/logger.js';

/**
 * 📅 Controller de Declaración Jurada Anual de Renta (Formulario Virtual 710)
 * Aplica solo a clientes en régimen MYPE Tributario o Régimen General.
 */

/**
 * Suma las ventas gravadas y los pagos a cuenta de renta de las declaraciones
 * mensuales IGV/Renta activas de un cliente en un año dado. Es la única fuente
 * de verdad para "pagos a cuenta ya realizados" — nunca se acepta ese total
 * directamente del cliente.
 */
const calcularBaseAnual = async (clienteId, anio) => {
  const declaracionesDelAnio = await DeclaracionMensual.find({
    clienteId,
    tipo: 'IGV_RENTA',
    anio,
    activo: true
  }).lean();

  const rentaNetaAnualSugerida = declaracionesDelAnio.reduce(
    (sum, d) => sum + (d.detalleIGV?.ventasGravadas || 0),
    0
  );
  const totalPagosACuenta = declaracionesDelAnio.reduce(
    (sum, d) => sum + (d.detalleRenta?.rentaAPagar || 0),
    0
  );

  return {
    rentaNetaAnualSugerida: Math.round(rentaNetaAnualSugerida),
    totalPagosACuenta: Math.round(totalPagosACuenta),
    mesesDeclaradosConsiderados: declaracionesDelAnio.length
  };
};

// ========================================
// 💡 SUGERENCIA DE RENTA NETA ANUAL
// ========================================

/**
 * @desc    Sugerir renta neta anual y pagos a cuenta a partir de las declaraciones mensuales
 * @route   GET /api/contabilidad/declaraciones-anuales/sugerencia?clienteId=&anio=
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const getSugerenciaRentaAnual = async (req, res) => {
  try {
    const { role } = req.user;
    if (!hasPermission(role, PERMISSIONS.VIEW_ACCOUNTING_DECLARATIONS)) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para ver declaraciones' });
    }

    const { clienteId, anio } = req.query;
    if (!clienteId || !anio) {
      return res.status(400).json({ success: false, message: 'clienteId y anio son requeridos' });
    }

    const base = await calcularBaseAnual(clienteId, parseInt(anio));

    res.json({ success: true, data: base });
  } catch (error) {
    logger.error('Error obteniendo sugerencia de renta anual:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener sugerencia de renta anual',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 🧮 CALCULAR DJ ANUAL (PREVIEW)
// ========================================

/**
 * @desc    Calcular la Declaración Anual sin guardar (preview)
 * @route   POST /api/contabilidad/declaraciones-anuales/calcular
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const calcularPreviewAnual = async (req, res) => {
  try {
    const { role } = req.user;
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_DECLARATIONS)) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para calcular declaraciones' });
    }

    const { clienteId, anio, rentaNetaAnual } = req.body;
    if (!clienteId || !anio) {
      return res.status(400).json({ success: false, message: 'clienteId y anio son requeridos' });
    }

    const cliente = await ClienteContable.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente contable no encontrado' });
    }

    if (cliente.regimenTributario !== 'MYPE' && cliente.regimenTributario !== 'GENERAL') {
      return res.status(400).json({
        success: false,
        message: 'La Declaración Anual solo aplica a régimen MYPE Tributario o Régimen General'
      });
    }

    const base = await calcularBaseAnual(clienteId, parseInt(anio));
    const rentaBase = rentaNetaAnual !== undefined ? rentaNetaAnual : base.rentaNetaAnualSugerida;

    const calculo = calcularRentaAnual(cliente.regimenTributario, rentaBase, base.totalPagosACuenta);

    res.json({
      success: true,
      data: {
        ...calculo,
        rentaNetaAnualSugerida: base.rentaNetaAnualSugerida,
        mesesDeclaradosConsiderados: base.mesesDeclaradosConsiderados
      }
    });
  } catch (error) {
    logger.error('Error calculando declaración anual:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al calcular declaración anual'
    });
  }
};

// ========================================
// ➕ REGISTRAR DECLARACIÓN ANUAL
// ========================================

/**
 * @desc    Registrar la Declaración Jurada Anual de un cliente para un año
 * @route   POST /api/contabilidad/declaraciones-anuales
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const registrarDeclaracionAnual = async (req, res) => {
  try {
    const { role, clerkId, firstName, lastName, email } = req.user;
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_DECLARATIONS)) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para registrar declaraciones' });
    }

    const {
      clienteId,
      anio,
      rentaNetaAnual,
      formulario,
      numeroOrden,
      fechaPresentacion,
      fechaVencimiento,
      pago,
      observaciones,
      estado
    } = req.body;

    if (!clienteId || !anio) {
      return res.status(400).json({ success: false, message: 'clienteId y anio son requeridos' });
    }

    const cliente = await ClienteContable.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente contable no encontrado' });
    }

    if (cliente.regimenTributario !== 'MYPE' && cliente.regimenTributario !== 'GENERAL') {
      return res.status(400).json({
        success: false,
        message: 'La Declaración Anual solo aplica a régimen MYPE Tributario o Régimen General'
      });
    }

    const existente = await DeclaracionAnual.findOne({ clienteId, anio, activo: true });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe una Declaración Anual ${anio} para este cliente. Use rectificatoria si necesita modificarla.`
      });
    }

    const base = await calcularBaseAnual(clienteId, parseInt(anio));
    const rentaBase = rentaNetaAnual !== undefined ? rentaNetaAnual : base.rentaNetaAnualSugerida;
    const calculo = calcularRentaAnual(cliente.regimenTributario, rentaBase, base.totalPagosACuenta);

    let estadoFinal = estado || 'PENDIENTE';
    if (fechaPresentacion && pago?.montoPagado > 0) {
      estadoFinal = 'PAGADO';
    } else if (fechaPresentacion) {
      estadoFinal = 'PRESENTADO';
    }

    const nuevaDeclaracion = new DeclaracionAnual({
      clienteId,
      anio: parseInt(anio),
      regimenAplicado: cliente.regimenTributario,
      rentaNetaAnual: calculo.rentaNetaAnual,
      rentaNetaAnualSugerida: base.rentaNetaAnualSugerida,
      mesesDeclaradosConsiderados: base.mesesDeclaradosConsiderados,
      uitAplicada: calculo.uitAplicada,
      tramos: calculo.tramos,
      impuestoCalculado: calculo.impuestoCalculado,
      totalPagosACuenta: calculo.totalPagosACuenta,
      saldoAPagar: calculo.saldoAPagar,
      saldoAFavor: calculo.saldoAFavor,
      formulario: formulario || 'FV710',
      numeroOrden,
      pago: pago || {},
      fechaPresentacion: fechaPresentacion ? new Date(fechaPresentacion) : null,
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
      estado: estadoFinal,
      observaciones,
      registradoPor: {
        userId: clerkId,
        nombre: `${firstName || ''} ${lastName || ''}`.trim(),
        email
      }
    });

    await nuevaDeclaracion.save();

    logger.info(`📅 Declaración Anual ${anio} registrada: ${cliente.razonSocial} - Impuesto: S/ ${calculo.impuestoCalculado}`);

    res.status(201).json({
      success: true,
      message: 'Declaración Anual registrada exitosamente',
      data: nuevaDeclaracion
    });
  } catch (error) {
    logger.error('Error registrando declaración anual:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una Declaración Anual para este cliente y año'
      });
    }
    if (error.name === 'ValidationError') {
      const errores = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: 'Error de validación', errors: errores });
    }

    res.status(500).json({
      success: false,
      message: 'Error al registrar declaración anual',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 📋 LISTAR / OBTENER
// ========================================

/**
 * @desc    Listar historial de Declaraciones Anuales de un cliente
 * @route   GET /api/contabilidad/declaraciones-anuales/cliente/:clienteId
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const listarDeclaracionesAnuales = async (req, res) => {
  try {
    const { role } = req.user;
    if (!hasPermission(role, PERMISSIONS.VIEW_ACCOUNTING_DECLARATIONS)) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para ver declaraciones' });
    }

    const { clienteId } = req.params;
    const declaraciones = await DeclaracionAnual.getHistorialCliente(clienteId);

    res.json({ success: true, data: declaraciones });
  } catch (error) {
    logger.error('Error listando declaraciones anuales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar declaraciones anuales',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// ✏️ ACTUALIZAR
// ========================================

/**
 * @desc    Actualizar una Declaración Anual (recalcula si cambia la renta neta)
 * @route   PUT /api/contabilidad/declaraciones-anuales/:id
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const actualizarDeclaracionAnual = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.user;
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_DECLARATIONS)) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para actualizar declaraciones' });
    }

    const declaracion = await DeclaracionAnual.findById(id);
    if (!declaracion) {
      return res.status(404).json({ success: false, message: 'Declaración Anual no encontrada' });
    }

    const {
      rentaNetaAnual,
      pago,
      estado,
      fechaPresentacion,
      fechaVencimiento,
      numeroOrden,
      observaciones
    } = req.body;

    if (rentaNetaAnual !== undefined) {
      const cliente = await ClienteContable.findById(declaracion.clienteId);
      if (cliente) {
        const base = await calcularBaseAnual(declaracion.clienteId, declaracion.anio);
        const calculo = calcularRentaAnual(cliente.regimenTributario, rentaNetaAnual, base.totalPagosACuenta);

        declaracion.rentaNetaAnual = calculo.rentaNetaAnual;
        declaracion.uitAplicada = calculo.uitAplicada;
        declaracion.tramos = calculo.tramos;
        declaracion.impuestoCalculado = calculo.impuestoCalculado;
        declaracion.totalPagosACuenta = calculo.totalPagosACuenta;
        declaracion.saldoAPagar = calculo.saldoAPagar;
        declaracion.saldoAFavor = calculo.saldoAFavor;
      }
    }

    if (pago) declaracion.pago = { ...declaracion.pago.toObject?.() || declaracion.pago, ...pago };
    if (estado) declaracion.estado = estado;
    if (fechaPresentacion) declaracion.fechaPresentacion = new Date(fechaPresentacion);
    if (fechaVencimiento) declaracion.fechaVencimiento = new Date(fechaVencimiento);
    if (numeroOrden !== undefined) declaracion.numeroOrden = numeroOrden;
    if (observaciones !== undefined) declaracion.observaciones = observaciones;

    if (fechaPresentacion && (pago?.montoPagado > 0 || declaracion.pago?.montoPagado > 0)) {
      declaracion.estado = 'PAGADO';
    } else if (fechaPresentacion && !estado) {
      declaracion.estado = 'PRESENTADO';
    }

    await declaracion.save();

    res.json({
      success: true,
      message: 'Declaración Anual actualizada exitosamente',
      data: declaracion
    });
  } catch (error) {
    logger.error('Error actualizando declaración anual:', error);
    if (error.name === 'ValidationError') {
      const errores = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: 'Error de validación', errors: errores });
    }
    res.status(500).json({
      success: false,
      message: 'Error al actualizar declaración anual',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 🗑️ ELIMINAR (SOFT DELETE)
// ========================================

/**
 * @desc    Eliminar una Declaración Anual (soft delete)
 * @route   DELETE /api/contabilidad/declaraciones-anuales/:id
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const eliminarDeclaracionAnual = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const { role } = req.user;
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_DECLARATIONS)) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para eliminar declaraciones' });
    }

    const declaracion = await DeclaracionAnual.findById(id);
    if (!declaracion) {
      return res.status(404).json({ success: false, message: 'Declaración Anual no encontrada' });
    }

    if (declaracion.estado === 'PAGADO') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una Declaración Anual ya pagada. Use rectificatoria.'
      });
    }

    declaracion.activo = false;
    declaracion.observaciones = motivo
      ? `[ELIMINADA] ${motivo}`
      : '[ELIMINADA POR ADMINISTRADOR]';
    await declaracion.save();

    logger.info(`Declaración Anual ${id} eliminada (año: ${declaracion.anio})`);

    res.json({
      success: true,
      message: `Declaración Anual ${declaracion.anio} eliminada correctamente`
    });
  } catch (error) {
    logger.error('Error eliminando declaración anual:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al eliminar declaración anual' });
  }
};
