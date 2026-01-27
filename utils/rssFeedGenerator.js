/**
 * Utilidad para generar RSS/Atom Feed
 * Feed para que usuarios se suscriban al blog
 */

import BlogPost from '../models/BlogPost.js';
import BlogCategory from '../models/BlogCategory.js';

/**
 * Escapar caracteres XML especiales
 * @param {string} text - Texto a escapar
 * @returns {string} - Texto escapado
 */
const escapeXml = (text) => {
  if (!text) return '';
  
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Limpiar HTML para feed
 * @param {string} html - HTML a limpiar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} - Texto limpio
 */
const cleanHtmlForFeed = (html, maxLength = 500) => {
  if (!html) return '';
  
  // Remover tags HTML pero mantener saltos de línea
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');
  
  // Limpiar espacios múltiples
  const cleaned = text.replace(/\s+/g, ' ').trim();
  
  // Truncar si es necesario
  if (cleaned.length > maxLength) {
    return cleaned.substring(0, maxLength) + '...';
  }
  
  return cleaned;
};

/**
 * Generar RSS 2.0 Feed
 * @param {string} baseUrl - URL base del sitio
 * @param {number} limit - Número máximo de posts a incluir
 * @returns {Promise<string>} - XML del RSS feed
 */
export const generateRSSFeed = async (baseUrl = 'https://www.thadoconsulting.com', limit = 50) => {
  try {
    const posts = await BlogPost.find({
      isPublished: true,
      status: 'published'
    })
      .populate('author', 'firstName lastName email')
      .populate('category', 'name')
      .populate('tags', 'name')
      .sort('-publishedAt')
      .limit(limit)
      .lean();
    
    const latestPost = posts[0];
    const buildDate = latestPost ? new Date(latestPost.publishedAt) : new Date();
    
    const items = posts.map(post => {
      const postUrl = `${baseUrl}/blog/${post.slug}`;
      const pubDate = new Date(post.publishedAt).toUTCString();
      const author = post.author ? 
        `${post.author.email} (${post.author.firstName} ${post.author.lastName})` : 
        '';
      
      const categories = post.tags ? 
        post.tags.map(tag => `    <category>${escapeXml(tag.name)}</category>`).join('\n') : 
        '';
      
      // Descripción con HTML permitido en CDATA
      const description = post.excerpt || cleanHtmlForFeed(post.content, 500);
      
      return `  <item>
    <title>${escapeXml(post.title)}</title>
    <link>${postUrl}</link>
    <guid isPermaLink="true">${postUrl}</guid>
    <pubDate>${pubDate}</pubDate>${author ? `
    <author>${escapeXml(author)}</author>` : ''}${post.category ? `
    <category>${escapeXml(post.category.name)}</category>` : ''}
${categories}
    <description><![CDATA[${description}]]></description>${post.featuredImage?.url ? `
    <enclosure url="${post.featuredImage.url}" type="image/jpeg" />` : ''}
  </item>`;
    }).join('\n');
    
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>THADO Consulting Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Artículos sobre contabilidad, tributación y gestión empresarial</description>
    <language>es-ES</language>
    <lastBuildDate>${buildDate.toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/api/blog/feed.xml" rel="self" type="application/rss+xml" />
    <generator>THADO Consulting Blog Engine</generator>
    <image>
      <url>${baseUrl}/Logo.png</url>
      <title>THADO Consulting Blog</title>
      <link>${baseUrl}/blog</link>
    </image>
${items}
  </channel>
</rss>`;
    
    return rss;
    
  } catch (error) {
    console.error('Error al generar RSS feed:', error);
    throw error;
  }
};

/**
 * Generar Atom Feed
 * @param {string} baseUrl - URL base del sitio
 * @param {number} limit - Número máximo de posts a incluir
 * @returns {Promise<string>} - XML del Atom feed
 */
export const generateAtomFeed = async (baseUrl = 'https://www.thadoconsulting.com', limit = 50) => {
  try {
    const posts = await BlogPost.find({
      isPublished: true,
      status: 'published'
    })
      .populate('author', 'firstName lastName email')
      .populate('category', 'name')
      .populate('tags', 'name')
      .sort('-publishedAt')
      .limit(limit)
      .lean();
    
    const latestPost = posts[0];
    const updated = latestPost ? 
      new Date(latestPost.publishedAt).toISOString() : 
      new Date().toISOString();
    
    const entries = posts.map(post => {
      const postUrl = `${baseUrl}/blog/${post.slug}`;
      const published = new Date(post.publishedAt).toISOString();
      const updated = new Date(post.updatedAt).toISOString();
      
      const author = post.author ? `
    <author>
      <name>${escapeXml(`${post.author.firstName} ${post.author.lastName}`)}</name>
      <email>${escapeXml(post.author.email)}</email>
    </author>` : '';
      
      const categories = post.tags ?
        post.tags.map(tag => `    <category term="${escapeXml(tag.name)}" />`).join('\n') :
        '';
      
      const summary = post.excerpt || cleanHtmlForFeed(post.content, 500);
      
      return `  <entry>
    <title>${escapeXml(post.title)}</title>
    <link href="${postUrl}" />
    <id>${postUrl}</id>
    <published>${published}</published>
    <updated>${updated}</updated>${author}
${categories}
    <summary type="html"><![CDATA[${summary}]]></summary>${post.featuredImage?.url ? `
    <link rel="enclosure" type="image/jpeg" href="${post.featuredImage.url}" />` : ''}
  </entry>`;
    }).join('\n');
    
    const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>THADO Consulting Blog</title>
  <subtitle>Artículos sobre contabilidad, tributación y gestión empresarial</subtitle>
  <link href="${baseUrl}/blog" />
  <link href="${baseUrl}/api/blog/feed.atom" rel="self" type="application/atom+xml" />
  <id>${baseUrl}/blog</id>
  <updated>${updated}</updated>
  <generator>THADO Consulting Blog Engine</generator>
  <icon>${baseUrl}/favicon.ico</icon>
  <logo>${baseUrl}/Logo.png</logo>
${entries}
</feed>`;
    
    return atom;
    
  } catch (error) {
    console.error('Error al generar Atom feed:', error);
    throw error;
  }
};

/**
 * Generar JSON Feed (formato moderno alternativo)
 * @param {string} baseUrl - URL base del sitio
 * @param {number} limit - Número máximo de posts a incluir
 * @returns {Promise<object>} - JSON Feed
 */
export const generateJSONFeed = async (baseUrl = 'https://www.thadoconsulting.com', limit = 50) => {
  try {
    const posts = await BlogPost.find({
      isPublished: true,
      status: 'published'
    })
      .populate('author', 'firstName lastName')
      .populate('category', 'name')
      .populate('tags', 'name')
      .sort('-publishedAt')
      .limit(limit)
      .lean();
    
    const items = posts.map(post => {
      const postUrl = `${baseUrl}/blog/${post.slug}`;
      
      return {
        id: postUrl,
        url: postUrl,
        title: post.title,
        content_html: post.content,
        summary: post.excerpt,
        image: post.featuredImage?.url,
        date_published: post.publishedAt,
        date_modified: post.updatedAt,
        author: post.author ? {
          name: `${post.author.firstName} ${post.author.lastName}`
        } : undefined,
        tags: post.tags?.map(tag => tag.name) || []
      };
    });
    
    const jsonFeed = {
      version: 'https://jsonfeed.org/version/1.1',
      title: 'Web Scuti Blog',
      description: 'Artículos sobre desarrollo web, diseño y tecnología',
      home_page_url: `${baseUrl}/blog`,
      feed_url: `${baseUrl}/api/blog/feed.json`,
      icon: `${baseUrl}/favicon.ico`,
      favicon: `${baseUrl}/favicon.ico`,
      language: 'es-ES',
      items
    };
    
    return jsonFeed;
    
  } catch (error) {
    console.error('Error al generar JSON feed:', error);
    throw error;
  }
};

/**
 * Generar RSS Feed por categoría
 * @param {string} categorySlug - Slug de la categoría
 * @param {string} baseUrl - URL base del sitio
 * @param {number} limit - Número máximo de posts
 * @returns {Promise<string>} - XML del RSS feed
 */
export const generateCategoryRSSFeed = async (categorySlug, baseUrl = 'https://www.thadoconsulting.com', limit = 50) => {
  try {
    const category = await BlogCategory.findOne({ slug: categorySlug, isActive: true });
    
    if (!category) {
      throw new Error('Categoría no encontrada');
    }
    
    const posts = await BlogPost.find({
      isPublished: true,
      status: 'published',
      category: category._id
    })
      .populate('author', 'firstName lastName email')
      .populate('tags', 'name')
      .sort('-publishedAt')
      .limit(limit)
      .lean();
    
    const latestPost = posts[0];
    const buildDate = latestPost ? new Date(latestPost.publishedAt) : new Date();
    
    const items = posts.map(post => {
      const postUrl = `${baseUrl}/blog/${post.slug}`;
      const pubDate = new Date(post.publishedAt).toUTCString();
      const description = post.excerpt || cleanHtmlForFeed(post.content, 500);
      
      return `  <item>
    <title>${escapeXml(post.title)}</title>
    <link>${postUrl}</link>
    <guid isPermaLink="true">${postUrl}</guid>
    <pubDate>${pubDate}</pubDate>
    <category>${escapeXml(category.name)}</category>
    <description><![CDATA[${description}]]></description>
  </item>`;
    }).join('\n');
    
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Web Scuti Blog - ${escapeXml(category.name)}</title>
    <link>${baseUrl}/blog/category/${category.slug}</link>
    <description>${escapeXml(category.description || `Artículos sobre ${category.name}`)}</description>
    <language>es-ES</language>
    <lastBuildDate>${buildDate.toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
    
    return rss;
    
  } catch (error) {
    console.error('Error al generar RSS feed de categoría:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas del feed
 * @returns {Promise<object>} - Estadísticas
 */
export const getFeedStats = async () => {
  try {
    const totalPosts = await BlogPost.countDocuments({
      isPublished: true,
      status: 'published'
    });
    
    const lastPost = await BlogPost.findOne({
      isPublished: true,
      status: 'published'
    })
      .sort('-publishedAt')
      .select('publishedAt title')
      .lean();
    
    const postsLast30Days = await BlogPost.countDocuments({
      isPublished: true,
      status: 'published',
      publishedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    return {
      totalPosts,
      lastPost: lastPost ? {
        title: lastPost.title,
        publishedAt: lastPost.publishedAt
      } : null,
      postsLast30Days,
      updateFrequency: postsLast30Days > 0 ? 
        `~${Math.round(30 / postsLast30Days)} días entre posts` : 
        'Sin posts recientes'
    };
    
  } catch (error) {
    console.error('Error al obtener estadísticas del feed:', error);
    throw error;
  }
};

export default {
  generateRSSFeed,
  generateAtomFeed,
  generateJSONFeed,
  generateCategoryRSSFeed,
  getFeedStats
};
