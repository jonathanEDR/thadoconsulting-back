import PaqueteServicio from '../models/PaqueteServicio.js';
import Servicio from '../models/Servicio.js';

/**
 * @desc    Obtener todos los paquetes de un servicio
 * @route   GET /api/servicios/:servicioId/paquetes
 * @access  Public
 */
export const getPaquetes = async (req, res) => {
  try {
    const { servicioId } = req.params;
    const { disponibles = true } = req.query;

    // Verificar que el servicio existe
    const servicio = await Servicio.findById(servicioId);
    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    const paquetes = await PaqueteServicio.findByServicio(
      servicioId,
      disponibles === 'true'
    );

    res.status(200).json({
      success: true,
      count: paquetes.length,
      data: paquetes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener paquetes',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener un paquete específico
 * @route   GET /api/paquetes/:id
 * @access  Public
 */
export const getPaquete = async (req, res) => {
  try {
    const paquete = await PaqueteServicio.findById(req.params.id)
      .populate('servicioId', 'titulo slug categoria');

    if (!paquete) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: paquete
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener el paquete',
      error: error.message
    });
  }
};

/**
 * @desc    Crear un nuevo paquete
 * @route   POST /api/servicios/:servicioId/paquetes
 * @access  Private
 */
export const createPaquete = async (req, res) => {
  try {
    const { servicioId } = req.params;

    // Verificar que el servicio existe
    const servicio = await Servicio.findById(servicioId);
    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Crear paquete
    const paquete = await PaqueteServicio.create({
      ...req.body,
      servicioId
    });

    res.status(201).json({
      success: true,
      message: 'Paquete creado exitosamente',
      data: paquete
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error al crear el paquete',
      error: error.message
    });
  }
};

/**
 * @desc    Actualizar un paquete
 * @route   PUT /api/paquetes/:id
 * @access  Private
 */
export const updatePaquete = async (req, res) => {
  try {
    const paquete = await PaqueteServicio.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!paquete) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Paquete actualizado exitosamente',
      data: paquete
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error al actualizar el paquete',
      error: error.message
    });
  }
};

/**
 * @desc    Eliminar un paquete
 * @route   DELETE /api/paquetes/:id
 * @access  Private
 */
export const deletePaquete = async (req, res) => {
  try {
    const paquete = await PaqueteServicio.findByIdAndDelete(req.params.id);

    if (!paquete) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Paquete eliminado exitosamente',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el paquete',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener paquete más popular de un servicio
 * @route   GET /api/servicios/:servicioId/paquetes/popular
 * @access  Public
 */
export const getPaqueteMasPopular = async (req, res) => {
  try {
    const { servicioId } = req.params;

    const paquete = await PaqueteServicio.getMasPopular(servicioId);

    if (!paquete) {
      return res.status(404).json({
        success: false,
        message: 'No hay paquetes disponibles para este servicio'
      });
    }

    res.status(200).json({
      success: true,
      data: paquete
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener el paquete más popular',
      error: error.message
    });
  }
};

/**
 * @desc    Duplicar un paquete
 * @route   POST /api/paquetes/:id/duplicar
 * @access  Private
 */
export const duplicarPaquete = async (req, res) => {
  try {
    const paqueteOriginal = await PaqueteServicio.findById(req.params.id);

    if (!paqueteOriginal) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    // Crear copia
    const paqueteCopia = paqueteOriginal.toObject();
    delete paqueteCopia._id;
    delete paqueteCopia.createdAt;
    delete paqueteCopia.updatedAt;
    paqueteCopia.nombre = `${paqueteCopia.nombre} (Copia)`;
    paqueteCopia.vecesVendido = 0;
    paqueteCopia.ingresoTotal = 0;

    const nuevoPaquete = await PaqueteServicio.create(paqueteCopia);

    res.status(201).json({
      success: true,
      message: 'Paquete duplicado exitosamente',
      data: nuevoPaquete
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error al duplicar el paquete',
      error: error.message
    });
  }
};

/**
 * @desc    Registrar venta de un paquete
 * @route   POST /api/paquetes/:id/venta
 * @access  Private
 */
export const registrarVenta = async (req, res) => {
  try {
    const { cantidad = 1 } = req.body;
    
    const paquete = await PaqueteServicio.findById(req.params.id);

    if (!paquete) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    if (!paquete.disponible) {
      return res.status(400).json({
        success: false,
        message: 'Este paquete no está disponible'
      });
    }

    // Verificar stock
    if (!paquete.stockIlimitado && paquete.stock < cantidad) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Solo quedan ${paquete.stock} unidades`
      });
    }

    await paquete.registrarVenta(cantidad);

    // También actualizar el servicio padre
    const servicio = await Servicio.findById(paquete.servicioId);
    if (servicio) {
      await servicio.registrarVenta(paquete.precioConDescuento * cantidad);
    }

    res.status(200).json({
      success: true,
      message: 'Venta registrada exitosamente',
      data: paquete
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error al registrar la venta',
      error: error.message
    });
  }
};

export default {
  getPaquetes,
  getPaquete,
  createPaquete,
  updatePaquete,
  deletePaquete,
  getPaqueteMasPopular,
  duplicarPaquete,
  registrarVenta
};
