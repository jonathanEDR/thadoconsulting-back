/**
 * Templates de Contenido para BlogAgent
 * Plantillas especializadas para diferentes tipos de posts
 */

export const contentTemplates = {
  /**
   * Template para Tutoriales Técnicos
   */
  tutorial: {
    name: 'Tutorial Técnico',
    description: 'Para guías paso a paso con código y ejemplos prácticos',
    structure: [
      'Introducción (contexto y objetivos)',
      'Prerrequisitos',
      'Pasos detallados con código',
      'Ejemplos prácticos',
      'Solución de problemas comunes',
      'Conclusión y próximos pasos'
    ],
    prompt: (params) => `Genera un tutorial técnico completo y profesional:

Título: ${params.title}
Tecnología: ${params.technology || 'No especificada'}
Nivel: ${params.level || 'Intermedio'}
Longitud: ${params.wordCount || 1000} palabras

ESTRUCTURA REQUERIDA:

## Introducción
- Contexto del problema o necesidad (2-3 párrafos, 60-80 palabras cada uno)
- Objetivos de aprendizaje claros
- Qué construiremos o aprenderemos

## Prerrequisitos
- Lista de conocimientos previos necesarios
- Herramientas y versiones requeridas
- Configuración inicial si es necesaria

## Pasos del Tutorial

### Paso 1: [Título descriptivo]
- Explicación clara (60-80 palabras)
- Bloque de código con comentarios:
\`\`\`javascript
// Código de ejemplo bien comentado
\`\`\`
- Explicación del código

### Paso 2: [Título descriptivo]
[Repetir estructura]

### Paso 3-N: [Continuar según necesidad]

## Ejemplos Prácticos
- Casos de uso reales
- Variaciones del código
- Mejores prácticas

## Solución de Problemas Comunes
- Lista de errores típicos y soluciones
- Tips de debugging

## Conclusión
- Resumen de lo aprendido
- Próximos pasos sugeridos
- Recursos adicionales

REQUISITOS DE FORMATO:
- Usar ## para secciones principales, ### para subsecciones
- Incluir bloques de código \`\`\`javascript o \`\`\`python según corresponda
- Usar **negritas** para términos técnicos importantes
- Listas numeradas para pasos, viñetas para conceptos
- Párrafos cortos (máximo 80 palabras)
- Incluir comentarios en el código

Genera el contenido completo del tutorial siguiendo esta estructura.`,
    
    seoKeywords: ['tutorial', 'guía', 'paso a paso', 'cómo hacer', 'ejemplo'],
    minWordCount: 800,
    requiredElements: ['headers', 'code', 'lists', 'bold']
  },

  /**
   * Template para Guías Completas
   */
  guide: {
    name: 'Guía Completa',
    description: 'Para documentación exhaustiva sobre un tema',
    structure: [
      'Resumen ejecutivo',
      'Fundamentos',
      'Conceptos clave',
      'Implementación',
      'Mejores prácticas',
      'Casos de estudio',
      'Conclusión'
    ],
    prompt: (params) => `Genera una guía completa y profesional:

Título: ${params.title}
Tema: ${params.topic || 'No especificado'}
Audiencia: ${params.audience || 'Profesionales técnicos'}
Longitud: ${params.wordCount || 1200} palabras

ESTRUCTURA REQUERIDA:

## Resumen Ejecutivo
- Qué cubrirá la guía (2 párrafos, 60-80 palabras)
- Para quién es esta guía
- Beneficios de leerla completa

## Fundamentos
- Conceptos básicos necesarios
- Contexto histórico si es relevante
- Terminología clave con **definiciones en negrita**

## Conceptos Clave

### Concepto 1: [Nombre]
- Explicación detallada (60-80 palabras)
- Ejemplos prácticos
- Por qué es importante

### Concepto 2-N: [Continuar]

## Implementación

### Enfoque 1: [Nombre]
- Descripción del enfoque
- Ventajas y desventajas
- Cuándo usarlo
\`\`\`
// Ejemplo de código si aplica
\`\`\`

### Enfoque 2-N: [Continuar]

## Mejores Prácticas
- Lista de recomendaciones basadas en experiencia
- Patrones comunes a seguir
- Anti-patrones a evitar

## Casos de Estudio
- Ejemplos reales de implementación
- Resultados obtenidos
- Lecciones aprendidas

## Conclusión
- Resumen de puntos clave
- Recomendaciones finales
- Recursos para profundizar

REQUISITOS DE FORMATO:
- Estructura jerárquica clara (##, ###)
- Listas con viñetas para conceptos
- Tablas comparativas si son útiles
- **Negritas** para términos importantes
- Párrafos de 60-80 palabras máximo
- Ejemplos de código cuando sea relevante

Genera el contenido completo de la guía siguiendo esta estructura.`,
    
    seoKeywords: ['guía completa', 'documentación', 'manual', 'referencia'],
    minWordCount: 1000,
    requiredElements: ['headers', 'lists', 'bold']
  },

  /**
   * Template para Artículos Técnicos
   */
  technical: {
    name: 'Artículo Técnico',
    description: 'Para análisis profundos de tecnologías o conceptos',
    structure: [
      'Introducción',
      'Contexto técnico',
      'Análisis detallado',
      'Comparativas',
      'Implementación',
      'Conclusiones'
    ],
    prompt: (params) => `Genera un artículo técnico profesional y analítico:

Título: ${params.title}
Tecnología/Concepto: ${params.technology || 'No especificado'}
Enfoque: ${params.focus || 'Análisis técnico'}
Longitud: ${params.wordCount || 1000} palabras

ESTRUCTURA REQUERIDA:

## Introducción
- Presentación del tema (2-3 párrafos, 70-80 palabras)
- Por qué es relevante ahora
- Qué se analizará en el artículo

## Contexto Técnico
- Historia y evolución del concepto/tecnología
- Problema que resuelve
- Conceptos relacionados

## Análisis Técnico Detallado

### Arquitectura/Funcionamiento
- Descripción técnica precisa
- Diagramas conceptuales (descritos en texto)
- Componentes principales

### Características Principales
- Lista de features clave con **explicación**
- Ventajas técnicas
- Limitaciones conocidas

### Comparativa con Alternativas
| Aspecto | Solución A | Solución B | Recomendación |
|---------|-----------|------------|---------------|
| Rendimiento | ... | ... | ... |

## Implementación y Casos de Uso

### Ejemplo Práctico
\`\`\`javascript
// Código de implementación
// Con comentarios explicativos
\`\`\`

### Escenarios de Uso
- Cuándo usar esta solución
- Cuándo considerar alternativas
- Patrones de diseño aplicables

## Rendimiento y Optimización
- Métricas de performance
- Técnicas de optimización
- Trade-offs a considerar

## Conclusiones
- Resumen de hallazgos técnicos
- Recomendaciones basadas en análisis
- Tendencias futuras

REQUISITOS DE FORMATO:
- Estructura técnica clara (##, ###)
- Código con \`\`\` cuando sea necesario
- **Términos técnicos** en negrita
- Listas para comparativas
- Datos y métricas cuando sea posible
- Párrafos concisos (60-80 palabras)

Genera el contenido completo del artículo técnico siguiendo esta estructura.`,
    
    seoKeywords: ['análisis', 'arquitectura', 'rendimiento', 'comparativa', 'técnico'],
    minWordCount: 900,
    requiredElements: ['headers', 'code', 'lists', 'bold']
  },

  /**
   * Template para Posts de Blog Informativo
   */
  informative: {
    name: 'Post Informativo',
    description: 'Para artículos generales y noticias del sector',
    structure: [
      'Introducción atractiva',
      'Desarrollo con subtemas',
      'Ejemplos y casos',
      'Conclusión y llamado a la acción'
    ],
    prompt: (params) => `Genera un artículo de blog informativo y atractivo:

Título: ${params.title}
Categoría: ${params.category || 'General'}
Tono: ${params.tone || 'Profesional pero accesible'}
Longitud: ${params.wordCount || 800} palabras

ESTRUCTURA REQUERIDA:

## Introducción
- Hook inicial que capture atención (2 párrafos, 60-70 palabras)
- Presentación clara del tema
- Por qué es importante para el lector

## [Subtema 1]: [Título atractivo]
- Desarrollo del primer punto principal (70-80 palabras)
- Datos, estadísticas o ejemplos
- **Conceptos clave** resaltados

### Puntos Importantes
- Lista de aspectos relevantes
- Ejemplos concretos
- Aplicaciones prácticas

## [Subtema 2]: [Título atractivo]
[Repetir estructura]

## [Subtema 3]: [Título atractivo]
[Repetir estructura]

## Ejemplos y Casos Reales
- Casos de éxito
- Lecciones aprendidas
- Aplicación práctica

## Conclusión y Próximos Pasos
- Resumen de ideas principales
- Llamado a la acción claro
- Recursos adicionales o próximos artículos

REQUISITOS DE FORMATO:
- Títulos descriptivos y atractivos
- Listas con viñetas para facilitar lectura
- **Negritas** para destacar conceptos
- Párrafos cortos (máximo 80 palabras)
- Lenguaje claro y accesible
- Incluir código si es un post técnico: \`\`\`

Genera el contenido completo siguiendo esta estructura.`,
    
    seoKeywords: ['información', 'guía', 'consejos', 'tips', 'cómo'],
    minWordCount: 600,
    requiredElements: ['headers', 'lists', 'bold']
  },

  /**
   * Template para Posts de Opinión/Análisis
   */
  opinion: {
    name: 'Análisis y Opinión',
    description: 'Para artículos de opinión fundamentada y análisis crítico',
    structure: [
      'Tesis principal',
      'Argumentos',
      'Contraargumentos',
      'Análisis',
      'Conclusión'
    ],
    prompt: (params) => `Genera un artículo de análisis u opinión fundamentado:

Título: ${params.title}
Tema: ${params.topic || 'No especificado'}
Postura: ${params.stance || 'Neutral/Analítica'}
Longitud: ${params.wordCount || 900} palabras

ESTRUCTURA REQUERIDA:

## Tesis Principal
- Presentación del tema y contexto (2 párrafos, 70-80 palabras)
- Planteamiento de la tesis u opinión principal
- Importancia del análisis

## Argumentos a Favor

### Argumento 1: [Título]
- Desarrollo del argumento (70-80 palabras)
- Evidencia o datos que lo respaldan
- Ejemplos concretos

### Argumento 2-3: [Continuar]

## Contraargumentos y Críticas

### Contraargumento 1: [Título]
- Presentación objetiva de la postura contraria
- Análisis de su validez
- Refutación fundamentada

## Análisis Crítico
- Evaluación equilibrada de ambas posturas
- Matices y complejidades del tema
- Contexto más amplio

## Implicaciones y Consecuencias
- Impacto práctico de las diferentes posturas
- Tendencias futuras
- Recomendaciones basadas en el análisis

## Conclusión
- Síntesis de los puntos principales
- Postura final fundamentada
- Reflexión final o pregunta para el lector

REQUISITOS DE FORMATO:
- Estructura argumentativa clara (##, ###)
- Listas para organizar argumentos
- **Énfasis** en puntos clave
- Párrafos bien desarrollados (70-80 palabras)
- Tono profesional pero con personalidad
- Datos o referencias cuando sea posible

Genera el contenido completo del artículo analítico siguiendo esta estructura.`,
    
    seoKeywords: ['análisis', 'opinión', 'perspectiva', 'evaluación', 'crítica'],
    minWordCount: 800,
    requiredElements: ['headers', 'lists', 'bold']
  }
};

/**
 * Obtener template por tipo
 */
export const getTemplate = (type) => {
  return contentTemplates[type] || contentTemplates.informative;
};

/**
 * Listar todos los templates disponibles
 */
export const listTemplates = () => {
  return Object.entries(contentTemplates).map(([key, template]) => ({
    key,
    name: template.name,
    description: template.description,
    structure: template.structure,
    minWordCount: template.minWordCount,
    requiredElements: template.requiredElements
  }));
};

/**
 * Validar si un contenido cumple con los requisitos del template
 */
export const validateContent = (content, templateType) => {
  const template = getTemplate(templateType);
  const validation = {
    valid: true,
    errors: [],
    warnings: [],
    score: 0
  };

  // Validar longitud mínima
  const wordCount = content.split(/\s+/).length;
  if (wordCount < template.minWordCount) {
    validation.warnings.push(`Contenido corto: ${wordCount} palabras (mínimo: ${template.minWordCount})`);
  } else {
    validation.score += 20;
  }

  // Validar elementos requeridos
  if (template.requiredElements.includes('headers') && !content.includes('##')) {
    validation.errors.push('Faltan encabezados (##)');
    validation.valid = false;
  } else if (template.requiredElements.includes('headers')) {
    validation.score += 20;
  }

  if (template.requiredElements.includes('lists') && !content.match(/^[-*]\s/m)) {
    validation.warnings.push('Se recomienda usar listas');
  } else if (template.requiredElements.includes('lists')) {
    validation.score += 20;
  }

  if (template.requiredElements.includes('code') && !content.includes('```')) {
    validation.warnings.push('No se encontraron bloques de código');
  } else if (template.requiredElements.includes('code')) {
    validation.score += 20;
  }

  if (template.requiredElements.includes('bold') && !content.includes('**')) {
    validation.warnings.push('No hay términos en negrita');
  } else if (template.requiredElements.includes('bold')) {
    validation.score += 20;
  }

  return validation;
};

export default contentTemplates;
