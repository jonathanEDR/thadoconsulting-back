/**
 * Sistema de Monitoreo de SEO para BlogAgent
 * Monitorea y registra métricas de calidad de contenido y SEO
 */

import BlogPost from '../models/BlogPost.js';
import logger from './logger.js';

class SEOMonitor {
  constructor() {
    this.metrics = {
      totalPosts: 0,
      avgSEOScore: 0,
      postsWithHeaders: 0,
      postsWithLists: 0,
      postsWithCode: 0,
      avgWordCount: 0,
      avgParagraphLength: 0,
      lastUpdated: null
    };
  }

  /**
   * Analizar un post individual y retornar métricas detalladas
   */
  analyzePost(content, title) {
    const metrics = {
      wordCount: 0,
      paragraphCount: 0,
      avgWordsPerParagraph: 0,
      hasHeaders: false,
      hasList: false,
      hasCodeBlocks: false,
      hasBoldText: false,
      seoScore: 0,
      readabilityScore: 0,
      structureScore: 0
    };

    // Contar palabras
    metrics.wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

    // Analizar párrafos
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    metrics.paragraphCount = paragraphs.length;
    metrics.avgWordsPerParagraph = paragraphs.length > 0 
      ? paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0) / paragraphs.length 
      : 0;

    // Detectar elementos estructurales
    metrics.hasHeaders = content.includes('##');
    metrics.hasList = content.match(/^[-*]\s/m) !== null || content.match(/^\d+\.\s/m) !== null;
    metrics.hasCodeBlocks = content.includes('```');
    metrics.hasBoldText = content.includes('**');

    // Calcular scores
    metrics.seoScore = this.calculateSEOScore(content, title);
    metrics.readabilityScore = this.calculateReadabilityScore(metrics);
    metrics.structureScore = this.calculateStructureScore(metrics);

    return metrics;
  }

  /**
   * Calcular score SEO (mismo algoritmo que BlogContentService)
   */
  calculateSEOScore(content, title) {
    let score = 40;
    const wordCount = content.split(/\s+/).length;
    
    if (wordCount >= 300) score += 5;
    if (wordCount >= 600) score += 5;
    if (wordCount >= 800) score += 5;
    
    if (content.includes('##')) score += 10;
    if (content.match(/^[-*]\s/m)) score += 5;
    if (content.includes('```')) score += 5;
    if (content.includes('**')) score += 3;
    
    const titleWords = title.toLowerCase().split(' ').filter(w => w.length > 3);
    const contentLower = content.toLowerCase();
    const keywordMatches = titleWords.filter(word => contentLower.includes(word)).length;
    score += Math.min(keywordMatches * 3, 12);
    
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    if (paragraphs.length >= 4) score += 5;
    if (paragraphs.length >= 6) score += 5;
    
    const avgWordsPerParagraph = paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0) / paragraphs.length;
    if (avgWordsPerParagraph <= 80) score += 5;
    if (avgWordsPerParagraph <= 60) score += 3;
    
    if (content.toLowerCase().includes('conclusión') || 
        content.toLowerCase().includes('resumen') ||
        content.toLowerCase().includes('en resumen')) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Calcular score de legibilidad
   */
  calculateReadabilityScore(metrics) {
    let score = 50;

    // Longitud de párrafos
    if (metrics.avgWordsPerParagraph <= 80) score += 20;
    else if (metrics.avgWordsPerParagraph <= 100) score += 10;
    else score -= 10;

    // Cantidad de párrafos
    if (metrics.paragraphCount >= 5) score += 15;
    else if (metrics.paragraphCount >= 3) score += 10;

    // Estructura visual
    if (metrics.hasList) score += 10;
    if (metrics.hasHeaders) score += 5;

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Calcular score de estructura
   */
  calculateStructureScore(metrics) {
    let score = 0;

    if (metrics.hasHeaders) score += 25;
    if (metrics.hasList) score += 25;
    if (metrics.hasCodeBlocks) score += 25;
    if (metrics.hasBoldText) score += 15;
    if (metrics.paragraphCount >= 5) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Obtener métricas agregadas de todos los posts
   */
  async getAggregatedMetrics(options = {}) {
    try {
      const { 
        category = null, 
        startDate = null, 
        endDate = null,
        limit = 100 
      } = options;

      const query = { status: 'published' };
      if (category) query.category = category;
      if (startDate || endDate) {
        query.publishedAt = {};
        if (startDate) query.publishedAt.$gte = new Date(startDate);
        if (endDate) query.publishedAt.$lte = new Date(endDate);
      }

      const posts = await BlogPost.find(query)
        .select('title content publishedAt seo')
        .limit(limit)
        .lean();

      if (posts.length === 0) {
        return {
          success: false,
          message: 'No hay posts para analizar',
          data: null
        };
      }

      // Analizar cada post
      const analyses = posts.map(post => ({
        id: post._id,
        title: post.title,
        publishedAt: post.publishedAt,
        metrics: this.analyzePost(post.content, post.title)
      }));

      // Calcular promedios
      const totals = analyses.reduce((acc, analysis) => {
        const m = analysis.metrics;
        acc.wordCount += m.wordCount;
        acc.seoScore += m.seoScore;
        acc.readabilityScore += m.readabilityScore;
        acc.structureScore += m.structureScore;
        acc.avgWordsPerParagraph += m.avgWordsPerParagraph;
        if (m.hasHeaders) acc.withHeaders++;
        if (m.hasList) acc.withLists++;
        if (m.hasCodeBlocks) acc.withCode++;
        if (m.hasBoldText) acc.withBold++;
        return acc;
      }, {
        wordCount: 0,
        seoScore: 0,
        readabilityScore: 0,
        structureScore: 0,
        avgWordsPerParagraph: 0,
        withHeaders: 0,
        withLists: 0,
        withCode: 0,
        withBold: 0
      });

      const count = posts.length;

      // Calcular distribuciones
      const seoDistribution = {
        excellent: analyses.filter(a => a.metrics.seoScore >= 90).length,
        good: analyses.filter(a => a.metrics.seoScore >= 70 && a.metrics.seoScore < 90).length,
        average: analyses.filter(a => a.metrics.seoScore >= 50 && a.metrics.seoScore < 70).length,
        poor: analyses.filter(a => a.metrics.seoScore < 50).length
      };

      const result = {
        success: true,
        data: {
          overview: {
            totalPosts: count,
            analyzedPeriod: {
              start: startDate || posts[posts.length - 1].publishedAt,
              end: endDate || posts[0].publishedAt
            },
            category: category || 'Todas las categorías'
          },
          averages: {
            seoScore: (totals.seoScore / count).toFixed(1),
            readabilityScore: (totals.readabilityScore / count).toFixed(1),
            structureScore: (totals.structureScore / count).toFixed(1),
            wordCount: Math.round(totals.wordCount / count),
            wordsPerParagraph: (totals.avgWordsPerParagraph / count).toFixed(1)
          },
          structure: {
            withHeaders: `${((totals.withHeaders / count) * 100).toFixed(1)}%`,
            withLists: `${((totals.withLists / count) * 100).toFixed(1)}%`,
            withCodeBlocks: `${((totals.withCode / count) * 100).toFixed(1)}%`,
            withBoldText: `${((totals.withBold / count) * 100).toFixed(1)}%`
          },
          seoDistribution,
          topPosts: analyses
            .sort((a, b) => b.metrics.seoScore - a.metrics.seoScore)
            .slice(0, 5)
            .map(a => ({
              title: a.title,
              seoScore: a.metrics.seoScore,
              wordCount: a.metrics.wordCount,
              publishedAt: a.publishedAt
            })),
          bottomPosts: analyses
            .sort((a, b) => a.metrics.seoScore - b.metrics.seoScore)
            .slice(0, 5)
            .map(a => ({
              title: a.title,
              seoScore: a.metrics.seoScore,
              wordCount: a.metrics.wordCount,
              publishedAt: a.publishedAt
            })),
          recommendations: this.generateRecommendations(totals, count, seoDistribution)
        },
        generatedAt: new Date().toISOString()
      };

      // Actualizar métricas internas
      this.updateInternalMetrics(result.data);

      logger.info('📊 SEO metrics generated successfully');
      return result;

    } catch (error) {
      logger.error('❌ Error generating SEO metrics:', error);
      throw error;
    }
  }

  /**
   * Generar recomendaciones basadas en métricas
   */
  generateRecommendations(totals, count, distribution) {
    const recommendations = [];
    const avgSEO = totals.seoScore / count;
    const avgReadability = totals.readabilityScore / count;
    const avgStructure = totals.structureScore / count;
    const headersPercent = (totals.withHeaders / count) * 100;
    const listsPercent = (totals.withLists / count) * 100;

    if (avgSEO < 70) {
      recommendations.push({
        priority: 'high',
        category: 'SEO',
        message: `Score SEO promedio bajo (${avgSEO.toFixed(1)}). Mejorar estructura y palabras clave.`
      });
    }

    if (headersPercent < 80) {
      recommendations.push({
        priority: 'high',
        category: 'Estructura',
        message: `Solo ${headersPercent.toFixed(1)}% de posts tienen headers. Agregar secciones con ##.`
      });
    }

    if (listsPercent < 60) {
      recommendations.push({
        priority: 'medium',
        category: 'Estructura',
        message: `Solo ${listsPercent.toFixed(1)}% de posts tienen listas. Usar viñetas para mejor legibilidad.`
      });
    }

    if (avgReadability < 60) {
      recommendations.push({
        priority: 'high',
        category: 'Legibilidad',
        message: `Legibilidad baja (${avgReadability.toFixed(1)}). Reducir longitud de párrafos.`
      });
    }

    if (distribution.excellent / count < 0.5) {
      recommendations.push({
        priority: 'medium',
        category: 'Calidad',
        message: `Menos del 50% de posts tienen score SEO excelente (90+). Aplicar mejores prácticas.`
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        category: 'Éxito',
        message: '¡Excelente trabajo! Todos los indicadores están en niveles óptimos.'
      });
    }

    return recommendations;
  }

  /**
   * Actualizar métricas internas
   */
  updateInternalMetrics(data) {
    this.metrics.totalPosts = data.overview.totalPosts;
    this.metrics.avgSEOScore = parseFloat(data.averages.seoScore);
    this.metrics.avgWordCount = data.averages.wordCount;
    this.metrics.avgParagraphLength = parseFloat(data.averages.wordsPerParagraph);
    this.metrics.lastUpdated = new Date();
  }

  /**
   * Obtener reporte completo en formato legible
   */
  async generateReport(options = {}) {
    const metrics = await this.getAggregatedMetrics(options);
    
    if (!metrics.success) {
      return metrics;
    }

    const { data } = metrics;
    
    let report = `
╔════════════════════════════════════════════════════════════╗
║           📊 REPORTE DE MONITOREO SEO - BLOG              ║
╚════════════════════════════════════════════════════════════╝

📅 Período: ${new Date(data.overview.analyzedPeriod.start).toLocaleDateString()} - ${new Date(data.overview.analyzedPeriod.end).toLocaleDateString()}
📁 Categoría: ${data.overview.category}
📝 Posts analizados: ${data.overview.totalPosts}

═══════════════════════════════════════════════════════════════
📈 MÉTRICAS PROMEDIO
═══════════════════════════════════════════════════════════════

🎯 Score SEO:           ${data.averages.seoScore}/100
📖 Legibilidad:         ${data.averages.readabilityScore}/100
🏗️  Estructura:          ${data.averages.structureScore}/100
📝 Palabras por post:   ${data.averages.wordCount}
📄 Palabras/párrafo:    ${data.averages.wordsPerParagraph}

═══════════════════════════════════════════════════════════════
🏗️  ELEMENTOS ESTRUCTURALES
═══════════════════════════════════════════════════════════════

✓ Headers (##):         ${data.structure.withHeaders}
✓ Listas:               ${data.structure.withLists}
✓ Bloques de código:    ${data.structure.withCodeBlocks}
✓ Texto en negrita:     ${data.structure.withBoldText}

═══════════════════════════════════════════════════════════════
📊 DISTRIBUCIÓN DE CALIDAD SEO
═══════════════════════════════════════════════════════════════

🌟 Excelente (90-100):  ${data.seoDistribution.excellent} posts
✅ Bueno (70-89):       ${data.seoDistribution.good} posts
⚠️  Promedio (50-69):   ${data.seoDistribution.average} posts
❌ Bajo (<50):          ${data.seoDistribution.poor} posts

═══════════════════════════════════════════════════════════════
🏆 TOP 5 MEJORES POSTS
═══════════════════════════════════════════════════════════════
`;

    data.topPosts.forEach((post, i) => {
      report += `\n${i + 1}. "${post.title.substring(0, 50)}..." (SEO: ${post.seoScore}/100)`;
    });

    report += `\n
═══════════════════════════════════════════════════════════════
💡 RECOMENDACIONES
═══════════════════════════════════════════════════════════════
`;

    data.recommendations.forEach((rec, i) => {
      const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      report += `\n${icon} [${rec.category}] ${rec.message}`;
    });

    report += `\n\n═══════════════════════════════════════════════════════════════\n`;

    return {
      success: true,
      report,
      data,
      generatedAt: metrics.generatedAt
    };
  }
}

// Exportar singleton
const seoMonitor = new SEOMonitor();
export default seoMonitor;
