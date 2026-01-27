import mongoose from 'mongoose';

/**
 * 📝 Schema de Actividad de Lead
 * Registra todas las interacciones con el lead
 * Extendido con capacidades de mensajería
 */
const leadActivitySchema = new mongoose.Schema({
  fecha: {
    type: Date,
    default: Date.now
  },
  tipo: {
    type: String,
    enum: ['nota', 'llamada', 'email', 'reunion', 'propuesta', 'cambio_estado', 'mensaje_interno', 'mensaje_cliente'],
    required: true
  },
  descripcion: {
    type: String,
    required: true
  },
  usuarioId: {
    type: String, // Clerk user ID
    required: true
  },
  usuarioNombre: {
    type: String,
    required: true
  },
  
  // ========================================
  // 💬 CAMPOS DE MENSAJERÍA
  // ========================================
  
  // Indica si es una nota privada del equipo (no visible para el cliente)
  esPrivado: {
    type: Boolean,
    default: true // Por defecto, las notas son privadas
  },
  
  // Dirección del mensaje
  direccion: {
    type: String,
    enum: ['interno', 'saliente', 'entrante'],
    default: 'interno'
    // interno: nota del equipo
    // saliente: mensaje enviado al cliente
    // entrante: respuesta del cliente
  },
  
  // Estado del mensaje (para tracking)
  estadoMensaje: {
    type: String,
    enum: ['borrador', 'enviado', 'entregado', 'leido', 'respondido'],
    default: 'enviado'
  },
  
  // ID del destinatario (si el cliente está registrado)
  destinatarioId: {
    type: String, // Clerk user ID del cliente
    default: null
  },
  
  // Archivos adjuntos
  adjuntos: [{
    nombre: String,
    url: String,
    tipo: String, // 'image', 'pdf', 'document', etc.
    tamaño: Number, // en bytes
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Fecha de lectura del mensaje
  readAt: {
    type: Date,
    default: null
  },
  
  // Referencia a mensaje padre (para threading/respuestas)
  respondidoA: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  }
});

/**
 * 🎯 Schema Principal de Lead
 * Modelo completo de CRM integrado con sistema de roles
 */
const leadSchema = new mongoose.Schema({
  // ========================================
  // 👤 INFORMACIÓN DEL CLIENTE
  // ========================================
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    index: true
  },
  celular: {
    type: String,
    required: [true, 'El celular es requerido'],
    trim: true
  },
  correo: {
    type: String,
    required: [true, 'El correo es requerido'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
    index: true
  },
  empresa: {
    type: String,
    trim: true
  },
  
  // ========================================
  // 💼 INFORMACIÓN DEL PROYECTO
  // ========================================
  tipoServicio: {
    type: String,
    enum: ['web', 'app', 'ecommerce', 'sistemas', 'consultoria', 'diseño', 'marketing', 'otro'],
    required: true
  },
  descripcionProyecto: {
    type: String,
    required: [true, 'La descripción del proyecto es requerida']
  },
  presupuestoEstimado: {
    type: Number,
    min: 0
  },
  fechaDeseada: {
    type: Date
  },
  
  // ========================================
  // 📊 ESTADO DEL LEAD (SOLICITUD)
  // ========================================
  estado: {
    type: String,
    enum: [
      // Estados nuevos (orientados al cliente)
      'nuevo',           // 📝 Solicitud recibida
      'en_revision',     // 👀 En revisión del equipo
      'contactando',     // 📞 Contactando al cliente
      'cotizacion',      // 💰 Cotización enviada
      'aprobado',        // ✅ Aprobado por el cliente
      'en_desarrollo',   // 🚀 Trabajo en progreso
      'completado',      // ✨ Trabajo completado
      'rechazado',       // ❌ Rechazado por el cliente
      'cancelado',       // 🚫 Cancelado
      
      // Estados legacy (mantener compatibilidad)
      'contactado',      // → Migrar a 'contactando'
      'calificado',      // → Migrar a 'en_revision'
      'propuesta',       // → Migrar a 'cotizacion'
      'negociacion',     // → Migrar a 'cotizacion'
      'ganado',          // → Migrar a 'aprobado'
      'perdido',         // → Migrar a 'rechazado'
      'pausado'          // → Migrar a 'en_revision'
    ],
    default: 'nuevo',
    index: true
  },
  prioridad: {
    type: String,
    enum: ['baja', 'media', 'alta', 'urgente'],
    default: 'media'
  },
  
  // ========================================
  // 📅 INFORMACIÓN DE SEGUIMIENTO
  // ========================================
  fechaProximoSeguimiento: {
    type: Date
  },
  asignadoA: {
    userId: {
      type: String, // Clerk user ID
      index: true
    },
    nombre: String,
    email: String
  },
  
  // ========================================
  // 👤 VINCULACIÓN CON USUARIO REGISTRADO
  // ========================================
  usuarioRegistrado: {
    userId: {
      type: String, // Clerk user ID del cliente registrado
      default: null,
      index: true
    },
    nombre: String,
    email: String,
    vinculadoEn: {
      type: Date,
      default: null
    },
    vinculadoPor: {
      userId: String,
      nombre: String
    }
  },
  
  // ========================================
  // 🌐 ORIGEN DEL LEAD
  // ========================================
  origen: {
    type: String,
    enum: ['web', 'web-authenticated', 'referido', 'redes_sociales', 'email', 'telefono', 'evento', 'chat', 'otro'],
    default: 'web'
  },
  
  // ========================================
  // 📜 HISTORIAL DE ACTIVIDADES
  // ========================================
  actividades: [leadActivitySchema],
  
  // ========================================
  // 👨‍💼 METADATOS DEL SISTEMA
  // ========================================
  creadoPor: {
    userId: {
      type: String,
      required: true
    },
    nombre: String,
    email: String
  },
  
  // ========================================
  // 🏷️ TAGS Y CATEGORIZACIÓN
  // ========================================
  tags: [{
    type: String,
    trim: true
  }],
  
  // ========================================
  // 🗑️ SOFT DELETE
  // ========================================
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Agrega createdAt y updatedAt automáticamente
});

// ========================================
// 📇 ÍNDICES PARA OPTIMIZACIÓN
// ========================================
// ✅ Índices compound para queries frecuentes
leadSchema.index({ estado: 1, fechaProximoSeguimiento: 1 }, { name: 'lead_estado_seguimiento' });
leadSchema.index({ 'asignadoA.userId': 1, estado: 1, createdAt: -1 }, { name: 'lead_asignado_estado_fecha' });
leadSchema.index({ origen: 1, createdAt: -1 }, { name: 'lead_origen_fecha' });
leadSchema.index({ tipoServicio: 1, estado: 1, createdAt: -1 }, { name: 'lead_servicio_estado_fecha' });
leadSchema.index({ prioridad: 1, estado: 1, createdAt: -1 }, { name: 'lead_prioridad_estado_fecha' });

// ✅ Índices adicionales para búsquedas comunes
leadSchema.index({ activo: 1, 'asignadoA.userId': 1 }, { name: 'lead_activo_asignado' });
leadSchema.index({ 'usuarioRegistrado.userId': 1, activo: 1 }, { name: 'lead_usuario_activo' });
leadSchema.index({ createdAt: -1 }, { name: 'lead_fecha_creacion' });
leadSchema.index({ nombre: 'text', correo: 'text', empresa: 'text' }, { name: 'lead_text_search' });

// ========================================
// 🔧 MÉTODOS DEL MODELO
// ========================================

/**
 * Agregar actividad al lead
 * @param {string} tipo - Tipo de actividad
 * @param {string} descripcion - Descripción de la actividad
 * @param {object} usuario - Información del usuario (de Clerk)
 */
leadSchema.methods.agregarActividad = function(tipo, descripcion, usuario) {
  this.actividades.push({
    tipo,
    descripcion,
    usuarioId: usuario.id,
    usuarioNombre: `${usuario.firstName || ''} ${usuario.lastName || ''}`.trim() || usuario.email
  });
  return this.save();
};

/**
 * Cambiar estado del lead con logging automático
 * @param {string} nuevoEstado - Nuevo estado del lead
 * @param {string} razon - Razón del cambio
 * @param {object} usuario - Información del usuario (de Clerk)
 */
leadSchema.methods.cambiarEstado = function(nuevoEstado, razon, usuario) {
  const estadoAnterior = this.estado;
  this.estado = nuevoEstado;
  
  return this.agregarActividad(
    'cambio_estado',
    `Estado cambiado de "${estadoAnterior}" a "${nuevoEstado}". ${razon ? `Razón: ${razon}` : ''}`,
    usuario
  );
};

/**
 * Asignar lead a un usuario
 * @param {object} usuario - Información del usuario a asignar
 * @param {object} asignadoPor - Usuario que hace la asignación
 */
leadSchema.methods.asignarA = function(usuario, asignadoPor) {
  this.asignadoA = {
    userId: usuario.id,
    nombre: `${usuario.firstName || ''} ${usuario.lastName || ''}`.trim(),
    email: usuario.emailAddresses?.[0]?.emailAddress || usuario.email
  };
  
  return this.agregarActividad(
    'nota',
    `Lead asignado a ${this.asignadoA.nombre}`,
    asignadoPor
  );
};

// ========================================
// 💬 MÉTODOS DE MENSAJERÍA
// ========================================

/**
 * Vincular lead con usuario registrado
 * @param {object} usuario - Información del usuario registrado (cliente)
 * @param {object} vinculadoPor - Usuario que hace la vinculación
 */
leadSchema.methods.vincularUsuario = function(usuario, vinculadoPor) {
  this.usuarioRegistrado = {
    userId: usuario.id || usuario.clerkId,
    nombre: `${usuario.firstName || ''} ${usuario.lastName || ''}`.trim() || usuario.email,
    email: usuario.email || usuario.emailAddresses?.[0]?.emailAddress,
    vinculadoEn: new Date(),
    vinculadoPor: {
      userId: vinculadoPor.id || vinculadoPor.clerkId,
      nombre: `${vinculadoPor.firstName || ''} ${vinculadoPor.lastName || ''}`.trim()
    }
  };
  
  return this.agregarActividad(
    'nota',
    `Lead vinculado con usuario registrado: ${this.usuarioRegistrado.email}`,
    vinculadoPor
  );
};

/**
 * Agregar mensaje interno (nota privada del equipo)
 * @param {string} contenido - Contenido del mensaje
 * @param {object} usuario - Usuario que envía el mensaje
 * @param {array} adjuntos - Archivos adjuntos (opcional)
 */
leadSchema.methods.agregarMensajeInterno = function(contenido, usuario, adjuntos = []) {
  this.actividades.push({
    tipo: 'mensaje_interno',
    descripcion: contenido,
    usuarioId: usuario.id || usuario.clerkId,
    usuarioNombre: `${usuario.firstName || ''} ${usuario.lastName || ''}`.trim() || usuario.email,
    esPrivado: true,
    direccion: 'interno',
    estadoMensaje: 'enviado',
    adjuntos: adjuntos
  });
  return this.save();
};

/**
 * Enviar mensaje al cliente
 * @param {string} contenido - Contenido del mensaje
 * @param {object} usuario - Usuario que envía el mensaje
 * @param {array} adjuntos - Archivos adjuntos (opcional)
 */
leadSchema.methods.enviarMensajeCliente = function(contenido, usuario, adjuntos = []) {
  if (!this.usuarioRegistrado?.userId) {
    throw new Error('El lead no tiene un usuario registrado vinculado');
  }
  
  this.actividades.push({
    tipo: 'mensaje_cliente',
    descripcion: contenido,
    usuarioId: usuario.id || usuario.clerkId,
    usuarioNombre: `${usuario.firstName || ''} ${usuario.lastName || ''}`.trim() || usuario.email,
    esPrivado: false,
    direccion: 'saliente',
    estadoMensaje: 'enviado',
    destinatarioId: this.usuarioRegistrado.userId,
    adjuntos: adjuntos
  });
  return this.save();
};

/**
 * Registrar respuesta del cliente
 * @param {string} contenido - Contenido de la respuesta
 * @param {object} usuario - Usuario cliente que responde
 * @param {string} actividadId - ID de la actividad a la que responde (opcional)
 */
leadSchema.methods.registrarRespuestaCliente = function(contenido, usuario, actividadId = null) {
  this.actividades.push({
    tipo: 'mensaje_cliente',
    descripcion: contenido,
    usuarioId: usuario.id || usuario.clerkId,
    usuarioNombre: `${usuario.firstName || ''} ${usuario.lastName || ''}`.trim() || usuario.email,
    esPrivado: false,
    direccion: 'entrante',
    estadoMensaje: 'enviado',
    respondidoA: actividadId
  });
  return this.save();
};

/**
 * Marcar mensaje como leído
 * @param {string} actividadId - ID de la actividad/mensaje
 */
leadSchema.methods.marcarMensajeLeido = function(actividadId) {
  const actividad = this.actividades.id(actividadId);
  if (actividad) {
    actividad.readAt = new Date();
    actividad.estadoMensaje = 'leido';
  }
  return this.save();
};

/**
 * Obtener timeline completo de mensajes
 * @param {boolean} incluirPrivados - Si se incluyen mensajes internos
 * @returns {array} Array de actividades filtradas
 */
leadSchema.methods.obtenerTimeline = function(incluirPrivados = false) {
  if (incluirPrivados) {
    return this.actividades.sort((a, b) => b.fecha - a.fecha);
  }
  // Solo mensajes no privados (visibles para el cliente)
  return this.actividades
    .filter(act => !act.esPrivado)
    .sort((a, b) => b.fecha - a.fecha);
};

/**
 * Contar mensajes no leídos
 * @param {string} userId - ID del usuario (para filtrar mensajes dirigidos a él)
 * @returns {number} Cantidad de mensajes no leídos
 */
leadSchema.methods.contarMensajesNoLeidos = function(userId) {
  return this.actividades.filter(act => 
    (act.destinatarioId === userId || 
     (act.direccion === 'saliente' && this.usuarioRegistrado?.userId === userId)) &&
    !act.readAt &&
    act.estadoMensaje !== 'leido'
  ).length;
};

// ========================================
// 📊 MÉTODOS ESTÁTICOS
// ========================================

/**
 * Obtener estadísticas generales
 */
leadSchema.statics.getEstadisticasGenerales = async function() {
  const [porEstado, porPrioridad, porOrigen, total] = await Promise.all([
    this.aggregate([
      { $match: { activo: true } },
      { $group: { _id: '$estado', count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { activo: true } },
      { $group: { _id: '$prioridad', count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { activo: true } },
      { $group: { _id: '$origen', count: { $sum: 1 } } }
    ]),
    this.countDocuments({ activo: true })
  ]);
  
  return {
    total,
    porEstado,
    porPrioridad,
    porOrigen
  };
};

/**
 * Obtener leads pendientes de seguimiento
 */
leadSchema.statics.getLeadsPendientesSeguimiento = async function() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  return this.find({
    activo: true,
    fechaProximoSeguimiento: { $lte: hoy },
    estado: { $nin: ['ganado', 'perdido'] }
  }).sort({ fechaProximoSeguimiento: 1 });
};

// ========================================
// 🎨 VIRTUAL PROPERTIES
// ========================================

/**
 * Obtener última actividad
 */
leadSchema.virtual('ultimaActividad').get(function() {
  if (this.actividades && this.actividades.length > 0) {
    return this.actividades[this.actividades.length - 1];
  }
  return null;
});

/**
 * Días desde creación
 */
leadSchema.virtual('diasDesdeCreacion').get(function() {
  if (this.createdAt) {
    const diff = Date.now() - this.createdAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// ========================================
// ⚙️ CONFIGURACIÓN DE SERIALIZACIÓN
// ========================================
leadSchema.set('toJSON', { virtuals: true });
leadSchema.set('toObject', { virtuals: true });

export default mongoose.model('Lead', leadSchema);
