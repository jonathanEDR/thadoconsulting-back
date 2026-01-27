/**
 * Modelo de Eventos/Agenda
 * Gestión de reuniones, citas, recordatorios y eventos
 */

import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  // ========================================
  // INFORMACIÓN BÁSICA
  // ========================================
  title: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
    maxlength: [200, 'El título no puede exceder 200 caracteres']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
  },

  // ========================================
  // CATEGORIZACIÓN
  // ========================================
  type: {
    type: String,
    enum: {
      values: ['meeting', 'appointment', 'reminder', 'event'],
      message: 'Tipo de evento inválido. Debe ser: meeting, appointment, reminder o event'
    },
    required: [true, 'El tipo de evento es requerido'],
    index: true
  },

  category: {
    type: String,
    enum: ['cliente', 'interno', 'personal', 'otro'],
    default: 'otro'
  },

  // ========================================
  // TEMPORALIDAD
  // ========================================
  startDate: {
    type: Date,
    required: [true, 'La fecha de inicio es requerida'],
    index: true
  },

  endDate: {
    type: Date,
    required: [true, 'La fecha de fin es requerida'],
    index: true,
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'La fecha de fin debe ser posterior a la fecha de inicio'
    }
  },

  allDay: {
    type: Boolean,
    default: false
  },

  timezone: {
    type: String,
    default: 'America/Lima'
  },

  // ========================================
  // PARTICIPANTES
  // ========================================
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El organizador es requerido'],
    index: true
  },

  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          // Email opcional, pero si existe debe ser válido
          if (!v) return true;
          return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
        },
        message: 'Email inválido'
      }
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'maybe'],
      default: 'pending'
    },
    notified: {
      type: Boolean,
      default: false
    },
    notifiedAt: {
      type: Date
    }
  }],

  // ========================================
  // UBICACIÓN
  // ========================================
  location: {
    type: {
      type: String,
      enum: ['physical', 'virtual', 'phone', 'none'],
      default: 'none'
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'La dirección no puede exceder 200 caracteres']
    },
    virtualLink: {
      type: String,
      trim: true,
      maxlength: [500, 'El link virtual no puede exceder 500 caracteres']
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'El teléfono no puede exceder 20 caracteres']
    }
  },

  // ========================================
  // RECORDATORIOS
  // ========================================
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'system', 'push'],
      default: 'email'
    },
    minutesBefore: {
      type: Number,
      required: true,
      min: [0, 'Los minutos deben ser positivos'],
      max: [43200, 'Máximo 30 días de anticipación'] // 30 días
    },
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: {
      type: Date
    }
  }],

  // ========================================
  // ESTADO Y VISIBILIDAD
  // ========================================
  status: {
    type: String,
    enum: {
      values: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      message: 'Estado inválido'
    },
    default: 'scheduled',
    index: true
  },

  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: 'Prioridad inválida'
    },
    default: 'medium'
  },

  visibility: {
    type: String,
    enum: ['private', 'public', 'shared'],
    default: 'private'
  },

  // ========================================
  // METADATOS Y PERSONALIZACIÓN
  // ========================================
  color: {
    type: String,
    default: '#2554a3',
    validate: {
      validator: function(v) {
        // Validar formato hex color
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Color debe ser formato hexadecimal (#RRGGBB)'
    }
  },

  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],

  attachments: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      trim: true
    },
    size: {
      type: Number
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // ========================================
  // NOTAS Y RESULTADOS
  // ========================================
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Las notas no pueden exceder 2000 caracteres']
  },

  outcome: {
    type: String,
    trim: true,
    maxlength: [1000, 'El resultado no puede exceder 1000 caracteres']
  },

  // ========================================
  // INTEGRACIÓN CON OTROS MODELOS
  // ========================================
  relatedTo: {
    type: {
      type: String,
      enum: ['lead', 'service', 'blog', 'user', 'none'],
      default: 'none'
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedTo.type'
    }
  },

  // ========================================
  // AUDITORÍA
  // ========================================
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  cancelledAt: {
    type: Date
  },

  cancelReason: {
    type: String,
    trim: true,
    maxlength: [500, 'La razón de cancelación no puede exceder 500 caracteres']
  }

}, {
  timestamps: true, // createdAt, updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========================================
// ÍNDICES COMPUESTOS
// ========================================

// Índice para búsquedas por rango de fechas
eventSchema.index({ startDate: 1, endDate: 1 });

// Índice para búsquedas por organizador y fecha
eventSchema.index({ organizer: 1, startDate: -1 });

// Índice para búsquedas por tipo, estado y fecha
eventSchema.index({ type: 1, status: 1, startDate: 1 });

// Índice para estado y prioridad
eventSchema.index({ status: 1, priority: 1 });

// NOTA: Los índices en subdocumentos ('attendees.user', 'attendees.email') 
// se crean automáticamente, no es necesario declararlos explícitamente

// ========================================
// VIRTUALS
// ========================================

// Duración del evento en minutos
eventSchema.virtual('durationMinutes').get(function() {
  if (this.startDate && this.endDate) {
    return Math.round((this.endDate - this.startDate) / (1000 * 60));
  }
  return 0;
});

// Verificar si el evento ya pasó
eventSchema.virtual('isPast').get(function() {
  return this.endDate < new Date();
});

// Verificar si el evento es hoy
eventSchema.virtual('isToday').get(function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.startDate >= today && this.startDate < tomorrow;
});

// Verificar si el evento está en progreso
eventSchema.virtual('isInProgress').get(function() {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now && this.status === 'scheduled';
});

// Total de participantes
eventSchema.virtual('attendeesCount').get(function() {
  return this.attendees ? this.attendees.length : 0;
});

// ========================================
// MIDDLEWARE PRE-SAVE
// ========================================

// Validar fechas antes de guardar
eventSchema.pre('save', function(next) {
  // Validar que endDate > startDate
  if (this.endDate <= this.startDate) {
    return next(new Error('La fecha de fin debe ser posterior a la fecha de inicio'));
  }

  // Validar máximo de participantes
  if (this.attendees && this.attendees.length > 50) {
    return next(new Error('Máximo 50 participantes por evento'));
  }

  // Si el evento se está cancelando, registrar fecha
  if (this.isModified('status') && this.status === 'cancelled' && !this.cancelledAt) {
    this.cancelledAt = new Date();
  }

  next();
});

// ========================================
// MÉTODOS DE INSTANCIA
// ========================================

/**
 * Agregar un participante al evento
 * @param {Object} attendee - { user: ObjectId, email: String }
 */
eventSchema.methods.addAttendee = function(attendee) {
  // Verificar que no exista ya
  const exists = this.attendees.some(a => {
    if (attendee.user && a.user) {
      return a.user.toString() === attendee.user.toString();
    }
    if (attendee.email && a.email) {
      return a.email === attendee.email;
    }
    return false;
  });

  if (!exists) {
    this.attendees.push({
      user: attendee.user,
      email: attendee.email,
      status: 'pending',
      notified: false
    });
  }

  return this;
};

/**
 * Eliminar un participante del evento
 * @param {String} userId - ID del usuario a eliminar
 */
eventSchema.methods.removeAttendee = function(userId) {
  this.attendees = this.attendees.filter(a => 
    a.user && a.user.toString() !== userId.toString()
  );
  return this;
};

/**
 * Actualizar estado de un participante
 * @param {String} userId - ID del usuario
 * @param {String} status - Nuevo estado
 */
eventSchema.methods.updateAttendeeStatus = function(userId, status) {
  const attendee = this.attendees.find(a => 
    a.user && a.user.toString() === userId.toString()
  );
  
  if (attendee) {
    attendee.status = status;
  }
  
  return this;
};

/**
 * Agregar un recordatorio
 * @param {Object} reminder - { type: String, minutesBefore: Number }
 */
eventSchema.methods.addReminder = function(reminder) {
  this.reminders.push({
    type: reminder.type || 'email',
    minutesBefore: reminder.minutesBefore,
    sent: false
  });
  return this;
};

/**
 * Marcar recordatorio como enviado
 * @param {String} reminderId - ID del recordatorio
 */
eventSchema.methods.markReminderSent = function(reminderId) {
  const reminder = this.reminders.id(reminderId);
  if (reminder) {
    reminder.sent = true;
    reminder.sentAt = new Date();
  }
  return this;
};

/**
 * Verificar si el evento necesita enviar recordatorios
 * @returns {Array} Array de recordatorios que deben enviarse
 */
eventSchema.methods.getPendingReminders = function() {
  const now = new Date();
  const eventTime = this.startDate.getTime();
  
  return this.reminders.filter(reminder => {
    if (reminder.sent) return false;
    
    const reminderTime = eventTime - (reminder.minutesBefore * 60 * 1000);
    return now.getTime() >= reminderTime;
  });
};

/**
 * Cancelar el evento
 * @param {String} userId - ID del usuario que cancela
 * @param {String} reason - Razón de cancelación
 */
eventSchema.methods.cancel = function(userId, reason) {
  this.status = 'cancelled';
  this.cancelledBy = userId;
  this.cancelledAt = new Date();
  this.cancelReason = reason;
  return this;
};

/**
 * Completar el evento
 * @param {String} outcome - Resultado del evento
 */
eventSchema.methods.complete = function(outcome) {
  this.status = 'completed';
  if (outcome) {
    this.outcome = outcome;
  }
  return this;
};

// ========================================
// MÉTODOS ESTÁTICOS
// ========================================

/**
 * Obtener eventos de un usuario (como organizador o participante)
 * @param {String} userId - ID del usuario
 * @param {Object} filters - Filtros adicionales
 */
eventSchema.statics.getEventsByUser = function(userId, filters = {}) {
  const query = {
    $or: [
      { organizer: userId },
      { 'attendees.user': userId }
    ],
    ...filters
  };

  return this.find(query)
    .populate('organizer', 'firstName lastName email profileImage')
    .populate('attendees.user', 'firstName lastName email profileImage')
    .sort({ startDate: 1 });
};

/**
 * Obtener eventos de hoy
 * @param {String} userId - ID del usuario
 */
eventSchema.statics.getTodayEvents = function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.getEventsByUser(userId, {
    startDate: { $gte: today, $lt: tomorrow },
    status: { $ne: 'cancelled' }
  });
};

/**
 * Obtener eventos de la semana
 * @param {String} userId - ID del usuario
 */
eventSchema.statics.getWeekEvents = function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return this.getEventsByUser(userId, {
    startDate: { $gte: today, $lt: weekEnd },
    status: { $ne: 'cancelled' }
  });
};

/**
 * Obtener próximos eventos
 * @param {String} userId - ID del usuario
 * @param {Number} days - Número de días hacia adelante
 */
eventSchema.statics.getUpcomingEvents = function(userId, days = 7) {
  const now = new Date();
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + days);

  return this.getEventsByUser(userId, {
    startDate: { $gte: now, $lte: futureDate },
    status: { $ne: 'cancelled' }
  });
};

/**
 * Obtener eventos por rango de fechas
 * @param {String} userId - ID del usuario
 * @param {Date} startDate - Fecha inicio
 * @param {Date} endDate - Fecha fin
 */
eventSchema.statics.getEventsByDateRange = function(userId, startDate, endDate) {
  return this.getEventsByUser(userId, {
    $or: [
      // Eventos que empiezan en el rango
      { startDate: { $gte: startDate, $lte: endDate } },
      // Eventos que terminan en el rango
      { endDate: { $gte: startDate, $lte: endDate } },
      // Eventos que abarcan todo el rango
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
    ]
  });
};

/**
 * Buscar eventos que necesitan enviar recordatorios
 */
eventSchema.statics.getEventsNeedingReminders = function() {
  const now = new Date();
  const futureLimit = new Date(now);
  futureLimit.setHours(futureLimit.getHours() + 24); // Próximas 24 horas

  return this.find({
    status: 'scheduled',
    startDate: { $gte: now, $lte: futureLimit },
    'reminders.sent': false
  })
  .populate('organizer', 'firstName lastName email')
  .populate('attendees.user', 'firstName lastName email');
};

// ========================================
// EXPORTAR MODELO
// ========================================

const Event = mongoose.model('Event', eventSchema);

export default Event;

