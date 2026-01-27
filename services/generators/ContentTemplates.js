/**
 * ContentTemplates.js - Plantillas estáticas para generación de contenido
 * Este archivo contiene todas las plantillas predefinidas para generar contenido de servicios
 * sin necesidad de llamadas a APIs externas como OpenAI.
 */

class ContentTemplates {
    constructor() {
        this.serviceTemplates = {
            desarrollo: {
                description: "Desarrollamos soluciones tecnológicas personalizadas que impulsan el crecimiento de tu negocio. Nuestro equipo especializado crea aplicaciones web, móviles y sistemas empresariales con tecnologías de vanguardia.",
                benefits: [
                    "Desarrollo personalizado según tus necesidades específicas",
                    "Tecnologías modernas y actualizadas",
                    "Soporte técnico continuo",
                    "Escalabilidad y rendimiento optimizado",
                    "Integración con sistemas existentes"
                ],
                features: [
                    "Aplicaciones web responsivas",
                    "Desarrollo móvil nativo y híbrido", 
                    "APIs y microservicios",
                    "Bases de datos optimizadas",
                    "Sistemas de gestión empresarial"
                ]
            },
            marketing: {
                description: "Estrategias de marketing digital que conectan tu marca con tu audiencia objetivo. Creamos campañas efectivas que generan resultados medibles y aumentan tu presencia online.",
                benefits: [
                    "Aumento de visibilidad online",
                    "Mayor engagement con tu audiencia",
                    "ROI medible y transparente",
                    "Estrategias personalizadas",
                    "Análisis detallado de resultados"
                ],
                features: [
                    "Marketing en redes sociales",
                    "Publicidad digital (Google Ads, Facebook Ads)",
                    "Email marketing automatizado",
                    "Análisis de métricas y KPIs",
                    "Estrategias de contenido"
                ]
            },
            diseno: {
                description: "Diseño visual que comunica la esencia de tu marca de manera efectiva. Creamos identidades visuales memorables y experiencias de usuario que conectan emocionalmente con tu audiencia.",
                benefits: [
                    "Identidad visual coherente y profesional",
                    "Mayor reconocimiento de marca",
                    "Experiencia de usuario optimizada",
                    "Diseños adaptables a múltiples formatos",
                    "Diferenciación en el mercado"
                ],
                features: [
                    "Diseño de logotipos e identidad corporativa",
                    "Diseño web y UX/UI",
                    "Material publicitario",
                    "Packaging y etiquetado",
                    "Ilustraciones personalizadas"
                ]
            },
            consultoria: {
                description: "Consultoría estratégica que optimiza tus procesos y acelera el crecimiento de tu empresa. Nuestros expertos analizan tu negocio y proponen soluciones prácticas y efectivas.",
                benefits: [
                    "Análisis profundo de tu negocio",
                    "Estrategias basadas en datos",
                    "Implementación práctica",
                    "Mejora de eficiencia operativa",
                    "Acompañamiento en la transformación"
                ],
                features: [
                    "Análisis de procesos empresariales",
                    "Planificación estratégica",
                    "Optimización de recursos",
                    "Gestión del cambio",
                    "Capacitación del equipo"
                ]
            }
        };

        this.genericContent = {
            description: "Servicio profesional diseñado para impulsar el éxito de tu negocio. Nuestro equipo de expertos trabaja contigo para crear soluciones personalizadas que generen resultados excepcionales.",
            benefits: [
                "Soluciones personalizadas para tu negocio",
                "Equipo de profesionales especializados",
                "Resultados medibles y transparentes",
                "Soporte continuo y seguimiento",
                "Tecnología de vanguardia"
            ],
            features: [
                "Análisis inicial completo",
                "Estrategia personalizada",
                "Implementación profesional",
                "Seguimiento y optimización",
                "Reportes detallados"
            ]
        };
    }

    /**
     * Genera contenido basado en el tipo de servicio
     */
    getContentByType(serviceType, serviceName = '') {
        const type = this.detectServiceType(serviceType, serviceName);
        const template = this.serviceTemplates[type] || this.genericContent;
        
        return {
            description: this.personalizeContent(template.description, serviceName),
            benefits: template.benefits.map(benefit => this.personalizeContent(benefit, serviceName)),
            features: template.features.map(feature => this.personalizeContent(feature, serviceName)),
            type: type
        };
    }

    /**
     * Detecta el tipo de servicio basado en palabras clave
     */
    detectServiceType(serviceType, serviceName) {
        const text = `${serviceType} ${serviceName}`.toLowerCase();
        
        if (text.includes('desarrollo') || text.includes('programacion') || text.includes('software') || text.includes('aplicacion') || text.includes('web') || text.includes('movil')) {
            return 'desarrollo';
        }
        
        if (text.includes('marketing') || text.includes('publicidad') || text.includes('social') || text.includes('digital') || text.includes('seo') || text.includes('ads')) {
            return 'marketing';
        }
        
        if (text.includes('diseño') || text.includes('diseno') || text.includes('grafico') || text.includes('logo') || text.includes('imagen') || text.includes('visual')) {
            return 'diseno';
        }
        
        if (text.includes('consultoria') || text.includes('consulta') || text.includes('asesoria') || text.includes('estrategia') || text.includes('analisis')) {
            return 'consultoria';
        }
        
        return 'generic';
    }

    /**
     * Personaliza el contenido con el nombre del servicio
     */
    personalizeContent(content, serviceName) {
        if (!serviceName) return content;
        
        // Si el contenido ya menciona el servicio específico, no lo modificamos
        if (content.toLowerCase().includes(serviceName.toLowerCase())) {
            return content;
        }
        
        // Para descripciones, añadimos el nombre del servicio de manera natural
        if (content.includes('Desarrollamos') || content.includes('Estrategias') || content.includes('Diseño') || content.includes('Consultoría')) {
            return content.replace(/^(\w+)/, `$1 de ${serviceName}`);
        }
        
        return content;
    }

    /**
     * Genera contenido completo con estructura estándar
     */
    generateCompleteContent(serviceData) {
        const { tipo, nombre, categoria } = serviceData;
        const content = this.getContentByType(tipo, nombre);
        
        return {
            descripcion: content.description,
            beneficios: content.benefits.slice(0, 3), // Limitamos a 3 beneficios principales
            caracteristicas: content.features.slice(0, 4), // Limitamos a 4 características principales
            contenidoCompleto: this.buildFullContent(content, nombre),
            metaData: {
                generatedAt: new Date().toISOString(),
                method: 'template-based',
                serviceType: content.type,
                hasCustomization: !!nombre
            }
        };
    }

    /**
     * Construye contenido completo estructurado
     */
    buildFullContent(content, serviceName) {
        return {
            introduccion: content.description,
            beneficiosPrincipales: content.benefits,
            caracteristicasClave: content.features,
            conclusion: this.generateConclusion(serviceName),
            llamadaAccion: "¡Contáctanos hoy para comenzar a transformar tu negocio!"
        };
    }

    /**
     * Genera una conclusión personalizada
     */
    generateConclusion(serviceName) {
        if (serviceName) {
            return `Nuestro servicio de ${serviceName} está diseñado para llevarte al siguiente nivel. Trabajamos contigo para asegurar que cada detalle esté perfectamente alineado con tus objetivos de negocio.`;
        }
        
        return "Nuestros servicios están diseñados para llevarte al siguiente nivel. Trabajamos contigo para asegurar que cada detalle esté perfectamente alineado con tus objetivos de negocio.";
    }

    /**
     * Obtiene plantillas por categoría
     */
    getTemplatesByCategory(categoria) {
        if (categoria && this.serviceTemplates[categoria.toLowerCase()]) {
            return this.serviceTemplates[categoria.toLowerCase()];
        }
        return this.genericContent;
    }
}

export default ContentTemplates;