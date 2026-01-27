/**
 * 🔧 Script para agregar la sección Featured Blog a la página Home
 * Este script actualiza el documento 'home' en MongoDB agregando la configuración de featuredBlog
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Importar el modelo Page
import '../models/Page.js';

// Configuración por defecto para featuredBlog
const featuredBlogConfig = {
  title: 'Webinars y blogs',
  subtitle: 'Accede a nuestros webinars y blogs para conocer más sobre nuestras soluciones y servicios',
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
      shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      hoverBackground: 'rgba(255, 255, 255, 1)',
      hoverShadow: '0 20px 25px -5px rgba(139, 92, 246, 0.2)',
      titleColor: '#1f2937',
      excerptColor: '#4b5563',
      metaColor: '#6b7280',
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
      hoverShadow: '0 20px 25px -5px rgba(139, 92, 246, 0.3)',
      titleColor: '#f9fafb',
      excerptColor: '#d1d5db',
      metaColor: '#9ca3af',
      badgeBackground: 'linear-gradient(135deg, #3462af, #5a8fd4)',
      badgeTextColor: '#111827',
      ctaColor: '#3462af',
      ctaHoverColor: '#5a8fd4'
    }
  }
};

async function addFeaturedBlogSection() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener el modelo Page
    const Page = mongoose.model('Page');

    // Buscar la página home
    const homePage = await Page.findOne({ pageSlug: 'home' });

    if (!homePage) {
      console.log('❌ No se encontró la página home');
      process.exit(1);
    }

    console.log('📄 Página home encontrada');

    // Verificar si ya existe featuredBlog
    if (homePage.content && homePage.content.featuredBlog) {
      console.log('⚠️  La sección featuredBlog ya existe. Actualizando...');
    } else {
      console.log('➕ Agregando nueva sección featuredBlog');
    }

    // Actualizar o agregar featuredBlog
    homePage.content = homePage.content || {};
    homePage.content.featuredBlog = featuredBlogConfig;

    // Guardar cambios
    await homePage.save();

    console.log('✅ Sección featuredBlog agregada/actualizada correctamente');
    console.log('📊 Configuración aplicada:');
    console.log(`   - Título: ${featuredBlogConfig.title}`);
    console.log(`   - Límite de posts: ${featuredBlogConfig.limit}`);
    console.log(`   - Botón: ${featuredBlogConfig.buttonText}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error al ejecutar el script:', error);
    process.exit(1);
  }
}

// Ejecutar el script
addFeaturedBlogSection();

