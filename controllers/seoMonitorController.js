/**
 * Controller para SEO Monitoring
 * Expone endpoints para monitorear calidad y SEO del blog
 */

import seoMonitor from '../utils/seoMonitor.js';
import logger from '../utils/logger.js';

export const getSEOMetrics = async (req, res) => {
  try {
    const { category, startDate, endDate, limit } = req.query;

    const options = {};
    if (category) options.category = category;
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (limit) options.limit = parseInt(limit);

    const metrics = await seoMonitor.getAggregatedMetrics(options);

    if (!metrics.success) {
      return res.status(404).json(metrics);
    }

    res.json({
      success: true,
      data: metrics.data,
      message: 'Métricas SEO obtenidas exitosamente'
    });

  } catch (error) {
    logger.error('❌ Error getting SEO metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener métricas SEO',
      error: error.message
    });
  }
};

export const getSEOReport = async (req, res) => {
  try {
    const { category, startDate, endDate, limit, format } = req.query;

    const options = {};
    if (category) options.category = category;
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (limit) options.limit = parseInt(limit);

    const result = await seoMonitor.generateReport(options);

    if (!result.success) {
      return res.status(404).json(result);
    }

    // Si se solicita formato texto, devolver el reporte formateado
    if (format === 'text') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(result.report);
    }

    // Por defecto, devolver JSON
    res.json({
      success: true,
      report: result.report,
      data: result.data,
      message: 'Reporte SEO generado exitosamente'
    });

  } catch (error) {
    logger.error('❌ Error generating SEO report:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte SEO',
      error: error.message
    });
  }
};

export const analyzePost = async (req, res) => {
  try {
    const { content, title } = req.body;

    if (!content || !title) {
      return res.status(400).json({
        success: false,
        message: 'Content y title son requeridos'
      });
    }

    const metrics = seoMonitor.analyzePost(content, title);

    res.json({
      success: true,
      data: metrics,
      message: 'Post analizado exitosamente'
    });

  } catch (error) {
    logger.error('❌ Error analyzing post:', error);
    res.status(500).json({
      success: false,
      message: 'Error al analizar post',
      error: error.message
    });
  }
};
