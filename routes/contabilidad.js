import express from 'express';
import { requireAuth } from '../middleware/clerkAuth.js';

// Controllers de Clientes Contables
import {
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  darDeBajaCliente,
  eliminarClientePermanente,
  reactivarCliente,
  vincularUsuario,
  desvincularUsuario,
  getUsuariosDisponibles,
  getSemaforoVencimientos,
  getEstadisticas,
  getClientesMapa,
  getMiCuentaContable,
  agregarNota,
  eliminarNota,
  agregarDocumento,
  eliminarDocumento
} from '../controllers/clientesContablesController.js';

// Controllers de Declaraciones
import {
  registrarDeclaracion,
  calcularImpuestosPreview,
  calcularPlanillaPreview,
  calcularAFPPreview,
  getAFPProviders,
  getHistorialDeclaraciones,
  getResumenAnual,
  actualizarDeclaracion,
  cambiarEstadoDeclaracion,
  getMisDeclaraciones,
  getMiEstado,
  eliminarDeclaracion,
} from '../controllers/declaracionesController.js';

// Controllers de Declaración Jurada Anual de Renta (Formulario 710)
import {
  getSugerenciaRentaAnual,
  calcularPreviewAnual,
  registrarDeclaracionAnual,
  listarDeclaracionesAnuales,
  actualizarDeclaracionAnual,
  eliminarDeclaracionAnual
} from '../controllers/declaracionAnualController.js';

// Controllers de Proyecciones
import {
  calcularProyeccion,
  guardarProyeccion,
  getProyeccionesCliente,
  compararProyeccion,
  getCronograma,
  generarCronograma
} from '../controllers/proyeccionesController.js';

// Controllers de Libros Electrónicos
import {
  getCatalogoLibros,
  getLibrosCliente,
  getLibrosPeriodo,
  registrarPresentacionLibro,
  actualizarPresentacionLibro,
  configurarLibrosCliente
} from '../controllers/librosElectronicosController.js';

const router = express.Router();

/**
 * 🏢 RUTAS DEL MÓDULO DE CONTABILIDAD
 * Gestión de clientes contables, declaraciones y proyecciones
 * 
 * Todas las rutas requieren autenticación con Clerk
 */
router.use(requireAuth);

// ========================================
// 📊 DASHBOARD Y ESTADÍSTICAS
// ========================================
router.get('/estadisticas', getEstadisticas);                    // GET /api/contabilidad/estadisticas
router.get('/alertas/semaforo', getSemaforoVencimientos);         // GET /api/contabilidad/alertas/semaforo

// ========================================
// 🏢 CRUD DE CLIENTES CONTABLES
// ========================================

// ⚠️ Rutas específicas ANTES de rutas con :id para evitar que Express las confunda
router.get('/clientes/mapa', getClientesMapa);                                 // GET    /api/contabilidad/clientes/mapa
router.get('/clientes/usuarios-disponibles', getUsuariosDisponibles);           // GET    /api/contabilidad/clientes/usuarios-disponibles

router.route('/clientes')
  .get(listarClientes)      // GET    /api/contabilidad/clientes
  .post(crearCliente);      // POST   /api/contabilidad/clientes

router.route('/clientes/:id')
  .get(obtenerCliente)      // GET    /api/contabilidad/clientes/:id
  .put(actualizarCliente)   // PUT    /api/contabilidad/clientes/:id
  .delete(darDeBajaCliente);// DELETE /api/contabilidad/clientes/:id

// Acciones específicas de clientes
router.delete('/clientes/:id/permanente', eliminarClientePermanente);          // DELETE /api/contabilidad/clientes/:id/permanente (hard delete, solo SUPER_ADMIN)
router.patch('/clientes/:id/reactivar', reactivarCliente);                     // PATCH  /api/contabilidad/clientes/:id/reactivar
router.post('/clientes/:id/vincular-usuario', vincularUsuario);                // POST   /api/contabilidad/clientes/:id/vincular-usuario
router.delete('/clientes/:id/vincular-usuario', desvincularUsuario);           // DELETE /api/contabilidad/clientes/:id/vincular-usuario
router.post('/clientes/:id/notas', agregarNota);                               // POST   /api/contabilidad/clientes/:id/notas
router.delete('/clientes/:id/notas/:notaId', eliminarNota);                    // DELETE /api/contabilidad/clientes/:id/notas/:notaId
router.post('/clientes/:id/documentos', agregarDocumento);                     // POST   /api/contabilidad/clientes/:id/documentos
router.delete('/clientes/:id/documentos/:docId', eliminarDocumento);            // DELETE /api/contabilidad/clientes/:id/documentos/:docId

// ========================================
// 📄 DECLARACIONES MENSUALES
// ========================================
router.post('/declaraciones', registrarDeclaracion);                            // POST   /api/contabilidad/declaraciones
router.post('/declaraciones/calcular', calcularImpuestosPreview);               // POST   /api/contabilidad/declaraciones/calcular
router.post('/declaraciones/calcular-planilla', calcularPlanillaPreview);       // POST   /api/contabilidad/declaraciones/calcular-planilla
router.post('/declaraciones/calcular-afp', calcularAFPPreview);                // POST   /api/contabilidad/declaraciones/calcular-afp
router.get('/declaraciones/afp-providers', getAFPProviders);                    // GET    /api/contabilidad/declaraciones/afp-providers
router.get('/declaraciones/cliente/:clienteId', getHistorialDeclaraciones);      // GET    /api/contabilidad/declaraciones/cliente/:clienteId
router.get('/declaraciones/resumen-anual/:clienteId', getResumenAnual);         // GET    /api/contabilidad/declaraciones/resumen-anual/:clienteId
router.put('/declaraciones/:id', actualizarDeclaracion);                        // PUT    /api/contabilidad/declaraciones/:id
router.patch('/declaraciones/:id/estado', cambiarEstadoDeclaracion);            // PATCH  /api/contabilidad/declaraciones/:id/estado
router.delete('/declaraciones/:id', eliminarDeclaracion);                       // DELETE /api/contabilidad/declaraciones/:id

// ========================================
// 📅 DECLARACIÓN JURADA ANUAL DE RENTA (Formulario 710)
// ========================================
router.get('/declaraciones-anuales/sugerencia', getSugerenciaRentaAnual);       // GET    /api/contabilidad/declaraciones-anuales/sugerencia?clienteId=&anio=
router.post('/declaraciones-anuales/calcular', calcularPreviewAnual);           // POST   /api/contabilidad/declaraciones-anuales/calcular
router.post('/declaraciones-anuales', registrarDeclaracionAnual);               // POST   /api/contabilidad/declaraciones-anuales
router.get('/declaraciones-anuales/cliente/:clienteId', listarDeclaracionesAnuales); // GET  /api/contabilidad/declaraciones-anuales/cliente/:clienteId
router.put('/declaraciones-anuales/:id', actualizarDeclaracionAnual);           // PUT    /api/contabilidad/declaraciones-anuales/:id
router.delete('/declaraciones-anuales/:id', eliminarDeclaracionAnual);          // DELETE /api/contabilidad/declaraciones-anuales/:id

// ========================================
// 📊 PROYECCIONES DE PAGO
// ========================================
router.post('/proyecciones/calcular', calcularProyeccion);                      // POST   /api/contabilidad/proyecciones/calcular
router.post('/proyecciones', guardarProyeccion);                                // POST   /api/contabilidad/proyecciones
router.get('/proyecciones/cliente/:clienteId', getProyeccionesCliente);          // GET    /api/contabilidad/proyecciones/cliente/:clienteId
router.post('/proyecciones/:id/comparar', compararProyeccion);                  // POST   /api/contabilidad/proyecciones/:id/comparar

// ========================================
// 📅 CRONOGRAMA SUNAT
// ========================================
router.get('/cronograma/:periodo', getCronograma);                              // GET    /api/contabilidad/cronograma/:periodo
router.post('/cronograma/generar', generarCronograma);                          // POST   /api/contabilidad/cronograma/generar

// ========================================
// � LIBROS ELECTRÓNICOS
// ========================================
router.get('/libros/catalogo', getCatalogoLibros);                                          // GET    /api/contabilidad/libros/catalogo
router.get('/libros/cliente/:clienteId', getLibrosCliente);                                 // GET    /api/contabilidad/libros/cliente/:clienteId
router.get('/libros/cliente/:clienteId/periodo/:periodo', getLibrosPeriodo);                 // GET    /api/contabilidad/libros/cliente/:clienteId/periodo/:periodo
router.post('/libros', registrarPresentacionLibro);                                         // POST   /api/contabilidad/libros
router.put('/libros/:id', actualizarPresentacionLibro);                                     // PUT    /api/contabilidad/libros/:id
router.put('/libros/cliente/:clienteId/configurar', configurarLibrosCliente);                // PUT    /api/contabilidad/libros/cliente/:clienteId/configurar

// ========================================
// �👤 PORTAL CLIENTE (Rutas para rol CLIENT/USER)
// ========================================
router.get('/mi-cuenta', getMiCuentaContable);                                  // GET    /api/contabilidad/mi-cuenta
router.get('/mis-declaraciones', getMisDeclaraciones);                          // GET    /api/contabilidad/mis-declaraciones
router.get('/mi-estado', getMiEstado);                                          // GET    /api/contabilidad/mi-estado

export default router;
