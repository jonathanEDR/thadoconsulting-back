import mongoose from 'mongoose';

/**
 * 🔔 Modelo de Notificación
 * Almacena notificaciones para usuarios del sistema
 */

const notificationSchema = new mongoose.Schema({
  // Usuario destinatario
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Clerk ID del usuario (para búsquedas rápidas)
  clerkId: {
    type: String,
    required: true,
    index: true
  },
  
  // Tipo de notificación
  tipo: {
    type: String,
    required: true,
    enum: [
      'usuario_creado',
      'usuario_actualizado',
      'usuario_eliminado',
      'sesion_creada',
      'sesion_revocada',
      'invitacion_creada',
      'invitacion_aceptada',
      'mensaje_interno',
      'mensaje_cliente',
      'respuesta_cliente',
      'respuesta_equipo',
      'lead_asignado',
      'lead_estado_cambio',
      'usuario_vinculado',
      'comentario_nuevo',
      'comentario_aprobado',
      'comentario_rechazado',
      'comentario_respuesta',
      'sistema',
      'alerta',
      'recordatorio',
      'tarea'
    ],
    index: true
  },
  
  // Contenido
  titulo: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  mensaje: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Prioridad
  prioridad: {
    type: String,
    enum: ['baja', 'normal', 'alta', 'urgente'],
    default: 'normal',
    index: true
  },
  
  // Acción asociada (opcional)
  accion: {
    tipo: {
      type: String,
      enum: ['link', 'modal', 'action']
    },
    url: String,
    label: String,
    actionId: String
  },
  
  // Origen de la notificación
  origen: {
    tipo: {
      type: String,
      enum: ['lead', 'mensaje', 'usuario', 'comentario', 'sistema', 'blog']
    },
    id: String,
    nombre: String
  },
  
  // Metadata adicional
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Estado de lectura
  leido: {
    type: Boolean,
    default: false,
    index: true
  },
  
  leidoEn: {
    type: Date
  },
  
  // Estado de archivado
  archivado: {
    type: Boolean,
    default: false,
    index: true
  },
  
  archivadoEn: {
    type: Date
  },
  
  // Fecha de expiración (auto-eliminación)
  // El índice TTL se define abajo con schema.index()
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
  }
  
}, {
  timestamps: true
});

// Índices compuestos para consultas frecuentes
notificationSchema.index({ clerkId: 1, leido: 1, archivado: 1 });
notificationSchema.index({ clerkId: 1, createdAt: -1 });
notificationSchema.index({ clerkId: 1, prioridad: 1, leido: 1 });

// Nota: El índice TTL para auto-eliminación debe configurarse manualmente en MongoDB
// si es necesario: db.notifications.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Métodos estáticos

/**
 * Obtener notificaciones de un usuario
 */
notificationSchema.statics.getForUser = async function(clerkId, options = {}) {
  const {
    tipo,
    prioridad,
    leido,
    archivado = false,
    desde,
    hasta,
    page = 1,
    limit = 20
  } = options;
  
  const query = { clerkId, archivado };
  
  if (tipo) query.tipo = tipo;
  if (prioridad) query.prioridad = prioridad;
  if (leido !== undefined) query.leido = leido;
  if (desde || hasta) {
    query.createdAt = {};
    if (desde) query.createdAt.$gte = new Date(desde);
    if (hasta) query.createdAt.$lte = new Date(hasta);
  }
  
  const skip = (page - 1) * limit;
  
  const [notifications, total] = await Promise.all([
    this.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);
  
  return {
    data: notifications,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Obtener conteo de no leídas por prioridad
 */
notificationSchema.statics.getUnreadCount = async function(clerkId) {
  const result = await this.aggregate([
    { $match: { clerkId, leido: false, archivado: false } },
    {
      $group: {
        _id: '$prioridad',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const porPrioridad = {
    urgente: 0,
    alta: 0,
    normal: 0,
    baja: 0
  };
  
  let total = 0;
  result.forEach(item => {
    porPrioridad[item._id] = item.count;
    total += item.count;
  });
  
  return { count: total, porPrioridad };
};

/**
 * Crear notificación para un usuario
 */
notificationSchema.statics.crearParaUsuario = async function(userId, clerkId, data) {
  return this.create({
    userId,
    clerkId,
    ...data
  });
};

/**
 * Crear notificación para múltiples usuarios
 */
notificationSchema.statics.crearParaUsuarios = async function(usuarios, data) {
  const notificaciones = usuarios.map(u => ({
    userId: u._id,
    clerkId: u.clerkId,
    ...data
  }));
  
  return this.insertMany(notificaciones);
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
