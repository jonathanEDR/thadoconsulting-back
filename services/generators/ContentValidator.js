/**
 * ContentValidator.js - Validador de contenido simple y eficiente
 * Este archivo contiene todas las validaciones necesarias para asegurar
 * la calidad del contenido generado sin dependencias externas.
 */

class ContentValidator {
    constructor() {
        this.minLengths = {
            descripcion: 50,
            beneficios: 20,
            caracteristicas: 15
        };

        this.maxLengths = {
            descripcion: 500,
            beneficios: 150,
            caracteristicas: 100
        };

        this.requiredFields = [
            'descripcion',
            'beneficios',
            'caracteristicas'
        ];
    }

    /**
     * Valida contenido completo de servicio
     */
    validateServiceContent(content) {
        const errors = [];
        const warnings = [];

        // Validación de estructura básica
        if (!content || typeof content !== 'object') {
            errors.push('El contenido debe ser un objeto válido');
            return { isValid: false, errors, warnings };
        }

        // Validar campos requeridos
        this.requiredFields.forEach(field => {
            if (!content[field]) {
                errors.push(`Campo requerido faltante: ${field}`);
            }
        });

        // Validar descripción
        if (content.descripcion) {
            const descValidation = this.validateDescription(content.descripcion);
            errors.push(...descValidation.errors);
            warnings.push(...descValidation.warnings);
        }

        // Validar beneficios
        if (content.beneficios) {
            const benefitsValidation = this.validateBenefits(content.beneficios);
            errors.push(...benefitsValidation.errors);
            warnings.push(...benefitsValidation.warnings);
        }

        // Validar características
        if (content.caracteristicas) {
            const featuresValidation = this.validateFeatures(content.caracteristicas);
            errors.push(...featuresValidation.errors);
            warnings.push(...featuresValidation.warnings);
        }

        return {
            isValid: errors.length === 0,
            errors: errors.filter(Boolean),
            warnings: warnings.filter(Boolean),
            score: this.calculateQualityScore(content)
        };
    }

    /**
     * Valida descripción del servicio
     */
    validateDescription(descripcion) {
        const errors = [];
        const warnings = [];

        if (typeof descripcion !== 'string') {
            errors.push('La descripción debe ser una cadena de texto');
            return { errors, warnings };
        }

        const length = descripcion.trim().length;

        if (length < this.minLengths.descripcion) {
            errors.push(`La descripción es muy corta (mínimo ${this.minLengths.descripcion} caracteres)`);
        }

        if (length > this.maxLengths.descripcion) {
            warnings.push(`La descripción es muy larga (máximo recomendado ${this.maxLengths.descripcion} caracteres)`);
        }

        // Validar calidad básica
        if (this.hasRepeatedWords(descripcion)) {
            warnings.push('La descripción tiene palabras repetidas excesivamente');
        }

        if (!this.hasGoodStructure(descripcion)) {
            warnings.push('La descripción podría tener mejor estructura');
        }

        return { errors, warnings };
    }

    /**
     * Valida beneficios del servicio
     */
    validateBenefits(beneficios) {
        const errors = [];
        const warnings = [];

        if (!Array.isArray(beneficios)) {
            errors.push('Los beneficios deben ser un array');
            return { errors, warnings };
        }

        if (beneficios.length === 0) {
            errors.push('Debe haber al menos un beneficio');
            return { errors, warnings };
        }

        if (beneficios.length > 5) {
            warnings.push('Demasiados beneficios, se recomienda máximo 5');
        }

        beneficios.forEach((beneficio, index) => {
            if (typeof beneficio !== 'string') {
                errors.push(`El beneficio ${index + 1} debe ser una cadena de texto`);
                return;
            }

            const length = beneficio.trim().length;

            if (length < this.minLengths.beneficios) {
                warnings.push(`El beneficio ${index + 1} es muy corto`);
            }

            if (length > this.maxLengths.beneficios) {
                warnings.push(`El beneficio ${index + 1} es muy largo`);
            }
        });

        return { errors, warnings };
    }

    /**
     * Valida características del servicio
     */
    validateFeatures(caracteristicas) {
        const errors = [];
        const warnings = [];

        if (!Array.isArray(caracteristicas)) {
            errors.push('Las características deben ser un array');
            return { errors, warnings };
        }

        if (caracteristicas.length === 0) {
            errors.push('Debe haber al menos una característica');
            return { errors, warnings };
        }

        if (caracteristicas.length > 6) {
            warnings.push('Demasiadas características, se recomienda máximo 6');
        }

        caracteristicas.forEach((caracteristica, index) => {
            if (typeof caracteristica !== 'string') {
                errors.push(`La característica ${index + 1} debe ser una cadena de texto`);
                return;
            }

            const length = caracteristica.trim().length;

            if (length < this.minLengths.caracteristicas) {
                warnings.push(`La característica ${index + 1} es muy corta`);
            }

            if (length > this.maxLengths.caracteristicas) {
                warnings.push(`La característica ${index + 1} es muy larga`);
            }
        });

        return { errors, warnings };
    }

    /**
     * Calcula puntuación de calidad del contenido
     */
    calculateQualityScore(content) {
        let score = 0;
        let maxScore = 0;

        // Puntuación por completitud (40%)
        maxScore += 40;
        const completeness = this.calculateCompleteness(content);
        score += completeness * 40;

        // Puntuación por calidad de texto (30%)
        maxScore += 30;
        const textQuality = this.calculateTextQuality(content);
        score += textQuality * 30;

        // Puntuación por estructura (30%)
        maxScore += 30;
        const structure = this.calculateStructureScore(content);
        score += structure * 30;

        return Math.round((score / maxScore) * 100);
    }

    /**
     * Calcula completitud del contenido
     */
    calculateCompleteness(content) {
        let completed = 0;
        const total = this.requiredFields.length;

        this.requiredFields.forEach(field => {
            if (content[field] && this.isFieldComplete(content[field])) {
                completed++;
            }
        });

        return completed / total;
    }

    /**
     * Calcula calidad del texto
     */
    calculateTextQuality(content) {
        let quality = 0;
        let factors = 0;

        if (content.descripcion) {
            factors++;
            if (!this.hasRepeatedWords(content.descripcion) && this.hasGoodStructure(content.descripcion)) {
                quality++;
            }
        }

        if (content.beneficios) {
            factors++;
            if (this.hasGoodListQuality(content.beneficios)) {
                quality++;
            }
        }

        if (content.caracteristicas) {
            factors++;
            if (this.hasGoodListQuality(content.caracteristicas)) {
                quality++;
            }
        }

        return factors > 0 ? quality / factors : 0;
    }

    /**
     * Calcula puntuación de estructura
     */
    calculateStructureScore(content) {
        let structure = 0;
        let factors = 0;

        // Verificar longitudes apropiadas
        factors++;
        if (this.hasAppropriateLength(content)) {
            structure++;
        }

        // Verificar variedad en beneficios/características
        factors++;
        if (this.hasGoodVariety(content)) {
            structure++;
        }

        return factors > 0 ? structure / factors : 0;
    }

    /**
     * Verifica si un campo está completo
     */
    isFieldComplete(field) {
        if (typeof field === 'string') {
            return field.trim().length >= this.minLengths.descripcion;
        }
        
        if (Array.isArray(field)) {
            return field.length > 0 && field.every(item => 
                typeof item === 'string' && item.trim().length > 0
            );
        }

        return false;
    }

    /**
     * Detecta palabras repetidas excesivamente
     */
    hasRepeatedWords(text) {
        const words = text.toLowerCase().split(/\s+/);
        const wordCount = {};

        words.forEach(word => {
            if (word.length > 3) { // Solo contar palabras significativas
                wordCount[word] = (wordCount[word] || 0) + 1;
            }
        });

        // Si alguna palabra aparece más del 20% del total
        const threshold = Math.max(2, Math.floor(words.length * 0.2));
        return Object.values(wordCount).some(count => count > threshold);
    }

    /**
     * Verifica si el texto tiene buena estructura
     */
    hasGoodStructure(text) {
        // Verificar que tenga al menos una oración completa
        return text.includes('.') || text.includes('!') || text.includes('?');
    }

    /**
     * Verifica calidad de listas (beneficios/características)
     */
    hasGoodListQuality(list) {
        if (!Array.isArray(list) || list.length === 0) return false;

        // Verificar que no haya elementos duplicados
        const unique = new Set(list.map(item => item.toLowerCase().trim()));
        return unique.size === list.length;
    }

    /**
     * Verifica longitudes apropiadas
     */
    hasAppropriateLength(content) {
        if (content.descripcion) {
            const length = content.descripcion.length;
            if (length < this.minLengths.descripcion || length > this.maxLengths.descripcion) {
                return false;
            }
        }
        return true;
    }

    /**
     * Verifica buena variedad en el contenido
     */
    hasGoodVariety(content) {
        const allText = [
            content.descripcion || '',
            ...(content.beneficios || []),
            ...(content.caracteristicas || [])
        ].join(' ').toLowerCase();

        // Verificar que no todo el contenido sea muy similar
        const words = allText.split(/\s+/).filter(word => word.length > 4);
        const uniqueWords = new Set(words);

        return uniqueWords.size / words.length > 0.5; // Al menos 50% de palabras únicas
    }
}

export default ContentValidator;