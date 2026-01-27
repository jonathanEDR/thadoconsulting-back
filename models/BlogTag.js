import mongoose from 'mongoose';

const BlogTagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del tag es requerido'],
    trim: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [300, 'La descripción no puede exceder 300 caracteres']
  },
  color: {
    type: String,
    default: '#2554a3',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color debe ser un código hexadecimal válido']
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // SEO
  seo: {
    metaTitle: {
      type: String,
      maxlength: [60, 'El meta título no puede exceder 60 caracteres']
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'La meta descripción no puede exceder 160 caracteres']
    }
  }
}, {
  timestamps: true
});

// Índices para búsqueda y rendimiento
BlogTagSchema.index({ name: 'text', description: 'text' });
BlogTagSchema.index({ usageCount: -1 }); // Para obtener tags más populares
BlogTagSchema.index({ isActive: 1, usageCount: -1 });

// Método virtual para obtener URL completa del tag
BlogTagSchema.virtual('url').get(function() {
  return `/blog/tag/${this.slug}`;
});

// Método para incrementar el contador de uso
BlogTagSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  await this.save();
};

// Método para decrementar el contador de uso
BlogTagSchema.methods.decrementUsage = async function() {
  if (this.usageCount > 0) {
    this.usageCount -= 1;
    await this.save();
  }
};

// Método estático para obtener tags más populares
BlogTagSchema.statics.getPopularTags = async function(limit = 10) {
  return await this.find({ isActive: true })
    .sort({ usageCount: -1 })
    .limit(limit);
};

// Método estático para obtener tags relacionados (por uso conjunto)
BlogTagSchema.statics.getRelatedTags = async function(tagIds, limit = 5) {
  // Esta función puede ser más compleja, por ahora retorna tags populares
  return await this.find({ 
    _id: { $nin: tagIds },
    isActive: true 
  })
    .sort({ usageCount: -1 })
    .limit(limit);
};

// Configurar toJSON para incluir virtuals
BlogTagSchema.set('toJSON', { virtuals: true });
BlogTagSchema.set('toObject', { virtuals: true });

const BlogTag = mongoose.model('BlogTag', BlogTagSchema);

export default BlogTag;

