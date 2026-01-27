import mongoose from 'mongoose';

/**
 * Conectar a la base de datos MongoDB
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/web-scuti';

    // Verificar que existe URI de MongoDB en producción
    if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI must be defined in production');
    }

    const options = {
      // ========================================
      // 🚀 TIMEOUTS OPTIMIZADOS
      // ========================================
      serverSelectionTimeoutMS: 10000,      // 10s para selección de servidor (aumentado de 5s)
      socketTimeoutMS: 360000,               // 6 minutos para queries largos (aumentado de 45s)
      connectTimeoutMS: 30000,               // 30s para establecer conexión inicial
      
      // ========================================
      // 💾 POOL DE CONEXIONES OPTIMIZADO
      // ========================================
      maxPoolSize: 50,                       // Max 50 conexiones simultáneas (antes no estaba configurado)
      minPoolSize: 10,                       // Mantener 10 conexiones mínimas activas
      maxIdleTimeMS: 60000,                  // Cerrar conexiones idle después de 1 minuto
      
      // ========================================
      // 🔄 BUFFERING Y REINTENTOS
      // ========================================
      bufferCommands: true,                  // Permitir buffering para evitar errores en inicialización
      maxConnecting: 5,                      // Max 5 conexiones iniciándose simultáneamente
      waitQueueTimeoutMS: 10000,             // Timeout de 10s para comandos en cola
      
      // ========================================
      // 📦 COMPRESIÓN (Reduce tráfico de red)
      // ========================================
      compressors: ['zlib'],                 // Comprimir datos entre app y MongoDB
      zlibCompressionLevel: 6,               // Nivel de compresión (1-9, 6 es balance óptimo)
    };

    await mongoose.connect(mongoURI, options);

    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    console.log(`📊 Pool Size: Min ${options.minPoolSize} - Max ${options.maxPoolSize}`);
    
    // 🔧 Sincronizar índices: elimina índices huérfanos y crea los faltantes
    // Previene warnings de índices duplicados
    await mongoose.connection.syncIndexes();

    // Eventos de conexión - solo errores críticos
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully');
    });

    // NOTA: El manejador SIGINT se gestiona en server.js para evitar duplicación
    // Ver: gracefulShutdown() en server.js

  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;
