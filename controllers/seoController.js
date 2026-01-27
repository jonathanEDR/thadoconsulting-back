/**
 * Controlador para endpoints SEO
 * Sirve sitemaps, RSS feeds, robots.txt, schema.org
 */

import {
  generateBlogSitemap,
  generateImageSitemap,
  generateNewsSitemap,
  getSitemapStats,
  validateSitemap
} from '../utils/sitemapGenerator.js';

import {
  generateRSSFeed,
  generateAtomFeed,
  generateJSONFeed,
  generateCategoryRSSFeed,
  getFeedStats
} from '../utils/rssFeedGenerator.js';

import {
  generatePostMetaTags,
  generateCategoryMetaTags,
  generateTagMetaTags,
  generateBlogHomeMetaTags,
  validatePostSEO
} from '../utils/seoGenerator.js';

import {
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateBlogSchema,
  generateAllSchemas,
  schemaToScriptTag
} from '../utils/schemaGenerator.js';

import BlogPost from '../models/BlogPost.js';
import BlogCategory from '../models/BlogCategory.js';
import BlogTag from '../models/BlogTag.js';

// URL base del frontend para SEO/Sitemaps
const FRONTEND_BASE_URL = process.env.SITEMAP_BASE_URL || 'https://www.thadoconsulting.com';

/**
 * GET /api/blog/sitemap.xml
 * Servir sitemap principal del blog
 */
export const getSitemap = async (req, res) => {
  try {
    // Usar URL del frontend, no del backend
    const baseUrl = FRONTEND_BASE_URL;
    const sitemap = await generateBlogSitemap(baseUrl);
    
    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar sitemap',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/sitemap-images.xml
 * Servir sitemap de imágenes del blog
 */
export const getImageSitemap = async (req, res) => {
  try {
    const baseUrl = FRONTEND_BASE_URL;
    const sitemap = await generateImageSitemap(baseUrl);
    
    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar sitemap de imágenes',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/sitemap-news.xml
 * Servir sitemap de noticias (posts recientes para Google News)
 */
export const getNewsSitemap = async (req, res) => {
  try {
    const baseUrl = FRONTEND_BASE_URL;
    const sitemap = await generateNewsSitemap(baseUrl);
    
    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar sitemap de noticias',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/sitemap-stats
 * Obtener estadísticas del sitemap (para debug/monitoreo)
 */
export const getSitemapStatistics = async (req, res) => {
  try {
    const stats = await getSitemapStats();
    const validation = await validateSitemap();
    
    res.json({
      stats,
      validation,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al obtener estadísticas',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/feed.xml
 * Servir RSS 2.0 feed
 */
export const getRSSFeed = async (req, res) => {
  try {
    const baseUrl = FRONTEND_BASE_URL;
    const limit = parseInt(req.query.limit) || 50;
    
    const feed = await generateRSSFeed(baseUrl, limit);
    
    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.send(feed);
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar RSS feed',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/feed.atom
 * Servir Atom feed
 */
export const getAtomFeed = async (req, res) => {
  try {
    const baseUrl = FRONTEND_BASE_URL;
    const limit = parseInt(req.query.limit) || 50;
    
    const feed = await generateAtomFeed(baseUrl, limit);
    
    res.set('Content-Type', 'application/atom+xml; charset=utf-8');
    res.send(feed);
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar Atom feed',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/feed.json
 * Servir JSON Feed
 */
export const getJSONFeed = async (req, res) => {
  try {
    const baseUrl = FRONTEND_BASE_URL;
    const limit = parseInt(req.query.limit) || 50;
    
    const feed = await generateJSONFeed(baseUrl, limit);
    
    res.json(feed);
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar JSON feed',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/feed/category/:slug
 * Servir RSS feed de una categoría específica
 */
export const getCategoryFeed = async (req, res) => {
  try {
    const { slug } = req.params;
    const baseUrl = FRONTEND_BASE_URL;
    const limit = parseInt(req.query.limit) || 50;
    
    const feed = await generateCategoryRSSFeed(slug, baseUrl, limit);
    
    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.send(feed);
    
  } catch (error) {
        
    if (error.message === 'Categoría no encontrada') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({
      error: 'Error al generar feed de categoría',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/feed-stats
 * Obtener estadísticas del feed
 */
export const getFeedStatistics = async (req, res) => {
  try {
    const stats = await getFeedStats();
    
    res.json({
      ...stats,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al obtener estadísticas',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/robots.txt
 * Generar robots.txt dinámico
 */
export const getRobotsTxt = async (req, res) => {
  try {
    const baseUrl = FRONTEND_BASE_URL;
    
    const robotsTxt = `# Robots.txt para THADO Consulting Blog
User-agent: *
Allow: /blog/
Allow: /api/blog/sitemap.xml
Allow: /api/blog/sitemap-images.xml
Allow: /api/blog/sitemap-news.xml
Allow: /api/blog/feed.xml
Allow: /api/blog/feed.atom
Allow: /api/blog/feed.json

# Bloquear rutas de admin y API privadas
Disallow: /api/blog/posts/*/edit
Disallow: /api/blog/posts/*/delete
Disallow: /api/admin/

# Sitemaps
Sitemap: ${baseUrl}/api/blog/sitemap.xml
Sitemap: ${baseUrl}/api/blog/sitemap-images.xml
Sitemap: ${baseUrl}/api/blog/sitemap-news.xml

# Crawl-delay
Crawl-delay: 1
`;
    
    res.set('Content-Type', 'text/plain');
    res.send(robotsTxt);
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar robots.txt',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/schema/:slug
 * Obtener todos los schemas de un post específico
 */
export const getPostSchemas = async (req, res) => {
  try {
    const { slug } = req.params;
    const baseUrl = FRONTEND_BASE_URL;
    
    const post = await BlogPost.findOne({ slug, isPublished: true })
      .populate('author', 'firstName lastName email')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const schemas = generateAllSchemas(post, 'post', baseUrl);
    
    res.json({
      scriptTags: schemas,
      post: {
        slug: post.slug,
        title: post.title
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar schemas',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/meta/:slug
 * Obtener meta tags de un post específico
 */
export const getPostMetaTags = async (req, res) => {
  try {
    const { slug } = req.params;
    const baseUrl = FRONTEND_BASE_URL;
    
    const post = await BlogPost.findOne({ slug, isPublished: true })
      .populate('author', 'firstName lastName')
      .populate('tags', 'name')
      .lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const metaTags = await generatePostMetaTags(post, baseUrl);
    
    res.json({
      metaTags,
      post: {
        slug: post.slug,
        title: post.title
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar meta tags',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/meta/category/:slug
 * Obtener meta tags de una categoría
 */
export const getCategoryMetaTags = async (req, res) => {
  try {
    const { slug } = req.params;
    const baseUrl = FRONTEND_BASE_URL;
    
    const category = await BlogCategory.findOne({ slug, isActive: true }).lean();
    
    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    const metaTags = generateCategoryMetaTags(category, baseUrl);
    
    res.json({
      metaTags,
      category: {
        slug: category.slug,
        name: category.name
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar meta tags',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/meta/tag/:slug
 * Obtener meta tags de un tag
 */
export const getTagMetaTags = async (req, res) => {
  try {
    const { slug } = req.params;
    const baseUrl = FRONTEND_BASE_URL;
    
    const tag = await BlogTag.findOne({ slug }).lean();
    
    if (!tag) {
      return res.status(404).json({ error: 'Tag no encontrado' });
    }
    
    const metaTags = generateTagMetaTags(tag, baseUrl);
    
    res.json({
      metaTags,
      tag: {
        slug: tag.slug,
        name: tag.name
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar meta tags',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/meta/home
 * Obtener meta tags de la página principal del blog
 */
export const getBlogHomeMetaTags = async (req, res) => {
  try {
    const baseUrl = FRONTEND_BASE_URL;
    const metaTags = generateBlogHomeMetaTags(baseUrl);
    
    res.json({ metaTags });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar meta tags',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/seo-validation/:slug
 * Validar el SEO de un post
 */
export const validatePostSEOScore = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug })
      .populate('tags', 'name')
      .lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const validation = validatePostSEO(post);
    
    res.json({
      validation,
      post: {
        slug: post.slug,
        title: post.title,
        isPublished: post.isPublished
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al validar SEO',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/schema/organization
 * Obtener schema de la organización
 */
export const getOrganizationSchema = async (req, res) => {
  try {
    const baseUrl = FRONTEND_BASE_URL;
    const schema = generateOrganizationSchema(baseUrl);
    
    res.json({
      schema,
      scriptTag: schemaToScriptTag(schema)
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar schema',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/schema/website
 * Obtener schema del sitio web
 */
export const getWebSiteSchema = async (req, res) => {
  try {
    const baseUrl = FRONTEND_BASE_URL;
    const schema = generateWebSiteSchema(baseUrl);
    
    res.json({
      schema,
      scriptTag: schemaToScriptTag(schema)
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar schema',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/schema/blog
 * Obtener schema del blog
 */
export const getBlogSchema = async (req, res) => {
  try {
    const baseUrl = FRONTEND_BASE_URL;
    const schema = await generateBlogSchema(baseUrl);
    
    res.json({
      schema,
      scriptTag: schemaToScriptTag(schema)
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar schema',
      message: error.message
    });
  }
};

export default {
  // Sitemaps
  getSitemap,
  getImageSitemap,
  getNewsSitemap,
  getSitemapStatistics,
  
  // Feeds
  getRSSFeed,
  getAtomFeed,
  getJSONFeed,
  getCategoryFeed,
  getFeedStatistics,
  
  // Robots
  getRobotsTxt,
  
  // Schemas por post
  getPostSchemas,
  
  // Meta tags
  getPostMetaTags,
  getCategoryMetaTags,
  getTagMetaTags,
  getBlogHomeMetaTags,
  
  // Validación SEO
  validatePostSEOScore,
  
  // Schemas generales
  getOrganizationSchema,
  getWebSiteSchema,
  getBlogSchema
};
