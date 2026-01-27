/**
 * BlogContentService - Servicio para generación y optimización de contenido
 * Responsabilidades:
 * - Generación de posts completos
 * - Generación de secciones
 * - Extensión de contenido
 * - Mejora de contenido
 * - Sugerencias de párrafos
 */

import openaiService from '../OpenAIService.js';
import logger from '../../../utils/logger.js';
import { getTemplate, validateContent } from '../../../utils/contentTemplates.js';

class BlogContentService {
  /**
   * Generar post completo desde cero (con soporte para templates)
   */
  async generateFullPost({ title, category, style = 'professional', wordCount = 800, focusKeywords = [], template = null }) {
    try {
      const keywordsStr = focusKeywords.length > 0 ? `\nPalabras clave objetivo: ${focusKeywords.join(', ')}` : '';
      
      // Si se especifica un template, usarlo
      let prompt;
      if (template) {
        const templateConfig = getTemplate(template);
        prompt = templateConfig.prompt({
          title,
          category,
          wordCount,
          technology: category,
          topic: title,
          audience: 'Profesionales y desarrolladores'
        });
      } else {
        // Prompt mejorado para generar HTML compatible con TipTap (como el editor manual)
        prompt = `Genera un artículo de blog en HTML puro y semántico. NO uses sintaxis Markdown.

DATOS: Título: "${title}" | Categoría: ${category} | Longitud: ${wordCount} palabras${keywordsStr}

IMPORTANTE: Debes escribir SOLO en HTML, NO en Markdown.

INCORRECTO (Markdown):
## Título de Sección
**negrita**
* item de lista

CORRECTO (HTML):
<h2>Título de Sección</h2>
<strong>negrita</strong>
<li>item de lista</li>

ESTRUCTURA:
<h2>Introducción</h2>
<p>Párrafo introductorio explicando el tema principal con <strong>conceptos clave</strong> resaltados.</p>
<p>Segundo párrafo desarrollando la idea y su importancia en la industria actual.</p>

<h2>Conceptos Fundamentales</h2>
<p>Explicación de los conceptos básicos que se necesitan conocer.</p>
<ul>
<li><strong>Concepto 1:</strong> Descripción breve y clara</li>
<li><strong>Concepto 2:</strong> Descripción breve y clara</li>
<li><strong>Concepto 3:</strong> Descripción breve y clara</li>
</ul>

<h2>Implementación y Mejores Prácticas</h2>
<p>Pasos prácticos para implementar estos conceptos en proyectos reales.</p>
<ol>
<li>Primer paso con explicación detallada</li>
<li>Segundo paso con consideraciones importantes</li>
<li>Tercer paso con recomendaciones</li>
</ol>

<h2>Conclusión</h2>
<p>Resumen de los puntos clave y llamado a la acción para aplicar los conocimientos.</p>

REGLAS:
- Usa <h2> y <h3> para títulos
- Usa <p> para párrafos (50-80 palabras)
- Usa <strong> para negritas
- Usa <ul><li> o <ol><li> para listas
- Si hay código: <pre><code>código aquí</code></pre>
- NO uses ##, **, *, \`\`\` ni ningún Markdown

Escribe el artículo completo en HTML siguiendo esta estructura

Genera el artículo completo en HTML puro:`;
      }

      const content = await openaiService.generateCompletion(prompt, {
        temperature: 0.7,
        maxTokens: Math.min(wordCount * 2, 3000)
      });

      const seoScore = this.calculateBasicSEOScore(content, title);
      const suggestedTags = await this.extractRelevantTags(content);

      // Validar si se usó template
      let validation = null;
      if (template) {
        validation = validateContent(content, template);
      }

      return {
        success: true,
        content,
        metadata: {
          wordCount: content.split(/\s+/).length,
          seoScore,
          suggestedTags: suggestedTags.slice(0, 5),
          template: template || 'default',
          validation,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error generating full post:', error);
      throw error;
    }
  }

  /**
   * Generar una sección específica de contenido
   */
  async generateContentSection({ title, context, wordCount = 200 }) {
    try {
      const prompt = `Genera una sección de contenido para un artículo de blog.

Título de la sección: ${title}
Contexto del artículo:
${context ? context.substring(0, 300) + '...' : 'Inicio del artículo'}

REQUISITOS:
- Aproximadamente ${wordCount} palabras
- Párrafos cortos (60-80 palabras máximo)
- Coherente con el contexto anterior
- Incluir listas con viñetas si es apropiado
- Usar negritas para términos importantes
- Si es contenido técnico, incluir ejemplos de código
- Profesional, informativo y optimizado para SEO

FORMATO DE SALIDA - HTML LIMPIO:
- Usa <h2> o <h3> para el título de la sección
- Usa <p> para párrafos
- Usa <ul><li> para listas con viñetas
- Usa <strong> para negritas
- Usa <pre><code> para código
- NO uses Markdown - SOLO HTML

Genera SOLO el contenido HTML de esta sección.`;

      const content = await openaiService.generateCompletion(prompt, {
        temperature: 0.7,
        maxTokens: Math.min(wordCount * 2, 1000)
      });

      return {
        success: true,
        content,
        metadata: {
          wordCount: content.split(/\s+/).length,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error generating content section:', error);
      throw error;
    }
  }

  /**
   * Extender contenido existente
   */
  async extendContent({ currentContent, instruction, wordCount = 150 }) {
    try {
      const prompt = `Continúa el siguiente contenido de forma natural y coherente.

Contenido actual:
${currentContent}

Instrucción: ${instruction}

Requisitos:
- Aproximadamente ${wordCount} palabras
- Mantén el estilo y tono del contenido original
- Continúa de forma natural donde termina el texto
- No repitas información ya mencionada

Genera SOLO la continuación del contenido.`;

      const extension = await openaiService.generateCompletion(prompt, {
        temperature: 0.7,
        maxTokens: Math.min(wordCount * 2, 800)
      });

      return {
        success: true,
        content: extension,
        metadata: {
          wordCount: extension.split(/\s+/).length,
          originalLength: currentContent.split(/\s+/).length,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error extending content:', error);
      throw error;
    }
  }

  /**
   * Mejorar contenido existente
   */
  async improveContent({ content, instruction }) {
    try {
      const prompt = `Mejora el siguiente contenido según las indicaciones.

Contenido original:
${content}

Instrucción de mejora: ${instruction}

Requisitos:
- Mantén la longitud similar (±10%)
- Mejora claridad, fluidez y profesionalismo
- Corrige errores gramaticales
- Optimiza para legibilidad y SEO
- Usa formato HTML semántico (<p>, <strong>, <ul>, <li>, etc.)
- Párrafos cortos (máximo 80 palabras)
- Conserva el mensaje principal

Genera el contenido mejorado en HTML limpio (sin etiquetas html, head, body).`;

      const improvedContent = await openaiService.generateCompletion(prompt, {
        temperature: 0.6,
        maxTokens: Math.min(content.length * 2, 2000)
      });

      return {
        success: true,
        content: improvedContent,
        metadata: {
          originalLength: content.split(/\s+/).length,
          improvedLength: improvedContent.split(/\s+/).length,
          improvements: this.detectImprovements(content, improvedContent),
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error improving content:', error);
      throw error;
    }
  }

  /**
   * Sugerir siguiente párrafo (autocompletado contextual)
   */
  async suggestNextParagraph({ currentContent, context }) {
    try {
      const recentContent = currentContent.slice(-1000);
      const prompt = `Continúa este artículo de blog de forma natural y coherente.

CONTENIDO RECIENTE:
${recentContent}

CONTEXTO:
${context?.before || 'Sin contexto adicional'}

REQUISITOS:
- Genera el siguiente párrafo (2-4 oraciones, 60-80 palabras)
- Mantén coherencia con el contenido anterior
- Usa formato HTML (<p>, <strong>, etc.)
- Continúa naturalmente el flujo del contenido

Genera SOLO el siguiente párrafo en HTML limpio.`;

      const suggestion = await openaiService.generateCompletion(prompt, {
        temperature: 0.8,
        maxTokens: 300
      });

      return {
        success: true,
        suggestion,
        metadata: {
          confidence: 0.85,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error suggesting next paragraph:', error);
      throw error;
    }
  }

  /**
   * Calcular score SEO básico (mejorado)
   */
  calculateBasicSEOScore(content, title) {
    let score = 40; // Base más baja para ser más estricto

    // Longitud del contenido (más estricto)
    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 300) score += 5;
    if (wordCount >= 600) score += 5;
    if (wordCount >= 800) score += 5;
    
    // Estructura HTML/Markdown
    if (content.includes('##')) score += 10; // Tiene headers
    if (content.match(/^[-*]\s/m)) score += 5; // Tiene listas
    if (content.includes('```')) score += 5; // Tiene bloques de código
    if (content.includes('**')) score += 3; // Usa negritas
    
    // Optimización de palabras clave
    const titleWords = title.toLowerCase().split(' ').filter(w => w.length > 3);
    const contentLower = content.toLowerCase();
    const keywordMatches = titleWords.filter(word => contentLower.includes(word)).length;
    score += Math.min(keywordMatches * 3, 12);
    
    // Estructura de párrafos
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    if (paragraphs.length >= 4) score += 5;
    if (paragraphs.length >= 6) score += 5;
    
    // Legibilidad (párrafos no muy largos)
    const avgWordsPerParagraph = paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0) / paragraphs.length;
    if (avgWordsPerParagraph <= 80) score += 5;
    if (avgWordsPerParagraph <= 60) score += 3;
    
    // Conclusión o cierre
    if (content.toLowerCase().includes('conclusión') || 
        content.toLowerCase().includes('resumen') ||
        content.toLowerCase().includes('en resumen')) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Extraer tags relevantes del contenido
   */
  async extractRelevantTags(content) {
    try {
      const words = content.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      const frequency = {};
      
      words.forEach(word => {
        frequency[word] = (frequency[word] || 0) + 1;
      });
      
      return Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
    } catch (error) {
      logger.error('Error extracting tags:', error);
      return [];
    }
  }

  /**
   * Detectar mejoras realizadas
   */
  detectImprovements(original, improved) {
    const improvements = [];
    
    if (improved.length > original.length * 0.9 && improved.length < original.length * 1.1) {
      improvements.push('Longitud optimizada');
    }
    if (improved.split('.').length > original.split('.').length) {
      improvements.push('Mejor estructura de oraciones');
    }
    
    return improvements;
  }
}

export default new BlogContentService();
