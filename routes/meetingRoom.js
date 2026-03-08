/**
 * Rutas para Sala de Reuniones Virtual (SERSI)
 * Genera tokens JWT para embeber la oficina virtual 2D de SERSI
 *
 * API de SERSI: https://scmeet-back.onrender.com/api/v1/
 * - POST /api/v1/tokens  → Genera Platform JWT (requiere X-API-Key + X-API-Secret)
 * - GET  /api/v1/spaces   → Lista espacios disponibles
 *
 * Las claves API se leen primero de la DB (IntegrationConfig), con fallback a env vars.
 */

import express from 'express';
import { requireAuth, requireAnyRole } from '../middleware/clerkAuth.js';
import { ROLES } from '../config/roles.js';
import IntegrationConfig from '../models/IntegrationConfig.js';
import logger from '../utils/logger.js';

const router = express.Router();

const SERSI_API_BASE = 'https://scmeet-back.onrender.com/api/v1';

/**
 * Obtiene las credenciales SERSI: primero de DB, luego de env vars
 */
async function getSersiCredentials() {
  // 1. Intentar desde la base de datos
  try {
    const dbConfig = await IntegrationConfig.getConfig('sersi');
    if (dbConfig?.enabled && dbConfig.config?.apiKey && dbConfig.config?.apiSecret) {
      return {
        apiKey: dbConfig.config.apiKey,
        apiSecret: dbConfig.config.apiSecret,
        source: 'database'
      };
    }
  } catch (err) {
    logger.error('Error leyendo config SERSI de DB:', err.message);
  }

  // 2. Fallback a variables de entorno
  if (process.env.SERSI_API_KEY && process.env.SERSI_API_SECRET) {
    return {
      apiKey: process.env.SERSI_API_KEY,
      apiSecret: process.env.SERSI_API_SECRET,
      source: 'env'
    };
  }

  return null;
}

/**
 * Helper: headers de autenticación para SERSI API
 */
function getSersiHeaders(credentials) {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': credentials.apiKey,
    'X-API-Secret': credentials.apiSecret
  };
}

// ─── Middleware: solo ADMIN y SUPER_ADMIN ───
const requireAdminRole = [requireAuth, requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN])];

// ═══════════════════════════════════════════════
// RUTAS DE CONFIGURACIÓN (Solo Admin)
// ═══════════════════════════════════════════════

/**
 * GET /api/meeting/config
 * Obtiene la configuración actual de SERSI (claves enmascaradas)
 */
router.get('/config', ...requireAdminRole, async (req, res) => {
  try {
    const dbConfig = await IntegrationConfig.getConfig('sersi');

    // Origen actual de las credenciales
    const credentials = await getSersiCredentials();

    const maskKey = (key) => {
      if (!key) return null;
      if (key.length <= 12) return '****';
      return key.substring(0, 8) + '...' + key.substring(key.length - 4);
    };

    return res.json({
      success: true,
      data: {
        configured: !!credentials,
        source: credentials?.source || null,
        enabled: dbConfig?.enabled ?? true,
        apiKey: maskKey(credentials?.apiKey),
        apiSecret: maskKey(credentials?.apiSecret),
        updatedAt: dbConfig?.updatedAt || null,
        hasEnvVars: !!(process.env.SERSI_API_KEY && process.env.SERSI_API_SECRET)
      }
    });
  } catch (error) {
    logger.error('Error obteniendo config SERSI:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener configuración'
    });
  }
});

/**
 * PUT /api/meeting/config
 * Guarda o actualiza las claves API de SERSI en la base de datos
 */
router.put('/config', ...requireAdminRole, async (req, res) => {
  try {
    const { apiKey, apiSecret } = req.body;

    if (!apiKey || !apiSecret) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren apiKey y apiSecret'
      });
    }

    // Validar que las claves funcionen con la API de SERSI
    const testResponse = await fetch(`${SERSI_API_BASE}/spaces`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret
      }
    });

    if (!testResponse.ok) {
      const errorData = await testResponse.json().catch(() => ({}));
      return res.status(400).json({
        success: false,
        message: errorData?.error?.message || 'Las claves API no son válidas. Verifica que sean correctas.'
      });
    }

    // Guardar en la base de datos
    const config = await IntegrationConfig.setConfig(
      'sersi',
      { apiKey, apiSecret },
      req.user.clerkId
    );

    logger.info(`Configuración SERSI actualizada por ${req.user.email}`);

    return res.json({
      success: true,
      message: 'Configuración de sala de reuniones guardada correctamente',
      data: {
        configured: true,
        source: 'database',
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    logger.error('Error guardando config SERSI:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al guardar configuración'
    });
  }
});

/**
 * DELETE /api/meeting/config
 * Elimina las claves API de la base de datos (vuelve a usar env vars)
 */
router.delete('/config', ...requireAdminRole, async (req, res) => {
  try {
    await IntegrationConfig.deleteOne({ integrationName: 'sersi' });

    logger.info(`Configuración SERSI eliminada por ${req.user.email}`);

    return res.json({
      success: true,
      message: 'Configuración eliminada. Se usarán las variables de entorno si están disponibles.'
    });
  } catch (error) {
    logger.error('Error eliminando config SERSI:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar configuración'
    });
  }
});

// ═══════════════════════════════════════════════
// RUTAS OPERATIVAS (Usuarios autenticados)
// ═══════════════════════════════════════════════

/**
 * POST /api/meeting/token
 * Genera un Platform JWT de SERSI para el usuario autenticado
 */
router.post('/token', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, email, clerkId } = req.user;

    const credentials = await getSersiCredentials();
    if (!credentials) {
      return res.status(500).json({
        success: false,
        message: 'Sala de reuniones no configurada. Un administrador debe configurar las claves API.'
      });
    }

    const displayName = `${firstName || ''} ${lastName || ''}`.trim() || email;

    const response = await fetch(`${SERSI_API_BASE}/tokens`, {
      method: 'POST',
      headers: getSersiHeaders(credentials),
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
    const credentials = await getSersiCredentials();
    if (!credentials) {
      return res.status(500).json({
        success: false,
        message: 'Sala de reuniones no configurada. Un administrador debe configurar las claves API.'
      });
    }

    const response = await fetch(`${SERSI_API_BASE}/spaces`, {
      method: 'GET',
      headers: getSersiHeaders(credentials)
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
