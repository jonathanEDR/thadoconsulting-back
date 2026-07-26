import mongoose from 'mongoose';

/**
 * 📅 Declaración Jurada Anual del Impuesto a la Renta (Formulario Virtual 710)
 * Aplica solo a régimen MYPE Tributario y Régimen General (RUS y RER no regularizan
 * anualmente). Concilia los pagos a cuenta mensuales de renta contra el impuesto
 * real calculado sobre la renta neta anual, aplicando tramos por UIT.
 */

const declaracionAnualSchema = new mongoose.Schema(
  {
    // ========================================
    // 🔗 RELACIONES
    // ========================================
    clienteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClienteContable',
      required: [true, 'El cliente es requerido'],
      index: true
    },

    // ========================================
    // 📅 PERIODO (ejercicio fiscal)
    // ========================================
    anio: {
      type: Number,
      required: [true, 'El año es requerido'],
      index: true
    },

    // Régimen del cliente al momento de calcular (snapshot, por si cambia después)
    regimenAplicado: {
      type: String,
      enum: {
        values: ['MYPE', 'GENERAL'],
        message: 'La Declaración Anual solo aplica a régimen MYPE Tributario o General'
      },
      required: true
    },

    // ========================================
    // 💰 BASE DE CÁLCULO
    // ========================================
    // Renta neta anual usada para el cálculo (auto-sugerida desde las declaraciones
    // mensuales del año, pero editable por el contador para ajustes tributarios)
    rentaNetaAnual: {
      type: Number,
      required: true,
      min: 0
    },
    // Valor auto-sugerido antes de cualquier ajuste manual (para trazabilidad)
    rentaNetaAnualSugerida: {
      type: Number,
      default: 0
    },
    // Cantidad de declaraciones mensuales de ese año consideradas en la sugerencia
    mesesDeclaradosConsiderados: {
      type: Number,
      default: 0
    },

    // ========================================
    // 🧮 CÁLCULO POR TRAMOS UIT
    // ========================================
    uitAplicada: {
      type: Number,
      required: true
    },
    tramos: {
      tramo1Base: { type: Number, default: 0 },
      tramo1Tasa: { type: Number, default: 0 },
      tramo1Impuesto: { type: Number, default: 0 },
      tramo2Base: { type: Number, default: 0 },
      tramo2Tasa: { type: Number, default: 0 },
      tramo2Impuesto: { type: Number, default: 0 }
    },
    // Impuesto anual real = tramo1Impuesto + tramo2Impuesto
    impuestoCalculado: {
      type: Number,
      required: true,
      min: 0
    },

    // ========================================
    // ⚖️ CONCILIACIÓN CONTRA PAGOS A CUENTA
    // ========================================
    // Suma de detalleRenta.rentaAPagar de las declaraciones mensuales activas del año
    totalPagosACuenta: {
      type: Number,
      required: true,
      min: 0
    },
    // Si el impuesto calculado > pagos a cuenta: diferencia a pagar (regularización)
    saldoAPagar: {
      type: Number,
      default: 0,
      min: 0
    },
    // Si los pagos a cuenta > impuesto calculado: a favor del contribuyente
    saldoAFavor: {
      type: Number,
      default: 0,
      min: 0
    },

    // ========================================
    // 📋 DATOS DE PRESENTACIÓN
    // ========================================
    formulario: {
      type: String,
      default: 'FV710'
    },
    numeroOrden: {
      type: String,
      trim: true,
      default: ''
    },
    pago: {
      montoPagado: { type: Number, min: 0, default: 0 },
      fechaPago: { type: Date, default: null },
      medioPago: {
        type: String,
        enum: ['banco', 'clave_sol', 'nps', 'efectivo', 'otro', ''],
        default: ''
      },
      numeroOperacion: { type: String, trim: true, default: '' },
      banco: { type: String, trim: true, default: '' }
    },
    fechaPresentacion: {
      type: Date,
      default: null
    },
    fechaVencimiento: {
      type: Date,
      default: null // Varía por último dígito de RUC; el contador la completa manualmente
    },

    // ========================================
    // 📊 ESTADO
    // ========================================
    estado: {
      type: String,
      enum: {
        values: ['PENDIENTE', 'PRESENTADO', 'PAGADO', 'VENCIDO', 'RECTIFICADO'],
        message: 'Estado inválido'
      },
      default: 'PENDIENTE',
      index: true
    },
    esRectificatoria: {
      type: Boolean,
      default: false
    },
    observaciones: {
      type: String,
      trim: true,
      default: ''
    },

    // ========================================
    // 👨‍💼 METADATOS
    // ========================================
    registradoPor: {
      userId: { type: String, required: true },
      nombre: String,
      email: String
    },

    // ========================================
    // 🗑️ SOFT DELETE
    // ========================================
    activo: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Único solo entre declaraciones activas: al eliminar una, debe poder
// registrarse una nueva para el mismo cliente/año.
declaracionAnualSchema.index(
  { clienteId: 1, anio: 1 },
  { unique: true, partialFilterExpression: { activo: true } }
);

// Auto-detectar vencido
declaracionAnualSchema.pre('save', function (next) {
  if (this.estado === 'PENDIENTE' && this.fechaVencimiento && new Date() > this.fechaVencimiento) {
    this.estado = 'VENCIDO';
  }
  next();
});

declaracionAnualSchema.statics.getHistorialCliente = function (clienteId) {
  return this.find({ clienteId, activo: true }).sort({ anio: -1 }).lean();
};

const DeclaracionAnual = mongoose.model('DeclaracionAnual', declaracionAnualSchema);

export default DeclaracionAnual;
