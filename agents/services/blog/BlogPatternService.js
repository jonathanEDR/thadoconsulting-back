/**
 * BlogPatternService - Servicio para procesamiento de patrones contextuales #...#
 * Responsabilidades:
 * - Procesamiento de patrones de usuario
 * - Operaciones de transformación de texto
 * - Sugerencias contextuales
 */

import openaiService from '../OpenAIService.js';
import logger from '../../../utils/logger.js';

class BlogPatternService {
  /**
   * Procesar patrón contextual y generar sugerencia específica
   */
  async processContextPattern(patternData) {
    try {
      const { patternType, text, context, modifiers } = patternData;

      switch (patternType) {
        case 'expand':
          return await this.expandContent({ text, context, modifiers });
        case 'summarize':
          return await this.summarizeContent({ text, context, modifiers });
        case 'rewrite':
          return await this.rewriteContent({ text, context, modifiers });
        case 'continue':
          return await this.continueContent({ text, context, modifiers });
        case 'examples':
          return await this.addExamples({ text, context, modifiers });
        case 'seo':
          return await this.optimizeForSEO({ text, context, modifiers });
        case 'tone':
          return await this.adjustTone({ text, tone: modifiers?.tone, context });
        case 'format':
          return await this.reformatContent({ text, format: modifiers?.format, context });
        case 'data':
          return await this.addDataAndStats({ text, context, modifiers });
        case 'technical':
          return await this.addTechnicalDetails({ text, context, modifiers });
        case 'creative':
          return await this.makeCreative({ text, context, modifiers });
        default:
          return await this.customPatternProcessing({ text, instruction: patternType, context });
      }
    } catch (error) {
      logger.error('Error processing context pattern:', error);
      throw error;
    }
  }

  async expandContent({ text, context, modifiers }) {
    const prompt = `Expande y desarrolla el siguiente texto con más detalles:

TEXTO:
"${text}"

CONTEXTO:
${context?.before || 'Sin contexto adicional'}

Proporciona una versión expandida con más detalles y profundidad.`;

    const response = await openaiService.generateCompletion(prompt, {
      temperature: modifiers?.creativity || 0.7,
      maxTokens: 800
    });

    return {
      success: true,
      result: response,
      patternType: 'expand',
      originalText: text,
      confidence: 0.85
    };
  }

  async summarizeContent({ text, context, modifiers }) {
    const prompt = `Resume el siguiente texto de forma concisa:

TEXTO:
"${text}"

Genera un resumen ${modifiers?.length || 'breve'}.`;

    const response = await openaiService.generateCompletion(prompt, {
      temperature: 0.4,
      maxTokens: 400
    });

    return {
      success: true,
      result: response,
      patternType: 'summarize',
      originalText: text,
      confidence: 0.9
    };
  }

  async rewriteContent({ text, context, modifiers }) {
    const prompt = `Reescribe el siguiente texto mejorando su redacción:

TEXTO:
"${text}"

ESTILO: ${modifiers?.style || 'profesional'}
TONO: ${modifiers?.tone || 'neutral'}

Genera versión mejorada.`;

    const response = await openaiService.generateCompletion(prompt, {
      temperature: 0.6,
      maxTokens: 600
    });

    return {
      success: true,
      result: response,
      patternType: 'rewrite',
      originalText: text,
      confidence: 0.85
    };
  }

  async continueContent({ text, context, modifiers }) {
    const prompt = `Continúa el siguiente texto de forma natural:

TEXTO:
"${text}"

CONTEXTO PREVIO:
${context?.before || 'Sin contexto adicional'}

Genera la continuación natural del texto.`;

    const response = await openaiService.generateCompletion(prompt, {
      temperature: 0.8,
      maxTokens: 600
    });

    return {
      success: true,
      result: response,
      patternType: 'continue',
      originalText: text,
      confidence: 0.8
    };
  }

  async addExamples({ text, context, modifiers }) {
    const prompt = `Agrega ejemplos prácticos al siguiente texto:

TEXTO:
"${text}"

Proporciona ${modifiers?.count || 3} ejemplos relevantes y prácticos.`;

    const response = await openaiService.generateCompletion(prompt, {
      temperature: 0.75,
      maxTokens: 700
    });

    return {
      success: true,
      result: response,
      patternType: 'examples',
      originalText: text,
      confidence: 0.85
    };
  }

  async optimizeForSEO({ text, context, modifiers }) {
    const prompt = `Optimiza el siguiente texto para SEO:

TEXTO:
"${text}"

KEYWORDS: ${modifiers?.keywords?.join(', ') || 'No especificadas'}

Genera versión optimizada para SEO.`;

    const response = await openaiService.generateCompletion(prompt, {
      temperature: 0.6,
      maxTokens: 600
    });

    return {
      success: true,
      result: response,
      patternType: 'seo',
      originalText: text,
      confidence: 0.8
    };
  }

  async adjustTone({ text, tone, context }) {
    const prompt = `Ajusta el tono del siguiente texto a: ${tone}

TEXTO:
"${text}"

NUEVO TONO: ${tone}

Reescribe manteniendo el contenido pero con el tono solicitado.`;

    const response = await openaiService.generateCompletion(prompt, {
      temperature: 0.7,
      maxTokens: 500
    });

    return {
      success: true,
      result: response,
      patternType: 'tone',
      originalText: text,
      confidence: 0.85
    };
  }

  async reformatContent({ text, format, context }) {
    const formatInstructions = {
      lista: 'Convierte en una lista con bullets bien estructurada',
      tabla: 'Organiza la información en formato de tabla',
      puntos: 'Divide en puntos numerados claros',
      párrafo: 'Reorganiza en párrafos bien estructurados'
    };

    const prompt = `${formatInstructions[format] || 'Reorganiza el contenido'}:

TEXTO:
"${text}"

Genera el contenido reformateado.`;

    const response = await openaiService.generateCompletion(prompt, {
      temperature: 0.5,
      maxTokens: 500
    });

    return {
      success: true,
      result: response,
      patternType: 'format',
      originalText: text,
      confidence: 0.9
    };
  }

  async addDataAndStats({ text, context, modifiers }) {
    const prompt = `Agrega datos y estadísticas relevantes al siguiente texto:

TEXTO:
"${text}"

Sugiere datos relevantes e intégralos de forma natural.`;

    const response = await openaiService.generateCompletion(prompt, {
      temperature: 0.6,
      maxTokens: 600
    });

    return {
      success: true,
      result: response,
      patternType: 'data',
      originalText: text,
      confidence: 0.75
    };
  }

  async addTechnicalDetails({ text, context, modifiers }) {
    const prompt = `Agrega detalles técnicos al siguiente texto:

TEXTO:
"${text}"

Añade especificaciones técnicas y profundidad.`;

    const response = await openaiService.generateCompletion(prompt, {
      temperature: 0.65,
      maxTokens: 700
    });

    return {
      success: true,
      result: response,
      patternType: 'technical',
      originalText: text,
      confidence: 0.8
    };
  }

  async makeCreative({ text, context, modifiers }) {
    const prompt = `Transforma el siguiente texto en algo más creativo:

TEXTO:
"${text}"

Usa metáforas y analogías creativas, mantén el contenido profesional.`;

    const response = await openaiService.generateCompletion(prompt, {
      temperature: 0.9,
      maxTokens: 600
    });

    return {
      success: true,
      result: response,
      patternType: 'creative',
      originalText: text,
      confidence: 0.75
    };
  }

  async customPatternProcessing({ text, instruction, context }) {
    const prompt = `Procesa el siguiente texto según la instrucción:

TEXTO:
"${text}"

INSTRUCCIÓN:
"${instruction}"

Aplica la instrucción y genera el resultado.`;

    const response = await openaiService.generateCompletion(prompt, {
      temperature: 0.7,
      maxTokens: 700
    });

    return {
      success: true,
      result: response,
      patternType: 'custom',
      originalText: text,
      confidence: 0.7
    };
  }
}

export default new BlogPatternService();
