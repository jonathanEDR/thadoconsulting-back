/**
 * 🧹 Script de Migración: Limpiar SEO de Páginas de Detalle
 *
 * Este script remueve la configuración SEO de las páginas:
 * - servicio-detail
 * - blog-post-detail
 *
 * Razón: El SEO ahora se genera dinámicamente desde los datos
 * del servicio/post individual, no desde el CMS genérico.
 */

import mongoose from 'mongoose';
import Page from '../models/Page.js';
import dotenv from 'dotenv';

dotenv.config();

const removeSeoFromDetailPages = async () => {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('\n🧹 Limpiando SEO de páginas de detalle...\n');

    // ========================================
    // Limpiar SEO de servicio-detail
    // ========================================
    const servicioDetailResult = await Page.findOneAndUpdate(
      { pageSlug: 'servicio-detail' },
      {
        $set: {
          'seo.metaTitle': '',
          'seo.metaDescription': '',
          'seo.keywords': [],
          'seo.ogTitle': '',
          'seo.ogDescription': '',
          'seo.ogImage': ''
        }
      },
      { new: true }
    );

    if (servicioDetailResult) {
      console.log('✅ SEO removido de servicio-detail');
      console.log('   └─ Ahora el SEO se genera desde los datos del servicio individual');
    } else {
      console.log('⚠️  Página servicio-detail no encontrada');
    }

    // ========================================
    // Limpiar SEO de blog-post-detail
    // ========================================
    const blogPostDetailResult = await Page.findOneAndUpdate(
      { pageSlug: 'blog-post-detail' },
      {
        $set: {
          'seo.metaTitle': '',
          'seo.metaDescription': '',
          'seo.keywords': [],
          'seo.ogTitle': '',
          'seo.ogDescription': '',
          'seo.ogImage': ''
        }
      },
      { new: true }
    );

    if (blogPostDetailResult) {
      console.log('✅ SEO removido de blog-post-detail');
      console.log('   └─ Ahora el SEO se genera desde los datos del post individual');
    } else {
      console.log('⚠️  Página blog-post-detail no encontrada');
    }

    console.log('\n🎉 Migración completada exitosamente');
    console.log('\n📋 Resumen:');
    console.log('   • servicio-detail: SEO limpiado ✅');
    console.log('   • blog-post-detail: SEO limpiado ✅');
    console.log('\n💡 Beneficios:');
    console.log('   • Cada servicio tiene SEO único basado en sus datos');
    console.log('   • Cada post tiene SEO único basado en sus datos');
    console.log('   • No hay confusión con SEO genérico del CMS');
    console.log('   • Mejor indexación en Google');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  }
};

removeSeoFromDetailPages();
