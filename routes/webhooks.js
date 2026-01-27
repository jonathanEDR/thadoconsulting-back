import express from 'express';
import { clerkWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Middleware para capturar el raw body (necesario para verificar la firma)
router.use(express.raw({ type: 'application/json' }));

// Ruta del webhook de Clerk
router.post('/clerk', async (req, res) => {
  // Guardar el raw body
  req.rawBody = req.body.toString('utf8');
  
  // Parsear el body a JSON
  try {
    req.body = JSON.parse(req.rawBody);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  await clerkWebhook(req, res);
});

export default router;
