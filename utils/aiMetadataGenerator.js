/**
 * Generador de Metadata para LLMs y Agentes IA
 * Optimización de contenido para descubrimiento por IA
 */

import { extractKeywords, extractEntities, extractTopics, analyzeReadability } from './semanticAnalyzer.js';

/**
 * Generar metadata completa para IA
 * @param {object} post - Post del blog
 * @param {object} analysis - Análisis semántico previo (opcional)
 * @returns {object} - Metadata AI estructurada
 */
export const generateAIMetadata = (post, analysis = null) => {
  const cleanContent = stripHtml(post.content);
  
  // Si no hay análisis previo, generarlo
  if (!analysis) {
    analysis = {
      keywords: extractKeywords(cleanContent, 15),
      entities: extractEntities(cleanContent),
      topics: extractTopics(cleanContent),
      readability: analyzeReadability(cleanContent)
    };
  }
  
  return {
    // Identificación
    id: post._id?.toString() || post.slug,
    slug: post.slug,
    url: `https://web-scuti.com/blog/${post.slug}`,
    
    // Contenido básico
    title: post.title,
    summary: generateSummary(post),
    excerpt: post.excerpt,
    
    // Keywords y tópicos
    primaryKeywords: analysis.keywords.slice(0, 5).map(k => k.word),
    secondaryKeywords: analysis.keywords.slice(5, 15).map(k => k.word),
    topics: analysis.topics.map(t => t.name),
    
    // Entidades
    entities: {
      technologies: analysis.entities.technologies.map(t => t.name),
      concepts: analysis.entities.concepts.map(c => c.name),
      mentioned: extractMentionedItems(cleanContent)
    },
    
    // Contexto
    context: {
      category: post.category?.name || 'General',
      tags: post.tags?.map(t => t.name) || [],
      author: post.author ? `${post.author.firstName} ${post.author.lastName}` : 'Web Scuti Team',
      publishDate: post.publishedAt,
      lastModified: post.updatedAt,
      language: 'es-ES',
      domain: 'technology'
    },
    
    // Características del contenido
    contentFeatures: {
      wordCount: countWords(cleanContent),
      readingTime: post.readingTime,
      readingLevel: analysis.readability?.readingLevel || 'intermediate',
      hasCode: post.content.includes('<code>') || post.content.includes('<pre>'),
      hasImages: post.featuredImage?.url ? true : false,
      hasList: post.content.includes('<ul>') || post.content.includes('<ol>'),
      tone: estimateTone(cleanContent),
      format: determineContentFormat(post.content)
    },
    
    // Puntos clave (para resumen rápido de IA)
    keyPoints: extractKeyPoints(post.content),
    
    // Preguntas que responde este contenido
    answersQuestions: generateAnsweredQuestions(post),
    
    // Audiencia objetivo
    targetAudience: determineAudience(post, analysis),
    
    // Nivel de expertise requerido
    expertiseLevel: determineExpertiseLevel(analysis),
    
    // Métricas de engagement
    engagement: {
      views: post.views || 0,
      likes: post.likes || 0,
      bookmarks: post.bookmarks || 0,
      shares: post.shares || 0
    },
    
    // SEO y optimización
    seo: {
      score: calculateSEOScore(post),
      focusKeyphrase: post.seo?.focusKeyphrase,
      isOptimized: post.aiOptimization?.isOptimized || false
    },
    
    // Para sistemas RAG (Retrieval Augmented Generation)
    ragOptimized: {
      chunkSize: Math.ceil(cleanContent.length / 1000),
      hasStructure: post.content.includes('<h2>') || post.content.includes('<h3>'),
      citations: extractCitations(post.content),
      references: extractReferences(post.content)
    },
    
    // Timestamp de generación
    generatedAt: new Date().toISOString()
  };
};

/**
 * Generar resumen inteligente
 * @param {object} post - Post del blog
 * @returns {string} - Resumen optimizado para IA
 */
export const generateSummary = (post) => {
  if (post.excerpt) return post.excerpt;
  
  const cleanContent = stripHtml(post.content);
  
  // Tomar primeras 2-3 oraciones
  const sentences = cleanContent.match(/[^.!?]+[.!?]+/g) || [];
  const summary = sentences.slice(0, 3).join(' ').trim();
  
  // Limitar a 300 caracteres
  if (summary.length > 300) {
    return summary.substring(0, 297) + '...';
  }
  
  return summary;
};

/**
 * Extraer puntos clave del contenido
 * @param {string} htmlContent - Contenido HTML
 * @returns {Array} - Array de puntos clave
 */
export const extractKeyPoints = (htmlContent) => {
  const points = [];
  
  // 1. Encabezados principales
  const headings = htmlContent.match(/<h[23][^>]*>(.*?)<\/h[23]>/gi) || [];
  headings.slice(0, 5).forEach(heading => {
    const text = stripHtml(heading).trim();
    if (text.length > 10 && text.length < 150) {
      points.push({
        type: 'heading',
        text,
        importance: 'high'
      });
    }
  });
  
  // 2. Items de listas
  const listItems = htmlContent.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
  listItems.slice(0, 7).forEach(item => {
    const text = stripHtml(item).trim();
    if (text.length > 15 && text.length < 200) {
      points.push({
        type: 'list-item',
        text,
        importance: 'medium'
      });
    }
  });
  
  // 3. Texto en negrita (probablemente importante)
  const boldTexts = htmlContent.match(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi) || [];
  boldTexts.slice(0, 5).forEach(bold => {
    const text = stripHtml(bold).trim();
    if (text.length > 10 && text.length < 100) {
      points.push({
        type: 'emphasis',
        text,
        importance: 'medium'
      });
    }
  });
  
  return points.slice(0, 10); // Máximo 10 puntos
};

/**
 * Generar preguntas que responde el contenido
 * @param {object} post - Post del blog
 * @returns {Array} - Array de preguntas
 */
export const generateAnsweredQuestions = (post) => {
  const questions = [];
  
  // Pregunta básica sobre el tema
  questions.push({
    question: `¿Qué es ${post.title}?`,
    confidence: 'high',
    type: 'definition'
  });
  
  // Pregunta sobre categoría
  if (post.category) {
    questions.push({
      question: `¿Cómo se relaciona ${post.title} con ${post.category.name}?`,
      confidence: 'high',
      type: 'relationship'
    });
  }
  
  // Preguntas sobre temas específicos
  if (post.tags && post.tags.length > 0) {
    post.tags.slice(0, 3).forEach(tag => {
      questions.push({
        question: `¿Qué necesito saber sobre ${tag.name}?`,
        confidence: 'medium',
        type: 'knowledge'
      });
    });
  }
  
  // Pregunta práctica
  const cleanContent = stripHtml(post.content).toLowerCase();
  if (cleanContent.includes('cómo') || cleanContent.includes('paso') || cleanContent.includes('tutorial')) {
    questions.push({
      question: `¿Cómo implementar ${post.title}?`,
      confidence: 'high',
      type: 'how-to'
    });
  }
  
  // Pregunta sobre beneficios
  if (cleanContent.includes('beneficio') || cleanContent.includes('ventaja') || cleanContent.includes('mejor')) {
    questions.push({
      question: `¿Cuáles son los beneficios de ${post.title}?`,
      confidence: 'medium',
      type: 'benefits'
    });
  }
  
  return questions;
};

/**
 * Determinar audiencia objetivo
 * @param {object} post - Post del blog
 * @param {object} analysis - Análisis semántico
 * @returns {object} - Descripción de audiencia
 */
export const determineAudience = (post, analysis) => {
  const audience = {
    primary: 'developers',
    secondary: [],
    characteristics: []
  };
  
  // Basado en categoría
  const category = post.category?.name?.toLowerCase() || '';
  if (category.includes('diseño')) {
    audience.primary = 'designers';
    audience.secondary.push('developers');
  } else if (category.includes('negocio') || category.includes('marketing')) {
    audience.primary = 'business-professionals';
    audience.secondary.push('entrepreneurs');
  }
  
  // Basado en nivel de lectura
  const readingLevel = analysis.readability?.readingLevel;
  if (readingLevel === 'very-easy' || readingLevel === 'easy') {
    audience.characteristics.push('beginners');
  } else if (readingLevel === 'difficult' || readingLevel === 'very-difficult') {
    audience.characteristics.push('advanced-users');
  } else {
    audience.characteristics.push('intermediate-users');
  }
  
  // Basado en tecnologías mencionadas
  const hasTech = analysis.entities?.technologies?.length > 0;
  if (hasTech) {
    audience.characteristics.push('technical-audience');
  }
  
  return audience;
};

/**
 * Determinar nivel de expertise requerido
 * @param {object} analysis - Análisis semántico
 * @returns {string} - Nivel: beginner, intermediate, advanced, expert
 */
export const determineExpertiseLevel = (analysis) => {
  let score = 0;
  
  // Basado en lectura
  const readingLevel = analysis.readability?.readingLevel;
  if (readingLevel === 'very-easy' || readingLevel === 'easy') score += 1;
  else if (readingLevel === 'intermediate' || readingLevel === 'fairly-easy') score += 2;
  else score += 3;
  
  // Basado en tecnologías mencionadas
  const techCount = analysis.entities?.technologies?.length || 0;
  if (techCount > 5) score += 1;
  
  // Basado en keywords técnicas
  const technicalKeywords = analysis.keywords?.filter(k => 
    k.word.length > 8 || ['api', 'backend', 'frontend', 'database'].includes(k.word)
  ).length || 0;
  
  if (technicalKeywords > 5) score += 1;
  
  if (score <= 2) return 'beginner';
  if (score <= 4) return 'intermediate';
  if (score <= 6) return 'advanced';
  return 'expert';
};

/**
 * Determinar formato del contenido
 * @param {string} htmlContent - Contenido HTML
 * @returns {string} - Formato: tutorial, guide, article, reference, opinion
 */
export const determineContentFormat = (htmlContent) => {
  const cleanContent = stripHtml(htmlContent).toLowerCase();
  
  // Tutorial
  if (cleanContent.includes('paso') || cleanContent.includes('tutorial') || 
      htmlContent.match(/<ol[^>]*>/gi)) {
    return 'tutorial';
  }
  
  // Guía
  if (cleanContent.includes('guía') || cleanContent.includes('cómo')) {
    return 'guide';
  }
  
  // Referencia
  if (cleanContent.includes('referencia') || cleanContent.includes('documentación')) {
    return 'reference';
  }
  
  // Opinión
  if (cleanContent.includes('creo que') || cleanContent.includes('en mi opinión')) {
    return 'opinion';
  }
  
  // Por defecto
  return 'article';
};

/**
 * Estimar tono del contenido
 * @param {string} text - Texto limpio
 * @returns {string} - Tono: formal, professional, casual, technical
 */
export const estimateTone = (text) => {
  const lowerText = text.toLowerCase();
  
  const formalWords = ['consecuentemente', 'adicionalmente', 'por consiguiente', 'mediante', 'respectivamente'];
  const casualWords = ['genial', 'increíble', 'súper', 'fácil', 'simple'];
  const technicalWords = ['implementación', 'configuración', 'algoritmo', 'arquitectura', 'infraestructura'];
  
  const formalCount = formalWords.filter(w => lowerText.includes(w)).length;
  const casualCount = casualWords.filter(w => lowerText.includes(w)).length;
  const technicalCount = technicalWords.filter(w => lowerText.includes(w)).length;
  
  if (technicalCount >= 3) return 'technical';
  if (formalCount > casualCount) return 'formal';
  if (casualCount > formalCount) return 'casual';
  return 'professional';
};

/**
 * Calcular score SEO simple
 * @param {object} post - Post del blog
 * @returns {number} - Score 0-100
 */
export const calculateSEOScore = (post) => {
  let score = 0;
  
  // Título (20 puntos)
  if (post.title && post.title.length >= 30 && post.title.length <= 60) score += 20;
  else if (post.title) score += 10;
  
  // Excerpt (20 puntos)
  if (post.excerpt && post.excerpt.length >= 120 && post.excerpt.length <= 160) score += 20;
  else if (post.excerpt) score += 10;
  
  // Imagen destacada (15 puntos)
  if (post.featuredImage?.url) score += 15;
  
  // Categoría (10 puntos)
  if (post.category) score += 10;
  
  // Tags (15 puntos)
  if (post.tags && post.tags.length >= 3 && post.tags.length <= 7) score += 15;
  else if (post.tags && post.tags.length > 0) score += 7;
  
  // Contenido (20 puntos)
  const wordCount = countWords(stripHtml(post.content));
  if (wordCount >= 300 && wordCount <= 2000) score += 20;
  else if (wordCount >= 200) score += 10;
  
  return score;
};

/**
 * Extraer items mencionados en el contenido
 * @param {string} text - Texto limpio
 * @returns {Array} - Array de items mencionados
 */
export const extractMentionedItems = (text) => {
  const items = [];
  
  // URLs mencionadas
  const urls = text.match(/https?:\/\/[^\s]+/gi) || [];
  urls.forEach(url => {
    items.push({ type: 'url', value: url });
  });
  
  // Versiones (ej: v1.0, 2.0, etc)
  const versions = text.match(/v?\d+\.\d+(\.\d+)?/gi) || [];
  versions.forEach(version => {
    items.push({ type: 'version', value: version });
  });
  
  return items;
};

/**
 * Extraer citas/referencias
 * @param {string} htmlContent - Contenido HTML
 * @returns {Array} - Array de citas
 */
export const extractCitations = (htmlContent) => {
  const citations = [];
  
  // Blockquotes
  const quotes = htmlContent.match(/<blockquote[^>]*>(.*?)<\/blockquote>/gi) || [];
  quotes.forEach(quote => {
    citations.push({
      type: 'quote',
      text: stripHtml(quote).trim()
    });
  });
  
  return citations;
};

/**
 * Extraer referencias/enlaces
 * @param {string} htmlContent - Contenido HTML
 * @returns {Array} - Array de referencias
 */
export const extractReferences = (htmlContent) => {
  const references = [];
  
  // Enlaces externos
  const links = htmlContent.match(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi) || [];
  links.forEach(link => {
    const urlMatch = link.match(/href="([^"]*)"/);
    const textMatch = link.match(/>([^<]*)</);
    
    if (urlMatch && urlMatch[1]) {
      references.push({
        url: urlMatch[1],
        text: textMatch ? stripHtml(textMatch[1]) : '',
        type: urlMatch[1].startsWith('http') ? 'external' : 'internal'
      });
    }
  });
  
  return references.slice(0, 10); // Máximo 10 referencias
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
  generateAIMetadata,
  generateSummary,
  extractKeyPoints,
  generateAnsweredQuestions,
  determineAudience,
  determineExpertiseLevel,
  determineContentFormat,
  estimateTone,
  calculateSEOScore,
  extractMentionedItems,
  extractCitations,
  extractReferences
};
