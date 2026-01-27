/**
 * Analizador Semántico de Contenido
 * Extracción de keywords, entidades, tópicos y análisis de relevancia
 */

/**
 * Analizar contenido completo
 * @param {string} content - Contenido HTML del post
 * @param {object} options - Opciones de análisis
 * @returns {object} - Análisis semántico completo
 */
export const analyzeContent = (content, options = {}) => {
  const cleanText = stripHtml(content);
  
  return {
    keywords: extractKeywords(cleanText, options.maxKeywords || 20),
    entities: extractEntities(cleanText),
    topics: extractTopics(cleanText),
    sentiment: analyzeSentiment(cleanText),
    readability: analyzeReadability(cleanText),
    structure: analyzeStructure(content),
    density: analyzeKeywordDensity(cleanText)
  };
};

/**
 * Extraer keywords principales
 * @param {string} text - Texto limpio
 * @param {number} maxKeywords - Máximo número de keywords
 * @returns {Array} - Array de {word, frequency, relevance}
 */
export const extractKeywords = (text, maxKeywords = 20) => {
  const words = text.toLowerCase()
    .replace(/[^\w\sáéíóúñü]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3); // Palabras de más de 3 letras
  
  // Palabras vacías en español
  const stopWords = new Set([
    'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber',
    'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo', 'todo',
    'pero', 'más', 'hacer', 'o', 'poder', 'decir', 'este', 'ir', 'otro', 'ese',
    'la', 'si', 'me', 'ya', 'ver', 'porque', 'dar', 'cuando', 'él', 'muy',
    'sin', 'vez', 'mucho', 'saber', 'qué', 'sobre', 'mi', 'alguno', 'mismo',
    'yo', 'también', 'hasta', 'año', 'dos', 'querer', 'entre', 'así', 'primero',
    'desde', 'grande', 'eso', 'ni', 'nos', 'llegar', 'pasar', 'tiempo', 'ella',
    'sí', 'día', 'uno', 'bien', 'poco', 'deber', 'entonces', 'poner', 'cosa',
    'tanto', 'hombre', 'parecer', 'nuestro', 'tan', 'donde', 'ahora', 'parte',
    'después', 'vida', 'quedar', 'siempre', 'creer', 'hablar', 'llevar', 'dejar',
    'nada', 'cada', 'seguir', 'menos', 'nuevo', 'encontrar', 'algo', 'solo',
    'decir', 'estos', 'trabajar', 'primera', 'saber', 'puede', 'todos', 'año',
    'ante', 'bajo', 'cabe', 'contra', 'durante', 'mediante', 'según', 'siendo',
    'tal', 'tras', 'cual', 'cuales', 'quien', 'quienes'
  ]);
  
  // Contar frecuencias
  const frequency = {};
  words.forEach(word => {
    if (!stopWords.has(word) && word.length > 3) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
  });
  
  // Convertir a array y ordenar
  const keywords = Object.entries(frequency)
    .map(([word, count]) => ({
      word,
      frequency: count,
      relevance: calculateRelevance(word, count, words.length),
      score: count * calculateRelevance(word, count, words.length)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxKeywords);
  
  return keywords;
};

/**
 * Calcular relevancia de una palabra
 */
const calculateRelevance = (word, frequency, totalWords) => {
  const tf = frequency / totalWords; // Term Frequency
  
  // Bonus por longitud (palabras más largas suelen ser más específicas)
  const lengthBonus = Math.min(word.length / 15, 1);
  
  // Penalización si es demasiado común
  const commonPenalty = frequency > totalWords * 0.05 ? 0.5 : 1;
  
  return (tf * 100 * lengthBonus * commonPenalty);
};

/**
 * Extraer entidades nombradas
 * @param {string} text - Texto limpio
 * @returns {object} - Entidades extraídas
 */
export const extractEntities = (text) => {
  const entities = {
    technologies: [],
    concepts: [],
    companies: [],
    people: [],
    locations: []
  };
  
  // Tecnologías comunes (expandir según dominio)
  const techPatterns = [
    'javascript', 'typescript', 'python', 'java', 'react', 'vue', 'angular',
    'node', 'express', 'mongodb', 'sql', 'api', 'rest', 'graphql',
    'html', 'css', 'sass', 'webpack', 'docker', 'kubernetes', 'aws',
    'azure', 'git', 'github', 'vscode', 'npm', 'yarn', 'redux', 'nextjs'
  ];
  
  const lowerText = text.toLowerCase();
  
  techPatterns.forEach(tech => {
    if (lowerText.includes(tech)) {
      entities.technologies.push({
        name: tech,
        occurrences: (lowerText.match(new RegExp(tech, 'gi')) || []).length
      });
    }
  });
  
  // Conceptos (palabras capitalizadas que no son inicio de oración)
  const conceptMatches = text.match(/(?<!^|\. )[A-Z][a-záéíóúñü]+(?:\s+[A-Z][a-záéíóúñü]+)*/g) || [];
  const conceptFreq = {};
  
  conceptMatches.forEach(concept => {
    conceptFreq[concept] = (conceptFreq[concept] || 0) + 1;
  });
  
  Object.entries(conceptFreq).forEach(([concept, count]) => {
    if (count > 1 && concept.length > 3) {
      entities.concepts.push({ name: concept, occurrences: count });
    }
  });
  
  return entities;
};

/**
 * Extraer tópicos principales
 * @param {string} text - Texto limpio
 * @returns {Array} - Tópicos identificados
 */
export const extractTopics = (text) => {
  const topics = [];
  
  // Diccionario de tópicos por categoría
  const topicDictionary = {
    'desarrollo-web': {
      keywords: ['desarrollo', 'web', 'frontend', 'backend', 'fullstack', 'html', 'css', 'javascript'],
      weight: 0
    },
    'programación': {
      keywords: ['código', 'programación', 'algoritmo', 'función', 'variable', 'clase', 'objeto'],
      weight: 0
    },
    'base-de-datos': {
      keywords: ['base de datos', 'sql', 'mongodb', 'query', 'tabla', 'colección', 'modelo'],
      weight: 0
    },
    'diseño': {
      keywords: ['diseño', 'ui', 'ux', 'interfaz', 'experiencia', 'usuario', 'visual'],
      weight: 0
    },
    'devops': {
      keywords: ['devops', 'docker', 'kubernetes', 'ci/cd', 'deploy', 'servidor', 'cloud'],
      weight: 0
    },
    'seguridad': {
      keywords: ['seguridad', 'autenticación', 'autorización', 'encriptación', 'token', 'jwt'],
      weight: 0
    },
    'testing': {
      keywords: ['test', 'testing', 'prueba', 'qa', 'unitario', 'integración'],
      weight: 0
    },
    'api': {
      keywords: ['api', 'rest', 'endpoint', 'request', 'response', 'http', 'json'],
      weight: 0
    }
  };
  
  const lowerText = text.toLowerCase();
  
  // Calcular peso de cada tópico
  Object.entries(topicDictionary).forEach(([topic, data]) => {
    data.keywords.forEach(keyword => {
      const occurrences = (lowerText.match(new RegExp(keyword, 'gi')) || []).length;
      data.weight += occurrences;
    });
    
    if (data.weight > 0) {
      topics.push({
        name: topic,
        weight: data.weight,
        confidence: Math.min(data.weight / 10, 1)
      });
    }
  });
  
  return topics
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);
};

/**
 * Analizar sentimiento del texto
 * @param {string} text - Texto limpio
 * @returns {object} - Análisis de sentimiento
 */
export const analyzeSentiment = (text) => {
  const lowerText = text.toLowerCase();
  
  // Palabras positivas
  const positiveWords = [
    'bueno', 'excelente', 'genial', 'increíble', 'mejor', 'perfecto', 'útil',
    'eficiente', 'rápido', 'fácil', 'simple', 'innovador', 'moderno', 'potente',
    'robusto', 'flexible', 'escalable', 'optimizado', 'efectivo', 'éxito'
  ];
  
  // Palabras negativas
  const negativeWords = [
    'malo', 'peor', 'difícil', 'complicado', 'lento', 'problema', 'error',
    'fallo', 'defecto', 'vulnerable', 'obsoleto', 'limitado', 'costoso'
  ];
  
  // Palabras neutrales/técnicas
  const neutralWords = [
    'función', 'método', 'clase', 'variable', 'parámetro', 'configuración',
    'implementación', 'estructura', 'sistema', 'proceso'
  ];
  
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  
  positiveWords.forEach(word => {
    positiveCount += (lowerText.match(new RegExp(word, 'gi')) || []).length;
  });
  
  negativeWords.forEach(word => {
    negativeCount += (lowerText.match(new RegExp(word, 'gi')) || []).length;
  });
  
  neutralWords.forEach(word => {
    neutralCount += (lowerText.match(new RegExp(word, 'gi')) || []).length;
  });
  
  const total = positiveCount + negativeCount + neutralCount;
  
  let sentiment = 'neutral';
  let score = 0;
  
  if (total > 0) {
    score = (positiveCount - negativeCount) / total;
    
    if (score > 0.15) sentiment = 'positive';
    else if (score < -0.15) sentiment = 'negative';
  }
  
  return {
    sentiment,
    score,
    positiveCount,
    negativeCount,
    neutralCount,
    confidence: Math.min(total / 20, 1)
  };
};

/**
 * Analizar legibilidad del texto
 * @param {string} text - Texto limpio
 * @returns {object} - Métricas de legibilidad
 */
export const analyzeReadability = (text) => {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const syllables = countSyllables(text);
  
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / wordCount;
  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllables / wordCount;
  
  // Flesch Reading Ease adaptado para español
  const fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  
  let readingLevel = 'intermediate';
  if (fleschScore >= 80) readingLevel = 'very-easy';
  else if (fleschScore >= 70) readingLevel = 'easy';
  else if (fleschScore >= 60) readingLevel = 'fairly-easy';
  else if (fleschScore >= 50) readingLevel = 'intermediate';
  else if (fleschScore >= 30) readingLevel = 'difficult';
  else readingLevel = 'very-difficult';
  
  return {
    readingLevel,
    fleschScore: Math.max(0, Math.min(100, fleschScore)),
    wordCount,
    sentenceCount,
    avgWordLength: Math.round(avgWordLength * 10) / 10,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 10) / 10
  };
};

/**
 * Contar sílabas aproximadas (español)
 */
const countSyllables = (text) => {
  const words = text.toLowerCase().split(/\s+/);
  let totalSyllables = 0;
  
  words.forEach(word => {
    // Aproximación simple: contar vocales (no perfecta pero funcional)
    const vowels = word.match(/[aeiouáéíóúü]/gi) || [];
    const diphthongs = word.match(/[aeiouáéíóúü]{2}/gi) || [];
    totalSyllables += vowels.length - (diphthongs.length * 0.5);
  });
  
  return Math.max(1, Math.round(totalSyllables));
};

/**
 * Analizar estructura del contenido
 * @param {string} htmlContent - Contenido HTML
 * @returns {object} - Análisis de estructura
 */
export const analyzeStructure = (htmlContent) => {
  const structure = {
    hasHeadings: false,
    headingCount: 0,
    hasList: false,
    listCount: 0,
    hasImages: false,
    imageCount: 0,
    hasLinks: false,
    linkCount: 0,
    hasCode: false,
    codeBlockCount: 0,
    paragraphCount: 0
  };
  
  // Encabezados
  const headings = htmlContent.match(/<h[1-6][^>]*>/gi) || [];
  structure.hasHeadings = headings.length > 0;
  structure.headingCount = headings.length;
  
  // Listas
  const lists = htmlContent.match(/<(ul|ol)[^>]*>/gi) || [];
  structure.hasList = lists.length > 0;
  structure.listCount = lists.length;
  
  // Imágenes
  const images = htmlContent.match(/<img[^>]*>/gi) || [];
  structure.hasImages = images.length > 0;
  structure.imageCount = images.length;
  
  // Enlaces
  const links = htmlContent.match(/<a[^>]*href/gi) || [];
  structure.hasLinks = links.length > 0;
  structure.linkCount = links.length;
  
  // Bloques de código
  const codeBlocks = htmlContent.match(/<(pre|code)[^>]*>/gi) || [];
  structure.hasCode = codeBlocks.length > 0;
  structure.codeBlockCount = codeBlocks.length;
  
  // Párrafos
  const paragraphs = htmlContent.match(/<p[^>]*>/gi) || [];
  structure.paragraphCount = paragraphs.length;
  
  // Score de estructura (0-100)
  let structureScore = 0;
  if (structure.hasHeadings) structureScore += 25;
  if (structure.hasList) structureScore += 20;
  if (structure.hasImages) structureScore += 15;
  if (structure.hasLinks) structureScore += 15;
  if (structure.paragraphCount > 3) structureScore += 25;
  
  structure.score = structureScore;
  structure.quality = structureScore >= 80 ? 'excellent' : 
                      structureScore >= 60 ? 'good' : 
                      structureScore >= 40 ? 'fair' : 'poor';
  
  return structure;
};

/**
 * Analizar densidad de keywords
 * @param {string} text - Texto limpio
 * @returns {object} - Análisis de densidad
 */
export const analyzeKeywordDensity = (text) => {
  const keywords = extractKeywords(text, 10);
  const totalWords = text.split(/\s+/).length;
  
  return keywords.map(kw => ({
    keyword: kw.word,
    frequency: kw.frequency,
    density: ((kw.frequency / totalWords) * 100).toFixed(2) + '%',
    isOptimal: kw.frequency / totalWords <= 0.03 // 3% máximo recomendado
  }));
};

/**
 * Extraer frases clave (n-gramas)
 * @param {string} text - Texto limpio
 * @param {number} n - Tamaño del n-grama (2 o 3)
 * @returns {Array} - Frases clave extraídas
 */
export const extractKeyPhrases = (text, n = 2) => {
  const words = text.toLowerCase()
    .replace(/[^\w\sáéíóúñü]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  const phrases = {};
  
  for (let i = 0; i <= words.length - n; i++) {
    const phrase = words.slice(i, i + n).join(' ');
    phrases[phrase] = (phrases[phrase] || 0) + 1;
  }
  
  return Object.entries(phrases)
    .filter(([phrase, count]) => count > 1) // Solo frases repetidas
    .map(([phrase, count]) => ({
      phrase,
      frequency: count,
      relevance: count / (words.length - n + 1)
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 15);
};

/**
 * Calcular similitud entre dos textos
 * @param {string} text1 - Primer texto
 * @param {string} text2 - Segundo texto
 * @returns {number} - Score de similitud (0-1)
 */
export const calculateSimilarity = (text1, text2) => {
  const keywords1 = new Set(extractKeywords(text1, 20).map(k => k.word));
  const keywords2 = new Set(extractKeywords(text2, 20).map(k => k.word));
  
  const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
  const union = new Set([...keywords1, ...keywords2]);
  
  return intersection.size / union.size; // Jaccard similarity
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
  analyzeContent,
  extractKeywords,
  extractEntities,
  extractTopics,
  analyzeSentiment,
  analyzeReadability,
  analyzeStructure,
  analyzeKeywordDensity,
  extractKeyPhrases,
  calculateSimilarity
};
