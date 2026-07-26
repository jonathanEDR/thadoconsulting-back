import mongoose from 'mongoose';

// ========================================
// 📋 TIPOS DE DECLARACIÓN
// ========================================
export const TIPOS_DECLARACION = ['IGV_RENTA', 'PLANILLA', 'AFP'];

// ========================================
// 📊 AFP Providers en Perú
// ========================================
export const AFP_PROVIDERS = {
  HABITAT: {
    nombre: 'AFP Habitat',
    comision: 0.0138,
    primaSeguro: 0.0186
  },
  INTEGRA: {
    nombre: 'AFP Integra',
    comision: 0.0155,
    primaSeguro: 0.0186
  },
  PRIMA: {
    nombre: 'AFP Prima',
    comision: 0.0155,
    primaSeguro: 0.0186
  },
  PROFUTURO: {
    nombre: 'AFP Profuturo',
    comision: 0.0169,
    primaSeguro: 0.0186
  }
};

// ========================================
// 📊 Constantes laborales Perú
// ========================================
export const CONSTANTES_LABORALES = {
  ESSALUD_TASA: 0.09,         // 9% a cargo del empleador
  ONP_TASA: 0.13,             // 13% a cargo del trabajador
  AFP_APORTE_OBLIGATORIO: 0.10, // 10% aporte obligatorio
  RENTA_5TA_TRAMOS: [
    { hasta: 7, tasa: 0.08 },
    { hasta: 12, tasa: 0.14 },
    { hasta: 27, tasa: 0.17 },
    { hasta: 42, tasa: 0.20 },
    { hasta: Infinity, tasa: 0.30 }
  ],
  UIT_2026: 5350 // Valor UIT 2026
};

/**
 * 📊 Schema de Detalle IGV
 * Desglose del cálculo de IGV mensual
 */
const detalleIGVSchema = new mongoose.Schema({
  ventasGravadas: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  ventasNoGravadas: {
    type: Number,
    min: 0,
    default: 0
  },
  ventasExportacion: {
    type: Number,
    min: 0,
    default: 0
  },
  // Débito fiscal = ventasGravadas * 0.18
  debitoFiscal: {
    type: Number,
    min: 0,
    default: 0
  },
  // Compras gravadas a la tasa general (18%) — se guarda para poder re-editar la declaración
  comprasGravadas: {
    type: Number,
    min: 0,
    default: 0
  },
  // Compras gravadas a la tasa especial configurada en el cliente (ej. restaurantes - Ley 31556)
  comprasGravadasEspecial: {
    type: Number,
    min: 0,
    default: 0
  },
  creditoFiscal: {
    type: Number,
    min: 0,
    default: 0
  },
  // IGV a pagar = debitoFiscal - creditoFiscal (si > 0)
  igvResultante: {
    type: Number,
    default: 0
  },
  // Saldo a favor del periodo anterior
  saldoFavorAnterior: {
    type: Number,
    min: 0,
    default: 0
  },
  // IGV final a pagar (después de créditos y saldos)
  igvAPagar: {
    type: Number,
    default: 0
  },
  // Saldo a favor arrastrable al siguiente periodo
  saldoFavorSiguiente: {
    type: Number,
    min: 0,
    default: 0
  }
}, { _id: false });

/**
 * 💰 Schema de Detalle Renta
 * Desglose del cálculo de pago a cuenta de renta mensual
 */
const detalleRentaSchema = new mongoose.Schema({
  // Régimen del cliente al momento de la declaración
  regimenAplicado: {
    type: String,
    enum: ['RUS', 'RER', 'MYPE', 'GENERAL'],
    required: true
  },
  // Base imponible para el cálculo
  baseImponible: {
    type: Number,
    min: 0,
    default: 0
  },
  // Coeficiente o porcentaje aplicado
  coeficienteAplicado: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  // Para RUS: categoría aplicada
  categoriaRUS: {
    type: Number,
    enum: [1, 2, null],
    default: null
  },
  // Cuota fija RUS
  cuotaFijaRUS: {
    type: Number,
    default: null
  },
  // Renta calculada
  rentaCalculada: {
    type: Number,
    default: 0
  },
  // Renta final a pagar
  rentaAPagar: {
    type: Number,
    default: 0
  }
}, { _id: false });

/**
 * � Schema de Detalle Planilla (PLAME - PDT 601)
 * Declaración mensual de planillas electrónicas
 */
const detallePlanillaSchema = new mongoose.Schema({
  cantidadTrabajadores: {
    type: Number,
    min: 0,
    default: 0
  },
  totalRemuneraciones: {
    type: Number,
    min: 0,
    default: 0
  },
  // ESSALUD: monto manual ingresado por el contador (a cargo del empleador)
  essalud: {
    type: Number,
    min: 0,
    default: 0
  },
  // SIS: monto manual (alternativa a ESSALUD para empresas MYPE/microempresa)
  sis: {
    type: Number,
    min: 0,
    default: 0
  },
  // ONP: 13% sobre remuneraciones (a cargo del trabajador, retenido por empleador)
  onp: {
    type: Number,
    min: 0,
    default: 0
  },
  cantidadTrabajadoresONP: {
    type: Number,
    min: 0,
    default: 0
  },
  totalRemuneracionesONP: {
    type: Number,
    min: 0,
    default: 0
  },
  // Trabajadores AFP dentro de la planilla (para ESSALUD y referencia PLAME)
  cantidadTrabajadoresAFP: {
    type: Number,
    min: 0,
    default: 0
  },
  totalRemuneracionesAFP: {
    type: Number,
    min: 0,
    default: 0
  },
  // Retenciones de Impuesto a la Renta de 5ta Categoría
  retenciones5ta: {
    type: Number,
    min: 0,
    default: 0
  },
  cantidadTrabajadores5ta: {
    type: Number,
    min: 0,
    default: 0
  },
  // Vida Ley / SCTR (si aplica)
  vidaLey: {
    type: Number,
    min: 0,
    default: 0
  },
  // Total a pagar por planilla = ESSALUD + SIS + ONP + Retenciones 5ta + Vida Ley
  totalAPagar: {
    type: Number,
    min: 0,
    default: 0
  }
}, { _id: false });

/**
 * 🏦 Schema de Detalle AFP (AFPnet)
 * Declaración mensual de aportes a AFP
 */
const detalleAFPSchema = new mongoose.Schema({
  afpNombre: {
    type: String,
    enum: ['HABITAT', 'INTEGRA', 'PRIMA', 'PROFUTURO', ''],
    default: ''
  },
  cantidadAfiliados: {
    type: Number,
    min: 0,
    default: 0
  },
  totalRemuneraciones: {
    type: Number,
    min: 0,
    default: 0
  },
  // Aporte obligatorio: 10% de la remuneración
  aporteObligatorio: {
    type: Number,
    min: 0,
    default: 0
  },
  // Comisión AFP (varía por AFP)
  comisionAFP: {
    type: Number,
    min: 0,
    default: 0
  },
  // Prima de seguro (~1.86%)
  primaSeguro: {
    type: Number,
    min: 0,
    default: 0
  },
  // Aporte voluntario (opcional)
  aporteVoluntario: {
    type: Number,
    min: 0,
    default: 0
  },
  // Total a pagar = aporteObligatorio + comisionAFP + primaSeguro + aporteVoluntario
  totalAPagar: {
    type: Number,
    min: 0,
    default: 0
  }
}, { _id: false });

/**
 * �📄 Schema Principal de Declaración Mensual
 * Registra cada declaración tributaria presentada por un cliente
 */
const declaracionMensualSchema = new mongoose.Schema(
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
    // � TIPO DE DECLARACIÓN
    // ========================================
    tipo: {
      type: String,
      enum: {
        values: TIPOS_DECLARACION,
        message: 'Tipo de declaración inválido'
      },
      default: 'IGV_RENTA',
      required: true,
      index: true
    },
    
    // ========================================
    // �📅 PERIODO
    // ========================================
    periodo: {
      type: String,
      required: [true, 'El periodo es requerido'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'El periodo debe tener formato YYYY-MM'],
      index: true
    },
    anio: {
      type: Number,
      required: true,
      index: true
    },
    mes: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    
    // ========================================
    // 📊 DETALLES DE LA DECLARACIÓN
    // ========================================
    detalleIGV: {
      type: detalleIGVSchema,
      default: () => ({})
    },
    detalleRenta: {
      type: detalleRentaSchema,
      default: null
    },
    
    detallePlanilla: {
      type: detallePlanillaSchema,
      default: null
    },
    
    detalleAFP: {
      type: detalleAFPSchema,
      default: null
    },
    
    // ========================================
    // 💵 TOTALES
    // ========================================
    totalAPagar: {
      type: Number,
      default: 0 // igvAPagar + rentaAPagar
    },
    
    // ========================================
    // 📋 DATOS DE PRESENTACIÓN
    // ========================================
    formulario: {
      type: String,
      enum: ['PDT621', 'PDT621_SIMPLIFICADO', 'FORMULARIO_VIRTUAL', 'NRUS', 'PLAME', 'AFPNET'],
      default: 'PDT621'
    },
    numeroOrden: {
      type: String,
      trim: true,
      default: '' // Número de orden de la declaración en SUNAT
    },
    
    // ========================================
    // 💳 DATOS DE PAGO
    // ========================================
    pago: {
      montoPagado: {
        type: Number,
        min: 0,
        default: 0
      },
      fechaPago: {
        type: Date,
        default: null
      },
      medioPago: {
        type: String,
        enum: ['banco', 'clave_sol', 'nps', 'efectivo', 'otro', ''],
        default: ''
      },
      numeroOperacion: {
        type: String,
        trim: true,
        default: ''
      },
      banco: {
        type: String,
        trim: true,
        default: ''
      }
    },
    
    // ========================================
    // 📅 FECHAS IMPORTANTES
    // ========================================
    fechaPresentacion: {
      type: Date,
      default: null
    },
    fechaVencimiento: {
      type: Date,
      required: [true, 'La fecha de vencimiento es requerida']
    },
    
    // ========================================
    // 📊 ESTADO DE LA DECLARACIÓN
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
    
    // ========================================
    // 🔄 RECTIFICATORIAS
    // ========================================
    esRectificatoria: {
      type: Boolean,
      default: false
    },
    declaracionOriginal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeclaracionMensual',
      default: null
    },
    motivoRectificacion: {
      type: String,
      trim: true,
      default: ''
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
    // 👨‍💼 METADATOS
    // ========================================
    registradoPor: {
      userId: {
        type: String, // Clerk user ID
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
// 🔍 ÍNDICES COMPUESTOS
// ========================================
declaracionMensualSchema.index({ clienteId: 1, periodo: 1, tipo: 1 }, { unique: true });
declaracionMensualSchema.index({ periodo: 1, estado: 1, activo: 1 });
declaracionMensualSchema.index({ fechaVencimiento: 1, estado: 1 });
declaracionMensualSchema.index({ anio: 1, clienteId: 1, activo: 1 });
declaracionMensualSchema.index({ tipo: 1, anio: 1, clienteId: 1 });

// ========================================
// 🔧 VIRTUALS
// ========================================

// ¿Está vencida?
declaracionMensualSchema.virtual('estaVencida').get(function() {
  if (this.estado === 'PAGADO' || this.estado === 'PRESENTADO') return false;
  return new Date() > this.fechaVencimiento;
});

// Días restantes para vencer
declaracionMensualSchema.virtual('diasRestantes').get(function() {
  if (this.estado === 'PAGADO' || this.estado === 'PRESENTADO') return null;
  const hoy = new Date();
  const diff = this.fechaVencimiento - hoy;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Periodo formateado (ej: "Marzo 2025")
declaracionMensualSchema.virtual('periodoFormateado').get(function() {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${meses[this.mes - 1]} ${this.anio}`;
});

// ========================================
// 🔧 MIDDLEWARE (PRE-SAVE)
// ========================================
declaracionMensualSchema.pre('save', function(next) {
  // Extraer año y mes del periodo
  if (this.periodo) {
    const [anio, mes] = this.periodo.split('-').map(Number);
    this.anio = anio;
    this.mes = mes;
  }
  
  // Calcular total a pagar según tipo de declaración
  if (this.tipo === 'PLANILLA') {
    this.totalAPagar = this.detallePlanilla?.totalAPagar || 0;
  } else if (this.tipo === 'AFP') {
    this.totalAPagar = this.detalleAFP?.totalAPagar || 0;
  } else {
    // IGV_RENTA
    const igv = this.detalleIGV?.igvAPagar || 0;
    const renta = this.detalleRenta?.rentaAPagar || 0;
    this.totalAPagar = igv + renta;
  }
  
  // Auto-detectar estado vencido
  if (this.estado === 'PENDIENTE' && this.fechaVencimiento && new Date() > this.fechaVencimiento) {
    this.estado = 'VENCIDO';
  }
  
  next();
});

// ========================================
// 🔧 MÉTODOS ESTÁTICOS
// ========================================

// Obtener historial de un cliente
declaracionMensualSchema.statics.getHistorialCliente = function(clienteId, anio = null, tipo = null) {
  const filter = { clienteId, activo: true };
  if (anio) filter.anio = anio;
  if (tipo) filter.tipo = tipo;
  return this.find(filter).sort({ periodo: -1 }).lean();
};

// Obtener resumen anual de un cliente
declaracionMensualSchema.statics.getResumenAnual = function(clienteId, anio) {
  return this.aggregate([
    { 
      $match: { 
        clienteId: new mongoose.Types.ObjectId(clienteId), 
        anio, 
        activo: true 
      } 
    },
    {
      $group: {
        _id: '$clienteId',
        totalIGV: { $sum: '$detalleIGV.igvAPagar' },
        totalRenta: { $sum: '$detalleRenta.rentaAPagar' },
        totalPlanilla: { $sum: '$detallePlanilla.totalAPagar' },
        totalAFP: { $sum: '$detalleAFP.totalAPagar' },
        totalPagado: { $sum: '$pago.montoPagado' },
        totalAPagar: { $sum: '$totalAPagar' },
        declaracionesPresentadas: { 
          $sum: { $cond: [{ $in: ['$estado', ['PRESENTADO', 'PAGADO']] }, 1, 0] } 
        },
        declaracionesPendientes: { 
          $sum: { $cond: [{ $eq: ['$estado', 'PENDIENTE'] }, 1, 0] } 
        },
        declaracionesVencidas: { 
          $sum: { $cond: [{ $eq: ['$estado', 'VENCIDO'] }, 1, 0] } 
        },
        periodos: { $push: '$periodo' }
      }
    }
  ]);
};

// Obtener declaraciones pendientes/vencidas (para alertas)
declaracionMensualSchema.statics.getAlertasVencimiento = function() {
  const hoy = new Date();
  const en7Dias = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        activo: true,
        estado: { $in: ['PENDIENTE', 'VENCIDO'] }
      }
    },
    {
      $lookup: {
        from: 'clientecontables',
        localField: 'clienteId',
        foreignField: '_id',
        as: 'cliente'
      }
    },
    { $unwind: '$cliente' },
    {
      $match: { 'cliente.activo': true }
    },
    {
      $addFields: {
        alertaNivel: {
          $cond: {
            if: { $lt: ['$fechaVencimiento', hoy] },
            then: 'VENCIDO',
            else: {
              $cond: {
                if: { $lt: ['$fechaVencimiento', en7Dias] },
                then: 'PROXIMO',
                else: 'NORMAL'
              }
            }
          }
        }
      }
    },
    {
      $group: {
        _id: '$alertaNivel',
        count: { $sum: 1 },
        declaraciones: {
          $push: {
            _id: '$_id',
            clienteId: '$clienteId',
            razonSocial: '$cliente.razonSocial',
            ruc: '$cliente.ruc',
            periodo: '$periodo',
            fechaVencimiento: '$fechaVencimiento',
            totalAPagar: '$totalAPagar',
            estado: '$estado'
          }
        }
      }
    }
  ]);
};

const DeclaracionMensual = mongoose.model('DeclaracionMensual', declaracionMensualSchema);

export default DeclaracionMensual;
