import Page from '../models/Page.js';
import { transformImageUrls } from '../utils/urlTransformer.js';
import { updateImageReferences } from '../utils/imageTracker.js';
import { sanitizeCmsHtml, sanitizePlainText, sanitizeUrl } from '../utils/sanitizer.js';

// Helper: Sanitizar contenido CMS recursivamente
const sanitizeCmsContent = (content) => {
  if (!content || typeof content !== 'object') return content;
  
  const sanitized = { ...content };
  
  // Función recursiva para sanitizar strings
  const sanitizeValue = (value, key) => {
    if (typeof value === 'string') {
      // Campos que típicamente contienen URLs
      if (['url', 'href', 'src', 'backgroundImage', 'image', 'logo', 'icon', 'avatar'].some(k => key.toLowerCase().includes(k.toLowerCase()))) {
        // Si es un string de URL, sanitizarla
        if (value.startsWith('http') || value.startsWith('/') || value.startsWith('data:image')) {
          return value; // URLs de imágenes son seguras en este contexto
        }
      }
      // Campos que pueden contener HTML
      if (['description', 'content', 'text', 'body', 'html'].some(k => key.toLowerCase().includes(k.toLowerCase()))) {
        return sanitizeCmsHtml(value);
      }
      // Campos de texto plano
      return sanitizePlainText(value, 5000);
    }
    if (Array.isArray(value)) {
      return value.map((item, idx) => sanitizeValue(item, `${key}[${idx}]`));
    }
    if (typeof value === 'object' && value !== null) {
      const sanitizedObj = {};
      for (const [k, v] of Object.entries(value)) {
        sanitizedObj[k] = sanitizeValue(v, k);
      }
      return sanitizedObj;
    }
    return value;
  };
  
  for (const [key, value] of Object.entries(content)) {
    sanitized[key] = sanitizeValue(value, key);
  }
  
  return sanitized;
};

// Helper: Convertir estructura de botones simplificada (nuevo formato)
const convertButtonsToBackend = (buttons) => {
  if (!buttons) return buttons;
  
  const converted = {};
  for (const [key, button] of Object.entries(buttons)) {
    // Nuevo formato simplificado: text, background, textColor, borderColor
    converted[key] = {
      text: button.text || '',
      background: button.background || button.bg || 'transparent',
      textColor: button.textColor || button.text || '#8B5CF6',
      borderColor: button.borderColor || button.border || 'transparent'
    };
  }
  return converted;
};

// Helper: Convertir estructura de botones de backend a frontend
const convertButtonsToFrontend = (buttons) => {
  if (!buttons) return buttons;
  
  const converted = {};
  for (const [key, button] of Object.entries(buttons)) {
    // Nuevo formato simplificado
    converted[key] = {
      text: button.text || '',
      background: button.background || 'transparent',
      textColor: button.textColor || '#8B5CF6',
      borderColor: button.borderColor || 'transparent'
    };
  }
  return converted;
};

// @desc    Obtener todas las páginas
// @route   GET /api/cms/pages
// @access  Public (para mostrar en el frontend)
export const getAllPages = async (req, res) => {
  try {
    const pages = await Page.find({ isPublished: true })
      .select('-__v')
      .sort({ pageSlug: 1 });
    
    // Convertir estructura de botones para el frontend y asegurar estilos
    const pagesWithConvertedButtons = pages.map(page => {
      const pageObj = page.toObject();
      
      // Migrar backgroundImage de string a objeto si es necesario para hero
      if (pageObj.content?.hero?.backgroundImage && typeof pageObj.content.hero.backgroundImage === 'string') {
        const oldValue = pageObj.content.hero.backgroundImage;
        pageObj.content.hero.backgroundImage = {
          light: '',
          dark: oldValue || ''
        };
      }
      
      // Migrar backgroundImage de string a objeto si es necesario para solutions
      if (pageObj.content?.solutions?.backgroundImage && typeof pageObj.content.solutions.backgroundImage === 'string') {
        const oldValue = pageObj.content.solutions.backgroundImage;
        pageObj.content.solutions.backgroundImage = {
          light: '',
          dark: oldValue || ''
        };
      }
      
      // Asegurar que los estilos existen para hero
      if (pageObj.content?.hero && !pageObj.content.hero.styles) {
        pageObj.content.hero.styles = {
          light: { titleColor: '', subtitleColor: '', descriptionColor: '' },
          dark: { titleColor: '', subtitleColor: '', descriptionColor: '' }
        };
      }
      
      // Asegurar que los estilos existen para solutions
      if (pageObj.content?.solutions && !pageObj.content.solutions.styles) {
        pageObj.content.solutions.styles = {
          light: { titleColor: '', descriptionColor: '' },
          dark: { titleColor: '', descriptionColor: '' }
        };
      }
      
    // Asegurar que los estilos existen para valueAdded
    if (pageObj.content?.valueAdded && !pageObj.content.valueAdded.styles) {
      pageObj.content.valueAdded.styles = {
        light: { titleColor: '', descriptionColor: '' },
        dark: { titleColor: '', descriptionColor: '' }
      };
    }

    // 🔧 CORRECCIÓN: Asegurar que cardsDesign existe para contactForm
    if (pageObj.content?.contactForm && !pageObj.content.contactForm.cardsDesign) {
      pageObj.content.contactForm.cardsDesign = {
        light: {
          background: 'rgba(255, 255, 255, 0.95)',
          border: 'rgba(0, 0, 0, 0.1)',
          borderWidth: '1px',
          shadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
          hoverBackground: 'rgba(255, 255, 255, 1)',
          hoverBorder: 'rgba(139, 92, 246, 0.4)',
          hoverShadow: '0 20px 40px rgba(139, 92, 246, 0.15)',
          titleColor: '#1f2937',
          descriptionColor: '#4b5563',
          cardMinWidth: '320px',
          cardMaxWidth: '480px',
          cardPadding: '1.5rem'
        },
        dark: {
          background: 'rgba(31, 41, 55, 0.95)',
          border: 'rgba(255, 255, 255, 0.1)',
          borderWidth: '1px',
          shadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          hoverBackground: 'rgba(31, 41, 55, 1)',
          hoverBorder: 'rgba(167, 139, 250, 0.5)',
          hoverShadow: '0 20px 40px rgba(167, 139, 250, 0.2)',
          titleColor: '#f9fafb',
          descriptionColor: '#9ca3af',
          cardMinWidth: '320px',
          cardMaxWidth: '480px',
          cardPadding: '1.5rem'
        }
      };
    }

    // 🔧 CORRECCIÓN: Asegurar que cardsDesign existe para solutions
    if (pageObj.content?.solutions && !pageObj.content.solutions.cardsDesign) {
      
      pageObj.content.solutions.cardsDesign = {
        light: {
          background: 'rgba(255, 255, 255, 0.1)',
          border: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
          borderWidth: '1px',
          shadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          hoverBackground: 'rgba(255, 255, 255, 0.15)',
          hoverBorder: 'linear-gradient(135deg, #a78bfa, #22d3ee)',
          hoverShadow: '0 20px 40px rgba(139, 92, 246, 0.2)',
          iconGradient: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
          iconBackground: 'rgba(255, 255, 255, 0.9)',
          iconColor: '#7528ee',
          titleColor: '#333333',
          descriptionColor: '#6B7280',
          linkColor: '#7528ee',
          cardMinWidth: '200px',
          cardMaxWidth: '100%',
          cardMinHeight: 'auto',
          cardPadding: '2rem',
          cardsAlignment: 'left',
          iconBorderEnabled: false,
          iconAlignment: 'center'
        },
        dark: {
          background: 'rgba(0, 0, 0, 0.3)',
          border: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
          borderWidth: '2px',
          shadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          hoverBackground: 'rgba(0, 0, 0, 0.4)',
          hoverBorder: 'linear-gradient(135deg, #a78bfa, #22d3ee)',
          hoverShadow: '0 20px 40px rgba(139, 92, 246, 0.3)',
          iconGradient: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
          iconBackground: 'rgba(17, 24, 39, 0.8)',
          iconColor: '#ffffff',
          titleColor: '#ffffff',
          descriptionColor: '#d1d5db',
          linkColor: '#a78bfa',
          cardMinWidth: '280px',
          cardMaxWidth: '100%',
          cardMinHeight: 'auto',
          cardPadding: '2rem',
          cardsAlignment: 'left',
          iconBorderEnabled: false,
          iconAlignment: 'center'
        }
      };
    }

    // 🔧 CORRECCIÓN: Asegurar que cardsDesign existe para valueAdded
    if (pageObj.content?.valueAdded && !pageObj.content.valueAdded.cardsDesign) {
      
      pageObj.content.valueAdded.cardsDesign = {
        light: {
          background: 'rgba(255, 255, 255, 0.9)',
          border: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
          borderWidth: '2px',
          shadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          hoverBackground: 'rgba(255, 255, 255, 0.95)',
          hoverBorder: 'linear-gradient(135deg, #a78bfa, #22d3ee)',
          hoverShadow: '0 20px 40px rgba(139, 92, 246, 0.2)',
          iconGradient: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
          iconBackground: 'rgba(255, 255, 255, 0.9)',
          iconColor: '#7528ee',
          titleColor: '#FFFFFF',
          descriptionColor: '#E5E7EB',
          linkColor: '#22d3ee',
          cardMinWidth: '280px',
          cardMaxWidth: '350px',
          cardMinHeight: '200px',
          cardPadding: '2rem',
          cardsAlignment: 'center',
          iconBorderEnabled: false,
          iconAlignment: 'center'
        },
        dark: {
          background: 'rgba(255, 255, 255, 0.9)',
          border: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
          borderWidth: '2px',
          shadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          hoverBackground: 'rgba(255, 255, 255, 0.95)',
          hoverBorder: 'linear-gradient(135deg, #a78bfa, #22d3ee)',
          hoverShadow: '0 20px 40px rgba(139, 92, 246, 0.3)',
          iconGradient: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
          iconBackground: 'rgba(17, 24, 39, 0.8)',
          iconColor: '#ffffff',
          titleColor: '#FFFFFF',
          descriptionColor: '#E5E7EB',
          linkColor: '#a78bfa',
          cardMinWidth: '280px',
          cardMaxWidth: '350px',
          cardMinHeight: '200px',
          cardPadding: '2rem',
          cardsAlignment: 'center',
          iconBorderEnabled: false,
          iconAlignment: 'center'
        }
      };
    }

    // Logs de depuración para verificar la corrección
    
    
          // Convertir botones
      if (pageObj.theme) {
        if (pageObj.theme.lightMode?.buttons) {
          pageObj.theme.lightMode.buttons = convertButtonsToFrontend(pageObj.theme.lightMode.buttons);
        }
        if (pageObj.theme.darkMode?.buttons) {
          pageObj.theme.darkMode.buttons = convertButtonsToFrontend(pageObj.theme.darkMode.buttons);
        }
      }
      return pageObj;
    });
    
    // Transformar URLs relativas a absolutas
    const pagesWithAbsoluteUrls = transformImageUrls(pagesWithConvertedButtons);
    
    // 🔒 Sanitizar contenido CMS antes de enviar
    const sanitizedPages = pagesWithAbsoluteUrls.map(page => ({
      ...page,
      content: sanitizeCmsContent(page.content)
    }));
    
    res.json({
      success: true,
      count: sanitizedPages.length,
      data: sanitizedPages
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener páginas',
      error: error.message
    });
  }
};

// @desc    Obtener una página por slug
// @route   GET /api/cms/pages/:slug
// @access  Public
export const getPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const page = await Page.findOne({ 
      pageSlug: slug,
      isPublished: true 
    }).select('-__v');
    
    if (!page) {
      return res.status(404).json({
        success: false,
        message: `Página '${slug}' no encontrada`
      });
    }
    
    // Convertir estructura de botones para el frontend
    const pageObj = page.toObject();
    
    // Migrar backgroundImage de string a objeto si es necesario
    if (pageObj.content?.hero?.backgroundImage && typeof pageObj.content.hero.backgroundImage === 'string') {
      const oldValue = pageObj.content.hero.backgroundImage;
      pageObj.content.hero.backgroundImage = {
        light: '',
        dark: oldValue || ''
      };
    }
    
    if (pageObj.content?.solutions?.backgroundImage && typeof pageObj.content.solutions.backgroundImage === 'string') {
      const oldValue = pageObj.content.solutions.backgroundImage;
      pageObj.content.solutions.backgroundImage = {
        light: '',
        dark: oldValue || ''
      };
    }
    
    // Asegurar que los estilos existen
    if (pageObj.content?.hero && !pageObj.content.hero.styles) {
      pageObj.content.hero.styles = {
        light: { titleColor: '', subtitleColor: '', descriptionColor: '' },
        dark: { titleColor: '', subtitleColor: '', descriptionColor: '' }
      };
    }
    
    if (pageObj.content?.solutions && !pageObj.content.solutions.styles) {
      pageObj.content.solutions.styles = {
        light: { titleColor: '', descriptionColor: '' },
        dark: { titleColor: '', descriptionColor: '' }
      };
    }
    
    if (pageObj.content?.valueAdded && !pageObj.content.valueAdded.styles) {
      pageObj.content.valueAdded.styles = {
        light: { titleColor: '', descriptionColor: '' },
        dark: { titleColor: '', descriptionColor: '' }
      };
    }
    
    if (pageObj.theme) {
      if (pageObj.theme.lightMode?.buttons) {
        pageObj.theme.lightMode.buttons = convertButtonsToFrontend(pageObj.theme.lightMode.buttons);
      }
      if (pageObj.theme.darkMode?.buttons) {
        pageObj.theme.darkMode.buttons = convertButtonsToFrontend(pageObj.theme.darkMode.buttons);
      }
    }
    
    // Transformar URLs relativas a absolutas
    const pageWithAbsoluteUrls = transformImageUrls(pageObj);
    
    // 🔒 Sanitizar contenido CMS antes de enviar
    const sanitizedPage = {
      ...pageWithAbsoluteUrls,
      content: sanitizeCmsContent(pageWithAbsoluteUrls.content)
    };
    
    res.json({
      success: true,
      data: sanitizedPage
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener página',
      error: error.message
    });
  }
};

// @desc    Actualizar contenido de una página
// @route   PUT /api/cms/pages/:slug
// @access  Private (requiere autenticación)
export const updatePage = async (req, res) => {
  try {
    const { slug } = req.params;
    const updateData = req.body;
    // Obtener datos anteriores para comparar imágenes
    const oldPage = await Page.findOne({ pageSlug: slug });
    
    // Convertir estructura de botones de frontend a backend antes de guardar
    if (updateData.theme) {
      if (updateData.theme.lightMode?.buttons) {
        updateData.theme.lightMode.buttons = convertButtonsToBackend(updateData.theme.lightMode.buttons);
      }
      if (updateData.theme.darkMode?.buttons) {
        updateData.theme.darkMode.buttons = convertButtonsToBackend(updateData.theme.darkMode.buttons);
      }
    }
    
    // Agregar información de actualización
    updateData.lastUpdated = Date.now();
    updateData.updatedBy = req.user?.email || 'admin';
    
    // 🔧 SOLUCIÓN: Usar findOne + save() en lugar de findOneAndUpdate
    // porque findOneAndUpdate puede ignorar strict: false en algunos casos
    let page = await Page.findOne({ pageSlug: slug });
    
    // 🆕 UPSERT: Si la página no existe, crearla automáticamente
    if (!page) {
      console.log(`📝 [CMS] Creando nueva página: ${slug}`);
      
      // Mapear slugs a nombres legibles
      const pageNames = {
        'home': 'Página Principal',
        'about': 'Sobre Nosotros',
        'services': 'Servicios',
        'contact': 'Contacto',
        'blog': 'Blog'
      };
      
      page = new Page({
        pageSlug: slug,
        pageName: updateData.pageName || pageNames[slug] || slug.charAt(0).toUpperCase() + slug.slice(1),
        content: updateData.content || {},
        seo: updateData.seo || {},
        theme: updateData.theme || {},
        isPublished: true,
        lastUpdated: updateData.lastUpdated,
        updatedBy: updateData.updatedBy
      });
      
      await page.save();
      
      console.log(`✅ [CMS] Página ${slug} creada exitosamente`);
      
      return res.status(201).json({
        success: true,
        message: `Página '${slug}' creada correctamente`,
        data: page
      });
    }
    
    // Actualizar campos manualmente
    if (updateData.content) {
      // 🔧 CORRECCIÓN: Limpiar IDs temporales de los logos antes de guardar
      if (updateData.content.clientLogos?.logos) {
        updateData.content.clientLogos.logos = updateData.content.clientLogos.logos.map(logo => {
          const cleanLogo = { ...logo };
          // Eliminar _id si es temporal o string que no sea ObjectId válido
          if (cleanLogo._id && (
            typeof cleanLogo._id === 'string' && 
            (cleanLogo._id.startsWith('temp_') || cleanLogo._id.length !== 24)
          )) {
            delete cleanLogo._id;
          }
          return cleanLogo;
        });
      }
      
      page.content = updateData.content;
      page.markModified('content'); // ⚠️ CRÍTICO: Marcar como modificado para forzar guardado
    }
    if (updateData.seo) {
      
      page.seo = updateData.seo;
      page.markModified('seo');
    }
    if (updateData.theme) {
      
      page.theme = updateData.theme;
      page.markModified('theme');
    }
    if (updateData.isPublished !== undefined) {
      
      page.isPublished = updateData.isPublished;
    }
    page.lastUpdated = updateData.lastUpdated;
    page.updatedBy = updateData.updatedBy;
    
    // Guardar cambios
    await page.save();
    console.log(`✅ [CMS-BACKEND] Página '${slug}' guardada exitosamente`);
    
    
    // Actualizar referencias de imágenes
    if (oldPage) {
      await updateImageReferences(
        oldPage.toObject(), 
        page.toObject(), 
        'Page', 
        page._id
      ).catch(error => {
        
      });
    }
    
    // Convertir de vuelta a formato frontend antes de enviar respuesta
    const pageObj = page.toObject();
    if (pageObj.theme) {
      if (pageObj.theme.lightMode?.buttons) {
        pageObj.theme.lightMode.buttons = convertButtonsToFrontend(pageObj.theme.lightMode.buttons);
      }
      if (pageObj.theme.darkMode?.buttons) {
        pageObj.theme.darkMode.buttons = convertButtonsToFrontend(pageObj.theme.darkMode.buttons);
      }
    }
    
    res.json({
      success: true,
      message: 'Página actualizada correctamente',
      data: pageObj
    });
  } catch (error) {
    console.error('❌ [ERROR] Error al actualizar página:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      slug: req.params.slug
    });
    res.status(500).json({
      success: false,
      message: 'Error al actualizar página',
      error: error.message,
      details: error.name === 'ValidationError' ? error.errors : undefined
    });
  }
};

// @desc    Crear o inicializar una página
// @route   POST /api/cms/pages
// @access  Private
export const createPage = async (req, res) => {
  try {
    const { pageSlug, pageName, content, seo } = req.body;
    
    // Verificar si ya existe
    const existingPage = await Page.findOne({ pageSlug });
    if (existingPage) {
      return res.status(400).json({
        success: false,
        message: `La página '${pageSlug}' ya existe`
      });
    }
    
    const page = await Page.create({
      pageSlug,
      pageName,
      content: content || {},
      seo: seo || {},
      updatedBy: req.user?.email || 'admin'
    });
    
    res.status(201).json({
      success: true,
      message: 'Página creada correctamente',
      data: page
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al crear página',
      error: error.message
    });
  }
};

// @desc    Inicializar página Home con datos por defecto
// @route   POST /api/cms/pages/init-home
// @access  Private
export const initHomePage = async (req, res) => {
  try {
    // Verificar si ya existe
    const existingPage = await Page.findOne({ pageSlug: 'home' });
    if (existingPage) {
      return res.status(400).json({
        success: false,
        message: 'La página Home ya está inicializada',
        data: existingPage
      });
    }
    
    // Crear página Home con contenido por defecto
    const homePage = await Page.create({
      pageSlug: 'home',
      pageName: 'Página Principal',
      content: {
        hero: {
          title: 'Impulsa tu Negocio con Asesoría Contable y Tributaria de Confianza',
          subtitle: 'Evita multas de SUNAT, ordena tu contabilidad y haz crecer tu empresa con el respaldo de contadores públicos colegiados',
          description: 'Somos el aliado contable que entiende los desafíos de presupuesto y el ritmo de los negocios pequeños. Creamos soluciones simples y efectivas sin la complejidad innecesaria.',
          ctaText: 'Agenda una Consultoría Gratuita',
          ctaLink: '#contacto'
        },
        solutions: {
          title: 'Nuestros Servicios Contables',
          description: 'En el dinámico entorno empresarial de hoy, una contabilidad ordenada es la columna vertebral del éxito. Impulsa la formalización, tranquilidad tributaria y el crecimiento de tu negocio.',
          items: [
            {
              icon: '📊',
              title: 'Contabilidad General',
              description: 'Registro de operaciones, libros electrónicos y estados financieros mensuales',
              gradient: 'from-purple-600 to-purple-400'
            },
            {
              icon: '📋',
              title: 'Asesoría Tributaria SUNAT',
              description: 'Declaraciones, planificación fiscal y defensa ante fiscalizaciones',
              gradient: 'from-cyan-600 to-cyan-400'
            },
            {
              icon: '👥',
              title: 'Gestión de Planillas',
              description: 'PLAME, AFP, CTS, gratificaciones y contratos laborales',
              gradient: 'from-amber-600 to-amber-400'
            }
          ]
        }
      },
      seo: {
        metaTitle: 'THADO Consulting | Contador para MYPES y Emprendedores en Perú',
        metaDescription: 'Servicios contables y asesoría tributaria para MYPES en todo Perú. Evita multas SUNAT, ordena tu contabilidad y crece con confianza.',
        keywords: ['contador Perú', 'servicios contables', 'asesoría tributaria', 'SUNAT', 'MYPE', 'planillas', 'contabilidad'],
        ogTitle: 'THADO Consulting | Contador para MYPES y Emprendedores en Perú',
        ogDescription: 'Servicios contables y asesoría tributaria para MYPES en todo Perú',
        ogImage: '/images/og-home.jpg',
        twitterCard: 'summary_large_image'
      },
      theme: {
        default: 'light',
        lightMode: {
          primary: '#8B5CF6',
          secondary: '#06B6D4',
          background: '#FFFFFF',
          text: '#1F2937',
          textSecondary: '#6B7280',
          cardBg: '#F9FAFB',
          border: '#E5E7EB'
        },
        darkMode: {
          primary: '#A78BFA',
          secondary: '#22D3EE',
          background: '#111827',
          text: '#F9FAFB',
          textSecondary: '#D1D5DB',
          cardBg: '#1F2937',
          border: '#374151'
        }
      },
      updatedBy: 'system'
    });
    
    res.status(201).json({
      success: true,
      message: 'Página Home inicializada correctamente',
      data: homePage
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Error al inicializar página Home',
      error: error.message
    });
  }
};

// @desc    Inicializar todas las páginas públicas faltantes
// @route   POST /api/cms/pages/init-all
// @access  Private
export const initAllPages = async (req, res) => {
  try {
    const pagesToCreate = [
      {
        pageSlug: 'about',
        pageName: 'Sobre Nosotros',
        content: {
          hero: {
            title: 'Sobre Nosotros',
            subtitle: 'Conoce nuestra historia y misión',
            description: 'THADO Consulting es una empresa especializada en contabilidad y asesoría tributaria para MYPES en Perú.'
          }
        },
        seo: {
          metaTitle: 'Nosotros - THADO Consulting',
          metaDescription: 'Conoce más sobre THADO Consulting, nuestra historia, misión y el equipo de contadores expertos.',
          keywords: ['THADO', 'nosotros', 'equipo', 'contadores', 'asesoría contable'],
          ogTitle: 'Nosotros - THADO Consulting',
          ogDescription: 'Somos una empresa especializada en contabilidad y tributación en Perú'
        },
        isPublished: true,
        updatedBy: 'system'
      },
      {
        pageSlug: 'services',
        pageName: 'Servicios',
        content: {
          hero: {
            title: 'Nuestros Servicios',
            subtitle: 'Soluciones contables integrales para tu empresa',
            description: 'Ofrecemos una variedad de servicios especializados en contabilidad y tributación'
          }
        },
        seo: {
          metaTitle: 'Servicios - THADO Consulting',
          metaDescription: 'Descubre nuestros servicios especializados en contabilidad, tributación y asesoría empresarial.',
          keywords: ['servicios contables', 'tributación', 'planillas', 'SUNAT', 'asesoría'],
          ogTitle: 'Servicios - THADO Consulting',
          ogDescription: 'Servicios profesionales de contabilidad y tributación'
        },
        isPublished: true,
        updatedBy: 'system'
      },
      {
        pageSlug: 'contact',
        pageName: 'Contacto',
        content: {
          hero: {
            title: 'Contacto',
            subtitle: 'Ponte en contacto con nosotros',
            description: 'Estamos listos para ayudarte con tu contabilidad y tributación'
          }
        },
        seo: {
          metaTitle: 'Contacto - THADO Consulting',
          metaDescription: 'Contacta con THADO Consulting. Estamos aquí para ayudarte con tu contabilidad y asesoría tributaria.',
          keywords: ['contacto', 'email', 'teléfono', 'THADO', 'asesoría contable'],
          ogTitle: 'Contacto - THADO Consulting',
          ogDescription: 'Ponte en contacto con nuestro equipo de contadores'
        },
        isPublished: true,
        updatedBy: 'system'
      }
    ];

    const results = [];
    for (const pageData of pagesToCreate) {
      try {
        // Verificar si ya existe
        const existing = await Page.findOne({ pageSlug: pageData.pageSlug });
        if (existing) {
          results.push({
            pageSlug: pageData.pageSlug,
            status: 'skipped',
            message: 'Ya existe'
          });
          continue;
        }

        // Crear la página
        const newPage = await Page.create(pageData);
        results.push({
          pageSlug: pageData.pageSlug,
          status: 'created',
          message: 'Página creada correctamente'
        });
      } catch (err) {
        results.push({
          pageSlug: pageData.pageSlug,
          status: 'error',
          message: err.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Inicialización de páginas completada',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al inicializar páginas',
      error: error.message
    });
  }
};
