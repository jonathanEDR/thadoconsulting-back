/**
 * Controlador AI SEO
 * Endpoints para metadata AI, análisis semántico, formatos conversacionales
 */

import BlogPost from '../models/BlogPost.js';
import {
  generateConversationalFormat,
  generateQAFromContent,
  generateExtendedJSONLD,
  generateLLMMetadata,
  generateMarkdownFormat,
  generateFAQSchema,
  generateHowToSchema
} from '../utils/aiContentGenerator.js';

import {
  analyzeContent,
  extractKeywords,
  extractEntities,
  extractTopics,
  analyzeSentiment,
  analyzeReadability,
  analyzeStructure,
  extractKeyPhrases
} from '../utils/semanticAnalyzer.js';

import {
  generateAIMetadata,
  generateSummary
} from '../utils/aiMetadataGenerator.js';

import {
  suggestImprovements,
  suggestTags,
  suggestKeywords,
  calculateContentScore
} from '../utils/contentEnhancer.js';

/**
 * GET /api/blog/ai/metadata/:slug
 * Obtener metadata AI completa de un post
 */
export const getAIMetadata = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug, isPublished: true })
      .populate('author', 'firstName lastName email')
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const metadata = generateAIMetadata(post);
    
    res.json({
      success: true,
      data: metadata
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar AI metadata',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/ai/conversational/:slug
 * Obtener formato conversacional para LLMs
 */
export const getConversationalFormat = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug, isPublished: true })
      .populate('author', 'firstName lastName')
      .populate('category', 'name')
      .populate('tags', 'name')
      .lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const conversational = generateConversationalFormat(post);
    
    res.json({
      success: true,
      data: conversational
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar formato conversacional',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/ai/qa/:slug
 * Obtener formato Q&A del contenido
 */
export const getQAFormat = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug, isPublished: true })
      .populate('category', 'name')
      .populate('tags', 'name')
      .lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const qa = generateQAFromContent(post);
    
    res.json({
      success: true,
      data: {
        postTitle: post.title,
        postSlug: post.slug,
        questions: qa,
        totalQuestions: qa.length
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar formato Q&A',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/ai/semantic-analysis/:slug
 * Análisis semántico completo del contenido
 */
export const getSemanticAnalysis = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug })
      .populate('tags', 'name')
      .lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const analysis = analyzeContent(post.content, {
      maxKeywords: 20
    });
    
    res.json({
      success: true,
      data: {
        postTitle: post.title,
        postSlug: post.slug,
        analysis,
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al analizar contenido',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/ai/markdown/:slug
 * Obtener contenido en formato Markdown limpio
 */
export const getMarkdownFormat = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug, isPublished: true })
      .populate('author', 'firstName lastName')
      .populate('category', 'name')
      .populate('tags', 'name')
      .lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const markdown = generateMarkdownFormat(post);
    
    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.send(markdown);
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar Markdown',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/ai/json-ld-extended/:slug
 * Obtener JSON-LD extendido para AI
 */
export const getExtendedJSONLD = async (req, res) => {
  try {
    const { slug } = req.params;
    const baseUrl = req.protocol + '://' + req.get('host');
    
    const post = await BlogPost.findOne({ slug, isPublished: true })
      .populate('author', 'firstName lastName email')
      .populate('tags', 'name')
      .lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const jsonld = generateExtendedJSONLD(post, baseUrl);
    
    res.json({
      success: true,
      data: jsonld,
      scriptTag: `<script type="application/ld+json">\n${JSON.stringify(jsonld, null, 2)}\n</script>`
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar JSON-LD extendido',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/ai/llm-metadata/:slug
 * Obtener metadata específica para LLMs
 */
export const getLLMMetadata = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug, isPublished: true })
      .populate('author', 'firstName lastName')
      .populate('category', 'name')
      .populate('tags', 'name')
      .lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const metadata = generateLLMMetadata(post);
    
    res.json({
      success: true,
      data: metadata
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar metadata LLM',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/ai/keywords/:slug
 * Extraer keywords y análisis de densidad
 */
export const getKeywords = async (req, res) => {
  try {
    const { slug } = req.params;
    const { limit = 20 } = req.query;
    
    const post = await BlogPost.findOne({ slug }).lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const cleanContent = post.content.replace(/<[^>]+>/g, '');
    const keywords = extractKeywords(cleanContent, parseInt(limit));
    const keyPhrases = extractKeyPhrases(cleanContent, 2);
    
    res.json({
      success: true,
      data: {
        postTitle: post.title,
        postSlug: post.slug,
        keywords,
        keyPhrases,
        totalKeywords: keywords.length,
        totalKeyPhrases: keyPhrases.length
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al extraer keywords',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/ai/entities/:slug
 * Extraer entidades nombradas
 */
export const getEntities = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug }).lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const cleanContent = post.content.replace(/<[^>]+>/g, '');
    const entities = extractEntities(cleanContent);
    
    res.json({
      success: true,
      data: {
        postTitle: post.title,
        postSlug: post.slug,
        entities
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al extraer entidades',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/ai/topics/:slug
 * Extraer tópicos principales
 */
export const getTopics = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug }).lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const cleanContent = post.content.replace(/<[^>]+>/g, '');
    const topics = extractTopics(cleanContent);
    
    res.json({
      success: true,
      data: {
        postTitle: post.title,
        postSlug: post.slug,
        topics,
        primaryTopic: topics[0] || null
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al extraer tópicos',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/ai/readability/:slug
 * Análisis de legibilidad
 */
export const getReadabilityAnalysis = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug }).lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const cleanContent = post.content.replace(/<[^>]+>/g, '');
    const readability = analyzeReadability(cleanContent);
    
    res.json({
      success: true,
      data: {
        postTitle: post.title,
        postSlug: post.slug,
        readability
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al analizar legibilidad',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/ai/sentiment/:slug
 * Análisis de sentimiento
 */
export const getSentimentAnalysis = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug }).lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const cleanContent = post.content.replace(/<[^>]+>/g, '');
    const sentiment = analyzeSentiment(cleanContent);
    
    res.json({
      success: true,
      data: {
        postTitle: post.title,
        postSlug: post.slug,
        sentiment
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al analizar sentimiento',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/ai/structure/:slug
 * Análisis de estructura del contenido
 */
export const getStructureAnalysis = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug }).lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const structure = analyzeStructure(post.content);
    
    res.json({
      success: true,
      data: {
        postTitle: post.title,
        postSlug: post.slug,
        structure
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al analizar estructura',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/ai/suggestions/:slug
 * Sugerencias de mejora para un post
 */
export const getImprovementSuggestions = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug })
      .populate('tags', 'name')
      .populate('category', 'name')
      .lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const suggestions = suggestImprovements(post);
    
    res.json({
      success: true,
      data: {
        postTitle: post.title,
        postSlug: post.slug,
        suggestions,
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al generar sugerencias',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/ai/suggest-tags/:slug
 * Sugerir tags automáticamente
 */
export const getSuggestedTags = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug })
      .populate('tags', 'name')
      .lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const cleanContent = post.content.replace(/<[^>]+>/g, '');
    const tagSuggestions = suggestTags(post, cleanContent);
    
    res.json({
      success: true,
      data: {
        postTitle: post.title,
        postSlug: post.slug,
        ...tagSuggestions
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al sugerir tags',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/ai/suggest-keywords/:slug
 * Sugerir keywords SEO
 */
export const getSuggestedKeywords = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug }).lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const cleanContent = post.content.replace(/<[^>]+>/g, '');
    const keywordSuggestions = suggestKeywords(cleanContent, post.seo?.focusKeyphrase);
    
    res.json({
      success: true,
      data: {
        postTitle: post.title,
        postSlug: post.slug,
        ...keywordSuggestions
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al sugerir keywords',
      message: error.message
    });
  }
};

/**
 * GET /api/blog/ai/content-score/:slug
 * Calcular score global del contenido
 */
export const getContentScore = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug })
      .populate('tags', 'name')
      .populate('category', 'name')
      .lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    const score = calculateContentScore(post);
    
    res.json({
      success: true,
      data: {
        postTitle: post.title,
        postSlug: post.slug,
        score,
        calculatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al calcular content score',
      message: error.message
    });
  }
};

/**
 * POST /api/blog/ai/optimize/:slug
 * Optimizar post automáticamente con AI (requiere autenticación)
 */
export const optimizePost = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug })
      .populate('author', 'firstName lastName')
      .populate('category', 'name')
      .populate('tags', 'name');
    
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    
    // Realizar análisis completo
    const cleanContent = post.content.replace(/<[^>]+>/g, '');
    const analysis = analyzeContent(cleanContent, { maxKeywords: 20 });
    const aiMetadata = generateAIMetadata(post.toObject());
    const contentScore = calculateContentScore(post.toObject());
    
    // Actualizar campos AI en el post
    post.aiOptimization.aiMetadata = {
      primaryKeywords: aiMetadata.primaryKeywords,
      secondaryKeywords: aiMetadata.secondaryKeywords,
      detectedTopics: aiMetadata.topics,
      targetAudience: aiMetadata.targetAudience,
      expertiseLevel: aiMetadata.entities.expertise || 'intermediate',
      contentFormat: aiMetadata.contentFeatures.format,
      tone: aiMetadata.contentFeatures.tone
    };
    
    post.aiOptimization.semanticAnalysis = {
      keywords: analysis.keywords.slice(0, 15).map(k => ({
        word: k.word,
        frequency: k.frequency,
        relevance: k.relevance
      })),
      entities: {
        technologies: analysis.entities.technologies.map(t => t.name),
        concepts: analysis.entities.concepts.map(c => c.name)
      },
      topics: analysis.topics,
      readabilityScore: analysis.readability.fleschScore || 0,
      sentimentScore: analysis.sentiment.score || 0
    };
    
    post.aiOptimization.conversationalData = {
      summary: generateSummary(post.toObject()),
      keyTakeaways: aiMetadata.keyPoints.map(kp => kp.text),
      answersQuestions: aiMetadata.answersQuestions
    };
    
    post.aiOptimization.contentScore = {
      total: contentScore.total,
      seo: contentScore.breakdown.seo,
      readability: contentScore.breakdown.readability,
      structure: contentScore.breakdown.structure,
      engagement: contentScore.breakdown.engagement,
      grade: contentScore.grade,
      lastCalculated: new Date()
    };
    
    post.aiOptimization.isAIOptimized = true;
    post.aiOptimization.aiOptimizedAt = new Date();
    post.aiOptimization.seoScore = contentScore.breakdown.seo;
    
    await post.save();
    
    res.json({
      success: true,
      message: 'Post optimizado con AI exitosamente',
      data: {
        postTitle: post.title,
        postSlug: post.slug,
        contentScore: contentScore.total,
        grade: contentScore.grade,
        isAIOptimized: true,
        optimizedAt: post.aiOptimization.aiOptimizedAt
      }
    });
    
  } catch (error) {
        res.status(500).json({
      error: 'Error al optimizar post',
      message: error.message
    });
  }
};

export default {
  getAIMetadata,
  getConversationalFormat,
  getQAFormat,
  getSemanticAnalysis,
  getMarkdownFormat,
  getExtendedJSONLD,
  getLLMMetadata,
  getKeywords,
  getEntities,
  getTopics,
  getReadabilityAnalysis,
  getSentimentAnalysis,
  getStructureAnalysis,
  getImprovementSuggestions,
  getSuggestedTags,
  getSuggestedKeywords,
  getContentScore,
  optimizePost
};
