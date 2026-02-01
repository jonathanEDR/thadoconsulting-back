import mongoose from 'mongoose';

const PageSchema = new mongoose.Schema({
  pageSlug: {
    type: String,
    required: true,
    unique: true,
    enum: ['home', 'nosotros', 'servicios', 'contacto', 'services', 'about', 'contact', 'blog', 'servicio-detail', 'blog-post-detail', 'dashboard-sidebar']
  },
  pageName: {
    type: String,
    required: true
  },
  content: {
    hero: {
      title: { type: String, default: '' },
      subtitle: { type: String, default: '' },
      description: { type: String, default: '' },
      ctaText: { type: String, default: 'Conoce nuestros servicios' },
      ctaLink: { type: String, default: '#servicios' },
      // Imágenes por tema
      backgroundImage: {
        light: { type: String, default: '' }, // Imagen para tema claro
        dark: { type: String, default: '' }   // Imagen para tema oscuro
      },
      backgroundImageAlt: { type: String, default: 'Hero background' },
      // Estilos de texto por tema - Con valores por defecto de Thado Consulting
      styles: {
        light: {
          titleColor: { type: String, default: '#1F2937' },      // Gris oscuro para título
          subtitleColor: { type: String, default: '#7528ee' },   // Violeta Thado para subtítulo
          descriptionColor: { type: String, default: '#7528ee' } // Violeta Thado para descripción
        },
        dark: {
          titleColor: { type: String, default: '#FFFFFF' },      // Blanco para título
          subtitleColor: { type: String, default: '#D1D5DB' },   // Gris claro para subtítulo
          descriptionColor: { type: String, default: '#9CA3AF' } // Gris medio para descripción
        }
      }
    },
    solutions: {
      title: { type: String, default: 'Soluciones' },
      description: { type: String, default: '' },
      // Imágenes por tema
      backgroundImage: {
        light: { type: String, default: '' }, // Imagen para tema claro
        dark: { type: String, default: '' }   // Imagen para tema oscuro
      },
      backgroundImageAlt: { type: String, default: 'Solutions background' },
      // Estilos de texto por tema
      styles: {
        light: {
          titleColor: { type: String, default: '' },
          descriptionColor: { type: String, default: '' }
        },
        dark: {
          titleColor: { type: String, default: '' },
          descriptionColor: { type: String, default: '' }
        }
      },
      items: [{
        iconLight: String,  // URL del icono para tema claro (PNG)
        iconDark: String,   // URL del icono para tema oscuro (PNG)
        title: String,
        description: String,
        gradient: String    // Mantener para compatibilidad
      }],
      // Diseño de tarjetas por tema
      cardsDesign: {
        light: {
          background: { type: String, default: 'rgba(0, 0, 0, 0.08)' },
          border: { type: String, default: 'rgba(0, 0, 0, 0.15)' },
          borderWidth: { type: String, default: '1px' },
          shadow: { type: String, default: '0 8px 32px rgba(0, 0, 0, 0.1)' },
          hoverBackground: { type: String, default: 'rgba(255, 255, 255, 0.25)' },
          hoverBorder: { type: String, default: 'rgba(139, 92, 246, 0.4)' },
          hoverShadow: { type: String, default: '0 20px 40px rgba(139, 92, 246, 0.15)' },
          iconGradient: { type: String, default: 'linear-gradient(135deg, #2554a3, #3462af)' },
          iconBackground: { type: String, default: 'rgba(255, 255, 255, 0.9)' },
          iconColor: { type: String, default: '#1f2937' },
          titleColor: { type: String, default: '#1f2937' },
          descriptionColor: { type: String, default: '#4b5563' },
          linkColor: { type: String, default: '#3462af' },
          // Tamaño de tarjetas
          cardMinWidth: { type: String, default: '280px' },
          cardMaxWidth: { type: String, default: '100%' },
          cardMinHeight: { type: String, default: 'auto' },
          cardPadding: { type: String, default: '2rem' },
          // Alineación de tarjetas
          cardsAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
          // Configuración de iconos
          iconBorderEnabled: { type: Boolean, default: true },
          iconAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'left' }
        },
        dark: {
          background: { type: String, default: 'rgba(255, 255, 255, 0.05)' },
          border: { type: String, default: 'rgba(255, 255, 255, 0.2)' },
          borderWidth: { type: String, default: '1px' },
          shadow: { type: String, default: '0 8px 32px rgba(0, 0, 0, 0.3)' },
          hoverBackground: { type: String, default: 'rgba(255, 255, 255, 0.08)' },
          hoverBorder: { type: String, default: 'rgba(139, 92, 246, 0.5)' },
          hoverShadow: { type: String, default: '0 20px 40px rgba(139, 92, 246, 0.2)' },
          iconGradient: { type: String, default: 'linear-gradient(135deg, #2554a3, #3462af)' },
          iconBackground: { type: String, default: 'rgba(17, 24, 39, 0.8)' },
          iconColor: { type: String, default: '#ffffff' },
          titleColor: { type: String, default: '#ffffff' },
          descriptionColor: { type: String, default: '#d1d5db' },
          linkColor: { type: String, default: '#3462af' },
          // Tamaño de tarjetas
          cardMinWidth: { type: String, default: '280px' },
          cardMaxWidth: { type: String, default: '100%' },
          cardMinHeight: { type: String, default: 'auto' },
          cardPadding: { type: String, default: '2rem' },
          // Alineación de tarjetas
          cardsAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
          // Configuración de iconos
          iconBorderEnabled: { type: Boolean, default: true },
          iconAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'left' }
        }
      }
    },
    valueAdded: {
      title: { type: String, default: 'Valor agregado' },
      description: { type: String, default: '' },
      showIcons: { type: Boolean, default: true }, // Controla si se muestran los iconos
      // Imágenes por tema
      backgroundImage: {
        light: { type: String, default: '' }, // Imagen para tema claro
        dark: { type: String, default: '' }   // Imagen para tema oscuro
      },
      backgroundImageAlt: { type: String, default: 'Value Added background' },
      // Estilos de texto por tema
      styles: {
        light: {
          titleColor: { type: String, default: '' },
          descriptionColor: { type: String, default: '' }
        },
        dark: {
          titleColor: { type: String, default: '' },
          descriptionColor: { type: String, default: '' }
        }
      },
      items: [{
        iconLight: String,  // URL del icono para tema claro (PNG)
        iconDark: String,   // URL del icono para tema oscuro (PNG)
        title: String,
        description: String,
        gradient: String
      }],
      // Logos de tecnologías/empresas que se muestran arriba de las tarjetas
      logos: [{
        name: String,       // Nombre del logo (ej: "SQL", "Python", "Java")
        imageUrl: String,   // URL de la imagen del logo
        alt: String,        // Texto alternativo
        link: String,       // URL opcional para hacer clickeable el logo
        order: { type: Number, default: 0 } // Orden de aparición
      }],
      // Configuración de logos (sin barra - solo configuración de los logos individuales)
      logosBarDesign: {
        light: {
          // Configuraciones de animación y comportamiento
          animationsEnabled: { type: Boolean, default: true },
          rotationMode: { type: String, enum: ['none', 'individual'], default: 'individual' },
          animationSpeed: { type: String, enum: ['slow', 'normal', 'fast'], default: 'normal' },
          hoverEffects: { type: Boolean, default: true },
          hoverIntensity: { type: String, enum: ['subtle', 'normal', 'intense'], default: 'normal' },
          glowEffects: { type: Boolean, default: true },
          autoDetectTech: { type: Boolean, default: true },
          // Configuración de tamaño y espaciado
          logoSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
          logoSpacing: { type: String, enum: ['compact', 'normal', 'wide'], default: 'normal' },
          logoFormat: { type: String, enum: ['square', 'rectangle', 'original'], default: 'rectangle' },
          maxLogoWidth: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
          uniformSize: { type: Boolean, default: false }
        },
        dark: {
          // Configuraciones de animación y comportamiento
          animationsEnabled: { type: Boolean, default: true },
          rotationMode: { type: String, enum: ['none', 'individual'], default: 'individual' },
          animationSpeed: { type: String, enum: ['slow', 'normal', 'fast'], default: 'normal' },
          hoverEffects: { type: Boolean, default: true },
          hoverIntensity: { type: String, enum: ['subtle', 'normal', 'intense'], default: 'normal' },
          glowEffects: { type: Boolean, default: true },
          autoDetectTech: { type: Boolean, default: true },
          // Configuración de tamaño y espaciado
          logoSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
          logoSpacing: { type: String, enum: ['compact', 'normal', 'wide'], default: 'normal' },
          logoFormat: { type: String, enum: ['square', 'rectangle', 'original'], default: 'rectangle' },
          maxLogoWidth: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
          uniformSize: { type: Boolean, default: false }
        }
      },
      // Diseño de tarjetas por tema (similar a solutions)
      cardsDesign: {
        light: {
          background: { type: String, default: 'rgba(255, 255, 255, 0.9)' },
          border: { type: String, default: 'linear-gradient(135deg, #2554a3, #3462af)' },
          borderWidth: { type: String, default: '2px' },
          shadow: { type: String, default: '0 8px 32px rgba(0, 0, 0, 0.1)' },
          hoverBackground: { type: String, default: 'rgba(255, 255, 255, 0.95)' },
          hoverBorder: { type: String, default: 'linear-gradient(135deg, #3462af, #5a8fd4)' },
          hoverShadow: { type: String, default: '0 20px 40px rgba(139, 92, 246, 0.2)' },
          iconGradient: { type: String, default: 'linear-gradient(135deg, #2554a3, #3462af)' },
          iconBackground: { type: String, default: 'rgba(255, 255, 255, 0.9)' },
          iconColor: { type: String, default: '#7528ee' },
          titleColor: { type: String, default: '#1F2937' },
          descriptionColor: { type: String, default: '#4B5563' },
          linkColor: { type: String, default: '#3462af' },
          // Tamaño de tarjetas
          cardMinWidth: { type: String, default: '280px' },
          cardMaxWidth: { type: String, default: '350px' },
          cardMinHeight: { type: String, default: '200px' },
          cardPadding: { type: String, default: '2rem' },
          // Alineación de tarjetas
          cardsAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
          // Configuración de iconos
          iconBorderEnabled: { type: Boolean, default: false },
          iconAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'center' }
        },
        dark: {
          background: { type: String, default: 'rgba(17, 24, 39, 0.9)' },
          border: { type: String, default: 'linear-gradient(135deg, #2554a3, #3462af)' },
          borderWidth: { type: String, default: '2px' },
          shadow: { type: String, default: '0 8px 32px rgba(0, 0, 0, 0.5)' },
          hoverBackground: { type: String, default: 'rgba(31, 41, 55, 0.95)' },
          hoverBorder: { type: String, default: 'linear-gradient(135deg, #3462af, #5a8fd4)' },
          hoverShadow: { type: String, default: '0 20px 40px rgba(139, 92, 246, 0.3)' },
          iconGradient: { type: String, default: 'linear-gradient(135deg, #2554a3, #3462af)' },
          iconBackground: { type: String, default: 'rgba(17, 24, 39, 0.8)' },
          iconColor: { type: String, default: '#ffffff' },
          titleColor: { type: String, default: '#FFFFFF' },
          descriptionColor: { type: String, default: '#D1D5DB' },
          linkColor: { type: String, default: '#3462af' },
          // Tamaño de tarjetas
          cardMinWidth: { type: String, default: '280px' },
          cardMaxWidth: { type: String, default: '350px' },
          cardMinHeight: { type: String, default: '200px' },
          cardPadding: { type: String, default: '2rem' },
          // Alineación de tarjetas
          cardsAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
          // Configuración de iconos
          iconBorderEnabled: { type: Boolean, default: false },
          iconAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'center' }
        }
      }
    },
    clientLogos: {
      title: { type: String, default: 'Nuestros clientes' },
      description: { type: String, default: 'Empresas que confían en nosotros' },
      visible: { type: Boolean, default: true }, // Controla si se muestra la sección
      showText: { type: Boolean, default: true }, // Controla si se muestran título y descripción
      // Imagen de fondo única (no por tema)
      backgroundImage: { type: String, default: '' }, // Imagen de fondo única
      backgroundImageAlt: { type: String, default: 'Client logos background' },
      // Configuración directa de la sección (sin contenedor extra)
      sectionHeight: { type: String, default: 'auto' }, // Altura de la sección
      sectionPaddingY: { type: String, default: '4rem' }, // Espaciado vertical
      logosHeight: { type: String, default: '60px' }, // Altura específica de los logos
      // Estilos de texto por tema
      styles: {
        light: {
          titleColor: { type: String, default: '' },
          descriptionColor: { type: String, default: '' }
        },
        dark: {
          titleColor: { type: String, default: '' },
          descriptionColor: { type: String, default: '' }
        }
      },
      // Logos de clientes
      logos: [{
        name: String,       // Nombre del cliente (ej: "Microsoft", "Google", "IBM")
        imageUrl: String,   // URL de la imagen del logo
        alt: String,        // Texto alternativo
        link: String,       // URL opcional para hacer clickeable el logo
        order: { type: Number, default: 0 }, // Orden de aparición
        background: String  // Fondo individual del logo (color o gradiente)
      }],
      // Configuración del diseño de la sección
      sectionDesign: {
        light: {
          background: { type: String, default: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)' },
          borderColor: { type: String, default: 'rgba(139, 92, 246, 0.1)' },
          borderWidth: { type: String, default: '1px' },
          borderRadius: { type: String, default: '1.5rem' },
          shadow: { type: String, default: '0 10px 40px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)' },
          padding: { type: String, default: '3rem' },
          margin: { type: String, default: '2rem 0' }
        },
        dark: {
          background: { type: String, default: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.9) 100%)' },
          borderColor: { type: String, default: 'rgba(139, 92, 246, 0.2)' },
          borderWidth: { type: String, default: '1px' },
          borderRadius: { type: String, default: '1.5rem' },
          shadow: { type: String, default: '0 10px 40px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(255, 255, 255, 0.02)' },
          padding: { type: String, default: '3rem' },
          margin: { type: String, default: '2rem 0' }
        }
      },
      // Configuración de los logos
      logosDesign: {
        light: {
          logoMaxWidth: { type: String, default: '120px' },
          logoMaxHeight: { type: String, default: '80px' },
          logoOpacity: { type: String, default: '0.7' },
          logoHoverOpacity: { type: String, default: '1' },
          logoFilter: { type: String, default: 'grayscale(0%)' },
          logoHoverFilter: { type: String, default: 'grayscale(0%)' },
          logoBackground: { type: String, default: 'transparent' },
          logoPadding: { type: String, default: '1rem' },
          logosBorderRadius: { type: String, default: '0.5rem' },
          logosGap: { type: String, default: '2rem' },
          logosPerRow: { type: Number, default: 4 }, // Logos por fila en desktop
          logosAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
          // Propiedades de animación
          floatAnimation: { type: Boolean, default: true }, // Animación flotante
          floatIntensity: { type: String, enum: ['subtle', 'normal', 'strong'], default: 'normal' },
          mouseTracking: { type: Boolean, default: true }, // Seguimiento del mouse
          mouseIntensity: { type: String, enum: ['subtle', 'normal', 'strong'], default: 'normal' },
          hoverScale: { type: Number, default: 1.15 }, // Escala en hover
          hoverRotation: { type: Boolean, default: true }, // Rotación en hover
          // Configuración del carrusel
          carouselEnabled: { type: Boolean, default: true }, // Habilitar carrusel automático
          carouselSpeed: { type: Number, default: 3000 }, // Velocidad en ms (3 segundos)
          logosToShowDesktop: { type: Number, default: 6 }, // Logos visibles en desktop
          logosToShowTablet: { type: Number, default: 4 }, // Logos visibles en tablet
          logosToShowMobile: { type: Number, default: 3 } // Logos visibles en móvil
        },
        dark: {
          logoMaxWidth: { type: String, default: '120px' },
          logoMaxHeight: { type: String, default: '80px' },
          logoOpacity: { type: String, default: '0.8' },
          logoHoverOpacity: { type: String, default: '1' },
          logoFilter: { type: String, default: 'brightness(0) invert(1)' }, // Hace los logos blancos
          logoHoverFilter: { type: String, default: 'brightness(0) invert(1)' },
          logoBackground: { type: String, default: 'transparent' },
          logoPadding: { type: String, default: '1rem' },
          logosBorderRadius: { type: String, default: '0.5rem' },
          logosGap: { type: String, default: '2rem' },
          logosPerRow: { type: Number, default: 4 }, // Logos por fila en desktop
          logosAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
          // Propiedades de animación
          floatAnimation: { type: Boolean, default: true }, // Animación flotante
          floatIntensity: { type: String, enum: ['subtle', 'normal', 'strong'], default: 'normal' },
          mouseTracking: { type: Boolean, default: true }, // Seguimiento del mouse
          mouseIntensity: { type: String, enum: ['subtle', 'normal', 'strong'], default: 'normal' },
          hoverScale: { type: Number, default: 1.15 }, // Escala en hover
          hoverRotation: { type: Boolean, default: true }, // Rotación en hover
          // Configuración del carrusel
          carouselEnabled: { type: Boolean, default: true }, // Habilitar carrusel automático
          carouselSpeed: { type: Number, default: 3000 }, // Velocidad en ms (3 segundos)
          logosToShowDesktop: { type: Number, default: 6 }, // Logos visibles en desktop
          logosToShowTablet: { type: Number, default: 4 }, // Logos visibles en tablet
          logosToShowMobile: { type: Number, default: 3 } // Logos visibles en móvil
        }
      }
    },
    contact: {
      phone: { type: String, default: '+51 973 397 306' },
      email: { type: String, default: 'gscutic@gmail.com' },
      address: { type: String, default: '' },
      city: { type: String, default: 'Huánuco' },
      country: { type: String, default: 'Perú' },
      businessHours: { type: String, default: 'Lunes a Viernes: 9:00 AM - 6:00 PM' },
      description: { type: String, default: 'Empresa líder en desarrollo de software en Perú. Creamos soluciones digitales, aplicaciones móviles y modelos de IA para empresas que buscan innovar.' },
      socialLinks: [{
        name: { type: String, required: true }, // facebook, twitter, instagram, whatsapp, etc.
        url: { type: String, required: true },
        icon: { type: String, default: '' }, // URL del icono personalizado
        enabled: { type: Boolean, default: true }
      }]
    },
    featuredBlog: {
      headerIcon: { type: String, default: 'Newspaper' },
      headerIconColor: { type: String, default: '#2554a3' },
      fontFamily: { type: String, default: 'Montserrat' },
      title: { type: String, default: 'Webinars y blogs' },
      subtitle: { type: String, default: 'Accede a nuestros webinars y blogs para conocer más sobre nuestras soluciones y servicios' },
      description: { type: String, default: '' },
      limit: { type: Number, default: 3, min: 1, max: 12 },
      buttonText: { type: String, default: 'Ver todos los artículos' },
      buttonLink: { type: String, default: '/blog' },
      // Imágenes por tema
      backgroundImage: {
        light: { type: String, default: '' },
        dark: { type: String, default: '' }
      },
      backgroundImageAlt: { type: String, default: 'Featured blog background' },
      // Estilos de texto por tema
      styles: {
        light: {
          titleColor: { type: String, default: '' },
          subtitleColor: { type: String, default: '' },
          descriptionColor: { type: String, default: '' }
        },
        dark: {
          titleColor: { type: String, default: '' },
          subtitleColor: { type: String, default: '' },
          descriptionColor: { type: String, default: '' }
        }
      },
      // Diseño de tarjetas por tema
      cardsDesign: {
        light: {
          background: { type: String, default: 'rgba(255, 255, 255, 0.95)' },
          border: { type: String, default: 'rgba(229, 231, 235, 1)' },
          borderWidth: { type: String, default: '1px' },
          shadow: { type: String, default: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
          hoverBackground: { type: String, default: 'rgba(255, 255, 255, 1)' },
          hoverShadow: { type: String, default: '0 20px 25px -5px rgba(139, 92, 246, 0.2)' },
          titleColor: { type: String, default: '#1f2937' },
          excerptColor: { type: String, default: '#4b5563' },
          metaColor: { type: String, default: '#6b7280' },
          badgeBackground: { type: String, default: 'linear-gradient(135deg, #2554a3, #3462af)' },
          badgeTextColor: { type: String, default: '#ffffff' },
          ctaColor: { type: String, default: '#2554a3' },
          ctaHoverColor: { type: String, default: '#3462af' }
        },
        dark: {
          background: { type: String, default: 'rgba(31, 41, 55, 0.95)' },
          border: { type: String, default: 'rgba(55, 65, 81, 1)' },
          borderWidth: { type: String, default: '1px' },
          shadow: { type: String, default: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' },
          hoverBackground: { type: String, default: 'rgba(55, 65, 81, 1)' },
          hoverShadow: { type: String, default: '0 20px 25px -5px rgba(139, 92, 246, 0.3)' },
          titleColor: { type: String, default: '#ffffff' },
          excerptColor: { type: String, default: '#d1d5db' },
          metaColor: { type: String, default: '#9ca3af' },
          badgeBackground: { type: String, default: 'linear-gradient(135deg, #2554a3, #3462af)' },
          badgeTextColor: { type: String, default: '#ffffff' },
          ctaColor: { type: String, default: '#3462af' },
          ctaHoverColor: { type: String, default: '#5a8fd4' }
        }
      }
    },
    contactForm: {
      // Textos principales
      title: { type: String, default: 'Contáctanos' },
      subtitle: { type: String, default: 'Estamos aquí para ayudarte' },
      description: { type: String, default: '¿Tienes un proyecto en mente? Cuéntanos sobre él y te responderemos pronto.' },
      
      // Configuración de campos del formulario
      fields: {
        nombreLabel: { type: String, default: 'Nombre' },
        nombrePlaceholder: { type: String, default: 'Tu nombre completo' },
        nombreRequired: { type: Boolean, default: true },
        
        celularLabel: { type: String, default: 'Celular / Teléfono' },
        celularPlaceholder: { type: String, default: '+51 999 999 999' },
        celularRequired: { type: Boolean, default: true },
        
        correoLabel: { type: String, default: 'Correo Electrónico' },
        correoPlaceholder: { type: String, default: 'tu@email.com' },
        correoRequired: { type: Boolean, default: true },
        
        categoriaLabel: { type: String, default: 'Servicio de Interés' },
        categoriaPlaceholder: { type: String, default: 'Selecciona un tipo de servicio' },
        categoriaRequired: { type: Boolean, default: false },
        categoriaEnabled: { type: Boolean, default: false },
        
        mensajeLabel: { type: String, default: 'Cuéntanos sobre tu proyecto' },
        mensajePlaceholder: { type: String, default: 'Describe tu proyecto, necesidades o consulta...' },
        mensajeRequired: { type: Boolean, default: true },
        mensajeRows: { type: Number, default: 5 },
        
        termsText: { type: String, default: 'Acepto la Política de Privacidad y Términos de Servicio' },
        termsLink: { type: String, default: '/terminos' },
        termsRequired: { type: Boolean, default: true }
      },
      
      // Configuración del botón
      button: {
        text: { type: String, default: 'ENVIAR' },
        loadingText: { type: String, default: 'Enviando...' }
      },
      
      // Mensajes de respuesta
      messages: {
        success: { 
          type: String, 
          default: '¡Gracias por contactarnos! Te responderemos pronto.' 
        },
        error: { 
          type: String, 
          default: 'Hubo un error al enviar el mensaje. Por favor, intenta nuevamente.' 
        }
      },
      
      // Imagen de fondo por tema
      backgroundImage: {
        light: { type: String, default: '' },
        dark: { type: String, default: '' }
      },
      backgroundImageAlt: { type: String, default: 'Contact background' },
      
      // Diseño de tarjetas por tema (para el formulario)
      cardsDesign: {
        light: {
          background: { type: String, default: 'rgba(255, 255, 255, 0.95)' },
          border: { type: String, default: 'rgba(0, 0, 0, 0.1)' },
          borderWidth: { type: String, default: '1px' },
          shadow: { type: String, default: '0 10px 40px rgba(0, 0, 0, 0.1)' },
          hoverBackground: { type: String, default: 'rgba(255, 255, 255, 1)' },
          hoverBorder: { type: String, default: 'rgba(139, 92, 246, 0.4)' },
          hoverShadow: { type: String, default: '0 20px 40px rgba(139, 92, 246, 0.15)' },
          iconGradient: { type: String, default: 'linear-gradient(135deg, #2554a3, #3462af)' },
          iconBackground: { type: String, default: 'rgba(255, 255, 255, 0.9)' },
          iconColor: { type: String, default: '#1f2937' },
          titleColor: { type: String, default: '#1f2937' },
          descriptionColor: { type: String, default: '#4b5563' },
          linkColor: { type: String, default: '#2554a3' },
          // Tamaño de tarjetas
          cardMinWidth: { type: String, default: '320px' },
          cardMaxWidth: { type: String, default: '480px' },
          cardMinHeight: { type: String, default: 'auto' },
          cardPadding: { type: String, default: '1.5rem' },
          // Alineación
          cardsAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
          // Configuración de iconos
          iconBorderEnabled: { type: Boolean, default: false },
          iconAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'center' }
        },
        dark: {
          background: { type: String, default: 'rgba(31, 41, 55, 0.95)' },
          border: { type: String, default: 'rgba(255, 255, 255, 0.1)' },
          borderWidth: { type: String, default: '1px' },
          shadow: { type: String, default: '0 10px 40px rgba(0, 0, 0, 0.5)' },
          hoverBackground: { type: String, default: 'rgba(31, 41, 55, 1)' },
          hoverBorder: { type: String, default: 'rgba(167, 139, 250, 0.5)' },
          hoverShadow: { type: String, default: '0 20px 40px rgba(167, 139, 250, 0.2)' },
          iconGradient: { type: String, default: 'linear-gradient(135deg, #3462af, #5a8fd4)' },
          iconBackground: { type: String, default: 'rgba(17, 24, 39, 0.8)' },
          iconColor: { type: String, default: '#ffffff' },
          titleColor: { type: String, default: '#f9fafb' },
          descriptionColor: { type: String, default: '#9ca3af' },
          linkColor: { type: String, default: '#3462af' },
          // Tamaño de tarjetas
          cardMinWidth: { type: String, default: '320px' },
          cardMaxWidth: { type: String, default: '480px' },
          cardMinHeight: { type: String, default: 'auto' },
          cardPadding: { type: String, default: '1.5rem' },
          // Alineación
          cardsAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
          // Configuración de iconos
          iconBorderEnabled: { type: Boolean, default: false },
          iconAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'center' }
        }
      },
      
      // Estilos por tema
      styles: {
        light: {
          // Colores de texto
          titleColor: { type: String, default: '#1f2937' },
          subtitleColor: { type: String, default: '#6b7280' },
          descriptionColor: { type: String, default: '#4b5563' },
          
          // Estilos del formulario
          formBackground: { type: String, default: 'rgba(255, 255, 255, 0.95)' },
          formBorder: { type: String, default: 'rgba(0, 0, 0, 0.1)' },
          formShadow: { type: String, default: '0 10px 40px rgba(0, 0, 0, 0.1)' },
          
          // Campos de entrada
          inputBackground: { type: String, default: '#ffffff' },
          inputBorder: { type: String, default: '#e5e7eb' },
          inputText: { type: String, default: '#1f2937' },
          inputPlaceholder: { type: String, default: '#9ca3af' },
          inputFocusBorder: { type: String, default: '#2554a3' },
          
          // Labels
          labelColor: { type: String, default: '#374151' },
          
          // Botón
          buttonBackground: { type: String, default: 'linear-gradient(90deg, #2554a3, #3462af)' },
          buttonText: { type: String, default: '#ffffff' },
          buttonHoverBackground: { type: String, default: 'linear-gradient(90deg, #7C3AED, #0891B2)' },
          
          // Mensajes
          successColor: { type: String, default: '#10b981' },
          errorColor: { type: String, default: '#ef4444' }
        },
        dark: {
          // Colores de texto
          titleColor: { type: String, default: '#f9fafb' },
          subtitleColor: { type: String, default: '#d1d5db' },
          descriptionColor: { type: String, default: '#9ca3af' },
          
          // Estilos del formulario
          formBackground: { type: String, default: 'rgba(31, 41, 55, 0.95)' },
          formBorder: { type: String, default: 'rgba(255, 255, 255, 0.1)' },
          formShadow: { type: String, default: '0 10px 40px rgba(0, 0, 0, 0.5)' },
          
          // Campos de entrada
          inputBackground: { type: String, default: '#1f2937' },
          inputBorder: { type: String, default: '#374151' },
          inputText: { type: String, default: '#f9fafb' },
          inputPlaceholder: { type: String, default: '#6b7280' },
          inputFocusBorder: { type: String, default: '#3462af' },
          
          // Labels
          labelColor: { type: String, default: '#e5e7eb' },
          
          // Botón
          buttonBackground: { type: String, default: 'linear-gradient(90deg, #3462af, #5a8fd4)' },
          buttonText: { type: String, default: '#111827' },
          buttonHoverBackground: { type: String, default: 'linear-gradient(90deg, #2554a3, #3462af)' },
          
          // Mensajes
          successColor: { type: String, default: '#34d399' },
          errorColor: { type: String, default: '#f87171' }
        }
      },
      
      // Configuración de diseño
      layout: {
        maxWidth: { type: String, default: '600px' },
        padding: { type: String, default: '3rem' },
        borderRadius: { type: String, default: '1rem' },
        gap: { type: String, default: '1.5rem' }
      },
      
      // Configuración del mapa
      map: {
        enabled: { type: Boolean, default: false },
        googleMapsUrl: { type: String, default: '' }, // Enlace de Google Maps
        latitude: { type: Number, default: -12.0464 }, // Lima, Perú
        longitude: { type: Number, default: -77.0428 },
        zoom: { type: Number, default: 15 },
        height: { type: String, default: '400px' },
        companyName: { type: String, default: 'Nuestra Ubicación' },
        address: { type: String, default: '' },
        
        // Diseño del contenedor
        containerSize: { type: String, enum: ['small', 'medium', 'large', 'xl'], default: 'medium' },
        aspectRatio: { type: String, enum: ['square', 'landscape', 'portrait', 'custom'], default: 'landscape' },
        alignment: { type: String, enum: ['left', 'center', 'right', 'full'], default: 'center' },
        borderRadius: { type: String, default: '8px' },
        shadow: { type: String, enum: ['none', 'small', 'medium', 'large'], default: 'medium' },
        
        // Configuración del marcador
        markerColor: { type: String, default: '#ef4444' },
        pulseColor: { type: String, default: '#ef4444' },
        customLogo: { type: String, default: '' }, // URL del logo personalizado
        logoSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
        showCompanyName: { type: Boolean, default: true },
        
        // Configuración avanzada del marcador
        markerStyle: { type: String, enum: ['solid', 'gradient', 'custom'], default: 'solid' },
        markerBorderWidth: { type: String, default: '2px' },
        markerBackground: { type: String, default: '#ffffff' },
        markerBorderColor: { type: String, default: '#000000' },
        
        // Efectos y animaciones
        animationEnabled: { type: Boolean, default: true },
        pulseIntensity: { type: String, enum: ['none', 'low', 'medium', 'high', 'extreme'], default: 'medium' },
        pulseSpeed: { type: String, enum: ['slow', 'normal', 'fast', 'ultra'], default: 'normal' },
        hoverEffect: { type: String, enum: ['none', 'glow', 'thunder', 'rainbow', 'shake'], default: 'glow' }
      },
      
      // Habilitar/deshabilitar formulario
      enabled: { type: Boolean, default: true }
    },
    // ========================================
    // 🆕 CHATBOT CONFIGURATION
    // ========================================
    chatbotConfig: {
      // Información del bot
      botName: { type: String, default: 'Asesor de Ventas' },
      statusText: { type: String, default: 'En línea • Respuesta inmediata' },
      
      // Logo del bot por tema
      logo: {
        light: { type: String, default: '' },  // URL para tema claro
        dark: { type: String, default: '' }    // URL para tema oscuro
      },
      logoAlt: { type: String, default: 'Bot Logo' },
      
      // Mensaje de bienvenida
      welcomeMessage: {
        title: { type: String, default: '¡Hola! Soy tu Asesor Virtual 👋' },
        description: { type: String, default: 'Estoy aquí para ayudarte con información sobre nuestros servicios, precios y cotizaciones.' }
      },
      
      // Preguntas sugeridas (máximo 4)
      suggestedQuestions: [{
        icon: { type: String, default: '💼' },
        text: { type: String, default: '' },
        message: { type: String, default: '' }
      }],
      
      // Estilos del header por tema
      headerStyles: {
        light: {
          background: { type: String, default: 'linear-gradient(to right, #EFF6FF, #F5F3FF)' },
          titleColor: { type: String, default: '#111827' },
          subtitleColor: { type: String, default: '#6B7280' },
          logoBackground: { type: String, default: 'linear-gradient(to bottom right, #3B82F6, #2554a3)' }
        },
        dark: {
          background: { type: String, default: 'linear-gradient(to right, #1F2937, #1F2937)' },
          titleColor: { type: String, default: '#FFFFFF' },
          subtitleColor: { type: String, default: '#9CA3AF' },
          logoBackground: { type: String, default: 'linear-gradient(to bottom right, #3B82F6, #2554a3)' }
        }
      },
      
      // Estilos del botón flotante
      buttonStyles: {
        size: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' }, // 48px, 56px, 64px
        position: {
          bottom: { type: String, default: '24px' }, // 1.5rem = 24px
          right: { type: String, default: '24px' }   // 1.5rem = 24px
        },
        gradient: {
          from: { type: String, default: '#3B82F6' },  // blue-600
          to: { type: String, default: '#2554a3' }     // purple-600
        },
        shape: { type: String, enum: ['circle', 'rounded', 'square'], default: 'circle' },
        // Icono personalizado del botón por tema
        icon: {
          light: { type: String, default: '' },  // URL para tema claro
          dark: { type: String, default: '' }    // URL para tema oscuro
        }
      },
      
      // Configuración de comportamiento
      behavior: {
        autoOpen: { type: Boolean, default: false },
        autoOpenDelay: { type: Number, default: 5000 }, // ms
        showUnreadBadge: { type: Boolean, default: true },
        showPoweredBy: { type: Boolean, default: true }
      },
      
      // Habilitar/deshabilitar chatbot
      enabled: { type: Boolean, default: true }
    },
    sections: [
      {
        type: {
          type: String,
          enum: ['text', 'image', 'grid', 'cta']
        },
        title: String,
        content: mongoose.Schema.Types.Mixed,
        order: Number
      }
    ]
  },
  seo: {
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    keywords: { type: [String], default: [] },
    ogTitle: { type: String, default: '' },
    ogDescription: { type: String, default: '' },
    ogImage: { type: String, default: '' },
    twitterCard: { type: String, default: 'summary_large_image' }
  },
  // Configuración de Tema - Colores según Manual de Marca Thado Consulting
  // Azul Principal: #2554a3 | Azul Secundario: #3462af | Gris: #626871 | Blanco: #ffffff
  theme: {
    default: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    lightMode: {
      // Colores base - Thado Consulting Tema Claro
      primary: { type: String, default: '#2554a3' },      // Azul principal Thado
      secondary: { type: String, default: '#3462af' },    // Azul secundario Thado
      background: { type: String, default: '#FFFFFF' },   // Blanco
      text: { type: String, default: '#1F2937' },         // Texto oscuro
      textSecondary: { type: String, default: '#626871' }, // Gris Thado
      cardBg: { type: String, default: '#F9FAFB' },
      border: { type: String, default: '#E5E7EB' },

      // Botones específicos - Formato simplificado (background, textColor, borderColor)
      buttons: {
        // Botón "Conoce nuestros servicios"
        ctaPrimary: {
          text: { type: String, default: 'Conoce nuestros servicios' },
          background: { type: String, default: 'linear-gradient(90deg, #2554a3, #3462af, #2554a3)' },
          textColor: { type: String, default: '#FFFFFF' },
          borderColor: { type: String, default: 'transparent' }
        },
        // Botón "CONTÁCTANOS"
        contact: {
          text: { type: String, default: 'CONTÁCTANOS' },
          background: { type: String, default: 'transparent' },
          textColor: { type: String, default: '#2554a3' },
          borderColor: { type: String, default: 'linear-gradient(90deg, #2554a3, #3462af)' }
        },
        // Botón "Ir al Dashboard"
        dashboard: {
          text: { type: String, default: 'Ir al Dashboard' },
          background: { type: String, default: 'linear-gradient(90deg, #2554a3, #3462af)' },
          textColor: { type: String, default: '#FFFFFF' },
          borderColor: { type: String, default: 'transparent' }
        },
        // Botón "Ver más..."
        viewMore: {
          text: { type: String, default: 'Ver más...' },
          background: { type: String, default: 'linear-gradient(135deg, #2554a3 0%, #3462af 100%)' },
          textColor: { type: String, default: '#FFFFFF' },
          borderColor: { type: String, default: 'transparent' }
        },
        // Botón "Ver todos los artículos" - Featured Blog
        featuredBlogCta: {
          text: { type: String, default: 'Ver todos los artículos' },
          background: { type: String, default: 'linear-gradient(135deg, #2554a3, #3462af)' },
          textColor: { type: String, default: '#FFFFFF' },
          borderColor: { type: String, default: 'transparent' }
        }
      }
    },
    darkMode: {
      // Colores base - Thado Consulting Tema Oscuro
      primary: { type: String, default: '#3462af' },      // Azul secundario Thado (más visible en oscuro)
      secondary: { type: String, default: '#5a8fd4' },    // Azul más claro para contraste
      background: { type: String, default: '#111827' },   // Fondo oscuro
      text: { type: String, default: '#FFFFFF' },         // Texto blanco
      textSecondary: { type: String, default: '#D1D5DB' }, // Gris claro
      cardBg: { type: String, default: '#1F2937' },
      border: { type: String, default: '#374151' },

      // Botones específicos - Formato simplificado (background, textColor, borderColor)
      buttons: {
        // Botón "Conoce nuestros servicios"
        ctaPrimary: {
          text: { type: String, default: 'Conoce nuestros servicios' },
          background: { type: String, default: 'linear-gradient(90deg, #3462af, #5a8fd4, #3462af)' },
          textColor: { type: String, default: '#FFFFFF' },
          borderColor: { type: String, default: 'transparent' }
        },
        // Botón "CONTÁCTANOS"
        contact: {
          text: { type: String, default: 'CONTÁCTANOS' },
          background: { type: String, default: 'transparent' },
          textColor: { type: String, default: '#5a8fd4' },
          borderColor: { type: String, default: 'linear-gradient(90deg, #3462af, #5a8fd4)' }
        },
        // Botón "Ir al Dashboard"
        dashboard: {
          text: { type: String, default: 'Ir al Dashboard' },
          background: { type: String, default: 'linear-gradient(90deg, #3462af, #5a8fd4)' },
          textColor: { type: String, default: '#FFFFFF' },
          borderColor: { type: String, default: 'transparent' }
        },
        // Botón "Ver más..."
        viewMore: {
          text: { type: String, default: 'Ver más...' },
          background: { type: String, default: 'linear-gradient(135deg, #3462af 0%, #5a8fd4 100%)' },
          textColor: { type: String, default: '#FFFFFF' },
          borderColor: { type: String, default: 'transparent' }
        },
        // Botón "Ver todos los artículos" - Featured Blog
        featuredBlogCta: {
          text: { type: String, default: 'Ver todos los artículos' },
          background: { type: String, default: 'linear-gradient(135deg, #3462af, #5a8fd4)' },
          textColor: { type: String, default: '#FFFFFF' },
          borderColor: { type: String, default: 'transparent' }
        }
      }
    }
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    default: 'admin'
  }
}, {
  timestamps: true,
  strict: false // ✅ Permite guardar campos no definidos en el schema (importante para cardsDesign)
});

// Importar y configurar tracking de cambios
import setupPageChangeTracking from '../utils/pageChangeTracker.js';

const Page = mongoose.model('Page', PageSchema);

// Configurar tracking
setupPageChangeTracking(Page);

export default Page;

