import BlogTag from '../models/BlogTag.js';
import BlogPost from '../models/BlogPost.js';
import { generateTagSlug } from '../utils/slugGenerator.js';

/**
 * @desc    Obtener todos los tags
 * @route   GET /api/blog/tags
 * @access  Public
 */
export const getAllTags = async (req, res) => {
  try {
    const { 
      includeInactive = 'false', 
      sortBy = 'usageCount', 
      limit 
    } = req.query;
    
    const query = includeInactive === 'true' ? {} : { isActive: true };
    
    // Determinar ordenamiento
    let sort = {};
    switch (sortBy) {
      case 'name':
        sort = { name: 1 };
        break;
      case 'recent':
        sort = { createdAt: -1 };
        break;
      case 'usageCount':
      default:
        sort = { usageCount: -1, name: 1 };
    }
    
    let tagsQuery = BlogTag.find(query).sort(sort);
    
    if (limit) {
      tagsQuery = tagsQuery.limit(parseInt(limit));
    }
    
    const tags = await tagsQuery.lean();
    
    res.json({
      success: true,
      data: tags,
      count: tags.length
    });
    
  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener tags',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener tags populares
 * @route   GET /api/blog/tags/popular
 * @access  Public
 */
export const getPopularTags = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const tags = await BlogTag.getPopularTags(parseInt(limit));
    
    res.json({
      success: true,
      data: tags,
      count: tags.length
    });
    
  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener tags populares',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener un tag por slug
 * @route   GET /api/blog/tags/:slug
 * @access  Public
 */
export const getTagBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const tag = await BlogTag.findOne({ slug, isActive: true }).lean();
    
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: tag
    });
    
  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener tag',
      error: error.message
    });
  }
};

/**
 * @desc    Crear nuevo tag
 * @route   POST /api/blog/tags
 * @access  Private (MANAGE_BLOG_TAGS)
 */
export const createTag = async (req, res) => {
  try {
    const { name, description, color, seo } = req.body;
    
    // Validaciones
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del tag es requerido'
      });
    }
    
    // Generar slug único
    const slug = await generateTagSlug(name);
    
    // Crear tag
    const tag = await BlogTag.create({
      name,
      slug,
      description,
      color,
      seo
    });
    
    res.status(201).json({
      success: true,
      message: 'Tag creado exitosamente',
      data: tag
    });
    
  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al crear tag',
      error: error.message
    });
  }
};

/**
 * @desc    Actualizar tag
 * @route   PUT /api/blog/tags/:id
 * @access  Private (MANAGE_BLOG_TAGS)
 */
export const updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, isActive, seo } = req.body;
    
    const tag = await BlogTag.findById(id);
    
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag no encontrado'
      });
    }
    
    // Si se cambió el nombre, regenerar slug
    if (name && name !== tag.name) {
      tag.slug = await generateTagSlug(name, id);
      tag.name = name;
    }
    
    // Actualizar otros campos
    if (description !== undefined) tag.description = description;
    if (color !== undefined) tag.color = color;
    if (isActive !== undefined) tag.isActive = isActive;
    if (seo !== undefined) tag.seo = { ...tag.seo, ...seo };
    
    await tag.save();
    
    res.json({
      success: true,
      message: 'Tag actualizado exitosamente',
      data: tag
    });
    
  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al actualizar tag',
      error: error.message
    });
  }
};

/**
 * @desc    Eliminar tag
 * @route   DELETE /api/blog/tags/:id
 * @access  Private (MANAGE_BLOG_TAGS)
 */
export const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { force = 'false' } = req.query;
    
    const tag = await BlogTag.findById(id);
    
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag no encontrado'
      });
    }
    
    // Si force=true, remover de todos los posts antes de eliminar
    if (force === 'true') {
      await BlogPost.updateMany(
        { tags: id },
        { $pull: { tags: id } }
      );
      
      await tag.deleteOne();
      
      return res.json({
        success: true,
        message: 'Tag eliminado y removido de todos los posts'
      });
    }
    
    // Verificar si está en uso
    const postCount = await BlogPost.countDocuments({ tags: id });
    
    if (postCount > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar. El tag está asociado a ${postCount} post(s). Use force=true para forzar eliminación.`,
        postCount
      });
    }
    
    await tag.deleteOne();
    
    res.json({
      success: true,
      message: 'Tag eliminado exitosamente'
    });
    
  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al eliminar tag',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener posts de un tag
 * @route   GET /api/blog/tags/:slug/posts
 * @access  Public
 */
export const getTagPosts = async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 10, sort = '-publishedAt' } = req.query;
    
    // Buscar tag
    const tag = await BlogTag.findOne({ slug, isActive: true });
    
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag no encontrado'
      });
    }
    
    // Obtener posts paginados
    const posts = await BlogPost.find({
      tags: tag._id,
      isPublished: true,
      status: 'published'
    })
      .populate('author', 'firstName lastName')
      .populate('category', 'name slug color')
      .populate('tags', 'name slug') // ✅ Optimizado: removido color
      .select('title slug excerpt featuredImage publishedAt readingTime category') // ✅ Agregado select
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    
    const total = await BlogPost.countDocuments({
      tags: tag._id,
      isPublished: true,
      status: 'published'
    });
    
    res.json({
      success: true,
      data: {
        tag: {
          _id: tag._id,
          name: tag.name,
          slug: tag.slug,
          description: tag.description,
          color: tag.color,
          usageCount: tag.usageCount
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
      message: 'Error al obtener posts del tag',
      error: error.message
    });
  }
};

/**
 * @desc    Crear múltiples tags de una vez
 * @route   POST /api/blog/tags/bulk
 * @access  Private (MANAGE_BLOG_TAGS)
 */
export const bulkCreateTags = async (req, res) => {
  try {
    const { tags } = req.body; // Array de nombres de tags
    
    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se espera un array de tags'
      });
    }
    
    const createdTags = [];
    const errors = [];
    
    for (const tagName of tags) {
      try {
        const slug = await generateTagSlug(tagName);
        const tag = await BlogTag.create({ name: tagName, slug });
        createdTags.push(tag);
      } catch (error) {
        errors.push({ name: tagName, error: error.message });
      }
    }
    
    res.status(201).json({
      success: true,
      message: `${createdTags.length} tag(s) creado(s) exitosamente`,
      data: createdTags,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al crear tags',
      error: error.message
    });
  }
};

export default {
  getAllTags,
  getPopularTags,
  getTagBySlug,
  createTag,
  updateTag,
  deleteTag,
  getTagPosts,
  bulkCreateTags
};
