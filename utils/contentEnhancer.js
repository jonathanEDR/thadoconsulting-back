/**
 * Content Enhancer - Mejoras automáticas de contenido
 * Auto-sugerencias de tags, keywords, optimizaciones SEO
 */

import { extractKeywords, extractEntities, extractTopics, analyzeReadability } from './semanticAnalyzer.js';

/**
 * Analizar y sugerir mejoras para un post
 * @param {object} post - Post del blog
 * @returns {object} - Sugerencias de mejora
 */
export const suggestImprovements = (post) => {
  const cleanContent = stripHtml(post.content);
  
  return {
    tags: suggestTags(post, cleanContent),
    keywords: suggestKeywords(cleanContent, post.seo?.focusKeyphrase),
    seo: suggestSEOImprovements(post),
    readability: suggestReadabilityImprovements(cleanContent),
    structure: suggestStructuralImprovements(post.content),
    engagement: suggestEngagementImprovements(post),
    score: calculateContentScore(post)
  };
};

/**
 * Sugerir tags automáticamente
 * @param {object} post - Post del blog
 * @param {string} cleanContent - Contenido limpio
 * @returns {object} - Tags sugeridos
 */
export const suggestTags = (post, cleanContent) => {
  const existingTags = post.tags?.map(t => t.name.toLowerCase()) || [];
  const suggestions = [];
  
  // Extraer keywords principales
  const keywords = extractKeywords(cleanContent, 15);
  
  // Extraer entidades
  const entities = extractEntities(cleanContent);
  
  // Extraer tópicos
  const topics = extractTopics(cleanContent);
  
  // Sugerir desde keywords (si no existen ya)
  keywords.slice(0, 5).forEach(kw => {
    if (!existingTags.includes(kw.word.toLowerCase())) {
      suggestions.push({
        tag: capitalizeFirst(kw.word),
        source: 'keyword',
        confidence: Math.min(kw.relevance * 10, 1),
        reason: `Aparece ${kw.frequency} veces en el contenido`
      });
    }
  });
  
  // Sugerir desde tecnologías
  entities.technologies.forEach(tech => {
    if (!existingTags.includes(tech.name.toLowerCase())) {
      suggestions.push({
        tag: capitalizeFirst(tech.name),
        source: 'technology',
        confidence: 0.9,
        reason: `Tecnología mencionada ${tech.occurrences} veces`
      });
    }
  });
  
  // Sugerir desde tópicos
  topics.slice(0, 3).forEach(topic => {
    const topicTag = topic.name.split('-').map(capitalizeFirst).join(' ');
    if (!existingTags.includes(topic.name)) {
      suggestions.push({
        tag: topicTag,
        source: 'topic',
        confidence: topic.confidence,
        reason: `Tópico principal del contenido (peso: ${topic.weight})`
      });
    }
  });
  
  // Ordenar por confianza y tomar top 10
  return {
    current: existingTags,
    suggested: suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10),
    optimal: existingTags.length >= 3 && existingTags.length <= 7,
    recommendation: existingTags.length < 3 ? 
      'Agrega al menos 3 tags para mejor SEO' : 
      existingTags.length > 7 ? 
      'Reduce a máximo 7 tags para evitar dilución' :
      'Cantidad de tags es óptima'
  };
};

/**
 * Sugerir keywords relacionadas
 * @param {string} cleanContent - Contenido limpio
 * @param {string} focusKeyphrase - Keyword principal actual
 * @returns {object} - Keywords sugeridas
 */
export const suggestKeywords = (cleanContent, focusKeyphrase = null) => {
  const keywords = extractKeywords(cleanContent, 20);
  const suggestions = [];
  
  // Keywords principales (long-tail)
  const longTailKeywords = keywords
    .filter(kw => kw.word.length > 6)
    .slice(0, 5)
    .map(kw => ({
      keyword: kw.word,
      type: 'long-tail',
      frequency: kw.frequency,
      density: ((kw.frequency / cleanContent.split(/\s+/).length) * 100).toFixed(2) + '%',
      recommendation: kw.frequency / cleanContent.split(/\s+/).length > 0.03 ?
        'Densidad alta - considerar reducir' :
        'Densidad óptima'
    }));
  
  suggestions.push(...longTailKeywords);
  
  // Si hay focus keyphrase, analizar su uso
  if (focusKeyphrase) {
    const focusCount = (cleanContent.toLowerCase().match(new RegExp(focusKeyphrase.toLowerCase(), 'g')) || []).length;
    const totalWords = cleanContent.split(/\s+/).length;
    const density = (focusCount / totalWords) * 100;
    
    suggestions.push({
      keyword: focusKeyphrase,
      type: 'focus',
      frequency: focusCount,
      density: density.toFixed(2) + '%',
      recommendation: focusCount === 0 ?
        '⚠️ La keyword principal no aparece en el contenido' :
        density > 3 ?
        '⚠️ Sobreoptimización - reducir densidad' :
        density < 0.5 ?
        '⚠️ Aparece muy poco - aumentar uso natural' :
        '✅ Densidad óptima (0.5-3%)'
    });
  }
  
  return {
    suggested: suggestions,
    focusKeyphrase: focusKeyphrase || keywords[0]?.word || 'No definida',
    totalUnique: keywords.length
  };
};

/**
 * Sugerir mejoras SEO
 * @param {object} post - Post del blog
 * @returns {object} - Mejoras SEO sugeridas
 */
export const suggestSEOImprovements = (post) => {
  const improvements = [];
  let score = 0;
  
  // Título
  const titleLength = post.title?.length || 0;
  if (!post.title) {
    improvements.push({
      field: 'title',
      priority: 'critical',
      issue: 'Título faltante',
      suggestion: 'Agrega un título descriptivo de 50-60 caracteres'
    });
  } else if (titleLength < 30) {
    improvements.push({
      field: 'title',
      priority: 'high',
      issue: `Título muy corto (${titleLength} caracteres)`,
      suggestion: 'Expande a 50-60 caracteres para mejor SEO'
    });
  } else if (titleLength > 60) {
    improvements.push({
      field: 'title',
      priority: 'medium',
      issue: `Título muy largo (${titleLength} caracteres)`,
      suggestion: 'Reduce a 50-60 caracteres para evitar truncamiento'
    });
  } else {
    score += 20;
  }
  
  // Excerpt/Meta Description
  const excerptLength = post.excerpt?.length || 0;
  if (!post.excerpt) {
    improvements.push({
      field: 'excerpt',
      priority: 'critical',
      issue: 'Meta descripción faltante',
      suggestion: 'Agrega un resumen de 150-160 caracteres'
    });
  } else if (excerptLength < 120) {
    improvements.push({
      field: 'excerpt',
      priority: 'high',
      issue: `Meta descripción muy corta (${excerptLength} caracteres)`,
      suggestion: 'Expande a 150-160 caracteres'
    });
  } else if (excerptLength > 160) {
    improvements.push({
      field: 'excerpt',
      priority: 'medium',
      issue: `Meta descripción muy larga (${excerptLength} caracteres)`,
      suggestion: 'Reduce a 150-160 caracteres'
    });
  } else {
    score += 20;
  }
  
  // Imagen destacada
  if (!post.featuredImage?.url) {
    improvements.push({
      field: 'featuredImage',
      priority: 'high',
      issue: 'Sin imagen destacada',
      suggestion: 'Agrega una imagen de 1200x630px para redes sociales'
    });
  } else {
    score += 15;
  }
  
  // Tags
  const tagCount = post.tags?.length || 0;
  if (tagCount === 0) {
    improvements.push({
      field: 'tags',
      priority: 'high',
      issue: 'Sin tags',
      suggestion: 'Agrega 3-7 tags relevantes'
    });
  } else if (tagCount < 3) {
    improvements.push({
      field: 'tags',
      priority: 'medium',
      issue: `Pocos tags (${tagCount})`,
      suggestion: 'Agrega al menos 3 tags para mejor categorización'
    });
  } else if (tagCount > 7) {
    improvements.push({
      field: 'tags',
      priority: 'low',
      issue: `Demasiados tags (${tagCount})`,
      suggestion: 'Reduce a 5-7 tags más relevantes'
    });
  } else {
    score += 15;
  }
  
  // Categoría
  if (!post.category) {
    improvements.push({
      field: 'category',
      priority: 'critical',
      issue: 'Sin categoría',
      suggestion: 'Asigna una categoría principal'
    });
  } else {
    score += 10;
  }
  
  // Contenido
  const wordCount = countWords(stripHtml(post.content));
  if (wordCount < 300) {
    improvements.push({
      field: 'content',
      priority: 'critical',
      issue: `Contenido muy corto (${wordCount} palabras)`,
      suggestion: 'Expande a mínimo 300 palabras para mejor ranking'
    });
  } else if (wordCount < 500) {
    improvements.push({
      field: 'content',
      priority: 'medium',
      issue: `Contenido corto (${wordCount} palabras)`,
      suggestion: 'Considera expandir a 800-1500 palabras'
    });
  } else if (wordCount > 3000) {
    improvements.push({
      field: 'content',
      priority: 'low',
      issue: `Contenido muy extenso (${wordCount} palabras)`,
      suggestion: 'Considera dividir en múltiples posts'
    });
  } else {
    score += 20;
  }
  
  return {
    score: Math.round(score),
    maxScore: 100,
    improvements,
    status: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor'
  };
};

/**
 * Sugerir mejoras de legibilidad
 * @param {string} cleanContent - Contenido limpio
 * @returns {object} - Mejoras de legibilidad
 */
export const suggestReadabilityImprovements = (cleanContent) => {
  const readability = analyzeReadability(cleanContent);
  const improvements = [];
  
  // Longitud de oraciones
  if (readability.avgSentenceLength > 25) {
    improvements.push({
      aspect: 'sentence-length',
      priority: 'high',
      issue: `Oraciones muy largas (promedio: ${readability.avgSentenceLength} palabras)`,
      suggestion: 'Divide oraciones largas para mejorar legibilidad'
    });
  }
  
  // Longitud de palabras
  if (readability.avgWordLength > 7) {
    improvements.push({
      aspect: 'word-complexity',
      priority: 'medium',
      issue: 'Vocabulario complejo',
      suggestion: 'Usa palabras más simples cuando sea posible'
    });
  }
  
  // Nivel de lectura
  if (readability.readingLevel === 'very-difficult' || readability.readingLevel === 'difficult') {
    improvements.push({
      aspect: 'reading-level',
      priority: 'medium',
      issue: `Nivel de lectura: ${readability.readingLevel}`,
      suggestion: 'Simplifica el lenguaje para alcanzar audiencia más amplia'
    });
  }
  
  return {
    current: readability,
    improvements,
    recommendation: improvements.length === 0 ?
      '✅ Legibilidad óptima' :
      `⚠️ ${improvements.length} aspecto(s) por mejorar`
  };
};

/**
 * Sugerir mejoras estructurales
 * @param {string} htmlContent - Contenido HTML
 * @returns {object} - Mejoras estructurales
 */
export const suggestStructuralImprovements = (htmlContent) => {
  const improvements = [];
  
  // Encabezados
  const hasH1 = /<h1[^>]*>/i.test(htmlContent);
  const hasH2 = /<h2[^>]*>/i.test(htmlContent);
  const h2Count = (htmlContent.match(/<h2[^>]*>/gi) || []).length;
  
  if (!hasH1) {
    improvements.push({
      element: 'h1',
      priority: 'high',
      issue: 'Sin encabezado H1',
      suggestion: 'Agrega un H1 principal (normalmente el título)'
    });
  }
  
  if (!hasH2) {
    improvements.push({
      element: 'h2',
      priority: 'medium',
      issue: 'Sin subencabezados H2',
      suggestion: 'Divide el contenido con encabezados H2'
    });
  } else if (h2Count < 2) {
    improvements.push({
      element: 'h2',
      priority: 'low',
      issue: 'Pocos subencabezados',
      suggestion: 'Agrega más H2 para mejor estructura'
    });
  }
  
  // Listas
  const hasList = /<(ul|ol)[^>]*>/i.test(htmlContent);
  if (!hasList) {
    improvements.push({
      element: 'lists',
      priority: 'low',
      issue: 'Sin listas',
      suggestion: 'Usa listas para información estructurada'
    });
  }
  
  // Imágenes
  const imageCount = (htmlContent.match(/<img[^>]*>/gi) || []).length;
  const wordCount = countWords(stripHtml(htmlContent));
  const imagesPerWords = imageCount / (wordCount / 300);
  
  if (imageCount === 0 && wordCount > 500) {
    improvements.push({
      element: 'images',
      priority: 'medium',
      issue: 'Sin imágenes',
      suggestion: 'Agrega imágenes para romper texto (1 cada 300-500 palabras)'
    });
  } else if (imagesPerWords < 0.5 && wordCount > 1000) {
    improvements.push({
      element: 'images',
      priority: 'low',
      issue: 'Pocas imágenes para el contenido',
      suggestion: 'Considera agregar más imágenes ilustrativas'
    });
  }
  
  // Enlaces
  const linkCount = (htmlContent.match(/<a[^>]*href/gi) || []).length;
  if (linkCount === 0) {
    improvements.push({
      element: 'links',
      priority: 'low',
      issue: 'Sin enlaces',
      suggestion: 'Agrega enlaces a recursos relevantes'
    });
  }
  
  // Párrafos
  const paragraphs = stripHtml(htmlContent).split(/\n\n+/);
  const longParagraphs = paragraphs.filter(p => countWords(p) > 150).length;
  
  if (longParagraphs > paragraphs.length * 0.3) {
    improvements.push({
      element: 'paragraphs',
      priority: 'medium',
      issue: 'Párrafos muy largos',
      suggestion: 'Divide párrafos largos (máximo 100-150 palabras)'
    });
  }
  
  return {
    improvements,
    score: Math.max(0, 100 - (improvements.length * 10)),
    status: improvements.length === 0 ? 'excellent' :
            improvements.length <= 2 ? 'good' :
            improvements.length <= 4 ? 'fair' : 'poor'
  };
};

/**
 * Sugerir mejoras de engagement
 * @param {object} post - Post del blog
 * @returns {object} - Mejoras de engagement
 */
export const suggestEngagementImprovements = (post) => {
  const improvements = [];
  
  // Call to action
  const hasCtA = /descargar|registr|suscrib|compartir|comentar|contactar/i.test(post.content);
  if (!hasCtA) {
    improvements.push({
      aspect: 'call-to-action',
      priority: 'medium',
      issue: 'Sin call-to-action visible',
      suggestion: 'Agrega un CTA al final (comentarios, suscripción, etc.)'
    });
  }
  
  // Comentarios
  if (post.allowComments === false) {
    improvements.push({
      aspect: 'comments',
      priority: 'low',
      issue: 'Comentarios deshabilitados',
      suggestion: 'Habilita comentarios para fomentar interacción'
    });
  }
  
  // Social sharing
  const hasSocialMention = /compartir|síguenos|redes sociales/i.test(post.content);
  if (!hasSocialMention) {
    improvements.push({
      aspect: 'social-sharing',
      priority: 'low',
      issue: 'Sin mención a redes sociales',
      suggestion: 'Invita a compartir en redes sociales'
    });
  }
  
  // Tiempo de lectura
  if (!post.readingTime || post.readingTime > 15) {
    improvements.push({
      aspect: 'reading-time',
      priority: 'low',
      issue: 'Contenido muy extenso',
      suggestion: 'Considera dividir en serie de posts más cortos'
    });
  }
  
  return {
    improvements,
    score: Math.max(0, 100 - (improvements.length * 15)),
    recommendation: improvements.length === 0 ?
      '✅ Optimizado para engagement' :
      `⚠️ ${improvements.length} oportunidad(es) de mejora`
  };
};

/**
 * Calcular score global del contenido
 * @param {object} post - Post del blog
 * @returns {object} - Score detallado
 */
export const calculateContentScore = (post) => {
  const seo = suggestSEOImprovements(post);
  const cleanContent = stripHtml(post.content);
  const readability = suggestReadabilityImprovements(cleanContent);
  const structure = suggestStructuralImprovements(post.content);
  const engagement = suggestEngagementImprovements(post);
  
  const weights = {
    seo: 0.35,
    readability: 0.25,
    structure: 0.25,
    engagement: 0.15
  };
  
  const totalScore = Math.round(
    (seo.score * weights.seo) +
    (100 - (readability.improvements.length * 10)) * weights.readability +
    (structure.score * weights.structure) +
    (engagement.score * weights.engagement)
  );
  
  return {
    total: totalScore,
    breakdown: {
      seo: seo.score,
      readability: 100 - (readability.improvements.length * 10),
      structure: structure.score,
      engagement: engagement.score
    },
    grade: totalScore >= 90 ? 'A+' :
           totalScore >= 80 ? 'A' :
           totalScore >= 70 ? 'B' :
           totalScore >= 60 ? 'C' :
           totalScore >= 50 ? 'D' : 'F',
    status: totalScore >= 80 ? 'excellent' :
            totalScore >= 60 ? 'good' :
            totalScore >= 40 ? 'fair' : 'needs-work'
  };
};

/**
 * Capitalizar primera letra
 */
const capitalizeFirst = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Contar palabras
 */
const countWords = (text) => {
  return text.split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Limpiar HTML
 */
const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
};

export default {
  suggestImprovements,
  suggestTags,
  suggestKeywords,
  suggestSEOImprovements,
  suggestReadabilityImprovements,
  suggestStructuralImprovements,
  suggestEngagementImprovements,
  calculateContentScore
};
