import Page from '../models/Page.js';
import { ensureSuperAdminExists } from './roleHelper.js';
import { inicializarCategorias } from './categoriaInitializer.js';
import logger from './logger.js';
import INIT_CONFIG from '../config/initConfig.js';

/**
 * Datos por defecto para la página Home
 */
const defaultHomePageData = {
  pageSlug: 'home',
  pageName: 'Página Principal',
  content: {
    hero: {
      title: 'Impulsa tu Negocio con Asesoría Contable y Tributaria de Confianza',
      subtitle: 'Evita multas de SUNAT, ordena tu contabilidad y haz crecer tu empresa con el respaldo de contadores públicos colegiados.',
      description: 'Somos el aliado contable que entiende los desafíos de presupuesto y el ritmo de los negocios pequeños. Creamos soluciones simples y efectivas sin la complejidad innecesaria.',
      ctaText: 'Agenda una Consultoría Gratuita →',
      ctaLink: '#contacto',
      // Métricas destacadas del Hero
      metrics: [
        { value: '+500', label: 'MYPES Asesoradas en todo el Perú', icon: '✓' },
        { value: '10+', label: 'años de experiencia tributaria', icon: '✓' },
        { value: '0%', label: 'tolerancia a multas por nuestros errores', icon: '✓' }
      ],
      backgroundImage: {
        light: '',
        dark: ''
      },
      backgroundImageAlt: 'Hero background THADO Consulting',
      styles: {
        light: {
          titleColor: '#1F2937',
          subtitleColor: '#2554a3',
          descriptionColor: '#626871'
        },
        dark: {
          titleColor: '#FFFFFF',
          subtitleColor: '#5a8fd4',
          descriptionColor: '#D1D5DB'
        }
      }
    },
    solutions: {
      title: 'Servicios Contables y Tributarios: Soluciones a tu Medida',
      description: 'Desarrollamos servicios contables para PYMES con la experiencia tributaria que tu negocio necesita para optimizar costos y evitar sanciones de SUNAT.',
      backgroundImage: {
        light: '',
        dark: ''
      },
      backgroundImageAlt: 'Servicios THADO Consulting',
      styles: {
        light: {
          titleColor: '',
          descriptionColor: ''
        },
        dark: {
          titleColor: '',
          descriptionColor: ''
        }
      },
      cardsDesign: {
        light: {
          background: 'rgba(249, 250, 251, 0.95)',
          border: '#E5E7EB',
          borderWidth: '1px',
          shadow: '0 4px 6px -1px rgba(37, 84, 163, 0.1)',
          hoverBackground: 'rgba(255, 255, 255, 1)',
          hoverBorder: '#2554a3',
          hoverShadow: '0 20px 25px -5px rgba(37, 84, 163, 0.2)',
          iconGradient: 'linear-gradient(135deg, #2554a3 0%, #3462af 100%)',
          iconBackground: '#FFFFFF',
          iconColor: '#2554a3',
          titleColor: '#1F2937',
          descriptionColor: '#626871',
          linkColor: '#2554a3',
          cardMinWidth: '280px',
          cardMaxWidth: '100%',
          cardMinHeight: 'auto',
          cardPadding: '2rem',
          cardsAlignment: 'left',
          iconBorderEnabled: true,
          iconAlignment: 'center'
        },
        dark: {
          background: 'rgba(31, 41, 55, 0.95)',
          border: '#374151',
          borderWidth: '1px',
          shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
          hoverBackground: 'rgba(55, 65, 81, 1)',
          hoverBorder: '#3462af',
          hoverShadow: '0 20px 25px -5px rgba(52, 98, 175, 0.3)',
          iconGradient: 'linear-gradient(135deg, #3462af 0%, #5a8fd4 100%)',
          iconBackground: '#1F2937',
          iconColor: '#5a8fd4',
          titleColor: '#F9FAFB',
          descriptionColor: '#D1D5DB',
          linkColor: '#5a8fd4',
          cardMinWidth: '280px',
          cardMaxWidth: '100%',
          cardMinHeight: 'auto',
          cardPadding: '2rem',
          cardsAlignment: 'left',
          iconBorderEnabled: true,
          iconAlignment: 'center'
        }
      },
      items: [
        {
          icon: '📋',
          iconLight: '',
          iconDark: '',
          title: 'Contabilidad General',
          description: 'Mantenemos tus libros contables al día, generamos estados financieros precisos y te brindamos el control total de tu situación económica. Todo 100% digital y accesible.',
          gradient: 'from-blue-600 to-blue-800',
          features: [
            'Registro de operaciones de compras y ventas',
            'Libros electrónicos SIRE-SUNAT',
            'Estados financieros mensuales',
            'Conciliaciones bancarias',
            'Reportes personalizados para toma de decisiones'
          ]
        },
        {
          icon: '💰',
          iconLight: '',
          iconDark: '',
          title: 'Asesoría Tributaria SUNAT',
          description: 'Optimizamos tu carga tributaria de forma legal y te mantenemos al día con todas tus obligaciones ante SUNAT. Evita multas, fraccionamientos y fiscalizaciones.',
          gradient: 'from-blue-500 to-blue-700',
          features: [
            'Declaraciones mensuales (IGV, Renta, PDT)',
            'Declaración Jurada Anual',
            'Planificación tributaria preventiva',
            'Elección y cambio de régimen tributario',
            'Atención de requerimientos y fiscalizaciones SUNAT'
          ]
        },
        {
          icon: '👥',
          iconLight: '',
          iconDark: '',
          title: 'Gestión de Planillas y PLAME',
          description: 'Administramos tu personal de manera eficiente: desde el cálculo de remuneraciones hasta las declaraciones laborales. Cumplimos con todas las obligaciones.',
          gradient: 'from-green-500 to-green-700',
          features: [
            'Elaboración de planillas mensuales',
            'Cálculo y declaración de gratificaciones, CTS, vacaciones',
            'Declaración PLAME mensual',
            'Contratos de trabajo y liquidaciones',
            'Asesoría en régimen laboral MYPE'
          ]
        },
        {
          icon: '🏢',
          iconLight: '',
          iconDark: '',
          title: 'Constitución de Empresas',
          description: 'Formalizamos tu negocio de manera rápida y sin complicaciones. Te acompañamos desde la idea hasta que tengas tu RUC activo y listo para facturar.',
          gradient: 'from-purple-500 to-purple-700',
          features: [
            'Búsqueda y reserva de nombre en SUNARP',
            'Elaboración de minuta y escritura pública',
            'Inscripción en Registros Públicos',
            'Obtención de RUC y clave SOL',
            'Habilitación de facturación electrónica'
          ]
        },
        {
          icon: '🔍',
          iconLight: '',
          iconDark: '',
          title: 'Auditoría Financiera',
          description: 'Evaluamos la situación financiera real de tu empresa, identificamos riesgos y oportunidades de mejora. Ideal para créditos, inversionistas o licitaciones.',
          gradient: 'from-amber-500 to-amber-700',
          features: [
            'Revisión de estados financieros',
            'Análisis de control interno',
            'Dictamen de auditoría',
            'Carta de recomendaciones'
          ]
        },
        {
          icon: '📄',
          iconLight: '',
          iconDark: '',
          title: 'Facturación Electrónica',
          description: 'Te ayudamos a implementar y gestionar tu sistema de facturación electrónica. Cumple con la normativa SUNAT y emite comprobantes de forma ágil y segura.',
          gradient: 'from-cyan-500 to-cyan-700',
          features: [
            'Configuración inicial del sistema de emisión',
            'Capacitación en emisión de facturas, boletas, notas',
            'Soporte técnico continuo',
            'Integración con sistemas contables'
          ]
        }
      ]
    },
    featuredBlog: {
      headerIcon: 'Newspaper',
      headerIconColor: '#2554a3',
      fontFamily: 'Montserrat',
      title: 'Guías y Recursos para tu Negocio',
      subtitle: 'Accede a nuestras guías, tutoriales y artículos para mantenerte actualizado sobre contabilidad, tributación y gestión empresarial en Perú.',
      description: '',
      limit: 3,
      buttonText: 'Ver todos los artículos',
      buttonLink: '/blog',
      backgroundImage: {
        light: '',
        dark: ''
      },
      backgroundImageAlt: 'Featured blog background',
      styles: {
        light: {
          titleColor: '',
          subtitleColor: '',
          descriptionColor: ''
        },
        dark: {
          titleColor: '',
          subtitleColor: '',
          descriptionColor: ''
        }
      },
      cardsDesign: {
        light: {
          background: 'rgba(255, 255, 255, 0.95)',
          border: 'rgba(229, 231, 235, 1)',
          borderWidth: '1px',
          shadow: '0 4px 6px -1px rgba(37, 84, 163, 0.1)',
          hoverBackground: 'rgba(255, 255, 255, 1)',
          hoverShadow: '0 20px 25px -5px rgba(37, 84, 163, 0.2)',
          titleColor: '#1f2937',
          excerptColor: '#626871',
          metaColor: '#626871',
          badgeBackground: 'linear-gradient(135deg, #2554a3, #3462af)',
          badgeTextColor: '#ffffff',
          ctaColor: '#2554a3',
          ctaHoverColor: '#3462af'
        },
        dark: {
          background: 'rgba(31, 41, 55, 0.95)',
          border: 'rgba(55, 65, 81, 1)',
          borderWidth: '1px',
          shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
          hoverBackground: 'rgba(31, 41, 55, 1)',
          hoverShadow: '0 20px 25px -5px rgba(52, 98, 175, 0.3)',
          titleColor: '#f9fafb',
          excerptColor: '#d1d5db',
          metaColor: '#9ca3af',
          badgeBackground: 'linear-gradient(135deg, #3462af, #5a8fd4)',
          badgeTextColor: '#ffffff',
          ctaColor: '#5a8fd4',
          ctaHoverColor: '#3462af'
        }
      }
    },
    contact: {
      phone: '+51 973 397 306',
      email: 'contacto@thadoconsulting.pe',
      socialLinks: [
        {
          name: 'facebook',
          url: '#',
          icon: '',
          enabled: true
        },
        {
          name: 'twitter',
          url: '#',
          icon: '',
          enabled: true
        },
        {
          name: 'pinterest',
          url: '#',
          icon: '',
          enabled: true
        },
        {
          name: 'whatsapp',
          url: '#',
          icon: '',
          enabled: true
        }
      ]
    }
  },
  seo: {
    metaTitle: 'THADO Consulting | Contador para MYPES y Emprendedores en Perú',
    metaDescription: 'Servicios contables y asesoría tributaria para MYPES en todo Perú. Evita multas SUNAT, ordena tu contabilidad y crece con confianza. Consulta gratuita ✓',
    keywords: [
      'contador Perú',
      'estudio contable Lima',
      'contador para MYPE',
      'servicios contables Perú',
      'asesoría tributaria SUNAT',
      'outsourcing contable',
      'constitución de empresas Perú',
      'declaración jurada anual',
      'régimen MYPE tributario',
      'planillas electrónicas PLAME',
      'facturación electrónica SUNAT',
      'libros electrónicos SIRE'
    ],
    ogTitle: 'THADO Consulting | Contador para MYPES y Emprendedores en Perú',
    ogDescription: 'Servicios contables y asesoría tributaria para MYPES en todo Perú. Evita multas SUNAT, ordena tu contabilidad y crece con confianza.',
    ogImage: '',
    twitterCard: 'summary_large_image'
  },
  // 🆕 CONFIGURACIÓN DEL CHATBOT
  chatbotConfig: {
    enabled: true,
    botName: 'Asesor Contable THADO',
    statusText: 'En línea • Respuesta inmediata',
    logo: {
      light: '',
      dark: ''
    },
    logoAlt: 'Asesor Contable THADO',
    welcomeMessage: {
      title: '¡Hola! Soy tu Asesor Contable 📊',
      description: 'Estoy aquí para ayudarte con consultas sobre contabilidad, tributación, SUNAT y gestión empresarial.'
    },
    // 🎯 PREGUNTAS SUGERIDAS (las que aparecen al abrir el chat)
    suggestedQuestions: [
      {
        icon: '📊',
        text: '¿Qué servicios contables ofrecen?',
        message: '¿Qué servicios contables ofrecen?'
      },
      {
        icon: '💰',
        text: 'Consulta sobre SUNAT',
        message: 'Tengo dudas sobre mis obligaciones con SUNAT'
      },
      {
        icon: '📋',
        text: 'Cotizar servicios',
        message: 'Quiero cotizar servicios contables para mi empresa'
      },
      {
        icon: '📞',
        text: 'Agendar consultoría',
        message: '¿Cómo puedo agendar una consultoría gratuita?'
      }
    ],
    headerStyles: {
      light: {
        background: 'linear-gradient(to right, #EFF6FF, #F5F3FF)',
        titleColor: '#111827',
        subtitleColor: '#626871',
        logoBackground: 'linear-gradient(to bottom right, #2554a3, #3462af)'
      },
      dark: {
        background: 'linear-gradient(to right, #1F2937, #1F2937)',
        titleColor: '#FFFFFF',
        subtitleColor: '#9CA3AF',
        logoBackground: 'linear-gradient(to bottom right, #2554a3, #3462af)'
      }
    },
    buttonStyles: {
      size: 'medium',
      position: {
        bottom: '24px',
        right: '24px'
      },
      gradient: {
        from: '#2554a3',
        to: '#3462af'
      },
      shape: 'circle',
      icon: {
        light: '',
        dark: ''
      }
    },
    behavior: {
      autoOpen: false,
      autoOpenDelay: 5000,
      showUnreadBadge: true,
      showPoweredBy: true
    }
  },
  theme: {
    default: 'light',
    lightMode: {
      primary: '#2554a3',
      secondary: '#3462af',
      background: '#FFFFFF',
      text: '#1F2937',
      textSecondary: '#626871',
      cardBg: '#F9FAFB',
      border: '#E5E7EB',
      buttons: {
        ctaPrimary: {
          background: 'linear-gradient(90deg, #2554a3, #3462af, #2554a3)',
          textColor: '#FFFFFF',
          borderColor: 'transparent'
        },
        contact: {
          background: 'transparent',
          textColor: '#2554a3',
          borderColor: 'linear-gradient(90deg, #2554a3, #3462af)'
        },
        dashboard: {
          background: 'linear-gradient(90deg, #2554a3, #3462af)',
          textColor: '#FFFFFF',
          borderColor: 'transparent'
        },
        viewMore: {
          text: 'Ver más...',
          background: 'linear-gradient(135deg, #2554a3 0%, #3462af 100%)',
          textColor: '#FFFFFF',
          borderColor: 'transparent'
        },
        featuredBlogCta: {
          text: 'Ver todos los artículos',
          background: 'linear-gradient(135deg, #2554a3, #3462af)',
          textColor: '#FFFFFF',
          borderColor: 'transparent'
        }
      }
    },
    darkMode: {
      primary: '#3462af',
      secondary: '#5a8fd4',
      background: '#111827',
      text: '#F9FAFB',
      textSecondary: '#D1D5DB',
      cardBg: '#1F2937',
      border: '#374151',
      buttons: {
        ctaPrimary: {
          background: 'linear-gradient(90deg, #3462af, #5a8fd4, #3462af)',
          textColor: '#FFFFFF',
          borderColor: 'transparent'
        },
        contact: {
          background: 'transparent',
          textColor: '#5a8fd4',
          borderColor: 'linear-gradient(90deg, #3462af, #5a8fd4)'
        },
        dashboard: {
          background: 'linear-gradient(90deg, #3462af, #5a8fd4)',
          textColor: '#FFFFFF',
          borderColor: 'transparent'
        },
        viewMore: {
          text: 'Ver más...',
          background: 'linear-gradient(135deg, #3462af 0%, #5a8fd4 100%)',
          textColor: '#FFFFFF',
          borderColor: 'transparent'
        },
        featuredBlogCta: {
          text: 'Ver todos los artículos',
          background: 'linear-gradient(135deg, #3462af, #5a8fd4)',
          textColor: '#FFFFFF',
          borderColor: 'transparent'
        }
      }
    }
  },
  isPublished: true,
  updatedBy: 'system-init'
};

/**
 * Datos por defecto para la página Services
 */
const defaultServicesPageData = {
  pageSlug: 'services',
  pageName: 'Servicios Profesionales',
  metaTitle: 'Servicios Contables y Tributarios - THADO Consulting',
  metaDescription: 'Servicios de contabilidad, tributación, planillas y gestión empresarial para PYMES en Perú.',
  metaKeywords: ['servicios contables', 'tributación', 'planillas', 'SUNAT', 'contabilidad', 'asesoría'],
  ogTitle: 'Servicios Contables - THADO Consulting',
  ogDescription: 'Servicios profesionales de contabilidad y tributación',
  ogImage: '',
  content: {
    hero: {
      title: 'Nuestros Servicios',
      subtitle: 'Consultoría especializada para decisiones clave',
      description: 'Soluciones contables y tributarias diseñadas para impulsar el crecimiento de tu empresa.',
      backgroundImage: {
        light: '',
        dark: ''
      }
    }
  },
  isPublished: true,
  updatedBy: 'system-init'
};

/**
 * Inicializa las páginas requeridas en la base de datos
 * Se ejecuta al iniciar el servidor
 */
export const initializeDatabase = async () => {
  const startTime = Date.now();
  
  try {
    // Verificar si hay alguna inicialización activa
    const hasActiveInits = INIT_CONFIG.CREATE_HOME_PAGE || 
                          INIT_CONFIG.CREATE_SERVICES_PAGE || 
                          INIT_CONFIG.CREATE_ABOUT_PAGE ||
                          INIT_CONFIG.AUTO_UPDATE_CHATBOT;
    
    if (!hasActiveInits) {
      // Modo producción - solo verificar que existan las páginas
      const homePage = await Page.findOne({ pageSlug: 'home' });
      if (homePage) {
        logger.success('✅ Página Home verificada');
      } else {
        logger.warn('⚠️ Página Home no encontrada en BD');
      }
      return;
    }
    
    logger.init('Verificando estado de la base de datos', 'progress');

    // ========================================
    // 📄 PÁGINA HOME
    // ========================================
    const homePage = await Page.findOne({ pageSlug: 'home' });

    if (!homePage && INIT_CONFIG.CREATE_HOME_PAGE) {
      logger.init('Página Home no encontrada, creando configuración por defecto');
      await Page.create(defaultHomePageData);
      logger.success('Página Home creada exitosamente');
      logger.startup('Puedes editar el contenido desde el CMS Manager');
      logger.database('CREATE', 'pages', { slug: 'home' });
    } else if (!homePage) {
      logger.warn('⚠️  Página Home no encontrada (CREATE_HOME_PAGE = false)');
    } else if (INIT_CONFIG.FORCE_UPDATE_HOME_PAGE) {
      // 🔥 FORZAR ACTUALIZACIÓN COMPLETA DE LA PÁGINA HOME
      logger.init('🔄 FORCE_UPDATE_HOME_PAGE activo - Reinicializando página Home con datos del borrador...');

      // Actualizar todos los campos con los datos por defecto
      homePage.pageName = defaultHomePageData.pageName;
      homePage.content = defaultHomePageData.content;
      homePage.seo = defaultHomePageData.seo;
      homePage.chatbotConfig = defaultHomePageData.chatbotConfig;
      homePage.theme = defaultHomePageData.theme;
      homePage.lastUpdated = new Date();
      homePage.updatedBy = 'system-force-update';

      // Marcar todos los campos como modificados
      homePage.markModified('content');
      homePage.markModified('seo');
      homePage.markModified('chatbotConfig');
      homePage.markModified('theme');

      await homePage.save();

      logger.success('✅ Página Home REINICIALIZADA con datos del borrador THADO Consulting');
      logger.success('📋 Hero: ' + defaultHomePageData.content.hero.title.substring(0, 50) + '...');
      logger.success('🎯 Servicios: ' + defaultHomePageData.content.solutions.items.length + ' servicios configurados');
      logger.success('📝 SEO: ' + defaultHomePageData.seo.metaTitle);
      logger.database('FORCE_UPDATE', 'pages', { slug: 'home' });
    } else {
      logger.success('✅ Página Home encontrada');
      
      // 🆕 VERIFICACIÓN DEL CHATBOT
      if (INIT_CONFIG.AUTO_UPDATE_CHATBOT) {
        logger.init('⚠️  Configuración del chatbot incompleta o desactualizada, actualizando...');
        logger.info(`📊 Estado actual: ${JSON.stringify({
          hasConfig: !!homePage.content?.chatbotConfig,
          hasQuestions: !!homePage.content?.chatbotConfig?.suggestedQuestions,
          questionsCount: homePage.content?.chatbotConfig?.suggestedQuestions?.length || 0,
          hasEmptyIcons: hasEmptyIcons,
          lastUpdatedBy: homePage.updatedBy
        })}`);
        
        // Preguntas sugeridas con iconos explícitos
        const suggestedQuestionsData = [
          {
            icon: '💼',
            text: '¿Qué servicios ofrecen?',
            message: '¿Qué servicios ofrecen?'
          },
          {
            icon: '💰',
            text: 'Solicitar cotización',
            message: 'Quiero solicitar una cotización'
          },
          {
            icon: '📋',
            text: 'Ver precios y planes',
            message: '¿Cuáles son sus precios y planes?'
          },
          {
            icon: '📞',
            text: 'Información de contacto',
            message: '¿Cómo puedo contactarlos?'
          }
        ];
        
        // Crear o actualizar la configuración del chatbot
        if (!homePage.content.chatbotConfig) {
          homePage.content.chatbotConfig = {};
        }
        
        // Actualizar campos uno por uno para asegurar que se guardan
        homePage.content.chatbotConfig.enabled = true;
        homePage.content.chatbotConfig.botName = 'Asesor de Ventas';
        homePage.content.chatbotConfig.statusText = 'En línea • Respuesta inmediata';
        homePage.content.chatbotConfig.logoAlt = 'Asesor Virtual';
        
        if (!homePage.content.chatbotConfig.logo) {
          homePage.content.chatbotConfig.logo = { light: '', dark: '' };
        }
        
        if (!homePage.content.chatbotConfig.welcomeMessage) {
          homePage.content.chatbotConfig.welcomeMessage = {};
        }
        homePage.content.chatbotConfig.welcomeMessage.title = '¡Hola! Soy tu Asesor Virtual 👋';
        homePage.content.chatbotConfig.welcomeMessage.description = 'Estoy aquí para ayudarte con información sobre nuestros servicios, precios y cotizaciones.';
        
        // 🔥 CRÍTICO: Reemplazar completamente el array de preguntas
        homePage.content.chatbotConfig.suggestedQuestions = suggestedQuestionsData;
        
        // Mantener los estilos existentes si ya existen
        if (!homePage.content.chatbotConfig.headerStyles) {
          homePage.content.chatbotConfig.headerStyles = defaultHomePageData.chatbotConfig.headerStyles;
        }
        if (!homePage.content.chatbotConfig.buttonStyles) {
          homePage.content.chatbotConfig.buttonStyles = defaultHomePageData.chatbotConfig.buttonStyles;
        }
        if (!homePage.content.chatbotConfig.behavior) {
          homePage.content.chatbotConfig.behavior = defaultHomePageData.chatbotConfig.behavior;
        }
        
        // 🔥 IMPORTANTE: Marcar explícitamente todos los campos como modificados
        homePage.markModified('content');
        homePage.markModified('content.chatbotConfig');
        homePage.markModified('content.chatbotConfig.suggestedQuestions');
        
        homePage.lastUpdated = new Date();
        homePage.updatedBy = 'system-auto-update';
        
        logger.info(`💾 Guardando configuración completa del chatbot...`);
        logger.info(`📝 Preguntas a guardar: ${suggestedQuestionsData.length}`);
        logger.info(`🎨 Iconos: ${suggestedQuestionsData.map(q => q.icon).join(' ')}`);
        
        await homePage.save();
        
        // Verificar que se guardó correctamente
        const updatedPage = await Page.findOne({ pageSlug: 'home' }).lean();
        const savedQuestionsCount = updatedPage?.content?.chatbotConfig?.suggestedQuestions?.length || 0;
        const savedIcons = updatedPage?.content?.chatbotConfig?.suggestedQuestions?.map(q => q.icon || '❌') || [];
        
        logger.success('✅ Configuración del chatbot actualizada');
        logger.success(`📝 Preguntas sugeridas guardadas: ${savedQuestionsCount}`);
        logger.success(`🎨 Iconos guardados: ${savedIcons.join(' ')}`);
        logger.database('UPDATE', 'pages', { slug: 'home', field: 'chatbotConfig' });
        
        if (savedQuestionsCount === 0) {
          logger.error('❌ ERROR: Las preguntas NO se guardaron en la base de datos');
        }
        if (savedIcons.some(icon => !icon || icon === '❌')) {
          logger.error('❌ ERROR: Los iconos NO se guardaron correctamente');
        }
      } else {
        logger.success('✅ Configuración del chatbot completa');
      }
      
      // 🆕 VERIFICACIÓN DE FEATURED BLOG SECTION
      if (!homePage.content.featuredBlog) {
        logger.init('⚠️  Sección featuredBlog no encontrada, agregando configuración por defecto...');
        
        // Crear la sección featuredBlog con la configuración por defecto
        homePage.content.featuredBlog = defaultHomePageData.content.featuredBlog;
        
        // Marcar explícitamente el campo como modificado
        homePage.markModified('content');
        homePage.markModified('content.featuredBlog');
        
        homePage.lastUpdated = new Date();
        homePage.updatedBy = 'system-auto-update';
        
        logger.info('💾 Guardando configuración de featuredBlog...');
        await homePage.save();
        
        // Verificar que se guardó correctamente
        const updatedPage = await Page.findOne({ pageSlug: 'home' }).lean();
        const hasFeaturedBlog = !!updatedPage?.content?.featuredBlog;
        
        if (hasFeaturedBlog) {
          logger.success('✅ Sección featuredBlog agregada exitosamente');
          logger.success(`📝 Configuración: ${updatedPage.content.featuredBlog.title} (límite: ${updatedPage.content.featuredBlog.limit})`);
          logger.database('UPDATE', 'pages', { slug: 'home', field: 'featuredBlog' });
        } else {
          logger.error('❌ ERROR: La sección featuredBlog NO se guardó en la base de datos');
        }
      } else {
        logger.success('✅ Sección featuredBlog configurada');
      }
      
      logger.database('FOUND', 'pages', { slug: 'home' });
    }

    // ========================================
    // 📄 PÁGINA SERVICES
    // ========================================
    const servicesPage = await Page.findOne({ pageSlug: 'services' });

    if (!servicesPage && INIT_CONFIG.CREATE_SERVICES_PAGE) {
      logger.init('Página Services no encontrada, creando configuración por defecto');

      await Page.create(defaultServicesPageData);
      
      logger.success('Página Services creada exitosamente');
      logger.database('CREATE', 'pages', { slug: 'services' });
    } else if (!servicesPage) {
      logger.warn('⚠️  Página Services no encontrada (CREATE_SERVICES_PAGE = false)');
    } else {
      logger.success('✅ Página Services encontrada');
      logger.database('FOUND', 'pages', { slug: 'services' });
    }

    // ========================================
    // 📄 PÁGINA ABOUT
    // ========================================
    const aboutPage = await Page.findOne({ pageSlug: 'about' });

    if (!aboutPage && INIT_CONFIG.CREATE_ABOUT_PAGE) {
      logger.init('Página About no encontrada, creando configuración por defecto');

      await Page.create({
        pageSlug: 'about',
        pageName: 'Sobre Nosotros',
        content: {
          hero: {
            title: 'Sobre Nosotros',
            subtitle: 'Tu aliado contable de confianza',
            description: 'THADO Consulting es un estudio contable comprometido con el crecimiento de las MYPES y emprendedores en todo el Perú. Brindamos asesoría contable y tributaria con enfoque práctico y cercano.',
            backgroundImage: { light: '', dark: '' },
            backgroundImageAlt: 'About background THADO Consulting',
            styles: {
              light: { titleColor: '#1F2937', subtitleColor: '#2554a3', descriptionColor: '#626871' },
              dark: { titleColor: '#FFFFFF', subtitleColor: '#5a8fd4', descriptionColor: '#D1D5DB' }
            }
          },
          mission: {
            title: 'Nuestra Misión',
            description: 'Simplificar la contabilidad y tributación para MYPES y emprendedores, permitiéndoles enfocarse en hacer crecer sus negocios mientras nosotros nos encargamos de mantener sus finanzas en orden y cumplir con SUNAT.'
          },
          vision: {
            title: 'Nuestra Visión',
            description: 'Ser el estudio contable de referencia para MYPES en Perú, reconocido por nuestra cercanía, confiabilidad y resultados tangibles en el crecimiento de nuestros clientes.'
          },
          values: {
            title: 'Nuestros Valores',
            items: [
              { title: 'Confianza', description: 'Manejamos tu información con total confidencialidad y profesionalismo' },
              { title: 'Cercanía', description: 'Entendemos la realidad de las MYPES y hablamos tu mismo idioma' },
              { title: 'Responsabilidad', description: 'Cumplimos puntualmente con todas las obligaciones tributarias' },
              { title: 'Transparencia', description: 'Explicamos de forma clara cada proceso contable y tributario' }
            ]
          },
          team: {
            title: 'Nuestro Equipo',
            description: 'Contadores públicos colegiados con más de 10 años de experiencia en asesoría tributaria y contable para empresas de todos los tamaños.',
            showTeam: true
          },
          stats: {
            items: [
              { value: '+500', label: 'MYPES asesoradas' },
              { value: '10+', label: 'Años de experiencia' },
              { value: '100%', label: 'Cumplimiento tributario' },
              { value: '24/7', label: 'Soporte disponible' }
            ]
          }
        },
        seo: {
          metaTitle: 'Nosotros - THADO Consulting | Estudio Contable en Perú',
          metaDescription: 'Conoce a THADO Consulting, estudio contable especializado en MYPES y emprendedores. Más de 10 años de experiencia en contabilidad y tributación en Perú.',
          keywords: ['THADO Consulting', 'estudio contable Perú', 'contador Lima', 'asesoría tributaria', 'contabilidad MYPES', 'nosotros'],
          ogTitle: 'Nosotros - THADO Consulting',
          ogDescription: 'Estudio contable especializado en MYPES y emprendedores en Perú',
          ogImage: '',
          twitterCard: 'summary_large_image'
        },
        theme: {
          default: 'light',
          lightMode: {
            primary: '#2554a3',
            secondary: '#3462af',
            background: '#FFFFFF',
            text: '#1F2937',
            textSecondary: '#6B7280',
            cardBg: '#F9FAFB',
            border: '#E5E7EB'
          },
          darkMode: {
            primary: '#3462af',
            secondary: '#5a8fd4',
            background: '#111827',
            text: '#F9FAFB',
            textSecondary: '#D1D5DB',
            cardBg: '#1F2937',
            border: '#374151'
          }
        },
        isPublished: true,
        updatedBy: 'system-init'
      });
      
      logger.success('Página About creada exitosamente');
      logger.database('CREATE', 'pages', { slug: 'about' });
    } else if (!aboutPage) {
      logger.warn('⚠️  Página About no encontrada (CREATE_ABOUT_PAGE = false)');
    } else {
      logger.success('✅ Página About encontrada');
      logger.database('FOUND', 'pages', { slug: 'about' });
    }

    // ========================================
    // 📄 PÁGINA CONTACT
    // ========================================
    const contactPage = await Page.findOne({ pageSlug: 'contact' });

    if (!contactPage) {
      logger.init('Página Contact no encontrada, creando configuración por defecto');

      await Page.create({
        pageSlug: 'contact',
        pageName: 'Contacto',
        content: {
          contactPage: {
            hero: {
              title: '¿Necesitas asesoría contable?',
              subtitle: 'Cuéntanos sobre tu negocio y te ayudaremos a ordenar tu contabilidad y cumplir con SUNAT sin complicaciones. Primera consultoría gratuita.',
              features: ['Respuesta en 24 horas', 'Consultoría gratuita', 'Contadores colegiados'],
              backgroundImage: { light: '', dark: '' },
              backgroundOpacity: 1,
              backgroundOverlay: false,
              titleColor: '#111827',
              titleColorDark: '#ffffff',
              subtitleColor: '#4b5563',
              subtitleColorDark: '#9ca3af'
            },
            form: {
              backgroundImage: { light: '', dark: '' },
              backgroundOpacity: 1,
              backgroundOverlay: false
            },
            features: {
              title: '¿Por qué elegir THADO Consulting?',
              items: [
                { title: 'Sin multas SUNAT', description: 'Cumplimos puntualmente con todas tus obligaciones tributarias.', iconBgColor: 'blue' },
                { title: 'Precios accesibles', description: 'Planes diseñados para el presupuesto de MYPES y emprendedores.', iconBgColor: 'green' },
                { title: 'Atención personalizada', description: 'Un contador dedicado que conoce tu negocio y responde tus dudas.', iconBgColor: 'purple' }
              ],
              backgroundImage: { light: '', dark: '' },
              backgroundOpacity: 1,
              backgroundOverlay: false,
              titleColor: '#111827',
              titleColorDark: '#ffffff'
            }
          },
          contact: {
            phone: '+51 973 397 306',
            email: 'contacto@thadoconsulting.pe',
            address: 'Lima, Perú',
            socialLinks: []
          }
        },
        seo: {
          metaTitle: 'Contacto - THADO Consulting | Asesoría Contable',
          metaDescription: 'Contacta con THADO Consulting para recibir asesoría contable y tributaria personalizada. Consultoría gratuita para MYPES y emprendedores en Perú.',
          keywords: ['contacto', 'THADO Consulting', 'asesoría contable', 'contador Lima', 'consultoría tributaria'],
          ogTitle: 'Contacto - THADO Consulting',
          ogDescription: 'Ponte en contacto con nuestro equipo de contadores',
          ogImage: '',
          twitterCard: 'summary_large_image'
        },
        isPublished: true,
        updatedBy: 'system-init'
      });
      
      logger.success('Página Contact creada exitosamente');
      logger.database('CREATE', 'pages', { slug: 'contact' });
    } else {
      logger.success('✅ Página Contact encontrada');
      logger.database('FOUND', 'pages', { slug: 'contact' });
    }

    // ========================================
    // 📄 PÁGINA SERVICIO DETALLE
    // ========================================
    const servicioDetailPage = await Page.findOne({ pageSlug: 'servicio-detail' });

    if (!servicioDetailPage) {
      logger.init('Página Servicio Detail no encontrada, creando configuración por defecto');

      await Page.create({
        pageSlug: 'servicio-detail',
        pageName: 'Detalle de Servicio',
        content: {
          hero: {
            title: 'Detalle del Servicio',
            subtitle: 'Información completa sobre nuestros servicios',
            description: 'Conoce todos los detalles, características y beneficios de nuestros servicios.',
            backgroundImage: { light: '', dark: '' },
            backgroundImageAlt: 'Servicio Detail background',
            styles: {
              light: { titleColor: '', subtitleColor: '', descriptionColor: '' },
              dark: { titleColor: '', subtitleColor: '', descriptionColor: '' }
            }
          },
          servicioDetailConfig: {
            hero: {
              showBreadcrumb: true,
              showBackButton: true,
              overlayOpacity: 50,
              gradientColor: 'from-gray-900/80',
              background: {
                type: 'gradient',
                gradientFrom: '#f9fafb',
                gradientTo: '#ede9fe',
                imageLight: '',
                imageDark: '',
                overlayOpacity: 0,
                overlayColor: '#000000'
              }
            },
            accordion: {
              defaultOpenPanel: 'descripcion',
              expandMultiple: false,
              animationDuration: 300,
              showPanelDescription: false,
              panels: [
                { id: 'descripcion', label: 'Descripción', icon: '📋', enabled: true, description: 'Información general del servicio' },
                { id: 'caracteristicas', label: 'Características', icon: '✨', enabled: true, description: 'Qué ofrece este servicio' },
                { id: 'beneficios', label: 'Beneficios', icon: '🎯', enabled: true, description: 'Ventajas para tu negocio' },
                { id: 'incluye', label: 'Qué Incluye', icon: '✅', enabled: true, description: 'Detalle de inclusiones' },
                { id: 'info', label: 'Información Adicional', icon: '💡', enabled: true, description: 'Detalles extras' },
                { id: 'faq', label: 'Preguntas Frecuentes', icon: '❓', enabled: true, description: 'Dudas comunes' },
                { id: 'multimedia', label: 'Multimedia', icon: '🎥', enabled: true, description: 'Videos y galería' }
              ],
              background: {
                type: 'gradient',
                gradientFrom: '#f9fafb',
                gradientTo: '#ffffff',
                overlayOpacity: 0,
                overlayColor: '#000000',
                imageLight: '',
                imageDark: ''
              },
              styles: {
                light: {
                  panelBackground: 'rgba(255, 255, 255, 0.6)',
                  panelBorder: '#e5e7eb',
                  headerBackground: 'transparent',
                  headerText: '#111827',
                  headerIcon: '#2554a3',
                  contentBackground: 'rgba(255, 255, 255, 0.5)',
                  contentText: '#374151',
                  accentGradientFrom: '#2554a3',
                  accentGradientTo: '#3462af'
                },
                dark: {
                  panelBackground: 'rgba(31, 41, 55, 0.4)',
                  panelBorder: '#374151',
                  headerBackground: 'transparent',
                  headerText: '#ffffff',
                  headerIcon: '#3462af',
                  contentBackground: 'rgba(17, 24, 39, 0.3)',
                  contentText: '#d1d5db',
                  accentGradientFrom: '#3462af',
                  accentGradientTo: '#5a8fd4'
                }
              }
            },
            sidebar: {
              showRelatedServices: true,
              showCategoryTag: true,
              showPriceRange: true,
              showContactButton: true
            },
            design: {
              panelBorderRadius: 'rounded-xl',
              panelShadow: true,
              headerStyle: 'minimal',
              accentColor: '#7c3aed',
              contentPadding: 'p-6'
            },
            cta: {
              background: {
                type: 'gradient',
                gradientFrom: '#9333ea',
                gradientTo: '#2563eb',
                overlayOpacity: 0,
                overlayColor: '#000000',
                imageLight: '',
                imageDark: ''
              }
            }
          }
        },
        // ❌ SEO removido: Ahora se genera dinámicamente desde los datos del servicio individual
        // El SEO específico viene del servicio (titulo, descripcionCorta, etiquetas, etc.)
        seo: {
          metaTitle: '',
          metaDescription: '',
          keywords: [],
          ogTitle: '',
          ogDescription: '',
          ogImage: '',
          twitterCard: 'summary_large_image'
        },
        theme: {
          default: 'light',
          lightMode: {
            primary: '#2554a3',
            secondary: '#3462af',
            background: '#FFFFFF',
            text: '#1F2937',
            textSecondary: '#6B7280',
            cardBg: '#F9FAFB',
            border: '#E5E7EB'
          },
          darkMode: {
            primary: '#3462af',
            secondary: '#5a8fd4',
            background: '#111827',
            text: '#F9FAFB',
            textSecondary: '#D1D5DB',
            cardBg: '#1F2937',
            border: '#374151'
          }
        },
        isPublished: true,
        updatedBy: 'system-init'
      });
      
      logger.success('Página Servicio Detail creada exitosamente');
      logger.database('CREATE', 'pages', { slug: 'servicio-detail' });
    } else {
      logger.success('✅ Página Servicio Detail encontrada');
      logger.database('FOUND', 'pages', { slug: 'servicio-detail' });
    }

    // ========================================
    // 📝 PÁGINA BLOG POST DETALLE
    // ========================================
    const blogPostDetailPage = await Page.findOne({ pageSlug: 'blog-post-detail' });

    if (!blogPostDetailPage) {
      logger.init('Página Blog Post Detail no encontrada, creando configuración por defecto');

      await Page.create({
        pageSlug: 'blog-post-detail',
        pageName: 'Detalle de Post del Blog',
        content: {
          hero: {
            title: 'Artículo del Blog',
            subtitle: 'Contenido educativo y de valor',
            description: 'Lee nuestros artículos sobre tecnología, desarrollo de software e inteligencia artificial.',
            backgroundImage: { light: '', dark: '' },
            backgroundImageAlt: 'Blog Post Detail background',
            styles: {
              light: { titleColor: '', subtitleColor: '', descriptionColor: '' },
              dark: { titleColor: '', subtitleColor: '', descriptionColor: '' }
            }
          },
          blogPostDetailConfig: {
            // Configuración del Hero del Post
            hero: {
              variant: 'overlay', // 'overlay' | 'compact' | 'minimal'
              showBreadcrumb: true,
              showBackButton: true,
              showCategory: true,
              showReadingTime: true,
              showPublishDate: true,
              showAuthor: true,
              overlayOpacity: 60,
              background: {
                type: 'image', // 'image' | 'gradient' | 'solid'
                gradientFrom: '#0f0f0f',
                gradientTo: '#1a1a1a',
                overlayColor: '#000000'
              },
              styles: {
                light: {
                  titleColor: '#111827',
                  subtitleColor: '#6b7280',
                  metaColor: '#9ca3af'
                },
                dark: {
                  titleColor: '#ffffff',
                  subtitleColor: '#d4d4d4',
                  metaColor: '#9ca3af'
                }
              }
            },
            // Configuración del contenido principal
            content: {
              maxWidth: '680px',
              lineHeight: '1.8',
              fontSize: '18px',
              background: {
                light: '#ffffff',
                dark: '#0f0f0f'
              },
              textColor: {
                light: '#374151',
                dark: '#d4d4d4'
              },
              headingColor: {
                light: '#111827',
                dark: '#ffffff'
              },
              linkColor: {
                light: '#3b82f6',
                dark: '#60a5fa'
              },
              // Imagen de fondo de la sección de contenido
              backgroundImage: {
                light: '', // URL de la imagen para tema claro
                dark: ''   // URL de la imagen para tema oscuro
              },
              backgroundOverlay: {
                light: 80, // Opacidad del overlay para tema claro (0-100)
                dark: 90   // Opacidad del overlay para tema oscuro (0-100)
              }
            },
            // Tabla de contenidos (TOC)
            tableOfContents: {
              enabled: true,
              position: 'right', // 'left' | 'right' | 'none'
              sticky: true,
              showProgress: true,
              collapsible: true,
              defaultExpanded: true,
              maxDepth: 3, // H2 y H3
              styles: {
                light: {
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: '#e5e7eb',
                  activeColor: '#3b82f6',
                  textColor: '#374151',
                  progressColor: '#3b82f6'
                },
                dark: {
                  background: 'rgba(26, 26, 26, 0.8)',
                  border: '#374151',
                  activeColor: '#60a5fa',
                  textColor: '#9ca3af',
                  progressColor: '#60a5fa'
                }
              }
            },
            // Barra de progreso de lectura
            readingProgress: {
              enabled: true,
              position: 'top', // 'top' | 'bottom'
              height: '3px',
              color: {
                light: 'linear-gradient(90deg, #3b82f6, #2554a3)',
                dark: 'linear-gradient(90deg, #60a5fa, #3462af)'
              }
            },
            // Sección de autor
            author: {
              showCard: true,
              showBio: true,
              showSocialLinks: true,
              cardPosition: 'bottom', // 'bottom' | 'sidebar'
              styles: {
                light: {
                  background: '#f9fafb',
                  border: '#e5e7eb',
                  nameColor: '#111827',
                  bioColor: '#6b7280'
                },
                dark: {
                  background: '#1f2937',
                  border: '#374151',
                  nameColor: '#ffffff',
                  bioColor: '#9ca3af'
                }
              }
            },
            // Sección de tags
            tags: {
              showSection: true,
              maxVisible: 5,
              styles: {
                light: {
                  background: '#eff6ff',
                  textColor: '#1d4ed8',
                  hoverBackground: '#dbeafe'
                },
                dark: {
                  background: 'rgba(59, 130, 246, 0.2)',
                  textColor: '#60a5fa',
                  hoverBackground: 'rgba(59, 130, 246, 0.3)'
                }
              }
            },
            // Posts relacionados
            relatedPosts: {
              enabled: true,
              maxPosts: 4,
              showTitle: true,
              title: 'Artículos Relacionados',
              layout: 'grid', // 'grid' | 'carousel'
              styles: {
                light: {
                  background: '#ffffff',
                  cardBackground: '#f9fafb',
                  titleColor: '#111827'
                },
                dark: {
                  background: '#111827',
                  cardBackground: '#1f2937',
                  titleColor: '#ffffff'
                }
              }
            },
            // Navegación entre posts
            navigation: {
              enabled: true,
              showPrevNext: true,
              showThumbnails: false,
              styles: {
                light: {
                  background: '#f9fafb',
                  border: '#e5e7eb',
                  textColor: '#374151',
                  hoverBackground: '#eff6ff'
                },
                dark: {
                  background: '#1f2937',
                  border: '#374151',
                  textColor: '#d1d5db',
                  hoverBackground: '#374151'
                }
              }
            },
            // Comentarios
            comments: {
              enabled: true,
              allowAnonymous: false,
              moderationRequired: true,
              maxDepth: 3,
              styles: {
                light: {
                  background: '#ffffff',
                  border: '#e5e7eb',
                  authorColor: '#111827',
                  textColor: '#374151'
                },
                dark: {
                  background: '#1f2937',
                  border: '#374151',
                  authorColor: '#ffffff',
                  textColor: '#d1d5db'
                }
              }
            },
            // Botones de compartir
            shareButtons: {
              enabled: true,
              position: 'sidebar', // 'sidebar' | 'bottom' | 'both'
              platforms: ['twitter', 'facebook', 'linkedin', 'whatsapp', 'copy'],
              styles: {
                light: {
                  background: '#f3f4f6',
                  iconColor: '#6b7280',
                  hoverBackground: '#e5e7eb'
                },
                dark: {
                  background: '#374151',
                  iconColor: '#9ca3af',
                  hoverBackground: '#4b5563'
                }
              }
            },
            // Estilos de bloques especiales
            specialBlocks: {
              callout: {
                enabled: true,
                defaultType: 'info', // 'info' | 'warning' | 'success' | 'error'
                styles: {
                  info: { background: '#eff6ff', border: '#3b82f6', icon: '💡' },
                  warning: { background: '#fefce8', border: '#eab308', icon: '⚠️' },
                  success: { background: '#f0fdf4', border: '#22c55e', icon: '✅' },
                  error: { background: '#fef2f2', border: '#ef4444', icon: '❌' }
                }
              },
              codeBlock: {
                theme: 'dark', // 'dark' | 'light'
                showLineNumbers: true,
                showCopyButton: true
              },
              blockquote: {
                style: 'modern', // 'classic' | 'modern' | 'minimal'
                showQuoteIcon: true
              }
            }
          }
        },
        // ❌ SEO removido: Ahora se genera dinámicamente desde los datos del post individual
        // El SEO específico viene del post (title, excerpt, tags, featuredImage, etc.)
        seo: {
          metaTitle: '',
          metaDescription: '',
          keywords: [],
          ogTitle: '',
          ogDescription: '',
          ogImage: '',
          twitterCard: 'summary_large_image'
        },
        theme: {
          default: 'dark',
          lightMode: {
            primary: '#3B82F6',
            secondary: '#2554a3',
            background: '#FFFFFF',
            text: '#1F2937',
            textSecondary: '#6B7280',
            cardBg: '#F9FAFB',
            border: '#E5E7EB'
          },
          darkMode: {
            primary: '#60A5FA',
            secondary: '#3462af',
            background: '#0F0F0F',
            text: '#F9FAFB',
            textSecondary: '#D1D5DB',
            cardBg: '#1A1A1A',
            border: '#374151'
          }
        },
        isPublished: true,
        updatedBy: 'system-init'
      });
      
      logger.success('Página Blog Post Detail creada exitosamente');
      logger.database('CREATE', 'pages', { slug: 'blog-post-detail' });
    } else {
      logger.success('✅ Página Blog Post Detail encontrada');
      logger.database('FOUND', 'pages', { slug: 'blog-post-detail' });
    }

    // ========================================
    // 📄 PÁGINA DASHBOARD SIDEBAR
    // ========================================
    const dashboardSidebarPage = await Page.findOne({ pageSlug: 'dashboard-sidebar' });

    if (!dashboardSidebarPage && INIT_CONFIG.CREATE_DASHBOARD_SIDEBAR_PAGE !== false) {
      logger.init('Página Dashboard Sidebar no encontrada, creando configuración por defecto');
      
      await Page.create({
        pageSlug: 'dashboard-sidebar',
        pageName: 'Configuración del Sidebar del Dashboard',
        content: {
          dashboardSidebar: {
            admin: {
              headerGradientFrom: '#3b82f6',
              headerGradientVia: '#a855f7',
              headerGradientTo: '#ec4899',
              headerGradientFromDark: '#2563eb',
              headerGradientViaDark: '#7c3aed',
              headerGradientToDark: '#4f46e5',
              activeItemGradientFrom: '#3b82f6',
              activeItemGradientTo: '#a855f7',
              activeItemGradientFromDark: '#7c3aed',
              activeItemGradientToDark: '#2563eb',
              sidebarBgLight: 'rgba(255, 255, 255, 0.8)',
              sidebarBgDark: 'rgba(17, 24, 39, 0.9)',
              navBgLight: 'rgba(248, 250, 252, 0.8)',
              navBgDark: 'rgba(17, 24, 39, 0.8)',
              navBgTransparent: false,
              navTextColor: '#334155',
              navTextColorDark: '#e5e7eb',
              navHoverBgLight: 'rgba(241, 245, 249, 0.8)',
              navHoverBgDark: 'rgba(31, 41, 55, 0.8)',
              navHoverBgTransparent: false,
              hoverBorderGradientEnabled: false,
              hoverBorderGradientFrom: '#3b82f6',
              hoverBorderGradientTo: '#a855f7',
              footerBgLight: 'rgba(241, 245, 249, 0.8)',
              footerBgDark: 'rgba(3, 7, 18, 0.8)',
              logoutButtonGradientFrom: '#ef4444',
              logoutButtonGradientTo: '#dc2626'
            },
            client: {
              headerGradientFrom: '#22c55e',
              headerGradientVia: '#3b82f6',
              headerGradientTo: '#a855f7',
              headerGradientFromDark: '#2563eb',
              headerGradientViaDark: '#7c3aed',
              headerGradientToDark: '#4f46e5',
              activeItemGradientFrom: '#22c55e',
              activeItemGradientTo: '#3b82f6',
              activeItemGradientFromDark: '#2563eb',
              activeItemGradientToDark: '#7c3aed',
              sidebarBgLight: 'rgba(255, 255, 255, 0.8)',
              sidebarBgDark: 'rgba(17, 24, 39, 0.9)',
              navBgLight: 'rgba(248, 250, 252, 0.8)',
              navBgDark: 'rgba(17, 24, 39, 0.8)',
              navBgTransparent: false,
              navTextColor: '#334155',
              navTextColorDark: '#e5e7eb',
              navHoverBgLight: 'rgba(241, 245, 249, 0.8)',
              navHoverBgDark: 'rgba(31, 41, 55, 0.8)',
              navHoverBgTransparent: false,
              hoverBorderGradientEnabled: false,
              hoverBorderGradientFrom: '#22c55e',
              hoverBorderGradientTo: '#3b82f6',
              footerBgLight: 'rgba(241, 245, 249, 0.8)',
              footerBgDark: 'rgba(3, 7, 18, 0.8)',
              logoutButtonGradientFrom: '#ef4444',
              logoutButtonGradientTo: '#dc2626'
            },
            global: {
              logoUrl: '/logos/logo-white.svg',
              logoAlt: 'THADO Consulting',
              borderColorLight: 'rgba(226, 232, 240, 0.6)',
              borderColorDark: 'rgba(55, 65, 81, 0.6)',
              expandedWidth: '18rem',
              collapsedWidth: '4rem',
              themeToggleIconLight: 'Moon',
              themeToggleIconDark: 'Sun',
              themeToggleColorLight: '#f59e0b',
              themeToggleColorDark: '#fbbf24',
              fontFamily: 'Montserrat',
              fontSizeBase: '0.875rem',
              fontSizeMenu: '0.9375rem',
              fontSizeHeader: '1rem',
              fontWeightNormal: '500',
              fontWeightBold: '600'
            },
            menuIcons: {
              dashboard: { iconName: 'LayoutDashboard', iconColorLight: '#6366f1', iconColorDark: '#818cf8' },
              profile: { iconName: 'User', iconColorLight: '#2554a3', iconColorDark: '#3462af' },
              servicios: { iconName: 'Rocket', iconColorLight: '#ec4899', iconColorDark: '#f472b6' },
              cms: { iconName: 'FileEdit', iconColorLight: '#14b8a6', iconColorDark: '#2dd4bf' },
              solicitudes: { iconName: 'ClipboardList', iconColorLight: '#f59e0b', iconColorDark: '#fbbf24' },
              mensajes: { iconName: 'MessageSquare', iconColorLight: '#3b82f6', iconColorDark: '#60a5fa' },
              agenda: { iconName: 'Calendar', iconColorLight: '#10b981', iconColorDark: '#34d399' },
              media: { iconName: 'Image', iconColorLight: '#f97316', iconColorDark: '#fb923c' },
              blog: { iconName: 'PenTool', iconColorLight: '#3462af', iconColorDark: '#5a8fd4' },
              agentesIA: { iconName: 'Bot', iconColorLight: '#2554a3', iconColorDark: '#3462af' },
              THADOAI: { iconName: 'Sparkles', iconColorLight: '#ec4899', iconColorDark: '#f472b6' },
              configuracion: { iconName: 'Settings', iconColorLight: '#6b7280', iconColorDark: '#9ca3af' },
              actividad: { iconName: 'Activity', iconColorLight: '#22c55e', iconColorDark: '#4ade80' },
              usuarios: { iconName: 'Users', iconColorLight: '#0ea5e9', iconColorDark: '#38bdf8' }
            }
          }
        },
        seo: {
          metaTitle: 'Dashboard Sidebar - THADO Consulting',
          metaDescription: 'Configuración del sidebar del dashboard',
          keywords: ['dashboard', 'sidebar', 'configuración'],
          ogTitle: 'Dashboard Sidebar',
          ogDescription: 'Configuración del sidebar del dashboard',
          ogImage: '',
          twitterCard: 'summary'
        },
        theme: {
          default: 'dark',
          lightMode: {
            primary: '#3B82F6',
            secondary: '#2554a3',
            background: '#FFFFFF',
            text: '#1F2937',
            textSecondary: '#6B7280',
            cardBg: '#F9FAFB',
            border: '#E5E7EB'
          },
          darkMode: {
            primary: '#60A5FA',
            secondary: '#3462af',
            background: '#0F0F0F',
            text: '#F9FAFB',
            textSecondary: '#D1D5DB',
            cardBg: '#1A1A1A',
            border: '#374151'
          }
        },
        isPublished: true,
        updatedBy: 'system-init'
      });
      
      logger.success('✅ Página Dashboard Sidebar creada exitosamente');
      logger.database('CREATE', 'pages', { slug: 'dashboard-sidebar' });
    } else if (!dashboardSidebarPage) {
      logger.warn('⚠️  Página Dashboard Sidebar no encontrada (CREATE_DASHBOARD_SIDEBAR_PAGE = false)');
    } else {
      logger.success('✅ Página Dashboard Sidebar encontrada');
      logger.database('FOUND', 'pages', { slug: 'dashboard-sidebar' });
    }

    // ========================================
    // 👤 SUPER ADMINISTRADOR
    // ========================================
    if (INIT_CONFIG.ENSURE_SUPER_ADMIN) {
      logger.init('Verificando Super Administrador del sistema');
      const superAdmin = await ensureSuperAdminExists();
      
      if (superAdmin) {
        logger.success('✅ Super Administrador verificado');
      } else {
        logger.warn('⚠️  No se pudo verificar/crear Super Administrador');
      }
    }

    // ========================================
    // 🏷️  CATEGORÍAS
    // ========================================
    if (INIT_CONFIG.INIT_CATEGORIES) {
      logger.init('Verificando categorías del sistema');
      await inicializarCategorias();
    }

    // ========================================
    // 📊 RESUMEN
    // ========================================
    const totalPages = await Page.countDocuments();
    
    if (INIT_CONFIG.SHOW_HEALTH_CHECK) {
      logger.database('COUNT', 'pages', { total: totalPages });
    }

    logger.performance('Inicialización de base de datos', startTime);
    console.log('✅ Base de datos inicializada correctamente\n');

  } catch (error) {
    logger.error('Error al inicializar base de datos', error);
    logger.warn('El servidor continuará, pero puede haber problemas con el CMS');
    logger.performance('Inicialización de base de datos (FAILED)', startTime);
    // No lanzar error para que el servidor pueda iniciar
  }
};

/**
 * Verifica la salud de la base de datos
 * Útil para health checks
 */
export const checkDatabaseHealth = async () => {
  try {
    const homePage = await Page.findOne({ pageSlug: 'home' });
    const totalPages = await Page.countDocuments();
    
    const healthStatus = {
      healthy: !!homePage,
      pages: {
        home: !!homePage,
        total: totalPages
      },
      timestamp: new Date().toISOString()
    };
    
    logger.debug('Health check completado', healthStatus);
    
    return healthStatus;
  } catch (error) {
    logger.error('Error en health check de la base de datos', error);
    
    return {
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

export default {
  initializeDatabase,
  checkDatabaseHealth,
  defaultHomePageData
};




