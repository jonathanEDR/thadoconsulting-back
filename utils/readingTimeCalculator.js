/**
 * Utilidad para calcular el tiempo estimado de lectura
 * Basado en velocidad promedio de lectura en español
 */

/**
 * Velocidad de lectura promedio en palabras por minuto
 * Español: 200-250 palabras/minuto
 * Usamos 220 como promedio
 */
const WORDS_PER_MINUTE = 220;

/**
 * Remover tags HTML del contenido
 * @param {string} html - Contenido HTML
 * @returns {string} - Texto plano
 */
const stripHtmlTags = (html) => {
  if (!html) return '';
  
  return html
    // Remover scripts y styles
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remover comentarios HTML
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remover todos los tags HTML
    .replace(/<[^>]+>/g, ' ')
    // Decodificar entidades HTML comunes
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Remover espacios múltiples
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Contar palabras en un texto
 * @param {string} text - Texto a analizar
 * @returns {number} - Número de palabras
 */
const countWords = (text) => {
  if (!text) return 0;
  
  // Dividir por espacios y filtrar elementos vacíos
  const words = text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  return words.length;
};

/**
 * Calcular tiempo de lectura desde HTML
 * @param {string} htmlContent - Contenido en HTML
 * @param {number} wordsPerMinute - Palabras por minuto (opcional)
 * @returns {number} - Tiempo en minutos (redondeado)
 */
export const calculateReadingTimeFromHtml = (htmlContent, wordsPerMinute = WORDS_PER_MINUTE) => {
  const plainText = stripHtmlTags(htmlContent);
  const wordCount = countWords(plainText);
  
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  
  // Mínimo 1 minuto
  return Math.max(1, minutes);
};

/**
 * Calcular tiempo de lectura desde texto plano
 * @param {string} plainText - Contenido en texto plano
 * @param {number} wordsPerMinute - Palabras por minuto (opcional)
 * @returns {number} - Tiempo en minutos (redondeado)
 */
export const calculateReadingTimeFromText = (plainText, wordsPerMinute = WORDS_PER_MINUTE) => {
  const wordCount = countWords(plainText);
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  
  return Math.max(1, minutes);
};

/**
 * Calcular tiempo de lectura desde Markdown
 * @param {string} markdown - Contenido en Markdown
 * @param {number} wordsPerMinute - Palabras por minuto (opcional)
 * @returns {number} - Tiempo en minutos (redondeado)
 */
export const calculateReadingTimeFromMarkdown = (markdown, wordsPerMinute = WORDS_PER_MINUTE) => {
  if (!markdown) return 1;
  
  // Remover código en bloques (```...```)
  let cleanText = markdown.replace(/```[\s\S]*?```/g, '');
  
  // Remover código inline (`...`)
  cleanText = cleanText.replace(/`[^`]*`/g, '');
  
  // Remover imágenes ![alt](url)
  cleanText = cleanText.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');
  
  // Remover links pero mantener texto [texto](url)
  cleanText = cleanText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // Remover headers (#, ##, etc)
  cleanText = cleanText.replace(/^#{1,6}\s+/gm, '');
  
  // Remover énfasis (*, **, _)
  cleanText = cleanText.replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1');
  
  // Remover líneas horizontales (---, ***)
  cleanText = cleanText.replace(/^[-*]{3,}$/gm, '');
  
  const wordCount = countWords(cleanText);
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  
  return Math.max(1, minutes);
};

/**
 * Calcular tiempo de lectura automático según formato
 * @param {string} content - Contenido
 * @param {string} format - Formato: 'html', 'markdown', 'text'
 * @param {number} wordsPerMinute - Palabras por minuto (opcional)
 * @returns {number} - Tiempo en minutos
 */
export const calculateReadingTime = (content, format = 'html', wordsPerMinute = WORDS_PER_MINUTE) => {
  if (!content) return 1;
  
  switch (format.toLowerCase()) {
    case 'html':
      return calculateReadingTimeFromHtml(content, wordsPerMinute);
    case 'markdown':
    case 'md':
      return calculateReadingTimeFromMarkdown(content, wordsPerMinute);
    case 'text':
    case 'plain':
      return calculateReadingTimeFromText(content, wordsPerMinute);
    default:
      // Por defecto, asumir HTML
      return calculateReadingTimeFromHtml(content, wordsPerMinute);
  }
};

/**
 * Obtener estadísticas detalladas del contenido
 * @param {string} content - Contenido
 * @param {string} format - Formato del contenido
 * @returns {object} - Estadísticas completas
 */
export const getContentStats = (content, format = 'html') => {
  let plainText = content;
  
  if (format === 'html') {
    plainText = stripHtmlTags(content);
  } else if (format === 'markdown') {
    // Remover sintaxis Markdown pero mantener texto
    plainText = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]*`/g, '')
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
      .replace(/^[-*]{3,}$/gm, '');
  }
  
  const wordCount = countWords(plainText);
  const charCount = plainText.length;
  const charCountNoSpaces = plainText.replace(/\s/g, '').length;
  
  // Estimar párrafos (líneas separadas por doble salto)
  const paragraphCount = plainText.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  
  return {
    wordCount,
    charCount,
    charCountNoSpaces,
    paragraphCount,
    readingTimeMinutes: calculateReadingTime(content, format),
    avgWordsPerParagraph: paragraphCount > 0 ? Math.round(wordCount / paragraphCount) : 0
  };
};

/**
 * Formatear tiempo de lectura para mostrar
 * @param {number} minutes - Minutos de lectura
 * @returns {string} - Texto formateado
 */
export const formatReadingTime = (minutes) => {
  if (minutes < 1) return 'Menos de 1 min';
  if (minutes === 1) return '1 min';
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
};

export default {
  calculateReadingTime,
  calculateReadingTimeFromHtml,
  calculateReadingTimeFromText,
  calculateReadingTimeFromMarkdown,
  getContentStats,
  formatReadingTime,
  WORDS_PER_MINUTE
};
