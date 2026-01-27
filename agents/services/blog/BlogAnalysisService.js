/**
 * BlogAnalysisService - Servicio para análisis de contenido y rendimiento
 * Responsabilidades:
 * - Análisis de contenido de posts
 * - Análisis de rendimiento del blog
 * - Cálculo de métricas y estadísticas
 * - Generación de insights
 */

import BlogPost from '../../../models/BlogPost.js';
import { analyzeContent, extractKeywords, extractTopics } from '../../../utils/semanticAnalyzer.js';
import { suggestImprovements } from '../../../utils/contentEnhancer.js';
import logger from '../../../utils/logger.js';

class BlogAnalysisService {
  /**
   * Analizar contenido de posts
   */
  async analyzeContent({ postId, slug, category, limit = 10 }) {
    try {
      const safeLimit = Math.min(parseInt(limit) || 10, 50);
      let posts;

      if (postId) {
        posts = await BlogPost.findById(postId)
          .select('title slug content category tags author views likes readingTime publishedAt')
          .populate('category', 'name slug')
          .populate('tags', 'name slug')
          .lean();
        posts = posts ? [posts] : [];
      } else if (slug) {
        posts = await BlogPost.find({ slug })
          .select('title slug content category tags author views likes readingTime publishedAt')
          .populate('category', 'name slug')
          .populate('tags', 'name slug')
          .lean();
      } else if (category) {
        const categoryDoc = await BlogCategory.findOne({ 
          $or: [{ slug: category }, { name: category }] 
        });
        
        if (categoryDoc) {
          posts = await BlogPost.find({ category: categoryDoc._id, isPublished: true })
            .select('title slug content category tags author views likes readingTime publishedAt')
            .populate('category', 'name slug')
            .populate('tags', 'name slug')
            .sort({ publishedAt: -1 })
            .limit(safeLimit)
            .lean();
        }
      } else {
        posts = await BlogPost.find({ isPublished: true })
          .select('title slug content category tags author views likes readingTime publishedAt')
          .populate('category', 'name slug')
          .populate('tags', 'name slug')
          .sort({ publishedAt: -1 })
          .limit(safeLimit)
          .lean();
      }

      if (!posts?.length) {
        return {
          success: false,
          message: 'No se encontraron posts para analizar'
        };
      }

      logger.info(`📊 Analyzing ${posts.length} posts`);

      const analysisResults = {
        totalPosts: posts.length,
        posts: [],
        globalStats: {
          averageScore: 0,
          totalWords: 0,
          averageReadingTime: 0,
          topKeywords: [],
          topTopics: [],
          seoDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 }
        }
      };

      let totalScore = 0;
      let totalWords = 0;
      let totalReadingTime = 0;
      const allKeywords = [];
      const allTopics = [];

      for (const post of posts) {
        const analysis = analyzeContent(post.content);
        const improvements = suggestImprovements(post);
        const keywords = extractKeywords(post.content, 10);
        const topics = extractTopics(post.content);

        const postAnalysis = {
          id: post._id,
          title: post.title,
          slug: post.slug,
          category: post.category?.name,
          wordCount: analysis.wordCount,
          readingTime: post.readingTime || analysis.readingTime,
          seoScore: improvements.score.total,
          keywords: keywords.slice(0, 5),
          topics: topics.slice(0, 3),
          improvements: improvements.score
        };

        analysisResults.posts.push(postAnalysis);
        totalScore += improvements.score.total;
        totalWords += analysis.wordCount;
        totalReadingTime += post.readingTime || analysis.readingTime;
        allKeywords.push(...keywords);
        allTopics.push(...topics);

        const scoreRange = this.getScoreRange(improvements.score.total);
        analysisResults.globalStats.seoDistribution[scoreRange]++;
      }

      analysisResults.globalStats.averageScore = totalScore / posts.length;
      analysisResults.globalStats.totalWords = totalWords;
      analysisResults.globalStats.averageReadingTime = totalReadingTime / posts.length;
      analysisResults.globalStats.topKeywords = this.getTopItems(allKeywords, 10);
      analysisResults.globalStats.topTopics = this.getTopItems(allTopics, 5);

      return {
        success: true,
        data: analysisResults,
        message: `Análisis completado de ${posts.length} posts`
      };
    } catch (error) {
      logger.error('❌ Content analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analizar rendimiento del blog
   */
  async analyzePerformance({ timeframe = '30d', category }) {
    try {
      logger.info(`📈 Analyzing blog performance for ${timeframe}`);

      const startDate = this.calculateStartDate(timeframe);
      const query = { 
        isPublished: true,
        publishedAt: { $gte: startDate }
      };

      if (category) {
        const categoryDoc = await BlogCategory.findOne({
          $or: [{ slug: category }, { name: category }]
        });
        if (categoryDoc) {
          query.category = categoryDoc._id;
        }
      }

      const posts = await BlogPost.find(query)
        .populate('category', 'name slug')
        .populate('tags', 'name slug')
        .populate('author', 'firstName lastName')
        .sort({ publishedAt: -1 })
        .limit(100)
        .lean();

      const metrics = {
        totalPosts: posts.length,
        totalViews: posts.reduce((sum, post) => sum + (post.views || 0), 0),
        totalLikes: posts.reduce((sum, post) => sum + (post.likes || 0), 0),
        averageReadingTime: posts.reduce((sum, post) => sum + (post.readingTime || 0), 0) / posts.length,
        topPerformers: posts
          .sort((a, b) => (b.views || 0) - (a.views || 0))
          .slice(0, 5)
          .map(post => ({
            title: post.title,
            slug: post.slug,
            views: post.views || 0,
            likes: post.likes || 0,
            category: post.category?.name
          })),
        categoryDistribution: this.calculateCategoryDistribution(posts),
        publishingTrends: this.calculatePublishingTrends(posts)
      };

      const previousStartDate = this.calculatePreviousStartDate(startDate, timeframe);
      const previousPosts = await BlogPost.find({
        isPublished: true,
        publishedAt: { $gte: previousStartDate, $lt: startDate }
      })
        .select('analytics.views analytics.likes readingTime category publishedAt')
        .limit(100)
        .lean();

      const comparison = this.calculateComparison(posts, previousPosts);

      const performanceResults = {
        timeframe,
        period: {
          start: startDate,
          end: new Date()
        },
        metrics,
        comparison,
        insights: this.generatePerformanceInsights(metrics, comparison),
        recommendations: this.generatePerformanceRecommendations(metrics)
      };

      return {
        success: true,
        data: performanceResults,
        message: `Análisis de rendimiento completado para ${timeframe}`
      };
    } catch (error) {
      logger.error('❌ Performance analysis failed:', error);
      throw error;
    }
  }

  // ============ Métodos auxiliares ============

  getScoreRange(score) {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  getTopItems(items, limit) {
    const frequency = {};
    items.forEach(item => {
      const key = item.name || item.word || item;
      frequency[key] = (frequency[key] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  }

  calculateStartDate(timeframe) {
    const now = new Date();
    const value = parseInt(timeframe.match(/\d+/)?.[0]) || 30;
    const unit = timeframe.match(/[a-z]+/)?.[0] || 'd';
    
    switch (unit) {
      case 'd': return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      case 'w': return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
      case 'm': return new Date(now.getTime() - value * 30 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  calculatePreviousStartDate(startDate, timeframe) {
    const value = parseInt(timeframe.match(/\d+/)?.[0]) || 30;
    const unit = timeframe.match(/[a-z]+/)?.[0] || 'd';
    
    switch (unit) {
      case 'd': return new Date(startDate.getTime() - value * 24 * 60 * 60 * 1000);
      case 'w': return new Date(startDate.getTime() - value * 7 * 24 * 60 * 60 * 1000);
      case 'm': return new Date(startDate.getTime() - value * 30 * 24 * 60 * 60 * 1000);
      default: return new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  calculateCategoryDistribution(posts) {
    const distribution = {};
    posts.forEach(post => {
      const category = post.category?.name || 'Uncategorized';
      distribution[category] = (distribution[category] || 0) + 1;
    });
    return distribution;
  }

  calculatePublishingTrends(posts) {
    const trends = {};
    posts.forEach(post => {
      const date = post.publishedAt.toDateString();
      trends[date] = (trends[date] || 0) + 1;
    });
    return trends;
  }

  calculateComparison(currentPosts, previousPosts) {
    const current = {
      posts: currentPosts.length,
      views: currentPosts.reduce((sum, post) => sum + (post.views || 0), 0),
      likes: currentPosts.reduce((sum, post) => sum + (post.likes || 0), 0)
    };

    const previous = {
      posts: previousPosts.length,
      views: previousPosts.reduce((sum, post) => sum + (post.views || 0), 0),
      likes: previousPosts.reduce((sum, post) => sum + (post.likes || 0), 0)
    };

    return {
      posts: this.calculateGrowth(current.posts, previous.posts),
      views: this.calculateGrowth(current.views, previous.views),
      likes: this.calculateGrowth(current.likes, previous.likes)
    };
  }

  calculateGrowth(current, previous) {
    if (previous === 0) return { value: current, percentage: current > 0 ? 100 : 0 };
    const percentage = ((current - previous) / previous) * 100;
    return { value: current, percentage: Math.round(percentage * 100) / 100 };
  }

  generatePerformanceInsights(metrics, comparison) {
    const insights = [];

    if (comparison.views.percentage > 20) {
      insights.push('📈 Excelente crecimiento en visualizaciones');
    } else if (comparison.views.percentage < -10) {
      insights.push('📉 Disminución en visualizaciones - revisar estrategia');
    }

    if (metrics.topPerformers.length > 0) {
      insights.push(`🏆 Post más popular: "${metrics.topPerformers[0].title}"`);
    }

    return insights;
  }

  generatePerformanceRecommendations(metrics) {
    const recommendations = [];

    if (metrics.averageReadingTime < 2) {
      recommendations.push('📖 Crear contenido más profundo para aumentar tiempo de lectura');
    }

    if (metrics.totalLikes / metrics.totalViews < 0.05) {
      recommendations.push('👍 Mejorar engagement con call-to-actions más efectivos');
    }

    return recommendations;
  }
}

export default new BlogAnalysisService();
