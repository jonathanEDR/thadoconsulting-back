/**
 * 🛤️ Profile Routes
 * Rutas para gestión de perfiles públicos
 */

import express from 'express';
import { requireAuth } from '../middleware/clerkAuth.js';
import {
  getMyProfile,
  updateMyProfile,
  getPublicProfile,
  getProfileStats,
  listPublicProfiles
} from '../controllers/profileController.js';

const router = express.Router();

// ============================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================

/**
 * @route   GET /api/profile/public
 * @desc    Listar perfiles públicos con filtros
 * @access  Public
 * @deprecated - Ruta deshabilitada, solo se usa perfil individual
 */
// router.get('/public', listPublicProfiles);

/**
 * @route   GET /api/profile/public/:username
 * @desc    Obtener perfil público por username
 * @access  Public
 */
router.get('/public/:username', getPublicProfile);

/**
 * @route   GET /api/profile/:username/stats
 * @desc    Obtener estadísticas de perfil
 * @access  Public
 */
router.get('/:username/stats', getProfileStats);

// ============================================
// RUTAS PRIVADAS (requieren autenticación)
// ============================================

/**
 * @route   GET /api/profile
 * @desc    Obtener mi perfil completo
 * @access  Private
 */
router.get('/', requireAuth, getMyProfile);

/**
 * @route   PUT /api/profile
 * @desc    Actualizar mi perfil
 * @access  Private
 */
router.put('/', requireAuth, updateMyProfile);

export default router;