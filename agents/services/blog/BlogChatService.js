/**
 * BlogChatService - Servicio para chat conversacional con el agente
 * Responsabilidades:
 * - Chat conversacional
 * - Análisis de intención
 * - Extracción de acciones y sugerencias
 */

import openaiService from '../OpenAIService.js';
import logger from '../../../utils/logger.js';

class BlogChatService {
  /**
   * Chat conversacional con el agente
   */
  async chat(context) {
    try {
      const { userMessage, currentContent, title, category, chatHistory } = context;

      let conversationHistory = '';
      if (chatHistory && chatHistory.length > 0) {
        conversationHistory = chatHistory.map(msg => 
          `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`
        ).join('\n');
      }

      const prompt = `Eres un asistente editorial experto especializado en la creación de contenido para blog.

Contexto actual del post:
- Título: ${title || 'Sin título'}
- Categoría: ${category || 'Sin categoría'}
- Contenido actual (${currentContent?.length || 0} caracteres):
${currentContent ? currentContent.substring(0, 500) + '...' : 'Sin contenido aún'}

${conversationHistory ? `Historial de conversación:\n${conversationHistory}\n` : ''}

Mensaje del usuario: ${userMessage}

Responde de forma útil y específica. Si el usuario pide:
- "Expandir" o "Extender": Sugiere cómo continuar el contenido
- "Mejorar": Proporciona sugerencias específicas de mejora
- "SEO": Proporciona recomendaciones de optimización
- "Ideas": Sugiere temas o enfoques relacionados
- "Corregir": Identifica problemas y propón soluciones

Proporciona respuestas prácticas y accionables.`;

      const response = await openaiService.generateCompletion(prompt, {
        temperature: 0.7,
        maxTokens: 500
      });

      const suggestions = this.extractSuggestions(response);
      const actions = this.extractActions(userMessage, response);

      return {
        success: true,
        message: response,
        suggestions,
        actions,
        metadata: {
          timestamp: new Date().toISOString(),
          contextLength: currentContent?.length || 0
        }
      };
    } catch (error) {
      logger.error('Error in chat:', error);
      throw error;
    }
  }

  /**
   * Extraer sugerencias de una respuesta
   */
  extractSuggestions(response) {
    const suggestions = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*')) {
        suggestions.push(line.trim().substring(1).trim());
      }
    }
    
    return suggestions;
  }

  /**
   * Extraer acciones sugeridas del mensaje
   */
  extractActions(userMessage, response) {
    const actions = [];
    
    // Verificar que userMessage existe
    if (!userMessage || typeof userMessage !== 'string') {
      return actions;
    }
    
    const messageLower = userMessage.toLowerCase();
    
    if (messageLower.includes('expand') || messageLower.includes('expan')) {
      actions.push({ action: 'expand_content', confidence: 0.8 });
    }
    if (messageLower.includes('mejora') || messageLower.includes('improve')) {
      actions.push({ action: 'improve_content', confidence: 0.85 });
    }
    if (messageLower.includes('seo')) {
      actions.push({ action: 'optimize_seo', confidence: 0.9 });
    }
    if (messageLower.includes('genera') || messageLower.includes('crea')) {
      actions.push({ action: 'generate_content', confidence: 0.75 });
    }
    
    return actions;
  }
}

export default new BlogChatService();
