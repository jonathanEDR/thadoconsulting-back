import BlogPost from '../models/BlogPost.js';
import BlogCategory from '../models/BlogCategory.js';
import BlogTag from '../models/BlogTag.js';
import User from '../models/User.js';
import { generatePostSlug } from '../utils/slugGenerator.js';
import { calculateReadingTime } from '../utils/readingTimeCalculator.js';
import { generatePostMetaTags, validatePostSEO } from '../utils/seoGenerator.js';
import { generateArticleSchema } from '../utils/schemaGenerator.js';
import postCacheService from '../services/postCacheService.js';
import { sanitizeBlogPost } from '../utils/sanitizer.js';

/**
 * @desc    Obtener todos los posts publicados (público)
 * @route   GET /api/blog/posts
 * @access  Public
 */
export const getAllPublishedPosts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      tag,
      tags, // Soporte para array de tags
      author,
      featured,
      sortBy = '-publishedAt',
      search
    } = req.query;
    
    const query = { isPublished: true, status: 'published' };
    
    // Filtros opcionales
    if (category) query.category = category;
    
    // Soporte para tag único o array de tags (con validación mejorada)
    if (tag && tag.trim()) {
      // Validar que no sea un string solo-hex (ID) 
      const cleanTag = tag.trim();
      if (!/^[a-f0-9]+$/i.test(cleanTag)) {
        query.tags = cleanTag;
      }
    } else if (tags && tags.length > 0) {
      // Si es un string con valores separados por coma, convertir a array
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      // Filtrar valores vacíos, undefined, y strings que parecen IDs (solo hex)
      const cleanTags = tagArray.filter(t => {
        if (!t || !t.trim || t.trim() === '') return false;
        // Filtrar strings que son solo caracteres hexadecimales (posibles ObjectIds)
        if (/^[a-f0-9]+$/i.test(t.trim())) return false;
        return true;
      });
      if (cleanTags.length > 0) {
        query.tags = { $in: cleanTags };
      }
    }
    
    if (author) query.author = author;
    if (featured !== undefined) query.isFeatured = featured === 'true';
    
    // Búsqueda por texto
    if (search) {
      query.$text = { $search: search };
    }
    
    let postsQuery = BlogPost.find(query)
      .populate('author', 'firstName lastName username avatar profileImage blogProfile') // ✅ Incluir avatar y blogProfile para tarjetas
      .populate('category', 'name slug color')
      .populate('tags', 'name slug color')
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // Si hay búsqueda, agregar score
    if (search) {
      postsQuery = postsQuery.select({ score: { $meta: 'textScore' } });
    }
    
    const posts = await postsQuery.lean();
    const total = await BlogPost.countDocuments(query);
    
    // 🔒 Sanitizar posts antes de enviar
    const sanitizedPosts = posts.map(post => sanitizeBlogPost(post));
    
    // ✅ Estructura consistente con getAllAdminPosts
    res.json({
      success: true,
      data: {
        data: sanitizedPosts,
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
      message: 'Error al obtener posts',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener TODOS los posts (incluye borradores) - ADMIN
 * @route   GET /api/blog/admin/posts
 * @access  Private/Admin
 */
export const getAllAdminPosts = async (req, res) => {
  try {
    
    
    
    
    const {
      page = 1,
      limit = 10,
      category,
      tag,
      tags, // Soporte para array de tags
      author,
      status,
      isPublished,
      sortBy = '-createdAt',
      search
    } = req.query;
    
    const query = {};
    
    // Filtros opcionales
    if (category) query.category = category;
    // Soporte para tag único o array de tags
    if (tag) {
      query.tags = tag;
    } else if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      query.tags = { $in: tagArray };
    }
    if (author) query.author = author;
    if (status) query.status = status;
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';
    
    // Búsqueda por texto
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    
    
    const posts = await BlogPost.find(query)
      .populate('author', 'firstName lastName email')
      .populate('category', 'name slug color')
      .populate('tags', 'name slug color')
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    
    const total = await BlogPost.countDocuments(query);
    
    
    
    res.json({
      success: true,
      data: {
        data: posts,
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
      message: 'Error al obtener posts',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener un post por slug (público)
 * @route   GET /api/blog/posts/:slug
 * @access  Public
 */
export const getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { incrementViews = 'true' } = req.query;
    
    const post = await BlogPost.findOne({ slug, isPublished: true, status: 'published' })
      .populate('author') // ✅ Traer todos los campos del author para debugging
      .populate('category', 'name slug color description')
      .populate('tags', 'name slug color')
      .lean();
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }
    
    // Incrementar vistas si se solicita
    if (incrementViews === 'true') {
      await BlogPost.findByIdAndUpdate(post._id, { $inc: { 'analytics.views': 1 } });
    }
    
    // Obtener posts relacionados
    const relatedPosts = await BlogPost.getRelatedPosts(post._id, 3);
    
    // 🔒 Sanitizar post y relacionados antes de enviar
    const sanitizedPost = sanitizeBlogPost(post);
    const sanitizedRelated = relatedPosts.map(p => sanitizeBlogPost(p));
    
    res.json({
      success: true,
      data: {
        post: sanitizedPost,
        relatedPosts: sanitizedRelated
      }
    });
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener post',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener un post por ID (admin) - incluye borradores
 * @route   GET /api/blog/admin/posts/:id
 * @access  Private/Admin
 */
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    
    
    
    const post = await BlogPost.findById(id)
      .populate('author', 'firstName lastName email')
      .populate('category', 'name slug color description')
      .populate('tags', 'name slug color')
      .lean();
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }
    
    
    
    res.json({
      success: true,
      data: post
    });
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener el post',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener posts destacados (público)
 * @route   GET /api/blog/posts/featured
 * @access  Public
 */
export const getFeaturedPosts = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    // ✅ Usar caché para posts destacados
    const posts = await postCacheService.getFeaturedPosts(parseInt(limit));
    
    // 🔒 Sanitizar posts antes de enviar
    const sanitizedPosts = posts.map(post => sanitizeBlogPost(post));
    
    res.json({
      success: true,
      data: sanitizedPosts,
      count: sanitizedPosts.length
    });
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener posts destacados',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener posts para mostrar en header menu
 * @route   GET /api/blog/posts/header-menu
 * @access  Public
 */
export const getHeaderMenuPosts = async (req, res) => {
  try {
    const posts = await BlogPost.find({
      isPublished: true,
      status: 'published',
      showInHeaderMenu: true
    })
      .select('title slug excerpt featuredImage')
      .sort('-publishedAt')
      .limit(5)
      .lean();
    
    // 🔒 Sanitizar posts antes de enviar
    const sanitizedPosts = posts.map(post => sanitizeBlogPost(post));
    
    res.json({
      success: true,
      data: sanitizedPosts,
      count: sanitizedPosts.length
    });
    
  } catch (error) {
    console.error('❌ Error al obtener posts del header menu:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener posts del header menu',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener posts populares
 * @route   GET /api/blog/posts/popular
 * @access  Public
 */
export const getPopularPosts = async (req, res) => {
  try {
    const { limit = 5, days = 30 } = req.query;
    
    // ✅ Usar caché para posts populares
    const posts = await postCacheService.getPopularPosts(parseInt(limit), parseInt(days));
    
    res.json({
      success: true,
      data: posts,
      count: posts.length
    });
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener posts populares',
      error: error.message
    });
  }
};

/**
 * @desc    Buscar posts por texto
 * @route   GET /api/blog/posts/search
 * @access  Public
 */
export const searchPosts = async (req, res) => {
  try {
    const { q: searchTerm, page = 1, limit = 10 } = req.query;
    
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'El parámetro de búsqueda "q" es requerido'
      });
    }
    
    const result = await BlogPost.searchPosts(searchTerm, { page, limit });
    
    res.json({
      success: true,
      data: result.posts,
      pagination: result.pagination,
      searchTerm
    });
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al buscar posts',
      error: error.message
    });
  }
};

/**
 * @desc    Crear nuevo post
 * @route   POST /api/blog/posts
 * @access  Private (CREATE_BLOG_POSTS)
 */
export const createPost = async (req, res) => {
  try {
    const {
      title,
      excerpt,
      content,
      contentFormat,
      featuredImage,
      category,
      tags,
      status,
      isPublished,
      scheduledPublishAt,
      seo,
      aiOptimization,
      isFeatured,
      allowComments,
      isPinned,
      showInHeaderMenu
    } = req.body;
    
        
    // Validaciones
    if (!title || !excerpt || !content || !category) {
      return res.status(400).json({
        success: false,
        message: 'Título, extracto, contenido y categoría son requeridos'
      });
    }
    
    // Validar que category es un ObjectId válido
    if (!category.match(/^[0-9a-fA-F]{24}$/)) {
      console.error(`❌ [createPost] ID de categoría inválido: ${category}`);
      return res.status(400).json({
        success: false,
        message: `ID de categoría inválido: ${category}. Debe ser un ObjectId de MongoDB de 24 caracteres hexadecimales.`
      });
    }
    
    // Obtener autor del usuario autenticado
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Verificar que la categoría existe
    const categoryExists = await BlogCategory.findById(category);
    if (!categoryExists) {
      console.error(`❌ [createPost] Categoría no encontrada con ID: ${category}`);
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Procesar tags: crear automáticamente si son strings
    let processedTags = [];
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        // Si el tag es un ObjectId válido, verificar que existe
        if (tag.match(/^[0-9a-fA-F]{24}$/)) {
          const existingTag = await BlogTag.findById(tag);
          if (existingTag) {
            processedTags.push(tag);
          }
        } else {
          // Si es un string, crear el tag automáticamente
          const tagSlug = tag.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          
          // Buscar si ya existe un tag con ese nombre o slug
          let existingTag = await BlogTag.findOne({ 
            $or: [
              { name: tag },
              { slug: tagSlug }
            ]
          });
          
          // Si no existe, crearlo
          if (!existingTag) {
            existingTag = await BlogTag.create({
              name: tag,
              slug: tagSlug,
              description: `Tag: ${tag}`
            });
            
          }
          
          processedTags.push(existingTag._id);
        }
      }
    }
    
    // Generar slug único
    const slug = await generatePostSlug(title);
    
    // Calcular tiempo de lectura
    const readingTime = calculateReadingTime(content, contentFormat || 'html');
    
    // 🎯 AUTO-GENERAR SEO SI NO SE PROPORCIONA
    let finalSeo = seo;
    if (!seo || !seo.metaTitle || !seo.metaDescription) {
      const tempPost = {
        title,
        excerpt,
        content,
        slug,
        tags: processedTags || [],
        author: { firstName: user.firstName, lastName: user.lastName }
      };
      
      const generatedMetaTags = await generatePostMetaTags(tempPost, 'https://thadoconsulting.pe');
      
      finalSeo = {
        metaTitle: seo?.metaTitle || generatedMetaTags.title,
        metaDescription: seo?.metaDescription || generatedMetaTags.description,
        focusKeyphrase: seo?.focusKeyphrase || tags?.[0] || '',
        canonicalUrl: seo?.canonicalUrl || `https://thadoconsulting.pe/blog/${slug}`,
        ogTitle: seo?.ogTitle || generatedMetaTags.openGraph.title,
        ogDescription: seo?.ogDescription || generatedMetaTags.openGraph.description,
        ogImage: seo?.ogImage || featuredImage?.url,
        twitterCard: seo?.twitterCard || generatedMetaTags.twitter.card,
        twitterTitle: seo?.twitterTitle || generatedMetaTags.twitter.title,
        twitterDescription: seo?.twitterDescription || generatedMetaTags.twitter.description,
        twitterImage: seo?.twitterImage || featuredImage?.url
      };
    }
    
    // ✅ Procesar featuredImage como STRING (igual que el modelo)
    let processedFeaturedImage = '';
    if (featuredImage) {
      if (typeof featuredImage === 'string' && featuredImage.trim() !== '') {
        processedFeaturedImage = featuredImage;  // Mantener como string
      } else if (typeof featuredImage === 'object' && featuredImage.url) {
        processedFeaturedImage = featuredImage.url;  // Extraer solo la URL
      }
    }
    
    // Crear post
    const postDataToCreate = {
      title,
      slug,
      excerpt,
      content,
      contentFormat: contentFormat || 'html',
      featuredImage: processedFeaturedImage,
      author: user._id,
      category,
      tags: processedTags,
      status: isPublished ? 'published' : (status || 'draft'),
      isPublished: isPublished || false,
      publishedAt: isPublished ? new Date() : null,
      scheduledPublishAt,
      seo: finalSeo,
      aiOptimization,
      readingTime,
      isFeatured: isFeatured || false,
      isPinned: isPinned || false,
      showInHeaderMenu: showInHeaderMenu || false,
      allowComments: allowComments !== undefined ? allowComments : true
    };

    console.log('💾 [createPost] Datos a guardar en DB:', {
      title: postDataToCreate.title,
      isPinned: postDataToCreate.isPinned,
      showInHeaderMenu: postDataToCreate.showInHeaderMenu,
      allowComments: postDataToCreate.allowComments
    });

    const post = await BlogPost.create(postDataToCreate);

    console.log('✅ [createPost] Post creado exitosamente en DB');
    console.log('📊 [createPost] Post creado con valores:', {
      _id: post._id,
      title: post.title,
      isPinned: post.isPinned,
      showInHeaderMenu: post.showInHeaderMenu,
      allowComments: post.allowComments,
      isPublished: post.isPublished
    });
    
        
    // Si se crea como publicado, actualizar contadores
    if (post.status === 'published') {
      await post.publish();
    }
    
    // ✅ Invalidar caché de posts
    postCacheService.invalidateOnPostChange();
    
    // Popular para respuesta
    await post.populate('author', 'firstName lastName email');
    await post.populate('category', 'name slug color');
    await post.populate('tags', 'name slug color');
    
    res.status(201).json({
      success: true,
      message: 'Post creado exitosamente',
      data: post
    });
    
  } catch (error) {
    console.error('❌ Error al crear post:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error al crear post',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * @desc    Actualizar post
 * @route   PUT /api/blog/posts/:id
 * @access  Private (EDIT_OWN_BLOG_POSTS o EDIT_ALL_BLOG_POSTS)
 */
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      excerpt,
      content,
      contentFormat,
      featuredImage,
      category,
      tags,
      status,
      isPublished,
      scheduledPublishAt,
      seo,
      aiOptimization,
      isFeatured,
      allowComments,
      isPinned,
      showInHeaderMenu
    } = req.body;
    
    
    
    
    const post = await BlogPost.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }
    
    // Verificar permisos de edición (se hace en middleware checkPostOwnership)
    
    // Si cambió el título, regenerar slug
    if (title && title !== post.title) {
      post.slug = await generatePostSlug(title, id);
      post.title = title;
    }
    
    // Actualizar contenido y recalcular tiempo de lectura si cambió
    if (content && content !== post.content) {
      post.content = content;
      post.contentFormat = contentFormat || post.contentFormat;
      post.readingTime = calculateReadingTime(content, post.contentFormat);
    }
    
    // Verificar categoría si cambió
    if (category && category !== post.category.toString()) {
      const categoryExists = await BlogCategory.findById(category);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }
      
      // Actualizar contadores si el post está publicado
      if (post.isPublished) {
        await BlogCategory.findByIdAndUpdate(post.category, { $inc: { postCount: -1 } });
        await BlogCategory.findByIdAndUpdate(category, { $inc: { postCount: 1 } });
      }
      
      post.category = category;
    }
    
    // Verificar tags si cambiaron
    if (tags !== undefined) {
      
      
      // ✅ PROCESAR TAGS: Crear automáticamente si son strings
      let processedTags = [];
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          // Si el tag es un ObjectId válido, verificar que existe
          if (typeof tag === 'string' && tag.match(/^[0-9a-fA-F]{24}$/)) {
            const existingTag = await BlogTag.findById(tag);
            if (existingTag) {
              processedTags.push(tag);
            }
          } else if (typeof tag === 'string') {
            // Si es un string (nombre de tag), crear el tag automáticamente
            const tagSlug = tag.toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '');
            
            // Buscar si ya existe un tag con ese nombre o slug
            let existingTag = await BlogTag.findOne({ 
              $or: [
                { name: tag },
                { slug: tagSlug }
              ]
            });
            
            // Si no existe, crearlo
            if (!existingTag) {
              existingTag = await BlogTag.create({
                name: tag,
                slug: tagSlug,
                description: `Tag: ${tag}`
              });
              
            }
            
            processedTags.push(existingTag._id);
          }
        }
      }
      
      
      
      const oldTags = post.tags.map(t => t.toString());
      const newTags = processedTags;
      
      // Actualizar contadores solo si está publicado
      if (post.isPublished) {
        const tagsToRemove = oldTags.filter(t => !newTags.includes(t));
        const tagsToAdd = newTags.filter(t => !oldTags.includes(t));
        
        if (tagsToRemove.length > 0) {
          await BlogTag.updateMany(
            { _id: { $in: tagsToRemove } },
            { $inc: { usageCount: -1 } }
          );
        }
        
        if (tagsToAdd.length > 0) {
          await BlogTag.updateMany(
            { _id: { $in: tagsToAdd } },
            { $inc: { usageCount: 1 } }
          );
        }
      }
      
      post.tags = newTags;
    }
    
    // Actualizar otros campos
    if (excerpt !== undefined) post.excerpt = excerpt;
    
    // ✅ SIMPLIFICADO: featuredImage como STRING (igual que Media Library)
    if (featuredImage !== undefined) {
      post.featuredImage = featuredImage || '';
    }
    
    if (status !== undefined) post.status = status;
    if (scheduledPublishAt !== undefined) post.scheduledPublishAt = scheduledPublishAt;
    
    // ✅ Actualizar estado de publicación
    if (isPublished !== undefined) {
      const wasPublished = post.isPublished;
      post.isPublished = isPublished;
      
      // Si se está publicando por primera vez
      if (isPublished && !wasPublished) {
        post.status = 'published';
        post.publishedAt = new Date();
        
      }
      
      // Si se está despublicando
      if (!isPublished && wasPublished) {
        post.status = 'draft';
        
      }
    }
    
    // ✅ Actualizar isPinned
    if (isPinned !== undefined) post.isPinned = isPinned;
    
    // ✅ Actualizar showInHeaderMenu
    if (showInHeaderMenu !== undefined) {
      console.log('🔄 [updatePost] Actualizando showInHeaderMenu:', showInHeaderMenu);
      post.showInHeaderMenu = showInHeaderMenu;
    }
    
    // 🎯 AUTO-ACTUALIZAR SEO SI CAMBIARON CAMPOS RELEVANTES
    if (seo !== undefined || title || excerpt || content) {
      const shouldRegenerateSEO = (
        !post.seo?.metaTitle || 
        !post.seo?.metaDescription || 
        (seo && Object.keys(seo).length > 0)
      );
      
      if (shouldRegenerateSEO) {
        await post.populate('author', 'firstName lastName');
        await post.populate('tags', 'name');
        
        const generatedMetaTags = await generatePostMetaTags(post.toObject(), 'https://thadoconsulting.pe');
        
        post.seo = {
          ...post.seo,
          metaTitle: seo?.metaTitle || post.seo?.metaTitle || generatedMetaTags.title,
          metaDescription: seo?.metaDescription || post.seo?.metaDescription || generatedMetaTags.description,
          focusKeyphrase: seo?.focusKeyphrase || post.seo?.focusKeyphrase || post.tags?.[0]?.name || '',
          canonicalUrl: seo?.canonicalUrl || post.seo?.canonicalUrl || `https://thadoconsulting.pe/blog/${post.slug}`,
          ogTitle: seo?.ogTitle || post.seo?.ogTitle || generatedMetaTags.openGraph.title,
          ogDescription: seo?.ogDescription || post.seo?.ogDescription || generatedMetaTags.openGraph.description,
          ogImage: seo?.ogImage || post.seo?.ogImage || post.featuredImage?.url,
          twitterCard: seo?.twitterCard || post.seo?.twitterCard || generatedMetaTags.twitter.card,
          twitterTitle: seo?.twitterTitle || post.seo?.twitterTitle || generatedMetaTags.twitter.title,
          twitterDescription: seo?.twitterDescription || post.seo?.twitterDescription || generatedMetaTags.twitter.description,
          twitterImage: seo?.twitterImage || post.seo?.twitterImage || post.featuredImage?.url,
          ...seo
        };
      }
    }
    
    if (aiOptimization !== undefined) post.aiOptimization = { ...post.aiOptimization, ...aiOptimization };
    if (isFeatured !== undefined) post.isFeatured = isFeatured;
    if (allowComments !== undefined) post.allowComments = allowComments;
    
    console.log('💾 [updatePost] Guardando post con campos:', {
      title: post.title,
      isPinned: post.isPinned,
      showInHeaderMenu: post.showInHeaderMenu,
      allowComments: post.allowComments,
      isPublished: post.isPublished
    });

    await post.save();

    console.log('✅ [updatePost] Post guardado exitosamente en DB');
    
    // ✅ Invalidar caché de posts
    postCacheService.invalidateOnPostChange();
        
    // Popular para respuesta
    await post.populate('author', 'firstName lastName email');
    await post.populate('category', 'name slug color');
    await post.populate('tags', 'name slug color');
    
    res.json({
      success: true,
      message: 'Post actualizado exitosamente',
      data: post
    });
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al actualizar post',
      error: error.message
    });
  }
};

/**
 * @desc    Eliminar post
 * @route   DELETE /api/blog/posts/:id
 * @access  Private (DELETE_OWN_BLOG_POSTS o DELETE_BLOG_POSTS)
 */
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await BlogPost.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }
    
    // Actualizar contadores si estaba publicado
    if (post.isPublished) {
      await BlogCategory.findByIdAndUpdate(post.category, { $inc: { postCount: -1 } });
      
      if (post.tags && post.tags.length > 0) {
        await BlogTag.updateMany(
          { _id: { $in: post.tags } },
          { $inc: { usageCount: -1 } }
        );
      }
    }
    
    await post.deleteOne();
    
    // ✅ Invalidar caché de posts
    postCacheService.invalidateOnPostChange();
    
    res.json({
      success: true,
      message: 'Post eliminado exitosamente'
    });
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al eliminar post',
      error: error.message
    });
  }
};

/**
 * @desc    Publicar post
 * @route   PATCH /api/blog/posts/:id/publish
 * @access  Private (PUBLISH_BLOG_POSTS)
 */
export const publishPost = async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await BlogPost.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }
    
    if (post.isPublished) {
      return res.status(400).json({
        success: false,
        message: 'El post ya está publicado'
      });
    }
    
    await post.publish();
    
    // ✅ Invalidar caché de posts
    postCacheService.invalidateOnPostChange();
    
    await post.populate('author', 'firstName lastName email');
    await post.populate('category', 'name slug color');
    await post.populate('tags', 'name slug color');
    
    res.json({
      success: true,
      message: 'Post publicado exitosamente',
      data: post
    });
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al publicar post',
      error: error.message
    });
  }
};

/**
 * @desc    Despublicar post
 * @route   PATCH /api/blog/posts/:id/unpublish
 * @access  Private (PUBLISH_BLOG_POSTS)
 */
export const unpublishPost = async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await BlogPost.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }
    
    if (!post.isPublished) {
      return res.status(400).json({
        success: false,
        message: 'El post no está publicado'
      });
    }
    
    await post.unpublish();
    
    // ✅ Invalidar caché de posts
    postCacheService.invalidateOnPostChange();
    
    await post.populate('author', 'firstName lastName email');
    await post.populate('category', 'name slug color');
    await post.populate('tags', 'name slug color');
    
    res.json({
      success: true,
      message: 'Post despublicado exitosamente',
      data: post
    });
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al despublicar post',
      error: error.message
    });
  }
};

/**
 * @desc    Duplicar post
 * @route   POST /api/blog/posts/:id/duplicate
 * @access  Private (DUPLICATE_BLOG_POSTS)
 */
export const duplicatePost = async (req, res) => {
  try {
    const { id } = req.params;
    
    const originalPost = await BlogPost.findById(id);
    
    if (!originalPost) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }
    
    // Obtener usuario actual
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Crear copia
    const postData = originalPost.toObject();
    delete postData._id;
    delete postData.createdAt;
    delete postData.updatedAt;
    delete postData.publishedAt;
    
    // Modificar datos para la copia
    postData.title = `${postData.title} (Copia)`;
    postData.slug = await generatePostSlug(postData.title);
    postData.author = user._id;
    postData.status = 'draft';
    postData.isPublished = false;
    postData.isFeatured = false;
    postData.analytics = {
      views: 0,
      uniqueVisitors: 0,
      likes: 0,
      shares: { facebook: 0, twitter: 0, linkedin: 0, whatsapp: 0 },
      avgTimeOnPage: 0,
      bounceRate: 0
    };
    postData.likedBy = [];
    postData.bookmarkedBy = [];
    
    const duplicatedPost = await BlogPost.create(postData);
    
    await duplicatedPost.populate('author', 'firstName lastName email');
    await duplicatedPost.populate('category', 'name slug color');
    await duplicatedPost.populate('tags', 'name slug color');
    
    res.status(201).json({
      success: true,
      message: 'Post duplicado exitosamente',
      data: duplicatedPost
    });
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al duplicar post',
      error: error.message
    });
  }
};

/**
 * @desc    Dar/quitar like a un post
 * @route   POST /api/blog/posts/:id/like
 * @access  Private (Usuario autenticado)
 */
export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    
    
    
    const post = await BlogPost.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }
    
    const userId = req.auth.userId;
    
    
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    
    
    
    const liked = await post.toggleLike(user._id);
    
    res.json({
      success: true,
      message: liked ? 'Like agregado' : 'Like removido',
      data: {
        liked,
        likes: post.analytics.likes
      }
    });
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al procesar like',
      error: error.message
    });
  }
};

/**
 * @desc    Guardar/quitar bookmark de un post
 * @route   POST /api/blog/posts/:id/bookmark
 * @access  Private (Usuario autenticado)
 */
export const toggleBookmark = async (req, res) => {
  try {
    const { id } = req.params;
    
    
    
    const post = await BlogPost.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }
    
    const userId = req.auth.userId;
    
    
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    const bookmarked = await post.toggleBookmark(user._id);
    
    res.json({
      success: true,
      message: bookmarked ? 'Post guardado' : 'Post removido de guardados',
      data: {
        bookmarked
      }
    });
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al procesar bookmark',
      error: error.message
    });
  }
};

/**
 * @desc    Obtener posts publicados de un usuario específico
 * @route   GET /api/blog/posts/user/:username
 * @access  Public
 */
export const getPostsByUser = async (req, res) => {
  try {
    const { username } = req.params;
    const {
      page = 1,
      limit = 6,
      sortBy = '-publishedAt'
    } = req.query;
    
    // Buscar usuario por username público
    const user = await User.findByPublicUsername(username);
    
    if (!user || !user.blogProfile?.isPublicProfile) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Obtener posts publicados del usuario
    const query = { 
      author: user._id, 
      isPublished: true, 
      status: 'published' 
    };
    
    const postsQuery = BlogPost.find(query)
      .populate('author', 'firstName lastName username avatar') // ✅ Optimizado: removidos email y profileImage
      .populate('category', 'name slug color')
      .populate('tags', 'name slug color')
      .select('title slug excerpt featuredImage category tags publishedAt readingTime stats isFeatured')
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    
    const [posts, totalPosts] = await Promise.all([
      postsQuery,
      BlogPost.countDocuments(query)
    ]);
    
    const totalPages = Math.ceil(totalPosts / limit);
    
    res.json({
      success: true,
      data: posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalPosts,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener posts del usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener estadísticas del caché de posts (Admin)
 * @route   GET /api/blog/admin/cache-stats
 * @access  Private/Admin
 */
export const getCacheStats = async (req, res) => {
  try {
    const stats = postCacheService.getStats();
    
    res.json({
      success: true,
      data: stats,
      message: 'Estadísticas del caché obtenidas exitosamente'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del caché',
      error: error.message
    });
  }
};

/**
 * @desc    Invalidar caché manualmente (Admin)
 * @route   POST /api/blog/admin/invalidate-cache
 * @access  Private/Admin
 */
export const invalidateCache = async (req, res) => {
  try {
    postCacheService.invalidateOnPostChange();
    
    res.json({
      success: true,
      message: 'Caché invalidado exitosamente'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al invalidar caché',
      error: error.message
    });
  }
};

export default {
  getAllPublishedPosts,
  getPostBySlug,
  getFeaturedPosts,
  getPopularPosts,
  searchPosts,
  createPost,
  updatePost,
  deletePost,
  publishPost,
  unpublishPost,
  duplicatePost,
  toggleLike,
  toggleBookmark,
  getPostsByUser,
  getCacheStats,
  invalidateCache
};
