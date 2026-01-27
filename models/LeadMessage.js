import mongoose from 'mongoose';

/**
 * 💬 Schema de Mensaje de Lead
 * Sistema de mensajería dedicado para el CRM
 * Permite comunicación bidireccional entre el equipo y los clientes
 */
const leadMessageSchema = new mongoose.Schema({
  // ========================================
  // 🔗 RELACIONES
  // ========================================
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
    index: true
  },
  
  // ========================================
  // 👤 INFORMACIÓN DEL AUTOR
  // ========================================
  autor: {
    userId: {
      type: String, // Clerk user ID
      required: true,
      index: true
    },
    nombre: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    rol: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'CLIENT', 'USER'],
      required: true
    }
  },
  
  // ========================================
  // 👥 INFORMACIÓN DEL DESTINATARIO
  // ========================================
  destinatario: {
    userId: {
      type: String, // Clerk user ID (null si es broadcast al equipo)
      default: null
    },
    nombre: String,
    email: String,
    rol: String
  },
  
  // ========================================
  // 📝 CONTENIDO DEL MENSAJE
  // ========================================
  tipo: {
    type: String,
    enum: [
      'nota_interna',      // Nota privada del equipo
      'mensaje_cliente',   // Mensaje enviado al cliente
      'respuesta_cliente', // Respuesta del cliente
      'email',             // Email enviado
      'sms',               // SMS enviado
      'notificacion'       // Notificación del sistema
    ],
    required: true,
    index: true
  },
  
  asunto: {
    type: String,
    trim: true,
    maxlength: 200
  },
  
  contenido: {
    type: String,
    required: [true, 'El contenido del mensaje es requerido'],
    maxlength: 10000
  },
  
  // ========================================
  // 🔒 PRIVACIDAD Y VISIBILIDAD
  // ========================================
  esPrivado: {
    type: Boolean,
    default: false,
    index: true
    // true = Solo visible para el equipo interno
    // false = Visible para el cliente también
  },
  
  // ========================================
  // 📊 ESTADO DEL MENSAJE
  // ========================================
  estado: {
    type: String,
    enum: ['borrador', 'enviado', 'entregado', 'leido', 'respondido', 'archivado'],
    default: 'enviado',
    index: true
  },
  
  // ========================================
  // 📡 CANAL DE COMUNICACIÓN
  // ========================================
  canal: {
    type: String,
    enum: ['sistema', 'email', 'sms', 'whatsapp', 'chat'],
    default: 'sistema'
  },
  
  // ========================================
  // 📎 ARCHIVOS ADJUNTOS
  // ========================================
  adjuntos: [{
    nombre: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    tipo: {
      type: String,
      enum: ['image', 'pdf', 'document', 'spreadsheet', 'video', 'audio', 'other'],
      required: true
    },
    mimeType: String,
    tamaño: {
      type: Number, // bytes
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      userId: String,
      nombre: String
    }
  }],
  
  // ========================================
  // 🧵 THREADING (RESPUESTAS)
  // ========================================
  respondidoA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeadMessage',
    default: null,
    index: true
  },
  
  respuestas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeadMessage'
  }],
  
  // ========================================
  // 📅 TRACKING DE LECTURA
  // ========================================
  leido: {
    type: Boolean,
    default: false,
    index: true
  },
  
  fechaLectura: {
    type: Date,
    default: null
  },
  
  leidoPor: [{
    userId: String,
    nombre: String,
    fechaLectura: Date
  }],
  
  // ========================================
  // 🏷️ PRIORIDAD Y CATEGORIZACIÓN
  // ========================================
  prioridad: {
    type: String,
    enum: ['baja', 'normal', 'alta', 'urgente'],
    default: 'normal',
    index: true
  },
  
  etiquetas: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // ========================================
  // 📧 INFORMACIÓN DE EMAIL (si aplica)
  // ========================================
  emailMetadata: {
    messageId: String,        // ID del email enviado
    threadId: String,         // ID del thread de email
    destinatarios: [String],  // Lista de emails destinatarios
    cc: [String],             // Copia
    bcc: [String],            // Copia oculta
    enviado: Boolean,
    fechaEnvio: Date,
    proveedor: String         // 'resend', 'sendgrid', etc.
  },
  
  // ========================================
  // 📱 INFORMACIÓN DE SMS (si aplica)
  // ========================================
  smsMetadata: {
    messageId: String,
    numeroDestino: String,
    numerOrigen: String,
    enviado: Boolean,
    fechaEnvio: Date,
    proveedor: String,        // 'twilio', 'vonage', etc.
    segmentos: Number         // Número de segmentos SMS
  },
  
  // ========================================
  // 🔧 METADATA ADICIONAL
  // ========================================
  metadata: {
    ip: String,
    userAgent: String,
    navegador: String,
    dispositivo: String,
    ubicacion: String
  },
  
  // ========================================
  // ⏰ PROGRAMACIÓN DE ENVÍO
  // ========================================
  programado: {
    type: Boolean,
    default: false
  },
  
  fechaProgramada: {
    type: Date,
    default: null
  },
  
  // ========================================
  // 🗑️ SOFT DELETE
  // ========================================
  eliminado: {
    type: Boolean,
    default: false
  },
  
  eliminadoPor: {
    userId: String,
    nombre: String,
    fecha: Date
  }
  
}, {
  timestamps: true, // createdAt, updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========================================
// 📇 ÍNDICES COMPUESTOS PARA OPTIMIZACIÓN
// ========================================
leadMessageSchema.index({ leadId: 1, createdAt: -1 });
leadMessageSchema.index({ leadId: 1, tipo: 1, esPrivado: 1 });
leadMessageSchema.index({ 'autor.userId': 1, createdAt: -1 });
leadMessageSchema.index({ 'destinatario.userId': 1, leido: 1 });
leadMessageSchema.index({ estado: 1, fechaProgramada: 1 });
leadMessageSchema.index({ eliminado: 1, createdAt: -1 });

// ========================================
// 🔧 MÉTODOS DE INSTANCIA
// ========================================

/**
 * Marcar mensaje como leído por un usuario
 * @param {object} usuario - Usuario que marca como leído
 */
leadMessageSchema.methods.marcarComoLeido = function(usuario) {
  if (!this.leido) {
    this.leido = true;
    this.fechaLectura = new Date();
  }
  
  // Agregar a la lista de lectores (evitar duplicados)
  const yaLeido = this.leidoPor.some(l => l.userId === usuario.id || l.userId === usuario.clerkId);
  if (!yaLeido) {
    this.leidoPor.push({
      userId: usuario.id || usuario.clerkId,
      nombre: `${usuario.firstName || ''} ${usuario.lastName || ''}`.trim() || usuario.email,
      fechaLectura: new Date()
    });
  }
  
  this.estado = 'leido';
  return this.save();
};

/**
 * Agregar respuesta a este mensaje
 * @param {string} respuestaId - ID del mensaje de respuesta
 */
leadMessageSchema.methods.agregarRespuesta = function(respuestaId) {
  if (!this.respuestas.includes(respuestaId)) {
    this.respuestas.push(respuestaId);
    this.estado = 'respondido';
  }
  return this.save();
};

/**
 * Archivar mensaje
 * @param {object} usuario - Usuario que archiva
 */
leadMessageSchema.methods.archivar = function(usuario) {
  this.estado = 'archivado';
  return this.save();
};

/**
 * Eliminar mensaje (soft delete)
 * @param {object} usuario - Usuario que elimina
 */
leadMessageSchema.methods.eliminar = function(usuario) {
  this.eliminado = true;
  this.eliminadoPor = {
    userId: usuario.id || usuario.clerkId,
    nombre: `${usuario.firstName || ''} ${usuario.lastName || ''}`.trim() || usuario.email,
    fecha: new Date()
  };
  return this.save();
};

// ========================================
// 📊 MÉTODOS ESTÁTICOS
// ========================================

/**
 * Obtener timeline de mensajes de un lead
 * @param {string} leadId - ID del lead
 * @param {boolean} incluirPrivados - Si incluir mensajes privados
 * @param {object} filtros - Filtros adicionales
 */
leadMessageSchema.statics.obtenerTimeline = async function(leadId, incluirPrivados = false, filtros = {}) {
  const query = {
    leadId,
    eliminado: false,
    ...filtros
  };
  
  if (!incluirPrivados) {
    query.esPrivado = false;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('respondidoA', 'contenido autor createdAt')
    .lean();
};

/**
 * Contar mensajes no leídos de un usuario
 * @param {string} userId - ID del usuario
 */
leadMessageSchema.statics.contarNoLeidos = async function(userId) {
  return this.countDocuments({
    'destinatario.userId': userId,
    leido: false,
    eliminado: false,
    estado: { $in: ['enviado', 'entregado'] }
  });
};

/**
 * Obtener mensajes programados pendientes
 */
leadMessageSchema.statics.obtenerMensajesProgramados = async function() {
  const ahora = new Date();
  return this.find({
    programado: true,
    estado: 'borrador',
    fechaProgramada: { $lte: ahora },
    eliminado: false
  });
};

/**
 * Obtener estadísticas de mensajes de un lead
 * @param {string} leadId - ID del lead
 */
leadMessageSchema.statics.obtenerEstadisticas = async function(leadId) {
  const [stats] = await this.aggregate([
    { $match: { leadId: new mongoose.Types.ObjectId(leadId), eliminado: false } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        noLeidos: {
          $sum: { $cond: [{ $eq: ['$leido', false] }, 1, 0] }
        },
        privados: {
          $sum: { $cond: [{ $eq: ['$esPrivado', true] }, 1, 0] }
        },
        publicos: {
          $sum: { $cond: [{ $eq: ['$esPrivado', false] }, 1, 0] }
        },
        porTipo: {
          $push: '$tipo'
        },
        ultimoMensaje: { $max: '$createdAt' }
      }
    }
  ]);
  
  return stats || {
    total: 0,
    noLeidos: 0,
    privados: 0,
    publicos: 0,
    porTipo: [],
    ultimoMensaje: null
  };
};

// ========================================
// 🎨 VIRTUAL PROPERTIES
// ========================================

/**
 * Virtual para determinar si el mensaje tiene respuestas
 */
leadMessageSchema.virtual('tieneRespuestas').get(function() {
  return this.respuestas && this.respuestas.length > 0;
});

/**
 * Virtual para contar adjuntos
 */
leadMessageSchema.virtual('cantidadAdjuntos').get(function() {
  return this.adjuntos ? this.adjuntos.length : 0;
});

/**
 * Virtual para tiempo transcurrido
 */
leadMessageSchema.virtual('tiempoTranscurrido').get(function() {
  if (this.createdAt) {
    const diff = Date.now() - this.createdAt.getTime();
    const minutos = Math.floor(diff / (1000 * 60));
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    
    if (dias > 0) return `${dias}d`;
    if (horas > 0) return `${horas}h`;
    if (minutos > 0) return `${minutos}m`;
    return 'ahora';
  }
  return '';
});

// ========================================
// 🪝 MIDDLEWARE (HOOKS)
// ========================================

/**
 * Pre-save: Validaciones adicionales
 */
leadMessageSchema.pre('save', function(next) {
  // Si es mensaje a cliente, no puede ser privado
  if (this.tipo === 'mensaje_cliente' && this.esPrivado) {
    this.esPrivado = false;
  }
  
  // Si es nota interna, debe ser privada
  if (this.tipo === 'nota_interna' && !this.esPrivado) {
    this.esPrivado = true;
  }
  
  next();
});

/**
 * Post-save: Actualizar contador de respuestas en mensaje padre
 */
leadMessageSchema.post('save', async function(doc) {
  if (doc.respondidoA) {
    try {
      const mensajePadre = await this.constructor.findById(doc.respondidoA);
      if (mensajePadre) {
        await mensajePadre.agregarRespuesta(doc._id);
      }
    } catch (error) {
      console.error('Error actualizando mensaje padre:', error);
    }
  }
});

export default mongoose.model('LeadMessage', leadMessageSchema);
