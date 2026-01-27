/**
 * BlogSEOService - Servicio especializado en optimización SEO
 * Responsabilidades:
 * - Análisis SEO de contenido
 * - Generación de tags
 * - Optimización de metadata
 * - Recomendaciones SEO
 */

import openaiService from '../OpenAIService.js';
import BlogPost from '../../../models/BlogPost.js';
import { generateAIMetadata } from '../../../utils/aiMetadataGenerator.js';
import { suggestTags, suggestImprovements } from '../../../utils/contentEnhancer.js';
import logger from '../../../utils/logger.js';

class BlogSEOService {
  /**
   * Optimizar SEO de un post
   */
  async optimizeSEO({ postId, slug, taskPrompt = null, config = {} }) {
    try {
      let post;
      
      if (postId) {
        post = await BlogPost.findById(postId)
          .select('title content excerpt slug seo tags category')
          .populate('tags', 'name slug')
          .populate('category', 'name slug')
          .lean();
      } else if (slug) {
        post = await BlogPost.findOne({ slug })
          .select('title content excerpt slug seo tags category')
          .populate('tags', 'name slug')
          .populate('category', 'name slug')
          .lean();
      }

      if (!post) {
        return {
          success: false,
          message: 'Post no encontrado'
        };
      }

      logger.info(`🔍 SEO optimization for: ${post.title}`);

      const improvements = suggestImprovements(post);
      const aiMetadata = generateAIMetadata(post);

      let seoSuggestions = null;
      if (openaiService.isAvailable() && taskPrompt) {
        const userInput = {
          title: post.title,
          content: post.content.substring(0, 2000),
          url: post.slug,
          audience: 'Desarrolladores y profesionales técnicos',
          target_keywords: post.seo?.focusKeyphrase || 'No especificadas',
          focus_areas: 'Optimización completa de SEO técnico'
        };

        const prompt = this.personalizePrompt(taskPrompt, userInput);
        
        seoSuggestions = await openaiService.generateCompletion(prompt, {
          temperature: config.temperature || 0.3,
          maxTokens: config.maxTokens || 1500
        });
      }

      const seoResults = {
        postInfo: {
          id: post._id,
          title: post.title,
          slug: post.slug,
          currentSEOScore: improvements.score.seo
        },
        current: {
          title: post.title,
          metaDescription: post.excerpt,
          focusKeyphrase: post.seo?.focusKeyphrase,
          tags: post.tags?.map(t => t.name) || []
        },
        analysis: improvements.seo,
        aiSuggestions: seoSuggestions,
        recommendations: this.generateSEORecommendations(improvements.seo, seoSuggestions),
        metadata: aiMetadata.seo,
        actionItems: this.generateSEOActionItems(improvements.seo)
      };

      return {
        success: true,
        data: seoResults,
        message: 'Análisis SEO completado'
      };
    } catch (error) {
      logger.error('❌ SEO optimization failed:', error);
      throw error;
    }
  }

  /**
   * Generar tags para un post
   */
  async generateTags({ postId, slug, content, title, taskPrompt = null, config = {} }) {
    try {
      let post;
      
      if (postId) {
        post = await BlogPost.findById(postId)
          .select('title content slug tags category')
          .populate('tags', 'name slug')
          .populate('category', 'name slug')
          .lean();
      } else if (slug) {
        post = await BlogPost.findOne({ slug })
          .select('title content slug tags category')
          .populate('tags', 'name slug')
          .populate('category', 'name slug')
          .lean();
      } else if (content && title) {
        post = { title, content, tags: [] };
      }

      if (!post) {
        return {
          success: false,
          message: 'Post no encontrado'
        };
      }

      logger.info(`🏷️ Generating tags for: ${post.title}`);

      const tagSuggestions = suggestTags(post, post.content);
      
      let aiTags = [];
      if (openaiService.isAvailable() && taskPrompt) {
        const userInput = {
          title: post.title,
          main_topic: post.title,
          content: post.content.substring(0, 1500),
          technologies: 'Tecnologías mencionadas en el contenido',
          audience: 'Desarrolladores y profesionales técnicos',
          platform: 'Blog técnico web',
          seo_goals: 'Mejorar ranking y visibilidad',
          competition: 'Blogs técnicos similares',
          focus_areas: 'Tags balanceados entre popularidad y especificidad'
        };

        const prompt = this.personalizePrompt(taskPrompt, userInput);
        
        const aiResponse = await openaiService.generateCompletion(prompt, {
          temperature: config.temperature || 0.5,
          maxTokens: config.maxTokens || 1000
        });

        aiTags = this.extractTagsFromResponse(aiResponse);
      }

      const allTags = [
        ...tagSuggestions.suggested.map(s => s.tag),
        ...aiTags
      ];

      const uniqueTags = [...new Set(allTags)].slice(0, config.maxTagsPerPost || 10);

      const result = {
        postInfo: {
          id: post._id,
          title: post.title,
          slug: post.slug
        },
        currentTags: tagSuggestions.current,
        suggestedTags: uniqueTags,
        aiGenerated: aiTags,
        systemGenerated: tagSuggestions.suggested,
        recommendation: tagSuggestions.recommendation,
        autoApply: false
      };

      return {
        success: true,
        data: result,
        message: `Generados ${uniqueTags.length} tags sugeridos`
      };
    } catch (error) {
      logger.error('❌ Tag generation failed:', error);
      throw error;
    }
  }

  /**
   * Optimizar contenido para SEO
   */
  async optimizeContent({ postId, slug, content, taskPrompt = null, config = {} }) {
    try {
      let post;
      
      if (postId) {
        post = await BlogPost.findById(postId)
          .select('title content slug category tags')
          .populate('category', 'name slug')
          .populate('tags', 'name slug')
          .lean();
      } else if (slug) {
        post = await BlogPost.findOne({ slug })
          .select('title content slug category tags')
          .populate('category', 'name slug')
          .populate('tags', 'name slug')
          .lean();
      } else if (content) {
        post = { content, title: 'Temporal content' };
      }

      if (!post) {
        return {
          success: false,
          message: 'Post no encontrado'
        };
      }

      logger.info(`🔧 Optimizing content for: ${post.title || 'temporal content'}`);

      const improvements = suggestImprovements(post);

      let aiSuggestions = null;
      if (openaiService.isAvailable() && taskPrompt) {
        const userInput = {
          title: post.title,
          content: post.content.substring(0, 2000),
          content_type: 'Artículo técnico',
          technical_level: 'Intermedio',
          audience_role: 'Desarrollador Full Stack',
          audience_goals: 'Aprender y aplicar nuevas tecnologías',
          improvement_goals: 'Mejorar engagement y valor técnico'
        };

        const prompt = this.personalizePrompt(taskPrompt, userInput);
        
        aiSuggestions = await openaiService.generateCompletion(prompt, {
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 2000
        });
      }

      const optimizationResults = {
        postInfo: {
          id: post._id,
          title: post.title,
          slug: post.slug,
          currentSEOScore: improvements.score.total
        },
        improvements,
        aiSuggestions,
        recommendations: this.generateContentRecommendations(improvements),
        actionableSteps: this.generateActionableSteps(improvements)
      };

      return {
        success: true,
        data: optimizationResults,
        message: 'Contenido optimizado exitosamente'
      };
    } catch (error) {
      logger.error('❌ Content optimization failed:', error);
      throw error;
    }
  }

  // ============ Métodos auxiliares ============

  personalizePrompt(template, userInput) {
    let personalizedTemplate = template;

    const replacements = {
      '{title}': userInput.title || 'Sin título especificado',
      '{content}': userInput.content || 'Sin contenido especificado',
      '{url}': userInput.url || 'URL no especificada',
      '{audience}': userInput.audience || 'Desarrolladores y profesionales técnicos',
      '{target_keywords}': userInput.target_keywords || 'No especificadas',
      '{focus_areas}': userInput.focus_areas || 'Optimización general',
      '{content_type}': userInput.content_type || 'Artículo técnico',
      '{technical_level}': userInput.technical_level || 'Intermedio',
      '{audience_role}': userInput.audience_role || 'Desarrollador Full Stack',
      '{audience_goals}': userInput.audience_goals || 'Aprender y aplicar nuevas tecnologías',
      '{improvement_goals}': userInput.improvement_goals || 'Mejorar engagement y valor técnico',
      '{main_topic}': userInput.main_topic || userInput.title || 'Tema no especificado',
      '{technologies}': userInput.technologies || 'Tecnologías web modernas',
      '{platform}': userInput.platform || 'Blog técnico web',
      '{seo_goals}': userInput.seo_goals || 'Mejorar ranking y visibilidad',
      '{competition}': userInput.competition || 'Blogs técnicos similares'
    };

    Object.keys(replacements).forEach(variable => {
      personalizedTemplate = personalizedTemplate.replace(
        new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), 
        replacements[variable]
      );
    });

    return personalizedTemplate;
  }

  extractTagsFromResponse(response) {
    const tags = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      const matches = line.match(/[-*•]\s*([a-zA-Z0-9\s]+)/);
      if (matches && matches[1]) {
        tags.push(matches[1].trim());
      }
    }
    
    return tags.slice(0, 10);
  }

  generateSEORecommendations(seoAnalysis, aiSuggestions) {
    const recommendations = [];
    
    if (aiSuggestions) {
      recommendations.push({
        type: 'ai_optimization',
        suggested: aiSuggestions,
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  generateSEOActionItems(seoAnalysis) {
    const actionItems = [];
    
    actionItems.push({
      action: 'review_title',
      description: 'Revisar y optimizar el título',
      priority: 'high'
    });
    
    actionItems.push({
      action: 'add_meta_description',
      description: 'Agregar meta descripción atractiva',
      priority: 'high'
    });
    
    return actionItems;
  }

  generateContentRecommendations(improvements) {
    const recommendations = [];
    
    if (improvements.score.readability < 60) {
      recommendations.push({
        type: 'readability',
        priority: 'high',
        message: 'Mejorar la legibilidad del contenido',
        actions: ['Usar oraciones más cortas', 'Simplificar vocabulario', 'Agregar subtítulos']
      });
    }
    
    if (improvements.score.seo < 70) {
      recommendations.push({
        type: 'seo',
        priority: 'high',
        message: 'Optimizar para SEO',
        actions: ['Mejorar título', 'Agregar meta descripción', 'Incluir keywords relevantes']
      });
    }
    
    return recommendations;
  }

  generateActionableSteps(improvements) {
    const steps = [];
    
    improvements.tags.suggested.slice(0, 3).forEach(tag => {
      steps.push({
        action: 'add_tag',
        description: `Agregar tag: "${tag.tag}"`,
        priority: tag.confidence > 0.8 ? 'high' : 'medium'
      });
    });
    
    improvements.keywords.suggested.slice(0, 2).forEach(keyword => {
      steps.push({
        action: 'add_keyword',
        description: `Incluir keyword: "${keyword}"`,
        priority: 'medium'
      });
    });
    
    return steps;
  }
}

export default new BlogSEOService();
