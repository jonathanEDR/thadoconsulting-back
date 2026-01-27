import mongoose from 'mongoose';

const paqueteServicioSchema = new mongoose.Schema(
  {
    // Relación con servicio
    servicioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Servicio',
      required: [true, 'El servicio es obligatorio'],
      index: true
    },
    
    // Información básica
    nombre: {
      type: String,
      required: [true, 'El nombre del paquete es obligatorio'],
      trim: true,
      maxlength: [50, 'El nombre no puede tener más de 50 caracteres']
    },
    descripcion: {
      type: String,
      maxlength: [500, 'La descripción no puede tener más de 500 caracteres']
    },
    
    // Pricing
    precio: {
      type: Number,
      required: [true, 'El precio es obligatorio'],
      min: [0, 'El precio no puede ser negativo']
    },
    precioOriginal: {
      type: Number,
      min: [0, 'El precio original no puede ser negativo']
    },
    moneda: {
      type: String,
      default: 'PEN',
      enum: ['USD', 'MXN', 'EUR', 'PEN']
    },
    tipoFacturacion: {
      type: String,
      enum: ['unico', 'mensual', 'trimestral', 'anual'],
      default: 'unico'
    },
    
    // Características incluidas
    caracteristicas: [{
      texto: {
        type: String,
        required: true
      },
      incluido: {
        type: Boolean,
        default: true
      },
      descripcion: String,
      icono: String
    }],
    
    // Limitaciones
    limitaciones: [{
      tipo: {
        type: String,
        enum: ['cantidad', 'tiempo', 'feature', 'otro']
      },
      descripcion: String,
      valor: mongoose.Schema.Types.Mixed
    }],
    
    // Extras opcionales
    addons: [{
      nombre: String,
      descripcion: String,
      precio: Number,
      obligatorio: {
        type: Boolean,
        default: false
      }
    }],
    
    // Visualización
    orden: {
      type: Number,
      default: 0
    },
    destacado: {
      type: Boolean,
      default: false
    },
    etiqueta: {
      type: String,
      maxlength: 30
    },
    colorEtiqueta: {
      type: String,
      default: '#10B981'
    },
    
    // Disponibilidad
    disponible: {
      type: Boolean,
      default: true
    },
    stock: {
      type: Number,
      min: 0
    },
    stockIlimitado: {
      type: Boolean,
      default: true
    },
    
    // Promociones
    enPromocion: {
      type: Boolean,
      default: false
    },
    descuento: {
      tipo: {
        type: String,
        enum: ['porcentaje', 'monto']
      },
      valor: Number,
      fechaInicio: Date,
      fechaFin: Date
    },
    
    // Métricas
    vecesVendido: {
      type: Number,
      default: 0,
      min: 0
    },
    ingresoTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Metadata
    metadatos: mongoose.Schema.Types.Mixed
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices
paqueteServicioSchema.index({ servicioId: 1, orden: 1 });
paqueteServicioSchema.index({ disponible: 1, destacado: -1 });

// Virtual: Precio con descuento
paqueteServicioSchema.virtual('precioConDescuento').get(function() {
  if (!this.enPromocion || !this.descuento) {
    return this.precio;
  }
  
  const ahora = new Date();
  if (this.descuento.fechaInicio && ahora < this.descuento.fechaInicio) {
    return this.precio;
  }
  if (this.descuento.fechaFin && ahora > this.descuento.fechaFin) {
    return this.precio;
  }
  
  if (this.descuento.tipo === 'porcentaje') {
    return this.precio * (1 - this.descuento.valor / 100);
  } else if (this.descuento.tipo === 'monto') {
    return Math.max(0, this.precio - this.descuento.valor);
  }
  
  return this.precio;
});

// Virtual: Ahorro
paqueteServicioSchema.virtual('ahorro').get(function() {
  if (this.precioOriginal && this.precioOriginal > this.precio) {
    return this.precioOriginal - this.precio;
  }
  if (this.enPromocion && this.precioConDescuento < this.precio) {
    return this.precio - this.precioConDescuento;
  }
  return 0;
});

// Virtual: Porcentaje de ahorro
paqueteServicioSchema.virtual('porcentajeAhorro').get(function() {
  const ahorro = this.ahorro;
  const base = this.precioOriginal || this.precio;
  if (ahorro > 0 && base > 0) {
    return Math.round((ahorro / base) * 100);
  }
  return 0;
});

// Middleware: Validar stock antes de guardar
paqueteServicioSchema.pre('save', function(next) {
  if (!this.stockIlimitado && this.stock !== undefined && this.stock <= 0) {
    this.disponible = false;
  }
  next();
});

// Método para registrar venta
paqueteServicioSchema.methods.registrarVenta = async function(cantidad = 1) {
  this.vecesVendido += cantidad;
  this.ingresoTotal += this.precioConDescuento * cantidad;
  
  if (!this.stockIlimitado) {
    this.stock = Math.max(0, this.stock - cantidad);
    if (this.stock <= 0) {
      this.disponible = false;
    }
  }
  
  return this.save();
};

// Método para obtener resumen
paqueteServicioSchema.methods.getResumen = function() {
  return {
    id: this._id,
    nombre: this.nombre,
    precio: this.precio,
    precioConDescuento: this.precioConDescuento,
    ahorro: this.ahorro,
    destacado: this.destacado,
    etiqueta: this.etiqueta,
    disponible: this.disponible,
    caracteristicas: this.caracteristicas.filter(c => c.incluido).map(c => c.texto)
  };
};

// Método estático para obtener paquetes de un servicio
paqueteServicioSchema.statics.findByServicio = function(servicioId, soloDisponibles = true) {
  const query = { servicioId };
  if (soloDisponibles) {
    query.disponible = true;
  }
  return this.find(query).sort({ orden: 1, precio: 1 });
};

// Método estático para obtener paquete más popular
paqueteServicioSchema.statics.getMasPopular = function(servicioId) {
  return this.findOne({ servicioId, disponible: true })
    .sort({ destacado: -1, vecesVendido: -1 })
    .limit(1);
};

const PaqueteServicio = mongoose.model('PaqueteServicio', paqueteServicioSchema);

export default PaqueteServicio;
