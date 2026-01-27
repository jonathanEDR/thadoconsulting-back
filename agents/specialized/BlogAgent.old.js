/**
 * BlogAgent - Agente especializado en gestión de blog y contenido
 * Funcionalidades: Optimización SEO, generación de tags, análisis de contenido, etc.
 */

import BaseAgent from '../core/BaseAgent.js';
import openaiService from '../services/OpenAIService.js';
import BlogPost from '../../models/BlogPost.js';
import BlogCategory from '../../models/BlogCategory.js';
import BlogTag from '../../models/BlogTag.js';
import AgentConfig from '../../models/AgentConfig.js';
import { generateAIMetadata, generateSummary } from '../../utils/aiMetadataGenerator.js';
import { suggestTags, suggestKeywords, suggestImprovements } from '../../utils/contentEnhancer.js';
import { analyzeContent, extractKeywords, extractTopics } from '../../utils/semanticAnalyzer.js';
import suggestionCache from '../../utils/suggestionCache.js';
import aiTrackingService from '../../services/aiTrackingService.js';
import logger from '../../utils/logger.js';

export class BlogAgent extends BaseAgent {
  constructor() {
    super(
      'BlogAgent',
      'Agente especializado en gestión de blog y optimización de contenido',
      [
        'content_optimization',
        'seo_analysis',
        'tag_generation', 
        'keyword_extraction',
        'content_analysis',
        'blog_management',
        'post_scheduling',
        'performance_analysis'
      ]
    );

    // Configuración específica del BlogAgent (valores por defecto)
    this.config = {
      maxTagsPerPost: 10,
      minContentLength: 300,
      seoScoreThreshold: 70,
      autoOptimization: true,
      // Configuración OpenAI por defecto
      timeout: 30000,
      maxTokens: 2000,
      temperature: 0.7
    };

    // Configuración avanzada (se carga desde DB)
    this.advancedConfig = null;

    // Cargar configuración desde base de datos
    this.loadConfiguration();

    logger.info('📝 BlogAgent initialized with advanced capabilities');
  }

  /**
   * Cargar configuración desde la base de datos
   */
  async loadConfiguration() {
    try {
      // Buscar configuración en la base de datos
      let dbConfig = await AgentConfig.findOne({ agentName: 'blog' });
      
      // Si no existe configuración, inicializar valores por defecto
      if (!dbConfig) {
        logger.info('🔄 No configuration found, initializing defaults...');
        await AgentConfig.initializeDefaults();
        dbConfig = await AgentConfig.findOne({ agentName: 'blog' });
      }

      if (dbConfig) {
        // Aplicar configuración básica
        if (dbConfig.config) {
          this.config = { ...this.config, ...dbConfig.config };
        }

        // Guardar configuración avanzada
        this.advancedConfig = {
          personality: dbConfig.personality || this.getDefaultPersonality(),
          contextConfig: dbConfig.contextConfig || this.getDefaultContext(),
          responseConfig: dbConfig.responseConfig || this.getDefaultResponse(),
          promptConfig: dbConfig.promptConfig || this.getDefaultPrompts(),
          // NUEVA: Configuración de entrenamiento con task prompts
          trainingConfig: dbConfig.trainingConfig || null
        };

        // Inicializar task prompts automáticamente si no existen
        if (dbConfig) {
          await this.initializeTaskPromptsIfNeeded(dbConfig);
        }

        logger.success('✅ BlogAgent configuration loaded from database');
        logger.info(`🎭 Personality: ${this.advancedConfig.personality?.archetype || 'default'}`);
        logger.info(`🌡️  Temperature: ${this.config.temperature}, Max Tokens: ${this.config.maxTokens}`);
        logger.info(`👤 User Expertise: ${this.advancedConfig.contextConfig?.userExpertise || 'intermediate'}`);
        
        // Log información de task prompts disponibles (solo en desarrollo)
        if (process.env.NODE_ENV !== 'production' && this.advancedConfig.trainingConfig?.taskPrompts?.length > 0) {
          logger.info(`🎯 Professional Task Prompts Available: ${this.advancedConfig.trainingConfig.taskPrompts.length}`);
        }
      } else {
        logger.warn('⚠️  Could not load or create configuration, using hardcoded defaults');
        this.advancedConfig = {
          personality: this.getDefaultPersonality(),
          contextConfig: this.getDefaultContext(),
          responseConfig: this.getDefaultResponse(),
          promptConfig: this.getDefaultPrompts(),
          trainingConfig: null
        };
      }
    } catch (error) {
      logger.error('❌ Error loading agent configuration:', error);
      // Usar valores por defecto en caso de error
      this.advancedConfig = {
        personality: this.getDefaultPersonality(),
        contextConfig: this.getDefaultContext(),
        responseConfig: this.getDefaultResponse(),
        promptConfig: this.getDefaultPrompts()
      };
    }
  }

  /**
   * Obtener personalidad por defecto
   */
  getDefaultPersonality() {
    return {
      archetype: 'expert',
      traits: [
        { trait: 'analytical', intensity: 8 },
        { trait: 'professional', intensity: 7 },
        { trait: 'creative', intensity: 6 }
      ],
      communicationStyle: {
        tone: 'professional',
        verbosity: 'moderate',
        formality: 7,
        enthusiasm: 6,
        technicality: 7
      }
    };
  }

  /**
   * Obtener contexto por defecto
   */
  getDefaultContext() {
    return {
      projectInfo: {
        name: 'Web Scuti',
        type: 'tech_blog',
        domain: 'technology',
        language: 'es-ES',
        tone: 'professional_friendly'
      },
      userExpertise: 'intermediate'
    };
  }

  /**
   * Obtener configuración de respuesta por defecto
   */
  getDefaultResponse() {
    return {
      defaultLanguage: 'es-ES',
      supportedLanguages: ['es-ES', 'en-US'],
      includeExamples: true,
      includeSteps: true,
      includeMetrics: true,
      includeRecommendations: true,
      responseFormat: 'structured'
    };
  }

  /**
   * Obtener configuración de prompts por defecto
   */
  getDefaultPrompts() {
    return {
      useCustomPrompts: false,
      customSystemPrompt: '',
      promptVariables: {},
      contextWindow: 10
    };
  }

  /**
   * Recargar configuración (útil cuando se actualiza desde el panel)
   */
  async reloadConfiguration() {
    await this.loadConfiguration();
    logger.info('🔄 Configuration reloaded');
  }

  /**
   * Construir prompt personalizado con configuración de personalidad y contexto
   * NUEVA VERSIÓN: Integra task prompts profesionales predeterminados
   */
  buildPersonalizedPrompt(basePrompt, taskType = 'general') {
    // 1. PRIORIDAD: Buscar task prompt profesional específico
    const professionalPrompt = this.getTaskSpecificPrompt(taskType);
      if (professionalPrompt) {
        if (process.env.NODE_ENV !== 'production') {
          logger.debug(`🎯 Using professional task prompt for: ${taskType}`);
        }
        return professionalPrompt;
      }    // 2. FALLBACK: Sistema de personalización legacy
    if (!this.advancedConfig) {
      logger.warn('⚠️ No advanced config available, using base prompt');
      return basePrompt;
    }

    let enhancedPrompt = '';

    // Aplicar personalidad del agente (legacy system)
    const personality = this.advancedConfig.personality;
    if (personality?.archetype) {
      const archetypeDescriptions = {
        analyst: '🔍 Eres un ANALISTA meticuloso y orientado a datos. Enfócate en métricas, patrones y análisis profundos con evidencia concreta.',
        coach: '🎯 Eres un COACH motivador y guía práctica. Proporciona orientación paso a paso con aliento y motivación.',
        expert: '🎓 Eres un EXPERTO TÉCNICO con conocimiento profundo. Da respuestas precisas, detalladas y con fundamento técnico.',
        assistant: '🤝 Eres un ASISTENTE eficiente y servicial. Proporciona ayuda clara, directa y bien estructurada.',
        guardian: '🛡️ Eres un GUARDIÁN que prioriza calidad y consistencia. Asegura los mejores estándares y mejores prácticas.',
        innovator: '💡 Eres un INNOVADOR creativo y visionario. Proporciona ideas frescas, soluciones originales y enfoques únicos.'
      };

      enhancedPrompt += `PERSONALIDAD DEL AGENTE:\n${archetypeDescriptions[personality.archetype] || archetypeDescriptions.expert}\n\n`;
      
      // Aplicar rasgos de personalidad
      if (personality.traits && personality.traits.length > 0) {
        enhancedPrompt += 'RASGOS ESPECIALES:\n';
        personality.traits.forEach(trait => {
          const intensityLevel = trait.intensity >= 8 ? 'MUY' : trait.intensity >= 6 ? 'MODERADAMENTE' : 'LIGERAMENTE';
          enhancedPrompt += `- ${intensityLevel} ${trait.trait.toUpperCase()}\n`;
        });
        enhancedPrompt += '\n';
      }
    }

    // 2. Aplicar estilo de comunicación
    const style = personality.communicationStyle || {};
    if (style.tone || style.verbosity || style.formality) {
      enhancedPrompt += 'Estilo de comunicación:\n';
      if (style.tone) enhancedPrompt += `- Tono: ${style.tone}\n`;
      if (style.verbosity) enhancedPrompt += `- Nivel de detalle: ${style.verbosity}\n`;
      if (style.formality) enhancedPrompt += `- Formalidad: ${style.formality}\n`;
      enhancedPrompt += '\n';
    }

    // 3. Aplicar contexto del proyecto
    const context = this.advancedConfig.contextConfig;
    if (context.projectInfo) {
      enhancedPrompt += `Contexto del proyecto:\n`;
      if (context.projectInfo.name) enhancedPrompt += `- Proyecto: ${context.projectInfo.name}\n`;
      if (context.projectInfo.domain) enhancedPrompt += `- Dominio: ${context.projectInfo.domain}\n`;
      if (context.projectInfo.tone) enhancedPrompt += `- Tono esperado: ${context.projectInfo.tone}\n`;
      enhancedPrompt += '\n';
    }

    // 4. Aplicar nivel de expertise del usuario
    if (context.userExpertise) {
      const expertiseLevels = {
        beginner: 'Explica como si fuera para un principiante. Usa lenguaje simple y proporciona contexto básico.',
        intermediate: 'El usuario tiene conocimiento intermedio. Balance entre explicaciones y detalles técnicos.',
        advanced: 'El usuario es avanzado. Puedes usar terminología técnica y conceptos complejos.',
        expert: 'El usuario es experto. Enfócate en detalles avanzados y optimizaciones específicas.'
      };

      enhancedPrompt += `${expertiseLevels[context.userExpertise] || ''}\n\n`;
    }

    // 5. Aplicar configuración de respuesta
    const responseConfig = this.advancedConfig.responseConfig;
    if (responseConfig.format) {
      const formatDescriptions = {
        text: 'Responde en formato de texto plano.',
        structured: 'Estructura tu respuesta con secciones claras.',
        markdown: 'Usa formato markdown para estructurar la respuesta.',
        detailed: 'Proporciona una respuesta exhaustiva con múltiples secciones.'
      };

      enhancedPrompt += `${formatDescriptions[responseConfig.format] || ''}\n`;
    }

    // Opciones de contenido
    if (responseConfig.includeExamples) enhancedPrompt += '- Incluye ejemplos prácticos\n';
    if (responseConfig.includeSteps) enhancedPrompt += '- Proporciona pasos claros\n';
    if (responseConfig.includeMetrics) enhancedPrompt += '- Incluye métricas relevantes\n';
    if (responseConfig.includeRecommendations) enhancedPrompt += '- Da recomendaciones específicas\n';

    // 6. Prompt base
    enhancedPrompt += `\n---\n\n${basePrompt}`;

    return enhancedPrompt;
  }

  /**
   * NUEVA FUNCIÓN: Obtener prompt profesional específico para tipo de tarea
   * Busca en trainingConfig.taskPrompts el prompt profesional correspondiente
   */
  getTaskSpecificPrompt(taskType, userInput = {}) {
    try {
      // Verificar que tenemos configuración de entrenamiento cargada
      if (!this.advancedConfig?.trainingConfig?.taskPrompts) {
        logger.debug(`🔍 No task prompts found in training config for: ${taskType}`);
        return null;
      }

      // Buscar el task prompt específico
      const taskPrompt = this.advancedConfig.trainingConfig.taskPrompts.find(
        tp => tp.taskType === taskType
      );

      if (!taskPrompt) {
        return null;
      }

      // Construir el prompt completo: systemPrompt + userPromptTemplate personalizado
      let fullPrompt = taskPrompt.systemPrompt;

      // Si hay template de usuario, personalizarlo con datos reales
      if (taskPrompt.userPromptTemplate && userInput) {
        fullPrompt += '\n\n---\n\n';
        fullPrompt += this.personalizeUserTemplate(taskPrompt.userPromptTemplate, userInput);
      }

      // Actualizar temperatura de OpenAI para esta tarea específica
      this.config.temperature = taskPrompt.temperature;

      return fullPrompt;

    } catch (error) {
      logger.error(`❌ Error getting task specific prompt for ${taskType}:`, error);
      return null;
    }
  }

  /**
   * Personalizar user prompt template con datos reales
   */
  personalizeUserTemplate(template, userInput) {
    let personalizedTemplate = template;

    // Variables comunes que podemos reemplazar
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
      '{competition}': userInput.competition || 'Blogs técnicos similares',
      '{brand}': userInput.brand || 'Web Scuti',
      '{industry}': userInput.industry || 'Desarrollo de software y tecnología',
      '{target_audience}': userInput.target_audience || 'Desarrolladores y tech leads',
      '{competitors}': userInput.competitors || 'Dev.to, Medium tech, Stack Overflow Blog',
      '{business_goals}': userInput.business_goals || 'Aumentar autoridad técnica y engagement',
      '{main_kpis}': userInput.main_kpis || 'Tiempo en página, shares, comentarios técnicos',
      '{timeline}': userInput.timeline || '3 meses',
      '{resources}': userInput.resources || 'Equipo de contenido técnico',
      '{current_content}': userInput.current_content || 'Artículos técnicos y tutoriales',
      '{current_metrics}': userInput.current_metrics || 'Métricas de engagement base',
      '{content_gaps}': userInput.content_gaps || 'Contenido más interactivo y práctico',
      '{strategy_focus}': userInput.strategy_focus || 'Contenido técnico de alta calidad'
    };

    // Reemplazar todas las variables en el template
    Object.keys(replacements).forEach(variable => {
      personalizedTemplate = personalizedTemplate.replace(
        new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), 
        replacements[variable]
      );
    });

    return personalizedTemplate;
  }

  /**
   * NUEVA FUNCIÓN: Inicializar task prompts automáticamente si no existen
   * Se ejecuta automáticamente durante la carga de configuración
   */
  async initializeTaskPromptsIfNeeded(dbConfig) {
    try {
      // Verificar si ya existen task prompts
      if (dbConfig.trainingConfig?.taskPrompts?.length > 0) {
        if (process.env.NODE_ENV !== 'production') {
          logger.debug('✅ Task prompts already exist, skipping auto-initialization');
        }
        return;
      }

      logger.info('🚀 Auto-initializing default task prompts...');

      // Prompts predeterminados (copiados de initializeTaskPrompts.js)
      const defaultTaskPrompts = [
        {
          taskType: 'seo_analysis',
          systemPrompt: `Eres un especialista en SEO técnico con más de 10 años de experiencia trabajando con sitios web de tecnología y desarrollo.

TU ESPECIALIZACIÓN:
- Análisis técnico de contenido web
- Optimización para motores de búsqueda
- Research de keywords competitivo
- Métricas cuantificables de SEO

INSTRUCCIONES ESPECÍFICAS:
1. SIEMPRE proporciona un score SEO actual y proyectado (escala 1-100)
2. INCLUYE keywords específicas con volumen de búsqueda estimado
3. ANALIZA estructura técnica (H1, H2, meta tags, etc.)
4. PROPORCIONA recomendaciones accionables y específicas
5. MENCIONA factores de Core Web Vitals cuando sea relevante

FORMATO DE RESPUESTA:
- Usa emojis para claridad visual (📊, 🔍, ⚡, ✅, ❌)
- Estructura con secciones claras
- Incluye métricas cuantificables
- Proporciona timeline de implementación

VALORES:
- Precisión técnica sobre generalidades
- Datos respaldados por mejores prácticas 2024
- Recomendaciones implementables inmediatamente`,

          userPromptTemplate: `Realiza un análisis SEO completo del siguiente contenido:

📄 **INFORMACIÓN DEL CONTENIDO:**
Título: {title}
Contenido: {content}
URL objetivo: {url}
Audiencia: {audience}
Palabras clave objetivo: {target_keywords}

🎯 **ANÁLISIS REQUERIDO:**
{focus_areas}

📊 **ENTREGABLES ESPERADOS:**
1. Score SEO actual (1-100) con justificación
2. Análisis de keywords (primarias y secundarias)
3. Mejoras técnicas específicas (título, meta, estructura)
4. Score SEO proyectado después de mejoras
5. Timeline de implementación recomendado
6. Métricas a monitorear post-implementación

Proporciona un análisis detallado y accionable.`,

          temperature: 0.3,
          examples: []
        },
        {
          taskType: 'content_improvement',
          systemPrompt: `Eres un especialista senior en content marketing y optimización de engagement, con expertise específico en contenido técnico y de desarrollo.

TU ESPECIALIZACIÓN:
- Optimización de engagement para audiencias técnicas
- Conversión de contenido educativo a accionable
- Psicología del usuario desarrollador
- Métricas de content performance

FILOSOFÍA DE MEJORA:
- Valor técnico + Engagement humano
- Código functional + Storytelling
- Teoría + Aplicación práctica inmediata
- Educación + Entretenimiento (Edutainment)

ELEMENTOS CLAVE A CONSIDERAR:
1. Hook emocional en los primeros 30 segundos
2. Ejemplos de código ejecutable y relevante
3. Casos de uso del mundo real
4. Elementos visuales (diagramas, screenshots, GIFs)
5. Llamados a la acción específicos y medibles
6. Comunidad y engagement social

MÉTRICAS DE ÉXITO:
- Tiempo promedio en página (+40% objetivo)
- Tasa de compartido en redes (+60% objetivo)
- Conversión a newsletter/follow (+25% objetivo)
- Comentarios y discusión técnica
- Implementación práctica por lectores`,

          userPromptTemplate: `Optimiza este contenido técnico para máximo engagement:

📝 **CONTENIDO ACTUAL:**
Título: {title}
Contenido: {content}
Tipo: {content_type}

👥 **AUDIENCIA OBJETIVO:**
Nivel técnico: {technical_level}
Rol: {audience_role}
Objetivos: {audience_goals}

🎯 **OBJETIVOS DE MEJORA:**
{improvement_goals}

📊 **ENTREGABLES ESPERADOS:**
1. **Hook mejorado** (primeros 100 palabras)
2. **Estructura optimizada** con secciones engagement
3. **Elementos visuales sugeridos** (específicos)
4. **Código/ejemplos prácticos** a incluir
5. **CTAs estratégicos** posicionados óptimamente
6. **Métricas de impacto estimadas** (cuantificables)
7. **A/B testing sugerido** para validar mejoras

Enfócate en balance: valor técnico + engagement humano.`,

          temperature: 0.7,
          examples: []
        },
        {
          taskType: 'tag_generation',
          systemPrompt: `Eres un especialista en taxonomía de contenido y SEO técnico, con experiencia específica en ecosistemas de desarrollo y tecnología.

TU ESPECIALIZACIÓN:
- Estrategia de keywords para contenido técnico
- Balancing entre popularidad y especificidad
- Long-tail SEO para nichos técnicos
- Taxonomías que conectan conceptos relacionados

METODOLOGÍA DE SELECCIÓN:
1. **Tags Principales** (3-4): Alta búsqueda, competencia moderada
2. **Tags Secundarios** (3-4): Contexto técnico, comunidad específica  
3. **Tags de Nicho** (2-3): Long-tail específico, baja competencia
4. **Tags Emergentes** (1-2): Tendencias tecnológicas nuevas

CRITERIOS DE EVALUACIÓN:
- Volumen de búsqueda mensual estimado
- Nivel de competencia (Low/Medium/High)
- Relevancia para audiencia técnica específica
- Potencial de trending en comunidades dev
- Conexión con ecosistemas tecnológicos amplios

FORMATO DE RESPUESTA:
- Categorización clara por tipo de tag
- Justificación basada en data para cada selección
- Métricas estimadas cuando sea posible
- Conexiones estratégicas entre tags`,

          userPromptTemplate: `Genera una estrategia completa de tags para este contenido técnico:

📄 **CONTENIDO A TAGGEAR:**
Título: {title}
Tema principal: {main_topic}
Contenido: {content}
Tecnologías mencionadas: {technologies}

🎯 **CONTEXTO:**
Audiencia: {audience}
Plataforma: {platform}
Objetivos SEO: {seo_goals}
Competencia directa: {competition}

📊 **ESTRATEGIA REQUERIDA:**
{focus_areas}

🏷️ **ENTREGABLES ESPERADOS:**
1. **Tags Principales** (3-4): Con volumen estimado y competencia
2. **Tags Secundarios** (3-4): Para contexto y descubrabilidad
3. **Tags de Nicho** (2-3): Long-tail específicos del dominio
4. **Tags Emergentes** (1-2): Tendencias y tecnologías nuevas
5. **Justificación estratégica** para cada categoría
6. **Métricas esperadas** (alcance, engagement predicho)
7. **Tags relacionados** para content clustering futuro

Balanceo óptimo: popularidad + especificidad técnica.`,

          temperature: 0.5,
          examples: []
        },
        {
          taskType: 'content_strategy',
          systemPrompt: `Eres un estratega de contenido senior especializado en marcas de tecnología y developer relations, con track record en scaling de audiencias técnicas.

TU ESPECIALIZACIÓN:
- Estrategia de contenido para ecosistemas developer
- Content marketing técnico que convierte
- Community building alrededor de tecnología
- ROI medible en contenido educativo técnico

PRINCIPIOS ESTRATÉGICOS:
1. **Educación Primero**: Valor genuino antes de promoción
2. **Comunidad Centrada**: Contenido que genera discusión
3. **Implementación Real**: Siempre código/casos de uso funcionales
4. **Escalabilidad**: Contenido evergreen + trending topics
5. **Medición Activa**: KPIs claros y trackeable

FRAMEWORK DE ESTRATEGIA:
- **Pilares de Contenido** (3-5 temas core)
- **Content Mix** (tutorials, análisis, news, opinion)
- **Calendario Estratégico** (evergreen + seasonal + trending)
- **Distribution Strategy** (owned, earned, paid channels)
- **Community Engagement** (comments, discussions, UGC)
- **Conversion Funnel** (awareness → consideration → adoption)

MÉTRICAS DE ÉXITO:
- Developer engagement (time on site, return visits)
- Technical implementation (código usado, forks, stars)
- Community growth (newsletter, followers, mentions)
- Business impact (leads qualified, conversions, brand awareness)`,

          userPromptTemplate: `Desarrolla una estrategia integral de contenido técnico:

🏢 **CONTEXTO DE MARCA:**
Empresa/Producto: {brand}
Industria: {industry}
Audiencia técnica objetivo: {target_audience}
Competidores principales: {competitors}

🎯 **OBJETIVOS ESTRATÉGICOS:**
Objetivos de negocio: {business_goals}
KPIs principales: {main_kpis}
Timeline: {timeline}
Presupuesto/recursos: {resources}

📊 **INFORMACIÓN ACTUAL:**
Contenido existente: {current_content}
Performance actual: {current_metrics}
Gaps identificados: {content_gaps}

🚀 **ESTRATEGIA REQUERIDA:**
{strategy_focus}

📋 **ENTREGABLES ESPERADOS:**
1. **Pilares de Contenido** (3-5) con justificación estratégica
2. **Content Calendar** (próximos 3 meses) con temas específicos
3. **Content Mix Strategy** (% tutorial, análisis, news, etc.)
4. **Distribution Plan** (canales + timing + recursos needed)
5. **Community Engagement Plan** (cómo generar discusión)
6. **KPIs y Métricas** (específicos y medibles)
7. **Resource Requirements** (team, tools, budget breakdown)
8. **Competitive Differentiation** (cómo destacar vs competencia)

Enfoque: ROI medible + crecimiento sostenible de audiencia técnica.`,

          temperature: 0.8,
          examples: []
        }
      ];

      // Inicializar trainingConfig si no existe
      if (!dbConfig.trainingConfig) {
        dbConfig.trainingConfig = {
          examples: [],
          taskPrompts: [],
          behaviorRules: [],
          specialInstructions: '',
          learningMode: 'balanced'
        };
      }

      // Agregar task prompts
      dbConfig.trainingConfig.taskPrompts = defaultTaskPrompts;

      // Agregar reglas de comportamiento predeterminadas si no existen
      if (!dbConfig.trainingConfig.behaviorRules || dbConfig.trainingConfig.behaviorRules.length === 0) {
        const defaultBehaviorRules = [
          "SIEMPRE responde en español utilizando un tono profesional pero accesible",
          "NUNCA proporciones información falsa o especulativa sin advertir claramente",
          "SIEMPRE incluye ejemplos prácticos cuando sea relevante para el contexto técnico",
          "PRIORIZA la precisión técnica sobre la velocidad de respuesta",
          "SIEMPRE menciona las fuentes de información cuando cites datos específicos",
          "EVITA usar jerga técnica excesiva sin proporcionar explicaciones claras",
          "INCLUYE advertencias de seguridad cuando sea aplicable a código o configuraciones",
          "ADAPTA el nivel de detalle según la complejidad de la consulta del usuario",
          "OFRECE alternativas cuando una solución puede no ser la única opción viable",
          "MANTÉN un enfoque constructivo y educativo en todas las interacciones"
        ];

        dbConfig.trainingConfig.behaviorRules = defaultBehaviorRules;
      }

      // Agregar instrucciones especiales predeterminadas si no existen
      if (!dbConfig.trainingConfig.specialInstructions) {
        dbConfig.trainingConfig.specialInstructions = `Como BlogAgent especializado de Web Scuti, tu misión es ser un asistente técnico excepcional que:

🎯 OBJETIVOS PRINCIPALES:
- Ayudar a desarrolladores y profesionales técnicos con contenido de alta calidad
- Optimizar contenido web para SEO y engagement
- Proporcionar análisis técnicos precisos y accionables
- Generar estrategias de contenido que combinen valor técnico y marketing

🔧 CAPACIDADES ESPECIALIZADAS:
- Análisis SEO técnico con métricas cuantificables
- Generación de tags estratégicos balanceando popularidad y especificidad
- Mejora de contenido técnico para máximo engagement
- Estrategias de contenido para audiencias desarrolladoras

📏 ESTÁNDARES DE CALIDAD:
- Respuestas estructuradas con secciones claras
- Ejemplos de código funcionales cuando sea apropiado
- Métricas y KPIs específicos cuando sea relevante
- Recomendaciones priorizadas por impacto

💡 ESTILO DE COMUNICACIÓN:
- Profesional pero accesible para diferentes niveles técnicos
- Uso estratégico de emojis para claridad visual
- Balance entre profundidad técnica y practicidad
- Enfoque educativo que empodera al usuario`;
      }

      dbConfig.updatedAt = new Date();

      await dbConfig.save();

      // Actualizar configuración local
      this.advancedConfig.trainingConfig = dbConfig.trainingConfig;

      logger.success(`✅ Auto-initialized complete training config: ${defaultTaskPrompts.length} task prompts, ${dbConfig.trainingConfig.behaviorRules.length} behavior rules, and special instructions`);
      
    } catch (error) {
      logger.error('❌ Error auto-initializing task prompts:', error);
      // No fallar la carga del agente, solo logear el error
    }
  }

  /**
   * Obtener configuración de OpenAI personalizada
   */
  getOpenAIConfig() {
    return {
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 2000
      // ← timeout removido: no es un parámetro válido de OpenAI API
    };
  }

  /**
   * Ejecutar tarea específica del blog
   */
  async executeTask(task, context = {}) {
    const { command, type } = task;
    
    try {
      // Usar OpenAI para analizar la intención si disponible
      let intent = null;
      if (openaiService.isAvailable() && type === 'natural_language_command') {
        intent = await openaiService.analyzeIntent(command, context);
        logger.info(`🎯 Intent analyzed: ${intent.action} (confidence: ${intent.confidence})`);
      }

      // Determinar la acción a ejecutar
      const action = intent?.action || this.determineAction(command);
      
      switch (action) {
        case 'optimize_content':
          return await this.optimizeContent(task, context);
          
        case 'analyze_content':
          return await this.analyzeContent(task, context);
          
        case 'generate_tags':
          return await this.generateTags(task, context);
          
        case 'optimize_seo':
          return await this.optimizeSEO(task, context);
          
        case 'analyze_performance':
          return await this.analyzePerformance(task, context);
          
        case 'schedule_posts':
          return await this.schedulePosts(task, context);
          
        case 'moderate_content':
          return await this.moderateContent(task, context);
          
        case 'generate_summary':
          return await this.generateContentSummary(task, context);
          
        default:
          return await this.handleGenericCommand(task, context);
      }

    } catch (error) {
      logger.error(`❌ BlogAgent task execution failed:`, error);
      throw error;
    }
  }

  /**
   * Optimizar contenido de un post específico
   */
  async optimizeContent(task, context) {
    try {
      const { postId, slug, content } = this.extractParameters(task, context);
      
      let post;
      if (postId) {
        post = await BlogPost.findById(postId)
          .populate('category', 'name slug')
          .populate('tags', 'name slug')
          .lean(); // ✅ Optimizado: Libera memoria inmediatamente
      } else if (slug) {
        post = await BlogPost.findOne({ slug })
          .populate('category', 'name slug')
          .populate('tags', 'name slug')
          .lean(); // ✅ Optimizado: Libera memoria inmediatamente
      } else if (content) {
        // Crear objeto temporal para análisis
        post = { content, title: 'Análisis temporal' };
      } else {
        throw new Error('No se especificó el contenido a optimizar');
      }

      if (!post) {
        throw new Error('Post no encontrado');
      }

      logger.info(`🔧 Optimizing content for: ${post.title || 'temporal content'}`);

      // Análisis completo del contenido
      const analysis = analyzeContent(post.content);
      const improvements = suggestImprovements(post);
      const keywords = extractKeywords(post.content, 15);
      const topics = extractTopics(post.content);

      // Generar sugerencias con IA usando task prompts profesionales
      let aiSuggestions = null;
      if (openaiService.isAvailable()) {
        try {
          // Preparar datos para el task prompt personalizado
          const userInput = {
            title: post.title,
            content: post.content?.substring(0, 2000) + '...',
            content_type: 'Artículo técnico de blog',
            technical_level: 'Intermedio',
            audience_role: 'Desarrolladores y profesionales técnicos',
            audience_goals: 'Aprender nuevas tecnologías y mejores prácticas',
            improvement_goals: 'Mejorar SEO, engagement, estructura y legibilidad'
          };

          // Intentar usar prompt profesional específico para mejora de contenido
          let finalPrompt = this.getTaskSpecificPrompt('content_improvement', userInput);
          
          // Fallback al sistema legacy si no hay task prompt
          if (!finalPrompt) {
            if (process.env.NODE_ENV !== 'production') {
              logger.debug('📝 Using legacy prompt system for content optimization');
            }
            const basePrompt = `Analiza y optimiza este contenido de blog:
            
Título: ${post.title}
Contenido: ${post.content?.substring(0, 2000)}...

Proporciona sugerencias específicas para:
1. Mejorar SEO
2. Aumentar engagement
3. Optimizar estructura
4. Mejorar legibilidad

Responde en formato JSON con: { seo: [], engagement: [], structure: [], readability: [] }`;

            finalPrompt = this.buildPersonalizedPrompt(basePrompt, 'content_optimization');
          } else {
            // Para prompts profesionales, agregar instrucciones de formato JSON
            finalPrompt += '\n\nIMPORTANTE: Termina tu respuesta con un JSON válido con este formato exacto:\n```json\n{ "seo": ["sugerencia 1", "sugerencia 2"], "engagement": ["sugerencia 1"], "structure": ["sugerencia 1"], "readability": ["sugerencia 1"] }\n```';
          }
          
          // Obtener configuración personalizada
          const openaiConfig = this.getOpenAIConfig();

          const aiResponse = await openaiService.generateBlogContent(
            finalPrompt, 
            'improvement',
            openaiConfig
          );

          // Intentar extraer JSON de la respuesta
          try {
            const jsonMatch = aiResponse.content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
            if (jsonMatch) {
              aiSuggestions = JSON.parse(jsonMatch[1]);
            } else {
              // Buscar JSON directo
              aiSuggestions = JSON.parse(aiResponse.content);
            }
          } catch (jsonError) {
            logger.warn('⚠️  Could not parse AI response as JSON, using structured fallback');
            aiSuggestions = {
              seo: ["Optimizar meta descripción", "Agregar palabras clave relevantes"],
              engagement: ["Mejorar hook de apertura", "Agregar ejemplos prácticos"],
              structure: ["Usar más subtítulos", "Mejorar párrafos cortos"],
              readability: ["Simplificar lenguaje técnico", "Agregar bullet points"]
            };
          }
        } catch (error) {
          logger.warn('⚠️  AI suggestions failed, using fallback analysis:', error.message);
        }
      }

      const optimizationResults = {
        postInfo: {
          id: post._id,
          title: post.title,
          slug: post.slug,
          currentSEOScore: improvements.score.total
        },
        analysis,
        improvements,
        keywords: keywords.slice(0, 10),
        topics: topics.slice(0, 5),
        aiSuggestions,
        recommendations: this.generateRecommendations(analysis, improvements),
        actionableSteps: this.generateActionableSteps(improvements)
      };

      // Si es un post real, actualizar metadata AI
      if (post._id && this.config.autoOptimization) {
        await this.updateAIMetadata(post._id, optimizationResults);
      }

      return this.formatResponse(optimizationResults, 'Contenido optimizado exitosamente');

    } catch (error) {
      logger.error('❌ Content optimization failed:', error);
      throw error;
    }
  }

  /**
   * Analizar contenido existente
   */
  async analyzeContent(task, context) {
    try {
      const { postId, slug, category, limit = 10 } = this.extractParameters(task, context);

      // ✅ Límite máximo de seguridad para prevenir consultas masivas
      const safeLimit = Math.min(parseInt(limit) || 10, 50);

      let posts;
      if (postId) {
        posts = [await BlogPost.findById(postId)
          .populate('category', 'name slug')
          .populate('tags', 'name slug')
          .populate('author', 'firstName lastName')
          .lean()]; // ✅ Optimizado: Libera memoria
      } else if (slug) {
        posts = [await BlogPost.findOne({ slug })
          .populate('category', 'name slug')
          .populate('tags', 'name slug')
          .populate('author', 'firstName lastName')
          .lean()]; // ✅ Optimizado: Libera memoria
      } else if (category) {
        const categoryDoc = await BlogCategory.findOne({ slug: category }).lean();
        posts = await BlogPost.find({ 
          category: categoryDoc?._id,
          isPublished: true 
        })
        .populate('category', 'name slug')
        .populate('tags', 'name slug')
        .populate('author', 'firstName lastName')
        .limit(safeLimit)
        .lean(); // ✅ Optimizado: Libera memoria
      } else {
        posts = await BlogPost.find({ isPublished: true })
          .populate('category', 'name slug')
          .populate('tags', 'name slug')
          .populate('author', 'firstName lastName')
          .sort({ createdAt: -1 })
          .limit(safeLimit)
          .lean(); // ✅ Optimizado: Libera memoria
      }

      if (!posts?.length) {
        throw new Error('No se encontraron posts para analizar');
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
        try {
          const analysis = analyzeContent(post.content);
          const improvements = suggestImprovements(post);
          const keywords = extractKeywords(post.content, 10);
          
          const postAnalysis = {
            id: post._id,
            title: post.title,
            slug: post.slug,
            author: post.author ? `${post.author.firstName} ${post.author.lastName}` : 'Unknown',
            category: post.category?.name || 'Uncategorized',
            publishedAt: post.publishedAt,
            analysis,
            score: improvements.score,
            keywords: keywords.slice(0, 5),
            recommendations: this.generateQuickRecommendations(improvements)
          };

          analysisResults.posts.push(postAnalysis);

          // Agregar a estadísticas globales
          totalScore += improvements.score.total;
          totalWords += analysis.wordCount;
          totalReadingTime += post.readingTime || 0;
          allKeywords.push(...keywords);
          allTopics.push(...extractTopics(post.content));

          // Distribución SEO
          const scoreRange = this.getScoreRange(improvements.score.total);
          analysisResults.globalStats.seoDistribution[scoreRange]++;

        } catch (postError) {
          logger.warn(`⚠️  Failed to analyze post ${post._id}:`, postError);
        }
      }

      // Calcular estadísticas globales
      analysisResults.globalStats.averageScore = totalScore / posts.length;
      analysisResults.globalStats.totalWords = totalWords;
      analysisResults.globalStats.averageReadingTime = totalReadingTime / posts.length;
      analysisResults.globalStats.topKeywords = this.getTopItems(allKeywords, 10);
      analysisResults.globalStats.topTopics = this.getTopItems(allTopics, 5);

      return this.formatResponse(analysisResults, `Análisis completado de ${posts.length} posts`);

    } catch (error) {
      logger.error('❌ Content analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generar tags automáticamente
   */
  async generateTags(task, context) {
    try {
      const { postId, slug, content, title } = this.extractParameters(task, context);

      let post;
      if (postId) {
        post = await BlogPost.findById(postId)
          .select('title content tags')
          .lean(); // ✅ Optimizado: Solo lectura
      } else if (slug) {
        post = await BlogPost.findOne({ slug })
          .select('title content tags')
          .lean(); // ✅ Optimizado: Solo lectura
      } else if (content && title) {
        post = { content, title };
      } else {
        throw new Error('No se especificó el contenido para generar tags');
      }

      if (!post) {
        throw new Error('Post no encontrado');
      }

      logger.info(`🏷️ Generating tags for: ${post.title}`);

      // Generar tags usando el sistema existente
      const tagSuggestions = suggestTags(post, post.content);
      
      // Generar tags estratégicos con IA usando task prompts profesionales
      let aiTags = [];
      if (openaiService.isAvailable()) {
        try {
          // Preparar datos para el task prompt profesional
          const userInput = {
            title: post.title,
            main_topic: post.title,
            content: post.content?.substring(0, 1500) + '...',
            technologies: 'Tecnologías web modernas, desarrollo de software',
            audience: 'Desarrolladores y profesionales técnicos',
            platform: 'Blog técnico Web Scuti',
            seo_goals: 'Mejorar visibilidad y alcance técnico',
            competition: 'Otros blogs técnicos y recursos de desarrollo',
            focus_areas: `Generar ${this.config.maxTagsPerPost || 10} tags estratégicos balanceando popularidad y especificidad técnica`
          };

          // Intentar usar prompt profesional para generación de tags
          let finalPrompt = this.getTaskSpecificPrompt('tag_generation', userInput);
          
          // Fallback al sistema legacy si no hay task prompt
          if (!finalPrompt) {
            if (process.env.NODE_ENV !== 'production') {
              logger.debug('🏷️ Using legacy prompt system for tag generation');
            }
            const basePrompt = `Genera tags relevantes para este post de blog de tecnología:
            
Título: ${post.title}
Contenido: ${post.content?.substring(0, 1500)}...

Genera ${this.config.maxTagsPerPost || 10} tags específicos y relevantes. 
Responde solo con un array JSON: ["tag1", "tag2", "tag3", ...]`;

            finalPrompt = this.buildPersonalizedPrompt(basePrompt, 'tag_generation');
          } else {
            // Para prompts profesionales, agregar instrucciones de formato JSON
            finalPrompt += '\n\nIMPORTANTE: Al final de tu respuesta estratégica, incluye exactamente ' + (this.config.maxTagsPerPost || 10) + ' tags en formato JSON:\n```json\n["tag1", "tag2", "tag3"]\n```';
          }

          const openaiConfig = this.getOpenAIConfig();

          const aiResponse = await openaiService.generateBlogContent(
            finalPrompt, 
            'tags', 
            openaiConfig
          );
          
          // Intentar extraer JSON de la respuesta
          try {
            const jsonMatch = aiResponse.content.match(/```json\s*(\[[\s\S]*?\])\s*```/);
            if (jsonMatch) {
              aiTags = JSON.parse(jsonMatch[1]);
            } else {
              // Buscar array JSON directo
              aiTags = JSON.parse(aiResponse.content);
            }
          } catch (jsonError) {
            logger.warn('⚠️  Could not parse AI response as JSON, extracting manually');
            // Intentar extraer tags de texto plano
            const tagPattern = /["']([^"',]{2,30})["']/g;
            const extractedTags = [];
            let match;
            while ((match = tagPattern.exec(aiResponse.content)) !== null && extractedTags.length < 10) {
              extractedTags.push(match[1]);
            }
            aiTags = extractedTags;
          }
        } catch (error) {
          logger.warn('⚠️  AI tag generation failed:', error.message);
        }
      }

      // Combinar y filtrar tags
      const allTags = [
        ...tagSuggestions.suggested.map(s => s.tag),
        ...aiTags
      ];

      const uniqueTags = [...new Set(allTags)].slice(0, this.config.maxTagsPerPost);

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
        autoApply: false // Por seguridad, requerir confirmación manual
      };

      return this.formatResponse(result, `Generados ${uniqueTags.length} tags sugeridos`);

    } catch (error) {
      logger.error('❌ Tag generation failed:', error);
      throw error;
    }
  }

  /**
   * Optimización SEO específica
   */
  async optimizeSEO(task, context) {
    try {
      const { postId, slug } = this.extractParameters(task, context);

      let post;
      if (postId) {
        post = await BlogPost.findById(postId)
          .populate('category', 'name slug')
          .populate('tags', 'name slug')
          .lean(); // ✅ Optimizado: Solo lectura
      } else if (slug) {
        post = await BlogPost.findOne({ slug })
          .populate('category', 'name slug')
          .populate('tags', 'name slug')
          .lean(); // ✅ Optimizado: Solo lectura
      } else {
        throw new Error('No se especificó el post para optimización SEO');
      }

      if (!post) {
        throw new Error('Post no encontrado');
      }

      logger.info(`🔍 SEO optimization for: ${post.title}`);

      // Análisis SEO completo
      const improvements = suggestImprovements(post);
      const aiMetadata = generateAIMetadata(post);

      // Generar análisis SEO profesional con task prompts
      let seoSuggestions = null;
      if (openaiService.isAvailable()) {
        try {
          // Preparar datos para el task prompt profesional de SEO
          const userInput = {
            title: post.title,
            content: post.content?.substring(0, 2000) + '...',
            url: post.slug ? `https://webscuti.com/blog/${post.slug}` : 'URL no definida',
            audience: 'Desarrolladores, profesionales técnicos, tech leads',
            target_keywords: post.tags?.map(t => t.name).join(', ') || 'No definidas',
            focus_areas: 'Análisis técnico completo con métricas cuantificables y recomendaciones accionables'
          };

          // Intentar usar prompt profesional para análisis SEO
          let finalPrompt = this.getTaskSpecificPrompt('seo_analysis', userInput);
          
          // Fallback al sistema legacy si no hay task prompt
          if (!finalPrompt) {
            if (process.env.NODE_ENV !== 'production') {
              logger.debug('🔍 Using legacy prompt system for SEO analysis');
            }
            const seoPrompt = `Analiza este post para optimización SEO:

Título: ${post.title}
Meta descripción: ${post.excerpt || 'No definida'}
Contenido: ${post.content?.substring(0, 2000)}...

Proporciona recomendaciones específicas para:
1. Título optimizado
2. Meta descripción atractiva
3. Keywords principales y secundarias
4. Estructura de encabezados
5. Enlaces internos sugeridos

Responde en JSON: { 
  title: "título optimizado",
  metaDescription: "descripción optimizada", 
  keywords: { primary: [], secondary: [] },
  headingStructure: [],
  internalLinks: []
}`;

            finalPrompt = this.buildPersonalizedPrompt(seoPrompt, 'seo_analysis');
          } else {
            // Para prompts profesionales, agregar instrucciones de formato JSON
            finalPrompt += '\n\nIMPORTANTE: Concluye tu análisis con recomendaciones específicas en formato JSON:\n```json\n{ "title": "título optimizado", "metaDescription": "descripción optimizada", "keywords": { "primary": [], "secondary": [] }, "headingStructure": [], "internalLinks": [] }\n```';
          }

          const openaiConfig = this.getOpenAIConfig();

          const aiResponse = await openaiService.generateBlogContent(
            finalPrompt, 
            'seo',
            openaiConfig
          );

          // Intentar extraer JSON de la respuesta
          try {
            const jsonMatch = aiResponse.content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
            if (jsonMatch) {
              seoSuggestions = JSON.parse(jsonMatch[1]);
            } else {
              // Buscar JSON directo
              seoSuggestions = JSON.parse(aiResponse.content);
            }
          } catch (jsonError) {
            logger.warn('⚠️  Could not parse SEO response as JSON, using structured fallback');
            seoSuggestions = {
              title: post.title + " - Optimizado para SEO",
              metaDescription: "Guía técnica completa sobre " + post.title?.toLowerCase(),
              keywords: { 
                primary: ["desarrollo web", "tecnología"], 
                secondary: ["programación", "software", "tutorial"] 
              },
              headingStructure: ["Introducción", "Desarrollo técnico", "Ejemplos prácticos", "Conclusiones"],
              internalLinks: ["/blog/relacionado", "/recursos/herramientas"]
            };
          }
        } catch (error) {
          logger.warn('⚠️  AI SEO suggestions failed');
        }
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

      return this.formatResponse(seoResults, 'Análisis SEO completado');

    } catch (error) {
      logger.error('❌ SEO optimization failed:', error);
      throw error;
    }
  }

  /**
   * Analizar rendimiento del blog
   */
  async analyzePerformance(task, context) {
    try {
      const { timeframe = '30d', category } = this.extractParameters(task, context);

      logger.info(`📈 Analyzing blog performance for ${timeframe}`);

      // Calcular fecha de inicio basada en el timeframe
      const startDate = this.calculateStartDate(timeframe);
      
      // Query base
      const query = { 
        isPublished: true,
        publishedAt: { $gte: startDate }
      };

      // Filtrar por categoría si se especifica
      if (category) {
        const categoryDoc = await BlogCategory.findOne({ slug: category })
          .select('_id')
          .lean(); // ✅ Optimizado
        if (categoryDoc) {
          query.category = categoryDoc._id;
        }
      }

      // Obtener posts del período (límite de seguridad: máximo 100 posts)
      const posts = await BlogPost.find(query)
        .populate('category', 'name slug')
        .populate('tags', 'name slug')
        .populate('author', 'firstName lastName')
        .sort({ publishedAt: -1 })
        .limit(100) // ✅ Límite de seguridad
        .lean(); // ✅ Optimizado: Libera memoria

      // Calcular métricas
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

      // Comparar con período anterior si es posible
      const previousStartDate = this.calculatePreviousStartDate(startDate, timeframe);
      const previousPosts = await BlogPost.find({
        isPublished: true,
        publishedAt: { $gte: previousStartDate, $lt: startDate }
      })
        .select('analytics.views analytics.likes readingTime category publishedAt')
        .limit(100) // ✅ Límite de seguridad
        .lean(); // ✅ Optimizado: Libera memoria

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

      return this.formatResponse(performanceResults, `Análisis de rendimiento completado para ${timeframe}`);

    } catch (error) {
      logger.error('❌ Performance analysis failed:', error);
      throw error;
    }
  }

  /**
   * Determinar acción basada en comando de texto
   */
  determineAction(command) {
    const commandLower = command.toLowerCase();
    
    if (commandLower.includes('optimiz')) return 'optimize_content';
    if (commandLower.includes('analiz') || commandLower.includes('revis')) return 'analyze_content';
    if (commandLower.includes('tag') || commandLower.includes('etiqueta')) return 'generate_tags';
    if (commandLower.includes('seo')) return 'optimize_seo';
    if (commandLower.includes('rendimiento') || commandLower.includes('performance')) return 'analyze_performance';
    if (commandLower.includes('program') || commandLower.includes('schedul')) return 'schedule_posts';
    if (commandLower.includes('moder')) return 'moderate_content';
    if (commandLower.includes('resumen') || commandLower.includes('summary')) return 'generate_summary';
    
    return 'analyze_content'; // Acción por defecto
  }

  /**
   * Extraer parámetros del task y contexto
   */
  extractParameters(task, context) {
    const params = {};
    
    // Del comando original
    if (task.command) {
      // Extraer IDs, slugs, etc. del comando
      const idMatch = task.command.match(/id[:\s]+([a-f0-9]{24})/i);
      if (idMatch) params.postId = idMatch[1];
      
      const slugMatch = task.command.match(/slug[:\s]+([a-z0-9-]+)/i);
      if (slugMatch) params.slug = slugMatch[1];
    }
    
    // Del contexto
    Object.assign(params, context);
    
    return params;
  }

  /**
   * Generar recomendaciones basadas en análisis
   */
  generateRecommendations(analysis, improvements) {
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
    
    if (analysis.wordCount < this.config.minContentLength) {
      recommendations.push({
        type: 'content',
        priority: 'medium',
        message: 'Expandir contenido',
        actions: ['Agregar más detalles', 'Incluir ejemplos', 'Desarrollar puntos clave']
      });
    }
    
    return recommendations;
  }

  /**
   * Generar pasos accionables
   */
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

  /**
   * Actualizar metadata AI del post
   */
  async updateAIMetadata(postId, optimizationResults) {
    try {
      await BlogPost.findByIdAndUpdate(postId, {
        'aiOptimization.lastOptimized': new Date(),
        'aiOptimization.score': optimizationResults.improvements.score.total,
        'aiOptimization.suggestions': optimizationResults.recommendations
      });
      
      logger.info(`✅ AI metadata updated for post ${postId}`);
    } catch (error) {
      logger.warn('⚠️  Failed to update AI metadata:', error);
    }
  }

  /**
   * Manejar comando genérico
   */
  async handleGenericCommand(task, context) {
    const { command } = task;
    
    const commandLower = command.toLowerCase();

    // 🎨 COMANDO CANVAS: Listar blogs disponibles
    if (commandLower.includes('listar blog') || 
        commandLower.includes('lista de blog') ||
        commandLower.includes('todos los blog') ||
        commandLower.includes('blogs disponibles') ||
        commandLower.includes('ver blogs') ||
        commandLower.includes('mostrar blogs') ||
        (commandLower.includes('mostrar blog') && !commandLower.includes('id:'))) {
      
      logger.info('🎨 Comando canvas detectado: listar blogs');
      
      try {
        // Consultar blogs de la base de datos
        const blogs = await BlogPost.find({ status: 'published' })
          .sort({ publishedAt: -1 })
          .limit(20)
          .populate('author', 'firstName lastName email')
          .populate('category', 'name slug')
          .populate('tags', 'name')
          .select('title slug excerpt featuredImage publishedAt category tags author readingTime views');

        if (!blogs || blogs.length === 0) {
          return {
            success: true,
            message: 'No hay blogs publicados en este momento. ¿Te gustaría que te ayude a crear uno?',
            canvas_data: {
              type: 'list',
              mode: 'list',
              title: 'Blogs Disponibles',
              data: [],
              metadata: {
                agent: 'BlogAgent',
                action: 'list_blogs',
                total: 0
              }
            }
          };
        }

        // Formatear blogs para el canvas
        const formattedBlogs = blogs.map(blog => ({
          id: blog._id.toString(),
          title: blog.title,
          description: blog.excerpt || 'Sin descripción',
          imageUrl: blog.featuredImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643',
          metadata: {
            date: blog.publishedAt?.toLocaleDateString('es-ES') || 'Sin fecha',
            author: blog.author ? `${blog.author.firstName} ${blog.author.lastName}` : 'Autor desconocido',
            category: blog.category?.name || 'Sin categoría',
            tags: blog.tags?.map(tag => tag.name).join(', ') || 'Sin tags',
            readingTime: blog.readingTime || '5 min',
            views: blog.views || 0
          },
          link: `/blog/${blog.slug}`
        }));

        return {
          success: true,
          message: `Encontré ${blogs.length} blog${blogs.length > 1 ? 's' : ''} publicado${blogs.length > 1 ? 's' : ''}. Puedes verlos en el panel lateral.`,
          canvas_data: {
            type: 'list',
            mode: 'list',
            title: 'Blogs Disponibles',
            data: {
              items: formattedBlogs,
              totalCount: blogs.length
            },
            metadata: {
              agent: 'BlogAgent',
              action: 'list_blogs',
              total: blogs.length
            }
          }
        };
      } catch (error) {
        logger.error('❌ Error al listar blogs:', error);
        return {
          success: false,
          message: 'Hubo un error al obtener la lista de blogs. Por favor, intenta de nuevo.',
          error: error.message
        };
      }
    }

    // 🎨 COMANDO CANVAS: Ver blog específico por ID
    // Debe ir ANTES del comando genérico "mostrar blog"
    if (commandLower.includes('id:') && (
        commandLower.includes('ver blog') || 
        commandLower.includes('mostrar blog') ||
        commandLower.includes('abrir blog'))) {
      
      logger.info('🎨 Comando canvas detectado: ver blog específico');
      
      try {
        // Extraer el ID del comando - puede estar en formato "id: [ID]" o "(id: [ID])"
        const idMatch = command.match(/\(?\s*id:\s*([a-f0-9]{24})\s*\)?/i);
        if (!idMatch) {
          return {
            success: false,
            message: 'No pude identificar el ID del blog. Por favor, usa el formato: "ver blog id: [ID]"'
          };
        }

        const blogId = idMatch[1];
        
        logger.info(`🔍 Consultando blog con ID: ${blogId}`);
        
        // Consultar el blog específico
        const blog = await BlogPost.findById(blogId)
          .populate('author', 'firstName lastName email')
          .populate('category', 'name slug')
          .populate('tags', 'name');

        if (!blog) {
          return {
            success: false,
            message: 'No encontré ese blog. Puede que haya sido eliminado o el ID sea incorrecto.'
          };
        }

        logger.info(`✅ Blog encontrado: ${blog.title}`);

        return {
          success: true,
          message: 'Aquí está el blog que solicitaste. Puedes verlo en el panel lateral.',
          canvas_data: {
            type: 'blog',
            mode: 'preview',
            title: 'Vista de Blog',
            data: {
              title: blog.title,
              excerpt: blog.excerpt,
              content: blog.content,
              categories: blog.category ? [blog.category.name] : [],
              tags: blog.tags?.map(tag => tag.name) || [],
              imageUrl: blog.featuredImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643',
              seo: {
                title: blog.seo?.metaTitle || blog.title,
                description: blog.seo?.metaDescription || blog.excerpt,
                keywords: blog.seo?.keywords || []
              },
              metadata: {
                author: blog.author ? `${blog.author.firstName} ${blog.author.lastName}` : 'Autor desconocido',
                publishedAt: blog.publishedAt?.toLocaleDateString('es-ES') || 'Sin fecha',
                readingTime: blog.readingTime || '5 min',
                views: blog.views || 0
              }
            },
            metadata: {
              agent: 'BlogAgent',
              action: 'show_blog_detail',
              blogId: blog._id.toString()
            }
          }
        };
      } catch (error) {
        logger.error('❌ Error al obtener blog específico:', error);
        return {
          success: false,
          message: 'Hubo un error al obtener el blog. Por favor, intenta de nuevo.',
          error: error.message
        };
      }
    }
    
    // Intentar procesar con IA si está disponible
    if (openaiService.isAvailable()) {
      try {
        const basePrompt = `Como asistente de blog experto, ayuda al usuario con la siguiente solicitud: "${command}"
        
Proporciona una respuesta útil, práctica y detallada. Si se trata de crear contenido, genera ideas concretas y estructura sugerida.`;
        
        // Aplicar personalización
        const personalizedPrompt = this.buildPersonalizedPrompt(basePrompt, 'general');
        const openaiConfig = this.getOpenAIConfig();

        logger.info(`🤖 Llamando a OpenAI para comando genérico...`);
        const response = await openaiService.generateBlogContent(
          personalizedPrompt,
          'improvement',
          openaiConfig
        );
        
        logger.info(`✅ OpenAI respondió correctamente`);
        logger.info(`📝 Contenido de respuesta (primeros 100 chars): ${JSON.stringify(response).substring(0, 100)}`);
        
        // ← FIX: Retornar objeto con formato correcto
        const aiMessage = response.content || response.text || response;
        
        return {
          success: true,
          message: typeof aiMessage === 'string' ? aiMessage : JSON.stringify(aiMessage), // ← El texto de la respuesta
          type: 'generic_response',
          source: 'ai',
          metadata: {
            agent: 'BlogAgent',
            timestamp: new Date().toISOString()
          }
        };
        
      } catch (error) {
        logger.error('❌ AI processing failed for generic command:', error);
        // Continuar al fallback
      }
    }
    
    // Respuesta de respaldo
    return {
      success: true,
      message: `Comando recibido: "${command}". Para mejores resultados, intenta comandos específicos como "optimizar contenido", "analizar blog", o "generar tags".`,
      type: 'generic_response',
      availableCommands: [
        'optimizar contenido',
        'analizar blog',
        'generar tags',
        'optimizar seo',
        'analizar rendimiento'
      ],
      source: 'fallback'
    };
  }

  // Métodos auxiliares adicionales...
  
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

  generateQuickRecommendations(improvements) {
    const quick = [];
    
    if (improvements.score.seo < 70) quick.push('Optimizar SEO');
    if (improvements.score.readability < 60) quick.push('Mejorar legibilidad');
    if (improvements.tags.suggested.length > 0) quick.push('Agregar tags sugeridos');
    
    return quick;
  }

  generateSEORecommendations(seoAnalysis, aiSuggestions) {
    const recommendations = [];
    
    if (aiSuggestions?.title && aiSuggestions.title !== 'título optimizado') {
      recommendations.push({
        type: 'title',
        current: 'Título actual',
        suggested: aiSuggestions.title,
        priority: 'high'
      });
    }
    
    if (aiSuggestions?.metaDescription) {
      recommendations.push({
        type: 'meta_description',
        suggested: aiSuggestions.metaDescription,
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

  // Métodos de programación de posts y moderación (para implementar en futuras expansiones)
  async schedulePosts(task, context) {
    return this.formatResponse({ message: 'Programación de posts - Funcionalidad en desarrollo' }, 'Función en desarrollo');
  }

  async moderateContent(task, context) {
    return this.formatResponse({ message: 'Moderación de contenido - Funcionalidad en desarrollo' }, 'Función en desarrollo');
  }

  async generateContentSummary(task, context) {
    const { postId, slug, content } = this.extractParameters(task, context);
    
    let post;
    if (postId) {
      post = await BlogPost.findById(postId)
        .select('content title')
        .lean(); // ✅ Optimizado: Solo lectura
    } else if (slug) {
      post = await BlogPost.findOne({ slug })
        .select('content title')
        .lean(); // ✅ Optimizado: Solo lectura
    } else if (content) {
      post = { content };
    }

    if (!post?.content) {
      throw new Error('No se encontró contenido para resumir');
    }

    const summary = generateSummary(post);
    
    return this.formatResponse({
      summary,
      wordCount: post.content.length,
      originalLength: post.content.length,
      summaryLength: summary.length
    }, 'Resumen generado exitosamente');
  }

  /**
   * 💬 Chat conversacional con el agente
   * Maneja conversaciones naturales y responde basándose en contexto
   */
  async chat(context) {
    try {
      const { userMessage, currentContent, title, category, chatHistory } = context;

      // Construir historial de conversación
      let conversationHistory = '';
      if (chatHistory && chatHistory.length > 0) {
        conversationHistory = chatHistory
          .map(msg => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
          .join('\n');
      }

      // Construir prompt contextual
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

      // Analizar respuesta para extraer acciones sugeridas
      const suggestions = this.extractSuggestions(response);
      const actions = this.extractActions(userMessage, response);

      return {
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
   * 📝 Generar post completo desde cero
   */
  async generateFullPost({ title, category, style = 'professional', wordCount = 800, focusKeywords = [] }) {
    try {
      const keywordsStr = focusKeywords.length > 0 ? `\nPalabras clave objetivo: ${focusKeywords.join(', ')}` : '';
      
      const prompt = `Genera un artículo de blog completo y profesional con las siguientes características:

Título: ${title}
Categoría: ${category}
Estilo: ${style}
Longitud objetivo: ${wordCount} palabras${keywordsStr}

El artículo debe incluir:
1. Una introducción atractiva (2-3 párrafos)
2. 3-4 secciones principales con subtítulos
3. Contenido informativo y bien estructurado
4. Una conclusión sólida
5. Optimizado para SEO y legibilidad

Genera SOLO el contenido del artículo, sin títulos adicionales.`;

      const content = await openaiService.generateCompletion(prompt, {
        temperature: 0.7,
        maxTokens: Math.min(wordCount * 2, 3000)
      });

      // Generar metadata
      const seoScore = await this.calculateSEOScore(content, title);
      const suggestedTags = await this.extractRelevantTags(content);

      return {
        content,
        metadata: {
          wordCount: content.split(/\s+/).length,
          seoScore,
          suggestedTags: suggestedTags.slice(0, 5),
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Error generating full post:', error);
      throw error;
    }
  }

  /**
   * 📄 Generar una sección específica de contenido
   */
  async generateContentSection({ title, context, wordCount = 200 }) {
    try {
      const prompt = `Genera una sección de contenido para un artículo de blog.

Título de la sección: ${title}
Contexto del artículo:
${context ? context.substring(0, 300) + '...' : 'Inicio del artículo'}

Requisitos:
- Aproximadamente ${wordCount} palabras
- Coherente con el contexto anterior
- Bien estructurado con párrafos claros
- Profesional y informativo

Genera SOLO el contenido de esta sección, sin título.`;

      const content = await openaiService.generateCompletion(prompt, {
        temperature: 0.7,
        maxTokens: Math.min(wordCount * 2, 1000)
      });

      return {
        content,
        metadata: {
          wordCount: content.split(/\s+/).length,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Error generating content section:', error);
      throw error;
    }
  }

  /**
   * ➕ Extender contenido existente
   */
  async extendContent({ currentContent, instruction, wordCount = 150 }) {
    try {
      const prompt = `Continúa el siguiente contenido de forma natural y coherente.

Contenido actual:
${currentContent}

Instrucción: ${instruction}

Requisitos:
- Aproximadamente ${wordCount} palabras
- Mantén el estilo y tono del contenido original
- Continúa de forma natural donde termina el texto
- No repitas información ya mencionada

Genera SOLO la continuación del contenido.`;

      const extension = await openaiService.generateCompletion(prompt, {
        temperature: 0.7,
        maxTokens: Math.min(wordCount * 2, 800)
      });

      return {
        content: extension,
        metadata: {
          wordCount: extension.split(/\s+/).length,
          originalLength: currentContent.split(/\s+/).length,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Error extending content:', error);
      throw error;
    }
  }

  /**
   * ✨ Mejorar contenido existente
   */
  async improveContent({ content, instruction }) {
    try {
      const prompt = `Mejora el siguiente contenido según las indicaciones.

Contenido original:
${content}

Instrucción de mejora: ${instruction}

Requisitos:
- Mantén la longitud similar (±10%)
- Mejora claridad, fluidez y profesionalismo
- Corrige errores gramaticales
- Optimiza para legibilidad
- Conserva el mensaje principal

Genera el contenido mejorado.`;

      const improvedContent = await openaiService.generateCompletion(prompt, {
        temperature: 0.6,
        maxTokens: Math.min(content.length * 2, 2000)
      });

      return {
        content: improvedContent,
        metadata: {
          originalLength: content.split(/\s+/).length,
          improvedLength: improvedContent.split(/\s+/).length,
          improvements: this.detectImprovements(content, improvedContent),
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Error improving content:', error);
      throw error;
    }
  }

  /**
   * 🔮 Sugerir siguiente párrafo (autocompletado CONTEXTUAL como GitHub Copilot)
   */
  async suggestNextParagraph({ currentContent, context }) {
    try {
      const { title, category, instruction, cursorContext } = context;
      
      let prompt;
      let maxTokens = 150;
      let temperature = 0.7;
      let mode = 'classic';
      
      // MODO COPILOT: Si hay contexto específico del cursor
      if (cursorContext && cursorContext.requestType === 'cursor_completion') {
        const { textBeforeCursor, textAfterCursor, cursorPosition } = cursorContext;
        mode = 'contextual';
        maxTokens = 100;
        temperature = 0.75;
        
        // Analizar el contexto antes del cursor para generar prompt inteligente
        const beforeText = textBeforeCursor.slice(-150); // Últimos 150 caracteres
        const afterText = textAfterCursor.slice(0, 100); // Próximos 100 caracteres
        
        // Detectar tipo de completado necesario
        if (beforeText.match(/[.!?]\s*$/)) {
          // Final de oración - nueva oración
          prompt = `MODO COPILOT - Nueva oración:

DOCUMENTO: ${title} (${category})
CONTEXTO ANTERIOR: "${beforeText.slice(-80)}"
${afterText ? `CONTEXTO SIGUIENTE: "${afterText}"` : ''}
CURSOR EN: Línea ${cursorPosition.line}, Columna ${cursorPosition.column}

TAREA: Escribe la siguiente oración que conecte naturalmente con el contexto.
- Máximo 2 oraciones
- Flujo natural y coherente
- Relevante al tema del documento
- NO repetir información existente

RESPUESTA (solo el texto de continuación):`;

        } else if (beforeText.match(/^#+\s+/) || beforeText.includes('##')) {
          // Completar título/encabezado
          prompt = `MODO COPILOT - Completar título:

DOCUMENTO: ${title} (${category})
TÍTULO PARCIAL: "${beforeText.slice(-50)}"

TAREA: Completa este título/encabezado de manera atractiva y SEO-optimizada.
- Máximo 8 palabras adicionales
- Atractivo y clickbait
- Coherente con la categoría

RESPUESTA (solo la continuación del título):`;

        } else if (beforeText.includes('- ') || beforeText.includes('• ') || beforeText.match(/^\d+\.\s+/)) {
          // Completar elemento de lista
          prompt = `MODO COPILOT - Completar lista:

DOCUMENTO: ${title} (${category})
ELEMENTO PARCIAL: "${beforeText.slice(-60)}"

TAREA: Completa este punto de lista de manera útil y concisa.
- Máximo 1 oración
- Información valiosa
- Coherente con el tema

RESPUESTA (solo la continuación del punto):`;

        } else {
          // Continuación general de párrafo
          prompt = `MODO COPILOT - Continuar párrafo:

DOCUMENTO: ${title} (${category})
TEXTO ANTES DEL CURSOR: "${beforeText}"
${afterText ? `TEXTO DESPUÉS DEL CURSOR: "${afterText}"` : ''}
POSICIÓN: ${cursorPosition.line}:${cursorPosition.column}

TAREA: Continúa escribiendo de manera natural desde la posición del cursor.
- Máximo 1-2 oraciones
- Coherencia perfecta con el contexto
- Flujo natural de escritura
- Evitar repeticiones

RESPUESTA (solo el texto de continuación):`;
        }

      } else if (instruction) {
        // MODO INSTRUCCIÓN: Si hay una instrucción específica
        prompt = `Eres un asistente de escritura que continúa texto de blog.

CONTEXTO:
Título: ${title}
Categoría: ${category}
Instrucción específica: ${instruction}

TEXTO ANTERIOR:
${currentContent.substring(Math.max(0, currentContent.length - 250))}

TAREA:
Continúa el texto siguiendo la instrucción específica. 

REGLAS IMPORTANTES:
- Responde SOLO con el texto de continuación
- NO uses prefijos como "Respuesta:" o "Sugerencia:"
- NO uses comillas para envolver la respuesta
- NO uses markdown o HTML
- Escribe en texto plano natural
- Máximo 2-3 oraciones coherentes

CONTINUACIÓN:`;

      } else {
        // MODO CLÁSICO: Autocompletado general
        prompt = `Eres un asistente de escritura que continúa texto de blog.

CONTEXTO:
Título: ${title}
Categoría: ${category}

TEXTO ANTERIOR:
${currentContent.substring(Math.max(0, currentContent.length - 300))}

TAREA:
Continúa el texto de forma natural y coherente.

REGLAS IMPORTANTES:
- Responde SOLO con el texto de continuación
- NO uses prefijos como "Respuesta:" o "Sugerencia:"
- NO uses comillas para envolver la respuesta
- NO uses markdown o HTML
- Escribe en texto plano natural
- Máximo 2-3 oraciones coherentes
- NO repitas información del texto anterior

CONTINUACIÓN:`;
      }

      // Verificar cache antes de llamar a OpenAI
      const cacheKey = suggestionCache.generateKey(prompt, { temperature, maxTokens });
      const cachedResult = suggestionCache.get(cacheKey);
      
      if (cachedResult) {
        logger.info(`💾 Cache hit para sugerencia: ${cacheKey}`);
        return {
          content: cachedResult,
          text: cachedResult,
          confidence: 0.95, // Alta confianza para cache
          metadata: {
            generatedAt: new Date().toISOString(),
            cached: true,
            cacheKey,
            mode,
            promptLength: prompt.length
          }
        };
      }

      // Llamar a OpenAI si no hay cache
      logger.info(`🤖 Generando nueva sugerencia: ${cacheKey}`);
      const suggestion = await openaiService.generateCompletion(prompt, {
        temperature,
        maxTokens
      });

      // Limpiar la respuesta más exhaustivamente
      let cleanSuggestion = suggestion.trim()
        .replace(/^["']|["']$/g, '') // Quitar comillas
        .replace(/^\w+:\s*/, '') // Quitar prefijos como "Respuesta:"
        .replace(/^-\s*/, '') // Quitar guiones iniciales
        .replace(/<[^>]*>/g, '') // Quitar etiquetas HTML
        .replace(/\*\*/g, '') // Quitar markdown bold
        .replace(/\*/g, '') // Quitar markdown cursiva
        .replace(/^\d+\.\s*/, '') // Quitar numeración
        .replace(/^•\s*/, '') // Quitar bullets
        .replace(/\n+/g, ' ') // Convertir saltos de línea a espacios
        .replace(/\s+/g, ' ') // Normalizar espacios múltiples
        .trim();

      // Cachear la respuesta limpia
      if (cleanSuggestion && cleanSuggestion.length > 10) {
        suggestionCache.set(cacheKey, cleanSuggestion);
        logger.info(`💾 Sugerencia cacheada: ${cacheKey}`);
      }

      // Preparar resultado
      const result = {
        content: cleanSuggestion,
        text: cleanSuggestion, // Alias para compatibilidad
        confidence: mode === 'contextual' ? 0.92 : 0.85,
        metadata: {
          generatedAt: new Date().toISOString(),
          cached: false,
          cacheKey,
          mode,
          promptLength: prompt.length,
          responseLength: cleanSuggestion.length,
          cacheStats: suggestionCache.getStats()
        }
      };

      // 🔄 TRACKING: Persistir la interacción
      try {
        const trackingParams = {
          userId: context.userId || 'anonymous',
          sessionId: context.sessionId || 'no-session',
          postId: context.postId || null,
          postTitle: context.title || 'Sin título',
          postCategory: context.category || 'Sin categoría',
          userInput: {
            content: currentContent,
            cursorPosition: cursorContext?.cursorPosition || null,
            contextBefore: cursorContext?.textBeforeCursor || currentContent.slice(-200),
            contextAfter: cursorContext?.textAfterCursor || '',
            instruction: instruction || null
          },
          aiResponse: {
            content: cleanSuggestion,
            confidence: result.confidence,
            model: 'gpt-4o',
            temperature,
            maxTokens,
            cached: cachedResult ? true : false,
            cacheKey
          },
          performance: {
            requestDuration: Date.now() - performance.mark || 0,
            cacheHit: cachedResult ? true : false,
            rateLimited: false,
            retries: 0
          },
          metadata: {
            userAgent: context.userAgent || 'unknown',
            source: 'blog-agent'
          }
        };

        // Trackear de forma asíncrona para no bloquear la respuesta
        aiTrackingService.trackSuggestion(trackingParams).catch(err => {
          logger.error('Error tracking suggestion:', err);
        });

        // Agregar tracking ID al resultado para futuras referencias
        result.trackingId = trackingParams.sessionId + '-' + Date.now();
        
      } catch (trackingError) {
        logger.error('Error preparando tracking:', trackingError);
        // No fallar si el tracking falla
      }

      return result;

    } catch (error) {
      logger.error('Error suggesting next paragraph:', error);
      throw error;
    }
  }

  /**
   * Extraer sugerencias de una respuesta
   */
  extractSuggestions(response) {
    const suggestions = [];
    
    // Buscar patrones comunes de sugerencias
    const lines = response.split('\n');
    for (const line of lines) {
      if (line.match(/^[-•*]\s/)) {
        suggestions.push(line.replace(/^[-•*]\s/, '').trim());
      }
    }
    
    return suggestions;
  }

  /**
   * Extraer acciones sugeridas del mensaje
   */
  extractActions(userMessage, response) {
    const actions = [];
    const messageLower = userMessage.toLowerCase();
    
    if (messageLower.includes('expand') || messageLower.includes('expan')) {
      actions.push({ type: 'extend', label: 'Expandir contenido' });
    }
    if (messageLower.includes('mejora') || messageLower.includes('improve')) {
      actions.push({ type: 'improve', label: 'Mejorar contenido' });
    }
    if (messageLower.includes('seo')) {
      actions.push({ type: 'optimize-seo', label: 'Optimizar SEO' });
    }
    if (messageLower.includes('genera') || messageLower.includes('crea')) {
      actions.push({ type: 'generate', label: 'Generar contenido' });
    }
    
    return actions;
  }

  /**
   * Detectar mejoras realizadas
   */
  detectImprovements(original, improved) {
    const improvements = [];
    
    if (improved.length > original.length * 0.9 && improved.length < original.length * 1.1) {
      improvements.push('Longitud optimizada');
    }
    if (improved.split('.').length > original.split('.').length) {
      improvements.push('Más estructura');
    }
    
    return improvements;
  }

  /**
   * Calcular score SEO básico
   */
  async calculateSEOScore(content, title) {
    let score = 50; // Base score
    
    // Longitud adecuada
    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 300 && wordCount <= 2000) score += 15;
    
    // Tiene párrafos
    const paragraphs = content.split('\n\n').length;
    if (paragraphs >= 3) score += 10;
    
    // Título en contenido
    if (content.toLowerCase().includes(title.toLowerCase().substring(0, 20))) {
      score += 15;
    }
    
    // Estructura (listas, etc)
    if (content.includes('-') || content.includes('•') || content.includes('*')) {
      score += 10;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Extraer tags relevantes del contenido
   */
  async extractRelevantTags(content) {
    try {
      const keywords = await extractKeywords(content);
      return keywords.slice(0, 10);
    } catch (error) {
      logger.error('Error extracting tags:', error);
      return [];
    }
  }

  /**
   * ==========================================
   * 🧠 MÉTODOS PARA PROCESAMIENTO DE PATRONES #...#
   * Sistema avanzado de sugerencias contextuales
   * ==========================================
   */

  /**
   * Procesar patrón contextual y generar sugerencia específica
   * @param {Object} patternData - Datos del patrón detectado
   * @returns {Object} - Sugerencia generada
   */
  async processContextPattern(patternData) {
    try {
      const { patternType, contextText, selectedText, surroundingContext, modifiers } = patternData;

      logger.info(`🧠 Processing context pattern: ${patternType} - "${contextText}"`);

      // Determinar qué método usar según el tipo de patrón
      switch (patternType) {
        case 'expand':
          return await this.expandContent({ text: selectedText, context: surroundingContext, modifiers });
        
        case 'summarize':
          return await this.summarizeContent({ text: selectedText, context: surroundingContext, modifiers });
        
        case 'rewrite':
          return await this.rewriteContent({ text: selectedText, context: surroundingContext, modifiers });
        
        case 'continue':
          return await this.continueContent({ text: selectedText, context: surroundingContext, modifiers });
        
        case 'examples':
          return await this.addExamples({ text: selectedText, context: surroundingContext, modifiers });
        
        case 'seo':
          return await this.optimizeForSEO({ text: selectedText, context: surroundingContext, modifiers });
        
        case 'tone':
          return await this.adjustTone({ text: selectedText, tone: modifiers?.tone, context: surroundingContext });
        
        case 'format':
          return await this.reformatContent({ text: selectedText, format: modifiers?.format, context: surroundingContext });
        
        case 'data':
          return await this.addDataAndStats({ text: selectedText, context: surroundingContext, modifiers });
        
        case 'technical':
          return await this.addTechnicalDetails({ text: selectedText, context: surroundingContext, modifiers });
        
        case 'creative':
          return await this.makeCreative({ text: selectedText, context: surroundingContext, modifiers });
        
        default:
          return await this.customPatternProcessing({ text: selectedText, instruction: contextText, context: surroundingContext });
      }
    } catch (error) {
      logger.error('❌ Error processing context pattern:', error);
      throw error;
    }
  }

  /**
   * Expandir contenido con más detalles
   */
  async expandContent({ text, context, modifiers }) {
    const userInput = {
      content: text,
      surrounding_context: context?.before || '',
      modifiers: JSON.stringify(modifiers || {}),
      instruction: 'Expandir y desarrollar con más detalles'
    };

    // Usar task prompt si está disponible, sino prompt inline
    let prompt = this.getTaskSpecificPrompt('pattern_expand', userInput);
    
    if (!prompt) {
      prompt = `Eres un experto escritor de contenido técnico.

TAREA: Expandir el siguiente texto con más detalles, ejemplos y explicaciones profundas.

TEXTO A EXPANDIR:
"${text}"

CONTEXTO PREVIO:
${context?.before || 'No hay contexto previo'}

INSTRUCCIONES:
- Mantén el mensaje central pero agrega 2-3 veces más contenido
- Incluye detalles técnicos relevantes
- Agrega ejemplos concretos cuando sea apropiado
- Mantén el tono y estilo profesional
- Asegúrate de que fluya naturalmente con el contexto

${modifiers ? `MODIFICADORES: ${JSON.stringify(modifiers)}` : ''}

GENERA el texto expandido:`;
    }

    // Llamada correcta: primer parámetro es string, segundo es config
    const response = await openaiService.generateCompletion(prompt, {
      temperature: modifiers?.creativity || 0.7,
      maxTokens: 800
    });

    return {
      success: true,
      result: response,  // response es directamente el string
      patternType: 'expand',
      originalText: text,
      confidence: 0.85
    };
  }

  /**
   * Resumir contenido de forma concisa
   */
  async summarizeContent({ text, context, modifiers }) {
    const userInput = {
      content: text,
      length: modifiers?.length || 'breve',
      format: modifiers?.format || 'párrafo'
    };

    let prompt = this.getTaskSpecificPrompt('pattern_summarize', userInput);
    
    if (!prompt) {
      prompt = `Eres un experto en síntesis y resumen de contenido.

TAREA: Crear un resumen conciso y efectivo del siguiente texto.

TEXTO A RESUMIR:
"${text}"

INSTRUCCIONES:
- Resume los puntos clave (30-50% del original)
- Mantén la esencia del mensaje
- Usa lenguaje claro y directo
- ${modifiers?.format === 'puntos' ? 'Presenta en formato de lista con bullets' : 'Usa formato de párrafo'}
- ${modifiers?.length === 'corto' ? 'Máximo 2-3 oraciones' : modifiers?.length === 'medio' ? 'Máximo 4-5 oraciones' : 'Resumen completo pero conciso'}

GENERA el resumen:`;
    }

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

  /**
   * Reescribir contenido mejorando redacción
   */
  async rewriteContent({ text, context, modifiers }) {
    const userInput = {
      content: text,
      style: modifiers?.style || 'profesional',
      tone: modifiers?.tone || 'neutral'
    };

    let prompt = this.getTaskSpecificPrompt('pattern_rewrite', userInput);
    
    if (!prompt) {
      prompt = `Eres un editor profesional especializado en mejorar redacción.

TAREA: Reescribir el siguiente texto mejorando claridad, fluidez y estilo.

TEXTO ORIGINAL:
"${text}"

INSTRUCCIONES:
- Mantén el mismo significado pero mejora la estructura
- Usa vocabulario más preciso y variado
- Elimina redundancias
- Mejora la coherencia y fluidez
- Tono: ${modifiers?.tone || 'profesional y claro'}
- Estilo: ${modifiers?.style || 'formal pero accesible'}

GENERA la versión mejorada:`;
    }

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

  /**
   * Continuar contenido de forma natural
   */
  async continueContent({ text, context, modifiers }) {
    const userInput = {
      content: text,
      preceding_context: context?.before || '',
      tone: modifiers?.tone || 'coherente'
    };

    let prompt = this.getTaskSpecificPrompt('pattern_continue', userInput);
    
    if (!prompt) {
      prompt = `Eres un escritor experto en continuar narrativas y contenido técnico.

TAREA: Continuar el siguiente texto de forma natural y coherente.

CONTEXTO PREVIO:
${context?.before || 'Inicio del documento'}

TEXTO BASE:
"${text}"

INSTRUCCIONES:
- Identifica la dirección natural del contenido
- Continúa con información complementaria relevante
- Mantén consistencia en tono: ${modifiers?.tone || 'profesional'}
- Asegura transición fluida
- Aporta valor agregado al contenido

GENERA la continuación (2-3 párrafos):`;
    }

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

  /**
   * Agregar ejemplos prácticos
   */
  async addExamples({ text, context, modifiers }) {
    const userInput = {
      content: text,
      example_count: modifiers?.count || 3
    };

    let prompt = this.getTaskSpecificPrompt('pattern_examples', userInput);
    
    if (!prompt) {
      prompt = `Eres un instructor experto en crear ejemplos prácticos y relevantes.

TAREA: Agregar ejemplos concretos al siguiente concepto.

CONCEPTO/TEXTO:
"${text}"

INSTRUCCIONES:
- Proporciona ${modifiers?.count || '2-3'} ejemplos prácticos claros
- Los ejemplos deben ser relevantes y aplicables
- Usa casos reales cuando sea posible
- Estructura: Ejemplo + breve explicación
- Integra los ejemplos de forma natural

GENERA los ejemplos:`;
    }

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

  /**
   * Optimizar para SEO
   */
  async optimizeForSEO({ text, context, modifiers }) {
    const userInput = {
      content: text,
      target_keywords: modifiers?.keywords || []
    };

    let prompt = this.getTaskSpecificPrompt('pattern_seo', userInput);
    
    if (!prompt) {
      prompt = `Eres un especialista en SEO y optimización de contenido.

TAREA: Optimizar el siguiente texto para SEO manteniendo legibilidad.

TEXTO ORIGINAL:
"${text}"

INSTRUCCIONES:
- Identifica oportunidades para palabras clave relevantes
- Mejora estructura para SEO (subtítulos, párrafos cortos)
- Mantén naturalidad y legibilidad
- Agrega variaciones de palabras clave
- Mejora meta-relevancia

GENERA versión optimizada para SEO:`;
    }

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

  /**
   * Ajustar tono del contenido
   */
  async adjustTone({ text, tone, context }) {
    const prompt = `Ajusta el tono del siguiente texto a: ${tone}

TEXTO:
"${text}"

NUEVO TONO: ${tone}

Reescribe manteniendo el contenido pero con el tono solicitado:`;

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

  /**
   * Reformatear contenido
   */
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

FORMATO DESEADO: ${format}

Genera el contenido reformateado:`;

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

  /**
   * Agregar datos y estadísticas
   */
  async addDataAndStats({ text, context, modifiers }) {
    const prompt = `Agrega datos, estadísticas y cifras relevantes al siguiente texto:

TEXTO:
"${text}"

CONTEXTO:
${context?.before || 'Sin contexto adicional'}

INSTRUCCIONES:
- Sugiere qué tipo de datos serían relevantes
- Proporciona ejemplos de estadísticas aplicables
- Integra de forma natural en el texto
- Menciona fuentes sugeridas

Genera versión mejorada con datos:`;

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

  /**
   * Agregar detalles técnicos
   */
  async addTechnicalDetails({ text, context, modifiers }) {
    const prompt = `Agrega detalles técnicos y profundidad al siguiente texto:

TEXTO:
"${text}"

INSTRUCCIONES:
- Añade especificaciones técnicas relevantes
- Incluye terminología precisa
- Agrega detalles de implementación
- Mantén claridad para audiencia técnica

Genera versión con más detalle técnico:`;

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

  /**
   * Hacer contenido más creativo
   */
  async makeCreative({ text, context, modifiers }) {
    const prompt = `Transforma el siguiente texto en algo más creativo e innovador:

TEXTO:
"${text}"

INSTRUCCIONES:
- Usa metáforas y analogías creativas
- Presenta ideas desde ángulos únicos
- Mantén el contenido pero hazlo más engaging
- Tono creativo pero profesional

Genera versión creativa:`;

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

  /**
   * Procesamiento personalizado para patrones custom
   */
  async customPatternProcessing({ text, instruction, context }) {
    const prompt = `Procesa el siguiente texto según la instrucción dada:

TEXTO:
"${text}"

INSTRUCCIÓN DEL USUARIO:
"${instruction}"

CONTEXTO:
${context?.before || 'Sin contexto adicional'}

Aplica la instrucción y genera el resultado:`;

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

export default BlogAgent;