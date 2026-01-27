/**
 * 🎨 Script para inicializar la configuración del Dashboard Sidebar
 * Ejecutar: node scripts/initDashboardSidebar.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Page from '../models/Page.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/web-scuti';

// Configuración por defecto del sidebar
const dashboardSidebarConfig = {
  pageSlug: 'dashboard-sidebar',
  pageName: 'Configuración del Sidebar del Dashboard',
  content: {
    dashboardSidebar: {
      // === SIDEBAR ADMIN ===
      admin: {
        // Header gradiente (Light)
        headerGradientFrom: '#3b82f6',     // blue-500
        headerGradientVia: '#3462af',      // purple-500
        headerGradientTo: '#ec4899',       // pink-500
        // Header gradiente (Dark)
        headerGradientFromDark: '#2554a3', // purple-600
        headerGradientViaDark: '#2563eb',  // blue-600
        headerGradientToDark: '#4f46e5',   // indigo-600
        
        // Items activos (Light)
        activeItemGradientFrom: '#3b82f6', // blue-500
        activeItemGradientTo: '#3462af',   // purple-500
        // Items activos (Dark)
        activeItemGradientFromDark: '#2554a3', // purple-600
        activeItemGradientToDark: '#ec4899',   // pink-600
        
        // Fondo del sidebar
        sidebarBgLight: 'rgba(255, 255, 255, 0.8)',
        sidebarBgDark: 'rgba(17, 24, 39, 0.9)',
        
        // Navegación
        navBgLight: 'rgba(248, 250, 252, 0.8)',
        navBgDark: 'rgba(17, 24, 39, 0.8)',
        navTextColor: '#334155',
        navTextColorDark: '#e5e7eb',
        navHoverBgLight: 'rgba(241, 245, 249, 0.8)',
        navHoverBgDark: 'rgba(31, 41, 55, 0.8)',
        
        // Footer
        footerBgLight: 'rgba(241, 245, 249, 0.8)',
        footerBgDark: 'rgba(3, 7, 18, 0.8)',
        logoutButtonGradientFrom: '#ef4444', // red-500
        logoutButtonGradientTo: '#dc2626',   // red-600
      },
      
      // === SIDEBAR CLIENTE ===
      client: {
        // Header gradiente (Light)
        headerGradientFrom: '#22c55e',     // green-500
        headerGradientVia: '#3b82f6',      // blue-500
        headerGradientTo: '#3462af',       // purple-500
        // Header gradiente (Dark)
        headerGradientFromDark: '#2563eb', // blue-600
        headerGradientViaDark: '#2554a3',  // purple-600
        headerGradientToDark: '#4f46e5',   // indigo-600
        
        // Items activos (Light)
        activeItemGradientFrom: '#22c55e', // green-500
        activeItemGradientTo: '#3b82f6',   // blue-500
        // Items activos (Dark)
        activeItemGradientFromDark: '#2563eb', // blue-600
        activeItemGradientToDark: '#2554a3',   // purple-600
        
        // Fondo del sidebar
        sidebarBgLight: 'rgba(255, 255, 255, 0.8)',
        sidebarBgDark: 'rgba(17, 24, 39, 0.9)',
        
        // Navegación
        navBgLight: 'rgba(248, 250, 252, 0.8)',
        navBgDark: 'rgba(17, 24, 39, 0.8)',
        navTextColor: '#334155',
        navTextColorDark: '#e5e7eb',
        navHoverBgLight: 'rgba(241, 245, 249, 0.8)',
        navHoverBgDark: 'rgba(31, 41, 55, 0.8)',
        
        // Footer
        footerBgLight: 'rgba(241, 245, 249, 0.8)',
        footerBgDark: 'rgba(3, 7, 18, 0.8)',
        logoutButtonGradientFrom: '#ef4444', // red-500
        logoutButtonGradientTo: '#dc2626',   // red-600
      },
      
      // === CONFIGURACIÓN GLOBAL ===
      global: {
        logoUrl: '/logos/logo-white.svg',
        logoAlt: 'Web Scuti',
        borderColorLight: 'rgba(226, 232, 240, 0.6)',
        borderColorDark: 'rgba(55, 65, 81, 0.6)',
        expandedWidth: '18rem',
        collapsedWidth: '4rem',
      }
    }
  },
  seo: {
    metaTitle: 'Dashboard Sidebar Config',
    metaDescription: 'Configuración del sidebar del dashboard',
    keywords: ['sidebar', 'dashboard', 'config'],
    ogTitle: 'Dashboard Sidebar',
    ogDescription: 'Configuración del sidebar',
    ogImage: '',
    twitterCard: 'summary'
  },
  theme: {
    default: 'dark',
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
      background: '#0F172A',
      text: '#F9FAFB',
      textSecondary: '#9CA3AF',
      cardBg: '#1E293B',
      border: '#334155'
    }
  },
  isPublished: true,
  updatedBy: 'system'
};

async function initDashboardSidebar() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe
    const existing = await Page.findOne({ pageSlug: 'dashboard-sidebar' });
    
    if (existing) {
      console.log('⚠️  La página dashboard-sidebar ya existe. Actualizando...');
      await Page.findOneAndUpdate(
        { pageSlug: 'dashboard-sidebar' },
        { $set: dashboardSidebarConfig },
        { new: true }
      );
      console.log('✅ Página dashboard-sidebar actualizada correctamente');
    } else {
      console.log('📝 Creando página dashboard-sidebar...');
      await Page.create(dashboardSidebarConfig);
      console.log('✅ Página dashboard-sidebar creada correctamente');
    }

    // Mostrar configuración guardada
    const saved = await Page.findOne({ pageSlug: 'dashboard-sidebar' });
    console.log('\n📋 Configuración guardada:');
    console.log('   - Admin Header: from', saved.content.dashboardSidebar.admin.headerGradientFrom, 
                'to', saved.content.dashboardSidebar.admin.headerGradientTo);
    console.log('   - Client Header: from', saved.content.dashboardSidebar.client.headerGradientFrom, 
                'to', saved.content.dashboardSidebar.client.headerGradientTo);
    console.log('   - Logo:', saved.content.dashboardSidebar.global.logoUrl);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

initDashboardSidebar();


