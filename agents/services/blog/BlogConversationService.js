/**
 * BlogConversationService
 * Gestiona el flujo conversacional para crear contenido de blog
 */

import BlogCreationSession from '../../../models/BlogCreationSession.js';
import BlogCategory from '../../../models/BlogCategory.js';
import { getTemplate, listTemplates } from '../../../utils/contentTemplates.js';
import logger from '../../../utils/logger.js';

class BlogConversationService {
  constructor() {
    // No instanciar BlogAgent aquí para evitar dependencia circular
    this.blogAgent = null;
    
    // Mapeo de etapas a porcentajes de progreso
    this.stageProgress = {
      initialized: 5,
      topic_discovery: 20,
      type_selection: 35,
      details_collection: 50,
      category_selection: 65,
      review_and_confirm: 80,
      final_confirmation: 90,
      generating: 95,
      generation_completed: 100,
      draft_saved: 100
    };
  }

  /**
   * Lazy load BlogAgent para evitar dependencia circular
   */
  async getBlogAgent() {
    if (!this.blogAgent) {
      const { BlogAgent } = await import('../../specialized/BlogAgent.js');
      this.blogAgent = new BlogAgent();
    }
    return this.blogAgent;
  }

  /**
   * Iniciar nueva sesión de creación
   */
  async startSession(userId, metadata = {}) {
    try {
      // Crear nueva sesión
      const session = await BlogCreationSession.createSession(userId, metadata);
      
      // Agregar mensaje inicial del agente
      const welcomeMessage = `¡Hola! 👋 Soy tu asistente de contenido para blog.

Voy a ayudarte a crear un artículo profesional, optimizado para SEO y con contenido de alta calidad.

El proceso es simple: te haré algunas preguntas para entender qué tipo de contenido quieres crear, y luego lo generaré por ti con estructura profesional, código de ejemplo (si aplica), y optimización SEO automática.

**¿Sobre qué tema quieres escribir?**

Puedes decirme el tema general, y yo te ayudaré a refinarlo y crear un título atractivo.`;

      session.addMessage('agent', welcomeMessage, {
        type: 'welcome',
        stage: 'initialized'
      });
      
      // Mover a la primera etapa
      session.moveToStage('topic_discovery', this.stageProgress.topic_discovery);
      
      await session.save();
      
      logger.info(`📝 New blog creation session started: ${session.sessionId} for user ${userId}`);
      
      return {
        success: true,
        sessionId: session.sessionId,
        message: welcomeMessage,
        context: {
          stage: session.stage,
          progress: session.progress,
          sessionId: session.sessionId
        }
      };
      
    } catch (error) {
      logger.error('❌ Error starting session:', error);
      throw error;
    }
  }

  /**
   * Procesar mensaje del usuario
   */
  async processMessage(sessionId, userMessage) {
    try {
      // Buscar sesión activa
      const session = await BlogCreationSession.findActiveSession(sessionId);
      
      if (!session) {
        return {
          success: false,
          error: 'Session not found or expired',
          code: 'SESSION_NOT_FOUND'
        };
      }
      
      // Agregar mensaje del usuario
      session.addMessage('user', userMessage, {
        stage: session.stage
      });
      
      // Procesar según la etapa actual
      let response;
      
      switch (session.stage) {
        case 'topic_discovery':
          response = await this.handleTopicDiscovery(session, userMessage);
          break;
          
        case 'type_selection':
          response = await this.handleTypeSelection(session, userMessage);
          break;
          
        case 'details_collection':
          response = await this.handleDetailsCollection(session, userMessage);
          break;
          
        case 'category_selection':
          response = await this.handleCategorySelection(session, userMessage);
          break;
          
        case 'review_and_confirm':
          response = await this.handleReviewAndConfirm(session, userMessage);
          break;
          
        case 'final_confirmation':
          response = await this.handleFinalConfirmation(session, userMessage);
          break;
          
        default:
          response = {
            success: false,
            message: 'Invalid stage',
            error: `Unknown stage: ${session.stage}`
          };
      }
      
      // Agregar respuesta del agente al historial
      if (response.success && response.message) {
        session.addMessage('agent', response.message, {
          stage: session.stage,
          ...response.metadata
        });
      }
      
      await session.save();
      
      return response;
      
    } catch (error) {
      logger.error('❌ Error processing message:', error);
      return {
        success: false,
        message: 'Error al procesar mensaje: ' + error.message,
        error: error.message,
        stage: 'error',
        progress: 0
      };
    }
  }

  /**
   * Etapa 1: Descubrimiento del tema
   */
  async handleTopicDiscovery(session, userMessage) {
    try {
      // Extraer tema del mensaje
      const topic = userMessage.trim();
      
      // Generar título sugerido
      const suggestedTitle = await this.generateTitleFromTopic(topic);
      
      // Actualizar datos recolectados
      session.updateCollected({
        topic,
        title: suggestedTitle
      });
      
      // Mover a siguiente etapa
      session.moveToStage('type_selection', this.stageProgress.type_selection);
      
      // Obtener templates disponibles
      const templates = listTemplates();
      
      const message = `Excelente elección! **"${topic}"** es un tema muy interesante.

He generado un título preliminar: **"${suggestedTitle}"**
(Podrás ajustarlo después si lo deseas)

Ahora, ¿qué tipo de artículo quieres crear?

Selecciona el formato que mejor se adapte a tu objetivo:`;
      
      return {
        success: true,
        message,
        questions: [{
          id: 'post_type',
          question: '¿Qué tipo de artículo quieres crear?',
          type: 'select',
          required: true,
          options: templates.map(t => ({
            value: t.key,
            label: `${this.getTemplateIcon(t.key)} ${t.name}`,
            description: t.description
          }))
        }],
        context: {
          stage: session.stage,
          progress: session.progress,
          collected: session.collected
        }
      };
      
    } catch (error) {
      logger.error('❌ Error in topic discovery:', error);
      throw error;
    }
  }

  /**
   * Etapa 2: Selección de tipo
   */
  async handleTypeSelection(session, userMessage) {
    try {
      // El mensaje puede ser el key del template, número o texto
      let postType = userMessage.trim().toLowerCase();
      
      // Mapeo de números a templates
      const numberMapping = {
        '1': 'tutorial',
        '2': 'guide',
        '3': 'technical',
        '4': 'informative',
        '5': 'opinion'
      };
      
      if (numberMapping[postType]) {
        postType = numberMapping[postType];
      }
      
      // Validar que sea un template válido
      const validTemplates = ['tutorial', 'guide', 'technical', 'informative', 'opinion'];
      if (!validTemplates.includes(postType)) {
        postType = 'informative'; // Default
      }
      
      // Actualizar datos recolectados
      session.updateCollected({
        postType,
        template: postType
      });
      
      // Mover a siguiente etapa
      session.moveToStage('details_collection', this.stageProgress.details_collection);
      
      const templateConfig = getTemplate(postType);
      
      const message = `Perfecto! Has elegido crear un **${templateConfig.name}**.

Este formato incluye:
${templateConfig.structure.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Ahora necesito algunos detalles más para personalizar el contenido:`;
      
      return {
        success: true,
        message,
        stage: session.stage,
        progress: session.progress,
        questions: [
          {
            id: 'audience',
            question: '¿Para quién está dirigido?',
            type: 'select',
            required: true,
            options: [
              { value: 'beginner', label: '🌱 Principiantes', description: 'Sin experiencia previa en el tema' },
              { value: 'intermediate', label: '📈 Intermedio', description: 'Conocimientos básicos previos' },
              { value: 'advanced', label: '🚀 Avanzado', description: 'Experiencia significativa' },
              { value: 'expert', label: '🎯 Experto', description: 'Profesionales del área' }
            ]
          },
          {
            id: 'length',
            question: '¿Qué longitud prefieres?',
            type: 'select',
            required: true,
            options: [
              { value: '800', label: '📝 Corto (800 palabras)', description: '~5 min de lectura' },
              { value: '1200', label: '📄 Medio (1200 palabras)', description: '~8 min de lectura' },
              { value: '2000', label: '📚 Largo (2000 palabras)', description: '~13 min de lectura' },
              { value: '3000', label: '📖 Muy largo (3000 palabras)', description: '~20 min de lectura' }
            ]
          },
          {
            id: 'keywords',
            question: '¿Palabras clave específicas? (opcional)',
            type: 'tags',
            required: false,
            placeholder: 'Presiona Enter después de cada keyword'
          }
        ],
        context: {
          stage: session.stage,
          progress: session.progress,
          collected: session.collected
        }
      };
      
    } catch (error) {
      logger.error('❌ Error in type selection:', error);
      throw error;
    }
  }

  /**
   * Etapa 3: Recolección de detalles
   */
  async handleDetailsCollection(session, userMessage) {
    try {
      // Parsear respuesta del usuario (puede ser JSON o texto)
      let details = {};
      const text = userMessage.toLowerCase().trim();
      
      try {
        details = JSON.parse(userMessage);
      } catch {
        // Parsing de texto natural
        // Audiencia
        if (text.includes('principiante') || text.includes('beginner')) {
          details.audience = 'beginner';
        } else if (text.includes('intermedio') || text.includes('intermediate')) {
          details.audience = 'intermediate';
        } else if (text.includes('avanzado') || text.includes('advanced')) {
          details.audience = 'advanced';
        } else if (text.includes('experto') || text.includes('expert')) {
          details.audience = 'expert';
        }
        
        // Longitud
        if (text.includes('corto') || text.includes('800')) {
          details.length = '800';
        } else if (text.includes('medio') || text.includes('1200')) {
          details.length = '1200';
        } else if (text.includes('largo') || text.includes('2000')) {
          details.length = '2000';
        } else if (text.includes('muy largo') || text.includes('3000')) {
          details.length = '3000';
        }
        
        // Keywords - buscar palabras separadas por coma
        const keywordMatch = userMessage.match(/keywords?:?\s*([^\n]+)/i);
        if (keywordMatch) {
          details.keywords = keywordMatch[1].split(',').map(k => k.trim()).filter(k => k);
        }
      }
      
      // Validar y normalizar datos
      const audience = details.audience || 'intermediate';
      const length = parseInt(details.length) || 1200;
      const keywords = Array.isArray(details.keywords) ? details.keywords : [];
      
      // Actualizar datos recolectados
      session.updateCollected({
        audience,
        length,
        keywords
      });
      
      // Mover a siguiente etapa
      session.moveToStage('category_selection', this.stageProgress.category_selection);
      
      // Obtener categorías disponibles
      const categories = await BlogCategory.find({ isActive: true })
        .select('name slug description')
        .sort({ name: 1 })
        .lean();
      
      const message = `¡Genial! Ya tengo casi toda la información.

**Configuración hasta ahora:**
📖 Tipo: ${session.collected.template}
👥 Audiencia: ${this.getAudienceLabel(audience)}
📏 Longitud: ~${length} palabras
🏷️ Keywords: ${keywords.length > 0 ? keywords.join(', ') : 'Ninguna especificada'}

Última pregunta: **¿En qué categoría del blog quieres publicarlo?**`;
      
      return {
        success: true,
        message,
        stage: session.stage,
        progress: session.progress,
        questions: [{
          id: 'category',
          question: 'Selecciona una categoría',
          type: 'select',
          required: true,
          options: categories.map(cat => ({
            value: cat._id.toString(),
            label: cat.name,
            description: cat.description || ''
          }))
        }],
        context: {
          stage: session.stage,
          progress: session.progress,
          collected: session.collected,
          availableCategories: categories
        }
      };
      
    } catch (error) {
      logger.error('❌ Error in details collection:', error);
      throw error;
    }
  }

  /**
   * Etapa 4: Selección de categoría
   */
  async handleCategorySelection(session, userMessage) {
    try {
      // Extraer ID de categoría
      let categoryId = userMessage.trim();
      
      // Si es JSON, extraer el campo category
      try {
        const parsed = JSON.parse(userMessage);
        categoryId = parsed.category || categoryId;
      } catch {
        // No es JSON, usar directamente
      }
      
      // Si es un número, buscar por índice
      if (/^\d+$/.test(categoryId)) {
        const categories = await BlogCategory.find({ isActive: true })
          .select('_id')
          .sort({ name: 1 })
          .lean();
        
        const index = parseInt(categoryId) - 1;
        if (index >= 0 && index < categories.length) {
          categoryId = categories[index]._id.toString();
        }
      }
      
      // Validar que la categoría existe
      const category = await BlogCategory.findById(categoryId);
      if (!category) {
        return {
          success: false,
          message: '❌ Categoría no encontrada. Por favor selecciona una categoría válida.',
          stage: session.stage,
          progress: session.progress,
          error: 'INVALID_CATEGORY'
        };
      }
      
      // Actualizar datos recolectados
      session.updateCollected({
        category: categoryId
      });
      
      // Mover a etapa de revisión
      session.moveToStage('review_and_confirm', this.stageProgress.review_and_confirm);
      
      // Generar resumen completo
      const summary = await this.generateConfigurationSummary(session);
      
      const message = `¡Perfecto! **Categoría seleccionada: ${category.name}**

Aquí está el resumen completo de lo que voy a generar:

${summary}

**Estimación de tiempo:** 2-3 minutos
**Score SEO esperado:** 95-100/100

¿Quieres que genere el contenido ahora?`;
      
      return {
        success: true,
        message,
        stage: session.stage,
        progress: session.progress,
        summary: this.getStructuredSummary(session, category),
        actions: [
          {
            id: 'confirm_generate',
            label: '✅ Sí, generar contenido',
            type: 'primary',
            description: 'Iniciar generación del artículo'
          },
          {
            id: 'modify',
            label: '✏️ Modificar configuración',
            type: 'secondary',
            description: 'Cambiar algún parámetro'
          },
          {
            id: 'cancel',
            label: '❌ Cancelar',
            type: 'danger',
            description: 'Cancelar y volver después'
          }
        ],
        context: {
          stage: session.stage,
          progress: session.progress,
          collected: session.collected
        }
      };
      
    } catch (error) {
      logger.error('❌ Error in category selection:', error);
      throw error;
    }
  }

  /**
   * Etapa 5: Revisión y confirmación
   */
  async handleReviewAndConfirm(session, userMessage) {
    try {
      const action = userMessage.trim().toLowerCase();
      
      if (action === 'modify' || action.includes('modificar') || action.includes('cambiar')) {
        // Volver a etapa anterior
        session.moveToStage('details_collection', this.stageProgress.details_collection);
        
        return {
          success: true,
          message: '✏️ Perfecto, volvamos atrás. ¿Qué te gustaría modificar?\n\nPuedes cambiar:\n- Audiencia\n- Longitud del artículo\n- Palabras clave\n- Categoría',
          stage: session.stage,
          progress: session.progress,
          context: {
            stage: session.stage,
            progress: session.progress
          }
        };
      }
      
      if (action === 'cancel' || action.includes('cancelar')) {
        session.cancel();
        await session.save();
        
        return {
          success: true,
          message: '❌ Sesión cancelada. Puedes volver cuando quieras para crear contenido.',
          stage: 'cancelled',
          progress: 0,
          context: {
            stage: 'cancelled',
            progress: 0
          }
        };
      }
      
      // Si contiene "sí", "generar", "confirm", iniciar generación directamente
      if (action.includes('sí') || action.includes('si') || action.includes('generar') || 
          action.includes('confirm') || action.includes('yes') || action.includes('ok')) {
        
        // Mover directamente a generación
        session.moveToStage('generating', this.stageProgress.generating);
        await session.save();
        
        return {
          success: true,
          message: '🎨 Perfecto! Iniciando generación de contenido...',
          stage: session.stage,
          progress: session.progress,
          shouldGenerate: true,
          context: {
            stage: session.stage,
            progress: session.progress
          }
        };
      }
      
      // Si es cualquier otra cosa, mover a confirmación final
      session.moveToStage('final_confirmation', this.stageProgress.final_confirmation);
      
      return {
        success: true,
        message: '✅ ¡Excelente! Confirma para empezar la generación.',
        stage: session.stage,
        progress: session.progress,
        readyToGenerate: true,
        actions: [
          {
            id: 'start_generation',
            label: '🚀 Iniciar generación',
            type: 'primary'
          }
        ],
        context: {
          stage: session.stage,
          progress: session.progress
        }
      };
      
    } catch (error) {
      logger.error('❌ Error in review and confirm:', error);
      throw error;
    }
  }

  /**
   * Etapa 6: Confirmación final (trigger de generación)
   */
  async handleFinalConfirmation(session, userMessage) {
    try {
      const action = userMessage.trim().toLowerCase();
      
      if (action.includes('cancel') || action.includes('cancelar')) {
        session.cancel();
        await session.save();
        
        return {
          success: true,
          message: '❌ Sesión cancelada.',
          stage: 'cancelled',
          progress: 0,
          context: { stage: 'cancelled' }
        };
      }
      
      // Iniciar generación
      return {
        success: true,
        message: '🎨 Perfecto! Iniciando generación de contenido...',
        stage: session.stage,
        progress: session.progress,
        shouldGenerate: true,
        context: {
          stage: 'final_confirmation',
          progress: session.progress
        }
      };
      
    } catch (error) {
      logger.error('❌ Error in final confirmation:', error);
      throw error;
    }
  }

  /**
   * Generar contenido usando BlogAgent
   */
  async generateContent(sessionId) {
    try {
      const session = await BlogCreationSession.findActiveSession(sessionId);
      
      if (!session) {
        throw new Error('Session not found or expired');
      }
      
      // Generar ID único para esta generación
      const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Iniciar generación en la sesión
      session.startGeneration(generationId);
      await session.save();
      
      logger.info(`🎨 Starting content generation for session ${sessionId}`);
      
      // Generar contenido usando BlogAgent (lazy load)
      const blogAgent = await this.getBlogAgent();
      const { collected } = session;
      
      const result = await blogAgent.generateFullPost({
        title: collected.title,
        category: collected.topic, // Tema como categoría descriptiva
        style: collected.tone || 'professional',
        wordCount: collected.length || 1200,
        focusKeywords: collected.keywords || [],
        template: collected.template
      });
      
      if (!result.success) {
        session.failGeneration(new Error(result.message || 'Generation failed'));
        await session.save();
        
        return {
          success: false,
          error: 'Content generation failed',
          details: result.message
        };
      }
      
      // Preparar draft del post
      const category = await BlogCategory.findById(collected.category);
      
      // ✅ Convertir Markdown a HTML si es necesario (fallback)
      const cleanContent = this.convertMarkdownToHTML(result.content);
      
      const draft = {
        title: collected.title,
        excerpt: this.generateExcerpt(cleanContent, 280),
        content: cleanContent,
        contentFormat: 'html',
        category: collected.category,
        tags: result.metadata.suggestedTags || [],
        seo: {
          metaTitle: collected.title.substring(0, 60),
          metaDescription: this.generateExcerpt(result.content, 150),
          keywords: collected.keywords || []
        }
      };
      
      // Completar generación
      session.completeGeneration({
        content: result.content,
        metadata: result.metadata,
        draft
      });
      
      await session.save();
      
      logger.success(`✅ Content generated successfully for session ${sessionId}`);
      
      return {
        success: true,
        generationId,
        result: {
          content: result.content,
          metadata: result.metadata,
          draft
        }
      };
      
    } catch (error) {
      logger.error('❌ Error generating content:', error);
      
      // Marcar generación como fallida
      try {
        const session = await BlogCreationSession.findOne({ sessionId });
        if (session) {
          session.failGeneration(error);
          await session.save();
        }
      } catch (saveError) {
        logger.error('Failed to save error state:', saveError);
      }
      
      throw error;
    }
  }

  /**
   * Guardar borrador como BlogPost
   */
  async saveDraft(sessionId, userId, customData = {}) {
    try {
      const session = await BlogCreationSession.findOne({ sessionId });
      
      if (!session || !session.generation || !session.generation.draft) {
        throw new Error('No generated content to save');
      }
      
      const { draft } = session.generation;
      
      // Importar modelos necesarios
      const BlogPost = (await import('../../../models/BlogPost.js')).default;
      const User = (await import('../../../models/User.js')).default;
      
      // Buscar usuario
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Crear post
      const postData = {
        ...draft,
        ...customData,
        author: user._id,
        status: 'draft',
        publishedAt: null
      };
      
      const post = await BlogPost.create(postData);
      
      // Vincular post a la sesión
      session.linkCreatedPost(post._id);
      await session.save();
      
      logger.success(`✅ Draft saved as BlogPost: ${post._id}`);
      
      return {
        success: true,
        post: {
          id: post._id,
          title: post.title,
          slug: post.slug,
          status: post.status,
          createdAt: post.createdAt
        }
      };
      
    } catch (error) {
      logger.error('❌ Error saving draft:', error);
      throw error;
    }
  }

  // Utilidades

  async generateTitleFromTopic(topic) {
    // Simple title generation - puede mejorarse con IA
    const cleanTopic = topic.trim();
    
    // Capitalizar primera letra
    return cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);
  }

  /**
   * Convertir Markdown residual a HTML (fallback)
   */
  convertMarkdownToHTML(content) {
    if (!content) return '';
    
    let html = content;
    
    // Si ya tiene etiquetas HTML, no hacer nada
    if (html.includes('<h2>') || html.includes('<p>')) {
      return html;
    }
    
    // Convertir encabezados Markdown a HTML
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
    
    // Convertir negritas
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Convertir cursivas
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Convertir listas con viñetas
    html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Convertir listas numeradas
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    
    // Convertir bloques de código
    html = html.replace(/```(\w+)?\n([\s\S]+?)```/g, '<pre><code>$2</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Convertir párrafos (líneas que no son etiquetas HTML)
    html = html.split('\n\n').map(para => {
      para = para.trim();
      if (!para) return '';
      if (para.startsWith('<')) return para;
      return `<p>${para}</p>`;
    }).join('\n');
    
    return html;
  }

  generateExcerpt(content, maxLength = 280) {
    // Remover HTML y Markdown para obtener texto plano
    const plainText = content
      .replace(/<[^>]*>/g, ' ')  // Remover tags HTML
      .replace(/#{1,6}\s/g, '')   // Remover ## Markdown
      .replace(/\*\*/g, '')        // Remover **
      .replace(/\*/g, '')          // Remover *
      .replace(/`{1,3}[^`]*`{1,3}/g, '') // Remover código
      .replace(/\n+/g, ' ')        // Remover saltos de línea
      .replace(/\s+/g, ' ')        // Normalizar espacios
      .trim();
    
    if (plainText.length <= maxLength) {
      return plainText;
    }
    
    return plainText.substring(0, maxLength - 3) + '...';
  }

  async generateConfigurationSummary(session) {
    const { collected } = session;
    const category = await BlogCategory.findById(collected.category);
    const template = getTemplate(collected.template);
    
    return `
📖 **Título:** ${collected.title}
📚 **Tipo:** ${template.name}
👥 **Audiencia:** ${this.getAudienceLabel(collected.audience)}
📏 **Longitud:** ~${collected.length} palabras (~${Math.ceil(collected.length / 200)} min de lectura)
🏷️ **Categoría:** ${category?.name || 'No especificada'}
🔑 **Keywords:** ${collected.keywords?.join(', ') || 'Ninguna'}

**Estructura incluirá:**
${template.structure.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}
`;
  }

  getStructuredSummary(session, category) {
    const { collected } = session;
    const template = getTemplate(collected.template);
    
    return {
      title: collected.title,
      type: template.name,
      audience: this.getAudienceLabel(collected.audience),
      length: `~${collected.length} palabras`,
      readingTime: `~${Math.ceil(collected.length / 200)} min`,
      category: category.name,
      keywords: collected.keywords || [],
      structure: template.structure,
      estimatedSEOScore: '95-100/100'
    };
  }

  getTemplateIcon(templateKey) {
    const icons = {
      tutorial: '📚',
      guide: '📖',
      technical: '🔬',
      informative: '💡',
      opinion: '💭'
    };
    return icons[templateKey] || '📝';
  }

  getAudienceLabel(audience) {
    const labels = {
      beginner: '🌱 Principiantes',
      intermediate: '📈 Intermedio',
      advanced: '🚀 Avanzado',
      expert: '🎯 Experto',
      general: '👥 General'
    };
    return labels[audience] || '👥 General';
  }

  /**
   * Generar contenido del blog basado en la sesión
   */
  async generateBlogContent(sessionId) {
    try {
      logger.info(`🎨 Iniciando generación de contenido para sesión: ${sessionId}`);
      
      // Obtener sesión
      const session = await BlogCreationSession.findActiveSession(sessionId);
      
      if (!session) {
        throw new Error('Sesión no encontrada o expirada');
      }

      if (!session.collected || !session.collected.title) {
        throw new Error('Sesión incompleta: falta información requerida');
      }

      // Importar BlogContentService
      const BlogContentService = (await import('./BlogContentService.js')).default;
      
      const { collected } = session;
      
      // Obtener categoría
      const category = await BlogCategory.findById(collected.category);
      
      logger.info('📋 Datos para generación:', {
        title: collected.title,
        template: collected.template,
        audience: collected.audience,
        length: collected.length,
        categoryId: collected.category,
        categoryName: category?.name || 'Sin categoría',
        keywords: collected.keywords?.length || 0
      });

      // Generar contenido usando BlogContentService
      const result = await BlogContentService.generateFullPost({
        title: collected.title,
        category: category?.name || 'General',
        style: this.mapAudienceToStyle(collected.audience),
        wordCount: collected.length || 1200,
        focusKeywords: collected.keywords || [],
        template: collected.template || 'informative'
      });

      if (!result.success) {
        throw new Error('Error generando contenido');
      }

      // Preparar tags sugeridos
      const tags = result.metadata?.suggestedTags || [];
      if (collected.keywords && collected.keywords.length > 0) {
        tags.push(...collected.keywords.filter(k => !tags.includes(k)));
      }

      // Construir objeto de contenido generado
      const generatedContent = {
        title: collected.title,
        content: result.content,
        excerpt: this.generateExcerpt(result.content),
        categories: collected.category ? [collected.category] : [],
        tags: tags.slice(0, 8), // Máximo 8 tags
        seo: {
          metaTitle: collected.title,
          metaDescription: this.generateMetaDescription(result.content, collected.title),
          focusKeywords: collected.keywords || [],
          score: result.metadata?.seoScore || 85
        },
        metadata: {
          wordCount: result.metadata?.wordCount || 0,
          readingTime: Math.ceil((result.metadata?.wordCount || 0) / 200),
          template: collected.template,
          audience: collected.audience,
          generatedAt: new Date()
        }
      };

      // Actualizar sesión
      session.generatedContent = generatedContent;
      session.moveToStage('generation_completed', this.stageProgress.generation_completed);
      session.addMessage('agent', '✨ ¡Contenido generado exitosamente!', {
        type: 'generation_complete',
        stage: 'generation_completed'
      });
      
      await session.save();

      logger.info('✅ Contenido generado exitosamente:', {
        sessionId,
        wordCount: generatedContent.metadata.wordCount,
        tagsCount: generatedContent.tags.length,
        seoScore: generatedContent.seo.score
      });

      // 💾 Guardar como BlogPost en la base de datos
      try {
        const BlogPost = (await import('../../../models/BlogPost.js')).default;
        const BlogTag = (await import('../../../models/BlogTag.js')).default;
        
        logger.info('💾 Intentando guardar post en base de datos...', {
          title: generatedContent.title,
          hasExcerpt: !!generatedContent.excerpt,
          hasContent: !!generatedContent.content,
          contentLength: generatedContent.content?.length || 0,
          userId: session.userId,
          categories: generatedContent.categories,
          categoryToUse: generatedContent.categories?.[0],
          tagsCount: generatedContent.tags?.length || 0
        });

        // Validar que tenemos una categoría válida
        if (!generatedContent.categories || generatedContent.categories.length === 0 || !generatedContent.categories[0]) {
          throw new Error('No se encontró una categoría válida para el post. La categoría es requerida.');
        }
        
        // Crear o obtener tags
        const tagIds = [];
        if (generatedContent.tags && generatedContent.tags.length > 0) {
          for (const tagName of generatedContent.tags) {
            let tag = await BlogTag.findOne({ name: tagName });
            if (!tag) {
              tag = await BlogTag.create({
                name: tagName,
                slug: tagName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
              });
            }
            tagIds.push(tag._id);
          }
        }

        // Crear el post
        const newPost = await BlogPost.create({
          title: generatedContent.title,
          content: generatedContent.content,
          excerpt: generatedContent.excerpt,
          contentFormat: 'markdown', // El contenido generado es Markdown
          slug: generatedContent.title.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remover acentos
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 100),
          author: session.userId,
          category: generatedContent.categories[0], // Tomar la primera categoría (ya validada arriba)
          tags: tagIds,
          status: 'draft', // Guardar como draft por defecto
          seo: {
            metaTitle: generatedContent.seo.metaTitle?.substring(0, 60),
            metaDescription: generatedContent.seo.metaDescription?.substring(0, 160),
            keywords: generatedContent.seo.focusKeywords || [],
            ogTitle: generatedContent.title.substring(0, 60),
            ogDescription: generatedContent.excerpt?.substring(0, 160)
          },
          aiOptimization: {
            score: generatedContent.seo.score,
            lastOptimized: new Date(),
            suggestions: []
          },
          readingTime: generatedContent.metadata.readingTime,
          wordCount: generatedContent.metadata.wordCount
        });

        // Agregar el ID del post al contenido generado
        generatedContent._id = newPost._id;
        generatedContent.postId = newPost._id.toString();

        // Actualizar sesión con el postId
        session.postId = newPost._id;
        await session.save();

        logger.info('💾 Post guardado en base de datos:', {
          postId: newPost._id,
          title: newPost.title,
          slug: newPost.slug,
          status: newPost.status
        });

      } catch (saveError) {
        logger.error('⚠️  Error guardando post en base de datos:', {
          error: saveError.message,
          stack: saveError.stack,
          name: saveError.name,
          code: saveError.code,
          validationErrors: saveError.errors
        });
        // No fallar completamente si el guardado falla
        generatedContent.saveError = saveError.message;
      }

      return generatedContent;
      
    } catch (error) {
      logger.error('❌ Error en generateBlogContent:', error);
      throw error;
    }
  }

  /**
   * Mapear audiencia a estilo de escritura
   */
  mapAudienceToStyle(audience) {
    const styleMap = {
      beginner: 'friendly',
      intermediate: 'professional',
      advanced: 'technical',
      expert: 'academic'
    };
    return styleMap[audience] || 'professional';
  }

  /**
   * Generar excerpt del contenido
   */
  generateExcerpt(content, maxLength = 160) {
    // Extraer primer párrafo sin markdown
    const firstParagraph = content
      .split('\n\n')[0]
      .replace(/[#*`_\[\]]/g, '')
      .trim();
    
    if (firstParagraph.length <= maxLength) {
      return firstParagraph;
    }
    
    return firstParagraph.substring(0, maxLength - 3) + '...';
  }

  /**
   * Generar meta descripción
   */
  generateMetaDescription(content, title, maxLength = 155) {
    // Intentar usar la introducción
    const intro = content
      .split('\n\n')
      .slice(0, 2)
      .join(' ')
      .replace(/[#*`_\[\]]/g, '')
      .trim();
    
    if (intro.length <= maxLength) {
      return intro;
    }
    
    // Si es muy largo, usar el título + primer párrafo resumido
    const firstSentence = intro.split('.')[0];
    if (firstSentence.length <= maxLength) {
      return firstSentence + '.';
    }
    
    return intro.substring(0, maxLength - 3) + '...';
  }
}

// Exportar singleton
const blogConversationService = new BlogConversationService();
export default blogConversationService;
