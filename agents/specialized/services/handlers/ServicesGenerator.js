/**
 * ServicesGenerator - Generador de servicios y paquetes con IA
 * 
 * Responsabilidades:
 * - CREAR servicios nuevos con IA (escribir en BD)
 * - CREAR paquetes inteligentes (escribir en BD)
 * - Generar descripciones atractivas
 * - Generar contenido de marketing
 * - Generar variaciones de servicios
 * - Validar antes de crear
 */

import mongoose from 'mongoose';
import openaiService from '../../../services/OpenAIService.js';
import Servicio from '../../../../models/Servicio.js';
import PaqueteServicio from '../../../../models/PaqueteServicio.js';
import Categoria from '../../../../models/Categoria.js';
import logger from '../../../../utils/logger.js';

class ServicesGenerator {
  constructor(config = {}) {
    this.config = {
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2000,
      validateBeforeCreate: config.validateBeforeCreate !== false,
      autoOptimizeSEO: config.autoOptimizeSEO !== false,
      ...config
    };

    this.metrics = {
      totalGenerations: 0,
      servicesCreated: 0,
      packagesCreated: 0,
      errors: 0,
      averageTime: 0
    };

    // 🆕 Sistema de cola para evitar rate limiting
    this.requestQueue = [];
    this.isProcessing = false;
    this.lastRequestTime = 0;
    this.minRequestInterval = 3000; // 3 segundos entre requests (aumentado de 2s)

    logger.info('✅ ServicesGenerator initialized');
  }

  /**
   * CREAR servicio completo con IA (escribe en BD)
   */
  async createServiceWithAI(serviceData, context = {}) {
    const startTime = Date.now();
    this.metrics.totalGenerations++;

    try {
      logger.info('🆕 Creating service with AI assistance...');

      // 0. Si tiene requirements pero no titulo, generar base desde el prompt
      let data = { ...serviceData };
      if (data.requirements && !data.titulo) {
        logger.info('🎯 Generating service structure from requirements...');
        const baseData = await this.generateServiceFromRequirements(data.requirements, context);
        // Merge pero preservar valores existentes (especialmente categoria)
        data = { ...baseData, ...data };
      }

      // 1. Verificar que la categoría existe PRIMERO
      const categoria = await this.verifyCategory(data.categoria);
      if (!categoria) {
        throw new Error(`Categoría no encontrada: ${data.categoria}`);
      }

      // 2. Generar contenido con IA si es necesario (ANTES de validar)
      const enrichedData = await this.enrichServiceData(data, categoria, context);

      // 3. AHORA validar datos completos (después del enriquecimiento)
      this.validateServiceInput(enrichedData);

      // 4. Preparar datos para BD
      const serviceForDB = this.prepareServiceForDB(enrichedData, categoria);

      // 5. Validar datos completos antes de crear
      if (this.config.validateBeforeCreate) {
        this.validateCompleteService(serviceForDB);
      }

      // 6. CREAR EN BASE DE DATOS
      const newService = new Servicio(serviceForDB);
      await newService.save();

      this.metrics.servicesCreated++;
      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime);

      logger.success(`✅ Service created successfully: ${newService._id} in ${processingTime}ms`);

      return {
        success: true,
        data: {
          service: newService,
          id: newService._id,
          serviceId: newService._id,
          titulo: newService.titulo,
          categoria: newService.categoria
        },
        metadata: {
          processingTime,
          aiGenerated: enrichedData.aiGenerated || [],
          validationsPassed: true
        }
      };

    } catch (error) {
      this.metrics.errors++;
      logger.error('❌ Error creating service with AI:', error);

      return {
        success: false,
        error: error.message,
        details: error.stack
      };
    }
  }

  /**
   * CREAR paquete con IA (escribe en BD)
   */
  async createPackageWithAI(packageData, context = {}) {
    const startTime = Date.now();
    this.metrics.totalGenerations++;

    try {
      logger.info('📦 Creating package with AI assistance...');

      // 1. Validar entrada
      if (!packageData.servicioId) {
        throw new Error('servicioId is required');
      }

      // 2. Verificar que el servicio existe
      const servicio = await Servicio.findById(packageData.servicioId);
      if (!servicio) {
        throw new Error(`Servicio no encontrado: ${packageData.servicioId}`);
      }

      // 3. Generar contenido del paquete con IA
      const enrichedPackage = await this.enrichPackageData(packageData, servicio, context);

      // 4. Preparar para BD
      const packageForDB = this.preparePackageForDB(enrichedPackage, servicio);

      // 5. CREAR EN BASE DE DATOS
      const newPackage = new PaqueteServicio(packageForDB);
      await newPackage.save();

      this.metrics.packagesCreated++;
      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime);

      logger.success(`✅ Package created successfully: ${newPackage._id} in ${processingTime}ms`);

      return {
        success: true,
        data: {
          package: newPackage,
          id: newPackage._id,
          nombre: newPackage.nombre,
          precio: newPackage.precio
        },
        metadata: {
          processingTime,
          aiGenerated: enrichedPackage.aiGenerated || []
        }
      };

    } catch (error) {
      this.metrics.errors++;
      logger.error('❌ Error creating package with AI:', error);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generar solo contenido (sin crear en BD)
   */
  async generateService(requirements) {
    try {
      logger.info('🎨 Generating service content...');

      // Construir prompt
      const prompt = this.buildServiceGenerationPrompt(requirements);

      // Generar con IA
      const aiResponse = await this.callAI(prompt, 'service_generation', requirements.categoria);

      // Parsear respuesta
      const generatedService = this.parseAIServiceResponse(aiResponse);

      return {
        success: true,
        data: generatedService,
        note: 'Service generated but not saved to database. Use createServiceWithAI to save.'
      };

    } catch (error) {
      logger.error('Error generating service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generar múltiples paquetes para un servicio
   */
  async generatePackages(serviceId, strategy = 'balanced') {
    try {
      logger.info(`📦 Generating packages for service ${serviceId}...`);

      // Obtener servicio
      const servicio = await Servicio.findById(serviceId).populate('categoria');
      if (!servicio) {
        throw new Error('Servicio no encontrado');
      }

      // Construir prompt para paquetes
      const prompt = this.buildPackageGenerationPrompt(servicio, strategy);

      // Generar con IA
      const aiResponse = await this.callAI(prompt, 'package_generation', servicio.categoria);

      // Parsear paquetes sugeridos
      const packages = this.parseAIPackageResponse(aiResponse, servicio);

      return {
        success: true,
        data: {
          packages,
          service: { id: servicio._id, titulo: servicio.titulo }
        },
        note: 'Packages generated but not saved. Use createPackageWithAI to save each.'
      };

    } catch (error) {
      logger.error('Error generating packages:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================
  // MÉTODOS AUXILIARES PRIVADOS
  // ============================================

  /**
   * Validar datos de entrada del servicio
   */
  validateServiceInput(data) {
    if (!data.titulo || data.titulo.trim().length < 5) {
      throw new Error('Título requerido (mínimo 5 caracteres)');
    }

    if (!data.categoria) {
      throw new Error('Categoría requerida');
    }

    if (data.titulo.length > 100) {
      throw new Error('Título muy largo (máximo 100 caracteres)');
    }
  }

  /**
   * Verificar que la categoría existe
   */
  async verifyCategory(categoriaInput) {
    if (!categoriaInput) {
      logger.warn('⚠️ [VERIFY_CATEGORY] No category input provided');
      return null;
    }

    let categoria;
    
    logger.info(`🔍 [VERIFY_CATEGORY] Looking for: "${categoriaInput}"`);
    
    // 1. Buscar por ObjectId
    if (mongoose.Types.ObjectId.isValid(categoriaInput)) {
      categoria = await Categoria.findById(categoriaInput)
        .select('nombre slug activo icono color')  // ✅ Optimización: Solo campos necesarios
        .lean();
      if (categoria) {
        logger.success(`✅ [VERIFY_CATEGORY] Found by ID: ${categoria.nombre}`);
        return categoria;
      }
    }
    
    // 2. Buscar por slug (case-insensitive)
    categoria = await Categoria.findOne({ 
      slug: categoriaInput.toLowerCase(),
      activo: true 
    })
      .select('nombre slug activo icono color')  // ✅ Optimización
      .lean();
    if (categoria) {
      logger.success(`✅ [VERIFY_CATEGORY] Found by slug: ${categoria.nombre}`);
      return categoria;
    }
    
    // 3. Buscar por nombre (case-insensitive, fuzzy)
    const nombreLower = categoriaInput.toLowerCase().trim();
    const categorias = await Categoria.find({ activo: true })
      .select('nombre slug activo icono color')  // ✅ Optimización
      .lean();
    
    for (const cat of categorias) {
      const catNombreLower = cat.nombre.toLowerCase();
      
      // Coincidencia exacta
      if (catNombreLower === nombreLower) {
        logger.success(`✅ [VERIFY_CATEGORY] Found by exact name: ${cat.nombre}`);
        return cat;
      }
      
      // Coincidencia parcial (fuzzy)
      if (catNombreLower.includes(nombreLower) || nombreLower.includes(catNombreLower)) {
        logger.success(`✅ [VERIFY_CATEGORY] Found by fuzzy name match: ${cat.nombre}`);
        return cat;
      }
    }
    
    logger.warn(`⚠️ [VERIFY_CATEGORY] No match found for: "${categoriaInput}"`);
    return null;
  }

  /**
   * Enriquecer datos del servicio con IA
   * ✨ OPTIMIZADO: Una sola llamada a OpenAI para todo el contenido
   */
  async enrichServiceData(serviceData, categoria, context) {
    const enriched = { ...serviceData };
    const aiGenerated = [];

    logger.info('🔍 [ENRICH] Starting service enrichment...');

    // 🚀 ESTRATEGIA OPTIMIZADA: Generar todo en UNA sola llamada
    const needsAIGeneration = 
      !enriched.titulo || enriched.titulo.length < 5 ||
      !enriched.descripcion || enriched.descripcion.length < 50 ||
      !enriched.caracteristicas || enriched.caracteristicas.length === 0 ||
      !enriched.beneficios || enriched.beneficios.length === 0;

    if (needsAIGeneration) {
      logger.info('🤖 [BULK_GENERATION] Generating all content in ONE API call...');
      
      try {
        const bulkContent = await this.generateAllContentInOneCall(enriched, categoria);
        
        // Aplicar el contenido generado
        if (bulkContent.titulo && (!enriched.titulo || enriched.titulo.length < 5)) {
          enriched.titulo = bulkContent.titulo;
          aiGenerated.push('titulo');
        }
        
        if (bulkContent.descripcion && (!enriched.descripcion || enriched.descripcion.length < 50)) {
          enriched.descripcion = bulkContent.descripcion;
          aiGenerated.push('descripcion');
        }
        
        if (bulkContent.descripcionCorta && !enriched.descripcionCorta) {
          enriched.descripcionCorta = bulkContent.descripcionCorta;
          aiGenerated.push('descripcionCorta');
        }
        
        if (bulkContent.caracteristicas && (!enriched.caracteristicas || enriched.caracteristicas.length === 0)) {
          enriched.caracteristicas = bulkContent.caracteristicas;
          aiGenerated.push('caracteristicas');
        }
        
        if (bulkContent.beneficios && (!enriched.beneficios || enriched.beneficios.length === 0)) {
          enriched.beneficios = bulkContent.beneficios;
          aiGenerated.push('beneficios');
        }
        
        logger.success(`✅ [BULK_GENERATION] Generated ${aiGenerated.length} fields in one call`);
        
      } catch (error) {
        logger.error('❌ [BULK_GENERATION] Failed, using fallback:', error.message);
        
        // Fallback: usar plantillas profesionales
        if (!enriched.titulo || enriched.titulo.length < 5) {
          enriched.titulo = `${categoria.nombre} Profesional`;
          aiGenerated.push('titulo_fallback');
        }
        
        if (!enriched.descripcion || enriched.descripcion.length < 50) {
          enriched.descripcion = `Servicio profesional de ${categoria.nombre} diseñado para maximizar resultados. Solución integral que combina experiencia, tecnología de punta y atención personalizada para garantizar el éxito de tu proyecto. Incluye consultoría especializada, implementación completa y soporte continuo.`;
          aiGenerated.push('descripcion_fallback');
        }
        
        if (!enriched.descripcionCorta) {
          enriched.descripcionCorta = enriched.descripcion.substring(0, 147) + '...';
          aiGenerated.push('descripcionCorta_fallback');
        }
        
        if (!enriched.caracteristicas || enriched.caracteristicas.length === 0) {
          enriched.caracteristicas = [
            'Consultoría personalizada',
            'Implementación profesional',
            'Soporte técnico especializado',
            'Garantía de satisfacción',
            'Resultados medibles'
          ];
          aiGenerated.push('caracteristicas_fallback');
        }
        
        if (!enriched.beneficios || enriched.beneficios.length === 0) {
          enriched.beneficios = [
            'Ahorro de tiempo significativo',
            'Reducción de costos operativos',
            'Mejora en la eficiencia',
            'Resultados garantizados',
            'ROI positivo demostrable'
          ];
          aiGenerated.push('beneficios_fallback');
        }
      }
    } else {
      // Si no necesita IA, usar descripción corta de la larga
      if (!enriched.descripcionCorta && enriched.descripcion) {
        enriched.descripcionCorta = enriched.descripcion.substring(0, 147) + '...';
        aiGenerated.push('descripcionCorta');
      }
    }

    enriched.aiGenerated = aiGenerated;
    
    logger.success('✅ [ENRICH] Service enrichment completed');
    
    return enriched;
  }

  /**
   * 🚀 NUEVO: Generar TODO el contenido en UNA sola llamada a OpenAI
   * Evita rate limiting y es más eficiente
   */
  async generateAllContentInOneCall(serviceData, categoria) {
    logger.info('🚀 [BULK] Generating all service content in one API call...');
    
    const prompt = `Genera TODO el contenido profesional para un servicio de tecnología.

DATOS DEL SERVICIO:
- Título base: ${serviceData.titulo || 'Por definir'}
- Categoría: ${categoria.nombre}
- Descripción corta: ${serviceData.descripcionCorta || 'Por definir'}

GENERA un JSON con el siguiente formato EXACTO (sin markdown, sin explicaciones):
{
  "titulo": "Título profesional y atractivo (30-60 caracteres, SEO-friendly)",
  "descripcion": "Descripción completa profesional (200-400 caracteres, un solo párrafo continuo)",
  "descripcionCorta": "Descripción breve y atractiva (80-120 caracteres)",
  "caracteristicas": [
    "Característica 1 específica y técnica",
    "Característica 2 específica y técnica",
    "Característica 3 específica y técnica",
    "Característica 4 específica y técnica",
    "Característica 5 específica y técnica"
  ],
  "beneficios": [
    "Beneficio 1 con valor medible",
    "Beneficio 2 con valor medible",
    "Beneficio 3 con valor medible",
    "Beneficio 4 con valor medible",
    "Beneficio 5 con valor medible"
  ]
}

REQUISITOS CRÍTICOS:
- El título debe ser profesional, claro y memorable
- La descripción debe ser UN SOLO PÁRRAFO sin saltos de línea
- Características = QUÉ incluye el servicio (aspectos técnicos)
- Beneficios = POR QUÉ es valioso (resultados para el cliente)
- Todo en español profesional
- Sin emojis, sin markdown, sin caracteres especiales

Responde SOLO con el JSON, nada más.`;

    try {
      const response = await this.callAI(prompt, 'bulk_content_generation', categoria);
      
      // Limpiar y parsear respuesta
      const cleaned = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^[\s\n]*/, '')
        .replace(/[\s\n]*$/, '')
        .trim();
      
      const parsed = JSON.parse(cleaned);
      
      // Validar que tenemos todo lo necesario
      if (!parsed.titulo || !parsed.descripcion) {
        throw new Error('Respuesta incompleta de IA');
      }
      
      // Truncar si es necesario
      if (parsed.descripcion && parsed.descripcion.length > 900) {
        parsed.descripcion = parsed.descripcion.substring(0, 897) + '...';
      }
      
      if (parsed.descripcionCorta && parsed.descripcionCorta.length > 150) {
        parsed.descripcionCorta = parsed.descripcionCorta.substring(0, 147) + '...';
      }
      
      logger.success('✅ [BULK] Successfully generated all content in one call');
      
      return parsed;
      
    } catch (error) {
      logger.error('❌ [BULK] Failed to generate content:', error.message);
      throw error; // Propagar para que use fallback en enrichServiceData
    }
  }

  /**
   * Generar estructura básica de servicio desde requisitos en texto
   */
  async generateServiceFromRequirements(requirements, context = {}) {
    logger.info('🎯 Generating service structure from text requirements...');
    
    try {
      const prompt = `Basándote en la siguiente descripción de servicio, extrae y genera:

DESCRIPCIÓN: ${requirements}

Por favor, genera un JSON con SOLO los siguientes campos (sin markdown, sin explicaciones):
{
  "titulo": "Título profesional del servicio (30-60 caracteres, SEO-friendly)",
  "descripcion": "Descripción completa (100-300 caracteres)",
  "beneficios": ["beneficio 1", "beneficio 2", "beneficio 3"],
  "caracteristicas": ["característica 1", "característica 2", "característica 3"]
}

IMPORTANTE: Responde SOLO con el JSON válido, sin comentarios ni explicaciones adicionales.`;

      const response = await this.callAI(prompt, 'service_structure', context.categoria);
      
      // Parsear la respuesta JSON
      let parsed = {};
      try {
        // Limpiar posibles markdown markers
        const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch (parseError) {
        logger.warn('⚠️ Could not parse AI response as JSON, using partial data');
        // Intentar extraer al menos un título
        if (requirements.length > 0) {
          parsed.titulo = requirements.substring(0, Math.min(60, requirements.length));
        }
      }
      
      return {
        titulo: parsed.titulo || `Servicio - ${Date.now()}`,
        descripcion: parsed.descripcion,
        caracteristicas: parsed.caracteristicas || [],
        beneficios: parsed.beneficios || []
      };
    } catch (error) {
      logger.error('❌ Error generating service from requirements:', error);
      // Retornar un título fallback basado en los requisitos
      return {
        titulo: requirements.substring(0, Math.min(60, requirements.length)) || 'Nuevo Servicio',
        descripcion: `Servicio profesional: ${requirements}. Brindamos soluciones de calidad con atención personalizada y garantía de satisfacción al cliente.`
      };
    }
  }

  /**
   * Preparar servicio para BD
   */
  prepareServiceForDB(data, categoria) {
    // Validar y convertir responsable si es ObjectId válido
    let responsable = undefined;
    if (data.responsable) {
      try {
        if (mongoose.Types.ObjectId.isValid(data.responsable)) {
          responsable = data.responsable;
        }
      } catch (e) {
        // No es un ObjectId válido, omitir
      }
    }
    
    // Validar y convertir userId si es ObjectId válido
    let userId = undefined;
    if (data.userId) {
      try {
        if (mongoose.Types.ObjectId.isValid(data.userId)) {
          userId = data.userId;
        }
      } catch (e) {
        // No es un ObjectId válido, omitir
      }
    }
    
    return {
      titulo: data.titulo.trim(),
      descripcion: data.descripcion?.trim(),
      descripcionCorta: data.descripcionCorta?.trim(),
      categoria: categoria._id,
      
      // Pricing
      precio: data.precio || null,
      precioMin: data.precioMin || null,
      precioMax: data.precioMax || null,
      tipoPrecio: data.tipoPrecio || 'fijo',
      moneda: data.moneda || 'PEN',
      
      // Visualización
      icono: data.icono || '🚀',
      iconoType: data.iconoType || 'emoji',
      colorIcono: data.colorIcono || '#4F46E5',
      colorFondo: data.colorFondo || '#EEF2FF',
      
      // Estado
      estado: data.estado || 'activo',
      destacado: data.destacado || false,
      visibleEnWeb: data.visibleEnWeb !== false,
      
      // Contenido
      caracteristicas: data.caracteristicas || [],
      beneficios: data.beneficios || [],
      incluye: data.incluye || [],
      noIncluye: data.noIncluye || [],
      tecnologias: data.tecnologias || [],
      etiquetas: data.etiquetas || [],
      
      // Información adicional
      tiempoEntrega: data.tiempoEntrega,
      garantia: data.garantia,
      soporte: data.soporte || 'basico',
      
      // Metadata (solo si son ObjectIds válidos)
      ...(responsable && { responsable }),
      creadoPor: data.creadoPor || 'ServicesAgent'
    };
  }

  /**
   * Enriquecer datos del paquete con IA
   */
  async enrichPackageData(packageData, servicio, context) {
    const enriched = { ...packageData };
    const aiGenerated = [];

    // Si no hay nombre, generar uno
    if (!enriched.nombre) {
      const tier = enriched.tier || 'Estándar';
      enriched.nombre = `${servicio.titulo} - ${tier}`;
      aiGenerated.push('nombre');
    }

    // Si no hay descripción, generar una
    if (!enriched.descripcion) {
      const prompt = `Genera una descripción atractiva de 1-2 líneas para un paquete "${enriched.nombre}" del servicio "${servicio.titulo}". La descripción debe destacar el valor y beneficios.`;
      enriched.descripcion = await this.callAI(prompt, 'package_description', servicio.categoria);
      aiGenerated.push('descripcion');
    }

    // Si no hay características, generar basadas en el servicio
    if (!enriched.caracteristicas || enriched.caracteristicas.length === 0) {
      const prompt = `Lista 5-7 características específicas que incluiría un paquete "${enriched.nombre}" para el servicio "${servicio.titulo}". Formato: lista de objetos JSON con {texto, incluido, descripcion}`;
      const features = await this.callAI(prompt, 'package_features', servicio.categoria);
      enriched.caracteristicas = this.parsePackageFeaturesResponse(features);
      aiGenerated.push('caracteristicas');
    }

    enriched.aiGenerated = aiGenerated;
    return enriched;
  }

  /**
   * Preparar paquete para BD
   */
  preparePackageForDB(data, servicio) {
    return {
      servicioId: servicio._id,
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim(),
      
      // Pricing
      precio: data.precio,
      precioOriginal: data.precioOriginal,
      moneda: data.moneda || servicio.moneda || 'PEN',
      tipoFacturacion: data.tipoFacturacion || 'unico',
      
      // Contenido
      caracteristicas: data.caracteristicas || [],
      limitaciones: data.limitaciones || [],
      addons: data.addons || [],
      
      // Visualización
      destacado: data.destacado || false,
      orden: data.orden || 0,
      badge: data.badge,
      
      // Estado
      activo: data.activo !== false,
      disponible: data.disponible !== false
    };
  }

  /**
   * Validar servicio completo
   */
  validateCompleteService(service) {
    const errors = [];

    if (!service.titulo || service.titulo.length < 5) {
      errors.push('Título muy corto');
    }

    if (!service.descripcion || service.descripcion.length < 100) {
      errors.push('Descripción muy corta (mínimo 100 caracteres)');
    }

    if (!service.categoria) {
      errors.push('Categoría requerida');
    }

    if (errors.length > 0) {
      throw new Error(`Validación fallida: ${errors.join(', ')}`);
    }
  }

  /**
   * Construir prompts para IA
   */
  buildTitlePrompt(serviceData, categoria) {
    return `Genera un título profesional y atractivo para un servicio de tecnología.

Categoría: ${categoria.nombre}
${serviceData.descripcion ? `Descripción: ${serviceData.descripcion.substring(0, 200)}` : ''}
${serviceData.descripcionCorta ? `Resumen: ${serviceData.descripcionCorta}` : ''}

El título debe:
- Ser descriptivo y SEO-friendly
- Tener entre 30-60 caracteres
- Incluir palabra clave principal
- Ser atractivo para clientes
- No incluir caracteres especiales

Genera SOLO el título, sin explicaciones.`;
  }

  buildDescriptionPrompt(serviceData, categoria) {
    return `Genera una descripción profesional y atractiva para un servicio de tecnología.

Servicio: ${serviceData.titulo}
Categoría: ${categoria.nombre}
${serviceData.descripcionCorta ? `Resumen: ${serviceData.descripcionCorta}` : ''}
${serviceData.targetAudience ? `Audiencia: ${serviceData.targetAudience}` : ''}
${serviceData.requirements ? `Requisitos: ${serviceData.requirements}` : ''}

REQUISITOS ESTRICTOS:
- Descripción en UN SOLO PÁRRAFO continuo (sin saltos de línea)
- Tener MÁXIMO 600 caracteres (aproximadamente 100-120 palabras)
- Ser clara, profesional y atractiva
- Destacar el valor y beneficios principales
- Usar tono profesional pero cercano
- Incluir palabras clave relevantes para SEO

PROHIBIDO:
❌ NO dividas en múltiples párrafos
❌ NO agregues "RECOMENDACIÓN:" ni sugerencias
❌ NO agregues análisis del servicio
❌ NO agregues títulos o subtítulos
❌ NO excedas 600 caracteres

FORMATO REQUERIDO:
La descripción debe ser un texto continuo sin saltos de línea, similar a:
"En [nombre servicio], ofrecemos [propuesta de valor]. Nos especializamos en [qué hacemos] para [beneficio principal]. [Características clave]. [Resultado esperado]."

Genera SOLO la descripción en un párrafo continuo, sin formato adicional.`;
  }

  buildFeaturesPrompt(serviceData, categoria) {
    return `GENERA EXACTAMENTE UNA LISTA con viñetas para ${serviceData.titulo}.

Servicio: ${serviceData.titulo}
Descripción: ${serviceData.descripcionCorta || 'No proporcionada'}
Categoría: ${categoria.nombre}

RESPONDE SOLO CON ESTA ESTRUCTURA:
- Característica específica del servicio
- Otra característica específica del servicio  
- Tercera característica específica del servicio
- Cuarta característica específica del servicio
- Quinta característica específica del servicio

OBLIGATORIO:
✅ CADA línea debe comenzar con guión (-)
✅ Máximo 80 caracteres por línea
✅ 5-7 características
✅ Descripción DIRECTA (sin "Primera", "Segunda", etc.)
✅ SIN párrafos largos
✅ SIN doble salto de línea
✅ SIN texto extra

RESPONDE SOLO con la lista de viñetas, nada más. NO agregues explicaciones.`;
  }

  buildBenefitsPrompt(serviceData, categoria) {
    return `GENERA EXACTAMENTE UNA LISTA con viñetas para ${serviceData.titulo}.

Servicio: ${serviceData.titulo}
Descripción: ${serviceData.descripcionCorta || 'No proporcionada'}
Categoría: ${categoria.nombre}

RESPONDE SOLO CON ESTA ESTRUCTURA:
- Beneficio específico del servicio
- Otro beneficio específico del servicio
- Tercer beneficio específico del servicio
- Cuarto beneficio específico del servicio

OBLIGATORIO:
✅ CADA línea debe comenzar con guión (-)
✅ Máximo 80 caracteres por línea
✅ 4-6 beneficios
✅ Descripción DIRECTA (sin "Primer", "Segundo", etc.)
✅ SIN párrafos largos
✅ SIN doble salto de línea
✅ SIN texto extra

RESPONDE SOLO con la lista de viñetas, nada más. NO agregues explicaciones.`;
  }

  buildServiceGenerationPrompt(requirements) {
    return `Genera un servicio de tecnología completo basado en estos requisitos:

${JSON.stringify(requirements, null, 2)}

Genera un objeto JSON con esta estructura:
{
  "titulo": "Título del servicio",
  "descripcion": "Descripción completa",
  "caracteristicas": ["característica 1", "característica 2"],
  "beneficios": ["beneficio 1", "beneficio 2"],
  "precio": número o null,
  "tiempoEntrega": "X días/semanas"
}`;
  }

  buildPackageGenerationPrompt(servicio, strategy) {
    const strategies = {
      basic: 'básico para clientes que buscan lo esencial',
      balanced: 'equilibrado con buen valor-precio',
      premium: 'premium con todas las funcionalidades'
    };

    return `Genera 3 paquetes (Básico, Estándar, Premium) para este servicio:

Servicio: ${servicio.titulo}
Estrategia: ${strategies[strategy] || strategies.balanced}
Precio base: ${servicio.precio || 'No definido'}

Genera un array JSON con 3 paquetes siguiendo esta estructura:
[
  {
    "nombre": "Paquete X",
    "descripcion": "breve descripción",
    "precio": número,
    "caracteristicas": [{"texto": "feature", "incluido": true}]
  }
]`;
  }

  /**
   * Agregar request a la cola para evitar rate limiting
   */
  async queueRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Procesar cola de requests con delays apropiados
   */
  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const { requestFn, resolve, reject } = this.requestQueue.shift();

      try {
        // Calcular tiempo transcurrido desde último request
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        const waitTime = Math.max(0, this.minRequestInterval - timeSinceLastRequest);

        if (waitTime > 0) {
          logger.info(`⏳ [QUEUE] Waiting ${waitTime}ms to avoid rate limiting...`);
          await new Promise(r => setTimeout(r, waitTime));
        }

        this.lastRequestTime = Date.now();
        const result = await requestFn();
        resolve(result);

      } catch (error) {
        reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * 🆕 Llamar directamente a AI para operaciones BULK (sin queue)
   */
  async callAISingle(prompt, type = 'bulk', categoria = null) {
    // 🔥 OPERACIÓN DIRECTA SIN QUEUE para bulk operations
    if (openaiService.isAvailable()) {
      try {
        const uniqueId = `bulk_generator_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        logger.info(`🎯 [BULK_AI] Direct call to OpenAI for ${type} (bypassing queue)`);
        
        const response = await openaiService.generateIntelligentResponse(
          uniqueId,
          'ServicesAgent',
          prompt,
          {
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens * 2, // Más tokens para bulk
            contextData: { 
              type,
              forceNoCache: true,
              timestamp: Date.now(),
              uniqueRequestId: uniqueId,
              isBulkOperation: true
            }
          }
        );

        const rawContent = response.content || response.message || response;
      
        // 🔍 DEBUG: Verificar si es fallback del OpenAIService
        if (response.fallback || rawContent.includes('Sistema operando en modo básico')) {
          logger.warn(`⚠️ [BULK_AI] OpenAI fallback detected for ${type}, using local fallback`);
          const categoryName = typeof categoria === 'string' ? categoria : categoria?.nombre;
          return this.getBulkFallbackResponse(type, categoryName);
        }
        
        logger.success(`✅ [BULK_AI] Bulk content generated successfully (${rawContent.length} chars)`);
        
        return rawContent;

      } catch (error) {
        logger.error(`❌ [BULK_AI] Error in direct AI call for ${type}:`, error.message);
        // Fallback local para bulk
        const categoryName = typeof categoria === 'string' ? categoria : categoria?.nombre;
        return this.getBulkFallbackResponse(type, categoryName);
      }
    } else {
      logger.warn(`⚠️ [BULK_AI] OpenAI not available for ${type}, using bulk fallback`);
      const categoryName = typeof categoria === 'string' ? categoria : categoria?.nombre;
      return this.getBulkFallbackResponse(type, categoryName);
    }
  }

  /**
   * Llamar a IA (SIN CACHE - Contenido siempre fresco)
   */
  async callAI(prompt, type = 'general', categoria = null) {
    // 🔥 PRIMERO: Intentar con OpenAI si está disponible
    if (openaiService.isAvailable()) {
      try {
        // 🆕 Usar cola para evitar rate limiting
        return await this.queueRequest(async () => {
          // 🔥 FORZAR CONTENIDO FRESCO - ID único por llamada
          const uniqueId = `generator_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          
          // 🔧 PROMPT CON TIMESTAMP para evitar cache 
          const timestampedPrompt = `${prompt}

[TIMESTAMP_ÚNICO: ${Date.now()}_${Math.random()}]
[GENERA_CONTENIDO_FRESCO: true]
[NO_CACHE: true]`;

          logger.info(`🤖 [CALL_AI] Calling OpenAI with unique ID: ${uniqueId}`);
          logger.info(`📋 [CALL_AI] Type: ${type}, Force fresh: true`);

          // 🔥 OPTIMIZACIÓN: Configuración económica según tipo de contenido
          const economicConfig = {
            temperature: this.config.temperature,
            maxTokens: this.getOptimalTokensForType(type), // 🆕 Tokens optimizados
            model: this.selectEconomicModel(type),           // 🆕 Modelo económico
            requiresPrecision: ['seo', 'title'].includes(type),
            requiresCreativity: ['features', 'benefits', 'description'].includes(type)
          };

          logger.info(`💰 [COST_OPT] Model: ${economicConfig.model}, MaxTokens: ${economicConfig.maxTokens}, Type: ${type}`);

          const response = await openaiService.generateIntelligentResponse(
            uniqueId,
            'ServicesAgent',
            timestampedPrompt,
            {
              ...economicConfig,
              contextData: { 
                type,
                forceNoCache: true,
                timestamp: Date.now(),
                uniqueRequestId: uniqueId,
                costOptimized: true
              }
            }
          );

          const rawContent = response.content || response.message || response;
        
          // 🔍 DEBUG: Verificar si es fallback del OpenAIService
          if (response.fallback || rawContent.includes('Sistema operando en modo básico')) {
            logger.warn(`⚠️ [CALL_AI] OpenAI fallback detected for ${type}, using local fallback`);
            const categoryName = typeof categoria === 'string' ? categoria : categoria?.nombre;
            return this.getFallbackResponse(type, categoryName);
          }
          
          // 🧹 Limpiar respuesta (remover timestamp y markers)
          let cleanedContent = rawContent;
          cleanedContent = cleanedContent.replace(/\[TIMESTAMP_ÚNICO:.*?\]/g, '');
          cleanedContent = cleanedContent.replace(/\[GENERA_CONTENIDO_FRESCO:.*?\]/g, '');
          cleanedContent = cleanedContent.replace(/\[NO_CACHE:.*?\]/g, '');
          
          // Aplicar limpieza adicional para remover recomendaciones
          const finalContent = this.cleanAIResponse(cleanedContent);
          
          logger.success(`✅ [CALL_AI] Fresh content generated for ${type} (${finalContent.length} chars)`);
          
          return finalContent;
        });

      } catch (error) {
        logger.error(`❌ [CALL_AI] Error calling AI for ${type}:`, error.message);
        // ⚠️ NO lanzar error, usar fallback local
        logger.info(`🔄 [CALL_AI] Using local fallback for ${type}`);
        const categoryName = typeof categoria === 'string' ? categoria : categoria?.nombre;
        return this.getFallbackResponse(type, categoryName);
      }
    } else {
      logger.warn(`⚠️ [CALL_AI] OpenAI not available for ${type}, using local fallback`);
      const categoryName = typeof categoria === 'string' ? categoria : categoria?.nombre;
      return this.getFallbackResponse(type, categoryName);
    }
  }

  /**
   * 🆕 Fallback específico para operaciones bulk
   */
  getBulkFallbackResponse(type, categoryName) {
    logger.info(`🔄 [BULK_FALLBACK] Generating fallback content for bulk operation`);
    
    // Estructura de respuesta bulk simulada
    const fallbackContent = `**QUÉ INCLUYE EL SERVICIO**
- Servicio profesional de calidad garantizada
- Atención personalizada y dedicada  
- Garantía de satisfacción del cliente
- Soporte técnico continuo incluido
- Resultados medibles y verificables

**QUÉ NO INCLUYE EL SERVICIO**
- Servicios fuera del alcance definido
- Cambios no contemplados en el plan
- Recursos adicionales no especificados
- Servicios de terceros no incluidos  
- Mantenimiento posterior al período establecido

**PREGUNTAS FRECUENTES**
- ¿Cuánto tiempo toma completar el servicio? | El tiempo de entrega depende del alcance del proyecto, pero generalmente oscila entre 2-4 semanas.
- ¿Incluye revisiones? | Sí, incluimos hasta 3 rondas de revisiones para garantizar tu satisfacción.
- ¿Qué garantías ofrecen? | Ofrecemos garantía de calidad y satisfacción del cliente en todos nuestros servicios.`;

    return fallbackContent;
  }

  /**
   * Obtener respuesta fallback cuando OpenAI no está disponible
   * 🆕 Ahora con contenido específico por categoría
   */
  getFallbackResponse(type, categoria = null) {
    // 🎯 Contenido específico por categoría
    const categorySpecific = {
      'Marketing': {
        features: `- Estrategia de marketing digital personalizada
- Gestión profesional de redes sociales
- Campañas publicitarias optimizadas
- Análisis de métricas y resultados
- Incremento de visibilidad online`,
        benefits: `- Aumento del 40% en visibilidad online
- Mayor engagement con tu audiencia
- Incremento en conversiones y ventas
- ROI medible y transparente`,
        description: 'Impulsa tu presencia digital con estrategias de marketing personalizadas que conectan con tu audiencia objetivo y generan resultados medibles.',
        full_description: 'Impulsa tu presencia digital con estrategias de marketing personalizadas que conectan con tu audiencia objetivo y generan resultados medibles. Nuestro equipo desarrolla campañas integrales que combinan creatividad, analítica y experiencia para maximizar tu retorno de inversión.',
        short_description: 'Estrategias de marketing digital que impulsan tu presencia online y generan resultados medibles.',
        faq: `- ¿Qué plataformas de redes sociales manejan? | Trabajamos con Facebook, Instagram, LinkedIn, Twitter y TikTok según tu audiencia objetivo.
- ¿Incluye creación de contenido? | Sí, incluimos diseño gráfico, copywriting y calendarios de publicación personalizados.
- ¿Cuánto tiempo se tarda en ver resultados? | Los primeros resultados se ven en 2-4 semanas, optimización completa en 3 meses.
- ¿Proporcionan reportes de métricas? | Sí, enviamos reportes mensuales detallados con análisis de rendimiento.
- ¿Qué estrategias de publicidad usan? | Combinamos Facebook Ads, Google Ads y marketing orgánico según tu presupuesto.
- ¿Hacen gestión de comunidad? | Incluimos respuesta a comentarios y mensajes durante horario comercial.`
      },
      'Desarrollo': {
        features: `- Desarrollo de software a medida
- Arquitectura escalable y segura
- Integración con sistemas existentes
- Testing y control de calidad
- Mantenimiento y soporte técnico`,
        benefits: `- Soluciones tecnológicas personalizadas
- Mayor eficiencia operacional
- Automatización de procesos
- Escalabilidad garantizada`,
        description: 'Desarrollamos soluciones tecnológicas a medida que optimizan tus procesos y potencian el crecimiento de tu negocio.',
        full_description: 'Desarrollamos soluciones tecnológicas a medida que optimizan tus procesos y potencian el crecimiento de tu negocio. Nuestro equipo de desarrolladores expertos utiliza las últimas tecnologías para crear aplicaciones robustas, escalables y seguras.',
        short_description: 'Desarrollo de software a medida para optimizar procesos y potenciar tu negocio.',
      },
      'Diseño': {
        features: `- Diseño gráfico profesional y creativo
- Identidad visual coherente
- Materiales publicitarios atractivos
- Optimización para diferentes medios
- Revisiones ilimitadas incluidas`,
        benefits: `- Imagen profesional diferenciada
- Mayor impacto visual
- Coherencia en todos los medios
- Incremento en reconocimiento de marca`,
        description: 'Creamos diseños únicos que comunican la esencia de tu marca y conectan emocionalmente con tu audiencia.',
        full_description: 'Creamos diseños únicos que comunican la esencia de tu marca y conectan emocionalmente con tu audiencia. Nuestro enfoque integral abarca desde la conceptualización hasta la implementación final, asegurando coherencia visual en todos los puntos de contacto.',
        short_description: 'Diseños únicos que comunican la esencia de tu marca con impacto visual.',
      },
      'Consultoría': {
        features: `- Análisis estratégico profundo
- Diagnóstico personalizado
- Plan de acción detallado
- Acompañamiento en implementación
- Seguimiento de resultados`,
        benefits: `- Optimización de procesos empresariales
- Reducción de costos operacionales
- Mejora en toma de decisiones
- Incremento en rentabilidad`,
        description: 'Asesoramiento estratégico especializado para optimizar tus procesos y maximizar el rendimiento de tu negocio.',
        full_description: 'Asesoramiento estratégico especializado para optimizar tus procesos y maximizar el rendimiento de tu negocio. Nuestros consultores analizan tu situación actual y diseñan soluciones personalizadas que impulsan el crecimiento sostenible.',
        short_description: 'Asesoramiento estratégico para optimizar procesos y maximizar el rendimiento.',
      }
    };

    // Fallbacks genéricos como respaldo
    const genericFallbacks = {
      title: 'Servicio Profesional de Calidad',
      description: 'Servicio profesional de alta calidad diseñado para proporcionar soluciones efectivas y confiables. Contamos con expertos dedicados a garantizar la satisfacción del cliente y entregar resultados excepcionales en cada proyecto.',
      full_description: 'Servicio profesional de alta calidad diseñado para proporcionar soluciones efectivas y confiables. Contamos con expertos dedicados a garantizar la satisfacción del cliente y entregar resultados excepcionales en cada proyecto.',
      short_description: 'Servicio profesional de calidad con resultados garantizados y atención personalizada.',
      features: `- Servicio profesional de calidad garantizada
- Atención personalizada y dedicada
- Garantía de satisfacción del cliente
- Soporte técnico continuo incluido
- Resultados medibles y verificables`,
      benefits: `- Mejora del rendimiento operacional
- Mayor productividad empresarial
- Soluciones confiables y efectivas
- Ahorro de tiempo y recursos`,
      service_structure: '{"titulo": "Servicio Profesional de Calidad", "descripcion": "Servicio profesional de alta calidad diseñado para proporcionar soluciones efectivas y confiables. Contamos con expertos dedicados a garantizar la satisfacción del cliente."}',
      package_description: 'Paquete profesional completo con servicios incluidos y soporte dedicado',
      // 🆕 Nuevos fallbacks para tipos adicionales
      incluye: `- Asesoramiento profesional especializado
- Análisis detallado de la situación
- Documentación completa del proceso
- Soporte técnico durante la implementación
- Seguimiento posterior al proyecto`,
      noIncluye: `- Servicios fuera del alcance definido
- Cambios no contemplados en el plan
- Recursos adicionales no especificados
- Servicios de terceros no incluidos
- Mantenimiento posterior al período establecido`,
      faq: `- ¿Cuánto tiempo toma completar el servicio? | El tiempo de entrega depende del alcance del proyecto, pero generalmente oscila entre 2-4 semanas.
- ¿Incluye revisiones? | Sí, incluimos hasta 3 rondas de revisiones para garantizar tu satisfacción.
- ¿Qué garantías ofrecen? | Ofrecemos garantía de calidad y satisfacción del cliente en todos nuestros servicios.
- ¿Cómo es el proceso de trabajo? | Iniciamos con una consulta, luego desarrollo y finalmente entrega con seguimiento.
- ¿Qué formas de pago aceptan? | Aceptamos transferencias bancarias, tarjetas de crédito y pagos fraccionados.
- ¿Proporcionan soporte posterior? | Incluimos 30 días de soporte gratuito posterior a la entrega del proyecto.`
    };

    // Intentar obtener contenido específico por categoría
    if (categoria && categorySpecific[categoria] && categorySpecific[categoria][type]) {
      logger.info(`🎯 [FALLBACK] Using category-specific content for ${categoria} - ${type}`);
      return categorySpecific[categoria][type];
    }
    
    // Usar fallback genérico
    logger.info(`📋 [FALLBACK] Using generic content for ${type}`);
    return genericFallbacks[type] || genericFallbacks.description;
  }

  /**
   * 🆕 Limpiar respuesta del agente de IA
   * Remueve recomendaciones, análisis y otros contenidos no deseados
   */
  cleanAIResponse(text) {
    if (!text) return '';
    
    // Si el texto es JSON válido, devolverlo sin modificar
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        JSON.parse(trimmed);
        return text;
      } catch (e) {
        // No es JSON válido, continuar con la limpieza normal
      }
    }
    
    let cleaned = text;
    
    // Remover secciones de recomendación (líneas completas)
    const recommendationPatterns = [
      /💡\s*RECOMENDACIÓN:?.*/gi,
      /RECOMENDACIÓN:?.*/gi,
      /💡\s*Sugerencia:?.*/gi,
      /Sugerencia:?.*/gi,
      /💡\s*Consejo:?.*/gi,
      /Consejo:?.*/gi,
      /🔍\s*ANÁLISIS:?.*/gi,
      /ANÁLISIS:?.*/gi,
      /📊\s*SUGERENCIA:?.*/gi,
      /⚠️\s*NOTA:?.*/gi,
      /NOTA:?.*/gi,
      /\n\nRecomendaciones?:.*/gis,
      /\n\nNota:.*/gis,
      /\n\nSugerencias?:.*/gis,
      /\n\nAnálisis:.*/gis,
    ];
    
    for (const pattern of recommendationPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    // Remover párrafos completos que empiezan con emojis de recomendación o palabras clave
    cleaned = cleaned.split('\n\n')
      .filter(paragraph => {
        const trimmed = paragraph.trim();
        // Filtrar párrafos que comienzan con emojis
        if (/^[💡📝✨🎯⚠️🔍📊]/.test(trimmed)) {
          return false;
        }
        // Filtrar párrafos que comienzan con palabras clave
        if (/^(Recomendación|Sugerencia|Consejo|Nota|Tip|Importante|Análisis):/i.test(trimmed)) {
          return false;
        }
        // Filtrar párrafos que contienen "Revisa los puntos destacados" o similares
        if (/revisa\s+(los\s+)?puntos\s+destacados/i.test(trimmed)) {
          return false;
        }
        return true;
      })
      .join('\n\n');
    
    // Limpiar espacios múltiples
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    
    return cleaned;
  }

  /**
   * 🆕 Parsear respuesta de array con soporte para párrafos y listas
   * 
   * Estrategia SIMPLIFICADA:
   * 1. Intenta parsear como JSON (estructura {"caracteristicas": [...]} o {"beneficios": [...]})
   * 2. Si tiene viñetas/numeración → parsear como lista (cada item = 1 bloque)
   * 3. Si tiene párrafos (doble \n\n) → cada párrafo = 1 bloque
   * 4. Si tiene saltos simples → unir todo en 1 bloque
   */
  parseArrayResponse(text) {
    if (!text) return [];
    
    // 1️⃣ Intentar parsear como JSON primero
    try {
      const parsed = JSON.parse(text);
      // Si es objeto con "caracteristicas" o "beneficios" o "features" o "benefits"
      if (parsed.caracteristicas && Array.isArray(parsed.caracteristicas)) {
        logger.info('✅ [PARSER] JSON detected: caracteristicas');
        return parsed.caracteristicas;
      }
      if (parsed.beneficios && Array.isArray(parsed.beneficios)) {
        logger.info('✅ [PARSER] JSON detected: beneficios');
        return parsed.beneficios;
      }
      if (parsed.features && Array.isArray(parsed.features)) {
        return parsed.features;
      }
      if (parsed.benefits && Array.isArray(parsed.benefits)) {
        return parsed.benefits;
      }
      // Si es un array directo
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // No es JSON válido, continuar con parsing de texto
    }

    // Limpiar el texto
    const cleaned = text.trim();

    // Detectar si es una lista con viñetas/números
    const lines = cleaned.split('\n');
    const linesWithMarkers = lines.filter(line => 
      /^[-•*]\s+/.test(line.trim()) || /^\d+[\.)]\s+/.test(line.trim())
    ).length;
    
    // Si más del 40% de las líneas tienen marcadores, es una lista
    const hasMultipleListItems = linesWithMarkers >= 2 && linesWithMarkers / lines.length > 0.4;
    
    if (hasMultipleListItems) {
      return this.parseListFormat(cleaned);
    }

    // Si tiene doble salto de línea → separar por párrafos
    if (cleaned.includes('\n\n')) {
      return this.parseParagraphFormat(cleaned, '\n\n');
    }

    // Si solo tiene saltos simples → unir todo en un bloque
    const singleBlock = cleaned.replace(/\n+/g, ' ').trim();
    return singleBlock ? [singleBlock] : [];
  }

  /**
   * 🆕 Parsear formato de lista con viñetas o números
   * Ejemplos:
   * - Item 1
   * - Item 2
   * 1. Item A
   * 2. Item B
   */
  parseListFormat(text) {
    const items = [];
    const lines = text.split('\n');
    let currentItem = '';

    logger.info(`🔍 [PARSER] Parsing list format (${lines.length} lines)`);

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detectar inicio de nuevo item (viñetas o números)
      const isNewItem = /^[-•*]\s+/.test(trimmed) || /^\d+[\.)]\s+/.test(trimmed);
      
      if (isNewItem) {
        // Guardar item anterior si existe
        if (currentItem) {
          items.push(currentItem.trim());
        }
        // Iniciar nuevo item (removiendo el marcador)
        currentItem = trimmed.replace(/^[-•*]\s+/, '').replace(/^\d+[\.)]\s+/, '');
      } else if (trimmed) {
        // Continuar item actual (línea de continuación)
        currentItem += ' ' + trimmed;
      }
    }

    // Agregar último item
    if (currentItem) {
      items.push(currentItem.trim());
    }

    logger.info(`✅ [PARSER] Parsed ${items.length} items from list`);

    return items.slice(0, 10); // Máximo 10 items
  }

  /**
   * 🆕 Parsear formato de párrafos separados por salto múltiple
   * Cada bloque separado por separator se considera un item independiente
   */
  parseParagraphFormat(text, separator = '\n\n') {
    return text
      .split(separator)  // Dividir por párrafos
      .map(paragraph => {
        // Unir líneas dentro del párrafo con un espacio
        return paragraph
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .join(' ')
          .trim();
      })
      .filter(block => block.length > 0)
      .map(block => {
        // Limpiar marcadores si los hay al inicio
        return block.replace(/^[-•*]\s*/, '').trim();
      })
      .slice(0, 10); // Máximo 10 bloques
  }

  parseAIServiceResponse(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      logger.warn('Could not parse AI service response as JSON');
      return { generated: text };
    }
  }

  parseAIPackageResponse(text, servicio) {
    try {
      return JSON.parse(text);
    } catch (e) {
      logger.warn('Could not parse AI package response as JSON');
      return [];
    }
  }

  parsePackageFeaturesResponse(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      // Fallback: crear features simples
      const lines = this.parseArrayResponse(text);
      return lines.map(line => ({
        texto: line,
        incluido: true
      }));
    }
  }

  /**
   * 🆕 GENERAR CONTENIDO ESPECÍFICO para un servicio existente
   * Tipos: full_description, short_description, features, benefits, faq
   * Estilos: formal, casual, technical
   */
  async generateSpecificContent(serviceId, contentType, style = 'formal') {
    try {
      logger.info(`📝 Generating ${contentType}...`);

      // Obtener el servicio
      const servicio = await Servicio.findById(serviceId).populate('categoria');
      if (!servicio) {
        throw new Error('Servicio no encontrado');
      }

      // Construir prompt según el tipo de contenido y estilo
      const prompt = this.buildContentPrompt(servicio, contentType, style);
      
      // ✅ Llamar a la IA con categoría
      const rawContent = await this.callAI(prompt, contentType, servicio.categoria);

      // Procesar contenido según el tipo
      let processedContent = rawContent;
      
      // Para SEO, intentar parsear como JSON estructurado
      if (contentType === 'seo') {
        processedContent = this.parseSEOResponse(rawContent, servicio);
      } 
      // Para contenido de arrays, asegurar formato consistente
      else if (['features', 'benefits', 'incluye', 'noIncluye'].includes(contentType)) {
        processedContent = this.parseArrayResponse(rawContent);
      }
      // Para FAQ, estructurar en formato objeto
      else if (contentType === 'faq') {
        processedContent = this.parseFAQResponse(rawContent);
      }

      logger.success(`✅ Content generated successfully`);

      return {
        success: true,
        data: {
          type: contentType,
          style: style,
          content: processedContent,
          service: {
            id: servicio._id,
            titulo: servicio.titulo,
            categoria: servicio.categoria?.nombre
          }
        },
        metadata: {
          contentLength: typeof processedContent === 'string' ? processedContent.length : JSON.stringify(processedContent).length,
          generatedAt: new Date(),
          isStructured: contentType === 'seo' || contentType === 'faq'
        }
      };

    } catch (error) {
      logger.error('❌ Error generating content:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🚀 NUEVO: Generar contenido COMPLETO del servicio en una sola consulta
   * 🆕 VERSIÓN 2.0: Incluye contenido avanzado (descriptions, seo)
   */
  async generateCompleteServiceContent(serviceId, options = {}) {
    try {
      const startTime = Date.now();
      const { 
        style = 'formal', 
        sections = 'all', 
        forceRegenerate = false,
        includeAdvanced = true // 🆕 Nuevo parámetro 
      } = options;
      
      logger.info(`🎯 [UNIFIED] Starting COMPLETE service content generation for ${serviceId}`);

      // Obtener el servicio
      const servicio = await Servicio.findById(serviceId).populate('categoria');
      if (!servicio) {
        throw new Error('Servicio no encontrado');
      }

      // 🆕 Definir secciones básicas y avanzadas
      const basicSections = ['caracteristicas', 'beneficios', 'incluye', 'noIncluye', 'faq'];
      const advancedSections = ['full_description', 'short_description', 'seo'];
      
      let allPossibleSections = [...basicSections];
      if (includeAdvanced) {
        allPossibleSections = [...basicSections, ...advancedSections];
      }

      // Verificar qué contenido falta (a menos que se fuerce regeneración)
      let sectionsToGenerate = [];
      if (!forceRegenerate) {
        const contentCheck = {
          // Secciones básicas (arrays)
          'caracteristicas': servicio.caracteristicas?.length > 0,
          'beneficios': servicio.beneficios?.length > 0, 
          'incluye': servicio.incluye?.length > 0,
          'noIncluye': servicio.noIncluye?.length > 0,
          'faq': servicio.faq?.length > 0,
          // Secciones avanzadas - validación de contenido existente
          'full_description': servicio.descripcionRica && servicio.descripcionRica.trim().length >= 1200, // Debe ser realmente extensa (1200+ chars)
          'short_description': servicio.contenidoAdicional && servicio.contenidoAdicional.trim().length >= 300, // contenidoAdicional (300+ chars)
          'seo': servicio.seo && servicio.seo.titulo && servicio.seo.descripcion && servicio.seo.palabrasClave
        };

        sectionsToGenerate = allPossibleSections.filter(section => !contentCheck[section]);
        
        if (sectionsToGenerate.length === 0) {
          logger.info(`✅ [UNIFIED] All content already exists for service ${serviceId}`);
          return {
            success: true,
            data: {
              service: { id: servicio._id, titulo: servicio.titulo },
              message: 'All content sections are already complete',
              sectionsGenerated: [],
              totalItems: 0,
              skipped: true,
              optimization: {
                allContentAlreadyExists: true,
                unifiedGeneration: true,
                singleAPICall: false,
                advancedContentIncluded: includeAdvanced
              }
            },
            metadata: { allContentExisted: true, processingTime: Date.now() - startTime }
          };
        }
      } else {
        sectionsToGenerate = allPossibleSections;
      }

      // Construir prompt UNIFICADO optimizado (incluye contenido avanzado)
      const unifiedPrompt = this.buildUnifiedServicePrompt(servicio, sectionsToGenerate, style);
      
      // 🔥 UNA SOLA LLAMADA A LA API
      logger.info(`⚡ [UNIFIED] Making SINGLE API call for sections: ${sectionsToGenerate.join(', ')}`);
      const rawContent = await this.callAISingle(unifiedPrompt, 'unified_service', servicio.categoria);

      // Parsear y distribuir todo el contenido pasando el servicio
      const parsedContent = this.parseUnifiedServiceResponse(rawContent, sectionsToGenerate, servicio);

      // Guardar todo el contenido en la base de datos
      const updateData = {};
      const results = {};
      
      for (const [section, content] of Object.entries(parsedContent)) {
        if (content) {
          // Mapear secciones a campos de la base de datos
          let dbField = section;
          let processedContent = content;
          
          // Mapeo de secciones avanzadas a campos de base de datos
          if (section === 'full_description') {
            dbField = 'descripcionRica'; // Contenido Avanzado: Descripción Rica (hasta 5000 chars)
            logger.info(`📋 [MAPPING] ${section} → ${dbField} (${content.length} chars)`);
          } else if (section === 'short_description') {
            dbField = 'contenidoAdicional'; // Contenido Avanzado: Contenido Adicional (hasta 2000 chars)
            logger.info(`📋 [MAPPING] ${section} → ${dbField} (${content.length} chars)`);
          } else if (section === 'seo') {
            dbField = 'seo';
            logger.info(`📋 [MAPPING] ${section} → ${dbField}`);
          }
          
          // Validar contenido antes de guardar
          if (Array.isArray(content) && content.length > 0) {
            updateData[dbField] = content;
            results[section] = content; // ✅ Mantener nombre original para el response
            logger.success(`✅ [UNIFIED] ${section}: ${content.length} items parsed`);
          } else if (typeof content === 'string' && content.trim().length > 0) {
            updateData[dbField] = processedContent;
            results[section] = processedContent; // ✅ Mantener nombre original para el response
            logger.success(`✅ [UNIFIED] ${section}: content generated`);
          } else if (typeof content === 'object' && Object.keys(content).length > 0) {
            updateData[dbField] = processedContent;
            results[section] = processedContent; // ✅ Mantener nombre original para el response
            logger.success(`✅ [UNIFIED] ${section}: object structure created`);
          }
        }
      }

      // Actualizar servicio con todo el contenido de una vez
      if (Object.keys(updateData).length > 0) {
        logger.info(`💾 [DATABASE] Updating service with fields: ${Object.keys(updateData).join(', ')}`);
        // Mostrar contenido específico de descripcionRica y descripcionCorta
        if (updateData.descripcionRica) {
          logger.info(`📝 [DB_CONTENT] descripcionRica: "${updateData.descripcionRica.substring(0, 100)}..." (${updateData.descripcionRica.length} chars)`);
        }
        if (updateData.descripcionCorta) {
          logger.info(`📝 [DB_CONTENT] descripcionCorta: "${updateData.descripcionCorta.substring(0, 100)}..." (${updateData.descripcionCorta.length} chars)`);
        }
        
        await Servicio.findByIdAndUpdate(serviceId, updateData, { new: true });
        logger.success(`✅ [DATABASE] Service updated successfully`);
      }

      const processingTime = Date.now() - startTime;
      const totalItems = Object.values(results).reduce((sum, arr) => sum + (arr ? arr.length : 0), 0);

      logger.success(`🎉 [UNIFIED] Complete service generation finished in ${processingTime}ms`);
      logger.info(`📊 [UNIFIED] Generated ${totalItems} total items across ${Object.keys(results).length} sections`);

      return {
        success: true,
        data: {
          service: { id: servicio._id, titulo: servicio.titulo, categoria: servicio.categoria?.nombre },
          generatedContent: results,
          sectionsGenerated: Object.keys(results),
          totalItems,
          optimization: {
            unifiedGeneration: true,
            singleAPICall: true,
            timeEfficiency: `${Math.round(processingTime/1000)}s vs ~30s traditional`
          }
        },
        metadata: {
          processingTime,
          generatedWithAI: true,
          sectionsRequested: sectionsToGenerate,
          sectionsDelivered: Object.keys(results),
          unifiedOptimization: true
        }
      };

    } catch (error) {
      logger.error(`❌ [UNIFIED] Error in complete service generation:`, error);
      return {
        success: false,
        error: error.message,
        fallback: true
      };
    }
  }

  /**
   * 🆕 Generar contenido masivo (múltiples tipos en una sola consulta AI)
   */
  async generateBulkContent(serviceId, contentTypes, style = 'formal') {
    try {
      const startTime = Date.now();
      logger.info(`🚀 [BULK] Starting bulk content generation for ${contentTypes.join(', ')}`);

      // Obtener el servicio
      const servicio = await Servicio.findById(serviceId).populate('categoria');
      if (!servicio) {
        throw new Error('Servicio no encontrado');
      }

      // Construir prompt masivo para todos los tipos
      const bulkPrompt = this.buildBulkContentPrompt(servicio, contentTypes, style);
      
      // ✅ CRÍTICO: Llamar a la IA con una sola consulta (sin queue para bulk)
      logger.info(`🎯 [BULK] Making SINGLE AI call for all content types: ${contentTypes.join(', ')}`);
      const rawContent = await this.callAISingle(bulkPrompt, 'bulk_content', servicio.categoria);

      // Parsear y distribuir el contenido
      const distributedContent = this.parseBulkContentResponse(rawContent, contentTypes);

      // Guardar cada sección en la base de datos
      const updatePromises = [];
      const results = {};

      for (const [contentType, content] of Object.entries(distributedContent)) {
        if (content && content.length > 0) {
          const updateData = { [contentType]: content };
          updatePromises.push(
            Servicio.findByIdAndUpdate(serviceId, updateData, { new: true })
          );
          results[contentType] = content;
          logger.success(`✅ [BULK] ${contentType}: ${content.length} items saved`);
        }
      }

      // Ejecutar todas las actualizaciones
      await Promise.all(updatePromises);

      const processingTime = Date.now() - startTime;
      logger.success(`✅ [BULK] Bulk content generation completed in ${processingTime}ms`);

      return {
        success: true,
        data: {
          service: { id: servicio._id, titulo: servicio.titulo },
          generatedContent: results,
          contentTypes: Object.keys(results),
          totalItems: Object.values(results).reduce((sum, arr) => sum + (arr ? arr.length : 0), 0)
        },
        metadata: {
          processingTime,
          generatedWithAI: true,
          contentTypes: contentTypes,
          actualGenerated: Object.keys(results),
          usedBulkOptimization: true
        }
      };

    } catch (error) {
      logger.error(`❌ [BULK] Error generating bulk content:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🆕 Construir prompt según tipo de contenido y estilo
   */
  buildContentPrompt(servicio, contentType, style) {
    const categoria = servicio.categoria?.nombre || 'Servicio';
    const tituloServicio = servicio.titulo;
    const descripcionActual = servicio.descripcion || servicio.descripcionCorta || '';

    // Mapeo de estilos
    const styleDescriptions = {
      formal: 'profesional, corporativo y estructurado',
      casual: 'amigable, cercano y conversacional',
      technical: 'técnico, detallado y específico con terminología especializada'
    };

    const styleDesc = styleDescriptions[style] || styleDescriptions.formal;

    // 🔥 Agregar timestamp único para forzar contenido fresco
    const uniqueTimestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(2, 9);

    // Plantillas por tipo de contenido
    const templates = {
      full_description: `Genera una descripción completa y detallada para el siguiente servicio.

**Servicio:** ${tituloServicio}
**Categoría:** ${categoria}
**Contexto actual:** ${descripcionActual}
**Timestamp único:** ${uniqueTimestamp}

**Estilo requerido:** ${styleDesc}

**Requisitos:**
- Extensión: 300-500 palabras
- Estructura clara con introducción, desarrollo y conclusión
- Incluir propuesta de valor
- Destacar diferenciadores
- Llamado a la acción al final
- Estilo: ${styleDesc}
- CONTENIDO ÚNICO Y FRESCO (ID: ${uniqueId})

Genera SOLO el texto de la descripción, sin títulos ni formato adicional.`,

      short_description: `Genera una descripción corta y atractiva para el siguiente servicio.

**Servicio:** ${tituloServicio}
**Categoría:** ${categoria}
**Descripción actual:** ${descripcionActual}
**Timestamp único:** ${uniqueTimestamp}

**Estilo requerido:** ${styleDesc}

**Requisitos:**
- Extensión: 80-120 palabras
- Impacto inmediato
- Destacar el beneficio principal
- Lenguaje claro y persuasivo
- Estilo: ${styleDesc}
- CONTENIDO ÚNICO Y FRESCO (ID: ${uniqueId})

Genera SOLO el texto de la descripción corta, sin títulos.`,

      features: `Genera una lista de características principales para el siguiente servicio.

**Servicio:** ${tituloServicio}
**Categoría:** ${categoria}
**Descripción:** ${descripcionActual}
**Timestamp único:** ${uniqueTimestamp}

**Estilo requerido:** ${styleDesc}

**Requisitos:**
- 6-8 características concretas
- Cada una debe ser específica y relevante
- Formato: lista con viñetas
- Enfoque en capacidades y funcionalidades
- Estilo: ${styleDesc}
- CONTENIDO ÚNICO Y FRESCO (ID: ${uniqueId})

Genera SOLO la lista de características en formato de viñetas (- Característica).`,

      benefits: `Genera una lista de beneficios clave para el siguiente servicio.

**Servicio:** ${tituloServicio}
**Categoría:** ${categoria}
**Descripción:** ${descripcionActual}
**Timestamp único:** ${uniqueTimestamp}

**Estilo requerido:** ${styleDesc}

**Requisitos:**
- 5-7 beneficios principales
- Enfoque en resultados y valor para el cliente
- Cada beneficio debe responder "¿Qué gano con esto?"
- Formato: lista con viñetas simples (sin negrita ni markdown)
- Estilo: ${styleDesc}
- CONTENIDO ÚNICO Y FRESCO (ID: ${uniqueId})

Genera SOLO la lista de beneficios en formato de viñetas (- Beneficio), sin usar **negrita** ni formato markdown.`,

      incluye: `Genera una lista de elementos incluidos en el siguiente servicio.

**Servicio:** ${tituloServicio}
**Categoría:** ${categoria}
**Descripción:** ${descripcionActual}
**Timestamp único:** ${uniqueTimestamp}

**Estilo requerido:** ${styleDesc}

**Requisitos:**
- 8-12 elementos concretos incluidos en el servicio
- Enfoque en entregables, características y servicios específicos
- Cada elemento debe ser claro y directo
- Formato: lista con viñetas simples (sin negrita ni markdown)
- NO usar **texto** ni formato markdown
- Estilo: ${styleDesc}
- CONTENIDO ÚNICO Y FRESCO (ID: ${uniqueId})

Genera SOLO la lista de elementos incluidos en formato de viñetas (- Elemento incluido), sin usar formato markdown.`,

      noIncluye: `Genera una lista de elementos NO incluidos en el siguiente servicio.

**Servicio:** ${tituloServicio}
**Categoría:** ${categoria}
**Descripción:** ${descripcionActual}
**Timestamp único:** ${uniqueTimestamp}

**Estilo requerido:** ${styleDesc}

**Requisitos:**
- 6-10 elementos que NO están incluidos en el servicio
- Ayuda a aclarar expectativas y evitar malentendidos
- Cada elemento debe ser específico
- Formato: lista con viñetas simples (sin negrita ni markdown)
- NO usar **texto** ni formato markdown
- Estilo: ${styleDesc}
- CONTENIDO ÚNICO Y FRESCO (ID: ${uniqueId})

Genera SOLO la lista de elementos NO incluidos en formato de viñetas (- Elemento no incluido), sin usar formato markdown.`,

      faq: `Genera una lista de preguntas frecuentes (FAQ) para el siguiente servicio.

**Servicio:** ${tituloServicio}
**Categoría:** ${categoria}
**Descripción:** ${descripcionActual}
**Timestamp único:** ${uniqueTimestamp}

**Estilo requerido:** ${styleDesc}

**Requisitos:**
- 5-8 preguntas frecuentes relevantes para el usuario final
- Cada pregunta con su respuesta clara y concisa
- Cubrir: qué incluye, cómo funciona, tiempo de entrega, precios, soporte
- NO usar **texto** ni formato markdown en las preguntas
- NO incluir secciones de 💡 RECOMENDACIÓN, 🔍 ANÁLISIS, o sugerencias internas
- Generar SOLO pares de Pregunta: Respuesta listos para mostrar al cliente
- Formato: ¿Pregunta? seguida de Respuesta en texto plano
- Estilo: ${styleDesc}
- CONTENIDO ÚNICO Y FRESCO (ID: ${uniqueId})

Genera únicamente las preguntas con sus respuestas en formato limpio, sin análisis ni recomendaciones.`,

      seo: `Genera contenido SEO SIMPLE y DIRECTO para el siguiente servicio.

**Servicio:** ${tituloServicio}
**Categoría:** ${categoria}
**Descripción:** ${descripcionActual}
**Timestamp único:** ${uniqueTimestamp}

**IMPORTANTE: Responde SOLO con un JSON válido con la siguiente estructura:**
{
  "titulo": "Título SEO simple y directo (máximo 40-50 caracteres)",
  "descripcion": "Meta descripción profesional y concisa (máximo 120-140 caracteres)",
  "palabrasClave": ["palabra1", "palabra2", "palabra3", "palabra4", "palabra5"]
}

**REQUISITOS PARA TÍTULO SIMPLE:**
- Formato SIMPLE: "[Servicio] | [Beneficio Principal]"
- Ejemplos: "Contabilidad | Garantía Resultados", "Marketing | Crecimiento Asegurado"
- Máximo 45 caracteres (más corto que antes)
- Directo y comercial, sin palabras complejas

**REQUISITOS PARA DESCRIPCIÓN SIMPLE:**
- Una sola oración profesional y directa
- Incluir servicio + beneficio + garantía
- Ejemplo: "Servicio profesional con garantía de resultados. Atención personalizada, soporte especializado y procesos optimizados."
- Máximo 130 caracteres (más corto)

**REQUISITOS PARA PALABRAS CLAVE:**
- 5 palabras clave simples y relevantes
- Sin frases complejas, solo palabras individuales
- Ejemplo: ["consultoría", "contabilidad", "servicio", "profesional", "garantía"]

**Estilo:** Simple, profesional y directo (como la primera foto)
**ID único:** ${uniqueId}

Genera ÚNICAMENTE el JSON estructurado, sin explicaciones adicionales.`
    };

    const selectedTemplate = templates[contentType] || templates.full_description;
    
    return selectedTemplate;
  }

  /**
   * Actualizar métricas
   */
  updateMetrics(processingTime) {
    const total = this.metrics.servicesCreated + this.metrics.packagesCreated;
    this.metrics.averageTime = 
      (this.metrics.averageTime * (total - 1) + processingTime) / total;
  }

  /**
   * Obtener métricas
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * 🆕 Parsear respuesta SEO como JSON estructurado
   */
  parseSEOResponse(rawResponse, servicio) {
    try {
      logger.info('🔧 Parsing SEO response as structured JSON...');
      
      // Limpiar respuesta (remover markdown, espacios extra)
      let cleaned = rawResponse.trim();
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      cleaned = cleaned.replace(/^[^{]*({.*})[^}]*$/s, '$1'); // Extraer solo el JSON
      
      // Intentar parsear como JSON
      const parsed = JSON.parse(cleaned);
      
      // Validar estructura mínima
      if (!parsed.titulo || !parsed.descripcion || !parsed.palabrasClave) {
        throw new Error('SEO response missing required fields');
      }
      
      // ✅ CORRECCIÓN: Convertir palabrasClave a string si es array
      if (Array.isArray(parsed.palabrasClave)) {
        parsed.palabrasClave = parsed.palabrasClave.join(', ');
      } else if (typeof parsed.palabrasClave === 'string') {
        // Ya es string, mantener tal cual
        parsed.palabrasClave = parsed.palabrasClave.trim();
      }
      
      // ✅ Validar longitudes sin agregar puntos suspensivos forzados
      // El frontend se encarga del truncado inteligente
      if (parsed.titulo.length > 70) { // Límite más generoso
        // Truncar en el último espacio antes del límite
        const maxLength = 65;
        let truncated = parsed.titulo.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > maxLength * 0.8) {
          parsed.titulo = parsed.titulo.substring(0, lastSpace);
        } else {
          parsed.titulo = truncated;
        }
      }
      
      if (parsed.descripcion.length > 170) { // Límite más generoso
        // Truncar en el último espacio o punto antes del límite
        const maxLength = 160;
        let truncated = parsed.descripcion.substring(0, maxLength);
        const lastPeriod = truncated.lastIndexOf('.');
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastPeriod > maxLength * 0.7) {
          parsed.descripcion = parsed.descripcion.substring(0, lastPeriod + 1);
        } else if (lastSpace > maxLength * 0.8) {
          parsed.descripcion = parsed.descripcion.substring(0, lastSpace);
        } else {
          parsed.descripcion = truncated;
        }
      }
      
      logger.success('✅ SEO response parsed as structured JSON');
      return parsed;
      
    } catch (error) {
      logger.warn('⚠️ Could not parse SEO as JSON, creating fallback structure');
      
      // Fallback: crear estructura básica desde el texto
      const titulo = servicio.titulo.length > 60 
        ? servicio.titulo.substring(0, 57) + '...'
        : servicio.titulo;
        
      const descripcion = rawResponse.length > 160
        ? rawResponse.substring(0, 157) + '...'
        : rawResponse;
        
      const palabrasClave = this.extractKeywordsFromText(
        `${servicio.titulo} ${servicio.descripcion || ''} ${rawResponse}`,
        servicio.categoria?.nombre
      );
      
      return {
        titulo: titulo,
        descripcion: descripcion,
        palabrasClave: palabrasClave
      };
    }
  }

  /**
   * 🆕 Parsear respuesta FAQ como estructura organizada
   */
  parseFAQResponse(rawResponse) {
    try {
      logger.info('🔧 Parsing FAQ response...');
      
      const faqItems = [];
      const lines = rawResponse.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // 🆕 NUEVO: Formato con separador | (ej: "- ¿Pregunta? | Respuesta")
        if (trimmed.includes('|')) {
          const parts = trimmed.split('|');
          if (parts.length >= 2) {
            let pregunta = parts[0].trim();
            const respuesta = parts[1].trim();
            
            // Limpiar pregunta (remover - al inicio)
            pregunta = pregunta.replace(/^-\s*/, '');
            
            if (pregunta && respuesta) {
              faqItems.push({
                pregunta: pregunta,
                respuesta: respuesta
              });
              continue;
            }
          }
        }
        
        // FORMATO ORIGINAL: Detectar pregunta separada de respuesta
        if (trimmed.startsWith('¿') || trimmed.endsWith('?')) {
          // Buscar la siguiente línea como respuesta
          const questionIndex = lines.findIndex(l => l.trim() === trimmed);
          if (questionIndex !== -1 && questionIndex + 1 < lines.length) {
            const nextLine = lines[questionIndex + 1];
            if (nextLine && nextLine.trim()) {
              faqItems.push({
                pregunta: trimmed,
                respuesta: nextLine.trim()
              });
            }
          }
        }
      }
      
      logger.success(`✅ FAQ parsed: ${faqItems.length} items`);
      return faqItems;
      
    } catch (error) {
      logger.warn('⚠️ Could not parse FAQ, returning raw text');
      return rawResponse;
    }
  }

  /**
   * 🆕 Parsear respuesta SEO como JSON estructurado
   */
  parseSEOResponse(rawResponse, servicio = null) {
    try {
      logger.info('🔧 Parsing SEO response as structured JSON...');
      
      // Limpiar respuesta (remover markdown, espacios extra)
      let cleaned = rawResponse.trim();
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      cleaned = cleaned.replace(/^[^{]*({.*})[^}]*$/s, '$1'); // Extraer solo el JSON
      
      // Intentar parsear como JSON
      const parsed = JSON.parse(cleaned);
      
      // Validar estructura mínima
      if (!parsed.titulo || !parsed.descripcion || !parsed.palabrasClave) {
        throw new Error('SEO response missing required fields');
      }
      
      // ✅ CORRECCIÓN: Convertir palabrasClave a string si es array
      if (Array.isArray(parsed.palabrasClave)) {
        parsed.palabrasClave = parsed.palabrasClave.slice(0, 8).join(', ');
      } else if (typeof parsed.palabrasClave === 'string') {
        // Ya es string, mantener tal cual
        parsed.palabrasClave = parsed.palabrasClave.trim();
      }
      
      // ✅ Validar longitudes sin agregar puntos suspensivos forzados
      // El frontend se encarga del truncado inteligente
      if (parsed.titulo.length > 70) { // Límite más generoso
        // Truncar en el último espacio antes del límite
        const maxLength = 65;
        let truncated = parsed.titulo.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > maxLength * 0.8) {
          parsed.titulo = parsed.titulo.substring(0, lastSpace);
        } else {
          parsed.titulo = truncated;
        }
      }
      
      if (parsed.descripcion.length > 170) { // Límite más generoso
        // Truncar en el último espacio o punto antes del límite
        const maxLength = 160;
        let truncated = parsed.descripcion.substring(0, maxLength);
        const lastPeriod = truncated.lastIndexOf('.');
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastPeriod > maxLength * 0.7) {
          parsed.descripcion = parsed.descripcion.substring(0, lastPeriod + 1);
        } else if (lastSpace > maxLength * 0.8) {
          parsed.descripcion = parsed.descripcion.substring(0, lastSpace);
        } else {
          parsed.descripcion = truncated;
        }
      }
      
      logger.success('✅ SEO response parsed as structured JSON');
      return parsed;
      
    } catch (error) {
      logger.warn('⚠️ Could not parse SEO as JSON, using fallback structure');
      
      // Fallback: crear estructura básica desde el texto
      const titulo = servicio?.titulo && servicio.titulo.length <= 60 
        ? servicio.titulo
        : (servicio?.titulo?.substring(0, 57) + '...' || 'Servicio Profesional de Calidad');
        
      const descripcion = rawResponse.length > 160
        ? rawResponse.substring(0, 157) + '...'
        : (rawResponse.length > 20 ? rawResponse : 'Servicio profesional con garantía de resultados y atención personalizada.');
        
      const palabrasClave = servicio 
        ? this.extractKeywordsFromText(
            `${servicio.titulo} ${servicio.descripcion || ''} ${rawResponse}`,
            servicio.categoria?.nombre
          )
        : 'servicio, profesional, calidad, garantía, resultados';
      
      return {
        titulo: titulo,
        descripcion: descripcion,
        palabrasClave: palabrasClave
      };
    }
  }

  /**
   * 🆕 Extraer palabras clave del texto
   */
  extractKeywordsFromText(text, categoria) {
    const commonWords = ['de', 'la', 'el', 'en', 'con', 'por', 'para', 'un', 'una', 'del', 'los', 'las', 'y', 'o', 'a', 'se'];
    
    // Limpiar y dividir texto
    const words = text
      .toLowerCase()
      .replace(/[^\w\sáéíóúñ]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word));
    
    // Contar frecuencia
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    // Ordenar por frecuencia y tomar los top
    const keywords = Object.keys(frequency)
      .sort((a, b) => frequency[b] - frequency[a])
      .slice(0, 5);
    
    // Agregar categoría si no está incluida
    if (categoria && !keywords.includes(categoria.toLowerCase())) {
      keywords.unshift(categoria.toLowerCase());
    }
    
    // Devolver como string separado por comas para compatibilidad con DB
    return keywords.slice(0, 6).join(', '); // Máximo 6 palabras clave como string
  }

  /**
   * 🆕 Construir prompt masivo para generar múltiples tipos de contenido
   */
  /**
   * 🚀 Construir prompt UNIFICADO para todo el contenido del servicio
   * 🆕 VERSIÓN 2.0: Incluye secciones avanzadas
   */
  buildUnifiedServicePrompt(servicio, sectionsToGenerate, style) {
    const categoria = servicio.categoria?.nombre || 'Servicio';
    const titulo = servicio.titulo;
    const descripcion = servicio.descripcion || servicio.descripcionCorta || '';
    
    const sectionTemplates = {
      // Secciones básicas (arrays)
      'caracteristicas': '## CARACTERÍSTICAS PRINCIPALES\n- [Lista con viñetas de 5 características clave del servicio]',
      'beneficios': '## BENEFICIOS PRINCIPALES\n- [Lista con viñetas de 5 beneficios que obtiene el cliente]', 
      'incluye': '## QUÉ INCLUYE EL SERVICIO\n- [Lista detallada de 5-7 elementos incluidos]',
      'noIncluye': '## QUÉ NO INCLUYE EL SERVICIO\n- [Lista clara de 5 exclusiones o limitaciones]',
      'faq': '## PREGUNTAS FRECUENTES\n- ¿[Pregunta]? | [Respuesta completa]\n[Repetir formato 5 veces]',
      
      // 🆕 Secciones avanzadas (strings/objetos)
      'full_description': '## DESCRIPCIÓN COMPLETA\n[IMPORTANTE: Escribe MÍNIMO 1500-2000 caracteres (400-500 palabras). Descripción EXTENSA y muy detallada que incluya: 1) Introducción atractiva del servicio (200 palabras), 2) Análisis exhaustivo de características principales y beneficios específicos (200 palabras), 3) Descripción completa del proceso de trabajo paso a paso (150 palabras), 4) Ventajas competitivas y diferenciadores únicos (100 palabras), 5) Garantías, certificaciones y respaldos (50 palabras), 6) Llamado a la acción persuasivo y profesional (50 palabras). Texto envolvente, convincente y de alta calidad que demuestre valor excepcional.]',
      'short_description': '## CONTENIDO COMPLEMENTARIO\n[300-500 CARACTERES: Información técnica ESPECÍFICA, garantías concretas, certificaciones, metodología particular, o detalles únicos que complementen la descripción principal. Debe ser diferente y agregar valor específico. Texto directo, técnico y profesional.]',
      'seo': '## CONTENIDO SEO\n{"titulo": "[Título SIMPLE formato: Servicio | Beneficio - máximo 45 chars]", "descripcion": "[Meta descripción CONCISA - máximo 130 chars]", "palabrasClave": ["palabra1", "palabra2", "palabra3", "palabra4", "palabra5"]}'
    };

    const requestedSections = sectionsToGenerate.map(section => sectionTemplates[section]).filter(Boolean);
    
    const styleInstructions = {
      'formal': 'profesional, técnico y estructurado',
      'casual': 'cercano, amigable y conversacional',
      'technical': 'detallado, específico y orientado a expertos'
    };

    return `GENERAR CONTENIDO PROFESIONAL EXTENSO PARA SERVICIO:

📋 **INFORMACIÓN DEL SERVICIO:**
• Título: "${titulo}"
• Categoría: ${categoria}  
• Descripción base: ${descripcion}

🎯 **SECCIONES A GENERAR (RESPETAR FORMATO EXACTO):**

${requestedSections.join('\n\n')}

🚨 **INSTRUCCIONES OBLIGATORIAS - CUMPLIR ESTRICTAMENTE:**
• Estilo: ${styleInstructions[style] || styleInstructions.formal}
• Especializado para servicios de ${categoria}
• **CRÍTICO: LÍMITES DE CARACTERES OBLIGATORIOS:**
  - **DESCRIPCIÓN COMPLETA: MÍNIMO 1500-2000 caracteres (MUY EXTENSO)**
  - CONTENIDO COMPLEMENTARIO: 300-500 caracteres exacto
  - Título SEO: MÁXIMO 45 caracteres
  - Descripción SEO: MÁXIMO 130 caracteres
• **DIFERENCIACIÓN OBLIGATORIA:**
  - **Descripción Completa (1500+ chars)**: Historia completa del servicio, análisis detallado de beneficios, propuesta de valor extensa, proceso paso a paso, diferenciadores únicos, garantías y llamado a la acción convincente
  - **Contenido Complementario (300-500 chars)**: Solo información técnica específica, certificaciones, metodología o requisitos operativos
• USAR EXACTAMENTE formato ## para separar secciones
• Para FAQ: "- ¿Pregunta? | Respuesta"
• Para SEO: JSON válido únicamente
• **ATENCIÓN: DESCRIPCIÓN COMPLETA DEBE SER REALMENTE EXTENSA (MÍNIMO 1500 CARACTERES)**

🔥 **GENERAR CONTENIDO AHORA - RESPETANDO LÍMITES DE CARACTERES:**`;
  }

  /**
   * 🚀 Parsear respuesta unificada del servicio completo
   * 🆕 VERSIÓN 2.0: Incluye parsing de secciones avanzadas
   */
  parseUnifiedServiceResponse(rawContent, sectionsRequested, servicio = null) {
    const parsedContent = {};
    
    try {
      // Dividir por secciones usando los headers ##
      const sections = rawContent.split(/##\s*([^#\n]+)/);
      
      for (let i = 1; i < sections.length; i += 2) {
        const sectionTitle = sections[i]?.trim().toLowerCase();
        const sectionContent = sections[i + 1]?.trim();
        
        if (!sectionContent) continue;

        // Mapear títulos a nombres de campo en la base de datos
        if (sectionTitle.includes('características')) {
          parsedContent.caracteristicas = this.parseArrayResponse(sectionContent);
          logger.success(`✅ Parsed características: ${parsedContent.caracteristicas?.length || 0} items`);
        } else if (sectionTitle.includes('beneficios')) {
          parsedContent.beneficios = this.parseArrayResponse(sectionContent);
          logger.success(`✅ Parsed beneficios: ${parsedContent.beneficios?.length || 0} items`);
        } else if (sectionTitle.includes('incluye') && !sectionTitle.includes('no incluye')) {
          parsedContent.incluye = this.parseArrayResponse(sectionContent);
          logger.success(`✅ Parsed incluye: ${parsedContent.incluye?.length || 0} items`);
        } else if (sectionTitle.includes('no incluye')) {
          parsedContent.noIncluye = this.parseArrayResponse(sectionContent);
          logger.success(`✅ Parsed noIncluye: ${parsedContent.noIncluye?.length || 0} items`);
        } else if (sectionTitle.includes('preguntas') || sectionTitle.includes('faq')) {
          parsedContent.faq = this.parseFAQResponse(sectionContent);
          logger.success(`✅ Parsed FAQ: ${parsedContent.faq?.length || 0} items`);
        }
        // Parsing de secciones avanzadas
        else if (sectionTitle.includes('descripción completa') || sectionTitle.includes('descripcion completa')) {
          parsedContent.full_description = this.parseStringResponse(sectionContent, 5000); // Límite MÁXIMO para descripcionRica
          logger.success(`✅ Parsed descripción completa: ${parsedContent.full_description?.length || 0} chars`);
        } else if (sectionTitle.includes('contenido complementario') || sectionTitle.includes('complementario') || sectionTitle.includes('contenido adicional')) {
          // contenidoAdicional puede tener hasta 2000 caracteres
          parsedContent.short_description = this.parseStringResponse(sectionContent, 2000);
          logger.success(`✅ Parsed contenido complementario: ${parsedContent.short_description?.length || 0} chars`);
        } else if (sectionTitle.includes('seo') || sectionTitle.includes('contenido seo')) {
          // Pasar servicio al parser SEO
          parsedContent.seo = this.parseSEOResponse(sectionContent, servicio);
          logger.success(`✅ Parsed SEO: titulo="${parsedContent.seo?.titulo?.substring(0,30)}..."`);
        } else {
          // Sección no reconocida, continúa con la siguiente
          continue;
        }
      }

      // Validar que se generaron las secciones solicitadas
      const generatedSections = Object.keys(parsedContent);
      const missingSections = sectionsRequested.filter(section => !generatedSections.includes(section));
      
      if (missingSections.length > 0) {
        logger.warn(`⚠️ [UNIFIED] Missing sections: ${missingSections.join(', ')}`);
        // Generar contenido mínimo para secciones faltantes
        this.fillMissingSections(parsedContent, missingSections, servicio);
      }

      logger.info(`✅ [UNIFIED] Parsed ${generatedSections.length} sections successfully`);
      return parsedContent;

    } catch (error) {
      logger.error(`❌ [UNIFIED] Error parsing unified response:`, error);
      // Fallback: intentar parsear sección por sección
      return this.parseUnifiedFallback(rawContent, sectionsRequested, servicio);
    }
  }

  /**
   * 🔄 Fallback parser para respuestas unificadas problemáticas
   */
  parseUnifiedFallback(rawContent, sectionsRequested, servicio = null) {
    logger.info(`🔄 [UNIFIED] Using fallback parser`);
    
    const fallbackContent = {};
    
    // Generar contenido básico para cada sección solicitada
    for (const section of sectionsRequested) {
      switch (section) {
        case 'caracteristicas':
          fallbackContent.caracteristicas = [
            'Servicio profesional de alta calidad',
            'Atención personalizada dedicada', 
            'Garantía de satisfacción incluida',
            'Soporte técnico especializado',
            'Resultados medibles y verificables'
          ];
          break;
        case 'beneficios':
          fallbackContent.beneficios = [
            'Mejora significativa en resultados',
            'Ahorro de tiempo y recursos',
            'Incremento en productividad',
            'Mayor competitividad en el mercado',
            'Retorno de inversión garantizado'
          ];
          break;
        case 'incluye':
          fallbackContent.incluye = [
            'Consultoría inicial especializada',
            'Análisis detallado de necesidades',
            'Desarrollo completo del proyecto',
            'Soporte durante la implementación',
            'Seguimiento y optimización posterior'
          ];
          break;
        case 'noIncluye':
          fallbackContent.noIncluye = [
            'Servicios adicionales no especificados',
            'Cambios fuera del alcance acordado',
            'Recursos de terceros no incluidos',
            'Mantenimiento posterior al período establecido',
            'Modificaciones no contempladas inicialmente'
          ];
          break;
        case 'faq':
          fallbackContent.faq = [
            { pregunta: '¿Cuánto tiempo toma completar el servicio?', respuesta: 'El tiempo varía según el alcance, generalmente entre 2-4 semanas.' },
            { pregunta: '¿Incluye revisiones del trabajo?', respuesta: 'Sí, incluimos hasta 3 rondas de revisiones sin costo adicional.' },
            { pregunta: '¿Qué garantías ofrecen?', respuesta: 'Garantizamos la calidad del trabajo y satisfacción del cliente.' },
            { pregunta: '¿Cómo es el proceso de trabajo?', respuesta: 'Iniciamos con consulta, seguimos con desarrollo y finalizamos con entrega.' },
            { pregunta: '¿Qué formas de pago aceptan?', respuesta: 'Aceptamos transferencias, tarjetas y pagos fraccionados.' }
          ];
          break;
      }
    }
    
    return fallbackContent;
  }

  /**
   * 🔧 Rellenar secciones faltantes con contenido básico
   * 🆕 VERSIÓN 2.0: Incluye secciones avanzadas
   */
  fillMissingSections(parsedContent, missingSections, servicio = null) {
    for (const section of missingSections) {
      switch (section) {
        case 'caracteristicas':
          parsedContent.caracteristicas = [
            'Servicio profesional de alta calidad',
            'Atención personalizada dedicada', 
            'Garantía de satisfacción incluida',
            'Soporte técnico especializado',
            'Resultados medibles y verificables'
          ];
          break;
          
        case 'beneficios':
          parsedContent.beneficios = [
            'Ahorro de tiempo considerable',
            'Mejores resultados garantizados',
            'Proceso optimizado y eficiente',
            'Soporte continuo incluido',
            'Retorno de inversión comprobado'
          ];
          break;
          
        case 'incluye':
          parsedContent.incluye = [
            'Consultoría inicial personalizada',
            'Análisis detallado de requerimientos',
            'Implementación profesional completa',
            'Documentación técnica especializada',
            'Soporte post-implementación'
          ];
          break;
          
        case 'noIncluye':
          parsedContent.noIncluye = [
            'Servicios externos de terceros',
            'Hardware o equipamiento físico',
            'Licencias de software especializado',
            'Servicios fuera del alcance inicial',
            'Mantenimiento más allá del período incluido'
          ];
          break;
          
        case 'faq':
          parsedContent.faq = [
            { pregunta: '¿Cuánto tiempo toma la implementación?', respuesta: 'El tiempo depende de la complejidad, típicamente entre 2-4 semanas.' },
            { pregunta: '¿Qué garantías ofrecen?', respuesta: 'Garantía de satisfacción del 100% y soporte por 90 días.' },
            { pregunta: '¿Incluye capacitación del equipo?', respuesta: 'Sí, incluimos capacitación completa para todo el equipo.' },
            { pregunta: '¿Se pueden hacer modificaciones?', respuesta: 'Sí, permitimos ajustes durante la implementación.' },
            { pregunta: '¿Qué soporte post-venta ofrecen?', respuesta: 'Soporte técnico especializado por 3 meses incluido.' }
          ];
          break;
          
        // 🆕 Secciones avanzadas
        case 'full_description':
          parsedContent.full_description = 'Servicio profesional integral diseñado para proporcionar soluciones efectivas y confiables. Nuestro enfoque especializado garantiza la máxima calidad y satisfacción del cliente. Contamos con un equipo de expertos dedicados a entregar resultados excepcionales en cada proyecto, utilizando las mejores prácticas de la industria y tecnologías de vanguardia. Ofrecemos atención personalizada, procesos optimizados y soporte continuo para asegurar el éxito de su inversión.';
          break;
          
        case 'short_description':
          // Generar contenido que respete el límite de caracteres
          const serviceName = servicio?.titulo || 'Servicio';
          const category = servicio?.categoria?.nombre || 'servicios';
          parsedContent.short_description = `Servicio profesional de ${category.toLowerCase()} con garantía. Atención personalizada y resultados garantizados.`;
          break;
          
        case 'seo':
          // Usar datos del servicio si están disponibles
          const titulo = servicio?.titulo || 'Servicio Profesional';
          const categoria = servicio?.categoria?.nombre || 'Servicios';
          
          // Generar título simple: "Servicio | Beneficio" (máximo 45 chars)
          const tituloSimple = titulo.length > 25 
            ? `${titulo.substring(0, 22)}...` 
            : titulo;
          
          parsedContent.seo = {
            titulo: `${tituloSimple} | Garantía Resultados`,
            descripcion: `Servicio profesional con garantía de resultados. Atención personalizada, soporte especializado y procesos optimizados.`,
            palabrasClave: `${categoria.toLowerCase()}, servicio, profesional, garantía, resultados` // ✅ String separado por comas
          };
          break;
      }
      
      logger.info(`🔧 [UNIFIED] Added fallback content for ${section}`);
    }
  }

  buildBulkContentPrompt(servicio, contentTypes, style) {
    const categoria = servicio.categoria?.nombre || 'Servicio';
    const titulo = servicio.titulo;
    const descripcion = servicio.descripcion || '';

    const sections = {
      'incluye': '**QUÉ INCLUYE EL SERVICIO** (5 items con viñetas)',
      'noIncluye': '**QUÉ NO INCLUYE EL SERVICIO** (5 items con viñetas)',
      'faq': '**PREGUNTAS FRECUENTES** (3 preguntas con formato "- ¿Pregunta? | Respuesta")'
    };

    const requestedSections = contentTypes.map(type => sections[type]).filter(Boolean);

    return `Genera contenido completo para el servicio "${titulo}" (categoría: ${categoria}).

DESCRIPCIÓN DEL SERVICIO:
${descripcion}

GENERA EXACTAMENTE estas secciones:

${requestedSections.join('\n')}

REGLAS:
- Usa listas con viñetas (-) para incluye/noIncluye
- Para FAQ usa formato "- ¿Pregunta? | Respuesta"
- Contenido específico para ${categoria}
- Estilo: ${style}
- No agregues explicaciones extra
- Separa cada sección claramente`;
  }

  /**
   * 🆕 Parsear respuesta masiva y distribuir contenido por tipo
   */
  parseBulkContentResponse(rawContent, contentTypes) {
    const distributedContent = {};
    const sections = rawContent.split(/\*\*[^*]+\*\*/);

    // Procesar cada sección
    for (let i = 0; i < contentTypes.length && i + 1 < sections.length; i++) {
      const contentType = contentTypes[i];
      const sectionContent = sections[i + 1]?.trim();

      if (sectionContent) {
        if (contentType === 'faq') {
          // Usar el parser específico de FAQ
          distributedContent[contentType] = this.parseFAQResponse(sectionContent);
        } else {
          // Para incluye/noIncluye, usar el parser de arrays
          distributedContent[contentType] = this.parseArrayResponse(sectionContent);
        }
      }
    }

    return distributedContent;
  }

  /**
   * 🆕 Seleccionar modelo más económico según tipo de contenido
   */
  selectEconomicModel(contentType) {
    const economicMapping = {
      // Contenido simple - modelo más barato
      'title': 'gpt-3.5-turbo',
      'short_description': 'gpt-3.5-turbo',
      'simple_features': 'gpt-3.5-turbo',
      
      // Contenido estándar - balance precio/calidad
      'description': 'gpt-3.5-turbo',
      'features': 'gpt-3.5-turbo',
      'benefits': 'gpt-3.5-turbo',
      'faq': 'gpt-3.5-turbo',
      
      // Contenido complejo - modelo mejor pero aún económico
      'bulk_content_generation': 'gpt-4o-mini',
      'unified_service': 'gpt-4o-mini',
      'seo': 'gpt-4o-mini',
      
      // Por defecto
      'default': 'gpt-3.5-turbo'
    };

    return economicMapping[contentType] || economicMapping.default;
  }

  /**
   * 🆕 Calcular tokens óptimos según tipo para minimizar costos
   */
  getOptimalTokensForType(contentType) {
    const tokenMapping = {
      'title': 50,                    // Títulos cortos
      'short_description': 150,       // Descripciones breves  
      'description': 400,             // Descripciones normales
      'features': 300,                // Lista de características
      'benefits': 300,                // Lista de beneficios
      'faq': 500,                     // FAQ más extensa
      'seo': 200,                     // SEO estructurado
      'bulk_content_generation': 1200, // Contenido masivo
      'unified_service': 1500,        // Servicio completo
      'default': 800                  // Por defecto
    };

    const tokens = tokenMapping[contentType] || tokenMapping.default;
    logger.info(`🎯 [TOKEN_OPT] ${contentType}: ${tokens} tokens (optimized for cost)`);
    
    return tokens;
  }

  /**
   * 🆕 Parser simple para contenido de string (descripción completa, complementaria)
   */
  parseStringResponse(rawContent, maxLength = null) {
    if (!rawContent || typeof rawContent !== 'string') {
      logger.warn('⚠️ parseStringResponse: Invalid content provided');
      return '';
    }
    
    // Limpiar el contenido de cualquier formato markdown o caracteres especiales
    let cleanContent = rawContent
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remover bold markdown
      .replace(/\*(.*?)\*/g, '$1')     // Remover italic markdown  
      .replace(/#{1,6}\s*/g, '')       // Remover headers markdown
      .replace(/^\s*[-•]\s*/gm, '')    // Remover viñetas al inicio de línea
      .replace(/\n\s*\n/g, '\n')       // Consolidar líneas vacías múltiples
      .trim();
    
    // 🔥 NUEVO: Truncar inteligentemente si excede el límite
    if (maxLength && cleanContent.length > maxLength) {
      logger.warn(`⚠️ parseStringResponse: Content too long (${cleanContent.length}/${maxLength} chars), truncating...`);
      
      // Truncar en el último punto o espacio antes del límite
      let truncated = cleanContent.substring(0, maxLength - 3); // -3 para los "..."
      const lastPeriod = truncated.lastIndexOf('.');
      const lastSpace = truncated.lastIndexOf(' ');
      
      if (lastPeriod > maxLength * 0.7) {
        // Si hay un punto relativamente cerca, truncar ahí
        cleanContent = cleanContent.substring(0, lastPeriod + 1);
      } else if (lastSpace > maxLength * 0.8) {
        // Si no hay punto, truncar en el último espacio
        cleanContent = cleanContent.substring(0, lastSpace) + '...';
      } else {
        // Último recurso: truncar exacto
        cleanContent = truncated + '...';
      }
      
      logger.info(`✅ parseStringResponse: Truncated to ${cleanContent.length} characters`);
    }
    
    // Validar longitud mínima
    if (cleanContent.length < 50) {
      logger.warn(`⚠️ parseStringResponse: Content too short (${cleanContent.length} chars)`);
      return cleanContent;
    }
    
    logger.info(`✅ parseStringResponse: Processed ${cleanContent.length} characters`);
    return cleanContent;
  }
}

export default ServicesGenerator;
