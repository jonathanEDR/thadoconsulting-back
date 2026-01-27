/**
 * Script para actualizar la opacidad del hero y tarjetas transparentes
 */

import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/web-scuti';

async function updateServicesConfig() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const db = mongoose.connection.db;
    
    // Actualizar configuración del hero y servicios
    await db.collection('pages').updateOne(
      { pageSlug: 'services' },
      { 
        $set: { 
          'content.hero.backgroundOpacity': 0.8,
          'content.servicesGrid.featuredSection.backgroundOpacity': 0.8,
          'content.servicesGrid.cardDesign.transparentCards': true
        } 
      }
    );
    
    // Verificar
    const page = await db.collection('pages').findOne({ pageSlug: 'services' });
    console.log('=== Configuración actualizada ===');
    console.log('Hero backgroundOpacity:', page?.content?.hero?.backgroundOpacity);
    console.log('ServicesGrid backgroundOpacity:', page?.content?.servicesGrid?.featuredSection?.backgroundOpacity);
    console.log('transparentCards:', page?.content?.servicesGrid?.cardDesign?.transparentCards);
    
    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateServicesConfig();
