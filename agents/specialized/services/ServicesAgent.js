/**
 * ServicesAgent - Agente especializado en gestión inteligente de servicios con AI integrado
 * 
 * ✅ Integración OpenAI COMPLETADA
 * 🎯 7 Bloques de contenido con fallbacks profesionales
 * 🚀 Métodos AI + Fallback para máxima robustez
 * 💬 Chat interactivo integrado
 */

import BaseAgent from '../../core/BaseAgent.js';
import openaiService from '../../services/OpenAIService.js';
import ServicesChatHandler from './handlers/ServicesChatHandler.js';
import ServicesGenerator from './handlers/ServicesGenerator.js';
import ServicesOptimizer from './handlers/ServicesOptimizer.js';
import Servicio from '../../../models/Servicio.js';
import logger from '../../../utils/logger.js';

export class ServicesAgent extends BaseAgent {
  constructor(skipDBConnection = false) {
    super(
      'ServicesAgent', // 🔧 Nombre correcto para el orchestrator
      'Agente especializado en gestión de servicios para el panel administrativo - Creación, edición y optimización de servicios',
      [
        'service_management', // 🎯 Gestión de servicios (admin)
        'service_creation',
        'service_editing',
        'ai_content_generation', // ✅ Generación con OpenAI
        'content_blocks_generation', // ✅ 7 bloques específicos
        'pricing_strategy',
        'fallback_content', // ✅ Templates profesionales
        'chat_interaction' // ✅ Chat interactivo
      ],
      skipDBConnection
    );

    this.openAIService = openaiService;
    
    // 🆕 Inicializar ServicesChatHandler
    this.chatHandler = new ServicesChatHandler({
      maxContextLength: 10,
      temperature: 0.7,
      maxTokens: 1500
    });
    
    // 🆕 Inicializar ServicesGenerator
    this.generator = new ServicesGenerator({
      temperature: 0.7,
      maxTokens: 2000,
      validateBeforeCreate: true,
      autoOptimizeSEO: true
    });
    
    // 🆕 Inicializar ServicesOptimizer
    this.optimizer = new ServicesOptimizer({
      temperature: 0.6,
      maxTokens: 2000,
      autoApplyMinorFixes: false
    });
    
    logger.info('✅ ServicesAgent initialized with ChatHandler, Generator and Optimizer');
  }

  // ============================================================================
  // 🔧 MÉTODO EXECUTEASK REQUERIDO POR BASEAGENT
  // ============================================================================

  /**
   * Ejecutar tarea específica (requerido por BaseAgent)
   * Delega al método apropiado según el tipo de tarea
   * @override
   */
  async executeTask(task, context = {}) {
    const { type, command, action } = task;
    
    logger.info(`🔧 ServicesAgent.executeTask() - Type: ${type}, Action: ${action}`);
    logger.info(`📝 Command: "${(command || '').substring(0, 100)}..."`);

    try {
      // Para comandos de lenguaje natural, usar el chat handler
      if (type === 'natural_language_command' || !type) {
        const message = command || task.message || '';
        
        // 🔧 FIX: Usar sessionId del ServicesAgent basado en userId para persistir estado
        // Esto asegura que el flujo de creación de servicios mantenga su estado
        const userId = task.userId || context.userId || 'anonymous';
        const sessionId = task.servicesSessionId || context.servicesSessionId || `services_admin_${userId}`;
        
        logger.info(`💬 Delegating to chat() with sessionId: ${sessionId} (userId: ${userId})`);
        
        const result = await this.chat(message, sessionId, {
          ...context,
          userId: task.userId || context.userId,
          isPublic: false, // 🔧 FIX: En panel admin siempre es false
          isAdminContext: true // 🆕 Marcar explícitamente como contexto administrativo
        });

        // Extraer mensaje para formato consistente
        const responseMessage = result.data?.message || 
                               result.message || 
                               result.response ||
                               'Tarea completada';

        return {
          success: result.success !== false,
          message: responseMessage,
          data: result.data,
          metadata: result.metadata,
          // Propagar canvas_data si existe
          canvas_data: result.canvas_data || result.data?.canvas_data
        };
      }

      // Para acciones específicas
      switch (action) {
        case 'create_service':
          return await this.createService(task.serviceData || task, context);
        
        case 'edit_service':
          return await this.editService(task.serviceId, task.instructions, context);
        
        case 'generate_content':
          return await this.generateCompleteService(task.serviceId, task.options || {});
        
        case 'list_services':
          return await this.listPublicServices(task.options || {});
        
        case 'list_categories':
          return await this.listPublicCategories();
        
        default:
          // Por defecto, tratar como comando de chat
          const defaultMessage = command || task.message || '';
          const defaultSessionId = task.sessionId || `session_${Date.now()}`;
          
          const chatResult = await this.chat(defaultMessage, defaultSessionId, context);
          
          return {
            success: chatResult.success !== false,
            message: chatResult.data?.message || chatResult.message || 'Tarea completada',
            data: chatResult.data,
            metadata: chatResult.metadata,
            canvas_data: chatResult.canvas_data || chatResult.data?.canvas_data
          };
      }
    } catch (error) {
      logger.error('❌ Error in ServicesAgent.executeTask():', error);
      throw error;
    }
  }

  // ============================================================================
  // 🚀 MÉTODOS PRINCIPALES CON INTEGRACIÓN OPENAI
  // ============================================================================

  /**
   * 💬 Chat interactivo con el agente
   * Delega al ServicesChatHandler para manejar conversaciones
   */
  async chat(message, sessionId, context = {}) {
    try {
      const contextType = context.isPublic ? 'PUBLIC (Ventas)' : 'ADMIN (Gestión)';
      logger.info(`💬 ServicesAgent [${contextType}] - Message: "${message.substring(0, 50)}..."`);
      
      if (!this.chatHandler) {
        throw new Error('ChatHandler not initialized');
      }

      const result = await this.chatHandler.handleChatMessage(message, sessionId, context);
      
      logger.info(`✅ Chat response generated - Success: ${result.success}`);
      
      return result;
    } catch (error) {
      logger.error('❌ Error in ServicesAgent.chat():', error);
      throw error;
    }
  }

  /**
   * 🗂️ Listar servicios disponibles (para páginas públicas)
   * Método específico para consultas del chatbot de ventas
   */
  async listPublicServices(options = {}) {
    try {
      const { categoriaId, limit = 30, activo = true } = options;
      
      const query = { activo };
      if (categoriaId) {
        query.categoria = categoriaId;
      }

      const servicios = await Servicio.find(query)
        .populate('categoria', 'nombre descripcion icono')
        .select('titulo descripcionCorta categoria precio duracion destacado imagenes')
        .sort({ destacado: -1, createdAt: -1 })
        .limit(limit);

      logger.info(`📋 Listed ${servicios.length} public services`);

      return {
        success: true,
        data: {
          servicios,
          total: servicios.length,
          filtered: !!categoriaId
        }
      };
    } catch (error) {
      logger.error('❌ Error listing public services:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 📂 Listar categorías disponibles (para páginas públicas)
   * Método específico para navegación del chatbot de ventas
   */
  async listPublicCategories() {
    try {
      // 🔧 FIX: Buscar categorías activas O sin campo activo/activa
      const categorias = await Categoria.find({ 
        $or: [
          { activo: true },
          { activa: true },
          { activo: { $exists: false } },
          { activa: { $exists: false } }
        ]
      })
        .select('nombre descripcion icono orden')
        .sort({ orden: 1, nombre: 1 });

      // Contar servicios por categoría
      const categoriasConConteo = await Promise.all(
        categorias.map(async (cat) => {
          const count = await Servicio.countDocuments({
            categoria: cat._id,
            activo: true
          });
          
          return {
            _id: cat._id,
            nombre: cat.nombre,
            descripcion: cat.descripcion,
            icono: cat.icono,
            serviciosCount: count
          };
        })
      );

      logger.info(`📂 Listed ${categorias.length} public categories`);

      return {
        success: true,
        data: {
          categorias: categoriasConConteo,
          total: categorias.length
        }
      };
    } catch (error) {
      logger.error('❌ Error listing public categories:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🎨 Crear servicio con IA
   * Delega al ServicesGenerator para crear servicios
   */
  async createService(serviceData, context = {}) {
    try {
      logger.info(`🎨 ServicesAgent.createService() - Creating service: ${serviceData.titulo || 'Untitled'}`);
      
      if (!this.generator) {
        throw new Error('Generator not initialized');
      }

      const result = await this.generator.createServiceWithAI(serviceData, context);
      
      logger.info(`✅ Service created - Success: ${result.success}, ID: ${result.data?.id}`);
      
      return result;
    } catch (error) {
      logger.error('❌ Error in ServicesAgent.createService():', error);
      throw error;
    }
  }

  /**
   * ✏️ Editar servicio con IA
   * Delega al ServicesOptimizer para editar servicios
   */
  async editService(serviceId, instructions, context = {}) {
    try {
      logger.info(`✏️ ServicesAgent.editService() - Editing service: ${serviceId}`);
      
      if (!this.optimizer) {
        throw new Error('Optimizer not initialized');
      }

      // Convertir instrucciones en updates estructurados
      const updates = typeof instructions === 'string' 
        ? { instructions } 
        : instructions;

      const result = await this.optimizer.editServiceWithAI(serviceId, updates, context);
      
      logger.info(`✅ Service edited - Success: ${result.success}`);
      
      return result;
    } catch (error) {
      logger.error('❌ Error in ServicesAgent.editService():', error);
      throw error;
    }
  }

  /**
   * 🎯 Generar contenido completo para servicio existente
   * Delega al ServicesGenerator para generar contenido completo
   */
  async generateCompleteService(serviceId, options = {}) {
    try {
      logger.info(`🎯 ServicesAgent.generateCompleteService() - Generating complete content for: ${serviceId}`);
      
      if (!this.generator) {
        throw new Error('Generator not initialized');
      }

      const result = await this.generator.generateCompleteServiceContent(serviceId, options);
      
      logger.info(`✅ Complete content generated - Success: ${result.success}`);
      
      return result;
    } catch (error) {
      logger.error('❌ Error in ServicesAgent.generateCompleteService():', error);
      throw error;
    }
  }

  /**
   * Genera todos los bloques de contenido para un servicio
   * INTEGRACIÓN COMPLETA: AI + Fallbacks profesionales
   */
  async generateAllBlocks(servicioId) {
    try {
      logger.info(`🚀 GenerateAllBlocks iniciado para servicio: ${servicioId}`);
      
      const servicio = await Servicio.findById(servicioId).populate('categoria');
      if (!servicio) {
        throw new Error(`Servicio ${servicioId} no encontrado`);
      }

      const blocks = {
        // Bloque 1: Precios y Comercial
        preciosComercial: await this.generatePreciosComercial(servicio),
        
        // Bloque 2: Contenido Avanzado (Descripción Rica + Video + Galería)
        contenidoAvanzado: await this.generateContenidoAvanzado(servicio),
        
        // Bloque 3: Características y Beneficios
        caracteristicasBeneficios: await this.generateCaracteristicasBeneficios(servicio),
        
        // Bloque 4: Qué NO incluye
        queNoIncluye: await this.generateQueNoIncluye(servicio),
        
        // Bloque 5: Qué SÍ incluye
        queIncluye: await this.generateQueIncluye(servicio),
        
        // Bloque 6: FAQ
        faq: await this.generateFAQ(servicio),
        
        // Bloque 7: Configuraciones
        configuraciones: await this.generateConfiguraciones(servicio)
      };

      logger.info(`✅ Generación completa para servicio ${servicioId}: 7 bloques generados`);
      
      return {
        success: true,
        servicioId,
        blocks,
        metadata: {
          generatedAt: new Date().toISOString(),
          totalBlocks: 7,
          usesOpenAI: true,
          fallbacksAvailable: true
        }
      };

    } catch (error) {
      logger.error(`❌ Error en generateAllBlocks para ${servicioId}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // 🎯 MÉTODOS INDIVIDUALES POR BLOQUE (AI + FALLBACK)
  // ============================================================================

  /**
   * BLOQUE 1: Precios y Comercial
   */
  async generatePreciosComercial(servicio) {
    try {
      // 🤖 Intento con OpenAI primero
      const prompt = this.buildPreciosPrompt(servicio);
      const aiResult = await this.openAIService.generateContent(prompt);
      
      if (aiResult) {
        logger.info(`✅ Precios generado con OpenAI para ${servicio.titulo}`);
        return { ...aiResult, generatedWith: 'openai' };
      }
    } catch (error) {
      logger.warn(`⚠️ OpenAI falló para precios de ${servicio.titulo}, usando fallback`);
    }

    // 🔄 Fallback profesional
    const fallback = this.generatePreciosFallback(servicio);
    logger.info(`✅ Precios generado con fallback para ${servicio.titulo}`);
    return { ...fallback, generatedWith: 'fallback' };
  }

  /**
   * BLOQUE 2: Contenido Avanzado
   */
  async generateContenidoAvanzado(servicio) {
    try {
      const prompt = this.buildContenidoPrompt(servicio);
      const aiResult = await this.openAIService.generateContent(prompt);
      
      if (aiResult) {
        logger.info(`✅ Contenido generado con OpenAI para ${servicio.titulo}`);
        return { ...aiResult, generatedWith: 'openai' };
      }
    } catch (error) {
      logger.warn(`⚠️ OpenAI falló para contenido de ${servicio.titulo}, usando fallback`);
    }

    const fallback = this.generateContenidoFallback(servicio);
    logger.info(`✅ Contenido generado con fallback para ${servicio.titulo}`);
    return { ...fallback, generatedWith: 'fallback' };
  }

  /**
   * BLOQUE 3: Características y Beneficios
   */
  async generateCaracteristicasBeneficios(servicio) {
    try {
      const prompt = this.buildCaracteristicasPrompt(servicio);
      const aiResult = await this.openAIService.generateContent(prompt);
      
      if (aiResult) {
        logger.info(`✅ Características generadas con OpenAI para ${servicio.titulo}`);
        return { ...aiResult, generatedWith: 'openai' };
      }
    } catch (error) {
      logger.warn(`⚠️ OpenAI falló para características de ${servicio.titulo}, usando fallback`);
    }

    const fallback = this.generateCaracteristicasFallback(servicio);
    logger.info(`✅ Características generadas con fallback para ${servicio.titulo}`);
    return { ...fallback, generatedWith: 'fallback' };
  }

  /**
   * BLOQUE 4: Qué NO incluye
   */
  async generateQueNoIncluye(servicio) {
    try {
      const prompt = this.buildQueNoIncluyePrompt(servicio);
      const aiResult = await this.openAIService.generateContent(prompt);
      
      if (aiResult) return { ...aiResult, generatedWith: 'openai' };
    } catch (error) {
      logger.warn(`⚠️ OpenAI falló para exclusiones de ${servicio.titulo}, usando fallback`);
    }

    const fallback = this.generateQueNoIncluyeFallback(servicio);
    return { ...fallback, generatedWith: 'fallback' };
  }

  /**
   * BLOQUE 5: Qué SÍ incluye
   */
  async generateQueIncluye(servicio) {
    try {
      const prompt = this.buildQueIncluyePrompt(servicio);
      const aiResult = await this.openAIService.generateContent(prompt);
      
      if (aiResult) return { ...aiResult, generatedWith: 'openai' };
    } catch (error) {
      logger.warn(`⚠️ OpenAI falló para inclusiones de ${servicio.titulo}, usando fallback`);
    }

    const fallback = this.generateQueIncluyeFallback(servicio);
    return { ...fallback, generatedWith: 'fallback' };
  }

  /**
   * BLOQUE 6: FAQ
   */
  async generateFAQ(servicio) {
    try {
      const prompt = this.buildFAQPrompt(servicio);
      const aiResult = await this.openAIService.generateContent(prompt);
      
      if (aiResult) return { ...aiResult, generatedWith: 'openai' };
    } catch (error) {
      logger.warn(`⚠️ OpenAI falló para FAQ de ${servicio.titulo}, usando fallback`);
    }

    const fallback = this.generateFAQFallback(servicio);
    return { ...fallback, generatedWith: 'fallback' };
  }

  /**
   * BLOQUE 7: Configuraciones
   */
  async generateConfiguraciones(servicio) {
    try {
      const prompt = this.buildConfiguracionesPrompt(servicio);
      const aiResult = await this.openAIService.generateContent(prompt);
      
      if (aiResult) return { ...aiResult, generatedWith: 'openai' };
    } catch (error) {
      logger.warn(`⚠️ OpenAI falló para configuraciones de ${servicio.titulo}, usando fallback`);
    }

    const fallback = this.generateConfiguracionesFallback(servicio);
    return { ...fallback, generatedWith: 'fallback' };
  }

  // ============================================================================
  // 🎯 CONSTRUCCIÓN DE PROMPTS INTELIGENTES
  // ============================================================================

  buildPreciosPrompt(servicio) {
    const categoria = servicio.categoria?.nombre || 'Servicio';
    const precio = servicio.precio || 1000;

    return `Eres un experto en pricing estratégico. Analiza este servicio y genera una estructura de precios inteligente.

SERVICIO:
- Título: ${servicio.titulo}
- Categoría: ${categoria}
- Precio actual: $${precio}
- Descripción: ${servicio.descripcion || 'Servicio profesional'}

Genera estructura de precios con 3 niveles, descuentos estratégicos y garantías. 
Responde solo con JSON válido sin explicaciones adicionales.

Formato esperado:
{
  "precios": {
    "basico": {"precio": ${Math.round(precio * 0.7)}, "nombre": "Básico"},
    "profesional": {"precio": ${precio}, "nombre": "Profesional", "recomendado": true},
    "premium": {"precio": ${Math.round(precio * 2.3)}, "nombre": "Premium"}
  },
  "descuentos": {"earlyBird": {"porcentaje": 20}},
  "garantia": {"tipo": "Soporte 6 Meses"}
}`;
  }

  buildContenidoPrompt(servicio) {
    const titulo = servicio.titulo || 'Servicio';
    const categoria = servicio.categoria?.nombre || 'Servicio';

    return `Crea contenido persuasivo para ${titulo} en categoría ${categoria}.

Genera contenido con descripción rica, estructura de video promocional y galería de imágenes.
Responde solo con JSON válido.

Formato esperado:
{
  "descripcionRica": "## ${categoria} que Convierte\\n\\n🎯 Resultados comprobados...\\n\\n✅ Garantía incluida",
  "videoPromocional": {"titulo": "Presentación ${titulo}", "duracion": "2-3 minutos"},
  "galeria": {"imagenes": [{"orden": 1, "descripcion": "Dashboard resultados"}]}
}`;
  }

  buildCaracteristicasPrompt(servicio) {
    const categoria = servicio.categoria?.nombre || 'Servicio';

    return `Crea 6 características con 6 beneficios para ${categoria}.

Cada característica debe tener un beneficio asociado.
Responde solo con JSON válido.

Formato esperado:
{
  "caracteristicas": [{"id": 1, "caracteristica": "Análisis Completo", "beneficioAsociado": "Mayor Visibilidad"}],
  "beneficios": [{"id": 1, "beneficio": "Mayor Visibilidad", "impacto": "+300%"}]
}`;
  }

  buildQueNoIncluyePrompt(servicio) {
    const categoria = servicio.categoria?.nombre || 'Servicio';

    return `Define 6 exclusiones claras para ${categoria}.

Responde solo con JSON válido:
{
  "exclusiones": [{"id": 1, "item": "Servicios fuera del alcance", "razon": "Especialización"}]
}`;
  }

  buildQueIncluyePrompt(servicio) {
    const precio = servicio.precio || 1000;

    return `Crea 10 inclusiones con valor específico para este servicio de $${precio}.

Responde solo con JSON válido:
{
  "inclusiones": [{"id": 1, "item": "Análisis completo", "valor": "$${Math.round(precio * 0.3)} por separado"}],
  "valorTotal": "$${Math.round(precio * 2.5)} total incluido"
}`;
  }

  buildFAQPrompt(servicio) {
    const categoria = servicio.categoria?.nombre || 'Servicio';

    return `Crea 10 preguntas frecuentes para ${categoria}.

Responde solo con JSON válido:
{
  "preguntas": [{"id": 1, "pregunta": "¿Cuánto tiempo tarda?", "respuesta": "10-14 días para primeros resultados"}]
}`;
  }

  buildConfiguracionesPrompt(servicio) {
    const titulo = servicio.titulo || 'Servicio';

    return `Optimiza configuración SEO para "${titulo}".

Responde solo con JSON válido:
{
  "url": "slug-optimizado",
  "seo": {"titulo": "${titulo} Profesional", "descripcion": "Descripción optimizada"}
}`;
  }

  // ============================================================================
  // 🔄 MÉTODOS DE FALLBACK (TEMPLATES PROFESIONALES)
  // ============================================================================

  generatePreciosFallback(servicio) {
    const precio = servicio.precio || 3500;
    
    return {
      precios: {
        basico: { precio: Math.round(precio * 0.7), nombre: "Básico", calidad: 85 },
        profesional: { precio: precio, nombre: "Profesional", recomendado: true, calidad: 95 },
        premium: { precio: Math.round(precio * 2.3), nombre: "Premium", calidad: 100 }
      },
      descuentos: {
        earlyBird: { porcentaje: 20, condiciones: "Primeros 3 clientes únicamente" }
      },
      garantia: {
        tipo: "Soporte Técnico 6 Meses",
        descripcion: "Email, teléfono y chat con respuesta en 24h"
      }
    };
  }

  generateContenidoFallback(servicio) {
    const titulo = servicio.titulo || 'Servicio Profesional';
    const categoria = servicio.categoria?.nombre || 'Servicio';

    return {
      descripcionRica: `## Estrategia ${categoria} que Convierte

Aumenta tus resultados con ${titulo} profesional

### 🎯 Resultados Comprobados
- 📈 Aumento típico: **300%**
- 💰 Reducción de costos: **40%** 
- 📊 Mejora en eficiencia: **150%**

**Garantía:** Aumento mínimo 20% o reembolso total.`,
      
      videoPromocional: {
        titulo: `Presentación del Servicio - ${titulo}`,
        duracion: "2-3 minutos"
      },
      
      galeria: {
        imagenes: [
          { orden: 1, descripcion: `Dashboard con métricas de ${categoria}` },
          { orden: 2, descripcion: "Diagrama del proceso paso a paso" },
          { orden: 3, descripcion: "Portfolio de resultados reales" }
        ]
      }
    };
  }

  generateCaracteristicasFallback(servicio) {
    const categoria = servicio.categoria?.nombre || 'Servicio';

    return {
      caracteristicas: [
        { id: 1, caracteristica: `Análisis Completo de ${categoria}`, beneficioAsociado: "Mayor Visibilidad" },
        { id: 2, caracteristica: "Estrategia Personalizada", beneficioAsociado: "Decisiones Basadas en Datos" },
        { id: 3, caracteristica: "Implementación Profesional", beneficioAsociado: "Resultados Significativos" },
        { id: 4, caracteristica: "Monitoreo Continuo", beneficioAsociado: "Optimización Constante" },
        { id: 5, caracteristica: "Soporte Especializado", beneficioAsociado: "Tranquilidad Total" },
        { id: 6, caracteristica: "Reportes Detallados", beneficioAsociado: "Visibilidad del ROI" }
      ],
      beneficios: [
        { id: 1, beneficio: "Resultados Significativos", impacto: "+300%", caracteristicaAsociada: "Implementación Profesional" },
        { id: 2, beneficio: "Decisiones Basadas en Datos", impacto: "+40% eficiencia", caracteristicaAsociada: "Estrategia Personalizada" },
        { id: 3, beneficio: "Mayor Visibilidad", impacto: "+150%", caracteristicaAsociada: `Análisis Completo de ${categoria}` },
        { id: 4, beneficio: "Optimización Constante", impacto: "+25% mensual", caracteristicaAsociada: "Monitoreo Continuo" },
        { id: 5, beneficio: "Tranquilidad Total", impacto: "95% satisfacción", caracteristicaAsociada: "Soporte Especializado" },
        { id: 6, beneficio: "Visibilidad del ROI", impacto: "100% transparencia", caracteristicaAsociada: "Reportes Detallados" }
      ]
    };
  }

  generateQueNoIncluyeFallback(servicio) {
    const categoria = servicio.categoria?.nombre || 'Servicio';
    
    return {
      exclusiones: [
        { id: 1, item: "Servicios fuera del alcance principal", razon: "Especialización" },
        { id: 2, item: "Garantías de resultados específicos", razon: "Variables del mercado" },
        { id: 3, item: "Soporte fuera del horario comercial", razon: "Horario establecido" },
        { id: 4, item: "Cambios mayores fuera del alcance", razon: "Gestión de alcance" },
        { id: 5, item: "Implementaciones en terceros", razon: "Control de calidad" },
        { id: 6, item: "Capacitación avanzada del equipo", razon: "Servicio separado" }
      ]
    };
  }

  generateQueIncluyeFallback(servicio) {
    const precio = servicio.precio || 3500;
    
    return {
      inclusiones: [
        { id: 1, item: "Análisis inicial completo", valor: `$${Math.round(precio * 0.23)} por separado` },
        { id: 2, item: "Estrategia personalizada", valor: `$${Math.round(precio * 0.43)} por separado` },
        { id: 3, item: "Implementación profesional", valor: `$${Math.round(precio * 0.34)} por separado` },
        { id: 4, item: "Soporte especializado 6 meses", valor: `$${Math.round(precio * 0.17)} por separado` },
        { id: 5, item: "Reportes ejecutivos", valor: `$${Math.round(precio * 0.20)} por separado` }
      ],
      valorTotal: `$${Math.round(precio * 1.4)} de valor total`
    };
  }

  generateFAQFallback(servicio) {
    const categoria = servicio.categoria?.nombre || 'Servicio';

    return {
      preguntas: [
        { id: 1, pregunta: "¿Cuánto tiempo tarda en ver resultados?", respuesta: "Los primeros resultados son visibles en 10-14 días." },
        { id: 2, pregunta: "¿Qué pasa si no me gustan los resultados?", respuesta: "Garantizamos mínimo 20% de mejora o reembolso 100%." },
        { id: 3, pregunta: "¿Es adecuado para mi tipo de negocio?", respuesta: `Nuestro enfoque en ${categoria} se adapta a diferentes tipos de negocio.` },
        { id: 4, pregunta: "¿Qué información necesitan para empezar?", respuesta: "Necesitamos acceso a sistemas actuales y objetivos claros." },
        { id: 5, pregunta: "¿Puedo hacer cambios durante el proyecto?", respuesta: "Sí. Evaluamos cambios cada 2 semanas sin costo adicional." }
      ]
    };
  }

  generateConfiguracionesFallback(servicio) {
    const titulo = servicio.titulo || 'Servicio Profesional';
    const categoria = servicio.categoria?.nombre || 'servicio';

    const slug = titulo.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 60);

    return {
      url: slug,
      estado: "Activo",
      seo: {
        titulo: `${titulo} Profesional con Garantía de Resultados`,
        descripcion: `${titulo} especializado para ${categoria}. Servicio profesional con atención personalizada y resultados garantizados.`
      }
    };
  }
}

export default ServicesAgent;