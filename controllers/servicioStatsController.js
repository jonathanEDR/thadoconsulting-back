import Servicio from '../models/Servicio.js';
import PaqueteServicio from '../models/PaqueteServicio.js';

/**
 * @desc    Obtener dashboard con métricas principales
 * @route   GET /api/servicios/dashboard
 * @access  Private
 */
export const getDashboard = async (req, res) => {
  try {
    // Contar servicios por estado
    const serviciosActivos = await Servicio.countDocuments({ 
      estado: 'activo', 
      eliminado: false 
    });
    
    const serviciosEnProgreso = await Servicio.countDocuments({ 
      estado: { $in: ['desarrollo', 'pausado'] },
      eliminado: false 
    });
    
    const serviciosCompletados = await Servicio.countDocuments({ 
      estado: { $in: ['activo', 'descontinuado'] },
      vecesVendido: { $gt: 0 },
      eliminado: false
    });

    // Calcular ingresos
    const fechaActual = new Date();
    const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
    const primerDiaAnio = new Date(fechaActual.getFullYear(), 0, 1);

    // Ingresos del mes
    const serviciosMes = await Servicio.find({
      updatedAt: { $gte: primerDiaMes },
      eliminado: false
    });
    const ingresosMes = serviciosMes.reduce((sum, s) => sum + (s.ingresoTotal || 0), 0);

    // Ingresos del año
    const serviciosAnio = await Servicio.find({
      updatedAt: { $gte: primerDiaAnio },
      eliminado: false
    });
    const ingresosAnio = serviciosAnio.reduce((sum, s) => sum + (s.ingresoTotal || 0), 0);

    // Top 5 servicios
    const topServicios = await Servicio.find({ eliminado: false })
      .sort({ vecesVendido: -1, ingresoTotal: -1 })
      .limit(5)
      .select('titulo vecesVendido ingresoTotal categoria icono colorIcono slug');

    // Servicios por categoría
    const porCategoria = await Servicio.aggregate([
      { $match: { eliminado: false } },
      {
        $group: {
          _id: '$categoria',
          count: { $sum: 1 },
          ingresos: { $sum: '$ingresoTotal' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Total general
    const totalServicios = await Servicio.countDocuments({ eliminado: false });
    const totalIngresos = await Servicio.aggregate([
      { $match: { eliminado: false } },
      { $group: { _id: null, total: { $sum: '$ingresoTotal' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        resumen: {
          serviciosActivos,
          serviciosEnProgreso,
          serviciosCompletados,
          totalServicios
        },
        ingresos: {
          mes: ingresosMes,
          anio: ingresosAnio,
          total: totalIngresos[0]?.total || 0
        },
        topServicios,
        porCategoria
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener dashboard',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener estadísticas generales
 * @route   GET /api/servicios/stats
 * @access  Private
 */
export const getEstadisticas = async (req, res) => {
  try {
    const stats = await Servicio.getEstadisticas();

    // Calcular promedios
    const servicios = await Servicio.find({ eliminado: false });
    const totalServicios = servicios.length;
    
    const promedios = {
      precioPromedio: 0,
      ventasPromedio: 0,
      ingresoPromedio: 0,
      ratingPromedio: 0
    };

    if (totalServicios > 0) {
      promedios.precioPromedio = servicios.reduce((sum, s) => 
        sum + (s.precio || s.precioMin || 0), 0) / totalServicios;
      
      promedios.ventasPromedio = servicios.reduce((sum, s) => 
        sum + (s.vecesVendido || 0), 0) / totalServicios;
      
      promedios.ingresoPromedio = servicios.reduce((sum, s) => 
        sum + (s.ingresoTotal || 0), 0) / totalServicios;
      
      const serviciosConRating = servicios.filter(s => s.rating > 0);
      if (serviciosConRating.length > 0) {
        promedios.ratingPromedio = serviciosConRating.reduce((sum, s) => 
          sum + s.rating, 0) / serviciosConRating.length;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        porEstado: stats,
        promedios,
        total: totalServicios
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener estadísticas de ventas
 * @route   GET /api/servicios/stats/ventas
 * @access  Private
 */
export const getEstadisticasVentas = async (req, res) => {
  try {
    const { periodo = '6meses' } = req.query;

    let fechaInicio;
    const fechaFin = new Date();

    switch (periodo) {
      case '7dias':
        fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 7);
        break;
      case '30dias':
        fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 30);
        break;
      case '3meses':
        fechaInicio = new Date();
        fechaInicio.setMonth(fechaInicio.getMonth() - 3);
        break;
      case '6meses':
        fechaInicio = new Date();
        fechaInicio.setMonth(fechaInicio.getMonth() - 6);
        break;
      case 'anio':
        fechaInicio = new Date();
        fechaInicio.setFullYear(fechaInicio.getFullYear() - 1);
        break;
      default:
        fechaInicio = new Date();
        fechaInicio.setMonth(fechaInicio.getMonth() - 6);
    }

    // Tendencia de ventas por mes
    const tendencia = await Servicio.aggregate([
      {
        $match: {
          eliminado: false,
          updatedAt: { $gte: fechaInicio, $lte: fechaFin }
        }
      },
      {
        $group: {
          _id: {
            año: { $year: '$updatedAt' },
            mes: { $month: '$updatedAt' }
          },
          ventas: { $sum: '$vecesVendido' },
          ingresos: { $sum: '$ingresoTotal' },
          servicios: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          _id: 0,
          periodo: {
            $concat: [
              { $toString: '$_id.mes' },
              '/',
              { $toString: '$_id.año' }
            ]
          },
          ventas: 1,
          ingresos: 1,
          cantidadServicios: { $size: '$servicios' }
        }
      },
      { $sort: { '_id.año': 1, '_id.mes': 1 } }
    ]);

    // Servicios más vendidos en el periodo
    const masVendidos = await Servicio.find({
      eliminado: false,
      updatedAt: { $gte: fechaInicio }
    })
    .sort({ vecesVendido: -1 })
    .limit(10)
    .select('titulo vecesVendido ingresoTotal categoria');

    // Categorías más populares
    const categoriasMasVendidas = await Servicio.aggregate([
      {
        $match: {
          eliminado: false,
          vecesVendido: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$categoria',
          totalVentas: { $sum: '$vecesVendido' },
          totalIngresos: { $sum: '$ingresoTotal' },
          cantidadServicios: { $sum: 1 }
        }
      },
      { $sort: { totalVentas: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        periodo,
        fechaInicio,
        fechaFin,
        tendencia,
        masVendidos,
        categoriasMasVendidas
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de ventas',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener métricas de conversión
 * @route   GET /api/servicios/stats/conversion
 * @access  Private
 */
export const getMetricasConversion = async (req, res) => {
  try {
    const servicios = await Servicio.find({ 
      eliminado: false,
      visibleEnWeb: true 
    });

    const metricas = servicios.map(servicio => {
      // Simulación de métricas (en producción vendrían de analytics)
      const vistas = Math.floor(Math.random() * 1000) + servicio.vecesVendido * 10;
      const conversion = vistas > 0 ? (servicio.vecesVendido / vistas * 100).toFixed(2) : 0;

      return {
        servicioId: servicio._id,
        titulo: servicio.titulo,
        slug: servicio.slug,
        vistas,
        ventas: servicio.vecesVendido,
        tasaConversion: parseFloat(conversion),
        ingresos: servicio.ingresoTotal,
        valorPromedio: servicio.vecesVendido > 0 
          ? (servicio.ingresoTotal / servicio.vecesVendido).toFixed(2)
          : 0
      };
    });

    // Ordenar por tasa de conversión
    metricas.sort((a, b) => b.tasaConversion - a.tasaConversion);

    const resumen = {
      serviciosTotal: servicios.length,
      serviciosConVentas: servicios.filter(s => s.vecesVendido > 0).length,
      tasaConversionPromedio: metricas.length > 0
        ? (metricas.reduce((sum, m) => sum + m.tasaConversion, 0) / metricas.length).toFixed(2)
        : 0,
      ventasTotal: servicios.reduce((sum, s) => sum + s.vecesVendido, 0),
      ingresosTotal: servicios.reduce((sum, s) => sum + s.ingresoTotal, 0)
    };

    res.status(200).json({
      success: true,
      data: {
        resumen,
        metricas
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener métricas de conversión',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener comparativa de paquetes
 * @route   GET /api/servicios/:id/stats/paquetes
 * @access  Private
 */
export const getEstadisticasPaquetes = async (req, res) => {
  try {
    const { id } = req.params;

    const servicio = await Servicio.findById(id);
    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    const paquetes = await PaqueteServicio.find({ servicioId: id });

    if (paquetes.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Este servicio no tiene paquetes',
        data: []
      });
    }

    const estadisticas = paquetes.map(paquete => ({
      paqueteId: paquete._id,
      nombre: paquete.nombre,
      precio: paquete.precio,
      precioConDescuento: paquete.precioConDescuento,
      vecesVendido: paquete.vecesVendido,
      ingresoTotal: paquete.ingresoTotal,
      porcentajeVentas: servicio.vecesVendido > 0
        ? ((paquete.vecesVendido / servicio.vecesVendido) * 100).toFixed(2)
        : 0,
      destacado: paquete.destacado,
      disponible: paquete.disponible
    }));

    // Ordenar por ventas
    estadisticas.sort((a, b) => b.vecesVendido - a.vecesVendido);

    res.status(200).json({
      success: true,
      data: {
        servicio: {
          id: servicio._id,
          titulo: servicio.titulo,
          ventasTotal: servicio.vecesVendido,
          ingresosTotal: servicio.ingresoTotal
        },
        paquetes: estadisticas
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de paquetes',
      error: error.message
    });
  }
};

export default {
  getDashboard,
  getEstadisticas,
  getEstadisticasVentas,
  getMetricasConversion,
  getEstadisticasPaquetes
};
