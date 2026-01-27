/**
 * Utilidad para generar Schema.org (JSON-LD)
 * Schema markup para mejorar la visibilidad en buscadores
 */

/**
 * Generar Schema.org para un artículo de blog
 * @param {object} post - Objeto del post
 * @param {string} baseUrl - URL base del sitio
 * @returns {object} - Schema JSON-LD
 */
export const generateArticleSchema = (post, baseUrl = '') => {
  const postUrl = `${baseUrl}/blog/${post.slug}`;
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': postUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl
    },
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage?.url ? {
      '@type': 'ImageObject',
      url: post.featuredImage.url,
      width: 1200,
      height: 630,
      caption: post.featuredImage.alt || post.title
    } : undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt?.toISOString(),
    author: post.author ? {
      '@type': 'Person',
      name: `${post.author.firstName} ${post.author.lastName}`,
      email: post.author.email,
      url: `${baseUrl}/author/${post.author._id}`
    } : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'THADO Consulting',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/Logo.png`,
        width: 250,
        height: 60
      }
    },
    articleSection: post.category?.name,
    keywords: post.seo?.keywords?.join(', '),
    wordCount: post.content ? post.content.split(/\s+/).length : 0,
    timeRequired: `PT${post.readingTime || 1}M`,
    articleBody: post.excerpt,
    url: postUrl,
    isAccessibleForFree: true,
    inLanguage: 'es-ES'
  };
  
  // Añadir tags si existen
  if (post.tags && post.tags.length > 0) {
    schema.keywords = post.tags.map(tag => tag.name).join(', ');
  }
  
  // Añadir interacciones si existen
  if (post.analytics) {
    schema.interactionStatistic = [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ReadAction',
        userInteractionCount: post.analytics.views || 0
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: post.analytics.likes || 0
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ShareAction',
        userInteractionCount: (post.analytics.shares?.facebook || 0) + 
                             (post.analytics.shares?.twitter || 0) + 
                             (post.analytics.shares?.linkedin || 0)
      }
    ];
  }
  
  // Añadir FAQ si existe en aiOptimization
  if (post.aiOptimization?.faqItems && post.aiOptimization.faqItems.length > 0) {
    schema.mainEntity = {
      '@type': 'FAQPage',
      mainEntity: post.aiOptimization.faqItems.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    };
  }
  
  // Limpiar propiedades undefined
  Object.keys(schema).forEach(key => {
    if (schema[key] === undefined) {
      delete schema[key];
    }
  });
  
  return schema;
};

/**
 * Generar BreadcrumbList Schema
 * @param {object} post - Objeto del post
 * @param {string} baseUrl - URL base del sitio
 * @returns {object} - Schema JSON-LD de breadcrumb
 */
export const generateBreadcrumbSchema = (post, baseUrl = '') => {
  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Inicio',
      item: baseUrl
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Blog',
      item: `${baseUrl}/blog`
    }
  ];
  
  // Añadir categoría si existe
  if (post.category) {
    items.push({
      '@type': 'ListItem',
      position: 3,
      name: post.category.name,
      item: `${baseUrl}/blog/category/${post.category.slug}`
    });
  }
  
  // Añadir post actual
  items.push({
    '@type': 'ListItem',
    position: post.category ? 4 : 3,
    name: post.title,
    item: `${baseUrl}/blog/${post.slug}`
  });
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items
  };
};

/**
 * Generar Organization Schema (para la página principal del blog)
 * @param {string} baseUrl - URL base del sitio
 * @returns {object} - Schema JSON-LD de organización
 */
export const generateOrganizationSchema = (baseUrl = '') => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'THADO Consulting',
    url: baseUrl,
    logo: `${baseUrl}/Logo.png`,
    description: 'Consultoría contable, tributaria y de gestión empresarial',
    sameAs: [
      'https://facebook.com/thadoconsulting',
      'https://twitter.com/thadoconsulting',
      'https://linkedin.com/company/thadoconsulting',
      'https://instagram.com/thadoconsulting'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-xxx-xxx-xxxx',
      contactType: 'customer service',
      areaServed: 'ES',
      availableLanguage: ['Spanish', 'English']
    }
  };
};

/**
 * Generar WebSite Schema (para búsqueda interna)
 * @param {string} baseUrl - URL base del sitio
 * @returns {object} - Schema JSON-LD de sitio web
 */
export const generateWebSiteSchema = (baseUrl = '') => {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'THADO Consulting Blog',
    url: `${baseUrl}/blog`,
    description: 'Blog sobre contabilidad, tributación y gestión empresarial',
    publisher: {
      '@type': 'Organization',
      name: 'THADO Consulting',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/Logo.png`
      }
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/blog/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };
};

/**
 * Generar Blog Schema (para la lista de posts)
 * @param {string} baseUrl - URL base del sitio
 * @returns {object} - Schema JSON-LD de blog
 */
export const generateBlogSchema = (baseUrl = '') => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${baseUrl}/blog`,
    url: `${baseUrl}/blog`,
    name: 'THADO Consulting Blog',
    description: 'Artículos sobre contabilidad, tributación y gestión empresarial',
    publisher: {
      '@type': 'Organization',
      name: 'THADO Consulting',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/Logo.png`
      }
    },
    inLanguage: 'es-ES'
  };
};

/**
 * Generar ItemList Schema (para lista de posts)
 * @param {array} posts - Array de posts
 * @param {string} baseUrl - URL base del sitio
 * @returns {object} - Schema JSON-LD de lista de items
 */
export const generateItemListSchema = (posts, baseUrl = '') => {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: posts.map((post, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${baseUrl}/blog/${post.slug}`,
      name: post.title,
      image: post.featuredImage?.url
    }))
  };
};

/**
 * Generar CollectionPage Schema (para categoría)
 * @param {object} category - Objeto de categoría
 * @param {string} baseUrl - URL base del sitio
 * @returns {object} - Schema JSON-LD de página de colección
 */
export const generateCategorySchema = (category, baseUrl = '') => {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${baseUrl}/blog/category/${category.slug}`,
    url: `${baseUrl}/blog/category/${category.slug}`,
    name: category.name,
    description: category.description,
    isPartOf: {
      '@type': 'Blog',
      '@id': `${baseUrl}/blog`,
      name: 'Web Scuti Blog'
    },
    inLanguage: 'es-ES'
  };
};

/**
 * Generar Person Schema (para autor)
 * @param {object} author - Objeto de autor
 * @param {string} baseUrl - URL base del sitio
 * @returns {object} - Schema JSON-LD de persona
 */
export const generateAuthorSchema = (author, baseUrl = '') => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${baseUrl}/author/${author._id}`,
    name: `${author.firstName} ${author.lastName}`,
    email: author.email,
    url: `${baseUrl}/author/${author._id}`,
    jobTitle: author.role || 'Content Writer',
    worksFor: {
      '@type': 'Organization',
      name: 'Web Scuti'
    }
  };
};

/**
 * Generar múltiples schemas para una página de post
 * @param {object} post - Objeto del post
 * @param {string} baseUrl - URL base del sitio
 * @returns {array} - Array de schemas
 */
export const generatePostSchemas = (post, baseUrl = '') => {
  const schemas = [
    generateArticleSchema(post, baseUrl),
    generateBreadcrumbSchema(post, baseUrl)
  ];
  
  // Añadir schema de autor si existe
  if (post.author) {
    schemas.push(generateAuthorSchema(post.author, baseUrl));
  }
  
  return schemas;
};

/**
 * Convertir schema a string JSON-LD para insertar en HTML
 * @param {object|array} schema - Schema o array de schemas
 * @returns {string} - HTML script tag con JSON-LD
 */
export const schemaToScriptTag = (schema) => {
  if (Array.isArray(schema)) {
    return schema.map(s => 
      `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`
    ).join('\n');
  }
  
  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
};

/**
 * Generar todos los schemas necesarios para SEO completo
 * @param {object} data - Datos (post, category, etc)
 * @param {string} type - Tipo de página ('post', 'category', 'blog-home')
 * @param {string} baseUrl - URL base del sitio
 * @returns {string} - HTML con todos los scripts JSON-LD
 */
export const generateAllSchemas = (data, type, baseUrl = '') => {
  let schemas = [];
  
  switch (type) {
    case 'post':
      schemas = generatePostSchemas(data, baseUrl);
      break;
      
    case 'category':
      schemas = [generateCategorySchema(data, baseUrl)];
      break;
      
    case 'blog-home':
      schemas = [
        generateBlogSchema(baseUrl),
        generateWebSiteSchema(baseUrl),
        generateOrganizationSchema(baseUrl)
      ];
      break;
      
    case 'post-list':
      schemas = [
        generateItemListSchema(data.posts, baseUrl),
        generateBlogSchema(baseUrl)
      ];
      break;
      
    default:
      schemas = [];
  }
  
  return schemaToScriptTag(schemas);
};

export default {
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateBlogSchema,
  generateItemListSchema,
  generateCategorySchema,
  generateAuthorSchema,
  generatePostSchemas,
  schemaToScriptTag,
  generateAllSchemas
};
