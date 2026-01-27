import express from 'express';
import {
  obtenerCategorias,
  obtenerCategoriaPorId,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  obtenerEstadisticasCategorias
} from '../controllers/categoriaController.js';

const router = express.Router();

// Rutas públicas
router.get('/', obtenerCategorias);
router.get('/estadisticas', obtenerEstadisticasCategorias);
router.get('/:id', obtenerCategoriaPorId);

// Rutas que requieren autenticación (puedes agregar middleware de autenticación aquí)
router.post('/', crearCategoria);
router.put('/:id', actualizarCategoria);
router.delete('/:id', eliminarCategoria);

export default router;