/**
 * 🔄 Script para forzar la actualización de la página Home
 *
 * Ejecutar con: node scripts/forceUpdateHomePage.js
 *
 * Este script actualiza directamente la base de datos con los datos
 * del borrador de THADO Consulting
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Conectar a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/thado-web';

console.log('🔄 Iniciando actualización forzada de página Home...');
console.log('📦 Conectando a MongoDB:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

// Datos actualizados según el borrador de THADO Consulting
const updatedHomePageData = {
  pageName: 'Página Principal',
  content: {
    hero: {
      title: 'Impulsa tu Negocio con Asesoría Contable y Tributaria de Confianza',
      subtitle: 'Evita multas de SUNAT, ordena tu contabilidad y haz crecer tu empresa con el respaldo de contadores públicos colegiados.',
      description: 'Somos el aliado contable que entiende los desafíos de presupuesto y el ritmo de los negocios pequeños. Creamos soluciones simples y efectivas sin la complejidad innecesaria.',
      ctaText: 'Agenda una Consultoría Gratuita →',
      ctaLink: '#contacto',
      metrics: [
        { value: '+500', label: 'MYPES Asesoradas en todo el Perú', icon: '✓' },
        { value: '10+', label: 'años de experiencia tributaria', icon: '✓' },
        { value: '0%', label: 'tolerancia a multas por nuestros errores', icon: '✓' }
      ],
      backgroundImage: { light: '', dark: '' },
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
      backgroundImage: { light: '', dark: '' },
      backgroundImageAlt: 'Servicios THADO Consulting',
      styles: {
        light: { titleColor: '', descriptionColor: '' },
        dark: { titleColor: '', descriptionColor: '' }
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
      backgroundImage: { light: '', dark: '' },
      backgroundImageAlt: 'Featured blog background',
      styles: {
        light: { titleColor: '', subtitleColor: '', descriptionColor: '' },
        dark: { titleColor: '', subtitleColor: '', descriptionColor: '' }
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
        { name: 'facebook', url: '#', icon: '', enabled: true },
        { name: 'twitter', url: '#', icon: '', enabled: true },
        { name: 'pinterest', url: '#', icon: '', enabled: true },
        { name: 'whatsapp', url: '#', icon: '', enabled: true }
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
  chatbotConfig: {
    enabled: true,
    botName: 'Asesor Contable THADO',
    statusText: 'En línea • Respuesta inmediata',
    logo: { light: '', dark: '' },
    logoAlt: 'Asesor Contable THADO',
    welcomeMessage: {
      title: '¡Hola! Soy tu Asesor Contable 📊',
      description: 'Estoy aquí para ayudarte con consultas sobre contabilidad, tributación, SUNAT y gestión empresarial.'
    },
    suggestedQuestions: [
      { icon: '📊', text: '¿Qué servicios contables ofrecen?', message: '¿Qué servicios contables ofrecen?' },
      { icon: '💰', text: 'Consulta sobre SUNAT', message: 'Tengo dudas sobre mis obligaciones con SUNAT' },
      { icon: '📋', text: 'Cotizar servicios', message: 'Quiero cotizar servicios contables para mi empresa' },
      { icon: '📞', text: 'Agendar consultoría', message: '¿Cómo puedo agendar una consultoría gratuita?' }
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
      position: { bottom: '24px', right: '24px' },
      gradient: { from: '#2554a3', to: '#3462af' },
      shape: 'circle',
      icon: { light: '', dark: '' }
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
  lastUpdated: new Date(),
  updatedBy: 'force-update-script'
};

async function forceUpdateHomePage() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener la colección de páginas
    const pagesCollection = mongoose.connection.db.collection('pages');

    // Buscar la página home
    const homePage = await pagesCollection.findOne({ pageSlug: 'home' });

    if (!homePage) {
      console.log('❌ Página Home no encontrada. Creando nueva...');
      await pagesCollection.insertOne({
        pageSlug: 'home',
        ...updatedHomePageData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Página Home CREADA exitosamente');
    } else {
      console.log('📄 Página Home encontrada. Actualizando...');
      console.log('   - ID:', homePage._id);
      console.log('   - Título actual:', homePage.content?.hero?.title?.substring(0, 50) + '...');

      // Actualizar la página
      const result = await pagesCollection.updateOne(
        { pageSlug: 'home' },
        {
          $set: {
            ...updatedHomePageData,
            updatedAt: new Date()
          }
        }
      );

      console.log('✅ Página Home ACTUALIZADA exitosamente');
      console.log('   - Documentos modificados:', result.modifiedCount);
    }

    // Verificar la actualización
    const updatedPage = await pagesCollection.findOne({ pageSlug: 'home' });
    console.log('\n📋 Verificación post-actualización:');
    console.log('   - Hero Title:', updatedPage.content?.hero?.title?.substring(0, 50) + '...');
    console.log('   - Solutions Title:', updatedPage.content?.solutions?.title);
    console.log('   - Servicios:', updatedPage.content?.solutions?.items?.length);
    console.log('   - SEO Title:', updatedPage.seo?.metaTitle);
    console.log('   - Theme Default:', updatedPage.theme?.default);
    console.log('   - Primary Color:', updatedPage.theme?.lightMode?.primary);

    console.log('\n🎉 ¡Actualización completada!');
    console.log('\n⚠️  IMPORTANTE: Limpia el caché del navegador o abre en modo incógnito para ver los cambios.');
    console.log('   También puedes ejecutar en la consola del navegador: cmsDebug.clearAllCache()');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

// Ejecutar
forceUpdateHomePage();
