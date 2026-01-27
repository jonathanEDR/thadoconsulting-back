/**
 * Utilidad para generar Sitemap XML
 * Sitemap para ayudar a los buscadores a indexar el contenido
 */

import BlogPost from '../models/BlogPost.js';
import BlogCategory from '../models/BlogCategory.js';
import BlogTag from '../models/BlogTag.js';

/**
 * Generar URL entry para sitemap
 * @param {string} loc - URL de la página
 * @param {Date} lastmod - Fecha de última modificación
 * @param {string} changefreq - Frecuencia de cambio
 * @param {number} priority - Prioridad (0.0 a 1.0)
 * @returns {string} - XML entry
 */
const generateUrlEntry = (loc, lastmod, changefreq = 'weekly', priority = 0.5) => {
  const lastmodStr = lastmod ? new Date(lastmod).toISOString().split('T')[0] : '';
  
  return `
  <url>
    <loc>${loc}</loc>${lastmodStr ? `
    <lastmod>${lastmodStr}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
};

/**
 * Generar sitemap completo del blog
 * @param {string} baseUrl - URL base del sitio
 * @returns {Promise<string>} - XML del sitemap
 */
export const generateBlogSitemap = async (baseUrl = 'https://web-scuti.com') => {
  try {
    const urls = [];
    
    // 1. Página principal del blog
    urls.push(generateUrlEntry(
      `${baseUrl}/blog`,
      new Date(),
      'daily',
      0.9
    ));
    
    // 2. Posts publicados
    const posts = await BlogPost.find({
      isPublished: true,
      status: 'published'
    })
      .select('slug updatedAt publishedAt')
      .sort('-publishedAt')
      .lean();
    
    posts.forEach(post => {
      urls.push(generateUrlEntry(
        `${baseUrl}/blog/${post.slug}`,
        post.updatedAt || post.publishedAt,
        'weekly',
        0.8
      ));
    });
    
    // 3. Categorías activas
    const categories = await BlogCategory.find({ isActive: true })
      .select('slug updatedAt')
      .lean();
    
    categories.forEach(category => {
      urls.push(generateUrlEntry(
        `${baseUrl}/blog/category/${category.slug}`,
        category.updatedAt,
        'weekly',
        0.7
      ));
    });
    
    // 4. Tags activos con posts
    const tags = await BlogTag.find({ 
      isActive: true,
      usageCount: { $gt: 0 }
    })
      .select('slug updatedAt')
      .lean();
    
    tags.forEach(tag => {
      urls.push(generateUrlEntry(
        `${baseUrl}/blog/tag/${tag.slug}`,
        tag.updatedAt,
        'weekly',
        0.6
      ));
    });
    
    // Construir XML completo
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('')}
</urlset>`;
    
    return xml;
    
  } catch (error) {
    console.error('Error al generar sitemap:', error);
    throw error;
  }
};

/**
 * Generar sitemap index (si hay múltiples sitemaps)
 * @param {string} baseUrl - URL base del sitio
 * @param {array} sitemaps - Array de sitemaps con { loc, lastmod }
 * @returns {string} - XML del sitemap index
 */
export const generateSitemapIndex = (baseUrl, sitemaps = []) => {
  const sitemapEntries = sitemaps.map(sitemap => {
    const lastmodStr = sitemap.lastmod ? 
      new Date(sitemap.lastmod).toISOString().split('T')[0] : 
      new Date().toISOString().split('T')[0];
    
    return `
  <sitemap>
    <loc>${baseUrl}${sitemap.loc}</loc>
    <lastmod>${lastmodStr}</lastmod>
  </sitemap>`;
  }).join('');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`;
};

/**
 * Generar sitemap de imágenes (para posts con imágenes destacadas)
 * @param {string} baseUrl - URL base del sitio
 * @returns {Promise<string>} - XML del sitemap de imágenes
 */
export const generateImageSitemap = async (baseUrl = 'https://web-scuti.com') => {
  try {
    const posts = await BlogPost.find({
      isPublished: true,
      status: 'published',
      'featuredImage.url': { $exists: true, $ne: '' }
    })
      .select('slug title excerpt featuredImage')
      .lean();
    
    const urls = posts.map(post => {
      return `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <image:image>
      <image:loc>${post.featuredImage.url}</image:loc>
      <image:title>${post.title}</image:title>
      <image:caption>${post.featuredImage.caption || post.excerpt}</image:caption>
    </image:image>
  </url>`;
    }).join('');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;
    
  } catch (error) {
    console.error('Error al generar sitemap de imágenes:', error);
    throw error;
  }
};

/**
 * Generar sitemap de noticias (para posts recientes)
 * @param {string} baseUrl - URL base del sitio
 * @param {number} days - Días hacia atrás (Google News requiere últimas 48h)
 * @returns {Promise<string>} - XML del sitemap de noticias
 */
export const generateNewsSitemap = async (baseUrl = 'https://web-scuti.com', days = 2) => {
  try {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    
    const recentPosts = await BlogPost.find({
      isPublished: true,
      status: 'published',
      publishedAt: { $gte: dateLimit }
    })
      .populate('category', 'name')
      .populate('author', 'firstName lastName')
      .select('slug title excerpt publishedAt category author seo')
      .sort('-publishedAt')
      .lean();
    
    const urls = recentPosts.map(post => {
      const pubDate = new Date(post.publishedAt);
      const keywords = post.seo?.keywords?.join(', ') || '';
      
      return `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Web Scuti Blog</news:name>
        <news:language>es</news:language>
      </news:publication>
      <news:publication_date>${pubDate.toISOString()}</news:publication_date>
      <news:title>${post.title}</news:title>${keywords ? `
      <news:keywords>${keywords}</news:keywords>` : ''}
    </news:news>
  </url>`;
    }).join('');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;
    
  } catch (error) {
    console.error('Error al generar sitemap de noticias:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas del sitemap
 * @returns {Promise<object>} - Estadísticas
 */
export const getSitemapStats = async () => {
  try {
    const postsCount = await BlogPost.countDocuments({
      isPublished: true,
      status: 'published'
    });
    
    const categoriesCount = await BlogCategory.countDocuments({ isActive: true });
    
    const tagsCount = await BlogTag.countDocuments({ 
      isActive: true,
      usageCount: { $gt: 0 }
    });
    
    const totalUrls = 1 + postsCount + categoriesCount + tagsCount; // +1 para página principal
    
    // Obtener fecha de último post
    const lastPost = await BlogPost.findOne({
      isPublished: true,
      status: 'published'
    })
      .sort('-publishedAt')
      .select('publishedAt')
      .lean();
    
    return {
      totalUrls,
      posts: postsCount,
      categories: categoriesCount,
      tags: tagsCount,
      lastUpdate: lastPost?.publishedAt || new Date()
    };
    
  } catch (error) {
    console.error('Error al obtener estadísticas del sitemap:', error);
    throw error;
  }
};

/**
 * Validar URLs del sitemap
 * @param {string} baseUrl - URL base del sitio
 * @returns {Promise<object>} - Resultado de la validación
 */
export const validateSitemap = async (baseUrl) => {
  try {
    const stats = await getSitemapStats();
    const warnings = [];
    const errors = [];
    
    // Verificar límite de URLs (50,000 por sitemap según Google)
    if (stats.totalUrls > 50000) {
      errors.push('El sitemap excede el límite de 50,000 URLs. Considerar usar sitemap index.');
    }
    
    // Advertir si hay muchos posts sin actualizar
    const oldPosts = await BlogPost.countDocuments({
      isPublished: true,
      status: 'published',
      updatedAt: { $lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } // 1 año
    });
    
    if (oldPosts > 50) {
      warnings.push(`Hay ${oldPosts} posts sin actualizar en más de 1 año. Considerar actualizar contenido.`);
    }
    
    return {
      isValid: errors.length === 0,
      stats,
      warnings,
      errors
    };
    
  } catch (error) {
    console.error('Error al validar sitemap:', error);
    throw error;
  }
};

export default {
  generateBlogSitemap,
  generateSitemapIndex,
  generateImageSitemap,
  generateNewsSitemap,
  getSitemapStats,
  validateSitemap
};
