import express from 'express';
import { requireAuth } from '../middleware/clerkAuth.js';
import { checkOnboardingStatus, executeWelcomeOnboarding } from '../controllers/clientOnboardingController.js';

const router = express.Router();

/**
 * 🎉 RUTAS DE ONBOARDING PARA CLIENTE
 * Permite a usuarios CLIENT verificar y ejecutar onboarding automático
 */

// 🔍 Verificar si necesita onboarding
router.get('/onboarding-check', requireAuth, checkOnboardingStatus);

// 🎉 Ejecutar onboarding de bienvenida
router.post('/welcome-onboarding', requireAuth, executeWelcomeOnboarding);

export default router;