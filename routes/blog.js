import express from 'express';

// ============================================
// MIDDLEWARES
// ============================================

// Middlewares de autenticación y autorización
import { requireAuth } from '../middleware/clerkAuth.js';
import {
  canViewAllPosts,
  canCreateBlogPosts,
  canEditOwnBlogPosts,
  canDeleteOwnBlogPosts,
  canPublishBlogPosts,
  canDuplicateBlogPosts,
  canManageBlogCategories,
  canManageBlogTags,
  checkPostOwnership
} from '../middleware/blogAuth.js';

// ✅ Middlewares de cache HTTP
import {
  cachePublicPosts,
  cachePostDetail,
  cacheFeaturedPosts,
  cacheTaxonomy,
  cacheSEOFiles,
  noCache
} from '../middleware/httpCache.js';

// 🔒 Middlewares de seguridad
import {
  generalLimiter,
  writeLimiter,
  aiChatLimiter,
  validateBlogPost,
  validators,
  handleValidationErrors
} from '../middleware/securityMiddleware.js';

// ============================================
// CONTROLADORES
// ============================================

// Controladores
import {
  getAllPublishedPosts,
  getAllAdminPosts,
  getPostBySlug,
  getPostById,
  getFeaturedPosts,
  getHeaderMenuPosts,
  getPopularPosts,
  searchPosts,
  createPost,
  updatePost,
  deletePost,
  publishPost,
  unpublishPost,
  duplicatePost,
  toggleLike,
  toggleBookmark,
  getPostsByUser,
  getCacheStats,
  invalidateCache
} from '../controllers/blogPostController.js';

import {
  getAllCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryPosts,
  reorderCategories
} from '../controllers/blogCategoryController.js';

import {
  getAllTags,
  getPopularTags,
  getTagBySlug,
  createTag,
  updateTag,
  deleteTag,
  getTagPosts,
  bulkCreateTags
} from '../controllers/blogTagController.js';

import {
  getSitemap,
  getImageSitemap,
  getNewsSitemap,
  getSitemapStatistics,
  getRSSFeed,
  getAtomFeed,
  getJSONFeed,
  getCategoryFeed,
  getFeedStatistics,
  getRobotsTxt,
  getPostSchemas,
  getPostMetaTags,
  getCategoryMetaTags,
  getTagMetaTags,
  getBlogHomeMetaTags,
  validatePostSEOScore,
  getOrganizationSchema,
  getWebSiteSchema,
  getBlogSchema
} from '../controllers/seoController.js';

import {
  getAIMetadata,
  getConversationalFormat,
  getQAFormat,
  getSemanticAnalysis,
  getMarkdownFormat,
  getExtendedJSONLD,
  getLLMMetadata,
  getKeywords,
  getEntities,
  getTopics,
  getReadabilityAnalysis,
  getSentimentAnalysis,
  getStructureAnalysis,
  getImprovementSuggestions,
  getSuggestedTags,
  getSuggestedKeywords,
  getContentScore,
  optimizePost
} from '../controllers/aiSeoController.js';

const router = express.Router();

// ========================================
// RUTAS DE POSTS
// ========================================

// Rutas admin de posts (deben ir ANTES de las rutas públicas) - SIN CACHE
router.get('/admin/posts', generalLimiter, noCache, ...canViewAllPosts, getAllAdminPosts);
router.get('/admin/posts/:id', generalLimiter, noCache, ...canViewAllPosts, validators.mongoId, handleValidationErrors, getPostById);
router.get('/admin/cache-stats', generalLimiter, noCache, ...canViewAllPosts, getCacheStats);
router.post('/admin/invalidate-cache', writeLimiter, noCache, ...canManageBlogCategories, invalidateCache);

// ✅ Rutas públicas de posts - CON CACHE HTTP + Rate Limiting
router.get('/posts', generalLimiter, cachePublicPosts, getAllPublishedPosts);
router.get('/posts/featured', generalLimiter, cacheFeaturedPosts, getFeaturedPosts);
router.get('/posts/header-menu', generalLimiter, cacheFeaturedPosts, getHeaderMenuPosts);
router.get('/posts/popular', generalLimiter, cacheFeaturedPosts, getPopularPosts);
router.get('/posts/search', generalLimiter, cachePublicPosts, searchPosts);
router.get('/posts/user/:username', generalLimiter, cachePublicPosts, getPostsByUser);
router.get('/posts/:slug', generalLimiter, cachePostDetail, validators.slug, handleValidationErrors, getPostBySlug);

// Rutas protegidas de posts - CON VALIDACIÓN Y RATE LIMITING
router.post('/posts', writeLimiter, ...canCreateBlogPosts, validateBlogPost, createPost);
router.put('/posts/:id', writeLimiter, ...canEditOwnBlogPosts, validators.mongoId, handleValidationErrors, checkPostOwnership, updatePost);
router.delete('/posts/:id', writeLimiter, ...canDeleteOwnBlogPosts, validators.mongoId, handleValidationErrors, checkPostOwnership, deletePost);

// Acciones especiales de posts
router.patch('/posts/:id/publish', writeLimiter, ...canPublishBlogPosts, validators.mongoId, handleValidationErrors, publishPost);
router.patch('/posts/:id/unpublish', writeLimiter, ...canPublishBlogPosts, validators.mongoId, handleValidationErrors, unpublishPost);
router.post('/posts/:id/duplicate', writeLimiter, ...canDuplicateBlogPosts, validators.mongoId, handleValidationErrors, duplicatePost);

// Interacciones de usuario con posts
router.post('/posts/:id/like', generalLimiter, requireAuth, validators.mongoId, handleValidationErrors, toggleLike);
router.post('/posts/:id/bookmark', generalLimiter, requireAuth, validators.mongoId, handleValidationErrors, toggleBookmark);

// ========================================
// RUTAS DE CATEGORÍAS
// ========================================

// ✅ Rutas públicas de categorías - CON CACHE + Rate Limiting
router.get('/categories', generalLimiter, cacheTaxonomy, getAllCategories);
router.get('/categories/:slug', generalLimiter, cacheTaxonomy, validators.slug, handleValidationErrors, getCategoryBySlug);
router.get('/categories/:slug/posts', generalLimiter, cachePublicPosts, validators.slug, handleValidationErrors, getCategoryPosts);

// Rutas protegidas de categorías - CON VALIDACIÓN
router.post('/categories', writeLimiter, ...canManageBlogCategories, createCategory);
router.put('/categories/:id', writeLimiter, ...canManageBlogCategories, validators.mongoId, handleValidationErrors, updateCategory);
router.delete('/categories/:id', writeLimiter, ...canManageBlogCategories, validators.mongoId, handleValidationErrors, deleteCategory);
router.put('/categories/reorder', writeLimiter, ...canManageBlogCategories, reorderCategories);

// ========================================
// RUTAS DE TAGS
// ========================================

// ✅ Rutas públicas de tags - CON CACHE + Rate Limiting
router.get('/tags', generalLimiter, cacheTaxonomy, getAllTags);
router.get('/tags/popular', generalLimiter, cacheTaxonomy, getPopularTags);
router.get('/tags/:slug', generalLimiter, cacheTaxonomy, validators.slug, handleValidationErrors, getTagBySlug);
router.get('/tags/:slug/posts', generalLimiter, cachePublicPosts, validators.slug, handleValidationErrors, getTagPosts);

// Rutas protegidas de tags - CON VALIDACIÓN
router.post('/tags', writeLimiter, ...canManageBlogTags, createTag);
router.post('/tags/bulk', writeLimiter, ...canManageBlogTags, bulkCreateTags);
router.put('/tags/:id', writeLimiter, ...canManageBlogTags, validators.mongoId, handleValidationErrors, updateTag);
router.delete('/tags/:id', writeLimiter, ...canManageBlogTags, validators.mongoId, handleValidationErrors, deleteTag);

// ========================================
// RUTAS DE ESTADÍSTICAS Y ANALYTICS (Futuro)
// ========================================

// TODO: Implementar en Sprint 5
// router.get('/analytics/overview', canViewBlogAnalytics, getAnalyticsOverview);
// router.get('/analytics/posts/:id', canViewBlogAnalytics, getPostAnalytics);
// router.get('/analytics/export', canExportBlogData, exportBlogData);

// ========================================
// RUTAS DE SEO - Sprint 2 ✅
// ========================================

// ✅ Sitemaps (públicos para crawlers) - CON CACHE LARGO
router.get('/sitemap.xml', cacheSEOFiles, getSitemap);
router.get('/sitemap-images.xml', cacheSEOFiles, getImageSitemap);
router.get('/sitemap-news.xml', cacheSEOFiles, getNewsSitemap);
router.get('/sitemap-stats', noCache, getSitemapStatistics); // Debug/monitoreo

// ✅ RSS/Atom Feeds (públicos para lectores) - CON CACHE
router.get('/feed.xml', cacheSEOFiles, getRSSFeed);
router.get('/feed.atom', cacheSEOFiles, getAtomFeed);
router.get('/feed.json', cacheSEOFiles, getJSONFeed);
router.get('/feed/category/:slug', cacheSEOFiles, getCategoryFeed);
router.get('/feed-stats', noCache, getFeedStatistics); // Debug/monitoreo

// ✅ Robots.txt (público para crawlers) - CON CACHE
router.get('/robots.txt', cacheSEOFiles, getRobotsTxt);

// Schema.org JSON-LD por post
router.get('/schema/:slug', getPostSchemas);

// Meta Tags por contenido
router.get('/meta/:slug', getPostMetaTags);
router.get('/meta/category/:slug', getCategoryMetaTags);
router.get('/meta/tag/:slug', getTagMetaTags);
router.get('/meta/home', getBlogHomeMetaTags);

// Validación SEO (interno/debug)
router.get('/seo-validation/:slug', validatePostSEOScore);

// Schemas generales (reutilizables)
router.get('/schema/organization', getOrganizationSchema);
router.get('/schema/website', getWebSiteSchema);
router.get('/schema/blog', getBlogSchema);

// ========================================
// RUTAS DE AI SEO - Sprint 3 🤖
// ========================================

// Metadata AI y formatos para LLMs (públicos pero con rate limiting)
router.get('/ai/metadata/:slug', generalLimiter, validators.slug, handleValidationErrors, getAIMetadata);
router.get('/ai/conversational/:slug', generalLimiter, validators.slug, handleValidationErrors, getConversationalFormat);
router.get('/ai/qa/:slug', generalLimiter, validators.slug, handleValidationErrors, getQAFormat);
router.get('/ai/llm-metadata/:slug', generalLimiter, validators.slug, handleValidationErrors, getLLMMetadata);
router.get('/ai/markdown/:slug', generalLimiter, validators.slug, handleValidationErrors, getMarkdownFormat);
router.get('/ai/json-ld-extended/:slug', generalLimiter, validators.slug, handleValidationErrors, getExtendedJSONLD);

// Análisis semántico (públicos con rate limiting)
router.get('/ai/semantic-analysis/:slug', generalLimiter, validators.slug, handleValidationErrors, getSemanticAnalysis);
router.get('/ai/keywords/:slug', generalLimiter, validators.slug, handleValidationErrors, getKeywords);
router.get('/ai/entities/:slug', generalLimiter, validators.slug, handleValidationErrors, getEntities);
router.get('/ai/topics/:slug', generalLimiter, validators.slug, handleValidationErrors, getTopics);
router.get('/ai/readability/:slug', generalLimiter, validators.slug, handleValidationErrors, getReadabilityAnalysis);
router.get('/ai/sentiment/:slug', generalLimiter, validators.slug, handleValidationErrors, getSentimentAnalysis);
router.get('/ai/structure/:slug', generalLimiter, validators.slug, handleValidationErrors, getStructureAnalysis);

// Sugerencias y mejoras (requiere autenticación) - ⚠️ Rate limit estricto para AI
router.get('/ai/suggestions/:slug', aiChatLimiter, requireAuth, validators.slug, handleValidationErrors, getImprovementSuggestions);
router.get('/ai/suggest-tags/:slug', aiChatLimiter, requireAuth, validators.slug, handleValidationErrors, getSuggestedTags);
router.get('/ai/suggest-keywords/:slug', aiChatLimiter, requireAuth, validators.slug, handleValidationErrors, getSuggestedKeywords);
router.get('/ai/content-score/:slug', aiChatLimiter, requireAuth, validators.slug, handleValidationErrors, getContentScore);

// Optimización automática (requiere autenticación + permisos de edición) - ⚠️ Muy costoso
router.post('/ai/optimize/:slug', aiChatLimiter, requireAuth, canEditOwnBlogPosts, validators.slug, handleValidationErrors, optimizePost);

export default router;
