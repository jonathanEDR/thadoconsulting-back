import mongoose from 'mongoose';

const categoriaSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre de la categoría es obligatorio'],
      trim: true,
      unique: true,
      maxlength: [50, 'El nombre no puede tener más de 50 caracteres']
    },
    descripcion: {
      type: String,
      trim: true,
      maxlength: [200, 'La descripción no puede tener más de 200 caracteres'],
      default: ''
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },
    icono: {
      type: String,
      default: '📁'
    },
    color: {
      type: String,
      default: '#6B7280',
      validate: {
        validator: function(v) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'El color debe ser un código hexadecimal válido'
      }
    },
    orden: {
      type: Number,
      default: 0
    },
    activo: {
      type: Boolean,
      default: true
    },
    // Contador de servicios en esta categoría
    totalServicios: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices
// nombre y slug: índices creados automáticamente por unique: true
categoriaSchema.index({ activo: 1, orden: 1 });
// ✅ Optimización: Índices adicionales para queries frecuentes
categoriaSchema.index({ activo: 1 });  // Para findActivas y búsquedas de categorías activas
// slug ya tiene unique: true, no necesita índice adicional

// Virtual: Servicios asociados
categoriaSchema.virtual('servicios', {
  ref: 'Servicio',
  localField: '_id',
  foreignField: 'categoria'
});

// Middleware: Generar slug automáticamente
categoriaSchema.pre('save', async function(next) {
  if (this.isModified('nombre') || !this.slug) {
    let slugBase = this.nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9]+/g, '-')     // Reemplazar espacios y caracteres especiales
      .replace(/^-+|-+$/g, '');       // Quitar guiones del inicio y final
    
    let slug = slugBase;
    let counter = 1;
    
    // Verificar si el slug ya existe
    while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${slugBase}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  next();
});

// Método para actualizar contador de servicios
categoriaSchema.methods.actualizarContadorServicios = async function() {
  const Servicio = mongoose.model('Servicio');
  this.totalServicios = await Servicio.countDocuments({ categoria: this._id, activo: true });
  return this.save();
};

// Método estático para obtener categorías activas
categoriaSchema.statics.findActivas = function() {
  return this.find({ activo: true }).sort({ orden: 1, nombre: 1 });
};

// Método estático para obtener estadísticas
categoriaSchema.statics.getEstadisticas = async function() {
  const stats = await this.aggregate([
    {
      $lookup: {
        from: 'servicios',
        localField: '_id',
        foreignField: 'categoria',
        as: 'servicios'
      }
    },
    {
      $project: {
        nombre: 1,
        totalServicios: { $size: '$servicios' },
        serviciosActivos: {
          $size: {
            $filter: {
              input: '$servicios',
              cond: { $eq: ['$$this.activo', true] }
            }
          }
        }
      }
    },
    {
      $sort: { totalServicios: -1 }
    }
  ]);
  
  return stats;
};

const Categoria = mongoose.model('Categoria', categoriaSchema);

export default Categoria;