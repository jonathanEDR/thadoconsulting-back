/**
 * Middleware de Autorización para Blog
 * Funciones específicas para gestión del blog
 */

import { PERMISSIONS } from '../config/roles.js';
import { requireAuth, requirePermission, requireAnyPermission } from './clerkAuth.js';

/**
 * MIDDLEWARES DE LECTURA
 */

// Ver posts publicados (público - sin autenticación)
export const canViewPublishedPosts = [
  // No requiere autenticación - es público
];

// Ver todos los posts (incluyendo borradores)
export const canViewAllPosts = [
  requireAuth,
  requirePermission(PERMISSIONS.VIEW_ALL_POSTS)
];

// Ver posts en borrador
export const canViewDraftPosts = [
  requireAuth,
  requireAnyPermission([
    PERMISSIONS.VIEW_DRAFT_POSTS,
    PERMISSIONS.VIEW_ALL_POSTS
  ])
];

// Ver posts propios
export const canViewOwnPosts = [
  requireAuth,
  requirePermission(PERMISSIONS.VIEW_OWN_POSTS)
];

/**
 * MIDDLEWARES DE ESCRITURA
 */

// Crear posts
export const canCreateBlogPosts = [
  requireAuth,
  requirePermission(PERMISSIONS.CREATE_BLOG_POSTS)
];

// Editar posts propios
export const canEditOwnBlogPosts = [
  requireAuth,
  requireAnyPermission([
    PERMISSIONS.EDIT_OWN_BLOG_POSTS,
    PERMISSIONS.EDIT_ALL_BLOG_POSTS
  ])
];

// Editar cualquier post
export const canEditAllBlogPosts = [
  requireAuth,
  requirePermission(PERMISSIONS.EDIT_ALL_BLOG_POSTS)
];

// Eliminar posts propios
export const canDeleteOwnBlogPosts = [
  requireAuth,
  requireAnyPermission([
    PERMISSIONS.DELETE_OWN_BLOG_POSTS,
    PERMISSIONS.DELETE_BLOG_POSTS
  ])
];

// Eliminar cualquier post
export const canDeleteBlogPosts = [
  requireAuth,
  requirePermission(PERMISSIONS.DELETE_BLOG_POSTS)
];

/**
 * MIDDLEWARES DE GESTIÓN
 */

// Publicar/despublicar posts
export const canPublishBlogPosts = [
  requireAuth,
  requirePermission(PERMISSIONS.PUBLISH_BLOG_POSTS)
];

// Marcar posts como destacados
export const canFeatureBlogPosts = [
  requireAuth,
  requirePermission(PERMISSIONS.FEATURE_BLOG_POSTS)
];

// Programar publicación
export const canScheduleBlogPosts = [
  requireAuth,
  requirePermission(PERMISSIONS.SCHEDULE_BLOG_POSTS)
];

// Duplicar posts
export const canDuplicateBlogPosts = [
  requireAuth,
  requirePermission(PERMISSIONS.DUPLICATE_BLOG_POSTS)
];

/**
 * MIDDLEWARES DE CATEGORÍAS
 */

// Gestionar categorías (CRUD completo)
export const canManageBlogCategories = [
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_BLOG_CATEGORIES)
];

// Ver categorías (público - sin autenticación)
export const canViewBlogCategories = [
  // No requiere autenticación - es público
];

/**
 * MIDDLEWARES DE TAGS
 */

// Gestionar tags (CRUD completo)
export const canManageBlogTags = [
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_BLOG_TAGS)
];

// Ver tags (público - sin autenticación)
export const canViewBlogTags = [
  // No requiere autenticación - es público
];

/**
 * MIDDLEWARES DE COMENTARIOS (Fase 2)
 */

// Moderar comentarios
export const canModerateComments = [
  requireAuth,
  requirePermission(PERMISSIONS.MODERATE_COMMENTS)
];

// Eliminar comentarios
export const canDeleteComments = [
  requireAuth,
  requirePermission(PERMISSIONS.DELETE_COMMENTS)
];

// Responder comentarios
export const canReplyComments = [
  requireAuth,
  requirePermission(PERMISSIONS.REPLY_COMMENTS)
];

/**
 * MIDDLEWARES DE ANALYTICS
 */

// Ver analytics del blog
export const canViewBlogAnalytics = [
  requireAuth,
  requirePermission(PERMISSIONS.VIEW_BLOG_ANALYTICS)
];

// Exportar datos del blog
export const canExportBlogData = [
  requireAuth,
  requirePermission(PERMISSIONS.EXPORT_BLOG_DATA)
];

/**
 * MIDDLEWARES DE SEO
 */

// Gestionar configuración SEO avanzada
export const canManageBlogSEO = [
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_BLOG_SEO)
];

/**
 * MIDDLEWARE PERSONALIZADO: Verificar propiedad del post
 */
export const checkPostOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.userId;
    
    // Si no hay usuario autenticado
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }
    
    // Importar modelo dinámicamente para evitar dependencias circulares
    const { default: BlogPost } = await import('../models/BlogPost.js');
    const { default: User } = await import('../models/User.js');
    const { ROLE_PERMISSIONS } = await import('../config/roles.js');
    
    // Buscar el post
    const post = await BlogPost.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }
    
    // Buscar el usuario para obtener su rol
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Obtener permisos del rol desde la configuración centralizada
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    
    // Verificar si el usuario tiene permiso para editar o eliminar todos los posts
    const hasEditAllPermission = userPermissions.includes(PERMISSIONS.EDIT_ALL_BLOG_POSTS);
    const hasDeleteAllPermission = userPermissions.includes(PERMISSIONS.DELETE_BLOG_POSTS);
    
    // Si tiene permisos globales, permitir
    if (hasEditAllPermission || hasDeleteAllPermission) {
      req.post = post;
      req.isOwner = true;
      return next();
    }
    
    // Verificar si es el autor del post
    const isOwner = post.author.toString() === user._id.toString();
    
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción en este post'
      });
    }
    
    // Es el propietario
    req.post = post;
    req.isOwner = true;
    next();
    
  } catch (error) {
    console.error('Error en checkPostOwnership:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar permisos',
      error: error.message
    });
  }
};

/**
 * EXPORTACIONES AGRUPADAS
 */
export default {
  // Lectura
  canViewPublishedPosts,
  canViewAllPosts,
  canViewDraftPosts,
  canViewOwnPosts,
  
  // Escritura
  canCreateBlogPosts,
  canEditOwnBlogPosts,
  canEditAllBlogPosts,
  canDeleteOwnBlogPosts,
  canDeleteBlogPosts,
  
  // Gestión
  canPublishBlogPosts,
  canFeatureBlogPosts,
  canScheduleBlogPosts,
  canDuplicateBlogPosts,
  
  // Categorías
  canManageBlogCategories,
  canViewBlogCategories,
  
  // Tags
  canManageBlogTags,
  canViewBlogTags,
  
  // Comentarios
  canModerateComments,
  canDeleteComments,
  canReplyComments,
  
  // Analytics
  canViewBlogAnalytics,
  canExportBlogData,
  
  // SEO
  canManageBlogSEO,
  
  // Custom
  checkPostOwnership
};
