import mongoose from 'mongoose';

/**
 * 📋 Schema de Documento del Cliente
 * Registra documentos/archivos relevantes del cliente (PDTs, vouchers, etc.)
 */
const documentoClienteSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    enum: ['pdt', 'voucher', 'contrato', 'constancia', 'declaracion', 'otro'],
    default: 'otro'
  },
  url: {
    type: String,
    required: true
  },
  periodo: {
    type: String, // Formato YYYY-MM
    default: null
  },
  notas: {
    type: String,
    default: ''
  },
  subidoPor: {
    userId: String,
    nombre: String
  },
  fechaSubida: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

/**
 * 📝 Schema de Nota/Actividad del Cliente Contable
 * Historial de interacciones y notas del contador
 */
const notaClienteSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['nota', 'llamada', 'email', 'reunion', 'recordatorio', 'cambio_estado'],
    default: 'nota'
  },
  descripcion: {
    type: String,
    required: true
  },
  creadoPor: {
    userId: String,
    nombre: String
  },
  fecha: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

/**
 * 🏢 Schema Principal de Cliente Contable
 * Modelo completo para gestión de clientes del estudio contable
 */
const clienteContableSchema = new mongoose.Schema(
  {
    // ========================================
    // 🏢 INFORMACIÓN FISCAL
    // ========================================
    ruc: {
      type: String,
      required: [true, 'El RUC es requerido'],
      unique: true,
      trim: true,
      minlength: [11, 'El RUC debe tener 11 dígitos'],
      maxlength: [11, 'El RUC debe tener 11 dígitos'],
      match: [/^\d{11}$/, 'El RUC debe contener solo 11 dígitos numéricos'],
      index: true
    },
    razonSocial: {
      type: String,
      required: [true, 'La razón social es requerida'],
      trim: true,
      index: true
    },
    nombreComercial: {
      type: String,
      trim: true,
      default: ''
    },
    regimenTributario: {
      type: String,
      enum: {
        values: ['RUS', 'RER', 'MYPE', 'GENERAL'],
        message: 'Régimen tributario inválido. Opciones: RUS, RER, MYPE, GENERAL'
      },
      required: [true, 'El régimen tributario es requerido']
    },
    
    // ========================================
    // 🏠 DIRECCIÓN FISCAL
    // ========================================
    direccionFiscal: {
      type: String,
      trim: true,
      default: ''
    },
    
    // ========================================
    // 👤 REPRESENTANTE LEGAL
    // ========================================
    representante: {
      nombre: {
        type: String,
        trim: true,
        default: ''
      },
      dni: {
        type: String,
        trim: true,
        default: ''
      },
      cargo: {
        type: String,
        trim: true,
        default: 'Gerente General'
      }
    },
    
    // ========================================
    // 📞 CONTACTO
    // ========================================
    contacto: {
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
      },
      telefono: {
        type: String,
        trim: true,
        default: ''
      },
      celular: {
        type: String,
        trim: true,
        default: ''
      }
    },
    
    // ========================================
    // 💰 HONORARIOS
    // ========================================
    honorarioMensual: {
      type: Number,
      min: [0, 'El honorario no puede ser negativo'],
      default: 0
    },
    moneda: {
      type: String,
      enum: ['PEN', 'USD'],
      default: 'PEN'
    },
    
    // ========================================
    // 📁 GOOGLE DRIVE
    // ========================================
    linkDrive: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: function(v) {
          if (!v) return true; // Vacío es válido
          return /^https?:\/\/.+/.test(v);
        },
        message: 'El link de Drive debe ser una URL válida'
      }
    },
    
    // ========================================
    // 👤 VINCULACIÓN CON USUARIO DEL SISTEMA
    // ========================================
    // Permite que el cliente acceda a su portal con su cuenta
    usuarioVinculado: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
      },
      clerkId: {
        type: String,
        default: null,
        index: true
      },
      email: {
        type: String,
        default: null
      },
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
    // 📜 DOCUMENTOS Y NOTAS
    // ========================================
    documentos: [documentoClienteSchema],
    notas: [notaClienteSchema],
    
    // ========================================
    // 📊 CONFIGURACIÓN TRIBUTARIA ESPECÍFICA
    // ========================================
    configuracionTributaria: {
      // Para RUS: categoría
      categoriaRUS: {
        type: Number,
        enum: [1, 2],
        default: null
      },
      // Para MYPE/General: coeficiente de renta mensual
      coeficienteRenta: {
        type: Number,
        min: 0,
        max: 1,
        default: null // null = usar porcentaje mínimo (1% ó 1.5%)
      },
      // Actividad económica
      actividadEconomica: {
        type: String,
        trim: true,
        default: ''
      },
      // Obligaciones tributarias activas
      obligaciones: {
        igv: { type: Boolean, default: true },
        renta: { type: Boolean, default: true },
        planilla: { type: Boolean, default: false },
        librosElectronicos: { type: Boolean, default: false }
      }
    },
    
    // ========================================
    // 📅 FECHA DE INICIO
    // ========================================
    fechaInicioServicios: {
      type: Date,
      default: Date.now
    },
    
    // ========================================
    // 🏷️ TAGS Y CATEGORIZACIÓN
    // ========================================
    tags: [{
      type: String,
      trim: true
    }],
    
    // ========================================
    // 👨‍💼 ASIGNACIÓN
    // ========================================
    contadorAsignado: {
      userId: {
        type: String, // Clerk user ID
        default: null,
        index: true
      },
      nombre: {
        type: String,
        default: ''
      },
      email: {
        type: String,
        default: ''
      }
    },
    
    // ========================================
    // 🗑️ SOFT DELETE Y ESTADO
    // ========================================
    activo: {
      type: Boolean,
      default: true,
      index: true
    },
    estado: {
      type: String,
      enum: ['activo', 'suspendido', 'baja'],
      default: 'activo',
      index: true
    },
    motivoBaja: {
      type: String,
      default: ''
    },
    fechaBaja: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ========================================
// 🔍 ÍNDICES COMPUESTOS
// ========================================
clienteContableSchema.index({ razonSocial: 'text', ruc: 'text', 'representante.nombre': 'text' });
clienteContableSchema.index({ estado: 1, activo: 1 });
clienteContableSchema.index({ regimenTributario: 1, activo: 1 });
clienteContableSchema.index({ 'contadorAsignado.userId': 1, activo: 1 });

// ========================================
// 🔧 VIRTUALS
// ========================================

// Último dígito del RUC (para cronograma SUNAT)
clienteContableSchema.virtual('digitoRuc').get(function() {
  if (!this.ruc) return null;
  return parseInt(this.ruc.charAt(this.ruc.length - 1));
});

// Nombre completo para mostrar
clienteContableSchema.virtual('displayName').get(function() {
  return this.nombreComercial || this.razonSocial;
});

// ========================================
// 🔧 MÉTODOS DE INSTANCIA
// ========================================

// Verificar si el cliente tiene usuario vinculado
clienteContableSchema.methods.tieneUsuarioVinculado = function() {
  return !!(this.usuarioVinculado && this.usuarioVinculado.userId);
};

// Obtener la cuota fija RUS según categoría
clienteContableSchema.methods.getCuotaRUS = function() {
  const cuotas = {
    1: 20,  // Categoría 1: S/ 20
    2: 50   // Categoría 2: S/ 50
  };
  if (this.regimenTributario !== 'RUS') return null;
  return cuotas[this.configuracionTributaria?.categoriaRUS] || null;
};

// Dar de baja lógica
clienteContableSchema.methods.darDeBaja = function(motivo) {
  this.activo = false;
  this.estado = 'baja';
  this.motivoBaja = motivo || 'Baja solicitada';
  this.fechaBaja = new Date();
  return this.save();
};

// Reactivar cliente
clienteContableSchema.methods.reactivar = function() {
  this.activo = true;
  this.estado = 'activo';
  this.motivoBaja = '';
  this.fechaBaja = null;
  return this.save();
};

// ========================================
// 🔧 MÉTODOS ESTÁTICOS
// ========================================

// Buscar por RUC
clienteContableSchema.statics.findByRuc = function(ruc) {
  return this.findOne({ ruc, activo: true });
};

// Buscar clientes activos
clienteContableSchema.statics.findActivos = function() {
  return this.find({ activo: true, estado: 'activo' }).sort({ razonSocial: 1 });
};

// Buscar por usuario vinculado (para portal del cliente)
clienteContableSchema.statics.findByUsuarioVinculado = function(clerkId) {
  return this.findOne({ 
    'usuarioVinculado.clerkId': clerkId, 
    activo: true 
  });
};

// Contar por régimen
clienteContableSchema.statics.contarPorRegimen = function() {
  return this.aggregate([
    { $match: { activo: true } },
    { $group: { _id: '$regimenTributario', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

// ========================================
// 🔧 MIDDLEWARE (PRE-SAVE)
// ========================================
clienteContableSchema.pre('save', function(next) {
  // Normalizar RUC (solo dígitos)
  if (this.ruc) {
    this.ruc = this.ruc.replace(/\D/g, '');
  }
  
  // Si no hay nombre comercial, usar razón social
  if (!this.nombreComercial) {
    this.nombreComercial = this.razonSocial;
  }
  
  next();
});

const ClienteContable = mongoose.model('ClienteContable', clienteContableSchema);

export default ClienteContable;
