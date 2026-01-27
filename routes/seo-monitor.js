/**
 * Rutas para SEO Monitoring
 * @route /api/seo-monitor
 */

import express from 'express';
import { getSEOMetrics, getSEOReport, analyzePost } from '../controllers/seoMonitorController.js';
import { requireAuth, requireAnyRole } from '../middleware/clerkAuth.js';

const router = express.Router();

/**
 * @route   GET /api/seo-monitor/metrics
 * @desc    Obtener métricas agregadas de SEO
 * @access  Private (Admin, Gerente)
 * @query   category, startDate, endDate, limit
 */
router.get('/metrics', requireAuth, requireAnyRole(['admin', 'gerente']), getSEOMetrics);

/**
 * @route   GET /api/seo-monitor/report
 * @desc    Generar reporte completo de SEO
 * @access  Private (Admin, Gerente)
 * @query   category, startDate, endDate, limit, format (text|json)
 */
router.get('/report', requireAuth, requireAnyRole(['admin', 'gerente']), getSEOReport);

/**
 * @route   POST /api/seo-monitor/analyze
 * @desc    Analizar un post específico
 * @access  Private (Admin, Gerente, Editor)
 * @body    content, title
 */
router.post('/analyze', requireAuth, requireAnyRole(['admin', 'gerente', 'editor']), analyzePost);

export default router;
