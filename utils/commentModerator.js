/**
 * Sistema de Moderación Automática de Comentarios
 * Detecta spam, toxicidad, palabras prohibidas y calcula scores de moderación
 */

// ========================================
// CONFIGURACIÓN
// ========================================

const BANNED_WORDS_ES = [
  // Palabras ofensivas (solo ejemplos generales)
  'idiota', 'estúpido', 'imbécil', 'tonto', 'basura',
  // Agregar más según necesidad
];

const SPAM_PATTERNS = [
  /viagra/i,
  /cialis/i,
  /casino/i,
  /poker/i,
  /buy now/i,
  /click here/i,
  /download now/i,
  /earn money/i,
  /make money/i,
  /work from home/i,
  /limited time/i,
  /act now/i,
  /free money/i,
  /cheap .+? online/i,
];

const SUSPICIOUS_PATTERNS = {
  excessive_caps: /[A-Z]{10,}/,
  excessive_links: /(https?:\/\/[^\s]+)/g,
  excessive_exclamation: /!{3,}/,
  suspicious_characters: /[^\w\sáéíóúñ¿?¡!.,;:()\-'\"]/g,
  email_pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone_pattern: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
};

const TOXIC_WORDS_ES = [
  'mierda', 'puto', 'puta', 'cabrón', 'hijo de', 'vete a', 
  'cállate', 'muérete', 'pendejo', 'gilipollas'
];

const MAX_LINKS = 2;
const MAX_COMMENT_LENGTH = 5000;
const MIN_COMMENT_LENGTH = 2;

// ========================================
// FUNCIONES DE ANÁLISIS
// ========================================

/**
 * Analiza un comentario completo y retorna score de moderación
 */
const analyzeComment = (content, authorData = {}) => {
  const analysis = {
    score: 100, // Comienza con 100, se resta por problemas
    flags: [],
    autoAction: null, // 'approve', 'reject', 'spam', 'review'
    confidence: 0,
    details: {}
  };

  // 1. Verificar longitud
  const lengthCheck = checkLength(content);
  if (!lengthCheck.valid) {
    analysis.flags.push({
      type: 'length',
      severity: 'critical',
      confidence: 1.0,
      reason: lengthCheck.reason
    });
    analysis.score -= 50;
  }

  // 2. Detectar spam
  const spamCheck = detectSpam(content);
  if (spamCheck.isSpam) {
    analysis.flags.push({
      type: 'spam',
      severity: 'critical',
      confidence: spamCheck.confidence,
      reason: spamCheck.reason
    });
    analysis.score -= 80;
    analysis.autoAction = 'spam';
  }

  // 3. Detectar palabras prohibidas
  const bannedCheck = detectBannedWords(content);
  if (bannedCheck.found) {
    analysis.flags.push({
      type: 'offensive',
      severity: 'high',
      confidence: bannedCheck.confidence,
      reason: `Contiene ${bannedCheck.count} palabra(s) prohibida(s)`
    });
    analysis.score -= (bannedCheck.count * 20);
  }

  // 4. Analizar toxicidad
  const toxicCheck = analyzeToxicity(content);
  if (toxicCheck.isToxic) {
    analysis.flags.push({
      type: 'toxic',
      severity: toxicCheck.severity,
      confidence: toxicCheck.confidence,
      reason: toxicCheck.reason
    });
    analysis.score -= toxicCheck.penalty;
  }

  // 5. Detectar patrones sospechosos
  const suspiciousCheck = detectSuspiciousPatterns(content);
  if (suspiciousCheck.suspicious) {
    suspiciousCheck.patterns.forEach(pattern => {
      analysis.flags.push({
        type: 'suspicious',
        severity: pattern.severity,
        confidence: pattern.confidence,
        reason: pattern.reason
      });
      analysis.score -= pattern.penalty;
    });
  }

  // 6. Verificar links excesivos
  const linksCheck = checkExcessiveLinks(content);
  if (linksCheck.excessive) {
    analysis.flags.push({
      type: 'links',
      severity: 'medium',
      confidence: 0.8,
      reason: `Contiene ${linksCheck.count} enlaces (máximo ${MAX_LINKS})`
    });
    analysis.score -= (linksCheck.count - MAX_LINKS) * 10;
  }

  // 7. Verificar mayúsculas excesivas
  const capsCheck = checkExcessiveCaps(content);
  if (capsCheck.excessive) {
    analysis.flags.push({
      type: 'caps',
      severity: 'low',
      confidence: 0.6,
      reason: `${capsCheck.percentage}% en mayúsculas`
    });
    analysis.score -= 15;
  }

  // Asegurar que el score no sea negativo
  analysis.score = Math.max(0, analysis.score);

  // Determinar acción automática
  analysis.autoAction = determineAutoAction(analysis.score, analysis.flags, authorData);
  analysis.confidence = calculateConfidence(analysis.flags);

  // Detalles adicionales
  analysis.details = {
    wordCount: content.split(/\s+/).length,
    charCount: content.length,
    linksCount: linksCheck.count,
    capsPercentage: capsCheck.percentage,
    bannedWordsCount: bannedCheck.count,
    toxicWordsCount: toxicCheck.count
  };

  return analysis;
};

/**
 * Verifica la longitud del comentario
 */
const checkLength = (content) => {
  const length = content.trim().length;

  if (length < MIN_COMMENT_LENGTH) {
    return {
      valid: false,
      reason: `Comentario muy corto (${length} caracteres, mínimo ${MIN_COMMENT_LENGTH})`
    };
  }

  if (length > MAX_COMMENT_LENGTH) {
    return {
      valid: false,
      reason: `Comentario muy largo (${length} caracteres, máximo ${MAX_COMMENT_LENGTH})`
    };
  }

  return { valid: true };
};

/**
 * Detecta spam mediante patrones
 */
const detectSpam = (content) => {
  const lowerContent = content.toLowerCase();
  let spamScore = 0;
  const reasons = [];

  // Verificar patrones de spam
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      spamScore += 0.3;
      reasons.push(`Patrón de spam: ${pattern.source}`);
    }
  }

  // Verificar palabras clave repetidas
  const words = lowerContent.split(/\s+/);
  const wordFreq = {};
  words.forEach(word => {
    if (word.length > 3) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  const maxFreq = Math.max(...Object.values(wordFreq));
  if (maxFreq > 5) {
    spamScore += 0.2;
    reasons.push('Palabras repetidas excesivamente');
  }

  // Verificar caracteres especiales excesivos
  const specialChars = content.match(/[!?$€£¥@#%&*]/g) || [];
  if (specialChars.length > 10) {
    spamScore += 0.2;
    reasons.push('Caracteres especiales excesivos');
  }

  return {
    isSpam: spamScore >= 0.5,
    confidence: Math.min(spamScore, 1.0),
    reason: reasons.join(', ') || 'No spam detected'
  };
};

/**
 * Detecta palabras prohibidas
 */
const detectBannedWords = (content) => {
  const lowerContent = content.toLowerCase();
  let count = 0;
  const foundWords = [];

  for (const word of BANNED_WORDS_ES) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerContent.match(regex);
    if (matches) {
      count += matches.length;
      foundWords.push(word);
    }
  }

  return {
    found: count > 0,
    count,
    words: foundWords,
    confidence: count > 0 ? 0.9 : 0
  };
};

/**
 * Analiza toxicidad del contenido
 */
const analyzeToxicity = (content) => {
  const lowerContent = content.toLowerCase();
  let toxicCount = 0;
  let toxicScore = 0;

  for (const word of TOXIC_WORDS_ES) {
    const regex = new RegExp(`\\b${word}`, 'gi');
    const matches = lowerContent.match(regex);
    if (matches) {
      toxicCount += matches.length;
      toxicScore += matches.length * 0.2;
    }
  }

  // Detectar insultos personales (segunda persona)
  const personalAttacks = [
    /eres (un|una) .+? (idiota|estúpido|tonto)/gi,
    /no tienes ni idea/gi,
    /cállate/gi,
    /vete a .+?/gi
  ];

  for (const pattern of personalAttacks) {
    if (pattern.test(content)) {
      toxicScore += 0.3;
      toxicCount++;
    }
  }

  let severity = 'low';
  let penalty = 10;

  if (toxicScore >= 0.6) {
    severity = 'critical';
    penalty = 60;
  } else if (toxicScore >= 0.4) {
    severity = 'high';
    penalty = 40;
  } else if (toxicScore >= 0.2) {
    severity = 'medium';
    penalty = 20;
  }

  return {
    isToxic: toxicCount > 0,
    count: toxicCount,
    severity,
    penalty,
    confidence: Math.min(toxicScore, 1.0),
    reason: toxicCount > 0 ? `Contiene ${toxicCount} palabra(s) tóxica(s)` : 'No toxic'
  };
};

/**
 * Detecta patrones sospechosos
 */
const detectSuspiciousPatterns = (content) => {
  const patterns = [];

  // Emails
  const emails = content.match(SUSPICIOUS_PATTERNS.email_pattern) || [];
  if (emails.length > 0) {
    patterns.push({
      type: 'email',
      severity: 'medium',
      confidence: 0.7,
      reason: `Contiene ${emails.length} email(s)`,
      penalty: 20
    });
  }

  // Teléfonos
  const phones = content.match(SUSPICIOUS_PATTERNS.phone_pattern) || [];
  if (phones.length > 0) {
    patterns.push({
      type: 'phone',
      severity: 'medium',
      confidence: 0.7,
      reason: `Contiene ${phones.length} teléfono(s)`,
      penalty: 20
    });
  }

  // Exclamaciones excesivas
  if (SUSPICIOUS_PATTERNS.excessive_exclamation.test(content)) {
    patterns.push({
      type: 'exclamation',
      severity: 'low',
      confidence: 0.5,
      reason: 'Exclamaciones excesivas',
      penalty: 10
    });
  }

  return {
    suspicious: patterns.length > 0,
    patterns
  };
};

/**
 * Verifica enlaces excesivos
 */
const checkExcessiveLinks = (content) => {
  const links = content.match(SUSPICIOUS_PATTERNS.excessive_links) || [];
  
  return {
    excessive: links.length > MAX_LINKS,
    count: links.length
  };
};

/**
 * Verifica mayúsculas excesivas
 */
const checkExcessiveCaps = (content) => {
  const letters = content.match(/[a-zA-Z]/g) || [];
  const caps = content.match(/[A-Z]/g) || [];
  
  if (letters.length === 0) return { excessive: false, percentage: 0 };

  const percentage = Math.round((caps.length / letters.length) * 100);

  return {
    excessive: percentage > 50 && letters.length > 20,
    percentage
  };
};

/**
 * Determina la acción automática basada en el análisis
 */
const determineAutoAction = (score, flags, authorData) => {
  const { approvedComments = 0, rejectedComments = 0, totalComments = 0, isRegistered = false } = authorData;

  // Si es spam evidente, rechazar
  if (flags.some(f => f.type === 'spam' && f.confidence > 0.7)) {
    return 'spam';
  }

  // Si tiene múltiples flags críticos, rechazar
  const criticalFlags = flags.filter(f => f.severity === 'critical');
  if (criticalFlags.length >= 2) {
    return 'reject';
  }

  // Score muy bajo, rechazar
  if (score < 30) {
    return 'reject';
  }

  // Score bajo, requiere revisión
  if (score < 60) {
    return 'review';
  }

  // Calcular reputación del autor
  let authorReputation = 0.5; // Neutral por defecto
  if (totalComments > 0) {
    authorReputation = approvedComments / totalComments;
  }

  // ✅ Auto-aprobar usuarios autenticados con score decente (70+)
  // Los usuarios autenticados con Clerk ya están verificados
  if (isRegistered && score >= 70 && criticalFlags.length === 0) {
    return 'approve';
  }

  // Auto-aprobar si:
  // 1. Score alto (80+)
  // 2. Autor con buena reputación (80%+ aprobados)
  // 3. Sin flags críticos
  if (score >= 80 && authorReputation >= 0.8 && criticalFlags.length === 0) {
    return 'approve';
  }

  // Auto-aprobar usuarios confiables con score moderado
  if (score >= 70 && authorReputation >= 0.9 && totalComments >= 10) {
    return 'approve';
  }

  // Por defecto, requiere revisión
  return 'review';
};

/**
 * Calcula confianza del análisis
 */
const calculateConfidence = (flags) => {
  if (flags.length === 0) return 0.9; // Alta confianza si no hay problemas

  const avgConfidence = flags.reduce((sum, f) => sum + f.confidence, 0) / flags.length;
  return avgConfidence;
};

/**
 * Actualiza la reputación de un autor
 */
const updateAuthorReputation = async (authorEmail) => {
  const { default: BlogComment } = await import('../models/BlogComment.js');
  
  const stats = await BlogComment.aggregate([
    {
      $match: { 'author.email': authorEmail }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const reputation = {
    totalComments: 0,
    approvedComments: 0,
    rejectedComments: 0,
    spamComments: 0,
    score: 0
  };

  stats.forEach(stat => {
    reputation.totalComments += stat.count;
    
    if (stat._id === 'approved') {
      reputation.approvedComments = stat.count;
    } else if (stat._id === 'rejected') {
      reputation.rejectedComments = stat.count;
    } else if (stat._id === 'spam') {
      reputation.spamComments = stat.count;
    }
  });

  // Calcular score de reputación (0-100)
  if (reputation.totalComments > 0) {
    const approvalRate = reputation.approvedComments / reputation.totalComments;
    const spamPenalty = reputation.spamComments * 0.2;
    reputation.score = Math.max(0, (approvalRate * 100) - spamPenalty);
  }

  // Actualizar todos los comentarios del autor con su nueva reputación
  await BlogComment.updateMany(
    { 'author.email': authorEmail },
    {
      $set: {
        'authorReputation.score': reputation.score,
        'authorReputation.totalComments': reputation.totalComments,
        'authorReputation.approvedComments': reputation.approvedComments,
        'authorReputation.rejectedComments': reputation.rejectedComments
      }
    }
  );

  return reputation;
};

/**
 * Procesa un comentario nuevo aplicando moderación automática
 */
const moderateNewComment = async (comment) => {
  // Obtener reputación del autor
  const { default: BlogComment } = await import('../models/BlogComment.js');
  const authorComments = await BlogComment.countDocuments({
    'author.email': comment.author.email
  });

  const authorApproved = await BlogComment.countDocuments({
    'author.email': comment.author.email,
    status: 'approved'
  });

  const authorData = {
    totalComments: authorComments,
    approvedComments: authorApproved,
    rejectedComments: authorComments - authorApproved,
    isRegistered: comment.author.isRegistered || false // ✅ Pasar el estado de registro
  };

  // Analizar contenido
  const analysis = analyzeComment(comment.content, authorData);

  // Aplicar análisis al comentario
  comment.moderation = {
    autoModerated: true,
    moderationScore: analysis.score,
    flags: analysis.flags
  };

  // Aplicar acción automática
  switch (analysis.autoAction) {
    case 'approve':
      comment.status = 'approved';
      break;
    case 'spam':
      comment.status = 'spam';
      break;
    case 'reject':
      comment.status = 'rejected';
      comment.moderation.rejectionReason = 'Rechazado automáticamente por contenido inapropiado';
      break;
    default:
      comment.status = 'pending';
  }

  return {
    comment,
    analysis
  };
};

/**
 * Re-analiza comentarios en lote (útil para actualizar análisis)
 */
const batchReanalyze = async (limit = 100) => {
  const { default: BlogComment } = await import('../models/BlogComment.js');
  
  const comments = await BlogComment.find({
    status: 'pending'
  })
    .limit(limit)
    .sort({ createdAt: 1 });

  const results = {
    processed: 0,
    approved: 0,
    rejected: 0,
    spam: 0,
    stillPending: 0
  };

  for (const comment of comments) {
    const result = await moderateNewComment(comment);
    await result.comment.save();

    results.processed++;
    results[result.comment.status]++;
  }

  return results;
};

// ========================================
// EXPORT
// ========================================

export {
  analyzeComment,
  detectSpam,
  detectBannedWords,
  analyzeToxicity,
  detectSuspiciousPatterns,
  checkExcessiveLinks,
  checkExcessiveCaps,
  moderateNewComment,
  updateAuthorReputation,
  batchReanalyze
};

export const config = {
  BANNED_WORDS_ES,
  SPAM_PATTERNS,
  TOXIC_WORDS_ES,
  MAX_LINKS,
  MAX_COMMENT_LENGTH,
  MIN_COMMENT_LENGTH
};
