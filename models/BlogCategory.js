import mongoose from 'mongoose';

const BlogCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la categoría es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
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
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  image: {
    url: {
      type: String,
      default: ''
    },
    cloudinaryId: {
      type: String,
      default: ''
    },
    alt: {
      type: String,
      default: ''
    }
  },
  color: {
    type: String,
    default: '#2554a3', // Purple por defecto
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color debe ser un código hexadecimal válido']
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BlogCategory',
    default: null
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  postCount: {
    type: Number,
    default: 0
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
BlogCategorySchema.index({ name: 'text', description: 'text' });
BlogCategorySchema.index({ isActive: 1, order: 1 });

// Middleware: Prevenir eliminación si tiene posts asociados
BlogCategorySchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  if (this.postCount > 0) {
    throw new Error('No se puede eliminar una categoría con posts asociados');
  }
  next();
});

// Método virtual para obtener URL completa de la categoría
BlogCategorySchema.virtual('url').get(function() {
  return `/blog/category/${this.slug}`;
});

// Método para obtener subcategorías
BlogCategorySchema.methods.getSubcategories = async function() {
  return await this.model('BlogCategory').find({ parent: this._id, isActive: true }).sort({ order: 1 });
};

// Método estático para obtener árbol de categorías
BlogCategorySchema.statics.getCategoryTree = async function() {
  const categories = await this.find({ isActive: true }).sort({ order: 1 });
  
  // Construir árbol jerárquico
  const categoryMap = {};
  const tree = [];
  
  categories.forEach(category => {
    categoryMap[category._id] = { ...category.toObject(), children: [] };
  });
  
  categories.forEach(category => {
    if (category.parent) {
      if (categoryMap[category.parent]) {
        categoryMap[category.parent].children.push(categoryMap[category._id]);
      }
    } else {
      tree.push(categoryMap[category._id]);
    }
  });
  
  return tree;
};

// Configurar toJSON para incluir virtuals
BlogCategorySchema.set('toJSON', { virtuals: true });
BlogCategorySchema.set('toObject', { virtuals: true });

const BlogCategory = mongoose.model('BlogCategory', BlogCategorySchema);

export default BlogCategory;

