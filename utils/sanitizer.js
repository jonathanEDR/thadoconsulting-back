/**
 * 🧹 Módulo de Sanitización Centralizado - Web Scuti
 * ===================================================
 * Proporciona funciones para sanitizar diferentes tipos de contenido
 * antes de enviarlo al cliente, previniendo ataques XSS y otros.
 * 
 * Creado: Diciembre 10, 2024
 * Versión: 1.0
 */

import DOMPurify from 'isomorphic-dompurify';
import sanitizeHtml from 'sanitize-html';
import xss from 'xss';
import logger from './logger.js';

// ============================================
// 🔧 CONFIGURACIONES
// ============================================

/**
 * Configuración para contenido de blog (permite HTML rico)
 * Permite: headings, párrafos, listas, links, imágenes, código, tablas
 */
const BLOG_HTML_CONFIG = {
  allowedTags: [
    // Estructura
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr', 'div', 'span',
    // Texto
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ins',
    'sub', 'sup', 'small', 'mark',
    // Listas
    'ul', 'ol', 'li',
    // Links e imágenes
    'a', 'img',
    // Código
    'pre', 'code', 'kbd', 'samp',
    // Tablas
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    // Citas
    'blockquote', 'q', 'cite',
    // Media
    'figure', 'figcaption', 'video', 'audio', 'source',
    // Otros
    'details', 'summary', 'abbr', 'time'
  ],
  allowedAttributes: {
    '*': ['class', 'id', 'style', 'data-*'],
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height', 'loading'],
    'video': ['src', 'controls', 'width', 'height', 'poster', 'autoplay', 'muted', 'loop'],
    'audio': ['src', 'controls'],
    'source': ['src', 'type'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan', 'scope'],
    'time': ['datetime'],
    'abbr': ['title'],
    'code': ['class'],  // Para syntax highlighting
    'pre': ['class']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
    a: ['http', 'https', 'mailto', 'tel']
  },
  allowedStyles: {
    '*': {
      'color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/, /^rgba\(/],
      'background-color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/, /^rgba\(/],
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
      'font-size': [/^\d+(?:px|em|rem|%)$/],
      'font-weight': [/^(?:normal|bold|[1-9]00)$/],
      'text-decoration': [/^(?:none|underline|line-through)$/]
    }
  },
  transformTags: {
    'a': (tagName, attribs) => {
      // Forzar noopener y nofollow en links externos
      if (attribs.href && !attribs.href.startsWith('/') && !attribs.href.startsWith('#')) {
        attribs.rel = 'noopener nofollow';
        attribs.target = '_blank';
      }
      return { tagName, attribs };
    }
  }
};

/**
 * Configuración para CMS (más restrictiva)
 * Solo permite texto básico y algunos estilos
 */
const CMS_HTML_CONFIG = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'span', 'div'
  ],
  allowedAttributes: {
    '*': ['class', 'style'],
    'a': ['href', 'title', 'target', 'rel']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedStyles: {
    '*': {
      'color': [/^#[0-9a-fA-F]{3,6}$/],
      'text-align': [/^left$/, /^right$/, /^center$/]
    }
  }
};

/**
 * Configuración para comentarios (muy restrictiva)
 * Solo texto básico, sin links ni imágenes
 */
const COMMENT_HTML_CONFIG = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'code'],
  allowedAttributes: {},
  allowedSchemes: []
};

// ============================================
// 🧹 FUNCIONES DE SANITIZACIÓN
// ============================================

/**
 * Sanitizar HTML de contenido de blog
 * Permite HTML rico pero elimina scripts y contenido peligroso
 * 
 * @param {string} html - HTML a sanitizar
 * @returns {string} - HTML sanitizado
 */
export function sanitizeBlogHtml(html) {
  if (!html || typeof html !== 'string') return '';
  
  try {
    // Doble sanitización para mayor seguridad
    // 1. Primero con sanitize-html (más configurable)
    let clean = sanitizeHtml(html, BLOG_HTML_CONFIG);
    
    // 2. Luego con DOMPurify (más robusto contra edge cases)
    clean = DOMPurify.sanitize(clean, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target', 'rel', 'loading'],
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
    });
    
    return clean;
  } catch (error) {
    logger.error('Error sanitizing blog HTML:', error);
    return '';  // En caso de error, retornar vacío por seguridad
  }
}

/**
 * Sanitizar HTML de contenido CMS
 * Más restrictivo que blog
 * 
 * @param {string} html - HTML a sanitizar
 * @returns {string} - HTML sanitizado
 */
export function sanitizeCmsHtml(html) {
  if (!html || typeof html !== 'string') return '';
  
  try {
    let clean = sanitizeHtml(html, CMS_HTML_CONFIG);
    clean = DOMPurify.sanitize(clean, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'img', 'video', 'audio']
    });
    return clean;
  } catch (error) {
    logger.error('Error sanitizing CMS HTML:', error);
    return '';
  }
}

/**
 * Sanitizar comentarios de usuario
 * Muy restrictivo - solo texto básico
 * 
 * @param {string} html - Texto/HTML a sanitizar
 * @returns {string} - Texto sanitizado
 */
export function sanitizeComment(html) {
  if (!html || typeof html !== 'string') return '';
  
  try {
    return sanitizeHtml(html, COMMENT_HTML_CONFIG);
  } catch (error) {
    logger.error('Error sanitizing comment:', error);
    return '';
  }
}

/**
 * Sanitizar texto plano (sin HTML)
 * Elimina TODO el HTML y devuelve solo texto
 * 
 * @param {string} text - Texto a sanitizar
 * @param {number} maxLength - Longitud máxima (opcional)
 * @returns {string} - Texto limpio
 */
export function sanitizePlainText(text, maxLength = null) {
  if (!text || typeof text !== 'string') return '';
  
  try {
    // Eliminar TODO el HTML
    let clean = sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });
    
    // Decodificar entidades HTML
    clean = clean
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    
    // Normalizar espacios
    clean = clean.replace(/\s+/g, ' ').trim();
    
    // Truncar si es necesario
    if (maxLength && clean.length > maxLength) {
      clean = clean.substring(0, maxLength - 3) + '...';
    }
    
    return clean;
  } catch (error) {
    logger.error('Error sanitizing plain text:', error);
    return '';
  }
}

/**
 * Sanitizar nombre de usuario o texto corto
 * Solo permite caracteres alfanuméricos y algunos especiales
 * 
 * @param {string} name - Nombre a sanitizar
 * @returns {string} - Nombre limpio
 */
export function sanitizeName(name) {
  if (!name || typeof name !== 'string') return '';
  
  try {
    // Eliminar HTML
    let clean = sanitizePlainText(name, 100);
    
    // Solo permitir caracteres válidos para nombres
    clean = clean.replace(/[<>\"'`\\]/g, '');
    
    return clean.trim();
  } catch (error) {
    logger.error('Error sanitizing name:', error);
    return '';
  }
}

/**
 * Sanitizar email
 * Valida formato y limpia
 * 
 * @param {string} email - Email a sanitizar
 * @returns {string} - Email limpio o vacío si inválido
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  
  try {
    // Limpiar espacios y convertir a minúsculas
    let clean = email.trim().toLowerCase();
    
    // Eliminar caracteres peligrosos
    clean = clean.replace(/[<>\"'`\\]/g, '');
    
    // Validar formato básico de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      return '';
    }
    
    // Limitar longitud
    if (clean.length > 254) {
      return '';
    }
    
    return clean;
  } catch (error) {
    logger.error('Error sanitizing email:', error);
    return '';
  }
}

/**
 * Sanitizar URL
 * Valida y limpia URLs
 * 
 * @param {string} url - URL a sanitizar
 * @param {string[]} allowedProtocols - Protocolos permitidos
 * @returns {string} - URL limpia o vacío si inválida
 */
export function sanitizeUrl(url, allowedProtocols = ['http', 'https']) {
  if (!url || typeof url !== 'string') return '';
  
  try {
    let clean = url.trim();
    
    // Bloquear javascript: y data: (excepto para imágenes)
    const lowerUrl = clean.toLowerCase();
    if (lowerUrl.startsWith('javascript:') || 
        lowerUrl.startsWith('vbscript:') ||
        lowerUrl.startsWith('data:text')) {
      logger.warn(`🚫 Blocked dangerous URL: ${url.substring(0, 50)}`);
      return '';
    }
    
    // Permitir URLs relativas
    if (clean.startsWith('/') || clean.startsWith('#')) {
      return clean;
    }
    
    // Validar protocolo
    try {
      const urlObj = new URL(clean);
      if (!allowedProtocols.includes(urlObj.protocol.replace(':', ''))) {
        return '';
      }
      return urlObj.toString();
    } catch (e) {
      // Si no es una URL válida, retornar vacío
      return '';
    }
  } catch (error) {
    logger.error('Error sanitizing URL:', error);
    return '';
  }
}

/**
 * Sanitizar objeto recursivamente
 * Limpia todos los strings dentro de un objeto/array
 * 
 * @param {any} obj - Objeto a sanitizar
 * @param {Object} options - Opciones de sanitización
 * @returns {any} - Objeto sanitizado
 */
export function sanitizeObject(obj, options = {}) {
  const {
    htmlFields = [],      // Campos que contienen HTML permitido (usar sanitizeBlogHtml)
    urlFields = [],       // Campos que contienen URLs
    emailFields = [],     // Campos que contienen emails
    skipFields = []       // Campos a ignorar
  } = options;
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizePlainText(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Saltar campos especificados
      if (skipFields.includes(key)) {
        sanitized[key] = value;
        continue;
      }
      
      // Aplicar sanitización específica según el tipo de campo
      if (htmlFields.includes(key) && typeof value === 'string') {
        sanitized[key] = sanitizeBlogHtml(value);
      } else if (urlFields.includes(key) && typeof value === 'string') {
        sanitized[key] = sanitizeUrl(value);
      } else if (emailFields.includes(key) && typeof value === 'string') {
        sanitized[key] = sanitizeEmail(value);
      } else if (typeof value === 'string') {
        sanitized[key] = sanitizePlainText(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value, options);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  return obj;
}

/**
 * Sanitizar post de blog completo
 * Aplica sanitización específica a cada campo
 * 
 * @param {Object} post - Post de blog
 * @returns {Object} - Post sanitizado
 */
export function sanitizeBlogPost(post) {
  if (!post || typeof post !== 'object') return post;
  
  try {
    const sanitized = { ...post };
    
    // Campos de texto plano
    if (sanitized.title) sanitized.title = sanitizePlainText(sanitized.title, 200);
    if (sanitized.excerpt) sanitized.excerpt = sanitizePlainText(sanitized.excerpt, 500);
    if (sanitized.slug) sanitized.slug = sanitized.slug.replace(/[^a-z0-9-]/gi, '').toLowerCase();
    
    // Contenido HTML
    if (sanitized.content) sanitized.content = sanitizeBlogHtml(sanitized.content);
    
    // URLs
    if (sanitized.featuredImage) sanitized.featuredImage = sanitizeUrl(sanitized.featuredImage);
    if (sanitized.thumbnailUrl) sanitized.thumbnailUrl = sanitizeUrl(sanitized.thumbnailUrl);
    
    // Autor
    if (sanitized.author && typeof sanitized.author === 'object') {
      if (sanitized.author.firstName) sanitized.author.firstName = sanitizeName(sanitized.author.firstName);
      if (sanitized.author.lastName) sanitized.author.lastName = sanitizeName(sanitized.author.lastName);
      if (sanitized.author.username) sanitized.author.username = sanitizeName(sanitized.author.username);
      if (sanitized.author.profileImage) sanitized.author.profileImage = sanitizeUrl(sanitized.author.profileImage);
    }
    
    // Tags y categorías
    if (sanitized.tags && Array.isArray(sanitized.tags)) {
      sanitized.tags = sanitized.tags.map(tag => {
        if (typeof tag === 'string') return sanitizePlainText(tag, 50);
        if (typeof tag === 'object' && tag.name) {
          return { ...tag, name: sanitizePlainText(tag.name, 50) };
        }
        return tag;
      });
    }
    
    return sanitized;
  } catch (error) {
    logger.error('Error sanitizing blog post:', error);
    return post;
  }
}

/**
 * Sanitizar datos de usuario para respuesta
 * Elimina datos sensibles y sanitiza el resto
 * 
 * @param {Object} user - Datos de usuario
 * @returns {Object} - Usuario sanitizado
 */
export function sanitizeUserData(user) {
  if (!user || typeof user !== 'object') return user;
  
  try {
    // Crear copia sin campos sensibles
    const { 
      password, 
      passwordHash, 
      refreshToken,
      resetToken,
      ...safeUser 
    } = user;
    
    const sanitized = { ...safeUser };
    
    // Sanitizar campos de texto
    if (sanitized.firstName) sanitized.firstName = sanitizeName(sanitized.firstName);
    if (sanitized.lastName) sanitized.lastName = sanitizeName(sanitized.lastName);
    if (sanitized.username) sanitized.username = sanitizeName(sanitized.username);
    if (sanitized.displayName) sanitized.displayName = sanitizeName(sanitized.displayName);
    if (sanitized.bio) sanitized.bio = sanitizePlainText(sanitized.bio, 500);
    
    // Sanitizar URLs
    if (sanitized.profileImage) sanitized.profileImage = sanitizeUrl(sanitized.profileImage);
    if (sanitized.avatar) sanitized.avatar = sanitizeUrl(sanitized.avatar);
    if (sanitized.website) sanitized.website = sanitizeUrl(sanitized.website);
    
    // Sanitizar email
    if (sanitized.email) sanitized.email = sanitizeEmail(sanitized.email);
    
    // Sanitizar blogProfile si existe
    if (sanitized.blogProfile && typeof sanitized.blogProfile === 'object') {
      if (sanitized.blogProfile.displayName) {
        sanitized.blogProfile.displayName = sanitizeName(sanitized.blogProfile.displayName);
      }
      if (sanitized.blogProfile.bio) {
        sanitized.blogProfile.bio = sanitizePlainText(sanitized.blogProfile.bio, 500);
      }
      if (sanitized.blogProfile.avatar) {
        sanitized.blogProfile.avatar = sanitizeUrl(sanitized.blogProfile.avatar);
      }
      if (sanitized.blogProfile.website) {
        sanitized.blogProfile.website = sanitizeUrl(sanitized.blogProfile.website);
      }
    }
    
    return sanitized;
  } catch (error) {
    logger.error('Error sanitizing user data:', error);
    return user;
  }
}

/**
 * Sanitizar respuesta de contacto/lead
 * 
 * @param {Object} contact - Datos de contacto
 * @returns {Object} - Contacto sanitizado
 */
export function sanitizeContact(contact) {
  if (!contact || typeof contact !== 'object') return contact;
  
  try {
    const sanitized = { ...contact };
    
    if (sanitized.nombre) sanitized.nombre = sanitizeName(sanitized.nombre);
    if (sanitized.email) sanitized.email = sanitizeEmail(sanitized.email);
    if (sanitized.correo) sanitized.correo = sanitizeEmail(sanitized.correo);
    if (sanitized.celular) sanitized.celular = sanitized.celular.replace(/[^0-9+\-\s()]/g, '');
    if (sanitized.mensaje) sanitized.mensaje = sanitizePlainText(sanitized.mensaje, 5000);
    if (sanitized.empresa) sanitized.empresa = sanitizeName(sanitized.empresa);
    
    // Sanitizar notas si existen
    if (sanitized.notas && Array.isArray(sanitized.notas)) {
      sanitized.notas = sanitized.notas.map(nota => ({
        ...nota,
        contenido: nota.contenido ? sanitizePlainText(nota.contenido, 2000) : ''
      }));
    }
    
    return sanitized;
  } catch (error) {
    logger.error('Error sanitizing contact:', error);
    return contact;
  }
}

// ============================================
// 📊 EXPORTS
// ============================================

export default {
  // HTML sanitizers
  sanitizeBlogHtml,
  sanitizeCmsHtml,
  sanitizeComment,
  
  // Text sanitizers
  sanitizePlainText,
  sanitizeName,
  sanitizeEmail,
  sanitizeUrl,
  
  // Object sanitizers
  sanitizeObject,
  sanitizeBlogPost,
  sanitizeUserData,
  sanitizeContact,
  
  // Configs (para testing/extensión)
  BLOG_HTML_CONFIG,
  CMS_HTML_CONFIG,
  COMMENT_HTML_CONFIG
};
