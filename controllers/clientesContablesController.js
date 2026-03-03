import ClienteContable from '../models/ClienteContable.js';
import User from '../models/User.js';
import { hasPermission } from '../utils/roleHelper.js';
import { PERMISSIONS } from '../config/roles.js';
import { obtenerSemaforoVencimientos, obtenerEstadisticasGenerales } from '../services/alertasContablesService.js';
import logger from '../utils/logger.js';

/**
 * 🏢 Controller de Clientes Contables
 * CRUD completo + funcionalidades específicas de gestión contable
 */

// ========================================
// 📋 LISTAR CLIENTES
// ========================================

/**
 * @desc    Obtener lista de clientes contables con filtros
 * @route   GET /api/contabilidad/clientes
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const listarClientes = async (req, res) => {
  try {
    const { role } = req.user;
    
    // Verificar permisos
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_CLIENTS) && 
        !hasPermission(role, PERMISSIONS.VIEW_ACCOUNTING_CLIENTS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver clientes contables'
      });
    }
    
    const {
      search,
      regimen,
      estado = 'activo',
      page = 1,
      limit = 20,
      sort = 'razonSocial',
      order = 'asc'
    } = req.query;
    
    // Construir filtro
    let filter = { activo: true };
    
    if (estado && estado !== 'todos') {
      filter.estado = estado;
    }
    
    if (regimen && regimen !== 'todos') {
      filter.regimenTributario = regimen;
    }
    
    // Búsqueda por texto
    if (search) {
      filter.$or = [
        { razonSocial: { $regex: search, $options: 'i' } },
        { ruc: { $regex: search, $options: 'i' } },
        { nombreComercial: { $regex: search, $options: 'i' } },
        { 'representante.nombre': { $regex: search, $options: 'i' } },
        { 'contacto.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Ordenamiento
    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;
    
    const [clientes, total] = await Promise.all([
      ClienteContable.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean({ virtuals: true }),
      ClienteContable.countDocuments(filter)
    ]);
    
    logger.debug(`Listado de clientes contables: ${clientes.length} de ${total}`);
    
    res.json({
      success: true,
      data: clientes,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: clientes.length,
        totalItems: total
      }
    });
    
  } catch (error) {
    logger.error('Error listando clientes contables:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener clientes contables',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 👁️ OBTENER CLIENTE ESPECÍFICO
// ========================================

/**
 * @desc    Obtener ficha completa de un cliente contable
 * @route   GET /api/contabilidad/clientes/:id
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const obtenerCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.user;
    
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_CLIENTS) && 
        !hasPermission(role, PERMISSIONS.VIEW_ACCOUNTING_CLIENTS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este cliente'
      });
    }
    
    const cliente = await ClienteContable.findById(id).lean({ virtuals: true });
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente contable no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: cliente
    });
    
  } catch (error) {
    logger.error('Error obteniendo cliente contable:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener cliente contable',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// ➕ CREAR CLIENTE
// ========================================

/**
 * @desc    Crear nuevo cliente contable
 * @route   POST /api/contabilidad/clientes
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const crearCliente = async (req, res) => {
  try {
    const { role, clerkId, firstName, lastName, email } = req.user;
    
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_CLIENTS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear clientes contables'
      });
    }
    
    const {
      ruc,
      razonSocial,
      nombreComercial,
      regimenTributario,
      direccionFiscal,
      representante,
      contacto,
      honorarioMensual,
      moneda,
      linkDrive,
      configuracionTributaria,
      fechaInicioServicios,
      tags
    } = req.body;
    
    // Verificar si ya existe un cliente con ese RUC
    const existente = await ClienteContable.findOne({ ruc });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un cliente con RUC ${ruc}`
      });
    }
    
    const nuevoCliente = new ClienteContable({
      ruc,
      razonSocial,
      nombreComercial,
      regimenTributario,
      direccionFiscal,
      representante,
      contacto,
      honorarioMensual,
      moneda,
      linkDrive,
      configuracionTributaria,
      fechaInicioServicios,
      tags,
      contadorAsignado: {
        userId: clerkId,
        nombre: `${firstName || ''} ${lastName || ''}`.trim(),
        email
      }
    });
    
    await nuevoCliente.save();
    
    logger.info(`✅ Cliente contable creado: ${razonSocial} (RUC: ${ruc})`);
    
    res.status(201).json({
      success: true,
      message: 'Cliente contable creado exitosamente',
      data: nuevoCliente
    });
    
  } catch (error) {
    logger.error('Error creando cliente contable:', error);
    
    // Manejar error de duplicado
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un cliente con ese RUC'
      });
    }
    
    // Manejar errores de validación
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
      message: 'Error al crear cliente contable',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// ✏️ ACTUALIZAR CLIENTE
// ========================================

/**
 * @desc    Actualizar datos de un cliente contable
 * @route   PUT /api/contabilidad/clientes/:id
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.user;
    
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_CLIENTS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para editar clientes contables'
      });
    }
    
    const cliente = await ClienteContable.findById(id);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente contable no encontrado'
      });
    }
    
    // Campos actualizables
    const camposPermitidos = [
      'razonSocial', 'nombreComercial', 'regimenTributario',
      'direccionFiscal', 'representante', 'contacto',
      'honorarioMensual', 'moneda', 'linkDrive',
      'configuracionTributaria', 'tags', 'fechaInicioServicios'
    ];
    
    camposPermitidos.forEach(campo => {
      if (req.body[campo] !== undefined) {
        cliente[campo] = req.body[campo];
      }
    });
    
    // RUC solo se puede cambiar si no hay declaraciones asociadas
    if (req.body.ruc && req.body.ruc !== cliente.ruc) {
      const DeclaracionMensual = (await import('../models/DeclaracionMensual.js')).default;
      const tieneDeclaraciones = await DeclaracionMensual.countDocuments({ clienteId: id, activo: true });
      
      if (tieneDeclaraciones > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede cambiar el RUC porque ya tiene declaraciones registradas'
        });
      }
      
      // Verificar que el nuevo RUC no exista
      const rucExistente = await ClienteContable.findOne({ ruc: req.body.ruc, _id: { $ne: id } });
      if (rucExistente) {
        return res.status(400).json({
          success: false,
          message: `Ya existe otro cliente con RUC ${req.body.ruc}`
        });
      }
      
      cliente.ruc = req.body.ruc;
    }
    
    await cliente.save();
    
    logger.info(`✏️ Cliente contable actualizado: ${cliente.razonSocial} (RUC: ${cliente.ruc})`);
    
    res.json({
      success: true,
      message: 'Cliente contable actualizado exitosamente',
      data: cliente
    });
    
  } catch (error) {
    logger.error('Error actualizando cliente contable:', error);
    
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
      message: 'Error al actualizar cliente contable',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 🗑️ DAR DE BAJA (SOFT DELETE)
// ========================================

/**
 * @desc    Dar de baja un cliente contable (baja lógica)
 * @route   DELETE /api/contabilidad/clientes/:id
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const darDeBajaCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.user;
    const { motivo } = req.body;
    
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_CLIENTS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para dar de baja clientes'
      });
    }
    
    const cliente = await ClienteContable.findById(id);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente contable no encontrado'
      });
    }
    
    await cliente.darDeBaja(motivo || 'Baja solicitada por administrador');
    
    logger.info(`🗑️ Cliente contable dado de baja: ${cliente.razonSocial} (RUC: ${cliente.ruc})`);
    
    res.json({
      success: true,
      message: `Cliente ${cliente.razonSocial} dado de baja exitosamente`,
      data: cliente
    });
    
  } catch (error) {
    logger.error('Error dando de baja cliente contable:', error);
    res.status(500).json({
      success: false,
      message: 'Error al dar de baja cliente contable',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 🔄 REACTIVAR CLIENTE
// ========================================

/**
 * @desc    Reactivar un cliente contable dado de baja
 * @route   PATCH /api/contabilidad/clientes/:id/reactivar
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const reactivarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.user;
    
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_CLIENTS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para reactivar clientes'
      });
    }
    
    const cliente = await ClienteContable.findById(id);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente contable no encontrado'
      });
    }
    
    await cliente.reactivar();
    
    logger.info(`🔄 Cliente contable reactivado: ${cliente.razonSocial}`);
    
    res.json({
      success: true,
      message: `Cliente ${cliente.razonSocial} reactivado exitosamente`,
      data: cliente
    });
    
  } catch (error) {
    logger.error('Error reactivando cliente contable:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reactivar cliente contable',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 🔗 VINCULAR USUARIO DEL SISTEMA
// ========================================

/**
 * @desc    Vincular un usuario del sistema (rol CLIENT) a un cliente contable
 * @route   POST /api/contabilidad/clientes/:id/vincular-usuario
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const vincularUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, clerkId: adminClerkId, firstName: adminFirst, lastName: adminLast } = req.user;
    const { userId } = req.body; // MongoDB _id del usuario a vincular
    
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_CLIENTS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para vincular usuarios'
      });
    }
    
    const [cliente, usuario] = await Promise.all([
      ClienteContable.findById(id),
      User.findById(userId)
    ]);
    
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
    
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    // Verificar que el usuario no esté ya vinculado a otro cliente
    const yaVinculado = await ClienteContable.findOne({
      'usuarioVinculado.userId': userId,
      _id: { $ne: id },
      activo: true
    });
    
    if (yaVinculado) {
      return res.status(400).json({
        success: false,
        message: `Este usuario ya está vinculado al cliente ${yaVinculado.razonSocial}`
      });
    }
    
    cliente.usuarioVinculado = {
      userId: usuario._id,
      clerkId: usuario.clerkId,
      email: usuario.email,
      vinculadoEn: new Date(),
      vinculadoPor: {
        userId: adminClerkId,
        nombre: `${adminFirst || ''} ${adminLast || ''}`.trim()
      }
    };
    
    await cliente.save();
    
    logger.info(`🔗 Usuario ${usuario.email} vinculado a cliente ${cliente.razonSocial}`);
    
    res.json({
      success: true,
      message: `Usuario vinculado exitosamente a ${cliente.razonSocial}`,
      data: cliente
    });
    
  } catch (error) {
    logger.error('Error vinculando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al vincular usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 🔓 DESVINCULAR USUARIO
// ========================================

/**
 * @desc    Desvincular usuario del sistema de un cliente contable
 * @route   DELETE /api/contabilidad/clientes/:id/vincular-usuario
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const desvincularUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.user;
    
    if (!hasPermission(role, PERMISSIONS.MANAGE_ACCOUNTING_CLIENTS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para desvincular usuarios'
      });
    }
    
    const cliente = await ClienteContable.findById(id);
    
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
    
    cliente.usuarioVinculado = {
      userId: null,
      clerkId: null,
      email: null,
      vinculadoEn: null,
      vinculadoPor: null
    };
    
    await cliente.save();
    
    logger.info(`🔓 Usuario desvinculado del cliente ${cliente.razonSocial}`);
    
    res.json({
      success: true,
      message: 'Usuario desvinculado exitosamente',
      data: cliente
    });
    
  } catch (error) {
    logger.error('Error desvinculando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desvincular usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 🚨 SEMÁFORO DE VENCIMIENTOS
// ========================================

/**
 * @desc    Obtener semáforo de vencimientos (dashboard)
 * @route   GET /api/contabilidad/alertas/semaforo
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const getSemaforoVencimientos = async (req, res) => {
  try {
    const { role } = req.user;
    
    if (!hasPermission(role, PERMISSIONS.VIEW_ACCOUNTING_CLIENTS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver alertas'
      });
    }
    
    const semaforo = await obtenerSemaforoVencimientos();
    
    res.json({
      success: true,
      data: semaforo
    });
    
  } catch (error) {
    logger.error('Error obteniendo semáforo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener semáforo de vencimientos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 📊 ESTADÍSTICAS GENERALES
// ========================================

/**
 * @desc    Obtener estadísticas generales del módulo contable
 * @route   GET /api/contabilidad/estadisticas
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
export const getEstadisticas = async (req, res) => {
  try {
    const { role } = req.user;
    
    if (!hasPermission(role, PERMISSIONS.VIEW_ACCOUNTING_CLIENTS)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver estadísticas'
      });
    }
    
    const estadisticas = await obtenerEstadisticasGenerales();
    
    res.json({
      success: true,
      data: estadisticas
    });
    
  } catch (error) {
    logger.error('Error obteniendo estadísticas contables:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// 👤 PORTAL CLIENTE: Mi Cuenta Contable
// ========================================

/**
 * @desc    Obtener datos contables del cliente autenticado
 * @route   GET /api/contabilidad/mi-cuenta
 * @access  Private (CLIENT, USER)
 */
export const getMiCuentaContable = async (req, res) => {
  try {
    const { clerkId } = req.user;
    
    const cliente = await ClienteContable.findByUsuarioVinculado(clerkId);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'No tienes una cuenta contable vinculada. Contacta a tu contador.',
        code: 'NO_ACCOUNTING_ACCOUNT'
      });
    }
    
    // Devolver datos limitados (sin info sensible)
    res.json({
      success: true,
      data: {
        _id: cliente._id,
        ruc: cliente.ruc,
        razonSocial: cliente.razonSocial,
        nombreComercial: cliente.nombreComercial,
        regimenTributario: cliente.regimenTributario,
        estado: cliente.estado,
        contadorAsignado: {
          nombre: cliente.contadorAsignado?.nombre || 'No asignado'
        }
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo cuenta contable del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos contables',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
