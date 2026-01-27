/**
 * AgentPersonalitySystem - Sistema de personalización avanzada de agentes
 * Permite crear agentes con personalidades, especialidades y comportamientos únicos
 */

import mongoose from 'mongoose';
import logger from '../../utils/logger.js';
import INIT_CONFIG from '../../config/initConfig.js';

// Schema para perfiles de agentes personalizados
const AgentProfileSchema = new mongoose.Schema({
  agentName: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  version: { type: String, default: '1.0.0' },
  
  // Información básica del agente
  basicInfo: {
    description: { type: String, required: true },
    specialization: { type: String, required: true },
    expertiseLevel: { 
      type: String, 
      enum: ['beginner', 'intermediate', 'advanced', 'expert', 'master'],
      default: 'expert'
    },
    primaryDomain: { type: String, required: true }, // blog, users, security, analytics
    secondaryDomains: [{ type: String }]
  },
  
  // Personalidad y comportamiento
  personality: {
    name: { type: String, required: true }, // Ej: "BlogMaster Pro", "SEO Guru"
    archetype: { 
      type: String, 
      enum: ['analyst', 'coach', 'expert', 'assistant', 'guardian', 'innovator'],
      default: 'expert'
    },
    traits: [{
      trait: { type: String }, // analytical, friendly, precise, creative, etc.
      intensity: { type: Number, min: 1, max: 10, default: 5 }
    }],
    communicationStyle: {
      tone: { 
        type: String,
        enum: ['formal', 'casual', 'friendly', 'professional', 'technical', 'motivational'],
        default: 'professional'
      },
      verbosity: { 
        type: String,
        enum: ['concise', 'moderate', 'detailed', 'comprehensive'],
        default: 'moderate'
      },
      formality: { type: Number, min: 1, max: 10, default: 7 },
      enthusiasm: { type: Number, min: 1, max: 10, default: 6 },
      technicality: { type: Number, min: 1, max: 10, default: 7 }
    }
  },
  
  // Capacidades y limitaciones
  capabilities: {
    primary: [{ 
      name: { type: String, required: true },
      description: { type: String },
      proficiency: { type: Number, min: 1, max: 10, default: 8 },
      priority: { type: Number, min: 1, max: 10, default: 5 }
    }],
    secondary: [{
      name: { type: String },
      description: { type: String },
      proficiency: { type: Number, min: 1, max: 10, default: 6 }
    }],
    limitations: [{
      description: { type: String },
      severity: { 
        type: String, 
        enum: ['minor', 'moderate', 'major', 'critical'],
        default: 'moderate'
      },
      workaround: { type: String }
    }],
    integrations: [{ type: String }] // APIs, servicios externos que puede usar
  },
  
  // Configuración de respuestas
  responseConfig: {
    defaultLanguage: { type: String, default: 'es-ES' },
    supportedLanguages: [{ type: String, default: ['es-ES', 'en-US'] }],
    responseFormats: [{
      type: { 
        type: String,
        enum: ['text', 'json', 'markdown', 'structured', 'code'],
        default: 'structured'
      },
      preference: { type: Number, min: 1, max: 10, default: 8 }
    }],
    includeExamples: { type: Boolean, default: true },
    includeSteps: { type: Boolean, default: true },
    includeMetrics: { type: Boolean, default: true },
    includeRecommendations: { type: Boolean, default: true }
  },
  
  // Configuración técnica
  technicalConfig: {
    maxTokens: { type: Number, default: 4000 },
    temperature: { type: Number, min: 0, max: 2, default: 0.7 },
    contextWindow: { type: Number, default: 15 },
    memoryDepth: { type: Number, default: 100 }, // Número de interacciones recordadas
    optimizationLevel: { 
      type: String,
      enum: ['basic', 'standard', 'aggressive', 'custom'],
      default: 'standard'
    },
    cacheStrategy: { 
      type: String,
      enum: ['none', 'basic', 'smart', 'persistent'],
      default: 'smart'
    }
  },
  
  // Prompts y templates personalizados
  prompts: {
    systemPrompt: { type: String },
    greetingPrompt: { type: String },
    taskPrompts: {
      analyze: { type: String },
      optimize: { type: String },
      generate: { type: String },
      review: { type: String },
      explain: { type: String }
    },
    errorPrompts: {
      notFound: { type: String },
      insufficient_data: { type: String },
      permission_denied: { type: String },
      rate_limit: { type: String }
    },
    conclusionPrompts: {
      success: { type: String },
      partial_success: { type: String },
      recommendation: { type: String }
    }
  },
  
  // Configuración de aprendizaje
  learningConfig: {
    enabled: { type: Boolean, default: true },
    adaptToUser: { type: Boolean, default: true },
    rememberPreferences: { type: Boolean, default: true },
    improveSuggestions: { type: Boolean, default: true },
    learningRate: { type: Number, min: 0.1, max: 1, default: 0.3 },
    feedbackWeight: { type: Number, min: 0.1, max: 1, default: 0.7 }
  },
  
  // Métricas y estadísticas
  metrics: {
    totalUsage: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalFeedback: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    popularTasks: [{ type: String }],
    commonErrors: [{ type: String }]
  },
  
  // Estado y configuración
  status: {
    type: String,
    enum: ['draft', 'testing', 'active', 'maintenance', 'deprecated'],
    default: 'draft'
  },
  
  isActive: { type: Boolean, default: true },
  isCustomizable: { type: Boolean, default: true },
  
  // Información de versionado
  createdBy: { type: String },
  updatedBy: { type: String },
  changelog: [{
    version: { type: String },
    changes: { type: String },
    date: { type: Date, default: Date.now },
    author: { type: String }
  }]
}, {
  timestamps: true,
  collection: 'agent_profiles'
});

// Índices para búsqueda optimizada
// agentName: índice creado automáticamente por unique: true
AgentProfileSchema.index({ 'basicInfo.primaryDomain': 1 });
AgentProfileSchema.index({ status: 1, isActive: 1 });
AgentProfileSchema.index({ 'personality.archetype': 1 });

const AgentProfile = mongoose.model('AgentProfile', AgentProfileSchema);

export class AgentPersonalitySystem {
  constructor() {
    this.profileCache = new Map();
    this.personalityTemplates = new Map();
    this.behaviorPatterns = new Map();
    
    this.initializeDefaultProfiles();
    logger.info('🎭 AgentPersonalitySystem initialized');
  }

  /**
   * Inicializar perfiles por defecto
   */
  async initializeDefaultProfiles() {
    try {
      if (!INIT_CONFIG.INIT_AGENT_PROFILES) {
        return; // Salir silenciosamente si está desactivado
      }
      
      // Verificar si ya existen perfiles
      const existingProfiles = await AgentProfile.countDocuments();
      if (existingProfiles > 0) {
        if (INIT_CONFIG.SHOW_DETAILED_LOGS) {
          logger.info('📋 Agent profiles already exist, skipping initialization');
        }
        return;
      }

      // Crear perfiles por defecto
      const defaultProfiles = this.getDefaultProfiles();
      
      for (const profile of defaultProfiles) {
        await this.createOrUpdateProfile(profile);
      }
      
      logger.success(`✅ Initialized ${defaultProfiles.length} default agent profiles`);
      
    } catch (error) {
      logger.error('❌ Error initializing default profiles:', error);
    }
  }

  /**
   * Obtener perfil de agente (con cache)
   */
  async getAgentProfile(agentName) {
    try {
      // Verificar cache
      if (this.profileCache.has(agentName)) {
        const cached = this.profileCache.get(agentName);
        // Cache válido por 10 minutos
        if (Date.now() - cached.timestamp < 10 * 60 * 1000) {
          return cached.profile;
        }
      }

      // Buscar en base de datos
      const profile = await AgentProfile.findOne({ 
        agentName, 
        isActive: true 
      });

      if (!profile) {
        // Crear perfil básico si no existe
        return await this.createDefaultProfile(agentName);
      }

      // Guardar en cache
      this.profileCache.set(agentName, {
        profile,
        timestamp: Date.now()
      });

      return profile;

    } catch (error) {
      logger.error(`❌ Error getting agent profile for ${agentName}:`, error);
      return null;
    }
  }

  /**
   * Crear o actualizar perfil de agente
   */
  async createOrUpdateProfile(profileData) {
    try {
      const profile = await AgentProfile.findOneAndUpdate(
        { agentName: profileData.agentName },
        profileData,
        { upsert: true, new: true, runValidators: true }
      );

      // Limpiar cache
      this.profileCache.delete(profileData.agentName);

      logger.info(`✅ Profile updated for agent: ${profileData.agentName}`);
      return profile;

    } catch (error) {
      logger.error('❌ Error creating/updating profile:', error);
      throw error;
    }
  }

  /**
   * Generar prompt personalizado basado en perfil
   */
  generatePersonalizedPrompt(profile, context = {}) {
    const { personality, capabilities, responseConfig, prompts } = profile;
    
    // Usar prompt personalizado si existe
    if (prompts.systemPrompt) {
      return this.interpolatePrompt(prompts.systemPrompt, context, profile);
    }

    // Generar prompt dinámico
    return this.buildDynamicPrompt(profile, context);
  }

  /**
   * Construir prompt dinámico basado en perfil
   */
  buildDynamicPrompt(profile, context = {}) {
    const { basicInfo, personality, capabilities, responseConfig } = profile;
    
    let prompt = `Eres ${personality.name}, ${basicInfo.description}

PERSONALIDAD Y ESTILO:
- Arquetipo: ${personality.archetype}
- Especialización: ${basicInfo.specialization}
- Nivel de experiencia: ${basicInfo.expertiseLevel}
- Tono de comunicación: ${personality.communicationStyle.tone}
- Nivel de formalidad: ${personality.communicationStyle.formality}/10
- Entusiasmo: ${personality.communicationStyle.enthusiasm}/10
- Tecnicidad: ${personality.communicationStyle.technicality}/10

CAPACIDADES PRINCIPALES:`;
    
    capabilities.primary.forEach(cap => {
      prompt += `\n- ${cap.name}: ${cap.description} (Dominio: ${cap.proficiency}/10)`;
    });

    if (capabilities.secondary.length > 0) {
      prompt += `\n\nCAPACIDADES SECUNDARIAS:`;
      capabilities.secondary.forEach(cap => {
        prompt += `\n- ${cap.name}: ${cap.description || ''} (Nivel: ${cap.proficiency}/10)`;
      });
    }

    if (capabilities.limitations.length > 0) {
      prompt += `\n\nLIMITACIONES:`;
      capabilities.limitations.forEach(limitation => {
        prompt += `\n- ${limitation.description}`;
        if (limitation.workaround) {
          prompt += ` (Alternativa: ${limitation.workaround})`;
        }
      });
    }

    // Agregar configuración de respuesta
    prompt += `\n\nCONFIGURACIÓN DE RESPUESTA:
- Idioma principal: ${responseConfig.defaultLanguage}
- Nivel de detalle: ${personality.communicationStyle.verbosity}`;

    if (responseConfig.includeExamples) {
      prompt += `\n- Incluir ejemplos prácticos cuando sea relevante`;
    }
    if (responseConfig.includeSteps) {
      prompt += `\n- Proporcionar pasos claros y estructurados`;
    }
    if (responseConfig.includeMetrics) {
      prompt += `\n- Incluir métricas y datos cuantificables cuando sea posible`;
    }
    if (responseConfig.includeRecommendations) {
      prompt += `\n- Ofrecer recomendaciones actionables`;
    }

    // Agregar contexto específico si existe
    if (context.currentTask) {
      prompt += `\n\nCONTEXTO ACTUAL:
Tarea: ${context.currentTask.type || 'análisis'}`;
      if (context.currentTask.description) {
        prompt += `\nDescripción: ${context.currentTask.description}`;
      }
    }

    if (context.userPreferences) {
      prompt += `\n\nPREFERENCIAS DEL USUARIO:`;
      Object.entries(context.userPreferences).forEach(([key, value]) => {
        prompt += `\n- ${key}: ${value}`;
      });
    }

    return prompt;
  }

  /**
   * Interpolar variables en prompts personalizados
   */
  interpolatePrompt(template, context = {}, profile = {}) {
    let prompt = template;
    
    // Variables del perfil
    const variables = {
      '{agent_name}': profile.personality?.name || profile.displayName,
      '{specialization}': profile.basicInfo?.specialization || 'AI Assistant',
      '{expertise_level}': profile.basicInfo?.expertiseLevel || 'expert',
      '{communication_tone}': profile.personality?.communicationStyle?.tone || 'professional',
      '{primary_domain}': profile.basicInfo?.primaryDomain || 'general',
      '{current_date}': new Date().toLocaleDateString('es-ES'),
      '{user_role}': context.userRole || 'usuario',
      '{task_type}': context.currentTask?.type || 'consulta general'
    };

    // Reemplazar variables
    Object.entries(variables).forEach(([key, value]) => {
      prompt = prompt.replace(new RegExp(key, 'g'), value);
    });

    return prompt;
  }

  /**
   * Adaptar respuesta según personalidad
   */
  adaptResponseStyle(content, profile) {
    const { personality, responseConfig } = profile;
    
    let adaptedContent = content;
    
    // Ajustar según nivel de entusiasmo
    if (personality.communicationStyle.enthusiasm >= 8) {
      adaptedContent = this.addEnthusiasm(adaptedContent);
    }
    
    // Ajustar según formalidad
    if (personality.communicationStyle.formality <= 3) {
      adaptedContent = this.makeCasual(adaptedContent);
    } else if (personality.communicationStyle.formality >= 8) {
      adaptedContent = this.makeFormal(adaptedContent);
    }
    
    // Ajustar según verbosidad
    if (personality.communicationStyle.verbosity === 'concise') {
      adaptedContent = this.makeConcise(adaptedContent);
    } else if (personality.communicationStyle.verbosity === 'comprehensive') {
      adaptedContent = this.makeDetailed(adaptedContent);
    }
    
    return adaptedContent;
  }

  /**
   * Obtener perfiles por defecto
   */
  getDefaultProfiles() {
    return [
      {
        agentName: 'BlogAgent',
        displayName: 'BlogMaster Pro',
        basicInfo: {
          description: 'Especialista avanzado en gestión y optimización de contenido para blogs',
          specialization: 'Optimización de Contenido y SEO',
          expertiseLevel: 'master',
          primaryDomain: 'blog',
          secondaryDomains: ['seo', 'analytics', 'content_marketing']
        },
        personality: {
          name: 'BlogMaster Pro',
          archetype: 'analyst',
          traits: [
            { trait: 'analytical', intensity: 9 },
            { trait: 'detail_oriented', intensity: 8 },
            { trait: 'results_focused', intensity: 9 },
            { trait: 'innovative', intensity: 7 }
          ],
          communicationStyle: {
            tone: 'professional',
            verbosity: 'detailed',
            formality: 7,
            enthusiasm: 6,
            technicality: 8
          }
        },
        capabilities: {
          primary: [
            { 
              name: 'Optimización de Contenido', 
              description: 'Análisis y mejora integral de posts para SEO y engagement',
              proficiency: 10,
              priority: 10
            },
            { 
              name: 'Análisis SEO', 
              description: 'Evaluación técnica completa de factores SEO',
              proficiency: 9,
              priority: 9
            },
            { 
              name: 'Generación de Tags', 
              description: 'Creación inteligente de etiquetas relevantes',
              proficiency: 9,
              priority: 8
            }
          ],
          secondary: [
            { name: 'Análisis de Rendimiento', proficiency: 8 },
            { name: 'Detección de Tendencias', proficiency: 7 },
            { name: 'Optimización de Imágenes', proficiency: 6 }
          ],
          limitations: [
            { 
              description: 'No puede editar directamente el contenido en la base de datos',
              severity: 'moderate',
              workaround: 'Proporciona recomendaciones específicas para implementación manual'
            },
            { 
              description: 'Requiere contenido existente para análisis óptimo',
              severity: 'minor',
              workaround: 'Puede trabajar con contenido mínimo o borradores'
            }
          ]
        },
        responseConfig: {
          defaultLanguage: 'es-ES',
          includeExamples: true,
          includeSteps: true,
          includeMetrics: true,
          includeRecommendations: true
        },
        technicalConfig: {
          maxTokens: 4000,
          temperature: 0.7,
          contextWindow: 15,
          memoryDepth: 100,
          optimizationLevel: 'aggressive'
        },
        status: 'active'
      }
      // Aquí se pueden agregar más perfiles por defecto
    ];
  }

  /**
   * Crear perfil por defecto para agente nuevo
   */
  async createDefaultProfile(agentName) {
    const defaultProfile = {
      agentName,
      displayName: agentName,
      basicInfo: {
        description: `Agente AI especializado - ${agentName}`,
        specialization: 'Asistente General',
        expertiseLevel: 'intermediate',
        primaryDomain: 'general'
      },
      personality: {
        name: `${agentName} Assistant`,
        archetype: 'assistant',
        communicationStyle: {
          tone: 'professional',
          verbosity: 'moderate',
          formality: 6,
          enthusiasm: 5,
          technicality: 6
        }
      },
      capabilities: {
        primary: [
          { 
            name: 'Asistencia General', 
            description: 'Ayuda en tareas diversas',
            proficiency: 7
          }
        ],
        secondary: [],
        limitations: []
      },
      responseConfig: {
        defaultLanguage: 'es-ES',
        includeExamples: true,
        includeSteps: true
      },
      technicalConfig: {
        maxTokens: 3000,
        temperature: 0.7,
        contextWindow: 10
      },
      status: 'active'
    };

    return await this.createOrUpdateProfile(defaultProfile);
  }

  // Métodos auxiliares para adaptación de estilo
  addEnthusiasm(content) {
    return content
      .replace(/\./g, '!')
      .replace(/Es importante/g, '¡Es súper importante!')
      .replace(/Recomiendo/g, '¡Te recomiendo encarecidamente!');
  }

  makeCasual(content) {
    return content
      .replace(/usted/g, 'tú')
      .replace(/Es recomendable/g, 'Te sugiero')
      .replace(/Por favor/g, 'Por fa');
  }

  makeFormal(content) {
    return content
      .replace(/tú/g, 'usted')
      .replace(/Vale/g, 'Perfecto')
      .replace(/Ok/g, 'De acuerdo');
  }

  makeConcise(content) {
    // Simplificar respuesta eliminando detalles excesivos
    return content
      .split('\n')
      .filter(line => line.trim().length > 0)
      .slice(0, 5) // Limitar líneas
      .join('\n');
  }

  makeDetailed(content) {
    // Agregar más contexto y explicaciones
    return content + '\n\n💡 Consejos adicionales disponibles si necesitas más detalles.';
  }

  /**
   * Actualizar métricas de perfil
   */
  async updateProfileMetrics(agentName, feedback = {}) {
    try {
      const profile = await AgentProfile.findOne({ agentName });
      if (!profile) return;

      profile.metrics.totalUsage++;
      
      if (feedback.rating) {
        const totalRatings = profile.metrics.totalFeedback;
        profile.metrics.averageRating = 
          (profile.metrics.averageRating * totalRatings + feedback.rating) / (totalRatings + 1);
        profile.metrics.totalFeedback++;
      }

      if (feedback.responseTime) {
        profile.metrics.averageResponseTime = 
          (profile.metrics.averageResponseTime + feedback.responseTime) / 2;
      }

      profile.metrics.lastUpdated = new Date();
      await profile.save();

    } catch (error) {
      logger.error('❌ Error updating profile metrics:', error);
    }
  }

  /**
   * Obtener estadísticas del sistema
   */
  async getSystemStats() {
    try {
      const stats = await AgentProfile.aggregate([
        {
          $group: {
            _id: '$basicInfo.primaryDomain',
            count: { $sum: 1 },
            avgRating: { $avg: '$metrics.averageRating' },
            totalUsage: { $sum: '$metrics.totalUsage' }
          }
        }
      ]);

      return {
        profileStats: stats,
        cacheSize: this.profileCache.size,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('❌ Error getting system stats:', error);
      return null;
    }
  }
}

// Singleton instance
const personalitySystem = new AgentPersonalitySystem();

export default personalitySystem;
export { AgentProfile };