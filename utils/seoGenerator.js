/**
 * Utilidad para generar meta tags SEO automáticos
 * Genera meta tags optimizados para buscadores y redes sociales
 */

/**
 * Limpiar y truncar texto para meta tags
 * @param {string} text - Texto a limpiar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} - Texto limpio y truncado
 */
const cleanText = (text, maxLength = 160) => {
  if (!text) return '';
  
  // Remover HTML tags
  const withoutHtml = text.replace(/<[^>]+>/g, ' ');
  
  // Remover espacios múltiples
  const cleaned = withoutHtml.replace(/\s+/g, ' ').trim();
  
  // Truncar si excede la longitud
  if (cleaned.length <= maxLength) return cleaned;
  
  // Truncar en el último espacio antes del límite
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
};

/**
 * Generar meta tags para un post del blog
 * @param {object} post - Objeto del post
 * @param {string} baseUrl - URL base del sitio (ej: https://web-scuti.com)
 * @returns {object} - Meta tags generados
 */
export const generatePostMetaTags = (post, baseUrl = '') => {
  const postUrl = `${baseUrl}/blog/${post.slug}`;
  
  // Meta tags básicos
  const metaTitle = post.seo?.metaTitle || cleanText(post.title, 60);
  const metaDescription = post.seo?.metaDescription || cleanText(post.excerpt, 160);
  const keywords = post.seo?.keywords || [];
  
  // Open Graph (Facebook, LinkedIn)
  const ogTitle = post.seo?.ogTitle || metaTitle;
  const ogDescription = post.seo?.ogDescription || metaDescription;
  const ogImage = post.seo?.ogImage || post.featuredImage?.url || `${baseUrl}/images/blog-default.jpg`;
  const ogType = post.seo?.ogType || 'article';
  
  // Twitter Card
  const twitterCard = post.seo?.twitterCard || 'summary_large_image';
  const twitterTitle = post.seo?.twitterTitle || metaTitle;
  const twitterDescription = post.seo?.twitterDescription || metaDescription;
  const twitterImage = post.seo?.twitterImage || ogImage;
  
  // Canonical URL
  const canonicalUrl = post.seo?.canonicalUrl || postUrl;
  
  // Robots
  const robots = post.seo?.robots || 'index, follow';
  
  return {
    // Meta tags básicos
    title: metaTitle,
    description: metaDescription,
    keywords: keywords.join(', '),
    canonical: canonicalUrl,
    robots,
    
    // Open Graph
    openGraph: {
      type: ogType,
      url: postUrl,
      title: ogTitle,
      description: ogDescription,
      image: ogImage,
      siteName: 'Web Scuti',
      locale: 'es_ES',
      article: {
        publishedTime: post.publishedAt?.toISOString(),
        modifiedTime: post.updatedAt?.toISOString(),
        author: post.author ? `${post.author.firstName} ${post.author.lastName}` : '',
        section: post.category?.name || '',
        tags: post.tags?.map(tag => tag.name) || []
      }
    },
    
    // Twitter Card
    twitter: {
      card: twitterCard,
      site: '@WebScuti', // Cambiar por tu handle
      creator: '@WebScuti',
      title: twitterTitle,
      description: twitterDescription,
      image: twitterImage
    },
    
    // Meta tags adicionales
    additional: {
      author: post.author ? `${post.author.firstName} ${post.author.lastName}` : '',
      publishDate: post.publishedAt?.toISOString(),
      modifiedDate: post.updatedAt?.toISOString(),
      readingTime: `${post.readingTime} min`,
      category: post.category?.name || '',
      tags: post.tags?.map(tag => tag.name) || []
    }
  };
};

/**
 * Generar HTML de meta tags para insertar en <head>
 * @param {object} metaTags - Objeto de meta tags generado
 * @returns {string} - HTML de meta tags
 */
export const generateMetaTagsHTML = (metaTags) => {
  const html = [];
  
  // Meta tags básicos
  html.push(`<title>${metaTags.title}</title>`);
  html.push(`<meta name="description" content="${metaTags.description}">`);
  if (metaTags.keywords) {
    html.push(`<meta name="keywords" content="${metaTags.keywords}">`);
  }
  html.push(`<link rel="canonical" href="${metaTags.canonical}">`);
  html.push(`<meta name="robots" content="${metaTags.robots}">`);
  
  // Author y fechas
  if (metaTags.additional.author) {
    html.push(`<meta name="author" content="${metaTags.additional.author}">`);
  }
  if (metaTags.additional.publishDate) {
    html.push(`<meta property="article:published_time" content="${metaTags.additional.publishDate}">`);
  }
  if (metaTags.additional.modifiedDate) {
    html.push(`<meta property="article:modified_time" content="${metaTags.additional.modifiedDate}">`);
  }
  
  // Open Graph
  const og = metaTags.openGraph;
  html.push(`<meta property="og:type" content="${og.type}">`);
  html.push(`<meta property="og:url" content="${og.url}">`);
  html.push(`<meta property="og:title" content="${og.title}">`);
  html.push(`<meta property="og:description" content="${og.description}">`);
  html.push(`<meta property="og:image" content="${og.image}">`);
  html.push(`<meta property="og:site_name" content="${og.siteName}">`);
  html.push(`<meta property="og:locale" content="${og.locale}">`);
  
  if (og.article) {
    if (og.article.publishedTime) {
      html.push(`<meta property="article:published_time" content="${og.article.publishedTime}">`);
    }
    if (og.article.modifiedTime) {
      html.push(`<meta property="article:modified_time" content="${og.article.modifiedTime}">`);
    }
    if (og.article.author) {
      html.push(`<meta property="article:author" content="${og.article.author}">`);
    }
    if (og.article.section) {
      html.push(`<meta property="article:section" content="${og.article.section}">`);
    }
    og.article.tags?.forEach(tag => {
      html.push(`<meta property="article:tag" content="${tag}">`);
    });
  }
  
  // Twitter Card
  const tw = metaTags.twitter;
  html.push(`<meta name="twitter:card" content="${tw.card}">`);
  html.push(`<meta name="twitter:site" content="${tw.site}">`);
  html.push(`<meta name="twitter:creator" content="${tw.creator}">`);
  html.push(`<meta name="twitter:title" content="${tw.title}">`);
  html.push(`<meta name="twitter:description" content="${tw.description}">`);
  html.push(`<meta name="twitter:image" content="${tw.image}">`);
  
  return html.join('\n');
};

/**
 * Generar meta tags para categoría
 * @param {object} category - Objeto de categoría
 * @param {string} baseUrl - URL base del sitio
 * @returns {object} - Meta tags generados
 */
export const generateCategoryMetaTags = (category, baseUrl = '') => {
  const categoryUrl = `${baseUrl}/blog/category/${category.slug}`;
  
  const metaTitle = category.seo?.metaTitle || `${category.name} - Blog Web Scuti`;
  const metaDescription = category.seo?.metaDescription || 
    cleanText(category.description || `Artículos sobre ${category.name}`, 160);
  
  return {
    title: metaTitle,
    description: metaDescription,
    canonical: categoryUrl,
    robots: 'index, follow',
    openGraph: {
      type: 'website',
      url: categoryUrl,
      title: metaTitle,
      description: metaDescription,
      image: category.image?.url || `${baseUrl}/images/blog-default.jpg`,
      siteName: 'Web Scuti'
    },
    twitter: {
      card: 'summary',
      title: metaTitle,
      description: metaDescription,
      image: category.image?.url || `${baseUrl}/images/blog-default.jpg`
    }
  };
};

/**
 * Generar meta tags para tag
 * @param {object} tag - Objeto de tag
 * @param {string} baseUrl - URL base del sitio
 * @returns {object} - Meta tags generados
 */
export const generateTagMetaTags = (tag, baseUrl = '') => {
  const tagUrl = `${baseUrl}/blog/tag/${tag.slug}`;
  
  const metaTitle = tag.seo?.metaTitle || `#${tag.name} - Blog Web Scuti`;
  const metaDescription = tag.seo?.metaDescription || 
    cleanText(tag.description || `Artículos etiquetados con ${tag.name}`, 160);
  
  return {
    title: metaTitle,
    description: metaDescription,
    canonical: tagUrl,
    robots: 'index, follow',
    openGraph: {
      type: 'website',
      url: tagUrl,
      title: metaTitle,
      description: metaDescription,
      siteName: 'Web Scuti'
    },
    twitter: {
      card: 'summary',
      title: metaTitle,
      description: metaDescription
    }
  };
};

/**
 * Generar meta tags para página principal del blog
 * @param {string} baseUrl - URL base del sitio
 * @returns {object} - Meta tags generados
 */
export const generateBlogHomeMetaTags = (baseUrl = '') => {
  return {
    title: 'Blog - Web Scuti | Artículos sobre Tecnología y Desarrollo',
    description: 'Descubre artículos, tutoriales y recursos sobre desarrollo web, diseño y tecnología en el blog de Web Scuti.',
    canonical: `${baseUrl}/blog`,
    robots: 'index, follow',
    openGraph: {
      type: 'website',
      url: `${baseUrl}/blog`,
      title: 'Blog - Web Scuti',
      description: 'Artículos sobre tecnología, desarrollo web y diseño',
      siteName: 'Web Scuti'
    },
    twitter: {
      card: 'summary',
      title: 'Blog - Web Scuti',
      description: 'Artículos sobre tecnología, desarrollo web y diseño'
    }
  };
};

/**
 * Validar y optimizar SEO de un post
 * @param {object} post - Objeto del post
 * @returns {object} - Resultados de la validación
 */
export const validatePostSEO = (post) => {
  const issues = [];
  const warnings = [];
  const suggestions = [];
  
  // Validar título
  if (!post.title || post.title.length < 10) {
    issues.push('El título es demasiado corto (mínimo 10 caracteres)');
  } else if (post.title.length > 70) {
    warnings.push('El título es muy largo (máximo recomendado 60-70 caracteres)');
  }
  
  // Validar meta description
  const metaDesc = post.seo?.metaDescription || post.excerpt;
  if (!metaDesc || metaDesc.length < 50) {
    issues.push('La meta descripción es demasiado corta (mínimo 50 caracteres)');
  } else if (metaDesc.length > 160) {
    warnings.push('La meta descripción es muy larga (máximo recomendado 160 caracteres)');
  }
  
  // Validar imagen destacada
  if (!post.featuredImage?.url) {
    warnings.push('No hay imagen destacada (recomendado para redes sociales)');
  }
  
  // Validar alt text de imagen
  if (post.featuredImage?.url && !post.featuredImage?.alt) {
    suggestions.push('Añadir texto alternativo (alt) a la imagen destacada');
  }
  
  // Validar keywords
  if (!post.seo?.keywords || post.seo.keywords.length === 0) {
    suggestions.push('Añadir palabras clave (keywords) para mejor indexación');
  } else if (post.seo.keywords.length > 10) {
    warnings.push('Demasiadas keywords (recomendado máximo 5-10)');
  }
  
  // Validar slug
  if (!post.slug || post.slug.length < 3) {
    issues.push('El slug es demasiado corto');
  } else if (post.slug.length > 100) {
    warnings.push('El slug es muy largo (máximo recomendado 50-75 caracteres)');
  }
  
  // Validar contenido
  if (!post.content || post.content.length < 300) {
    warnings.push('El contenido es muy corto (mínimo recomendado 300 caracteres)');
  }
  
  // Calcular score SEO
  const score = 100 - (issues.length * 20) - (warnings.length * 10) - (suggestions.length * 5);
  
  return {
    score: Math.max(0, score),
    issues,
    warnings,
    suggestions,
    isValid: issues.length === 0
  };
};

export default {
  generatePostMetaTags,
  generateMetaTagsHTML,
  generateCategoryMetaTags,
  generateTagMetaTags,
  generateBlogHomeMetaTags,
  validatePostSEO,
  cleanText
};
