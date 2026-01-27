import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  // Información del archivo
  filename: {
    type: String,
    required: [true, 'El nombre del archivo es requerido'],
    unique: true,
    index: true
  },
  originalName: {
    type: String,
    required: [true, 'El nombre original es requerido']
  },
  url: {
    type: String,
    required: [true, 'La URL es requerida']
  },
  
  // ID de Cloudinary (para poder eliminar la imagen)
  cloudinaryId: {
    type: String,
    index: true
  },
  
  // Información técnica
  mimetype: {
    type: String,
    required: [true, 'El tipo MIME es requerido'],
    enum: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  },
  size: {
    type: Number,
    required: [true, 'El tamaño es requerido']
  },
  width: {
    type: Number,
    default: null
  },
  height: {
    type: Number,
    default: null
  },
  
  // Metadatos y organización
  category: {
    type: String,
    enum: ['hero', 'logo', 'service', 'gallery', 'icon', 'banner', 'avatar', 'thumbnail', 'blog', 'other'],
    default: 'other',
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // SEO y descripción
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'El título no puede exceder 200 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  alt: {
    type: String,
    trim: true,
    maxlength: [150, 'El texto alternativo no puede exceder 150 caracteres']
  },
  
  // Control de uso y referencias
  uploadedBy: {
    type: String, // Clerk User ID
    required: [true, 'El usuario que sube la imagen es requerido'],
    index: true
  },
  usedIn: [{
    model: {
      type: String,
      enum: ['Page', 'Servicio', 'User', 'BlogPost'],
      required: true
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    field: {
      type: String,
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Estado
  isOrphan: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Thumbnails (opcional para futuras versiones)
  thumbnail: {
    url: String,
    width: Number,
    height: Number
  },
  
  // Timestamps
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos para búsquedas optimizadas
imageSchema.index({ category: 1, uploadedAt: -1 });
imageSchema.index({ uploadedBy: 1, uploadedAt: -1 });
imageSchema.index({ isOrphan: 1, uploadedAt: -1 });
imageSchema.index({ tags: 1 });

// Virtual para calcular si está en uso
imageSchema.virtual('isInUse').get(function() {
  return this.usedIn && this.usedIn.length > 0;
});

// Virtual para tamaño legible
imageSchema.virtual('sizeFormatted').get(function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual para dimensiones formateadas
imageSchema.virtual('dimensions').get(function() {
  if (!this.width || !this.height) return 'N/A';
  return `${this.width} × ${this.height}`;
});

// Middleware: Actualizar updatedAt antes de guardar
imageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Actualizar isOrphan basado en usedIn
  this.isOrphan = !this.usedIn || this.usedIn.length === 0;
  
  next();
});

// Middleware: Actualizar updatedAt en findOneAndUpdate
imageSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// Métodos estáticos

/**
 * Buscar imágenes con filtros y paginación
 */
imageSchema.statics.findWithFilters = async function(filters = {}, options = {}) {
  const {
    category,
    isOrphan,
    uploadedBy,
    tags,
    search,
    page = 1,
    limit = 20,
    sortBy = '-uploadedAt'
  } = options;

  const query = { ...filters };

  // Filtros adicionales
  if (category) query.category = category;
  if (typeof isOrphan === 'boolean') query.isOrphan = isOrphan;
  if (uploadedBy) query.uploadedBy = uploadedBy;
  if (tags && tags.length > 0) query.tags = { $in: tags };
  
  // Búsqueda por texto
  if (search) {
    query.$or = [
      { filename: { $regex: search, $options: 'i' } },
      { originalName: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { alt: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  const [images, total] = await Promise.all([
    this.find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(limit),
    this.countDocuments(query)
  ]);

  return {
    images,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Obtener estadísticas de imágenes
 */
imageSchema.statics.getStatistics = async function() {
  const [stats] = await this.aggregate([
    {
      $facet: {
        totalCount: [{ $count: 'count' }],
        totalSize: [{ $group: { _id: null, total: { $sum: '$size' } } }],
        orphanCount: [{ $match: { isOrphan: true } }, { $count: 'count' }],
        byCategory: [
          { $group: { _id: '$category', count: { $count: {} } } },
          { $sort: { count: -1 } }
        ],
        byMimetype: [
          { $group: { _id: '$mimetype', count: { $count: {} } } },
          { $sort: { count: -1 } }
        ]
      }
    }
  ]);

  return {
    total: stats.totalCount[0]?.count || 0,
    totalSize: stats.totalSize[0]?.total || 0,
    orphans: stats.orphanCount[0]?.count || 0,
    byCategory: stats.byCategory || [],
    byMimetype: stats.byMimetype || []
  };
};

/**
 * Agregar referencia de uso
 */
imageSchema.methods.addReference = async function(model, documentId, field) {
  // Verificar si ya existe la referencia
  const exists = this.usedIn.some(
    ref => ref.model === model && 
           ref.documentId.toString() === documentId.toString() && 
           ref.field === field
  );

  if (!exists) {
    this.usedIn.push({ model, documentId, field });
    this.isOrphan = false;
    await this.save();
  }
};

/**
 * Eliminar referencia de uso
 */
imageSchema.methods.removeReference = async function(model, documentId, field) {
  this.usedIn = this.usedIn.filter(
    ref => !(ref.model === model && 
             ref.documentId.toString() === documentId.toString() && 
             ref.field === field)
  );
  
  this.isOrphan = this.usedIn.length === 0;
  await this.save();
};

/**
 * Verificar si se puede eliminar (no está en uso o forzar)
 */
imageSchema.methods.canDelete = function(force = false) {
  if (force) return true;
  return this.isOrphan || this.usedIn.length === 0;
};

const Image = mongoose.model('Image', imageSchema);

export default Image;
