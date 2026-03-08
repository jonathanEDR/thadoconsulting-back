/**
 * Rutas para Sala de Reuniones Virtual (SERSI)
 * Genera tokens JWT para embeber la oficina virtual 2D de SERSI
 *
 * API de SERSI: https://scmeet-back.onrender.com/api/v1/
 * - POST /api/v1/tokens  → Genera Platform JWT (requiere X-API-Key + X-API-Secret)
 * - GET  /api/v1/spaces   → Lista espacios disponibles
 */

import express from 'express';
import { requireAuth } from '../middleware/clerkAuth.js';
import logger from '../utils/logger.js';

const router = express.Router();

const SERSI_API_BASE = 'https://scmeet-back.onrender.com/api/v1';

/**
 * Helper: headers de autenticación para SERSI API
 */
function getSersiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.SERSI_API_KEY,
    'X-API-Secret': process.env.SERSI_API_SECRET
  };
}

/**
 * POST /api/meeting/token
 * Genera un Platform JWT de SERSI para el usuario autenticado
 */
router.post('/token', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, email, clerkId } = req.user;

    if (!process.env.SERSI_API_KEY || !process.env.SERSI_API_SECRET) {
      logger.error('SERSI_API_KEY o SERSI_API_SECRET no configuradas');
      return res.status(500).json({
        success: false,
        message: 'Configuración de sala de reuniones no disponible'
      });
    }

    const displayName = `${firstName || ''} ${lastName || ''}`.trim() || email;

    // Llamar a la API de SERSI para obtener el Platform JWT
    const response = await fetch(`${SERSI_API_BASE}/tokens`, {
      method: 'POST',
      headers: getSersiHeaders(),
      body: JSON.stringify({
        userId: clerkId,
        displayName
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('Error de SERSI API:', { status: response.status, error: errorData });
      return res.status(502).json({
        success: false,
        message: errorData?.error?.message || 'Error al obtener token de sala de reuniones'
      });
    }

    const data = await response.json();

    return res.json({
      success: true,
      data: {
        token: data.data?.token || data.token,
        expiresAt: data.data?.expiresAt || data.expiresAt,
        user: { name: displayName, email }
      }
    });

  } catch (error) {
    logger.error('Error generando token de SERSI:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al generar token de sala de reuniones'
    });
  }
});

/**
 * GET /api/meeting/spaces
 * Lista los espacios virtuales disponibles del tenant
 */
router.get('/spaces', requireAuth, async (req, res) => {
  try {
    if (!process.env.SERSI_API_KEY || !process.env.SERSI_API_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Configuración de sala de reuniones no disponible'
      });
    }

    const response = await fetch(`${SERSI_API_BASE}/spaces`, {
      method: 'GET',
      headers: getSersiHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('Error obteniendo espacios SERSI:', { status: response.status, error: errorData });
      return res.status(502).json({
        success: false,
        message: 'Error al obtener espacios disponibles'
      });
    }

    const data = await response.json();

    return res.json({
      success: true,
      data: data.data || []
    });

  } catch (error) {
    logger.error('Error obteniendo espacios SERSI:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener espacios'
    });
  }
});

export default router;
