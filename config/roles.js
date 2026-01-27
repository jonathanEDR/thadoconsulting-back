/**
 * Configuración del Sistema de Roles
 * La base de datos MongoDB es la fuente de verdad para roles y permisos
 */

// Definición de roles disponibles
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN', 
  MODERATOR: 'MODERATOR',
  CLIENT: 'CLIENT',
  USER: 'USER'
};

// Jerarquía de roles (mayor número = mayor privilegio)
export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 5,
  [ROLES.ADMIN]: 4,
  [ROLES.MODERATOR]: 3,
  [ROLES.CLIENT]: 2,
  [ROLES.USER]: 1
};

// Definición de permisos disponibles
export const PERMISSIONS = {
  // Gestión de usuarios
  MANAGE_USERS: 'MANAGE_USERS',
  VIEW_USERS: 'VIEW_USERS',
  
  // Gestión de contenido CMS
  MANAGE_CONTENT: 'MANAGE_CONTENT',
  MODERATE_CONTENT: 'MODERATE_CONTENT',
  VIEW_CONTENT: 'VIEW_CONTENT',
  
  // Gestión de servicios
  MANAGE_SERVICES: 'MANAGE_SERVICES',         // Gestión completa de servicios
  CREATE_SERVICES: 'CREATE_SERVICES',         // Crear servicios
  EDIT_ALL_SERVICES: 'EDIT_ALL_SERVICES',     // Editar cualquier servicio
  EDIT_OWN_SERVICES: 'EDIT_OWN_SERVICES',     // Editar solo servicios propios
  DELETE_SERVICES: 'DELETE_SERVICES',         // Eliminar servicios
  VIEW_SERVICES: 'VIEW_SERVICES',             // Ver servicios públicos
  VIEW_SERVICES_STATS: 'VIEW_SERVICES_STATS', // Ver estadísticas y dashboard
  MANAGE_PAQUETES: 'MANAGE_PAQUETES',         // Gestionar paquetes de servicios
  DUPLICATE_SERVICES: 'DUPLICATE_SERVICES',   // Duplicar servicios
  
  // Gestión de uploads
  MANAGE_UPLOADS: 'MANAGE_UPLOADS',
  UPLOAD_FILES: 'UPLOAD_FILES',
  
  // Analytics y reportes
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  EXPORT_DATA: 'EXPORT_DATA',
  
  // Configuración del sistema
  MANAGE_SYSTEM: 'MANAGE_SYSTEM',
  VIEW_LOGS: 'VIEW_LOGS',
  
  // Gestión de roles
  ASSIGN_ROLES: 'ASSIGN_ROLES',
  VIEW_ROLES: 'VIEW_ROLES',
  
  // ========================================
  // 💼 PERMISOS CRM (Customer Relationship Management)
  // ========================================
  
  // Leads - Lectura
  VIEW_ALL_LEADS: 'VIEW_ALL_LEADS',           // Ver todos los leads del sistema
  VIEW_OWN_LEADS: 'VIEW_OWN_LEADS',           // Ver solo leads asignados a ti
  VIEW_TEAM_LEADS: 'VIEW_TEAM_LEADS',         // Ver leads del equipo
  
  // Leads - Escritura
  CREATE_LEADS: 'CREATE_LEADS',               // Crear nuevos leads
  EDIT_ALL_LEADS: 'EDIT_ALL_LEADS',           // Editar cualquier lead
  EDIT_OWN_LEADS: 'EDIT_OWN_LEADS',           // Editar solo tus leads
  DELETE_LEADS: 'DELETE_LEADS',               // Eliminar leads
  
  // Leads - Gestión
  ASSIGN_LEADS: 'ASSIGN_LEADS',               // Asignar leads a usuarios
  CHANGE_LEAD_STATUS: 'CHANGE_LEAD_STATUS',   // Cambiar estado de leads
  ADD_LEAD_ACTIVITIES: 'ADD_LEAD_ACTIVITIES', // Agregar notas y actividades
  
  // CRM - Reportes y Analytics
  VIEW_CRM_REPORTS: 'VIEW_CRM_REPORTS',       // Ver reportes del CRM
  EXPORT_CRM_DATA: 'EXPORT_CRM_DATA',         // Exportar datos del CRM
  
  // ========================================
  // 📧 PERMISOS DE CONTACTO (Contact Management)
  // ========================================
  
  // Contactos - Lectura
  VIEW_CONTACTS: 'VIEW_CONTACTS',             // Ver contactos recibidos
  
  // Contactos - Gestión
  MANAGE_CONTACTS: 'MANAGE_CONTACTS',         // Gestionar contactos (cambiar estado, asignar, notas)
  
  // Contactos - Eliminación
  DELETE_CONTACTS: 'DELETE_CONTACTS',         // Eliminar contactos
  
  // ========================================
  // 💬 PERMISOS DE MENSAJERÍA CRM
  // ========================================
  
  // Mensajes - Lectura
  VIEW_LEAD_MESSAGES: 'VIEW_LEAD_MESSAGES',           // Ver mensajes de leads
  VIEW_ALL_LEAD_MESSAGES: 'VIEW_ALL_LEAD_MESSAGES',   // Ver todos los mensajes (incluso de leads no asignados)
  VIEW_PRIVATE_NOTES: 'VIEW_PRIVATE_NOTES',           // Ver notas internas/privadas del equipo
  
  // Mensajes - Escritura
  SEND_LEAD_MESSAGES: 'SEND_LEAD_MESSAGES',           // Enviar mensajes internos
  SEND_CLIENT_MESSAGES: 'SEND_CLIENT_MESSAGES',       // Enviar mensajes visibles al cliente
  REPLY_LEAD_MESSAGES: 'REPLY_LEAD_MESSAGES',         // Responder mensajes
  
  // Mensajes - Gestión
  DELETE_LEAD_MESSAGES: 'DELETE_LEAD_MESSAGES',       // Eliminar mensajes
  MANAGE_MESSAGE_TEMPLATES: 'MANAGE_MESSAGE_TEMPLATES', // Gestionar plantillas de mensajes
  USE_MESSAGE_TEMPLATES: 'USE_MESSAGE_TEMPLATES',     // Usar plantillas de mensajes
  
  // Mensajes - Avanzado
  SEND_BROADCAST_MESSAGES: 'SEND_BROADCAST_MESSAGES', // Enviar mensajes masivos
  EXPORT_MESSAGES: 'EXPORT_MESSAGES',                  // Exportar historial de mensajes
  
  // ========================================
  // 📝 PERMISOS DE BLOG
  // ========================================
  
  // Blog Posts - Lectura
  VIEW_PUBLISHED_POSTS: 'VIEW_PUBLISHED_POSTS',       // Ver posts publicados (público)
  VIEW_DRAFT_POSTS: 'VIEW_DRAFT_POSTS',               // Ver posts en borrador
  VIEW_ALL_POSTS: 'VIEW_ALL_POSTS',                   // Ver todos los posts (cualquier estado)
  VIEW_OWN_POSTS: 'VIEW_OWN_POSTS',                   // Ver solo posts propios
  
  // Blog Posts - Escritura
  CREATE_BLOG_POSTS: 'CREATE_BLOG_POSTS',             // Crear nuevos posts
  EDIT_OWN_BLOG_POSTS: 'EDIT_OWN_BLOG_POSTS',         // Editar solo posts propios
  EDIT_ALL_BLOG_POSTS: 'EDIT_ALL_BLOG_POSTS',         // Editar cualquier post
  DELETE_OWN_BLOG_POSTS: 'DELETE_OWN_BLOG_POSTS',     // Eliminar posts propios
  DELETE_BLOG_POSTS: 'DELETE_BLOG_POSTS',             // Eliminar cualquier post
  
  // Blog Posts - Gestión
  PUBLISH_BLOG_POSTS: 'PUBLISH_BLOG_POSTS',           // Publicar/despublicar posts
  FEATURE_BLOG_POSTS: 'FEATURE_BLOG_POSTS',           // Marcar posts como destacados
  SCHEDULE_BLOG_POSTS: 'SCHEDULE_BLOG_POSTS',         // Programar publicación
  DUPLICATE_BLOG_POSTS: 'DUPLICATE_BLOG_POSTS',       // Duplicar posts
  
  // Blog Categorías - Gestión
  MANAGE_BLOG_CATEGORIES: 'MANAGE_BLOG_CATEGORIES',   // Gestionar categorías (CRUD completo)
  VIEW_BLOG_CATEGORIES: 'VIEW_BLOG_CATEGORIES',       // Ver categorías
  
  // Blog Tags - Gestión
  MANAGE_BLOG_TAGS: 'MANAGE_BLOG_TAGS',               // Gestionar tags (CRUD completo)
  VIEW_BLOG_TAGS: 'VIEW_BLOG_TAGS',                   // Ver tags
  
  // Blog Comentarios - Gestión (Fase 2)
  MODERATE_COMMENTS: 'MODERATE_COMMENTS',             // Moderar comentarios
  DELETE_COMMENTS: 'DELETE_COMMENTS',                 // Eliminar comentarios
  REPLY_COMMENTS: 'REPLY_COMMENTS',                   // Responder comentarios
  
  // Blog Analytics - Reportes
  VIEW_BLOG_ANALYTICS: 'VIEW_BLOG_ANALYTICS',         // Ver analytics del blog
  EXPORT_BLOG_DATA: 'EXPORT_BLOG_DATA',               // Exportar datos del blog
  
  // Blog SEO - Gestión avanzada
  MANAGE_BLOG_SEO: 'MANAGE_BLOG_SEO',                 // Gestionar configuración SEO avanzada
  
  // ========================================
  // 📅 PERMISOS DE EVENTOS/AGENDA
  // ========================================
  
  // Eventos - Lectura
  VIEW_ALL_EVENTS: 'VIEW_ALL_EVENTS',                 // Ver todos los eventos del sistema
  VIEW_OWN_EVENTS: 'VIEW_OWN_EVENTS',                 // Ver solo eventos propios (organizador o participante)
  VIEW_TEAM_EVENTS: 'VIEW_TEAM_EVENTS',               // Ver eventos del equipo
  
  // Eventos - Escritura
  CREATE_EVENTS: 'CREATE_EVENTS',                     // Crear nuevos eventos
  EDIT_ALL_EVENTS: 'EDIT_ALL_EVENTS',                 // Editar cualquier evento
  EDIT_OWN_EVENTS: 'EDIT_OWN_EVENTS',                 // Editar solo eventos propios
  DELETE_EVENTS: 'DELETE_EVENTS',                     // Eliminar eventos
  
  // Eventos - Gestión
  MANAGE_EVENT_ATTENDEES: 'MANAGE_EVENT_ATTENDEES',   // Gestionar participantes de eventos
  RESPOND_TO_EVENTS: 'RESPOND_TO_EVENTS',             // Responder a invitaciones de eventos
  MANAGE_EVENT_REMINDERS: 'MANAGE_EVENT_REMINDERS',   // Gestionar recordatorios
  
  // Eventos - Analytics
  VIEW_EVENT_ANALYTICS: 'VIEW_EVENT_ANALYTICS',       // Ver estadísticas de eventos
  EXPORT_EVENT_DATA: 'EXPORT_EVENT_DATA'              // Exportar datos de eventos
};

// Matriz de permisos por rol
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    // Todos los permisos
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_CONTENT,
    PERMISSIONS.MODERATE_CONTENT,
    PERMISSIONS.VIEW_CONTENT,
    PERMISSIONS.MANAGE_SERVICES,
    PERMISSIONS.CREATE_SERVICES,
    PERMISSIONS.EDIT_ALL_SERVICES,
    PERMISSIONS.EDIT_OWN_SERVICES,
    PERMISSIONS.DELETE_SERVICES,
    PERMISSIONS.VIEW_SERVICES,
    PERMISSIONS.VIEW_SERVICES_STATS,
    PERMISSIONS.MANAGE_PAQUETES,
    PERMISSIONS.DUPLICATE_SERVICES,
    PERMISSIONS.MANAGE_UPLOADS,
    PERMISSIONS.UPLOAD_FILES,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.MANAGE_SYSTEM,
    PERMISSIONS.VIEW_LOGS,
    PERMISSIONS.ASSIGN_ROLES,
    PERMISSIONS.VIEW_ROLES,
    // CRM - Acceso total
    PERMISSIONS.VIEW_ALL_LEADS,
    PERMISSIONS.VIEW_OWN_LEADS,
    PERMISSIONS.VIEW_TEAM_LEADS,
    PERMISSIONS.CREATE_LEADS,
    PERMISSIONS.EDIT_ALL_LEADS,
    PERMISSIONS.EDIT_OWN_LEADS,
    PERMISSIONS.DELETE_LEADS,
    PERMISSIONS.ASSIGN_LEADS,
    PERMISSIONS.CHANGE_LEAD_STATUS,
    PERMISSIONS.ADD_LEAD_ACTIVITIES,
    PERMISSIONS.VIEW_CRM_REPORTS,
    PERMISSIONS.EXPORT_CRM_DATA,
    // Contactos - Acceso total
    PERMISSIONS.VIEW_CONTACTS,
    PERMISSIONS.MANAGE_CONTACTS,
    PERMISSIONS.DELETE_CONTACTS,
    // Mensajería CRM - Acceso total
    PERMISSIONS.VIEW_LEAD_MESSAGES,
    PERMISSIONS.VIEW_ALL_LEAD_MESSAGES,
    PERMISSIONS.VIEW_PRIVATE_NOTES,
    PERMISSIONS.SEND_LEAD_MESSAGES,
    PERMISSIONS.SEND_CLIENT_MESSAGES,
    PERMISSIONS.REPLY_LEAD_MESSAGES,
    PERMISSIONS.DELETE_LEAD_MESSAGES,
    PERMISSIONS.MANAGE_MESSAGE_TEMPLATES,
    PERMISSIONS.USE_MESSAGE_TEMPLATES,
    PERMISSIONS.SEND_BROADCAST_MESSAGES,
    PERMISSIONS.EXPORT_MESSAGES,
    // Blog - Acceso total
    PERMISSIONS.VIEW_PUBLISHED_POSTS,
    PERMISSIONS.VIEW_DRAFT_POSTS,
    PERMISSIONS.VIEW_ALL_POSTS,
    PERMISSIONS.VIEW_OWN_POSTS,
    PERMISSIONS.CREATE_BLOG_POSTS,
    PERMISSIONS.EDIT_OWN_BLOG_POSTS,
    PERMISSIONS.EDIT_ALL_BLOG_POSTS,
    PERMISSIONS.DELETE_OWN_BLOG_POSTS,
    PERMISSIONS.DELETE_BLOG_POSTS,
    PERMISSIONS.PUBLISH_BLOG_POSTS,
    PERMISSIONS.FEATURE_BLOG_POSTS,
    PERMISSIONS.SCHEDULE_BLOG_POSTS,
    PERMISSIONS.DUPLICATE_BLOG_POSTS,
    PERMISSIONS.MANAGE_BLOG_CATEGORIES,
    PERMISSIONS.VIEW_BLOG_CATEGORIES,
    PERMISSIONS.MANAGE_BLOG_TAGS,
    PERMISSIONS.VIEW_BLOG_TAGS,
    PERMISSIONS.MODERATE_COMMENTS,
    PERMISSIONS.DELETE_COMMENTS,
    PERMISSIONS.REPLY_COMMENTS,
    PERMISSIONS.VIEW_BLOG_ANALYTICS,
    PERMISSIONS.EXPORT_BLOG_DATA,
    PERMISSIONS.MANAGE_BLOG_SEO,
    // Eventos/Agenda - Acceso total
    PERMISSIONS.VIEW_ALL_EVENTS,
    PERMISSIONS.VIEW_OWN_EVENTS,
    PERMISSIONS.VIEW_TEAM_EVENTS,
    PERMISSIONS.CREATE_EVENTS,
    PERMISSIONS.EDIT_ALL_EVENTS,
    PERMISSIONS.EDIT_OWN_EVENTS,
    PERMISSIONS.DELETE_EVENTS,
    PERMISSIONS.MANAGE_EVENT_ATTENDEES,
    PERMISSIONS.RESPOND_TO_EVENTS,
    PERMISSIONS.MANAGE_EVENT_REMINDERS,
    PERMISSIONS.VIEW_EVENT_ANALYTICS,
    PERMISSIONS.EXPORT_EVENT_DATA
  ],
  
  [ROLES.ADMIN]: [
    // Gestión completa excepto sistema y otros admins
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_CONTENT,
    PERMISSIONS.MODERATE_CONTENT,
    PERMISSIONS.VIEW_CONTENT,
    PERMISSIONS.MANAGE_SERVICES,
    PERMISSIONS.CREATE_SERVICES,
    PERMISSIONS.EDIT_ALL_SERVICES,
    PERMISSIONS.EDIT_OWN_SERVICES,
    PERMISSIONS.DELETE_SERVICES,
    PERMISSIONS.VIEW_SERVICES,
    PERMISSIONS.VIEW_SERVICES_STATS,
    PERMISSIONS.MANAGE_PAQUETES,
    PERMISSIONS.DUPLICATE_SERVICES,
    PERMISSIONS.MANAGE_UPLOADS,
    PERMISSIONS.UPLOAD_FILES,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VIEW_LOGS,
    PERMISSIONS.ASSIGN_ROLES, // Solo a roles inferiores
    PERMISSIONS.VIEW_ROLES,
    // CRM - Gestión completa excepto delete
    PERMISSIONS.VIEW_ALL_LEADS,
    PERMISSIONS.VIEW_OWN_LEADS,
    PERMISSIONS.VIEW_TEAM_LEADS,
    PERMISSIONS.CREATE_LEADS,
    PERMISSIONS.EDIT_ALL_LEADS,
    PERMISSIONS.EDIT_OWN_LEADS,
    PERMISSIONS.ASSIGN_LEADS,
    PERMISSIONS.CHANGE_LEAD_STATUS,
    PERMISSIONS.ADD_LEAD_ACTIVITIES,
    PERMISSIONS.VIEW_CRM_REPORTS,
    PERMISSIONS.EXPORT_CRM_DATA,
    // Contactos - Gestión completa
    PERMISSIONS.VIEW_CONTACTS,
    PERMISSIONS.MANAGE_CONTACTS,
    // Mensajería CRM - Gestión completa
    PERMISSIONS.VIEW_LEAD_MESSAGES,
    PERMISSIONS.VIEW_ALL_LEAD_MESSAGES,
    PERMISSIONS.VIEW_PRIVATE_NOTES,
    PERMISSIONS.SEND_LEAD_MESSAGES,
    PERMISSIONS.SEND_CLIENT_MESSAGES,
    PERMISSIONS.REPLY_LEAD_MESSAGES,
    PERMISSIONS.DELETE_LEAD_MESSAGES,
    PERMISSIONS.MANAGE_MESSAGE_TEMPLATES,
    PERMISSIONS.USE_MESSAGE_TEMPLATES,
    PERMISSIONS.SEND_BROADCAST_MESSAGES,
    PERMISSIONS.EXPORT_MESSAGES,
    // Blog - Gestión completa igual que SUPER_ADMIN
    PERMISSIONS.VIEW_PUBLISHED_POSTS,
    PERMISSIONS.VIEW_DRAFT_POSTS,
    PERMISSIONS.VIEW_ALL_POSTS,
    PERMISSIONS.VIEW_OWN_POSTS,
    PERMISSIONS.CREATE_BLOG_POSTS,
    PERMISSIONS.EDIT_OWN_BLOG_POSTS,
    PERMISSIONS.EDIT_ALL_BLOG_POSTS,
    PERMISSIONS.DELETE_OWN_BLOG_POSTS,
    PERMISSIONS.DELETE_BLOG_POSTS,
    PERMISSIONS.PUBLISH_BLOG_POSTS,
    PERMISSIONS.FEATURE_BLOG_POSTS,
    PERMISSIONS.SCHEDULE_BLOG_POSTS,
    PERMISSIONS.DUPLICATE_BLOG_POSTS,
    PERMISSIONS.MANAGE_BLOG_CATEGORIES,
    PERMISSIONS.VIEW_BLOG_CATEGORIES,
    PERMISSIONS.MANAGE_BLOG_TAGS,
    PERMISSIONS.VIEW_BLOG_TAGS,
    PERMISSIONS.MODERATE_COMMENTS,
    PERMISSIONS.DELETE_COMMENTS,
    PERMISSIONS.REPLY_COMMENTS,
    PERMISSIONS.VIEW_BLOG_ANALYTICS,
    PERMISSIONS.EXPORT_BLOG_DATA,
    PERMISSIONS.MANAGE_BLOG_SEO,
    // Eventos/Agenda - Gestión completa
    PERMISSIONS.VIEW_ALL_EVENTS,
    PERMISSIONS.VIEW_OWN_EVENTS,
    PERMISSIONS.VIEW_TEAM_EVENTS,
    PERMISSIONS.CREATE_EVENTS,
    PERMISSIONS.EDIT_ALL_EVENTS,
    PERMISSIONS.EDIT_OWN_EVENTS,
    PERMISSIONS.DELETE_EVENTS,
    PERMISSIONS.MANAGE_EVENT_ATTENDEES,
    PERMISSIONS.RESPOND_TO_EVENTS,
    PERMISSIONS.MANAGE_EVENT_REMINDERS,
    PERMISSIONS.VIEW_EVENT_ANALYTICS,
    PERMISSIONS.EXPORT_EVENT_DATA
  ],
  
  [ROLES.MODERATOR]: [
    // Moderación y gestión limitada
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MODERATE_CONTENT,
    PERMISSIONS.VIEW_CONTENT,
    PERMISSIONS.MANAGE_CONTENT, // Contenido limitado
    PERMISSIONS.CREATE_SERVICES,
    PERMISSIONS.EDIT_OWN_SERVICES,
    PERMISSIONS.VIEW_SERVICES,
    PERMISSIONS.VIEW_SERVICES_STATS,
    PERMISSIONS.UPLOAD_FILES,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_ROLES,
    // CRM - Solo sus leads y los de su equipo
    PERMISSIONS.VIEW_TEAM_LEADS,
    PERMISSIONS.VIEW_OWN_LEADS,
    PERMISSIONS.CREATE_LEADS,
    PERMISSIONS.EDIT_OWN_LEADS,
    PERMISSIONS.CHANGE_LEAD_STATUS,
    PERMISSIONS.ADD_LEAD_ACTIVITIES,
    // Contactos - Solo lectura
    PERMISSIONS.VIEW_CONTACTS,
    // Mensajería CRM - Solo sus leads asignados
    PERMISSIONS.VIEW_LEAD_MESSAGES,
    PERMISSIONS.VIEW_PRIVATE_NOTES,
    PERMISSIONS.SEND_LEAD_MESSAGES,
    PERMISSIONS.SEND_CLIENT_MESSAGES,
    PERMISSIONS.REPLY_LEAD_MESSAGES,
    PERMISSIONS.USE_MESSAGE_TEMPLATES,
    // Blog - Puede crear y editar sus propios posts
    PERMISSIONS.VIEW_PUBLISHED_POSTS,
    PERMISSIONS.VIEW_DRAFT_POSTS,
    PERMISSIONS.VIEW_OWN_POSTS,
    PERMISSIONS.CREATE_BLOG_POSTS,
    PERMISSIONS.EDIT_OWN_BLOG_POSTS,
    PERMISSIONS.DELETE_OWN_BLOG_POSTS,
    PERMISSIONS.VIEW_BLOG_CATEGORIES,
    PERMISSIONS.VIEW_BLOG_TAGS,
    PERMISSIONS.MODERATE_COMMENTS,
    PERMISSIONS.REPLY_COMMENTS,
    // Eventos/Agenda - Solo propios
    PERMISSIONS.VIEW_OWN_EVENTS,
    PERMISSIONS.VIEW_TEAM_EVENTS,
    PERMISSIONS.CREATE_EVENTS,
    PERMISSIONS.EDIT_OWN_EVENTS,
    PERMISSIONS.RESPOND_TO_EVENTS,
    PERMISSIONS.MANAGE_EVENT_REMINDERS
  ],
  
  [ROLES.CLIENT]: [
    // Acceso limitado para clientes
    PERMISSIONS.VIEW_CONTENT,
    PERMISSIONS.VIEW_SERVICES,
    PERMISSIONS.UPLOAD_FILES,
    PERMISSIONS.VIEW_ROLES, // Solo su propio rol
    // Mensajería CRM - Solo sus propios leads
    PERMISSIONS.VIEW_LEAD_MESSAGES,      // Solo mensajes no privados de sus leads
    PERMISSIONS.REPLY_LEAD_MESSAGES,     // Solo puede responder mensajes
    // Blog - Solo lectura
    PERMISSIONS.VIEW_PUBLISHED_POSTS,
    PERMISSIONS.VIEW_BLOG_CATEGORIES,
    PERMISSIONS.VIEW_BLOG_TAGS
    // Eventos/Agenda - NO TIENE ACCESO (Solo área administrativa)
  ],
  
  [ROLES.USER]: [
    // Acceso básico
    PERMISSIONS.VIEW_CONTENT,
    PERMISSIONS.VIEW_SERVICES,
    
    // 💬 Permisos de mensajería (Cliente Potencial)
    PERMISSIONS.VIEW_LEAD_MESSAGES,      // Ver mensajes de sus leads
    PERMISSIONS.REPLY_LEAD_MESSAGES,     // Responder mensajes
    PERMISSIONS.SEND_CLIENT_MESSAGES,    // Enviar mensajes como cliente
    
    // 📝 Blog - Solo lectura
    PERMISSIONS.VIEW_PUBLISHED_POSTS,    // Ver posts publicados
    PERMISSIONS.VIEW_BLOG_CATEGORIES,    // Ver categorías
    PERMISSIONS.VIEW_BLOG_TAGS           // Ver tags
    
    // 📅 Eventos/Agenda - NO TIENE ACCESO (Solo área administrativa)
  ]
};

// Descripción de roles para la interfaz
export const ROLE_DESCRIPTIONS = {
  [ROLES.SUPER_ADMIN]: {
    name: 'Super Administrador',
    description: 'Control total del sistema, gestión de administradores y configuración',
    color: '#dc2626', // rojo
    icon: '👑'
  },
  [ROLES.ADMIN]: {
    name: 'Administrador',
    description: 'Gestión de usuarios, contenido y servicios. No puede gestionar super admins',
    color: '#ea580c', // naranja
    icon: '⚡'
  },
  [ROLES.MODERATOR]: {
    name: 'Moderador',
    description: 'Moderación de contenido y gestión limitada',
    color: '#0891b2', // cyan
    icon: '🛡️'
  },
  [ROLES.CLIENT]: {
    name: 'Cliente',
    description: 'Acceso a servicios contratados y funcionalidades cliente',
    color: '#16a34a', // verde
    icon: '💼'
  },
  [ROLES.USER]: {
    name: 'Usuario',
    description: 'Cliente potencial con acceso a contenido y mensajería básica',
    color: '#6b7280', // gris
    icon: '👤'
  }
};

// Validar si un rol puede asignar otro rol
export const canAssignRole = (assignerRole, targetRole) => {
  const assignerLevel = ROLE_HIERARCHY[assignerRole];
  const targetLevel = ROLE_HIERARCHY[targetRole];
  
  // Solo se puede asignar roles de nivel inferior
  return assignerLevel > targetLevel;
};

// Obtener permisos de un rol
export const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

// Verificar si un rol tiene un permiso específico
export const roleHasPermission = (role, permission) => {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
};

// Obtener roles que puede gestionar un usuario
export const getManageableRoles = (userRole) => {
  const userLevel = ROLE_HIERARCHY[userRole];
  return Object.keys(ROLES).filter(role => 
    ROLE_HIERARCHY[role] < userLevel
  );
};

// Configuración por defecto para el primer super admin
export const DEFAULT_SUPER_ADMIN = {
  email: process.env.DEFAULT_SUPER_ADMIN_EMAIL || 'admin@thadoconsulting.pe',
  role: ROLES.SUPER_ADMIN
};

export default {
  ROLES,
  ROLE_HIERARCHY,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_DESCRIPTIONS,
  canAssignRole,
  getRolePermissions,
  roleHasPermission,
  getManageableRoles,
  DEFAULT_SUPER_ADMIN
};