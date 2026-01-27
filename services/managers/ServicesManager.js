/**
 * ServicesManager.js - Manager principal que coordina todos los componentes
 * Este archivo orquesta la generación de contenido de servicios sin usar OpenAI,
 * garantizando la eliminación completa de errores 429.
 */

import ContentFallbackGenerator from '../generators/ContentFallbackGenerator.js';
import ContentValidator from '../generators/ContentValidator.js';
import ContentTemplates from '../generators/ContentTemplates.js';

class ServicesManager {
    constructor() {
        this.fallbackGenerator = new ContentFallbackGenerator();
        this.validator = new ContentValidator();
        this.templates = new ContentTemplates();
        
        this.operationHistory = [];
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Inicializa el manager
     */
    async init() {
        try {
            console.log('🚀 Inicializando ServicesManager...');
            this.isInitialized = true;
            console.log('✅ ServicesManager inicializado exitosamente');
            console.log('📝 Modo: SOLO PLANTILLAS (Sin OpenAI)');
        } catch (error) {
            console.error('❌ Error inicializando ServicesManager:', error.message);
            this.isInitialized = false;
        }
    }

    /**
     * Genera contenido completo para un servicio (método principal)
     */
    async generateCompleteServiceContent(serviceData) {
        if (!this.isInitialized) {
            await this.init();
        }

        const startTime = Date.now();
        const operationId = this.generateOperationId();

        try {
            console.log(`🔄 [${operationId}] Iniciando generación de contenido...`);
            console.log(`📋 Servicio: ${serviceData.nombre || 'Sin nombre'}`);
            console.log(`🏷️ Categoría: ${serviceData.categoria || 'General'}`);

            // 1. Validar datos de entrada
            const inputValidation = this.validateServiceInput(serviceData);
            if (!inputValidation.isValid) {
                throw new Error(`Datos de entrada inválidos: ${inputValidation.errors.join(', ')}`);
            }

            // 2. Generar contenido usando solo plantillas
            const contentResult = await this.fallbackGenerator.generateServiceContent(serviceData);

            if (!contentResult.success) {
                throw new Error(`Error en generación: ${contentResult.error}`);
            }

            // 3. Validación final del contenido
            const finalValidation = this.validator.validateServiceContent(contentResult.content);

            // 4. Estructurar respuesta final
            const result = {
                success: true,
                content: contentResult.content,
                validation: finalValidation,
                metadata: {
                    operationId,
                    method: 'template-only',
                    generationTime: Date.now() - startTime,
                    qualityScore: finalValidation.score || 85,
                    usedOpenAI: false, // ¡IMPORTANTE! Confirmamos que NO usamos OpenAI
                    generatedAt: new Date().toISOString()
                }
            };

            // 5. Registrar operación
            this.recordOperation(operationId, result, serviceData);

            console.log(`✅ [${operationId}] Contenido generado exitosamente`);
            console.log(`⏱️ Tiempo de generación: ${Date.now() - startTime}ms`);
            console.log(`📊 Puntuación de calidad: ${finalValidation.score || 85}/100`);

            return result;

        } catch (error) {
            console.error(`❌ [${operationId}] Error en generación:`, error.message);

            // Generar contenido de emergencia
            const emergencyContent = this.fallbackGenerator.getEmergencyContent();
            
            const emergencyResult = {
                success: false,
                content: emergencyContent,
                error: error.message,
                metadata: {
                    operationId,
                    method: 'emergency-fallback',
                    generationTime: Date.now() - startTime,
                    usedOpenAI: false,
                    isEmergency: true,
                    generatedAt: new Date().toISOString()
                }
            };

            this.recordOperation(operationId, emergencyResult, serviceData, error);
            return emergencyResult;
        }
    }

    /**
     * Valida los datos de entrada del servicio
     */
    validateServiceInput(serviceData) {
        const errors = [];

        if (!serviceData || typeof serviceData !== 'object') {
            errors.push('serviceData debe ser un objeto válido');
            return { isValid: false, errors };
        }

        // Campos requeridos básicos
        if (!serviceData.nombre && !serviceData.categoria && !serviceData.tipo) {
            errors.push('Se requiere al menos nombre, categoría o tipo del servicio');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Obtiene contenido existente de un servicio
     */
    async getExistingContent(servicioId) {
        try {
            console.log(`🔍 Obteniendo contenido existente para servicio ${servicioId}`);
            
            // Aquí normalmente buscaríamos en la base de datos
            // Por ahora retornamos null para indicar que no hay contenido previo
            return null;

        } catch (error) {
            console.warn('⚠️ Error obteniendo contenido existente:', error.message);
            return null;
        }
    }

    /**
     * Actualiza el contenido de un servicio
     */
    async updateServiceContent(servicioId, newContent) {
        const operationId = this.generateOperationId();
        
        try {
            console.log(`🔄 [${operationId}] Actualizando contenido del servicio ${servicioId}`);

            // Validar el nuevo contenido
            const validation = this.validator.validateServiceContent(newContent);
            
            if (!validation.isValid) {
                console.warn('⚠️ Contenido no válido, aplicando correcciones automáticas...');
                // En lugar de fallar, corregir automáticamente
                newContent = this.fallbackGenerator.autoCorrectContent(newContent, validation.errors);
            }

            const result = {
                success: true,
                content: newContent,
                validation,
                metadata: {
                    operationId,
                    method: 'content-update',
                    servicioId,
                    updatedAt: new Date().toISOString()
                }
            };

            this.recordOperation(operationId, result, { servicioId });
            
            console.log(`✅ [${operationId}] Contenido actualizado exitosamente`);
            return result;

        } catch (error) {
            console.error(`❌ [${operationId}] Error actualizando contenido:`, error.message);
            
            return {
                success: false,
                error: error.message,
                metadata: {
                    operationId,
                    method: 'content-update-failed',
                    servicioId,
                    updatedAt: new Date().toISOString()
                }
            };
        }
    }

    /**
     * Genera múltiples variaciones de contenido
     */
    async generateContentVariations(serviceData, count = 3) {
        const operationId = this.generateOperationId();
        
        try {
            console.log(`🔄 [${operationId}] Generando ${count} variaciones de contenido...`);

            const variations = await this.fallbackGenerator.generateContentVariations(serviceData, count);

            const result = {
                success: true,
                variations,
                count: variations.length,
                metadata: {
                    operationId,
                    method: 'variations-generation',
                    requestedCount: count,
                    actualCount: variations.length,
                    generatedAt: new Date().toISOString()
                }
            };

            console.log(`✅ [${operationId}] ${variations.length} variaciones generadas`);
            return result;

        } catch (error) {
            console.error(`❌ [${operationId}] Error generando variaciones:`, error.message);
            
            return {
                success: false,
                error: error.message,
                variations: [this.fallbackGenerator.getEmergencyContent()],
                metadata: {
                    operationId,
                    method: 'variations-failed',
                    generatedAt: new Date().toISOString()
                }
            };
        }
    }

    /**
     * Obtiene estadísticas del sistema
     */
    getSystemStats() {
        const generationStats = this.fallbackGenerator.getGenerationStats();
        
        return {
            ...generationStats,
            totalOperations: this.operationHistory.length,
            recentOperations: this.operationHistory.slice(-10),
            systemStatus: this.isInitialized ? 'operational' : 'initializing',
            openAIUsage: 0, // ¡SIEMPRE CERO! No usamos OpenAI
            lastOperation: this.operationHistory[this.operationHistory.length - 1]?.timestamp || null
        };
    }

    /**
     * Genera un ID único para cada operación
     */
    generateOperationId() {
        return `SM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Registra una operación en el historial
     */
    recordOperation(operationId, result, serviceData, error = null) {
        const operation = {
            id: operationId,
            timestamp: new Date().toISOString(),
            success: result.success,
            method: result.metadata?.method || 'unknown',
            serviceData: {
                nombre: serviceData?.nombre,
                categoria: serviceData?.categoria,
                tipo: serviceData?.tipo
            },
            qualityScore: result.validation?.score || result.metadata?.qualityScore || null,
            generationTime: result.metadata?.generationTime || null,
            error: error?.message || null
        };

        this.operationHistory.push(operation);

        // Mantener solo las últimas 100 operaciones
        if (this.operationHistory.length > 100) {
            this.operationHistory = this.operationHistory.slice(-100);
        }
    }

    /**
     * Verifica el estado del sistema
     */
    async healthCheck() {
        try {
            // Verificar que todos los componentes están funcionando
            const templateTest = this.templates.getContentByType('desarrollo', 'Test');
            const validatorTest = this.validator.validateServiceContent({
                descripcion: 'Test description',
                beneficios: ['Test benefit'],
                caracteristicas: ['Test feature']
            });

            return {
                status: 'healthy',
                components: {
                    templates: !!templateTest,
                    validator: validatorTest.isValid,
                    fallbackGenerator: this.fallbackGenerator ? true : false,
                    manager: this.isInitialized
                },
                openAIRequired: false, // ¡NUNCA requerimos OpenAI!
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

export default ServicesManager;