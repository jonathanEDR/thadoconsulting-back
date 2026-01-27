/**
 * Generador de contenido AI-friendly
 * Formatos optimizados para LLMs y motores de búsqueda AI
 */

/**
 * Generar formato FAQ (Preguntas Frecuentes) Schema.org
 * @param {Array} faqs - Array de {question, answer}
 * @param {string} baseUrl - URL base del sitio
 * @returns {object} - Schema.org FAQPage
 */
export const generateFAQSchema = (faqs, baseUrl = '') => {
  if (!faqs || faqs.length === 0) return null;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
};

/**
 * Generar formato HowTo Schema.org
 * @param {object} howTo - {name, description, steps, totalTime, tools, supplies}
 * @param {string} baseUrl - URL base del sitio
 * @returns {object} - Schema.org HowTo
 */
export const generateHowToSchema = (howTo, baseUrl = '') => {
  if (!howTo || !howTo.steps || howTo.steps.length === 0) return null;
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: howTo.name,
    description: howTo.description
  };
  
  // Total time
  if (howTo.totalTime) {
    schema.totalTime = howTo.totalTime; // e.g., "PT30M" (30 minutos)
  }
  
  // Tools needed
  if (howTo.tools && howTo.tools.length > 0) {
    schema.tool = howTo.tools.map(tool => ({
      '@type': 'HowToTool',
      name: tool
    }));
  }
  
  // Supplies needed
  if (howTo.supplies && howTo.supplies.length > 0) {
    schema.supply = howTo.supplies.map(supply => ({
      '@type': 'HowToSupply',
      name: supply
    }));
  }
  
  // Steps
  schema.step = howTo.steps.map((step, index) => ({
    '@type': 'HowToStep',
    position: index + 1,
    name: step.name,
    text: step.text,
    image: step.image || undefined,
    url: step.url || undefined
  }));
  
  return schema;
};

/**
 * Generar formato conversacional (para LLMs)
 * @param {object} post - Post del blog
 * @returns {object} - Formato conversacional estructurado
 */
export const generateConversationalFormat = (post) => {
  if (!post) return null;
  
  return {
    format: 'conversational',
    context: {
      topic: post.title,
      category: post.category?.name || 'General',
      tags: post.tags?.map(t => t.name) || [],
      publishDate: post.publishedAt,
      author: post.author ? `${post.author.firstName} ${post.author.lastName}` : 'Web Scuti Team'
    },
    content: {
      summary: post.excerpt,
      mainPoints: extractMainPoints(post.content),
      fullText: stripHtml(post.content),
      keyTakeaways: extractKeyTakeaways(post.content)
    },
    metadata: {
      readingTime: post.readingTime,
      wordCount: countWords(post.content),
      language: 'es-ES',
      tone: 'professional',
      targetAudience: post.category?.name || 'general'
    },
    qaFormat: generateQAFromContent(post),
    relatedTopics: post.tags?.map(t => t.name) || []
  };
};

/**
 * Generar formato Q&A desde contenido
 * @param {object} post - Post del blog
 * @returns {Array} - Array de {question, answer}
 */
export const generateQAFromContent = (post) => {
  const qa = [];
  
  // Q1: ¿Qué es...?
  qa.push({
    question: `¿Qué es ${post.title}?`,
    answer: post.excerpt || stripHtml(post.content).substring(0, 300),
    confidence: 'high'
  });
  
  // Q2: Tema principal
  if (post.category) {
    qa.push({
      question: `¿Sobre qué trata este artículo?`,
      answer: `Este artículo trata sobre ${post.category.name}, específicamente sobre ${post.title}. ${post.excerpt}`,
      confidence: 'high'
    });
  }
  
  // Q3: Beneficios/Aplicaciones
  qa.push({
    question: `¿Cuáles son los puntos clave sobre ${post.title}?`,
    answer: extractMainPoints(post.content).join('. '),
    confidence: 'medium'
  });
  
  // Q4: Tags relacionados
  if (post.tags && post.tags.length > 0) {
    qa.push({
      question: `¿Qué temas están relacionados con ${post.title}?`,
      answer: `Los temas relacionados incluyen: ${post.tags.map(t => t.name).join(', ')}.`,
      confidence: 'high'
    });
  }
  
  return qa;
};

/**
 * Generar formato JSON-LD extendido para AI
 * @param {object} post - Post del blog
 * @param {string} baseUrl - URL base del sitio
 * @returns {object} - JSON-LD extendido con campos AI
 */
export const generateExtendedJSONLD = (post, baseUrl = '') => {
  const postUrl = `${baseUrl}/blog/${post.slug}`;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': postUrl,
    
    // Campos estándar
    headline: post.title,
    description: post.excerpt,
    articleBody: stripHtml(post.content),
    url: postUrl,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    
    // Autor
    author: post.author ? {
      '@type': 'Person',
      name: `${post.author.firstName} ${post.author.lastName}`,
      email: post.author.email
    } : undefined,
    
    // Imagen
    image: post.featuredImage?.url ? {
      '@type': 'ImageObject',
      url: post.featuredImage.url,
      width: post.featuredImage.width,
      height: post.featuredImage.height
    } : undefined,
    
    // Publisher
    publisher: {
      '@type': 'Organization',
      name: 'THADO Consulting',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/Logo.png`
      }
    },
    
    // Campos extendidos para AI
    keywords: post.tags?.map(t => t.name).join(', '),
    
    about: post.tags?.map(tag => ({
      '@type': 'Thing',
      name: tag.name
    })) || [],
    
    // Métricas de engagement
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ViewAction',
        userInteractionCount: post.views || 0
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: post.likes || 0
      }
    ],
    
    // Categoría
    articleSection: post.category?.name,
    
    // Tiempo de lectura
    timeRequired: `PT${post.readingTime || 5}M`,
    
    // Palabras clave semánticas (para AI)
    additionalProperty: {
      '@type': 'PropertyValue',
      name: 'semanticKeywords',
      value: extractSemanticKeywords(post.content, post.tags)
    },
    
    // Puntos principales (para AI)
    mainEntity: extractMainPoints(post.content).map((point, index) => ({
      '@type': 'Thing',
      '@id': `${postUrl}#point-${index + 1}`,
      name: point
    }))
  };
};

/**
 * Generar metadata para LLMs
 * @param {object} post - Post del blog
 * @returns {object} - Metadata estructurada para AI
 */
export const generateLLMMetadata = (post) => {
  const content = stripHtml(post.content);
  
  return {
    title: post.title,
    summary: post.excerpt || content.substring(0, 300),
    
    keyPoints: extractMainPoints(post.content),
    
    facts: extractFacts(content),
    
    entities: {
      topics: post.tags?.map(t => t.name) || [],
      category: post.category?.name || 'General',
      author: post.author ? `${post.author.firstName} ${post.author.lastName}` : 'Unknown'
    },
    
    context: {
      language: 'es-ES',
      domain: 'technology',
      publishDate: post.publishedAt,
      lastUpdate: post.updatedAt,
      readingLevel: estimateReadingLevel(content),
      tone: estimateTone(content)
    },
    
    stats: {
      wordCount: countWords(content),
      readingTime: post.readingTime,
      paragraphs: countParagraphs(content),
      sentences: countSentences(content)
    },
    
    engagement: {
      views: post.views || 0,
      likes: post.likes || 0,
      bookmarks: post.bookmarks || 0
    },
    
    seo: {
      focusKeyphrase: post.seo?.focusKeyphrase,
      metaDescription: post.seo?.metaDescription,
      score: post.aiOptimization?.seoScore || 0
    }
  };
};

/**
 * Generar formato Markdown limpio (para AI/RAG)
 * @param {object} post - Post del blog
 * @returns {string} - Markdown estructurado
 */
export const generateMarkdownFormat = (post) => {
  let markdown = '';
  
  // Título
  markdown += `# ${post.title}\n\n`;
  
  // Metadata
  markdown += `---\n`;
  markdown += `**Autor:** ${post.author ? `${post.author.firstName} ${post.author.lastName}` : 'Web Scuti Team'}\n`;
  markdown += `**Categoría:** ${post.category?.name || 'General'}\n`;
  markdown += `**Tags:** ${post.tags?.map(t => t.name).join(', ') || 'N/A'}\n`;
  markdown += `**Fecha:** ${new Date(post.publishedAt).toLocaleDateString('es-ES')}\n`;
  markdown += `**Tiempo de lectura:** ${post.readingTime} min\n`;
  markdown += `---\n\n`;
  
  // Resumen
  if (post.excerpt) {
    markdown += `## Resumen\n\n${post.excerpt}\n\n`;
  }
  
  // Contenido
  markdown += `## Contenido\n\n`;
  markdown += convertHtmlToMarkdown(post.content);
  markdown += `\n\n`;
  
  // Puntos clave
  const keyPoints = extractMainPoints(post.content);
  if (keyPoints.length > 0) {
    markdown += `## Puntos Clave\n\n`;
    keyPoints.forEach((point, index) => {
      markdown += `${index + 1}. ${point}\n`;
    });
    markdown += `\n`;
  }
  
  // Tags
  if (post.tags && post.tags.length > 0) {
    markdown += `## Temas Relacionados\n\n`;
    post.tags.forEach(tag => {
      markdown += `- ${tag.name}\n`;
    });
  }
  
  return markdown;
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Extraer puntos principales del contenido
 */
const extractMainPoints = (htmlContent) => {
  if (!htmlContent) return [];
  
  const points = [];
  
  // Buscar listas (ul, ol)
  const listMatches = htmlContent.match(/<li[^>]*>(.*?)<\/li>/gi);
  if (listMatches) {
    listMatches.slice(0, 5).forEach(li => {
      const text = stripHtml(li).trim();
      if (text.length > 20 && text.length < 200) {
        points.push(text);
      }
    });
  }
  
  // Buscar encabezados H2, H3
  const headingMatches = htmlContent.match(/<h[23][^>]*>(.*?)<\/h[23]>/gi);
  if (headingMatches) {
    headingMatches.slice(0, 5).forEach(heading => {
      const text = stripHtml(heading).trim();
      if (text.length > 10 && text.length < 100) {
        points.push(text);
      }
    });
  }
  
  // Si no hay suficientes puntos, extraer primeras oraciones
  if (points.length < 3) {
    const text = stripHtml(htmlContent);
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    sentences.slice(0, 5).forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 30 && trimmed.length < 200) {
        points.push(trimmed);
      }
    });
  }
  
  return points.slice(0, 7); // Máximo 7 puntos
};

/**
 * Extraer conclusiones clave
 */
const extractKeyTakeaways = (htmlContent) => {
  const text = stripHtml(htmlContent);
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  // Buscar oraciones con palabras clave de conclusión
  const conclusionKeywords = ['conclusión', 'resumen', 'importante', 'clave', 'esencial', 'fundamental'];
  
  const takeaways = sentences.filter(sentence => {
    const lowerSentence = sentence.toLowerCase();
    return conclusionKeywords.some(keyword => lowerSentence.includes(keyword));
  }).slice(0, 3);
  
  if (takeaways.length === 0) {
    // Si no hay conclusiones explícitas, tomar últimas oraciones importantes
    return sentences.slice(-3).map(s => s.trim());
  }
  
  return takeaways.map(s => s.trim());
};

/**
 * Extraer hechos/datos del contenido
 */
const extractFacts = (text) => {
  const facts = [];
  
  // Buscar números con contexto
  const numberMatches = text.match(/\d+%|\d+\s*(años|meses|días|usuarios|empresas|millones|mil)/gi);
  if (numberMatches) {
    numberMatches.slice(0, 5).forEach(match => {
      facts.push({ type: 'statistic', value: match });
    });
  }
  
  // Buscar fechas
  const dateMatches = text.match(/\d{4}|\d{1,2}\s*de\s*\w+\s*de\s*\d{4}/gi);
  if (dateMatches) {
    dateMatches.slice(0, 3).forEach(match => {
      facts.push({ type: 'date', value: match });
    });
  }
  
  return facts;
};

/**
 * Extraer keywords semánticas
 */
const extractSemanticKeywords = (htmlContent, tags) => {
  const text = stripHtml(htmlContent).toLowerCase();
  const keywords = [];
  
  // Keywords de tags
  if (tags) {
    tags.forEach(tag => {
      keywords.push(tag.name.toLowerCase());
    });
  }
  
  // Palabras técnicas comunes (ejemplo para tech blog)
  const techKeywords = [
    'desarrollo', 'web', 'aplicación', 'software', 'código',
    'programación', 'diseño', 'api', 'base de datos', 'servidor',
    'frontend', 'backend', 'usuario', 'interfaz', 'sistema'
  ];
  
  techKeywords.forEach(keyword => {
    if (text.includes(keyword) && !keywords.includes(keyword)) {
      keywords.push(keyword);
    }
  });
  
  return keywords.join(', ');
};

/**
 * Estimar nivel de lectura
 */
const estimateReadingLevel = (text) => {
  const avgWordLength = text.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / text.split(/\s+/).length;
  
  if (avgWordLength < 5) return 'basic';
  if (avgWordLength < 6.5) return 'intermediate';
  return 'advanced';
};

/**
 * Estimar tono del contenido
 */
const estimateTone = (text) => {
  const lowerText = text.toLowerCase();
  
  const formalWords = ['consecuentemente', 'adicionalmente', 'por consiguiente', 'mediante'];
  const casualWords = ['bueno', 'genial', 'increíble', 'fácil'];
  
  const formalCount = formalWords.filter(word => lowerText.includes(word)).length;
  const casualCount = casualWords.filter(word => lowerText.includes(word)).length;
  
  if (formalCount > casualCount) return 'formal';
  if (casualCount > formalCount) return 'casual';
  return 'neutral';
};

/**
 * Contar palabras
 */
const countWords = (text) => {
  return stripHtml(text).split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Contar párrafos
 */
const countParagraphs = (text) => {
  return (stripHtml(text).match(/\n\n+/g) || []).length + 1;
};

/**
 * Contar oraciones
 */
const countSentences = (text) => {
  return (stripHtml(text).match(/[.!?]+/g) || []).length;
};

/**
 * Limpiar HTML
 */
const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
};

/**
 * Convertir HTML a Markdown simple
 */
const convertHtmlToMarkdown = (html) => {
  if (!html) return '';
  
  let markdown = html;
  
  // Encabezados
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  
  // Negrita y cursiva
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  
  // Enlaces
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Listas
  markdown = markdown.replace(/<ul[^>]*>/gi, '\n');
  markdown = markdown.replace(/<\/ul>/gi, '\n');
  markdown = markdown.replace(/<ol[^>]*>/gi, '\n');
  markdown = markdown.replace(/<\/ol>/gi, '\n');
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  
  // Párrafos
  markdown = markdown.replace(/<p[^>]*>/gi, '');
  markdown = markdown.replace(/<\/p>/gi, '\n\n');
  
  // Breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
  
  // Código
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '\n```\n$1\n```\n');
  
  // Limpiar tags restantes
  markdown = markdown.replace(/<[^>]+>/g, '');
  
  // Limpiar entidades HTML
  markdown = markdown.replace(/&nbsp;/g, ' ');
  markdown = markdown.replace(/&amp;/g, '&');
  markdown = markdown.replace(/&lt;/g, '<');
  markdown = markdown.replace(/&gt;/g, '>');
  markdown = markdown.replace(/&quot;/g, '"');
  
  // Limpiar espacios múltiples
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  markdown = markdown.replace(/  +/g, ' ');
  
  return markdown.trim();
};

export default {
  generateFAQSchema,
  generateHowToSchema,
  generateConversationalFormat,
  generateQAFromContent,
  generateExtendedJSONLD,
  generateLLMMetadata,
  generateMarkdownFormat
};
