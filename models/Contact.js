import mongoose from 'mongoose';

/**
 * 📝 Schema de Notas de Contacto
 * Registro de interacciones y seguimiento
 */
const contactNoteSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['nota', 'llamada', 'email', 'reunion', 'seguimiento'],
    default: 'nota'
  },
  contenido: {
    type: String,
    required: true
  },
  autor: {
    userId: { type: String },
    userName: { type: String },
    userEmail: { type: String }
  },
  fecha: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

/**
 * 🎯 Schema Principal de Contact
 * Diseño escalable para soportar formularios dinámicos en el futuro
 */
const contactSchema = new mongoose.Schema({
  // 📋 Información básica del contacto (campos actuales del formulario)
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  
  celular: {
    type: String,
    required: [true, 'El celular es requerido'],
    trim: true,
    validate: {
      validator: function(v) {
        // Validar formato de teléfono (flexible para diferentes países)
        return /^[\d\s\+\-\(\)]+$/.test(v);
      },
      message: 'Formato de celular inválido'
    }
  },
  
  correo: {
    type: String,
    required: [true, 'El correo es requerido'],
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Formato de correo inválido'
    }
  },
  
  mensaje: {
    type: String,
    required: [true, 'El mensaje es requerido'],
    trim: true,
    minlength: [10, 'El mensaje debe tener al menos 10 caracteres'],
    maxlength: [2000, 'El mensaje no puede exceder 2000 caracteres']
  },

  // 📊 Estado y gestión
  estado: {
    type: String,
    enum: ['nuevo', 'leido', 'en_proceso', 'respondido', 'archivado'],
    default: 'nuevo',
    index: true
  },

  // 🎯 Prioridad (opcional, útil para gestión)
  prioridad: {
    type: String,
    enum: ['baja', 'media', 'alta', 'urgente'],
    default: 'media'
  },

  // 👤 Asignación (opcional)
  asignadoA: {
    userId: { type: String },
    userName: { type: String },
    userEmail: { type: String },
    fechaAsignacion: { type: Date }
  },

  // 📌 Origen del contacto
  origen: {
    type: String,
    enum: ['web', 'landing', 'formulario_dinamico', 'api', 'manual'],
    default: 'web',
    index: true
  },

  // 🔖 Tipo de formulario (para futura escalabilidad)
  tipoFormulario: {
    type: String,
    default: 'contacto_general',
    index: true
  },

  // 📦 Campos dinámicos (para formularios personalizados futuros)
  // Permite almacenar campos adicionales sin modificar el schema
  camposDinamicos: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },

  // 📝 Notas y seguimiento
  notas: [contactNoteSchema],

  // 📅 Fechas importantes
  fechaCreacion: {
    type: Date,
    default: Date.now,
    index: true
  },

  fechaLectura: {
    type: Date
  },

  fechaRespuesta: {
    type: Date
  },

  fechaArchivado: {
    type: Date
  },

  // 🔍 Metadata técnica
  metadata: {
    ip: { type: String },
    userAgent: { type: String },
    referrer: { type: String },
    idioma: { type: String, default: 'es' },
    navegador: { type: String },
    dispositivo: { type: String }
  },

  // 🏷️ Tags/Etiquetas (para categorización futura)
  etiquetas: [{
    type: String,
    trim: true
  }],

  // ⭐ Rating/Calificación (opcional)
  calificacion: {
    type: Number,
    min: 1,
    max: 5
  }

}, {
  timestamps: true, // Agrega createdAt y updatedAt automáticamente
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 📊 Índices para búsquedas eficientes
contactSchema.index({ estado: 1, fechaCreacion: -1 });
contactSchema.index({ correo: 1 });
contactSchema.index({ 'asignadoA.userId': 1, estado: 1 });
contactSchema.index({ origen: 1, tipoFormulario: 1 });
contactSchema.index({ prioridad: 1, estado: 1 });
contactSchema.index({ etiquetas: 1 });

// 🔧 MÉTODOS DE INSTANCIA

/**
 * Cambiar estado del contacto con registro
 */
contactSchema.methods.cambiarEstado = function(nuevoEstado, usuario) {
  const estadosValidos = ['nuevo', 'leido', 'en_proceso', 'respondido', 'archivado'];
  
  if (!estadosValidos.includes(nuevoEstado)) {
    throw new Error(`Estado inválido: ${nuevoEstado}`);
  }

  const estadoAnterior = this.estado;
  this.estado = nuevoEstado;

  // Actualizar fechas según el estado
  switch (nuevoEstado) {
    case 'leido':
      if (!this.fechaLectura) {
        this.fechaLectura = new Date();
      }
      break;
    case 'respondido':
      if (!this.fechaRespuesta) {
        this.fechaRespuesta = new Date();
      }
      break;
    case 'archivado':
      if (!this.fechaArchivado) {
        this.fechaArchivado = new Date();
      }
      break;
  }

  // Agregar nota automática del cambio de estado
  this.notas.push({
    tipo: 'nota',
    contenido: `Estado cambiado de "${estadoAnterior}" a "${nuevoEstado}"`,
    autor: usuario || {},
    fecha: new Date()
  });

  return this;
};

/**
 * Agregar nota al contacto
 */
contactSchema.methods.agregarNota = function(tipo, contenido, usuario) {
  this.notas.push({
    tipo: tipo || 'nota',
    contenido,
    autor: usuario || {},
    fecha: new Date()
  });
  return this;
};

/**
 * Asignar contacto a un usuario
 */
contactSchema.methods.asignarA = function(usuario) {
  this.asignadoA = {
    userId: usuario.userId || usuario.clerkId,
    userName: usuario.userName || usuario.nombre,
    userEmail: usuario.userEmail || usuario.email,
    fechaAsignacion: new Date()
  };

  // Agregar nota de asignación
  this.notas.push({
    tipo: 'nota',
    contenido: `Contacto asignado a ${usuario.userName || usuario.nombre}`,
    autor: usuario,
    fecha: new Date()
  });

  return this;
};

/**
 * Agregar campo dinámico (para formularios futuros)
 */
contactSchema.methods.agregarCampoDinamico = function(clave, valor) {
  if (!this.camposDinamicos) {
    this.camposDinamicos = new Map();
  }
  this.camposDinamicos.set(clave, valor);
  return this;
};

// 📈 MÉTODOS ESTÁTICOS

/**
 * Obtener estadísticas generales
 */
contactSchema.statics.getEstadisticasGenerales = async function() {
  const estadisticas = await this.aggregate([
    {
      $facet: {
        porEstado: [
          { $group: { _id: '$estado', count: { $sum: 1 } } }
        ],
        porOrigen: [
          { $group: { _id: '$origen', count: { $sum: 1 } } }
        ],
        porPrioridad: [
          { $group: { _id: '$prioridad', count: { $sum: 1 } } }
        ],
        total: [
          { $count: 'count' }
        ],
        hoy: [
          { 
            $match: { 
              fechaCreacion: { 
                $gte: new Date(new Date().setHours(0, 0, 0, 0)) 
              } 
            } 
          },
          { $count: 'count' }
        ],
        sinLeer: [
          { $match: { estado: 'nuevo' } },
          { $count: 'count' }
        ]
      }
    }
  ]);

  return {
    porEstado: estadisticas[0].porEstado,
    porOrigen: estadisticas[0].porOrigen,
    porPrioridad: estadisticas[0].porPrioridad,
    total: estadisticas[0].total[0]?.count || 0,
    hoy: estadisticas[0].hoy[0]?.count || 0,
    sinLeer: estadisticas[0].sinLeer[0]?.count || 0
  };
};

/**
 * Obtener contactos pendientes (nuevos o en proceso)
 */
contactSchema.statics.getContactosPendientes = async function() {
  return this.find({
    estado: { $in: ['nuevo', 'en_proceso'] }
  })
    .sort({ prioridad: -1, fechaCreacion: -1 })
    .limit(50);
};

/**
 * Buscar contactos por texto
 */
contactSchema.statics.buscarPorTexto = async function(texto) {
  const regex = new RegExp(texto, 'i');
  return this.find({
    $or: [
      { nombre: regex },
      { correo: regex },
      { celular: regex },
      { mensaje: regex }
    ]
  }).sort({ fechaCreacion: -1 });
};

// 🎨 VIRTUALS

/**
 * Última nota agregada
 */
contactSchema.virtual('ultimaNota').get(function() {
  if (this.notas && this.notas.length > 0) {
    return this.notas[this.notas.length - 1];
  }
  return null;
});

/**
 * Días desde la creación
 */
contactSchema.virtual('diasDesdeCreacion').get(function() {
  const ahora = new Date();
  const diferencia = ahora - this.fechaCreacion;
  return Math.floor(diferencia / (1000 * 60 * 60 * 24));
});

/**
 * Tiempo de respuesta (si fue respondido)
 */
contactSchema.virtual('tiempoRespuesta').get(function() {
  if (this.fechaRespuesta) {
    const diferencia = this.fechaRespuesta - this.fechaCreacion;
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    return `${horas} horas`;
  }
  return null;
});

// 📋 PRE-SAVE HOOKS

/**
 * Antes de guardar: Normalizar datos
 */
contactSchema.pre('save', function(next) {
  // Capitalizar nombre
  if (this.nombre) {
    this.nombre = this.nombre
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Limpiar espacios en celular
  if (this.celular) {
    this.celular = this.celular.trim();
  }

  next();
});

/**
 * Crear modelo
 */
const Contact = mongoose.model('Contact', contactSchema);

export default Contact;
