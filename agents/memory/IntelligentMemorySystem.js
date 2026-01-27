/**
 * IntelligentMemorySystem - Sistema de memoria inteligente con aprendizaje adaptativo
 * Gestiona patrones de comportamiento, preferencias del usuario y optimización continua
 */

import mongoose from 'mongoose';
import logger from '../../utils/logger.js';

// Schema para patrones de interacción
const InteractionPatternSchema = new mongoose.Schema({
  patternId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  
  // Contexto del patrón
  context: {
    agentType: { type: String, required: true },
    taskType: { type: String },
    userRole: { type: String },
    domain: { type: String },
    complexity: { 
      type: String, 
      enum: ['simple', 'medium', 'complex', 'expert'], 
      default: 'medium' 
    }
  },
  
  // Datos del patrón
  pattern: {
    // Secuencia de acciones típica
    actionSequence: [{
      step: { type: Number },
      action: { type: String },
      parameters: { type: mongoose.Schema.Types.Mixed },
      success_rate: { type: Number, default: 0 },
      avg_duration: { type: Number, default: 0 }
    }],
    
    // Condiciones de activación
    triggers: [{
      condition: { type: String },
      probability: { type: Number, default: 0.5 },
      confidence: { type: Number, default: 0.5 }
    }],
    
    // Resultados esperados
    outcomes: [{
      type: { type: String },
      description: { type: String },
      success_indicators: [{ type: String }],
      failure_indicators: [{ type: String }]
    }]
  },
  
  // Métricas de rendimiento
  performance: {
    times_used: { type: Number, default: 0 },
    success_count: { type: Number, default: 0 },
    failure_count: { type: Number, default: 0 },
    avg_execution_time: { type: Number, default: 0 },
    avg_user_satisfaction: { type: Number, default: 0 },
    last_used: { type: Date },
    
    // Tendencias temporales
    weekly_usage: [{ 
      week: { type: Date }, 
      count: { type: Number, default: 0 } 
    }],
    monthly_performance: [{
      month: { type: Date },
      success_rate: { type: Number, default: 0 },
      avg_satisfaction: { type: Number, default: 0 }
    }]
  },
  
  // Aprendizaje y adaptación
  learning: {
    confidence_level: { type: Number, default: 0.5, min: 0, max: 1 },
    adaptation_count: { type: Number, default: 0 },
    last_adaptation: { type: Date },
    
    // Variaciones aprendidas
    learned_variations: [{
      variation_id: { type: String },
      description: { type: String },
      trigger_conditions: [{ type: String }],
      modifications: { type: mongoose.Schema.Types.Mixed },
      performance_delta: { type: Number, default: 0 }
    }]
  },
  
  // Estado y validez
  status: { 
    type: String, 
    enum: ['learning', 'stable', 'optimized', 'deprecated'], 
    default: 'learning' 
  },
  
  created_by: { type: String, default: 'system' },
  tags: [{ type: String }]
}, {
  timestamps: true,
  collection: 'interaction_patterns'
});

// Schema para preferencias de usuario
const UserPreferenceSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  
  // Preferencias de comunicación
  communication: {
    preferred_tone: { 
      type: String, 
      enum: ['formal', 'casual', 'professional', 'friendly', 'technical'],
      default: 'professional'
    },
    detail_level: {
      type: String,
      enum: ['brief', 'standard', 'detailed', 'comprehensive'],
      default: 'standard'
    },
    response_style: {
      type: String,
      enum: ['direct', 'explanatory', 'step_by_step', 'examples_heavy'],
      default: 'explanatory'
    },
    language_complexity: {
      type: String,
      enum: ['simple', 'standard', 'technical', 'expert'],
      default: 'standard'
    }
  },
  
  // Preferencias de tarea
  task_preferences: {
    preferred_analysis_depth: {
      type: String,
      enum: ['quick', 'standard', 'thorough', 'exhaustive'],
      default: 'standard'
    },
    include_examples: { type: Boolean, default: true },
    include_metrics: { type: Boolean, default: true },
    include_next_steps: { type: Boolean, default: true },
    prioritize_quick_wins: { type: Boolean, default: false }
  },
  
  // Dominios de interés y experiencia
  expertise: {
    primary_domains: [{ type: String }],
    skill_level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate'
    },
    interests: [{ type: String }],
    avoid_topics: [{ type: String }]
  },
  
  // Historial de interacciones
  interaction_history: {
    total_interactions: { type: Number, default: 0 },
    successful_interactions: { type: Number, default: 0 },
    avg_satisfaction_rating: { type: Number, default: 0 },
    most_common_tasks: [{ 
      task_type: { type: String }, 
      frequency: { type: Number, default: 0 } 
    }],
    
    // Patrones temporales
    activity_patterns: {
      preferred_times: [{ type: String }], // ['morning', 'afternoon', 'evening']
      typical_session_length: { type: Number, default: 0 }, // en minutos
      avg_tasks_per_session: { type: Number, default: 1 }
    }
  },
  
  // Aprendizaje personalizado
  learned_preferences: {
    // Preferencias inferidas automáticamente
    inferred_style: {
      communication_adaptations: [{ type: String }],
      task_adaptations: [{ type: String }],
      content_adaptations: [{ type: String }]
    },
    
    // Feedback histórico
    feedback_patterns: [{
      aspect: { type: String }, // 'tone', 'detail', 'speed', etc.
      preference_direction: { type: String }, // 'more', 'less', 'different'
      confidence: { type: Number, default: 0.5 },
      last_reinforcement: { type: Date }
    }]
  },
  
  // Configuración del sistema
  system_config: {
    auto_adapt: { type: Boolean, default: true },
    learning_enabled: { type: Boolean, default: true },
    feedback_sensitivity: { 
      type: String, 
      enum: ['low', 'medium', 'high'], 
      default: 'medium' 
    }
  }
}, {
  timestamps: true,
  collection: 'user_preferences'
});

// Índices para optimización
InteractionPatternSchema.index({ 'context.agentType': 1, 'context.taskType': 1 });
InteractionPatternSchema.index({ 'performance.success_count': -1 });
InteractionPatternSchema.index({ status: 1, 'learning.confidence_level': -1 });

// userId: índice creado automáticamente por unique: true
UserPreferenceSchema.index({ 'expertise.primary_domains': 1 });

const InteractionPattern = mongoose.model('InteractionPattern', InteractionPatternSchema);
const UserPreference = mongoose.model('UserPreference', UserPreferenceSchema);

export class IntelligentMemorySystem {
  constructor() {
    this.patternCache = new Map();
    this.userPreferenceCache = new Map();
    this.learningQueue = [];
    this.adaptationThresholds = {
      min_interactions: 5,
      confidence_threshold: 0.7,
      success_rate_threshold: 0.6
    };
    
    // Inicializar sistema de aprendizaje
    this.initializeLearningSystem();
    
    logger.info('🧠 IntelligentMemorySystem initialized with adaptive learning');
  }

  /**
   * Inicializar sistema de aprendizaje
   */
  initializeLearningSystem() {
    // Procesar cola de aprendizaje cada 5 minutos
    setInterval(() => {
      this.processLearningQueue();
    }, 5 * 60 * 1000);

    // Actualizar patrones cada hora
    setInterval(() => {
      this.updatePatternMetrics();
    }, 60 * 60 * 1000);

    // Limpiar caché cada 30 minutos
    setInterval(() => {
      this.cleanupCache();
    }, 30 * 60 * 1000);
  }

  /**
   * 🔧 FIX: Función faltante que causaba crashes del servidor
   */
  async updatePatternMetrics() {
    try {
      console.log('📊 Updating pattern metrics...');
      
      // Actualizar métricas de patrones existentes
      const patterns = await InteractionPattern.find({});
      
      for (const pattern of patterns) {
        // Calcular nueva tasa de éxito basada en interacciones recientes
        const recentInteractions = pattern.interactions || [];
        const successfulInteractions = recentInteractions.filter(i => i.success);
        const newSuccessRate = recentInteractions.length > 0 
          ? successfulInteractions.length / recentInteractions.length 
          : pattern.successRate || 0;
        
        // Actualizar patrón si hay cambios significativos
        if (Math.abs(newSuccessRate - (pattern.successRate || 0)) > 0.1) {
          pattern.successRate = newSuccessRate;
          pattern.lastUpdated = new Date();
          await pattern.save();
        }
      }
      
      console.log(`✅ Updated metrics for ${patterns.length} patterns`);
    } catch (error) {
      console.error('❌ Error updating pattern metrics:', error);
      // No lanzar error para evitar crashes
    }
  }

  /**
   * Obtener contexto inteligente para una interacción
   */
  async getIntelligentContext(userId, agentType, taskContext = {}) {
    try {
      // Obtener preferencias del usuario
      const userPreferences = await this.getUserPreferences(userId);
      
      // Encontrar patrones aplicables
      const applicablePatterns = await this.findApplicablePatterns(
        agentType, 
        taskContext.type, 
        userPreferences
      );
      
      // Generar contexto optimizado
      const intelligentContext = {
        user: {
          preferences: userPreferences,
          adaptations: this.generateUserAdaptations(userPreferences, taskContext)
        },
        
        patterns: {
          recommended: this.selectBestPatterns(applicablePatterns, taskContext),
          alternatives: applicablePatterns.slice(0, 3),
          success_indicators: this.extractSuccessIndicators(applicablePatterns)
        },
        
        optimization: {
          predicted_success_rate: this.predictSuccessRate(applicablePatterns, userPreferences),
          recommended_approach: this.recommendApproach(applicablePatterns, userPreferences),
          potential_issues: this.identifyPotentialIssues(taskContext, userPreferences),
          adaptation_suggestions: this.generateAdaptationSuggestions(userPreferences, taskContext)
        },
        
        learning: {
          should_learn: this.shouldLearnFromInteraction(userId, taskContext),
          learning_focus: this.identifyLearningFocus(userPreferences, taskContext),
          feedback_opportunities: this.identifyFeedbackOpportunities(taskContext)
        }
      };
      
      return intelligentContext;
      
    } catch (error) {
      logger.error('❌ Error getting intelligent context:', error);
      return this.getFallbackContext(userId, agentType, taskContext);
    }
  }

  /**
   * Obtener preferencias del usuario
   */
  async getUserPreferences(userId) {
    try {
      // Verificar caché
      const cacheKey = `user_prefs_${userId}`;
      if (this.userPreferenceCache.has(cacheKey)) {
        const cached = this.userPreferenceCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 15 * 60 * 1000) { // 15 minutos
          return cached.data;
        }
      }

      // Buscar en base de datos
      let preferences = await UserPreference.findOne({ userId });
      
      if (!preferences) {
        // Crear preferencias por defecto
        preferences = await this.createDefaultPreferences(userId);
      }
      
      // Guardar en caché
      this.userPreferenceCache.set(cacheKey, {
        data: preferences,
        timestamp: Date.now()
      });
      
      return preferences;
      
    } catch (error) {
      logger.error('❌ Error getting user preferences:', error);
      return await this.createDefaultPreferences(userId);
    }
  }

  /**
   * Crear preferencias por defecto para nuevo usuario
   */
  async createDefaultPreferences(userId) {
    try {
      const defaultPreferences = {
        userId,
        communication: {
          preferred_tone: 'professional',
          detail_level: 'standard',
          response_style: 'explanatory',
          language_complexity: 'standard'
        },
        task_preferences: {
          preferred_analysis_depth: 'standard',
          include_examples: true,
          include_metrics: true,
          include_next_steps: true,
          prioritize_quick_wins: false
        },
        expertise: {
          primary_domains: [],
          skill_level: 'intermediate',
          interests: [],
          avoid_topics: []
        },
        system_config: {
          auto_adapt: true,
          learning_enabled: true,
          feedback_sensitivity: 'medium'
        }
      };
      
      const preferences = await UserPreference.create(defaultPreferences);
      logger.info(`✅ Created default preferences for user: ${userId}`);
      
      return preferences;
      
    } catch (error) {
      logger.error('❌ Error creating default preferences:', error);
      throw error;
    }
  }

  /**
   * Encontrar patrones aplicables
   */
  async findApplicablePatterns(agentType, taskType, userPreferences) {
    try {
      const query = {
        'context.agentType': agentType,
        status: { $in: ['stable', 'optimized'] }
      };
      
      if (taskType) {
        query['context.taskType'] = taskType;
      }
      
      // Filtrar por dominio si el usuario tiene preferencias
      if (userPreferences?.expertise?.primary_domains?.length > 0) {
        query['context.domain'] = { 
          $in: userPreferences.expertise.primary_domains 
        };
      }
      
      const patterns = await InteractionPattern.find(query)
        .sort({ 
          'learning.confidence_level': -1,
          'performance.success_count': -1 
        })
        .limit(10);
      
      return patterns;
      
    } catch (error) {
      logger.error('❌ Error finding applicable patterns:', error);
      return [];
    }
  }

  /**
   * Seleccionar mejores patrones
   */
  selectBestPatterns(patterns, taskContext) {
    if (!patterns.length) return [];
    
    // Scoring basado en múltiples factores
    const scored = patterns.map(pattern => {
      let score = 0;
      
      // Confianza del patrón (30%)
      score += pattern.learning.confidence_level * 30;
      
      // Tasa de éxito (40%)
      const successRate = pattern.performance.success_count / 
                         (pattern.performance.success_count + pattern.performance.failure_count + 1);
      score += successRate * 40;
      
      // Uso reciente (20%)
      if (pattern.performance.last_used) {
        const daysSinceUse = (Date.now() - pattern.performance.last_used) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 20 - daysSinceUse);
      }
      
      // Complejidad apropiada (10%)
      if (pattern.context.complexity === taskContext.complexity) {
        score += 10;
      }
      
      return { pattern, score };
    });
    
    // Ordenar por score y retornar los mejores
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map(s => s.pattern);
  }

  /**
   * Generar adaptaciones para el usuario
   */
  generateUserAdaptations(userPreferences, taskContext) {
    const adaptations = {
      communication: [],
      content: [],
      structure: []
    };
    
    // Adaptaciones de comunicación
    switch (userPreferences.communication.preferred_tone) {
      case 'formal':
        adaptations.communication.push('use_formal_language');
        break;
      case 'casual':
        adaptations.communication.push('use_casual_tone');
        break;
      case 'technical':
        adaptations.communication.push('include_technical_details');
        break;
    }
    
    // Adaptaciones de contenido
    if (userPreferences.task_preferences.include_examples) {
      adaptations.content.push('include_practical_examples');
    }
    
    if (userPreferences.task_preferences.include_metrics) {
      adaptations.content.push('include_performance_metrics');
    }
    
    if (userPreferences.task_preferences.prioritize_quick_wins) {
      adaptations.content.push('prioritize_quick_implementations');
    }
    
    // Adaptaciones de estructura
    switch (userPreferences.communication.detail_level) {
      case 'brief':
        adaptations.structure.push('use_concise_format');
        break;
      case 'comprehensive':
        adaptations.structure.push('use_detailed_format');
        break;
    }
    
    return adaptations;
  }

  /**
   * Predecir tasa de éxito
   */
  predictSuccessRate(patterns, userPreferences) {
    if (!patterns.length) return 0.5;
    
    const avgSuccessRate = patterns.reduce((sum, pattern) => {
      const rate = pattern.performance.success_count / 
                  (pattern.performance.success_count + pattern.performance.failure_count + 1);
      return sum + rate;
    }, 0) / patterns.length;
    
    // Ajustar basado en experiencia del usuario
    const skillMultiplier = {
      'beginner': 0.8,
      'intermediate': 1.0,
      'advanced': 1.1,
      'expert': 1.2
    };
    
    const userSkill = userPreferences?.expertise?.skill_level || 'intermediate';
    return Math.min(1.0, avgSuccessRate * skillMultiplier[userSkill]);
  }

  /**
   * Recomendar enfoque
   */
  recommendApproach(patterns, userPreferences) {
    if (!patterns.length) {
      return {
        type: 'standard',
        description: 'Enfoque estándar basado en mejores prácticas',
        confidence: 0.5
      };
    }
    
    const bestPattern = patterns[0];
    const approach = {
      type: bestPattern.context.complexity || 'standard',
      description: bestPattern.description || 'Enfoque optimizado basado en patrones exitosos',
      confidence: bestPattern.learning.confidence_level,
      recommended_steps: bestPattern.pattern.actionSequence?.slice(0, 3) || [],
      expected_duration: bestPattern.performance.avg_execution_time || null
    };
    
    // Adaptar según preferencias del usuario
    if (userPreferences?.task_preferences?.prioritize_quick_wins) {
      approach.focus = 'quick_wins';
      approach.description += ' con enfoque en resultados rápidos';
    }
    
    return approach;
  }

  /**
   * Registrar resultado de interacción para aprendizaje
   */
  async recordInteractionResult(userId, agentType, taskContext, result) {
    try {
      // Agregar a cola de aprendizaje
      this.learningQueue.push({
        userId,
        agentType,
        taskContext,
        result,
        timestamp: new Date()
      });
      
      // Actualizar preferencias del usuario inmediatamente si hay feedback explícito
      if (result.userFeedback) {
        await this.updateUserPreferences(userId, result.userFeedback);
      }
      
      // Procesar cola si es necesario
      if (this.learningQueue.length >= 10) {
        await this.processLearningQueue();
      }
      
    } catch (error) {
      logger.error('❌ Error recording interaction result:', error);
    }
  }

  /**
   * Procesar cola de aprendizaje
   */
  async processLearningQueue() {
    if (!this.learningQueue.length) return;
    
    try {
      logger.info(`🧠 Processing ${this.learningQueue.length} learning items...`);
      
      // Agrupar por patrón
      const patternGroups = this.groupLearningItemsByPattern(this.learningQueue);
      
      // Procesar cada grupo
      for (const [patternKey, items] of patternGroups.entries()) {
        await this.updatePatternFromLearning(patternKey, items);
      }
      
      // Limpiar cola
      this.learningQueue = [];
      
      logger.success('✅ Learning queue processed successfully');
      
    } catch (error) {
      logger.error('❌ Error processing learning queue:', error);
    }
  }

  /**
   * Agrupar elementos de aprendizaje por patrón
   */
  groupLearningItemsByPattern(items) {
    const groups = new Map();
    
    items.forEach(item => {
      const key = `${item.agentType}_${item.taskContext.type || 'general'}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      
      groups.get(key).push(item);
    });
    
    return groups;
  }

  /**
   * Actualizar patrón desde aprendizaje
   */
  async updatePatternFromLearning(patternKey, items) {
    try {
      const [agentType, taskType] = patternKey.split('_');
      
      // Buscar o crear patrón
      let pattern = await InteractionPattern.findOne({
        'context.agentType': agentType,
        'context.taskType': taskType
      });
      
      if (!pattern) {
        pattern = await this.createNewPattern(agentType, taskType, items);
      } else {
        pattern = await this.updateExistingPattern(pattern, items);
      }
      
      logger.debug(`📊 Updated pattern: ${patternKey} with ${items.length} interactions`);
      
    } catch (error) {
      logger.error(`❌ Error updating pattern ${patternKey}:`, error);
    }
  }

  /**
   * Actualizar preferencias del usuario basado en feedback
   */
  async updateUserPreferences(userId, feedback) {
    try {
      const preferences = await this.getUserPreferences(userId);
      
      // Procesar diferentes tipos de feedback
      if (feedback.tone_preference) {
        preferences.communication.preferred_tone = feedback.tone_preference;
      }
      
      if (feedback.detail_preference) {
        preferences.communication.detail_level = feedback.detail_preference;
      }
      
      if (feedback.response_style) {
        preferences.communication.response_style = feedback.response_style;
      }
      
      // Actualizar feedback patterns
      if (feedback.aspect && feedback.direction) {
        const existingFeedback = preferences.learned_preferences.feedback_patterns
          .find(fp => fp.aspect === feedback.aspect);
          
        if (existingFeedback) {
          existingFeedback.preference_direction = feedback.direction;
          existingFeedback.confidence = Math.min(1.0, existingFeedback.confidence + 0.1);
          existingFeedback.last_reinforcement = new Date();
        } else {
          preferences.learned_preferences.feedback_patterns.push({
            aspect: feedback.aspect,
            preference_direction: feedback.direction,
            confidence: 0.6,
            last_reinforcement: new Date()
          });
        }
      }
      
      // Guardar cambios
      await preferences.save();
      
      // Limpiar caché
      this.userPreferenceCache.delete(`user_prefs_${userId}`);
      
      logger.info(`📝 Updated preferences for user: ${userId}`);
      
    } catch (error) {
      logger.error('❌ Error updating user preferences:', error);
    }
  }

  /**
   * Identificar oportunidades de feedback
   */
  identifyFeedbackOpportunities(taskContext) {
    const opportunities = [];
    
    // Oportunidad de feedback sobre tono
    if (taskContext.responseGenerated) {
      opportunities.push({
        type: 'tone_feedback',
        question: '¿El tono de la respuesta fue apropiado?',
        options: ['muy_formal', 'apropiado', 'muy_casual']
      });
    }
    
    // Oportunidad de feedback sobre detalle
    if (taskContext.analysisProvided) {
      opportunities.push({
        type: 'detail_feedback',
        question: '¿El nivel de detalle fue adecuado?',
        options: ['muy_poco', 'adecuado', 'demasiado']
      });
    }
    
    // Oportunidad de feedback sobre utilidad
    opportunities.push({
      type: 'utility_feedback',
      question: '¿Qué tan útil fue esta respuesta?',
      options: ['muy_util', 'util', 'poco_util', 'no_util']
    });
    
    return opportunities;
  }

  /**
   * Obtener contexto de respaldo
   */
  getFallbackContext(userId, agentType, taskContext) {
    return {
      user: {
        preferences: {
          communication: { preferred_tone: 'professional' },
          task_preferences: { preferred_analysis_depth: 'standard' }
        },
        adaptations: { communication: [], content: [], structure: [] }
      },
      patterns: {
        recommended: [],
        alternatives: [],
        success_indicators: ['task_completed', 'user_satisfied']
      },
      optimization: {
        predicted_success_rate: 0.7,
        recommended_approach: {
          type: 'standard',
          description: 'Enfoque estándar',
          confidence: 0.5
        },
        potential_issues: [],
        adaptation_suggestions: []
      },
      learning: {
        should_learn: true,
        learning_focus: ['interaction_outcome', 'user_satisfaction'],
        feedback_opportunities: []
      }
    };
  }

  /**
   * Obtener estadísticas del sistema de memoria
   */
  async getMemorySystemStats() {
    try {
      const [patternStats, userStats] = await Promise.all([
        InteractionPattern.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              avgConfidence: { $avg: '$learning.confidence_level' },
              totalUsage: { $sum: '$performance.times_used' }
            }
          }
        ]),
        UserPreference.aggregate([
          {
            $group: {
              _id: '$communication.preferred_tone',
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      return {
        patterns: patternStats,
        users: userStats,
        cacheStats: {
          patternCacheSize: this.patternCache.size,
          userCacheSize: this.userPreferenceCache.size,
          learningQueueSize: this.learningQueue.length
        },
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('❌ Error getting memory system stats:', error);
      return null;
    }
  }

  /**
   * Limpiar caché periódicamente
   */
  cleanupCache() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutos
    
    // Limpiar caché de patrones
    for (const [key, value] of this.patternCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.patternCache.delete(key);
      }
    }
    
    // Limpiar caché de preferencias
    for (const [key, value] of this.userPreferenceCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.userPreferenceCache.delete(key);
      }
    }
    
    logger.debug('🧹 Cache cleanup completed');
  }
}

// Singleton instance
const intelligentMemorySystem = new IntelligentMemorySystem();

export default intelligentMemorySystem;
export { InteractionPattern, UserPreference };