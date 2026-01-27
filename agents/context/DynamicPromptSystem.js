/**
 * DynamicPromptSystem - Sistema de prompts dinámicos y templates profesionales
 * Gestiona prompts inteligentes, personalizables y adaptativos para cada agente
 */

import mongoose from 'mongoose';
import logger from '../../utils/logger.js';
import INIT_CONFIG from '../../config/initConfig.js';

// Schema para templates de prompts
const PromptTemplateSchema = new mongoose.Schema({
  templateId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  category: { 
    type: String, 
    enum: ['system', 'task', 'greeting', 'error', 'conclusion', 'specialized'],
    required: true 
  },
  
  // Aplicabilidad del template
  applicability: {
    agents: [{ type: String }], // Agentes que pueden usar este template
    domains: [{ type: String }], // Dominios aplicables
    taskTypes: [{ type: String }], // Tipos de tarea
    userRoles: [{ type: String }], // Roles de usuario
    contexts: [{ type: String }] // Contextos específicos
  },
  
  // Contenido del template
  content: {
    baseTemplate: { type: String, required: true },
    variations: [{
      name: { type: String },
      condition: { type: String }, // Condición para usar esta variación
      template: { type: String },
      priority: { type: Number, default: 1 }
    }],
    
    // Variables dinámicas disponibles
    variables: [{
      name: { type: String, required: true },
      description: { type: String },
      type: { 
        type: String, 
        enum: ['string', 'number', 'boolean', 'array', 'object', 'date'],
        default: 'string' 
      },
      required: { type: Boolean, default: false },
      defaultValue: { type: mongoose.Schema.Types.Mixed },
      validation: { type: String } // Regex o función de validación
    }]
  },
  
  // Configuración de adaptación
  adaptation: {
    personalityAware: { type: Boolean, default: true },
    contextAware: { type: Boolean, default: true },
    userAware: { type: Boolean, default: true },
    taskAware: { type: Boolean, default: true },
    
    // Adaptaciones automáticas
    autoAdaptations: [{
      condition: { type: String }, // Condición para aplicar adaptación
      modification: { type: String }, // Tipo de modificación
      parameters: { type: mongoose.Schema.Types.Mixed }
    }]
  },
  
  // Métricas y optimización
  metrics: {
    usage: { type: Number, default: 0 },
    success_rate: { type: Number, default: 0 },
    average_rating: { type: Number, default: 0 },
    last_used: { type: Date },
    performance_score: { type: Number, default: 0 }
  },
  
  // Estado y versión
  version: { type: String, default: '1.0.0' },
  status: { 
    type: String, 
    enum: ['draft', 'testing', 'active', 'deprecated'], 
    default: 'active' 
  },
  
  // Metadatos
  tags: [{ type: String }],
  created_by: { type: String },
  updated_by: { type: String }
}, {
  timestamps: true,
  collection: 'prompt_templates'
});

// Índices para búsqueda optimizada
PromptTemplateSchema.index({ category: 1, status: 1 });
PromptTemplateSchema.index({ 'applicability.agents': 1 });
PromptTemplateSchema.index({ 'applicability.taskTypes': 1 });
PromptTemplateSchema.index({ tags: 1 });

const PromptTemplate = mongoose.model('PromptTemplate', PromptTemplateSchema);

export class DynamicPromptSystem {
  constructor() {
    this.templateCache = new Map();
    this.promptBuilders = new Map();
    this.variableProcessors = new Map();
    
    this.initializeBuilders();
    this.initializeDefaultTemplates();
    
    logger.info('🎨 DynamicPromptSystem initialized');
  }

  /**
   * Inicializar constructores de prompts
   */
  initializeBuilders() {
    // Constructor para prompts de sistema
    this.promptBuilders.set('system', (template, variables, context) => {
      return this.buildSystemPrompt(template, variables, context);
    });

    // Constructor para prompts de tarea
    this.promptBuilders.set('task', (template, variables, context) => {
      return this.buildTaskPrompt(template, variables, context);
    });

    // Constructor para prompts de error
    this.promptBuilders.set('error', (template, variables, context) => {
      return this.buildErrorPrompt(template, variables, context);
    });

    // Constructor especializado para BlogAgent
    this.promptBuilders.set('blog_analysis', (template, variables, context) => {
      return this.buildBlogAnalysisPrompt(template, variables, context);
    });

    // Procesadores de variables
    this.variableProcessors.set('date', (value) => {
      return value instanceof Date ? value.toLocaleDateString('es-ES') : value;
    });

    this.variableProcessors.set('array', (value) => {
      return Array.isArray(value) ? value.join(', ') : value;
    });

    this.variableProcessors.set('object', (value) => {
      return typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
    });
  }

  /**
   * Generar prompt dinámico completo
   */
  async generateDynamicPrompt(agentName, category, taskContext = {}) {
    try {
      // Buscar templates aplicables
      const templates = await this.findApplicableTemplates(agentName, category, taskContext);
      
      if (!templates.length) {
        logger.warn(`⚠️  No templates found for ${agentName}:${category}`);
        return this.createFallbackPrompt(agentName, category, taskContext);
      }

      // Seleccionar el mejor template
      const selectedTemplate = this.selectBestTemplate(templates, taskContext);
      
      // Preparar variables
      const variables = await this.prepareVariables(selectedTemplate, taskContext);
      
      // Construir prompt
      const prompt = await this.buildPrompt(selectedTemplate, variables, taskContext);
      
      // Actualizar métricas
      await this.updateTemplateMetrics(selectedTemplate._id, 'used');
      
      return {
        content: prompt,
        template: selectedTemplate.name,
        templateId: selectedTemplate._id,
        variables: variables,
        metadata: {
          agentName,
          category,
          adaptations: this.getAppliedAdaptations(selectedTemplate, taskContext)
        }
      };

    } catch (error) {
      logger.error('❌ Error generating dynamic prompt:', error);
      return this.createFallbackPrompt(agentName, category, taskContext);
    }
  }

  /**
   * Buscar templates aplicables
   */
  async findApplicableTemplates(agentName, category, taskContext) {
    const cacheKey = `${agentName}_${category}_${taskContext.type || 'default'}`;
    
    // Verificar caché
    if (this.templateCache.has(cacheKey)) {
      const cached = this.templateCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 30 * 60 * 1000) { // 30 minutos
        return cached.templates;
      }
    }

    // Buscar en base de datos
    const query = {
      category,
      status: 'active',
      $or: [
        { 'applicability.agents': agentName },
        { 'applicability.agents': { $size: 0 } }, // Templates generales
        { 'applicability.agents': 'all' }
      ]
    };

    // Filtrar por tipo de tarea si está disponible
    if (taskContext.type) {
      query.$and = [
        {
          $or: [
            { 'applicability.taskTypes': taskContext.type },
            { 'applicability.taskTypes': { $size: 0 } },
            { 'applicability.taskTypes': 'all' }
          ]
        }
      ];
    }

    const templates = await PromptTemplate.find(query).sort({ 
      'metrics.performance_score': -1,
      'metrics.success_rate': -1 
    });

    // Guardar en caché
    this.templateCache.set(cacheKey, {
      templates,
      timestamp: Date.now()
    });

    return templates;
  }

  /**
   * Seleccionar el mejor template
   */
  selectBestTemplate(templates, taskContext) {
    if (templates.length === 1) {
      return templates[0];
    }

    // Scoring basado en múltiples factores
    const scored = templates.map(template => {
      let score = 0;
      
      // Performance histórico (40%)
      score += (template.metrics.performance_score || 0) * 0.4;
      
      // Success rate (30%)
      score += (template.metrics.success_rate || 0) * 0.3;
      
      // Especificidad para la tarea (20%)
      if (template.applicability.taskTypes.includes(taskContext.type)) {
        score += 20;
      }
      
      // Recencia de uso (10%)
      if (template.metrics.last_used) {
        const daysSinceUse = (Date.now() - template.metrics.last_used) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 10 - daysSinceUse);
      }
      
      return { template, score };
    });

    // Seleccionar el de mayor score
    scored.sort((a, b) => b.score - a.score);
    return scored[0].template;
  }

  /**
   * Preparar variables para el template
   */
  async prepareVariables(template, taskContext) {
    const variables = {};
    
    // Variables básicas del sistema
    variables.current_date = new Date();
    variables.agent_name = taskContext.agentName || 'Assistant';
    variables.user_role = taskContext.userRole || 'usuario';
    variables.task_type = taskContext.type || 'general';
    
    // Variables específicas del contexto
    if (taskContext.postId) variables.post_id = taskContext.postId;
    if (taskContext.slug) variables.post_slug = taskContext.slug;
    if (taskContext.category) variables.category = taskContext.category;
    
    // Variables del proyecto
    variables.project_name = 'Web Scuti';
    variables.project_domain = 'technology';
    variables.language = 'es-ES';
    
    // Variables del agente (si están disponibles)
    if (taskContext.agentProfile) {
      const profile = taskContext.agentProfile;
      variables.agent_specialization = profile.basicInfo?.specialization;
      variables.agent_personality = profile.personality?.name;
      variables.communication_style = profile.personality?.communicationStyle?.tone;
      variables.expertise_level = profile.basicInfo?.expertiseLevel;
    }

    // Variables de contenido (si están disponibles)
    if (taskContext.contentData) {
      const content = taskContext.contentData;
      variables.content_title = content.title;
      variables.content_length = content.content?.length || 0;
      variables.content_category = content.category?.name;
      variables.content_tags = content.tags?.map(t => t.name).join(', ') || '';
    }

    // Procesar variables según su tipo
    template.content.variables.forEach(varDef => {
      if (variables[varDef.name] !== undefined) {
        const processor = this.variableProcessors.get(varDef.type);
        if (processor) {
          variables[varDef.name] = processor(variables[varDef.name]);
        }
      } else if (varDef.defaultValue !== undefined) {
        variables[varDef.name] = varDef.defaultValue;
      }
    });

    return variables;
  }

  /**
   * Construir prompt final
   */
  async buildPrompt(template, variables, taskContext) {
    let content = template.content.baseTemplate;
    
    // Seleccionar variación si es necesario
    const variation = this.selectVariation(template, taskContext);
    if (variation) {
      content = variation.template;
      logger.debug(`Using variation: ${variation.name}`);
    }

    // Reemplazar variables
    content = this.interpolateVariables(content, variables);
    
    // Aplicar adaptaciones automáticas
    content = this.applyAutoAdaptations(content, template, taskContext);
    
    // Usar constructor específico si existe
    const builder = this.promptBuilders.get(template.category) || 
                   this.promptBuilders.get(taskContext.type);
    
    if (builder) {
      content = builder(content, variables, taskContext);
    }

    return content;
  }

  /**
   * Seleccionar variación del template
   */
  selectVariation(template, taskContext) {
    const variations = template.content.variations || [];
    
    for (const variation of variations.sort((a, b) => (b.priority || 1) - (a.priority || 1))) {
      if (this.evaluateCondition(variation.condition, taskContext)) {
        return variation;
      }
    }
    
    return null;
  }

  /**
   * Evaluar condición para variación
   */
  evaluateCondition(condition, taskContext) {
    if (!condition) return false;
    
    try {
      // Condiciones simples
      if (condition.includes('task_type')) {
        const taskType = taskContext.type || 'general';
        return condition.includes(taskType);
      }
      
      if (condition.includes('user_role')) {
        const userRole = taskContext.userRole || 'user';
        return condition.includes(userRole);
      }
      
      if (condition.includes('complexity')) {
        const complexity = taskContext.complexity || 'medium';
        return condition.includes(complexity);
      }
      
      // Condiciones más complejas se pueden agregar aquí
      return false;
      
    } catch (error) {
      logger.warn(`⚠️  Error evaluating condition: ${condition}`, error);
      return false;
    }
  }

  /**
   * Interpolar variables en el contenido
   */
  interpolateVariables(content, variables) {
    let interpolated = content;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      interpolated = interpolated.replace(regex, value || '');
      
      // También soportar sintaxis alternativa {variable}
      const altRegex = new RegExp(`\\{${key}\\}`, 'g');
      interpolated = interpolated.replace(altRegex, value || '');
    });

    return interpolated;
  }

  /**
   * Aplicar adaptaciones automáticas
   */
  applyAutoAdaptations(content, template, taskContext) {
    let adapted = content;
    
    template.adaptation.autoAdaptations?.forEach(adaptation => {
      if (this.evaluateCondition(adaptation.condition, taskContext)) {
        adapted = this.applyModification(adapted, adaptation.modification, adaptation.parameters);
      }
    });

    return adapted;
  }

  /**
   * Aplicar modificación específica
   */
  applyModification(content, modification, parameters) {
    switch (modification) {
      case 'add_enthusiasm':
        return content.replace(/\./g, '!').replace(/bueno/g, '¡excelente!');
        
      case 'make_formal':
        return content.replace(/tú/g, 'usted').replace(/hola/g, 'estimado/a');
        
      case 'add_technical_detail':
        return content + '\n\n🔧 DETALLES TÉCNICOS: Se aplicarán las mejores prácticas de la industria.';
        
      case 'simplify_language':
        return content.replace(/utilizar/g, 'usar').replace(/implementar/g, 'aplicar');
        
      default:
        return content;
    }
  }

  /**
   * Constructores específicos de prompts
   */
  buildSystemPrompt(template, variables, context) {
    // Agregar estructura estándar de sistema
    let prompt = template;
    
    if (!prompt.includes('INSTRUCCIONES:')) {
      prompt += '\n\nINSTRUCCIONES:\n1. Responde siempre en español\n2. Sé específico y actionable\n3. Proporciona ejemplos cuando sea útil';
    }
    
    return prompt;
  }

  buildTaskPrompt(template, variables, context) {
    // Estructura específica para prompts de tarea
    return `TAREA: ${context.type || 'Análisis'}

${template}

RESULTADO ESPERADO:
- Análisis detallado y recomendaciones específicas
- Pasos claros para implementación
- Métricas y indicadores de éxito`;
  }

  buildErrorPrompt(template, variables, context) {
    return `❌ ${template}

Para obtener ayuda:
1. Verifica los datos proporcionados
2. Intenta con parámetros diferentes
3. Consulta la documentación disponible`;
  }

  buildBlogAnalysisPrompt(template, variables, context) {
    let prompt = template;
    
    // Agregar contexto específico del blog
    if (context.contentData) {
      prompt += `\n\nCONTENIDO A ANALIZAR:
Título: "${context.contentData.title}"
Categoría: ${context.contentData.category?.name || 'Sin categoría'}
Longitud: ${context.contentData.content?.length || 0} caracteres`;
    }
    
    prompt += `\n\nFOCUS DE ANÁLISIS:
- Optimización SEO
- Legibilidad y estructura
- Engagement potencial
- Sugerencias de mejora`;
    
    return prompt;
  }

  /**
   * Crear prompt de respaldo
   */
  createFallbackPrompt(agentName, category, taskContext) {
    const fallbackPrompts = {
      system: `Eres un asistente AI especializado (${agentName}) trabajando para Web Scuti. 
               Tu especialidad es proporcionar análisis detallados y recomendaciones prácticas.
               Responde siempre en español con un enfoque profesional y orientado a resultados.`,
               
      task: `Analiza la siguiente solicitud y proporciona:
             1. Evaluación detallada de la situación
             2. Recomendaciones específicas y actionables
             3. Pasos claros para implementación
             4. Métricas para medir el éxito`,
             
      error: `No se pudo completar la operación solicitada. 
              Por favor verifica los parámetros e intenta nuevamente.
              Si el problema persiste, contacta al administrador del sistema.`,
              
      greeting: `¡Hola! Soy ${agentName}, tu asistente especializado.
                 Estoy aquí para ayudarte con análisis y optimización.
                 ¿En qué puedo asistirte hoy?`,
                 
      conclusion: `Análisis completado. Las recomendaciones proporcionadas están basadas
                   en las mejores prácticas de la industria y datos disponibles.
                   Implementa los cambios gradualmente y monitorea los resultados.`
    };

    return {
      content: fallbackPrompts[category] || fallbackPrompts.system,
      template: 'fallback',
      templateId: 'fallback_' + category,
      variables: {},
      metadata: { fallback: true, agentName, category }
    };
  }

  /**
   * Inicializar templates por defecto
   */
  async initializeDefaultTemplates() {
    try {
      if (!INIT_CONFIG.INIT_PROMPT_TEMPLATES) {
        return; // Salir silenciosamente si está desactivado
      }
      
      const existingTemplates = await PromptTemplate.countDocuments();
      if (existingTemplates > 0) {
        if (INIT_CONFIG.SHOW_DETAILED_LOGS) {
          logger.info('📋 Prompt templates already exist, skipping initialization');
        }
        return;
      }

      const defaultTemplates = this.getDefaultTemplates();
      
      for (const template of defaultTemplates) {
        await PromptTemplate.create(template);
      }
      
      logger.success(`✅ Initialized ${defaultTemplates.length} default prompt templates`);
      
    } catch (error) {
      logger.error('❌ Error initializing default templates:', error);
    }
  }

  /**
   * Obtener templates por defecto
   */
  getDefaultTemplates() {
    return [
      {
        templateId: 'blog_agent_system',
        name: 'BlogAgent Sistema Principal',
        category: 'system',
        applicability: {
          agents: ['BlogAgent'],
          domains: ['blog', 'content'],
          taskTypes: ['all']
        },
        content: {
          baseTemplate: `Eres {{agent_personality}}, especialista avanzado en {{agent_specialization}} para {{project_name}}.

ESPECIALIZACIÓN:
- Dominio: {{project_domain}}
- Experiencia: {{expertise_level}}
- Enfoque: Análisis detallado y optimización de contenido

CAPACIDADES PRINCIPALES:
- Optimización SEO avanzada
- Análisis de legibilidad y estructura
- Generación inteligente de tags y keywords
- Evaluación de rendimiento y engagement
- Sugerencias de mejora actionables

ESTILO DE COMUNICACIÓN:
- Tono: {{communication_style}}
- Idioma: {{language}}
- Enfoque: Profesional, directo y orientado a resultados

CONTEXTO ACTUAL:
- Fecha: {{current_date}}
- Usuario: {{user_role}}
- Tarea: {{task_type}}

INSTRUCCIONES:
1. Analiza completamente el contenido proporcionado
2. Identifica oportunidades específicas de mejora
3. Proporciona recomendaciones priorizadas y actionables
4. Incluye métricas y criterios de éxito cuando sea relevante
5. Mantén un enfoque práctico en todas tus sugerencias`,
          
          variables: [
            { name: 'agent_personality', type: 'string', required: true },
            { name: 'agent_specialization', type: 'string', required: true },
            { name: 'project_name', type: 'string', required: true },
            { name: 'project_domain', type: 'string', required: true },
            { name: 'expertise_level', type: 'string', required: true },
            { name: 'communication_style', type: 'string', required: true },
            { name: 'language', type: 'string', required: true },
            { name: 'current_date', type: 'date', required: true },
            { name: 'user_role', type: 'string', required: true },
            { name: 'task_type', type: 'string', required: true }
          ],
          
          variations: [
            {
              name: 'advanced_user',
              condition: 'user_role:admin,content_manager',
              template: `[TEMPLATE AVANZADO CON MÁS DETALLES TÉCNICOS]`,
              priority: 2
            }
          ]
        },
        
        adaptation: {
          personalityAware: true,
          contextAware: true,
          userAware: true,
          taskAware: true,
          
          autoAdaptations: [
            {
              condition: 'task_type:optimize',
              modification: 'add_technical_detail',
              parameters: {}
            }
          ]
        },
        
        status: 'active',
        tags: ['blog', 'sistema', 'principal']
      },
      
      {
        templateId: 'blog_content_analysis',
        name: 'Análisis de Contenido de Blog',
        category: 'task',
        applicability: {
          agents: ['BlogAgent'],
          taskTypes: ['analyze', 'analyze_content'],
          domains: ['blog']
        },
        content: {
          baseTemplate: `ANÁLISIS DE CONTENIDO - {{content_title}}

📊 INFORMACIÓN DEL CONTENIDO:
- Título: "{{content_title}}"
- Categoría: {{content_category}}
- Longitud: {{content_length}} caracteres
- Tags actuales: {{content_tags}}

🔍 ÁREAS DE ANÁLISIS:

1. **SEO Y OPTIMIZACIÓN**
   - Estructura de título y encabezados
   - Densidad y distribución de keywords
   - Meta descripción y elementos técnicos
   - Optimización para motores de búsqueda

2. **LEGIBILIDAD Y ESTRUCTURA**
   - Claridad del lenguaje utilizado
   - Organización del contenido
   - Uso de listas y elementos visuales
   - Flujo narrativo y coherencia

3. **ENGAGEMENT Y VALOR**
   - Relevancia para la audiencia objetivo
   - Potencial de interacción y compartir
   - Call-to-actions y elementos de conversión
   - Valor informativo y práctico

4. **RENDIMIENTO TÉCNICO**
   - Tiempo de lectura estimado
   - Compatibilidad móvil del contenido
   - Velocidad de carga potencial
   - Accesibilidad del contenido

INSTRUCCIONES:
Analiza cada área detalladamente y proporciona:
- Puntuación del 1-10 para cada área
- Identificación de fortalezas actuales
- Oportunidades específicas de mejora
- Recomendaciones priorizadas con pasos concretos
- Estimación del impacto de cada mejora`,
          
          variables: [
            { name: 'content_title', type: 'string', required: true },
            { name: 'content_category', type: 'string', defaultValue: 'General' },
            { name: 'content_length', type: 'number', defaultValue: 0 },
            { name: 'content_tags', type: 'string', defaultValue: 'Sin tags' }
          ]
        },
        
        status: 'active',
        tags: ['blog', 'análisis', 'contenido']
      },
      
      {
        templateId: 'seo_optimization',
        name: 'Optimización SEO Especializada',
        category: 'specialized',
        applicability: {
          agents: ['BlogAgent'],
          taskTypes: ['optimize_seo', 'seo_analysis'],
          domains: ['blog', 'seo']
        },
        content: {
          baseTemplate: `🔍 OPTIMIZACIÓN SEO AVANZADA

CONTENIDO OBJETIVO: {{content_title}}

📈 ANÁLISIS SEO COMPLETO:

**1. OPTIMIZACIÓN ON-PAGE**
- Título SEO: Análisis de longitud, keywords y atractivo
- Meta descripción: Optimización para CTR y relevancia
- Estructura H1-H6: Jerarquía y uso de keywords
- URL slug: Optimización y legibilidad
- Keywords principales y secundarias
- Densidad de palabras clave óptima

**2. CONTENIDO Y RELEVANCIA**
- Intención de búsqueda del usuario
- Análisis de competencia SERP
- Contenido relacionado y entidades
- Semántica y co-ocurrencia de términos
- Freshness y actualidad del contenido

**3. EXPERIENCIA DE USUARIO**
- Tiempo de lectura y engagement
- Estructura visual y escaneabilidad
- Call-to-actions y conversión
- Enlaces internos estratégicos
- Multimedia y elementos enriquecidos

**4. ASPECTOS TÉCNICOS**
- Schema markup relevante
- Optimización de imágenes y alt text
- Velocidad de carga estimada
- Mobile-first considerations
- Core Web Vitals impact

METODOLOGÍA:
1. Evalúo cada factor SEO con scoring detallado
2. Identifico quick wins vs optimizaciones a largo plazo
3. Priorizo por impacto vs esfuerzo de implementación
4. Proporciono pasos específicos y medibles
5. Incluyo KPIs para tracking de resultados

El objetivo es lograr un contenido que no solo rankee bien, sino que proporcione valor real al usuario y genere engagement sostenible.`,
          
          variables: [
            { name: 'content_title', type: 'string', required: true }
          ]
        },
        
        status: 'active',
        tags: ['seo', 'optimización', 'especializado']
      }
    ];
  }

  /**
   * Actualizar métricas de template
   */
  async updateTemplateMetrics(templateId, action, rating = null) {
    try {
      const update = {
        $inc: { 'metrics.usage': 1 },
        $set: { 'metrics.last_used': new Date() }
      };
      
      if (action === 'success') {
        update.$inc['metrics.success_rate'] = 1;
      }
      
      if (rating) {
        // Calcular nueva calificación promedio
        const template = await PromptTemplate.findById(templateId);
        if (template) {
          const currentRating = template.metrics.average_rating || 0;
          const totalUsage = template.metrics.usage || 1;
          const newRating = (currentRating * (totalUsage - 1) + rating) / totalUsage;
          update.$set['metrics.average_rating'] = newRating;
        }
      }
      
      await PromptTemplate.findByIdAndUpdate(templateId, update);
      
    } catch (error) {
      logger.warn('⚠️  Failed to update template metrics:', error.message);
    }
  }

  /**
   * Obtener adaptaciones aplicadas
   */
  getAppliedAdaptations(template, taskContext) {
    const applied = [];
    
    template.adaptation.autoAdaptations?.forEach(adaptation => {
      if (this.evaluateCondition(adaptation.condition, taskContext)) {
        applied.push({
          condition: adaptation.condition,
          modification: adaptation.modification
        });
      }
    });
    
    return applied;
  }

  /**
   * Obtener estadísticas del sistema
   */
  async getSystemStats() {
    try {
      const stats = await PromptTemplate.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgUsage: { $avg: '$metrics.usage' },
            avgRating: { $avg: '$metrics.average_rating' },
            totalUsage: { $sum: '$metrics.usage' }
          }
        }
      ]);

      return {
        templateStats: stats,
        cacheSize: this.templateCache.size,
        totalBuilders: this.promptBuilders.size,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('❌ Error getting system stats:', error);
      return null;
    }
  }
}

// Singleton instance
const dynamicPromptSystem = new DynamicPromptSystem();

export default dynamicPromptSystem;
export { PromptTemplate };