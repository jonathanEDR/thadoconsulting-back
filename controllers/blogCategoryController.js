import BlogCategory from '../models/BlogCategory.js';
import BlogPost from '../models/BlogPost.js';
import { generateCategorySlug } from '../utils/slugGenerator.js';

/**
 * @desc    Obtener todas las categorías
 * @route   GET /api/blog/categories
 * @access  Public
 */
export const getAllCategories = async (req, res) => {
  try {
    const { includeInactive = 'false', tree = 'false' } = req.query;
    
    const query = includeInactive === 'true' ? {} : { isActive: true };
    
    // Si se solicita árbol jerárquico
    if (tree === 'true') {
      const categoryTree = await BlogCategory.getCategoryTree();
      
      return res.json({
        success: true,
        data: categoryTree,
        count: categoryTree.length
      });
    }
    
    // Lista plana con ordenamiento
    const categories = await BlogCategory.find(query)
      .sort({ order: 1, name: 1 })
      .lean();
    
    res.json({
      success: true,
      data: categories,
      count: categories.length
    });
    
  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener categorías',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener una categoría por slug
 * @route   GET /api/blog/categories/:slug
 * @access  Public
 */
export const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const category = await BlogCategory.findOne({ slug, isActive: true })
      .populate('parent', 'name slug')
      .lean();
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Obtener subcategorías
    const subcategories = await BlogCategory.find({ 
      parent: category._id, 
      isActive: true 
    })
      .sort({ order: 1, name: 1 })
      .lean();
    
    res.json({
      success: true,
      data: {
        ...category,
        subcategories
      }
    });
    
  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener categoría',
      error: error.message
    });
  }
};

/**
 * @desc    Crear nueva categoría
 * @route   POST /api/blog/categories
 * @access  Private (MANAGE_BLOG_CATEGORIES)
 */
export const createCategory = async (req, res) => {
  try {
    const { name, description, image, color, parent, order, seo } = req.body;
    
    // Validaciones
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es requerido'
      });
    }
    
    // Generar slug único
    const slug = await generateCategorySlug(name);
    
    // Validar parent si existe
    if (parent) {
      const parentCategory = await BlogCategory.findById(parent);
      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: 'Categoría padre no encontrada'
        });
      }
    }
    
    // Crear categoría
    const category = await BlogCategory.create({
      name,
      slug,
      description,
      image,
      color,
      parent: parent || null,
      order: order || 0,
      seo
    });
    
    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: category
    });
    
  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al crear categoría',
      error: error.message
    });
  }
};

/**
 * @desc    Actualizar categoría
 * @route   PUT /api/blog/categories/:id
 * @access  Private (MANAGE_BLOG_CATEGORIES)
 */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image, color, parent, order, isActive, seo } = req.body;
    
    const category = await BlogCategory.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Si se cambió el nombre, regenerar slug
    if (name && name !== category.name) {
      category.slug = await generateCategorySlug(name, id);
      category.name = name;
    }
    
    // Validar parent
    if (parent !== undefined) {
      if (parent) {
        // No puede ser su propio padre
        if (parent === id) {
          return res.status(400).json({
            success: false,
            message: 'Una categoría no puede ser su propio padre'
          });
        }
        
        // Verificar que el padre existe
        const parentCategory = await BlogCategory.findById(parent);
        if (!parentCategory) {
          return res.status(404).json({
            success: false,
            message: 'Categoría padre no encontrada'
          });
        }
        
        category.parent = parent;
      } else {
        category.parent = null;
      }
    }
    
    // Actualizar otros campos
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (color !== undefined) category.color = color;
    if (order !== undefined) category.order = order;
    if (isActive !== undefined) category.isActive = isActive;
    if (seo !== undefined) category.seo = { ...category.seo, ...seo };
    
    await category.save();
    
    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: category
    });
    
  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al actualizar categoría',
      error: error.message
    });
  }
};

/**
 * @desc    Eliminar categoría
 * @route   DELETE /api/blog/categories/:id
 * @access  Private (MANAGE_BLOG_CATEGORIES)
 */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await BlogCategory.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Verificar si tiene posts asociados
    const postCount = await BlogPost.countDocuments({ category: id });
    
    if (postCount > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar. La categoría tiene ${postCount} post(s) asociado(s)`,
        postCount
      });
    }
    
    // Verificar si tiene subcategorías
    const subcategoryCount = await BlogCategory.countDocuments({ parent: id });
    
    if (subcategoryCount > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar. La categoría tiene ${subcategoryCount} subcategoría(s)`,
        subcategoryCount
      });
    }
    
    await category.deleteOne();
    
    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
    
  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al eliminar categoría',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener posts de una categoría
 * @route   GET /api/blog/categories/:slug/posts
 * @access  Public
 */
export const getCategoryPosts = async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 10, sort = '-publishedAt' } = req.query;
    
    // Buscar categoría
    const category = await BlogCategory.findOne({ slug, isActive: true });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Obtener posts paginados
    const posts = await BlogPost.find({
      category: category._id,
      isPublished: true,
      status: 'published'
    })
      .populate('author', 'firstName lastName')
      .populate('tags', 'name slug') // ✅ Optimizado: removido color (no crítico en listado)
      .select('title slug excerpt featuredImage publishedAt readingTime') // ✅ Agregado select para limitar campos
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    
    const total = await BlogPost.countDocuments({
      category: category._id,
      isPublished: true,
      status: 'published'
    });
    
    res.json({
      success: true,
      data: {
        category: {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          color: category.color
        },
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener posts de la categoría',
      error: error.message
    });
  }
};

/**
 * @desc    Reordenar categorías
 * @route   PUT /api/blog/categories/reorder
 * @access  Private (MANAGE_BLOG_CATEGORIES)
 */
export const reorderCategories = async (req, res) => {
  try {
    const { categories } = req.body; // Array de { id, order }
    
    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Se espera un array de categorías'
      });
    }
    
    // Actualizar orden de cada categoría
    const updatePromises = categories.map(({ id, order }) =>
      BlogCategory.findByIdAndUpdate(id, { order }, { new: true })
    );
    
    await Promise.all(updatePromises);
    
    res.json({
      success: true,
      message: 'Categorías reordenadas exitosamente'
    });
    
  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al reordenar categorías',
      error: error.message
    });
  }
};

export default {
  getAllCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryPosts,
  reorderCategories
};
