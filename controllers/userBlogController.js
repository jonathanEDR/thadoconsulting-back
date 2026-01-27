/**
 * 👤 User Blog Controller
 * Controlador para la actividad personal del usuario en el blog
 * Gestiona comentarios, bookmarks, likes e historial de lectura
 */

import BlogPost from '../models/BlogPost.js';
import BlogComment from '../models/BlogComment.js';
import User from '../models/User.js';

// ============================================
// ESTADÍSTICAS GENERALES DEL USUARIO
// ============================================

/**
 * @desc    Obtener estadísticas de actividad del usuario
 * @route   GET /api/user-blog/stats
 * @access  Private
 */
export const getUserBlogStats = async (req, res) => {
  try {
    const userId = req.user.clerkId;

    // Obtener usuario y su modelo completo
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }


    // Calcular estadísticas en paralelo
    const [
      totalComments,
      approvedComments,
      totalBookmarks,
      totalLikes
    ] = await Promise.all([
      BlogComment.countDocuments({ 'author.userId': user._id }),
      BlogComment.countDocuments({ 'author.userId': user._id, status: 'approved' }),
      BlogPost.countDocuments({ bookmarkedBy: user._id }),
      BlogPost.countDocuments({ likedBy: user._id })
    ]);


    // Obtener posts leídos (del historial de lectura)
    const postsRead = user.readingHistory?.length || 0;
    const readingHistory = user.readingHistory?.length || 0;
    
    // Calcular racha actual (días consecutivos de actividad)
    const currentStreak = calculateCurrentStreak(user);

    const stats = {
      totalComments,
      approvedComments,
      pendingComments: totalComments - approvedComments,
      totalBookmarks,
      totalLikes,
      postsRead,
      readingHistory,
      currentStreak,
      // Métricas adicionales
      engagement: {
        commentsPerWeek: 0, // TODO: Calcular basado en fechas
        favoriteCategories: [], // TODO: Calcular categorías más frecuentes
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// COMENTARIOS DEL USUARIO
// ============================================

/**
 * @desc    Obtener comentarios del usuario con filtros
 * @route   GET /api/user-blog/my-comments
 * @access  Private
 */
export const getMyComments = async (req, res) => {
  try {
    const userId = req.user.clerkId;
    const {
      page = 1,
      limit = 10,
      status, // 'approved', 'pending', 'rejected', 'spam'
      postSlug,
      sortBy = '-createdAt'
    } = req.query;

    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Construir query
    const query = { 'author.userId': user._id };
    
    if (status) {
      query.status = status;
    }

    // Si se especifica un post
    if (postSlug) {
      const post = await BlogPost.findOne({ slug: postSlug });
      if (post) {
        query.post = post._id;
      }
    }

    // Ejecutar query con paginación
    const commentsQuery = BlogComment.find(query)
      .populate('post', 'title slug featuredImage category')
      .populate({
        path: 'post',
        populate: {
          path: 'category',
          select: 'name slug color'
        }
      })
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const [comments, totalComments] = await Promise.all([
      commentsQuery.exec(),
      BlogComment.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalComments / limit);

    res.json({
      success: true,
      data: comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalComments,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener comentarios',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Eliminar mi comentario
 * @route   DELETE /api/user-blog/my-comments/:commentId
 * @access  Private
 */
export const deleteMyComment = async (req, res) => {
  try {
    const userId = req.user.clerkId;
    const { commentId } = req.params;

    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Buscar comentario y verificar que sea del usuario
    const comment = await BlogComment.findOne({
      _id: commentId,
      'author.userId': user._id
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado o no tienes permisos'
      });
    }

    await comment.deleteOne();

    res.json({
      success: true,
      message: 'Comentario eliminado correctamente'
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al eliminar comentario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// BOOKMARKS (POSTS GUARDADOS)
// ============================================

/**
 * @desc    Obtener posts guardados del usuario
 * @route   GET /api/user-blog/bookmarks
 * @access  Private
 */
export const getMyBookmarks = async (req, res) => {
  try {
    const userId = req.user.clerkId;
    const {
      page = 1,
      limit = 12,
      category,
      sortBy = '-bookmarkedAt'
    } = req.query;

    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Query base: posts que tienen este usuario en bookmarkedBy
    const query = { 
      bookmarkedBy: user._id,
      isPublished: true,
      status: 'published'
    };

    if (category) {
      query.category = category;
    }

    const postsQuery = BlogPost.find(query)
      .populate('author', 'firstName lastName username email profileImage')
      .populate('category', 'name slug color')
      .populate('tags', 'name slug color')
      .select('title slug excerpt featuredImage category tags publishedAt readingTime stats')
      .sort(sortBy === '-bookmarkedAt' ? '-updatedAt' : sortBy)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const [posts, totalPosts] = await Promise.all([
      postsQuery.exec(),
      BlogPost.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalPosts / limit);

    const response = {
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
    };
    res.json(response);

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener posts guardados',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Toggle bookmark en un post
 * @route   POST /api/user-blog/bookmarks/:postId
 * @access  Private
 */
export const toggleBookmark = async (req, res) => {
  try {
    const userId = req.user.clerkId;
    const { postId } = req.params;

    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const post = await BlogPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    // Toggle bookmark
    const isBookmarked = post.bookmarkedBy?.includes(user._id);
    
    if (isBookmarked) {
      // Remover bookmark
      post.bookmarkedBy = post.bookmarkedBy.filter(
        id => !id.equals(user._id)
      );
    } else {
      // Agregar bookmark
      if (!post.bookmarkedBy) {
        post.bookmarkedBy = [];
      }
      post.bookmarkedBy.push(user._id);
    }

    await post.save();

    res.json({
      success: true,
      message: isBookmarked ? 'Post removido de guardados' : 'Post guardado',
      data: {
        bookmarked: !isBookmarked,
        totalBookmarks: post.bookmarkedBy.length
      }
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al procesar bookmark',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// LIKES
// ============================================

/**
 * @desc    Obtener posts con like del usuario
 * @route   GET /api/user-blog/likes
 * @access  Private
 */
export const getMyLikes = async (req, res) => {
  try {
    const userId = req.user.clerkId;
    const {
      page = 1,
      limit = 10,
      sortBy = '-likedAt'
    } = req.query;

    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Query: posts que tienen este usuario en likedBy
    const query = { 
      likedBy: user._id,
      isPublished: true,
      status: 'published'
    };

    const postsQuery = BlogPost.find(query)
      .populate('author', 'firstName lastName username email profileImage')
      .populate('category', 'name slug color')
      .populate('tags', 'name slug color')
      .select('title slug excerpt featuredImage category tags publishedAt readingTime stats')
      .sort(sortBy === '-likedAt' ? '-updatedAt' : sortBy)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const [posts, totalPosts] = await Promise.all([
      postsQuery.exec(),
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
      message: 'Error al obtener posts con me gusta',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Toggle like en un post
 * @route   POST /api/user-blog/likes/:postId
 * @access  Private
 */
export const toggleLike = async (req, res) => {
  try {
    const userId = req.user.clerkId;
    const { postId } = req.params;

    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const post = await BlogPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    // Toggle like
    const isLiked = post.likedBy?.includes(user._id);
    
    if (isLiked) {
      // Remover like
      post.likedBy = post.likedBy.filter(
        id => !id.equals(user._id)
      );
      if (post.stats.likesCount > 0) {
        post.stats.likesCount--;
      }
    } else {
      // Agregar like
      if (!post.likedBy) {
        post.likedBy = [];
      }
      post.likedBy.push(user._id);
      post.stats.likesCount = (post.stats.likesCount || 0) + 1;
    }

    await post.save();

    res.json({
      success: true,
      message: isLiked ? 'Like removido' : 'Like agregado',
      data: {
        liked: !isLiked,
        totalLikes: post.stats.likesCount
      }
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al procesar like',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// HISTORIAL DE LECTURA
// ============================================

/**
 * @desc    Obtener historial de lectura del usuario
 * @route   GET /api/user-blog/reading-history
 * @access  Private
 */
export const getReadingHistory = async (req, res) => {
  try {
    const userId = req.user.clerkId;
    const {
      page = 1,
      limit = 20,
      period = 'all' // 'today', 'week', 'month', 'all'
    } = req.query;

    const user = await User.findOne({ clerkId: userId })
      .populate({
        path: 'readingHistory.post',
        select: 'title slug excerpt featuredImage category readingTime stats',
        populate: {
          path: 'category',
          select: 'name slug color'
        }
      });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    let history = user.readingHistory || [];

    // Filtrar por período
    if (period !== 'all') {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
      }

      if (startDate) {
        history = history.filter(item => new Date(item.lastReadAt) >= startDate);
      }
    }

    // Ordenar por más reciente
    history.sort((a, b) => new Date(b.lastReadAt) - new Date(a.lastReadAt));

    // Paginación manual
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedHistory = history.slice(startIndex, endIndex);

    const totalPages = Math.ceil(history.length / limit);

    res.json({
      success: true,
      data: paginatedHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: history.length,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener historial de lectura',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Registrar lectura de un post
 * @route   POST /api/user-blog/reading-history/:postId
 * @access  Private
 */
export const addToReadingHistory = async (req, res) => {
  try {
    const userId = req.user.clerkId;
    const { postId } = req.params;
    const { progress = 0 } = req.body; // Progreso de lectura en %

    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const post = await BlogPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    // Inicializar readingHistory si no existe
    if (!user.readingHistory) {
      user.readingHistory = [];
    }

    // Buscar si ya existe este post en el historial
    const existingIndex = user.readingHistory.findIndex(
      item => item.post.toString() === postId
    );

    if (existingIndex >= 0) {
      // Actualizar entrada existente
      user.readingHistory[existingIndex].lastReadAt = new Date();
      user.readingHistory[existingIndex].progress = progress;
      user.readingHistory[existingIndex].readCount++;
    } else {
      // Agregar nueva entrada
      user.readingHistory.push({
        post: postId,
        lastReadAt: new Date(),
        progress: progress,
        readCount: 1
      });
    }

    // Limitar el historial a los últimos 100 posts
    if (user.readingHistory.length > 100) {
      user.readingHistory = user.readingHistory.slice(-100);
    }

    await user.save();

    res.json({
      success: true,
      message: 'Lectura registrada'
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al registrar lectura',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calcular días consecutivos de actividad
 * Basado en comentarios, likes y lecturas
 */
function calculateCurrentStreak(user) {
  // Por ahora retornamos 0, se puede implementar la lógica completa
  // TODO: Implementar cálculo real basado en actividad diaria
  return 0;
}

export default {
  getUserBlogStats,
  getMyComments,
  deleteMyComment,
  getMyBookmarks,
  toggleBookmark,
  getMyLikes,
  toggleLike,
  getReadingHistory,
  addToReadingHistory
};
