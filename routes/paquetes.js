import express from 'express';
import {
  getPaquetes,
  getPaquete,
  createPaquete,
  updatePaquete,
  deletePaquete,
  getPaqueteMasPopular,
  duplicarPaquete,
  registrarVenta
} from '../controllers/paqueteController.js';

// Importar middlewares
import { requireAuth } from '../middleware/clerkAuth.js';
import { canManagePaquetes, canDuplicateServices } from '../middleware/roleAuth.js';

const router = express.Router();

// Rutas generales de paquetes
router.route('/')
  .get(getPaquetes);        // GET /api/paquetes - Público (con filtros)

router.route('/:id')
  .get(getPaquete)                        // GET /api/paquetes/:id - Público
  .put(canManagePaquetes, updatePaquete)  // PUT /api/paquetes/:id - Requiere permiso
  .delete(canManagePaquetes, deletePaquete); // DELETE /api/paquetes/:id - Requiere permiso

// Acciones especiales
router.post('/:id/duplicar', canDuplicateServices, duplicarPaquete);
router.post('/:id/venta', canManagePaquetes, registrarVenta);

export default router;
