import express from 'express';
import {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  cambiarEstado,
  agregarActividad,
  asignarLead,
  getEstadisticas,
  getLeadsPendientes,
  getLeadTimeline,
  vincularUsuario,
  desvincularUsuario,
  getMisLeads
} from '../controllers/leadController.js';
import {
  getLeadMessages,
  enviarMensajeInterno,
  enviarMensajeCliente,
  responderMensaje,
  marcarMensajeLeido,
  eliminarMensaje,
  getMensajesNoLeidos,
  buscarMensajes
} from '../controllers/leadMessageController.js';
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  usarPlantilla,
  toggleFavorito,
  clonarPlantilla,
  getPlantillasPopulares,
  inicializarPlantillasDefault
} from '../controllers/messageTemplateController.js';
// import {
//   uploadAttachment,
//   getMessageAttachments,
//   deleteAttachment,
//   getLeadAttachments,
//   getAttachmentInfo
// } from '../controllers/attachmentController.js';
import { requireAuth } from '../middleware/clerkAuth.js';

const router = express.Router();

/**
 * 🔒 Aplicar autenticación a todas las rutas CRM
 * Todas las rutas requieren que el usuario esté autenticado con Clerk
 */
router.use(requireAuth);

// ========================================
// 📊 RUTAS DE ESTADÍSTICAS Y REPORTES
// ========================================
router.get('/estadisticas', getEstadisticas);         // GET /api/crm/estadisticas
router.get('/leads/pendientes', getLeadsPendientes);  // GET /api/crm/leads/pendientes

// ========================================
// 💼 RUTAS PRINCIPALES DE LEADS
// ========================================
router.route('/leads')
  .get(getLeads)      // GET    /api/crm/leads - Obtener todos los leads (con filtros)
  .post(createLead);  // POST   /api/crm/leads - Crear nuevo lead

router.route('/leads/:id')
  .get(getLead)       // GET    /api/crm/leads/:id - Obtener lead específico
  .put(updateLead)    // PUT    /api/crm/leads/:id - Actualizar lead
  .delete(deleteLead);// DELETE /api/crm/leads/:id - Eliminar lead (soft delete)

// ========================================
// 🔧 RUTAS DE ACCIONES ESPECÍFICAS
// ========================================
router.patch('/leads/:id/estado', cambiarEstado);        // PATCH /api/crm/leads/:id/estado
router.post('/leads/:id/actividades', agregarActividad); // POST  /api/crm/leads/:id/actividades
router.patch('/leads/:id/asignar', asignarLead);         // PATCH /api/crm/leads/:id/asignar

// ========================================
// 💬 RUTAS DE MENSAJERÍA CRM
// ========================================

// Timeline y mensajes del lead
router.get('/leads/:id/timeline', getLeadTimeline);              // GET /api/crm/leads/:id/timeline
router.get('/leads/:id/messages', getLeadMessages);              // GET /api/crm/leads/:id/messages

// Enviar mensajes
router.post('/leads/:id/messages/internal', enviarMensajeInterno); // POST /api/crm/leads/:id/messages/internal
router.post('/leads/:id/messages/client', enviarMensajeCliente);   // POST /api/crm/leads/:id/messages/client

// Vincular/desvincular usuario registrado
router.post('/leads/:id/vincular-usuario', vincularUsuario);       // POST   /api/crm/leads/:id/vincular-usuario
router.delete('/leads/:id/vincular-usuario', desvincularUsuario);  // DELETE /api/crm/leads/:id/vincular-usuario

// Gestión de mensajes individuales
router.post('/messages/:messageId/reply', responderMensaje);       // POST  /api/crm/messages/:messageId/reply
router.patch('/messages/:messageId/read', marcarMensajeLeido);     // PATCH /api/crm/messages/:messageId/read
router.delete('/messages/:messageId', eliminarMensaje);            // DELETE /api/crm/messages/:messageId

// Mensajes generales
router.get('/messages/unread', getMensajesNoLeidos);               // GET /api/crm/messages/unread
router.get('/messages/search', buscarMensajes);                    // GET /api/crm/messages/search

// ========================================
// 📎 RUTAS DE ADJUNTOS (Temporalmente deshabilitadas)
// ========================================

// TODO: Habilitar cuando se corrijan los módulos de attachments
// router.post('/leads/:leadId/attachments', uploadAttachment);       
// router.get('/leads/:leadId/attachments', getLeadAttachments);      
// router.get('/messages/:messageId/attachments', getMessageAttachments); 
// router.get('/attachments/:cloudinaryId', getAttachmentInfo);       
// router.delete('/messages/:messageId/attachments/:cloudinaryId', deleteAttachment);

// ========================================
// �📄 RUTAS DE PLANTILLAS DE MENSAJES
// ========================================

// CRUD de plantillas
router.route('/templates')
  .get(getTemplates)       // GET  /api/crm/templates
  .post(createTemplate);   // POST /api/crm/templates

router.route('/templates/:id')
  .get(getTemplate)        // GET    /api/crm/templates/:id
  .put(updateTemplate)     // PUT    /api/crm/templates/:id
  .delete(deleteTemplate); // DELETE /api/crm/templates/:id

// Acciones de plantillas
router.post('/templates/:id/use', usarPlantilla);                  // POST /api/crm/templates/:id/use
router.post('/templates/:id/favorite', toggleFavorito);            // POST /api/crm/templates/:id/favorite
router.post('/templates/:id/clone', clonarPlantilla);              // POST /api/crm/templates/:id/clone

// Plantillas especiales
router.get('/templates/popular/list', getPlantillasPopulares);     // GET  /api/crm/templates/popular/list
router.post('/templates/init-defaults', inicializarPlantillasDefault); // POST /api/crm/templates/init-defaults

// ========================================
// 👤 RUTAS PARA CLIENTES (PORTAL CLIENTE)
// ========================================
router.get('/cliente/mis-leads', requireAuth, getMisLeads);        // GET /api/crm/cliente/mis-leads

export default router;
