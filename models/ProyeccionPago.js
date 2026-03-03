import mongoose from 'mongoose';

/**
 * 📊 Schema de Proyección de Pago
 * Estimación de pagos tributarios para un cliente en un periodo
 * Permite al contador informar al cliente cuánto deberá pagar
 */
const proyeccionPagoSchema = new mongoose.Schema(
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
    // 📅 PERIODO
    // ========================================
    periodo: {
      type: String,
      required: [true, 'El periodo es requerido'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'El periodo debe tener formato YYYY-MM']
    },
    
    // ========================================
    // 📊 DATOS ESTIMADOS (INPUT)
    // ========================================
    ingresosEstimados: {
      type: Number,
      required: [true, 'Los ingresos estimados son requeridos'],
      min: 0,
      default: 0
    },
    comprasEstimadas: {
      type: Number,
      min: 0,
      default: 0
    },
    
    // ========================================
    // 💰 RESULTADOS CALCULADOS (OUTPUT)
    // ========================================
    igvEstimado: {
      debitoFiscal: { type: Number, default: 0 },
      creditoFiscal: { type: Number, default: 0 },
      igvAPagar: { type: Number, default: 0 }
    },
    rentaEstimada: {
      regimenAplicado: {
        type: String,
        enum: ['RUS', 'RER', 'MYPE', 'GENERAL'],
        required: true
      },
      coeficienteAplicado: { type: Number, default: 0 },
      rentaAPagar: { type: Number, default: 0 }
    },
    totalEstimado: {
      type: Number,
      default: 0
    },
    
    // ========================================
    // 📅 FECHA DE VENCIMIENTO
    // ========================================
    fechaVencimiento: {
      type: Date,
      default: null
    },
    
    // ========================================
    // 🔄 COMPARACIÓN CON DECLARACIÓN REAL
    // ========================================
    declaracionRealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeclaracionMensual',
      default: null
    },
    comparacion: {
      diferenciaIGV: { type: Number, default: null },
      diferenciaRenta: { type: Number, default: null },
      diferenciaTotal: { type: Number, default: null },
      precision: { type: Number, default: null } // % de precisión
    },
    
    // ========================================
    // 📝 OBSERVACIONES
    // ========================================
    observaciones: {
      type: String,
      trim: true,
      default: ''
    },
    
    // ========================================
    // 📤 COMPARTIDO CON CLIENTE
    // ========================================
    compartidoConCliente: {
      type: Boolean,
      default: false
    },
    fechaCompartido: {
      type: Date,
      default: null
    },
    
    // ========================================
    // 👨‍💼 METADATOS
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

// ========================================
// 🔍 ÍNDICES
// ========================================
proyeccionPagoSchema.index({ clienteId: 1, periodo: 1 });
proyeccionPagoSchema.index({ periodo: 1, activo: 1 });

// ========================================
// 🔧 MIDDLEWARE (PRE-SAVE)
// ========================================
proyeccionPagoSchema.pre('save', function(next) {
  // Calcular total estimado
  const igv = this.igvEstimado?.igvAPagar || 0;
  const renta = this.rentaEstimada?.rentaAPagar || 0;
  this.totalEstimado = igv + renta;
  
  next();
});

// ========================================
// 🔧 MÉTODOS ESTÁTICOS
// ========================================

// Obtener proyecciones de un cliente
proyeccionPagoSchema.statics.getByCliente = function(clienteId, limit = 12) {
  return this.find({ clienteId, activo: true })
    .sort({ periodo: -1 })
    .limit(limit)
    .lean();
};

// Comparar con declaración real
proyeccionPagoSchema.statics.compararConReal = async function(proyeccionId, declaracionId) {
  const DeclaracionMensual = mongoose.model('DeclaracionMensual');
  
  const [proyeccion, declaracion] = await Promise.all([
    this.findById(proyeccionId),
    DeclaracionMensual.findById(declaracionId)
  ]);
  
  if (!proyeccion || !declaracion) {
    throw new Error('Proyección o declaración no encontrada');
  }
  
  const diferenciaIGV = (declaracion.detalleIGV?.igvAPagar || 0) - (proyeccion.igvEstimado?.igvAPagar || 0);
  const diferenciaRenta = (declaracion.detalleRenta?.rentaAPagar || 0) - (proyeccion.rentaEstimada?.rentaAPagar || 0);
  const diferenciaTotal = diferenciaIGV + diferenciaRenta;
  
  // Calcular precisión (100% = exacto)
  const totalEstimado = proyeccion.totalEstimado || 1;
  const totalReal = declaracion.totalAPagar || 0;
  const precision = Math.max(0, 100 - (Math.abs(diferenciaTotal) / totalEstimado * 100));
  
  proyeccion.declaracionRealId = declaracionId;
  proyeccion.comparacion = {
    diferenciaIGV,
    diferenciaRenta,
    diferenciaTotal,
    precision: Math.round(precision * 100) / 100
  };
  
  await proyeccion.save();
  return proyeccion;
};

const ProyeccionPago = mongoose.model('ProyeccionPago', proyeccionPagoSchema);

export default ProyeccionPago;
