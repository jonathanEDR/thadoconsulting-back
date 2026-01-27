import Contact from '../models/Contact.js';
import Lead from '../models/Lead.js';
import { body, validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import { validators } from '../middleware/securityMiddleware.js';

/**
 * 🗂️ MAPEO DINÁMICO DE CATEGORÍAS
 * Obtiene categorías desde la base de datos y las mapea a valores del enum Lead.tipoServicio
 */
const getCategoriaMapping = async () => {
  try {
    // Importar modelo de Categoria dinámicamente para evitar dependencias circulares
    const { default: Categoria } = await import('../models/Categoria.js');
    
    const categorias = await Categoria.find({ activo: true }).select('nombre slug');
    
    // Crear mapeo de nombres de categorías a valores de tipoServicio del Lead
    const mapping = {};
    
    categorias.forEach(cat => {
      const nombre = cat.nombre.toLowerCase();
      const slug = cat.slug.toLowerCase();
      
      // Mapeo basado en el slug de la categoría
      switch (slug) {
        case 'desarrollo-web':
        case 'web':
          mapping[nombre] = 'web';
          mapping[slug] = 'web';
          break;
        case 'desarrollo-movil':
        case 'app':
        case 'aplicacion-movil':
          mapping[nombre] = 'app';
          mapping[slug] = 'app';
          break;
        case 'ecommerce':
        case 'tienda-online':
          mapping[nombre] = 'ecommerce';
          mapping[slug] = 'ecommerce';
          break;
        case 'sistemas':
        case 'mantenimiento':
        case 'sistemas-web':
          mapping[nombre] = 'sistemas';
          mapping[slug] = 'sistemas';
          break;
        case 'consultoria':
        case 'consulta':
          mapping[nombre] = 'consultoria';
          mapping[slug] = 'consultoria';
          break;
        case 'diseno':
        case 'diseño':
        case 'design':
          mapping[nombre] = 'diseño';
          mapping[slug] = 'diseño';
          break;
        case 'marketing':
        case 'marketing-digital':
          mapping[nombre] = 'marketing';
          mapping[slug] = 'marketing';
          break;
        default:
          mapping[nombre] = 'otro';
          mapping[slug] = 'otro';
      }
    });
    
    // Agregar mapeos adicionales comunes
    mapping['desarrollo'] = 'web';
    mapping['desarrollo web'] = 'web';
    mapping['aplicación móvil'] = 'app';
    mapping['móvil'] = 'app';
    mapping['e-commerce'] = 'ecommerce';
    mapping['tienda online'] = 'ecommerce';
    mapping['sistema'] = 'sistemas';
    mapping['consultoría'] = 'consultoria';
    mapping['consulta'] = 'consultoria';
    mapping['design'] = 'diseño';
    mapping['marketing digital'] = 'marketing';
    mapping['otro'] = 'otro';
    mapping['otros'] = 'otro';
    
    return mapping;
  } catch (error) {
    logger.warn('Error obteniendo categorías para mapeo:', error.message);
    
    // Fallback: mapeo estático básico
    return {
      'desarrollo web': 'web',
      'desarrollo': 'web',
      'web': 'web',
      'aplicación móvil': 'app',
      'app': 'app',
      'móvil': 'app',
      'e-commerce': 'ecommerce',
      'ecommerce': 'ecommerce',
      'tienda online': 'ecommerce',
      'sistemas': 'sistemas',
      'sistema': 'sistemas',
      'mantenimiento': 'sistemas',
      'consultoría': 'consultoria',
      'consultoria': 'consultoria',
      'consulta': 'consultoria',
      'diseño': 'diseño',
      'design': 'diseño',
      'marketing': 'marketing',
      'marketing digital': 'marketing',
      'otro': 'otro',
      'otros': 'otro'
    };
  }
};

/**
 * 🔄 NORMALIZAR TIPO DE SERVICIO
 * Convierte la categoría del frontend al valor del enum Lead.tipoServicio
 */
const normalizeServiceType = async (categoria) => {
  if (!categoria) return 'otro';
  
  const mapping = await getCategoriaMapping();
  const categoriaLower = categoria.toLowerCase().trim();
  
  // Buscar coincidencia exacta
  if (mapping[categoriaLower]) {
    return mapping[categoriaLower];
  }
  
  // Buscar coincidencia parcial
  for (const [key, value] of Object.entries(mapping)) {
    if (categoriaLower.includes(key) || key.includes(categoriaLower)) {
      return value;
    }
  }
  
  // Si no encuentra coincidencia, usar 'otro'
  logger.info(`Categoría no mapeada: "${categoria}" -> usando "otro"`);
  return 'otro';
};

/**
 * �️ OBTENER MAPEO DE CATEGORÍAS (PÚBLICO)
 * Endpoint para que el frontend obtenga el mapeo correcto de categorías
 */
export const getCategoriasTipoServicio = async (req, res) => {
  try {
    const mapping = await getCategoriaMapping();
    
    // También obtener las categorías completas con sus detalles
    const { default: Categoria } = await import('../models/Categoria.js');
    const categorias = await Categoria.find({ activo: true })
      .select('nombre slug descripcion icono color')
      .sort('orden nombre');
    
    // Crear respuesta con categorías y su mapeo a tipoServicio
    const categoriasConMapeo = categorias.map(cat => ({
      _id: cat._id,
      nombre: cat.nombre,
      slug: cat.slug,
      descripcion: cat.descripcion,
      icono: cat.icono,
      color: cat.color,
      tipoServicio: mapping[cat.nombre.toLowerCase()] || mapping[cat.slug.toLowerCase()] || 'otro'
    }));
    
    res.status(200).json({
      success: true,
      data: {
        categorias: categoriasConMapeo,
        mapping: mapping,
        enumValues: ['web', 'app', 'ecommerce', 'sistemas', 'consultoria', 'diseño', 'marketing', 'otro']
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo mapeo de categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo categorías',
      error: error.message
    });
  }
};
export const validateContactCreation = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .custom((value) => {
      // Detectar patrones de inyección en nombre
      const dangerousPatterns = [
        /<script/i, /javascript:/i, /on\w+\s*=/i, // XSS
        /['";].*(?:OR|AND|UNION|SELECT)/i, // SQL injection
        /\$\{.*\}/, /\{\{.*\}\}/, // Template injection
      ];
      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          throw new Error('Contenido no permitido detectado');
        }
      }
      return true;
    }),
  
  body('celular')
    .trim()
    .notEmpty().withMessage('El celular es requerido')
    .matches(/^[\d\s\+\-\(\)]+$/).withMessage('Formato de celular inválido')
    .isLength({ min: 6, max: 20 }).withMessage('El celular debe tener entre 6 y 20 caracteres'),
  
  body('correo')
    .trim()
    .notEmpty().withMessage('El correo es requerido')
    .isEmail().withMessage('Formato de correo inválido')
    .normalizeEmail()
    .isLength({ max: 254 }).withMessage('El correo es demasiado largo'),
  
  body('mensaje')
    .trim()
    .notEmpty().withMessage('El mensaje es requerido')
    .isLength({ min: 10, max: 2000 }).withMessage('El mensaje debe tener entre 10 y 2000 caracteres')
    .custom((value) => {
      // Detectar patrones de inyección en mensaje
      const dangerousPatterns = [
        /<script/i, /javascript:/i, /on\w+\s*=/i, // XSS
        /['";].*(?:OR|AND|UNION|SELECT|DROP|DELETE|INSERT|UPDATE)/i, // SQL injection
        /\$\{.*\}/, /\{\{.*\}\}/, // Template injection
        /data:text\/html/i, // Data URI attacks
      ];
      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          throw new Error('Contenido no permitido detectado');
        }
      }
      return true;
    }),
    
  body('categoria')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('La categoría no puede tener más de 100 caracteres')
    .escape() // Sanitizar HTML
];

/**
 * 📩 CREAR CONTACTO (PÚBLICO - AUTH OPCIONAL)
 * Endpoint para el formulario público del sitio web
 * ✅ Funciona sin autenticación (usuarios públicos)
 * ✅ Detecta usuarios autenticados para mejor seguimiento
 * ✅ TODO se guarda como Lead para el CRM
 */
export const createContact = async (req, res) => {
  try {
    // Validar datos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          campo: err.path,
          mensaje: err.msg
        }))
      });
    }

    const { nombre, celular, correo, mensaje, categoria } = req.body;

    // 🔍 Detectar si el usuario está autenticado (gracias a optionalAuth)
    const isAuthenticated = req.isAuthenticated || false;
    const authenticatedUser = req.user || null;

    // Crear metadata desde la request
    const metadata = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      referrer: req.get('referer'),
      idioma: req.get('accept-language')?.split(',')[0] || 'es',
      authenticated: isAuthenticated
    };

    // 🎯 SIMPLIFICADO: Crear SOLO Lead (no Contact)
    // El CRM maneja todo como Leads
    // Normalizar/validar el tipo de servicio dinámicamente desde las categorías de la BD
    const tipoServicioSafe = await normalizeServiceType(categoria);
    
    // Si no se pudo mapear correctamente, preservar la categoría original
    if (categoria && tipoServicioSafe === 'otro' && categoria.toLowerCase() !== 'otro') {
      metadata.originalCategoria = categoria;
    }

    const nuevoLead = new Lead({
      nombre,
      celular,
      correo: correo,
      tipoServicio: tipoServicioSafe,
      descripcionProyecto: mensaje,
      estado: 'nuevo',
      prioridad: isAuthenticated ? 'alta' : 'media', // Priorizar usuarios registrados
      origen: isAuthenticated ? 'web-authenticated' : 'web',
      tags: [
        isAuthenticated ? 'usuario-registrado' : 'contacto-publico',
        'formulario-web',
        ...(categoria ? [categoria] : [])
      ],
      creadoPor: {
        userId: authenticatedUser?.id || 'system',
        nombre: isAuthenticated ? `${authenticatedUser.firstName} ${authenticatedUser.lastName}`.trim() : 'Sistema Público',
        email: isAuthenticated ? authenticatedUser.email : 'sistema@thadoconsulting.pe'
      },
      // 🔗 Vincular con usuario registrado si está autenticado
      ...(isAuthenticated && authenticatedUser?.id && { 
        usuarioRegistrado: {
          userId: authenticatedUser.clerkId, // Usar clerkId para consistencia
          nombre: `${authenticatedUser.firstName} ${authenticatedUser.lastName}`.trim(),
          email: authenticatedUser.email,
          vinculadoEn: new Date(),
          vinculadoPor: {
            userId: authenticatedUser.clerkId,
            nombre: `${authenticatedUser.firstName} ${authenticatedUser.lastName}`.trim()
          }
        }
      }),
      // Metadata adicional
      metadata: {
        ...metadata,
        clerkId: authenticatedUser?.clerkId || null,
        mongoUserId: authenticatedUser?.id || null // Guardar también el ID de MongoDB
      },
      actividades: [{
        fecha: new Date(),
        tipo: 'nota',
        descripcion: isAuthenticated 
          ? `✅ Lead creado por usuario registrado: ${nombre} (${correo})`
          : `📝 Lead creado desde formulario público sin registro`,
        usuarioId: authenticatedUser?.clerkId || 'system',
        usuarioNombre: isAuthenticated ? `${authenticatedUser.firstName} ${authenticatedUser.lastName}`.trim() : 'Sistema Público'
      }]
    });

    await nuevoLead.save();

    // Respuesta exitosa
    res.status(201).json({
      success: true,
      message: isAuthenticated 
        ? '¡Gracias! Puedes hacer seguimiento en tu panel de cliente.' 
        : '¡Gracias por contactarnos! Te responderemos pronto.',
      leadId: nuevoLead._id,
      canAccessPanel: isAuthenticated, // Indicar si puede acceder al panel
      userType: isAuthenticated ? 'registered' : 'public'
    });

    // Log del nuevo lead
    logger.info(`✉️ Nuevo Lead CRM creado desde formulario ${isAuthenticated ? 'con usuario registrado' : 'público'}:`, {
      id: nuevoLead._id,
      nombre: nuevoLead.nombre,
      correo: nuevoLead.correo,
      authenticated: isAuthenticated,
      userId: authenticatedUser?.id || 'público'
    });

  } catch (error) {
    logger.error('Error al crear contacto/lead:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar tu mensaje. Por favor, intenta nuevamente.'
    });
  }
};

/**
 * 📋 OBTENER TODOS LOS CONTACTOS (ADMIN)
 * Con paginación, filtros y búsqueda
 */
export const getContacts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      estado,
      origen,
      prioridad,
      asignadoA,
      buscar,
      fechaDesde,
      fechaHasta,
      sortBy = 'fechaCreacion',
      sortOrder = 'desc'
    } = req.query;

    // Construir filtros
    const filtros = {};

    if (estado) filtros.estado = estado;
    if (origen) filtros.origen = origen;
    if (prioridad) filtros.prioridad = prioridad;
    if (asignadoA) filtros['asignadoA.userId'] = asignadoA;

    // Filtro de búsqueda por texto
    if (buscar) {
      const regex = new RegExp(buscar, 'i');
      filtros.$or = [
        { nombre: regex },
        { correo: regex },
        { celular: regex },
        { mensaje: regex }
      ];
    }

    // Filtro de fechas
    if (fechaDesde || fechaHasta) {
      filtros.fechaCreacion = {};
      if (fechaDesde) filtros.fechaCreacion.$gte = new Date(fechaDesde);
      if (fechaHasta) filtros.fechaCreacion.$lte = new Date(fechaHasta);
    }

    // Ordenamiento
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Ejecutar query con paginación
    const skip = (page - 1) * limit;
    const [contactos, total] = await Promise.all([
      Contact.find(filtros)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-metadata.userAgent -metadata.ip'), // Excluir datos sensibles
      Contact.countDocuments(filtros)
    ]);

    res.json({
      success: true,
      data: contactos,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener contactos'
    });
  }
};

/**
 * 🔍 OBTENER CONTACTO POR ID (ADMIN)
 */
export const getContactById = async (req, res) => {
  try {
    const { id } = req.params;

    const contacto = await Contact.findById(id);

    if (!contacto) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }

    // Si el contacto está en estado "nuevo", marcarlo como "leído"
    if (contacto.estado === 'nuevo') {
      contacto.estado = 'leido';
      contacto.fechaLectura = new Date();
      await contacto.save();
    }

    res.json({
      success: true,
      data: contacto
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener contacto'
    });
  }
};

/**
 * ✏️ ACTUALIZAR CONTACTO (ADMIN)
 * Actualizar estado, prioridad, asignación, etiquetas, etc.
 */
export const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const usuario = req.user; // Del middleware de autenticación

    const contacto = await Contact.findById(id);

    if (!contacto) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }

    // Campos permitidos para actualización directa
    const camposPermitidos = ['prioridad', 'etiquetas', 'calificacion'];
    camposPermitidos.forEach(campo => {
      if (updates[campo] !== undefined) {
        contacto[campo] = updates[campo];
      }
    });

    // Cambio de estado con método dedicado
    if (updates.estado && updates.estado !== contacto.estado) {
      contacto.cambiarEstado(updates.estado, {
        userId: usuario.clerkId,
        userName: usuario.nombre || usuario.firstName,
        userEmail: usuario.email
      });
    }

    // Asignación
    if (updates.asignadoA) {
      contacto.asignarA(updates.asignadoA);
    }

    await contacto.save();

    res.json({
      success: true,
      message: 'Contacto actualizado exitosamente',
      data: contacto
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error al actualizar contacto'
    });
  }
};

/**
 * 🗑️ ELIMINAR CONTACTO (ADMIN)
 */
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const contacto = await Contact.findByIdAndDelete(id);

    if (!contacto) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Contacto eliminado exitosamente'
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al eliminar contacto'
    });
  }
};

/**
 * 🔄 CAMBIAR ESTADO DEL CONTACTO (ADMIN)
 */
export const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const usuario = req.user;

    if (!estado) {
      return res.status(400).json({
        success: false,
        message: 'El estado es requerido'
      });
    }

    const contacto = await Contact.findById(id);

    if (!contacto) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }

    contacto.cambiarEstado(estado, {
      userId: usuario.clerkId,
      userName: usuario.nombre || usuario.firstName,
      userEmail: usuario.email
    });

    await contacto.save();

    res.json({
      success: true,
      message: `Estado cambiado a "${estado}" exitosamente`,
      data: contacto
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error al cambiar estado'
    });
  }
};

/**
 * 📝 AGREGAR NOTA AL CONTACTO (ADMIN)
 */
export const agregarNota = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, contenido } = req.body;
    const usuario = req.user;

    if (!contenido) {
      return res.status(400).json({
        success: false,
        message: 'El contenido de la nota es requerido'
      });
    }

    const contacto = await Contact.findById(id);

    if (!contacto) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }

    contacto.agregarNota(tipo || 'nota', contenido, {
      userId: usuario.clerkId,
      userName: usuario.nombre || usuario.firstName,
      userEmail: usuario.email
    });

    await contacto.save();

    res.json({
      success: true,
      message: 'Nota agregada exitosamente',
      data: contacto
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al agregar nota'
    });
  }
};

/**
 * 📊 OBTENER ESTADÍSTICAS (ADMIN)
 */
export const getEstadisticas = async (req, res) => {
  try {
    const stats = await Contact.getEstadisticasGenerales();

    // Estadísticas adicionales
    const [
      promedioRespuesta,
      contactosUltimaSemana,
      topOrigenes
    ] = await Promise.all([
      // Promedio de tiempo de respuesta (en horas)
      Contact.aggregate([
        { 
          $match: { 
            fechaRespuesta: { $exists: true },
            fechaCreacion: { $exists: true }
          } 
        },
        {
          $project: {
            tiempoRespuesta: {
              $divide: [
                { $subtract: ['$fechaRespuesta', '$fechaCreacion'] },
                1000 * 60 * 60 // Convertir a horas
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            promedio: { $avg: '$tiempoRespuesta' }
          }
        }
      ]),
      
      // Contactos de la última semana
      Contact.countDocuments({
        fechaCreacion: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }),
      
      // Top 5 orígenes
      Contact.aggregate([
        { $group: { _id: '$origen', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        ...stats,
        promedioRespuestaHoras: promedioRespuesta[0]?.promedio?.toFixed(2) || 0,
        contactosUltimaSemana,
        topOrigenes
      }
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};

/**
 * 📌 OBTENER CONTACTOS PENDIENTES (ADMIN)
 * Contactos nuevos o en proceso
 */
export const getContactosPendientes = async (req, res) => {
  try {
    const contactos = await Contact.getContactosPendientes();

    res.json({
      success: true,
      data: contactos,
      count: contactos.length
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener contactos pendientes'
    });
  }
};

/**
 * 🔍 BUSCAR CONTACTOS (ADMIN)
 */
export const buscarContactos = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El término de búsqueda debe tener al menos 2 caracteres'
      });
    }

    const contactos = await Contact.buscarPorTexto(q);

    res.json({
      success: true,
      data: contactos,
      count: contactos.length
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al buscar contactos'
    });
  }
};
