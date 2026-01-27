/**
 * ContentFallbackGenerator.js - Generador de contenido usando solo plantillas
 * Este archivo genera contenido de alta calidad sin realizar llamadas a OpenAI
 * o cualquier API externa, eliminando completamente los errores 429.
 */

import ContentTemplates from './ContentTemplates.js';
import ContentValidator from './ContentValidator.js';

class ContentFallbackGenerator {
    constructor() {
        this.templates = new ContentTemplates();
        this.validator = new ContentValidator();
        this.generationStats = {
            totalGenerated: 0,
            successfulGenerations: 0,
            validationErrors: 0
        };
    }

    /**
     * Genera contenido completo para un servicio sin usar OpenAI
     */
    async generateServiceContent(serviceData) {
        try {
            console.log('🔄 Generando contenido usando plantillas fallback...');
            
            // Incrementar estadísticas
            this.generationStats.totalGenerated++;

            // Extraer datos del servicio
            const { nombre, tipo, categoria, descripcionActual } = serviceData;

            // Generar contenido base usando plantillas
            const baseContent = this.templates.generateCompleteContent({
                nombre: nombre || '',
                tipo: tipo || categoria || '',
                categoria: categoria || tipo || ''
            });

            // Mejorar el contenido si ya existe una descripción
            const enhancedContent = this.enhanceWithExistingContent(baseContent, descripcionActual);

            // Estructurar el resultado final
            const finalContent = this.structureFinalContent(enhancedContent, serviceData);

            // Validar el contenido generado
            const validation = this.validator.validateServiceContent(finalContent);
            
            if (validation.isValid) {
                this.generationStats.successfulGenerations++;
                console.log('✅ Contenido generado exitosamente con plantillas');
                console.log(`📊 Puntuación de calidad: ${validation.score}/100`);
                
                return {
                    success: true,
                    content: finalContent,
                    validation: validation,
                    metadata: {
                        method: 'template-fallback',
                        generatedAt: new Date().toISOString(),
                        qualityScore: validation.score,
                        sourceTemplate: baseContent.metaData.serviceType
                    }
                };
            } else {
                this.generationStats.validationErrors++;
                console.warn('⚠️ Contenido generado pero con errores de validación:', validation.errors);
                
                // Intentar corregir errores automáticamente
                const correctedContent = this.autoCorrectContent(finalContent, validation.errors);
                
                return {
                    success: true,
                    content: correctedContent,
                    validation: validation,
                    metadata: {
                        method: 'template-fallback-corrected',
                        generatedAt: new Date().toISOString(),
                        originalErrors: validation.errors,
                        qualityScore: validation.score
                    }
                };
            }

        } catch (error) {
            console.error('❌ Error generando contenido con plantillas:', error.message);
            
            return {
                success: false,
                error: error.message,
                fallbackContent: this.getEmergencyContent(),
                metadata: {
                    method: 'emergency-fallback',
                    generatedAt: new Date().toISOString(),
                    error: error.message
                }
            };
        }
    }

    /**
     * Mejora el contenido base con información existente
     */
    enhanceWithExistingContent(baseContent, existingDescription) {
        if (!existingDescription || existingDescription.trim().length < 20) {
            return baseContent;
        }

        // Combinar descripción existente con plantillas
        const enhanced = { ...baseContent };
        
        // Si la descripción existente es buena, la priorizamos
        if (existingDescription.length >= 50 && existingDescription.length <= 300) {
            enhanced.descripcion = this.improveDescription(existingDescription, baseContent.descripcion);
        }

        return enhanced;
    }

    /**
     * Mejora una descripción existente
     */
    improveDescription(existing, template) {
        // Si la descripción existente ya es buena, la mantenemos
        if (existing.length >= 100 && this.isGoodDescription(existing)) {
            return existing;
        }

        // Combinar lo mejor de ambas
        return existing.length > template.length ? existing : template;
    }

    /**
     * Verifica si una descripción es de buena calidad
     */
    isGoodDescription(description) {
        return description.includes('.') && 
               description.length >= 50 && 
               !this.hasLowQualityWords(description);
    }

    /**
     * Detecta palabras de baja calidad
     */
    hasLowQualityWords(text) {
        const lowQualityWords = ['lorem', 'ipsum', 'placeholder', 'ejemplo', 'test'];
        const textLower = text.toLowerCase();
        return lowQualityWords.some(word => textLower.includes(word));
    }

    /**
     * Estructura el contenido final según el formato esperado
     */
    structureFinalContent(content, serviceData) {
        return {
            descripcion: content.descripcion,
            beneficios: content.beneficios,
            caracteristicas: content.caracteristicas,
            contenidoCompleto: content.contenidoCompleto,
            
            // Campos adicionales para compatibilidad
            titulo: serviceData.nombre || 'Servicio Profesional',
            categoria: serviceData.categoria || 'General',
            tipo: serviceData.tipo || 'Servicio',
            
            // Metadatos del contenido
            metadata: {
                ...content.metaData,
                originalServiceData: {
                    nombre: serviceData.nombre,
                    categoria: serviceData.categoria,
                    tipo: serviceData.tipo
                }
            }
        };
    }

    /**
     * Corrige automáticamente errores comunes en el contenido
     */
    autoCorrectContent(content, errors) {
        const corrected = { ...content };

        errors.forEach(error => {
            if (error.includes('descripción es muy corta')) {
                corrected.descripcion = this.expandDescription(corrected.descripcion);
            }
            
            if (error.includes('al menos un beneficio')) {
                corrected.beneficios = this.getDefaultBenefits();
            }
            
            if (error.includes('al menos una característica')) {
                corrected.caracteristicas = this.getDefaultFeatures();
            }
        });

        return corrected;
    }

    /**
     * Expande una descripción corta
     */
    expandDescription(description) {
        if (!description || description.length < 50) {
            return this.templates.genericContent.description;
        }
        
        return description + ' Nuestro equipo especializado garantiza resultados excepcionales y un servicio personalizado que supera las expectativas.';
    }

    /**
     * Obtiene beneficios por defecto
     */
    getDefaultBenefits() {
        return [
            'Servicio personalizado y profesional',
            'Resultados medibles y garantizados',
            'Soporte continuo y seguimiento'
        ];
    }

    /**
     * Obtiene características por defecto
     */
    getDefaultFeatures() {
        return [
            'Análisis inicial detallado',
            'Implementación profesional',
            'Seguimiento y optimización',
            'Reportes y métricas'
        ];
    }

    /**
     * Contenido de emergencia para casos críticos
     */
    getEmergencyContent() {
        return {
            descripcion: 'Servicio profesional diseñado para impulsar el crecimiento de tu negocio con soluciones personalizadas y resultados excepcionales.',
            beneficios: this.getDefaultBenefits(),
            caracteristicas: this.getDefaultFeatures(),
            contenidoCompleto: {
                introduccion: 'Servicio profesional diseñado para impulsar el crecimiento de tu negocio.',
                beneficiosPrincipales: this.getDefaultBenefits(),
                caracteristicasClave: this.getDefaultFeatures(),
                conclusion: 'Nuestro servicio está diseñado para llevarte al siguiente nivel.',
                llamadaAccion: '¡Contáctanos hoy para comenzar!'
            },
            metadata: {
                method: 'emergency-content',
                generatedAt: new Date().toISOString(),
                isEmergency: true
            }
        };
    }

    /**
     * Genera múltiples variaciones de contenido
     */
    async generateContentVariations(serviceData, variationsCount = 3) {
        const variations = [];
        
        for (let i = 0; i < variationsCount; i++) {
            try {
                // Generar contenido base
                const baseResult = await this.generateServiceContent(serviceData);
                
                if (baseResult.success) {
                    // Crear variación modificando algunos elementos
                    const variation = this.createContentVariation(baseResult.content, i);
                    variations.push({
                        id: i + 1,
                        content: variation,
                        qualityScore: baseResult.validation.score || 75
                    });
                }
            } catch (error) {
                console.warn(`Error generando variación ${i + 1}:`, error.message);
            }
        }

        return variations.length > 0 ? variations : [this.getEmergencyContent()];
    }

    /**
     * Crea una variación del contenido
     */
    createContentVariation(baseContent, variationIndex) {
        const variation = { ...baseContent };
        
        // Modificar ligeramente los beneficios y características
        if (variation.beneficios && variation.beneficios.length > 0) {
            variation.beneficios = this.shuffleArray([...variation.beneficios]);
        }
        
        if (variation.caracteristicas && variation.caracteristicas.length > 0) {
            variation.caracteristicas = this.shuffleArray([...variation.caracteristicas]);
        }

        return variation;
    }

    /**
     * Mezcla aleatoriamente un array
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Obtiene estadísticas de generación
     */
    getGenerationStats() {
        return {
            ...this.generationStats,
            successRate: this.generationStats.totalGenerated > 0 
                ? (this.generationStats.successfulGenerations / this.generationStats.totalGenerated) * 100 
                : 0,
            averageQuality: 85 // Promedio estimado para plantillas
        };
    }

    /**
     * Resetea las estadísticas
     */
    resetStats() {
        this.generationStats = {
            totalGenerated: 0,
            successfulGenerations: 0,
            validationErrors: 0
        };
    }
}

export default ContentFallbackGenerator;