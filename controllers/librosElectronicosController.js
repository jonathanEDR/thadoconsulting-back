import PresentacionLibro, { CATALOGO_LIBROS, LIBROS_POR_REGIMEN } from '../models/PresentacionLibro.js';
import ClienteContable from '../models/ClienteContable.js';

/**
 * 📚 Controller de Libros Electrónicos
 * Gestión de presentaciones de libros para clientes contables
 */

/**
 * GET /api/contabilidad/libros/catalogo
 * Obtener catálogo de libros disponibles y configuración por régimen
 */
export const getCatalogoLibros = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        catalogo: CATALOGO_LIBROS,
        librosPorRegimen: LIBROS_POR_REGIMEN
      }
    });
  } catch (error) {
    console.error('[getCatalogoLibros] Error:', error);
    res.status(500).json({ success: false, message: 'Error al obtener catálogo' });
  }
};

/**
 * GET /api/contabilidad/libros/cliente/:clienteId
 * Obtener libros configurados de un cliente + presentaciones del periodo
 */
export const getLibrosCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { periodo, anio } = req.query;

    const cliente = await ClienteContable.findById(clienteId)
      .select('ruc razonSocial regimenTributario configuracionTributaria')
      .lean();

    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    // Libros configurados del cliente
    const librosConfigurados = cliente.configuracionTributaria?.librosElectronicos || [];

    // Query para presentaciones
    const query = { clienteId, activo: true };
    if (periodo) {
      query.periodo = periodo;
    } else if (anio) {
      query.anio = parseInt(anio);
    }

    const presentaciones = await PresentacionLibro.find(query)
      .sort({ periodo: -1, codigoLibro: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        cliente: {
          _id: cliente._id,
          ruc: cliente.ruc,
          razonSocial: cliente.razonSocial,
          regimenTributario: cliente.regimenTributario,
          librosConfigurados
        },
        presentaciones,
        catalogo: CATALOGO_LIBROS
      }
    });
  } catch (error) {
    console.error('[getLibrosCliente] Error:', error);
    res.status(500).json({ success: false, message: 'Error al obtener libros del cliente' });
  }
};

/**
 * GET /api/contabilidad/libros/cliente/:clienteId/periodo/:periodo
 * Obtener estado de libros de un cliente en un periodo específico
 * Si no existen presentaciones, crea las pendientes automáticamente
 */
export const getLibrosPeriodo = async (req, res) => {
  try {
    const { clienteId, periodo } = req.params;

    const cliente = await ClienteContable.findById(clienteId)
      .select('configuracionTributaria regimenTributario')
      .lean();

    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    const librosConfigurados = cliente.configuracionTributaria?.librosElectronicos || [];
    
    if (librosConfigurados.length === 0) {
      return res.json({
        success: true,
        data: { presentaciones: [], librosConfigurados: [] }
      });
    }

    // Buscar presentaciones existentes para este periodo
    let presentaciones = await PresentacionLibro.find({
      clienteId,
      periodo,
      activo: true
    }).lean();

    // Si no hay presentaciones para este periodo, crear las pendientes
    if (presentaciones.length === 0) {
      const [anioStr, mesStr] = periodo.split('-');
      const bulkOps = librosConfigurados.map(codigo => ({
        clienteId,
        periodo,
        anio: parseInt(anioStr),
        mes: parseInt(mesStr),
        codigoLibro: codigo,
        nombreLibro: CATALOGO_LIBROS[codigo]?.nombre || `Libro ${codigo}`,
        sistema: CATALOGO_LIBROS[codigo]?.sistema || 'PLE',
        estado: 'PENDIENTE',
        registradoPor: {
          userId: req.auth?.userId || 'system',
          nombre: 'Auto-generado'
        }
      }));

      await PresentacionLibro.insertMany(bulkOps, { ordered: false }).catch(() => {
        // Ignorar duplicados
      });

      presentaciones = await PresentacionLibro.find({
        clienteId,
        periodo,
        activo: true
      }).lean();
    }

    res.json({
      success: true,
      data: {
        presentaciones,
        librosConfigurados
      }
    });
  } catch (error) {
    console.error('[getLibrosPeriodo] Error:', error);
    res.status(500).json({ success: false, message: 'Error al obtener libros del periodo' });
  }
};

/**
 * POST /api/contabilidad/libros
 * Registrar presentación de un libro electrónico
 */
export const registrarPresentacionLibro = async (req, res) => {
  try {
    const { clienteId, periodo, codigoLibro, codigoConstancia, observaciones } = req.body;

    if (!clienteId || !periodo || !codigoLibro) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere clienteId, periodo y codigoLibro'
      });
    }

    const [anioStr, mesStr] = periodo.split('-');
    const libroInfo = CATALOGO_LIBROS[codigoLibro];

    // Buscar si ya existe
    let presentacion = await PresentacionLibro.findOne({
      clienteId,
      periodo,
      codigoLibro,
      activo: true
    });

    if (presentacion) {
      // Actualizar la existente
      presentacion.estado = 'PRESENTADO';
      presentacion.codigoConstancia = codigoConstancia || '';
      presentacion.fechaPresentacion = new Date();
      presentacion.observaciones = observaciones || '';
      presentacion.registradoPor = {
        userId: req.auth?.userId || 'unknown',
        nombre: req.auth?.name || ''
      };
      await presentacion.save();
    } else {
      // Crear nueva
      presentacion = await PresentacionLibro.create({
        clienteId,
        periodo,
        anio: parseInt(anioStr),
        mes: parseInt(mesStr),
        codigoLibro,
        nombreLibro: libroInfo?.nombre || `Libro ${codigoLibro}`,
        sistema: libroInfo?.sistema || 'PLE',
        estado: 'PRESENTADO',
        codigoConstancia: codigoConstancia || '',
        fechaPresentacion: new Date(),
        observaciones: observaciones || '',
        registradoPor: {
          userId: req.auth?.userId || 'unknown',
          nombre: req.auth?.name || ''
        }
      });
    }

    res.status(201).json({
      success: true,
      data: presentacion,
      message: `Libro "${presentacion.nombreLibro}" registrado para ${periodo}`
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Este libro ya fue registrado para este periodo'
      });
    }
    console.error('[registrarPresentacionLibro] Error:', error);
    res.status(500).json({ success: false, message: 'Error al registrar libro' });
  }
};

/**
 * PUT /api/contabilidad/libros/:id
 * Actualizar presentación de un libro
 */
export const actualizarPresentacionLibro = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, codigoConstancia, observaciones } = req.body;

    const presentacion = await PresentacionLibro.findById(id);
    if (!presentacion || !presentacion.activo) {
      return res.status(404).json({ success: false, message: 'Presentación no encontrada' });
    }

    if (estado) presentacion.estado = estado;
    if (codigoConstancia !== undefined) presentacion.codigoConstancia = codigoConstancia;
    if (observaciones !== undefined) presentacion.observaciones = observaciones;
    
    if (estado === 'PRESENTADO' && !presentacion.fechaPresentacion) {
      presentacion.fechaPresentacion = new Date();
    }

    presentacion.registradoPor = {
      userId: req.auth?.userId || 'unknown',
      nombre: req.auth?.name || ''
    };

    await presentacion.save();

    res.json({
      success: true,
      data: presentacion,
      message: 'Presentación actualizada correctamente'
    });
  } catch (error) {
    console.error('[actualizarPresentacionLibro] Error:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar' });
  }
};

/**
 * PUT /api/contabilidad/libros/cliente/:clienteId/configurar
 * Configurar qué libros debe llevar un cliente
 */
export const configurarLibrosCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { libros } = req.body; // Array de códigos de libros

    if (!Array.isArray(libros)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de códigos de libros'
      });
    }

    // Validar que los códigos existan en el catálogo
    const codigosValidos = Object.keys(CATALOGO_LIBROS);
    const codigosInvalidos = libros.filter(c => !codigosValidos.includes(c));
    if (codigosInvalidos.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Códigos de libro inválidos: ${codigosInvalidos.join(', ')}`
      });
    }

    const cliente = await ClienteContable.findByIdAndUpdate(
      clienteId,
      { 'configuracionTributaria.librosElectronicos': libros },
      { new: true }
    ).select('ruc razonSocial regimenTributario configuracionTributaria');

    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    res.json({
      success: true,
      data: cliente,
      message: `${libros.length} libro(s) configurado(s) para ${cliente.razonSocial}`
    });
  } catch (error) {
    console.error('[configurarLibrosCliente] Error:', error);
    res.status(500).json({ success: false, message: 'Error al configurar libros' });
  }
};
